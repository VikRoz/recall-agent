import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, lstatSync, openSync, closeSync, writeFileSync,
  readFileSync, readdirSync, renameSync, fsyncSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { canonical, assert } from '../src/domain.ts';
import { readCompleteMemory } from '../src/memory.ts';
import { validateRules, rule, address } from './activity.ts';
import type { Binding, Rule, StoredRule } from './activity.ts';
import type { Hit, Inventory } from '../src/memory.ts';

export type RuleReceipt = { jobId: string; blobId: string };
export type RuleStore = {
  inventory(): Promise<Inventory>;
  recall(query: string, limit: number): Promise<Hit[]>;
  write(record: Rule, operationKey: string): Promise<RuleReceipt>;
};
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
export const WRITE_POLL_DELAYS_MS = Object.freeze([0, 5000, 10000, 15000, 20000, 25000, 30000, 30000]);

export async function readRules(store: RuleStore, binding: Binding, expectedBlobIds: string[] = []): Promise<StoredRule[]> {
  const hits = await readCompleteMemory(store, expectedBlobIds, 'Recall Lab address explanations and corrections');
  return validateRules(hits.map(hit => ({ blobId: hit.blobId, record: JSON.parse(hit.text) })), binding);
}

export class WalrusRuleStore implements RuleStore {
  sdk: any;
  binding: Binding;
  latestSignature: string | undefined;
  cached: { signature: string; query: string; limit: number; hits: Hit[] } | undefined;
  wait: (milliseconds: number) => Promise<unknown>;
  journal: {
    lock(): () => void;
    load(key: string): Promise<any>;
    save(key: string, entry: any): Promise<void>;
    assertSettled?(locked?: boolean): void;
    proofs?(): { blobId: string; sha256: string }[];
  };
  constructor(sdk: any, binding: Binding, journal: WalrusRuleStore['journal'], wait = sleep) {
    this.sdk = sdk;
    this.binding = { owner: address(binding.owner), project: binding.project };
    this.journal = journal;
    this.wait = wait;
  }
  async inventory(): Promise<Inventory> {
    const all: string[] = [];
    let cursor: string | undefined;
    let snapshot: number | undefined;
    const cursors = new Set<string>();
    for (let pageNumber = 0; pageNumber < 10; pageNumber++) {
      const page = await this.sdk.listMemories({ namespace: this.binding.project, limit: 100, cursor });
      assert(Number.isSafeInteger(page.snapshot_version) && Array.isArray(page.memories)
        && typeof page.has_more === 'boolean' && page.must_resync === false, 'INVENTORY_RESPONSE');
      if (snapshot !== undefined) assert(snapshot === page.snapshot_version, 'INVENTORY_CHANGED');
      snapshot = page.snapshot_version;
      for (const row of page.memories) {
        if (row.namespace_id !== this.binding.project) continue;
        assert(typeof row.status === 'string' && row.status.length > 0 && typeof row.blob_id === 'string'
          && /^[a-zA-Z0-9_-]{43}$/.test(row.blob_id), 'MEMORY_NOT_ACTIVE');
        assert(!all.includes(row.blob_id), 'MEMORY_DUPLICATE_BLOB');
        all.push(row.blob_id);
        assert(all.length <= 20, 'MEMORY_CORPUS_LIMIT');
      }
      if (!page.has_more) {
        const known = this.journal.proofs?.() ?? [];
        assert(known.every(p => all.includes(p.blobId)), 'MEMORY_EXPECTED_RECORD_MISSING');
        const inventory = { blobIds: all.sort(), revision: String(snapshot) };
        this.latestSignature = sha(canonical(inventory));
        return inventory;
      }
      assert(typeof page.next_cursor === 'string' && page.next_cursor.length > 0
        && !cursors.has(page.next_cursor), 'INVENTORY_CURSOR');
      cursor = page.next_cursor;
      cursors.add(cursor);
    }
    throw Error('INVENTORY_PAGE_LIMIT');
  }
  async recall(query: string, limit: number): Promise<Hit[]> {
    if (this.cached && this.cached.signature === this.latestSignature
      && this.cached.query === query && this.cached.limit === limit) return structuredClone(this.cached.hits);
    const result = await this.sdk.recall({ query, limit, namespace: this.binding.project });
    assert(Array.isArray(result.results), 'RECALL_RESPONSE');
    const hits = result.results.map((row: any) => {
      assert(typeof row.blob_id === 'string' && typeof row.text === 'string', 'RECALL_RESPONSE');
      return { blobId: row.blob_id, text: row.text };
    });
    for (const expected of this.journal.proofs?.() ?? []) {
      const hit = hits.find((h: Hit) => h.blobId === expected.blobId);
      assert(hit && sha(canonical(JSON.parse(hit.text))) === expected.sha256, 'MEMORY_READBACK_HASH');
    }
    if (this.latestSignature) this.cached = { signature: this.latestSignature, query, limit, hits };
    return structuredClone(hits);
  }
  async write(record: Rule, operationKey: string): Promise<RuleReceipt> {
    const release = this.journal.lock();
    try { return await this.writeLocked(record, operationKey); }
    finally { this.cached = undefined; this.latestSignature = undefined; release(); }
  }
  async writeLocked(record: Rule, operationKey: string): Promise<RuleReceipt> {
    assert(/^[a-zA-Z0-9_-]{43}$/.test(operationKey), 'OPERATION_KEY');
    rule(record, this.binding);
    const text = canonical(record);
    const hash = sha(text);
    const previous = await this.journal.load(operationKey);
    if (previous) {
      assert(previous.sha256 === hash, 'IDEMPOTENCY_CONFLICT');
      assert(previous.state === 'done', 'WRITE_OUTCOME_UNCERTAIN');
      return { jobId: previous.jobId, blobId: previous.blobId };
    }
    this.journal.assertSettled?.(true);
    // An in-progress journal entry survives crashes and forbids resubmission.
    await this.journal.save(operationKey, { state: 'submitting', sha256: hash });
    const accepted = await this.sdk.remember(text, this.binding.project, { idempotencyKey: operationKey });
    assert(typeof accepted.job_id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(accepted.job_id), 'WRITE_ACK');
    await this.journal.save(operationKey, { state: 'accepted', sha256: hash, jobId: accepted.job_id });
    for (const delay of WRITE_POLL_DELAYS_MS) {
      if (delay > 0) await this.wait(delay);
      const stored = await this.sdk.getRememberStatus(accepted.job_id);
      assert(stored.job_id === accepted.job_id, 'WRITE_JOB_MISMATCH');
      if (stored.status === 'done') {
        assert(stored.owner === this.binding.owner && stored.namespace === this.binding.project
          && typeof stored.blob_id === 'string' && /^[a-zA-Z0-9_-]{43}$/.test(stored.blob_id), 'WRITE_BINDING');
        const receipt = { jobId: accepted.job_id, blobId: stored.blob_id };
        await this.journal.save(operationKey, { state: 'done', sha256: hash, ...receipt });
        return receipt;
      }
      assert(['pending', 'running', 'uploaded'].includes(stored.status), 'WRITE_OUTCOME_UNCERTAIN');
    }
    throw Error('WRITE_STATUS_LIMIT');
  }
}

