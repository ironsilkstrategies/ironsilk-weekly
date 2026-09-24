/* ═══════════════════════════════════════════════════════════════
   NFL ENGINE — BUILD v1.55
   Sport switcher, NFL sim, NFL game cards, NFL data layer
   All 32 teams, preseason through playoffs.
   ═══════════════════════════════════════════════════════════════ */

// ── NFL team data ────────────────────────────────────────────────────────────
const NFL_TEAMS={
  'ARI':{name:'Arizona Cardinals',conf:'NFC',div:'NFC West',color:'#97233F'},
  'ATL':{name:'Atlanta Falcons',conf:'NFC',div:'NFC South',color:'#A71930'},
  'BAL':{name:'Baltimore Ravens',conf:'AFC',div:'AFC North',color:'#241773'},
  'BUF':{name:'Buffalo Bills',conf:'AFC',div:'AFC East',color:'#00338D'},
  'CAR':{name:'Carolina Panthers',conf:'NFC',div:'NFC South',color:'#0085CA'},
  'CHI':{name:'Chicago Bears',conf:'NFC',div:'NFC North',color:'#0B162A'},
  'CIN':{name:'Cincinnati Bengals',conf:'AFC',div:'AFC North',color:'#FB4F14'},
  'CLE':{name:'Cleveland Browns',conf:'AFC',div:'AFC North',color:'#FF3C00'},
  'DAL':{name:'Dallas Cowboys',conf:'NFC',div:'NFC East',color:'#003594'},
  'DEN':{name:'Denver Broncos',conf:'AFC',div:'AFC West',color:'#FB4F14'},
  'DET':{name:'Detroit Lions',conf:'NFC',div:'NFC North',color:'#0076B6'},
  'GB':{name:'Green Bay Packers',conf:'NFC',div:'NFC North',color:'#203731'},
  'HOU':{name:'Houston Texans',conf:'AFC',div:'AFC South',color:'#03202F'},
  'IND':{name:'Indianapolis Colts',conf:'AFC',div:'AFC South',color:'#002C5F'},
  'JAX':{name:'Jacksonville Jaguars',conf:'AFC',div:'AFC South',color:'#006778'},
  'KC':{name:'Kansas City Chiefs',conf:'AFC',div:'AFC West',color:'#E31837'},
  'LAC':{name:'Los Angeles Chargers',conf:'AFC',div:'AFC West',color:'#0080C6'},
  'LAR':{name:'Los Angeles Rams',conf:'NFC',div:'NFC West',color:'#003594'},
  'LV':{name:'Las Vegas Raiders',conf:'AFC',div:'AFC West',color:'#000000'},
  'MIA':{name:'Miami Dolphins',conf:'AFC',div:'AFC East',color:'#008E97'},
  'MIN':{name:'Minnesota Vikings',conf:'NFC',div:'NFC North',color:'#4F2683'},
  'NE':{name:'New England Patriots',conf:'AFC',div:'AFC East',color:'#002244'},
  'NO':{name:'New Orleans Saints',conf:'NFC',div:'NFC South',color:'#D3BC8D'},
  'NYG':{name:'New York Giants',conf:'NFC',div:'NFC East',color:'#0B2265'},
  'NYJ':{name:'New York Jets',conf:'AFC',div:'AFC East',color:'#125740'},
  'PHI':{name:'Philadelphia Eagles',conf:'NFC',div:'NFC East',color:'#004C54'},
  'PIT':{name:'Pittsburgh Steelers',conf:'AFC',div:'AFC North',color:'#FFB612'},
  'SEA':{name:'Seattle Seahawks',conf:'NFC',div:'NFC West',color:'#002244'},
  'SF':{name:'San Francisco 49ers',conf:'NFC',div:'NFC West',color:'#AA0000'},
  'TB':{name:'Tampa Bay Buccaneers',conf:'NFC',div:'NFC South',color:'#D50A0A'},
  'TEN':{name:'Tennessee Titans',conf:'AFC',div:'AFC South',color:'#0C2340'},
  'WSH':{name:'Washington Commanders',conf:'NFC',div:'NFC East',color:'#5A1414'},
};

// ── Sport switcher ────────────────────────────────────────────────────────────
/* Legacy switcher. It predated CFB: it only iterated ['mlb','nfl'], so calling
   it with 'ncaaf' set ACTIVE_SPORT to ncaaf but then fell through to the MLB
   render() and displayed GAMES.length in the badge — a half-switched state.
   Kept as an alias so any stale call site routes to the one real switcher. */
function switchSport(sport){return doSportSwitch(sport)}

