// Admission for the injected offline assembly only. No live credentials or initializer.
import {createHash} from 'node:crypto';
import {constants,openSync,closeSync,fstatSync,readFileSync,writeFileSync,lstatSync,mkdirSync,
 readdirSync,renameSync,fsyncSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {assert,canonical,exactKeys,time} from '../src/domain.ts';
import {address} from './activity.ts';
import {PILOT_LIMITS} from './activity-live.ts';

export const runHash=value=>createHash('sha256').update(canonical(value)).digest('hex');
export const operationKey=value=>createHash('sha256').update(canonical(value)).digest('base64url');
export function privateDirectory(path){
 const s=lstatSync(path);assert(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,'AGENT_PRIVATE_DIRECTORY');
}
export function privateRead(path){
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try {const s=fstatSync(fd);assert(s.isFile()&&s.uid===process.getuid()&&(s.mode&0o077)===0&&s.size<=32768,'AGENT_PRIVATE_FILE');return JSON.parse(readFileSync(fd,'utf8'));}
 finally {closeSync(fd);}
}
function durable(path,value,fresh=false){
 const target=fresh?path:path+'.next';const fd=openSync(target,'wx',0o600);
 try {writeFileSync(fd,canonical(value));fsyncSync(fd);}finally{closeSync(fd);}
 if(!fresh)renameSync(target,path);
 const directory=openSync(join(path,'..'),'r');try{fsyncSync(directory);}finally{closeSync(directory);}
}
export function validateAgentManifest(m){
 exactKeys(m,['schema','mode','runId','owner','accountId','delegatePublicKeyHex','packageId','workspace','datasetId','source','namespaces','maxUSD','expiresAt','admission']);
 assert(m.schema===1&&m.mode==='offline-sdk-fixture'&&m.maxUSD===0,'AGENT_OFFLINE_ONLY');
 assert(/^[a-f0-9-]{36}$/.test(m.runId)&&/^agent-[a-f0-9-]{36}$/.test(m.workspace),'AGENT_RUN_ID');
 assert([m.owner,m.accountId,m.packageId].every(v=>address(v)===v)&&/^[a-f0-9]{64}$/.test(m.delegatePublicKeyHex),'AGENT_ACCOUNT');
 assert(/^[a-f0-9]{64}$/.test(m.datasetId)&&['fixture','replay'].includes(m.source),'AGENT_DATASET');
 exactKeys(m.namespaces,['rules','experience']);
 assert(m.namespaces.rules===m.workspace+'-rules'&&m.namespaces.experience===m.workspace+'-experience','AGENT_NAMESPACES');
 exactKeys(m.admission,['kind','accountId','delegatePublicKeyHex','checkedAt','maxUSD']);
 assert(m.admission.kind==='offline-synthetic'&&m.admission.accountId===m.accountId
  &&m.admission.delegatePublicKeyHex===m.delegatePublicKeyHex&&m.admission.maxUSD===0,'AGENT_ADMISSION');
 time(m.expiresAt);time(m.admission.checkedAt);return m;
}
export function createAgentRun(directory,manifest){
 privateDirectory(directory);assert(readdirSync(directory).length===0,'AGENT_NEW_RUN_MUST_BE_EMPTY');
 validateAgentManifest(manifest);
 durable(join(directory,'agent-run.json'),manifest,true);
 for(const kind of ['rules','experience']){const p=join(directory,'journal-'+kind);mkdirSync(p,{mode:0o700});mkdirSync(join(p,'activity-jobs'),{mode:0o700});}
 durable(join(directory,'agent-ledger.json'),{schema:1,manifestHash:runHash(manifest),stopped:null,
  tatumBatches:0,writes:0,reads:0,requests:0,intents:[],jobs:{}},true);
}
export class AgentRunGate {
 constructor(directory){
  privateDirectory(directory);this.directory=directory;this.path=join(directory,'agent-ledger.json');
  this.manifest=validateAgentManifest(privateRead(join(directory,'agent-run.json')));
  this.hash=runHash(this.manifest);this.lease=undefined;this.pending=undefined;
  for(const kind of ['rules','experience']){privateDirectory(join(directory,'journal-'+kind));privateDirectory(join(directory,'journal-'+kind,'activity-jobs'));}
  assert(!existsSync(join(directory,'.agent-writer-lock'))&&!existsSync(this.path+'.next'),'AGENT_OUTCOME_UNCERTAIN');
  const state=this.state();assert(state.stopped===null,'AGENT_RUN_STOPPED');
  assert(state.intents.every(i=>i.state==='done'),'AGENT_OUTCOME_UNCERTAIN');this.admit();
 }
 state(){
  assert(runHash(privateRead(join(this.directory,'agent-run.json')))===this.hash,'AGENT_MANIFEST_CHANGED');
  const s=privateRead(this.path);
  exactKeys(s,['schema','manifestHash','stopped','tatumBatches','writes','reads','requests','intents','jobs']);
  assert(s.schema===1&&s.manifestHash===this.hash&&(s.stopped===null||/^[A-Z0-9_]+$/.test(s.stopped)),'AGENT_LEDGER_BINDING');
  for(const k of ['tatumBatches','writes','reads','requests'])assert(Number.isSafeInteger(s[k])&&s[k]>=0&&s[k]<=PILOT_LIMITS[k],'AGENT_LEDGER_COUNTER');
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
    &&Number.isSafeInteger(j.polls)&&j.polls>=0&&j.polls<=PILOT_LIMITS.pollsPerJob,'AGENT_LEDGER_JOB');
  }
  return s;
 }
 admit(){
  const m=this.manifest,now=Date.now(),age=now-time(m.admission.checkedAt);
  assert(time(m.expiresAt)>now&&time(m.expiresAt)<=now+86400000,'AGENT_RUN_EXPIRED');
  assert(age>=0&&age<=300000,'AGENT_ADMISSION_EXPIRED');
  assert(this.state().stopped===null,'AGENT_RUN_STOPPED');
 }
 update(fn,stopping=false){
  const lock=join(this.directory,'.agent-ledger-lock');mkdirSync(lock,{mode:0o700});
  try {const s=this.state();if(!stopping)this.admit();fn(s);durable(this.path,s);return s;}
  finally{rmSync(lock,{recursive:true});}
 }
 stop(code){this.update(s=>{s.stopped??=/^[A-Z0-9_]+$/.test(code)?code:'AGENT_PROVIDER_ERROR';},true);}
 reserve(kind){
  assert(['tatumBatches','reads','requests'].includes(kind),'AGENT_COUNTER_KIND');
  const s=this.update(s=>{if(s[kind]>=PILOT_LIMITS[kind])s.stopped='LIMIT_'+kind.toUpperCase();else s[kind]++;});
  assert(s.stopped===null,'AGENT_LIMIT');
 }
 ensureWriteAvailable(){
  this.admit();if(this.state().writes>=PILOT_LIMITS.writes){this.stop('LIMIT_WRITES');assert(false,'AGENT_LIMIT');}
 }
 request(kind,job){
  const s=this.update(s=>{
   if(s.requests>=PILOT_LIMITS.requests){s.stopped='LIMIT_REQUESTS';return;}
   if(kind==='reads'&&s.reads>=PILOT_LIMITS.reads){s.stopped='LIMIT_READS';return;}
   if(job){assert(Object.hasOwn(s.jobs,job),'AGENT_UNKNOWN_JOB');if(s.jobs[job].polls>=PILOT_LIMITS.pollsPerJob){s.stopped='POLL_LIMIT';return;}}
   s.requests++;if(kind==='reads')s.reads++;if(job)s.jobs[job].polls++;
  });assert(s.stopped===null,'AGENT_LIMIT');
 }
 async withWriter(namespace,fn){
  const lock=join(this.directory,'.agent-writer-lock');mkdirSync(lock,{mode:0o700});
  this.lease=namespace;
  try{this.admit();return await fn();}
  catch(error){this.stop('AGENT_WRITE_STOPPED');throw error;}
  finally{
   if(this.pending&&this.state().intents.some(i=>i.namespace===this.pending.namespace&&i.key===this.pending.key&&i.state!=='done'))this.stop('AGENT_WRITE_UNCERTAIN');
   this.pending=undefined;this.lease=undefined;rmSync(lock,{recursive:true});
  }
 }
 beforeSubmit(namespace,record,key){
  assert(this.lease===namespace&&!this.pending&&operationKey(record)===key,'AGENT_WRITE_LEASE');
  const intent={namespace,key,sha256:runHash(record),state:'reserved'};
  const s=this.update(s=>{
   assert(!s.intents.some(i=>i.namespace===namespace&&i.key===key),'AGENT_OPERATION_ALREADY_RESERVED');
   if(s.requests>=PILOT_LIMITS.requests){s.stopped='LIMIT_REQUESTS';return;}
   if(s.writes>=PILOT_LIMITS.writes){s.stopped='LIMIT_WRITES';return;}s.writes++;s.intents.push(intent);
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
