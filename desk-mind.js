/* ═══ THE MIND (v2.44) — how each character is doing, and what the app does about it ══════
   Loaded on every sport page after desk-book.js.

   §1 · CLOSING LINE VALUE ON EVERY CALL. When a call grades, the app stamps how the market
        closed against the price the character took (+ = it beat the close). Results lag;
        CLV leads. It's the earliest honest read on whether a character is good or lucky.
   §2 · STATUS — the health protocol, written in advance so the app never panics and never
        gets stubborn. Every character × sport, once a day, from its last 4 weeks:
          ⚪ learning   fewer than 25 graded calls — too soon to judge
          🟢 healthy    winning about what its own confidence promised
          🟡 cold       losing, but within variance (or the market moved its way — unlucky)
          🟠 warning    losing past variance with no CLV to clear it, or cold with the market
                        moving against it
          🔴 broken     losing well past variance AND the market moving against it
          🔥 heater     hot, and the market agrees — what's working is written down
          🍀 lucky      hot while the market moves against it — the bill is coming
        Each character is judged against the POOL of its sport (if every character in a sport
        under-wins its confidence, that's the confidence meter's miss, not theirs), days a sport's
        inputs were known broken are left out, and only a line that moved after the call's own lock
        counts as its CLV. WATCHING ONLY: the status benches no one and trims no stake. Like every
        change to what's official, enforcement has to prove itself in the shadows first. */

/* ── §1 · CLV on every graded call ──
   The price a character "took" is its call as locked at the master evaluation (x.lk). Only a line
   that MOVED after that lock says anything (the app re-captures a line only when it changes), so a
   call with no later move gets no CLV at all — never a fake zero. */
const CLV_PER_PT={nfl:3,ncaaf:3,nba:3,ncaab:3,nhl:8,mlb:6};
function callClv(x){try{if(!x||x.price==null||!x.lk)return null;const e=clvEntry(x.sp,x.game,x.market,x.side,String(x.date||'').slice(0,10));if(!e||!e.open||!e.close||!(e.close.ts>e.open.ts)||!(e.close.ts>x.lk))return null;
    const pr=amerOk(x.price);if(pr==null||amerOk(e.close.price)==null)return null;
    const same=x.market==='ml'||e.close.line==null||x.line==null||Math.abs(+e.close.line-(+x.line))<0.01;
    if(same)return +((imp(amerOk(e.close.price))-imp(pr))*100).toFixed(2);
    const pts=x.market==='total'?(x.side==='over'?e.close.line-x.line:x.line-e.close.line):(+x.line-(+e.close.line));
    return +(pts*(CLV_PER_PT[x.sp]||4)).toFixed(2);}catch(e){return null;}}
/* §1b · the market's own open → close (DraftKings, from ESPN's game summary) for every final the app
   reads — no extra downloads: it rides along whenever a box score is parsed. A call with no move after
   its lock is graded on where that market went from open to close: did it end up on the character's side? */
