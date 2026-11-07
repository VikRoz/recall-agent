// One actual independent MCP client and a separate final SDK reader; all provider replies are synthetic.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {createContinuationFixture,continuationOptions} from './agent-continuation-fixture.mjs';
import {armManaged,managedPreflightInventory,reserveManagedTurn,completeManagedTurn,admittedManaged,managedRuntimeHashes} from './agent-managed.mjs';
import {readContinuationProcess} from './agent-managed-entry.mjs';
import {privateRead,runHash} from './agent-run.mjs';
import {FIXTURE_WALLET} from './activity-fixtures.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
export const continuationTask=c=>({schema:1,dataMode:'ordinary-managed-test',model:c.plan.model,tasks:c.plan.tasks,managedTurnIndex:0});
export function originHashes(origins){
 return origins.flatMap(o=>[join(o.run,'agent-run.json'),join(o.run,'agent-ledger.json'),...(o.native?[o.native]:[])])
  .map(path=>({path,sha256:sha(path)}));
}
export async function continuationWalkthrough(){
 const parent=mkdtempSync(join(tmpdir(),'recall-continuation-offline-'));let client;
 try{
  const {directory:d,context:c,priorOrigins}=await createContinuationFixture(parent),before=originHashes(priorOrigins);
  const options=continuationOptions(d);armManaged(d,options);const preflight=await managedPreflightInventory(d,options);
  reserveManagedTurn(d,0,continuationTask(c),{managedTest:true});
  client=new Client({name:'one-continuation-offline',version:'1'});
  const wire=new StdioClientTransport({command:process.execPath,args:['--disable-warning=ExperimentalWarning',join(root,'app/agent-continuation-fixture.mjs'),'--mcp',d]});
  await client.connect(wire);const nativeMcpPid=wire.pid;await client.listTools();
  const call=async(name,args)=>{const r=await client.callTool({name,arguments:args});assert(!r.isError,JSON.stringify(r));return JSON.parse(r.content[0].text);};
  const report=await call('prepare_report',{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[c.plan.publicInputs.transaction]});
  assert.equal(report.experience.length,1);assert.equal(report.experience[0].id,c.baseline.origins[1].records[0].id);
  const verified=await call('verify_gas_payer',{reportId:report.reportId,transaction:c.plan.publicInputs.transaction,claimedPayer:report.gas[0].payer});
  assert.equal(verified.verdict,'pass');assert(verified.memory.blobId);
  // Identical verification reuses the done receipt rather than a second reservation/submission.
  const duplicate=await call('verify_gas_payer',{reportId:report.reportId,transaction:c.plan.publicInputs.transaction,claimedPayer:report.gas[0].payer});
  assert.equal(duplicate.verdict,'pass');assert.equal(duplicate.memory,null);
  await client.close();client=undefined;completeManagedTurn(d,0,'COMPLETED');
  const beforeReader=privateRead(join(admittedManaged(d,{managedTest:true}).run,'agent-ledger.json'));
  assert.equal(beforeReader.reads,2); // Post-write duplicate verification genuinely refreshed content.
  // This branch intentionally cannot perform the third read. A separate clean path below verifies final readback.
  await assert.rejects(readContinuationProcess(d,{managedTest:true}));
  const stoppedRun=join(d,'runs',privateRead(join(d,'active-run.json')).runId),exhausted=privateRead(join(stoppedRun,'agent-ledger.json'));
  assert.equal(exhausted.reads,2);assert(exhausted.stopped);assert(!readFileSync(join(d,'synthetic-relayer.json'),'utf8').includes('privateKey'));
  for(const f of before)assert.equal(sha(f.path),f.sha256);
  return {status:'OFFLINE_CONTINUATION_OVERREAD_STOP_VERIFIED',synthetic:true,preflightRequests:preflight.counters.requests,
   nativeMcpPid,verified,duplicate,exhausted,originalStatesUnchanged:true,modelCalls:0,actualProviderCalls:0,additionalSpendUSD:0};
 }finally{await client?.close();rmSync(parent,{recursive:true,force:true});}
}
export async function continuationHappyPath(){
 const parent=mkdtempSync(join(tmpdir(),'recall-continuation-happy-'));let client;
 try{
  const {directory:d,context:c,priorOrigins}=await createContinuationFixture(parent),before=originHashes(priorOrigins),options=continuationOptions(d);
  armManaged(d,options);await managedPreflightInventory(d,options);reserveManagedTurn(d,0,continuationTask(c),{managedTest:true});
  client=new Client({name:'continuation-happy-offline',version:'1'});const wire=new StdioClientTransport({command:process.execPath,args:['--disable-warning=ExperimentalWarning',join(root,'app/agent-continuation-fixture.mjs'),'--mcp',d]});
  await client.connect(wire);const nativeMcpPid=wire.pid;await client.listTools();
  const call=async(name,args)=>{const r=await client.callTool({name,arguments:args});assert(!r.isError,JSON.stringify(r));return JSON.parse(r.content[0].text);};
  const report=await call('prepare_report',{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[c.plan.publicInputs.transaction]});
  assert.equal(report.experience.length,1);assert.equal(report.experience[0].id,c.baseline.origins[1].records[0].id);
  const resolution=await call('verify_gas_payer',{reportId:report.reportId,transaction:c.plan.publicInputs.transaction,claimedPayer:report.gas[0].payer});
  assert.equal(resolution.verdict,'pass');assert(resolution.memory.blobId);await client.close();client=undefined;completeManagedTurn(d,0,'COMPLETED');
  const result=await readContinuationProcess(d,{managedTest:true});assert.notEqual(result.readerPid,nativeMcpPid);
  assert.equal(result.records.length,4);assert.equal(result.records.find(r=>r.id===resolution.memory.id).record.supersedes,report.experience[0].id);
  assert.equal(result.counters.tatumBatches,1);assert.equal(result.counters.writes,1);assert.equal(result.counters.reads,2);
  assert.equal(result.counters.stopped,null);assert(result.counters.requests<=64);
  assert.equal(privateRead(join(d,'synthetic-relayer.json')).requests.length,result.counters.requests);
  assert.equal(privateRead(join(d,'synthetic-tatum.json')).requests.length,1);
  for(const f of before)assert.equal(sha(f.path),f.sha256);
  return {schema:1,date:new Date().toISOString(),status:'OFFLINE_SINGLE_CONTINUATION_VERIFIED',synthetic:true,
   task:c.plan.tasks[0],taskHash:runHash(c.plan.tasks[0]),sourceHashes:{...managedRuntimeHashes(root),'app/check-agent-continuation.mjs':sha(join(root,'app/check-agent-continuation.mjs'))},
   originalStatesUnchanged:true,initialRecords:3,nativeMcpPid,readerPid:result.readerPid,report,resolution,records:result.records,counters:result.counters,native:result.native,
   modelCalls:0,actualProviderCalls:0,actualProfilesRead:0,actualKeysRead:0,additionalSpendUSD:0,
   limitation:'Independent protocol clients supply the synthetic verifier claim; no actual model choice, account access, real Tatum response or Mainnet write is claimed.'};
 }finally{await client?.close();rmSync(parent,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
 const r=await continuationHappyPath();console.log(JSON.stringify(process.argv[2]==='--compact'?{status:r.status,counters:r.counters,independentProcesses:r.nativeMcpPid!==r.readerPid,actualProviderCalls:0,modelCalls:0}:r,null,2));
}
