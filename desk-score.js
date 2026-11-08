/* ═══ THE SCOREKEEPER, REBUILT — on the dot (v2.96.0) ════════════════════════════════════════════════════════════════
   Loaded on every sport page after desk-brain.js.

   Nov 8, 2:46 AM: "Scorekeeper is supposed to do what it does except it's trying to hit the score on the dot with the
   elements he can research (player stats on averages, possession time and number of possessions, how many shots they
   shoot or how many touchdowns do they score on average how many 3s how many field goals…)"

   Until now his score was the Simulator's most common result — the Simulator's game in another shirt. Now he builds
   every final from its parts, off the season's box scores (comps.json, read by the feeds robot), each team's offense
   against the other team's defense, recent games weighted more, thin samples pulled toward the league:
     football   — touchdowns × what a touchdown brings (PATs, 2-pt tries) + field goals × 3 + safeties, every combination
                  counted (Poisson), so the exact final is the single likeliest one
     basketball — possessions (shots − offensive boards + turnovers + 0.44 × free throws) × each kind of make: threes,
                  twos and free throws, from both teams' rates; the final is the expected makes, point for point
     hockey     — shots on goal × the shooter's rate against that goalie's team, every scoreline counted (Poisson);
                  overtime settles the ties
   His calls come from his own distribution — nobody else's numbers, not the line. Sides and totals at 60%+ logged,
   official at 70%+ through the Coach; a moneyline at 75%+ inside -300…+250. */

const SK_IDX_K='d4.feedcache.compsidx',SK_FROM='2026-11-08';
const SK_N0={nfl:3,ncaaf:4,nba:5,ncaab:5,nhl:6},SK_HL=8;            /* league-average games mixed in · recency half-life (games) */
const SK_HOME={nfl:0.03,ncaaf:0.04,nba:1.15,ncaab:1.6,nhl:0.025};   /* home edge: football/hockey as a rate bump, basketball in points */
let SK_D=null,SK_T={};
function scoreStore(data){if(!data||!data.g)return 0;set(SK_IDX_K,{ts:data.ts,g:data.g});SK_D=null;SK_T={};return Object.keys(data.g).length;}
function skIdx(){if(SK_D&&Date.now()-SK_D._t<60e3)return SK_D.v;const v=roGet(SK_IDX_K,null,60e3);SK_D={v,_t:Date.now()};return v;}
const skPois=(l,k)=>{let p=Math.exp(-l);for(let i=1;i<=k;i++)p*=l/i;return p;};

/* §1 · each team's parts, offense and defense, recent games weighted more ─────────────────────────────────────── */
function skTeams(sp){const D=skIdx();if(!D||!D.g)return null;if(SK_T[sp]&&SK_T[sp].ts===D.ts)return SK_T[sp].v;
  const rows=Object.values(D.g).filter(r=>r&&r[0]===sp&&r[6]&&r[7]).sort((x,y)=>String(y[1]).localeCompare(String(x[1])));
  const T={},L={n:0,s:{}};const add=(ab,off,def,pf,pa)=>{const o=T[ab]||(T[ab]={k:0,w:0,off:{},def:{},pf:0,pa:0});const w=Math.pow(0.5,o.k/SK_HL);o.k++;o.w+=w;o.pf+=w*pf;o.pa+=w*pa;
    Object.entries(off).forEach(([f,v])=>{if(v!=null&&isFinite(v))o.off[f]=(o.off[f]||0)+w*v;});Object.entries(def).forEach(([f,v])=>{if(v!=null&&isFinite(v))o.def[f]=(o.def[f]||0)+w*v;});
    L.n++;Object.entries(off).forEach(([f,v])=>{if(v!=null&&isFinite(v))L.s[f]=(L.s[f]||0)+v;});};
  const part=c=>sp==='nfl'||sp==='ncaaf'?{td:c[0],fg:c[1],sf:c[2],tp:c[3],dr:c[4]}:sp==='nhl'?{sog:c[0],ppg:c[1],ppo:c[2]}
    :(()=>{const [fgm,fga,tpm,tpa,ftm,fta,orb,tov]=c;const poss=fga!=null&&orb!=null&&tov!=null&&fta!=null?fga-orb+tov+0.44*fta:null;return{fgm,fga,tpm,tpa,ftm,fta,orb,tov,poss};})();
  rows.forEach(r=>{const [s_,d,a,h,as,hs,ca,ch]=r;const A=part(ca),H=part(ch);if(sp==='nhl'){A.gf=as;H.gf=hs;}add(a,A,H,as,hs);add(h,H,A,hs,as);});
  const lg={};Object.entries(L.s).forEach(([f,v])=>lg[f]=L.n?v/L.n:0);lg.pts=rows.length?rows.reduce((s,r)=>s+r[4]+r[5],0)/(2*rows.length):0;
  const v={T,lg,n:rows.length};SK_T[sp]={ts:D.ts,v};return v;}
