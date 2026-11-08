/* ═══ THE ORACLE (v2.94.0) ════════════════════════════════════════════════════════════════════════════════════════════
   Loaded on every sport page after desk-coach.js.

   Nov 8, 1:25 AM: "Oracle needs a mechanism that lets it scan the net for all kinds of sports sites predictions and bring them
   in… he is the representation of the outside picks consensus… he finds consistent sites and he learns to grab their picks
   everyday by himself or via the worker… he compares to the characters and finds his gut confidence by knowing what the other
   sites strength in picking picks is." — and, for him and the Coach: "a predicted final score for all calls… independent
   from anyone else's based on their skillsets."

   The feeds robot reads the outside world every hour (oracle.json) and grades every source after every final:
     prediction markets — Kalshi, Polymarket
     computer ratings   — ESPN FPI/BPI, DRatings, OddsShark's computer, and every system on the Prediction Tracker (50+ a sport)
     expert picks       — Pickswise (with its stars), the CBS Sports expert panel
     the crowd          — Covers' contest consensus (and the betting public's splits, when they're open)
   Your uploaded predictions (anything but Covers) are one more source, graded from the ledger.

   §1 the wire, each source's record   §2 the consensus → his own score   §3 his gut   §4 his calls   §5 his card
   His gut is built from three things: how far the outside consensus sits from the line; each source's record on the side it
   takes (a source that loses counts AGAINST its side); and whether the outside world has out-picked the Desk in that lane. */

const ORA_IDX_K='d4.feedcache.oracleidx';
const ORA_SIG={nfl:13.5,ncaaf:16,nba:12.5,ncaab:11,nhl:2.4,mlb:3.6};      /* margin spread of a final around the true line */
const ORA_TSIG={nfl:13,ncaaf:16,nba:18,ncaab:15,nhl:2.2,mlb:4.2};
const ORA_AVG={nfl:44,ncaaf:53,nba:228,ncaab:144,nhl:6.1,mlb:8.8};
const oraNc=z=>typeof normCdf==='function'?normCdf(z):0.5*(1+Math.tanh(z*0.7978845608*(1+0.044715*z*z)));
const oraLogit=p=>{p=Math.min(0.98,Math.max(0.02,p));return Math.log(p/(1-p));};
const oraInv=x=>1/(1+Math.exp(-x));
function oraProbit(p){p=Math.min(0.999,Math.max(0.001,p));const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],
  b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572],c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],
  e=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];const lo=0.02425;
  const tail=q=>(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((e[0]*q+e[1])*q+e[2])*q+e[3])*q+1);
  if(p<lo)return tail(Math.sqrt(-2*Math.log(p)));if(p>1-lo)return-tail(Math.sqrt(-2*Math.log(1-p)));
  const q=p-0.5,r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}

/* §1 · the wire ──────────────────────────────────────────────────────────────────────────────────────────────────── */
let ORA_D=null;
function oracleStore(data){if(!data||!data.g)return 0;set(ORA_IDX_K,{ts:data.ts,g:data.g,rec:data.rec||{},src:data.src||{}});ORA_D=null;return Object.keys(data.g).length;}
function oracleIdx(){if(ORA_D&&Date.now()-ORA_D._t<60e3)return ORA_D.v;const v=roGet(ORA_IDX_K,null,60e3);ORA_D={v,_t:Date.now()};return v;}
function oracleFile(sp,a,h,d){const D=oracleIdx();if(!D||!D.g)return null;d=d||today();const ab=x=>typeof mgAb==='function'?mgAb(sp,x):x;
  for(const [A,H] of [[a,h],[ab(a),ab(h)]])for(const dd of [d,dayShift(d,1),dayShift(d,-1)]){const o=D.g[sp+'|'+A+'@'+H+'|'+dd];if(o)return o;}return null;}
