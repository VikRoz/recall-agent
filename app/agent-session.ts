import { ActivitySession } from './activity-session.ts';
import { assert } from '../src/domain.ts';
import { address, transactionId } from './activity.ts';
import type { ActivityQuery, OfflineActivityIndex } from './agent-activity-index.ts';
import type { ExperienceStore, Experience } from './agent-experience.ts';
import { validateExperienceRows, experienceId } from './agent-experience.ts';
import { isFact, transactionFact, factMatch, NORMALIZER_SHA256 } from './agent-facts.ts';
import type { FactEvidence, TransactionFact } from './agent-facts.ts';

// Only failures proved to precede external operations may recover automatically.
const recoverable = new Set(['WRONG_NETWORK', 'INVALID_ADDRESS', 'TRANSACTION_LIST_LIMIT',
  'DUPLICATE_TRANSACTION', 'INVALID_TRANSACTION_DIGEST', 'UNSUPPORTED_EXPLORER_LINK', 'NETWORK_MISMATCH',
  'OFFLINE_TRANSACTION_NOT_FOUND', 'ACTIVITY_QUERY_TIME', 'ACTIVITY_QUERY_NETWORK', 'ACTIVITY_QUERY_RANGE', 'ACTIVITY_QUERY_LIMIT', 'ACTIVITY_QUERY_CURSOR',
  'REPORT_NOT_FOUND', 'PROPOSAL_NOT_FOUND', 'REPORT_LIMIT', 'PROPOSAL_LIMIT', 'CLAIM_TRANSACTION_NOT_IN_REPORT']);
