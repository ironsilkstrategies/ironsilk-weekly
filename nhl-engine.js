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

let NHL_GAMES=[],NHL_SIMS={},NHL_BOX_CACHE={},NHL_RATINGS=null,NHL_PLAYERS=null,NHL_ROSTERS={},NHL_FLAT=true;
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
const nhlProfit=a=>a>0?a/100:100/Math.abs(a);
const nhlEV=(p,a)=>p==null||a==null||isNaN(a)?null:(p*nhlProfit(+a)-(1-p))*100;
const nhlFair=p=>p==null?null:(p>=0.5?Math.round(-(p/(1-p))*100):Math.round(((1-p)/p)*100));
const nhlSgn=n=>n==null?'—':(n>0?'+'+n:''+n);
function nhlPois(l){let L=Math.exp(-l),k=0,p=1;do{k++;p*=Math.random();}while(p>L);return k-1;}
function nhlPoisCDF(k,l){let s=0,t=Math.exp(-l);for(let i=0;i<=k;i++){s+=t;t*=l/(i+1);}return s;}
const nhlPoisAtLeast=(n,l)=>n<=0?1:1-nhlPoisCDF(n-1,l);
function nhlGamma(k){ // Marsaglia–Tsang, k>=1
  const d=k-1/3,c=1/Math.sqrt(9*d);for(;;){let x,v;do{const u1=Math.random(),u2=Math.random();
    x=Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);v=1+c*x;}while(v<=0);v=v*v*v;const u=Math.random();
    if(u<1-0.0331*x*x*x*x||Math.log(u)<0.5*x*x+d*(1-v+Math.log(v)))return d*v;}}
const nhlEsc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nhlQ=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");

/* ── Schedule ──────────────────────────────────────────────────────────── */
function nhlOddsFromEspn(c){
  const o=(c.odds||[])[0];if(!o)return null;
  const num=v=>{const n=parseFloat(String(v==null?'':v).replace(/[^0-9.+\-]/g,''));return isNaN(n)?null:n;};
  const ml=side=>num(o[side+'TeamOdds']&&o[side+'TeamOdds'].moneyLine)??num(o.moneyline&&o.moneyline[side]&&(o.moneyline[side].close||o.moneyline[side].open||{}).odds);
  const sp=side=>num(o[side+'TeamOdds']&&o[side+'TeamOdds'].spreadOdds)??num(o.pointSpread&&o.pointSpread[side]&&(o.pointSpread[side].close||{}).odds);
  const spl=side=>num(o.pointSpread&&o.pointSpread[side]&&(o.pointSpread[side].close||{}).line);
  const tot=num(o.overUnder);
  const ov=num(o.overOdds)??num(o.total&&o.total.over&&(o.total.over.close||{}).odds);
  const un=num(o.underOdds)??num(o.total&&o.total.under&&(o.total.under.close||{}).odds);
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
  const TOT=new Int32Array(30),MAR=new Int32Array(41),P1T=new Int32Array(20);const sf={};
  let aw=0,hw=0,ot=0,sa=0,sh=0,p1a=0,p1h=0;
  for(let i=0;i<N;i++){
    let a=nhlPois(la*nhlGamma(shape)/shape),h=nhlPois(lh*nhlGamma(shape)/shape);
    let q=0,w=0;for(let k=0;k<a;k++)if(Math.random()<NHL_P1)q++;for(let k=0;k<h;k++)if(Math.random()<NHL_P1)w++;
    p1a+=q;p1h+=w;P1T[Math.min(19,q+w)]++;
    if(Math.abs(a-h)===1){const r=Math.random();const lead=a>h?'a':'h';
      if(r<0.12){if(lead==='a')a++;else h++;}else if(r<0.18){if(lead==='a')h++;else a++;}}
    if(a===h){ot++;if(Math.random()<0.51)h++;else a++;}
    if(h>a)hw++;else aw++;sa+=a;sh+=h;
    TOT[Math.min(29,a+h)]++;MAR[Math.max(0,Math.min(40,h-a+20))]++;const key=a+'-'+h;sf[key]=(sf[key]||0)+1;
  }
  const over=L=>{let c=0;for(let t=0;t<30;t++)if(t>L)c+=TOT[t];return c/N;};
  const under=L=>{let c=0;for(let t=0;t<30;t++)if(t<L)c+=TOT[t];return c/N;};
  const homeCover=hl=>{let c=0;for(let m=-20;m<=20;m++)if(m+hl>0)c+=MAR[m+20];return c/N;};
  const awayCover=al=>{let c=0;for(let m=-20;m<=20;m++)if(-m+al>0)c+=MAR[m+20];return c/N;};
  const p1Over=L=>{let c=0;for(let t=0;t<20;t++)if(t>L)c+=P1T[t];return c/N;};
  const p1Under=L=>{let c=0;for(let t=0;t<20;t++)if(t<L)c+=P1T[t];return c/N;};
  let med=0,acc=0;for(let t=0;t<30;t++){acc+=TOT[t];if(acc>=N/2){med=t;break;}}
  let modeScore=null,modeN=0;for(const k in sf)if(sf[k]>modeN){modeN=sf[k];modeScore=k;}
  return{N,la,lh,awayProj:+(sa/N).toFixed(2),homeProj:+(sh/N).toFixed(2),aw:aw/N,hw:hw/N,otP:ot/N,med,
    over,under,homeCover,awayCover,p1Over,p1Under,p1Proj:+((p1a+p1h)/N).toFixed(2),p1a:p1a/N,p1h:p1h/N,
    modeScore,modeScorePct:modeN/N,medMargin:(sh-sa)/N};
}
function nhlSimFor(g){const sig=NHL_RATINGS?NHL_RATINGS.ts:0;let s=NHL_SIMS[g.id];
  if(!s||s._sig!==sig){s=simNHLGame(g);s._sig=sig;NHL_SIMS[g.id]=s;}return s;}

