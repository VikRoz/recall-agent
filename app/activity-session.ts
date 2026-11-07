import { createHash, randomUUID } from 'node:crypto';
import { assert, canonical, time } from '../src/domain.ts';
import type { Network } from '../src/domain.ts';
import { address, transactionId, MAX_TRANSACTIONS, newRule, ruleScope, report, csv } from './activity.ts';
import type { ActivityTransaction, Binding, Rule, StoredRule } from './activity.ts';
import { readRules } from './activity-memory.ts';
import type { RuleStore, RuleReceipt } from './activity-memory.ts';

export type ActivityData = { transactions(ids: string[]): Promise<ActivityTransaction[]> };
type ReportState = { network: Network; wallet: string; transactions: ActivityTransaction[] };
type Proposal = { record: Rule; revision: string; operationKey: string; receipt?: RuleReceipt };

export class ActivitySession {
  binding: Binding;
  store: RuleStore;
  data: (network: Network) => ActivityData;
  clock: () => string;
  scope: { wallet: string; network: Network; digests: string[] } | undefined;
  reports = new Map<string, ReportState>();
  proposals = new Map<string, Proposal>();
  confirmedBlobs = new Set<string>();
  onError: (() => void) | undefined;
  busy = false;
  constructor(binding: Binding, store: RuleStore, data: (network: Network) => ActivityData,
    clock = () => new Date().toISOString(), scope?: ActivitySession['scope'], onError?: () => void) {
    this.binding = { owner: address(binding.owner), project: binding.project };
    this.store = store;
    this.data = data;
    this.clock = clock;
    this.scope = scope;
    this.onError = onError;
  }
  async action<T>(fn: () => Promise<T>): Promise<T> {
    if (this.busy) this.onError?.();
    assert(!this.busy, 'ACTIVITY_BUSY');
    this.busy = true;
    try { return await fn(); }
    catch (error) { this.onError?.(); throw error; }
    finally { this.busy = false; }
  }
  async view(state: ReportState) {
    const rules = await readRules(this.store, this.binding, [...this.confirmedBlobs]);
    return { ...report(state.transactions, state.wallet, rules, this.clock()),
      transactionEvidence: state.transactions,
      memory: rules.map(row => ({ ...row.record, blobId: row.blobId })) };
  }
  validateParticipation(state: ReportState) {
    assert(state.transactions.every(tx => tx.sender === state.wallet || tx.movements.some(m => m.address === state.wallet)
      || tx.gas.payer === state.wallet), 'WALLET_NOT_INVOLVED');
  }
  async beforeReport(_state: ReportState) {}
  async prepare(network: Network, walletInput: string, inputs: string[]) {
    return this.action(async () => {
      assert(network === 'mainnet' || network === 'testnet', 'WRONG_NETWORK');
      const wallet = address(walletInput);
      assert(Array.isArray(inputs) && inputs.length > 0 && inputs.length <= MAX_TRANSACTIONS, 'TRANSACTION_LIST_LIMIT');
      const ids = inputs.map(value => transactionId(value, network));
      assert(new Set(ids).size === ids.length, 'DUPLICATE_TRANSACTION');
      if (this.scope) assert(this.scope.wallet === wallet && this.scope.network === network
        && ids.every(id => this.scope!.digests.includes(id)), 'PILOT_REPORT_SCOPE');
      assert(this.reports.size < 8, 'REPORT_LIMIT');
      const transactions = await this.data(network).transactions(ids);
      assert(transactions.length === ids.length && transactions.every((tx, i) => tx.digest === ids[i]
        && tx.network === network), 'TRANSACTION_BATCH_MISMATCH');
      const state = { network, wallet, transactions };
      this.validateParticipation(state);
      await this.beforeReport(state);
      const value = await this.view(state);
      const reportId = 'report:' + randomUUID();
      this.reports.set(reportId, state);
      return { reportId, ...value };
    });
  }
  state(id: string) {
    const value = this.reports.get(id);
    assert(value, 'REPORT_NOT_FOUND');
    return value;
  }
  async refresh(reportId: string) {
    return this.action(async () => ({ reportId, ...await this.view(this.state(reportId)) }));
  }
  async propose(reportId: string, accountInput: string, relation: Rule['relation'], label: string,
    effectiveFrom: string, supersedes: string | null) {
    return this.action(async () => {
      const state = this.state(reportId);
      const account = address(accountInput);
      assert(account !== state.wallet && state.transactions.some(tx => tx.movements.some(m => m.address === account)),
        'RULE_ADDRESS_NOT_OBSERVED');
      assert(this.proposals.size < 8, 'PROPOSAL_LIMIT');
      const records = await readRules(this.store, this.binding, [...this.confirmedBlobs]);
      const inventory = await this.store.inventory();
      // Detect a write between the checked read and proposal construction.
      assert(records.map(r => r.blobId).sort().join('|') === [...inventory.blobIds].sort().join('|'),
        'MEMORY_CHANGED_DURING_READ');
      const record = newRule(this.binding, state.network, state.wallet, account, relation, label,
        this.clock(), effectiveFrom, supersedes);
      const same = records.filter(row => ruleScope(row.record) === ruleScope(record));
      const parentIds = new Set(same.map(row => row.record.supersedes));
      const heads = same.filter(row => !parentIds.has(row.record.id));
      assert(heads.length <= 1 && (heads[0]?.record.id ?? null) === supersedes, 'CORRECTION_PARENT_REQUIRED');
      if (heads.length) assert(time(heads[0].record.recordedAt) < time(record.recordedAt), 'CORRECTION_TIME');
      const proposalId = 'proposal:' + randomUUID();
      const operationKey = createHash('sha256').update(canonical(record)).digest('base64url');
      this.proposals.set(proposalId, { record, revision: inventory.revision, operationKey });
      return { proposalId, preview: record,
        confirmation: 'Ask the user to review this exact preview before calling save_address_rule.' };
    });
  }
  async save(proposalId: string) {
    return this.action(async () => {
      const proposal = this.proposals.get(proposalId);
      assert(proposal, 'PROPOSAL_NOT_FOUND');
      if (proposal.receipt) return proposal.receipt;
      assert((await this.store.inventory()).revision === proposal.revision, 'PROPOSAL_STALE');
      proposal.receipt = await this.store.write(proposal.record, proposal.operationKey);
      this.confirmedBlobs.add(proposal.receipt.blobId);
      return proposal.receipt;
    });
  }
  async export(reportId: string) {
    return this.action(async () => {
      const result = await this.view(this.state(reportId));
      return { reportId, report: result, mediaType: 'text/csv', csv: csv(result) };
    });
  }
}
