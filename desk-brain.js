/* ═══ THE BRAIN, REBUILT — the tough middle (v2.95.0) ═════════════════════════════════════════════════════════════════
   Loaded on every sport page after desk-oracle.js.

   Nov 8, 2:46 AM: "The brain is supposed to make the smart choice… he's only answering easy questions… anyone can call a
   -10000 bet… but are you smart and tuff enough to handle everything between -350 and +350 and keep a winning record…
   which by nature should come with a unit increase… Find ways to give him the edge in that department independently!"
   And the Blend folds in: the Simulator-plus-market read is one of his inputs, not a voice of its own.

   What the audit found (every 70%+ call since Sep 1, priced honestly): between -350 and +350 every character was under
   water, and a model trained on the Desk's own signals lost money on days it hadn't seen. So the Brain reads what the
   literature says actually beats a sportsbook, and nothing it can't price:
     · THE GAP — the exchanges (Kalshi, Polymarket) and the outside consensus (the Oracle) against the book's no-vig price.
       Betting a soft book where a sharper market disagrees is the most durable edge there is.
     · STEAM — a favorite the line has moved toward (our season: +4–7%); a dog it moved toward has not paid.
     · THE LONGSHOT BIAS — long dogs are overbet (dogs past +350 returned -33% this season; the literature agrees).
     · THE PUBLIC — bookmakers shade the side the crowd loves (Levitt 2004); a lopsided Covers crowd is faded a touch.
   He bets only -350…+350, only when his chance × the payout clears the price by 3%+, one side per market — most games he
   passes. His weights start from those priors and are refit on his own graded picks every week.
   He starts on probation: every pick logged and graded, none official until 50 graded picks show units ≥ 0 and he beats
   the closing line on average. Then official when the edge is 4%+ (after the Coach's clipboard). His record is units and
   closing-line value — his hit rate lands where the prices put it (55–62% at these prices is excellent). */

const BRN_FROM='2026-11-08',BRN_LO=-350,BRN_HI=350,BRN_EV=0.03,BRN_EV_OFF=0.04,BRN_EV_LONG=0.06,BRN_PROVE=50;
const BRN_W0={gap:0.7,ora:0.2,steam:0.5,flb:1,pub:0.3};    /* prior weights (logit units per unit of each piece) */
const brnLg=p=>{p=Math.min(0.98,Math.max(0.02,p));return Math.log(p/(1-p));};
const brnSg=z=>1/(1+Math.exp(-z));
const brnImp=p=>{p=+p;if(!isFinite(p)||Math.abs(p)<100)return null;return p>0?100/(p+100):(-p)/((-p)+100);};
const brnDec=p=>{p=+p;return p>0?1+p/100:1+100/(-p);};
const brnNc=z=>typeof normCdf==='function'?normCdf(z):0.5*(1+Math.tanh(z*0.7978845608*(1+0.044715*z*z)));
const brnSig=sp=>(typeof ORA_SIG!=='undefined'&&ORA_SIG[sp])||12,brnTSig=sp=>(typeof ORA_TSIG!=='undefined'&&ORA_TSIG[sp])||14;

/* §1 · his weights: the priors, refit weekly on his own graded picks (ridge pulled toward the priors) ───────────── */
let BRN_WC=null;
function brainWeights(){const V=roGet(VOICES_KEY,[],60e3)||[];const wk=Math.floor((Date.parse(today())||0)/(7*864e5));const R=V.filter(x=>x&&x.voice==='Brain'&&x.bG!=null&&x.graded&&x.hit!=null&&!x.push&&x.bc&&x.fb>0&&x.fb<1);
  const sig=wk+'|'+R.length;if(BRN_WC&&BRN_WC.sig===sig)return BRN_WC.w;const K=Object.keys(BRN_W0);let w=K.map(k=>BRN_W0[k]);
  if(R.length>=40){const lam=30;for(let it=0;it<20;it++){const g=K.map((k,i)=>-lam*(w[i]-BRN_W0[k])),H=K.map((_,i)=>K.map((__,j)=>i===j?lam:0));
      R.forEach(x=>{const f=K.map(k=>+x.bc[k]||0);const z=brnLg(x.fb)+f.reduce((s,v,i)=>s+v*w[i],0);const p=brnSg(z),y=x.hit?1:0,q=p*(1-p);f.forEach((v,i)=>{g[i]+=(y-p)*v;f.forEach((u,j)=>H[i][j]+=q*v*u);});});
      const n=K.length,A=H.map((r,i)=>r.concat([g[i]]));for(let c=0;c<n;c++){let m=c;for(let r=c+1;r<n;r++)if(Math.abs(A[r][c])>Math.abs(A[m][c]))m=r;[A[c],A[m]]=[A[m],A[c]];const pv=A[c][c]||1e-9;for(let r=0;r<n;r++){if(r===c)continue;const f=A[r][c]/pv;for(let k=c;k<=n;k++)A[r][k]-=f*A[c][k];}}
      let mx=0;A.forEach((r,i)=>{const s=r[n]/(r[i]||1e-9);w[i]+=s;mx=Math.max(mx,Math.abs(s));});if(mx<1e-5)break;}
    w=w.map((v,i)=>Math.max(-1.5,Math.min(2,v)));}
  const out={};K.forEach((k,i)=>out[k]=+w[i].toFixed(3));out.n=R.length;BRN_WC={sig,w:out};return out;}

