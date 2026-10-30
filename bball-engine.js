/* ═══ THEDESK — BASKETBALL ENGINE · NBA + NCAAB (v2.32) ══════════════════════
   One engine, two leagues, the same card every other sport has:
     Coach · Trends · A–G · Alt Lines · Proj. Box (players, last 5 / last 10) ·
     Props · Take/Fade · Live / Final Box · My Bets · Roster
   plus the master evaluation, the snapshot that grades the system picks, the
   results backfill, the record page and a live loop during games.

   MODEL — each team's points = its offense × the opponent's defense ÷ the
   league average (an efficiency model), home court added (none on a neutral
   floor), and a back-to-back costs the tired team (NBA). Ratings start from
   ESPN's points for / against, blended with last season (regressed toward the
   league average — rosters change, college rosters most of all). As finals
   arrive they're replaced by opponent-adjusted ratings learned from the actual
   results (iterated like SRS, recent games weighted more; preseason and
   exhibitions never count). Margin and total are Normal around the projection
   with the league's real spread of results; integer lines get an exact push band.

   FROZEN — once the day's master evaluation runs, the board reads the locked
   projections, so a number never moves after the freeze.

   COLLEGE — 360+ D1 teams and ~150 games a night. The board opens on the games
   that carry a real line, the characters only work those games, and the phone
   keeps a rolling window (schedule today + tomorrow, results three weeks back
   for form, the season for ratings).                                          */
'use strict';
const NBA_GAMES=[],NBA_SIMS={},NBA_RATINGS={},NBA_UPCOMING=[];
const NCAAB_GAMES=[],NCAAB_SIMS={},NCAAB_RATINGS={},NCAAB_UPCOMING=[];
let NBA_LOAD_NOTE='',NCAAB_LOAD_NOTE='';
const BB_CFG={
  nba:{sp:'nba',lab:'NBA',name:'NBA',espn:'https://site.api.espn.com/apis/site/v2/sports/basketball/nba',std:'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings',
    games:NBA_GAMES,up:NBA_UPCOMING,sims:NBA_SIMS,rt:NBA_RATINGS,hca:2.3,lg0:114,mins:48,np:4,plen:12,
    per:{full:{f:1,sm:12.0,st:18.5},h1:{f:0.5,sm:8.6,st:12.8},q1:{f:0.25,sm:6.0,st:8.8}},perLab:{h1:'1ST HALF',q1:'1ST QUARTER'},
    prior:15,regress:0.25,b2b:1.6,learnK:10,shots:'d4.nbashots',arc:'d4.nbaarc',judge:'d4.nbajudge',evalKey:'d4.nbaeval',sched:'d4.nbasched',res:'d4.nbares',
    resCap:1400,groups:'',upDays:7,lineDays:8,bfChunk:14,bfDays:30,odds:'basketball_nba',lim:'&limit=300',dayLim:'&limit=100'},
  ncaab:{sp:'ncaab',lab:'CBB',name:'College Basketball',espn:'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball',std:'https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/standings',
    games:NCAAB_GAMES,up:NCAAB_UPCOMING,sims:NCAAB_SIMS,rt:NCAAB_RATINGS,hca:3.0,lg0:72,mins:40,np:2,plen:20,
    per:{full:{f:1,sm:10.8,st:15.5},h1:{f:0.48,sm:7.6,st:10.9}},perLab:{h1:'1ST HALF'},
    prior:8,regress:0.35,b2b:0,learnK:6,shots:'d4.ncaabshots',arc:'d4.ncaabarc',judge:'d4.ncaabjudge',evalKey:'d4.ncaabeval',sched:'d4.ncaabsched',res:'d4.ncaabres',
    resCap:4500,groups:'&groups=50',upDays:2,lineDays:2,bfChunk:3,bfDays:21,odds:'basketball_ncaab',lim:'&limit=900',dayLim:'&limit=400'}};
const BB_STATUS={nba:{sched:'not loaded',ratings:'not loaded',res:''},ncaab:{sched:'not loaded',ratings:'not loaded',res:''}};
const bbC=sp=>BB_CFG[sp]||BB_CFG.nba;
const bbEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const bbQ=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
const bbSgn=x=>x==null||!isFinite(+x)?'—':(+x>0?'+':'')+(+x);
const bbDec=a=>a>0?a/100+1:100/(-a)+1;
const bbFair=p=>!(p>0&&p<1)?null:p>=0.5?-Math.round(100*p/(1-p)):Math.round(100*(1-p)/p);
const bbEV=(p,price)=>price==null||p==null?null:(p*(bbDec(+price)-1)-(1-p))*100;
const bbKey=g=>g.away.abbr+'@'+g.home.abbr;
function bbPhi(x){return typeof pstNormCdf==='function'?pstNormCdf(x):0.5*(1+Math.tanh(0.7978845608*(x+0.044715*x*x*x)));}
/* P(win / push / lose) for X~N(mu,sd) against a threshold: win when X > t (half line) or X >= t+1 (integer) */
function bbThresh(mu,sd,t){const isInt=Math.abs(t-Math.round(t))<1e-9;
  if(!isInt){const w=1-bbPhi((t-mu)/sd);return{w,p:0,l:1-w};}
  const w=1-bbPhi((t+0.5-mu)/sd),l=bbPhi((t-0.5-mu)/sd);return{w,p:Math.max(0,1-w-l),l};}
const bbSeasonYear=()=>{const d=today();const y=+d.slice(0,4),m=+d.slice(5,7);return m>=7?y+1:y;};
const bbAbbr=(C,tm)=>{const ab=String((tm&&tm.abbreviation)||'').toUpperCase();return ab||String((tm&&tm.id)||'?');};
/* ── every D1 school, for the intake (names → ESPN abbreviations) ── */
async function bbLoadTeams(C){if(C.sp!=='ncaab')return;if(typeof ncaabStatic==='function'&&!get('d4.ncaabteams',null))return;   /* v2.36 · every D1 school ships in shared.js — ESPN's team list can't be read from a browser anyway */const old=get('d4.ncaabteams',null);const n0=old&&(old.t||[]).length||0;
  if(old&&old.ts>Date.now()-(n0>=300?7:1)*864e5&&n0>=30)return;   /* the full D1 list refreshes weekly; a short one tomorrow */
  try{const j=await fetch(C.espn+'/teams?limit=1000&groups=50').then(r=>r.json());const t=[];
    ((((j||{}).sports||[])[0]||{}).leagues||[]).forEach(L=>(L.teams||[]).forEach(x=>{const T=x.team||x;if(!T||!T.abbreviation)return;
      t.push([String(T.abbreviation).toUpperCase(),String(T.id),T.location||'',T.name||'',T.displayName||'',T.shortDisplayName||'',T.nickname||'']);}));
    if(t.length>=30&&t.length>=n0)set('d4.ncaabteams',{ts:Date.now(),t});}catch(e){console.warn('ncaab teams',e);}}
/* ── schedule ─────────────────────────────────────────────────────────────── */
function bbOddsFromEspn(c){const o=(c.odds||[])[0];if(!o)return null;
  const num=v=>{const n=parseFloat(String(v==null?'':v).replace(/[^0-9.+\-]/g,''));return isNaN(n)?null:n;};const px=v=>amerOk(v);
  const side=(k,s)=>{const x=o[k]&&o[k][s];return x?(x.close||x.current||x.open||{}):{};};
  const ml=s=>px(o[s+'TeamOdds']&&o[s+'TeamOdds'].moneyLine)??px(side('moneyline',s).odds);
  const spp=s=>px(o[s+'TeamOdds']&&o[s+'TeamOdds'].spreadOdds)??px(side('pointSpread',s).odds);
  let aL=num(side('pointSpread','away').line),hL=num(side('pointSpread','home').line);
  if(aL==null&&hL==null&&o.spread!=null&&isFinite(+o.spread)){hL=+o.spread;aL=-hL;}   /* ESPN's "spread" is the home side's number */
  const tot=num(o.overUnder)??num(side('total','over').line);
  const ov=px(o.overOdds)??px(side('total','over').odds),un=px(o.underOdds)??px(side('total','under').odds);
  return{awayML:ml('away'),homeML:ml('home'),awaySP:aL,homeSP:hL,awaySPp:spp('away')??(aL!=null?-110:null),homeSPp:spp('home')??(hL!=null?-110:null),
    total:tot,over:ov??(tot!=null?-110:null),under:un??(tot!=null?-110:null),book:(o.provider&&o.provider.name)||'',details:o.details||''};}
function bbParseEvent(C,ev){const c=(ev.competitions||[])[0];if(!c)return null;const st=c.status||ev.status||{};const ty=st.type||{};
  const aw=(c.competitors||[]).find(x=>x.homeAway==='away'),hm=(c.competitors||[]).find(x=>x.homeAway==='home');if(!aw||!hm)return null;
  const T=t=>{const tm=t.team||{};const rk=t.curatedRank&&t.curatedRank.current;return{abbr:bbAbbr(C,tm),name:tm.shortDisplayName||tm.name||tm.abbreviation||'',displayName:tm.displayName||'',
    id:String(tm.id||''),tid:String(tm.id||''),record:((t.records||[])[0]||{}).summary||'',rank:rk&&rk<=25?rk:null};};
  const ls=x=>(x.linescores||[]).map(v=>+(v.value!=null?v.value:v.displayValue)||0);const la=ls(aw),lh=ls(hm);const college=C.sp==='ncaab';
  const sc=x=>x.score!==''&&x.score!=null?+(typeof x.score==='object'?(x.score.value!=null?x.score.value:x.score.displayValue):x.score):null;
  const state=ty.state==='post'?'post':ty.state==='in'?'in':'pre';const per=st.period||0;const d=tdDay(ev.date);
  const h1done=state==='post'||per>(college?1:2);
  const sea=ev.season||{};const pre=(+sea.type===1)||/preseason|exhibition/i.test(String(sea.slug||''))||(typeof seasonPre==='function'&&seasonPre(C.sp,d));
  return{sp:C.sp,id:String(ev.id),espnId:String(ev.id),start:ev.date,__date:d,away:T(aw),home:T(hm),awayScore:sc(aw),homeScore:sc(hm),
    abstract:state,status:ty.shortDetail||'',detail:ty.shortDetail||'',period:per,clockSec:st.clock!=null?+st.clock:null,
    /* the first period (an NBA quarter, a college half) and the first half — the grader reads p1 and h1 */
    p1a:la.length?la[0]:null,p1h:lh.length?lh[0]:null,q1a:!college&&la.length?la[0]:null,q1h:!college&&lh.length?lh[0]:null,
    h1a:h1done?(college?(la.length?la[0]:null):(la.length>=2?la[0]+la[1]:null)):null,h1h:h1done?(college?(lh.length?lh[0]:null):(lh.length>=2?lh[0]+lh[1]:null)):null,
    lsA:la,lsH:lh,neutral:!!c.neutralSite,venue:((c.venue||{}).fullName)||'',pre,espnOdds:bbOddsFromEspn(c),note:((c.notes||[])[0]||{}).headline||''};}
async function bbLoadSchedule(C){const td=today(),a=td.replace(/-/g,''),z=dayShift(td,C.upDays).replace(/-/g,'');
  /* the range call can come back empty in preseason (ESPN defaults a range to one season type): ask day by day, then for preseason */
  const grab=u=>fetch(u).then(r=>r.json()).then(x=>x.events||[]).catch(()=>null);
  let evs=await grab(C.espn+'/scoreboard?dates='+a+'-'+z+C.lim+C.groups),how='range';
  if(!evs||!evs.length){const days=Array.from({length:C.upDays+1},(_,i)=>dayShift(td,i).replace(/-/g,''));
    const per=await Promise.all(days.map(d=>grab(C.espn+'/scoreboard?dates='+d+C.dayLim+C.groups)));evs=per.flat().filter(Boolean);how='by day';
    if(!evs.length){const pre=await Promise.all(days.map(d=>grab(C.espn+'/scoreboard?dates='+d+'&seasontype=1'+C.dayLim+C.groups)));evs=pre.flat().filter(Boolean);how='preseason';}}
  const seen=new Set();evs=(evs||[]).filter(e=>e&&e.id&&!seen.has(e.id)&&seen.add(e.id));
  const note=evs.length?`${evs.length} games found (${how})`:`ESPN returned no ${C.lab} games for the next ${C.upDays+1} days`;if(C.sp==='nba')NBA_LOAD_NOTE=note;else NCAAB_LOAD_NOTE=note;
  if(!evs.length&&(C.games.length||C.up.length))return;   /* keep what we had on a bad pull */
  const all=evs.map(ev=>bbParseEvent(C,ev)).filter(Boolean);
  C.games.length=0;all.filter(g=>g.__date===td).sort((x,y)=>String(x.start).localeCompare(String(y.start))).forEach(g=>C.games.push(g));
  C.up.length=0;all.filter(g=>g.__date>td).sort((x,y)=>String(x.start).localeCompare(String(y.start))).forEach(g=>C.up.push(g));
  bbCacheSchedule(C);
  BB_STATUS[C.sp].sched=`${C.games.length} game${C.games.length===1?'':'s'} today${C.up.length?` · ${C.up.length} in the next ${C.upDays} day${C.upDays>1?'s':''}`:''}${C.games.some(g=>g.pre)?' (preseason)':''}`;
  bbStoreEspnLines(C);bbRecordResults(C,all);}