export type CaptureScope = 'verified-experience' | 'linked-resolution-only' | 'transaction-facts-only';
// Admission is a pure policy decision. Storage/network failures after admission remain critical.
export function captureAdmits(scope: CaptureScope, parentId: string | undefined, record: Experience): boolean {
  if (scope === 'verified-experience') return true;
  if (scope === 'transaction-facts-only') return isFact(record);
  assert(scope === 'linked-resolution-only' && /^[A-Za-z0-9_-]{43}$/.test(parentId ?? ''), 'AGENT_CAPTURE_SCOPE');
  return !isFact(record) && record.verdict === 'resolved' && record.supersedes === parentId;
}
export class AgentSession extends ActivitySession {
  stopped = false;
  failures = 0;
  experience!: ExperienceStore;
  capture = false;
  captureScope: CaptureScope = 'verified-experience';
  captureParentId: string | undefined;
  captureFacts = false;
  ownAccount = false;
  factCaptureSet: string[] | null = null;
  pendingFacts = new Map<string, TransactionFact>();
  selectedTransactionsOnly = false;
  validateParticipation(state: Parameters<ActivitySession['view']>[0]) {
    if (!this.selectedTransactionsOnly) super.validateParticipation(state);
  }
  factEvidence: ((digest: string) => FactEvidence) | undefined;
  admitFactBatch: ((notes: TransactionFact[]) => void) | undefined;
  async beforeReport(state: Parameters<ActivitySession['view']>[0]) {
    if (!this.capture || !this.captureFacts) return;
    assert(this.factEvidence, 'FACT_PROVENANCE_MISSING');
    const rows = await this.experience.read();
    // Validate every whole payload and conflict before the first write. No truncation or substitution.
    let pending = state.transactions.map(tx => transactionFact(this.binding.project, tx, this.factEvidence!(tx.digest), this.clock()));
    if(this.factCaptureSet){
      for(const note of pending){
        assert(this.factCaptureSet.includes(note.digest),'OWN_APPROVED_TRANSACTION_SCOPE');
        const old=this.pendingFacts.get(note.digest);if(old)factMatch(old,note);else this.pendingFacts.set(note.digest,note);
      }
      if(!this.factCaptureSet.every(id=>this.pendingFacts.has(id)))return;
      pending=this.factCaptureSet.map(id=>this.pendingFacts.get(id)!);
    }
    for (const note of pending) {
      const old = rows.find(r => isFact(r.record) && r.record.network === note.network && r.record.digest === note.digest);
      if (old) factMatch(old.record as TransactionFact, note);
    }
    const newNotes = pending.filter(note => !rows.some(r => isFact(r.record) && r.record.network === note.network && r.record.digest === note.digest));
    validateExperienceRows([...rows, ...newNotes.map(record => ({id:experienceId(record), record}))], this.binding.project);
    this.admitFactBatch?.(newNotes);
    for (const note of pending) {
      const old = rows.find(r => isFact(r.record) && r.record.network === note.network && r.record.digest === note.digest);
      if (!old && captureAdmits(this.captureScope, this.captureParentId, note)) await this.experience.write(note);
    }
  }
  activityIndex!: OfflineActivityIndex;
  artifacts: any;
  providerProvenance: {sourceMode: string; freshProviderRead: boolean; walletHistoryComplete: boolean; scope: string} | undefined;
  async export(reportId: string) {
    const value = await super.export(reportId);
    try { return {...value, artifact: this.artifacts.write(value.csv)}; }
    catch (error) { this.stopped = true; this.onError?.(); throw error; }
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
      if (!recoverable.has(error?.code) || ++this.failures > 4) { this.stopped = true; this.onError?.(); }
      throw error;
    } finally { this.busy = false; }
  }
  async view(state: Parameters<ActivitySession['view']>[0]) {
    const result = await super.view(state);
    const rows = await this.experience.read();
    // A literal observed payer is evidence for that transaction, not a rule for all sponsored transactions.
    const memory = rows.filter(row => row.record.schema === 'recall-experience/1' && state.transactions.some(tx => tx.network === row.record.network && tx.source === row.record.source
      && tx.digest === row.record.digest && tx.gas.payer === row.record.observed
      && (tx.gas.payer !== tx.sender) === row.record.sponsored));
    const historicalObservations = rows.filter(row => isFact(row.record) && state.transactions.some(tx => tx.digest === row.record.digest && tx.network === row.record.network && tx.source === row.record.source))
      .map(row => { const note = row.record as TransactionFact, current = state.transactions.find(tx => tx.digest === note.digest)!;
        const comparison = note.provenance.normalizerSha256 !== NORMALIZER_SHA256 ? 'incompatible-normalizer'
          : factMatch(note, {...note, transaction:current});
        return {...row, role:'historical-observation', comparison, replacesFreshData:false}; });
    return { ...result, experience: memory, historicalObservations, experienceStorage: this.experience.storage,
      ...(this.factCaptureSet?{factCaptureSet:{validated:this.pendingFacts.size,required:this.factCaptureSet.length,
        restored:rows.filter(r=>isFact(r.record)&&this.factCaptureSet!.includes(r.record.digest)).length,
        state:rows.filter(r=>isFact(r.record)&&this.factCaptureSet!.includes(r.record.digest)).length===this.factCaptureSet.length
          ?'stored-complete-set':this.pendingFacts.size<this.factCaptureSet.length?'awaiting-complete-set':'complete-set-validated'}}:{}),
      selectedTransactionCoverage: {walletHistoryComplete:false, transactions:state.transactions.map(tx => ({digest:tx.digest,
        walletIsSender:tx.sender === state.wallet, walletIsGasPayer:tx.gas.payer === state.wallet,
        walletHasBalanceChange:tx.movements.some(m => m.address === state.wallet)}))},
      dataProvenance: this.providerProvenance ?? {sourceMode: this.activityIndex?.mode === 'saved' ? 'saved-mainnet-replay' : 'synthetic-fixture',
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
      const resolved = new Set(rows.filter(row => !isFact(row.record)).map(row => (row.record as any).supersedes));
      const parent = rows.find(row => row.record.schema === 'recall-experience/1' && row.record.verdict === 'fail' && row.record.digest === digest
        && row.record.network === state.network && row.record.source === tx.source && row.record.observed === tx.gas.payer && !resolved.has(row.id));
      let saved, captureSkipped: string | undefined;
      if (this.capture && (!pass || parent)) {
        const record: Experience = { schema: 'recall-experience/1', workspace: this.binding.project,
          network: state.network, operation: 'gas-payer', source: tx.source, digest, sponsored: tx.gas.payer !== tx.sender,
          claimed, observed: tx.gas.payer, verdict: pass ? 'resolved' : 'fail', supersedes: pass ? parent!.id : null };
        if (captureAdmits(this.captureScope, this.captureParentId, record)) saved = await this.experience.write(record);
        else captureSkipped = 'not-admitted-by-scope';
      }
      return { verdict: pass ? 'pass' : 'fail', claimed, observed: tx.gas.payer,
        evidence: { digest, source: tx.source, field: 'gas.payer' },
        captureScope: this.capture ? this.captureScope : 'disabled',
        ...(captureSkipped ? {captureSkipped} : {}),
        memory: saved ? { storage: this.experience.storage, id: saved.id, ...(saved.blobId ? { blobId: saved.blobId } : {}) } : null };
    });
  }
}
