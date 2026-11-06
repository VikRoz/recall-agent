import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,unlinkSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {createAgentFixture,openAgentFixture,fixtureTransport,fixtureSdk} from './agent-provider-fixture.mjs';
import {AgentRunGate,privateRead,operationKey,createAgentRun,runHash} from './agent-run.mjs';
import {agentWalrusFetch,WALRUS_RELAY} from './agent-walrus-guard.mjs';
import {openInjectedAgent} from './agent-provider.mjs';
import {newRule,address} from './activity.ts';
import {readRules} from './activity-memory.ts';
import {canonical} from '../src/domain.ts';
import {loadOfflineActivity} from './agent-activity-index.ts';
import {FIXTURE_WALLET,FIXTURE_OTHER} from './activity-fixtures.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const directory=()=>mkdtempSync(join(tmpdir(),'recall-agent-provider-test-'));
const record=m=>({schema:'recall-tool-experience/1',workspace:m.workspace,source:m.source,tool:'find_wallet_activity',
 schemaHash:'a'.repeat(64),field:'limit',constraint:'maximum',bound:10,attempted:100,evidence:'sdk-input-validation',verdict:'fail',supersedes:null});
const ruleFor=m=>newRule({owner:m.owner,project:m.workspace},'mainnet',FIXTURE_WALLET,FIXTURE_OTHER,'external',
 'Synthetic SDK fixture only','2026-11-06T00:00:00.000Z','2026-01-01T00:00:00.000Z',null);
const ledger=d=>privateRead(join(d,'agent-ledger.json'));
const backend=d=>privateRead(join(d,'synthetic-relayer.json'));
const rewrite=(d,name,value)=>writeFileSync(join(d,name),canonical(value),{mode:0o600});
globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};

