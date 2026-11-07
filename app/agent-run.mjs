// Shared durable ledger. Live admission is explicit and separate from the offline initializer.
import {createHash} from 'node:crypto';
import {constants,openSync,closeSync,fstatSync,readFileSync,writeFileSync,lstatSync,mkdirSync,
 readdirSync,renameSync,fsyncSync,rmSync,existsSync} from 'node:fs';
import {join,basename} from 'node:path';
import {assert,canonical,exactKeys,time} from '../src/domain.ts';
import {address} from './activity.ts';
import {PILOT_LIMITS} from './activity-live.ts';
import {recordFirstFailure} from './agent-diagnostic.mjs';
import {CONTINUATION_KIND,CONTINUATION_LIMITS,continuationResolution} from './agent-continuation-contract.mjs';
import {ownMode,validateOwnManifest,validateOwnContext,OWN_LIMITS} from './agent-own-contract.mjs';
import {validateRetained} from './agent-own-lineage.mjs';
import {saveSubmissionProof} from './agent-submission-proof.mjs';

export const runHash=value=>createHash('sha256').update(canonical(value)).digest('hex');
export const operationKey=value=>createHash('sha256').update(canonical(value)).digest('base64url');
export function privateDirectory(path){
 const s=lstatSync(path);assert(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,'AGENT_PRIVATE_DIRECTORY');
}
export function privateRead(path,maxBytes=32768){
 assert(maxBytes===32768||(maxBytes===65536&&['own-account-context.json','rehearsal-context.json'].includes(basename(path))),'AGENT_PRIVATE_READ_SCOPE');
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try {const s=fstatSync(fd);assert(s.isFile()&&s.uid===process.getuid()&&(s.mode&0o077)===0&&s.size<=maxBytes,'AGENT_PRIVATE_FILE');return JSON.parse(readFileSync(fd,'utf8'));}
 finally {closeSync(fd);}
}
function durable(path,value,fresh=false){
 const target=fresh?path:path+'.next';const fd=openSync(target,'wx',0o600);
 try {writeFileSync(fd,canonical(value));fsyncSync(fd);}finally{closeSync(fd);}
 if(!fresh)renameSync(target,path);
 const directory=openSync(join(path,'..'),'r');try{fsyncSync(directory);}finally{closeSync(directory);}
}
export function validateAgentManifest(m,{live=false,ordinary=false,managedTest=false,ownAccount=false}={}){
 if(ownAccount){assert(ordinary&&!managedTest,'OWN_ADMISSION');return validateOwnManifest(m,{live});}
 exactKeys(m,['schema','mode','runId','owner','accountId','delegatePublicKeyHex','packageId','workspace','datasetId','source','namespaces','maxUSD','expiresAt','admission']);
 assert(!managedTest||(live&&ordinary),'AGENT_MANAGED_TEST_SCOPE');
 const ordinaryManaged=ordinary&&live;
 const expectedMode=ordinary?(live?(managedTest?'offline-managed-admission-test':'live-ordinary-selected'):'offline-ordinary-provider-fixture'):live?'live-walrus-replay':'offline-sdk-fixture';
 assert(m.schema===1&&m.mode===expectedMode&&m.maxUSD===0,'AGENT_OFFLINE_ONLY');
 assert(/^[a-f0-9-]{36}$/.test(m.runId)&&/^agent-[a-f0-9-]{36}$/.test(m.workspace),'AGENT_RUN_ID');
 assert([m.owner,m.accountId,m.packageId].every(v=>address(v)===v)&&/^[a-f0-9]{64}$/.test(m.delegatePublicKeyHex),'AGENT_ACCOUNT');
 assert(/^[a-f0-9]{64}$/.test(m.datasetId)&&(ordinary?m.source===(live&&!managedTest?'tatum':'fixture'):['fixture','replay'].includes(m.source)),'AGENT_DATASET');
 exactKeys(m.namespaces,['rules','experience']);
 assert(m.namespaces.rules===m.workspace+'-rules'&&m.namespaces.experience===m.workspace+'-experience','AGENT_NAMESPACES');
 exactKeys(m.admission,['kind','accountId','delegatePublicKeyHex','checkedAt','maxUSD',...(live&&!ordinary?['planHash','payloadHash','failureId','profileHash','deploymentHash']:[]),...(ordinary?['workspaceHash','policyHash']:[]),...(ordinaryManaged?['profileHash','deploymentHash','contextHash']:[])]);
 assert(m.admission.kind===(managedTest?'managed-boundary-test':live?'managed-production-approved':'offline-synthetic')&&m.admission.accountId===m.accountId
  &&m.admission.delegatePublicKeyHex===m.delegatePublicKeyHex&&m.admission.maxUSD===0,'AGENT_ADMISSION');
 if(live&&!ordinary)assert(m.source==='replay'&&['planHash','payloadHash','profileHash','deploymentHash'].every(k=>/^[a-f0-9]{64}$/.test(m.admission[k]))
  &&/^[A-Za-z0-9_-]{43}$/.test(m.admission.failureId),'AGENT_LIVE_ADMISSION');
 if(ordinary)assert([m.admission.workspaceHash,m.admission.policyHash].every(x=>/^[a-f0-9]{64}$/.test(x)),'AGENT_WORKSPACE_BINDING');
 if(ordinaryManaged)assert(['profileHash','deploymentHash','contextHash'].every(k=>/^[a-f0-9]{64}$/.test(m.admission[k])),'AGENT_MANAGED_BINDING');
 time(m.expiresAt);time(m.admission.checkedAt);return m;
}
export function createAgentRun(directory,manifest,options={}){
 privateDirectory(directory);assert(readdirSync(directory).length===0,'AGENT_NEW_RUN_MUST_BE_EMPTY');
 validateAgentManifest(manifest,options);
 durable(join(directory,'agent-run.json'),manifest,true);
 for(const kind of ['rules','experience']){
  const p=join(options.ordinary?options.workspaceDirectory:directory,'journal-'+kind);
  if(options.ordinary){privateDirectory(p);privateDirectory(join(p,'activity-jobs'));}
  else{mkdirSync(p,{mode:0o700});mkdirSync(join(p,'activity-jobs'),{mode:0o700});}
 }
 durable(join(directory,'agent-ledger.json'),{schema:1,manifestHash:runHash(manifest),stopped:null,
  tatumBatches:0,writes:0,reads:0,requests:0,intents:[],jobs:{}},true);
}
export class AgentRunGate {
 constructor(directory,options={}){
  privateDirectory(directory);this.directory=directory;this.path=join(directory,'agent-ledger.json');
  this.manifest=validateAgentManifest(privateRead(join(directory,'agent-run.json')),options);
  this.hash=runHash(this.manifest);this.lease=undefined;this.pending=undefined;this.readonly=options.readonly===true;
  this.ownAccount=options.ownAccount===true;
  this.ordinary=options.ordinary?{directory:options.workspaceDirectory,token:options.leaseToken,approvalHash:options.approvalHash}:undefined;
  if(this.ordinary)assert(typeof this.ordinary.directory==='string'&&typeof this.ordinary.token==='string'
   &&/^[a-f0-9]{64}$/.test(this.ordinary.approvalHash),'AGENT_WORKSPACE_LEASE_REQUIRED');
  for(const kind of ['rules','experience']){privateDirectory(join(this.ordinary?.directory??directory,'journal-'+kind));privateDirectory(join(this.ordinary?.directory??directory,'journal-'+kind,'activity-jobs'));}
  assert(!existsSync(join(directory,'.agent-writer-lock'))&&!existsSync(this.path+'.next'),'AGENT_OUTCOME_UNCERTAIN');
  const state=this.state();assert(state.stopped===null,'AGENT_RUN_STOPPED');
  assert(state.intents.every(i=>i.state==='done'),'AGENT_OUTCOME_UNCERTAIN');this.admit();
 }
 context(){
  if(this.ownAccount){const c=validateOwnContext(privateRead(join(this.ordinary.directory,'own-account-context.json'),65536));
   assert(runHash(c)===this.manifest.admission.contextHash,'OWN_CONTEXT_CHANGED');validateRetained(c.retained,c.identity,{fixture:c.kind==='offline-own-account-test'});return c;}
  if(!this.ordinary||!['live-ordinary-selected','offline-managed-admission-test'].includes(this.manifest.mode))return null;
  const c=privateRead(join(this.ordinary.directory,'managed-context.json'));
  assert(runHash(c)===this.manifest.admission.contextHash,'MANAGED_CONTEXT_CHANGED');return c;
 }
 limits(){if(this.ownAccount){const c=this.context();return c.writePolicy?{...OWN_LIMITS,writes:c.writePolicy.maxNewWrites}:OWN_LIMITS;}return this.context()?.plan.kind===CONTINUATION_KIND?CONTINUATION_LIMITS:PILOT_LIMITS;}
 state(){
  assert(runHash(privateRead(join(this.directory,'agent-run.json')))===this.hash,'AGENT_MANIFEST_CHANGED');
  const s=privateRead(this.path);
  exactKeys(s,['schema','manifestHash','stopped','tatumBatches','writes','reads','requests','intents','jobs']);
  assert(s.schema===1&&s.manifestHash===this.hash&&(s.stopped===null||/^[A-Z0-9_]+$/.test(s.stopped)),'AGENT_LEDGER_BINDING');
  for(const k of ['tatumBatches','writes','reads','requests'])assert(Number.isSafeInteger(s[k])&&s[k]>=0&&s[k]<=this.limits()[k],'AGENT_LEDGER_COUNTER');
  assert(Array.isArray(s.intents)&&s.intents.length===s.writes,'AGENT_LEDGER_INTENTS');
  const keys=new Set();
  for(const i of s.intents){
   exactKeys(i,['namespace','key','sha256','state']);
   assert(Object.values(this.manifest.namespaces).includes(i.namespace)&&/^[A-Za-z0-9_-]{43}$/.test(i.key)
    &&/^[a-f0-9]{64}$/.test(i.sha256)&&['reserved','sent','done'].includes(i.state),'AGENT_LEDGER_INTENT');
   assert(!keys.has(i.namespace+':'+i.key),'AGENT_LEDGER_INTENT');keys.add(i.namespace+':'+i.key);
  }
  assert(s.jobs&&typeof s.jobs==='object'&&!Array.isArray(s.jobs)&&Object.keys(s.jobs).length<=s.writes,'AGENT_LEDGER_JOBS');
  for(const [id,j] of Object.entries(s.jobs)){
   exactKeys(j,['namespace','key','polls']);
   assert(/^[A-Za-z0-9_-]{1,100}$/.test(id)&&keys.has(j.namespace+':'+j.key)
     &&Number.isSafeInteger(j.polls)&&j.polls>=0&&j.polls<=this.limits().pollsPerJob,'AGENT_LEDGER_JOB');
  }
  return s;
 }
 admit(){
  try{
  if(this.ordinary){
   const directory=this.ordinary.directory;privateDirectory(directory);privateDirectory(join(directory,'.ordinary-runtime'));
   const binding=privateRead(join(directory,'ordinary-workspace.json')),active=privateRead(join(directory,'active-run.json'));
   const lease=privateRead(join(directory,'.ordinary-runtime','lease.json'));
   assert(runHash(binding)===this.manifest.admission.workspaceHash&&binding.identity.workspace===this.manifest.workspace
    &&active.manifestHash===this.hash&&active.runId===this.manifest.runId
    &&lease.manifestHash===this.hash&&lease.token===this.ordinary.token&&lease.pid===process.pid
    &&runHash(privateRead(join(this.directory,'ordinary-approval.json')))===this.ordinary.approvalHash,'AGENT_WORKSPACE_LEASE_REQUIRED');
   if(['live-ordinary-selected','offline-managed-admission-test'].includes(this.manifest.mode))
    assert(runHash(privateRead(join(directory,'managed-context.json')))===this.manifest.admission.contextHash,'MANAGED_CONTEXT_CHANGED');
   if(this.ownAccount)this.context();
  }
  const m=this.manifest,now=Date.now(),age=now-time(m.admission.checkedAt);
  assert(time(m.expiresAt)>now&&time(m.expiresAt)<=now+86400000,'AGENT_RUN_EXPIRED');
  assert(age>=0&&age<=300000,'AGENT_ADMISSION_EXPIRED');
  assert(this.state().stopped===null,'AGENT_RUN_STOPPED');
  }catch(error){recordFirstFailure(this,{phase:'admission',category:'admission',error});throw error;}
 }
 update(fn,stopping=false){
  const lock=join(this.directory,'.agent-ledger-lock');mkdirSync(lock,{mode:0o700});
  try {const s=this.state();if(!stopping)this.admit();fn(s);durable(this.path,s);return s;}
  finally{rmSync(lock,{recursive:true});}
 }
 stop(code){this.update(s=>{s.stopped??=/^[A-Z0-9_]+$/.test(code)?code:'AGENT_PROVIDER_ERROR';},true);}
 reserve(kind){
  assert(['tatumBatches','reads','requests'].includes(kind),'AGENT_COUNTER_KIND');
  assert(!this.readonly||kind!=='tatumBatches','CONTINUATION_READER_READONLY');
  const s=this.update(s=>{if(s[kind]>=this.limits()[kind])s.stopped='LIMIT_'+kind.toUpperCase();else s[kind]++;});
  assert(s.stopped===null,'AGENT_LIMIT');
 }
 ensureWriteAvailable(){
  this.admit();assert(!this.readonly,'CONTINUATION_READER_READONLY');if(this.state().writes>=this.limits().writes){this.stop('LIMIT_WRITES');assert(false,'AGENT_LIMIT');}
 }
 request(kind,job){
  const s=this.update(s=>{
   if(s.requests>=this.limits().requests){s.stopped='LIMIT_REQUESTS';return;}
   if(kind==='reads'&&s.reads>=this.limits().reads){s.stopped='LIMIT_READS';return;}
   if(job){assert(Object.hasOwn(s.jobs,job),'AGENT_UNKNOWN_JOB');if(s.jobs[job].polls>=this.limits().pollsPerJob){s.stopped='POLL_LIMIT';return;}}
   s.requests++;if(kind==='reads')s.reads++;if(job)s.jobs[job].polls++;
  });assert(s.stopped===null,'AGENT_LIMIT');
 }
 async withWriter(namespace,fn){
  assert(!this.readonly,'CONTINUATION_READER_READONLY');
  const lock=join(this.directory,'.agent-writer-lock');mkdirSync(lock,{mode:0o700});
  this.lease=namespace;
  try{this.admit();return await fn();}
  catch(error){this.stop('AGENT_WRITE_STOPPED');throw error;}
  finally{
   if(this.pending&&this.state().intents.some(i=>i.namespace===this.pending.namespace&&i.key===this.pending.key&&i.state!=='done'))this.stop('AGENT_WRITE_UNCERTAIN');
   this.pending=undefined;this.lease=undefined;rmSync(lock,{recursive:true});
  }
 }
 checkWriteScope(namespace,record){
  if(!this.ownAccount)return;
  const c=this.context();assert(c.captureConsent,'OWN_CAPTURE_DISABLED');
  assert(c.captureScope!=='transaction-facts-only'||(namespace===this.manifest.namespaces.experience&&record.schema==='recall-transaction-fact/1'),'OWN_CAPTURE_SCOPE');
  if(c.captureSet)assert(namespace===this.manifest.namespaces.experience&&record.schema==='recall-transaction-fact/1'
   &&record.network==='mainnet'&&c.captureSet.includes(record.digest),'OWN_CAPTURE_SET_SCOPE');
  if(c.writePolicy){assert(namespace===this.manifest.namespaces.experience&&record.schema==='recall-transaction-fact/1'
    &&c.writePolicy.digests.includes(record.digest),'OWN_MISSING_FACT_SCOPE');
   const state=this.state();assert(state.writes<c.writePolicy.maxNewWrites||state.intents.some(i=>i.key===operationKey(record)&&i.sha256===runHash(record)&&i.state==='done'),'OWN_NEW_WRITE_LIMIT');}
 }
 submissionProof(namespace,record,key){if(this.ownAccount&&this.context().writePolicy){this.checkWriteScope(namespace,record);return saveSubmissionProof(this.directory,record,key);}}
 beforeSubmit(namespace,record,key){
  assert(!this.readonly,'CONTINUATION_READER_READONLY');
  assert(this.lease===namespace&&!this.pending&&operationKey(record)===key,'AGENT_WRITE_LEASE');
  const continuation=this.context();if(continuation?.plan?.kind===CONTINUATION_KIND)continuationResolution(continuation,record,key);
  if(this.ownAccount){
   this.checkWriteScope(namespace,record);
   const p=privateRead(join(this.ordinary.directory,'ordinary-preflight.json'));
   assert(p.contextHash===this.manifest.admission.contextHash&&p.manifestHash===this.hash&&p.accountAuthorized===true
    &&Date.now()-time(p.checkedAt)>=0&&Date.now()-time(p.checkedAt)<=300000,'OWN_PREFLIGHT_REQUIRED');
   this.submissionProof(namespace,record,key);
  }
  if(this.manifest.mode==='live-walrus-replay'){
   const proof=privateRead(join(this.directory,'agent-live-preflight.json'));
   assert(proof.manifestHash===this.hash&&proof.emptyNamespaces===true&&proof.accountAuthorized===true
    &&Date.now()-time(proof.checkedAt)>=0&&Date.now()-time(proof.checkedAt)<=300000,'AGENT_LIVE_PREFLIGHT_REQUIRED');
   assert(namespace===this.manifest.namespaces.experience,'AGENT_LIVE_WRITE_SCOPE');
   const state=this.state();
   assert(state.writes===0?record.verdict==='fail'&&key===this.manifest.admission.failureId
    :state.writes===1&&record.verdict==='resolved'&&record.supersedes===this.manifest.admission.failureId
      &&privateRead(join(this.directory,'agent-native-turn.json')).manifestHash===this.hash,'AGENT_LIVE_WRITE_SCOPE');
  }
  if(['live-ordinary-selected','offline-managed-admission-test'].includes(this.manifest.mode)){
   const p=privateRead(join(this.ordinary.directory,'ordinary-preflight.json'));
   assert(p.contextHash===this.manifest.admission.contextHash&&p.manifestHash===this.hash&&p.accountAuthorized===true
    &&Date.now()-time(p.checkedAt)>=0&&Date.now()-time(p.checkedAt)<=300000,'ORDINARY_MANAGED_PREFLIGHT_REQUIRED');
   assert(namespace===this.manifest.namespaces.experience&&record.schema==='recall-experience/1'
    &&record.operation==='gas-payer'&&record.source===this.manifest.source,'ORDINARY_MANAGED_WRITE_SCOPE');
  }
  const intent={namespace,key,sha256:runHash(record),state:'reserved'};
  const s=this.update(s=>{
   assert(!s.intents.some(i=>i.namespace===namespace&&i.key===key),'AGENT_OPERATION_ALREADY_RESERVED');
   if(s.requests>=this.limits().requests){s.stopped='LIMIT_REQUESTS';return;}
   if(s.writes>=this.limits().writes){s.stopped='LIMIT_WRITES';return;}s.writes++;s.intents.push(intent);
  });assert(s.stopped===null,'AGENT_LIMIT');this.pending={...intent};
 }
 sent(namespace,key,record){
  assert(this.lease===namespace&&this.pending?.key===key&&this.pending.sha256===runHash(record),'AGENT_UNRESERVED_WRITE');
  this.update(s=>{const i=s.intents.find(i=>i.namespace===namespace&&i.key===key);assert(i?.state==='reserved','AGENT_DUPLICATE_SEND');i.state='sent';});
 }
 job(id){
  assert(/^[A-Za-z0-9_-]{1,100}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id)&&this.pending,'AGENT_JOB_ACK');
  this.update(s=>{assert(!Object.hasOwn(s.jobs,id),'AGENT_JOB_ACK');s.jobs[id]={namespace:this.pending.namespace,key:this.pending.key,polls:0};});
 }
 complete(namespace,key,receipt){
  this.update(s=>{const i=s.intents.find(i=>i.namespace===namespace&&i.key===key),j=s.jobs[receipt.jobId];
   assert(i?.state==='sent'&&j?.key===key&&j?.namespace===namespace,'AGENT_RECEIPT_BINDING');i.state='done';});this.pending=undefined;
 }
 hooks(namespace){return {namespace,beforeSubmit:async(record,key)=>this.beforeSubmit(namespace,record,key),afterReceipt:async(key,receipt)=>this.complete(namespace,key,receipt)};}
}
