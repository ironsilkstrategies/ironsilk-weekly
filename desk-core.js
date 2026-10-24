/* ═══ THEDESK CORE (v2.31) ════════════════════════════════════════════════════
   Loaded on every page after shared.js and the sport engine. Holds the rules
   that decide what is OFFICIAL, who gets which pick, the one bankroll, and the
   daily process (grade → intake → master eval/freeze → publish → results).

   1. CONFIDENCE METER — every character call gets a calibrated % to win.
   2. THE 70% RULE — only calls at or above the floor are official: graded in
      the records, eligible for parlays, the Best card and the VIP card.
      Everything else is still graded quietly so the characters keep learning.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 1 · CONFIDENCE ──────────────────────────────────────────────────────────
   base  = the side's chance from the Sim (its calibrated, market-blended number)
           averaged with the book price's no-vig chance.
   skill = the character's own record AGAINST that base, in this exact genre:
           sport × market × favorite/dog (or over/under), sport × market, home or
           road, the team it's on, the situations it's in (rest, travel, weather,
           head-to-head, talent…), and overall — each shrunk by 30 games and
           learned only from earlier days.
   cal   = a calibration map per market, fit on graded history with monotone
           bins, so "70%" has to have actually hit 70%.
   caps  = a blocked lane or a blacklisted spot caps it at 55% (never official). */
const CONF_KEY='d4.conf',CONF_FLOOR_KEY='d4.conffloor',CONF_K=30;
const CONF_FLOOR_DEF={ml:0.70,spread:0.70,total:0.70};
const CONF_TAGS=new Set(['b2b','oppb2b','restedge','3in4','opp3in4','road3','shortweek','offbye','oppshort','oppoffbye','restplus','hot5','cold5','divgame','westearly','westnight','eastnight',
  'talent+','talent-','mismatch+','mismatch-','qbstar','qbbust','oppqbstar','oppqbbust','qbfading','goaliestar','goaliebust','oppgoaliestar','oppgoaliebust','offedge','defedge',
  'homedog','roadfav','key3','key7','bigline','hitot','lotot','pythlucky','pythunlucky','wind15','cold32','dome','h2hedge','h2hfade','bigfav','longdog']);
function confFloor(m){m=m==='moneyline'?'ml':m;const F=get(CONF_FLOOR_KEY,null)||{};const v=+F[m];return v>=0.5&&v<=0.95?v:(CONF_FLOOR_DEF[m]||0.70);}
function confRole(x){if(x.market==='total')return x.side==='over'?'over':'under';const p=x.price!=null&&isFinite(+x.price)?+x.price:null;if(p!=null)return p<0?'fav':'dog';
  const l=x.line!=null&&isFinite(+x.line)?+x.line:null;return l!=null?(l<0?'fav':'dog'):'na';}
function confTeam(x){if(x.market==='total')return null;const g=String(x.game||'').split('@');return x.side==='home'?g[1]:x.side==='away'?g[0]:null;}
const confVenue=x=>x.market==='total'?'tot':x.side==='home'?'home':'road';
const confMkt=p=>p==null||!isFinite(+p)||+p===0?null:imp(+p)*0.955+0.0225;
/* the Sim's chance for THIS call's side, only when it priced the same line */
function confSideP(x,sim){if(!sim||sim.market!==x.market)return null;const ps=sim.pUsed!=null?sim.pUsed:sim.simP;if(ps==null||!isFinite(ps))return null;
  if(x.market==='spread'&&sim.line!=null&&x.line!=null){const sl=sim.side===x.side?+sim.line:-(+sim.line);if(Math.abs(sl-(+x.line))>0.01)return null;}
  if(x.market==='total'&&sim.line!=null&&x.line!=null&&Math.abs(+sim.line-(+x.line))>0.01)return null;
  return sim.side===x.side?ps:1-ps;}
function confBase(x,sim){const p0=confSideP(x,sim),pm=confMkt(x.price);const b=p0!=null&&pm!=null?0.5*p0+0.5*pm:p0!=null?p0:pm;return b==null?null:Math.max(0.03,Math.min(0.97,b));}
function confKeys(x){const v=x.voice,sp=x.sp,m=x.market,t=confTeam(x);
  const K=[[v+'|'+sp+'|'+m+'|'+confRole(x),1],[v+'|'+sp+'|'+m,0.5],[v,0.25],[v+'|'+sp+'|'+m+'|'+confVenue(x),0.5]];
  if(t)K.push([v+'|'+sp+'|t:'+t,0.5]);(Array.isArray(x.f)?x.f:[]).forEach(f=>{if(CONF_TAGS.has(f))K.push([v+'|'+sp+'|f:'+f,0.25]);});return K;}
function confRaw(x,base,skill){let z=logit(base);const why=[];
  confKeys(x).forEach(([k,w])=>{const o=skill[k];if(!o||!o[1])return;const r=o[0]/(o[1]+CONF_K);const d=Math.max(-0.6,Math.min(0.6,w*r/(base*(1-base))));z+=d;
    if(o[1]>=8&&Math.abs(r)>=0.025)why.push({k,r:+r.toFixed(3),n:o[1],d:+d.toFixed(3)});});
  return{raw:sigm(z),why:why.sort((a,b)=>Math.abs(b.d)-Math.abs(a.d))};}
/* monotone calibration bins (pool-adjacent-violators), shrunk toward the raw number */
const CONF_EDGES=[0,0.4,0.45,0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1.0001];
const confFreshBins=()=>CONF_EDGES.slice(0,-1).map((lo,i)=>({lo,hi:CONF_EDGES[i+1],w:0,n:0,s:0}));
function confPav(bins){const B=bins.filter(b=>b.n>0).map(b=>({...b}));let i=0;
  while(i<B.length-1){if(B[i].w/B[i].n>B[i+1].w/B[i+1].n){B[i]={lo:B[i].lo,hi:B[i+1].hi,w:B[i].w+B[i+1].w,n:B[i].n+B[i+1].n,s:B[i].s+B[i+1].s};B.splice(i+1,1);if(i)i--;}else i++;}
  return B.map(b=>({lo:b.lo,hi:b.hi,w:b.w,n:b.n,s:+b.s.toFixed(3)}));}
function confCalApply(B,raw){if(!B||!B.length)return raw;const b=B.find(b=>raw>=b.lo&&raw<b.hi)||(raw<B[0].lo?B[0]:B[B.length-1]);return(b.w+40*raw)/(b.n+40);}
function confSims(V){const M=new Map();V.forEach(x=>{if(x.voice==='Sim'&&(x.simP!=null||x.pUsed!=null))M.set(x.sp+'|'+x.game+'|'+String(x.date).slice(0,10)+'|'+x.market,x);});return M;}
/* rebuild the model from every graded call (time-ordered), and give older calls a
   retro confidence ("cfr") computed only from what was known before their day */
function confRebuild(force){const C0=get(CONF_KEY,null);const V=get(VOICES_KEY,[])||[];let gN=0;V.forEach(x=>{if(x.graded)gN++;});const sig=V.length+'|'+gN;
  if(!force&&C0&&C0.sig===sig&&Date.now()-C0.ts<6*36e5)return C0;
  const sims=confSims(V);const rows=[];
  V.forEach(x=>{if(!CHARS[x.voice]||!x.graded||x.hit==null||x.push||confPre(x)||(typeof inputsBroken==='function'&&inputsBroken(x)))return;const d=String(x.date).slice(0,10);const base=confBase(x,sims.get(x.sp+'|'+x.game+'|'+d+'|'+x.market));if(base==null)return;rows.push({x,d,base,hit:x.hit?1:0});});
  rows.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  const skill={},bins={ml:confFreshBins(),spread:confFreshBins(),total:confFreshBins()};let changed=0,j=0;
  while(j<rows.length){const d=rows[j].d,day=[];while(j<rows.length&&rows[j].d===d)day.push(rows[j++]);
    const cal={ml:confPav(bins.ml),spread:confPav(bins.spread),total:confPav(bins.total)};
    day.forEach(r=>{r.raw=confRaw(r.x,r.base,skill).raw;if(r.x.cf==null){const c=+confCalApply(cal[r.x.market],r.raw).toFixed(4);if(r.x.cfr!==c){r.x.cfr=c;changed++;}}});
    day.forEach(r=>{confKeys(r.x).forEach(([k])=>{const o=skill[k]||(skill[k]=[0,0]);o[0]+=r.hit-r.base;o[1]++;});
      const B=bins[r.x.market];if(B){const b=B.find(b=>r.raw>=b.lo&&r.raw<b.hi);if(b){b.w+=r.hit;b.n++;b.s+=r.raw;}}});}
  const sk={};Object.entries(skill).forEach(([k,o])=>{sk[k]=[+o[0].toFixed(3),o[1]];});
  const M={v:1,rule:2,ts:Date.now(),sig,n:rows.length,skill:sk,cal:{ml:confPav(bins.ml),spread:confPav(bins.spread),total:confPav(bins.total)}};
  set(CONF_KEY,M);CONF_M=null;if(changed)set(VOICES_KEY,V);return M;}
let CONF_M=null;
function confModel(){if(!CONF_M||Date.now()-CONF_M.t>60e3){let M=get(CONF_KEY,null);if(!M||!M.skill||M.rule!==2)M=confRebuild(true);CONF_M={t:Date.now(),M};}return CONF_M.M;}
/* ideology knobs: a character can be switched off per sport/market (see IDEOLOGY) */
function confKnobOk(x){try{const K=get('d4.ideoknobs',null)||{};const o=K[x.voice];if(!o)return true;if(o.off)return false;
  if(o.mk&&o.mk[x.market]===false)return false;if(o.sp&&o.sp[x.sp]===false)return false;return true;}catch(e){return true;}}
function confFor(x,sim){const M=confModel();const base=confBase(x,sim);if(base==null)return null;const R=confRaw(x,base,M.skill||{});
  let cf=confCalApply((M.cal||{})[x.market],R.raw);const flags=[];
  try{const lk=laneKey(x.sp,x.market,x.side,x.price,x.line);if(lk&&laneStatus(lk,x.voice)==='blocked'){cf=Math.min(cf,0.55);flags.push('lane blocked: '+laneName(lk));}}catch(e){}
  try{const F=charFeel(x);if(F&&F.black){cf=Math.min(cf,0.55);flags.push('blacklisted: '+F.black.lab+' '+F.black.rec);}}catch(e){}
  if(!confKnobOk(x))flags.push('switched off in its ideology');
  return{cf:+cf.toFixed(4),base:+base.toFixed(4),raw:+R.raw.toFixed(4),why:R.why.slice(0,4),flags};}
/* stamp every pre-game call as it's logged (frozen with the master evaluation) */
function confStamp(calls){const sim={};calls.forEach(c=>{if(c.voice==='Sim')sim[c.market]=c;});
  calls.forEach(c=>{if(!CHARS[c.voice])return;let r=null;try{r=confFor(c,sim[c.market]);}catch(e){}if(!r)return;c.cf=r.cf;c.cfb=r.base;
    c.cfw=r.why.map(w=>w.k.split('|').slice(1).join(' ')+' '+(w.d>0?'+':'')+Math.round(w.d*100)/100);if(r.flags.length)c.cff=r.flags;else delete c.cff;if(!confKnobOk(c))c.kof=1;else delete c.kof;});}
const confOf=x=>x&&x.cf!=null?x.cf:x&&x.cfr!=null?x.cfr:null;
/* OFFICIAL = at or above the floor for its market, not capped, not switched off —
   v2.32 · and a real bet: it carries a book price (a sim-only lean can't be taken),
   and it isn't a preseason / exhibition game (tracked for learning only) */
const confPre=x=>!!(x&&(x.pre||(typeof seasonPre==='function'&&seasonPre(x.sp,x.date))));
const confPriced=x=>x&&x.price!=null&&x.price!==''&&(typeof amerOk==='function'?amerOk(x.price)!=null:isFinite(+x.price)&&Math.abs(+x.price)>=100);
/* v2.43 · SPORT FALLBACK FLOOR — the 70% rule stands. On a day a sport has NO 70% call
   (priced, not preseason, not switched off), that sport's floor drops to 65% for that day.
   Counted from Oct 17 on: every earlier day keeps the floor its calls were graded under,
   so past records don't move. Props keep their own 70% rule. */
const CONF_FALLBACK=0.65,CONF_FALLBACK_FROM='2026-10-17';let CONF_FB_C=null;
function confHas70(){const V=roGet(VOICES_KEY,[],30e3)||[];const last=V.length?V[V.length-1]:null;const sig=V.length+'|'+(last?last.id+'|'+(last.cf==null?'':last.cf):'');
  if(CONF_FB_C&&CONF_FB_C.sig===sig&&Date.now()-CONF_FB_C.ts<30e3)return CONF_FB_C.S;const S=new Set();
  V.forEach(c=>{if(!c||!CHARS[c.voice]||META_VOICES.has(c.voice))return;const d=String(c.date||'').slice(0,10);if(d<CONF_FALLBACK_FROM)return;const cf=confOf(c);
    if(cf==null||cf<confFloor(c.market)-1e-9||c.kof||!confPriced(c)||confPre(c))return;S.add(c.sp+'|'+d);});
  CONF_FB_C={sig,ts:Date.now(),S};return S;}
/* v2.47.2 · a second step down, from Oct 18: a sport with no 65% call either plays its 60% calls that day */
const CONF_FALLBACK2=0.60,CONF_FALLBACK2_FROM='2026-10-18';let CONF_FB2_C=null;
function confHas65(){const V=roGet(VOICES_KEY,[],30e3)||[];const sig=V.length+'|'+(V.length?V[V.length-1].id+'|'+V[V.length-1].cf:'');if(CONF_FB2_C&&CONF_FB2_C.sig===sig&&Date.now()-CONF_FB2_C.ts<30e3)return CONF_FB2_C.S;const S=new Set();
  V.forEach(c=>{if(!c||!CHARS[c.voice]||META_VOICES.has(c.voice))return;const d=String(c.date||'').slice(0,10);if(d<CONF_FALLBACK2_FROM)return;const cf=confOf(c);
    if(cf==null||cf<CONF_FALLBACK-1e-9||c.kof||!confPriced(c)||confPre(c)||!confPays(c))return;S.add(c.sp+'|'+d);});CONF_FB2_C={sig,ts:Date.now(),S};return S;}
function confFloorFor(x){const base=confFloor(x&&x.market);const d=String((x&&x.date)||'').slice(0,10);if(!x||!x.sp||!d||d<CONF_FALLBACK_FROM)return base;
  if(confHas70().has(x.sp+'|'+d))return base;if(d<CONF_FALLBACK2_FROM||confHas65().has(x.sp+'|'+d))return Math.min(base,CONF_FALLBACK);return Math.min(base,CONF_FALLBACK2);}
/* v2.53 · UNDER 70%, A CALL HAS TO PAY. From Oct 24, an official call below 70% must be priced -150 or longer.
   The graded ledger (Oct 2-21, walk-forward confidences): calls at 60-70% priced -150 or shorter went
   57-47 for -18.3 units — a winning record that loses money, because each win pays half a unit. The
   fallback floors (65%, then 60%) were letting exactly that chalk in. 70%+ calls are unchanged. */
const CONF_PAY_FROM='2026-10-24',CONF_PAY_MIN=-150;
function confPays(x){const d=String((x&&x.date)||'').slice(0,10);if(!d||d<CONF_PAY_FROM)return true;const c=confOf(x);if(c==null||c>=0.70-1e-9)return true;
  const p=+x.price;return isFinite(p)&&p>=CONF_PAY_MIN;}
function isOfficial(x){const c=confOf(x);return c!=null&&c>=confFloorFor(x)-1e-9&&!x.kof&&confPriced(x)&&!confPre(x)&&confPays(x);}
const officialOnly=V=>(V||[]).filter(isOfficial);
const confPct=c=>c==null?'—':Math.round(c*100)+'%';
/* calls logged before the meter existed (or locked before it loaded) get their
   confidence once, from what's known now — the pick itself never changes */
function confBackfill(d){d=d||today();const V=get(VOICES_KEY,[])||[];const sims=confSims(V);let n=0;
  V.forEach(x=>{if(!CHARS[x.voice]||x.graded||x.cf!=null||String(x.date).slice(0,10)<dayShift(d,-1))return;let r=null;
    try{r=confFor(x,sims.get(x.sp+'|'+x.game+'|'+String(x.date).slice(0,10)+'|'+x.market));}catch(e){}if(!r)return;
    x.cf=r.cf;x.cfb=r.base;x.cfw=r.why.map(w=>w.k.split('|').slice(1).join(' ')+' '+(w.d>0?'+':'')+Math.round(w.d*100)/100);if(r.flags.length)x.cff=r.flags;if(!confKnobOk(x))x.kof=1;n++;});
  if(n)set(VOICES_KEY,V);return n;}
/* every call on a pick today, indexed by sport|game|market|side: the most
   confident OFFICIAL character on it, how many are official, and the best
   confidence of any character (official or not) */
let PCI_C=null;
function pickConfIdx(d){d=d||today();const V=roGet(VOICES_KEY,[],30e3)||[];const sig=d+'|'+V.length+'|'+(V.length?V[V.length-1].id+(V[V.length-1].cf||''):'');
  if(PCI_C&&PCI_C.sig===sig&&Date.now()-PCI_C.ts<30e3)return PCI_C.M;const M=new Map();
  V.forEach(c=>{if(String(c.date).slice(0,10)!==d||!CHARS[c.voice]||META_VOICES.has(c.voice))return;const cf=confOf(c);if(cf==null)return;
    const k=c.sp+'|'+c.game+'|'+c.market+'|'+c.side;let o=M.get(k);if(!o){o={cf:0,n:0,who:[],mx:0,best:null};M.set(k,o);}if(cf>o.mx)o.mx=cf;
    if(isOfficial(c)){o.n++;o.who.push(c.voice);if(cf>o.cf){o.cf=cf;o.best=c.voice;}}});
  PCI_C={sig,ts:Date.now(),M};return M;}
const pickConfKey=(x,sp)=>(x.sp||sp)+'|'+x.game+'|'+mkNorm(x.m||x.market)+'|'+(x.sd||x.side);
function pickConf(x,sp){const o=pickConfIdx().get(pickConfKey(x,sp));return o&&o.n?o:null;}
function pickConfAny(x,sp){const o=pickConfIdx().get(pickConfKey(x,sp));return o?o.mx:null;}

/* ── 1b · SELF-SCOUTING: strengths, weak spots, and why the losses happened ── */
const CONF_SP_LAB={mlb:'MLB',nfl:'NFL',ncaaf:'CFB',nhl:'NHL',nba:'NBA',ncaab:'CBB'};
function confKeyLabel(k){const p=k.split('|');if(p.length===1)return'overall';const sp=CONF_SP_LAB[p[1]]||p[1];
  if(p[2]&&p[2].startsWith('t:'))return`${sp} games on ${p[2].slice(2)}`;if(p[2]&&p[2].startsWith('f:'))return`${sp} · ${(typeof FAC_LAB!=='undefined'&&FAC_LAB[p[2].slice(2)])||p[2].slice(2)}`;
  const m={ml:'moneyline',spread:'spread',total:'total'}[p[2]]||p[2];const r={fav:'favorites',dog:'underdogs',over:'overs',under:'unders',home:'home sides',road:'road sides',tot:'',na:''}[p[3]]||'';
  return`${sp} ${m}${r?' '+r:''}`;}
function confScout(v){const M=confModel();const out={strong:[],weak:[]};Object.entries(M.skill||{}).forEach(([k,o])=>{if(!k.startsWith(v+'|')&&k!==v)return;if(o[1]<10)return;
    const r=o[0]/(o[1]+CONF_K);if(Math.abs(r)<0.03)return;(r>0?out.strong:out.weak).push({k,lab:confKeyLabel(k),r,n:o[1]});});
  out.strong.sort((a,b)=>b.r-a.r);out.weak.sort((a,b)=>a.r-b.r);out.strong=out.strong.slice(0,5);out.weak=out.weak.slice(0,5);return out;}
/* why the official losses happened: close (variance) vs. clear misses, and which situations show up more in losses */
function confLosses(v,days){const V=roGet(VOICES_KEY,[],30e3)||[];const from=days?dayShift(today(),-days):'0000';const F=(()=>{try{return allFinals();}catch(e){return{};}})();
  const L=V.filter(x=>x.voice===v&&x.graded&&x.hit===false&&isOfficial(x)&&String(x.date)>=from),W=V.filter(x=>x.voice===v&&x.graded&&x.hit===true&&isOfficial(x)&&String(x.date)>=from);
  const close={nfl:3,ncaaf:3,nba:4,ncaab:4,nhl:1,mlb:1};let near=0,miss=0;const tags={};
  L.forEach(x=>{const R=(()=>{try{return finalsFor(x.sp,x.game,String(x.date).slice(0,10),false);}catch(e){return null;}})();
    if(R){const a=+R.a,h=+R.h;let gap=null;if(x.market==='ml')gap=Math.abs(h-a);else if(x.market==='spread'&&x.line!=null)gap=Math.abs((x.side==='home'?h-a:a-h)+(+x.line));else if(x.market==='total'&&x.line!=null)gap=Math.abs(a+h-(+x.line));
      if(gap!=null){if(gap<=(close[x.sp]||2))near++;else miss++;}}
    (x.f||[]).forEach(f=>{if(CONF_TAGS.has(f))(tags[f]=tags[f]||{l:0,w:0}).l++;});});
  W.forEach(x=>(x.f||[]).forEach(f=>{if(CONF_TAGS.has(f))(tags[f]=tags[f]||{l:0,w:0}).w++;}));
  const bad=Object.entries(tags).filter(([f,o])=>o.l>=3&&o.l>o.w).map(([f,o])=>({f,lab:(typeof FAC_LAB!=='undefined'&&FAC_LAB[f])||f,l:o.l,w:o.w})).sort((a,b)=>(b.l-b.w)-(a.l-a.w)).slice(0,4);
  return{losses:L.length,wins:W.length,near,miss,bad};}

/* ── 2 · RECORDS — official only, colored, split by league and by market ─────
   Colors everywhere a record shows: under 50% red · 50–59% white · 60–69% green ·
   70%+ gold. "Official" = the 70% rule; "All calls" shows the quiet shadow record. */
function recColor(p,n){if(!n||p==null)return'var(--mute)';return p>=0.70?'var(--gold)':p>=0.60?'var(--win)':p>=0.50?'var(--chalk)':'var(--rust)';}
function recStats(a){let w=0,n=0,u=0;(a||[]).forEach(x=>{if(x.hit==null||x.push)return;n++;if(x.hit)w++;u+=+x.units||0;});return{w,l:n-w,n,p:n?w/n:null,u};}
function recCell(a,minN){const R=recStats(a);if(!R.n)return'<td style="color:var(--mute)">—</td>';const col=R.n>=(minN||1)?recColor(R.p,R.n):'var(--mute)';
  return`<td style="color:${col};text-align:center"><b>${R.w}-${R.l}</b><div style="font-size:9px;opacity:.85">${Math.round(R.p*100)}% · ${R.u>=0?'+':''}${R.u.toFixed(1)}u</div></td>`;}
let REC_SP='all',REC_SCOPE='off';
const REC_SPORTS=[['all','All'],['mlb','MLB'],['nfl','NFL'],['ncaaf','CFB'],['nhl','NHL'],['nba','NBA'],['ncaab','CBB']];
const REC_MK=[['ml','ML'],['spread','ATS'],['total','O/U']];
function recPool(sp,scope){const V=roGet(VOICES_KEY,[],30e3)||[];return V.filter(x=>CHARS[x.voice]&&x.graded&&x.hit!=null&&!x.push&&(sp==='all'||x.sp===sp)&&(scope==='all'||isOfficial(x)));}
/* strength lanes: character × sport × market hitting 60%+ on enough official calls */
function recLanes(V,minN){const by={};(V||recPool('all','off')).forEach(x=>{const k=x.voice+'|'+x.sp+'|'+x.market;(by[k]=by[k]||[]).push(x);});
  return Object.entries(by).map(([k,a])=>{const[v,sp,m]=k.split('|');return{v,sp,m,...recStats(a)};}).filter(o=>o.n>=(minN||8)&&o.p>=0.60).sort((a,b)=>b.p-a.p||b.u-a.u);}
function recChips(){return`<div class="chipset">${REC_SPORTS.map(([k,l])=>`<button class="msg-chip${REC_SP===k?' on':''}" onclick="REC_SP='${k}';recRefresh()">${l}</button>`).join('')}</div>
  <div class="chipset" style="margin-top:4px"><button class="msg-chip${REC_SCOPE==='off'?' on':''}" onclick="REC_SCOPE='off';recRefresh()">✅ Official (${Math.round(confFloor('ml')*100)}%+)</button><button class="msg-chip${REC_SCOPE==='all'?' on':''}" onclick="REC_SCOPE='all';recRefresh()">All calls (learning)</button></div>`;}
function recRefresh(){try{const v=document.getElementById('v-grades');if(v&&v.classList.contains('on'))renderRecordsHub();}catch(e){}try{const t=document.getElementById('v-today');if(t&&t.classList.contains('on'))renderToday(true);}catch(e){}}
function recLegend(){return`<div class="mono" style="font-size:9.5px;margin:6px 0 2px;display:flex;gap:10px;flex-wrap:wrap"><span style="color:var(--gold)">■ 70%+</span><span style="color:var(--win)">■ 60–69%</span><span style="color:var(--chalk)">■ 50–59%</span><span style="color:var(--rust)">■ under 50%</span></div>`;}
/* "Who to listen to" — every character, ML / ATS / O/U, for the chosen league */
function voicesReportCore(sp0){const sp=REC_SP!=='all'?REC_SP:(sp0&&sp0!=='all'?'all':'all');const V=recPool(sp,REC_SCOPE);
  const rows=CHAR_ORDER.map(v=>{const a=V.filter(x=>x.voice===v);
    return`<tr><td style="white-space:nowrap"><b style="color:${CHARS[v].color}">${txtEsc(charName(v).replace(/^The /,''))}</b></td>${REC_MK.map(([m])=>recCell(a.filter(x=>x.market===m),5)).join('')}${recCell(a,5)}</tr>`;}).join('');
  const L=recLanes(V,8).slice(0,8);
  return`<div class="tkt hi"><h3>Who to listen to</h3><div class="sub" style="font-size:10.5px">${REC_SCOPE==='off'?'Only official calls count — the ones a character made at '+Math.round(confFloor('ml')*100)+'%+ confidence.':'Every call, including the ones under the confidence floor (graded quietly so the characters keep learning).'}</div>
    ${recChips()}${recLegend()}
    <div style="overflow-x:auto"><table class="rec-tbl"><tr><td></td>${REC_MK.map(([,l])=>`<td>${l}</td>`).join('')}<td>All</td></tr>${rows||'<tr><td colspan="5" style="color:var(--mute)">No graded official calls here yet.</td></tr>'}</table></div>
    ${L.length?`<div class="mktlab" style="margin-top:8px">⭐ Strength lanes (60%+ on 8+ calls)</div><div class="chipset">${L.map(o=>`<span class="lane-chip" style="border-color:${recColor(o.p,o.n)};color:${recColor(o.p,o.n)}">${txtEsc(charName(o.v).replace(/^The /,''))} · ${CONF_SP_LAB[o.sp]||o.sp} ${({ml:'ML',spread:'ATS',total:'O/U'})[o.m]} <b>${o.w}-${o.l}</b></span>`).join('')}</div>`:''}</div>`;}
