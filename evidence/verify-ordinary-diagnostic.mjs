import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyRecordedSource} from './recorded-source.mjs';
const r=JSON.parse(readFileSync(new URL('ordinary-diagnostic-offline-2026-11-07/run.json',import.meta.url),'utf8')),d=r.diagnostic;
assert.equal(r.status,'OFFLINE_FIRST_FAILURE_DIAGNOSTIC_VERIFIED');assert.equal(r.synthetic,true);assert.equal(r.realCredentialsRead,false);
assert.equal(r.actualProviderCalls,0);assert.equal(r.actualModelCalls,0);assert.equal(r.additionalSpendUSD,0);assert.equal(r.independentProcesses,2);
assert.equal(r.controlledFailure,'second-startup-health-503-after-intercepted-remember');assert.equal(r.observed.verdict,'fail');assert.equal(r.observed.memory.storage,'walrus-fixture');
assert.deepEqual(Object.keys(d).sort(),['schema','manifestHash','contextHash','recordedAt','phase','route','method','category','faultCode','httpStatus','requestCount'].sort());
assert.equal(d.schema,1);assert.equal(d.manifestHash,r.before.manifestHash);assert.match(d.contextHash,/^[a-f0-9]{64}$/);
assert.equal(d.phase,'startup');assert.equal(d.route,'health');assert.equal(d.method,'GET');assert.equal(d.category,'http');assert.equal(d.httpStatus,503);assert.equal(d.faultCode,'AGENT_PROVIDER_HTTP');
assert.equal(r.ledgerSchemaUnchanged,true);assert.deepEqual(Object.keys(r.before).sort(),Object.keys(r.after).sort());
assert.equal(r.before.stopped,null);assert.equal(r.after.stopped,'AGENT_PROVIDER_OR_POLICY_ERROR');assert.equal(r.after.requests,r.before.requests+1);assert.equal(d.requestCount,r.after.requests);
assert.equal(r.before.writes,1);assert.equal(r.after.writes,1);assert.deepEqual(r.before.intents,r.after.intents);assert(r.after.intents.every(i=>i.state==='done'));
for(const k of ['writes','reads','tatumBatches'])assert.equal(r.after[k],r.before[k]);
let source;
if(r.sourceCommit)source=verifyRecordedSource({sourceCommit:r.sourceCommit,productAndHarnessSha256:r.sourceHashes});
else{for(const [name,hash] of Object.entries(r.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+name,import.meta.url))).digest('hex'),hash);source='CURRENT_WORKTREE_BYTES_VERIFIED';}
console.log(JSON.stringify({status:r.status,source,controlledFailure:r.controlledFailure,firstFailure:{phase:d.phase,route:d.route,status:d.httpStatus,code:d.faultCode},ledgerSchemaUnchanged:true,actualProviderCalls:0,actualModelCalls:0,additionalSpendUSD:0}));
