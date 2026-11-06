import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemWal } from '@mysten-incubation/memwal';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { normalizeTransaction, report, csv, address, transactionId, newRule, validateRules, SUI } from './activity.ts';
import { FixtureActivityData, fixtureTransaction, FIXTURE_DIGESTS, FIXTURE_WALLET, FIXTURE_OTHER } from './activity-fixtures.ts';
import { FixtureRuleStore } from './activity-fixture-store.ts';
import { ActivitySession } from './activity-session.ts';
import { WalrusRuleStore, readRules } from './activity-memory.ts';
import { TatumData } from './tatum.ts';

globalThis.fetch = () => { throw Error('OFFLINE_NETWORK_DENIED'); };
const binding = { owner: FIXTURE_WALLET, project: 'recall-activity-fixture' };
const now = '2026-11-05T12:00:00.000Z';
const past = '2026-01-01T00:00:00.000Z';
function createRule(relation: 'self' | 'external' | 'unknown' = 'self', parent: string | null = null,
  recordedAt = now, effectiveFrom = past) {
  return newRule(binding, 'mainnet', FIXTURE_WALLET, FIXTURE_OTHER, relation, 'Second wallet', recordedAt, effectiveFrom, parent);
}
function directory() { return mkdtempSync(join(tmpdir(), 'recall-activity-test-')); }

test('Tatum transaction batches serialize and decode with the installed native Sui SDK', async () => {
  const client = new SuiGrpcClient({ network: 'mainnet', baseUrl: 'https://sui-mainnet-grpc.gateway.tatum.io' });
  const method = client.ledgerService.methods.find(m => m.localName === 'batchGetTransactions')!;
  assert.ok(method);
  const data = new TatumData({ ledgerService: { batchGetTransactions: async (request: any) => {
    const bytes = method.I.toBinary(request);
    assert.deepEqual(method.I.fromBinary(bytes).digests, FIXTURE_DIGESTS.slice(0, 2));
    assert.ok(request.readMask.paths.includes('balance_changes'));
    const jsonRows = [0, 1].reverse().map(index => {
      const raw = fixtureTransaction(index);
      raw.timestamp = '2026-11-05T00:00:00Z';
      raw.transaction.kind = { programmableTransaction: { commands: [{ transferObjects: { objects: [] } }] } };
      return { transaction: raw };
    });
    const response = method.O.fromBinary(method.O.toBinary(method.O.fromJson({ transactions: jsonRows })));
    return { response };
  } } }, 'mainnet');
  const rows = await data.transactions(FIXTURE_DIGESTS.slice(0, 2));
  assert.deepEqual(rows.map(r => r.digest), FIXTURE_DIGESTS.slice(0, 2));
  assert.equal(rows[0].gas.netCharge, '1050');
  assert.equal(rows[0].interpretation, 'transfer-commands');
});

test('batch failures and duplicate digests produce no partial report', async () => {
  const id = FIXTURE_DIGESTS[0];
  const data = new TatumData({ ledgerService: { batchGetTransactions: async () => ({
    response: { transactions: [{ result: { oneofKind: 'error', error: {} } }] },
  }) } }, 'mainnet');
  await assert.rejects(data.transactions([id]), /TRANSACTION_UNAVAILABLE/);
  await assert.rejects(data.transactions([id, id]), /DUPLICATE_TRANSACTION/);
  data.close();
  await assert.rejects(data.transactions([id]), /TRANSACTION_LIST_LIMIT/);
});

test('transaction normalization preserves signed precision and never adds gas twice', () => {
  const raw = fixtureTransaction();
  const large = '90071992547409931234567890';
  raw.balanceChanges[0].amount = '-' + large;
  const tx = normalizeTransaction(raw, raw.digest, 'mainnet', 'fixture');
  const result = report([tx], FIXTURE_WALLET, [], now);
  assert.equal(result.totals[0].netAmountBaseUnits, '-' + large);
  assert.equal(result.gas[0].netCharge, '1050');
  assert.equal(result.rows[1].relation, 'unclassified');
  assert.equal(tx.source, 'fixture');
});

test('sponsored failed transaction and rebate are separate from subject wallet movement', () => {
  const raw = fixtureTransaction();
  raw.effects.status.success = false;
  raw.transaction.gasPayment.owner = address('0xc');
  raw.effects.gasUsed.storageRebate = '2000';
  const tx = normalizeTransaction(raw, raw.digest, 'mainnet');
  assert.equal(tx.status, 'failed');
  assert.equal(tx.gas.payer, address('0xc'));
  assert.equal(tx.gas.netCharge, '-900');
  const result = report([tx], FIXTURE_WALLET, [], now);
  assert.equal(result.totals[0].netAmountBaseUnits, raw.balanceChanges[0].amount);
});

