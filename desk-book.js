/* ═══ THE BOOK + THE IMMUNE SYSTEM (v2.44) ══════════════════════════════════════
   Loaded on every sport page after desk-core.js.

   Christopher's rule, from the old Give Yourself Goosebumps books: every page offers
   choices, the book knows every outcome, and NO path is a dead end. Every story has
   an ending. The app runs its day the same way:
   · each decision is a PAGE with a plain-English question and the pages it may turn to;
   · each path ends at an ENDING: posted, posted with the gap stated, an honest no-play,
     held and retrying by itself, held for you, or nothing to do;
   · a page that answers with a turn it never declared, breaks, or loops past its limit
     ends at "held for you" naming the exact page, so the book can't strand the day;
   · bookCheck() proves it on paper (every turn exists, every page reaches an ending) and
     the test suite walks every combination of conditions through every book.

   THE IMMUNE SYSTEM reads the day's vital signs before every freeze: a sport with calls
   that never made the card, one-sided or flat projected totals, a card priced off older
   lines than the newest upload, two teams carrying the same rating. Every incident goes
   into THE JOURNAL with its signature, so a repeat is recognized on sight.

   A HOLD only lasts while the app is open in front of you: the moment you leave it (or the
   phone locks), the Book stops waiting and posts what's solid, with the gaps stated —
   a held day can never sleep through its own games.

   If the Book itself ever fails, the old freeze runs exactly as before (it fails open)
   and the failure goes in the journal. A day already frozen is never touched. */

const BOOK_KEY='d4.book',BOOK_HOLD_KEY='d4.bookhold',JOURNAL_KEY='d4.journal',BOOK_QUAR_KEY='d4.quarantine';
const BOOK_DEADLINE_MIN=45,BOOK_RETRIES=3,BOOK_HOLD_EVERY=2*60e3,BOOK_HOLD_CAP_MIN=30;
/* a hold is this device's own state: another phone never starts retrying (or freezing) because this one is waiting */
try{if(typeof SYNC_NEVER!=='undefined'&&SYNC_NEVER&&SYNC_NEVER.add)SYNC_NEVER.add(BOOK_HOLD_KEY);}catch(e){}
const BOOK_ENDS={
  /* the day */
  POST:{ok:1,post:1,ico:'✅',lab:'Card frozen and posted'},
  POST_GAPS:{ok:1,post:1,ico:'⚠️',lab:'Card posted, with the gap stated'},
  NO_PLAY:{ok:1,post:1,ico:'🟦',lab:'No play today, said honestly with the closest calls'},
  NO_GAMES:{ok:1,post:0,ico:'💤',lab:'No games on the slate'},
  ALREADY:{ok:1,post:0,ico:'🔒',lab:'Already frozen, and nothing frozen ever changes'},
  HOLD_RETRY:{ok:0,post:0,ico:'⏳',lab:'Held, retrying by itself'},
  HOLD_YOU:{ok:0,post:0,ico:'🛑',lab:'Held, needs you'},
  /* the post */
  SEND:{ok:1,post:1,ico:'📣',lab:'Published: page, VIP card, notes'},
  PAGE_ONLY:{ok:1,post:1,ico:'🌐',lab:'Public page only (Telegram not set up)'},
  NOT_FROZEN:{ok:1,post:0,ico:'⏸',lab:'Nothing to publish until the day is frozen'}};
const BOOKS={};
function bookDefine(B){BOOKS[B.id]=B;return B;}
const bookTurns=P=>P.act?[P.then]:(P.to||[]);
/* one page: its answer must be one of the turns it declared */
function bookStep(B,pid,ctx){const P=B.pages[pid];if(!P)return{to:'HOLD_YOU',why:`page "${pid}" doesn't exist`,bad:1};
  let r;try{r=P.ask(ctx);}catch(e){return{to:'HOLD_YOU',why:`page "${pid}" broke: ${String(e&&e.message||e).slice(0,120)}`,bad:1};}
  const a=Array.isArray(r)?r:[r,''];const to=a[0],why=a[1]||'';
  if(!(P.to||[]).includes(to))return{to:'HOLD_YOU',why:`page "${pid}" turned to "${to}", a page it never declared`,bad:1};
  return{to,why};}
/* the walk, synchronous: `act(name,ctx,page)` returns the next ctx (the test simulates it) */
function bookWalkSync(B,ctx,act){const path=[];let pid=B.start,steps=0,bad=0;
  for(;;){if(++steps>(B.max||60)){path.push({p:pid,to:'HOLD_YOU',why:'the book looped past its limit'});return{book:B.id,end:'HOLD_YOU',why:'the book looped past its limit',path,ctx,bad:1};}
    const P=B.pages[pid];
    if(P&&P.act){let why='';try{const r=act?act(P.act,ctx,P):null;if(r&&r.ctx)ctx=r.ctx;why=r&&r.why||'';}catch(e){why='failed: '+(e&&e.message||e);}
      path.push({p:pid,act:P.act,why});pid=P.then;continue;}
    const s=bookStep(B,pid,ctx);path.push({p:pid,to:s.to,why:s.why});if(s.bad)bad=1;
    if(BOOK_ENDS[s.to])return{book:B.id,end:s.to,why:s.why,path,ctx,bad};pid=s.to;}}
/* the walk, for real: action pages run their action (async) and the vital signs are re-read */
async function bookWalk(B,ctx,acts){const path=[];let pid=B.start,steps=0,bad=0;
  for(;;){if(steps&&B.stopIf){let st=false;try{st=B.stopIf(ctx);}catch(e){}if(st){path.push({p:pid,to:'ALREADY',why:'the day froze while this story was being read — nothing changes after the fact'});return{book:B.id,end:'ALREADY',why:'frozen meanwhile',path,ctx,bad};}}
    if(++steps>(B.max||60)){path.push({p:pid,to:'HOLD_YOU',why:'the book looped past its limit'});return{book:B.id,end:'HOLD_YOU',why:'the book looped past its limit',path,ctx,bad:1};}
    const P=B.pages[pid];
    if(P&&P.act){let why='';try{const f=acts&&acts[P.act];const r=f?await f(ctx,P):null;if(r&&r.ctx)ctx=r.ctx;why=r&&r.why||'';}catch(e){why='failed: '+(e&&e.message||e);}
      path.push({p:pid,act:P.act,why});pid=P.then;continue;}
    const s=bookStep(B,pid,ctx);path.push({p:pid,to:s.to,why:s.why});if(s.bad)bad=1;
    if(BOOK_ENDS[s.to])return{book:B.id,end:s.to,why:s.why,path,ctx,bad};pid=s.to;}}
/* on paper: every turn exists, every page is reachable, every page can reach an ending */
function bookCheck(B){const errs=[];const ids=Object.keys(B.pages||{});if(!B.pages[B.start])errs.push('the start page "'+B.start+'" is missing');
  ids.forEach(id=>{const P=B.pages[id];const T=bookTurns(P);if(!T.length)errs.push(`page "${id}" turns nowhere`);
    if(!P.act&&typeof P.ask!=='function')errs.push(`page "${id}" has no question`);
    T.forEach(t=>{if(!BOOK_ENDS[t]&&!B.pages[t])errs.push(`page "${id}" → "${t}": no such page or ending`);});});
  const seen=new Set(),st=[B.start];while(st.length){const id=st.pop();if(seen.has(id)||!B.pages[id])continue;seen.add(id);bookTurns(B.pages[id]).forEach(t=>{if(B.pages[t])st.push(t);});}
  ids.forEach(id=>{if(!seen.has(id))errs.push(`page "${id}": no path ever reaches it`);});
  const canEnd=new Set();for(let ch=true;ch;){ch=false;ids.forEach(id=>{if(canEnd.has(id))return;if(bookTurns(B.pages[id]).some(t=>BOOK_ENDS[t]||canEnd.has(t))){canEnd.add(id);ch=true;}});}
  ids.forEach(id=>{if(!canEnd.has(id))errs.push(`page "${id}" can never reach an ending — a dead end`);});
  const ends=new Set();ids.forEach(id=>bookTurns(B.pages[id]).forEach(t=>{if(BOOK_ENDS[t])ends.add(t);}));
  return{ok:!errs.length,errs,pages:ids.length,ends:[...ends]};}
