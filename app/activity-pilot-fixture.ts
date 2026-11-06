// Only imported by an explicitly offline pilot worker. No provider fallback.
import { randomUUID, createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { assert } from '../src/domain.ts';
import { address } from './activity.ts';
import { tatumKeyHash } from './activity-live.ts';
import { FIXTURE_WALLET, FIXTURE_DIGESTS, FixtureActivityData } from './activity-fixtures.ts';
import { readPilotFile, writePilotFile, pilotHash } from './activity-pilot.ts';
import type { PilotEnvelope } from './activity-pilot.ts';

export function offlinePilotEnvelope(): PilotEnvelope {
  const plan = { schema: 1 as const, network: 'mainnet' as const, owner: FIXTURE_WALLET, accountId: address('0x10'),
    wallet: FIXTURE_WALLET, project: 'recall-activity-' + randomUUID(), digests: FIXTURE_DIGESTS.slice(0, 2),
    maxUSD: 0 as const, expiresAt: new Date(Date.now() + 3600000).toISOString() };
  const intent = { address: address('0xb'),
    explanation: { relation: 'self' as const, label: 'Test second wallet', effectiveFrom: '2026-01-01T00:00:00.000Z' },
    correction: { relation: 'external' as const, label: 'Test external account', effectiveFrom: '2026-01-01T00:00:00.000Z' } };
  return { schema: 1, mode: 'offline-fixture', plan, intent, confirmedIntentHash: pilotHash(intent), approval: {
    schema: 2, planHash: pilotHash(plan), walrusManaged: true, checkedAt: new Date().toISOString(),
    tatum: { accountId: '0'.repeat(24), plan: 'FREE', remainingCredits: 100, creditsPerCall: 2, keySha256: tatumKeyHash('offline-sentinel') } } };
}

export async function offlinePilotPorts(run: string, envelope: PilotEnvelope) {
  const p = envelope.plan;
  assert(envelope.mode === 'offline-fixture' && p.wallet === FIXTURE_WALLET
    && p.digests.every(d => FIXTURE_DIGESTS.includes(d)), 'OFFLINE_FIXTURE_SCOPE');
  globalThis.fetch = () => { throw Error('OFFLINE_NETWORK_DENIED'); };
  const file = 'fixture-relayer.json';
  if (!existsSync(join(run, file))) writePilotFile(run, file, { revision: 0, records: [], jobs: {} });
  const relay = 'https://relayer.memory.walrus.xyz';
  const publicKey = '02'.repeat(32);
  const profile = () => ({ accountId: p.accountId, walletAddress: p.owner,
    packageId: address('0x20'), delegatePublicKeyHex: publicKey });
  const headers = { 'x-account-id': p.accountId, 'x-public-key': publicKey };
  const transport: typeof fetch = async (input: any, options: any = {}) => {
    const url = new URL(String(input));
    assert(url.origin === relay, 'OFFLINE_ROUTE');
    if (url.pathname === '/health') return Response.json({ status: 'ok', writes: 'ok', write_ready: true });
    if (url.pathname === '/config') return Response.json({ network: 'mainnet', packageId: profile().packageId });
    const state = readPilotFile(run, file);
    if (url.pathname.endsWith('/memories')) return Response.json({ snapshot_version: state.revision,
      must_resync: false, has_more: false, memories: state.records.map((r: any) => ({ namespace_id: p.project,
        blob_id: r.blob_id, status: 'stored' })) });
    if (url.pathname === '/api/recall') return Response.json({ results: state.records });
    if (url.pathname === '/api/remember') {
      const body = JSON.parse(options.body);
      const job = randomUUID();
      const blob_id = createHash('sha256').update(body.text).digest('base64url');
      state.records.push({ blob_id, text: body.text });
      state.jobs[job] = { job_id: job, status: 'done', owner: p.owner, namespace: p.project, blob_id };
      state.revision++;
      writePilotFile(run, file, state, true);
      return Response.json({ job_id: job });
    }
    if (url.pathname.startsWith('/api/remember/')) {
      const job = state.jobs[url.pathname.split('/').pop()!];
      assert(job, 'OFFLINE_UNKNOWN_JOB');
      return Response.json(job);
    }
    throw Error('OFFLINE_ROUTE');
  };
  const sdk = {
    listMemories: async () => (await fetch(relay + '/v1/owners/' + p.owner + '/memories?limit=100', { headers })).json(),
    recall: async (body: any) => (await fetch(relay + '/api/recall',
      { method: 'POST', headers, body: JSON.stringify(body) })).json(),
    remember: async (text: string, namespace: string, options: any) => (await fetch(relay + '/api/remember',
      { method: 'POST', headers, body: JSON.stringify({ text, namespace, idempotency_key: options.idempotencyKey }) })).json(),
    getRememberStatus: async (job: string) => (await fetch(relay + '/api/remember/' + job, { headers })).json(),
    destroy: () => {},
  };
  return { profile, fetch: transport, connectWalrus: async () => ({ sdk }), connectTatum: async (env: any) => {
    assert(env.TATUM_API_KEY === 'offline-sentinel', 'OFFLINE_CREDENTIALS');
    const data = new FixtureActivityData(p.network);
    return { transactions: data.transactions.bind(data), close: () => {} };
  } };
}
