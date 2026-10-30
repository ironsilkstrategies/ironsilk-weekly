/* ═══ GENERATIONS (v2.45) — every character is a bloodline ═══════════════════════════════
   Loaded on every sport page after desk-voice.js.

   §1 · A WORLDVIEW OF ITS OWN. Every character's confidence used to start from the same number
        (half the Sim, half the market). A worldview starts from the character's OWN read — the
        Commissioner's power line, the Scout's talent edge, the Scorekeeper's most likely score,
        the Judge's weighed witnesses — calibrated on its own record, with the market as the
        reality check (how far it may stray is a weight it earns), plus its BELIEFS: each
        situation it believes in (rest, travel, talent, the series…) carries a weight that starts
        from its persona and moves only with results, and fades if the results stop coming.
   §2 · HEIRS IN THE SHADOWS. Each character × market keeps a champion (the confidence that is
        official) and heirs — the same bloodline with one belief changed. Every heir reads every
        game, walk-forward (each day predicted only from the days before it), graded like
        everyone, never posted.
   §3 · THE GENERATION BOOK. An heir takes the chair only when it beat its parent on games it was
        never tuned on — born after the heir, 150+ of them, over at least two weeks — by a margin
        that rises with every heir tried (try enough heirs and one looks brilliant by luck), and
        its official picks didn't make less money. A clearly worse heir retires; a new one is born
        so two are always in the shadows. The parent retires to the family tree with its record.
   §4 · THE FAMILY TREE: chapters of the season, heirlooms (beliefs that have paid), scars (lanes
        blocked by losses, and whether they're healing), every generation and why it changed. */

const HEIR_KEY='d4.heirs',HEIR_BORN='2026-10-18',HEIR_MIN_N=150,HEIR_MIN_DAYS=14,HEIR_BAR=2.0;
const WV_SIG={nfl:13.5,ncaaf:16,nba:12,ncaab:10.5,nhl:2.3,mlb:4.2},WV_TSIG={nfl:13.5,ncaaf:16.5,nba:18,ncaab:15,nhl:2.3,mlb:4.4};
/* the season's chapters: early on, last year's ratings matter most; late, motivation does */
const WV_SEASON={nfl:[[9,1],[1,10],[1,11],[2,15]],ncaaf:[[8,20],[12,8],[12,9],[1,25]],nhl:[[10,1],[4,18],[4,19],[6,30]],nba:[[10,18],[4,14],[4,15],[6,25]],ncaab:[[11,1],[3,10],[3,11],[4,10]],mlb:[[3,20],[9,30],[10,1],[11,5]]};
const WV_CH_MEMO=new Map();
function wvChapter(sp,d){const k=sp+'|'+d;if(WV_CH_MEMO.has(k))return WV_CH_MEMO.get(k);const r=wvChapter0(sp,d);if(WV_CH_MEMO.size>4000)WV_CH_MEMO.clear();WV_CH_MEMO.set(k,r);return r;}
function wvChapter0(sp,d){try{const S=WV_SEASON[sp];if(!S)return null;const y=+d.slice(0,4),m=+d.slice(5,7),dd=+d.slice(8,10);const at=(mm,day,yy)=>Date.UTC(yy,mm-1,day);const t=Date.UTC(y,m-1,dd);
    const yr=m>=S[0][0]?y:y-1;const start=at(S[0][0],S[0][1],yr);const endY=S[1][0]<S[0][0]?yr+1:yr;const end=at(S[1][0],S[1][1],endY);const pe=at(S[3][0],S[3][1],S[3][0]<S[0][0]?yr+1:yr);
    if(t<start)return'off';if(t>end)return t<=pe?'post':'off';const f=(t-start)/(end-start);return f<0.2?'early':f<0.75?'mid':'late';}catch(e){return null;}}
const WV_CH_LAB={early:'the opening weeks',mid:'midseason',late:'the stretch run',post:'the postseason',off:'the offseason'};
/* the character's own read of its side, from its own inputs */
function wvFromScore(x,a,h,sm,st){let p=null;
  if(x.market==='total'&&x.line!=null){const o=normCdf((a+h-(+x.line))/st);p=x.side==='over'?o:1-o;}
  else if(x.market==='spread'&&x.line!=null){const mg=(x.side==='home'?h-a:a-h)+(+x.line);p=normCdf(mg/sm);}
  else if(x.market==='ml'){const mg=x.side==='home'?h-a:a-h;p=normCdf(mg/sm);}
  return p!=null&&isFinite(p)?Math.max(0.05,Math.min(0.95,p)):null;}
function wvOwn(x){try{if(x.dP!=null&&isFinite(+x.dP))return+x.dP;if(x.simP!=null&&isFinite(+x.simP))return+x.simP;if(x.pP!=null&&isFinite(+x.pP))return+x.pP;if(x.sP!=null&&isFinite(+x.sP))return+x.sP;
    const sm=WV_SIG[x.sp]||12,st=WV_TSIG[x.sp]||14;
    /* the Judge: its weighed score and its own measured spread */
    if(x.ja!=null&&x.jh!=null&&isFinite(+x.ja)&&isFinite(+x.jh))return wvFromScore(x,+x.ja,+x.jh,+x.jsd>0?+x.jsd:sm,st);
    /* the Historian: the market, moved by the net lean of the trends (in points toward its side) */
    if(x.tlp!=null&&isFinite(+x.tlp)){const mk=wvMkt(x);if(mk!=null)return Math.max(0.05,Math.min(0.95,wvSg(wvLg(mk)+1.7*(+x.tlp)/(x.market==='total'?st:sm))));}
    const m=String(x.score||'').match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/);if(m)return wvFromScore(x,+m[1],+m[2],sm,st);}catch(e){}return null;}
