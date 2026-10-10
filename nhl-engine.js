/* ═══════════════════════════════════════════════════════════════════════════
   NHL ENGINE — nhl.html only. Same contract as football-engine.js:
   shared.js owns intake, tickets, grading, voices, Judge, Coach, records
   plumbing; this file owns everything that is specifically hockey.

   Data sources (all free, no key): ESPN scoreboard (slate, live score,
   periods, free lines), ESPN standings (team goal rates, current + prior
   season), ESPN byathlete (player season stats for props), ESPN roster,
   ESPN summary (live box → prop grading). The Odds API (your existing key)
   for live lines. Your own uploaded lines ALWAYS outrank both.

   ESPN response shapes below were written defensively from the documented
   formats and mirror the football parsers; every loader reports its status
   on the page rather than failing silently, same as the NFL season-stats
   loader. Verify on device the first night pucks drop.
   ═══════════════════════════════════════════════════════════════════════════ */

let NHL_UPCOMING=[],NHL_GAMES=[],NHL_SIMS={},NHL_BOX_CACHE={},NHL_RATINGS=null,NHL_PLAYERS=null,NHL_ROSTERS={},NHL_FLAT=true;
let NHL_STATUS={sched:'not loaded',ratings:'not loaded',players:'not loaded'};
const NHL_LS={games:'d4.nhlgames',shots:'d4.nhlshots',ratings:'d4.nhlratings',players:'d4.nhlplayers',arc:'d4.nhlarc',
  ext:'d4.nhlext',trends:'d4.nhltrends',cons:'d4.nhlconsensus'};
const NHL_LG=3.05;            // league goals per team per game (fallback)
const NHL_HOME=1.04;          // home-ice multiplier on expected goals
const NHL_P1=0.31;            // share of regulation goals scored in period 1

/* ── Teams ─────────────────────────────────────────────────────────────── */
const NHL_TEAMS={ANA:['Anaheim','Ducks'],BOS:['Boston','Bruins'],BUF:['Buffalo','Sabres'],CGY:['Calgary','Flames'],
  CAR:['Carolina','Hurricanes'],CHI:['Chicago','Blackhawks'],COL:['Colorado','Avalanche'],CBJ:['Columbus','Blue Jackets'],
  DAL:['Dallas','Stars'],DET:['Detroit','Red Wings'],EDM:['Edmonton','Oilers'],FLA:['Florida','Panthers'],LA:['Los Angeles','Kings'],
  MIN:['Minnesota','Wild'],MTL:['Montreal','Canadiens'],NSH:['Nashville','Predators'],NJ:['New Jersey','Devils'],NYI:['New York','Islanders'],
  NYR:['New York','Rangers'],OTT:['Ottawa','Senators'],PHI:['Philadelphia','Flyers'],PIT:['Pittsburgh','Penguins'],SJ:['San Jose','Sharks'],
  SEA:['Seattle','Kraken'],STL:['St. Louis','Blues'],TB:['Tampa Bay','Lightning'],TOR:['Toronto','Maple Leafs'],UTAH:['Utah','Mammoth'],
  VAN:['Vancouver','Canucks'],VGK:['Vegas','Golden Knights'],WSH:['Washington','Capitals'],WPG:['Winnipeg','Jets']};
const NHL_ALIAS={LAK:'LA',NJD:'NJ',SJS:'SJ',TBL:'TB',VEG:'VGK',LV:'VGK',UTA:'UTAH',UHC:'UTAH',ARI:'UTAH',WAS:'WSH',MON:'MTL',
  CLB:'CBJ',CLS:'CBJ',NAS:'NSH',WIN:'WPG',NYIS:'NYI',NYRA:'NYR'};
const NHL_EXTRA={UTAH:['hockey club','utah hc']};
function nhlAbbrFor(raw){
  const t=String(raw||'').trim();if(!t)return null;
  const U=t.toUpperCase().replace(/[^A-Z]/g,'');
  if(NHL_TEAMS[U])return U;if(NHL_ALIAS[U])return NHL_ALIAS[U];
  const l=' '+t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9. ]/g,' ').replace(/\s+/g,' ')+' ';
  // nicknames first, longest first ("blue jackets" before "blues", "golden knights" before "knights")
  const nicks=Object.entries(NHL_TEAMS).map(([k,v])=>[k,v[1].toLowerCase()]).sort((a,b)=>b[1].length-a[1].length);
  for(const [k,n] of nicks)if(l.includes(' '+n+' '))return k;
  for(const [k,arr] of Object.entries(NHL_EXTRA))if(arr.some(n=>l.includes(' '+n+' ')))return k;
  // cities, except New York (two teams — needs the nickname)
  const cities=Object.entries(NHL_TEAMS).filter(([k,v])=>v[0]!=='New York').map(([k,v])=>[k,v[0].toLowerCase().replace('.','')])
    .sort((a,b)=>b[1].length-a[1].length);
  const l2=l.replace(/\./g,'');
  for(const [k,c] of cities)if(l2.includes(' '+c+' '))return k;
  return null;
}
const nhlTeamName=a=>NHL_TEAMS[a]?NHL_TEAMS[a].join(' '):a;

/* ── Small math ────────────────────────────────────────────────────────── */
const nhlImp=a=>a==null||isNaN(a)?null:(a>0?100/(a+100):-a/(-a+100));
/* v1.89: a missing/zero price used to return Infinity and turned a whole record into "+Infinityu" */
const nhlProfit=a=>{a=+a;return!isFinite(a)||Math.abs(a)<100?null:a>0?a/100:100/Math.abs(a);};
const nhlEV=(p,a)=>p==null||a==null||isNaN(a)||Math.abs(+a)<100?null:(p*nhlProfit(+a)-(1-p))*100;
const nhlFair=p=>p==null?null:(p>=0.5?Math.round(-(p/(1-p))*100):Math.round(((1-p)/p)*100));
const nhlSgn=n=>n==null?'—':(n>0?'+'+n:''+n);
function nhlPois(l){let L=Math.exp(-l),k=0,p=1;do{k++;p*=simRand();}while(p>L);return k-1;}
function nhlPoisCDF(k,l){let s=0,t=Math.exp(-l);for(let i=0;i<=k;i++){s+=t;t*=l/(i+1);}return s;}
const nhlPoisAtLeast=(n,l)=>n<=0?1:1-nhlPoisCDF(n-1,l);
function nhlGamma(k){ // Marsaglia–Tsang, k>=1
  const d=k-1/3,c=1/Math.sqrt(9*d);for(;;){let x,v;do{const u1=simRand(),u2=simRand();
    x=Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);v=1+c*x;}while(v<=0);v=v*v*v;const u=simRand();
    if(u<1-0.0331*x*x*x*x||Math.log(u)<0.5*x*x+d*(1-v+Math.log(v)))return d*v;}}
const nhlEsc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nhlQ=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");

/* ── Schedule ──────────────────────────────────────────────────────────── */
function nhlOddsFromEspn(c){
  const o=(c.odds||[])[0];if(!o)return null;
  const num=v=>{const n=parseFloat(String(v==null?'':v).replace(/[^0-9.+\-]/g,''));return isNaN(n)?null:n;};
  const px=v=>typeof amerOk==='function'?amerOk(v):num(v);
  const ml=side=>px(o[side+'TeamOdds']&&o[side+'TeamOdds'].moneyLine)??px(o.moneyline&&o.moneyline[side]&&(o.moneyline[side].close||o.moneyline[side].open||{}).odds);
  const sp=side=>px(o[side+'TeamOdds']&&o[side+'TeamOdds'].spreadOdds)??px(o.pointSpread&&o.pointSpread[side]&&(o.pointSpread[side].close||{}).odds);
  const spl=side=>num(o.pointSpread&&o.pointSpread[side]&&(o.pointSpread[side].close||{}).line);
  const tot=num(o.overUnder);
  const ov=px(o.overOdds)??px(o.total&&o.total.over&&(o.total.over.close||{}).odds);
  const un=px(o.underOdds)??px(o.total&&o.total.under&&(o.total.under.close||{}).odds);
  return{awayML:ml('away'),homeML:ml('home'),awayPLp:sp('away'),homePLp:sp('home'),awayPL:spl('away'),homePL:spl('home'),total:tot,over:ov,under:un,details:o.details||''};
}
function nhlParseEvent(e){
  const c=(e.competitions||[])[0];if(!c)return null;
  const T=side=>{const x=(c.competitors||[]).find(z=>z.homeAway===side);if(!x)return null;
    const ab=nhlAbbrFor(x.team&&x.team.displayName)||nhlAbbrFor(x.team&&x.team.abbreviation)||(x.team&&x.team.abbreviation)||'?';
    const ls=(x.linescores||[]).map(v=>+(v.value!=null?v.value:v.displayValue));
    return{abbr:ab,name:(x.team&&x.team.displayName)||nhlTeamName(ab),tid:x.team&&x.team.id,
      record:((x.records||[])[0]||{}).summary||'',score:x.score!=null&&x.score!==''?+x.score:null,ls};};
  const away=T('away'),home=T('home');if(!away||!home)return null;
  const st=(e.status||c.status||{});const state=(st.type||{}).state||'pre';
  const g={id:String(e.id),espnId:String(e.id),start:e.date,time:e.date?fmtTime(e.date):'',
    away:{abbr:away.abbr,name:away.name,tid:away.tid,record:away.record},home:{abbr:home.abbr,name:home.name,tid:home.tid,record:home.record},
    abstract:state==='pre'?'pre':state==='in'?'in':'post',status:state==='post'?'Final':state==='in'?'InProgress':'Scheduled',
    detail:(st.type||{}).shortDetail||'',period:st.period||0,clock:st.displayClock||'',
    awayScore:state==='pre'?null:away.score,homeScore:state==='pre'?null:home.score,
    p1a:away.ls.length&&(state==='post'||(st.period||0)>=2)?away.ls[0]:(state==='in'&&(st.period||0)===1?away.ls[0]??0:null),
    p1h:home.ls.length&&(state==='post'||(st.period||0)>=2)?home.ls[0]:(state==='in'&&(st.period||0)===1?home.ls[0]??0:null),
    lsA:away.ls,lsH:home.ls,preseason:((e.season||{}).type===1),venue:(c.venue||{}).fullName||'',espnOdds:nhlOddsFromEspn(c)};
  return g;
}
async function loadNHLSchedule(){
  const d=today().replace(/-/g,'');
  try{
    const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${d}`);
    const j=await r.json();
    const games=(j.events||[]).map(nhlParseEvent).filter(Boolean);
    NHL_GAMES=games;
    set(NHL_LS.games,{d:today(),games,season:(j.season||{}).year||null,ts:Date.now()});
    NHL_STATUS.sched=`${games.length} game${games.length===1?'':'s'} today`+(games.some(g=>g.preseason)?' (preseason)':'');
    nhlStoreEspnLines();nhlArchiveFinals();
    return (j.season||{}).year||null;
  }catch(e){NHL_STATUS.sched='schedule fetch failed: '+(e.message||e);return null;}
}
/* Next few days of games, so they're on tap ahead of time. */
async function loadNHLUpcoming(days){
  days=days||3;const pad=n=>String(n).padStart(2,'0');
  const t0=new Date(today()+'T12:00:00');const fmt=d=>d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());
  const a=new Date(t0);a.setDate(a.getDate()+1);const b=new Date(t0);b.setDate(b.getDate()+days);
  try{
    const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${fmt(a)}-${fmt(b)}`);
    const j=await r.json();const td=today();
    NHL_UPCOMING=(j.events||[]).map(nhlParseEvent).filter(Boolean).map(g=>({...g,__date:nhlLocalDate(g.start)})).filter(g=>g.__date>td);
    set('d4.nhlupcoming',{d:td,games:NHL_UPCOMING,ts:Date.now()});
  }catch(e){const c=get('d4.nhlupcoming',null);if(c&&Array.isArray(c.games))NHL_UPCOMING=c.games.filter(g=>g.__date>today());}
  return NHL_UPCOMING;
}
/* Lines Chris entered from sportsbetting.ag for Tue 9/29 and Wed 9/30. Filed as
   'mine' (your uploads outrank live and ESPN lines). Written once each, after
   the schedule confirms which team is home, so the key matches ESPN's. */
