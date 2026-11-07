// Public normalized fact bytes only. Never used as a transaction or memory data source.
import {constants,openSync,closeSync,fstatSync,lstatSync,readFileSync,writeFileSync,fsyncSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {assert,canonical} from '../src/domain.ts';
export function saveSubmissionProof(run,record,key){
 assert(record.schema==='recall-transaction-fact/1'&&/^[A-Za-z0-9_-]{43}$/.test(key),'OWN_SUBMISSION_FACT_ONLY');
 const dir=join(run,'submission-proofs'),s=lstatSync(dir);assert(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()
  &&(s.mode&0o777)===0o700&&realpathSync(dir)===dir,'OWN_SUBMISSION_DIRECTORY');
 const payload=canonical(record),sha256=createHash('sha256').update(payload).digest('hex');
 assert(Buffer.byteLength(payload)<=4096&&Buffer.from(sha256,'hex').toString('base64url')===key,'OWN_SUBMISSION_BINDING');
 const bytes=canonical({schema:1,kind:'public-normalized-fact-submission-proof',key,sha256,record}),path=join(dir,key+'.json');let fd,created=false;
 try{try{fd=openSync(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);created=true;}
  catch(error){if(error.code!=='EEXIST')throw error;fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);}
  const f=fstatSync(fd);assert(f.isFile()&&f.uid===process.getuid()&&f.nlink===1&&(f.mode&0o777)===0o600,'OWN_SUBMISSION_FILE');
  if(created)writeFileSync(fd,bytes);else assert(f.size===Buffer.byteLength(bytes)&&readFileSync(fd,'utf8')===bytes,'OWN_SUBMISSION_CHANGED');
  fsyncSync(fd);
 }finally{if(fd!==undefined)closeSync(fd);}
 const d=openSync(dir,'r');try{fsyncSync(d);}finally{closeSync(d);}
 return {path,key,sha256};
}
