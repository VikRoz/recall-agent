import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonical } from '../src/domain.ts';
import { ActivityBudget, openLiveActivity, validateActivityPlan, walrusFetchGuard, PILOT_LIMITS, tatumKeyHash, validateApproval, validateTatumBinding } from './activity-live.ts';
import type { ActivityPlan } from './activity-live.ts';
import { address } from './activity.ts';
import { FileWriteJournal, WalrusRuleStore, WRITE_POLL_DELAYS_MS } from './activity-memory.ts';
import { FIXTURE_WALLET, FIXTURE_OTHER, FIXTURE_DIGESTS, FixtureActivityData } from './activity-fixtures.ts';

globalThis.fetch = () => { throw Error('OFFLINE_NETWORK_DENIED'); };
const relay = 'https://relayer.memory.walrus.xyz';
const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const plan = (): ActivityPlan => ({ schema: 1, network: 'mainnet', owner: FIXTURE_WALLET, accountId: address('0x10'),
  wallet: FIXTURE_WALLET, project: 'recall-activity-' + randomUUID(), digests: FIXTURE_DIGESTS.slice(0, 2),
  maxUSD: 0, expiresAt: new Date(Date.now() + 3600000).toISOString() });
const approval = (p: ActivityPlan) => ({ schema: 2 as const, planHash: hash(p), walrusManaged: true, checkedAt: new Date().toISOString(),
  tatum: { accountId: '0'.repeat(24), plan: 'FREE' as const, remainingCredits: 100, creditsPerCall: 2 as const, keySha256: tatumKeyHash('offline-sentinel') } });
const binding = (p: ActivityPlan) => ({ accountId: p.accountId, walletAddress: p.owner,
  packageId: address('0x20'), delegatePublicKeyHex: '02'.repeat(32) });
const headers = (p: ActivityPlan) => ({ 'x-account-id': p.accountId, 'x-public-key': binding(p).delegatePublicKeyHex });
const directory = () => mkdtempSync(join(tmpdir(), 'recall-live-offline-test-'));