const NHL_SEED_LINES=[
  {d:'2026-09-29',a:'Florida Panthers',h:'Carolina Hurricanes',pl:[1.5,-225,-1.5,189],ml:[109,-123],ou:[6.5,109,-125]},
  {d:'2026-09-29',a:'Montreal Canadiens',h:'Toronto Maple Leafs',pl:[1.5,-260,-1.5,215],ml:[-102,-112],ou:[6.5,-102,-114]},
  {d:'2026-09-29',a:'New York Rangers',h:'Boston Bruins',pl:[1.5,-265,-1.5,219],ml:[-102,-112],ou:[5.5,-130,113]},
  {d:'2026-09-29',a:'Vancouver Canucks',h:'Edmonton Oilers',pl:[1.5,-110,-1.5,-110],ml:[232,-270],ou:[6.5,-125,109]},
  {d:'2026-09-29',a:'Chicago Blackhawks',h:'Vegas Golden Knights',pl:[1.5,-125,-1.5,105],ml:[208,-240],ou:[5.5,-130,113]},
  {d:'2026-09-30',a:'Pittsburgh Penguins',h:'Philadelphia Flyers',ml:[110,-125],ou:[5.5,-128,112]},
  {d:'2026-09-30',a:'Los Angeles Kings',h:'Colorado Avalanche',ml:[149,-170],ou:[5.5,-120,104]}
];
function nhlApplySeed(){
  const done=get('d4.nhlseed',{});let n=0;const td=today();
  NHL_SEED_LINES.forEach(S=>{
    let A=nhlAbbrFor(S.a),H=nhlAbbrFor(S.h);if(!A||!H)return;
    const k=S.d+'|'+[A,H].sort().join('-');if(done[k]||S.d<td)return;
    const pool=[...NHL_GAMES,...NHL_UPCOMING];
    const same=pool.find(z=>z.away.abbr===A&&z.home.abbr===H),flip=pool.find(z=>z.away.abbr===H&&z.home.abbr===A);
    if(!same&&!flip)return;                     // wait until the schedule shows it
    const sw=!same;const g=same||flip;const game=g.away.abbr+'@'+g.home.abbr;
    const base={away:g.away.abbr,home:g.home.abbr,game,gid:g.id,src:'mine',book:'sportsbetting.ag',capturedAt:Date.now(),date:g.__date||td};
    const sd=x=>sw?(x==='away'?'home':'away'):x;const rows=[];
    if(S.ml)rows.push({...base,market:'moneyline',side:sd('away'),line:null,price:S.ml[0]},{...base,market:'moneyline',side:sd('home'),line:null,price:S.ml[1]});
    if(S.pl)rows.push({...base,market:'spread',side:sd('away'),line:S.pl[0],price:S.pl[1]},{...base,market:'spread',side:sd('home'),line:S.pl[2],price:S.pl[3]});
    if(S.ou)rows.push({...base,market:'total',side:'over',line:S.ou[0],price:S.ou[1]},{...base,market:'total',side:'under',line:S.ou[0],price:S.ou[2]});
    nhlPutLines(rows);done[k]=Date.now();n++;
  });
  if(n)set('d4.nhlseed',done);return n;
}
function nhlLoadCachedSchedule(){
  const c=get(NHL_LS.games,null);
  if(c&&c.d===today()&&Array.isArray(c.games)){NHL_GAMES=c.games;NHL_STATUS.sched=`${c.games.length} games (cached)`;return c.season;}
  return null;
}

/* ── Team ratings: goals for/against per game, current season blended with
   last season (regressed 1/3 toward league) so opening week isn't flat ──── */
function nhlCollectEntries(node,out){if(!node)return out;
  if(node.standings&&Array.isArray(node.standings.entries))out.push(...node.standings.entries);
  (node.children||[]).forEach(ch=>nhlCollectEntries(ch,out));return out;}
async function nhlFetchStandings(season){
  const r=await fetch(`https://site.api.espn.com/apis/v2/sports/hockey/nhl/standings${season?'?season='+season:''}`);
  const j=await r.json();const E=nhlCollectEntries(j,[]);const T={};
  E.forEach(e=>{const ab=nhlAbbrFor(e.team&&e.team.displayName)||nhlAbbrFor(e.team&&e.team.abbreviation);if(!ab)return;
    const S={};(e.stats||[]).forEach(x=>{S[x.name||x.type]=+x.value;});
    const gp=S.gamesPlayed??S.games??null,gf=S.pointsFor??S.goalsFor??null,ga=S.pointsAgainst??S.goalsAgainst??null;
    if(gp!=null&&gf!=null&&ga!=null)T[ab]={gp,gf,ga};});
  return T;
}
async function loadNHLRatings(season,force){
  const c=get(NHL_LS.ratings,null);
  if(!force&&c&&Date.now()-c.ts<6*3600e3&&c.teams){NHL_RATINGS=c;NHL_FLAT=!Object.keys(c.teams).length;NHL_STATUS.ratings=c.note;return;}
  let cur={},prev={};
  try{cur=await nhlFetchStandings(season)}catch(e){}
  try{prev=await nhlFetchStandings(season?season-1:null)}catch(e){}
  const all=[...Object.values(cur),...Object.values(prev)];
  const lg=all.reduce((a,x)=>a+x.gf,0)/Math.max(1,all.reduce((a,x)=>a+x.gp,0))||NHL_LG;
  const K=20,teams={};
  Object.keys(NHL_TEAMS).forEach(ab=>{
    const c1=cur[ab],p=prev[ab];
    const pgf=p&&p.gp?(p.gf/p.gp)*2/3+lg/3:lg,pga=p&&p.gp?(p.ga/p.gp)*2/3+lg/3:lg;
    const gp=c1?c1.gp:0;
    teams[ab]={gf:((c1?c1.gf:0)+K*pgf)/(gp+K),ga:((c1?c1.ga:0)+K*pga)/(gp+K),gp,hasPrior:!!p};
  });
  const any=Object.keys(cur).length||Object.keys(prev).length;
  const note=any?`team ratings: ${Object.keys(cur).length} teams this season, ${Object.keys(prev).length} last season (blended)`:'team ratings unavailable — sim is flat (home ice only)';
  NHL_RATINGS={ts:Date.now(),lg,teams:any?teams:{},note};NHL_FLAT=!any;NHL_STATUS.ratings=note;
  set(NHL_LS.ratings,NHL_RATINGS);
}

/* ── Simulation ────────────────────────────────────────────────────────────
   Regulation goals: gamma-Poisson (mild overdispersion). Late-game empty-net
   effect in 1-goal games, OT/shootout winner gets +1 (how books grade the
   final). Period-1 goals split from regulation goals binomially, so the P1
   and full-game markets come from the SAME simulated games. */
function nhlExpected(g){
  const R=NHL_RATINGS&&NHL_RATINGS.teams||{},lg=(NHL_RATINGS&&NHL_RATINGS.lg)||NHL_LG;
  const A=R[g.away.abbr]||{gf:lg,ga:lg},H=R[g.home.abbr]||{gf:lg,ga:lg};
  return{la:lg*(A.gf/lg)*(H.ga/lg)*(2-NHL_HOME),lh:lg*(H.gf/lg)*(A.ga/lg)*NHL_HOME};
}
function simNHLGame(g,N){
  N=N||20000;const{la,lh}=nhlExpected(g);const shape=35;
  const C0=simCore('nhl',[la,lh,shape,N,NHL_P1],()=>{
  const TOT=new Int32Array(30),MAR=new Int32Array(41),P1T=new Int32Array(20),P1M=new Int32Array(21);const sf={};
  let aw=0,hw=0,ot=0,sa=0,sh=0,p1a=0,p1h=0;
  for(let i=0;i<N;i++){
    let a=nhlPois(la*nhlGamma(shape)/shape),h=nhlPois(lh*nhlGamma(shape)/shape);
    let q=0,w=0;for(let k=0;k<a;k++)if(simRand()<NHL_P1)q++;for(let k=0;k<h;k++)if(simRand()<NHL_P1)w++;
    p1a+=q;p1h+=w;P1T[Math.min(19,q+w)]++;P1M[Math.max(0,Math.min(20,w-q+10))]++;
    if(Math.abs(a-h)===1){const r=simRand();const lead=a>h?'a':'h';
      if(r<0.12){if(lead==='a')a++;else h++;}else if(r<0.18){if(lead==='a')h++;else a++;}}
    if(a===h){ot++;if(simRand()<0.51)h++;else a++;}
    if(h>a)hw++;else aw++;sa+=a;sh+=h;
    TOT[Math.min(29,a+h)]++;MAR[Math.max(0,Math.min(40,h-a+20))]++;const key=a+'-'+h;sf[key]=(sf[key]||0)+1;
  }
  let modeScore=null,modeN=0;for(const k in sf)if(sf[k]>modeN){modeN=sf[k];modeScore=k;}
  return{TOT:Array.from(TOT),MAR:Array.from(MAR),P1T:Array.from(P1T),P1M:Array.from(P1M),aw,hw,ot,sa,sh,p1a,p1h,modeScore,modeN};});
  const TOT=C0.TOT,MAR=C0.MAR,P1T=C0.P1T,P1M=C0.P1M;const{aw,hw,ot,sa,sh,p1a,p1h}=C0;
  const over=L=>{let c=0;for(let t=0;t<30;t++)if(t>L)c+=TOT[t];return c/N;};
  const under=L=>{let c=0;for(let t=0;t<30;t++)if(t<L)c+=TOT[t];return c/N;};
  const homeCover=hl=>{let c=0;for(let m=-20;m<=20;m++)if(m+hl>0)c+=MAR[m+20];return c/N;};
  const awayCover=al=>{let c=0;for(let m=-20;m<=20;m++)if(-m+al>0)c+=MAR[m+20];return c/N;};
  const p1Over=L=>{let c=0;for(let t=0;t<20;t++)if(t>L)c+=P1T[t];return c/N;};
  const p1Under=L=>{let c=0;for(let t=0;t<20;t++)if(t<L)c+=P1T[t];return c/N;};
  /* 1st period: a tied period refunds a 2-way period moneyline, so its chance is win ÷ (win + loss). */
  const p1Win=side=>{let w=0,l=0;for(let m=-10;m<=10;m++){const c=P1M[m+10];if(!m)continue;if((m>0)===(side==='home'))w+=c;else l+=c;}return w+l?w/(w+l):0.5;};
  const p1Cover=(side,line)=>{let w=0,l=0;for(let m=-10;m<=10;m++){const c=P1M[m+10];const v=(side==='home'?m:-m)+line;if(v>0)w+=c;else if(v<0)l+=c;}return w+l?w/(w+l):0.5;};
  const p1Tie=P1M[10]/N;
  let med=0,acc=0;for(let t=0;t<30;t++){acc+=TOT[t];if(acc>=N/2){med=t;break;}}
  const modeScore=C0.modeScore,modeN=C0.modeN;
  return{N,la,lh,awayProj:+(sa/N).toFixed(2),homeProj:+(sh/N).toFixed(2),aw:aw/N,hw:hw/N,otP:ot/N,med,
    over,under,homeCover,awayCover,p1Over,p1Under,p1Win,p1Cover,p1Tie,p1Proj:+((p1a+p1h)/N).toFixed(2),p1a:p1a/N,p1h:p1h/N,
    modeScore,modeScorePct:modeN/N,medMargin:(sh-sa)/N};
}
simNHLGame=simSeeded(simNHLGame,(g,N)=>simGameKey('nhl',g,N));
function nhlSimFor(g){const sig=NHL_RATINGS?NHL_RATINGS.ts:0;let s=NHL_SIMS[g.id];
  if(!s||s._sig!==sig){s=simNHLGame(g);s._sig=sig;NHL_SIMS[g.id]=s;}return s;}

/* ── Lines: storage, priority, intake grammar, live pull ────────────────── */
const NHL_SRC_RANK={mine:3,live:2,espn:1};
/* Lines are filed under the GAME's date, not the day they were entered, so
   lines for Tuesday's games entered on Monday are waiting on Tuesday's cards. */
const nhlLocalDate=iso=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:APP_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso))}catch(e){return today()}};
function nhlDateOf(game){
  if(NHL_GAMES.some(z=>z.away.abbr+'@'+z.home.abbr===game))return today();
  const u=NHL_UPCOMING.find(z=>z.away.abbr+'@'+z.home.abbr===game);return u?u.__date:today();
}
(function(){try{const all=get('d4.nhlshots',{})||{};let bad=0;
  Object.keys(all).forEach(d=>{const before=(all[d]||[]).length;all[d]=(all[d]||[]).filter(x=>amerOk(x.price)!=null);bad+=before-all[d].length;});
  if(bad){set('d4.nhlshots',all);console.info('NHL: removed '+bad+' stored line(s) with an impossible price');}}catch(e){}})();
