/* ═══ MASTER CALIBRATION (v2.88.0) ═══════════════════════════════════════════════════════════════════════════════════
   Loaded on every sport page after desk-feeds.js.

   Nov 7: "how can we create a master calibration that tightens up more per week… our current calibration is modest and
   conservative… tighten the notch with the data we've stacked."

   The old calibration nudges each character's % toward 50 in fixed steps (cfw: "ncaaf ml road -0.1"), the same for every
   sport, never sharper than the evidence of one lane. This one learns from every graded call how often a stated chance
   actually came true, and by how much it changes when the characters agree:

   §1 · THE STACK. Every graded call becomes one compact row per leg (a side, a total, a player threshold), with what was
        known before the game: the price, who backed it, who was on the other side, how sure they were. The rows outlive the
        ledger (150 days; the ledger keeps ~a month), so the evidence keeps stacking week after week.
   §2 · THE FIT. Logistic models, refit once a week (or on demand), recency-weighted (a call 4 weeks old counts half):
        · sides & totals — anchored on the market's no-vig chance (no evidence = the market, exactly), plus what the
          characters' edge, their agreement, the opposition, the sport and each character have actually added;
        · player props — the characters' stated chance and how many of the five clear the threshold, per sport, then per
          stat inside the sport, each level shrunk toward the one above it (thin stats borrow from their sport).
   §3 · THE PROOF. Before it's trusted, every refit is tested on the last 7 days it didn't see: Brier, the calibration gap,
        and what its 70%+ calls really hit, against the raw numbers. Each week's result is kept, so "it tightens every
        week" is a number you can read, not a promise.
   §4 · USE. mcalTeam() / mcalProp() give the calibrated chance of any leg — the Perfect SGPs build only from these. */

const MCAL_KEY='d4.mcal',MCAL_ROWS='d4.mcalrows',MCAL_KEEP=150,MCAL_HL=28,MCAL_EVERY=7*864e5,MCAL_V=1;
const MCAL_SPS=['nfl','ncaaf','nhl','nba','ncaab','mlb'];
const mcLogit=p=>{p=Math.min(0.995,Math.max(0.005,+p));return Math.log(p/(1-p));};
const mcSig=z=>1/(1+Math.exp(-Math.max(-30,Math.min(30,z))));
/* the market's chance without the house's cut (a two-way market carries ~4.5%) */
function mcNoVig(price,mk){if(price==null||!isFinite(+price)||Math.abs(+price)<100)return null;const a=+price;const q=a>0?100/(a+100):(-a)/((-a)+100);
  return Math.min(0.98,Math.max(0.02,q/(mk==='ml'?1.04:1.045)));}

/* §1 · rows ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
/* sides & totals: one row per leg — who backed it, who opposed it, the price, the outcome */
function mcalTeamRows(V,graded){const legs={},byGM={};
  (V||[]).forEach(x=>{if(!x||!['ml','spread','total'].includes(x.market))return;if(graded&&(!x.graded||x.hit==null))return;if(!graded&&x.graded)return;
    const k=[x.sp,x.date,x.game,x.market,x.side,x.line==null?'':x.line].join('|');
    const L=legs[k]||(legs[k]={sp:x.sp,d:x.date,game:x.game,mk:x.market,side:x.side,line:x.line,price:x.price,v:{},y:x.hit==null?null:x.hit?1:0});
    const p=x.cf!=null?x.cf:x.pUsed!=null?x.pUsed:x.simP;L.v[x.voice]=p!=null?+p:null;if(L.price==null&&x.price!=null)L.price=x.price;
    const g=x.sp+'|'+x.date+'|'+x.game+'|'+x.market;(byGM[g]=byGM[g]||new Set()).add(k);});
  const out=[];Object.entries(legs).forEach(([k,L])=>{const q=mcNoVig(L.price,L.mk);if(q==null)return;
    const opp=new Set();(byGM[L.sp+'|'+L.d+'|'+L.game+'|'+L.mk]||[]).forEach(k2=>{if(k2!==k&&legs[k2].side!==L.side)Object.keys(legs[k2].v).forEach(v=>opp.add(v));});
    const ps=Object.values(L.v).filter(p=>p!=null&&p>0&&p<1);const e=ps.length?ps.reduce((a,p)=>a+mcLogit(p),0)/ps.length-mcLogit(q):0;
    out.push({key:'s|'+k,t:'s',sp:L.sp,d:L.d,game:L.game,mk:L.mk,side:L.side,line:L.line,price:L.price,q:+q.toFixed(4),n:Object.keys(L.v).length,no:opp.size,e:+e.toFixed(4),v:Object.keys(L.v).sort().join(','),y:L.y});});
  return out;}