test('Move calls remain unparsed and unknown coin types are reported in base units', () => {
  const raw = fixtureTransaction();
  raw.transaction.kind.data.programmableTransaction.commands = [{ command: { oneofKind: 'moveCall' } }];
  raw.balanceChanges[0].coinType = '0x8::token::USD';
  raw.balanceChanges[1].coinType = '0x9::token::USD';
  const tx = normalizeTransaction(raw, raw.digest, 'mainnet');
  assert.equal(tx.interpretation, 'unparsed-ptb');
  assert.notEqual(tx.movements[0].coinType, tx.movements[1].coinType);
  assert.equal(report([tx], FIXTURE_WALLET, [], now).totals[0].netAmountBaseUnits, raw.balanceChanges[0].amount);
});

test('normalization rejects missing facts, mismatches, and invalid amounts', () => {
  for (const mutate of [
    (r: any) => { r.digest = FIXTURE_DIGESTS[1]; },
    (r: any) => { delete r.effects.status.success; },
    (r: any) => { delete r.effects.gasUsed; },
    (r: any) => { r.balanceChanges[0].amount = 1; },
    (r: any) => { r.balanceChanges[0].amount = '-0'; },
    (r: any) => { delete r.balanceChanges; },
    (r: any) => { r.timestamp.nanos = -1; },
  ]) {
    const raw = fixtureTransaction();
    mutate(raw);
    assert.throws(() => normalizeTransaction(raw, FIXTURE_DIGESTS[0], 'mainnet'));
  }
});

test('explorer links yield only validated digests and never trigger a fetch', () => {
  assert.equal(transactionId('https://suiscan.xyz/mainnet/tx/' + FIXTURE_DIGESTS[0]), FIXTURE_DIGESTS[0]);
  assert.throws(() => transactionId('https://127.0.0.1/tx/' + FIXTURE_DIGESTS[0]), /UNSUPPORTED/);
  assert.throws(() => transactionId('https://suiscan.xyz/tx/' + FIXTURE_DIGESTS[0] + '?key=secret'), /UNSUPPORTED/);
});

test('rule chains preserve the old classification before a new rule takes effect', () => {
  const first = createRule();
  const second = createRule('external', first.id, '2026-11-06T12:00:00.000Z', '2026-11-06T00:00:00.000Z');
  const rows = validateRules([{ record: first, blobId: 'one' }, { record: second, blobId: 'two' }], binding);
  const tx = normalizeTransaction(fixtureTransaction(), FIXTURE_DIGESTS[0], 'mainnet', 'fixture');
  tx.timestamp = '2026-11-05T12:00:00.000Z';
  const before = report([tx], FIXTURE_WALLET, rows, '2026-11-07T00:00:00.000Z');
  assert.equal(before.rows[1].relation, 'self');
  tx.timestamp = '2026-11-06T15:00:00.000Z';
  assert.equal(report([tx], FIXTURE_WALLET, rows, '2026-11-07T00:00:00.000Z').rows[1].relation, 'external');
});

test('forked, unrelated, or cross-owner rules are rejected', () => {
  const first = createRule();
  const second = createRule('external', first.id, '2026-11-06T12:00:00.000Z');
  const fork = createRule('unknown', first.id, '2026-11-07T12:00:00.000Z');
  assert.throws(() => validateRules([first, second, fork].map(record => ({ record, blobId: record.id })), binding), /RULE_FORK/);
  assert.throws(() => validateRules([{ record: { ...first, owner: address('0xc') }, blobId: 'x' }], binding), /BINDING/);
  assert.throws(() => validateRules([{ record: second, blobId: 'x' }], binding), /INVALID_RULE_CHAIN/);
});

test('CSV escapes user formulas and quotes while preserving report amounts', () => {
  const record = { ...createRule(), label: '=IMPORTDATA("https://example.com")' };
  const tx = normalizeTransaction(fixtureTransaction(), FIXTURE_DIGESTS[0], 'mainnet');
  const out = csv(report([tx], FIXTURE_WALLET, [{ record, blobId: 'one' }], now));
  assert.ok(out.includes("'=IMPORTDATA"));
  assert.ok(out.includes('""https://example.com""'));
  assert.ok(out.includes('"-10000001050"'));
});

