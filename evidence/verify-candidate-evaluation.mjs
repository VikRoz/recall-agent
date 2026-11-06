import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateExperienceRows} from '../app/agent-experience.ts';
import {operationKey} from '../app/agent-run.mjs';
import {verifyRecordedSource} from './recorded-source.mjs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const planBytes=readFileSync(new URL('candidate-evaluation-2026-11-07/plan.json',import.meta.url)),plan=JSON.parse(planBytes);
const run=read('candidate-evaluation-2026-11-07/run.json'),sha=value=>createHash('sha256').update(value).digest('hex');
assert.equal(run.status,'FROZEN_HYPOTHESIS_EVALUATION_OFFLINE_COMPLETED');assert.equal(run.planSha256,sha(planBytes));
assert.equal(plan.claimOrigin,'user-supplied-hypothesis');assert.equal(plan.constraints.newLiveOperationsAuthorized,false);
assert.equal(plan.nativeTasks.length,2);assert.equal(plan.constraints.limitsDraft.nativeUserTurns,2);
assert(!/memory|gas payer address|0x000037de/.test(plan.nativeTasks[1].text));
assert.equal(run.claimOrigin,'user-supplied-test-hypothesis');
for(const name of ['modelCalls','externalProviderCalls','additionalSpendUSD'])assert.equal(run[name],0);
assert.equal(run.initialHistory.records,2);assert.equal(new Set(run.processIds).size,5);assert.equal(run.processIds.length,5);
assert.equal(run.records.length,4);validateExperienceRows(run.records,run.records[0].record.workspace);
const gas=run.records.filter(r=>r.record.schema==='recall-experience/1');assert.equal(gas.length,2);
assert.equal(gas[1].record.supersedes,gas[0].id);assert.equal(gas[0].record.claimed,plan.offlineFixture.wallet);
assert.equal(gas[0].record.observed,plan.offlineFixture.payer);assert.equal(gas[0].record.source,'fixture');
for(const row of run.records){assert.equal(row.id,operationKey(row.record));assert.equal(row.blobId,row.id);}
assert.equal(run.first.experience.length,0);assert.equal(run.second.experience.length,1);
assert.equal(run.second.experience[0].id,run.failure.memory.id);assert.equal(run.failure.verdict,'fail');assert.equal(run.resolution.verdict,'pass');
assert.equal(run.pairLedger.writes,2);assert.equal(run.pairLedger.reads,2);assert.equal(run.pairLedger.tatumBatches,2);
assert.equal(run.pairLedger.requests,36);assert.equal(run.pairLedger.stopped,null);assert(run.pairLedger.intents.every(i=>i.state==='done'));
for(const report of [run.first,run.second]){
 assert.equal(report.dataProvenance.freshProviderRead,false);assert.equal(report.transactionEvidence[0].source,'fixture');
 assert.equal(report.transactionEvidence[0].gas.payer,plan.offlineFixture.payer);
 assert.equal(report.gas[0].netCharge,plan.offlineFixture.netGasMIST);
 assert.equal(report.rows.find(r=>r.address===plan.offlineFixture.wallet).netAmountBaseUnits,plan.offlineFixture.walletSuiDeltaMIST);
}
assert.deepEqual(run.negativeCases.map(c=>c.name),['other-digest','changed-payer']);
for(const c of run.negativeCases){
 assert.equal(c.report.experience.length,0);assert.equal(c.verification.memory,null);assert.equal(c.ledger.writes,0);
 assert.equal(c.ledger.reads,1);assert.equal(c.ledger.tatumBatches,1);assert.equal(c.ledger.stopped,null);
 assert.equal(c.verification.observed,c.name==='other-digest'?plan.offlineFixture.payer:plan.offlineFixture.changedPayer);
}
assert.equal(run.noCapture.verification.verdict,'fail');assert.equal(run.noCapture.verification.memory,null);assert.equal(run.noCapture.ledger.writes,0);
assert.deepEqual(run.applicability.map(c=>[c.name,c.relevantRecords.length]),[['exact',2],['other-network',0],['other-source',0]]);
assert(run.applicability.every(c=>c.providerCalls===0));
let source;
if(run.sourceCommit)source=verifyRecordedSource({sourceCommit:run.sourceCommit,productAndHarnessSha256:run.sourceHashes});
else{for(const [name,hash] of Object.entries(run.sourceHashes)){
 assert(/^(app|src)\/[A-Za-z0-9_.\/-]+$/.test(name)&&!name.includes('..'));
 assert.equal(sha(readFileSync(new URL('../'+name,import.meta.url))),hash);
}source='CURRENT_WORKTREE_BYTES_VERIFIED';}
console.log(JSON.stringify({status:run.status,source,modelCalls:0,externalProviderCalls:0,additionalSpendUSD:0,
 syntheticPair:{tatumBatches:2,writes:2,contentReads:2,sdkRequests:36},negativeApplicabilityControls:4,captureOptOutPassed:true},null,2));