/* every combination of the book's conditions, each action both working and failing:
   returns the endings reached and any walk that went wrong (the suite asserts it's empty) */
function bookExplore(B,inv){const V=B.vars||{};const keys=Object.keys(V);const out={n:0,ends:{},bad:[],broke:[]};
  const combo=(i,ctx)=>{if(i===keys.length){const c0=JSON.stringify(ctx);['works','fails'].forEach(mode=>{const c=JSON.parse(c0);ctx=JSON.parse(c0);const R=bookWalkSync(B,c,(a,cx,P)=>({ctx:(B.sim&&B.sim[a]?B.sim[a](cx,mode,P):cx),why:mode}));
        out.n++;out.ends[R.end]=(out.ends[R.end]||0)+1;if(R.bad)out.bad.push({ctx,mode,path:R.path.map(s=>s.p+'→'+(s.to||s.act)).join(' ')});
        if(inv){const m=inv(ctx,R,mode);if(m)out.broke.push({rule:m,ctx,mode,end:R.end,path:R.path.map(s=>s.p+'→'+(s.to||s.act)).join(' ')});}});return;}
    V[keys[i]].forEach(v=>{const nx={...ctx,[keys[i]]:v};combo(i+1,nx);});};
  combo(0,{});return out;}

/* ── THE JOURNAL — incidents, world events, generations: one line each, plain English ── */
const BOOK_SIGS={
  'sport-missing':{lab:'A sport with calls never made the Today card',fix:'re-read that sport in the background'},
  'sport-unread':{lab:'A sport in season wasn\'t read today',fix:'read it in the background before freezing'},
  'flat-totals':{lab:'Every projected total is about the same number',fix:'re-read the sport; if it stays, hold its picks back'},
  'one-sided-totals':{lab:'The model is on the same side of nearly every total',fix:'re-read the sport; if it stays, hold its picks back'},
  'stale-lines':{lab:'The card is priced off older lines than your newest upload',fix:'re-read the sport so it prices off your newest line'},
  'rating-collision':{lab:'Two different teams carry the identical rating',fix:'re-read the ratings; if it stays, hold the sport back'},
  'official-off-card':{lab:'Official picks exist but none reached the Best 3',fix:'re-read the sports behind them'},
  'held':{lab:'The freeze was held',fix:'it retries every 2 minutes and posts by itself 45 minutes before the first game'},
  'posted-with-gap':{lab:'Posted at the deadline with a gap',fix:'the gap is stated on the card'},
  'quarantine':{lab:'A sport\'s picks were held back for the day',fix:'its inputs looked broken at the deadline'},
  'book-crash':{lab:'The Book itself failed',fix:'the old freeze ran instead, exactly as before'},
  'you-override':{lab:'You froze it anyway',fix:'your call, on the record'}};
function journalAll(){const J=get(JOURNAL_KEY,[]);return Array.isArray(J)?J:[];}
function journalAdd(e){try{const J=journalAll();const id=e.id||[e.kind||'incident',e.d||today(),e.sig||'',e.sp||'',e.v||''].join('|');
    const i=J.findIndex(x=>x&&x.id===id);const row={id,ts:Date.now(),d:today(),kind:'incident',sev:'warn',...e,id};
    if(i>=0){row.n=(J[i].n||1)+1;row.first=J[i].first||J[i].ts;J[i]={...J[i],...row};}else{row.n=1;J.push(row);}
    set(JOURNAL_KEY,J.slice(-400));return row;}catch(e2){return null;}}
/* how many earlier days the same signature showed up, and what fixed it then */
function journalSeen(sig,d){const J=journalAll().filter(x=>x&&x.sig===sig&&x.d!==(d||today()));const days=[...new Set(J.map(x=>x.d))];return{n:days.length,last:days.sort().pop()||null,fixed:J.filter(x=>x.fixed).map(x=>x.fixed).pop()||null};}

/* ── THE IMMUNE SYSTEM — the day's vital signs ────────────────────────────────── */
const BOOK_SCHED={nhl:'d4.nhlgames',nba:'d4.nbasched',ncaab:'d4.ncaabsched',nfl:'d4.nflgames',ncaaf:'d4.ncaafgames'};
function bookStarts(d){const M={};const put=(sp,g)=>{if(!g||!g.away||!g.home)return;const t=Date.parse(g.start||g.date||g.gameDate||g.time||'');if(!isFinite(t))return;M[sp+'|'+g.away.abbr+'@'+g.home.abbr]=t;};
  try{const T=get(TC_KEY,{})||{};if(T.d===d)Object.entries(T.by||{}).forEach(([sp,B])=>(B.picks||[]).forEach(x=>{const t=Date.parse(x.start||'');if(isFinite(t))M[sp+'|'+x.game]=t;}));}catch(e){}
  Object.entries(BOOK_SCHED).forEach(([sp,k])=>{try{const S=roGet(k,{},60e3)||{};const L=[...(S.games||[]),...(S.up||[])];
      if(!L.length)Object.values(S).forEach(w=>{if(w&&Array.isArray(w.games))L.push(...w.games);else if(Array.isArray(w))L.push(...w);});L.forEach(g=>put(sp,g));}catch(e){}});
  try{(typeof liveSports==='function'?liveSports():[]).forEach(sp=>{(sportGames(sp)||[]).forEach(g=>put(sp,g));});}catch(e){}
  return M;}
/* a sport held back for a day (date-keyed, so every past day keeps its own record) */
let BOOK_Q_MEMO=null;
function bookQuarAll(){if(BOOK_Q_MEMO&&Date.now()-BOOK_Q_MEMO.ts<15e3)return BOOK_Q_MEMO.Q;let Q=get(BOOK_QUAR_KEY,{})||{};if(typeof Q!=='object'||Array.isArray(Q))Q={};BOOK_Q_MEMO={ts:Date.now(),Q,any:Object.keys(Q).length>0};return Q;}
function bookQuarantine(d){return bookQuarAll()[d||today()]||{};}
/* a held-back scope is a whole sport, or one market of it (one-sided totals hold back that sport's totals only) */
function bookIsQuarantined(sp,d,market){try{const Q=bookQuarAll();if(!BOOK_Q_MEMO.any)return false;const q=(Q[String(d||'').slice(0,10)||today()]||{})[sp];if(!q)return false;
  if(q.all)return true;const m=market==='moneyline'?'ml':market;return!!(m&&q.markets&&q.markets[m]);}catch(e){return false;}}
