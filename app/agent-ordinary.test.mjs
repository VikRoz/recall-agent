import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {InMemoryTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/inMemory.js';
import {createOrdinaryFixture,openOrdinaryFixture,ordinaryFixtureConsent,SYNTHETIC_TATUM_KEY} from './agent-ordinary-fixture.mjs';
import {createOrdinaryRun,ordinaryAuthorization,openInjectedOrdinary} from './agent-ordinary.mjs';
import {AgentRunGate,privateRead,runHash,operationKey,validateAgentManifest} from './agent-run.mjs';
import {FileWriteJournal} from './activity-memory.ts';
import {MAX_EXPERIENCE_RECORDS,validateExperienceRows} from './agent-experience.ts';
import {newRule,address} from './activity.ts';
import {FIXTURE_WALLET,FIXTURE_OTHER,FIXTURE_DIGESTS} from './activity-fixtures.ts';
import {canonical} from '../src/domain.ts';
import {fixtureSdk,fixtureTransport} from './agent-provider-fixture.mjs';
import {agentArgs} from './agent-launch.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),directory=()=>mkdtempSync(join(tmpdir(),'recall-ordinary-test-'));
const file=(d,name,value)=>writeFileSync(join(d,name),canonical(value),{mode:0o600});
const backend=d=>privateRead(join(d,'synthetic-relayer.json')),tatum=d=>privateRead(join(d,'synthetic-tatum.json'));
const ledger=d=>{const a=ordinaryAuthorization(d);return privateRead(join(a.run,'agent-ledger.json'));};
const gas=(m,index,source='fixture')=>({schema:'recall-experience/1',workspace:m.workspace,network:'mainnet',operation:'gas-payer',source,
 digest:FIXTURE_DIGESTS[index],sponsored:false,claimed:FIXTURE_OTHER,observed:FIXTURE_WALLET,verdict:'fail',supersedes:null});
const pair=(m,index)=>{const a=gas(m,index);return [a,{...a,claimed:FIXTURE_WALLET,verdict:'resolved',supersedes:operationKey(a)}];};
async function seed(d,m,records){
 const s=backend(d),journal=new FileWriteJournal(join(d,'journal-experience'));
 for(const record of records){
  const key=operationKey(record),blob_id=key;s.records.push({namespace:m.namespaces.experience,text:canonical(record),blob_id,key});
  await journal.save(key,{state:'done',sha256:runHash(record),jobId:'fixture-history-'+key,blobId:blob_id});
 }s.revision++;file(d,'synthetic-relayer.json',s);
}
globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};

test('ordinary source assembly performs selected Tatum requests with real installed SDK and truthful fixture provenance',async()=>{
 const d=directory();let r,client;try{
  const m=await createOrdinaryFixture(d,{captureConsent:false});r=await openOrdinaryFixture(d);
  const [a,b]=InMemoryTransport.createLinkedPair();await r.server.connect(r.observe(b));client=new Client({name:'ordinary-contract-check',version:'1'});await client.connect(a);
  const tools=(await client.listTools()).tools;
  assert(!tools.some(t=>t.name==='find_wallet_activity'));assert(tools.some(t=>t.name==='prepare_report'));
  const response=await client.callTool({name:'prepare_report',arguments:{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[FIXTURE_DIGESTS[1]]}});
  assert(!response.isError);const report=JSON.parse(response.content[0].text);
  assert.equal(report.mode,m.mode);assert.equal(report.transactionEvidence[0].source,'fixture');assert.equal(report.dataProvenance.freshProviderRead,false);
  assert.equal(report.dataProvenance.sourceMode,'offline-intercepted-tatum');
  const declined=await r.session.verifyGasPayer(report.reportId,FIXTURE_DIGESTS[1],FIXTURE_OTHER);
  assert.equal(declined.verdict,'fail');assert.equal(declined.memory,null);
  const exportResult=await client.callTool({name:'export_report',arguments:{reportId:report.reportId}});
  const csv=JSON.parse(exportResult.content[0].text);assert(csv.csv.includes('"fixture"'));assert(csv.artifact.sha256);
  assert.equal(tatum(d).requests.length,1);assert.deepEqual(tatum(d).requests[0].digests,[FIXTURE_DIGESTS[1]]);
  assert.equal(ledger(d).tatumBatches,1);assert.equal(ledger(d).writes,0);
 }finally{await client?.close();r?.close();assert.equal(tatum(d).closedClients,1);rmSync(d,{recursive:true,force:true});}
});

