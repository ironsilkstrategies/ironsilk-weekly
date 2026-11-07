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
  /* v2.86.6 · Nov 7: "I should be able to freeze whenever I need to" — an early run waits for your OK; the button works at any hour */
  const card=w.eval('deskProcessHtml()');
  T('…step 3 says it is an early run — freeze whenever you are ready (no "run again after 9 AM")',/early run · freeze whenever you're ready/.test(card)&&!/too early to freeze|run again after 9/.test(card),card.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,240));
  T('…and the card offers 🔒 Looks good — freeze & publish at 3:12 AM',/onclick="deskReviewFreeze\(\)"/.test(card));
  w.eval('window.__NO_BOOK__=true');   /* the Book's pre-freeze re-read is its own gate (no clock rule) — this test is about the hour */
  w.eval('deskReviewFreeze()');await new Promise(r=>setTimeout(r,3000));   /* the publish after it polls the clock, which this test holds still */
  T('…and tapping it freezes the day at 3:12 AM, Best 3 locked',w.eval('deskFrozen()')===true&&w.eval('best5State().locked')===true,JSON.stringify(w.eval(`get(FREEZE_KEY,null)`)));
  w=await run('2026-11-02T16:00:00Z');w.eval(`set(TC_KEY,{d:today(),by:{nfl:{picks:[{start:'2026-11-03T01:15:00Z'}]}}})`);
  T('10 AM is not too early',w.eval('deskTooEarly()')===false);
  w=await run('2026-11-02T09:12:00Z');w.eval(`set(TC_KEY,{d:today(),by:{nfl:{picks:[{start:'2026-11-02T10:30:00Z'}]}}})`);
  T('early, but a game starts within 2 h → allowed',w.eval('deskTooEarly()')===false);
}catch(e){T('crashed',false,e.stack)}console.log(pass+' pass / '+fail+' fail');process.exit(0);})();