/* the schedule cache paints the board instantly on the next open (lines live in their own store) */
function bbCacheSchedule(C){try{const slim=(g,keepLs)=>{const o={...g};delete o.espnOdds;if(!keepLs){delete o.lsA;delete o.lsH;}return o;};
  set(C.sched,{d:today(),ts:Date.now(),games:C.games.map(g=>slim(g,true)),up:C.up.filter(g=>g.__date<=dayShift(today(),C.sp==='ncaab'?1:C.upDays)).map(g=>slim(g,false))});}catch(e){}}
function bbLoadCached(C){const S=get(C.sched,null);if(!S||!Array.isArray(S.games))return false;const td=today();
  C.games.length=0;C.up.length=0;
  if(S.d===td)S.games.forEach(g=>C.games.push(g));else(S.up||[]).filter(g=>g.__date===td).forEach(g=>C.games.push(g));
  (S.up||[]).filter(g=>g.__date>td).forEach(g=>C.up.push(g));return C.games.length>0||C.up.length>0;}
/* ── results: every final the engine sees — ratings, form, rest and trends all come from it ──
   row: [day, away, home, awayPts, homePts, neutral, h1Away, h1Home, preseason] */
function bbRes(C){return roGet(C.res,{},5e3)||{};}
let BB_RES_SIG={};
function bbRecordResults(C,games){const R=get(C.res,{})||{};let n=0;(games||[]).forEach(g=>{if(g.abstract!=='post'||g.awayScore==null||g.homeScore==null)return;const d=g.__date||tdDay(g.start);
    if(R[g.id])return;R[g.id]=[d,g.away.abbr,g.home.abbr,+g.awayScore,+g.homeScore,g.neutral?1:0,g.h1a,g.h1h,g.pre?1:0];n++;});
  if(n){const ks=Object.keys(R);if(ks.length>C.resCap)ks.sort((a,b)=>String(R[a][0]).localeCompare(String(R[b][0]))).slice(0,ks.length-C.resCap).forEach(k=>delete R[k]);set(C.res,R);BB_RES_SIG[C.sp]=null;}
  return n;}
let BB_BF_TS={};
async function bbBackfill(C,force){if(!force&&Date.now()-(BB_BF_TS[C.sp]||0)<30*60e3)return 0;BB_BF_TS[C.sp]=Date.now();const td=today();const y=dayShift(td,-1);
  const have=Object.values(get(C.res,{})||{}).map(r=>r[0]).sort();const floor=dayShift(td,-C.bfDays);
  let from=have.length?have[have.length-1]:floor;if(from<floor)from=floor;let n=0,calls=0;
  while(from<=y&&calls<6){const to=dayShift(from,C.bfChunk-1)<y?dayShift(from,C.bfChunk-1):y;calls++;
    let j=null;try{j=await fetch(C.espn+'/scoreboard?dates='+from.replace(/-/g,'')+'-'+to.replace(/-/g,'')+(C.sp==='ncaab'?'&limit=1500':'&limit=600')+C.groups).then(r=>r.json());}catch(e){break;}
    const G=(j&&j.events||[]).map(ev=>bbParseEvent(C,ev)).filter(Boolean);n+=bbRecordResults(C,G);try{bbArchiveBackfill(C,G);}catch(e){}
    from=dayShift(to,1);}
  BB_STATUS[C.sp].res=`${Object.keys(get(C.res,{})||{}).length} finals on file`;return n;}
/* team logs from the results (one index per results change) */
function bbIdx(C){const R=bbRes(C);const sig=Object.keys(R).length;const c=BB_RES_SIG[C.sp];if(c&&c.sig===sig)return c;
  const T={};Object.values(R).forEach(r=>{[[r[1],1],[r[2],0]].forEach(([t,away])=>{(T[t]=T[t]||[]).push(r);});});
  Object.values(T).forEach(L=>L.sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));BB_RES_SIG[C.sp]={sig,T};return BB_RES_SIG[C.sp];}
/* days since each team last played before d (0 = back-to-back) — preseason games count, they're still legs */
function bbRestDays(C,ab,d){const L=bbIdx(C).T[ab]||[];let last=null;for(let i=L.length-1;i>=0;i--){if(L[i][0]<d){last=L[i][0];break;}}
  if(!last)return null;return Math.round((Date.parse(d)-Date.parse(last))/864e5)-1;}
/* form: the last N regular-season finals — W-L, points for and against */
function bbForm(C,ab,n){const L=(bbIdx(C).T[ab]||[]).filter(r=>!r[8]).slice(-(n||10));if(!L.length)return null;let w=0,pf=0,pa=0;
  L.forEach(r=>{const home=r[2]===ab;const f=home?r[4]:r[3],a=home?r[3]:r[4];if(f>a)w++;pf+=f;pa+=a;});return{n:L.length,w,l:L.length-w,pf:pf/L.length,pa:pa/L.length,games:L};}
/* ── ratings ──────────────────────────────────────────────────────────────── */
async function bbStandings(C,season){
  const r=await fetch(C.std+'?season='+season).then(x=>x.json()).catch(()=>({}));const out={};
  const walk=n=>{if(!n||typeof n!=='object')return;(n.children||[]).forEach(walk);((n.standings||{}).entries||[]).forEach(e=>{const tm=e.team||{};const ab=bbAbbr(C,tm);if(!ab||ab==='?')return;
    const st=k=>{const s=(e.stats||[]).find(x=>x.name===k||x.type===k);return s&&s.value!=null&&isFinite(+s.value)?+s.value:null;};
    const gp=st('gamesPlayed')||((st('wins')||0)+(st('losses')||0));
    let pf=st('avgPointsFor'),pa=st('avgPointsAgainst');if((!pf||!pa)&&gp){const PF=st('pointsFor'),PA=st('pointsAgainst');if(PF&&PA){pf=PF/gp;pa=PA/gp;}}
    if(pf&&pa&&pf>30&&pa>30&&pf<200&&pa<200)out[ab]={pf,pa,gp:gp||0,w:st('wins')||0,l:st('losses')||0};});};
  walk(r);return out;}
let BB_RATED={};
async function bbLoadRatings(C,force){if(!force&&Date.now()-(BB_RATED[C.sp]||0)<6*3600e3&&Object.keys(C.rt).length)return;
  const y=bbSeasonYear();const [cur,prev]=await Promise.all([bbStandings(C,y).catch(()=>({})),bbStandings(C,y-1).catch(()=>({}))]);
  const all=new Set([...Object.keys(cur),...Object.keys(prev)]);if(!all.size)return;const pfs=[];
  all.forEach(ab=>{const c=cur[ab],p=prev[ab];const w=c&&c.gp?c.gp/(c.gp+C.prior):0;let pf,pa;
    if(c&&c.gp&&p){pf=w*c.pf+(1-w)*p.pf;pa=w*c.pa+(1-w)*p.pa;}else if(c&&c.gp){pf=c.pf;pa=c.pa;}else if(p){pf=p.pf;pa=p.pa;}else return;
    C.rt[ab]={pf,pa,gp:c?c.gp:0,src:c&&c.gp?(w>0.5?'this season':'blend'):'last season',w:c?c.w:0,l:c?c.l:0};pfs.push(pf);});
  if(pfs.length){C.lgStd=pfs.reduce((a,b)=>a+b,0)/pfs.length;Object.values(C.rt).forEach(R=>{if(R.src==='last season'){R.pf=(1-C.regress)*R.pf+C.regress*C.lgStd;R.pa=(1-C.regress)*R.pa+C.regress*C.lgStd;}});}
  BB_RATED[C.sp]=Date.now();try{set('d4.'+C.sp+'rt',{ts:Date.now(),rt:C.rt,lg:C.lgStd||null});}catch(e){}
  BB_STATUS[C.sp].ratings=`${Object.keys(C.rt).length} teams rated (${Object.values(C.rt).filter(r=>r.src!=='last season').length} with this season's numbers)`;BB_LEARN[C.sp]=null;}
function bbRestoreRatings(C){const S=get('d4.'+C.sp+'rt',null);if(S&&S.rt&&!Object.keys(C.rt).length){Object.assign(C.rt,S.rt);C.lgStd=S.lg||null;BB_STATUS[C.sp].ratings=`${Object.keys(C.rt).length} teams rated (cached)`;}}
/* opponent-adjusted ratings learned from the regular-season finals on file (recent games count more) */
const BB_LEARN={};
function bbLearned(C){const R=bbRes(C);const sig=Object.keys(R).length;const c=BB_LEARN[C.sp];if(c&&c.sig===sig)return c;
  const td=today();const G=Object.values(R).filter(r=>!r[8]&&r[0]>=dayShift(td,-150));const T={};let tot=0,n=0;
  G.forEach(r=>{T[r[1]]=T[r[1]]||{n:0};T[r[2]]=T[r[2]]||{n:0};tot+=r[3]+r[4];n+=2;});
  const base=C.lgStd||C.lg0;const lg=n?(tot+base*200)/(n+200):base;const hcaHalf=C.hca/2;
  const off={},def={};Object.keys(T).forEach(t=>{off[t]=lg;def[t]=lg;});
  const wOf=d=>Math.exp(-Math.max(0,(Date.parse(td)-Date.parse(d))/864e5)/45);   /* ~45-day memory */
  for(let it=0;it<12;it++){const so={},sd={},sw={};
    G.forEach(r=>{const[d,A,H,as,hs,neu]=r;const w=wOf(d);const h=neu?0:hcaHalf;
      /* what each side scored and allowed, with the opponent and the floor taken out */
      const oA=as+h-(def[H]-lg),oH=hs-h-(def[A]-lg),dA=hs-h-(off[H]-lg),dH=as+h-(off[A]-lg);
      [[A,oA,dA],[H,oH,dH]].forEach(([t,o,dd])=>{so[t]=(so[t]||0)+w*o;sd[t]=(sd[t]||0)+w*dd;sw[t]=(sw[t]||0)+w;});});
    Object.keys(T).forEach(t=>{if(sw[t]){off[t]=so[t]/sw[t];def[t]=sd[t]/sw[t];}});}
  G.forEach(r=>{T[r[1]].n++;T[r[2]].n++;});
  const out={sig,lg,teams:{}};Object.keys(T).forEach(t=>{out.teams[t]={off:off[t],def:def[t],n:T[t].n};});BB_LEARN[C.sp]=out;return out;}
function bbRate(C,team){const ab=team&&team.abbr||team;const S=C.rt[ab];const L=bbLearned(C);const lg=L.lg||C.lgStd||C.lg0;const X=L.teams[ab];
  let off=S?S.pf:lg,def=S?S.pa:lg,src=S?S.src:'league average';
  if(X&&X.n){const w=X.n/(X.n+C.learnK);off=w*X.off+(1-w)*off;def=w*X.def+(1-w)*def;src=X.n>=8?'learned from '+X.n+' games':src+' + '+X.n+' games';}
  return{off,def,lg,src,n:X?X.n:0,gp:S?S.gp:0};}
/* ── simulation ───────────────────────────────────────────────────────────── */
function bbExpect(C,g){const A=bbRate(C,g.away),H=bbRate(C,g.home);const lg=A.lg;const h=g.neutral?0:C.hca/2;
  let away=A.off*H.def/lg-h,home=H.off*A.def/lg+h;const d=g.__date||tdDay(g.start)||today();
  const rA=bbRestDays(C,g.away.abbr,d),rH=bbRestDays(C,g.home.abbr,d);
  if(C.b2b){if(rA===0){away-=C.b2b/2;home+=C.b2b/2;}if(rH===0){home-=C.b2b/2;away+=C.b2b/2;}}
  /* after the day's freeze the board reads the locked numbers — they never move again */
  let frozen=false;try{if(d===today()){const LD=bbLockDay(C);const L=LD&&LD.games&&LD.games[bbKey(g)];if(L&&L.a!=null&&L.h!=null){away=+L.a;home=+L.h;frozen=true;}}}catch(e){}
  return{away,home,A,H,rA,rH,frozen};}
function bbSimFor(C,g,period){const P=C.per[period||'full']||C.per.full;const E=bbExpect(C,g);
  const away=E.away*P.f,home=E.home*P.f;const muM=home-away,muT=home+away;
  return{awayProj:+away.toFixed(1),homeProj:+home.toFixed(1),margin:muM,total:muT,rest:{a:E.rA,h:E.rH},ratings:{a:E.A,h:E.H},frozen:E.frozen,
    hw:1-bbPhi((0-muM)/P.sm),aw:bbPhi((0-muM)/P.sm),   /* continuous margin: no ties (overtime decides) */
    /* side 'home' with line L (home -4.5 → L=-4.5): covers when margin + L > 0 */
    cover:(side,L)=>side==='home'?bbThresh(muM,P.sm,-L):(r=>({w:r.l,p:r.p,l:r.w}))(bbThresh(muM,P.sm,L)),
    ou:(side,L)=>{const r=bbThresh(muT,P.st,L);return side==='over'?r:{w:r.l,p:r.p,l:r.w};},
    homeCover:L=>{const r=bbThresh(muM,P.sm,-L);return r.w/((r.w+r.l)||1);},awayCover:L=>{const r=bbThresh(muM,P.sm,L);return r.l/((r.w+r.l)||1);},
    over:L=>{const r=bbThresh(muT,P.st,L);return r.w/((r.w+r.l)||1);},under:L=>{const r=bbThresh(muT,P.st,L);return r.l/((r.w+r.l)||1);},
    mean:muT,med:muT,medMargin:muM,sdM:P.sm,sdT:P.st,modeScore:Math.round(away)+'-'+Math.round(home)};}
