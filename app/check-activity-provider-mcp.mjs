import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { configureClaude } from './claude-config.mjs';
import { Client } from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import { offlinePilotEnvelope } from './activity-pilot-fixture.ts';
import { writePilotFile, readPilotFile } from './activity-pilot.ts';
import { FIXTURE_OTHER } from './activity-fixtures.ts';

const run = mkdtempSync(join(tmpdir(), 'Recall provider MCP '));
const e = offlinePilotEnvelope();
writePilotFile(run, 'activity-config.json', { schema: 1, mode: e.mode, plan: e.plan, approval: e.approval, keyFile: null });
const settings = join(run, 'claude-config.json');
configureClaude('first', '--activity-provider-fixture', run, settings);
const entry = JSON.parse(readFileSync(settings, 'utf8')).mcpServers.recall_lab;
let client;
async function open() {
  const transport = new StdioClientTransport(entry);
  client = new Client({ name: 'activity-provider-integration', version: '2.0.0' });
  await client.connect(transport);
  return transport.pid;
}
async function call(name, args) {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 360000 });
  assert.equal(Boolean(result.isError), false, result.content[0]?.text);
  const value = JSON.parse(result.content[0].text);
  assert.equal(value.mode, 'offline-provider-fixture');
  return value;
}
try {
  const firstPid = await open();
  const first = await call('prepare_report', { network: e.plan.network, wallet: e.plan.wallet, transactions: [e.plan.digests[0]] });
  const proposed = await call('propose_address_rule', { reportId: first.reportId, address: FIXTURE_OTHER,
    ...e.intent.explanation, supersedes: null });
  const receipt = await call('save_address_rule', { proposalId: proposed.proposalId });
  await client.close();

  const secondPid = await open();
  assert.notEqual(firstPid, secondPid);
  const second = await call('prepare_report', { network: e.plan.network, wallet: e.plan.wallet, transactions: [e.plan.digests[1]] });
  assert.equal(second.memory.length, 1);
  assert.equal(second.memory[0].blobId, receipt.blobId);
  assert.equal(second.rows.find(r => r.address === FIXTURE_OTHER).relation, 'self');
  const corrected = await call('propose_address_rule', { reportId: second.reportId, address: FIXTURE_OTHER,
    ...e.intent.correction, supersedes: second.memory[0].id });
  await call('save_address_rule', { proposalId: corrected.proposalId });
  const exported = await call('export_report', { reportId: second.reportId });
  assert.equal(exported.report.memory.length, 2);
  assert.equal(exported.report.rows.find(r => r.address === FIXTURE_OTHER).ruleId, corrected.preview.id);
  assert.equal(exported.report.declaredWalletTotals[0].netAmountBaseUnits, '-11000001050');
  const counts = readPilotFile(run, 'activity-budget.json');
  assert.equal(counts.tatumBatches, 2);
  assert.equal(counts.writes, 2);
  assert.equal(counts.reads, 2);
  assert.equal(counts.stopped, null);
  for (const file of readdirSync(join(run, 'activity-jobs'))) {
    const saved = JSON.parse(readFileSync(join(run, 'activity-jobs', file), 'utf8'));
    assert.equal(saved.state, 'done');
    assert.equal('text' in saved, false);
    assert.equal('label' in saved, false);
  }
  console.log('Provider MCP path passed: independent client processes, persistent receipt-only journal, exact recalled content, correction and CSV. External provider/model calls: 0.');
} finally {
  await client?.close();
  configureClaude('restore', '--activity-provider-fixture', run, settings);
  rmSync(run, { recursive: true, force: true });
}