test('invalid batch, duplicate digest and wrong network fail before Tatum reservation or transport',async()=>{
 const d=directory();let r;try{
  await createOrdinaryFixture(d);r=await openOrdinaryFixture(d);
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[]),/TRANSACTION_LIST_LIMIT/);
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[0],FIXTURE_DIGESTS[0]]),/DUPLICATE_TRANSACTION/);
  await assert.rejects(r.session.prepare('testnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[0]]),/WRONG_NETWORK/);
  assert.equal(tatum(d).requests.length,0);assert.equal(ledger(d).tatumBatches,0);assert.equal(r.session.stopped,false);
  await r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[2]]);assert.equal(ledger(d).tatumBatches,1);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('one workspace lease excludes a second process for every read/Tatum operation and blocks new run admission',async()=>{
 const d=directory();let r;try{
  await createOrdinaryFixture(d);r=await openOrdinaryFixture(d);
  await assert.rejects(openOrdinaryFixture(d),/EEXIST/);
  const script="import {openOrdinaryFixture} from './app/agent-ordinary-fixture.mjs';globalThis.fetch=()=>{throw Error('NETWORK_DENIED')};try{await openOrdinaryFixture(process.argv[1]);process.exit(2)}catch{process.exit(0)}";
  const child=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning','--input-type=module','-e',script,d],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(child.status,0);assert.equal(tatum(d).requests.length,0);
  assert.throws(()=>createOrdinaryRun(d,ordinaryFixtureConsent()),/ORDINARY_WORKSPACE_BUSY/);
  await r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[0]]);assert.equal(tatum(d).requests.length,1);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('fresh independent MCP processes recover more than one exact pair and preserve the same run counters',async()=>{
 const d=directory();let client;const pids=[];try{
  const m=await createOrdinaryFixture(d);await seed(d,m,[...pair(m,0),...pair(m,1)]);
  async function open(){client=new Client({name:'ordinary-fresh-process',version:'1'});const t=new StdioClientTransport({command:process.execPath,
   args:['--disable-warning=ExperimentalWarning',join(root,'app/agent-ordinary-fixture.mjs'),'--mcp',d]});await client.connect(t);pids.push(t.pid);await client.listTools();}
  for(let i=0;i<2;i++){
   await open();const response=await client.callTool({name:'prepare_report',arguments:{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[FIXTURE_DIGESTS[i]]}});
   assert(!response.isError);const p=JSON.parse(response.content[0].text);assert.equal(p.experience.length,4);
   assert.deepEqual(p.experience.map(x=>x.id).sort(),[...pair(m,0),...pair(m,1)].map(operationKey).sort());
   assert(p.experience.every(x=>x.blobId===operationKey(x.record)));await client.close();client=undefined;
  }
  assert.notEqual(pids[0],pids[1]);assert.equal(ledger(d).tatumBatches,2);assert.equal(ledger(d).reads,2);assert.equal(ledger(d).writes,0);
  const r=await openOrdinaryFixture(d);try{
   await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[2]]),/TATUM_FREE_ALLOWANCE/);
   assert.equal(tatum(d).requests.length,2);assert.equal(ledger(d).tatumBatches,2);
  }finally{r.close();}
 }finally{await client?.close();rmSync(d,{recursive:true,force:true});}
});

