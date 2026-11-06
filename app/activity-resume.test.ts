import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectContinuation, renewContinuation } from './activity-resume.ts';
import { tatumKeyHash, validateApproval } from './activity-live.ts';
import { canonical } from '../src/domain.ts';
import { offlinePilotEnvelope } from './activity-pilot-fixture.ts';
import { writePilotFile, readPilotFile } from './activity-pilot.ts';
import { latestStartupCode, saveStartupFailure } from './activity-diagnostic.mjs';
globalThis.fetch = () => { throw Error('OFFLINE_NETWORK_DENIED'); };
function fixture() {
  const run = '/private/tmp/recall-activity-live.' + randomUUID().slice(0,8);
  mkdirSync(run, {mode:0o700}); mkdirSync(join(run,'profile'),{mode:0o700});mkdirSync(join(run,'activity-jobs'),{mode:0o700});
  const e = offlinePilotEnvelope(), key = 't-' + e.approval.tatum.accountId + '-offline-placeholder';
  const approval = {...e.approval, checkedAt:new Date(Date.now()-600000).toISOString(),
    tatum:{...e.approval.tatum,keySha256:tatumKeyHash(key)}};
  const config = {schema:1,mode:'live-providers',plan:e.plan,approval,keyFile:join(run,'tatum.key')};
  writePilotFile(run,'activity-config.json',config);
  writeFileSync(join(run,'tatum.key'),key,{mode:0o600});
  writeFileSync(join(run,'profile/credentials.json'),JSON.stringify({version:1,relayerUrl:'https://relayer.memory.walrus.xyz',
    label:'Recall Lab isolated check',accountId:e.plan.accountId,walletAddress:e.plan.owner,
    packageId:e.plan.accountId,delegateAddress:'0x'+'d'.repeat(64),delegatePrivateKey:'a'.repeat(64),delegatePublicKeyHex:'b'.repeat(64)}),{mode:0o600});
  const budget={planHash:approval.planHash,stopped:null,tatumBatches:1,writes:1,reads:0,requests:17,jobs:{'offline-job':4}};
  writePilotFile(run,'activity-budget.json',budget);
  const receipt={state:'done',blobId:createHash('sha256').update('offline-record').digest('base64url'),sha256:'c'.repeat(64),jobId:'offline-job'};
  const journal=join(run,'activity-jobs','q'.repeat(43)+'.json');writeFileSync(journal,canonical(receipt),{mode:0o600});
  return {run,config,key,budget,journal,receipt};
}
test('continuation renews only billing evidence and preserves the exact plan, budget and receipt bytes',()=>{
  const f=fixture();
  try{
    assert.throws(()=>validateApproval(f.config.plan,f.config.approval),/BILLING_CHECK_EXPIRED/);
    const budget=readFileSync(join(f.run,'activity-budget.json'),'utf8'),journal=readFileSync(f.journal,'utf8');
    const before=inspectContinuation(f.run);assert.equal(before.proofs[0].blobId,f.receipt.blobId);
    const result=renewContinuation(f.run,'99,974');
    assert.deepEqual(result.remaining,{tatumReads:1,writes:1,contentReads:2});
    const updated=readPilotFile(f.run,'activity-config.json');validateApproval(updated.plan,updated.approval);
    assert.deepEqual(updated.plan,f.config.plan);assert.equal(updated.approval.tatum.keySha256,f.config.approval.tatum.keySha256);
    assert.equal(updated.approval.tatum.remainingCredits,99974);
    assert.equal(readFileSync(join(f.run,'activity-budget.json'),'utf8'),budget);
    assert.equal(readFileSync(f.journal,'utf8'),journal);
    assert.deepEqual(readPilotFile(f.run,'activity-config-before-continue.json'),f.config);
    assert.equal(JSON.stringify(readPilotFile(f.run,'activity-continue.json')).includes(f.key),false);
    assert.throws(()=>renewContinuation(f.run,'99,974'),/CONTINUE_ALREADY_ATTEMPTED/);
  }finally{rmSync(f.run,{recursive:true,force:true});}
});
test('continuation rejects a changed key and insufficient allowance without changing the original configuration',()=>{
  for(const scenario of ['key','credits']){
    const f=fixture();
    try{
      const original=readFileSync(join(f.run,'activity-config.json'),'utf8');
      if(scenario==='key')writeFileSync(join(f.run,'tatum.key'),f.key+'x');
      assert.throws(()=>renewContinuation(f.run,scenario==='credits'?'3':'99,974'),
        scenario==='key'?/TATUM_KEY_BINDING/:/TATUM_FREE_ALLOWANCE/);
      assert.equal(readFileSync(join(f.run,'activity-config.json'),'utf8'),original);
      assert.equal(existsSync(join(f.run,'activity-continue.json')),false);
    }finally{rmSync(f.run,{recursive:true,force:true});}
  }
});
test('continuation refuses stopped, consumed or uncertain runs instead of resetting their state',()=>{
  for(const scenario of ['stopped','consumed','uncertain','wrong-job']){
    const f=fixture();
    try{
      const budget={...f.budget};
      if(scenario==='stopped')budget.stopped='TATUM_ERROR' as any;
      if(scenario==='consumed')budget.tatumBatches=2;
      if(scenario==='wrong-job')budget.jobs={'different-job':4} as any;
      if(scenario==='uncertain')writeFileSync(f.journal,canonical({...f.receipt,state:'accepted'}));
      writePilotFile(f.run,'activity-budget.json',budget,true);
      assert.throws(()=>inspectContinuation(f.run),/CONTINUE_STAGE|WRITE_OUTCOME_UNCERTAIN|CONTINUE_RECEIPT/);
      assert.deepEqual(readPilotFile(f.run,'activity-budget.json'),budget);
    }finally{rmSync(f.run,{recursive:true,force:true});}
  }
});
test('startup diagnostics retain an expired-admission code without provider calls or budget changes',()=>{
  const f=fixture();
  try{
    const before=readFileSync(join(f.run,'activity-budget.json'),'utf8'),started=Date.now();
    const output=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning',fileURLToPath(new URL('./activity-mcp.mjs',import.meta.url)),'--live',f.run],{encoding:'utf8',timeout:15000});
    assert.equal(output.status,1);assert.ok(output.stderr.includes('BILLING_CHECK_EXPIRED'));
    assert.equal(latestStartupCode(f.run,started),'BILLING_CHECK_EXPIRED');
    assert.equal(readFileSync(join(f.run,'activity-budget.json'),'utf8'),before);
    assert.equal((output.stdout+output.stderr).includes(f.key),false);
    saveStartupFailure(f.run,new Error('do-not-log-this-secret'));
    for(const name of readdirSync(f.run).filter(n=>n.startsWith('activity-start-'))){
      assert.equal(readFileSync(join(f.run,name),'utf8').includes('do-not-log-this-secret'),false);
    }
  }finally{rmSync(f.run,{recursive:true,force:true});}
});
