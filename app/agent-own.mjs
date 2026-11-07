// Ordinary own-account boundary; offline tests inject every external/credential port.
import {randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,rmSync,realpathSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {assert,canonical,time} from '../src/domain.ts';
import {createOrdinaryWorkspace,ordinaryBinding,boundedOrdinaryTatum} from './agent-ordinary.mjs';
import {createAgentRun,privateRead,privateDirectory,runHash} from './agent-run.mjs';
import {managedFile} from './agent-managed.mjs';
import {validateOwnContext,validateOwnManifest,OWN_LIMITS} from './agent-own-contract.mjs';
import {validateApproval,validateTatumBinding} from './activity-live.ts';
import {deploymentHash} from './agent-walrus-guard.mjs';
import {openInjectedAgent} from './agent-provider.mjs';
import {validateRetained,ownPath} from './agent-own-lineage.mjs';
import {FileWriteJournal} from './activity-memory.ts';

export function createOwnActivation(directory,{identity,config,profileHash,tatum,captureConsent,captureScope='transaction-facts-only',checkedAt,
 credentialRoot=dirname(directory),keyFile=join(dirname(directory),'tatum.key'),retained=null,captureSet=null}, {fixture=false}={}){
 privateDirectory(directory);
 // Exactly one activation per directory. Expiry/exhaustion never creates a fresh allowance.
 assert(!existsSync(join(directory,'active-run.json'))&&!existsSync(join(directory,'own-account-context.json')),'OWN_ACTIVATION_ALREADY_EXISTS');
 if(!fixture){ownPath(credentialRoot);privateDirectory(credentialRoot);ownPath(keyFile);}
 retained=retained?validateRetained(structuredClone(retained),identity,{fixture,freeze:true}):null;
 const live=!fixture,binding=createOrdinaryWorkspace(directory,identity,{live});
 const context=validateOwnContext({schema:1,kind:fixture?'offline-own-account-test':'own-account-explicit',identity,config,
  captureConsent,captureScope,limits:OWN_LIMITS,profileHash,credentialRoot,keyFile,retained,captureSet,expiresAt:new Date(Date.parse(checkedAt)+240000).toISOString()});
 const m={schema:1,mode:fixture?'offline-own-account-test':'live-own-account-selected',runId:randomUUID(),...identity,
  datasetId:runHash({scope:'selected-transactions',network:'mainnet',provider:'tatum'}),source:fixture?'fixture':'tatum',
  namespaces:{rules:identity.workspace+'-rules',experience:identity.workspace+'-experience'},maxUSD:0,expiresAt:context.expiresAt,
  admission:{kind:context.kind,accountId:identity.accountId,delegatePublicKeyHex:identity.delegatePublicKeyHex,checkedAt,maxUSD:0,
   workspaceHash:runHash(binding),policyHash:runHash({captureConsent,captureScope,limits:OWN_LIMITS}),contextHash:runHash(context),profileHash,deploymentHash:deploymentHash(config)}};
 const approval={schema:2,planHash:runHash(m),walrusManaged:true,checkedAt,tatum};validateApproval(m,approval);
 assert(tatum.remainingCredits>=OWN_LIMITS.tatumBatches*tatum.creditsPerCall,'OWN_INCLUDED_CREDITS');
 const run=join(directory,'runs',m.runId);mkdirSync(run,{mode:0o700});
 managedFile(join(directory,'own-account-context.json'),context);
 createAgentRun(run,m,{ordinary:true,ownAccount:true,workspaceDirectory:directory,live});
 if(retained)for(const [id,receipt] of Object.entries(retained.receipts))managedFile(join(directory,'journal-experience','activity-jobs',id+'.json'),receipt);
 managedFile(join(run,'ordinary-approval.json'),{schema:1,execution:context.kind,manifestHash:runHash(m),captureConsent,providerApproval:approval});
 managedFile(join(directory,'active-run.json'),{runId:m.runId,manifestHash:runHash(m)});return m;
}
export function ownAuthorization(directory,{fixture=false}={}){
 const binding=ordinaryBinding(directory,{live:!fixture}),context=validateOwnContext(privateRead(join(directory,'own-account-context.json')));
 const active=privateRead(join(directory,'active-run.json'));
 assert(/^[a-f0-9-]{36}$/.test(active.runId),'OWN_RUN');
 const run=join(directory,'runs',active.runId),m=validateOwnManifest(privateRead(join(run,'agent-run.json')),{live:!fixture});
 const proof=privateRead(join(run,'ordinary-approval.json'));
 if(!fixture){ownPath(context.credentialRoot);privateDirectory(context.credentialRoot);ownPath(join(context.credentialRoot,'profile'));
  privateDirectory(join(context.credentialRoot,'profile'));ownPath(context.keyFile);}
 validateRetained(context.retained,context.identity,{fixture});
 assert(runHash(m)===active.manifestHash&&runHash(binding)===m.admission.workspaceHash&&runHash(context)===m.admission.contextHash
  &&canonical(context.identity)===canonical(binding.identity)&&context.kind===m.admission.kind&&context.expiresAt===m.expiresAt
  &&context.profileHash===m.admission.profileHash&&deploymentHash(context.config)===m.admission.deploymentHash
  &&m.admission.policyHash===runHash({captureConsent:context.captureConsent,captureScope:context.captureScope,limits:OWN_LIMITS})
  &&proof.schema===1&&proof.execution===context.kind&&proof.manifestHash===runHash(m)&&proof.captureConsent===context.captureConsent,'OWN_BINDING');
 validateApproval(m,proof.providerApproval);assert(time(m.expiresAt)>Date.now(),'OWN_EXPIRED');
 const ledger=privateRead(join(run,'agent-ledger.json'));
 assert(ledger.manifestHash===runHash(m)&&ledger.stopped===null&&Array.isArray(ledger.intents)
  &&ledger.intents.length===ledger.writes&&ledger.intents.every(i=>i.state==='done')
  &&Object.entries(OWN_LIMITS).filter(([k])=>k!=='pollsPerJob').every(([k,n])=>Number.isSafeInteger(ledger[k])&&ledger[k]>=0&&ledger[k]<=n),
  'OWN_PRIOR_STOPPED_OR_UNCERTAIN');
 return {binding,context,run,manifest:m,proof};
}
export async function openOwnAccount(directory,ports,{fixture=false,readonly=false}={}){
 const root=realpathSync(directory),a=ownAuthorization(root,{fixture});
 assert(ports&&['createSdk','transport','createData','readKey','identity'].every(k=>typeof ports[k]==='function'),'OWN_PORTS_REQUIRED');
 // Admission is checked before any credential factory or transport call.
 const lease=join(root,'.ordinary-runtime'),lock=join(root,'.ordinary-admission'),token=randomUUID();
 mkdirSync(lock,{mode:0o700});
 try{assert(!existsSync(lease),'ORDINARY_WORKSPACE_BUSY');mkdirSync(lease,{mode:0o700});
  managedFile(join(lease,'lease.json'),{manifestHash:runHash(a.manifest),token,pid:process.pid});
 }finally{rmSync(lock,{recursive:true});}
 let runtime;
 try{
  assert(runHash(await ports.identity())===a.context.profileHash,'OWN_PROFILE_CHANGED');
  const key=await ports.readKey(a.proof.providerApproval.tatum.accountId);validateTatumBinding(a.proof.providerApproval,key);
  runtime=await openInjectedAgent(a.run,{live:!fixture,capture:a.context.captureConsent,createSdk:ports.createSdk,transport:ports.transport,wait:ports.wait,
   ordinary:{ownAccount:true,workspaceDirectory:root,leaseToken:token,approvalHash:runHash(a.proof),readonly},
   dataFactory:gate=>boundedOrdinaryTatum(gate,a.proof.providerApproval,key,ports.createData)});
  await runtime.ports.rules.inventory();await runtime.ports.experience.inventory();
  if(a.context.retained){
   const rows=await runtime.experience.read();
   for(const old of a.context.retained.records)assert(rows.some(r=>r.id===old.id&&r.blobId===old.blobId&&canonical(r.record)===canonical(old.record)),'OWN_RETAINED_READBACK');
  }
  // Signed identity, deployment and write health were checked through the same guarded SDK startup.
  managedFile(join(root,'ordinary-preflight.json'),{contextHash:a.manifest.admission.contextHash,manifestHash:runtime.gate.hash,
   accountAuthorized:true,checkedAt:new Date().toISOString()},!existsSync(join(root,'ordinary-preflight.json')));
  let closed=false;const close=()=>{if(closed)return;closed=true;const busy=runtime.isBusy();runtime.close();if(!busy)rmSync(lease,{recursive:true});};
  return {...runtime,close};
 }catch(error){runtime?.close();rmSync(lease,{recursive:true});throw error;}
}
