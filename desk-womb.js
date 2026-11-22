/* ═══ BLOODLINES 2.0 · PHASE 1 (v3.2.0) — DNA, COURTSHIP, THE GOOSEBUMPS RULE, THE WOMB ═══════════════════════════════════
   Loaded on every sport page after desk-gen.js.

   Chris, Nov 22: "characters with the best traits would get with another character and blend their minds… heirs are only born
   when they have proven to be better than both parents all around… the type of child you end up with depends on what type of
   records the parents were running." Phase 1 builds everything up to the birth. Nothing here changes a pick.

   §1 · DNA. Every character's genome is read off its own ledger, nothing invented: its lanes (sport × bet type × side), with units
        shrunk toward zero until the sample earns them (dominant genes: proven and paying; recessive: paying, not proven; scars:
        lanes that keep costing it); its price comfort; its beliefs (the situations it bets on and what they paid); its
        temperament (how honest its confidence is, how it plays after a win and after a loss, how often it takes plus money);
        its score sense (exact scores against the cast's rate); its form (the last 14 days against its season) and its style.
   §2 · COURTSHIP. Who pairs: COVERAGE (a child taking the better parent in every lane beats the better parent alone),
        CHEMISTRY (when they agree they hit more; when they split, one is reliably right) and both PROVEN (150+ graded calls,
        2+ dominant genes, honest confidence, still calling games). A slump doesn't stop a pairing: it shapes the child.
   §3 · THE GOOSEBUMPS RULE. The child's type comes from the records its parents were running at conception: a temperament from
        their form (both hot → Prodigy, both cold → Rebel, one of each → Prodigal, neither → Steady) and a craft from their style
        (two score callers → Seer, a sides mind and a totals mind → Architect, two dog hunters → Longshot, two chalk grinders →
        Grinder, otherwise an All-rounder). Same parents, another stretch of the season, another child.
   §4 · THE WOMB. A courtship conceives embryos, each fixed from only what was known before its conception: in every lane the
        stronger parent's gene is dominant; every parental scar is inherited as a VACCINE (no official call there, 55% at most);
        the temperament bends the genes (the Rebel fades a parent in the lanes that are sinking it, the Prodigy sharpens in the hot
        lanes, the Prodigal follows the hot parent); the craft leans on prices; a mutation varies a sibling. Embryos read every
        game after conception in the shadows (each day only from the days before it), never posted, and never call a side
        without a real line. One is DUE only when, on games it never saw, it beat BOTH parents past luck (2σ+ on 100+ calls
        against each, 10+ days; the bar rises with every embryo tried), its official calls made at least as much money as each
        parent's, and it was no worse than either parent (within a standard error) inside that parent's own best lanes.
        Clearly worse than either, or four weeks without clearing every bar: lost, and the parents try again (four embryos a
        litter at most; a pair that loses all four rests two weeks). Nothing is backdated: a litter conceived today is judged
        only on games from tomorrow on. Phase 2 brings a due embryo into the world. */

const WOMB_KEY='d4.womb',WOMB_PREVIEW=14,WOMB_SLOTS=3,WOMB_EMB=2,WOMB_MAX_EMB=4,WOMB_MIN_N=100,WOMB_MIN_DAYS=10,WOMB_BAR=2.0,WOMB_LUCK=0.25,
  WOMB_K=12,WOMB_CAL=40,WOMB_RESPECT_N=15,WOMB_REST=14,WOMB_MAX_DAYS=28;
const WB_SPN={nfl:'NFL',ncaaf:'CFB',nba:'NBA',ncaab:'CBB',nhl:'NHL',mlb:'MLB'};
const WB_ROLE={'ml|fav':'ML favorites','ml|dog':'ML dogs','ml|heavy':'heavy ML favorites','spread|fav':'spread favorites','spread|dog':'spread dogs','total|over':'overs','total|under':'unders'};
const wbLaneLab=k=>{const[sp,m,r]=String(k).split('|');return`${WB_SPN[sp]||String(sp||'').toUpperCase()} ${WB_ROLE[m+'|'+r]||r||''}`.trim();};
const WB_OTHER={home:'away',away:'home',over:'under',under:'over'};
const WB_BANDS=['chalk','fav','coin','plus','long'];
const WB_BAND_LAB={chalk:'chalk (−200 or shorter)',fav:'favorites (−199 to −115)',coin:'coin flips (−114 to +114)',plus:'plus money (+115 to +250)',long:'long shots (+251 and up)'};
const WB_TEMPER={Prodigy:'rides its parents\' hot lanes harder',Rebel:'fades the spots that sank its parents',Prodigal:'follows the hot parent, respects the cold one',Steady:'leans on the market as the check'};
const WB_CRAFT={Seer:'a score caller',Architect:'builds the final score: totals from one parent, sides from the other',Longshot:'a plus-money specialist',Grinder:'low variance, chalk and discipline','All-rounder':'plays every lane its parents earned'};
const wbNm=v=>(CHARS[v]&&CHARS[v].label)||v;
const wbSh=v=>wbNm(v).replace(/^The /,'');
const wbU=x=>(x>=0?'+':'−')+Math.abs(+x||0).toFixed(1)+'u';
/* the lane a side belongs to: the Forecast's lanes (totals by side, spreads by the sign of the line, moneylines by price) */
function wbRole(m,side,line,price){if(m==='total')return/under/i.test(String(side))?'under':'over';
  if(m==='spread')return line!=null&&isFinite(+line)&&+line<0?'fav':line!=null&&isFinite(+line)&&+line>0?'dog':(+price<0?'fav':'dog');
  return+price<=-500?'heavy':+price<0?'fav':'dog';}
const wbBand=p=>{p=+p;return p<=-200?'chalk':p<=-115?'fav':p<115?'coin':p<=250?'plus':'long';};
const wbSg=z=>1/(1+Math.exp(-z));
const wbLg=p=>{p=Math.max(0.02,Math.min(0.98,+p));return Math.log(p/(1-p));};
const wbMkt=pr=>pr==null?null:Math.max(0.03,Math.min(0.97,imp(+pr)*0.955+0.0225));
function wbUnits(c){if(c.push)return 0;const p=+c.price;if(!isFinite(p)||Math.abs(p)<100)return 0;return c.hit?americanToDecimal(p)-1:-1;}