const CLOSES_KEY='d4.closes';
const CLOSE_LEAGUE={nfl:'nfl','college-football':'ncaaf',nhl:'nhl',nba:'nba',mlb:'mlb','mens-college-basketball':'ncaab'},CLOSE_UID={28:'nfl',23:'ncaaf',90:'nhl',46:'nba',10:'mlb',41:'ncaab'};
const CLOSE_ALIAS={mlb:{CHW:'CWS',ARI:'AZ',OAK:'ATH',WAS:'WSH'},nfl:{WAS:'WSH',JAC:'JAX',LA:'LAR',LVR:'LV',OAK:'LV',ARZ:'ARI'},nhl:{LAK:'LA',NJD:'NJ',SJS:'SJ',TBL:'TB',VEG:'VGK',LV:'VGK',MON:'MTL',UTAH:'UTA',WAS:'WSH'},nba:{GSW:'GS',NYK:'NY',NOP:'NO',SAS:'SA',UTA:'UTAH',WAS:'WSH',BRK:'BKN',PHO:'PHX',CHO:'CHA'}};
function closeOdds(s){if(s==null)return null;const t=String(s).trim();if(/^even$/i.test(t))return 100;const v=parseFloat(t.replace(/^[ou]/i,''));return isFinite(v)?v:null;}
function closeCapture(j,sp0){try{const H=(j||{}).header||{};const c=(H.competitions||[])[0]||{};if((((c.status||{}).type)||{}).state!=='post')return false;
    const lg=H.league||{};const sp=sp0||CLOSE_LEAGUE[lg.slug]||CLOSE_UID[(String(lg.uid||'').match(/l:(\d+)/)||[])[1]];if(!sp)return false;
    const pc=((j||{}).pickcenter||[]).find(x=>x&&(x.moneyline||x.pointSpread||x.total));if(!pc)return false;
    const cs=c.competitors||[];const A=cs.find(x=>x.homeAway==='away'),Hm=cs.find(x=>x.homeAway==='home');if(!A||!Hm)return false;
    const ab=t=>{const x=String(((t.team||{}).abbreviation)||'').toUpperCase();return(CLOSE_ALIAS[sp]||{})[x]||x;};const game=ab(A)+'@'+ab(Hm);const d=tdDay(c.date||'');if(!d)return false;
    const oc=o=>o?{open:closeOdds((o.open||{}).odds),close:closeOdds((o.close||{}).odds),ol:closeOdds((o.open||{}).line),cl:closeOdds((o.close||{}).line)}:null;
    const ml=pc.moneyline||{},ps=pc.pointSpread||{},to=pc.total||{};
    const rec={src:(pc.provider||{}).name||'ESPN',ts:Date.now(),ml:{home:oc(ml.home),away:oc(ml.away)},spread:{home:oc(ps.home),away:oc(ps.away)},total:{over:oc(to.over),under:oc(to.under)}};
    const k=sp+'|'+game;const All=roGet(CLOSES_KEY,{},30e3)||{};if((All[d]||{})[k]||((CLOSE_PEND||{})[d]||{})[k])return false;
    /* a box-score page parses many finals at once: one write for the whole burst */
    CLOSE_PEND=CLOSE_PEND||{};(CLOSE_PEND[d]=CLOSE_PEND[d]||{})[k]=rec;clearTimeout(CLOSE_T);CLOSE_T=setTimeout(closeFlush,1500);return true;}catch(e){return false;}}
let CLOSE_PEND=null,CLOSE_T=null;
function closeFlush(){const P=CLOSE_PEND;CLOSE_PEND=null;if(!P)return;try{const All=get(CLOSES_KEY,{})||{};
    Object.entries(P).forEach(([d,M])=>{const D=All[d]||(All[d]={});Object.entries(M).forEach(([k,r])=>{if(!D[k])D[k]=r;});});Object.keys(All).sort().slice(0,-40).forEach(x=>delete All[x]);set(CLOSES_KEY,All);}catch(e){}}
if(typeof window!=='undefined'&&!window.__MIND_CF__){window.__MIND_CF__=1;window.addEventListener('pagehide',()=>{try{closeFlush();}catch(e){}});}
['fbpParseHockey','fbpParseBasketball','fbpParseBox','fbpParseBaseball'].forEach(fn=>{try{if(typeof window==='undefined'||typeof window[fn]!=='function'||window['__MIND_'+fn])return;window['__MIND_'+fn]=1;const F0=window[fn];
  window[fn]=function(j){const r=F0.apply(this,arguments);try{closeCapture(j);}catch(e){}return r;};}catch(e){}});
function closeOf(sp,game,d){try{const k=sp+'|'+game;const p=((CLOSE_PEND||{})[d]||{})[k];if(p)return p;const A=roGet(CLOSES_KEY,{},30e3)||{};return((A[d]||{})[k])||null;}catch(e){return null;}}
/* where the market went from open to close on this side, in chance points (+ = toward it) */
function marketMove(x){const cl=closeOf(x.sp,x.game,String(x.date||'').slice(0,10));if(!cl)return null;const o=(cl[x.market]||{})[x.side];if(!o||o.open==null||o.close==null)return null;
  if(x.market!=='ml'&&o.ol!=null&&o.cl!=null&&Math.abs(o.ol-o.cl)>0.01){const pts=x.market==='total'?(x.side==='over'?o.cl-o.ol:o.ol-o.cl):(o.ol-o.cl);return +(pts*(CLV_PER_PT[x.sp]||4)).toFixed(2);}
  if(amerOk(o.open)==null||amerOk(o.close)==null)return null;const v=(imp(amerOk(o.close))-imp(amerOk(o.open)))*100;return Math.abs(v)<0.05?0:+v.toFixed(2);}
