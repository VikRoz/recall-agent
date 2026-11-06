import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyRecordedSource} from './recorded-source.mjs';
import {validateExperienceRows} from '../app/agent-experience.ts';
import {runHash,operationKey} from '../app/agent-run.mjs';
const run=JSON.parse(readFileSync(new URL('./ordinary-provider-offline-2026-11-07/run.json',import.meta.url),'utf8'));
assert.equal(run.status,'ORDINARY_PROVIDER_PROTOCOL_OFFLINE_COMPLETED');assert.equal(run.execution,'offline-intercepted');
for(const name of ['modelCalls','externalProviderCalls','additionalSpendUSD'])assert.equal(run[name],0);
assert.equal(run.realProfileLoaded,false);assert.equal(run.initialHistory.records,4);assert.match(run.initialHistory.origin,/synthetic/);
assert.equal(run.processIds.length,2);assert.notEqual(...run.processIds);
assert(!run.tools.includes('find_wallet_activity'));assert.equal(run.records.length,6);
const workspace=run.records[0].record.workspace;validateExperienceRows(run.records,workspace);
for(const row of run.records){assert.equal(row.id,operationKey(row.record));assert.equal(row.blobId,row.id);assert.equal(row.record.source,'fixture');}
for(const [i,report] of run.reports.entries()){
 assert.equal(report.mode,'offline-ordinary-provider-fixture');assert.equal(report.experience.length,4+i);
 assert.equal(report.dataProvenance.freshProviderRead,false);assert.equal(report.dataProvenance.walletHistoryComplete,false);
 assert.equal(report.dataProvenance.sourceMode,'offline-intercepted-tatum');assert.equal(report.transactionEvidence[0].source,'fixture');
}
assert.equal(run.failure.verdict,'fail');assert.equal(run.resolution.verdict,'pass');
const failure=run.records.find(r=>r.id===run.failure.memory.id),resolution=run.records.find(r=>r.id===run.resolution.memory.id);
assert(failure&&resolution);assert.equal(resolution.record.supersedes,failure.id);
assert.equal(run.ledger.tatumBatches,2);assert.equal(run.ledger.writes,2);assert.equal(run.ledger.reads,2);assert.equal(run.ledger.stopped,null);
assert.equal(run.ledger.requests,run.sdkTrace.length);assert(run.ledger.requests<=64);
assert.equal(run.ledger.intents.length,2);assert.equal(Object.keys(run.ledger.jobs).length,2);
for(const intent of run.ledger.intents){assert.equal(intent.state,'done');const row=run.records.find(r=>r.id===intent.key);assert(row);assert.equal(intent.sha256,runHash(row.record));}
assert.equal(run.tatumTrace.requests.length,2);assert.equal(run.tatumTrace.closedClients,2);
assert(run.tatumTrace.requests.every(r=>r.endpoint==='https://sui-mainnet-grpc.gateway.tatum.io'&&r.method==='BatchGetTransactions'));
assert.equal(run.sdkTrace.filter(r=>r.path==='/api/remember').length,2);
assert.equal(run.sdkTrace.filter(r=>r.path==='/api/recall').length,2);
assert(run.sdkTrace.filter(r=>r.path==='/api/remember').every(r=>r.signed&&r.seal));
let source;
if(run.sourceCommit)source=verifyRecordedSource({sourceCommit:run.sourceCommit,productAndHarnessSha256:run.sourceHashes});
else{
 for(const [name,hash] of Object.entries(run.sourceHashes)){
  assert((/^(app|src)\/[A-Za-z0-9_.\/-]+$/.test(name)||name==='start.command')&&!name.includes('..'));
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+name,import.meta.url))).digest('hex'),hash);
 }source='CURRENT_WORKTREE_BYTES_VERIFIED';
}
console.log(JSON.stringify({status:run.status,source,retainedSyntheticRecords:6,independentProcesses:true,
 simulatedTatumBatches:2,simulatedWrites:2,simulatedContentRecalls:2,guardedSyntheticSdkRequests:run.ledger.requests,
 modelCalls:0,externalProviderCalls:0,realProfileLoaded:false,additionalSpendUSD:0},null,2));