/* the beliefs each character starts with (logit points; results move them from here) */
const WV_PRIOR={
  Coach:{restedge:0.15,oppb2b:0.10,b2b:-0.10,'3in4':-0.10,opp3in4:0.10,road3:-0.08,shortweek:-0.08,oppshort:0.08,offbye:0.05,hot5:0.05,cold5:-0.05,westearly:-0.06},
  Trends:{h2hedge:0.10,h2hfade:-0.10,pythunlucky:0.08,pythlucky:-0.08},
  Scout:{'talent+':0.15,'talent-':-0.15,'mismatch+':0.10,'mismatch-':-0.10,qbstar:0.10,qbbust:-0.10,oppqbstar:-0.10,oppqbbust:0.10,goaliestar:0.10,goaliebust:-0.10,oppgoaliestar:-0.10,oppgoaliebust:0.10},
  Power:{pythunlucky:0.05,pythlucky:-0.05,h2hedge:0.05,h2hfade:-0.05}};
const wvPrior=(H,v,t)=>{const s=String(t);return s.includes(':')?0:H.pri*(((WV_PRIOR[v]||{})[s])||0);};
const WV_BELIEF_LAB=k=>{const[t,sd]=String(k).split(':');const L=(typeof FAC_LAB!=='undefined'&&FAC_LAB[t])||({'ch':'chapter'}[t])||t;return sd?`${L} (${sd})`:L;};
/* the tags a call carries as beliefs: totals are side-signed (wind helps the under, not "the pick") */
function wvTags(x){const f=Array.isArray(x.f)?x.f:[];const out=[];const tot=x.market==='total';
  f.forEach(t=>{if(['fav','dog','home','road','over','under','bigfav','longdog'].includes(t))return;out.push(tot?t+':'+x.side:t);});
  const ch=wvChapter(x.sp,String(x.date||'').slice(0,10));if(ch&&ch!=='mid')out.push('ch:'+ch);return out;}
const WV_DEF={id:'wv1',a:0.6,b:0.4,pri:1,hl:45,lr:0.04,cal:40,lab:'its own read first, the market as the check'};
const WV_MUT=[['a',[0.35,0.85]],['b',[0.2,0.65]],['pri',[0,2]],['hl',[21,120]],['lr',[0.02,0.08]]];
const WV_MUT_LAB={a:'how much it trusts its own read',b:'how much it leans on the market',pri:'how strongly it holds its starting beliefs',hl:'how fast it forgets old results',lr:'how fast it learns'};
const wvLg=p=>Math.log(Math.max(1e-4,Math.min(1-1e-4,p))/(1-Math.max(1e-4,Math.min(1-1e-4,p))));
const wvSg=z=>1/(1+Math.exp(-z));
const wvMkt=x=>{const p=x.price!=null?amerOk(x.price):null;return p==null?null:Math.max(0.03,Math.min(0.97,imp(p)*0.955+0.0225));};
/* the worldview's opening number: its own read (calibrated) and the market; with no read of its own, the market at full weight */
const wvZ=(H,oc,mk)=>(oc!=null?H.a*wvLg(oc):0)+(mk!=null?(oc!=null?H.b:H.a+H.b)*wvLg(mk):0);
const wvBins=()=>CONF_EDGES.slice(0,-1).map((lo,i)=>({lo,hi:CONF_EDGES[i+1],w:0,n:0,s:0}));
/* walk-forward: every day is predicted only from the days before it; returns each call's
   prediction (graded and live) and the fitted state (beliefs, bias) for the family tree */
function wvRun(V,H){return genDrain(wvRunG(V,H));}
function* wvRunG(V,H){const rows=V.filter(x=>x&&CHARS[x.voice]&&['ml','spread','total'].includes(x.market)&&x.price!=null&&!x.pre&&!x.push&&(x.graded?x.hit!=null:true))
    .map(x=>({x,d:String(x.date||'').slice(0,10)})).filter(r=>r.d).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  const bias={},w={},cnt={},ownBins={},finBins={},pred=new Map();let lastD=null;const keep=Math.pow(0.5,1/Math.max(1,H.hl));
  const prior=(v,t)=>wvPrior(H,v,t);
  /* v2.80 · the bins only change after a whole day is read, so each cell's pooled bins are worked out once per day
     (they were re-pooled for every call — the bulk of a 5-second freeze on a phone). Same numbers. */
  let PAVC=new Map();const pav=B=>{let P=PAVC.get(B);if(!P){P=confPav(B);PAVC.set(B,P);}return P;};
  const cal=(B,raw,K)=>{if(!B)return raw;const P=pav(B);if(!P.length)return raw;const b=P.find(b=>raw>=b.lo&&raw<b.hi)||(raw<P[0].lo?P[0]:P[P.length-1]);return(b.w+K*raw)/(b.n+K);};
  let i=0;while(i<rows.length){yield;const d=rows[i].d,day=[];while(i<rows.length&&rows[i].d===d)day.push(rows[i++]);PAVC=new Map();
    if(lastD){const gap=Math.max(1,Math.round((Date.parse(d)-Date.parse(lastD))/864e5));const f=Math.pow(keep,gap);
      Object.keys(bias).forEach(k=>{bias[k]*=f;});Object.keys(w).forEach(k=>{const[v,,t]=k.split('|');const p0=prior(v,t);w[k]=p0+(w[k]-p0)*f;});}
    lastD=d;
    const feats=day.map(r=>{const x=r.x;const cell=x.voice+'|'+x.market,sc=x.voice+'|'+x.sp+'|'+x.market;const own=wvOwn(x),mk=wvMkt(x);const tags=wvTags(x);
      const oc=own!=null?cal(ownBins[cell],own,H.cal):null;
      let z=wvZ(H,oc,mk)+(bias[sc]||0);
      tags.forEach(t=>{const k=x.voice+'|'+x.sp+'|'+t;z+=(k in w?w[k]:prior(x.voice,t));});
      const raw=wvSg(z);const p=Math.max(0.02,Math.min(0.98,cal(finBins[cell],raw,H.cal)));pred.set(x.id,p);return{r,own,raw,p,tags,cell,sc};});
    feats.forEach(F=>{const x=F.r.x;if(!x.graded||x.hit==null)return;const y=x.hit?1:0;const err=y-F.raw;
      bias[F.sc]=(bias[F.sc]||0)+H.lr*err;F.tags.forEach(t=>{const k=x.voice+'|'+x.sp+'|'+t;w[k]=(k in w?w[k]:prior(x.voice,t))+H.lr*err;cnt[k]=(cnt[k]||0)+1;});
      if(F.own!=null){const B=ownBins[F.cell]||(ownBins[F.cell]=wvBins());const b=B.find(b=>F.own>=b.lo&&F.own<b.hi);if(b){b.w+=y;b.n++;b.s+=F.own;}}
      const B2=finBins[F.cell]||(finBins[F.cell]=wvBins());const b2=B2.find(b=>F.raw>=b.lo&&F.raw<b.hi);if(b2){b2.w+=y;b2.n++;b2.s+=F.raw;}});}
  return{pred,bias,w,cnt,ownBins,finBins,H,prior};}
