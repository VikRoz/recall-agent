import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync,
  renameSync, rmSync, openSync, closeSync, fsyncSync } from 'node:fs';
import { join } from 'node:path';
import { assert, canonical, exactKeys, time } from '../src/domain.ts';
import { address, digest, rule } from './activity.ts';
import { profile, connect } from './walrus.mjs';
import { connectTatum } from './tatum.ts';
import { WalrusRuleStore, FileWriteJournal } from './activity-memory.ts';
import { ActivitySession } from './activity-session.ts';

export const PILOT_LIMITS = Object.freeze({ tatumBatches: 2, writes: 2, reads: 2, requests: 64, pollsPerJob: 8 });
const relay = 'https://relayer.memory.walrus.xyz';
let activeRuntime = false;
const sha = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export type ActivityPlan = { schema: 1; network: 'mainnet'; owner: string; accountId: string;
  wallet: string; project: string; digests: string[]; maxUSD: 0; expiresAt: string };
export type Approval = { schema: 2; planHash: string; walrusManaged: boolean; checkedAt: string;
  tatum: { accountId: string; plan: 'FREE'; remainingCredits: number; creditsPerCall: 2; keySha256: string } };
export const tatumKeyHash = (key: string) => createHash('sha256').update(key).digest('hex');
export function validateActivityPlan(raw: unknown): ActivityPlan {
  assert(raw && typeof raw === 'object', 'PILOT_PLAN');
  const p: any = raw;
  exactKeys(p, ['schema', 'network', 'owner', 'accountId', 'wallet', 'project', 'digests', 'maxUSD', 'expiresAt']);
  assert(p.schema === 1 && p.network === 'mainnet' && p.maxUSD === 0, 'PILOT_PLAN');
  assert([p.owner, p.accountId, p.wallet].every(a => address(a) === a), 'PILOT_ADDRESS');
  assert(/^recall-activity-[a-f0-9-]{36}$/.test(p.project), 'PILOT_NAMESPACE');
  assert(Array.isArray(p.digests) && p.digests.length === 2 && new Set(p.digests).size === 2, 'PILOT_DIGESTS');
  p.digests.forEach(digest);
  assert(time(p.expiresAt) > Date.now() && time(p.expiresAt) <= Date.now() + 86400000, 'PILOT_EXPIRED');
  return p;
}
export function validateApproval(plan: ActivityPlan, approval: Approval) {
  assert(approval && approval.schema === 2 && approval.planHash === sha(plan)
    && approval.walrusManaged === true && approval.tatum?.plan === 'FREE', 'LIVE_APPROVAL_REQUIRED');
  exactKeys(approval, ['schema', 'planHash', 'walrusManaged', 'checkedAt', 'tatum']);
  exactKeys(approval.tatum, ['accountId', 'plan', 'remainingCredits', 'creditsPerCall', 'keySha256']);
  assert(/^[a-f0-9]{24}$/.test(approval.tatum.accountId) && /^[a-f0-9]{64}$/.test(approval.tatum.keySha256), 'TATUM_KEY_BINDING');
  assert(Number.isSafeInteger(approval.tatum.remainingCredits) && approval.tatum.remainingCredits >= 4
    && approval.tatum.creditsPerCall === 2, 'TATUM_FREE_ALLOWANCE');
  const age = Date.now() - time(approval.checkedAt);
  assert(age >= 0 && age <= 300000, 'BILLING_CHECK_EXPIRED');
}
export function validateTatumBinding(approval: Approval, key: string | undefined) {
  assert(typeof key === 'string' && key.length > 0, 'TATUM_CREDENTIALS_MISSING');
  assert(tatumKeyHash(key) === approval.tatum.keySha256, 'TATUM_KEY_BINDING');
}

type Counters = { planHash: string; stopped: string | null; tatumBatches: number; writes: number;
  reads: number; requests: number; jobs: Record<string, number> };
