// Offline public-metadata preparation only. Never imports or reads actual credential content.
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {assert,exactKeys} from '../src/domain.ts';
import {prepareManaged,managedFile,managedContext} from './agent-managed.mjs';
import {runHash} from './agent-run.mjs';
export function prepareManagedFromFiles(directory,planFile,connectionFile){
 const root=fileURLToPath(new URL('../',import.meta.url)),plan=JSON.parse(readFileSync(planFile,'utf8')),
  connection=JSON.parse(readFileSync(connectionFile,'utf8')),
  archive=JSON.parse(readFileSync(join(root,'evidence/agent-live-trial-2026-11-06/run.json'),'utf8'));
 exactKeys(connection,['profileRoot','keyFile','priorRoot']);
 const baseline={schema:1,manifest:archive.manifest,ledger:archive.ledger,records:archive.records,receipts:archive.receipts};
 const identity=Object.fromEntries(['owner','accountId','delegatePublicKeyHex','packageId','workspace'].map(k=>[k,baseline.manifest[k]]));
 const config=JSON.parse(readFileSync(join(root,'evidence/agent-live-preparation-2026-11-06/public-preflight.json'),'utf8')).results.find(r=>r.path==='/config').body;
 const result=prepareManaged(directory,{plan,root,identity,config,...connection,baseline});
 const c=managedContext(directory);
 managedFile(join(directory,'approval-template.json'),{schema:1,kind:'human-approved-bounded-live',contextHash:runHash(c),planHash:runHash(plan),
  checkedAt:null,captureConsent:true,sponsored:true,tatum:{accountId:null,plan:'FREE',remainingCredits:null,creditsPerCall:2,keySha256:null}});
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const [mode,directory,plan,connection,...extra]=process.argv.slice(2);assert(mode==='--prepare'&&directory&&plan&&connection&&!extra.length,'MANAGED_PREPARE_PATHS');
  console.log(JSON.stringify(prepareManagedFromFiles(directory,plan,connection)));}
 catch(e){const reason=e?.code??e?.message;console.error(typeof reason==='string'&&/^[A-Z0-9_]+$/.test(reason)?reason:'MANAGED_PREPARATION_STOPPED');process.exitCode=1;}
}
