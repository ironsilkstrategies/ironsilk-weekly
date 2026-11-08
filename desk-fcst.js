/* ═══ THE FORECAST (v2.92.0) ═══════════════════════════════════════════════════════════════════════════════════════════
   Loaded on every sport page after desk-hist.js.

   Nov 8, 1:27 AM: "bring back the forecast feature… a sports pick forecast that would show what was working and what wasn't —
   it used cloudy and sunny emojis while giving the statistics."

   Every bet type in every sport — moneyline favorites and dogs, spread favorites and dogs, overs, unders, and each player-prop
   stat — read over the last 7 days against the last 30: the record, the units at the real prices, and how far the hit rate ran
   above or below what the prices said it should. Each pick is counted once however many characters made it.
     ☀️ working (+12% a pick)   🌤 warm (+4%)   ⛅ even   🌥 cooling (−4%)   🌧 not working (−12%)   ⛈ broken (−25% on 20+ picks)
     💤 too few picks to say
   Plus who's hot and cold among the characters this week, the league's own weather, and a one-line outlook: lean into,
   stay away from. */

const FC_LANES={ml:{fav:'ML favorites',dog:'ML dogs',heavy:'Heavy ML (-500+)'},spread:{fav:'Spread favorites',dog:'Spread dogs'},total:{over:'Overs',under:'Unders'}};
const FC_SP={nfl:'🏈 NFL',ncaaf:'🏟 CFB',nhl:'🏒 NHL',nba:'🏀 NBA',ncaab:'🏀 CBB',mlb:'⚾ MLB'};
function fcImp(pr){pr=+pr;if(!isFinite(pr)||Math.abs(pr)<100)return 0.524;return pr>0?100/(pr+100):(-pr)/((-pr)+100);}
function fcDec(pr){pr=+pr;if(!isFinite(pr)||Math.abs(pr)<100)return 1.91;return pr>0?1+pr/100:1+100/(-pr);}
/* the weather is the money: units per pick at the real prices (a -2000 favorite that keeps winning isn't "working" if it
   barely pays) — ☀️ +12% a pick or better · 🌤 +4 · ⛅ even · 🌥 −4 · 🌧 −12 · ⛈ −25% on 20+ picks */
function fcIcon(o){if(!o||o.n<8)return['💤','too few picks'];const r=o.u7/o.n;
  if(r<=-0.25&&o.n>=20)return['⛈','broken'];if(r>=0.12)return['☀️','working'];if(r>=0.04)return['🌤','warm'];if(r>-0.04)return['⛅','even'];if(r>-0.12)return['🌥','cooling'];return['🌧','not working'];}
