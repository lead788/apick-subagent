"use strict";
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {create,privateFile,baseUrl}=require('./client.cjs');
const KEY_FORMAT=/^\S{8,512}$/;
// 마이페이지의 일회용 연결 코드: I·O·0·1 을 뺀 대문자·숫자 26자. 화면에는 네 글자씩 하이픈으로 나눠 보인다.
const CODE_FORMAT=/^[A-HJ-NP-Z2-9]{26}$/;

// 화면에 글자를 보이지 않게 입력받는다. 입력이 파이프(예: 클립보드 도구 출력)면 그대로 읽는다.
function readSecret(prompt){
    return new Promise((resolve,reject)=>{
        const input=process.stdin;
        if(!input.isTTY){
            let data='';input.setEncoding('utf8');
            input.on('data',chunk=>{data+=chunk;});
            input.on('end',()=>resolve(data.trim()));
            input.on('error',reject);
            return;
        }
        process.stdout.write(prompt);
        let value='';input.setRawMode(true);input.setEncoding('utf8');input.resume();
        const finish=(callback,arg)=>{input.removeListener('data',onData);input.setRawMode(false);input.pause();process.stdout.write('\n');callback(arg);};
        const onData=chunk=>{
            for(const ch of chunk){
                if(ch==='\r'||ch==='\n')return finish(resolve,value.trim());
                if(ch==='\u0003')return finish(reject,Object.assign(Error('입력을 취소했습니다.'),{code:'CANCELLED'}));
                if(ch==='\u007f'||ch==='\b'){value=value.slice(0,-1);continue;}
                value+=ch;
            }
        };
        input.on('data',onData);
    });
}

// 입력이 연결 코드면 정규화한 코드를, 아니면 null 을 돌려준다. API 키(32자 16진수)와는 길이가 달라 섞이지 않는다.
function pairingCode(input){
    const normalized=String(input||'').toUpperCase().replace(/[\s-]/g,'');
    return CODE_FORMAT.test(normalized)?normalized:null;
}

// 연결 코드를 인증키로 바꾼다. 코드는 서버에서 한 번 쓰면 사라지므로 이 함수는 다시 시도하지 않는다.
async function exchangeCode(code,options={}){
    const base=baseUrl(options.baseUrl||process.env.APICK_SUBAGENT_URL);
    const fetcher=options.fetch||global.fetch;
    let response;
    try{
        response=await fetcher(base+'/subagent/pair',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({code}),redirect:'error',signal:AbortSignal.timeout(30000)});
    }catch(e){
        throw Error('에이픽 서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 실행하세요.');
    }
    let body={};
    try{body=await response.json();}catch(e){body={};}
    if(response.ok&&typeof body.license_key==='string'&&KEY_FORMAT.test(body.license_key))return body.license_key;
    const errorCode=body&&body.error&&body.error.code;
    if(response.status===401&&errorCode==='AUTH_REQUIRED')throw Error('이 계정은 API 사용이 제한돼 있습니다. 마이페이지에서 계정 상태를 확인하세요.');
    if(response.status===401)throw Error('연결 코드가 올바르지 않거나 만료됐습니다. 마이페이지에서 새 코드를 발급하세요.');
    if(response.status===429)throw Error('요청이 너무 많습니다. 잠시 뒤 다시 실행하세요.');
    if(response.status===404)throw Error('이 계정에서는 에이픽 서브에이전트를 쓸 수 없습니다.');
    throw Error('에이픽 서버가 응답하지 않습니다. 잠시 뒤 다시 실행하세요.');
}

function save(file,key){
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    const tmp=file+'.'+crypto.randomUUID()+'.tmp';
    fs.writeFileSync(tmp,JSON.stringify({api_key:key,saved_at:new Date().toISOString()},null,2)+'\n',{mode:0o600,flag:'wx'});
    fs.renameSync(tmp,file);
}

// 연결 코드 또는 API 키를 받는다. 키는 서버에 한 번 확인한 뒤에만 저장한다. 잘못된 키와 코드는 파일에 남지 않는다.
async function login(options={}){
    const file=options.file||privateFile();
    const input=typeof options.key==='string'?options.key.trim():await readSecret('연결 코드 또는 API 키를 붙여 넣고 Enter: ');
    const code=pairingCode(input);
    const key=code?await exchangeCode(code,options):input;
    if(!KEY_FORMAT.test(key))throw Error('입력 형식이 올바르지 않습니다. 마이페이지에서 연결 코드를 발급하거나 API 키를 다시 복사하세요.');
    try{
        await create({apiKey:key,baseUrl:options.baseUrl,fetch:options.fetch}).request('GET','/status');
    }catch(e){
        if(e.status===401||e.status===403)throw Error('인증되지 않은 API 키입니다. 마이페이지에서 키와 허용 IP 설정을 확인하세요.');
        if(e.status)throw Error('에이픽 서버가 응답하지 않습니다. 잠시 뒤 다시 실행하세요.');
        throw Error('에이픽 서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 실행하세요.');
    }
    save(file,key);
    return {file,via:code?'code':'key',env_key_overrides:!!process.env.APICK_API_KEY};
}

function logout(options={}){
    const file=options.file||privateFile();
    const existed=fs.existsSync(file);
    if(existed)fs.unlinkSync(file);
    return {removed:existed,file,env_key_overrides:!!process.env.APICK_API_KEY};
}

module.exports={login,logout,readSecret,pairingCode,exchangeCode,KEY_FORMAT,CODE_FORMAT};
