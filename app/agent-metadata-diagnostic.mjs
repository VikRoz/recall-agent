// One-shot read-only SDK/stdio diagnostic. Not the product launcher and never an application allowance.
import {existsSync,readdirSync,mkdirSync,rmSync,realpathSync,readFileSync} from 'node:fs';
import {join,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {MemWal} from '@mysten-incubation/memwal';
import {McpServer} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js';
import {StdioServerTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {assert,canonical,exactKeys,time,Fault} from '../src/domain.ts';
import {address} from './activity.ts';
import {profile} from './walrus.mjs';
import {profileIdentity} from './agent-live.mjs';
import {privateDirectory,privateRead,runHash} from './agent-run.mjs';
import {managedFile,managedRuntimeHashes} from './agent-managed.mjs';
import {deploymentHash,WALRUS_RELAY} from './agent-walrus-guard.mjs';
import {recordFirstFailure} from './agent-diagnostic.mjs';
const platformFetch=globalThis.fetch.bind(globalThis);
export const METADATA_LIMITS=Object.freeze({requests:8,pages:1,requestMS:15000,totalMS:120000,responseBytes:65536,maxUSD:0});
const contextFile=d=>join(d,'metadata-context.json'),counterFile=d=>join(d,'metadata-counter.json');
const publicCodes=new Set(['AGENT_METADATA_REAL_TEST_SCOPE','AGENT_METADATA_FRESH_GRANT_REQUIRED','AGENT_METADATA_SOURCE_CHANGED',
 'AGENT_METADATA_CONTEXT','AGENT_METADATA_IDENTITY','AGENT_METADATA_EXPECTED','AGENT_METADATA_NEW_DIRECTORY','AGENT_METADATA_COUNTER',
 'AGENT_METADATA_FIXED_PORTS','AGENT_METADATA_FIXED_WORKER','AGENT_METADATA_LAUNCH_BINDING','AGENT_METADATA_EXPLICIT_MODE','AGENT_METADATA_STDIO_RESULT',
 'AGENT_PROVIDER_HTTP','AGENT_WRITE_HEALTH','AGENT_CONFIG_SCOPE','AGENT_OWNER_MISMATCH','AGENT_DELEGATE_MISMATCH','AGENT_INVENTORY_SCOPE',
 'AGENT_RUNTIME_CLOSED','AGENT_RUN_STOPPED','AGENT_RUN_EXPIRED','AGENT_ADMISSION_EXPIRED','AGENT_ROUTE','AGENT_LIMIT','AGENT_METADATA_BODY']);
export const metadataPublicCode=error=>error instanceof Fault&&publicCodes.has(error.code)?error.code:'READONLY_SDK_DIAGNOSTIC_STOPPED';
function validatePublic(c){
 exactKeys(c,['schema','mode','root','profileRoot','identity','config','namespace','expectedBlobIds','limits','sourceHashes']);
 exactKeys(c.identity,['owner','accountId','delegatePublicKeyHex','packageId','workspace']);
 assert(c.schema===1&&isAbsolute(c.root)&&isAbsolute(c.profileRoot)&&canonical(c.limits)===canonical(METADATA_LIMITS),'AGENT_METADATA_CONTEXT');
 assert([c.identity.owner,c.identity.accountId,c.identity.packageId].every(v=>address(v)===v)
  &&/^[a-f0-9]{64}$/.test(c.identity.delegatePublicKeyHex)&&/^agent-[a-f0-9-]{36}$/.test(c.identity.workspace)
  &&c.namespace===c.identity.workspace+'-experience','AGENT_METADATA_IDENTITY');
 assert(c.config.network==='mainnet'&&c.config.packageId===c.identity.packageId&&c.config.suiTransport==='grpc','AGENT_CONFIG_SCOPE');
 assert(Array.isArray(c.expectedBlobIds)&&c.expectedBlobIds.length<=20&&new Set(c.expectedBlobIds).size===c.expectedBlobIds.length
  &&c.expectedBlobIds.every(v=>/^[A-Za-z0-9_-]{43}$/.test(v)),'AGENT_METADATA_EXPECTED');
 assert(canonical(c.sourceHashes)===canonical(managedRuntimeHashes(c.root)),'AGENT_METADATA_SOURCE_CHANGED');return c;
}
export function prepareMetadata(directory,{root,profileRoot,identity,config,expectedBlobIds,testMode=false}){
 privateDirectory(directory);assert(readdirSync(directory).length===0,'AGENT_METADATA_NEW_DIRECTORY');
 const c=validatePublic({schema:1,mode:testMode?'offline-test-readonly-metadata':'prepared-readonly-metadata',root:realpathSync(root),profileRoot,
  identity,config,namespace:identity.workspace+'-experience',expectedBlobIds,limits:METADATA_LIMITS,sourceHashes:managedRuntimeHashes(root)});
 managedFile(contextFile(directory),c);managedFile(counterFile(directory),{schema:1,contextHash:runHash(c),requests:0,stopped:null,finished:false});
 managedFile(join(directory,'metadata-approval-template.json'),{schema:1,kind:'explicit-readonly-sdk-diagnostic',contextHash:runHash(c),checkedAt:null});
 return {contextHash:runHash(c),authorized:false};
}
export function metadataContext(directory,{testMode=false}={}){
 privateDirectory(directory);const c=validatePublic(privateRead(contextFile(directory)));
 assert(c.mode===(testMode?'offline-test-readonly-metadata':'prepared-readonly-metadata'),'AGENT_METADATA_REAL_TEST_SCOPE');return c;
}
export function metadataAuthorization(directory,options={}){
 const c=metadataContext(directory,options),g=privateRead(join(directory,'metadata-grant.json'));
 exactKeys(g,['schema','kind','contextHash','checkedAt']);const age=Date.now()-time(g.checkedAt);
 assert(g.schema===1&&g.kind===(options.testMode?'offline-test-only':'explicit-readonly-sdk-diagnostic')&&g.contextHash===runHash(c)
  &&age>=0&&age<=300000,'AGENT_METADATA_FRESH_GRANT_REQUIRED');return {context:c,grant:g};
}
export class MetadataGate{
 constructor(directory,c,g){
  this.directory=directory;this.context=c;this.hash=runHash(c);this.grantHash=runHash(g);
  this.manifest={admission:{contextHash:this.hash}};this.open=true;this.startedAt=Date.now();this.admit();
 }
 state(){const s=privateRead(counterFile(this.directory));exactKeys(s,['schema','contextHash','requests','stopped','finished']);
  assert(s.schema===1&&s.contextHash===this.hash&&Number.isSafeInteger(s.requests)&&s.requests>=0&&s.requests<=8
   &&(s.stopped===null||s.stopped==='READONLY_DIAGNOSTIC_STOPPED')&&typeof s.finished==='boolean','AGENT_METADATA_COUNTER');return s;
 }
 admit(){try{
  assert(this.open,'AGENT_RUNTIME_CLOSED');assert(runHash(privateRead(contextFile(this.directory)))===this.hash
   &&runHash(privateRead(join(this.directory,'metadata-grant.json')))===this.grantHash,'MANAGED_CONTEXT_CHANGED');
  const grant=privateRead(join(this.directory,'metadata-grant.json')),age=Date.now()-time(grant.checkedAt);
  assert(age>=0&&age<=300000,'AGENT_ADMISSION_EXPIRED');assert(Date.now()-this.startedAt<=METADATA_LIMITS.totalMS,'AGENT_RUN_EXPIRED');
  const s=this.state();assert(s.stopped===null&&!s.finished,'AGENT_RUN_STOPPED');
 }catch(error){recordFirstFailure(this,{phase:'admission',category:'admission',error});throw error;}}
 update(fn){const lock=join(this.directory,'.metadata-counter-lock');mkdirSync(lock,{mode:0o700});
  try{const s=this.state();fn(s);managedFile(counterFile(this.directory),s,false);return s;}finally{rmSync(lock,{recursive:true});}}
 stop(){this.update(s=>{s.stopped??='READONLY_DIAGNOSTIC_STOPPED';});}
 reserve(){this.admit();const s=this.update(s=>{if(s.requests>=8)s.stopped='READONLY_DIAGNOSTIC_STOPPED';else s.requests++;});assert(s.stopped===null,'AGENT_LIMIT');}
 finish(){this.admit();this.update(s=>{s.finished=true;});}
}
export function metadataFetch(gate,transport,signal){
 const c=gate.context,identity=c.identity;let inventorySent=false,statsSent=false;
 const publicSent=new Set();
 return async(input,options={})=>{
  let route='unknown',method='unknown',httpStatus=null,category='admission';
  try{gate.admit();category='validation';assert(typeof input==='string'||input instanceof URL,'AGENT_FETCH_INPUT');
   const url=new URL(input),verb=options.method??'GET';if(['GET','POST'].includes(verb))method=verb;
   assert(url.origin===WALRUS_RELAY&&!url.username&&!url.password&&!url.hash,'AGENT_ROUTE');
   const headers=new Headers(options.headers),allowed=new Set(['accept','content-type','x-account-id','x-public-key','x-signature','x-timestamp','x-nonce']);
   assert([...headers.keys()].every(k=>allowed.has(k)),'AGENT_RAW_CREDENTIAL_DENIED');
   const publicName={'/health':'health','/version':'version','/config':'config'}[url.pathname];
   if(method==='GET'&&publicName){
    assert(!url.search&&options.body===undefined&&!publicSent.has(publicName)&&![...headers.keys()].some(k=>k.startsWith('x-')),'AGENT_ROUTE');
    route=publicName;publicSent.add(route);
   }else{
    assert(headers.get('x-account-id')===identity.accountId&&headers.get('x-public-key')===identity.delegatePublicKeyHex
     &&/^[a-f0-9]{128}$/.test(headers.get('x-signature')??'')&&/^[0-9]{10}$/.test(headers.get('x-timestamp')??'')
     &&/^[a-f0-9-]{36}$/.test(headers.get('x-nonce')??''),'AGENT_REQUEST_IDENTITY');
    if(method==='POST'&&url.pathname==='/api/stats'){
     assert(!url.search&&!statsSent&&typeof options.body==='string'&&options.body.length<=256,'AGENT_STATS_SCOPE');
     const body=JSON.parse(options.body);assert(Object.keys(body).length===1&&body.namespace===c.namespace,'AGENT_STATS_SCOPE');route='stats';statsSent=true;
    }else{
     assert(method==='GET'&&url.pathname==='/v1/owners/'+identity.owner+'/memories'&&url.search==='?limit=100'
      &&options.body===undefined&&!inventorySent,'AGENT_INVENTORY_SCOPE');route='inventory';inventorySent=true;
    }
   }
   gate.reserve();category='transport';
   const response=await transport(input,{...options,redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(15000),signal,...(options.signal?[options.signal]:[])])});
   httpStatus=response.status;category='http';assert(response.ok&&!response.redirected,'AGENT_PROVIDER_HTTP');category='response';
   // Bound buffering for SDK JSON consumers; raw body and unknown namespace fields are never persisted.
   const reader=response.body?.getReader();assert(reader,'AGENT_METADATA_BODY');let length=0;const parts=[];
   try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;assert(length<=65536,'AGENT_METADATA_BODY');parts.push(value);}}
   finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   const text=Buffer.concat(parts).toString('utf8'),body=JSON.parse(text);
   if(route==='health')assert(body.status==='ok'&&body.writes==='ok'&&body.write_ready===true,'AGENT_WRITE_HEALTH');
   if(route==='config')assert(deploymentHash(body)===deploymentHash(c.config),'AGENT_CONFIG_SCOPE');
   if(route==='stats')assert(body.owner===identity.owner,'AGENT_OWNER_MISMATCH');
   return new Response(text,{status:response.status,headers:{'content-type':'application/json'}});
  }catch(error){recordFirstFailure(gate,{phase:'startup',route,method,httpStatus,category,error});gate.stop();throw error;}
 };
}
function realPorts(){return {readProfile:profile,transport:platformFetch,createSdk:(p,c)=>MemWal.create({key:p.delegatePrivateKey,
 accountId:c.identity.accountId,namespace:c.namespace,serverUrl:WALRUS_RELAY,requestTimeoutMs:15000,preflightTimeoutMs:8000})};}
