// Account/model metadata only: no thread, user task, inference or provider MCP startup.
import{spawn}from'node:child_process';import{createInterface}from'node:readline';import assert from'node:assert/strict';import{ownModel}from'./agent-own-policy.mjs';
export function modelMetadataArgs(servers=[]){
 assert(Array.isArray(servers)&&servers.every(s=>typeof s.name==='string'&&/^[A-Za-z0-9_-]+$/.test(s.name)),'MCP_INVENTORY');
 const args=['app-server','--stdio','-c','model_provider="openai"','-c','web_search="disabled"'];
 for(const name of ['shell_tool','apps','hooks','plugins','browser_use','computer_use','memories','unbounded_connection_retries'])args.push('-c','features.'+name+'=false');
 args.push('-c','features.skip_host_skill_discovery=true');
 for(const server of servers){const type=server.transport?.type;assert(['stdio','streamable_http'].includes(type),'MCP_TRANSPORT_UNKNOWN');args.push('-c','mcp_servers.'+server.name+'={'+(type==='stdio'?'command="/usr/bin/false"':'url="https://disabled.invalid"')+',enabled=false,required=false}');}
 args.push('-c','mcp_servers.recall_lab={command="/usr/bin/false",enabled=false,required=false}');return args;
}
export async function modelPreflight({servers=[],env=process.env,spawnMetadata,timeoutMs=15000}={}){
 assert(Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=15000,'MODEL_PREFLIGHT_TIMEOUT_BOUND');
 const clean={...env};for(const key of Object.keys(clean))if(/API_KEY|ACCESS_TOKEN|DELEGATE|MEMWAL|TATUM/.test(key))delete clean[key];
 const args=modelMetadataArgs(servers),proc=(spawnMetadata??((a,o)=>spawn('codex',a,o)))(args,{env:clean,stdio:['pipe','pipe','pipe']});
 const pending=new Map();let id=0,critical,totalBytes=0,streamBytes=0,stderrBytes=0,finished=false;
 const stop=code=>{critical??=code;for(const p of pending.values())p.reject(Error(critical));pending.clear();};
 const send=m=>{assert(!critical&&!proc.stdin.destroyed,'MODEL_PREFLIGHT_STOPPED');proc.stdin.write(JSON.stringify(m)+'\n');};
 const call=(method,params={})=>new Promise((resolve,reject)=>{try{assert(id<4,'MODEL_PREFLIGHT_RPC_LIMIT');const n=++id;pending.set(n,{resolve,reject});send({id:n,method,params});}catch(e){reject(e);}});
 const lines=createInterface({input:proc.stdout});
 lines.on('line',line=>{try{
  totalBytes+=Buffer.byteLength(line);assert(Buffer.byteLength(line)<=262144&&totalBytes<=524288,'MODEL_PREFLIGHT_RESPONSE_BOUND');const m=JSON.parse(line);
  if(m.id!==undefined&&m.method){proc.stdin.write(JSON.stringify({id:m.id,error:{code:-32601,message:'Metadata preflight does not authorize actions'}})+'\n');stop('MODEL_PREFLIGHT_UNEXPECTED_REQUEST');return;}
  if(m.id!==undefined){assert(pending.has(m.id),'MODEL_PREFLIGHT_PROTOCOL');const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error('MODEL_PREFLIGHT_RPC_ERROR'));else p.resolve(m.result);}
 }catch{stop('MODEL_PREFLIGHT_PROTOCOL');}});
 proc.stdin.on('error',()=>stop('MODEL_PREFLIGHT_PIPE'));
 proc.stdout.on('data',b=>{streamBytes+=b.length;if(streamBytes>524288)stop('MODEL_PREFLIGHT_RESPONSE_BOUND');});
 proc.stderr.on('data',b=>{stderrBytes+=b.length;if(stderrBytes>16384)stop('MODEL_PREFLIGHT_STDERR_BOUND');});
 proc.once('error',()=>stop('MODEL_PREFLIGHT_PROCESS_ERROR'));proc.once('exit',()=>{if(!finished)stop('MODEL_PREFLIGHT_EXITED');});
 const timer=setTimeout(()=>stop('MODEL_PREFLIGHT_TIMEOUT'),timeoutMs);
 try{
  await call('initialize',{clientInfo:{name:'recall-model-preflight',version:'1'}});send({method:'initialized',params:{}});
  const account=await call('account/read',{refreshToken:false});assert(account.account?.type==='chatgpt','CHATGPT_LOGIN_REQUIRED');
  const {rateLimits:r}=await call('account/rateLimits/read');assert(Number.isFinite(r?.primary?.usedPercent)&&r.primary.usedPercent>=0&&r.primary.usedPercent<100&&r.credits?.hasCredits===false&&r.credits.balance==='0'&&!r.spendControlReached,'INCLUDED_QUOTA_REQUIRED');
  const catalog=await call('model/list',{includeHidden:false});assert(Array.isArray(catalog?.data)&&catalog.data.length>0&&catalog.data.length<=100,'MODEL_CATALOG_REQUIRED');
  const models=[...new Set(catalog.data.map(m=>m.model??m.id).filter(ownModel))];assert(models.length>0,'MODEL_CATALOG_REQUIRED');assert(!critical,critical??'MODEL_PREFLIGHT_STOPPED');finished=true;
  return {schema:1,models,accountType:'chatgpt',includedQuotaOnly:true,usedPercent:r.primary.usedPercent,rpcCount:id,inferenceCalls:0};
 }finally{
  finished=true;clearTimeout(timer);proc.stdin.end();proc.kill('SIGTERM');lines.close();
  await new Promise(resolve=>{if(proc.exitCode!==null||proc.signalCode!==null){resolve();return;}const t=setTimeout(()=>proc.kill('SIGKILL'),1500);proc.once('exit',()=>{clearTimeout(t);resolve();});});
 }
}
export async function selectClientModel(catalog,{requested,bound,ask}={}){
 assert(Array.isArray(catalog?.models)&&catalog.models.length>0&&catalog.models.every(ownModel),'MODEL_CATALOG_REQUIRED');
 assert(!requested||ownModel(requested),'MODEL_SELECTION');assert(!bound||ownModel(bound),'MODEL_SELECTION');
 if(bound){assert(!requested||requested===bound,'OWN_BOUND_MODEL_CHANGED');assert(catalog.models.includes(bound),'MODEL_NOT_AVAILABLE');return bound;}
 if(requested){assert(catalog.models.includes(requested),'MODEL_NOT_AVAILABLE');return requested;}
 if(catalog.models.includes('gpt-5.6-luna'))return 'gpt-5.6-luna';
 assert(typeof ask==='function','MODEL_SELECTION_REQUIRED');const choices=catalog.models.slice(0,10);console.log('Available ChatGPT models:');for(const [i,m]of choices.entries())console.log((i+1)+'. '+m);
 const text=(await ask('Choose a model number: ')).trim();assert(/^[0-9]+$/.test(text)&&Number(text)>=1&&Number(text)<=choices.length,'MODEL_SELECTION');return choices[Number(text)-1];
}
