"use strict";
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const {create,collect}=require('./client.cjs');
const object=properties=>({type:'object',properties,additionalProperties:false});const string={type:'string'};const strings={type:'array',items:string};
const TOOLS=[
    {name:'apick_status',description:'에이픽 서브에이전트의 상태·잔액·지원 작업을 확인합니다. 무료입니다.',inputSchema:object({})},
    {name:'apick_dispatch',description:'현재 작업 공간의 지정 파일을 직접 수집해 조사·추출·요약·비교를 위임합니다. 원문을 먼저 전부 읽을 필요가 없습니다. 결과는 근거와 함께 검수하세요. 성공한 작업만 포인트를 청구하며 검수 승인된 동일 결과 재사용은 무료입니다.',inputSchema:{...object({kind:{type:'string',enum:['inventory','extract','summarize','compare']},goal:string,include:strings,exclude:strings,focus:strings,acceptance:strings,retention:{type:'string',enum:['seven_days','none']},idempotency_key:string}),required:['kind','goal','include','idempotency_key']}},
    {name:'apick_collect',description:'접수한 작업의 상태와 짧은 결과를 확인합니다. next_cursor가 있으면 결과가 더 있습니다.',inputSchema:{...object({job_id:string,cursor:string}),required:['job_id']}},
    {name:'apick_evidence',description:'검수할 결과의 정확한 원문 인용·줄 번호·해시를 확인합니다.',inputSchema:{...object({job_id:string,evidence_ids:strings}),required:['job_id','evidence_ids']}},
    {name:'apick_review',description:'직접 확인한 결과 해시에 승인 또는 반려를 기록합니다. 원본 수정·환불 기능은 없습니다.',inputSchema:{...object({job_id:string,result_hash:string,decision:{type:'string',enum:['accepted','rejected']}}),required:['job_id','result_hash','decision']}},
    {name:'apick_cancel',description:'요청한 작업을 취소합니다. 응답 유실을 이유로 새 작업을 재접수하지 마세요.',inputSchema:{...object({job_id:string}),required:['job_id']}},
    {name:'apick_usage',description:'작업·외부 호출·토큰·캐시·청구 포인트를 확인합니다. 미연동 주 모델 비용은 절감액으로 확정하지 않습니다.',inputSchema:object({})},
];
function endpoint(id){if(typeof id!=='string'||!/^saj_[a-f0-9]{32}$/.test(id))throw Error('작업 ID가 올바르지 않습니다.');return '/jobs/'+id;}
function handlers(options={}){
    const client=options.client||create();const root=options.root||process.env.APICK_WORKSPACE||process.cwd();
    return async(name,args={},signal)=>{
        if(name==='apick_status')return client.request('GET','/status');
        if(name==='apick_usage')return client.request('GET','/usage');
        if(name==='apick_dispatch'){
            if(!['inventory','extract','summarize','compare'].includes(args.kind)||typeof args.goal!=='string'||typeof args.idempotency_key!=='string'||args.idempotency_key.length<8)throw Error('작업 종류·목표·중복 방지 키를 확인하세요.');
            const workspace=options.getRoot?await options.getRoot():root;
            const list=collect(workspace,args.include,args.exclude||[]);
            return require('./receipts.cjs').dispatch(client,workspace,args,list,{home:options.home,signal});
        }
        if(name==='apick_collect')return client.request('GET',endpoint(args.job_id)+(args.cursor?'?cursor='+encodeURIComponent(args.cursor):''));
        if(name==='apick_evidence')return client.request('POST',endpoint(args.job_id)+'/evidence',{evidence_ids:args.evidence_ids});
        if(name==='apick_review')return client.request('POST',endpoint(args.job_id)+'/review',{decision:args.decision,result_hash:args.result_hash});
        if(name==='apick_cancel')return client.request('POST',endpoint(args.job_id)+'/cancel',{});
        throw Error('지원하지 않는 도구입니다.');
    };
}
function start(options={}){
    const readline=require('readline');const pending=new Map(),active=new Map();let rootsSupported=false;
    const getRoot=async()=>{
        if(options.root||process.env.APICK_WORKSPACE)return options.root||process.env.APICK_WORKSPACE;
        if(!rootsSupported)return process.cwd();
        const id='roots-'+crypto.randomUUID();const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('작업 공간을 확인하지 못했습니다.'));},10000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject});send({jsonrpc:'2.0',id,method:'roots/list'});});
        if(!Array.isArray(result?.roots)||result.roots.length!==1)throw Error('하나의 프로젝트를 열거나 APICK_WORKSPACE를 지정하세요.');
        return require('url').fileURLToPath(result.roots[0].uri);
    };
    const run=handlers({...options,getRoot});const input=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
    const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
    input.on('line',async line=>{
        let request;try{request=JSON.parse(line);}catch(e){send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'JSON 형식이 올바르지 않습니다.'}});return;}
        if(!request||typeof request!=='object'||Array.isArray(request)||request.jsonrpc!=='2.0'){send({jsonrpc:'2.0',id:null,error:{code:-32600,message:'요청 형식이 올바르지 않습니다.'}});return;}
        if(pending.has(request.id)){const p=pending.get(request.id);pending.delete(request.id);request.error?p.reject(Error('작업 공간 조회 실패')):p.resolve(request.result);return;}
        if(request.method==='notifications/cancelled'){active.get(request.params?.requestId)?.abort();return;}
        if(request.id===undefined)return;
        const abort=new AbortController();active.set(request.id,abort);
        try{
            let result;
            if(request.method==='initialize'){rootsSupported=!!request.params?.capabilities?.roots;result={protocolVersion:'2025-11-25',capabilities:{tools:{listChanged:false}},serverInfo:{name:'apick-subagent',version:'1.0.0'}};}
            else if(request.method==='ping')result={};
            else if(request.method==='tools/list')result={tools:TOOLS};
            else if(request.method==='tools/call'){const data=await run(request.params?.name,request.params?.arguments,abort.signal);result={content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data,isError:false};}
            else{send({jsonrpc:'2.0',id:request.id,error:{code:-32601,message:'지원하지 않는 요청입니다.'}});return;}
            send({jsonrpc:'2.0',id:request.id,result});
        }catch(e){send({jsonrpc:'2.0',id:request.id,result:{content:[{type:'text',text:e.code?('['+e.code+'] '+e.message):'요청을 완료하지 못했습니다. 작업 상태와 연결 설정을 확인하세요.'}],isError:true}});}finally{active.delete(request.id);}
    });return input;
}
module.exports={TOOLS,handlers,start};