/* one new call, read from a finished walk-forward (no re-run needed) */
function wvPredictOne(x,R){try{const H=R.H;const cell=x.voice+'|'+x.market,sc=x.voice+'|'+x.sp+'|'+x.market;const own=wvOwn(x),mk=wvMkt(x);
    const cal=(B,raw,K)=>{if(!B)return raw;const P=confPav(B);if(!P.length)return raw;const b=P.find(b=>raw>=b.lo&&raw<b.hi)||(raw<P[0].lo?P[0]:P[P.length-1]);return(b.w+K*raw)/(b.n+K);};
    const oc=own!=null?cal(R.ownBins[cell],own,H.cal):null;let z=wvZ(H,oc,mk)+(R.bias[sc]||0);
    wvTags(x).forEach(t=>{const k=x.voice+'|'+x.sp+'|'+t;z+=(k in R.w?R.w[k]:R.prior(x.voice,t));});return Math.max(0.02,Math.min(0.98,cal(R.finBins[cell],wvSg(z),H.cal)));}catch(e){return null;}}
/* how a predictor did on a set of graded calls: log loss, Brier, and the money its official picks made */
function wvScore(calls,P){const o={n:0,ll:0,br:0,on:0,ou:0,ow:0,d:[]};calls.forEach(x=>{const p=P(x);if(p==null||!(p>0&&p<1))return;const y=x.hit?1:0;const l=-(y?Math.log(p):Math.log(1-p));
    o.n++;o.ll+=l;o.br+=(p-y)*(p-y);o.d.push(l);let fl=0.7;try{fl=confFloorFor(x);}catch(e){}if(p>=fl-1e-9&&bkPriceOk(+x.price)){o.on++;o.ou+=+x.units||0;if(x.hit)o.ow++;}});
  o.mll=o.n?o.ll/o.n:null;return o;}
function wvPaired(calls,P1,P0){const D=[];calls.forEach(x=>{const p=P1(x),q=P0(x);if(p==null||q==null||!(p>0&&p<1)||!(q>0&&q<1))return;const y=x.hit?1:0;
    D.push((y?-Math.log(q):-Math.log(1-q))-(y?-Math.log(p):-Math.log(1-p)));});   /* + = the heir lost less */
  const n=D.length;if(!n)return{n:0,m:0,se:1,z:0};const m=D.reduce((a,b)=>a+b,0)/n;const v=n>1?D.reduce((a,b)=>a+(b-m)*(b-m),0)/(n-1):1;const se=Math.sqrt(v/n)||1e-9;return{n,m,se,z:m/se};}

/* ── the family registry: champions, heirs, history ── */
function heirsAll(){let H=get(HEIR_KEY,null);if(!H||H.v!==1)H={v:1,cells:{},tried:{}};return H;}
function heirCell(H,v,m){const k=v+'|'+m;let C=H.cells[k];if(!C){C=H.cells[k]={v,m,champ:{id:'base',lab:'the original confidence',since:null,gen:1},gen:1,heirs:[],hist:[]};}return C;}
function heirParams(id,C){if(id===WV_DEF.id)return WV_DEF;const h=(C.heirs||[]).find(x=>x.id===id);return h?h.p:null;}
/* every variation of a parent this bloodline has never tried: one belief changed first, then two
   (a change that means something for THIS character: no belief-strength heir for one with no
   starting beliefs, or for totals, where no starting belief applies), the order varied by cell so the chairs don't all test the same idea first */
const wvSig=p=>JSON.stringify(Object.keys(p).filter(k=>k!=='id'&&k!=='lab').sort().map(k=>[k,p[k]]));
function heirCandidates(C,base){const M=WV_MUT.filter(([f])=>f!=='pri'||(WV_PRIOR[C.v]&&C.m!=='total'));let hs=0;for(const ch of C.v+'|'+C.m)hs=(hs*31+ch.charCodeAt(0))>>>0;
  const one=[],two=[];M.forEach(([f,vals])=>vals.forEach(v=>{if(base[f]!==v)one.push([[f,v]]);}));
  for(let i=0;i<M.length;i++)for(let j=i+1;j<M.length;j++)M[i][1].forEach(v1=>M[j][1].forEach(v2=>{if(base[M[i][0]]!==v1&&base[M[j][0]]!==v2)two.push([[M[i][0],v1],[M[j][0],v2]]);}));
  const rot=L=>L.length?L.slice(hs%L.length).concat(L.slice(0,hs%L.length)):L;return rot(one).concat(rot(two));}
