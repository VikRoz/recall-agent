import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {EventEmitter} from 'node:events';
import {createMetadataFixture,metadataFixturePorts} from './agent-metadata-fixture.mjs';
import {executeMetadata,metadataContext,metadataAuthorization,MetadataGate,metadataFetch,runMetadataStdio,metadataPublicCode} from './agent-metadata-diagnostic.mjs';
import {privateRead} from './agent-run.mjs';
import {WALRUS_RELAY} from './agent-walrus-guard.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),temp=()=>mkdtempSync(join(tmpdir(),'recall-readonly-sdk-test-')),
 options=d=>({testMode:true,ports:metadataFixturePorts(d)}),counter=d=>privateRead(join(d,'metadata-counter.json')),
 mutate=(d,n,fn)=>{const v=privateRead(join(d,n));fn(v);writeFileSync(join(d,n),JSON.stringify(v),{mode:0o600});};
globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
assert.equal(metadataPublicCode(Object.assign(Error('PRIVATE_CANARY'),{code:'PRIVATE_CANARY'})),'READONLY_SDK_DIAGNOSTIC_STOPPED');
const signed=c=>({'content-type':'application/json','x-account-id':c.identity.accountId,'x-public-key':c.identity.delegatePublicKeyHex,
 'x-signature':'1'.repeat(128),'x-timestamp':'1794038000','x-nonce':'11111111-1111-1111-1111-111111111111'});

test('metadata SDK succeeds with five counted requests, selected namespace only, no content/write/Seal and SDK destruction',async()=>{
 const p=temp();try{const {directory:d,old,context:c}=await createMetadataFixture(p),before=readFileSync(join(old,'agent-ledger.json'));
  const result=await executeMetadata(d,options(d));assert.equal(result.requests,5);assert.equal(result.blobIds.length,3);assert.equal(result.synthetic,true);
  assert.deepEqual(result.blobIds,c.expectedBlobIds);assert.equal(result.contentReads,0);assert.equal(result.writes,0);assert.equal(counter(d).finished,true);assert.equal(counter(d).stopped,null);
  assert.deepEqual(privateRead(join(d,'synthetic-sdk.json')),{created:1,destroyed:1,profileReads:1});
  const trace=privateRead(join(d,'synthetic-relayer.json')).requests;assert.equal(trace.length,5);
  assert.deepEqual(trace.map(r=>r.path),['/health','/version','/config','/api/stats','/v1/owners/'+c.identity.owner+'/memories']);
  assert(trace.every(r=>!r.seal));assert.equal(trace.filter(r=>r.signed).length,2);
  assert(!readFileSync(join(d,'metadata-result.json'),'utf8').includes('FOREIGN_NAMESPACE_PRIVATE_CANARY'));assert(!readFileSync(join(d,'metadata-result.json'),'utf8').includes('Z'.repeat(43)));
  assert.deepEqual(readFileSync(join(old,'agent-ledger.json')),before);
  await assert.rejects(executeMetadata(d,options(d)),/EEXIST/);assert.equal(privateRead(join(d,'synthetic-sdk.json')).profileReads,1);
 }finally{rmSync(p,{recursive:true,force:true});}
});

test('missing, stale and wrong grant or changed source/context fail before profile/factory/transport',async()=>{
 for(const kind of ['missing','stale','wrong','context']){const p=temp();try{const {directory:d}=await createMetadataFixture(p);const ports=metadataFixturePorts(d);let touched=0;
  ports.readProfile=ports.createSdk=ports.transport=()=>{touched++;throw Error('MUST_NOT_TOUCH');};
  if(kind==='missing')rmSync(join(d,'metadata-grant.json'));else if(kind==='stale')mutate(d,'metadata-grant.json',g=>g.checkedAt='2026-01-01T00:00:00Z');
  else if(kind==='wrong')mutate(d,'metadata-grant.json',g=>g.contextHash='0'.repeat(64));else mutate(d,'metadata-context.json',c=>c.sourceHashes['app/agent-run.mjs']='0'.repeat(64));
  await assert.rejects(executeMetadata(d,{testMode:true,ports}));assert.equal(touched,0);assert(!existsSync(join(d,'metadata-use.json')));assert.equal(counter(d).requests,0);
 }finally{rmSync(p,{recursive:true,force:true});}}
});