test('fresh session retrieves memory, changes declared-wallet totals, and applies correction', async () => {
  const dir = directory();
  try {
    let clock = now;
    const store = new FixtureRuleStore(dir, binding);
    const first = new ActivitySession(binding, store, n => new FixtureActivityData(n), () => clock);
    const baseline = await first.prepare('mainnet', FIXTURE_WALLET, [FIXTURE_DIGESTS[0]]);
    assert.equal(baseline.declaredWalletTotals[0].netAmountBaseUnits, '-10000001050');
    const proposal = await first.propose(baseline.reportId, FIXTURE_OTHER, 'self', 'My other wallet', past, null);
    const receipt = await first.save(proposal.proposalId);
    assert.deepEqual(await first.save(proposal.proposalId), receipt);
    const second = new ActivitySession(binding, new FixtureRuleStore(dir, binding), n => new FixtureActivityData(n), () => clock);
    const recalled = await second.prepare('mainnet', FIXTURE_WALLET, [FIXTURE_DIGESTS[1]]);
    assert.equal(recalled.declaredWalletTotals[0].netAmountBaseUnits, '-1050');
    assert.equal(recalled.rows[1].memoryBlobId, receipt.blobId);
    clock = '2026-11-06T12:00:00.000Z';
    const repair = await second.propose(recalled.reportId, FIXTURE_OTHER, 'external', 'External account', past, proposal.preview.id);
    await second.save(repair.proposalId);
    const corrected = await second.refresh(recalled.reportId);
    assert.equal(corrected.declaredWalletTotals[0].netAmountBaseUnits, '-11000001050');
    assert.equal(corrected.rows[1].ruleId, repair.preview.id);
    const exported = await second.export(recalled.reportId);
    assert.ok(exported.csv.includes('External account'));
    assert.equal((await store.inventory()).blobIds.length, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('stale preview and unrelated addresses cannot be saved', async () => {
  const dir = directory();
  try {
    const store = new FixtureRuleStore(dir, binding);
    const session = new ActivitySession(binding, store, n => new FixtureActivityData(n), () => now);
    const prepared = await session.prepare('mainnet', FIXTURE_WALLET, [FIXTURE_DIGESTS[0]]);
    await assert.rejects(session.propose(prepared.reportId, address('0xc'), 'self', 'x', past, null), /NOT_OBSERVED/);
    const one = await session.propose(prepared.reportId, FIXTURE_OTHER, 'self', 'x', past, null);
    const two = await session.propose(prepared.reportId, FIXTURE_OTHER, 'external', 'y', past, null);
    await session.save(one.proposalId);
    await assert.rejects(session.save(two.proposalId), /PROPOSAL_STALE/);
    const data = JSON.parse(readFileSync(join(dir, 'activity-memory.json'), 'utf8'));
    data.records[0].text = '{}';
    writeFileSync(join(dir, 'activity-memory.json'), JSON.stringify(data));
    await assert.rejects(session.refresh(prepared.reportId), /FIXTURE_HASH/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('inventory follows empty filtered pages and rejects incomplete content', async () => {
  const r = createRule();
  const text = JSON.stringify(r);
  const sdk: any = {
    listMemories: async ({ cursor }: any) => cursor
      ? { snapshot_version: 5, must_resync: false, has_more: false, memories: [{ namespace_id: binding.project, blob_id: 'a'.repeat(43), status: 'stored' }] }
      : { snapshot_version: 5, must_resync: false, has_more: true, next_cursor: 'next', memories: [] },
    recall: async () => ({ results: [{ blob_id: 'a'.repeat(43), text }] }),
  };
  const journal: any = {};
  const store = new WalrusRuleStore(sdk, binding, journal);
  assert.equal((await readRules(store, binding))[0].record.id, r.id);
  sdk.recall = async () => ({ results: [] });
  store.cached = undefined;
  await assert.rejects(readRules(store, binding), /MEMORY_CONTEXT_INCOMPLETE/);
});

test('native Walrus SDK uses the documented namespace and lists metadata without external calls', async () => {
  const sdk: any = MemWal.create({ key: '01'.repeat(32), accountId: address('0x10'), namespace: binding.project });
  const requests: any[] = [];
  sdk.signedRequest = async (method: string, path: string, body: any) => {
    requests.push({ method, path, body });
    if (path === '/api/stats') return { owner: binding.owner };
    if (path.startsWith('/v1/owners/')) return { memories: [], has_more: false, next_cursor: null, snapshot_version: 1 };
    if (path === '/api/remember') return { job_id: 'job-native' };
    throw Error('UNEXPECTED_OFFLINE_ROUTE');
  };
  try {
    await sdk.listMemories({ namespace: binding.project });
    await sdk.remember('synthetic test only', binding.project, { idempotencyKey: 'offline-native' });
    assert.ok(requests.some(r => r.path === '/v1/owners/' + binding.owner + '/memories'));
    const remembered = requests.find(r => r.path === '/api/remember');
    assert.equal(remembered.body.namespace, binding.project);
  } finally { sdk.destroy(); }
});

test('Walrus write journal survives an uncertain result and prevents resubmission', async () => {
  const { FileWriteJournal } = await import('./activity-memory.ts');
  const dir = directory();
  try {
    const journal = new FileWriteJournal(dir);
    let calls = 0;
    const sdk = { remember: async (_text: string, namespace: string, opts: any) => {
      calls++;
      assert.equal(namespace, binding.project);
      assert.ok(opts.idempotencyKey);
      return { job_id: 'job-offline' };
    }, getRememberStatus: async () => { throw Error('SIMULATED_TIMEOUT'); } };
    const store = new WalrusRuleStore(sdk, binding, journal);
    const record = createRule();
    const key = 'a'.repeat(43);
    await assert.rejects(store.write(record, key), /SIMULATED_TIMEOUT/);
    const afterRestart = new WalrusRuleStore(sdk, binding, new FileWriteJournal(dir));
    await assert.rejects(afterRestart.write(record, key), /WRITE_OUTCOME_UNCERTAIN/);
    await assert.rejects(afterRestart.write(record, 'd'.repeat(43)), /WRITE_OUTCOME_UNCERTAIN/);
    assert.equal(calls, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Walrus writer reuses a confirmed receipt and serializes concurrent attempts', async () => {
  const { FileWriteJournal } = await import('./activity-memory.ts');
  const dir = directory();
  try {
    let finish: (value: unknown) => void = () => {};
    const wait = new Promise(resolve => { finish = resolve; });
    let calls = 0;
    const sdk = { remember: async () => { calls++; await wait; return { job_id: 'job-complete' }; },
      getRememberStatus: async () => ({ job_id: 'job-complete', status: 'done', blob_id: 'b'.repeat(43), owner: binding.owner, namespace: binding.project }) };
    const store = new WalrusRuleStore(sdk, binding, new FileWriteJournal(dir));
    const record = createRule();
    const key = 'c'.repeat(43);
    const first = store.write(record, key);
    await assert.rejects(store.write(record, key), /EEXIST/);
    finish(undefined);
    const receipt = await first;
    assert.deepEqual(await store.write(record, key), receipt);
    assert.equal(calls, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('memory paging detects changed snapshots and repeated cursors', async () => {
  let page = 0;
  const sdk = { listMemories: async () => {
    page++;
    return { snapshot_version: page, must_resync: false, has_more: true, next_cursor: 'x', memories: [] };
  } };
  const store = new WalrusRuleStore(sdk, binding, {} as any);
  await assert.rejects(store.inventory(), /INVENTORY_CHANGED/);
  sdk.listMemories = async () => ({ snapshot_version: 1, must_resync: false, has_more: true, next_cursor: 'x', memories: [] });
  await assert.rejects(store.inventory(), /INVENTORY_CURSOR/);
});

test('memory mutations during recall block the entire report', async () => {
  let revision = 0;
  const record = createRule();
  const store: any = {
    inventory: async () => ({ blobIds: ['blob'], revision: String(revision++) }),
    recall: async () => [{ blobId: 'blob', text: JSON.stringify(record) }],
  };
  await assert.rejects(readRules(store, binding), /MEMORY_CHANGED_DURING_READ/);
});

test('unrelated wallet, duplicate explorer IDs, and wrong-network links are rejected', async () => {
  const dir = directory();
  try {
    const store = new FixtureRuleStore(dir, binding);
    const session = new ActivitySession(binding, store, n => new FixtureActivityData(n), () => now);
    await assert.rejects(session.prepare('mainnet', address('0xd'), [FIXTURE_DIGESTS[0]]), /WALLET_NOT_INVOLVED/);
    await assert.rejects(session.prepare('mainnet', FIXTURE_WALLET,
      [FIXTURE_DIGESTS[0], 'https://suiscan.xyz/mainnet/tx/' + FIXTURE_DIGESTS[0]]), /DUPLICATE_TRANSACTION/);
    await assert.rejects(session.prepare('testnet', FIXTURE_WALLET,
      ['https://suiscan.xyz/mainnet/tx/' + FIXTURE_DIGESTS[0]]), /NETWORK_MISMATCH/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
