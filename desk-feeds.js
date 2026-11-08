/* ═══ THE FEEDS (v2.47) — public sports data, built off the phone ═══════════════════════════
   Loaded on every sport page after desk-world.js.

   A GitHub Action (.github/workflows/feeds.yml → feeds/build.mjs) reads ESPN's scoreboards
   and game summaries every few hours and writes compact JSON to this repo's `feeds` branch:
   scores, DraftKings' open and close for every market, the officials. Public data only —
   never a pick. The app reads it from raw.githubusercontent.com in the background (never on
   the render path), keeps only what its own calls need, and never syncs the download itself
   (the cache key carries "cache", which sync skips).

   §1 · CLOSES. Every final's closing line lands in d4.closes beside the ones the app catches
        itself, so every locked call can be measured against where the market closed — the
        honest CLV (price taken at the lock vs the close at game time). */

const FEED_BASE='https://raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly/feeds/',FEED_EVERY=30*60e3,FEED_STALE_H=12;
const FEED_KEY=n=>'d4.feedcache.'+n;
let FEED_BUSY=false;
/* one feed file, at most every 30 minutes; a failure keeps what it had and says nothing */
async function feedFetch(n,force){const k=FEED_KEY(n);const c=get(k,null);if(!force&&c&&Date.now()-(+c.at||0)<FEED_EVERY)return null;
  try{const ctl=typeof AbortController!=='undefined'?new AbortController():null;const t=setTimeout(()=>{try{ctl&&ctl.abort();}catch(e){}},15000);
    const r=await fetch(FEED_BASE+n+'.json?t='+Math.floor(Date.now()/FEED_EVERY),{cache:'no-store',signal:ctl?ctl.signal:undefined});clearTimeout(t);
    if(!r||!r.ok){set(k,{...(c||{}),at:Date.now(),fail:(r&&r.status)||'error'});return null;}
    const data=await r.json();if(!data||data.v!==1){set(k,{...(c||{}),at:Date.now(),fail:'format'});return null;}
    set(k,{at:Date.now(),ts:data.ts||null,n:data.n||0});return data;}catch(e){try{set(k,{...(c||{}),at:Date.now(),fail:'offline'});}catch(err){}return null;}}
/* the feed's ESPN codes → the app's (the same aliases the app's own capture uses); the game's slate day */
const feedAb=(sp,x)=>{const a=String(x||'').toUpperCase();return((typeof CLOSE_ALIAS!=='undefined'&&CLOSE_ALIAS[sp])||{})[a]||a;};
function feedCloseRec(g){const P=g.pc;if(!P)return null;const s=o=>o?{open:o.o,close:o.c,ol:o.ol,cl:o.cl}:null;
  return{src:P.src||'ESPN',ts:Date.parse(g.st)||Date.now(),feed:1,ml:{home:s(P.ml&&P.ml.home),away:s(P.ml&&P.ml.away)},spread:{home:s(P.spread&&P.spread.home),away:s(P.spread&&P.spread.away)},total:{over:s(P.total&&P.total.over),under:s(P.total&&P.total.under)}};}
/* §1 · only the finals the characters called; never over a close the app caught itself */
function feedMergeCloses(data){if(!data||!data.games)return 0;const V=roGet(VOICES_KEY,[],30e3)||[];const want=new Set();
  V.forEach(x=>{if(x&&CHARS[x.voice])want.add(x.sp+'|'+x.game+'|'+String(x.date||'').slice(0,10));});
  const All=get(CLOSES_KEY,{})||{};let n=0;
  Object.values(data.games).forEach(g=>{try{if(!g||!g.pc||!g.st)return;const d=tdDay(g.st);if(!d)return;const game=feedAb(g.sp,g.a)+'@'+feedAb(g.sp,g.h);
    if(!want.has(g.sp+'|'+game+'|'+d))return;const D=All[d]||(All[d]={});const k=g.sp+'|'+game;if(D[k])return;const rec=feedCloseRec(g);if(!rec)return;D[k]=rec;n++;}catch(e){}});
  if(n){Object.keys(All).sort().slice(0,-40).forEach(x=>delete All[x]);set(CLOSES_KEY,All);try{RO_CACHE[CLOSES_KEY]=null;delete RO_CACHE[CLOSES_KEY];}catch(e){}}
  return n;}