test('wrong identity stops before SDK factory; real CLI cannot open a test admission',async()=>{
 const p=temp();try{const {directory:d}=await createMetadataFixture(p),ports=metadataFixturePorts(d);let sdk=0;
  ports.readProfile=()=>({walletAddress:'0x'+'0'.repeat(64)});ports.createSdk=()=>{sdk++;};
  await assert.rejects(executeMetadata(d,{testMode:true,ports}),/AGENT_DELEGATE_MISMATCH/);assert.equal(sdk,0);assert.equal(counter(d).requests,0);assert.equal(counter(d).stopped,'READONLY_DIAGNOSTIC_STOPPED');
  const child=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning',join(root,'app/agent-metadata-diagnostic.mjs'),'--run',d],{encoding:'utf8',timeout:10000});
  assert.equal(child.status,1);assert(child.stderr.includes('AGENT_METADATA_REAL_TEST_SCOPE'));assert(!existsSync(join(d,'metadata-launch.json')));
 }finally{rmSync(p,{recursive:true,force:true});}
});

test('recall, remember, Seal, Tatum, foreign origin, namespace/query and credential headers are denied before transport',async()=>{
 const variants=['recall','remember','Seal','Tatum','origin','namespace','query','header','redirect','repeat'];
 for(const variant of variants){const p=temp();try{const {directory:d}=await createMetadataFixture(p),{context:c,grant:g}=metadataAuthorization(d,{testMode:true}),gate=new MetadataGate(d,c,g);let calls=0;
  const fetch=metadataFetch(gate,async()=>{calls++;return Response.json({status:'ok',writes:'ok',write_ready:true});},new AbortController().signal);
  let url=WALRUS_RELAY+'/health',init={};
  if(variant==='recall'||variant==='remember'){url=WALRUS_RELAY+'/api/'+variant;init={method:'POST',headers:signed(c),body:'{}'};}
  if(variant==='Seal')url='https://mysten-rpc.mainnet.sui.io/sui.rpc.v2.LedgerService/BatchGetObjects';
  if(variant==='Tatum')url='https://sui-mainnet-grpc.gateway.tatum.io';if(variant==='origin')url='https://other.invalid/health';
  if(variant==='namespace'){url=WALRUS_RELAY+'/api/stats';init={method:'POST',headers:signed(c),body:JSON.stringify({namespace:'foreign'})};}
  if(variant==='query')url+='?SECRET_QUERY_CANARY';if(variant==='header')init={headers:{authorization:'SECRET_HEADER_CANARY'}};
  if(variant==='redirect'){url=WALRUS_RELAY+'/health';init={headers:{cookie:'SECRET_COOKIE_CANARY'}};}
  if(variant==='repeat')await fetch(url,init);
  await assert.rejects(fetch(url,init));assert.equal(calls,variant==='repeat'?1:0);assert.equal(counter(d).requests,variant==='repeat'?1:0);assert.equal(counter(d).stopped,'READONLY_DIAGNOSTIC_STOPPED');
  const text=readFileSync(join(d,'agent-first-failure.json'),'utf8');assert(!text.includes('CANARY'));assert(!text.includes('other.invalid'));
 }finally{rmSync(p,{recursive:true,force:true});}}
});

test('total request cap and abandoned single-use claim survive another invocation without refund',async()=>{
 const p=temp();try{const {directory:d}=await createMetadataFixture(p),{context:c,grant:g}=metadataAuthorization(d,{testMode:true}),gate=new MetadataGate(d,c,g);let calls=0;
  for(let i=0;i<8;i++)gate.reserve();const fetch=metadataFetch(gate,()=>{calls++;},new AbortController().signal);
  await assert.rejects(fetch(WALRUS_RELAY+'/health'),/AGENT_LIMIT/);assert.equal(calls,0);assert.equal(counter(d).requests,8);assert.equal(counter(d).stopped,'READONLY_DIAGNOSTIC_STOPPED');
 }finally{rmSync(p,{recursive:true,force:true});}
 const q=temp();try{const {directory:d}=await createMetadataFixture(q),ports=metadataFixturePorts(d,{failPath:'/health'});
  await assert.rejects(executeMetadata(d,{testMode:true,ports}),/AGENT_PROVIDER_HTTP/);assert.equal(counter(d).requests,1);assert.equal(privateRead(join(d,'agent-first-failure.json')).httpStatus,503);
  const childCode="import {executeMetadata} from './app/agent-metadata-diagnostic.mjs';import {metadataFixturePorts} from './app/agent-metadata-fixture.mjs';globalThis.fetch=()=>{throw Error('DENIED')};try{await executeMetadata(process.argv[1],{testMode:true,ports:metadataFixturePorts(process.argv[1])});process.exitCode=2}catch{process.exitCode=0}";
  const result=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning','--input-type=module','-e',childCode,d],{cwd:root,timeout:10000});assert.equal(result.status,0);
  assert.equal(privateRead(join(d,'synthetic-sdk.json')).profileReads,1);assert.equal(counter(d).requests,1);
 }finally{rmSync(q,{recursive:true,force:true});}
});

