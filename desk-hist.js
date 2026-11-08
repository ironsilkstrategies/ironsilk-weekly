/* ═══ THE HISTORIAN, REBUILT (v2.91.0) ═════════════════════════════════════════════════════════════════════════════════
   Loaded on every sport page after desk-dog.js.

   Nov 8: "The historian has to understand team prestige… what teams finish in the playoffs the most over the last 10 years…
   what QBs get the best calls from refs, what ref crews call towards home or visitor… offenses/defenses that are total trash
   and exposed historically… players who have lost or won in majority against said teams… the 49ers haven't lost to X in the
   last 5 head to heads… prestige, history, elements and dynamics." 1:09 AM: "get as much as you can… don't stress if you
   can't get it for free."

   What he reads (built off the phone by the feeds robot from ten finished seasons — historian.json):
     · HEAD-TO-HEAD — every pairing's last meetings, newest counting most; a streak ("hasn't lost to X in 5") says so
     · PRESTIGE — playoff trips in ten years, playoff wins, titles, the ten-year record (0–100)
     · DYNASTY OR PRETENDER — this season against the team's own ten-year norm: history says the outlier comes back
     · EXPOSED UNITS — offenses and defenses against the league for three straight seasons (bottom 20% = exposed)
     · REFEREES — the crew chief's home record, as the robot's finals pile up (only when the chief is known before the game)
     · and the trends you upload, as before, now one voice among these
   Not free yet (left for later, on purpose): QB games-played history, player-vs-team records, ref calls by QB.
   Official at a gut of 70+ (side or total); the moneyline needs 75+ and a price between -300 and +250. A predicted score on
   every game he reads. */

const HIST_K='d4.feedcache.histidx',HIST_EVERY=12*36e5;
const HIST_SIG={nfl:13.5,ncaaf:16,nba:12,ncaab:10.5,nhl:2.2};
let HIST_T=null;
function histStore(data){if(!data||!data.t)return 0;set(HIST_K,{ts:data.ts,t:data.t,h2h:data.h2h||{},ref:data.ref||{}});HIST_T=null;return Object.keys(data.t).length;}
function histData(){if(HIST_T&&Date.now()-HIST_T._t<60e3)return HIST_T.v;const v=roGet(HIST_K,null,60e3);HIST_T={v,_t:Date.now()};return v;}
function histTeam(sp,ab){const D=histData();if(!D)return null;return D.t[sp+'|'+ab]||(typeof mgAb==='function'?D.t[sp+'|'+mgAb(sp,ab)]:null)||null;}
function histPair(sp,a,h){const D=histData();if(!D)return[];const k=(x,y)=>sp+'|'+[x,y].sort().join('|');let L=D.h2h[k(a,h)];
  if(!L&&typeof mgAb==='function')L=D.h2h[k(mgAb(sp,a),mgAb(sp,h))];return L||[];}
async function histTick(){try{const c=get(typeof FEED_KEY==='function'?FEED_KEY('historian'):'d4.feedcache.historian',null);if(c&&Date.now()-(+c.at||0)<HIST_EVERY&&histData())return;
  const d=await feedFetch('historian',true);if(d)histStore(d);}catch(e){}}