// ── NFL Simulation engine ────────────────────────────────────────────────────
// Uses normal distribution around team scoring means.
// NFL average: ~24 pts/team, std dev ~10. Adjusts for home field (+3 pts).
function randn(){
  // Box-Muller
  let u=0,v=0;
  while(u===0)u=Math.random();
  while(v===0)v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

// ── NFL fair-value odds ────────────────────────────────────────────────────────
/* ── EDGE MATH ────────────────────────────────────────────────────────────
   Edge was computed as (book price - fair price) — subtracting one American
   odds number from another. American odds are not a linear scale and they are
   discontinuous across ±100, so that difference is not a quantity. Concretely,
   a book at +100 against a fair of -100 is ZERO real disagreement, yet it
   printed as "+200 edge". That is where the -318 / +293 on your moneylines
   came from: the pair straddles the ±100 gap, so the subtraction inflates an
   ~22-point probability gap into a 300-plus number.

   The right measures are probability difference and expected value, both of
   which are linear and comparable across markets. */
function amerToProb(a){if(a==null||isNaN(a))return null;return a>0?100/(a+100):(-a)/((-a)+100)}
function amerProfit(a){return a>0?a/100:100/(-a)}          // profit per 1 unit staked
function evPct(p,a){                                        // expected return %, e.g. +4.2
  if(p==null||a==null||isNaN(a))return null;
  return (p*amerProfit(a)-(1-p))*100;
}
/* Pólya normal-tail approximation: P(Z > z).
   NOTE the constant is 2/PI. The commonly copied form uses 8/PI, which is for
   erf on a different argument scaling; using 8/PI here overstates confidence by
   up to 15 percentage points — it turns a true 15.9% into 2.0% — and would
   manufacture enormous fake edges on every spread and prop. Verified against
   the true normal tail before use. */
function normTail(z){
  if(!isFinite(z))return z>0?0:1;
  return 0.5*(1-Math.sign(z)*Math.sqrt(1-Math.exp(-z*z*(2/Math.PI))));
}
function nflFairML(p){
  if(p>=0.5)return Math.round(-(p/(1-p))*100);
  return Math.round(((1-p)/p)*100);
}

// ── NFL book lines (from uploaded txt) ───────────────────────────────────────
function getNFLBookLines(){return get(LS.nflshots,{})[today()]||[];}
function repairNFLKeys(){
  if(!(NFL_GAMES||[]).length)return 0;
  const all=get(LS.nflshots,{});let fixed=0;
  Object.keys(all).forEach(d=>{
    (all[d]||[]).forEach(r=>{
      const [xa,xh]=(r.game||'').split('@');
      const ra=nflAbbrFor(xa),rh=nflAbbrFor(xh);
      if(ra&&rh){
        const k=ra+'@'+rh;
        if(k!==r.game){r.game=k;r.away=ra;r.home=rh;fixed++;}
      }
    });
  });
  if(fixed)set(LS.nflshots,all);
  return fixed;
}
function nflBookLinesFor(gameKey){
  const all=getNFLBookLines();
  // exact match first
  const exact=all.filter(x=>x.game===gameKey);
  if(exact.length)return exact;
  // fuzzy: normalize both sides and try again
  const ABBR={'LV':'LV','OAK':'LV','LVR':'LV','WSH':'WSH','WAS':'WSH','LAR':'LAR','LAC':'LAC','SF':'SF',
    'GB':'GB','KC':'KC','TB':'TB','NE':'NE','NO':'NO','NYG':'NYG','NYJ':'NYJ','JAX':'JAX'};
  const norm=a=>ABBR[a]||a;
  const [awayKey,homeKey]=(gameKey||'').split('@');
  const normKey=norm(awayKey)+'@'+norm(homeKey);
  return all.filter(x=>{
    const [xa,xh]=(x.game||'').split('@');
    return norm(xa)+'@'+norm(xh)===normKey;
  });
}
function nflBookLine(gameKey,market,side){
  return nflBookLinesFor(gameKey).find(x=>x.market===market&&x.side===side)||null;
}

// ── NFL ext picks/trends/consensus ───────────────────────────────────────────
function getNFLExt(){return get(LS.nflext,{})[today()]||[];}
function getNFLTrends(){return get(LS.nfltrends,{})[today()]||[];}
function getNFLConsensus(){return get(LS.nflconsensus,{})[today()]||[];}
function nflTrendsFor(gameKey){return getNFLTrends().filter(x=>x.game===gameKey);}
function nflConsensusFor(gameKey){return getNFLConsensus().filter(x=>x.game===gameKey);}
function nflExtFor(gameKey){return getNFLExt().filter(x=>x.game===gameKey);}

// ── NFL game card ─────────────────────────────────────────────────────────────

function nflSlipToggle(gid,label,price){
  const g=NFL_GAMES.find(x=>x.id===gid);if(!g)return;
  const leg={gid,pick:label,game:g.away.abbr+'@'+g.home.abbr,price,sport:'nfl',
    date:today(),p:Math.abs(price)>=100?Math.min(.95,Math.max(.05,100/(100+Math.abs(price)))):0.5};
  SLIP.push(leg);
  set(LS.slip,SLIP);
  renderSlip();
}

// ── NFL book odds upload (same pipeline as MLB) ───────────────────────────────
function saveNFLBookOdds(picks,el){
  const d=today();
  const all=get(LS.nflshots,{});
  all[d]=all[d]||[];
  const NFL_NORM={'WSH':'WSH','WAS':'WSH','LAR':'LAR','LA':'LAR','LV':'LV','OAK':'LV','GB':'GB','KC':'KC','SF':'SF','TB':'TB','NE':'NE','NO':'NO','NYG':'NYG','NYJ':'NYJ'};
  const norm=a=>(NFL_NORM[a.toUpperCase()]||a.toUpperCase());
  const keyOf=x=>[x.game,x.market,x.side,x.line].join('|');
  picks.forEach(x=>{
    const homeAb=norm(x.home),awayAb=norm(x.away);
    const game=awayAb+'@'+homeAb;
    const gm=NFL_GAMES.find(g=>g.away.abbr===awayAb&&g.home.abbr===homeAb);
    const rec={away:awayAb,home:homeAb,game,market:x.market,side:x.side,
      line:x.line!=null?x.line:null,price:x.price,player:x.player||null,
      stat:x.stat||null,gid:gm?gm.id:null,capturedAt:Date.now(),
      src:x.src||null,book:x.book||null,underPrice:x.underPrice!=null?x.underPrice:null};
    const k=keyOf(rec),i=all[d].findIndex(y=>keyOf(y)===k);
    if(i>=0)all[d][i]=rec;else all[d].push(rec);
  });
  set(LS.nflshots,all);
  try{repairNFLKeys()}catch(e){}
  const nflGames=new Set(picks.map(p=>p.game));
  const nflMkt={};picks.forEach(p=>{nflMkt[p.market]=(nflMkt[p.market]||0)+1});
  const nflSummary=Object.entries(nflMkt).map(([m,n])=>n+' '+m).join(' · ');
  if(el)el.innerHTML=`<div class="tkt hi"><h3>NFL lines locked in ✓</h3>
    <div class="sub">${picks.length} picks · ${nflGames.size} game${nflGames.size===1?'':'s'} · ${nflSummary}</div>
    <div class="sub" style="color:var(--mute);margin-top:4px">Stored as ${d}. Game card tiles will now show REAL instead of sim only.</div></div>`;
}

// ── NFL render ─────────────────────────────────────────────────────────────────
function renderNFL(){
  /* One corrupt or partially-written cached game used to throw inside the sim
     and blank the entire board with no visible error. Drop malformed entries
     instead of letting them take the slate down. */
  NFL_GAMES=(NFL_GAMES||[]).filter(g=>g&&g.away&&g.home&&g.away.name&&g.home.name);
  try{repairNFLKeys()}catch(e){}
  const _cfbB=document.getElementById('cfbPowerWarn');if(_cfbB)_cfbB.style.display='none';
  /* Say plainly when the projections have no season data behind them, rather
     than printing an identical confident-looking number on all 16 games. */
  const _nflWarn=document.getElementById('nflPowerWarn');
  if(_nflWarn){
    _nflWarn.style.display=NFL_POWER_FLAT?'block':'none';
    if(NFL_POWER_FLAT)_nflWarn.innerHTML='&#9888; No completed-season scoring data for these teams yet '+
      '(preseason). Every projection below is the league-average baseline plus home field &mdash; '+
      'they are placeholders, not model output. Your uploaded book lines are still real.';
  }

  const el=document.getElementById('slate');
  if(!el)return;

  if(!NFL_GAMES.length){
    el.innerHTML=`<div class="tkt">
      <h3>🏈 NFL Board</h3>
      <div class="sub">No NFL games loaded. Hit the button to pull the current week's schedule from ESPN — free, no key needed.</div>
      <div class="bar" style="margin-top:8px">
        <button class="primary" onclick="loadNFLSchedule()">Load current week</button>
      </div>
      <div id="nflLoadStatus"></div>
    </div>`;
    return;
  }

  // run sims
  NFL_GAMES.forEach(g=>{if(!NFL_SIMS[g.id])NFL_SIMS[g.id]=simNFLGame(g);});

  const week=NFL_WEEK||'?';
  const season=NFL_SEASON||new Date().getFullYear();
  const isPreseason=NFL_GAMES[0]&&NFL_GAMES[0].seasonType===1;
  const weekLabel=isPreseason?`Preseason Week ${week}`:`Week ${week}`;

  const weekNav=`<div style="display:flex;align-items:center;justify-content:space-between;
    padding:10px 12px;background:var(--panel2);border-radius:8px;margin-bottom:10px">
    <button onclick="loadNFLWeek(${season},${Number(week)-1})" style="background:none;border:1px solid var(--rule);
      color:var(--chalk);border-radius:6px;padding:4px 12px;cursor:pointer;font-size:13px">← Prev</button>
    <div style="text-align:center">
      <div style="font-family:'IBM Plex Mono';font-size:11px;color:var(--gold);letter-spacing:.08em;text-transform:uppercase">
        🏈 ${season} NFL</div>
      <div style="font-weight:700;font-size:16px;color:var(--chalk)">${weekLabel}</div>
      <div style="font-size:11px;color:var(--chalk-dim)">${NFL_GAMES.length} games</div>
    </div>
    <button onclick="loadNFLWeek(${season},${Number(week)+1})" style="background:none;border:1px solid var(--rule);
      color:var(--chalk);border-radius:6px;padding:4px 12px;cursor:pointer;font-size:13px">Next →</button>
  </div>`;

  /* Same fix as CFB: exact status TEXT isn't reliable across every game
     (overtime games and different descriptions for the same state both
     exist). g.abstract is ESPN's own normalized 'pre'/'in'/'post' state. */
  const isFinalGame=g=>g.abstract==='post'||(!g.abstract&&(g.status==='Final'||g.status==='Final/OT'));
  const scheduled=NFL_GAMES.filter(g=>!isFinalGame(g));
  // Snapshot + grade BEFORE filtering display — every final game's result
  // gets attributed to the record/calibration store regardless of whether
  // its card is still shown. Grading never depends on what's on screen.
  try{snapshotNFL();gradeNFLResults();}catch(e){console.warn('NFL snapshot/grade:',e);}
  // Cards for finals stay visible for 24h after kickoff, then drop off the
  // board entirely so a full season of NFL finals never piles up and drags
  // down render time. The game is still fully graded above — this only
  // affects what's shown, never what's recorded.
  const HIDE_AFTER_MS=24*60*60*1000;
  const now=Date.now();
  const final=NFL_GAMES.filter(g=>{
    if(!isFinalGame(g))return false;
    const kickoff=g.date?new Date(g.date).getTime():0;
    return kickoff&&(now-kickoff)<HIDE_AFTER_MS;
  });

  /* Same fix as the MLB board: renderNFL() is also called from background
     loops (the live-score poller) that have no idea what's currently on
     screen. Badge count updates regardless; the actual repaint only happens
     when NFL is genuinely the visible sport, so it can never silently
     overwrite whatever board the user is actually looking at. */
  document.getElementById('nG').textContent=NFL_GAMES.length;
  if(ACTIVE_SPORT!=='nfl')return;
  let h=weekNav;
  h+=`<div class="bar" style="margin:-4px 0 10px"><button onclick="refreshNFLLiveScores()">↻ Refresh scores</button></div>`;
  if(scheduled.length)h+=sbar('Upcoming / Live',scheduled.length)+scheduled.map(nflCard).join('');
  if(final.length)h+=sbar('Final',final.length)+final.map(nflCard).join('');
  try{h=nflRankingsBlock()+h;}catch(err){}
  el.innerHTML=h;
}

/* ── NFL LIVE SCORE REFRESH ────────────────────────────────────────────────
   Same fix as the CFB poller, same two root causes: (1) the refresh trigger
   only ever lived inside the fresh-network-load path, never the far more
   common cache-restore reopen, and (2) it only re-armed while something was
   ACTIVELY live, so a whole slate sitting at "Scheduled" all morning never
   got checked until someone happened to be watching the exact moment a game
   went live. NFL never had ANY version of this poller at all. */
let NFL_LIVE_POLL=null;
async function refreshNFLLiveScores(){
  if(!(NFL_GAMES||[]).length)return 0;
  try{
    const url=(NFL_SEASON&&NFL_WEEK)
      ?`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${NFL_SEASON}&seasontype=2&week=${NFL_WEEK}`
      :'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
    const r=await fetch(url);const j=await r.json();
    const byId={};(j.events||[]).forEach(e=>{byId[e.id]=e;});
    let changed=0;
    NFL_GAMES.forEach(g=>{
      const e=byId[g.espnId||g.id];if(!e)return;
      const comp=e.competitions&&e.competitions[0];if(!comp)return;
      const away=comp.competitors.find(c=>c.homeAway==='away');
      const home=comp.competitors.find(c=>c.homeAway==='home');
      const newAbstract=(comp.status&&comp.status.type&&comp.status.type.state)||'pre';
      const newStatus=(comp.status&&comp.status.type&&comp.status.type.description)||g.status;
      if(newAbstract!==g.abstract||newStatus!==g.status)changed++;
      g.abstract=newAbstract;g.status=newStatus;
      g.clock=(comp.status&&comp.status.displayClock)||g.clock;
      g.period=(comp.status&&comp.status.period)||g.period;
      if(away){const sc=away.score;g.awayScore=sc!=null&&sc!==''?+sc:g.awayScore;}
      if(home){const sc=home.score;g.homeScore=sc!=null&&sc!==''?+sc:g.homeScore;}
    });
    const anyNotFinal=NFL_GAMES.some(g=>g.abstract!=='post');
    if(anyNotFinal&&!NFL_LIVE_POLL)NFL_LIVE_POLL=setInterval(refreshNFLLiveScores,90000);
    if(!anyNotFinal&&NFL_LIVE_POLL){clearInterval(NFL_LIVE_POLL);NFL_LIVE_POLL=null;}
    /* Propagate any finals into the shared cross-sport store so the unified
       tabs (Eval, Record, Money, System scorecard) and locked-ticket grading
       can see them from ANY page, not just this one. */
    if(typeof syncFinalsToShared==='function'){try{syncFinalsToShared()}catch(e){}}
    if(changed&&ACTIVE_SPORT==='nfl'&&typeof renderNFL==='function')renderNFL();
    return changed;
  }catch(e){console.warn('NFL live refresh failed',e);return 0;}
}
async function loadNFLSchedule(){
  const el=document.getElementById('slate');
  if(el)el.innerHTML='<div class="empty">Loading current NFL week…</div>';
  try{
    const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100';
    const r=await fetch(url);
    const j=await r.json();
    NFL_WEEK=j.week&&j.week.number||1;
    NFL_SEASON=j.season&&j.season.year||new Date().getFullYear();
    _parseNFLEvents(j);
  }catch(e){
    if(el)el.innerHTML=`<div class="empty">Failed to load: ${e.message}</div>`;
  }
}

async function loadNFLWeek(season,week){
  if(week<1)week=1;
  const el=document.getElementById('slate');
  if(el)el.innerHTML='<div class="empty">Loading week '+week+'…</div>';
  try{
    // Try regular season first, then preseason
    const seasonType=week<=4&&season<=new Date().getFullYear()?'1':'2';
    const url=`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=${seasonType}&week=${week}`;
    const r=await fetch(url);
    const j=await r.json();
    NFL_WEEK=j.week&&j.week.number||week;
    NFL_SEASON=j.season&&j.season.year||season;
    if(!(j.events||[]).length){
      // flip season type
      const alt=seasonType==='1'?'2':'1';
      const r2=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=${alt}&week=${week}`);
      const j2=await r2.json();
      if((j2.events||[]).length){_parseNFLEvents(j2);return;}
    }
    _parseNFLEvents(j);
  }catch(e){
    if(el)el.innerHTML=`<div class="empty">Failed: ${e.message}</div>`;
  }
}


/* ── FREE ESPN LINES ─────────────────────────────────────────────────────────
   The scoreboard the app already downloads carries a bookmaker's spread,
   total and moneylines. They were being thrown away. Now they fill ONLY the
   markets you don't already have — an uploaded or pulled line always wins —
   so the board has real numbers without spending an odds-API pull. Reads both
   ESPN odds formats (flat and the newer open/close objects). */
function fbEspnOddsRows(ev){
  const c=(ev.competitions||[])[0];if(!c)return[];const o=(c.odds||[])[0];if(!o)return[];
  const cs=c.competitors||[];const H=cs.find(x=>x.homeAway==='home'),A=cs.find(x=>x.homeAway==='away');if(!H||!A)return[];
  const ha=((H.team||{}).abbreviation||'').toUpperCase(),aa=((A.team||{}).abbreviation||'').toUpperCase();
  const num=x=>{if(x==null)return null;const v=parseFloat(String(x).replace(/^[ou]/i,'').replace(/^EVEN$/i,'100'));return isNaN(v)?null:v;};
  const pick=(...xs)=>{for(const x of xs){const v=num(x);if(v!=null)return v;}return null;};
  const cl=(p)=>p?(p.close||p.current||p.open||p):null;
  let hLine=null;
  const ps=o.pointSpread||{};
  hLine=pick(cl(ps.home)&&cl(ps.home).line);
  if(hLine==null&&o.details){const m=String(o.details).match(/^([A-Z]{2,4})\s+([+\-]?\d+(?:\.\d)?)/);if(m){const v=+m[2];hLine=m[1].toUpperCase()===ha?v:-v;}}
  if(hLine==null&&o.spread!=null){const v=num(o.spread);if(v!=null)hLine=(o.homeTeamOdds&&o.homeTeamOdds.favorite)?-Math.abs(v):(o.awayTeamOdds&&o.awayTeamOdds.favorite)?Math.abs(v):v;}
  const hsp=pick(cl(ps.home)&&cl(ps.home).odds,o.homeTeamOdds&&o.homeTeamOdds.spreadOdds,-110);
  const asp=pick(cl(ps.away)&&cl(ps.away).odds,o.awayTeamOdds&&o.awayTeamOdds.spreadOdds,-110);
  const tot=o.total||{};const T=pick(cl(tot.over)&&cl(tot.over).line,o.overUnder);
  const op=pick(cl(tot.over)&&cl(tot.over).odds,o.overOdds,-110),up=pick(cl(tot.under)&&cl(tot.under).odds,o.underOdds,-110);
  const ml=o.moneyline||{};
  const hml=pick(cl(ml.home)&&cl(ml.home).odds,o.homeTeamOdds&&o.homeTeamOdds.moneyLine);
  const aml=pick(cl(ml.away)&&cl(ml.away).odds,o.awayTeamOdds&&o.awayTeamOdds.moneyLine);
  const g=aa+'@'+ha,R=[],base={away:aa,home:ha,game:g,src:'espn',book:((o.provider||{}).name)||'ESPN'};
  if(hLine!=null){R.push({...base,market:'spread',side:'home',line:hLine,price:hsp});R.push({...base,market:'spread',side:'away',line:-hLine,price:asp});}
  if(T!=null){R.push({...base,market:'total',side:'over',line:T,price:op});R.push({...base,market:'total',side:'under',line:T,price:up});}
  if(hml!=null&&aml!=null){R.push({...base,market:'moneyline',side:'home',line:null,price:hml});R.push({...base,market:'moneyline',side:'away',line:null,price:aml});}
  return R;
}
function fbIngestEspnOdds(sport,j){
  const nfl=sport==='nfl';const linesFor=nfl?nflBookLinesFor:ncaafBookLinesFor;const save=nfl?saveNFLBookOdds:saveNCAAFBookOdds;
  const rows=[];
  (j&&j.events||[]).forEach(ev=>{
    const st=((((ev.competitions||[])[0]||{}).status||ev.status||{}).type||{}).state;if(st&&st!=='pre')return; // pregame lines only
    const R=fbEspnOddsRows(ev);if(!R.length)return;
    let have=[];try{have=linesFor(R[0].game)||[];}catch(e){}
    R.forEach(r=>{if(!have.some(h=>h.market===r.market&&h.side===r.side&&h.src!=='espn'))rows.push(r);});
  });
  if(rows.length){
    /* ESPN lines move; replace the previous ESPN copy instead of stacking. */
    const key=nfl?LS.nflshots:'d4.ncaafshots',all=get(key,{});
    const drop=new Set(rows.map(r=>r.game+'|'+r.market+'|'+r.side));
    Object.keys(all).forEach(d=>{if(Array.isArray(all[d]))all[d]=all[d].filter(x=>!(x.src==='espn'&&drop.has(x.game+'|'+x.market+'|'+x.side)));});
    set(key,all);
    try{save(rows,null);}catch(e){console.warn('espn odds save',e)}}
  return rows.length;
}

function _parseNFLEvents(j){
  try{fbIngestEspnOdds('nfl',j)}catch(err){console.warn('espn odds',err)}
  const events=j.events||[];
  NFL_GAMES=events.map(function(e,i){
    const comp=e.competitions[0];
    const away=comp.competitors.find(function(c){return c.homeAway==='away';});
    const home=comp.competitors.find(function(c){return c.homeAway==='home';});
    if(!away||!home)return null;
    const awayAbbr=(away.team.abbreviation||'???').toUpperCase();
    const homeAbbr=(home.team.abbreviation||'???').toUpperCase();
    let day='TBD',timeStr='TBD';
    if(e.date){
      const d=new Date(e.date);
      day=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'America/Chicago'});
      timeStr=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
    }
    return{
      id:e.id||String(i),espnId:e.id||'',
      week:j.week&&j.week.number||NFL_WEEK||'',
      seasonType:j.season&&j.season.type||2,
      day:day,time:timeStr,date:e.date||'',
      status:(comp.status&&comp.status.type&&comp.status.type.description)||'Scheduled',
      abstract:(comp.status&&comp.status.type&&comp.status.type.state)||'pre',
      clock:comp.status&&comp.status.displayClock||'',
      period:comp.status&&comp.status.period||0,
      awayScore:(()=>{const sc=(comp.competitors.find(c=>c.homeAway==='away')||{}).score;return sc!=null&&sc!==''?+sc:null})(),
      homeScore:(()=>{const sc=(comp.competitors.find(c=>c.homeAway==='home')||{}).score;return sc!=null&&sc!==''?+sc:null})(),
      away:{abbr:awayAbbr,name:away.team.displayName||awayAbbr,offRating:24,defRating:24,record:away.records&&away.records[0]&&away.records[0].summary||''},
      home:{abbr:homeAbbr,name:home.team.displayName||homeAbbr,offRating:24,defRating:24,record:home.records&&home.records[0]&&home.records[0].summary||''},
    };
  }).filter(Boolean);
  const cacheKey=(NFL_SEASON||'')+'w'+(NFL_WEEK||'');
  const cache=get(LS.nflgames,{});
  cache[cacheKey]={ts:Date.now(),v:NFL_GAMES,week:NFL_WEEK,season:NFL_SEASON};
  set(LS.nflgames,cache);
  NFL_SIMS={};
  renderNFL();
  const nG=document.getElementById('nG');
  if(nG)nG.textContent=NFL_GAMES.length;
}


// ── parseSlateText NFL extension ──────────────────────────────────────────────
// Extends the existing MLB parser to handle NFL-specific formats.
// NFL picks file uses same format as MLB but with spread and 1H markets:
// SPREAD: KC -3 (-110) / LV +3 (-110)
// H1SPREAD: KC -1.5 (-115) / LV +1.5 (+105)
// H1OU: o22.5 (-110) / u22.5 (-110)
// PROP: P.Mahomes passing yards 275.5+ (-115)  [player: stat: line+]
/* The NFL parser only ever accepted 2-4 letter abbreviations. Real sportsbook
   exports and screenshot transcriptions write "Washington Commanders @
   Baltimore Ravens", which failed the game-line regex outright — curAway
   stayed null, every following bet line was skipped, and the file produced
   ZERO picks. The upload reported success and the board kept showing dashes.

   This resolves any of: abbreviation, full name, city, or nickname, built from
   the NFL_TEAMS table already in the app so it cannot drift out of sync. */
let _NFL_NAME_INDEX=null;
function nflNameIndex(){
  if(_NFL_NAME_INDEX)return _NFL_NAME_INDEX;
  const idx=Object.create(null);
  const put=(k,ab)=>{k=String(k||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(k&&!(k in idx))idx[k]=ab};
  Object.keys(NFL_TEAMS).forEach(ab=>{
    const full=NFL_TEAMS[ab].name;           // "Washington Commanders"
    put(ab,ab); put(full,ab);
    const parts=full.split(' ');
    put(parts[parts.length-1],ab);           // nickname: "Commanders"
    put(parts.slice(0,-1).join(''),ab);      // city: "Washington", "New England"
  });
  // aliases books and feeds actually use
  Object.entries({WAS:'WSH',LA:'LAR',STL:'LAR',SD:'LAC',OAK:'LV',LVR:'LV',JAC:'JAX',
    TAM:'TB',NOR:'NO',NWE:'NE',SFO:'SF',GNB:'GB',KAN:'KC',ARZ:'ARI',CLV:'CLE',
    BLT:'BAL',HST:'HOU',WASHINGTONFOOTBALLTEAM:'WSH',REDSKINS:'WSH',OAKLANDRAIDERS:'LV',
    SANDIEGOCHARGERS:'LAC',STLOUISRAMS:'LAR'}).forEach(([k,v])=>put(k,v));
  _NFL_NAME_INDEX=idx;return idx;
}
function nflAbbrFor(s){
  if(!s)return null;
  const k=String(s).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const idx=nflNameIndex();
  if(idx[k])return idx[k];
  // last resort: longest indexed name contained in the string (handles
  // "at Baltimore Ravens (-3)" style noise around the team name)
  let best=null,bestLen=0;
  for(const name in idx){if(name.length>3&&name.length>bestLen&&k.includes(name)){best=idx[name];bestLen=name.length}}
  return best;
}
function parseNFLSlateText(text,opts){
  /* CFB reuses this grammar but must resolve team names against its own
     schedule — running college names through the NFL abbreviation table
     returns null for every team, which silently produced zero picks. */
  const _resolve=(opts&&opts.resolve)||nflAbbrFor;
  const picks=[],trends=[],consensus=[],props=[];
  const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);
  const NFL_NORM={'WAS':'WSH','LAR':'LAR','LA':'LAR','LV':'LV','OAK':'LV'};
  function norm(a){return NFL_NORM[a.toUpperCase()]||a.toUpperCase();}
  const isNFL=lines.some(l=>/^NFL/i.test(l));
  if(!isNFL)return{picks,trends,consensus,props,isNFL:false};

  const isConsensus=lines.some(l=>/\d+%\s*\//.test(l)||/TOTALS/i.test(l));
  const isTrends=lines.some(l=>/trends/i.test(l))||lines.some(l=>/:\s+(Over|Under)\s+is\s+\d/i.test(l));
  const isPicks=lines.some(l=>/^ML:|^OU:|^RL:|^SPREAD:|^H1SPREAD:|^H1ML:|^H1OU:|^Q1SPREAD:|^Q1ML:|^Q1OU:|^PROP:/i.test(l));
  // NFL resolves by abbreviation table; CFB resolves against the loaded schedule
  const resolveTeam=x=>_resolve(x);

  /* SOURCE: lines were skipped outright, so no pick carried an attribution.
     Without it there is no way to count how many independent outlets landed on
     a side, which is what the alignment tiers are built on. Declared at function
     scope because the return that stamps it sits outside the picks branch. */
  let curSrc='upload';

  if(isPicks){
    let curAway=null,curHome=null;
    for(const l of lines){
      const srcM=l.match(/^SOURCE:\s*(.+?)\s*$/i);
      if(srcM){curSrc=srcM[1].trim()||'upload';continue;}
      if(/^NFL|^Proj:/i.test(l))continue;
      // accept "WSH @ BAL" and "Washington Commanders @ Baltimore Ravens" alike
      const gameM=l.match(/^(.+?)\s*@\s*(.+?)(?:\s*\|.*)?$/);
      if(gameM){
        const a=_resolve(gameM[1]),h=_resolve(gameM[2]);
        if(a&&h){curAway=a;curHome=h;continue;}
      }
      if(!curAway)continue;
      const game=curAway+'@'+curHome;
      // ML: KC -200 / LV +170
      const mlM=l.match(/^ML:\s*(.+?)\s*([+\-]\d+)\s*\/\s*(.+?)\s*([+\-]\d+)\s*$/i);
      if(mlM){
        const s1=_resolve(mlM[1]),s2=_resolve(mlM[3]);
        picks.push({away:curAway,home:curHome,game,market:'moneyline',side:s1===curAway?'away':'home',price:+mlM[2]});
        picks.push({away:curAway,home:curHome,game,market:'moneyline',side:s2===curHome?'home':'away',price:+mlM[4]});
        continue;
      }
      // SPREAD: KC -3 (-110) / LV +3 (-110)
      const spM=l.match(/^SPREAD:\s*(.+?)\s*([+\-][\d.]+)\s*\(([+\-]\d+)\)\s*\/\s*(.+?)\s*([+\-][\d.]+)\s*\(([+\-]\d+)\)/i);
      if(spM){
        const s1=_resolve(spM[1]),s2=_resolve(spM[4]);
        picks.push({away:curAway,home:curHome,game,market:'spread',side:s1===curAway?'away':'home',line:+spM[2],price:+spM[3]});
        picks.push({away:curAway,home:curHome,game,market:'spread',side:s2===curHome?'home':'away',line:+spM[5],price:+spM[6]});
        continue;
      }
      // OU: o47.5 (-110) / u47.5 (-110)
      const ouM=l.match(/^OU:\s*o([\d.]+)\s*\(([+\-]\d+)\)\s*\/\s*u([\d.]+)\s*\(([+\-]\d+)\)/i);
      if(ouM){
        picks.push({away:curAway,home:curHome,game,market:'total',side:'over',line:+ouM[1],price:+ouM[2]});
        picks.push({away:curAway,home:curHome,game,market:'total',side:'under',line:+ouM[3],price:+ouM[4]});
        continue;
      }
      /* Period markets accepted full names only after this widening — the
         book writes "North Carolina", not "UNC". Also added first-half
         moneyline and the entire first-quarter set, which sportsbetting.ag
         posts for every game and the parser previously ignored outright. */
      const perM=l.match(/^(H1|Q1)(SPREAD|ML|OU):\s*(.+)$/i);
      if(perM){
        const per=perM[1].toUpperCase()==='H1'?'h1':'q1';
        const kind=perM[2].toUpperCase(), rest=perM[3];
        if(kind==='OU'){
          const m=rest.match(/o([\d.]+)\s*\(([+\-]\d+)\)\s*\/\s*u([\d.]+)\s*\(([+\-]\d+)\)/i);
          if(m){
            picks.push({away:curAway,home:curHome,game,market:per+'total',side:'over',line:+m[1],price:+m[2]});
            picks.push({away:curAway,home:curHome,game,market:per+'total',side:'under',line:+m[3],price:+m[4]});
            continue;
          }
        }else if(kind==='ML'){
          const m=rest.match(/^(.+?)\s*([+\-]\d+)\s*\/\s*(.+?)\s*([+\-]\d+)\s*$/);
          if(m){
            const s1=resolveTeam(m[1]);
            picks.push({away:curAway,home:curHome,game,market:per+'ml',side:s1===curAway?'away':'home',price:+m[2]});
            picks.push({away:curAway,home:curHome,game,market:per+'ml',side:s1===curAway?'home':'away',price:+m[4]});
            continue;
          }
        }else{
          const m=rest.match(/^(.+?)\s*([+\-][\d.]+)\s*\(([+\-]\d+)\)\s*\/\s*(.+?)\s*([+\-][\d.]+)\s*\(([+\-]\d+)\)/);
          if(m){
            const s1=resolveTeam(m[1]);
            picks.push({away:curAway,home:curHome,game,market:per+'spread',side:s1===curAway?'away':'home',line:+m[2],price:+m[3]});
            picks.push({away:curAway,home:curHome,game,market:per+'spread',side:s1===curAway?'home':'away',line:+m[5],price:+m[6]});
            continue;
          }
        }
      }
      // H1SPREAD: KC -1.5 (-115) / LV +1.5 (+105)
      const h1spM=l.match(/^H1SPREAD:\s*([A-Z]{2,4})\s*([+\-][\d.]+)\s*\(([+\-]\d+)\)\s*\/\s*([A-Z]{2,4})\s*([+\-][\d.]+)\s*\(([+\-]\d+)\)/i);
      if(h1spM){
        picks.push({away:curAway,home:curHome,game,market:'h1spread',side:norm(h1spM[1])===curAway?'away':'home',line:+h1spM[2],price:+h1spM[3]});
        picks.push({away:curAway,home:curHome,game,market:'h1spread',side:norm(h1spM[4])===curHome?'home':'away',line:+h1spM[5],price:+h1spM[6]});
        continue;
      }
      // H1OU: o22.5 (-110) / u22.5 (-110)
      const h1ouM=l.match(/^H1OU:\s*o([\d.]+)\s*\(([+\-]\d+)\)\s*\/\s*u([\d.]+)\s*\(([+\-]\d+)\)/i);
      if(h1ouM){
        picks.push({away:curAway,home:curHome,game,market:'h1total',side:'over',line:+h1ouM[1],price:+h1ouM[2]});
        picks.push({away:curAway,home:curHome,game,market:'h1total',side:'under',line:+h1ouM[3],price:+h1ouM[4]});
        continue;
      }
      // PROP: P.Mahomes passing yards 275.5+ (-115)
      /* Accepts "passing yards 245.5+ (-115)" and the natural book style
         "Pass Yds 245.5 (-115/-105)"; both normalize to the canonical stat. */
      const propM=l.match(/^PROP:\s*(.+?)\s+(rushing yards|receiving yards|passing yards|rush(?:ing)? yds|rec(?:eiving)? yds|pass(?:ing)? yds|receptions|recs?|touchdowns|tds?|carries|completions|sacks|tackles|interceptions|ints?)\s+([\d.]+)\+?\s*\(\s*([+\-]\d+)(?:\s*\/\s*([+\-]\d+))?\s*\)/i);
      if(propM){
        const canon=s=>{s=s.toLowerCase();return /^pass/.test(s)?'passing yards':/^rush/.test(s)?'rushing yards':/^rec(eiving)? ?yds|^receiving yards/.test(s)?'receiving yards':
          /^recs?$|^receptions$/.test(s)?'receptions':/^tds?$|^touchdowns$/.test(s)?'touchdowns':/^ints?$|^interceptions$/.test(s)?'interceptions':s;};
        picks.push({away:curAway,home:curHome,game,market:'prop',player:propM[1].trim(),stat:canon(propM[2]),line:+propM[3],price:+propM[4],
          underPrice:propM[5]!=null?+propM[5]:null,side:'over'});
        continue;
      }
    }
  }

  if(isConsensus){
    let inTotals=false;
    for(const l of lines){
      if(/^TOTALS$/i.test(l)){inTotals=true;continue;}
      if(!inTotals){
        const m=l.match(/^([A-Z]{2,4})\s+(\d+)%\s*\/\s*([A-Z]{2,4})\s+(\d+)%/i);
        if(m)consensus.push({away:norm(m[1]),home:norm(m[3]),market:'moneyline',
          awayPct:+m[2],homePct:+m[4],src:'Covers'});
      }else{
        const m=l.match(/^([A-Z\/]+):\s*(\d+)%\s*(Over|Under).*Line\s*([\d.]+)/i);
        if(m){const teams=m[1].split('/');
          consensus.push({away:norm(teams[0]),home:norm(teams[1]||''),market:'total',
            overPct:/over/i.test(m[3])?+m[2]:100-+m[2],
            underPct:/under/i.test(m[3])?+m[2]:100-+m[2],line:+m[4],src:'Covers'});}
      }
    }
  }

  if(isTrends){
    let curAway=null,curHome=null,curTeam=null;
    for(const l of lines){
      if(/^NFL TRENDS|^Source:/i.test(l))continue;
      const gameM=l.match(/^([A-Z]{2,4})\s*@\s*([A-Z]{2,4})/i);
      if(gameM){curAway=norm(gameM[1]);curHome=norm(gameM[2]);curTeam=null;continue;}
      const teamM=l.match(/^([A-Z]{2,4}):\s*(.*)/);
      if(teamM&&curAway){
        curTeam=norm(teamM[1]);
        const rest=teamM[2].trim();
        if(rest)rest.split(/\.\s+/).filter(Boolean).forEach(b=>{if(b.length>5)trends.push({away:curAway,home:curHome,game:curAway+'@'+curHome,team:curTeam,text:b,src:'Covers'});});
        continue;
      }
      if(curAway&&l.length>8)trends.push({away:curAway,home:curHome,game:curAway+'@'+curHome,team:curTeam,text:l,src:'Covers'});
    }
  }

  picks.forEach(p=>{if(!p.src)p.src=curSrc});
    return{picks,trends,consensus,props,isNFL:true};
}

// ── NFL ext picks save ────────────────────────────────────────────────────────
function saveNFLExtData(picks,trends,consensus,el){
  const d=today();
  // picks
  const allP=get(LS.nflext,{});allP[d]=allP[d]||[];
  picks.forEach(x=>{
    const gm=NFL_GAMES.find(g=>g.away.abbr===x.away&&g.home.abbr===x.home);
    const rec={...x,gid:gm?gm.id:null,capturedAt:Date.now()};
    /* The dedupe key omitted the source, so uploading a second outlet's picks
       OVERWROTE the first outlet's row for the same side. Consensus could
       therefore never exceed one source and "unanimous" was unreachable.
       Keying on the source too means re-uploading the SAME outlet still
       replaces its own row, while a different outlet is kept alongside it. */
    const k=[x.game,x.market,x.side,x.line,rec.src||'upload'].join('|');
    const i=allP[d].findIndex(y=>[y.game,y.market,y.side,y.line,y.src||'upload'].join('|')===k);
    if(i>=0)allP[d][i]=rec;else allP[d].push(rec);
  });
  set(LS.nflext,allP);
  // trends
  const allT=get(LS.nfltrends,{});allT[d]=[...((allT[d]||[]).filter(x=>!trends.find(y=>y.game===x.game&&y.text===x.text))),...trends];
  set(LS.nfltrends,allT);
  // consensus
  const allC=get(LS.nflconsensus,{});allC[d]=[...((allC[d]||[]).filter(x=>!consensus.find(y=>y.game===x.game&&y.market===x.market))),...consensus];
  set(LS.nflconsensus,allC);
  if(el)el.innerHTML=`<div class="tkt hi"><h3>NFL data saved</h3>
    <div class="sub">${picks.length} picks · ${trends.length} trends · ${consensus.length} consensus rows</div></div>`;
  if(ACTIVE_SPORT==='nfl')renderNFL();
}

// ── Hook NFL parser into analyzeExtPicks and analyzeBookShots ─────────────────
// When ACTIVE_SPORT is 'nfl', route parsed data to NFL storage
const _origSaveExtPicks=typeof saveExtPicks==='function'?saveExtPicks:null;
const _origSaveBookOdds=typeof saveBookOdds==='function'?saveBookOdds:null;

// pullLiveOdds / fetchMLBLiveOdds moved to shared.js — mlb.html never loads this file.




// ── NCAAF Live Odds (The Odds API) ───────────────────────────────────────────
async function fetchNCAAFLiveOdds(){
  const key=theOddsApiKey();if(!key)return;
  const url=`https://api.the-odds-api.com/v4/sports/americanfootball_ncaaf/odds/?apiKey=${key}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
  const r=await fetch(url);const j=await r.json();
  if(!Array.isArray(j))throw new Error(j.message||'Bad API response');
  const d=today();const all=get(LS.ncaafshots,{});all[d]=all[d]||[];
  j.forEach(game=>{
    const home=game.home_team;const away=game.away_team;
    // Match to ESPN game by full name
    const gm=NCAAF_GAMES.find(g=>g.home.name===home||g.home.name.includes(home.split(' ').pop()));
    const homeAb=gm?gm.home.abbr:home.toUpperCase().replace(/\s+/g,'-').slice(0,8);
    const awayGm=NCAAF_GAMES.find(g=>g.away.name===away||g.away.name.includes(away.split(' ').pop()));
    const awayAb=awayGm?awayGm.away.abbr:away.toUpperCase().replace(/\s+/g,'-').slice(0,8);
    const gid=gm?gm.id:null;const gameKey=awayAb+'@'+homeAb;
    const book=game.bookmakers.find(b=>b.key==='draftkings')||game.bookmakers.find(b=>b.key==='fanduel')||game.bookmakers[0];
    if(!book)return;
    book.markets.forEach(mkt=>{
      mkt.outcomes.forEach(o=>{
        let market,side,line=null;
        if(mkt.key==='h2h'){market='moneyline';side=o.name===home?'home':'away';}
        else if(mkt.key==='spreads'){market='spread';side=o.name===home?'home':'away';line=o.point;}
        else if(mkt.key==='totals'){market='total';side=o.name.toLowerCase()==='over'?'over':'under';line=o.point;}
        else return;
        const rec={away:awayAb,home:homeAb,game:gameKey,market,side,line,price:o.price,gid,capturedAt:Date.now()};
        const k=[rec.game,rec.market,rec.side,rec.line].join('|');
        const i=all[d].findIndex(x=>[x.game,x.market,x.side,x.line].join('|')===k);
        if(i>=0)all[d][i]=rec;else all[d].push(rec);
      });
    });
  });
  set(LS.ncaafshots,all);NCAAF_SIMS={};
  if(ACTIVE_SPORT==='ncaaf')renderNCAAF();
}

// ── Boot: restore NFL games from cache ────────────────────────────────────────
(function restoreNFLGames(){
  const cache=get(LS.nflgames,{});
  // find most recent cached week
  const keys=Object.keys(cache).sort((a,b)=>(cache[b].ts||0)-(cache[a].ts||0));
  if(keys.length){
    const latest=cache[keys[0]];
    if(latest.v&&latest.v.length){
      NFL_GAMES=latest.v;
      NFL_WEEK=latest.week||null;
      NFL_SEASON=latest.season||null;
      NFL_SIMS={};
    }
  }
})();
/* Same fix as CFB: this cache-restore path is the NORMAL app-reopen route,
   not the rare fresh-network-load one — the refresh trigger has to live here
   too, or a stale cached status just sits unrefreshed on every ordinary
   reopen. */
if(window.__PAGE_SPORT__==='nfl'){
  whenScriptReady(()=>{refreshNFLLiveScores().catch(()=>{})},1500);
}

/* ═══════════════════════════════════════════════════════════════════════
   NFL INTELLIGENCE LAYER — A+++ build
   Power ratings · Live odds · Calibration · A-G Evaluation · Injuries
   ═══════════════════════════════════════════════════════════════════════ */

// ── NFL Division map ─────────────────────────────────────────────────────────
const NFL_DIVISION={
  BUF:'AFC East',MIA:'AFC East',NE:'AFC East',NYJ:'AFC East',
  BAL:'AFC North',CIN:'AFC North',CLE:'AFC North',PIT:'AFC North',
  HOU:'AFC South',IND:'AFC South',JAX:'AFC South',TEN:'AFC South',
  DEN:'AFC West',KC:'AFC West',LAC:'AFC West',LV:'AFC West',
  DAL:'NFC East',NYG:'NFC East',PHI:'NFC East',WSH:'NFC East',
  CHI:'NFC North',DET:'NFC North',GB:'NFC North',MIN:'NFC North',
  ATL:'NFC South',CAR:'NFC South',NO:'NFC South',TB:'NFC South',
  ARI:'NFC West',LAR:'NFC West',SEA:'NFC West',SF:'NFC West',
};
// ── UPGRADE 1/2: venue environment ──────────────────────────────────────────
// Fully enclosed (fixed or retractable) roofs — no weather adjustment.
// SoFi (LAC/LAR) is covered but open-sided, so it is treated as outdoor.
const NFL_DOME=new Set(['DAL','DET','HOU','IND','LV','MIN','NO','ATL','ARI','BUF']);
// Artificial surface. Everything else is natural grass.
const NFL_TURF=new Set(['ARI','ATL','BUF','CHI','CIN','DAL','DET','HOU','IND','LV','LAC','LAR',
  'MIN','NE','NO','NYG','NYJ','PHI','SEA','TB','TEN']);
function nflSurfaceMult(homeAbbr){return NFL_TURF.has(String(homeAbbr||'').toUpperCase())?1.03:1.00}
function nflEnvMult(g){
  if(!g||!g.home)return 1.00;
  if(NFL_DOME.has(String(g.home.abbr||'').toUpperCase()))return 1.00;
  const w=g.weather;
  if(!w)return 1.00;                      // no weather data -> no adjustment
  let m=1.00;
  const t=parseFloat(w.temp);
  if(!isNaN(t)){ if(t<32)m*=0.96; else if(t>80)m*=1.02; }
  // Football differs from baseball: direction is irrelevant, any strong wind
  // suppresses the passing game.
  const wind=parseFloat(String(w.wind||'').match(/(\d+)/)?.[1]);
  if(!isNaN(wind)){ if(wind>=25)m*=0.94; else if(wind>=15)m*=0.97; }
  if(/rain|snow|shower|storm|sleet/i.test(String(w.cond||'')))m*=0.96;
  return Math.max(0.88,Math.min(1.05,m));
}
function nflEnvChips(g){
  const home=String(g.home&&g.home.abbr||'').toUpperCase();
  const chips=[NFL_TURF.has(home)?'TURF':'GRASS'];
  if(NFL_DOME.has(home))chips.push('DOME');
  else if(g.weather){
    const t=parseFloat(g.weather.temp),wd=parseFloat(String(g.weather.wind||'').match(/(\d+)/)?.[1]);
    if(!isNaN(t)&&t<32)chips.push('COLD');
    if(!isNaN(wd)&&wd>=15)chips.push('WIND '+wd);
    if(/rain|snow|shower|storm|sleet/i.test(String(g.weather.cond||'')))chips.push('WET');
  }
  const e=nflEnvMult(g);
  if(Math.abs(e-1)>0.001)chips.push('ENV '+(e>1?'+':'')+Math.round((e-1)*100)+'%');
  return chips;
}
/* ── NFL DEPTH CHARTS (ESPN) ──────────────────────────────────────────────
   Props were modelled with a flat 20% target share for every receiver, because
   the engine had no idea who WR1 was. This pulls each team's roster once a day
   and derives the skill-position ordering, so a prop line attaches to the
   actual player rather than an average one.

   Deliberately uses /roster and NOT /depthcharts: the depth chart endpoint
   returns a separate $ref URL per player, which means ~80 extra requests per
   team. The roster payload carries the athletes inline. 32 calls, once daily,
   cached — not 2,500 on every render. */
const NFL_SKILL_POS=new Set(['QB','RB','WR','TE','FB']);
/* ESPN's permanent NFL team IDs (unchanged for years) — the fallback when the
   team-list request can't be reached. */
const NFL_ESPN_IDS={ATL:1,BUF:2,CHI:3,CIN:4,CLE:5,DAL:6,DEN:7,DET:8,GB:9,TEN:10,IND:11,KC:12,LV:13,LAR:14,MIA:15,MIN:16,
  NE:17,NO:18,NYG:19,NYJ:20,PHI:21,ARI:22,PIT:23,LAC:24,SF:25,SEA:26,TB:27,WSH:28,CAR:29,JAX:30,BAL:33,HOU:34};
async function fetchNFLDepthCharts(force){
  const cache=get(LS.nfldepth,{});
  if(!force&&cache.ts&&(Date.now()-cache.ts)<864e5&&cache.v&&Object.keys(cache.v).length){
    NFL_DEPTH=cache.v;NFL_DEPTH_STATUS='cached '+Object.keys(NFL_DEPTH).length+' teams';return true;
  }
  try{
    /* The team list only supplies ESPN team IDs. When a phone couldn't reach
       it ("Load failed") the whole depth-chart feature died, even though
       those IDs never change. Try twice, then use the built-in table. */
    let teams=[];
    for(let a=0;a<2&&!teams.length;a++){
      try{const tr=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams');
        const tj=await tr.json();teams=((tj.sports||[])[0]||{}).leagues?.[0]?.teams||[];}
      catch(err){if(a===0)await new Promise(r=>setTimeout(r,600));}
    }
    if(!teams.length)teams=Object.entries(NFL_ESPN_IDS).map(([abbreviation,id])=>({team:{id:String(id),abbreviation}}));
    const out={};
    // sequential with a small gap — these are undocumented endpoints and the
    // community guidance is explicitly to keep request volume low
    for(const w of teams){
      const t=w.team||{};if(!t.id)continue;
      try{
        const rr=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${t.id}/roster`);
        const rj=await rr.json();
        const players=[];
        (rj.athletes||[]).forEach(grp=>{
          const list=Array.isArray(grp)?grp:(grp.items||[grp]);
          list.forEach(a=>{
            if(!a||!a.fullName)return;
            const pos=((a.position&&(a.position.abbreviation||a.position.name))||'').toUpperCase();
            if(!NFL_SKILL_POS.has(pos))return;
            players.push({name:a.fullName,short:a.shortName||a.displayName||a.fullName,
              pos,id:a.id,jersey:a.jersey||null,
              exp:num(a.experience&&a.experience.years)||0});
          });
        });
        /* The roster gives names and positions but NOT depth order. The
           depth chart gives order but identifies players only by $ref URL.
           Fetching those refs is the ~80-calls-per-team trap. Instead: pull the
           depth chart once and pull the athlete ID out of each ref URL, then
           join against the roster we already have. Two calls per team total. */
        const byId={};players.forEach(p=>{if(p.id)byId[String(p.id)]=p});
        try{
          const dr=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${t.id}/depthcharts`);
          const dj=await dr.json();
          (dj.items||dj.depthchart||[]).forEach(unit=>{
            const posns=unit.positions||{};
            Object.keys(posns).forEach(k=>{
              const entry=posns[k]||{};
              const abbr=((entry.position&&entry.position.abbreviation)||k||'').toUpperCase();
              if(!NFL_SKILL_POS.has(abbr))return;
              const ath=entry.athletes||[];
              ath.forEach((a,i)=>{
                const ref=String(a.athlete&&a.athlete['$ref']||a['$ref']||'');
                const m=ref.match(/athletes\/(\d+)/);
                const id=m?m[1]:(a.id?String(a.id):null);
                const rank=(a.rank!=null?a.rank:i+1);
                if(id&&byId[id])byId[id].depth=Math.min(byId[id].depth||99,rank);
              });
            });
          });
        }catch(e){/* depth order is a bonus; roster alone still works */}
        // anyone the depth chart didn't rank falls in behind those it did
        const seq={};
        players.sort((a,b)=>(a.depth||99)-(b.depth||99)).forEach(p=>{
          seq[p.pos]=(seq[p.pos]||0)+1;
          if(!p.depth)p.depth=seq[p.pos];
        });
        if(players.length)out[(t.abbreviation||'').toUpperCase()]={players,ts:Date.now()};
      }catch(e){/* one team failing must not kill the batch */}
      await new Promise(r=>setTimeout(r,120));
    }
    if(!Object.keys(out).length){NFL_DEPTH_STATUS='no rosters parsed';return false;}
    NFL_DEPTH=out;
    set(LS.nfldepth,{ts:Date.now(),v:out});
    NFL_DEPTH_STATUS='loaded '+Object.keys(out).length+' teams';
    if(ACTIVE_SPORT==='nfl'&&typeof renderNFL==='function')renderNFL();
    return true;
  }catch(e){NFL_DEPTH_STATUS='failed: '+(e&&e.message||e);console.warn('NFL depth charts failed',e);return false;}
}
(function restoreNFLDepth(){
  const c=get(LS.nfldepth,{});
  if(c.v&&Object.keys(c.v).length){NFL_DEPTH=c.v;NFL_DEPTH_STATUS='cached '+Object.keys(c.v).length+' teams';}
})();
/* Find a rostered player by the name written on an uploaded PROP: line.
   Book exports write "P.Mahomes" or "Patrick Mahomes II" — match on surname
   plus first initial rather than requiring an exact string. */
function nflFindPlayer(teamAbbr,rawName){
  const roster=(NFL_DEPTH[String(teamAbbr||'').toUpperCase()]||{}).players||[];
  if(!roster.length||!rawName)return null;
  const clean=String(rawName).replace(/[.]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
  const parts=clean.split(' ').filter(Boolean);
  const last=parts[parts.length-1], firstInit=(parts[0]||'')[0];
  let hit=roster.find(p=>p.name.toLowerCase()===clean);
  if(hit)return hit;
  const byLast=roster.filter(p=>{
    const pn=p.name.toLowerCase().split(' ');
    return pn[pn.length-1]===last||pn.includes(last);
  });
  if(byLast.length===1)return byLast[0];
  if(byLast.length>1&&firstInit){
    const m=byLast.find(p=>p.name.toLowerCase()[0]===firstInit);
    if(m)return m;
  }
  return byLast[0]||null;
}
/* Share of team volume for a player, from their position and roster depth.
   Falls back to the old flat split when the roster hasn't loaded. */
function nflShareFor(player,kind){
  if(!player)return kind==='passing'?0.95:kind==='rushing'?0.55:0.20;
  const p=player.pos;
  if(kind==='passing')return p==='QB'?0.95:0.02;
  if(kind==='rushing')return p==='RB'?(player.depth===1?0.60:player.depth===2?0.25:0.12)
                              :p==='QB'?0.10:p==='FB'?0.05:0.04;
  // receiving
  if(p==='WR')return player.depth===1?0.25:player.depth===2?0.17:0.09;
  if(p==='TE')return player.depth===1?0.15:0.05;
  if(p==='RB')return player.depth===1?0.10:0.05;
  return 0.06;
}
// ── UPGRADE 6: prop engine ──────────────────────────────────────────────────
// Props are built from team-level power ratings and position splits, because
// there is no per-player NFL stats feed the way MLB StatsAPI provides one. The
// player, stat and line all come from the PROP: rows in the uploaded file, so
// the model only has to supply the probability.
// Every yardage stat uses normTail (2/PI Polya). The 8/PI variant that circulates
// for this is wrong by up to 15 points and would invent edges that are not there.
const NFL_PROP_MODEL={
  passing:   {share:0.95, per25:245, sd:65},
  rushing:   {share:0.55, per25:115, sd:35},
  receiving: {share:0.20, per25:245, sd:22},
};
/* MLB's marketMatchesPick/pickMatchesSide are written around run lines and
   first-5-innings markets. Football needs its own vocabulary — spread, h1spread,
   h1total, prop — so the tier system compares like with like instead of
   silently matching nothing and reporting "no outside sources" forever. */
/* CFB has no fixed abbreviation table the way the NFL does, so the loaded
   schedule is the source of truth: match an uploaded name ("North Carolina")
   to the abbreviation the board actually uses ("UNC"). Without this, book
   lines saved as NORTH-CAROLI@TCU-HORNED never matched UNC@TCU and the CFB
   squares stayed empty no matter how clean the upload was. */
/* College names carry diacritics the book strips: the schedule says
   "San Jose State" with an accent, the upload says "San Jose State" without.
   Decompose and drop combining marks so the two forms compare equal. */
function cfbKeyOf(x){
  return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function ncaafAbbrFor(raw){
  if(!raw)return null;
  const k=cfbKeyOf(raw);
  if(!k)return null;
  /* CRITICAL FIX — the old single-pass loop tried a bidirectional prefix
     match (c.startsWith(k) || k.startsWith(c)) on the FIRST team it reached,
     and returned immediately on any hit. That direction is unsafe: querying
     "Ohio State" (key OHIOSTATE) satisfies k.startsWith(c) against "Ohio"
     (key OHIO) — a completely different school — because OHIOSTATE happens to
     start with the letters OHIO. Reproduced directly: ncaafAbbrFor('Ohio
     State') was returning 'OHIO' (Ohio Bobcats) instead of 'OSU' (Ohio State
     Buckeyes), which silently misfiles that team's book line onto the wrong
     game — the same class of bug as the cross-game spread contamination,
     just one level lower in the stack.

     Fixed with two passes: (1) scan EVERY team for an exact match on any name
     form first, so a real exact match always wins regardless of scan order;
     only if NOTHING matches exactly does (2) allow a ONE-DIRECTIONAL prefix
     check — the schedule's own longer form starting with the query, never
     the reverse — and only when exactly one team qualifies. An ambiguous
     prefix (two different teams both plausible) resolves to nothing rather
     than guessing, since a wrong resolution here silently corrupts a card
     the same way the removed lookup fuzziness did. */
  /* SPORTSBOOK ALIAS TABLE — some teams are listed differently on sportsbooks
     vs ESPN. "Mississippi" on DraftKings/FanDuel means Ole Miss, but ESPN
     calls them "Ole Miss Rebels". Without this, "Mississippi" matched only
     Mississippi State (whose ESPN name starts with "Mississippi") and stored
     the wrong team. This runs BEFORE the prefix scan so the alias wins cleanly. */
  const NCAAF_SB_ALIASES={
    'MISSISSIPPI':'OLEMISS',       // sportsbook "Mississippi" → ESPN "Ole Miss Rebels"
    'OLEMISS':'OLEMISS',
    'SOUTHERNCAL':'USC',           // sportsbook "Southern Cal" → ESPN "USC Trojans"
    'SOUTHERNCALIFORNIA':'USC',
    'PITT':'PITTSBURGH',           // sportsbook "Pitt" → ESPN "Pittsburgh Panthers"
    'TEXASAM':'TEXASAM',
    'GEORGIA SOUTHERN':'GEORGIASOUTHERN',
    'CENTRALFLORIDA':'UCF',        // sportsbook "Central Florida" → ESPN "UCF Knights"
  };
  const aliasKey=NCAAF_SB_ALIASES[k];
  if(aliasKey){
    for(const ga of (NCAAF_GAMES||[])){
      for(const ta of [ga.away,ga.home]){
        if(!ta)continue;
        const ca=[ta.abbr,ta.name,ta.shortName,ta.location,ta.displayName]
          .filter(Boolean).map(cfbKeyOf);
        if(ca.includes(aliasKey))return ta.abbr;
        if(ca.some(c=>c.length>=aliasKey.length&&c.startsWith(aliasKey)))return ta.abbr;
      }
    }
  }
  let prefixHits=[];
  for(const g of (NCAAF_GAMES||[])){
    for(const t of [g.away,g.home]){
      if(!t)continue;
      const cands=[t.abbr,t.name,t.shortName,t.location,t.displayName]
        .filter(Boolean).map(cfbKeyOf);
      if(cands.includes(k))return t.abbr;                       // exact — always wins immediately
      if(k.length>3&&cands.some(c=>c.length>k.length&&c.startsWith(k)))
        prefixHits.push({abbr:t.abbr,name:t.name||''});
    }
  }
  const uniqueAbbrs=[...new Set(prefixHits.map(x=>x.abbr))];
  if(uniqueAbbrs.length===1)return uniqueAbbrs[0];
  if(uniqueAbbrs.length>1){
    /* TIEBREAKER: when multiple teams share a prefix (e.g. "Washington"
       matches both "Washington Huskies" and "Washington State Cougars"),
       check whether the query exactly matches one team's LOCATION — defined
       as the name with its last word (mascot) removed. The Huskies'
       location is "Washington"; the Cougars' is "Washington State". A query
       of "Washington" hits the Huskies exactly and is never ambiguous
       after this check. Without this, both Washington teams returned null,
       the upload stored a slug, repairNCAAFKeys couldn't fix one side of
       the game key, and the card showed sim only even after a successful
       upload — exactly the bug reported. */
    const locMatch=prefixHits.filter(x=>{
      const words=(x.name||'').split(/\s+/).filter(Boolean);
      if(words.length<2)return false;
      const loc=cfbKeyOf(words.slice(0,-1).join(' '));// "Washington" from "Washington Huskies"
      return loc===k;
    });
    const uniqueLoc=[...new Set(locMatch.map(x=>x.abbr))];
    if(uniqueLoc.length===1)return uniqueLoc[0];
  }
  return null;
}
function nflMarketMatchesPick(ext,pick){
  const p=String(pick||'').toLowerCase();
  switch(ext.market){
    case 'moneyline': return /\bml\b/.test(p);
    case 'spread':    return /spread/.test(p)&&!/1h/.test(p);
    case 'total':     return /^over|^under/.test(p);
    case 'h1spread':  return /1h spread/.test(p);
    case 'h1total':   return /^1h (over|under)/.test(p);
    case 'prop':      return !!ext.player&&p.includes(String(ext.player).toLowerCase());
    default: return false;
  }
}
function nflPickMatchesSide(ext,pick){
  const p=String(pick||'').toLowerCase();
  if(ext.side==='over')return /\bover\b/.test(p);
  if(ext.side==='under')return /\bunder\b/.test(p);
  if(ext.side==='away'||ext.side==='home'){
    const ab=String(ext.side==='away'?ext.away:ext.home||'').toLowerCase();
    return !!ab&&p.startsWith(ab);
  }
  return false;
}
function buildNFLProps(g,s){
  const out=[];
  const gameKey=g.away.abbr+'@'+g.home.abbr;
  const uploaded=nflBookLinesFor(gameKey).filter(x=>x.market==='prop'&&x.player);
  if(!uploaded.length)return out;
  const awayPow=NFL_POWER[g.away.abbr]||{offPPG:24,defPPG:24};
  const homePow=NFL_POWER[g.home.abbr]||{offPPG:24,defPPG:24};
  const awayExp=s.awayProj||awayPow.offPPG, homeExp=s.homeProj||homePow.offPPG;

  uploaded.forEach(bp=>{
    // Which side is the player on? The parser records the game's two abbrs; if
    // it did not tag the player's team, fall back to the home side rather than
    // guessing a team the name might belong to.
    const isHome=(bp.team? bp.team===g.home.abbr : bp.home===g.home.abbr);
    const teamExp=isHome?homeExp:awayExp;
    const oppDef=isHome?awayPow.defPPG:homePow.defPPG;
    /* Opponent adjustment, centred on the league average of ~22 points allowed.
       The spec's (28-oppDef)/28 ran BACKWARDS — it shrank the projection as the
       opposing defense got worse — and for every realistic defPPG it fell below
       the 0.8 floor, so after clamping it was a constant and the opponent had no
       effect at all. This is neutral at 22 and moves the right direction. */
    const oppAdj=Math.max(0.8,Math.min(1.2,(oppDef||22)/22));
    const stat=String(bp.stat||'').toLowerCase();
    const line=+bp.line;
    if(isNaN(line))return;
    let p=null,kind=null;

    if(/passing yard/.test(stat))       kind='passing';
    else if(/rushing yard/.test(stat))  kind='rushing';
    else if(/receiving yard/.test(stat))kind='receiving';

    /* Every receiver used to get a flat 20% of team passing yards regardless of
       whether they were WR1 or the third tight end. With depth charts loaded we
       can use the player's actual position and depth instead. When the roster
       hasn't loaded, nflShareFor returns the old flat values, so this degrades
       to previous behaviour rather than breaking. */
    const teamAb=isHome?g.home.abbr:g.away.abbr;
    const who=(typeof nflFindPlayer==='function')?nflFindPlayer(teamAb,bp.player):null;

    if(kind){
      const m=NFL_PROP_MODEL[kind];
      const share=(typeof nflShareFor==='function')?nflShareFor(who,kind):m.share;
      const exp=(teamExp/25)*m.per25*oppAdj*share;
      // a deeper role is also a noisier one — widen the spread down the chart
      const sd=m.sd*(who&&who.depth>1?1.15:1);
      p=normTail((line-exp)/sd);          // P(yards > line)
    } else if(/reception/.test(stat)){
      const share=(typeof nflShareFor==='function')?nflShareFor(who,'receiving'):0.20;
      const yds=(teamExp/25)*245*oppAdj*share;
      p=poisAtLeast(Math.ceil(line),yds/8); // ~8 yards per reception
    } else if(/passing touchdown/.test(stat)){
      p=poisAtLeast(Math.ceil(line),(teamExp/25)*1.6*oppAdj*(who&&who.pos!=='QB'?0.1:1));
    } else if(/rushing touchdown/.test(stat)){
      p=poisAtLeast(Math.ceil(line),(teamExp/25)*0.7*oppAdj*(who?nflShareFor(who,'rushing')/0.55:1));
    } else if(/receiving touchdown/.test(stat)){
      p=poisAtLeast(Math.ceil(line),(teamExp/25)*0.45*oppAdj*(who?nflShareFor(who,'receiving')/0.20:1));
    } else if(/touchdown/.test(stat)){
      p=poisAtLeast(Math.ceil(line),(teamExp/25)*0.6*oppAdj);
    }
    if(p==null||isNaN(p)||p<=0.03||p>=0.97)return;

    const price=bp.price;
    const fair=nflFairML(p);
    out.push({
      player:bp.player,stat:bp.stat,line,price,
      matched:who?who.name:null,pos:who?who.pos:null,depth:who?who.depth:null,
      simP:Math.round(p*1000)/1000,fairML:fair,
      ev:evPct(p,price),
      // the object the bet square renders
      e:{p,price,fair,ev:evPct(p,price),impl:amerToProb(price)},
      // flag at 60%+ calibrated probability AND positive expected value
      actionable:(p>=0.60&&evPct(p,price)>=2),
      game:gameKey,team:isHome?g.home.abbr:g.away.abbr
    });
  });
  // rank by expected value, not by raw probability — a 75% shot at a terrible
  // price is worse than a 58% shot at a good one
  return out.sort((a,b)=>(b.ev||-999)-(a.ev||-999));
}
function nflIsDivisionGame(g){
  return NFL_DIVISION[g.away.abbr]&&NFL_DIVISION[g.away.abbr]===NFL_DIVISION[g.home.abbr];
}
function nflIsConferenceGame(g){
  const da=NFL_DIVISION[g.away.abbr],dh=NFL_DIVISION[g.home.abbr];
  if(!da||!dh)return null;
  return da.slice(0,3)===dh.slice(0,3);
}

// ── NFL Power Ratings ────────────────────────────────────────────────────────
// Fetches from ESPN's team stats API — real offensive/defensive ratings.
// Points per game (off) and points allowed per game (def) for each team.
// Cached weekly, not daily — NFL teams don't change dramatically day to day.

async function fetchNFLPowerRatings(){
  try{
    // ESPN team stats — regular season standings with offensive/defensive numbers
    /* The old URL (apis/SITE/v2/.../standings) returns only a stub with a link
       to the standings web page — no teams. Every device got zero ratings and
       every card read "ratings not loaded", all season. apis/v2 carries the
       real table; walk it at any depth since ESPN nests by conf/division. */
    const entries=[];
    const walk=n=>{if(!n||typeof n!=='object')return;
      if(n.standings&&Array.isArray(n.standings.entries))n.standings.entries.forEach(x=>entries.push(x));
      (n.children||[]).forEach(walk);};
    try{
      const r=await fetch('https://site.api.espn.com/apis/v2/sports/football/nfl/standings?seasontype=2');
      walk(await r.json());
    }catch(err){console.warn('NFL standings fetch failed',err&&err.message)}
    /* In preseason the standings feed carries zero games played, so
       pointsFor/gamesPlayed was 0 — and `0 || 24` quietly turned that into 24
       for EVERY team. The result was a board where all 16 games projected the
       same 22-24.5 with the identical spread, because the only thing left
       separating the two sides was home-field advantage. Those numbers looked
       like model output and were not.

       Teams with no games played are now simply not rated, and a board with no
       real ratings behind it says so instead of printing a confident number. */
    entries.forEach(e=>{
      const abbr=(e.team&&e.team.abbreviation||'').toUpperCase();
      if(!abbr)return;
      const stats={};
      (e.stats||[]).forEach(s=>{stats[s.name]=s.value;});
      const gp=+stats.gamesPlayed||((+stats.wins||0)+(+stats.losses||0)+(+stats.ties||0));
      if(gp<1)return;                 // no games -> no rating, not a fake average
      const pf=+stats.pointsFor||0, pa=+stats.pointsAgainst||0;
      if(!pf&&!pa)return;
      NFL_POWER[abbr]={
        offPPG:pf/gp, defPPG:pa/gp, gp,
        wins:stats.wins||0,losses:stats.losses||0,ties:stats.ties||0,
        pf,pa,
        sos:stats.strengthOfSchedule||0,
        streak:stats.streak||0,
      };
    });
    /* Second source, independent of the standings feed: completed games on the
       weekly scoreboards. Real PF/PA per team from actual finals. */
    if(Object.keys(NFL_POWER).length<8){
      try{Object.assign(NFL_POWER,await nflRatingsFromScoreboards());}
      catch(err){console.warn('NFL scoreboard ratings failed',err&&err.message)}
    }
    try{await nflApplyPriorSeason();}catch(err){console.warn('NFL prior season',err&&err.message)}
    NFL_POWER_RATED=Object.keys(NFL_POWER).length;
    // Flat ratings are as useless as none — check that teams actually differ.
    const offs=Object.values(NFL_POWER).map(t=>t.offPPG);
    const spread=offs.length?Math.max(...offs)-Math.min(...offs):0;
    NFL_POWER_FLAT=(NFL_POWER_RATED<8||spread<1.5);
    // cache for the week
    set('d4.nflpower',{ts:Date.now(),v:NFL_POWER,week:NFL_WEEK});
    // update existing NFL_GAMES with real ratings
    NFL_GAMES.forEach(g=>{
      if(NFL_POWER[g.away.abbr]){g.away.offRating=NFL_POWER[g.away.abbr].offPPG;g.away.defRating=NFL_POWER[g.away.abbr].defPPG;}
      if(NFL_POWER[g.home.abbr]){g.home.offRating=NFL_POWER[g.home.abbr].offPPG;g.home.defRating=NFL_POWER[g.home.abbr].defPPG;}
    });
    NFL_SIMS={};  // invalidate sims so they rerun with real numbers
    if(ACTIVE_SPORT==='nfl')renderNFL();
    console.log('NFL power ratings loaded:',Object.keys(NFL_POWER).length,'teams');
  }catch(e){
    console.warn('NFL power ratings failed:',e.message);
  }
}

async function nflRatingsFromScoreboards(){
  const season=NFL_SEASON||new Date().getFullYear();
  const last=Math.max(1,(+NFL_WEEK||2)-1);const T={};
  for(let w=1;w<=Math.min(last,18);w++){
    let j;try{const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${w}`);j=await r.json();}catch(e){continue;}
    (j.events||[]).forEach(ev=>{
      const c=(ev.competitions||[])[0];if(!c)return;
      const st=(c.status||ev.status||{}).type||{};if(!(st.completed||st.state==='post'))return;
      const cs=c.competitors||[];if(cs.length<2)return;
      cs.forEach((t,i)=>{const o=cs[1-i];const ab=((t.team||{}).abbreviation||'').toUpperCase();if(!ab)return;
        const pf=+t.score,pa=+o.score;if(isNaN(pf)||isNaN(pa))return;
        const x=T[ab]||(T[ab]={pf:0,pa:0,gp:0,wins:0,losses:0,ties:0});
        x.pf+=pf;x.pa+=pa;x.gp++;if(pf>pa)x.wins++;else if(pf<pa)x.losses++;else x.ties++;});
    });
  }
  const out={};Object.entries(T).forEach(([ab,x])=>{if(x.gp)out[ab]={offPPG:x.pf/x.gp,defPPG:x.pa/x.gp,gp:x.gp,
    wins:x.wins,losses:x.losses,ties:x.ties,pf:x.pf,pa:x.pa,sos:0,streak:0,src:'scoreboards'};});
  return out;
}


/* ── PREVIOUS SEASON ANCHOR ─────────────────────────────────────────────────
   Two games of points is mostly noise; the sim used to regress that noise
   toward a generic 22 for every team, so September games came out near coin
   flips (the Jets rated even with Detroit). Each team is now anchored to ITS
   OWN previous season, worth NFL_PRIOR_K games of evidence, and this season
   takes over as games pile up: at 4 GP it's 50/50, at 12 GP it's 75/25.
   Raw and prior numbers are kept for the Power Rankings panel. */
const NFL_PRIOR_K=4;
async function nflPriorSeason(){
  const season=(+NFL_SEASON||new Date().getFullYear())-1;
  const c=get('d4.nflprior',{});if(c.season===season&&c.v&&Object.keys(c.v).length>=16)return c.v;
  const out={};const entries=[];
  const walk=n=>{if(!n||typeof n!=='object')return;
    if(n.standings&&Array.isArray(n.standings.entries))n.standings.entries.forEach(x=>entries.push(x));(n.children||[]).forEach(walk);};
  const r=await fetch(`https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=${season}&seasontype=2`);walk(await r.json());
  entries.forEach(x=>{const ab=((x.team||{}).abbreviation||'').toUpperCase();if(!ab)return;const S={};(x.stats||[]).forEach(s=>S[s.name]=+s.value);
    const gp=S.gamesPlayed||((S.wins||0)+(S.losses||0)+(S.ties||0));if(!gp||!(S.pointsFor>0))return;
    out[ab]={off:S.pointsFor/gp,def:S.pointsAgainst/gp,w:S.wins||0,l:S.losses||0};});
  if(Object.keys(out).length>=16)set('d4.nflprior',{season,v:out,ts:Date.now()});
  return out;
}
async function nflApplyPriorSeason(){
  let P={};try{P=await nflPriorSeason();}catch(e){}
  Object.entries(NFL_POWER).forEach(([ab,t])=>{
    if(t.rawOffPPG==null){t.rawOffPPG=t.offPPG;t.rawDefPPG=t.defPPG;}
    const p=P[ab];const gp=+t.gp||((t.wins||0)+(t.losses||0)+(t.ties||0));
    if(!p){t.priorOff=null;t.priorDef=null;t.priorW=0;t.offPPG=t.rawOffPPG;t.defPPG=t.rawDefPPG;return;}
    const w=NFL_PRIOR_K/(gp+NFL_PRIOR_K);
    t.priorOff=+p.off.toFixed(1);t.priorDef=+p.def.toFixed(1);t.priorRec=p.w+'-'+p.l;t.priorW=+w.toFixed(2);
    t.offPPG=t.rawOffPPG*(1-w)+p.off*w;t.defPPG=t.rawDefPPG*(1-w)+p.def*w;});
}
/* ── POWER RANKINGS ─────────────────────────────────────────────────────── */
function nflRankingsBlock(){
  const T=Object.entries(NFL_POWER).filter(([,t])=>t&&t.offPPG!=null);
  if(!T.length)return'';
  T.sort((a,b)=>(b[1].offPPG-b[1].defPPG)-(a[1].offPPG-a[1].defPPG));
  const f=x=>x==null?'—':(+x).toFixed(1);
  const rows=T.map(([ab,t],i)=>{const net=t.offPPG-t.defPPG;
    return`<tr><td>${i+1}</td><td><b>${ab}</b></td><td>${t.wins||0}-${t.losses||0}${t.ties?'-'+t.ties:''}</td>
      <td>${f(t.rawOffPPG??t.offPPG)}/${f(t.rawDefPPG??t.defPPG)}</td><td>${t.priorOff!=null?f(t.priorOff)+'/'+f(t.priorDef):'—'}</td>
      <td style="color:${net>=0?'var(--win)':'var(--rust)'}">${f(t.offPPG)}/${f(t.defPPG)} <b>${net>=0?'+':''}${f(net)}</b></td>
      <td style="color:var(--mute)">${t.priorW?Math.round(t.priorW*100)+'%':'0%'}</td></tr>`;}).join('');
  return`<details style="margin:0 0 10px"><summary style="cursor:pointer;font-weight:800;padding:8px 0">🏆 Power Rankings <span class="sub mono" style="font-size:10px">— what the sim uses</span></summary>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono';font-size:10px;line-height:1.7">
    <tr style="color:var(--mute)"><td>#</td><td>Team</td><td>W-L</td><td>This yr PF/PA</td><td>Last yr</td><td>Used PF/PA · net</td><td>History wt</td></tr>${rows}</table></div>
    <div class="sub" style="font-size:10px;margin-top:4px">Per game. Last season counts as ${NFL_PRIOR_K} games of evidence, so early weeks lean on history and this season takes over as games are played.</div></details>`;
}

// boot: restore cached power ratings
(function restoreNFLPower(){
  const c=get('d4.nflpower',{});
  if(c.v&&Object.keys(c.v).length){
    NFL_POWER=c.v;
    NFL_POWER_RATED=Object.keys(NFL_POWER).length;
    const offs=Object.values(NFL_POWER).map(t=>t.offPPG).filter(n=>typeof n==='number');
    const spread=offs.length?Math.max(...offs)-Math.min(...offs):0;
    NFL_POWER_FLAT=(NFL_POWER_RATED<8||spread<1.5);
  }else{NFL_POWER_RATED=0;NFL_POWER_FLAT=true}
})();

// ── NFL Advanced Sim Engine ────────────────────────────────────────────────────
// Replaces the basic normal distribution sim with a full possession-based model.
// Uses real PPG offense/defense, home field advantage, situational adjustments,
// and calibration correction just like the MLB engine.
const NFL_CALIB_KEY='d4.nflcalib';

function simNFLGame(g,N){
  N=N||10000;

  const awayPow=NFL_POWER[g.away.abbr]||{offPPG:22,defPPG:22,wins:0,losses:0,ties:0};
  const homePow=NFL_POWER[g.home.abbr]||{offPPG:22,defPPG:22,wins:0,losses:0,ties:0};

  const leagueAvg=22.0;
  /* With a previous-season anchor already in offPPG/defPPG, the generic pull
     toward 22 is mostly redundant — keep a light touch instead of 35%. */
  const regFactor=(awayPow.priorOff!=null&&homePow.priorOff!=null)?0.10:0.35;
  const gamesPlayed=Math.max((awayPow.wins||0)+(awayPow.losses||0)+(awayPow.ties||0),
                             (homePow.wins||0)+(homePow.losses||0)+(homePow.ties||0),1);
  const regW=Math.max(0,Math.min(1,(gamesPlayed-1)/8));
  const reg=1-regFactor*(1-regW);

  let awayExp=((awayPow.offPPG+homePow.defPPG)/2)*reg + leagueAvg*(1-reg);
  let homeExp=((homePow.offPPG+awayPow.defPPG)/2)*reg + leagueAvg*(1-reg) + NFL_HFA;

  // ── situational adjustments (upgrades 1-3) ──
  if(nflIsDivisionGame(g)){awayExp*=0.96;homeExp*=0.96;}   // division games run tighter
  const surf=nflSurfaceMult(g.home.abbr);                   // turf plays ~3% higher scoring
  awayExp*=surf; homeExp*=surf;
  const env=nflEnvMult(g);                                  // 1.00 unless weather is known
  awayExp*=env; homeExp*=env;
  if(g.away.abbr===g.home.abbr)awayExp=homeExp=22;

  const nflCalib=hotGet(NFL_CALIB_KEY,{});
  const driftAdj=(nflCalib.globalDrift||0)/2;
  awayExp=Math.max(10,Math.min(40,awayExp+driftAdj));
  homeExp=Math.max(10,Math.min(40,homeExp+driftAdj));

  const std=10.5;
  /* Same histogram approach as the MLB engine: scores are small non-negative
     integers, so frequency tables answer over()/cover() in O(1) instead of
     rescanning and re-sorting three 10,000-element arrays on every call. */
  const TSPAN=120, MSPAN=121, MOFF=60;      // margins from -60..+60
  const totFreq=new Int32Array(TSPAN);
  const marFreq=new Int32Array(MSPAN);
  const h1Freq=new Int32Array(TSPAN);
  const scoreFreq=Object.create(null);
  let hw=0,aw=0,tie=0,as=0,hs=0;

  for(let i=0;i<N;i++){
    let a=snapNFLScore(Math.max(0,Math.round(awayExp+randn()*std)));
    let h=snapNFLScore(Math.max(0,Math.round(homeExp+randn()*std)));
    as+=a; hs+=h;
    const t=a+h; totFreq[t<TSPAN?t:TSPAN-1]++;
    let m=h-a; if(m<-MOFF)m=-MOFF; else if(m>MOFF)m=MOFF;
    marFreq[m+MOFF]++;
    const key=a+'-'+h; scoreFreq[key]=(scoreFreq[key]||0)+1;
    if(h>a)hw++; else if(a>h)aw++; else tie++;
    const h1=Math.max(0,Math.round(a*0.45+randn()*4))+Math.max(0,Math.round(h*0.45+randn()*4));
    h1Freq[h1<TSPAN?h1:TSPAN-1]++;
  }

  // cumGE[k] = count of totals >= k
  const cumGE=new Float64Array(TSPAN+2);
  for(let k=TSPAN-1;k>=0;k--)cumGE[k]=cumGE[k+1]+totFreq[k];
  // marGE[k] = count of margins >= (k - MOFF)
  const marGE=new Float64Array(MSPAN+2);
  for(let k=MSPAN-1;k>=0;k--)marGE[k]=marGE[k+1]+marFreq[k];

  const qFrom=(freq,span,q)=>{const idx=Math.floor(N*q);let run=0;
    for(let v=0;v<span;v++){run+=freq[v];if(run>idx)return v}return span-1};

  let modeScore=null,modeN=0;
  for(const k in scoreFreq)if(scoreFreq[k]>modeN){modeN=scoreFreq[k];modeScore=k}

  let rawHw=(hw+tie*0.5)/N, rawAw=(aw+tie*0.5)/N;
  try{
    const calHw=nflSideCalibAdj(rawHw,rawHw>=0.5?'favorite':'underdog');
    if(!isNaN(calHw)&&calHw>0&&calHw<1){rawHw=calHw;rawAw=1-calHw;}
  }catch(e){}

  const med=qFrom(totFreq,TSPAN,.5);
  const medMargin=qFrom(marFreq,MSPAN,.5)-MOFF;   // positive = home favored
  const medH1=qFrom(h1Freq,TSPAN,.5);

  const over=x=>{
    let k=Math.floor(x)+1; if(k<0)k=0; if(k>TSPAN)return 0;
    const raw=cumGE[k]/N;
    try{
      const cal=nflTotalCalibAdj(raw,rawHw>=0.5?'favorite':'underdog');
      if(!isNaN(cal)&&cal>0&&cal<1)return cal;
    }catch(e){}
    return raw;
  };
  const overH1=x=>{let k=Math.floor(x)+1;if(k<0)k=0;if(k>TSPAN)return 0;
    let run=0;for(let v=k;v<TSPAN;v++)run+=h1Freq[v];return run/N};

  /* SIGN CONVENTION, stated once because getting it wrong silently inverts
     every spread edge: homeCover(line) is P(the HOME side covers a handicap of
     `line` written from the home team's perspective). Home -3 covers when the
     home margin exceeds 3. awayCover is the complement at the mirrored line.
     The old code called spreadCover(-awaySpread.line) against a function that
     returned P(margin > line), which answered a different question than the
     away square it was labelling. */
  const homeCover=line=>{
    // home line -3 -> needs margin > 3 ; home line +3 -> needs margin > -3
    const need=-line;
    let k=Math.floor(need)+1+MOFF;
    if(k<0)k=0; if(k>MSPAN)return 0;
    return marGE[k]/N;
  };
  const awayCover=line=>{
    // away line +3 -> away covers when margin < 3  (margin = home - away)
    const need=line;
    let k=Math.floor(need)+MOFF+ (Number.isInteger(need)?1:1);
    if(k<0)return 0; if(k>MSPAN)k=MSPAN;
    return 1-(marGE[k]/N);
  };
  // kept for backward compatibility with existing call sites
  const spreadCover=line=>homeCover(line);

  return{
    awayProj:isNaN(awayExp)?22:Math.round(awayExp*10)/10,
    homeProj:isNaN(homeExp)?22:Math.round(homeExp*10)/10,
    hw:rawHw,aw:rawAw,
    med,medMargin,medH1,
    modeScore,modeScorePct:modeN/N,
    p10:qFrom(totFreq,TSPAN,.1),
    p90:qFrom(totFreq,TSPAN,.9),
    mean:(as+hs)/N,
    N,over,overH1,spreadCover,homeCover,awayCover,
    env,surf,
    awayExp,homeExp,
  };
}

// Snap raw score to realistic NFL scoring clusters
function snapNFLScore(s){
  if(s<0)return 0;
  // Common NFL scores: 0,3,6,7,9,10,13,14,16,17,20,21,23,24,27,28,30,31,34,35,37,38,41,42
  const valid=[0,3,6,7,9,10,13,14,16,17,20,21,23,24,27,28,30,31,33,34,37,38,41,42,44,45,48];
  let best=valid[0],bestD=Math.abs(s-valid[0]);
  for(const v of valid){const d=Math.abs(s-v);if(d<bestD){bestD=d;best=v;}}
  return best;
}

// ── NFL Calibration system ────────────────────────────────────────────────────
// Mirrors MLB segmented calibration — tracks real hit rate vs stated probability
// across market type (spread/total/moneyline) and situation (fav/dog/div/conf/neutral)
const NFL_CAL_BANDS=[[0,0.10],[0.10,0.20],[0.20,0.30],[0.30,0.40],[0.40,0.50],
  [0.50,0.60],[0.60,0.70],[0.70,0.80],[0.80,0.90],[0.90,1.00]];

function nflBandOf(p){
  for(const[lo,hi]of NFL_CAL_BANDS)if(p>=lo&&p<hi)return`${(lo*100)|0}-${(hi*100)|0}`;
  return'90-100';
}
function getNFLCalib(){return get(NFL_CALIB_KEY,{});}

function nflSideCalibAdj(raw,situation){
  const c=getNFLCalib();
  const band=nflBandOf(raw);
  const key=`side|${situation||'any'}|${band}`;
  const entry=c[key];
  if(!entry||entry.n<8)return raw;
  const hitRate=entry.hits/entry.n;
  const k=Math.min(1,(entry.n-8)/20);
  return raw*(1-k)+hitRate*k;
}
function nflTotalCalibAdj(raw,situation){
  const c=getNFLCalib();
  const band=nflBandOf(raw);
  const key=`total|${situation||'any'}|${band}`;
  const entry=c[key];
  if(!entry||entry.n<8)return raw;
  const hitRate=entry.hits/entry.n;
  const k=Math.min(1,(entry.n-8)/20);
  return raw*(1-k)+hitRate*k;
}
function nflSpreadCalibAdj(raw,situation){
  const c=getNFLCalib();
  const band=nflBandOf(raw);
  const key=`spread|${situation||'any'}|${band}`;
  const entry=c[key];
  if(!entry||entry.n<8)return raw;
  const hitRate=entry.hits/entry.n;
  const k=Math.min(1,(entry.n-8)/20);
  return raw*(1-k)+hitRate*k;
}

// Grade NFL results and update calibration
// ── NFL Snapshot — populates arc[week].rows/finals so gradeNFLResults has
// something to grade against. Without this, d4.nflarc stays permanently
// empty forever and no NFL record/calibration data is ever produced.
/* ── FOOTBALL SNAPSHOT + GRADING (NFL & CFB, one implementation) ────────────
   The old rows stored the BOOK's favorite for spread/ML and "over" for every
   total, then graded those — so the NFL/CFB record and calibration measured
   whether favorites and overs hit, not whether the sim was right. Rows now
   (v:2) carry the MODEL's pick per market with its probability. While a game
   is pregame the pick refreshes on every snapshot (so a line uploaded Friday
   still counts); it locks at kickoff. Legacy rows are kept but not counted. */
function fbModelPicks(s,lines){
  if(!s)return null;
  const P={};
  const aS=lines.find(x=>x.market==='spread'&&x.side==='away'),hS=lines.find(x=>x.market==='spread'&&x.side==='home');
  if((aS&&aS.line!=null)||(hS&&hS.line!=null)){
    const aL=aS&&aS.line!=null?+aS.line:-(+hS.line), hL=hS&&hS.line!=null?+hS.line:-aL;
    const pA=s.awayCover?s.awayCover(aL):null, pH=s.homeCover?s.homeCover(hL):null;
    if(pA!=null&&pH!=null){const home=pH>=pA;
      P.spread={side:home?'home':'away',line:home?hL:aL,p:+(home?pH:pA).toFixed(3),price:(home?hS:aS)&&(home?hS:aS).price||null};}
  }
  const tO=lines.find(x=>x.market==='total'&&x.side==='over')||lines.find(x=>x.market==='total');
  if(tO&&tO.line!=null&&typeof s.over==='function'){
    const pO=s.over(+tO.line),over=pO>=0.5;
    const tSide=lines.find(x=>x.market==='total'&&x.side===(over?'over':'under'));
    P.total={side:over?'over':'under',line:+tO.line,p:+(over?pO:1-pO).toFixed(3),price:tSide&&tSide.price||null};
  }
  if(lines.some(x=>x.market==='moneyline')&&s.hw!=null){
    const home=s.hw>=s.aw,m=lines.find(x=>x.market==='moneyline'&&x.side===(home?'home':'away'));
    P.ml={side:home?'home':'away',p:+(home?s.hw:s.aw).toFixed(3),price:m&&m.price||null};
  }
  return Object.keys(P).length?P:null;
}
function fbSnapshot(sport){
  const nfl=sport==='nfl',games=nfl?NFL_GAMES:NCAAF_GAMES;
  if(!games||!games.length)return;
  const key=nfl?LS.nflarc:'d4.ncaafarc',sims=nfl?NFL_SIMS:NCAAF_SIMS;
  const linesFor=nfl?nflBookLinesFor:ncaafBookLinesFor;
  const wk='w'+((nfl?NFL_SEASON:NCAAF_SEASON)||'')+'-'+((nfl?NFL_WEEK:NCAAF_WEEK)||'');
  const arc=get(key,{});const A=arc[wk]||(arc[wk]={rows:[],finals:{},ts:Date.now()});
  const isFinal=g=>g.abstract==='post'||(!g.abstract&&/^final/i.test(g.status||''));
  const isPre=g=>(g.abstract||'pre')==='pre';
  games.forEach(g=>{
    const gameKey=g.away.abbr+'@'+g.home.abbr;
    let row=A.rows.find(r=>r.id===g.id);
    if(!row){row={id:g.id,game:gameKey,v:2,graded:false};A.rows.push(row);}
    if(row.v===2&&isPre(g)&&!row.graded){
      const picks=fbModelPicks(sims[g.id],linesFor(gameKey));
      const sm=sims[g.id];
      if(sm){row.projTotal=sm.med;row.projWinner=sm.hw>=sm.aw?'home':'away';}
      try{const J=brainJudge(g,sm,sport);if(J)row.judge=brainLockable(J);}catch(e){}
      if(nfl){try{const MP=nflModelProps(g,sm);if(MP.length)row.props=MP.map(x=>{const mid=x.ladder[Math.floor(x.ladder.length/2)]||x.ladder[0];
        return{pid:x.pid,name:x.name,k:x.k,proj:x.proj,line:x.book?x.book.line:mid&&mid.line,p:x.book?x.book.p:mid&&mid.p,book:!!x.book};});}catch(e){}}
      if(picks){row.picks=picks;row.pickedAt=Date.now();
        row.situation=nfl&&typeof nflIsDivisionGame==='function'&&nflIsDivisionGame(g)?'division':'nondivision';}
    }
    if(isFinal(g)&&g.awayScore!=null&&g.homeScore!=null&&!A.finals[g.id])A.finals[g.id]={a:+g.awayScore,h:+g.homeScore};
  });
  set(key,arc);
}
function fbGrade(sport){
  const nfl=sport==='nfl',key=nfl?LS.nflarc:'d4.ncaafarc';
  const arc=get(key,{});const calib=getNFLCalib();let changed=false;
  const band=p=>typeof nflBandOf==='function'?nflBandOf(p):(Math.floor(p*10)*10)+'-'+(Math.floor(p*10)*10+10);
  Object.values(arc).forEach(A=>{
    if(!A||!A.rows||!A.finals)return;
    A.rows.forEach(r=>{
      if(r.graded||r.v!==2)return;
      const F=A.finals[r.id];if(!F||F.a==null||F.h==null)return;
      const P=r.picks||{};r.res={};
      const out=(m,x)=>x>0?'W':x<0?'L':'P';
      if(P.spread){const mg=P.spread.side==='home'?F.h-F.a:F.a-F.h;r.res.spread=out('spread',mg+P.spread.line);}
      if(P.total){const t=F.a+F.h;r.res.total=out('total',P.total.side==='over'?t-P.total.line:P.total.line-t);}
      if(P.ml){r.res.ml=F.h===F.a?'P':((P.ml.side==='home')===(F.h>F.a)?'W':'L');}
      Object.entries(r.res).forEach(([m,res])=>{
        if(res==='P')return;
        const mk=m==='ml'?'side':m;
        const ck=(nfl?'':'cfb-')+mk+'|'+(nfl?(r.situation||'any'):'any')+'|'+band(P[m].p);
        (calib[ck]||(calib[ck]={n:0,hits:0})).n++;if(res==='W')calib[ck].hits++;
      });
      r.graded=true;changed=true;
    });
  });
  if(changed){set(NFL_CALIB_KEY,calib);set(key,arc);}
  try{brainLearn(sport)}catch(e){console.warn('brain learn',e)}
  if(!fbGrade._box)fbGrade._box={};
  if(!fbGrade._box[sport]){fbGrade._box[sport]=1;setTimeout(()=>{brainCollectBoxes(sport).catch(()=>{}).finally(()=>{fbGrade._box[sport]=0})},4000);}
}
function snapshotNFL(){fbSnapshot('nfl')}

// ── CFB Snapshot — same pattern as NFL, populates d4.ncaafarc
function snapshotNCAAF(){fbSnapshot('ncaaf')}

// ── CFB Grading — mirrors gradeNFLResults exactly, writes to d4.nflcalib
// (shared calibration bucket, keyed by market so it doesn't collide with NFL rows)
function gradeNCAAFResults(){fbGrade('ncaaf')}

function gradeNFLResults(){fbGrade('nfl')}

// ── NFL Live Odds (The Odds API — free tier 500 req/month) ───────────────────
// Augments uploaded txt odds with live market data when key is available.
// Uses same LS.oddspapi key as MLB to avoid requiring a second key.
async function fetchNFLLiveOdds(){
  const key=theOddsApiKey();
  if(!key)return;
  try{
    const url=`https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${key}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
    const r=await fetch(url);
    const j=await r.json();
    if(!Array.isArray(j))return;
    const d=today();
    const all=get(LS.nflshots,{});
    all[d]=all[d]||[];
    j.forEach(game=>{
      const home=(game.home_team||'').toUpperCase();
      const away=(game.away_team||'').toUpperCase();
      // map full team names to abbreviations
      const homeAb=nflTeamNameToAbbr(home);
      const awayAb=nflTeamNameToAbbr(away);
      if(!homeAb||!awayAb)return;
      const gameKey=awayAb+'@'+homeAb;
      const gm=NFL_GAMES.find(g=>g.away.abbr===awayAb&&g.home.abbr===homeAb);
      const gid=gm?gm.id:null;
      // use DraftKings or FanDuel as primary book, fall back to first available
      const book=game.bookmakers.find(b=>b.key==='draftkings')||
                 game.bookmakers.find(b=>b.key==='fanduel')||
                 game.bookmakers[0];
      if(!book)return;
      book.markets.forEach(mkt=>{
        if(mkt.key==='h2h'){
          mkt.outcomes.forEach(o=>{
            const teamAb=nflTeamNameToAbbr((o.name||'').toUpperCase());
            const side=teamAb===awayAb?'away':'home';
            const rec={away:awayAb,home:homeAb,game:gameKey,market:'moneyline',
              side,line:null,price:o.price,gid,capturedAt:Date.now(),src:'live'};
            const k=[rec.game,rec.market,rec.side,rec.line].join('|');
            const i=all[d].findIndex(x=>[x.game,x.market,x.side,x.line].join('|')===k);
            if(i>=0)all[d][i]=rec;else all[d].push(rec);
          });
        }
        if(mkt.key==='spreads'){
          mkt.outcomes.forEach(o=>{
            const teamAb=nflTeamNameToAbbr((o.name||'').toUpperCase());
            const side=teamAb===awayAb?'away':'home';
            const rec={away:awayAb,home:homeAb,game:gameKey,market:'spread',
              side,line:o.point,price:o.price,gid,capturedAt:Date.now(),src:'live'};
            const k=[rec.game,rec.market,rec.side,rec.line].join('|');
            const i=all[d].findIndex(x=>[x.game,x.market,x.side,x.line].join('|')===k);
            if(i>=0)all[d][i]=rec;else all[d].push(rec);
          });
        }
        if(mkt.key==='totals'){
          mkt.outcomes.forEach(o=>{
            const side=o.name.toLowerCase()==='over'?'over':'under';
            const rec={away:awayAb,home:homeAb,game:gameKey,market:'total',
              side,line:o.point,price:o.price,gid,capturedAt:Date.now(),src:'live'};
            const k=[rec.game,rec.market,rec.side,rec.line].join('|');
            const i=all[d].findIndex(x=>[x.game,x.market,x.side,x.line].join('|')===k);
            if(i>=0)all[d][i]=rec;else all[d].push(rec);
          });
        }
      });
    });
    set(LS.nflshots,all);
    NFL_SIMS={};
    if(ACTIVE_SPORT==='nfl')renderNFL();
    console.log('NFL live odds loaded from The Odds API');
  }catch(e){console.warn('NFL live odds failed:',e.message);}
}

// Full team name → abbreviation map for Odds API
function nflTeamNameToAbbr(name){
  const MAP={
    'ARIZONA CARDINALS':'ARI','ATLANTA FALCONS':'ATL','BALTIMORE RAVENS':'BAL',
    'BUFFALO BILLS':'BUF','CAROLINA PANTHERS':'CAR','CHICAGO BEARS':'CHI',
    'CINCINNATI BENGALS':'CIN','CLEVELAND BROWNS':'CLE','DALLAS COWBOYS':'DAL',
    'DENVER BRONCOS':'DEN','DETROIT LIONS':'DET','GREEN BAY PACKERS':'GB',
    'HOUSTON TEXANS':'HOU','INDIANAPOLIS COLTS':'IND','JACKSONVILLE JAGUARS':'JAX',
    'KANSAS CITY CHIEFS':'KC','LOS ANGELES CHARGERS':'LAC','LOS ANGELES RAMS':'LAR',
    'LAS VEGAS RAIDERS':'LV','MIAMI DOLPHINS':'MIA','MINNESOTA VIKINGS':'MIN',
    'NEW ENGLAND PATRIOTS':'NE','NEW ORLEANS SAINTS':'NO','NEW YORK GIANTS':'NYG',
    'NEW YORK JETS':'NYJ','PHILADELPHIA EAGLES':'PHI','PITTSBURGH STEELERS':'PIT',
    'SEATTLE SEAHAWKS':'SEA','SAN FRANCISCO 49ERS':'SF','TAMPA BAY BUCCANEERS':'TB',
    'TENNESSEE TITANS':'TEN','WASHINGTON COMMANDERS':'WSH',
  };
  return MAP[name.toUpperCase()]||null;
}

// ── NFL A-G Evaluation ────────────────────────────────────────────────────────
// Full 7-section evaluation mirroring MLB master evaluation.
// Sections: A) My line  B) Outside projection range  C) Market comparison
//           D) My picks  E) Props  F) Prop vs market  G) Confidence
function evaluateNFLGame(g){
  const s=NFL_SIMS[g.id];
  if(!s)return null;
  const gameKey=g.away.abbr+'@'+g.home.abbr;
  const lines=nflBookLinesFor(gameKey);
  const awaySpread=lines.find(x=>x.market==='spread'&&x.side==='away');
  const homeSpread=lines.find(x=>x.market==='spread'&&x.side==='home');
  const awayML=lines.find(x=>x.market==='moneyline'&&x.side==='away');
  const homeML=lines.find(x=>x.market==='moneyline'&&x.side==='home');
  const totalOver=lines.find(x=>x.market==='total'&&x.side==='over');
  const ext=nflExtFor(gameKey);
  const trends=nflTrendsFor(gameKey);
  const cons=nflConsensusFor(gameKey);

  const awayPow=NFL_POWER[g.away.abbr];
  const homePow=NFL_POWER[g.home.abbr];

  // A) My projected line
  const mySpread=Math.round(s.medMargin*10)/10;  // positive = home favored
  const myTotal=s.med;
  const myAwayWinP=s.aw;
  const myHomeWinP=s.hw;
  const myAwayML=nflFairML(myAwayWinP);
  const myHomeML=nflFairML(myHomeWinP);

  // B) Outside projections (from uploaded Covers/OddsShark data)
  const outsidePicks=ext.filter(x=>x.market==='moneyline'||x.market==='spread');
  const outsideML=ext.filter(x=>x.market==='moneyline');
  const outsideAgreesHome=outsideML.filter(x=>x.side==='home').length;
  const outsideAgreesAway=outsideML.filter(x=>x.side==='away').length;

  // C) Market edge
  let spreadEdge=null,mlEdge=null,totalEdge=null;
  if(awaySpread){
    const myCover=s.awayCover(awaySpread.line);  // P(away covers away spread)
    const marketP=100/(100+Math.abs(awaySpread.price))*(awaySpread.price<0?1:-1)+0.5;
    spreadEdge={market:awaySpread.price,fair:nflFairML(myCover),edge:awaySpread.price-nflFairML(myCover)};
  }
  if(awayML){
    mlEdge={market:awayML.price,fair:myAwayML,edge:awayML.price-myAwayML};
  }
  if(totalOver){
    const myOverP=s.over(totalOver.line);
    totalEdge={line:totalOver.line,myOverP,market:totalOver.price,fair:nflFairML(myOverP),edge:totalOver.price-nflFairML(myOverP)};
  }

  // D) Pick recommendations — side + total
  const sideEdgeThresh=4;  // minimum edge in American odds points to flag
  const sidePick=spreadEdge&&Math.abs(spreadEdge.edge)>=sideEdgeThresh?
    (spreadEdge.edge>0?`${g.away.abbr} ${awaySpread?awaySpread.line:mySpread>0?'+'+mySpread:mySpread}`
                      :`${g.home.abbr} ${homeSpread?homeSpread.line:mySpread>0?'-'+mySpread:'+'+Math.abs(mySpread)}`)
    :(myAwayWinP>0.55?`${g.away.abbr} ML`:myHomeWinP>0.55?`${g.home.abbr} ML`:null);

  const totalPick=totalEdge&&Math.abs(totalEdge.edge)>=sideEdgeThresh?
    (totalEdge.edge>0?`Under ${totalOver.line}`:`Over ${totalOver.line}`)
    :(myOverP=>(myOverP>0.55?`Over ${myTotal}`:myOverP<0.45?`Under ${myTotal}`:null))(s.over(myTotal));

  // G) Confidence — composite score 0-100
  const signals=[];
  if(spreadEdge&&Math.abs(spreadEdge.edge)>=sideEdgeThresh)signals.push({w:3,v:Math.min(1,Math.abs(spreadEdge.edge)/20)});
  if(mlEdge&&Math.abs(mlEdge.edge)>=sideEdgeThresh)signals.push({w:2,v:Math.min(1,Math.abs(mlEdge.edge)/20)});
  if(totalEdge&&Math.abs(totalEdge.edge)>=sideEdgeThresh)signals.push({w:2,v:Math.min(1,Math.abs(totalEdge.edge)/20)});
  if(outsidePicks.length>=2)signals.push({w:1,v:0.7});
  if(trends.length>=3)signals.push({w:1,v:0.6});
  const consML=cons.find(x=>x.market==='moneyline');
  if(consML){const lean=Math.max(consML.awayPct||0,consML.homePct||0)/100;signals.push({w:1,v:lean>0.7?0.9:0.5});}
  if(nflIsDivisionGame(g))signals.push({w:1,v:0.3});  // div games are tighter
  const totalW=signals.reduce((a,x)=>a+x.w,0)||1;
  const confidence=Math.round(signals.reduce((a,x)=>a+x.w*x.v,0)/totalW*100);

  // Overall verdict
  const edgeCount=[spreadEdge,mlEdge,totalEdge].filter(e=>e&&Math.abs(e.edge)>=sideEdgeThresh).length;
  const verdict=edgeCount>=2&&outsideAgreesHome+outsideAgreesAway>=1?'strong':
                edgeCount>=1?'lean':'split';

  const allEdges=[
    spreadEdge&&{side:g.away.abbr+(awaySpread?' '+(awaySpread.line>0?'+':'')+awaySpread.line:' spread'),edge:spreadEdge.edge||0},
    mlEdge&&{side:g.away.abbr+' ML',edge:mlEdge.edge||0},
    totalEdge&&{side:'Over '+totalOver.line,edge:totalEdge.edge||0}
  ].filter(Boolean);
  const topEdge=allEdges.sort((a,b)=>b.edge-a.edge)[0]||null;
  const bestEdgeStr=topEdge?((topEdge.edge>=0?'+':'')+topEdge.edge.toFixed(1)+'% EV'):'—';
  return{g,s,gameKey,verdict,confidence,
    mySpread,myTotal,myAwayWinP,myHomeWinP,myAwayML,myHomeML,
    spreadEdge,mlEdge,totalEdge,
    sidePick,totalPick,
    outsidePicks,trends,cons,
    awayPow,homePow,
    topEdge,bestEdgeStr,
  };
}

// ── NFL Master Evaluation ─────────────────────────────────────────────────────
function nflMasterEvaluation(){
  // Include all games — during preseason all may be Final, still useful for review
  const games=NFL_GAMES.length?NFL_GAMES:[];
  return games
    .map(g=>{
      if(!NFL_SIMS[g.id])NFL_SIMS[g.id]=simNFLGame(g);
      return evaluateNFLGame(g);
    })
    .filter(Boolean)
    .sort((a,b)=>{
      const rank={strong:0,lean:1,split:2};
      return (rank[a.verdict]||2)-(rank[b.verdict]||2)||b.confidence-a.confidence;
    });
}

function renderNFLMasterEval(){
  const evals=nflMasterEvaluation();
  if(!evals.length)return'<div class="empty">No upcoming NFL games to evaluate.</div>';

  const rows=evals.map(ev=>{
    const{g,s,verdict,confidence,mySpread,myTotal,myAwayML,myHomeML,
      spreadEdge,mlEdge,totalEdge,sidePick,totalPick,trends,cons,awayPow,homePow}=ev;

    const verdictColor=verdict==='strong'?'var(--win)':verdict==='lean'?'var(--gold)':'var(--mute)';
    const verdictLabel=verdict==='strong'?'STRONG':verdict==='lean'?'LEAN':'SPLIT';

    const awayRecord=awayPow?`${awayPow.wins}-${awayPow.losses}`:'';
    const homeRecord=homePow?`${homePow.wins}-${homePow.losses}`:'';

    const edgeRow=e=>e?`<span style="color:${Math.abs(e.edge)>=6?'var(--win)':Math.abs(e.edge)>=3?'var(--gold)':'var(--mute)'}">
      ${e.edge>0?'+':''}${e.edge} edge</span>`:'<span style="color:var(--mute)">no line</span>';

    const consML=cons.find(x=>x.market==='moneyline');
    const consTot=cons.find(x=>x.market==='total');

    return`<div class="tkt" style="border-left:3px solid ${verdictColor}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:4px">
        <div>
          <h3 style="margin:0">🏈 ${g.away.abbr} @ ${g.home.abbr}</h3>
          <div class="sub" style="margin-top:2px">${g.day||''} ${g.time||''} · Week ${g.week||'?'}</div>
          ${awayRecord||homeRecord?`<div class="sub">${g.away.abbr} ${awayRecord} · ${g.home.abbr} ${homeRecord}</div>`:''}
        </div>
        <div style="text-align:right">
          <div style="font-family:'IBM Plex Mono';font-size:10px;text-transform:uppercase;
            color:${verdictColor};font-weight:700">${verdictLabel}</div>
          <div style="font-size:18px;font-weight:700;color:${verdictColor}">${confidence}%</div>
          <div class="sub">confidence</div>
        </div>
      </div>

      <!-- A) My Line -->
      <div class="mktlab" style="margin-top:10px">A · My Projection</div>
      <div class="sub">
        ${g.away.abbr} ${s.awayProj} – ${g.home.abbr} ${s.homeProj} · Total ${myTotal}
        · Spread ${mySpread>0?g.home.abbr+' -'+mySpread:mySpread<0?g.away.abbr+' -'+Math.abs(mySpread):'Pick\'em'}
        · ML ${g.away.abbr} ${myAwayML>0?'+':''}${myAwayML} / ${g.home.abbr} ${myHomeML>0?'+':''}${myHomeML}
      </div>
      <div class="sub" style="color:var(--mute)">
        Mode: ${s.modeScore||'?'} (${((s.modeScorePct||0)*100).toFixed(1)}%) ·
        Range: ${s.p10}–${s.p90}
      </div>

      <!-- B) Power ratings -->
      ${awayPow||homePow?`<div class="mktlab" style="margin-top:8px">B · Team Strength</div>
      <div class="sub">
        ${awayPow?`${g.away.abbr}: ${awayPow.offPPG.toFixed(1)} off / ${awayPow.defPPG.toFixed(1)} def allowed`:''}
        ${awayPow&&homePow?' · ':''}
        ${homePow?`${g.home.abbr}: ${homePow.offPPG.toFixed(1)} off / ${homePow.defPPG.toFixed(1)} def allowed`:''}
      </div>`:''}

      <!-- C) Market edge -->
      <div class="mktlab" style="margin-top:8px">C · Market Edge</div>
      <div class="sub">
        Spread: ${edgeRow(spreadEdge)} ·
        ML: ${edgeRow(mlEdge)} ·
        Total: ${edgeRow(totalEdge)}
      </div>

      <!-- D) Picks -->
      <div class="mktlab" style="margin-top:8px">D · My Picks</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
        ${sidePick?`<span style="background:var(--panel2);border:1px solid var(--cold);
          border-radius:6px;padding:4px 10px;font-family:'IBM Plex Mono';font-size:12px;color:var(--cold)">
          ${sidePick}</span>`:'<span class="sub">No strong side edge</span>'}
        ${totalPick?`<span style="background:var(--panel2);border:1px solid var(--gold);
          border-radius:6px;padding:4px 10px;font-family:'IBM Plex Mono';font-size:12px;color:var(--gold)">
          ${totalPick}</span>`:'<span class="sub">No strong total edge</span>'}
      </div>

      <!-- E) Consensus -->
      ${consML?`<div class="mktlab" style="margin-top:8px">E · Public Consensus</div>
      <div class="sub">
        ${g.away.abbr} ${consML.awayPct||'?'}% / ${g.home.abbr} ${consML.homePct||'?'}%
        ${consTot?` · Total: ${consTot.overPct||'?'}% O / ${consTot.underPct||'?'}% U (line ${consTot.line||'?'})`:''}
      </div>`:''}

      <!-- F) Trends -->
      ${trends.length?`<div class="mktlab" style="margin-top:8px">F · Trends (${trends.length})</div>
      ${trends.slice(0,4).map(t=>`<div class="sub" style="margin-top:2px">
        · ${t.team?'<b>'+t.team+'</b>: ':''}${t.text}</div>`).join('')}
      ${trends.length>4?`<div class="sub" style="color:var(--mute)">+${trends.length-4} more</div>`:''}
      `:''}

      <!-- G) Situation -->
      <div class="mktlab" style="margin-top:8px">G · Situation</div>
      <div class="sub">
        ${nflIsDivisionGame(g)?'🏆 Division game · ':''}
        ${nflIsConferenceGame(g)?'🏟 Conference game · ':''}
        Week ${g.week||'?'}${g.seasonType===1?' · Preseason':''}
      </div>
    </div>`;
  });

  const strong=evals.filter(e=>e.verdict==='strong').length;
  const lean=evals.filter(e=>e.verdict==='lean').length;
  return`<div class="tkt hi" style="margin-bottom:10px">
    <h3>🏈 NFL Master Evaluation — Week ${NFL_WEEK||'?'}</h3>
    <div class="sub">${evals.length} games evaluated · ${strong} strong · ${lean} lean</div>
    <div class="sub" style="color:var(--mute)">Power ratings: ${Object.keys(NFL_POWER).length?'loaded ✓':'not loaded — hit "Load current week" first'}</div>
  </div>${rows.join('')}`;
}

// ── NFL Trend panel for game cards ───────────────────────────────────────────
function nflTrendPanel(g,s){
  const gameKey=g.away.abbr+'@'+g.home.abbr;
  const trends=nflTrendsFor(gameKey);
  const rows=[];
  const mySpread=s?s.medMargin:0;
  const myTotalLean=s?(s.over(s.med)>0.52?'over':s.over(s.med)<0.48?'under':'neutral'):'neutral';
  const mySide=s?(s.hw>0.5?g.home.abbr:g.away.abbr):'';

  function add(name,text,implies,relevant){
    let cls='neutral',verdict='Neutral signal';
    if(implies&&relevant){
      if(implies===relevant){cls='agree';verdict='Backs model lean';}
      else{cls='conflict';verdict='Contests model lean';}
    }
    rows.push({name,text,cls,verdict});
  }

  // Power ratings signal
  const awayPow=NFL_POWER[g.away.abbr];
  const homePow=NFL_POWER[g.home.abbr];
  if(awayPow&&homePow){
    const netOff=(awayPow.offPPG-homePow.defPPG)-(homePow.offPPG-awayPow.defPPG);
    if(Math.abs(netOff)>=4){
      const favTeam=netOff>0?g.away.abbr:g.home.abbr;
      add('Power ratings edge',
        `${favTeam} has a net scoring edge of <b>${Math.abs(netOff).toFixed(1)} PPG</b> in this matchup`,
        favTeam===g.away.abbr?g.away.abbr:g.home.abbr,mySide);
    }
  }

  // Division game signal
  if(nflIsDivisionGame(g)){
    add('Division game',
      'Division games historically tighter — totals trend under vs non-div matchups',
      'under',myTotalLean);
  }

  // Home field
  add('Home field',
    `${g.home.abbr} gets standard +${NFL_HFA} point home field advantage in projection`,
    g.home.abbr,mySide);

  // Records
  if(awayPow&&homePow){
    const awayWPct=awayPow.wins/(awayPow.wins+awayPow.losses||1);
    const homeWPct=homePow.wins/(homePow.wins+homePow.losses||1);
    if(Math.abs(awayWPct-homeWPct)>=0.2){
      const better=awayWPct>homeWPct?g.away.abbr:g.home.abbr;
      add('Record mismatch',
        `${better} has a significantly better record — ${g.away.abbr} ${awayPow.wins}-${awayPow.losses} vs ${g.home.abbr} ${homePow.wins}-${homePow.losses}`,
        better,mySide);
    }
  }

  // Uploaded trends from Covers
  trends.forEach(t=>{
    const isOver=/^over/i.test(t.text);
    const isUnder=/^under/i.test(t.text);
    let implies=null,relevant=null;
    if(isOver){implies='over';relevant=myTotalLean;}
    else if(isUnder){implies='under';relevant=myTotalLean;}
    else if(t.team){implies=t.team;relevant=mySide;}
    add(`${t.src||'Covers'} trend${t.team?' · '+t.team:''}`,t.text,implies,relevant);
  });

  if(!rows.length)return'<div class="empty">No trend data. Upload slate_trends.txt on the Outside tab.</div>';

  const agree=rows.filter(r=>r.cls==='agree').length;
  const conflict=rows.filter(r=>r.cls==='conflict').length;
  return`<div class="tkt hi" style="margin-bottom:8px">
    <h3>${agree} backing · ${conflict} contesting · ${rows.length} total signals</h3>
    <div class="sub">Model leans <b>${myTotalLean.toUpperCase()} ${s?s.med:'?'}</b> and <b>${mySide||'?'}</b>.</div>
  </div>
  ${rows.map(r=>`<div class="trow ${r.cls}"><div class="tdot"></div><div class="tbody">
    <div class="tname">${r.name}</div><div class="ttext">${r.text}</div>
    <div class="tverdict">${r.verdict}</div></div></div>`).join('')}`;
}

// ── Wire NFL eval into Tickets → Eval tab ────────────────────────────────────
// Override renderMasterEval to return NFL version when active sport is NFL
// renderMasterEval routes to MLB or NFL based on active sport
// NOTE: do NOT redefine renderMasterEval here — it already exists at line 6721.
// Instead the renderTickets dispatch checks ACTIVE_SPORT directly.

// ── Refresh NFL when switching to NFL tab ────────────────────────────────────
// Auto-fetch power ratings + live odds on first NFL load
let _nflDataLoaded=false;
function nflOnActivate(){
  if(_nflDataLoaded)return;
  _nflDataLoaded=true;
  if(window.__PAGE_SPORT__==='nfl'){
    fetchNFLPowerRatings();
    fetchNFLLiveOdds();
  }
}

// ── Updated NFL game card with trend panel ───────────────────────────────────
// Add A-G and Trends tabs to NFL cards (mirrors MLB card structure)
function nflCardFull(g){
  const s=NFL_SIMS[g.id];
  if(!s)return'';
  const isLive=g.abstract==='in'||g.abstract==='live'||g.status==='InProgress'||g.status==='Halftime';
  const isFinal=g.abstract==='post'||g.status==='Final';
  const gameKey=g.away.abbr+'@'+g.home.abbr;
  const lines=nflBookLinesFor(gameKey);
  const hasReal=lines.length>0;

  const awaySpread=lines.find(x=>x.market==='spread'&&x.side==='away');
  const homeSpread=lines.find(x=>x.market==='spread'&&x.side==='home');
  const awayML=lines.find(x=>x.market==='moneyline'&&x.side==='away');
  const homeML=lines.find(x=>x.market==='moneyline'&&x.side==='home');
  const totalOver=lines.find(x=>x.market==='total'&&x.side==='over');
  const totalUnder=lines.find(x=>x.market==='total'&&x.side==='under');
  const h1Over=lines.find(x=>x.market==='h1total'&&x.side==='over');
  const h1Under=lines.find(x=>x.market==='h1total'&&x.side==='under');
  const h1AwaySpread=lines.find(x=>x.market==='h1spread'&&x.side==='away');
  const h1HomeSpread=lines.find(x=>x.market==='h1spread'&&x.side==='home');
  const propLines=lines.filter(x=>x.market==='prop');
  const nflProps=buildNFLProps(g,s);

  const awayPow=NFL_POWER[g.away.abbr];
  const homePow=NFL_POWER[g.home.abbr];
  const ext=nflExtFor(gameKey);
  const cons=nflConsensusFor(gameKey);
  const consML=cons.find(x=>x.market==='moneyline');

  const ap=isNaN(s.awayProj)?22:s.awayProj;
  const hp=isNaN(s.homeProj)?22:s.homeProj;
  const med=isNaN(s.med)?44:s.med;
  const margin=isNaN(s.medMargin)?0:s.medMargin;
  const awayFairML=nflFairML(Math.max(.05,Math.min(.95,s.aw||.5)));
  const homeFairML=nflFairML(Math.max(.05,Math.min(.95,s.hw||.5)));

  /* Every side is now priced against ITS OWN simulated probability.
     Previously only the away/over side was computed and the opposite square
     was shown as the negated mirror of it — which is why Over and Under both
     displayed the same magnitude with flipped signs. Two sides of a real
     market are not mirror images: they have different prices and the book's
     vig sits between them, so both can be negative EV at once. That is the
     normal case, and the board should be able to say so. */
  const clampP=p=>Math.max(.02,Math.min(.98,(p==null||isNaN(p))?.5:p));
  // sim handicap chips — same convention as the MLB card: win% for sides,
  // projected total for totals, signed spread for the spread squares
  const simAwPct=Math.round(s.aw*100)+'%', simHmPct=Math.round(s.hw*100)+'%';
  const simTotVal=(s.mean||s.med).toFixed(1);
  const simMargin=(s.homeProj-s.awayProj);
  const simHomeSpread=(simMargin>=0?'-':'+')+Math.abs(simMargin).toFixed(1);
  const simAwaySpread=(simMargin>=0?'+':'-')+Math.abs(simMargin).toFixed(1);
  const mk=(p,price)=>{
    if(price==null)return null;
    const P=clampP(p);
    return{p:P,price,fair:nflFairML(P),ev:evPct(P,price),impl:amerToProb(price)};
  };
  const eAwaySpread = awaySpread ? mk(s.awayCover(awaySpread.line), awaySpread.price) : null;
  const eHomeSpread = homeSpread ? mk(s.homeCover(homeSpread.line), homeSpread.price) : null;
  const eAwayML     = awayML     ? mk(s.aw, awayML.price) : null;
  const eHomeML     = homeML     ? mk(s.hw, homeML.price) : null;
  const eOver       = totalOver  ? mk(s.over(totalOver.line), totalOver.price) : null;
  const eUnder      = totalUnder ? mk(1-s.over(totalUnder.line), totalUnder.price) : null;

  const awayRecord=awayPow?` ${awayPow.wins}-${awayPow.losses}`:'';
  const homeRecord=homePow?` ${homePow.wins}-${homePow.losses}`:'';
  const divGame=nflIsDivisionGame(g);

  /* NFL squares now emit the same DOM and classes as the MLB card's b() square,
     so both boards read identically: label, sim chip, book price, market %,
     model %/fair line, and the value/avoid colouring. The previous NFL-only
     markup used classes that don't exist in the stylesheet, which is why the
     football cards rendered as flat text instead of tiles.

     Edge colouring uses the probability gap (model % minus market %) exactly
     like MLB, via the same EDGE_MIN threshold. EV% is kept as an extra line
     because it is the number that actually decides whether a price is worth
     taking — MLB gets it too now. */
  function nflSq(label,pick,e,simVal){
    /* Was: show "sim only" when no book price uploaded.
       MLB b() falls back to a vig price from the sim probability — football now
       does the same so the tile always renders a number instead of a placeholder.
       The tile is still visually distinct (no value/avoid colouring, no "REAL"
       badge, model%/fair line says "sim only" in muted text) so you know there
       is no real line behind it, but the card is readable. */
    if(!e){
      const sp=typeof simVal==='string'?simVal:(simVal!=null?(simVal*100).toFixed(0)+'%':'—');
      return`<div class="bet" role="button" tabindex="0">
        <div class="bl">${label}</div>
        <div class="bo" style="color:var(--mute)">${sp}</div>
        <div class="bs">sim only</div>
        <div class="bf" style="color:var(--mute)">no real line uploaded yet</div>
      </div>`;
    }
    const mp=e.p, kp=e.impl;
    const pct=Math.round(kp*100);
    const priceStr=(e.price>0?'+':'')+e.price;
    let cls='',badge='';
    const gap=(mp-kp)*100;
    if(gap>=EDGE_MIN){cls=' value';badge=`<span class="eb up">+${gap.toFixed(1)}</span>`}
    else if(gap<=-EDGE_MIN){cls=' avoid';badge=`<span class="eb dn">${gap.toFixed(1)}</span>`}
    const fair=`<div class="bf">model ${(mp*100).toFixed(0)}% · fair ${e.fair>0?'+':''}${e.fair}`
      +` · <span style="color:${e.ev>=2?'var(--win)':e.ev<0?'var(--rust)':'var(--mute)'}">`
      +`${e.ev>=0?'+':''}${e.ev.toFixed(1)}% EV</span></div>`;
    const simChip=simVal!==undefined?`<div class="sim-chip">sim ${simVal}</div>`:'';

    /* ═══ ALIGNMENT TIER — identical logic to the MLB square. Three independent
       reads are checked separately and then combined, so the colour answers
       "how many unrelated things point the same way here", not just one of them.
         1 BOOK LEAN     — the real price itself already implies >=58% on this side
         2 MODEL EDGE    — the sim disagrees with the market in this side's favour
         3 OUTSIDE       — uploaded sources picked this side, and how many agree
       SUPREME = all three (or two with unanimous outside), STRONG = any two,
       LEAN = one, CONFLICT = signals actively point opposite ways. */
    const bookLeans=typeof kp==='number'&&kp>=0.58;
    const modelEdgeHere=cls===' value';
    const modelAgainstHere=cls===' avoid';
    let srcCls='',srcBadge='',outsideAgrees=false,outsideUnanimous=false,outsideAgainst=false;
    const gameKeyHere=g.away.abbr+'@'+g.home.abbr;
    const extHere=nflExtFor(gameKeyHere);
    if(extHere.length){
      const sameMkt=extHere.filter(x=>nflMarketMatchesPick(x,pick));
      const onThis=sameMkt.filter(x=>nflPickMatchesSide(x,pick));
      if(onThis.length){
        const allSrcOnMkt=new Set(sameMkt.map(x=>x.src||'upload'));
        const allSrcOnThis=new Set(onThis.map(x=>x.src||'upload'));
        outsideUnanimous=allSrcOnMkt.size>=2&&allSrcOnThis.size===allSrcOnMkt.size;
        outsideAgrees=true;
        srcBadge=`<div class="src-tag${outsideUnanimous?' unanimous':''}">${outsideUnanimous?'★ unanimous':allSrcOnThis.size+' source'+(allSrcOnThis.size>1?'s':'')}</div>`;
      }else if(sameMkt.length){
        outsideAgainst=true;   // sources covered this market but took the other side
      }
    }
    const signalsFor=[bookLeans,modelEdgeHere,outsideAgrees].filter(Boolean).length;
    const hasConflict=(modelAgainstHere&&(bookLeans||outsideAgrees))||(outsideAgainst&&(bookLeans||modelEdgeHere));
    let tierCls='';
    if(hasConflict)tierCls=' conflict';
    else if(signalsFor>=3||(signalsFor>=2&&outsideUnanimous))tierCls=' supreme';
    else if(signalsFor>=2)tierCls=' strong';
    else if(signalsFor>=1)tierCls=' lean';
    if(outsideAgrees)srcCls=outsideUnanimous?' consensus-pick':' source-pick';
    const tierBadge=tierCls===' supreme'?`<div class="tier-tag supreme">◆ SUPREME</div>`
      :tierCls===' strong'?`<div class="tier-tag strong">STRONG</div>`
      :tierCls===' conflict'?`<div class="tier-tag conflict">⚠ CONFLICT</div>`:'';

    const id=g.id+'|'+pick;
    const on=(typeof SLIP!=='undefined'&&SLIP.some?SLIP.some(x=>x.id===id):false);
    return`<div class="bet${cls}${srcCls}${tierCls} ${on?'on':''}" role="button" tabindex="0"
      onclick="nflSlipToggle('${g.id}','${pick.replace(/'/g,"\\'")}',${e.price})">
      <div class="bl">${label}</div>${simChip}<div class="bo">${priceStr}</div>
      <div class="bs">${badge||pct+'%'}</div>${fair}${srcBadge}${tierBadge}</div>`;
  }
  const sgn=n=>n==null?'':(n>0?'+'+n:''+n);

  const realBadge=hasReal?`<span style="font-family:'IBM Plex Mono';font-size:8px;color:var(--cold);
    border:1px solid var(--cold);border-radius:3px;padding:1px 4px;margin-left:6px">REAL</span>`:'';

  const spreadLabel=margin>0?`${g.home.abbr} -${margin}`:margin<0?`${g.away.abbr} -${Math.abs(margin)}`:"Pick'em";
  const id=g.id;

  return`<div class="tkt" id="nfl-card-${id}" style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
      <div>
        <div style="font-size:18px;font-weight:800;color:var(--chalk)">${g.away.abbr} <span style="color:var(--mute);font-size:14px">@</span> ${g.home.abbr}</div>
        <div style="font-size:10px;color:var(--mute);font-family:'IBM Plex Mono'">${g.day||''} ${g.time||''}${divGame?' · <span style="color:var(--gold)">DIV</span>':''}</div>
      </div>
      <div style="text-align:right;font-family:'IBM Plex Mono';font-size:10px;color:var(--mute)">
        ${g.away.abbr}${awayRecord}<br>${g.home.abbr}${homeRecord}
      </div>
    </div>

    ${(g.abstract==='in')?fbLiveScoreBar(g,'nfl'):
      g.status==='Final'
      ?`<div class="proj"><div class="sc" style="color:var(--win)">${g.away.abbr} ${g.awayScore!=null&&g.awayScore!==''?g.awayScore:'?'} – ${g.homeScore!=null&&g.homeScore!==''?g.homeScore:'?'} ${g.home.abbr}</div>
         <div class="rd">final</div></div>`
      :NFL_POWER_FLAT
         ?`<div class="proj"><div class="sc" style="color:var(--mute)">${g.away.abbr} — – — ${g.home.abbr}</div><div class="rd" style="color:var(--rust)">ratings not loaded</div>${fbPredLine(g,'nfl',null,null)}${fbJudgeBlock(g,s,'nfl')}</div>`
         :`<div class="proj">
             <div class="sc">${g.away.abbr} ${ap} – ${hp} ${g.home.abbr}</div>
             <div class="rd">${Math.round(ap)}–${Math.round(hp)}</div>
             <div class="md">most common ${s.modeScore?s.modeScore.replace('-','–'):'—'} · ${(s.modeScorePct*100).toFixed(1)}%</div>
             ${fbPredLine(g,'nfl',ap,hp)}${fbJudgeBlock(g,s,'nfl')}
           </div>`}
    <div class="sig">
      <div class="sigchip">O/U <b>${NFL_POWER_FLAT?'—':med}</b> · ${spreadLabel}</div>
      ${(()=>{try{return teamRecordChip(g.away.abbr)+teamRecordChip(g.home.abbr)
        +frozenChip(g,s,'nfl')+takeFadeChip(g,s,'nfl')+systemFormChip('nfl')}catch(e){return''}})()}
      ${(()=>{try{
        if(NFL_POWER_FLAT)return'';
        const _lns=nflBookLinesFor(g.away.abbr+'@'+g.home.abbr);if(!_lns.length)return'';
        const _ev=evaluateNFLGame(g);if(!_ev||!_ev.topEdge)return'';
        const best=_ev.topEdge;
        if(Math.abs(best.edge)<2)return`<div class="sigchip">NO EDGE · BEST ${_ev.bestEdgeStr}</div>`;
        return`<div class="sigchip" style="color:var(--win);border-color:rgba(46,204,113,.45)">EDGE · ${best.side} · ${best.edge>=0?'+':''}${best.edge.toFixed(1)}% EV</div>`;
      }catch(e_){return''}})()}
      ${divGame?`<div class="sigchip" style="color:var(--gold)">DIVISION GAME</div>`:''}
      ${nflEnvChips(g).map(c=>`<div class="sigchip">${c}</div>`).join('')}
      ${awayPow&&!awayPow.unrated?`<div class="sigchip">${g.away.abbr} <b>${awayPow.wins}-${awayPow.losses}</b> · <b>${(awayPow.offPPG||0).toFixed(1)}</b> PF / <b>${(awayPow.defPPG||0).toFixed(1)}</b> PA</div>`:''}
      ${homePow&&!homePow.unrated?`<div class="sigchip">${g.home.abbr} <b>${homePow.wins}-${homePow.losses}</b> · <b>${(homePow.offPPG||0).toFixed(1)}</b> PF / <b>${(homePow.defPPG||0).toFixed(1)}</b> PA</div>`:''}
      ${NFL_POWER_FLAT?`<div class="sigchip" style="color:var(--rust);border-color:rgba(240,86,60,.4)">RATINGS NOT LOADED — tap Retry above</div>`:''}

    </div>
    ${(()=>{try{return coachHtml({game:g,sim:s,sport:'nfl'})}catch(e){return''}})()}

    <div class="mktlab">Spread${realBadge}</div>
    <div class="betgrid">
      ${nflSq(`${g.away.abbr} ${awaySpread?sgn(awaySpread.line):sgn(margin)}`,`${g.away.abbr} spread`,eAwaySpread,simAwaySpread)}
      ${nflSq(`${g.home.abbr} ${homeSpread?sgn(homeSpread.line):sgn(-margin)}`,`${g.home.abbr} spread`,eHomeSpread,simHomeSpread)}
    </div>

    <div class="mktlab" style="margin-top:8px">Moneyline${awayML||homeML?realBadge:''}</div>
    <div class="betgrid">
      ${nflSq(`${g.away.abbr}`,`${g.away.abbr} ML`,eAwayML,simAwPct)}
      ${nflSq(`${g.home.abbr}`,`${g.home.abbr} ML`,eHomeML,simHmPct)}
    </div>

    <div class="mktlab" style="margin-top:8px">Total${totalOver?realBadge:''}</div>
    <div class="betgrid">
      ${nflSq(`Over ${totalOver?totalOver.line:med}`,`Over ${totalOver?totalOver.line:med}`,eOver,simTotVal)}
      ${nflSq(`Under ${totalUnder?totalUnder.line:med}`,`Under ${totalUnder?totalUnder.line:med}`,eUnder,simTotVal)}
    </div>

    ${h1AwaySpread||h1Over?`
    <div class="mktlab" style="margin-top:8px">1st Half</div>
    <div class="betgrid">
      ${h1AwaySpread?nflSq(`${g.away.abbr} 1H ${sgn(h1AwaySpread.line)}`,`${g.away.abbr} 1H spread`,mk(s.awayCover(h1AwaySpread.line*2),h1AwaySpread.price)):''}
      ${h1HomeSpread?nflSq(`${g.home.abbr} 1H ${sgn(h1HomeSpread.line)}`,`${g.home.abbr} 1H spread`,mk(s.homeCover(h1HomeSpread.line*2),h1HomeSpread.price)):''}
    </div>
    ${h1Over?`<div class="betgrid" style="margin-top:4px">
      ${nflSq(`1H Over ${h1Over.line}`,`1H Over ${h1Over.line}`,mk(s.overH1(h1Over.line),h1Over.price),s.medH1)}
      ${h1Under?nflSq(`1H Under ${h1Under.line}`,`1H Under ${h1Under.line}`,mk(1-s.overH1(h1Under.line),h1Under.price),s.medH1):''}
    </div>`:''}
    `:''}

    ${nflProps.length?`<div class="mktlab" style="margin-top:8px">Props (${nflProps.length})</div>
    <div class="betgrid">
      ${nflProps.map(p=>nflSq(`${p.player} ${p.stat} ${p.line}+`,`${p.player} ${p.stat} ${p.line}+`,p.e,(p.simP*100).toFixed(0)+'%')).join('')}
    </div>`:''}

    ${consML?`<div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px">
      <span style="font-family:'IBM Plex Mono';color:var(--mute);min-width:32px">${g.away.abbr} ${consML.awayPct||'?'}%</span>
      <div style="flex:1;height:4px;border-radius:2px;background:var(--rule)">
        <div style="height:100%;width:${consML.awayPct||0}%;background:var(--cold);border-radius:2px"></div>
      </div>
      <span style="font-family:'IBM Plex Mono';color:var(--mute);min-width:32px;text-align:right">${consML.homePct||'?'}% ${g.home.abbr}</span>
    </div>`:''}

    <div class="legend"><span><i class="v"></i>model sees value</span><span><i class="a"></i>model says pass</span><span><i class="n"></i>no real edge</span></div>
    <div class="legend" style="margin-top:2px"><span>◆ SUPREME = book price, model edge and outside sources all agree</span><span>STRONG = two of three</span><span>⚠ CONFLICT = they disagree</span></div>

    <div class="exprow" style="margin-top:10px">
      <button onclick="nflTogglePanel('coach','${id}',this)">Coach</button>
      <button onclick="nflTogglePanel('trends','${id}',this)">Trends</button>
      <button onclick="nflTogglePanel('ag','${id}',this)">A-G</button>
      <button onclick="nflTogglePanel('alt','${id}',this)">Alt Lines</button>
      <button onclick="nflTogglePanel('props','${id}',this)">Props</button>
      <button onclick="nflTogglePanel('verdict','${id}',this)">Take/Fade</button>
      ${(isLive||isFinal)?`<button onclick="nflTogglePanel('livebox','${id}',this)">${isLive?'Live box':'Box score'}</button>`:''}
      <button onclick="nflTogglePanel('mybets','${id}',this)">My Bets</button>
    </div>
    <div class="panel" id="p-nflcoach-${id}">${coachBriefing(g,s,'nfl')}</div>
    <div class="panel" id="p-nfltrends-${id}">${nflTrendPanel(g,s)}</div>
    <div class="panel" id="p-nflag-${id}">${renderNFLGameAG(g,s)}</div>
    <div class="panel" id="p-nflalt-${id}">${footballAltPanel(g,s)}</div>
    <div class="panel" id="p-nflprops-${id}">${nflPropsPanel(g,s)}</div>
    <div class="panel" id="p-nflverdict-${id}">${takeFadePanel(g,s,'nfl')}</div>
    <div class="panel" id="p-nfllivebox-${id}"><div id="p-fb-livebox-${id}">${(isLive||isFinal)?fbLiveBoxPanel(g,'nfl'):''}</div></div>
    <div class="panel" id="p-nflmybets-${id}"></div>
  </div>`;
}


/* Football alt lines. The MLB altLines() walks run lines at ±1.5/2.5/3.5 and
   totals from 5.5 to 13.5 — baseball ranges that are meaningless for football.
   This walks the spread around the simulated margin and the total around the
   simulated total, which is what makes the panel useful on a football card. */
function footballAltLines(g,s){
  const out={spread:[],tot:[]};
  const mid=Math.round((s.homeProj-s.awayProj)||0);
  for(let d=-14;d<=14;d+=3.5){
    const line=Math.round((mid+d)*2)/2;
    if(Math.abs(line)>28)continue;
    const ph=s.homeCover?s.homeCover(-line):null;
    if(ph==null||isNaN(ph))continue;
    out.spread.push({label:`${g.home.abbr} ${line>0?'-':'+'}${Math.abs(line)}`,p:ph});
    out.spread.push({label:`${g.away.abbr} ${line>0?'+':'-'}${Math.abs(line)}`,p:1-ph});
  }
  const base=Math.round(s.med||s.mean||45);
  for(let t=base-12.5;t<=base+12.5;t+=3){
    const line=Math.round(t*2)/2;
    if(line<20)continue;
    const o=s.over(line);
    if(o==null||isNaN(o))continue;
    out.tot.push({label:`Over ${line}`,p:o});
    out.tot.push({label:`Under ${line}`,p:1-o});
  }
  return out;
}
function footballAltPanel(g,s){
  if(!s)return '<div class="empty">Run sims first.</div>';
  const A=footballAltLines(g,s);
  const sec=(title,arr)=>{
    if(!arr.length)return'';
    const sorted=[...arr].sort((a,b)=>b.p-a.p);
    return`<div class="mktlab" style="margin-top:8px">${title}</div>
      <div class="sub" style="font-family:'IBM Plex Mono';font-size:10.5px;line-height:1.7">
      ${sorted.map(x=>`<div style="display:flex;justify-content:space-between;gap:10px">
        <span>${x.label}</span>
        <span style="color:var(--chalk)">${(x.p*100).toFixed(0)}%<span style="color:var(--mute)"> · needs ${minPrice(x.p)}</span></span>
      </div>`).join('')}</div>`;
  };
  return sec('Alternate spreads',A.spread)+sec('Alternate totals',A.tot)+
    `<div class="sub" style="margin-top:8px;color:var(--mute);font-size:10px">
      "needs" is the break-even price at the model's probability. Anything better than that is +EV.</div>`;
}

/* ── PLAYER FORM (ESPN game logs) ───────────────────────────────────────────
   Starters' recent games, their average, and a projection scaled to the
   Judge's team score (a team projected to score more than it usually does
   lifts its players' numbers, and vice versa). Shown with or without book
   prop lines; with a PROP: line it also prices the over. Cached 12h. */
const NFL_FORM_KEY='d4.nflform';
const NFL_FORM_INFLIGHT={};
function nflPlayerForm(id){
  const C=get(NFL_FORM_KEY,{});const hit=C[id];if(hit&&Date.now()-hit.ts<12*3600e3)return Promise.resolve(hit.v);
  return NFL_FORM_INFLIGHT[id]||(NFL_FORM_INFLIGHT[id]=_nflPlayerFormFetch(id).finally(()=>{delete NFL_FORM_INFLIGHT[id]}));
}
async function _nflPlayerFormFetch(id){
  const r=await fetch(`https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${id}/gamelog`);
  const j=await r.json();const names=(j.names||[]).map(String);const ix=n=>names.indexOf(n);
  const I={pass:ix('passingYards'),rush:ix('rushingYards'),rec:ix('receivingYards'),recs:ix('receptions'),ptd:ix('passingTouchdowns')};
  const evMeta=j.events||{};const games=[];
  (j.seasonTypes||[]).forEach(st=>{if(st.displayName&&/pre/i.test(st.displayName))return;
    (st.categories||[]).forEach(c=>(c.events||[]).forEach(ev=>{
      const n=k=>{const i=I[k];if(i<0||!ev.stats)return null;const v=parseFloat(String(ev.stats[i]).replace(/,/g,''));return isNaN(v)?null:v;};
      const m=evMeta[ev.eventId]||{};games.push({id:ev.eventId,date:m.gameDate||'',opp:((m.opponent||{}).abbreviation)||'',
        pass:n('pass'),rush:n('rush'),rec:n('rec'),recs:n('recs'),ptd:n('ptd')});}));});
  const seen=new Set();const v=games.filter(x=>!seen.has(x.id)&&seen.add(x.id)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);
  /* Re-read at write time: parallel loads each started from an old snapshot,
     so the last one to finish used to overwrite the other nine. */
  const W=get(NFL_FORM_KEY,{});W[id]={ts:Date.now(),v};const ks=Object.keys(W);if(ks.length>150)ks.slice(0,ks.length-150).forEach(k=>delete W[k]);set(NFL_FORM_KEY,W);
  return v;
}
function nflStarters(abbr){
  const P=((NFL_DEPTH[abbr]||{}).players||[]).filter(p=>p.id);const by=(pos,n)=>P.filter(p=>p.pos===pos).sort((a,b)=>(a.depth||9)-(b.depth||9)).slice(0,n);
  return[...by('QB',1),...by('RB',1),...by('WR',2),...by('TE',1)];
}
function nflFormHTML(g,s){
  const need=!nflStarters(g.away.abbr).length||!nflStarters(g.home.abbr).length;
  const P=nflModelProps(g,s);const pc=x=>Math.round(x*100)+'%';
  const side=ab=>{const st=nflStarters(ab);
    if(!st.length)return`<div class="sub">${ab}: depth chart not loaded${typeof NFL_DEPTH_STATUS!=='undefined'&&NFL_DEPTH_STATUS?' <span style="color:var(--mute)">('+NFL_DEPTH_STATUS+')</span>':''}.</div>`;
    const rows=st.map(p=>{const mine=P.filter(x=>x.pid===String(p.id));
      if(!mine.length)return`<div class="mono" style="font-size:10px">${p.name} <span style="color:var(--mute)">${p.pos} · loading stats…</span></div>`;
      return mine.map(x=>`<div class="mono" style="font-size:10px;line-height:1.6;margin-bottom:3px">${x.name} <span style="color:var(--mute)">${x.pos}</span> · ${x.lab}
        proj <b style="color:var(--gold)">${x.proj}</b> <span style="color:var(--mute)">(season ${x.seasonPG??'—'}/g${x.gp?' in '+x.gp:''} · last5 ${x.last5??'—'})</span><br>
        ${x.ladder.map(l=>`${l.line}+ <b>${pc(l.p)}</b>`).join(' · ')}${x.book?` · <span style="color:${x.book.ev>=2?'var(--win)':x.book.ev<0?'var(--rust)':'var(--gold)'}">book ${x.book.line} (${x.book.price>0?'+':''}${x.book.price}) → over ${pc(x.book.p)}, ${x.book.ev>=0?'+':''}${x.book.ev.toFixed(1)}% EV</span>`:''}</div>`).join('');}).join('');
    return`<div style="margin-top:6px"><b>${ab}</b>${rows}</div>`;};
  return`<div class="sub mono" style="font-size:9.5px;color:var(--mute)">season stats: ${NFL_SEASONSTATS_STATUS||'not loaded yet'}</div>`+side(g.away.abbr)+side(g.home.abbr)+(need?`<div class="bar" style="margin-top:8px">
    <button class="primary" onclick="nflRefreshDepthFor('${g.id}',this)">↻ Refresh depth charts</button></div>`:'');
}
async function nflRefreshDepthFor(gid,btn){
  if(btn){btn.disabled=true;btn.textContent='Loading rosters…';}
  try{await fetchNFLDepthCharts(true);}catch(e){}
  const g=NFL_GAMES.find(x=>String(x.id)===String(gid));
  if(g){const el=document.getElementById('nflform-'+g.id);if(el)el.innerHTML=nflFormHTML(g,NFL_SIMS[g.id]);nflLoadForm(g).catch(()=>{});}
}
/* Loads only when a game's Props panel is opened; 10 starters, in parallel. */
async function nflLoadForm(g){
  const ids=[...nflStarters(g.away.abbr),...nflStarters(g.home.abbr)].map(p=>p.id);
  await Promise.all([nflLoadSeasonStats().catch(()=>null),...ids.map(id=>nflPlayerForm(id).catch(()=>null))]);
  const el=document.getElementById('nflform-'+g.id);if(el)el.innerHTML=nflFormHTML(g,NFL_SIMS[g.id]);
}


/* ── NFL SEASON STATS (bulk, like MLB's people?hydrate=stats) ────────────────
   Three requests (passing, rushing, receiving) cover every player in the
   league for the season, cached 12h and loaded automatically on the NFL page.
   Per-player game logs remain the fallback and the "recent form" half. */
const NFL_SEASONSTATS_KEY='d4.nflseason';
let NFL_SEASONSTATS={},NFL_SEASONSTATS_STATUS='';
async function nflLoadSeasonStats(force){
  const season=+NFL_SEASON||new Date().getFullYear();const c=get(NFL_SEASONSTATS_KEY,{});
  if(!force&&c.season===season&&c.v&&Object.keys(c.v).length&&Date.now()-c.ts<12*3600e3){
    NFL_SEASONSTATS=c.v;NFL_SEASONSTATS_STATUS='cached '+Object.keys(c.v).length+' players';return true;}
  const out={};let ok=0;
  for(const cat of ['passing','rushing','receiving']){
    try{
      const r=await fetch(`https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=false&page=1&limit=500&category=offense:${cat}&season=${season}&seasontype=2`);
      const j=await r.json();
      const cols={};(j.categories||[]).forEach(cc=>{cols[cc.name]=(cc.names||[]).map(String);});
      (j.athletes||[]).forEach(a=>{
        const A=a.athlete||{};const id=String(A.id||'');if(!id)return;
        const o=out[id]||(out[id]={name:A.displayName||'',pos:((A.position||{}).abbreviation)||'',team:(A.teamShortName||A.teamAbbreviation||'').toUpperCase()});
        (a.categories||[]).forEach(cc=>{const names=cols[cc.name]||cc.names||[];const vals=cc.totals||cc.values||[];
          const g=n=>{const i=names.indexOf(n);if(i<0)return null;const v=parseFloat(String(vals[i]).replace(/,/g,''));return isNaN(v)?null:v;};
          const gp=g('gamesPlayed');if(gp!=null)o.gp=Math.max(o.gp||0,gp);
          const py=g('passingYards'),ry=g('rushingYards'),cy=g('receivingYards'),rc=g('receptions');
          if(py!=null)o.pass=py;if(ry!=null)o.rush=ry;if(cy!=null)o.rec=cy;if(rc!=null)o.recs=rc;});
      });ok++;
    }catch(err){console.warn('NFL season stats',cat,err&&err.message)}
  }
  const n=Object.keys(out).length;
  if(n){NFL_SEASONSTATS=out;set(NFL_SEASONSTATS_KEY,{season,ts:Date.now(),v:out});}
  NFL_SEASONSTATS_STATUS=n?('loaded '+n+' players'):('unavailable ('+ok+'/3 feeds answered) — using game logs');
  return n>0;
}
(function(){const c=get(NFL_SEASONSTATS_KEY,{});if(c.v)NFL_SEASONSTATS=c.v;})();

/* ── MODEL PROPS (like MLB's buildProps) ─────────────────────────────────────
   Every starter gets a projection with no book line required:
   base = 60% season per-game + 40% last-5 (either alone if that's all we
   have), scaled by the Judge's team score vs that team's usual output.
   Yards: normal around the projection; receptions: Poisson. A ladder of
   lines shows the probability at each; a PROP: line adds book pricing. */
function nflPoisAtLeast(k,m){let p=Math.exp(-m),c=p;for(let i=1;i<k;i++){p*=m/i;c+=p;}return Math.max(0,1-c);}
function nflModelProps(g,s){
  let J=null;try{J=brainJudge(g,s,'nfl')}catch(e){}
  const book=(()=>{try{return nflBookLinesFor(g.away.abbr+'@'+g.home.abbr).filter(x=>x.market==='prop')}catch(e){return[]}})();
  const FC=get(NFL_FORM_KEY,{});const out=[];
  [[g.away.abbr,false],[g.home.abbr,true]].forEach(([ab,isHome])=>{
    const pow=NFL_POWER[ab]||{};const usual=pow.rawOffPPG||pow.offPPG||22;
    const proj=J?(isHome?J.h:J.a):usual;const scale=Math.max(0.8,Math.min(1.25,proj/usual));
    nflStarters(ab).forEach(p=>{
      const ss=NFL_SEASONSTATS[String(p.id)]||null;const logs=(FC[p.id]&&FC[p.id].v)||[];
      const types=p.pos==='QB'?[['pass','Pass Yds','passing yards']]:p.pos==='RB'?[['rush','Rush Yds','rushing yards']]:[['rec','Rec Yds','receiving yards'],['recs','Receptions','receptions']];
      types.forEach(([k,lab,bookStat])=>{
        const L5=logs.filter(x=>x[k]!=null).slice(0,5);const last5=L5.length?L5.reduce((a,x)=>a+x[k],0)/L5.length:null;
        const sPG=ss&&ss.gp&&ss[k]!=null?ss[k]/ss.gp:null;
        const base=sPG!=null&&last5!=null?0.6*sPG+0.4*last5:(sPG!=null?sPG:last5);if(base==null)return;
        const pj=base*scale;const rec={pid:String(p.id),name:p.name,team:ab,pos:p.pos,k,lab,proj:+pj.toFixed(1),
          seasonPG:sPG!=null?+sPG.toFixed(1):null,last5:last5!=null?+last5.toFixed(1):null,gp:ss&&ss.gp||null,ladder:[]};
        if(k==='recs'){const c=Math.round(pj);[c-1,c,c+1].filter(x=>x>=1).forEach(t=>rec.ladder.push({line:t-0.5,p:nflPoisAtLeast(t,pj)}));}
        else{const st=k==='pass'?25:15,sd=k==='pass'?Math.max(45,pj*0.25):Math.max(18,pj*0.45);const mid=Math.round(pj/st)*st;
          [mid-st,mid,mid+st].filter(x=>x>0).forEach(v=>{const line=v-0.5;rec.ladder.push({line,p:1-brainNorm((line-pj)/sd)});});rec.sd=sd;}
        const last=(n)=>String(n||'').toLowerCase().split(' ').pop();
        const bk=book.find(b=>b.player&&last(b.player)===last(p.name)&&(b.stat||'')===bookStat);
        if(bk&&bk.line!=null){const pO=k==='recs'?nflPoisAtLeast(Math.floor(bk.line)+1,pj):1-brainNorm((bk.line-pj)/rec.sd);
          const pr=bk.price!=null?bk.price:-110;rec.book={line:bk.line,price:pr,p:pO,ev:(pO*amerProfit(pr)-(1-pO))*100};}
        out.push(rec);
      });
    });
  });
  return out;
}

function nflPropsPanel(g,s){
  if(!s)return '<div class="empty">Run sims first.</div>';
  const props=buildNFLProps(g,s);
  /* Player form always shows; book prop pricing joins it when PROP: lines exist. */
  const fid='nflform-'+g.id;
  const formBlock=`<div class="sub" style="margin-bottom:8px"><b>Model props</b> — season + last-5 from ESPN, scaled to this game's projected score. % = chance of going over.</div>
    <div id="${fid}">${nflFormHTML(g,s)}</div>`;
  if(!props.length)return formBlock+'<div class="sub" style="margin-top:8px;color:var(--mute)">No PROP: lines uploaded for this game — add them (e.g. <span class="mono">PROP: Jared Goff Pass Yds 245.5 (-115/-105)</span> or <span class="mono">PROP: Jared Goff passing yards 245.5+ (-115)</span>) to price overs against your book.</div>';
  return formBlock+'<div style="height:10px"></div>'+(
  `<div class="sub" style="font-family:'IBM Plex Mono';font-size:10.5px;line-height:1.8">
    ${props.map(p=>`<div style="display:flex;justify-content:space-between;gap:10px">
      <span>${p.actionable?'<b style="color:var(--win)">◆ </b>':''}${p.player} ${p.stat} ${p.line}+${
        p.matched?`<span style="color:var(--mute)"> · ${p.pos}${p.depth?p.depth:''}</span>`:
        `<span style="color:var(--rust)"> · unmatched</span>`}</span>
      <span>${(p.simP*100).toFixed(0)}% · <span style="color:${p.ev>=2?'var(--win)':p.ev<0?'var(--rust)':'var(--gold)'}">${p.ev>=0?'+':''}${p.ev.toFixed(1)}% EV</span></span>
    </div>`).join('')}
    <div style="margin-top:8px;color:var(--mute);font-size:10px">
      Volume share comes from ESPN depth charts; scoring level from team power ratings.
      Position/depth is shown next to each name — "unmatched" means the roster had no
      player by that name, so a generic share was used. Still a screen, not a signal.</div></div>`);
}
function nflTogglePanel(which,gid,btn){
  if(which==='props'){const G=NFL_GAMES.find(x=>String(x.id)===String(gid));if(G)setTimeout(()=>nflLoadForm(G).catch(()=>{}),0);}
  const p=document.getElementById('p-nfl'+which+'-'+gid);
  if(!p)return;
  const row=btn.parentElement;
  const wasOn=p.classList.contains('on');
  // close all panels for this card
  row.querySelectorAll('button').forEach(b=>b.classList.remove('on'));
  row.parentElement.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));
  if(!wasOn){p.classList.add('on');btn.classList.add('on');}
}

// Compact A-G panel for individual game card
function renderNFLGameAG(g,s){
  const ev=evaluateNFLGame(g);
  if(!ev)return'<div class="empty">Run sims first.</div>';
  const{verdict,confidence,mySpread,myTotal,myAwayML,myHomeML,
    spreadEdge,mlEdge,totalEdge,sidePick,totalPick}=ev;
  const verdictColor=verdict==='strong'?'var(--win)':verdict==='lean'?'var(--gold)':'var(--mute)';
  return`<div class="sub" style="margin-top:6px">
    <b style="color:${verdictColor}">${verdict.toUpperCase()} · ${confidence}% confidence</b><br>
    <b>A) My line:</b> ${g.away.abbr} ${s.awayProj} – ${g.home.abbr} ${s.homeProj} · O/U ${myTotal}<br>
    <b>B) Spread:</b> ${mySpread>0?g.home.abbr+' -'+mySpread:mySpread<0?g.away.abbr+' -'+Math.abs(mySpread):"Pick'em"}<br>
    <b>C) Edge:</b> Spread ${spreadEdge!=null?(spreadEdge>0?'+':'')+Math.round(spreadEdge):'—'} · ML ${mlEdge!=null?(mlEdge.edge>0?'+':'')+Math.round(mlEdge.edge):'—'} · Total ${totalEdge!=null?(totalEdge>0?'+':'')+Math.round(totalEdge):'—'}<br>
    <b>D) Picks:</b> ${sidePick||'No strong edge'} ${totalPick?'· '+totalPick:''}<br>
    <b>G) Confidence:</b> ${confidence}%
    ${nflIsDivisionGame(g)?'<br><span style="color:var(--gold)">🏆 Division game</span>':''}
  </div>`;
}

// ── Override nflCard to use full version ─────────────────────────────────────
// The basic nflCard defined earlier is replaced by nflCardFull
const _nflCardBasic=nflCard;
function nflCard(g){return nflCardFull(g);}

// ── NFL refreshEverything hook ───────────────────────────────────────────────
// refreshEverything NFL hook — patched into the original below

// ── Updated switchSport to trigger NFL data load ──────────────────────────────
// nflOnActivate is called from doSportSwitch directly — no override needed

/* ═══════════════════════════════════════════════════════════════════════
   NCAAF ENGINE — BUILD v1.55
   Full college football intelligence layer — same depth as NFL
   FBS teams · ESPN schedule · Sim engine · A-G eval · Calibration
   ═══════════════════════════════════════════════════════════════════════ */

// ── NCAAF constants ─────────────────────────────────────────────────────────
const NCAAF_HFA=4.5; // college home field advantage (real avg ~4.5 pts)
const NCAAF_CALIB_KEY='d4.ncaafcalib';

// Top 25 conferences for reference
const NCAAF_CONF={
  'Alabama':'SEC','Georgia':'SEC','Ohio State':'Big Ten','Michigan':'Big Ten',
  'Texas':'SEC','Oklahoma':'SEC','USC':'Big Ten','Penn State':'Big Ten',
  'Notre Dame':'Independent','Clemson':'ACC','Florida State':'ACC',
  'Oregon':'Big Ten','Washington':'Big Ten','LSU':'SEC','Tennessee':'SEC',
};

// ── NCAAF storage helpers ────────────────────────────────────────────────────
function getNCAAFBookLines(){return get(LS.ncaafshots,{})[today()]||[];}
/* A miss falls through to the alias/fuzzy resolver (~5ms). At 99 games that
   ran ~100 times per pass, twice per render — about a second of frozen UI the
   moment any CFB lines existed. Results are memoized against a signature of
   the stored lines, so any upload, pull or edit invalidates the cache. */
let _NCAAF_BL_MEMO={sig:'',map:new Map()};
function ncaafBookLinesFor(gameKey){
  const all=getNCAAFBookLines();
  if(!all.length)return[];
  let mx=0;for(let i=0;i<all.length;i++){const c=+all[i].capturedAt||0;if(c>mx)mx=c;}
  const sig=all.length+'|'+mx+'|'+(typeof NCAAF_GAMES!=='undefined'?NCAAF_GAMES.length:0);
  if(_NCAAF_BL_MEMO.sig!==sig)_NCAAF_BL_MEMO={sig,map:new Map()};
  if(_NCAAF_BL_MEMO.map.has(gameKey))return _NCAAF_BL_MEMO.map.get(gameKey);
  const res=_ncaafBookLinesForRaw(gameKey,all);
  _NCAAF_BL_MEMO.map.set(gameKey,res);
  return res;
}
function _ncaafBookLinesForRaw(gameKey,all){
  const exact=all.filter(x=>x.game===gameKey);
  if(exact.length)return exact;
  /* CRITICAL FIX — the previous fallback here matched stored rows to a query
     using a bidirectional prefix test: f.startsWith(k) || k.startsWith(f).
     At a handful of games that never showed a wrong hit in testing. At a real
     99-game slate it is exactly the kind of heuristic that goes wrong: any
     short, generic key can end up a prefix of some unrelated team's longer
     resolved form, and once one game falsely matches, every OTHER unresolved
     game in the slate falls through to the same fuzzy check and can land on
     the SAME wrong stored row — which is precisely the symptom reported:
     every single CFB card showing an identical spread that didn't belong to
     it. A wrong "REAL" line silently corrupting every card is worse than an
     honest "sim only," so the fallback is now strict: resolve BOTH sides
     through the schedule and require an EXACT abbreviation match, nothing
     fuzzy. If that still finds nothing, run the repair pass once and check
     again — no guessing beyond that. */
  const [ak,hk]=(gameKey||'').split('@');
  const hit=all.filter(x=>{
    const [xa,xh]=(x.game||'').split('@');
    if(xa===ak&&xh===hk)return true;                 // stored key already an abbr
    const ra=ncaafAbbrFor(xa), rh=ncaafAbbrFor(xh);   // stored key is a name/slug
    return ra&&rh&&ra===ak&&rh===hk;
  });
  if(hit.length)return hit;
  try{repairNCAAFKeys()}catch(e){}
  const all2=getNCAAFBookLines();
  return all2.filter(x=>{
    if(x.game===gameKey)return true;
    const [xa,xh]=(x.game||'').split('@');
    const ra=ncaafAbbrFor(xa), rh=ncaafAbbrFor(xh);
    return ra&&rh&&ra===ak&&rh===hk;
  });
}
/* Rewrite any stored CFB rows that were saved before the schedule was
   available, so the repair is permanent rather than re-derived every render. */
function repairNCAAFKeys(){
  if(!(NCAAF_GAMES||[]).length)return 0;
  const all=get(LS.ncaafshots,{});let fixed=0;
  Object.keys(all).forEach(d=>{
    (all[d]||[]).forEach(r=>{
      const [xa,xh]=(r.game||'').split('@');
      const ra=ncaafAbbrFor(xa),rh=ncaafAbbrFor(xh);
      if(ra&&rh){
        const k=ra+'@'+rh;
        if(k!==r.game){r.game=k;r.away=ra;r.home=rh;fixed++;}
      }
    });
  });
  if(fixed)set(LS.ncaafshots,all);
  return fixed;
}
function getNCAAFExt(){return get(LS.ncaafext,{})[today()]||[];}
function getNCAAFTrends(){return get(LS.ncaaftrends,{})[today()]||[];}
function getNCAAFConsensus(){return get(LS.ncaafconsensus,{})[today()]||[];}
function ncaafTrendsFor(k){return getNCAAFTrends().filter(x=>x.game===k);}
function ncaafConsensusFor(k){return getNCAAFConsensus().filter(x=>x.game===k);}
function ncaafExtFor(k){return getNCAAFExt().filter(x=>x.game===k);}

// ── NCAAF Sim Engine ─────────────────────────────────────────────────────────
// College football has higher scoring, wider variance, and bigger HFA than NFL.
// Average FBS score ~28 PPG, std dev ~14 (wider than NFL due to talent gap blowouts).
function simNCAAFGame(g,N){
  N=N||10000;
  const awayPow=ncaafPowerFor(g.away)||{offPPG:26,defPPG:26,wins:0,losses:0,unrated:true};
  const homePow=ncaafPowerFor(g.home)||{offPPG:26,defPPG:26,wins:0,losses:0,unrated:true};
  const leagueAvg=26.0;
  /* CRITICAL FIX — every CFB spread was landing near 20+ points, including
     genuine toss-ups, because CollegeFootballData's SP+ offense/defense
     SUB-RATINGS were being averaged as if they were raw points-per-game.
     They are not on that scale. Published SP+ (e.g. 2024 final): Ohio State
     offense 39.1 / defense 7.6 (LOWER defense number = better — it is an
     efficiency component, not points allowed); Indiana offense 40.2 / defense
     10.2. Averaging (offense+opponentDefense)/2 as if both were "points"
     crushed elite defenses toward ~8 and inflated mediocre ones toward ~28,
     so any game pairing a good defense against a bad one produced a
     20-25 point swing regardless of how close the matchup actually was —
     while two elite or two weak teams (similar sub-rating shapes) produced
     unrealistically SMALL spreads. Reproduced with real published numbers
     before this fix: Ohio State (home) vs a bad team projected 39.0-14.8
     (spread 24.2), but Ohio State vs Indiana — an actual top-5 matchup —
     projected a mere 5.2-point spread. Backwards on both counts.

     SP+'s OVERALL rating is specifically built as a point-spread-equivalent
     number: the difference between two teams' overall ratings already IS
     the expected margin on a neutral field. That is the documented, correct
     way to use it — not decomposing into sub-components. This is now used
     whenever both teams carry a real SP+ rating; the ESPN-standings fallback
     path (real season points-for/points-against, genuinely on a PPG scale)
     is unchanged below it. */
  const bothSP=awayPow.sp!=null&&homePow.sp!=null;
  let awayExp,homeExp;
  if(bothSP){
    const avgTotal=55;                    // approx combined FBS scoring average
    const neutralMargin=awayPow.sp-homePow.sp;   // positive = away rated better
    awayExp=avgTotal/2+neutralMargin/2;
    homeExp=avgTotal/2-neutralMargin/2+NCAAF_HFA;
  }else{
    // ESPN standings fallback: offPPG/defPPG here are real season points-for
    // and points-against, so averaging them is valid — shrunk toward league
    // average early in the season when the sample is thin.
    const gamesPlayed=Math.max((awayPow.wins||0)+(awayPow.losses||0),(homePow.wins||0)+(homePow.losses||0),1);
    const regW=Math.min(1,(gamesPlayed-1)/6);
    const reg=1-0.4*(1-regW);
    awayExp=((awayPow.offPPG+homePow.defPPG)/2)*reg+leagueAvg*(1-reg);
    homeExp=((homePow.offPPG+awayPow.defPPG)/2)*reg+leagueAvg*(1-reg)+NCAAF_HFA;
  }
  awayExp=Math.max(3,awayExp);homeExp=Math.max(3,homeExp);
  const std=14; // wider variance in college
  /* Was two 10,000-element arrays, a comparator sort on each, and an O(N)
     .filter() on EVERY over()/cover() call. The Alt Lines panel makes ~40 such
     calls per card, so a 99-game CFB slate meant tens of millions of array
     reads per render — measured 35x slower than the NFL board doing the same
     work. Scores are small non-negative integers, so a frequency table answers
     these exactly in O(1), and median comes off the cumulative counts with no
     sort at all. Same approach already used by the MLB and NFL engines. */
  const TSPAN=200, MSPAN=241, MOFF=120;   // totals 0..199, margins -120..+120
  const totFreq=new Int32Array(TSPAN);
  const marFreq=new Int32Array(MSPAN);
  let hw=0,aw=0,ties=0;
  for(let i=0;i<N;i++){
    const a=Math.max(0,Math.round(awayExp+randn()*std));
    const h=Math.max(0,Math.round(homeExp+randn()*std));
    const tt=a+h; totFreq[tt<TSPAN?tt:TSPAN-1]++;
    let m=h-a; if(m<-MOFF)m=-MOFF; else if(m>MOFF)m=MOFF;
    marFreq[m+MOFF]++;
    if(h>a)hw++;else if(a>h)aw++;else ties++;
  }
  // cumulative "at or above" tables
  const cumT=new Float64Array(TSPAN+2);
  for(let k=TSPAN-1;k>=0;k--)cumT[k]=cumT[k+1]+totFreq[k];
  const cumM=new Float64Array(MSPAN+2);
  for(let k=MSPAN-1;k>=0;k--)cumM[k]=cumM[k+1]+marFreq[k];
  const qFrom=(freq,span,q)=>{const idx=Math.floor(N*q);let run=0;
    for(let v=0;v<span;v++){run+=freq[v];if(run>idx)return v}return span-1};
  const med=qFrom(totFreq,TSPAN,.5);
  const medMargin=qFrom(marFreq,MSPAN,.5)-MOFF;
  const over=x=>{let k=Math.floor(x)+1;if(k<0)k=0;if(k>TSPAN)return 0;return cumT[k]/N};
  /* Same sign convention as the NFL engine, stated explicitly because the old
     single spreadCover() was being called with a negated away line and so
     answered a different question than the square it labelled.
     margin = home - away.  homeCover(line): home covers a handicap written from
     the home side.  awayCover(line): away covers its own line. */
  const homeCover=line=>{let k=Math.floor(-line)+1+MOFF;if(k<0)k=0;if(k>MSPAN)return 0;return cumM[k]/N};
  // away covers its own +line when margin < line. Margins are integers, so the
  // count of m < line is 1 - P(m >= ceil(line)) for both integer and half lines
  // — using floor(line)+1 here would wrongly count the exact push as a cover.
  const awayCover=line=>{let k=Math.ceil(line)+MOFF;if(k<0)return 0;if(k>MSPAN)k=MSPAN;return 1-(cumM[k]/N)};
  const spreadCover=line=>{let k=Math.floor(line)+1+MOFF;if(k<0)k=0;if(k>MSPAN)return 0;return cumM[k]/N};
  return{
    awayProj:isNaN(awayExp)?26:Math.round(awayExp*10)/10,
    homeProj:isNaN(homeExp)?26:Math.round(homeExp*10)/10,
    p10:qFrom(totFreq,TSPAN,.1),p90:qFrom(totFreq,TSPAN,.9),
    hw:hw/N,aw:aw/N,med,medMargin,over,spreadCover,homeCover,awayCover,N
  };
}

// Resolve a team object to its rating by trying every identifier ESPN uses.
function ncaafPowerFor(t){
  if(!t)return null;
  for(const k of [t.id,t.name,t.displayName,t.shortName,t.location,t.abbr,t.abbreviation]){
    if(k&&NCAAF_POWER[String(k).trim()])return NCAAF_POWER[String(k).trim()];
  }
  return null;
}
function ncaafPowerFlags(){
  const vals=Object.values(NCAAF_POWER).filter(v=>v&&typeof v.offPPG==='number');
  NCAAF_POWER_RATED=vals.length;
  const offs=vals.map(v=>v.offPPG);
  const spread=offs.length?Math.max(...offs)-Math.min(...offs):0;
  NCAAF_POWER_FLAT=(NCAAF_POWER_RATED<20||spread<2);
}
/* ── CFB SP+ RATINGS (CollegeFootballData) ────────────────────────────────
   The ESPN standings fallback uses last season's raw points for/against, which
   at Week 1 is both stale and unadjusted for who anyone played. SP+ is a
   purpose-built predictive rating — it separates offense and defense on a
   points-per-game scale and is opponent-adjusted, so it is meaningful before a
   single snap of the new season. That is exactly the gap that made every
   Week 1 card project the same score.
   Free tier is 1,000 calls/month with a key; team ratings are one call a week,
   so this sits far inside it. Cached for 24h. Falls back to the ESPN standings
   path whenever the key is absent or the call fails. */
const CFBD_BASE='https://api.collegefootballdata.com';
async function fetchCFBDRatings(force){
  const key=get(LS.cfbd,'');
  if(!key){CFBD_STATUS='no key';return false;}
  const cache=get('d4.cfbdsp',{});
  const fresh=cache.ts&&(Date.now()-cache.ts)<864e5;
  if(fresh&&!force&&cache.v&&Object.keys(cache.v).length){
    applyCFBDRatings(cache.v);CFBD_STATUS='cached '+Object.keys(cache.v).length+' teams';return true;
  }
  const year=new Date().getFullYear();
  try{
    let rows=await cfbdGet('/ratings/sp?year='+year,key);
    // Preseason: the current year's SP+ may not be published yet. Last completed
    // season's final ratings are a far better prior than league-average.
    if(!Array.isArray(rows)||rows.length<20){
      rows=await cfbdGet('/ratings/sp?year='+(year-1),key);
      if(Array.isArray(rows)&&rows.length)CFBD_STATUS='using '+(year-1)+' SP+ (current year not published)';
    }
    if(!Array.isArray(rows)||!rows.length){CFBD_STATUS='no ratings returned';return false;}
    const map={};
    rows.forEach(r=>{
      const team=r.team; if(!team)return;
      // SP+ offense/defense ratings are already on a points-per-game scale.
      const off=num(r.offense&&r.offense.rating), def=num(r.defense&&r.defense.rating);
      if(off==null&&def==null)return;
      map[team]={offPPG:off==null?26:off,defPPG:def==null?26:def,
                 sp:num(r.rating),conference:r.conference||'',src:'SP+'};
    });
    if(!Object.keys(map).length){CFBD_STATUS='ratings had no usable rows';return false;}
    set('d4.cfbdsp',{ts:Date.now(),v:map});
    applyCFBDRatings(map);
    CFBD_STATUS=(CFBD_STATUS||'')+' · loaded '+Object.keys(map).length+' teams';
    return true;
  }catch(e){CFBD_STATUS='failed: '+(e&&e.message||e);console.warn('CFBD SP+ failed',e);return false;}
}
function num(v){const n=parseFloat(v);return isNaN(n)?null:n}
async function cfbdGet(path,key){
  const r=await fetch(CFBD_BASE+path,{headers:{'Authorization':'Bearer '+key,'Accept':'application/json'}});
  if(r.status===401||r.status===403)throw new Error('key rejected ('+r.status+')');
  if(r.status===429)throw new Error('monthly call limit reached');
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
}
/* SP+ names ("Alabama") differ from ESPN schedule names ("Alabama Crimson
   Tide"), so index under several forms and let ncaafPowerFor resolve. */
function applyCFBDRatings(map){
  Object.keys(map).forEach(team=>{
    const rec=map[team];
    NCAAF_POWER[team]=rec;
    (NCAAF_GAMES||[]).forEach(g=>{
      [g.away,g.home].forEach(t=>{
        const nm=String(t&&t.name||'');
        if(nm&&(nm===team||nm.startsWith(team+' ')))NCAAF_POWER[nm]=rec;
      });
    });
  });
  ncaafPowerFlags();
  NCAAF_SIMS={};
  if(ACTIVE_SPORT==='ncaaf'&&typeof renderNCAAF==='function')renderNCAAF();
}
/* ── CFB TRANSFER PORTAL ──────────────────────────────────────────────────
   College rosters churn in a way NFL rosters do not. A team's leading receiver
   in Week 1 may have zero snaps for that school and a full season of
   production somewhere else, so "this player has no stats for this team" is
   the normal case, not a data gap. Looking a transfer up only under their new
   team returns nothing and the model treats a proven starter as unknown.

   This indexes the portal by player, then resolves stats against the team they
   actually played for. Prior-team production is always labelled as such — it
   is a real signal, but it was earned against a different schedule, and a
   G5-to-P4 move in particular should not be read at face value. */
const cfbNameKey=n=>cfbKeyOf(n);
async function fetchCFBPortal(force){
  const key=get(LS.cfbd,'');
  if(!key){CFB_PORTAL_STATUS='no key';return false;}
  const cache=get('d4.cfbportal',{});
  if(!force&&cache.ts&&(Date.now()-cache.ts)<6048e5&&cache.v&&Object.keys(cache.v).length){
    CFB_PORTAL=cache.v;CFB_PORTAL_STATUS='cached '+Object.keys(CFB_PORTAL).length+' players';return true;
  }
  const year=new Date().getFullYear();
  try{
    let rows=await cfbdGet('/player/portal?year='+year,key);
    if(!Array.isArray(rows)||!rows.length)rows=await cfbdGet('/player/portal?year='+(year-1),key);
    if(!Array.isArray(rows)||!rows.length){CFB_PORTAL_STATUS='no portal rows';return false;}
    const map={};
    rows.forEach(r=>{
      const full=[r.firstName,r.lastName].filter(Boolean).join(' ').trim();
      if(!full)return;
      const from=(r.fromTeam&&(r.fromTeam.school||r.fromTeam))||r.origin||null;
      const to=(r.toTeam&&(r.toTeam.school||r.toTeam))||r.destination||null;
      if(!to)return;
      const k=cfbNameKey(full);
      map[k]=map[k]||[];
      map[k].push({name:full,from,to,
        pos:(r.position&&(r.position.position||r.position))||r.position||null,
        season:r.season||year,stars:r.stars||null,eligibility:r.eligibility||null});
    });
    CFB_PORTAL=map;
    set('d4.cfbportal',{ts:Date.now(),v:map});
    CFB_PORTAL_STATUS='loaded '+Object.keys(map).length+' players';
    return true;
  }catch(e){CFB_PORTAL_STATUS='failed: '+(e&&e.message||e);return false;}
}
(function restoreCFBPortal(){
  const c=get('d4.cfbportal',{});
  if(c.v&&Object.keys(c.v).length){CFB_PORTAL=c.v;CFB_PORTAL_STATUS='cached '+Object.keys(c.v).length+' players';}
})();
// Season stats for one team, cached per team+year (a call each, so cache hard).
async function fetchCFBPlayerSeason(team,year){
  const key=get(LS.cfbd,'');if(!key||!team)return null;
  const ck=cfbNameKey(team)+':'+year;
  if(CFB_PLAYER_STATS[ck])return CFB_PLAYER_STATS[ck];
  const disk=get('d4.cfbpstats',{});
  if(disk[ck]&&disk[ck].ts&&(Date.now()-disk[ck].ts)<6048e5){
    CFB_PLAYER_STATS[ck]=disk[ck].v;return disk[ck].v;
  }
  try{
    const rows=await cfbdGet('/stats/player/season?year='+year+'&team='+encodeURIComponent(team),key);
    if(!Array.isArray(rows))return null;
    const byPlayer={};
    rows.forEach(r=>{
      const k=cfbNameKey(r.player);if(!k)return;
      (byPlayer[k]=byPlayer[k]||{player:r.player,team,year,stats:{}});
      byPlayer[k].stats[(r.category||'')+'.'+(r.statType||'')]=+r.stat;
    });
    CFB_PLAYER_STATS[ck]=byPlayer;
    disk[ck]={ts:Date.now(),v:byPlayer};set('d4.cfbpstats',disk);
    return byPlayer;
  }catch(e){console.warn('CFB player stats failed',e);return null;}
}
/* The lookup the rest of the app should use for a college player: returns
   their production and says plainly WHICH team earned it. */
async function cfbPlayerContext(name,currentTeam){
  const k=cfbNameKey(name);
  const moves=(CFB_PORTAL[k]||[]).slice().sort((a,b)=>(b.season||0)-(a.season||0));
  const move=moves.find(m=>!currentTeam||cfbNameKey(m.to)===cfbNameKey(currentTeam))||moves[0]||null;
  const year=new Date().getFullYear();
  // current team first — a returning starter needs no portal lookup at all
  let cur=await fetchCFBPlayerSeason(currentTeam,year-1);
  if(cur&&cur[k])return{player:cur[k].player,team:currentTeam,statsTeam:currentTeam,
    transferred:false,stats:cur[k].stats,year:year-1,note:null};
  if(move&&move.from){
    const prior=await fetchCFBPlayerSeason(move.from,year-1);
    if(prior&&prior[k])return{player:prior[k].player,team:currentTeam,statsTeam:move.from,
      transferred:true,stats:prior[k].stats,year:year-1,pos:move.pos,
      note:'Prior-team production at '+move.from+' — earned against a different schedule.'};
    return{player:name,team:currentTeam,statsTeam:move.from,transferred:true,stats:null,
      year:year-1,pos:move.pos,note:'Transferred from '+move.from+'; no season stats found.'};
  }
  return{player:name,team:currentTeam,statsTeam:null,transferred:false,stats:null,note:'No prior production found.'};
}
// Everyone who transferred INTO a given school this cycle.
function cfbPortalPanel(g){
  if(!Object.keys(CFB_PORTAL||{}).length)
    return '<div class="empty">Portal data not loaded. Add a CollegeFootballData key in Settings, then use "Reload CFB SP+ ratings".</div>';
  const side=(t,label)=>{
    const inc=cfbIncomingTransfers(t.name||t.abbr);
    if(!inc.length)return `<div class="mktlab" style="margin-top:8px">${label} — no incoming transfers found</div>`;
    const rows=inc.slice(0,15).map(m=>`<div style="display:flex;justify-content:space-between;gap:10px">
      <span>${m.name}${m.pos?` <span style="color:var(--mute)">${m.pos}</span>`:''}</span>
      <span style="color:var(--mute)">from ${m.from||'—'}${m.stars?` · ${m.stars}★`:''}</span></div>`).join('');
    return `<div class="mktlab" style="margin-top:8px">${label} — ${inc.length} incoming</div>
      <div class="sub" style="font-family:'IBM Plex Mono';font-size:10.5px;line-height:1.7">${rows}</div>`;
  };
  return side(g.away,g.away.abbr)+side(g.home,g.home.abbr)+
    `<div class="sub" style="margin-top:8px;color:var(--mute);font-size:10px">
      Production listed for a transfer was earned at their previous school, against a
      different schedule. Treat a G5-to-P4 move with more caution than the raw numbers suggest.</div>`;
}
function cfbIncomingTransfers(team){
  if(!team)return[];
  const out=[];const tk=cfbNameKey(team);
  Object.keys(CFB_PORTAL).forEach(k=>{
    (CFB_PORTAL[k]||[]).forEach(m=>{
      if(m.to&&cfbNameKey(m.to)===tk)out.push(m);
      else if(m.to&&tk.length>3&&cfbNameKey(m.to).startsWith(tk))out.push(m);
    });
  });
  return out;
}
/* ── FOOTBALL LIVE BOX ────────────────────────────────────────────────────
   Same depth as the MLB box: quarter linescore with possession marker,
   passing/rushing/receiving tables per team, team toggle, 45s live cache.
   Works for both NFL and CFB — the ESPN summary endpoint is the same path,
   only the league slug differs. */
let FB_BOX_CACHE={};           // keyed by espnId
let FB_BOX_INFLIGHT={};
const FB_ESPN={
  nfl:'https://site.api.espn.com/apis/site/v2/sports/football/nfl',
  ncaaf:'https://site.api.espn.com/apis/site/v2/sports/football/college-football',
};

async function fetchFBBoxscore(espnId,league){
  if(!espnId)return null;
  const cached=FB_BOX_CACHE[espnId];
  if(cached&&Date.now()-cached.ts<45000)return cached;
  if(FB_BOX_INFLIGHT[espnId])return FB_BOX_INFLIGHT[espnId];
  const base=FB_ESPN[league]||FB_ESPN.nfl;
  const p=(async()=>{
    try{
      const r=await fetch(`${base}/summary?event=${espnId}`);
      const j=await r.json();
      const result=parseFBBoxscore(j);
      FB_BOX_CACHE[espnId]={ts:Date.now(),...result};
      return FB_BOX_CACHE[espnId];
    }catch(e){return null;}
    finally{delete FB_BOX_INFLIGHT[espnId];}
  })();
  FB_BOX_INFLIGHT[espnId]=p;
  return p;
}

function parseFBBoxscore(j){
  // Linescore — ESPN puts it in j.header.competitions[0].competitors
  const comp=((j.header||{}).competitions||[])[0]||((j.boxscore||{}).teams||[{},{}])[0]&&{};
  const hcomp=((j.header||{}).competitions||[])[0]||{};
  const competitors=(hcomp.competitors||[]);
  const awayComp=competitors.find(c=>c.homeAway==='away')||competitors[0]||{};
  const homeComp=competitors.find(c=>c.homeAway==='home')||competitors[1]||{};
  const awayAbbr=(awayComp.team&&awayComp.team.abbreviation||'').toUpperCase();
  const homeAbbr=(homeComp.team&&homeComp.team.abbreviation||'').toUpperCase();
  const awayScore=+(awayComp.score||0);
  const homeScore=+(homeComp.score||0);
  // Quarter/half scores from linescores
  const awayLns=(awayComp.linescores||[]).map(x=>x.value!=null?x.value:'');
  const homeLns=(homeComp.linescores||[]).map(x=>x.value!=null?x.value:'');
  // status
  const hStatus=(hcomp.status||{});
  const period=hStatus.period||0;
  const clock=hStatus.displayClock||'';
  const state=(hStatus.type||{}).state||'pre';
  const pos=((j.situation||{}).possession||{}).id;
  const posTeamId=pos||(((j.situation||{}).possessionText)||'');
  const awayTeamId=awayComp.id||awayComp.team&&awayComp.team.id||'';
  const homeTeamId=homeComp.id||homeComp.team&&homeComp.team.id||'';
  const possAway=pos&&(awayTeamId===pos||awayAbbr===pos);
  const possHome=pos&&(homeTeamId===pos||homeAbbr===pos);
  const dn=j.situation&&j.situation.downDistanceText||'';
  const spot=j.situation&&j.situation.possessionText||'';
  // Player stats from j.boxscore.players
  const players=(j.boxscore||{}).players||[];
  const teamStats={};
  players.forEach(teamBlock=>{
    const ab=(teamBlock.team&&teamBlock.team.abbreviation||'').toUpperCase();
    if(!ab)return;
    const out={passing:[],rushing:[],receiving:[],fumbles:[],interceptions:[],defense:[]};
    (teamBlock.statistics||[]).forEach(group=>{
      const cat=(group.name||group.type||'').toLowerCase();
      const labels=group.labels||group.keys||[];
      (group.athletes||[]).forEach(a=>{
        const name=(a.athlete&&(a.athlete.shortName||a.athlete.displayName))||'';
        const stats={name};
        (a.stats||[]).forEach((v,i)=>{ if(labels[i])stats[labels[i]]=v; });
        if(cat.includes('pass'))out.passing.push(stats);
        else if(cat.includes('rush'))out.rushing.push(stats);
        else if(cat.includes('receiv'))out.receiving.push(stats);
        else if(cat.includes('fumble'))out.fumbles.push(stats);
        else if(cat.includes('interc'))out.interceptions.push(stats);
        else if(cat.includes('defens')||cat.includes('tackle')||cat.includes('sack'))out.defense.push(stats);
      });
    });
    teamStats[ab]=out;
  });
  return{awayAbbr,homeAbbr,awayScore,homeScore,awayLns,homeLns,
    period,clock,state,possAway,possHome,dn,spot,teamStats};
}

/* ── FOOTBALL INLINE LIVE SCORE BAR ───────────────────────────────────────
   MLB's liveScoreBar() shows the big colored score, live dot, and situational
   state (count/outs/diamond) directly on the card — no tap required. Football
   never had an inline equivalent: a live game fell through to the SAME
   pre-game headline as a scheduled one, with the real state only reachable by
   tapping into the Live box panel. This is the missing inline piece, same
   visual language — big score, live dot, down & distance in place of
   count/outs — plus the same bet-progress strip pulled from locked tickets. */
function fbFinalHeadline(g,s,sport){
  const aA=g.awayScore!=null&&g.awayScore!==''?+g.awayScore:null;
  const hA=g.homeScore!=null&&g.homeScore!==''?+g.homeScore:null;
  const sc=aA!=null?g.away.abbr+' '+aA+' – '+hA+' '+g.home.abbr
                   :g.away.abbr+' ? – ? '+g.home.abbr;
  const scoreDiv='<div class="sc" style="color:var(--win)">'+sc+'</div>';
  if(aA==null)return '<div class="proj">'+scoreDiv+'<div class="rd">final</div></div>';
  const projM=Math.round(((s&&s.homeProj)||0)-((s&&s.awayProj)||0));
  const actM=hA-aA;
  const diff=Math.abs(projM-actM);
  const projW=projM>0?g.home.abbr:g.away.abbr;
  const actW=actM>0?g.home.abbr:actM<0?g.away.abbr:'TIE';
  const hit=projW===actW;
  const dc=diff<=7?'var(--win)':diff<=14?'var(--gold)':'var(--rust)';
  const arrow=projM>=0?'+':'-';
  return '<div class="proj">'+scoreDiv
    +'<div class="rd" style="margin-top:3px">final</div>'
    +'<div style="font-family:IBM Plex Mono;font-size:9px;margin-top:4px;display:flex;gap:8px;flex-wrap:wrap">'
    +'<span style="color:'+(hit?'var(--win)':'var(--rust)')+'">model '+(hit?'✓':'✗')+' (proj '+arrow+Math.abs(projM)+')</span>'
    +'<span style="color:'+dc+'">off by '+diff+' pts</span>'
    +'</div></div>';
}
function fbLiveScoreBar(g,league){
  if(g.abstract!=='in')return'';
  const box=FB_BOX_CACHE[g.espnId||g.id]||null;
  const awayScore=box?box.awayScore:(g.awayScore||0);
  const homeScore=box?box.homeScore:(g.homeScore||0);
  const clock=box?box.clock:(g.clock||'');
  const period=box?box.period:(g.period||0);
  const perLabel=period>=5?'OT':'Q'+period;
  const awayLead=awayScore>homeScore, homeLead=homeScore>awayScore;
  const teamScore=(ab,score,lead)=>`
    <div style="display:flex;flex-direction:column;align-items:center;min-width:44px">
      <span style="font-family:'IBM Plex Mono';font-size:9.5px;letter-spacing:.06em;
        color:${lead?'var(--chalk)':'var(--mute)'}">${ab}</span>
      <span style="font-family:'Archivo';font-weight:900;font-size:28px;line-height:1.05;
        color:${lead?'var(--chalk)':'var(--mute)'}">${score}</span>
    </div>`;
  const dn=box&&box.dn?box.dn:'';
  const spot=box&&box.spot?box.spot:'';
  const poss=box&&(box.possAway||box.possHome)
    ?`<span style="color:var(--gold)">◆ ${box.possAway?g.away.abbr:g.home.abbr}</span>`:'';
  const gl=g.away.abbr+'@'+g.home.abbr;
  const myLegs=[];
  get(LS.locked,[]).forEach(t=>t.legs.forEach(x=>{if(x.game===gl)myLegs.push(x)}));
  const betStrip=myLegs.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:7px;
    padding-top:7px;border-top:1px solid var(--rule)">
    ${myLegs.map(x=>{
      const badge=(typeof gradeLegBadge==='function')?gradeLegBadge(x,x.gameDate||today()):'';
      return `<div style="font-size:11px"><span style="color:var(--chalk)">${x.pick}</span> ${badge}</div>`;
    }).join('')}
  </div>`:'';
  return`<div class="live-bar">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
      <div style="display:flex;align-items:center;gap:12px">
        ${teamScore(g.away.abbr,awayScore,awayLead)}
        ${teamScore(g.home.abbr,homeScore,homeLead)}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
        <div style="display:flex;align-items:center;gap:5px">
          <span class="live-dot"></span>
          <span style="font-family:'IBM Plex Mono';font-size:10px;letter-spacing:.08em;
            color:var(--gold);text-transform:uppercase">${perLabel}${clock?' · '+clock:''}</span>
        </div>
        ${dn?`<div style="font-family:'IBM Plex Mono';font-size:10px;color:var(--chalk-dim);text-align:right">
          ${dn}${spot?' — '+spot:''} ${poss}</div>`
          :`<span style="font-family:'IBM Plex Mono';font-size:9px;color:var(--mute)">live</span>`}
      </div>
    </div>
    ${betStrip}
  </div>`;
}
function fbLiveBoxPanel(g,league){
  const espnId=g.espnId||g.id;
  const cached=FB_BOX_CACHE[espnId];
  const isLive=g.abstract==='in'||g.abstract==='live'||g.status==='InProgress'||g.status==='Halftime';
  const isFinal=g.abstract==='post'||g.status==='Final';

  // ── Quarter linescore ────────────────────────────────────────────────
  const mkLinescore=(box)=>{
    const nPeriods=league==='ncaaf'?4:4;
    const awayQ=box?box.awayLns:[]; const homeQ=box?box.homeLns:[];
    const aScore=box?box.awayScore:(g.awayScore||0);
    const hScore=box?box.homeScore:(g.homeScore||0);
    const per=box?box.period:(g.period||0);
    const cols=Math.max(nPeriods,awayQ.length,homeQ.length);
    const labels=Array.from({length:cols},(_,i)=>{
      if(i<4)return 'Q'+(i+1);
      if(i===4)return 'OT'; return 'OT'+(i-3);
    });
    const cell=(v,i)=>{
      const cur=(box&&i===per-1&&isLive);
      const empty=v===''||v===undefined||v===null;
      return`<td style="text-align:center;padding:5px 5px;font-family:'IBM Plex Mono';font-size:11px;
        color:${empty?'var(--mute)':cur?'var(--gold)':'var(--chalk)'};
        background:${cur?'rgba(242,169,59,.08)':'transparent'};
        border-bottom:1px solid var(--rule)">${empty?'·':v}</td>`;
    };
    // possession indicator ◆ in team column
    const awayPoss=box&&box.possAway?'<span style="color:var(--gold);font-size:9px"> ◆</span>':'';
    const homePoss=box&&box.possHome?'<span style="color:var(--gold);font-size:9px"> ◆</span>':'';
    return`<div style="overflow-x:auto;margin:10px 0 4px">
      <table style="width:100%;border-collapse:collapse;min-width:280px">
        <thead><tr>
          <th style="text-align:left;padding:4px 6px;font-family:'IBM Plex Mono';font-size:9px;
            letter-spacing:.08em;color:var(--mute);text-transform:uppercase;
            border-bottom:1px solid var(--rule)">TEAM</th>
          ${labels.map((l,i)=>`<th style="text-align:center;padding:4px 5px;
            font-family:'IBM Plex Mono';font-size:9px;
            color:${i===per-1&&isLive?'var(--gold)':'var(--mute)'};
            border-bottom:1px solid var(--rule)">${l}</th>`).join('')}
          <th style="text-align:center;padding:4px 8px;font-family:'IBM Plex Mono';
            font-size:9px;color:var(--gold);letter-spacing:.06em;
            border-bottom:1px solid var(--rule)">PTS</th>
        </tr></thead>
        <tbody>
          <tr>
            <td style="padding:6px 6px;font-family:'Archivo';font-weight:900;font-size:13px;
              border-bottom:1px solid var(--rule)">${g.away.abbr}${awayPoss}</td>
            ${Array.from({length:cols},(_,i)=>cell(awayQ[i],i)).join('')}
            <td style="text-align:center;padding:6px 8px;font-family:'Archivo';font-weight:900;
              font-size:16px;color:${aScore>hScore?'var(--win)':'var(--chalk)'};
              border-bottom:1px solid var(--rule)">${aScore}</td>
          </tr>
          <tr>
            <td style="padding:6px 6px;font-family:'Archivo';font-weight:900;font-size:13px">${g.home.abbr}${homePoss}</td>
            ${Array.from({length:cols},(_,i)=>cell(homeQ[i],i)).join('')}
            <td style="text-align:center;padding:6px 8px;font-family:'Archivo';font-weight:900;
              font-size:16px;color:${hScore>aScore?'var(--win)':'var(--chalk)'}">${hScore}</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${box&&box.dn?`<div style="font-family:'IBM Plex Mono';font-size:10px;color:var(--gold);margin:4px 0 2px">
      ${box.dn}${box.spot?' — '+box.spot:''}</div>`:''}`;
  };

  // ── Stat table helper — passing / rushing / receiving / defense ───────
  const statTable=(rows,cols,heading)=>{
    if(!rows||!rows.length)return'';
    return`<div style="margin-top:14px">
      <div style="font-family:'IBM Plex Mono';font-size:9px;letter-spacing:.1em;
        text-transform:uppercase;color:var(--mute);margin-bottom:6px">${heading}</div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:360px">
        <thead><tr>
          <th style="text-align:left;padding:4px 6px;font-family:'IBM Plex Mono';
            font-size:8.5px;color:var(--mute);border-bottom:1px solid var(--rule)">Player</th>
          ${cols.map(c=>`<th style="text-align:center;padding:4px 5px;
            font-family:'IBM Plex Mono';font-size:8.5px;color:var(--mute);
            border-bottom:1px solid var(--rule)">${c}</th>`).join('')}
        </tr></thead>
        <tbody>
        ${rows.map(p=>`<tr>
          <td style="padding:6px 6px;font-size:11.5px;font-weight:600;
            border-bottom:1px solid var(--rule);white-space:nowrap">${p.name||'?'}</td>
          ${cols.map(c=>{
            const v=p[c]||p[c.toLowerCase()]||p[c.toUpperCase()]||'—';
            const raw=parseFloat(String(v).replace(/[^0-9.\-]/g,''));
            // highlight big games: 300+ pass yds, 100+ rush/rec, 1+ TD
            const hot=(c==='YDS'||c==='C/ATT')&&!isNaN(raw)&&raw>=150
              ||(c==='TD')&&!isNaN(raw)&&raw>=1
              ||(c==='SACKS'||c==='TFL')&&!isNaN(raw)&&raw>=1;
            const bad=(c==='INT')&&!isNaN(raw)&&raw>=1;
            return`<td style="text-align:center;padding:6px 5px;font-family:'IBM Plex Mono';
              font-size:11px;color:${hot?'var(--win)':bad?'var(--rust)':'var(--chalk)'};
              border-bottom:1px solid var(--rule)">${v}</td>`;
          }).join('')}
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  };

  // ── Team toggle — same interaction as MLB ─────────────────────────────
  const tkId='_fbBoxTeam_'+g.id;
  const activeTeam=(window[tkId])||'away';
  const toggle=`<div class="subnav" style="margin-top:10px">
    <button class="${activeTeam==='away'?'on':''}"
      onclick="window['${tkId}']='away';fbBoxRefresh('${g.id}','${espnId}','${league}')">
      ${g.away.abbr}</button>
    <button class="${activeTeam==='home'?'on':''}"
      onclick="window['${tkId}']='home';fbBoxRefresh('${g.id}','${espnId}','${league}')">
      ${g.home.abbr}</button>
  </div>`;

  // ── Assemble ──────────────────────────────────────────────────────────
  const box=FB_BOX_CACHE[espnId]||null;
  const linescore=mkLinescore(box);
  let playerSection='<div class="empty" style="padding:14px 0">Loading player stats…</div>';
  if(box&&box.teamStats){
    const abbr=activeTeam==='away'?g.away.abbr:g.home.abbr;
    const st=box.teamStats[abbr]||Object.values(box.teamStats)[activeTeam==='away'?0:1]||{};
    const pasCols=['C/ATT','YDS','AVG','TD','INT','QBR'];
    const rusCols=['CAR','YDS','AVG','TD','LONG'];
    const recCols=['REC','YDS','AVG','TD','LONG','TGTS'];
    const defCols=['TOT','SOLO','SACKS','TFL','PD','INT'];
    playerSection=
      statTable(st.passing,pasCols,abbr+' Passing')
      +statTable(st.rushing,rusCols,abbr+' Rushing')
      +statTable(st.receiving,recCols,abbr+' Receiving')
      +statTable(st.defense,defCols,abbr+' Defense');
    if(!playerSection.trim())
      playerSection='<div class="empty" style="padding:10px 0">No player stats available yet.</div>';
  }

  // Kick off (or refresh) the fetch — same deferred pattern as MLB
  if(!box||Date.now()-box.ts>45000){
    setTimeout(()=>{
      fetchFBBoxscore(espnId,league).then(b=>{
        if(!b)return;
        fbBoxRefresh(g.id,espnId,league);
      });
    },0);
  }

  return`<div style="padding:2px 0">
    ${linescore}
    ${toggle}
    ${playerSection}
    <div style="margin-top:12px;text-align:center">
      <button onclick="delete FB_BOX_CACHE['${espnId}'];fbBoxRefresh('${g.id}','${espnId}','${league}')"
        style="font-family:'IBM Plex Mono';font-size:9px;letter-spacing:.1em;text-transform:uppercase;
        background:transparent;border:1px solid var(--rule);color:var(--mute);
        border-radius:6px;padding:6px 14px;cursor:pointer">↻ Refresh</button>
    </div>
  </div>`;
}
function fbBoxRefresh(gid,espnId,league){
  // Re-render the panel using cached data (or trigger a fetch if stale).
  // Used by the team toggle and the refresh button.
  fetchFBBoxscore(espnId,league).then(()=>{
    const panel=document.getElementById('p-fb-livebox-'+gid);
    if(!panel)return;
    const g=(league==='nfl'?NFL_GAMES:NCAAF_GAMES).find(x=>x.id===gid);
    if(g)panel.innerHTML=fbLiveBoxPanel(g,league);
  });
}