/* a call's CLV: its own price against a line that moved after its lock, else the market's open → close */
function clvStampAll(){const V=get(VOICES_KEY,[])||[];let n=0,ch=0;const old=dayShift(today(),-4);
  V.forEach(x=>{if(!x||!x.graded||x.clvk===2||!CHARS[x.voice])return;let c=callClv(x),src='own';if(c==null){c=marketMove(x);src='mkt';}
    if(c!=null){x.clv=c;x.clvs=src;x.clvk=2;ch++;n++;}else if(String(x.date||'').slice(0,10)<old){x.clvk=2;ch++;}});   /* no read after 4 days: stop looking */
  if(ch)set(VOICES_KEY,V);return n;}
if(typeof gradeVoices==='function'&&typeof window!=='undefined'&&!window.__MIND_GV__){window.__MIND_GV__=1;const GV0=gradeVoices;
  let CLV_T=null;   /* off the render path: stamped a moment after grading, once */
  gradeVoices=function(){const n=GV0.apply(this,arguments);try{clearTimeout(CLV_T);CLV_T=setTimeout(()=>{try{const V=roGet(VOICES_KEY,[],5e3)||[];if(V.some(x=>x&&x.graded&&x.clvk!==2&&CHARS[x.voice]))clvStampAll();}catch(e){console.warn('clv stamp',e);}},2500);}catch(e){}return n;};}

/* ── §2 · STATUS ── */
const STATUS_KEY='d4.status',STATUS_FROM='2026-10-18',STATUS_WIN=28,STATUS_MIN=25;
Object.assign(BOOK_ENDS,{
  LEARNING:{ok:1,ico:'⚪',lab:'Learning — too soon to judge'},GREEN:{ok:1,ico:'🟢',lab:'Healthy'},YELLOW:{ok:1,ico:'🟡',lab:'Cold but healthy — variance'},
  ORANGE:{ok:1,ico:'🟠',lab:'Warning — losing past variance'},RED:{ok:1,ico:'🔴',lab:'Broken — losing, and the market agrees'},
  HEATER:{ok:1,ico:'🔥',lab:'Heater — the market agrees'},LUCKY:{ok:1,ico:'🍀',lab:'Lucky heater — the market disagrees'}});
const zTxt=z=>(z>=0?'+':'')+(+z).toFixed(1)+'σ';
bookDefine({id:'status',title:'Health — how each character is doing in each sport',start:'enough',
  pages:{
    enough:{q:'Has it made 25+ graded calls in the last 4 weeks?',to:['LEARNING','losing'],ask:c=>c.n<STATUS_MIN?['LEARNING',`${c.n} graded call${c.n===1?'':'s'} — too few to judge`]:['losing',`${c.n} graded calls`]},
    losing:{q:'Is it losing past normal variance?',to:['broken','cold','hot'],
      ask:c=>c.z<=-2?['broken',`${c.w}-${c.n-c.w}, ${zTxt(c.z)} against what its confidence promised (judged against its sport's pool)`]:c.z<=-1?['cold',`${c.w}-${c.n-c.w}, ${zTxt(c.z)} — cold`]:['hot',`${c.w}-${c.n-c.w}, ${zTxt(c.z)}`]},
    broken:{q:'Is the market moving against it too?',to:['RED','ORANGE','YELLOW'],
      ask:c=>c.cn>=20&&c.tclv<=-1.5&&c.z<=-2.5?['RED',`the market closed against it too (${clvTxt(c)}) — the protocol would sit it out here (watching only)`]
        :c.cn>=15&&c.tclv>=1?['YELLOW',`unlucky — the market closed its way (${clvTxt(c)}); this is variance`]
        :['ORANGE',c.cn>=15?`and the market isn't backing it (${clvTxt(c)})`:`and too few moved lines to clear it (${c.cn})`]},
    cold:{q:'Is its closing line value slipping?',to:['ORANGE','YELLOW'],ask:c=>c.cn>=15&&c.tclv<=-1.5?['ORANGE',`cold, and the market keeps closing against it (${clvTxt(c)}) — slipping`]:['YELLOW','cold but healthy — variance']},
    hot:{q:'Is it running hot?',to:['heater','GREEN'],ask:c=>c.z>=2?['heater',`${zTxt(c.z)} above its own promise`]:['GREEN','winning about what its confidence promised']},
    heater:{q:'Is the market backing the heater?',to:['HEATER','LUCKY'],ask:c=>c.cn>=15&&c.tclv<=-1?['LUCKY',`winning while the market closes against it (${clvTxt(c)}) — the bill is coming; nothing gets bigger`]:['HEATER','the market agrees — write down what\'s working']}},
  vars:{n:[10,40,120],w:[20],z:[-3,-2.2,-1.5,0,2.5],cn:[0,16,30],tclv:[-2,-1.2,0,1.5],clv:[0]}});
