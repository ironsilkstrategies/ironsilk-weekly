/* v2.81 · two functions were silently replaced by a later one with the same name:
   the screenshot/file intake job (intakeFile) and the My Tickets closing-line summary (clvSummary).
   Also guards against it happening again: no file may declare the same top-level name twice. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function page(file){let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-31T15:00:00Z')]))}static now(){return RD.parse('2026-10-31T15:00:00Z')}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__FETCHED=[];w.fetch=(u)=>{w.__FETCHED.push(String(u));return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  const w=page('nba.html');await sleep(2500);
  T('intakeFile is the file-intake job again (takes a File)',/^async function intakeFile\(\w+,\w+\)/.test(w.eval('intakeFile.toString()')),w.eval('intakeFile.toString()').slice(0,60));
  T('the day-file reader has its own name',typeof w.eval('intakeDayText')==='function');
  w.eval('window.__FETCHED.length=0');await w.eval(`intakeDayText('2026-10-31','.txt')`);
  T('…and it fetches intake/<day>.txt',w.eval('window.__FETCHED').some(u=>/intake\/2026-10-31\.txt/.test(u)),JSON.stringify(w.eval('window.__FETCHED')));
  /* a .txt dropped into the intake is read locally (no fetch of "[object File]") */
  w.eval('window.__FETCHED.length=0');
  const r=await w.eval(`(async()=>{const f=new File(['NBA\\nBOS @ NYK\\nBOS -3.5 (-110)\\n'],'lines.txt',{type:'text/plain'});try{return await intakeFile(f,{aborted:false});}catch(e){return'ERR '+e.message;}})()`);
  T('a dropped file never turns into a fetch of "[object File]"',!w.eval('window.__FETCHED').some(u=>/object/.test(u)),JSON.stringify(w.eval('window.__FETCHED')));
  T('the My Tickets closing-line summary returns its own shape',(()=>{const S=w.eval('clvTicketSummary()');return S&&'n' in S&&'beatPct' in S&&Array.isArray(S.rows);})());
  T('the per-character CLV table keeps clvSummary',(()=>{const S=w.eval('clvSummary()');return S&&S.you&&S.ch;})());
  w.close();
  /* no same-file duplicate top-level declarations, in any script */
  const acorn=require('/tmp/claude-0/-home-claude/12429b40-4b2e-5193-937c-60a0550c1741/scratchpad/tools/node_modules/acorn');
  const files=fs.readdirSync(W).filter(f=>/\.js$/.test(f)&&!/_test\.js$/.test(f)&&f!=='sw.js');const dups=[];
  files.forEach(f=>{let ast;try{ast=acorn.parse(fs.readFileSync(path.join(W,f),'utf8'),{ecmaVersion:2022,sourceType:'script',allowHashBang:true});}catch(e){return;}
    const seen=new Set();ast.body.forEach(n=>{const names=n.type==='FunctionDeclaration'?[n.id.name]:n.type==='VariableDeclaration'?n.declarations.filter(d=>d.id.type==='Identifier').map(d=>d.id.name):[];
      names.forEach(nm=>{if(seen.has(nm))dups.push(f+':'+nm);seen.add(nm);});});});
  T('no script declares the same top-level name twice',!dups.length,dups.join(', '));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