const bbLockDay=C=>{try{const L=roGet('d4.simlock',{},5e3)||{};const D=L[today()];return D&&D[C.sp]||null;}catch(e){return null;}};
const bbSig=C=>{const LD=bbLockDay(C);return Object.keys(C.rt).length+'|'+((BB_LEARN[C.sp]||{}).sig||0)+'|'+(BB_RES_SIG[C.sp]?BB_RES_SIG[C.sp].sig:0)+'|'+(LD?LD.ts:0);};
function bbSim(C,g){let s=C.sims[g.id];const sig=bbSig(C);if(!s||s._sig!==sig){s=bbSimFor(C,g);s._sig=sig;C.sims[g.id]=s;}return s;}
/* the master evaluation re-simulates the games the characters work (college: not all 150) */
function bbResim(sp,g){const C=bbC(sp);if(sp==='ncaab'&&!bbWorkable(sp,g)){delete C.sims[g.id];return undefined;}const s=bbSimFor(C,g);s._sig=bbSig(C);C.sims[g.id]=s;return s;}
/* live: the current score plus what's left of the game */
function bbLive(C,g){if(g.abstract!=='in'||g.awayScore==null)return null;const per=g.period||1,clk=g.clockSec!=null?g.clockSec:C.plen*30;
  const played=Math.min(C.mins,(Math.min(per,C.np)-1)*C.plen+(per>C.np?C.plen:(C.plen-clk/60)));
  const f=Math.max(0.02,(C.mins-played)/C.mins);const s=bbSim(C,g);const cur=g.homeScore-g.awayScore;
  const hw=1-bbPhi((0-(cur+s.margin*f))/(C.per.full.sm*Math.sqrt(f)));return{hw,aw:1-hw,f,projA:g.awayScore+s.awayProj*f,projH:g.homeScore+s.homeProj*f};}
/* ── book lines: yours first, then live odds, then ESPN's ─────────────────── */
const BB_SRC_RANK={mine:3,live:2,espn:1};
function bbDateOf(C,game){if(C.games.some(z=>bbKey(z)===game))return today();const u=C.up.find(z=>bbKey(z)===game);return u?u.__date:today();}
function bbLinesOn(C,d){return(roGet(C.shots,{},3e3)||{})[d||today()]||[];}
function bbPutLines(C,rows){const all=get(C.shots,{})||{};const key=x=>[x.game,x.market,x.side,x.player||'',x.stat||'',x.src].join('|');let n=0;
  rows.forEach(r=>{const p=amerOk(r.price);if(p==null)return;r.price=p;const d=r.date||bbDateOf(C,r.game);delete r.date;const day=all[d]||(all[d]=[]);const i=day.findIndex(y=>key(y)===key(r));if(i>=0)day[i]=r;else day.push(r);n++;});
  const td=today();Object.keys(all).filter(k=>k<td).sort().slice(0,-(C.sp==='ncaab'?2:7)).forEach(k=>delete all[k]);set(C.shots,all);delete BB_WORK[C.sp];return n;}
function bbLinesFor(C,game,date){const L=bbLinesOn(C,date||bbDateOf(C,game)).filter(x=>x.game===game&&amerOk(x.price)!=null);const best={};
  L.forEach(x=>{const k=x.market==='prop'?[x.market,x.player,x.stat,x.side].join('|'):x.market+'|'+x.side;const b=best[k];const r=BB_SRC_RANK[x.src]||0,br=b?(BB_SRC_RANK[b.src]||0):-1;
    if(!b||r>br||(r===br&&(x.capturedAt||0)>(b.capturedAt||0)))best[k]=x;});return Object.values(best);}
const BB_ESPN_SIG={};
function bbStoreEspnLines(C){const rows=[];const last=dayShift(today(),C.lineDays-1);
  [...C.games,...C.up].forEach(g=>{const o=g.espnOdds;if(!o||g.abstract!=='pre'||(g.__date||'')>last)return;const game=bbKey(g);
    const base={away:g.away.abbr,home:g.home.abbr,game,gid:g.id,src:'espn',book:o.book||'',capturedAt:Date.now(),date:g.__date};
    if(o.awayML!=null&&o.homeML!=null)rows.push({...base,market:'moneyline',side:'away',line:null,price:o.awayML},{...base,market:'moneyline',side:'home',line:null,price:o.homeML});
    if(o.total!=null&&o.over!=null&&o.under!=null)rows.push({...base,market:'total',side:'over',line:o.total,price:o.over},{...base,market:'total',side:'under',line:o.total,price:o.under});
    if(o.awaySP!=null&&o.homeSP!=null&&o.awaySPp!=null&&o.homeSPp!=null)rows.push({...base,market:'spread',side:'away',line:o.awaySP,price:o.awaySPp},{...base,market:'spread',side:'home',line:o.homeSP,price:o.homeSPp});});
  /* written only when ESPN's numbers actually moved — not every 45 seconds */
  const sig=rows.map(r=>[r.date,r.game,r.market,r.side,r.line,r.price].join(',')).join(';');if(!rows.length||BB_ESPN_SIG[C.sp]===sig)return 0;BB_ESPN_SIG[C.sp]=sig;return bbPutLines(C,rows);}
function bbSaveOdds(sp,picks,el){const C=bbC(sp);const rows=(picks||[]).map(x=>({away:x.away,home:x.home,game:x.game||(x.away+'@'+x.home),market:x.market==='ml'?'moneyline':x.market,side:x.side,
    line:x.line!=null&&x.line!==''?+x.line:null,price:x.price,src:'mine',capturedAt:Date.now(),...(x.player?{player:x.player,stat:x.stat}:{})}));const n=bbPutLines(C,rows);
  if(el)el.innerHTML=`<div class="tkt hi"><h3>${C.name} lines saved</h3><div class="sub">${n} line${n===1?'':'s'} filed — they replace ESPN's numbers on those games.</div></div>`;
  Object.keys(C.sims).forEach(k=>delete C.sims[k]);if(typeof ACTIVE_SPORT!=='undefined'&&ACTIVE_SPORT===sp)bbRender(sp);return n;}
/* The Odds API (the key in Settings) — DraftKings first */
async function bbFetchLiveOdds(sp){const C=bbC(sp);const key=typeof theOddsApiKey==='function'?theOddsApiKey():get(LS.key,'');if(!key)throw new Error('Add your Odds API key in Settings');
  const r=await fetch(`https://api.the-odds-api.com/v4/sports/${C.odds}/odds/?apiKey=${key}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`);
  if(r.status===401)throw new Error('Odds API 401 — bad key or credits used up');const j=await r.json();if(!Array.isArray(j))throw new Error((j&&j.message)||'unexpected Odds API response');
  const ab=n=>sp==='nba'?nbaAbbrFor(n):ncaabAbbrFor(n);const rows=[];
  j.forEach(ev=>{const a=ab(ev.away_team),h=ab(ev.home_team);if(!a||!h)return;const game=a+'@'+h;const g=[...C.games,...C.up].find(z=>bbKey(z)===game);if(!g)return;
    const bk=(ev.bookmakers||[]).find(b=>b.key==='draftkings')||(ev.bookmakers||[]).find(b=>b.key==='fanduel')||(ev.bookmakers||[])[0];if(!bk)return;
    const base={away:a,home:h,game,gid:g.id,src:'live',book:bk.key,capturedAt:Date.now(),date:g.__date};
    (bk.markets||[]).forEach(mk=>(mk.outcomes||[]).forEach(o=>{const sd=ab(o.name)===a?'away':'home';
      if(mk.key==='h2h')rows.push({...base,market:'moneyline',side:sd,line:null,price:o.price});
      if(mk.key==='spreads')rows.push({...base,market:'spread',side:sd,line:o.point,price:o.price});
      if(mk.key==='totals')rows.push({...base,market:'total',side:/over/i.test(o.name)?'over':'under',line:o.point,price:o.price});}));});
  const n=bbPutLines(C,rows);Object.keys(C.sims).forEach(k=>delete C.sims[k]);bbRender(sp);return n;}
/* the games the characters work: the NBA's whole slate; in college, the games with YOUR lines,
   plus ESPN-lined games with a ranked team (or the first 25 lined games when nothing's ranked) */
const BB_WORK={};
function bbWorkSet(sp){const C=bbC(sp);const n=C.games.length+C.up.length;const w=BB_WORK[sp];if(w&&w.n===n&&Date.now()-w.ts<3000)return w.s;
  const s=new Set();let espnOnly=0;const td=today();
  [...C.games,...C.up].sort((a,b)=>String(a.start).localeCompare(String(b.start))).forEach(g=>{const L=bbLinesFor(C,bbKey(g),g.__date);if(!L.length)return;
    if(sp!=='ncaab'||L.some(x=>x.src!=='espn')||g.away.rank||g.home.rank){s.add(g.id);return;}
    if(espnOnly<25&&g.__date===td){espnOnly++;s.add(g.id);}});
  BB_WORK[sp]={ts:Date.now(),n,s};return s;}
function bbWorkable(sp,g){try{return!!g&&bbWorkSet(sp).has(g.id);}catch(e){return false;}}
/* ── intake grammar (same shape as every sport) ──────────────────────────────
   NBA (or NCAAB / CBB)
   ATL @ BOS            (or full team names — every D1 school resolves)
   ML: ATL +155 / BOS -180
   SPREAD: ATL +4.5 (-110) / BOS -4.5 (-110)
   OU: o225 (-110) / u225 (-110)
   H1SPREAD|H1ML|H1OU (both) · Q1SPREAD|Q1ML|Q1OU (NBA)                       */
function bbParseSlate(sp,text){const picks=[],unread=[];let A=null,H=null;const pr=v=>amerOk(v);const ab=t=>sp==='nba'?(nbaAbbrFor(t)||null):(typeof ncaabAbbrFor==='function'?ncaabAbbrFor(t):null);
  const sideRe='(.+?)\\s+([+-]?[\\d.]+|pk)\\s*\\(\\s*([+-]\\d+|even|ev)\\s*\\)';
  String(text).split('\n').map(l=>l.replace(/^[\s\-*•>]+/,'').trim()).filter(Boolean).forEach(l=>{
    if(/^(NBA|NCAAB|NCAAM|CBB|BASKETBALL|COLLEGE BASKETBALL)\b/i.test(l)&&!/:/.test(l))return;
    let m=l.match(/^(.+?)\s+(?:@|at|vs\.?)\s+(.+?)\s*$/i);
    if(m&&!/:/.test(l)){A=ab(m[1])||m[1].toUpperCase().replace(/\s+/g,'');H=ab(m[2])||m[2].toUpperCase().replace(/\s+/g,'');return;}
    if(!A){unread.push(l);return;}
    const game=A+'@'+H,add=(market,side,line,price)=>{const p=pr(price);if(p==null)return;picks.push({sport:sp,game,away:A,home:H,market,side,line:line==null?null:(/pk/i.test(line)?0:+line),price:p});};
    m=l.match(/^(H1|1H|Q1)?\s*(ML|MONEYLINE)\s*:\s*(.+?)\s+([+-]\d+|even|ev)\s*\/\s*(.+?)\s+([+-]\d+|even|ev)\s*$/i);
    if(m){const pre=(m[1]||'').toLowerCase().replace('1h','h1');add(pre+'moneyline','away',null,m[4]);add(pre+'moneyline','home',null,m[6]);return;}
    m=l.match(new RegExp('^(H1|1H|Q1)?\\s*(SPREAD|ATS)\\s*:\\s*'+sideRe+'\\s*\\/\\s*'+sideRe+'\\s*$','i'));
    if(m){const pre=(m[1]||'').toLowerCase().replace('1h','h1');add(pre+'spread','away',m[4],m[5]);add(pre+'spread','home',m[7],m[8]);return;}
    m=l.match(/^(H1|1H|Q1)?\s*(OU|TOTAL)\s*:\s*o\s*([\d.]+)\s*\(\s*([+-]\d+|even|ev)\s*\)\s*\/\s*u\s*([\d.]+)\s*\(\s*([+-]\d+|even|ev)\s*\)\s*$/i);
    if(m){const pre=(m[1]||'').toLowerCase().replace('1h','h1');add(pre+'total','over',m[3],m[4]);add(pre+'total','under',m[5],m[6]);return;}
    unread.push(l);});
  return{picks,unread};}
