import test from 'node:test';import assert from 'node:assert/strict';
import{mkdtempSync,rmSync,readFileSync,writeFileSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';
import{createOwnFixture,openOwnFixture,ownFixturePorts,OWN_FIXTURE_IDS}from'./agent-own-fixture.mjs';import{ownAuthorization,openOwnAccount}from'./agent-own.mjs';import{validateAgentManifest,privateRead}from'./agent-run.mjs';import{FIXTURE_WALLET}from'./activity-fixtures.ts';
const dir=()=>mkdtempSync(join(tmpdir(),'recall-own-budget-')),save=(p,v)=>writeFileSync(p,JSON.stringify(v),{mode:0o600});
test('explicit request-budget session works after long pauses and restarts without resetting counts or facts',async()=>{
 const d=dir(),clock=Date.now,abort=AbortSignal.timeout;let runtime;const timeouts=[];
 try{
  await createOwnFixture(d,{requestBudgetOnly:true});let a=ownAuthorization(d,{fixture:true});assert.equal(a.manifest.schema,2);assert.equal(a.manifest.expiresAt,null);assert.equal(a.context.clientModel,'gpt-5.6-luna');
  Date.now=()=>clock()+86400000*3;AbortSignal.timeout=ms=>{timeouts.push(ms);return abort(ms);};
  let dataDeadline='not-called';const ports=ownFixturePorts(d),create=ports.createData;ports.createData=args=>{dataDeadline=args.deadline;return create(args);};
  runtime=await openOwnAccount(d,ports,{fixture:true});const first=await runtime.session.prepare('mainnet',FIXTURE_WALLET,[OWN_FIXTURE_IDS[0]]);assert.equal(dataDeadline,undefined);assert.equal(runtime.gate.state().writes,1);const before=runtime.gate.state();runtime.close();runtime=undefined;
  Date.now=()=>clock()+86400000*30;runtime=await openOwnFixture(d);const second=await runtime.session.prepare('mainnet',FIXTURE_WALLET,[OWN_FIXTURE_IDS[0]]);const after=runtime.gate.state();
  assert.equal(after.tatumBatches,before.tatumBatches+1);assert.equal(after.writes,1);assert(after.requests>before.requests);assert.equal(after.stopped,null);assert.equal(second.historicalObservations.length,1);assert.equal(second.historicalObservations[0].comparison,'same');
  assert(timeouts.length>0&&timeouts.every(ms=>Number.isFinite(ms)&&ms>0&&ms<=45000));assert(timeouts.includes(15000));
 }finally{runtime?.close();Date.now=clock;AbortSignal.timeout=abort;rmSync(d,{recursive:true,force:true});}
});
test('request budgets and uncertain writes remain hard stops without a session deadline',async()=>{
 for(const variant of ['tatum','requests','write-uncertain']){const d=dir();let r;try{
  await createOwnFixture(d,{requestBudgetOnly:true});r=await openOwnFixture(d,variant==='write-uncertain'?{failAfterAccepted:true}:{});
  if(variant==='write-uncertain')await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[OWN_FIXTURE_IDS[0]]));
  else{const path=join(r.gate.directory,'agent-ledger.json'),s=r.gate.state();s[variant==='tatum'?'tatumBatches':'requests']=variant==='tatum'?8:192;save(path,s);await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[OWN_FIXTURE_IDS[0]]));}
  const spent=r.gate.state();assert(spent.stopped);if(variant==='write-uncertain'){assert.equal(spent.writes,1);assert(spent.intents.some(i=>i.state!=='done'));}
  r.close();r=undefined;await assert.rejects(openOwnFixture(d));
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}}
});
test('legacy timed sessions expire and request-budget policy cannot leak into legacy or managed manifests',async()=>{
 const d=dir(),clock=Date.now;try{
  await createOwnFixture(d);const a=ownAuthorization(d,{fixture:true});Date.now=()=>clock()+86400000;
  await assert.rejects(openOwnFixture(d));Date.now=clock;
  assert.throws(()=>validateAgentManifest({...a.manifest,schema:2,expiresAt:null},{ordinary:false,live:false}),/AGENT_/);
  const c=privateRead(join(d,'own-account-context.json'));c.schema=2;c.expiresAt=null;save(join(d,'own-account-context.json'),c);assert.throws(()=>ownAuthorization(d,{fixture:true}),/OWN_REQUEST_BUDGET_POLICY|OWN_|INVALID_KEYS/);
 }finally{Date.now=clock;rmSync(d,{recursive:true,force:true});}
});
test('bound model changes and malformed null-deadline policies reject before credential/provider factories',async()=>{
 for(const variant of ['model','legacy-null']){const d=dir();try{
  await createOwnFixture(d,{requestBudgetOnly:true});const file=join(d,'own-account-context.json'),c=privateRead(file);if(variant==='model')c.clientModel='gpt-other';else c.schema=1;save(file,c);
  let calls=0;const no=()=>{calls++;throw Error('MUST_NOT_CALL');};await assert.rejects(openOwnAccount(d,{createSdk:no,transport:no,createData:no,readKey:no,identity:no},{fixture:true}));assert.equal(calls,0);
 }finally{rmSync(d,{recursive:true,force:true});}}
});
