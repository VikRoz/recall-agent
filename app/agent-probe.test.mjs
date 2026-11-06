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
});