function skTeam(sp,ab){const X=skTeams(sp);if(!X)return null;const t=X.T[ab]||(typeof mgAb==='function'?X.T[mgAb(sp,ab)]:null);return t?{t,X}:null;}
/* a team's per-game rate for a part, pulled toward the league by n0 games */
function skRate(sp,o,side,f,lg){const n0=SK_N0[sp]||4;const s=(o[side][f]||0);return(s+n0*(lg||0))/(o.w+n0);}

/* §2 · his game ────────────────────────────────────────────────────────────────────────────────────────────────── */
function skFootball(sp,A,H,X,neutral){const lg=X.lg;const hb=neutral?0:SK_HOME[sp];
  const lam=(O,Dd,f,home)=>{const off=skRate(sp,O,'off',f,lg[f]),def=skRate(sp,Dd,'def',f,lg[f]);return Math.max(0.01,off*def/Math.max(1e-6,lg[f])*(1+(home?hb:-hb)));};
  const ppt=O=>{const td=O.off.td||0,tp=O.off.tp||0;return(tp+6*6.95)/(td+6);};
  const team=(O,Dd,home)=>{const lT=lam(O,Dd,'td',home),lF=lam(O,Dd,'fg',home),lS=Math.min(0.2,lam(O,Dd,'sf',home));const m=ppt(O);
    const v=m<=7?{6:7-m,7:m-6}:{7:8-m,8:m-7};const P=new Array(110).fill(0);let tv=[1];   /* tv = the points k touchdowns bring */
    for(let k=0;k<=9;k++){if(k>0){const n=new Array(tv.length+8).fill(0);tv.forEach((p,i)=>{if(p)Object.entries(v).forEach(([pt,q])=>{n[i+(+pt)]+=p*q;});});tv=n;}const pk=skPois(lT,k);
      for(let fg=0;fg<=7;fg++){const pf=skPois(lF,fg);for(let s=0;s<=1;s++){const ps=s?1-Math.exp(-lS):Math.exp(-lS);tv.forEach((p,i)=>{if(!p)return;const x=i+3*fg+2*s;if(x<110)P[x]+=pk*pf*ps*p;});}}}
    return{P,lT,lF,ppt:m};};
  const a=team(A,H,false),h=team(H,A,!neutral);return{a,h,joint:skJoint(a.P,h.P,[[3,0.6],[6,0.4]])};}
function skHockey(A,H,X,neutral){const lg=X.lg;const hb=neutral?0:SK_HOME.nhl;const sh=lg.sog?lg.gf/lg.sog:0.1;
  const team=(O,Dd,home)=>{const sog=skRate('nhl',O,'off','sog',lg.sog)*skRate('nhl',Dd,'def','sog',lg.sog)/Math.max(1,lg.sog)*(1+(home?hb:-hb));
    const myShot=(skRate('nhl',O,'off','gf',lg.gf))/Math.max(1,skRate('nhl',O,'off','sog',lg.sog)),theirSave=(skRate('nhl',Dd,'def','gf',lg.gf))/Math.max(1,skRate('nhl',Dd,'def','sog',lg.sog));
    const pct=myShot*theirSave/Math.max(1e-6,sh);const l=Math.max(0.3,sog*pct);const P=new Array(12).fill(0).map((_,k)=>skPois(l,k));return{P,sog,pct,l};};
  const a=team(A,H,false),h=team(H,A,!neutral);return{a,h,joint:skJoint(a.P,h.P,[[1,1]])};}
/* both teams' scorelines together; a tie goes to overtime and is split between the two winners */
function skJoint(Pa,Ph,ot){const J=new Map();const put=(x,y,p)=>{const k=x+'-'+y;J.set(k,(J.get(k)||0)+p);};
  for(let x=0;x<Pa.length;x++){if(Pa[x]<1e-7)continue;for(let y=0;y<Ph.length;y++){const p=Pa[x]*Ph[y];if(p<1e-9)continue;if(x!==y){put(x,y,p);continue;}ot.forEach(([d,w])=>{put(x+d,y,p*w/2);put(x,y+d,p*w/2);});}}
  return J;}