/* one character: every league × market it has called */
function charGridHtml(v,scope){const V=recPool('all',scope||REC_SCOPE).filter(x=>x.voice===v);const sps=REC_SPORTS.map(s=>s[0]).filter(s=>s!=='all'&&V.some(x=>x.sp===s));
  if(!sps.length)return'<div class="sub" style="font-size:10px">No graded '+(scope==='all'?'':'official ')+'calls yet.</div>';
  return`<table class="rec-tbl"><tr><td></td>${REC_MK.map(([,l])=>`<td>${l}</td>`).join('')}<td>All</td></tr>${sps.map(s=>{const a=V.filter(x=>x.sp===s);return`<tr><td>${CONF_SP_LAB[s]}</td>${REC_MK.map(([m])=>recCell(a.filter(x=>x.market===m),3)).join('')}${recCell(a,3)}</tr>`;}).join('')}
    <tr style="border-top:1px solid var(--rule)"><td><b>All</b></td>${REC_MK.map(([m])=>recCell(V.filter(x=>x.market===m),3)).join('')}${recCell(V,3)}</tr></table>`;}

/* ── 3 · IDEOLOGY — what each character believes, its dials, and how it's doing ──
   Every character's school of thought in plain words, the dials that shape its
   calls (saved per character; defaults are the built-in values), its official
   record by league × market, what it's best and worst at, and why it loses. */
const IDEO_TXT={
  Sim:{how:'Plays every game 10,000 times from team strength, injuries, rest and weather, then takes the side its simulation favors against the line.',reads:'team power and form · injuries · weather (football) · rest and schedule'},
  Judge:{how:'Weighs every witness — the Sim, predicted scores, trends, sharp money, outside picks — by how accurate each has actually been, and builds one projected score from them.',reads:'every other read, weighted by its graded record'},
  Coach:{how:'Takes or fades the model\'s side on the situation: matchup, rest, recent form. Calls a total only when the situation clearly points one way.',reads:'matchup · rest · form · totals situations'},
  'Most common':{how:'Finds the single most likely final score in the 10,000 runs and bets whatever that score says about the side, spread and total.',reads:'the simulation\'s most frequent final score'},
  Pred:{how:'Uses the predicted scores you upload from outside sources (not Covers) and bets what they imply.',reads:'your uploaded predicted scores'},
  Covers:{how:'Uses the Covers computer\'s predicted score and bets what it implies.',reads:'Covers predicted scores from your intake'},
  Trends:{how:'Adds up every uploaded trend on the game — each one shrunk by its sample size, so a 5-1 counts like ~54%, not 83% — and leans the way they point.',reads:'uploaded trends',params:[['lean','Smallest net lean that makes a call',0.05,0.01,0.3,0.01]]},
  Consensus:{how:'Fades a lopsided public, and follows the money when money runs well ahead of the tickets (that\'s sharp action).',reads:'public ticket % and money %',params:[['fade','Fade the public at (% on one side)',65,55,90,1],['sharp','Sharp money gap (money % minus tickets %)',10,5,30,1]]},
  Power:{how:'TheDesk Power Index — who\'s better and by how much — plus program prestige and the head-to-head series. Moneyline when it has an edge; spread only when the edge clears the number. No totals (it never proved skill there).',reads:'power ratings · prestige · all-time series',
    params:[['edge_nfl','NFL: spread edge needed (points)',1,0.5,7,0.5],['edge_ncaaf','CFB: spread edge needed (points)',1.5,0.5,10,0.5],['edge_nhl','NHL: puck-line edge needed (goals)',0.2,0.05,1,0.05],['edge_nba','NBA: spread edge needed (points)',1.5,0.5,8,0.5]]},
  Scout:{how:'Reads talent as matchups: superstars against busts — QB efficiency, the pass rush, ball hawks, shooters, goalies. It only votes once its own record proves it.',reads:'the Stars & Busts ledger',
    params:[['ml_nfl','NFL: talent edge for a side',0.12,0.05,0.5,0.01],['ml_ncaaf','CFB: talent edge for a side',0.15,0.05,0.5,0.01],['ml_nhl','NHL: talent edge for a side',0.12,0.05,0.5,0.01],['total','Talent edge for a total',0.3,0.1,0.8,0.05]]},
  Banker:{how:'Only bets a price the calibrated chance beats — a minimum expected value or no bet — and never shorter than -300. Built from the Blend, so it never votes.',reads:'the Blend\'s calibrated chance against the book price',params:[['ev','Minimum expected value (0.03 = +3%)',0.03,0.01,0.2,0.01]]},
  Brain:{how:'Starts from the Sim and the market, then lets every character\'s graded vote move it — the better a character\'s record, the bigger its say.',reads:'the Sim, the market and every character\'s vote'},
  Blend:{how:'The Sim\'s chance blended with the market\'s, weighted by which has predicted better lately, plus any situation adjustments that have proven real.',reads:'the Sim and the market'}};
function ideoKnobs(){return get('d4.ideoknobs',null)||{};}
function ideoSaveKnob(v,path,val){const K=ideoKnobs();const o=K[v]=K[v]||{};
  if(path==='off')o.off=!!val;else if(path.startsWith('mk.')){o.mk=o.mk||{};o.mk[path.slice(3)]=!!val;}else if(path.startsWith('sp.')){o.sp=o.sp||{};o.sp[path.slice(3)]=!!val;}
  else if(path.startsWith('p.')){o.p=o.p||{};if(val===''||val==null)delete o.p[path.slice(2)];else o.p[path.slice(2)]=+val;}
  set('d4.ideoknobs',K);try{Object.keys(CHAR_CACHE).forEach(k=>delete CHAR_CACHE[k]);}catch(e){}deskToast('Saved — '+charName(v)+'\'s new setting applies to its next calls',2600);}
function ideoReset(v){const K=ideoKnobs();delete K[v];set('d4.ideoknobs',K);try{Object.keys(CHAR_CACHE).forEach(k=>delete CHAR_CACHE[k]);}catch(e){}try{renderRecordsHub();}catch(e){}}
function ideoCardHtml(v){const C=CHARS[v];const T=IDEO_TXT[v]||{};const K=ideoKnobs()[v]||{};const S=confScout(v);const LZ=confLosses(v);
  const V=recPool('all','off').filter(x=>x.voice===v),A=recPool('all','all').filter(x=>x.voice===v);const Ro=recStats(V),Ra=recStats(A);
  const share=A.length?Math.round(V.length/A.length*100):0;
  const tog=(path,on,lab)=>`<label class="ideo-tog"><input type="checkbox" ${on?'checked':''} onchange="ideoSaveKnob('${v}','${path}',this.checked)"> ${lab}</label>`;
  const params=(T.params||[]).map(([k,lab,def,lo,hi,st])=>{const cur=K.p&&K.p[k]!=null?K.p[k]:'';return`<div class="ideo-p"><span>${txtEsc(lab)}</span><input type="number" min="${lo}" max="${hi}" step="${st}" placeholder="${def}" value="${cur}" onchange="ideoSaveKnob('${v}','p.${k}',this.value)"></div>`;}).join('');
  return`<details class="ideo-card" style="border-left:3px solid ${C.color}"><summary><b style="color:${C.color}">${txtEsc(C.chip)}</b> ${txtEsc(charName(v))} <span class="mono" style="font-size:10px;color:${recColor(Ro.p,Ro.n)}">${Ro.n?`${Ro.w}-${Ro.l} official`:'no official calls yet'}</span>${K.off?' <span class="mono" style="color:var(--rust);font-size:10px">OFF</span>':''}</summary>
    <div class="ideo-body"><div style="font-size:12.5px;line-height:1.5">${txtEsc(T.how||C.school)}</div><div class="sub" style="font-size:10px;margin-top:3px">Reads: ${txtEsc(T.reads||C.school)}</div>
      <div class="mktlab">Official record by league</div>${charGridHtml(v,'off')}
      <div class="sub mono" style="font-size:10px">${share}% of its calls clear the ${Math.round(confFloor('ml')*100)}% bar · all calls ${Ra.w}-${Ra.l}${Ra.n?' ('+Math.round(Ra.p*100)+'%)':''}</div>
      ${S.strong.length?`<div class="mktlab">💪 Best at</div>${S.strong.map(o=>`<div class="mono" style="font-size:10.5px;color:var(--win)">▲ ${txtEsc(o.lab)} — beats the odds by ${Math.round(o.r*100)} pts over ${o.n} calls</div>`).join('')}`:''}
      ${S.weak.length?`<div class="mktlab">⚠️ Weak spots</div>${S.weak.map(o=>`<div class="mono" style="font-size:10.5px;color:var(--rust)">▼ ${txtEsc(o.lab)} — trails the odds by ${Math.round(-o.r*100)} pts over ${o.n} calls</div>`).join('')}`:''}
      ${LZ.losses?`<div class="mktlab">🔎 Why it loses (official)</div><div class="mono" style="font-size:10.5px">${LZ.near} of ${LZ.near+LZ.miss} losses were close (variance) · ${LZ.miss} were clear misses${LZ.bad.length?`<br>Shows up more in its losses: ${LZ.bad.map(b=>`${txtEsc(b.lab)} (${b.l} L / ${b.w} W)`).join(' · ')}`:''}</div>`:''}
      <div class="mktlab">🎛 Dials</div><div class="ideo-togs">${tog('off',!K.off?false:true,'Switch this character off')}</div>
      <div class="ideo-togs">${['ml','spread','total'].map(m=>tog('mk.'+m,!(K.mk&&K.mk[m]===false),({ml:'Moneyline',spread:'Spreads',total:'Totals'})[m])).join('')}</div>
      <div class="ideo-togs">${['mlb','nfl','ncaaf','nhl','nba','ncaab'].map(s=>tog('sp.'+s,!(K.sp&&K.sp[s]===false),CONF_SP_LAB[s])).join('')}</div>
      ${params}<div class="bar"><button onclick="ideoReset('${v}')">Reset to defaults</button></div></div></details>`;}
function ideologyHtml(){const fl=['ml','spread','total'].map(m=>`<div class="ideo-p"><span>Confidence floor — ${({ml:'moneyline',spread:'spread',total:'total'})[m]}</span><input type="number" min="0.5" max="0.95" step="0.01" value="${confFloor(m)}" onchange="(()=>{const F=get(CONF_FLOOR_KEY,null)||{};F['${m}']=+this.value;set(CONF_FLOOR_KEY,F);deskToast('Saved',1500);})()"></div>`).join('');
  return`<div class="tkt"><h3>🧠 Ideology — why each character picks what it picks</h3><div class="sub" style="font-size:10.5px">Tap a character to see its school of thought, its official record by league, what it's best and worst at, why it loses, and the dials that shape its calls. Changes apply to its next calls; nothing already locked moves.</div>
    <details style="margin-top:6px"><summary class="mono" style="font-size:10.5px;color:var(--gold)">The 70% rule (applies to every character)</summary><div class="sub" style="font-size:10px">A call is official only when its calibrated confidence clears the floor. Books price spreads and totals close to 50/50, so most official calls are moneylines and +1.5 lines; the floor can be set per market here. On a day a sport has no call at the floor, that sport drops to ${Math.round(CONF_FALLBACK*100)}% for the day.</div>${fl}</details></div>
    ${CHAR_ORDER.map(ideoCardHtml).join('')}`;}

/* ── 4 · THE BANKER'S ALLOCATION — no pick on more than 3 tickets ─────────────
   At the freeze the Banker places the day's OFFICIAL picks (70%+, priced -300 or
   longer, game not started):
   · the Best 3, the rest of the Top 10 and the props of the day are singles —
     one placement each;
   · then every parlay competes for each pick — the Banker's own ticket first, then
     each character's ticket, then the props tickets. A pick lands only in the 3
     places it fits best: the character most confident in it AND best at that kind
     of pick (its official record in that league × market);
   · a character whose best picks are taken plays its next-best official calls;
     one with fewer than 2 official legs sits the day out;
   · ticket length is the Banker's call: 2–4 legs by Kelly growth, never under a
     30% chance to cash. */
const EXPO_CAP=3,DESK_KEY='d4.deskplan',DESK_MAXLEG=4,DESK_CASH_MIN=0.30,DESK_PROP_MIN=0.70,DESK_SKILL_MIN=0.55;
const deskKey=x=>x.sp+'|'+x.game+'|'+mkNorm(x.m||x.market)+'|'+(x.sd||x.side);
const deskPropKey=c=>'prop|'+c.sp+'|'+pstId(c.player)+'|'+c.k+'|'+c.thr;
const deskStarted=x=>{try{return typeof cbStarted==='function'&&cbStarted(x.sp,x.game);}catch(e){return false;}};
/* how well a character fits a pick: its confidence × its official record in that lane */
function deskLaneMult(v,sp,m,R){const k=v+'|'+sp+'|'+m;const o=(R||{})[k]||{w:0,n:0};const q=(o.w+10*0.5)/(o.n+10);return 0.8+0.4*q;}
let DLR_C=null;
function deskLaneRec(){const V=roGet(VOICES_KEY,[],30e3)||[];const sig=V.length;if(DLR_C&&DLR_C.sig===sig&&Date.now()-DLR_C.ts<60e3)return DLR_C.R;
  const R={};recPool('all','off').forEach(x=>{const k=x.voice+'|'+x.sp+'|'+x.market;const o=R[k]=R[k]||{w:0,n:0};o.n++;if(x.hit)o.w++;});DLR_C={sig,ts:Date.now(),R};return R;}
function deskCands(V,d){const R=deskLaneRec();const out=[];
  (V||[]).forEach(c=>{if(String(c.date).slice(0,10)!==d||!CHARS[c.voice]||c.graded||!['ml','spread','total'].includes(c.market))return;
    if(c.price==null||!bkPriceOk(c.price)||!isOfficial(c)||deskStarted(c))return;
    const cf=confOf(c);out.push({v:c.voice,sp:c.sp,game:c.game,gd:String(c.date||'').slice(0,10)||null,m:c.market,sd:c.side,line:c.line,pick:charPickText(c),price:+c.price,p:cf,cf,
      fit:cf*deskLaneMult(c.voice,c.sp,c.market,R),key:deskKey(c),start:deskGameStart(c.sp,c.game)});});
  return out;}
function deskSize(legs,kMax){const L=legs.slice(0,Math.min(kMax||DESK_MAXLEG,legs.length));if(L.length<2)return 0;
  const sz=bkSize(L.map(x=>({p:x.p,dec:americanToDecimal(x.price)})),2,L.length);let k=sz?sz.k:2;
  while(k>2&&L.slice(0,k).reduce((a,x)=>a*x.p,1)<DESK_CASH_MIN)k--;return k;}
function deskTicket(legs,v){const dec=legs.reduce((a,x)=>a*americanToDecimal(x.price),1),p=legs.reduce((a,x)=>a*(+(+x.p).toFixed(4)),1);
  return{voice:v,legs:legs.map(x=>({kind:x.kind||'game',sp:x.sp,game:x.game,gd:x.gd,start:x.start||'',pick:x.pick,price:x.price,m:x.m,sd:x.sd,line:x.line,p:+(+x.p).toFixed(4),score:+(+(x.fit!=null?x.fit:x.p)).toFixed(4),v:x.v,why:x.why||[],
    ...(x.kind==='prop'?{player:x.player,team:x.team,k:x.k,thr:x.thr,est:true}:{}),...(x.skill?{skill:true}:{})})),dec:+dec.toFixed(4),p,alloc:true};}
/* the character props the desk can use: official (70%+ calibrated), never a player the character fades */
function deskPropCands(){let C=[];try{C=cpropToday();}catch(e){}
  return C.filter(c=>c.cal>=DESK_PROP_MIN&&c.fav!=='fade').map(c=>({...c,kind:'prop',game:cpxPropGame(c.sp,c.team),pick:cpropLine(c),price:cpxPropPrice(c.cal),p:c.cal,fit:c.cal+(c.fav==='fav'?0.03:0),key:deskPropKey(c),
    why:[`${Math.round(c.cal*100)}% calibrated`+(c.rec?` · ${c.rec} on this player`:'')+(c.why?` · ${c.why}`:'')]})).filter(c=>c.game&&!deskStarted(c));}
function deskAllocate(V,d){V=V||roGet(VOICES_KEY,[],30e3)||[];d=d||today();const C=deskCands(V,d);const use={},where={};
  const take=(k,place)=>{use[k]=(use[k]||0)+1;(where[k]=where[k]||[]).push(place);};
  const free=k=>(use[k]||0)<EXPO_CAP;
  /* 1 · singles: the Best 3, then the rest of the Top 10, then the props of the day */
  let best=[],top10=[];try{const S=best5State();best=(S.top3||[]).map(x=>deskKey({...x,m:mkNorm(x.m||x.market)}));}catch(e){}
  try{top10=subTop10().map(x=>deskKey({...x,m:mkNorm(x.m||x.market)}));}catch(e){}
  [...new Set([...best,...top10])].forEach(k=>take(k,best.includes(k)?'Best 3':'Top 10'));
  /* each props character's best official prop — one character per player, the most confident */
  const PC=deskPropCands().sort((a,b)=>b.fit-a.fit);const props=[];const seenPl=new Set(),seenV=new Set();
  for(const c of PC){if(props.length>=5)break;if(seenPl.has(c.player)||seenV.has(c.voice))continue;seenPl.add(c.player);seenV.add(c.voice);props.push(c);take(c.key,'Props of the day');}
  /* 2 · the Banker's own: picks 2+ characters made officially, pooled */
  const pool={};C.forEach(x=>{if(META_VOICES.has(x.v))return;const o=pool[x.key]||(pool[x.key]={...x,by:[],fits:[]});o.by.push(x.v);o.fits.push(x.fit);o.p=Math.max(o.p,x.p);});
  const ranked=Object.values(pool).filter(o=>o.by.length>=2).map(o=>({...o,fit:o.fits.reduce((a,b)=>a+b,0)/o.fits.length+0.01*Math.min(4,o.by.length-1)})).sort((a,b)=>b.fit-a.fit);
  const ownL=[];for(const o of ranked){if(!free(o.key))continue;if(ownL.some(y=>y.sp===o.sp&&y.game===o.game))continue;ownL.push(o);if(ownL.length===DESK_MAXLEG)break;}
  let own=null;const ko=deskSize(ownL);if(ko>=2){const legs=ownL.slice(0,ko);legs.forEach(x=>take(x.key,'The Banker'));own=deskTicket(legs.map(x=>({...x,v:x.by[0],why:['🏦 '+x.by.length+' characters on it']})),'Banker');own.by=legs.map(x=>x.by);}
  /* 3 · each character's target length from its own best official legs */
  const byV={};C.forEach(x=>{(byV[x.v]=byV[x.v]||[]).push(x);});const target={};
  Object.entries(byV).forEach(([v,a])=>{a.sort((p,q)=>q.fit-p.fit);const u=[],L=[];for(const x of a){if(u.includes(x.sp+'|'+x.game))continue;u.push(x.sp+'|'+x.game);L.push(x);if(L.length===DESK_MAXLEG)break;}target[v]=deskSize(L);});
  /* 4 · every (character, pick) pair competes on fit; a pick fills its best-fit places first */
  const tix={};C.slice().sort((a,b)=>b.fit-a.fit).forEach(x=>{const T=target[x.v]||0;if(T<2)return;const t=tix[x.v]=tix[x.v]||[];if(t.length>=T)return;
    if(!free(x.key))return;if(t.some(y=>y.sp===x.sp&&y.game===x.game))return;t.push(x);take(x.key,charName(x.v));});
  /* no ticket may repeat another: a character whose legs are all already on one other ticket swaps
     its weakest shared leg for its next-best official leg that still has room — or sits out */
  const release=(x,v)=>{use[x.key]--;const w=where[x.key]||[];const i=w.indexOf(charName(v));if(i>=0)w.splice(i,1);};
  const issued=own?[{v:'Banker',keys:new Set(own.legs.map(l=>deskKey(l)))}]:[];const chars={},dupOut={};
  const meanFit=t=>t.reduce((a,x)=>a+x.fit,0)/Math.max(1,t.length);
  Object.entries(tix).sort((a,b)=>meanFit(b[1])-meanFit(a[1])).forEach(([v,t])=>{if(t.length<2){t.forEach(x=>release(x,v));return;}
    for(let n=0;n<6;n++){const dup=issued.find(I=>t.every(x=>I.keys.has(x.key)));if(!dup)break;
      const rep=(byV[v]||[]).filter(c=>!t.some(y=>y.key===c.key)&&free(c.key)&&!dup.keys.has(c.key)).sort((a,b)=>b.fit-a.fit)
        .find(c=>{const i=t.map((y,j)=>[y,j]).filter(([y])=>dup.keys.has(y.key)).sort((a,b)=>a[0].fit-b[0].fit)[0];return i&&!t.some((y,j)=>j!==i[1]&&y.sp===c.sp&&y.game===c.game);});
      if(!rep)break;const i=t.map((y,j)=>[y,j]).filter(([y])=>dup.keys.has(y.key)).sort((a,b)=>a[0].fit-b[0].fit)[0][1];release(t[i],v);t[i]=rep;take(rep.key,charName(v));}
    if(issued.some(I=>t.every(x=>I.keys.has(x.key)))){t.forEach(x=>release(x,v));dupOut[v]=1;return;}
    issued.push({v,keys:new Set(t.map(x=>x.key))});chars[v]=deskTicket(t.sort((a,b)=>b.fit-a.fit),v);});
  /* 4b · v2.43 · SKILL TICKETS — a character with no official ticket still plays: its most
     confident priced calls today, ranked by its own record in that lane (its skill set).
     Never a lane blocked for it, never priced shorter than -300 or longer than +400, never a
     leg it would bet at negative value, never a pick the sim reads wildly off the market
     unless that lane is proven for it. Same 2–4 legs / 30%-to-cash sizing and the same
     3-ticket cap. Labeled as under the 70% rule, graded on its own record, and kept off
     the VIP card (whose promise is 70%+). */
  Object.assign(chars,deskSkillTickets(V,d,{free,take,issued,chars}));
  /* 5 · props tickets: a character's best official props plus its official game legs that still have room */
  const px={};CPROP_VOICES.forEach(v=>{const mine=PC.filter(c=>c.voice===v);if(!mine.length)return;const legs=[],games=new Set();
    for(const c of mine){if(legs.filter(l=>l.kind==='prop').length>=2)break;if(!free(c.key)||games.has(c.sp+'|'+c.game))continue;games.add(c.sp+'|'+c.game);legs.push({...c,v});}
    if(!legs.length)return;
    for(const x of (byV[v]||[]).slice().sort((a,b)=>b.fit-a.fit)){if(legs.length>=DESK_MAXLEG)break;if(!free(x.key)||games.has(x.sp+'|'+x.game))continue;games.add(x.sp+'|'+x.game);legs.push({...x,kind:'game'});}
    legs.sort((a,b)=>b.fit-a.fit);const k=deskSize(legs);if(k<2)return;let pick=legs.slice(0,k);if(!pick.some(l=>l.kind==='prop')){const pr=legs.find(l=>l.kind==='prop');pick=pick.slice(0,k-1).concat(pr);}
    pick.forEach(l=>take(l.key,charName(v)+' (props)'));px[v]=deskTicket(pick,v);px[v].props=pick.filter(l=>l.kind==='prop').length;});
  return{d,ts:Date.now(),own,chars,px,props:props.map(c=>({v:c.voice,sp:c.sp,player:c.player,team:c.team,k:c.k,thr:c.thr,cal:c.cal,fav:c.fav,rec:c.rec,why:c.why,game:c.game,start:deskTeamStart(c.sp,c.team)})),
    use,where,cands:C.length,skill:Object.keys(chars).filter(v=>chars[v].skill),sat:Object.keys(byV).filter(v=>!chars[v]).map(v=>({v,why:(target[v]||0)<2?'fewer than 2 official legs today':dupOut[v]?'its ticket would have copied another one':'its picks were already on 3 tickets'}))};}
/* v2.43 · SKILL TICKETS — a character with no official ticket still plays: its most confident
   priced calls today, ranked by its own record in that lane (its skill set). Never a lane
   blocked for it, never priced shorter than -300 or longer than +400, never a leg it would bet
   at negative value, never a pick the sim reads wildly off the market unless that lane is
   proven. Same 2–4 legs / 30%-to-cash sizing and the same 3-ticket cap. Labeled as under the
   70% rule, graded on their own record, kept off the VIP card (its promise is 70%+) and off
   the public cashed showcase. */
/* the line on YOUR book for a market/side (your uploads outrank the API feeds; newest capture wins) */
function deskBookRow(sp,game,m,side,d){const K={ncaaf:'d4.ncaafshots',nfl:'d4.nflshots',nhl:'d4.nhlshots'}[sp];if(!K)return null;const all=roGet(K,{},60e3)||{};let best=null;
  [dayShift(d,-1),d,dayShift(d,1)].forEach(dd=>(all[dd]||[]).forEach(r=>{if((r.game||(r.away+'@'+r.home))!==game)return;const mk=r.market==='moneyline'?'ml':r.market;if(mk!==m||r.side!==side||r.price==null)return;
    const api=/^(espn|odds|oddsapi|sharp|rundown|oddspapi|api)/i.test(r.src||'');const sc=[api?0:1,+r.capturedAt||0];if(!best||sc[0]>best.sc[0]||(sc[0]===best.sc[0]&&sc[1]>=best.sc[1]))best={r,sc};}));
  return best?best.r:null;}