/* §2 · v2.87.7 · FINALS — the robot's finals (ESPN, every hour) are a second road to a score: a leg whose game the phone never
   saw finish still grades. And each final carries the league's own score (NHL.com, NBA.com, NCAA.com) when the robot could get
   it: they agree → the leg says "checked"; they disagree in a way that changes the leg → the grade waits (up to 18 hours) and
   says why. Ten days, kept per device (a cache key — never synced). */
const FEED_FIN_K='d4.feedcache.fin';let FEED_FIN=null;
function feedFinIdx(){if(FEED_FIN)return FEED_FIN;const I={};try{const c=get(FEED_FIN_K,null);(c&&c.L||[]).forEach(r=>{(I[r.k]=I[r.k]||[]).push(r);});}catch(e){}FEED_FIN=I;return I;}
const feedKey=(sp,game)=>sp+'|'+(typeof mgKey==='function'?mgKey(sp,game):game);
function feedStoreFinals(data){if(!data||!data.games)return 0;const cut=new Date(Date.now()-10*864e5).toISOString();const L=[];let x=0,bad=0;
  Object.values(data.games).forEach(g=>{try{if(!g||!g.st||g.st<cut||g.as==null||g.hs==null)return;const r={k:feedKey(g.sp,feedAb(g.sp,g.a)+'@'+feedAb(g.sp,g.h)),st:g.st,as:+g.as,hs:+g.hs};
    if(g.x&&g.x.as!=null){r.x={s:g.x.s,as:+g.x.as,hs:+g.x.hs,ok:!!g.x.ok};x++;if(!g.x.ok)bad++;}L.push(r);}catch(e){}});
  set(FEED_FIN_K,{ts:data.ts,L,x,bad});FEED_FIN=null;return L.length;}
function feedFinalFor(sp,game,want,approx,st){if(!want)return null;const L=feedFinIdx()[feedKey(sp||'mlb',game)];if(!L||!L.length)return null;
  let hit=L.find(r=>tdDay(r.st)===want);
  if(!hit&&approx)hit=L.filter(r=>dayOk(tdDay(r.st),want,true)).sort((a,b)=>a.st.localeCompare(b.st))[0];
  if(!hit&&!approx&&typeof sameGameTime==='function')hit=L.find(r=>sameGameTime(r.st,tdDay(r.st),want,st));
  return hit||null;}
const FEED_SRC={nhl:'NHL.com',nba:'NBA.com',ncaa:'NCAA.com'};
const FEED_PART=/\b(1H|H1|2H|1st half|first half|half|P1|1P|Q[1-4]|[1-4]Q|period|inning|F5)\b/i;
function feedCheck(leg,td,r,GL0){if(!r||r.live||r.manual||(r.hit==null&&!r.push))return r;
  if(leg.mlbProp||leg.fbProp||leg.nhlProp||leg.bbProp||leg.isProp||FEED_PART.test(String(leg.pick||'')))return r;
  const sp=leg.sport||'mlb';const f=feedFinalFor(sp,leg.game,legDay(leg,td),!!leg.gdApprox||!leg.gameDate,leg.start);if(!f||!f.x)return r;
  if(f.x.ok)return{...r,verified:f.x.s};
  let r2=null;RL_OVR={leg,a:f.x.as,h:f.x.hs};try{r2=GL0(leg,td);}catch(e){}finally{RL_OVR=null;}
  const conflict={s:f.x.s,a:f.x.as,h:f.x.hs,ea:f.as,eh:f.hs};
  if(r2&&(r2.hit!==r.hit||!!r2.push!==!!r.push)&&Date.now()-Date.parse(f.st)<18*36e5)
    return{hit:null,push:false,live:false,conflict,detail:`⚠ ESPN ${f.as}–${f.hs} vs ${FEED_SRC[f.x.s]||f.x.s} ${f.x.as}–${f.x.hs} — holding`};
  return{...r,conflict};}
if(typeof gradeLeg==='function'&&typeof window!=='undefined'&&!window.__FEED_GL__){window.__FEED_GL__=1;const GL0=gradeLeg;
  gradeLeg=function(leg,td){const r=GL0(leg,td);try{return feedCheck(leg,td,r,GL0);}catch(e){return r;}};}
