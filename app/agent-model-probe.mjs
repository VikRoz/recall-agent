// Evaluation harness only; never used by the product launcher.
import {spawn,spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {prepareProbeWorkspace} from './agent-probe-workspace.mjs';
import {nativeToolFailed} from './agent-probe-results.mjs';
import {requireAvailableModel} from './agent-probe-model.mjs';
import {probeApproval} from './agent-probe-approval.mjs';
import {agentArgs,agentPolicy} from './agent-launch.mjs';
import {codexArgs} from './activity-codex.mjs';
import {prepareLiveModelProbe,reserveLiveNativeTurn} from './agent-live.mjs';
import {admittedManaged,reserveManagedTurn} from './agent-managed.mjs';
import {isContinuation} from './agent-continuation-contract.mjs';
import {managedArgs,managedPolicy} from './agent-managed-entry.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const [out,workspace,tasksFile]=process.argv.slice(2);
assert(out&&workspace&&tasksFile,'EXPLICIT_PROBE_PATHS_REQUIRED');
const {readFileSync}=await import('node:fs');
const plan=JSON.parse(readFileSync(tasksFile,'utf8'));
const live=plan.dataMode==='live-walrus-replay',managedTest=plan.dataMode==='ordinary-managed-test',managed=plan.dataMode==='ordinary-managed'||managedTest;
assert(plan.schema===1&&['fixture','saved','live-walrus-replay','ordinary-managed','ordinary-managed-test'].includes(plan.dataMode??'fixture')&&plan.tasks.length<=4&&plan.tasks.every(t=>typeof t.text==='string'&&t.text.length<=1600),'PROBE_PLAN');
mkdirSync(out,{mode:0o700});if(managed){admittedManaged(workspace,{managedTest});assert(plan.tasks.length===1&&Number.isSafeInteger(plan.managedTurnIndex),'MANAGED_NATIVE_PLAN');}else if(live)prepareLiveModelProbe(workspace,plan);else prepareProbeWorkspace(workspace,plan.initialState);
const env={...process.env};for(const key of Object.keys(env))if(/API_KEY|DELEGATE|MEMWAL|TATUM/.test(key))delete env[key];
const inventory=spawnSync('codex',['mcp','list','--json'],{env,encoding:'utf8',timeout:15000,maxBuffer:1048576});
assert(inventory.status===0,'MCP_INVENTORY');
const args=managed?(managedTest?codexArgs(process.execPath,root,workspace,JSON.parse(inventory.stdout),'--mcp',isContinuation(admittedManaged(workspace,{managedTest}).context)?'agent-continuation-fixture.mjs':'agent-managed-fixture.mjs'):managedArgs(process.execPath,root,workspace,JSON.parse(inventory.stdout))):live?codexArgs(process.execPath,root,workspace,JSON.parse(inventory.stdout),'--live','agent-provider-live.mjs')
 :agentArgs(process.execPath,root,workspace,JSON.parse(inventory.stdout),true,plan.dataMode??'fixture');
assert(plan.model===undefined||typeof plan.model==='string','PROBE_MODEL');
const config=[];for(let i=0;i<args.length;i+=2)if(args[i]==='-c')config.push('-c',args[i+1]);
config.push('-c','features.plugins=false','-c','features.browser_use=false','-c','features.computer_use=false',
 '-c','features.skip_host_skill_discovery=true','-c','features.memories=false','-c','features.unbounded_connection_retries=false');
// Consume the managed slot before app-server startup: MCP may initialize during boot.
if(managed)reserveManagedTurn(workspace,plan.managedTurnIndex,plan,{managedTest});
const proc=spawn('codex',['app-server','--stdio',...config],{env,stdio:['pipe','pipe','pipe']});
const pending=new Map();let seq=0,active,turnWait,critical,tools=0,turnTimer;const events=[];const summary={schema:1,turns:[],status:'RUNNING'};
function send(m){proc.stdin.write(JSON.stringify(m)+'\n');}
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});send({id,method,params});});}
function fail(reason){critical??=reason;turnWait?.reject(Error(reason));for(const p of pending.values())p.reject(Error(reason));pending.clear();}
const lines=createInterface({input:proc.stdout});
let stderr='';proc.stderr.on('data',d=>{stderr=(stderr+d.toString()).slice(-16000);});
lines.on('line',line=>{try{
 const m=JSON.parse(line);
 if(m.id!==undefined&&!m.method&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error('RPC_ERROR_'+m.error.code)):p.resolve(m.result);return;}
 // Unknown authorization/input requests are retained and cause a stop, never blanket-approved.
 if(m.id!==undefined&&critical){send({id:m.id,error:{code:-32601,message:'Probe stopped'}});return;}
 if(m.id!==undefined){events.push({direction:'server-request',...m});const approval=probeApproval(m);if(approval){send(approval);events.push({direction:'one-request-approval',id:m.id});return;}send({id:m.id,error:{code:-32601,message:'Probe cannot approve an unexpected request'}});fail('UNEXPECTED_SERVER_REQUEST');return;}
 if(m.method==='item/agentMessage/delta')return;
 if(m.method==='account/rateLimits/updated')return;
 events.push(m);
 if(m.method==='error'){fail('SERVER_ERROR');return;}
 if(m.method==='item/completed'&&nativeToolFailed(m.params?.item)){fail('TOOL_ERROR');return;}
 if(m.method==='item/started'&&m.params?.item?.type==='mcpToolCall'&&++tools>12){fail('TOOL_LIMIT');return;}
 if(m.method==='turn/completed'){const t=m.params.turn;turnWait?.resolve(t);turnWait=null;}
}catch{fail('PROTOCOL_ERROR');}});
proc.once('error',()=>fail('APP_SERVER_START_FAILED'));
proc.once('exit',()=>{if(summary.status==='RUNNING')fail('APP_SERVER_EXITED');});
const onSignal=()=>fail('PROBE_INTERRUPTED');process.once('SIGINT',onSignal);process.once('SIGTERM',onSignal);
const overall=setTimeout(()=>fail('PROBE_TIMEOUT'),8*60000);
try{
 await call('initialize',{clientInfo:{name:'recall_agent_probe',version:'0.1.0'}});send({method:'initialized',params:{}});
 const account=await call('account/read',{refreshToken:false});assert(account.account?.type==='chatgpt','CHATGPT_REQUIRED');
 const limits=await call('account/rateLimits/read');const r=limits.rateLimits;
 assert(r?.primary?.usedPercent<90&&r.credits?.hasCredits===false&&r.credits?.balance==='0'&&!r.spendControlReached,'INCLUDED_QUOTA_REQUIRED');
 summary.preflight={accountType:'chatgpt',usedPercent:r.primary.usedPercent,hasCredits:false,balance:'0'};
 const catalog=await call('model/list',{includeHidden:false});
 if(plan.model!==undefined)requireAvailableModel(catalog,plan.model);
 summary.requestedModel=plan.model??'profile';
 if(live)reserveLiveNativeTurn(workspace,plan);

 const threads=new Map();
 for(const task of plan.tasks){
  assert(!critical,'PROBE_STOPPED');tools=0;
  let thread=threads.get(task.chat);
  if(!thread){const started=await call('thread/start',{cwd:join(workspace,'client'),approvalPolicy:'on-request',sandbox:'read-only',ephemeral:true,model:plan.model??null,developerInstructions:managed?managedPolicy:agentPolicy,serviceTier:'default'});thread=started.thread.id;threads.set(task.chat,thread);summary.model=started.model;requireAvailableModel(catalog,started.model);if(plan.model)assert(started.model===plan.model,'MODEL_SELECTION_MISMATCH');}
  active=thread;
  const completed=new Promise((resolve,reject)=>{turnWait={resolve,reject};});completed.catch(()=>{});
  turnTimer=setTimeout(()=>fail('TURN_TIMEOUT'),120000);
  events.push({direction:'user-input',chat:task.chat,text:task.text});
  summary.turnsStarted=(summary.turnsStarted??0)+1;
  await call('turn/start',{threadId:thread,input:[{type:'text',text:task.text}]});
  const turn=await completed;clearTimeout(turnTimer);
  summary.turns.push({task:task.id,chat:task.chat,status:turn.status,tools});
  if(turn.status!=='completed')throw Error('TURN_NOT_COMPLETED');
 }
 summary.status='COMPLETED';
}catch(e){summary.status='STOPPED';summary.reason=critical??e.message;if(active)await Promise.race([call('turn/interrupt',{threadId:active}),new Promise(r=>setTimeout(r,1500))]).catch(()=>{});process.exitCode=1;
}finally{
 process.removeListener('SIGINT',onSignal);process.removeListener('SIGTERM',onSignal);
 clearTimeout(overall);clearTimeout(turnTimer);writeFileSync(join(out,'events.json'),JSON.stringify(events,null,2)+'\n',{mode:0o600});
 writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
 // Keep diagnostics private; do not publish arbitrary server stderr with user profile paths.
 writeFileSync(join(out,'stderr.txt'),stderr,{mode:0o600});
 console.log(JSON.stringify(summary));proc.stdin.end();proc.kill();lines.close();
 await new Promise(resolve=>{if(proc.exitCode!==null||proc.signalCode!==null){resolve();return;}
  const timer=setTimeout(()=>proc.kill('SIGKILL'),3000);proc.once('exit',()=>{clearTimeout(timer);resolve();});});
}
