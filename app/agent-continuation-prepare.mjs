// Offline preparation only: public proofs and existing nonsecret state files, never profile/key content.
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {assert,exactKeys} from '../src/domain.ts';
import {createContinuationPlan,prepareManaged,managedContext,managedFile} from './agent-managed.mjs';
import {candidateContinuationBaseline,baselineManifest} from './agent-continuation-contract.mjs';
import {runHash} from './agent-run.mjs';
export function prepareContinuationFromFiles(directory,connectionFile){
 const root=fileURLToPath(new URL('../',import.meta.url)),connection=JSON.parse(readFileSync(connectionFile,'utf8'));
 exactKeys(connection,['profileRoot','keyFile','priorRoot','priorOrigins']);
 const plan=createContinuationPlan(root),baseline=candidateContinuationBaseline(root),m=baselineManifest(baseline);
 const identity=Object.fromEntries(['owner','accountId','delegatePublicKeyHex','packageId','workspace'].map(k=>[k,m[k]]));
 const config=JSON.parse(readFileSync(join(root,'evidence/agent-live-preparation-2026-11-06/public-preflight.json'),'utf8')).results.find(r=>r.path==='/config').body;
 const result=prepareManaged(directory,{root,plan,baseline,identity,config,...connection});
 const c=managedContext(directory);
 managedFile(join(directory,'approval-template.json'),{schema:1,kind:'human-approved-bounded-live',contextHash:runHash(c),planHash:runHash(plan),
  checkedAt:null,captureConsent:true,sponsored:true,tatum:{accountId:null,plan:'FREE',remainingCredits:null,creditsPerCall:2,keySha256:null}});
 managedFile(join(directory,'prepared.json'),{schema:1,status:'PREPARED_NOT_AUTHORIZED',contextHash:runHash(c),planHash:runHash(plan),limits:plan.limits,
  model:plan.model,task:plan.tasks[0],keyFile:c.keyFile,command:[process.execPath,'--disable-warning=ExperimentalWarning',join(root,'app/agent-managed-entry.mjs'),'--evaluate',directory],
  grantCreated:false,keyPresent:false,profileRead:false,modelCalls:0,providerCalls:0});
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const [mode,directory,connection,...rest]=process.argv.slice(2);assert(mode==='--prepare'&&directory&&connection&&!rest.length,'CONTINUATION_PREPARE_PATHS');
  console.log(JSON.stringify(prepareContinuationFromFiles(directory,connection)));}
 catch(error){console.error(error?.code??'CONTINUATION_PREPARATION_STOPPED');process.exitCode=1;}
}
