import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync,mkdirSync,symlinkSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EventEmitter} from 'node:events';
import {createOwnFixture,openOwnFixture,ownFixturePorts,OWN_FIXTURE_IDS,syntheticRetained} from './agent-own-fixture.mjs';
import {ownPath} from './agent-own-lineage.mjs';
import {openOwnAccount,ownAuthorization,createOwnActivation} from './agent-own.mjs';
import {ownClientArgs,cleanClientEnv,loginCommand,launchOwn} from './agent-own-launch.mjs';
import {FIXTURE_WALLET,FIXTURE_OTHER} from './activity-fixtures.ts';
import {privateRead,runHash} from './agent-run.mjs';
import {OWN_LIMITS} from './agent-own-contract.mjs';
import {PILOT_LIMITS} from './activity-live.ts';
import {agentWalrusFetch,WALRUS_RELAY} from './agent-walrus-guard.mjs';
const observedMainnetConfig=JSON.parse(readFileSync(new URL('../evidence/user-led-startup-2026-11-08/public-config.json',import.meta.url))).config;
import {transactionFact,NORMALIZER_SHA256} from './agent-facts.ts';
import {normalizeTransaction} from './activity.ts';
import {fixtureTransaction} from './activity-fixtures.ts';
import {operationKey} from './agent-run.mjs';
import {FileWriteJournal} from './activity-memory.ts';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {fileURLToPath} from 'node:url';
const dir=()=>mkdtempSync(join(tmpdir(),'recall-own-test-'));
const save=(p,x)=>writeFileSync(p,JSON.stringify(x),{mode:0o600});
test('capture-set writer rejects a direct or cached out-of-set note before reservation or transport',async()=>{
 for(const cached of [false,true]){const d=dir();let r;try{
  const m=await createOwnFixture(d,{captureSet:OWN_FIXTURE_IDS}),id='3o43bsVXvFpRthgSgkJzugZiR9UGPYWJsFKACXfkMho7';
  const raw=fixtureTransaction(0);raw.digest=id;raw.transaction.digest=id;raw.effects.transactionDigest=id;
  const record=transactionFact(m.workspace,normalizeTransaction(raw,id,'mainnet','fixture'),{kind:'fixture',method:'sui.rpc.v2.LedgerService/BatchGetTransactions',hashScope:'protobuf-json-selected-transaction',rawTransactionSha256:'a'.repeat(64),normalizerSha256:NORMALIZER_SHA256},new Date().toISOString());
  if(cached){await new FileWriteJournal(join(d,'journal-experience')).save(operationKey(record),{state:'done',sha256:runHash(record),blobId:operationKey(record),jobId:'cached-outside'});
   const p=join(d,'synthetic-relayer.json'),backend=privateRead(p);backend.records.push({namespace:m.namespaces.experience,text:JSON.stringify(record),blob_id:operationKey(record),key:operationKey(record)});backend.revision++;save(p,backend);}
  r=await openOwnFixture(d);const before=r.gate.state().requests;
  await assert.rejects(r.experience.write(record),/OWN_CAPTURE_SET_SCOPE/);const s=r.gate.state();
  assert.equal(s.writes,0);assert.equal(s.intents.length,0);assert.equal(s.requests,before);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}}
});
test('bounded public MCP rejects a thirteenth tool before handler or provider transport',async()=>{
 const d=dir();let client;try{await createOwnFixture(d,{captureConsent:false});const a=ownAuthorization(d,{fixture:true});
  client=new Client({name:'native-bound-check',version:'1'});await client.connect(new StdioClientTransport({command:process.execPath,
   args:['--disable-warning=ExperimentalWarning',fileURLToPath(new URL('./agent-own-entry.mjs',import.meta.url)),'--mcp',d,'--offline-fixture','--native-limit=12']}));
  const first=await client.callTool({name:'prepare_report',arguments:{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[OWN_FIXTURE_IDS[0]]}});assert(!first.isError);const report=JSON.parse(first.content[0].text);
  for(let i=0;i<11;i++)assert(!(await client.callTool({name:'refresh_report',arguments:{reportId:report.reportId}})).isError);
  const before=privateRead(join(a.run,'agent-ledger.json'));await assert.rejects(client.callTool({name:'refresh_report',arguments:{reportId:report.reportId}}),/NATIVE_TOOL_LIMIT/);
  const after=privateRead(join(a.run,'agent-ledger.json'));assert.equal(after.requests,before.requests);assert.equal(after.tatumBatches,1);assert.equal(after.writes,0);
 }finally{await client?.close();rmSync(d,{recursive:true,force:true});}
});
test('ordinary activation has distinct finite caps and cannot reset or reopen old grants',async()=>{
 const d=dir();try{await createOwnFixture(d);const a=ownAuthorization(d,{fixture:true});
  assert.deepEqual(PILOT_LIMITS,{tatumBatches:2,writes:2,reads:2,requests:64,pollsPerJob:8});
  assert.throws(()=>ownAuthorization(d),/ORDINARY_OFFLINE_ONLY/);
  assert.throws(()=>createOwnActivation(d,{}),/OWN_ACTIVATION_ALREADY_EXISTS/);
  const before=readFileSync(join(a.run,'agent-ledger.json'));let r=await openOwnFixture(d);r.close();r=await openOwnFixture(d);r.close();
  const s=privateRead(join(a.run,'agent-ledger.json'));assert.equal(s.writes,0);assert(s.requests>0);assert.notDeepEqual(readFileSync(join(a.run,'agent-ledger.json')),before);
 }finally{rmSync(d,{recursive:true,force:true});}
});
test('stopped, expired and tampered activations reject before credential or transport factories',async()=>{
 for(const mutation of ['stop','expiry','consent']){const d=dir();try{
  await createOwnFixture(d);const a=ownAuthorization(d,{fixture:true});
  if(mutation==='stop'){const s=privateRead(join(a.run,'agent-ledger.json'));s.stopped='SYNTHETIC_STOP';save(join(a.run,'agent-ledger.json'),s);}
  if(mutation==='expiry'){const m=privateRead(join(a.run,'agent-run.json'));m.expiresAt='2020-01-01T00:00:00.000Z';save(join(a.run,'agent-run.json'),m);}
  if(mutation==='consent'){const c=privateRead(join(d,'own-account-context.json'));c.captureConsent=false;save(join(d,'own-account-context.json'),c);}
  let called=0;const denied=()=>{called++;throw Error('UNEXPECTED_FACTORY');};
  await assert.rejects(openOwnAccount(d,{identity:denied,readKey:denied,createSdk:denied,transport:denied,createData:denied},{fixture:true}));assert.equal(called,0);
 }finally{rmSync(d,{recursive:true,force:true});}}
});
test('all seven notes fit worst allowed eight polls and legal extra verifier calls without another write',async()=>{
 const d=dir();let r;try{await createOwnFixture(d);r=await openOwnFixture(d,{doneAfterPolls:8});
  const report=await r.session.prepare('mainnet',FIXTURE_WALLET,OWN_FIXTURE_IDS);
  for(let i=0;i<5;i++){const result=await r.session.verifyGasPayer(report.reportId,OWN_FIXTURE_IDS[0],FIXTURE_OTHER);assert.equal(result.memory,null);}
  const s=r.gate.state();assert.equal(s.writes,7);assert(Object.values(s.jobs).every(j=>j.polls===8));assert(s.requests<=192);assert.equal(s.stopped,null);
  console.log(JSON.stringify({worstPollTrace:s.requests,legalExtraVerifierCalls:5,pollsPerJob:8}));
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});
test('Tatum, read and service request ceilings stop before another transport and survive restart',async()=>{
 for(const kind of ['tatumBatches','reads','requests']){const d=dir();let r;try{
  await createOwnFixture(d);r=await openOwnFixture(d);const path=join(r.gate.directory,'agent-ledger.json'),s=r.gate.state();s[kind]=OWN_LIMITS[kind];save(path,s);
  if(kind==='tatumBatches')await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[OWN_FIXTURE_IDS[0]]));
  else assert.throws(()=>r.gate.request(kind==='reads'?'reads':undefined),/AGENT_LIMIT/);
  assert(r.gate.state().stopped);r.close();r=undefined;await assert.rejects(openOwnFixture(d),/OWN_PRIOR_STOPPED/);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}}
});
test('write ceiling and whole-batch budget refuse an eighth note without partial capture',async()=>{
 const d=dir();let r;try{await createOwnFixture(d);r=await openOwnFixture(d);await r.session.prepare('mainnet',FIXTURE_WALLET,OWN_FIXTURE_IDS);
  assert.throws(()=>r.gate.ensureWriteAvailable(),/AGENT_LIMIT/);assert.equal(r.gate.state().writes,7);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});
test('accepted-but-unknown write and poll exhaustion preserve consumed intent and prohibit restart',async()=>{
 for(const opt of [{failAfterAccepted:true},{pendingForever:true}]){const d=dir();let r;try{
  await createOwnFixture(d);r=await openOwnFixture(d,opt);await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[OWN_FIXTURE_IDS[0]]));
  const s=r.gate.state();assert.equal(s.writes,1);assert(s.stopped);assert.notEqual(s.intents[0].state,'done');
  r.close();r=undefined;await assert.rejects(openOwnFixture(d));
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}}
});
test('oversized final candidate stops before any SDK remember, and account/key mismatch prevents provider startup',async()=>{
 const d=dir();let r;try{await createOwnFixture(d);r=await openOwnFixture(d,{transactionReply:(raw,i)=>{
  if(i===6)raw.transaction.kind.data.programmableTransaction.commands=Array(100).fill({command:{oneofKind:'moveCall',moveCall:{package:FIXTURE_WALLET,module:'a'.repeat(80),function:'f'}}});
  if(i===6)raw.balanceChanges=Array.from({length:80},(_,n)=>({address:'0x'+(n+1).toString(16),coinType:'0x2::sui::SUI',amount:'0'}));return raw;
 }});await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,OWN_FIXTURE_IDS),/FACT_TOO_LARGE/);assert.equal(r.gate.state().writes,0);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
 const e=dir();try{await createOwnFixture(e);const ports=ownFixturePorts(e);let calls=0;
  ports.readKey=async()=> 'wrong';ports.createSdk=()=>{calls++;throw Error('NO');};await assert.rejects(openOwnAccount(e,ports,{fixture:true}),/TATUM_KEY_BINDING/);assert.equal(calls,0);
 }finally{rmSync(e,{recursive:true,force:true});}
});
test('ordinary client starts empty, scrubs secrets, isolates official login and rejects source-local private workspace',async()=>{
 const args=ownClientArgs('/node','/root','/private/state',[]);
 for(let i=0;i<args.length;i+=2)assert(['-C','-s','-a','-c'].includes(args[i]));
 assert(!args.some(x=>/2GrJ|2it6|first task|nextTool/.test(x)));
 assert.deepEqual(cleanClientEnv({PATH:'/bin',TATUM_API_KEY:'synthetic',OPENAI_API_KEY:'synthetic',MEMWAL_CREDS_DIR:'synthetic',OPENAI_ACCESS_TOKEN:'synthetic',UNRELATED_ACCESS_TOKEN:'synthetic'}),{PATH:'/bin'});
 const c=loginCommand('/node','/root','/private/work');assert(c.args.includes('login'));assert.equal(c.env.MEMWAL_AUTO_SAVE,'0');assert.equal(c.env.MEMWAL_CREDS_DIR,'/private/work/profile');
 await assert.rejects(launchOwn(process.cwd(),join(process.cwd(),'inside'),{ports:{exec:()=>{throw Error('MUST_NOT_EXEC');}}}),/OWN_WORKSPACE_MUST_BE_OUTSIDE_SOURCE/);
});
test('retained bridge rejects foreign bindings, invalid receipts, pending origins and tampering before external ports',async()=>{
 for(const mutation of ['account','delegate','workspace','namespace','receipt','pending']){const d=dir(),old=dir();try{
  await assert.rejects(createOwnFixture(d,{retainedFactory:identity=>{const retained=syntheticRetained(identity,old);
   if(mutation==='account')retained.identity={...identity,accountId:'0x'+'f'.repeat(64)};
   if(mutation==='delegate')retained.identity={...identity,delegatePublicKeyHex:'f'.repeat(64)};
   if(mutation==='workspace')retained.records[0].record.workspace='agent-foreign';
   if(mutation==='namespace')retained.origins[0].manifest.namespaces.experience='foreign';
   if(mutation==='receipt')retained.receipts[retained.records[0].id].sha256='f'.repeat(64);
   if(mutation==='pending')retained.origins[0].ledger.intents[0].state='sent';return retained;
  }}));
 }finally{rmSync(d,{recursive:true,force:true});rmSync(old,{recursive:true,force:true});}}
 for(const field of ['ledger','native']){const d=dir(),old=dir();try{
  await createOwnFixture(d,{retainedFactory:identity=>syntheticRetained(identity,old)});const a=ownAuthorization(d,{fixture:true});
  const origin=a.context.retained.origins.find(o=>o.role==='closed-zero-write'),path=origin.files[field].path,x=JSON.parse(readFileSync(path));x.tampered=true;save(path,x);
  let calls=0;const denied=()=>{calls++;throw Error('MUST_NOT_ACCESS');};
  await assert.rejects(openOwnAccount(d,{identity:denied,readKey:denied,transport:denied,createData:denied,createSdk:denied},{fixture:true}),/OWN_LINEAGE_CHANGED/);assert.equal(calls,0);
 }finally{rmSync(d,{recursive:true,force:true});rmSync(old,{recursive:true,force:true});}}
});
test('retained proof requires actual signed content read before exposing tools and credential paths reject symlinks',async()=>{
 const d=dir(),old=dir();try{await createOwnFixture(d,{retainedFactory:identity=>syntheticRetained(identity,old)});
  await assert.rejects(openOwnFixture(d,{omitRecall:true}),/MEMORY_/);
  const file=join(old,'public-test-file');writeFileSync(file,'public synthetic sentinel',{mode:0o600});const link=join(old,'symlink');symlinkSync(file,link);
  assert.throws(()=>ownPath(link),/OWN_PRIVATE_PATH/);
 }finally{rmSync(d,{recursive:true,force:true});rmSync(old,{recursive:true,force:true});}
});
test('first own-account setup and restart use only injected login/profile/key inputs and preserve the same budget',async()=>{
 const home=realpathSync(dir()),events=[];try{
  const account='0'.repeat(24),answers=[account,'100','FACTS','ACTIVATE','t-'+account+'-public-synthetic-sentinel'];
  const ports={exec:(cmd,args)=>{events.push([cmd,...args]);if(cmd==='codex')return {status:0,stdout:args[0]==='login'?'Logged in using ChatGPT':'[]',stderr:''};
   mkdirSync(join(home,'profile'),{mode:0o700});return {status:0};},
   profile:()=>({walletAddress:FIXTURE_WALLET,accountId:'0x'+'1'.repeat(64),delegatePublicKeyHex:'2'.repeat(64),packageId:observedMainnetConfig.packageId,delegatePrivateKey:'public-synthetic-test-only'}),
   ask:async()=>answers.shift(),spawn:(_cmd,args,options)=>{events.push({args,providerKeyEnvPresent:Object.keys(options.env).some(k=>/API_KEY|MEMWAL|TATUM|DELEGATE/.test(k))});return new EventEmitter();}};
  await launchOwn(process.cwd(),home,{ports});const a=ownAuthorization(join(home,'state')),before=readFileSync(join(a.run,'agent-ledger.json'));
  assert.deepEqual(a.context.config,observedMainnetConfig);
  const gate={manifest:a.manifest,hash:runHash(a.manifest),directory:a.run,admit(){},request(){},stop(){},state:()=>({requests:1})};
  const accepted=await agentWalrusFetch(gate,async()=>Response.json(observedMainnetConfig))(WALRUS_RELAY+'/config');assert.equal(accepted.status,200);
  for(const mutation of [{network:'testnet'},{packageId:'0x'+'f'.repeat(64)},{suiTransport:'json-rpc'},{suiGrpcUrl:'https://wrong.invalid'},{suiRpcUrl:'https://wrong.invalid'},{suiRpcUrl:undefined}])
   await assert.rejects(agentWalrusFetch({...gate},async()=>Response.json({...observedMainnetConfig,...mutation}))(WALRUS_RELAY+'/config'),/AGENT_CONFIG_SCOPE/);
  await launchOwn(process.cwd(),home,{ports});assert.deepEqual(readFileSync(join(a.run,'agent-ledger.json')),before);assert.equal(answers.length,0);
  assert.equal(events.filter(x=>Array.isArray(x)&&x.some(y=>String(y).includes('memwal-mcp.js'))).length,1);
  assert(events.filter(x=>x.args).every(x=>x.providerKeyEnvPresent===false));
 }finally{rmSync(home,{recursive:true,force:true});}
});
test('declining the single activation confirmation stops before key input, activation or client start',async()=>{
 const home=realpathSync(dir()),questions=[],answers=['0'.repeat(24),'100','ALL','NO'];let closed=false,spawned=false;
 const ask=async(text,secret)=>{questions.push({text,secret:!!secret});return answers.shift();};ask.close=()=>{closed=true;};
 try{
  await assert.rejects(launchOwn(process.cwd(),home,{ports:{
   exec:()=>({status:0,stdout:'Logged in using ChatGPT',stderr:''}),
   profile:()=>({walletAddress:FIXTURE_WALLET,accountId:'0x'+'1'.repeat(64),delegatePublicKeyHex:'2'.repeat(64),packageId:'0x'+'3'.repeat(64),delegatePrivateKey:'public-synthetic-test-only'}),
   ask,spawn:()=>{spawned=true;throw Error('MUST_NOT_START');}
  }}),/OWN_ACTIVATION_DENIED/);
  assert.equal(answers.length,0);assert(closed);assert(!spawned);assert(questions.every(q=>!q.secret));
  assert(!existsSync(join(home,'state')));assert(!existsSync(join(home,'tatum.key')));
 }finally{rmSync(home,{recursive:true,force:true});}
});
test('slow relayer stops at the unchanged 240-second deadline with consumed uncertainty, rather than extending time',async()=>{
 const d=dir();let r;const original=Date.now;let elapsed=0;
 try{await createOwnFixture(d);Date.now=()=>original()+elapsed;
  r=await openOwnFixture(d,{doneAfterPolls:8,wait:async ms=>{elapsed+=ms;}});
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,OWN_FIXTURE_IDS),/AGENT_RUN_EXPIRED/);
  const s=r.gate.state();assert(elapsed<=240000);assert(elapsed>=239000);assert(s.writes<7);assert(s.stopped);assert(s.intents.some(i=>i.state!=='done'));
  r.close();r=undefined;await assert.rejects(openOwnFixture(d));
 }finally{Date.now=original;r?.close();rmSync(d,{recursive:true,force:true});}
});
test('selected-set capture defers every write until all seven whole payloads pass in arbitrary batches',async()=>{
 const d=dir();let r;try{await createOwnFixture(d,{captureSet:OWN_FIXTURE_IDS});r=await openOwnFixture(d);
  for(const id of OWN_FIXTURE_IDS.slice(0,6).reverse()){const report=await r.session.prepare('mainnet',FIXTURE_WALLET,[id]);assert.equal(report.factCaptureSet.state,'awaiting-complete-set');assert.equal(r.gate.state().writes,0);}
  await r.session.prepare('mainnet',FIXTURE_WALLET,[OWN_FIXTURE_IDS[6]]);assert.equal(r.gate.state().writes,7);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
 const e=dir();try{await createOwnFixture(e,{captureSet:OWN_FIXTURE_IDS});r=await openOwnFixture(e,{transactionReply:(raw,i)=>{
  if(i===6)raw.balanceChanges=Array.from({length:80},(_,n)=>({address:'0x'+(n+1).toString(16),coinType:'0x2::sui::SUI',amount:'0'}));return raw;
 }});
  for(const id of OWN_FIXTURE_IDS.slice(0,6))await r.session.prepare('mainnet',FIXTURE_WALLET,[id]);
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,[OWN_FIXTURE_IDS[6]]),/FACT_TOO_LARGE/);assert.equal(r.gate.state().writes,0);
 }finally{r?.close();rmSync(e,{recursive:true,force:true});}
});
test('fresh process loses uncommitted staging but keeps spent counters and must obtain fresh facts again',async()=>{
 const d=dir();let r;try{await createOwnFixture(d,{captureSet:OWN_FIXTURE_IDS});r=await openOwnFixture(d);
  for(const id of OWN_FIXTURE_IDS.slice(0,3))await r.session.prepare('mainnet',FIXTURE_WALLET,[id]);
  assert.equal(r.gate.state().tatumBatches,3);assert.equal(r.gate.state().writes,0);r.close();r=await openOwnFixture(d);
  assert.equal(r.session.pendingFacts.size,0);assert.equal(r.gate.state().tatumBatches,3);
  await r.session.prepare('mainnet',FIXTURE_WALLET,OWN_FIXTURE_IDS.slice(3));assert.equal(r.gate.state().writes,0);
  await r.session.prepare('mainnet',FIXTURE_WALLET,OWN_FIXTURE_IDS.slice(0,3));assert.equal(r.gate.state().writes,7);assert.equal(r.gate.state().tatumBatches,5);
 }finally{r?.close();rmSync(d,{recursive:true,force:true});}
});