function clvTxt(c){return c.cn?`CLV ${c.clv>=0?'+':''}${(+c.clv).toFixed(1)} pts over ${c.cn} moved line${c.cn===1?'':'s'}`:'no moved lines yet';}
function statusRules(ctx,R){const e=R.end;if(ctx.n<STATUS_MIN&&e!=='LEARNING')return'judged with too few calls';if(ctx.n>=STATUS_MIN&&e==='LEARNING')return'kept learning with enough calls';
  if(e==='RED'&&!(ctx.z<=-2.5&&ctx.cn>=20&&ctx.tclv<=-1.5))return'benched without the market confirming it';
  if(e==='YELLOW'&&ctx.z<=-2&&!(ctx.cn>=15&&ctx.tclv>=1))return'called unlucky without the market backing it';
  if((e==='ORANGE'||e==='RED')&&ctx.z>-1)return'warned while not losing';if((e==='HEATER'||e==='LUCKY')&&ctx.z<2)return'called a heater without one';return null;}
/* days a sport's inputs were known broken (the flat-55 college sim, Sep 28 → Oct 16; one-sided NFL totals Oct 8-11),
   plus any day the immune system held a sport back — never held against a character */
const STATUS_SKIP={ncaaf:[['2026-09-28','2026-10-16',null]],nfl:[['2026-10-08','2026-10-11','total']]};
function statusSkip(x,dd,QJ){const L=STATUS_SKIP[x.sp]||[];if(L.some(([a,b,m])=>dd>=a&&dd<=b&&(!m||m===x.market)))return true;const q=QJ[dd]&&QJ[dd][x.sp];return!!(q&&(q.all||(q.markets||{})[x.market]));}
function statusStats(V,d){const from=dayShift(d,-STATUS_WIN);const S={},POOL={};let QJ={};try{QJ=bookQuarAll()||{};}catch(e){}
  (V||[]).forEach(x=>{if(!x||!CHARS[x.voice]||!x.graded||x.hit==null||x.push||x.price==null)return;const dd=String(x.date||'').slice(0,10);if(dd<from||dd>=d||x.pre)return;if(statusSkip(x,dd,QJ))return;
    try{if(confPre(x))return;}catch(e){}const p=confOf(x);if(p==null||!(p>0&&p<1))return;
    const k=x.voice+'|'+x.sp;const o=S[k]||(S[k]={v:x.voice,sp:x.sp,n:0,w:0,e:0,var:0,u:0,cn:0,cs:0,cs2:0,mn:0,ms:0,lanes:{}});const pk=x.sp;const Pq=POOL[pk]||(POOL[pk]={w:0,e:0});Pq.e+=p;if(x.hit)Pq.w++;o.n++;if(x.hit)o.w++;o.e+=p;o.var+=p*(1-p);o.u+=+x.units||0;
    if(x.clv!=null&&isFinite(x.clv)){if(x.clvs==='own'){o.cn++;o.cs+=+x.clv;o.cs2+=x.clv*x.clv;}else{o.mn++;o.ms+=+x.clv;}}
    try{const lk=laneKey(x.sp,x.market,x.side,x.price,x.line);if(lk){const L=o.lanes[lk]||(o.lanes[lk]={w:0,n:0,u:0});L.n++;if(x.hit)L.w++;L.u+=+x.units||0;}}catch(e){}});
  /* judged against the pool: k = what every character in the sport won over what their confidence promised */
  Object.values(S).forEach(o=>{const Pq=POOL[o.sp];o.k=Pq&&Pq.e>0?Math.max(0.5,Math.min(1.5,Pq.w/Pq.e)):1;o.zr=o.var>0?(o.w-o.e)/Math.sqrt(o.var):0;o.z=o.var>0?(o.w-o.k*o.e)/Math.sqrt(o.var):0;o.mclv=o.mn?o.ms/o.mn:null;o.clv=o.cn?o.cs/o.cn:null;const sd=o.cn>1?Math.max(1,Math.sqrt(Math.max(0,(o.cs2-o.cs*o.cs/o.cn)/(o.cn-1)))):null;o.tclv=o.cn>1&&sd?o.clv/(sd/Math.sqrt(o.cn)):0;});   /* a 1-point floor on the spread, so a few identical moves can't look like certainty */
  S.__pool=POOL;return S;}
