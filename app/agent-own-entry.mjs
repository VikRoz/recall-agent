// Shared public ordinary MCP entry. Fixture mode cannot load real credential ports.
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {MemWal} from '@mysten-incubation/memwal';
import {StdioServerTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import {assert,canonical} from '../src/domain.ts';
import {profile} from './walrus.mjs';
import {profileIdentity} from './agent-live.mjs';
import {readTatumKey} from './activity-key.ts';
import {connectTatum} from './tatum.ts';
import {transactionProof} from './agent-facts.ts';
import {runHash,privateRead} from './agent-run.mjs';
import {openOwnAccount,ownAuthorization} from './agent-own.mjs';
import {WALRUS_RELAY} from './agent-walrus-guard.mjs';
export function ownRealPorts(directory){
 const {context}=ownAuthorization(directory),root=context.credentialRoot;
 return {identity:async()=>{const p=profile(root);try{return profileIdentity(p);}finally{p.delegatePrivateKey='';}},
  readKey:async account=>readTatumKey(context.keyFile,account),transport:globalThis.fetch.bind(globalThis),
  createSdk:async m=>{const p=profile(root);try{
   assert(runHash(profileIdentity(p))===m.admission.profileHash,'OWN_PROFILE_CHANGED');
   return MemWal.create({key:p.delegatePrivateKey,accountId:p.accountId,namespace:m.namespaces.rules,serverUrl:WALRUS_RELAY,
    requestTimeoutMs:15000,recallTimeoutMs:45000,preflightTimeoutMs:8000});
  }finally{p.delegatePrivateKey='';}},
  createData:async({key,deadline})=>connectTatum({TATUM_API_KEY:key},'mainnet',(_ids,response)=>{
   // Archive only official protobuf JSON of selected public chain transactions, never account/key responses.
   const dir=join(directory,'transaction-proofs');if(!existsSync(dir))mkdirSync(dir,{mode:0o700});
   for(const item of response?.transactions??[])if(item.result?.oneofKind==='transaction'){
    const proof=transactionProof(item.result.transaction),text=canonical(proof),name=runHash(proof)+'.json';
    if(!existsSync(join(dir,name)))writeFileSync(join(dir,name),text,{flag:'wx',mode:0o600});
   }
  },deadline)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let runtime;
 try{
  const [mode,directory,...rest]=process.argv.slice(2);assert(mode==='--mcp'&&directory&&new Set(rest).size===rest.length&&rest.every(x=>['--offline-fixture','--native-limit=12'].includes(x)),'OWN_ENTRY');
  const fixture=rest.includes('--offline-fixture');ownAuthorization(directory,{fixture});
  if(fixture){globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};const {openOwnFixture}=await import('./agent-own-fixture.mjs');const options=privateRead(join(directory,'synthetic-options.json'));assert(Object.keys(options).join(',')==='doneAfterPolls'&&Number.isInteger(options.doneAfterPolls)&&options.doneAfterPolls>=1&&options.doneAfterPolls<=8,'OWN_FIXTURE_OPTIONS');runtime=await openOwnFixture(directory,options);}
  else runtime=await openOwnAccount(directory,ownRealPorts(directory));
  if(rest.includes('--native-limit=12'))runtime.session.nativeToolLimit=12;
  let closed=false;const close=()=>{if(closed)return;closed=true;runtime.close();runtime.server.close().finally(()=>process.exit(0));};
  process.stdin.once('end',close);process.once('SIGINT',close);process.once('SIGTERM',close);
  await runtime.server.connect(runtime.observe(new StdioServerTransport()));
 }catch(error){runtime?.close();const code=error?.code??error?.message;console.error(/^[A-Z0-9_]+$/.test(code??'')?code:'OWN_ENTRY_STOPPED');process.exitCode=1;}
}