test('real MemWal signing and Seal, two namespaces, scoped receipts and one shared budget',async()=>{
 const d=directory();let r;try{
  const m=await createAgentFixture(d);r=await openAgentFixture(d);
  const rule=ruleFor(m),experience=record(m);
  const a=await r.rules.write(rule,operationKey(rule));const b=await r.experience.write(experience);
  assert.notEqual(a.blobId,b.blobId);assert.equal(ledger(d).writes,2);assert.equal(ledger(d).reads,0);
  assert.equal((await readRules(r.rules,{owner:m.owner,project:m.workspace}))[0].record.id,rule.id);
  assert.equal((await r.experience.read())[0].id,b.id);assert.equal(ledger(d).reads,2);
  const counts=ledger(d);assert.deepEqual(await r.rules.write(rule,operationKey(rule)),a);
  assert.deepEqual(await r.experience.write(experience),b);assert.deepEqual(ledger(d),counts);
  const wires=backend(d).requests;
  assert.ok(wires.some(w=>w.path.endsWith('BatchGetObjects')));
  assert.ok(wires.filter(w=>w.path==='/api/remember').every(w=>w.signed&&w.seal));
  assert.deepEqual(wires.filter(w=>w.path==='/api/remember').map(w=>w.namespace).sort(),Object.values(m.namespaces).sort());
  assert.equal(backend(d).records.length,2);assert.ok(ledger(d).intents.every(i=>i.state==='done'));
  const before=backend(d).requests.length;
  await assert.rejects(r.experience.write({...experience,attempted:101}),/AGENT_LIMIT/);
  assert.equal(backend(d).requests.length,before);assert.equal(ledger(d).writes,2);
  assert.equal(r.ports.experience.journal.proofs().length,1);assert.equal(r.ports.rules.journal.proofs().length,1);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('fresh MCP processes recover captured SDK failure and linked resolution through the installed SDK',async()=>{
 const d=directory();let client;const pids=[];
 async function open(){client=new Client({name:'offline-real-sdk-agent-check',version:'1'});
  const transport=new StdioClientTransport({command:process.execPath,args:['--disable-warning=ExperimentalWarning',join(root,'app/agent-provider-fixture.mjs'),'--mcp',d]});
  await client.connect(transport);pids.push(transport.pid);return (await client.listTools()).tools;}
 try{
  await createAgentFixture(d);await open();
  const index=loadOfflineActivity('saved'),q={network:'mainnet',wallet:index.examples().senders[0]};
  const failure=await client.callTool({name:'find_wallet_activity',arguments:{...q,limit:100}});
  assert.equal(failure.isError,true);assert.equal(failure._meta['recall/observation'].storage,'walrus-fixture');
  const valid=await client.callTool({name:'find_wallet_activity',arguments:{...q,limit:10}});
  assert.equal(Boolean(valid.isError),false);assert.equal(valid._meta['recall/observation'].verdict,'resolved');
  await client.close();const tools=await open();assert.notEqual(pids[0],pids[1]);
  const rows=tools.find(t=>t.name==='find_wallet_activity')._meta['recall/verifiedExperience'];
  assert.equal(rows.length,2);assert.equal(rows[0].id,failure._meta['recall/observation'].id);
  assert.equal(rows[1].record.supersedes,rows[0].id);assert.ok(rows.every(r=>r.blobId));
  const transactions=JSON.parse(valid.content[0].text).transactions.map(t=>t.digest);
  const prepared=await client.callTool({name:'prepare_report',arguments:{...q,transactions}});
  assert.equal(Boolean(prepared.isError),false);const report=JSON.parse(prepared.content[0].text);
  assert.equal(report.mode,'offline-sdk-fixture-replay');assert.equal(report.dataProvenance.freshProviderRead,false);
  const csv=await client.callTool({name:'export_report',arguments:{reportId:report.reportId}});
  assert.equal(Boolean(csv.isError),false);assert.ok(JSON.parse(csv.content[0].text).csv.includes('"replay"'));
  assert.equal(ledger(d).writes,2);assert.equal(ledger(d).reads,2);assert.equal(ledger(d).tatumBatches,0);
  assert.ok(ledger(d).requests<=64);assert.equal(backend(d).records.length,2);
 }finally{await client?.close();rmSync(d,{recursive:true,force:true});}
});

test('independent processes share ceilings and a stopped run cannot recreate its ledger',async()=>{
 const d=directory();try{
  await createAgentFixture(d);
  const source="import {AgentRunGate} from './app/agent-run.mjs';new AgentRunGate(process.argv[1]).reserve('tatumBatches');";
  for(let i=0;i<2;i++)execFileSync(process.execPath,['--disable-warning=ExperimentalWarning','--input-type=module','-e',source,d],{cwd:root,stdio:'pipe'});
  assert.equal(ledger(d).tatumBatches,2);
  assert.throws(()=>execFileSync(process.execPath,['--disable-warning=ExperimentalWarning','--input-type=module','-e',source,d],{cwd:root,stdio:'pipe'}));
  assert.equal(ledger(d).tatumBatches,2);assert.throws(()=>new AgentRunGate(d),/AGENT_RUN_STOPPED/);
  unlinkSync(join(d,'agent-ledger.json'));assert.throws(()=>new AgentRunGate(d));
  assert.equal(readFileSync(join(d,'agent-run.json')).length>0,true);
 }finally{rmSync(d,{recursive:true,force:true});}
});

test('writer lease excludes another process through admission and parent checks without stopping its owner',async()=>{
 const d=directory();let child;try{
  await createAgentFixture(d);const gate=new AgentRunGate(d);
  const code="import {AgentRunGate} from './app/agent-run.mjs';const g=new AgentRunGate(process.argv[1]);await g.withWriter(g.manifest.namespaces.experience,async()=>{process.stdout.write('LOCKED\\n');await new Promise(r=>process.stdin.once('data',r));});process.exit(0);";
  child=spawn(process.execPath,['--disable-warning=ExperimentalWarning','--input-type=module','-e',code,d],{cwd:root,stdio:['pipe','pipe','pipe']});
  const lines=createInterface({input:child.stdout});assert.equal((await once(lines,'line'))[0],'LOCKED');
  await assert.rejects(gate.withWriter(gate.manifest.namespaces.rules,async()=>assert.fail('must not enter')),/EEXIST/);
  child.stdin.write('release\n');const [status]=await once(child,'exit');assert.equal(status,0);lines.close();
  assert.equal(ledger(d).stopped,null);await gate.withWriter(gate.manifest.namespaces.rules,async()=>{});
 }finally{child?.kill();rmSync(d,{recursive:true,force:true});}
});

test('a crash after reservation retains spent capacity and blocks restart before transport',async()=>{
 const d=directory();try{
  const m=await createAgentFixture(d),rec=record(m);
  const code="import {AgentRunGate,operationKey} from './app/agent-run.mjs';const g=new AgentRunGate(process.argv[1]);const r=JSON.parse(process.argv[2]);await g.withWriter(g.manifest.namespaces.experience,async()=>{g.beforeSubmit(g.manifest.namespaces.experience,r,operationKey(r));process.exit(0);});";
  execFileSync(process.execPath,['--disable-warning=ExperimentalWarning','--input-type=module','-e',code,d,JSON.stringify(rec)],{cwd:root,stdio:'pipe'});
  assert.equal(ledger(d).writes,1);assert.equal(ledger(d).intents[0].state,'reserved');
  assert.throws(()=>new AgentRunGate(d),/AGENT_OUTCOME_UNCERTAIN/);assert.equal(backend(d).requests.length,0);
 }finally{rmSync(d,{recursive:true,force:true});}
});

test('accepted response loss leaves a receipt journal and reservation, without resubmission or budget reset',async()=>{
 const d=directory();let r;try{
  const m=await createAgentFixture(d);r=await openAgentFixture(d,{failAfterAccepted:true});
  await assert.rejects(r.experience.write(record(m)),/ACCEPTED_RESPONSE_LOSS/);
  const first=backend(d).requests.length;assert.equal(backend(d).records.length,1);
  assert.equal(ledger(d).writes,1);assert.equal(ledger(d).intents[0].state,'sent');
  await assert.rejects(r.experience.write(record(m)),/AGENT_RUN_STOPPED/);
  assert.equal(backend(d).requests.length,first);r.close();r=undefined;
  await assert.rejects(openAgentFixture(d),/AGENT_RUN_STOPPED/);assert.equal(ledger(d).writes,1);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('read content is cached only for the complete unchanged inventory; revision changes consume shared allowance',async()=>{
 const d=directory();let r;try{
  const m=await createAgentFixture(d);r=await openAgentFixture(d);await r.experience.write(record(m));
  assert.equal((await r.experience.read()).length,1);assert.equal(ledger(d).reads,1);
  await r.experience.read();assert.equal(ledger(d).reads,1);
  let s=backend(d);s.revision++;rewrite(d,'synthetic-relayer.json',s);
  await r.experience.read();assert.equal(ledger(d).reads,2);
  s=backend(d);s.revision++;rewrite(d,'synthetic-relayer.json',s);
  const before=backend(d).requests.filter(r=>r.path==='/api/recall').length;
  await assert.rejects(r.experience.read(),/AGENT_LIMIT/);
  assert.equal(backend(d).requests.filter(r=>r.path==='/api/recall').length,before);
  assert.equal(ledger(d).reads,2);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('a correction without a verified parent is rejected under the writer gate before submission',async()=>{
 const d=directory();let r;try{
  const m=await createAgentFixture(d);r=await openAgentFixture(d);
  await assert.rejects(r.experience.write({...record(m),attempted:10,verdict:'resolved',evidence:'successful-tool-call',supersedes:'a'.repeat(43)}),/EXPERIENCE_PARENT/);
  assert.equal(ledger(d).writes,0);assert.equal(backend(d).records.length,0);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('incomplete content and a revision changed during recall stop durably before a later tool can write',async()=>{
 for(const options of [{omitRecall:true},{changeRevisionOnRecall:true}]){
  const d=directory();let r;try{
   const m=await createAgentFixture(d);r=await openAgentFixture(d,options);await r.experience.write(record(m));
   await assert.rejects(r.experience.read(),/MEMORY_READBACK_HASH|MEMORY_CONTEXT_INCOMPLETE|MEMORY_CHANGED_DURING_READ/);
   const count=backend(d).requests.length;assert.notEqual(ledger(d).stopped,null);
   await assert.rejects(r.experience.write({...record(m),attempted:101}),/AGENT_RUN_STOPPED/);
   assert.equal(backend(d).requests.length,count);assert.equal(ledger(d).writes,1);
   r.close();r=undefined;await assert.rejects(openAgentFixture(d),/AGENT_RUN_STOPPED/);
  }finally{r?.close();rmSync(d,{recursive:true,force:true});}
 }
});

test('unknown namespace and an unreserved signed-looking write never reach transport',async()=>{
 for(const wrongNamespace of [true,false]){
  const d=directory();try{
   const m=await createAgentFixture(d),g=new AgentRunGate(d);let calls=0;
   const guarded=agentWalrusFetch(g,async()=>{calls++;return Response.json({});});
   const r=record(m);
   await assert.rejects(guarded(WALRUS_RELAY+'/api/remember',{method:'POST',headers:{'x-account-id':m.accountId,
    'x-public-key':m.delegatePublicKeyHex,'x-signature':'aa'.repeat(64),'x-timestamp':String(Math.floor(Date.now()/1000)),
    'x-nonce':m.runId,'x-seal-session':'synthetic-session-only'},body:JSON.stringify({namespace:wrongNamespace?'unknown':m.namespaces.experience,text:canonical(r),idempotency_key:operationKey(r)})}),
    /AGENT_NAMESPACE_DENIED|AGENT_UNRESERVED_WRITE/);
   assert.equal(calls,0);assert.equal(ledger(d).writes,0);
  }finally{rmSync(d,{recursive:true,force:true});}
 }
});

test('wrong account, routes, schemas and raw credentials are rejected before the injected network',async()=>{
 const cases=[
  g=>['https://example.com/',{}],
  g=>[WALRUS_RELAY+'/health',{headers:{'x-delegate-key':'synthetic-only'}}],
  g=>[WALRUS_RELAY+'/api/stats',{method:'POST',headers:{'x-account-id':address('0x99')},body:'{}'}],
  g=>[WALRUS_RELAY+'/health?unsafe=1',{}],
 ];
 for(const make of cases){const d=directory();try{
  await createAgentFixture(d);const gate=new AgentRunGate(d);let calls=0;
  const guarded=agentWalrusFetch(gate,async()=>{calls++;return Response.json({});});
  await assert.rejects(guarded(...make(gate)));assert.equal(calls,0);assert.notEqual(ledger(d).stopped,null);
 }finally{rmSync(d,{recursive:true,force:true});}}
 for(const patch of [{source:'fixture'},{workspace:'agent-00000000-0000-0000-0000-000000000000'},{password:'unexpected'}]){
  const d=directory();let r;try{const m=await createAgentFixture(d);r=await openAgentFixture(d);const before=backend(d).requests.length;
   await assert.rejects(r.experience.write({...record(m),...patch}));assert.equal(backend(d).requests.length,before);assert.equal(ledger(d).writes,0);
  }finally{r?.close();rmSync(d,{recursive:true,force:true});}
 }
});

test('changed identity, stale admission, live sponsorship assertions and symlinked state cannot open the offline assembly',async()=>{
 const d=directory(),other=directory();try{
  const m=await createAgentFixture(d);
  assert.throws(()=>createAgentRun(other,{...m,mode:'live',admission:{...m.admission,kind:'managed-account'}}),/AGENT_OFFLINE_ONLY/);
  const wrong={...m,accountId:address('0x88')};rewrite(d,'agent-run.json',wrong);assert.throws(()=>new AgentRunGate(d));
  rewrite(d,'agent-run.json',m);const stale={...m,admission:{...m.admission,checkedAt:'2026-01-01T00:00:00.000Z'}};
  rewrite(d,'agent-run.json',stale);const s=ledger(d);s.manifestHash=runHash(stale);rewrite(d,'agent-ledger.json',s);
  assert.throws(()=>new AgentRunGate(d),/AGENT_ADMISSION_EXPIRED/);
  rewrite(d,'agent-run.json',m);s.manifestHash=runHash(m);rewrite(d,'agent-ledger.json',s);
  const real=join(d,'ledger-real.json');writeFileSync(real,canonical(s),{mode:0o600});unlinkSync(join(d,'agent-ledger.json'));symlinkSync(real,join(d,'agent-ledger.json'));
  assert.throws(()=>new AgentRunGate(d));assert.equal(backend(d).requests.length,0);
 }finally{rmSync(d,{recursive:true,force:true});rmSync(other,{recursive:true,force:true});}
});

test('wrong SDK delegate and degraded transport stop before any content or write and restore fetch',async()=>{
 const d=directory();const before=globalThis.fetch;
 try{
  await createAgentFixture(d);let calls=0;
  await assert.rejects(openInjectedAgent(d,{capture:true,createSdk:async()=>({getPublicKeyHex:async()=> 'ff'.repeat(32),destroy:()=>{}}),
   transport:async()=>{calls++;return Response.json({});}}),/AGENT_DELEGATE_MISMATCH/);
  assert.equal(calls,0);assert.equal(globalThis.fetch,before);assert.equal(ledger(d).writes,0);
 }finally{rmSync(d,{recursive:true,force:true});}
 const d2=directory();try{await createAgentFixture(d2);await assert.rejects(openAgentFixture(d2,{failPath:'/health'}),/AGENT_PROVIDER_HTTP/);
  assert.equal(globalThis.fetch,before);assert.equal(ledger(d2).reads,0);assert.equal(ledger(d2).writes,0);
 }finally{rmSync(d2,{recursive:true,force:true});}
});

test('request and status polling ceilings are persistent and only accepted jobs can be polled',async()=>{
 const d=directory();try{
  const m=await createAgentFixture(d),g=new AgentRunGate(d),rec=record(m);
  await g.withWriter(m.namespaces.experience,async()=>{
   g.beforeSubmit(m.namespaces.experience,rec,operationKey(rec));g.sent(m.namespaces.experience,operationKey(rec),rec);g.job('accepted-job');
   assert.throws(()=>g.request(undefined,'unknown-job'),/AGENT_UNKNOWN_JOB/);
   for(let i=0;i<8;i++)g.request(undefined,'accepted-job');
   assert.throws(()=>g.request(undefined,'accepted-job'),/AGENT_LIMIT/);
  });
  assert.equal(ledger(d).jobs['accepted-job'].polls,8);assert.equal(ledger(d).requests,8);
 }finally{rmSync(d,{recursive:true,force:true});}
 const d2=directory();try{await createAgentFixture(d2);const g=new AgentRunGate(d2);
  for(let i=0;i<64;i++)g.request();assert.throws(()=>g.request(),/AGENT_LIMIT/);assert.equal(ledger(d2).requests,64);
 }finally{rmSync(d2,{recursive:true,force:true});}
});

test('real SDK status polling stops after eight pending replies and never resubmits',async()=>{
 const d=directory();let r;try{
  const m=await createAgentFixture(d);r=await openAgentFixture(d,{pendingForever:true});
  await assert.rejects(r.experience.write(record(m)),/WRITE_STATUS_LIMIT/);
  assert.equal(backend(d).requests.filter(x=>x.path==='/api/remember').length,1);
  assert.equal(backend(d).requests.filter(x=>x.path.startsWith('/api/remember/')).length,8);
  assert.equal(ledger(d).writes,1);assert.equal(Object.values(ledger(d).jobs)[0].polls,8);
  assert.notEqual(ledger(d).stopped,null);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('closing during a delayed SDK call retains the guard until it settles and stops the run',async()=>{
 const d=directory();const original=globalThis.fetch;let r,unblock,entered;
 const waiting=new Promise(resolve=>{entered=resolve;});
 try{
  await createAgentFixture(d);const base=fixtureTransport(d);let delayed=false;
  r=await openInjectedAgent(d,{createSdk:fixtureSdk,capture:true,transport:async(url,options)=>{
   if(String(url).includes('/v1/owners/')&&!delayed){delayed=true;entered();await new Promise(resolve=>{unblock=resolve;});}
   return base(url,options);
  }});
  const pending=r.experience.read();pending.catch(()=>{});await waiting;
  r.close();assert.notEqual(globalThis.fetch,original);assert.equal(ledger(d).stopped,'AGENT_CLIENT_CLOSED_DURING_ACTION');
  unblock();await assert.rejects(pending,/AGENT_RUNTIME_CLOSED|AGENT_RUN_STOPPED/);
  assert.equal(globalThis.fetch,original);assert.equal(ledger(d).writes,0);
 }finally{unblock?.();r?.close();rmSync(d,{recursive:true,force:true});}
});