/* §2 · one side of one market: his chance, the pieces behind it, the edge ──────────────────────────────────────── */
function brainSide(sp,g,m,S,O,F,ln0,lnOp){const pr=S.price,po=S.oprice;const q=brnImp(pr),qo=brnImp(po);if(q==null||qo==null)return null;
  const fb=q/(q+qo);const W=brainWeights();const isH=S.sd==='home',isO=S.sd==='over';const why=[];const bc={gap:0,ora:0,steam:0,flb:0,pub:0};
  /* the gap: exchanges first (moneylines), then the outside consensus */
  if(m==='ml'&&F&&F.s){const xs=['kalshi','poly'].map(k=>F.s[k]&&F.s[k].wp).filter(v=>v>0.02&&v<0.98);if(xs.length){const ph=xs.reduce((s,v)=>s+v,0)/xs.length;const fx=isH?ph:1-ph;bc.gap=+(brnLg(fx)-brnLg(fb)).toFixed(4);
      if(Math.abs(fx-fb)>=0.01)why.push(`the exchanges ${Math.round(fx*100)}% vs the book's ${Math.round(fb*100)}%`);}}
  if(O){let po2=null;if(m==='ml'&&O.pH!=null)po2=isH?O.pH:1-O.pH;
    else if(m==='spread'&&O.M!=null&&S.line!=null){const hl=isH?+S.line:-S.line;const pc=brnNc((O.M+hl)/brnSig(sp));po2=isH?pc:1-pc;}
    else if(m==='total'&&O.T!=null&&S.line!=null){const p=brnNc((O.T-(+S.line))/brnTSig(sp));po2=isO?p:1-p;}
    /* he trusts the outside consensus as far as its sources have proven themselves at this bet type (half weight until two have 25+ graded picks) */
    let kn=0;try{if(F&&F.s&&typeof oraRate==='function')Object.keys(F.s).forEach(k=>{if(oraRate(k,sp,m).n>=25)kn+=String(k).startsWith('pt.')?0.1:1;});}catch(e){}kn=Math.min(1,kn/2);
    if(po2!=null&&po2>0.02&&po2<0.98){bc.ora=+((brnLg(po2)-brnLg(fb))*(0.5+0.5*kn)).toFixed(4);if(Math.abs(po2-fb)>=0.02)why.push(`the outside consensus ${Math.round(po2*100)}%${kn<1?' (its sources still earning records)':''}`);}}
  /* steam: how far the market moved toward this side since it opened (favorites only — dogs it moved toward haven't paid) */
  if(lnOp&&ln0){let mv=null;
    if(m==='ml'&&lnOp.mlH!=null&&lnOp.mlA!=null&&ln0.mlH!=null&&ln0.mlA!=null){const h0=brnImp(lnOp.mlH),a0=brnImp(lnOp.mlA),h1=brnImp(ln0.mlH),a1=brnImp(ln0.mlA);if(h0&&a0&&h1&&a1){const d=h1/(h1+a1)-h0/(h0+a0);mv=isH?d:-d;}}
    else if(m==='spread'&&lnOp.spH!=null&&ln0.spH!=null){const d=(lnOp.spH-ln0.spH)*0.4/brnSig(sp);mv=isH?d:-d;}
    else if(m==='total'&&lnOp.tot!=null&&ln0.tot!=null){const d=(ln0.tot-lnOp.tot)*0.4/brnTSig(sp);mv=isO?d:-d;}
    const fav=m==='total'?true:(m==='spread'?(S.line!=null&&+S.line<0):+pr<0);
    if(mv!=null&&mv>0.005&&fav){bc.steam=+Math.min(0.15,mv*4).toFixed(4);why.push(`the line moved ${m==='ml'?Math.round(mv*100)+' pts of win chance':'toward it'} since it opened`);}}
  /* the longshot bias: past +150 the crowd overpays */
  if(m==='ml'&&+pr>150){bc.flb=+(-0.08*(brnDec(pr)-2.5)).toFixed(4);why.push(`a ${pr>0?'+':''}${pr} dog — longshots are overbet`);}
  /* the public: a lopsided crowd (Covers players, the betting public) gets faded a touch */
  if(F&&F.s&&m!=='ml'){const cv=F.s.covers&&F.s.covers.pub,pb=F.s.public&&F.s.public.pub;const x=m==='total'?(pb&&pb.ou):((cv&&cv.sp)!=null?cv.sp:(pb&&pb.sp));
    if(x!=null&&Math.abs(x-50)>=15){const mine=m==='total'?(isO?x:100-x):(isH?x:100-x);bc.pub=+(-(mine-50)/100).toFixed(4);why.push(`${Math.round(mine)}% of the crowd on this side`);}}
  const z=brnLg(fb)+Object.keys(bc).reduce((s,k)=>s+bc[k]*(W[k]!=null?W[k]:BRN_W0[k]),0);const p=brnSg(z);
  return{sd:S.sd,line:S.line,price:pr,fb,p,ev:p*brnDec(pr)-1,bc,why};}

