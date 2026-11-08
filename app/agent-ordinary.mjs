import {requestBudgetOwn} from './agent-own-policy.mjs';
// Ordinary assembly contract; credential loading stays in the separately admitted managed entry.
import {randomUUID} from 'node:crypto';
import {existsSync,readdirSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,rmSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {assert,canonical,exactKeys} from '../src/domain.ts';
import {address,digest,MAX_TRANSACTIONS} from './activity.ts';
import {FileWriteJournal} from './activity-memory.ts';
import {validateApproval,validateTatumBinding,PILOT_LIMITS} from './activity-live.ts';
import {createAgentRun,privateDirectory,privateRead,runHash,validateAgentManifest} from './agent-run.mjs';
import {openInjectedAgent} from './agent-provider.mjs';

const file=(path,value,fresh=true)=>{
 const target=fresh?path:path+'.next',fd=openSync(target,'wx',0o600);
 try{writeFileSync(fd,canonical(value));fsyncSync(fd);}finally{closeSync(fd);}
 if(!fresh)renameSync(target,path);
 const directory=openSync(join(path,'..'),'r');try{fsyncSync(directory);}finally{closeSync(directory);}
};
const leasePath=root=>join(root,'.ordinary-runtime');
const projectBinding=root=>privateRead(join(root,'ordinary-workspace.json'));
function identity(value){
 exactKeys(value,['owner','accountId','delegatePublicKeyHex','packageId','workspace']);
 assert([value.owner,value.accountId,value.packageId].every(x=>address(x)===x)
  &&/^[a-f0-9]{64}$/.test(value.delegatePublicKeyHex)&&/^agent-[a-f0-9-]{36}$/.test(value.workspace),'ORDINARY_IDENTITY');
 return value;
}
export function createOrdinaryWorkspace(directory,value,{live=false,managedTest=false}={}){
 privateDirectory(directory);assert(readdirSync(directory).length===0,'ORDINARY_WORKSPACE_NOT_EMPTY');
 const binding={schema:1,mode:live?(managedTest?'offline-managed-workspace-test':'live-ordinary-workspace'):'offline-ordinary-workspace',identity:identity(value)};
 file(join(directory,'ordinary-workspace.json'),binding);
 mkdirSync(join(directory,'runs'),{mode:0o700});
 for(const kind of ['rules','experience']){mkdirSync(join(directory,'journal-'+kind),{mode:0o700});mkdirSync(join(directory,'journal-'+kind,'activity-jobs'),{mode:0o700});}
 return binding;
}
export function ordinaryBinding(directory,{live=false,managedTest=false}={}){
 privateDirectory(directory);const binding=projectBinding(directory);
 exactKeys(binding,['schema','mode','identity']);assert(binding.schema===1&&binding.mode===(live?(managedTest?'offline-managed-workspace-test':'live-ordinary-workspace'):'offline-ordinary-workspace'),'ORDINARY_OFFLINE_ONLY');
 identity(binding.identity);privateDirectory(join(directory,'runs'));
 for(const kind of ['rules','experience']){
  privateDirectory(join(directory,'journal-'+kind));privateDirectory(join(directory,'journal-'+kind,'activity-jobs'));
  new FileWriteJournal(join(directory,'journal-'+kind)).assertSettled();
 }
 return binding;
}
// Explicit new approved run, never an automatic response to expiry or exhaustion.
export function createOrdinaryRun(directory,consent,options={}){
 const {live=false,managedTest=false}=options,binding=ordinaryBinding(directory,options);
 exactKeys(consent,['kind','captureConsent','checkedAt','tatum',...(live?['profileHash','deploymentHash','contextHash']:[])]);
 assert(consent.kind===(live?(managedTest?'managed-boundary-test':'managed-production-approved'):'offline-synthetic')&&typeof consent.captureConsent==='boolean','ORDINARY_OFFLINE_ONLY');
 const lock=join(directory,'.ordinary-admission');mkdirSync(lock,{mode:0o700});
 try{
  assert(!existsSync(leasePath(directory)),'ORDINARY_WORKSPACE_BUSY');
  const runs=readdirSync(join(directory,'runs'));assert(runs.length<16,'ORDINARY_RUN_HISTORY_LIMIT');
  if(runs.length){
   const active=privateRead(join(directory,'active-run.json'));
   assert(runs.includes(active.runId),'ORDINARY_ACTIVE_RUN_MISSING');
   for(const id of runs){
    assert(/^[a-f0-9-]{36}$/.test(id),'ORDINARY_RUN_HISTORY');
    const run=join(directory,'runs',id);privateDirectory(run);
    const m=privateRead(join(run,'agent-run.json')),s=privateRead(join(run,'agent-ledger.json'));
    validateAgentManifest(m,{ordinary:true,live,managedTest});
    for(const k of ['tatumBatches','writes','reads','requests'])assert(Number.isSafeInteger(s[k])&&s[k]>=0&&s[k]<=PILOT_LIMITS[k],'ORDINARY_PRIOR_LEDGER');
    assert(m.admission.workspaceHash===runHash(binding)&&s.manifestHash===runHash(m)
     &&Array.isArray(s.intents)&&s.intents.length===s.writes&&s.intents.every(i=>i.state==='done')
     &&!existsSync(join(run,'.agent-writer-lock'))&&!existsSync(join(run,'.agent-ledger-lock'))
     &&!existsSync(join(run,'agent-ledger.json.next')),'ORDINARY_PRIOR_OUTCOME_UNCERTAIN');
    for(const intent of s.intents){
     const kind=Object.keys(m.namespaces).find(k=>m.namespaces[k]===intent.namespace);
     assert(kind&&/^[A-Za-z0-9_-]{43}$/.test(intent.key),'ORDINARY_PRIOR_LEDGER');
     const receipt=privateRead(join(directory,'journal-'+kind,'activity-jobs',intent.key+'.json'));
     assert(receipt.state==='done'&&receipt.sha256===intent.sha256&&s.jobs[receipt.jobId]?.key===intent.key
      &&s.jobs[receipt.jobId]?.namespace===intent.namespace,'ORDINARY_RETAINED_RECEIPT_MISSING');
    }
    if(id===active.runId)assert(active.manifestHash===runHash(m),'ORDINARY_ACTIVE_RUN_BINDING');
   }
  }else assert(!existsSync(join(directory,'active-run.json')),'ORDINARY_ACTIVE_RUN_BINDING');
  const m={schema:1,mode:live?(managedTest?'offline-managed-admission-test':'live-ordinary-selected'):'offline-ordinary-provider-fixture',runId:randomUUID(),...binding.identity,
   datasetId:runHash({scope:'selected-transactions',network:'mainnet',provider:'tatum'}),source:live&&!managedTest?'tatum':'fixture',
   namespaces:{rules:binding.identity.workspace+'-rules',experience:binding.identity.workspace+'-experience'},maxUSD:0,
   expiresAt:new Date(Date.now()+3600000).toISOString(),admission:{kind:consent.kind,accountId:binding.identity.accountId,
    delegatePublicKeyHex:binding.identity.delegatePublicKeyHex,checkedAt:consent.checkedAt,maxUSD:0,workspaceHash:runHash(binding),policyHash:runHash(consent),...(live?Object.fromEntries(['profileHash','deploymentHash','contextHash'].map(k=>[k,consent[k]])): {})}};
  const approval={schema:2,planHash:runHash(m),walrusManaged:true,checkedAt:consent.checkedAt,tatum:consent.tatum};
  validateApproval(m,approval);
  const run=join(directory,'runs',m.runId);mkdirSync(run,{mode:0o700});
  createAgentRun(run,m,{ordinary:true,workspaceDirectory:directory,live,managedTest});
  file(join(run,'ordinary-approval.json'),{schema:1,execution:live?(managedTest?'offline-managed-test':'managed-explicit-approved'):'offline-intercepted',manifestHash:runHash(m),captureConsent:consent.captureConsent,providerApproval:approval});
  file(join(directory,'active-run.json'),{runId:m.runId,manifestHash:runHash(m)},!runs.length);
  return m;
 }finally{rmSync(lock,{recursive:true});}
}
export function ordinaryAuthorization(directory,options={}){
 const {live=false,managedTest=false}=options,binding=ordinaryBinding(directory,options),active=privateRead(join(directory,'active-run.json'));
 exactKeys(active,['runId','manifestHash']);assert(/^[a-f0-9-]{36}$/.test(active.runId),'ORDINARY_ACTIVE_RUN_BINDING');
 const run=join(directory,'runs',active.runId);privateDirectory(run);
 const m=privateRead(join(run,'agent-run.json')),proof=privateRead(join(run,'ordinary-approval.json'));
 validateAgentManifest(m,{ordinary:true,live,managedTest});
 assert(m.admission.workspaceHash===runHash(binding)
  &&active.manifestHash===runHash(m),'ORDINARY_OFFLINE_ONLY');
 assert(canonical(Object.fromEntries(Object.keys(binding.identity).map(k=>[k,m[k]])))===canonical(binding.identity),'ORDINARY_IDENTITY');
 exactKeys(proof,['schema','execution','manifestHash','captureConsent','providerApproval']);
 assert(proof.schema===1&&proof.execution===(live?(managedTest?'offline-managed-test':'managed-explicit-approved'):'offline-intercepted')&&proof.manifestHash===runHash(m)
  &&typeof proof.captureConsent==='boolean','ORDINARY_OFFLINE_ONLY');
 assert(m.admission.policyHash===runHash({kind:m.admission.kind,captureConsent:proof.captureConsent,
  checkedAt:proof.providerApproval.checkedAt,tatum:proof.providerApproval.tatum,...(live?Object.fromEntries(['profileHash','deploymentHash','contextHash'].map(k=>[k,m.admission[k]])): {})}),'ORDINARY_APPROVAL_BINDING');
 validateApproval(m,proof.providerApproval);return {binding,run,manifest:m,proof};
}
export function boundedOrdinaryTatum(gate,approval,key,createData){
 assert(['offline-ordinary-provider-fixture','live-ordinary-selected','offline-managed-admission-test','live-own-account-selected','offline-own-account-test'].includes(gate.manifest.mode)&&typeof createData==='function','ORDINARY_INJECTED_DATA_REQUIRED');
 let data,closed=false;
 return {factEvidence:id=>{assert(data?.factEvidence,'FACT_PROVENANCE_MISSING');return data.factEvidence(id);},close(){if(!closed){closed=true;data?.close();}},async transactions(ids){
  assert(!closed,'AGENT_RUNTIME_CLOSED');
  // These pure failures precede reservation and are safe for the agent to correct.
  assert(Array.isArray(ids)&&ids.length>0&&ids.length<=MAX_TRANSACTIONS,'TRANSACTION_LIST_LIMIT');
  ids.forEach(digest);assert(new Set(ids).size===ids.length,'DUPLICATE_TRANSACTION');
  if(gate.ownAccount&&gate.context().captureSet)assert(ids.every(id=>gate.context().captureSet.includes(id)),'OWN_APPROVED_TRANSACTION_SCOPE');
  if(gate.manifest.mode==='live-ordinary-selected'||gate.context?.()?.plan?.kind==='ordinary-single-continuation'){
   const c=privateRead(join(gate.ordinary.directory,'managed-context.json'));
   assert(ids.length===1&&ids[0]===c.plan.publicInputs.transaction,'MANAGED_APPROVED_TRANSACTION_ONLY');
  }
  try{
   gate.admit();managedPreflight(gate);validateApproval(gate.manifest,approval);validateTatumBinding(approval,key);
   assert((gate.state().tatumBatches+1)*approval.tatum.creditsPerCall<=Math.min((gate.limits?.().tatumBatches??2)*2,approval.tatum.remainingCredits),'TATUM_FREE_ALLOWANCE');
   gate.reserve('tatumBatches');
   if(!data){
    const connected=await createData({network:'mainnet',method:'sui.rpc.v2.LedgerService/BatchGetTransactions',key,
     ...(gate.ownAccount&&!requestBudgetOwn(gate.manifest)?{deadline:Date.parse(gate.manifest.expiresAt)}:{})});
    if(closed){connected.close();assert(false,'AGENT_RUNTIME_CLOSED');}data=connected;
   }
   gate.admit();managedPreflight(gate);validateApproval(gate.manifest,approval);validateTatumBinding(approval,key);
   return await data.transactions(ids);
  }catch(error){gate.stop('ORDINARY_TATUM_STOPPED');throw error;}
 }};
}
export async function openInjectedOrdinary(directory,{createSdk,transport,createData,tatumKey,wait,live=false,managedTest=false,readonly=false}){
 const root=realpathSync(directory);
 assert(typeof createSdk==='function'&&typeof transport==='function'&&typeof createData==='function','ORDINARY_INJECTED_PORTS_REQUIRED');
 // Every RPC/read/write, including catalog retrieval, owns this process-wide project lease.
 const lease=leasePath(root),token=randomUUID(),admission=join(root,'.ordinary-admission');
 let authorization;
 mkdirSync(admission,{mode:0o700});
 try{
  authorization=ordinaryAuthorization(root,{live,managedTest});mkdirSync(lease,{mode:0o700});
  file(join(lease,'lease.json'),{manifestHash:runHash(authorization.manifest),token,pid:process.pid});
 }finally{rmSync(admission,{recursive:true});}
 const {run,manifest,proof}=authorization;let runtime,closed=false;
 try{
  runtime=await openInjectedAgent(run,{createSdk,transport,wait,live,capture:proof.captureConsent,
   ordinary:{workspaceDirectory:root,leaseToken:token,approvalHash:runHash(proof),managedTest,readonly},dataFactory:gate=>boundedOrdinaryTatum(gate,proof.providerApproval,tatumKey,createData)});
  const close=()=>{
   if(closed)return;closed=true;
   const busy=runtime.isBusy();runtime.close();
   // Keep the lease as a durable stop after an interrupted operation, even if no receipt exists yet.
   if(!busy)rmSync(lease,{recursive:true});
  };
  return {...runtime,workspaceDirectory:root,close};
 }catch(error){runtime?.close();rmSync(lease,{recursive:true});throw error;}
}

export function managedPreflight(gate){
 if(!['live-ordinary-selected','offline-managed-admission-test'].includes(gate.manifest.mode))return;
 const p=privateRead(join(gate.ordinary.directory,'ordinary-preflight.json'));
 assert(p.contextHash===gate.manifest.admission.contextHash&&p.manifestHash===gate.hash&&p.accountAuthorized===true
  &&Date.now()-Date.parse(p.checkedAt)>=0&&Date.now()-Date.parse(p.checkedAt)<=300000,'ORDINARY_MANAGED_PREFLIGHT_REQUIRED');
}