function deskVitals(d,opt){d=d||today();opt=opt||{};const now=Date.now();const T=get(TC_KEY,{})||{};const TC=T.d===d?(T.by||{}):{};
  const V=roGet(VOICES_KEY,[],opt.fresh?1:5e3)||[];const live=(()=>{try{return liveSports();}catch(e){return[];}})();const ST=bookStarts(d);const H=get(BOOK_HOLD_KEY,null);const reread=(H&&H.d===d&&H.reread)||{};
  const Q0=bookQuarantine(d);const Q={};Object.entries(Q0).forEach(([sp,q])=>{if(q&&q.all)Q[sp]=1;});const qm=(sp,m)=>!!(Q0[sp]&&(Q0[sp].all||(Q0[sp].markets||{})[m]));const by={};const mk=sp=>by[sp]||(by[sp]={sp,calls:0,priced:0,official:0,offElig:0,card:0,cardOpen:0,read:false,ts:0,fresh:false,totals:{over:0,under:0}});
  live.forEach(mk);
  const open=(sp,game)=>{const t=ST[sp+'|'+game];return!(isFinite(t)&&now>=t);};
  V.forEach(c=>{if(!c||String(c.date).slice(0,10)!==d||!CHARS[c.voice]||!by[c.sp])return;if(c.pre)return;try{if(confPre(c))return;}catch(e){}
    if(!open(c.sp,c.game))return;const o=by[c.sp];if(c.voice==='Sim'&&c.market==='total'&&(c.side==='over'||c.side==='under'))o.totals[c.side]++;
    if(META_VOICES.has(c.voice))return;o.calls++;let pr=false;try{pr=confPriced(c);}catch(e){}if(!pr)return;o.priced++;
    let off=false;try{off=isOfficial(c);}catch(e){}if(!off)return;o.official++;
    const p=+c.price;const cf=confOf(c);if(p>=-300&&p<=400&&cf!=null&&(cf*americanToDecimal(p)-1)*100>=0.5)o.offElig++;});
  Object.entries(TC).forEach(([sp,B])=>{const o=mk(sp);o.read=true;o.ts=+B.ts||0;o.fresh=!!(reread[sp]&&o.ts>=reread[sp]);
    (B.picks||[]).forEach(x=>{if(!tcIsToday(x))return;o.card++;if(!best5Started(x))o.cardOpen++;});});
  live.forEach(sp=>{const o=by[sp];if(o.read)return;try{const R=get('d4.bgeval.'+sp,null);if(R&&R.d===d)o.read=true;}catch(e){}});
  const unread=live.filter(sp=>!by[sp].read&&!Q[sp]);
  /* a sport with open priced calls but nothing on the card, unless it was just freshly re-read */
  const missing=Object.values(by).filter(o=>!Q[o.sp]&&o.offElig>0&&o.cardOpen===0&&!o.fresh).map(o=>o.sp);
  const critical=[];
  Object.values(by).forEach(o=>{if(qm(o.sp,'total'))return;const n=o.totals.over+o.totals.under;
    if(n>=12&&Math.max(o.totals.over,o.totals.under)/n>=0.92)critical.push({sp:o.sp,market:'total',sig:'one-sided-totals',hard:true,what:`the Sim is on the ${o.totals.over>o.totals.under?'over':'under'} in ${Math.max(o.totals.over,o.totals.under)} of ${n} totals`});});
  [['ncaaf','d4.ncaafarc']].forEach(([sp,k])=>{if(qm(sp,'total'))return;try{const A0=(get(k,{})||{})[d];const A=Array.isArray(A0)?A0:(A0&&Array.isArray(A0.rows)?A0.rows:[]);const P=A.map(r=>+r.projTotal).filter(isFinite);
      if(P.length>=8){const R=Math.max(...P)-Math.min(...P);if(R<=2)critical.push({sp,market:'total',sig:'flat-totals',hard:true,what:`${P.length} projected totals all between ${Math.min(...P)} and ${Math.max(...P)}`});}}catch(e){}});
  ['ncaaf','nfl','nhl'].forEach(sp=>{if(Q[sp]||!TC[sp])return;let n=0,bad=0;const ex=[];
    (TC[sp].picks||[]).forEach(x=>{if(!tcIsToday(x)||best5Started(x)||x.price==null)return;let r=null;try{r=deskBookRow(sp,x.game,mkNorm(x.m||x.market),x.sd||x.side,d);}catch(e){}if(!r)return;n++;
      const lineOff=mkNorm(x.m)!=='ml'&&r.line!=null&&x.line!=null&&Math.abs(+r.line-(+x.line))>0.01;if(lineOff||+r.price!==+x.price){bad++;if(ex.length<2)ex.push(`${x.pick} ${x.price} vs your ${r.line!=null&&mkNorm(x.m)!=='ml'?r.line+' ':''}${r.price}`);}});
    if(n>=4&&bad/n>=0.4)critical.push({sp,sig:'stale-lines',hard:false,what:`${bad} of ${n} card prices differ from your newest line (${ex.join('; ')})`});});
  try{if(typeof ncaafPowerFor==='function'&&!Q.ncaaf){const G=(sportGames('ncaaf')||[]).filter(g=>open('ncaaf',g.away.abbr+'@'+g.home.abbr));const seen={};const col=[];
      G.forEach(g=>[g.away,g.home].forEach(t=>{const r=ncaafPowerFor(t);if(!r||r.sp==null)return;const k=[r.sp,r.offPPG,r.defPPG].join('|');if(seen[k]&&seen[k]!==t.abbr)col.push(seen[k]+'='+t.abbr);else seen[k]=t.abbr;}));
      if(col.length)critical.push({sp:'ncaaf',sig:'rating-collision',hard:true,what:`identical ratings: ${[...new Set(col)].slice(0,4).join(', ')}`});}}catch(e){}
  /* the Best 3 as the freeze would build it, and the first game still ahead */
  let best3=0;try{best3=best3Pool(TC,null).length;}catch(e){}
  const offElig=Object.values(by).reduce((a,o)=>a+(Q[o.sp]?0:o.offElig),0);
  let first=null;Object.entries(ST).forEach(([k,t])=>{const sp=k.split('|')[0];if(!by[sp]||t<=now)return;if(first==null||t<first)first=t;});
  const minsToFirst=first==null?null:Math.round((first-now)/60e3);
  const anyGames=Object.values(by).some(o=>o.cardOpen>0||o.priced>0)||unread.length>0;
  const heldMins=opt.heldMins!=null?opt.heldMins:(H&&H.d===d&&H.first?Math.round((now-H.first)/60e3):0);
  return{d,ts:now,live:live.length,anyGames,frozen:(()=>{try{return deskFrozen(d);}catch(e){return false;}})(),by,unread,missing,critical,best3,officialEligible:offElig,minsToFirst,first,
    quarantine:Object.keys(Q0),override:!!opt.override,qnow:!!opt.qnow,now:!!opt.now,heldMins,retries:+opt.retries||0,gaps:opt.gaps||[]};}