let FC_C=null;
function fcData(){const V=roGet(VOICES_KEY,[],30e3)||[];const P=roGet(typeof CPROP_KEY!=='undefined'?CPROP_KEY:'d4.charprops',[],30e3)||[];
  const sig=(typeof ledgerSig==='function'?ledgerSig(V):V.length)+'|'+P.length+'|'+today();if(FC_C&&FC_C.sig===sig)return FC_C.v;
  const d7=dayShift(today(),-7),d30=dayShift(today(),-30);const lanes={},chars={};
  const add=(k,lab,sp,d,hit,pr)=>{const L=lanes[k]||(lanes[k]={k,lab,sp,w7:0,l7:0,u7:0,q7:0,w30:0,l30:0,u30:0,q30:0});const q=fcImp(pr),u=hit?fcDec(pr)-1:-1;
    if(d>=d30){hit?L.w30++:L.l30++;L.u30+=u;L.q30+=q;}if(d>=d7){hit?L.w7++:L.l7++;L.u7+=u;L.q7+=q;}};
  /* game lines: each pick once (sport · game · day · market · side), whoever made it */
  const seen=new Set();V.forEach(x=>{if(!x||!x.graded||x.hit==null||x.push||!FC_LANES[x.market]||!CHARS[x.voice])return;const d=String(x.date).slice(0,10);if(d<d30)return;
    if(x.market==='ml'&&!(Math.abs(+x.price)>=100))return;   /* a moneyline with no real price can't say fav or dog, or pay */
    const role=x.market==='total'?(/under/i.test(x.side)?'under':'over'):x.market==='spread'?(x.line!=null&&+x.line<0?'fav':x.line!=null&&+x.line>0?'dog':(+x.price<0?'fav':'dog')):(+x.price<=-500?'heavy':+x.price<0?'fav':'dog');
    /* the characters' own week */
    if(d>=d7&&role!=='heavy'&&!(typeof META_VOICES!=='undefined'&&META_VOICES.has(x.voice))){const C=chars[x.voice]||(chars[x.voice]={v:x.voice,w:0,l:0,u:0});x.hit?C.w++:C.l++;C.u+=x.hit?fcDec(x.price)-1:-1;}
    const k=[x.sp,x.game,d,x.market,x.side,x.line==null?'':x.line].join('|');if(seen.has(k))return;seen.add(k);
    add(x.sp+'|'+x.market+'|'+role,FC_LANES[x.market][role],x.sp,d,!!x.hit,x.price);});
  /* player props: each player-stat-line once */
  const ps=new Set();P.forEach(x=>{if(!x||x.hit==null||!x.player)return;const d=String(x.d).slice(0,10);if(d<d30)return;const k=[x.sp,x.d,x.player,x.k,x.thr].join('|');if(ps.has(k))return;ps.add(k);
    add(x.sp+'|prop|'+x.k,`${(typeof CPROP_LAB!=='undefined'&&CPROP_LAB[x.k])||x.k} props`,x.sp,d,!!x.hit,x.price!=null?x.price:(x.p?-Math.round(100*x.p/(1-x.p)):-150));});
  const L=Object.values(lanes).map(o=>{const n7=o.w7+o.l7,n30=o.w30+o.l30;return{...o,n:n7,n30,edge:n7?(o.w7-o.q7)/n7:0,edge30:n30?(o.w30-o.q30)/n30:0};});
  const v={lanes:L,chars:Object.values(chars).filter(c=>c.w+c.l>=10)};FC_C={sig,v};return v;}
function fcRow(o){const [ic,lab]=fcIcon(o);const pc=n=>n?(n*100).toFixed(0)+'%':'—';const tr=o.n>=8&&o.n30>=15?(o.edge-o.edge30>=0.05?' ↑':o.edge-o.edge30<=-0.05?' ↓':''):'';
  return`<div class="mono" style="display:flex;gap:6px;align-items:baseline;font-size:10.5px;padding:3px 0;border-bottom:1px solid var(--rule)"><span style="font-size:15px;width:22px">${ic}</span>
    <span style="flex:1"><b style="color:var(--chalk)">${txtEsc(o.lab)}</b> <span style="color:var(--mute)">${lab}${tr}</span><br>
    <span style="color:var(--mute)">7 days ${o.w7}-${o.l7}${o.n?` (${pc(o.w7/o.n)})`:''} · <b style="color:${o.u7>=0?'var(--win)':'var(--rust)'}">${o.u7>=0?'+':''}${o.u7.toFixed(1)}u</b>${o.n?` · ${o.edge>=0?'+':''}${(o.edge*100).toFixed(0)} vs the prices`:''} · 30 days ${o.w30}-${o.l30} ${o.u30>=0?'+':''}${o.u30.toFixed(1)}u</span></span></div>`;}
