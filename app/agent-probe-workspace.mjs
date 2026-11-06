import {mkdirSync,lstatSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export function prepareProbeWorkspace(workspace,initialState){
  if(initialState===undefined){mkdirSync(workspace,{mode:0o700});}
  else{
    const stat=lstatSync(workspace);assert(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0,'PROBE_PRIVATE_WORKSPACE');
    const names=['activity-memory.json','agent-workspace.json','experience.json'];
    assert.deepEqual(Object.keys(initialState).sort(),names);
    assert.deepEqual(readdirSync(workspace).sort(),names);
    for(const name of names){
      assert(/^[a-f0-9]{64}$/.test(initialState[name]),'PROBE_STATE_HASH');
      const path=join(workspace,name),file=lstatSync(path);
      assert(file.isFile()&&!file.isSymbolicLink()&&(file.mode&0o077)===0&&file.size<=32768,'PROBE_STATE_FILE');
      assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),initialState[name],'PROBE_STATE_HASH');
    }
  }
  mkdirSync(join(workspace,'client'),{mode:0o700});
}
