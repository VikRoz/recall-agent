// Synthetic-only metadata diagnostic. No actual profile loader or network fallback.
import {mkdirSync,writeFileSync,realpathSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {MemWal} from '@mysten-incubation/memwal';
import {StdioServerTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import {createAgentFixture,fixtureTransport} from './agent-provider-fixture.mjs';
import {prepareMetadata,metadataContext,serveMetadata,metadataPublicCode} from './agent-metadata-diagnostic.mjs';
import {managedFile} from './agent-managed.mjs';
import {privateRead,runHash} from './agent-run.mjs';
import {SUI_SEAL_ORIGIN} from './agent-walrus-guard.mjs';
import {assert} from '../src/domain.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function createMetadataFixture(parent){
 parent=realpathSync(parent);const old=join(parent,'old'),directory=join(parent,'probe');mkdirSync(old,{mode:0o700});mkdirSync(directory,{mode:0o700});
 const m=await createAgentFixture(old,'fixture'),identity=Object.fromEntries(['owner','accountId','delegatePublicKeyHex','packageId','workspace'].map(k=>[k,m[k]])),ids=['A'.repeat(43),'B'.repeat(43),'C'.repeat(43)];
 prepareMetadata(directory,{root,profileRoot:join(parent,'unused-profile'),identity,config:{network:'mainnet',packageId:m.packageId,suiTransport:'grpc',suiGrpcUrl:SUI_SEAL_ORIGIN},expectedBlobIds:ids,testMode:true});
 const c=metadataContext(directory,{testMode:true});managedFile(join(directory,'metadata-grant.json'),{schema:1,kind:'offline-test-only',contextHash:runHash(c),checkedAt:new Date().toISOString()});
 managedFile(join(directory,'synthetic-relayer.json'),{revision:1,records:[...ids.map(blob_id=>({namespace:c.namespace,blob_id})),{namespace:'FOREIGN_NAMESPACE_PRIVATE_CANARY',blob_id:'Z'.repeat(43)}],jobs:{},requests:[]});
 managedFile(join(directory,'synthetic-sdk.json'),{created:0,destroyed:0,profileReads:0});return {directory,old,context:c,manifest:m};
}
export function metadataFixturePorts(directory,options={}){
 const c=metadataContext(directory,{testMode:true}),m={...c.identity,runId:'11111111-1111-1111-1111-111111111111',namespaces:{rules:c.identity.workspace+'-rules',experience:c.namespace}},
  update=fn=>{const s=privateRead(join(directory,'synthetic-sdk.json'));fn(s);writeFileSync(join(directory,'synthetic-sdk.json'),JSON.stringify(s),{mode:0o600});};
 return {readProfile:()=>{update(s=>s.profileReads++);return {...c.identity,walletAddress:c.identity.owner,delegatePrivateKey:'01'.repeat(32)};},
  createSdk:(p,ctx)=>{update(s=>s.created++);const sdk=MemWal.create({key:p.delegatePrivateKey,accountId:ctx.identity.accountId,namespace:ctx.namespace,serverUrl:'https://relayer.memory.walrus.xyz',requestTimeoutMs:15000,preflightTimeoutMs:8000});
   const destroy=sdk.destroy.bind(sdk);let closed=false;sdk.destroy=()=>{if(!closed){closed=true;update(s=>s.destroyed++);destroy();}};return sdk;},
  transport:async(...args)=>{const response=await fixtureTransport(directory,{manifest:m,...options})(...args);
   if(Object.hasOwn(options,'metadataStatus')&&new URL(args[0]).pathname.endsWith('/memories')){
    const body=await response.json();for(const row of body.memories)if(row.namespace_id===c.namespace)row.status=options.metadataStatus;return Response.json(body);
   }return response;
  }};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let server;try{const [mode,directory]=process.argv.slice(2);assert(mode==='--worker'&&directory,'OFFLINE_METADATA_ONLY');globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};
  const c=metadataContext(directory,{testMode:true}),launch=privateRead(join(directory,'metadata-launch.json'));assert(launch.contextHash===runHash(c)&&launch.pid===process.ppid,'AGENT_METADATA_LAUNCH_BINDING');
  const o=existsSync(join(directory,'synthetic-options.json'))?privateRead(join(directory,'synthetic-options.json')):{};
  assert(Object.keys(o).length===0||Object.keys(o).length===1&&(o.failHealth===true||typeof o.metadataStatus==='string'&&o.metadataStatus.length>0&&o.metadataStatus.length<=128),'OFFLINE_METADATA_OPTIONS');
  server=await serveMetadata(directory,{testMode:true,ports:metadataFixturePorts(directory,o.failHealth?{failPath:'/health'}:o)});
  let closing=false;const close=()=>{if(closing)return;closing=true;server.close().finally(()=>process.exit(0));};
  process.stdin.once('end',close);process.once('SIGINT',close);process.once('SIGTERM',close);await server.connect(new StdioServerTransport());
 }catch(error){await server?.close();console.error(metadataPublicCode(error));process.exitCode=1;}
}
