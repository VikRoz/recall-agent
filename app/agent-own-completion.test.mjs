import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,readFileSync,writeFileSync,readdirSync,realpathSync,statSync,symlinkSync,chmodSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createOwnFixture,syntheticPartialRetained,openOwnFixture} from './agent-own-fixture.mjs';
import {REHEARSAL_IDS,ownRehearsalPlan} from './agent-own-rehearsal.mjs';
import {ownAuthorization} from './agent-own.mjs';
import {operationKey,privateRead,runHash} from './agent-run.mjs';
import {canonical} from '../src/domain.ts';
import {fixtureTransaction,FIXTURE_WALLET} from './activity-fixtures.ts';
import {normalizeTransaction} from './activity.ts';
import {transactionFact,factHash,NORMALIZER_SHA256} from './agent-facts.ts';
import {saveSubmissionProof} from './agent-submission-proof.mjs';
const temporary=()=>realpathSync(mkdtempSync(join(tmpdir(),'recall-completion-check-'))),fixed='2026-11-07T10:00:00.000Z';
async function setup(){const base=temporary();for(const p of ['state','origins'])mkdirSync(join(base,p),{mode:0o700});const state=join(base,'state');
 await createOwnFixture(state,{captureSet:REHEARSAL_IDS,writePolicy:ownRehearsalPlan(process.cwd()).writePolicy,retainedFactory:i=>syntheticPartialRetained(i,join(base,'origins'),REHEARSAL_IDS)});
 return {base,state,a:ownAuthorization(state,{fixture:true})};}
function note(workspace,index=4,observedAt=fixed){const id=REHEARSAL_IDS[index],raw=fixtureTransaction(index%3);raw.digest=id;raw.transaction.digest=id;raw.effects.transactionDigest=id;
 return transactionFact(workspace,normalizeTransaction(raw,id,'mainnet','fixture'),{kind:'fixture',method:'sui.rpc.v2.LedgerService/BatchGetTransactions',hashScope:'protobuf-json-selected-transaction',rawTransactionSha256:factHash(raw),normalizerSha256:NORMALIZER_SHA256},observedAt);}
