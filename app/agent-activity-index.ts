import { createHash } from 'node:crypto';
import { readFileSync, lstatSync } from 'node:fs';
import { assert, canonical, time } from '../src/domain.ts';
import type { Network } from '../src/domain.ts';
import { address, digest, MAX_TRANSACTIONS } from './activity.ts';
import type { ActivityTransaction } from './activity.ts';
import { FIXTURE_DIGESTS, fixtureTransaction } from './activity-fixtures.ts';
import { normalizeTransaction } from './activity.ts';

export type ActivityQuery = { network: Network; wallet: string; from?: string; to?: string; limit?: number; cursor?: string };
export type OfflineDataMode = 'fixture' | 'saved';
const sha = (s: string | Uint8Array) => createHash('sha256').update(s).digest('hex');
const snapshotHash = '9437422c45bb8c2072c19cc857c23d6a8c4dd2d5dc0429bbd8938a8d7b0eafcb';
function queryTime(value: string | undefined) {
  if (value === undefined) return undefined;
  try { return time(value); } catch { assert(false, 'ACTIVITY_QUERY_TIME'); }
}

// An index of a bounded, immutable local dataset, never a claim of full chain coverage.
export class OfflineActivityIndex {
  mode: OfflineDataMode;
  datasetId: string;
  #transactions: ActivityTransaction[];
  constructor(transactions: ActivityTransaction[], mode: OfflineDataMode) {
    assert(['fixture', 'saved'].includes(mode) && Array.isArray(transactions) && transactions.length <= 100, 'ACTIVITY_DATASET');
    for (const tx of transactions) {
      assert(['mainnet','testnet'].includes(tx.network) && ['success','failed'].includes(tx.status), 'ACTIVITY_DATASET');
      digest(tx.digest); time(tx.timestamp);
      assert(address(tx.sender) === tx.sender && address(tx.gas.payer) === tx.gas.payer, 'ACTIVITY_DATASET');
      assert(tx.source === (mode === 'saved' ? 'replay' : 'fixture'), 'ACTIVITY_DATASET_SOURCE');
      assert(tx.movements.every(m => address(m.address) === m.address && /^-?(0|[1-9][0-9]*)$/.test(m.amount)), 'ACTIVITY_DATASET');
    }
    assert(new Set(transactions.map(tx => tx.network + ':' + tx.digest)).size === transactions.length, 'ACTIVITY_DATASET_DUPLICATE');
    this.mode = mode;
    this.#transactions = structuredClone(transactions).sort((a,b) => time(a.timestamp)-time(b.timestamp)
      || (a.digest < b.digest ? -1 : a.digest > b.digest ? 1 : 0));
    this.datasetId = sha(canonical({mode, transactions: this.#transactions}));
  }
  async transactions(network: Network, ids: string[]) {
    assert(Array.isArray(ids) && ids.length > 0 && ids.length <= MAX_TRANSACTIONS, 'TRANSACTION_LIST_LIMIT');
    const rows = ids.map(id => {
      const tx = this.#transactions.find(t => t.network === network && t.digest === id);
      assert(tx, 'OFFLINE_TRANSACTION_NOT_FOUND');
      return tx;
    });
    return structuredClone(rows);
  }
  find(query: ActivityQuery) {
    assert(query.network === 'mainnet' || query.network === 'testnet', 'ACTIVITY_QUERY_NETWORK');
    const wallet = address(query.wallet), from = queryTime(query.from), to = queryTime(query.to);
    assert(from === undefined || to === undefined || from < to, 'ACTIVITY_QUERY_RANGE');
    const limit = query.limit ?? 5;
    assert(Number.isSafeInteger(limit) && limit >= 1 && limit <= MAX_TRANSACTIONS, 'ACTIVITY_QUERY_LIMIT');
    const filter = {network: query.network, wallet, from: query.from ?? null, to: query.to ?? null, limit};
    const signature = sha(canonical({datasetId: this.datasetId, filter}));
    const rows = this.#transactions.filter(tx => tx.network === query.network
      && (from === undefined || time(tx.timestamp) >= from) && (to === undefined || time(tx.timestamp) < to)
      && (tx.sender === wallet || tx.gas.payer === wallet || tx.movements.some(m => m.address === wallet)));
    let offset = 0;
    if (query.cursor !== undefined) {
      assert(typeof query.cursor === 'string' && query.cursor.length <= 100, 'ACTIVITY_QUERY_CURSOR');
      const match = query.cursor.match(/^([1-9][0-9]{0,2})\.([a-f0-9]{64})$/);
      assert(match && match[2] === signature, 'ACTIVITY_QUERY_CURSOR');
      offset = Number(match[1]);
      assert(offset <= rows.length && offset % limit === 0, 'ACTIVITY_QUERY_CURSOR');
    }
    const page = rows.slice(offset, offset + limit), hasMore = offset + page.length < rows.length;
    return {
      sourceMode: this.mode === 'saved' ? 'saved-mainnet-replay' : 'synthetic-fixture', datasetId: this.datasetId,
      query: filter,
      coverage: {scope: 'local-recorded-subset', walletHistoryComplete: false, freshProviderRead: false,
        matchingRecordsInDataset: rows.length, returned: page.length, hasMore,
        interval: '[from, to)', missingHistory: 'unknown'},
      transactions: page.map(tx => ({digest: tx.digest, network: tx.network, timestamp: tx.timestamp, status: tx.status,
        source: tx.source, observedRoles: [tx.sender === wallet ? 'sender' : null,
          tx.gas.payer === wallet ? 'gas-payer' : null, tx.movements.some(m => m.address === wallet) ? 'balance-change' : null].filter(Boolean)})),
      nextCursor: hasMore ? String(offset + page.length) + '.' + signature : null,
      note: 'No match means no matching record in this local dataset. Wallet history completeness is unknown. Roles do not prove ownership or direct transfer counterparties.',
    };
  }
  examples() {
    return {sourceMode: this.mode === 'saved' ? 'saved-mainnet-replay' : 'synthetic-fixture', datasetId: this.datasetId,
      walletHistoryComplete: false, availableRecords: this.#transactions.length,
      senders: [...new Set(this.#transactions.map(tx => tx.sender))],
      timestamps: this.#transactions.map(tx => tx.timestamp)};
  }
}
export function loadOfflineActivity(mode: OfflineDataMode, snapshotBytes?: Uint8Array) {
  if (mode === 'fixture') return new OfflineActivityIndex((['mainnet','testnet'] as const).flatMap(network => FIXTURE_DIGESTS.map((id,index) =>
    normalizeTransaction(fixtureTransaction(index), id, network, 'fixture'))), mode);
  assert(mode === 'saved', 'OFFLINE_DATA_MODE');
  const path = new URL('../evidence/activity-model-2026-11-05/run.json', import.meta.url);
  if (!snapshotBytes) {
    const stat = lstatSync(path);
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 262144, 'SAVED_SNAPSHOT_FILE');
  }
  const bytes = snapshotBytes ?? readFileSync(path);
  assert(bytes.length <= 262144 && sha(bytes) === snapshotHash, 'SAVED_SNAPSHOT_HASH');
  const saved = JSON.parse(Buffer.from(bytes).toString('utf8'));
  const rows: ActivityTransaction[] = [...saved.first.prepared.transactionEvidence, ...saved.second.prepared.transactionEvidence];
  assert(rows.length === 2 && rows.every(tx => tx.source === 'tatum' && tx.network === 'mainnet'), 'SAVED_SNAPSHOT_SOURCE');
  return new OfflineActivityIndex(rows.map(tx => ({...tx, source: 'replay'})), mode);
}