/* ── Lines: storage, priority, intake grammar, live pull ────────────────── */
const NHL_SRC_RANK={mine:3,live:2,espn:1};
function nhlLinesToday(){return get(NHL_LS.shots,{})[today()]||[];}
function nhlPutLines(rows){
  const all=get(NHL_LS.shots,{}),d=today();all[d]=all[d]||[];
  const key=x=>[x.game,x.market,x.side,x.line,x.player||'',x.stat||'',x.src].join('|');
  rows.forEach(r=>{const i=all[d].findIndex(y=>key(y)===key(r));if(i>=0)all[d][i]=r;else all[d].push(r);});
  Object.keys(all).sort().slice(0,-7).forEach(k=>delete all[k]);set(NHL_LS.shots,all);
}
/* Main line per market/side: your uploads beat live pulls beat ESPN. */
function nhlBookLinesFor(game){
  const L=nhlLinesToday().filter(x=>x.game===game);const best={};
  L.forEach(x=>{const k=x.market==='prop'?[x.market,x.player,x.stat,x.side].join('|'):x.market+'|'+x.side;const b=best[k];
    const r=NHL_SRC_RANK[x.src]||0,br=b?(NHL_SRC_RANK[b.src]||0):-1;
    if(!b||r>br||(r===br&&(x.capturedAt||0)>(b.capturedAt||0)))best[k]=x;});
  return Object.values(best);
}
function nhlLineObj(game){
  const L=nhlBookLinesFor(game),f=(m,s)=>L.find(x=>x.market===m&&x.side===s)||null;
  return{awayML:f('moneyline','away'),homeML:f('moneyline','home'),awayPL:f('spread','away'),homePL:f('spread','home'),
    over:f('total','over'),under:f('total','under'),p1over:f('p1total','over'),p1under:f('p1total','under'),
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
  const rows=(picks||[]).map(x=>{const game=x.game||(x.away+'@'+x.home);const g=NHL_GAMES.find(z=>z.away.abbr+'@'+z.home.abbr===game);
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
  return{hit,detail:`${row.name} ${v} ${stat}${R.live?' so far':''}`,live:!!R.live};
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
      if(!to||to.line==null||!ma||!mh)return null;const a=nhlImp(ma.price),h=nhlImp(mh.price);const pH=h/(a+h);
      const mu=2.35*brainProbit(Math.max(0.05,Math.min(0.95,pH)));const T=+to.line;return{a:(T-mu)/2,h:(T+mu)/2};},
    box:(A,H,bias)=>{const t=(x)=>{const p=[0.31,0.33,0.36].map(f=>Math.round(x*f*10)/10);return{p:p.join('-'),g:Math.round(x*10)/10,sog:Math.round(x/0.098*bias('sog'))};};
      return{away:t(A),home:t(H)};},
    boxCols:[['P1-P2-P3','p'],['G','g'],['SOG≈','sog']],boxStats:['sog']};
}

/* ── Card ──────────────────────────────────────────────────────────────── */
function nhlTile(g,s,label,pick,line,modelP,simStr,mkt){
  if(!line){return`<div class="bet"><div class="bl">${label}</div><div class="sim-chip">sim ${simStr}</div>
    <div class="bo" style="color:var(--mute)">${modelP!=null?nhlSgn(nhlFair(modelP)):'—'}</div><div class="bs">sim only</div>
    <div class="bf" style="color:var(--mute)">no real line yet</div></div>`;}
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
  const outsideAgrees=on.length>0,outsideUnanimous=srcAll.size>=2&&srcOn.size===srcAll.size,outsideAgainst=!on.length&&same.length>0;
  const signals=[bookLeans,modelEdgeHere,outsideAgrees].filter(Boolean).length;
  const conflict=(modelAgainstHere&&(bookLeans||outsideAgrees))||(outsideAgainst&&(bookLeans||modelEdgeHere));
  const tier=conflict?' conflict':signals>=3||(signals>=2&&outsideUnanimous)?' supreme':signals>=2?' strong':signals>=1?' lean':'';
  const tag=tier===' supreme'?'<div class="tier-tag supreme">◆ SUPREME</div>':tier===' strong'?'<div class="tier-tag strong">STRONG</div>':tier===' conflict'?'<div class="tier-tag conflict">⚠ CONFLICT</div>':'';
  const srcTag=outsideAgrees?`<div class="src-tag${outsideUnanimous?' unanimous':''}">${outsideUnanimous?'★ unanimous':srcOn.size+' source'+(srcOn.size>1?'s':'')}</div>`:'';
  const srcCls=outsideAgrees?(outsideUnanimous?' consensus-pick':' source-pick'):'';
  const on2=SLIP.some(x=>x.id===g.id+'|'+pick);
  return`<div class="bet${cls}${srcCls}${tier} ${on2?'on':''}" role="button" tabindex="0" onclick="sportSlipToggle('nhl','${g.id}','${nhlQ(pick)}',${line.price})">
    <div class="bl">${label}</div><div class="sim-chip">sim ${simStr}</div><div class="bo">${nhlSgn(line.price)}</div>
    <div class="bs">${badge||Math.round(kp*100)+'%'}</div>
    <div class="bf">model ${(mp*100).toFixed(0)}% · fair ${nhlSgn(nhlFair(mp))} · <span style="color:${ev>=2?'var(--win)':ev<0?'var(--rust)':'var(--mute)'}">${ev>=0?'+':''}${ev.toFixed(1)}% EV</span>${line.src!=='mine'?` · <span style="color:var(--mute)">${line.src}</span>`:''}</div>${srcTag}${tag}</div>`;
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
      <div class="md">model called ${s.hw>=s.aw?H:A} (${(Math.max(s.hw,s.aw)*100).toFixed(0)}%) — ${((s.hw>=s.aw)===(g.homeScore>g.awayScore))?'✅ right':'❌ wrong'}${ov?` · total ${tot} vs ${ov.line} → ${tot>ov.line?'OVER':tot<ov.line?'UNDER':'PUSH'}`:''}</div></div>`;}
  else{const P=(get('d4.preds',{}).nhl||{})[today()]||{};const pr=P[game];
      head=`<div class="proj"><div class="sc">${A} ${s.awayProj.toFixed(1)} – ${s.homeProj.toFixed(1)} ${H}</div>
      <div class="rd">${Math.round(s.awayProj)}–${Math.round(s.homeProj)}</div><div class="md">most common ${s.modeScore?s.modeScore.replace('-','–'):'—'} · ${(s.modeScorePct*100).toFixed(1)}%</div>
      ${pr?`<div style="font-family:'IBM Plex Mono';font-size:10px;color:var(--gold);margin-top:3px">pred ${A} ${pr.a} – ${pr.h} ${H} <span style="color:var(--mute)">vs sim: margin ${((pr.h-pr.a)-(s.homeProj-s.awayProj)).toFixed(1)} · total ${((pr.a+pr.h)-(s.awayProj+s.homeProj)).toFixed(1)}</span></div>`:''}
      ${(()=>{try{return brainBlock(g,s,'nhl')}catch(e){return''}})()}</div>`;}
  // chips
  const fav=s.hw>=s.aw?H:A;
  const evs=[];[['awayML',A+' ML',s.aw],['homeML',H+' ML',s.hw],['over','Over',L.over?s.over(L.over.line):null],['under','Under',L.under?s.under(L.under.line):null],
    ['awayPL',A+' PL',L.awayPL?s.awayCover(L.awayPL.line):null],['homePL',H+' PL',L.homePL?s.homeCover(L.homePL.line):null]]
    .forEach(([k,lab,p])=>{const x=L[k];if(x&&p!=null)evs.push({lab:lab+(x.line!=null?' '+(k.endsWith('PL')?nhlSgn(x.line):x.line):''),ev:nhlEV(p,x.price)});});
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
    nhlTile(g,s,'P1 Under '+p1l,'P1 Under '+p1l,L.p1under,s.p1Under(p1l),s.p1Proj.toFixed(2),'p1total'));
  const btn=(k,t)=>`<button onclick="nhlPan('${g.id}','${k}',this)">${t}</button>`;
  return`<div class="tkt" id="nhl-card-${g.id}" style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
      <div><div style="font-size:16px;font-weight:800;color:var(--chalk)">${A} <span style="color:var(--mute);font-size:13px">@</span> ${H}</div>
      <div style="font-size:10px;color:var(--mute);font-family:'IBM Plex Mono'">${nhlEsc(g.time)}${g.venue?' · '+nhlEsc(g.venue):''}</div></div>
      <div style="text-align:right;font-family:'IBM Plex Mono';font-size:9px;color:var(--mute)">${A} ${nhlEsc(g.away.record)}<br>${H} ${nhlEsc(g.home.record)}</div></div>
    ${head}<div class="sig">${chips.join('')}${extra}</div>
    ${g.abstract==='pre'?(()=>{try{return coachHtml({game:g,sim:s,sport:'nhl'})}catch(e){return''}})():''}
    ${g.abstract!=='post'?pl+ml+to+p1:''}
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
  props:(g,s)=>{const L=nhlLineObj(g.away.abbr+'@'+g.home.abbr);const rows=[];
    const add=(player,stat,line,dir,price,tag)=>{const M=nhlPropModel(player,stat,line,dir,g,s);const pick=`${player} ${dir==='atleast'?line+'+':dir+' '+line} ${stat}`;
      const p=M?M.p:null,ev=price!=null&&p!=null?nhlEV(p,price):null;const on=SLIP.some(x=>x.id===g.id+'|'+pick);
      rows.push([`<span role="button" style="cursor:pointer;${on?'color:var(--gold)':''}" onclick="sportSlipToggle('nhl','${g.id}','${nhlQ(pick)}',${price!=null?price:(p?nhlFair(p):'null')},{nhlProp:{player:'${nhlQ(player)}',stat:'${stat}',thr:${line},dir:'${dir}'},isProp:1})">${on?'✓ ':'+ '}${nhlEsc(pick)}</span>`,
        M?M.mu.toFixed(2):'—',p!=null?(p*100).toFixed(0)+'%':'—',p!=null?nhlSgn(nhlFair(p)):'—',price!=null?nhlSgn(price):'<span style="color:var(--mute)">'+tag+'</span>',
        ev!=null?`<span style="color:${ev>=2?'var(--win)':ev<0?'var(--rust)':'var(--mute)'}">${ev>=0?'+':''}${ev.toFixed(1)}%</span>`:'—']);};
    L.props.forEach(x=>add(x.player,x.stat,x.line,x.side,x.price,''));
    if(NHL_PLAYERS){[g.away.abbr,g.home.abbr].forEach(ab=>{const ps=Object.values(NHL_PLAYERS).filter(p=>p.team===ab&&p.pos!=='G').sort((a,b)=>b.pts-a.pts).slice(0,6);
      ps.forEach(p=>{add(p.name,'points',1,'atleast',null,'model');add(p.name,'goals',1,'atleast',null,'model');add(p.name,'shots',2.5,'over',null,'model');});
      const gk=Object.values(NHL_PLAYERS).filter(p=>p.team===ab&&p.pos==='G').sort((a,b)=>(b.gp+b.gpPrev)-(a.gp+a.gpPrev))[0];
      if(gk){const M=nhlPropModel(gk.name,'saves',24.5,'over',g,s);if(M)add(gk.name,'saves',Math.max(0.5,Math.floor(M.mu)+0.5),'over',null,'model (likely starter — not confirmed)');}});}
    return`<div class="sub" style="margin-bottom:4px">${nhlEsc(NHL_STATUS.players)} · tap a row to add it to your slip — it grades off the live box score.</div>`+
      (rows.length?nhlTable(['prop','proj','model','fair','book','EV'],rows):'<div class="sub">No prop lines uploaded and no player stats loaded. Upload lines as <code>PROP: Name SOG 2.5 (-120/+100)</code>.</div>');},
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
    const cand=[];
    if(L.awayML&&L.homeML){cand.push({m:'ml',side:'away',price:L.awayML.price,p:s.aw},{m:'ml',side:'home',price:L.homeML.price,p:s.hw});}
    if(L.over&&L.under){cand.push({m:'total',side:'over',line:L.over.line,price:L.over.price,p:s.over(L.over.line)},{m:'total',side:'under',line:L.under.line,price:L.under.price,p:s.under(L.under.line)});}
    if(L.awayPL&&L.homePL){cand.push({m:'spread',side:'away',line:L.awayPL.line,price:L.awayPL.price,p:s.awayCover(L.awayPL.line)},{m:'spread',side:'home',line:L.homePL.line,price:L.homePL.price,p:s.homeCover(L.homePL.line)});}
    row.picks=['ml','total','spread'].map(m=>{const c=cand.filter(x=>x.m===m).map(x=>({...x,ev:nhlEV(x.p,x.price)})).sort((a,b)=>b.ev-a.ev)[0];return c&&c.ev>=2?c:null;}).filter(Boolean);
    changed=true;});
  if(changed){Object.keys(arc).sort().slice(0,-120).forEach(k=>delete arc[k]);set(NHL_LS.arc,arc);}
}
function nhlArchiveFinals(){
  const arc=get(NHL_LS.arc,{}),d=today(),day=arc[d];if(!day)return;let ch=false;
  NHL_GAMES.forEach(g=>{if(g.abstract!=='post'||g.awayScore==null)return;const r=day.rows.find(x=>x.gid===g.id);if(!r||r.final)return;
    r.final={a:+g.awayScore,h:+g.homeScore,p1a:g.p1a,p1h:g.p1h};r.awayScore=+g.awayScore;r.homeScore=+g.homeScore;ch=true;});
  if(ch)set(NHL_LS.arc,arc);
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
    const b=T[p.m];if(res===null)b.P++;else if(res){b.W++;b.u+=nhlProfit(p.price);}else{b.L++;b.u-=1;}})));
  const lab={ml:'Moneyline',total:'Total',spread:'Puck line'};
  let h=`<div class="tkt hi"><h3>System picks — model's best-EV side per market (≥2% EV, locked pregame)</h3>`+
    Object.entries(T).map(([k,b])=>`<div class="sub">${lab[k]}: <b>${b.W}-${b.L}${b.P?'-'+b.P:''}</b> · ${b.u>=0?'+':''}${b.u.toFixed(2)}u</div>`).join('')+
    (pend?`<div class="sub" style="color:var(--mute)">${pend} pick${pend>1?'s':''} waiting on finals</div>`:'')+`</div>`;
  try{h+=voicesReport('nhl')}catch(e){}
  try{h+=intelReport('nhl')}catch(e){}
  body.innerHTML=h;
}