function skBasketball(sp,A,H,X,neutral){const lg=X.lg;const hb=neutral?0:SK_HOME[sp];const R=(O,s,f)=>skRate(sp,O,s,f,lg[f]);
  const pace=(R(A,'off','poss')+R(A,'def','poss'))/2*(R(H,'off','poss')+R(H,'def','poss'))/2/Math.max(1,lg.poss);
  const team=(O,Dd,home)=>{const per=(f)=>R(O,'off',f)/Math.max(1e-6,R(O,'off','poss')),perD=(f)=>R(Dd,'def',f)/Math.max(1e-6,R(Dd,'def','poss')),perL=f=>lg[f]/Math.max(1e-6,lg.poss);
    const mix=f=>per(f)*perD(f)/Math.max(1e-6,perL(f));const pct=(m,a)=>{const o=R(O,'off',m)/Math.max(1e-6,R(O,'off',a)),d=R(Dd,'def',m)/Math.max(1e-6,R(Dd,'def',a)),l=lg[m]/Math.max(1e-6,lg[a]);return o*d/Math.max(1e-6,l);};
    const tpa=pace*mix('tpa'),fga=pace*mix('fga'),fta=pace*mix('fta');const twa=Math.max(0,fga-tpa);
    const p3=pct('tpm','tpa'),p2=(()=>{const o=(R(O,'off','fgm')-R(O,'off','tpm'))/Math.max(1e-6,R(O,'off','fga')-R(O,'off','tpa')),d=(R(Dd,'def','fgm')-R(Dd,'def','tpm'))/Math.max(1e-6,R(Dd,'def','fga')-R(Dd,'def','tpa')),l=(lg.fgm-lg.tpm)/Math.max(1e-6,lg.fga-lg.tpa);return o*d/Math.max(1e-6,l);})(),pft=R(O,'off','ftm')/Math.max(1e-6,R(O,'off','fta'));
    const m3=tpa*p3,m2=twa*p2,mf=fta*pft;return{m3,m2,mf,fga,tpa,fta,pts:3*m3+2*m2+mf+(home?hb:-hb)};};
  const a=team(A,H,false),h=team(H,A,!neutral);return{a,h,pace};}
/* the game, start to finish: his distribution, his exact final, his chances on any line */
function skGame(sp,a,h,neutral){const ta=skTeam(sp,a),th=skTeam(sp,h);if(!ta||!th)return null;const X=ta.X;if(ta.t.k<2||th.t.k<2)return null;
  if(sp==='nfl'||sp==='ncaaf'){const G=skFootball(sp,ta.t,th.t,X,neutral);let best=null;G.joint.forEach((p,k)=>{if(!best||p>best.p)best={k,p};});const [x,y]=best.k.split('-').map(Number);
    const prob=f=>{let s=0,t=0;G.joint.forEach((p,k)=>{const [aa,hh]=k.split('-').map(Number);const r=f(aa,hh);if(r==null)return;t+=p;if(r)s+=p;});return t?s/t:null;};
    return{sp,kind:'fb',mode:{a:x,h:y,p:best.p},mean:{a:[...G.a.P.keys()].reduce((s,i)=>s+i*G.a.P[i],0),h:[...G.h.P.keys()].reduce((s,i)=>s+i*G.h.P[i],0)},prob,parts:{a:{td:G.a.lT,fg:G.a.lF,ppt:G.a.ppt},h:{td:G.h.lT,fg:G.h.lF,ppt:G.h.ppt}}};}
  if(sp==='nhl'){const G=skHockey(ta.t,th.t,X,neutral);let best=null;G.joint.forEach((p,k)=>{if(!best||p>best.p)best={k,p};});const [x,y]=best.k.split('-').map(Number);
    const prob=f=>{let s=0,t=0;G.joint.forEach((p,k)=>{const [aa,hh]=k.split('-').map(Number);const r=f(aa,hh);if(r==null)return;t+=p;if(r)s+=p;});return t?s/t:null;};
    return{sp,kind:'hk',mode:{a:x,h:y,p:best.p},mean:{a:G.a.l,h:G.h.l},prob,parts:{a:{sog:G.a.sog,pct:G.a.pct},h:{sog:G.h.sog,pct:G.h.pct}}};}
  if(sp==='nba'||sp==='ncaab'){const G=skBasketball(sp,ta.t,th.t,X,neutral);const sM=(typeof ORA_SIG!=='undefined'&&ORA_SIG[sp])||12,sT=(typeof ORA_TSIG!=='undefined'&&ORA_TSIG[sp])||16;
    const nc=z=>typeof normCdf==='function'?normCdf(z):0.5*(1+Math.tanh(z*0.7978845608*(1+0.044715*z*z)));const mM=G.h.pts-G.a.pts,mT=G.h.pts+G.a.pts;
    let x=Math.round(G.a.pts),y=Math.round(G.h.pts);if(x===y){if(mM>=0)y++;else x++;}
    const prob=f=>f.__k==='ml'?nc(mM/sM):f.__k==='sp'?nc((mM+f.__l)/sM):f.__k==='ou'?nc((mT-f.__l)/sT):null;
    return{sp,kind:'bb',mode:{a:x,h:y},mean:{a:G.a.pts,h:G.h.pts},prob,parts:{a:G.a,h:G.h,pace:G.pace}};}
  return null;}