export async function executeMetadata(directory,options={}){
 const {context:c,grant:g}=metadataAuthorization(directory,options);
 assert(options.testMode?options.ports&&['readProfile','transport','createSdk'].every(k=>typeof options.ports[k]==='function'):!options.ports,'AGENT_METADATA_FIXED_PORTS');
 // Consumed before profile/SDK/network. Presence, including an abandoned attempt, prevents another execution.
 managedFile(join(directory,'metadata-use.json'),{schema:1,contextHash:runHash(c),reservedAt:new Date().toISOString(),pid:process.pid});
 const gate=new MetadataGate(directory,c,g),ports=options.testMode?options.ports:realPorts(),abort=new AbortController();
 const original=globalThis.fetch;let sdk,p,closed=false,inFlight=0;
 const guarded=metadataFetch(gate,ports.transport,abort.signal),fetch=async(...a)=>{
  if(closed){recordFirstFailure(gate,{phase:'late-close',category:'lifecycle',faultCode:'AGENT_RUNTIME_CLOSED'});assert(false,'AGENT_RUNTIME_CLOSED');}
  inFlight++;try{return await guarded(...a);}finally{inFlight--;}};
 const close=()=>{if(closed)return;closed=true;
  try{if(inFlight||!gate.state().finished){recordFirstFailure(gate,{phase:'close',category:'lifecycle',faultCode:'AGENT_CLIENT_CLOSED_DURING_ACTION'});gate.stop();}}
  finally{gate.open=false;abort.abort();sdk?.destroy();if(p)p.delegatePrivateKey='';
   if(globalThis.fetch===fetch)globalThis.fetch=options.testMode?original:()=>{throw Error('READONLY_DIAGNOSTIC_CLOSED');};}
 };
 const timer=setTimeout(close,120000),signals=options.signals??process;
 signals.once('SIGINT',close);signals.once('SIGTERM',close);
 try{
  gate.admit();p=ports.readProfile(c.profileRoot);
  const expected=Object.fromEntries(['owner','accountId','delegatePublicKeyHex','packageId'].map(k=>[k,c.identity[k]]));
  assert(canonical(profileIdentity(p))===canonical(expected),'AGENT_DELEGATE_MISMATCH');
  globalThis.fetch=fetch;sdk=await ports.createSdk(p,c);p.delegatePrivateKey='';
  if(closed){sdk.destroy();assert(false,'AGENT_RUNTIME_CLOSED');}
  assert(await sdk.getPublicKeyHex()===c.identity.delegatePublicKeyHex,'AGENT_DELEGATE_MISMATCH');
  await fetch(WALRUS_RELAY+'/health');await sdk.compatibility();await fetch(WALRUS_RELAY+'/config');
  const page=await sdk.listMemories({namespace:c.namespace,limit:100});
  assert(page.must_resync===false&&page.has_more===false&&Number.isSafeInteger(page.snapshot_version)&&page.snapshot_version>=0&&Array.isArray(page.memories),'AGENT_INVENTORY_SCOPE');
  const rows=page.memories.filter(r=>r.namespace_id===c.namespace);assert(rows.length<=20,'AGENT_INVENTORY_SCOPE');
  assert(rows.every(r=>typeof r.status==='string'&&r.status.length>0&&r.status.length<=METADATA_LIMITS.responseBytes&&/^[A-Za-z0-9_-]{43}$/.test(r.blob_id)),'AGENT_INVENTORY_SCOPE');
  const blobIds=rows.map(r=>r.blob_id).sort();assert(new Set(blobIds).size===blobIds.length&&c.expectedBlobIds.every(id=>blobIds.includes(id)),'AGENT_INVENTORY_SCOPE');
  gate.finish();const result={schema:1,status:'CURRENT_METADATA_DIAGNOSTIC_STARTUP_COMPLETED',contextHash:runHash(c),namespace:c.namespace,
   blobIds,allExpectedMetadataIdsPresent:true,metadataStatusInterpretation:'not-evaluated',revision:page.snapshot_version,requests:gate.state().requests,
   synthetic:!!options.testMode,modelCalls:0,tatumCalls:0,contentReads:0,writes:0,additionalSpendUSD:0,
   scope:'metadata-only-diagnostic-not-live-product-or-historical-cause'};
  managedFile(join(directory,'metadata-result.json'),result);return result;
 }catch(error){recordFirstFailure(gate,{phase:'startup',category:'sdk',error});gate.stop();throw error;}
 finally{clearTimeout(timer);signals.removeListener('SIGINT',close);signals.removeListener('SIGTERM',close);close();}
}
export async function serveMetadata(directory,options={}){
 const result=await executeMetadata(directory,options),server=new McpServer({name:'recall-sdk-metadata-diagnostic',version:'1.0.0'});
 server.registerTool('diagnostic_result',{description:'Return completed read-only initialization metadata; no new provider call.',inputSchema:{},annotations:{readOnlyHint:true,openWorldHint:false}},async()=>({content:[{type:'text',text:JSON.stringify(result)}]}));
 return server;
}
export async function runMetadataStdio(directory,{testMode=false,workerFile=fileURLToPath(import.meta.url)}={}){
 const {context:c}=metadataAuthorization(directory,{testMode});
 assert(testMode||workerFile===fileURLToPath(import.meta.url),'AGENT_METADATA_FIXED_WORKER');
 managedFile(join(directory,'metadata-launch.json'),{schema:1,contextHash:runHash(c),pid:process.pid,startedAt:new Date().toISOString()});
 const client=new Client({name:'recall-readonly-sdk-diagnostic',version:'1.0.0'}),transport=new StdioClientTransport({command:process.execPath,args:['--disable-warning=ExperimentalWarning',workerFile,'--worker',directory]});
 let initialized=false;
 try{await client.connect(transport,{timeout:125000});initialized=true;
  const result=await client.callTool({name:'diagnostic_result',arguments:{}}),value=JSON.parse(result.content[0].text);
  assert(!result.isError&&value.contextHash===runHash(c)&&value.namespace===c.namespace&&value.status==='CURRENT_METADATA_DIAGNOSTIC_STARTUP_COMPLETED','AGENT_METADATA_STDIO_RESULT');
  managedFile(join(directory,'metadata-stdio-result.json'),{schema:1,status:'STDIO_DIAGNOSTIC_COMPLETED',contextHash:runHash(c),workerPid:transport.pid,initialized:true,resultHash:runHash(value)});return value;
 }catch(error){managedFile(join(directory,'metadata-stdio-result.json'),{schema:1,status:'STDIO_DIAGNOSTIC_STOPPED',contextHash:runHash(c),initialized,category:'INITIALIZATION_OR_PROTOCOL_FAILURE'});throw error;
 }finally{await client.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let server;
 try{const [mode,directory,...rest]=process.argv.slice(2);assert(directory&&!rest.length&&['--run','--worker'].includes(mode),'AGENT_METADATA_EXPLICIT_MODE');
  if(mode==='--run'){const result=await runMetadataStdio(directory);console.log(JSON.stringify(result));}
  else{const {context:c}=metadataAuthorization(directory),launch=privateRead(join(directory,'metadata-launch.json'));
   assert(launch.contextHash===runHash(c)&&launch.pid===process.ppid,'AGENT_METADATA_LAUNCH_BINDING');server=await serveMetadata(directory);
   let closing=false;const close=()=>{if(closing)return;closing=true;server.close().finally(()=>process.exit(0));};
   process.stdin.once('end',close);process.once('SIGINT',close);process.once('SIGTERM',close);await server.connect(new StdioServerTransport());
  }
 }catch(error){await server?.close();console.error(metadataPublicCode(error));process.exitCode=1;}
}
