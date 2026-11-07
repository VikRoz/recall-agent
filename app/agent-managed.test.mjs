import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,writeFileSync,readFileSync,chmodSync,unlinkSync,symlinkSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync,spawn} from 'node:child_process';
import {EventEmitter} from 'node:events';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {fileURLToPath} from 'node:url';
import {createManagedFixture,managedFixturePorts,openManagedFixture,fixtureManagedPlan} from './agent-managed-fixture.mjs';
import {managedContext,managedGrant,managedFile,armManaged,managedPreflightInventory,openManaged,admittedManaged,
 reserveManagedTurn,completeManagedTurn,claimTemporaryKey,cleanupTemporaryKey,verifyFrozenPlan} from './agent-managed.mjs';
import {managedArgs,withTemporaryKey,evaluateManaged} from './agent-managed-entry.mjs';
import {privateRead,runHash} from './agent-run.mjs';
import {FIXTURE_WALLET,FIXTURE_DIGESTS} from './activity-fixtures.ts';
const root=fileURLToPath(new URL('../',import.meta.url)),parent=()=>mkdtempSync(join(tmpdir(),'recall-managed-offline-'));
const opts=d=>({managedTest:true,ports:managedFixturePorts(d)});
const mutate=(d,name,fn)=>{const v=privateRead(join(d,name));fn(v);writeFileSync(join(d,name),JSON.stringify(v),{mode:0o600});};
const auth=d=>admittedManaged(d,{managedTest:true});
const task=(c,i)=>({schema:1,dataMode:'ordinary-managed-test',model:c.plan.model,tasks:[c.plan.tasks[i]],managedTurnIndex:i});
globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};

test('synthetic context cannot enter real path and missing/stale/invalid grant precedes credential readers and factories',async()=>{
 const p=parent();try{const {directory:d}=await createManagedFixture(p);let touched=0;
  const ports={...managedFixturePorts(d),readProfile:()=>{touched++;throw Error('MUST_NOT_READ');}};
  await assert.rejects(openManaged(d),/MANAGED_CONTEXT_SCOPE/);
  mutate(d,'managed-grant.json',g=>g.checkedAt='2026-01-01T00:00:00.000Z');
  assert.throws(()=>armManaged(d,{managedTest:true,ports}),/MANAGED_EXPLICIT_FRESH_GRANT_REQUIRED/);assert.equal(touched,0);
  mutate(d,'managed-grant.json',g=>{g.checkedAt=new Date().toISOString();g.tatum.plan='PAID';});
  assert.throws(()=>armManaged(d,{managedTest:true,ports}),/MANAGED_FREE_REQUIRED/);assert.equal(touched,0);
  unlinkSync(join(d,'managed-grant.json'));assert.throws(()=>armManaged(d,{managedTest:true,ports}),/ENOENT/);assert.equal(touched,0);
 }finally{rmSync(p,{recursive:true,force:true});}
});

test('changed profile and key fail before SDK/native transport creation',async()=>{
 for(const kind of ['profile','key']){const p=parent();try{const {directory:d}=await createManagedFixture(p),ports=managedFixturePorts(d);let factories=0;
  ports.createSdk=ports.createData=()=>{factories++;throw Error('MUST_NOT_OPEN');};
  if(kind==='profile')ports.readProfile=()=>({walletAddress:'0x'+'0'.repeat(64)});else ports.readKey=()=> 'wrong';
  assert.throws(()=>armManaged(d,{managedTest:true,ports}),kind==='profile'?/MANAGED_PROFILE_CHANGED/:/TATUM_KEY_BINDING/);
  assert.equal(factories,0);assert(!existsSync(join(d,'active-run.json')));
 }finally{rmSync(p,{recursive:true,force:true});}}
});

test('source freeze and tampered context cannot be silently renewed or substituted',async()=>{
 const p=parent();try{const {directory:d}=await createManagedFixture(p),plan=fixtureManagedPlan();
  plan.runtimeHashes['app/agent-run.mjs']='0'.repeat(64);assert.throws(()=>verifyFrozenPlan(plan,root),/MANAGED_SOURCE_CHANGED/);
  mutate(d,'managed-context.json',c=>c.identity.delegatePublicKeyHex='0'.repeat(64));assert.throws(()=>managedGrant(d,{managedTest:true}),/MANAGED_IDENTITY/);
 }finally{rmSync(p,{recursive:true,force:true});}
});

