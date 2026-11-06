import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readTatumKey } from './activity-key.ts';

test('Tatum input stays private, account-bound and never follows a symlink', () => {
  const dir = mkdtempSync(join(tmpdir(), 'recall-key-test-'));
  const path = join(dir, 'key');
  const account = '0'.repeat(24);
  const key = 't-' + account + '-offline-placeholder';
  try {
    writeFileSync(path, key, { mode: 0o600 });
    assert.equal(readTatumKey(path, account), key);
    assert.throws(() => readTatumKey(path, '1'.repeat(24)), /TATUM_KEY_ACCOUNT/);
    chmodSync(path, 0o644);
    assert.throws(() => readTatumKey(path, account), /TATUM_KEY_FILE/);
    chmodSync(path, 0o600);
    symlinkSync(path, join(dir, 'link'));
    assert.throws(() => readTatumKey(join(dir, 'link'), account));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
