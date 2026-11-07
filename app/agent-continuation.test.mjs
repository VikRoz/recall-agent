import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createContinuationFixture,continuationOptions,continuationFixturePorts} from './agent-continuation-fixture.mjs';
import {continuationHappyPath,continuationWalkthrough,continuationTask,originHashes} from './check-agent-continuation.mjs';
import {armManaged,managedPreflightInventory,reserveManagedTurn,completeManagedTurn,admittedManaged,openManaged,checkBaseline,managedFile} from './agent-managed.mjs';
import {baselineRows,validateContinuationBaseline,candidateContinuationBaseline} from './agent-continuation-contract.mjs';
import {evaluateManaged,readContinuation,readContinuationProcess,withTemporaryKey} from './agent-managed-entry.mjs';
import {privateRead,runHash} from './agent-run.mjs';
import {FIXTURE_WALLET} from './activity-fixtures.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const parent=()=>mkdtempSync(join(tmpdir(),'recall-continuation-test-'));
globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
async function setup(p,{reserve=true}={}){
 const f=await createContinuationFixture(p),d=f.directory;armManaged(d,continuationOptions(d));await managedPreflightInventory(d,continuationOptions(d));
 if(reserve)reserveManagedTurn(d,0,continuationTask(f.context),{managedTest:true});return f;
}
const mutate=(d,n,fn)=>{const v=privateRead(join(d,n));fn(v);writeFileSync(join(d,n),JSON.stringify(v),{mode:0o600});};
async function preparedRuntime(d){const r=await openManaged(d,{...continuationOptions(d),native:true});
 try{const c=admittedManaged(d,{managedTest:true}).context;const report=await r.session.prepare('mainnet',FIXTURE_WALLET,[c.plan.publicInputs.transaction]);return {r,report};}
 catch(error){r.close();throw error;}}