/* ── the card ─────────────────────────────────────────────────────────────── */
function bbTile(C,g,s,label,pick,line,r,simStr,mk,sd){const sp=C.sp;const pw=r?r.w/((r.w+r.l)||1):null;
  if(!line){const cI=(()=>{try{return charSquare(sp,g,s,pick,{})}catch(e){return{}}})(),tC=charTier({hasLine:false},cI);
    return`<div class="bet${tC}"><div class="bl">${bbEsc(label)}</div><div class="sim-chip">sim ${bbEsc(simStr)}</div>
      <div class="bo" style="color:var(--mute)">${pw!=null?bbSgn(bbFair(pw)):'—'}</div><div class="bs">sim only</div>
      <div class="bf" style="color:var(--mute)">no real line yet${r&&r.p>0.005?` · push ${Math.round(r.p*100)}%`:''}</div>${cI.chips||''}${cI.meter||''}${charTierTag(tC)}</div>`;}
  const kp=imp(line.price),ev=(r.w*(bbDec(line.price)-1)-r.l)*100,gap=(pw-kp)*100;
  let cls='',badge='';if(gap>=EDGE_MIN){cls=' value';badge=`<span class="eb up">+${gap.toFixed(1)}</span>`;}else if(gap<=-EDGE_MIN){cls=' avoid';badge=`<span class="eb dn">${gap.toFixed(1)}</span>`;}
  const cInfo=(()=>{try{return charSquare(sp,g,s,pick,{price:line.price,modelP:pw,line:line.line})}catch(e){return{}}})();
  const tier=charTier({hasLine:true,bookLeans:kp>=0.58,modelEdgeHere:cls===' value',modelAgainstHere:cls===' avoid',outsideAgrees:false,outsideUnanimous:false,outsideAgainst:false},cInfo);
  const co=charAsOutside(cInfo,false);const srcCls=co.unanimous?' consensus-pick':co.agrees?' source-pick':'';
  const on=typeof SLIP!=='undefined'&&SLIP.some(x=>x.id===g.id+'|'+pick||x.sq===g.id+'|'+pick);
  const conf=(()=>{try{if(!mk||!sd||typeof pickConfIdx!=='function')return'';
    const o=pickConfIdx().get(sp+'|'+bbKey(g)+'|'+mk+'|'+sd);return o&&o.n?`<div class="mono" style="font-size:9px;color:var(--gold);margin-top:2px">✅ ${Math.round(o.cf*100)}% · official</div>`:'';}catch(e){return'';}})();
  return`<div class="bet${cls}${srcCls}${tier} ${on?'on':''}" role="button" tabindex="0" onclick="sportSlipToggle('${sp}','${g.id}','${bbQ(pick)}',${line.price})">
    <div class="bl">${bbEsc(label)}</div><div class="sim-chip">sim ${bbEsc(simStr)}</div><div class="bo">${bbSgn(line.price)}</div>
    <div class="bs">${badge||Math.round(kp*100)+'%'}</div>
    <div class="bf">model ${(pw*100).toFixed(0)}% · fair ${bbSgn(bbFair(pw))} · <span style="color:${ev>=2?'var(--win)':ev<0?'var(--rust)':'var(--mute)'}">${ev>=0?'+':''}${ev.toFixed(1)}% EV</span>${r.p>0.005?` · push ${Math.round(r.p*100)}%`:''}</div>
    ${conf}${co.badge||''}${cInfo.chips||''}${cInfo.meter||''}${charTierTag(tier)}</div>`;}
function bbMkt(title,real,inner){return`<div class="mktlab" style="margin-top:8px">${title}${real?'<span style="font-family:\'IBM Plex Mono\';font-size:8px;color:var(--cold);border:1px solid var(--cold);border-radius:3px;padding:1px 4px;margin-left:6px">REAL LINE</span>':''}</div><div class="betgrid">${inner}</div>`;}
function bbSection(C,g,lab,per,pre,L){const s=per==='full'?bbSim(C,g):bbSimFor(C,g,per);const f=(m,sd)=>L.find(x=>x.market===m&&x.side===sd);
  const mlA=f(pre+'moneyline','away')||f(pre+'ml','away'),mlH=f(pre+'moneyline','home')||f(pre+'ml','home'),spA=f(pre+'spread','away'),spH=f(pre+'spread','home'),ov=f(pre+'total','over'),un=f(pre+'total','under');
  const P=pre?(pre==='h1'?'1H':pre.toUpperCase())+' ':'';const A=g.away.abbr,H=g.home.abbr;const out=[];const mk=pre?null:1;
  if(per==='full'||mlA||mlH)out.push(bbMkt(lab+' · MONEYLINE',!!(mlA||mlH),bbTile(C,g,s,A,`${P}${A} ML`,mlA,{w:s.aw,p:0,l:s.hw},s.awayProj.toFixed(1),mk&&'ml','away')+bbTile(C,g,s,H,`${P}${H} ML`,mlH,{w:s.hw,p:0,l:s.aw},s.homeProj.toFixed(1),mk&&'ml','home')));
  if(spA&&spH)out.push(bbMkt(lab+' · SPREAD',true,bbTile(C,g,s,`${A} ${bbSgn(spA.line)}`,`${P}${A} ${bbSgn(spA.line)}`,spA,s.cover('away',+spA.line),(-s.margin).toFixed(1),mk&&'spread','away')+bbTile(C,g,s,`${H} ${bbSgn(spH.line)}`,`${P}${H} ${bbSgn(spH.line)}`,spH,s.cover('home',+spH.line),s.margin.toFixed(1),mk&&'spread','home')));
  else if(per==='full'){const l=-Math.round(s.margin*2)/2||-0.5;out.push(bbMkt(lab+' · SPREAD (model line)',false,bbTile(C,g,s,`${H} ${bbSgn(l)}`,`${H} ${bbSgn(l)}`,null,s.cover('home',l),s.margin.toFixed(1))+bbTile(C,g,s,`${A} ${bbSgn(-l)}`,`${A} ${bbSgn(-l)}`,null,s.cover('away',-l),(-s.margin).toFixed(1))));}
  if(ov&&un)out.push(bbMkt(`${lab} · TOTAL ${ov.line}`,true,bbTile(C,g,s,'Over '+ov.line,`${P}Over ${ov.line}`,ov,s.ou('over',+ov.line),s.total.toFixed(1),mk&&'total','over')+bbTile(C,g,s,'Under '+un.line,`${P}Under ${un.line}`,un,s.ou('under',+un.line),s.total.toFixed(1),mk&&'total','under')));
  else if(per==='full'){const t=Math.round(s.total*2)/2;out.push(bbMkt(`${lab} · TOTAL ${t} (model line)`,false,bbTile(C,g,s,'Over '+t,'Over '+t,null,s.ou('over',t),s.total.toFixed(1))+bbTile(C,g,s,'Under '+t,'Under '+t,null,s.ou('under',t),s.total.toFixed(1))));}
  return out.join('');}
const bbChip=(t,col)=>`<div class="sigchip"${col?` style="color:${col}"`:''}>${t}</div>`;
function bbChips(C,g,s,L){const A=g.away.abbr,H=g.home.abbr;const out=[];const f=(m,sd)=>L.find(x=>x.market===m&&x.side===sd);
  const ov=f('total','over'),spH=f('spread','home');
  out.push(bbChip(`O/U <b>${ov?ov.line:s.total.toFixed(1)}</b> · ${spH?`${H} ${bbSgn(spH.line)}`:`model ${s.margin>=0?H:A} ${bbSgn(-Math.abs(Math.round(s.margin*2)/2))}`}`));
  const evs=[];[['moneyline','away',A+' ML',s.aw],['moneyline','home',H+' ML',s.hw]].forEach(([m,sd,lab,p])=>{const x=f(m,sd);if(x)evs.push({lab,ev:bbEV(p,x.price)});});
  if(spH&&f('spread','away')){const sa=f('spread','away');evs.push({lab:`${A} ${bbSgn(sa.line)}`,ev:bbEV(s.awayCover(+sa.line),sa.price)},{lab:`${H} ${bbSgn(spH.line)}`,ev:bbEV(s.homeCover(+spH.line),spH.price)});}
  if(ov&&f('total','under')){const un=f('total','under');evs.push({lab:'Over '+ov.line,ev:bbEV(s.over(+ov.line),ov.price)},{lab:'Under '+un.line,ev:bbEV(s.under(+un.line),un.price)});}
  const best=evs.filter(x=>x.ev!=null&&isFinite(x.ev)).sort((a,b)=>b.ev-a.ev)[0];
  if(best)out.push(Math.abs(best.ev)<2?bbChip(`NO EDGE · BEST ${best.ev>=0?'+':''}${best.ev.toFixed(1)}% EV`):`<div class="sigchip" style="color:var(--win);border-color:rgba(46,204,113,.45)">EDGE · ${bbEsc(best.lab)} · +${best.ev.toFixed(1)}% EV</div>`);
  if(g.pre)out.push(bbChip('PRESEASON · learning only','var(--gold)'));
  if(s.frozen)out.push(bbChip('🔒 frozen','var(--cold)'));
  if(g.neutral)out.push(bbChip('neutral floor'));
  const rest=(ab,r)=>r==null?'':r===0?bbChip(`${ab} back-to-back`,'var(--rust)'):r>=3?bbChip(`${ab} ${r} days rest`,'var(--win)'):'';
  out.push(rest(A,s.rest.a),rest(H,s.rest.h));
  [A,H].forEach(ab=>{const F=bbForm(C,ab,10);if(F&&F.n>=3)out.push(bbChip(`${ab} last ${F.n}: ${F.w}-${F.l}`,F.w/F.n>=0.7?'var(--win)':F.w/F.n<=0.3?'var(--rust)':null));});
  const lv=bbLive(C,g);if(lv)out.push(bbChip(`LIVE win ${A} ${Math.round(lv.aw*100)}% · ${H} ${Math.round(lv.hw*100)}%`,'var(--gold)'));
  return out.filter(Boolean).join('');}
function bbHead(C,g,s,L){const A=g.away.abbr,H=g.home.abbr;
  if(g.abstract==='in')return`<div class="proj"><div class="sc">${A} ${g.awayScore??0} – ${g.homeScore??0} ${H}</div><div class="rd" style="color:var(--gold)">${bbEsc(g.status||'')}</div>
    <div class="md">pregame model ${s.awayProj.toFixed(1)}–${s.homeProj.toFixed(1)}</div></div>`;
  if(g.abstract==='post'){const tot=(+g.awayScore||0)+(+g.homeScore||0);const ov=L.find(x=>x.market==='total'&&x.side==='over');const right=(s.hw>=s.aw)===(+g.homeScore>+g.awayScore);
    return`<div class="proj"><div class="sc">${A} ${g.awayScore} – ${g.homeScore} ${H}</div><div class="rd">FINAL${/OT/.test(g.status||'')?' / OT':''}</div>
      <div class="md">model called ${s.hw>=s.aw?H:A} (${(Math.max(s.hw,s.aw)*100).toFixed(0)}%) — ${right?'✅ right':'❌ wrong'}${ov?` · total ${tot} vs ${ov.line} → ${tot>ov.line?'OVER':tot<ov.line?'UNDER':'PUSH'}`:''}</div></div>`;}
  const P=((get('d4.preds',{})||{})[C.sp]||{})[g.__date||today()]||{};const pr=P[bbKey(g)];
  return`<div class="proj"><div class="sc">${A} ${s.awayProj.toFixed(1)} – ${s.homeProj.toFixed(1)} ${H}</div>
    <div class="rd">${Math.round(s.awayProj)}–${Math.round(s.homeProj)}</div><div class="md">${H} ${Math.round(s.hw*100)}% to win · total ${s.total.toFixed(1)} · ${bbEsc(s.ratings.h.src)}</div>
    ${pr?`<div style="font-family:'IBM Plex Mono';font-size:10px;color:var(--gold);margin-top:3px">pred ${A} ${pr.a} – ${pr.h} ${H} <span style="color:var(--mute)">vs model: margin ${((pr.h-pr.a)-(s.homeProj-s.awayProj)).toFixed(1)} · total ${((+pr.a+ +pr.h)-(s.awayProj+s.homeProj)).toFixed(1)}</span></div>`:''}
    ${g.pre?'':(()=>{try{return brainBlock(g,s,C.sp)}catch(e){return''}})()}</div>`;}