function nhlLinesOn(d){return get(NHL_LS.shots,{})[d||today()]||[];}
function nhlLinesToday(){return nhlLinesOn(today());}
function nhlPutLines(rows){
  rows=(rows||[]).map(r=>({...r,price:r.price==null?null:amerOk(r.price)})).filter(r=>r.price!=null);
  const all=get(NHL_LS.shots,{});
  const key=x=>[x.game,x.market,x.side,x.line,x.player||'',x.stat||'',x.src].join('|');
  rows.forEach(r=>{const d=r.date||nhlDateOf(r.game);all[d]=all[d]||[];
    const i=all[d].findIndex(y=>key(y)===key(r));if(i>=0)all[d][i]=r;else all[d].push(r);});
  const keep=Object.keys(all).sort();const td=today();
  keep.filter(k=>k<td).slice(0,-7).forEach(k=>delete all[k]);set(NHL_LS.shots,all);
}
/* Main line per market/side: your uploads beat live pulls beat ESPN. */
function nhlBookLinesFor(game,date){
  const L=nhlLinesOn(date||nhlDateOf(game)).filter(x=>x.game===game&&amerOk(x.price)!=null);const best={};
  L.forEach(x=>{const k=x.market==='prop'?[x.market,x.player,x.stat,x.side].join('|'):x.market+'|'+x.side;const b=best[k];
    const r=NHL_SRC_RANK[x.src]||0,br=b?(NHL_SRC_RANK[b.src]||0):-1;
    if(!b||r>br||(r===br&&(x.capturedAt||0)>(b.capturedAt||0)))best[k]=x;});
  return Object.values(best);
}
function nhlLineObj(game){
  const L=nhlBookLinesFor(game),f=(m,s)=>L.find(x=>x.market===m&&x.side===s)||null;
  return{awayML:f('moneyline','away'),homeML:f('moneyline','home'),awayPL:f('spread','away'),homePL:f('spread','home'),
    over:f('total','over'),under:f('total','under'),p1over:f('p1total','over'),p1under:f('p1total','under'),
    p1mlA:f('p1ml','away'),p1mlH:f('p1ml','home'),p1plA:f('p1spread','away'),p1plH:f('p1spread','home'),
    props:L.filter(x=>x.market==='prop')};
}
function nhlStoreEspnLines(){
  const rows=[];NHL_GAMES.forEach(g=>{const o=g.espnOdds;if(!o||g.abstract!=='pre')return;const game=g.away.abbr+'@'+g.home.abbr;
    const base={away:g.away.abbr,home:g.home.abbr,game,gid:g.id,src:'espn',capturedAt:Date.now()};
    if(o.awayML!=null&&o.homeML!=null){rows.push({...base,market:'moneyline',side:'away',line:null,price:o.awayML},{...base,market:'moneyline',side:'home',line:null,price:o.homeML});}
    if(o.total!=null&&o.over!=null&&o.under!=null){rows.push({...base,market:'total',side:'over',line:o.total,price:o.over},{...base,market:'total',side:'under',line:o.total,price:o.under});}
    if(o.awayPL!=null&&o.homePL!=null&&o.awayPLp!=null&&o.homePLp!=null){rows.push({...base,market:'spread',side:'away',line:o.awayPL,price:o.awayPLp},{...base,market:'spread',side:'home',line:o.homePL,price:o.homePLp});}
  });if(rows.length)nhlPutLines(rows);
}
/* Upload grammar (same shape as the other sports):
     NHL
     Toronto Maple Leafs @ Boston Bruins
     ML: TOR -130 / BOS +110
     PL: TOR -1.5 (+180) / BOS +1.5 (-220)        (SPREAD: / RL: also accepted)
     OU: o6.5 (-110) / u6.5 (-110)
     P1OU: o1.5 (-125) / u1.5 (+105)
     PROP: Auston Matthews SOG 3.5 (-120/+100)      (Goals|Assists|Points|SOG|Saves) */
function parseNHLSlateText(text){
  const picks=[],unread=[];let A=null,H=null;
  const num=v=>+String(v).replace(/[^\d.+\-]/g,'');
  String(text).split('\n').map(l=>l.replace(/^[\s\-*•>]+/,'').trim()).filter(Boolean).forEach(l=>{
    if(/^(NHL|HOCKEY)\b/i.test(l)||/^SOURCE:/i.test(l))return;
    let m;
    if(!/:/.test(l)&&(m=l.match(/^(.+?)\s+(?:@|at|vs\.?)\s+(.+?)$/i))){const a=nhlAbbrFor(m[1]),h=nhlAbbrFor(m[2]);if(a&&h){A=a;H=h;}else unread.push(l);return;}
    if(!A){unread.push(l);return;}
    const base={away:A,home:H,game:A+'@'+H};
    const side=t=>{const ab=nhlAbbrFor(t);return ab===A?'away':ab===H?'home':null;};
    if((m=l.match(/^(?:P1ML|1PML|P1 ?MONEYLINE):\s*(.+?)\s+([+-]\d+)\s*\/\s*(.+?)\s+([+-]\d+)\s*$/i))){
      const s1=side(m[1]),s2=side(m[3]);if(s1&&s2){picks.push({...base,market:'p1ml',side:s1,line:null,price:+m[2]},{...base,market:'p1ml',side:s2,line:null,price:+m[4]});return;}}
    if((m=l.match(/^(?:P1PL|1PPL|P1 ?PUCK ?LINE|P1SPREAD):\s*(.+?)\s+([+-]?[\d.]+)\s*\(\s*([+-]\d+)\s*\)\s*\/\s*(.+?)\s+([+-]?[\d.]+)\s*\(\s*([+-]\d+)\s*\)\s*$/i))){
      const s1=side(m[1]),s2=side(m[4]);if(s1&&s2){picks.push({...base,market:'p1spread',side:s1,line:num(m[2]),price:+m[3]},{...base,market:'p1spread',side:s2,line:num(m[5]),price:+m[6]});return;}}
    if((m=l.match(/^ML:\s*(.+?)\s+([+-]\d+)\s*\/\s*(.+?)\s+([+-]\d+)\s*$/i))){
      const s1=side(m[1]),s2=side(m[3]);if(s1&&s2){picks.push({...base,market:'moneyline',side:s1,line:null,price:+m[2]},{...base,market:'moneyline',side:s2,line:null,price:+m[4]});return;}}
    if((m=l.match(/^(?:PL|SPREAD|RL|PUCK ?LINE):\s*(.+?)\s+([+-]?[\d.]+)\s*\(\s*([+-]\d+)\s*\)\s*\/\s*(.+?)\s+([+-]?[\d.]+)\s*\(\s*([+-]\d+)\s*\)\s*$/i))){
      const s1=side(m[1]),s2=side(m[4]);if(s1&&s2){picks.push({...base,market:'spread',side:s1,line:num(m[2]),price:+m[3]},{...base,market:'spread',side:s2,line:num(m[5]),price:+m[6]});return;}}
    if((m=l.match(/^(OU|P1OU|1POU|P1):\s*o\s*([\d.]+)\s*\(\s*([+-]\d+)\s*\)\s*\/\s*u\s*([\d.]+)\s*\(\s*([+-]\d+)\s*\)\s*$/i))){
      const mk=/^OU/i.test(m[1])?'total':'p1total';
      picks.push({...base,market:mk,side:'over',line:+m[2],price:+m[3]},{...base,market:mk,side:'under',line:+m[4],price:+m[5]});return;}
    if((m=l.match(/^PROP:\s*(.+?)\s+(Goals?|Assists|Points|SOG|Shots(?: on Goal)?|Saves)\s+([\d.]+)\s*\(\s*([+-]\d+)\s*\/\s*([+-]\d+)\s*\)\s*$/i))){
      const st={goal:'goals',goals:'goals',assists:'assists',points:'points',sog:'shots',shots:'shots','shots on goal':'shots',saves:'saves'}[m[2].toLowerCase()];
      picks.push({...base,market:'prop',side:'over',line:+m[3],price:+m[4],player:m[1].trim(),stat:st},{...base,market:'prop',side:'under',line:+m[3],price:+m[5],player:m[1].trim(),stat:st});return;}
    if(/^(TREND|PRED|PROJ|CONS)/i.test(l))return;   // handled by the shared intake pass
    unread.push(l);
  });
  return{picks,trends:[],consensus:[],unread};
}
function saveNHLBookOdds(picks,el){
  const rows=(picks||[]).map(x=>{const game=x.game||(x.away+'@'+x.home);const g=NHL_GAMES.find(z=>z.away.abbr+'@'+z.home.abbr===game)||NHL_UPCOMING.find(z=>z.away.abbr+'@'+z.home.abbr===game);
    return{away:x.away,home:x.home,game,market:x.market,side:x.side,line:x.line!=null?x.line:null,price:x.price,
      player:x.player||null,stat:x.stat||null,gid:g?g.id:null,src:'mine',capturedAt:Date.now()};});
  nhlPutLines(rows);
  if(el)el.innerHTML=`<div class="tkt hi"><h3>NHL lines saved</h3><div class="sub">${rows.length} lines filed — these outrank live and ESPN lines on every card.</div></div>`;
  if(ACTIVE_SPORT==='nhl')renderNHL();
  return rows.length;
}
function saveNHLExtData(picks,trends,consensus,el){
  const d=today(),put=(k,arr)=>{if(!arr||!arr.length)return;const all=get(k,{});all[d]=(all[d]||[]).concat(arr);set(k,all);};
  put(NHL_LS.ext,picks);put(NHL_LS.trends,trends);put(NHL_LS.cons,consensus);
  if(ACTIVE_SPORT==='nhl')renderNHL();
}
const nhlTrendsFor=game=>(get(NHL_LS.trends,{})[today()]||[]).filter(x=>x.game===game);
const nhlConsFor=game=>(get(NHL_LS.cons,{})[today()]||[]).filter(x=>x.game===game);
/* Outside computer picks for this game (Covers etc.), from the Intel log. */
function nhlOutsideFor(game){
  return get(INTEL_KEY,[]).filter(x=>x.sp==='nhl'&&x.kind==='xpick'&&x.game===game&&x.date===today()&&x.pick);
}
async function fetchNHLLiveOdds(){
  const key=typeof theOddsApiKey==='function'?theOddsApiKey():get(LS.key,'');if(!key)throw new Error('Add your Odds API key in Settings');
  const r=await fetch(`https://api.the-odds-api.com/v4/sports/icehockey_nhl/odds/?apiKey=${key}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`);
  if(r.status===401)throw new Error('Odds API 401 — bad key or credits used up');
  const j=await r.json();if(!Array.isArray(j))throw new Error((j&&j.message)||'unexpected Odds API response');
  const rows=[];
  j.forEach(ev=>{const a=nhlAbbrFor(ev.away_team),h=nhlAbbrFor(ev.home_team);if(!a||!h)return;const game=a+'@'+h;
    const bk=(ev.bookmakers||[]).find(b=>b.key==='draftkings')||(ev.bookmakers||[]).find(b=>b.key==='fanduel')||(ev.bookmakers||[])[0];if(!bk)return;
    const g=NHL_GAMES.find(z=>z.away.abbr+'@'+z.home.abbr===game);
    const base={away:a,home:h,game,gid:g?g.id:null,src:'live',book:bk.key,capturedAt:Date.now()};
    (bk.markets||[]).forEach(mk=>(mk.outcomes||[]).forEach(o=>{
      if(mk.key==='h2h')rows.push({...base,market:'moneyline',side:nhlAbbrFor(o.name)===a?'away':'home',line:null,price:o.price});
      if(mk.key==='spreads')rows.push({...base,market:'spread',side:nhlAbbrFor(o.name)===a?'away':'home',line:o.point,price:o.price});
      if(mk.key==='totals')rows.push({...base,market:'total',side:/over/i.test(o.name)?'over':'under',line:o.point,price:o.price});
    }));});
  nhlPutLines(rows);return rows.length;
}

/* ── Player season stats (props model) ──────────────────────────────────── */
async function nhlFetchPlayers(season){
  const r=await fetch(`https://site.web.api.espn.com/apis/common/v3/sports/hockey/nhl/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=false&page=1&limit=1500&season=${season}&seasontype=2`);
  const j=await r.json();const cats=j.categories||[];const out={};
  const pick=(ath,names)=>{for(let ci=0;ci<cats.length;ci++){const nm=cats[ci].names||[];const ac=(ath.categories||[])[ci];if(!ac)continue;
    const vals=ac.totals||ac.values||[];for(const n of names){const ix=nm.indexOf(n);if(ix>=0&&vals[ix]!=null&&vals[ix]!==''){const v=parseFloat(String(vals[ix]).replace(/[^\d.\-]/g,''));if(!isNaN(v))return v;}}}return null;};
  (j.athletes||[]).forEach(x=>{const A=x.athlete||{};const name=A.displayName||A.fullName;if(!name)return;
    const team=nhlAbbrFor(A.teamShortName||A.teamName||(A.team&&(A.team.displayName||A.team.abbreviation))||'');
    const gp=pick(x,['gamesPlayed','games']);if(!gp)return;
    out[name]={name,team,pos:(A.position&&A.position.abbreviation)||'',gp,
      g:pick(x,['goals'])||0,a:pick(x,['assists'])||0,pts:pick(x,['points'])||0,
      sog:pick(x,['shotsTotal','shots','shotsOnGoal'])||0,sv:pick(x,['saves'])||0,sa:pick(x,['shotsAgainst'])||0,
      toi:pick(x,['timeOnIcePerGame','avgTimeOnIce'])||null};});
  return out;
}
async function loadNHLPlayers(season,force){
  const c=get(NHL_LS.players,null);
  if(!force&&c&&Date.now()-c.ts<12*3600e3&&c.players&&Object.keys(c.players).length){NHL_PLAYERS=c.players;NHL_STATUS.players=c.note;return;}
  let cur={},prev={};try{cur=await nhlFetchPlayers(season)}catch(e){}try{prev=await nhlFetchPlayers(season-1)}catch(e){}
  const names=new Set([...Object.keys(cur),...Object.keys(prev)]);const P={};const K=10;
  names.forEach(n=>{const c1=cur[n],p=prev[n];const gp=c1?c1.gp:0,pgp=p?p.gp:0;
    const rate=f=>{const cr=c1?c1[f]:0,pr=p&&pgp?p[f]/pgp:null;return pr==null?(gp?cr/gp:0):(cr+K*pr)/(gp+K);};
    P[n]={name:n,team:(c1&&c1.team)||(p&&p.team),pos:(c1&&c1.pos)||(p&&p.pos)||'',gp,gpPrev:pgp,
      g:rate('g'),a:rate('a'),pts:rate('pts'),sog:rate('sog'),sv:rate('sv'),sa:rate('sa')};});
  const note=names.size?`player stats: ${Object.keys(cur).length} this season, ${Object.keys(prev).length} last season`:'player stats unavailable — props panel shows book lines only';
  NHL_PLAYERS=names.size?P:null;NHL_STATUS.players=note;set(NHL_LS.players,{ts:Date.now(),players:P,note});
}
/* Model probability for one player prop. Rates scale with this game's
   expected goals vs the team's normal output; shots scale half as hard. */