function deskSkillTickets(V,d,ctx){const {free,take,issued,chars}=ctx;
  const BYV=(()=>{try{return laneTable().BYV||{};}catch(e){return{};}})();const G=(()=>{try{return laneTable().G||{};}catch(e){return{};}})();
  const TCd=(()=>{try{const T=roGet(TC_KEY,{},30e3)||{};return T.d===d?T.by||{}:{};}catch(e){return{};}})();
  const cardPick=c=>{const B=TCd[c.sp]||{};return(B.picks||[]).find(y=>y.game===c.game&&mkNorm(y.m||y.market)===c.market&&(y.sd||y.side)===c.side)||null;};
  const skillCands=v=>V.filter(c=>c.voice===v&&String(c.date).slice(0,10)===d&&!c.graded&&['ml','spread','total'].includes(c.market)&&c.price!=null&&!c.kof&&!confPre(c)&&!deskStarted(c))
    .map(c=>{const cf=confOf(c);if(cf==null||cf<DESK_SKILL_MIN)return null;
      /* priced off YOUR book: a call made at another line is skipped; at the same line it takes your price */
      const row=deskBookRow(c.sp,c.game,c.market,c.side,d);if(row&&c.market!=='ml'&&row.line!=null&&c.line!=null&&Math.abs(+row.line-(+c.line))>0.01)return null;
      const price=row?+row.price:+c.price;if(!bkPriceOk(price)||price>400)return null;if(cf*americanToDecimal(price)-1<0)return null;
      const lk=laneKey(c.sp,c.market,c.side,c.price,c.line);const st=lk?laneStatus(lk,v):'thin';if(st==='blocked')return null;
      const x=cardPick(c);if(x&&x.suspect&&(st!=='proven'||(x.mp!=null&&x.mkt!=null&&Math.abs(x.mp-x.mkt)>0.25)))return null;
      const o=(BYV[v]||{})[lk]||{n:0,w:0};const q=(o.w+5)/(o.n+10);const g=G[lk];
      const rec=lk?[o.n?`${charName(v).replace(/^The /,'')} ${o.w}-${o.n-o.w} here`:'',g&&g.st==='proven'?`lane ✓ proven (${g.w}-${g.n-g.w} all characters)`:''].filter(Boolean).join(' · '):'';
      return{v,sp:c.sp,game:c.game,gd:String(c.date||'').slice(0,10)||null,m:c.market,sd:c.side,line:c.line,pick:charPickText(c),price,p:cf,cf,fit:cf*(0.8+0.4*q),key:deskKey(c),start:deskGameStart(c.sp,c.game),skill:true,
        why:[`skill pick · ${Math.round(cf*100)}%`+(lk?` · ${laneName(lk)}`:'')+(rec?` · ${rec}`:'')]};}).filter(Boolean).sort((a,b)=>b.fit-a.fit);
  const out={};
  CHAR_ORDER.filter(v=>v!=='Banker'&&!chars[v]).forEach(v=>{const L=[],games=new Set();
    for(const x of skillCands(v)){if(!free(x.key)||games.has(x.sp+'|'+x.game))continue;games.add(x.sp+'|'+x.game);L.push(x);if(L.length===DESK_MAXLEG)break;}
    const k=deskSize(L);if(k<2)return;const t=L.slice(0,k);
    if(issued.some(I=>t.every(x=>I.keys.has(x.key))))return;   /* never a copy of another ticket */
    t.forEach(x=>take(x.key,charName(v)+' (skill)'));issued.push({v,keys:new Set(t.map(x=>x.key))});
    const T=deskTicket(t,v);T.skill=true;out[v]=T;});
  return out;}
/* a day frozen before skill tickets existed gets them once, added only: games not started,
   the frozen official tickets, Best 3, Banker and VIP card untouched */
function deskSkillAddOn(S){try{if(!S||S.skillDone||!S.locked)return S;const d=S.d;const V=roGet(VOICES_KEY,[],30e3)||[];
    const use={...(S.use||{})},where={...(S.where||{})};const take=(k,place)=>{use[k]=(use[k]||0)+1;(where[k]=where[k]||[]).push(place);};const free=k=>(use[k]||0)<EXPO_CAP;
    const issued=[];if(S.own)issued.push({v:'Banker',keys:new Set((S.own.legs||[]).map(l=>deskKey(l)))});Object.entries(S.chars||{}).forEach(([v,T])=>issued.push({v,keys:new Set((T.legs||[]).map(l=>deskKey(l)))}));
    const add=deskSkillTickets(V,d,{free,take,issued,chars:S.chars||{}});
    S.chars={...(S.chars||{}),...add};S.use=use;S.where=where;S.skillDone=Date.now();S.skill=Object.keys(S.chars).filter(v=>S.chars[v].skill);set(DESK_KEY,S);
    const C=get(CPAR_KEY,{})||{};const D=C[d];if(D&&D.locked){Object.entries(add).forEach(([v,T])=>{if(D.by[v])return;D.by[v]=cparFromDesk(v,d,T);});D.skillDone=S.skillDone;set(CPAR_KEY,C);}}catch(e){console.warn('skill add-on',e);}
  return S;}
function cparFromDesk(v,d,T){return{voice:v,d,legs:T.legs.map(l=>({sp:l.sp,game:l.game,gd:l.gd,start:l.start||'',pick:l.pick,price:l.price,m:l.m,sd:l.sd,line:l.line,p:l.p,score:l.score,why:l.why||[],...(l.skill?{skill:true}:{})})),dec:T.dec,p:T.p,
    size:{k:T.legs.length,why:T.skill?`${T.legs.length} legs — ${Math.round(T.p*100)}% to cash · skill ticket: its most confident picks in its best lanes (under the 70% rule)`:`${T.legs.length} legs — ${Math.round(T.p*100)}% to cash, every leg official and on no more than 3 tickets`},alloc:true,...(T.skill?{skill:true}:{})};}
/* the day's plan: a live preview until the master evaluation, frozen from then on */
let DESK_MEM=null;
function deskPlan(){const d=today();const S=get(DESK_KEY,{})||{};if(S.d===d&&S.locked)return S.skillDone?S:deskSkillAddOn(S);
  const locked=evalRanToday();if(!locked&&DESK_MEM&&DESK_MEM.d===d&&Date.now()-DESK_MEM.t<60e3)return DESK_MEM.P;
  const P=deskAllocate(null,d);P.locked=locked;if(locked){P.lockedAt=Date.now();P.skillDone=P.lockedAt;set(DESK_KEY,P);}DESK_MEM={d,t:Date.now(),P};return P;}
/* how many tickets a pick is on today (the frozen plan + your own tickets) */
function deskExposure(x){const P=deskPlan();const k=deskKey({...x,m:mkNorm(x.m||x.market)});let n=(P.use||{})[k]||0;
  try{(roGet(LS.locked,[],5e3)||[]).forEach(t=>{if(t.archived||String(t.date||'').slice(0,10)!==today())return;(t.legs||[]).forEach(l=>{if((l.sport||'mlb')!==x.sp||l.game!==x.game)return;
      const [a,h]=String(l.game).split('@');const q=sqKey(l.sport||'mlb',{away:{abbr:a},home:{abbr:h}},l.pick);if(q&&q.market===mkNorm(x.m||x.market)&&q.side===(x.sd||x.side))n++;});});}catch(e){}
  return n;}
/* a game's start, for the 30-minute public unlock: today's card, the board, then the live scoreboard */
function deskGameStart(sp,game){try{const T=roGet(TC_KEY,{},30e3)||{};const B=((T.by||{})[sp]||{});const x=(B.picks||[]).find(y=>y.game===game&&y.start);if(x)return x.start;}catch(e){}
  try{const g=(sportGames(sp)||[]).find(z=>(z.away.abbr+'@'+z.home.abbr)===game);if(g&&(g.start||g.date||g.gameDate))return g.start||g.date||g.gameDate;}catch(e){}
  try{const e=mgEventFor(sp,game,today(),true);if(e&&e.start)return e.start;}catch(e){}return'';}
function deskTeamStart(sp,team){try{const T=roGet(TC_KEY,{},30e3)||{};const B=((T.by||{})[sp]||{});const x=(B.picks||[]).find(y=>String(y.game).split('@').includes(team)&&y.start);if(x)return x.start;}catch(e){}
  try{const g=(sportGames(sp)||[]).find(z=>z.away.abbr===team||z.home.abbr===team);if(g)return g.start||g.date||g.gameDate||'';}catch(e){}return'';}

/* the plan's tickets become the character parlays (game lines, and with props) —
   a day that already locked is never rebuilt */
function cparState(){const d=today();const S=get(CPAR_KEY,{})||{};if(S[d]&&S[d].locked){if(!S[d].skillDone){try{deskPlan();}catch(e){}const S2=get(CPAR_KEY,{})||{};if(S2[d])return S2[d];}return S[d];}
  const P=deskPlan();const day={locked:!!P.locked,by:{},floor:BK_FLOOR,alloc:true,...(P.skillDone?{skillDone:P.skillDone}:{})};
  Object.entries(P.chars||{}).forEach(([v,T])=>{day.by[v]=cparFromDesk(v,d,T);});
  if(P.locked){S[d]=day;Object.keys(S).sort().slice(0,-60).forEach(k=>delete S[k]);set(CPAR_KEY,S);}
  return day;}
function cpxState(){const d=today();const S=get(CPX_KEY,{})||{};if(S[d]&&S[d].locked)return S[d];
  const P=deskPlan();const day={locked:!!P.locked,by:{},alloc:true};
  Object.entries(P.px||{}).forEach(([v,T])=>{day.by[v]={voice:v,d,legs:T.legs,dec:T.dec,p:T.p,props:T.props||T.legs.filter(l=>l.kind==='prop').length,alloc:true};});
  if(P.locked){S[d]=day;Object.keys(S).sort().slice(0,-60).forEach(k=>delete S[k]);set(CPX_KEY,S);}
  return day;}

/* ── 5 · THE 70% RULE ON THE CARDS — Best 3, Top 10, props, Today ─────────────
   A pick makes a card only when at least one character made it officially (70%+
   calibrated confidence). Its % is that confidence. Ranked by fit: the most
   confident character's confidence × its official record in that league ×
   market. Priced -300 to +400 and the confidence has to beat the price. */
const DESK_B3_LO=-300;
function pickFit(x,sp,o,R){o=o||pickConf(x,sp);if(!o)return 0;return o.cf*deskLaneMult(o.best,x.sp||sp,mkNorm(x.m||x.market),R||deskLaneRec());}
/* a card locked by a pre-v1.73 build keeps the rules it was locked under */
function best3PoolLegacy(by,sp){const pool=[];Object.entries(by).forEach(([s0,B])=>{if(sp&&s0!==sp)return;(B.picks||[]).forEach(x0=>{const x={...x0,sp:x0.sp||s0};const p=best5Prob(x);const ev=best3Ev(x);
    if(x.price==null||x.price<-200||x.price>BEST3_HI||x.incoherent||x.suspect||best3Tier(x)<1||p==null||p<0.45||ev==null||ev<1)return;pool.push({...x,p,ev});});});
  pool.sort((a,b)=>best3Tier(b)-best3Tier(a)||b.ev-a.ev);const u=new Set(),out=[];for(const x of pool){const k=x.sp+'|'+x.game;if(u.has(k))continue;u.add(k);out.push(x);if(out.length===3)break;}out.why={};return out;}
function best3Pool(by,sp,opts){opts=opts||{};if(opts.ignoreTime)return best3PoolLegacy(by,sp);const pool=[],why={total:0,price:0,day:0,started:0,flag:0,ev:0,tier:0,prob:0,conf:0};const R=deskLaneRec();
  Object.entries(by).forEach(([s0,B])=>{if(sp&&s0!==sp)return;(B.picks||[]).forEach(x0=>{const x={...x0,sp:x0.sp||s0};why.total++;
    if(x.price==null||+x.price<DESK_B3_LO||+x.price>BEST3_HI){why.price++;return;}
    if(!opts.ignoreTime&&!tcIsToday(x)){why.day++;return;}
    if(!opts.ignoreTime&&best5Started(x)){why.started++;return;}
    if(x.incoherent||x.suspect){why.flag++;return;}
    if(laneStatus(pickLane(x,s0))==='blocked'){why.lane=(why.lane||0)+1;return;}
    if(pickDisagrees(x,s0)){why.flag++;return;}
    const o=pickConf(x,s0);if(!o){why.conf++;return;}
    const p=o.cf,ev=(p*americanToDecimal(+x.price)-1)*100;if(ev<0.5){why.ev++;return;}
    pool.push({...x,p,ev,cf:p,conf:o.n,confBy:o.who,fit:pickFit(x,s0,o,R)});});});
  pool.sort((a,b)=>b.fit-a.fit||b.ev-a.ev);
  /* v2.50 · one sport can't take all three while another has a qualifying pick: each sport's best first, then the best of the rest */
  const u=new Set(),per=new Set(),out=[];for(const x of pool){if(out.length===3)break;const k=x.sp+'|'+x.game;if(u.has(k)||per.has(x.sp))continue;u.add(k);per.add(x.sp);out.push(x);}
  for(const x of pool){if(out.length===3)break;const k=x.sp+'|'+x.game;if(u.has(k))continue;u.add(k);out.push(x);}
  out.sort((a,b)=>b.fit-a.fit||b.ev-a.ev);out.why=why;return out;}
function best3Near(n){const T=get(TC_KEY,{})||{};if(T.d!==today())return[];const out=[];
  Object.entries(T.by||{}).forEach(([s0,B])=>(B.picks||[]).forEach(x0=>{const x={...x0,sp:x0.sp||s0};if(!tcIsToday(x)||best5Started(x))return;const o=pickConf(x,s0);const p=o?o.cf:pickConfAny(x,s0);
    const ev=p!=null&&x.price!=null?(p*americanToDecimal(+x.price)-1)*100:null;let why=null;
    try{if(x.price==null)why='no book price';else if(+x.price<DESK_B3_LO)why=`priced ${x.price} — shorter than -300`;else if(+x.price>BEST3_HI)why='longer than +400';
      else if(x.incoherent||x.suspect)why='flagged: '+(x.suspect||'incoherent with its other markets');else if(laneStatus(pickLane(x,s0))==='blocked')why='lane blocked: '+laneName(pickLane(x,s0));
      else if(pickDisagrees(x,s0))why='model fighting the market';
      else if(!o)why=p!=null?`most confident character: ${Math.round(p*100)}% — under the ${Math.round(confFloorFor({sp:s0,market:mkNorm(x.m),date:today()})*100)}% rule`:'no character confidence on it yet';
      else if(ev<0.5)why=`${Math.round(p*100)}% sure, but the price needs ${Math.round(imp(+x.price)*100)}% — no value`;}catch(e){}
    if(why)out.push({sp:s0,game:x.game,pick:x.pick,price:x.price,p,ev,why,tier:best3Tier(x)});}));
  return out.sort((a,b)=>(b.p||0)-(a.p||0)).slice(0,n||5);}
/* the Best card's 3 props: 70%+ only — your pasted prop lines first, then the characters' calibrated calls, then game-log lines */
function best3Props(){let props=[];const TT={};const plays=(sp,t)=>{const s=TT[sp]||(TT[sp]=teamsToday(sp));return!!t&&s.has(t);};
  try{props=propBoard(null,null).filter(x=>x.matched&&x.best&&x.n>=4&&plays(x.sp,x.team)).map(x=>{const pO=x.pOver,side=pO>=0.5?'over':'under',p=side==='over'?pO:1-pO;
      return{sp:x.sp,player:x.player,team:x.team,stat:x.stat,keys:x.keys,thr:x.thr,side,price:side==='over'?x.over:x.under,p,ev:side==='over'?x.evO:x.evU,mu:x.mu,n:x.n};})
    .filter(x=>x.p>=DESK_PROP_MIN&&(x.ev==null||x.ev>=0)&&(x.price==null||x.price>=DESK_B3_LO)).sort((a,b)=>b.p-a.p).slice(0,3);}catch(e){}
  if(props.length<3){try{const C=cpropToday().filter(c=>c.cal>=DESK_PROP_MIN&&c.fav!=='fade').sort((a,b)=>b.cal-a.cal);
    for(const c of C){if(props.length>=3)break;if(props.some(y=>y.player===c.player))continue;
      props.push({sp:c.sp,player:c.player,team:c.team,stat:CPROP_LAB[c.k]||c.k,keys:[c.k],thr:c.thr-0.5,side:'over',price:null,p:c.cal,ev:null,mu:c.mu,n:null,likely:true,voice:c.voice});}}catch(e){}}
  if(props.length<3){try{const lab={pts:'PTS',reb:'REB',ast:'AST',fg3:'3PM',py:'PASS YDS',ry:'RUSH YDS',wy:'REC YDS',rec:'REC',td:'ATD',h:'H',tb:'TB',hr:'HR',k:'K',s:'SOG',g:'G'};
    const L=['nfl','ncaaf','nba','ncaab','nhl','mlb'].flatMap(sp=>{try{return propLikely(sp,8);}catch(e){return[];}}).filter(x=>x.p>=DESK_PROP_MIN).sort((a,b)=>b.p-a.p);
    for(const x of L){if(props.length>=3)break;if(props.some(y=>y.player===x.player))continue;
      props.push({sp:x.sp,player:x.player,team:x.team,stat:lab[x.k]||x.k,keys:[x.k],thr:x.thr-0.5,side:'over',price:null,p:x.p,ev:null,mu:x.mu,n:x.n,likely:true});}}catch(e){}}
  props.forEach(x=>{if(!x.start)x.start=deskTeamStart(x.sp,x.team);});
  return props;}
/* the rest of the Top 10 (the Best 3 aren't repeated) */
function subTop10(){const T=get(TC_KEY,{})||{};if(T.d!==today())return[];let best=[];try{best=(best5State().top3||[]).map(x=>deskKey({...x,m:mkNorm(x.m||x.market)}));}catch(e){}
  const R=deskLaneRec();const out=[];
  Object.entries(T.by||{}).forEach(([sp,B])=>(B.picks||[]).forEach(x0=>{const x={...x0,sp:x0.sp||sp};
    if(x.price==null||amerOk(x.price)==null||+x.price<BK_FLOOR||+x.price>400)return;if(!tcIsToday(x)||best5Started(x))return;if(x.incoherent||x.suspect)return;
    if(laneStatus(pickLane(x,sp))==='blocked'||pickDisagrees(x,sp))return;const o=pickConf(x,sp);if(!o)return;const p=o.cf;const ev=(p*americanToDecimal(+amerOk(x.price))-1)*100;if(ev<0)return;
    if(best.includes(deskKey({...x,m:mkNorm(x.m)})))return;out.push({...x,p,ev,cf:p,play:true,fit:pickFit(x,sp,o,R),confBy:o.who});}));
  const seen=new Set();return out.sort((a,b)=>b.fit-a.fit||b.ev-a.ev).filter(x=>{const k=x.sp+'|'+x.game+'|'+x.m;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,Math.max(0,10-best.length));}
/* Today's "Official" filter: the 70% rule + the price + the flags. Frozen at the master evaluation. */
function tfPlayable(x,sp){if(x&&x.fz)return!!x.fz.play;try{if(x.incoherent||x.suspect)return false;if(x.price==null||amerOk(x.price)==null||+x.price<BK_FLOOR)return false;
    if(laneStatus(pickLane(x,sp))==='blocked')return false;if(pickDisagrees(x,sp))return false;const o=pickConf(x,sp);if(!o)return false;return o.cf*americanToDecimal(+amerOk(x.price))-1>=0;}catch(e){return false;}}
function tcFreeze(){const T=get(TC_KEY,{})||{};if(T.d!==today())return 0;let n=0;
  Object.entries(T.by||{}).forEach(([sp,B])=>(B.picks||[]).forEach(x=>{if(x.fz)return;const o=pickConf(x,sp);x.fz={play:tfPlayable(x,sp),cf:o?o.cf:pickConfAny(x,sp),off:!!o,by:o?o.who:[],ts:Date.now()};n++;}));
  T.frozen=T.frozen||Date.now();set(TC_KEY,T);return n;}
/* the confidence chip on a pick (Today, game cards) */
function tcConfChip(sp,x){try{const fz=x.fz;const o=fz?{cf:fz.cf,n:fz.off?1:0}:(pickConf(x,sp)||{cf:pickConfAny(x,sp),n:0});if(o.cf==null)return'';
  const off=fz?fz.off:o.n>0;const c=off?(o.cf>=0.8?'var(--gold)':'var(--win)'):'var(--mute)';
  return`<span class="cf-chip${off?' on':''}" style="color:${c};border-color:${c}" title="${off?'Official — a character is '+Math.round(o.cf*100)+'% sure':'Not official — under the 70% rule'}">${off?'✅ ':''}${Math.round(o.cf*100)}%</span>`;}catch(e){return'';}}

/* ── 6 · ONE BANKROLL — the same number on every screen ─────────────────────────
   Starts from the balance you had (the Money tab's, which tracked your staked
   tickets) and moves only with real things: a staked ticket settling, money you
   add or take out, or you setting it to what your book says. No daily cap and no
   ticket cap anymore. "In play" = stakes on tickets that haven't settled.
   Challenges are earmarked slices of this same money, never a second balance. */
const BANK_KEY='d4.bank';
function bankCfg(){let B=get(BANK_KEY,null);if(B&&B.v===1)return B;
  let b=null;try{b=get('d4.bankroll',null);}catch(e){}
  const money=b?BR_BASELINE+(+b.profit||0):BR_BASELINE;const deb=b&&b.debited?Object.values(b.debited).reduce((a,x)=>a+(+x||0),0):0;
  let chal=0;try{chal=msAll().filter(m=>m.status==='active').reduce((a,m)=>a+(+m.balance||0),0);}catch(e){}
  B={v:1,start:+(money+deb).toFixed(2),since:Date.now(),sinceD:today(),adj:[],migr:{money:+money.toFixed(2),banker:parseFloat(get('d4.brAmount',''))||null,challenges:+chal.toFixed(2)},fresh:true};
  set(BANK_KEY,B);return B;}
function bankOpen(){const b=getBankroll();const H=new Set((b.history||[]).map(h=>String(h.id)));const W=getWagers()||{};let open=0;const ids=[];
  (roGet(LS.locked,[],5e3)||[]).forEach(t=>{if(!t||t.archived||TRACKED_ONLY_SOURCES.has(t.source))return;const w=+W[t.id]||0;if(w<=0||H.has(String(t.id)))return;open+=w;ids.push(t.id);});
  return{open:+open.toFixed(2),ids};}
function bankState(){const B=bankCfg();const b=getBankroll();const H=(b.history||[]).filter(h=>(h.ts||0)>=B.since);
  const settled=H.reduce((a,h)=>a+(+h.profit||0),0),adj=(B.adj||[]).reduce((a,x)=>a+(+x.amt||0),0);const O=bankOpen();
  const avail=B.start+adj+settled-O.open;const ws=bkWeekStart();const wk=H.filter(h=>String(h.date)>=ws).reduce((a,h)=>a+(+h.profit||0),0);
  let ear=0;try{ear=ch2All().filter(c=>c.status==='active').reduce((a,c)=>a+Math.max(0,c.pot),0);}catch(e){}
  return{start:B.start,adj,settled:+settled.toFixed(2),open:O.open,openN:O.ids.length,avail:+avail.toFixed(2),total:+(avail+O.open).toFixed(2),week:+wk.toFixed(2),ws,
    w:H.filter(h=>h.won===true).length,l:H.filter(h=>h.won===false).length,pu:H.filter(h=>h.won==='push').length,hist:H,cfg:B,ear:+ear.toFixed(2)};}
function bankBalance(){try{return bankState().avail;}catch(e){return 0;}}
function bankSetBalance(target){target=parseFloat(String(target).replace(/[$,]/g,''));if(!isFinite(target)||target<0)return false;const S=bankState();const B=bankCfg();
  B.adj=(B.adj||[]).concat({ts:Date.now(),d:today(),amt:+(target-S.avail).toFixed(2),note:'set to $'+target.toFixed(2)});delete B.fresh;set(BANK_KEY,B);return true;}
function bankMove(amt,note){amt=parseFloat(String(amt).replace(/[$,]/g,''));if(!isFinite(amt)||!amt)return false;const B=bankCfg();
  B.adj=(B.adj||[]).concat({ts:Date.now(),d:today(),amt:+amt.toFixed(2),note:note||(amt>0?'added':'taken out')});delete B.fresh;set(BANK_KEY,B);return true;}
/* the old monthly ledger keeps settling tickets; it just no longer drops open stakes at a new month */
function getBankroll(){const b=get('d4.bankroll',null);const m=currentMonth();
  if(!b||b.month!==m){const fresh={month:m,profit:0,limitMult:b&&b.limitMult?Math.max(1,b.limitMult):1.0,carriedMult:b&&b.limitMult>1?b.limitMult:null,history:b?b.history||[]:[],debited:b&&b.debited?b.debited:{}};
    set('d4.bankroll',fresh);return fresh;}
  return b;}
function checkStakeAllowed(ticketId,newStake){const w=getWagers()||{};const mine=+w[ticketId]||0;const avail=bankBalance()+mine;
  if(newStake>avail+0.001)return{ok:false,reason:`Only ${deskMoney(Math.max(0,avail))} available in your bankroll.`};return{ok:true};}
function dailyLimit(){return Math.max(0,bankBalance());}
function ticketLimit(){return Math.max(0,bankBalance());}
/* the Banker never puts more than 10% of the bankroll on one day's desk */
function bkBudget(){const B=Math.max(0,bankBalance());return{B,cap:+(B*0.10).toFixed(2),fromLimit:false};}
/* a stake that wins at least $1 (the house rule), ¼-Kelly of the bankroll, capped 2% a ticket */
function deskMinStake(dec){return dec>1?Math.ceil(100/(dec-1)-1e-6)/100:0;}
function deskStake(t,B){const p=t.p,D=t.dec;if(!(D>1)||!(p>0))return 0;const ev=p*D-1;if(ev<=0)return 0;const f=Math.min(0.02,ev/(D-1)/4);
  const s=Math.max(deskMinStake(D),Math.round(B*f*100)/100);return s>B?0:+s.toFixed(2);}
const deskMoney=x=>(x<0?'-$':'$')+Math.abs(+x||0).toFixed(2);

/* ── 7 · THE CHARACTER LEAGUE — $100 a week each, Tuesday to Tuesday ──────────
   Every character starts the week (Tuesday, when the college week starts and the
   NFL week is done) with $100. Each OFFICIAL call it makes is a bet: 2% of its
   current roll, but never a bet that pays under $1 — a -130 favorite needs $1.30
   to win $1. Its locked parlay rides at 1% (same $1 rule). A roll that can't cover
   the next bet is busted for the week. Most units ($1 = 1u) on Monday night wins. */
const LG_START=100;
function lgStake(br,dec,frac){if(!(dec>1))return 0;const st=Math.max(1,Math.round(br*(frac||0.02)*100)/100,Math.ceil(100/(dec-1)-1e-6)/100);return st>br+1e-9?0:+st.toFixed(2);}
function bkRunWeek(ws,V,CP,BYV){const we=dayShift(ws,6);const out={};
  CHAR_ORDER.forEach(v=>{const calls=(BYV?BYV[v]||[]:V).filter(x=>x.voice===v&&x.graded&&x.date>=ws&&x.date<=we&&isOfficial(x)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    let br=LG_START,peak=LG_START,dd=0,w=0,l=0,p=0,staked=0,bust=0;const byM={};
    const bet=(dec,hit,m,frac)=>{if(hit==null){p++;return;}const st=lgStake(br,dec,frac);if(!st){bust++;return;}staked+=st;const pnl=hit?st*(dec-1):-st;br=+(br+pnl).toFixed(2);
      if(hit)w++;else l++;const M=byM[m]=byM[m]||{pnl:0,n:0};M.pnl+=pnl;M.n++;peak=Math.max(peak,br);dd=Math.max(dd,(peak-br)/peak);};
    calls.forEach(c=>{if(c.push){p++;return;}bet(americanToDecimal(c.price!=null?c.price:-110),c.hit,c.sp+' '+c.market,0.02);});
    Object.entries(CP||{}).forEach(([d,D])=>{if(d<ws||d>we||!D||!D.locked)return;const P=(D.by||{})[v];if(!P||!P.done)return;
      const dec=P.legs.filter(x=>!x.push).reduce((a,x)=>a*americanToDecimal(x.price),1);bet(dec,P.won,'parlay',0.01);});
    const ms=Object.entries(byM).filter(([k,x])=>x.n>=3).sort((a,b)=>b[1].pnl-a[1].pnl);
    out[v]={v,br,w,l,p,n:w+l,u:+(br-LG_START).toFixed(2),roi:staked?(br-LG_START)/staked:0,dd,bust,best:ms[0]?ms[0][0]:null,worst:ms.length>1?ms[ms.length-1][0]:null};});
  return out;}
function lgLabel(ws){const f=d=>new Date(d+'T12:00:00').toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});return`${f(ws)} → ${f(dayShift(ws,7))}`;}
function leagueHtml(compact){let L;try{L=bkLedger(true);}catch(e){return'';}const W=L.weeks[0];const rows=Object.values(W.R).filter(x=>x.n||!compact).sort((a,b)=>b.br-a.br||b.n-a.n);
  const medal=i=>['🥇','🥈','🥉'][i]||`<span class="mono" style="color:var(--mute)">${i+1}</span>`;
  const body=rows.length?rows.map((x,i)=>{const C=CHARS[x.v]||{};const col=x.u>0?'var(--win)':x.u<0?'var(--rust)':'var(--chalk)';
    return`<div class="lg-row"><div class="lg-rank">${medal(i)}</div><div class="lg-who"><b style="color:${C.color}">${txtEsc(charName(x.v).replace(/^The /,''))}</b><div class="mono lg-sub">${x.w}-${x.l}${x.p?'-'+x.p:''}${x.best?' · best: '+txtEsc(x.best):''}${x.bust?' · <span style="color:var(--rust)">busted</span>':''}</div></div>
      <div class="lg-roll"><b style="color:${col}">${deskMoney(x.br)}</b><div class="mono lg-sub" style="color:${col}">${x.u>=0?'+':''}${x.u.toFixed(2)}u</div></div></div>`;}).join('')
    :'<div class="sub" style="font-size:11px">No official calls graded yet this week — the race starts with the first one.</div>';
  const hist=L.weeks.slice(1).filter(x=>x.leader).slice(0,4).map(x=>`<span class="mono" style="font-size:10px;margin-right:10px">${new Date(x.ws+'T12:00:00').toLocaleDateString([],{month:'short',day:'numeric'})}: <b style="color:${(CHARS[x.leader.v]||{}).color}">${txtEsc(charName(x.leader.v).replace(/^The /,''))}</b> ${deskMoney(x.leader.br)}</span>`).join('');
  return`<div class="tkt lg-card"><div class="lg-head"><h3>🏁 Character League</h3><span class="mono" style="font-size:10px;color:var(--mute)">${lgLabel(W.ws)}</span></div>
    <div class="sub" style="font-size:10.5px">$100 each, Tuesday to Tuesday. Official calls only (70%+). Every bet must pay at least $1. Most units wins the week.</div>${body}
    ${hist?`<div style="margin-top:6px"><span class="sub" style="font-size:10px">Past winners: </span>${hist}</div>`:''}</div>`;}