test('retained capacity twenty does not increase the two shared writes across address rules and experience',async()=>{
 const d=directory();let r;try{
  const m=await createOrdinaryFixture(d);await seed(d,m,[...pair(m,0),...pair(m,1)]);r=await openOrdinaryFixture(d);
  const rule=newRule({owner:m.owner,project:m.workspace},'mainnet',FIXTURE_WALLET,FIXTURE_OTHER,'external','Synthetic confirmed context',
   '2026-11-06T00:00:00.000Z','2026-01-01T00:00:00.000Z',null);
  await r.rules.write(rule,operationKey(rule));await r.experience.write(gas(m,2));
  assert.equal(ledger(d).writes,2);assert.equal((await r.experience.read()).length,5);
  const n=backend(d).requests.length;
  await assert.rejects(r.experience.write({...gas(m,2),claimed:address('0xc')}),/AGENT_LIMIT/);
  assert.equal(backend(d).requests.length,n);assert.equal(ledger(d).writes,2);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('new run requires explicit fresh approval and preserves prior ledgers, shared namespace and retained receipts',async()=>{
 const d=directory();let r;try{
  const m=await createOrdinaryFixture(d);r=await openOrdinaryFixture(d);await r.experience.write(gas(m,0));r.close();r=undefined;
  const oldPath=join(d,'runs',m.runId,'agent-ledger.json'),before=readFileSync(oldPath,'utf8');
  const next=createOrdinaryRun(d,ordinaryFixtureConsent());assert.notEqual(next.runId,m.runId);assert.deepEqual(next.namespaces,m.namespaces);
  assert.equal(readFileSync(oldPath,'utf8'),before);r=await openOrdinaryFixture(d);assert.equal(r.gate.state().writes,0);
  assert.equal((await r.experience.read())[0].id,operationKey(gas(m,0)));
  await r.experience.write(gas(m,1));assert.equal(r.gate.state().writes,1);assert.equal(readFileSync(oldPath,'utf8'),before);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('unresolved retained journal forbids another run and missing old ledger cannot be reset',async()=>{
 const d=directory();let r;try{
  await createOrdinaryFixture(d);r=await openOrdinaryFixture(d,{failAfterAccepted:true});
  await assert.rejects(r.experience.write(gas(r.gate.manifest,0)),/ACCEPTED_RESPONSE_LOSS/);r.close();r=undefined;
  assert.throws(()=>createOrdinaryRun(d,ordinaryFixtureConsent()),/WRITE_OUTCOME_UNCERTAIN/);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
 const e=directory();try{
  const m=await createOrdinaryFixture(e);unlinkSync(join(e,'runs',m.runId,'agent-ledger.json'));
  assert.throws(()=>createOrdinaryRun(e,ordinaryFixtureConsent()),/ENOENT/);
 }finally{rmSync(e,{recursive:true,force:true});}
});

test('stale or changed approval and mismatched key stop without a native Tatum request',async()=>{
 const d=directory();let r;try{
  await createOrdinaryFixture(d);r=await openOrdinaryFixture(d,{tatumKey:'wrong-public-sentinel'});
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[0]]),/TATUM_KEY_BINDING/);
  assert.equal(ledger(d).tatumBatches,0);assert.equal(tatum(d).requests.length,0);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
 const e=directory();try{
  await createOrdinaryFixture(e);const {run}=ordinaryAuthorization(e),proof=privateRead(join(run,'ordinary-approval.json'));
  proof.captureConsent=false;file(run,'ordinary-approval.json',proof);await assert.rejects(openOrdinaryFixture(e),/ORDINARY_APPROVAL_BINDING/);
  assert.equal(tatum(e).requests.length,0);
 }finally{rmSync(e,{recursive:true,force:true});}
 const f=directory();try{
  await createOrdinaryFixture(f);const old=ordinaryFixtureConsent();old.checkedAt='2026-01-01T00:00:00.000Z';
  assert.throws(()=>createOrdinaryRun(f,old),/BILLING_CHECK_EXPIRED/);
 }finally{rmSync(f,{recursive:true,force:true});}
});

test('corpus over capacity and incompatible parent/source fail without truncation or write',async()=>{
 const d=directory();let r;try{
  const m=await createOrdinaryFixture(d),records=Array.from({length:MAX_EXPERIENCE_RECORDS+1},(_,i)=>({...gas(m,0),claimed:address('0x'+(i+20).toString(16))}));
  assert.throws(()=>validateExperienceRows(records.map(record=>({record,id:operationKey(record)})),m.workspace),/EXPERIENCE_LIMIT/);
  const [parent,resolution]=pair(m,0),bad={...resolution,source:'replay'};
  assert.throws(()=>validateExperienceRows([parent,bad].map(record=>({record,id:operationKey(record)})),m.workspace),/EXPERIENCE_PARENT/);
  await seed(d,m,records);r=await openOrdinaryFixture(d);await assert.rejects(r.experience.read(),/MEMORY_CORPUS_LIMIT/);
  assert.equal(ledger(d).writes,0);assert.equal(backend(d).records.length,21);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('ordinary fixture cannot activate real entry or bypass the workspace lease',async()=>{
 const d=directory();try{
  const m=await createOrdinaryFixture(d);assert.throws(()=>validateAgentManifest({...m,mode:'live-providers'},{ordinary:true}),/AGENT_OFFLINE_ONLY/);
  const {run}=ordinaryAuthorization(d);assert.throws(()=>new AgentRunGate(run,{ordinary:true,workspaceDirectory:d}),/AGENT_WORKSPACE_LEASE_REQUIRED/);
  let touched=false;await assert.rejects(openInjectedOrdinary(d,{createSdk:()=>{touched=true;},transport:undefined,createData:()=>{touched=true;}}),/ORDINARY_INJECTED_PORTS_REQUIRED/);
  assert.equal(touched,false);
  const child=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning',join(root,'app/agent-ordinary-fixture.mjs'),'--live',d],{encoding:'utf8',timeout:10000});
  assert.equal(child.status,1);assert(child.stderr.includes('ORDINARY_OFFLINE_FIXTURE_ONLY'));assert.equal(tatum(d).requests.length,0);
 }finally{rmSync(d,{recursive:true,force:true});}
});

test('failed Tatum attempt consumes its slot once, stops, closes channel and never retries',async()=>{
 const d=directory();let r;try{
  await createOrdinaryFixture(d);r=await openOrdinaryFixture(d,{fail:true});
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[0]]),/SYNTHETIC_TATUM_FAILURE/);
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[0]]),/AGENT_STOPPED/);
  assert.equal(ledger(d).tatumBatches,1);assert.equal(tatum(d).requests.length,1);
  r.close();r.close();assert.equal(tatum(d).closedClients,1);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('expiry or modified consent between batches is rechecked before a second actual call',async()=>{
 const d=directory();let r;const originalNow=Date.now;try{
  await createOrdinaryFixture(d);r=await openOrdinaryFixture(d);
  await r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[0]]);
  Date.now=()=>originalNow()+300001;
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[1]]),/AGENT_ADMISSION_EXPIRED/);
  Date.now=originalNow;assert.equal(tatum(d).requests.length,1);assert.equal(ledger(d).tatumBatches,1);
 }finally{Date.now=originalNow;r?.close();rmSync(d,{recursive:true,force:true});}
 const e=directory();try{
  await createOrdinaryFixture(e);r=await openOrdinaryFixture(e);const {run}=ordinaryAuthorization(e),proof=privateRead(join(run,'ordinary-approval.json'));
  proof.captureConsent=false;file(run,'ordinary-approval.json',proof);
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[0]]),/AGENT_WORKSPACE_LEASE_REQUIRED/);
  assert.equal(tatum(e).requests.length,0);assert.equal(privateRead(join(run,'agent-ledger.json')).tatumBatches,0);
 }finally{r?.close();rmSync(e,{recursive:true,force:true});}
});

