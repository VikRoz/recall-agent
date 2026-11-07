// Public receipt transfer only. Closed origin files remain immutable and are never written.
import {constants,openSync,closeSync,fstatSync,readFileSync,realpathSync} from 'node:fs';
import {isAbsolute,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {assert,canonical,exactKeys} from '../src/domain.ts';
import {validateExperienceRows,experienceId} from './agent-experience.ts';
const sha=v=>createHash('sha256').update(v).digest('hex');
export function ownPath(path){assert(typeof path==='string'&&isAbsolute(path)&&realpathSync(path)===path,'OWN_PRIVATE_PATH');return path;}
function originFile(path,role){
 ownPath(path);const names={manifest:['agent-run.json'],ledger:['agent-ledger.json'],native:['native-budget.json','agent-native-turn.json']};
 assert(names[role]?.includes(basename(path)),'OWN_LINEAGE_PATH');
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{const info=fstatSync(fd);assert(info.isFile()&&info.uid===process.getuid()&&(info.mode&0o077)===0&&info.size<=32768,'OWN_LINEAGE_FILE');
  const bytes=readFileSync(fd);return {value:JSON.parse(bytes),sha256:sha(bytes)};
 }finally{closeSync(fd);}
}
export function validateRetained(retained,identity,{fixture=false,freeze=false}={}){
 if(retained===null)return null;
 exactKeys(retained,['identity','records','receipts','origins']);
 assert(canonical(retained.identity)===canonical(identity)&&retained.records.length===3&&retained.origins.length===3,'OWN_RETAINED_IDENTITY');
 validateExperienceRows(retained.records,identity.workspace);
 assert(new Set(retained.origins.map(o=>o.role)).size===3&&['storage','ordinary-write','closed-zero-write'].every(k=>retained.origins.some(o=>o.role===k)),'OWN_CLOSED_LINEAGE');
 const originRows=[];
 for(const origin of retained.origins){
  exactKeys(origin,['role','manifest','ledger','native','records','files']);
  const m=origin.manifest,s=origin.ledger;
  assert(['owner','accountId','delegatePublicKeyHex','packageId','workspace'].every(k=>m[k]===identity[k])
   &&m.namespaces?.experience===identity.workspace+'-experience'&&m.namespaces?.rules===identity.workspace+'-rules'
   &&(fixture?m.mode.startsWith('offline-'):['live-walrus-replay','live-ordinary-selected'].includes(m.mode)),'OWN_RETAINED_ORIGIN');
  assert(s.manifestHash===sha(canonical(m))&&Number.isSafeInteger(s.writes)&&s.writes>=0&&s.writes<=2
   &&s.intents.length===s.writes&&s.intents.every(i=>i.state==='done'),'OWN_RETAINED_UNCERTAIN');
  assert(origin.records.length===s.writes,'OWN_RETAINED_ORIGIN_COUNT');
  if(origin.role==='closed-zero-write')assert(s.writes===0&&typeof s.stopped==='string'&&origin.native?.turns?.length===1
   &&typeof origin.native.stopped==='string','OWN_ZERO_WRITE_ORIGIN_REQUIRED');
  assert(Object.keys(origin.files).sort().join(',')==='ledger,manifest,native','OWN_LINEAGE_FILES');
  for(const role of ['manifest','ledger','native']){
   const ref=origin.files[role];exactKeys(ref,freeze?['path']:['path','sha256']);const actual=originFile(ref.path,role);
   assert(canonical(actual.value)===canonical(origin[role]),'OWN_LINEAGE_CHANGED');
   if(freeze)ref.sha256=actual.sha256;else assert(ref.sha256===actual.sha256,'OWN_LINEAGE_CHANGED');
  }
  originRows.push(...origin.records);
 }
 assert(originRows.length===3&&new Set(originRows.map(r=>r.id)).size===3,'OWN_RETAINED_ORIGIN_COUNT');
 for(const row of retained.records){
  const receipt=retained.receipts[row.id],origin=retained.origins.find(o=>o.records.some(r=>r.id===row.id));
  assert(row.id===experienceId(row.record)&&canonical(origin?.records.find(r=>r.id===row.id))===canonical(row)
   &&receipt?.state==='done'&&receipt.blobId===row.blobId&&receipt.sha256===sha(canonical(row.record))
   &&origin.ledger.intents.some(i=>i.key===row.id&&i.sha256===receipt.sha256&&i.namespace===identity.workspace+'-experience')
   &&origin.ledger.jobs[receipt.jobId]?.key===row.id&&origin.ledger.jobs[receipt.jobId]?.namespace===identity.workspace+'-experience','OWN_RETAINED_RECEIPT');
 }
 assert(Object.keys(retained.receipts).length===3,'OWN_RETAINED_RECEIPT');return retained;
}
