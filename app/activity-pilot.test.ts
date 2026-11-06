import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runActivityPilot, launchPilotWorker, validatePilotEnvelope, pilotHash, readPilotFile, writePilotFile } from './activity-pilot.ts';
import type { PilotEnvelope } from './activity-pilot.ts';
import { ActivityBudget } from './activity-live.ts';
import { FIXTURE_OTHER } from './activity-fixtures.ts';
import { offlinePilotEnvelope } from './activity-pilot-fixture.ts';

globalThis.fetch = () => { throw Error('OFFLINE_NETWORK_DENIED'); };
const directory = () => mkdtempSync(join(tmpdir(), 'Recall pilot clean '));
const envelope = offlinePilotEnvelope;

test('two independent pilot workers verify provider readback, correction and deterministic CSV offline', async () => {
  const dir = directory();
  try {
    const e = envelope();
    const result = await runActivityPilot(dir, e);
    assert.equal(result.status, 'VERIFIED_OFFLINE');
    assert.equal(new Set(result.workerPids).size, 2);
    assert.ok(result.workerPids.every(pid => pid !== process.pid));
    assert.equal(result.modelRequests, 0);
    assert.equal(result.approvedMaxSpendUSD, 0);
    assert.equal(result.counts.writes, 2);
    assert.equal(result.counts.reads, 2);
    assert.equal(result.counts.tatumBatches, 2);
    const h = readPilotFile(dir, 'pilot-handoff.json');
    assert.deepEqual(Object.keys(h).sort(), ['schema', 'planHash', 'intentHash', 'writerPid', 'blobId', 'recordId', 'sha256'].sort());
    assert.ok(!JSON.stringify(h).includes('Test second wallet'));
    const final = readPilotFile(dir, 'second-result.json');
    assert.equal(final.report.rows.find((r: any) => r.address === FIXTURE_OTHER).relation, 'self');
    assert.equal(final.exported.report.rows.find((r: any) => r.address === FIXTURE_OTHER).relation, 'external');
    assert.equal(final.exported.report.declaredWalletTotals[0].netAmountBaseUnits, '-11000001050');
    assert.equal(readFileSync(join(dir, 'report.csv'), 'utf8'), final.exported.csv);
    assert.deepEqual(readPilotFile(dir, 'pilot-result.json'), result);
    await assert.rejects(runActivityPilot(dir, e), /EEXIST/);
    assert.equal(new ActivityBudget(dir, e.plan).state().writes, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('changed confirmation or missing free-account evidence refuses all worker launches', async () => {
  for (const mutate of [(e: PilotEnvelope) => { e.intent.explanation.label = 'changed'; },
    (e: PilotEnvelope) => { e.approval.walrusManaged = false; }]) {
    const dir = directory();
    let launches = 0;
    try {
      const e = envelope(); mutate(e);
      await assert.rejects(runActivityPilot(dir, e, async () => { launches++; }));
      assert.equal(launches, 0);
      assert.equal(existsSync(join(dir, 'pilot.started')), false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test('a receipt hash mismatch blocks correction even when the returned blob ID matches', async () => {
  const dir = directory();
  const e = envelope();
  try {
    await assert.rejects(runActivityPilot(dir, e, async (run, phase, mode) => {
      if (phase === 'second') {
        const state = readPilotFile(run, 'fixture-relayer.json');
        const record = JSON.parse(state.records[0].text);
        record.label = 'Tampered service content';
        state.records[0].text = JSON.stringify(record);
        writePilotFile(run, 'fixture-relayer.json', state, true);
      }
      return launchPilotWorker(run, phase, mode);
    }), /PILOT_WORKER_FAILED/);
    assert.equal(new ActivityBudget(dir, e.plan).state().writes, 1);
    assert.equal(existsSync(join(dir, 'pilot-result.json')), false);
    assert.equal(readPilotFile(dir, 'pilot-stop.json').code, 'MEMORY_READBACK_HASH');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('missing indexed memory stops the second worker without a correction write', async () => {
  const dir = directory();
  const e = envelope();
  try {
    await assert.rejects(runActivityPilot(dir, e, async (run, phase, mode) => {
      if (phase === 'second') {
        const state = readPilotFile(run, 'fixture-relayer.json');
        state.records = [];
        state.revision++;
        writePilotFile(run, 'fixture-relayer.json', state, true);
      }
      return launchPilotWorker(run, phase, mode);
    }), /PILOT_WORKER_FAILED/);
    assert.equal(new ActivityBudget(dir, e.plan).state().writes, 1);
    assert.equal(existsSync(join(dir, 'report.csv')), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('interruption between processes preserves the first receipt and refuses automatic resume', async () => {
  const dir = directory();
  const e = envelope();
  try {
    await assert.rejects(runActivityPilot(dir, e, async (run, phase, mode) => {
      if (phase === 'second') throw Error('PILOT_WORKER_TIMEOUT');
      return launchPilotWorker(run, phase, mode);
    }), /PILOT_WORKER_TIMEOUT/);
    assert.equal(new ActivityBudget(dir, e.plan).state().writes, 1);
    assert.ok(readPilotFile(dir, 'pilot-handoff.json').blobId);
    await assert.rejects(runActivityPilot(dir, e), /EEXIST/);
    assert.equal(existsSync(join(dir, 'pilot-result.json')), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('pilot envelope does not accept arbitrary rule fields or identical correction meanings', () => {
  const extra = envelope();
  (extra.intent.explanation as any).shell = 'ignored command';
  extra.confirmedIntentHash = pilotHash(extra.intent);
  assert.throws(() => validatePilotEnvelope(extra), /INVALID_KEYS/);
  const same = envelope();
  same.intent.correction = { ...same.intent.explanation };
  same.confirmedIntentHash = pilotHash(same.intent);
  assert.throws(() => validatePilotEnvelope(same), /PILOT_IDENTICAL_CORRECTION/);
});

test('an altered worker proof prevents launching the second process', async () => {
  const dir = directory();
  const e = envelope();
  let launches = 0;
  try {
    await assert.rejects(runActivityPilot(dir, e, async (run, phase, mode) => {
      launches++;
      const result = await launchPilotWorker(run, phase, mode);
      return { ...result, sha256: '0'.repeat(64) };
    }), /PILOT_WORKER_PROOF/);
    assert.equal(launches, 1);
    assert.equal(new ActivityBudget(dir, e.plan).state().writes, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('existing output files are preserved and no worker starts', async () => {
  const dir = directory();
  let launches = 0;
  try {
    writePilotFile(dir, 'report.csv', 'existing report');
    await assert.rejects(runActivityPilot(dir, envelope(), async () => { launches++; }), /PILOT_ARTIFACT_EXISTS/);
    assert.equal(launches, 0);
    assert.equal(readFileSync(join(dir, 'report.csv'), 'utf8'), 'existing report');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
