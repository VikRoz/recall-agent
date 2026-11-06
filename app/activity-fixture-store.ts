import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, openSync, closeSync, readFileSync, writeFileSync,
  renameSync, rmSync, fsyncSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { assert, canonical } from '../src/domain.ts';
import { validateRules } from './activity.ts';
import type { Binding, Rule } from './activity.ts';
import type { RuleStore, RuleReceipt } from './activity-memory.ts';

const hash = (text: string) => createHash('sha256').update(text).digest('base64url');
type State = { revision: number; records: { blobId: string; text: string }[];
  operations: Record<string, { hash: string; receipt: RuleReceipt }> };

export class FixtureRuleStore implements RuleStore {
  directory: string;
  path: string;
  binding: Binding;
  constructor(directory: string, binding: Binding) {
    this.directory = directory;
    this.path = join(directory, 'activity-memory.json');
    this.binding = binding;
    if (!existsSync(this.path)) {
      try {
        writeFileSync(this.path, canonical({ revision: 0, records: [], operations: {} }), { flag: 'wx', mode: 0o600 });
      } catch (error: any) { if (error.code !== 'EEXIST') throw error; }
    }
  }
  state(): State {
    const stat = lstatSync(this.path);
    assert(stat.isFile() && stat.size < 100000, 'FIXTURE_FILE');
    const value = JSON.parse(readFileSync(this.path, 'utf8'));
    assert(Number.isSafeInteger(value.revision) && value.revision >= 0 && Array.isArray(value.records)
      && value.records.length <= 20 && value.operations && typeof value.operations === 'object', 'FIXTURE_STATE');
    for (const row of value.records) assert(typeof row.text === 'string' && hash(row.text) === row.blobId, 'FIXTURE_HASH');
    validateRules(value.records.map((r: any) => ({ blobId: r.blobId, record: JSON.parse(r.text) })), this.binding);
    return value;
  }
  async inventory() {
    const state = this.state();
    return { blobIds: state.records.map(r => r.blobId), revision: String(state.revision) };
  }
  async recall(_query: string, limit: number) {
    return this.state().records.slice(0, limit).map(r => ({ ...r }));
  }
  async write(record: Rule, operationKey: string): Promise<RuleReceipt> {
    assert(/^[a-zA-Z0-9_-]{43}$/.test(operationKey), 'OPERATION_KEY');
    const lock = join(this.directory, '.activity-write-lock');
    mkdirSync(lock, { mode: 0o700 });
    const temporary = join(lock, 'next.json');
    try {
      const state = this.state();
      const text = canonical(record);
      const contentHash = hash(text);
      const previous = state.operations[operationKey];
      if (previous) {
        assert(previous.hash === contentHash, 'IDEMPOTENCY_CONFLICT');
        return previous.receipt;
      }
      assert(state.records.length < 20, 'MEMORY_CORPUS_LIMIT');
      validateRules([...state.records.map(r => ({ blobId: r.blobId, record: JSON.parse(r.text) })),
        { record, blobId: contentHash }], this.binding);
      const receipt = { jobId: 'fixture-' + contentHash, blobId: contentHash };
      state.records.push({ blobId: contentHash, text });
      state.operations[operationKey] = { hash: contentHash, receipt };
      state.revision++;
      const fd = openSync(temporary, 'wx', 0o600);
      try { writeFileSync(fd, canonical(state)); fsyncSync(fd); }
      finally { closeSync(fd); }
      renameSync(temporary, this.path);
      return receipt;
    } finally { rmSync(lock, { recursive: true, force: true }); }
  }
}