/* ── the index: every real price by side (any voice, the book included), each character's calls, every market two of them met ── */
let WB_IX=null;
function wbIndex(force){const V=roGet(VOICES_KEY,[],30e3)||[];const sig=(typeof ledgerSig==='function'?ledgerSig(V):String(V.length))+'|'+today();
  if(!force&&WB_IX&&WB_IX.sig===sig)return WB_IX;
  const byV={},book=new Map(),groups=new Map();
  V.forEach(x=>{if(!x||!x.sp||!x.game||!x.date)return;const m=x.market==='moneyline'?'ml':x.market;if(m!=='ml'&&m!=='spread'&&m!=='total')return;
    if(typeof noLineCall==='function'&&noLineCall(x))return;const pr=amerOk(x.price);if(pr==null||Math.abs(pr)<100)return;   /* no line, no pick */
    const d=String(x.date).slice(0,10),gk=x.sp+'|'+x.game+'|'+d+'|'+m,bk=gk+'|'+x.side;
    let b=book.get(bk);if(!b){b={price:pr,line:x.line!=null&&isFinite(+x.line)?+x.line:null,hit:null,push:false};book.set(bk,b);}
    if(x.graded){if(x.push)b.push=true;else if(x.hit!=null)b.hit=!!x.hit;}
    if(!CHARS[x.voice]||(typeof confPre==='function'&&confPre(x)))return;
    const graded=!!x.graded&&(!!x.push||x.hit!=null);
    const c={id:x.id,v:x.voice,sp:x.sp,game:x.game,d,m,gk,side:x.side,line:x.line!=null&&isFinite(+x.line)?+x.line:null,price:pr,p:confOf(x),graded,hit:x.hit==null?null:!!x.hit,push:!!x.push,f:Array.isArray(x.f)?x.f:[]};
    c.lane=x.sp+'|'+m+'|'+wbRole(m,x.side,c.line,pr);c.u=graded?wbUnits(c):0;
    (byV[x.voice]=byV[x.voice]||[]).push(c);
    let g=groups.get(gk);if(!g){g={k:gk,sp:x.sp,game:x.game,d,m,c:{}};groups.set(gk,g);}g.c[x.voice]=c;});
  Object.values(byV).forEach(L=>L.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0));
  const G=[...groups.values()].sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  WB_IX={sig,byV,book,G,SS:{}};return WB_IX;}
/* a side's real price, line and lane (a side nobody priced has no price: it can't be called) */
function wbSide(IX,g,s){const b=IX.book.get(g.k+'|'+s),o=IX.book.get(g.k+'|'+WB_OTHER[s]);
  const line=b&&b.line!=null?b.line:(o&&o.line!=null&&g.m==='spread'?-o.line:o&&o.line!=null&&g.m==='total'?o.line:null);
  const price=b?b.price:null;const rp=price!=null?price:(o?(o.price<0?150:-150):null);
  return{price,line,lane:g.sp+'|'+g.m+'|'+wbRole(g.m,s,line,rp)};}
/* a side's result, from any graded call on it or on the other side */
function wbResult(IX,gk,side){const b=IX.book.get(gk+'|'+side),o=IX.book.get(gk+'|'+WB_OTHER[side]);
  if((b&&b.push)||(o&&o.push))return'push';if(b&&b.hit!=null)return b.hit?'w':'l';if(o&&o.hit!=null)return o.hit?'l':'w';return null;}

/* ── §1 · DNA ── */
function wbScoreSense(asOf,IX){IX=IX||wbIndex();if(IX.SS[asOf])return IX.SS[asOf];
  const L=Object.values(roGet(SCORECALL_KEY,{})||{}).filter(x=>x&&x.graded&&String(x.date).slice(0,10)<asOf);const sp={},byV={};
  L.forEach(x=>{const s=sp[x.sp]||(sp[x.sp]={n:0,e:0});s.n++;s.e+=x.exact?1:0;});
  L.forEach(x=>{const o=byV[x.voice]||(byV[x.voice]={n:0,e:0,base:0,err:0});const s=sp[x.sp];o.n++;o.e+=x.exact?1:0;o.base+=s.n?s.e/s.n:0;o.err+=+x.err||0;});
  Object.values(byV).forEach(o=>{o.rate=o.n?o.e/o.n:0;o.mult=(o.e+1)/(o.base+1);o.err=o.n?o.err/o.n:null;});
  return(IX.SS[asOf]=byV);}
const WB_SIDE_TAGS=new Set(['fav','dog','home','road','over','under','bigfav','longdog']);
function dnaOf(v,asOf,IX){IX=IX||wbIndex();asOf=asOf||dayShift(today(),1);const all=(IX.byV[v]||[]).filter(c=>c.d<asOf);const G=all.filter(c=>c.graded&&!c.push);
  const lanes={},bands={},bel={},recent={};let w=0,u=0,cn=0,cs=0,ch=0,plus=0,prev=null;const aw={n:0,w:0},al={n:0,w:0};const from14=dayShift(asOf,-14);let rn=0,rw=0,ru=0;
  G.forEach(c=>{if(c.hit)w++;u+=c.u;
    const o=lanes[c.lane]||(lanes[c.lane]={n:0,w:0,u:0});o.n++;if(c.hit)o.w++;o.u+=c.u;
    const bd=wbBand(c.price),b=bands[bd]||(bands[bd]={n:0,w:0,u:0});b.n++;if(c.hit)b.w++;b.u+=c.u;if(c.price>=115)plus++;
    c.f.forEach(t=>{if(WB_SIDE_TAGS.has(t))return;const k=c.sp+'|'+t,e=bel[k]||(bel[k]={n:0,w:0,u:0});e.n++;if(c.hit)e.w++;e.u+=c.u;});
    if(c.p!=null&&isFinite(c.p)){cn++;cs+=+c.p;ch+=c.hit?1:0;}
    if(prev!=null){const s=prev?aw:al;s.n++;if(c.hit)s.w++;}prev=c.hit;
    if(c.d>=from14){rn++;if(c.hit)rw++;ru+=c.u;const r=recent[c.lane]||(recent[c.lane]={n:0,u:0});r.n++;r.u+=c.u;}});
  const K=WOMB_K;Object.values(lanes).forEach(o=>{o.val=o.u*o.n/(o.n+K);o.r=o.u/(o.n+K);o.dom=o.n>=12&&o.r>=0.05;o.scar=o.n>=10&&o.u<=-3&&o.r<=-0.08;});
  const ks=Object.keys(lanes);const dom=ks.filter(k=>lanes[k].dom).sort((a,b)=>lanes[b].val-lanes[a].val);
  const scars=ks.filter(k=>lanes[k].scar).sort((a,b)=>lanes[a].val-lanes[b].val);const rec=ks.filter(k=>!lanes[k].dom&&!lanes[k].scar&&lanes[k].val>0).sort((a,b)=>lanes[b].val-lanes[a].val);
  const n=G.length,upc=n?u/n:0,rupc=rn?ru/rn:0;
  /* form: hot or cold in money terms (5+ units at 5%+ a call over the last 14 days) or against its own season past luck (1.25σ) */
  const fz=rn?(ru-rn*upc)/Math.sqrt(rn):0;
  const state=rn<20?'steady':((ru>=5&&rupc>=0.05)||(fz>=1.25&&ru>0))?'hot':((ru<=-5&&rupc<=-0.05)||(fz<=-1.25&&ru<0))?'cold':'steady';
  const pos=k=>Math.max(0,(bands[k]||{}).u||0);let totU=0,sideU=0;ks.forEach(k=>{const vv=Math.max(0,lanes[k].val);if(k.split('|')[1]==='total')totU+=vv;else sideU+=vv;});
  const B=Object.entries(bel).map(([k,o])=>({k,sp:k.split('|')[0],t:k.split('|').slice(1).join('|'),...o,val:o.u*o.n/(o.n+K)})).filter(o=>o.n>=8);
  const SS=wbScoreSense(asOf,IX)[v]||null;const last=all.length?all[all.length-1].d:null;
  return{v,asOf,n,w,u:+u.toFixed(2),upc,lanes,dom,rec,scars,bands,recent,
    beliefs:{paying:B.filter(o=>o.val>0).sort((a,b)=>b.val-a.val).slice(0,6),costing:B.filter(o=>o.val<0).sort((a,b)=>a.val-b.val).slice(0,6)},
    honest:cn?{n:cn,conf:cs/cn,hit:ch/cn,gap:cs/cn-ch/cn}:null,
    temper:{afterW:aw.n>=10?aw.w/aw.n:null,afterL:al.n>=10?al.w/al.n:null,plus:n?plus/n:0},
    score:SS&&SS.n?{n:SS.n,exact:SS.e,rate:SS.rate,mult:SS.mult,err:SS.err}:null,
    form:{state,n:rn,w:rw,u:+ru.toFixed(2),upc:rupc,season:upc},
    style:{chalkU:pos('chalk')+pos('fav'),dogU:pos('plus')+pos('long'),totU,sideU},
    last,active:!!last&&last>=dayShift(asOf,-7)};}