/* ── 8 · CHALLENGES — rebuilt: one goal, one pot, one move a day ──────────────
   A challenge earmarks part of your bankroll (the pot) and gives it a goal and a
   deadline. Each day it shows exactly what to play from the frozen card and how
   much — tap Lock it and the ticket lands on My Tickets with the stake. When the
   ticket settles, the pot moves. One copy of each challenge at a time. */
const CH2_KEY='d4.challenges';
const CH2_PRESETS=[
  {id:'climb',ico:'🪜',name:'Steady Climb',start:20,goal:40,days:14,src:'best3',frac:0.10,desc:'The Best 3 as singles. 10% of the pot on each.'},
  {id:'table',ico:'🏦',name:"The Banker's Table",start:25,goal:75,days:21,src:'banker',frac:0.08,desc:"The Banker's own parlay, every day. 8% of the pot."},
  {id:'leader',ico:'🔥',name:'Ride the Leader',start:20,goal:50,days:14,src:'leader',frac:0.08,desc:"The league leader's ticket, every day. 8% of the pot."},
  {id:'grind',ico:'✅',name:'Official Grind',start:30,goal:60,days:21,src:'official',frac:0.05,desc:'Every official single in the Top 10. 5% of the pot on each.'}];
const CH2_SRC={best3:'the Best 3 (singles)',banker:"the Banker's parlay",leader:"the league leader's ticket",official:'the official Top 10 (singles)'};
function ch2All(){return get(CH2_KEY,[])||[];}
function ch2Save(A){set(CH2_KEY,A);}
function ch2Start(id,custom){const T=CH2_PRESETS.find(x=>x.id===id);if(!T)return;const A=ch2All();
  if(A.some(c=>c.status==='active'&&c.preset===id)){deskToast(`${T.ico} ${T.name} is already running — one at a time.`,3000);return;}
  const o=custom||{};const start=+(o.start||T.start),goal=+(o.goal||T.goal),days=+(o.days||T.days);
  if(!(start>0&&goal>start&&days>0))return;const avail=bankBalance()-ch2Earmarked();
  if(start>avail+0.001&&!confirm(`Your bankroll has ${deskMoney(Math.max(0,avail))} free (not already in a challenge). Start with a ${deskMoney(start)} pot anyway?`))return;
  A.push({id:Date.now(),preset:id,ico:T.ico,name:T.name,start,goal,days,startDate:today(),src:T.src,frac:T.frac,pot:start,steps:[],status:'active'});ch2Save(A);deskRerender();}
function ch2Earmarked(){return ch2All().filter(c=>c.status==='active').reduce((a,c)=>a+Math.max(0,c.pot),0);}
function ch2Stop(id){const A=ch2All();const c=A.find(x=>x.id===id);if(!c)return;if(!confirm(`End "${c.name}"? The pot (${deskMoney(c.pot)}) stays in your bankroll — it was always part of it.`))return;
  c.status='ended';c.endDate=today();ch2Save(A);deskRerender();}
/* today's plays for a challenge, straight from the frozen card */
function ch2Plays(c){const out=[];const P=deskPlan();const pot=Math.max(0,c.pot);const single=x=>({label:x.pick,legs:[{sp:x.sp,game:x.game,pick:x.pick,price:+x.price,gd:String(x.start||'').slice(0,10)||today()}],dec:americanToDecimal(+x.price),p:x.p});
  try{if(c.src==='best3')(best5State().top3||[]).forEach(x=>out.push(single(x)));
    else if(c.src==='official'){(best5State().top3||[]).forEach(x=>out.push(single(x)));subTop10().forEach(x=>out.push(single(x)));}
    else if(c.src==='banker'&&P.own)out.push({label:"The Banker's parlay",legs:P.own.legs,dec:P.own.dec,p:P.own.p});
    else if(c.src==='leader'){const L=bkLedger();const R=Object.values(L.weeks[0].R).filter(x=>x.n).sort((a,b)=>b.br-a.br);const lead=R.find(x=>(P.chars||{})[x.v]);
      if(lead){const T=P.chars[lead.v];out.push({label:`${charName(lead.v)}'s ticket (league leader)`,legs:T.legs,dec:T.dec,p:T.p});}}}catch(e){}
  const done=new Set(c.steps.filter(s=>s.d===today()).map(s=>s.sig));
  return out.filter(o=>o.legs&&o.legs.length&&o.legs.every(l=>!deskStarted(l))).map(o=>{const sig=o.legs.map(l=>l.sp+':'+l.game+':'+l.pick).join('¦');
    const st=Math.max(deskMinStake(o.dec),Math.round(pot*c.frac*100)/100);return{...o,sig,stake:st>pot?0:+st.toFixed(2),taken:done.has(sig)};});}
function ch2Lock(id,i){const A=ch2All();const c=A.find(x=>x.id===id);if(!c||c.status!=='active')return;const o=ch2Plays(c)[i];if(!o||o.taken||!o.stake)return;
  if(o.stake>bankBalance()+0.001){alert(`Not enough in the bankroll for ${deskMoney(o.stake)}.`);return;}
  const L=get(LS.locked,[])||[];const tid=Date.now();const d0=today();
  L.unshift({id:tid,date:d0,name:`${c.ico} ${c.name}`,source:'mine',challenge:c.id,stake:String(o.stake),toWin:String(+(o.stake*(o.dec-1)).toFixed(2)),
    legs:o.legs.map(l=>({id:'ch'+tid+'|'+l.game+'|'+l.pick,game:l.game,pick:l.pick,price:l.price!=null?+l.price:null,sport:l.sp,gameDate:String(l.gd||d0).slice(0,10),date:String(l.gd||d0).slice(0,10),p:l.p||0.5})),p:o.p});
  set(LS.locked,L);saveWager(tid,o.stake);c.steps.push({tid,d:d0,sig:o.sig,stake:o.stake,label:o.label});ch2Save(A);
  deskToast(`🔒 Locked — ${deskMoney(o.stake)} on ${o.label}. It's on My Tickets.`,3200);deskRerender();}
/* settle: a ticket that settled moves the pot by exactly what the bankroll booked */
function ch2Sync(){const A=ch2All();if(!A.length)return A;const L=roGet(LS.locked,[],5e3)||[];const H={};try{(getBankroll().history||[]).forEach(h=>{H[String(h.id)]=h;});}catch(e){}let ch=false;
  A.forEach(c=>{if(c.status!=='active')return;c.steps.forEach(s=>{if(s.done)return;const h=H[String(s.tid)];const t=L.find(x=>String(x.id)===String(s.tid));
      if(h){s.done=true;s.profit=+h.profit||0;s.won=h.won;c.pot=+(c.pot+s.profit).toFixed(2);ch=true;return;}
      if(!t){s.done=true;s.void=true;s.profit=0;ch=true;}});
    const open=c.steps.some(s=>!s.done);const end=dayShift(c.startDate,c.days);
    if(c.pot>=c.goal){c.status='won';c.endDate=today();ch=true;}
    else if(!open&&c.pot<1){c.status='busted';c.endDate=today();ch=true;}
    else if(!open&&today()>=end){c.status='expired';c.endDate=today();ch=true;}});
  if(ch)ch2Save(A);return A;}
