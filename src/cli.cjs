#!/usr/bin/env node
"use strict";
const USAGE='사용법: apick-subagent install | login | logout | doctor | uninstall | mcp\n'+
    '처음 설정: apick-subagent install 후 apick-subagent login. 마이페이지에서 발급한 연결 코드(또는 API 키)를 붙여 넣으면 화면에 보이지 않게 연결됩니다.\n'+
    '코드나 키를 명령행 인자로 넣지 마세요. APICK_API_KEY 환경변수도 계속 쓸 수 있습니다.';
async function main(){
    const command=process.argv[2];
    if(command==='mcp'){require('./bridge.cjs').start();return;}
    if(command==='install'||command==='uninstall'){console.log(JSON.stringify(require('./install.cjs')[command](),null,2));return;}
    if(command==='login'){
        if(process.argv.length>3){console.error('코드나 키를 명령행 인자로 넣지 마세요. apick-subagent login 만 실행하고 안내에 따라 붙여 넣으세요.');process.exitCode=1;return;}
        try{
            const result=await require('./login.cjs').login();
            console.log((result.via==='code'?'연결 코드로 받은 API 키를 저장했습니다: ':'API 키를 저장했습니다: ')+result.file+'\n클라이언트(Codex·Claude Code)를 다시 시작하면 연결됩니다.');
            if(result.env_key_overrides)console.log('참고: APICK_API_KEY 환경변수가 설정되어 있어 저장된 키보다 먼저 쓰입니다.');
        }catch(e){console.error(e.message);process.exitCode=1;}
        return;
    }
    if(command==='logout'){
        const result=require('./login.cjs').logout();
        console.log(result.removed?'저장된 API 키를 삭제했습니다.':'삭제할 저장된 API 키가 없습니다.');
        if(result.env_key_overrides)console.log('참고: APICK_API_KEY 환경변수는 그대로 남아 있습니다.');
        return;
    }
    if(command==='doctor'){const {keySource,create}=require('./client.cjs');const source=keySource();const key=source!=='none';let connection;try{connection=key?await create().request('GET','/status'):null;}catch(e){connection={connected:false,code:e.code||'UNAVAILABLE'};}console.log(JSON.stringify({key_configured:key,key_source:source,connection},null,2));return;}
    console.log(USAGE);
}
main().catch(()=>{console.error('설정 또는 요청을 처리하지 못했습니다. 기존 설정과 API 키 환경변수를 확인하세요.');process.exitCode=1;});