function nhlPropModel(player,stat,line,dir,g,s){
  if(!NHL_PLAYERS)return null;const P=nhlFindPlayer(player);if(!P)return null;
  const side=P.team===g.home.abbr?'home':P.team===g.away.abbr?'away':null;if(!side)return null;
  const R=(NHL_RATINGS&&NHL_RATINGS.teams||{})[P.team];const lam=side==='home'?s.homeProj:s.awayProj;
  const f=R&&R.gf?lam/R.gf:1;let mu;
  if(stat==='goals')mu=P.g*f;else if(stat==='assists')mu=P.a*f;else if(stat==='points')mu=P.pts*f;
  else if(stat==='shots')mu=P.sog*(0.5+0.5*f);
  else if(stat==='saves'){const opp=side==='home'?s.awayProj:s.homeProj;const svp=P.sa?P.sv/P.sa:0.9;mu=(opp/Math.max(0.05,1-svp))*svp;}
  if(!mu)return null;
  const need=dir==='atleast'?line:Math.floor(line)+1;const pOver=nhlPoisAtLeast(need,mu);
  return{mu,p:dir==='under'?1-pOver:pOver,player:P};
}
function nhlFindPlayer(name){
  if(!NHL_PLAYERS)return null;if(NHL_PLAYERS[name])return NHL_PLAYERS[name];
  const n=nhlNorm(name),parts=n.split(' '),last=parts[parts.length-1],ini=parts[0].replace('.','')[0];
  const hits=Object.values(NHL_PLAYERS).filter(p=>{const q=nhlNorm(p.name).split(' ');return q[q.length-1]===last&&(!ini||q[0][0]===ini);});
  return hits.length===1?hits[0]:hits.sort((a,b)=>(b.gp+b.gpPrev)-(a.gp+a.gpPrev))[0]||null;
}
const nhlNorm=n=>String(n||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z. ]/g,' ').replace(/\s+/g,' ').trim();

/* ── Live box score (also what grades player-prop legs) ─────────────────── */
async function fetchNHLBox(espnId){
  try{
    const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary?event=${espnId}`);
    const j=await r.json();const teams={};
    ((j.boxscore||{}).players||[]).forEach(T=>{const ab=nhlAbbrFor(T.team&&(T.team.displayName||T.team.abbreviation));if(!ab)return;
      const t=teams[ab]={skaters:[],goalies:[]};
      (T.statistics||[]).forEach(grp=>{const labels=(grp.labels||grp.names||[]).map(x=>String(x).toUpperCase());const goalie=/goal/i.test(grp.name||grp.text||'')||labels.includes('SV');
        (grp.athletes||[]).forEach(at=>{const row={name:(at.athlete||{}).displayName||'',pos:((at.athlete||{}).position||{}).abbreviation||''};
          (at.stats||[]).forEach((v,i)=>{row[labels[i]]=v;});(goalie?t.goalies:t.skaters).push(row);});});});
    NHL_BOX_CACHE[espnId]={ts:Date.now(),teams};return NHL_BOX_CACHE[espnId];
  }catch(e){return null;}
}
function nhlBoxVal(row,stat){
  const n=k=>{const v=row[k];if(v==null||v==='')return null;const x=parseFloat(String(v).replace(/[^\d.\-]/g,''));return isNaN(x)?null:x;};
  if(stat==='goals')return n('G')??0;if(stat==='assists')return n('A')??0;
  if(stat==='points')return(n('G')??0)+(n('A')??0);if(stat==='shots')return n('SOG')??n('S')??0;
  if(stat==='saves'){const sv=n('SV')??n('SAVES');if(sv!=null)return sv;const sa=n('SA'),ga=n('GA');return sa!=null&&ga!=null?sa-ga:0;}
  return null;
}
/* Counting stats only go up — so an Over/At-least that's already reached is a
   locked WIN mid-game, and an Under that's been exceeded is a locked LOSS.
   Everything else waits for the final. */
function gradeNHLPropLeg(leg,ticketDate){
  const R=resolveLeg(leg,ticketDate);if(!R)return{hit:null,detail:null,live:false};
  const g=R.g||NHL_GAMES.find(z=>z.away.abbr+'@'+z.home.abbr===leg.game);
  if(!g)return{hit:null,detail:'game not on today\'s NHL slate',live:!!R.live};
  const box=NHL_BOX_CACHE[g.espnId];
  if(!box||Date.now()-box.ts>60e3&&R.live){fetchNHLBox(g.espnId).then(()=>{try{if(typeof renderTickets==='function')renderTickets()}catch(e){}});
    if(!box)return{hit:null,detail:'player box loading — check back shortly',live:!!R.live};}
  const {player,stat,thr,dir}=leg.nhlProp;const want=nhlNorm(player),wp=want.split(' '),last=wp[wp.length-1],ini=wp[0][0];
  let row=null;Object.values(box.teams).forEach(t=>[...t.skaters,...t.goalies].forEach(r=>{if(row)return;const q=nhlNorm(r.name);if(q===want)row=r;}));
  if(!row)Object.values(box.teams).forEach(t=>[...t.skaters,...t.goalies].forEach(r=>{if(row)return;const q=nhlNorm(r.name).split(' ');if(q[q.length-1]===last&&q[0][0]===ini)row=r;}));
  if(!row)return{hit:null,detail:R.live?'player not in box yet':'player not in final box — check the name',live:!!R.live};
  const v=nhlBoxVal(row,stat);let hit=null;
  const overHit=dir==='atleast'?v>=thr:v>thr;
  if(dir==='under'){if(v>thr)hit=false;else if(!R.live)hit=true;}else{if(overHit)hit=true;else if(!R.live)hit=false;}
  return{hit,detail:`${row.name} ${v} ${stat}${R.live?' so far':''}`,live:!!R.live,prog:{val:v,thr,dir}};
}

/* ── Rosters ───────────────────────────────────────────────────────────── */
async function nhlFetchRoster(tid){
  const c=NHL_ROSTERS[tid];if(c&&Date.now()-c.ts<6*3600e3)return c;
  try{const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/${tid}/roster`);const j=await r.json();
    let groups=[];const A=j.athletes||[];
    if(A.length&&A[0].items)groups=A.map(x=>({pos:x.position||'',items:x.items}));else groups=[{pos:'Roster',items:A}];
    const out={ts:Date.now(),groups:groups.map(G=>({pos:G.pos,players:(G.items||[]).map(p=>({name:p.fullName||p.displayName,num:p.jersey||'',
      pos:(p.position||{}).abbreviation||'',inj:((p.injuries||[])[0]||{}).status||''}))}))};
    NHL_ROSTERS[tid]=out;return out;}catch(e){return null;}
}

/* ── Judge adapter (shared Judge, hockey inputs) ────────────────────────── */
function nhlBrainAdapter(){
  return{key:g=>g.away.abbr+'@'+g.home.abbr,lines:g=>nhlBookLinesFor(g.away.abbr+'@'+g.home.abbr),flat:()=>NHL_FLAT,
    sim:s=>s&&s.awayProj!=null?{a:+s.awayProj,h:+s.homeProj}:null,
    trends:g=>nhlTrendsFor(g.away.abbr+'@'+g.home.abbr),cons:()=>Object.values(get(NHL_LS.cons,{})).flat(),
    snap:x=>Math.max(0,Math.round(x)),
    market:(g,lines)=>{const to=lines.find(x=>x.market==='total');const ma=lines.find(x=>x.market==='moneyline'&&x.side==='away'),mh=lines.find(x=>x.market==='moneyline'&&x.side==='home');
      if(!to||to.line==null||!ma||!mh)return null;const a=nhlImp(ma.price),h=nhlImp(mh.price);if(!(a>0&&h>0))return null;const pH=h/(a+h);
      const mu=2.35*brainProbit(Math.max(0.05,Math.min(0.95,pH)));const T=+to.line;return{a:(T-mu)/2,h:(T+mu)/2};},
    box:(A,H,bias)=>{const t=(x)=>{const p=[0.31,0.33,0.36].map(f=>Math.round(x*f*10)/10);return{p:p.join('-'),g:Math.round(x*10)/10,sog:Math.round(x/0.098*bias('sog'))};};
      return{away:t(A),home:t(H)};},
    boxCols:[['P1-P2-P3','p'],['G','g'],['SOG≈','sog']],boxStats:['sog']};
}

function nhlPredBoxHtml(g){
  try{const arc=get(NHL_LS.arc,{});for(const D of Object.values(arc)){const r=(D&&D.rows||[]).find(x=>x.gid===g.id);
    if(r&&r.judge&&r.judge.box&&r.actualBox)return predBoxGradeHtml('nhl',g,r.judge.box,r.actualBox);}}catch(e){}return'';}
