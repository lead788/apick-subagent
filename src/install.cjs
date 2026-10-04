"use strict";
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const HASH=b=>crypto.createHash('sha256').update(b).digest('hex');
const BEGIN='# APICK-SUBAGENT:BEGIN v1',END='# APICK-SUBAGENT:END v1';
function locations(home=os.homedir()){return {home,own:path.join(home,'.apick-subagent'),codex:path.join(home,'.codex','config.toml'),claude:path.join(home,'.claude.json'),skills:[path.join(home,'.agents','skills','apick-subagent'),path.join(home,'.claude','skills','apick-subagent')]};}
function atomic(file,bytes){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,bytes,{mode:0o600,flag:'wx'});fs.renameSync(tmp,file);}
function read(file){try{return fs.readFileSync(file,'utf8');}catch(e){if(e.code==='ENOENT')return '';throw e;}}
function ownedBlock(text){const start=text.indexOf(BEGIN),end=text.indexOf(END);if(start<0&&end<0)return null;if(start<0||end<start||text.indexOf(BEGIN,start+1)>=0)throw Error('관리 설정 구간이 손상되었습니다.');return text.slice(start,end+END.length);}
function install(options={}){
    const p=locations(options.home),manifestFile=path.join(p.own,'install.json');const old=JSON.parse(read(manifestFile)||'{"files":{}}');const files={...old.files};
    const packageRoot=path.resolve(__dirname,'..'),cli=path.join(__dirname,'cli.cjs');
    const toml=read(p.codex),prior=ownedBlock(toml);if(!prior&&/^\s*\[mcp_servers\.apick_subagent\]/m.test(toml))throw Error('기존 apick_subagent 설정이 있어 덮어쓰지 않았습니다.');
    if(prior&&old.codexBlock&&HASH(prior)!==old.codexBlock)throw Error('사용자가 변경한 연결 설정을 보존했습니다.');
    const block=BEGIN+'\n[mcp_servers.apick_subagent]\ncommand = '+JSON.stringify(process.execPath)+'\nargs = ['+JSON.stringify(cli)+', "mcp"]\nenv_vars = ["APICK_API_KEY"]\n'+END;
    const claude=JSON.parse(read(p.claude)||'{}');const entry={command:process.execPath,args:[cli,'mcp']};const previous=claude.mcpServers?.['apick-subagent'];
    if(previous&&(!old.claudeEntry||HASH(JSON.stringify(previous))!==old.claudeEntry))throw Error('기존 Claude 연결 설정을 보존했습니다.');
    const sources=['SKILL.md','agents/openai.yaml'];
    for(const target of p.skills)for(const relative of sources){const dest=path.join(target,relative);if(fs.existsSync(dest)&&(!old.files[dest]||HASH(fs.readFileSync(dest))!==old.files[dest]))throw Error('수정된 스킬 파일을 보존했습니다: '+dest);}
    fs.mkdirSync(p.own,{recursive:true,mode:0o700});
    const backup=path.join(p.own,'backups',new Date().toISOString().replace(/[:.]/g,'-'));
    for(const f of [p.codex,p.claude])if(fs.existsSync(f)){fs.mkdirSync(backup,{recursive:true,mode:0o700});fs.copyFileSync(f,path.join(backup,path.basename(f)));}
    atomic(p.codex,prior?toml.replace(prior,block):toml+(toml&&!toml.endsWith('\n')?'\n':'')+'\n'+block+'\n');
    claude.mcpServers={...(claude.mcpServers||{}),'apick-subagent':entry};atomic(p.claude,JSON.stringify(claude,null,2)+'\n');
    for(const target of p.skills)for(const relative of sources){const dest=path.join(target,relative),bytes=fs.readFileSync(path.join(packageRoot,'skill',relative));atomic(dest,bytes);files[dest]=HASH(bytes);}
    atomic(manifestFile,JSON.stringify({version:1,files,codexBlock:HASH(block),claudeEntry:HASH(JSON.stringify(entry))},null,2));
    return {installed:true,clients:['Codex','Claude Code'],key_configured:!!process.env.APICK_API_KEY,notice:'클라이언트를 다시 시작하세요. 설치와 실제 연결 확인은 별개입니다.'};
}
function uninstall(options={}){
    const p=locations(options.home),manifestFile=path.join(p.own,'install.json');const old=JSON.parse(read(manifestFile)||'{"files":{}}'),preserved=[];
    const toml=read(p.codex),block=ownedBlock(toml);if(block){if(HASH(block)===old.codexBlock)atomic(p.codex,toml.replace(block,''));else preserved.push(p.codex);}
    const claude=JSON.parse(read(p.claude)||'{}'),entry=claude.mcpServers?.['apick-subagent'];if(entry){if(HASH(JSON.stringify(entry))===old.claudeEntry){delete claude.mcpServers['apick-subagent'];atomic(p.claude,JSON.stringify(claude,null,2)+'\n');}else preserved.push(p.claude);}
    for(const [file,hash] of Object.entries(old.files)){if(!p.skills.some(dir=>file.startsWith(dir+path.sep)))continue;if(fs.existsSync(file)){if(HASH(fs.readFileSync(file))===hash)fs.unlinkSync(file);else preserved.push(file);}}
    if(!preserved.length&&fs.existsSync(manifestFile))fs.unlinkSync(manifestFile);
    return {uninstalled:true,preserved,notice:'키와 백업은 보존했습니다.'};
}
module.exports={install,uninstall,locations};
