import test from 'node:test';
import assert from 'node:assert/strict';
import {probeApproval} from './agent-probe-approval.mjs';
const request={id:0,method:'mcpServer/elicitation/request',params:{serverName:'recall_lab',mode:'form',
 _meta:{codex_approval_kind:'mcp_tool_call'},message:'Allow the recall_lab MCP server to run tool "prepare_report"?',
 requestedSchema:{type:'object',properties:{}}}};
test('probe handles native zero request ID and grants only one known local operation',()=>{
 assert.deepEqual(probeApproval(request),{id:0,result:{action:'accept',content:{}}});
 assert.equal(probeApproval({...request,id:undefined}),null);
 for(const patch of [
  {serverName:'other'}, {mode:'url'}, {_meta:{codex_approval_kind:'other'}},
  {message:'Allow the recall_lab MCP server to run tool "save_address_rule"?'},
  {requestedSchema:{type:'object',properties:{password:{type:'string'}}}},
 ])assert.equal(probeApproval({...request,params:{...request.params,...patch}}),null);
 assert.deepEqual(probeApproval({...request,id:'0'}).id,'0');
 assert.equal(probeApproval({...request,params:{...request.params,message:'Allow the recall_lab MCP server to run tool "find_wallet_activity"?'}}).result.action,'accept');
});

test('probe stops an unavailable profile model rather than silently switching to catalog default', async()=>{
 const {requireAvailableModel}=await import('./agent-probe-model.mjs');
 const catalog={data:[{id:'gpt-5.6-luna',model:'gpt-5.6-luna'},{id:'gpt-6-astra',model:'gpt-6-astra',isDefault:true}]};
 assert.equal(requireAvailableModel(catalog,'gpt-5.6-luna'),'gpt-5.6-luna');
 assert.throws(()=>requireAvailableModel(catalog,'gpt-6.1-sol'),/MODEL_NOT_AVAILABLE/);
 assert.throws(()=>requireAvailableModel(catalog,undefined),/MODEL_NOT_AVAILABLE/);
 assert.throws(()=>requireAvailableModel({},'gpt-5.6-luna'),/MODEL_CATALOG_REQUIRED/);
});

test('native failed tool status is an error even when native error field is null',async()=>{
 const {nativeToolFailed}=await import('./agent-probe-results.mjs');
 assert.equal(nativeToolFailed({type:'mcpToolCall',status:'failed',error:null,result:{content:[]}}),true);
 assert.equal(nativeToolFailed({type:'mcpToolCall',status:'completed',error:null}),false);
 assert.equal(nativeToolFailed({type:'mcpToolCall',status:'completed',result:{isError:true}}),true);
 assert.equal(nativeToolFailed({type:'agentMessage',status:'failed'}),false);
});

test('CSV assessment accepts line ending differences but rejects rewritten schema and dropped provenance',async()=>{
 const {exactCsvDelivery}=await import('./agent-probe-results.mjs');
 assert.equal(exactCsvDelivery('source,amount\r\nreplay,-10\r\n','```csv\nsource,amount\nreplay,-10\n```'),true);
 assert.equal(exactCsvDelivery('source,amount\r\nreplay,-10\r\n','```csv\namount\n-10\n```'),false);
 assert.equal(exactCsvDelivery('amount\n-10\n','```csv\namount\n-11\n```'),false);
 assert.equal(exactCsvDelivery('amount\n-10\n','No CSV'),false);
});

test('probe aborts a failed native tool and refuses a subsequent approval without contacting a model', async()=>{
 const {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {spawnSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const d=mkdtempSync(join(tmpdir(),'recall-probe-abort-'));
 try{
  const bin=join(d,'bin');mkdirSync(bin);
  writeFileSync(join(bin,'codex'),`#!/usr/bin/env node
const {createInterface}=require('node:readline');
if(process.argv[2]==='mcp'){console.log('[]');process.exit(0);}
const send=m=>process.stdout.write(JSON.stringify(m)+'\\n');
createInterface({input:process.stdin}).on('line',line=>{
 const m=JSON.parse(line);if(m.id===undefined||!m.method)return;
 let result={};
 if(m.method==='account/read')result={account:{type:'chatgpt'}};
 if(m.method==='account/rateLimits/read')result={rateLimits:{primary:{usedPercent:1},credits:{hasCredits:false,balance:'0'},spendControlReached:false}};
 if(m.method==='model/list')result={data:[{id:'gpt-5.6-luna',model:'gpt-5.6-luna'}]};
 if(m.method==='thread/start')result={thread:{id:'fake-thread'},model:'gpt-5.6-luna'};
 send({id:m.id,result});
 if(m.method==='turn/start'){
  send({method:'item/completed',params:{item:{type:'mcpToolCall',status:'failed',tool:'find_wallet_activity',error:null,result:{content:[]}}}});
  send({id:0,method:'mcpServer/elicitation/request',params:{serverName:'recall_lab',mode:'form',_meta:{codex_approval_kind:'mcp_tool_call'},message:'Allow the recall_lab MCP server to run tool "prepare_report"?',requestedSchema:{type:'object',properties:{}}}});
 }
});
`,{mode:0o700});
  const plan=join(d,'plan.json');writeFileSync(plan,JSON.stringify({schema:1,model:'gpt-5.6-luna',tasks:[{id:'x',chat:'x',text:'Explain wallet activity.'}]}));
  const run=spawnSync(process.execPath,[fileURLToPath(new URL('./agent-model-probe.mjs',import.meta.url)),join(d,'result'),join(d,'workspace'),plan],
   {env:{...process.env,PATH:bin+':'+process.env.PATH},encoding:'utf8',timeout:15000});
  assert.equal(run.status,1,run.stderr);
  const summary=JSON.parse(readFileSync(join(d,'result/summary.json')));
  assert.equal(summary.reason,'TOOL_ERROR');assert.equal(summary.turnsStarted,1);
  const events=JSON.parse(readFileSync(join(d,'result/events.json')));
  assert.equal(events.some(e=>e.direction==='one-request-approval'),false);
 }finally{rmSync(d,{recursive:true,force:true});}
});

test('restored experiment workspace requires exact private state hashes and rejects unplanned files or tampering',async()=>{
 const {prepareProbeWorkspace}=await import('./agent-probe-workspace.mjs');
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {createHash}=await import('node:crypto');
 const d=mkdtempSync(join(tmpdir(),'recall-restored-probe-'));
 const state={};try{
  for(const name of ['activity-memory.json','agent-workspace.json','experience.json']){
   writeFileSync(join(d,name),'{}',{mode:0o600});state[name]=createHash('sha256').update('{}').digest('hex');
  }
  prepareProbeWorkspace(d,state);
  assert.throws(()=>prepareProbeWorkspace(d,state));
  rmSync(join(d,'client'),{recursive:true});writeFileSync(join(d,'experience.json'),'changed');
  assert.throws(()=>prepareProbeWorkspace(d,state),/PROBE_STATE_HASH/);
 }finally{rmSync(d,{recursive:true,force:true});}
});