/* ── §2 · courtship ── */
function wbChem(a,b,asOf,IX,dA,dB){let ag=0,agw=0,sp=0,spa=0;
  IX.G.forEach(g=>{if(g.d>=asOf)return;const A=g.c[a],B=g.c[b];if(!A||!B||!A.graded||!B.graded||A.push||B.push)return;if(A.side===B.side){ag++;if(A.hit)agw++;}else{sp++;if(A.hit)spa++;}});
  const base=((dA.n?dA.w/dA.n:0.5)+(dB.n?dB.w/dB.n:0.5))/2;const agr=(agw+20*base)/(ag+20);const lift=agr-base;
  const sr=sp?(spa+10*0.5)/(sp+10):0.5;const split=Math.abs(sr-0.5);
  return{ag,agw,sp,spa,base,agr,lift,split,right:sr>=0.5?a:b};}
const wbEligible=()=>CHAR_ORDER.filter(v=>CHARS[v]&&!META_VOICES.has(v));
const wbProven=d=>!!d&&d.active&&d.n>=150&&d.dom.length>=2&&!!d.honest&&Math.abs(d.honest.gap)<=0.10;
function wbCourt(asOf,IX,busy){IX=IX||wbIndex();busy=busy||new Set();const E=wbEligible();const D={};E.forEach(v=>{D[v]=dnaOf(v,asOf,IX);});
  const P=[];for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++){const a=E[i],b=E[j];if(!wbProven(D[a])||!wbProven(D[b]))continue;
    const keys=new Set([...Object.keys(D[a].lanes),...Object.keys(D[b].lanes)]);let cov=0,sa=0,sb=0;
    keys.forEach(k=>{const va=(D[a].lanes[k]||{}).val||0,vb=(D[b].lanes[k]||{}).val||0;cov+=Math.max(va,vb,0);sa+=Math.max(va,0);sb+=Math.max(vb,0);});
    const gain=cov-Math.max(sa,sb);if(gain<=0)continue;const comp=gain/(Math.max(sa,sb)+5);const ch=wbChem(a,b,asOf,IX,D[a],D[b]);
    P.push({a,b,gain:+gain.toFixed(2),comp,ch,score:comp+3*ch.lift+ch.split,busy:busy.has(a)||busy.has(b)});}
  P.sort((x,y)=>y.score-x.score);return{D,P};}

/* ── §3 · the Goosebumps rule ── */
function wbArch(dA,dB){const fa=dA.form.state,fb=dB.form.state,hot=[fa,fb].filter(s=>s==='hot').length,cold=[fa,fb].filter(s=>s==='cold').length;
  const temper=hot&&cold?'Prodigal':hot?'Prodigy':cold?'Rebel':'Steady';
  const sh=(x,y)=>x+y>0?x/(x+y):0.5;const tA=sh(dA.style.totU,dA.style.sideU),tB=sh(dB.style.totU,dB.style.sideU),cA=sh(dA.style.chalkU,dA.style.dogU),cB=sh(dB.style.chalkU,dB.style.dogU);
  const sA=dA.score,sB=dB.score;
  const craft=sA&&sB&&sA.n>=30&&sB.n>=30&&sA.mult>=1.3&&sB.mult>=1.3?'Seer':(tA>=0.6&&tB<=0.4)||(tB>=0.6&&tA<=0.4)?'Architect':cA<=0.4&&cB<=0.4?'Longshot':cA>=0.6&&cB>=0.6?'Grinder':'All-rounder';
  const fw=d=>d.form.state==='hot'?`${wbNm(d.v)} was running hot (${wbU(d.form.u)} over its last 14 days, ${d.form.upc>=0?'+':''}${d.form.upc.toFixed(2)}u a call against ${d.upc>=0?'+':''}${d.upc.toFixed(2)} on the season)`
    :d.form.state==='cold'?`${wbNm(d.v)} was slumping (${wbU(d.form.u)} over its last 14 days)`:`${wbNm(d.v)} was steady`;
  const cw=craft==='Seer'?`both call exact scores well (${sA.mult.toFixed(1)}× and ${sB.mult.toFixed(1)}× the cast's rate)`:craft==='Architect'?`one makes its money on totals, the other on sides`
    :craft==='Longshot'?`both make their money at plus prices`:craft==='Grinder'?`both make their money on favorites`:`their money comes from everywhere`;
  return{temper,craft,label:`${temper} ${craft}`,why:`${fw(dA)}; ${fw(dB).replace(/^The /,'the ')}. ${cw.charAt(0).toUpperCase()+cw.slice(1)}. So: a ${temper} (${WB_TEMPER[temper]}), ${WB_CRAFT[craft]}.`,
    tot:tA>=tB?'a':'b',side:tA>=tB?'b':'a',seer:sA&&sB?(sA.mult>=sB.mult?'a':'b'):null};}

/* ── §4 · the womb ── */
const WB_MUTS=[[],[['b',0.5]],[['T',0.85]],[['contrast',1.6]],[['b',0.2]],[['T',1.15]]];
const WB_MUT_LAB={b:'how much it leans on the market',T:'how bold it is',contrast:'how hard the stronger parent wins a lane'};
function wbBrief(d){return{n:d.n,w:d.w,u:d.u,form:d.form.state,fu:d.form.u,dom:d.dom.slice(0,4),scars:d.scars.slice(0,3)};}
function wbRecipe(dA,dB,arch,k){const mut=WB_MUTS[k%WB_MUTS.length];const P={b:arch.temper==='Steady'?0.45:0.35,T:1,contrast:1};mut.forEach(([f,v])=>{P[f]=v;});
  const trust=v=>Math.max(0.25,Math.min(2,1+v/4));const lanes={},vacc=[],fade=[],hot=[];
  new Set([...Object.keys(dA.lanes),...Object.keys(dB.lanes)]).forEach(k=>{const a=dA.lanes[k],b=dB.lanes[k],va=a?a.val:0,vb=b?b.val:0;
    let wa=trust(va),wb=trust(vb);if(va>=vb)wb*=0.6;else wa*=0.6;   /* the dominant gene wins the lane */
    if(P.contrast!==1){wa=Math.pow(wa,P.contrast);wb=Math.pow(wb,P.contrast);}
    if(arch.temper==='Prodigal'){if(dA.form.state==='hot'){wa*=1.3;wb*=0.7;}else if(dB.form.state==='hot'){wb*=1.3;wa*=0.7;}}
    if(arch.craft==='Architect'){const tl=k.split('|')[1]==='total';if((tl?arch.tot:arch.side)==='a')wa*=1.3;else wb*=1.3;}
    if(arch.craft==='Seer'&&arch.seer){if(arch.seer==='a')wa*=1.2;else wb*=1.2;}
    const ra=dA.recent[k],rb=dB.recent[k];
    /* a real pattern only: 10+ calls in the last 14 days, losing (or winning) 15%+ a call */
    const sink=r=>r&&r.n>=10&&r.u<=-3&&r.u/r.n<=-0.15,heat=r=>r&&r.n>=10&&r.u>=3&&r.u/r.n>=0.15;
    if(arch.temper==='Rebel'){let f=0;if(sink(ra)){wa=-0.5*Math.abs(wa);f=1;}if(sink(rb)){wb=-0.5*Math.abs(wb);f=1;}if(f)fade.push(k);}   /* rebellion: fade a parent where it's sinking */
    let t=0;if(arch.temper==='Prodigy'&&(heat(ra)||heat(rb))){t=0.85;hot.push(k);}
    /* a parent's scar: that parent has no say in the lane, and unless the other parent has a paying gene there, the lane is vaccinated */
    if(a&&a.scar)wa=0;if(b&&b.scar)wb=0;if(((a&&a.scar)&&!(vb>0))||((b&&b.scar)&&!(va>0)))vacc.push(k);
    lanes[k]={a:+wa.toFixed(3),b:+wb.toFixed(3),...(t?{t}:{})};});
  return{P,lanes,vacc,fade,hot,temper:arch.temper,craft:arch.craft,mut:mut.length?mut.map(([f,v])=>`${WB_MUT_LAB[f]} → ${v}`).join(', '):'none: the pure blend'};}