test('public receipt migration preserves old ledger and prior uncertainty blocks admission',async()=>{
 const p=parent();try{const {directory:d,old,context:c}=await createManagedFixture(p),before=readFileSync(join(old,'agent-ledger.json'));
  for(const row of c.baseline.records)assert.deepEqual(privateRead(join(d,'journal-experience/activity-jobs',row.id+'.json')),c.baseline.receipts[row.id]);
  armManaged(d,opts(d));assert.deepEqual(readFileSync(join(old,'agent-ledger.json')),before);
  assert.throws(()=>armManaged(d,opts(d)),/MANAGED_ALREADY_ARMED/);
  mutate(old,'agent-ledger.json',s=>s.intents[0].state='sent');assert.throws(()=>admittedManaged(d,{managedTest:true}),/MANAGED_PRIOR_CHANGED/);
 }finally{rmSync(p,{recursive:true,force:true});}
});

test('counted deployment preflight rejects changed config and data cannot precede signed inventory',async()=>{
 const p=parent();let r;try{const {directory:d,context:c}=await createManagedFixture(p);armManaged(d,opts(d));r=await openManagedFixture(d);
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[0]]),/ENOENT/);r.close();r=undefined;
  assert.equal(privateRead(join(authStopped(d),'agent-ledger.json')).tatumBatches,0);
 }finally{r?.close();rmSync(p,{recursive:true,force:true});}
 const q=parent();try{const {directory:d,context:c}=await createManagedFixture(q);armManaged(d,opts(d));
  const ports=managedFixturePorts(d,{configReply:{...c.config,packageId:'0x'+'f'.repeat(64)}});
  await assert.rejects(managedPreflightInventory(d,{managedTest:true,ports}),/AGENT_CONFIG_SCOPE/);
  assert(!existsSync(join(d,'ordinary-preflight.json')));assert.equal(privateRead(join(authStopped(d),'agent-ledger.json')).tatumBatches,0);
 }finally{rmSync(q,{recursive:true,force:true});}
});
function authStopped(d){return join(d,'runs',privateRead(join(d,'active-run.json')).runId);}

test('two fresh MCP OS processes use real SDK/Seal with intercepted data, shared counters and exact retained receipts',async()=>{
 const p=parent();let client;try{const {directory:d,context:c}=await createManagedFixture(p);armManaged(d,opts(d));
  const initial=await managedPreflightInventory(d,opts(d));assert(initial.counters.requests>=5);assert.equal(initial.counters.reads,0);
  const pids=[],views=[];
  for(let i=0;i<2;i++){
   client=new Client({name:'managed-boundary-offline',version:'1'});const transport=new StdioClientTransport({command:process.execPath,args:['--disable-warning=ExperimentalWarning',join(root,'app/agent-managed-fixture.mjs'),'--mcp',d]});
   await client.connect(transport);pids.push(transport.pid);await client.listTools();
   const response=await client.callTool({name:'prepare_report',arguments:{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[FIXTURE_DIGESTS[0]]}});
   assert(!response.isError,JSON.stringify(response));const view=JSON.parse(response.content[0].text);views.push(view);
   assert.equal(view.transactionEvidence[0].source,'fixture');assert.equal(view.dataProvenance.freshProviderRead,false);
   if(i===0){const mismatch=await client.callTool({name:'verify_gas_payer',arguments:{reportId:view.reportId,transaction:FIXTURE_DIGESTS[0],claimedPayer:FIXTURE_WALLET}});assert(!mismatch.isError);}
   else{const corrected=await client.callTool({name:'verify_gas_payer',arguments:{reportId:view.reportId,transaction:FIXTURE_DIGESTS[0],claimedPayer:view.gas[0].payer}});assert(!corrected.isError,JSON.stringify(corrected));}
   await client.close();client=undefined;
  }
  assert.notEqual(pids[0],pids[1]);assert.equal(views[0].experience.length,0);assert.equal(views[1].experience.length,1);
  const s=privateRead(join(auth(d).run,'agent-ledger.json'));assert.equal(s.tatumBatches,2);assert.equal(s.writes,2);assert.equal(s.reads,2);assert(s.requests<=64);assert.equal(s.stopped,null);
  assert.equal(privateRead(join(d,'synthetic-tatum.json')).closedClients,2);
  assert.equal(privateRead(join(d,'synthetic-relayer.json')).requests.length,s.requests);
  let r;try{r=await openManagedFixture(d);const inventory=await r.ports.experience.inventory();assert.equal(inventory.blobIds.length,4);}finally{r?.close();}
 }finally{await client?.close();rmSync(p,{recursive:true,force:true});}
});