/* the day's statuses: re-read each minute until the day freezes, then fixed for good (date-keyed —
   every past day keeps its own; a day with no snapshot never gets one after the fact) */
let STATUS_MEMO=null;
function statusSnap(d,force){d=d||today();if(!force&&STATUS_MEMO&&STATUS_MEMO.d===d&&Date.now()-STATUS_MEMO.ts<60e3)return STATUS_MEMO.S;
  const A=get(STATUS_KEY,{})||{};let S=A[d]||null;let frozen=false;try{frozen=deskFrozen(d);}catch(e){}
  if(S&&S.prov&&frozen&&d===today()){S.prov=false;S.final=Date.now();set(STATUS_KEY,A);statusJournal(S,A[dayShift(d,-1)]);}
  else if(d===today()&&(force||!S||(S.prov&&!frozen))){const V=roGet(VOICES_KEY,[],30e3)||[];const st=statusStats(V,d);S={ts:Date.now(),by:{},prov:!frozen};const prev=A[dayShift(d,-1)];
    const pool=st.__pool||{};delete st.__pool;S.pool={};Object.entries(pool).forEach(([sp,q])=>{S.pool[sp]={w:q.w,e:+q.e.toFixed(1)};});
    Object.values(st).forEach(o=>{const R=bookWalkSync(BOOKS.status,{n:o.n,w:o.w,z:o.z,cn:o.cn,clv:o.clv,tclv:o.tclv},null);
      const best=Object.entries(o.lanes).filter(([k,L])=>L.n>=6&&L.u>0).sort((a,b)=>b[1].u-a[1].u).slice(0,2).map(([k,L])=>`${laneName(k)} ${L.w}-${L.n-L.w} (${L.u>=0?'+':''}${L.u.toFixed(1)}u)`);
      S.by[o.v+'|'+o.sp]={st:R.end,why:R.why,n:o.n,w:o.w,z:+o.z.toFixed(2),zr:+o.zr.toFixed(2),k:+o.k.toFixed(3),cn:o.cn,clv:o.clv==null?null:+o.clv.toFixed(2),tclv:+(+o.tclv).toFixed(2),mn:o.mn,mclv:o.mclv==null?null:+o.mclv.toFixed(2),u:+o.u.toFixed(2),best,path:R.path.map(s=>s.p+'>'+s.to).join(' ')};});
    if(!S.prov)S.final=Date.now();const old=A[d];const same=old&&old.prov===S.prov&&JSON.stringify(old.by)===JSON.stringify(S.by);
    if(same)S=old;else{A[d]=S;Object.keys(A).sort().slice(0,-60).forEach(k=>delete A[k]);set(STATUS_KEY,A);if(!S.prov)statusJournal(S,prev);}}
  STATUS_MEMO={d,ts:Date.now(),S};try{STATUS_DAY.delete(d);}catch(e){}return S;}
