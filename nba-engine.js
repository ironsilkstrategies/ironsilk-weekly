/* ═══ THEDESK — NBA ENGINE ════════════════════════════════════════════════
   Model: each team's scoring = its points-for × opponent's points-against ÷
   league average (an efficiency model on real ESPN numbers), home court +2.5.
   Margin ~ Normal(μM, 12.0), total ~ Normal(μT, 18.5) — the spread of real
   NBA results around closing lines. Integer lines get an exact push band, and
   EV refunds pushes. Live: remaining-time scaling gives an in-game win %.
   Early season the current numbers are blended with last season's,
   weighted by games played, so October isn't driven by 2-game samples.    */
'use strict';
const NBA_GAMES=[],NBA_SIMS={},NBA_RATINGS={};
const NBA_LS={shots:'d4.nbashots',arc:'d4.nbaarc'};
const NBA_ESPN='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const NBA_HCA=2.5,NBA_SDM=12.0,NBA_SDT=18.5;
const NBA_PERIOD={full:{f:1,sm:NBA_SDM,st:NBA_SDT},h1:{f:0.5,sm:8.6,st:12.8},q1:{f:0.25,sm:6.0,st:8.8}};
let NBA_LG=113;
function nbaPhi(x){return typeof pstNormCdf==='function'?pstNormCdf(x):0.5*(1+Math.tanh(0.7978845608*(x+0.044715*x*x*x)));}
/* P(win/push/lose) for X~N(mu,sd) against a threshold: win when X > t (half line) or X >= t+1 (integer) */
function nbaThresh(mu,sd,t){const isInt=Math.abs(t-Math.round(t))<1e-9;
  if(!isInt){const w=1-nbaPhi((t-mu)/sd);return{w,p:0,l:1-w};}
  const w=1-nbaPhi((t+0.5-mu)/sd),l=nbaPhi((t-0.5-mu)/sd);return{w,p:Math.max(0,1-w-l),l};}
function nbaRate(ab){return NBA_RATINGS[ab]||{pf:NBA_LG,pa:NBA_LG,gp:0};}
function nbaSimFor(g,period){
  const P=NBA_PERIOD[period||'full'];const a=nbaRate(g.away.abbr),h=nbaRate(g.home.abbr);
  const away=(a.pf*h.pa/NBA_LG-NBA_HCA/2)*P.f,home=(h.pf*a.pa/NBA_LG+NBA_HCA/2)*P.f;
  const muM=home-away,muT=home+away;
  return{awayProj:+away.toFixed(1),homeProj:+home.toFixed(1),margin:muM,total:muT,
    hw:1-nbaPhi((0-muM)/P.sm),aw:nbaPhi((0-muM)/P.sm),   // continuous margin: no ties (OT decides)
    /* side 'home' with line L (home -4.5 → L=-4.5): covers when margin + L > 0 */
    cover:(side,L)=>side==='home'?nbaThresh(muM,P.sm,-L):(r=>({w:r.l,p:r.p,l:r.w}))(nbaThresh(muM,P.sm,L)),
    ou:(side,L)=>{const r=nbaThresh(muT,P.st,L);return side==='over'?r:{w:r.l,p:r.p,l:r.w};}};
}
/* live: scale what's left of the game */
function nbaLive(g){if(g.abstract!=='in'||g.awayScore==null)return null;
  const per=g.period||1,clk=g.clockSec!=null?g.clockSec:720;const played=Math.min(48,(Math.min(per,4)-1)*12+(12-clk/60));
  const f=Math.max(0.02,(48-played)/48);const s=nbaSimFor(g);const cur=g.homeScore-g.awayScore;
  const hw=1-nbaPhi((0-(cur+s.margin*f))/(NBA_SDM*Math.sqrt(f)));return{hw,aw:1-hw,f};}
