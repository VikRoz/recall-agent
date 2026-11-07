// Finite admission for one missing fresh-chat observation, never a reset of the stopped run.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {assert,canonical,exactKeys} from '../src/domain.ts';
import {runHash,operationKey} from './agent-run.mjs';
import {validateExperienceRows} from './agent-experience.ts';
export const CONTINUATION_KIND='ordinary-single-continuation';
export const CONTINUATION_LIMITS=Object.freeze({tatumBatches:1,writes:1,reads:2,requests:64,pollsPerJob:8,
 nativeTurns:1,toolsPerTurn:12,secondsPerTurn:120,maxUSD:0});
export const isContinuation=c=>c?.plan?.kind===CONTINUATION_KIND;
export const baselineRows=b=>b.schema===2?b.origins.flatMap(o=>o.records):b.records;
export const baselineReceipts=b=>b.schema===2?Object.assign({},...b.origins.map(o=>o.receipts)):b.receipts;
export const baselineManifest=b=>b.schema===2?b.origins[0].manifest:b.manifest;
const publicPaths=['evidence/agent-live-trial-2026-11-06/run.json','evidence/ordinary-live-2026-11-07/run.json',
 'evidence/readonly-metadata-live-2026-11-07/run.json'];
export function candidateContinuationBaseline(root){
 const [a,b,m]=publicPaths.map(p=>JSON.parse(readFileSync(join(root,p),'utf8')));
 assert(m.status==='ACTUAL_READONLY_METADATA_DIAGNOSTIC_VERIFIED'&&m.result.allExpectedMetadataIdsPresent
  &&m.result.synthetic===false&&m.stdio.resultHash===runHash(m.result),'CONTINUATION_METADATA_PROOF');
 return {schema:2,kind:'exact-settled-original-bundles',origins:[
  {sourceCommit:a.sourceCommit,manifest:a.manifest,ledger:a.ledger,records:a.records,receipts:a.receipts,nativeBudget:null},
  {sourceCommit:b.sourceCommit,manifest:b.manifest,ledger:b.ledger,records:[b.newRecord],receipts:{[b.newRecord.id]:b.receipt},nativeBudget:b.nativeBudget}],
  metadata:{contextHash:m.contextHash,resultHash:m.stdio.resultHash,expectedBlobIds:m.expectedBlobIds}};
}
export function validateContinuationBaseline(b,{root,managedTest=false}={}){
 exactKeys(b,['schema','kind','origins','metadata']);
 assert(b.schema===2&&b.kind==='exact-settled-original-bundles'&&b.origins.length===2,'CONTINUATION_BASELINE');
 const first=b.origins[0].manifest,identityKeys=['owner','accountId','delegatePublicKeyHex','packageId','workspace'];
 for(let n=0;n<2;n++){
  const o=b.origins[n],s=o.ledger,m=o.manifest;
  exactKeys(o,['sourceCommit','manifest','ledger','records','receipts','nativeBudget']);
  assert(/^[a-f0-9]{40}$/.test(o.sourceCommit)&&identityKeys.every(k=>m[k]===first[k]),'CONTINUATION_IDENTITY');
  assert(s.manifestHash===runHash(m)&&s.stopped===(n===0?null:'AGENT_PROVIDER_OR_POLICY_ERROR')
   &&s.writes===(n===0?2:1)&&s.intents.length===s.writes&&s.intents.every(i=>i.state==='done')
   &&Object.keys(s.jobs).length===s.writes,'CONTINUATION_UNSETTLED_OR_STOP');
  assert(o.records.length===s.writes&&Object.keys(o.receipts).length===s.writes,'CONTINUATION_RECEIPTS');
  for(const row of o.records){
   const r=o.receipts[row.id],i=s.intents.find(i=>i.key===row.id),j=s.jobs[r?.jobId];
   assert(row.id===operationKey(row.record)&&r?.state==='done'&&r.blobId===row.blobId&&r.sha256===runHash(row.record)
    &&i?.namespace===m.namespaces.experience&&i.sha256===r.sha256&&j?.key===row.id&&j.namespace===i.namespace
    &&Number.isSafeInteger(j.polls)&&j.polls>=0&&j.polls<=8,'CONTINUATION_RECEIPTS');
  }
  if(n===0)assert(o.nativeBudget===null,'CONTINUATION_ORIGIN_NATIVE');
  else{
   const native=o.nativeBudget;
   assert(native?.stopped==='NATIVE_STOPPED'&&native.turns.length===2&&native.turns[0].status==='completed'
    &&native.turns[1].status==='stopped','CONTINUATION_ORIGIN_NATIVE');
   const row=o.records[0];assert(row.record.schema==='recall-experience/1'&&row.record.operation==='gas-payer'
    &&row.record.source===(managedTest?'fixture':'tatum')&&row.record.verdict==='fail'&&row.record.supersedes===null,'CONTINUATION_PARENT');
  }
 }
 const rows=baselineRows(b);validateExperienceRows(rows,first.workspace);
 assert(rows.length===3&&new Set(rows.map(r=>r.blobId)).size===3
  &&canonical(rows.map(r=>r.blobId).sort())===canonical(b.metadata.expectedBlobIds),'CONTINUATION_METADATA_PROOF');
 if(!managedTest)assert(root&&canonical(b)===canonical(candidateContinuationBaseline(root)),'CONTINUATION_EXACT_ORIGINS_REQUIRED');
 return b;
}
export function continuationResolution(c,record,key){
 const parent=c.baseline.origins[1].records[0];
 assert(record.schema==='recall-experience/1'&&record.verdict==='resolved'&&record.supersedes===parent.id
  &&record.source===parent.record.source&&record.network===parent.record.network&&record.workspace===parent.record.workspace
  &&record.digest===parent.record.digest&&record.observed===parent.record.observed&&record.claimed===record.observed
  &&record.sponsored===parent.record.sponsored&&key===operationKey(record),'CONTINUATION_RESOLUTION_ONLY');
}