function heirSeen(C){const S=new Set((C.heirs||[]).map(h=>wvSig(h.p||{})));if(C.champ&&C.champ.p)S.add(wvSig(C.champ.p));return S;}
function heirRoom(C){const base=C.champ.id==='base'?WV_DEF:(heirParams(C.champ.id,C)||WV_DEF);if(C.champ.id==='base'&&!(C.heirs||[]).some(h=>h.id===WV_DEF.id))return true;
  const seen=heirSeen(C);return heirCandidates(C,base).some(ch=>{const p={...base};ch.forEach(([f,v])=>p[f]=v);return!seen.has(wvSig(p));});}
/* a new heir: the champion's (or the worldview's) params with one belief changed */
function heirSpawn(C,H,d,why){const base=C.champ.id==='base'?WV_DEF:(heirParams(C.champ.id,C)||WV_DEF);
  if(!(C.heirs||[]).some(h=>h.id===WV_DEF.id)&&C.champ.id==='base'){H.tried[C.v+'|'+C.m]=(H.tried[C.v+'|'+C.m]||0)+1;const h={id:WV_DEF.id,p:{...WV_DEF},born:d,st:'shadow',lab:'the worldview: '+WV_DEF.lab,why:why||'the first heir'};C.heirs.push(h);return h;}
  const seen=heirSeen(C);
  for(const ch of heirCandidates(C,base)){const p={...base};ch.forEach(([f,v])=>p[f]=v);if(seen.has(wvSig(p)))continue;
    const tried=(H.tried[C.v+'|'+C.m]=(H.tried[C.v+'|'+C.m]||0)+1);
    p.id='wv'+ch.map(([f,v])=>f+String(v).replace('.','')).join('')+'-'+tried;
    const h={id:p.id,p,born:d,st:'shadow',lab:ch.map(([f,v])=>`${WV_MUT_LAB[f]}: ${base[f]} → ${v}`).join(', and '),why:why||'keeping two heirs in the shadows'};C.heirs.push(h);return h;}
  return null;}
/* a specific heir (the world changed: one that forgets fast and learns fast), if the bloodline hasn't tried it */
function heirSpawnWith(C,H,d,ch,why){const base=C.champ.id==='base'?WV_DEF:(heirParams(C.champ.id,C)||WV_DEF);const p={...base};ch.forEach(([f,v])=>p[f]=v);
  if(heirSeen(C).has(wvSig(p))||ch.every(([f,v])=>base[f]===v))return null;const tried=(H.tried[C.v+'|'+C.m]=(H.tried[C.v+'|'+C.m]||0)+1);
  p.id='wv'+ch.map(([f,v])=>f+String(v).replace('.','')).join('')+'-'+tried;
  const h={id:p.id,p,born:d,st:'shadow',lab:ch.map(([f,v])=>`${WV_MUT_LAB[f]}: ${base[f]} → ${v}`).join(', and '),why:why||'a specific idea'};C.heirs.push(h);return h;}
/* the immune caps the original confidence carries travel with every heir: a blocked lane or a blacklisted spot stays at 55% at most */
const heirCap=(p,x)=>{if(p==null)return null;const F=x&&x.cff;return Array.isArray(F)&&F.some(f=>/^(lane blocked|blacklisted)/.test(String(f)))?Math.min(p,0.55):p;};

/* ── THE GENERATION BOOK ── */
Object.assign(BOOK_ENDS,{KEEP:{ok:1,ico:'🌱',lab:'Keep watching — the heirs keep reading'},PROMOTE:{ok:1,ico:'👑',lab:'The heir takes the chair'},
  RETIRE:{ok:1,ico:'🪦',lab:'The heir retires — a new one is born'},SPAWN:{ok:1,ico:'🐣',lab:'A new heir is born into the shadows'}});
bookDefine({id:'generation',title:'Generations — when an heir takes the chair',start:'heirs',
  pages:{
    heirs:{q:'Are two heirs reading in the shadows?',to:['SPAWN','enough'],ask:c=>c.heirs<2&&c.room?['SPAWN',`${c.heirs} heir${c.heirs===1?'':'s'} in the shadows — one more is born`]:['enough',c.heirs<2?'every variation of this bloodline has been tried':'two heirs are reading']},
    enough:{q:'Has the best heir read 150+ games it was never tuned on, over two weeks?',to:['KEEP','better'],ask:c=>!c.heirs?['KEEP','no heir left to judge — the champion keeps the chair']:c.n<HEIR_MIN_N||c.days<HEIR_MIN_DAYS?['KEEP',`${c.n} unseen games over ${c.days} days — not enough to judge`]:['better',`${c.n} unseen games`]},
    better:{q:'Did it beat its parent by more than luck allows?',to:['money','worse'],ask:c=>c.z>=c.bar?['money',`${c.z.toFixed(1)}σ better, past the ${c.bar.toFixed(1)}σ bar (${c.tried} heir${c.tried===1?'':'s'} tried)`]:['worse',`${c.z.toFixed(1)}σ — short of the ${c.bar.toFixed(1)}σ bar`]},
    money:{q:'Did its official picks make at least as much money?',to:['PROMOTE','KEEP'],ask:c=>c.du>=-1?['PROMOTE',`its official picks made ${c.du>=0?'+':''}${c.du.toFixed(1)}u against its parent's`]:['KEEP',`better calls, but its official picks made ${c.du.toFixed(1)}u less — not yet`]},
    worse:{q:'Is it clearly worse than its parent?',to:['RETIRE','KEEP'],ask:c=>c.z<=-2?['RETIRE',`${c.z.toFixed(1)}σ worse on ${c.n} unseen games`]:['KEEP','neither better nor worse yet']}},
  vars:{heirs:[0,1,2],room:[true,false],n:[50,200],days:[5,20],z:[-3,0,2.2,3],bar:[2,2.5],tried:[1,3],du:[-3,0,2]}});
