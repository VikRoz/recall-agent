import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { assert, canonical, exactKeys, time } from '../src/domain.ts';
import { address, digest, signed } from './activity.ts';
import type { ActivityTransaction } from './activity.ts';
import { isValidStructTag, normalizeStructTag } from '@mysten/sui/utils';
import { ExecutedTransaction } from './node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/executed_transaction.mjs';

export const NORMALIZER_SHA256 = createHash('sha256').update(readFileSync(new URL('./activity.ts', import.meta.url))).digest('hex');
// Official protobuf JSON preserves uint64/int64 as decimal strings, bytes as base64,
// oneof fields and Timestamp's RFC3339 representation. Unknown fields are not hashed.
export const transactionProof = (raw: any) => ExecutedTransaction.toJson(ExecutedTransaction.create(raw));
export const factHash = (raw: unknown) => createHash('sha256').update(canonical(transactionProof(raw))).digest('hex');
export const verifyFactProof = (proof: any, expected: string) => {
  const normalized = transactionProof(ExecutedTransaction.fromJson(proof));
  assert(createHash('sha256').update(canonical(normalized)).digest('hex') === expected, 'FACT_RAW_PROOF_HASH');
  return normalized;
};
export type FactEvidence = { kind: 'tatum' | 'fixture'; method: 'sui.rpc.v2.LedgerService/BatchGetTransactions';
  hashScope: 'protobuf-json-selected-transaction'; rawTransactionSha256: string; normalizerSha256: string };
export type TransactionFact = { schema: 'recall-transaction-fact/1'; workspace: string; network: 'mainnet';
  digest: string; source: 'tatum' | 'fixture'; observedAt: string; provenance: FactEvidence; transaction: ActivityTransaction };
export const isFact = (record: {schema: string}): record is TransactionFact => record.schema === 'recall-transaction-fact/1';

export function validateTransactionFact(record: TransactionFact, workspace: string) {
  exactKeys(record, ['schema','workspace','network','digest','source','observedAt','provenance','transaction']);
  assert(record.schema === 'recall-transaction-fact/1' && record.workspace === workspace && record.network === 'mainnet'
    && ['tatum','fixture'].includes(record.source), 'FACT_SCOPE');
  digest(record.digest); time(record.observedAt);
  const p = record.provenance, tx = record.transaction;
  exactKeys(p, ['kind','method','hashScope','rawTransactionSha256','normalizerSha256']);
  assert(p.kind === record.source && p.method === 'sui.rpc.v2.LedgerService/BatchGetTransactions'
    && p.hashScope === 'protobuf-json-selected-transaction'
    && [p.rawTransactionSha256,p.normalizerSha256].every(x => /^[a-f0-9]{64}$/.test(x)), 'FACT_PROVENANCE');
  exactKeys(tx, ['digest','network','checkpoint','timestamp','sender','commands','interpretation','status','source','gas','movements']);
  assert(tx.digest === record.digest && tx.network === record.network && tx.source === record.source
    && /^(0|[1-9][0-9]{0,29})$/.test(tx.checkpoint) && address(tx.sender) === tx.sender
    && ['success','failed'].includes(tx.status), 'FACT_TRANSACTION');
  time(tx.timestamp);
  assert(Array.isArray(tx.commands) && tx.commands.length <= 100
    && tx.commands.every(x => typeof x === 'string' && /^[a-zA-Z][a-zA-Z0-9]{0,79}$/.test(x)), 'FACT_COMMANDS');
  const transfer = tx.commands.length > 0 && tx.commands.every(x => ['splitCoins','mergeCoins','transferObjects'].includes(x));
  assert(tx.interpretation === (transfer ? 'transfer-commands' : 'unparsed-ptb'), 'FACT_INTERPRETATION');
  exactKeys(tx.gas, ['payer','computation','storage','rebate','netCharge']);
  assert(address(tx.gas.payer) === tx.gas.payer && [tx.gas.computation,tx.gas.storage,tx.gas.rebate]
    .every(x => typeof x === 'string' && /^(0|[1-9][0-9]{0,29})$/.test(x)), 'FACT_GAS');
  assert(signed(tx.gas.netCharge) === BigInt(tx.gas.computation) + BigInt(tx.gas.storage) - BigInt(tx.gas.rebate), 'FACT_GAS');
  assert(Array.isArray(tx.movements) && tx.movements.length <= 200, 'FACT_MOVEMENTS');
  const keys: string[] = [];
  for (const m of tx.movements) {
    exactKeys(m, ['address','coinType','amount']);
    assert(address(m.address) === m.address && typeof m.coinType === 'string' && m.coinType.length <= 300
      && isValidStructTag(m.coinType) && normalizeStructTag(m.coinType) === m.coinType, 'FACT_MOVEMENT');
    signed(m.amount); keys.push(m.address + m.coinType);
  }
  assert(new Set(keys).size === keys.length && canonical(keys) === canonical([...keys].sort((a,b) => a.localeCompare(b))), 'FACT_MOVEMENT_ORDER');
  assert(Buffer.byteLength(canonical(record)) <= 4096, 'FACT_TOO_LARGE');
}
export function transactionFact(workspace: string, tx: ActivityTransaction, provenance: FactEvidence, observedAt: string): TransactionFact {
  assert(tx.source === 'tatum' || tx.source === 'fixture', 'FACT_FRESH_SOURCE_REQUIRED');
  const record: TransactionFact = {schema:'recall-transaction-fact/1',workspace,network:'mainnet',digest:tx.digest,
    source:tx.source,observedAt,provenance:structuredClone(provenance),transaction:structuredClone(tx)};
  validateTransactionFact(record, workspace); return record;
}
// Raw transport hashes and observation times deliberately do not define semantic identity.
export function factMatch(old: TransactionFact, next: TransactionFact) {
  assert(old.workspace === next.workspace && old.network === next.network && old.digest === next.digest, 'FACT_IDENTITY');
  if (old.provenance.normalizerSha256 !== next.provenance.normalizerSha256) return 'incompatible-normalizer';
  assert(canonical(old.transaction) === canonical(next.transaction), 'FACT_SEMANTIC_CONFLICT');
  return 'same';
}
