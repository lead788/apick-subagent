"use strict";
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
async function dispatch(client,root,args,list,options={}){
    const home=options.home||process.env.APICK_SUBAGENT_HOME||path.join(os.homedir(),'.apick-subagent');
    const dir=path.join(home,'receipts',hash([client.scope||'test',fs.realpathSync(root)]));fs.mkdirSync(dir,{recursive:true,mode:0o700});
    const file=path.join(dir,hash(args.idempotency_key)+'.json'),lock=file+'.lock';let fd;
    for(let attempt=0;attempt<300;attempt++){
        try{fd=fs.openSync(lock,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({pid:process.pid,created:Date.now()}));break;}
        catch(e){if(e.code!=='EEXIST')throw e;try{const existing=JSON.parse(fs.readFileSync(lock,'utf8'));if(Date.now()-existing.created>60000){let alive=true;try{process.kill(existing.pid,0);}catch(error){alive=error.code!=='ESRCH';}if(!alive){fs.unlinkSync(lock);continue;}}}catch(ignored){}await new Promise(r=>setTimeout(r,100));}
    }
    if(fd===undefined)throw Error('같은 요청을 처리하고 있습니다. 같은 키로 다시 확인하세요.');
    try{
        const active=()=>{if(options.signal?.aborted)throw Error('접수가 취소되었습니다.');};active();
        const fingerprint=hash([args,list.map(f=>({path:f.path,hash:f.bytes.sha256||hash(f.bytes.toString('base64'))}))]);let receipt;
        try{receipt=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;receipt={fingerprint,files:[]};}
        if(receipt.fingerprint!==fingerprint)throw Object.assign(Error('같은 중복 방지 키에 다른 내용이 지정되었습니다.'),{code:'IDEMPOTENCY_CONFLICT'});
        const save=()=>{const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(receipt),{mode:0o600});fs.renameSync(tmp,file);};
        if(receipt.response)return client.request('GET','/jobs/'+receipt.response.job_id);
        for(let n=receipt.files.length;n<list.length;n++){active();receipt.files.push((await client.upload(list[n].path,list[n].bytes,args.retention)).file_id);save();}active();
        receipt.response=await client.request('POST','/jobs',{kind:args.kind,goal:args.goal,file_ids:receipt.files,focus:args.focus||[],acceptance:args.acceptance||[],retention:args.retention||'seven_days'},args.idempotency_key);save();return receipt.response;
    }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
module.exports={dispatch,hash};