function heirRules(c,R){const e=R.end;if(e==='PROMOTE'&&!(c.heirs>=1&&(c.heirs>=2||!c.room)&&c.n>=HEIR_MIN_N&&c.days>=HEIR_MIN_DAYS&&c.z>=c.bar&&c.du>=-1))return'promoted without clearing every bar';
  if(e==='RETIRE'&&!(c.z<=-2&&c.n>=HEIR_MIN_N&&c.days>=HEIR_MIN_DAYS))return'retired without enough evidence';
  if(e==='SPAWN'&&!(c.room&&c.heirs<2))return'promised a new heir with no room for one';
  if((e==='PROMOTE'||e==='RETIRE')&&!c.heirs)return'judged an heir that does not exist';return null;}
/* the daily pass: rerun every heir walk-forward, judge each cell, record what changed */
let HEIR_MEMO=null,WV_MEMO={};
function wvRunMemo(p,force){const sig=JSON.stringify(p);const o=WV_MEMO[sig];const d=today();if(!force&&o&&o.d===d&&Date.now()-o.ts<30*60e3)return o.R;
  const R=wvRun(roGet(VOICES_KEY,[],30e3)||[],p);WV_MEMO[sig]={d,ts:Date.now(),R};return R;}
/* v2.80 · the walk-forwards run sliced (the screen breathes between days); then the judging reads them from memory */
async function heirsRunAsync(force){if(typeof SAFE_MODE!=='undefined'&&SAFE_MODE)return heirsRun(false);const d=today();
  if(!force&&HEIR_MEMO&&HEIR_MEMO.d===d&&Date.now()-HEIR_MEMO.ts<30*60e3)return HEIR_MEMO;
  const V=roGet(VOICES_KEY,[],30e3)||[];const H=heirsAll();
  /* the same births heirsRun would do, first — so every walk-forward it needs is already in memory */
  {const seen=new Set();V.forEach(x=>{if(x&&CHARS[x.voice]&&['ml','spread','total'].includes(x.market))seen.add(x.voice+'|'+x.market);});let born=0;
    seen.forEach(k=>{const[v,m]=k.split('|');const C=heirCell(H,v,m);const first=!(C.heirs||[]).length;
      while((C.heirs||[]).filter(h=>h.st==='shadow').length<2){if(!heirSpawn(C,H,first||HEIR_BORN>d?HEIR_BORN:d,first?'the first generation of heirs':'keeping two heirs in the shadows'))break;born++;}});
    if(born)set(HEIR_KEY,H);}
  const P=new Map();P.set(JSON.stringify(WV_DEF),WV_DEF);Object.values(H.cells).forEach(C=>(C.heirs||[]).forEach(h=>{if(h.st!=='retired'&&h.p)P.set(JSON.stringify(h.p),h.p);}));
  for(const[sig,p]of P){const o=WV_MEMO[sig];if(!force&&o&&o.d===d&&Date.now()-o.ts<30*60e3)continue;const R=await genSlice(wvRunG(V,p));WV_MEMO[sig]={d,ts:Date.now(),R};}
  await deskIdle();return heirsRun(false);}
