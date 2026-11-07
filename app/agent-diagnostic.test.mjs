import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,readFileSync,existsSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAgentFixture,openAgentFixture,fixtureSdk,fixtureTransport} from './agent-provider-fixture.mjs';
import {AgentRunGate,privateRead} from './agent-run.mjs';
import {agentWalrusFetch,WALRUS_RELAY} from './agent-walrus-guard.mjs';
import {recordFirstFailure,diagnosticFile} from './agent-diagnostic.mjs';
import {openInjectedAgent} from './agent-provider.mjs';
import {Fault} from '../src/domain.ts';
import {diagnosticWalkthrough} from './check-agent-diagnostic.mjs';
const temp=()=>mkdtempSync(join(tmpdir(),'recall-diag-test-'));
async function fixture(){const d=temp();await createAgentFixture(d,'fixture');return {d,gate:new AgentRunGate(d)};}
globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
const diag=d=>privateRead(diagnosticFile(d));

test('pretransport admission records a bound first cause without transport or counter increment',async()=>{
 const {d,gate}=await fixture(),now=Date.now;let calls=0;try{
  Date.now=()=>now()+300001;const guarded=agentWalrusFetch(gate,()=>{calls++;});
  await assert.rejects(guarded(WALRUS_RELAY+'/health'),/AGENT_ADMISSION_EXPIRED/);Date.now=now;
  const value=diag(d);assert.equal(value.phase,'admission');assert.equal(value.category,'admission');assert.equal(value.route,'unknown');
  assert.equal(value.faultCode,'AGENT_ADMISSION_EXPIRED');assert.equal(value.requestCount,0);assert.equal(value.manifestHash,gate.hash);
  assert.equal(value.httpStatus,null);assert.equal(calls,0);assert.equal(gate.state().requests,0);assert.equal(gate.state().stopped,'AGENT_PROVIDER_OR_POLICY_ERROR');
  assert.equal(lstatSync(diagnosticFile(d)).mode&0o777,0o600);
 }finally{Date.now=now;rmSync(d,{recursive:true,force:true});}
});

test('HTTP, health and deployment failures distinguish observed numeric status and fixed local codes',async()=>{
 for(const [route,response,code,category] of [
  ['health',new Response('private upstream message',{status:503}),'AGENT_PROVIDER_HTTP','http'],
  ['health',Response.json({status:'ok',writes:'unavailable',write_ready:false}),'AGENT_WRITE_HEALTH','response'],
  ['config',Response.json({network:'mainnet',packageId:'wrong',suiTransport:'grpc'}),'AGENT_CONFIG_SCOPE','response']]){
  const {d,gate}=await fixture();try{const fetch=agentWalrusFetch(gate,async()=>response,{phase:()=> 'startup'});
   await assert.rejects(fetch(WALRUS_RELAY+'/'+route),new RegExp(code));const value=diag(d);
   assert.equal(value.phase,'startup');assert.equal(value.route,route);assert.equal(value.method,'GET');assert.equal(value.category,category);
   assert.equal(value.httpStatus,response.status);assert.equal(value.faultCode,code);assert.equal(value.requestCount,1);
   assert.equal(gate.state().stopped,'AGENT_PROVIDER_OR_POLICY_ERROR');
  }finally{rmSync(d,{recursive:true,force:true});}
 }
});

test('headers, query, body, arbitrary errors and unknown codes cannot leak a secret canary',async()=>{
 const canary='PRIVATE_CANARY_DELEGATE_OR_PROVIDER_TEXT_987654321';
 for(const variant of ['query','header','body','transport','unknown-fault','lookalike-code']){
  const {d,gate}=await fixture();let calls=0;try{
   const fetch=agentWalrusFetch(gate,async()=>{calls++;if(variant==='unknown-fault')throw new Fault(canary);
    if(variant==='lookalike-code')throw Object.assign(Error(canary),{code:'AGENT_PROVIDER_HTTP'});throw Error(canary);});
   const url=WALRUS_RELAY+'/health'+(variant==='query'?'?'+canary:'');
   const options=variant==='header'?{headers:{authorization:'Bearer '+canary}}:variant==='body'?{method:'POST',body:canary}:{};
   await assert.rejects(fetch(url,options));const value=diag(d),text=readFileSync(diagnosticFile(d),'utf8');
   assert(!text.includes(canary));assert(!text.includes('Bearer'));assert(!text.includes('https:'));assert(!text.includes('body'));
   if(['query','header','body'].includes(variant)){assert.equal(value.route,'unknown');assert.equal(calls,0);}
   else{assert.equal(value.route,'health');assert.equal(value.category,'transport');assert.equal(value.faultCode,null);assert.equal(value.httpStatus,null);}
   assert.equal(gate.state().stopped,'AGENT_PROVIDER_OR_POLICY_ERROR');
  }finally{rmSync(d,{recursive:true,force:true});}
 }
});

