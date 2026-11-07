import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical} from '../src/domain.ts';
import {operationKey,runHash} from '../app/agent-run.mjs';
import {validateExperienceRows} from '../app/agent-experience.ts';
import {normalizeTransaction,report as computeReport,csv} from '../app/activity.ts';
import {verifyFactProof,transactionFact,NORMALIZER_SHA256} from '../app/agent-facts.ts';
import {ExecutedTransaction} from '../app/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/executed_transaction.mjs';
import {verifyRecordedSource} from './recorded-source.mjs';
const base=new URL('./own-account-completion-live-2026-11-07/',import.meta.url),read=n=>JSON.parse(readFileSync(new URL(n,base))),r=read('run.json'),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(r.status,'ACTUAL_COMPLETION_HARNESS_STOPPED_SECOND_NATIVE_DEADLINE');assert.equal(r.wholeHarnessPassed,false);assert.equal(r.ledger.manifestHash,runHash(r.manifest));
assert.deepEqual([r.ledger.tatumBatches,r.ledger.writes,r.ledger.reads,r.ledger.requests],[3,3,6,85]);assert.equal(r.ledger.stopped,'REHEARSAL_NATIVE_STOPPED');assert(r.ledger.intents.every(i=>i.state==='done'));assert.equal(r.ledger.intents.length,3);
assert.equal(r.nativeBudget.turns.length,2);assert.deepEqual(r.nativeBudget.turns.map(t=>t.status),['completed','stopped']);assert.equal(r.nativeSummary[1].reason,'NATIVE_DEADLINE');
assert.equal(r.firstNativeCompleted,true);assert.equal(r.secondNativeCompleted,false);assert.equal(r.finalDedicatedReaderRan,false);assert.equal(r.temporaryKeyAbsent,true);assert.equal(r.closedOriginsUnchanged,true);assert.equal(r.retries,0);assert.equal(r.additionalSpendUSD,0);
validateExperienceRows(r.allRecords,r.manifest.workspace);assert.equal(r.allRecords.length,10);assert.equal(new Set(r.allRecords.map(x=>x.blobId)).size,10);
assert.equal(r.candidateCompletedReceiptCount,10);assert.equal(Object.keys(r.allReceipts).length,10);
for(const row of r.allRecords){const receipt=r.allReceipts[row.id];assert.equal(row.id,operationKey(row.record));assert.equal(receipt.state,'done');assert.equal(receipt.sha256,runHash(row.record));assert.equal(receipt.blobId,row.blobId);}
const previous=JSON.parse(readFileSync(new URL('./own-account-partial-live-2026-11-07/run.json',import.meta.url))),previousRows=[...previous.originalRecords,...previous.actualNewRecords.map(({id,record,blobId})=>({id,record,blobId}))];assert.deepEqual(r.retainedRecords,previousRows);assert.equal(r.closedOriginSnapshots.length,5);
assert.deepEqual(r.closedOriginSnapshots[4].manifest,previous.manifest);assert.deepEqual(r.closedOriginSnapshots[4].ledger,previous.ledger);assert.deepEqual(r.closedOriginSnapshots[4].native,previous.nativeBudget);
for(const old of r.retainedRecords)assert(r.allRecords.some(row=>canonical(row)===canonical(old)));
const proofs=new Map();for(const file of readdirSync(new URL('tatum-proofs/',base))){const proof=read('tatum-proofs/'+file),hash=file.slice(0,-5);verifyFactProof(proof,hash);proofs.set(proof.digest,{proof,hash,tx:normalizeTransaction(ExecutedTransaction.fromJson(proof),proof.digest,'mainnet','tatum')});}
assert.equal(proofs.size,7);
for(const row of r.newRecords){const p=read('submission-proofs/'+row.id+'.json'),proof=proofs.get(row.record.digest),receipt=r.newReceipts[row.id];assert.deepEqual(p.record,row.record);assert.equal(p.sha256,runHash(row.record));assert.equal(p.key,row.id);
 const fact=transactionFact(r.manifest.workspace,proof.tx,{kind:'tatum',method:'sui.rpc.v2.LedgerService/BatchGetTransactions',hashScope:'protobuf-json-selected-transaction',rawTransactionSha256:proof.hash,normalizerSha256:NORMALIZER_SHA256},row.record.observedAt);assert.deepEqual(fact,row.record);assert.equal(receipt.sha256,p.sha256);
 assert(r.writePolicy.digests.includes(row.record.digest));assert(r.ledger.intents.some(i=>i.key===row.id&&i.sha256===p.sha256&&i.namespace===r.manifest.namespaces.experience));assert.equal(r.ledger.jobs[receipt.jobId].key,row.id);}