/* ── THE DAY: the freeze, page by page ────────────────────────────────────────── */
const spList=a=>(a||[]).map(s=>(typeof CONF_SP_LAB!=='undefined'&&CONF_SP_LAB[s])||String(s).toUpperCase()).join(', ');
bookDefine({id:'freeze',title:'The day — freezing the card',start:'frozen',max:60,stopIf:c=>!!(c&&c.d&&deskFrozen(c.d)),
  pages:{
    frozen:{q:'Is today already frozen?',to:['ALREADY','slate'],ask:c=>c.frozen?['ALREADY','frozen earlier — nothing frozen ever changes']:['slate','not yet']},
    slate:{q:'Is anything on today\'s slate?',to:['NO_GAMES','override'],ask:c=>!c.live||!c.anyGames?['NO_GAMES','no open games and no calls today']:['override',`${c.live} sport${c.live===1?'':'s'} in season`]},
    override:{q:'Did you tap "Freeze anyway"?',to:['best3','unread'],ask:c=>c.override?['best3','you froze it anyway — the checks are on the record, your call stands']:['unread','no — run every check']},
    unread:{q:'Has every sport in season been read today?',to:['readUnread','missing'],ask:c=>c.unread.length&&c.retries<1&&!c.now?['readUnread',`${spList(c.unread)} not read yet`]:['missing',c.unread.length?`${spList(c.unread)} still unread after a try — treated as no slate`:'every sport read']},
    readUnread:{q:'Read the unread sports in the background',act:'reread',then:'unread',arg:'unread'},
    missing:{q:'Did every sport with calls make the Today card?',to:['health','missingRetry'],ask:c=>c.missing.length?['missingRetry',`${spList(c.missing)} has calls but nothing on the card`]:['health','every sport with calls is on the card']},
    missingRetry:{q:'Is there a retry left?',to:['rereadMissing','missingClock'],ask:c=>c.retries<BOOK_RETRIES&&!c.now?['rereadMissing',`try ${c.retries+1} of ${BOOK_RETRIES}`]:['missingClock',c.now?'you left the app — no more waiting':'out of retries']},
    rereadMissing:{q:'Re-read the missing sports in the background',act:'reread',then:'missing',arg:'missing'},
    missingClock:{q:'Is the first game within 45 minutes, or has it been held 30 minutes already?',to:['health','HOLD_RETRY'],
      ask:c=>c.now?['health',`you left the app — the card goes out without ${spList(c.missing)} rather than wait (the other checks still run)`]
        :c.minsToFirst!=null&&c.minsToFirst<=BOOK_DEADLINE_MIN?['health',`first game in ${c.minsToFirst} min — the card goes out without ${spList(c.missing)} rather than not at all (the other checks still run)`]
        :c.heldMins>=BOOK_HOLD_CAP_MIN?['health',`held ${c.heldMins} minutes — the card goes out without ${spList(c.missing)} (the other checks still run)`]
        :['HOLD_RETRY',`${spList(c.missing)} still isn't on the card — retrying every 2 minutes; the card goes out without it after ${BOOK_HOLD_CAP_MIN} minutes, or ${BOOK_DEADLINE_MIN} minutes before the first game`]},
    health:{q:'Are the inputs healthy?',to:['best3','healthRetry'],ask:c=>c.critical.length?['healthRetry',c.critical.map(x=>`${spList([x.sp])}: ${x.what}`).join(' · ')]:['best3','all clear']},
    healthRetry:{q:'Is there a retry left?',to:['rereadSick','healthClock'],ask:c=>c.retries<BOOK_RETRIES&&!c.now?['rereadSick',`try ${c.retries+1} of ${BOOK_RETRIES}`]:['healthClock',c.now?'you left the app — no more waiting':'out of retries']},
    rereadSick:{q:'Re-read the sports with bad inputs',act:'reread',then:'health',arg:'critical'},
    healthClock:{q:'Is anything still broken for sure — and is it time to post without it?',to:['best3','quarantine','HOLD_YOU'],
      ask:c=>{const hard=c.critical.filter(x=>x.hard);if(!hard.length)return['best3','only a soft warning is left after the re-reads ('+c.critical.map(x=>x.sig).join(', ')+') — posting, and it\'s in the journal'];
        if(c.qnow)return['quarantine','you said post without the broken part'];
        if(c.now)return['quarantine','you left the app — hold the broken part back, post the rest'];
        if(c.minsToFirst!=null&&c.minsToFirst<=BOOK_DEADLINE_MIN)return['quarantine',`first game in ${c.minsToFirst} min — hold the broken part back, post the rest`];
        if(c.heldMins>=BOOK_HOLD_CAP_MIN)return['quarantine',`held ${c.heldMins} minutes — hold the broken part back, post the rest`];
        return['HOLD_YOU',hard.map(x=>`${bookScopeLab(x)}: ${x.what}`).join(' · ')+` — still broken after the re-reads. Held for you: tap "Post without it", or it goes out without the broken part in ${BOOK_HOLD_CAP_MIN-c.heldMins} minutes`];}},
    quarantine:{q:'Hold the broken sport\'s picks back for the day',act:'quarantine',then:'best3'},
    best3:{q:'Is there a Best 3?',to:['POST','POST_GAPS','offCard'],ask:c=>c.best3>0?[c.gaps.length||c.quarantine.length||c.missing.length?'POST_GAPS':'POST',`Best ${Math.min(3,c.best3)}${c.gaps.length?' · '+c.gaps.join(' · '):''}`]:['offCard','nothing in the Best 3 pool']},
    offCard:{q:'Are there official picks the Best 3 should have taken?',to:['NO_PLAY','offRetry'],ask:c=>c.officialEligible>0&&!c.override?['offRetry',`${c.officialEligible} official pick${c.officialEligible===1?'':'s'} at a playable price, none in the Best 3`]:['NO_PLAY',c.override?'you froze it anyway':'nothing cleared the bar — no forced picks']},
    offRetry:{q:'Has the card been re-read for them once?',to:['rereadOff','NO_PLAY'],ask:c=>c.offTried||c.now?['NO_PLAY',`still none in the Best 3 after a re-read — the card goes out honest: no Best 3, and those ${c.officialEligible} official pick${c.officialEligible===1?'':'s'} go in the journal`]:['rereadOff','one re-read of every sport behind them']},
    rereadOff:{q:'Re-read every sport behind those picks',act:'reread',then:'best3',arg:'official'}},
  /* the conditions the suite walks, every combination */
  vars:{frozen:[false,true],live:[0,2],anyGames:[false,true],override:[false,true],unread:[[],['nba']],missing:[[],['nhl'],['nhl','ncaaf']],
    critical:[[],[{sp:'ncaaf',market:'total',sig:'one-sided-totals',hard:true,what:'x'}],[{sp:'nhl',sig:'stale-lines',hard:false,what:'y'}]],heldMins:[0,40],qnow:[false,true],now:[false,true],best3:[0,1,3],officialEligible:[0,2],minsToFirst:[null,20,300],retries:[0],gaps:[[]],quarantine:[[]],offTried:[false]},
  /* what an action does in the suite: "works" fixes what it re-read, "fails" changes nothing but the count */
  sim:{reread:(c,mode,P)=>{c.retries++;if(P.arg==='official')c.offTried=true;if(mode!=='works')return c;if(P.arg==='unread')c.unread=[];if(P.arg==='missing')c.missing=[];if(P.arg==='critical')c.critical=[];if(P.arg==='official'&&c.best3===0)c.best3=1;return c;},
    quarantine:(c)=>{const hard=c.critical.filter(x=>x.hard);c.quarantine=[...new Set([...c.quarantine,...hard.map(x=>x.sp)])];c.gaps=[...c.gaps,'held back: '+spList(hard.map(x=>x.sp))];c.critical=c.critical.filter(x=>!x.hard);return c;}}});
/* what must always be true of the freeze, whatever happens */
function bookFreezeRules(ctx,R,mode){const e=R.end;
  if(ctx.frozen&&e!=='ALREADY')return'a frozen day was touched';
  if(!ctx.frozen&&(!ctx.live||!ctx.anyGames)&&e!=='NO_GAMES')return'an empty slate did something';
  const deadline=ctx.minsToFirst!=null&&ctx.minsToFirst<=BOOK_DEADLINE_MIN;
  if(!ctx.frozen&&ctx.live&&ctx.anyGames&&deadline&&/^HOLD/.test(e))return'held past the deadline — the card must go out before the first game';
  if(!ctx.frozen&&ctx.live&&ctx.anyGames&&ctx.heldMins>=BOOK_HOLD_CAP_MIN&&/^HOLD/.test(e))return'held past the 30-minute cap';
  const early=!deadline&&ctx.heldMins<BOOK_HOLD_CAP_MIN&&!ctx.now;   /* "now" = you left the app: posting what's solid is the point */
  if(!ctx.frozen&&ctx.live&&ctx.anyGames&&!ctx.override&&early&&mode==='fails'&&ctx.missing.length&&BOOK_ENDS[e].post)return'posted with a sport missing while there was still time to fix it';
  if(!ctx.frozen&&ctx.live&&ctx.anyGames&&!ctx.override&&!ctx.qnow&&early&&mode==='fails'&&ctx.critical.some(x=>x.hard)&&BOOK_ENDS[e].post)return'posted broken inputs while there was still time';
  if(R.ctx&&R.ctx.critical&&R.ctx.critical.some(x=>x.hard)&&BOOK_ENDS[e].post&&!ctx.override)return'posted a sport that was still broken (it should have been held back)';
  if(e==='NO_PLAY'&&ctx.best3>0&&!ctx.missing.length&&!ctx.critical.length)return'said no play with a Best 3 in hand';
  if(ctx.now&&/^HOLD/.test(e))return'held after you left the app — a held day must never sleep through its games';
  return null;}

/* the real actions */
const BOOK_BG_MS=60e3;
function bookBgEval(sp){return new Promise(res=>{try{if(typeof SPORT_PAGE==='undefined'||!SPORT_PAGE[sp])return res(null);const ts=Date.now();
  const f=document.createElement('iframe');f.src=SPORT_PAGE[sp]+'?bg=1&eval=1&v='+ts;f.setAttribute('aria-hidden','true');f.style.cssText='position:absolute;width:1px;height:1px;left:-9999px;border:0;opacity:0';
  try{wbBeforeFrame();}catch(e){}document.body.appendChild(f);const iv=setInterval(()=>{const R=get('d4.bgeval.'+sp,null);if(R&&R.ts>=ts){clearInterval(iv);try{f.remove();}catch(e){}res(R);}else if(Date.now()-ts>BOOK_BG_MS){clearInterval(iv);try{f.remove();}catch(e){}res(null);}},600);}catch(e){res(null);}});}
