import { ActivitySession } from './activity-session.ts';
import { assert } from '../src/domain.ts';
import { address, transactionId } from './activity.ts';
import type { ActivityQuery, OfflineActivityIndex } from './agent-activity-index.ts';
import type { ExperienceStore, Experience } from './agent-experience.ts';

// Only failures proved to precede external operations may recover automatically.
const recoverable = new Set(['WRONG_NETWORK', 'INVALID_ADDRESS', 'TRANSACTION_LIST_LIMIT',
  'DUPLICATE_TRANSACTION', 'INVALID_TRANSACTION_DIGEST', 'UNSUPPORTED_EXPLORER_LINK', 'NETWORK_MISMATCH',
  'OFFLINE_TRANSACTION_NOT_FOUND', 'ACTIVITY_QUERY_TIME', 'ACTIVITY_QUERY_NETWORK', 'ACTIVITY_QUERY_RANGE', 'ACTIVITY_QUERY_LIMIT', 'ACTIVITY_QUERY_CURSOR',
  'REPORT_NOT_FOUND', 'PROPOSAL_NOT_FOUND', 'REPORT_LIMIT', 'PROPOSAL_LIMIT', 'CLAIM_TRANSACTION_NOT_IN_REPORT']);
export class AgentSession extends ActivitySession {
  stopped = false;
  failures = 0;
  experience!: ExperienceStore;
  capture = false;
  activityIndex!: OfflineActivityIndex;
  artifacts: any;
  async export(reportId: string) {
    const value = await super.export(reportId);
    try { return {...value, artifact: this.artifacts.write(value.csv)}; }
    catch (error) { this.stopped = true; throw error; }
  }
  async findActivity(query: ActivityQuery) {
    return this.action(async () => this.activityIndex.find(query));
  }
  async action<T>(fn: () => Promise<T>): Promise<T> {
    assert(!this.stopped, 'AGENT_STOPPED');
    assert(!this.busy, 'ACTIVITY_BUSY');
    this.busy = true;
    try { return await fn(); }
    catch (error: any) {
      if (!recoverable.has(error?.code) || ++this.failures > 4) this.stopped = true;
      throw error;
    } finally { this.busy = false; }
  }
  async view(state: Parameters<ActivitySession['view']>[0]) {
    const result = await super.view(state);
    const rows = await this.experience.read();
    const memory = rows.filter(row => row.record.schema === 'recall-experience/1' && state.transactions.some(tx => tx.network === row.record.network && tx.source === row.record.source
      && (tx.gas.payer !== tx.sender) === row.record.sponsored));
    return { ...result, experience: memory, experienceStorage: this.experience.storage,
      dataProvenance: {sourceMode: this.activityIndex?.mode === 'saved' ? 'saved-mainnet-replay' : 'synthetic-fixture',
        freshProviderRead: false, walletHistoryComplete: false, scope: 'selected-transactions'} };
  }
  async verifyGasPayer(reportId: string, digestInput: string, claimedInput: string) {
    return this.action(async () => {
      const state = this.state(reportId);
      const digest = transactionId(digestInput, state.network), claimed = address(claimedInput);
      const tx = state.transactions.find(tx => tx.digest === digest);
      assert(tx, 'CLAIM_TRANSACTION_NOT_IN_REPORT');
      const pass = claimed === tx.gas.payer;
      const rows = await this.experience.read();
      const resolved = new Set(rows.map(row => row.record.supersedes));
      const parent = rows.find(row => row.record.schema === 'recall-experience/1' && row.record.verdict === 'fail' && row.record.digest === digest
        && row.record.network === state.network && row.record.source === tx.source && row.record.observed === tx.gas.payer && !resolved.has(row.id));
      let saved;
      if (this.capture && (!pass || parent)) {
        const record: Experience = { schema: 'recall-experience/1', workspace: this.binding.project,
          network: state.network, operation: 'gas-payer', source: tx.source, digest, sponsored: tx.gas.payer !== tx.sender,
          claimed, observed: tx.gas.payer, verdict: pass ? 'resolved' : 'fail', supersedes: pass ? parent!.id : null };
        saved = await this.experience.write(record);
      }
      return { verdict: pass ? 'pass' : 'fail', claimed, observed: tx.gas.payer,
        evidence: { digest, source: tx.source, field: 'gas.payer' },
        memory: saved ? { storage: this.experience.storage, id: saved.id, ...(saved.blobId ? { blobId: saved.blobId } : {}) } : null };
    });
  }
}
