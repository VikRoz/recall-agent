// Stage 3 synthetic reply conditions only. This is not a real-provider entry.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {StdioServerTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import {assert} from '../src/domain.ts';
import {ordinaryAuthorization,openInjectedOrdinary} from './agent-ordinary.mjs';
import {fixtureSdk,fixtureTransport} from './agent-provider-fixture.mjs';
import {syntheticTatum,SYNTHETIC_TATUM_KEY} from './agent-ordinary-fixture.mjs';
import {fixtureTransaction} from './activity-fixtures.ts';
const plan=JSON.parse(readFileSync(new URL('../evidence/candidate-evaluation-2026-11-07/plan.json',import.meta.url),'utf8'));
export function evaluationTransaction(index,variant='base'){
 assert(['base','changed-payer'].includes(variant),'EVALUATION_FIXTURE_VARIANT');
 const raw=fixtureTransaction(index),payer=variant==='changed-payer'?plan.offlineFixture.changedPayer:plan.offlineFixture.payer;
 raw.transaction.gasPayment.owner=payer;
 // Sender's transfer balance excludes gas paid by a different fixture address.
 raw.balanceChanges[0].amount=String(BigInt(raw.balanceChanges[0].amount)+1050n);
 raw.balanceChanges.push({address:payer,coinType:raw.balanceChanges[0].coinType,amount:'-1050'});
 return raw;
}
export async function openEvaluationFixture(directory,variant='base'){
 const {manifest}=ordinaryAuthorization(directory);
 return openInjectedOrdinary(directory,{createSdk:fixtureSdk,transport:fixtureTransport(directory,{manifest}),
  createData:syntheticTatum(directory,{transactionReply:index=>evaluationTransaction(index,variant)}),
  tatumKey:SYNTHETIC_TATUM_KEY,wait:async()=>{}});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let runtime;
 try{
  const [mode,directory,variant='base',...rest]=process.argv.slice(2);
  assert(mode==='--mcp'&&directory&&!rest.length,'EVALUATION_OFFLINE_ONLY');
  globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_DENIED');};runtime=await openEvaluationFixture(directory,variant);
  let closing=false;const close=()=>{if(closing)return;closing=true;runtime.close();runtime.server.close().finally(()=>process.exit(0));};
  process.stdin.once('end',close);process.once('SIGTERM',close);process.once('SIGINT',close);
  await runtime.server.connect(runtime.observe(new StdioServerTransport()));
 }catch{runtime?.close();console.error('EVALUATION_FIXTURE_STOPPED');process.exitCode=1;}
}
