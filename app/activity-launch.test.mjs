import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { includedCredits } from './activity-input.ts';
import { codexArgs } from './activity-codex.mjs';
import { FIXTURE_WALLET, FIXTURE_DIGESTS } from './activity-fixtures.ts';
const root = fileURLToPath(new URL('../', import.meta.url));
test('Codex launch disables other MCP servers without copying their settings or secrets', () => {
  const args = codexArgs('/runtime/node', '/path with spaces', '/private/run',
    [{name: 'other-tool', transport: {type: 'stdio'}, env: {SECRET: 'do-not-copy'}}]);
  assert.ok(args.some(s => s.startsWith('mcp_servers.other-tool=') && s.includes('enabled=false')));
  assert.ok(args.some(s => s.includes('default_tools_approval_mode="prompt"')));
  assert.ok(args.some(s => s.includes('tool_timeout_sec=360')));
  assert.equal(args.join(' ').includes('do-not-copy'), false);
  assert.equal(args.includes('never'), false);
  assert.ok(args.includes('features.shell_tool=false'));
});
test('live setup makes an account-bound private plan without a provider call', () => {
  const run = mkdtempSync(join(tmpdir(), 'Recall setup spaces '));
  try {
    mkdirSync(join(run, 'profile'), {mode: 0o700});
    const addr = '0x' + 'a'.repeat(64), account = 'b'.repeat(24), key = 't-' + account + '-' + 'c'.repeat(20);
    writeFileSync(join(run, 'profile/credentials.json'), JSON.stringify({version: 1,
      relayerUrl: 'https://relayer.memory.walrus.xyz', label: 'Recall Lab isolated check',
      accountId: addr, walletAddress: addr, packageId: addr, delegateAddress: '0x' + 'd'.repeat(64),
      delegatePrivateKey: 'e'.repeat(64), delegatePublicKeyHex: 'f'.repeat(64)}), {mode: 0o600});
    writeFileSync(join(run, 'tatum.key'), key, {mode: 0o600});
    const command = [join(root, 'app/activity-setup.ts'), run, FIXTURE_WALLET, ...FIXTURE_DIGESTS.slice(0,2), account, '99,976'];
    const output = spawnSync(process.execPath, command, {encoding:'utf8', timeout:15000});
    assert.equal(output.status, 0, output.stderr);
    assert.equal((output.stdout+output.stderr).includes(key), false);
    const config = JSON.parse(readFileSync(join(run, 'activity-config.json'), 'utf8'));
    assert.equal(config.approval.tatum.remainingCredits, 99976);
    assert.equal(config.mode, 'live-providers');
    assert.equal(JSON.stringify(config).includes(key), false);
    for (const [balance, message] of [['99,97', 'whole number'], ['3', 'At least 4']]) {
      const stopped = spawnSync(process.execPath, [...command.slice(0,-1), balance], {encoding:'utf8'});
      assert.equal(stopped.status, 1);
      assert.ok(stopped.stderr.includes(message));
      assert.ok(stopped.stderr.includes('has not opened'));
      assert.equal(stopped.stderr.includes(key), false);
    }
    const wrong = spawnSync(process.execPath, [...command.slice(0,-2), '0'.repeat(24), '4'], {encoding:'utf8'});
    assert.equal(wrong.status, 1);
    assert.ok(wrong.stderr.includes('TATUM_KEY_ACCOUNT'));
  } finally { rmSync(run, {recursive:true,force:true}); }
});

test('dashboard credit formatting preserves exact integers and rejects ambiguous balances', () => {
  for (const value of ['99976', '99,976', '99 976', '99\u00a0976', '99\u202f976', ' 99,976 ']) {
    assert.equal(includedCredits(value), 99976);
  }
  assert.equal(includedCredits('4'), 4);
  for (const value of ['99,97', '99.976', '99,976 / 100,000', '$99,976', '-4', '4e4', '']) {
    assert.throws(() => includedCredits(value), /TATUM_CREDITS_FORMAT/);
  }
  for (const value of ['0', '3', '99999999999999999']) {
    assert.throws(() => includedCredits(value), /TATUM_FREE_ALLOWANCE/);
  }
});
