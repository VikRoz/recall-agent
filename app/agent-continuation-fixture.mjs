// Synthetic origins/SDK/Tatum transport only. This file cannot read actual credentials or call an account.
import {mkdirSync,writeFileSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {StdioServerTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import {assert,canonical} from '../src/domain.ts';
import {createManagedFixture,managedFixturePorts} from './agent-managed-fixture.mjs';
import {createContinuationPlan,prepareManaged,managedFile,managedContext,openManaged,requireManagedNativePermit} from './agent-managed.mjs';
import {baselineRows} from './agent-continuation-contract.mjs';
import {readContinuation} from './agent-managed-entry.mjs';
import {privateRead,runHash,operationKey} from './agent-run.mjs';
import {evaluationTransaction} from './agent-evaluation-fixture.mjs';
import {syntheticTatum,SYNTHETIC_TATUM_KEY} from './agent-ordinary-fixture.mjs';
import {FIXTURE_WALLET} from './activity-fixtures.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function createContinuationFixture(parent){
 parent=realpathSync(parent);
 const seed=await createManagedFixture(parent),directory=join(parent,'continuation'),second=join(parent,'stopped-origin'),capture=join(parent,'continuation-capture');
 for(const p of [directory,second,capture,join(second,'activity-jobs')])mkdirSync(p,{mode:0o700});
 const first=seed.context.baseline,plan=createContinuationPlan(root),digest=plan.publicInputs.transaction;
 const record={schema:'recall-experience/1',workspace:first.manifest.workspace,network:'mainnet',operation:'gas-payer',source:'fixture',
  digest,sponsored:true,claimed:FIXTURE_WALLET,observed:evaluationTransaction(0).transaction.gasPayment.owner,verdict:'fail',supersedes:null};
 const row={id:operationKey(record),record,blobId:operationKey(record)},receipt={state:'done',sha256:runHash(record),blobId:row.blobId,jobId:'fixture-done-stopped-origin'};
 const manifest={...first.manifest,runId:randomUUID()},ledger={schema:1,manifestHash:runHash(manifest),stopped:'AGENT_PROVIDER_OR_POLICY_ERROR',
  writes:1,tatumBatches:1,reads:1,requests:29,intents:[{key:row.id,namespace:manifest.namespaces.experience,sha256:receipt.sha256,state:'done'}],
  jobs:{[receipt.jobId]:{key:row.id,namespace:manifest.namespaces.experience,polls:1}}},nativeBudget={schema:1,contextHash:'0'.repeat(64),model:plan.model,
  turns:[{index:0,status:'completed'},{index:1,status:'stopped'}],stopped:'NATIVE_STOPPED'};
 managedFile(join(second,'agent-run.json'),manifest);managedFile(join(second,'agent-ledger.json'),ledger);
 managedFile(join(second,'native-budget.json'),nativeBudget);managedFile(join(second,'activity-jobs',row.id+'.json'),receipt);
 const baseline={schema:2,kind:'exact-settled-original-bundles',origins:[{sourceCommit:'1'.repeat(40),manifest:first.manifest,ledger:first.ledger,records:first.records,receipts:first.receipts,nativeBudget:null},
  {sourceCommit:'2'.repeat(40),manifest,ledger,records:[row],receipts:{[row.id]:receipt},nativeBudget}],
  metadata:{contextHash:'3'.repeat(64),resultHash:'4'.repeat(64),expectedBlobIds:[...first.records.map(r=>r.blobId),row.blobId].sort()}};
 const priorOrigins=[{run:seed.old,journal:join(seed.old,'journal-experience'),workspace:seed.old,native:null},
  {run:second,journal:second,workspace:second,native:join(second,'native-budget.json')}];
 prepareManaged(directory,{plan,root,identity:seed.context.identity,config:seed.context.config,profileRoot:join(parent,'synthetic-no-profile'),
  keyFile:join(capture,'tatum.key'),priorRoot:second,priorOrigins,baseline,managedTest:true});
 const c=managedContext(directory,{managedTest:true}),grant=privateRead(join(seed.directory,'managed-grant.json'));
 managedFile(join(directory,'managed-grant.json'),{...grant,contextHash:runHash(c),planHash:runHash(plan)});
 writeFileSync(c.keyFile,SYNTHETIC_TATUM_KEY,{flag:'wx',mode:0o600});
 managedFile(join(directory,'synthetic-relayer.json'),{revision:1,records:baselineRows(baseline).map(r=>({namespace:manifest.namespaces.experience,text:canonical(r.record),blob_id:r.blobId,key:r.id})),jobs:{},requests:[]});
 managedFile(join(directory,'synthetic-tatum.json'),{requests:[],closedClients:0});
 return {directory,context:c,priorOrigins};
}
export function continuationFixturePorts(directory,options={}){
 const c=managedContext(directory,{managedTest:true}),ports=managedFixturePorts(directory,options);
 ports.createData=syntheticTatum(directory,{digestIndex:{[c.plan.publicInputs.transaction]:0},transactionReply:index=>{
  const raw=evaluationTransaction(index);raw.digest=raw.transaction.digest=raw.effects.transactionDigest=c.plan.publicInputs.transaction;return raw;
 }});return ports;
}
export const continuationOptions=d=>({managedTest:true,ports:continuationFixturePorts(d)});
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let r;try{
  globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
  const [mode,directory,...rest]=process.argv.slice(2);assert(directory&&!rest.length,'CONTINUATION_FIXTURE_ONLY');
  if(mode==='--read-continuation')await readContinuation(directory,continuationOptions(directory));
  else{
   assert(mode==='--mcp','CONTINUATION_FIXTURE_ONLY');requireManagedNativePermit(directory,{managedTest:true});
   r=await openManaged(directory,{...continuationOptions(directory),native:true});
   let closing=false;const close=()=>{if(closing)return;closing=true;r.close();r.server.close().finally(()=>process.exit(0));};
   process.stdin.once('end',close);process.once('SIGINT',close);process.once('SIGTERM',close);
   await r.server.connect(r.observe(new StdioServerTransport()));
  }
 }catch(e){r?.close();console.error(e?.code??'CONTINUATION_FIXTURE_STOPPED');process.exitCode=1;}
}
