// Fully intercepted boundary checks; fixed PUBLIC synthetic delegate, no real credential reader.
import {mkdtempSync,mkdirSync,writeFileSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {StdioServerTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import {address} from './activity.ts';
import {FIXTURE_WALLET,FIXTURE_OTHER,FIXTURE_DIGESTS} from './activity-fixtures.ts';
import {fixtureSdk,fixtureTransport,createAgentFixture} from './agent-provider-fixture.mjs';
import {evaluationTransaction} from './agent-evaluation-fixture.mjs';
import {syntheticTatum,SYNTHETIC_TATUM_KEY} from './agent-ordinary-fixture.mjs';
import {privateRead,runHash,operationKey} from './agent-run.mjs';
import {tatumKeyHash} from './activity-live.ts';
import {SUI_SEAL_ORIGIN} from './agent-walrus-guard.mjs';
import {MANAGED_LIMITS,managedFile,bytesHash,managedRuntimeHashes,createManagedPlan,prepareManaged,managedContext,armManaged,openManaged} from './agent-managed.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export const fixtureManagedPlan=()=>createManagedPlan(root);
export async function createManagedFixture(parent){
 parent=realpathSync(parent);
 const old=join(parent,'prior'),directory=join(parent,'managed'),keydir=join(parent,'capture');
 for(const p of [old,directory,keydir])mkdirSync(p,{mode:0o700});
 const m=await createAgentFixture(old,'fixture');
 const failure={schema:'recall-experience/1',workspace:m.workspace,network:'mainnet',operation:'gas-payer',source:'fixture',
  digest:FIXTURE_DIGESTS[2],sponsored:false,claimed:FIXTURE_OTHER,observed:FIXTURE_WALLET,verdict:'fail',supersedes:null};
 const records=[failure,{...failure,claimed:FIXTURE_WALLET,verdict:'resolved',supersedes:operationKey(failure)}].map(record=>({id:operationKey(record),record,blobId:operationKey(record)}));
 const receipts=Object.fromEntries(records.map((r,i)=>[r.id,{state:'done',sha256:runHash(r.record),jobId:'fixture-prior-'+i,blobId:r.blobId}]));
 const ledger=privateRead(join(old,'agent-ledger.json'));ledger.writes=2;ledger.intents=records.map(r=>({namespace:m.namespaces.experience,key:r.id,sha256:runHash(r.record),state:'done'}));
 ledger.jobs=Object.fromEntries(records.map((r,i)=>['fixture-prior-'+i,{namespace:m.namespaces.experience,key:r.id,polls:1}]));
 managedFile(join(old,'agent-ledger.json'),ledger,false);
 for(const r of records)managedFile(join(old,'journal-experience','activity-jobs',r.id+'.json'),receipts[r.id]);
 const baseline={schema:1,manifest:m,ledger,records,receipts},config={network:'mainnet',packageId:m.packageId,suiTransport:'grpc',suiGrpcUrl:SUI_SEAL_ORIGIN};
 const identity=Object.fromEntries(['owner','accountId','delegatePublicKeyHex','packageId','workspace'].map(k=>[k,m[k]]));
 prepareManaged(directory,{plan:fixtureManagedPlan(),root,identity,config,profileRoot:join(parent,'synthetic-profile-not-used'),keyFile:join(keydir,'tatum.key'),priorRoot:old,baseline,managedTest:true});
 const c=managedContext(directory,{managedTest:true});
 managedFile(join(directory,'managed-grant.json'),{schema:1,kind:'offline-test-only',contextHash:runHash(c),planHash:runHash(c.plan),checkedAt:new Date().toISOString(),
  captureConsent:true,sponsored:true,tatum:{accountId:'0'.repeat(24),plan:'FREE',remainingCredits:100,creditsPerCall:2,keySha256:tatumKeyHash(SYNTHETIC_TATUM_KEY)}});
 writeFileSync(c.keyFile,SYNTHETIC_TATUM_KEY,{mode:0o600,flag:'wx'});
 managedFile(join(directory,'synthetic-relayer.json'),{revision:1,records:records.map(r=>({namespace:m.namespaces.experience,text:JSON.stringify(r.record,Object.keys(r.record).sort()),blob_id:r.blobId,key:r.id})),jobs:{},requests:[]});
 managedFile(join(directory,'synthetic-tatum.json'),{requests:[],closedClients:0});
 return {directory,old,context:c};
}
export function managedFixturePorts(directory,options={}){
 const c=managedContext(directory,{managedTest:true});
 return {readProfile:()=>({...c.identity,walletAddress:c.identity.owner,delegatePrivateKey:'01'.repeat(32)}),
  readKey:()=>SYNTHETIC_TATUM_KEY,createSdk:(p,m)=>fixtureSdk(m),
  transport:async(...args)=>{const active=privateRead(join(directory,'active-run.json')),m=privateRead(join(directory,'runs',active.runId,'agent-run.json'));
   return fixtureTransport(directory,{manifest:m,...options})(...args);},
  createData:syntheticTatum(directory,{transactionReply:evaluationTransaction,...options}),wait:async()=>{}};
}
export const openManagedFixture=(directory,options={})=>openManaged(directory,{managedTest:true,ports:managedFixturePorts(directory,options)});
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let r;try{const [mode,directory]=process.argv.slice(2);if(mode!=='--mcp')throw Error('MANAGED_FIXTURE_ONLY');
  globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};r=await openManagedFixture(directory);
  let closing=false;const close=()=>{if(closing)return;closing=true;r.close();r.server.close().finally(()=>process.exit(0));};
  process.stdin.once('end',close);process.once('SIGTERM',close);process.once('SIGINT',close);
  await r.server.connect(r.observe(new StdioServerTransport()));
 }catch(e){r?.close();console.error(e?.code??e?.message??'MANAGED_FIXTURE_FAILED');process.exitCode=1;}
}
