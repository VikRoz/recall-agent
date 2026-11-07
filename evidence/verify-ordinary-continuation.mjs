import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runHash,operationKey} from '../app/agent-run.mjs';
import {validateExperienceRows} from '../app/agent-experience.ts';
import {verifyRecordedSource} from './recorded-source.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const captureScope=process.argv[2]==='--capture-scope';assert(process.argv.length===2||process.argv.length===3&&captureScope);
const r=read('ordinary-continuation-offline-2026-11-07/'+(captureScope?'capture-scope-run.json':'run.json')),evaluation=read('candidate-evaluation-2026-11-07/plan.json');
assert.equal(r.status,'OFFLINE_SINGLE_CONTINUATION_VERIFIED');assert.equal(r.synthetic,true);
for(const k of ['modelCalls','actualProviderCalls','actualProfilesRead','actualKeysRead','additionalSpendUSD'])assert.equal(r[k],0);
assert.deepEqual(r.task,evaluation.nativeTasks[1]);assert.equal(r.taskHash,runHash(r.task));
assert.equal(r.initialRecords,3);assert.equal(r.originalStatesUnchanged,true);assert.notEqual(r.nativeMcpPid,r.readerPid);
assert.equal(r.counters.tatumBatches,1);assert.equal(r.counters.writes,1);assert.equal(r.counters.reads,2);assert.equal(r.counters.requests,captureScope?40:36);assert.equal(r.counters.stopped,null);
assert.equal(r.native.turns.length,1);assert.equal(r.native.turns[0].status,'completed');assert.equal(r.native.turns[0].taskHash,r.taskHash);
assert.equal(r.records.length,4);validateExperienceRows(r.records,r.records[0].record.workspace);
assert.equal(r.report.experience.length,1);const parent=r.report.experience[0],child=r.records.find(x=>x.id===r.resolution.memory.id);
assert.equal(parent.record.verdict,'fail');assert.equal(child.record.verdict,'resolved');assert.equal(child.record.supersedes,parent.id);
assert.equal(r.resolution.verdict,'pass');assert.equal(child.id,operationKey(child.record));assert.equal(child.blobId,r.resolution.memory.blobId);
assert.equal(r.counters.intents[0].key,child.id);assert.equal(r.counters.intents[0].state,'done');assert.equal(r.counters.intents[0].sha256,runHash(child.record));
if(captureScope){
 assert.equal(r.wrongHypotheses.length,2);assert.notEqual(r.wrongHypotheses[0].claimed,r.wrongHypotheses[1].claimed);
 for(const v of r.wrongHypotheses){assert.equal(v.verdict,'fail');assert.equal(v.memory,null);assert.equal(v.captureScope,'linked-resolution-only');assert.equal(v.captureSkipped,'not-admitted-by-scope');assert.equal(v.observed,r.report.gas[0].payer);}
 assert.equal(r.resolution.captureScope,'linked-resolution-only');assert.equal(r.resolution.captureSkipped,undefined);
 assert(r.verificationDescription.includes('linked resolutions only')&&r.verificationDescription.includes('not-admitted-by-scope'));
 assert(!r.verificationDescription.includes(parent.id)&&!r.verificationDescription.includes(parent.record.observed));
}
let source;
if(r.sourceCommit)source=verifyRecordedSource({sourceCommit:r.sourceCommit,productAndHarnessSha256:r.sourceHashes});
else{for(const [name,hash]of Object.entries(r.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+name,import.meta.url))).digest('hex'),hash);source='CURRENT_WORKTREE_BYTES_VERIFIED';}
console.log(JSON.stringify({status:r.status,source,originalStatesUnchanged:true,independentReader:true,captureScopeSeparation:captureScope,syntheticLimits:'1 Tatum / 1 write / 2 reads / '+r.counters.requests+' guarded requests',actualProviderCalls:0,modelCalls:0}));
