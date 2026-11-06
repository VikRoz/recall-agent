// Evaluation-only, one request at a time. Never relaxes the native client policy.
const allowed = new Set(['find_wallet_activity','prepare_report','refresh_report','export_report','verify_gas_payer']);
export function probeApproval(message) {
  const p=message.params;
  if(message.id===undefined||message.method!=='mcpServer/elicitation/request'||p?.serverName!=='recall_lab'
    ||p.mode!=='form'||p._meta?.codex_approval_kind!=='mcp_tool_call')return null;
  const match=p.message?.match(/^Allow the recall_lab MCP server to run tool "([a-z_]+)"\?$/);
  if(!match||!allowed.has(match[1])||p.requestedSchema?.type!=='object'
    ||Object.keys(p.requestedSchema.properties??{}).length!==0)return null;
  return {id:message.id,result:{action:'accept',content:{}}};
}