/* ── Board ─────────────────────────────────────────────────────────────── */
function renderNHL(){
  const el=document.getElementById('slate');if(!el)return;
  ['nflPowerWarn','cfbPowerWarn'].forEach(id=>{const w=document.getElementById(id);if(w)w.style.display='none';});
  const nG=document.getElementById('nG');if(nG)nG.textContent=NHL_GAMES.length;
  const status=`<div class="sub" style="font-family:'IBM Plex Mono';font-size:10px;margin:0 3px 8px">🏒 ${nhlEsc(NHL_STATUS.sched)} · ${nhlEsc(NHL_STATUS.ratings)} · ${nhlEsc(NHL_STATUS.players)}</div>`;
  if(!NHL_GAMES.length){el.innerHTML=status+'<div class="empty">No NHL games today.</div>';return;}
  const y=window.scrollY,open={...NHL_OPEN};
  const order={in:0,pre:1,post:2};
  el.innerHTML=status+[...NHL_GAMES].sort((a,b)=>order[a.abstract]-order[b.abstract]||String(a.start).localeCompare(String(b.start))).map(g=>{try{return nhlCard(g)}catch(e){console.warn('nhl card',e);return`<div class="tkt"><div class="sub">${g.away.abbr} @ ${g.home.abbr}: card error — ${nhlEsc(e.message)}</div></div>`;}}).join('');
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
  await loadNHLRatings(season,force);NHL_SIMS={};renderNHL();
  if(force&&(typeof theOddsApiKey==='function'?theOddsApiKey():get(LS.key,''))){try{await fetchNHLLiveOdds()}catch(e){console.warn(e)}}
  loadNHLPlayers(season,force).then(()=>renderNHL()).catch(()=>{});
  try{if(typeof intakeReplay==='function')intakeReplay()}catch(e){}
  nhlLiveLoop();
}