test('one continuation MCP process and an independent reader recover exact four records within 1/1/2/64',async()=>{
 const r=await continuationHappyPath();assert.equal(r.counters.requests,36);assert.notEqual(r.nativeMcpPid,r.readerPid);
 assert.equal(r.native.turns.length,1);assert.equal(r.native.turns[0].status,'completed');
});
test('optional refresh spends the second read; independent reader cannot obtain a third or a new allowance',async()=>{
 const r=await continuationWalkthrough();assert.equal(r.exhausted.writes,1);assert.equal(r.exhausted.reads,2);assert(r.exhausted.stopped);
});
test('three-origin payload validation preserves known stop/native provenance and rejects malformed unions',async()=>{
 const p=parent();try{const {context:c}=await createContinuationFixture(p);const base=c.baseline;
  checkBaseline(base,{managedTest:true});assert.equal(baselineRows(base).length,3);
  for(const edit of [b=>b.origins[0].sourceCommit='bad-source',b=>b.origins[1].ledger.stopped='OTHER_STOP',b=>b.origins[1].ledger.intents[0].state='sent',
   b=>b.origins[1].ledger.jobs={},b=>b.origins[1].receipts[Object.keys(b.origins[1].receipts)[0]].sha256='0'.repeat(64),
   b=>b.origins[1].manifest.owner='0x'+'f'.repeat(64),b=>b.origins[1].nativeBudget.turns[1].status='completed',
   b=>b.metadata.expectedBlobIds.pop(),b=>b.origins[1].records[0].id=b.origins[0].records[0].id]){
   const b=structuredClone(base);edit(b);assert.throws(()=>validateContinuationBaseline(b,{managedTest:true}));
  }
  assert.throws(()=>checkBaseline(base,{root}),/CONTINUATION_(EXACT_ORIGINS_REQUIRED|PARENT)/);
 }finally{rmSync(p,{recursive:true,force:true});}
});
test('changed source ledger/native budget or held old lease denies admission without credential reads',async()=>{
 for(const variant of ['ledger','native','lease','journal-lock','journal-pending']){const p=parent();try{const f=await createContinuationFixture(p),d=f.directory,origin=f.priorOrigins[1];
  if(variant==='ledger')mutate(origin.run,'agent-ledger.json',s=>s.requests++);
  if(variant==='native')mutate(origin.run,'native-budget.json',s=>s.turns=[]);
  if(variant==='lease')mkdirSync(join(origin.workspace,'.ordinary-runtime'),{mode:0o700});
  if(variant==='journal-lock')mkdirSync(join(origin.journal,'activity-jobs','.writer-lock'),{mode:0o700});
  if(variant==='journal-pending')writeFileSync(join(origin.journal,'activity-jobs','x'.repeat(43)+'.json'),JSON.stringify({state:'submitting'}),{mode:0o600});
  let reads=0;const ports={...continuationFixturePorts(d),readProfile:()=>{reads++;throw Error('MUST_NOT_READ');}};
  assert.throws(()=>armManaged(d,{managedTest:true,ports}),/MANAGED_PRIOR_CHANGED|CONTINUATION_PRIOR_UNCERTAIN|WRITE_IN_PROGRESS|WRITE_OUTCOME_UNCERTAIN/);assert.equal(reads,0);
 }finally{rmSync(p,{recursive:true,force:true});}}
});
test('missing/corrupt plaintext stops the native MCP before tool exposure, Tatum or writes',async()=>{
 for(const variant of ['missing','corrupt']){const p=parent();let r;try{const {directory:d}=await setup(p);
  mutate(d,'synthetic-relayer.json',s=>{if(variant==='missing')s.records.pop();else s.records[2].text=s.records[2].text.replace('gas-payer','evil');});
  await assert.rejects(openManaged(d,{...continuationOptions(d),native:true}));
  const run=join(d,'runs',privateRead(join(d,'active-run.json')).runId),s=privateRead(join(run,'agent-ledger.json'));
  assert.equal(s.tatumBatches,0);assert.equal(s.writes,0);assert(s.stopped);assert.equal(privateRead(join(d,'synthetic-tatum.json')).requests.length,0);
 }finally{r?.close();rmSync(p,{recursive:true,force:true});}}
});
test('incorrect claim cannot submit a new failure or reserve the resolution-only write',async()=>{
 const p=parent();let r;try{const {directory:d}=await setup(p),opened=await preparedRuntime(d);r=opened.r;
  await assert.rejects(r.session.verifyGasPayer(opened.report.reportId,opened.report.digests[0],FIXTURE_WALLET),/CONTINUATION_RESOLUTION_ONLY/);
  assert.equal(r.gate.state().writes,0);assert.equal(r.gate.state().intents.length,0);
  assert(!privateRead(join(d,'synthetic-relayer.json')).requests.some(x=>x.path==='/api/remember'));
 }finally{r?.close();rmSync(p,{recursive:true,force:true});}
});
test('second Tatum attempt stops before the generated client sends another request',async()=>{
 const p=parent();let r;try{const {directory:d,context:c}=await setup(p),opened=await preparedRuntime(d);r=opened.r;
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[c.plan.publicInputs.transaction]),/TATUM_FREE_ALLOWANCE/);
  assert.equal(r.gate.state().tatumBatches,1);assert.equal(privateRead(join(d,'synthetic-tatum.json')).requests.length,1);
 }finally{r?.close();rmSync(p,{recursive:true,force:true});}
});
test('second write, ninth poll and 65th guarded request fail closed at the lower shared ceilings',async()=>{
 for(const kind of ['write','poll','request']){const p=parent();let r;try{const {directory:d}=await setup(p),opened=await preparedRuntime(d);r=opened.r;
  const verified=await r.session.verifyGasPayer(opened.report.reportId,opened.report.digests[0],opened.report.gas[0].payer);
  assert.equal(verified.verdict,'pass');assert.equal(r.gate.state().writes,1);
  if(kind==='write')assert.throws(()=>r.gate.ensureWriteAvailable(),/AGENT_LIMIT/);
  if(kind==='poll'){const job=Object.keys(r.gate.state().jobs)[0];r.gate.update(s=>s.jobs[job].polls=8);assert.throws(()=>r.gate.request(undefined,job),/AGENT_LIMIT/);assert.equal(r.gate.state().jobs[job].polls,8);}
  if(kind==='request'){r.gate.update(s=>s.requests=64);const before=privateRead(join(d,'synthetic-relayer.json')).requests.length;
   await assert.rejects(r.ports.experience.inventory(),/AGENT_LIMIT/);assert.equal(r.gate.state().requests,64);assert.equal(privateRead(join(d,'synthetic-relayer.json')).requests.length,before);}
  assert(r.gate.state().stopped);
 }finally{r?.close();rmSync(p,{recursive:true,force:true});}}
});
test('reader cannot run before native completion, with a pending write, or after a critical stop',async()=>{
 for(const kind of ['reserved','pending','stopped']){const p=parent();let r;try{const {directory:d}=await setup(p),opened=await preparedRuntime(d);r=opened.r;
  await r.session.verifyGasPayer(opened.report.reportId,opened.report.digests[0],opened.report.gas[0].payer);const run=r.gate.directory;r.close();r=undefined;
  if(kind!=='reserved')completeManagedTurn(d,0,'COMPLETED');
  if(kind==='pending')mutate(run,'agent-ledger.json',s=>s.intents[0].state='sent');
  if(kind==='stopped')mutate(run,'agent-ledger.json',s=>s.stopped='CRITICAL_STOP');
  await assert.rejects(readContinuation(d,continuationOptions(d)));assert(!existsSync(join(d,'continuation-reader-use.json')));
 }finally{r?.close();rmSync(p,{recursive:true,force:true});}}
});
test('single reservation rejects a first-task substitution, a second turn and any retry after failed bootstrap',async()=>{
 const p=parent();try{const {directory:d,context:c}=await setup(p,{reserve:false}),wrong=continuationTask(c);wrong.tasks=[{...c.plan.tasks[0],text:'other task'}];
  assert.throws(()=>reserveManagedTurn(d,0,wrong,{managedTest:true}),/MANAGED_NATIVE_ALLOWANCE/);
  reserveManagedTurn(d,0,continuationTask(c),{managedTest:true});completeManagedTurn(d,0,'STOPPED');
  assert.throws(()=>reserveManagedTurn(d,0,continuationTask(c),{managedTest:true}),/MANAGED_NATIVE_ALLOWANCE/);
  assert.throws(()=>reserveManagedTurn(d,1,continuationTask(c),{managedTest:true}),/MANAGED_NATIVE_ALLOWANCE/);
  const b=privateRead(join(d,'native-budget.json'));assert.equal(b.turns.length,1);assert.equal(b.stopped,'NATIVE_STOPPED');
 }finally{rmSync(p,{recursive:true,force:true});}
});
test('expired action-time grant denies before profile reads',async()=>{
 const p=parent();try{const {directory:d}=await createContinuationFixture(p);mutate(d,'managed-grant.json',g=>g.checkedAt='2026-01-01T00:00:00Z');let reads=0;
  assert.throws(()=>armManaged(d,{managedTest:true,ports:{...continuationFixturePorts(d),readProfile:()=>{reads++;}}}),/MANAGED_EXPLICIT_FRESH_GRANT_REQUIRED/);assert.equal(reads,0);
 }finally{rmSync(p,{recursive:true,force:true});}
});
test('final SDK reader has no Tatum key read, data channel, write or native permission',async()=>{
 const p=parent();let r;try{const {directory:d,context:c}=await setup(p),opened=await preparedRuntime(d);r=opened.r;
  const resolution=await r.session.verifyGasPayer(opened.report.reportId,opened.report.digests[0],opened.report.gas[0].payer);
  r.close();r=undefined;completeManagedTurn(d,0,'COMPLETED');let keys=0,channels=0;
  const ports=continuationFixturePorts(d);ports.readKey=()=>{keys++;throw Error('READER_MUST_NOT_READ_KEY');};ports.createData=()=>{channels++;throw Error('READER_MUST_NOT_OPEN_TATUM');};
  r=await openManaged(d,{managedTest:true,ports,reader:true});const s=r.gate.state();
  const records=await r.experience.read(),row=records.find(x=>x.id===resolution.memory.id);assert(row);
  await assert.rejects(r.experience.write(row.record),/CONTINUATION_READER_READONLY/);
  assert.throws(()=>r.gate.reserve('tatumBatches'),/CONTINUATION_READER_READONLY/);
  assert.equal(r.gate.state().writes,s.writes);assert.equal(r.gate.state().tatumBatches,s.tatumBatches);
  assert.equal(keys,0);assert.equal(channels,0);
  assert.throws(()=>reserveManagedTurn(d,1,continuationTask(c),{managedTest:true}),/MANAGED_NATIVE_ALLOWANCE/);
 }finally{r?.close();rmSync(p,{recursive:true,force:true});}
});