/* an embryo's chance on each side of one market, from its parents' reads, its genes, the market and its craft */
function wbProbs(E,a,b,g,IX){const A=g.c[a],B=g.c[b];if((!A||A.p==null)&&(!B||B.p==null))return null;const R=E.recipe;
  const sides=g.m==='total'?['over','under']:['home','away'];const info={},q={};
  for(const s of sides){const S=wbSide(IX,g,s);const w=R.lanes[S.lane]||{a:0.8,b:0.8};
    const L=c=>{const l=wbLg(c.p);return c.side===s?l:-l;};let num=0,den=0;
    if(A&&A.p!=null&&w.a){num+=w.a*L(A);den+=Math.abs(w.a);}if(B&&B.p!=null&&w.b){num+=w.b*L(B);den+=Math.abs(w.b);}
    const zp=den>0?num/den:0;const mk=wbMkt(S.price);let z=mk!=null?(1-R.P.b)*zp+R.P.b*wbLg(mk):zp;
    if(S.price!=null){if(R.craft==='Grinder')z+=S.price>=115?-0.15:S.price<=-200?0.05:0;if(R.craft==='Longshot')z+=S.price>=115?0.12:S.price<=-200?-0.10:0;}
    z/=(w.t||R.P.T||1);q[s]=wbSg(z);info[s]=S;}
  const t=q[sides[0]]+q[sides[1]]||1;return{[sides[0]]:q[sides[0]]/t,[sides[1]]:q[sides[1]]/t,sides,info};}
function wbPaired(D){const n=D.length;if(!n)return{n:0,m:0,se:1,z:0};const m=D.reduce((s,x)=>s+x,0)/n;const v=n>1?D.reduce((s,x)=>s+(x-m)*(x-m),0)/(n-1):1;const se=Math.sqrt(v/n)||1e-9;
  return{n,m:+m.toFixed(4),se,z:+(m/se).toFixed(2)};}
const wbFloor=m=>{try{return typeof confFloor==='function'?confFloor(m):0.7;}catch(e){return 0.7;}};
const wbPayable=pr=>typeof bkPriceOk==='function'?bkPriceOk(pr):pr!=null&&+pr>=-300;
/* a parent's best lanes that are still being played (dominant first, else recessive): where the child must hold its own.
   A lane from a season that's over (say, a parent's MLB dogs in November) can't be tested, so it doesn't count. */