test('closing during channel creation retains the workspace stop and closes a late client without RPC',async()=>{
 const d=directory();let r,release;let closed=0,calls=0;try{
  const m=await createOrdinaryFixture(d);
  r=await openInjectedOrdinary(d,{createSdk:fixtureSdk,transport:fixtureTransport(d,{manifest:m}),tatumKey:SYNTHETIC_TATUM_KEY,
   createData:()=>new Promise(resolve=>{release=()=>resolve({close(){closed++;},transactions(){calls++;throw Error('MUST_NOT_RUN')}});}),wait:async()=>{}});
  const task=r.session.prepare('mainnet',FIXTURE_WALLET,[FIXTURE_DIGESTS[0]]);
  while(!release)await new Promise(resolve=>setImmediate(resolve));
  r.close();release();await assert.rejects(task,/AGENT_RUNTIME_CLOSED/);
  assert.equal(calls,0);assert.equal(closed,1);assert(existsSync(join(d,'.ordinary-runtime')));
  assert.throws(()=>createOrdinaryRun(d,ordinaryFixtureConsent()),/ORDINARY_WORKSPACE_BUSY/);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});

test('public launcher prepares explicitly and exposes only the intercepted empty-chat provider path',async()=>{
 const d=directory();let client;try{
  const setup=spawnSync('/bin/bash',[join(root,'start.command'),'--prepare-provider-fixture',d],{encoding:'utf8',timeout:10000});
  assert.equal(setup.status,0);assert.equal(JSON.parse(setup.stdout).realProviderCalls,0);assert.equal(JSON.parse(setup.stdout).modelCalls,0);
  const second=spawnSync('/bin/bash',[join(root,'start.command'),'--prepare-provider-fixture',d],{encoding:'utf8',timeout:10000});
  assert.equal(second.status,1);assert(second.stderr.includes('ORDINARY_WORKSPACE_NOT_EMPTY'));
  client=new Client({name:'ordinary-start-command-check',version:'1'});await client.connect(new StdioClientTransport({command:'/bin/bash',
   args:[join(root,'start.command'),'--mcp',d,'--provider-fixture']}));
  assert((await client.listTools()).tools.some(t=>t.name==='prepare_report'));assert.equal(tatum(d).requests.length,0);
  await client.close();client=undefined;
  const args=agentArgs('/node','/root','/workspace',[],false,'provider-fixture');
  assert(args.some(a=>a.includes('agent-ordinary-fixture.mjs')));
  for(let i=0;i<args.length;i+=2)assert(['-C','-s','-a','-c'].includes(args[i]));
  assert(!args.some(a=>/After the first|first tool|second transaction|gpt-5|wallet 0x/.test(a)));
  const mixed=spawnSync('/bin/bash',[join(root,'start.command'),'--mcp',d,'--provider-fixture','--saved'],{encoding:'utf8',timeout:10000});
  assert.equal(mixed.status,2);assert.equal(tatum(d).requests.length,0);
 }finally{await client?.close();rmSync(d,{recursive:true,force:true});}
});