/* §3 · his calls: every market of every game read, a pick only where the edge is real ───────────────────────────── */
const BRN_PS={};
function brainToughCalls(sp,g,m,sides,Ln,add){if(!sides||sides.length!==2)return false;const d=(g&&g.__date)||today();if(d<BRN_FROM)return false;
  const F=typeof oracleFile==='function'?oracleFile(sp,g.away.abbr,g.home.abbr,d):null;
  let O=null;try{const K=sp+'|'+g.away.abbr+'@'+g.home.abbr;O=(typeof ORA_G!=='undefined'&&ORA_G[K])||null;}catch(e){}
  const ln0=F&&F.ln?F.ln:null,lnOp=F&&F.op?F.op:null;
  const R=sides.map((S,i)=>brainSide(sp,g,m,{...S,oprice:sides[1-i].price},O,F,ln0,lnOp)).filter(Boolean);if(R.length!==2)return false;
  const K=sp+'|'+g.away.abbr+'@'+g.home.abbr;const P=BRN_PS[K]||(BRN_PS[K]={});const home=R.find(r=>r.sd==='home'||r.sd==='over');
  if(home){if(m==='ml')P.pH=home.p;if(m==='spread'){P.pc=home.p;P.hl=home.line;}if(m==='total'){P.po=home.p;P.tl=home.line;}}
  const ok=r=>m!=='ml'||(+r.price>=BRN_LO&&+r.price<=BRN_HI);const best=R.filter(ok).sort((a,b)=>b.ev-a.ev)[0];
  if(!best||best.ev<BRN_EV||(m==='ml'&&+best.price>250&&best.ev<BRN_EV_LONG))return true;
  add('Brain',m,best.sd,{bG:Math.round(best.p*100),ev:+best.ev.toFixed(4),fb:+best.fb.toFixed(4),bc:best.bc,simP:+best.p.toFixed(4),mktP:+best.fb.toFixed(4),
    why:[`edge ${best.ev>=0?'+':''}${(best.ev*100).toFixed(1)}% — his ${Math.round(best.p*100)}% vs the price's ${Math.round(100/brnDec(best.price))}%`].concat(best.why.length?best.why:['the book\'s own number, nothing to beat it'])});
  return true;}
/* his score: the margin and total his chances imply (spread first, then the moneyline; the book's total, moved by his) */
function brainPredFor(sp,g){const P=BRN_PS[sp+'|'+g.away.abbr+'@'+g.home.abbr];if(!P)return null;const sig=brnSig(sp),tsig=brnTSig(sp);const pb=typeof oraProbit==='function'?oraProbit:null;if(!pb)return null;
  let M=null;if(P.pc!=null&&P.hl!=null)M=-(+P.hl)+sig*pb(P.pc);else if(P.pH!=null)M=sig*pb(P.pH);if(M==null)return null;
  let T=P.tl!=null&&P.po!=null?+P.tl+tsig*pb(P.po):null;if(T==null){const O=typeof ORA_G!=='undefined'?ORA_G[sp+'|'+g.away.abbr+'@'+g.home.abbr]:null;T=O&&O.T!=null?O.T:(typeof ORA_AVG!=='undefined'?ORA_AVG[sp]:null);}
  return T==null?null:{a:+((T-M)/2).toFixed(1),h:+((T+M)/2).toFixed(1)};}

/* §4 · probation, then official ───────────────────────────────────────────────────────────────────────────────── */
let BRN_PR=null;
function brainProof(){const V=roGet(VOICES_KEY,[],60e3)||[];const sig=(typeof ledgerSig==='function'?ledgerSig(V):V.length);if(BRN_PR&&BRN_PR.sig===sig)return BRN_PR.v;
  let w=0,l=0,u=0,cn=0,cs=0;V.forEach(x=>{if(!x||x.voice!=='Brain'||x.bG==null||!x.graded||x.hit==null||x.push||String(x.date).slice(0,10)<BRN_FROM)return;x.hit?w++:l++;u+=+x.units||0;if(x.clv!=null&&isFinite(x.clv)){cn++;cs+=+x.clv;}});
  const n=w+l,clv=cn?cs/cn:null;const v={w,l,n,u:+u.toFixed(2),clv:clv!=null?+clv.toFixed(2):null,proven:n>=BRN_PROVE&&u>=0&&(clv==null||clv>=0)};BRN_PR={sig,v};return v;}