const wbBest=d=>{const on=k=>((d.recent||{})[k]||{}).n>=5;const L=d.dom.filter(on);return(L.length?L:d.rec.filter(on)).slice(0,8);};
/* walk-forward from the start of its parents' records: calibration only from its own graded calls after conception */
function wbEval(L,E,IX,d0,tried,until){const a=L.a,b=L.b,from=E.since;const domA=new Set(L.domA||[]),domB=new Set(L.domB||[]);
  const bins=CONF_EDGES.slice(0,-1).map((lo,i)=>({lo,hi:CONF_EDGES[i+1],w:0,n:0,s:0}));let pav=null,day=null,pend=[];
  const cal=raw=>{if(!pav)pav=confPav(bins);if(!pav.length)return raw;const bb=pav.find(x=>raw>=x.lo&&raw<x.hi)||(raw<pav[0].lo?pav[0]:pav[pav.length-1]);return(bb.w+WOMB_CAL*raw)/(bb.n+WOMB_CAL);};
  const post={A:[],B:[]},hist={A:[],B:[]},resp={A:[],B:[]};const me={n:0,w:0,u:0},off={n:0,w:0,u:0},offA={n:0,w:0,u:0},offB={n:0,w:0,u:0};let open=0;
  for(const g of IX.G){if(until&&g.d>=until)break;if(!g.c[a]&&!g.c[b])continue;
    if(g.d!==day){pend.forEach(x=>{const bb=bins.find(o=>x.raw>=o.lo&&x.raw<o.hi);if(bb){bb.w+=x.y;bb.n++;bb.s+=x.raw;}});if(pend.length)pav=null;pend=[];day=g.d;}
    const P=wbProbs(E,a,b,g,IX);if(!P)continue;const pre=g.d<from;
    const pick=P[P.sides[0]]>=P[P.sides[1]]?P.sides[0]:P.sides[1];const raw=P[pick];let p=pre?raw:cal(raw);const S=P.info[pick];
    if(E.recipe.vacc.includes(S.lane))p=Math.min(p,0.55);
    for(const[who,c,dom]of[['A',g.c[a],domA],['B',g.c[b],domB]]){if(!c||!c.graded||c.push||c.p==null)continue;const pe=Math.max(0.02,Math.min(0.98,c.side===pick?p:1-p)),pc=Math.max(0.02,Math.min(0.98,+c.p)),y=c.hit;
      const dd=(y?-Math.log(pc):-Math.log(1-pc))-(y?-Math.log(pe):-Math.log(1-pe));(pre?hist:post)[who].push(dd);if(!pre&&dom.has(c.lane))resp[who].push(dd);
      if(!pre&&pc>=wbFloor(g.m)-1e-9&&wbPayable(c.price)){const o=who==='A'?offA:offB;o.n++;if(c.hit)o.w++;o.u+=c.u;}}
    if(pre)continue;const res=wbResult(IX,g.k,pick);
    if(S.price==null)continue;   /* no line, no pick: it never calls a side nobody priced */
    if(!res){open++;continue;}if(res==='push')continue;const y=res==='w'?1:0,uu=y?americanToDecimal(S.price)-1:-1;
    me.n++;me.w+=y;me.u+=uu;pend.push({raw,y});if(p>=wbFloor(g.m)-1e-9&&wbPayable(S.price)){off.n++;off.w+=y;off.u+=uu;}}
  const A=wbPaired(post.A),B=wbPaired(post.B),rA=wbPaired(resp.A),rB=wbPaired(resp.B),hA=wbPaired(hist.A),hB=wbPaired(hist.B);
  const days=Math.max(0,Math.round((Date.parse(d0)-Date.parse(from))/864e5));const bar=WOMB_BAR+WOMB_LUCK*Math.log2(Math.max(1,tried||1));
  const duA=+(off.u-offA.u).toFixed(2),duB=+(off.u-offB.u).toFixed(2);
  /* respect: not clearly worse (within a standard error) in that parent's best lanes still in play (none in play: the overall bar covers it) */
  const respOk=(r,S)=>!S.size||(r.n>=WOMB_RESPECT_N&&r.z>=-1);
  const due=A.n>=WOMB_MIN_N&&B.n>=WOMB_MIN_N&&days>=WOMB_MIN_DAYS&&A.z>=bar&&B.z>=bar&&duA>=-1&&duB>=-1&&respOk(rA,domA)&&respOk(rB,domB);
  /* lost: clearly worse than either parent, or four weeks without clearing every bar (an heir proves it or makes room) */
  const worse=(A.n>=WOMB_MIN_N&&days>=WOMB_MIN_DAYS&&A.z<=-2)||(B.n>=WOMB_MIN_N&&days>=WOMB_MIN_DAYS&&B.z<=-2);const lost=!due&&(worse||days>=WOMB_MAX_DAYS);
  const r2=x=>+(+x).toFixed(2),sg=z=>(z>=0?'+':'−')+Math.abs(z).toFixed(1);
  /* what still stands between it and birth, in plain words */
  const need=[];if(days<WOMB_MIN_DAYS)need.push(`${WOMB_MIN_DAYS-days} more day${WOMB_MIN_DAYS-days===1?'':'s'}`);
  [[A,rA,duA,offA,a,domA],[B,rB,duB,offB,b,domB]].forEach(([X,R,du,O,v,S])=>{const s=wbSh(v);if(X.n<WOMB_MIN_N)need.push(`${WOMB_MIN_N-X.n} more of ${s}'s calls`);else if(X.z<bar)need.push(`${(bar-X.z).toFixed(1)}σ more against ${s}`);
    if(du<-1)need.push(`${(-du-1).toFixed(1)}u more on its official calls (vs ${s}'s ${wbU(O.u)})`);
    if(S.size){if(R.n<WOMB_RESPECT_N)need.push(`more games in ${s}'s best lanes`);else if(R.z<-1)need.push(`to hold its own in ${s}'s best lanes (${sg(R.z)}σ)`);}});
  return{A,B,rA,rB,hA,hB,me:{...me,u:r2(me.u)},off:{...off,u:r2(off.u)},offA:{...offA,u:r2(offA.u)},offB:{...offB,u:r2(offB.u)},duA,duB,days,bar,open,due,lost,need,
    why:due?`beat ${wbNm(a)} by ${A.z.toFixed(1)}σ and ${wbNm(b)} by ${B.z.toFixed(1)}σ on games it never saw, its official calls ${wbU(off.u)} against ${wbU(offA.u)} and ${wbU(offB.u)}, and held its own in both parents' best lanes`
      :lost&&worse?`${A.z<=-2&&A.n>=WOMB_MIN_N?`${Math.abs(A.z).toFixed(1)}σ worse than ${wbNm(a)} on ${A.n}`:`${Math.abs(B.z).toFixed(1)}σ worse than ${wbNm(b)} on ${B.n}`} games it never saw`
      :lost?`${WOMB_MAX_DAYS} days in the womb without clearing every bar (${sg(A.z)}σ against ${wbNm(a)}, ${sg(B.z)}σ against ${wbNm(b)})`:''};}

/* ── the registry and the daily pass ── */
function wombAll(){let W=get(WOMB_KEY,null);if(!W||W.v!==1||!Array.isArray(W.litters))W={v:1,litters:[],tried:0};return W;}
/* 🔮 the preview: the same recipe built from what was known two weeks before conception, replayed on those two weeks.
   It sets expectations; it never counts toward a birth (the rules that judge it were written after those games were played). */
function wbPreview(L,k,arch,asOf,IX,n){try{const p0=dayShift(asOf,-WOMB_PREVIEW),dA=dnaOf(L.a,p0,IX),dB=dnaOf(L.b,p0,IX);
  const r=wbEval({a:L.a,b:L.b,domA:wbBest(dA),domB:wbBest(dB)},{since:p0,recipe:wbRecipe(dA,dB,arch,k)},IX,asOf,n,asOf);
  return{from:p0,A:{n:r.A.n,z:r.A.z},B:{n:r.B.n,z:r.B.z},rA:{n:r.rA.n,z:r.rA.z},rB:{n:r.rB.n,z:r.rB.z},me:r.me,off:r.off,offA:r.offA,offB:r.offB,would:r.due,need:r.need};}catch(e){return null;}}
function wbConceive(W,P,asOf,D,IX,day){IX=IX||wbIndex();const id='L'+(W.litters.length+1),dA=D[P.a],dB=D[P.b],arch=wbArch(dA,dB);day=day||asOf;
  const L={id,st:'live',a:P.a,b:P.b,conceived:day,arch,court:{score:+P.score.toFixed(3),gain:P.gain,lift:+P.ch.lift.toFixed(3),split:+P.ch.split.toFixed(3),ag:P.ch.ag,sp:P.ch.sp,right:P.ch.right},
    dna:{a:wbBrief(dA),b:wbBrief(dB)},domA:wbBest(dA),domB:wbBest(dB),embryos:[]};
  for(let k=0;k<WOMB_EMB;k++){W.tried=(W.tried||0)+1;L.embryos.push({id:id+'e'+(k+1),st:'womb',conceived:day,since:asOf,arch:arch.label,recipe:wbRecipe(dA,dB,arch,k),n:W.tried,preview:wbPreview(L,k,arch,asOf,IX,W.tried)});}
  W.litters.push(L);const pv=L.embryos[0].preview;
  try{journalAdd({kind:'womb',sig:'conceive-'+id,d:day,v:P.a,sev:'info',title:`💞 ${wbNm(P.a)} × ${wbNm(P.b)}: expecting — a ${arch.label}`,
    what:`${arch.why} Coverage: +${P.gain.toFixed(1)}u a child taking the better parent in every lane adds; when they agree they hit ${Math.round(P.ch.agr*100)}% (${P.ch.ag} times).${pv?` Two-week preview (not counted): ${pv.A.z>=0?'+':''}${pv.A.z}σ against ${wbNm(P.a)}, ${pv.B.z>=0?'+':''}${pv.B.z}σ against ${wbNm(P.b)}.`:''}`});}catch(e){}
  return L;}
