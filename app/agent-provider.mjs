// Injected assembly only: no credential loader, native model or live entry point.
import {join} from 'node:path';
import {AgentRunGate,operationKey} from './agent-run.mjs';
import {agentWalrusFetch,validateTypedRecord,WALRUS_RELAY} from './agent-walrus-guard.mjs';
import {WalrusRecordStore,FileWriteJournal,readRules} from './activity-memory.ts';
import {validateRules} from './activity.ts';
import {WalrusExperienceStore} from './agent-experience.ts';
import {AgentSession} from './agent-session.ts';
import {agentServer} from './agent-mcp.mjs';
import {loadOfflineActivity} from './agent-activity-index.ts';
import {CsvArtifacts} from './agent-export.mjs';
import {recordFirstFailure} from './agent-diagnostic.mjs';
import {assert} from '../src/domain.ts';
import {isContinuation,continuationResolution} from './agent-continuation-contract.mjs';
import {setTimeout as delay} from 'node:timers/promises';
let active=false;

export async function openInjectedAgent(directory,{createSdk,transport,capture=false,wait,live=false,ordinary,dataFactory}){
 assert(!active&&typeof createSdk==='function'&&typeof transport==='function','AGENT_INJECTED_PORTS_REQUIRED');
 assert(!ordinary||typeof dataFactory==='function','AGENT_ORDINARY_PORTS_REQUIRED');
 const gate=new AgentRunGate(directory,ordinary?{ordinary:true,live,...ordinary,readonly:ordinary.readonly===true}:{live}),m=gate.manifest;
 const index=ordinary?undefined:loadOfflineActivity(m.source==='replay'?'saved':'fixture');
 if(index)assert(index.datasetId===m.datasetId,'AGENT_DATASET_CHANGED');
 const journals=Object.fromEntries(['rules','experience'].map(k=>[k,new FileWriteJournal(join(ordinary?.workspaceDirectory??directory,'journal-'+k))]));
 for(const journal of Object.values(journals))journal.assertSettled();
 let sdk,native,session,data,closed=false,inFlight=0,starting=true;
 const original=globalThis.fetch,bound=agentWalrusFetch(gate,transport,{phase:()=>starting?'startup':'action'});
 const guarded=(...args)=>{try{assert(!closed,'AGENT_RUNTIME_CLOSED');}catch(error){recordFirstFailure(gate,{phase:'late-close',category:'lifecycle',error});throw error;}return bound(...args);};
 const release=()=>{if(closed&&inFlight===0){if(globalThis.fetch===guarded)globalThis.fetch=original;active=false;}};
 active=true;globalThis.fetch=guarded;
 const close=()=>{
  if(closed)return;closed=true;
  try{if(inFlight||gate.lease||session?.busy){recordFirstFailure(gate,{phase:'close',category:'lifecycle',faultCode:'AGENT_CLIENT_CLOSED_DURING_ACTION'});gate.stop('AGENT_CLIENT_CLOSED_DURING_ACTION');}}
  finally{try{data?.close();}finally{try{native?.destroy();}finally{release();}}}
 };
 try{
  native=await createSdk(m);sdk={};
  for(const method of ['getPublicKeyHex','compatibility','listMemories','recall','remember','getRememberStatus']){
   sdk[method]=async(...args)=>{
    assert(!closed,'AGENT_RUNTIME_CLOSED');inFlight++;
    try{return await native[method](...args);}finally{inFlight--;release();}
   };
  }
  assert(await sdk.getPublicKeyHex()===m.delegatePublicKeyHex,'AGENT_DELEGATE_MISMATCH');
  await guarded(WALRUS_RELAY+'/health');
  await sdk.compatibility();
  if(live||ordinary?.ownAccount)await guarded(WALRUS_RELAY+'/config');
  const binding={owner:m.owner,project:m.workspace},ports={};
  const boundedWait=ordinary?.ownAccount?async ms=>{
   gate.admit();const remaining=Date.parse(m.expiresAt)-Date.now();
   await (wait??delay)(Math.min(ms,Math.max(0,remaining)));gate.admit();
  }:wait;
  for(const kind of ['rules','experience']){
   const namespace=m.namespaces[kind];
   ports[kind]=new WalrusRecordStore(sdk,binding,journals[kind],r=>validateTypedRecord(m,namespace,r),boundedWait,gate.hooks(namespace));
  }
  const rules={inventory:()=>ports.rules.inventory(),recall:(...a)=>ports.rules.recall(...a),
   write:(record,key)=>gate.withWriter(m.namespaces.rules,async()=>{
    validateTypedRecord(m,m.namespaces.rules,record);assert(operationKey(record)===key,'AGENT_OPERATION_KEY');
    gate.checkWriteScope(m.namespaces.rules,record);
    if(await journals.rules.load(key))return ports.rules.write(record,key);
    gate.ensureWriteAvailable();
    const rows=await readRules(ports.rules,binding);
    validateRules([...rows,{record,blobId:key}],binding);
    return ports.rules.write(record,key);
   })};
  const storage=live&&!ordinary?.managedTest?'walrus':'walrus-fixture';
  const base=new WalrusExperienceStore(ports.experience,async()=>gate.admit(),storage);
  const experience={storage,read:async()=>{
   try{return await base.read();}catch(error){gate.stop('AGENT_MEMORY_READ_STOPPED');throw error;}
  },write:record=>
   gate.withWriter(m.namespaces.experience,async()=>{
    validateTypedRecord(m,m.namespaces.experience,record);const key=operationKey(record);
    gate.checkWriteScope(m.namespaces.experience,record);
    const c=gate.context();if(isContinuation(c))continuationResolution(c,record,key);
    if(await journals.experience.load(key)){const receipt=await ports.experience.write(record,key);return {id:key,record,blobId:receipt.blobId};}
    gate.ensureWriteAvailable();return base.write(record);
   })};
  if(ordinary)data=await dataFactory(gate);
  session=new AgentSession(binding,rules,network=>({transactions:ids=>{
   assert(!closed,'AGENT_RUNTIME_CLOSED');
   if(ordinary){assert(network==='mainnet','WRONG_NETWORK');return data.transactions(ids);}
   assert(network==='mainnet'||network==='testnet','WRONG_NETWORK');return index.transactions(network,ids);
  }}),undefined,undefined,()=>gate.stop('AGENT_TOOL_STOPPED'));
  session.experience=experience;session.capture=capture;session.activityIndex=index;session.artifacts=new CsvArtifacts(directory);
  if(ordinary){session.selectedTransactionsOnly=true;session.factEvidence=id=>data.factEvidence(id);}
  const captureContext=gate.context();
  if(ordinary?.ownAccount){session.ownAccount=true;session.captureScope=captureContext.captureScope;session.captureFacts=captureContext.captureConsent;session.factCaptureSet=captureContext.captureSet;
   session.admitFactBatch=notes=>{gate.admit();assert(notes.length<=gate.limits().writes-gate.state().writes,'OWN_FACT_BATCH_BUDGET');};}
  if(isContinuation(captureContext)){
   session.captureScope='linked-resolution-only';session.captureParentId=captureContext.baseline.origins[1].records[0].id;
  }
  if(ordinary)session.providerProvenance={sourceMode:live&&!ordinary.managedTest?'live-tatum-selected':ordinary.managedTest?'offline-managed-boundary-test':'offline-intercepted-tatum',
   freshProviderRead:Boolean(live&&!ordinary.managedTest),walletHistoryComplete:false,scope:'selected-transactions'};
  const runtime=agentServer(session,{capture,dataMode:m.source==='tatum'?'tatum':m.source==='replay'?'saved':'fixture',
   mode:ordinary?m.mode:live?'live-walrus-sui-replay':'offline-sdk-fixture-'+m.source});
  starting=false;return {...runtime,gate,ports,rules,experience,isBusy:()=>Boolean(inFlight||gate.lease||session?.busy),close};
 }catch(error){recordFirstFailure(gate,{phase:'startup',category:'sdk',error});try{gate.stop('AGENT_OPEN_FAILED');}finally{close();}throw error;}
}