async function bookReread(ctx,P){const which=P.arg==='unread'?ctx.unread:P.arg==='missing'?ctx.missing:P.arg==='critical'?[...new Set(ctx.critical.map(x=>x.sp))]:
    Object.values(ctx.by||{}).filter(o=>o.offElig>0).map(o=>o.sp);
  const here=(typeof window!=='undefined'&&window.__PAGE_SPORT__)||(typeof ACTIVE_SPORT!=='undefined'?ACTIVE_SPORT:null);
  const H=get(BOOK_HOLD_KEY,null)||{};const d=ctx.d;const hold=H.d===d?H:{d,reread:{},rr:[]};hold.reread=hold.reread||{};hold.rr=(hold.rr||[]).concat(Date.now()).slice(-20);set(BOOK_HOLD_KEY,hold);const done=[];
  for(const sp of which){hold.reread[sp]=Date.now();set(BOOK_HOLD_KEY,hold);try{deskSay(`📖 The Book: re-reading ${spList([sp])} before the freeze…`);}catch(e){}
    if(sp===here){try{todaySnapshot();}catch(e){}done.push(sp+' ✓');}   /* this page's own sport: a fresh snapshot (never its eval — that would re-trigger the freeze) */
    else{const R=await bookBgEval(sp);done.push(sp+(R&&R.ok?' ✓':R?' (no eval)':' (timed out)'));}}
  try{PCI_C=null;}catch(e){}try{RO_CACHE[VOICES_KEY]=null;delete RO_CACHE[VOICES_KEY];}catch(e){}const c2=deskVitals(d,{override:ctx.override,retries:ctx.retries+1,heldMins:ctx.heldMins,qnow:ctx.qnow,now:ctx.now,gaps:ctx.gaps});
  c2.offTried=!!(ctx.offTried||P.arg==='official');return{ctx:c2,why:'re-read '+(done.join(', ')||'nothing')};}
const bookScopeLab=x=>spList([x.sp])+(x.market?' '+({ml:'moneylines',spread:'spreads',total:'totals'}[x.market]||x.market):'');
function bookQuarantineAct(ctx){if(deskFrozen(ctx.d))return{ctx,why:'the day is already frozen — nothing is held back after the fact'};const Q=get(BOOK_QUAR_KEY,{})||{};const q=Q[ctx.d]||(Q[ctx.d]={});const hard=ctx.critical.filter(x=>x.hard);
  hard.forEach(x=>{const o=q[x.sp]||(q[x.sp]={markets:{}});if(x.market)o.markets[x.market]=true;else o.all=true;o.sig=x.sig;o.what=x.what;o.ts=Date.now();
    journalAdd({sig:'quarantine',sp:x.sp,sev:'crit',what:`${bookScopeLab(x)} held back for the day: ${x.what}`});});
  set(BOOK_QUAR_KEY,Q);BOOK_Q_MEMO=null;   /* never pruned: every past day keeps its own held-back record (it's tiny) */try{PCI_C=null;}catch(e){}
  const c2=deskVitals(ctx.d,{override:ctx.override,retries:ctx.retries,heldMins:ctx.heldMins,qnow:ctx.qnow,now:ctx.now,gaps:[...ctx.gaps,...hard.map(x=>bookScopeLab(x)+' held back — '+x.what)]});c2.offTried=ctx.offTried;return{ctx:c2,why:'held back '+hard.map(bookScopeLab).join(', ')};}
/* the stories told, newest first (60 kept) */
function bookLog(R,why){try{const L=get(BOOK_KEY,[])||[];L.unshift({id:'b'+Date.now(),d:today(),ts:Date.now(),book:R.book,end:R.end,why:R.why,trigger:why||'',path:R.path.map(s=>({p:s.p,to:s.to||null,act:s.act||null,why:String(s.why||'').slice(0,240)})),bad:R.bad?1:0});
  set(BOOK_KEY,L.slice(0,60));}catch(e){}}
let BOOK_BUSY=false,BOOK_TIMER=null;
function bookHold(d){d=d||today();const H=get(BOOK_HOLD_KEY,null);if(!(H&&H.d===d&&H.on))return null;try{if(deskFrozen(d))return null;}catch(e){}return H;}
function bookHoldSet(d,R){const H=get(BOOK_HOLD_KEY,null)||{};const h=H.d===d?H:{d,reread:{}};if(!h.on||!h.first)h.first=Date.now();h.on=true;h.ts=Date.now();h.end=R.end;h.why=R.why;h.tries=(h.tries||0)+1;set(BOOK_HOLD_KEY,h);
  journalAdd({sig:'held',sev:R.end==='HOLD_YOU'?'crit':'warn',what:R.why});}
function bookHoldClear(d){const H=get(BOOK_HOLD_KEY,null);if(H&&H.d===d&&H.on){H.on=false;H.first=null;H.cleared=Date.now();set(BOOK_HOLD_KEY,H);}}
function bookHoldTick(){try{if(DESK_BG_EVAL||(typeof BG_MODE!=='undefined'&&BG_MODE))return;const d=today();if(!bookHold(d)||deskFrozen(d)||BOOK_BUSY||DESK_EVAL_BUSY)return;
  deskFreezeAll('the Book · retry').catch(()=>{});}catch(e){}}
const BOOK_RR_WINDOW=10*60e3;
function bookRecentRereads(d){const H=get(BOOK_HOLD_KEY,null);return H&&H.d===d?(H.rr||[]).filter(t=>Date.now()-t<BOOK_RR_WINDOW).length:0;}
async function bookFreezeRun(why,opts){const d=today();let ctx=deskVitals(d,{override:!!opts.override,qnow:!!opts.qnow,now:!!opts.now,retries:Math.min(BOOK_RETRIES,bookRecentRereads(d))});
  ctx.critical.forEach(x=>journalAdd({sig:x.sig,sp:x.sp,sev:'crit',what:x.what}));
  if(ctx.missing.length)ctx.missing.forEach(sp=>journalAdd({sig:'sport-missing',sp,sev:'warn',what:`${spList([sp])} had calls but nothing on the Today card`}));
  const R=await bookWalk(BOOKS.freeze,ctx,{reread:bookReread,quarantine:bookQuarantineAct});
  if(opts.override)journalAdd({sig:'you-override',sev:'info',what:'frozen anyway by you'});
  if(R.end==='POST_GAPS')journalAdd({sig:'posted-with-gap',sev:'warn',what:R.why});
  if(R.end==='NO_PLAY'&&R.ctx.officialEligible>0)journalAdd({sig:'official-off-card',sev:'warn',what:`${R.ctx.officialEligible} official pick(s) never reached the card`});
  if(BOOK_ENDS[R.end].post&&R.ctx.missing.length===0&&R.ctx.critical.length===0)['sport-missing','one-sided-totals','flat-totals','stale-lines','rating-collision','held'].forEach(sig=>{
    const J=journalAll();let ch=false;J.forEach(x=>{if(x&&x.d===d&&x.sig===sig&&!x.fixed){x.fixed=R.path.some(s=>s.act==='reread')?'re-read before the freeze':'cleared on its own';ch=true;}});if(ch)set(JOURNAL_KEY,J);});
  bookLog(R,why);return R;}