// ── NCAAF Power Ratings (ESPN) ────────────────────────────────────────────────
async function fetchNCAAFPowerRatings(){
  try{
    const url='https://site.api.espn.com/apis/site/v2/sports/football/college-football/standings?season=2025';
    const r=await fetch(url);const j=await r.json();
    /* Two bugs lived here.

       1) KEY MISMATCH. Ratings were stored under the ESPN displayName
          ("TCU Horned Frogs") but simNCAAFGame looked them up as
          NCAAF_POWER[g.awayId || g.away.name] — and g.awayId is referenced in
          exactly one place in the whole app and never assigned anywhere. Any
          team whose schedule name didn't match its standings displayName
          character-for-character missed, silently fell through to the 26/26
          default, and produced the identical 26-30.5 projection on every card.
          Ratings are now indexed under every name ESPN gives us.

       2) FAKE AVERAGES. `stats.pointsFor || gp*26` meant a team with no
          scoring data was assigned exactly league-average instead of being
          left unrated — the same defect the NFL board had, where a placeholder
          gets presented as a projection. Unrated is now unrated. */
    const put=(k,v)=>{if(k)NCAAF_POWER[String(k).trim()]=v;};
    (j.children||[]).forEach(conf=>{
      (conf.standings&&conf.standings.entries||[]).forEach(e=>{
        const tm=e.team||{};
        const stats={};(e.stats||[]).forEach(s=>{stats[s.name]=s.value;});
        const gp=+stats.gamesPlayed||0;
        const pf=+stats.pointsFor||0, pa=+stats.pointsAgainst||0;
        if(gp<1||(!pf&&!pa))return;          // no data -> no rating, not a fake 26
        const rec={offPPG:pf/gp,defPPG:pa/gp,gp,wins:stats.wins||0,losses:stats.losses||0};
        [tm.displayName,tm.shortDisplayName,tm.name,tm.location,tm.abbreviation,tm.id,tm.nickname]
          .forEach(k=>put(k,rec));
      });
    });
    ncaafPowerFlags();
    set('d4.ncaafpower',{ts:Date.now(),v:NCAAF_POWER});
    NCAAF_GAMES.forEach(g=>{
      const ap=ncaafPowerFor(g.away),hp=ncaafPowerFor(g.home);
      /* ap.wins / ap.losses only exist on the ESPN-standings fallback record —
         a CFBD SP+ record has neither field, so this was unconditionally
         building the literal string "undefined-undefined" and OVERWRITING the
         perfectly good "W-L" record the initial schedule parse already put on
         g.away.record straight from ESPN. Only touch it when SP+ actually has
         real win/loss numbers; otherwise leave the existing record alone. */
      if(ap){g.away.offRating=ap.offPPG;g.away.defRating=ap.defPPG;
        if(typeof ap.wins==='number'&&typeof ap.losses==='number')g.away.record=ap.wins+'-'+ap.losses;}
      if(hp){g.home.offRating=hp.offPPG;g.home.defRating=hp.defPPG;
        if(typeof hp.wins==='number'&&typeof hp.losses==='number')g.home.record=hp.wins+'-'+hp.losses;}
    });
    NCAAF_SIMS={};
    if(ACTIVE_SPORT==='ncaaf')renderNCAAF();
    console.log('NCAAF power ratings:',Object.keys(NCAAF_POWER).length,'teams');
  }catch(e){console.warn('NCAAF power ratings failed:',e.message);}
}

