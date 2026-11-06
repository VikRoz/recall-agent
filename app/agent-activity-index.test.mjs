import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {OfflineActivityIndex,loadOfflineActivity} from './agent-activity-index.ts';
import {offlineAgent} from './agent-mcp.mjs';
import {FIXTURE_WALLET,FIXTURE_OTHER,FIXTURE_DIGESTS,fixtureTransaction} from './activity-fixtures.ts';
import {normalizeTransaction} from './activity.ts';
import {Client} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=()=>mkdtempSync(join(tmpdir(),'recall-wallet-index-'));
const query={network:'mainnet',wallet:FIXTURE_WALLET};
function syntheticRows(){return FIXTURE_DIGESTS.map((id,i)=>normalizeTransaction(fixtureTransaction(i),id,'mainnet','fixture'));}

test('wallet discovery includes sender, gas-only payer and movement-only address without inferring ownership',()=>{
 const rows=syntheticRows();rows[0].gas.payer='0x'+'c'.padStart(64,'0');
 const index=new OfflineActivityIndex(rows,'fixture');
 assert.equal(index.find(query).transactions.length,3);
 const moved=index.find({...query,wallet:FIXTURE_OTHER});
 assert.ok(moved.transactions.every(t=>t.observedRoles.join(',')==='balance-change'));
 assert.equal(index.find({...query,wallet:'0xc'}).transactions.length,1);
 assert.equal(index.find({...query,wallet:'0xc'}).transactions[0].observedRoles.join(','),'gas-payer');
 assert.equal(moved.coverage.walletHistoryComplete,false);
 assert.equal(moved.coverage.freshProviderRead,false);
});

test('period is start-inclusive/end-exclusive and invalid bounds fail before a report or write',()=>{
 const rows=syntheticRows();rows[0].timestamp='2026-11-04T00:00:00.000Z';rows[1].timestamp='2026-11-05T00:00:00.000Z';rows[2].timestamp='2026-11-06T00:00:00.000Z';
 const index=new OfflineActivityIndex(rows,'fixture');
 assert.deepEqual(index.find({...query,from:rows[1].timestamp,to:rows[2].timestamp}).transactions.map(t=>t.digest),[rows[1].digest]);
 assert.throws(()=>index.find({...query,from:rows[1].timestamp,to:rows[1].timestamp}),/QUERY_RANGE/);
 assert.throws(()=>index.find({...query,from:'yesterday'}),/QUERY_TIME/);
 assert.throws(()=>index.find({...query,limit:11}),/QUERY_LIMIT/);
 assert.throws(()=>index.find({...query,network:'unknown'}),/QUERY_NETWORK/);
});

test('paging binds dataset, wallet, network, period and page size, without implying complete history',()=>{
 const index=new OfflineActivityIndex(syntheticRows(),'fixture');
 const first=index.find({...query,limit:1});
 assert.equal(first.transactions.length,1);assert.equal(first.coverage.hasMore,true);
 const second=index.find({...query,limit:1,cursor:first.nextCursor});
 assert.notEqual(first.transactions[0].digest,second.transactions[0].digest);
 const third=index.find({...query,limit:1,cursor:second.nextCursor});
 assert.equal(third.nextCursor,null);assert.equal(third.coverage.walletHistoryComplete,false);
 for(const changed of [{wallet:FIXTURE_OTHER},{network:'testnet'},{limit:2},{from:'2026-01-01T00:00:00.000Z'}])
  assert.throws(()=>index.find({...query,limit:1,...changed,cursor:first.nextCursor}),/QUERY_CURSOR/);
 const changedRows=syntheticRows();changedRows[0].timestamp='2026-01-01T00:00:00.000Z';
 assert.throws(()=>new OfflineActivityIndex(changedRows,'fixture').find({...query,limit:1,cursor:first.nextCursor}),/QUERY_CURSOR/);
 assert.throws(()=>index.find({...query,limit:1,cursor:'999.'+'a'.repeat(64)}),/QUERY_CURSOR/);
});

test('empty and partial results do not assert inactivity; index is immutable',async()=>{
 const rows=syntheticRows(),index=new OfflineActivityIndex(rows,'fixture');
 rows[0].sender=FIXTURE_OTHER;
 const found=index.find(query);found.transactions.length=0;
 assert.equal(index.find(query).transactions.length,3);
 const out=await index.transactions('mainnet',[FIXTURE_DIGESTS[0]]);out[0].sender=FIXTURE_OTHER;
 assert.equal((await index.transactions('mainnet',[FIXTURE_DIGESTS[0]]))[0].sender,FIXTURE_WALLET);
 for(const extra of [{wallet:'0xf'},{from:'2030-01-01T00:00:00.000Z'},{network:'testnet'}]){
  const empty=index.find({...query,...extra});assert.equal(empty.transactions.length,0);
  assert.equal(empty.coverage.walletHistoryComplete,false);assert.equal(empty.coverage.missingHistory,'unknown');
 }
 assert.throws(()=>new OfflineActivityIndex([...syntheticRows(),syntheticRows()[0]],'fixture'),/DUPLICATE/);
});

