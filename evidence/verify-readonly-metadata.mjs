import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyRecordedSource} from './recorded-source.mjs';
import {runHash} from '../app/agent-run.mjs';
const statusShape=process.argv[2]==='--status-shape';assert(process.argv.length===2||process.argv.length===3&&statusShape);
const r=JSON.parse(readFileSync(new URL('readonly-metadata-offline-2026-11-07/'+(statusShape?'status-shape-run.json':'run.json'),import.meta.url),'utf8'));
assert.equal(r.status,'OFFLINE_READONLY_METADATA_STARTUP_PREPARED');assert.equal(r.synthetic,true);assert.equal(r.actualProfilesRead,false);
assert.equal(r.actualProviderCalls,0);assert.equal(r.actualModelCalls,0);assert.equal(r.additionalSpendUSD,0);
const {success:s,failure:f}=r;
if(statusShape){assert.equal(r.metadataStatusShapeRegression,true);assert.equal(s.result.allExpectedMetadataIdsPresent,true);assert.equal(s.result.metadataStatusInterpretation,'not-evaluated');assert(!JSON.stringify(s.result).includes('future_pending_PRIVATE_CANARY'));}
assert.equal(s.stdio.initialized,true);assert.equal(s.stdio.resultHash,runHash(s.result));assert.equal(s.stdio.status,'STDIO_DIAGNOSTIC_COMPLETED');
assert.equal(s.counter.finished,true);assert.equal(s.counter.requests,5);assert.equal(s.counter.stopped,null);assert.equal(s.result.requests,5);assert.equal(s.result.blobIds.length,3);
assert.equal(s.sdk.created,1);assert.equal(s.sdk.destroyed,1);assert.equal(s.oldLedgerUnchanged,true);assert(s.trace.every(t=>!t.seal));assert.equal(s.trace.length,5);
assert.deepEqual(s.trace.slice(0,4).map(t=>t.path),['/health','/version','/config','/api/stats']);assert(s.trace[4].path.endsWith('/memories'));assert.equal(s.trace.filter(t=>t.signed).length,2);
for(const k of ['contentReads','writes','tatumCalls','modelCalls','additionalSpendUSD'])assert.equal(s.result[k],0);
assert.equal(f.counter.finished,false);assert.equal(f.counter.requests,1);assert.equal(f.counter.stopped,'READONLY_DIAGNOSTIC_STOPPED');assert.equal(f.stdio.initialized,false);
assert.equal(f.stdio.status,'STDIO_DIAGNOSTIC_STOPPED');assert.equal(f.diagnostic.route,'health');assert.equal(f.diagnostic.httpStatus,503);assert.equal(f.diagnostic.faultCode,'AGENT_PROVIDER_HTTP');assert.equal(f.sdk.destroyed,1);
let source;
if(r.sourceCommit)source=verifyRecordedSource({sourceCommit:r.sourceCommit,productAndHarnessSha256:r.sourceHashes});
else{for(const [name,hash] of Object.entries(r.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+name,import.meta.url))).digest('hex'),hash);source='CURRENT_WORKTREE_BYTES_VERIFIED';}
console.log(JSON.stringify({status:r.status,source,metadataOnly:true,stdioInitialized:true,syntheticRequests:{success:5,failure:1},actualProviderCalls:0,actualModelCalls:0,actualProfilesRead:false}));