export class FileWriteJournal {
  directory: string;
  constructor(directory: string) {
    this.directory = join(directory, 'activity-jobs');
    if (!existsSync(this.directory)) mkdirSync(this.directory, { mode: 0o700 });
    assert(lstatSync(this.directory).isDirectory(), 'JOURNAL_DIRECTORY');
  }
  path(key: string) {
    assert(/^[a-zA-Z0-9_-]{43}$/.test(key), 'OPERATION_KEY');
    return join(this.directory, key + '.json');
  }
  assertSettled(locked = false) {
    for (const file of readdirSync(this.directory)) {
      if (file === '.writer-lock') {
        assert(locked, 'WRITE_IN_PROGRESS');
        continue;
      }
      assert(/^[a-zA-Z0-9_-]{43}\.json$/.test(file), 'WRITE_OUTCOME_UNCERTAIN');
      const path = this.path(file.slice(0, -5));
      const info = lstatSync(path);
      assert(info.isFile() && info.size <= 8192 && info.uid === process.getuid()
        && (info.mode & 0o077) === 0, 'JOURNAL_FILE');
      const entry = JSON.parse(readFileSync(path, 'utf8'));
      assert(entry.state === 'done', 'WRITE_OUTCOME_UNCERTAIN');
    }
  }
  proofs() {
    this.assertSettled();
    return readdirSync(this.directory).map(file => {
      const entry = JSON.parse(readFileSync(this.path(file.slice(0, -5)), 'utf8'));
      assert(/^[A-Za-z0-9_-]{43}$/.test(entry.blobId) && /^[a-f0-9]{64}$/.test(entry.sha256), 'JOURNAL_RECEIPT');
      return { blobId: entry.blobId, sha256: entry.sha256 };
    });
  }
  lock() {
    const lock = join(this.directory, '.writer-lock');
    mkdirSync(lock, { mode: 0o700 });
    return () => rmSync(lock, { recursive: true });
  }
  async load(key: string) {
    const path = this.path(key);
    if (!existsSync(path)) return undefined;
    const stat = lstatSync(path);
    assert(stat.isFile() && stat.size <= 8192, 'JOURNAL_FILE');
    return JSON.parse(readFileSync(path, 'utf8'));
  }
  async save(key: string, value: unknown) {
    const path = this.path(key);
    const temporary = join(this.directory, randomUUID() + '.tmp');
    try {
      const fd = openSync(temporary, 'wx', 0o600);
      try { writeFileSync(fd, canonical(value)); fsyncSync(fd); }
      finally { closeSync(fd); }
      renameSync(temporary, path);
    } finally { rmSync(temporary, { force: true }); }
  }
}