test('saved Mainnet snapshots are hash-pinned and always replay, including report and CSV',async()=>{
 const index=loadOfflineActivity('saved'),example=index.examples();
 assert.equal(example.availableRecords,2);assert.equal(example.sourceMode,'saved-mainnet-replay');
 const q={network:'mainnet',wallet:example.senders[0],from:'2026-11-05T00:00:00.000Z',to:'2026-11-06T00:00:00.000Z'};
 const found=index.find(q);assert.equal(found.transactions.length,2);assert.ok(found.transactions.every(t=>t.source==='replay'));
 assert.equal(index.find({...q,network:'testnet'}).transactions.length,0);
 assert.throws(()=>loadOfflineActivity('saved',Buffer.from('{}')),/SNAPSHOT_HASH/);
 const d=dir();try{
  const {session}=offlineAgent(d,false,'saved');
  const report=await session.prepare(q.network,q.wallet,[found.transactions[0].digest]);
  assert.equal(report.dataProvenance.sourceMode,'saved-mainnet-replay');assert.equal(report.dataProvenance.freshProviderRead,false);
  assert.equal(report.transactionEvidence[0].source,'replay');
  assert.ok((await session.export(report.reportId)).csv.includes('"replay"'));
  assert.deepEqual(await session.experience.read(),[]);
 }finally{rmSync(d,{recursive:true,force:true});}
});

test('workspace rejects dataset changes and lookup errors recover without manufacturing experience',async()=>{
 const d=dir();try{
  const {session}=offlineAgent(d,false);
  const before=readFileSync(join(d,'agent-workspace.json'),'utf8');
  assert.throws(()=>offlineAgent(d,false,'saved'),/DATASET_MISMATCH/);
  assert.equal(readFileSync(join(d,'agent-workspace.json'),'utf8'),before);
  await assert.rejects(session.findActivity({...query,from:'tomorrow'}),/QUERY_TIME/);
  assert.equal((await session.findActivity(query)).transactions.length,3);
  await assert.rejects(session.prepare('mainnet',FIXTURE_WALLET,['11111111111111111111111111111111']),/OFFLINE_TRANSACTION_NOT_FOUND/);
  assert.equal(session.stopped,false);assert.equal(session.reports.size,0);
  assert.deepEqual(await session.experience.read(),[]);
 }finally{rmSync(d,{recursive:true,force:true});}
});

test('MCP launch finds saved operations without digests, preserves pagination across processes and exports without a forced save',async()=>{
 const d=dir();let client;
 async function open(){client=new Client({name:'wallet-query-test',version:'1'});const t=new StdioClientTransport({command:'/bin/bash',args:[join(root,'start.command'),'--mcp',d,'--saved']});await client.connect(t);return t.pid;}
 async function call(name,args){const r=await client.callTool({name,arguments:args});assert.equal(Boolean(r.isError),false,r.content[0]?.text);return JSON.parse(r.content[0].text);}
 try{
  const example=loadOfflineActivity('saved').examples();const q={network:'mainnet',wallet:example.senders[0],limit:1};
  const pid=await open();const tools=await client.listTools();assert.equal(tools.tools.find(t=>t.name==='find_wallet_activity').annotations.readOnlyHint,true);
  const first=await call('find_wallet_activity',q);assert.equal(first.coverage.hasMore,true);
  await client.close();assert.notEqual(await open(),pid);
  const second=await call('find_wallet_activity',{...q,cursor:first.nextCursor});
  assert.notEqual(second.transactions[0].digest,first.transactions[0].digest);
  assert.equal(second.coverage.walletHistoryComplete,false);
  const r=await call('prepare_report',{network:q.network,wallet:q.wallet,transactions:[second.transactions[0].digest]});
  assert.equal(r.mode,'offline-agent-replay');assert.equal(r.transactionEvidence[0].source,'replay');
  const exported=await call('export_report',{reportId:r.reportId});assert.ok(exported.csv.includes('"replay"'));
  const empty=await call('find_wallet_activity',{...q,from:'2030-01-01T00:00:00.000Z'});
  assert.equal(empty.transactions.length,0);assert.equal(empty.coverage.walletHistoryComplete,false);
 }finally{await client?.close();rmSync(d,{recursive:true,force:true});}
});
