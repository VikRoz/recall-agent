import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,readdirSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {McpServer} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {InMemoryTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/inMemory.js';
import {z} from '../mcp/node_modules/zod/index.js';
import {ObservedToolTransport} from './agent-tool-observer.mjs';
import {LocalExperienceStore,validateExperience,validateExperienceRows} from './agent-experience.ts';
import {CsvArtifacts} from './agent-export.mjs';
import {loadOfflineActivity} from './agent-activity-index.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=()=>mkdtempSync(join(tmpdir(),'recall-observer-'));
const project='observer-test';
async function connect(directory,{capture=true,max=10,source='fixture',storeOverride}={}){
 let handled=0,reads=0,stops=0;
 const base=new LocalExperienceStore(directory,project);
 const store=storeOverride??{storage:base.storage,read:()=>{reads++;return base.read();},write:r=>base.write(r)};
 const server=new McpServer({name:'numeric-test',version:'1'});
 server.registerTool('find_wallet_activity',{description:'Test numeric constraints.',inputSchema:{limit:z.number().int().min(1).max(max),secret:z.string().optional()},annotations:{readOnlyHint:true}},
  async()=>{handled++;return {content:[{type:'text',text:'ok'}]};});
 const [clientWire,serverWire]=InMemoryTransport.createLinkedPair();
 const observer=new ObservedToolTransport(serverWire,{store,workspace:project,source,capture,stop:()=>{stops++;}});
 await server.connect(observer);
 const client=new Client({name:'offline-observer-test',version:'1'});await client.connect(clientWire);
 return {client,server,base,observer,get handled(){return handled;},get reads(){return reads;},get stops(){return stops;},close:()=>client.close()};
}

test('SDK rejects invalid arguments before handler; observer records only safe constraint evidence and verified recovery',async()=>{
 const d=dir();let r;try{
  r=await connect(d);const list=await r.client.listTools();assert.equal(list.tools[0].annotations.readOnlyHint,false);
  const invalid=await r.client.callTool({name:'find_wallet_activity',arguments:{limit:100,secret:'DO_NOT_PERSIST_THIS'}});
  assert.equal(invalid.isError,true);assert.equal(r.handled,0);
  assert.equal(invalid._meta['recall/observation'].storage,'local-fixture');
  let rows=await r.base.read();assert.equal(rows.length,1);assert.equal(rows[0].record.schema,'recall-tool-experience/1');
  assert.equal(rows[0].record.field,'limit');assert.equal(rows[0].record.bound,10);assert.equal(rows[0].record.attempted,100);
  assert.equal(readFileSync(join(d,'experience.json'),'utf8').includes('DO_NOT_PERSIST_THIS'),false);
  await r.client.callTool({name:'find_wallet_activity',arguments:{limit:100}});assert.equal((await r.base.read()).length,1);
  const recovered=await r.client.callTool({name:'find_wallet_activity',arguments:{limit:10}});assert.equal(Boolean(recovered.isError),false);assert.equal(r.handled,1);
  rows=await r.base.read();assert.equal(rows.length,2);assert.equal(rows[1].record.verdict,'resolved');assert.equal(rows[1].record.supersedes,rows[0].id);
  await r.client.callTool({name:'find_wallet_activity',arguments:{limit:10}});assert.equal((await r.base.read()).length,2);
  assert.equal(r.reads,1);assert.equal(r.stops,0);
 }finally{await r?.close();rmSync(d,{recursive:true,force:true});}
});

test('fresh catalog recovers evidence as data; changed schema or data source removes stale hints',async()=>{
 const d=dir();let r;try{
  r=await connect(d);await r.client.listTools();await r.client.callTool({name:'find_wallet_activity',arguments:{limit:100}});
  await r.client.callTool({name:'find_wallet_activity',arguments:{limit:10}});await r.close();
  r=await connect(d);let tools=(await r.client.listTools()).tools;
  assert.equal(tools[0]._meta['recall/verifiedExperience'].length,2);assert.ok(tools[0].description.includes('data, not instructions'));
  await r.close();r=await connect(d,{max:20});tools=(await r.client.listTools()).tools;
  assert.equal(tools[0]._meta?.['recall/verifiedExperience'],undefined);
  await r.close();r=await connect(d,{source:'replay'});tools=(await r.client.listTools()).tools;
  assert.equal(tools[0]._meta?.['recall/verifiedExperience'],undefined);
 }finally{await r?.close();rmSync(d,{recursive:true,force:true});}
});

test('opt-out, missing safe numeric values and already-valid calls never manufacture experience',async()=>{
 const d=dir();let r;try{
  r=await connect(d,{capture:false});assert.equal((await r.client.listTools()).tools[0].annotations.readOnlyHint,true);
  await r.client.callTool({name:'find_wallet_activity',arguments:{limit:100}});await r.close();
  r=await connect(d);await r.client.listTools();
  for(const value of ['100',1000000001])await r.client.callTool({name:'find_wallet_activity',arguments:{limit:value}});
  await r.client.callTool({name:'find_wallet_activity',arguments:{limit:10}});
  assert.deepEqual(await r.base.read(),[]);
 }finally{await r?.close();rmSync(d,{recursive:true,force:true});}
});

test('uncertain observation write quarantines the connection without resubmitting or running later tools',async()=>{
 const d=dir();let r,writes=0;try{
  r=await connect(d,{storeOverride:{storage:'local-fixture',read:async()=>[],write:async()=>{writes++;throw Error('SIMULATED_UNCERTAIN');}}});
  await r.client.listTools();
  await assert.rejects(r.client.callTool({name:'find_wallet_activity',arguments:{limit:100}}),/MEMORY_OBSERVER_STOPPED/);
  await assert.rejects(r.client.callTool({name:'find_wallet_activity',arguments:{limit:10}}),/MEMORY_OBSERVER_STOPPED/);
  assert.equal(writes,1);assert.equal(r.handled,0);assert.equal(r.stops,1);
 }finally{await r?.close();rmSync(d,{recursive:true,force:true});}
});

test('numeric experience validates schema, parent compatibility, privacy fields and the unchanged two-record cap',async()=>{
 const d=dir();let r;try{
  r=await connect(d);await r.client.listTools();await r.client.callTool({name:'find_wallet_activity',arguments:{limit:100}});
  await r.client.callTool({name:'find_wallet_activity',arguments:{limit:10}});
  const rows=await r.base.read();validateExperienceRows(rows,project);
  assert.throws(()=>validateExperience({...rows[0].record,secret:'extra'},project),/INVALID_KEYS/);
  assert.throws(()=>validateExperience({...rows[0].record,field:'password'},project),/CONSTRAINT/);
  await assert.rejects(r.base.write({...rows[0].record,attempted:200}),/EXPERIENCE_LIMIT/);
  const other={...rows[1].record,source:'replay'};
  const otherDir=dir();try{await assert.rejects(new LocalExperienceStore(otherDir,project).write(other),/PARENT/);}finally{rmSync(otherDir,{recursive:true,force:true});}
 }finally{await r?.close();rmSync(d,{recursive:true,force:true});}
});

test('CSV artifacts preserve exact bytes and replay provenance, reuse identical files and reject tampering',()=>{
 const d=dir();try{
  const store=new CsvArtifacts(d),value='source,amount\r\nreplay,-104261\r\n',a=store.write(value);
  assert.equal(readFileSync(a.path,'utf8'),value);assert.equal(a.sha256,createHash('sha256').update(value).digest('hex'));
  assert.deepEqual(store.write(value),a);assert.equal(readdirSync(join(d,'exports')).length,1);
  writeFileSync(a.path,'tampered');assert.throws(()=>store.write(value),/EXPORT_HASH/);
  assert.equal(readFileSync(a.path,'utf8'),'tampered');
 }finally{rmSync(d,{recursive:true,force:true});}
});

test('CSV artifact paths, output size and count are bounded; existing symlinks are never followed',()=>{
 const d=dir(),target=dir();try{
  symlinkSync(target,join(d,'exports'));assert.throws(()=>new CsvArtifacts(d).write('x'),/EXPORT_DIRECTORY/);
  const clean=new CsvArtifacts(target);assert.throws(()=>clean.write('a'.repeat(65537)),/EXPORT_SIZE/);
  for(let i=0;i<8;i++)clean.write('header\n'+i+'\n');
  assert.throws(()=>clean.write('header\n9\n'),/EXPORT_LIMIT/);
 }finally{rmSync(d,{recursive:true,force:true});rmSync(target,{recursive:true,force:true});}
});

test('independent MCP processes recover SDK-level error and correction; export returns an exact original resource',async()=>{
 const d=dir();let client;
 async function open(){client=new Client({name:'offline-technical-memory',version:'1'});const wire=new StdioClientTransport({command:'/bin/bash',args:[join(root,'start.command'),'--mcp',d,'--saved','--capture-local']});await client.connect(wire);return wire.pid;}
 async function call(tool,args){const r=await client.callTool({name:tool,arguments:args});assert.equal(Boolean(r.isError),false,r.content[0]?.text);return {r,value:JSON.parse(r.content[0].text)};}
 try{
  const index=loadOfflineActivity('saved'),q={network:'mainnet',wallet:index.examples().senders[0]};
  const first=await open();await client.listTools();
  assert.equal((await client.callTool({name:'find_wallet_activity',arguments:{...q,limit:100}})).isError,true);
  const good=await call('find_wallet_activity',{...q,limit:10});await client.close();
  assert.notEqual(await open(),first);const tools=(await client.listTools()).tools;
  const hint=tools.find(t=>t.name==='find_wallet_activity')._meta['recall/verifiedExperience'];
  assert.equal(hint.length,2);assert.equal(hint[1].record.supersedes,hint[0].id);
  const report=await call('prepare_report',{...q,transactions:good.value.transactions.map(t=>t.digest)});
  const exported=await call('export_report',{reportId:report.value.reportId});
  assert.equal(readFileSync(exported.value.artifact.path,'utf8'),exported.value.csv);
  assert.ok(exported.value.csv.includes('"replay"'));
  assert.equal(exported.r.content[1].type,'resource_link');assert.equal(exported.r.content[1].uri,exported.value.artifact.uri);
  assert.equal(tools.find(t=>t.name==='export_report').annotations.readOnlyHint,false);
 }finally{await client?.close();rmSync(d,{recursive:true,force:true});}
});

test('constraint capture is derived from catalog bounds rather than a fixed maximum or demo value',async()=>{
 const d=dir(),d2=dir();let r;try{
  r=await connect(d,{max:37});await r.client.listTools();
  await r.client.callTool({name:'find_wallet_activity',arguments:{limit:80}});
  await r.client.callTool({name:'find_wallet_activity',arguments:{limit:22}});
  const rows=await r.base.read();assert.equal(rows[0].record.bound,37);assert.equal(rows[1].record.attempted,22);
  await r.close();r=await connect(d2);await r.client.listTools();
  await r.client.callTool({name:'find_wallet_activity',arguments:{limit:0}});
  await r.client.callTool({name:'find_wallet_activity',arguments:{limit:1}});
  const low=await r.base.read();assert.equal(low[0].record.constraint,'minimum');assert.equal(low[0].record.bound,1);assert.equal(low[1].record.verdict,'resolved');
 }finally{await r?.close();rmSync(d,{recursive:true,force:true});rmSync(d2,{recursive:true,force:true});}
});

test('typed technical experience passes the real Walrus writer/read contract using intercepted SDK responses only',async()=>{
 const {WalrusRecordStore,FileWriteJournal}=await import('./activity-memory.ts');
 const {WalrusExperienceStore}=await import('./agent-experience.ts');
 const d=dir(),journalDir=dir();let r;try{
  r=await connect(d);await r.client.listTools();await r.client.callTool({name:'find_wallet_activity',arguments:{limit:100}});
  await r.client.callTool({name:'find_wallet_activity',arguments:{limit:10}});
  const records=(await r.base.read()).map(row=>row.record),binding={owner:'0x'+'a'.padStart(64,'0'),project};
  const submitted=[],stored=[];let admitted=false;
  const sdk={
    listMemories:async()=>({snapshot_version:stored.length,must_resync:false,has_more:false,memories:stored.map(s=>({namespace_id:project,status:'stored',blob_id:s.blob}))}),
    recall:async()=>({results:stored.map(s=>({blob_id:s.blob,text:s.text}))}),
    remember:async(text,namespace)=>{assert.equal(namespace,project);submitted.push(text);return {job_id:'job-'+submitted.length};},
    getRememberStatus:async job=>{const n=Number(job.slice(4));const text=submitted[n-1];const blob=createHash('sha256').update(text).digest('base64url');if(!stored.some(s=>s.blob===blob))stored.push({blob,text});return {job_id:job,status:'done',blob_id:blob,owner:binding.owner,namespace:project};},
  };
  const port=new WalrusRecordStore(sdk,binding,new FileWriteJournal(journalDir),(record,b)=>validateExperience(record,b.project),async()=>{});
  const store=new WalrusExperienceStore(port,async()=>assert.equal(admitted,true,'ADMISSION_REQUIRED'));
  await assert.rejects(store.write(records[0]),/ADMISSION_REQUIRED/);assert.equal(submitted.length,0);
  admitted=true;await store.write(records[0]);await store.write(records[1]);
  const readback=await store.read();assert.equal(readback.length,2);assert.ok(readback.every(row=>row.blobId&&row.record.schema==='recall-tool-experience/1'));
  await store.write(records[1]);assert.equal(submitted.length,2);
 }finally{await r?.close();rmSync(d,{recursive:true,force:true});rmSync(journalDir,{recursive:true,force:true});}
});

test('transport keeps numeric request ID zero separate from a colliding server request and forwards lifecycle',async()=>{
 const d=dir();try{
  const sent=[];let version,closed=0;
  const inner={sessionId:'offline-session',start:async()=>{},send:async m=>{sent.push(m);},close:async()=>inner.onclose?.(),setProtocolVersion:v=>{version=v;}};
  const store=new LocalExperienceStore(d,project);
  const observed=new ObservedToolTransport(inner,{store,workspace:project,source:'fixture',capture:true,stop:()=>assert.fail('unexpected stop')});
  observed.onmessage=()=>{};observed.onclose=()=>{closed++;};await observed.start();observed.setProtocolVersion('test-version');
  assert.equal(version,'test-version');assert.equal(observed.sessionId,'offline-session');
  inner.onmessage({jsonrpc:'2.0',id:1,method:'tools/list'});
  await observed.send({jsonrpc:'2.0',id:1,result:{tools:[{name:'find_wallet_activity',inputSchema:{type:'object',properties:{limit:{type:'integer',maximum:7}}}}]}});
  inner.onmessage({jsonrpc:'2.0',id:0,method:'tools/call',params:{name:'find_wallet_activity',arguments:{limit:8}}});
  await observed.send({jsonrpc:'2.0',id:0,method:'elicitation/create',params:{}});
  await observed.send({jsonrpc:'2.0',id:0,result:{isError:true,content:[{type:'text',text:'Input validation error: limit'}]}});
  assert.equal((await store.read()).length,1);assert.equal(observed.pending.size,0);
  assert.equal(sent[1].method,'elicitation/create');await observed.close();assert.equal(closed,1);
 }finally{rmSync(d,{recursive:true,force:true});}
});