/* his chance that home wins / home covers hl / the game goes over tl */
function skChance(G,mk,line){if(!G)return null;if(G.kind==='bb'){const f={__k:mk==='ml'?'ml':mk==='spread'?'sp':'ou',__l:+line};return G.prob(f);}
  if(mk==='ml')return G.prob((a,h)=>h>a);if(mk==='spread')return G.prob((a,h)=>{const m=h-a+(+line);return m===0?null:m>0;});return G.prob((a,h)=>{const t=a+h;return t===+line?null:t>+line;});}

/* §3 · his calls ─────────────────────────────────────────────────────────────────────────────────────────────────── */
const SK_PS={};
function skCallsV2(sp,g,Ln,hl,hlSim,tl,tlSim,add){const d=(g&&g.__date)||today();if(d<SK_FROM)return false;const G=skGame(sp,g.away.abbr,g.home.abbr,!!g.neutral);if(!G)return false;
  const K=sp+'|'+g.away.abbr+'@'+g.home.abbr;SK_PS[K]=G;skLog(sp,g,d,G);const base={pa:G.mode.a,ph:G.mode.h,score:G.mode.a+'-'+G.mode.h};const A=g.away.abbr,H=g.home.abbr;Ln=Ln||{};
  const partTxt=skPartsTxt(G,A,H);
  if(hl!=null&&!hlSim){const p=skChance(G,'spread',hl);if(p!=null){const side=p>=0.5?'home':'away';const kG=Math.round(100*Math.max(p,1-p));if(kG>=60)add('Most common','spread',side,{...base,kG,why:[`his final ${A} ${G.mode.a} – ${G.mode.h} ${H}`].concat(partTxt)});}}
  {const p=skChance(G,'ml');if(p!=null){const side=p>=0.5?'home':'away';const kG=Math.round(100*Math.max(p,1-p));const L=side==='home'?Ln.mlH:Ln.mlA;const pr=L&&typeof amerOk==='function'?amerOk(L.price):L?L.price:null;
    if(kG>=75&&pr!=null&&+pr>=-300&&+pr<=250)add('Most common','ml',side,{...base,kG,why:[`his final ${A} ${G.mode.a} – ${G.mode.h} ${H}`].concat(partTxt)});}}
  if(tl!=null&&!tlSim){const p=skChance(G,'total',tl);if(p!=null){const side=p>=0.5?'over':'under';const kG=Math.round(100*Math.max(p,1-p));if(kG>=60)add('Most common','total',side,{...base,kG,why:[`his total ${(G.mean.a+G.mean.h).toFixed(1)} vs ${tl}`].concat(partTxt)});}}
  return true;}
function skPartsTxt(G,A,H){const f=x=>x.toFixed(1);
  if(G.kind==='fb')return[`${A}: ${f(G.parts.a.td)} TD × ${f(G.parts.a.ppt)} + ${f(G.parts.a.fg)} FG`,`${H}: ${f(G.parts.h.td)} TD × ${f(G.parts.h.ppt)} + ${f(G.parts.h.fg)} FG`];
  if(G.kind==='hk')return[`${A}: ${f(G.parts.a.sog)} shots × ${(G.parts.a.pct*100).toFixed(1)}%`,`${H}: ${f(G.parts.h.sog)} shots × ${(G.parts.h.pct*100).toFixed(1)}%`];
  if(G.kind==='bb'){const t=(x,n)=>`${n}: ${f(x.m3)} threes, ${f(x.m2)} twos, ${f(x.mf)} FT`;return[`${Math.round(G.parts.pace)} possessions`,t(G.parts.a,A),t(G.parts.h,H)];}return[];}