function brainOfficial(x){if(!x||x.bG==null||!brainProof().proven)return false;if(x.market==='ml'&&!(+x.price>=BRN_LO&&+x.price<=BRN_HI))return false;
  let p=x.bG/100;try{if(typeof coachConf==='function'){const c=coachConf(x);if(c!=null)p=c;}}catch(e){}
  const ev=p*brnDec(x.price)-1;return ev>=BRN_EV_OFF-1e-9&&!x.kof&&(typeof confPriced!=='function'||confPriced(x))&&(typeof confPre!=='function'||!confPre(x));}

/* §5 · his card ─────────────────────────────────────────────────────────────────────────────────────────────────── */
function brainCardHtml(){try{const P=brainProof(),W=brainWeights();const V=(roGet(VOICES_KEY,[],30e3)||[]).filter(x=>x&&x.voice==='Brain'&&x.bG!=null);
  const by={};V.forEach(x=>{if(!x.graded||x.hit==null||x.push||!x.bc)return;const top=Object.entries(x.bc).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))[0];const k=top&&Math.abs(top[1])>0.001?top[0]:'book';const o=by[k]||(by[k]={w:0,l:0,u:0});x.hit?o.w++:o.l++;o.u+=+x.units||0;});
  const lab={gap:'the gap (exchanges / consensus vs the book)',ora:'the outside consensus',steam:'steam',flb:'longshot fades',pub:'fading the crowd',book:'the book\'s own number'};
  const td=V.filter(x=>x.date===today());const uS=u=>`<b style="color:${u>=0?'var(--win)':'var(--rust)'}">${u>=0?'+':''}${(+u).toFixed(1)}u</b>`;
  return`<div class="tkt brn-card" style="margin-top:8px;border-left:3px solid #b48cff"><h3 style="margin:0 0 2px">🧠 The Brain — the tough middle</h3>
    <div class="sub mono" style="font-size:9.5px">Only -350…+350. A pick only when his chance beats the price by 3%+ — most games he passes. Judged on units and closing-line value, not hit rate.</div>
    <div class="mono" style="font-size:10.5px;margin:5px 0">${P.proven?'✅ <b>Proven</b> — official when the edge is 4%+':`🎓 <b>On probation</b> — ${P.n} of ${BRN_PROVE} graded picks; official once units ≥ 0 and he beats the close`} · ${P.w}-${P.l} ${uS(P.u)}${P.clv!=null?` · CLV ${P.clv>=0?'+':''}${P.clv}`:''}</div>
    ${Object.keys(by).length?`<div class="mono" style="font-size:10px;color:var(--mute)">By what drove the pick: ${Object.entries(by).map(([k,o])=>`${lab[k]||k} ${o.w}-${o.l} ${uS(o.u)}`).join(' · ')}</div>`:''}
    <div class="mono" style="font-size:9.5px;color:var(--mute);margin-top:3px">His weights${W.n>=40?` (refit on ${W.n} of his picks)`:' (the starting priors)'}: gap ${W.gap} · consensus ${W.ora} · steam ${W.steam} · longshot ${W.flb} · crowd ${W.pub}</div>
    ${td.length?`<div class="mono" style="font-size:10px;margin-top:6px"><b>Today</b>${td.slice(0,10).map(x=>`<div style="padding:2px 0;border-bottom:1px solid var(--rule)">${txtEsc(x.game)} · ${x.market} ${txtEsc(x.side)}${x.line!=null?' '+x.line:''} ${x.price!=null?'('+(x.price>0?'+':'')+x.price+')':''} · <b>${x.bG}%</b> · edge ${(x.ev*100).toFixed(1)}%${typeof isOfficial==='function'&&isOfficial(x)?' ✅':''}<br><span style="color:var(--mute)">${txtEsc((x.why||[]).slice(1,4).join(' · '))}</span></div>`).join('')}</div>`:'<div class="sub mono" style="font-size:10px;margin-top:4px">No edge worth taking on today\'s board yet — that\'s the job.</div>'}</div>`;}catch(e){return'';}}
if(typeof window!=='undefined'&&!window.__BRN_CARD__){window.__BRN_CARD__=1;
  if(typeof dogCardHtml==='function'){const D0=dogCardHtml;dogCardHtml=function(){return D0()+brainCardHtml();};}}
