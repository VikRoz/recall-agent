// One-shot author wrapper. Preparation is metadata-only; execution needs a separate bound grant.
import {constants,existsSync,mkdirSync,lstatSync,openSync,fstatSync,closeSync,readFileSync,unlinkSync,readdirSync} from 'node:fs';
import {join,dirname,isAbsolute,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {assert,canonical,exactKeys,time} from '../src/domain.ts';
import {privateDirectory,privateRead,runHash} from './agent-run.mjs';
import {managedFile,managedRuntimeHashes} from './agent-managed.mjs';
import {validateRetained,ownPath,closedOriginHash} from './agent-own-lineage.mjs';
import {createOwnActivation,ownAuthorization,openOwnAccount} from './agent-own.mjs';
import {OWN_LIMITS} from './agent-own-contract.mjs';
import {readTatumKey} from './activity-key.ts';
import {validateTatumBinding} from './activity-live.ts';
import {ownRealPorts} from './agent-own-entry.mjs';
import {nativeOwnTurn} from './agent-own-native.mjs';
import {cleanClientEnv} from './agent-own-launch.mjs';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
export const REHEARSAL_IDS=['2it6GExEsJgfjvrh9wZ7EUK4Pboe4dm6gN3ZrBX6bgE3','9id3PUdCt16v7hQZA5BKpSNw5uG9cxPCqinJw7Dc8Ksj',
 'BjV2Q8mCarkmtENT1T3SPncKAFP3qNHQKVJ2DgptUnkW','399audbJp2xHpY7R2M7T2jFASw8AvPVGauZ4pBRLgJdj',
 '3o43bsVXvFpRthgSgkJzugZiR9UGPYWJsFKACXfkMho7','CvJ6jx8Knu6jeGdZZb2F3XyfBRazqKJJmKchywckBMAL','6zSQhBMT8ro6eAs4UvWKqfcxSd9Rgjz5nR9m85bBSsEw'];
const wallet='0x77776760c06997206b13fa76f127aa016d24a645f04fce516be153ece0bddf23';
// Exact public stopped pRaby9 manifest/ledger/native snapshot; not a renewed allowance.
export const REHEARSAL_CLOSED_ADDENDA=['e36194decf681b651c1d2b62455b9b055e6cfc7ca92ee569eb51c6ef9da3bea3','e2d1ec9e6e0c47aa3b60a64ec70ba847bb238b28f627bbe9dc784b2af61283a7'];
export const REHEARSAL_RETAINED_HASH='cc9e197aff8ed3dbab55924352a72513b2c0ddec7509479920c2837aa3a877e3';
const retainedHash=r=>runHash({records:r.records,receipts:r.receipts});
export function validateRehearsalLineage(retained,plan){
 assert(canonical((retained?.closedAddenda??[]).map(closedOriginHash))===canonical(plan.requiredClosedAddenda),'REHEARSAL_REQUIRED_CLOSED_ADDENDA');
 assert(retained?.records.length===7&&retainedHash(retained)===plan.retainedProofHash,'REHEARSAL_REQUIRED_SEVEN_RECORDS');
}
export function ownRehearsalPlan(root,{fixture=false,retained=null}={}){return {schema:1,kind:'own-account-final-rehearsal',model:'gpt-5.6-luna',network:'mainnet',ids:REHEARSAL_IDS,
 requiredClosedAddenda:fixture?(retained?.closedAddenda??[]).map(closedOriginHash):REHEARSAL_CLOSED_ADDENDA,
 retainedProofHash:fixture&&retained?retainedHash(retained):REHEARSAL_RETAINED_HASH,
 writePolicy:{schema:1,kind:'exact-missing-transaction-facts',digests:REHEARSAL_IDS.slice(4),maxNewWrites:3,submissionProofs:true},
 preparation:{kind:'explicit-operator-action-through-public-mcp',tool:'prepare_report',arguments:{network:'mainnet',wallet,transactions:REHEARSAL_IDS}},
 limits:{...OWN_LIMITS,writes:3,nativeTurns:2,toolsPerTurn:12,secondsPerTurn:120,totalSeconds:240,maxUSD:0},noRetry:true,paidFallback:false,
 tasks:[{id:'seven-selected-cases',text:'Review these seven Sui Mainnet transactions as research case notes. For each, report status, gas payer, net gas and exact balance changes in base units, plus any uncertainty. Check whether monitored wallet '+wallet+' is involved; do not assume it appears in every case. Use current chain data and distinguish any historical observation. Transactions: '+REHEARSAL_IDS.join(', ')+'.'},
 {id:'fresh-session-comparison',text:'Revisit Sui Mainnet transaction '+REHEARSAL_IDS[0]+' for monitored wallet '+wallet+'. Retrieve its historical observation, show the memory blob ID and provenance, then compare it with fresh chain data. Explain whether the facts agree, keeping historical and current evidence separate. Export this selected-case report as the original CSV artifact and give its path and SHA-256. Do not invent a complete wallet history.'}],
 runtimeHashes:managedRuntimeHashes(root)};}
const fingerprint=path=>{const s=lstatSync(path);assert(!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,'REHEARSAL_PRIVATE_PATH');return {dev:s.dev,ino:s.ino,birthtimeMs:s.birthtimeMs};};
export function prepareOwnRehearsal(directory,{root,identity,config,credentialRoot,keyFile,retained},{fixture=false}={}){
 privateDirectory(directory);assert(readdirSync(directory).length===0,'REHEARSAL_NEW_DIRECTORY_REQUIRED');
 assert(isAbsolute(root)&&isAbsolute(credentialRoot)&&isAbsolute(keyFile)&&keyFile===join(dirname(keyFile),'tatum.key'),'REHEARSAL_PATH');
 privateDirectory(dirname(keyFile));ownPath(dirname(keyFile));assert(!existsSync(keyFile),'REHEARSAL_KEY_MUST_BE_ABSENT');
 const publicProof=validateRetained(structuredClone(retained),identity,{fixture,freeze:true});
 const c={schema:1,kind:fixture?'offline-rehearsal-test':'prepared-not-authorized',root:ownPath(resolve(root)),identity,config,credentialRoot,keyFile,
  keyDirectory:fingerprint(dirname(keyFile)),retained:publicProof,plan:ownRehearsalPlan(root,{fixture,retained:publicProof})};
 validateRehearsalLineage(c.retained,c.plan);
 managedFile(join(directory,'rehearsal-context.json'),c);managedFile(join(directory,'native-budget.json'),{schema:1,contextHash:runHash(c),turns:[],stopped:null});return c;
}
export function rehearsalContext(directory,{fixture=false}={}){
 privateDirectory(directory);const c=privateRead(join(directory,'rehearsal-context.json'),65536);
 exactKeys(c,['schema','kind','root','identity','config','credentialRoot','keyFile','keyDirectory','retained','plan']);
 assert(c.schema===1&&c.kind===(fixture?'offline-rehearsal-test':'prepared-not-authorized')
  &&canonical(c.plan)===canonical(ownRehearsalPlan(c.root,{fixture,retained:c.retained})),'REHEARSAL_SOURCE_OR_SCOPE_CHANGED');
 assert(canonical(fingerprint(dirname(c.keyFile)))===canonical(c.keyDirectory)&&!lstatSync(dirname(c.keyFile)).isSymbolicLink(),'REHEARSAL_KEY_DIRECTORY_CHANGED');
 validateRetained(c.retained,c.identity,{fixture});validateRehearsalLineage(c.retained,c.plan);return c;
}
function grant(directory,c,{fixture=false,cleanupOnly=false}={}){
 const g=privateRead(join(directory,'rehearsal-grant.json'));
 exactKeys(g,['schema','kind','contextHash','planHash','checkedAt','sponsored','tatum','writePolicyHash','maxNewWrites']);
 assert(g.schema===1&&g.kind===(fixture?'offline-test-only':'human-approved-zero-cost')&&g.contextHash===runHash(c)&&g.planHash===runHash(c.plan)
  &&g.maxNewWrites===3&&g.maxNewWrites===c.plan.writePolicy.maxNewWrites&&g.writePolicyHash===runHash(c.plan.writePolicy)&&g.sponsored===true&&g.tatum.plan==='FREE'&&g.tatum.creditsPerCall===2&&g.tatum.remainingCredits>=16
  &&Number.isSafeInteger(g.tatum.remainingCredits),'REHEARSAL_GRANT_REQUIRED');
 exactKeys(g.tatum,['accountId','plan','remainingCredits','creditsPerCall','keySha256']);
 assert(/^[a-f0-9]{24}$/.test(g.tatum.accountId)&&/^[a-f0-9]{64}$/.test(g.tatum.keySha256),'REHEARSAL_TATUM_BINDING');
 if(!cleanupOnly){const age=Date.now()-time(g.checkedAt);assert(age>=0&&age<240000,'REHEARSAL_GRANT_EXPIRED');}return g;
}
function ticket(directory,c,g){
 assert(g.contextHash===runHash(c)&&canonical(fingerprint(dirname(c.keyFile)))===canonical(c.keyDirectory),'REHEARSAL_CLEANUP_SCOPE');
 const s=lstatSync(c.keyFile);assert(s.isFile()&&s.nlink===1&&(s.mode&0o777)===0o600&&s.size>0&&s.size<=256,'REHEARSAL_KEY_FILE');
 const t={contextHash:runHash(c),path:c.keyFile,parent:c.keyDirectory,file:fingerprint(c.keyFile)};
 managedFile(join(directory,'temporary-key-ticket.json'),t);return t;
}
export function cleanupOwnRehearsalKey(directory){
 const c=privateRead(join(directory,'rehearsal-context.json'),65536),t=privateRead(join(directory,'temporary-key-ticket.json'));
 assert(t.contextHash===runHash(c)&&t.path===c.keyFile&&canonical(t.parent)===canonical(fingerprint(dirname(t.path))),'REHEARSAL_CLEANUP_SCOPE');
 if(!existsSync(t.path))return {deleted:false,absent:true};
 const fd=openSync(t.path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{const s=fstatSync(fd);assert(s.isFile()&&s.nlink===1&&s.uid===process.getuid()&&(s.mode&0o777)===0o600
   &&canonical(fingerprint(t.path))===canonical(t.file)&&s.dev===t.file.dev&&s.ino===t.file.ino,'REHEARSAL_CLEANUP_IDENTITY');unlinkSync(t.path);
 }finally{closeSync(fd);}return {deleted:true,absent:true};
}
function nativeReservation(directory,c,index){
 const path=join(directory,'native-budget.json'),b=privateRead(path);assert(b.contextHash===runHash(c)&&b.stopped===null
  &&b.turns.length===index&&index<2&&b.turns.every(t=>t.status==='completed'),'REHEARSAL_NATIVE_CONSUMED');
 b.turns.push({index,taskHash:runHash(c.plan.tasks[index]),status:'reserved',reservedAt:new Date().toISOString()});managedFile(path,b,false);
}
function nativeResult(directory,index,result){const path=join(directory,'native-budget.json'),b=privateRead(path);assert(b.turns[index]?.status==='reserved','REHEARSAL_NATIVE_RESULT');
 b.turns[index].status=result.status==='COMPLETED'?'completed':'stopped';if(result.status!=='COMPLETED')b.stopped='NATIVE_STOPPED';managedFile(path,b,false);}
function stopCurrentActivation(state,code){
 if(!existsSync(join(state,'active-run.json')))return;
 const a=privateRead(join(state,'active-run.json')),path=join(state,'runs',a.runId,'agent-ledger.json'),ledger=privateRead(path);
 assert(ledger.manifestHash===a.manifestHash,'REHEARSAL_CURRENT_LEDGER');ledger.stopped??=code;managedFile(path,ledger,false);
}
export function validateOwnNativeOutcome(out,state,index,plan,{fixture=false}={}){
 const log=join(out,'events.json'),stat=lstatSync(log);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.uid===process.getuid()&&(stat.mode&0o077)===0&&stat.size<=8388608,'REHEARSAL_NATIVE_LOG');
 const events=JSON.parse(readFileSync(log,'utf8')),items=events.filter(e=>e.method==='item/completed').map(e=>e.params?.item);
 const calls=items.filter(i=>i?.type==='mcpToolCall'&&i.status==='completed');
 const decode=item=>{const text=item.result?.content?.find(c=>c.type==='text')?.text;assert(typeof text==='string','REHEARSAL_NATIVE_EVIDENCE');return JSON.parse(text);};
 const reports=calls.filter(i=>i.tool==='prepare_report').map(decode);
 assert(reports.length>0&&reports.every(r=>r.dataProvenance?.freshProviderRead===!fixture
  &&r.dataProvenance.scope==='selected-transactions'&&r.dataProvenance.walletHistoryComplete===false),'REHEARSAL_FRESH_REPORT_MISSING');
 const digests=new Set(reports.flatMap(r=>r.transactionEvidence?.map(tx=>tx.digest)??[]));
 if(index===0){assert(plan.ids.every(id=>digests.has(id)),'REHEARSAL_SEVEN_CASES_MISSING');return {selectedCases:7};}
 const applicable=reports.flatMap(r=>r.historicalObservations??[]).find(r=>r.record.digest===plan.ids[0]&&r.comparison==='same'&&r.role==='historical-observation'&&r.replacesFreshData===false);
 assert(applicable?.blobId&&digests.has(plan.ids[0]),'REHEARSAL_HISTORICAL_COMPARISON_MISSING');
 const exported=calls.filter(i=>i.tool==='export_report').map(decode).find(r=>r.report?.digests?.length===1&&r.report.digests[0]===plan.ids[0]);
 assert(exported?.artifact&&typeof exported.csv==='string','REHEARSAL_CSV_MISSING');
 const artifact=exported.artifact,expected=join(ownAuthorization(state,{fixture}).run,'exports',artifact.sha256+'.csv');
 assert(/^[a-f0-9]{64}$/.test(artifact.sha256)&&artifact.path===expected,'REHEARSAL_CSV_PATH');
 const info=lstatSync(expected);assert(info.isFile()&&!info.isSymbolicLink()&&(info.mode&0o077)===0&&info.size<=65536,'REHEARSAL_CSV_FILE');
 const bytes=readFileSync(expected);assert(createHash('sha256').update(bytes).digest('hex')===artifact.sha256&&bytes.toString('utf8')===exported.csv,'REHEARSAL_CSV_HASH');
 const message=items.filter(i=>i?.type==='agentMessage').map(i=>i.text??'').join('\n');
 assert(message.includes(artifact.sha256)&&(message.includes(artifact.path)||message.includes(artifact.uri))&&message.includes(applicable.blobId),'REHEARSAL_CSV_DELIVERY');
 return {historicalBlobId:applicable.blobId,csvArtifact:artifact};
}
export async function prepareOwnCorpus(directory,state,c,deadline,{fixture=false,signal}={}){
 const remaining=()=>{assert(!signal?.aborted&&Date.now()<deadline,'REHEARSAL_PREPARATION_DEADLINE');return deadline-Date.now();};
 managedFile(join(directory,'operator-preparation.json'),{schema:1,kind:c.plan.preparation.kind,contextHash:runHash(c),startedAt:new Date().toISOString(),deadline:new Date(deadline).toISOString(),modelCalls:0});
 const client=new Client({name:'recall-explicit-operator-preparation',version:'1'}),wire=new StdioClientTransport({command:process.execPath,
  args:['--disable-warning=ExperimentalWarning',join(c.root,'app/agent-own-entry.mjs'),'--mcp',state,...(fixture?['--offline-fixture']:[])],env:cleanClientEnv()});
 let report,pid;
 try{
  await client.connect(wire,{timeout:remaining(),signal});pid=wire.pid;
  const timeout=remaining(),reply=await client.callTool({name:c.plan.preparation.tool,arguments:c.plan.preparation.arguments},undefined,
   {timeout,maxTotalTimeout:timeout,resetTimeoutOnProgress:false,signal});
  assert(!reply.isError,'REHEARSAL_PREPARATION_TOOL_STOPPED');report=JSON.parse(reply.content[0].text);
  assert(report.dataProvenance?.freshProviderRead===!fixture&&report.dataProvenance.scope==='selected-transactions'
   &&report.dataProvenance.walletHistoryComplete===false&&report.factCaptureSet?.state==='stored-complete-set','REHEARSAL_PREPARATION_NOT_COMPLETE');
  assert(report.transactionEvidence?.length===7&&c.plan.ids.every(id=>report.transactionEvidence.some(tx=>tx.digest===id)),'REHEARSAL_PREPARATION_SEVEN_MISSING');
  assert(report.historicalObservations?.length===7&&c.plan.ids.every(id=>report.historicalObservations.some(row=>row.record.digest===id
   &&row.comparison==='same'&&row.role==='historical-observation'&&row.replacesFreshData===false)),'REHEARSAL_PREPARATION_CONTENT_MISSING');
 }catch(error){
  assert(Date.now()<deadline,'REHEARSAL_PREPARATION_DEADLINE');assert(!signal?.aborted,'REHEARSAL_PREPARATION_INTERRUPTED');
  const code=error.code??error.message;assert(false,typeof code==='string'&&/^[A-Z0-9_]+$/.test(code)?code:'REHEARSAL_PREPARATION_MCP_STOPPED');
 }finally{await client.close();}
 remaining();const a=ownAuthorization(state,{fixture}),ledger=privateRead(join(a.run,'agent-ledger.json'));
 assert(!existsSync(join(state,'.ordinary-runtime'))&&ledger.writes===c.plan.writePolicy.maxNewWrites&&ledger.intents.every(i=>i.state==='done'),'REHEARSAL_PREPARATION_PARTIAL');
 const result={schema:1,kind:c.plan.preparation.kind,explicitOperatorAction:true,modelInitiatedSaving:false,processPid:pid,
  freshProviderRead:!fixture,selectedCases:7,newWrites:ledger.writes,candidateContentRecords:10,deadline:new Date(deadline).toISOString(),finishedAt:new Date().toISOString(),
  observations:report.historicalObservations.map(row=>({id:row.id,blobId:row.blobId,digest:row.record.digest,sha256:runHash(row.record),comparison:row.comparison})),
  counters:{tatumBatches:ledger.tatumBatches,writes:ledger.writes,reads:ledger.reads,requests:ledger.requests},modelCalls:0};
 managedFile(join(directory,'preparation-result.json'),result);return result;
}
export async function runOwnRehearsal(directory,{fixture=false,ports={}}={}){
 const c=rehearsalContext(directory,{fixture}),g=grant(directory,c,{fixture,cleanupOnly:true});
 assert(!existsSync(join(directory,'execution.json'))&&!existsSync(join(directory,'state')),'REHEARSAL_ALREADY_ATTEMPTED');
 managedFile(join(directory,'execution.json'),{contextHash:runHash(c),startedAt:new Date().toISOString(),pid:process.pid});
 const state=join(directory,'state'),summary={schema:1,status:'RUNNING',planHash:runHash(c.plan),contextHash:runHash(c),turns:[],retries:0,additionalSpendUSD:0};let owned=false;
 const signals=new AbortController(),interrupt=()=>signals.abort();process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt);
 try{
  ticket(directory,c,g);owned=true;
  grant(directory,c,{fixture});
  const deadline=time(g.checkedAt)+240000;
  const key=(ports.readKey??readTatumKey)(c.keyFile,g.tatum.accountId);validateTatumBinding({tatum:g.tatum},key);
  mkdirSync(state,{mode:0o700});createOwnActivation(state,{identity:c.identity,config:c.config,credentialRoot:c.credentialRoot,keyFile:c.keyFile,
   profileHash:runHash(Object.fromEntries(['owner','accountId','delegatePublicKeyHex','packageId'].map(k=>[k,c.identity[k]]))),
   tatum:g.tatum,captureConsent:true,captureScope:'transaction-facts-only',captureSet:c.plan.ids,writePolicy:c.plan.writePolicy,checkedAt:g.checkedAt,
   retained:{...structuredClone(c.retained),...Object.fromEntries(['origins','closedAddenda'].filter(k=>c.retained[k]).map(k=>[k,c.retained[k].map(o=>({...structuredClone(o),files:Object.fromEntries(Object.entries(o.files).map(([k,v])=>[k,{path:v.path}]))}))]))}},{fixture});
  if(fixture)await ports.initializeFixture(state,c);
  mkdirSync(join(state,'client'),{mode:0o700});
  const inventory=(ports.inventory??(()=>{assert(Date.now()<deadline,'REHEARSAL_DEADLINE');const r=spawnSync('codex',['mcp','list','--json'],{env:cleanClientEnv(),encoding:'utf8',timeout:Math.max(1,Math.min(15000,deadline-Date.now())),maxBuffer:1048576});assert(r.status===0,'MCP_INVENTORY');return JSON.parse(r.stdout);}))();
  summary.preparation=await (ports.preparation??prepareOwnCorpus)(directory,state,c,deadline,{fixture,signal:signals.signal});
  for(let index=0;index<2;index++){
   rehearsalContext(directory,{fixture});assert(!signals.signal.aborted&&Date.now()<deadline,'REHEARSAL_DEADLINE');
   nativeReservation(directory,c,index);
   const result=await nativeOwnTurn({root:c.root,state,task:c.plan.tasks[index],out:join(directory,'native-'+index),deadline,
    servers:inventory,fixture,spawnNative:ports.spawnNative,signal:signals.signal});nativeResult(directory,index,result);summary.turns.push(result);
   assert(result.status==='COMPLETED','REHEARSAL_NATIVE_STOPPED');
   summary.turns[index].acceptance=validateOwnNativeOutcome(join(directory,'native-'+index),state,index,c.plan,{fixture});
   const a=ownAuthorization(state,{fixture}),ledger=privateRead(join(a.run,'agent-ledger.json'));
   assert(!existsSync(join(state,'.ordinary-runtime')),'REHEARSAL_MCP_NOT_CLOSED');
   assert(ledger.writes===c.plan.writePolicy.maxNewWrites&&ledger.intents.every(i=>i.state==='done'),'REHEARSAL_FIRST_TASK_PARTIAL');
  }
  const reader=(ports.reader??independentOwnReader);
  summary.reader=await reader(state,c.root,deadline,{fixture});
  assert(summary.reader.rows.length===10&&summary.reader.rows.filter(r=>r.record.schema==='recall-transaction-fact/1').length===7,'REHEARSAL_FINAL_INVENTORY');
  for(const old of c.retained.records)assert(summary.reader.rows.some(r=>canonical(r)===canonical(old)),'REHEARSAL_OLD_RECORD_CHANGED');
  summary.status='COMPLETED';
 }catch(error){summary.status='STOPPED';const code=error.code??error.message;summary.reason=typeof code==='string'&&/^[A-Z0-9_]+$/.test(code)?code:'REHEARSAL_ERROR';
  const b=privateRead(join(directory,'native-budget.json'));b.stopped??=summary.reason;managedFile(join(directory,'native-budget.json'),b,false);stopCurrentActivation(state,summary.reason);
 }finally{
  process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);
  summary.finishedAt=new Date().toISOString();
  try{summary.cleanup=owned?cleanupOwnRehearsalKey(directory):{notClaimed:true};}catch(error){summary.status='STOPPED';summary.reason='REHEARSAL_CLEANUP_STOPPED';summary.cleanup={error:error.code??'CLEANUP_IDENTITY'};}
  summary.keyAbsent=!existsSync(c.keyFile);
  try{rehearsalContext(directory,{fixture});summary.closedOriginsUnchanged=true;}catch{summary.status='STOPPED';summary.reason='REHEARSAL_LINEAGE_CHANGED';summary.closedOriginsUnchanged=false;}
  managedFile(join(directory,'result.json'),summary);
 }
 return summary;
}
export async function independentOwnReader(state,root,deadline){
 const code=`import {openOwnAccount} from ${JSON.stringify(pathToFileURL(join(root,'app/agent-own.mjs')).href)};import {ownRealPorts} from ${JSON.stringify(pathToFileURL(join(root,'app/agent-own-entry.mjs')).href)};const r=await openOwnAccount(process.argv[1],ownRealPorts(process.argv[1]),{readonly:true});try{console.log(JSON.stringify({pid:process.pid,rows:await r.experience.read(),counters:r.gate.state()}));}finally{r.close();}`;
 assert(Date.now()<deadline,'REHEARSAL_READER_DEADLINE');
 const r=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning','--input-type=module','-e',code,state],{encoding:'utf8',env:cleanClientEnv(),timeout:Math.max(1,deadline-Date.now()),maxBuffer:131072});
 assert(r.status===0,'REHEARSAL_READER_STOPPED');return JSON.parse(r.stdout);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const [mode,path,input]=process.argv.slice(2);if(mode==='--prepare'){assert(input,'REHEARSAL_CONNECTION_METADATA_REQUIRED');const c=prepareOwnRehearsal(resolve(path),privateRead(resolve(input)));console.log(JSON.stringify({prepared:true,authorized:false,contextHash:runHash(c),planHash:runHash(c.plan),keyPresent:false}));}
  else{assert(mode==='--run'&&path&&!input,'REHEARSAL_MODE');const r=await runOwnRehearsal(resolve(path));console.log(JSON.stringify({status:r.status,reason:r.reason,keyAbsent:r.keyAbsent,retries:r.retries,additionalSpendUSD:0}));if(r.status!=='COMPLETED')process.exitCode=1;}
 }catch(error){console.error(error.code??'REHEARSAL_SETUP_STOPPED');process.exitCode=1;}
}