/* ── Card ──────────────────────────────────────────────────────────────── */
function nhlTile(g,s,label,pick,line,modelP,simStr,mkt){
  if(!line){const cI=(()=>{try{return charSquare('nhl',g,s,pick,{})}catch(e){return{}}})(),tC=charTier({hasLine:false},cI);
    return`<div class="bet${tC}"><div class="bl">${label}</div><div class="sim-chip">sim ${simStr}</div>
    <div class="bo" style="color:var(--mute)">${modelP!=null?nhlSgn(nhlFair(modelP)):'—'}</div><div class="bs">sim only</div>
    <div class="bf" style="color:var(--mute)">no real line yet</div>${cI.chips||''}${cI.meter||''}${charTierTag(tC)}</div>`;}
  const kp=nhlImp(line.price),mp=modelP,ev=nhlEV(mp,line.price),gap=(mp-kp)*100;
  let cls='',badge='';
  if(!NHL_FLAT){if(gap>=EDGE_MIN){cls=' value';badge=`<span class="eb up">+${gap.toFixed(1)}</span>`;}
    else if(gap<=-EDGE_MIN){cls=' avoid';badge=`<span class="eb dn">${gap.toFixed(1)}</span>`;}}
  // Three independent reads, same rules as every other board
  const bookLeans=kp>=0.58,modelEdgeHere=cls===' value',modelAgainstHere=cls===' avoid';
  const game=g.away.abbr+'@'+g.home.abbr,xs=nhlOutsideFor(game);
  const mkOf=p=>/^(P1\s+)?(Over|Under)/i.test(p)?(/^P1/i.test(p)?'p1total':'total'):/\bML$/i.test(p)?'ml':/[+-]\d/.test(p)?'spread':null;
  const sideOf=p=>{const m=p.match(/^(?:P1\s+)?(Over|Under)/i);if(m)return m[1].toLowerCase();return(nhlAbbrFor(p.split(' ')[0])||'').toLowerCase();};
  const same=xs.filter(x=>mkOf(x.pick)===mkt),on=same.filter(x=>sideOf(x.pick)===sideOf(pick));
  const srcOn=new Set(on.map(x=>x.src)),srcAll=new Set(same.map(x=>x.src));
  let outsideAgrees=on.length>0,outsideUnanimous=srcAll.size>=2&&srcOn.size===srcAll.size;const outsideAgainst=!on.length&&same.length>0;
  const cInfo=(()=>{try{return charSquare('nhl',g,s,pick,{price:line.price,modelP:mp})}catch(e){return{}}})();
  const tier=charTier({hasLine:true,bookLeans,modelEdgeHere,modelAgainstHere,outsideAgrees,outsideUnanimous,outsideAgainst},cInfo);
  const tag=charTierTag(tier);
  let srcTag=outsideAgrees?`<div class="src-tag${outsideUnanimous?' unanimous':''}">${outsideUnanimous?'★ unanimous':srcOn.size+' source'+(srcOn.size>1?'s':'')}</div>`:'';
  {const _co=charAsOutside(cInfo,outsideAgainst);if(_co.unanimous){outsideAgrees=true;outsideUnanimous=true;srcTag=_co.badge;}else if(_co.agrees&&!outsideAgrees){outsideAgrees=true;srcTag=_co.badge;}}
  const srcCls=outsideAgrees?(outsideUnanimous?' consensus-pick':' source-pick'):'';
  const on2=SLIP.some(x=>x.id===g.id+'|'+pick);
  return`<div class="bet${cls}${srcCls}${tier} ${on2?'on':''}" role="button" tabindex="0" onclick="sportSlipToggle('nhl','${g.id}','${nhlQ(pick)}',${line.price})">
    <div class="bl">${label}</div><div class="sim-chip">sim ${simStr}</div><div class="bo">${nhlSgn(line.price)}</div>
    <div class="bs">${badge||Math.round(kp*100)+'%'}</div>
    <div class="bf">model ${(mp*100).toFixed(0)}% · fair ${nhlSgn(nhlFair(mp))} · <span style="color:${ev>=2?'var(--win)':ev<0?'var(--rust)':'var(--mute)'}">${ev>=0?'+':''}${ev.toFixed(1)}% EV</span>${line.src!=='mine'?` · <span style="color:var(--mute)">${line.src}</span>`:''}</div>${srcTag}${cInfo.chips||''}${cInfo.meter||''}${tag}</div>`;
}
function nhlMkt(title,real,inner){return`<div class="mktlab" style="margin-top:8px">${title}${real?'<span style="font-family:\'IBM Plex Mono\';font-size:8px;color:var(--cold);border:1px solid var(--cold);border-radius:3px;padding:1px 4px;margin-left:6px">REAL</span>':''}</div><div class="betgrid">${inner}</div>`;}
function nhlCard(g){
  const s=nhlSimFor(g),game=g.away.abbr+'@'+g.home.abbr,L=nhlLineObj(game),A=g.away.abbr,H=g.home.abbr;
  // headline
  let head='';
  if(g.abstract==='in'){head=`<div class="proj"><div class="sc">${A} ${g.awayScore??0} – ${g.homeScore??0} ${H}</div>
      <div class="rd" style="color:var(--gold)">${nhlEsc(g.detail||('P'+g.period+' '+g.clock))}</div>
      <div class="md">pregame sim ${s.awayProj.toFixed(1)}–${s.homeProj.toFixed(1)} · P1 ${g.p1a??'–'}-${g.p1h??'–'}</div></div>`;}
  else if(g.abstract==='post'){const tot=(g.awayScore||0)+(g.homeScore||0);const ov=L.over;
      head=`<div class="proj"><div class="sc">${A} ${g.awayScore} – ${g.homeScore} ${H}</div><div class="rd">FINAL${/OT|SO/.test(g.detail)?' / '+nhlEsc(g.detail.replace(/^Final\/?/i,'')):''}</div>
      <div class="md">model called ${s.hw>=s.aw?H:A} (${(Math.max(s.hw,s.aw)*100).toFixed(0)}%) — ${((s.hw>=s.aw)===(g.homeScore>g.awayScore))?'✅ right':'❌ wrong'}${ov?` · total ${tot} vs ${ov.line} → ${tot>ov.line?'OVER':tot<ov.line?'UNDER':'PUSH'}`:''}</div></div>${nhlPredBoxHtml(g)}`;}
  else{const P=(get('d4.preds',{}).nhl||{})[g.__date||today()]||{};const pr=P[game];
      head=`<div class="proj"><div class="sc">${A} ${s.awayProj.toFixed(1)} – ${s.homeProj.toFixed(1)} ${H}</div>
      <div class="rd">${Math.round(s.awayProj)}–${Math.round(s.homeProj)}</div><div class="md">most common ${s.modeScore?s.modeScore.replace('-','–'):'—'} · ${(s.modeScorePct*100).toFixed(1)}%</div>
      ${pr?`<div style="font-family:'IBM Plex Mono';font-size:10px;color:var(--gold);margin-top:3px">pred ${A} ${pr.a} – ${pr.h} ${H} <span style="color:var(--mute)">vs sim: margin ${((pr.h-pr.a)-(s.homeProj-s.awayProj)).toFixed(1)} · total ${((pr.a+pr.h)-(s.awayProj+s.homeProj)).toFixed(1)}</span></div>`:''}
      ${(()=>{try{return brainBlock(g,s,'nhl')}catch(e){return''}})()}</div>`;}
  // chips
  const fav=s.hw>=s.aw?H:A;
  const evs=[];[['awayML',A+' ML',s.aw],['homeML',H+' ML',s.hw],['over','Over',L.over?s.over(L.over.line):null],['under','Under',L.under?s.under(L.under.line):null],
    ['awayPL',A+' PL',L.awayPL?s.awayCover(L.awayPL.line):null],['homePL',H+' PL',L.homePL?s.homeCover(L.homePL.line):null]]
    .forEach(([k,lab,p])=>{const x=L[k];if(!x||p==null)return;const ev=nhlEV(p,x.price);if(ev==null||!isFinite(ev))return;evs.push({lab:lab+(x.line!=null?' '+(k.endsWith('PL')?nhlSgn(x.line):x.line):''),ev});});
  const best=evs.sort((a,b)=>b.ev-a.ev)[0];
  const chips=[`<div class="sigchip">O/U <b>${L.over?L.over.line:s.med}</b> · ${fav} ${L[fav===H?'homePL':'awayPL']?nhlSgn(L[fav===H?'homePL':'awayPL'].line):'-1.5'}</div>`,
    `<div class="sigchip">OT/SO ${(s.otP*100).toFixed(0)}%</div>`,`<div class="sigchip">P1 ${s.p1Proj.toFixed(2)} goals</div>`];
  if(NHL_FLAT)chips.push(`<div class="sigchip" style="color:var(--gold)">RATINGS FLAT</div>`);
  else if(best)chips.push(Math.abs(best.ev)<2?`<div class="sigchip">NO EDGE · BEST ${best.ev>=0?'+':''}${best.ev.toFixed(1)}% EV</div>`
    :`<div class="sigchip" style="color:var(--win);border-color:rgba(46,204,113,.45)">EDGE · ${best.lab} · ${best.ev>=0?'+':''}${best.ev.toFixed(1)}% EV</div>`);
  if(g.preseason)chips.push(`<div class="sigchip" style="color:var(--gold)">PRESEASON</div>`);
  let extra='';try{extra=teamRecordChip(A)+teamRecordChip(H)+frozenChip(g,s,'nhl')+takeFadeChip(g,s,'nhl')+systemFormChip('nhl');}catch(e){}
  // tiles
  const pct=p=>(p*100).toFixed(0)+'%';
  const plA=L.awayPL,plH=L.homePL;
  const pl=nhlMkt('PUCK LINE',!!(plA||plH),
    nhlTile(g,s,`${A} ${plA?nhlSgn(plA.line):(fav===A?'-1.5':'+1.5')}`,`${A} ${plA?nhlSgn(plA.line):(fav===A?'-1.5':'+1.5')}`,plA,plA?s.awayCover(plA.line):s.awayCover(fav===A?-1.5:1.5),(-s.medMargin).toFixed(1),'spread')+
    nhlTile(g,s,`${H} ${plH?nhlSgn(plH.line):(fav===H?'-1.5':'+1.5')}`,`${H} ${plH?nhlSgn(plH.line):(fav===H?'-1.5':'+1.5')}`,plH,plH?s.homeCover(plH.line):s.homeCover(fav===H?-1.5:1.5),s.medMargin.toFixed(1),'spread'));
  const ml=nhlMkt('MONEYLINE',!!(L.awayML||L.homeML),nhlTile(g,s,A,A+' ML',L.awayML,s.aw,pct(s.aw),'ml')+nhlTile(g,s,H,H+' ML',L.homeML,s.hw,pct(s.hw),'ml'));
  const tl=L.over?L.over.line:(s.med+0.5);
  const to=nhlMkt('TOTAL GOALS · '+tl,!!L.over,nhlTile(g,s,'Over '+tl,'Over '+tl,L.over,s.over(tl),(s.awayProj+s.homeProj).toFixed(1),'total')+
    nhlTile(g,s,'Under '+tl,'Under '+tl,L.under,s.under(tl),(s.awayProj+s.homeProj).toFixed(1),'total'));
  const p1l=L.p1over?L.p1over.line:1.5;
  const p1=nhlMkt('1ST PERIOD TOTAL · '+p1l,!!L.p1over,nhlTile(g,s,'P1 Over '+p1l,'P1 Over '+p1l,L.p1over,s.p1Over(p1l),s.p1Proj.toFixed(2),'p1total')+
    nhlTile(g,s,'P1 Under '+p1l,'P1 Under '+p1l,L.p1under,s.p1Under(p1l),s.p1Proj.toFixed(2),'p1total'));  const sgP=x=>(x>0?'+':'')+x;
  const p1pl=(L.p1plA&&L.p1plH)?nhlMkt('1ST PERIOD PUCK LINE',true,
    nhlTile(g,s,`${g.away.abbr} ${sgP(L.p1plA.line)}`,`P1 ${g.away.abbr} ${sgP(L.p1plA.line)}`,L.p1plA,s.p1Cover('away',+L.p1plA.line),(s.p1a||0).toFixed(2),'p1spread')+
    nhlTile(g,s,`${g.home.abbr} ${sgP(L.p1plH.line)}`,`P1 ${g.home.abbr} ${sgP(L.p1plH.line)}`,L.p1plH,s.p1Cover('home',+L.p1plH.line),(s.p1h||0).toFixed(2),'p1spread')):'';
  const p1ml=(L.p1mlA&&L.p1mlH)?nhlMkt(`1ST PERIOD MONEYLINE · tie ${Math.round((s.p1Tie||0)*100)}% (push)`,true,
    nhlTile(g,s,g.away.abbr,`P1 ${g.away.abbr} ML`,L.p1mlA,s.p1Win('away'),(s.p1a||0).toFixed(2),'p1ml')+
    nhlTile(g,s,g.home.abbr,`P1 ${g.home.abbr} ML`,L.p1mlH,s.p1Win('home'),(s.p1h||0).toFixed(2),'p1ml')):'';

  const btn=(k,t)=>`<button onclick="nhlPan('${g.id}','${k}',this)">${t}</button>`;
  return`<div class="tkt" id="nhl-card-${g.id}" style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
      <div><div style="font-size:16px;font-weight:800;color:var(--chalk)">${A} <span style="color:var(--mute);font-size:13px">@</span> ${H}</div>
      <div style="font-size:10px;color:var(--mute);font-family:'IBM Plex Mono'">${nhlEsc(g.time)}${g.venue?' · '+nhlEsc(g.venue):''}</div></div>
      <div style="text-align:right;font-family:'IBM Plex Mono';font-size:9px;color:var(--mute)">${A} ${nhlEsc(g.away.record)}<br>${H} ${nhlEsc(g.home.record)}</div></div>
    ${head}<div class="sig">${chips.join('')}${extra}</div>
    ${g.abstract==='pre'?(()=>{try{return coachHtml({game:g,sim:s,sport:'nhl'})}catch(e){return''}})():''}${(()=>{try{return sgpCardHtml('nhl',g,s)}catch(e){return''}})()}
    ${g.abstract!=='post'?pl+ml+to+p1+p1pl+p1ml:''}
    ${typeof pstCardHtml==='function'?pstCardHtml('nhl',g):''}
    <div class="legend"><span><i class="v"></i>model sees value</span><span><i class="a"></i>model says pass</span><span><i class="n"></i>no real edge</span></div>
    <div class="legend" style="margin-top:2px"><span>◆ SUPREME = book price, model edge and outside sources all agree</span><span>STRONG = two of three</span><span>⚠ CONFLICT = they disagree</span></div>
    <div class="exprow" style="margin-top:10px">${btn('coach','Coach')}${btn('trends','Trends')}${btn('alt','Alt Lines')}${btn('roster','Roster')}${btn('props','Props')}${btn('box','Proj. Box')}${btn('verdict','Take/Fade')}${g.abstract!=='pre'?btn('live',g.abstract==='in'?'Live box':'Box score'):''}${btn('mybets','My Bets')}</div>
    <div class="panel" id="nhlp-${g.id}"></div></div>`;
}

