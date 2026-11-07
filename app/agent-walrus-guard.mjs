import {assert,canonical} from '../src/domain.ts';
import {rule} from './activity.ts';
import {validateExperience} from './agent-experience.ts';
import {BatchGetObjectsRequest} from './node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/ledger_service.mjs';
import {recordFirstFailure} from './agent-diagnostic.mjs';
import {runHash} from './agent-run.mjs';
import {ownMode} from './agent-own-contract.mjs';

export const WALRUS_RELAY='https://relayer.memory.walrus.xyz';
export const SUI_SEAL_ORIGIN='https://mysten-rpc.mainnet.sui.io';
export const deploymentHash=c=>runHash({network:c.network,packageId:c.packageId,suiTransport:c.suiTransport,
 suiGrpcUrl:c.suiGrpcUrl,suiRpcUrl:c.suiRpcUrl??null});
export function validateTypedRecord(manifest,namespace,record){
 if(manifest.mode==='live-walrus-replay')assert(namespace===manifest.namespaces.experience,'AGENT_LIVE_WRITE_SCOPE');
 if((ownMode(manifest.mode)||['offline-ordinary-provider-fixture','live-ordinary-selected','offline-managed-admission-test'].includes(manifest.mode))&&record.network!==undefined)assert(record.network==='mainnet','AGENT_RECORD_NETWORK');
 if(namespace===manifest.namespaces.rules)return rule(record,{owner:manifest.owner,project:manifest.workspace});
 assert(namespace===manifest.namespaces.experience,'AGENT_NAMESPACE_DENIED');
 validateExperience(record,manifest.workspace);assert(record.source===manifest.source,'AGENT_RECORD_SOURCE');return record;
}
export function agentWalrusFetch(gate,transport,{phase=()=>'action'}={}){
 const m=gate.manifest;
 return async(input,options={})=>{
  let safeRoute='unknown',safeMethod='unknown',httpStatus=null,category='admission';
  try{
   gate.admit();category='validation';
   assert(typeof input==='string'||input instanceof URL,'AGENT_FETCH_INPUT');
   const url=new URL(input),method=options.method??'GET';
   if(['GET','POST'].includes(method))safeMethod=method;
   assert(!url.username&&!url.password&&!url.hash,'AGENT_ROUTE');
   const headers=new Headers(options.headers);
   assert(!headers.has('x-delegate-key')&&!headers.has('authorization'),'AGENT_RAW_CREDENTIAL_DENIED');
   let body,kind,job,remember;
   if(url.origin===WALRUS_RELAY){
    const path=url.pathname,publicRoute=['/version','/health','/config'].includes(path);
    if(!publicRoute)assert(headers.get('x-account-id')===m.accountId&&headers.get('x-public-key')===m.delegatePublicKeyHex
      &&/^[a-f0-9]{128}$/.test(headers.get('x-signature')??'')&&/^[0-9]{10}$/.test(headers.get('x-timestamp')??'')
      &&/^[a-f0-9-]{36}$/.test(headers.get('x-nonce')??''),'AGENT_REQUEST_IDENTITY');
    if(method==='POST'){
     assert(typeof options.body==='string'&&Buffer.byteLength(options.body)<=8192,'AGENT_BODY_SIZE');body=JSON.parse(options.body);
    }
    if(method==='GET'&&publicRoute){assert(!url.search,'AGENT_ROUTE');}
    else if(method==='POST'&&path==='/api/stats'){
     assert(!url.search&&Object.keys(body).length===1&&Object.values(m.namespaces).includes(body.namespace),'AGENT_STATS_SCOPE');
    }else if(method==='GET'&&path==='/v1/owners/'+m.owner+'/memories'){
     assert([...url.searchParams.keys()].every(k=>['limit','updated_after'].includes(k))&&url.searchParams.getAll('limit').length===1
      &&url.searchParams.get('limit')==='100'&&url.searchParams.getAll('updated_after').length<=1
      &&(url.searchParams.get('updated_after')?.length??0)<=1024,'AGENT_INVENTORY_SCOPE');
    }else if(method==='POST'&&path==='/api/recall'){
     assert(!url.search&&Object.values(m.namespaces).includes(body.namespace)&&body.limit===20
      &&typeof body.query==='string'&&body.query.length>0&&body.query.length<=200
      &&Object.keys(body).every(k=>['namespace','query','limit','deadline_ms'].includes(k))
      &&(body.deadline_ms===undefined||(Number.isSafeInteger(body.deadline_ms)&&body.deadline_ms>0&&body.deadline_ms<=45000)), 'AGENT_READ_SCOPE');
     assert(typeof headers.get('x-seal-session')==='string'&&headers.get('x-seal-session').length>0,'AGENT_SEAL_REQUIRED');kind='reads';
    }else if(method==='POST'&&path==='/api/remember'){
     assert(!url.search&&Object.keys(body).sort().join(',')==='idempotency_key,namespace,text'
      &&typeof body.text==='string'&&Buffer.byteLength(body.text)<=4096&&/^[A-Za-z0-9_-]{43}$/.test(body.idempotency_key),'AGENT_WRITE_SCOPE');
     const record=validateTypedRecord(m,body.namespace,JSON.parse(body.text));
     assert(canonical(record)===body.text,'AGENT_WRITE_CANONICAL');
     assert((headers.get('x-seal-session')?.length??0)>0,'AGENT_SEAL_REQUIRED');
     remember={namespace:body.namespace,key:body.idempotency_key,record};
     // A store reservation precedes the submission journal and is consumed at most once.
     assert(gate.lease===remember.namespace&&gate.pending?.key===remember.key,'AGENT_UNRESERVED_WRITE');
    }else if(method==='GET'&&/^\/api\/remember\/[A-Za-z0-9_-]{1,100}$/.test(path)){
     assert(!url.search,'AGENT_ROUTE');job=path.slice('/api/remember/'.length);
    }else assert(false,'AGENT_ROUTE');
   }else{
    assert(url.origin===SUI_SEAL_ORIGIN&&method==='POST'&&url.pathname==='/sui.rpc.v2.LedgerService/BatchGetObjects'
      &&!url.search&&!headers.has('x-seal-session')&&!headers.has('x-account-id')&&!headers.has('x-signature'),'AGENT_ROUTE');
    const text=headers.get('content-type')==='application/grpc-web-text';
    assert(text?typeof options.body==='string'&&options.body.length<=65536&&/^[A-Za-z0-9+/]*={0,2}$/.test(options.body)
      :headers.get('content-type')==='application/grpc-web+proto'&&options.body instanceof Uint8Array&&options.body.length<=65536,'AGENT_GRPC_BODY');
    const frame=text?Buffer.from(options.body,'base64'):options.body;
    if(text)assert(frame.toString('base64')===options.body,'AGENT_GRPC_BODY');
    assert(frame.length>=5&&frame[0]===0&&new DataView(frame.buffer,frame.byteOffset,frame.byteLength).getUint32(1)===frame.length-5,'AGENT_GRPC_FRAME');
    const request=BatchGetObjectsRequest.fromBinary(frame.subarray(5));
    assert(request.requests.length===1&&request.requests[0].objectId===m.packageId,'AGENT_SEAL_PACKAGE_SCOPE');
   }
   // Emit only route enums after the full route/body validation succeeds; rejected URLs remain unknown.
   safeRoute=url.origin===SUI_SEAL_ORIGIN?'seal-package':({'/health':'health','/version':'version','/config':'config',
    '/api/stats':'stats','/api/recall':'recall','/api/remember':'remember'}[url.pathname]??(job?'remember-status':'inventory'));
   gate.request(kind,job);
   if(remember)gate.sent(remember.namespace,remember.key,remember.record);
   const timeout=AbortSignal.timeout(Math.max(1,Math.min(kind==='reads'?45000:15000,
    gate.ownAccount?Date.parse(m.expiresAt)-Date.now():Infinity)));
   category='transport';
   const response=await transport(input,{...options,redirect:'error',signal:options.signal?AbortSignal.any([options.signal,timeout]):timeout});
   httpStatus=response.status;category='http';
   assert(response.ok,'AGENT_PROVIDER_HTTP');category='response';
   if(url.origin===WALRUS_RELAY){
    if(remember){const ack=await response.clone().json();gate.job(ack.job_id);}
    if(url.pathname==='/api/stats'){const value=await response.clone().json();assert(value.owner===m.owner,'AGENT_OWNER_MISMATCH');}
    if(url.pathname==='/health'){const value=await response.clone().json();assert(value.status==='ok'&&value.writes==='ok'&&value.write_ready===true,'AGENT_WRITE_HEALTH');}
    if(url.pathname==='/config'){
     const value=await response.clone().json();
     assert(value.network==='mainnet'&&value.packageId===m.packageId&&value.suiTransport==='grpc'
      &&value.suiGrpcUrl===SUI_SEAL_ORIGIN&&((ownMode(m.mode)||['live-walrus-replay','live-ordinary-selected','offline-managed-admission-test'].includes(m.mode))
        ?deploymentHash(value)===m.admission.deploymentHash:value.suiRpcUrl===undefined),'AGENT_CONFIG_SCOPE');
    }
   }
   return response;
  }catch(error){recordFirstFailure(gate,{phase:phase(),route:safeRoute,method:safeMethod,httpStatus,category,error});
   gate.stop('AGENT_PROVIDER_OR_POLICY_ERROR');throw error;}
 };
}