function heirsRun(force){const d=today();if(SAFE_MODE&&!force)return HEIR_MEMO||{d,ts:Date.now(),cells:{},runs:{}};if(!force&&HEIR_MEMO&&HEIR_MEMO.d===d&&Date.now()-HEIR_MEMO.ts<30*60e3)return HEIR_MEMO;
  const V=roGet(VOICES_KEY,[],30e3)||[];const H=heirsAll();const cellsSeen=new Set();
  V.forEach(x=>{if(x&&CHARS[x.voice]&&['ml','spread','total'].includes(x.market))cellsSeen.add(x.voice+'|'+x.market);});
  /* the first generation's definitions were fixed in the build before Oct 18, so every game from
     Oct 18 on is one they were never tuned on — wherever and whenever a device first runs them */
  cellsSeen.forEach(k=>{const[v,m]=k.split('|');const C=heirCell(H,v,m);const first=!(C.heirs||[]).length;
    while((C.heirs||[]).filter(h=>h.st==='shadow').length<2){if(!heirSpawn(C,H,first||HEIR_BORN>d?HEIR_BORN:d,first?'the first generation of heirs':'keeping two heirs in the shadows'))break;}});
  /* one walk-forward per distinct heir parameter set */
  const P={},runs={};Object.values(H.cells).forEach(C=>(C.heirs||[]).forEach(h=>{if(h.st==='retired')return;const sig=JSON.stringify(h.p);if(!runs[sig])runs[sig]=wvRunMemo(h.p,force);P[C.v+'|'+C.m+'|'+h.id]=runs[sig];}));
  if(!runs[JSON.stringify(WV_DEF)])runs[JSON.stringify(WV_DEF)]=wvRunMemo(WV_DEF,force);
  const graded=V.filter(x=>x&&x.graded&&x.hit!=null&&!x.push&&x.price!=null&&CHARS[x.voice]);const out={d,ts:Date.now(),cells:{},runs};let changed=false;
  Object.values(H.cells).forEach(C=>{const calls=graded.filter(x=>x.voice===C.v&&x.market===C.m);const champP=x=>confOf(x);const res={heirs:[]};
    (C.heirs||[]).filter(h=>h.st==='shadow'||h.st==='champion').forEach(h=>{const R=P[C.v+'|'+C.m+'|'+h.id];if(!R)return;const hp=x=>heirCap(R.pred.get(x.id),x);
      const post=calls.filter(x=>String(x.date).slice(0,10)>=h.born),pre=calls.filter(x=>String(x.date).slice(0,10)<h.born);
      const pz=wvPaired(post,hp,champP),hz=wvPaired(pre,hp,champP);const sH=wvScore(post,hp),sC=wvScore(post,champP);
      res.heirs.push({id:h.id,lab:h.lab,born:h.born,st:h.st,n:pz.n,z:+pz.z.toFixed(2),dll:+pz.m.toFixed(4),hist:{n:hz.n,z:+hz.z.toFixed(2),dll:+hz.m.toFixed(4)},
        off:{n:sH.on,w:sH.ow,u:+sH.ou.toFixed(2)},offC:{n:sC.on,w:sC.ow,u:+sC.ou.toFixed(2)},days:Math.max(0,Math.round((Date.parse(d)-Date.parse(h.born))/864e5))});});
    /* the Generation Book, on the strongest heir */
    const shadow=res.heirs.filter(h=>h.st==='shadow').sort((a,b)=>b.z-a.z);const best=shadow[0];const tried=H.tried[C.v+'|'+C.m]||1;
    const ctx={heirs:shadow.length,room:heirRoom(C),n:best?best.n:0,days:best?best.days:0,z:best?best.z:0,bar:HEIR_BAR+0.5*Math.log2(Math.max(1,tried)),tried,du:best?best.off.u-best.offC.u:0};
    const R=bookWalkSync(BOOKS.generation,ctx,null);res.book={end:R.end,why:R.why,path:R.path.map(s=>s.p+'>'+s.to).join(' '),steps:R.path.map(s=>({p:s.p,to:s.to,why:s.why||''}))};res.ctx=ctx;res.best=best?best.id:null;
    if(R.end==='PROMOTE'&&best&&d>=HEIR_BORN){const h=C.heirs.find(x=>x.id===best.id&&x.st==='shadow');const old=C.champ;C.hist.push({gen:C.gen,champ:old.id,lab:old.lab,from:old.since,to:d,why:`retired — ${h.lab} beat it: ${R.why}`});
      C.gen++;C.champ={id:h.id,lab:h.lab,since:dayShift(d,1),gen:C.gen,p:h.p};h.st='champion';C.heirs.filter(x=>x.st==='champion'&&x.id!==h.id).forEach(x=>x.st='retired');changed=true;
      journalAdd({kind:'generation',sig:'gen-promote',v:C.v,sev:'info',title:`👑 ${charName(C.v)}, ${({ml:'moneylines',spread:'spreads',total:'totals'})[C.m]}: Generation ${C.gen} takes the chair`,
        what:`${h.lab} — ${R.why}; ${best.n} games it was never tuned on, ${best.z.toFixed(1)}σ better. Its official picks: ${best.off.w}-${best.off.n-best.off.w}, ${best.off.u>=0?'+':''}${best.off.u.toFixed(1)}u. Takes over from ${dayShift(d,1)}.`});
      heirSpawn(C,H,dayShift(d,1),'born when its parent took the chair');}
    else if(R.end==='RETIRE'&&best){const h=C.heirs.find(x=>x.id===best.id&&x.st==='shadow');h.st='retired';h.retired=d;h.why2=R.why;changed=true;
      journalAdd({kind:'generation',sig:'gen-retire',v:C.v,sev:'info',title:`🪦 ${charName(C.v)}: an heir retires`,what:`${h.lab} — ${R.why}. A new heir is born in its place.`});heirSpawn(C,H,d,'born when an heir retired');}
    else if(R.end==='SPAWN'){changed=true;}
    out.cells[C.v+'|'+C.m]=res;});
  set(HEIR_KEY,H);HEIR_MEMO=out;return out;}
/* a call's confidence under its cell's champion: the original, or a promoted heir from its day on */
const heirsRO=()=>{const H=roGet(HEIR_KEY,null,10e3);return H&&H.v===1&&H.cells?H:null;};
function heirChampPred(x){try{const H=heirsRO();const C=H&&H.cells[x.voice+'|'+x.market];if(!C||C.champ.id==='base'||!C.champ.since||String(x.date).slice(0,10)<C.champ.since)return null;
    const run=wvRunMemo(C.champ.p||heirParams(C.champ.id,C)||WV_DEF);const p=run.pred.get(x.id);return p!=null?heirCap(p,x):heirCap(wvPredictOne(x,run),x);}catch(e){return null;}}
/* when an heir holds the chair, the calls it stamps carry its confidence (the original kept beside it) */
if(typeof confStamp==='function'&&typeof window!=='undefined'&&!window.__HEIR_CS__){window.__HEIR_CS__=1;const CS0=confStamp;
  confStamp=function(calls){CS0(calls);try{const H=heirsRO();if(!H||!Object.values(H.cells).some(C=>C.champ&&C.champ.id!=='base'))return;
      (calls||[]).forEach(c=>{if(!CHARS[c.voice]||c.cf==null)return;const C=H.cells[c.voice+'|'+c.market];if(!C||C.champ.id==='base'||String(c.date).slice(0,10)<C.champ.since)return;
        const run=wvRunMemo(C.champ.p||heirParams(C.champ.id,C)||WV_DEF);let p=run.pred.get(c.id);if(p==null)p=wvPredictOne(c,run);p=heirCap(p,c);
        if(p!=null&&isFinite(p)){c.cfo=c.cf;c.cf=+(+p).toFixed(4);c.cfg=C.gen;}});}catch(e){console.warn('heir stamp',e);}};}
