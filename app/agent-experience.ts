import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { assert, canonical, exactKeys } from '../src/domain.ts';
import { address, transactionId } from './activity.ts';
import { WalrusRecordStore } from './activity-memory.ts';
import { readCompleteMemory } from '../src/memory.ts';
import type { Network } from '../src/domain.ts';

export type GasExperience = {
  schema: 'recall-experience/1'; workspace: string; network: Network;
  operation: 'gas-payer'; source: 'fixture' | 'tatum' | 'replay'; digest: string; sponsored: boolean;
  claimed: string; observed: string; verdict: 'fail' | 'resolved'; supersedes: string | null;
};
export type ToolExperience = {
  schema: 'recall-tool-experience/1'; workspace: string; source: 'fixture' | 'tatum' | 'replay';
  tool: string; schemaHash: string; field: 'limit' | 'pageSize';
  constraint: 'minimum' | 'maximum'; bound: number; attempted: number;
  evidence: 'sdk-input-validation' | 'successful-tool-call';
  verdict: 'fail' | 'resolved'; supersedes: string | null;
};
export type Experience = GasExperience | ToolExperience;
export type ExperienceRow = { id: string; record: Experience; blobId?: string };
const hash = (record: Experience) => createHash('sha256').update(canonical(record)).digest('base64url');
export function validateExperience(record: Experience, workspace: string) {
  if (record.schema === 'recall-tool-experience/1') {
    exactKeys(record, ['schema','workspace','source','tool','schemaHash','field','constraint','bound','attempted','evidence','verdict','supersedes']);
    assert(record.workspace === workspace && ['fixture','replay','tatum'].includes(record.source), 'EXPERIENCE_SCOPE');
    assert(typeof record.tool === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(record.tool) && /^[a-f0-9]{64}$/.test(record.schemaHash)
      && ['limit','pageSize'].includes(record.field) && ['minimum','maximum'].includes(record.constraint), 'EXPERIENCE_CONSTRAINT');
    assert(Number.isSafeInteger(record.bound) && Number.isSafeInteger(record.attempted)
      && Math.abs(record.bound) <= 1000000 && Math.abs(record.attempted) <= 1000000, 'EXPERIENCE_NUMBER');
    const invalid = record.constraint === 'maximum' ? record.attempted > record.bound : record.attempted < record.bound;
    assert(record.verdict === 'fail' ? invalid && record.supersedes === null && record.evidence === 'sdk-input-validation'
      : record.verdict === 'resolved' && !invalid && typeof record.supersedes === 'string' && record.evidence === 'successful-tool-call', 'EXPERIENCE_VERDICT');
    return;
  }
  exactKeys(record, ['schema', 'workspace', 'network', 'operation', 'source', 'digest', 'sponsored', 'claimed', 'observed', 'verdict', 'supersedes']);
  assert(record.schema === 'recall-experience/1' && record.workspace === workspace
    && record.operation === 'gas-payer' && ['fixture', 'tatum', 'replay'].includes(record.source) && ['mainnet', 'testnet'].includes(record.network), 'EXPERIENCE_SCOPE');
  assert(transactionId(record.digest, record.network) === record.digest && typeof record.sponsored === 'boolean', 'EXPERIENCE_EVIDENCE');
  assert(address(record.claimed) === record.claimed && address(record.observed) === record.observed, 'EXPERIENCE_ADDRESS');
  assert(record.verdict === 'fail' ? record.claimed !== record.observed && record.supersedes === null
    : record.verdict === 'resolved' && record.claimed === record.observed && typeof record.supersedes === 'string', 'EXPERIENCE_VERDICT');
}
export function experienceParentMatches(parent: Experience | undefined, record: Experience) {
  if (!parent || parent.verdict !== 'fail' || parent.schema !== record.schema
    || parent.workspace !== record.workspace || parent.source !== record.source) return false;
  if (parent.schema === 'recall-tool-experience/1' && record.schema === parent.schema)
    return parent.tool === record.tool && parent.schemaHash === record.schemaHash && parent.field === record.field
      && parent.constraint === record.constraint && parent.bound === record.bound;
  if (parent.schema === 'recall-experience/1' && record.schema === parent.schema)
    return parent.digest === record.digest && parent.network === record.network
      && parent.observed === record.observed && parent.sponsored === record.sponsored;
  return false;
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
    assert(experienceParentMatches(parent, row.record), 'EXPERIENCE_PARENT');
  }
}
export interface ExperienceStore {
  storage: 'local-fixture' | 'walrus' | 'walrus-fixture';
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
        assert(experienceParentMatches(parent, record), 'EXPERIENCE_PARENT');
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
  storage: 'walrus' | 'walrus-fixture';
  port: WalrusRecordStore<Experience>;
  admit: () => Promise<void>;
  workspace: string;
  constructor(port: WalrusRecordStore<Experience>, admit: () => Promise<void>, storage: 'walrus' | 'walrus-fixture' = 'walrus') {
    this.port = port;
    this.admit = admit;
    this.workspace = port.binding.project;
    this.storage = storage;
  }
  async read(): Promise<ExperienceRow[]> {
    const hits = await readCompleteMemory(this.port, [], 'Verified Sui technical observations and linked resolutions');
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