const oraIsPT=k=>String(k).startsWith('pt.');
function oraLab(k){if(k==='upload')return'your uploads';const D=oracleIdx();const s=D&&D.src&&D.src[k];return s&&s.lab||(oraIsPT(k)?k.slice(3):k);}
const oraShort=k=>oraLab(k).replace(/ \(Prediction Tracker\)$/,'');
/* your uploads' record: the old upload-driven Oracle calls in the ledger, by sport and bet type */
let ORA_UP=null;
function oraUploadRec(){const V=roGet(VOICES_KEY,[],30e3)||[];const sig=(typeof ledgerSig==='function'?ledgerSig(V):V.length)+'|'+today();if(ORA_UP&&ORA_UP.sig===sig)return ORA_UP.R;
  const R={};const d60=dayShift(today(),-60);
  V.forEach(x=>{if(!x||x.voice!=='Pred'||x.oG!=null||!x.graded||x.hit==null||x.push||String(x.date)<d60)return;const k=x.market==='ml'?'su':x.market==='spread'?'ats':x.market==='total'?'ou':null;if(!k)return;
    const o=R[x.sp]||(R[x.sp]={n:0,su:[0,0],ats:[0,0],ou:[0,0]});o[k][0]+=x.hit?1:0;o[k][1]++;o.n++;});
  ORA_UP={sig,R};return R;}
function oraRec(k,sp){if(k==='upload')return oraUploadRec()[sp]||null;const D=oracleIdx();const r=D&&D.rec&&D.rec[k]&&D.rec[k][sp];return r?r.all:null;}
/* a source's hit rate in a lane, shrunk toward a coin flip by 30 picks so a hot week doesn't make a prophet */
function oraRate(k,sp,mk){const R=oraRec(k,sp);const A=R&&R[mk==='ml'?'su':mk==='spread'?'ats':'ou'];if(!A||!A[1])return{r:0.5,n:0,w:0};return{r:(A[0]+15)/(A[1]+30),n:A[1],w:A[0]};}
/* how much each source counts toward the consensus: a starting trust by kind, then its own record — sharper win chances
   (Brier), closer margins (MAE) and a better record against the spread or total earn weight; a losing record sheds it */
const ORA_W0={kalshi:1,poly:1,espn:0.8,dr:0.7,os:0.4,upload:0.5};
const oraBase=k=>ORA_W0[k]!=null?ORA_W0[k]:oraIsPT(k)?0.3:0.4;
function oraWpW(k,sp){let w=oraBase(k);const R=oraRec(k,sp);if(R&&R.br!=null&&R.su&&R.su[1]>=25)w*=Math.exp(-28*Math.max(-0.03,Math.min(0.05,R.br-0.205)));return w;}
function oraMgW(k,sp){let w=oraBase(k);const R=oraRec(k,sp);if(R&&R.mae!=null&&R.n>=25){const ref=(ORA_SIG[sp]||12)*0.8;w*=Math.exp(-2*Math.max(-0.3,Math.min(0.3,(R.mae-ref)/ref)));}
  const a=oraRate(k,sp,'spread');if(a.n>=25)w*=Math.exp(10*(a.r-0.5));return w;}
function oraTotW(k,sp){let w=oraBase(k);const a=oraRate(k,sp,'total');if(a.n>=25)w*=Math.exp(10*(a.r-0.5));return w;}

