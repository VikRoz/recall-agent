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
import {assert} from '../src/domain.ts';
let active=false;

export async function openInjectedAgent(directory,{createSdk,transport,capture=false,wait,live=false}){
 assert(!active&&typeof createSdk==='function'&&typeof transport==='function','AGENT_INJECTED_PORTS_REQUIRED');
 const gate=new AgentRunGate(directory,{live}),m=gate.manifest;
 const index=loadOfflineActivity(m.source==='replay'?'saved':'fixture');
 assert(index.datasetId===m.datasetId,'AGENT_DATASET_CHANGED');
 const journals=Object.fromEntries(['rules','experience'].map(k=>[k,new FileWriteJournal(join(directory,'journal-'+k))]));
 for(const journal of Object.values(journals))journal.assertSettled();
 let sdk,native,session,closed=false,inFlight=0;
 const original=globalThis.fetch,bound=agentWalrusFetch(gate,transport);
 const guarded=(...args)=>{assert(!closed,'AGENT_RUNTIME_CLOSED');return bound(...args);};
 const release=()=>{if(closed&&inFlight===0){if(globalThis.fetch===guarded)globalThis.fetch=original;active=false;}};
 active=true;globalThis.fetch=guarded;
 const close=()=>{
  if(closed)return;closed=true;
  try{if(inFlight||gate.lease||session?.busy)gate.stop('AGENT_CLIENT_CLOSED_DURING_ACTION');}
  finally{try{native?.destroy();}finally{release();}}
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
  if(live)await guarded(WALRUS_RELAY+'/config');
  const binding={owner:m.owner,project:m.workspace},ports={};
  for(const kind of ['rules','experience']){
   const namespace=m.namespaces[kind];
   ports[kind]=new WalrusRecordStore(sdk,binding,journals[kind],r=>validateTypedRecord(m,namespace,r),wait,gate.hooks(namespace));
  }
  const rules={inventory:()=>ports.rules.inventory(),recall:(...a)=>ports.rules.recall(...a),
   write:(record,key)=>gate.withWriter(m.namespaces.rules,async()=>{
    validateTypedRecord(m,m.namespaces.rules,record);assert(operationKey(record)===key,'AGENT_OPERATION_KEY');
    if(await journals.rules.load(key))return ports.rules.write(record,key);
    gate.ensureWriteAvailable();
    const rows=await readRules(ports.rules,binding);
    validateRules([...rows,{record,blobId:key}],binding);
    return ports.rules.write(record,key);
   })};
  const storage=live?'walrus':'walrus-fixture';
  const base=new WalrusExperienceStore(ports.experience,async()=>gate.admit(),storage);
  const experience={storage,read:async()=>{
   try{return await base.read();}catch(error){gate.stop('AGENT_MEMORY_READ_STOPPED');throw error;}
  },write:record=>
   gate.withWriter(m.namespaces.experience,async()=>{
    validateTypedRecord(m,m.namespaces.experience,record);const key=operationKey(record);
    if(await journals.experience.load(key)){const receipt=await ports.experience.write(record,key);return {id:key,record,blobId:receipt.blobId};}
    gate.ensureWriteAvailable();return base.write(record);
   })};
  session=new AgentSession(binding,rules,network=>({transactions:ids=>{
   assert(network==='mainnet'||network==='testnet','WRONG_NETWORK');return index.transactions(network,ids);
  }}),undefined,undefined,()=>gate.stop('AGENT_TOOL_STOPPED'));
  session.experience=experience;session.capture=capture;session.activityIndex=index;session.artifacts=new CsvArtifacts(directory);
  const runtime=agentServer(session,{capture,dataMode:m.source==='replay'?'saved':'fixture',mode:live?'live-walrus-sui-replay':'offline-sdk-fixture-'+m.source});
  return {...runtime,gate,ports,rules,experience,close};
 }catch(error){try{gate.stop('AGENT_OPEN_FAILED');}finally{close();}throw error;}
}