/* team names → abbreviations live in shared.js (NBA_TEAMS / nbaAbbrFor) so tickets parse on every page */
/* ── data ── */
const nbaSeasonYear=()=>{const d=new Date();return d.getMonth()>=6?d.getFullYear()+1:d.getFullYear();};
async function nbaStandings(season){
  const r=await fetch('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season='+season).then(x=>x.json()).catch(()=>({}));
  const out={};const walk=n=>{(n.children||[]).forEach(walk);((n.standings||{}).entries||[]).forEach(e=>{const ab=e.team&&e.team.abbreviation;if(!ab)return;
    const st=k=>{const s=(e.stats||[]).find(x=>x.name===k||x.type===k);return s?+s.value:null;};
    const gp=st('gamesPlayed')||((st('wins')||0)+(st('losses')||0));const pf=st('avgPointsFor'),pa=st('avgPointsAgainst');
    if(pf&&pa)out[ab]={pf,pa,gp};});};walk(r);return out;}
let NBA_RATED=0;
async function loadNBARatings(){if(Date.now()-NBA_RATED<6*3600e3&&Object.keys(NBA_RATINGS).length)return;
  const y=nbaSeasonYear();const [cur,prev]=await Promise.all([nbaStandings(y),nbaStandings(y-1)]);
  const all=new Set([...Object.keys(cur),...Object.keys(prev)]);const lg=[];
  all.forEach(ab=>{const c=cur[ab],p=prev[ab];
    const pv=p?{pf:p.pf,pa:p.pa}:null;const w=c?c.gp/(c.gp+15):0;   // 15-game prior
    let pf,pa;if(c&&pv){pf=w*c.pf+(1-w)*pv.pf;pa=w*c.pa+(1-w)*pv.pa;}else if(c){pf=c.pf;pa=c.pa;}else{pf=pv.pf;pa=pv.pa;}
    NBA_RATINGS[ab]={pf,pa,gp:c?c.gp:0,src:c&&c.gp?(w>0.5?'this season':'blend'):'last season'};lg.push(pf);});
  if(lg.length){NBA_LG=lg.reduce((a,b)=>a+b,0)/lg.length;
    /* last-season-only ratings regress 25% to the league mean (rosters change) */
    Object.values(NBA_RATINGS).forEach(R=>{if(R.src==='last season'){R.pf=0.75*R.pf+0.25*NBA_LG;R.pa=0.75*R.pa+0.25*NBA_LG;}});}
  NBA_RATED=Date.now();}
function nbaParseEvent(ev){const c=(ev.competitions||[])[0];if(!c)return null;const st=(c.status||ev.status||{});const ty=st.type||{};
  const aw=c.competitors.find(x=>x.homeAway==='away'),hm=c.competitors.find(x=>x.homeAway==='home');if(!aw||!hm)return null;
  const T=t=>({abbr:t.team.abbreviation,name:t.team.shortDisplayName||t.team.name,displayName:t.team.displayName,id:t.team.id});
  const ls=x=>(x.linescores||[]).map(v=>+(v.value!=null?v.value:v.displayValue)||0);const la=ls(aw),lh=ls(hm);
  return{id:String(ev.id),start:ev.date,away:T(aw),home:T(hm),awayScore:aw.score!==''&&aw.score!=null?+aw.score:null,homeScore:hm.score!==''&&hm.score!=null?+hm.score:null,
    abstract:ty.state==='post'?'post':ty.state==='in'?'in':'pre',status:ty.shortDetail||'',period:st.period||0,clockSec:st.clock!=null?+st.clock:null,
    h1a:la.length>=2?la[0]+la[1]:null,h1h:lh.length>=2?lh[0]+lh[1]:null,p1a:la.length?la[0]:null,p1h:lh.length?lh[0]:null,venue:((c.venue||{}).fullName)||''};}
async function loadNBAScoreboard(){
  const d=today().replace(/-/g,'');const j=await fetch(NBA_ESPN+'/scoreboard?dates='+d+'&limit=40').then(r=>r.json()).catch(()=>({events:[]}));
  NBA_GAMES.length=0;(j.events||[]).map(nbaParseEvent).filter(Boolean).forEach(g=>{NBA_GAMES.push(g);NBA_SIMS[g.id]=nbaSimFor(g);});}