test('missing approval, nonzero spend, or stale evidence stop before profile or transport', async () => {
  const dir = directory();
  let touched = false;
  try {
    const p = plan();
    await assert.rejects(openLiveActivity(dir, p, { ...approval(p), walrusManaged: false }, {},
      { profile: () => { touched = true; } }), /LIVE_APPROVAL_REQUIRED/);
    assert.throws(() => validateActivityPlan({ ...p, maxUSD: 1 }), /PILOT_PLAN/);
    await assert.rejects(openLiveActivity(dir, p, { ...approval(p), checkedAt: '2026-01-01T00:00:00.000Z' }, {},
      { profile: () => { touched = true; } }), /BILLING_CHECK_EXPIRED/);
    assert.equal(touched, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('budgets persist across processes and stop permanently at a cap', () => {
  const dir = directory();
  try {
    const p = plan();
    new ActivityBudget(dir, p).take('writes');
    const reopened = new ActivityBudget(dir, p);
    reopened.take('writes');
    assert.throws(() => reopened.take('writes'), /PILOT_LIMIT/);
    const third = new ActivityBudget(dir, p);
    assert.equal(third.state().writes, 2);
    assert.throws(() => third.take('reads'), /PILOT_STOPPED/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('unapproved routes and account headers never reach transport', async () => {
  for (const [url, opts] of [
    [relay + '/api/analyze', { method: 'POST', headers: {} }],
    ['https://example.com/', {}],
    [relay + '/api/stats', { method: 'POST', headers: {}, body: '{}' }],
    [relay + '/health', { headers: { 'x-delegate-key': 'offline-sentinel' } }],
  ] as const) {
    const dir = directory();
    let calls = 0;
    try {
      const p = plan();
      const budget = new ActivityBudget(dir, p);
      const guarded = walrusFetchGuard(budget, binding(p), async () => { calls++; return new Response('{}'); });
      await assert.rejects(guarded(url, opts));
      assert.equal(calls, 0);
      assert.notEqual(budget.state().stopped, null);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test('degraded write health prevents connecting providers and restores the fetch guard', async () => {
  const dir = directory();
  const p = plan();
  const before = globalThis.fetch;
  let connected = 0;
  try {
    await assert.rejects(openLiveActivity(dir, p, approval(p), { TATUM_API_KEY: 'offline-sentinel' }, {
      profile: () => binding(p),
      fetch: async (url: string, options: any) => {
        assert.ok(options.signal instanceof AbortSignal);
        assert.equal(options.redirect, 'error');
        return Response.json(url.endsWith('/health')
          ? { status: 'ok', writes: 'degraded', write_ready: true }
          : { network: 'mainnet', packageId: binding(p).packageId });
      },
      connectWalrus: async () => { connected++; throw Error('MUST_NOT_CONNECT'); },
      connectTatum: async () => { connected++; throw Error('MUST_NOT_CONNECT'); },
    }), /WRITES_UNAVAILABLE/);
    assert.equal(connected, 0);
    assert.equal(globalThis.fetch, before);
    assert.equal(new ActivityBudget(dir, p).state().stopped, 'PILOT_START_FAILED');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('provider errors stop the run and no automatic transport retry occurs', async () => {
  const dir = directory();
  let calls = 0;
  try {
    const p = plan();
    const budget = new ActivityBudget(dir, p);
    const guarded = walrusFetchGuard(budget, binding(p), async () => {
      calls++; return new Response('{}', { status: 429 });
    });
    await assert.rejects(guarded(relay + '/health'), /PILOT_HTTP_ERROR/);
    await assert.rejects(guarded(relay + '/health'), /PILOT_STOPPED/);
    assert.equal(calls, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('job polling is bound to accepted jobs and capped', async () => {
  const dir = directory();
  try {
    const p = plan();
    const budget = new ActivityBudget(dir, p);
    budget.take('writes');
    budget.registerJob('job-known');
    assert.throws(() => budget.poll('job-other'), /UNKNOWN_PILOT_JOB/);
    for (let i = 0; i < PILOT_LIMITS.pollsPerJob; i++) budget.poll('job-known');
    assert.throws(() => budget.poll('job-known'), /PILOT_LIMIT/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('wired provider runtime completes two writes and two reads without external calls', async () => {
  const dir = directory();
  const p = plan();
  let revision = 0, closed = 0, transportCalls = 0;
  const rows: any[] = [];
  const jobs: any = {};
  const profileValue = () => ({ ...binding(p), delegatePrivateKey: 'offline-test-placeholder' });
  const transport: typeof fetch = async (input: any, options: any = {}) => {
    transportCalls++;
    const url = new URL(String(input));
    if (url.pathname === '/health') return Response.json({ status: 'ok', writes: 'ok', write_ready: true });
    if (url.pathname === '/config') return Response.json({ network: 'mainnet', packageId: binding(p).packageId });
    if (url.pathname.endsWith('/memories')) return Response.json({ snapshot_version: revision, must_resync: false,
      has_more: false, memories: rows.map(r => ({ namespace_id: p.project, blob_id: r.blob_id, status: 'stored' })) });
    if (url.pathname === '/api/recall') return Response.json({ results: rows });
    if (url.pathname === '/api/remember') {
      const body = JSON.parse(options.body);
      const job = randomUUID();
      const blob_id = createHash('sha256').update(body.text).digest('base64url');
      rows.push({ blob_id, text: body.text });
      jobs[job] = { job_id: job, status: 'done', owner: p.owner, namespace: p.project, blob_id };
      revision++;
      return Response.json({ job_id: job });
    }
    if (url.pathname.startsWith('/api/remember/')) return Response.json(jobs[url.pathname.split('/').pop()!]);
    throw Error('UNEXPECTED_OFFLINE_REQUEST');
  };
  const sdk = {
    listMemories: async () => (await fetch(relay + '/v1/owners/' + p.owner + '/memories?limit=100',
      { headers: headers(p) })).json(),
    recall: async (body: any) => (await fetch(relay + '/api/recall',
      { method: 'POST', headers: headers(p), body: JSON.stringify(body) })).json(),
    remember: async (text: string, namespace: string, options: any) => (await fetch(relay + '/api/remember',
      { method: 'POST', headers: headers(p), body: JSON.stringify({ text, namespace, idempotency_key: options.idempotencyKey }) })).json(),
    getRememberStatus: async (job: string) => (await fetch(relay + '/api/remember/' + job,
      { headers: headers(p) })).json(),
    destroy: () => { closed++; },
  };
  const ports = { fetch: transport, profile: profileValue, connectWalrus: async () => ({ sdk }),
    connectTatum: async (env: any) => {
      assert.equal(env.TATUM_API_KEY, 'offline-sentinel');
      const data = new FixtureActivityData('mainnet');
      return { transactions: data.transactions.bind(data), close: () => {} };
    } };
  let runtime: Awaited<ReturnType<typeof openLiveActivity>> | undefined;
  try {
    runtime = await openLiveActivity(dir, p, approval(p), { TATUM_API_KEY: 'offline-sentinel' }, ports);
    await assert.rejects(openLiveActivity(dir, p, approval(p), { TATUM_API_KEY: 'offline-sentinel' }, ports),
      /ACTIVITY_RUNTIME_ALREADY_OPEN/);
    const first = await runtime.session.prepare('mainnet', p.wallet, [p.digests[0]]);
    const proposal = await runtime.session.propose(first.reportId, FIXTURE_OTHER, 'self', 'Second wallet',
      '2026-01-01T00:00:00.000Z', null);
    const receipt = await runtime.session.save(proposal.proposalId);
    runtime.close();
    runtime = await openLiveActivity(dir, p, approval(p), { TATUM_API_KEY: 'offline-sentinel' }, ports);
    const second = await runtime.session.prepare('mainnet', p.wallet, [p.digests[1]]);
    assert.equal(second.rows[1].memoryBlobId, receipt.blobId);
    assert.equal(second.declaredWalletTotals[0].netAmountBaseUnits, '-1050');
    const correction = await runtime.session.propose(second.reportId, FIXTURE_OTHER, 'external', 'External',
      '2026-01-01T00:00:00.000Z', proposal.preview.id);
    await runtime.session.save(correction.proposalId);
    const report = await runtime.session.export(second.reportId);
    assert.equal(report.report.rows[1].relation, 'external');
    const counts = runtime.budget.state();
    assert.equal(counts.writes, 2);
    assert.equal(counts.reads, 2);
    assert.equal(counts.tatumBatches, 2);
    assert.ok(transportCalls <= PILOT_LIMITS.requests);
    await assert.rejects(runtime.session.prepare('mainnet', p.wallet, [p.digests[0]]), /TATUM_FREE_ALLOWANCE/);
  } finally {
    runtime?.close();
    rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(closed, 2);
});

test('another wallet is rejected before a Tatum batch is consumed', async () => {
  const dir = directory();
  const p = plan();
  let batches = 0;
  const ports = { profile: () => binding(p), connectWalrus: async () => ({ sdk: { destroy: () => {} } }),
    connectTatum: async () => ({ transactions: async () => { batches++; return []; }, close: () => {} }),
    fetch: async (url: string) => Response.json(url.endsWith('/health')
      ? { status: 'ok', writes: 'ok', write_ready: true } : { network: 'mainnet', packageId: binding(p).packageId }) };
  const runtime = await openLiveActivity(dir, p, approval(p), { TATUM_API_KEY: 'offline-sentinel' }, ports);
  try {
    await assert.rejects(runtime.session.prepare('mainnet', FIXTURE_OTHER, [p.digests[0]]), /PILOT_REPORT_SCOPE/);
    assert.equal(batches, 0);
    assert.equal(runtime.budget.state().stopped, 'ACTIVITY_TOOL_ERROR');
  } finally { runtime.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('an uncertain journal blocks a restarted pilot before any provider request', async () => {
  const dir = directory();
  let requests = 0;
  const p = plan();
  try {
    await new FileWriteJournal(dir).save('u'.repeat(43), { state: 'submitting', sha256: 'offline' });
    await assert.rejects(openLiveActivity(dir, p, approval(p), { TATUM_API_KEY: 'offline-sentinel' }, {
      profile: () => binding(p), fetch: async () => { requests++; return Response.json({}); },
    }), /WRITE_OUTCOME_UNCERTAIN/);
    assert.equal(requests, 0);
    assert.equal(new ActivityBudget(dir, p).state().stopped, 'WRITE_OUTCOME_UNCERTAIN');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('write polling allows bounded processing time without resubmitting a slow job', async () => {
  const dir = directory();
  const p = plan();
  const waits: number[] = [];
  let submits = 0, polls = 0;
  try {
    const sdk = { remember: async () => { submits++; return { job_id: 'offline-pending' }; },
      getRememberStatus: async () => { polls++; return { job_id: 'offline-pending', status: 'running' }; } };
    const store = new WalrusRuleStore(sdk, { owner: p.owner, project: p.project }, new FileWriteJournal(dir),
      async (milliseconds: number) => { waits.push(milliseconds); });
    const { newRule } = await import('./activity.ts');
    const record = newRule({ owner: p.owner, project: p.project }, p.network, p.wallet, FIXTURE_OTHER,
      'unknown', 'Example', new Date().toISOString(), '2026-01-01T00:00:00.000Z', null);
    await assert.rejects(store.write(record, 's'.repeat(43)), /WRITE_STATUS_LIMIT/);
    assert.equal(submits, 1);
    assert.equal(polls, PILOT_LIMITS.pollsPerJob);
    assert.deepEqual(waits, WRITE_POLL_DELAYS_MS.filter(n => n > 0));
    assert.equal(waits.reduce((sum, n) => sum + n, 0), 135000);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('allowance approval rejects old gates, paid plans, insufficient credits and unknown pricing', () => {
  const p = plan();
  const good = approval(p);
  validateApproval(p, good);
  for (const change of [{ remainingCredits: 3 }, { remainingCredits: 4.5 }, { creditsPerCall: 3 }, { plan: 'PAID' }]) {
    assert.throws(() => validateApproval(p, { ...good, tatum: { ...good.tatum, ...change } } as any));
  }
  assert.throws(() => validateApproval(p, { planHash: hash(p), tatumFree: true,
    tatumAutoUpgradeOff: true, walrusManaged: true, checkedAt: new Date().toISOString() } as any), /LIVE_APPROVAL_REQUIRED/);
  assert.throws(() => validateApproval(p, { ...good, checkedAt: new Date(Date.now() - 300001).toISOString() }), /BILLING_CHECK_EXPIRED/);
  assert.throws(() => validateApproval(p, { ...good, checkedAt: new Date(Date.now() + 10000).toISOString() }), /BILLING_CHECK_EXPIRED/);
  validateTatumBinding(good, 'offline-sentinel');
  assert.throws(() => validateTatumBinding(good, 'another-key'), /TATUM_KEY_BINDING/);
});

test('key mismatch is rejected before profile access or any provider transport', async () => {
  const dir = directory();
  let touched = false;
  try {
    const p = plan();
    await assert.rejects(openLiveActivity(dir, p, approval(p), { TATUM_API_KEY: 'wrong-offline-key' },
      { profile: () => { touched = true; } }), /TATUM_KEY_BINDING/);
    assert.equal(touched, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('billing evidence is checked again immediately before each Tatum request', async () => {
  const dir = directory();
  const p = plan();
  const a = approval(p);
  let calls = 0;
  const runtime = await openLiveActivity(dir, p, a, { TATUM_API_KEY: 'offline-sentinel' }, {
    profile: () => binding(p), connectWalrus: async () => ({ sdk: { destroy: () => {} } }),
    connectTatum: async () => ({ transactions: async () => { calls++; return []; }, close: () => {} }),
    fetch: async (url: string) => Response.json(url.endsWith('/health')
      ? { status: 'ok', writes: 'ok', write_ready: true } : { network: 'mainnet', packageId: binding(p).packageId }),
  });
  try {
    a.checkedAt = new Date(Date.now() - 300001).toISOString();
    await assert.rejects(runtime.session.prepare('mainnet', p.wallet, [p.digests[0]]), /BILLING_CHECK_EXPIRED/);
    assert.equal(calls, 0);
    assert.equal(runtime.budget.state().tatumBatches, 0);
    assert.notEqual(runtime.budget.state().stopped, null);
  } finally { runtime.close(); rmSync(dir, { recursive: true, force: true }); }
});
