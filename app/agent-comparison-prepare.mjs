// Offline preparation: replay recorded native requests, never manufacture a model response.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {InMemoryTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/inMemory.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {offlineAgent} from './agent-mcp.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const [workspace,audit]=process.argv.slice(2);assert(workspace&&audit);
const path=join(root,'evidence/wallet-model-probe-2026-11-06/run.json');
const historical=JSON.parse(readFileSync(path,'utf8'));
const trace=historical.attempts.find(a=>a.name==='user-selected-luna').trace;
const failure=trace.findIndex(t=>t.kind==='tool'&&t.tool==='find_wallet_activity'&&t.status==='failed');
assert(failure>=0);
const bad=trace[failure];
const signature=t=>JSON.stringify({...t.arguments,limit:null});
const recovery=trace.findIndex((t,i)=>i>failure&&t.kind==='tool'&&t.tool===bad.tool&&t.status==='completed'&&signature(t)===signature(bad));
assert(recovery>failure);
mkdirSync(workspace,{mode:0o700});
const runtime=offlineAgent(workspace,true,'saved');
const [wire,serverWire]=InMemoryTransport.createLinkedPair();
await runtime.server.connect(runtime.observe(serverWire));
let client=new Client({name:'historical-request-replay',version:'1'});await client.connect(wire);
let records;
try{
 await client.listTools();
 const rejected=await client.callTool({name:bad.tool,arguments:bad.arguments});assert.equal(rejected.isError,true);
 const resolved=await client.callTool({name:bad.tool,arguments:trace[recovery].arguments});assert.equal(Boolean(resolved.isError),false);
 records=await runtime.session.experience.read();assert.equal(records.length,2);
 assert.equal(records[1].record.supersedes,records[0].id);
}finally{await client.close();}
client=new Client({name:'independent-restored-catalog',version:'1'});
await client.connect(new StdioClientTransport({command:'/bin/bash',args:[join(root,'start.command'),'--mcp',workspace,'--saved','--capture-local']}));
let readback;
try{
 const catalog=await client.listTools();const tool=catalog.tools.find(t=>t.name===bad.tool);
 readback=tool._meta['recall/verifiedExperience'];assert.deepEqual(readback.map(r=>r.id),records.map(r=>r.id));
}finally{await client.close();}
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const initialState=Object.fromEntries(['activity-memory.json','agent-workspace.json','experience.json'].map(n=>[n,hash(join(workspace,n))]));
writeFileSync(audit,JSON.stringify({schema:1,preparation:'historical-native-requests-replayed-through-current-sdk',sourceArtifactSha256:hash(path),
 sourceTraceIndices:{failure,recovery},requests:[bad.arguments,trace[recovery].arguments],records,independentCatalogReadback:readback,
 initialState,modelCalls:0,tatumCalls:0,walrusCalls:0},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({restoredRecords:records.length,independentReadback:true,modelCalls:0,tatumCalls:0,walrusCalls:0}));