/* the gut on one game — o = {sp, a, h, mlA, mlH, hl, tl, trends:{dMar,dTot}} */
function histGut(o){const sp=o.sp,sig=HIST_SIG[sp];if(!sig)return null;const D=histData();
  let L=0,TT=0;const why=[],twhy=[];const pt=(v,lab,tot)=>{v=Math.max(-14,Math.min(14,v));if(Math.abs(v)<0.5)return;if(tot){TT+=v;twhy.push({v:+v.toFixed(1),lab});}else{L+=v;why.push({v:+v.toFixed(1),lab});}};
  const A=histTeam(sp,o.a),H=histTeam(sp,o.h);const M=histPair(sp,o.a,o.h);
  const isH=w=>w===o.h||(typeof mgAb==='function'&&mgAb(sp,w)===mgAb(sp,o.h));
  /* head-to-head: newest counts most; a streak is named */
  if(M.length){let sw=0,s=0,hw=0;M.forEach((m,i)=>{const w=Math.pow(0.85,i);sw+=w;s+=w*(isH(m[1])?1:-1);if(isH(m[1]))hw++;});const dom=s/sw*(M.length/(M.length+3));
    let st=0;for(const m of M){if(isH(m[1])===isH(M[0][1]))st++;else break;}const lead=isH(M[0][1])?o.h:o.a,oth=lead===o.h?o.a:o.h;
    const yr=String(M[M.length-1][0]).slice(0,4);
    pt(14*dom,st>=4?`${lead} hasn't lost to ${oth} in ${st} straight (since ${String(M[st-1][0]).slice(0,4)})`:`${o.h} ${hw}-${M.length-hw} vs ${o.a} in the last ${M.length} (since ${yr})`);}
  if(A&&H){pt(10*(H.pres-A.pres)/100,`prestige ${o.h} ${H.pres} (playoffs ${H.po} of ${H.s} yrs${H.ti?`, ${H.ti} title${H.ti>1?'s':''}`:''}) vs ${o.a} ${A.pres} (${A.po} of ${A.s}${A.ti?`, ${A.ti} title${A.ti>1?'s':''}`:''})`);
    /* dynasty or pretender: this season against its own ten-year norm */
    const reg=T=>T.cur!=null&&T.w10!=null&&T.curN>=4?(T.cur-T.w10)*(T.curN/(T.curN+6)):0;const rA=reg(A),rH=reg(H);
    if(Math.abs(rH)>=0.12)pt(-12*rH,`${o.h} ${(H.cur*100).toFixed(0)}% this year vs ${(H.w10*100).toFixed(0)}% over ten — history says it comes back`);
    if(Math.abs(rA)>=0.12)pt(12*rA,`${o.a} ${(A.cur*100).toFixed(0)}% this year vs ${(A.w10*100).toFixed(0)}% over ten — history says it comes back`);
    /* units: three straight seasons against the league */
    if(A.off3!=null&&H.off3!=null&&A.def3!=null&&H.def3!=null){pt(6*((H.off3+H.def3)-(A.off3+A.def3)),`three seasons: ${o.h} offense ${Math.round(H.off3*100)}th / defense ${Math.round(H.def3*100)}th pct · ${o.a} ${Math.round(A.off3*100)}th / ${Math.round(A.def3*100)}th`);
      const ex=[[A,o.a],[H,o.h]].filter(([T])=>T.def3<0.2).map(([,n])=>n),dead=[[A,o.a],[H,o.h]].filter(([T])=>T.off3<0.2).map(([,n])=>n);
      pt(12*(((1-A.def3)+(1-H.def3)-1)+((A.off3+H.off3)-1))/2,`${ex.length?`exposed defense${ex.length>1?'s':''}: ${ex.join(', ')} (bottom 20% three seasons)`:dead.length?`dead offense${dead.length>1?'s':''}: ${dead.join(', ')} (bottom 20% three seasons)`:'the two units against each other, three seasons'}`,true);}}
  /* the referee, when the chief is known before the game */
  if(o.ref&&D&&D.ref){const R=D.ref[sp+'|'+o.ref];if(R&&R.g>=8){const base=sp==='nhl'?0.54:sp==='nba'?0.56:0.56;pt(25*(R.hw-base)*(R.g/(R.g+15)),`ref ${o.ref}: home teams ${Math.round(R.hw*R.g)}-${R.g-Math.round(R.hw*R.g)} under him`);}}
  /* the trends you upload, one voice among these */
  if(o.trends){if(isFinite(o.trends.dMar)&&Math.abs(o.trends.dMar)>=0.05)pt(Math.max(-8,Math.min(8,3*o.trends.dMar)),'uploaded trends');if(isFinite(o.trends.dTot)&&Math.abs(o.trends.dTot)>=0.05)pt(Math.max(-8,Math.min(8,3*o.trends.dTot)),'uploaded trends',true);}
  const side=L>=0?'home':'away',G=Math.round(Math.max(0,Math.min(100,50+Math.abs(L)))),tside=TT>=0?'over':'under',TG=Math.round(Math.max(0,Math.min(100,50+Math.abs(TT))));
  /* his score: the market's numbers bent by history */
  let mH=null;if(o.hl!=null&&sp!=='nhl')mH=-(+o.hl);else if(o.mlA!=null&&o.mlH!=null&&typeof dogProbit==='function'){const ia=+o.mlA>0?100/(+o.mlA+100):-o.mlA/(-o.mlA+100),ih=+o.mlH>0?100/(+o.mlH+100):-o.mlH/(-o.mlH+100);mH=sig*dogProbit(ih/(ia+ih))*(sp==='nhl'?0.55:1);}
  let ps=null;if(mH!=null&&o.tl!=null){const m=mH+(L/50)*0.3*sig,T=+o.tl*(1+(TT/50)*0.06);ps={a:+((T-m)/2).toFixed(1),h:+((T+m)/2).toFixed(1)};}
  why.sort((x,y)=>Math.abs(y.v)-Math.abs(x.v));twhy.sort((x,y)=>Math.abs(y.v)-Math.abs(x.v));
  /* no official call on half a memory: five finished seasons for both teams, or four meetings between them */
  return{side,G,tside,TG,why,twhy,ps,known:!!(A&&H&&A.s>=5&&H.s>=5)||M.length>=4};}
