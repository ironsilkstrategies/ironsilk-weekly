/* v2.82.1 · Nov 1: a full NFL Sunday never reached today's card. On the master evaluation's relay pages the only thing that
   put a board on the card was a paint hook — set before the sport's engine had loaded, and starved by a board that kept
   repainting — so the NFL (and NHL) pages waited out 40 s and evaluated without their board. And the Best 3 locked at 8:18,
   mid-relay, with one sport read. Now: the hook is set again once every script is in, the debounce can't starve, a relay page
   puts its own board on the card, and the Best 3 waits for the whole evaluation. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW='2026-10-31T15:00:00Z';
const team=(ab,nm)=>({team:{abbreviation:ab,displayName:nm,shortDisplayName:nm,location:nm,name:nm},homeAway:'',score:'0'});
const ev=(id,date,a,h)=>({id,date,status:{type:{state:'pre',description:'Scheduled'}},competitions:[{date,status:{type:{state:'pre',description:'Scheduled'},period:0,displayClock:'0:00'},competitors:[{...team(a[0],a[1]),homeAway:'away'},{...team(h[0],h[1]),homeAway:'home'}]}]});
const WEEK10={season:{year:2026,type:2},week:{number:10},events:[ev('901','2026-10-31T19:00Z',['ILL','Illinois Fighting Illini'],['MD','Maryland Terrapins']),ev('902','2026-10-31T23:30Z',['SMU','SMU Mustangs'],['SYR','Syracuse Orange'])]};
function page(file,q,setup){let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file+(q||''),pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;const T0=RD.now();class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse(NOW)+(RD.now()-T0)]))}static now(){return RD.parse(NOW)+(RD.now()-T0)}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_REOPEN__=true;w.__NO_SYNC_LOOP__=true;
    w.fetch=(u)=>{u=String(u);if(/college-football\/scoreboard\?groups=80&limit=100$/.test(u))return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(JSON.parse(JSON.stringify(WEEK10)))});
      return Promise.resolve({ok:false,status:404,headers:{get:()=>null},json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');if(setup)setup(w);}}).window;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  /* ── the paint hook, set again after the engines load ── */
  const w=page('nba.html');await sleep(2500);
  T('the paint hook is on every engine\'s render once the page is up',['renderNBA'].every(f=>w[f]&&w[f].__tc===1));
  w.eval(`window.renderNHL=function(){window.__RN=(window.__RN||0)+1};window.__SS=0;const S0=todaySnapshotSoon;todaySnapshotSoon=function(){window.__SS++;};tcWrapRenders();renderNHL();`);
  T('an engine that loads after shared.js still gets the hook (tcWrapRenders)',w.eval('renderNHL.__tc')===1&&w.eval('window.__RN')===1&&w.eval('window.__SS')===1);
  const sh=fs.readFileSync(path.join(W,'shared.js'),'utf8');
  T('…and it is set again on the loader\'s DOMContentLoaded, on load, and at 0.8/2.5/6 s',/document\.addEventListener\('DOMContentLoaded',\(\)=>\{try\{tcWrapRenders\(\);\}catch\(e\)\{\}\}\);window\.addEventListener\('load',\(\)=>\{try\{tcWrapRenders\(\);\}catch\(e\)\{\}\}\);/.test(sh)&&/\[800,2500,6000\]\.forEach/.test(sh));
  /* ── the debounce can't starve ── */
  w.eval(`todaySnapshotSoon=window.__TSS_ORIG||todaySnapshotSoon;`);
  const src=sh.match(/function todaySnapshotSoon\(\)\{[^\n]*\}/)[0];w.eval(src);
  w.eval(`window.__TS=[];const TS0=todaySnapshot;todaySnapshot=function(){window.__TS.push(Date.now());};window.__T0=Date.now();window.__IV=setInterval(()=>todaySnapshotSoon(),300);`);
  await sleep(7200);w.eval('clearInterval(window.__IV)');const fired=w.eval('window.__TS.map(t=>t-window.__T0)');
  T('a board repainting every 0.3 s still gets on the card within ~6 s (before: never, while it kept painting)',fired.length>=1&&fired[0]<=6600,JSON.stringify(fired));
  /* ── the Best 3 waits for the whole evaluation ── */
  w.eval(`set(EVAL_LOCK_KEY,{date:today(),by:{nhl:Date.now()}});localStorage.removeItem('d4.freeze');DESK_EVAL_BUSY=false;`);
  w.eval(`set(EVAL_CHAIN_KEY,{ts:Date.now(),d:today(),todo:['nfl','nhl'],done:['nba'],miss:[],back:'nba.html'})`);
  T('mid-relay (sports still to evaluate) the evaluation hasn\'t "run": the Best 3 can\'t lock on one sport',w.eval('evalRanToday()')===false);
  w.eval(`set(EVAL_CHAIN_KEY,{ts:Date.now(),d:today(),todo:['nfl'],done:[],miss:[],back:'nba.html',mode:'load'})`);
  T('"Load all sports" walking the boards doesn\'t count as an evaluation in progress',w.eval('evalRanToday()')===true);
  w.eval(`localStorage.removeItem(EVAL_CHAIN_KEY)`);T('relay done: it has run',w.eval('evalRanToday()')===true);
  w.eval(`set(EVAL_CHAIN_KEY,{ts:Date.now()-16*60e3,d:today(),todo:['nfl'],done:[],miss:[],back:'nba.html'})`);T('an abandoned relay (15 min+) stops blocking',w.eval('evalRanToday()')===true);
  w.close();
  /* ── v2.82.2 · each board's own slice heals the shared card ── */
  const h=page('nba.html');await sleep(2500);
  h.eval(`window.__TD=today();set(TC_KEY,{d:__TD,by:{nba:{ts:Date.now()-5000,picks:[{game:'ATL@BOS',m:'ml',sd:'home',pick:'BOS ML',price:-150}],props:[]}}});
    set('d4.tcs.nfl',{d:__TD,B:{ts:Date.now()-3000,picks:[{game:'KC@BUF',m:'spread',sd:'away',pick:'KC +2.5',price:-110,start:'2026-11-01T18:00:00Z'}],props:[]}});
    set('d4.tcs.nhl',{d:'2026-10-30',B:{ts:Date.now(),picks:[{game:'OLD@DAY'}]}});
    set('d4.tcs.nba',{d:__TD,B:{ts:Date.now()-60000,picks:[]}});`);
  const H1=h.eval('tcHeal()');
  T('a sport dropped from the shared card comes back from its own slice',!!(H1.by.nfl&&H1.by.nfl.picks[0].pick==='KC +2.5')&&!!h.eval('get(TC_KEY,{}).by.nfl'));
  T('…a slice from another day is ignored, and an older slice never replaces a newer card entry',!H1.by.nhl&&H1.by.nba.picks.length===1);
  h.eval(`set(TC_KEY,{d:__TD,by:{nba:{ts:Date.now()-5000,picks:[]}}});todaySnapshot(true);`);
  const H2=h.eval('get(TC_KEY,{})');
  T('a page writing its own sport keeps every other sport (it builds on the healed card)',!!(H2.by.nba&&H2.by.nfl));
  T('…and saves its own slice',h.eval(`(get('d4.tcs.nba',null)||{}).d===__TD`));
  h.eval(`set(REOPEN_KEY,{d:__TD,ts:Date.now(),why:'test'});localStorage.removeItem(REOPEN_DONE);deskReopenCheck();`);
  T('unfreeze clears the slices\' unstarted picks too (the heal can\'t bring them back)',h.eval(`(get('d4.tcs.nfl',null).B.picks||[]).length`)===0&&!(h.eval('tcHeal()').by.nfl.picks||[]).length);
  const sj=fs.readFileSync(path.join(W,'store.js'),'utf8');
  T('a background page waits up to 20 s for the big store before running without it',/\[\?&\]bg=1\/\.test\(location\.search\|\|''\)\?20000:6000/.test(sj));
  T('the Book, the freeze, the Best 3 and the end of the relay all read the healed card',/tcHeal\(\):get\(TC_KEY,\{\}\)\)\|\|\{\};/.test(fs.readFileSync(path.join(W,'desk-book.js'),'utf8'))&&/function tcFreeze\(\)\{const T=\(typeof tcHeal==='function'\?tcHeal\(false\)/.test(fs.readFileSync(path.join(W,'desk-core.js'),'utf8'))&&/if\(!S\.locked\)\{try\{tcHeal\(\);\}catch\(e\)\{\}const b=best5Build\(\);/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8')));
  h.close();
  /* ── a relay page puts its own board on the card, then evaluates ── */
  const c=page('cfb.html','?bg=1&eval=1&chain=1&v=1',x=>{x.localStorage.setItem('d4.evalchain',JSON.stringify({ts:Date.parse(NOW),d:'2026-10-31',todo:['ncaaf','nhl'],done:['nba'],miss:[],back:'nba.html'}));
    x.localStorage.setItem('d4.todaycard',JSON.stringify({d:'2026-10-31',by:{nba:{ts:Date.parse(NOW)-60e3,picks:[],props:[]}}}));});
  c.eval(`todaySnapshotSoon=function(){};try{clearTimeout(TC_T);}catch(e){}window.__LOAD0=Date.now();`);   /* the paint hook misses, as on the phone */
  const S1=c.eval('sportSims');c.eval(`const SSx=sportSims;sportSims=function(sp){return sp==='ncaaf'?{'901':{},'902':{}}:SSx(sp);}`);
  let got=null;for(let i=0;i<30&&!got;i++){await sleep(500);got=c.eval(`(()=>{const R=get('d4.bgeval.ncaaf',null);return R&&R.d==='2026-10-31'?R:null;})()`);}
  const TC=c.eval(`get(TC_KEY,{})`);
  T('the board reached today\'s card on its own (the paint hook missed)',!!(TC.by&&TC.by.ncaaf)&&c.eval('!!window.__TC_KICK'),JSON.stringify(Object.keys(TC.by||{})));
  T('…before the evaluation ran, and the card kept the other sports',got&&TC.by.ncaaf.ts<=got.ts&&!!TC.by.nba,JSON.stringify({card:TC.by.ncaaf&&TC.by.ncaaf.ts,eval:got&&got.ts}));
  T('it waited for the board (games in), not the 40 s timeout',got&&got.ts-c.eval('window.__LOAD0')<20000,got&&String(got.ts-c.eval('window.__LOAD0')));
  const dc=fs.readFileSync(path.join(W,'desk-core.js'),'utf8');
  T('right before evaluating, the page snapshots its board again (as the home page does)',/try\{if\(\(sportGames\(sp\)\|\|\[\]\)\.length\)todaySnapshot\(true\);\}catch\(e\)\{\}try\{ok=deskRunSportEval\(sp\);/.test(dc));
  T('"Load all sports" pages kick their board too',/if\(!ready&&tcKickBoard\(me,t0\)\)return;/.test(dc));
  c.close();
  /* ── the kick's rules ── */
  const k=page('cfb.html');await sleep(3000);
  k.eval(`NCAAF_GAMES=[{id:'901',away:{abbr:'ILL'},home:{abbr:'MD'},date:'2026-10-31T19:00Z',abstract:'pre'},{id:'902',away:{abbr:'SMU'},home:{abbr:'SYR'},date:'2026-10-31T23:30Z',abstract:'pre'}];window.__TC_KICK=0;window.__FB_WEEK_DONE=0;
    window.__SN=0;const TSk=todaySnapshot;todaySnapshot=function(){window.__SN++;};window.__SIMS=0;const SSk=sportSims;sportSims=function(sp){return sp==='ncaaf'?(window.__SIMS?{'901':{},'902':{}}:{}):SSk(sp);};`);
  T('no kick in the first 3 s',k.eval(`tcKickBoard('ncaaf',Date.now()-1000)`)===false);
  T('no kick while sims are still landing (under 15 s)',k.eval(`tcKickBoard('ncaaf',Date.now()-5000)`)===false);
  T('kick once the sims are in',k.eval(`window.__SIMS=1;tcKickBoard('ncaaf',Date.now()-5000)`)===true&&k.eval('window.__SN')===1);
  T('…only once',k.eval(`tcKickBoard('ncaaf',Date.now()-5000)`)===false);
  T('…again after a new football week loads',k.eval(`window.__FB_WEEK_DONE=Date.now()+5;tcKickBoard('ncaaf',Date.now()-5000)`)===true);
  T('15 s in, it kicks even if the sims never land',k.eval(`window.__SIMS=0;window.__TC_KICK=0;tcKickBoard('ncaaf',Date.now()-16000)`)===true);
  T('no games, no kick',k.eval(`NCAAF_GAMES.length=0;window.__TC_KICK=0;tcKickBoard('ncaaf',Date.now()-16000)`)===false);
  k.close();
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
