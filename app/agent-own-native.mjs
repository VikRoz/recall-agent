// Author measurement harness only. Both native sessions use the public ordinary MCP entry.
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {assert} from '../src/domain.ts';
import {codexArgs} from './activity-codex.mjs';
import {cleanClientEnv,ownPolicy} from './agent-own-launch.mjs';
import {probeApproval} from './agent-probe-approval.mjs';
import {requireAvailableModel} from './agent-probe-model.mjs';
import {nativeToolFailed} from './agent-probe-results.mjs';
export function ownNativeArgs(root,state,servers=[],{fixture=false}={}){
 const args=codexArgs(process.execPath,root,state,servers,'--mcp','agent-own-entry.mjs',
  [...(fixture?['--offline-fixture']:[]),'--native-limit=12']);
 const config=[];for(let i=0;i<args.length;i+=2)if(args[i]==='-c')config.push('-c',args[i+1]);
 for(const name of ['plugins','browser_use','computer_use','memories','unbounded_connection_retries'])config.push('-c','features.'+name+'=false');
 config.push('-c','features.skip_host_skill_discovery=true');return ['app-server','--stdio',...config];
}
export async function nativeOwnTurn({root,state,task,out,deadline,servers=[],fixture=false,spawnNative,seconds=120,signal}){
 assert(typeof task.text==='string'&&task.text.length<=2000&&seconds===120,'OWN_NATIVE_TASK');mkdirSync(out,{mode:0o700});
 const args=ownNativeArgs(root,state,servers,{fixture});
 const proc=(spawnNative??((args,options)=>spawn('codex',args,options)))(args,{env:cleanClientEnv(),stdio:['pipe','pipe','pipe'],detached:true});
 const pending=new Map(),events=[];let sequence=0,critical,thread,tools=0,approvals=0,waitTurn,stderr='',initialized=false;
 const summary={schema:1,status:'RUNNING',task:task.id,thread:null,tools:0,approvals:0};
 const send=m=>{if(!proc.stdin.destroyed)proc.stdin.write(JSON.stringify(m)+'\n');};
 function fail(reason){critical??=reason;waitTurn?.reject(Error(critical));for(const p of pending.values())p.reject(Error(critical));pending.clear();}
 const call=(method,params={})=>new Promise((resolve,reject)=>{if(critical){reject(Error(critical));return;}const id=++sequence;pending.set(id,{resolve,reject});send({id,method,params});});
 const lines=createInterface({input:proc.stdout});let eventBytes=0;
 proc.stderr.on('data',data=>{stderr=(stderr+data.toString()).slice(-16000);});
 lines.on('line',line=>{try{
  assert(Buffer.byteLength(line)<=262144,'NATIVE_FRAME_LIMIT');
  const m=JSON.parse(line);
  if(m.id!==undefined&&!m.method&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error('RPC_ERROR_'+m.error.code)):p.resolve(m.result);return;}
  if(m.id!==undefined){
   const permission=probeApproval(m),tool=m.params?.message?.match(/tool "([a-z_]+)"/);events.push({type:'approval-request',method:m.method,tool:tool?.[1]??null});
   if(!critical&&permission&&tool&&['prepare_report','refresh_report','verify_gas_payer','export_report'].includes(tool[1])&&approvals<12){approvals++;send(permission);return;}
   send({id:m.id,error:{code:-32601,message:'Bounded rehearsal declined unexpected or excess request'}});fail(approvals>=12?'NATIVE_APPROVAL_LIMIT':'UNEXPECTED_SERVER_REQUEST');return;
  }
  if(m.method==='item/agentMessage/delta'||m.method?.startsWith('account/'))return;
  eventBytes+=Buffer.byteLength(line);assert(eventBytes<=2097152&&events.length<2000,'NATIVE_EVENT_LIMIT');
  events.push(m);
  if(m.method==='error'){fail('SERVER_ERROR');return;}
  if(m.method==='item/started'&&m.params?.item?.type==='mcpToolCall'&&++tools>12){fail('TOOL_LIMIT');return;}
  if(m.method==='item/completed'&&nativeToolFailed(m.params?.item)){fail('TOOL_ERROR');return;}
  if(m.method==='turn/completed'){waitTurn?.resolve(m.params.turn);waitTurn=null;}
 }catch{fail('NATIVE_PROTOCOL_ERROR');}});
 proc.once('error',()=>fail('NATIVE_PROCESS_ERROR'));proc.once('exit',()=>{if(summary.status==='RUNNING')fail('NATIVE_PROCESS_EXITED');});
 const interrupted=()=>fail('NATIVE_INTERRUPTED');signal?.addEventListener('abort',interrupted,{once:true});
 const timer=setTimeout(()=>fail('NATIVE_DEADLINE'),Math.max(1,Math.min(seconds*1000,deadline-Date.now())));
 try{
  await call('initialize',{clientInfo:{name:'recall-own-rehearsal',version:'1'}});initialized=true;send({method:'initialized',params:{}});
  const account=await call('account/read',{refreshToken:false});assert(account.account?.type==='chatgpt','CHATGPT_REQUIRED');
  const {rateLimits:r}=await call('account/rateLimits/read');assert(r?.primary?.usedPercent<90&&r.credits?.hasCredits===false&&r.credits?.balance==='0'&&!r.spendControlReached,'INCLUDED_QUOTA_REQUIRED');
  summary.quota={accountType:'chatgpt',usedPercent:r.primary.usedPercent,hasCredits:false,balance:'0'};
  const catalog=await call('model/list',{includeHidden:false});requireAvailableModel(catalog,'gpt-5.6-luna');
  const opened=await call('thread/start',{cwd:join(state,'client'),approvalPolicy:'on-request',sandbox:'read-only',ephemeral:true,
   model:'gpt-5.6-luna',developerInstructions:ownPolicy,serviceTier:'default'});
  assert(opened.model==='gpt-5.6-luna','MODEL_SELECTION_MISMATCH');thread=opened.thread.id;summary.thread=thread;
  const completed=new Promise((resolve,reject)=>{waitTurn={resolve,reject};});completed.catch(()=>{});
  events.push({type:'user-input',task:task.id,text:task.text});summary.turnStarted=true;
  await call('turn/start',{threadId:thread,input:[{type:'text',text:task.text}]});
  const turn=await completed;assert(!critical&&turn.status==='completed'&&!turn.error,'NATIVE_TURN_INCOMPLETE');summary.status='COMPLETED';
 }catch(error){summary.status='STOPPED';summary.reason=critical??error.code??error.message;}
 finally{
  clearTimeout(timer);signal?.removeEventListener('abort',interrupted);summary.tools=tools;summary.approvals=approvals;summary.initialized=initialized;
  // Local process cleanup only. No new status/provider/model request after a stop/deadline.
  proc.stdin.end();try{process.kill(-proc.pid,'SIGTERM');}catch{proc.kill('SIGTERM');}
  await new Promise(resolve=>{if(proc.exitCode!==null||proc.signalCode!==null){resolve();return;}const t=setTimeout(()=>{try{process.kill(-proc.pid,'SIGKILL');}catch{proc.kill('SIGKILL');}},2500);proc.once('exit',()=>{clearTimeout(t);resolve();});});
  lines.close();writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
  writeFileSync(join(out,'events.json'),JSON.stringify(events,null,2)+'\n',{mode:0o600});writeFileSync(join(out,'stderr.txt'),stderr,{mode:0o600});
 }
 return summary;
}