// Restore cached power ratings
(function restoreNCAAFPower(){
  const c=get('d4.ncaafpower',{});
  if(c.v&&Object.keys(c.v).length)NCAAF_POWER=c.v;
  ncaafPowerFlags();
})();

// ── NCAAF Schedule (ESPN) ────────────────────────────────────────────────────
async function loadNCAAFSchedule(){
  const el=document.getElementById('slate');
  if(el)el.innerHTML='<div class="empty">Loading CFB schedule…</div>';
  try{
    const url='https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=100';
    const r=await fetch(url);const j=await r.json();
    NCAAF_WEEK=j.week&&j.week.number||1;
    NCAAF_SEASON=j.season&&j.season.year||2025;
    _parseNCAAFEvents(j);
  }catch(e){
    if(el)el.innerHTML=`<div class="empty">Failed to load CFB: ${e.message}</div>`;
  }
}

async function loadNCAAFWeek(season,week){
  if(week<0)week=0;
  const el=document.getElementById('slate');
  if(el)el.innerHTML=`<div class="empty">Loading CFB Week ${week}…</div>`;
  try{
    const url=`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=100&dates=${season}&seasontype=2&week=${week}`;
    const r=await fetch(url);const j=await r.json();
    NCAAF_WEEK=j.week&&j.week.number||week;
    NCAAF_SEASON=j.season&&j.season.year||season;
    _parseNCAAFEvents(j);
  }catch(e){
    if(el)el.innerHTML=`<div class="empty">Failed: ${e.message}</div>`;
  }
}

