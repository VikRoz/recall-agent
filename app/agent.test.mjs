import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import { offlineAgent } from './agent-mcp.mjs';
import { agentArgs } from './agent-launch.mjs';
import { FIXTURE_WALLET, FIXTURE_OTHER, FIXTURE_DIGESTS } from './activity-fixtures.ts';
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = () => mkdtempSync(join(tmpdir(), 'recall-agent-test-'));
const prepare = session => session.prepare('mainnet', FIXTURE_WALLET, [FIXTURE_DIGESTS[0]]);

test('launcher supplies no positional task, model, digest or first-tool instruction', () => {
  const args = agentArgs('/node', '/root', '/workspace', []);
  for (let i = 0; i < args.length; i += 2) {
    assert.ok(['-C', '-s', '-a', '-c'].includes(args[i]));
    assert.equal(typeof args[i + 1], 'string');
  }
  assert.ok(args.some(a => a.includes('agent-mcp.mjs')));
  assert.equal(args.some(a => a.includes('--capture-local')), false);
  assert.ok(agentArgs('/node', '/root', '/workspace', [], true).some(a => a.includes('--capture-local')));
  assert.ok(agentArgs('/node', '/root', '/workspace', [], false, 'saved').some(a => a.includes('--saved')));
  assert.equal(args.some(a => /After the first|second transaction|fresh second conversation/.test(a)), false);
});