async function nbaBoot(force){try{await loadNBARatings();await loadNBAScoreboard();}catch(e){console.warn('nba boot',e);}
  NBA_GAMES.forEach(g=>{NBA_SIMS[g.id]=nbaSimFor(g);});try{nbaLockJudge();}catch(e){}try{syncFinalsToShared();}catch(e){}try{brainLearnAll(true);}catch(e){}renderNBA();}
/* ── book lines: same store pattern as NHL ── */
function nbaLinesOn(d){return(get(NBA_LS.shots,{})||{})[d||today()]||[];}
function nbaPutLines(rows){const all=get(NBA_LS.shots,{})||{};const d=today();const day=all[d]||(all[d]=[]);
  rows.forEach(r=>{if(amerOk(r.price)==null)return;r.price=amerOk(r.price);const i=day.findIndex(x=>x.game===r.game&&x.market===r.market&&x.side===r.side);if(i>=0)day[i]=r;else day.push(r);});
  Object.keys(all).sort().slice(0,-7).forEach(k=>delete all[k]);set(NBA_LS.shots,all);}
function nbaBookLinesFor(game,date){return nbaLinesOn(date).filter(x=>x.game===game);}
function saveNBABookOdds(picks,el){const rows=(picks||[]).map(x=>({away:x.away,home:x.home,game:x.game||(x.away+'@'+x.home),market:x.market,side:x.side,
    line:x.line!=null?+x.line:null,price:x.price,src:'mine',capturedAt:Date.now()}));nbaPutLines(rows);
  if(el)el.innerHTML=`<div class="tkt hi"><h3>NBA lines saved</h3><div class="sub">${rows.length} lines filed.</div></div>`;if(ACTIVE_SPORT==='nba')renderNBA();return rows.length;}
/* ── card ── */
const nbaDec=a=>a>0?a/100+1:100/(-a)+1;
function nbaTile(label,r,price,note){const pw=r?r.w/((r.w+r.l)||1):null;   // no-push win %
  const ev=r&&price!=null?(r.w*(nbaDec(price)-1)-r.l)*100:null;
  const col=ev==null?'var(--mute)':ev>=3?'var(--win)':ev<=-5?'var(--rust)':'var(--chalk)';
  return`<div class="sq" style="flex:1;min-width:110px;padding:8px 10px;margin:3px;border-radius:10px;border:1.5px solid ${ev!=null&&ev>=3?'var(--win)':'var(--rule)'}">
    <div style="font-size:11px;font-weight:800">${esc(label)}</div><div style="font-size:20px;font-weight:900">${price!=null?(price>0?'+':'')+price:'—'}</div>
    <div class="mono" style="font-size:9.5px;color:var(--mute)">model ${pw!=null?Math.round(pw*100)+'%':'—'}${r&&r.p>0.005?` · push ${Math.round(r.p*100)}%`:''}${note?' · '+esc(note):''}</div>
    ${ev!=null?`<div class="mono" style="font-size:10px;color:${col}">${ev>=0?'+':''}${ev.toFixed(1)}% EV</div>`:''}</div>`;}
