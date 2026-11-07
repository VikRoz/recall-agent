// Distinct managed admission. Offline tests must supply every port and an explicit test context.
import {createHash} from 'node:crypto';
import {constants,existsSync,lstatSync,openSync,fstatSync,closeSync,writeFileSync,fsyncSync,renameSync,mkdirSync,rmSync,readFileSync,realpathSync,unlinkSync,readdirSync} from 'node:fs';
import {dirname,join,resolve,isAbsolute} from 'node:path';
import {MemWal} from '@mysten-incubation/memwal';
import {assert,canonical,exactKeys,time} from '../src/domain.ts';
import {profile} from './walrus.mjs';
import {readTatumKey} from './activity-key.ts';
import {connectTatum} from './tatum.ts';
import {validateTatumBinding,PILOT_LIMITS} from './activity-live.ts';
import {privateRead,privateDirectory,runHash,operationKey} from './agent-run.mjs';
import {createOrdinaryWorkspace,createOrdinaryRun,ordinaryBinding,ordinaryAuthorization,openInjectedOrdinary} from './agent-ordinary.mjs';
import {profileIdentity} from './agent-live.mjs';
import {validateExperienceRows} from './agent-experience.ts';
import {deploymentHash,WALRUS_RELAY} from './agent-walrus-guard.mjs';
const platformFetch=globalThis.fetch.bind(globalThis);
export const MANAGED_LIMITS=Object.freeze({...PILOT_LIMITS,nativeTurns:2,toolsPerTurn:12,secondsPerTurn:120,maxUSD:0});
export const bytesHash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
export function managedFile(path,value,fresh=true){
 const target=fresh?path:path+'.next',fd=openSync(target,'wx',0o600);
 try{writeFileSync(fd,canonical(value));fsyncSync(fd);}finally{closeSync(fd);}
 if(!fresh)renameSync(target,path);
 const dir=openSync(dirname(path),'r');try{fsyncSync(dir);}finally{closeSync(dir);}
}
function fingerprint(path,directory=false){
 const s=lstatSync(path);assert(!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0
  &&(directory?s.isDirectory():s.isFile()),'MANAGED_PRIVATE_PATH');
 return {dev:s.dev,ino:s.ino,birthtimeMs:s.birthtimeMs};
}
export function managedRuntimeHashes(root){
 const names=[];
 for(const base of ['app','src'])for(const name of readdirSync(join(root,base))){
  if(/\.(mjs|ts|json)$/.test(name)&&!name.includes('.test.')&&!name.startsWith('check-'))names.push(base+'/'+name);
 }
 names.push('start.command','mcp/package.json','mcp/package-lock.json');
 return Object.fromEntries(names.sort().map(n=>[n,bytesHash(join(root,n))]));
}
export function createManagedPlan(root){
 const path=join(root,'evidence/candidate-evaluation-2026-11-07/plan.json'),e=JSON.parse(readFileSync(path,'utf8'));
 return {schema:1,kind:'ordinary-selected-live-evaluation',network:'mainnet',model:'gpt-5.6-luna',limits:MANAGED_LIMITS,
  noRetry:true,noPromptTuning:true,claimOrigin:'user-supplied-hypothesis',tasks:e.nativeTasks,publicInputs:e.publicInputs,
  evaluationHash:bytesHash(path),runtimeHashes:managedRuntimeHashes(root)};
}
export function verifyFrozenPlan(plan,root){
 assert(plan.schema===1&&plan.kind==='ordinary-selected-live-evaluation'&&plan.network==='mainnet'
  &&plan.model==='gpt-5.6-luna'&&canonical(plan.limits)===canonical(MANAGED_LIMITS)
  &&plan.tasks.length===2&&new Set(plan.tasks.map(t=>t.chat)).size===2
  &&plan.tasks.every(t=>typeof t.id==='string'&&typeof t.text==='string'&&t.text.length<=1600),'MANAGED_PLAN');
 assert(plan.noRetry===true&&plan.noPromptTuning===true&&plan.claimOrigin==='user-supplied-hypothesis','MANAGED_PLAN');
 const evaluationPath=join(root,'evidence/candidate-evaluation-2026-11-07/plan.json'),evaluation=JSON.parse(readFileSync(evaluationPath,'utf8'));
 assert(plan.evaluationHash===bytesHash(evaluationPath)&&canonical(plan.tasks)===canonical(evaluation.nativeTasks)&&canonical(plan.publicInputs)===canonical(evaluation.publicInputs),'MANAGED_FROZEN_TASKS');
 assert(Object.keys(plan.runtimeHashes).length>10&&canonical(managedRuntimeHashes(root))===canonical(plan.runtimeHashes),'MANAGED_SOURCE_CHANGED');
 for(const [name,hash] of Object.entries(plan.runtimeHashes)){
  assert(!name.includes('..')&&!isAbsolute(name)&&/^[a-f0-9]{64}$/.test(hash),'MANAGED_SOURCE_FREEZE');
  assert(bytesHash(join(root,name))===hash,'MANAGED_SOURCE_CHANGED');
 }
 return plan;
}
export function checkBaseline(baseline){
 assert(baseline.schema===1&&baseline.manifest&&baseline.ledger&&baseline.receipts&&baseline.records,'MANAGED_BASELINE');
 const {manifest:m,ledger:s,receipts,records}=baseline;
 assert(s.manifestHash===runHash(m)&&s.stopped===null&&s.intents.length===s.writes
  &&s.intents.every(i=>i.state==='done'),'MANAGED_PRIOR_UNCERTAIN');
 validateExperienceRows(records,m.workspace);
 assert(records.length===s.writes&&Object.keys(receipts).length===records.length,'MANAGED_BASELINE');
 for(const row of records){const r=receipts[row.id],intent=s.intents.find(i=>i.key===row.id);
  assert(row.id===operationKey(row.record)&&r?.state==='done'&&r.blobId===row.blobId&&r.sha256===runHash(row.record)
   &&intent?.sha256===r.sha256&&intent.namespace===m.namespaces.experience
   &&s.jobs[r.jobId]?.key===row.id&&s.jobs[r.jobId]?.namespace===intent.namespace,'MANAGED_BASELINE_RECEIPT');
 }
 return baseline;
}
// Called with public metadata only. Does not open profile, key, model or provider.
export function prepareManaged(directory,{plan,root,identity,config,profileRoot,keyFile,priorRoot,baseline,managedTest=false}){
 verifyFrozenPlan(plan,root);checkBaseline(baseline);
 assert(isAbsolute(profileRoot)&&isAbsolute(keyFile)&&isAbsolute(priorRoot)&&basenameKey(keyFile),'MANAGED_PATH');
 const keyDirectory=dirname(keyFile);privateDirectory(keyDirectory);
 assert(realpathSync(keyDirectory)===keyDirectory&&!existsSync(keyFile),'MANAGED_KEY_MUST_BE_ABSENT');
 const old=baseline.manifest;
 assert(canonical(identity)===canonical(Object.fromEntries(['owner','accountId','delegatePublicKeyHex','packageId','workspace'].map(k=>[k,old[k]])))
  &&config.packageId===identity.packageId&&config.network==='mainnet'&&config.suiTransport==='grpc','MANAGED_BASELINE_IDENTITY');
 const options={live:true,managedTest};createOrdinaryWorkspace(directory,identity,options);
 for(const row of baseline.records)managedFile(join(directory,'journal-experience','activity-jobs',row.id+'.json'),baseline.receipts[row.id]);
 const context={schema:1,kind:managedTest?'offline-managed-boundary-test':'prepared-not-authorized',root:realpathSync(root),
  plan,identity,config,profileRoot,keyFile,keyDirectoryIdentity:fingerprint(keyDirectory,true),priorRoot,baseline};
 managedFile(join(directory,'managed-context.json'),context);
 managedFile(join(directory,'native-budget.json'),{schema:1,contextHash:runHash(context),model:plan.model,turns:[],stopped:null});
 return {contextHash:runHash(context),planHash:runHash(plan),authorized:false};
}
function basenameKey(path){return path===join(dirname(path),'tatum.key');}
export function managedContext(directory,{managedTest=false}={}){
 privateDirectory(directory);const c=privateRead(join(directory,'managed-context.json'));
 exactKeys(c,['schema','kind','root','plan','identity','config','profileRoot','keyFile','keyDirectoryIdentity','priorRoot','baseline']);
 assert(c.schema===1&&c.kind===(managedTest?'offline-managed-boundary-test':'prepared-not-authorized'),'MANAGED_CONTEXT_SCOPE');
 verifyFrozenPlan(c.plan,c.root);checkBaseline(c.baseline);
 const b=ordinaryBinding(directory,{live:true,managedTest});assert(canonical(b.identity)===canonical(c.identity),'MANAGED_IDENTITY');
 assert(basenameKey(c.keyFile)&&canonical(fingerprint(dirname(c.keyFile),true))===canonical(c.keyDirectoryIdentity),'MANAGED_KEY_DIRECTORY_CHANGED');
 return c;
}
function priorUnchanged(c){
 const dir=c.priorRoot;privateDirectory(dir);
 assert(runHash(privateRead(join(dir,'agent-run.json')))===runHash(c.baseline.manifest)
  &&runHash(privateRead(join(dir,'agent-ledger.json')))===runHash(c.baseline.ledger)
  &&!['.agent-writer-lock','.agent-ledger-lock','agent-ledger.json.next'].some(n=>existsSync(join(dir,n))),'MANAGED_PRIOR_CHANGED');
 for(const row of c.baseline.records)assert(runHash(privateRead(join(dir,'journal-experience','activity-jobs',row.id+'.json')))===runHash(c.baseline.receipts[row.id]),'MANAGED_PRIOR_CHANGED');
}
// Grant is created only following action-time human consent; no automatic approval/timestamp refresh.
export function managedGrant(directory,options={}){
 const c=managedContext(directory,options),g=privateRead(join(directory,'managed-grant.json'));
 exactKeys(g,['schema','kind','contextHash','planHash','checkedAt','captureConsent','sponsored','tatum']);
 const age=Date.now()-time(g.checkedAt);
 assert(g.schema===1&&g.kind===(options.managedTest?'offline-test-only':'human-approved-bounded-live')
  &&g.contextHash===runHash(c)&&g.planHash===runHash(c.plan)&&g.captureConsent===true&&g.sponsored===true
  &&age>=0&&age<=300000,'MANAGED_EXPLICIT_FRESH_GRANT_REQUIRED');
 assert(g.tatum?.plan==='FREE'&&Number.isSafeInteger(g.tatum.remainingCredits)&&g.tatum.remainingCredits>=4
  &&g.tatum.creditsPerCall===2&&/^[a-f0-9]{24}$/.test(g.tatum.accountId)&&/^[a-f0-9]{64}$/.test(g.tatum.keySha256),'MANAGED_FREE_REQUIRED');
 priorUnchanged(c);return {context:c,grant:g};
}
function secrets(c,g,ports){
 let p,key;
 try{
  p=ports.readProfile(c.profileRoot);
  assert(runHash(profileIdentity(p))===runHash(Object.fromEntries(['owner','accountId','delegatePublicKeyHex','packageId'].map(k=>[k,c.identity[k]]))),'MANAGED_PROFILE_CHANGED');
  key=ports.readKey(c.keyFile,g.tatum.accountId);
  // validate provider allowance before constructing any SDK/native channel
  assert(g.tatum.plan==='FREE'&&Number.isSafeInteger(g.tatum.remainingCredits)&&g.tatum.remainingCredits>=4
   &&g.tatum.creditsPerCall===2&&/^[a-f0-9]{24}$/.test(g.tatum.accountId),'MANAGED_FREE_REQUIRED');
  validateTatumBinding({tatum:g.tatum},key);
  return {p,key};
 }catch(e){if(p)p.delegatePrivateKey='';throw e;}
}
const realPorts=directory=>({readProfile:profile,readKey:readTatumKey,createSdk:(p,m)=>MemWal.create({key:p.delegatePrivateKey,
 accountId:m.accountId,namespace:m.namespaces.rules,serverUrl:WALRUS_RELAY,requestTimeoutMs:15000,recallTimeoutMs:45000,preflightTimeoutMs:8000}),
 createData:({key})=>connectTatum({TATUM_API_KEY:key},'mainnet',(digests,response)=>{
  const a=ordinaryAuthorization(directory,{live:true}),s=privateRead(join(a.run,'agent-ledger.json'));
  const text=JSON.stringify({schema:1,source:'tatum',digests,response},(_,v)=>typeof v==='bigint'?v.toString():v);
  assert(Buffer.byteLength(text)<=2097152,'MANAGED_RAW_EVIDENCE_SIZE');
  const fd=openSync(join(directory,'tatum-response-'+s.tatumBatches+'.json'),'wx',0o600);
  try{writeFileSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}
 }),transport:platformFetch});