let WOMB_MEMO=null;
/* a pair whose litter ended (every embryo lost) rests two weeks before it can court again */
const wbPairKey=(a,b)=>[a,b].sort().join('×');
const wbResting=(W,d)=>new Set(W.litters.filter(L=>L.st==='ended'&&L.ended&&L.ended>dayShift(d,-WOMB_REST)).map(L=>wbPairKey(L.a,L.b)));
function wombRun(force){const d=today();const IX=wbIndex();if(!force&&WOMB_MEMO&&WOMB_MEMO.d===d&&WOMB_MEMO.sig===IX.sig&&Date.now()-WOMB_MEMO.ts<30*60e3)return WOMB_MEMO;
  const W=wombAll();let changed=false;
  /* 1 · fill the empty slots. Nothing is backdated: a litter conceived today takes its genes from everything graded up to tonight
     and is judged only on games from tomorrow on, so no game it's judged on had a result when it was conceived.
     The first pass fills every open slot; after that, one new litter a day. */
  const live=()=>W.litters.filter(L=>L.st==='live');
  if(live().length<WOMB_SLOTS&&(!W.lastConceived||W.lastConceived<d)){const first=!W.firstDone;const asOf=dayShift(d,1);
    const busy=new Set(live().flatMap(L=>[L.a,L.b])),rest=wbResting(W,d);const C=wbCourt(asOf,IX,busy);let made=0;
    for(const P of C.P){if(live().length>=WOMB_SLOTS||(!first&&made>=1))break;if(busy.has(P.a)||busy.has(P.b)||rest.has(wbPairKey(P.a,P.b)))continue;wbConceive(W,P,asOf,C.D,IX,d);busy.add(P.a);busy.add(P.b);made++;}
    W.firstDone=1;W.lastConceived=d;changed=true;}   /* one courtship pass a day */
  /* 2 · every embryo re-reads its games; the due wait for Phase 2, the lost make room for a sibling */
  const out={d,ts:Date.now(),sig:IX.sig,emb:{},n:0};
  W.litters.filter(L=>L.st==='live').forEach(L=>{L.embryos.forEach(E=>{if(E.st==='lost')return;const r=wbEval(L,E,IX,d,E.n);out.emb[E.id]=r;out.n++;
      if(E.st==='womb'&&r.due){E.st='due';E.dueAt=d;changed=true;try{journalAdd({kind:'womb',sig:'due-'+E.id,v:L.a,sev:'info',title:`🍼 ${wbNm(L.a)} × ${wbNm(L.b)}: the ${E.arch} is due`,what:`It ${r.why}. It will be born in Phase 2 as a character of its own.`});}catch(e){}}
      else if(E.st==='womb'&&r.lost){E.st='lost';E.lostAt=d;E.why=r.why;changed=true;try{journalAdd({kind:'womb',sig:'lost-'+E.id,v:L.a,sev:'info',title:`🕊 ${wbNm(L.a)} × ${wbNm(L.b)}: an embryo was lost`,what:`The ${E.arch}, ${r.why}. The parents try again.`});}catch(e){}}});
    /* a lost embryo makes room for a sibling, conceived today from today's records (its type can differ: the Goosebumps rule) */
    const alive=L.embryos.filter(E=>E.st!=='lost');
    if(alive.length<WOMB_EMB&&L.embryos.length<WOMB_MAX_EMB){const d1=dayShift(d,1),dA=dnaOf(L.a,d1,IX),dB=dnaOf(L.b,d1,IX);if(wbProven(dA)&&wbProven(dB)){const arch=wbArch(dA,dB);W.tried=(W.tried||0)+1;
        const k=L.embryos.length,E={id:L.id+'e'+(k+1),st:'womb',conceived:d,since:d1,arch:arch.label,recipe:wbRecipe(dA,dB,arch,k),n:W.tried};E.preview=wbPreview(L,k,arch,d1,IX,W.tried);L.embryos.push(E);changed=true;
        try{journalAdd({kind:'womb',sig:'conceive-'+E.id,v:L.a,sev:'info',title:`🥚 ${wbNm(L.a)} × ${wbNm(L.b)}: a new embryo — a ${arch.label}`,what:arch.why});}catch(e){}}}
    if(!L.embryos.some(E=>E.st!=='lost')){L.st='ended';L.ended=d;changed=true;
      try{journalAdd({kind:'womb',sig:'ended-'+L.id,v:L.a,sev:'info',title:`🕯 ${wbNm(L.a)} × ${wbNm(L.b)}: no heir this time`,what:`All ${L.embryos.length} embryos were lost. The pair rests ${WOMB_REST} days before it can court again.`});}catch(e){}}});
  if(changed)set(WOMB_KEY,W);WOMB_MEMO=out;return out;}
async function wombRunAsync(force){try{if(typeof deskIdle==='function')await deskIdle(200);}catch(e){}const R=wombRun(force);
  try{if(typeof deskIdle==='function')await deskIdle(200);wbBoard();}catch(e){}return R;}
/* the courtship board (who'd pair next, today), worked out once per ledger change */
function wbBoard(){const IX=wbIndex(),W=wombAll(),live=W.litters.filter(L=>L.st==='live'),bz=live.flatMap(L=>[L.a,L.b]);const sig=IX.sig+'|'+bz.join(',');
  if(!WB_BOARD||WB_BOARD.sig!==sig)WB_BOARD={sig,C:wbCourt(dayShift(today(),1),IX,new Set(bz))};return WB_BOARD.C;}
try{if(typeof AP_STEPS!=='undefined'&&!AP_STEPS.some(s=>s[0]==='womb')){const i=AP_STEPS.findIndex(s=>s[0]==='heirs');
  AP_STEPS.splice(i>=0?i+1:AP_STEPS.length,0,['womb','The womb','Courtships re-scored; every embryo re-reads its games in the shadows against both parents.',()=>wombRunAsync().then(R=>R.n)]);}}catch(e){}

/* ── sync: two devices never split the family. The registry that conceived first is the family (a device that courted later
   from an older copy started a parallel one); from the other copy it keeps what happened since: an embryo due or lost there,
   a sibling conceived there, a litter that ended there. The count of embryos tried never goes backwards. ── */
function wombMerge(a,b){if(!a||a.v!==1||!Array.isArray(a.litters))return b||a;if(!b||b.v!==1||!Array.isArray(b.litters))return a;
  const first=W=>W.litters.reduce((m,L)=>!m||L.conceived<m?L.conceived:m,null)||'9999';const P=first(b)<first(a)?b:a,S=P===a?b:a;
  const rk=st=>st==='due'||st==='lost'?1:0,num=id=>+String(id).replace(/^.*e/,'')||0;
  const litters=P.litters.map(L=>{const M=S.litters.find(x=>x.id===L.id&&x.a===L.a&&x.b===L.b&&x.conceived===L.conceived);if(!M)return L;
    const E=new Map(L.embryos.map(e=>[e.id,e]));M.embryos.forEach(e=>{const o=E.get(e.id);if(!o||rk(e.st)>rk(o.st))E.set(e.id,e);});
    const ended=L.st==='ended'||M.st==='ended';return{...L,st:ended?'ended':L.st,...(ended?{ended:L.ended||M.ended}:{}),embryos:[...E.values()].sort((x,y)=>num(x.id)-num(y.id))};});
  const lc=[a.lastConceived,b.lastConceived].filter(Boolean).sort().pop();
  return{...S,...P,litters,tried:Math.max(a.tried||0,b.tried||0),firstDone:a.firstDone||b.firstDone||undefined,...(lc?{lastConceived:lc}:{})};}
if(typeof syncMergeVal==='function'&&typeof window!=='undefined'&&!window.__WOMB_SYNC__){window.__WOMB_SYNC__=1;const SMV1=syncMergeVal;
  syncMergeVal=function(k,L,R,tomb){if(k===WOMB_KEY&&L&&R){try{const N=L.t>=R.t?L:R,O=N===L?R:L;return wombMerge(N.v,O.v);}catch(e){}}return SMV1.apply(this,arguments);};}