try{if(typeof AP_STEPS!=='undefined'&&!AP_STEPS.some(s=>s[0]==='heirs')){const i=AP_STEPS.findIndex(s=>s[0]==='status');
  AP_STEPS.splice(i>=0?i+1:AP_STEPS.length,0,['heirs','Generations','Every heir re-reads every game walk-forward; the Generation Book decides who holds each chair.',()=>heirsRunAsync().then(R=>Object.keys(R.cells||{}).length)]);}}catch(e){}   /* memoized (30 min): never slows the master evaluation */

/* ── sync: the newer copy no longer simply wins the whole family ── */
function heirMerge(a,b){if(!a||a.v!==1)return b||a;if(!b||b.v!==1)return a;const out={...b,...a,v:1,cells:{},tried:{}};   /* any other field: the newer copy's */
  new Set([...Object.keys(a.cells||{}),...Object.keys(b.cells||{})]).forEach(k=>{const A=(a.cells||{})[k],B=(b.cells||{})[k];if(!A||!B){out.cells[k]=A||B;return;}
    const W=(B.gen||1)>(A.gen||1)?B:A,L=W===A?B:A;const ids=new Set((W.heirs||[]).map(h=>h.id));
    out.cells[k]={...W,heirs:[...(W.heirs||[]),...(L.heirs||[]).filter(h=>!ids.has(h.id)&&h.st!=='champion')]};});
  new Set([...Object.keys(a.tried||{}),...Object.keys(b.tried||{})]).forEach(k=>{out.tried[k]=Math.max((a.tried||{})[k]||0,(b.tried||{})[k]||0);});return out;}
if(typeof syncMergeVal==='function'&&typeof window!=='undefined'&&!window.__HEIR_SYNC__){window.__HEIR_SYNC__=1;const SMV0=syncMergeVal;
  syncMergeVal=function(k,L,R,tomb){if(k===HEIR_KEY&&L&&R){try{const N=L.t>=R.t?L:R,O=N===L?R:L;return heirMerge(N.v,O.v);}catch(e){}}return SMV0.apply(this,arguments);};}

/* ── §4 · the family tree ── */
/* one pass over the ledger for every character's beliefs and recent calls (the family tree renders 13 cards) */
let HB_MEMO=null;
function heirLedgerMap(){if(HB_MEMO&&Date.now()-HB_MEMO.ts<60e3&&HB_MEMO.d===today())return HB_MEMO;const V=roGet(VOICES_KEY,[],30e3)||[];const B={},Rc={};const from=dayShift(today(),-21);
  V.forEach(x=>{if(!x||!CHARS[x.voice]||!x.graded||x.hit==null||x.push)return;if(String(x.date).slice(0,10)>=from)(Rc[x.voice]=Rc[x.voice]||[]).push(x);const p=confOf(x);if(p==null)return;
    const by=B[x.voice]||(B[x.voice]={});wvTags(x).forEach(t=>{const k=x.sp+'|'+t;const o=by[k]||(by[k]={n:0,w:0,e:0,var:0});o.n++;if(x.hit)o.w++;o.e+=p;o.var+=p*(1-p);});});
  HB_MEMO={ts:Date.now(),d:today(),B,Rc};return HB_MEMO;}
function heirBeliefs(v,R){const out=[];try{const by=heirLedgerMap().B[v]||{};
    Object.entries(by).forEach(([k,o])=>{if(o.n<12)return;const z=(o.w-o.e)/Math.sqrt(Math.max(1e-9,o.var));const[sp,t]=k.split('|');out.push({sp,t,lab:WV_BELIEF_LAB(t),n:o.n,w:o.w,z,wt:R&&R.w?R.w[v+'|'+sp+'|'+t]:null});});}catch(e){}
  return{heirlooms:out.filter(o=>o.z>=2&&o.n>=30).sort((a,b)=>b.z-a.z).slice(0,4),paying:out.filter(o=>o.z>=1).sort((a,b)=>b.z-a.z).slice(0,4),costing:out.filter(o=>o.z<=-1.5).sort((a,b)=>a.z-b.z).slice(0,4)};}
function heirScars(v){const out=[];try{const T=laneTable();const L=T.BYV[v]||{};const Rv=heirLedgerMap().Rc[v]||[];
    Object.entries(L).forEach(([k,o])=>{if(o.st!=='blocked')return;let w=0,n=0;Rv.forEach(x=>{if(laneKey(x.sp,x.market,x.side,x.price,x.line)!==k)return;n++;if(x.hit)w++;});
      out.push({k,lab:typeof vxLane==='function'?vxLane(k):k,w:o.w,l:o.n-o.w,u:o.u,rw:w,rl:n-w,healing:n>=8&&w/n>=0.58});});}catch(e){}return out;}