test('actual stdio handshake executes SDK startup once and returns only cached diagnostic result',async()=>{
 const p=temp();try{const {directory:d}=await createMetadataFixture(p);
  const result=await runMetadataStdio(d,{testMode:true,workerFile:join(root,'app/agent-metadata-fixture.mjs')});
  assert.equal(result.status,'CURRENT_METADATA_DIAGNOSTIC_STARTUP_COMPLETED');assert.equal(result.requests,5);assert.equal(result.blobIds.length,3);
  assert.equal(counter(d).requests,5);assert.equal(privateRead(join(d,'synthetic-sdk.json')).destroyed,1);
  const stdio=privateRead(join(d,'metadata-stdio-result.json'));assert.equal(stdio.initialized,true);assert.equal(stdio.status,'STDIO_DIAGNOSTIC_COMPLETED');
  await assert.rejects(runMetadataStdio(d,{testMode:true,workerFile:join(root,'app/agent-metadata-fixture.mjs')}),/EEXIST/);assert.equal(counter(d).requests,5);
 }finally{rmSync(p,{recursive:true,force:true});}
});

test('pagination, malformed selected metadata, oversized body and redirect response stop without extra requests',async()=>{
 for(const variant of ['pagination','selected','oversize','redirect']){const p=temp();try{const {directory:d,context:c}=await createMetadataFixture(p),ports=metadataFixturePorts(d),base=ports.transport;
  ports.transport=async(input,options)=>{
   if(variant==='oversize')return new Response('x'.repeat(65537),{status:200});
   if(variant==='redirect')return new Response('',{status:302,headers:{location:'https://foreign.invalid/SECRET_CANARY'}});
   const response=await base(input,options);
   if(String(input).includes('/memories')){const data=await response.json();if(variant==='pagination')data.has_more=true;else data.memories.push({namespace_id:c.namespace,blob_id:'bad',status:'PRIVATE_CANARY'});return Response.json(data);}
   return response;
  };
  await assert.rejects(executeMetadata(d,{testMode:true,ports}));assert(counter(d).requests<=5);assert(!existsSync(join(d,'metadata-result.json')));
  assert.equal(privateRead(join(d,'synthetic-sdk.json')).destroyed,1);assert.equal(counter(d).stopped,'READONLY_DIAGNOSTIC_STOPPED');assert(!readFileSync(join(d,'agent-first-failure.json'),'utf8').includes('CANARY'));
 }finally{rmSync(p,{recursive:true,force:true});}}
});

test('signal cancellation stops in-flight request, destroys SDK and leaves no profile/key cleanup action',async()=>{
 const p=temp();try{const {directory:d}=await createMetadataFixture(p),ports=metadataFixturePorts(d),signals=new EventEmitter();let requested=false;
  ports.transport=async(input,options)=>new Promise((resolve,reject)=>{requested=true;options.signal.addEventListener('abort',()=>reject(Error('PRIVATE_CANCELLED')),{once:true});});
  const pending=executeMetadata(d,{testMode:true,ports,signals});pending.catch(()=>{});
  while(!requested)await new Promise(resolve=>setImmediate(resolve));signals.emit('SIGTERM');await assert.rejects(pending);
  assert.equal(counter(d).stopped,'READONLY_DIAGNOSTIC_STOPPED');assert.equal(counter(d).requests,1);assert.equal(privateRead(join(d,'synthetic-sdk.json')).destroyed,1);
  assert.equal(privateRead(join(d,'agent-first-failure.json')).phase,'close');
 }finally{rmSync(p,{recursive:true,force:true});}
});

test('stdio startup failure consumes the one launch and keeps the SDK first-failure evidence',async()=>{
 const p=temp();try{const {directory:d}=await createMetadataFixture(p);
  writeFileSync(join(d,'synthetic-options.json'),JSON.stringify({failHealth:true}),{mode:0o600});
  await assert.rejects(runMetadataStdio(d,{testMode:true,workerFile:join(root,'app/agent-metadata-fixture.mjs')}));
  const outcome=privateRead(join(d,'metadata-stdio-result.json')),failure=privateRead(join(d,'agent-first-failure.json'));
  assert.equal(outcome.status,'STDIO_DIAGNOSTIC_STOPPED');assert.equal(outcome.initialized,false);assert.equal(failure.route,'health');assert.equal(failure.httpStatus,503);
  assert.equal(counter(d).requests,1);assert.equal(privateRead(join(d,'synthetic-sdk.json')).destroyed,1);
  await assert.rejects(runMetadataStdio(d,{testMode:true,workerFile:join(root,'app/agent-metadata-fixture.mjs')}),/EEXIST/);assert.equal(counter(d).requests,1);
 }finally{rmSync(p,{recursive:true,force:true});}
});
