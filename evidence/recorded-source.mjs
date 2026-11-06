import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Historical runs attest their frozen revision, not whichever product revision is current.
// A source archive may not contain Git history; do not claim historical bytes were verified there.
export function verifyRecordedSource(freeze){
 const commit=freeze.sourceCommit,files=freeze.productAndHarnessSha256;
 assert(/^[a-f0-9]{7,40}$/.test(commit)&&Object.keys(files).length>0);
 for(const [path,hash] of Object.entries(files))assert((/^(app|src)\/[A-Za-z0-9_.\/-]+$/.test(path)||path==='start.command')
  &&!path.includes('..')&&/^[a-f0-9]{64}$/.test(hash));
 const cwd=fileURLToPath(new URL('../',import.meta.url));
 const available=spawnSync('git',['cat-file','-e',commit+'^{commit}'],{cwd,stdio:'ignore'});
 if(available.status!==0)return 'HISTORICAL_REVISION_RECORDED_GIT_BYTES_UNAVAILABLE';
 for(const [path,hash] of Object.entries(files)){
  const bytes=execFileSync('git',['show',commit+':'+path],{cwd,maxBuffer:1048576,stdio:['ignore','pipe','ignore']});
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,path);
 }
 return 'HISTORICAL_GIT_REVISION_BYTES_VERIFIED';
}