/* §2 · the consensus — win chance, margin and total, and from them his own final score ─────────────────────────────── */
/* the Prediction Tracker's 50-odd systems move together, so they count as one family (capped), not fifty votes */
function oraGame(sp,g,hl,tl,d,up){const F=oracleFile(sp,g.away.abbr,g.home.abbr,d);const S={...((F&&F.s)||{})};
  if(up&&isFinite(+up.a)&&isFinite(+up.h))S.upload={pa:+up.a,ph:+up.h,mg:+up.h-(+up.a),tot:+up.a+(+up.h),src:up.src||''};
  const keys=Object.keys(S).filter(k=>S[k]&&k!=='public');if(!keys.length&&!S.public)return null;const sig=ORA_SIG[sp]||12;
  let sw=0,sl=0;const fw=[];keys.forEach(k=>{const v=S[k];let p=v.wp,w;if(p!=null&&p>0&&p<1)w=oraWpW(k,sp);else if(v.mg!=null){p=oraNc(v.mg/sig);w=oraWpW(k,sp)*0.6;}else return;
    if(oraIsPT(k))fw.push([p,w]);else{sw+=w;sl+=w*oraLogit(p);}});
  if(fw.length){const W=fw.reduce((s,x)=>s+x[1],0),L=fw.reduce((s,x)=>s+x[1]*oraLogit(x[0]),0)/W,Wf=Math.min(1.2,W);sw+=Wf;sl+=Wf*L;}
  const pH=sw?oraInv(sl/sw):null;
  /* a win chance says little about the margin out in the tails (99% could be by 20 or by 40), so only 10–90% converts */
  let mw=0,ms=0;const fm=[];keys.forEach(k=>{const v=S[k];let m=v.mg,w;if(m!=null)w=oraMgW(k,sp);else if(v.wp!=null&&v.wp>=0.1&&v.wp<=0.9){m=sig*oraProbit(v.wp);w=oraWpW(k,sp)*0.8;}else return;
    if(oraIsPT(k))fm.push([m,w,k]);else{ms+=w*m;mw+=w;}});
  let ptM=null;if(fm.length){const W=fm.reduce((s,x)=>s+x[1],0);ptM=fm.reduce((s,x)=>s+x[0]*x[1],0)/W;const Wf=Math.min(1.5,W);ms+=Wf*ptM;mw+=Wf;}
  if(hl!=null&&mw){ms+=0.6*(-hl);mw+=0.6;}     /* the sportsbook's own number is one more outside voice */
  const M=mw?ms/mw:null;
  let tw=0,ts=0;keys.forEach(k=>{const v=S[k];if(v.tot==null)return;const w=oraTotW(k,sp);ts+=w*v.tot;tw+=w;});
  const Tm=tw?ts/tw:null;let T=tl!=null?(Tm!=null?(ts+0.6*tl)/(tw+0.6):+tl):Tm;if(T==null&&M!=null)T=ORA_AVG[sp]||null;
  return{S,pH,M,T,Tm,ptM,ptN:fm.length,n:keys.length,ps:M!=null&&T!=null?{a:+((T-M)/2).toFixed(1),h:+((T+M)/2).toFixed(1)}:null};}

/* §3 · his gut ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
/* the outside world vs the Desk in a lane (sport × bet type): every graded outside source against the characters' sure calls */
let ORA_VS=null;
function oraVsDesk(sp,mk){const V=roGet(VOICES_KEY,[],30e3)||[];const sig=(typeof ledgerSig==='function'?ledgerSig(V):V.length)+'|'+today()+'|'+((oracleIdx()||{}).ts||'');
  if(!ORA_VS||ORA_VS.sig!==sig)ORA_VS={sig,c:{}};const ck=sp+'|'+mk;if(ORA_VS.c[ck])return ORA_VS.c[ck];
  const d60=dayShift(today(),-60);let dw=0,dn=0;const seen=new Set();
  V.forEach(x=>{if(!x||x.sp!==sp||x.market!==mk||!x.graded||x.hit==null||x.push||String(x.date)<d60||!CHARS[x.voice]||x.voice==='Pred'||(typeof META_VOICES!=='undefined'&&META_VOICES.has(x.voice)))return;
    const c=confOf(x);if(c==null||c<0.6)return;const q=[x.voice,x.game,x.date,x.side].join('|');if(seen.has(q))return;seen.add(q);dn++;dw+=x.hit?1:0;});
  const D=oracleIdx();const key=mk==='ml'?'su':mk==='spread'?'ats':'ou';const per=[];
  if(D&&D.rec)Object.entries(D.rec).forEach(([k,R])=>{const r=R[sp]&&R[sp].all;const A=r&&r[key];if(A&&A[1]>=20&&k!=='public')per.push({k,w:A[0],n:A[1]});});
  const fam=per.filter(x=>oraIsPT(x.k)),oth=per.filter(x=>!oraIsPT(x.k));const rates=oth.map(x=>x.w/x.n);
  if(fam.length)rates.push(fam.reduce((s,x)=>s+x.w,0)/fam.reduce((s,x)=>s+x.n,0));
  const out=rates.length?rates.reduce((s,x)=>s+x,0)/rates.length:null,desk=dn>=30?dw/dn:null;
  const m=out!=null&&desk!=null?Math.max(0.75,Math.min(1.35,1+3*(out-desk))):1;
  return ORA_VS.c[ck]={out,desk,dn,m};}