/* §3 · v2.88.1 · PROPS — DraftKings' board through ESPN's public odds API (the robot, hourly): the "X+" milestone prices for
   the Perfect SGP legs, and the 1st-half / 1st-period sides and moneylines for the 1st-half list when the day's paste has none.
   Kept per device (cache key, never synced). Totals come as an untagged over/under pair, so only one-sided milestones are
   priced — a price is never guessed. */
const FEED_PROPS_K='d4.feedcache.propidx';let FEED_PROPS=null;
const feedName=n=>String(n||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(jr|sr|ii|iii|iv)\b\.?/g,'').replace(/[^a-z]/g,'');
function feedStoreProps(data){if(!data||!data.ev)return 0;const P={},H={};let n=0;
  Object.values(data.ev).forEach(E=>{if(!E||!E.sp)return;const game=feedAb(E.sp,E.a)+'@'+feedAb(E.sp,E.h);
    (E.p||[]).forEach(r=>{const [nm,k,line,pr,kind]=r;if(kind!=='m'||line==null||!isFinite(pr))return;const key=E.sp+'|'+feedName(nm)+'|'+k;(P[key]=P[key]||[]).push([line,pr]);n++;});
    const h=E.half||{};const o={};if(h.ml&&h.ml.a&&h.ml.h&&isFinite(h.ml.a.price)&&isFinite(h.ml.h.price)&&h.ml.a.price&&h.ml.h.price)o.ml=h.ml;
    if(h.sp&&h.sp.a&&h.sp.h&&h.sp.a.price&&h.sp.h.price&&isFinite(h.sp.a.line))o.sp=h.sp;if(Object.keys(o).length)H[E.sp+'|'+game]=o;});
  /* one stat name sometimes carries two ladders (DraftKings' 1st-quarter rebounds share the full game's name). A real ladder
     only gets less likely as the line rises: keep the likelier price at each line, then walk down from the top and drop any
     line that's less likely than one above it — what's left is the full-game ladder */
  const imp=a=>a>0?100/(a+100):(-a)/((-a)+100);
  Object.keys(P).forEach(k=>{const by={};P[k].forEach(([l,pr])=>{if(!by[l]||imp(pr)>imp(by[l]))by[l]=pr;});let top=0;const out=[];
    Object.keys(by).map(Number).sort((a,b)=>b-a).forEach(l=>{const q=imp(by[l]);if(q+1e-9<top)return;top=q;out.push([l,by[l]]);});P[k]=out.reverse();if(!P[k].length)delete P[k];});
  set(FEED_PROPS_K,{ts:data.ts,P,H});FEED_PROPS=null;
  /* the 1st-half sides and moneylines, under any the day's own paste already gave */
  try{const d=today();const LN=get(HALFLN_KEY,null);const cur=LN&&LN.d===d?LN:{d,g:{}};let ch=0;
    Object.entries(H).forEach(([k,h])=>{const g=cur.g[k]||(cur.g[k]={});if(!g.ml&&h.ml){g.ml=h.ml;g.src='dk';ch++;}if(!g.sp&&h.sp){g.sp=h.sp;g.src='dk';ch++;}});if(ch)set(HALFLN_KEY,cur);}catch(e){}
  return n;}
function feedPropsIdx(){if(FEED_PROPS)return FEED_PROPS;FEED_PROPS=get(FEED_PROPS_K,null)||{P:{},H:{}};return FEED_PROPS;}
/* DraftKings' price on "<player> <thr>+ <stat>", when the board has that exact milestone */
function feedPropPrice(sp,player,k,thr){try{const L=feedPropsIdx().P[sp+'|'+feedName(player)+'|'+k];if(!L)return null;const m=L.find(x=>+x[0]===+thr);return m?{price:m[1],lines:L.map(x=>x[0]).sort((a,b)=>a-b)}:{price:null,lines:L.map(x=>x[0]).sort((a,b)=>a-b)};}catch(e){return null;}}
/* the background pass: fetch, merge, then stamp the CLV of every graded call that was waiting for its close */
async function feedsTick(force){if(FEED_BUSY)return null;if(typeof DESK_BG_EVAL!=='undefined'&&DESK_BG_EVAL)return null;FEED_BUSY=true;
  try{try{const pd=await feedFetch('props',force);if(pd)feedStoreProps(pd);}catch(e){}
    try{const td=await feedFetch('teams',force);if(td&&typeof dogStoreTeams==='function')dogStoreTeams(td);}catch(e){}
    const data=await feedFetch('closes',force);if(!data)return null;try{feedStoreFinals(data);}catch(e){}const n=feedMergeCloses(data);if(n){try{clvStampAll();}catch(e){}}return n;}finally{FEED_BUSY=false;}}
