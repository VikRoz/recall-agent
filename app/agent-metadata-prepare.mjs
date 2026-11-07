// Offline candidate preparation from public completed evidence; no profile/key/account read.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {assert} from '../src/domain.ts';
import {prepareMetadata,metadataPublicCode} from './agent-metadata-diagnostic.mjs';
export function prepareCandidateMetadata(directory,profileRoot){
 const root=fileURLToPath(new URL('../',import.meta.url)),read=n=>JSON.parse(readFileSync(join(root,n),'utf8')),
  prior=read('evidence/agent-live-trial-2026-11-06/run.json'),current=read('evidence/ordinary-live-2026-11-07/run.json'),
  identity=Object.fromEntries(['owner','accountId','delegatePublicKeyHex','packageId','workspace'].map(k=>[k,current.manifest[k]]));
 assert(Object.keys(identity).every(k=>prior.manifest[k]===identity[k]),'AGENT_METADATA_IDENTITY');
 const config=read('evidence/agent-live-preparation-2026-11-06/public-preflight.json').results.find(r=>r.path==='/config').body;
 return prepareMetadata(directory,{root,profileRoot,identity,config,expectedBlobIds:[...prior.records.map(r=>r.blobId),current.newRecord.blobId].sort()});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const [mode,directory,profileRoot,...extra]=process.argv.slice(2);assert(mode==='--prepare'&&directory&&profileRoot&&!extra.length,'AGENT_METADATA_EXPLICIT_MODE');
  console.log(JSON.stringify(prepareCandidateMetadata(directory,profileRoot)));}
 catch(error){console.error(metadataPublicCode(error));process.exitCode=1;}
}