/* once the day's health is final, every change from yesterday goes in the journal */
function statusJournal(S,prev){try{Object.entries(S.by||{}).forEach(([k,o])=>{const p=prev&&prev.by&&prev.by[k];if(p&&p.st===o.st)return;if(!p&&(o.st==='LEARNING'||o.st==='GREEN'))return;const[v,sp]=k.split('|');
    journalAdd({kind:'status',sig:'status-'+o.st,sp,v,sev:o.st==='RED'?'crit':o.st==='ORANGE'?'warn':'info',title:`${BOOK_ENDS[o.st].ico} ${charName(v)}, ${spList([sp])}: ${BOOK_ENDS[o.st].lab}`,
      what:`${o.why}${o.st==='HEATER'&&(o.best||[]).length?' · working: '+o.best.join('; '):''}${p?` (was ${BOOK_ENDS[p.st]?BOOK_ENDS[p.st].ico+' '+BOOK_ENDS[p.st].lab.split(' —')[0]:p.st})`:''}`});});}catch(e){}}
/* fast: one lookup per day, refreshed each minute (it runs inside every official check) */
const STATUS_DAY=new Map();let STATUS_DAY_TS=0;
function statusOf(v,sp,d){try{d=String(d||'').slice(0,10)||today();if(d<STATUS_FROM)return null;if(Date.now()-STATUS_DAY_TS>60e3){STATUS_DAY.clear();STATUS_DAY_TS=Date.now();}
  let by=STATUS_DAY.get(d);if(by===undefined){const S=d===today()?statusSnap(d):((get(STATUS_KEY,{})||{})[d]||null);by=(S&&S.by)||null;STATUS_DAY.set(d,by);}
  return by&&by[v+'|'+sp]?by[v+'|'+sp].st:null;}catch(e){return null;}}
/* WATCHING ONLY (v2.44): nothing here changes what's official or what's staked. What the protocol WOULD
   do (🔴 sit out, 🟠 a higher bar and half stakes) is shown on the board and kept with each day's
   snapshot, so its own shadow record can show — later, on games it never saw — whether benching helps. */
/* the autopilot reads the day's health right after the confidence meter */
try{if(typeof AP_STEPS!=='undefined'&&!AP_STEPS.some(s=>s[0]==='status')){const i=AP_STEPS.findIndex(s=>s[0]==='conf');
  AP_STEPS.splice(i>=0?i+1:AP_STEPS.length,0,['status','Health check','Each character × sport, from its last 4 weeks: winning what it promised (against its sport\'s pool)? beating the close? Watching only — nothing is benched or trimmed.',()=>{clvStampAll();return Object.keys((statusSnap(today())||{}).by||{}).length;}]);}}catch(e){}

/* ── what you see ── */
function statusChip(v,sp,d){const s=statusOf(v,sp,d||today());if(!s)return'';const E=BOOK_ENDS[s]||{};const o=((statusSnap(d||today())||{}).by||{})[v+'|'+sp]||{};
  return`<span class="st-chip" title="${txtEsc(E.lab+' — '+(o.why||''))}">${E.ico}</span>`;}