/* how fresh the feeds are (the Book view shows it; a feed stale past 12 hours goes in the journal once a day) */
function feedHealth(){const c=get(FEED_KEY('closes'),null);if(!c)return{st:'never',lab:'not read yet'};const age=c.ts?(Date.now()-Date.parse(c.ts))/36e5:null;
  if(age!=null&&age>FEED_STALE_H){try{journalAdd({sig:'feed-stale',sev:'info',what:`the closing-line feed is ${Math.round(age)} hours old`});}catch(e){}}
  return{st:c.fail&&!c.ts?'down':age!=null&&age>FEED_STALE_H?'stale':'ok',lab:c.ts?`updated ${Math.max(0,Math.round(age*60))} min ago · ${c.n||0} finals`:'no data yet'+(c.fail?` (${c.fail})`:'')};}
function feedBoardHtml(){const H=feedHealth();const ico={ok:'🟢',stale:'🟡',down:'🔴',never:'⚪'}[H.st]||'⚪';
  let prl='';try{const c=get(FEED_PROPS_K,null);if(c&&c.P)prl=`<div class="mono" style="font-size:10.5px">🎯 DraftKings props — ${Object.keys(c.P).length} player stat ladders · 1st-half lines for ${Object.keys(c.H||{}).length} games${c.ts?' · '+Math.max(0,Math.round((Date.now()-Date.parse(c.ts))/60e3))+' min old':''}</div>`;}catch(e){}
  let fin='';try{const c=get(FEED_FIN_K,null);if(c&&c.L)fin=`<div class="mono" style="font-size:10.5px">🧾 Finals for grading — ${c.L.length} from the last 10 days · ${c.x||0} double-checked against NHL.com / NBA.com / NCAA.com${c.bad?` · <b style="color:var(--gold)">${c.bad} disagree</b>`:''}</div>`;}catch(e){}
  return`<div class="tkt"><h3 style="margin:0 0 4px">📡 The feeds</h3><div class="mono" style="font-size:10.5px">${ico} Closing lines (DraftKings, every final) — ${txtEsc(H.lab)}</div>${fin}${prl}<div class="sub" style="font-size:10px">Built off the phone every hour from public ESPN data, scores checked against the leagues' own feeds; read in the background, never synced.</div></div>`;}
if(typeof bookViewHtml==='function'&&typeof window!=='undefined'&&!window.__FEED_BV__){window.__FEED_BV__=1;const BV2=bookViewHtml;
  bookViewHtml=function(){const h=BV2();try{const i=h.indexOf('<div class="tkt"><h3 style="margin:0 0 4px">Today\'s story');return i>=0?h.slice(0,i)+feedBoardHtml()+h.slice(i):h+feedBoardHtml();}catch(e){return h;}};}
try{if(typeof AP_STEPS!=='undefined'&&!AP_STEPS.some(s=>s[0]==='feeds')){const i=AP_STEPS.findIndex(s=>s[0]==='voices');
  AP_STEPS.splice(i>=0?i+1:AP_STEPS.length,0,['feeds','The feeds','Closing lines for every final (built off the phone) — read in the background; every locked call gets measured against the close.',()=>{feedsTick().catch(()=>{});return 0;}]);}}catch(e){}
if(typeof window!=='undefined'&&!window.__FEED_BOOT__){window.__FEED_BOOT__=1;window.addEventListener('load',()=>{if((typeof DESK_BG_EVAL!=='undefined'&&DESK_BG_EVAL)||(typeof BG_MODE!=='undefined'&&BG_MODE)||window.__NO_GRADELOOP__)return;
  setTimeout(()=>{feedsTick().catch(()=>{});},12000);setInterval(()=>{feedsTick().catch(()=>{});},FEED_EVERY);});}