const oraPct=x=>Math.round(x*100)+'%';
/* one side of a spread or total: the consensus edge, then each source's vote by its record on that bet type */
function oraGut(sp,R,mk,line,g){const isT=mk==='total';const sig=isT?(ORA_TSIG[sp]||14):(ORA_SIG[sp]||12);const e=isT?R.T-(+line):R.M+(+line);if(!isFinite(e))return null;
  const A=g.away.abbr,H=g.home.abbr;const sideLab=s=>s==='home'?H:s==='away'?A:s;const POS=isT?'over':'home',NEG=isT?'under':'away';
  let edge=100*(oraNc(e/sig)-0.5);const votes=[];
  /* he learns his sources before he leans on them: until two of the sources behind this read have 25+ graded picks at this
     bet type, the consensus edge counts at 60–100% */
  let kn=0;Object.entries(R.S).forEach(([k,v])=>{if(!v)return;const has=isT?v.tot!=null||v.pk||(v.pub&&v.pub.ou!=null):v.mg!=null||v.pk||v.xp||(v.pub&&v.pub.sp!=null);if(has&&oraRate(k,sp,mk).n>=25)kn+=oraIsPT(k)?0.1:1;});
  kn=Math.min(1,kn/2);const lrn=0.6+0.4*kn;edge*=lrn;
  const vote=(k,side,str,what)=>{const a=oraRate(k,sp,mk);if(a.n<15)return;const c=(a.r-0.5)*100*str;votes.push({k,side,c,what,a});};
  Object.entries(R.S).forEach(([k,v])=>{if(!v||oraIsPT(k))return;
    if(!isT&&v.mg!=null){const m=v.mg+(+line);if(Math.abs(m)>=0.5)vote(k,m>0?'home':'away',Math.min(1,Math.abs(m)/3),`${sideLab(m>0?'home':'away')} by ${Math.abs(v.mg).toFixed(1)}`);}
    if(isT&&v.tot!=null){const m=v.tot-(+line);if(Math.abs(m)>=0.5)vote(k,m>0?'over':'under',Math.min(1,Math.abs(m)/4),`${v.tot.toFixed(1)} total`);}
    if(v.pk)[].concat(v.pk).forEach(p=>{if(p.mk===mk)vote(k,p.side,p.st>=3?1.2:1,`${'★'.repeat(Math.max(1,Math.min(5,p.st||1)))} ${sideLab(p.side)}${p.line!=null&&!isT?' '+(p.line>0?'+':'')+p.line:p.line!=null?' '+p.line:''}`);});
    if(v.pub){const x=isT?v.pub.ou:v.pub.sp;if(x!=null&&Math.abs(x-50)>=8)vote(k,x>50?POS:NEG,Math.min(1,Math.abs(x-50)/25),`${Math.round(Math.max(x,100-x))}% ${k==='covers'?'of Covers players':'of the bets'} on ${sideLab(x>50?POS:NEG)}`);}
    if(v.xp&&!isT){const n=v.xp.a+v.xp.h;if(n>=3&&v.xp.a!==v.xp.h){const sd=v.xp.h>v.xp.a?'home':'away';const top=Math.max(v.xp.a,v.xp.h);vote(k,sd,Math.min(1,(top/n-0.5)*2.5),`${top} of ${n} experts on ${sideLab(sd)}`);}}});
  /* the family votes as one: each system with a record, the sum shrunk by √(how many voted) */
  let fam=0,fn=0;Object.entries(R.S).forEach(([k,v])=>{if(!oraIsPT(k)||isT||v.mg==null)return;const a=oraRate(k,sp,mk);if(a.n<25)return;const m=v.mg+(+line);if(Math.abs(m)<0.5)return;fam+=(m>0?1:-1)*(a.r-0.5)*100*Math.min(1,Math.abs(m)/3);fn++;});
  let vs=votes.reduce((s,o)=>s+(o.side===POS?o.c:-o.c),0)+(fn?fam/Math.sqrt(fn):0);vs=Math.max(-18,Math.min(18,vs));
  const VS=oraVsDesk(sp,mk);const S=(edge+vs)*VS.m;const side=S>=0?POS:NEG;const oG=Math.round(50+Math.min(42,Math.abs(S)));
  /* why, in his words */
  const why=[];const cons=isT?`outside consensus ${R.T.toFixed(1)} vs ${line}`:`outside consensus ${R.M>=0?H:A} by ${Math.abs(R.M).toFixed(1)} vs the line ${+line>0?'+':''}${line}`;why.push(cons);
  const named=Object.entries(R.S).filter(([k,v])=>v&&!oraIsPT(k)&&k!=='public').slice(0,4).map(([k,v])=>v.wp!=null&&!isT?`${oraShort(k)} ${v.wp>=0.5?H:A} ${oraPct(Math.max(v.wp,1-v.wp))}`:v.pa!=null?`${oraShort(k)} ${A} ${v.pa}–${v.ph} ${H}`:v.mg!=null&&!isT?`${oraShort(k)} ${v.mg>=0?H:A} by ${Math.abs(v.mg).toFixed(1)}`:null).filter(Boolean);
  if(named.length)why.push(named.join(' · '));
  if(!isT&&R.ptN)why.push(`${R.ptN} rating systems (Prediction Tracker): ${R.ptM>=0?H:A} by ${Math.abs(R.ptM).toFixed(1)}`);
  votes.filter(o=>Math.abs(o.c)>=1).sort((a,b)=>Math.abs(b.c)-Math.abs(a.c)).slice(0,5).forEach(o=>why.push(`${oraShort(o.k)}: ${o.what} — ${oraPct(o.a.w/o.a.n)} on ${o.a.n}${o.c<0?' (counts against it)':''}`));
  if(fn)why.push(`${fn} rating systems with records vote ${fam>=0?sideLab(POS):sideLab(NEG)}`);
  if(lrn<1)why.push(`still learning these sources (too few graded picks) — the consensus edge counts at ${Math.round(lrn*100)}%`);
  if(VS.m!==1&&VS.out!=null)why.push(`the outside world ${oraPct(VS.out)} vs the Desk ${oraPct(VS.desk)} on ${(typeof FC_SP!=='undefined'&&FC_SP[sp]||sp).replace(/^\S+ /,'')} ${isT?'totals':'spreads'} → ×${VS.m.toFixed(2)}`);
  return{side,oG,e,vs,m:VS.m,why};}

