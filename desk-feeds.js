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
/* the background pass: fetch, merge, then stamp the CLV of every graded call that was waiting for its close */
async function feedsTick(force){if(FEED_BUSY)return null;if(typeof DESK_BG_EVAL!=='undefined'&&DESK_BG_EVAL)return null;FEED_BUSY=true;
  try{const data=await feedFetch('closes',force);if(!data)return null;const n=feedMergeCloses(data);if(n){try{clvStampAll();}catch(e){}}return n;}finally{FEED_BUSY=false;}}
/* how fresh the feeds are (the Book view shows it; a feed stale past 12 hours goes in the journal once a day) */
function feedHealth(){const c=get(FEED_KEY('closes'),null);if(!c)return{st:'never',lab:'not read yet'};const age=c.ts?(Date.now()-Date.parse(c.ts))/36e5:null;
  if(age!=null&&age>FEED_STALE_H){try{journalAdd({sig:'feed-stale',sev:'info',what:`the closing-line feed is ${Math.round(age)} hours old`});}catch(e){}}
  return{st:c.fail&&!c.ts?'down':age!=null&&age>FEED_STALE_H?'stale':'ok',lab:c.ts?`updated ${Math.max(0,Math.round(age*60))} min ago · ${c.n||0} finals`:'no data yet'+(c.fail?` (${c.fail})`:'')};}
function feedBoardHtml(){const H=feedHealth();const ico={ok:'🟢',stale:'🟡',down:'🔴',never:'⚪'}[H.st]||'⚪';
  return`<div class="tkt"><h3 style="margin:0 0 4px">📡 The feeds</h3><div class="mono" style="font-size:10.5px">${ico} Closing lines (DraftKings, every final) — ${txtEsc(H.lab)}</div><div class="sub" style="font-size:10px">Built off the phone every few hours from public ESPN data; read in the background, never synced.</div></div>`;}
if(typeof bookViewHtml==='function'&&typeof window!=='undefined'&&!window.__FEED_BV__){window.__FEED_BV__=1;const BV2=bookViewHtml;
  bookViewHtml=function(){const h=BV2();try{const i=h.indexOf('<div class="tkt"><h3 style="margin:0 0 4px">Today\'s story');return i>=0?h.slice(0,i)+feedBoardHtml()+h.slice(i):h+feedBoardHtml();}catch(e){return h;}};}
try{if(typeof AP_STEPS!=='undefined'&&!AP_STEPS.some(s=>s[0]==='feeds')){const i=AP_STEPS.findIndex(s=>s[0]==='voices');
  AP_STEPS.splice(i>=0?i+1:AP_STEPS.length,0,['feeds','The feeds','Closing lines for every final (built off the phone) — read in the background; every locked call gets measured against the close.',()=>{feedsTick().catch(()=>{});return 0;}]);}}catch(e){}
if(typeof window!=='undefined'&&!window.__FEED_BOOT__){window.__FEED_BOOT__=1;window.addEventListener('load',()=>{if((typeof DESK_BG_EVAL!=='undefined'&&DESK_BG_EVAL)||(typeof BG_MODE!=='undefined'&&BG_MODE)||window.__NO_GRADELOOP__)return;
  setTimeout(()=>{feedsTick().catch(()=>{});},12000);setInterval(()=>{feedsTick().catch(()=>{});},FEED_EVERY);});}
