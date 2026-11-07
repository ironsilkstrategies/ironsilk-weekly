/* v2.85.0 · six features brought back from the v2.81.4 clean-out, rebuilt for the
   five-sport desk:
   1. Exposure check + swap: one game riding on too many open tickets, and the
      best different market on that same game to trade a leg into.
   2. Source conflict: an outside site whose pick and whose own trends disagree.
   3. Context gauges: division / conference / interleague / park / altitude / roof
      tags for every sport, each with its own graded record (game cards + Edge Desk).
   4. Crowd favorites: the picks most of the characters land on.
   5. Loss post-mortems: why each losing ticket lost, rolled up for the board.
   6. Missions: a weekly boss your cashed tickets fight, and trophies.
   Everything renders in Today → 🛡 Edge Desk; gauges also ride on every game card. */
(function(){
const W=typeof window!=='undefined'?window:{};
const E=s=>typeof txtEsc==='function'?txtEsc(String(s==null?'':s)):String(s==null?'':s);
const SPS=['mlb','nfl','ncaaf','nhl','nba','ncaab'];
const SPL=s=>(typeof SP_LAB!=='undefined'&&SP_LAB[s])||String(s).toUpperCase();
const todayCalls=()=>{try{const V=roGet(VOICES_KEY,[],30e3)||[];const d=today();return V.filter(x=>x&&String(x.date||'').slice(0,10)===d);}catch(e){return[];}};
const pickTxt=x=>x.pick||[x.side==='over'?'Over':x.side==='under'?'Under':((x.game||'').split('@')[x.side==='home'?1:0]||''),
  x.market==='spread'&&x.line!=null?(x.line>0?'+':'')+x.line:x.market==='total'&&x.line!=null?x.line:x.market==='ml'?'ML':''].filter(Boolean).join(' ');
const famOf=m=>{m=String(m||'').toLowerCase();if(/total|over|under/.test(m))return'total';if(/spread|rl|run ?line|puck|ats/.test(m))return'spread';if(/prop/.test(m))return'prop';return'side';};

/* ── 1 · exposure + swap ─────────────────────────────────────────────── */
const EXPO_AT=3;
function revExposure(){let rows=[];try{rows=pendingLegExposure();}catch(e){}
  const by={};rows.forEach(r=>{const b=by[r.game]||(by[r.game]={game:r.game,t:new Set(),legs:[]});b.t.add(r.ticketId);b.legs.push(r);});
  const games=Object.values(by).map(b=>({game:b.game,tickets:b.t.size,legs:b.legs})).sort((a,b)=>b.tickets-a.tickets);
  const dupes={};rows.forEach(r=>{const k=r.pick+'|'+r.game;(dupes[k]=dupes[k]||{pick:r.pick,game:r.game,t:new Set()}).t.add(r.ticketId);});
  return{games,flagged:games.filter(g=>g.tickets>=EXPO_AT),dupes:Object.values(dupes).filter(d=>d.t.size>1).sort((a,b)=>b.t.size-a.t.size),open:new Set(rows.map(r=>r.ticketId)).size};}
function revSwap(game,legs){const used=new Set((legs||[]).map(l=>famOf(l.kind)));const C=todayCalls().filter(x=>x.game===game&&!x.graded&&(x.simP>0||x.pUsed>0));
  const alt=C.filter(x=>!used.has(famOf(x.market))).sort((a,b)=>(b.pUsed||b.simP)-(a.pUsed||a.simP));
  if(alt.length)return{pick:pickTxt(alt[0]),p:alt[0].pUsed||alt[0].simP,price:alt[0].price,why:'a different market on the same game'};
  try{const P=fullPresetPool().filter(l=>l.game===game&&!used.has(famOf(l.kind))).sort((a,b)=>b.p-a.p);if(P[0])return{pick:P[0].pick,p:P[0].p,price:P[0].price,why:'a different market on the same game'};}catch(e){}
  return null;}
function revExposureHtml(){const X=revExposure();if(!X.open)return`<div class="tkt"><h3>🧯 Exposure check</h3><div class="sub">No open tickets — nothing riding on any one game.</div></div>`;
  const top=X.games.slice(0,6).map(g=>{const hot=g.tickets>=EXPO_AT;const sw=hot?revSwap(g.game,g.legs):null;const w=Math.min(100,g.tickets/Math.max(1,X.open)*100);
    return`<div style="padding:6px 0;border-bottom:1px solid var(--rule)"><div style="display:flex;justify-content:space-between;font-size:12px"><b>${E(g.game)}</b><span class="mono" style="color:${hot?'var(--rust)':'var(--mute)'}">${g.tickets} of ${X.open} tickets</span></div>
      <div style="height:6px;border-radius:3px;background:var(--rule);margin:4px 0"><div style="height:6px;border-radius:3px;width:${w}%;background:${hot?'var(--rust)':'var(--gold)'}"></div></div>
      ${hot?`<div class="sub" style="font-size:10.5px">One final score decides ${g.tickets} tickets.${sw?` Swap one leg to <b style="color:var(--win)">${E(sw.pick)}</b>${sw.price!=null?' ('+(sw.price>0?'+':'')+sw.price+')':''} · ${Math.round(sw.p*100)}% — ${sw.why}, so a single miss can't sink them all.`:' No other priced market on this game yet.'}</div>`:''}</div>`;}).join('');
  const d=X.dupes.slice(0,5).map(x=>`<div class="mono" style="font-size:10.5px">${E(x.pick)} · ${E(x.game)} — on <b>${x.t.size}</b> tickets</div>`).join('');
  return`<div class="tkt"><h3>🧯 Exposure check</h3><div class="sub" style="font-size:10px">Games carried by the most open tickets. ${EXPO_AT}+ tickets on one game gets a swap suggestion.</div>${top}${d?`<div class="mktlab" style="margin-top:8px">Same bet on several tickets</div>${d}`:''}</div>`;}

/* ── 2 · source conflict ─────────────────────────────────────────────── */
function revSourceConflicts(g){const gl=g.away.abbr+'@'+g.home.abbr;const d=today();let picks=[],trends=[];
  try{picks=(getExt()[d]||[]).filter(x=>x.game===gl);trends=((get(LS.exttrends,{})||{})[d]||[]).filter(x=>x.game===gl);}catch(e){return[];}
  const by={};picks.forEach(p=>{(by[p.src]=by[p.src]||{p:[],t:[]}).p.push(p);});
  trends.forEach(t=>{const k=Object.keys(by).find(s=>t.src&&String(t.src).toLowerCase().includes(String(s).toLowerCase().split(' ')[0]))||t.src;(by[k]=by[k]||{p:[],t:[]}).t.push(t);});
  const out=[];Object.entries(by).forEach(([src,b])=>{b.p.forEach(pk=>{const mk=pk.market==='total'?['over','under']:[g.away.abbr,g.home.abbr];
    const T=b.t.filter(t=>mk.includes(t.implies));if(T.length<2)return;const want=pk.market==='total'?pk.side:(pk.side==='home'?g.home.abbr:pk.side==='away'?g.away.abbr:pk.team);
    const agree=T.filter(t=>t.implies===want).length,against=T.length-agree;if(against>agree)out.push({src,pick:pk.pick||want,against,agree});});});
  return out;}
function revAllConflicts(){const out=[];SPS.forEach(sp=>{let G=[];try{G=sportGames(sp)||[];}catch(e){}G.forEach(g=>{try{revSourceConflicts(g).forEach(c=>out.push({sp,game:g.away.abbr+'@'+g.home.abbr,...c}));}catch(e){}});});return out;}

/* ── 3 · context gauges ─────────────────────────────────────────────── */
function gauge(rate,model,n,label,sub){const r=Math.max(0,Math.min(1,rate==null?0.5:rate));const ang=Math.PI*(1-r),cx=40,cy=38,R=30;
  const x=cx+R*Math.cos(ang),y=cy-R*Math.sin(ang);const col=n<10?'#7d7a72':r>=(model||0.5)+0.03?'#3DDC84':r<=(model||0.5)-0.03?'#ff5a5a':'#f5b301';
  const mA=Math.PI*(1-Math.max(0,Math.min(1,model||0.5))),mx=cx+(R+4)*Math.cos(mA),my=cy-(R+4)*Math.sin(mA),mx2=cx+(R-5)*Math.cos(mA),my2=cy-(R-5)*Math.sin(mA);
  return`<div style="display:inline-block;width:92px;margin:3px;text-align:center;vertical-align:top"><svg viewBox="0 0 80 46" width="80" height="46"><path d="M10 38A30 30 0 0 1 70 38" fill="none" stroke="#2c2a24" stroke-width="7" stroke-linecap="round"/>
    ${n?`<path d="M10 38A30 30 0 0 ${r>0.5?1:0} ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round"/>`:''}
    ${model!=null&&n?`<line x1="${mx.toFixed(1)}" y1="${my.toFixed(1)}" x2="${mx2.toFixed(1)}" y2="${my2.toFixed(1)}" stroke="#fff" stroke-width="1.5"/>`:''}
    <text x="40" y="37" text-anchor="middle" font-size="12" font-weight="800" fill="${col}">${n?Math.round(r*100)+'%':'—'}</text></svg>
    <div style="font-size:9.5px;font-weight:700;line-height:1.15">${E(label)}</div><div class="mono" style="font-size:8.5px;color:var(--mute)">${E(sub)}</div></div>`;}
const SHORT={divgame:'Division',confgame:'Conference',nonconf:'Non-conf',interleague:'Interleague',hitterpark:'Hitter park',pitcherpark:'Pitcher park',roofpark:'Roof',altitude:'Altitude',dome:'Dome',wind15:'Wind 15+',cold32:'Freezing',h2hedge:'H2H edge',h2hfade:'H2H fade'};
function ctxTagsFor(sp,g){let f=[];try{f=factorsFor(sp,g,{});}catch(e){}return f.filter(k=>SHORT[k]);}
function ctxGaugesHtml(sp,g){const tags=ctxTagsFor(sp,g);let crowd=null,conf=[];try{crowd=revCrowd().find(c=>c.game===g.away.abbr+'@'+g.home.abbr);}catch(e){}try{conf=revSourceConflicts(g);}catch(e){}
  if(!tags.length&&!crowd&&!conf.length)return'';let T={};try{T=factorTable(sp);}catch(e){}
  const gs=tags.map(k=>{const o=T[k]||{n:0};return gauge(o.rate,o.pred,o.n,SHORT[k],o.n?`${o.w}-${o.n-o.w} · ${o.adj?'proven':o.n<30?'learning':'no edge'}`:'new');}).join('');
  return`<div class="tkt" style="border-left:3px solid var(--gold);padding:8px 10px"><div style="font-family:'IBM Plex Mono';font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)">Matchup context · how picks do in this spot</div>
    <div>${gs}</div>${crowd?`<div class="mono" style="font-size:10.5px;margin-top:4px">👥 Crowd favorite: <b>${E(crowd.pick)}</b> — ${crowd.n} characters on it</div>`:''}
    ${conf.map(c=>`<div class="mono" style="font-size:10.5px;color:var(--rust);margin-top:3px">⚠ ${E(c.src)} picks ${E(c.pick)} but ${c.against} of its own trends point the other way</div>`).join('')}
    <div class="sub" style="font-size:9px">Gauge = how the engine's picks have hit in this situation; the white tick is what it expected. Proven situations nudge pick priority (never more than 4 pts).</div></div>`;}
function ctxBoardHtml(){const rows=SPS.map(sp=>{let T={};try{T=factorTable(sp);}catch(e){}const ks=Object.keys(SHORT).filter(k=>T[k]&&T[k].n);if(!ks.length)return'';
    return`<div class="mktlab" style="margin-top:6px">${SPL(sp)}</div><div>${ks.sort((a,b)=>T[b].n-T[a].n).map(k=>{const o=T[k];return gauge(o.rate,o.pred,o.n,SHORT[k],`${o.w}-${o.n-o.w} · ${o.adj?(o.adj>0?'+':'')+(o.adj*100).toFixed(1)+' pts':o.n<30?'needs '+(30-o.n):'no edge'}`);}).join('')}</div>`;}).join('');
  return`<div class="tkt"><h3>🧭 Situations board</h3><div class="sub" style="font-size:10px">Every sport, every matchup situation: division, conference, interleague, ballpark, altitude, roof, weather and head-to-head. Each keeps its own record. Once a situation is proven (30+ graded, statistically real) it moves pick priority.</div>${rows||'<div class="sub">Records fill in as tagged picks are graded.</div>'}</div>`;}

/* ── 4 · crowd favorites ─────────────────────────────────────────────── */
let CROWD_C=null,CROWD_T=0;
function revCrowd(){if(CROWD_C&&Date.now()-CROWD_T<30e3)return CROWD_C;const by={};
  todayCalls().forEach(x=>{if(!x.game||x.graded)return;const k=x.game+'|'+x.market+'|'+x.side;const b=by[k]||(by[k]={game:x.game,sp:x.sp,pick:pickTxt(x),v:new Set()});b.v.add(x.voice);});
  const out=Object.values(by).map(b=>({...b,n:b.v.size})).filter(b=>b.n>=5).sort((a,b)=>b.n-a.n);
  const best={};out.forEach(o=>{if(!best[o.game])best[o.game]=o;});CROWD_C=Object.values(best);CROWD_T=Date.now();return CROWD_C;}
function revCrowdHtml(){const C=revCrowd().slice(0,8);return`<div class="tkt"><h3>👥 Crowd favorites</h3><div class="sub" style="font-size:10px">Today's picks the most characters agree on (5+). Agreement isn't edge on its own — check the price.</div>
  ${C.length?C.map(c=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--rule);font-size:12px"><span><b>${E(c.pick)}</b> <span class="mono" style="font-size:10px;color:var(--mute)">${SPL(c.sp)} · ${E(c.game)}</span></span><span class="mono" style="color:var(--gold)">${c.n} chars</span></div>`).join(''):'<div class="sub">No pick has 5+ characters on it yet today.</div>'}</div>`;}

/* ── 5 · loss post-mortems ───────────────────────────────────────────── */
function revMortems(){const M=get('d4.lossmortems',{})||{};return Object.values(M).sort((a,b)=>(b.ts||0)-(a.ts||0));}
function revMortemHtml(){const M=revMortems();const mo=new Date().toISOString().slice(0,7);const thisMo=M.filter(m=>String(m.date||'').slice(0,7)===mo);
  let side=0,tot=0,vari=0,legs=0;thisMo.forEach(m=>(m.findings||[]).forEach(f=>{legs++;if(f.sideMiss)side++;else if(f.totalMiss&&Math.abs(f.totalMiss)>=3)tot++;else vari++;}));
  const recent=M.slice(0,5).map(m=>`<details style="border-bottom:1px solid var(--rule);padding:4px 0"><summary style="font-size:11.5px;cursor:pointer">${E(m.date)} · ticket ${E(String(m.ticketId).slice(-6))} · ${(m.findings||[]).length} legs reviewed</summary>
    ${(m.findings||[]).map(f=>`<div class="sub" style="font-size:10.5px;margin:3px 0"><b>${E(f.leg)}</b> (${E(f.game)})${f.actualScore?' · final '+E(f.actualScore):''} — ${E(f.note)}</div>`).join('')}</details>`).join('');
  return`<div class="tkt"><h3>🩻 Loss post-mortems</h3><div class="sub" style="font-size:10px">Every losing ticket is checked leg by leg against what the sims expected — a real miss, or variance the model already priced in.</div>
    ${legs?`<div class="mono" style="font-size:10.5px;margin:4px 0">This month (for the board): ${legs} losing legs · <b style="color:var(--rust)">${side}</b> wrong side · <b style="color:var(--gold)">${tot}</b> scoring far off the sims · <b style="color:var(--win)">${vari}</b> variance</div>`:''}
    ${recent||'<div class="sub">No losing tickets reviewed yet.</div>'}</div>`;}

/* ── 6 · missions: weekly boss + trophies ───────────────────────────── */
const BOSSES=[['🐗','The Juice Hog','eats the vig — beat him with 5 cashed tickets',t=>t.won,5],['🦈','The Book Shark','10 units of profit this week',t=>Math.max(0,t.units),10],
  ['🧱','The Wall','3 cashed parlays of 4+ legs',t=>t.bigWins,3],['🌪','Variance Storm','a 4-ticket win streak',t=>t.streak,4],['👻','The Bad Beat Ghost','win 70% of 6+ settled tickets',t=>t.n>=6?Math.round(t.won/t.n*100):0,70]];
const TROPHIES=[[5,'Common','#9aa4b2'],[25,'Rare','#4ea8ff'],[75,'Epic','#b06cff'],[200,'Legendary','#ffb020']];
function revTicketsDone(){let S={};try{S=settledAll();}catch(e){}
  return Object.values(S).filter(x=>x&&x.d&&!x.push&&(x.src||'mine')==='mine').map(x=>({date:x.d,won:!!x.won,legs:x.n||0,units:x.stake?(+x.profit||0)/x.stake:(x.won?1:-1)}));}
function weekKey(d){const t=new Date((d||today())+'T12:00:00Z');const day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day);return t.toISOString().slice(0,10);}
function revBoss(){const wk=weekKey();const idx=Math.floor(Date.parse(wk)/(7*864e5))%BOSSES.length;const [ico,name,goal,dmg,hp]=BOSSES[(idx+BOSSES.length)%BOSSES.length];
  const T=revTicketsDone().filter(t=>weekKey(t.date)===wk).sort((a,b)=>a.date<b.date?-1:1);let streak=0,best=0;T.forEach(t=>{streak=t.won?streak+1:0;best=Math.max(best,streak);});
  const st={won:T.filter(t=>t.won).length,n:T.length,units:T.reduce((s,t)=>s+t.units,0),bigWins:T.filter(t=>t.won&&t.legs>=4).length,streak:best};
  const d=Math.min(hp,dmg(st)||0);return{ico,name,goal,hp,dealt:d,dead:d>=hp,wk,st};}
function revMissionsHtml(){const B=revBoss();const all=revTicketsDone();const wins=all.filter(t=>t.won).length;const pct=Math.round(B.dealt/B.hp*100);
  const tro=TROPHIES.map(([n,l,c])=>{const got=wins>=n;return`<div style="display:inline-block;width:23%;text-align:center;opacity:${got?1:.45}"><div style="font-size:22px">${got?'🏆':'🔒'}</div><div class="mono" style="font-size:9px;color:${c};font-weight:800">${l}</div><div class="mono" style="font-size:8.5px;color:var(--mute)">${Math.min(wins,n)}/${n} cashed</div></div>`;}).join('');
  return`<div class="tkt"><h3>⚔️ Missions</h3><div style="display:flex;gap:10px;align-items:center"><div style="font-size:34px">${B.ico}</div><div style="flex:1">
    <div style="font-weight:800">${E(B.name)} ${B.dead?'<span style="color:var(--win)">· DEFEATED</span>':''}</div><div class="sub" style="font-size:10.5px">${E(B.goal)} · week of ${E(B.wk)}</div>
    <div style="height:9px;border-radius:5px;background:var(--rule);margin-top:4px;overflow:hidden"><div style="height:9px;width:${pct}%;background:${B.dead?'var(--win)':'var(--rust)'}"></div></div>
    <div class="mono" style="font-size:9.5px;color:var(--mute);margin-top:2px">${B.dealt}/${B.hp} damage · ${B.st.won}-${B.st.n-B.st.won} this week</div></div></div>
    <div class="mktlab" style="margin-top:8px">Trophies</div><div>${tro}</div></div>`;}


/* ── v2.85.4 · evaluation audit: every sport, every pick on today's card, and the rule that kept it off ── */
function evalAuditHtml(){let N=[];try{N=best3Near(600)||[];}catch(e){}let B=null;try{B=best5State();}catch(e){}const on=new Set(((B&&B.top3)||[]).map(x=>x.sp+'|'+x.game+'|'+x.pick));
  const T=get(TC_KEY,{})||{};const tt=x=>{try{return new Date(x).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}catch(e){return'';}};
  const rows=SPS.map(sp=>{let ev=null;try{ev=get('d4.bgeval.'+sp,null);}catch(e){}
    /* v2.86.6 · every evaluation stamps the eval lock — the page you start from included — so it backs up the relay's own record */
    try{if(!(ev&&ev.d===today())){const L=get(EVAL_LOCK_KEY,{})||{};const t=L.date===today()&&L.by&&L.by[sp];const ts=t&&(typeof t==='object'?(t.ts||t.t):t);if(ts)ev={d:today(),ok:true,ts};}}catch(e){}const sl=(T.d===today()&&T.by&&T.by[sp])||null;const mine=N.filter(x=>x.sp===sp);
    if(!sl&&!mine.length)return'';const r={};mine.forEach(x=>{const k=typeof whyLabel==='function'?whyLabel(x.why):String(x.why||'qualifies');r[k]=(r[k]||0)+1;});
    const top=mine.filter(x=>x.price!=null).sort((a,b)=>(b.p||0)-(a.p||0)).slice(0,4);const n3=((B&&B.top3)||[]).filter(x=>x.sp===sp).length;
    return`<div style="padding:6px 0;border-bottom:1px solid var(--rule)"><div style="display:flex;justify-content:space-between"><b>${SPL(sp)}</b><span class="mono" style="font-size:10px;color:${ev&&ev.d===today()&&ev.ok?'var(--win)':'var(--rust)'}">${ev&&ev.d===today()?(ev.ok?'✓ evaluated '+tt(ev.ts):'✗ evaluation failed'):'not evaluated today'} · board ${sl?tt(sl.ts):'—'}</span></div>
      <div class="mono" style="font-size:10px;color:var(--mute)">${mine.length} picks today · ${n3} on the Best 3</div>
      ${Object.entries(r).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<div class="mono" style="font-size:9.5px">${n} × ${E(k)}</div>`).join('')}
      ${top.map(x=>`<div style="font-size:11px;margin-top:2px">${E(x.pick)} ${x.price>0?'+':''}${x.price} · ${x.p!=null?Math.round(x.p*100)+'%':''} — <span style="color:var(--gold)">${E(x.why||'qualifies')}</span></div>`).join('')}</div>`;}).join('');
  return`<div class="tkt"><h3>🔎 Evaluation audit</h3><div class="sub" style="font-size:10px">Proof every sport was evaluated: each pick on today's card and the rule that kept it off the Best 3.</div>${rows||'<div class="sub">No boards on today\'s card yet.</div>'}</div>`;}

