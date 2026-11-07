import {randomUUID} from 'node:crypto';
import {writeFileSync,mkdirSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {MemWal} from '@mysten-incubation/memwal';
import {canonical} from '../src/domain.ts';
import {FIXTURE_WALLET,fixtureTransaction,FIXTURE_DIGESTS} from './activity-fixtures.ts';
import {address} from './activity.ts';
import {createOwnActivation,ownAuthorization,openOwnAccount} from './agent-own.mjs';
import {runHash,operationKey} from './agent-run.mjs';
import {fixtureSdk,fixtureTransport} from './agent-provider-fixture.mjs';
import {ordinaryFixtureConsent,syntheticTatum,SYNTHETIC_TATUM_KEY} from './agent-ordinary-fixture.mjs';
export const OWN_FIXTURE_IDS=[...FIXTURE_DIGESTS,'2it6GExEsJgfjvrh9wZ7EUK4Pboe4dm6gN3ZrBX6bgE3','2AhYCq8SJNHYZwbwNYKoat6d39ZA4jQsiCcB1cXw19rG','BjV2Q8mCarkmtENT1T3SPncKAFP3qNHQKVJ2DgptUnkW','399audbJp2xHpY7R2M7T2jFASw8AvPVGauZ4pBRLgJdj'];
export async function createOwnFixture(directory,options={}){
 const sdk=MemWal.create({key:'01'.repeat(32),accountId:address('0x10')});let publicKey;
 try{publicKey=await sdk.getPublicKeyHex();}finally{sdk.destroy();}
 const identity={owner:FIXTURE_WALLET,accountId:address('0x10'),delegatePublicKeyHex:publicKey,packageId:address('0x20'),workspace:'agent-'+randomUUID()};
 const config={network:'mainnet',packageId:identity.packageId,suiTransport:'grpc',suiGrpcUrl:'https://mysten-rpc.mainnet.sui.io'};
 const retained=options.retainedFactory?.(identity)??null;
 const m=createOwnActivation(directory,{identity,config,profileHash:runHash(identity),...ordinaryFixtureConsent(options.captureConsent??true),
  captureScope:options.captureScope??'transaction-facts-only',retained,captureSet:options.captureSet??null},{fixture:true});
 const records=(retained?.records??[]).map(r=>({namespace:m.namespaces.experience,text:canonical(r.record),blob_id:r.blobId,key:r.id}));
 writeFileSync(join(directory,'synthetic-relayer.json'),canonical({revision:records.length,records,jobs:{},requests:[]}),{flag:'wx',mode:0o600});
 writeFileSync(join(directory,'synthetic-tatum.json'),canonical({requests:[],closedClients:0}),{flag:'wx',mode:0o600});
 writeFileSync(join(directory,'synthetic-options.json'),canonical({doneAfterPolls:options.doneAfterPolls??1}),{flag:'wx',mode:0o600});return m;
}
export function ownFixturePorts(directory,options={}){
 const {manifest,context}=ownAuthorization(directory,{fixture:true});
 return {identity:async()=>context.identity,readKey:async()=>SYNTHETIC_TATUM_KEY,createSdk:fixtureSdk,
  transport:fixtureTransport(directory,{...options,manifest,requestLimit:192,configReply:context.config}),wait:options.wait??(async()=>{}),
  createData:syntheticTatum(directory,{...options,digestIndex:Object.fromEntries(OWN_FIXTURE_IDS.map((id,i)=>[id,i])),transactionReply:i=>{
   const raw=fixtureTransaction(i%3),id=OWN_FIXTURE_IDS[i];raw.digest=id;raw.transaction.digest=id;raw.effects.transactionDigest=id;
   return options.transactionReply?.(raw,i)??raw;
  }})};
}
export const openOwnFixture=async(directory,options={})=>openOwnAccount(directory,ownFixturePorts(directory,options),{fixture:true,readonly:options.readonly});

export function syntheticRetained(identity,root){
 root=realpathSync(root);
 const fail={schema:'recall-tool-experience/1',workspace:identity.workspace,source:'replay',tool:'find_wallet_activity',schemaHash:'a'.repeat(64),field:'limit',constraint:'maximum',bound:10,attempted:100,evidence:'sdk-input-validation',verdict:'fail',supersedes:null};
 const payloads=[fail,{...fail,attempted:10,evidence:'successful-tool-call',verdict:'resolved',supersedes:operationKey(fail)},
  {schema:'recall-experience/1',workspace:identity.workspace,source:'fixture',network:'mainnet',operation:'gas-payer',digest:'3o43bsVXvFpRthgSgkJzugZiR9UGPYWJsFKACXfkMho7',sponsored:false,claimed:address('0xb'),observed:FIXTURE_WALLET,verdict:'fail',supersedes:null}];
 const records=payloads.map(record=>({id:operationKey(record),record,blobId:operationKey(record)})),receipts={},origins=[];
 for(const [index,role] of ['storage','ordinary-write','closed-zero-write'].entries()){
  const path=join(root,role);mkdirSync(path,{mode:0o700});
  const rows=index===0?records.slice(0,2):index===1?records.slice(2):[],manifest={...identity,mode:'offline-sdk-fixture',runId:randomUUID(),
   namespaces:{rules:identity.workspace+'-rules',experience:identity.workspace+'-experience'}};
  const ledger={manifestHash:runHash(manifest),writes:rows.length,intents:[],jobs:{},stopped:index===0?null:'SYNTHETIC_CLOSED_STOP'};
  for(const row of rows){const jobId='synthetic-old-'+row.id;receipts[row.id]={state:'done',sha256:runHash(row.record),blobId:row.blobId,jobId};
   ledger.intents.push({key:row.id,namespace:manifest.namespaces.experience,sha256:runHash(row.record),state:'done'});ledger.jobs[jobId]={key:row.id,namespace:manifest.namespaces.experience};}
  const native={turns:[{status:index===0?'completed':'stopped'}],stopped:index===0?null:'SYNTHETIC_CLOSED_STOP'},files={};
  for(const [kind,value,name] of [['manifest',manifest,'agent-run.json'],['ledger',ledger,'agent-ledger.json'],['native',native,'native-budget.json']]){
   const file=join(path,name);writeFileSync(file,canonical(value),{mode:0o600,flag:'wx'});files[kind]={path:file};
  }
  origins.push({role,manifest,ledger,native,records:rows,files});
 }
 return {identity,records,receipts,origins};
}