/* §4 · his calls — a score on every game he can read; sides and totals at 60+ logged, official at 70+ through the Coach;
   a moneyline only at 75+ inside −300…+250 ─────────────────────────────────────────────────────────────────────────── */
const ORA_PS={},ORA_G={};
function oracleCallsV2(sp,g,Ln,hl,hlSim,tl,tlSim,add,d,up){const R=oraGame(sp,g,hlSim?null:hl,tlSim?null:tl,d,up);if(!R||!R.n)return null;const K=sp+'|'+g.away.abbr+'@'+g.home.abbr;
  if(R.ps)ORA_PS[K]=R.ps;ORA_G[K]=R;const base=R.ps?{pa:R.ps.a,ph:R.ps.h}:{};Ln=Ln||{};
  if(hl!=null&&!hlSim&&R.M!=null){const G=oraGut(sp,R,'spread',hl,g);if(G&&G.oG>=60)add('Pred','spread',G.side,{...base,oG:G.oG,why:G.why});}
  if(R.pH!=null){const side=R.pH>=0.5?'home':'away';const oW=Math.round(100*Math.max(R.pH,1-R.pH));const L=side==='home'?Ln.mlH:Ln.mlA;const pr=L&&typeof amerOk==='function'?amerOk(L.price):L?L.price:null;
    if(oW>=75&&pr!=null&&+pr>=-300&&+pr<=250)add('Pred','ml',side,{...base,oG:oW,why:[`outside consensus ${side==='home'?g.home.abbr:g.away.abbr} ${oW}% to win (price ${+pr>0?'+':''}${pr})`]});}
  if(tl!=null&&!tlSim&&R.T!=null){const G=oraGut(sp,R,'total',tl,g);if(G&&G.oG>=60)add('Pred','total',G.side,{...base,oG:G.oG,why:G.why});}
  return R;}
function oraclePredFor(sp,g){return ORA_PS[sp+'|'+g.away.abbr+'@'+g.home.abbr]||null;}

