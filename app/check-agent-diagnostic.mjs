// Offline-only two-process startup failure after an actual intercepted remember.
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {createManagedFixture,managedFixturePorts} from './agent-managed-fixture.mjs';
import {armManaged,managedPreflightInventory,managedRuntimeHashes} from './agent-managed.mjs';
import {privateRead} from './agent-run.mjs';
import {FIXTURE_WALLET,FIXTURE_DIGESTS} from './activity-fixtures.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function diagnosticWalkthrough(){
 const p=mkdtempSync(join(tmpdir(),'recall-diagnostic-offline-'));let client;
 try{const {directory:d}=await createManagedFixture(p),options={managedTest:true,ports:managedFixturePorts(d)};
  armManaged(d,options);await managedPreflightInventory(d,options);
  const run=join(d,'runs',privateRead(join(d,'active-run.json')).runId);
  client=new Client({name:'diagnostic-before-stop',version:'1'});
  const transport=new StdioClientTransport({command:process.execPath,args:['--disable-warning=ExperimentalWarning',join(root,'app/agent-managed-fixture.mjs'),'--mcp',d]});
  await client.connect(transport);const firstPid=transport.pid;await client.listTools();
  const call=async(name,args)=>{const result=await client.callTool({name,arguments:args});assert(!result.isError);return JSON.parse(result.content[0].text);};
  const report=await call('prepare_report',{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[FIXTURE_DIGESTS[0]]}),
   observed=await call('verify_gas_payer',{reportId:report.reportId,transaction:FIXTURE_DIGESTS[0],claimedPayer:FIXTURE_WALLET});
  assert.equal(observed.verdict,'fail');assert.equal(observed.memory.storage,'walrus-fixture');
  await client.close();client=undefined;const before=privateRead(join(run,'agent-ledger.json'));
  const child=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning','--input-type=module','-e',
   "import {openManagedFixture} from './app/agent-managed-fixture.mjs';globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED')};let r;try{r=await openManagedFixture(process.argv[1],{failPath:'/health'});process.exitCode=2}catch(e){console.log(JSON.stringify({pid:process.pid,code:e.code}));process.exitCode=1}finally{r?.close()}",d],
   {cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(child.status,1);const second=JSON.parse(child.stdout);assert.notEqual(firstPid,second.pid);
  const after=privateRead(join(run,'agent-ledger.json')),diagnostic=privateRead(join(run,'agent-first-failure.json'));
  assert.equal(diagnostic.phase,'startup');assert.equal(diagnostic.route,'health');assert.equal(diagnostic.httpStatus,503);
  assert.equal(diagnostic.faultCode,'AGENT_PROVIDER_HTTP');assert.equal(after.requests,before.requests+1);
  assert.equal(after.writes,1);assert.equal(after.intents[0].state,'done');assert.equal(after.stopped,'AGENT_PROVIDER_OR_POLICY_ERROR');
  return {schema:1,date:'2026-11-07',status:'OFFLINE_FIRST_FAILURE_DIAGNOSTIC_VERIFIED',sourceHashes:managedRuntimeHashes(root),
   synthetic:true,actualProviderCalls:0,actualModelCalls:0,realCredentialsRead:false,additionalSpendUSD:0,
   independentProcesses:2,controlledFailure:'second-startup-health-503-after-intercepted-remember',observed,diagnostic,before,after,
   ledgerSchemaUnchanged:after.schema===before.schema&&Object.keys(after).sort().join()===Object.keys(before).sort().join(),
   limitations:['Controlled synthetic HTTP failure, not diagnosis of the real 7 November startup cause.','No model inference, real profile/key, account access or provider request.']};
 }finally{await client?.close();rmSync(p,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};const r=await diagnosticWalkthrough(),args=process.argv.slice(2);
  if(args[0]==='--output'&&args.length===2)writeFileSync(args[1],JSON.stringify(r,null,2)+'\n',{flag:'wx'});
  else assert(args.length===0||args.length===1&&args[0]==='--compact');
  console.log(JSON.stringify({status:r.status,independentProcesses:2,diagnostic:r.diagnostic,stopped:r.after.stopped,actualProviderCalls:0,actualModelCalls:0}));
 }catch(e){console.error(e.code??'OFFLINE_DIAGNOSTIC_CHECK_FAILED');process.exitCode=1;}
}