function bbCard(C,g){const sp=C.sp;const L=bbLinesFor(C,bbKey(g),g.__date);const s=bbSim(C,g);const A=g.away.abbr,H=g.home.abbr;
  const time=g.start?new Date(g.start).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';const rk=t=>t.rank?`<span style="color:var(--gold);font-size:11px">#${t.rank}</span> `:'';
  const nm=ab=>typeof teamNameHtml==='function'?teamNameHtml(sp,ab):bbEsc(ab);
  let extra='';try{extra=teamRecordChip(A)+teamRecordChip(H)+frozenChip(g,s,sp)+takeFadeChip(g,s,sp)+systemFormChip(sp);}catch(e){}
  const btn=(k,t)=>`<button onclick="bbPan('${sp}','${g.id}','${k}',this)">${t}</button>`;const per=Object.keys(C.per).filter(k=>k!=='full');
  return`<div class="tkt game-bb" id="${sp}-card-${g.id}" style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
      <div><div style="font-size:16px;font-weight:800;color:var(--chalk)">${rk(g.away)}${nm(A)} <span style="color:var(--mute);font-size:13px">@</span> ${rk(g.home)}${nm(H)}</div>
      <div style="font-size:10px;color:var(--mute);font-family:'IBM Plex Mono'">${bbEsc(time)}${g.venue?' · '+bbEsc(g.venue):''}${g.note?' · '+bbEsc(g.note):''}</div></div>
      <div style="text-align:right;font-family:'IBM Plex Mono';font-size:9px;color:var(--mute)">${bbEsc(g.away.name||A)} ${bbEsc(g.away.record||'')}<br>${bbEsc(g.home.name||H)} ${bbEsc(g.home.record||'')}</div></div>
    ${bbHead(C,g,s,L)}<div class="sig">${bbChips(C,g,s,L)}${extra}</div>
    ${g.abstract==='pre'?(()=>{try{return coachHtml({game:g,sim:s,sport:sp})}catch(e){return''}})():''}${(()=>{try{return sgpCardHtml(sp,g,s)}catch(e){return''}})()}
    ${g.abstract!=='post'?bbSection(C,g,'GAME','full','',L)+per.map(k=>bbSection(C,g,C.perLab[k],k,k,L)).join(''):''}
    ${!L.length&&g.abstract!=='post'?`<div class="sub" style="font-size:10px;margin-top:4px">No book lines yet — paste your sportsbook's ${C.lab} lines in Intake (ESPN's fill in when posted).</div>`:L.length&&L.every(x=>x.src==='espn')&&g.abstract!=='post'?`<div class="sub mono" style="font-size:9.5px;color:var(--mute);margin-top:4px">Lines from ESPN${L[0].book?' ('+bbEsc(L[0].book)+')':''} — your uploads replace them.</div>`:''}
    ${typeof pstCardHtml==='function'?pstCardHtml(sp,g):''}
    <div class="legend"><span><i class="v"></i>model sees value</span><span><i class="a"></i>model says pass</span><span><i class="n"></i>no real edge</span></div>
    <div class="exprow" style="margin-top:10px">${btn('coach','Coach')}${btn('trends','Trends')}${btn('ag','A–G')}${btn('alt','Alt Lines')}${btn('box','Proj. Box')}${btn('props','Props')}${btn('verdict','Take/Fade')}${g.abstract!=='pre'?btn('live',g.abstract==='post'?'Final Box':'Live Box'):''}${btn('mybets','My Bets')}${btn('roster','Roster')}${g.abstract==='post'?btn('analysis','📊 Analysis'):''}</div>
    <div class="panel" id="${sp}p-${g.id}"></div></div>`;}
function bbCardWrapped(C,g){const h=bbCard(C,g);try{return typeof pregameWrap==='function'&&(C.sp!=='ncaab'||bbWorkable(C.sp,g))?pregameWrap(C.sp,g,h):h;}catch(e){return h;}}
/* one-line row for the games that aren't opened yet — a tap opens the full card in place */
function bbRow(C,g){const sp=C.sp,A=g.away.abbr,H=g.home.abbr;let s=null;try{s=C.sims[g.id]||bbSimFor(C,g);}catch(e){}const L=bbLinesFor(C,bbKey(g),g.__date);
  const spH=L.find(x=>x.market==='spread'&&x.side==='home'),ov=L.find(x=>x.market==='total'&&x.side==='over');
  const t=g.start?new Date(g.start).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';const rk=x=>x.rank?`<span style="color:var(--gold)">#${x.rank}</span> `:'';
  const right=g.abstract==='post'?`<b>${g.awayScore}–${g.homeScore}</b> <span style="color:var(--mute)">FINAL</span>`:g.abstract==='in'?`<b>${g.awayScore??0}–${g.homeScore??0}</b> <span style="color:var(--rust)">${bbEsc(g.status||'LIVE')}</span>`:'Open ›';
  const model=s?`model ${s.margin>=0?H:A} ${bbSgn(-Math.abs(Math.round(s.margin*2)/2))} · total ${(Math.round(s.total*2)/2)}`:'';
  const book=spH||ov?` · book ${spH?H+' '+bbSgn(spH.line):''}${spH&&ov?' · ':''}${ov?'o/u '+ov.line:''}`:'';
  return`<div class="tkt bb-row" id="${sp}-row-${g.id}" role="button" tabindex="0" onclick="bbExpand('${sp}','${g.id}')" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 12px;margin-bottom:6px;cursor:pointer">
    <div style="min-width:0"><div style="font-weight:800;font-size:14px">${rk(g.away)}${bbEsc(A)} <span style="color:var(--mute)">@</span> ${rk(g.home)}${bbEsc(H)}${g.pre?' <span class="mono" style="font-size:9px;color:var(--gold)">PRESEASON</span>':''}</div>
      <div class="mono" style="font-size:10px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${bbEsc(t)} · ${model}${book}</div></div>
    <div class="mono" style="font-size:11px;color:var(--gold);flex:0 0 auto">${right}</div></div>`;}
const BB_EXP={nba:new Set(),ncaab:new Set()};
function bbExpand(sp,gid){const C=bbC(sp);const g=[...C.games,...C.up].find(x=>x.id===gid);if(!g)return;BB_EXP[sp].add(gid);
  const el=document.getElementById(sp+'-row-'+gid);if(el){const d=document.createElement('div');d.innerHTML=bbCardSafe(C,g);el.replaceWith(...d.childNodes);}}
function bbCardSafe(C,g){try{return(typeof pwrStrip==='function'?pwrStrip(C.sp,g):'')+bbCardWrapped(C,g);}catch(e){console.warn(C.sp+' card',g.id,e);return`<div class="tkt"><b>${bbEsc(g.away.abbr)} @ ${bbEsc(g.home.abbr)}</b><div class="sub">Card failed to build: ${bbEsc(e&&e.message||e)}</div></div>`;}}
/* ── tabs ── */
const BB_OPEN={};
async function bbPan(sp,gid,k,btn){const C=bbC(sp);const el=document.getElementById(sp+'p-'+gid);if(!el)return;const key=sp+'|'+gid;
  if(BB_OPEN[key]===k&&btn){BB_OPEN[key]=null;el.classList.remove('on');el.innerHTML='';return;}
  BB_OPEN[key]=k;el.classList.add('on');el.innerHTML='<div class="empty">Loading…</div>';
  const g=[...C.games,...C.up].find(x=>x.id===gid);if(!g)return;const s=bbSim(C,g);
  try{el.innerHTML=await BB_PANELS[k](C,g,s);}catch(e){el.innerHTML=`<div class="sub">Couldn't load: ${bbEsc(e.message||e)}</div>`;}}
