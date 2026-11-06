// Offline-only synthetic relayer. All SDK signing/Seal code is real; wire replies are fabricated.
import {randomUUID,createHash} from 'node:crypto';
import {existsSync,writeFileSync,renameSync,mkdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {MemWal} from '@mysten-incubation/memwal';
import {BatchGetObjectsResponse} from './node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/ledger_service.mjs';
import {StdioServerTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import {assert,canonical} from '../src/domain.ts';
import {address} from './activity.ts';
import {FIXTURE_WALLET} from './activity-fixtures.ts';
import {loadOfflineActivity} from './agent-activity-index.ts';
import {createAgentRun,privateRead} from './agent-run.mjs';
import {openInjectedAgent} from './agent-provider.mjs';
import {WALRUS_RELAY,SUI_SEAL_ORIGIN} from './agent-walrus-guard.mjs';
const syntheticKey='01'.repeat(32);
export function fixtureSdk(m){return MemWal.create({key:syntheticKey,accountId:m.accountId,namespace:m.namespaces.rules,
 serverUrl:WALRUS_RELAY,requestTimeoutMs:15000,recallTimeoutMs:45000,preflightTimeoutMs:8000});}
export async function createAgentFixture(directory,source='replay'){
 const workspace='agent-'+randomUUID(),index=loadOfflineActivity(source==='replay'?'saved':'fixture');
 const sdk=MemWal.create({key:syntheticKey,accountId:address('0x10')});let publicKey;
 try{publicKey=await sdk.getPublicKeyHex();}finally{sdk.destroy();}
 const m={schema:1,mode:'offline-sdk-fixture',runId:randomUUID(),owner:FIXTURE_WALLET,accountId:address('0x10'),
  delegatePublicKeyHex:publicKey,packageId:address('0x20'),workspace,datasetId:index.datasetId,source,
  namespaces:{rules:workspace+'-rules',experience:workspace+'-experience'},maxUSD:0,
  expiresAt:new Date(Date.now()+3600000).toISOString(),admission:{kind:'offline-synthetic',accountId:address('0x10'),
   delegatePublicKeyHex:publicKey,checkedAt:new Date().toISOString(),maxUSD:0}};
 createAgentRun(directory,m);
 writeFileSync(join(directory,'synthetic-relayer.json'),canonical({revision:0,records:[],jobs:{},requests:[]}),{flag:'wx',mode:0o600});return m;
}
function frame(type,data){const bytes=new Uint8Array(5+data.length);bytes[0]=type;new DataView(bytes.buffer).setUint32(1,data.length);bytes.set(data,5);return bytes;}
export function fixtureTransport(directory,options={}){
 const m=privateRead(join(directory,'agent-run.json')),path=join(directory,'synthetic-relayer.json');
 return async(input,init={})=>{
  const url=new URL(input);assert([WALRUS_RELAY,SUI_SEAL_ORIGIN].includes(url.origin),'OFFLINE_ROUTE');
  const lock=join(directory,'.synthetic-relayer-lock');mkdirSync(lock,{mode:0o700});
  try{
   const state=privateRead(path),body=url.origin===WALRUS_RELAY&&typeof init.body==='string'?JSON.parse(init.body):undefined;
   const headers=new Headers(init.headers);
   state.requests.push({path:url.pathname,method:init.method??'GET',namespace:body?.namespace??null,
    signed:Boolean(headers.get('x-signature')),seal:Boolean(headers.get('x-seal-session'))});
   assert(state.requests.length<=64,'FIXTURE_REQUEST_LIMIT');
   let response;
   if(options.failPath===url.pathname)response=new Response('{}',{status:503});
   else if(url.origin===SUI_SEAL_ORIGIN){
    const message=BatchGetObjectsResponse.toBinary(BatchGetObjectsResponse.create({objects:[{result:{oneofKind:'object',object:{objectId:m.packageId,version:1n,owner:{kind:4},digest:'1'.repeat(32)}}}]}));
    response=new Response(Buffer.concat([frame(0,message),frame(128,new TextEncoder().encode('grpc-status: 0\r\n'))]),{headers:{'content-type':'application/grpc-web+proto'}});
   }else if(url.pathname==='/health')response=Response.json({status:'ok',writes:'ok',write_ready:true});
   else if(url.pathname==='/version')response=Response.json({apiVersion:'1.0.0',relayerVersion:'offline-synthetic',minSupportedSdk:{typescript:'0.0.4'}});
   else if(url.pathname==='/config')response=Response.json(options.configReply??{network:'mainnet',packageId:m.packageId,suiTransport:'grpc',suiGrpcUrl:SUI_SEAL_ORIGIN});
   else if(url.pathname==='/api/stats')response=Response.json({owner:m.owner});
   else if(url.pathname.endsWith('/memories'))response=Response.json({snapshot_version:state.revision,must_resync:false,has_more:false,
    memories:state.records.map(r=>({namespace_id:r.namespace,blob_id:r.blob_id,status:'stored'}))});
   else if(url.pathname==='/api/recall'){
    response=Response.json({results:options.omitRecall?[]:state.records.filter(r=>r.namespace===body.namespace).map(({blob_id,text})=>({blob_id,text}))});
    if(options.changeRevisionOnRecall)state.revision++;
   }
   else if(url.pathname==='/api/remember'){
    const blob_id=createHash('sha256').update(body.text).digest('base64url'),job='fixture-'+randomUUID();
    assert(!state.records.some(r=>r.namespace===body.namespace&&r.key===body.idempotency_key),'FIXTURE_UNEXPECTED_RESUBMIT');
    state.records.push({namespace:body.namespace,text:body.text,blob_id,key:body.idempotency_key});state.revision++;
    state.jobs[job]={job_id:job,status:'done',owner:m.owner,namespace:body.namespace,blob_id};
    response=Response.json({job_id:job});
   }else if(url.pathname.startsWith('/api/remember/')){
    const job=state.jobs[url.pathname.split('/').pop()];response=Response.json(options.pendingForever?{job_id:job.job_id,status:'pending'}:job);
   }
   else throw Error('OFFLINE_ROUTE');
   writeFileSync(path+'.next',canonical(state),{flag:'wx',mode:0o600});renameSync(path+'.next',path);
   if(options.failAfterAccepted&&url.pathname==='/api/remember')throw Error('OFFLINE_SIMULATED_ACCEPTED_RESPONSE_LOSS');
   return response;
  }finally{rmSync(lock,{recursive:true});}
 };
}
export async function openAgentFixture(directory,options={}){
 // Every fetch must pass the injected guard; no fallback to the original network.
 return openInjectedAgent(directory,{createSdk:fixtureSdk,transport:fixtureTransport(directory,options),capture:options.capture??true,wait:async()=>{}});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [mode,directory]=process.argv.slice(2);
 try{
  assert(mode==='--mcp'&&directory,'OFFLINE_FIXTURE_ONLY');
  globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
  const r=await openAgentFixture(directory);let closing=false;
  const close=()=>{if(closing)return;closing=true;r.close();r.server.close().finally(()=>process.exit(0));};
  process.stdin.once('end',close);process.once('SIGTERM',close);
  await r.server.connect(r.observe(new StdioServerTransport()));
 }catch(error){console.error(error.code??'OFFLINE_FIXTURE_FAILED');process.exitCode=1;}
}