/* ── the Edge Desk view ─────────────────────────────────────────────── */
function edgeDeskHtml(){const safe=f=>{try{return f();}catch(e){console.warn('edge desk',e);return'';}};
  const C=safe(revAllConflicts)||[];
  const conf=`<div class="tkt"><h3>⚠️ Source conflicts</h3><div class="sub" style="font-size:10px">An outside site whose pick goes against most of its own trends — treat that pick as weaker.</div>${Array.isArray(C)&&C.length?C.map(c=>`<div class="mono" style="font-size:10.5px;padding:3px 0">${SPL(c.sp)} · ${E(c.game)} — ${E(c.src)} picks <b>${E(c.pick)}</b>, ${c.against} trends say otherwise</div>`).join(''):'<div class="sub">No conflicts in today\'s outside picks.</div>'}</div>`;
  return safe(evalAuditHtml)+safe(revExposureHtml)+safe(revCrowdHtml)+conf+safe(ctxBoardHtml)+safe(revMortemHtml)+safe(revMissionsHtml);}
Object.assign(W,{evalAuditHtml,revExposure,revSwap,revSourceConflicts,revAllConflicts,ctxTagsFor,ctxGaugesHtml,ctxBoardHtml,revCrowd,revMortems,revBoss,edgeDeskHtml,revExposureHtml,revMissionsHtml,revMortemHtml});
})();