const bbTable=(head,rows)=>`<div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono';font-size:10px">
  <tr>${head.map(h=>`<th style="text-align:left;color:var(--mute);padding:3px 4px;border-bottom:1px solid var(--rule);white-space:nowrap">${h}</th>`).join('')}</tr>
  ${rows.map(r=>`<tr>${r.map(c=>`<td style="padding:3px 4px;border-bottom:1px solid var(--rule);white-space:nowrap">${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
/* A–G, one game: A my line · B outside range · C vs the market · D my picks · E props · F props vs market · G confidence */
function bbAG(C,g,s){const sp=C.sp,A=g.away.abbr,H=g.home.abbr,game=bbKey(g);const L=bbLinesFor(C,game,g.__date);const f=(m,sd)=>L.find(x=>x.market===m&&x.side===sd);
  let J=null;try{J=brainJudge(g,s,sp);}catch(e){}const pred=typeof predFor==='function'?predFor(sp,game):null;
  const spH=f('spread','home'),spA=f('spread','away'),ov=f('total','over'),un=f('total','under'),mlA=f('moneyline','away'),mlH=f('moneyline','home');
  const myLine=-(Math.round(s.margin*2)/2);const out=[];
  out.push(`<b>A) My line:</b> ${A} ${s.awayProj} – ${s.homeProj} ${H} · ${H} ${bbSgn(myLine)} · total ${s.total.toFixed(1)} · ${H} ${Math.round(s.hw*100)}% to win`);
  const rng=[['Model',s.awayProj,s.homeProj]];if(J)rng.push(['Judge',J.a,J.h]);if(pred)rng.push([pred.src==='covers'?'Covers':'Prediction',+pred.a,+pred.h]);
  out.push(`<b>B) Outside range:</b> ${rng.map(([n,a,h])=>`${n} ${(+a).toFixed(0)}–${(+h).toFixed(0)}`).join(' · ')}${rng.length>1?` → ${H} margin ${Math.min(...rng.map(x=>x[2]-x[1])).toFixed(1)} to ${Math.max(...rng.map(x=>x[2]-x[1])).toFixed(1)}`:''}`);
  const cm=[];if(spH&&spH.line!=null){const d=(+spH.line)-myLine;cm.push(`spread ${H} ${bbSgn(+spH.line)} vs my ${bbSgn(myLine)} → <b>${Math.abs(d).toFixed(1)} pts</b> of value on ${d>0?H:A}`);}
  if(ov&&ov.line!=null)cm.push(`total ${ov.line} vs my ${s.total.toFixed(1)} → <b>${s.total>+ov.line?'Over':'Under'}</b> by ${Math.abs(s.total-(+ov.line)).toFixed(1)}`);
  if(mlA&&mlH){const ka=imp(mlA.price),kh=imp(mlH.price),nv=kh/(ka+kh);cm.push(`moneyline: market ${H} ${Math.round(nv*100)}% vs my ${Math.round(s.hw*100)}%`);}
  out.push(`<b>C) Vs the market:</b> ${cm.join(' · ')||'no book line yet'}`);
  const cand=[];if(mlA&&mlH)cand.push({lab:`${A} ML`,p:s.aw,price:mlA.price},{lab:`${H} ML`,p:s.hw,price:mlH.price});
  if(spH&&spA)cand.push({lab:`${A} ${bbSgn(+spA.line)}`,p:s.awayCover(+spA.line),price:spA.price},{lab:`${H} ${bbSgn(+spH.line)}`,p:s.homeCover(+spH.line),price:spH.price});
  if(ov&&un)cand.push({lab:`Over ${ov.line}`,p:s.over(+ov.line),price:ov.price},{lab:`Under ${un.line}`,p:s.under(+un.line),price:un.price});
  const best=cand.map(x=>({...x,ev:bbEV(x.p,x.price)})).filter(x=>x.ev!=null).sort((a,b)=>b.ev-a.ev).slice(0,2);
  out.push(`<b>D) My picks:</b> ${best.length?best.map(x=>`${bbEsc(x.lab)} (${bbSgn(x.price)}) ${Math.round(x.p*100)}% · ${x.ev>=0?'+':''}${x.ev.toFixed(1)}% EV`).join(' · '):'no line to price'}`);
  let pr=[];try{pr=propLikely(sp,60).filter(x=>x.team===A||x.team===H).slice(0,4);}catch(e){}
  out.push(`<b>E) Props:</b> ${pr.length?pr.map(x=>{const f5=pstForm(sp,x.player,x.k,5);return`${bbEsc(x.player)} ${x.thr}+ ${x.k} ${Math.round(x.p*100)}%${f5?` (L5 ${f5.avg.toFixed(1)})`:''}`;}).join(' · '):'no player logs yet'}`);
  let pb=[];try{pb=propBoard(sp,game).slice(0,3);}catch(e){}
  out.push(`<b>F) Props vs the market:</b> ${pb.length?pb.map(x=>`${bbEsc(x.player)} ${x.thr} ${bbEsc(x.stat)} → model ${Math.round((x.pOver>=0.5?x.pOver:1-x.pOver)*100)}% ${x.pOver>=0.5?'over':'under'}`).join(' · '):'no prop lines uploaded'}`);
  let cf=null,who=[];try{pickConfIdx().forEach((o,k)=>{if(k.startsWith(sp+'|'+game+'|')&&o.n&&(cf==null||o.cf>cf)){cf=o.cf;who=o.who;}});}catch(e){}
  out.push(`<b>G) Confidence:</b> ${g.pre?'preseason — tracked for learning, never official':cf!=null?`<span style="color:var(--win)">${Math.round(cf*100)}% — official</span> (${who.map(v=>bbEsc(String(charName(v)).replace(/^The /,''))).join(', ')})`:'nothing on this game clears the 70% rule'}`);
  return`<div class="sub" style="line-height:1.75">${out.join('<br>')}</div>`;}
/* players: projections scaled to this game's team score, with last 5 / last 10 */
function bbPlayerRows(C,g,team,proj){const sp=C.sp;const P=(typeof pstTeam==='function'?pstTeam(sp,team,9):[]);if(!P.length)return[];
  let sum=0;const rows=P.map(x=>{const v=k=>{const J=pstProj(sp,x.name,k);return J?J.mu:null;};const pts=v('pts');if(pts)sum+=pts;
    return{x,pts,reb:v('reb'),ast:v('ast'),fg3:v('fg3'),f5:pstForm(sp,x.name,'pts',5),f10:pstForm(sp,x.name,'pts',10)};});
  const sc=sum>0?Math.min(1.25,Math.max(0.75,(proj*0.92)/sum)):1;   /* a top nine score ~92% of a team's points */
  return rows.map(r=>[bbEsc(r.x.name),r.pts!=null?(r.pts*sc).toFixed(1):'—',r.reb!=null?r.reb.toFixed(1):'—',r.ast!=null?r.ast.toFixed(1):'—',r.fg3!=null?r.fg3.toFixed(1):'—',
    r.f5?`<span style="color:${r.pts!=null&&r.f5.avg>r.pts*1.08?'var(--win)':r.pts!=null&&r.f5.avg<r.pts*0.9?'var(--rust)':'var(--chalk)'}">${r.f5.avg.toFixed(1)}</span>`:'—',r.f10?r.f10.avg.toFixed(1):'—']);}
const BB_PANELS={
  coach:(C,g,s)=>{try{return coachBriefing(g,s,C.sp)||'<div class="sub">Coach has no read on this game yet.</div>'}catch(e){return'<div class="sub">Coach has no read on this game yet.</div>'}},
  trends:(C,g)=>{const game=bbKey(g);const out=[];const d=g.__date||today();
    try{const I=(roGet(INTEL_KEY,[])||[]).filter(x=>x&&x.sp===C.sp&&x.game===game&&String(x.date||'').slice(0,10)===d);const T=I.filter(x=>x.kind==='trend'),K=I.filter(x=>x.kind==='cons');
      if(T.length)out.push('<div class="sub" style="margin-bottom:4px"><b>Trends</b></div>'+T.map(t=>{const m=String(t.text).match(/(\d+)-(\d+)/);const fade=m&&+m[1]<+m[2];return`<div class="sub" style="color:${fade?'var(--rust)':'var(--chalk)'}">• ${bbEsc(String(t.text||'').replace(/\[span_\d+\]\((?:start|end)_span\)/g,''))}${fade?' — fade':''}</div>`;}).join(''));
      if(K.length)out.push('<div class="sub" style="margin:6px 0 4px"><b>Consensus</b></div>'+K.map(c=>`<div class="sub">${c.market==='total'?`O ${c.overPct??'—'}% / U ${c.overPct!=null?100-c.overPct:'—'}%`:`${g.away.abbr} ${c.awayPct??'—'}% / ${g.home.abbr} ${c.homePct??'—'}%`} <span style="color:var(--mute)">${bbEsc(c.metric||'')}</span></div>`).join(''));}catch(e){}
    try{out.push(intelPicksFor(C.sp,game)||'');}catch(e){}
    /* what the results on file say on their own: form, rest, head to head this season */
    const own=[];[g.away.abbr,g.home.abbr].forEach(ab=>{const F=bbForm(C,ab,10);if(F)own.push(`${bbEsc(ab)} last ${F.n}: <b>${F.w}-${F.l}</b> · scoring ${F.pf.toFixed(1)}, allowing ${F.pa.toFixed(1)}`);});
    const H2=(bbIdx(C).T[g.away.abbr]||[]).filter(r=>!r[8]&&((r[1]===g.away.abbr&&r[2]===g.home.abbr)||(r[1]===g.home.abbr&&r[2]===g.away.abbr))).slice(-3).reverse();
    if(H2.length)own.push('Head to head: '+H2.map(r=>`${r[0].slice(5)} ${r[1]} ${r[3]}–${r[4]} ${r[2]}`).join(' · '));
    if(own.length)out.push('<div class="sub" style="margin:6px 0 4px"><b>From the results on file</b></div>'+own.map(x=>`<div class="sub">• ${x}</div>`).join(''));
    return out.join('')||'<div class="sub">No trends, consensus or outside picks uploaded for this game yet — paste a Covers doc in Intake.</div>';},
  ag:(C,g,s)=>bbAG(C,g,s),
  analysis:(C,g,s)=>typeof parPostGame==='function'?parPostGame(C.sp,g,s):'<div class="sub">No breakdown yet.</div>',
  alt:(C,g,s)=>{const A=g.away.abbr,H=g.home.abbr;const base=Math.round(s.margin*2)/2;const r=[];const st=C.sp==='ncaab'?[-5,-2.5,0,2.5,5]:[-6,-3,0,3,6];
    st.forEach(d=>{const l=-(base+d)||0.5;r.push([`${H} ${bbSgn(l)}`,(s.homeCover(l)*100).toFixed(0)+'%',bbSgn(bbFair(s.homeCover(l))),`${A} ${bbSgn(-l)}`,(s.awayCover(-l)*100).toFixed(0)+'%',bbSgn(bbFair(s.awayCover(-l)))]);});
    const tb=Math.round(s.total);const t=[];(C.sp==='ncaab'?[-8,-4,0,4,8]:[-10,-5,0,5,10]).forEach(d=>{const l=tb+d+0.5;t.push([l,(s.over(l)*100).toFixed(0)+'%',bbSgn(bbFair(s.over(l))),(s.under(l)*100).toFixed(0)+'%',bbSgn(bbFair(s.under(l)))]);});
    const pr=Object.keys(C.per).filter(k=>k!=='full').map(k=>{const x=bbSimFor(C,g,k);return[C.perLab[k].toLowerCase(),`${x.awayProj}–${x.homeProj}`,x.total.toFixed(1),Math.round(x.hw*100)+'%'];});
    return'<div class="sub">Model fair prices — compare against your book\'s alt board.</div>'+bbTable(['home','model','fair','away','model','fair'],r)+bbTable(['total','over','fair','under','fair'],t)+bbTable(['period','model score','total',H+' win'],pr);},
  roster:async(C,g)=>rosterPanel(C.sp,g),   /* v2.36 · the shared roster: injuries, numbers, 70%+ lines; loads logs on open */
  props:(C,g)=>{const sp=C.sp,game=bbKey(g);let h='';try{h+=propBoardHtml(sp,game,20)||'';}catch(e){}
    try{const L=propLikely(sp,60).filter(x=>x.team===g.away.abbr||x.team===g.home.abbr);if(L.length)h+='<div class="mktlab">Likely outcomes (from game logs)</div>'+L.map(x=>{const f5=pstForm(sp,x.player,x.k,5),f10=pstForm(sp,x.player,x.k,10);
      return`<div class="mono" style="font-size:10.5px;padding:3px 0;border-bottom:1px solid var(--rule)"><b>${bbEsc(x.player)}</b> ${bbEsc(x.team)} · <b>${x.thr}+ ${x.k}</b> · <span style="color:var(--win)">${Math.round(x.p*100)}%</span> · avg ${x.mu.toFixed(1)}${f5?` · L5 <b>${f5.avg.toFixed(1)}</b> (${f5.hit(x.thr)}/${f5.n} cleared)`:''}${f10?` · L10 ${f10.avg.toFixed(1)} (${f10.hit(x.thr)}/${f10.n})`:''}</div>`;}).join('');}catch(e){}
    try{h+=pstCardHtml(sp,g)||'';}catch(e){}
    return h||`<div class="sub">No player data yet — paste ${C.lab} prop lines (PROP: Name PTS 24.5 (-110/-110)) and the app pulls each player's game log.</div>`;},
  box:(C,g,s)=>{const L=bbLive(C,g);const pa=L?L.projA:s.awayProj,ph=L?L.projH:s.homeProj;
    const head=['PTS','REB','AST','3PM','L5 pts','L10 pts'];
    const side=(ab,proj)=>{const rows=bbPlayerRows(C,g,ab,proj);return rows.length?bbTable([bbEsc(ab)+' '+proj.toFixed(0),...head],rows):`<div class="sub">${bbEsc(ab)}: no player logs yet — they fill in as box scores and game logs arrive.</div>`;};
    let lines;if(C.sp==='ncaab'){const h1=bbSimFor(C,g,'h1');lines=[['1st half',h1.awayProj,h1.homeProj],['2nd half',(s.awayProj-h1.awayProj).toFixed(1),(s.homeProj-h1.homeProj).toFixed(1)]];}
    else{const q1=bbSimFor(C,g,'q1'),h1=bbSimFor(C,g,'h1');const h2a=s.awayProj-h1.awayProj,h2h=s.homeProj-h1.homeProj;
      lines=[['Q1',q1.awayProj,q1.homeProj],['Q2',(h1.awayProj-q1.awayProj).toFixed(1),(h1.homeProj-q1.homeProj).toFixed(1)],['Q3',(h2a*0.49).toFixed(1),(h2h*0.49).toFixed(1)],['Q4',(h2a*0.51).toFixed(1),(h2h*0.51).toFixed(1)],['1st half',h1.awayProj,h1.homeProj],['2nd half',h2a.toFixed(1),h2h.toFixed(1)]];}
    lines.push(['Final',s.awayProj,s.homeProj]);
    return`<div class="sub">Projected ${bbEsc(g.away.abbr)} ${pa.toFixed(1)} – ${ph.toFixed(1)} ${bbEsc(g.home.abbr)}${L?' (live: the score now + the rest of the game)':''}. Player lines are form-weighted and scaled to the team's projection; L5 / L10 = his last 5 and 10 games.</div>`+
      bbTable(['',bbEsc(g.away.abbr),bbEsc(g.home.abbr)],lines)+side(g.away.abbr,pa)+side(g.home.abbr,ph);},
  verdict:(C,g,s)=>{let v=null;try{v=takeFadeVerdict(g,s,C.sp)}catch(e){}if(!v)return'<div class="sub">No take/fade read yet.</div>';
    return`<div class="sub"><b>${bbEsc(v.verdict)}</b>${!(v.reasons||[]).length?' — no strong take or fade signals on this game.':''}</div>`+(v.reasons||[]).map(x=>`<div class="sub">• ${bbEsc(typeof x==='string'?x:(x.text||''))}</div>`).join('');},
  live:async(C,g)=>{const j=await fetch(C.espn+'/summary?event='+g.id).then(r=>r.json()).catch(()=>null);if(!j)return'<div class="sub">Box score unavailable.</div>';
    const box=fbpParseBasketball(j);if(box&&box.state==='post'&&!g.pre)try{box.date=g.start;pstatFeed(C.sp,String(g.id),box);}catch(e){}
    const np=Math.max((g.lsA||[]).length,(g.lsH||[]).length);const lab=i=>C.sp==='ncaab'?(i<2?(i?'2H':'1H'):'OT'+(i>2?i-1:'')):(i<4?'Q'+(i+1):'OT'+(i>4?i-3:''));
    let h=np?bbTable(['',...Array.from({length:np},(_,i)=>lab(i)),'T'],[g.away,g.home].map((t,i)=>[bbEsc(t.abbr),...((i?g.lsH:g.lsA)||[]),i?g.homeScore:g.awayScore])):'';
    const want=['MIN','PTS','REB','AST','3PT','FG','STL','BLK','TO','+/-'];
    h+=Object.entries((box&&box.teams)||{}).map(([ab,t])=>{const P=(t.players||[]).filter(p=>p.MIN&&p.MIN!=='0'&&p.MIN!=='--');const cols=want.filter(c=>P.some(p=>p[c]!=null&&p[c]!==''));
      return P.length?bbTable([bbEsc(ab),...cols],P.map(p=>[bbEsc(p.name),...cols.map(c=>bbEsc(p[c]==null?'':p[c]))])):'';}).join('');
    return h||'<div class="sub">No box score yet.</div>';},
  mybets:(C,g)=>{const game=bbKey(g);const rows=[];
    (get(LS.locked,[])||[]).forEach(t=>(t.legs||[]).forEach(l=>{if((l.sport||'')!==C.sp||l.game!==game)return;let b='';try{b=gradeLegBadge(l,t.date)}catch(e){}
      rows.push(`<div class="sub">${bbEsc(t.name||'Ticket')}: <b>${bbEsc(l.pick)}</b> ${l.price!=null?'('+bbSgn(l.price)+')':''} ${b}</div>`);}));
    return rows.join('')||'<div class="sub">No locked tickets have a leg on this game.</div>';}};
/* ── snapshot (system picks), finals, record ──────────────────────────────── */
function bbSnapshot(C){const arc=get(C.arc,{})||{},d=today(),day=arc[d]||(arc[d]={rows:[]});let ch=false;
  C.games.forEach(g=>{if(g.abstract!=='pre'||g.pre||!bbWorkable(C.sp,g))return;const s=bbSim(C,g),game=bbKey(g);const L=bbLinesFor(C,game);const f=(m,sd)=>L.find(x=>x.market===m&&x.side===sd);
    let row=day.rows.find(r=>r.gid===g.id);if(row&&row.lk)return;if(!row){row={gid:g.id,game,picks:[]};day.rows.push(row);}
    try{const J=brainJudge(g,s,C.sp);if(J)row.judge=brainLockable(J);}catch(e){}
    const cand=[];const mlA=f('moneyline','away'),mlH=f('moneyline','home'),spA=f('spread','away'),spH=f('spread','home'),ov=f('total','over'),un=f('total','under');
    if(mlA&&mlH)cand.push({m:'ml',side:'away',price:mlA.price,p:s.aw},{m:'ml',side:'home',price:mlH.price,p:s.hw});
    if(spA&&spH)cand.push({m:'spread',side:'away',line:+spA.line,price:spA.price,p:s.awayCover(+spA.line)},{m:'spread',side:'home',line:+spH.line,price:spH.price,p:s.homeCover(+spH.line)});
    if(ov&&un)cand.push({m:'total',side:'over',line:+ov.line,price:ov.price,p:s.over(+ov.line)},{m:'total',side:'under',line:+un.line,price:un.price,p:s.under(+un.line)});
    row.picks=['ml','spread','total'].map(m=>{const c=cand.filter(x=>x.m===m).map(x=>({...x,p:+x.p.toFixed(4),ev:+bbEV(x.p,x.price).toFixed(2)})).sort((a,b)=>b.ev-a.ev)[0];return c&&c.ev>=2?c:null;}).filter(Boolean);
    if(s.frozen)row.lk=1;ch=true;});
  if(ch){Object.keys(arc).sort().slice(0,-(C.sp==='ncaab'?60:120)).forEach(k=>delete arc[k]);set(C.arc,arc);}}