test('completion writes only three missing facts and retains four existing payloads without rewriting timestamps',async()=>{
 const {base,state,a}=await setup();let r;try{r=await openOwnFixture(state);r.session.clock=()=>fixed;
  const report=await r.session.prepare('mainnet',FIXTURE_WALLET,REHEARSAL_IDS);assert.equal(report.factCaptureSet.state,'stored-complete-set');assert.equal(r.gate.state().writes,3);
  const rows=await r.experience.read();assert.equal(rows.length,10);for(const old of a.context.retained.records)assert(rows.some(row=>canonical(row)===canonical(old)));
  const files=readdirSync(join(a.run,'submission-proofs'));assert.equal(files.length,3);
  for(const file of files){const p=privateRead(join(a.run,'submission-proofs',file));assert.equal(p.key,operationKey(p.record));assert.equal(p.sha256,runHash(p.record));assert(REHEARSAL_IDS.slice(4).includes(p.record.digest));assert.equal(statSync(join(a.run,'submission-proofs',file)).mode&0o777,0o600);}
  const transport=privateRead(join(state,'synthetic-relayer.json'));assert.equal(transport.requests.filter(x=>x.path==='/api/remember').length,3);
  const before=r.gate.state().requests;await assert.rejects(r.experience.write(note(a.context.identity.workspace,4,'2026-11-07T11:00:00.000Z')),/OWN_NEW_WRITE_LIMIT/);
  assert.equal(r.gate.state().requests,before);assert.equal(r.gate.state().writes,3);
 }finally{r?.close();rmSync(base,{recursive:true,force:true});}
});
test('an existing old fact is denied before imported cached receipt reuse, reservation, artifact or transport',async()=>{
 const {base,state,a}=await setup();let r;try{r=await openOwnFixture(state);const old=a.context.retained.records.find(x=>x.record.schema==='recall-transaction-fact/1');
  const before=r.gate.state().requests;await assert.rejects(r.experience.write(old.record),/OWN_MISSING_FACT_SCOPE/);
  assert.equal(r.gate.state().requests,before);assert.equal(r.gate.state().writes,0);assert.equal(r.gate.state().intents.length,0);assert.equal(readdirSync(join(a.run,'submission-proofs')).length,0);
 }finally{r?.close();rmSync(base,{recursive:true,force:true});}
});
test('artifact failure stops before first reservation and remember transport; exact cached proof tampering also stops',async()=>{
 for(const mutation of ['directory','changed-cached']){const {base,state,a}=await setup();let r;try{
  r=await openOwnFixture(state);r.session.clock=()=>fixed;
  const record=note(a.context.identity.workspace),path=join(a.run,'submission-proofs',operationKey(record)+'.json');
  if(mutation==='directory'){
   mkdirSync(path,{mode:0o700});await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,REHEARSAL_IDS),/OWN_SUBMISSION_FILE/);
   assert.equal(r.gate.state().writes,0);assert.equal(r.gate.state().intents.length,0);
   assert.equal(privateRead(join(state,'synthetic-relayer.json')).requests.filter(x=>x.path==='/api/remember').length,0);
  }else{
   await r.session.prepare('mainnet',FIXTURE_WALLET,REHEARSAL_IDS);writeFileSync(path,'changed',{mode:0o600});const before=r.gate.state().requests;
   await assert.rejects(r.experience.write(record),/OWN_SUBMISSION_CHANGED/);assert.equal(r.gate.state().requests,before);assert.equal(r.gate.state().writes,3);
  }
 }finally{r?.close();rmSync(base,{recursive:true,force:true});}}
});
test('submission proof is exact, idempotent and rejects unsafe file identities and changed bytes',()=>{
 const base=temporary();try{mkdirSync(join(base,'submission-proofs'),{mode:0o700});const record=note('agent-00000000-0000-0000-0000-000000000000'),key=operationKey(record),path=join(base,'submission-proofs',key+'.json');
  saveSubmissionProof(base,record,key);const before=statSync(path);saveSubmissionProof(base,record,key);assert.equal(statSync(path).ino,before.ino);
  chmodSync(path,0o644);assert.throws(()=>saveSubmissionProof(base,record,key),/OWN_SUBMISSION_FILE/);chmodSync(path,0o600);
  writeFileSync(path,'bad');assert.throws(()=>saveSubmissionProof(base,record,key),/OWN_SUBMISSION_CHANGED/);unlinkSync(path);
  const other=join(base,'other');writeFileSync(other,'public sentinel',{mode:0o600});symlinkSync(other,path);assert.throws(()=>saveSubmissionProof(base,record,key));assert.equal(readFileSync(other,'utf8'),'public sentinel');
 }finally{rmSync(base,{recursive:true,force:true});}
});
test('whole seven-payload validation refuses changed existing facts and late oversized payloads before any submission',async()=>{
 for(const change of ['existing-conflict','oversized-last']){const {base,state,a}=await setup();let r;try{
  r=await openOwnFixture(state,{transactionReply:(raw,i)=>{
   if(change==='existing-conflict'&&i===0)raw.effects.gasUsed.computationCost=999999n;
   if(change==='oversized-last'&&i===6)raw.balanceChanges=Array.from({length:80},(_,n)=>({address:'0x'+(n+1).toString(16),coinType:'0x2::sui::SUI',amount:'0'}));return raw;}});
  await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,REHEARSAL_IDS));assert.equal(r.gate.state().writes,0);assert.equal(readdirSync(join(a.run,'submission-proofs')).length,0);
 }finally{r?.close();rmSync(base,{recursive:true,force:true});}}
});
test('seven-record signed-content mismatch prevents tools and any new write',async()=>{
 const {base,state,a}=await setup();try{const path=join(state,'synthetic-relayer.json'),backend=privateRead(path),fact=backend.records.find(x=>JSON.parse(x.text).schema==='recall-transaction-fact/1'),record=JSON.parse(fact.text);record.observedAt=fixed;fact.text=canonical(record);writeFileSync(path,canonical(backend),{mode:0o600});
  await assert.rejects(openOwnFixture(state),/MEMORY_READBACK_HASH/);assert.equal(privateRead(join(a.run,'agent-ledger.json')).writes,0);
 }finally{rmSync(base,{recursive:true,force:true});}
});
test('measured virtual poll waits complete three missing notes outside native time, while slow relayer still stops inside shared240',async()=>{
 for(const polls of [4,8]){const {base,state}=await setup();let r,elapsed=40000;const original=Date.now,origin=Date.now();try{
  Date.now=()=>origin+elapsed;r=await openOwnFixture(state,{doneAfterPolls:polls,wait:async ms=>{elapsed+=ms;}});
  if(polls===4){await r.session.prepare('mainnet',FIXTURE_WALLET,REHEARSAL_IDS);assert.equal(r.gate.state().writes,3);assert.equal(elapsed,130000);assert.equal(r.gate.state().stopped,null);}
  else{await assert.rejects(r.session.prepare('mainnet',FIXTURE_WALLET,REHEARSAL_IDS),/AGENT_RUN_EXPIRED/);assert(elapsed<=240000&&elapsed>=239000);assert(r.gate.state().stopped);assert(r.gate.state().intents.some(i=>i.state!=='done'));}
 }finally{Date.now=original;r?.close();rmSync(base,{recursive:true,force:true});}}
});
test('only the two own context basenames admit64KiB; default32KiB and all file safety checks remain',()=>{
 const base=temporary();try{const path=join(base,'own-account-context.json'),value={publicMetadata:'x'.repeat(40000)};writeFileSync(path,JSON.stringify(value),{mode:0o600});
  assert.throws(()=>privateRead(path),/AGENT_PRIVATE_FILE/);assert.deepEqual(privateRead(path,65536),value);assert.throws(()=>privateRead(path,100000),/AGENT_PRIVATE_READ_SCOPE/);
  const other=join(base,'agent-ledger.json');writeFileSync(other,JSON.stringify(value),{mode:0o600});assert.throws(()=>privateRead(other,65536),/AGENT_PRIVATE_READ_SCOPE/);
  chmodSync(path,0o644);assert.throws(()=>privateRead(path,65536),/AGENT_PRIVATE_FILE/);chmodSync(path,0o600);writeFileSync(path,JSON.stringify({x:'x'.repeat(65536)}));assert.throws(()=>privateRead(path,65536),/AGENT_PRIVATE_FILE/);
  unlinkSync(path);symlinkSync(other,path);assert.throws(()=>privateRead(path,65536));
 }finally{rmSync(base,{recursive:true,force:true});}
});