function familyHtml(){let R=null;if(!HEIR_MEMO||HEIR_MEMO.d!==today()){heirsRunAsync().then(()=>{try{if(REC_VIEW==='family')renderRecordsHub();}catch(e){}}).catch(()=>{});return`<div class="tkt"><div class="sub">🧬 Reading the bloodlines… (a few seconds)</div></div>`;}try{R=heirsRun();}catch(e){return`<div class="tkt"><div class="sub">${txtEsc(e.message)}</div></div>`;}const H=heirsAll();const d=today();const ch={};['nfl','ncaaf','nhl','nba','ncaab','mlb'].forEach(sp=>{const c=wvChapter(sp,d);if(c&&c!=='off')ch[sp]=c;});
  const card=v=>{const C=CHARS[v]||{};const cells=['ml','spread','total'].map(m=>H.cells[v+'|'+m]).filter(Boolean);if(!cells.length)return'';const run=R.runs[JSON.stringify(WV_DEF)];const B=heirBeliefs(v,run);const S=heirScars(v);
    const rows=cells.map(c=>{const r=R.cells[c.v+'|'+c.m]||{heirs:[]};const mk=({ml:'Moneylines',spread:'Spreads',total:'Totals'})[c.m];
      return`<div class="fm-cell"><div><b>${mk}</b> · <span class="mono">Gen ${c.gen}</span> — ${txtEsc(c.champ.lab)}${c.champ.since?` <span class="mono" style="color:var(--mute)">since ${txtEsc(c.champ.since)}</span>`:''}</div>
        ${r.heirs.filter(h=>h.st==='shadow').map(h=>`<div class="mono fm-heir">🌘 ${txtEsc(h.lab)} · born ${txtEsc(h.born)} · ${h.n?`${h.n} unseen games, ${h.z>=0?'+':''}${h.z}σ vs its parent`:'no unseen games graded yet'}${h.hist.n?` · history says ${h.hist.z>=0?'+':''}${h.hist.z}σ over ${h.hist.n}`:''}${h.off.n?` · its official picks ${h.off.w}-${h.off.n-h.off.w}, ${h.off.u>=0?'+':''}${h.off.u}u`:''}</div>`).join('')}
        ${r.book?`<div class="mono fm-book">${(BOOK_ENDS[r.book.end]||{}).ico||''} ${txtEsc(r.book.why)}</div>`:''}
        ${(c.hist||[]).length?`<div class="mono fm-hist">${c.hist.map(x=>`Gen ${x.gen}: ${txtEsc(x.lab)} (${txtEsc(x.from||'the start')} → ${txtEsc(x.to)}) — ${txtEsc(x.why)}`).join('<br>')}</div>`:''}</div>`;}).join('');
    return`<details class="tkt fm-card" style="border-left:3px solid ${C.color}"><summary><b style="color:${C.color}">${txtEsc(charName(v))}</b> <span class="mono" style="font-size:10px;color:var(--mute)">${cells.map(c=>'Gen '+c.gen).join(' · ')}</span></summary>${rows}
      ${B.heirlooms.length?`<div class="mktlab">💎 Heirlooms — beliefs that have paid over and over</div>${B.heirlooms.map(o=>`<div class="mono fm-b">${txtEsc(vxSp(o.sp))}: ${txtEsc(o.lab)} — ${o.w}-${o.n-o.w}, ${o.z.toFixed(1)}σ above what it expected</div>`).join('')}`:''}
      ${B.paying.length&&!B.heirlooms.length?`<div class="mktlab">🌱 Beliefs starting to pay</div>${B.paying.map(o=>`<div class="mono fm-b">${txtEsc(vxSp(o.sp))}: ${txtEsc(o.lab)} — ${o.w}-${o.n-o.w} (${o.n} games)${o.n<30?' · still small':''}</div>`).join('')}`:''}
      ${B.costing.length?`<div class="mktlab">⚠️ Beliefs costing it</div>${B.costing.map(o=>`<div class="mono fm-b">${txtEsc(vxSp(o.sp))}: ${txtEsc(o.lab)} — ${o.w}-${o.n-o.w}, ${o.z.toFixed(1)}σ under${o.n<30?' · still small':''}</div>`).join('')}`:''}
      ${S.length?`<div class="mktlab">🩹 Scars — lanes its losses blocked</div>${S.map(o=>`<div class="mono fm-b">${txtEsc(o.lab)} — ${o.w}-${o.l} (${o.u>=0?'+':''}${o.u.toFixed(1)}u) · last 3 weeks ${o.rw}-${o.rl}${o.healing?' · <span style="color:var(--win)">healing</span>':''}</div>`).join('')}`:''}</details>`;};
  return`<div class="tkt hi"><h3>🧬 Generations</h3><div class="sub" style="font-size:10.5px">Every character is a bloodline. The champion's confidence is the one that counts; its heirs — the same character with one belief changed — read every game in the shadows. An heir takes the chair only after beating its parent on 150+ games it was never tuned on, by more than luck allows, without its official picks making less money.</div>
    <div class="mono" style="font-size:10px;margin-top:4px">Chapters now: ${Object.entries(ch).map(([sp,c])=>`${txtEsc(vxSp(sp))} — ${WV_CH_LAB[c]}`).join(' · ')||'—'}</div></div>
    ${CHAR_ORDER.map(card).join('')}${bookPagesHtml(BOOKS.generation)}`;}
if(typeof recViewBar==='function'&&typeof window!=='undefined'&&!window.__HEIR_VIEW__){window.__HEIR_VIEW__=1;const RVB1=recViewBar;
  recViewBar=function(){const h=RVB1();return h.replace('</div>',`<button class="${REC_VIEW==='family'?'on':''}" onclick="REC_VIEW='family';renderRecordsHub()">🧬 Generations</button></div>`);};
  if(typeof renderRecordsHub==='function'){const RRH1=renderRecordsHub;renderRecordsHub=function(){const el=document.getElementById('recordsHub');
    if(el&&REC_VIEW==='family'){try{const gv=document.getElementById('v-grades');if(gv)gv.classList.add('rec-clean');}catch(e){}try{el.innerHTML=recViewBar()+familyHtml();}catch(e){el.innerHTML=recViewBar()+'<div class="tkt"><div class="sub">'+txtEsc(e.message)+'</div></div>';}return;}
    return RRH1();};}}
const HEIR_CSS=`.fm-cell{padding:6px 0;border-top:1px solid var(--rule);font-size:11.5px}.fm-heir,.fm-book,.fm-hist,.fm-b{font-size:9.5px;color:var(--mute);margin-top:2px}.fm-book{color:var(--chalk)}`;
if(typeof window!=='undefined'&&!window.__HEIR_BOOT__){window.__HEIR_BOOT__=1;window.addEventListener('load',()=>{try{if(!document.getElementById('heirCss')){const st=document.createElement('style');st.id='heirCss';st.textContent=HEIR_CSS;document.head.appendChild(st);}}catch(e){}});}