test('native reservations persist across processes, bind exact model/task and cannot refund an unknown turn',async()=>{
 const p=parent();try{const {directory:d,context:c}=await createManagedFixture(p);armManaged(d,opts(d));await managedPreflightInventory(d,opts(d));
  const wrong=task(c,0);wrong.model='other';assert.throws(()=>reserveManagedTurn(d,0,wrong,{managedTest:true}),/MANAGED_NATIVE_ALLOWANCE/);
  reserveManagedTurn(d,0,task(c,0),{managedTest:true});
  const code="import {reserveManagedTurn} from './app/agent-managed.mjs';import {privateRead} from './app/agent-run.mjs';try{const c=privateRead(process.argv[1]+'/managed-context.json');reserveManagedTurn(process.argv[1],0,{model:c.plan.model,dataMode:'ordinary-managed-test',tasks:[c.plan.tasks[0]]},{managedTest:true});process.exit(2)}catch{process.exit(0)}";
  assert.equal(spawnSync(process.execPath,['--disable-warning=ExperimentalWarning','--input-type=module','-e',code,d],{cwd:root,timeout:10000}).status,0);
  assert.throws(()=>reserveManagedTurn(d,1,task(c,1),{managedTest:true}),/MANAGED_NATIVE_ALLOWANCE/);
  completeManagedTurn(d,0,'COMPLETED');reserveManagedTurn(d,1,task(c,1),{managedTest:true});completeManagedTurn(d,1,'STOPPED');
  assert.throws(()=>reserveManagedTurn(d,2,task(c,1),{managedTest:true}),/MANAGED_NATIVE_ALLOWANCE/);
  const b=privateRead(join(d,'native-budget.json'));assert.equal(b.turns.length,2);assert.equal(b.stopped,'NATIVE_STOPPED');
 }finally{rmSync(p,{recursive:true,force:true});}
});

test('cleanup on success, setup failure and signal removes only newly owned temporary key',async()=>{
 for(const outcome of ['success','failure','stale','SIGINT','SIGTERM']){const p=parent();try{const {directory:d,context:c}=await createManagedFixture(p),signals=new EventEmitter();
  const other=join(p,'other-key');writeFileSync(other,'unrelated',{mode:0o600});
  if(outcome==='stale')mutate(d,'managed-grant.json',g=>g.checkedAt='2026-01-01T00:00:00Z');
  const run=()=>withTemporaryKey(d,async signal=>{if(outcome==='failure')throw Error('SYNTHETIC_SETUP_FAILURE');if(outcome==='stale')armManaged(d,opts(d));if(outcome.startsWith('SIG')){signals.emit(outcome);assert(signal.aborted);}return 42;},{managedTest:true,signals});
  if(outcome==='failure'||outcome==='stale'||outcome.startsWith('SIG'))await assert.rejects(run(),outcome.startsWith('SIG')?/MANAGED_INTERRUPTED/:outcome==='stale'?/MANAGED_EXPLICIT_FRESH_GRANT_REQUIRED/:/SYNTHETIC_SETUP_FAILURE/);else assert.equal(await run(),42);
  assert(!existsSync(c.keyFile));assert.equal(readFileSync(other,'utf8'),'unrelated');assert(existsSync(join(d,'native-budget.json')));
  assert(existsSync(join(d,'journal-experience/activity-jobs',c.baseline.records[0].id+'.json')));
 }finally{rmSync(p,{recursive:true,force:true});}}
});

test('cleanup refuses symlink, replacement file and changed parent directory',async()=>{
 for(const kind of ['symlink','replace','parent']){const p=parent();try{const {directory:d,context:c}=await createManagedFixture(p);claimTemporaryKey(d,{managedTest:true});
  const other=join(p,'other');writeFileSync(other,'foreign',{mode:0o600});
  if(kind==='parent'){const parentDir=join(p,'capture');rmSync(parentDir,{recursive:true});mkdirSync(parentDir,{mode:0o700});writeFileSync(c.keyFile,'replacement',{mode:0o600});}
  else{unlinkSync(c.keyFile);if(kind==='symlink')symlinkSync(other,c.keyFile);else writeFileSync(c.keyFile,'replacement',{mode:0o600});}
  assert.throws(()=>cleanupTemporaryKey(d),/MANAGED_(PRIVATE_PATH|CLEANUP_SCOPE|CLEANUP_IDENTITY)/);
  assert(existsSync(c.keyFile));assert.equal(readFileSync(other,'utf8'),'foreign');
 }finally{rmSync(p,{recursive:true,force:true});}}
});

test('real CLI cannot start from fixture context; empty interactive arguments contain no injected task',async()=>{
 const p=parent();try{const {directory:d}=await createManagedFixture(p);
  const child=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning',join(root,'app/agent-managed-entry.mjs'),'--mcp',d],{encoding:'utf8',timeout:10000});
  assert.equal(child.status,1);assert(child.stderr.includes('MANAGED_CONTEXT_SCOPE'));
  const args=managedArgs('/node',root,d,[]);for(let i=0;i<args.length;i+=2)assert(['-C','-s','-a','-c'].includes(args[i]));
  assert(!args.some(a=>/2GrJYm|check-expense-hypothesis|nextTool|first tool must/.test(a)));
  assert.equal(privateRead(join(d,'synthetic-relayer.json')).requests.length,0);
 }finally{rmSync(p,{recursive:true,force:true});}
});