function bbArchiveFinals(C){const arc=get(C.arc,{})||{},d=today(),day=arc[d];let ch=false;
  if(day)C.games.forEach(g=>{if(g.abstract!=='post'||g.awayScore==null)return;const r=day.rows.find(x=>x.gid===g.id);if(!r||r.final)return;r.final={a:+g.awayScore,h:+g.homeScore,h1a:g.h1a,h1h:g.h1h};ch=true;});
  if(ch)set(C.arc,arc);bbRecordResults(C,C.games);if(ch)try{brainLearn(C.sp);}catch(e){}}
function bbArchiveBackfill(C,G){const arc=get(C.arc,{})||{};const by={};G.forEach(g=>{by[g.id]=g;});let n=0;
  Object.keys(arc).forEach(d=>(arc[d].rows||[]).forEach(r=>{if(r.final)return;const g=by[String(r.gid)];if(!g||g.abstract!=='post'||g.awayScore==null)return;r.final={a:+g.awayScore,h:+g.homeScore,h1a:g.h1a,h1h:g.h1h};n++;}));
  if(n){set(C.arc,arc);try{brainLearn(C.sp);}catch(e){}}return n;}
function bbRecordHtml(sp){const C=bbC(sp);const arc=get(C.arc,{})||{};const T={ml:{W:0,L:0,P:0,u:0},spread:{W:0,L:0,P:0,u:0},total:{W:0,L:0,P:0,u:0}};let pend=0;
  Object.values(arc).forEach(D=>(D.rows||[]).forEach(r=>(r.picks||[]).forEach(p=>{if(!r.final){pend++;return;}const a=r.final.a,h=r.final.h;let res=null;
    if(p.m==='ml')res=a===h?null:(p.side==='home')===(h>a);else if(p.m==='total'){const t=a+h;res=t===p.line?null:(p.side==='over')===(t>p.line);}else{const m=(p.side==='home'?h-a:a-h)+p.line;res=m===0?null:m>0;}
    const b=T[p.m];if(res===null)b.P++;else if(res){b.W++;b.u+=bbDec(+p.price)-1;}else{b.L++;b.u-=1;}})));
  const lab={ml:'Moneyline',spread:'Spread',total:'Total'};const col=(w,l)=>{const n=w+l;if(!n)return'var(--mute)';const p=w/n;return typeof recColor==='function'?recColor(p,n):(p>=0.6?'var(--win)':p<0.5?'var(--rust)':'var(--chalk)');};
  return`<div class="tkt hi"><h3>${C.name} system picks — best-EV side per market (≥2% EV, locked pregame)</h3>`+Object.entries(T).map(([k,b])=>`<div class="sub">${lab[k]}: <b style="color:${col(b.W,b.L)}">${b.W}-${b.L}${b.P?'-'+b.P:''}</b> · ${b.u>=0?'+':''}${b.u.toFixed(2)}u</div>`).join('')+
    (pend?`<div class="sub" style="color:var(--mute)">${pend} pick${pend>1?'s':''} waiting on finals</div>`:'')+`<div class="sub mono" style="font-size:9.5px;color:var(--mute)">${bbEsc(BB_STATUS[sp].res||'')}</div></div>`;}
function renderBBRecord(sp){const nav=document.getElementById('gradeNav');if(nav)nav.innerHTML=`<button class="on">🏀 ${bbC(sp).lab} record</button>`;
  const body=document.getElementById('gradeBody');if(!body)return;let h=bbRecordHtml(sp);try{h+=voicesReport(sp)}catch(e){}try{h+=intelReport(sp)}catch(e){}body.innerHTML=h;}
/* ── the board ────────────────────────────────────────────────────────────── */
const BB_VIEW={nba:{f:'all',q:'',n:12},ncaab:{f:'lined',q:'',n:10}};
function bbFilterGames(C){const V=BB_VIEW[C.sp];const q=String(V.q||'').trim().toUpperCase();let G=C.games.slice();
  if(q)return G.filter(g=>[g.away.abbr,g.home.abbr,g.away.name,g.home.name,g.away.displayName,g.home.displayName].some(x=>String(x||'').toUpperCase().includes(q)));
  if(V.f==='lined')G=G.filter(g=>bbLinesFor(C,bbKey(g),g.__date).length);else if(V.f==='top')G=G.filter(g=>g.away.rank||g.home.rank);else if(V.f==='live')G=G.filter(g=>g.abstract==='in');
  return G;}
function bbSetView(sp,k,v){const V=BB_VIEW[sp];V[k]=v;if(k!=='n')V.n=sp==='ncaab'?10:12;bbRender(sp);}
let BB_QT=null;function bbSearch(sp,v){clearTimeout(BB_QT);BB_QT=setTimeout(()=>{BB_VIEW[sp].q=v;BB_VIEW[sp].n=10;bbRender(sp,true);},250);}
function bbRender(sp,keepFocus){const C=bbC(sp);const el=document.getElementById('slate');if(!el)return;
  if(typeof ACTIVE_SPORT!=='undefined'&&ACTIVE_SPORT!==sp)return;
  ['nflPowerWarn','cfbPowerWarn'].forEach(id=>{const w=document.getElementById(id);if(w)w.style.display='none';});
  const nG=document.getElementById('nG');if(nG)nG.textContent=C.games.length||'';
  const St=BB_STATUS[sp];let h=`<div class="sub" style="font-family:'IBM Plex Mono';font-size:10px;margin:0 3px 8px">🏀 ${bbEsc(St.sched)} · ${bbEsc(St.ratings)}${St.res?' · '+bbEsc(St.res):''}</div>`;
  const y=window.scrollY,open={...BB_OPEN};const V=BB_VIEW[sp];
  if(sp==='ncaab'||C.games.length>16){
    const n=k=>{const s=V.f,q=V.q;V.f=k;V.q='';const c=bbFilterGames(C).length;V.f=s;V.q=q;return c;};
    const qv=bbEsc(V.q||'');const chip=(k,l)=>`<button class="${V.f===k&&!V.q?'on':''}" onclick="bbSetView('${sp}','f','${k}')">${l} <span class="mono" style="font-size:9px">${n(k)}</span></button>`;
    h+=`<div class="subnav" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">${chip('lined','With lines')}${chip('top','Top 25')}${chip('live','Live')}${chip('all','All')}
      <input id="bbQ-${sp}" type="search" placeholder="Find a team" value="${qv}" oninput="bbSearch('${sp}',this.value)" style="flex:1;min-width:120px;background:var(--panel2);color:var(--chalk);border:1px solid var(--rule);border-radius:8px;padding:6px 10px;font-size:13px"></div>`;}
  lzBegin(3);const G=bbFilterGames(C);const order={in:0,pre:1,post:2};G.sort((a,b)=>order[a.abstract]-order[b.abstract]||String(a.start).localeCompare(String(b.start)));
  const full=g=>g.abstract!=='post'||BB_EXP[sp].has(g.id);let shown=0;const lim=V.n;
  [['in','LIVE'],['pre','TODAY'],['post','FINAL']].forEach(([k,l])=>{const L=G.filter(g=>g.abstract===k);if(!L.length)return;h+=`<div class="mktlab">${l} · ${L.length}</div>`;
    L.forEach(g=>{if(full(g)&&shown<lim){shown++;const ok=Object.keys(open).some(k=>open[k]&&k.indexOf(String(g.id))>=0||open[k]&&k.indexOf(bbKey(g))>=0);h+=lzCard(sp+':'+g.id,()=>bbCardSafe(C,g),bbRow(C,g),ok);}else h+=bbRow(C,g);});});
  if(!C.games.length)h+=`<div class="empty" style="padding:10px 0">No ${C.lab} games today.${C.up.length?' Next games below.':' Nothing scheduled yet — the board fills in as the schedule posts.'}${(sp==='nba'?NBA_LOAD_NOTE:NCAAB_LOAD_NOTE)?`<div class="mono" style="font-size:9.5px;color:var(--mute);margin-top:4px">${bbEsc(sp==='nba'?NBA_LOAD_NOTE:NCAAB_LOAD_NOTE)}</div>`:''}</div>`;
  else if(!G.length)h+=`<div class="empty" style="padding:10px 0">Nothing matches — try All.</div>`;
  if(G.filter(full).length>lim)h+=`<div class="bar" style="margin:4px 0 12px"><button onclick="bbSetView('${sp}','n',${lim+(sp==='ncaab'?10:12)})">Show ${sp==='ncaab'?10:12} more games</button></div>`;
  const days=[...new Set(C.up.map(g=>g.__date))].sort();
  days.slice(0,sp==='ncaab'?1:C.upDays).forEach(d=>{const U=C.up.filter(g=>g.__date===d);const show=sp==='ncaab'&&!V.q?U.filter(g=>g.away.rank||g.home.rank||bbLinesFor(C,bbKey(g),d).some(x=>x.src!=='espn')).slice(0,25):U;
    h+=`<div class="mktlab">UPCOMING · ${new Date(d+'T12:00:00').toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})} · ${U.length} game${U.length>1?'s':''}${show.length<U.length?` (showing ${show.length}: ranked teams and games you have lines on)`:''}</div>`+
      show.map(g=>BB_EXP[sp].has(g.id)?bbCardSafe(C,g):bbRow(C,g)).join('');});
  el.innerHTML=h;lzFlush();Object.entries(open).forEach(([k,v])=>{if(!v||!k.startsWith(sp+'|'))return;BB_OPEN[k]=null;bbPan(sp,k.slice(sp.length+1),v,null);});
  if(keepFocus){const q=document.getElementById('bbQ-'+sp);if(q){q.focus();try{q.setSelectionRange(q.value.length,q.value.length);}catch(e){}}}else window.scrollTo(0,y);
  deskChores('bb-'+sp,[()=>bbSnapshot(C),()=>bbArchiveFinals(C),()=>syncFinalsToShared(),()=>voicesLog(sp),()=>gradeVoices(),()=>gradeIntel(),()=>{if(typeof todaySnapshotSoon==='function')todaySnapshotSoon();}]);}
/* ── live loop + boot ─────────────────────────────────────────────────────── */
const BB_LIVE_T={};
function bbLiveLoop(sp){const C=bbC(sp);if(BB_LIVE_T[sp])clearInterval(BB_LIVE_T[sp]);
  BB_LIVE_T[sp]=setInterval(async()=>{if(document.hidden||(typeof ACTIVE_SPORT!=='undefined'&&ACTIVE_SPORT!==sp))return;
    if(!C.games.some(g=>g.abstract==='in'||(g.abstract==='pre'&&Date.parse(g.start)-Date.now()<15*60e3)))return;
    const q=document.activeElement&&document.activeElement.id==='bbQ-'+sp;await bbLoadSchedule(C).catch(()=>{});bbRender(sp,q);},45e3);}
async function bbBoot(sp,force){const C=bbC(sp);bbRestoreRatings(C);if(bbLoadCached(C))bbRender(sp);
  try{await bbLoadTeams(C);}catch(e){}
  try{await bbLoadRatings(C,force);}catch(e){console.warn(sp+' ratings',e);BB_STATUS[sp].ratings='ratings load failed';}
  try{await bbLoadSchedule(C);}catch(e){console.warn(sp+' schedule',e);const n='schedule load failed: '+(e&&e.message||e);if(sp==='nba')NBA_LOAD_NOTE=n;else NCAAB_LOAD_NOTE=n;}
  Object.keys(C.sims).forEach(k=>delete C.sims[k]);try{bbLockJudge(sp);}catch(e){}try{syncFinalsToShared();}catch(e){}bbRender(sp);
  bbBackfill(C,force).then(n=>{if(n){Object.keys(C.sims).forEach(k=>delete C.sims[k]);bbRender(sp);}}).catch(()=>{});
  try{brainLearnAll(true);}catch(e){}try{if(typeof intakeReplay==='function')intakeReplay()}catch(e){}bbLiveLoop(sp);}
/* ── the Judge's adapter + its ledger ─────────────────────────────────────── */
function bbBrainAdapter(sp){const C=bbC(sp);const I=()=>(roGet(INTEL_KEY,[],30e3)||[]).filter(x=>x&&x.sp===sp&&String(x.date||'').slice(0,10)===today());
  return{key:g=>bbKey(g),lines:g=>bbLinesFor(C,bbKey(g),g.__date),flat:()=>!Object.keys(C.rt).length&&!Object.keys((bbLearned(C)||{}).teams||{}).length,
    sim:s=>s&&s.awayProj!=null?{a:+s.awayProj,h:+s.homeProj}:null,
    trends:g=>I().filter(x=>x.kind==='trend'&&x.game===bbKey(g)).map(x=>({text:String(x.text||''),team:x.team||null})),
    cons:()=>I().filter(x=>x.kind==='cons').map(x=>({game:x.game,market:x.market==='ml'?'moneyline':x.market,metric:x.metric,homePct:x.homePct,awayPct:x.awayPct})),
    snap:x=>Math.max(0,Math.round(x)),
    market:(g,lines)=>{const to=lines.find(x=>x.market==='total'&&x.side==='over'),spl=lines.find(x=>x.market==='spread'&&x.side==='home');
      if(!to||to.line==null||!spl||spl.line==null)return null;const T=+to.line,L=+spl.line;return{a:(T+L)/2,h:(T-L)/2};},
    /* the Judge's predicted box: points by quarter (NBA) or half (college) */
    box:(A,H)=>{const F=sp==='nba'?[0.25,0.25,0.245,0.255]:[0.48,0.52];const t=x=>{const p=F.map(f=>Math.round(x*f));p[p.length-1]+=Math.round(x)-p.reduce((a,b)=>a+b,0);return{p:p.join('-'),pts:Math.round(x)};};return{away:t(A),home:t(H)};},
    boxCols:[[sp==='nba'?'Q1-Q2-Q3-Q4':'1H-2H','p'],['PTS','pts']],boxStats:[]};}