export class ActivityBudget {
  directory: string;
  path: string;
  plan: ActivityPlan;
  constructor(directory: string, plan: ActivityPlan) {
    this.directory = directory;
    this.path = join(directory, 'activity-budget.json');
    this.plan = plan;
    const state: Counters = { planHash: sha(plan), stopped: null, tatumBatches: 0, writes: 0, reads: 0, requests: 0, jobs: {} };
    if (!existsSync(this.path)) {
      try { writeFileSync(this.path, canonical(state), { mode: 0o600, flag: 'wx' }); }
      catch (error: any) { if (error.code !== 'EEXIST') throw error; }
    }
    this.state();
  }
  state(): Counters {
    const info = lstatSync(this.path);
    assert(info.isFile() && info.size <= 8192 && info.uid === process.getuid() && (info.mode & 0o077) === 0, 'BUDGET_FILE');
    const result = JSON.parse(readFileSync(this.path, 'utf8'));
    assert(result.planHash === sha(this.plan) && (result.stopped === null || typeof result.stopped === 'string'), 'BUDGET_BINDING');
    for (const key of ['tatumBatches', 'writes', 'reads', 'requests'] as const) {
      assert(Number.isSafeInteger(result[key]) && result[key] >= 0 && result[key] <= PILOT_LIMITS[key], 'BUDGET_COUNTER');
    }
    assert(result.jobs && Object.keys(result.jobs).length <= 2 && Object.values(result.jobs)
      .every(n => Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= PILOT_LIMITS.pollsPerJob), 'BUDGET_JOBS');
    return result;
  }
  update(change: (state: Counters) => void, allowStopped = false) {
    const lock = join(this.directory, '.activity-budget-lock');
    mkdirSync(lock, { mode: 0o700 });
    const temporary = join(lock, 'next.json');
    try {
      const state = this.state();
      assert(allowStopped || state.stopped === null, 'PILOT_STOPPED');
      if (!allowStopped) assert(time(this.plan.expiresAt) > Date.now(), 'PILOT_EXPIRED');
      change(state);
      const fd = openSync(temporary, 'wx', 0o600);
      try { writeFileSync(fd, canonical(state)); fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(temporary, this.path);
    } finally { rmSync(lock, { recursive: true, force: true }); }
  }
  take(key: 'tatumBatches' | 'writes' | 'reads' | 'requests') {
    this.update(state => {
      if (state[key] >= PILOT_LIMITS[key]) { state.stopped = 'LIMIT_' + key; return; }
      state[key]++;
    });
    assert(this.state().stopped === null, 'PILOT_LIMIT');
  }
  registerJob(id: string) {
    this.update(state => {
      assert(/^[a-zA-Z0-9_-]{1,100}$/.test(id) && !Object.hasOwn(state.jobs, id)
        && Object.keys(state.jobs).length < state.writes, 'PILOT_JOB');
      state.jobs[id] = 0;
    });
  }
  poll(id: string) {
    this.update(state => {
      assert(Object.hasOwn(state.jobs, id), 'UNKNOWN_PILOT_JOB');
      if (state.jobs[id] >= PILOT_LIMITS.pollsPerJob) { state.stopped = 'POLL_LIMIT'; return; }
      state.jobs[id]++;
    });
    assert(this.state().stopped === null, 'PILOT_LIMIT');
  }
  stop(code: string) {
    this.update(state => { state.stopped ??= /^[A-Z0-9_]+$/.test(code) ? code : 'PROVIDER_ERROR'; }, true);
  }
}
export function walrusFetchGuard(budget: ActivityBudget, binding: any, transport: typeof fetch) {
  return async (input: any, options: any = {}) => {
    try {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      const method = options.method ?? input?.method ?? 'GET';
      assert(!url.username && !url.password, 'PILOT_URL');
      budget.take('requests');
      if (url.origin === relay) {
        const path = url.pathname;
        const headers = new Headers(options.headers ?? input?.headers);
        assert(!headers.has('x-delegate-key'), 'RAW_KEY_DENIED');
        const publicPath = ['/health', '/version', '/config'].includes(path);
        if (!publicPath) assert(headers.get('x-account-id') === binding.accountId
          && headers.get('x-public-key') === binding.delegatePublicKeyHex, 'REQUEST_ACCOUNT_MISMATCH');
        const body = method === 'POST' ? JSON.parse(options.body) : undefined;
        if (method === 'POST' && path === '/api/remember') {
          assert(!url.search && body.namespace === budget.plan.project && typeof body.text === 'string'
            && body.text.length <= 4096 && /^[A-Za-z0-9_-]{43}$/.test(body.idempotency_key), 'WRITE_SCOPE');
          const record = rule(JSON.parse(body.text), { owner: budget.plan.owner, project: budget.plan.project });
          assert(record.network === budget.plan.network && record.subjectWallet === budget.plan.wallet, 'WRITE_SCOPE');
          budget.take('writes');
        } else if (method === 'POST' && path === '/api/recall') {
          assert(!url.search && body.namespace === budget.plan.project && body.limit === 20
            && typeof body.query === 'string' && body.query.length <= 200, 'READ_SCOPE');
          budget.take('reads');
        } else if (method === 'GET' && path.startsWith('/api/remember/')) {
          assert(!url.search, 'PILOT_ROUTE');
          budget.poll(path.slice('/api/remember/'.length));
        } else if (method === 'GET' && path === '/v1/owners/' + budget.plan.owner + '/memories') {
          assert([...url.searchParams.keys()].every(k => ['updated_after', 'limit'].includes(k))
            && url.searchParams.getAll('limit').length === 1 && url.searchParams.get('limit') === '100'
            && url.searchParams.getAll('updated_after').length <= 1
            && (url.searchParams.get('updated_after')?.length ?? 0) <= 1024, 'INVENTORY_SCOPE');
        } else {
          assert((method === 'GET' && publicPath && !url.search)
            || (method === 'POST' && path === '/api/stats' && !url.search && body.namespace === budget.plan.project),
          'PILOT_ROUTE');
        }
      } else {
        assert(url.origin === 'https://mysten-rpc.mainnet.sui.io' && method === 'POST'
          && url.pathname === '/sui.rpc.v2.LedgerService/BatchGetObjects' && !url.search, 'PILOT_ROUTE');
      }
      const timeout = AbortSignal.timeout(url.pathname === '/api/recall' ? 45000 : 15000);
      const signal = options.signal ?? input?.signal;
      const response = await transport(input, { ...options, redirect: 'error',
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      assert(response.ok, 'PILOT_HTTP_ERROR');
      if (url.origin === relay && url.pathname === '/api/remember') {
        const ack = await response.clone().json();
        budget.registerJob(ack.job_id);
      }
      if (url.origin === relay && url.pathname === '/config') {
        const config = await response.clone().json();
        assert(config.network === 'mainnet' && config.packageId === binding.packageId, 'RELAYER_PROFILE_MISMATCH');
      }
      return response;
    } catch (error) {
      budget.stop('PROVIDER_OR_POLICY_ERROR');
      throw error;
    }
  };
}

export async function openLiveActivity(run: string, rawPlan: unknown, approval: Approval,
  env: Record<string, string | undefined>, ports: any = {}) {
  const plan = validateActivityPlan(rawPlan);
  validateApproval(plan, approval);
  validateTatumBinding(approval, env.TATUM_API_KEY);
  assert(!activeRuntime, 'ACTIVITY_RUNTIME_ALREADY_OPEN');
  const runInfo = lstatSync(run);
  assert(runInfo.isDirectory() && runInfo.uid === process.getuid() && (runInfo.mode & 0o077) === 0, 'PILOT_DIRECTORY');
  const p = (ports.profile ?? profile)(run);
  assert(p.accountId === plan.accountId && p.walletAddress === plan.owner, 'PILOT_ACCOUNT');
  p.delegatePrivateKey = '';
  const budget = new ActivityBudget(run, plan);
  assert(budget.state().stopped === null, 'PILOT_STOPPED');
  const journal = new FileWriteJournal(run);
  try { journal.assertSettled(); }
  catch (error) { budget.stop('WRITE_OUTCOME_UNCERTAIN'); throw error; }
  const originalFetch = globalThis.fetch;
  const guarded = walrusFetchGuard(budget, p, ports.fetch ?? originalFetch);
  activeRuntime = true;
  globalThis.fetch = guarded;
  let sdk: any, data: any;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    try { sdk?.destroy(); }
    finally {
      try { data?.close(); }
      finally {
        if (globalThis.fetch === guarded) globalThis.fetch = originalFetch;
        activeRuntime = false;
      }
    }
  };
  try {
    assert(env.TATUM_API_KEY, 'TATUM_CREDENTIALS_MISSING');
    const [health, config] = await Promise.all([guarded(relay + '/health'), guarded(relay + '/config')]);
    const status = await health.json();
    assert(config.ok && status.status === 'ok' && status.writes === 'ok' && status.write_ready === true, 'WRITES_UNAVAILABLE');
    ({ sdk } = await (ports.connectWalrus ?? connect)(run, plan.project));
    p.delegatePrivateKey = '';
    data = await (ports.connectTatum ?? connectTatum)(env, 'mainnet');
    const store = new WalrusRuleStore(sdk, { owner: plan.owner, project: plan.project }, journal);
    const boundedData = { transactions: async (ids: string[]) => {
      try {
        assert(ids.every(id => plan.digests.includes(id)), 'PILOT_DIGEST_SCOPE');
        validateApproval(plan, approval);
        validateTatumBinding(approval, env.TATUM_API_KEY);
        assert((budget.state().tatumBatches + 1) * approval.tatum.creditsPerCall
          <= Math.min(4, approval.tatum.remainingCredits), 'TATUM_FREE_ALLOWANCE');
        budget.take('tatumBatches');
        return await data.transactions(ids);
      } catch (error) { budget.stop('TATUM_ERROR'); throw error; }
    } };
    const session = new ActivitySession({ owner: plan.owner, project: plan.project }, store, network => {
      assert(network === plan.network, 'PILOT_NETWORK');
      return boundedData;
    }, undefined, { wallet: plan.wallet, network: plan.network, digests: plan.digests },
    () => budget.stop('ACTIVITY_TOOL_ERROR'));
    return { session, budget, close };
  } catch (error) {
    try { budget.stop('PILOT_START_FAILED'); }
    finally { close(); }
    throw error;
  }
}