function _parseNCAAFEvents(j){
  try{fbIngestEspnOdds('ncaaf',j)}catch(err){console.warn('espn odds',err)}
  const events=j.events||[];
  NCAAF_GAMES=events.map(function(e,i){
    const comp=e.competitions[0];
    const away=comp.competitors.find(function(c){return c.homeAway==='away';});
    const home=comp.competitors.find(function(c){return c.homeAway==='home';});
    if(!away||!home)return null;
    const awayName=away.team.displayName||away.team.abbreviation||'???';
    const homeName=home.team.displayName||home.team.abbreviation||'???';
    const awayAbbr=(away.team.abbreviation||'???').toUpperCase();
    const homeAbbr=(home.team.abbreviation||'???').toUpperCase();
    let day='TBD',timeStr='TBD';
    if(e.date){
      const d=new Date(e.date);
      day=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'America/Chicago'});
      timeStr=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
    }
    const ranking=t=>{const r=t.curatedRank&&t.curatedRank.current;return r&&r<=25?`#${r} `:'';};
    return{
      id:e.id||String(i),espnId:e.id||'',week:NCAAF_WEEK||'',
      day,time:timeStr,date:e.date||'',
      /* status text AND the normalized ESPN state both captured — status text
         varies ("Final","Final/OT") but comp.status.type.state is always
         exactly 'pre'/'in'/'post', so grouping and live-refresh below key off
         the reliable field, not a description string that can drift. */
      status:(comp.status&&comp.status.type&&comp.status.type.description)||'Scheduled',
      abstract:(comp.status&&comp.status.type&&comp.status.type.state)||'pre',
      clock:(comp.status&&comp.status.displayClock)||'',
      period:(comp.status&&comp.status.period)||0,
      awayScore:(()=>{const sc=away.score;return sc!=null&&sc!==''?+sc:null})(),
      homeScore:(()=>{const sc=home.score;return sc!=null&&sc!==''?+sc:null})(),
      away:{abbr:awayAbbr,name:awayName,ranking:ranking(away.team),
        offRating:26,defRating:26,record:away.records&&away.records[0]&&away.records[0].summary||''},
      home:{abbr:homeAbbr,name:homeName,ranking:ranking(home.team),
        offRating:26,defRating:26,record:home.records&&home.records[0]&&home.records[0].summary||''},
    };
  }).filter(Boolean);

  /* A hardcoded allowlist of one past week's ~46 matchups used to sit here as
     a freeze workaround — it silently deleted every game on every other week.
     Removed: the slate board renders one kickoff window at a time instead, so
     the full FBS week loads without locking the page. */

  const cacheKey=(NCAAF_SEASON||'')+'w'+(NCAAF_WEEK||'');
  const cache=get(LS.ncaafgames,{});
  cache[cacheKey]={ts:Date.now(),v:NCAAF_GAMES,week:NCAAF_WEEK,season:NCAAF_SEASON};
  set(LS.ncaafgames,cache);
  NCAAF_SIMS={};
  renderNCAAF();
  const nG=document.getElementById('nG');
  if(nG)nG.textContent=NCAAF_GAMES.length;
}

