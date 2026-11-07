import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,realpathSync,writeFileSync,existsSync,readFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createOwnFixture,syntheticRetained} from './agent-own-fixture.mjs';
import {ordinaryFixtureConsent,SYNTHETIC_TATUM_KEY} from './agent-ordinary-fixture.mjs';
import {ownAuthorization} from './agent-own.mjs';
import {prepareOwnRehearsal,runOwnRehearsal,ownRehearsalPlan} from './agent-own-rehearsal.mjs';
import {ownNativeArgs,nativeOwnTurn} from './agent-own-native.mjs';
import {runHash,privateRead} from './agent-run.mjs';
import {managedFile} from './agent-managed.mjs';
import {canonical} from '../src/domain.ts';
import {createOwnCaptureSpec,captureOwnKey,captureOwnClipboard,executeOwnRehearsal} from './agent-own-exec.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),temporary=()=>realpathSync(mkdtempSync(join(tmpdir(),'recall-own-rehearsal-test-')));
async function setup(){const base=temporary();for(const p of ['initial','origins','prepared','capture'])mkdirSync(join(base,p),{mode:0o700});
 await createOwnFixture(join(base,'initial'));const a=ownAuthorization(join(base,'initial'),{fixture:true}),retained=syntheticRetained(a.context.identity,join(base,'origins'));
 const connection={root,identity:a.context.identity,config:a.context.config,credentialRoot:join(base,'initial'),keyFile:join(base,'capture','tatum.key'),retained};
 const directory=join(base,'prepared'),c=prepareOwnRehearsal(directory,connection,{fixture:true});
 const consent=ordinaryFixtureConsent();managedFile(join(directory,'rehearsal-grant.json'),{schema:1,kind:'offline-test-only',contextHash:runHash(c),planHash:runHash(c.plan),checkedAt:new Date().toISOString(),sponsored:true,tatum:consent.tatum});
 writeFileSync(connection.keyFile,SYNTHETIC_TATUM_KEY,{mode:0o600,flag:'wx'});return {base,directory,c};
}
function ports(mode='success'){return {readKey:()=>SYNTHETIC_TATUM_KEY,inventory:()=>[],
 initializeFixture:async(state,c)=>{
  writeFileSync(join(state,'synthetic-relayer.json'),canonical({revision:3,records:c.retained.records.map(r=>({namespace:c.identity.workspace+'-experience',text:canonical(r.record),blob_id:r.blobId,key:r.id})),jobs:{},requests:[]}),{mode:0o600,flag:'wx'});
  writeFileSync(join(state,'synthetic-tatum.json'),canonical({requests:[],closedClients:0}),{mode:0o600,flag:'wx'});
  writeFileSync(join(state,'synthetic-options.json'),canonical({doneAfterPolls:1}),{mode:0o600,flag:'wx'});
 },spawnNative:(args,options)=>spawn(process.execPath,['--disable-warning=ExperimentalWarning',join(root,'app/agent-own-native-fixture.mjs'),...args],{...options,env:{...options.env,RECALL_FAKE_NATIVE_MODE:mode}}),
 reader:async state=>{
  const code=`import {openOwnFixture} from ${JSON.stringify(pathToFileURL(join(root,'app/agent-own-fixture.mjs')).href)};const r=await openOwnFixture(process.argv[1],{readonly:true});try{console.log(JSON.stringify({pid:process.pid,rows:await r.experience.read(),counters:r.gate.state()}));}finally{r.close();}`;
  const child=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning','--input-type=module','-e',code,state],{encoding:'utf8',timeout:15000});assert.equal(child.status,0,child.stderr);return JSON.parse(child.stdout);
 }};}
