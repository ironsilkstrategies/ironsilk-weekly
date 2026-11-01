/* v2.83 · the ticket web, cleaned up: today's slate only (old open tickets no longer pile up as "Dead 90"), games on the
   left and tickets on the right in a fixed order, strands only for what you tap, and the page scrolls normally. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW='2026-11-01T19:00:00Z',D='2026-11-01';
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const leg=(sport,game,pick,price,gd)=>({sport,game,pick,price,gameDate:gd||D});
const TIX=[{id:101,date:D,source:'mine',stake:5,legs:[leg('nfl','BAL@BUF','BUF -3',-110),leg('nhl','EDM@NYR','EDM ML',120),leg('nba','LAC@GS','GS ML',-135)]},
  {id:102,date:D,source:'mine',stake:5,legs:[leg('nfl','BAL@BUF','Over 53.5',-112),leg('nfl','TEN@CIN','TEN +13',-113)]},
  {id:103,date:'2026-10-25',source:'mine',stake:5,legs:[leg('nfl','DAL@PHI','DAL ML',150,'2026-10-25'),leg('nhl','BOS@TOR','BOS ML',110,'2026-10-25')]},
  {id:104,date:'2026-10-31',source:'mine',stake:2,legs:[leg('nfl','TEN@CIN','CIN ML',-500,D)]}];
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(x){
  const RD=x.Date;const t0=RD.now();class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse(NOW)+(RD.now()-t0)]))}static now(){return RD.parse(NOW)+(RD.now()-t0)}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_BACKFILL__=true;x.__NO_REOPEN__=true;x.__NO_SYNC_LOOP__=true;
  x.fetch=()=>Promise.resolve({ok:false,status:404,headers:{get:()=>null},json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;
  x.localStorage.setItem('d4.setupDone','1');x.localStorage.setItem('d4.locked',JSON.stringify(TIX));}}).window;
setTimeout(()=>{try{
  w.eval(`TICKETTAB='elimmap';BMAP.sel=null;BMAP.f='all';BMAP.sp='all';`);
  const D0=w.eval('bmapData()');const ids=D0.tickets.map(t=>t.id).sort();
  T('only today\'s slate: tickets placed today, and an older ticket with a leg on today\'s games',JSON.stringify(ids)===JSON.stringify(['101','102','104']),JSON.stringify(ids));
  T('a week-old open ticket is gone from the web',!ids.includes('103'));
  const h=w.eval('bmapHtml()');
  T('no strands until you tap something',!/<path d="M/.test(h.match(/<svg id="bmSvg"[\s\S]*?<\/svg>/)[0]));
  T('games on the left, tickets on the right, each listed once',(h.match(/data-k="g"/g)||[]).length===4&&(h.match(/data-k="t"/g)||[]).length===3,`${(h.match(/data-k="g"/g)||[]).length} games · ${(h.match(/data-k="t"/g)||[]).length} tickets`);
  T('the page scrolls normally (no pan/zoom trap, no zoom buttons)',!/touch-action:none/.test(h)&&!/bmZoom\(/.test(h));
  T('each ticket row has a dot per leg',(h.match(/<circle cx=/g)||[]).length>=6);
  const gk=D0.games.find(g=>g.game==='BAL@BUF').key;w.eval(`BMAP.sel={type:'g',id:${JSON.stringify(gk)}}`);const h2=w.eval('bmapSvg(bmapData()).svg');
  T('tap a game: one strand to each ticket riding on it, the rest dimmed',(h2.match(/<path d="M/g)||[]).length===2&&/opacity="\.25"/.test(h2),String((h2.match(/<path d="M/g)||[]).length));
  w.eval(`BMAP.sel={type:'t',id:'101'}`);const h3=w.eval('bmapSvg(bmapData()).svg');
  T('tap a ticket: one strand to each of its games',(h3.match(/<path d="M/g)||[]).length===3,String((h3.match(/<path d="M/g)||[]).length));
  w.eval(`BMAP.sel=null;BMAP.f='alive'`);T('filters still work',w.eval('bmapSvg(bmapData()).svg').includes('data-k="t"'));
  const ord=w.eval(`[{status:'dead',away:2,cash:0,payout:9},{status:'alive',away:1,cash:.4,payout:5},{status:'live',away:3,cash:.2,payout:50},{status:'won',away:0,cash:1,payout:7}].sort(bmTicketOrder).map(t=>t.status)`);
  T('tickets: one leg away first, then live, alive, not started, cashed, dead',JSON.stringify(ord)==='["alive","live","won","dead"]',JSON.stringify(ord));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},3000);
