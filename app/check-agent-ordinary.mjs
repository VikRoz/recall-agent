// Reproducible protocol run; no model and no external transport.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {privateRead,operationKey,runHash} from './agent-run.mjs';
import {ordinaryAuthorization} from './agent-ordinary.mjs';
import {FileWriteJournal} from './activity-memory.ts';
import {FIXTURE_WALLET,FIXTURE_OTHER,FIXTURE_DIGESTS} from './activity-fixtures.ts';
import {canonical} from '../src/domain.ts';
const root=fileURLToPath(new URL('../',import.meta.url)),directory=mkdtempSync(join(tmpdir(),'recall-ordinary-protocol-'));
assert(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--compact'),'ORDINARY_CHECK_OPTIONS');
const sha=value=>createHash('sha256').update(value).digest('hex');
globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
let client;const processes=[];
try{
 const setup=spawnSync('/bin/bash',[join(root,'start.command'),'--prepare-provider-fixture',directory,'--capture'],{encoding:'utf8',timeout:10000});
 assert.equal(setup.status,0,setup.stderr);const {manifest:m,run}=ordinaryAuthorization(directory);
 const history=[];
 for(const digest of FIXTURE_DIGESTS.slice(0,2)){
  const fail={schema:'recall-experience/1',workspace:m.workspace,network:'mainnet',operation:'gas-payer',source:'fixture',digest,
   sponsored:false,claimed:FIXTURE_OTHER,observed:FIXTURE_WALLET,verdict:'fail',supersedes:null};
  history.push(fail,{...fail,claimed:FIXTURE_WALLET,verdict:'resolved',supersedes:operationKey(fail)});
 }
 const backend=privateRead(join(directory,'synthetic-relayer.json')),journal=new FileWriteJournal(join(directory,'journal-experience'));
 for(const record of history){
  const key=operationKey(record);backend.records.push({namespace:m.namespaces.experience,text:canonical(record),blob_id:key,key});
  await journal.save(key,{state:'done',sha256:runHash(record),blobId:key,jobId:'fixture-history-'+key});
 }
 backend.revision++;writeFileSync(join(directory,'synthetic-relayer.json'),canonical(backend),{mode:0o600});
 async function open(){
  client=new Client({name:'ordinary-protocol-check',version:'1'});const wire=new StdioClientTransport({command:'/bin/bash',args:[join(root,'start.command'),'--mcp',directory,'--provider-fixture']});
  await client.connect(wire);processes.push(wire.pid);const tools=(await client.listTools()).tools;
  assert(!tools.some(t=>t.name==='find_wallet_activity'));return tools.map(t=>t.name).sort();
 }
 async function call(name,args){const reply=await client.callTool({name,arguments:args});assert(!reply.isError,JSON.stringify(reply));return JSON.parse(reply.content[0].text);}
 const tools=await open();
 const first=await call('prepare_report',{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[FIXTURE_DIGESTS[2]]});
 assert.equal(first.experience.length,0);assert.equal(first.dataProvenance.freshProviderRead,false);
 const failure=await call('verify_gas_payer',{reportId:first.reportId,transaction:FIXTURE_DIGESTS[2],claimedPayer:FIXTURE_OTHER});
 assert.equal(failure.verdict,'fail');assert.equal(failure.memory.storage,'walrus-fixture');assert(failure.memory.blobId);
 await client.close();client=undefined;
 await open();assert.notEqual(processes[0],processes[1]);
 const second=await call('prepare_report',{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[FIXTURE_DIGESTS[2]]});
 assert.equal(second.experience.length,1);assert(second.experience.some(r=>r.id===failure.memory.id));
 const resolution=await call('verify_gas_payer',{reportId:second.reportId,transaction:FIXTURE_DIGESTS[2],claimedPayer:FIXTURE_WALLET});
 assert.equal(resolution.verdict,'pass');assert(resolution.memory.blobId);
 await client.close();client=undefined;
 const final=privateRead(join(directory,'synthetic-relayer.json')),ledger=privateRead(join(run,'agent-ledger.json'));
 const rows=final.records.map(r=>({id:operationKey(JSON.parse(r.text)),record:JSON.parse(r.text),blobId:r.blob_id}));
 assert.equal(rows.length,6);assert.equal(rows.find(r=>r.id===resolution.memory.id).record.supersedes,failure.memory.id);
 assert.equal(ledger.tatumBatches,2);assert.equal(ledger.writes,2);assert.equal(ledger.reads,2);assert(ledger.requests<=64);assert.equal(ledger.stopped,null);
 const codeFiles=['start.command','app/check-agent-ordinary.mjs','app/agent-ordinary.mjs','app/agent-ordinary-fixture.mjs','app/agent-run.mjs','app/agent-provider.mjs',
  'app/agent-walrus-guard.mjs','app/agent-experience.ts','app/agent-session.ts','app/agent-mcp.mjs','app/tatum.ts','app/activity-memory.ts','src/memory.ts'];
 const sourceHashes=Object.fromEntries(codeFiles.map(name=>[name,sha(readFileSync(join(root,name)))]));
 const head=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
 const sourceCommit=head.status===0&&codeFiles.every(name=>{
  const atHead=spawnSync('git',['show',head.stdout.trim()+':'+name],{cwd:root});
  return atHead.status===0&&sha(atHead.stdout)===sourceHashes[name];
 })?head.stdout.trim():null;
 const report={schema:1,date:new Date().toISOString(),status:'ORDINARY_PROVIDER_PROTOCOL_OFFLINE_COMPLETED',
  sourceHashes,sourceCommit,execution:'offline-intercepted',modelCalls:0,externalProviderCalls:0,realProfileLoaded:false,additionalSpendUSD:0,
  initialHistory:{origin:'explicitly-injected-synthetic-fixture',records:4},processIds:processes,tools,
  reports:[first,second],failure,resolution,records:rows,ledger,
  tatumTrace:privateRead(join(directory,'synthetic-tatum.json')),sdkTrace:final.requests,
  limitation:'Protocol selects test claims, not a model trial. SDK, Seal and generated Sui client/normalizer are real; every reply and receipt is synthetic. Resolution receipt is checked against the intercepted backend and journal; no third content recall.'};
 console.log(JSON.stringify(process.argv[2]==='--compact'?{status:report.status,retainedSyntheticRecords:6,independentProcesses:true,
  simulatedTatumBatches:2,simulatedWrites:2,simulatedContentRecalls:2,guardedSyntheticSdkRequests:ledger.requests,modelCalls:0,externalProviderCalls:0}:report,null,2));
}finally{await client?.close();rmSync(directory,{recursive:true,force:true});}
