import {createHash,randomUUID} from 'node:crypto';
import {openSync,writeFileSync,fsyncSync,closeSync,mkdirSync} from 'node:fs';
import {join,isAbsolute} from 'node:path';
import {MemWal} from '@mysten-incubation/memwal';
import {assert,canonical,exactKeys} from '../src/domain.ts';
import {profile} from './walrus.mjs';
import {AgentRunGate,createAgentRun,privateRead,privateDirectory,runHash,operationKey} from './agent-run.mjs';
import {validateExperienceRows} from './agent-experience.ts';
import {loadOfflineActivity} from './agent-activity-index.ts';
import {deploymentHash,WALRUS_RELAY} from './agent-walrus-guard.mjs';
import {openInjectedAgent} from './agent-provider.mjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const payloadHash=p=>digest(JSON.stringify(p,null,2)+'\n');
export const profileIdentity=p=>({owner:p.walletAddress,accountId:p.accountId,delegatePublicKeyHex:p.delegatePublicKeyHex,packageId:p.packageId});
export function exclusiveRunFile(directory,name,value){
 assert(['agent-live-authorization.json','agent-live-preflight.json','agent-native-turn.json','seed-receipt.json'].includes(name),'AGENT_PROOF_FILE');
 const fd=openSync(join(directory,name),'wx',0o600);try{writeFileSync(fd,canonical(value));fsyncSync(fd);}finally{closeSync(fd);}
 const dir=openSync(directory,'r');try{fsyncSync(dir);}finally{closeSync(dir);}
}
function checkApproved(plan,payload,payloadText=JSON.stringify(payload,null,2)+'\n'){
 assert(plan.schema===1&&plan.network==='mainnet'&&plan.dataSource==='saved-sui-replay'&&isAbsolute(plan.profilePath),'AGENT_LIVE_PLAN');
 exactKeys(plan.limits,['newModelUserTurns','model','toolsPerTurn','modelTurnSeconds','tatumCalls','walrusWrites','contentReads','guardedSdkRequests','pollsPerJob','additionalSpendUSD']);
 assert(canonical(plan.limits)===canonical({newModelUserTurns:1,model:'gpt-5.6-luna',toolsPerTurn:12,modelTurnSeconds:120,
  tatumCalls:0,walrusWrites:2,contentReads:2,guardedSdkRequests:64,pollsPerJob:8,additionalSpendUSD:0}),'AGENT_LIVE_LIMITS');
 assert(plan.noRetry===true&&plan.noPromptTuning===true&&plan.noGlobalModelChange===true&&plan.noTatumKey===true
  &&plan.noDeployment===true&&plan.doNotResetOldBudgets===true,'AGENT_LIVE_SCOPE');
 assert(plan.payloadSha256===digest(payloadText)&&canonical(JSON.parse(payloadText))===canonical(payload)
  &&payload.origin==='actual-native-error-automatically-captured-and-retained'
  &&payload.initialSuccessRecordInserted===false&&typeof payload.ordinaryTask==='string'&&payload.ordinaryTask.length<=1600,'AGENT_LIVE_PAYLOAD');
 validateExperienceRows([payload.failure],plan.workspace);
 assert(payload.failure.id===operationKey(payload.failure.record)&&payload.failure.record.schema==='recall-tool-experience/1'
  &&payload.failure.record.source==='replay'&&payload.failure.record.verdict==='fail'
  &&payload.failure.record.evidence==='sdk-input-validation','AGENT_LIVE_OBSERVATION');
}
export function createAuthorizedLiveRun(directory,plan,payload,config,{readProfile=profile}={}){
 checkApproved(plan,payload);const p=readProfile(plan.profilePath);let identity;
 try{identity=profileIdentity(p);assert(identity.owner===plan.owner&&identity.accountId===plan.accountId&&identity.packageId===plan.packageId
  &&identity.delegatePublicKeyHex===plan.delegatePublicKeyHex,'AGENT_LIVE_PROFILE_BINDING');}finally{p.delegatePrivateKey='';}
 assert(config.packageId===identity.packageId&&config.network==='mainnet'&&config.suiTransport==='grpc','AGENT_DEPLOYMENT');
 const m={schema:1,mode:'live-walrus-replay',runId:randomUUID(),...identity,workspace:plan.workspace,
  datasetId:loadOfflineActivity('saved').datasetId,source:'replay',namespaces:{rules:plan.workspace+'-rules',experience:plan.workspace+'-experience'},maxUSD:0,
  expiresAt:new Date(Date.now()+3600000).toISOString(),admission:{kind:'managed-production-approved',accountId:identity.accountId,
   delegatePublicKeyHex:identity.delegatePublicKeyHex,checkedAt:new Date().toISOString(),maxUSD:0,planHash:runHash(plan),
   payloadHash:payloadHash(payload),failureId:payload.failure.id,profileHash:runHash(identity),deploymentHash:deploymentHash(config)}};
 createAgentRun(directory,m,{live:true});exclusiveRunFile(directory,'agent-live-authorization.json',{
  schema:1,approval:'user-explicit-bounded-live-trial',approvedAt:new Date().toISOString(),plan,payload,payloadText:JSON.stringify(payload,null,2)+'\n'});return m;
}
export function liveAuthorization(directory){
 const gate=new AgentRunGate(directory,{live:true}),m=gate.manifest,auth=privateRead(join(directory,'agent-live-authorization.json'));
 exactKeys(auth,['schema','approval','approvedAt','plan','payload','payloadText']);
 assert(auth.schema===1&&auth.approval==='user-explicit-bounded-live-trial','AGENT_LIVE_APPROVAL_REQUIRED');checkApproved(auth.plan,auth.payload,auth.payloadText);
 assert(runHash(auth.plan)===m.admission.planHash&&digest(auth.payloadText)===m.admission.payloadHash
  &&auth.payload.failure.id===m.admission.failureId&&auth.plan.workspace===m.workspace,'AGENT_LIVE_APPROVAL_BINDING');return {gate,auth};
}
export async function openLiveAgent(directory){
 const {gate,auth}=liveAuthorization(directory),m=gate.manifest,transport=globalThis.fetch;
 return openInjectedAgent(directory,{live:true,capture:true,transport,createSdk:async()=>{
  const p=profile(auth.plan.profilePath);
  try{assert(runHash(profileIdentity(p))===m.admission.profileHash,'AGENT_LIVE_PROFILE_CHANGED');
   return MemWal.create({key:p.delegatePrivateKey,accountId:m.accountId,namespace:m.namespaces.rules,serverUrl:WALRUS_RELAY,
    requestTimeoutMs:15000,recallTimeoutMs:45000,preflightTimeoutMs:8000});}finally{p.delegatePrivateKey='';}
 }});
}
export async function preflightAndSeed(directory,open=openLiveAgent){
 const {auth}=liveAuthorization(directory);let runtime;
 try{
  runtime=await open(directory);const rules=await runtime.ports.rules.inventory(),experience=await runtime.ports.experience.inventory();
  assert(rules.blobIds.length===0&&experience.blobIds.length===0,'AGENT_LIVE_SCOPE_NOT_EMPTY');
  assert(runtime.gate.state().writes===0&&runtime.gate.state().reads===0,'AGENT_LIVE_NOT_FRESH');
  exclusiveRunFile(directory,'agent-live-preflight.json',{manifestHash:runtime.gate.hash,checkedAt:new Date().toISOString(),
   emptyNamespaces:true,accountAuthorized:true,admissionBasis:'official-managed-sponsorship+matched-signed-account+guarded-production-deployment'});
  const receipt=await runtime.experience.write(auth.payload.failure.record);
  assert(receipt.id===auth.payload.failure.id&&typeof receipt.blobId==='string','AGENT_SEED_RECEIPT');
  exclusiveRunFile(directory,'seed-receipt.json',{schema:1,manifestHash:runtime.gate.hash,recordId:receipt.id,blobId:receipt.blobId});
  return {receipt,counters:runtime.gate.state()};
 }catch(error){runtime?.gate.stop('AGENT_LIVE_SEED_STOPPED');throw error;}finally{runtime?.close();}
}
export function prepareLiveModelProbe(directory,plan){
 privateDirectory(directory);const {gate,auth}=liveAuthorization(directory);
 assert(plan.schema===1&&plan.dataMode==='live-walrus-replay'&&plan.model==='gpt-5.6-luna'&&plan.tasks.length===1
  &&plan.tasks[0].text===auth.payload.ordinaryTask,'AGENT_NATIVE_APPROVED_TASK');
 const seed=privateRead(join(directory,'seed-receipt.json'));
 assert(seed.manifestHash===gate.hash&&seed.recordId===gate.manifest.admission.failureId
  &&gate.state().writes===1&&gate.state().reads===0,'AGENT_NATIVE_SEED_REQUIRED');mkdirSync(join(directory,'client'),{mode:0o700});
}
export function reserveLiveNativeTurn(directory,plan){
 const {gate,auth}=liveAuthorization(directory);assert(plan.model===auth.plan.limits.model&&plan.tasks.length===1
  &&plan.dataMode==='live-walrus-replay'&&plan.tasks[0].text===auth.payload.ordinaryTask,'AGENT_NATIVE_LIMIT');
 exclusiveRunFile(directory,'agent-native-turn.json',{schema:1,manifestHash:gate.hash,model:plan.model,
  taskHash:digest(plan.tasks[0].text),reservedAt:new Date().toISOString(),maximumUserTurns:1});
}
