"use strict";
const fs=require('fs');const path=require('path');const crypto=require('crypto');const os=require('os');
const DENY=/(^|\/)(?:\.env(?:\..*)?|\.git|node_modules|\.ssh|\.aws|\.npmrc|\.netrc|\.pypirc|\.git-credentials|id_rsa(?:\..*)?|id_ed25519(?:\..*)?|secrets?(?:\..*)?|credentials(?:\..*)?|config(?:\.[^/]*)?\.json|[^/]*\.(?:pem|key|p12|pfx|sqlite|db))($|\/)/i;
const OMIT=new Set(['.git','node_modules','dist','build','.cache','.next','.venv','vendor']);
const TEXT=/\.(?:txt|md|mdx|csv|tsv|json|jsonl|yaml|yml|toml|xml|html|ejs|css|scss|js|jsx|cjs|mjs|ts|tsx|py|rb|go|rs|java|c|h|cpp|cs|sql|sh|ps1|vue|svelte|ini|log)$/i;
function digest(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
const SECRET_CONTENT=/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----|\b(?:sk|ghp|github_pat)[-_][A-Za-z0-9_\-]{20,}|\bAKIA[A-Z0-9]{16}\b|\bBearer\s+[A-Za-z0-9_./+=-]{20,}|(?:api[_-]?key|password|secret|token)\s*["']?\s*[:=]\s*["']?[A-Za-z0-9_+/=.-]{16,}/i;
function checkSecret(text){if(SECRET_CONTENT.test(text))throw Error('인증정보로 보이는 내용이 있어 전송을 중단했습니다.');}
function scanFile(file,expected){const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));const hash=crypto.createHash('sha256'),decoder=new TextDecoder('utf-8',{fatal:true}),block=Buffer.alloc(262144);let tail='',valid=true;try{let n;while((n=fs.readSync(fd,block,0,block.length,null))>0){const b=block.subarray(0,n);if(b.includes(0))valid=false;hash.update(b);try{const text=tail+decoder.decode(b,{stream:true});checkSecret(text);tail=text.slice(-512);}catch(e){if(e.code==='ERR_ENCODING_INVALID_ENCODED_DATA')valid=false;else throw e;}}try{decoder.decode();}catch(e){valid=false;}const end=fs.fstatSync(fd);if(end.size!==expected.size||end.mtimeMs!==expected.mtimeMs)throw Error('수집 중 파일이 변경되었습니다.');return valid?hash.digest('hex'):null;}finally{fs.closeSync(fd);}}
function privateFile(){return path.join(process.env.APICK_SUBAGENT_HOME||path.join(os.homedir(),'.apick-subagent'),'credentials.json');}
function apiKey(){if(process.env.APICK_API_KEY)return process.env.APICK_API_KEY.trim();try{return String(JSON.parse(fs.readFileSync(privateFile(),'utf8')).api_key||'').trim();}catch(e){return '';}}
function baseUrl(value){const u=new URL(value||'https://apick.app');if(u.protocol!=='https:'||u.username||u.password)throw Error('HTTPS 서비스 주소가 필요합니다.');return u.origin;}
function create(options={}){
    const base=baseUrl(options.baseUrl||process.env.APICK_SUBAGENT_URL);const key=options.apiKey||apiKey();const fetcher=options.fetch||global.fetch;
    async function request(method,route,body,idempotencyKey){
        if(!key)throw Error('APICK_API_KEY를 설정하거나 설치 과정에서 API 키를 입력하세요.');
        const headers={Authorization:'Bearer '+key,Accept:'application/json'};if(body!==undefined)headers['Content-Type']='application/json';if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
        const response=await fetcher(base+'/rest/subagent/v1'+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(60000)});
        const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error?.message||'요청을 처리하지 못했습니다.'),{code:result.error?.code,status:response.status});return result;
    }
    async function upload(relative,bytes,retention='seven_days'){
        const source=Buffer.isBuffer(bytes)?{length:bytes.length,sha256:digest(bytes),read:(a,n)=>bytes.subarray(a,a+n)}:bytes;
        const file=await request('POST','/files',{path:relative,bytes:source.length,sha256:source.sha256,retention});if(file.state==='ready')return file;
        const partSize=Number(file.part_bytes);if(!Number.isSafeInteger(partSize)||partSize<1||partSize>1048576)throw Error('업로드 규격을 확인하지 못했습니다.');
        let tail='';for(let n=0,start=0;start<source.length;n++,start+=partSize){const part=source.read(start,partSize);const text=tail+part.toString('utf8');checkSecret(text);tail=text.slice(-512);await request('POST','/files/'+file.file_id+'/parts',{part_no:n,data:part.toString('base64')});}
        return request('POST','/files/'+file.file_id+'/complete',{});
    }
    return {request,upload,scope:digest(base+'\0'+key)};
}
function within(root,file){return file!==root&&file.startsWith(root+path.sep);}
function validateRelative(p){if(typeof p!=='string'||!p||/[\x00-\x1f\\:]/.test(p)||p.startsWith('/')||p.split('/').some(s=>s==='.'||s==='..'||!s)||DENY.test(p))throw Error('전송할 수 없는 파일 경로입니다.');return p;}
function collect(root,includes,excludes=[]){
    const realRoot=fs.realpathSync(root);if(!Array.isArray(includes)||!includes.length)throw Error('조사할 include 범위를 지정하세요.');
    if(realRoot===fs.realpathSync(os.homedir())||realRoot===path.parse(realRoot).root)throw Error('프로젝트 폴더에서 실행하거나 APICK_WORKSPACE를 지정하세요.');
    const excluded=new Set();for(const pattern of excludes){if(typeof pattern!=='string'||pattern.startsWith('/')||pattern.includes('..')||pattern.includes('\\'))throw Error('제외 경로가 올바르지 않습니다.');for(const p of fs.globSync(pattern,{cwd:realRoot}))excluded.add(p.replace(/\\/g,'/'));}
    const found=new Set();for(const pattern of includes){if(typeof pattern!=='string'||pattern.startsWith('/')||pattern.includes('..')||pattern.includes('\\')||pattern.includes(':'))throw Error('포함 경로가 올바르지 않습니다.');for(const p of fs.globSync(pattern,{cwd:realRoot}))found.add(p.replace(/\\/g,'/'));}
    const result=[];
    for(const relative of [...found].sort()){
        if(excluded.has(relative)||[...excluded].some(e=>relative.startsWith(e+'/'))||DENY.test(relative)||/(^|\/)(?:config(?:\.[^/]*)?|settings(?:\.[^/]*)?|appsettings(?:\.[^/]*)?)\.(?:json|ya?ml|toml|ini)$/i.test(relative)||relative.split('/').some(x=>OMIT.has(x)))continue;
        const absolute=path.join(realRoot,relative);const stat=fs.lstatSync(absolute);if(!stat.isFile()||stat.isSymbolicLink()||!TEXT.test(relative))continue;
        validateRelative(relative);const resolved=fs.realpathSync(absolute);if(!within(realRoot,resolved))throw Error('작업 공간 밖 파일을 전송할 수 없습니다.');
        let check=absolute;while(check!==realRoot){if(fs.lstatSync(check).isSymbolicLink())throw Error('링크 경로를 전송할 수 없습니다.');check=path.dirname(check);}
        const sha256=scanFile(resolved,stat);if(!sha256)continue;
        const read=(offset,length)=>{if(fs.realpathSync(absolute)!==resolved||fs.lstatSync(absolute).isSymbolicLink())throw Error('파일 경로가 변경되었습니다.');const fd=fs.openSync(resolved,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));try{const now=fs.fstatSync(fd);if(now.size!==stat.size||now.mtimeMs!==stat.mtimeMs||now.ino!==stat.ino)throw Error('수집 후 파일이 변경되었습니다.');const buffer=Buffer.alloc(Math.min(length,stat.size-offset));const n=fs.readSync(fd,buffer,0,buffer.length,offset);if(n!==buffer.length)throw Error('파일이 변경되었습니다.');return buffer;}finally{fs.closeSync(fd);}};
        result.push({path:relative,bytes:{length:stat.size,sha256,read}});
    }
    if(!result.length)throw Error('허용된 텍스트 파일을 찾지 못했습니다. include 범위를 확인하세요.');return result;
}
module.exports={create,collect,validateRelative,privateFile,apiKey,digest,DENY};
