import { existsSync, lstatSync, realpathSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assert, canonical, exactKeys } from '../src/domain.ts';
import { ActivityBudget, validateActivityPlan, validateApproval, validateTatumBinding } from './activity-live.ts';
import { FileWriteJournal } from './activity-memory.ts';
import { readPilotFile, writePilotFile } from './activity-pilot.ts';
import { includedCredits } from './activity-input.ts';
import { readTatumKey } from './activity-key.ts';
import { profile } from './walrus.mjs';

// Continue only the explicitly approved boundary: first write settled, second conversation not started.
export function inspectContinuation(run: string) {
  assert(/^\/private\/tmp\/recall-activity-live\.[A-Za-z0-9]{8}$/.test(run)
    && realpathSync(run) === run, 'CONTINUE_DIRECTORY');
  const stat = lstatSync(run);
  assert(stat.isDirectory() && stat.uid === process.getuid() && (stat.mode & 0o077) === 0, 'CONTINUE_DIRECTORY');
  const config = readPilotFile(run, 'activity-config.json');
  exactKeys(config, ['schema', 'mode', 'plan', 'approval', 'keyFile']);
  assert(config.schema === 1 && config.mode === 'live-providers' && config.keyFile === join(run, 'tatum.key'), 'CONTINUE_BINDING');
  validateActivityPlan(config.plan);
  // Check the old fields/binding without pretending its old billing evidence is still fresh.
  validateApproval(config.plan, { ...config.approval, checkedAt: new Date().toISOString() });
  const p = profile(run);
  p.delegatePrivateKey = '';
  assert(p.accountId === config.plan.accountId && p.walletAddress === config.plan.owner, 'CONTINUE_ACCOUNT');
  readPilotFile(run, 'activity-budget.json'); // Require an existing budget before constructing its reader.
  const budget = new ActivityBudget(run, config.plan).state();
  assert(budget.stopped === null && budget.tatumBatches === 1 && budget.writes === 1 && budget.reads === 0,
    'CONTINUE_STAGE');
  assert(lstatSync(join(run, 'activity-jobs')).isDirectory(), 'CONTINUE_JOURNAL');
  const proofs = new FileWriteJournal(run).proofs();
  assert(proofs.length === 1 && Object.keys(budget.jobs).length === 1, 'CONTINUE_RECEIPT');
  const receiptFile = readdirSync(join(run, 'activity-jobs')).find(name => name.endsWith('.json'))!;
  const receipt = JSON.parse(readFileSync(join(run, 'activity-jobs', receiptFile), 'utf8'));
  assert(Object.hasOwn(budget.jobs, receipt.jobId) && receipt.blobId === proofs[0].blobId, 'CONTINUE_RECEIPT');
  assert(!existsSync(join(run, 'activity-continue.json')) && !existsSync(join(run, 'activity-config-before-continue.json')),
    'CONTINUE_ALREADY_ATTEMPTED');
  return { config, budget, proofs };
}

export function renewContinuation(run: string, credits: string) {
  const before = inspectContinuation(run);
  let key = readTatumKey(before.config.keyFile, before.config.approval.tatum.accountId);
  validateTatumBinding(before.config.approval, key);
  key = '';
  const approval = { ...before.config.approval, checkedAt: new Date().toISOString(),
    tatum: { ...before.config.approval.tatum, remainingCredits: includedCredits(credits) } };
  validateApproval(before.config.plan, approval);
  writePilotFile(run, 'activity-config-before-continue.json', before.config);
  writePilotFile(run, 'activity-continue.json', { schema: 1, checkedAt: approval.checkedAt,
    previousCheckedAt: before.config.approval.checkedAt, planHash: before.budget.planHash,
    countersBefore: before.budget, expectedReceipts: before.proofs, maxUSD: 0 });
  writePilotFile(run, 'activity-config.json', { ...before.config, approval }, true);
  assert(canonical(new ActivityBudget(run, before.config.plan).state()) === canonical(before.budget), 'CONTINUE_BUDGET_CHANGED');
  assert(canonical(new FileWriteJournal(run).proofs()) === canonical(before.proofs), 'CONTINUE_RECEIPT_CHANGED');
  return { planHash: before.budget.planHash, remaining: { tatumReads: 1, writes: 1, contentReads: 2 },
    firstBlobId: before.proofs[0].blobId };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [action, run, credits] = process.argv.slice(2);
    assert(['--inspect', '--renew'].includes(action), 'CONTINUE_ACTION');
    if (action === '--renew') console.log(JSON.stringify(renewContinuation(run, credits)));
    else {
      const state = inspectContinuation(run);
      console.log(JSON.stringify({ planHash: state.budget.planHash, firstBlobId: state.proofs[0].blobId,
        remaining: { tatumReads: 1, writes: 1, contentReads: 2 }, requiresFreshBillingAndSameKey: true }));
    }
  } catch (error: any) {
    const code = [error?.message, error?.code].find(v => typeof v === 'string' && /^[A-Z0-9_]{3,60}$/.test(v));
    console.error(code ?? 'CONTINUE_STOPPED'); process.exitCode = 1;
  }
}
