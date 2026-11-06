// Explicit bounded live entry; never selected by the default local launcher.
import {pathToFileURL} from 'node:url';
import {StdioServerTransport} from '../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import {openLiveAgent,liveAuthorization} from './agent-live.mjs';
import {privateRead} from './agent-run.mjs';
import {join} from 'node:path';
import {assert} from '../src/domain.ts';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let runtime;
 try{
  const [mode,directory]=process.argv.slice(2);assert(mode==='--live'&&directory,'AGENT_EXPLICIT_LIVE_REQUIRED');
  const {gate}=liveAuthorization(directory),permit=privateRead(join(directory,'agent-native-turn.json'));
  assert(permit.manifestHash===gate.hash&&permit.model==='gpt-5.6-luna'&&permit.maximumUserTurns===1,'AGENT_NATIVE_PERMIT_REQUIRED');
  runtime=await openLiveAgent(directory);let closing=false;
  const close=()=>{if(closing)return;closing=true;runtime.close();runtime.server.close().finally(()=>process.exit(0));};
  process.stdin.once('end',close);process.once('SIGTERM',close);process.once('SIGINT',close);
  await runtime.server.connect(runtime.observe(new StdioServerTransport()));
 }catch(error){runtime?.close();const code=error?.code??error?.message;
  console.error(typeof code==='string'&&/^[A-Z0-9_]+$/.test(code)?code:'AGENT_LIVE_SETUP_STOPPED');process.exitCode=1;}
}