function statusBoardHtml(){const S=statusSnap(today());const by=(S&&S.by)||{};const sps=['mlb','nfl','ncaaf','nhl','nba','ncaab'].filter(sp=>Object.keys(by).some(k=>k.endsWith('|'+sp)));
  if(!sps.length)return'<div class="tkt"><h3 style="margin:0">🫀 Health</h3><div class="sub" style="font-size:10.5px">Fills in once characters have graded calls.</div></div>';
  const cell=(v,sp)=>{const o=by[v+'|'+sp];if(!o)return'<td style="color:var(--mute)">—</td>';const E=BOOK_ENDS[o.st]||{};
    return`<td title="${txtEsc(o.why||'')}"><span style="font-size:14px">${E.ico||''}</span><div class="mono" style="font-size:8.5px;color:var(--mute)">${o.w}-${o.n-o.w}${o.cn?` · ${o.clv>=0?'+':''}${(+o.clv).toFixed(1)}`:''}</div></td>`;};
  const rows=CHAR_ORDER.filter(v=>sps.some(sp=>by[v+'|'+sp])).map(v=>`<tr><td style="text-align:left;white-space:nowrap"><b style="color:${(CHARS[v]||{}).color}">${txtEsc(charName(v).replace(/^The /,''))}</b></td>${sps.map(sp=>cell(v,sp)).join('')}</tr>`).join('');
  const notes=Object.entries(by).filter(([k,o])=>['RED','ORANGE','HEATER','LUCKY'].includes(o.st)).map(([k,o])=>{const[v,sp]=k.split('|');const E=BOOK_ENDS[o.st];
    return`<div class="sub" style="font-size:10.5px;margin-top:3px">${E.ico} <b>${txtEsc(charName(v))}, ${txtEsc(spList([sp]))}</b> — ${txtEsc(o.why)}${o.st==='HEATER'&&o.best&&o.best.length?` · what's working: ${txtEsc(o.best.join('; '))}`:''}</div>`;}).join('');
  const meter=Object.entries((S&&S.pool)||{}).filter(([sp,q])=>q.e>=40&&Math.abs(q.w-q.e)/Math.sqrt(q.e*0.25)>=2).map(([sp,q])=>`<div class="sub" style="font-size:10.5px;margin-top:3px">🎚 <b>${txtEsc(spList([sp]))}</b>: every character together won ${q.w} of the ${Math.round(q.e)} its confidence promised — that's the confidence meter's miss, so each character is judged against that pool.</div>`).join('');
  return`<div class="tkt"><h3 style="margin:0 0 2px">🫀 Health — every character, every sport</h3><div class="sub" style="font-size:10.5px">Last 4 weeks: did it win what its confidence promised (against its sport's pool), and did the market close its way after its own lock? Watching only — nothing is benched or trimmed until benching proves itself in the shadows.</div>${meter}
    <div style="overflow-x:auto"><table class="rec-tbl"><tr><td></td>${sps.map(sp=>`<td>${txtEsc(spList([sp]))}</td>`).join('')}</tr>${rows}</table></div>
    <div class="mono" style="font-size:9.5px;margin-top:4px">${['LEARNING','GREEN','YELLOW','ORANGE','RED','HEATER','LUCKY'].map(k=>`${BOOK_ENDS[k].ico} ${BOOK_ENDS[k].lab.split(' —')[0]}`).join(' · ')}</div>${notes}</div>`;}
/* the Book view gets the health board; each Ideology card its own health line */
if(typeof bookViewHtml==='function'&&typeof window!=='undefined'&&!window.__MIND_BV__){window.__MIND_BV__=1;const BV0=bookViewHtml;
  bookViewHtml=function(){const h=BV0();try{const i=h.indexOf('<div class="tkt"><h3 style="margin:0 0 4px">Today\'s story');return i>=0?h.slice(0,i)+statusBoardHtml()+h.slice(i):h+statusBoardHtml();}catch(e){return h;}};}
if(typeof ideoCardHtml==='function'&&typeof window!=='undefined'&&!window.__MIND_IC__){window.__MIND_IC__=1;const IC0=ideoCardHtml;
  ideoCardHtml=function(v){const h=IC0(v);try{const S=statusSnap(today());const L=Object.entries((S&&S.by)||{}).filter(([k])=>k.startsWith(v+'|')).map(([k,o])=>`${(BOOK_ENDS[o.st]||{}).ico||''} ${txtEsc(spList([k.split('|')[1]]))}`);
      if(!L.length)return h;return h.replace('<div class="ideo-body">',`<div class="ideo-body"><div class="mono" style="font-size:10.5px;margin-bottom:4px">Health: ${L.join(' · ')}</div>`);}catch(e){return h;}};}
const MIND_CSS=`.st-chip{font-size:11px;margin-left:3px;vertical-align:1px}`;
if(typeof window!=='undefined'&&!window.__MIND_BOOT__){window.__MIND_BOOT__=1;window.addEventListener('load',()=>{try{if(!document.getElementById('mindCss')){const st=document.createElement('style');st.id='mindCss';st.textContent=MIND_CSS;document.head.appendChild(st);}}catch(e){}});}