assert.equal(r.preparation.explicitOperatorAction,true);assert.equal(r.preparation.modelInitiatedSaving,false);assert.equal(r.preparation.candidateContentRecords,10);assert.equal(r.preparation.counters.writes,3);
assert.equal(r.preparation.observations.length,7);for(const obs of r.preparation.observations){const row=r.allRecords.find(x=>x.id===obs.id);assert.equal(obs.sha256,runHash(row.record));assert.equal(obs.blobId,row.blobId);assert.equal(obs.comparison,'same');}
const audits=[];for(const index of [0,1]){const t=read('native-'+index+'.json');assert(t.startup.some(e=>e.params.name==='recall_lab'&&e.params.status==='ready'));
 const completed=t.tools.filter(e=>e.event==='item/completed');assert.deepEqual(completed.map(e=>[e.item.tool,e.item.status]),[['prepare_report','completed'],['export_report','completed']]);
 const values=completed.map(e=>JSON.parse(e.item.result.content[0].text)),view=values[0],exp=values[1];assert.equal(view.dataProvenance.freshProviderRead,true);assert.equal(view.experienceStorage,'walrus');assert.equal(view.dataProvenance.walletHistoryComplete,false);
 for(const tx of view.transactionEvidence)assert.deepEqual(tx,proofs.get(tx.digest).tx);
 for(const current of [view,exp.report]){const computed=computeReport(current.transactionEvidence,current.wallet,[],current.asOf);for(const key of Object.keys(computed))assert.deepEqual(current[key],computed[key],key);
  for(const row of current.historicalObservations){assert(r.allRecords.some(x=>canonical({id:row.id,record:row.record,blobId:row.blobId})===canonical(x)));assert.equal(row.comparison,'same');assert.equal(row.replacesFreshData,false);}}
 assert.equal(csv(exp.report),exp.csv);const bytes=readFileSync(new URL('exports/'+exp.artifact.sha256+'.csv',base));assert.equal(sha(bytes),exp.artifact.sha256);assert.equal(bytes.length,exp.artifact.bytes);assert.equal(bytes.toString('utf8'),exp.csv);
 let answerFacts=false,delivered=false;if(index===0){assert.equal(t.summary.status,'COMPLETED');assert(t.finalAnswer);assert.equal(view.transactionEvidence.length,7);assert.equal(view.historicalObservations.length,7);
  for(let i=0;i<7;i++){const tx=view.transactionEvidence[i],section=t.finalAnswer.split((i+1)+'. `'+tx.digest+'`')[1]?.split('\n\n'+(i+2)+'. ')[0];assert(section,'CASE_SECTION');assert(section.includes(tx.status)&&section.includes(tx.gas.payer)&&section.includes(tx.gas.netCharge));assert(tx.movements.every(m=>section.includes(m.amount)||section.includes('+'+m.amount)));assert(section.includes('Uncertainty'));}
  assert(view.selectedTransactionCoverage.transactions[0].walletIsSender);assert(view.selectedTransactionCoverage.transactions.every(x=>!x.walletIsGasPayer&&!x.walletHasBalanceChange));assert(view.selectedTransactionCoverage.transactions.slice(1).every(x=>!x.walletIsSender));
  assert(t.finalAnswer.includes(exp.artifact.path)&&t.finalAnswer.includes(exp.artifact.sha256));assert(t.finalAnswer.includes('не полный wallet history'));answerFacts=true;delivered=true;
 }else{assert.equal(t.summary.status,'STOPPED');assert.equal(t.finalAnswer,null);assert.equal(view.transactionEvidence.length,1);assert.equal(view.historicalObservations.length,1);}
 audits.push({index,nativeCompleted:index===0,completedTools:2,freshTatum:true,historicalObservations:view.historicalObservations.length,originalCsvBytes:exp.artifact.bytes,originalCsvHash:exp.artifact.sha256,fullAnswerFactsChecked:answerFacts,finalCsvDelivered:delivered});}
assert.notEqual(r.nativeSummary[0].thread,r.nativeSummary[1].thread);
const source=verifyRecordedSource({sourceCommit:r.sourceCommit,productAndHarnessSha256:r.sourceHashes});
console.log(JSON.stringify({status:r.status,wholeHarnessPassed:false,source,actualCompletedReceipts:10,primaryCompletedNativeReportAndOriginalCsv:true,nativeAudit:audits,independentNativeMcpStartupAndCompleteReadEnforced:true,dedicatedFinalReaderRan:false,counts:'Tatum3/write3/read6/SDK85',additionalSpendUSD:0}));