/* player props: one row per player × stat × threshold — the characters at that threshold (their %) and how many of them
   cleared it (a character whose own best line is higher clears every lower one) */
function mcalPropRows(P,graded){const G={};
  (P||[]).forEach(x=>{if(!x||x.p==null||!x.player||(x.mv||1)<2)return;if(graded&&x.hit==null)return;if(!graded&&x.hit!=null)return;
    const g=[x.sp,x.d,x.player,x.k].join('|');(G[g]=G[g]||[]).push(x);});
  const out=[];Object.entries(G).forEach(([g,xs])=>{[...new Set(xs.map(x=>+x.thr))].forEach(T=>{const at=xs.filter(x=>+x.thr===T);
    const nge=new Set(xs.filter(x=>+x.thr>=T).map(x=>x.voice)).size;const pm=at.reduce((a,x)=>a+mcLogit(x.p),0)/at.length;
    const y=at[0].hit==null?null:at[0].hit?1:0;
    out.push({key:'p|'+g+'|'+T,t:'p',sp:at[0].sp,d:at[0].d,player:at[0].player,team:at[0].team,k:at[0].k,thr:T,pm:+mcSig(pm).toFixed(4),nge,v:at.map(x=>x.voice).sort().join(','),y});});});
  return out;}
/* fold the newly graded legs into the stack — never counted twice; older than 150 days let go */
function mcalStack(){const S=get(MCAL_ROWS,null)||{v:MCAL_V,rows:{}};const R=S.rows||{};let add=0;
  const put=r=>{if(r.y==null)return;if(!R[r.key])add++;const o={...r};delete o.key;R[r.key]=o;};
  try{mcalTeamRows(roGet(VOICES_KEY,[],30e3)||[],true).forEach(put);}catch(e){console.warn('mcal team rows',e);}
  try{mcalPropRows(roGet(typeof CPROP_KEY!=='undefined'?CPROP_KEY:'d4.charprops',[],30e3)||[],true).forEach(put);}catch(e){console.warn('mcal prop rows',e);}
  const cut=dayShift(today(),-MCAL_KEEP);Object.keys(R).forEach(k=>{if(String(R[k].d||'')<cut)delete R[k];});
  set(MCAL_ROWS,{v:MCAL_V,ts:Date.now(),rows:R});return{add,n:Object.keys(R).length};}
function mcalRowList(){const S=get(MCAL_ROWS,null);return S&&S.rows?Object.entries(S.rows).map(([key,r])=>({key,...r})):[];}

/* §2 · the fit ──────────────────────────────────────────────────────────────────────────────────────────────────── */
/* ridge logistic regression around a prior (Newton steps): with no data it returns the prior exactly */
function mcSolve(A,b){const n=b.length;const M=A.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<n;c++){let piv=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[piv][c]))piv=r;[M[c],M[piv]]=[M[piv],M[c]];
    const d=M[c][c];if(Math.abs(d)<1e-12)continue;for(let r=0;r<n;r++){if(r===c)continue;const f=M[r][c]/d;if(!f)continue;for(let k=c;k<=n;k++)M[r][k]-=f*M[c][k];}}
  return M.map((r,i)=>Math.abs(r[i])<1e-12?0:r[n]/r[i]);}
