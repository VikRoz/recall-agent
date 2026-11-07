import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyRecordedSource} from './recorded-source.mjs';
import {validateExperienceRows} from '../app/agent-experience.ts';
const read=n=>JSON.parse(readFileSync(new URL(n,import.meta.url),'utf8'));
const r=read('ordinary-managed-offline-2026-11-07/run.json'),p=read('ordinary-managed-offline-2026-11-07/live-plan.json');
assert.equal(r.status,'OFFLINE_MANAGED_ADMISSION_CHECKED');assert.equal(r.synthetic,true);
for(const k of ['actualModelCalls','actualProviderCalls','additionalSpendUSD'])assert.equal(r[k],0);
assert.equal(r.independentMcpProcesses,2);assert.equal(r.initialRecords,2);assert.equal(r.finalRecords,4);assert.equal(r.oldLedgerUnchanged,true);
assert.equal(r.counters.stopped,null);assert.equal(r.counters.tatumBatches,2);assert.equal(r.counters.writes,2);assert.equal(r.counters.reads,2);assert.equal(r.counters.requests,50);
assert.equal(r.requestTrace.length,r.counters.requests);assert.equal(r.tatumTrace.requests.length,2);assert.equal(r.tatumTrace.closedClients,2);
assert(r.requestTrace.some(q=>q.path==='/config'));assert(r.requestTrace.some(q=>q.signed));assert(r.requestTrace.some(q=>q.seal));
assert.equal(r.preflight.writes,0);assert.equal(r.preflight.reads,0);assert(r.preflight.requests>=5);
assert.equal(r.finalInventory.experience.blobIds.length,4);assert.equal(r.finalInventory.rules.blobIds.length,0);
assert.equal(r.trace.length,4);const [first,fail,second,resolution]=r.trace.map(t=>t.result);
assert.equal(first.experience.length,0);assert.equal(second.experience.length,1);assert.equal(fail.verdict,'fail');assert.equal(resolution.verdict,'pass');
assert.equal(second.experience[0].id,fail.memory.id);assert.equal(r.records.find(row=>row.id===resolution.memory.id).record.supersedes,fail.memory.id);
validateExperienceRows(r.records,r.records[0].record.workspace);assert.equal(r.records.length,4);
for(const report of [first,second]){assert.equal(report.transactionEvidence[0].source,'fixture');assert.equal(report.dataProvenance.freshProviderRead,false);}
assert.equal(p.model,'gpt-5.6-luna');assert.equal(p.limits.nativeTurns,2);assert.equal(p.limits.maxUSD,0);assert.equal(p.tasks.length,2);
assert.deepEqual(p.runtimeHashes,r.sourceHashes);assert.equal(r.immutablePlanHash,createHash('sha256').update(JSON.stringify(sort(p))).digest('hex'));
function sort(v){if(Array.isArray(v))return v.map(sort);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])]));return v;}
let source;
if(r.sourceCommit)source=verifyRecordedSource({sourceCommit:r.sourceCommit,productAndHarnessSha256:r.sourceHashes});
else{for(const [name,hash] of Object.entries(r.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+name,import.meta.url))).digest('hex'),hash,name);source='CURRENT_WORKTREE_BYTES_VERIFIED';}
console.log(JSON.stringify({status:r.status,source,independentMcpProcesses:2,simulated:{tatum:2,writes:2,reads:2,requests:50},actualProviderCalls:0,actualModelCalls:0,additionalSpendUSD:0}));