/* ── Panels ────────────────────────────────────────────────────────────── */
const NHL_OPEN={};
async function nhlPan(gid,k,btn){
  const el=document.getElementById('nhlp-'+gid);if(!el)return;
  if(NHL_OPEN[gid]===k){NHL_OPEN[gid]=null;el.classList.remove('on');el.innerHTML='';return;}
  NHL_OPEN[gid]=k;el.classList.add('on');el.innerHTML='<div class="empty">Loading…</div>';
  const g=NHL_GAMES.find(x=>x.id===gid);if(!g)return;const s=nhlSimFor(g);
  try{el.innerHTML=await NHL_PANELS[k](g,s);}catch(e){el.innerHTML=`<div class="sub">Couldn't load: ${nhlEsc(e.message||e)}</div>`;}
}
const nhlTable=(head,rows)=>`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono';font-size:10px">
  <tr>${head.map(h=>`<th style="text-align:left;color:var(--mute);padding:3px 4px;border-bottom:1px solid var(--rule)">${h}</th>`).join('')}</tr>
  ${rows.map(r=>`<tr>${r.map(c=>`<td style="padding:3px 4px;border-bottom:1px solid var(--rule)">${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
const NHL_PANELS={
  coach:(g,s)=>{try{return coachBriefing(g,s,'nhl')||'<div class="sub">Coach has no read on this game yet.</div>'}catch(e){return'<div class="sub">Coach unavailable.</div>'}},
  alt:(g,s)=>{const A=g.away.abbr,H=g.home.abbr,r=[];
    [-2.5,-1.5,1.5,2.5].forEach(l=>r.push([`${H} ${nhlSgn(l)}`,(s.homeCover(l)*100).toFixed(0)+'%',nhlSgn(nhlFair(s.homeCover(l))),`${A} ${nhlSgn(-l)}`,(s.awayCover(-l)*100).toFixed(0)+'%',nhlSgn(nhlFair(s.awayCover(-l)))]));
    const t=[];[4.5,5.5,6.5,7.5].forEach(l=>t.push([l,(s.over(l)*100).toFixed(0)+'%',nhlSgn(nhlFair(s.over(l))),(s.under(l)*100).toFixed(0)+'%',nhlSgn(nhlFair(s.under(l)))]));
    const p=[];[0.5,1.5,2.5].forEach(l=>p.push([l,(s.p1Over(l)*100).toFixed(0)+'%',nhlSgn(nhlFair(s.p1Over(l))),(s.p1Under(l)*100).toFixed(0)+'%',nhlSgn(nhlFair(s.p1Under(l)))]));
    return'<div class="sub">Model fair prices — compare against your book\'s alt board.</div>'+nhlTable(['home','model','fair','away','model','fair'],r)+
      nhlTable(['total','over','fair','under','fair'],t)+nhlTable(['P1 total','over','fair','under','fair'],p);},
  verdict:(g,s)=>{let v=null;try{v=takeFadeVerdict(g,s,'nhl')}catch(e){}if(!v)return'<div class="sub">No take/fade read yet.</div>';
    return`<div class="sub"><b>${nhlEsc(v.verdict)}</b>${!(v.reasons||[]).length?' — no strong take or fade signals on this game (your team records, trends and model all quiet).':''}</div>`+(v.reasons||[]).map(x=>`<div class="sub">• ${nhlEsc(typeof x==='string'?x:(x.text||JSON.stringify(x)))}</div>`).join('');},
  trends:(g,s)=>{const game=g.away.abbr+'@'+g.home.abbr,T=nhlTrendsFor(game),C=nhlConsFor(game),X=nhlOutsideFor(game);
    const out=[];
    if(X.length)out.push('<div class="sub" style="margin-bottom:4px"><b>Outside picks</b></div>'+X.map(x=>`<div class="sub">• ${nhlEsc(x.pick)} <span style="color:var(--mute)">(${nhlEsc(x.src)})</span></div>`).join(''));
    if(T.length)out.push('<div class="sub" style="margin:6px 0 4px"><b>Trends</b></div>'+T.map(t=>{const m=String(t.text).match(/(\d+)-(\d+)/);const fade=m&&+m[1]<+m[2];
      return`<div class="sub" style="color:${fade?'var(--rust)':'var(--chalk-dim)'}">${t.team?'<b>'+nhlEsc(t.team)+'</b> ':''}${nhlEsc(t.text)}${fade?' — fade':''}</div>`;}).join(''));
    if(C.length)out.push('<div class="sub" style="margin:6px 0 4px"><b>Consensus</b></div>'+C.map(c=>`<div class="sub">${c.market==='total'?`O ${c.overPct}% / U ${c.underPct}%`:`${g.away.abbr} ${c.awayPct}% / ${g.home.abbr} ${c.homePct}%`} <span style="color:var(--mute)">${c.metric||''}</span></div>`).join(''));
    try{out.push(intelPicksFor('nhl',game)||'')}catch(e){}
    return out.join('')||'<div class="sub">No trends, consensus or outside picks uploaded for this game yet.</div>';},
  roster:async(g)=>{const [a,h]=await Promise.all([nhlFetchRoster(g.away.tid),nhlFetchRoster(g.home.tid)]);
    const side=(ab,R)=>!R?`<div class="sub">${ab}: roster unavailable</div>`:`<div style="flex:1;min-width:150px"><div class="sub"><b>${ab}</b></div>${R.groups.map(G=>
      `<div style="font-family:'IBM Plex Mono';font-size:9px;color:var(--mute);margin-top:4px">${nhlEsc(G.pos)}</div>`+G.players.map(p=>
      `<div style="font-size:11px">${p.num?'#'+nhlEsc(p.num)+' ':''}${nhlEsc(p.name)} <span style="color:var(--mute)">${nhlEsc(p.pos)}</span>${p.inj?` <span style="color:var(--rust)">${nhlEsc(p.inj)}</span>`:''}</div>`).join('')).join('')}</div>`;
    return`<div style="display:flex;gap:12px;flex-wrap:wrap">${side(g.away.abbr,a)}${side(g.home.abbr,h)}</div>`;},
  /* Props — same shape as the NFL card: grouped by team, one block per player
     with the projection, season rate and a tappable ladder. Book PROP: lines
     price against the model underneath each player. Every ladder rung and book
     line still taps straight onto the slip and grades off the live box. */
  props:(g,s)=>{const L=nhlLineObj(g.away.abbr+'@'+g.home.abbr);const pc=x=>Math.round(x*100)+'%';
    const rung=(player,stat,line,dir,price,label)=>{const M=nhlPropModel(player,stat,line,dir,g,s);if(!M)return'';
      const pick=`${player} ${dir==='atleast'?line+'+':dir+' '+line} ${stat}`;const on=SLIP.some(x=>x.id===g.id+'|'+pick);
      const ev=price!=null?nhlEV(M.p,price):null;
      return`<span role="button" class="nhl-rung" style="cursor:pointer;white-space:nowrap;${on?'color:var(--gold)':''}" onclick="sportSlipToggle('nhl','${g.id}','${nhlQ(pick)}',${price!=null?price:nhlFair(M.p)},{nhlProp:{player:'${nhlQ(player)}',stat:'${stat}',thr:${line},dir:'${dir}'},isProp:1})">${on?'✓ ':''}${label} <b>${pc(M.p)}</b>${price!=null?` <span style="color:var(--mute)">(${nhlSgn(price)})</span> <span style="color:${ev>=2?'var(--win)':ev<0?'var(--rust)':'var(--gold)'}">${ev>=0?'+':''}${ev.toFixed(1)}% EV</span>`:''}</span>`;};
    const book=L.props||[];const used=new Set();
    const bookFor=P=>book.filter((x,i)=>{const f=nhlFindPlayer(x.player);if(f&&f.name===P.name){used.add(i);return true;}return false;});
    const block=P=>{const goalie=P.pos==='G';const gpTxt=P.gp?` in ${P.gp}`:(P.gpPrev?' · last season':'');
      let head,ladder;
      if(goalie){const M=nhlPropModel(P.name,'saves',24.5,'over',g,s);if(!M)return'';const mid=Math.floor(M.mu)+0.5;
        head=`saves proj <b style="color:var(--gold)">${M.mu.toFixed(1)}</b> <span style="color:var(--mute)">(likely starter — not confirmed)</span>`;
        ladder=[mid-2,mid,mid+2].filter(x=>x>0).map(l=>rung(P.name,'saves',l,'over',null,l+'+ SV')).join(' · ');}
      else{const Mp=nhlPropModel(P.name,'points',1,'atleast',g,s),Ms=nhlPropModel(P.name,'shots',2.5,'over',g,s);if(!Mp&&!Ms)return'';
        head=`PTS proj <b style="color:var(--gold)">${Mp?Mp.mu.toFixed(2):'—'}</b> · SOG proj <b style="color:var(--gold)">${Ms?Ms.mu.toFixed(1):'—'}</b> <span style="color:var(--mute)">(season ${P.pts.toFixed(2)} pts · ${P.sog.toFixed(1)} sog /g${gpTxt})</span>`;
        ladder=[rung(P.name,'points',1,'atleast',null,'1+ PTS'),rung(P.name,'goals',1,'atleast',null,'1+ G'),
          rung(P.name,'shots',1.5,'over',null,'2+ SOG'),rung(P.name,'shots',2.5,'over',null,'3+ SOG'),rung(P.name,'shots',3.5,'over',null,'4+ SOG')].filter(Boolean).join(' · ');}
      const bk=bookFor(P).map(x=>rung(x.player,x.stat,x.line,x.side,x.price,`book ${x.side==='atleast'?x.line+'+':x.side+' '+x.line} ${x.stat}`)).filter(Boolean);
      return`<div class="mono" style="font-size:10px;line-height:1.7;margin-bottom:5px">${nhlEsc(P.name)} <span style="color:var(--mute)">${nhlEsc(P.pos||'')}</span> · ${head}<br>${ladder}${bk.length?'<br>'+bk.join(' · '):''}</div>`;};
    let body='';
    if(NHL_PLAYERS){[g.away.abbr,g.home.abbr].forEach(ab=>{
      const sk=Object.values(NHL_PLAYERS).filter(p=>p.team===ab&&p.pos!=='G').sort((a,b)=>b.pts-a.pts).slice(0,6);
      const gk=Object.values(NHL_PLAYERS).filter(p=>p.team===ab&&p.pos==='G').sort((a,b)=>(b.gp+b.gpPrev)-(a.gp+a.gpPrev))[0];
      body+=`<div style="margin-top:6px"><b>${ab}</b>${[...sk,...(gk?[gk]:[])].map(block).join('')}</div>`;});}
    const orphan=book.filter((x,i)=>!used.has(i)).map(x=>rung(x.player,x.stat,x.line,x.side,x.price,`${nhlEsc(x.player)} ${x.side==='atleast'?x.line+'+':x.side+' '+x.line} ${x.stat}`)||
      `<span style="color:var(--mute)">${nhlEsc(x.player)} ${x.stat} ${x.line} — no model match</span>`);
    if(orphan.length)body+=`<div style="margin-top:6px"><b>Book lines</b><div class="mono" style="font-size:10px;line-height:1.7">${orphan.join('<br>')}</div></div>`;
    return`<div class="sub" style="margin-bottom:8px"><b>Model props</b> — season rates (blended with last season early on), scaled to this game's projected goals. % = chance of clearing. Tap any rung to add it to your slip — it grades off the live box score.</div>
      <div class="sub mono" style="font-size:9.5px;color:var(--mute)">${nhlEsc(NHL_STATUS.players||'player stats not loaded yet')}</div>`+
      (body||'<div class="sub">No player stats loaded and no PROP: lines uploaded. Upload lines as <code>PROP: Name SOG 2.5 (-120/+100)</code>.</div>');},
  box:(g,s)=>{const t=(ab,x)=>{const p=[NHL_P1,0.33,0.36].map(f=>(x*f).toFixed(2));return[ab,...p,x.toFixed(2),Math.round(x/0.098)];};
    return nhlTable(['team','P1','P2','P3','G','SOG≈'],[t(g.away.abbr,s.awayProj),t(g.home.abbr,s.homeProj)])+
      `<div class="sub" style="margin-top:4px">Win ${g.away.abbr} ${(s.aw*100).toFixed(0)}% / ${g.home.abbr} ${(s.hw*100).toFixed(0)}% · OT/SO ${(s.otP*100).toFixed(0)}% · shots ≈ goals ÷ league shooting % (estimate).</div>`;},
  live:async(g)=>{if(g.abstract==='pre')return'<div class="sub">Box score appears once the puck drops.</div>';
    const b=await fetchNHLBox(g.espnId);if(!b)return'<div class="sub">Box score unavailable.</div>';
    const per=[g.away,g.home].map((t,i)=>[t.abbr,...(i?g.lsH:g.lsA).map(v=>v??'–'),i?g.homeScore:g.awayScore]);
    const nper=Math.max(g.lsA.length,g.lsH.length,3);
    let h=nhlTable(['',...Array.from({length:nper},(_,i)=>i<3?'P'+(i+1):i===3?'OT':'SO'),'T'],per);
    Object.entries(b.teams).forEach(([ab,t])=>{
      h+=`<div class="sub" style="margin-top:8px"><b>${ab}</b> skaters</div>`+nhlTable(['player','G','A','PTS','SOG','TOI'],
        t.skaters.filter(r=>nhlBoxVal(r,'points')>0||nhlBoxVal(r,'shots')>0).sort((x,y)=>nhlBoxVal(y,'points')-nhlBoxVal(x,'points')||nhlBoxVal(y,'shots')-nhlBoxVal(x,'shots'))
        .map(r=>[nhlEsc(r.name),nhlBoxVal(r,'goals'),nhlBoxVal(r,'assists'),nhlBoxVal(r,'points'),nhlBoxVal(r,'shots'),nhlEsc(r.TOI||'')]));
      if(t.goalies.length)h+=nhlTable(['goalie','SA','SV','GA','SV%'],t.goalies.map(r=>[nhlEsc(r.name),r.SA??'',nhlBoxVal(r,'saves'),r.GA??'',r['SV%']??'']));});
    return h;},
  mybets:(g)=>{const game=g.away.abbr+'@'+g.home.abbr;const rows=[];
    get(LS.locked,[]).forEach(t=>(t.legs||[]).forEach(l=>{if(l.sport!=='nhl'||l.game!==game)return;let b='';try{b=gradeLegBadge(l,t.date)}catch(e){}
      rows.push(`<div class="sub">${nhlEsc(t.name||'Ticket')}: <b>${nhlEsc(l.pick)}</b> ${b}</div>`);}));
    return rows.join('')||'<div class="sub">No locked tickets have a leg on this game.</div>';}
};

/* ── Snapshots & record ────────────────────────────────────────────────── */
function nhlSnapshot(){
  const arc=get(NHL_LS.arc,{}),d=today(),day=arc[d]||(arc[d]={rows:[]});let changed=false;
  NHL_GAMES.forEach(g=>{if(g.abstract!=='pre'||NHL_FLAT)return;const s=nhlSimFor(g),L=nhlLineObj(g.away.abbr+'@'+g.home.abbr);
    let row=day.rows.find(r=>r.gid===g.id);if(!row){row={gid:g.id,game:g.away.abbr+'@'+g.home.abbr,v:2,picks:[]};day.rows.push(row);}
    try{const J=brainJudge(g,s,'nhl');if(J)row.judge=brainLockable(J);}catch(e){}
    const cand=[];
    if(L.awayML&&L.homeML){cand.push({m:'ml',side:'away',price:L.awayML.price,p:s.aw},{m:'ml',side:'home',price:L.homeML.price,p:s.hw});}
    if(L.over&&L.under){cand.push({m:'total',side:'over',line:L.over.line,price:L.over.price,p:s.over(L.over.line)},{m:'total',side:'under',line:L.under.line,price:L.under.price,p:s.under(L.under.line)});}
    if(L.awayPL&&L.homePL){cand.push({m:'spread',side:'away',line:L.awayPL.line,price:L.awayPL.price,p:s.awayCover(L.awayPL.line)},{m:'spread',side:'home',line:L.homePL.line,price:L.homePL.price,p:s.homeCover(L.homePL.line)});}
    row.picks=['ml','total','spread'].map(m=>{const c=cand.filter(x=>x.m===m).map(x=>({...x,ev:nhlEV(x.p,x.price)})).sort((a,b)=>b.ev-a.ev)[0];return c&&c.ev>=2?c:null;}).filter(Boolean);
    changed=true;});
  if(changed){Object.keys(arc).sort().slice(0,-120).forEach(k=>delete arc[k]);set(NHL_LS.arc,arc);}
}
function nhlTeamSOG(t){return(t.skaters||[]).reduce((a,r)=>a+(parseFloat(r.S??r.SOG??0)||0),0);}
function nhlCollectActualBoxes(day){
  (day&&day.rows||[]).forEach(r=>{if(!r.final||r.actualBox||!r.judge||(r.boxTried||0)>2)return;
    const g=NHL_GAMES.find(z=>z.id===r.gid);if(!g||!g.espnId)return;
    const use=b=>{if(!b||!b.teams)return;const[A,H]=r.game.split('@');const ta=b.teams[A],th=b.teams[H];if(!ta||!th)return;
      const arc=get(NHL_LS.arc,{});const D=Object.values(arc).find(x=>(x.rows||[]).some(y=>y.gid===r.gid&&y.game===r.game));if(!D)return;
      const R=D.rows.find(y=>y.gid===r.gid);R.actualBox={away:{sog:nhlTeamSOG(ta),g:r.final.a},home:{sog:nhlTeamSOG(th),g:r.final.h}};set(NHL_LS.arc,arc);
      try{brainLearn('nhl')}catch(e){}};
    const c=NHL_BOX_CACHE[g.espnId];if(c)use(c);else{r.boxTried=(r.boxTried||0)+1;fetchNHLBox(g.espnId).then(use).catch(()=>{});}
  });
}
/* v1.89 · past-day finals. nhlArchiveFinals only ever looked at TODAY, so any day the app
   wasn't open when the games ended stayed "waiting on finals" forever (103 picks). One
   ranged scoreboard call fills every open day from the last 30. Throttled to 10 min. */
let NHL_BACKFILL_TS=0;
async function nhlBackfillFinals(force){
  if(!force&&Date.now()-NHL_BACKFILL_TS<600e3)return 0;NHL_BACKFILL_TS=Date.now();
  const arc=get(NHL_LS.arc,{}),td=today(),lo=dayShift(td,-30);
  const open=Object.keys(arc).filter(d=>d<td&&d>=lo&&(arc[d].rows||[]).some(r=>!r.final)).sort();if(!open.length)return 0;
  const f=d=>d.replace(/-/g,'');
  let j=null;try{const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${f(open[0])}-${f(dayShift(td,-1))}&limit=300`);j=await r.json();}catch(e){return 0;}
  const G={};(j&&j.events||[]).map(nhlParseEvent).filter(Boolean).forEach(g=>{G[g.id]=g;});
  let n=0;open.forEach(d=>(arc[d].rows||[]).forEach(r=>{if(r.final)return;const g=G[String(r.gid)];if(!g||g.abstract!=='post'||g.awayScore==null)return;
    r.final={a:+g.awayScore,h:+g.homeScore,p1a:g.p1a,p1h:g.p1h};r.awayScore=+g.awayScore;r.homeScore=+g.homeScore;n++;}));
  if(n){set(NHL_LS.arc,arc);try{brainLearn('nhl')}catch(e){}try{if(document.getElementById('gradeBody')&&typeof renderNHLRecord==='function'&&ACTIVE_SPORT==='nhl')renderNHLRecord();}catch(e){}}
  return n;}