function bbLockJudge(sp){const C=bbC(sp);const d=today(),L=get(C.judge,{})||{};L[d]=L[d]||{};let ch=false;
  C.games.forEach(g=>{if(g.abstract!=='pre'||g.pre||!bbWorkable(sp,g)||(L[d][g.id]&&(L[d][g.id].final||L[d][g.id].lk)))return;const s=bbSim(C,g);let J=null;try{J=brainJudge(g,s,sp);}catch(e){}
    const lock=J?brainLockable(J):{a:s.awayProj,h:s.homeProj,w:[{src:'sim',a:s.awayProj,h:s.homeProj}]};lock.box=null;L[d][g.id]={game:bbKey(g),...lock,ts:Date.now(),...(s.frozen?{lk:1}:{})};ch=true;});
  if(ch){Object.keys(L).sort().slice(0,-(sp==='ncaab'?21:45)).forEach(k=>delete L[k]);set(C.judge,L);}}
/* ── the master evaluation (same shape as hockey and football) ── */
function bbEvalInputs(sp){const C=bbC(sp);const G=(C.games||[]).filter(g=>!g.pre);let book=0,espn=0,lined=0;G.forEach(g=>{const L=bbLinesFor(C,bbKey(g));if(L.length)lined++;L.forEach(x=>{x.src==='espn'?espn++:book++});});
  const d=today();const I=(roGet(INTEL_KEY,[])||[]).filter(x=>x.sp===sp&&String(x.date||'').slice(0,10)===d);const P=((get('d4.preds',{})||{})[sp]||{})[d]||{};
  let brain=0;try{brain=(brainGet(sp).log||[]).length;}catch(e){}
  return{games:G.length,sims:G.length,lined,book,espn,rated:Object.keys(C.rt).length,finals:Object.keys(bbRes(C)).length,preds:Object.keys(P).length,trends:I.filter(x=>x.kind==='trend').length,cons:I.filter(x=>x.kind==='cons').length,brain};}
function runBasketballEval(sp){const C=bbC(sp);try{if(typeof evalPrep==='function')evalPrep(sp);}catch(e){console.warn('eval prep',e);}
  const evals=[];let skipped=0;C.games.forEach(g=>{if(g.abstract!=='pre')return;if(g.pre){skipped++;return;}if(!bbWorkable(sp,g))return;const k=bbKey(g);const L=bbLinesFor(C,k);if(!L.length)return;const s=bbSim(C,g);
    let J=null;try{J=brainJudge(g,s,sp)}catch(e){}const pred=typeof predFor==='function'?predFor(sp,k):null;let tr={dMar:0,dTot:0};try{tr=brainTrendEvidence(g,sp)||tr;}catch(e){}
    let mo=null;try{mo=brainMoney(g,sp)}catch(e){}const A=g.away.abbr,H=g.home.abbr,mkts=[];const f=(m,sd)=>L.find(x=>x.market===m&&x.side===sd);
    const add=(market,label,p,price,sig)=>{if(p==null||price==null)return;mkts.push({market,label,p,price,ev:bbEV(p,price),sig});};
    const sideSig=(hs,ln)=>{const sig=[];if(J){const mu=J.h-J.a;sig.push({src:'Judge',ok:ln==null?(hs?mu>0:mu<0):(hs?mu+ln>0:-mu+ln>0),detail:`${A} ${J.a}–${J.h} ${H}`});}
      if(pred){const m=pred.h-pred.a;sig.push({src:'Prediction',ok:ln==null?(hs?m>0:m<0):(hs?m+ln>0:-m+ln>0),detail:`${pred.a}–${pred.h}`});}
      if(Math.abs(tr.dMar||0)>=0.1)sig.push({src:'Trends',ok:(tr.dMar>0)===hs,detail:(tr.dMar>0?H:A)+' lean'});if(mo&&mo.side)sig.push({src:'Sharp money',ok:(mo.side>0)===hs,detail:mo.note});return sig;};
    const totSig=(ov,ln)=>{const sig=[];if(J){const t=J.a+J.h;sig.push({src:'Judge',ok:ov?t>ln:t<ln,detail:`total ${t.toFixed(1)}`});}if(pred){const t=+pred.a+ +pred.h;sig.push({src:'Prediction',ok:ov?t>ln:t<ln,detail:`total ${t.toFixed(1)}`});}
      if(Math.abs(tr.dTot||0)>=0.1)sig.push({src:'Trends',ok:(tr.dTot>0)===ov,detail:(tr.dTot>0?'Over':'Under')+' lean'});return sig;};
    {const a=f('moneyline','away'),h=f('moneyline','home');if(a&&h){const ea=bbEV(s.aw,a.price),eh=bbEV(s.hw,h.price);const hs=eh>=ea;add('ml',`${hs?H:A} ML`,hs?s.hw:s.aw,hs?h.price:a.price,[{src:'Model',ok:true,detail:`${Math.round((hs?s.hw:s.aw)*100)}%`},...sideSig(hs,null)]);}}
    {const a=f('spread','away'),h=f('spread','home');if(a&&h){const pa=s.awayCover(+a.line),ph=s.homeCover(+h.line);const hs=bbEV(ph,h.price)>=bbEV(pa,a.price);const o=hs?h:a;
      add('spread',`${hs?H:A} ${bbSgn(+o.line)}`,hs?ph:pa,o.price,[{src:'Model',ok:true,detail:`${Math.round((hs?ph:pa)*100)}%`},...sideSig(hs,+o.line)]);}}
    {const o=f('total','over'),u=f('total','under');if(o&&u){const po=s.over(+o.line),pu=s.under(+u.line);const ov=bbEV(po,o.price)>=bbEV(pu,u.price);
      add('total',`${ov?'Over':'Under'} ${o.line}`,ov?po:pu,ov?o.price:u.price,[{src:'Model',ok:true,detail:`${Math.round((ov?po:pu)*100)}%`},...totSig(ov,+o.line)]);}}
    mkts.forEach(m=>{const others=m.sig.slice(1),agree=others.filter(x=>x.ok).length,against=others.length-agree;m.agree=agree;m.against=against;m.suspect=m.ev>12;
      m.verdict=m.suspect?'split':m.ev>=3&&agree>=2&&against===0?'strong':m.ev>=1.5&&agree>=against?'lean':m.ev<0?'away':'split';});
    const rank={strong:0,lean:1,split:2,away:3};mkts.sort((a,b)=>rank[a.verdict]-rank[b.verdict]||b.ev-a.ev);if(mkts.length)evals.push({game:k,mkts,best:mkts[0],judge:J?{a:J.a,h:J.h}:null});});
  set(C.evalKey,{date:today(),ts:Date.now(),fingerprint:JSON.stringify(bbEvalInputs(sp)),evals,skipped});
  try{evalLockMark(sp);}catch(e){}try{renderRecordsHub()}catch(e){}try{renderTickets()}catch(e){}return evals;}
function renderBasketballEval(sp){const C=bbC(sp);const I=bbEvalInputs(sp);let run=get(C.evalKey,null);if(run&&run.date!==today())run=null;const stale=run&&run.fingerprint!==JSON.stringify(I);
  const chip=(ok,label,n)=>`<div style="display:flex;align-items:center;gap:6px;font-size:12px"><span style="width:7px;height:7px;border-radius:50%;background:${ok?'var(--win)':'var(--rule)'};flex:0 0 auto"></span><span style="color:${ok?'var(--chalk)':'var(--mute)'}">${label}</span><span class="m">${n}</span></div>`;
  const t=x=>new Date(x).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  const status=!run?`<div class="note" style="border-left:3px solid var(--gold);padding-left:10px"><b style="color:var(--gold)">Not evaluated yet.</b> The one-tap master evaluation on Today runs every sport at once.</div>`
    :stale?`<div class="note" style="border-left:3px solid var(--gold);padding-left:10px"><b style="color:var(--gold)">Inputs changed since the last run</b> (${t(run.ts)}).</div>`
    :`<div class="note" style="border-left:3px solid var(--win);padding-left:10px"><b style="color:var(--win)">✓ Evaluated ${t(run.ts)}</b> — ${run.evals.length} games with lines${run.skipped?` · ${run.skipped} preseason game${run.skipped>1?'s':''} left out (learning only)`:''}.</div>`;
  const feed=`<div class="tkt hi"><h3>${C.name} master evaluation</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 14px">
      ${chip(I.games>0,'Games',I.games)}${chip(I.book+I.espn>0,'Book lines',I.book+(I.espn?' +'+I.espn+' ESPN':''))}${chip(I.rated>0,'Team ratings',I.rated+' teams')}${chip(I.finals>0,'Finals on file',I.finals)}
      ${chip(I.preds>0,'Predicted scores',I.preds)}${chip(I.trends>0,'Trends',I.trends)}${chip(I.cons>0,'Public consensus',I.cons)}${chip(I.brain>0,'Judge (graded games)',I.brain)}</div>
    <div class="bar" style="margin-top:11px"><button class="primary" onclick="runBasketballEval('${sp}');renderRecordsHub()">${run&&!stale?'Re-run evaluation':'Run evaluation'}</button></div></div>${status}`;
  if(!run||!run.evals.length)return feed+(run?`<div class="empty">No regular-season ${C.lab} games with book lines yet.</div>`:'');
  const pc=x=>Math.round(x*100)+'%';
  return feed+run.evals.map(e=>{const B=e.best||{};const V=VERDICT[B.verdict||'split'];return`<div class="tkt" style="border-left:3px solid ${V.color}"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><div style="font-family:'Archivo';font-weight:900;font-size:16px">${bbEsc(e.game)}</div><div style="font-weight:800;font-size:11px;color:${V.color}">${V.label} · ${bbEsc(B.label||'')}</div></div>
    ${e.mkts.map(m=>`<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--hair)"><div style="display:flex;justify-content:space-between;font-size:12.5px"><b>${bbEsc(m.label)} <span class="m">(${bbSgn(m.price)})</span></b><span style="color:${VERDICT[m.verdict].color};font-weight:700">${VERDICT[m.verdict].label} · ${pc(m.p)} · ${m.ev>=0?'+':''}${m.ev.toFixed(1)}% EV</span></div>
      ${m.sig.map(x=>`<div style="display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0"><span style="color:var(--mute)">${bbEsc(x.src)}</span><span style="color:${x.ok?'var(--chalk)':'var(--rust)'};font-weight:600">${x.ok?'':'✗ '}${bbEsc(x.detail)}</span></div>`).join('')}</div>`).join('')}</div>`;}).join('');}
/* ── the names every page and every test knows ────────────────────────────── */
function nbaSimFor(g,period){return bbSimFor(BB_CFG.nba,g,period);}
function nbaLive(g){return bbLive(BB_CFG.nba,g);}
function nbaParseEvent(ev){return bbParseEvent(BB_CFG.nba,ev);}
function nbaCard(g){return bbCard(BB_CFG.nba,g);}
function nbaPan(gid,k,btn){return bbPan('nba',gid,k,btn);}
function renderNBA(){return bbRender('nba');}
async function nbaBoot(force){return bbBoot('nba',force);}
async function loadNBAScoreboard(){return bbLoadSchedule(BB_CFG.nba);}
async function loadNBARatings(){return bbLoadRatings(BB_CFG.nba);}
function nbaBookLinesFor(game,date){return bbLinesFor(BB_CFG.nba,game,date);}
function saveNBABookOdds(picks,el){return bbSaveOdds('nba',picks,el);}
function parseNBASlateText(text){return bbParseSlate('nba',text);}
function nbaBrainAdapter(){return bbBrainAdapter('nba');}
function nbaLockJudge(){return bbLockJudge('nba');}
function renderNBAMasterEval(){return renderBasketballEval('nba');}
function renderNBARecord(){return renderBBRecord('nba');}
function ncaabSimFor(g,period){return bbSimFor(BB_CFG.ncaab,g,period);}
function ncaabCard(g){return bbCard(BB_CFG.ncaab,g);}
function renderNCAAB(){return bbRender('ncaab');}
async function ncaabBoot(force){return bbBoot('ncaab',force);}
function ncaabBookLinesFor(game,date){return bbLinesFor(BB_CFG.ncaab,game,date);}
function saveNCAABBookOdds(picks,el){return bbSaveOdds('ncaab',picks,el);}
function parseNCAABSlateText(text){return bbParseSlate('ncaab',text);}
function ncaabBrainAdapter(){return bbBrainAdapter('ncaab');}
function ncaabLockJudge(){return bbLockJudge('ncaab');}
function renderNCAABMasterEval(){return renderBasketballEval('ncaab');}
function renderNCAABRecord(){return renderBBRecord('ncaab');}