// ── NCAAF render ─────────────────────────────────────────────────────────────
/* ── CFB LIVE SCORE REFRESH ───────────────────────────────────────────────
   MLB has had a 90s live poll since the very first build; CFB never got one.
   The initial schedule parse only ran ONCE, so a game's status field was
   frozen at whatever it was when the week was first loaded — a finished game
   just stayed labelled "Scheduled" forever, which is exactly why final games
   were never sorting into the Final section and no live score ever appeared.
   This re-fetches the SAME scoreboard endpoint and updates status/abstract/
   scores/clock on the EXISTING game objects by id, without discarding sims,
   ratings, or anything else already loaded. */
let NCAAF_LIVE_POLL=null;
async function refreshNCAAFLiveScores(){
  if(!(NCAAF_GAMES||[]).length)return 0;
  try{
    const url=(NCAAF_SEASON&&NCAAF_WEEK)
      ?`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=100&dates=${NCAAF_SEASON}&seasontype=2&week=${NCAAF_WEEK}`
      :'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=100';
    const r=await fetch(url);const j=await r.json();
    const byId={};
    (j.events||[]).forEach(e=>{byId[e.id]=e;});
    let changed=0;
    NCAAF_GAMES.forEach(g=>{
      const e=byId[g.espnId||g.id];if(!e)return;
      const comp=e.competitions&&e.competitions[0];if(!comp)return;
      const away=comp.competitors.find(c=>c.homeAway==='away');
      const home=comp.competitors.find(c=>c.homeAway==='home');
      const newAbstract=(comp.status&&comp.status.type&&comp.status.type.state)||'pre';
      const newStatus=(comp.status&&comp.status.type&&comp.status.type.description)||g.status;
      if(newAbstract!==g.abstract||newStatus!==g.status)changed++;
      g.abstract=newAbstract;g.status=newStatus;
      g.clock=(comp.status&&comp.status.displayClock)||g.clock;
      g.period=(comp.status&&comp.status.period)||g.period;
      if(away){const sc=away.score;g.awayScore=sc!=null&&sc!==''?+sc:g.awayScore;}
      if(home){const sc=home.score;g.homeScore=sc!=null&&sc!==''?+sc:g.homeScore;}
    });
    /* Was gated on "anyLive" — a game currently mid-play. That only ever
       armed the poll for the narrow window something was ACTUALLY live. A
       whole slate sitting at "Scheduled" all morning never had anything
       "live" yet, so the poll never started, and a game that kicked off and
       finished entirely while the tab sat open with nobody watching just
       silently never got rechecked — exactly the symptom of an 11am game
       still reading "Scheduled" at 2pm. Poll as long as ANYTHING in the
       loaded week hasn't reached its final state yet, not just while
       something is mid-play. */
    const anyNotFinal=NCAAF_GAMES.some(g=>g.abstract!=='post');
    if(anyNotFinal&&!NCAAF_LIVE_POLL)NCAAF_LIVE_POLL=setInterval(refreshNCAAFLiveScores,90000);
    if(!anyNotFinal&&NCAAF_LIVE_POLL){clearInterval(NCAAF_LIVE_POLL);NCAAF_LIVE_POLL=null;}
    if(typeof syncFinalsToShared==='function'){try{syncFinalsToShared()}catch(e){}}
    if(changed&&ACTIVE_SPORT==='ncaaf'&&typeof renderNCAAF==='function')renderNCAAF();
    return changed;
  }catch(e){console.warn('CFB live refresh failed',e);return 0;}
}
function renderNCAAF(){
  /* One corrupt or partially-written cached game used to throw inside the sim
     and blank the entire board with no visible error. Drop malformed entries
     instead of letting them take the slate down. */
  NCAAF_GAMES=(NCAAF_GAMES||[]).filter(g=>g&&g.away&&g.home&&g.away.name&&g.home.name);
  try{repairNCAAFKeys()}catch(e){}
  const _nflB=document.getElementById('nflPowerWarn');if(_nflB)_nflB.style.display='none';
  /* Same honesty rule as the NFL board: if nothing real is behind the numbers,
     say so instead of printing an identical confident projection on 99 games. */
  const _cfbWarn=document.getElementById('cfbPowerWarn');
  if(_cfbWarn){
    _cfbWarn.style.display=NCAAF_POWER_FLAT?'block':'none';
    if(NCAAF_POWER_FLAT)_cfbWarn.innerHTML='&#9888; No usable team scoring data loaded ('+
      NCAAF_POWER_RATED+' teams rated). Every projection below is the league-average '+
      'baseline plus home field &mdash; placeholders, not model output. '+
      '<u style="cursor:pointer" onclick="fetchNCAAFPowerRatings()">Retry ratings fetch</u>';
  }

  const el=document.getElementById('slate');if(!el)return;
  if(!NCAAF_GAMES.length){
    el.innerHTML=`<div class="tkt">
      <h3>🏟 College Football Board</h3>
      <div class="sub">No CFB games loaded. Hit the button to pull the current week from ESPN — free, no key needed.</div>
      <div class="bar" style="margin-top:8px">
        <button class="primary" onclick="loadNCAAFSchedule()">Load current week</button>
      </div>
    </div>`;
    return;
  }
  const week=NCAAF_WEEK||'?';const season=NCAAF_SEASON||2025;
  const weekNav=`<div style="display:flex;align-items:center;justify-content:space-between;
    padding:10px 12px;background:var(--panel2);border-radius:8px;margin-bottom:10px">
    <button onclick="loadNCAAFWeek(${season},${Number(week)-1})" style="background:none;border:1px solid var(--rule);
      color:var(--chalk);border-radius:6px;padding:4px 12px;cursor:pointer;font-size:13px">← Prev</button>
    <div style="text-align:center">
      <div style="font-family:'IBM Plex Mono';font-size:11px;color:var(--gold);text-transform:uppercase">🏟 ${season} CFB</div>
      <div style="font-weight:700;font-size:16px;color:var(--chalk)">${week===0?'Week 0':week<=4?'Week '+week+' (Early)':'Week '+week}</div>
      <div style="font-size:11px;color:var(--chalk-dim)">${NCAAF_GAMES.length} games</div>
    </div>
    <button onclick="loadNCAAFWeek(${season},${Number(week)+1})" style="background:none;border:1px solid var(--rule);
      color:var(--chalk);border-radius:6px;padding:4px 12px;cursor:pointer;font-size:13px">Next →</button>
  </div>`;
  /* Was filtering on the exact status TEXT ("Final","In Progress"), which
     ESPN doesn't guarantee stays constant across every game (overtime games,
     postponements, and different description strings for the same state all
     exist). g.abstract is ESPN's own normalized state ('pre'/'in'/'post') and
     is far more reliable — fall back to the text only for games that predate
     this fix and have no abstract field yet at all. */
  const isFinalGame=g=>g.abstract==='post'||(!g.abstract&&(g.status==='Final'||g.status==='Final/OT'));
  const scheduled=NCAAF_GAMES.filter(g=>!isFinalGame(g));
  // Snapshot + grade BEFORE filtering display — same rule as NFL: every
  // final game gets attributed to the record store regardless of card visibility.
  try{snapshotNCAAF();gradeNCAAFResults();}catch(e){console.warn('CFB snapshot/grade:',e);}
  // Cards for finals stay visible for 24h after kickoff, then drop off the
  // board so a full 99-game Week 1 slate of finals doesn't sit there forever
  // rendering sim + analysis panels that will never change. Game is still
  // fully graded above — this only controls what's shown.
  const HIDE_AFTER_MS_CFB=24*60*60*1000;
  const nowCfb=Date.now();
  const final=NCAAF_GAMES.filter(g=>{
    if(!isFinalGame(g))return false;
    const kickoff=g.date?new Date(g.date).getTime():0;
    return kickoff&&(nowCfb-kickoff)<HIDE_AFTER_MS_CFB;
  });
  /* Same fix as MLB and NFL: don't let a background poller repaint the CFB
     board over whatever sport is actually on screen. */
  document.getElementById('nG').textContent=NCAAF_GAMES.length;
  if(ACTIVE_SPORT!=='ncaaf')return;
  /* ── SLATE BOARD ─────────────────────────────────────────────────────────
     The board used to sim all ~99 games (10,000 runs each) and build every
     full card in one synchronous pass — about a million sim iterations on the
     main thread before the first pixel, which is the freeze. Now the week is
     split into kickoff windows; only the chosen window is simulated, in small
     chunks that yield to the browser, and cards paint as soon as their sims
     finish. A stale pass is cancelled the moment you tap another slate. */
  const visible=[...scheduled,...final];
  const slates=ncaafBuildSlates(visible);
  const wk=String(season)+'-'+String(week);
  if(NCAAF_SLATE_WEEK!==wk){NCAAF_SLATE_WEEK=wk;NCAAF_SLATE=null;}
  if(!NCAAF_SLATE||!slates.some(x=>x.key===NCAAF_SLATE))NCAAF_SLATE=ncaafDefaultSlate(slates);
  const cur=slates.find(x=>x.key===NCAAF_SLATE)||slates[0];
  const games=cur?cur.games:[];
  const chip=(key,label,n,sub)=>{
    const on=key===NCAAF_SLATE;
    return`<button onclick="ncaafPickSlate('${key}')" style="flex:0 0 auto;min-width:74px;padding:7px 10px;border-radius:9px;cursor:pointer;
      border:1px solid ${on?'var(--gold)':'var(--rule)'};background:${on?'var(--gold)':'var(--panel2)'};color:${on?'#000':'var(--chalk)'};
      font-weight:800;font-size:12px;line-height:1.2;text-align:center">${label}
      <div style="font-family:'IBM Plex Mono';font-size:9.5px;font-weight:600;opacity:.8">${n} game${n===1?'':'s'}${sub?' · '+sub:''}</div></button>`;
  };
  let h=weekNav;
  h+=`<div style="display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:2px 0 10px;scrollbar-width:none">
    ${slates.map(x=>chip(x.key,x.label,x.games.length,x.live?'<span style="color:'+(x.key===NCAAF_SLATE?'#000':'var(--rust)')+'">●LIVE</span>':'')).join('')}</div>`;
  h+=`<div class="bar" style="margin:-4px 0 10px"><button onclick="refreshNCAAFLiveScores()">↻ Refresh scores</button></div>`;
  h+=`<div id="cfbSlateBody"></div>`;
  el.innerHTML=h;
  ncaafPaintSlate(games);
}

