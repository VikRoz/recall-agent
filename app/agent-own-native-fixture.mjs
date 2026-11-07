// Explicit fake app-server: no language model. Calls the actual public MCP fixture entry.
import {createInterface} from 'node:readline';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {ownAuthorization} from './agent-own.mjs';
import {FIXTURE_WALLET,FIXTURE_OTHER} from './activity-fixtures.ts';
const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
const config=process.argv.find(x=>x.startsWith('mcp_servers.recall_lab=')),match=config?.match(/command=("(?:\\.|[^"\\])*"),args=(\[[\s\S]*\]),enabled=true/);
if(!match)throw Error('FAKE_PUBLIC_MCP_CONFIG_REQUIRED');
const command=JSON.parse(match[1]),args=JSON.parse(match[2]),state=args[args.indexOf('--mcp')+1];
if(!args.includes('--offline-fixture')||!args.includes('--native-limit=12'))throw Error('FAKE_OFFLINE_ONLY');
const {context}=ownAuthorization(state,{fixture:true}),mode=process.env.RECALL_FAKE_NATIVE_MODE??'success',permissions=new Map();let client,permissionId=0;
async function tool(name,argumentsValue){
 const id=permissionId++,permission=new Promise((resolve,reject)=>permissions.set(id,{resolve,reject}));
 send({id,method:'mcpServer/elicitation/request',params:{serverName:'recall_lab',mode:'form',_meta:{codex_approval_kind:'mcp_tool_call'},
  message:'Allow the recall_lab MCP server to run tool "'+name+'"?',requestedSchema:{type:'object',properties:{}}}});
 await permission;send({method:'item/started',params:{item:{type:'mcpToolCall',tool:name}}});
 const result=await client.callTool({name,arguments:argumentsValue});send({method:'item/completed',params:{item:{type:'mcpToolCall',tool:name,status:result.isError?'failed':'completed',result}}});
 if(result.isError)throw Error('FAKE_MCP_STOPPED');return JSON.parse(result.content[0].text);
}
async function task(text){
 if(mode==='unexpected'){await tool('run_shell',{});return;}
 const first=!text.startsWith('Revisit'),ids=first?context.captureSet:[context.captureSet[0]];
 const report=await tool('prepare_report',{network:'mainnet',wallet:FIXTURE_WALLET,transactions:ids});
 if(mode==='excess')for(let i=0;i<13;i++)await tool('verify_gas_payer',{reportId:report.reportId,transaction:ids[0],claimedPayer:FIXTURE_OTHER});
 let answerText='Explicit offline fake app-server completed public MCP calls; no model ran.';
 if(!first&&mode!=='no-export'){const exported=await tool('export_report',{reportId:report.reportId});answerText+=' '+report.historicalObservations[0].blobId+' '+exported.artifact.path+' '+exported.artifact.sha256;}
 send({method:'item/completed',params:{item:{type:'agentMessage',text:answerText}}});
 send({method:'turn/completed',params:{turn:{id:'synthetic-turn',status:'completed',error:null}}});
}
createInterface({input:process.stdin}).on('line',async line=>{try{
 const m=JSON.parse(line);
 if(m.id!==undefined&&!m.method&&permissions.has(m.id)){const p=permissions.get(m.id);permissions.delete(m.id);m.error?p.reject(Error('FAKE_APPROVAL_REJECTED')):p.resolve();return;}
 if(m.id===undefined||!m.method)return;
 let result={};
 if(m.method==='account/read')result={account:{type:'chatgpt'}};
 if(m.method==='account/rateLimits/read')result={rateLimits:{primary:{usedPercent:mode==='quota'?100:1},credits:{hasCredits:false,balance:'0'},spendControlReached:false}};
 if(m.method==='model/list')result={data:[{id:'gpt-5.6-luna',model:'gpt-5.6-luna'}]};
 if(m.method==='thread/start'){
  client=new Client({name:'fake-native-public-client',version:'1'});await client.connect(new StdioClientTransport({command,args}));await client.listTools();
  result={thread:{id:'synthetic-'+process.pid},model:'gpt-5.6-luna'};
 }
 send({id:m.id,result});
 if(m.method==='turn/start')task(m.params.input[0].text).catch(()=>send({method:'error',params:{message:'FAKE_TASK_STOPPED'}}));
 }catch{send({method:'error',params:{message:'FAKE_PROTOCOL_STOPPED'}});}
});
let closed=false;async function close(){if(closed)return;closed=true;await client?.close();process.exit(0);}
process.once('SIGTERM',close);process.once('SIGINT',close);process.stdin.once('end',close);