function nhlArchiveFinals(){
  try{nhlBackfillFinals();}catch(e){}
  const arc=get(NHL_LS.arc,{}),d=today(),day=arc[d];if(!day)return;let ch=false;
  NHL_GAMES.forEach(g=>{if(g.abstract!=='post'||g.awayScore==null)return;const r=day.rows.find(x=>x.gid===g.id);if(!r||r.final)return;
    r.final={a:+g.awayScore,h:+g.homeScore,p1a:g.p1a,p1h:g.p1h};r.awayScore=+g.awayScore;r.homeScore=+g.homeScore;ch=true;});
  if(ch)set(NHL_LS.arc,arc);
  nhlCollectActualBoxes(day);
  try{brainLearn('nhl')}catch(e){console.warn('nhl brain',e)}
}
function renderNHLRecord(){
  const nav=document.getElementById('gradeNav');if(nav)nav.innerHTML='<button class="on">🏒 NHL record</button>';
  const body=document.getElementById('gradeBody');if(!body)return;
  const arc=get(NHL_LS.arc,{});const T={ml:{W:0,L:0,P:0,u:0},total:{W:0,L:0,P:0,u:0},spread:{W:0,L:0,P:0,u:0}};let pend=0;
  Object.values(arc).forEach(D=>(D.rows||[]).forEach(r=>(r.picks||[]).forEach(p=>{
    if(!r.final){pend++;return;}const a=r.final.a,h=r.final.h;let res=null;
    if(p.m==='ml')res=(p.side==='home')===(h>a);
    else if(p.m==='total'){const t=a+h;res=t===p.line?null:(p.side==='over')===(t>p.line);}
    else{const m=(p.side==='home'?h-a:a-h)+p.line;res=m===0?null:m>0;}
    const b=T[p.m];const pr=nhlProfit(p.price);if(res===null)b.P++;else if(pr==null){res?b.W++:b.L++;b.nu=(b.nu||0)+1;}else if(res){b.W++;b.u+=pr;}else{b.L++;b.u-=1;}})));
  const lab={ml:'Moneyline',total:'Total',spread:'Puck line'};
  let h=`<div class="tkt hi"><h3>System picks — model's best-EV side per market (≥2% EV, locked pregame)</h3>`+
    Object.entries(T).map(([k,b])=>`<div class="sub">${lab[k]}: <b>${b.W}-${b.L}${b.P?'-'+b.P:''}</b> · ${b.u>=0?'+':''}${b.u.toFixed(2)}u${b.nu?` <span style="color:var(--mute)">(${b.nu} unpriced, not in units)</span>`:''}</div>`).join('')+
    (pend?`<div class="sub" style="color:var(--mute)">${pend} pick${pend>1?'s':''} waiting on finals</div>`:'')+`</div>`;
  try{h+=voicesReport('nhl')}catch(e){}
  try{h+=intelReport('nhl')}catch(e){}
  body.innerHTML=h;
}

/* Upcoming days: full cards (sim, lines, characters) grouped by day. */
function nhlUpcomingHtml(){
  if(!NHL_UPCOMING.length)return'';
  const byDay={};NHL_UPCOMING.forEach(g=>{(byDay[g.__date]=byDay[g.__date]||[]).push(g)});
  return Object.keys(byDay).sort().map(d=>{
    const lab=new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
    return`<div class="sbar" style="margin-top:14px"><h2>${lab} · upcoming</h2><div class="ln"></div></div>`+
      byDay[d].sort((a,b)=>String(a.start).localeCompare(String(b.start))).map(g=>{try{return nhlCard(g)}catch(e){console.warn('nhl upcoming card',e);return''}}).join('');
  }).join('');
}
/* ── Board ─────────────────────────────────────────────────────────────── */
function renderNHL(){
  const el=document.getElementById('slate');if(!el)return;
  ['nflPowerWarn','cfbPowerWarn'].forEach(id=>{const w=document.getElementById(id);if(w)w.style.display='none';});
  const nG=document.getElementById('nG');if(nG)nG.textContent=NHL_GAMES.length;
  const status=`<div class="sub" style="font-family:'IBM Plex Mono';font-size:10px;margin:0 3px 8px">🏒 ${nhlEsc(NHL_STATUS.sched)} · ${nhlEsc(NHL_STATUS.ratings)} · ${nhlEsc(NHL_STATUS.players)}</div>`;
  const upcoming=nhlUpcomingHtml();
  if(!NHL_GAMES.length){el.innerHTML=status+'<div class="empty">No NHL games today.</div>'+upcoming;return;}
  const y=window.scrollY,open={...NHL_OPEN};
  const order={in:0,pre:1,post:2};
  el.innerHTML=status+[...NHL_GAMES].sort((a,b)=>order[a.abstract]-order[b.abstract]||String(a.start).localeCompare(String(b.start))).map(g=>{try{return nhlCard(g)}catch(e){console.warn('nhl card',e);return`<div class="tkt"><div class="sub">${g.away.abbr} @ ${g.home.abbr}: card error — ${nhlEsc(e.message)}</div></div>`;}}).join('')+upcoming;
  Object.entries(open).forEach(([gid,k])=>{if(!k)return;NHL_OPEN[gid]=null;const b=null;nhlPan(gid,k,b);});
  window.scrollTo(0,y);
  setTimeout(()=>{try{nhlSnapshot();nhlArchiveFinals();syncFinalsToShared();voicesLog('nhl');gradeVoices();gradeIntel();}catch(e){console.warn('nhl bookkeeping',e)}},0);
}
let NHL_LIVE_TIMER=null;
function nhlLiveLoop(){
  if(NHL_LIVE_TIMER)clearInterval(NHL_LIVE_TIMER);
  NHL_LIVE_TIMER=setInterval(async()=>{if(document.hidden||ACTIVE_SPORT!=='nhl')return;
    if(!NHL_GAMES.some(g=>g.abstract==='in'||(g.abstract==='pre'&&Date.parse(g.start)-Date.now()<15*60e3)))return;
    await loadNHLSchedule();renderNHL();},45e3);
}
async function nhlBoot(force){
  let season=nhlLoadCachedSchedule();if(NHL_GAMES.length)renderNHL();
  const fresh=await loadNHLSchedule();season=fresh||season||new Date().getFullYear()+1;
  try{await loadNHLUpcoming(3);nhlApplySeed();}catch(e){console.warn('nhl upcoming',e)}
  await loadNHLRatings(season,force);NHL_SIMS={};renderNHL();
  if(force&&(typeof theOddsApiKey==='function'?theOddsApiKey():get(LS.key,''))){try{await fetchNHLLiveOdds()}catch(e){console.warn(e)}}
  loadNHLPlayers(season,force).then(()=>renderNHL()).catch(()=>{});
  try{if(typeof intakeReplay==='function')intakeReplay()}catch(e){}
  nhlLiveLoop();
}

try{if(typeof nhlCard==='function'){const _h=nhlCard;nhlCard=function(g){return pregameWrap('nhl',g,_h.apply(this,arguments));};}}catch(e){}

/* ══ NHL MASTER EVALUATION (v1.78) ══════════════════════════════════════════
   Hockey had no master evaluation at all — the Records → Model eval tab on the
   NHL page fell through to the MLB one. Same shape as the football evaluator:
   every pregame game with a book line, every market the book posts (moneyline,
   puck line, total, and the three 1st-period markets), the sim's read checked
   against every independent witness (Judge, Covers/uploaded prediction, trends,
   sharp money, outside picks), and a verdict per market. */