// Exercise the actual app-server orchestration with a local fake executable, never the account CLI.
test('fake app-server orchestration bounds completed and quota-stopped attempts without account calls',async()=>{
 for(const quotaStop of [false,true]){const p=parent(),oldPath=process.env.PATH;try{const {directory:d}=await createManagedFixture(p);armManaged(d,opts(d));mkdirSync(join(d,'client'),{mode:0o700});
  const bin=join(p,'bin');mkdirSync(bin,{mode:0o700});
  const fake=`#!/usr/bin/env node
const fs=require('node:fs'),rl=require('node:readline');
if(process.argv[2]==='mcp'){console.log('[]');process.exit(0);}
if(process.argv[2]!=='app-server')process.exit(2);
fs.appendFileSync(process.env.RECALL_TEST_PID_LOG,String(process.pid)+'\\n');
const send=m=>console.log(JSON.stringify(m));
rl.createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);if(!m.id)return;let result={};
 if(m.method==='account/read')result={account:{type:'chatgpt'}};
 if(m.method==='account/rateLimits/read')result={rateLimits:{primary:{usedPercent:process.env.RECALL_TEST_QUOTA_STOP==='1'?100:0},credits:{hasCredits:false,balance:'0'},spendControlReached:false}};
 if(m.method==='model/list')result={data:[{model:'gpt-5.6-luna'}]};
 if(m.method==='thread/start')result={thread:{id:'fake-'+process.pid},model:'gpt-5.6-luna'};
 send({id:m.id,result});if(m.method==='turn/start')send({method:'turn/completed',params:{turn:{status:'completed'}}});
});
`;
  const binary=join(bin,'codex');writeFileSync(binary,fake,{mode:0o700});chmodSync(binary,0o700);
  process.env.PATH=bin+':'+oldPath;process.env.RECALL_TEST_PID_LOG=join(p,'pids');process.env.RECALL_TEST_QUOTA_STOP=quotaStop?'1':'0';
  const run=()=>evaluateManaged(d,{...opts(d),runNative:(cmd,args,env)=>new Promise((resolve,reject)=>{const c=spawn(cmd,args,{env,stdio:['ignore','pipe','pipe']});let err='';c.stdout.resume();c.stderr.on('data',d=>err+=d);c.once('error',reject);c.once('exit',code=>code===0?resolve():reject(Error(err)));})});
  if(quotaStop){await assert.rejects(run());const b=privateRead(join(d,'native-budget.json'));assert.equal(b.turns.length,1);assert.equal(b.stopped,'NATIVE_STOPPED');assert(!existsSync(join(d,'native-1')));}
  else{await run();const b=privateRead(join(d,'native-budget.json'));assert.equal(b.turns.length,2);assert(b.turns.every(t=>t.status==='completed'));}
  const pids=readFileSync(join(p,'pids'),'utf8').trim().split('\n');assert.equal(pids.length,quotaStop?1:2);if(!quotaStop){assert.notEqual(pids[0],pids[1]);assert.equal(privateRead(join(d,'managed-result.json')).status,'COMPLETED');}
 }finally{process.env.PATH=oldPath;delete process.env.RECALL_TEST_PID_LOG;delete process.env.RECALL_TEST_QUOTA_STOP;rmSync(p,{recursive:true,force:true});}}
});

test('frozen real evaluation rejects an unapproved transaction before reservation or channel construction',async()=>{
 const {boundedOrdinaryTatum}=await import('./agent-ordinary.mjs');const p=parent();try{const {directory:d}=await createManagedFixture(p);let touched=0;
  const data=boundedOrdinaryTatum({manifest:{mode:'live-ordinary-selected'},ordinary:{directory:d},admit(){touched++;},reserve(){touched++;}}, {}, '',()=>{touched++;});
  await assert.rejects(data.transactions([FIXTURE_DIGESTS[0]]),/MANAGED_APPROVED_TRANSACTION_ONLY/);assert.equal(touched,0);data.close();
 }finally{rmSync(p,{recursive:true,force:true});}
});

test('changed managed context between operations stops before the next SDK or Tatum action',async()=>{
 const p=parent();let r;try{const {directory:d}=await createManagedFixture(p);armManaged(d,opts(d));await managedPreflightInventory(d,opts(d));r=await openManagedFixture(d);
  const before=privateRead(join(d,'synthetic-relayer.json')).requests.length;
  mutate(d,'managed-context.json',c=>c.plan.publicInputs.transaction=FIXTURE_DIGESTS[1]);
  await assert.rejects(r.ports.experience.inventory(),/MANAGED_CONTEXT_CHANGED/);
  assert.equal(privateRead(join(d,'synthetic-relayer.json')).requests.length,before);assert.equal(privateRead(join(d,'synthetic-tatum.json')).requests.length,0);
 }finally{r?.close();rmSync(p,{recursive:true,force:true});}
});
