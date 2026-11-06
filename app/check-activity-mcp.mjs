import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { configureClaude } from './claude-config.mjs';
import { Client } from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import { FIXTURE_DIGESTS, FIXTURE_WALLET, FIXTURE_OTHER } from './activity-fixtures.ts';

const directory = mkdtempSync(join(tmpdir(), 'recall-activity-mcp-'));
const configPath = join(directory, 'test-claude-config.json');
configureClaude('first', '--activity-offline', directory, configPath);
const entry = JSON.parse(readFileSync(configPath, 'utf8')).mcpServers.recall_lab;
let client;
async function open(name) {
  const transport = new StdioClientTransport(entry);
  client = new Client({ name, version: '0.1.0' });
  await client.connect(transport);
  return transport.pid;
}
async function call(name, args) {
  const response = await client.callTool({ name, arguments: args });
  assert.equal(Boolean(response.isError), false, response.content[0]?.text);
  const value = JSON.parse(response.content[0].text);
  assert.equal(value.mode, 'offline-fixture');
  return value;
}
try {
  const firstPid = await open('activity-first-client');
  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map(t => t.name).sort(),
    ['export_report', 'prepare_report', 'propose_address_rule', 'refresh_report', 'save_address_rule']);
  const save = listed.tools.find(t => t.name === 'save_address_rule');
  assert.equal(save.annotations.readOnlyHint, false);
  const first = await call('prepare_report', { network: 'mainnet', wallet: FIXTURE_WALLET,
    transactions: [FIXTURE_DIGESTS[0]] });
  assert.equal(first.rows.find(row => row.address === FIXTURE_OTHER).relation, 'unclassified');
  const proposed = await call('propose_address_rule', { reportId: first.reportId, address: FIXTURE_OTHER,
    relation: 'self', label: 'My second wallet', effectiveFrom: '2026-01-01T00:00:00.000Z', supersedes: null });
  // The protocol harness explicitly authorizes the synthetic local write.
  const stored = await call('save_address_rule', { proposalId: proposed.proposalId });
  assert.equal((await call('save_address_rule', { proposalId: proposed.proposalId })).blobId, stored.blobId);
  await client.close();

  const secondPid = await open('activity-second-client');
  assert.notEqual(firstPid, secondPid);
  const recalled = await call('prepare_report', { network: 'mainnet', wallet: FIXTURE_WALLET,
    transactions: [FIXTURE_DIGESTS[1]] });
  assert.equal(recalled.rows.find(row => row.address === FIXTURE_OTHER).memoryBlobId, stored.blobId);
  assert.equal(recalled.declaredWalletTotals[0].netAmountBaseUnits, '-1050');
  const correction = await call('propose_address_rule', { reportId: recalled.reportId, address: FIXTURE_OTHER,
    relation: 'external', label: 'External account', effectiveFrom: '2026-01-01T00:00:00.000Z',
    supersedes: proposed.preview.id });
  const corrected = await call('save_address_rule', { proposalId: correction.proposalId });
  assert.notEqual(corrected.blobId, stored.blobId);
  const final = await call('export_report', { reportId: recalled.reportId });
  assert.equal(final.report.rows.find(row => row.address === FIXTURE_OTHER).ruleId, correction.preview.id);
  assert.equal(final.report.declaredWalletTotals[0].netAmountBaseUnits, '-11000001050');
  assert.ok(final.csv.includes('External account'));
  const failed = await client.callTool({ name: 'prepare_report', arguments: { network: 'mainnet',
    wallet: FIXTURE_WALLET, transactions: [FIXTURE_DIGESTS[0], FIXTURE_DIGESTS[0]] } });
  assert.equal(failed.isError, true);
  console.log('Offline activity MCP passed: two independent processes, new transaction, persisted address explanation, correction and code-generated CSV.');
  console.log('Synthetic local data only. Model, Tatum and Walrus provider calls: 0.');
} finally {
  await client?.close();
  configureClaude('restore', '--activity-offline', directory, configPath);
  rmSync(directory, { recursive: true, force: true });
}
