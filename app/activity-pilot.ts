import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { constants, openSync, closeSync, fstatSync, readFileSync, writeFileSync,
  fsyncSync, renameSync, linkSync, rmSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assert, canonical, exactKeys, time } from '../src/domain.ts';
import { address, rule, report, csv } from './activity.ts';
import type { Rule } from './activity.ts';
import { ActivityBudget, openLiveActivity, validateActivityPlan, validateApproval } from './activity-live.ts';
import type { ActivityPlan, Approval } from './activity-live.ts';

export type RuleIntent = Pick<Rule, 'relation' | 'label' | 'effectiveFrom'>;
export type PilotIntent = { address: string; explanation: RuleIntent; correction: RuleIntent };
export type PilotEnvelope = { schema: 1; mode: 'offline-fixture' | 'live-providers';
  plan: ActivityPlan; approval: Approval; intent: PilotIntent; confirmedIntentHash: string };
type Handoff = { schema: 1; planHash: string; intentHash: string; writerPid: number;
  blobId: string; recordId: string; sha256: string };
export const pilotHash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const entry = fileURLToPath(import.meta.url);
const safeCode = (error: any) => [error?.code, error?.message]
  .find(value => typeof value === 'string' && /^[A-Z0-9_]{3,60}$/.test(value)) ?? 'PILOT_ERROR';