test('bounded author wrapper traverses two fake app-servers and actual public MCP/SDK processes with independent reader',async()=>{
 const {base,directory,c}=await setup();try{
  const result=await runOwnRehearsal(directory,{fixture:true,ports:ports()});assert.equal(result.status,'COMPLETED',JSON.stringify(result));
  assert.equal(result.turns.length,2);assert.notEqual(result.turns[0].thread,result.turns[1].thread);assert(result.turns.every(t=>t.tools<=12&&t.approvals<=12));
  assert.equal(result.reader.rows.length,10);assert.equal(result.reader.counters.tatumBatches,2);assert.equal(result.reader.counters.writes,7);assert.equal(result.reader.counters.reads,10);
  assert(result.reader.counters.requests<=192);assert.equal(result.keyAbsent,true);assert.equal(result.closedOriginsUnchanged,true);
  const budget=privateRead(join(directory,'native-budget.json'));assert.equal(budget.turns.length,2);assert(budget.turns.every(t=>t.status==='completed'));
  await assert.rejects(runOwnRehearsal(directory,{fixture:true,ports:ports()}),/REHEARSAL_ALREADY_ATTEMPTED/);
  assert.equal(existsSync(c.keyFile),false);
 }finally{rmSync(base,{recursive:true,force:true});}
});
test('quota and unexpected native authorization stop without retry and consume their single reserved slot',async()=>{
 for(const mode of ['quota','unexpected','excess']){const {base,directory}=await setup();try{
  const result=await runOwnRehearsal(directory,{fixture:true,ports:ports(mode)});assert.equal(result.status,'STOPPED');assert.equal(result.keyAbsent,true);assert.equal(result.retries,0);
  const budget=privateRead(join(directory,'native-budget.json'));assert.equal(budget.turns.length,1);assert.equal(budget.turns[0].status,'stopped');assert(budget.stopped);
  assert(result.turns[0].approvals<=12);if(mode==='excess')assert.equal(result.turns[0].approvals,12);
 }finally{rmSync(base,{recursive:true,force:true});}}
});
test('expired grant cleans only the owned captured file and starts no model or provider',async()=>{
 const {base,directory}=await setup();try{
  const path=join(directory,'rehearsal-grant.json'),g=privateRead(path);g.checkedAt='2020-01-01T00:00:00.000Z';writeFileSync(path,canonical(g),{mode:0o600});
  let factories=0;const p=ports();p.readKey=()=>{factories++;throw Error('MUST_NOT_READ');};
  const result=await runOwnRehearsal(directory,{fixture:true,ports:p});assert.equal(result.status,'STOPPED');assert.equal(result.reason,'REHEARSAL_GRANT_EXPIRED');
  assert.equal(factories,0);assert.equal(result.keyAbsent,true);assert.equal(privateRead(join(directory,'native-budget.json')).turns.length,0);
 }finally{rmSync(base,{recursive:true,force:true});}
});
test('frozen plan names seven distinct public cases and native config points to the same bounded public entry',()=>{
 const p=ownRehearsalPlan(root);assert.equal(new Set(p.ids).size,7);assert.equal(p.tasks.length,2);assert(p.tasks.every(t=>t.text.length<=2000));
 assert(!p.ids.includes('2GrJYm3r55QKF36pSMBhuZiYTtqXzRaNPbgS7XGsMAKQ'));assert.equal(p.limits.nativeTurns,2);assert.equal(p.limits.toolsPerTurn,12);
 const config=ownNativeArgs(root,'/private/workspace',[],{fixture:true});assert(config.some(x=>x.includes('agent-own-entry.mjs')&&x.includes('--native-limit=12')));
 assert(!config.some(x=>x.includes('agent-managed-entry.mjs')));
});
test('cleanup refuses to delete a replaced file even after an otherwise owned capture',async()=>{
 const {base,directory,c}=await setup();try{
  const p=ports();p.inventory=()=>{unlinkSync(c.keyFile);writeFileSync(c.keyFile,'unowned public sentinel',{mode:0o600});throw Error('SYNTHETIC_STOP');};
  const r=await runOwnRehearsal(directory,{fixture:true,ports:p});assert.equal(r.status,'STOPPED');assert.equal(r.keyAbsent,false);
  assert.equal(readFileSync(c.keyFile,'utf8'),'unowned public sentinel');assert.equal(r.cleanup.error,'REHEARSAL_CLEANUP_IDENTITY');
 }finally{rmSync(base,{recursive:true,force:true});}
});
test('native deadline kills an unresponsive local fake process without a second attempt',async()=>{
 const base=temporary();try{
  let starts=0;const summary=await nativeOwnTurn({root,state:base,task:{id:'deadline-check',text:'Offline local fixture.'},out:join(base,'native'),deadline:Date.now()+100,
   fixture:true,spawnNative:(_args,options)=>{starts++;return spawn(process.execPath,['-e','process.stdin.resume()'],options);}});
  assert.equal(summary.status,'STOPPED');assert.equal(summary.reason,'NATIVE_DEADLINE');assert.equal(starts,1);
 }finally{rmSync(base,{recursive:true,force:true});}
});
test('completed native text without the requested original CSV is retained as a stopped application outcome',async()=>{
 const {base,directory}=await setup();try{const r=await runOwnRehearsal(directory,{fixture:true,ports:ports('no-export')});
  assert.equal(r.status,'STOPPED');assert.equal(r.reason,'REHEARSAL_CSV_MISSING');assert.equal(r.turns.length,2);assert(r.turns.every(t=>t.status==='COMPLETED'));
  assert.equal(r.keyAbsent,true);assert.equal(r.reader,undefined);
 }finally{rmSync(base,{recursive:true,force:true});}
});
test('parent capture ownership cleans a key even when child source/lineage admission fails before its own ticket',async()=>{
 const {base,directory,c}=await setup();try{
  unlinkSync(c.keyFile);createOwnCaptureSpec(directory,c,'0'.repeat(24));captureOwnKey(directory,'t-'+'0'.repeat(24)+'-public-parent-sentinel');
  let called=0;const result=executeOwnRehearsal(directory,{runChild:()=>{called++;return {status:1};}});
  assert.equal(called,1);assert.equal(result.keyAbsent,true);assert.equal(result.status,'CHILD_STOPPED');assert.equal(result.cleanup.deleted,true);
 }finally{rmSync(base,{recursive:true,force:true});}
 const other=await setup();try{
  unlinkSync(other.c.keyFile);createOwnCaptureSpec(other.directory,other.c,'0'.repeat(24));captureOwnKey(other.directory,'t-'+'0'.repeat(24)+'-public-parent-sentinel');
  const grant=join(other.directory,'rehearsal-grant.json');unlinkSync(grant);
  const result=executeOwnRehearsal(other.directory,{runChild:()=>{throw Error('MUST_NOT_START');}});assert.equal(result.keyAbsent,true);assert.equal(result.childExitCode,null);
 }finally{rmSync(other.base,{recursive:true,force:true});}
 const replaced=await setup();try{
  unlinkSync(replaced.c.keyFile);createOwnCaptureSpec(replaced.directory,replaced.c,'0'.repeat(24));captureOwnKey(replaced.directory,'t-'+'0'.repeat(24)+'-public-parent-sentinel');
  const result=executeOwnRehearsal(replaced.directory,{runChild:()=>{unlinkSync(replaced.c.keyFile);writeFileSync(replaced.c.keyFile,'unowned replacement',{mode:0o600});return {status:1};}});
  assert.equal(result.status,'CLEANUP_STOPPED');assert.equal(result.keyAbsent,false);assert.equal(readFileSync(replaced.c.keyFile,'utf8'),'unowned replacement');
 }finally{rmSync(replaced.base,{recursive:true,force:true});}
});
test('clipboard cleanup runs on paste failure and a failed clear stops and deletes only the captured owned copy',async()=>{
 for(const failure of ['paste','clear','none']){const {base,directory,c}=await setup();try{
  unlinkSync(c.keyFile);createOwnCaptureSpec(directory,c,'0'.repeat(24));let clears=0;
  const action=()=>captureOwnClipboard(directory,{paste:()=>failure==='paste'?{status:1}:{status:0,stdout:'t-'+'0'.repeat(24)+'-public-clipboard-sentinel'},clear:()=>{clears++;return {status:failure==='clear'?1:0};}});
  if(failure==='paste')assert.throws(action,/OWN_CLIPBOARD_READ/);else if(failure==='clear')assert.throws(action,/OWN_CLIPBOARD_CLEAR_FAILED/);
  else{const r=action();assert.equal(r.clipboardCleared,true);assert.equal(r.keyPrinted,false);}
  assert.equal(clears,1);assert.equal(existsSync(c.keyFile),failure==='none');
 }finally{rmSync(base,{recursive:true,force:true});}}
});