function nbaCard(g){const gl=g.away.abbr+'@'+g.home.abbr;const L=nbaBookLinesFor(gl);const f=(m,sd)=>L.find(x=>x.market===m&&x.side===sd);
  const sec=(lab,per,pre)=>{const s=nbaSimFor(g,per);const mlA=f(pre+'moneyline','away')||f(pre+'ml','away'),mlH=f(pre+'moneyline','home')||f(pre+'ml','home');
    const spA=f(pre+'spread','away'),spH=f(pre+'spread','home'),ov=f(pre+'total','over'),un=f(pre+'total','under');const t=[];
    if(mlA||mlH)t.push(nbaTile(g.away.abbr+' ML',{w:s.aw,p:0,l:s.hw},mlA&&mlA.price),nbaTile(g.home.abbr+' ML',{w:s.hw,p:0,l:s.aw},mlH&&mlH.price));
    if(spA&&spH)t.push(nbaTile(`${g.away.abbr} ${spA.line>0?'+':''}${spA.line}`,s.cover('away',+spA.line),spA.price),nbaTile(`${g.home.abbr} ${spH.line>0?'+':''}${spH.line}`,s.cover('home',+spH.line),spH.price));
    if(ov&&un)t.push(nbaTile('Over '+ov.line,s.ou('over',+ov.line),ov.price,'proj '+s.total.toFixed(1)),nbaTile('Under '+un.line,s.ou('under',+un.line),un.price));
    return t.length?`<div class="mktlab">${lab}</div><div class="betgrid" style="display:flex;flex-wrap:wrap">${t.join('')}</div>`:'';};
  const s=nbaSimFor(g);const lv=nbaLive(g);const R=k=>nbaRate(k);
  const head=g.awayScore!=null&&g.abstract!=='pre'?`${g.away.abbr} ${g.awayScore} – ${g.homeScore} ${g.home.abbr}`:`${g.away.abbr} @ ${g.home.abbr}`;
  return`<div class="game-card tkt" id="nba-${g.id}" style="margin:10px 0">
    <div style="display:flex;justify-content:space-between"><b style="font-size:16px">${head}</b><span class="mono" style="font-size:10px;color:${g.abstract==='in'?'var(--rust)':'var(--mute)'}">${esc(g.status||'')}</span></div>
    <div class="sub mono" style="font-size:10px">model ${g.away.abbr} ${s.awayProj} – ${s.homeProj} ${g.home.abbr} · total ${s.total.toFixed(1)} · ${g.home.abbr} ${s.margin>=0?'-':'+'}${Math.abs(s.margin).toFixed(1)} · win ${g.home.abbr} ${Math.round(s.hw*100)}%
      ${lv?`<br><b style="color:var(--gold)">LIVE win %: ${g.away.abbr} ${Math.round(lv.aw*100)}% · ${g.home.abbr} ${Math.round(lv.hw*100)}%</b>`:''}
      <br>ratings: ${g.away.abbr} ${R(g.away.abbr).pf.toFixed(1)}/${R(g.away.abbr).pa.toFixed(1)} (${R(g.away.abbr).src||'league avg'}) · ${g.home.abbr} ${R(g.home.abbr).pf.toFixed(1)}/${R(g.home.abbr).pa.toFixed(1)} (${R(g.home.abbr).src||'league avg'})</div>
    ${g.abstract==='post'?'':sec('Full game','full','')+sec('1st half','h1','h1')+sec('1st quarter','q1','q1')}
    ${!L.length&&g.abstract!=='post'?'<div class="sub" style="font-size:10px">No book lines yet — paste your sportsbook\'s NBA lines in Intake.</div>':''}
    ${typeof pstCardHtml==='function'?pstCardHtml('nba',g):''}</div>`;}
function renderNBA(){const el=document.getElementById('slate');if(!el)return;
  if(!NBA_GAMES.length){el.innerHTML='<div class="empty">No NBA games today (or the schedule is still loading). The regular season tips off in late October.</div>';return;}
  const by=st=>NBA_GAMES.filter(g=>g.abstract===st);
  el.innerHTML=[['in','LIVE'],['pre','TODAY'],['post','FINAL']].map(([k,l])=>by(k).length?`<div class="mktlab">${l}</div>`+by(k).map(nbaCard).join(''):'').join('');}
function nbaPropsHtml(g){return typeof pstCardHtml==='function'?pstCardHtml('nba',g):'';}
/* ── intake grammar (same shape as the other sports; see the Gemini prompt) ──
   NBA / ATL @ BOS / ML: ATL +155 / BOS -180 / SPREAD: ATL +4.5 (-110) / BOS -4.5 (-110)
   OU: o225 (-110) / u225 (-110) / H1SPREAD|H1ML|H1OU / Q1SPREAD|Q1ML|Q1OU            */