export function readPilotFile(run: string, name: string) {
  assert(/^[a-z-]+\.json$/.test(name), 'PILOT_ARTIFACT_NAME');
  const fd = openSync(join(run, name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = fstatSync(fd);
    assert(info.isFile() && info.uid === process.getuid() && (info.mode & 0o077) === 0
      && info.size > 0 && info.size <= 2097152, 'PILOT_ARTIFACT_ACCESS');
    return JSON.parse(readFileSync(fd, 'utf8'));
  } finally { closeSync(fd); }
}
export function writePilotFile(run: string, name: string, value: unknown, replace = false) {
  assert(/^[a-z-]+\.(json|csv)$/.test(name), 'PILOT_ARTIFACT_NAME');
  const temporary = join(run, '.' + name + '.tmp');
  const text = name.endsWith('.json') ? canonical(value) : String(value);
  assert(Buffer.byteLength(text) <= 2097152, 'PILOT_ARTIFACT_SIZE');
  let created = false;
  try {
    const fd = openSync(temporary, 'wx', 0o600);
    created = true;
    try { writeFileSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
    if (replace) renameSync(temporary, join(run, name));
    else linkSync(temporary, join(run, name));
  } finally { if (created) rmSync(temporary, { force: true }); }
}
export function validatePilotEnvelope(raw: PilotEnvelope) {
  exactKeys(raw, ['schema', 'mode', 'plan', 'approval', 'intent', 'confirmedIntentHash']);
  assert(raw.schema === 1 && ['offline-fixture', 'live-providers'].includes(raw.mode), 'PILOT_ENVELOPE');
  const p = validateActivityPlan(raw.plan);
  validateApproval(p, raw.approval);
  const i = raw.intent;
  exactKeys(i, ['address', 'explanation', 'correction']);
  assert(i.address === address(i.address) && i.address !== p.wallet, 'PILOT_INTENT_ADDRESS');
  for (const meaning of [i.explanation, i.correction]) {
    exactKeys(meaning, ['relation', 'label', 'effectiveFrom']);
    // Reuse the domain validator without introducing another rule schema.
    rule({ ...meaning, schema: 1, kind: 'address-rule', id: 'rule:00000000-0000-4000-8000-000000000000',
      owner: p.owner, project: p.project, network: p.network, subjectWallet: p.wallet,
      address: i.address, recordedAt: new Date().toISOString(), supersedes: null, source: 'user-confirmed' }, p);
  }
  assert(canonical(i.explanation) !== canonical(i.correction), 'PILOT_IDENTICAL_CORRECTION');
  assert(raw.confirmedIntentHash === pilotHash(i), 'PILOT_INTENT_NOT_CONFIRMED');
  return raw;
}
function claim(run: string, name: string) {
  const fd = openSync(join(run, name), 'wx', 0o600);
  try { writeFileSync(fd, String(process.pid)); fsyncSync(fd); } finally { closeSync(fd); }
}
function validateHandoff(value: Handoff, envelope: PilotEnvelope) {
  exactKeys(value, ['schema', 'planHash', 'intentHash', 'writerPid', 'blobId', 'recordId', 'sha256']);
  assert(value.schema === 1 && value.planHash === pilotHash(envelope.plan)
    && value.intentHash === envelope.confirmedIntentHash && Number.isSafeInteger(value.writerPid)
    && value.writerPid > 0 && /^[A-Za-z0-9_-]{43}$/.test(value.blobId)
    && /^rule:[a-f0-9-]{36}$/.test(value.recordId) && /^[a-f0-9]{64}$/.test(value.sha256), 'PILOT_HANDOFF');
}
function handoff(first: any): Handoff {
  return { schema: 1, planHash: first.planHash, intentHash: first.intentHash, writerPid: first.pid,
    blobId: first.receipt.blobId, recordId: first.record.id, sha256: pilotHash(first.record) };
}
function verifyMeaning(record: Rule, envelope: PilotEnvelope, meaning: RuleIntent, parent: string | null) {
  const p = envelope.plan;
  rule(record, p);
  assert(record.network === p.network && record.subjectWallet === p.wallet
    && record.address === envelope.intent.address && record.supersedes === parent
    && record.relation === meaning.relation && record.label === meaning.label
    && record.effectiveFrom === meaning.effectiveFrom, 'PILOT_MEANING_MISMATCH');
}
function verifyRead(value: any, expected: Handoff, envelope: PilotEnvelope, meaning: RuleIntent, parent: string | null) {
  const row = value.memory.find((r: any) => r.blobId === expected.blobId);
  assert(row, 'PILOT_READBACK_MISSING');
  const { blobId, ...record } = row;
  assert(record.id === expected.recordId && pilotHash(record) === expected.sha256, 'PILOT_READBACK_HASH');
  verifyMeaning(record as Rule, envelope, meaning, parent);
  const rows = value.rows.filter((r: any) => r.address === envelope.intent.address);
  assert(rows.length > 0 && rows.every((r: any) => r.ruleId === expected.recordId && r.memoryBlobId === blobId
    && r.label === meaning.label && r.relation === meaning.relation), 'PILOT_RULE_NOT_APPLIED');
}
function verifyReport(value: any, envelope: PilotEnvelope, digest: string) {
  const p = envelope.plan;
  assert(value.wallet === p.wallet && value.digests.length === 1 && value.digests[0] === digest
    && value.transactionEvidence.length === 1, 'PILOT_REPORT_BINDING');
  assert(value.transactionEvidence.every((t: any) => t.digest === digest && t.network === p.network
    && t.source === (envelope.mode === 'offline-fixture' ? 'fixture' : 'tatum')), 'PILOT_SOURCE');
  const rules = value.memory.map(({ blobId, ...record }: any) => ({ blobId, record }));
  const computed = report(value.transactionEvidence, p.wallet, rules, value.asOf);
  for (const key of Object.keys(computed)) assert(pilotHash(value[key]) === pilotHash(computed[key]), 'PILOT_REPORT_RECOMPUTE');
}

export async function runPilotWorker(run: string, phase: 'first' | 'second', mode: PilotEnvelope['mode']) {
  const envelope = validatePilotEnvelope(readPilotFile(run, 'pilot-envelope.json'));
  assert(mode === envelope.mode && ['first', 'second'].includes(phase), 'PILOT_WORKER_MODE');
  const p = envelope.plan;
  const previous: Handoff | undefined = phase === 'second' ? readPilotFile(run, 'pilot-handoff.json') : undefined;
  if (previous) {
    validateHandoff(previous, envelope);
    assert(previous.writerPid !== process.pid, 'PILOT_FRESH_PROCESS');
  }
  claim(run, 'pilot-' + phase + '.started');
  const ports = mode === 'offline-fixture'
    ? await (await import('./activity-pilot-fixture.ts')).offlinePilotPorts(run, envelope) : {};
  const env = mode === 'offline-fixture' ? { TATUM_API_KEY: 'offline-sentinel' }
    : { TATUM_API_KEY: process.env.TATUM_API_KEY };
  const runtime = await openLiveActivity(run, p, envelope.approval, env, ports);
  try {
    if (previous) runtime.session.confirmedBlobs.add(previous.blobId);
    const prepared = await runtime.session.prepare(p.network, p.wallet, [p.digests[phase === 'first' ? 0 : 1]]);
    verifyReport(prepared, envelope, prepared.digests[0]);
    const observed = prepared.rows.filter(r => r.address === envelope.intent.address);
    assert(observed.some(r => BigInt(r.netAmountBaseUnits) !== 0n), 'PILOT_ADDRESS_NOT_OBSERVED');
    assert([envelope.intent.explanation, envelope.intent.correction]
      .every(i => time(i.effectiveFrom) <= time(prepared.transactionEvidence[0].timestamp)), 'PILOT_EFFECTIVE_DATE');
    if (!previous) assert(prepared.memory.length === 0, 'PILOT_NAMESPACE_NOT_EMPTY');
    else {
      assert(prepared.memory.length === 1, 'PILOT_UNEXPECTED_CORPUS');
      verifyRead(prepared, previous, envelope, envelope.intent.explanation, null);
    }
    const meaning = phase === 'first' ? envelope.intent.explanation : envelope.intent.correction;
    const proposal = await runtime.session.propose(prepared.reportId, envelope.intent.address, meaning.relation,
      meaning.label, meaning.effectiveFrom, previous?.recordId ?? null);
    verifyMeaning(proposal.preview, envelope, meaning, previous?.recordId ?? null);
    const receipt = await runtime.session.save(proposal.proposalId);
    const result: any = { schema: 1, mode, phase, pid: process.pid, planHash: pilotHash(p),
      intentHash: envelope.confirmedIntentHash, report: prepared, record: proposal.preview, receipt };
    if (previous) {
      const exported = await runtime.session.export(prepared.reportId);
      assert(exported.report.memory.length === 2, 'PILOT_UNEXPECTED_CORPUS');
      const corrected = handoff(result);
      verifyRead(exported.report, corrected, envelope, envelope.intent.correction, previous.recordId);
      const root = exported.report.memory.find((r: any) => r.blobId === previous.blobId);
      assert(root, 'PILOT_READBACK_MISSING');
      const { blobId, ...rootRecord } = root;
      assert(pilotHash(rootRecord) === previous.sha256, 'PILOT_READBACK_HASH');
      verifyReport(exported.report, envelope, p.digests[1]);
      for (const key of ['transactionEvidence', 'totals', 'gas']) {
        assert(pilotHash(prepared[key]) === pilotHash(exported.report[key]), 'PILOT_CHAIN_FACTS_CHANGED');
      }
      assert(exported.csv === csv(exported.report), 'PILOT_CSV_MISMATCH');
      result.exported = exported;
    }
    const name = phase + '-result.json';
    writePilotFile(run, name, result);
    return { artifact: name, sha256: pilotHash(result), pid: process.pid };
  } catch (error) {
    runtime.budget.stop('PILOT_WORKER_FAILED');
    throw error;
  } finally { runtime.close(); }
}

export type WorkerLaunch = (run: string, phase: 'first' | 'second', mode: PilotEnvelope['mode']) => Promise<any>;
export const launchPilotWorker: WorkerLaunch = (run, phase, mode) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', entry, '--worker', mode, run, phase],
    { env: { PATH: '/usr/bin:/bin', ...(mode === 'live-providers' ? { TATUM_API_KEY: process.env.TATUM_API_KEY } : {}) },
      stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', diagnostic = '', size = 0, failed = false;
  const stop = (code: string) => { if (!failed) { failed = true; child.kill('SIGKILL'); reject(Error(code)); } };
  const timer = setTimeout(() => stop('PILOT_WORKER_TIMEOUT'), 360000);
  const collect = (buffer: Buffer, stdout: boolean) => {
    size += buffer.length;
    if (size > 16384) { stop('PILOT_WORKER_OUTPUT_LIMIT'); return; }
    if (stdout) output += buffer.toString();
    else diagnostic += buffer.toString();
  };
  child.stdout.on('data', b => collect(b, true));
  child.stderr.on('data', b => collect(b, false));
  child.once('error', () => { clearTimeout(timer); stop('PILOT_WORKER_START'); });
  child.once('close', code => {
    clearTimeout(timer);
    if (failed) return;
    if (code !== 0) {
      const error: any = Error('PILOT_WORKER_FAILED');
      try { error.code = safeCode(JSON.parse(diagnostic)); } catch { error.code = 'PILOT_WORKER_FAILED'; }
      reject(error); return;
    }
    try {
      const proof = JSON.parse(output);
      assert(proof.pid === child.pid, 'PILOT_WORKER_PID');
      resolve(proof);
    } catch { reject(Error('PILOT_WORKER_PROTOCOL')); }
  });
});

export async function runActivityPilot(run: string, raw: PilotEnvelope, launch: WorkerLaunch = launchPilotWorker) {
  const envelope = validatePilotEnvelope(raw);
  const info = lstatSync(run);
  assert(info.isDirectory() && info.uid === process.getuid() && (info.mode & 0o077) === 0, 'PILOT_DIRECTORY');
  // Claim the run before spawning. No automatic resume after a crash or timeout.
  claim(run, 'pilot.started');
  const budget = new ActivityBudget(run, envelope.plan);
  let activePhase = 'initial';
  try {
    const initial = budget.state();
    assert(initial.stopped === null && initial.writes === 0 && initial.reads === 0
      && initial.tatumBatches === 0 && initial.requests === 0, 'PILOT_NOT_FRESH');
    for (const name of ['pilot-envelope.json', 'pilot-handoff.json', 'first-result.json', 'second-result.json',
      'pilot-result.json', 'pilot-stop.json', 'report.csv', 'pilot-first.started', 'pilot-second.started', 'fixture-relayer.json']) {
      assert(!lstatSync(join(run, name), { throwIfNoEntry: false }), 'PILOT_ARTIFACT_EXISTS');
    }
    writePilotFile(run, 'pilot-envelope.json', envelope);
    const results: any[] = [];
    for (const phase of ['first', 'second'] as const) {
      activePhase = phase;
      const proof = await launch(run, phase, envelope.mode);
      assert(proof.artifact === phase + '-result.json' && proof.pid !== process.pid, 'PILOT_WORKER_PROOF');
      const result = readPilotFile(run, proof.artifact);
      assert(pilotHash(result) === proof.sha256 && result.pid === proof.pid && result.phase === phase
        && result.mode === envelope.mode && result.planHash === pilotHash(envelope.plan)
        && result.intentHash === envelope.confirmedIntentHash, 'PILOT_WORKER_PROOF');
      assert(!results.some(r => r.pid === result.pid), 'PILOT_FRESH_PROCESS');
      verifyReport(result.report, envelope, envelope.plan.digests[phase === 'first' ? 0 : 1]);
      verifyMeaning(result.record, envelope, phase === 'first' ? envelope.intent.explanation : envelope.intent.correction,
        phase === 'first' ? null : results[0].record.id);
      const next = handoff(result);
      validateHandoff(next, envelope);
      results.push(result);
      if (phase === 'first') writePilotFile(run, 'pilot-handoff.json', next);
      else {
        assert(result.report.memory.length === 1 && result.exported.report.memory.length === 2,
          'PILOT_UNEXPECTED_CORPUS');
        verifyRead(result.report, handoff(results[0]), envelope, envelope.intent.explanation, null);
        verifyRead(result.exported.report, next, envelope, envelope.intent.correction, results[0].record.id);
        verifyReport(result.exported.report, envelope, envelope.plan.digests[1]);
        for (const key of ['transactionEvidence', 'totals', 'gas']) {
          assert(pilotHash(result.report[key]) === pilotHash(result.exported.report[key]), 'PILOT_CHAIN_FACTS_CHANGED');
        }
        assert(result.exported.csv === csv(result.exported.report), 'PILOT_CSV_MISMATCH');
      }
    }
    const counts = budget.state();
    assert(counts.stopped === null && counts.writes === 2 && counts.reads === 2 && counts.tatumBatches === 2,
      'PILOT_COUNTS');
    assert(new Set(results.map(r => r.receipt.blobId)).size === 2
      && canonical(Object.keys(counts.jobs).sort()) === canonical(results.map(r => r.receipt.jobId).sort())
      && Object.values(counts.jobs).every(n => n > 0), 'PILOT_RECEIPT_LEDGER');
    const final = results[1].exported;
    writePilotFile(run, 'report.csv', final.csv);
    const summary = { schema: 1, status: envelope.mode === 'offline-fixture' ? 'VERIFIED_OFFLINE' : 'VERIFIED_PROVIDER_PATH',
      mode: envelope.mode, planHash: pilotHash(envelope.plan), intentHash: envelope.confirmedIntentHash,
      parentPid: process.pid, workerPids: results.map(r => r.pid), records: results.map(handoff),
      receipts: results.map(r => ({ recordId: r.record.id, ...r.receipt })),
      csvSha256: createHash('sha256').update(final.csv).digest('hex'), reportSha256: pilotHash(final.report),
      counts, modelRequests: 0, approvedMaxSpendUSD: 0 };
    writePilotFile(run, 'pilot-result.json', summary);
    return summary;
  } catch (error) {
    budget.stop('PILOT_FAILED');
    try {
      writePilotFile(run, 'pilot-stop.json', { status: 'STOPPED', mode: envelope.mode,
        phase: activePhase, code: safeCode(error), counts: budget.state() });
    } catch { throw Error('PILOT_STOP_EVIDENCE_FAILED', { cause: error }); }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, mode, run, phase] = process.argv.slice(2);
  const main = async () => {
    if (command === '--offline-example' && mode && !run) {
      const { offlinePilotEnvelope } = await import('./activity-pilot-fixture.ts');
      const result = await runActivityPilot(mode, offlinePilotEnvelope());
      console.log('Synthetic activity pilot completed. Real model and provider calls: 0.');
      console.log('Report directory: ' + mode);
      console.log(JSON.stringify(result, null, 2));
    } else {
      assert(command === '--worker', 'PILOT_WORKER_ONLY');
      console.log(JSON.stringify(await runPilotWorker(run, phase as any, mode as any)));
    }
  };
  main().catch(error => { console.error(JSON.stringify({ code: safeCode(error) })); process.exitCode = 1; });
}
