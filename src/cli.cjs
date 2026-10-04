#!/usr/bin/env node
"use strict";
async function main(){
    const command=process.argv[2];
    if(command==='mcp'){require('./bridge.cjs').start();return;}
    if(command==='install'||command==='uninstall'){console.log(JSON.stringify(require('./install.cjs')[command](),null,2));return;}
    if(command==='doctor'){const {apiKey,create}=require('./client.cjs');const key=!!apiKey();let connection;try{connection=key?await create().request('GET','/status'):null;}catch(e){connection={connected:false,code:e.code||'UNAVAILABLE'};}console.log(JSON.stringify({key_configured:key,connection},null,2));return;}
    console.log('사용법: apick-subagent install | uninstall | doctor | mcp\nAPI 키: APICK_API_KEY 환경변수로 설정하세요. 키를 명령행 인자로 넣지 마세요.');
}
main().catch(()=>{console.error('설정 또는 요청을 처리하지 못했습니다. 기존 설정과 API 키 환경변수를 확인하세요.');process.exitCode=1;});
