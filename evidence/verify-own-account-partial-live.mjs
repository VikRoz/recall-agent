import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {runHash,operationKey} from '../app/agent-run.mjs';
import {canonical} from '../src/domain.ts';
import {normalizeTransaction} from '../app/activity.ts';
import {validateExperienceRows} from '../app/agent-experience.ts';
import {transactionFact,verifyFactProof,NORMALIZER_SHA256} from '../app/agent-facts.ts';
import {ExecutedTransaction} from '../app/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/executed_transaction.mjs';
import {verifyRecordedSource} from './recorded-source.mjs';
const base=new URL('./own-account-partial-live-2026-11-07/',import.meta.url),read=n=>JSON.parse(readFileSync(new URL(n,base))),r=read('run.json'),search=read('payload-reconstruction.json');
assert.equal(r.status,'ACTUAL_REHEARSAL_PARTIAL_NATIVE_DEADLINE');assert.equal(r.ledger.manifestHash,runHash(r.manifest));
assert.deepEqual([r.ledger.tatumBatches,r.ledger.writes,r.ledger.reads,r.ledger.requests],[1,4,5,45]);assert.equal(r.ledger.intents.length,4);assert(r.ledger.intents.every(i=>i.state==='done'));
assert.equal(r.nativeBudget.turns.length,1);assert.equal(r.nativeBudget.turns[0].status,'stopped');assert.equal(r.nativeSummary[0].reason,'NATIVE_DEADLINE');
assert.equal(r.secondNativeStarted,false);assert.equal(r.finalIndependentReaderRan,false);assert.equal(r.toolCompleted,false);assert.equal(r.csvDelivered,false);
assert.equal(r.temporaryKeyAbsent,true);assert.equal(r.closedOriginsUnchanged,true);assert.equal(r.retries,0);assert.equal(r.additionalSpendUSD,0);
const proofs=new Map();for(const file of readdirSync(new URL('tatum-proofs/',base))){const hash=file.slice(0,-5),proof=read('tatum-proofs/'+file);verifyFactProof(proof,hash);proofs.set(hash,proof);}
assert.equal(proofs.size,7);assert.equal(new Set([...proofs.values()].map(p=>p.digest)).size,7);
assert.equal(search.normalizerSha256,NORMALIZER_SHA256);assert.equal(search.signedReadback,false);assert.equal(search.window.maxCandidatesPerDigest,120000);
assert.equal(search.window.actualCandidatesPerDigest,Date.parse(search.window.end)-Date.parse(search.window.start)+1);assert(search.window.actualCandidatesPerDigest<=120000);
assert.equal(search.counts.length,7);assert.equal(search.counts.reduce((n,c)=>n+c.matches,0),4);assert(search.counts.every(c=>c.matches<=1&&c.candidates===search.window.actualCandidatesPerDigest));
assert.equal(r.actualNewRecords.length,4);assert.equal(Object.keys(r.actualNewReceipts).length,4);
for(const row of r.actualNewRecords){
 const p=proofs.get(row.proofSha256),tx=normalizeTransaction(ExecutedTransaction.fromJson(p),p.digest,'mainnet','tatum');
 const fact=transactionFact(r.manifest.workspace,tx,{kind:'tatum',method:'sui.rpc.v2.LedgerService/BatchGetTransactions',hashScope:'protobuf-json-selected-transaction',rawTransactionSha256:row.proofSha256,normalizerSha256:NORMALIZER_SHA256},row.record.observedAt);
 assert.deepEqual(fact,row.record);assert.equal(row.id,operationKey(fact));assert.equal(row.receipt.sha256,runHash(fact));assert.equal(row.receipt.state,'done');assert.equal(row.receipt.blobId,row.blobId);
 assert.deepEqual(row.receipt,r.actualNewReceipts[row.id]);assert(r.ledger.intents.some(i=>i.key===row.id&&i.sha256===row.receipt.sha256&&i.namespace===r.manifest.namespaces.experience));
 assert.equal(r.ledger.jobs[row.receipt.jobId].key,row.id);assert.equal(row.payloadProof,'reconstructed-by-exact-receipt-hash');assert.equal(row.signedReadback,'pending-not-performed-by-this-review');
 assert(Date.parse(row.record.observedAt)>=Date.parse(search.window.start)&&Date.parse(row.record.observedAt)<=Date.parse(search.window.end));
}
const old=JSON.parse(readFileSync(new URL('./own-account-live-2026-11-07/run.json',import.meta.url)));assert.equal(r.originalRecords.length,3);assert.equal(r.closedOriginHashes.length,4);
assert.equal(r.closedOriginHashes[3].manifest,runHash(old.manifest));assert.equal(r.closedOriginHashes[3].ledger,runHash(old.ledger));assert.equal(r.closedOriginHashes[3].native,runHash(old.nativeBudget));
const rows=[...r.originalRecords,...r.actualNewRecords.map(({id,record,blobId})=>({id,record,blobId}))];validateExperienceRows(rows,r.manifest.workspace);assert.equal(rows.length,7);
assert.equal(r.candidateCompletedReceiptCount,7);assert.equal(r.candidateSignedReadbackCount,'not-independently-recounted-after-this-attempt');
assert.equal(read('tools.json').tools[0].status,'inProgress-at-process-deadline');assert.equal(read('tools.json').tools[0].result,null);
const source=verifyRecordedSource({sourceCommit:r.sourceCommit,productAndHarnessSha256:r.sourceHashes});
console.log(JSON.stringify({status:r.status,source,actualDoneReceipts:7,exactPayloadProofs:4,newIndependentContentReadback:false,secondNative:false,counts:'Tatum1/write4/read5/SDK45',additionalSpendUSD:0}));