function mcFitLR(X,y,w,mu,lam,iters){const m=mu.length;let b=mu.slice();
  for(let it=0;it<(iters||12);it++){const g=new Array(m).fill(0),H=Array.from({length:m},()=>new Array(m).fill(0));
    for(let i=0;i<X.length;i++){const x=X[i];let z=0;for(let j=0;j<m;j++)z+=b[j]*x[j];const p=mcSig(z),wi=w[i],r=wi*(p-y[i]),s=wi*p*(1-p);
      for(let j=0;j<m;j++){if(!x[j])continue;g[j]+=r*x[j];const sx=s*x[j];for(let k=j;k<m;k++)if(x[k])H[j][k]+=sx*x[k];}}
    for(let j=0;j<m;j++){for(let k=0;k<j;k++)H[j][k]=H[k][j];g[j]+=2*lam[j]*(b[j]-mu[j]);H[j][j]+=2*lam[j]+1e-9;}
    const st=mcSolve(H,g);let mx=0;for(let j=0;j<m;j++){b[j]-=st[j];mx=Math.max(mx,Math.abs(st[j]));}if(mx<1e-6)break;}
  return b;}
const mcW=(d,ref)=>Math.pow(0.5,Math.max(0,(Date.parse(ref+'T12:00:00Z')-Date.parse(String(d)+'T12:00:00Z'))/864e5)/MCAL_HL);
/* sides & totals — design: [1, market logit, characters' edge, log(1+backers), log(1+opposed), ml, total, sport…, character…] */
function mcTeamX(r,VO){const x=[1,mcLogit(r.q),r.e||0,Math.log(1+(r.n||0)),Math.log(1+(r.no||0)),r.mk==='ml'?1:0,r.mk==='total'?1:0];
  MCAL_SPS.forEach(s=>x.push(r.sp===s?1:0));const vs=new Set(String(r.v||'').split(','));VO.forEach(v=>x.push(vs.has(v)?1:0));return x;}
/* the candidates, simplest first — a coefficient a candidate doesn't use is pinned to the prior (no evidence = the market) */
const MC_PIN=1e7,MC_TEAM_C=['market','edge','sport','full'];
function mcalFitTeam(rows,ref,cand){cand=cand||'full';const R=rows.filter(r=>r.t==='s'&&r.y!=null&&r.q>0);const VO=[...new Set(R.flatMap(r=>String(r.v||'').split(',').filter(Boolean)))].sort();
  const ns=MCAL_SPS.length,lev=MC_TEAM_C.indexOf(cand);
  const mu=[0,1,0,0,0,0,0,...MCAL_SPS.map(()=>0),...VO.map(()=>0)];
  const lam=[3,3,4,4,4,4,4,...MCAL_SPS.map(()=>8),...VO.map(()=>10)].map((l,j)=>j<7?(lev>=1?l:MC_PIN):j<7+ns?(lev>=2?l:MC_PIN):(lev>=3?l:MC_PIN));
  if(lev<=0||R.length<60)return{c:lev<=0?'market':cand,b:mu,VO,n:R.length};
  const b=mcFitLR(R.map(r=>mcTeamX(r,VO)),R.map(r=>r.y),R.map(r=>mcW(r.d,ref)),mu,lam,14);return{c:cand,b,VO,n:R.length};}
function mcTeamP(M,r){if(!M||!M.b)return r.q;const x=mcTeamX(r,M.VO||[]);let z=0;for(let j=0;j<x.length&&j<M.b.length;j++)z+=M.b[j]*x[j];return mcSig(z);}
/* props — [1, characters' logit, log(backers clearing it / 5)]: everyone → sport → stat, each shrunk toward the level above */
const mcPropX=r=>[1,mcLogit(r.pm),Math.log(Math.max(1,r.nge||1)/5)];
const MC_PROP_C=['chars','agree','global','sport','stat'];
function mcalFitProp(rows,ref,cand){cand=cand||'stat';const lev=MC_PROP_C.indexOf(cand);const R=rows.filter(r=>r.t==='p'&&r.y!=null&&r.pm>0);
  const fit=(S,mu,lam)=>S.length?mcFitLR(S.map(mcPropX),S.map(r=>r.y),S.map(r=>mcW(r.d,ref)),mu,lam,12):mu.slice();
  const out={c:cand,g:[0,1,0],sp:{},k:{},n:R.length,nk:{}};if(lev<=0)return out;
  out.g=fit(R,[0,1,0],lev===1?[4,MC_PIN,4]:[3,3,3]);if(lev<3)return out;
  MCAL_SPS.forEach(s=>{const S=R.filter(r=>r.sp===s);if(S.length<40)return;out.sp[s]=fit(S,out.g,[30,30,30]);if(lev<4)return;
    [...new Set(S.map(r=>r.k))].forEach(k=>{const K=S.filter(r=>r.k===k);if(K.length<40)return;out.k[s+'|'+k]=fit(K,out.sp[s],[40,40,40]);out.nk[s+'|'+k]=K.length;});});
  return out;}
