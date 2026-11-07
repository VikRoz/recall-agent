import { realpathSync, lstatSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { StdioServerTransport } from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import { z } from '../mcp/node_modules/zod/index.js';
import { activityServer } from './activity-mcp.mjs';
import { FixtureRuleStore } from './activity-fixture-store.ts';
import { FIXTURE_WALLET } from './activity-fixtures.ts';
import { LocalExperienceStore } from './agent-experience.ts';
import { loadOfflineActivity } from './agent-activity-index.ts';
import {ObservedToolTransport} from './agent-tool-observer.mjs';
import {CsvArtifacts} from './agent-export.mjs';
import { AgentSession } from './agent-session.ts';
import { assert } from '../src/domain.ts';

export function offlineAgent(directory, capture, dataMode = 'fixture') {
  const index = loadOfflineActivity(dataMode);
  const file = join(directory, 'agent-workspace.json');
  if (!existsSync(file)) writeFileSync(file, JSON.stringify({ schema: 1, project: 'agent-' + randomUUID(), datasetId: index.datasetId }), { flag: 'wx', mode: 0o600 });
  assert(lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink() && lstatSync(file).size < 1024, 'WORKSPACE_FILE');
  const config = JSON.parse(readFileSync(file, 'utf8'));
  assert(config.schema === 1 && /^agent-[a-f0-9-]{36}$/.test(config.project), 'WORKSPACE_BINDING');
  assert(config.datasetId === index.datasetId || (config.datasetId === undefined && dataMode === 'fixture'), 'WORKSPACE_DATASET_MISMATCH');
  const binding = { owner: FIXTURE_WALLET, project: config.project };
  const session = new AgentSession(binding, new FixtureRuleStore(directory, binding), network => ({transactions: ids => index.transactions(network, ids)}));
  session.experience = new LocalExperienceStore(directory, config.project);
  session.capture = capture;
  session.activityIndex = index;
  session.artifacts = new CsvArtifacts(directory);
  return agentServer(session, {capture,dataMode,mode:dataMode === 'saved' ? 'offline-agent-replay' : 'offline-agent-fixture'});
}
// Shared independent tools; the provider assembly supplies stores, never a task route.
export function agentServer(session, {capture,dataMode,mode}) {
  const server = activityServer(session, mode, {exportsArtifact:true,factCapture:session.capture && session.captureFacts,
    rulesWritable:session.captureScope!=='transaction-facts-only',strictInputs:session.ownAccount===true});
  if(session.activityIndex)server.registerTool('find_wallet_activity', {
    description: 'Find transaction references involving a wallet in the selected LOCAL dataset, optionally filtered by a UTC period. Saved records are replay, not a fresh chain query. Results always have partial wallet-history coverage. No match does not prove inactivity. This tool does not infer ownership or direct counterparties.',
    inputSchema: { network: z.enum(['mainnet','testnet']), wallet: z.string().max(66),
      from: z.string().max(30).optional(), to: z.string().max(30).optional(),
      limit: z.number().int().min(1).max(10).optional(), cursor: z.string().max(100).optional() },
    annotations: {readOnlyHint: true, openWorldHint: false},
  }, async args => {
    try { return {content: [{type: 'text', text: JSON.stringify(await session.findActivity(args))}]}; }
    catch (error) { return {isError: true, content: [{type: 'text', text: /^[A-Z0-9_]+$/.test(error?.code) ? error.code : 'AGENT_ERROR'}]}; }
  });
  const captureDescription=!capture?'Memory capture is disabled in this run.':session.captureScope==='linked-resolution-only'
    ?'Capture scope: linked resolutions only. A failed hypothesis returns its verdict and observed evidence with captureSkipped=not-admitted-by-scope; no failure is written.'
    :session.captureScope==='transaction-facts-only'?'Capture scope: transaction facts only. Hypothesis verdicts remain factual, but technical failure/resolution writes are skipped.'
    :'Capture scope: verified mismatches and their linked verified resolutions may be saved automatically.';
  server.registerTool('verify_gas_payer', {
    description: 'Check a proposed gas-payer address against transaction evidence in an existing report. '+captureDescription+' Local or fixture IDs are not Mainnet Walrus receipts.',
    inputSchema: session.ownAccount?z.object({reportId:z.string().max(120),transaction:z.string().max(200),claimedPayer:z.string().max(66)}).strict()
      :{ reportId: z.string().max(120), transaction: z.string().max(200), claimedPayer: z.string().max(66) },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async args => {
    try { return { content: [{ type: 'text', text: JSON.stringify(await session.verifyGasPayer(args.reportId, args.transaction, args.claimedPayer)) }] }; }
    catch (error) { return { isError: true, content: [{ type: 'text', text: /^[A-Z0-9_]+$/.test(error?.code) ? error.code : 'AGENT_ERROR' }] }; }
  });
  const observe = inner => new ObservedToolTransport(inner,{store:session.experience,workspace:session.binding.project,
    source:dataMode === 'tatum' ? 'tatum' : dataMode === 'saved' ? 'replay' : 'fixture',
    capture:capture && session.captureScope!=='transaction-facts-only',stop:()=>{session.stopped=true;}});
  return { session, server, observe };
}
async function main() {
  try {
    const [mode, path, ...options] = process.argv.slice(2);
    if (mode === '--example') {
      assert([undefined, '--saved'].includes(path) && options.length === 0, 'OFFLINE_AGENT_ONLY');
      console.log(JSON.stringify(loadOfflineActivity(path === '--saved' ? 'saved' : 'fixture').examples(), null, 2));
      return;
    }
    assert(mode === '--offline' && path && new Set(options).size === options.length
      && options.every(o => ['--capture-local','--saved'].includes(o)), 'OFFLINE_AGENT_ONLY');
    const directory = realpathSync(path);
    assert(lstatSync(directory).isDirectory() && (lstatSync(directory).mode & 0o077) === 0, 'PRIVATE_WORKSPACE_REQUIRED');
    // No provider transports exist in this entry point. Defense in depth for accidental fetches.
    globalThis.fetch = () => { throw Error('OFFLINE_NETWORK_DENIED'); };
    const runtime = offlineAgent(directory, options.includes('--capture-local'), options.includes('--saved') ? 'saved' : 'fixture');
    await runtime.server.connect(runtime.observe(new StdioServerTransport()));
  } catch { console.error('AGENT_SETUP_STOPPED'); process.exitCode = 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