function skPredFor(sp,g){const G=SK_PS[sp+'|'+g.away.abbr+'@'+g.home.abbr];return G?{a:G.mode.a,h:G.mode.h}:null;}

/* §4 · on the dot: every exact final he called, graded ──────────────────────────────────────────────────────────── */
const SK_LOG_K='d4.sklog';
function skLog(sp,g,d,G){try{if(d!==today())return;const L=get(SK_LOG_K,{})||{};const k=d+'|'+sp+'|'+g.away.abbr+'@'+g.home.abbr;if(L[k]&&L[k].a===G.mode.a&&L[k].h===G.mode.h)return;
  L[k]={d,sp,game:g.away.abbr+'@'+g.home.abbr,a:G.mode.a,h:G.mode.h,t:+(G.mean.a+G.mean.h).toFixed(1),m:+(G.mean.h-G.mean.a).toFixed(1)};
  const keys=Object.keys(L).sort();keys.slice(0,Math.max(0,keys.length-1500)).forEach(x=>delete L[x]);set(SK_LOG_K,L);}catch(e){}}
function skRecord(days){const L=get(SK_LOG_K,{})||{};const lo=dayShift(today(),-(days||30));const R={n:0,dot:0,t3:0,side:0,by:{}};
  Object.values(L).forEach(x=>{if(!x||x.d<lo||x.d>=today())return;let F=null;try{F=finalsFor(x.sp,x.game,x.d,false);}catch(e){}if(!F||F.a==null||F.h==null)return;const fa=+F.a,fh=+F.h;
    const o=R.by[x.sp]||(R.by[x.sp]={n:0,dot:0,t3:0,side:0});[R,o].forEach(q=>{q.n++;if(fa===x.a&&fh===x.h)q.dot++;if(Math.abs((fa+fh)-(x.a+x.h))<=3)q.t3++;if((fh>fa)===(x.h>x.a))q.side++;});});
  return R;}
function skCardHtml(){try{const D=skIdx();if(!D||!D.g)return'';const R=skRecord(30);const n=Object.keys(D.g).length;const pc=(a,b)=>b?Math.round(100*a/b)+'%':'—';
  const today_=Object.entries(SK_PS).slice(0,8).map(([k,G])=>{const [sp,gm]=k.split('|');const [A,H]=gm.split('@');return`<div style="padding:2px 0;border-bottom:1px solid var(--rule)"><b>${txtEsc(A)} ${G.mode.a} – ${G.mode.h} ${txtEsc(H)}</b> <span style="color:var(--mute)">${txtEsc(skPartsTxt(G,A,H).join(' · '))}</span></div>`;}).join('');
  return`<div class="tkt sk-card" style="margin-top:8px;border-left:3px solid #FFD75E"><h3 style="margin:0 0 2px">🎯 The Scorekeeper — on the dot</h3>
    <div class="sub mono" style="font-size:9.5px">Every final built from its parts — touchdowns and field goals, possessions and each kind of make, shots and the goalie — off ${n} box scores this season. Nobody else's numbers, not the line.</div>
    ${R.n?`<div class="mono" style="font-size:10.5px;margin:5px 0">Last 30 days: <b>${R.dot}</b> on the dot of ${R.n} (${pc(R.dot,R.n)}) · total within 3: ${pc(R.t3,R.n)} · right winner: ${pc(R.side,R.n)}</div>`:'<div class="sub mono" style="font-size:10px;margin:4px 0">His on-the-dot record starts with today\'s finals.</div>'}
    ${today_?`<div class="mono" style="font-size:10px;margin-top:4px">${today_}</div>`:''}</div>`;}catch(e){return'';}}
if(typeof window!=='undefined'&&!window.__SK_CARD__){window.__SK_CARD__=1;
  if(typeof dogCardHtml==='function'){const D0=dogCardHtml;dogCardHtml=function(){return D0()+skCardHtml();};}}