let NCAAF_SLATE=null,NCAAF_SLATE_WEEK=null,NCAAF_PAINT_TOKEN=0;
const NCAAF_TZ='America/Chicago';
/* Central-time parts for a kickoff — every window boundary below is CT, the
   same clock the book (sportsbetting.ag) posts in. */
function ncaafKickParts(g){
  const t=g&&g.date?new Date(g.date):null;
  if(!t||isNaN(t))return null;
  const p={};
  new Intl.DateTimeFormat('en-US',{timeZone:NCAAF_TZ,weekday:'short',hour:'numeric',minute:'numeric',hour12:false,
    year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(t).forEach(x=>p[x.type]=x.value);
  const hr=(+p.hour)%24,mn=+p.minute;
  return{day:p.weekday,date:p.year+'-'+p.month+'-'+p.day,mins:hr*60+mn};
}
/* Saturday splits into the four TV windows the sport actually runs on;
   any other day (Tue/Wed/Thu/Fri MACtion, Sunday, etc.) is its own slate. */
function ncaafWindowOf(g){
  const k=ncaafKickParts(g);
  if(!k)return{key:'tbd',label:'TBD',order:99999};
  const dayOrder={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
  const base=(dayOrder[k.day]!=null?dayOrder[k.day]:7)*10000;
  if(k.day==='Sat'){
    /* CT windows: 11:00 (noon ET) · 1:00–2:00 · 2:30 (3:30 ET) · 6:00+ primetime */
    if(k.mins<12*60)      return{key:'sat-early',label:'Early',order:base+1};
    if(k.mins<14*60+15)   return{key:'sat-mid',  label:'Midday',order:base+2};
    if(k.mins<17*60+30)   return{key:'sat-aft',  label:'Afternoon',order:base+3};
    return                       {key:'sat-late', label:'Late',order:base+4};
  }
  return{key:'d-'+k.date,label:k.day,order:base};
}
const ncaafIsLive=g=>g.abstract==='in'||(!g.abstract&&/progress|half|quarter/i.test(g.status||''));
const ncaafIsFinal=g=>g.abstract==='post'||(!g.abstract&&/^final/i.test(g.status||''));
function ncaafBuildSlates(games){
  const map={};
  games.forEach(g=>{
    const w=ncaafWindowOf(g);
    (map[w.key]||(map[w.key]={key:w.key,label:w.label,order:w.order,games:[]})).games.push(g);
  });
  const out=Object.values(map).sort((a,b)=>a.order-b.order);
  out.forEach(x=>{
    x.live=x.games.some(ncaafIsLive);
    x.done=x.games.every(ncaafIsFinal);
    x.games.sort((a,b)=>(new Date(a.date)-new Date(b.date))||
      ((ncaafIsLive(b)?1:0)-(ncaafIsLive(a)?1:0)));
  });
  /* Cross-cutting views on top of the time windows: the games you actually
     have book lines for (where a bet can happen), and everything live. */
  const withLines=games.filter(g=>ncaafBookLinesFor(g.away.abbr+'@'+g.home.abbr).length);
  if(withLines.length)out.unshift({key:'lines',label:'My Lines',order:-2,games:withLines,
    live:withLines.some(ncaafIsLive),done:withLines.every(ncaafIsFinal)});
  const live=games.filter(ncaafIsLive);
  if(live.length)out.unshift({key:'live',label:'Live Now',order:-3,games:live,live:true,done:false});
  return out;
}
/* Land where the action is: live games first, then the next window that
   hasn't finished, then the last window of the week. */
function ncaafDefaultSlate(slates){
  if(!slates.length)return null;
  const timed=slates.filter(x=>x.key!=='lines'&&x.key!=='live');
  const liveW=timed.find(x=>x.live);if(liveW)return liveW.key;
  const next=timed.find(x=>!x.done);if(next)return next.key;
  return(timed[timed.length-1]||slates[0]).key;
}
function ncaafPickSlate(key){
  NCAAF_SLATE=key;
  renderNCAAF();
  const b=document.getElementById('cfbSlateBody');
  if(b&&b.scrollIntoView)try{b.scrollIntoView({block:'start',behavior:'smooth'})}catch(e){}
}
/* Sims only this slate, a few games per frame, painting cards as they land.
   Sims are cached in NCAAF_SIMS, so returning to a slate is instant. */
function ncaafPaintSlate(games){
  const body=document.getElementById('cfbSlateBody');if(!body)return;
  const token=++NCAAF_PAINT_TOKEN;
  if(!games.length){body.innerHTML='<div class="empty">No games in this window.</div>';return;}
  const live=games.filter(ncaafIsLive),fin=games.filter(ncaafIsFinal),
        up=games.filter(g=>!ncaafIsLive(g)&&!ncaafIsFinal(g));
  const groups=[['Live',live],['Upcoming',up],['Final',fin]].filter(x=>x[1].length);
  body.innerHTML=groups.map(([t,arr],i)=>sbar(t,arr.length)+
    `<div id="cfbGrp${i}">${arr.map(g=>`<div data-gid="${g.id}">${NCAAF_SIMS[g.id]?ncaafCard(g):
      `<div class="tkt" style="opacity:.55;padding:12px"><b>${g.away.name}</b> @ <b>${g.home.name}</b>
        <div class="sub mono" style="font-size:10px">running sim…</div></div>`}</div>`).join('')}</div>`).join('');
  const queue=games.filter(g=>!NCAAF_SIMS[g.id]);
  const step=()=>{
    if(token!==NCAAF_PAINT_TOKEN||ACTIVE_SPORT!=='ncaaf')return; // user moved on
    const t0=performance.now();
    while(queue.length&&performance.now()-t0<24){
      const g=queue.shift();
      try{NCAAF_SIMS[g.id]=simNCAAFGame(g);}catch(e){console.warn('CFB sim failed',g&&g.id,e);continue;}
      const slot=body.querySelector('[data-gid="'+g.id+'"]');
      if(slot)slot.innerHTML=ncaafCard(g);
    }
    if(queue.length)setTimeout(step,0);else ncaafBackfillLined();
  };
  if(queue.length)setTimeout(step,0);else ncaafBackfillLined();
}
/* Picks need a sim. With lazy slates, a game you have lines for but never
   opened would never get one — so after the visible slate finishes, quietly
   sim just the lined games (not all 99) in the same yielding chunks, then
   snapshot so their model picks are captured before kickoff. */
let NCAAF_BACKFILL=false;
function ncaafBackfillLined(){
  if(NCAAF_BACKFILL)return;
  const q=NCAAF_GAMES.filter(g=>!NCAAF_SIMS[g.id]&&(g.abstract||'pre')==='pre'&&
    ncaafBookLinesFor(g.away.abbr+'@'+g.home.abbr).length);
  if(!q.length){try{snapshotNCAAF()}catch(e){}return;}
  NCAAF_BACKFILL=true;
  const step=()=>{
    const t0=performance.now();
    while(q.length&&performance.now()-t0<16){const g=q.shift();try{NCAAF_SIMS[g.id]=simNCAAFGame(g)}catch(e){}}
    if(q.length)return setTimeout(step,30);
    NCAAF_BACKFILL=false;try{snapshotNCAAF()}catch(e){}
  };
  setTimeout(step,250);
}

// ── NCAAF game card ───────────────────────────────────────────────────────────
/* ── Item 8+7: Analysis panel + trend-adjusted projection (mirrors TheDesk.html) */
/* ── ITEM 8: POST-GAME ANALYSIS PANEL ─────────────────────────────────────
   Appears on Final cards. Shows where the model was right/wrong, where the
   book was right/wrong, which trends fired, and what to calibrate from this.
   Feeds into the calibration narrative — not just a number but a reason. */

/* Uploaded predicted score (Covers etc.) shown under the sim's own number,
   with the gap between them — the disagreement is the interesting part. */
function fbPredLine(g,sport,ap,hp){
  if(typeof predFor!=='function')return'';
  const p=predFor(sport,g.away.abbr+'@'+g.home.abbr);if(!p)return'';
  let gap='';
  if(ap!=null&&hp!=null&&!isNaN(ap)&&!isNaN(hp)){
    const dm=Math.round(((p.h-p.a)-(hp-ap))*10)/10,dt=Math.round(((p.a+p.h)-(ap+hp))*10)/10;
    gap=`<span style="color:var(--mute);margin-left:5px">vs sim: margin ${dm>0?'+':''}${dm} · total ${dt>0?'+':''}${dt}</span>`;}
  return`<div style="font-family:'IBM Plex Mono';font-size:9px;color:var(--gold);margin-top:2px">`+
    `pred ${g.away.abbr} ${p.a} – ${p.h} ${g.home.abbr}${gap}</div>`;
}
function fbAnalysisPanel(g,s,sport){
  const aA=g.awayScore!=null&&g.awayScore!==''?+g.awayScore:null;
  const hA=g.homeScore!=null&&g.homeScore!==''?+g.homeScore:null;
  if(aA==null||hA==null)return '<div class="empty">No final score yet.</div>';
  const linesFor=sport==='nfl'?nflBookLinesFor:ncaafBookLinesFor;
  const gameKey=g.away.abbr+'@'+g.home.abbr;
  const lines=linesFor(gameKey);
  const projM=Math.round(((s&&s.homeProj)||0)-((s&&s.awayProj)||0));
  const actualM=hA-aA;
  const projTot=(s&&s.med)||0;
  const actualTot=aA+hA;
  const projW=projM>0?g.home.abbr:g.away.abbr;
  const actualW=actualM>0?g.home.abbr:actualM<0?g.away.abbr:'TIE';
  const modelSideHit=projW===actualW;
  const modelTotErr=Math.abs(projTot-actualTot);
  const modelSpreadErr=Math.abs(projM-actualM);
  // book performance
  const bookSpread=lines.find(x=>x.market==='spread'&&x.side==='home');
  const bookSpreadHit=bookSpread?((bookSpread.line>0?(hA-aA>bookSpread.line):(hA-aA>bookSpread.line))):null;
  const bookTotal=lines.find(x=>x.market==='total'&&x.side==='over');
  const bookTotalHit=bookTotal?(actualTot>bookTotal.line):null;
  const bookML=lines.find(x=>x.market==='moneyline'&&x.side==='home');
  const bookFavHome=bookML&&bookML.price<0;
  const bookSideHit=bookML?(bookFavHome?(hA>aA):(aA>hA)):null;
  const row=(label,hit,detail)=>`<div class="rc-row" style="margin:4px 0">
    <div><div class="g">${label}</div><div class="p">${detail||''}</div></div>
    <div class="r" style="color:${hit===true?'var(--win)':hit===false?'var(--rust)':'var(--mute)'}">
      ${hit===true?'✓ HIT':hit===false?'✗ MISS':'—'}</div></div>`;
  const scoreColor=modelSpreadErr<=7?'var(--win)':modelSpreadErr<=14?'var(--gold)':'var(--rust)';
  const h=`<div style="padding:8px 0">
    <div style="font-family:'IBM Plex Mono';font-size:9px;color:var(--mute);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Post-game breakdown</div>
    <div class="rc-list"><h5>Model</h5>
      ${row('Side pick',modelSideHit,`Projected ${projW} by ${Math.abs(projM)}, actual ${actualW} by ${Math.abs(actualM)}`)}
      ${row('Total',modelTotErr<7?true:modelTotErr<14?null:false,`Projected ${projTot.toFixed(1)}, actual ${actualTot} (off by ${modelTotErr.toFixed(0)} pts)`)}
      <div class="p" style="font-size:9.5px;padding-top:4px;color:${scoreColor}">Margin error: ${modelSpreadErr} pts — ${modelSpreadErr<=7?'normal variance':modelSpreadErr<=14?'notable miss':'bad miss'}</div>
    </div>
    ${lines.length?`<div class="rc-list" style="margin-top:8px"><h5>Book</h5>
      ${bookML?row('Moneyline favorite',bookSideHit,bookFavHome?g.home.abbr+' favored':g.away.abbr+' favored'):''}
      ${bookSpread?row('Spread',bookSpreadHit,g.home.abbr+' '+(bookSpread.line>0?'+':'')+bookSpread.line):''}
      ${bookTotal?row('Total',bookTotalHit,(bookTotal.line>0?'O/U '+bookTotal.line:'')):''}
    </div>`:''}
    <div style="margin-top:8px;padding:8px;background:var(--panel2);border-radius:6px;font-size:11px;color:var(--mute)">
      <b style="color:var(--chalk)">Calibration note:</b>
      Model ${modelSideHit?'called the winner correctly':'missed the winner'} and was ${modelSpreadErr<=7?'within normal variance on the margin':'off on the margin by '+modelSpreadErr+' pts'}.
      ${modelTotErr<7?' Total projection was sharp.':` Total was off by ${modelTotErr.toFixed(0)} pts — ${projTot>actualTot?'model ran hot, sim overprojects scoring':'model ran cold, sim underprojects scoring'}.`}
      This result is included in your calibration score.
    </div>
  </div>`;
  return h;
}

/* ── ITEM 7: TREND-ADJUSTED PROJECTION ────────────────────────────────────────
   The raw sim (projW/projM) is computed before any trend or calibration data
   is available. Once the board has real trends loaded, compute a second
   "adjusted" projection that layers trend signals on top: if every trend for
   a game points Under, reduce the projected total slightly; if the system has
   strong ATS history on one side, nudge the win probability. Shows both numbers
   on the card so you can see how much the signal moved.
   Returns {adjAway, adjHome, adjMed, drift} or null if no adjustment needed. */
function computeTrendAdjustedProjection(g,s,sport){
  if(!s||!s.awayProj||!s.homeProj||!s.med)return null;
  const linesFor=sport==='nfl'?nflBookLinesFor:ncaafBookLinesFor;
  const gameKey=g.away.abbr+'@'+g.home.abbr;
  // Collect trend signals from applicableTrends if available
  let totalNudge=0,sideNudge=0,trendCount=0;
  try{
    const trends=applicableTrends(g,s,sport);
    (trends||[]).forEach(t=>{
      const txt=String(t.text||t||'').toLowerCase();
      // Under trends → nudge total down
      if(/under.*\b[5-9]\d*%|under.*is \d+-[01]\b/.test(txt)){totalNudge-=1.5;trendCount++;}
      if(/over.*\b[5-9]\d*%|over.*is \d+-[01]\b/.test(txt)){totalNudge+=1.5;trendCount++;}
      // ATS trends for a specific team → nudge win prob
      if(new RegExp(g.away.abbr+'.*ats.*\\d+-[01]\\b','i').test(txt)){sideNudge-=0.04;trendCount++;}
      if(new RegExp(g.home.abbr+'.*ats.*\\d+-[01]\\b','i').test(txt)){sideNudge+=0.04;trendCount++;}
    });
  }catch(e){}
  // Global calibration drift (already computed, free to apply)
  const drift=globalDriftAdj?globalDriftAdj():0;
  if(Math.abs(totalNudge)<0.1&&Math.abs(sideNudge)<0.01&&Math.abs(drift)<0.05)return null;
  const adjMed=Math.max(20,s.med+(totalNudge*0.5)+(drift*2));
  const rawMargin=s.homeProj-s.awayProj;
  const adjMargin=rawMargin+(sideNudge*20);
  const adjHome=(adjMed+adjMargin)/2;
  const adjAway=(adjMed-adjMargin)/2;
  return{adjAway:+adjAway.toFixed(1),adjHome:+adjHome.toFixed(1),adjMed:+adjMed.toFixed(1),
    trendCount,drift:+drift.toFixed(2),nudge:totalNudge};
}

function ncaafPropsPanel(g){
  const apiProps=(get('d4.ncaafprops',{})[today()]||[])
    .filter(p=>p.game&&(p.game.includes(g.away.abbr)||p.game.includes(g.home.abbr)));
  if(!apiProps.length)return '<div class="empty">No CFB player props yet — tap ⚡ Pull odds to fetch them from The Odds API.</div>';
  return`<div style="font-family:'IBM Plex Mono';font-size:10.5px;padding:4px 0">
    <div style="font-size:9px;color:var(--mute);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Player props · from The Odds API</div>
    ${apiProps.map(p=>`<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:4px">
      <span style="color:var(--chalk)">${p.player}</span>
      <span style="color:var(--mute)">${p.stat.replace(/_/g,' ')} ${p.line} ${p.side} <span style="color:var(--gold)">${p.price>0?'+':''}${p.price}</span></span>
    </div>`).join('')}
  </div>`;
}
function ncaafCard(g){
  const s=NCAAF_SIMS[g.id];if(!s)return'';
  const cfbLive=g.abstract==='in'||g.status==='InProgress'||g.status==='Halftime';
  const cfbFinal=g.abstract==='post'||g.status==='Final';
  const gameKey=g.away.abbr+'@'+g.home.abbr;
  const lines=ncaafBookLinesFor(gameKey);
  const hasReal=lines.length>0;
  const awaySpread=lines.find(x=>x.market==='spread'&&x.side==='away');
  const homeSpread=lines.find(x=>x.market==='spread'&&x.side==='home');
  const awayML=lines.find(x=>x.market==='moneyline'&&x.side==='away');
  const homeML=lines.find(x=>x.market==='moneyline'&&x.side==='home');
  const totalOver=lines.find(x=>x.market==='total'&&x.side==='over');
  const totalUnder=lines.find(x=>x.market==='total'&&x.side==='under');
  const cons=ncaafConsensusFor(gameKey);
  const consML=cons.find(x=>x.market==='moneyline');
  const ap=isNaN(s.awayProj)?26:s.awayProj;
  const hp=isNaN(s.homeProj)?26:s.homeProj;
  const med=isNaN(s.med)?52:s.med;
  const margin=isNaN(s.medMargin)?0:s.medMargin;
  const awayFairML=nflFairML(Math.max(.05,Math.min(.95,s.aw||.5)));
  const homeFairML=nflFairML(Math.max(.05,Math.min(.95,s.hw||.5)));
  /* Was the same broken measure the NFL board had: book price minus fair price,
     subtracting two American odds numbers across the ±100 discontinuity, with
     the opposite square rendered as the negation of the first. Now each side is
     priced against its own simulated probability and reported as EV%. */
  const clampP=p=>Math.max(.02,Math.min(.98,(p==null||isNaN(p))?.5:p));
  const mk=(p,price)=>{
    if(price==null)return null;
    const P=clampP(p);
    return{p:P,price,fair:nflFairML(P),ev:evPct(P,price),impl:amerToProb(price)};
  };
  const eAwaySpread = awaySpread ? mk(s.awayCover(awaySpread.line), awaySpread.price) : null;
  const eHomeSpread = homeSpread ? mk(s.homeCover(homeSpread.line), homeSpread.price) : null;
  const eAwayML     = awayML     ? mk(s.aw, awayML.price) : null;
  const eHomeML     = homeML     ? mk(s.hw, homeML.price) : null;
  const eOver       = totalOver  ? mk(s.over(totalOver.line), totalOver.price) : null;
  const eUnder      = totalUnder ? mk(1-s.over(totalUnder.line), totalUnder.price) : null;
  const sgn=n=>n==null?'':(n>0?'+'+n:''+n);
  const simAwPct=Math.round(s.aw*100)+'%', simHmPct=Math.round(s.hw*100)+'%';
  const simTotVal=(s.med||0).toFixed(1);
  const simMargin=(s.homeProj-s.awayProj);
  const simHomeSpread=(simMargin>=0?'-':'+')+Math.abs(simMargin).toFixed(1);
  const simAwaySpread=(simMargin>=0?'+':'-')+Math.abs(simMargin).toFixed(1);
  const spreadLabel=margin>0?`${g.home.abbr} -${margin}`:margin<0?`${g.away.abbr} -${Math.abs(margin)}`:"Pick'em";
  const realBadge=hasReal?`<span style="font-family:'IBM Plex Mono';font-size:8px;color:var(--cold);border:1px solid var(--cold);border-radius:3px;padding:1px 4px;margin-left:4px">REAL</span>`:'';
  function cfbSq(label,pick,e,simVal){
    if(!e){
      const sp=typeof simVal==='string'?simVal:(simVal!=null?(+simVal*100).toFixed(0)+'%':'—');
      return`<div class="bet" role="button" tabindex="0">
        <div class="bl">${label}</div>
        <div class="bo" style="color:var(--mute)">${sp}</div>
        <div class="bs">sim only</div>
        <div class="bf" style="color:var(--mute)">no real line uploaded yet</div>
      </div>`;
    }
    const mp=e.p,kp=e.impl,pct=Math.round(kp*100);
    const priceStr=(e.price>0?'+':'')+e.price;
    let cls='',badge='';
    const gap=(mp-kp)*100;
    if(gap>=EDGE_MIN){cls=' value';badge=`<span class="eb up">+${gap.toFixed(1)}</span>`}
    else if(gap<=-EDGE_MIN){cls=' avoid';badge=`<span class="eb dn">${gap.toFixed(1)}</span>`}
    const fair=`<div class="bf">model ${(mp*100).toFixed(0)}% · fair ${e.fair>0?'+':''}${e.fair}`
      +` · <span style="color:${e.ev>=2?'var(--win)':e.ev<0?'var(--rust)':'var(--mute)'}">`
      +`${e.ev>=0?'+':''}${e.ev.toFixed(1)}% EV</span></div>`;
    const simChip=simVal!==undefined?`<div class="sim-chip">sim ${simVal}</div>`:'';
    // same three-signal alignment tiers the MLB and NFL squares use
    const bookLeans=typeof kp==='number'&&kp>=0.58;
    const modelEdgeHere=cls===' value', modelAgainstHere=cls===' avoid';
    let srcCls='',srcBadge='',outsideAgrees=false,outsideUnanimous=false,outsideAgainst=false;
    const extHere=(typeof ncaafExtFor==='function')?ncaafExtFor(gameKey):[];
    if(extHere&&extHere.length){
      const sameMkt=extHere.filter(x=>nflMarketMatchesPick(x,pick));
      const onThis=sameMkt.filter(x=>nflPickMatchesSide(x,pick));
      if(onThis.length){
        const srcMkt=new Set(sameMkt.map(x=>x.src||'upload')), srcThis=new Set(onThis.map(x=>x.src||'upload'));
        outsideUnanimous=srcMkt.size>=2&&srcThis.size===srcMkt.size;
        outsideAgrees=true;
        srcBadge=`<div class="src-tag${outsideUnanimous?' unanimous':''}">${outsideUnanimous?'★ unanimous':srcThis.size+' source'+(srcThis.size>1?'s':'')}</div>`;
      }else if(sameMkt.length)outsideAgainst=true;
    }
    const signalsFor=[bookLeans,modelEdgeHere,outsideAgrees].filter(Boolean).length;
    const hasConflict=(modelAgainstHere&&(bookLeans||outsideAgrees))||(outsideAgainst&&(bookLeans||modelEdgeHere));
    let tierCls='';
    if(hasConflict)tierCls=' conflict';
    else if(signalsFor>=3||(signalsFor>=2&&outsideUnanimous))tierCls=' supreme';
    else if(signalsFor>=2)tierCls=' strong';
    else if(signalsFor>=1)tierCls=' lean';
    if(outsideAgrees)srcCls=outsideUnanimous?' consensus-pick':' source-pick';
    const tierBadge=tierCls===' supreme'?`<div class="tier-tag supreme">◆ SUPREME</div>`
      :tierCls===' strong'?`<div class="tier-tag strong">STRONG</div>`
      :tierCls===' conflict'?`<div class="tier-tag conflict">⚠ CONFLICT</div>`:'';
    return`<div class="bet${cls}${srcCls}${tierCls}" role="button" tabindex="0"
      onclick="ncaafSlipToggle('${g.id}','${String(pick).replace(/'/g,"\\'")}',${e.price})">
      <div class="bl">${label}</div>${simChip}<div class="bo">${priceStr}</div>
      <div class="bs">${badge||pct+'%'}</div>${fair}${srcBadge}${tierBadge}</div>`;
  }
  const awayRank=g.away.ranking||'';const homeRank=g.home.ranking||'';
  const id=g.id;

  /* ── ITEM 6: TOP/BOTTOM 5% HIGHLIGHTS ─────────────────────────────────────
     Calculate percentiles across all loaded teams for offense and defense.
     Highlight elite/poor units directly on the card, same way MLB flags
     park factors and ERA tiers. Uses SP+ offPPG/defPPG already in NCAAF_POWER. */
  const pctileChips=(()=>{
    const vals=Object.values(NCAAF_POWER||{}).filter(v=>v&&typeof v.offPPG==='number');
    if(vals.length<10)return'';
    const offs=vals.map(v=>v.offPPG).sort((a,b)=>a-b);
    const defs=vals.map(v=>v.defPPG).sort((a,b)=>a-b);
    const pctile=(arr,val)=>arr.filter(v=>v<=val).length/arr.length;
    const chip=(txt,hi)=>`<span class="sigchip" style="background:${hi?'rgba(95,211,232,.12)':'rgba(240,86,60,.12)'};color:${hi?'var(--cold)':'var(--rust)'};">${txt}</span>`;
    const chips=[];
    const aPow=NCAAF_POWER[g.away.name]||NCAAF_POWER[g.away.abbr];
    const hPow=NCAAF_POWER[g.home.name]||NCAAF_POWER[g.home.abbr];
    if(aPow){
      const offP=pctile(offs,aPow.offPPG);const defP=pctile(defs,aPow.defPPG);
      if(offP>=.95)chips.push(chip('🔥 '+g.away.abbr+' OFFENSE TOP 5%',true));
      if(offP<=.05)chips.push(chip('❄ '+g.away.abbr+' OFFENSE BOT 5%',false));
      if(defP<=.05)chips.push(chip('🔒 '+g.away.abbr+' DEFENSE TOP 5%',true));// low defPPG = elite
      if(defP>=.95)chips.push(chip('💥 '+g.away.abbr+' DEFENSE BOT 5%',false));
    }
    if(hPow){
      const offP=pctile(offs,hPow.offPPG);const defP=pctile(defs,hPow.defPPG);
      if(offP>=.95)chips.push(chip('🔥 '+g.home.abbr+' OFFENSE TOP 5%',true));
      if(offP<=.05)chips.push(chip('❄ '+g.home.abbr+' OFFENSE BOT 5%',false));
      if(defP<=.05)chips.push(chip('🔒 '+g.home.abbr+' DEFENSE TOP 5%',true));
      if(defP>=.95)chips.push(chip('💥 '+g.home.abbr+' DEFENSE BOT 5%',false));
    }
    return chips.length?`<div class="sig" style="margin-top:4px">${chips.join('')}</div>`:'';
  })();

  /* ── ITEM 9: TEAM SPOTLIGHT ────────────────────────────────────────────────
     Read the team ledger for both teams. Flag if the SYSTEM, the BOOK, or
     YOU (user bets) have a notable win/loss pattern with either team.
     Same signal as MLB's home-run-park or ERA flags — just for team history. */
  const spotlightChips=(()=>{
    let L;try{L=buildTeamLedger()}catch(e){return'';}
    const chip=(txt,good)=>`<span class="sigchip" style="background:${good?'rgba(95,211,232,.08)':'rgba(240,86,60,.08)'};color:${good?'var(--cold)':'var(--rust)'};border:1px solid ${good?'var(--cold)':'var(--rust)'};">${txt}</span>`;
    const chips=[];
    [g.away.abbr,g.home.abbr].forEach(ab=>{
      const t=L[ab];if(!t||t.n<4)return; // need at least 4 graded bets to flag
      const sideWin=t.sideW/(t.sideW+t.sideL||1);
      const sysScores=systemScorecard?.(null,null,ab)||null;
      // your betting record with this team
      if(t.sideW+t.sideL>=4){
        if(sideWin>=.75)chips.push(chip('✅ '+ab+' GOLDEN ('+t.sideW+'-'+t.sideL+')',true));
        if(sideWin<=.25)chips.push(chip('⚠ '+ab+' AVOID ('+t.sideW+'-'+t.sideL+')',false));
      }
    });
    return chips.length?`<div class="sig" style="margin-top:2px">${chips.join('')}</div>`:'';
  })();

  return`<div class="tkt" id="ncaaf-card-${id}" style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
      <div>
        <div style="font-size:16px;font-weight:800;color:var(--chalk)">${awayRank}${g.away.abbr} <span style="color:var(--mute);font-size:13px">@</span> ${homeRank}${g.home.abbr}</div>
        <div style="font-size:10px;color:var(--mute);font-family:'IBM Plex Mono'">${g.day||''} ${g.time||''}</div>
        <div style="font-size:10px;color:var(--chalk-dim)">${g.away.name} @ ${g.home.name}</div>
      </div>
      <div style="text-align:right;font-family:'IBM Plex Mono';font-size:9px;color:var(--mute)">
        ${g.away.record||''}<br>${g.home.record||''}
      </div>
    </div>
    ${(g.abstract==='in')?fbLiveScoreBar(g,'ncaaf'):
      (g.abstract==='post'||g.status==='Final')
      ?fbFinalHeadline(g,s,'ncaaf')
      :NCAAF_POWER_FLAT
         ?`<div class="proj"><div class="sc" style="color:var(--mute)">${g.away.abbr} — – — ${g.home.abbr}</div><div class="rd" style="color:var(--rust)">ratings not loaded</div>${fbPredLine(g,'ncaaf',null,null)}${fbJudgeBlock(g,s,'ncaaf')}</div>`
         :(()=>{
             /* ITEM 7: show both raw sim AND trend/calibration-adjusted projection */
             const adj=computeTrendAdjustedProjection(g,s,'ncaaf');
             const raw=`${g.away.abbr} ${ap} – ${hp} ${g.home.abbr}`;
             const adjLine=adj?`<div style="font-family:'IBM Plex Mono';font-size:9px;color:var(--cold);margin-top:2px">`
               +`adj ${g.away.abbr} ${adj.adjAway} – ${adj.adjHome} ${g.home.abbr}`
               +`<span style="color:var(--mute);margin-left:5px">${adj.trendCount} trend${adj.trendCount!==1?'s':''}</span></div>`:'';
             return `<div class="proj"><div class="sc">${raw}</div><div class="rd">${Math.round(ap)}–${Math.round(hp)}</div>${adjLine}${fbPredLine(g,'ncaaf',ap,hp)}${fbJudgeBlock(g,s,'ncaaf')}</div>`;
           })()}
    <div class="sig">
      <div class="sigchip">O/U <b>${NCAAF_POWER_FLAT?'—':med}</b> · ${spreadLabel}</div>
      ${(()=>{try{return teamRecordChip(g.away.abbr)+teamRecordChip(g.home.abbr)
        +frozenChip(g,s,'ncaaf')+takeFadeChip(g,s,'ncaaf')+systemFormChip('ncaaf')}catch(e){return''}})()}
      ${(()=>{try{
        if(NCAAF_POWER_FLAT)return'';
        if(!awaySpread&&!totalOver)return'';
        const edges=[];
        if(awaySpread&&s.awayCover){const p=s.awayCover(awaySpread.line);const ev=evPct(p,awaySpread.price);edges.push({side:g.away.abbr+' '+(awaySpread.line>0?'+':'')+awaySpread.line,ev});}
        if(totalOver&&s.over){const p=s.over(totalOver.line);const ev=evPct(p,totalOver.price);edges.push({side:'Over '+totalOver.line,ev});}
        if(!edges.length)return'';
        const best=edges.sort((a,b)=>b.ev-a.ev)[0];
        if(Math.abs(best.ev)<2)return`<div class="sigchip">NO EDGE · BEST ${best.ev>=0?'+':''}${best.ev.toFixed(1)}% EV</div>`;
        return`<div class="sigchip" style="color:var(--win);border-color:rgba(46,204,113,.45)">EDGE · ${best.side} · ${best.ev>=0?'+':''}${best.ev.toFixed(1)}% EV</div>`;
      }catch(e_){return''}})()}
      ${g.away.record?`<div class="sigchip">${g.away.abbr} <b>${g.away.record}</b></div>`:''}
      ${g.home.record?`<div class="sigchip">${g.home.abbr} <b>${g.home.record}</b></div>`:''}
      ${NCAAF_POWER_FLAT?`<div class="sigchip" style="color:var(--rust);border-color:rgba(240,86,60,.4)">RATINGS NOT LOADED — add CFBD key in Settings</div>`:''}
      
    </div>
    ${(()=>{try{return coachHtml({game:g,sim:s,sport:'ncaaf'})}catch(e){return''}})()}
    ${pctileChips}${spotlightChips}
    <div class="mktlab">Spread${realBadge}</div>
    <div class="betgrid">
      ${cfbSq(`${g.away.abbr} ${awaySpread?sgn(awaySpread.line):sgn(margin)}`,`${g.away.abbr} spread`,eAwaySpread,simAwaySpread)}
      ${cfbSq(`${g.home.abbr} ${homeSpread?sgn(homeSpread.line):sgn(-margin)}`,`${g.home.abbr} spread`,eHomeSpread,simHomeSpread)}
    </div>
    <div class="mktlab" style="margin-top:8px">Moneyline</div>
    <div class="betgrid">
      ${cfbSq(`${g.away.abbr}`,`${g.away.abbr} ML`,eAwayML,simAwPct)}
      ${cfbSq(`${g.home.abbr}`,`${g.home.abbr} ML`,eHomeML,simHmPct)}
    </div>
    <div class="mktlab" style="margin-top:8px">Total</div>
    <div class="betgrid">
      ${cfbSq(`Over ${totalOver?totalOver.line:med}`,`Over ${totalOver?totalOver.line:med}`,eOver,simTotVal)}
      ${cfbSq(`Under ${totalUnder?totalUnder.line:med}`,`Under ${totalUnder?totalUnder.line:med}`,eUnder,simTotVal)}
    </div>
    ${consML?`<div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px">
      <span style="font-family:'IBM Plex Mono';color:var(--mute);min-width:32px">${g.away.abbr} ${consML.awayPct||'?'}%</span>
      <div style="flex:1;height:4px;border-radius:2px;background:var(--rule)">
        <div style="height:100%;width:${consML.awayPct||0}%;background:var(--cold);border-radius:2px"></div>
      </div>
      <span style="font-family:'IBM Plex Mono';color:var(--mute);min-width:32px;text-align:right">${consML.homePct||'?'}% ${g.home.abbr}</span>
    </div>`:''}
    <div class="legend"><span><i class="v"></i>model sees value</span><span><i class="a"></i>model says pass</span><span><i class="n"></i>no real edge</span></div>
    <div class="legend" style="margin-top:2px"><span>◆ SUPREME = book price, model edge and outside sources all agree</span><span>STRONG = two of three</span><span>⚠ CONFLICT = they disagree</span></div>

    <div class="exprow" style="margin-top:10px">
      <button onclick="ncaafTogglePanel('trends','${id}',this)">Trends</button>
      <button onclick="ncaafTogglePanel('coach','${id}',this)">Coach</button>
      <button onclick="ncaafTogglePanel('ag','${id}',this)">A-G</button>
      <button onclick="ncaafTogglePanel('props','${id}',this)">Props</button>
      <button onclick="ncaafTogglePanel('alt','${id}',this)">Alt Lines</button>
      <button onclick="ncaafTogglePanel('portal','${id}',this)">Portal</button>
      <button onclick="ncaafTogglePanel('verdict','${id}',this)">Take/Fade</button>
      ${(cfbLive||cfbFinal)?`<button onclick="ncaafTogglePanel('livebox','${id}',this)">${cfbLive?'Live box':'Box score'}</button>`:''}
      ${cfbFinal?`<button onclick="ncaafTogglePanel('analysis','${id}',this)" style="background:rgba(95,211,232,.1);color:var(--cold)">📊 Analysis</button>`:''}
      <button onclick="ncaafTogglePanel('mybets','${id}',this)">My Bets</button>
    </div>
    <div class="panel" id="p-ncaafcoach-${id}">${coachBriefing(g,s,'ncaaf')}</div>
    <div class="panel" id="p-ncaaftrends-${id}">${ncaafTrendPanel(g,s)}</div>
    <div class="panel" id="p-ncaafag-${id}">${ncaafGameAG(g,s)}</div>
    <div class="panel" id="p-ncaafprops-${id}">${ncaafPropsPanel(g)}</div>
    <div class="panel" id="p-ncaafalt-${id}">${footballAltPanel(g,s)}</div>
    <div class="panel" id="p-ncaafportal-${id}">${cfbPortalPanel(g)}</div>
    <div class="panel" id="p-ncaafverdict-${id}">${takeFadePanel(g,s,'ncaaf')}</div>
    <div class="panel" id="p-ncaaflivebox-${id}"><div id="p-fb-livebox-${id}">${(cfbLive||cfbFinal)?fbLiveBoxPanel(g,'ncaaf'):''}</div></div>
    <div class="panel" id="p-ncaafanalysis-${id}">${cfbFinal?fbAnalysisPanel(g,s,'ncaaf'):''}</div>
    <div class="panel" id="p-ncaafmybets-${id}"></div>
  </div>`;
}

function ncaafTogglePanel(which,gid,btn){
  const p=document.getElementById('p-ncaaf'+which+'-'+gid);if(!p)return;
  const row=btn.parentElement;const wasOn=p.classList.contains('on');
  row.querySelectorAll('button').forEach(b=>b.classList.remove('on'));
  row.parentElement.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));
  if(!wasOn){p.classList.add('on');btn.classList.add('on');}
}

function ncaafSlipToggle(gid,label,price){
  const g=NCAAF_GAMES.find(x=>x.id===gid);if(!g)return;
  const leg={gid,pick:label,game:g.away.abbr+'@'+g.home.abbr,price,sport:'ncaaf',
    date:today(),p:Math.abs(price)>=100?Math.min(.95,Math.max(.05,100/(100+Math.abs(price)))):0.5};
  SLIP.push(leg);set(LS.slip,SLIP);renderSlip();
}

// ── NCAAF Trend panel ────────────────────────────────────────────────────────
function ncaafTrendPanel(g,s){
  const gameKey=g.away.abbr+'@'+g.home.abbr;
  const trends=ncaafTrendsFor(gameKey);
  const rows=[];
  const myTotalLean=s?(s.over(s.med)>0.52?'over':s.over(s.med)<0.48?'under':'neutral'):'neutral';
  const mySide=s?(s.hw>0.5?g.home.abbr:g.away.abbr):'';
  function add(name,text,implies,relevant){
    let cls='neutral',verdict='Neutral';
    if(implies&&relevant){cls=implies===relevant?'agree':'conflict';verdict=implies===relevant?'Backs model':'Contests model';}
    rows.push({name,text,cls,verdict});
  }
  // Home field signal
  add('Home field advantage',`${g.home.name} gets +${NCAAF_HFA} pts HFA — college HFA is significantly stronger than NFL`,g.home.abbr,mySide);
  // Rankings
  if(g.away.ranking||g.home.ranking){
    const ranked=`${g.away.ranking?g.away.ranking+g.away.name:''}${g.home.ranking?' vs '+g.home.ranking+g.home.name:''}`;
    add('AP Rankings',`Ranked matchup: ${ranked} — expect sharp attention and tighter lines`,null,null);
  }
  // Uploaded trends
  trends.forEach(t=>{
    const isOver=/^over/i.test(t.text);const isUnder=/^under/i.test(t.text);
    let implies=null,relevant=null;
    if(isOver){implies='over';relevant=myTotalLean;}
    else if(isUnder){implies='under';relevant=myTotalLean;}
    else if(t.team){implies=t.team;relevant=mySide;}
    add(`${t.src||'Covers'} trend${t.team?' · '+t.team:''}`,t.text,implies,relevant);
  });
  if(!rows.length)return'<div class="empty">No trend data. Upload ncaaf_trends.txt on the Outside tab.</div>';
  const agree=rows.filter(r=>r.cls==='agree').length;
  const conflict=rows.filter(r=>r.cls==='conflict').length;
  return`<div class="tkt hi" style="margin-bottom:8px">
    <h3>${agree} backing · ${conflict} contesting · ${rows.length} signals</h3>
    <div class="sub">Model: <b>${myTotalLean.toUpperCase()} ${s?s.med:'?'}</b> · Side: <b>${mySide||'?'}</b></div>
  </div>
  ${rows.map(r=>`<div class="trow ${r.cls}"><div class="tdot"></div><div class="tbody">
    <div class="tname">${r.name}</div><div class="ttext">${r.text}</div>
    <div class="tverdict">${r.verdict}</div></div></div>`).join('')}`;
}

// ── NCAAF A-G game panel ─────────────────────────────────────────────────────
function ncaafGameAG(g,s){
  if(!s)return'<div class="empty">No sim data.</div>';
  const gameKey=g.away.abbr+'@'+g.home.abbr;
  const lines=ncaafBookLinesFor(gameKey);
  const awaySpread=lines.find(x=>x.market==='spread'&&x.side==='away');
  const totalOver=lines.find(x=>x.market==='total'&&x.side==='over');
  const med=isNaN(s.med)?52:s.med;
  const margin=isNaN(s.medMargin)?0:s.medMargin;
  const spreadEdge=awaySpread?awaySpread.price-nflFairML(Math.max(.05,Math.min(.95,s.awayCover?s.awayCover(awaySpread.line):.5))):null;
  const totalEdge=totalOver?totalOver.price-nflFairML(Math.max(.05,Math.min(.95,typeof s.over==='function'?s.over(totalOver.line):.5))):null;
  const spreadLabel=margin>0?`${g.home.abbr} -${margin}`:margin<0?`${g.away.abbr} -${Math.abs(margin)}`:"Pick'em";
  const sidePick=spreadEdge&&Math.abs(spreadEdge)>=4?(spreadEdge>0?`${g.away.abbr} spread`:`${g.home.abbr} spread`):s.hw>0.6?`${g.home.abbr} ML`:s.aw>0.6?`${g.away.abbr} ML`:null;
  const totalPick=totalEdge&&Math.abs(totalEdge)>=4?(totalEdge>0?`Under ${totalOver?totalOver.line:med}`:`Over ${totalOver?totalOver.line:med}`):null;
  const confidence=Math.min(95,50+Math.abs(spreadEdge||0)*2+Math.abs(totalEdge||0)*1.5+(g.away.ranking||g.home.ranking?5:0));
  return`<div class="sub" style="margin-top:6px">
    <b>A) Proj:</b> ${g.away.abbr} ${isNaN(s.awayProj)?26:s.awayProj} – ${g.home.abbr} ${isNaN(s.homeProj)?26:s.homeProj} · O/U ${med}<br>
    <b>B) Spread:</b> ${spreadLabel}<br>
    <b>C) Edge:</b> Spread ${spreadEdge!=null?(spreadEdge>0?'+':'')+Math.round(spreadEdge):'—'} · Total ${totalEdge!=null?(totalEdge>0?'+':'')+Math.round(totalEdge):'—'}<br>
    <b>D) Picks:</b> ${sidePick||'No strong side edge'} ${totalPick?'· '+totalPick:''}<br>
    <b>G) Confidence:</b> ${Math.round(confidence)}%
    ${g.away.ranking||g.home.ranking?'<br><span style="color:var(--gold)">⭐ Ranked matchup</span>':''}
  </div>`;
}

// ── NCAAF Master Evaluation ───────────────────────────────────────────────────
function renderNCAAFMasterEval(){
  if(!NCAAF_GAMES.length)return'<div class="empty">No CFB games loaded. Switch to CFB tab and load the schedule first.</div>';
  /* An edge needs a book line to measure against. Simming all ~99 games here
     froze the BEST tab the same way it froze the board; only games with
     uploaded or pulled lines can score, so only those get simulated. */
  NCAAF_GAMES.forEach(g=>{
    if(NCAAF_SIMS[g.id])return;
    if(!ncaafBookLinesFor(g.away.abbr+'@'+g.home.abbr).length)return;
    try{NCAAF_SIMS[g.id]=simNCAAFGame(g);}catch(e){}
  });
  const evals=NCAAF_GAMES.map(g=>{
    const s=NCAAF_SIMS[g.id];if(!s)return null;
    const gameKey=g.away.abbr+'@'+g.home.abbr;
    const lines=ncaafBookLinesFor(gameKey);
    const awaySpread=lines.find(x=>x.market==='spread'&&x.side==='away');
    const totalOver=lines.find(x=>x.market==='total'&&x.side==='over');
    const spreadEdge=awaySpread?awaySpread.price-nflFairML(Math.max(.05,Math.min(.95,s.awayCover?s.awayCover(awaySpread.line):.5))):null;
    const totalEdge=totalOver?totalOver.price-nflFairML(Math.max(.05,Math.min(.95,typeof s.over==='function'?s.over(totalOver.line):.5))):null;
    const eAbs=Math.max(Math.abs(spreadEdge||0),Math.abs(totalEdge||0));
    /* Confidence based on EV% not raw odds units — cap spreadEdge/totalEdge to
       EV range before computing confidence so +1790 odds units can't inflate it. */
    const evSpread=awaySpread&&spreadEdge!=null?+(evPct(s.awayCover?s.awayCover(awaySpread.line):.5,awaySpread.price)).toFixed(1):null;
    const evTotal=totalOver&&totalEdge!=null?+(evPct(typeof s.over==='function'?s.over(totalOver.line):.5,totalOver.price)).toFixed(1):null;
    const evAbs=Math.max(Math.abs(evSpread||0),Math.abs(evTotal||0));
    const verdict=evAbs>=15?'strong':evAbs>=8?'lean':'split';
    const confidence=Math.min(95,50+evAbs*1.5+(g.away.ranking||g.home.ranking?5:0));
    return{g,s,verdict,confidence,spreadEdge,totalEdge};
  }).filter(Boolean).sort((a,b)=>{
    const r={strong:0,lean:1,split:2};
    return(r[a.verdict]||2)-(r[b.verdict]||2)||b.confidence-a.confidence;
  });
  const strong=evals.filter(e=>e.verdict==='strong').length;
  const lean=evals.filter(e=>e.verdict==='lean').length;
  const rows=evals.map(ev=>{
    const{g,s,verdict,confidence,spreadEdge,totalEdge}=ev;
    const vColor=verdict==='strong'?'var(--win)':verdict==='lean'?'var(--gold)':'var(--mute)';
    const med=isNaN(s.med)?52:s.med;
    const margin=isNaN(s.medMargin)?0:s.medMargin;
    const spreadLabel=margin>0?`${g.home.abbr} -${margin}`:margin<0?`${g.away.abbr} -${Math.abs(margin)}`:"Pick'em";
    return`<div class="tkt" style="border-left:3px solid ${vColor}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h3 style="margin:0">🏟 ${g.away.ranking||''}${g.away.abbr} @ ${g.home.ranking||''}${g.home.abbr}</h3>
          <div class="sub">${g.day||''} ${g.time||''} · Week ${g.week||'?'}</div>
          <div class="sub">${g.away.name} @ ${g.home.name}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'IBM Plex Mono';font-size:10px;color:${vColor};font-weight:700">${verdict.toUpperCase()}</div>
          <div style="font-size:18px;font-weight:700;color:${vColor}">${Math.round(confidence)}%</div>
        </div>
      </div>
      <div class="sub" style="margin-top:6px">
        Proj: ${isNaN(s.awayProj)?26:s.awayProj}–${isNaN(s.homeProj)?26:s.homeProj} · O/U ${med} · ${spreadLabel}<br>
        Edge: Spread ${evSpread!=null?(evSpread>0?'+':'')+evSpread+'% EV':'—'} · Total ${evTotal!=null?(evTotal>0?'+':'')+evTotal+'% EV':'—'}
      </div>
    </div>`;
  });
  return`<div class="tkt hi" style="margin-bottom:10px">
    <h3>🏟 CFB Master Evaluation — Week ${NCAAF_WEEK||'?'}</h3>
    <div class="sub">${evals.length} games · ${strong} strong · ${lean} lean</div>
  </div>${rows.join('')}`;
}

// ── NCAAF book odds save ──────────────────────────────────────────────────────
function saveNCAAFBookOdds(picks,el){
  const d=today();
  const all=get(LS.ncaafshots,{});all[d]=all[d]||[];
  const keyOf=x=>[x.game,x.market,x.side,x.line].join('|');
  const gameSet=new Set();
  picks.forEach(x=>{
    /* Build the game key from away@home if the pick doesn't already have one.
       The text-upload path always sets x.game; the vision (screenshot) path
       sets x.away and x.home after resolution but skips x.game — so without
       this, keyOf would be "|market|side|line" and ncaafBookLinesFor could
       never find any match, even after successful resolution and storage. */
    const awAb=String(x.away||'').toUpperCase();
    const hmAb=String(x.home||'').toUpperCase();
    const game=x.game||(awAb&&hmAb?awAb+'@'+hmAb:'');
    const rec={...x,away:awAb,home:hmAb,game,capturedAt:Date.now()};
    if(game)gameSet.add(game);
    const k=keyOf(rec);const i=all[d].findIndex(y=>keyOf(y)===k);
    if(i>=0)all[d][i]=rec;else all[d].push(rec);
  });
  set(LS.ncaafshots,all);
  /* Re-run the key repair immediately so slugs are fixed if the schedule is
     already loaded. If NCAAF_GAMES is still empty (schedule still fetching),
     renderNCAAF will re-repair once it arrives. Either way the lines land. */
  try{repairNCAAFKeys()}catch(e){}
  /* Build a summary of what actually landed so it's visible in the UI */
  const games=gameSet;
  const mktCounts={};picks.forEach(p=>{mktCounts[p.market]=(mktCounts[p.market]||0)+1});
  const summary=Object.entries(mktCounts).map(([m,n])=>n+' '+m).join(' · ');
  if(el)el.innerHTML=`<div class="tkt hi"><h3>CFB lines locked in ✓</h3>
    <div class="sub">${picks.length} picks · ${games.size} game${games.size===1?'':'s'} · ${summary}</div>
    <div class="sub" style="color:var(--mute);margin-top:4px">Stored as ${d}. Spread, moneyline and total tiles on each game card will now show REAL instead of sim only.</div></div>`;
  if(ACTIVE_SPORT==='ncaaf')renderNCAAF();
}

// ── NCAAF ext data save ───────────────────────────────────────────────────────
function saveNCAAFExtData(picks,trends,consensus,el){
  const d=today();
  const allP=get(LS.ncaafext,{});allP[d]=[...(allP[d]||[]),...picks];set(LS.ncaafext,allP);
  const allT=get(LS.ncaaftrends,{});allT[d]=[...(allT[d]||[]),...trends];set(LS.ncaaftrends,allT);
  const allC=get(LS.ncaafconsensus,{});allC[d]=[...(allC[d]||[]),...consensus];set(LS.ncaafconsensus,allC);
  if(el)el.innerHTML=`<div class="tkt hi"><h3>CFB data saved</h3>
    <div class="sub">${picks.length} picks · ${trends.length} trends · ${consensus.length} consensus</div></div>`;
  if(ACTIVE_SPORT==='ncaaf')renderNCAAF();
}

// ── NCAAF text file parser ────────────────────────────────────────────────────
// Same format as NFL but starts with NCAAF
// SPREAD: TEAM -3 (-110) / TEAM +3 (-110)
// OU: o55.5 (-110) / u55.5 (-110)
function parseNCAAFSlateText(text){
  const picks=[],trends=[],consensus=[];
  const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);
  const isConsensus=lines.some(l=>/\d+%\s*\//.test(l)||/TOTALS/i.test(l));
  const isTrends=lines.some(l=>/trends/i.test(l))||lines.some(l=>/:\s+(Over|Under)\s+is\s+\d/i.test(l));
  const isPicks=lines.some(l=>/^ML:|^SPREAD:|^OU:|^H1SPREAD:|^H1ML:|^H1OU:|^Q1SPREAD:|^Q1ML:|^Q1OU:/i.test(l));
  if(isPicks){
    /* CFB used to have a cut-down picks parser with no first-half or
       first-quarter markets and a .slice(0,12) name mangle that produced keys
       like NORTH-CAROLI@TCU-HORNED — which never matched the UNC@TCU key the
       board looks up. Reuse the football grammar wholesale, then resolve team
       names against the loaded CFB schedule so the keys line up. */
    const cfbResolve=x=>ncaafAbbrFor(x)||
      (String(x||'').trim().toUpperCase().replace(/\s+/g,'-').slice(0,12)||null);
    const r=parseNFLSlateText(text.replace(/^\s*(NCAAF|CFB|COLLEGE FOOTBALL)/i,'NFL'),{resolve:cfbResolve});
    const fixed=(r.picks||[]).map(p=>({...p,sport:'ncaaf'}));
    return{picks:fixed,trends:r.trends||[],consensus:r.consensus||[],props:r.props||[],sport:'ncaaf',isNCAAF:true};
  }
  if(isConsensus){
    let inTotals=false;
    for(const l of lines){
      if(/^TOTALS$/i.test(l)){inTotals=true;continue;}
      if(!inTotals){
        const m=l.match(/^(.+?)\s+(\d+)%\s*\/\s*(.+?)\s+(\d+)%/i);
        if(m)consensus.push({away:m[1].trim(),home:m[3].trim(),market:'moneyline',awayPct:+m[2],homePct:+m[4],src:'Covers'});
      }else{
        const m=l.match(/^(.+?):\s*(\d+)%\s*(Over|Under)/i);
        if(m){const t=m[1].split('/');consensus.push({away:(t[0]||'').trim(),home:(t[1]||'').trim(),market:'total',overPct:/over/i.test(m[3])?+m[2]:100-+m[2],underPct:/under/i.test(m[3])?+m[2]:100-+m[2],src:'Covers'});}
      }
    }
  }
  if(isTrends){
    let curAway=null,curHome=null,curTeam=null;
    for(const l of lines){
      if(/^NCAAF TRENDS|^Source:/i.test(l))continue;
      const gameM=l.match(/^(.+?)\s*@\s*(.+?)(\s*\|.*)?$/);
      if(gameM&&!(/^(ML|SPREAD|OU):/i.test(l))&&l.includes('@')){
        curAway=(gameM[1]||'').trim().toUpperCase().replace(/\s+/g,'-').slice(0,12);
        curHome=(gameM[2]||'').trim().toUpperCase().replace(/\s+/g,'-').slice(0,12);
        curTeam=null;continue;
      }
      const teamM=l.match(/^([A-Z0-9\-]{2,12}):\s*(.*)/);
      if(teamM&&curAway){curTeam=teamM[1];const rest=teamM[2].trim();if(rest)rest.split(/\.\s+/).filter(Boolean).forEach(b=>{if(b.length>5)trends.push({away:curAway,home:curHome,game:curAway+'@'+curHome,team:curTeam,text:b,src:'Covers'});});continue;}
      if(curAway&&l.length>8)trends.push({away:curAway,home:curHome,game:curAway+'@'+curHome,team:curTeam,text:l,src:'Covers'});
    }
  }
  return{picks,trends,consensus};
}

// ── NCAAF on activate ─────────────────────────────────────────────────────────
let _ncaafDataLoaded=false;
function ncaafOnActivate(){
  if(_ncaafDataLoaded)return;
  _ncaafDataLoaded=true;
  if(window.__PAGE_SPORT__==='ncaaf'){setTimeout(()=>fetchNCAAFPowerRatings().catch(()=>{}),4000);}
}

// ── Restore NCAAF games from cache ───────────────────────────────────────────
(function restoreNCAAFGames(){
  const cache=get(LS.ncaafgames,{});
  const keys=Object.keys(cache).sort((a,b)=>(cache[b].ts||0)-(cache[a].ts||0));
  if(keys.length){const latest=cache[keys[0]];if(latest.v&&latest.v.length){NCAAF_GAMES=latest.v;NCAAF_WEEK=latest.week||null;NCAAF_SEASON=latest.season||null;}}
})();
/* restoreNCAAFGames() above is the path that runs on every NORMAL app reopen
   — a fresh network load through _parseNCAAFEvents is the rare case (only
   when the user explicitly loads a week). The live-score refresh trigger was
   wired ONLY inside _parseNCAAFEvents, so the overwhelmingly common
   cache-restore reopen never kicked off a single refresh — cached status from
   however many hours ago just sat there unchanged, which is the actual
   mechanism behind an 11am game still reading "Scheduled" at 2pm. Trigger the
   same refresh here too, once the script has finished loading. */
if(window.__PAGE_SPORT__==='ncaaf'){
  whenScriptReady(()=>{refreshNCAAFLiveScores().catch(()=>{})},2500);
}

/* ═══════════════════════════════════════════════════════════════
   NFL ENGINE END
   ═══════════════════════════════════════════════════════════════ */

/* ── FOOTBALL RECORD TAB ─────────────────────────────────────────────────────
   The Record tab only ever read the MLB archive, so the NFL page displayed
   MLB's record (the "4-0 in a week-old feature"). Football pages now show
   their own sport's record, graded on the model's picks. */
function renderFootballRecord(sport){
  const nfl=sport==='nfl';
  try{fbSnapshot(sport);fbGrade(sport);}catch(e){console.warn('fb grade',e)}
  const nav=document.getElementById('gradeNav');
  if(nav)nav.innerHTML=`<button class="on">${nfl?'🏈 NFL':'🏟 CFB'} record</button>`;
  const body=document.getElementById('gradeBody');if(!body)return;
  const arc=get(nfl?LS.nflarc:'d4.ncaafarc',{});
  const weeks=Object.keys(arc).filter(k=>arc[k]&&Array.isArray(arc[k].rows)).sort().reverse();
  const T={spread:{W:0,L:0,P:0,u:0},total:{W:0,L:0,P:0,u:0},ml:{W:0,L:0,P:0,u:0}};
  const hi={W:0,L:0},lo={W:0,L:0};let pending=0,legacy=0;const done=[];
  const won=pr=>pr!=null&&!isNaN(pr)?amerProfit(+pr):amerProfit(-110);
  weeks.forEach(wk=>arc[wk].rows.forEach(r=>{
    if(r.v!==2){if(r.graded)legacy++;return;}
    if(!r.graded){if(r.picks)pending++;return;}
    if(!r.res||!Object.keys(r.res).length)return;
    done.push({wk,r});
    Object.entries(r.res).forEach(([m,x])=>{
      const t=T[m];if(!t)return;t[x]++;
      const pk=r.picks[m];
      if(x==='W')t.u+=won(pk.price);else if(x==='L')t.u-=1;
      if(x!=='P'){const b=pk.p>=0.6?hi:lo;b[x]++;}
    });
  }));
  const pctOf=o=>o.W+o.L?Math.round(o.W/(o.W+o.L)*100)+'%':'—';
  const all=['spread','total','ml'].reduce((a,m)=>({W:a.W+T[m].W,L:a.L+T[m].L,P:a.P+T[m].P,u:a.u+T[m].u}),{W:0,L:0,P:0,u:0});
  const uCol=u=>u>0?'var(--win)':u<0?'var(--rust)':'var(--mute)';
  const row=(lbl,o)=>`<div class="rc-row" style="margin:4px 0"><div><div class="g">${lbl}</div>
    <div class="p">${o.W}-${o.L}${o.P?'-'+o.P:''} · ${pctOf(o)}</div></div>
    <div class="r" style="color:${uCol(o.u)}">${o.u>=0?'+':''}${o.u.toFixed(2)}u</div></div>`;
  let h=`<div class="tkt"><h3>${nfl?'NFL':'CFB'} model record</h3>
    <div class="sub">Graded on the sim's own pick in each market, locked at kickoff. 1 unit per play; price from your lines (−110 if none).</div>
    <div style="font-size:26px;font-weight:900;margin:8px 0 2px">${all.W}-${all.L}${all.P?'-'+all.P:''}
      <span style="font-size:14px;color:${uCol(all.u)}">${all.u>=0?'+':''}${all.u.toFixed(2)}u</span></div>
    <div class="rc-list">${row('Spread',T.spread)}${row('Total',T.total)}${row('Moneyline',T.ml)}</div>
    <div class="sub" style="margin-top:8px">Confidence split: <b>60%+</b> ${hi.W}-${hi.L} (${pctOf(hi)}) · <b>under 60%</b> ${lo.W}-${lo.L} (${pctOf(lo)})</div>
    ${pending?`<div class="sub">${pending} game${pending===1?'':'s'} with locked picks awaiting finals.</div>`:''}
    ${legacy?`<div class="sub" style="color:var(--mute)">${legacy} older row${legacy===1?'':'s'} graded the book favorite, not the model — excluded.</div>`:''}
  </div>`;
  h+=brainReport(sport);
  /* Model props graded against ESPN's real box score (like MLB's prop grading). */
  try{let W=0,L=0,hi={W:0,L:0},bk={W:0,L:0},n=0;const miss=[];
    weeks.forEach(wk=>arc[wk].rows.forEach(r=>{const Pl=r.actualBox&&r.actualBox.players;if(!r.props||!Pl)return;
      r.props.forEach(p=>{const a=(Pl[p.pid]||{})[p.k];if(a==null||p.line==null)return;n++;
        const over=a>p.line,call=p.p>=0.5,hit=over===call;hit?W++:L++;
        if(Math.max(p.p,1-p.p)>=0.6)hit?hi.W++:hi.L++;if(p.book)hit?bk.W++:bk.L++;
        if(miss.length<8&&Math.abs(a-p.proj)>(p.k==='pass'?60:p.k==='recs'?3:30))miss.push(`${p.name} ${p.k} proj ${p.proj} → ${a}`);});}));
    const pc=o=>o.W+o.L?Math.round(o.W/(o.W+o.L)*100)+'%':'—';
    h+=`<div class="tkt"><h3>Model props</h3>${n?`<div class="sub">All calls <b>${W}-${L}</b> (${pc({W,L})}) · 60%+ calls ${hi.W}-${hi.L} (${pc(hi)}) · vs your book lines ${bk.W}-${bk.L} (${pc(bk)})</div>
      ${miss.length?`<div class="sub" style="color:var(--mute)">Biggest misses: ${miss.join(' · ')}</div>`:''}`
      :`<div class="sub">Player props are locked at kickoff and graded here from ESPN's box score once games go final.</div>`}</div>`;
  }catch(err){}
  if(!done.length){body.innerHTML=h+`<div class="empty">No graded ${nfl?'NFL':'CFB'} picks yet. Picks are captured for any game with uploaded or pulled lines and grade automatically once ESPN posts the final.</div>`;return;}
  const lab={spread:'ATS',total:'TOT',ml:'ML'};
  const chipR=x=>`<span style="font-family:'IBM Plex Mono';font-size:10px;font-weight:800;color:${x==='W'?'var(--win)':x==='L'?'var(--rust)':'var(--mute)'}">${x}</span>`;
  let curWk='';
  done.slice(0,150).forEach(({wk,r})=>{
    if(wk!==curWk){curWk=wk;h+=sbar(wk.replace(/^w(\d+)-/,'$1 · Week '),'');}
    const [aw,hm]=r.game.split('@');const F=(arc[wk].finals||{})[r.id]||{};
    const desc=m=>{const p=r.picks[m];const tm=p.side==='home'?hm:p.side==='away'?aw:p.side;
      return m==='spread'?`${tm} ${p.line>0?'+':''}${p.line}`:m==='total'?`${p.side==='over'?'O':'U'} ${p.line}`:`${tm} ML`;};
    h+=`<div class="rc-row" style="margin:3px 0"><div><div class="g">${r.game} <span style="color:var(--mute)">${F.a??''}-${F.h??''}</span></div>
      <div class="p">${Object.keys(r.res).map(m=>`${lab[m]} ${desc(m)} ${chipR(r.res[m])}`).join(' · ')}</div>
      ${(()=>{const J=r.judge;if(!J)return'';const B=J.box,A=r.actualBox;
        const cell=(p,a)=>a==null?`${p}`:`${p}→<b>${a}</b>`;
        const line=(t,pb,ab,pts,fin)=>`<div>${t} pts ${cell(Math.round(pts),fin)}${pb?` · yds ${cell(pb.yds,ab&&ab.yds)} · pass ${cell(pb.pass,ab&&ab.pass)} · rush ${cell(pb.rush,ab&&ab.rush)}`:''}</div>`;
        return`<details style="margin-top:2px"><summary style="font-size:10px;color:var(--mute);cursor:pointer">box: predicted → actual</summary>
          <div class="mono" style="font-size:9.5px;line-height:1.6">${line(aw,B&&B.away,A&&A.away,J.a,F.a)}${line(hm,B&&B.home,A&&A.home,J.h,F.h)}
          ${A?'':'<div style="color:var(--mute)">real box score still loading from ESPN</div>'}</div></details>`;})()}
      </div></div>`;
  });
  body.innerHTML=h;
}

/* THE JUDGE (brain) now lives in shared.js — one engine for MLB, NFL and CFB. */

/* NFL page: season stats load themselves (12h cache) — nothing to tap. */
if(typeof window!=='undefined'&&window.__PAGE_SPORT__==='nfl')setTimeout(()=>{nflLoadSeasonStats().catch(()=>{})},4000);