function ch2Card(c){const pct=Math.max(0,Math.min(100,(c.pot-0)/(c.goal)*100));const left=Math.max(0,c.days-Math.floor((Date.parse(today())-Date.parse(c.startDate))/864e5));
  const col=c.status==='won'?'var(--gold)':c.status==='active'?(c.pot>=c.start?'var(--win)':'var(--rust)'):'var(--mute)';
  const plays=c.status==='active'?ch2Plays(c):[];const open=c.steps.filter(s=>!s.done);
  const playHtml=c.status!=='active'?'':plays.length?plays.map((o,i)=>`<div class="ch-play"><div style="min-width:0;flex:1"><b>${txtEsc(o.label)}</b> <span class="mono" style="color:var(--gold);font-size:11px">${decimalToAmerican(o.dec)}</span>
        <div class="mono" style="font-size:9.5px;color:var(--mute)">${o.legs.length>1?o.legs.map(l=>txtEsc(l.pick)).join(' · ')+' · ':''}${Math.round((o.p||0)*100)}% · stake ${deskMoney(o.stake)} → wins ${deskMoney(o.stake*(o.dec-1))}</div></div>
        ${o.taken?'<span class="mono" style="color:var(--win);font-size:10px">✓ locked</span>':o.stake?`<button class="primary" onclick="ch2Lock(${c.id},${i})">Lock it</button>`:'<span class="mono" style="font-size:10px;color:var(--mute)">pot too small</span>'}</div>`).join('')
      :`<div class="sub" style="font-size:10.5px">${deskFrozen()?'Nothing from '+CH2_SRC[c.src]+' today — no play is a play.':'Today\'s move shows up after the master evaluation.'}</div>`;
  return`<div class="tkt ch-card" style="border-left:3px solid ${col}"><div class="ch-top"><b>${c.ico} ${txtEsc(c.name)}</b><span class="mono" style="font-size:10px;color:${col}">${c.status==='active'?left+' day'+(left===1?'':'s')+' left':c.status.toUpperCase()}</span></div>
    <div class="ch-nums"><span><b style="color:${col}">${deskMoney(c.pot)}</b> pot</span><span>goal <b>${deskMoney(c.goal)}</b></span><span class="mono" style="font-size:10px;color:var(--mute)">from ${deskMoney(c.start)} · ${CH2_SRC[c.src]}</span></div>
    <div class="ch-bar"><div style="width:${pct}%;background:${col}"></div></div>
    ${c.status==='active'?`<div class="mktlab">Today's move</div>${playHtml}`:''}
    ${open.length?`<div class="mono" style="font-size:9.5px;color:var(--mute);margin-top:4px">${open.length} ticket${open.length===1?'':'s'} riding: ${open.map(s=>txtEsc(s.label)+' '+deskMoney(s.stake)).join(' · ')}</div>`:''}
    ${c.status==='active'?`<div class="bar" style="margin-top:6px"><button onclick="ch2Stop(${c.id})">End it</button></div>`:''}</div>`;}
function ch2Html(){const A=ch2Sync();const act=A.filter(c=>c.status==='active'),done=A.filter(c=>c.status!=='active').slice(-4).reverse();
  const free=CH2_PRESETS.filter(T=>!act.some(c=>c.preset===T.id));
  return`<div class="sbar"><h2>Challenges</h2><div class="ln"></div></div>
    ${act.length?act.map(ch2Card).join(''):'<div class="sub" style="font-size:11px;margin:0 3px 6px">No challenge running. Pick one — it earmarks a slice of your bankroll and tells you the move each day.</div>'}
    ${free.length?`<div class="ch-grid">${free.map(T=>`<button class="ch-preset" onclick="ch2Start('${T.id}')"><div class="ch-ico">${T.ico}</div><b>${txtEsc(T.name)}</b><div class="mono" style="font-size:10px;color:var(--gold)">${deskMoney(T.start)} → ${deskMoney(T.goal)} · ${T.days} days</div><div class="sub" style="font-size:10px">${txtEsc(T.desc)}</div></button>`).join('')}</div>`:''}
    ${done.length?`<details style="margin-top:6px"><summary class="mono" style="font-size:10.5px;color:var(--mute)">Finished (${done.length})</summary>${done.map(ch2Card).join('')}</details>`:''}`;}

/* ── 9 · THE BANKER'S DESK — his own parlay, the tickets he placed, the exposure ── */
function bkDayBuild(){const d=today();const P=deskPlan();const{B,cap}=bkBudget();
  const legOut=l=>({sp:l.sp,game:l.game,gd:l.gd||null,start:l.start||'',m:l.m,sd:l.sd,line:l.line,pick:l.pick,price:l.price,p:+(+l.p).toFixed(4),score:+(+(l.score!=null?l.score:l.p)).toFixed(4),v:l.v,by:l.by||[l.v]});
  let OWN=null;if(P.own){const L=P.own.legs;const sz=bkSize(L.map(x=>({p:x.p,dec:americanToDecimal(x.price)})),L.length,L.length);
    OWN={legs:L.map((l,i)=>legOut({...l,by:(P.own.by||[])[i]||[l.v]})),dec:P.own.dec,p:P.own.p,f:sz?sz.f:0,g:sz?sz.g:0,ev:sz?sz.ev:0,k:L.length,why:`${L.length} legs · ${Math.round(P.own.p*100)}% to cash · official picks 2+ characters made`};}
  const used=new Set((OWN?OWN.legs:[]).map(l=>l.sp+'|'+l.game));const slate=[];
  Object.values(P.chars||{}).map(T=>{const D0=T.dec,p=T.p,ev=p*D0-1,fk=ev>0?ev/(D0-1):0,f=Math.min(0.02,fk/4),g=f>0?p*Math.log(1+f*(D0-1))+(1-p)*Math.log(1-f):0;return{v:T.voice,legs:T.legs,dec:D0,p,f,g,ev};})
    .sort((a,b)=>b.g-a.g||b.ev-a.ev).forEach(o=>{if(slate.length>=3||o.g<=0)return;if(o.legs.some(l=>used.has(l.sp+'|'+l.game)))return;o.legs.forEach(l=>used.add(l.sp+'|'+l.game));
      slate.push({v:o.v,legs:o.legs.map(l=>legOut({...l,v:o.v})),dec:+o.dec.toFixed(4),p:+o.p.toFixed(4),f:o.f,g:o.g,ev:o.ev});});
  const tix=[...(OWN?[OWN]:[]),...slate];tix.forEach(t=>{t.stake=deskStake(t,B);});
  const tot=tix.reduce((a,t)=>a+t.stake,0);if(tot>cap&&tot>0){const sc=cap/tot;tix.forEach(t=>{if(!t.stake)return;const s=Math.round(t.stake*sc*100)/100;t.stake=s>=deskMinStake(t.dec)?s:0;});}
  tix.forEach(t=>{t.toWin=t.stake?+(t.stake*(t.dec-1)).toFixed(2):0;});
  return{d,own:OWN,slate,roll:null,B,cap,fromLimit:false,floor:BK_FLOOR,spent:+tix.reduce((a,t)=>a+t.stake,0).toFixed(2),ts:Date.now(),alloc:true};}
function deskExpoHtml(P){const W=Object.entries(P.where||{}).filter(([k,w])=>w.length>=2).sort((a,b)=>b[1].length-a[1].length);
  if(!W.length)return'<div class="sub" style="font-size:10.5px">No pick is on more than one ticket today.</div>';
  return W.slice(0,12).map(([k,w])=>{const[sp,game,m,sd]=k.split('|');const lab=k.startsWith('prop|')?k.split('|').slice(2).join(' '):`${(SP_LAB[sp]||'').split(' ')[0]} ${gameLabel(sp,game)} · ${({ml:'ML',spread:'spread',total:'total'})[m]||m} ${sd}`;
    return`<div class="mono expo-row"><span class="expo-n${w.length>=EXPO_CAP?' full':''}">${w.length}/${EXPO_CAP}</span> ${txtEsc(lab)} <span style="color:var(--mute)">— ${w.map(txtEsc).join(' · ')}</span></div>`;}).join('');}
function renderBankerTab(){const el=document.getElementById('bankerBody');if(!el)return;try{bkDayGrade();cparGrade();cpxGrade();}catch(e){}
  let S,P;try{S=bkDayState();P=deskPlan();}catch(e){el.innerHTML='<div class="tkt"><div class="sub">'+txtEsc(e.message)+'</div></div>';return;}
  const D=S.locked?S:S.preview;const R=bkDayRecord();const u=o=>`${o.w}-${o.l} · ${o.u>=0?'+':''}${o.u.toFixed(1)}u`;
  const head=`<div class="desk-hero ${S.locked?'locked':''}"><div><div class="desk-k">${S.locked?'🔒 Locked '+new Date(S.lockedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'Preview — locks at the master evaluation'}</div>
      <div class="desk-t">The Banker's desk</div><div class="sub" style="font-size:10.5px">Official picks only (70%+). No pick on more than ${EXPO_CAP} tickets — each lands where it fits best. Ticket length is his call: 2–4 legs.</div></div>
      <div class="desk-rec"><div class="mono">his parlays</div><b>${u(R.own)}</b></div></div>`;
  if(!D){el.innerHTML=head+'<div class="empty">Nothing yet — open today\'s boards so the characters make their calls.</div>';return;}
  BK_SHARE_T=D.own||null;
  const own=D.own?bkTicketHtml('🏦 The Banker\'s parlay',D.own,txtEsc(D.own.why)+(D.own.stake?` · stake <b style="color:var(--win)">${deskMoney(D.own.stake)}</b>`:''),D.d)+(()=>{try{return bkShareHtml(D.own,D.d);}catch(e){return'';}})()
    :`<div class="tkt"><h3>🏦 The Banker's parlay</h3><div class="sub">Needs 2+ games where at least two characters are officially (70%+) on the same side. ${S.locked?'Not today — sitting out is a position.':'Open more boards.'}</div></div>`;
  const CP=cparState();const vs=Object.keys(CP.by||{});
  const chars=vs.length?vs.map(v=>{const T=CP.by[v];const st=(D.slate||[]).find(t=>t.v===v);return bkTicketHtml(`${(CHARS[v]||{}).chip||''} ${txtEsc(charName(v))}`,{...T,legs:T.legs.map(l=>({...l,v}))},st&&st.stake?`🏦 on his slate · stake <b style="color:var(--win)">${deskMoney(st.stake)}</b>`:'',D.d);}).join('')
    :'<div class="sub" style="font-size:11px">No character has 2+ official legs left after the Banker placed the day.</div>';
  const sat=(P.sat||[]).length?`<div class="mono" style="font-size:9.5px;color:var(--mute);margin-top:4px">Sitting out: ${P.sat.map(o=>txtEsc(charName(o.v).replace(/^The /,''))+' ('+txtEsc(o.why)+')').join(' · ')}</div>`:'';
  const budget=`<div class="tkt"><div class="desk-stats"><div><b>${deskMoney(D.B)}</b><span>bankroll</span></div><div><b>${deskMoney(D.cap)}</b><span>10% day cap</span></div><div><b style="color:var(--gold)">${deskMoney(D.spent)}</b><span>on the desk</span></div>
    <div><b style="color:${R.money>=0?'var(--win)':'var(--rust)'}">${R.money>=0?'+':'-'}${deskMoney(Math.abs(R.money)).slice(1)}</b><span>desk P/L</span></div></div>
    <div class="mono" style="font-size:9.5px;color:var(--mute);text-align:center;margin-top:6px">His own ${u(R.own)} · his slate ${u(R.slate)} · stakes are ¼-Kelly, capped 2% a ticket, and every bet wins at least $1</div></div>`;
  el.innerHTML=head+budget+own+`<div class="sbar"><h2>Character tickets · placed by the Banker</h2><div class="ln"></div></div>${chars}${sat}
    <details class="tkt" style="margin-top:8px"><summary><b>🧭 Exposure — where each pick landed</b> <span class="mono" style="font-size:10px;color:var(--mute)">max ${EXPO_CAP} per pick</span></summary>${deskExpoHtml(P)}</details>
    ${(()=>{try{return leagueHtml(true);}catch(e){return'';}})()}`;}

/* ── 10 · BANKROLL (the old Money tab, rebuilt) ─────────────────────────────── */
function bankrollSetHtml(){return'';}
function riskHtml(){return'';}
function missionsHtml(){return'';}
function msFitChip(){return'';}
function bankPrompt(kind){const S=bankState();
  if(kind==='set'){const v=prompt('What is your bankroll right now? (what your book shows, $)',S.avail.toFixed(2));if(v==null)return;if(!bankSetBalance(v))alert('That doesn\'t look like an amount.');}
  else{const v=prompt(kind==='add'?'How much are you adding? ($)':'How much are you taking out? ($)','');if(v==null)return;const a=parseFloat(String(v).replace(/[$,]/g,''));if(!(a>0)){alert('That doesn\'t look like an amount.');return;}bankMove(kind==='add'?a:-a);}
  deskRerender();}
function renderMoneyTab(){const S=bankState();const col=S.avail>=S.start+S.adj?'var(--win)':'var(--rust)';const B=S.cfg;
  let h=`<div class="bank-hero"><div class="bank-k">Your bankroll</div><div class="bank-v" style="color:${col}">${deskMoney(S.avail)}</div>
    <div class="bank-s">${S.open?`${deskMoney(S.open)} in play on ${S.openN} ticket${S.openN===1?'':'s'} · `:''}this week ${S.week>=0?'+':'-'}${deskMoney(Math.abs(S.week)).slice(1)}${S.ear?` · ${deskMoney(S.ear)} earmarked for challenges`:''}</div>
    <div class="bar" style="justify-content:center;margin-top:10px"><button onclick="bankPrompt('set')">Set balance</button><button onclick="bankPrompt('add')">＋ Add</button><button onclick="bankPrompt('out')">－ Take out</button></div></div>`;
  if(B.fresh&&B.migr)h+=`<div class="note" style="border-left:3px solid var(--gold);padding-left:10px"><b style="color:var(--gold)">One bankroll now.</b> It starts at ${deskMoney(B.migr.money)} — your old Money balance. ${B.migr.banker?`The Banker used to size stakes off a separate ${deskMoney(B.migr.banker)}, and the old challenges kept their own pots; `:''}every screen now reads this one number. If your book says something else, tap <b>Set balance</b>. The $5-a-day and $1-a-ticket limits are gone.</div>`;
  /* today's plan from the Banker */
  let D=null;try{const st=bkDayState();D=st.locked?st:st.preview;}catch(e){}
  const best=(()=>{try{return best5State().top3||[];}catch(e){return[];}})();
  const bRow=x=>{const dec=americanToDecimal(+x.price);const t={p:x.p,dec};const s=deskStake(t,Math.max(0,S.avail));return`<div class="plan-row"><div><b>${txtEsc(x.pick)}</b> <span class="mono" style="color:var(--gold);font-size:11px">${sgnP(x.price)}</span><div class="mono" style="font-size:9.5px;color:var(--mute)">${(SP_LAB[x.sp]||'').split(' ')[0]} ${txtEsc(gameLabel(x.sp,x.game))} · ${Math.round(x.p*100)}% sure</div></div><div class="plan-st">${s?deskMoney(s):'—'}</div></div>`;};
  h+=`<div class="sbar"><h2>Today's plan · from the Banker</h2><div class="ln"></div></div><div class="tkt">
    ${deskFrozen()?'':'<div class="sub" style="font-size:10.5px;margin-bottom:4px">Preview — it locks at the master evaluation.</div>'}
    ${best.length?`<div class="mktlab">⭐ Best 3 — singles</div>${best.map(bRow).join('')}`:'<div class="sub" style="font-size:10.5px">No Best 3 today.</div>'}
    ${D&&D.own?`<div class="mktlab">🏦 The Banker's parlay · ${decimalToAmerican(D.own.dec)} · ${Math.round(D.own.p*100)}% to cash</div><div class="plan-row"><div class="mono" style="font-size:10.5px">${D.own.legs.map(l=>txtEsc(l.pick)).join(' · ')}</div><div class="plan-st">${D.own.stake?deskMoney(D.own.stake):'—'}</div></div>`:''}
    <div class="mono" style="font-size:9.5px;color:var(--mute);margin-top:6px">Stakes: ¼-Kelly of ${deskMoney(S.avail)}, max 2% a play, every bet wins at least $1. Nothing forced — if it isn't official, it isn't here.</div></div>`;
  h+=leagueHtml(false);
  h+=ch2Html();
  /* the risk check replays your history 2,000 times — it runs when you open it (or reuses the last run) */
  h+=`<details class="tkt" style="margin-top:8px" ontoggle="if(this.open){const b=this.querySelector('.rr');if(b&&!b.__done){b.__done=1;b.innerHTML=deskRiskHtml(true);}}"><summary><b>🛡 Risk check</b> <span class="mono" style="font-size:10px;color:var(--mute)">risk of ruin, from your own tickets</span></summary><div class="rr">${(typeof ROR_C!=='undefined'&&ROR_C)?deskRiskHtml(true):'<div class="sub mono" style="font-size:10px">Running…</div>'}</div></details>`;
  /* history */
  const H=S.hist.slice().sort((a,b)=>b.ts-a.ts).slice(0,25);const adj=(B.adj||[]).slice().reverse().slice(0,10);
  h+=`<details class="tkt" style="margin-top:10px"><summary><b>History</b> <span class="mono" style="font-size:10px;color:var(--mute)">${S.w}-${S.l}${S.pu?'-'+S.pu:''} since ${fmtDate(new Date(B.sinceD+'T12:00:00'))} · ${S.settled>=0?'+':'-'}${deskMoney(Math.abs(S.settled)).slice(1)}</span></summary>
    ${H.length?H.map(r=>{const c=r.won==='push'?'var(--mute)':r.won?'var(--win)':'var(--rust)';return`<div class="mono hist-row"><span>${txtEsc(r.date)} · ${r.won==='push'?'push':r.won?'won':'lost'} · ${deskMoney(r.stake)} staked</span><b style="color:${c}">${r.profit>=0?'+':'-'}${deskMoney(Math.abs(r.profit)).slice(1)}</b></div>`;}).join(''):'<div class="sub" style="font-size:10.5px">No settled tickets since the bankroll started.</div>'}
    ${adj.length?`<div class="mktlab">Adjustments</div>${adj.map(a=>`<div class="mono hist-row"><span>${txtEsc(a.d)} · ${txtEsc(a.note||'')}</span><b>${a.amt>=0?'+':'-'}${deskMoney(Math.abs(a.amt)).slice(1)}</b></div>`).join('')}`:''}
    <div class="mono" style="font-size:9.5px;color:var(--mute);margin-top:4px">Started at ${deskMoney(S.start)} on ${fmtDate(new Date(B.sinceD+'T12:00:00'))}.</div></details>`;
  return h;}

function deskRiskHtml(){try{const X=riskOfRuin();if(X.need)return`<div class="sub" style="font-size:11px;color:var(--mute)">${txtEsc(X.need)}.</div>`;const c=X.ruin>0.25?'var(--rust)':X.ruin>0.08?'var(--gold)':'var(--win)';
  return`<div class="sub" style="font-size:11px">At your typical stake (${(X.f*100).toFixed(1)}% of bankroll) and your real results (${X.roi>=0?'+':''}${(X.roi*100).toFixed(0)}% per ticket over ${X.n} — ${X.wl.w}-${X.wl.l}${X.wl.p?'-'+X.wl.p:''}): chance of losing 90% within 300 tickets <b style="color:${c}">${(X.ruin*100).toFixed(1)}%</b> · of halving it at some point <b>${(X.half*100).toFixed(0)}%</b>.</div>
    <div class="sub mono" style="font-size:9.5px;color:var(--mute)">Risk of ruin — replays your own ticket history 2,000 times. Under 5% is comfortable; above 25% means the stakes are too big for the edge.</div>`;}catch(e){return'';}}
/* ── 11 · THE VIP CARD — built from the Banker's placed tickets ────────────────
   Best 3 → the rest of the Top 10 → the Banker's parlay → each character's placed
   ticket (2–4 legs, never the old 5-leg dumps) → the props of the day. */
function subCharParlay(v){const P=deskPlan();const T=(P.chars||{})[v];if(!T)return null;return{v,legs:T.legs.map(l=>({sp:l.sp,game:l.game,pick:l.pick,price:l.price,p:l.p,spec:''})),dec:T.dec,p:T.p};}
function subCard(){let best=null;try{best=best5State();}catch(e){}const R=(()=>{try{return best3Record();}catch(e){return null;}})();const P=deskPlan();
  const chars=Object.keys(P.chars||{}).filter(v=>!(P.chars[v]||{}).skill).map(v=>subCharParlay(v)).filter(Boolean).sort((a,b)=>b.p-a.p);   /* v2.43 · skill tickets stay off the 70%+ VIP card */
  const props=(P.props||[]).map(c=>({...c,cal:c.cal}));
  return{d:today(),best:(best&&best.top3)||[],locked:!!(best&&best.locked),record:R,top10:subTop10(),banker:subBanker(),chars,props,alloc:true};}
function subTelegramText(C,mk){mk=mk||(()=>'');const pm=P=>{if(mk.tpl)return`⟦p:${(P.legs||[]).map(tgLegKey).join('¦')}⟧`;try{return tgParlayMark(P.legs,mk);}catch(err){return'';}};
  const mb=l=>mk.tpl?`⟦b:${tgLegKey(l)}⟧`:(mk(l)||'• ');const e=txtEsc,day=new Date(C.d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const sp=x=>e((SP_LAB[x.sp]||'').split(' ')[0]);const pc=x=>subPct(x.p!=null?x.p:best5Prob(x));
  const head=`<b>🏆 TheDesk — ${e(day)}</b>${C.record&&(C.record.w+C.record.l)?`\nBest 3 record: <b>${C.record.w}-${C.record.l}${C.record.pu?'-'+C.record.pu:''}</b> (${C.record.u>=0?'+':''}${C.record.u.toFixed(1)}u)`:''}\n<i>Every pick below is official: a character is 70%+ sure, and no pick rides more than ${EXPO_CAP} tickets.</i>`;
  const blocks=[head];
  if(C.best.length)blocks.push(`<b>⭐ TODAY'S BEST ${C.best.length}</b>${C.locked?' 🔒':''}\n`+C.best.map((x,i)=>`${i+1}. ${mk(x)}<b>${e(x.pick)}</b> ${e(tcSgn(x.price))} · ${sp(x)} ${e(gameLabel(x.sp,x.game))} · ${pc(x)}`).join('\n'));
  if(C.top10.length)blocks.push(`<b>🔟 THE REST OF THE TOP 10</b>\n`+C.top10.map((x,i)=>`${i+1+C.best.length}. ${mk(x)}<b>${e(x.pick)}</b> ${e(tcSgn(x.price))} · ${sp(x)} ${e(gameLabel(x.sp,x.game))} · ${subPct(x.p)}`).join('\n'));
  if(C.banker)blocks.push(`${pm(C.banker)}<b>🏦 THE BANKER'S PARLAY</b> ${e(decimalToAmerican(C.banker.dec))} · ${subPct(C.banker.p)} to cash\n`+C.banker.legs.map(l=>mb(l)+e(subLeg(l))).join('\n'));
  C.chars.forEach(P=>blocks.push(`${pm(P)}<b>🎭 ${e(charName(P.v))} — ${P.legs.length}-leg</b> ${e(decimalToAmerican(P.dec))} · ${subPct(P.p)} to cash\n`+P.legs.map(l=>mb(l)+e(subLeg(l))).join('\n')));
  if((C.props||[]).length)blocks.push(`<b>🎯 PROPS OF THE DAY</b>\n`+C.props.map(c=>`${mb(c)}${e(charName(c.v))}: <b>${e(cpropLine(c))}</b> · ${subPct(c.cal)}${c.fav==='fav'?' ⭐ '+e(c.rec||''):''}`).join('\n'));
  blocks.push('<i>For entertainment. 21+. Bet responsibly — 1-800-GAMBLER.</i>');
  const out=[];let cur='';blocks.forEach(b=>{if((cur+'\n\n'+b).length>3800){if(cur)out.push(cur);cur=b;}else cur=cur?cur+'\n\n'+b:b;});if(cur)out.push(cur);return out;}

/* ── 12 · THE DAILY PROCESS — grade → intake → MASTER EVALUATION (freeze) → publish ──
   One tap runs every sport's evaluation (each sport's page loads in a hidden frame,
   absorbs, re-sims and locks its calls), then freezes the whole day at once: the
   Best 3, the Banker's placement, every character ticket, the Today card's
   official flags. Nothing frozen is ever rebuilt. Then it publishes: the public
   page, the VIP card, the public channel's "card is locked" note.
   The slate day turns over at 5 AM Central, so a game that ends after midnight
   still belongs to the day it started. */
const FREEZE_KEY='d4.freeze';let DESK_EVAL_BUSY=false;
const DESK_BG_EVAL=typeof location!=='undefined'&&/[?&]bg=1/.test(location.search||'')&&/[?&]eval=1/.test(location.search||'');
function deskFrozen(d){const F=roGet(FREEZE_KEY,null,3e3);return!!(F&&F.d===(d||today()));}
function evalRanToday(){if(deskFrozen())return true;if(DESK_EVAL_BUSY||DESK_BG_EVAL)return false;const d=today();const E=roGet(LS_EVAL,{},10e3)||{};if(E.date===d)return true;
  const L=roGet(EVAL_LOCK_KEY,{},10e3)||{};return L.date===d&&Object.keys(L.by||{}).length>0;}
/* one sport's evaluation, without touching the screen */
function deskRunSportEval(sp){
  if(sp==='mlb'){if(typeof masterEvaluation!=='function'||typeof GAMES==='undefined'||!GAMES.length)return false;try{evalPrep('mlb');}catch(e){}const evals=masterEvaluation();const d=today();
    set(LS_EVAL,{date:d,ts:Date.now(),fingerprint:evalInputFingerprint(),evals,sourceCount:(getExt()[d]||[]).length+(get(LS.exttrends,{})[d]||[]).length+(get(LS.extconsensus,{})[d]||[]).length+(get(LS.bookshots,{})[d]||[]).length});
    evalLockMark('mlb');return true;}
  if(sp==='nfl'||sp==='ncaaf'){if(typeof runFootballEval!=='function')return false;runFootballEval(sp);return true;}
  if(sp==='nhl'){if(typeof runNHLMasterEval!=='function')return false;runNHLMasterEval();return true;}
  if(sp==='nba'||sp==='ncaab'){if(typeof runBasketballEval!=='function')return false;runBasketballEval(sp);return true;}
  return false;}
/* the hidden frame: once its board is ready, evaluate and say so */
if(DESK_BG_EVAL&&typeof window!=='undefined')window.addEventListener('load',()=>{const sp=window.__PAGE_SPORT__||ACTIVE_SPORT;const t0=Date.now();
  const iv=setInterval(()=>{let ready=false;try{const T=get(TC_KEY,{})||{};const B=T.d===today()&&T.by&&T.by[sp];ready=!!(B&&B.ts>=t0-1000)||(sportGames(sp)||[]).length===0&&Date.now()-t0>8000;}catch(e){}
    if(!ready&&Date.now()-t0<40000)return;clearInterval(iv);let ok=false,err='';try{ok=deskRunSportEval(sp);}catch(e){err=String(e&&e.message||e);}
    set('d4.bgeval.'+sp,{ts:Date.now(),ok,err,d:today()});},700);});
function deskSay(h){try{document.querySelectorAll('.deskStatus').forEach(e=>e.innerHTML=h);}catch(e){}}
async function masterEvalAll(){if(DESK_EVAL_BUSY)return;if(deskFrozen()&&!confirm('Today is already frozen. Run the evaluations again? (Nothing frozen will change — only the eval reports refresh.)'))return;
  DESK_EVAL_BUSY=true;const t0=Date.now();const here=window.__PAGE_SPORT__||ACTIVE_SPORT;const done=[],miss=[];
  try{deskSay('① Grading yesterday and calibrating…');await new Promise(r=>setTimeout(r,30));
    try{apRun(true,'master evaluation');}catch(e){}try{confRebuild(true);}catch(e){}
    deskSay(`② Evaluating ${SP_LAB[here]||here}…`);await new Promise(r=>setTimeout(r,30));try{todaySnapshot();}catch(e){}
    try{if(deskRunSportEval(here))done.push(here);}catch(e){console.warn('eval',here,e);miss.push(here);}
    const others=liveSports().filter(sp=>sp!==here&&SPORT_PAGE[sp]);
    for(const sp of others){deskSay(`② Evaluating ${SP_LAB[sp]||sp} in the background… (${done.length+1} of ${others.length+1})`);
      const ts=Date.now();const f=document.createElement('iframe');f.src=SPORT_PAGE[sp]+'?bg=1&eval=1&v='+Date.now();f.setAttribute('aria-hidden','true');f.style.cssText='position:absolute;width:1px;height:1px;left:-9999px;border:0;opacity:0';
      document.body.appendChild(f);const got=await new Promise(res=>{const iv=setInterval(()=>{const R=get('d4.bgeval.'+sp,null);if(R&&R.ts>=ts){clearInterval(iv);res(R);}else if(Date.now()-ts>60000){clearInterval(iv);res(null);}},600);});
      try{f.remove();}catch(e){}if(got&&got.ok)done.push(sp);else miss.push(sp);}
    deskSay('③ Freezing the day…');await new Promise(r=>setTimeout(r,30));DESK_EVAL_BUSY=false;
    const F=await deskFreezeAll('master evaluation · '+done.map(s=>(SP_LAB[s]||s).split(' ').pop()).join(', '));
    /* v2.44 · the Book can hold the freeze (a sport missing from the card, broken inputs) — say so instead of "Frozen" */
    if(!deskFrozen()){let H=null;try{H=typeof bookHold==='function'?bookHold():null;}catch(e){}deskSay(`<span style="color:var(--gold)">⏳ Not frozen yet — the Book is holding it: ${txtEsc((H&&H.why)||'see Records → 📖 The Book')}</span>`);}
    else deskSay(`<span style="color:var(--win)">✓ Frozen ${deskT(F&&F.ts)} — ${done.length} sport${done.length===1?'':'s'} evaluated${miss.length?` · couldn't load ${miss.map(s=>SP_LAB[s]||s).join(', ')} (no games or no lines yet)`:''}. Publishing…</span>`);
  }finally{DESK_EVAL_BUSY=false;}
  try{renderToday(true);}catch(e){}deskRerender();return{done,miss,ms:Date.now()-t0};}
const deskT=ts=>ts?new Date(ts).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';
async function deskFreezeAll(why){const d=today();if(deskFrozen(d))return get(FREEZE_KEY,null);
  try{confBackfill(d);}catch(e){console.warn('conf backfill',e);}PCI_C=null;
  set(FREEZE_KEY,{d,ts:Date.now(),why:why||'master evaluation'});
  try{const S=best5State();if(!S.locked){S.locked=true;S.lockedAt=Date.now();S.why=(S.top3||[]).length?'master evaluation ran':'master evaluation — nothing cleared the 70% rule';set(BEST5_KEY,S);}}catch(e){console.warn('freeze best',e);}
  try{DESK_MEM=null;deskPlan();}catch(e){console.warn('freeze plan',e);}
  try{cparState();}catch(e){}try{cpxState();}catch(e){}try{bkDayState();}catch(e){}try{tcFreeze();}catch(e){}
  setTimeout(()=>{deskPublishAll('freeze').catch(e=>console.warn('publish',e));},300);
  return get(FREEZE_KEY,null);}
/* any single sport's evaluation still freezes the day (the old buttons keep working) */
function evalLockMark(sp){try{evalFreeze(sp);}catch(e){console.warn('eval freeze',e);}const L=get(EVAL_LOCK_KEY,{})||{};if(L.date!==today())Object.assign(L,{date:today(),by:{}});L.by=L.by||{};L.by[sp]=Date.now();set(EVAL_LOCK_KEY,L);
  if(!DESK_EVAL_BUSY&&!DESK_BG_EVAL&&!(typeof BG_MODE!=='undefined'&&BG_MODE))setTimeout(()=>{deskFreezeAll('master evaluation · '+((SP_LAB[sp]||sp).split(' ').pop())).catch(()=>{});},300);}
/* the process bar at the top of Today: where the day stands */
function deskProcessHtml(){const d=today();let graded=0,cal=null;try{const A=get(AP_KEY,[])||[];cal=A[0]&&A[0].ts;}catch(e){}
  let intake=0;try{intake=(getExt()[d]||[]).length+(get(LS.exttrends,{})[d]||[]).length+(get(LS.extconsensus,{})[d]||[]).length;}catch(e){}
  let odds=0;try{const T=get(TC_KEY,{})||{};odds=T.d===d?Object.values(T.by||{}).reduce((a,B)=>a+(B.picks||[]).filter(x=>x.price!=null).length,0):0;}catch(e){}
  const F=get(FREEZE_KEY,null);const fz=F&&F.d===d;let pub=null;try{pub=get('d4.pubstate',null);}catch(e){}const posted=get('d4.tgposted',null);
  const step=(n,ok,t,s)=>`<div class="ps-step ${ok?'ok':''}"><div class="ps-n">${ok?'✓':n}</div><div><b>${t}</b><div class="mono">${s}</div></div></div>`;
  let night='';try{night=typeof slateBannerHtml==='function'?slateBannerHtml():'';}catch(e){}
  return`${night}<div class="tkt ps-card"><div class="ps-row">
    ${step(1,cal&&Date.now()-cal<18*36e5,'Grade & calibrate',cal?'last '+deskT(cal):'runs when the app opens')}
    ${step(2,intake>0||odds>0,'Intake',`${odds} priced pick${odds===1?'':'s'}${intake?' · '+intake+' outside reads':''}`)}
    ${step(3,fz,'Master evaluation',fz?'🔒 frozen '+deskT(F.ts):'not yet — freezes everything')}
    ${step(4,fz&&pub&&pub.d===d&&pub.ok,'Published',fz?((pub&&pub.d===d&&pub.ok?'page ✓':'page …')+' · '+(posted&&posted.d===d?'VIP ✓':'VIP …')):'after the freeze')}</div>
    <div class="bar" style="margin-top:8px">${fz?`<button onclick="deskPublishAll('manual').then(r=>deskToast(r&&r.msg||'Published',2600))">↻ Publish again</button>`:`<button class="primary" onclick="masterEvalAll()">🔒 Run the master evaluation — all sports</button>`}<button onclick="bcComposer()">📣 Post a slate update</button><button onclick="shareHub()">📤 Share — X · Facebook · links</button></div>
    <div class="deskStatus sub mono" style="font-size:10px;margin-top:4px"></div></div>`;}

/* ── 13 · THE PUBLIC PAGE — premium, honest, and live ──────────────────────────
   Today's Best 3, the Best 3 props and the Banker's parlay stay locked on the
   public page until 30 minutes before each game, then open by themselves. Results
   land as each game grades (this app, the 24/7 worker and the page itself all
   grade them). Slate updates you post show up in their own feed. */
const PUB_UNLOCK_MS=30*60e3,PUBUPD_KEY='d4.pubupdates';
const pubOpenAt=x=>{const t=Date.parse(x&&x.start||'');return isFinite(t)?t-PUB_UNLOCK_MS:null;};
const pubIsOpen=(x,now)=>{const t=pubOpenAt(x);return t!=null&&(now||Date.now())>=t;};
function deskPropResult(x,d){try{if(x.hit!=null||x.push)return x;const g=(get('d4.pstlast.'+x.sp,{})||{})[pstId(x.player)];const k=(x.keys||[x.k])[0];
  if(g&&g.d>=d&&g.d<=dayShift(d,1)&&g.v&&g.v[k]!=null){const a=+g.v[k];return{...x,actual:a,hit:x.side==='under'?a<+x.thr:a>+x.thr};}}catch(e){}return x;}
function publicFeedCore(full){const S=best5State();try{best5Grade();}catch(e){}const log=get('d4.best5log',{})||{};const R=best3Record();const now=Date.now();
  const slim=x=>({sp:x.sp,game:x.game,gl:gameLabel(x.sp,x.game),pick:x.pick,price:x.price,p:+(+x.p).toFixed(3),ev:x.ev!=null?+(+x.ev).toFixed(1):null,start:x.start||'',
    tier:x.unan?'UNANIMOUS':((TC_COL[x.color]||[])[1]||''),voices:(x.confBy||x.chars||[]).map(charName),hit:x.hit==null?null:x.hit,push:!!x.push,
    why:(()=>{if(!x.whyOn)return undefined;try{const W=pickWhy({...x,date:x.d0});return{bullets:W.bullets.slice(0,6),script:W.script};}catch(e){return undefined;}})()});
  const hist=Object.keys(log).sort().reverse().slice(0,30).map(d=>({d,picks:(log[d].picks||[]).filter(x=>x.main).map(slim)})).filter(x=>x.picks.length);
  const logOf=x=>(log[S.d]&&log[S.d].picks||[]).find(y=>y.main&&y.game===x.game&&y.pick===x.pick);
  const gate=(x,body)=>{const at=pubOpenAt(x);const L=logOf(x);const graded=!!(L&&(L.hit!=null||L.push));const open=full||graded||(at!=null&&now>=at);
    return open?{...body,unlockAt:at}:{hidden:true,sp:x.sp,start:x.start||'',unlockAt:at};};
  const today_=S.locked?{d:S.d,lockedAt:S.lockedAt,unlockMin:30,picks:(S.top3||[]).map(x=>{const L=logOf(x);return gate(x,slim({...x,hit:L?L.hit:null,push:L?L.push:false,whyOn:true,d0:S.d}));}),
    props:(S.props||[]).slice(0,3).map(x0=>{const x=deskPropResult({...x0,start:x0.start||deskTeamStart(x0.sp,x0.team)},S.d);const lab=`${x.player} ${x.side==='under'?'under':'over'} ${x.thr} ${x.stat}`;
      return gate(x,{sp:x.sp,player:x.player,team:x.team,label:lab,stat:x.stat,k:(x.keys||[x.k])[0]||null,thr:x.thr,side:x.side,price:x.price,p:+(+x.p).toFixed(3),start:x.start||'',hit:x.hit==null?null:x.hit,push:!!x.push,actual:x.actual});}),
    allStarted:(S.top3||[]).every(x=>pubIsOpen(x,now)||!!(logOf(x)&&(logOf(x).hit!=null||logOf(x).push)))}:null;
  let parlay=null,prec=null;try{const B=get(BKDAY_KEY,{})||{};if(B.locked&&B.d===today()&&B.own&&B.own.legs.length){const O=B.own;
      parlay={d:B.d,lockedAt:B.lockedAt,price:decimalToAmerican(O.dec),p:O.p,result:tixDone(O.legs),legs:O.legs.map(l=>{const st=l.start||deskGameStart(l.sp,l.game)||'';
        const x={...l,start:st};if(!full&&!pubIsOpen(x,now)&&l.hit==null&&!l.push)return{hidden:true,sp:l.sp,start:st,unlockAt:pubOpenAt(x)};let W=null;try{W=pickWhy({...l,date:B.d});}catch(e){}
        return{sp:l.sp,game:l.game,gl:gameLabel(l.sp,l.game),pick:l.pick,price:l.price,p:l.p,start:st,unlockAt:pubOpenAt(x),by:(l.by||[l.v]).map(charName).join(' + '),hit:l.hit==null?null:l.hit,push:!!l.push,why:W?{bullets:W.bullets.slice(0,5),script:W.script}:null};})};}
    const RR=bkDayRecord().own;prec={w:RR.w,l:RR.l,u:+RR.u.toFixed(2)};}catch(e){}
  let cashed=[];try{cashed=cashedList(14).filter(c=>c.units>=1).slice(0,12);}catch(e){}
  const updates=(get(PUBUPD_KEY,[])||[]).filter(u=>u.pub!==false&&now-u.ts<3*864e5).slice(-12).reverse().map(u=>({ts:u.ts,text:u.text,kind:u.kind||'update'}));
  return{v:4,generated:now,cashed,brand:'TheDesk',price:get('d4.pricetext','')||'$19.99/mo · $9.99/wk',social:{fb:THEDESK_SOCIAL.fb||'',tg:THEDESK_SOCIAL.tg||''},handle:get(LS.handle,''),
    subscribe:get('d4.sublink',''),record:R,today:today_,parlay,parlayRecord:prec,updates,
    /* v2.51.1 · today's card never rides in the history list — it showed every locked pick there (with its price) before
       its 30-minute unlock. Today lives in "today" (gated); it joins the history once the day turns. */
    history:hist.filter(h=>!S||!S.d||h.d<S.d),unlockMin:30};}
function publicFeed(){return publicFeedCore(false);}
function pubSig(F){return JSON.stringify([F.today&&F.today.picks.map(x=>x.hidden?'h':x.hit),F.today&&(F.today.props||[]).map(x=>x.hidden?'h':x.hit),F.parlay&&F.parlay.legs.map(l=>l.hidden?'h':l.hit),(F.cashed||[]).map(c=>c.id),(F.updates||[]).map(u=>u.ts)]);}

/* ── 14 · BROADCAST — the public page, the channels and the lounges ─────────────
   VIP channel  — the full card at the freeze, every result, every cash, the recap
   VIP lounge   — a "card is up" note, every result, every cash, the recap
   Public channel / public lounge — "today's card is locked", each Best 3 pick /
     prop / Banker leg the moment it unlocks (30 min before its game), their
     results, every cash, the public recap
   Slate updates you write go wherever you tick. The 24/7 worker carries all of it
   after the post, with every device off. */
const BCAST_KEY='d4.bcast';
function bcCfg(){const B=get(BCAST_KEY,null)||{};return{pub:B.pub!=null?B.pub:tgChatNorm(String(THEDESK_SOCIAL.tg||'').replace(/^https?:\/\/t\.me\//,'')),vipLounge:B.vipLounge||'',pubLounge:B.pubLounge||'',
  autoPost:B.autoPost!==false,siteByWorker:B.siteByWorker!==false};}
function bcSave(k,v){const B=get(BCAST_KEY,null)||{};B[k]=typeof v==='string'?(v.trim()?tgChatNorm(v):''):v;set(BCAST_KEY,B);deskToast('Saved',1400);}
function bcSettingsHtml(){const B=bcCfg();const inp=(k,lab,ph)=>`<div class="mono" style="font-size:10px;color:var(--mute);margin:8px 0 3px">${lab}</div><input value="${txtEsc(B[k]||'')}" placeholder="${ph}" onchange="bcSave('${k}',this.value)">`;
  return`<div class="tkt" style="margin:8px 0"><h3 style="margin:0">📣 Where everything goes</h3>
    <div class="sub" style="font-size:10.5px;margin:4px 0">The VIP card posts itself at the master evaluation. Results go out as each game grades — VIP gets every pick; the public side gets the Best 3 only, each once it unlocks (30 min before its game). The bot must be an admin wherever it posts.</div>
    ${inp('pub','Public channel','@TheDeskApp')}${inp('vipLounge','VIP lounge (group chat id, -100…)','-100…')}${inp('pubLounge','Public lounge (group chat id, -100…)','-100…')}
    <label class="mono" style="font-size:10px;display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" ${B.autoPost?'checked':''} onchange="bcSave('autoPost',this.checked)"> post the VIP card by itself at the master evaluation</label>
    <label class="mono" style="font-size:10px;display:flex;gap:6px;align-items:center;margin-top:4px"><input type="checkbox" ${B.siteByWorker?'checked':''} onchange="bcSave('siteByWorker',this.checked)"> let the 24/7 worker update the public page (sends it your site token, encrypted)</label>
    <div class="bar" style="margin-top:6px"><button onclick="bcComposer()">📣 Post a slate update</button><button onclick="shareHub()">📤 Share hub</button></div></div>`;}
if(typeof subCardHtml==='function'){const SUBCARD0=subCardHtml;subCardHtml=function(){return SUBCARD0()+bcSettingsHtml();};}
/* a slate update: weather, injuries, a line move — to the places you tick */
function bcComposer(){let ov=document.getElementById('bcComp');if(ov){ov.remove();return;}const B=bcCfg();const vip=tgChatNorm(get('d4.tgchat',''));
  const box=(id,lab,on,ok)=>`<label class="mono bc-opt${ok?'':' off'}"><input type="checkbox" id="${id}" ${on&&ok?'checked':''} ${ok?'':'disabled'}> ${lab}</label>`;
  ov=document.createElement('div');ov.id='bcComp';ov.className='desk-modal';ov.onclick=e=>{if(e.target===ov)ov.remove();};
  ov.innerHTML=`<div class="desk-sheet"><h3 style="margin:0 0 6px">📣 Slate update</h3>
    <div class="chipset">${[['update','📣 Update'],['weather','🌧 Weather'],['injury','🚑 Injury'],['line','🔁 Line move'],['result','🏁 Result']].map(([k,l],i)=>`<button class="msg-chip${i?'':' on'}" data-k="${k}" onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${l}</button>`).join('')}</div>
    <textarea id="bcText" rows="4" style="width:100%;margin-top:8px" placeholder="e.g. Wind 20 mph in Chicago — we're off the over. Nothing else changes."></textarea>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${box('bcPage','Public page',true,true)}${box('bcVip','VIP channel',true,!!vip)}${box('bcVipL','VIP lounge',true,!!B.vipLounge)}${box('bcPub','Public channel',true,!!B.pub)}${box('bcPubL','Public lounge',true,!!B.pubLounge)}</div>
    <div class="bar" style="margin-top:10px"><button class="primary" onclick="bcPost()">Post it</button><button onclick="document.getElementById('bcComp').remove()">Cancel</button></div><div id="bcStat" class="sub mono" style="font-size:10px"></div></div>`;
  document.body.appendChild(ov);setTimeout(()=>{const t=document.getElementById('bcText');if(t)t.focus();},50);}
const BC_ICO={update:'📣',weather:'🌧',injury:'🚑',line:'🔁',result:'🏁'};
async function bcPost(){const t=(document.getElementById('bcText')||{}).value||'';if(!t.trim())return;const ck=id=>{const e=document.getElementById(id);return!!(e&&e.checked&&!e.disabled);};
  const kb=document.querySelector('#bcComp .chipset .on');const kind=kb?kb.getAttribute('data-k'):'update';const st=document.getElementById('bcStat');const say=h=>{if(st)st.innerHTML=h;};
  const R=await bcSend(t.trim(),kind,{page:ck('bcPage'),vip:ck('bcVip'),vipL:ck('bcVipL'),pub:ck('bcPub'),pubL:ck('bcPubL')});
  say(`<span style="color:var(--win)">✓ Sent to ${R.sent.join(', ')||'nowhere'}</span>${R.fail.length?` · <span style="color:var(--rust)">failed: ${R.fail.join(', ')}</span>`:''}`);setTimeout(()=>{const o=document.getElementById('bcComp');if(o)o.remove();},1800);}
async function bcSend(text,kind,to){const B=bcCfg();const sent=[],fail=[];const html=`${BC_ICO[kind]||'📣'} <b>${kind==='update'?'Slate update':({weather:'Weather',injury:'Injury news',line:'Line move',result:'Result'})[kind]||'Update'}</b>\n${txtEsc(text)}\n<i>— TheDesk · ${new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</i>`;
  if(to.page){const U=get(PUBUPD_KEY,[])||[];U.push({ts:Date.now(),text,kind,pub:true});set(PUBUPD_KEY,U.slice(-40));
    const r=await deskPublishPage('Slate update').catch(()=>null);(r&&r.ok?sent:fail).push('public page');}
  const chats=[['VIP channel',to.vip&&tgChatNorm(get('d4.tgchat',''))],['VIP lounge',to.vipL&&B.vipLounge],['public channel',to.pub&&B.pub],['public lounge',to.pubL&&B.pubLounge]];
  for(const[lab,c]of chats){if(!c)continue;const j=await tgApi('sendMessage',{chat_id:c,text:html,parse_mode:'HTML',disable_web_page_preview:'true'});(j&&j.ok!==false?sent:fail).push(lab);await new Promise(z=>setTimeout(z,300));}
  return{sent,fail};}
/* publish the public page now (the card doesn't need to be locked — updates and cashes go out any time) */
async function deskPublishPage(msg){if(!(get(LS.ghtoken,'')||get(SYNC.token,'')))return{ok:false,reason:'no GitHub token'};const S=best5State();
  if(S.locked)return publishPicks(false);const F=publicFeed();const a=await ghPut('public/picks.json',JSON.stringify(F,null,1),(msg||'Update')+' — '+today());
  if(a.ok&&pubRepo()!==LEGACY_PUB_REPO){try{await ghPut('public/picks.json',JSON.stringify(F,null,1),(msg||'Update')+' — '+today(),LEGACY_PUB_REPO);}catch(e){}}
  if(a.ok){const P=get('d4.pubstate',{})||{};set('d4.pubstate',{...P,csig:pubSig(F),cts:Date.now()});}return a;}
/* the VIP card, posted without any pop-ups (the master evaluation does this by itself) */
async function deskTgPostCard(force){const tok=String(get('d4.tgbot','')||'').trim(),chat=tgChatNorm(get('d4.tgchat',''));if(!tok||!chat)return{ok:false,reason:'Telegram not set up'};
  const P0=get('d4.tgposted',null);if(!force&&P0&&P0.d===today())return{ok:false,reason:'already posted today'};
  const card=subCard();const parts=subTelegramText(card);const ids=[];let unconfirmed=false;
  for(const text of parts){const j=await tgApi('sendMessage',{chat_id:chat,text,parse_mode:'HTML',disable_web_page_preview:'true'});
    if(j&&j.ok===false)return{ok:false,reason:'Telegram refused it: '+(j.description||'error')};if(j&&j.ok&&j.result&&j.result.message_id)ids.push(j.result.message_id);else unconfirmed=true;await new Promise(z=>setTimeout(z,450));}
  set('d4.tgposted',{d:today(),ts:Date.now(),n:parts.length,unconfirmed,auto:!force});try{tgTrackPost(card,chat,ids.length===parts.length?ids:[]);}catch(e){console.warn('tg track',e);}
  return{ok:true,n:parts.length,card};}
/* the freeze's publishing: page, VIP card, and the "card is locked" notes — each once a day */
async function deskPublishAll(why){const out=[];const B=bcCfg();const d=today();const sent=get('d4.bcsent',{})||{};if(sent.d!==d){sent.d=d;sent.k={};}
  try{const r=await deskPublishPage('Publish picks');out.push(r&&r.ok?'public page ✓':'public page: '+((r&&r.reason)||'not set up'));}catch(e){out.push('public page failed');}
  let card=null;if(B.autoPost||why==='manual'){try{const r=await deskTgPostCard(false);card=r.card||null;out.push(r.ok?`VIP card ✓ (${r.n} message${r.n>1?'s':''})`:'VIP card: '+r.reason);}catch(e){out.push('VIP card failed');}}
  const S=(()=>{try{return best5State();}catch(e){return{};}})();const n=(S.top3||[]).length;let P=null;try{P=deskPlan();}catch(e){}
  const day=new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  if(B.vipLounge&&!sent.k.vipL&&get('d4.tgposted',{}).d===d){const j=await tgApi('sendMessage',{chat_id:B.vipLounge,text:`🔒 <b>Today's VIP card is up</b> — ${day}\n${n?`Best ${n}`:'No Best 3 today (nothing cleared the 70% rule)'}${P&&P.own?' · the Banker\'s parlay':''}${P&&Object.keys(P.chars||{}).length?' · '+Object.keys(P.chars).length+' character tickets':''}. Check the channel.`,parse_mode:'HTML'});if(j)sent.k.vipL=1;}
  for(const[k,c]of[['pub',B.pub],['pubL',B.pubLounge]]){if(!c||sent.k[k]||!S.locked)continue;
    const j=await tgApi('sendMessage',{chat_id:c,text:`🔒 <b>TheDesk — ${day}</b>\n${n?`Today's Best ${n} are locked`:'No play cleared the bar today — we don\'t force picks'}.\nEach one unlocks here and on the public page <b>30 minutes before its game</b>.${get('d4.sublink','')?`\nVIP has every pick now → ${txtEsc(get('d4.sublink',''))}`:''}\n<i>Every pick locked before the games, graded at the final.</i>`,parse_mode:'HTML',disable_web_page_preview:'true'});
    if(j)sent.k[k]=1;}
  set('d4.bcsent',sent);return{msg:out.join(' · '),out};}
/* the worker gets the public side too: who's where, what unlocks when, and the full page to publish */
if(typeof tgwPayload==='function'){const TGW_PAYLOAD0=tgwPayload;tgwPayload=function(p){const o=TGW_PAYLOAD0(p);try{const B=bcCfg();o.bc={pub:B.pub||'',vipLounge:B.vipLounge||'',pubLounge:B.pubLounge||''};
    const F=publicFeedCore(true);o.feed=F;const pubLegs=[];const T=F.today||{};
    (T.picks||[]).forEach((x,i)=>pubLegs.push({k:tgLegKey(x),kind:'Best 3',n:i+1,label:`${x.pick} (${tcSgn(x.price)})`,sp:x.sp,game:x.game,pick:x.pick,price:x.price,start:x.start,unlockAt:x.unlockAt}));
    (T.props||[]).forEach((x,i)=>pubLegs.push({k:'pprop|'+x.sp+'|'+x.player+'|'+x.stat+'|'+x.thr,kind:'Prop',n:i+1,label:x.label,sp:x.sp,player:x.player,team:x.team,stat:x.k||'',thr:x.thr,side:x.side,start:x.start,unlockAt:x.unlockAt,prop:true}));
    ((F.parlay||{}).legs||[]).forEach((l,i)=>pubLegs.push({k:tgLegKey(l),kind:"Banker's parlay",n:i+1,label:`${l.pick} (${tcSgn(l.price)})`,sp:l.sp,game:l.game,pick:l.pick,price:l.price,start:l.start,unlockAt:l.unlockAt}));
    o.pub={legs:pubLegs,parlay:F.parlay?{price:F.parlay.price,keys:F.parlay.legs.map(l=>tgLegKey(l))}:null,day:o.recapPlan&&o.recapPlan.day};
    const tok=B.siteByWorker?(get(LS.ghtoken,'')||get(SYNC.token,'')):'';o.site={repo:pubRepo(),path:'public/picks.json',tok:tok||''};o.feedTs=Date.now();}catch(e){console.warn('worker public payload',e);}return o;};}
/* keep the worker's copy of the page current whenever the app publishes */
async function deskWorkerSync(){try{if(!tgwOn())return;const P=tgPosts();const d=today();const p=P[d];if(!p||!p.worker)return;const R=await tgwHandOff(p);
    /* v2.33 · wake the worker now — GitHub's schedule can sit for hours; the worker then relays itself through the slate */
    if(R&&R.ok&&typeof tgwRunNow==='function'){try{tgwRunNow().catch(()=>{});}catch(e){}}return R;}catch(e){}}
/* auto-publish: as each pick unlocks (30 min before its game) and as each one grades */
async function publishAuto(){try{try{cparGrade();cpxGrade();bkDayGrade();}catch(e){}
  if(!(get(LS.ghtoken,'')||get(SYNC.token,'')))return;const S=get(BEST5_KEY,{});const P=get('d4.pubstate',{})||{};
  const F=publicFeed();const sig=pubSig(F);if(S.locked&&S.d===today()){if(P.d===S.d&&P.ok&&P.sig===sig)return;await publishPicks(false);deskWorkerSync();return;}
  if(P.csig===sig)return;await deskPublishPage('Update');}catch(e){}}

/* ── 15 · RECORDS — clean up front, the deep data one tap away ─────────────────── */
let STR_V='all',STR_SP='all',STR_M='all';
function recViewBar(){const V=[['overview','📊 Records'],['strengths','⭐ Strengths'],['ideology','🧠 Ideology'],['tickets','🎟 My tickets'],['eval','🧪 Model eval'],['chars','🔬 Deep dive'],['engine','🛠 Engine Room']];
  return'<div class="subnav rec-nav">'+V.map(([k,l])=>'<button class="'+(REC_VIEW===k||(k==='engine'&&REC_VIEW==='deep')?'on':'')+'" onclick="REC_VIEW=\''+k+'\';renderRecordsHub()">'+l+'</button>').join('')+'</div>';}
function recTile(lab,R,sub){const n=R.w+R.l,p=n?R.w/n:null;return`<div class="rec-tile"><div class="rt-k">${lab}</div><div class="rt-v" style="color:${recColor(p,n)}">${R.w}-${R.l}</div><div class="rt-s">${n?Math.round(p*100)+'%':'—'} · ${R.u>=0?'+':''}${(+R.u||0).toFixed(1)}u${sub?' · '+sub:''}</div></div>`;}
function recOverviewHtml(){const V=recPool(REC_SP,REC_SCOPE);const all=recStats(V);let b3={w:0,l:0,u:0},bk={w:0,l:0,u:0};const cp={w:0,l:0,u:0};
  try{b3=best3Record();}catch(e){}try{bk=bkDayRecord().own;}catch(e){}try{CHAR_ORDER.forEach(v=>{const r=cparRecord(v);cp.w+=r.w;cp.l+=r.l;cp.u+=r.u;});}catch(e){}
  const sps=REC_SPORTS.filter(([k])=>k!=='all'&&V.some(x=>x.sp===k));
  const grid=sps.length?`<div style="overflow-x:auto"><table class="rec-tbl"><tr><td></td>${REC_MK.map(([,l])=>`<td>${l}</td>`).join('')}<td>All</td></tr>${sps.map(([s,l])=>{const a=V.filter(x=>x.sp===s);return`<tr><td>${l}</td>${REC_MK.map(([m])=>recCell(a.filter(x=>x.market===m),5)).join('')}${recCell(a,5)}</tr>`;}).join('')}
    <tr class="tot"><td><b>All</b></td>${REC_MK.map(([m])=>recCell(V.filter(x=>x.market===m),5)).join('')}${recCell(V,5)}</tr></table></div>`:'<div class="sub" style="font-size:10.5px">No graded official calls here yet.</div>';
  return`${recChips()}${recLegend()}<div class="rec-tiles">${recTile(REC_SCOPE==='off'?'Official calls':'All calls',all)}${recTile('Best 3',b3)}${recTile("Banker's parlays",bk)}${recTile('Character tickets',cp)}</div>
    <div class="tkt"><h3>The desk — league × bet</h3><div class="sub" style="font-size:10.5px">Every character's ${REC_SCOPE==='off'?'official ':''}calls together. Gold 70%+, green 60s, white 50s, red under 50.</div>${grid}</div>
    ${voicesReportCore()}<div class="sub mono" style="font-size:9.5px;color:var(--mute);margin:6px 3px">Luck vs skill, calibration, CLV and the old per-sport tables live in 🛠 Engine Room → Deep stats.</div>`;}
/* today's plays inside each character's proven strength lanes, and a parlay across them */
function deskSlipAdd(sp,game,pick,price,p,gd){const id='str|'+sp+'|'+game+'|'+pick;const i=SLIP.findIndex(x=>x.id===id||(x.game===game&&x.pick===pick));
  if(i>=0){SLIP.splice(i,1);}else{const [a,h]=String(game).split('@');let n=0;try{n=deskExposure({sp,game,m:(sqKey(sp,{away:{abbr:a},home:{abbr:h}},pick)||{}).market,sd:(sqKey(sp,{away:{abbr:a},home:{abbr:h}},pick)||{}).side});}catch(e){}
    if(n>=EXPO_CAP&&!confirm(`${pick} is already on ${n} tickets today — the cap is ${EXPO_CAP}. Add it anyway?`))return;
    SLIP.push({id,game,pick,price:price!=null?+price:null,sport:sp,date:gd||today(),gameDate:gd||today(),p:p||0.5});}
  set(LS.slip,SLIP);try{paintSlip();}catch(e){}try{renderRecordsHub();}catch(e){}try{const v=document.getElementById('v-today');if(v&&v.classList.contains('on'))renderToday(true);}catch(e){}}
function strengthPlays(){const lanes=recLanes(recPool('all','off'),8);const LS2=new Map(lanes.map(o=>[o.v+'|'+o.sp+'|'+o.m,o]));const V=roGet(VOICES_KEY,[],30e3)||[];const d=today();
  return{lanes,plays:V.filter(c=>String(c.date).slice(0,10)===d&&CHARS[c.voice]&&!META_VOICES.has(c.voice)&&!c.graded&&isOfficial(c)&&LS2.has(c.voice+'|'+c.sp+'|'+c.market)&&c.price!=null&&bkPriceOk(c.price)&&!deskStarted(c))
    .map(c=>({c,lane:LS2.get(c.voice+'|'+c.sp+'|'+c.market),cf:confOf(c)})).sort((a,b)=>b.cf*b.lane.p-a.cf*a.lane.p)};}
function strengthRow(o){const c=o.c;const C=CHARS[c.voice]||{};const pick=charPickText(c);const inSlip=SLIP.some(x=>x.game===c.game&&x.pick===pick);let ex=0;try{ex=deskExposure({sp:c.sp,game:c.game,m:c.market,sd:c.side});}catch(e){}
  return`<div class="str-row"><div style="flex:1;min-width:0"><b>${txtEsc(pick)}</b> <span class="mono" style="color:var(--gold);font-size:11px">${sgnP(c.price)}</span> <span class="cf-chip on" style="color:${recColor(o.cf,9)};border-color:${recColor(o.cf,9)}">${Math.round(o.cf*100)}%</span>
      <div class="mono" style="font-size:9.5px;color:var(--mute)">${(SP_LAB[c.sp]||'').split(' ')[0]} ${txtEsc(gameLabel(c.sp,c.game))} · <b style="color:${C.color}">${txtEsc(charName(c.voice).replace(/^The /,''))}</b> is <b style="color:${recColor(o.lane.p,o.lane.n)}">${o.lane.w}-${o.lane.l}</b> on ${CONF_SP_LAB[c.sp]} ${({ml:'ML',spread:'ATS',total:'O/U'})[c.market]}${ex?` · on ${ex} ticket${ex===1?'':'s'}`:''}</div></div>
    <button class="${inSlip?'primary':''}" onclick="deskSlipAdd('${c.sp}','${esc(c.game)}','${esc(pick)}',${c.price!=null?+c.price:'null'},${(+o.cf).toFixed(3)},'${String(c.date).slice(0,10)}')">${inSlip?'✓ on slip':'＋ slip'}</button></div>`;}
function recStrengthsHtml(){const{lanes,plays}=strengthPlays();const ch=(cur,k,v,lab,fn)=>`<button class="msg-chip${cur===v?' on':''}" onclick="${k}='${v}';renderRecordsHub()">${lab}</button>`;
  const vs=[...new Set(plays.map(o=>o.c.voice))];const P=plays.filter(o=>(STR_V==='all'||o.c.voice===STR_V)&&(STR_SP==='all'||o.c.sp===STR_SP)&&(STR_M==='all'||o.c.market===STR_M));
  const slipLegs=SLIP.filter(x=>String(x.id||'').startsWith('str|'));const dec=slipLegs.reduce((a,x)=>a*(x.price!=null?americanToDecimal(x.price):1.91),1),pc=slipLegs.reduce((a,x)=>a*(x.p||0.5),1);
  return`<div class="tkt hi"><h3>⭐ Today's strength plays</h3><div class="sub" style="font-size:10.5px">Official calls (70%+) made inside a lane where that character has proven itself — 60%+ on 8 or more official calls in that league × bet. Build a parlay across characters' strengths: tap ＋ slip.</div>
    <div class="chipset" style="margin-top:6px">${ch(STR_V,'STR_V','all','Every character')}${vs.map(v=>ch(STR_V,'STR_V',v,txtEsc(charName(v).replace(/^The /,'')))).join('')}</div>
    <div class="chipset">${ch(STR_SP,'STR_SP','all','All leagues')}${[...new Set(plays.map(o=>o.c.sp))].map(s=>ch(STR_SP,'STR_SP',s,CONF_SP_LAB[s])).join('')}</div>
    <div class="chipset">${ch(STR_M,'STR_M','all','All bets')}${REC_MK.map(([m,l])=>ch(STR_M,'STR_M',m,l)).join('')}</div>
    ${P.length?P.slice(0,30).map(strengthRow).join(''):`<div class="sub" style="font-size:11px;margin-top:6px">${plays.length?'Nothing matches the filter.':'No strength plays today yet — they show up once the boards are loaded and the characters have made their calls.'}</div>`}
    ${slipLegs.length?`<div class="str-slip"><b>Your strengths parlay:</b> ${slipLegs.length} leg${slipLegs.length===1?'':'s'} · ${decimalToAmerican(dec)} · ${(pc*100).toFixed(1)}% to cash <button class="primary" onclick="try{toggleSlipSheet()}catch(e){}">Open the slip →</button></div>`:''}</div>
    <details class="tkt"><summary><b>Every strength lane</b> <span class="mono" style="font-size:10px;color:var(--mute)">${lanes.length}</span></summary>${lanes.length?lanes.map(o=>`<div class="mono" style="font-size:10.5px;padding:3px 0"><b style="color:${(CHARS[o.v]||{}).color}">${txtEsc(charName(o.v).replace(/^The /,''))}</b> · ${CONF_SP_LAB[o.sp]} ${({ml:'ML',spread:'ATS',total:'O/U'})[o.m]} <b style="color:${recColor(o.p,o.n)}">${o.w}-${o.l}</b> (${Math.round(o.p*100)}%) ${o.u>=0?'+':''}${o.u.toFixed(1)}u</div>`).join(''):'<div class="sub" style="font-size:10.5px">No lane has 8+ official calls at 60%+ yet.</div>'}</details>`;}
if(typeof renderRecordsHub==='function'){const REC_HUB0=renderRecordsHub;renderRecordsHub=function(){const el=document.getElementById('recordsHub');if(!el)return;
  try{const gv=document.getElementById('v-grades');if(gv)gv.classList.toggle('rec-clean',!['deep','chars'].includes(REC_VIEW));}catch(e){}
  try{if(REC_VIEW==='overview'){el.innerHTML=recViewBar()+recOverviewHtml();return;}
    if(REC_VIEW==='strengths'){el.innerHTML=recViewBar()+recStrengthsHtml();return;}
    if(REC_VIEW==='ideology'){el.innerHTML=recViewBar()+ideologyHtml();return;}
    if(REC_VIEW==='engine'){REC_HUB0();el.insertAdjacentHTML('beforeend',`<div class="bar" style="margin:8px 3px"><button onclick="REC_VIEW='deep';renderRecordsHub()">📚 Deep stats — luck vs skill, calibration, CLV, every table</button></div>`);return;}}
  catch(e){console.warn('records',e);el.innerHTML=recViewBar()+'<div class="tkt"><div class="sub">'+txtEsc(e.message)+'</div></div>';return;}
  return REC_HUB0();};}

/* ── 16 · TODAY — the day at a glance: where the process stands, the official card,
   the strength plays. The board's full list is still there, under the filters. */
function todayTopHtml(){let h='';try{h+=deskProcessHtml();}catch(e){}
  try{h+=todayBestHero();}catch(e){console.warn('best hero',e);}
  try{const S=best5State();if(!(S.top3||[]).length&&deskFrozen())h+=`<div class="tkt"><b>⭐ No Best 3 today</b><div class="sub" style="font-size:10.5px">Nothing cleared the 70% rule at a fair price. We don't force picks.</div></div>`;}catch(e){}
  try{const{plays}=strengthPlays();const G=strengthGroups(plays);if(G.length)h+=`<details class="tkt"${G.length<=4?' open':''}><summary><b>💪 Strength plays</b> <span class="mono" style="font-size:10px;color:var(--mute)">${G.length} pick${G.length===1?'':'s'} — characters inside their proven lanes</span></summary>${G.slice(0,6).map(strengthGroupRow).join('')}
      ${G.length>6||plays.length>G.length?`<div class="bar"><button onclick="REC_VIEW='strengths';tab('grades',document.querySelector('nav button[onclick*=grades]'))">Every character's strength plays + the parlay builder →</button></div>`:''}</details>`;}catch(e){}
  return h;}
/* the Best 3 on Today: each pick's % is the confidence that made it official, and who's behind it */
function todayBestHero(){let S=null;try{S=best5State();}catch(e){return'';}const top=(S&&S.top3)||[];if(!top.length)return'';
  const R=best3Record();const rec=R.w+R.l?`${R.w}-${R.l}${R.pu?'-'+R.pu:''} · ${R.u>=0?'+':''}${R.u.toFixed(1)}u`:'new';
  const res=x=>{try{const g=gradeLeg({sport:x.sp,game:x.game,pick:x.pick,gameDate:S.d},S.d);if(g&&!g.live){if(g.push)return'<span style="color:var(--mute)">PUSH</span>';if(g.hit===true)return'<span style="color:var(--win)">✓ WON</span>';if(g.hit===false)return'<span style="color:var(--rust)">✗ LOST</span>';}if(g&&g.live)return'<span style="color:#ff4b5c">● live</span>';}catch(e){}return'';};
  return`<div class="tkt today-best" id="todayBestHero"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><h3 style="margin:0">🏆 Today's Best ${top.length}</h3><span class="mono" style="font-size:10.5px;color:${R.u>=0?'var(--win)':'var(--rust)'}">${rec}</span></div>
    <div class="sub mono" style="font-size:9.5px;margin:2px 0 6px">Straight bets${S.locked?' · 🔒 locked '+deskT(S.lockedAt):' · building'} — every one official (a character 70%+ sure).</div>
    ${top.map((x,i)=>{const p=x.cf!=null?x.cf:x.p!=null?x.p:best5Prob(x);return`<div class="tb-row"><div class="tb-n">${i+1}</div>
      <div style="flex:1;min-width:0"><b style="font-size:14px">${txtEsc(x.pick)}</b> <span class="mono" style="font-size:11px;color:var(--gold)">${x.price!=null?tcSgn(x.price):''}</span>
      <div class="mono" style="font-size:9.5px;color:var(--mute)">${(SP_LAB[x.sp]||'').split(' ')[0]} ${txtEsc(gameLabel(x.sp,x.game))}${(x.confBy||[]).length?' · '+x.confBy.map(v=>txtEsc(charName(v).replace(/^The /,''))).join(', '):x.unan?' · <span style="color:#ff6fae">★ unanimous</span>':''}</div></div>
      <div style="text-align:right"><div class="tb-p" style="color:${recColor(p,9)}">${Math.round((p||0)*100)}%</div><div class="mono" style="font-size:10px">${res(x)}</div></div></div>`;}).join('')}</div>`;}
if(typeof renderToday==='function'){const RT0=renderToday;renderToday=function(noSnap){const r=RT0(noSnap);try{const el=document.getElementById('todayBody');if(el)el.insertAdjacentHTML('afterbegin',`<div id="todayTop">${todayTopHtml()}</div>`);}catch(e){console.warn('today top',e);}return r;};}

/* ── 17 · BOOT ─────────────────────────────────────────────────────────────── */
function deskRerender(){try{const on=id=>{const v=document.getElementById(id);return v&&v.classList.contains('on');};
  if(on('v-money')){const el=document.getElementById('moneyBody');if(el)el.innerHTML=renderMoneyTab();}
  if(on('v-banker'))renderBankerTab();if(on('v-today'))renderToday(true);if(on('v-grades'))renderRecordsHub();}catch(e){console.warn('rerender',e);}}
const DESK_CSS=`
.cf-chip{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:20px;border:1px solid;margin-left:4px;vertical-align:1px}
.cf-chip.on{background:rgba(61,220,132,.07)}
.chipset{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}
.lane-chip{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:10px;padding:3px 8px;border-radius:20px;border:1px solid;margin:2px 4px 2px 0}
.rec-tbl{width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:10.5px;margin-top:6px}
.rec-tbl td{padding:6px 4px;border-top:1px solid var(--rule);text-align:center}.rec-tbl tr:first-child td{color:var(--mute);border-top:0;font-size:9.5px;letter-spacing:.08em}
.rec-tbl td:first-child{text-align:left;white-space:nowrap}.rec-tbl tr.tot td{border-top:1px solid rgba(255,255,255,.18)}
.rec-tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:8px 0}
.rec-tile{background:var(--grad-card);border:1px solid var(--hair);border-radius:14px;padding:12px;text-align:center;box-shadow:var(--sh-sm)}
.rt-k{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}.rt-v{font-family:'Archivo';font-weight:900;font-size:26px;line-height:1.15}.rt-s{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--mute)}
.rec-nav{flex-wrap:wrap;margin-bottom:8px}#v-grades.rec-clean>*:not(#recordsHub){display:none}
.ideo-card{background:var(--grad-card);border:1px solid var(--hair);border-radius:14px;padding:10px 12px;margin:8px 0}.ideo-card summary{cursor:pointer;font-size:13px}
.ideo-body{padding-top:6px}.ideo-togs{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0}.ideo-tog{font-family:'IBM Plex Mono',monospace;font-size:10.5px;display:flex;gap:4px;align-items:center}
.ideo-p{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;margin:4px 0}.ideo-p input{width:84px}
.desk-hero{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:14px;border-radius:16px;margin-bottom:8px;background:linear-gradient(140deg,#1d1a10,#121820 70%);border:1px solid rgba(201,162,39,.35)}
.desk-hero.locked{border-color:rgba(61,220,132,.4)}.desk-k{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--gold);letter-spacing:.06em}.desk-t{font-family:'Archivo';font-weight:900;font-size:22px}
.desk-rec{text-align:right}.desk-rec .mono{font-size:9.5px;color:var(--mute)}.desk-rec b{font-family:'Archivo';font-size:15px}
.desk-stats{display:flex;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:10px}.desk-stats b{display:block;font-family:'Archivo';font-weight:900;font-size:18px}.desk-stats span{font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:var(--mute)}
.expo-row{font-size:10px;padding:4px 0;border-top:1px solid var(--rule)}.expo-n{display:inline-block;min-width:30px;text-align:center;border-radius:6px;background:rgba(255,255,255,.06);padding:0 4px;color:var(--chalk)}.expo-n.full{background:rgba(255,180,61,.18);color:var(--gold)}
.bank-hero{text-align:center;padding:22px 14px 16px;border-radius:18px;margin-bottom:8px;background:radial-gradient(400px 160px at 50% 0%,rgba(61,220,132,.10),transparent 70%),var(--grad-card-hi);border:1px solid var(--hair);box-shadow:var(--sh-md)}
.bank-k{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}.bank-v{font-family:'Archivo';font-weight:900;font-size:46px;line-height:1.1;margin:4px 0}.bank-s{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--mute)}
.plan-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--rule)}.plan-st{font-family:'Archivo';font-weight:900;font-size:16px;color:var(--win);white-space:nowrap}
.hist-row{display:flex;justify-content:space-between;gap:8px;font-size:10.5px;padding:4px 0;border-top:1px solid var(--rule)}
.lg-card .lg-head{display:flex;justify-content:space-between;align-items:baseline}.lg-head h3{margin:0}
.lg-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--rule)}.lg-rank{width:26px;text-align:center;font-size:17px}.lg-who{flex:1;min-width:0}.lg-roll{text-align:right}.lg-roll b{font-family:'Archivo';font-size:17px}.lg-sub{font-size:9.5px;color:var(--mute)}
.ch-card .ch-top{display:flex;justify-content:space-between;align-items:baseline}.ch-nums{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;margin:4px 0;font-size:13px}
.ch-bar{height:8px;border-radius:4px;background:var(--rule);overflow:hidden;margin:6px 0}.ch-bar>div{height:100%;border-radius:4px}
.ch-play{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid var(--rule)}
.ch-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0}.ch-preset{text-align:left;background:var(--grad-card);border:1px solid var(--hair);border-radius:14px;padding:12px;color:var(--chalk);cursor:pointer}.ch-ico{font-size:22px}
.str-row{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid var(--rule)}.str-slip{margin-top:8px;padding:10px;border-radius:12px;border:1px solid rgba(61,220,132,.4);background:rgba(61,220,132,.06);font-size:12px}
.ps-card .ps-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.ps-step{display:flex;gap:6px;align-items:flex-start;padding:6px;border-radius:10px;background:rgba(255,255,255,.025);font-size:11px;line-height:1.3}
.ps-step .mono{font-size:9px;color:var(--mute)}.ps-n{flex:none;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;background:var(--rule);color:var(--mute)}
.ps-step.ok .ps-n{background:var(--win);color:#06120a}@media(max-width:560px){.ps-card .ps-row{grid-template-columns:1fr 1fr}}
.today-best .tb-row{display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--rule)}.tb-n{font-family:'Archivo';font-weight:900;font-size:20px;color:var(--gold);width:20px;text-align:center}.tb-p{font-family:'Archivo';font-weight:900;font-size:18px}
.desk-modal{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}
.desk-sheet{width:100%;max-width:560px;background:var(--panel);border:1px solid var(--hair);border-radius:18px 18px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:var(--sh-lg)}
.bc-opt{display:flex;gap:5px;align-items:center;font-size:10.5px;padding:5px 8px;border:1px solid var(--rule);border-radius:20px}.bc-opt.off{opacity:.4}
/* v2.36 · a checkbox is never a full-width input — the page-wide input{width:100%} rule stretched every checkbox and crushed its label into a sliver */
input[type=checkbox],input[type=radio]{width:18px;height:18px;min-width:18px;max-width:18px;flex:0 0 18px;margin:0;padding:0;border-radius:4px;accent-color:#F0A01E;vertical-align:middle}
label:has(>input[type=checkbox]),label:has(>input[type=radio]){line-height:1.35}
.pub-row{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;margin-top:6px;font-size:10.5px}.pub-row a{color:var(--cold);white-space:nowrap}
.ros-wrap{display:flex;gap:12px;flex-wrap:wrap}.ros-team{flex:1 1 160px;min-width:0}.ros-hd{font-size:11.5px;margin-bottom:2px}
.ros-grp{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:8px 0 2px}
.ros-row{padding:4px 0;border-top:1px solid var(--rule);font-size:11.5px;line-height:1.35}.ros-row.out{opacity:.55}.ros-nm{overflow-wrap:anywhere}.ros-j{color:var(--mute);font-size:10px}.ros-pos{color:var(--mute);font-size:10px}
.ros-inj{font-size:9px;border:1px solid;border-radius:4px;padding:0 3px;white-space:nowrap}
.ros-st{display:flex;flex-wrap:wrap;gap:2px 10px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--chalk)}.ros-st i{font-style:normal;color:var(--mute)}.ros-gp{color:var(--mute)}
.ros-sw{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--win)}
`;
function deskBoot(){try{if(!document.getElementById('deskCss')){const st=document.createElement('style');st.id='deskCss';st.textContent=DESK_CSS;document.head.appendChild(st);}}catch(e){}
  /* Money → Bankroll */
  try{document.querySelectorAll('nav button').forEach(b=>{if(/tab\('money'/.test(b.getAttribute('onclick')||'')&&!/Bankroll/.test(b.textContent))b.childNodes.forEach(n=>{if(n.nodeType===3&&/Money/.test(n.textContent))n.textContent=n.textContent.replace('Money','Bankroll');});});}catch(e){}
  try{if(typeof BN_ICO!=='undefined')BN_ICO.money='💰';}catch(e){}
  /* the old missions: retired once (their XP is kept) — challenges are rebuilt */
  try{if(!get('d4.msRetired',null)){const A=msAll();let n=0;A.forEach(m=>{if(m.status==='active'){m.status='retired';m.retiredOn=today();n++;}});if(n)msSave(A);set('d4.msRetired',{d:today(),n});}}catch(e){}
  try{bankCfg();}catch(e){}}
if(typeof window!=='undefined'){window.addEventListener('load',()=>{deskBoot();setTimeout(()=>{try{confBackfill();}catch(e){}},4000);});}
/* the autopilot learns the confidence meter right after grading */
try{if(typeof AP_STEPS!=='undefined'&&!AP_STEPS.some(s=>s[0]==='conf')){const i=AP_STEPS.findIndex(s=>s[0]==='voices');AP_STEPS.splice(i>=0?i+1:AP_STEPS.length,0,['conf','Confidence meter','Re-learns every character\'s confidence from its graded calls (time-ordered, calibrated per market) so 70% has to have actually hit 70%.',()=>{const M=confRebuild(true);try{confBackfill();}catch(e){}PCI_C=null;return M.n;}]);}}catch(e){}
/* hidden frames never post to Telegram */
if(typeof tgAutoTick==='function'&&typeof BG_MODE!=='undefined'&&BG_MODE){tgAutoTick=async function(){return 0;};}
try{if(typeof SPORT_PAGE!=='undefined'&&!SPORT_PAGE.ncaab)SPORT_PAGE.ncaab='ncaab.html';}catch(e){}

/* ── 18 · CARD PARITY (v2.33) ──────────────────────────────────────────────────
   Every sport's card carries the same set: Coach · Trends · A–G · Alt Lines ·
   Proj. Box (with the players — season, last 5, last 10) · Props · Take/Fade ·
   Live/Final Box · My Bets · Analysis once it's final. Per-period projections
   match across sports: MLB innings ↔ hockey periods ↔ football and NBA quarters
   ↔ college halves. */
const PAR_KEYS={mlb:[['h','H'],['hr','HR'],['rbi','RBI'],['tb','TB'],['k','K (P)']],nfl:[['py','Pass'],['ry','Rush'],['rec','Rec'],['wy','Rec yds'],['td','TD']],
  nhl:[['g','G'],['a','A'],['pts','PTS'],['s','SOG']],nba:[['pts','PTS'],['reb','REB'],['ast','AST'],['fg3','3PM']]};
PAR_KEYS.ncaaf=PAR_KEYS.nfl;PAR_KEYS.ncaab=PAR_KEYS.nba;
const parEsc=s=>typeof txtEsc==='function'?txtEsc(s):String(s==null?'':s);
const parSgn=x=>x==null||!isFinite(+x)?'—':(+x>0?'+':'')+(+x);
function parLines(sp,g){try{return sportLinesFor(sp,g)||[];}catch(e){return[];}}
const parF=(L,m,sd)=>L.find(x=>(x.market===m||(m==='spread'&&(x.market==='runline'||x.market==='puckline'))||(m==='moneyline'&&x.market==='ml'))&&x.side===sd);
function parProj(s){if(!s)return null;const a=s.awayProj!=null?+s.awayProj:s.aR!=null?+s.aR:null,h=s.homeProj!=null?+s.homeProj:s.hR!=null?+s.hR:null;return a==null||h==null||!isFinite(a)||!isFinite(h)?null:{a,h};}
const parTable=(head,rows)=>`<div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="par-t"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
const parEV=(p,price)=>{const a=amerOk(price);if(p==null||a==null)return null;const d=a>0?a/100+1:100/(-a)+1;return(p*(d-1)-(1-p))*100;};
/* the players behind the projection: season average · last 5 (green hot / red cold) · last 10 */
function parPlayersHtml(sp,g){const K=PAR_KEYS[sp];if(!K||typeof pstTeam!=='function'||typeof pstForm!=='function')return'';
  const fmt=v=>v==null||!isFinite(v)?'—':v.toFixed(v<10?1:0);
  const side=ab=>{const P=pstTeam(sp,ab,sp==='nfl'||sp==='ncaaf'?6:8);if(!P.length)return`<div class="sub" style="font-size:10px;margin:4px 0">${parEsc(ab)}: no player logs yet — they fill in as box scores arrive.</div>`;
    const rows=P.map(x=>{const cells=K.map(([k])=>{const S=x.s[k];if(!S||!S.gp)return'<span style="color:var(--mute)">—</span>';const J=pstProj(sp,x.name,k);const mu=J?J.mu:S.sum/S.gp;const f5=pstForm(sp,x.name,k,5);
        const col=f5?(f5.avg>=mu*1.15&&f5.avg-mu>=0.3?'var(--win)':f5.avg<=mu*0.8&&mu-f5.avg>=0.3?'var(--rust)':'var(--mute)'):'';
        return`${fmt(mu)}${f5?`<span style="color:${col}"> · ${fmt(f5.avg)}</span>`:''}`;});
      const hk=K.find(([k])=>x.s[k]&&x.s[k].gp&&x.s[k].sum);const f10=hk?pstForm(sp,x.name,hk[0],10):null;
      return[`${parEsc(x.name)} <span style="color:var(--mute)">${x.n}G</span>`,...cells,f10?`${fmt(f10.avg)} <span style="color:var(--mute)">${hk[1]}</span>`:'—'];});
    return parTable([parEsc(ab),...K.map(k=>k[1]),'L10'],rows);};
  return`<div class="mktlab" style="margin-top:10px">Players — season avg · last 5 (green = hot, red = cold) · last 10</div>`+side(g.away.abbr)+side(g.home.abbr);}
/* A–G for any sport: A my line · B outside range · C vs the market · D my picks · E props · F props vs the market · G confidence */
function parAG(sp,g,s){const A=g.away.abbr,H=g.home.abbr,game=A+'@'+H;const P=parProj(s);if(!P)return'<div class="sub">No projection yet.</div>';const L=parLines(sp,g);const f=(m,sd)=>parF(L,m,sd);
  const pc=x=>Math.round(x*100)+'%';const dg=sp==='mlb'||sp==='nhl'?2:1;const unit=sp==='mlb'?'runs':sp==='nhl'?'goals':'pts';
  let J=null;try{J=brainJudge(g,s,sp);}catch(e){}let pred=null;try{pred=predFor(sp,game);}catch(e){}
  const out=[];const hw=s.hw!=null?s.hw:null;
  out.push(`<b>A) My line:</b> ${A} ${P.a.toFixed(dg)} – ${P.h.toFixed(dg)} ${H} · margin ${H} ${parSgn(+(P.h-P.a).toFixed(1))} · total ${(P.a+P.h).toFixed(dg)} ${unit}${hw!=null?` · ${H} ${pc(hw)} to win`:''}`);
  const rng=[['Model',P.a,P.h]];if(J)rng.push(['Judge',J.a,J.h]);if(pred)rng.push(['Prediction',+pred.a,+pred.h]);
  out.push(`<b>B) Outside range:</b> ${rng.map(([n,a,h])=>`${n} ${(+a).toFixed(dg)}–${(+h).toFixed(dg)}`).join(' · ')}${rng.length>1?` → ${H} margin ${Math.min(...rng.map(x=>x[2]-x[1])).toFixed(1)} to ${Math.max(...rng.map(x=>x[2]-x[1])).toFixed(1)}`:''}`);
  const cand=[],cm=[];const imp0=pr=>{const a=amerOk(pr);return a==null?null:(a>0?100/(a+100):-a/(-a+100));};
  const mA=f('moneyline','away'),mH=f('moneyline','home');if(mA&&mH&&hw!=null){cand.push({lab:`${A} ML`,p:1-hw,price:mA.price},{lab:`${H} ML`,p:hw,price:mH.price});const ka=imp0(mA.price),kh=imp0(mH.price);if(ka&&kh)cm.push(`moneyline: book ${H} ${pc(kh/(ka+kh))} vs my ${pc(hw)}`);}
  const sA=f('spread','away'),sH=f('spread','home');if(sA&&sH&&typeof s.homeCover==='function'){const ph=s.homeCover(+sH.line),pa=s.awayCover(+sA.line);cand.push({lab:`${A} ${parSgn(sA.line)}`,p:pa,price:sA.price},{lab:`${H} ${parSgn(sH.line)}`,p:ph,price:sH.price});
    cm.push(`spread ${H} ${parSgn(sH.line)}: I have ${H} covering ${pc(ph)} (book ${pc(imp0(sH.price)||0.5)})`);}
  const oV=f('total','over'),uN=f('total','under');if(oV&&uN&&typeof s.over==='function'){const po=s.over(+oV.line);cand.push({lab:`Over ${oV.line}`,p:po,price:oV.price},{lab:`Under ${uN.line}`,p:typeof s.under==='function'?s.under(+uN.line):1-po,price:uN.price});
    cm.push(`total ${oV.line} vs my ${(P.a+P.h).toFixed(dg)} → <b>${P.a+P.h>+oV.line?'Over':'Under'}</b> (${pc(Math.max(po,1-po))})`);}
  out.push(`<b>C) Vs the market:</b> ${cm.join(' · ')||'no book line yet'}`);
  const best=cand.map(x=>({...x,ev:parEV(x.p,x.price)})).filter(x=>x.ev!=null&&isFinite(x.ev)).sort((a,b)=>b.ev-a.ev).slice(0,2);
  out.push(`<b>D) My picks:</b> ${best.length?best.map(x=>`${parEsc(x.lab)} (${parSgn(amerOk(x.price))}) ${pc(x.p)} · ${x.ev>=0?'+':''}${x.ev.toFixed(1)}% EV`).join(' · '):'no line to price'}`);
  let pr=[];try{pr=propLikely(sp,60).filter(x=>x.team===A||x.team===H).slice(0,4);}catch(e){}
  out.push(`<b>E) Props:</b> ${pr.length?pr.map(x=>{let f5=null;try{f5=pstForm(sp,x.player,x.k,5);}catch(e){}return`${parEsc(x.player)} ${x.thr}+ ${x.k} ${pc(x.p)}${f5?` (L5 ${f5.avg.toFixed(1)})`:''}`;}).join(' · '):'no player logs yet'}`);
  let pb=[];try{pb=propBoard(sp,game).slice(0,3);}catch(e){}
  out.push(`<b>F) Props vs the market:</b> ${pb.length?pb.map(x=>`${parEsc(x.player)} ${x.thr} ${parEsc(x.stat)} → model ${pc(x.pOver>=0.5?x.pOver:1-x.pOver)} ${x.pOver>=0.5?'over':'under'}`).join(' · '):'no prop lines uploaded'}`);
  let cf=null,who=[];try{pickConfIdx().forEach((o,k)=>{if(k.startsWith(sp+'|'+game+'|')&&o.n&&(cf==null||o.cf>cf)){cf=o.cf;who=o.who;}});}catch(e){}
  out.push(`<b>G) Confidence:</b> ${g.pre||g.preseason?'preseason — tracked for learning, never official':cf!=null?`<span style="color:var(--win)">${pc(cf)} — official</span> (${who.map(v=>parEsc(String(charName(v)).replace(/^The /,''))).join(', ')})`:'nothing on this game clears the 70% rule'}`);
  return`<div class="sub" style="line-height:1.75">${out.join('<br>')}</div>`;}
/* after the final: what the model, the book and the characters said — and what happened */
function parPostGame(sp,g,s,opt){opt=opt||{};const A=g.away.abbr,H=g.home.abbr,game=A+'@'+H;const a=+g.awayScore,h=+g.homeScore;if(!isFinite(a)||!isFinite(h)||g.awayScore==null||g.awayScore==='')return'<div class="empty">No final score yet.</div>';
  const P=parProj(s);const L=parLines(sp,g);const f=(m,sd)=>parF(L,m,sd);const dg=sp==='mlb'||sp==='nhl'?1:0;const row=(lab,ok,det)=>`<div class="par-row"><div><div class="g">${lab}</div><div class="p">${det||''}</div></div><div class="r" style="color:${ok===true?'var(--win)':ok===false?'var(--rust)':'var(--mute)'}">${ok===true?'✓ HIT':ok===false?'✗ MISS':'—'}</div></div>`;
  const out=[];const W=h>a?H:a>h?A:null;
  if(P){const mw=P.h>=P.a?H:A;out.push(row(`Model winner: ${mw}`,W?mw===W:null,`model ${P.a.toFixed(dg)}–${P.h.toFixed(dg)} · actual ${a}–${h} · margin off by ${Math.abs((P.h-P.a)-(h-a)).toFixed(1)}`));
    out.push(row(`Model total: ${(P.a+P.h).toFixed(dg)}`,null,`actual ${a+h} · off by ${Math.abs(P.a+P.h-(a+h)).toFixed(1)}`));}
  const mH=f('moneyline','home'),mA=f('moneyline','away');if(mH&&mA){const fav=amerOk(mH.price)<amerOk(mA.price)?H:A;out.push(row(`Book favorite: ${fav} (${parSgn(amerOk(fav===H?mH.price:mA.price))})`,W?fav===W:null,''));}
  const sH=f('spread','home');if(sH&&sH.line!=null){const m=(h-a)+(+sH.line);out.push(row(`Spread: ${H} ${parSgn(sH.line)}`,m===0?null:m>0,m===0?'push':`${m>0?H:A} covered by ${Math.abs(m).toFixed(1)}`));}
  const oV=f('total','over');if(oV&&oV.line!=null){const t=a+h;out.push(row(`Total ${oV.line}`,null,t===+oV.line?'push':`went ${t>+oV.line?'OVER':'UNDER'} (${t})`+(P?` · model said ${P.a+P.h>+oV.line?'Over':'Under'} — ${(P.a+P.h>+oV.line)===(t>+oV.line)?'right':'wrong'}`:'')));}
  /* every character's call on this game, graded */
  let V=[];try{const d=String(g.__date||tdDay(g.start||g.date||g.gameDate||'')||today()).slice(0,10);V=(roGet(VOICES_KEY,[],30e3)||[]).filter(x=>x.sp===sp&&x.game===game&&String(x.date).slice(0,10)===d&&CHARS[x.voice]);}catch(e){}
  const vc=V.length?`<div class="mktlab" style="margin-top:8px">The characters on this game</div>`+V.sort((x,y)=>(isOfficial(y)?1:0)-(isOfficial(x)?1:0)).map(x=>{const res=x.graded?(x.push?'push':x.hit?'✓':'✗'):'…';
      return`<div class="mono" style="font-size:10.5px;padding:2px 0;color:${x.graded&&!x.push?(x.hit?'var(--win)':'var(--rust)'):'var(--mute)'}">${res} ${parEsc(String(charName(x.voice)).replace(/^The /,''))}: ${parEsc(charPickText(x))}${isOfficial(x)?' <span style="color:var(--gold)">· official '+confPct(confOf(x))+'</span>':''}</div>`;}).join(''):'';
  if(opt.charsOnly)return vc;
  return`<div class="par-post"><div class="mktlab">Post-game breakdown</div>${out.join('')}${vc}</div>`;}
/* MLB's projected box: runs by inning (↔ periods / quarters / halves elsewhere), F5, hits, the players */
const MLB_INN=[0.12,0.10875,0.10875,0.10875,0.10875,0.11125,0.11125,0.11125,0.11125];
function mlbProjBoxHtml(g,s){const P=parProj(s);if(!P)return'<div class="empty">No projection yet — it needs both lineups.</div>';const A=g.away.abbr,H=g.home.abbr;
  let J=null;try{J=brainJudge(g,s,'mlb');}catch(e){}const hits=J&&J.box&&J.box.away?[J.box.away.hits,J.box.home.hits]:[null,null];
  const row=(ab,r,hh)=>[`<b>${parEsc(ab)}</b>`,...MLB_INN.map(f=>(r*f).toFixed(2)),`<b>${(r*0.555).toFixed(1)}</b>`,`<b>${r.toFixed(1)}</b>`,hh!=null?hh:'—'];
  return`<div class="sub">Projected runs by inning — the 1st inning runs a little hot (top of the order), F5 = innings 1–5.${J?` Judge ${A} ${J.final[0]}–${J.final[1]} ${H}.`:''}</div>`+
    parTable(['',1,2,3,4,5,6,7,8,9,'F5','R','H≈'],[row(A,P.a,hits[0]),row(H,P.h,hits[1])])+parPlayersHtml('mlb',g);}
/* the shared table look */
/* ── §20 · ROSTERS — every sport, one panel (v2.36) ─────────────────────────────────────────
   Straight from ESPN's team roster (the one team endpoint a phone can read): who's on it, who's hurt, each player's
   key numbers (projection · last 5) and the line our model gives him 70%+ on. Opening it loads the top players'
   game logs in the background and redraws when they land. */
const ROS_KEYS={nba:['pts','reb','ast','fg3'],ncaab:['pts','reb','ast','fg3'],nhl:['g','a','s'],mlb:['h','tb','hr','k'],nfl:['py','ry','rec','wy','td'],ncaaf:['py','ry','rec','wy','td']};
const ROS_LAB={pts:'PTS',reb:'REB',ast:'AST',fg3:'3PM',g:'G',a:'A',s:'SOG',h:'H',tb:'TB',hr:'HR',k:'K',py:'Pass',ry:'Rush',rec:'Rec',wy:'RecYd',td:'TD'};
const ROS_GRP={nfl:p=>p==='QB'?'Quarterbacks':/^(RB|FB)$/.test(p)?'Running backs':p==='WR'?'Receivers':p==='TE'?'Tight ends':'Kickers',
  nhl:p=>p==='D'?'Defense':p==='G'?'Goalies':'Forwards',mlb:p=>/P$/.test(p)?'Pitchers':'Hitters',nba:p=>/C/.test(p)?'Bigs':/F/.test(p)?'Forwards':'Guards'};
ROS_GRP.ncaaf=ROS_GRP.nfl;ROS_GRP.ncaab=ROS_GRP.nba;
const rosEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
function rosInjChip(s){if(!s)return'';const c=rsOut(s)?'var(--rust)':/question|day|probable/i.test(s)?'var(--gold)':'var(--mute)';return` <span class="mono ros-inj" style="color:${c};border-color:${c}">${rosEsc(s)}</span>`;}
/* his best 70%+ line in the model (the Sim read) — the same ladder the characters call from */
function rosSweet(sp,name){try{const L=(typeof LIKELY_LADDER!=='undefined'&&LIKELY_LADDER[sp])||{};let out=null;
    Object.entries(L).forEach(([k,ths])=>{let b=null;ths.forEach(t=>{const r=pstProb(sp,name,k,t,'over');if(r&&r.proj.n>=5&&r.p>=0.70)b={k,t,p:r.p};});if(b&&(!out||b.p>out.p))out=b;});return out;}catch(e){return null;}}
function rosRow(sp,a){const K=ROS_KEYS[sp]||[];const pit=sp==='mlb'&&/P$/.test(a.pos);const keys=sp==='mlb'?(pit?['k','ha','er']:['h','tb','hr']):K;
  const cells=keys.map(k=>{const J=pstProj(sp,a.name,k);if(!J||!J.n||(!J.mean&&!J.ema))return'';const f=pstForm(sp,a.name,k,5);const d=v=>v.toFixed(v<10?1:0);
    return`<span>${(ROS_LAB[k]||k.toUpperCase())} <b>${d(J.mu)}</b>${f?`<i> L5 ${d(f.avg)}</i>`:''}</span>`;}).filter(Boolean);
  const sw=rsOut(a.inj)?null:rosSweet(sp,a.name);const n=(()=>{try{const P=pstDb(sp).p[pstId(a.name)];return P?P.n||0:0;}catch(e){return 0;}})();
  return`<div class="ros-row${rsOut(a.inj)?' out':''}"><div class="ros-nm">${a.jer?`<span class="ros-j">#${rosEsc(a.jer)}</span> `:''}<b>${rosEsc(a.name)}</b> <span class="ros-pos">${rosEsc(a.pos)}</span>${rosInjChip(a.inj)}</div>
    ${cells.length?`<div class="ros-st">${cells.join('')}<span class="ros-gp">${n}G</span></div>`:''}${sw?`<div class="ros-sw">🎯 ${sw.t}+ ${rosEsc(ROS_LAB[sw.k]||sw.k)} · <b>${Math.round(sw.p*100)}%</b></div>`:''}</div>`;}
async function rosterPanelHtml(sp,g){const side=async t=>{let R=[];try{R=await rsRoster(sp,t.abbr,t.tid||null);}catch(e){}
    if(!R.length)return`<div class="ros-team"><div class="sub"><b>${rosEsc(t.abbr)}</b> · roster unavailable right now — try again in a minute</div></div>`;
    const grp=ROS_GRP[sp]||(()=>'Roster');const pri=rsPriority(sp,R);const seen=new Set(pri.map(a=>a.id));const order=pri.concat(R.filter(a=>!seen.has(a.id)));const G={};
    order.forEach(a=>{(G[grp(a.pos)]=G[grp(a.pos)]||[]).push(a);});const outN=R.filter(a=>rsOut(a.inj)).length;
    return`<div class="ros-team"><div class="ros-hd"><b>${rosEsc(t.abbr)}</b> · ${R.length} players${outN?` · <span style="color:var(--rust)">${outN} out</span>`:''}</div>
      ${Object.entries(G).map(([k,arr])=>`<div class="ros-grp">${rosEsc(k)}</div>${arr.slice(0,sp==='nfl'||sp==='ncaaf'?7:16).map(a=>rosRow(sp,a)).join('')}`).join('')}</div>`;};
  const [a,h]=await Promise.all([side(g.away),side(g.home)]);return`<div class="ros-wrap">${a}${h}</div>`;}
/* the panel: draw now, load the top players' logs, redraw once they're in */
let ROS_SEQ=0;
async function rosterPanel(sp,g){const id='ros'+(++ROS_SEQ);const html=await rosterPanelHtml(sp,g);
  setTimeout(async()=>{let n=0;try{RS_EXTRA=Math.min(240,(RS_EXTRA||0)+40);n=(await rsLoadTeam(sp,g.away.abbr,8,g.away.tid||null))+(await rsLoadTeam(sp,g.home.abbr,8,g.home.tid||null));}catch(e){}
    const el=document.getElementById(id);if(!el)return;try{if(n>0)el.innerHTML=await rosterPanelHtml(sp,g);}catch(e){}
    const st=document.getElementById(id+'s');if(st)st.textContent=n>0?`Updated — ${n} games of history just loaded.`:'Numbers are current (each player refreshes once a day).';},30);
  return`<div id="${id}">${html}</div><div class="sub mono" id="${id}s" style="font-size:9.5px;margin-top:6px">Loading each starter's game log…</div>`;}

try{if(typeof document!=='undefined'&&!document.getElementById('parCss')){const st=document.createElement('style');st.id='parCss';
  st.textContent=`.par-t{width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:10px;margin:4px 0}.par-t th{text-align:left;color:var(--mute);padding:3px 4px;border-bottom:1px solid var(--rule);white-space:nowrap;font-weight:600}
.par-t td{padding:3px 4px;border-bottom:1px solid var(--rule);white-space:nowrap}.par-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--rule)}
.par-row .g{font-weight:700;font-size:12.5px}.par-row .p{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--mute)}.par-row .r{font-weight:800;font-size:11px;white-space:nowrap}`;
  (document.head||document.documentElement).appendChild(st);}}catch(e){}
function parVerdictHtml(sp,g,s){let v=null;try{v=takeFadeVerdict(g,s,sp)}catch(e){}if(!v)return'<div class="sub">No take/fade read yet.</div>';
  return`<div class="sub"><b>${parEsc(v.verdict)}</b>${!(v.reasons||[]).length?' — no strong take or fade signals on this game.':''}</div>`+(v.reasons||[]).map(x=>`<div class="sub">• ${parEsc(typeof x==='string'?x:(x.text||''))}</div>`).join('');}

/* ── 19 · GAMECAST FOR BASKETBALL + HOCKEY (v2.33) ─────────────────────────────
   Football has the field and baseball the diamond; basketball now gets the court
   and hockey the rink — with the current run, the momentum of the last ten
   scores, the score by period, and shots on goal in hockey. Everything is read
   from ESPN's play-by-play scores, so it never guesses. */
function gcScoring(j,T){const P=((j&&j.plays)||[]).filter(p=>p&&p.awayScore!=null&&p.homeScore!=null);const out=[];let pa=0,ph=0;
  P.forEach(p=>{const a=+p.awayScore,h=+p.homeScore;if(!isFinite(a)||!isFinite(h))return;if(a>pa||h>ph){const side=a-pa>=h-ph?'away':'home';const pts=side==='away'?a-pa:h-ph;
      out.push({side,pts,a,h,text:p.text||'',per:(p.period||{}).number||0,clk:(p.clock||{}).displayValue||''});}pa=Math.max(pa,a);ph=Math.max(ph,h);});
  return out;}
function gcRun(S){if(!S.length)return null;const last=S[S.length-1].side;let pts=0,n=0;for(let i=S.length-1;i>=0;i--){if(S[i].side!==last)break;pts+=S[i].pts;n++;}return{side:last,pts,n};}
function gcCourtSvg(a,h,run,sp){const W=940,H=500;const col=c=>c||'#445';const side=(left)=>{const x0=left?0:W,s=left?1:-1,bx=x0+s*52.5;
    return`<rect x="${left?0:W-190}" y="170" width="190" height="160" fill="${col(left?a.color:h.color)}" opacity=".55"/>
    <circle cx="${x0+s*190}" cy="250" r="60" fill="none" stroke="#fff" stroke-width="4"/>
    <path d="M${x0},30 L${x0+s*140},30 A237.5,237.5 0 0,${left?1:0} ${x0+s*140},470 L${x0},470" fill="none" stroke="#fff" stroke-width="4"/>
    <line x1="${x0+s*40}" y1="220" x2="${x0+s*40}" y2="280" stroke="#fff" stroke-width="6"/><circle cx="${bx}" cy="250" r="9" fill="none" stroke="#ff7a1a" stroke-width="4"/>
    <text x="${x0+s*120}" y="150" font-size="36" font-weight="900" fill="#fff" stroke="rgba(0,0,0,.45)" stroke-width="7" paint-order="stroke" text-anchor="middle" font-family="Archivo,Inter,sans-serif">${parEsc(left?a.abbr:h.abbr)}</text>`;};
  const banner=run&&run.pts>=6?`<g><rect x="${run.side==='away'?80:530}" y="360" width="330" height="80" rx="16" fill="${col(run.side==='away'?a.color:h.color)}" stroke="#fff" stroke-width="3" opacity=".95"/>
    <text x="${run.side==='away'?245:695}" y="412" font-size="36" font-weight="900" fill="#fff" text-anchor="middle" font-family="Archivo,Inter,sans-serif">${parEsc(run.side==='away'?a.abbr:h.abbr)} ${run.pts}-0 RUN</text></g>`:'';
  return`<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;border-radius:10px;border:2px solid #8a5a2b" role="img" aria-label="court">
    <defs><linearGradient id="gcWood" x1="0" x2="1"><stop offset="0" stop-color="#d4a26a"/><stop offset=".5" stop-color="#c9935a"/><stop offset="1" stop-color="#d4a26a"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#gcWood)"/>${Array.from({length:12},(_,i)=>`<line x1="0" y1="${i*42}" x2="${W}" y2="${i*42}" stroke="rgba(120,70,30,.18)" stroke-width="2"/>`).join('')}
    <rect x="3" y="3" width="${W-6}" height="${H-6}" fill="none" stroke="#fff" stroke-width="5"/><line x1="470" y1="0" x2="470" y2="${H}" stroke="#fff" stroke-width="4"/><circle cx="470" cy="250" r="60" fill="none" stroke="#fff" stroke-width="4"/>
    ${side(true)}${side(false)}${banner}</svg>`;}
function gcRinkSvg(a,h,run){const W=1000,H=425;const col=c=>c||'#445';
  const circ=(x,y)=>`<circle cx="${x}" cy="${y}" r="70" fill="none" stroke="#d33" stroke-width="4"/><circle cx="${x}" cy="${y}" r="6" fill="#d33"/>`;
  const end=(left)=>{const gx=left?60:W-60;return`<line x1="${gx}" y1="40" x2="${gx}" y2="${H-40}" stroke="#d33" stroke-width="4"/><path d="M${gx},180 A45,45 0 0,${left?1:0} ${gx},245" fill="rgba(80,150,230,.35)" stroke="#d33" stroke-width="3"/>
    <rect x="${left?gx-22:gx}" y="192" width="22" height="41" fill="none" stroke="#333" stroke-width="3"/>
    <text x="${left?150:W-150}" y="222" font-size="34" font-weight="900" fill="${col(left?a.color:h.color)}" opacity=".85" text-anchor="middle" dominant-baseline="central" font-family="Archivo,Inter,sans-serif">${parEsc(left?a.abbr:h.abbr)}</text>`;};
  const banner=run&&run.n>=2?`<g><rect x="${run.side==='away'?60:520}" y="20" width="420" height="70" rx="14" fill="${col(run.side==='away'?a.color:h.color)}" opacity=".92"/>
    <text x="${run.side==='away'?270:730}" y="64" font-size="30" font-weight="900" fill="#fff" text-anchor="middle" font-family="Archivo,Inter,sans-serif">${parEsc(run.side==='away'?a.abbr:h.abbr)} · ${run.n} UNANSWERED</text></g>`:'';
  return`<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block" role="img" aria-label="rink">
    <rect x="4" y="4" width="${W-8}" height="${H-8}" rx="150" fill="#eef5fa" stroke="#9fb3c4" stroke-width="8"/>
    <line x1="500" y1="10" x2="500" y2="${H-10}" stroke="#d33" stroke-width="8"/><line x1="335" y1="10" x2="335" y2="${H-10}" stroke="#2b5fd9" stroke-width="12"/><line x1="665" y1="10" x2="665" y2="${H-10}" stroke="#2b5fd9" stroke-width="12"/>
    <circle cx="500" cy="212" r="70" fill="none" stroke="#2b5fd9" stroke-width="4"/><circle cx="500" cy="212" r="7" fill="#2b5fd9"/>
    ${circ(190,105)}${circ(190,320)}${circ(810,105)}${circ(810,320)}${end(true)}${end(false)}${banner}</svg>`;}
function gcPulse(sp,j,T,G){const a=T.away||{},h=T.home||{};const S=gcScoring(j,T);const run=gcRun(S);const hockey=sp==='nhl';
  const surf=hockey?gcRinkSvg(a,h,run):gcCourtSvg(a,h,run,sp);
  /* the last ten scores, oldest → newest */
  const last=S.slice(-10);const mom=last.length?`<div style="display:flex;gap:3px;align-items:flex-end;height:${hockey?18:34}px;margin:6px 0 2px">${last.map(x=>`<div title="${parEsc(x.text)}" style="flex:1;height:${hockey?100:Math.min(100,34*x.pts)}%;min-height:6px;border-radius:3px;border:1px solid rgba(255,255,255,.28);box-sizing:border-box;background:${(x.side==='away'?a.color:h.color)||'var(--gold)'}"></div>`).join('')}</div>
    <div class="mono" style="display:flex;justify-content:space-between;font-size:9.5px;color:var(--mute)"><span>last ${last.length} ${hockey?'goals':'scores'} →</span><span>${run?`${parEsc(run.side==='away'?a.abbr:h.abbr)} ${hockey?(run.n+' straight'):(run.pts+'-0 run')}`:''}</span></div>`:'';
  /* score by period */
  const c=(((j||{}).header||{}).competitions||[])[0]||{};const cs=c.competitors||[];const A=cs.find(x=>x.homeAway==='away')||{},Hh=cs.find(x=>x.homeAway==='home')||{};
  const la=(A.linescores||[]).map(x=>x.displayValue!=null?x.displayValue:x.value),lh=(Hh.linescores||[]).map(x=>x.displayValue!=null?x.displayValue:x.value);const np=Math.max(la.length,lh.length);
  const lab=i=>hockey?(i<3?'P'+(i+1):i===3?'OT':'SO'):sp==='ncaab'?(i<2?(i?'2H':'1H'):'OT'):(i<4?'Q'+(i+1):'OT'+(i>4?i-3:''));
  const per=np?parTable(['',...Array.from({length:np},(_,i)=>lab(i)),'T'],[[parEsc(a.abbr),...la,`<b>${parEsc(a.score)}</b>`],[parEsc(h.abbr),...lh,`<b>${parEsc(h.score)}</b>`]]):'';
  /* hockey: shots on goal from the box */
  let sog='';if(hockey){try{const bt=((j.boxscore||{}).teams)||[];const v=t=>{const s=(t.statistics||[]).find(x=>/^(shotsTotal|shots)$/i.test(x.name||'')||/^(SOG|S)$/i.test(x.abbreviation||x.label||''));return s?(s.displayValue||s.value):null;};
      const sa=bt.find(t=>String((t.team||{}).id)===a.id),sh=bt.find(t=>String((t.team||{}).id)===h.id);if(sa&&sh&&v(sa)!=null)sog=`<div class="mono" style="font-size:11px;margin-top:4px">Shots on goal · <b>${parEsc(a.abbr)} ${parEsc(v(sa))}</b> – <b>${parEsc(v(sh))} ${parEsc(h.abbr)}</b></div>`;}catch(e){}}
  const lp=S.length?S[S.length-1]:null;const lpH=lp&&G.state==='in'?`<div style="font-size:12px;padding:6px 8px;border-left:3px solid ${(lp.side==='away'?a.color:h.color)||'var(--gold)'};margin:6px 0;background:rgba(255,255,255,.03)">${hockey?'🚨 ':'🏀 '}${parEsc(lp.text)}${lp.clk?` <span class="mono" style="color:var(--mute);font-size:10px">${hockey?'P':sp==='ncaab'?'H':'Q'}${lp.per} · ${parEsc(lp.clk)}</span>`:''}</div>`:'';
  return`<div class="gcpulse" style="margin:8px 0">${surf}${mom}${lpH}${sog}${per}</div>`;}
/* one row per pick on Today, every character that backs it inside its proven lane listed together */
function strengthGroups(plays){const M=new Map();(plays||[]).forEach(o=>{const c=o.c;const k=c.sp+'|'+c.game+'|'+c.market+'|'+c.side;let g=M.get(k);if(!g){g={k,c,cf:o.cf,who:[]};M.set(k,g);}
    g.who.push(o);if(o.cf>g.cf){g.cf=o.cf;g.c=c;}});return[...M.values()].sort((a,b)=>b.cf*b.who.length-a.cf*a.who.length||b.cf-a.cf);}
function strengthGroupRow(g){const c=g.c;const pick=charPickText(c);const inSlip=SLIP.some(x=>x.game===c.game&&x.pick===pick);let ex=0;try{ex=deskExposure({sp:c.sp,game:c.game,m:c.market,sd:c.side});}catch(e){}
  const who=g.who.map(o=>{const C=CHARS[o.c.voice]||{};return`<b style="color:${C.color}">${txtEsc(charName(o.c.voice).replace(/^The /,''))}</b> <b style="color:${recColor(o.lane.p,o.lane.n)}">${o.lane.w}-${o.lane.l}</b>`;}).join(' · ');
  return`<div class="str-row"><div style="flex:1;min-width:0"><b>${txtEsc(pick)}</b> <span class="mono" style="color:var(--gold);font-size:11px">${sgnP(c.price)}</span> <span class="cf-chip on" style="color:${recColor(g.cf,9)};border-color:${recColor(g.cf,9)}">${Math.round(g.cf*100)}%</span>
      <div class="mono" style="font-size:9.5px;color:var(--mute)">${(SP_LAB[c.sp]||'').split(' ')[0]} ${txtEsc(gameLabel(c.sp,c.game))} · ${who} on ${CONF_SP_LAB[c.sp]} ${({ml:'ML',spread:'ATS',total:'O/U'})[c.market]}${ex?` · on ${ex} ticket${ex===1?'':'s'}`:''}</div></div>
    <button class="${inSlip?'primary':''}" onclick="deskSlipAdd('${c.sp}','${esc(c.game)}','${esc(pick)}',${c.price!=null?+c.price:'null'},${(+g.cf).toFixed(3)},'${String(c.date).slice(0,10)}')">${inSlip?'✓ on slip':'＋ slip'}</button></div>`;}

/* ══ v2.41 · REOPEN A FROZEN DAY ════════════════════════════════════════════
   A day frozen on bad inputs (Saturday's CFB card priced off Thursday's lines,
   with a sim that rated Ohio State as Ohio) can be reopened from outside the
   phone: a d4.reopen {d, ts, why} arrives by sync, and the first page that sees
   it clears that day's frozen state — the freeze, the eval locks, the Best 3,
   the Today card's unstarted picks, the Banker, the plan and the character
   parlays — then re-runs the master evaluation on its own. Started games keep
   their picks. Each reopen runs once (by ts); a day that already went out on
   Telegram is never reopened. */
const REOPEN_KEY='d4.reopen',REOPEN_DONE='d4.reopendone';
function deskReopenCheck(){let R=null;try{R=get(REOPEN_KEY,null);}catch(e){}if(!R||!R.d||R.d!==today()||!R.ts)return false;
  const done=+(String(localStorage.getItem(REOPEN_DONE)||'0').replace(/"/g,''))||0;if(done>=+R.ts)return false;
  localStorage.setItem(REOPEN_DONE,String(R.ts));const d=R.d;
  try{const P=get('d4.tgposts',{})||{};if(P[d]&&(P[d].ids||[]).length)return false;}catch(e){}   /* already posted: never reopen */
  try{const F=get(FREEZE_KEY,null);if(F&&F.d===d)set(FREEZE_KEY,{d:null,ts:Date.now(),why:'reopened · '+(R.why||'')});}catch(e){}
  try{const L=get(EVAL_LOCK_KEY,{})||{};if(L.date===d)set(EVAL_LOCK_KEY,{});}catch(e){}
  try{const E=get(LS_EVAL,{})||{};if(E.date===d)set(LS_EVAL,{});}catch(e){}
  try{const S=get(BEST5_KEY,{})||{};if(S.d===d)set(BEST5_KEY,{d,locked:false});}catch(e){}
  try{const T=get(TC_KEY,{})||{};if(T.d===d){Object.values(T.by||{}).forEach(B=>{B.picks=(B.picks||[]).filter(x=>best5Started(x));});delete T.frozen;set(TC_KEY,T);}}catch(e){}
  try{const B=get(BKDAY_KEY,{})||{};if(B.d===d)set(BKDAY_KEY,{});}catch(e){}
  try{const P=get(DESK_KEY,{})||{};if(P.d===d)set(DESK_KEY,{});}catch(e){}
  /* date-keyed stores merge by union across devices, so the day is overwritten with an
     unlocked marker rather than deleted (a deletion would come back from the other copy) */
  [CPAR_KEY,CPX_KEY].forEach(k=>{try{const M=get(k,{})||{};if(M[d]){M[d]={locked:false,reopened:+R.ts};set(k,M);}}catch(e){}});
  try{const L=get('d4.best5log',{})||{};if(L[d]){L[d]={picks:[],reopened:+R.ts};set('d4.best5log',L);}}catch(e){}
  try{DESK_MEM=null;CPAR_MEM=null;CPX_MEM=null;}catch(e){}
  return true;}
let DESK_REOPEN_RUN=false;
function deskReopenRun(){if(DESK_REOPEN_RUN||DESK_BG_EVAL||(typeof BG_MODE!=='undefined'&&BG_MODE))return false;if(!deskReopenCheck())return false;DESK_REOPEN_RUN=true;
  try{deskToast('🔁 Today was reopened — re-running the master evaluation…',4000);}catch(e){}
  const t0=Date.now();const iv=setInterval(()=>{const sp=window.__PAGE_SPORT__||ACTIVE_SPORT;let ready=false;try{ready=(sportGames(sp)||[]).length>0;}catch(e){}
    if(!ready&&Date.now()-t0<45000)return;clearInterval(iv);try{const r=masterEvalAll();if(r&&r.catch)r.catch(e=>console.warn('reopen eval',e));}catch(e){console.warn('reopen eval',e);}},1500);
  return true;}
if(typeof window!=='undefined'&&!window.__NO_REOPEN__)setTimeout(()=>{try{deskReopenRun();}catch(e){}},2500);
