import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {InMemoryTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/inMemory.js';
import {createAgentFixture,fixtureSdk,fixtureTransport} from './agent-provider-fixture.mjs';
import {createAuthorizedLiveRun,preflightAndSeed,prepareLiveModelProbe,reserveLiveNativeTurn,liveAuthorization} from './agent-live.mjs';
import {AgentRunGate,privateRead} from './agent-run.mjs';
import {openInjectedAgent} from './agent-provider.mjs';
import {canonical} from '../src/domain.ts';
import {loadOfflineActivity} from './agent-activity-index.ts';
const directory=()=>mkdtempSync(join(tmpdir(),'recall-live-admission-offline-'));
globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
async function setup(d,mutate=p=>p){
 const scratch=directory();let base;try{base=await createAgentFixture(scratch);}finally{rmSync(scratch,{recursive:true,force:true});}
 const payload=JSON.parse(readFileSync(new URL('../evidence/agent-live-preparation-2026-11-06/payload.json',import.meta.url),'utf8'));
 const approved=JSON.parse(readFileSync(new URL('../evidence/agent-live-preparation-2026-11-06/plan.json',import.meta.url),'utf8'));
 const plan=mutate({...approved,owner:base.owner,accountId:base.accountId,packageId:base.packageId,delegatePublicKeyHex:base.delegatePublicKeyHex});
 const config={network:'mainnet',packageId:base.packageId,suiTransport:'grpc',suiGrpcUrl:'https://mysten-rpc.mainnet.sui.io',suiRpcUrl:'https://rpc-mainnet.suiscan.xyz'};
 const profile={walletAddress:base.owner,accountId:base.accountId,packageId:base.packageId,delegatePublicKeyHex:base.delegatePublicKeyHex,delegatePrivateKey:'01'.repeat(32)};
 createAuthorizedLiveRun(d,plan,payload,config,{readProfile:()=>({...profile})});
 writeFileSync(join(d,'synthetic-relayer.json'),canonical({revision:0,records:[],jobs:{},requests:[]}),{mode:0o600});
 const open=run=>openInjectedAgent(run,{live:true,capture:true,createSdk:fixtureSdk,transport:fixtureTransport(run,{configReply:config}),wait:async()=>{}});
 return {plan,payload,config,open};
}
test('live branch with intercepted real SDK preserves native error ID and one durable model permit',async()=>{
 const d=directory();let r,client;try{
  const f=await setup(d);assert.throws(()=>new AgentRunGate(d),/AGENT_OFFLINE_ONLY/);
  const seed=await preflightAndSeed(d,f.open);assert.equal(seed.receipt.id,f.payload.failure.id);assert.equal(seed.counters.writes,1);assert.equal(seed.counters.reads,0);
  const plan={schema:1,dataMode:'live-walrus-replay',model:'gpt-5.6-luna',tasks:[{id:'test',chat:'fresh',text:f.payload.ordinaryTask}]};
  prepareLiveModelProbe(d,plan);reserveLiveNativeTurn(d,plan);assert.throws(()=>reserveLiveNativeTurn(d,plan),/EEXIST/);
  r=await f.open(d);const [wire,serverWire]=InMemoryTransport.createLinkedPair();await r.server.connect(r.observe(serverWire));
  client=new Client({name:'offline-live-contract',version:'1'});await client.connect(wire);
  const tools=(await client.listTools()).tools,rows=tools.find(t=>t.name==='find_wallet_activity')._meta['recall/verifiedExperience'];
  assert.equal(rows.length,1);assert.equal(rows[0].id,f.payload.failure.id);
  const result=await client.callTool({name:'find_wallet_activity',arguments:{network:'mainnet',wallet:loadOfflineActivity('saved').examples().senders[0],limit:10}});
  assert.equal(Boolean(result.isError),false);assert.equal(result._meta['recall/observation'].verdict,'resolved');
  const records=await r.experience.read();assert.equal(records.length,2);assert.equal(records[1].record.supersedes,records[0].id);
  assert.equal(r.gate.state().writes,2);assert.equal(r.gate.state().reads,2);assert.equal(r.gate.state().tatumBatches,0);
 }finally{await client?.close();r?.close();rmSync(d,{recursive:true,force:true});}
});
test('increased live limits and changed task are refused',async()=>{
 for(const limits of [{newModelUserTurns:2},{walrusWrites:3},{additionalSpendUSD:1}]){
  const d=directory();try{await assert.rejects(setup(d,p=>({...p,limits:{...p.limits,...limits}})),/AGENT_LIVE_LIMITS/);}finally{rmSync(d,{recursive:true,force:true});}
 }
 const d=directory();try{const f=await setup(d);await preflightAndSeed(d,f.open);
  assert.throws(()=>prepareLiveModelProbe(d,{schema:1,dataMode:'live-walrus-replay',model:'gpt-5.6-luna',tasks:[{text:'changed'}]}),/AGENT_NATIVE_APPROVED_TASK/);
 }finally{rmSync(d,{recursive:true,force:true});}
});
test('live write requires account preflight and resolution requires the native permit',async()=>{
 const d=directory();let r;try{const f=await setup(d);r=await f.open(d);
  await assert.rejects(r.experience.write(f.payload.failure.record),/ENOENT/);assert.equal(r.gate.state().writes,0);
 }finally{r?.close();r=undefined;rmSync(d,{recursive:true,force:true});}
 const d2=directory();try{const f=await setup(d2),seed=await preflightAndSeed(d2,f.open);r=await f.open(d2);
  await assert.rejects(r.experience.write({...f.payload.failure.record,attempted:10,verdict:'resolved',evidence:'successful-tool-call',supersedes:seed.receipt.id}),/ENOENT/);
  assert.equal(r.gate.state().writes,1);
 }finally{r?.close();rmSync(d2,{recursive:true,force:true});}
});
test('deployment change is refused despite the approved unused JSON-RPC metadata',async()=>{
 const d=directory();try{const f=await setup(d);
  await assert.rejects(openInjectedAgent(d,{live:true,capture:true,createSdk:fixtureSdk,transport:fixtureTransport(d,{configReply:{...f.config,suiRpcUrl:'https://evil.invalid'}})}),/AGENT_CONFIG_SCOPE/);
  assert.equal(privateRead(join(d,'agent-ledger.json')).writes,0);
 }finally{rmSync(d,{recursive:true,force:true});}
});
test('changed authorization and occupied namespaces stop before a live submission',async()=>{
 const d=directory();try{await setup(d);const auth=privateRead(join(d,'agent-live-authorization.json'));auth.plan.profilePath='/private/tmp/changed';
  writeFileSync(join(d,'agent-live-authorization.json'),canonical(auth));assert.throws(()=>liveAuthorization(d),/AGENT_LIVE_APPROVAL_BINDING/);
 }finally{rmSync(d,{recursive:true,force:true});}
 const d2=directory();try{const f=await setup(d2),m=privateRead(join(d2,'agent-run.json'));
  const backend=privateRead(join(d2,'synthetic-relayer.json'));backend.records=[{namespace:m.namespaces.experience,blob_id:'a'.repeat(43),text:'{}'}];backend.revision=1;
  writeFileSync(join(d2,'synthetic-relayer.json'),canonical(backend));await assert.rejects(preflightAndSeed(d2,f.open),/AGENT_LIVE_SCOPE_NOT_EMPTY/);
  assert.equal(privateRead(join(d2,'agent-ledger.json')).writes,0);
 }finally{rmSync(d2,{recursive:true,force:true});}
});