function mcPropP(M,r){if(!M||!M.g)return r.pm;const b=M.k[r.sp+'|'+r.k]||M.sp[r.sp]||M.g;const x=mcPropX(r);return mcSig(b[0]*x[0]+b[1]*x[1]+b[2]*x[2]);}

/* §3 · the proof — and the race ────────────────────────────────────────────────────────────────────────────────── */
function mcScore(P,Y){const n=P.length;if(!n)return null;let br=0,ll=0;const B={};
  for(let i=0;i<n;i++){const p=Math.min(0.999,Math.max(0.001,P[i]));br+=(p-Y[i])**2;ll-=Y[i]?Math.log(p):Math.log(1-p);const k=Math.min(9,Math.floor(p*10));const o=B[k]||(B[k]={n:0,p:0,y:0});o.n++;o.p+=p;o.y+=Y[i];}
  let ece=0;Object.values(B).forEach(o=>{ece+=Math.abs(o.p-o.y);});const h=P.map((p,i)=>p>=0.7?Y[i]:null).filter(v=>v!=null);
  return{n,brier:+(br/n).toFixed(4),ll:+(ll/n).toFixed(4),ece:+(ece/n).toFixed(4),n70:h.length,hit70:h.length?+(h.reduce((a,v)=>a+v,0)/h.length).toFixed(3):null,
    p70:h.length?+(P.filter(p=>p>=0.7).reduce((a,p)=>a+p,0)/h.length).toFixed(3):null};}
/* walk forward through the last four weeks: fit on everything before each cut, test on the 4 days after it — never on
   a game the fit saw. Every candidate runs the same folds; the one with the lowest log loss goes live, and a more complex
   one has to beat a simpler one by a real margin (0.0005) or the simpler one keeps the job. As the stack grows, the
   sharper candidates start winning on their own — that's the tightening, earned. */
function mcalRace(rows,ref){const cuts=[];for(let b=28;b>=4;b-=4)cuts.push(dayShift(ref,-b));
  const run=(kind,cands,fit,pred)=>{const tot={};cands.forEach(c=>tot[c]={P:[],Y:[]});
    cuts.forEach(cut=>{const end=dayShift(cut,4);const tr=rows.filter(r=>r.d<cut),te=rows.filter(r=>r.t===kind&&r.d>=cut&&r.d<end&&r.y!=null);if(!te.length||tr.filter(r=>r.t===kind&&r.y!=null).length<(kind==='p'?300:500))return;   /* a fold with a thin past can't judge a fit */
      cands.forEach(c=>{const M=fit(tr,cut,c);te.forEach(r=>{tot[c].P.push(pred(M,r));tot[c].Y.push(r.y);});});});
    const S={};cands.forEach(c=>S[c]=mcScore(tot[c].P,tot[c].Y));let best=cands[0];
    cands.forEach(c=>{if(S[c]&&S[best]&&S[c].ll<S[best].ll-0.0005)best=c;});return{best,S};};
  return{team:run('s',MC_TEAM_C,mcalFitTeam,mcTeamP),prop:run('p',MC_PROP_C,mcalFitProp,mcPropP),cuts};}
