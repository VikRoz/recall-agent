import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { canonical } from '../src/domain.ts';
import { report, csv, rule } from '../app/activity.ts';
const root = new URL('./activity-model-2026-11-05/', import.meta.url);
const e = JSON.parse(readFileSync(new URL('run.json', root), 'utf8'));
const hash = x => createHash('sha256').update(canonical(x)).digest('hex');
assert.equal(e.status, 'VERIFIED_CODEX_ACTIVITY_FLOW_WITH_CONTINUATION');
assert.equal(e.mode, 'live-providers');
assert.equal(e.additionalSpendUSD, 0);
assert.equal(e.counts.stopped, null);
for (const key of ['tatumBatches', 'writes', 'reads']) assert.equal(e.counts[key], 2);
assert.equal(e.counts.requests, 38);
assert.equal(new Set(e.conversations.map(c => c.sessionIdSha256)).size, 2);
assert.deepEqual(e.conversations.map(c => c.toolCalls.map(x => x.method)), [
  ['prepare_report', 'propose_address_rule', 'save_address_rule'],
  ['prepare_report', 'propose_address_rule', 'save_address_rule', 'export_report'],
]);
assert.equal(e.journalReceipts.length, 2);
for (const [index, phase] of [e.first, e.second].entries()) {
  assert.equal(phase.prepared.mode, 'live-providers');
  assert.equal(phase.prepared.transactionEvidence[0].source, 'tatum');
  assert.equal(phase.prepared.transactionEvidence.length, 1);
  assert.equal(phase.proposal.preview.subjectWallet, phase.prepared.wallet);
  rule(phase.proposal.preview, phase.proposal.preview);
  const receipt = e.journalReceipts.find(x => x.blobId === phase.receipt.blobId);
  assert.ok(receipt);
  assert.equal(receipt.state, 'done');
  assert.equal(receipt.jobId, phase.receipt.jobId);
  assert.equal(receipt.sha256, hash(phase.proposal.preview));
  assert.ok(e.counts.jobs[receipt.jobId] > 0 && e.counts.jobs[receipt.jobId] <= 8);
  const c = e.conversations[index];
  assert.equal(c.client, 'Codex CLI');
  assert.ok(c.confirmedWrite.text.startsWith('I confirm this exact'));
  const save = c.toolCalls.find(x => x.method === 'save_address_rule');
  assert.ok(Date.parse(save.requestedAt) > Date.parse(c.confirmedWrite.at));
  assert.ok(Date.parse(phase.proposal.preview.recordedAt) <= Date.parse(c.confirmedWrite.at));
  const prepared = phase.prepared;
  const computed = report(prepared.transactionEvidence, prepared.wallet,
    prepared.memory.map(({blobId, ...record}) => ({blobId, record})), prepared.asOf);
  for (const key of Object.keys(computed)) assert.equal(hash(prepared[key]), hash(computed[key]), key);
}
assert.equal(e.first.prepared.memory.length, 0);
assert.equal(e.second.prepared.memory.length, 1);
const {blobId: firstBlob, ...firstRecord} = e.second.prepared.memory[0];
assert.equal(firstBlob, e.first.receipt.blobId);
assert.equal(hash(firstRecord), hash(e.first.proposal.preview));
assert.equal(e.second.proposal.preview.supersedes, e.first.proposal.preview.id);
assert.equal(e.second.proposal.preview.address, e.first.proposal.preview.address);
assert.equal(e.first.proposal.preview.relation, 'unknown');
assert.equal(e.second.proposal.preview.relation, 'external');
assert.equal(e.continuation.planHash, e.counts.planHash);
assert.equal(e.continuation.countersBefore.tatumBatches, 1);
assert.equal(e.continuation.countersBefore.writes, 1);
assert.equal(e.continuation.countersBefore.reads, 0);
assert.equal(e.continuation.expectedReceipts[0].blobId, firstBlob);
assert.equal(e.continuation.expectedReceipts[0].sha256, hash(firstRecord));
assert.equal(Object.keys(e.counts.jobs).length, 2);
const final = e.second.exported.report;
assert.equal(final.memory.length, 2);
for (const phase of [e.first, e.second]) {
  const {blobId, ...record} = final.memory.find(x => x.blobId === phase.receipt.blobId);
  assert.equal(hash(record), hash(phase.proposal.preview));
}
assert.ok(final.rows.some(x => x.ruleId === e.second.proposal.preview.id
  && x.memoryBlobId === e.second.receipt.blobId && x.relation === 'external'));
for (const key of ['transactionEvidence', 'totals', 'gas']) assert.equal(hash(final[key]), hash(e.second.prepared[key]));
const computed = report(final.transactionEvidence, final.wallet,
  final.memory.map(({blobId, ...record}) => ({blobId, record})), final.asOf);
for (const key of Object.keys(computed)) assert.equal(hash(final[key]), hash(computed[key]), key);
const saved = readFileSync(new URL('report.csv', root), 'utf8');
assert.equal(csv(final), saved);
assert.equal(e.second.exported.csv, saved);
console.log(JSON.stringify({status:e.status, conversations:2, confirmedWrites:2,
  counts:e.counts, csvSha256:createHash('sha256').update(saved).digest('hex'),
  verification:'Saved evidence recomputed offline; no model or provider request.'}, null, 2));
