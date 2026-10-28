/* ═══ v2.77 · THE WEEKLY RACE, PLAYED TO WIN + THE TEAM PARLAY CHALLENGE + THE LAB ══════════════════════════════
   1 · THE RACE (lgChaseWeek) — $100 every Tuesday, gone Monday night, so nobody nurses a bankroll:
       official calls 5–8% of the roll (more for higher confidence), 60%+ leans 2.5%, every parlay the character
       puts out 4%; from Saturday, anyone 10%+ behind the leader presses (×1.5) and the leader protects (×0.7).
       Every parlay is booked with what it cost and what it paid.
   2 · THE TEAM PARLAY CHALLENGE — last week's race winner and runner-up are captains. They draft 1-by-1, winner
       first, until each has 4 (captain + 3). The captains know the stats: each takes the character whose top-2
       daily picks have hit most over the last 4 weeks, and who overlaps least with the picks already on the team.
       Every day each teammate gives its 2 best singles → the team's 8-leg parlay. Singles $2 each, parlay $5.
       Most money at the week's end wins. Both are graded: the singles AND the parlay.
   3 · THE LAB (background) — every possible 4-character team, replayed on the last 8 weeks of real calls:
       which teams' 8-leggers cash, come within one leg, hit the highest share of legs — plus who lifts a team
       (anchors) and who sinks it (wash-outs), and how the real drafts would have done. The goal: big parlays
       we have a real chance of hitting. */
const TM_SINGLE=2,TM_PARLAY=5,TM_KEY='d4.teamlab';
/* ── 1 · the race ── */
function lgChaseFrac(c,off){const cf=confOf(c);if(!off)return 0.025;return Math.max(0.05,Math.min(0.08,0.05+((cf||0.7)-0.70)*0.3));}
function lgChaseWeek(ws,BYV,CP,CPX){const we=dayShift(ws,6);const days=[];for(let i=0;i<7;i++)days.push(dayShift(ws,i));const S={};
  const roster=CHAR_ORDER.filter(v=>CHARS[v]);
  roster.forEach(v=>{const B={};(BYV[v]||[]).forEach(x=>{const d=String(x.date).slice(0,10);if(d<ws||d>we||x.price==null||confPre(x))return;const off=isOfficial(x);const cf=confOf(x);
      if(!off&&!(cf!=null&&cf>=0.60))return;(B[d]=B[d]||[]).push({kind:'single',x,off});});
    [[CP,'parlay'],[CPX,'prop parlay']].forEach(([M,lab])=>Object.entries(M||{}).forEach(([d,D])=>{if(d<ws||d>we||!D||!D.locked)return;const P=(D.by||{})[v];if(!P||!P.done)return;(B[d]=B[d]||[]).push({kind:'parlay',P,lab});}));
    S[v]={v,br:LG_START,peak:LG_START,dd:0,w:0,l:0,p:0,staked:0,bust:0,par:{w:0,l:0,pnl:0,cost:0},byM:{},B};});
  days.forEach((d,di)=>{const lead=Math.max(...roster.map(v=>S[v].br));
    roster.forEach(v=>{const s=S[v];const late=di>=4;const mult=late?(s.br>=lead-1e-9&&lead>LG_START?0.7:s.br<lead*0.9?1.5:1):1;
      (s.B[d]||[]).forEach(b=>{let dec,hit,frac,m;
        if(b.kind==='single'){const c=b.x;if(c.push||c.hit==null){s.p++;return;}dec=americanToDecimal(c.price);hit=c.hit;frac=lgChaseFrac(c,b.off)*mult;m=c.sp+' '+c.market;}
        else{dec=b.P.legs.filter(x=>!x.push).reduce((a,x)=>a*americanToDecimal(x.price),1);hit=b.P.won;frac=0.04*mult;m=b.lab;if(hit==null)return;}
        const st=lgStake(s.br,dec,frac);if(!st){s.bust++;return;}s.staked+=st;const pnl=hit?st*(dec-1):-st;s.br=+(s.br+pnl).toFixed(2);if(hit)s.w++;else s.l++;
        if(b.kind==='parlay'){s.par.cost+=st;s.par.pnl+=pnl;hit?s.par.w++:s.par.l++;}
        const M=s.byM[m]=s.byM[m]||{pnl:0,n:0};M.pnl+=pnl;M.n++;s.peak=Math.max(s.peak,s.br);s.dd=Math.max(s.dd,(s.peak-s.br)/s.peak);});});});
  const out={};roster.forEach(v=>{const s=S[v];const ms=Object.entries(s.byM).filter(([k,x])=>x.n>=3).sort((a,b)=>b[1].pnl-a[1].pnl);
    out[v]={v,br:s.br,w:s.w,l:s.l,p:s.p,n:s.w+s.l,par:{w:s.par.w,l:s.par.l,pnl:+s.par.pnl.toFixed(2),cost:+s.par.cost.toFixed(2)},u:+(s.br-LG_START).toFixed(2),roi:s.staked?(s.br-LG_START)/s.staked:0,dd:s.dd,bust:s.bust,best:ms[0]?ms[0][0]:null,worst:ms.length>1?ms[ms.length-1][0]:null};});
  return out;}