const mcWeek=d=>{const t=new Date(String(d).slice(0,10)+'T12:00:00Z');const day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day);return t.toISOString().slice(0,10);};   /* the Monday of that week */
function mcalRefit(why){const st=mcalStack();const rows=mcalRowList();const ref=today();if(!rows.length)return null;
  const M0=get(MCAL_KEY,null)||{};const t0=Date.now();
  let RC=null;try{RC=mcalRace(rows,ref);}catch(e){console.warn('mcal race',e);}
  const tc=RC?RC.team.best:'market',pc=RC?RC.prop.best:'chars';
  const M={v:MCAL_V,fitAt:Date.now(),wk:mcWeek(ref),ref,why:why||'weekly',rows:rows.length,team:mcalFitTeam(rows,ref,tc),prop:mcalFitProp(rows,ref,pc),race:RC,
    span:[rows.reduce((a,r)=>r.d<a?r.d:a,ref),ref],ms:0,hist:(M0.hist||[]).filter(h=>h.wk!==mcWeek(ref))};
  const sc=(R,c)=>R&&R.S&&R.S[c]?{ll:R.S[c].ll,brier:R.S[c].brier,ece:R.S[c].ece,hit70:R.S[c].hit70,n70:R.S[c].n70,n:R.S[c].n}:null;
  M.hist.push({wk:M.wk,at:M.fitAt,rows:rows.length,tc,pc,team:{base:sc(RC&&RC.team,'market'),live:sc(RC&&RC.team,tc)},prop:{base:sc(RC&&RC.prop,'chars'),live:sc(RC&&RC.prop,pc)}});
  M.hist=M.hist.slice(-26);M.ms=Date.now()-t0;set(MCAL_KEY,M);MCAL_M=null;return M;}
let MCAL_M=null;
function mcalModel(){if(MCAL_M&&MCAL_M._t&&Date.now()-MCAL_M._t<60e3)return MCAL_M.m;const m=roGet(MCAL_KEY,null,60e3);MCAL_M={m,_t:Date.now()};return m;}
/* once a week (Monday or later), quietly; the stack itself grows every day */
function mcalMaybe(){try{const M=get(MCAL_KEY,null);const due=!M||M.v!==MCAL_V||mcWeek(today())!==M.wk||Date.now()-(M.fitAt||0)>MCAL_EVERY;
  if(due)return mcalRefit(M?'weekly':'first');const S=get(MCAL_ROWS,null);if(!S||Date.now()-(S.ts||0)>6*36e5)mcalStack();return null;}catch(e){console.warn('mcal',e);return null;}}

/* §4 · use ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
/* a side or total today: o = {sp, mk:'ml'|'spread'|'total', price, v:{voice:p}, opp:[voices on the other side]} */
function mcalTeam(o){const q=mcNoVig(o.price,o.mk);if(q==null)return null;const ps=Object.values(o.v||{}).filter(p=>p!=null&&p>0&&p<1);
  const r={sp:o.sp,mk:o.mk,q,n:Object.keys(o.v||{}).length,no:(o.opp||[]).length,e:ps.length?ps.reduce((a,p)=>a+mcLogit(p),0)/ps.length-mcLogit(q):0,v:Object.keys(o.v||{}).join(',')};
  return mcTeamP((mcalModel()||{}).team,r);}
/* a player threshold today: o = {sp, k, pm: the characters' chance at this line, nge: how many of the five clear it} */
function mcalProp(o){return mcPropP((mcalModel()||{}).prop,{sp:o.sp,k:o.k,pm:o.pm,nge:o.nge});}

