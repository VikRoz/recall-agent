// Parent cleanup is independent of child admission, expiry and source checks.
import {constants,openSync,closeSync,fstatSync,lstatSync,existsSync,writeFileSync,fsyncSync,unlinkSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {assert,canonical,time} from '../src/domain.ts';
import {privateRead,privateDirectory,runHash} from './agent-run.mjs';
import {managedFile} from './agent-managed.mjs';
import {cleanClientEnv} from './agent-own-launch.mjs';
import {tatumKeyHash} from './activity-live.ts';
const fingerprint=path=>{const s=lstatSync(path);assert(!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,'OWN_CAPTURE_PATH');return {dev:s.dev,ino:s.ino,birthtimeMs:s.birthtimeMs};};
function spec(directory){privateDirectory(directory);const s=privateRead(join(directory,'capture-spec.json'));
 assert(s.schema===1&&s.keyFile===join(dirname(s.keyFile),'tatum.key')&&/^[a-f0-9]{24}$/.test(s.tatumAccountId)
  &&/^[a-f0-9]{64}$/.test(s.contextHash)&&/^[a-f0-9]{64}$/.test(s.planHash)
  &&canonical(s.parent)===canonical(fingerprint(dirname(s.keyFile))),'OWN_CAPTURE_SPEC');return s;}
export function createOwnCaptureSpec(directory,c,tatumAccountId){
 assert(/^[a-f0-9]{24}$/.test(tatumAccountId)&&!existsSync(c.keyFile),'OWN_CAPTURE_SPEC');
 const s={schema:1,root:c.root,contextHash:runHash(c),planHash:runHash(c.plan),keyFile:c.keyFile,parent:fingerprint(dirname(c.keyFile)),tatumAccountId};
 managedFile(join(directory,'capture-spec.json'),s);return s;
}
export function captureOwnKey(directory,value){
 const s=spec(directory);assert(typeof value==='string'&&value.startsWith('t-'+s.tatumAccountId)&&/^[A-Za-z0-9_-]{32,256}$/.test(value),'OWN_CAPTURE_KEY_ACCOUNT');
 const fd=openSync(s.keyFile,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try{
  const info=fstatSync(fd);assert(info.isFile()&&info.nlink===1,'OWN_CAPTURE_FILE');
  // Ownership is durable before any secret bytes, so child bootstrap failure cannot orphan the copy.
  managedFile(join(directory,'capture-owned.json'),{schema:1,contextHash:s.contextHash,planHash:s.planHash,keyFile:s.keyFile,parent:s.parent,file:fingerprint(s.keyFile)});
  writeFileSync(fd,value);fsyncSync(fd);
 }finally{closeSync(fd);}
 const proof={schema:1,contextHash:s.contextHash,accountId:s.tatumAccountId,keySha256:tatumKeyHash(value),capturedAt:new Date().toISOString()};
 managedFile(join(directory,'captured-key-proof.json'),proof);return {captured:true,keyPrinted:false};
}
export function cleanupOwnCapture(directory){
 const s=spec(directory),t=privateRead(join(directory,'capture-owned.json'));
 assert(t.schema===1&&t.contextHash===s.contextHash&&t.planHash===s.planHash&&t.keyFile===s.keyFile
  &&canonical(t.parent)===canonical(s.parent),'OWN_CAPTURE_CLEANUP_SCOPE');
 if(!existsSync(t.keyFile))return {absent:true,deleted:false};
 const fd=openSync(t.keyFile,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{const info=fstatSync(fd);assert(info.isFile()&&info.nlink===1&&info.uid===process.getuid()&&(info.mode&0o777)===0o600
  &&canonical(fingerprint(t.keyFile))===canonical(t.file)&&info.dev===t.file.dev&&info.ino===t.file.ino,'OWN_CAPTURE_CLEANUP_IDENTITY');unlinkSync(t.keyFile);
 }finally{closeSync(fd);}return {absent:true,deleted:true};
}
export function captureOwnClipboard(directory,{paste,clear}={}){
 let result,error;
 try{
  const clipboard=(paste??(()=>spawnSync('/usr/bin/pbpaste',[],{encoding:'utf8',maxBuffer:1024})))();
  assert(clipboard.status===0&&typeof clipboard.stdout==='string','OWN_CLIPBOARD_READ');
  result=captureOwnKey(directory,clipboard.stdout.trim());
 }catch(e){error=e;}
 finally{
  let cleared=false;try{cleared=(clear??(()=>spawnSync('/usr/bin/pbcopy',[],{input:'',encoding:'utf8'})))()?.status===0;}catch{}
  if(!cleared){
   let cleanup={notCaptured:true};if(existsSync(join(directory,'capture-owned.json')))try{cleanup=cleanupOwnCapture(directory);}catch(e){cleanup={error:e.code??'CAPTURE_CLEANUP_ERROR'};}
   managedFile(join(directory,'capture-failure.json'),{schema:1,clipboardCleared:false,keyAbsent:!existsSync(spec(directory).keyFile),cleanup});
   assert(false,'OWN_CLIPBOARD_CLEAR_FAILED');
  }
 }
 if(error)throw error;return {...result,clipboardCleared:true};
}
export function executeOwnRehearsal(directory,{runChild}={}){
 const s=spec(directory);managedFile(join(directory,'parent-execution.json'),{schema:1,contextHash:s.contextHash,startedAt:new Date().toISOString(),pid:process.pid});
 let stdout,stderr;const result={schema:1,status:'STOPPED',childExitCode:null,contextHash:s.contextHash,retries:0,additionalSpendUSD:0};
 try{
  const g=privateRead(join(directory,'rehearsal-grant.json'));assert(g.contextHash===s.contextHash&&g.planHash===s.planHash,'OWN_PARENT_GRANT');
  const remaining=time(g.checkedAt)+240000-Date.now();assert(remaining>0&&remaining<=240000,'OWN_PARENT_EXPIRED');
  stdout=openSync(join(directory,'child.stdout'), 'wx',0o600);stderr=openSync(join(directory,'child.stderr'),'wx',0o600);
  const child=(runChild??((command,args,options)=>spawnSync(command,args,options)))(process.execPath,
   ['--disable-warning=ExperimentalWarning',join(s.root,'app/agent-own-rehearsal.mjs'),'--run',directory],
   {env:cleanClientEnv(),stdio:['ignore',stdout,stderr],timeout:remaining,killSignal:'SIGTERM'});
  result.childExitCode=child.status;result.signal=child.signal??null;result.status=child.status===0?'CHILD_COMPLETED':'CHILD_STOPPED';
 }catch(error){result.reason=error.code??'OWN_PARENT_SETUP_STOPPED';}
 finally{
  if(stdout!==undefined)closeSync(stdout);if(stderr!==undefined)closeSync(stderr);
  try{result.cleanup=cleanupOwnCapture(directory);}catch(error){result.status='CLEANUP_STOPPED';result.cleanup={error:error.code??'CAPTURE_CLEANUP_ERROR'};}
  result.keyAbsent=!existsSync(s.keyFile);result.finishedAt=new Date().toISOString();managedFile(join(directory,'parent-result.json'),result);
 }
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const [mode,path,...rest]=process.argv.slice(2);assert(path&&rest.length===0,'OWN_PARENT_OPTIONS');const directory=resolve(path);
  if(mode==='--capture-clipboard'){
   console.log(JSON.stringify(captureOwnClipboard(directory)));
  }else if(mode==='--cleanup')console.log(JSON.stringify(cleanupOwnCapture(directory)));
  else{assert(mode==='--execute','OWN_PARENT_MODE');const result=executeOwnRehearsal(directory);console.log(JSON.stringify(result));if(result.status!=='CHILD_COMPLETED'||!result.keyAbsent)process.exitCode=1;}
 }catch(error){console.error(error.code??'OWN_PARENT_STOPPED');process.exitCode=1;}
}