function parseNBASlateText(text){
  const picks=[],unread=[];let A=null,H=null;const pr=v=>amerOk(v);
  const sideRe='(.+?)\\s+([+-]?[\\d.]+|pk)\\s*\\(\\s*([+-]\\d+|even|ev)\\s*\\)';
  String(text).split('\n').map(l=>l.replace(/^[\s\-*•>]+/,'').trim()).filter(Boolean).forEach(l=>{
    if(/^NBA\b/i.test(l)&&!/:/.test(l))return;
    let m=l.match(/^(.+?)\s+(?:@|at)\s+(.+?)\s*$/i);
    if(m&&!/:/.test(l)){A=nbaAbbrFor(m[1])||m[1].toUpperCase();H=nbaAbbrFor(m[2])||m[2].toUpperCase();return;}
    if(!A){unread.push(l);return;}
    const game=A+'@'+H,add=(market,side,line,price)=>{const p=pr(price);if(p==null)return;picks.push({sport:'nba',game,away:A,home:H,market,side,line:line==null?null:(/pk/i.test(line)?0:+line),price:p});};
    m=l.match(/^(H1|Q1)?\s*(ML|MONEYLINE)\s*:\s*(.+?)\s+([+-]\d+|even|ev)\s*\/\s*(.+?)\s+([+-]\d+|even|ev)\s*$/i);
    if(m){const pre=(m[1]||'').toLowerCase();add(pre+'moneyline','away',null,m[4]);add(pre+'moneyline','home',null,m[6]);return;}
    m=l.match(new RegExp('^(H1|Q1)?\\s*(SPREAD|ATS)\\s*:\\s*'+sideRe+'\\s*\\/\\s*'+sideRe+'\\s*$','i'));
    if(m){const pre=(m[1]||'').toLowerCase();add(pre+'spread','away',m[4],m[5]);add(pre+'spread','home',m[7],m[8]);return;}
    m=l.match(/^(H1|Q1)?\s*(OU|TOTAL)\s*:\s*o\s*([\d.]+)\s*\(\s*([+-]\d+|even|ev)\s*\)\s*\/\s*u\s*([\d.]+)\s*\(\s*([+-]\d+|even|ev)\s*\)\s*$/i);
    if(m){const pre=(m[1]||'').toLowerCase();add(pre+'total','over',m[3],m[4]);add(pre+'total','under',m[5],m[6]);return;}
    unread.push(l);});
  return{picks,unread};
}
/* ── brain adapter: lets the shared learner (brainJudge/brainLearnOne) treat NBA like every other sport */
function nbaBrainAdapter(){
  return{key:g=>g.away.abbr+'@'+g.home.abbr,lines:g=>nbaBookLinesFor(g.away.abbr+'@'+g.home.abbr),flat:()=>false,
    sim:s=>s&&s.awayProj!=null?{a:+s.awayProj,h:+s.homeProj}:null,trends:()=>[],cons:()=>[],snap:x=>Math.max(0,Math.round(x)),
    market:(g,lines)=>{const to=lines.find(x=>x.market==='total'&&x.side==='over'),sp=lines.find(x=>x.market==='spread'&&x.side==='home');
      if(!to||to.line==null||!sp||sp.line==null)return null;const T=+to.line,L=+sp.line;return{a:(T+L)/2,h:(T-L)/2};},   // home -4.5 → home = (T+4.5)/2
    box:null,boxCols:[],boxStats:[]};
}
/* lock the pre-game judgement (first tip locks it) into a ledger the brain learns from on ANY page */
function nbaLockJudge(){const d=today(),L=get('d4.nbajudge',{})||{};L[d]=L[d]||{};let ch=false;
  NBA_GAMES.forEach(g=>{if(g.abstract!=='pre'||(L[d][g.id]&&L[d][g.id].final))return;const s=NBA_SIMS[g.id]||nbaSimFor(g);
    let J=null;try{J=brainJudge(g,s,'nba');}catch(e){}
    const lock=J?brainLockable(J):{a:s.awayProj,h:s.homeProj,w:[{src:'sim',a:s.awayProj,h:s.homeProj}]};lock.box=null;
    L[d][g.id]={game:g.away.abbr+'@'+g.home.abbr,...lock,ts:Date.now()};ch=true;});
  if(ch){Object.keys(L).sort().slice(0,-45).forEach(k=>delete L[k]);set('d4.nbajudge',L);}}

try{if(typeof nbaCard==='function'){const _b=nbaCard;nbaCard=function(g){return pregameWrap('nba',g,_b.apply(this,arguments));};}}catch(e){}
