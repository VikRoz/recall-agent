// Saved, sanitized actual diagnostic evidence. This verifier performs no network or profile reads.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runHash,operationKey} from '../app/agent-run.mjs';
import {validateExperienceRows} from '../app/agent-experience.ts';
import {verifyRecordedSource} from './recorded-source.mjs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const e=read('readonly-metadata-live-2026-11-07/run.json'),r=e.result,s=e.counter,p=e.stdio;
assert.equal(e.status,'ACTUAL_READONLY_METADATA_DIAGNOSTIC_VERIFIED');
assert.equal(e.sourceCommit,'7457b304c59a2f2c4fca98e81305d220f6adedea');
assert.equal(e.contextHash,'0ed22fc8025ec5d1127f4f3354f6353adea70cbb409add816b0a0a8f56068e5e');
const spec=read('readonly-metadata-offline-2026-11-07/spec-status-shape.json');
assert.deepEqual(e.sourceHashes,spec.sourceHashes);assert.deepEqual(e.identity,spec.identity);
assert.deepEqual(e.limits,spec.limits);assert.deepEqual(e.expectedBlobIds,spec.expectedBlobIds);
assert.equal(r.synthetic,false);assert.equal(r.status,'CURRENT_METADATA_DIAGNOSTIC_STARTUP_COMPLETED');
assert.equal(r.metadataStatusInterpretation,'not-evaluated');assert.equal(r.allExpectedMetadataIdsPresent,true);
assert.equal(r.namespace,e.identity.workspace+'-experience');
assert.deepEqual(r.blobIds,e.expectedBlobIds);assert.equal(r.requests,5);
for(const k of ['additionalSpendUSD','contentReads','modelCalls','tatumCalls','writes'])assert.equal(r[k],0);
for(const x of [r,s,p])assert.equal(x.contextHash,e.contextHash);
assert.equal(s.requests,5);assert.equal(s.finished,true);assert.equal(s.stopped,null);
assert.equal(p.initialized,true);assert.equal(p.status,'STDIO_DIAGNOSTIC_COMPLETED');assert.equal(p.resultHash,runHash(r));
assert.equal(e.launchAttempts,1);assert.equal(e.allowanceConsumed,true);assert.equal(e.profileUsedInPlace,true);
assert.equal(e.secretCopies,0);assert.equal(e.sealCalls,0);assert.equal(e.publication,false);assert.equal(e.deployment,false);
assert.equal(e.oldApplicationStatesUnchanged,true);assert.equal(e.oldTemporaryTatumKeyAbsent,true);
assert.equal(e.oldStateFiles.length,5);assert(e.oldStateFiles.every(f=>!f.file.startsWith('/')&&/^[a-f0-9]{64}$/.test(f.sha256)));
// The third completed write came from a stopped run. Preserve its provenance and stop, never forge a combined ledger.
const old=read('agent-live-trial-2026-11-06/run.json'),latest=read('ordinary-live-2026-11-07/run.json');
for(const k of Object.keys(e.identity)){assert.equal(old.manifest[k],e.identity[k]);assert.equal(latest.manifest[k],e.identity[k]);}
const rows=[...old.records,latest.newRecord];validateExperienceRows(rows,e.identity.workspace);
assert.equal(new Set(rows.map(x=>x.id)).size,3);assert.equal(new Set(rows.map(x=>x.blobId)).size,3);
assert.deepEqual(rows.map(x=>x.blobId).sort(),e.expectedBlobIds);
for(const row of rows){
 const prior=old.records.some(x=>x.id===row.id),receipt=prior?old.receipts[row.id]:latest.receipt,ledger=prior?old.ledger:latest.ledger;
 assert.equal(row.id,operationKey(row.record));assert.equal(receipt.state,'done');assert.equal(receipt.blobId,row.blobId);
 assert.equal(receipt.sha256,runHash(row.record));assert.equal(ledger.manifestHash,runHash(prior?old.manifest:latest.manifest));
 assert(ledger.intents.some(i=>i.key===row.id&&i.sha256===receipt.sha256&&i.namespace===r.namespace&&i.state==='done'));
 assert.equal(ledger.jobs[receipt.jobId].key,row.id);assert.equal(ledger.jobs[receipt.jobId].namespace,r.namespace);
}
assert.equal(latest.ledger.stopped,'AGENT_PROVIDER_OR_POLICY_ERROR');assert.equal(latest.nativeSlotsConsumed,2);
const source=verifyRecordedSource({sourceCommit:e.sourceCommit,productAndHarnessSha256:e.sourceHashes});
console.log(JSON.stringify({status:e.status,source,metadataRecords:3,stdioInitialized:true,requests:5,
 plaintextReadbackAttested:false,historicalCauseKnown:false,allowanceConsumed:true,verifierProviderCalls:0}));