/* ── the rooms in the Bloodlines book ── */
let WB_DNA_V=null,WB_BOARD=null;
const wbCol=v=>(CHARS[v]||{}).color||'#f5c542';
const wbPct=x=>Math.round(Math.max(0,Math.min(1,x))*100);
function wombHtml(){if(!WOMB_MEMO||WOMB_MEMO.d!==today()){wombRunAsync().then(()=>{try{if(GEN_TAB==='womb')genRender();}catch(e){}}).catch(()=>{});return`<div class="card"><div class="muted">🥚 Reading the womb… (a few seconds)</div></div>`;}
  let R=WOMB_MEMO;try{R=wombRun();}catch(e){return`<div class="card"><div class="muted">${txtEsc(e.message)}</div></div>`;}const W=wombAll();
  const live=W.litters.filter(L=>L.st==='live');
  const bar=(lab,txt,f,col)=>`<div class="lbl"><span>${lab}</span><span>${txt}</span></div><div class="bar"><i style="width:${wbPct(f)}%;background:${col}"></i></div>`;
  const emb=(L,E)=>{const r=R.emb[E.id];const st=E.st==='due'?'🍼 due':E.st==='lost'?'🕊 lost':'🥚 in the womb';
    const rec=E.recipe;const fromA=(L.domA||[]).filter(k=>(rec.lanes[k]||{}).a>=(rec.lanes[k]||{}).b).slice(0,3),fromB=(L.domB||[]).filter(k=>(rec.lanes[k]||{}).b>(rec.lanes[k]||{}).a).slice(0,3);
    return`<div class="card" style="border-left:4px solid ${E.st==='due'?'#22c55e':E.st==='lost'?'#475569':'#f5c542'}">
      <div style="font:800 14px system-ui">${st} · <span style="color:#f5c542">a ${txtEsc(E.arch)}</span></div>
      <div class="muted" style="margin-top:3px">Conceived ${txtEsc(E.conceived||L.conceived)} · judged on games from ${txtEsc(E.since)} · mutation: ${txtEsc(rec.mut)}</div>
      <div style="margin-top:6px;font-size:12.5px;line-height:1.5">${fromA.length?`From <b style="color:${wbCol(L.a)}">${txtEsc(wbSh(L.a))}</b>: ${fromA.map(wbLaneLab).map(txtEsc).join(', ')}<br>`:''}${fromB.length?`From <b style="color:${wbCol(L.b)}">${txtEsc(wbSh(L.b))}</b>: ${fromB.map(wbLaneLab).map(txtEsc).join(', ')}<br>`:''}${rec.vacc.length?`💉 Vaccinated against ${rec.vacc.slice(0,4).map(wbLaneLab).map(txtEsc).join(', ')}<br>`:''}${rec.fade.length?`✊ Rebels against its parents in ${rec.fade.slice(0,3).map(wbLaneLab).map(txtEsc).join(', ')}<br>`:''}${rec.hot.length?`🔥 Rides the hot lanes: ${rec.hot.slice(0,3).map(wbLaneLab).map(txtEsc).join(', ')}`:''}</div>
      ${r?`${bar(`Unseen games vs ${txtEsc(wbSh(L.a))}`,`${Math.min(r.A.n,WOMB_MIN_N)}/${WOMB_MIN_N}`,r.A.n/WOMB_MIN_N,'#60a5fa')}${bar(`Unseen games vs ${txtEsc(wbSh(L.b))}`,`${Math.min(r.B.n,WOMB_MIN_N)}/${WOMB_MIN_N}`,r.B.n/WOMB_MIN_N,'#60a5fa')}
        ${bar('Days in the womb',r.days<WOMB_MIN_DAYS?`${r.days}/${WOMB_MIN_DAYS}`:`${r.days} (of ${WOMB_MAX_DAYS} at most)`,r.days/WOMB_MIN_DAYS,'#a78bfa')}
        ${bar(`Edge vs ${txtEsc(wbSh(L.a))}`,`${r.A.z>=0?'+':''}${r.A.z.toFixed(1)}σ of ${r.bar.toFixed(1)}σ`,r.A.z/r.bar,r.A.z<0?'#f87171':'#22c55e')}${bar(`Edge vs ${txtEsc(wbSh(L.b))}`,`${r.B.z>=0?'+':''}${r.B.z.toFixed(1)}σ of ${r.bar.toFixed(1)}σ`,r.B.z/r.bar,r.B.z<0?'#f87171':'#22c55e')}
        <div class="lbl"><span>Money check (its official calls vs each parent's)</span><span style="color:${r.duA>=-1&&r.duB>=-1?'#22c55e':'#f87171'}">${wbU(r.off.u)} vs ${wbU(r.offA.u)} · ${wbU(r.offB.u)}</span></div>
        <div class="lbl"><span>Respect in each parent's best lanes</span><span>${!(L.domA||[]).length?'—':r.rA.n>=WOMB_RESPECT_N?(r.rA.z>=-1?'✓':'✗'):'…'} ${txtEsc(wbSh(L.a))} · ${!(L.domB||[]).length?'—':r.rB.n>=WOMB_RESPECT_N?(r.rB.z>=-1?'✓':'✗'):'…'} ${txtEsc(wbSh(L.b))}</span></div>
        <div class="mono muted" style="font-size:11px;margin-top:6px">In the shadows since ${txtEsc(E.since)}: ${r.me.w}-${r.me.n-r.me.w}, ${wbU(r.me.u)} · official ${r.off.w}-${r.off.n-r.off.w}, ${wbU(r.off.u)}${r.open?` · ${r.open} still to play`:''}</div>
        ${E.st==='womb'&&r.need&&r.need.length?`<div style="margin-top:6px;font-size:12px">⏳ <b>Still needs:</b> ${r.need.map(txtEsc).join(' · ')}</div>`:''}`:''}
      ${E.preview?`<div style="margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(167,139,250,.10);font-size:12px;line-height:1.5">🔮 <b>Two-week preview</b> <span class="muted">(if they'd paired on ${txtEsc(E.preview.from)}; shown, never counted)</span><br>${E.preview.A.z>=0?'+':''}${E.preview.A.z}σ vs ${txtEsc(wbSh(L.a))} · ${E.preview.B.z>=0?'+':''}${E.preview.B.z}σ vs ${txtEsc(wbSh(L.b))} · official ${E.preview.off.w}-${E.preview.off.n-E.preview.off.w}, ${wbU(E.preview.off.u)} (parents ${wbU(E.preview.offA.u)} · ${wbU(E.preview.offB.u)})${E.preview.would?' · <b style="color:#22c55e">it would have cleared every bar</b>':E.preview.need&&E.preview.need.length?`<br><span class="muted">Short of: ${E.preview.need.map(txtEsc).join(' · ')}</span>`:''}</div>`:''}
      ${E.st==='lost'&&E.why?`<div class="muted" style="margin-top:6px">${txtEsc(E.why)}</div>`:''}</div>`;};
  const head=`<div class="card"><div style="font:800 15px system-ui">🥚 The womb</div><div class="muted" style="margin-top:4px">Two characters with traits that cover each other conceive embryos. An embryo is born only when it beats <b>both</b> parents on games it never saw: ${WOMB_MIN_N}+ calls against each, ${WOMB_MIN_DAYS}+ days, past the luck bar, its official calls making at least as much money, and holding its own in each parent's best lanes. Clearly worse than either parent, or ${WOMB_MAX_DAYS} days without clearing every bar, and it's lost: the parents try again. The kind of child depends on the records its parents were running when it was conceived. Nothing here changes a pick.</div></div>`;
  const lit=live.map(L=>`<div class="card" style="background:linear-gradient(135deg,${wbCol(L.a)}22,${wbCol(L.b)}22),#0b1220">
      <div style="font:900 16px system-ui"><span style="color:${wbCol(L.a)}">${txtEsc(wbNm(L.a))}</span> × <span style="color:${wbCol(L.b)}">${txtEsc(wbNm(L.b))}</span></div>
      <div class="muted" style="margin-top:4px">Conceived ${txtEsc(L.conceived)} · ${txtEsc(L.arch.why)}</div>
      <div class="mono muted" style="font-size:11px;margin-top:6px">Coverage ${wbU(L.court.gain)} · agree ${L.court.ag}× · split ${L.court.sp}× (${txtEsc(wbSh(L.court.right))} usually right)</div></div>${L.embryos.map(E=>emb(L,E)).join('')}`).join('');
  /* who'd pair next, today (worked out once per ledger change) */
  let board='';try{const C=wbBoard(),rest=wbResting(W,today());C.P.forEach(P=>{P.rest=rest.has(wbPairKey(P.a,P.b));});board=`<div class="card"><div style="font:800 15px system-ui">💞 The courtship board, today</div><div class="muted" style="margin-top:4px">Who covers whom best right now (a character already expecting waits its turn; a pair that lost every embryo rests ${WOMB_REST} days).</div>
    ${C.P.slice(0,6).map((P,i)=>`<div style="margin-top:8px;font-size:13px${P.busy||P.rest?';opacity:.55':''}"><b>${i+1}.</b> <span style="color:${wbCol(P.a)}">${txtEsc(wbSh(P.a))}</span> × <span style="color:${wbCol(P.b)}">${txtEsc(wbSh(P.b))}</span> <span class="mono muted">${wbU(P.gain)} coverage · agree ${Math.round(P.ch.agr*100)}%</span> → <span style="color:#f5c542">a ${txtEsc(wbArch(C.D[P.a],C.D[P.b]).label)}</span>${P.busy?' · expecting':P.rest?' · resting':''}</div>`).join('')||'<div class="muted" style="margin-top:6px">No two characters are proven enough to pair yet.</div>'}</div>`;}catch(e){}
  return head+(lit||`<div class="card"><div class="muted">No one is expecting yet: a pairing needs two proven characters whose traits cover each other.</div></div>`)+board;}
function dnaHtml(){const IX=wbIndex();const vs=wbEligible().concat([...META_VOICES].filter(v=>CHARS[v])).filter(v=>(IX.byV[v]||[]).length);if(!vs.length)return`<div class="card"><div class="muted">No records yet.</div></div>`;
  if(!WB_DNA_V||!vs.includes(WB_DNA_V))WB_DNA_V=vs[0];const v=WB_DNA_V,D=dnaOf(v,dayShift(today(),1),IX);
  const ln=(k,o)=>`<div style="margin:4px 0;font-size:12.5px">${txtEsc(wbLaneLab(k))} <span class="mono" style="color:${o.u>=0?'#22c55e':'#f87171'}">${o.w}-${o.n-o.w} ${wbU(o.u)}</span></div>`;
  const fm=D.form.state==='hot'?'🔥 running hot':D.form.state==='cold'?'🧊 slumping':'⚖️ steady';
  return`<div style="margin-bottom:8px">${vs.map(x=>`<span class="chip ${x===v?'on':''}" style="color:${wbCol(x)}" onclick="WB_DNA_V='${x.replace(/'/g,"\\'")}';genRender()">${txtEsc(wbSh(x))}</span>`).join('')}</div>
    <div class="card"><div style="font:900 18px system-ui;color:${wbCol(v)}">${txtEsc(wbNm(v))}</div>
      <div class="mono" style="font-size:12px;margin-top:6px;line-height:1.7">${D.w}-${D.n-D.w} graded · ${wbU(D.u)} · ${fm} (${wbU(D.form.u)} over 14 days)${D.honest?`<br>Honesty: says ${Math.round(D.honest.conf*100)}%, hits ${Math.round(D.honest.hit*100)}%`:''}${D.temper.afterW!=null?`<br>After a win it hits ${Math.round(D.temper.afterW*100)}%, after a loss ${Math.round(D.temper.afterL*100)}%`:''}<br>Takes plus money on ${Math.round(D.temper.plus*100)}% of its calls${D.score?`<br>Score sense: ${D.score.exact} exact of ${D.score.n} (${D.score.mult.toFixed(1)}× the cast's rate)`:''}</div></div>
    <div class="card"><div style="font:800 14px system-ui">🧬 Dominant genes <span class="muted">(proven, paying)</span></div>${D.dom.slice(0,8).map(k=>ln(k,D.lanes[k])).join('')||'<div class="muted">None proven yet.</div>'}
      ${D.rec.length?`<div style="font:800 13px system-ui;margin-top:8px">Recessive <span class="muted">(paying, not proven)</span></div>${D.rec.slice(0,5).map(k=>ln(k,D.lanes[k])).join('')}`:''}
      ${D.scars.length?`<div style="font:800 13px system-ui;margin-top:8px">🩹 Scars <span class="muted">(its children inherit these as vaccines)</span></div>${D.scars.slice(0,6).map(k=>ln(k,D.lanes[k])).join('')}`:''}</div>
    <div class="card"><div style="font:800 14px system-ui">💵 Price comfort</div>${WB_BANDS.filter(k=>D.bands[k]).map(k=>`<div style="margin:4px 0;font-size:12.5px">${txtEsc(WB_BAND_LAB[k])} <span class="mono" style="color:${D.bands[k].u>=0?'#22c55e':'#f87171'}">${D.bands[k].w}-${D.bands[k].n-D.bands[k].w} ${wbU(D.bands[k].u)}</span></div>`).join('')}</div>
    ${D.beliefs.paying.length||D.beliefs.costing.length?`<div class="card"><div style="font:800 14px system-ui">🧠 Beliefs</div>${D.beliefs.paying.map(o=>`<div style="margin:4px 0;font-size:12.5px">💎 ${txtEsc(WB_SPN[o.sp]||o.sp)} · ${txtEsc(typeof WV_BELIEF_LAB==='function'?WV_BELIEF_LAB(o.t):o.t)} <span class="mono" style="color:#22c55e">${o.w}-${o.n-o.w} ${wbU(o.u)}</span></div>`).join('')}${D.beliefs.costing.map(o=>`<div style="margin:4px 0;font-size:12.5px">⚠️ ${txtEsc(WB_SPN[o.sp]||o.sp)} · ${txtEsc(typeof WV_BELIEF_LAB==='function'?WV_BELIEF_LAB(o.t):o.t)} <span class="mono" style="color:#f87171">${o.w}-${o.n-o.w} ${wbU(o.u)}</span></div>`).join('')}</div>`:''}`;}
