// Explicit operator diagnostic: account/model metadata only, no model turn or provider tools.
import{spawnSync}from'node:child_process';import{modelPreflight}from'./agent-model-preflight.mjs';
import{cleanClientEnv}from'./agent-own-launch.mjs';
try{
 if(process.argv.length!==2)throw Error('NO_EXTRA_ARGUMENTS');const env=cleanClientEnv();
 const inventory=spawnSync('codex',['mcp','list','--json'],{env,encoding:'utf8',timeout:15000,maxBuffer:1048576});if(inventory.status!==0)throw Error('MCP_INVENTORY');
 const result=await modelPreflight({servers:JSON.parse(inventory.stdout),env});console.log(JSON.stringify(result));
}catch(error){console.error(error.code??error.message??'MODEL_PREFLIGHT_FAILED');process.exitCode=1;}