/* the freeze, through the Book */
if(typeof deskFreezeAll==='function'&&typeof window!=='undefined'&&!window.__BOOK_FREEZE__){window.__BOOK_FREEZE__=1;const FREEZE0=deskFreezeAll;
  deskFreezeAll=async function(why,opts){opts=opts||{};const d=today();if(deskFrozen(d))return get(FREEZE_KEY,null);
    if(DESK_BG_EVAL||(typeof BG_MODE!=='undefined'&&BG_MODE))return null;   /* hidden frames never freeze */
    if(window.__NO_BOOK__)return FREEZE0(why);
    if(BOOK_BUSY&&!opts.now)return null;BOOK_BUSY=true;let R=null;
    try{R=await bookFreezeRun(why,opts);}catch(e){console.warn('the Book',e);journalAdd({sig:'book-crash',sev:'crit',what:String(e&&e.message||e).slice(0,200)});R=null;}finally{BOOK_BUSY=false;}
    if(deskFrozen(d)){bookHoldClear(d);return get(FREEZE_KEY,null);}   /* frozen meanwhile (you left the app, another walk finished): nothing more to do */
    if(!R||R.bad){if(R&&R.bad)journalAdd({sig:'book-crash',sev:'crit',what:'a page misbehaved: '+R.why});bookHoldClear(d);return FREEZE0(why);}   /* fails open: the old freeze, exactly as before */
    if(R.end==='ALREADY'||R.end==='NO_GAMES'){bookHoldClear(d);return get(FREEZE_KEY,null);}
    if(BOOK_ENDS[R.end].post){bookHoldClear(d);bookUnlockEarly(d);const F=await FREEZE0(why+(R.end==='POST'?'':' · '+BOOK_ENDS[R.end].lab.toLowerCase()));
      try{const F2=get(FREEZE_KEY,null);if(F2&&F2.d===d){F2.book={end:R.end,why:R.why,gaps:bookGapsOf(R)};try{F2.dev=syncDevice();}catch(e){}set(FREEZE_KEY,F2);}}catch(e){}return get(FREEZE_KEY,null)||F;}
    bookHoldSet(d,R);try{deskSay(`<span style="color:var(--gold)">${BOOK_ENDS[R.end].ico} Held by the Book — ${txtEsc(R.why)}</span>`);}catch(e){}
    try{deskRerender();}catch(e){}return null;};}
/* the Best 3 (or the plans built on it) locked before the Book finished — from an earlier evaluation, or a render
   in between: the freeze rebuilds them from the final state (held-back parts excluded, re-read sports included).
   Only while nothing has gone out: not frozen, no VIP post today, and no pick on it public yet. */
function bookUnlockEarly(d){try{if(deskFrozen(d))return false;const TP=get('d4.tgposts',{})||{};if(TP[d]&&(TP[d].ids||[]).length)return false;
    const S=get(BEST5_KEY,{})||{};const top=(S.d===d&&S.locked&&S.top3)||[];if(top.some(x=>{try{return best5Started(x)||(typeof pubIsOpen==='function'&&pubIsOpen(x));}catch(e){return true;}}))return false;
    let n=0;if(S.d===d&&S.locked){set(BEST5_KEY,{d,locked:false});n++;const L=get('d4.best5log',{})||{};if(L[d]){L[d]={picks:[],reopened:Date.now()};set('d4.best5log',L);}}
    try{const P=get(DESK_KEY,{})||{};if(P.d===d&&P.locked){set(DESK_KEY,{});n++;}}catch(e){}
    [CPAR_KEY,CPX_KEY].forEach(k=>{try{const M=get(k,{})||{};if(M[d]&&M[d].locked){M[d]={locked:false,reopened:Date.now()};set(k,M);n++;}}catch(e){}});
    try{const B=get(BKDAY_KEY,{})||{};if(B.d===d&&B.locked){set(BKDAY_KEY,{d});n++;}}catch(e){}
    try{DESK_MEM=null;CPAR_MEM=null;CPX_MEM=null;}catch(e){}
    if(n)journalAdd({sig:'early-lock',sev:'info',what:'the Best 3 (or the plans built on it) had locked before the Book finished — rebuilt at the freeze from the final state'});return n>0;}catch(e){return false;}}
/* leaving the app while the Book holds (or is still deciding): it stops waiting and posts what's solid */
function bookLeaving(){try{if(DESK_BG_EVAL||(typeof BG_MODE!=='undefined'&&BG_MODE))return;const d=today();if(deskFrozen(d))return;if(!bookHold(d)&&!BOOK_BUSY)return;
  deskFreezeAll('the Book · you left the app',{now:true}).catch(()=>{});}catch(e){}}
/* moving to another sport page also hides this one, but it unloads before a zero-delay timer can run — so only
   leaving the app (backgrounded, phone locked) reaches the freeze; the next sport page simply keeps holding */
let BOOK_UNLOADING=false;
if(typeof window!=='undefined'&&typeof document!=='undefined'&&!window.__BOOK_HIDE__){window.__BOOK_HIDE__=1;
  window.addEventListener('pagehide',()=>{BOOK_UNLOADING=true;});window.addEventListener('pageshow',()=>{BOOK_UNLOADING=false;});
  document.addEventListener('visibilitychange',()=>{try{if(document.visibilityState==='hidden'){if(!BOOK_UNLOADING)setTimeout(()=>{if(!BOOK_UNLOADING)bookLeaving();},0);}else setTimeout(bookCatchUp,1500);}catch(e){}});}
/* a frozen day whose VIP card never went out (the app was closed or hidden as it froze) posts as soon as the app is open
   again — only while a game on the card is still ahead; "already posted today" and the in-flight guard stop doubles */
const BOOK_MOBILE=typeof navigator!=='undefined'&&(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent||'')||(/Macintosh/.test(navigator.userAgent||'')&&(navigator.maxTouchPoints||0)>1));
function bookCatchUp(){try{if(DESK_BG_EVAL||(typeof BG_MODE!=='undefined'&&BG_MODE))return false;if(typeof document!=='undefined'&&document.visibilityState==='hidden')return false;
    const d=today();if(!deskFrozen(d))return false;const F=get(FREEZE_KEY,null);let me='';try{me=syncDevice();}catch(e){}if(!F||!F.dev||F.dev!==me)return false;   /* only the device that froze it */
    try{const TP=get('d4.tgposts',{})||{};if(TP[d]&&(TP[d].ids||[]).length)return false;}catch(e){}const P=get('d4.tgposted',null);const B=bcCfg();const tg=!!(String(get('d4.tgbot','')||'').trim()&&get('d4.tgchat',''));
    const pub=get('d4.pubstate',null);let gh=false;try{gh=!!(get(LS.ghtoken,'')||get(SYNC.token,''));}catch(e){}const pageDue=gh&&!(pub&&pub.d===d&&pub.ok);const vipDue=tg&&B.autoPost&&!(P&&P.d===d);if(!pageDue&&!vipDue)return false;
    if(BOOK_PUB_BUSY)return false;const T=get(TC_KEY,{})||{};const open=T.d===d&&Object.values(T.by||{}).some(X=>(X.picks||[]).some(x=>tcIsToday(x)&&!best5Started(x)));if(!open)return false;
    journalAdd({sig:'publish-catch-up',sev:'info',what:'the day froze while the app was closed or hidden — the VIP card goes out now'});
    deskPublishAll('catch-up').catch(()=>{});return true;}catch(e){return false;}}
/* the gaps a posted card states out loud */
function bookGapsOf(R){const c=R&&R.ctx||{};const L=[];(c.missing||[]).forEach(sp=>L.push(`${spList([sp])} isn't in today's Best 3 — its board didn't make the card in time`));
  const Q=bookQuarantine(c.d);Object.entries(Q).forEach(([sp,q])=>{const ms=Object.keys(q.markets||{});L.push(q.all?`${spList([sp])} is held back today — its inputs looked broken`:`${spList([sp])} ${ms.map(m=>({ml:'moneylines',spread:'spreads',total:'totals'}[m]||m)).join(' and ')} held back today — the model looked broken there`);});
  try{const S=get(BEST5_KEY,{})||{};if(S.d===c.d&&S.locked)(S.top3||[]).forEach(x=>{if(bookIsQuarantined(x.sp,c.d,mkNorm(x.m||x.market)))L.push(`${x.pick} was already on the card before the check found the problem, so it stays`);});}catch(e){}
  return[...new Set(L)];}
