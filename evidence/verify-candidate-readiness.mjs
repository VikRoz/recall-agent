// Offline receipt reconciliation. Never loads an account profile or provider client.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {canonical} from '../src/domain.ts';
import {validateExperienceRows} from '../app/agent-experience.ts';
import {validateRules} from '../app/activity.ts';
const root=new URL('../',import.meta.url),read=name=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const inventory=read('evidence/candidate-readiness-2026-11-06/inventory.json');
assert.equal(inventory.schema,1);assert.equal(inventory.method,'offline-receipt-reconciliation-only');
for(const [name,hash] of Object.entries(inventory.sourceHashes)){
 assert.match(name,/^evidence\/[a-z0-9./-]+\.json$/);assert(!name.includes('..'));
 assert.equal(sha(readFileSync(new URL(name,root))),hash);
}
const live=read('evidence/agent-live-trial-2026-11-06/run.json'),m=live.manifest;
assert.deepEqual(inventory.candidate,Object.fromEntries(['owner','accountId','delegatePublicKeyHex','packageId','workspace','namespaces'].map(k=>[k,m[k]])));
validateExperienceRows(live.records,m.workspace);
const counted=inventory.records.filter(r=>r.candidateCounted);
assert.equal(counted.length,2);
for(const row of counted){
 const original=live.records.find(r=>r.id===row.recordId),receipt=live.receipts[row.recordId];
 assert(original&&receipt.state==='done');assert.equal(row.blobId,original.blobId);
 assert.equal(row.recordSha256,sha(canonical(original.record)));assert.equal(row.recordSha256,receipt.sha256);
 assert.equal(row.jobId,receipt.jobId);assert.equal(row.workspace,m.workspace);assert.equal(row.namespace,m.namespaces.experience);
 assert.equal(row.schema,original.record.schema);assert.equal(row.verdict,original.record.verdict);assert.equal(row.supersedes,original.record.supersedes);
}
const historical=inventory.records.filter(r=>!r.candidateCounted);
assert.equal(historical.length,4);
const model=read('evidence/activity-model-2026-11-05/run.json'),pairs=[];
for(const row of historical){
 const source=read(row.source),record=row.phase?source[row.phase].proposal.preview:source.record;
 const receipt=row.phase?source[row.phase].receipt:source.receipt;
 assert.equal(row.recordId,record.id);assert.equal(row.blobId,receipt.blobId);assert.equal(row.jobId,receipt.jobId);
 assert.equal(row.recordSha256,sha(canonical(record)));assert.equal(row.supersedes,record.supersedes);
 assert.equal(row.workspace,record.project);assert.equal(record.owner,m.owner);assert.notEqual(record.project,m.workspace);
 assert(row.exclusion.length>0);pairs.push({blobId:row.blobId,record});
}
for(const project of new Set(pairs.map(p=>p.record.project)))validateRules(pairs.filter(p=>p.record.project===project),{owner:m.owner,project});
assert.equal(model.counts.writes,2);
const old=inventory.excludedLegacyArchive;
assert.equal(old.candidateCounted,false);assert.match(old.sourceSha256,/^[a-f0-9]{64}$/);assert.equal(old.records.length,10);
const all=[...inventory.records,...old.records];
assert.equal(new Set(all.map(r=>r.blobId)).size,all.length);assert.equal(new Set(all.map(r=>r.recordId)).size,all.length);
assert.deepEqual(inventory.counts,{retainedCurrentCandidate:2,inheritedActivityExcluded:4,oldProjectionExcluded:10,candidateTarget:10,candidateOnlyGap:8});
assert.equal(inventory.freshAccountInventoryChecked,false);assert.equal(inventory.newProviderCalls,0);assert.equal(inventory.newWrites,0);
assert.equal(inventory.additionalSpendUSD,0);
console.log(JSON.stringify({status:'CANDIDATE_SCOPE_RECONCILED_OFFLINE',confirmedCandidateMemories:counted.length,
 excludedHistoricalMemories:historical.length+old.records.length,candidateOnlyGap:8,freshAccountInventoryChecked:false,providerCalls:0},null,2));
