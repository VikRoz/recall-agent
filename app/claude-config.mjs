import assert from 'node:assert/strict';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const serverName = 'recall_lab';
const activityChat = fileURLToPath(new URL('activity-mcp.mjs', import.meta.url));
const defaultConfig = () => join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');

export function configureClaude(action, mode, run, path = defaultConfig()) {
  assert(['first', 'restore'].includes(action), 'Unknown Claude Desktop action.');
  assert(['--activity-offline', '--activity-live', '--activity-provider-fixture'].includes(mode), 'Unknown Recall Lab mode.');
  const statePath = join(run, 'claude-settings.json');
  const entry = {
    command: process.execPath,
    args: ['--disable-warning=ExperimentalWarning', activityChat,
      mode === '--activity-live' ? '--live' : mode === '--activity-provider-fixture' ? '--provider-fixture' : '--offline', run],
  };
  const originalFile = existsSync(path);
  if (originalFile) assert(lstatSync(path).isFile(), 'Claude settings must be a regular file.');
  const original = originalFile ? readFileSync(path, 'utf8') : '{}';
  const originalMode = originalFile ? lstatSync(path).mode & 0o777 : 0o600;
  let config;
  try { config = JSON.parse(original); }
  catch { throw Error('Claude settings contain invalid JSON.'); }
  assert(config && typeof config === 'object' && !Array.isArray(config), 'Invalid Claude settings.');
  const hadServers = Object.hasOwn(config, 'mcpServers');
  const servers = hadServers ? config.mcpServers : {};
  assert(servers && typeof servers === 'object' && !Array.isArray(servers), 'Invalid Claude MCP settings.');
  let replacement;
  let permissions = 0o600;
  if (action === 'first') {
    assert(!Object.hasOwn(servers, serverName), 'Claude already has a recall_lab server.');
    writeFileSync(statePath, JSON.stringify({ original, originalFile, originalMode, hadServers }), { mode: 0o600, flag: 'wx' });
    config.mcpServers = { ...servers, [serverName]: entry };
  } else {
    const saved = JSON.parse(readFileSync(statePath, 'utf8'));
    assert(JSON.stringify(servers[serverName]) === JSON.stringify(entry),
      'Recall Lab no longer owns this Claude Desktop entry.');
    {
      delete servers[serverName];
      permissions = saved.originalMode;
      if (!saved.hadServers && !Object.keys(servers).length) delete config.mcpServers;
      if (JSON.stringify(config) === JSON.stringify(JSON.parse(saved.original))) {
        if (!saved.originalFile) {
          rmSync(path);
          rmSync(statePath);
          return;
        }
        replacement = saved.original;
      }
    }
  }
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = join(dirname(path), '.recall-lab-' + randomUUID());
  try {
    writeFileSync(tmp, replacement ?? JSON.stringify(config, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    chmodSync(tmp, permissions);
    renameSync(tmp, path);
  } finally {
    rmSync(tmp, { force: true });
  }
  if (action === 'restore') rmSync(statePath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    configureClaude(...process.argv.slice(2, 5));
  } catch (error) {
    console.error('Claude Desktop setup stopped. ' + error.message);
    process.exitCode = 1;
  }
}
