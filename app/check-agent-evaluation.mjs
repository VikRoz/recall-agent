// Frozen fixture/oracle checks, not a native model conversation or a Mainnet write.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import {createOrdinaryFixture,ordinaryFixtureConsent} from './agent-ordinary-fixture.mjs';
import {createOrdinaryRun,ordinaryAuthorization} from './agent-ordinary.mjs';
import {privateRead,operationKey,runHash} from './agent-run.mjs';
import {FileWriteJournal} from './activity-memory.ts';
import {FixtureRuleStore} from './activity-fixture-store.ts';
import {AgentSession} from './agent-session.ts';
import {FIXTURE_WALLET,FIXTURE_DIGESTS} from './activity-fixtures.ts';
import {canonical} from '../src/domain.ts';
const root=fileURLToPath(new URL('../',import.meta.url)),directory=mkdtempSync(join(tmpdir(),'recall-evaluation-offline-'));
const planPath=join(root,'evidence/candidate-evaluation-2026-11-07/plan.json'),planBytes=readFileSync(planPath),plan=JSON.parse(planBytes);
const sha=value=>createHash('sha256').update(value).digest('hex');
assert(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--compact'),'EVALUATION_CHECK_OPTIONS');
globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
let client;const processIds=[],negativeCases=[];
async function open(variant='base',workspace=directory){
 client=new Client({name:'frozen-evaluation-protocol',version:'1'});
 const wire=new StdioClientTransport({command:process.execPath,args:['--disable-warning=ExperimentalWarning',join(root,'app/agent-evaluation-fixture.mjs'),'--mcp',workspace,variant]});
 await client.connect(wire);processIds.push(wire.pid);await client.listTools();
}
async function call(name,args){const result=await client.callTool({name,arguments:args});assert(!result.isError,JSON.stringify(result));return JSON.parse(result.content[0].text);}
const prepare=index=>call('prepare_report',{network:'mainnet',wallet:FIXTURE_WALLET,transactions:[FIXTURE_DIGESTS[index]]});
const verify=(report,claimedPayer)=>call('verify_gas_payer',{reportId:report.reportId,transaction:report.digests[0],claimedPayer});
try{
 const m=await createOrdinaryFixture(directory),{run}=ordinaryAuthorization(directory);
 // Match the real candidate's warm-start shape without importing a real key or receipt.
 const prior={schema:'recall-tool-experience/1',workspace:m.workspace,source:'replay',tool:'historical_unavailable_tool',
  schemaHash:'8'.repeat(64),field:'limit',constraint:'maximum',bound:10,attempted:100,evidence:'sdk-input-validation',verdict:'fail',supersedes:null};
 const priorResolution={...prior,attempted:10,verdict:'resolved',evidence:'successful-tool-call',supersedes:operationKey(prior)};
 const backend=privateRead(join(directory,'synthetic-relayer.json')),journal=new FileWriteJournal(join(directory,'journal-experience'));
 for(const record of [prior,priorResolution]){
  const key=operationKey(record);backend.records.push({namespace:m.namespaces.experience,text:canonical(record),blob_id:key,key});
  await journal.save(key,{state:'done',sha256:runHash(record),blobId:key,jobId:'fixture-prior-'+key});
 }
 backend.revision++;writeFileSync(join(directory,'synthetic-relayer.json'),canonical(backend),{mode:0o600});
 await open();const first=await prepare(0);
 assert.equal(first.experience.length,0);assert.equal(first.transactionEvidence[0].gas.payer,plan.offlineFixture.payer);
 assert.equal(first.gas[0].netCharge,plan.offlineFixture.netGasMIST);
 assert.equal(first.rows.find(r=>r.address===FIXTURE_WALLET).netAmountBaseUnits,plan.offlineFixture.walletSuiDeltaMIST);
 const failure=await verify(first,FIXTURE_WALLET);assert.equal(failure.verdict,'fail');assert(failure.memory.blobId);
 await client.close();client=undefined;
 await open();const second=await prepare(0);assert.notEqual(processIds[0],processIds[1]);
 assert.equal(second.experience.length,1);assert.equal(second.experience[0].id,failure.memory.id);
 const resolution=await verify(second,plan.offlineFixture.payer);assert.equal(resolution.verdict,'pass');assert(resolution.memory.blobId);
 await client.close();client=undefined;
 const pairLedger=privateRead(join(run,'agent-ledger.json')),pairLedgerBytes=readFileSync(join(run,'agent-ledger.json'));
 assert.equal(pairLedger.writes,2);assert.equal(pairLedger.reads,2);assert.equal(pairLedger.tatumBatches,2);assert.equal(pairLedger.stopped,null);
 const after=privateRead(join(directory,'synthetic-relayer.json'));
 const records=after.records.map(r=>({id:operationKey(JSON.parse(r.text)),record:JSON.parse(r.text),blobId:r.blob_id}));
 assert.equal(records.length,4);assert.equal(records.find(r=>r.id===resolution.memory.id).record.supersedes,failure.memory.id);
 for(const [name,index,variant] of [['other-digest',1,'base'],['changed-payer',0,'changed-payer']]){
  createOrdinaryRun(directory,ordinaryFixtureConsent(false));const {run:negativeRun}=ordinaryAuthorization(directory);
  await open(variant);const report=await prepare(index);assert.equal(report.experience.length,0);
  const result=await verify(report,plan.offlineFixture.payer);
  assert.equal(result.verdict,name==='other-digest'?'pass':'fail');assert.equal(result.memory,null);
  const expected=name==='other-digest'?plan.offlineFixture.payer:plan.offlineFixture.changedPayer;
  assert.equal(report.transactionEvidence[0].gas.payer,expected);assert.equal(result.observed,expected);
  await client.close();client=undefined;
  negativeCases.push({name,report,verification:result,ledger:privateRead(join(negativeRun,'agent-ledger.json'))});
  assert.deepEqual(readFileSync(join(run,'agent-ledger.json')),pairLedgerBytes);
 }
 const controlDir=join(directory,'applicability-controls');mkdirSync(controlDir,{mode:0o700});
 const binding={owner:m.owner,project:m.workspace},control=new AgentSession(binding,new FixtureRuleStore(controlDir,binding),()=>{throw Error('NO_PROVIDER')});
 control.experience={storage:'walrus-fixture',read:async()=>records,write:async()=>{throw Error('NO_CONTROL_WRITE')}};
 const applicability=[];
 for(const [name,patch,expected] of [['exact',{},2],['other-network',{network:'testnet'},0],['other-source',{source:'replay'},0]]){
  const tx={...structuredClone(first.transactionEvidence[0]),...patch};
  const view=await control.view({network:tx.network,wallet:FIXTURE_WALLET,transactions:[tx]});
  assert.equal(view.experience.length,expected);assert.equal(view.transactionEvidence[0].gas.payer,tx.gas.payer);
  applicability.push({name,relevantRecords:view.experience.map(r=>r.id),factualPayer:view.transactionEvidence[0].gas.payer,providerCalls:0});
 }
 const noCapture=join(directory,'no-capture');mkdirSync(noCapture,{mode:0o700});await createOrdinaryFixture(noCapture,{captureConsent:false});
 await open('base',noCapture);const uncapturedReport=await prepare(0),uncaptured=await verify(uncapturedReport,FIXTURE_WALLET);
 assert.equal(uncaptured.verdict,'fail');assert.equal(uncaptured.memory,null);await client.close();client=undefined;
 const noCaptureLedger=privateRead(join(ordinaryAuthorization(noCapture).run,'agent-ledger.json'));assert.equal(noCaptureLedger.writes,0);
 const files=['app/agent-session.ts','app/agent-evaluation-fixture.mjs','app/check-agent-evaluation.mjs','app/agent-experience.ts','app/agent-ordinary.mjs','app/agent-ordinary-fixture.mjs','app/agent-provider.mjs',
  'app/agent-run.mjs','app/agent-walrus-guard.mjs','app/agent-mcp.mjs','app/agent-tool-observer.mjs','app/activity-memory.ts','app/tatum.ts','src/memory.ts'];
 const sourceHashes=Object.fromEntries(files.map(name=>[name,sha(readFileSync(join(root,name)))]));
 const head=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
 const sourceCommit=head.status===0&&files.every(name=>{
  const atHead=spawnSync('git',['show',head.stdout.trim()+':'+name],{cwd:root});
  return atHead.status===0&&sha(atHead.stdout)===sourceHashes[name];
 })?head.stdout.trim():null;
 const report={schema:1,date:new Date().toISOString(),status:'FROZEN_HYPOTHESIS_EVALUATION_OFFLINE_COMPLETED',planSha256:sha(planBytes),
  sourceHashes,sourceCommit,
  claimOrigin:'user-supplied-test-hypothesis',modelCalls:0,externalProviderCalls:0,additionalSpendUSD:0,
  initialHistory:{records:2,kind:'nonapplicable-synthetic-technical-pair'},processIds,
  first,second,failure,resolution,records,pairLedger,negativeCases,applicability,
  noCapture:{verification:uncaptured,ledger:noCaptureLedger},
  oracle:{payer:plan.offlineFixture.payer,netGasMIST:plan.offlineFixture.netGasMIST,walletSuiDeltaMIST:plan.offlineFixture.walletSuiDeltaMIST},
  limitation:'Test code supplies the incorrect user hypothesis. No native model choice, live Tatum response, Mainnet receipt or causal memory improvement is claimed. Each negative case uses an explicitly new synthetic allowance; the completed pair ledger is unchanged.'};
 console.log(JSON.stringify(process.argv[2]==='--compact'?{status:report.status,modelCalls:0,externalProviderCalls:0,additionalSpendUSD:0,
  pair:{writes:pairLedger.writes,contentReads:pairLedger.reads,tatumBatches:pairLedger.tatumBatches,guardedSyntheticSdkRequests:pairLedger.requests},
  negativeCases:negativeCases.map(c=>c.name),pureApplicability:applicability.map(c=>c.name),captureOptOutPassed:true}:report,null,2));
}finally{await client?.close();rmSync(directory,{recursive:true,force:true});}