test('duplicate or failed diagnostic writes preserve primary rejection, first bytes and ledger stopping',async()=>{
 const a=await fixture();try{
  const fetch=agentWalrusFetch(a.gate,async()=>new Response('{}',{status:503}));await assert.rejects(fetch(WALRUS_RELAY+'/health'),/AGENT_PROVIDER_HTTP/);
  const first=readFileSync(diagnosticFile(a.d));assert.equal(recordFirstFailure(a.gate,{faultCode:'AGENT_RUNTIME_CLOSED'}),'already-attempted');
  assert.deepEqual(readFileSync(diagnosticFile(a.d)),first);
  const other={directory:a.d,hash:a.gate.hash,manifest:a.gate.manifest,state:()=>a.gate.state()};
  assert.equal(recordFirstFailure(other,{faultCode:'AGENT_RUNTIME_CLOSED'}),'already-recorded');assert.deepEqual(readFileSync(diagnosticFile(a.d)),first);
  assert.equal(a.gate.state().stopped,'AGENT_PROVIDER_OR_POLICY_ERROR');
 }finally{rmSync(a.d,{recursive:true,force:true});}
 const b=await fixture();try{mkdirSync(diagnosticFile(b.d),{mode:0o700});const fetch=agentWalrusFetch(b.gate,async()=>new Response('{}',{status:503}));
  await assert.rejects(fetch(WALRUS_RELAY+'/health'),/AGENT_PROVIDER_HTTP/);assert.equal(b.gate.state().stopped,'AGENT_PROVIDER_OR_POLICY_ERROR');
  rmSync(diagnosticFile(b.d),{recursive:true});assert.equal(recordFirstFailure(b.gate,{faultCode:'AGENT_RUNTIME_CLOSED'}),'already-attempted');assert(!existsSync(diagnosticFile(b.d)));
 }finally{rmSync(b.d,{recursive:true,force:true});}
});

test('late-close rejection records lifecycle evidence without adding network or changing existing idle-close stop semantics',async()=>{
 const d=temp();let r;try{await createAgentFixture(d,'fixture');r=await openAgentFixture(d);const captured=globalThis.fetch,before=r.gate.state().requests;r.close();
  await assert.rejects(async()=>captured(WALRUS_RELAY+'/health'),/AGENT_RUNTIME_CLOSED/);const value=diag(d);
  assert.equal(value.phase,'late-close');assert.equal(value.category,'lifecycle');assert.equal(value.faultCode,'AGENT_RUNTIME_CLOSED');assert.equal(value.route,'unknown');
  assert.equal(r.gate.state().requests,before);assert.equal(r.gate.state().stopped,null);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('startup transport rejection preserves the original safe cause over outer SDK cleanup',async()=>{
 const d=temp();let release;try{await createAgentFixture(d,'fixture');const transport=fixtureTransport(d);
  const opening=openInjectedAgent(d,{capture:true,createSdk:async m=>{const sdk=fixtureSdk(m);const method=sdk.getPublicKeyHex.bind(sdk);
   sdk.getPublicKeyHex=async()=>{const key=await method();return key;};return sdk;},transport:async(...args)=>{
   if(String(args[0]).endsWith('/health'))return new Promise((resolve,reject)=>{release=()=>reject(Error('LATE_PRIVATE_TEXT'));});return transport(...args);
  }});
  // A rejected transport must remain the first cause when outer startup handling stops and closes the SDK.
  while(!release)await new Promise(resolve=>setImmediate(resolve));release();await assert.rejects(opening,/LATE_PRIVATE_TEXT/);
  const value=diag(d);assert.equal(value.phase,'startup');assert.equal(value.route,'health');assert.equal(value.category,'transport');assert.equal(value.faultCode,null);
  assert.equal(privateRead(join(d,'agent-ledger.json')).stopped,'AGENT_PROVIDER_OR_POLICY_ERROR');assert(!readFileSync(diagnosticFile(d),'utf8').includes('LATE_PRIVATE_TEXT'));
 }finally{rmSync(d,{recursive:true,force:true});}
});

test('second independent SDK process fails after remember and preserves original HTTP cause through initialization wrapping',async()=>{
 const r=await diagnosticWalkthrough();assert.equal(r.independentProcesses,2);assert.equal(r.before.writes,1);assert.equal(r.after.writes,1);
 assert.equal(r.diagnostic.phase,'startup');assert.equal(r.diagnostic.httpStatus,503);assert.equal(r.diagnostic.faultCode,'AGENT_PROVIDER_HTTP');
 assert.equal(r.diagnostic.contextHash.length,64);assert.equal(r.ledgerSchemaUnchanged,true);assert.equal(r.actualProviderCalls,0);assert.equal(r.actualModelCalls,0);
});

test('busy close keeps its original stop and first artifact when the pending SDK call later fails',async()=>{
 const d=temp();let r,release;try{await createAgentFixture(d,'fixture');const transport=fixtureTransport(d);
  r=await openInjectedAgent(d,{capture:true,createSdk:fixtureSdk,transport:async(...args)=>{
   if(String(args[0]).endsWith('/api/recall'))return new Promise((resolve,reject)=>{release=()=>reject(Error('PRIVATE_LATE_FAILURE'));});
   return transport(...args);
  }});
  const pending=r.ports.experience.recall('offline lifecycle check',20);pending.catch(()=>{});
  while(!release)await new Promise(resolve=>setImmediate(resolve));
  r.close();const first=readFileSync(diagnosticFile(d));release();await assert.rejects(pending,/PRIVATE_LATE_FAILURE/);
  assert.deepEqual(readFileSync(diagnosticFile(d)),first);const value=diag(d);
  assert.equal(value.phase,'close');assert.equal(value.faultCode,'AGENT_CLIENT_CLOSED_DURING_ACTION');
  assert.equal(r.gate.state().stopped,'AGENT_CLIENT_CLOSED_DURING_ACTION');
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});