/* ── 2 · team challenge ── */
const TM_ROSTER=()=>CHAR_ORDER.filter(v=>CHARS[v]&&v!=='Books');
/* each character's 2 best priced calls per day (one per game), from the ledger */
let TM_TOP=null;
function tmTop2(){const V=roGet(VOICES_KEY,[],30e3)||[];if(TM_TOP&&TM_TOP.n===V.length&&Date.now()-TM_TOP.ts<120e3)return TM_TOP.m;const g={};
  V.forEach(c=>{if(!c||!CHARS[c.voice]||c.price==null||confPre(c))return;const cf=confOf(c);if(cf==null)return;const d=String(c.date).slice(0,10);((g[d]=g[d]||{})[c.voice]=g[d][c.voice]||[]).push(c);});
  const m={};Object.entries(g).forEach(([d,byV])=>{m[d]={};Object.entries(byV).forEach(([v,L])=>{const seen=new Set();m[d][v]=L.sort((a,b)=>confOf(b)-confOf(a)).filter(c=>{const k=c.sp+c.game;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,4);});});
  TM_TOP={ts:Date.now(),n:V.length,m};return m;}
/* a team's day: each member's top 2, no repeated game/side → up to 8 legs */
function tmDay(team,d,T){const byV=(T||tmTop2())[d]||{};const legs=[];const used=new Set();
  team.forEach(v=>{let n=0;(byV[v]||[]).forEach(c=>{if(n>=2)return;const k=c.sp+'|'+c.game+'|'+c.market;if(used.has(k))return;used.add(k);legs.push({v,c});n++;});});return legs;}
function tmGradeDay(legs){let hit=0,miss=0,pend=0,push=0,dec=1;legs.forEach(({c})=>{if(!c.graded){pend++;return;}if(c.push||c.hit==null){push++;return;}if(c.hit){hit++;dec*=americanToDecimal(c.price);}else miss++;});
  const n=legs.length;const done=pend===0;const cashed=done&&miss===0&&hit>0;return{n,hit,miss,pend,push,dec,done,cashed,full:legs.reduce((a,{c})=>a*americanToDecimal(c.price),1)};}
/* leg hit rate of a character's daily top 2, over the window before a date */
function tmForm(v,before,days){const T=tmTop2();const lo=dayShift(before,-(days||28));let w=0,n=0;Object.entries(T).forEach(([d,byV])=>{if(d<lo||d>=before)return;(byV[v]||[]).slice(0,2).forEach(c=>{if(!c.graded||c.push||c.hit==null)return;n++;if(c.hit)w++;});});return{w,n,r:(w+5)/(n+10)};}
function tmOverlap(v,team,before){const T=tmTop2();const lo=dayShift(before,-28);let same=0,n=0;Object.entries(T).forEach(([d,byV])=>{if(d<lo||d>=before)return;const mine=(byV[v]||[]).slice(0,2);
    const theirs=new Set();team.forEach(t=>(byV[t]||[]).slice(0,2).forEach(c=>theirs.add(c.sp+c.game+c.market+c.side)));mine.forEach(c=>{n++;if(theirs.has(c.sp+c.game+c.market+c.side))same++;});});return n?same/n:0;}
function tmDraft(ws,capA,capB){const pool=TM_ROSTER().filter(v=>v!==capA&&v!==capB);const A=[capA],B=[capB];const log=[];
  for(let r=0;r<6;r++){const team=r%2?B:A;const cap=team[0];if(!pool.length)break;
    const sc=pool.map(v=>{const f=tmForm(v,ws);const o=tmOverlap(v,team,ws);return{v,f,o,s:f.r-0.05*o};}).sort((a,b)=>b.s-a.s);const pk=sc[0];team.push(pk.v);pool.splice(pool.indexOf(pk.v),1);
    log.push({cap,v:pk.v,why:`${pk.f.w}-${pk.f.n-pk.f.w} on its top-2 picks (last 4 weeks)${pk.o>0.3?` · ${Math.round(pk.o*100)}% overlap`:''}`});}
  return{A,B,log};}
function tmCaptains(ws){try{const L=bkLedger();const W=L.weeks.find(x=>x.ws===dayShift(ws,-7));if(!W)return null;const r=Object.values(W.R).filter(x=>x.n).sort((a,b)=>b.br-a.br);if(r.length<2)return null;
    return{A:r[0].v,B:r[1].v,Ab:r[0].br,Bb:r[1].br};}catch(e){return null;}}
function tmRunTeam(team,ws,upto){const T=tmTop2();const out={team,days:[],sw:0,sl:0,spnl:0,pw:0,pl:0,ppnl:0,legs:0,legHit:0,near:0};
  for(let i=0;i<7;i++){const d=dayShift(ws,i);if(upto&&d>upto)break;const legs=tmDay(team,d,T);if(!legs.length)continue;const G=tmGradeDay(legs);
    legs.forEach(({c})=>{if(!c.graded||c.push||c.hit==null)return;out.legs++;if(c.hit){out.legHit++;out.sw++;out.spnl+=TM_SINGLE*(americanToDecimal(c.price)-1);}else{out.sl++;out.spnl-=TM_SINGLE;}});
    if(G.done&&G.hit+G.miss>0){if(G.cashed){out.pw++;out.ppnl+=TM_PARLAY*(G.dec-1);}else{out.pl++;out.ppnl-=TM_PARLAY;if(G.miss===1&&G.n>=6)out.near++;}}
    out.days.push({d,legs,G});}
  out.total=+(out.spnl+out.ppnl).toFixed(2);out.spnl=+out.spnl.toFixed(2);out.ppnl=+out.ppnl.toFixed(2);return out;}
let TMW_C=null;
function tmWeek(ws){if(!ws&&TMW_C&&Date.now()-TMW_C.ts<120e3)return TMW_C.v;const v=tmWeek0(ws);if(!ws)TMW_C={ts:Date.now(),v};return v;}
function tmWeek0(ws){ws=ws||bkWeekStart();const C=tmCaptains(ws);if(!C)return null;const D=tmDraft(ws,C.A,C.B);return{ws,C,D,A:tmRunTeam(D.A,ws),B:tmRunTeam(D.B,ws)};}
/* ── 3 · the lab: every 4-character team, last 8 finished weeks ── */
function tmLab(force){const L0=get(TM_KEY,null);const ws=bkWeekStart();if(!force&&L0&&L0.ws===ws&&Date.now()-L0.ts<6*36e5)return L0;
  const T=tmTop2();const lo=dayShift(ws,-56);const days=Object.keys(T).filter(d=>d>=lo&&d<ws).sort();const R=TM_ROSTER().filter(v=>days.some(d=>(T[d][v]||[]).length));
  const teams=[];for(let a=0;a<R.length;a++)for(let b=a+1;b<R.length;b++)for(let c=b+1;c<R.length;c++)for(let e=c+1;e<R.length;e++){const tm=[R[a],R[b],R[c],R[e]];
    let n=0,cash=0,near=0,legs=0,hit=0,pnl=0,big=0;days.forEach(d=>{const lg=tmDay(tm,d,T);if(lg.length<6)return;const G=tmGradeDay(lg);if(!G.done||G.hit+G.miss===0)return;n++;legs+=G.hit+G.miss;hit+=G.hit;
      if(G.cashed){cash++;pnl+=TM_PARLAY*(G.dec-1);big=Math.max(big,G.dec);}else{pnl-=TM_PARLAY;if(G.miss===1)near++;}});
    if(n>=5)teams.push({tm,n,cash,near,lr:legs?hit/legs:0,pnl:+pnl.toFixed(2),big:+big.toFixed(1)});}
  teams.sort((x,y)=>y.cash-x.cash||y.near-x.near||y.lr-x.lr);
  const imp={};R.forEach(v=>{const inn=teams.filter(t=>t.tm.includes(v)),out=teams.filter(t=>!t.tm.includes(v));const avg=a=>a.length?a.reduce((s,t)=>s+t.lr,0)/a.length:0;const cav=a=>a.length?a.reduce((s,t)=>s+t.cash+t.near*0.25,0)/a.length:0;
    imp[v]={lift:+(avg(inn)-avg(out)).toFixed(4),clift:+(cav(inn)-cav(out)).toFixed(3),f:tmForm(v,ws,56)};});
  const past=[];for(let i=1;i<=6;i++){const w=dayShift(ws,-7*i);const C=tmCaptains(w);if(!C)continue;const D=tmDraft(w,C.A,C.B);const A=tmRunTeam(D.A,w),B=tmRunTeam(D.B,w);if(!A.days.length&&!B.days.length)continue;past.push({ws:w,A:{tm:D.A,t:A.total,pw:A.pw,lr:A.legs?A.legHit/A.legs:0,near:A.near},B:{tm:D.B,t:B.total,pw:B.pw,lr:B.legs?B.legHit/B.legs:0,near:B.near}});}
  const L={ws,ts:Date.now(),days:days.length,tried:teams.length,top:teams.slice(0,10),imp,past};set(TM_KEY,L);return L;}
/* ── the card ── */
const tmNm=v=>txtEsc(charName(v).replace(/^The /,''));const tmChip=v=>`<b style="color:${(CHARS[v]||{}).color}">${tmNm(v)}</b>`;
const tmMoney=x=>`<b style="color:${x>=0?'var(--win)':'var(--rust)'}">${x>=0?'+':'-'}$${Math.abs(x).toFixed(2)}</b>`;
function tmTeamBox(lab,R,cap,lead){const today_=R.days.find(x=>x.d===today());
  return`<div style="flex:1;min-width:150px;border:1px solid ${lead?'var(--gold)':'var(--rule)'};border-radius:10px;padding:8px">
    <div style="font-weight:800">${lead?'🏆 ':''}${lab}</div><div class="mono" style="font-size:10.5px;margin-top:2px">👑 ${tmChip(cap)} · ${R.team.slice(1).map(tmChip).join(' · ')}</div>
    <div class="mono" style="font-size:11px;margin-top:6px">Total ${tmMoney(R.total)}<br>Singles ${R.sw}-${R.sl} ${tmMoney(R.spnl)}<br>8-leggers ${R.pw}-${R.pl} ${tmMoney(R.ppnl)}${R.near?` · ${R.near} one leg short`:''}<br>Legs hit ${R.legs?Math.round(R.legHit/R.legs*100):0}%</div>
    ${today_?`<details style="margin-top:6px"><summary class="sub" style="font-size:10.5px">Today's ${today_.legs.length}-leg parlay · ${decimalToAmerican(today_.G.full)}</summary><div class="mono" style="font-size:10px">${today_.legs.map(({v,c})=>`${!c.graded?'⏳':c.push?'➖':c.hit?'✅':'❌'} ${txtEsc(typeof charPickText==='function'?charPickText(c):c.pick||'')} ${c.price>0?'+':''}${c.price} · ${tmNm(v)}`).join('<br>')}</div></details>`:''}</div>`;}
function teamHtml(){if(SAFE_MODE)return'';let W=null;try{W=tmWeek();}catch(e){return'';}
  const head=`<div class="tkt lg-card" style="margin-top:8px"><h3>🤝 Team Parlay Challenge</h3><div class="sub" style="font-size:10.5px">Last week's winner and runner-up captain a team and draft 1-by-1 (winner first) to 4 each. Every day each teammate gives its 2 best singles → an 8-leg team parlay. Singles $${TM_SINGLE}, parlay $${TM_PARLAY}. Most money by Monday night wins.</div>`;
  if(!W)return head+`<div class="sub" style="margin-top:6px">Needs last week's race to have a winner and runner-up — starts with the next week.</div></div>`+tmLabHtml();
  const lead=W.A.total>=W.B.total;
  return head+`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${tmTeamBox('Team '+tmNm(W.C.A),W.A,W.C.A,lead&&(W.A.days.length>0))}${tmTeamBox('Team '+tmNm(W.C.B),W.B,W.C.B,!lead&&(W.B.days.length>0))}</div>
    <details style="margin-top:6px"><summary class="sub">The draft</summary><div class="mono" style="font-size:10.5px">${W.D.log.map((x,i)=>`${i+1}. ${tmChip(x.cap)} took ${tmChip(x.v)} — ${txtEsc(x.why)}`).join('<br>')}</div></details></div>`+tmLabHtml();}
function tmLabHtml(){let L=get(TM_KEY,null);if(!L||!L.top||L.ws!==bkWeekStart())return`<div class="tkt"><h3>🧪 The Parlay Lab</h3><div class="sub" style="font-size:10.5px">Replays every 4-character team on the last 8 weeks. Runs on demand (it's heavy).</div><button style="margin-top:6px" onclick="this.textContent='Running…';setTimeout(()=>{try{tmLab(true);}catch(e){}try{renderToday(true);}catch(e){}try{deskRerender();}catch(e){}},50)">🧪 Run the lab</button></div>`;const pc=x=>Math.round(x*100)+'%';
  const imp=Object.entries(L.imp).sort((a,b)=>b[1].clift-a[1].clift||b[1].lift-a[1].lift);const anchors=imp.filter(([,x])=>x.lift>0).slice(0,4),wash=imp.filter(([,x])=>x.lift<0).slice(-4).reverse();
  return`<div class="tkt"><h3>🧪 The Parlay Lab</h3><div class="sub" style="font-size:10.5px">Every possible 4-character team (${L.tried}), replayed on the last ${L.days} days of real calls: each teammate's 2 best picks a day → an 8-leg parlay. Looking for the big parlays we can actually hit.</div>
    ${L.top.length?`<div class="mktlab">Best teams on history</div><div class="mono" style="font-size:10.5px">${L.top.map((t,i)=>`${i+1}. ${t.tm.map(tmChip).join(' · ')}<br>&nbsp;&nbsp;&nbsp;cashed ${t.cash}/${t.n}${t.big?` (best ${decimalToAmerican(t.big)})`:''} · one leg short ${t.near} · legs ${pc(t.lr)} · ${t.pnl>=0?'+':'-'}$${Math.abs(t.pnl).toFixed(0)} at $${TM_PARLAY}`).join('<br>')}</div>`:'<div class="sub">Not enough graded days yet.</div>'}
    ${anchors.length?`<div class="mktlab">⚓ Anchors — teams with them hit more legs</div><div class="mono" style="font-size:10.5px">${anchors.map(([v,x])=>`${tmChip(v)} +${(x.lift*100).toFixed(1)} pts · own top-2 ${x.f.w}-${x.f.n-x.f.w}`).join('<br>')}</div>`:''}
    ${wash.length?`<div class="mktlab">🌊 Wash-outs — teams with them hit fewer</div><div class="mono" style="font-size:10.5px">${wash.map(([v,x])=>`${tmChip(v)} ${(x.lift*100).toFixed(1)} pts · own top-2 ${x.f.w}-${x.f.n-x.f.w}`).join('<br>')}</div>`:''}
    ${L.past.length?`<div class="mktlab">How the real drafts would have done</div><div class="mono" style="font-size:10.5px">${L.past.map(p=>`${txtEsc(p.ws)}: ${tmNm(p.A.tm[0])}'s team ${p.A.t>=0?'+':'-'}$${Math.abs(p.A.t).toFixed(0)} (${p.A.pw} cashed, legs ${pc(p.A.lr)}) vs ${tmNm(p.B.tm[0])}'s ${p.B.t>=0?'+':'-'}$${Math.abs(p.B.t).toFixed(0)} (${p.B.pw} cashed, legs ${pc(p.B.lr)})`).join('<br>')}</div>`:''}</div>`;}
/* on the league card and the Banker card */
if(typeof leagueHtml==='function'&&!window.__TMH__){window.__TMH__=1;const LH0=leagueHtml;leagueHtml=function(compact){const h=LH0(compact);if(compact)return h;let t='';try{t=teamHtml();}catch(e){console.warn('team card',e);}return h+t;};
  if(typeof bankerHtml==='function'){const BH0=bankerHtml;bankerHtml=function(){const h=BH0();let t='';try{t=teamHtml();}catch(e){}return h+t;};}}
/* the lounge: /teams */
if(typeof cmdBuild==='function'&&!window.__CMDTM__){window.__CMDTM__=1;const B3=cmdBuild;cmdBuild=function(){const o=B3();try{const W=tmWeek();const E=cmdE;const nm=v=>E(charName(v).replace(/^The /,''));
    const box=(R,cap)=>{const td=R.days.find(x=>x.d===today());return`<b>Team ${nm(cap)}</b>: ${R.team.map(nm).join(', ')}\nTotal ${R.total>=0?'+':'-'}$${Math.abs(R.total).toFixed(2)} · singles ${R.sw}-${R.sl} · 8-leggers ${R.pw}-${R.pl}${R.near?` (${R.near} one leg short)`:''}`+(td?`\n<b>Today's ${td.legs.length}-leg parlay · ${E(decimalToAmerican(td.G.full))}</b>\n`+td.legs.map(({v,c})=>`${cmdMk(c)}${E(typeof charPickText==='function'?charPickText(c):c.pick||'')} ${E(cmdSg(c.price))} · ${cmdSp(c.sp)} ${E(c.game)} · ${nm(v)}`).join('\n'):'');};
    o.r.teams=W?`<b>🤝 Team Parlay Challenge</b>\n${box(W.A,W.C.A)}\n\n${box(W.B,W.C.B)}\n<i>Captains: last week's winner and runner-up. Each teammate's 2 best singles a day make an 8-leg team parlay.</i>`:'<b>🤝 Team Parlay Challenge</b>\nStarts once last week has a winner and runner-up.';
    const i=o.menu.findIndex(x=>x.command==='league');o.menu.splice(i<0?o.menu.length:i+1,0,{command:'teams',description:'Team parlay challenge'});o.menu=o.menu.slice(0,100);}catch(e){console.warn('teams cmd',e);}return o;};}
