// Independent protocol clients, all transports intercepted; no actual model/account access.
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {createManagedFixture,managedFixturePorts,openManagedFixture} from './agent-managed-fixture.mjs';
import {armManaged,managedPreflightInventory,bytesHash,managedRuntimeHashes} from './agent-managed.mjs';
import {admittedManaged} from './agent-managed.mjs';
import {privateRead,runHash} from './agent-run.mjs';
import {FIXTURE_WALLET,FIXTURE_DIGESTS} from './activity-fixtures.ts';
const root=fileURLToPath(new URL('../',import.meta.url)),p=mkdtempSync(join(tmpdir(),'recall-managed-protocol-'));
globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
let client,runtime;
try{
 const {directory:d,old,context}=await createManagedFixture(p),options={managedTest:true,ports:managedFixturePorts(d)};
 const oldHash=bytesHash(join(old,'agent-ledger.json')),manifest=armManaged(d,options),preflight=await managedPreflightInventory(d,options),trace=[],pids=[];
 for(let i=0;i<2;i++){
  client=new Client({name:'managed-protocol-evidence',version:'1'});
  const t=new StdioClientTransport({command:process.execPath,args:['--disable-warning=ExperimentalWarning',join(root,'app/agent-managed-fixture.mjs'),'--mcp',d]});
  await client.connect(t);pids.push(t.pid);await client.listTools();
  const call=async(name,args)=>{const result=await client.callTool({name,arguments:args});assert(!result.isError,JSON.stringify(result));const value=JSON.parse(result.content[0].text);trace.push({process:i,tool:name,arguments:args,result:value});return value;};
  const report=await call('prepare_report',{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[FIXTURE_DIGESTS[0]]});
  await call('verify_gas_payer',{reportId:report.reportId,transaction:FIXTURE_DIGESTS[0],claimedPayer:i?report.gas[0].payer:FIXTURE_WALLET});
  await client.close();client=undefined;
 }
 runtime=await openManagedFixture(d);const finalInventory={rules:await runtime.ports.rules.inventory(),experience:await runtime.ports.experience.inventory()};runtime.close();runtime=undefined;
 const state=privateRead(join(admittedManaged(d,{managedTest:true}).run,'agent-ledger.json')),backend=privateRead(join(d,'synthetic-relayer.json'));
 assert.notEqual(pids[0],pids[1]);assert.equal(bytesHash(join(old,'agent-ledger.json')),oldHash);
 assert.equal(state.tatumBatches,2);assert.equal(state.writes,2);assert.equal(state.reads,2);assert.equal(state.stopped,null);
 assert.equal(backend.requests.length,state.requests);assert(state.requests<=64);assert.equal(finalInventory.experience.blobIds.length,4);
 const output={schema:1,date:'2026-11-07',status:'OFFLINE_MANAGED_ADMISSION_CHECKED',sourceHashes:managedRuntimeHashes(root),
  synthetic:true,actualModelCalls:0,actualProviderCalls:0,additionalSpendUSD:0,independentMcpProcesses:2,
  initialRecords:2,finalRecords:4,oldLedgerUnchanged:true,preflight:preflight.counters,finalInventory,
  counters:state,trace,records:backend.records.map(row=>({id:row.key,record:JSON.parse(row.text),blobId:row.blob_id})),requestTrace:backend.requests,tatumTrace:privateRead(join(d,'synthetic-tatum.json')),
  immutablePlanHash:runHash(context.plan),storage:'walrus-fixture',claimOrigin:'protocol-supplied-synthetic-hypothesis',
  limitations:['Synthetic transport responses; not Mainnet receipts or a model accuracy result.','Fake app-server orchestration is tested separately; no actual native inference was performed.']};
 const args=process.argv.slice(2);if(args[0]==='--output'&&args.length===2)writeFileSync(args[1],JSON.stringify(output,null,2)+'\n',{flag:'wx',mode:0o644});
 else assert(args.length===0||args.length===1&&args[0]==='--compact');
 console.log(JSON.stringify({status:output.status,independentMcpProcesses:2,retainedRecords:4,counters:state,providerCalls:0,modelCalls:0,oldLedgerUnchanged:true}));
}catch(e){console.error(e.message);process.exitCode=1;}
finally{await client?.close();runtime?.close();rmSync(p,{recursive:true,force:true});}