function bookGapsFor(d){try{const F=get(FREEZE_KEY,null);return F&&F.d===d&&F.book&&Array.isArray(F.book.gaps)?F.book.gaps:[];}catch(e){return[];}}
if(typeof subCard==='function'&&typeof window!=='undefined'&&!window.__BOOK_SC__){window.__BOOK_SC__=1;const SC0=subCard;
  subCard=function(){const C=SC0.apply(this,arguments);try{if(C&&C.d&&!Array.isArray(C.bookGaps))C.bookGaps=bookGapsFor(C.d);}catch(e){}return C;};}
if(typeof subTelegramText==='function'&&typeof window!=='undefined'&&!window.__BOOK_TG__){window.__BOOK_TG__=1;const STT0=subTelegramText;
  subTelegramText=function(C,mk){const parts=STT0(C,mk);try{const G=C&&Array.isArray(C.bookGaps)?C.bookGaps:bookGapsFor(C&&C.d);if(G.length&&parts.length){const i=parts[0].indexOf('\n');
      /* Telegram takes 4,096 characters a message: the gap lines go in as far as they fit (the part was split at 3,800) */
      let add='';for(const g of G){const l='⚠️ <i>'+txtEsc(g)+'</i>';if(parts[0].length+(add?add.length+1:0)+l.length+1>4000)break;add=add?add+'\n'+l:l;}
      if(add)parts[0]=i>=0?parts[0].slice(0,i+1)+add+'\n'+parts[0].slice(i+1):parts[0]+'\n'+add;}}catch(e){}return parts;};}
/* while the Book is deciding or holding, nothing behaves as frozen: the Best 3 and the desk keep building */
if(typeof evalRanToday==='function'&&typeof window!=='undefined'&&!window.__BOOK_ERT__){window.__BOOK_ERT__=1;const ERT0=evalRanToday;
  evalRanToday=function(){try{const d=today();if(!deskFrozen(d)&&(BOOK_BUSY||bookHold(d)))return false;}catch(e){}return ERT0();};}
/* a sport held back for the day: its calls aren't official (graded quietly, like any call under the bar) */
if(typeof isOfficial==='function'&&typeof window!=='undefined'&&!window.__BOOK_OFF__){window.__BOOK_OFF__=1;const OFF0=isOfficial;
  isOfficial=function(x){try{if(x&&x.sp&&bookIsQuarantined(x.sp,x.date,x.market||(x.m&&mkNorm(x.m))))return false;}catch(e){}return OFF0(x);};}
if(typeof best3Pool==='function'&&typeof window!=='undefined'&&!window.__BOOK_B3__){window.__BOOK_B3__=1;const B3P0=best3Pool;
  best3Pool=function(by,sp,opts){try{const Q=bookQuarantine();if(Object.keys(Q).length&&by){const b2={};Object.entries(by).forEach(([s,B])=>{const q=Q[s];if(!q){b2[s]=B;return;}if(q.all)return;
      b2[s]={...B,picks:(B.picks||[]).filter(x=>!(q.markets||{})[mkNorm(x.m||x.market)])};});by=b2;}}catch(e){}return B3P0(by,sp,opts);};}
if(typeof deskSkillTickets==='function'&&typeof window!=='undefined'&&!window.__BOOK_SK__){window.__BOOK_SK__=1;const DSK0=deskSkillTickets;
  deskSkillTickets=function(V,d,ctx){try{const Q=bookQuarantine(d);if(Object.keys(Q).length)V=(V||[]).filter(c=>!bookIsQuarantined(c.sp,d,c.market));}catch(e){}return DSK0(V,d,ctx);};}
/* the post, through the Book (a short one: the freeze already did the checking) */
bookDefine({id:'publish',title:'The post — publishing a frozen day',start:'frozen',
  pages:{frozen:{q:'Is the day frozen?',to:['NOT_FROZEN','telegram'],ask:c=>c.frozen||c.manual?['telegram','frozen']:['NOT_FROZEN','nothing goes out before the freeze']},
    telegram:{q:'Is Telegram set up?',to:['SEND','PAGE_ONLY'],ask:c=>c.tg?['SEND','page, VIP card and notes']:['PAGE_ONLY','no bot or channel saved — the public page only']}},
  vars:{frozen:[false,true],manual:[false,true],tg:[false,true]}});
if(typeof deskPublishAll==='function'&&typeof window!=='undefined'&&!window.__BOOK_PUB__){window.__BOOK_PUB__=1;const PUB0=deskPublishAll;
  deskPublishAll=async function(why){let R=null;try{const tg=!!(String(get('d4.tgbot','')||'').trim()&&get('d4.tgchat',''));R=bookWalkSync(BOOKS.publish,{frozen:deskFrozen(),manual:why==='manual',tg});bookLog(R,why);}catch(e){R=null;}
    if(R&&R.end==='NOT_FROZEN')return{msg:'Nothing published — the day isn\'t frozen yet.',out:[]};
    if(why!=='manual'&&BOOK_MOBILE&&typeof document!=='undefined'&&document.visibilityState==='hidden'){journalAdd({sig:'publish-deferred',sev:'info',what:'frozen while the app was in the background — the VIP card goes out when it\'s open again'});return{msg:'Publishing when the app is open again.',out:[]};}
    if(BOOK_PUB_BUSY)return{msg:'Already publishing.',out:[]};BOOK_PUB_BUSY=true;try{return await PUB0(why);}finally{BOOK_PUB_BUSY=false;}};}
let BOOK_PUB_BUSY=false;

/* ── WHAT YOU SEE ──────────────────────────────────────────────────────────────── */
function bookPathHtml(R){const B=BOOKS[R.book];const pg={};Object.keys((B&&B.pages)||{}).forEach((k,i)=>{pg[k]=i+1;});const E=BOOK_ENDS[R.end]||{};
  return`<div class="bk-story">${(R.path||[]).map(s=>{const P=(B&&B.pages[s.p])||{};const to=s.to?(BOOK_ENDS[s.to]?`<b>${BOOK_ENDS[s.to].ico} ${txtEsc(BOOK_ENDS[s.to].lab)}</b>`:`turn to page ${pg[s.to]||'?'}`):'';
    return`<div class="bk-step"><span class="bk-pg">p.${pg[s.p]||'?'}</span> ${txtEsc(P.q||s.p)}${s.act?` <i>— done: ${txtEsc(s.why||'')}</i>`:` <span class="bk-why">${txtEsc(s.why||'')}</span> → ${to}`}</div>`;}).join('')}</div>`;}
function bookPagesHtml(B){const C=bookCheck(B);const pg={};Object.keys(B.pages).forEach((k,i)=>{pg[k]=i+1;});
  return`<details class="tkt"><summary><b>📖 ${txtEsc(B.title)}</b> <span class="mono" style="font-size:10px;color:${C.ok?'var(--win)':'var(--rust)'}">${C.pages} pages · ${C.ok?'every path ends — 0 dead ends':C.errs.length+' problem'+(C.errs.length===1?'':'s')}</span></summary>
    ${Object.entries(B.pages).map(([k,P])=>`<div class="bk-page"><span class="bk-pg">p.${pg[k]}</span> <b>${txtEsc(P.q||k)}</b><div class="mono bk-turns">${P.act?`then turn to page ${pg[P.then]}`:bookTurns(P).map(t=>BOOK_ENDS[t]?`${BOOK_ENDS[t].ico} ${txtEsc(BOOK_ENDS[t].lab)}`:`page ${pg[t]}`).join(' · or · ')}</div></div>`).join('')}
    ${C.ok?'':`<div class="mono" style="color:var(--rust);font-size:10px">${C.errs.map(txtEsc).join('<br>')}</div>`}</details>`;}