function fcHtml(){let D;try{D=fcData();}catch(e){return'';}if(!D.lanes.length)return'';
  const bySp={};D.lanes.forEach(o=>{(bySp[o.sp]=bySp[o.sp]||[]).push(o);});
  const ord=['nfl','ncaaf','nba','ncaab','nhl','mlb'].filter(s=>bySp[s]);
  const roi=o=>o.u7/o.n;const ranked=D.lanes.filter(o=>o.n>=10);const hot=ranked.filter(o=>roi(o)>=0.04).sort((a,b)=>roi(b)-roi(a)).slice(0,3),cold=ranked.filter(o=>roi(o)<=-0.04).sort((a,b)=>roi(a)-roi(b)).slice(0,3);
  const nm=o=>`${(FC_SP[o.sp]||o.sp).split(' ')[1]} ${o.lab.toLowerCase()} ${fcIcon(o)[0]}`;
  const outlook=`<div class="sub" style="font-size:10.5px;margin:4px 0 6px">${hot.length?`<b style="color:var(--win)">Lean into:</b> ${hot.map(nm).join(' · ')}`:''}${hot.length&&cold.length?'<br>':''}${cold.length?`<b style="color:var(--rust)">Stay away:</b> ${cold.map(nm).join(' · ')}`:''}${!hot.length&&!cold.length?'Nothing running hot or cold enough to lean on this week.':''}</div>`;
  const C=D.chars.slice().sort((a,b)=>b.u-a.u);const ch=c=>`${txtEsc((CHARS[c.v]||{}).chip||c.v)} ${c.w}-${c.l} <b style="color:${c.u>=0?'var(--win)':'var(--rust)'}">${c.u>=0?'+':''}${c.u.toFixed(1)}u</b>`;
  const chH=C.length?`<div class="mono" style="font-size:10px;margin:2px 0 6px">☀️ hot this week: ${C.slice(0,3).filter(c=>c.u>0).map(ch).join(' · ')||'—'}<br>🌧 cold this week: ${C.slice(-3).reverse().filter(c=>c.u<0).map(ch).join(' · ')||'—'}</div>`:'';
  /* the league's own weather (desk-world.js): only the shifts past luck are named */
  let world='';try{if(typeof worldRun==='function'){const R=worldRun();const out=[];Object.entries(R.day||{}).forEach(([sp,M])=>Object.entries(M||{}).forEach(([m,o])=>{if(!o||!/WATCH|CHANGED/.test(o.st||''))return;
      out.push(`${(FC_SP[sp]||sp).split(' ')[1]} ${(BOOK_ENDS[o.st]||{}).ico||''} ${txtEsc((WORLD_MET[m]||{}).lab||m)} ${o.pr!=null?Math.round(o.pr*100)+'%':''} (norm ${Math.round(o.pb*100)}%)`);}));
    if(Object.keys(R.day||{}).length)world=`<div class="mono" style="font-size:9.5px;color:var(--mute);margin-bottom:6px">The league's weather: ${out.length?out.join(' · '):'🌤 steady in every sport — nothing past luck'}</div>`;}}catch(e){}
  const sec=sp=>{const L=bySp[sp].slice().sort((a,b)=>(b.n>=8)-(a.n>=8)||(b.n?b.u7/b.n:0)-(a.n?a.u7/a.n:0));return`<details style="margin-top:4px" ${sp===ord[0]?'open':''}><summary class="mono" style="font-size:11px"><b>${FC_SP[sp]||sp}</b> ${L.filter(o=>o.n>=8).map(o=>fcIcon(o)[0]).join('')}</summary>${L.map(fcRow).join('')}</details>`;};
  return`<div class="tkt fc-card" style="margin-bottom:8px;border-left:3px solid #7FDBFF"><h3 style="margin:0 0 2px">🌦 The Forecast</h3>
    <div class="sub mono" style="font-size:9.5px">What's working and what isn't — every bet type, last 7 days vs 30, each pick counted once. ☀️ working · 🌤 warm · ⛅ even · 🌥 cooling · 🌧 not working · ⛈ broken</div>
    ${outlook}${chH}${world}${ord.map(sec).join('')}</div>`;}
if(typeof renderToday==='function'&&typeof window!=='undefined'&&!window.__FC_TODAY__){window.__FC_TODAY__=1;const R0=renderToday;
  renderToday=function(noSnap){R0(noSnap);try{const el=document.getElementById('todayBody');if(el&&!el.querySelector('.fc-card'))el.insertAdjacentHTML('afterbegin',fcHtml());}catch(e){console.warn('forecast',e);}};}
