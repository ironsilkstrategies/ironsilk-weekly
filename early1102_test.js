const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const WD='/home/claude/work';let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const run=(iso)=>new Promise(res=>{let html=fs.readFileSync(path.join(WD,'nfl.html'),'utf8');html=html.replace(/<script src="min\/([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(WD,f),'utf8')}</script>`);
  const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:new (require('jsdom').VirtualConsole)(),beforeParse(w){const RD=w.Date;const N=RD.parse(iso);class FD extends RD{constructor(...a){super(...(a.length?a:[N]))}static now(){return N}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
  setTimeout(()=>res(w),1500);});
(async()=>{try{
  let w=await run('2026-11-02T09:12:00Z');   /* 3:12 AM CT, no games within 2 h */
  w.eval(`set(TC_KEY,{d:today(),by:{nfl:{picks:[{start:'2026-11-03T01:15:00Z'}]}}})`);
  T('3:12 AM with the first game 16 h away is too early',w.eval('deskTooEarly()')===true);
  await w.eval(`masterEvalFinish(['nfl','nhl'],['nba'])`);T('…so the master evaluation does not freeze the day',w.eval('deskFrozen()')===false);
  T('…and step 3 says to run it again after 9 AM',/too early to freeze/.test(w.eval('deskProcessHtml()')));
  w=await run('2026-11-02T16:00:00Z');w.eval(`set(TC_KEY,{d:today(),by:{nfl:{picks:[{start:'2026-11-03T01:15:00Z'}]}}})`);
  T('10 AM is not too early',w.eval('deskTooEarly()')===false);
  w=await run('2026-11-02T09:12:00Z');w.eval(`set(TC_KEY,{d:today(),by:{nfl:{picks:[{start:'2026-11-02T10:30:00Z'}]}}})`);
  T('early, but a game starts within 2 h → allowed',w.eval('deskTooEarly()')===false);
}catch(e){T('crashed',false,e.stack)}console.log(pass+' pass / '+fail+' fail');process.exit(0);})();
