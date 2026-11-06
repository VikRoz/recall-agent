import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { assert, canonical, exactKeys } from '../src/domain.ts';
import { address, transactionId } from './activity.ts';
import { WalrusRecordStore } from './activity-memory.ts';
import { readCompleteMemory } from '../src/memory.ts';
import type { Network } from '../src/domain.ts';

export type Experience = {
  schema: 'recall-experience/1'; workspace: string; network: Network;
  operation: 'gas-payer'; source: 'fixture' | 'tatum'; digest: string; sponsored: boolean;
  claimed: string; observed: string; verdict: 'fail' | 'resolved'; supersedes: string | null;
};
export type ExperienceRow = { id: string; record: Experience; blobId?: string };
const hash = (record: Experience) => createHash('sha256').update(canonical(record)).digest('base64url');
export function validateExperience(record: Experience, workspace: string) {
  exactKeys(record, ['schema', 'workspace', 'network', 'operation', 'source', 'digest', 'sponsored', 'claimed', 'observed', 'verdict', 'supersedes']);
  assert(record.schema === 'recall-experience/1' && record.workspace === workspace
    && record.operation === 'gas-payer' && ['fixture', 'tatum'].includes(record.source) && ['mainnet', 'testnet'].includes(record.network), 'EXPERIENCE_SCOPE');
  assert(transactionId(record.digest, record.network) === record.digest && typeof record.sponsored === 'boolean', 'EXPERIENCE_EVIDENCE');
  assert(address(record.claimed) === record.claimed && address(record.observed) === record.observed, 'EXPERIENCE_ADDRESS');
  assert(record.verdict === 'fail' ? record.claimed !== record.observed && record.supersedes === null
    : record.verdict === 'resolved' && record.claimed === record.observed && typeof record.supersedes === 'string', 'EXPERIENCE_VERDICT');
}
export function validateExperienceRows(rows: ExperienceRow[], workspace: string) {
  assert(Array.isArray(rows) && rows.length <= 2, 'EXPERIENCE_LIMIT');
  const records = new Map<string, Experience>();
  for (const row of rows) {
    exactKeys(row, row.blobId === undefined ? ['id', 'record'] : ['id', 'record', 'blobId']);
    validateExperience(row.record, workspace);
    assert(row.id === hash(row.record) && !records.has(row.id), 'EXPERIENCE_HASH');
    records.set(row.id, row.record);
  }
  for (const row of rows.filter(r => r.record.verdict === 'resolved')) {
    const parent = records.get(row.record.supersedes!);
    assert(parent && parent.verdict === 'fail' && parent.digest === row.record.digest
      && parent.network === row.record.network && parent.source === row.record.source && parent.observed === row.record.observed
      && parent.sponsored === row.record.sponsored, 'EXPERIENCE_PARENT');
  }
}
export interface ExperienceStore {
  storage: 'local-fixture' | 'walrus';
  read(): Promise<ExperienceRow[]>;
  write(record: Experience): Promise<ExperienceRow>;
}
// Offline transport only. These hashes are local identifiers, never Walrus receipts.
export class LocalExperienceStore implements ExperienceStore {
  storage = 'local-fixture' as const;
  path: string;
  directory: string;
  workspace: string;
  constructor(directory: string, workspace: string) {
    this.directory = directory;
    this.workspace = workspace;
    this.path = join(directory, 'experience.json');
  }
  async read(): Promise<ExperienceRow[]> {
    if (!existsSync(this.path)) return [];
    const stat = lstatSync(this.path);
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 32768, 'EXPERIENCE_FILE');
    const rows = JSON.parse(readFileSync(this.path, 'utf8'));
    validateExperienceRows(rows, this.workspace);
    return rows;
  }
  async write(record: Experience): Promise<ExperienceRow> {
    validateExperience(record, this.workspace);
    const lock = join(this.directory, '.experience-lock');
    mkdirSync(lock, { mode: 0o700 });
    try {
      const rows = await this.read(), id = hash(record);
      const previous = rows.find(row => row.id === id);
      if (previous) return previous;
      assert(rows.length < 2, 'EXPERIENCE_LIMIT');
      if (record.verdict === 'resolved') {
        const parent = rows.find(row => row.id === record.supersedes)?.record;
        assert(parent?.verdict === 'fail' && parent.digest === record.digest && parent.network === record.network && parent.source === record.source
          && parent.observed === record.observed && parent.sponsored === record.sponsored, 'EXPERIENCE_PARENT');
      }
      const row = { id, record };
      const temporary = join(lock, 'next.json');
      writeFileSync(temporary, canonical([...rows, row]), { flag: 'wx', mode: 0o600 });
      renameSync(temporary, this.path);
      return row;
    } finally { rmSync(lock, { recursive: true }); }
  }
}

// Real SDK transport seam, deliberately unavailable from the development launcher.
// Caller supplies separate account-bound admission; no credentials are read here.
export class WalrusExperienceStore implements ExperienceStore {
  storage = 'walrus' as const;
  port: WalrusRecordStore<Experience>;
  admit: () => Promise<void>;
  workspace: string;
  constructor(port: WalrusRecordStore<Experience>, admit: () => Promise<void>) {
    this.port = port;
    this.admit = admit;
    this.workspace = port.binding.project;
  }
  async read(): Promise<ExperienceRow[]> {
    const hits = await readCompleteMemory(this.port, [], 'Verified Sui gas-payer observations and linked resolutions');
    const rows = hits.map(hit => {
      const record = JSON.parse(hit.text);
      return { id: hash(record), record, blobId: hit.blobId };
    });
    validateExperienceRows(rows, this.workspace);
    return rows;
  }
  async write(record: Experience): Promise<ExperienceRow> {
    validateExperience(record, this.workspace);
    await this.admit();
    const rows = await this.read(), id = hash(record);
    const previous = rows.find(row => row.id === id);
    if (previous) return previous;
    validateExperienceRows([...rows, { id, record }], this.workspace);
    const receipt = await this.port.write(record, id);
    return { id, record, blobId: receipt.blobId };
  }
}