/* §5 · his card — the sources board: who's been right, at what ──────────────────────────────────────────────────────── */
function oracleCardHtml(){try{const D=oracleIdx();if(!D||!D.rec)return'';const sps=['nfl','ncaaf','nba','ncaab','nhl'];const nm=s=>(typeof FC_SP!=='undefined'&&FC_SP[s])||s.toUpperCase();
  const wl=A=>A&&A[1]?`${A[0]}-${A[1]-A[0]} <span style="color:var(--mute)">${Math.round(100*A[0]/A[1])}%</span>`:'<span style="color:var(--mute)">—</span>';
  const rows=sp=>{const L=Object.entries(D.rec).map(([k,R])=>({k,r:R[sp]&&R[sp].all})).filter(o=>o.r&&o.r.n>=5);const up=oraUploadRec()[sp];if(up&&up.n>=5)L.push({k:'upload',r:up});if(!L.length)return'';
    const ats=o=>o.r.ats&&o.r.ats[1]>=10?o.r.ats[0]/o.r.ats[1]:-1;const fam=L.filter(o=>oraIsPT(o.k)).sort((a,b)=>ats(b)-ats(a)),oth=L.filter(o=>!oraIsPT(o.k)).sort((a,b)=>ats(b)-ats(a)||(b.r.su[0]/(b.r.su[1]||1))-(a.r.su[0]/(a.r.su[1]||1)));
    const tr=o=>`<tr><td>${txtEsc(oraShort(o.k))}</td><td>${wl(o.r.su)}</td><td>${wl(o.r.ats)}</td><td>${wl(o.r.ou)}</td><td>${o.r.br!=null?o.r.br.toFixed(3):o.r.mae!=null?'±'+o.r.mae:'—'}</td></tr>`;
    const VS=['spread','total'].map(mk=>{const v=oraVsDesk(sp,mk);return v.out!=null&&v.desk!=null?`${mk==='spread'?'spreads':'totals'}: outside ${oraPct(v.out)} vs the Desk ${oraPct(v.desk)}${v.m!==1?` → he ${v.m>1?'leans in':'pulls back'} ×${v.m.toFixed(2)}`:''}`:null;}).filter(Boolean);
    return`<details style="margin-top:4px"><summary class="mono" style="font-size:11px"><b>${nm(sp)}</b> · ${oth.length+(fam.length?1:0)} sources${fam.length?` (${fam.length} rating systems)`:''}</summary>
      <table class="mono" style="width:100%;font-size:10px;border-collapse:collapse"><tr style="color:var(--mute)"><td>source</td><td>winner</td><td>spread</td><td>total</td><td>Brier / miss</td></tr>${oth.map(tr).join('')}
      ${fam.length?`<tr><td colspan="5" style="color:var(--mute);padding-top:4px">best rating systems against the spread (of ${fam.length})</td></tr>${fam.slice(0,5).map(tr).join('')}`:''}</table>
      ${VS.length?`<div class="sub mono" style="font-size:9.5px;margin-top:3px">${VS.join(' · ')}</div>`:''}</details>`;};
  const body=sps.map(rows).join('');
  const V=(roGet(VOICES_KEY,[],30e3)||[]).filter(x=>x&&x.voice==='Pred'&&x.oG!=null&&x.date===today());
  const today_=V.length?`<div class="mono" style="font-size:10px;margin-top:6px"><b>Today</b>${V.slice(0,10).map(x=>`<div style="padding:2px 0;border-bottom:1px solid var(--rule)">${txtEsc(x.game)} · ${x.market} ${txtEsc(x.side)}${x.line!=null?' '+x.line:''} · <b>${x.oG}%</b>${typeof isOfficial==='function'&&isOfficial(x)?' ✅ official':''}<br><span style="color:var(--mute)">${txtEsc((x.why||[]).slice(0,3).join(' · '))}</span></div>`).join('')}</div>`:'';
  const live=Object.entries(D.src||{}).filter(([k,o])=>!oraIsPT(k)&&o&&o.ok).map(([k,o])=>`${txtEsc(o.lab)}${o.rest?' 💤':''}`);const ptn=Object.keys(D.src||{}).filter(oraIsPT).length;
  return`<div class="tkt ora-card" style="margin-top:8px;border-left:3px solid #e8c15a"><h3 style="margin:0 0 2px">🔮 The Oracle — the outside world's consensus</h3>
    <div class="sub mono" style="font-size:9.5px">Reads ${live.join(' · ')}${ptn?` · ${ptn} rating systems on the Prediction Tracker`:''}${Object.keys(oraUploadRec()).length?' · your uploads':''} — every source graded after every final. A source that loses counts against the side it takes.</div>
    ${body||'<div class="sub mono" style="font-size:10px;margin-top:4px">His sources start earning records as tonight\'s games go final.</div>'}${today_}</div>`;}catch(e){return'';}}
if(typeof window!=='undefined'&&!window.__ORA_CARD__){window.__ORA_CARD__=1;
  if(typeof dogCardHtml==='function'){const D0=dogCardHtml;dogCardHtml=function(){return D0()+oracleCardHtml();};}}
