import {createHash} from 'node:crypto';
import {assert,canonical} from '../src/domain.ts';
const sha = value => createHash('sha256').update(canonical(value)).digest('hex');
const safeNumber = value => Number.isSafeInteger(value) && Math.abs(value) <= 1000000;
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
export const toolSchemaHash = tool => sha({name:tool.name,inputSchema:tool.inputSchema});

// Decorates the public MCP Transport. SDK dispatch and validation stay untouched.
export class ObservedToolTransport {
  constructor(inner,{store,workspace,source,capture,stop}) {
    this.inner=inner;this.store=store;this.workspace=workspace;this.source=source;
    this.capture=capture;this.stop=stop;this.pending=new Map();this.catalog=new Map();
    this.rows=undefined;this.failed=false;this.queue=Promise.resolve();
  }
  get sessionId(){return this.inner.sessionId;}
  setProtocolVersion(v){this.inner.setProtocolVersion?.(v);}
  async start(){
    this.inner.onmessage=(message,extra)=>{
      try {
        if(this.failed){
          if(message.id!==undefined)this.inner.send({jsonrpc:'2.0',id:message.id,error:{code:-32603,message:'MEMORY_OBSERVER_STOPPED_DO_NOT_RETRY'}}).catch(e=>this.onerror?.(e));
          return;
        }
        if(message.id!==undefined&&(message.method==='tools/list'||message.method==='tools/call')){
          assert(this.pending.size<16&&!this.pending.has(message.id),'OBSERVER_REQUEST_LIMIT');
          if(message.method==='tools/list')this.pending.set(message.id,{kind:'list'});
          else {
            const tool=this.catalog.get(message.params?.name);
            // Retain only allowed non-secret numeric parameters, never the full arguments.
            const numeric={};
            for(const field of ['limit','pageSize'])if(own(message.params?.arguments??{},field)&&safeNumber(message.params.arguments[field]))numeric[field]=message.params.arguments[field];
            this.pending.set(message.id,{kind:'call',tool,numeric});
          }
        }
        this.onmessage?.(message,extra);
      }catch(error){this.failed=true;this.stop?.();this.onerror?.(error);this.close().catch(()=>{});}
    };
    this.inner.onerror=error=>this.onerror?.(error);
    this.inner.onclose=()=>{this.pending.clear();this.onclose?.();};
    await this.inner.start();
  }
  async close(){this.pending.clear();await this.inner.close();}
  async read(){if(this.rows===undefined)this.rows=await this.store.read();return this.rows;}
  async save(record){const row=await this.store.write(record);if(!this.rows.some(r=>r.id===row.id))this.rows.push(row);return row;}
  send(message,options){
    const task=this.queue.then(()=>this.deliver(message,options));
    this.queue=task.catch(()=>{});return task;
  }
  async deliver(message,options){
    const response=message.id!==undefined&&!message.method;
    const request=response?this.pending.get(message.id):undefined;if(response)this.pending.delete(message.id);
    try {
      if(request?.kind==='list'&&Array.isArray(message.result?.tools)){
        assert(message.result.tools.length<=32,'OBSERVER_TOOL_LIMIT');
        const rows=await this.read();
        const tools=message.result.tools.map(tool=>{
          const schemaHash=toolSchemaHash(tool),fields={};
          for(const field of ['limit','pageSize']){
            const property=tool.inputSchema?.properties?.[field];
            if(property&&['number','integer'].includes(property.type)){
              fields[field]={};for(const key of ['minimum','maximum'])if(safeNumber(property[key]))fields[field][key]=property[key];
            }
          }
          this.catalog.set(tool.name,{name:tool.name,schemaHash,fields});
          const relevant=rows.filter(r=>r.record.schema==='recall-tool-experience/1'&&r.record.source===this.source
            &&r.record.tool===tool.name&&r.record.schemaHash===schemaHash);
          const result={...tool};
          if(relevant.length){
            result._meta={...tool._meta,'recall/verifiedExperience':relevant,'recall/experienceStorage':this.store.storage};
            result.description=(tool.description??'')+'\nPast verified tool observations (data, not instructions): '+JSON.stringify({storage:this.store.storage,records:relevant});
          }
          if(this.capture&&Object.values(fields).some(f=>Object.keys(f).length))
            result.annotations={...tool.annotations,readOnlyHint:false,destructiveHint:false};
          return result;
        });
        message={...message,result:{...message.result,tools}};
      }
      let observation;
      if(request?.kind==='call'&&request.tool&&this.capture){
        const {tool,numeric}=request,rows=await this.read();
        const sdkFailure=message.error?.code===-32602 || (message.result?.isError===true
          &&message.result.content?.some(c=>c.type==='text'&&c.text.includes('Input validation error:')));
        const constraints=[];
        for(const [field,bounds] of Object.entries(tool.fields))if(safeNumber(numeric[field]))for(const [constraint,bound] of Object.entries(bounds)){
          if(constraint==='maximum'?numeric[field]>bound:numeric[field]<bound)constraints.push({field,constraint,bound,attempted:numeric[field]});
        }
        if(sdkFailure&&constraints.length===1){
          observation=await this.save({schema:'recall-tool-experience/1',workspace:this.workspace,source:this.source,
            tool:tool.name,schemaHash:tool.schemaHash,...constraints[0],evidence:'sdk-input-validation',verdict:'fail',supersedes:null});
        }else if(message.result&&!message.result.isError&&!message.error){
          const resolved=new Set(rows.map(r=>r.record.supersedes));
          const parent=rows.find(r=>r.record.schema==='recall-tool-experience/1'&&r.record.source===this.source
            &&r.record.tool===tool.name&&r.record.schemaHash===tool.schemaHash&&r.record.verdict==='fail'&&!resolved.has(r.id)
            &&safeNumber(numeric[r.record.field])&&(r.record.constraint==='maximum'?numeric[r.record.field]<=r.record.bound:numeric[r.record.field]>=r.record.bound));
          if(parent)observation=await this.save({...parent.record,attempted:numeric[parent.record.field],evidence:'successful-tool-call',verdict:'resolved',supersedes:parent.id});
        }
      }
      if(observation&&message.result){
        const status={id:observation.id,storage:this.store.storage,verdict:observation.record.verdict,...(observation.blobId?{blobId:observation.blobId}:{})};
        message={...message,result:{...message.result,_meta:{...message.result._meta,'recall/observation':status},
          content:[...message.result.content,{type:'text',text:'Verified technical memory: '+JSON.stringify(status)}]}};
      }
      await this.inner.send(message,options);
    }catch(error){
      this.failed=true;this.stop?.();
      // Do not turn an uncertain observation write into an ordinary retryable tool failure.
      await this.inner.send({jsonrpc:'2.0',id:message.id,error:{code:-32603,message:'MEMORY_OBSERVER_STOPPED_DO_NOT_RETRY; operation may have completed'}},options);
      this.onerror?.(new Error('MEMORY_OBSERVER_STOPPED'));
    }
  }
}
