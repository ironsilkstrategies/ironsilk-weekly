/* v2.83.1 · the NFL board in time slots like CFB (Sunday early / late / SNF, TNF, MNF, Live Now, My Lines): only the chosen
   slot's cards are on the page, and a background repaint never yanks the page while you scroll. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW='2026-11-01T17:00:00Z';
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const tm=(ab,nm)=>({abbr:ab,name:nm,shortName:nm,record:'4-3'});
const G=(id,date,a,h,abstract)=>({id,espnId:id,date,away:tm(a,a+' Team'),home:tm(h,h+' Team'),abstract:abstract||'pre',status:abstract==='post'?'Final':abstract==='in'?'In Progress':'Scheduled',awayScore:0,homeScore:0});
const GAMES=[G('t1','2026-10-30T00:15:00Z','LAC','DEN','post'),G('e1','2026-11-01T18:00:00Z','BAL','BUF'),G('e2','2026-11-01T18:00:00Z','TEN','CIN'),G('l1','2026-11-01T21:25:00Z','LAC','LAR'),
  G('s1','2026-11-02T01:20:00Z','KC','LV'),G('m1','2026-11-03T01:15:00Z','NYG','DAL')];
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(x){
  const RD=x.Date;const t0=RD.now();class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse(NOW)+(RD.now()-t0)]))}static now(){return RD.parse(NOW)+(RD.now()-t0)}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_BACKFILL__=true;x.__NO_REOPEN__=true;x.__NO_SYNC_LOOP__=true;
  x.fetch=()=>Promise.resolve({ok:false,status:404,headers:{get:()=>null},json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;
  x.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  w.eval(`NFL_GAMES=${JSON.stringify(GAMES)};NFL_WEEK=8;NFL_SEASON=2026;NFL_SIMS={};ACTIVE_SPORT='nfl';TK_SCROLL_T=0;TK_TAP_T=0;NFL_SLATE=null;renderNFL();`);
  const slate=()=>w.document.getElementById('slate').innerHTML;
  const labels=w.eval(`nflBuildSlates(NFL_GAMES).map(x=>x.label)`);
  T('the week splits into NFL windows (TNF, Sunday early / late / SNF, MNF)',['TNF','Early','Late','SNF','MNF'].every(l=>labels.includes(l)),JSON.stringify(labels));
  T('sims still run for every game (the evaluation needs them all)',w.eval('Object.keys(NFL_SIMS).length')===6,String(w.eval('Object.keys(NFL_SIMS).length')));
  T('Sunday 11 AM: it opens on the next window (Early), not the whole week',w.eval('NFL_SLATE')==='sun-early'&&/BAL/.test(slate())&&/TEN/.test(slate())&&!/LV Team|KC Team/.test(slate()),w.eval('NFL_SLATE'));
  T('the window chips are on the board (a final from days ago drops off, as before)',(slate().match(/nflPickSlate\('/g)||[]).length===4);
  w.eval(`nflPickSlate('sun-night')`);T('tap SNF: only the Sunday-night game is on the page',/KC Team|>KC</.test(slate())&&!/BAL Team/.test(slate()));
  w.eval(`NFL_GAMES.find(g=>g.id==='l1').abstract='in';NFL_SLATE=null;renderNFL()`);
  T('a game in progress: Live Now leads and the board opens on its window',w.eval(`nflBuildSlates(NFL_GAMES)[0].label`)==='Live Now'&&w.eval('NFL_SLATE')==='sun-late',w.eval('NFL_SLATE'));
  w.eval(`window.__H0=document.getElementById('slate').innerHTML;TK_TAP_T=Date.now()-5000;TK_SCROLL_T=Date.now();NFL_GAMES.find(g=>g.id==='l1').awayScore=7;renderNFL();`);
  T("a repaint while you scroll waits (the page isn't yanked)",w.eval('document.getElementById("slate").innerHTML===window.__H0')&&w.eval('!!NFL_DEFER'));
  w.eval(`TK_SCROLL_T=0;`);
}catch(e){T('harness',false,e.stack);}
setTimeout(()=>{try{T('…and lands once you stop',w.eval('document.getElementById("slate").innerHTML')!==w.eval('window.__H0'));}catch(e){T('harness2',false,e.stack);}
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2200);},3000);
