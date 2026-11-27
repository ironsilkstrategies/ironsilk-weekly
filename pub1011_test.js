const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const files={};const alerts=[];
/* fake GitHub: only ironsilkstrategies/ironsilk-weekly exists; only token GOOD can see/write it */
function gh(u,o){o=o||{};u=String(u);const m=(o.method||'GET').toUpperCase();const auth=(o.headers||{}).Authorization||'';const good=/GOOD/.test(auth);
  const J=(st,b)=>Promise.resolve({ok:st<300,status:st,json:()=>Promise.resolve(b),text:()=>Promise.resolve(JSON.stringify(b))});
  const rm=u.match(/repos\/([^/]+\/[^/?]+)(\/contents\/([^?]+))?/);if(!rm)return J(404,{});
  const repo=rm[1],file=rm[3];if(repo!=='ironsilkstrategies/ironsilk-weekly'||!good)return J(404,{message:'Not Found'});
  if(!file)return J(200,{full_name:repo});
  if(m==='GET')return files[file]?J(200,{sha:'s'+file}):J(404,{message:'Not Found'});
  if(m==='PUT'){files[file]=JSON.parse(o.body).content;return J(201,{});}return J(404,{});}
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-11T16:30:00Z')]))}static now(){return RD.parse('2026-10-11T16:30:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=gh;w.scrollTo=()=>{};w.alert=m=>alerts.push(m);w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  const td=w.eval('today()');
  w.eval(`set(BEST5_KEY,{d:'${td}',locked:true,lockedAt:Date.now(),top3:[{sp:'nfl',game:'DEN@LAC',pick:'Over 41.5',price:-115,blend:.55,p:.55}],bySport:{},picks:[]})`);
  T('the typo "ironsilkweekly" resolves to the real site repo',w.eval(`(set(LS.ghrepo,'ironsilkstrategies/ironsilkweekly'),pubRepo())`)==='ironsilkstrategies/ironsilk-weekly');
  /* Chris's phone: typo'd repo + an old token with no access + the working sync token */
  w.eval(`set(LS.ghtoken,'OLD_TOKEN');localStorage.setItem('d4.synctoken',JSON.stringify('github_pat_GOOD_123456'))`);
  const r=await w.eval('publishPicks(true)');
  T('publish succeeds: old token refused, sync token used',r.ok===true&&!!files['public/picks.json']&&!!files[`public/picks-${td}.json`],JSON.stringify(r));
  T('the fixed repo name and working token are saved for next time',w.eval('get(LS.ghrepo,"")')==='ironsilkstrategies/ironsilk-weekly'&&w.eval('get(LS.ghtoken,"")')==='github_pat_GOOD_123456');
  T('success message points at the public page',/Published/.test(alerts[alerts.length-1]||''));
  /* no token can write → a plain-English fix, not a raw 404 blob */
  w.eval(`set(LS.ghtoken,'OLD_TOKEN');localStorage.setItem('d4.synctoken',JSON.stringify('github_pat_NOPE_123456'))`);alerts.length=0;
  const r2=await w.eval('publishPicks(true)');
  T('without access: says which repo the token can\'t write to',r2.ok===false&&/can't write to ironsilkstrategies\/ironsilk-weekly/.test(alerts[0]||''),(alerts[0]||'').slice(0,90));
  T('…and how to fix it (add ironsilk-weekly to the TheDesk sync token)',/TheDesk sync.*ironsilk-weekly/s.test(alerts[0]||''));
  T('no raw JSON error blob shown',!/documentation_url/.test(alerts[0]||''));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2600);
