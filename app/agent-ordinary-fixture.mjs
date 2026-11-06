// Explicit synthetic implementation of the ordinary contract. Never uses a real profile/key.
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {MemWal} from '@mysten-incubation/memwal';
import {SuiGrpcClient} from '@mysten/sui/grpc';
import {UnaryCall} from '@protobuf-ts/runtime-rpc';
import {StdioServerTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import {assert,canonical} from '../src/domain.ts';
import {address} from './activity.ts';
import {TatumData,ENDPOINTS} from './tatum.ts';
import {tatumKeyHash} from './activity-live.ts';
import {FIXTURE_WALLET,FIXTURE_DIGESTS,fixtureTransaction} from './activity-fixtures.ts';
import {createOrdinaryWorkspace,createOrdinaryRun,ordinaryAuthorization,openInjectedOrdinary} from './agent-ordinary.mjs';
import {privateRead} from './agent-run.mjs';
import {fixtureSdk,fixtureTransport} from './agent-provider-fixture.mjs';

export const SYNTHETIC_TATUM_KEY='public-offline-ordinary-tatum-sentinel';
export function ordinaryFixtureConsent(captureConsent=true){return {kind:'offline-synthetic',captureConsent,checkedAt:new Date().toISOString(),
 tatum:{accountId:'0'.repeat(24),plan:'FREE',remainingCredits:100,creditsPerCall:2,keySha256:tatumKeyHash(SYNTHETIC_TATUM_KEY)}};}
export async function createOrdinaryFixture(directory,{captureConsent=true}={}){
 const sdk=MemWal.create({key:'01'.repeat(32),accountId:address('0x10')});let publicKey;
 try{publicKey=await sdk.getPublicKeyHex();}finally{sdk.destroy();}
 createOrdinaryWorkspace(directory,{owner:FIXTURE_WALLET,accountId:address('0x10'),delegatePublicKeyHex:publicKey,
  packageId:address('0x20'),workspace:'agent-'+randomUUID()});
 const m=createOrdinaryRun(directory,ordinaryFixtureConsent(captureConsent));
 writeFileSync(join(directory,'synthetic-relayer.json'),canonical({revision:0,records:[],jobs:{},requests:[]}),{mode:0o600,flag:'wx'});
 writeFileSync(join(directory,'synthetic-tatum.json'),canonical({requests:[],closedClients:0}),{mode:0o600,flag:'wx'});return m;
}
export function syntheticTatum(directory,options={}){
 return async({network,method,key})=>{
  assert(network==='mainnet'&&method==='sui.rpc.v2.LedgerService/BatchGetTransactions'
   &&ENDPOINTS.mainnet==='https://sui-mainnet-grpc.gateway.tatum.io'&&key===SYNTHETIC_TATUM_KEY,'OFFLINE_TATUM_SCOPE');
  // Installed generated Sui client serializes the real public request; every response is fabricated.
  const denied=()=>{throw Error('OFFLINE_TATUM_METHOD')};
  const transport={serverStreaming:denied,clientStreaming:denied,duplex:denied,
   mergeOptions:value=>({...value,meta:{'x-api-key':key,...value?.meta}}),unary:(rpc,input,callOptions)=>{
   assert(rpc.name==='BatchGetTransactions','OFFLINE_TATUM_METHOD');
   assert(callOptions.timeout===10000&&callOptions.abort instanceof AbortSignal,'OFFLINE_TATUM_TIMEOUT');
   assert(callOptions.meta['x-api-key']===SYNTHETIC_TATUM_KEY,'OFFLINE_TATUM_KEY_HEADER');
   const request=rpc.I.fromBinary(rpc.I.toBinary(rpc.I.create(input))),state=privateRead(join(directory,'synthetic-tatum.json'));
   state.requests.push({network,endpoint:ENDPOINTS.mainnet,method:rpc.name,digests:request.digests,readMask:request.readMask.paths});
   assert(state.requests.length<=32,'OFFLINE_TATUM_TRACE_LIMIT');
   writeFileSync(join(directory,'synthetic-tatum.json'),canonical(state),{mode:0o600});
   const response=options.fail?Promise.reject(Error('SYNTHETIC_TATUM_FAILURE')):Promise.resolve({transactions:request.digests.map(id=>{
    const index=FIXTURE_DIGESTS.indexOf(id);assert(index>=0,'SYNTHETIC_TRANSACTION_UNAVAILABLE');
    return {result:{oneofKind:'transaction',transaction:options.transactionReply?options.transactionReply(index):fixtureTransaction(index)}};
   })});
   return new UnaryCall(rpc,callOptions.meta??{},input,Promise.resolve({}),response,
    Promise.resolve({code:'OK',detail:''}),Promise.resolve({}));
  }};
  const client=new SuiGrpcClient({network,transport});
  const data=new TatumData(client,network,()=>{
   const state=privateRead(join(directory,'synthetic-tatum.json'));state.closedClients++;
   writeFileSync(join(directory,'synthetic-tatum.json'),canonical(state),{mode:0o600});
  });
  // The real normalizer is exercised; fabricated facts stay labelled fixture even in CSV/memory.
  return {close:()=>data.close(),transactions:async ids=>(await data.transactions(ids)).map(tx=>({...tx,source:'fixture'}))};
 };
}
export async function openOrdinaryFixture(directory,options={}){
 const {manifest}=ordinaryAuthorization(directory);
 return openInjectedOrdinary(directory,{createSdk:fixtureSdk,transport:fixtureTransport(directory,{...options,manifest}),
  createData:syntheticTatum(directory,options),tatumKey:options.tatumKey??SYNTHETIC_TATUM_KEY,wait:async()=>{}});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let runtime;
 try{
  const [mode,directory,...rest]=process.argv.slice(2);assert(['--prepare','--mcp'].includes(mode)&&directory,'ORDINARY_OFFLINE_FIXTURE_ONLY');
  // No native channel, real fetch fallback, account login or credential reader exists in this entry.
  globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
  if(mode==='--prepare'){
   assert(rest.length===0||(rest.length===1&&rest[0]==='--capture'),'ORDINARY_OFFLINE_FIXTURE_ONLY');
   const m=await createOrdinaryFixture(directory,{captureConsent:rest.includes('--capture')});
   console.log(JSON.stringify({mode:'offline-ordinary-provider-fixture',workspace:m.workspace,runId:m.runId,
    synthetic:true,realProviderCalls:0,modelCalls:0},null,2));
  }else{
   assert(rest.length===0,'ORDINARY_OFFLINE_FIXTURE_ONLY');runtime=await openOrdinaryFixture(directory);
   let closing=false;
   const close=()=>{if(closing)return;closing=true;runtime.close();runtime.server.close().finally(()=>process.exit(0));};
   process.stdin.once('end',close);process.once('SIGTERM',close);process.once('SIGINT',close);
   await runtime.server.connect(runtime.observe(new StdioServerTransport()));
  }
 }catch(error){runtime?.close();const reason=error?.code??error?.message;
  console.error(typeof reason==='string'&&/^[A-Z0-9_]+$/.test(reason)?reason:'ORDINARY_OFFLINE_FIXTURE_FAILED');process.exitCode=1;}
}
