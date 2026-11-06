import { randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';
import { profile } from './walrus.mjs';
import { address, digest } from './activity.ts';
import { canonical } from '../src/domain.ts';
import { validateActivityPlan, validateApproval, tatumKeyHash } from './activity-live.ts';
import { includedCredits } from './activity-input.ts';
import { readTatumKey } from './activity-key.ts';
import { writePilotFile } from './activity-pilot.ts';

try {
  const [run, walletInput, first, second, accountId, credits] = process.argv.slice(2);
  const p = profile(run);
  p.delegatePrivateKey = '';
  const plan = validateActivityPlan({ schema: 1, network: 'mainnet', owner: p.walletAddress, accountId: p.accountId,
    wallet: address(walletInput), project: 'recall-activity-' + randomUUID(), digests: [digest(first), digest(second)],
    maxUSD: 0, expiresAt: new Date(Date.now() + 86400000).toISOString() });
  const remainingCredits = includedCredits(credits);
  let key = readTatumKey(join(run, 'tatum.key'), accountId);
  const approval = { schema: 2 as const, planHash: createHash('sha256').update(canonical(plan)).digest('hex'),
    walrusManaged: true, checkedAt: new Date().toISOString(), tatum: { accountId, plan: 'FREE' as const,
      remainingCredits, creditsPerCall: 2 as const, keySha256: tatumKeyHash(key) } };
  key = '';
  validateApproval(plan, approval);
  writePilotFile(run, 'activity-config.json', { schema: 1, mode: 'live-providers', plan, approval, keyFile: join(run, 'tatum.key') });
  console.log('Live plan ready: 2 Tatum reads / 4 included credits, 2 sponsored writes, 2 content reads.');
} catch (error: any) {
  const reason = error?.message;
  if (reason === 'TATUM_CREDITS_FORMAT') {
    console.error('Enter the remaining included credits as a whole number, for example 99976 or 99,976.');
  } else if (reason === 'TATUM_FREE_ALLOWANCE') {
    console.error('At least 4 included Tatum credits are required. No paid fallback is enabled.');
  } else {
    console.error(typeof reason === 'string' && /^[A-Z0-9_]+$/.test(reason) ? reason : 'ACTIVITY_SETUP_STOPPED');
  }
  console.error('Setup stopped. Codex or Claude has not opened. Do not paste chat prompts into this Terminal shell.');
  process.exitCode = 1;
}
