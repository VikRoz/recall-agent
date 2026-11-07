// Private first-failure evidence only. Never copies provider strings, URLs, headers or payloads.
import {openSync,writeFileSync,fsyncSync,closeSync,constants} from 'node:fs';
import {join} from 'node:path';
import {Fault,canonical} from '../src/domain.ts';
const attempted=new WeakSet();
const phases=new Set(['admission','startup','action','close','late-close']);
const routes=new Set(['health','version','config','stats','inventory','recall','remember','remember-status','seal-package']);
const categories=new Set(['admission','validation','transport','http','response','sdk','lifecycle']);
// Closed list of locally generated codes; an SDK message is never treated as a code.
const codes=new Set([
 'AGENT_ADMISSION_EXPIRED','AGENT_RUN_EXPIRED','AGENT_RUN_STOPPED','AGENT_MANIFEST_CHANGED','AGENT_WORKSPACE_LEASE_REQUIRED',
 'MANAGED_CONTEXT_CHANGED','AGENT_LIMIT','AGENT_FETCH_INPUT','AGENT_ROUTE','AGENT_RAW_CREDENTIAL_DENIED','AGENT_REQUEST_IDENTITY',
 'AGENT_BODY_SIZE','AGENT_STATS_SCOPE','AGENT_INVENTORY_SCOPE','AGENT_READ_SCOPE','AGENT_SEAL_REQUIRED','AGENT_WRITE_SCOPE',
 'AGENT_WRITE_CANONICAL','AGENT_UNRESERVED_WRITE','AGENT_GRPC_BODY','AGENT_GRPC_FRAME','AGENT_SEAL_PACKAGE_SCOPE',
 'AGENT_PROVIDER_HTTP','AGENT_OWNER_MISMATCH','AGENT_WRITE_HEALTH','AGENT_CONFIG_SCOPE','AGENT_JOB_ACK','AGENT_UNKNOWN_JOB',
 'AGENT_DELEGATE_MISMATCH','AGENT_RUNTIME_CLOSED','AGENT_CLIENT_CLOSED_DURING_ACTION'
]);
export const diagnosticFile=directory=>join(directory,'agent-first-failure.json');
export function recordFirstFailure(gate,event={}){
 if(attempted.has(gate))return 'already-attempted';attempted.add(gate);
 let fd;
 try{
  let requestCount=null;try{const n=gate.state().requests;if(Number.isSafeInteger(n)&&n>=0&&n<=64)requestCount=n;}catch{}
  const faultCode=event.error instanceof Fault&&codes.has(event.error.code)?event.error.code
   :codes.has(event.faultCode)?event.faultCode:null;
  const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)?v:null;
  const record={schema:1,manifestHash:hash(gate.hash),contextHash:hash(gate.manifest?.admission?.contextHash),
   recordedAt:new Date().toISOString(),phase:phases.has(event.phase)?event.phase:'unknown',
   route:routes.has(event.route)?event.route:'unknown',method:['GET','POST'].includes(event.method)?event.method:'unknown',
   category:categories.has(event.category)?event.category:'unknown',faultCode,
   httpStatus:Number.isInteger(event.httpStatus)&&event.httpStatus>=100&&event.httpStatus<=599?event.httpStatus:null,requestCount};
  // Gate construction established this private directory. O_EXCL preserves the first artifact even on partial failure.
  fd=openSync(diagnosticFile(gate.directory),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  writeFileSync(fd,canonical(record));fsyncSync(fd);return 'recorded';
 }catch(error){return error?.code==='EEXIST'?'already-recorded':'write-failed';}
 finally{if(fd!==undefined)try{closeSync(fd);}catch{}}
}
