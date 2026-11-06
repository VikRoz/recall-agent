import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { canonical } from '../src/domain.ts';
import { report, csv, rule } from '../app/activity.ts';
const root = new URL('./activity-mainnet-2026-11-05/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const first = JSON.parse(read('first-result.json'));
const second = JSON.parse(read('second-result.json'));
const result = JSON.parse(read('pilot-result.json'));
const hash = x => createHash('sha256').update(canonical(x)).digest('hex');
assert.equal(result.status, 'VERIFIED_PROVIDER_PATH');
assert.equal(result.mode, 'live-providers');
assert.equal(result.modelRequests, 0);
assert.equal(result.approvedMaxSpendUSD, 0);
assert.equal(result.counts.stopped, null);
for (const name of ['tatumBatches', 'writes', 'reads']) assert.equal(result.counts[name], 2);
assert.equal(result.counts.requests, 37);
assert.equal(new Set([result.parentPid, ...result.workerPids]).size, 3);
for (const [i, worker] of [first, second].entries()) {
  assert.equal(worker.mode, 'live-providers');
  assert.equal(worker.pid, result.workerPids[i]);
  assert.equal(worker.planHash, result.planHash);
  assert.equal(worker.intentHash, result.intentHash);
  rule(worker.record, worker.record);
  assert.equal(hash(worker.record), result.records[i].sha256);
  assert.equal(worker.receipt.blobId, result.receipts[i].blobId);
  assert.equal(worker.record.id, result.records[i].recordId);
  const value = worker.report;
  assert.equal(value.transactionEvidence[0].source, 'tatum');
  const computed = report(value.transactionEvidence, value.wallet,
    value.memory.map(({blobId, ...record}) => ({blobId, record})), value.asOf);
  for (const key of Object.keys(computed)) assert.equal(hash(value[key]), hash(computed[key]), key);
}
assert.equal(second.record.supersedes, first.record.id);
assert.equal(second.report.memory[0].blobId, first.receipt.blobId);
const {blobId, ...recalled} = second.report.memory[0];
assert.equal(hash(recalled), hash(first.record));
const final = second.exported.report;
assert.equal(final.memory.length, 2);
for (const worker of [first, second]) {
  const row = final.memory.find(r => r.blobId === worker.receipt.blobId);
  const {blobId, ...record} = row;
  assert.equal(hash(record), hash(worker.record));
}
assert.ok(final.rows.some(row => row.ruleId === second.record.id && row.relation === 'external'));
for (const key of ['transactionEvidence', 'totals', 'gas']) assert.equal(hash(second.report[key]), hash(final[key]));
const recomputed = report(final.transactionEvidence, final.wallet,
  final.memory.map(({blobId, ...record}) => ({blobId, record})), final.asOf);
for (const key of Object.keys(recomputed)) assert.equal(hash(final[key]), hash(recomputed[key]));
assert.equal(hash(final), result.reportSha256);
assert.equal(csv(final), read('report.csv'));
assert.equal(second.exported.csv, read('report.csv'));
assert.equal(createHash('sha256').update(read('report.csv')).digest('hex'), result.csvSha256);
console.log('Saved activity Mainnet evidence verified offline: exact records, independent-process readback, linked correction, unchanged chain facts and recomputed CSV. No network requests.');
