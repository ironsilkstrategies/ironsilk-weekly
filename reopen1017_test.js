/* v2.41 · a frozen day can be reopened by sync (d4.reopen): the first page that sees it clears the
   day's frozen state, keeps started games, re-runs the master eval — once; never after a Telegram post.
   Also: before the freeze, the Today card rebuilds unstarted picks from the current lines. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW=Date.parse('2026-10-17T15:00:00Z'),D='2026-10-17';
const pk=(game,pick,start,price)=>({sp:'ncaaf',game,m:'spread',sd:'home',pick,price,start,fz:{play:true}});
function seed(extra){return Object.assign({
  'd4.freeze':{d:D,ts:NOW-3e6,why:'master evaluation · CFB'},'d4.evallock':{date:D,by:{ncaaf:NOW-3e6}},'d4.evalrun':{date:D,ts:NOW-3e6},
  'd4.best5':{d:D,locked:true,lockedAt:NOW-3e6,top3:[{sp:'nhl',game:'DAL@CHI',pick:'DAL ML',price:-191}],sports:['ncaaf','nhl']},
  'd4.todaycard':{d:D,frozen:NOW-3e6,by:{ncaaf:{ts:NOW-3e6,picks:[pk('OSU@IU','IU +3.5','2026-10-17T16:00Z',-112),pk('EARLY@GAME','EARLY +7','2026-10-17T14:00Z',-110)]}}},
  'd4.charparlays':{'2026-10-16':{locked:true,by:{}},[D]:{locked:true,by:{Sim:{legs:[{sp:'nhl'}]}}}},
  'd4.charparlaysx':{[D]:{locked:true,by:{}}},'d4.best5log':{'2026-10-16':{picks:[{main:true,hit:true}]},[D]:{picks:[{sp:'nhl',main:true}]}},
  'd4.bankerday':{d:D,locked:true},'d4.deskplan':{d:D,locked:true},
  'd4.reopen':{d:D,ts:NOW-1000,why:'CFB priced off stale lines'}},extra||{});}
function boot(store){let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');
    Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,JSON.stringify(v)));}}).window;}
const w=boot(seed());
setTimeout(async()=>{try{
  w.eval(`window.__evalRuns=0;masterEvalAll=async function(){window.__evalRuns++;return{done:['ncaaf']}};sportGames=function(){return[{id:1}]};`);
  T('frozen before the reopen',w.eval('deskFrozen()')===true&&w.eval('evalRanToday()')===true);
  const r=w.eval('deskReopenRun()');
  T('reopen runs',r===true);
  T('the day is no longer frozen and no eval counts as run',w.eval('deskFrozen()')===false&&w.eval('evalRanToday()')===false);
  const S=w.eval(`get(BEST5_KEY,{})`);T('Best 3 unlocked for the same day',S.d===D&&S.locked===false&&!(S.top3||[]).length);
  const TC=w.eval(`get(TC_KEY,{})`);const P=TC.by.ncaaf.picks;
  T('Today card: the started game keeps its pick, the unstarted one is cleared',P.length===1&&P[0].game==='EARLY@GAME'&&!TC.frozen,JSON.stringify(P.map(x=>x.game)));
  const C=w.eval(`get(CPAR_KEY,{})`),X=w.eval(`get(CPX_KEY,{})`);
  T('character parlays reopened (marker, not a deletion), yesterday untouched',C[D].locked===false&&C[D].reopened&&C['2026-10-16'].locked===true&&X[D].locked===false);
  const L=w.eval(`get('d4.best5log',{})`);T('Best log: today emptied with a marker, yesterday kept',(L[D].picks||[]).length===0&&L[D].reopened&&L['2026-10-16'].picks.length===1);
  T('Banker and plan reset',JSON.stringify(w.eval(`get(BKDAY_KEY,{})`))==='{}'&&JSON.stringify(w.eval(`get(DESK_KEY,{})`))==='{}');
  await new Promise(r=>setTimeout(r,1800));
  T('the master evaluation re-runs on its own',w.eval('window.__evalRuns')===1);
  T('the same reopen never runs twice',w.eval('DESK_REOPEN_RUN=false;deskReopenRun()')===false);
  /* the new card locks and REPLACES the reopened log entry */
  w.eval(`set(BEST5_KEY,{d:'${D}',locked:true,lockedAt:Date.now(),top3:[{sp:'ncaaf',game:'TROY@UL',pick:'UL ML',price:-155,main:true}],picks:[{sp:'ncaaf',game:'TROY@UL',pick:'UL ML',price:-155,main:true}]});best5Grade();`);
  const L2=w.eval(`get('d4.best5log',{})`);T('the new locked card is logged over the reopened entry',!L2[D].reopened&&L2[D].picks.length===1&&L2[D].picks[0].pick==='UL ML',JSON.stringify(L2[D]).slice(0,120));
  /* before the freeze the Today card rebuilds unstarted picks from current lines */
  w.eval(`set(TC_KEY,{d:'${D}',by:{ncaaf:{ts:1,picks:[{sp:'ncaaf',game:'OSU@IU',m:'spread',sd:'home',pick:'IU +3.5',price:-112,start:'2026-10-17T16:00Z'}]}}});todayCandidates=function(){return[{sp:'ncaaf',game:'OSU@IU',m:'spread',sd:'home',pick:'IU +3',price:-115,start:'2026-10-17T16:00Z'}]};sportGames=function(){return[{id:'g1',away:{abbr:'OSU'},home:{abbr:'IU'}}]};sportSims=function(){return{g1:{aw:.5}}};`);
  w.eval('todaySnapshot()');const P2=w.eval(`get(TC_KEY,{}).by.ncaaf.picks`);
  T('unfrozen day: a stale unstarted pick is replaced by the current line',P2.length===1&&P2[0].pick==='IU +3'&&P2[0].price===-115,JSON.stringify(P2));
  w.eval(`set(FREEZE_KEY,{d:'${D}',ts:Date.now()});todayCandidates=function(){return[{sp:'ncaaf',game:'OSU@IU',m:'spread',sd:'home',pick:'IU +2.5',price:-120,start:'2026-10-17T16:00Z'}]};`);
  w.eval('todaySnapshot()');const P3=w.eval(`get(TC_KEY,{}).by.ncaaf.picks`);
  T('frozen day: the card keeps its price (never swapped after the freeze)',P3.length===1&&P3[0].pick==='IU +3',JSON.stringify(P3));
  w.eval(`set(FREEZE_KEY,{d:null});set(TC_KEY,{d:'${D}',by:{ncaaf:{ts:1,picks:[{sp:'ncaaf',game:'FAR@AWAY',m:'ml',sd:'home',pick:'AWAY ML',price:-150,start:'2026-10-17T20:00Z'}]}}});todaySnapshot();`);
  T('a game this page has NOT loaded keeps its pick (an empty board never wipes the card)',w.eval(`get(TC_KEY,{}).by.ncaaf.picks.some(x=>x.game==='FAR@AWAY')`)===true);
  /* never reopen a day that already went out on Telegram */
  const w2=boot(seed({'d4.tgposts':{[D]:{d:D,ids:[77]}},'d4.reopen':{d:D,ts:NOW-500}}));await new Promise(r=>setTimeout(r,2500));
  w2.eval(`masterEvalAll=async function(){window.__ran=1};sportGames=function(){return[{id:1}]};`);
  T('a card already posted to Telegram is never reopened',w2.eval('deskReopenRun()')===false&&w2.eval('deskFrozen()')===true);
}catch(e){T('no crash',false,e.stack.slice(0,500));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},2500);