const NHL_EVAL_KEY='d4.nhleval';
function nhlEvalInputs(){
  const G=NHL_GAMES||[];let book=0,espn=0,lined=0;
  G.forEach(g=>{const L=nhlBookLinesFor(g.away.abbr+'@'+g.home.abbr)||[];if(L.length)lined++;L.forEach(x=>{x.src==='espn'?espn++:book++});});
  const d=today();const I=(get(INTEL_KEY,[])||[]).filter(x=>x.sp==='nhl'&&String(x.date||'').slice(0,10)===d);
  const P=((get('d4.preds',{})||{}).nhl||{})[d]||{};
  let brain=0;try{brain=(brainGet('nhl').log||[]).length;}catch(e){}
  return{games:G.length,sims:G.filter(g=>NHL_SIMS[g.id]).length,lined,book,espn,rated:NHL_RATINGS&&NHL_RATINGS.teams?Object.keys(NHL_RATINGS.teams).length:0,
    preds:Object.keys(P).length,trends:I.filter(x=>x.kind==='trend').length,cons:I.filter(x=>x.kind==='cons').length,brain};
}
function nhlEvalFingerprint(){return JSON.stringify(nhlEvalInputs())}
function runNHLMasterEval(){
  const evals=[];const evOf=(p,price)=>(p*(nhlProfit(price!=null?+price:-110)??100/110)-(1-p))*100;
  (NHL_GAMES||[]).forEach(g=>{
    if((g.abstract||'pre')!=='pre')return;
    const k=g.away.abbr+'@'+g.home.abbr,O=nhlLineObj(k);
    if(!O.awayML&&!O.homeML&&!O.over&&!O.awayPL)return;                 // no line, nothing to evaluate
    let s=null;try{s=nhlSimFor(g)}catch(e){return}if(!s)return;
    let J=null;try{J=brainJudge(g,s,'nhl')}catch(e){}
    const pred=typeof predFor==='function'?predFor('nhl',k):null;
    let tr={dMar:0,dTot:0};try{tr=brainTrendEvidence(g,'nhl')||tr;}catch(e){}
    let mo=null;try{mo=brainMoney(g,'nhl')}catch(e){}
    let xp=[];try{xp=intelPicksFor('nhl',k)||[];}catch(e){}
    const A=g.away.abbr,H=g.home.abbr,mkts=[];
    const add=(market,label,side,p,price,sig)=>{if(p==null||!isFinite(p)||price==null)return;mkts.push({market,label,side,p,price,ev:evOf(p,price),sig});};
    const better=(a,b)=>!a?b:!b?a:(b.ev>a.ev?b:a);
    const pick2=(oA,pA,oB,pB)=>better(oA&&oA.price!=null?{o:oA,p:pA,ev:evOf(pA,oA.price)}:null,oB&&oB.price!=null?{o:oB,p:pB,ev:evOf(pB,oB.price)}:null);
    const sideSig=(hs,ln)=>{const sig=[];
      if(J){const mu=J.h-J.a;sig.push({src:'Judge',ok:ln==null?(hs?J.pHome>0.5:J.pHome<0.5):(hs?mu+ln>0:-mu+ln>0),detail:`${A} ${J.a}–${J.h} ${H}`});}
      if(pred){const m=pred.h-pred.a;sig.push({src:'Prediction',ok:ln==null?(hs?m>0:m<0):(hs?m+ln>0:-m+ln>0),detail:`${pred.a}–${pred.h}`});}
      if(Math.abs(tr.dMar||0)>=0.1)sig.push({src:'Trends',ok:(tr.dMar>0)===hs,detail:(tr.dMar>0?H:A)+' lean'});
      if(mo&&mo.side)sig.push({src:'Sharp money',ok:(mo.side>0)===hs,detail:mo.note});
      xp.forEach(x=>{const m=String(x.pick).match(/^([A-Z]{2,4})\b/);if(!m||/^(P1)/.test(x.pick)||(m[1]!==A&&m[1]!==H))return;
        sig.push({src:x.src+(x.rec&&x.rec.n?` (${x.rec.w}-${x.rec.n-x.rec.w})`:''),ok:(m[1]===H)===hs,detail:x.pick});});
      return sig;};
    const totSig=(ov,ln,scale)=>{const sig=[];
      if(J){const t=(J.a+J.h)*scale;sig.push({src:'Judge',ok:ov?t>ln:t<ln,detail:`total ${t.toFixed(2)}`});}
      if(pred){const t=(+pred.a+ +pred.h)*scale;sig.push({src:'Prediction',ok:ov?t>ln:t<ln,detail:`total ${t.toFixed(2)}`});}
      if(Math.abs(tr.dTot||0)>=0.1)sig.push({src:'Trends',ok:(tr.dTot>0)===ov,detail:(tr.dTot>0?'Over':'Under')+' lean'});
      if(scale===1)xp.forEach(x=>{const m=String(x.pick).match(/^(Over|Under) /);if(!m)return;
        sig.push({src:x.src+(x.rec&&x.rec.n?` (${x.rec.w}-${x.rec.n-x.rec.w})`:''),ok:(m[1]==='Over')===ov,detail:x.pick});});
      return sig;};
    const P1S=s.p1Proj&&(s.awayProj+s.homeProj)?s.p1Proj/(s.awayProj+s.homeProj):0.31;
    /* moneyline */
    {const b=pick2(O.awayML,s.aw,O.homeML,s.hw);if(b){const hs=b.o===O.homeML;
      add('ml',`${hs?H:A} ML`,hs?'home':'away',b.p,b.o.price,[{src:'Sim',ok:true,detail:`${hs?H:A} ${Math.round(b.p*100)}%`},...sideSig(hs,null)]);}}
    /* puck line */
    {const pa=O.awayPL&&O.awayPL.line!=null?s.awayCover(+O.awayPL.line):null,ph=O.homePL&&O.homePL.line!=null?s.homeCover(+O.homePL.line):null;
     const b=pick2(pa!=null?O.awayPL:null,pa,ph!=null?O.homePL:null,ph);if(b){const hs=b.o===O.homePL,ln=+b.o.line;
      add('pl',`${hs?H:A} ${ln>0?'+':''}${ln}`,hs?'home':'away',b.p,b.o.price,[{src:'Sim',ok:true,detail:`${hs?H:A} ${ln>0?'+':''}${ln} · ${Math.round(b.p*100)}%`},...sideSig(hs,ln)]);}}
    /* total */
    {const ln=O.over&&O.over.line!=null?+O.over.line:O.under&&O.under.line!=null?+O.under.line:null;
     if(ln!=null){const po=s.over(ln),pu=s.under(ln),dec=po+pu>0?po+pu:1;   /* whole-number totals: a push refunds */
      const b=pick2(O.over,po/dec,O.under,pu/dec);if(b){const ov=b.o===O.over;
        add('total',`${ov?'Over':'Under'} ${ln}`,ov?'over':'under',b.p,b.o.price,[{src:'Sim',ok:true,detail:`${ov?'Over':'Under'} ${ln} · ${Math.round(b.p*100)}%`},...totSig(ov,ln,1)]);}}}
    /* 1st period */
    {const b=pick2(O.p1mlA,s.p1Win('away'),O.p1mlH,s.p1Win('home'));if(b){const hs=b.o===O.p1mlH;
      add('p1ml',`${hs?H:A} P1 ML`,hs?'home':'away',b.p,b.o.price,[{src:'Sim',ok:true,detail:`${hs?H:A} ${Math.round(b.p*100)}% (tie refunds)`},...sideSig(hs,null).filter(x=>x.src!=='Sharp money')]);}}
    {const pa=O.p1plA&&O.p1plA.line!=null?s.p1Cover('away',+O.p1plA.line):null,ph=O.p1plH&&O.p1plH.line!=null?s.p1Cover('home',+O.p1plH.line):null;
     const b=pick2(pa!=null?O.p1plA:null,pa,ph!=null?O.p1plH:null,ph);if(b){const hs=b.o===O.p1plH,ln=+b.o.line;
      add('p1pl',`${hs?H:A} P1 ${ln>0?'+':''}${ln}`,hs?'home':'away',b.p,b.o.price,[{src:'Sim',ok:true,detail:`${Math.round(b.p*100)}%`}]);}}
    {const ln=O.p1over&&O.p1over.line!=null?+O.p1over.line:null;
     if(ln!=null){const b=pick2(O.p1over,s.p1Over(ln),O.p1under,s.p1Under(ln));if(b){const ov=b.o===O.p1over;
      add('p1total',`P1 ${ov?'Over':'Under'} ${ln}`,ov?'over':'under',b.p,b.o.price,[{src:'Sim',ok:true,detail:`${Math.round(b.p*100)}%`},...totSig(ov,ln,P1S).filter(x=>x.src!=='Trends')]);}}}
    mkts.forEach(m=>{const others=m.sig.slice(1),agree=others.filter(x=>x.ok).length,against=others.length-agree;
      m.agree=agree;m.against=against;m.suspect=m.ev>12;
      m.verdict=m.suspect?'split':m.ev>=3&&agree>=2&&against===0?'strong':m.ev>=1.5&&agree>=against?'lean':m.ev<0?'away':'split';});
    const rank={strong:0,lean:1,split:2,away:3};mkts.sort((a,b)=>rank[a.verdict]-rank[b.verdict]||b.ev-a.ev);
    if(!mkts.length)return;
    evals.push({game:k,time:g.time||'',mkts,best:mkts[0],judge:J?{a:J.a,h:J.h,blow:Math.max(J.blowH||0,J.blowA||0)}:null});
  });
  set(NHL_EVAL_KEY,{date:today(),ts:Date.now(),fingerprint:nhlEvalFingerprint(),evals});
  try{evalLockMark('nhl');}catch(e){}
  try{renderRecordsHub()}catch(e){}try{renderTickets()}catch(e){}
  return evals;
}
function renderNHLMasterEval(){
  const I=nhlEvalInputs();let run=get(NHL_EVAL_KEY,null);if(run&&run.date!==today())run=null;const stale=run&&run.fingerprint!==nhlEvalFingerprint();
  const chip=(ok,label,n)=>`<div style="display:flex;align-items:center;gap:6px;font-size:12px"><span style="width:7px;height:7px;border-radius:50%;background:${ok?'var(--win)':'var(--rule)'};flex:0 0 auto"></span><span style="color:${ok?'var(--chalk)':'var(--mute)'}">${label}</span><span class="m">${n}</span></div>`;
  const t=x=>new Date(x).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  const status=!run?`<div class="note" style="border-left:3px solid var(--gold);padding-left:10px"><b style="color:var(--gold)">Not evaluated yet.</b> Load what you've got, then hit Run evaluation.</div>`
    :stale?`<div class="note" style="border-left:3px solid var(--gold);padding-left:10px"><b style="color:var(--gold)">Inputs changed since the last run.</b> Last evaluated ${t(run.ts)} — run it again for a current read.</div>`
    :`<div class="note" style="border-left:3px solid var(--win);padding-left:10px"><b style="color:var(--win)">✓ Evaluated ${t(run.ts)}</b> — ${run.evals.length} games with lines. Nothing has changed since.</div>`;
  const feed=`<div class="tkt hi"><h3>NHL master evaluation</h3>
    <div class="sub" style="margin-bottom:9px">Every independent read on tonight's games — full game and 1st period — weighed against your book line.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 14px">
      ${chip(I.sims>0,'Simulations',I.sims+'/'+I.games)}${chip(I.book+I.espn>0,'Book lines',I.book+(I.espn?' +'+I.espn+' ESPN':''))}
      ${chip(I.rated>0,'Team ratings',I.rated+' teams')}${chip(I.preds>0,'Predicted scores',I.preds)}
      ${chip(I.trends>0,'Trends',I.trends)}${chip(I.cons>0,'Public consensus',I.cons)}${chip(I.brain>0,'Brain (graded games)',I.brain)}
    </div>
    <div class="bar" style="margin-top:11px"><button class="primary" onclick="runNHLMasterEval()">${run&&!stale?'Re-run evaluation':'Run evaluation'}</button></div></div>${status}`;
  if(!run)return feed+`<div class="empty">Results appear here once you run it. Only games with a book line are scored — no line, no edge.</div>`;
  if(!run.evals.length)return feed+`<div class="empty">No pregame NHL games with book lines yet. Upload odds or open the Games board so ESPN lines fill in.</div>`;
  const counts={strong:0,lean:0,split:0,away:0};run.evals.forEach(e=>counts[(e.best||{}).verdict||'split']++);
  const pc=x=>Math.round(x*100)+'%';
  const summary=`<div class="tkt"><div style="display:flex;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:12px">${['strong','lean','split','away'].map(k=>`<div><div style="font-family:'Archivo';font-weight:900;font-size:22px;color:${VERDICT[k].color}">${counts[k]}</div><div class="m">${VERDICT[k].label}</div></div>`).join('')}</div></div>`;
  const cards=run.evals.map(e=>{const B=e.best||{};const V=VERDICT[B.verdict||'split'];
    return`<div class="tkt" style="border-left:3px solid ${V.color}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
        <div><div style="font-family:'Archivo';font-weight:900;font-size:16px">${e.game}</div><div class="m">${e.time}${e.judge?` · Judge ${e.judge.a}–${e.judge.h}`:''}</div></div>
        <div style="text-align:right"><div style="font-family:'Inter';font-weight:800;font-size:11px;letter-spacing:.08em;color:${V.color}">${V.label}</div><div class="m">${B.label||''}</div></div></div>
      ${e.mkts.map(m=>`<div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--hair)">
        <div style="display:flex;justify-content:space-between;font-size:12.5px"><b>${m.label} <span class="m">(${m.price>0?'+':''}${m.price})</span></b>
          <span style="color:${VERDICT[m.verdict].color};font-weight:700">${VERDICT[m.verdict].label} · ${pc(m.p)} · ${m.ev>=0?'+':''}${m.ev.toFixed(1)}% EV</span></div>
        ${m.suspect?`<div class="sub" style="color:var(--gold)">EV this high usually means a stale line or thin data — verify before betting.</div>`:''}
        ${m.sig.map(x=>`<div style="display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0"><span style="color:var(--mute)">${x.src}</span><span style="color:${x.ok?'var(--chalk)':'var(--rust)'};font-weight:600">${x.ok?'':'✗ '}${x.detail}</span></div>`).join('')}
      </div>`).join('')}</div>`;}).join('');
  return feed+summary+cards;
}
