import {createHash,randomUUID} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,openSync,writeFileSync,fsyncSync,closeSync,linkSync,unlinkSync,rmdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {assert} from '../src/domain.ts';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export class CsvArtifacts {
  constructor(workspace){this.directory=join(resolve(workspace),'exports');}
  write(csv){
    assert(typeof csv==='string'&&Buffer.byteLength(csv,'utf8')<=65536,'EXPORT_SIZE');
    if(!existsSync(this.directory))mkdirSync(this.directory,{mode:0o700});
    const stat=lstatSync(this.directory);assert(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0,'EXPORT_DIRECTORY');
    const lock=join(this.directory,'.export-lock');mkdirSync(lock,{mode:0o700});
    let temporary;
    try{
      const names=readdirSync(this.directory).filter(n=>n!=='.export-lock');
      assert(names.every(n=>/^[a-f0-9]{64}\.csv$/.test(n))&&names.length<=8,'EXPORT_DIRECTORY');
      const bytes=Buffer.from(csv,'utf8'),sha256=hash(bytes),path=join(this.directory,sha256+'.csv');
      if(existsSync(path)){
        const previous=lstatSync(path);assert(previous.isFile()&&!previous.isSymbolicLink()&&previous.size<=65536&&(previous.mode&0o077)===0,'EXPORT_FILE');
        assert(hash(readFileSync(path))===sha256,'EXPORT_HASH');
      }else{
        assert(names.length<8,'EXPORT_LIMIT');
        temporary=join(this.directory,randomUUID()+'.tmp');
        const fd=openSync(temporary,'wx',0o600);
        try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
        // Atomic publication with no replacement of an existing artifact.
        linkSync(temporary,path);unlinkSync(temporary);temporary=undefined;
        const directoryFd=openSync(this.directory,'r');try{fsyncSync(directoryFd);}finally{closeSync(directoryFd);}
      }
      return {schema:'recall-export/1',storage:'local',path,uri:pathToFileURL(path).href,sha256,bytes:bytes.length,mediaType:'text/csv'};
    }finally{if(temporary&&existsSync(temporary))unlinkSync(temporary);rmdirSync(lock);}
  }
}