const HIST_PS={};
function histCalls(sp,g,Ln,hl,hlSim,tl,tlSim,add,trends){const o={sp,a:g.away.abbr,h:g.home.abbr,mlA:Ln.mlA&&amerOk(Ln.mlA.price),mlH:Ln.mlH&&amerOk(Ln.mlH.price),hl:hlSim?null:hl,tl:tlSim?null:tl,trends,ref:g.ref||null};
  const R=histGut(o);if(!R)return null;if(R.ps)HIST_PS[sp+'|'+o.a+'@'+o.h]=R.ps;if(!R.known)return R;
  const w=L=>L.slice(0,5).map(x=>`${x.v>0?'+':''}${x.v} ${x.lab}`);
  const ex={hG:R.G,why:w(R.why),...(R.ps?{pa:R.ps.a,ph:R.ps.h}:{})};
  if(R.G>=70&&hl!=null&&!hlSim)add('Trends','spread',R.side,ex);
  const pr=R.side==='home'?o.mlH:o.mlA;if(R.G>=75&&pr!=null&&+pr>=-300&&+pr<=250)add('Trends','ml',R.side,ex);
  if(R.TG>=70&&tl!=null&&!tlSim)add('Trends','total',R.tside,{hG:R.TG,why:w(R.twhy),...(R.ps?{pa:R.ps.a,ph:R.ps.h}:{})});
  return R;}
function histPredFor(sp,g){return HIST_PS[sp+'|'+g.away.abbr+'@'+g.home.abbr]||null;}

/* his card ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
function histCardHtml(){try{const V=roGet(VOICES_KEY,[],30e3)||[];const d=today();const D=histData();
  const L=V.filter(x=>x&&x.voice==='Trends'&&String(x.date).slice(0,10)===d&&!x.graded&&x.hG!=null).sort((a,b)=>(+b.hG||0)-(+a.hG||0)).slice(0,8);
  const rows=L.map(x=>`<div class="mono" style="font-size:10.5px;padding:5px 0;border-bottom:1px solid var(--rule)">${(SP_LAB[x.sp]||'').split(' ')[0]} <b style="color:var(--chalk)">${txtEsc(x.pick)}</b>${x.price!=null?` <span style="color:var(--gold)">${x.price>0?'+':''}${x.price}</span>`:''} · gut <b style="color:${x.hG>=78?'var(--win)':'var(--gold)'}">${x.hG}</b>
      ${x.pa!=null?`<br><span style="color:var(--mute)">his score: ${txtEsc(x.game.split('@')[0])} ${Math.round(x.pa)} – ${Math.round(x.ph)} ${txtEsc(x.game.split('@')[1])}</span>`:''}<br><span style="color:var(--mute);font-size:9.5px">${(x.why||[]).slice(0,3).map(txtEsc).join(' · ')}</span></div>`).join('');
  const n=D?Object.keys(D.t||{}).length:0,p=D?Object.keys(D.h2h||{}).length:0,r=D?Object.keys(D.ref||{}).length:0;
  return`<div class="tkt" style="margin-top:8px;border-left:3px solid #34d399"><h3 style="margin:0 0 2px">📜 The Historian</h3>
    <div class="sub" style="font-size:10px">Prestige, head-to-head, dynasties and pretenders, units exposed for years, the referee — ten finished seasons. Official at a gut of 70+.</div>
    <div class="mono" style="font-size:10px;color:var(--mute)">${D?`${n} teams · ${p} pairings · ${r} referees tracked`:'History not loaded yet — the feeds robot builds ten seasons a slice at a time.'}</div>
    ${rows||'<div class="sub" style="font-size:10.5px">Nothing clears his gut today yet.</div>'}</div>`;}catch(e){return'';}}
if(typeof window!=='undefined'&&!window.__HIST_V2__){window.__HIST_V2__=1;
  window.addEventListener('load',()=>{if(window.__NO_GRADELOOP__||(typeof DESK_BG_EVAL!=='undefined'&&DESK_BG_EVAL))return;setTimeout(()=>{histTick();},20000);setInterval(()=>{histTick();},HIST_EVERY/2);});
  if(typeof dogCardHtml==='function'){const D0=dogCardHtml;dogCardHtml=function(){return D0()+histCardHtml();};}}
