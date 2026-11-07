// Offline SDK/stdio startup and controlled failure; no real credential or provider.
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createMetadataFixture} from './agent-metadata-fixture.mjs';
import {runMetadataStdio} from './agent-metadata-diagnostic.mjs';
import {privateRead} from './agent-run.mjs';
import {managedRuntimeHashes,bytesHash} from './agent-managed.mjs';
const args=process.argv.slice(2),statusShape=args[0]==='--status-shape';if(statusShape)args.shift();
const root=fileURLToPath(new URL('../',import.meta.url));globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
const p=mkdtempSync(join(tmpdir(),'recall-metadata-protocol-'));
try{
 const a=join(p,'success'),b=join(p,'failure');const {mkdirSync}=await import('node:fs');mkdirSync(a,{mode:0o700});mkdirSync(b,{mode:0o700});
 const success=await createMetadataFixture(a),before=bytesHash(join(success.old,'agent-ledger.json'));
 if(statusShape)writeFileSync(join(success.directory,'synthetic-options.json'),JSON.stringify({metadataStatus:'future_pending_PRIVATE_CANARY'}),{mode:0o600});
 const result=await runMetadataStdio(success.directory,{testMode:true,workerFile:join(root,'app/agent-metadata-fixture.mjs')});
 const sdk=privateRead(join(success.directory,'synthetic-sdk.json')),stdio=privateRead(join(success.directory,'metadata-stdio-result.json')),
  trace=privateRead(join(success.directory,'synthetic-relayer.json')).requests,counter=privateRead(join(success.directory,'metadata-counter.json'));
 assert.equal(result.requests,5);assert.equal(stdio.initialized,true);assert.equal(sdk.destroyed,1);assert.equal(trace.length,5);assert.equal(bytesHash(join(success.old,'agent-ledger.json')),before);
 const failure=await createMetadataFixture(b);writeFileSync(join(failure.directory,'synthetic-options.json'),JSON.stringify({failHealth:true}),{mode:0o600});
 await assert.rejects(runMetadataStdio(failure.directory,{testMode:true,workerFile:join(root,'app/agent-metadata-fixture.mjs')}));
 const stopped=privateRead(join(failure.directory,'metadata-counter.json')),diagnostic=privateRead(join(failure.directory,'agent-first-failure.json')),
  failedStdio=privateRead(join(failure.directory,'metadata-stdio-result.json')),failedSdk=privateRead(join(failure.directory,'synthetic-sdk.json'));
 assert.equal(stopped.requests,1);assert.equal(stopped.stopped,'READONLY_DIAGNOSTIC_STOPPED');assert.equal(diagnostic.httpStatus,503);assert.equal(failedSdk.destroyed,1);
 const output={schema:1,date:'2026-11-07',status:'OFFLINE_READONLY_METADATA_STARTUP_PREPARED',metadataStatusShapeRegression:statusShape,sourceHashes:managedRuntimeHashes(root),synthetic:true,
  actualProviderCalls:0,actualModelCalls:0,actualProfilesRead:false,additionalSpendUSD:0,
  success:{result,stdio,sdk,counter,trace,oldLedgerUnchanged:true},failure:{counter:stopped,diagnostic,stdio:failedStdio,sdk:failedSdk},
  limitations:['Distinct metadata-only diagnostic server; not the live application or judge launcher.','Fabricated metadata and HTTP503; no claim about the historical real failure.']};
 if(args[0]==='--output'&&args.length===2)writeFileSync(args[1],JSON.stringify(output,null,2)+'\n',{flag:'wx'});
 else assert(args.length===0||args.length===1&&args[0]==='--compact');
 console.log(JSON.stringify({status:output.status,syntheticSuccessRequests:5,syntheticFailureRequests:1,SDKsDestroyed:true,actualProviderCalls:0,actualModelCalls:0}));
}catch(error){console.error(error.code??'OFFLINE_METADATA_CHECK_FAILED');process.exitCode=1;}
finally{rmSync(p,{recursive:true,force:true});}