test('export can follow report immediately; missing report is recoverable without any forced save', async () => {
  const dir = directory();
  try {
    const { session } = offlineAgent(dir, false);
    await assert.rejects(session.export('unknown'), /REPORT_NOT_FOUND/);
    const report = await prepare(session);
    assert.ok((await session.export(report.reportId)).csv);
    assert.deepEqual(await session.experience.read(), []);
    assert.equal(session.stopped, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('verified mismatch auto-captures only with consent and correction links the original', async () => {
  const dir = directory();
  try {
    const { session } = offlineAgent(dir, false);
    const report = await prepare(session);
    assert.equal((await session.verifyGasPayer(report.reportId, FIXTURE_DIGESTS[0], FIXTURE_OTHER)).memory, null);
    assert.deepEqual(await session.experience.read(), []);
    session.capture = true;
    const failure = await session.verifyGasPayer(report.reportId, FIXTURE_DIGESTS[0], FIXTURE_OTHER);
    assert.equal(failure.verdict, 'fail');
    assert.equal(failure.memory.storage, 'local-fixture');
    assert.deepEqual(await session.verifyGasPayer(report.reportId, FIXTURE_DIGESTS[0], FIXTURE_OTHER), failure);
    const correction = await session.verifyGasPayer(report.reportId, FIXTURE_DIGESTS[0], FIXTURE_WALLET);
    assert.equal(correction.verdict, 'pass');
    const rows = await session.experience.read();
    assert.equal(rows.length, 2);
    assert.equal(rows[1].record.supersedes, rows[0].id);
    assert.equal((await session.verifyGasPayer(report.reportId, FIXTURE_DIGESTS[0], FIXTURE_WALLET)).memory, null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('correct claim without prior failure creates no experience', async () => {
  const dir = directory();
  try {
    const { session } = offlineAgent(dir, true);
    const report = await prepare(session);
    assert.equal((await session.verifyGasPayer(report.reportId, FIXTURE_DIGESTS[0], FIXTURE_WALLET)).verdict, 'pass');
    assert.deepEqual(await session.experience.read(), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('integrity failure stops this session; unrelated network excludes memory', async () => {
  const dir = directory();
  try {
    const { session } = offlineAgent(dir, true);
    const r = await prepare(session);
    await session.verifyGasPayer(r.reportId, FIXTURE_DIGESTS[0], FIXTURE_OTHER);
    const fresh = offlineAgent(dir, true).session;
    const unrelated = await fresh.prepare('testnet', FIXTURE_WALLET, [FIXTURE_DIGESTS[1]]);
    assert.deepEqual(unrelated.experience, []);
    const rows = JSON.parse(readFileSync(join(dir, 'experience.json')));
    rows[0].record.observed = FIXTURE_OTHER;
    writeFileSync(join(dir, 'experience.json'), JSON.stringify(rows));
    await assert.rejects(fresh.refresh(unrelated.reportId), /EXPERIENCE/);
    await assert.rejects(fresh.export(unrelated.reportId), /AGENT_STOPPED/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('independent MCP processes retain exact experience without applying a literal payer to another transaction', async () => {
  const dir = directory();
  let client;
  async function open() {
    client = new Client({ name: 'agent-offline-test', version: '1' });
    const transport = new StdioClientTransport({ command: process.execPath,
      args: ['--disable-warning=ExperimentalWarning', join(root, 'app/agent-mcp.mjs'), '--offline', dir, '--capture-local'] });
    await client.connect(transport);
    return transport.pid;
  }
  async function call(name, args) {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(Boolean(result.isError), false, result.content[0]?.text);
    return JSON.parse(result.content[0].text);
  }
  try {
    const firstPid = await open();
    const tools = await client.listTools();
    assert.equal(tools.tools.find(t => t.name === 'verify_gas_payer').annotations.readOnlyHint, false);
    const r = await call('prepare_report', { network: 'mainnet', wallet: FIXTURE_WALLET, transactions: [FIXTURE_DIGESTS[0]] });
    const failed = await call('verify_gas_payer', { reportId: r.reportId, transaction: FIXTURE_DIGESTS[0], claimedPayer: FIXTURE_OTHER });
    const corrected = await call('verify_gas_payer', { reportId: r.reportId, transaction: FIXTURE_DIGESTS[0], claimedPayer: FIXTURE_WALLET });
    await client.close();
    const secondPid = await open();
    assert.notEqual(firstPid, secondPid);
    const next = await call('prepare_report', { network: 'mainnet', wallet: FIXTURE_WALLET, transactions: [FIXTURE_DIGESTS[1]] });
    assert.deepEqual(next.experience, []);
    const same = await call('prepare_report', { network: 'mainnet', wallet: FIXTURE_WALLET, transactions: [FIXTURE_DIGESTS[0]] });
    assert.deepEqual(same.experience.map(row => row.id), [failed.memory.id, corrected.memory.id]);
    assert.equal(same.experience[1].record.supersedes, failed.memory.id);
    assert.ok((await call('export_report', { reportId: next.reportId })).csv);
    assert.equal(next.experienceStorage, 'local-fixture');
  } finally { await client?.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('real Walrus writer seam verifies typed experience, receipts, admission and uncertain-write stop offline', async () => {
  const { WalrusRecordStore, FileWriteJournal } = await import('./activity-memory.ts');
  const { WalrusExperienceStore, validateExperience } = await import('./agent-experience.ts');
  const dir = directory();
  try {
    const binding = { owner: FIXTURE_WALLET, project: 'agent-transport-test' };
    let admitted = false, remembers = 0, payload;
    const sdk = {
      listMemories: async () => ({ snapshot_version: 1, has_more: false, must_resync: false, memories: [] }),
      remember: async text => { remembers++; payload = JSON.parse(text); return { job_id: 'test-job' }; },
      getRememberStatus: async () => ({ job_id: 'test-job', status: 'done', blob_id: 'b'.repeat(43), owner: binding.owner, namespace: binding.project }),
    };
    const port = new WalrusRecordStore(sdk, binding, new FileWriteJournal(dir), (r, b) => validateExperience(r, b.project), async () => {});
    const store = new WalrusExperienceStore(port, async () => { assert.equal(admitted, true, 'NOT_ADMITTED'); });
    const record = { schema: 'recall-experience/1', workspace: binding.project, network: 'mainnet', operation: 'gas-payer', source: 'tatum',
      digest: FIXTURE_DIGESTS[0], sponsored: false, claimed: FIXTURE_OTHER, observed: FIXTURE_WALLET, verdict: 'fail', supersedes: null };
    await assert.rejects(store.write(record), /NOT_ADMITTED/);
    assert.equal(remembers, 0);
    admitted = true;
    const saved = await store.write(record);
    assert.equal(saved.blobId, 'b'.repeat(43));
    assert.deepEqual(payload, record);
    sdk.listMemories = async () => ({ snapshot_version: 2, has_more: false, must_resync: false,
      memories: [{ namespace_id: binding.project, blob_id: saved.blobId, status: 'stored' }] });
    sdk.recall = async () => ({ results: [{ blob_id: saved.blobId, text: JSON.stringify(record) }] });
    assert.deepEqual((await store.read())[0].record, record);
    assert.equal((await store.write(record)).blobId, saved.blobId);
    assert.equal(remembers, 1);
    const bad = { ...record, workspace: 'foreign' };
    await assert.rejects(store.write(bad), /SCOPE/);
    sdk.getRememberStatus = async () => { throw Error('OFFLINE_TIMEOUT'); };
    const correction = { ...record, claimed: FIXTURE_WALLET, verdict: 'resolved', supersedes: saved.id };
    await assert.rejects(store.write(correction), /OFFLINE_TIMEOUT/);
    await assert.rejects(store.write(correction), /WRITE_OUTCOME_UNCERTAIN/);
    assert.equal(remembers, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
