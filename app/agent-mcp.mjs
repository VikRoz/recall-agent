import { realpathSync, lstatSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { StdioServerTransport } from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import { z } from '../mcp/node_modules/zod/index.js';
import { activityServer } from './activity-mcp.mjs';
import { FixtureRuleStore } from './activity-fixture-store.ts';
import { FixtureActivityData, FIXTURE_WALLET } from './activity-fixtures.ts';
import { LocalExperienceStore } from './agent-experience.ts';
import { AgentSession } from './agent-session.ts';
import { assert } from '../src/domain.ts';

export function offlineAgent(directory, capture) {
  const file = join(directory, 'agent-workspace.json');
  if (!existsSync(file)) writeFileSync(file, JSON.stringify({ schema: 1, project: 'agent-' + randomUUID() }), { flag: 'wx', mode: 0o600 });
  assert(lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink() && lstatSync(file).size < 1024, 'WORKSPACE_FILE');
  const config = JSON.parse(readFileSync(file, 'utf8'));
  assert(config.schema === 1 && /^agent-[a-f0-9-]{36}$/.test(config.project), 'WORKSPACE_BINDING');
  const binding = { owner: FIXTURE_WALLET, project: config.project };
  const session = new AgentSession(binding, new FixtureRuleStore(directory, binding), n => new FixtureActivityData(n));
  session.experience = new LocalExperienceStore(directory, config.project);
  session.capture = capture;
  const server = activityServer(session, 'offline-agent-fixture');
  server.registerTool('verify_gas_payer', {
    description: 'Check a proposed gas-payer address against transaction evidence in an existing report. A verified mismatch and its verified resolution can be saved automatically when local capture is enabled. Returned local IDs are not Walrus receipts.',
    inputSchema: { reportId: z.string().max(120), transaction: z.string().max(200), claimedPayer: z.string().max(66) },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async args => {
    try { return { content: [{ type: 'text', text: JSON.stringify(await session.verifyGasPayer(args.reportId, args.transaction, args.claimedPayer)) }] }; }
    catch (error) { return { isError: true, content: [{ type: 'text', text: /^[A-Z0-9_]+$/.test(error?.code) ? error.code : 'AGENT_ERROR' }] }; }
  });
  return { session, server };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [mode, path, consent] = process.argv.slice(2);
    assert(mode === '--offline' && path && [undefined, '--capture-local'].includes(consent), 'OFFLINE_AGENT_ONLY');
    const directory = realpathSync(path);
    assert(lstatSync(directory).isDirectory() && (lstatSync(directory).mode & 0o077) === 0, 'PRIVATE_WORKSPACE_REQUIRED');
    // No provider transports exist in this entry point. Defense in depth for accidental fetches.
    globalThis.fetch = () => { throw Error('OFFLINE_NETWORK_DENIED'); };
    await offlineAgent(directory, consent === '--capture-local').server.connect(new StdioServerTransport());
  } catch { console.error('AGENT_SETUP_STOPPED'); process.exitCode = 1; }
}