/* the card ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
const MC_SP={nfl:'NFL',ncaaf:'CFB',nhl:'NHL',nba:'NBA',ncaab:'CBB',mlb:'MLB'};
const MC_CLAB={market:'the market alone',edge:'market + the characters\' edge and agreement',sport:'+ sport by sport',full:'+ each character\'s own record',
  chars:'the characters\' own %',agree:'their % + how many agree',global:'re-fit on every prop',sport_p:'re-fit sport by sport',stat:'re-fit stat by stat'};
const mcCL=(c,kind)=>MC_CLAB[kind==='p'&&c==='sport'?'sport_p':c]||c;
function mcalCardHtml(){const M=mcalModel();const pc=v=>v==null?'—':(v*100).toFixed(1)+'%';const f4=v=>v==null?'—':v.toFixed(4);
  if(!M)return`<div class="tkt" style="margin-bottom:8px"><h3 style="margin:0 0 4px">🎯 Master calibration</h3><div class="sub">Not fitted yet — it fits itself from every graded call the first time the desk opens after this update.</div><div class="bar" style="margin-top:6px"><button onclick="mcalRefitNow(this)">Fit now</button></div></div>`;
  const RC=M.race||{};
  const race=(R,kind,base)=>{if(!R||!R.S)return'';const C=kind==='p'?MC_PROP_C:MC_TEAM_C;const b=R.S[base];
    return C.filter(c=>R.S[c]).map(c=>{const x=R.S[c];const win=c===R.best;
      return`<tr style="${win?'color:var(--gold);font-weight:800':''}"><td>${win?'✓ ':''}${txtEsc(mcCL(c,kind))}</td><td class="mono">${f4(x.ll)}</td><td class="mono">${pc(x.ece)}</td><td class="mono">${x.n70?pc(x.hit70)+' · '+x.n70:'—'}</td></tr>`;}).join('')+
      (b?`<tr><td colspan="4" class="mono" style="font-size:9px;color:var(--mute)">${b.n} legs tested, walk-forward over ${RC.cuts?RC.cuts.length:0} windows · lower log loss = sharper and honest</td></tr>`:'');};
  const tbl=(h,R,kind,base)=>R&&R.S?`<div class="sub mono" style="font-size:9.5px;margin:6px 0 2px">${h}</div><table class="mono" style="font-size:10px;width:100%;border-collapse:collapse"><tr style="color:var(--mute)"><td>candidate</td><td>log loss</td><td>gap</td><td>70%+ hit · legs</td></tr>${race(R,kind,base)}</table>`:'';
  /* where it moved: a 75% character call, by sport and stat (when the stat-level fit is live) */
  const mv=[];try{const P=M.prop;const keys=Object.keys(P.k||{}).length?Object.entries(P.k):Object.entries(P.sp||{}).map(([s,b])=>[s+'|',b]);
    keys.forEach(([sk,b])=>{const [sp,k]=sk.split('|');const p5=mcSig(b[0]+b[1]*mcLogit(0.75)),p1=mcSig(b[0]+b[1]*mcLogit(0.75)+b[2]*Math.log(1/5));
      mv.push({lab:`${MC_SP[sp]||sp}${k?' '+((typeof CPROP_LAB!=='undefined'&&CPROP_LAB[k])||k):' props'}`,p5,p1,n:(P.nk||{})[sk]||0});});
    if(!mv.length&&P.g){const b=P.g;mv.push({lab:'Every prop',p5:mcSig(b[0]+b[1]*mcLogit(0.75)),p1:mcSig(b[0]+b[1]*mcLogit(0.75)+b[2]*Math.log(1/5)),n:P.n});}}catch(e){}
  mv.sort((a,b)=>Math.abs(b.p5-0.75)-Math.abs(a.p5-0.75));
  const mvH=mv.length&&M.prop.c!=='chars'?`<div class="sub mono" style="font-size:9.5px;margin:6px 0 2px">A player prop the characters call at 75%, as the live fit reads it:</div><div class="mono" style="font-size:10px;line-height:1.55">${mv.slice(0,10).map(x=>`${txtEsc(x.lab)}: all 5 clear it <b style="color:${x.p5>=0.75?'var(--win)':'var(--rust)'}">${pc(x.p5)}</b> · only 1 does ${pc(x.p1)}${x.n?` <span style="color:var(--mute)">(${x.n} legs)</span>`:''}`).join('<br>')}</div>`:'';
  let chH='';try{const tm=M.team;if(tm.c==='full'){const base=7+MCAL_SPS.length;const L=(tm.VO||[]).map((v,i)=>({v,c:tm.b[base+i]||0})).filter(x=>Math.abs(x.c)>=0.02).sort((a,b)=>b.c-a.c);
    const q=0.6,adj=c=>mcSig(mcLogit(q)+c)-q;if(L.length)chH=`<div class="sub mono" style="font-size:9.5px;margin:6px 0 2px">On a 60% side, each character backing it is worth:</div><div class="mono" style="font-size:10px;line-height:1.55">${L.map(x=>`${txtEsc((CHARS[x.v]||{}).chip||x.v)} <b style="color:${x.c>0?'var(--win)':'var(--rust)'}">${adj(x.c)>=0?'+':''}${(adj(x.c)*100).toFixed(1)}</b>`).join(' · ')}</div>`;}}catch(e){}
  const hist=(M.hist||[]).slice(-8).map(h=>`<tr><td class="mono">${txtEsc(h.wk)}</td><td class="mono">${h.rows}</td><td class="mono">${h.prop&&h.prop.live?`${txtEsc(h.pc)} ${f4(h.prop.live.ll)}${h.prop.base?' vs '+f4(h.prop.base.ll):''}`:'—'}</td><td class="mono">${h.team&&h.team.live?`${txtEsc(h.tc)} ${f4(h.team.live.ll)}${h.team.base?' vs '+f4(h.team.base.ll):''}`:'—'}</td></tr>`).join('');
  return`<div class="tkt" style="margin-bottom:8px"><h3 style="margin:0 0 4px">🎯 Master calibration</h3>
    <div class="sub mono" style="font-size:9.5px">Refit ${new Date(M.fitAt).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:APP_TZ})} from ${M.rows.toLocaleString()} graded legs (${txtEsc(M.span[0])} → ${txtEsc(M.span[1])}) · refits every Monday · ${M.ms} ms</div>
    <div class="sub" style="font-size:10px;margin-top:4px">Live now — props: <b>${txtEsc(mcCL(M.prop.c,'p'))}</b> · sides &amp; totals: <b>${txtEsc(mcCL(M.team.c,'s'))}</b>. Each week every candidate is tested on games it never saw; a sharper one only takes over when it actually predicts better.</div>
    ${tbl('Player props — the race',RC.prop,'p','chars')}${tbl('Sides &amp; totals — the race',RC.team,'s','market')}
    ${mvH}${chH}
    ${hist?`<details style="margin-top:6px"><summary class="mono" style="font-size:10px">Week by week</summary><table class="mono" style="font-size:10px;width:100%"><tr style="color:var(--mute)"><td>week of</td><td>legs</td><td>props (live vs raw)</td><td>sides (live vs market)</td></tr>${hist}</table></details>`:''}
    <div class="bar" style="margin-top:6px"><button onclick="mcalRefitNow(this)">↻ Refit now</button></div></div>`;}
function mcalRefitNow(btn){try{if(btn)btn.textContent='Fitting…';setTimeout(()=>{try{mcalRefit('by hand');}catch(e){console.warn(e);}try{if(typeof renderRecord==='function')renderRecord();}catch(e){}
  try{const el=btn&&btn.closest('.tkt');if(el)el.outerHTML=mcalCardHtml();}catch(e){}},30);}catch(e){}}
if(typeof calibrationHtml==='function'&&typeof window!=='undefined'&&!window.__MCAL_CAL__){window.__MCAL_CAL__=1;const C0=calibrationHtml;
  calibrationHtml=function(){let h='';try{h=mcalCardHtml();}catch(e){console.warn('mcal card',e);}return h+C0();};}
if(typeof window!=='undefined'&&!window.__MCAL_BOOT__){window.__MCAL_BOOT__=1;window.addEventListener('load',()=>{if((typeof DESK_BG_EVAL!=='undefined'&&DESK_BG_EVAL)||window.__NO_GRADELOOP__)return;
  setTimeout(()=>{try{(window.requestIdleCallback||(f=>setTimeout(f,0)))(()=>mcalMaybe());}catch(e){}},25000);});}