function journalHtml(n){const J=journalAll().slice().sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,n||30);if(!J.length)return'<div class="sub" style="font-size:10.5px">Nothing in the journal yet. Incidents, world changes and generations land here.</div>';
  const col={crit:'var(--rust)',warn:'var(--gold)',info:'var(--mute)'};
  return J.map(x=>{const S=BOOK_SIGS[x.sig]||{};const seen=x.sig?journalSeen(x.sig,x.d):{n:0};
    return`<div class="bk-j"><span class="mono" style="color:${col[x.sev]||'var(--mute)'}">${txtEsc(x.d||'')}</span> <b>${txtEsc(S.lab||x.title||x.sig||x.kind)}</b>${x.sp?` <span class="mono">${txtEsc(spList([x.sp]))}</span>`:''}${x.n>1?` <span class="mono">×${x.n}</span>`:''}
      <div class="sub" style="font-size:10.5px">${txtEsc(x.what||'')}${x.fixed?` <span style="color:var(--win)">· fixed: ${txtEsc(x.fixed)}</span>`:''}${seen.n?` <span class="mono" style="color:var(--mute)">· seen on ${seen.n} earlier day${seen.n===1?'':'s'}${seen.fixed?' (fixed then by: '+txtEsc(seen.fixed)+')':''}</span>`:''}</div></div>`;}).join('');}
function vitalsHtml(V0){let V=V0;if(!V){try{V=deskVitals();}catch(e){return'';}}const H=bookHold();const rows=Object.values(V.by).filter(o=>o.read||o.priced).map(o=>`<span class="mono vt-sp">${txtEsc(spList([o.sp]))} ${o.cardOpen} on card · ${o.priced} calls${o.official?` · ${o.official} official`:''}</span>`).join('');
  const bad=[...V.missing.map(sp=>`${spList([sp])} isn't on the card`),...V.critical.map(x=>`${spList([x.sp])}: ${x.what}`)];
  return`<div class="tkt vt-card"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b>🛡 Immune system</b><span class="mono" style="font-size:10px;color:${H?'var(--gold)':bad.length?'var(--rust)':'var(--win)'}">${V.frozen?'day frozen':H?'freeze held':bad.length?bad.length+' issue'+(bad.length===1?'':'s'):'all clear'}</span></div>
    ${H?`<div class="sub" style="font-size:11px;color:var(--gold)">${BOOK_ENDS[H.end]?BOOK_ENDS[H.end].ico:'⏳'} ${txtEsc(H.why||'')}</div><div class="bar" style="margin-top:6px"><button class="primary" onclick="deskFreezeAll('you · retry now').then(()=>deskRerender())">↻ Retry now</button>${H.end==='HOLD_YOU'?`<button onclick="deskFreezeAll('you · post without the broken part',{qnow:true}).then(()=>deskRerender())">Post without it</button>`:''}<button onclick="if(confirm('Freeze and post the card as it is now, checks and all?'))deskFreezeAll('you · freeze anyway',{override:true}).then(()=>deskRerender())">Freeze anyway</button></div>`:''}
    ${!V.frozen&&bad.length&&!H?`<div class="sub" style="font-size:10.5px;color:var(--rust)">${bad.map(txtEsc).join(' · ')} — the Book re-reads it before the freeze.</div>`:''}
    ${rows?`<div style="display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:4px">${rows}</div>`:''}
    ${V.minsToFirst!=null&&!V.frozen?`<div class="mono" style="font-size:9.5px;color:var(--mute);margin-top:3px">first game in ${V.minsToFirst} min · the card always goes out by ${BOOK_DEADLINE_MIN} min before it</div>`:''}</div>`;}
function bookViewHtml(){const L=(get(BOOK_KEY,[])||[]).filter(x=>x.d===today());const last=L[0];
  return`<div class="tkt hi"><h3>📖 The Book</h3><div class="sub" style="font-size:10.5px">Every decision the app makes about the day is a page with its own question. Each answer turns to another page or an ending, and no path is a dead end. Today's story is below, then every page of every book, then the journal of everything that went wrong and what fixed it.</div></div>
    ${vitalsHtml()}
    <div class="tkt"><h3 style="margin:0 0 4px">Today's story</h3>${last?`<div class="mono" style="font-size:10px;color:var(--mute)">${new Date(last.ts).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})} · ${txtEsc(last.trigger||'')} · ${txtEsc((BOOKS[last.book]||{}).title||last.book)}</div>${bookPathHtml(last)}`:'<div class="sub" style="font-size:10.5px">No freeze yet today. The story is written when the master evaluation runs.</div>'}
      ${L.length>1?`<details><summary class="mono" style="font-size:10px;color:var(--mute)">${L.length-1} earlier stor${L.length===2?'y':'ies'} today</summary>${L.slice(1,8).map(x=>`<div class="mono" style="font-size:10px;margin-top:6px">${new Date(x.ts).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})} · ${txtEsc((BOOKS[x.book]||{}).title||x.book)} · ${(BOOK_ENDS[x.end]||{}).ico||''} ${txtEsc((BOOK_ENDS[x.end]||{}).lab||x.end)}</div>${bookPathHtml(x)}`).join('')}</details>`:''}</div>
    ${Object.values(BOOKS).map(bookPagesHtml).join('')}
    <div class="tkt"><h3 style="margin:0 0 4px">📓 The journal</h3>${journalHtml(30)}</div>`;}
/* Records → 📖 The Book */
if(typeof recViewBar==='function'&&typeof window!=='undefined'&&!window.__BOOK_VIEW__){window.__BOOK_VIEW__=1;const RVB0=recViewBar;
  recViewBar=function(){const h=RVB0();return h.replace('</div>',`<button class="${REC_VIEW==='book'?'on':''}" onclick="REC_VIEW='book';renderRecordsHub()">📖 The Book</button></div>`);};
  if(typeof renderRecordsHub==='function'){const RRH0=renderRecordsHub;renderRecordsHub=function(){const el=document.getElementById('recordsHub');
    if(el&&REC_VIEW==='book'){try{const gv=document.getElementById('v-grades');if(gv)gv.classList.add('rec-clean');}catch(e){}try{el.innerHTML=recViewBar()+bookViewHtml();}catch(e){el.innerHTML=recViewBar()+'<div class="tkt"><div class="sub">'+txtEsc(e.message)+'</div></div>';}return;}
    return RRH0();};}}
/* Today: the immune system sits under the process bar */
if(typeof deskProcessHtml==='function'&&typeof window!=='undefined'&&!window.__BOOK_PS__){window.__BOOK_PS__=1;const DPH0=deskProcessHtml;
  deskProcessHtml=function(){let h=DPH0();try{const H=bookHold();if(H)h+=vitalsHtml();else if(!deskFrozen()){const V=bookVitalsMemo();if(V&&(V.missing.length||V.critical.length))h+=vitalsHtml(V);}}catch(e){}return h;};}
let BOOK_VT_MEMO=null;
function bookVitalsMemo(){if(BOOK_VT_MEMO&&Date.now()-BOOK_VT_MEMO.ts<60e3&&BOOK_VT_MEMO.d===today())return BOOK_VT_MEMO.V;let V=null;try{V=deskVitals();}catch(e){}BOOK_VT_MEMO={ts:Date.now(),d:today(),V};return V;}
const BOOK_CSS=`.bk-story{margin-top:4px}.bk-step{font-size:11.5px;line-height:1.45;padding:3px 0;border-top:1px solid var(--rule)}.bk-pg{display:inline-block;min-width:30px;font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:var(--gold)}
.bk-why{color:var(--mute);font-size:10.5px}.bk-page{padding:5px 0;border-top:1px solid var(--rule);font-size:11.5px}.bk-turns{font-size:9.5px;color:var(--mute);margin-left:34px}
.bk-j{padding:6px 0;border-top:1px solid var(--rule);font-size:11.5px}.vt-card{border-left:3px solid var(--gold)}.vt-sp{font-size:9.5px;color:var(--mute)}`;
if(typeof window!=='undefined'&&!window.__BOOK_BOOT__){window.__BOOK_BOOT__=1;window.addEventListener('load',()=>{try{if(!document.getElementById('bookCss')){const st=document.createElement('style');st.id='bookCss';st.textContent=BOOK_CSS;document.head.appendChild(st);}}catch(e){}
  if(DESK_BG_EVAL||(typeof BG_MODE!=='undefined'&&BG_MODE)||window.__NO_GRADELOOP__)return;
  setTimeout(bookHoldTick,15000);clearInterval(BOOK_TIMER);BOOK_TIMER=setInterval(bookHoldTick,BOOK_HOLD_EVERY);setTimeout(bookCatchUp,8000);});}
