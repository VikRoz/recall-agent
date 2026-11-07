// Public ordinary MCP entry, independent processes, installed SDK/Seal and protobuf codecs.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {createOwnFixture,OWN_FIXTURE_IDS,syntheticRetained} from './agent-own-fixture.mjs';
import {ownAuthorization} from './agent-own.mjs';
import {operationKey,runHash,privateRead} from './agent-run.mjs';
import {canonical} from '../src/domain.ts';
import {FIXTURE_WALLET,FIXTURE_OTHER} from './activity-fixtures.ts';
import {FileWriteJournal} from './activity-memory.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function ownWalkthrough({worst=false}={}){
 const dir=mkdtempSync(join(tmpdir(),'recall-own-protocol-')),lineageRoot=mkdtempSync(join(tmpdir(),'recall-own-lineage-'));let client;const pids=[];
 try{
  const m=await createOwnFixture(dir,{retainedFactory:identity=>syntheticRetained(identity,lineageRoot),doneAfterPolls:worst?8:1,captureSet:OWN_FIXTURE_IDS}),a=ownAuthorization(dir,{fixture:true});
  async function open(){client=new Client({name:'ordinary-own-check',version:'1'});const wire=new StdioClientTransport({command:process.execPath,
   args:['--disable-warning=ExperimentalWarning',join(root,'app/agent-own-entry.mjs'),'--mcp',dir,'--offline-fixture']});await client.connect(wire);pids.push(wire.pid);return (await client.listTools()).tools;}
  async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError,JSON.stringify(r));return JSON.parse(r.content[0].text);}
  const tools=await open();assert.equal(tools.find(t=>t.name==='prepare_report').annotations.readOnlyHint,false);
  const denied=await client.callTool({name:'prepare_report',arguments:{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[OWN_FIXTURE_IDS[0]],credentialRoot:'/must-not-read'}});
  assert(denied.isError);assert.equal(privateRead(join(a.run,'agent-ledger.json')).tatumBatches,0);
  const reports=[];for(const ids of (worst?OWN_FIXTURE_IDS.map(id=>[id]):[OWN_FIXTURE_IDS]))reports.push(await call('prepare_report',{network:'mainnet',wallet:FIXTURE_WALLET,transactions:ids}));
  assert.equal(reports.at(-1).historicalObservations.length,worst?1:7);
  assert.equal(privateRead(join(a.run,'agent-ledger.json')).writes,7);
  for(let i=0;i<(worst?5:1);i++){const verify=await call('verify_gas_payer',{reportId:reports[0].reportId,transaction:OWN_FIXTURE_IDS[0],claimedPayer:FIXTURE_OTHER});
   assert.equal(verify.verdict,'fail');assert.equal(verify.captureSkipped,'not-admitted-by-scope');}
  await client.close();client=undefined;await open();
  const next=await call('prepare_report',{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[OWN_FIXTURE_IDS[0]]});
  assert.equal(next.historicalObservations[0].comparison,'same');assert.equal(next.historicalObservations[0].replacesFreshData,false);
  const csv=await call('export_report',{reportId:next.reportId});assert(csv.artifact.sha256);await client.close();client=undefined;
  const readerCode=`import {openOwnFixture} from ${JSON.stringify(new URL('./agent-own-fixture.mjs',import.meta.url).href)};const r=await openOwnFixture(process.argv[1],{readonly:true});try{const rows=await r.experience.read();console.log(JSON.stringify({rows,pid:process.pid,counters:r.gate.state()}));}finally{r.close();}`;
  const read=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning','--input-type=module','-e',readerCode,dir],{encoding:'utf8',timeout:20000});assert.equal(read.status,0,read.stderr);
  const final=JSON.parse(read.stdout),ledger=privateRead(join(a.run,'agent-ledger.json'));pids.push(final.pid);
  assert.equal(new Set(pids).size,3);assert.equal(final.rows.length,10);assert.equal(ledger.writes,7);assert.equal(ledger.tatumBatches,worst?8:2);
  assert.equal(ledger.reads,10);assert(ledger.requests<=192);assert.equal(ledger.stopped,null);
  return {schema:1,status:'OWN_ACCOUNT_OFFLINE_PROTOCOL_PASSED',sourceCommit:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(),
   sourceNote:'Runtime worktree hashes are frozen at final acceptance, not attested by the HEAD label alone.',
   processIds:pids,initialRecords:3,finalRecords:10,worstPermittedTrace:worst,synthetic:true,realProviderCalls:0,realProfileReads:0,modelCalls:0,additionalSpendUSD:0,
   counters:{tatumBatches:ledger.tatumBatches,writes:ledger.writes,reads:ledger.reads,requests:ledger.requests},
   freshProviderSimulated:true,historicalComparison:next.historicalObservations[0].comparison,originalCsvHash:csv.artifact.sha256,
   limits:{tatumBatches:8,writes:7,reads:10,requests:192,pollsPerJob:8},
   records:final.rows,limitation:'All replies, old records and receipts are synthetic. Native client and live own-account onboarding remain untested.'};
 }finally{await client?.close();rmSync(dir,{recursive:true,force:true});rmSync(lineageRoot,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};const r=await ownWalkthrough({worst:process.argv.includes('--worst')});
 console.log(JSON.stringify(process.argv.includes('--compact')?{...r,records:undefined}:r,null,2));
}