function portsFor(options,directory){
 if(!options.managedTest){assert(!options.ports,'MANAGED_REAL_PORTS_FIXED');return realPorts(directory);}
 const p=options.ports;assert(p&&['readProfile','readKey','createSdk','createData','transport'].every(k=>typeof p[k]==='function'),'MANAGED_TEST_PORTS_REQUIRED');return p;
}
export function armManaged(directory,options={}){
 const {context:c,grant:g}=managedGrant(directory,options),ports=portsFor(options,directory);
 assert(!existsSync(join(directory,'active-run.json'))&&!existsSync(join(directory,'managed-armed.json')),'MANAGED_ALREADY_ARMED');
 const {p}=secrets(c,g,ports);p.delegatePrivateKey='';
 const m=createOrdinaryRun(directory,{kind:options.managedTest?'managed-boundary-test':'managed-production-approved',captureConsent:true,
  checkedAt:g.checkedAt,tatum:g.tatum,profileHash:runHash(profileIdentity(p)),deploymentHash:deploymentHash(c.config),contextHash:runHash(c)},
  {live:true,managedTest:options.managedTest??false});
 managedFile(join(directory,'managed-armed.json'),{contextHash:runHash(c),manifestHash:runHash(m),runId:m.runId,keyIdentity:fingerprint(c.keyFile)});
 return m;
}
export function admittedManaged(directory,options={}){
 const {context:c,grant:g}=managedGrant(directory,options),auth=ordinaryAuthorization(directory,{live:true,managedTest:options.managedTest??false}),
  armed=privateRead(join(directory,'managed-armed.json'));
 const ledger=privateRead(join(auth.run,'agent-ledger.json'));assert(ledger.stopped===null&&ledger.intents.every(i=>i.state==='done'),'MANAGED_CURRENT_UNCERTAIN');
 assert(armed.contextHash===runHash(c)&&armed.manifestHash===runHash(auth.manifest)&&armed.runId===auth.manifest.runId
  &&canonical(armed.keyIdentity)===canonical(fingerprint(c.keyFile))&&auth.manifest.admission.contextHash===runHash(c)
  &&auth.manifest.admission.deploymentHash===deploymentHash(c.config)&&auth.proof.providerApproval.checkedAt===g.checkedAt
  &&canonical(auth.proof.providerApproval.tatum)===canonical(g.tatum),'MANAGED_ARM_BINDING');
 return {...auth,context:c,grant:g};
}
export async function openManaged(directory,options={}){
 const auth=admittedManaged(directory,options),ports=portsFor(options,directory),{context:c,grant:g}=auth;
 const {p,key}=secrets(c,g,ports);
 if(!options.managedTest)globalThis.fetch=()=>{throw Error('MANAGED_UNGUARDED_NETWORK_DENIED');};
 try{return await openInjectedOrdinary(directory,{live:true,managedTest:options.managedTest??false,
  createSdk:async m=>{try{return await ports.createSdk(p,m);}finally{p.delegatePrivateKey='';}},
  transport:ports.transport,createData:ports.createData,tatumKey:key,wait:ports.wait});}
 finally{p.delegatePrivateKey='';}
}
export async function managedPreflightInventory(directory,options={}){
 let r;const abort=()=>r?.close();options.signal?.addEventListener('abort',abort,{once:true});
 try{assert(!options.signal?.aborted,'MANAGED_INTERRUPTED');r=await openManaged(directory,options);assert(!options.signal?.aborted,'MANAGED_INTERRUPTED');const inventories={rules:await r.ports.rules.inventory(),experience:await r.ports.experience.inventory()};
  const c=managedContext(directory,options);assert(inventories.rules.blobIds.length===0
   &&canonical(inventories.experience.blobIds)===canonical(c.baseline.records.map(r=>r.blobId).sort()),'MANAGED_INITIAL_INVENTORY_CHANGED');
  managedFile(join(directory,'ordinary-preflight.json'),{contextHash:runHash(c),manifestHash:r.gate.hash,
   checkedAt:new Date().toISOString(),accountAuthorized:true,admissionBasis:'matched-signed-account+official-managed-sponsorship+pinned-deployment',inventories});
  return {inventories,counters:r.gate.state()};
 }catch(e){r?.gate.stop('MANAGED_PREFLIGHT_FAILED');throw e;}finally{options.signal?.removeEventListener('abort',abort);r?.close();}
}
export function reserveManagedTurn(directory,index,taskPlan,options={}){
 const {context:c,manifest:m,run}=admittedManaged(directory,options),pre=privateRead(join(directory,'ordinary-preflight.json'));
 assert(pre.contextHash===runHash(c)&&pre.manifestHash===runHash(m)&&pre.accountAuthorized===true
  &&Date.now()-time(pre.checkedAt)>=0&&Date.now()-time(pre.checkedAt)<=300000,'MANAGED_PREFLIGHT_REQUIRED');
 const lock=join(directory,'.native-reservation');mkdirSync(lock,{mode:0o700});
 try{const b=privateRead(join(directory,'native-budget.json')),ledger=privateRead(join(run,'agent-ledger.json'));
  assert(b.schema===1&&b.contextHash===runHash(c)&&b.model===c.plan.model&&b.stopped===null&&ledger.stopped===null
   &&b.turns.length===index&&index<2&&b.turns.every(t=>t.status==='completed')
   &&taskPlan.model===c.plan.model&&taskPlan.dataMode===(options.managedTest?'ordinary-managed-test':'ordinary-managed')&&taskPlan.tasks.length===1
   &&canonical(taskPlan.tasks[0])===canonical(c.plan.tasks[index]),'MANAGED_NATIVE_ALLOWANCE');
  b.turns.push({index,taskHash:runHash(taskPlan.tasks[0]),reservedAt:new Date().toISOString(),status:'reserved'});
  managedFile(join(directory,'native-budget.json'),b,false);return b;
 }finally{rmSync(lock,{recursive:true});}
}
export function completeManagedTurn(directory,index,status){
 const lock=join(directory,'.native-reservation');mkdirSync(lock,{mode:0o700});
 try{const b=privateRead(join(directory,'native-budget.json'));assert(b.turns[index]?.status==='reserved','MANAGED_NATIVE_RESULT');
  b.turns[index].status=status==='COMPLETED'?'completed':'stopped';if(status!=='COMPLETED')b.stopped='NATIVE_STOPPED';
  managedFile(join(directory,'native-budget.json'),b,false);
 }finally{rmSync(lock,{recursive:true});}
}
// The parent owns only this exact newly captured key. File replacement is a stop, not permission to unlink it.
export function claimTemporaryKey(directory,options={}){
 const c=privateRead(join(directory,'managed-context.json')),g=privateRead(join(directory,'managed-grant.json'));
 // Cleanup ownership is not permission for provider access: it must survive expired proof/setup failure.
 assert(c.kind===(options.managedTest?'offline-managed-boundary-test':'prepared-not-authorized')
  &&g.kind===(options.managedTest?'offline-test-only':'human-approved-bounded-live')&&g.contextHash===runHash(c)
  &&g.planHash===runHash(c.plan)&&basenameKey(c.keyFile)
  &&canonical(fingerprint(dirname(c.keyFile),true))===canonical(c.keyDirectoryIdentity),'MANAGED_CLEANUP_SCOPE');
 const ticket={contextHash:runHash(c),keyFile:c.keyFile,parent:c.keyDirectoryIdentity,file:fingerprint(c.keyFile)};
 const s=lstatSync(c.keyFile);assert(s.nlink===1&&(s.mode&0o777)===0o600&&s.size>0&&s.size<=256,'MANAGED_KEY_FILE');
 managedFile(join(directory,'temporary-key-ticket.json'),ticket);return ticket;
}
export function cleanupTemporaryKey(directory){
 const c=privateRead(join(directory,'managed-context.json')),t=privateRead(join(directory,'temporary-key-ticket.json'));
 assert(t.contextHash===runHash(c)&&basenameKey(t.keyFile)&&t.keyFile===c.keyFile
  &&canonical(t.parent)===canonical(c.keyDirectoryIdentity)
  &&canonical(fingerprint(dirname(t.keyFile),true))===canonical(t.parent),'MANAGED_CLEANUP_SCOPE');
 if(!existsSync(t.keyFile))return {deleted:false,alreadyAbsent:true};
 assert(!lstatSync(t.keyFile).isSymbolicLink(),'MANAGED_CLEANUP_IDENTITY');
 const fd=openSync(t.keyFile,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{const s=fstatSync(fd);assert(s.isFile()&&s.nlink===1&&s.uid===process.getuid()&&(s.mode&0o777)===0o600
  &&canonical({dev:s.dev,ino:s.ino,birthtimeMs:s.birthtimeMs})===canonical(t.file)
  &&canonical(fingerprint(t.keyFile))===canonical(t.file),'MANAGED_CLEANUP_IDENTITY');unlinkSync(t.keyFile);}
 finally{closeSync(fd);}return {deleted:true};
}

export function requireManagedNativePermit(directory){
 const b=privateRead(join(directory,'native-budget.json')),c=managedContext(directory);
 assert(b.contextHash===runHash(c)&&b.model===c.plan.model&&b.stopped===null&&b.turns.length>=1&&b.turns.length<=2
  &&b.turns.at(-1).status==='reserved'&&b.turns.at(-1).taskHash===runHash(c.plan.tasks[b.turns.length-1]),'MANAGED_NATIVE_PERMIT_REQUIRED');
}