test('actual native orchestration uses exactly the frozen second task once; no-write result remains partial and boot failure burns its slot',async()=>{
 for(const failBoot of [false,true]){const p=parent(),oldPath=process.env.PATH;try{
  const {directory:d,context:c}=await createContinuationFixture(p);armManaged(d,continuationOptions(d));mkdirSync(join(d,'client'),{mode:0o700});const bin=join(p,'bin');mkdirSync(bin,{mode:0o700});
  const executable=`#!/usr/bin/env node
const fs=require('node:fs'),rl=require('node:readline');
if(process.argv[2]==='mcp'){console.log('[]');process.exit(0);}if(process.argv[2]!=='app-server')process.exit(2);
fs.appendFileSync(process.env.RECALL_CONTINUATION_LOG,JSON.stringify({pid:process.pid})+'\\n');
const send=m=>console.log(JSON.stringify(m));rl.createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);if(!m.id)return;let result={};
 if(m.method==='account/read')result={account:{type:'chatgpt'}};
 if(m.method==='account/rateLimits/read')result={rateLimits:{primary:{usedPercent:0},credits:{hasCredits:false,balance:'0'},spendControlReached:false}};
 if(m.method==='model/list')result={data:[{model:'gpt-5.6-luna'}]};
 if(m.method==='thread/start'){if(process.env.RECALL_CONTINUATION_FAIL==='1'){send({id:m.id,error:{code:-32603}});return;}result={thread:{id:'one-fresh'},model:'gpt-5.6-luna'};}
 if(m.method==='turn/start')fs.appendFileSync(process.env.RECALL_CONTINUATION_LOG,JSON.stringify({task:m.params.input})+'\\n');
 send({id:m.id,result});if(m.method==='turn/start')send({method:'turn/completed',params:{turn:{status:'completed'}}});});
`;
  writeFileSync(join(bin,'codex'),executable,{mode:0o700});process.env.PATH=bin+':'+oldPath;process.env.RECALL_CONTINUATION_LOG=join(p,'native-log');process.env.RECALL_CONTINUATION_FAIL=failBoot?'1':'0';
  const run=()=>withTemporaryKey(d,()=>evaluateManaged(d,{...continuationOptions(d),runNative:(cmd,args,env)=>new Promise((resolve,reject)=>{
   const child=spawn(cmd,args,{env,stdio:['ignore','pipe','pipe']});let err='';child.stdout.resume();child.stderr.on('data',b=>err+=b);child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(err)));})}),{managedTest:true});
  if(failBoot)await assert.rejects(run());else await run();
  const log=readFileSync(join(p,'native-log'),'utf8').trim().split('\n').map(JSON.parse),b=privateRead(join(d,'native-budget.json'));
  assert.equal(log.filter(x=>x.pid).length,1);assert.equal(b.turns.length,1);assert.equal(b.turns[0].status,failBoot?'stopped':'completed');
  assert(!existsSync(c.keyFile));assert(!existsSync(join(d,'native-1')));
  if(failBoot){assert.equal(log.filter(x=>x.task).length,0);assert.equal(b.stopped,'NATIVE_STOPPED');}
  else{assert.deepEqual(log.find(x=>x.task).task,[{type:'text',text:c.plan.tasks[0].text}]);assert.equal(privateRead(join(d,'managed-result.json')).status,'COMPLETED_NO_RESOLUTION');}
 }finally{process.env.PATH=oldPath;delete process.env.RECALL_CONTINUATION_LOG;delete process.env.RECALL_CONTINUATION_FAIL;rmSync(p,{recursive:true,force:true});}}
});

test('actual retained public origin bundles accept their historical abbreviated Git revision without rewriting it',()=>{
 const b=candidateContinuationBaseline(root);assert.equal(b.origins[0].sourceCommit,'b1072c8');
 validateContinuationBaseline(b,{root});assert.equal(b.origins[1].ledger.stopped,'AGENT_PROVIDER_OR_POLICY_ERROR');
 assert.equal(b.origins[1].nativeBudget.turns.length,2);assert.equal(baselineRows(b).length,3);
});
