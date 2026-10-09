/* ═══ THEDESK — NBA ENGINE ════════════════════════════════════════════════
   Model: each team's scoring = its points-for × opponent's points-against ÷
   league average (an efficiency model on real ESPN numbers), home court +2.5.
   Margin ~ Normal(μM, 12.0), total ~ Normal(μT, 18.5) — the spread of real
   NBA results around closing lines. Integer lines get an exact push band, and
   EV refunds pushes. Live: remaining-time scaling gives an in-game win %.
   Early season the current numbers are blended with last season's,
   weighted by games played, so October isn't driven by 2-game samples.    */
'use strict';
const NBA_GAMES=[],NBA_SIMS={},NBA_RATINGS={};let NBA_UPCOMING=[];
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
    ou:(side,L)=>{const r=nbaThresh(muT,P.st,L);return side==='over'?r:{w:r.l,p:r.p,l:r.w};},
    /* same interface as the other sports' sims (win probability, pushes removed) */
    homeCover:L=>{const r=nbaThresh(muM,P.sm,-L);return r.w/((r.w+r.l)||1);},awayCover:L=>{const r=nbaThresh(muM,P.sm,L);return r.l/((r.w+r.l)||1);},
    over:L=>{const r=nbaThresh(muT,P.st,L);return r.w/((r.w+r.l)||1);},under:L=>{const r=nbaThresh(muT,P.st,L);return r.l/((r.w+r.l)||1);},
    mean:muT,med:muT,medMargin:muM};
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
  const rec=x=>((x.records||[])[0]||{}).summary||'';
  return{id:String(ev.id),start:ev.date,away:{...T(aw),record:rec(aw),tid:aw.team.id},home:{...T(hm),record:rec(hm),tid:hm.team.id},awayScore:aw.score!==''&&aw.score!=null?+aw.score:null,homeScore:hm.score!==''&&hm.score!=null?+hm.score:null,
    abstract:ty.state==='post'?'post':ty.state==='in'?'in':'pre',status:ty.shortDetail||'',period:st.period||0,clockSec:st.clock!=null?+st.clock:null,
    h1a:la.length>=2?la[0]+la[1]:null,h1h:lh.length>=2?lh[0]+lh[1]:null,p1a:la.length?la[0]:null,p1h:lh.length?lh[0]:null,venue:((c.venue||{}).fullName)||''};}
/* today + the next 7 days, like the NHL board: on a day with no NBA games
   (or before opening night) the board shows what's next instead of going blank */
async function loadNBAScoreboard(){
  const td=today(),a=td.replace(/-/g,''),z=dayShift(td,7).replace(/-/g,'');
  /* The range call can come back empty in preseason (ESPN defaults a range to one
     season type). If it does, ask day by day, and ask for preseason explicitly. */
  const grab=u=>fetch(u).then(r=>r.json()).then(x=>x.events||[]).catch(()=>null);
  let evs=await grab(NBA_ESPN+'/scoreboard?dates='+a+'-'+z+'&limit=300'),how='range';
  if(!evs||!evs.length){const days=Array.from({length:8},(_,i)=>dayShift(td,i).replace(/-/g,''));
    const per=await Promise.all(days.map(d=>grab(NBA_ESPN+'/scoreboard?dates='+d+'&limit=100')));
    evs=per.flat().filter(Boolean);how='by day';
    if(!evs.length){const pre=await Promise.all(days.map(d=>grab(NBA_ESPN+'/scoreboard?dates='+d+'&seasontype=1&limit=100')));evs=pre.flat().filter(Boolean);how='preseason';}}
  const seen=new Set();evs=(evs||[]).filter(e=>e&&e.id&&!seen.has(e.id)&&seen.add(e.id));
  NBA_LOAD_NOTE=evs.length?`${evs.length} games found (${how})`:'ESPN returned no NBA games for the next 8 days';
  const all=evs.map(ev=>{const g=nbaParseEvent(ev);if(g){g.__date=tdDay(g.start);g.pre=((ev.season||{}).type===1)||/preseason/i.test(((ev.season||{}).slug)||'');}return g;}).filter(Boolean);
  NBA_GAMES.length=0;all.filter(g=>g.__date===td).forEach(g=>NBA_GAMES.push(g));NBA_UPCOMING=all.filter(g=>g.__date>td);
  all.forEach(g=>{try{NBA_SIMS[g.id]=nbaSimFor(g);}catch(e){}});}
let NBA_LOAD_NOTE='';
/* Ratings and schedule load independently: a standings hiccup used to skip the schedule entirely. */
async function nbaBoot(force){try{await loadNBARatings();}catch(e){console.warn('nba ratings',e);}try{await loadNBAScoreboard();}catch(e){console.warn('nba scoreboard',e);NBA_LOAD_NOTE='schedule load failed: '+(e&&e.message||e);}
  NBA_GAMES.forEach(g=>{try{NBA_SIMS[g.id]=nbaSimFor(g);}catch(e){}});try{nbaLockJudge();}catch(e){}try{syncFinalsToShared();}catch(e){}try{brainLearnAll(true);}catch(e){}renderNBA();}
/* ── book lines: same store pattern as NHL ── */
function nbaLinesOn(d){return(get(NBA_LS.shots,{})||{})[d||today()]||[];}
function nbaPutLines(rows){const all=get(NBA_LS.shots,{})||{};const d=today();const day=all[d]||(all[d]=[]);
  rows.forEach(r=>{if(amerOk(r.price)==null)return;r.price=amerOk(r.price);const i=day.findIndex(x=>x.game===r.game&&x.market===r.market&&x.side===r.side);if(i>=0)day[i]=r;else day.push(r);});
  Object.keys(all).sort().slice(0,-7).forEach(k=>delete all[k]);set(NBA_LS.shots,all);}
function nbaBookLinesFor(game,date){return nbaLinesOn(date).filter(x=>x.game===game);}
function saveNBABookOdds(picks,el){const rows=(picks||[]).map(x=>({away:x.away,home:x.home,game:x.game||(x.away+'@'+x.home),market:x.market,side:x.side,
    line:x.line!=null?+x.line:null,price:x.price,src:'mine',capturedAt:Date.now()}));nbaPutLines(rows);
  if(el)el.innerHTML=`<div class="tkt hi"><h3>NBA lines saved</h3><div class="sub">${rows.length} lines filed.</div></div>`;if(ACTIVE_SPORT==='nba')renderNBA();return rows.length;}
/* ── card: the same layout as every other sport ──────────────────────────
   header (records, tip time, venue) · signal chips · coach · tiered market
   tiles (outline / character chips / EV via charSquare + charTier) · player
   stats · legend · tabs: Coach · Trends · Alt Lines · Roster · Props ·
   Proj. Box · Take/Fade · Live Box                                         */
const nbaDec=a=>a>0?a/100+1:100/(-a)+1;
const nbaSgn=x=>x==null?'—':(x>0?'+':'')+x;
const nbaFair=p=>p>=0.5?-Math.round(100*p/(1-p)):Math.round(100*(1-p)/p);
const nbaQ=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
function nbaTile(g,s,label,pick,line,r,simStr,mkt){
  const pw=r?r.w/((r.w+r.l)||1):null;
  if(!line){const cI=(()=>{try{return charSquare('nba',g,s,pick,{})}catch(e){return{}}})(),tC=charTier({hasLine:false},cI);
    return`<div class="bet${tC}"><div class="bl">${esc(label)}</div><div class="sim-chip">sim ${esc(simStr)}</div>
      <div class="bo" style="color:var(--mute)">${pw!=null?nbaSgn(nbaFair(pw)):'—'}</div><div class="bs">sim only</div>
      <div class="bf" style="color:var(--mute)">no real line yet${r&&r.p>0.005?` · push ${Math.round(r.p*100)}%`:''}</div>${cI.chips||''}${cI.meter||''}${charTierTag(tC)}</div>`;}
  const kp=imp(line.price),ev=(r.w*(nbaDec(line.price)-1)-r.l)*100,gap=(pw-kp)*100;
  let cls='',badge='';if(gap>=EDGE_MIN){cls=' value';badge=`<span class="eb up">+${gap.toFixed(1)}</span>`;}else if(gap<=-EDGE_MIN){cls=' avoid';badge=`<span class="eb dn">${gap.toFixed(1)}</span>`;}
  const cInfo=(()=>{try{return charSquare('nba',g,s,pick,{price:line.price,modelP:pw,line:line.line})}catch(e){return{}}})();
  const tier=charTier({hasLine:true,bookLeans:kp>=0.58,modelEdgeHere:cls===' value',modelAgainstHere:cls===' avoid',outsideAgrees:false,outsideUnanimous:false,outsideAgainst:false},cInfo);
  const co=charAsOutside(cInfo,false);const srcCls=co.unanimous?' consensus-pick':co.agrees?' source-pick':'';
  const on=typeof SLIP!=='undefined'&&SLIP.some(x=>x.id===g.id+'|'+pick);
  return`<div class="bet${cls}${srcCls}${tier} ${on?'on':''}" role="button" tabindex="0" onclick="sportSlipToggle('nba','${g.id}','${nbaQ(pick)}',${line.price})">
    <div class="bl">${esc(label)}</div><div class="sim-chip">sim ${esc(simStr)}</div><div class="bo">${nbaSgn(line.price)}</div>
    <div class="bs">${badge||Math.round(kp*100)+'%'}</div>
    <div class="bf">model ${(pw*100).toFixed(0)}% · fair ${nbaSgn(nbaFair(pw))} · <span style="color:${ev>=2?'var(--win)':ev<0?'var(--rust)':'var(--mute)'}">${ev>=0?'+':''}${ev.toFixed(1)}% EV</span>${r.p>0.005?` · push ${Math.round(r.p*100)}%`:''}</div>
    ${co.badge||''}${cInfo.chips||''}${cInfo.meter||''}${charTierTag(tier)}</div>`;}
function nbaMkt(title,real,inner){return`<div class="mktlab" style="margin-top:8px">${title}${real?'<span style="font-family:\'IBM Plex Mono\';font-size:8px;color:var(--cold);border:1px solid var(--cold);border-radius:3px;padding:1px 4px;margin-left:6px">REAL LINE</span>':''}</div><div class="betgrid">${inner}</div>`;}
function nbaSection(g,lab,per,pre,L){const s=nbaSimFor(g,per);const f=(m,sd)=>L.find(x=>x.market===m&&x.side===sd);
  const mlA=f(pre+'moneyline','away')||f(pre+'ml','away'),mlH=f(pre+'moneyline','home')||f(pre+'ml','home'),spA=f(pre+'spread','away'),spH=f(pre+'spread','home'),ov=f(pre+'total','over'),un=f(pre+'total','under');
  const P=pre?pre.toUpperCase()+' ':'';const A=g.away.abbr,H=g.home.abbr;const out=[];
  if(per==='full'||mlA||mlH)out.push(nbaMkt(lab+' · MONEYLINE',!!(mlA||mlH),nbaTile(g,s,A,`${P}${A} ML`,mlA,{w:s.aw,p:0,l:s.hw},s.awayProj.toFixed(1),pre+'ml')+nbaTile(g,s,H,`${P}${H} ML`,mlH,{w:s.hw,p:0,l:s.aw},s.homeProj.toFixed(1),pre+'ml')));
  if(spA&&spH)out.push(nbaMkt(lab+' · SPREAD',true,nbaTile(g,s,`${A} ${nbaSgn(spA.line)}`,`${P}${A} ${nbaSgn(spA.line)}`,spA,s.cover('away',+spA.line),(+spA.line-s.margin).toFixed(1),pre+'spread')+nbaTile(g,s,`${H} ${nbaSgn(spH.line)}`,`${P}${H} ${nbaSgn(spH.line)}`,spH,s.cover('home',+spH.line),(+spH.line+s.margin).toFixed(1),pre+'spread')));
  else if(per==='full'){const l=-Math.round(s.margin*2)/2||-0.5;out.push(nbaMkt(lab+' · SPREAD (model line)',false,nbaTile(g,s,`${H} ${nbaSgn(l)}`,`${H} ${nbaSgn(l)}`,null,s.cover('home',l),s.margin.toFixed(1),'spread')+nbaTile(g,s,`${A} ${nbaSgn(-l)}`,`${A} ${nbaSgn(-l)}`,null,s.cover('away',-l),(-s.margin).toFixed(1),'spread')));}
  if(ov&&un)out.push(nbaMkt(`${lab} · TOTAL ${ov.line}`,true,nbaTile(g,s,'Over '+ov.line,`${P}Over ${ov.line}`,ov,s.ou('over',+ov.line),s.total.toFixed(1),pre+'total')+nbaTile(g,s,'Under '+un.line,`${P}Under ${un.line}`,un,s.ou('under',+un.line),s.total.toFixed(1),pre+'total')));
  else if(per==='full'){const t=Math.round(s.total*2)/2;out.push(nbaMkt(`${lab} · TOTAL ${t} (model line)`,false,nbaTile(g,s,'Over '+t,'Over '+t,null,s.ou('over',t),s.total.toFixed(1),'total')+nbaTile(g,s,'Under '+t,'Under '+t,null,s.ou('under',t),s.total.toFixed(1),'total')));}
  return out.join('');}
function nbaCard(g){const gl=g.away.abbr+'@'+g.home.abbr;const L=nbaBookLinesFor(gl);const s=nbaSimFor(g);const lv=nbaLive(g);const A=g.away.abbr,H=g.home.abbr;const R=k=>nbaRate(k);
  const time=g.start?new Date(g.start).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';
  const score=g.awayScore!=null&&g.abstract!=='pre'?`<div class="mono" style="font-size:13px;margin:2px 0">${A} <b>${g.awayScore}</b> – <b>${g.homeScore}</b> ${H} <span style="color:${g.abstract==='in'?'var(--rust)':'var(--mute)'}">${esc(g.status||'')}</span></div>`:'';
  const chips=[`<span class="chip">model ${A} ${s.awayProj} – ${s.homeProj} ${H}</span>`,`<span class="chip">${H} win ${Math.round(s.hw*100)}%</span>`,`<span class="chip">total ${s.total.toFixed(1)}</span>`,
    `<span class="chip">ratings ${R(A).pf.toFixed(0)}/${R(A).pa.toFixed(0)} · ${R(H).pf.toFixed(0)}/${R(H).pa.toFixed(0)} (${R(A).src||'league avg'})</span>`];
  if(lv)chips.push(`<span class="chip" style="color:var(--gold)">LIVE win ${A} ${Math.round(lv.aw*100)}% · ${H} ${Math.round(lv.hw*100)}%</span>`);
  const btn=(k,t)=>`<button onclick="nbaPan('${g.id}','${k}',this)">${t}</button>`;
  return`<div class="tkt" id="nba-card-${g.id}" style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
      <div><div style="font-size:16px;font-weight:800;color:var(--chalk)">${A} <span style="color:var(--mute);font-size:13px">@</span> ${H}</div>
      <div style="font-size:10px;color:var(--mute);font-family:'IBM Plex Mono'">${esc(time)}${g.venue?' · '+esc(g.venue):''}</div></div>
      <div style="text-align:right;font-family:'IBM Plex Mono';font-size:9px;color:var(--mute)">${A} ${esc(g.away.record||'')}<br>${H} ${esc(g.home.record||'')}</div></div>
    ${score}<div class="sig">${chips.join('')}</div>
    ${g.abstract==='pre'?(()=>{try{return coachHtml({game:g,sim:s,sport:'nba'})}catch(e){return''}})():''}${(()=>{try{return sgpCardHtml('nba',g,s)}catch(e){return''}})()}
    ${g.abstract!=='post'?nbaSection(g,'GAME','full','',L)+nbaSection(g,'1ST HALF','h1','h1',L)+nbaSection(g,'1ST QUARTER','q1','q1',L):''}
    ${!L.length&&g.abstract!=='post'?'<div class="sub" style="font-size:10px;margin-top:4px">No book lines yet — paste your sportsbook\'s NBA lines in Intake for real prices and EV.</div>':''}
    ${typeof pstCardHtml==='function'?pstCardHtml('nba',g):''}
    <div class="legend"><span><i class="v"></i>model sees value</span><span><i class="a"></i>model says pass</span><span><i class="n"></i>no real edge</span></div>
    <div class="legend" style="margin-top:2px"><span>◆ SUPREME = book price, model edge and outside sources all agree</span><span>STRONG = two of three</span><span>⚠ CONFLICT = they disagree</span></div>
    <div class="exprow" style="margin-top:10px">${btn('coach','Coach')}${btn('trends','Trends')}${btn('alt','Alt Lines')}${btn('roster','Roster')}${btn('props','Props')}${btn('box','Proj. Box')}${btn('verdict','Take/Fade')}${g.abstract!=='pre'?btn('live',g.abstract==='post'?'Final Box':'Live Box'):''}</div>
    <div class="panel" id="nbap-${g.id}"></div></div>`;}
/* ── tabs ── */
const NBA_OPEN={};
async function nbaPan(gid,k,btn){const el=document.getElementById('nbap-'+gid);if(!el)return;
  if(NBA_OPEN[gid]===k){NBA_OPEN[gid]=null;el.classList.remove('on');el.innerHTML='';return;}
  NBA_OPEN[gid]=k;el.classList.add('on');el.innerHTML='<div class="empty">Loading…</div>';
  const g=[...NBA_GAMES,...NBA_UPCOMING].find(x=>x.id===gid);if(!g)return;const s=nbaSimFor(g);
  try{el.innerHTML=await NBA_PANELS[k](g,s);}catch(e){el.innerHTML=`<div class="sub">Couldn't load: ${esc(e.message||e)}</div>`;}}
const nbaTable=(head,rows)=>`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono';font-size:10px">
  <tr>${head.map(h=>`<th style="text-align:left;color:var(--mute);padding:3px 4px;border-bottom:1px solid var(--rule)">${h}</th>`).join('')}</tr>
  ${rows.map(r=>`<tr>${r.map(c=>`<td style="padding:3px 4px;border-bottom:1px solid var(--rule)">${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
const NBA_PANELS={
  coach:(g,s)=>{try{return coachBriefing(g,s,'nba')||'<div class="sub">Coach has no read on this game yet.</div>'}catch(e){return'<div class="sub">Coach has no read on this game yet.</div>'}},
  trends:(g)=>{const game=g.away.abbr+'@'+g.home.abbr;let h='';try{h=intelPicksFor('nba',game)||'';}catch(e){}
    try{const I=(get('d4.intel',{})||{});const T=Object.values(I).flat().filter(x=>x&&x.sp==='nba'&&x.game===game&&x.kind==='trend');if(T.length)h+=T.map(t=>`<div class="sub">• ${esc(t.text||'')}</div>`).join('');}catch(e){}
    return String(h).replace(/<[^>]+>/g,'').trim()?h:'<div class="sub">No trends, consensus or outside picks uploaded for this game yet — paste a Covers intel doc in Intake.</div>';},
  alt:(g,s)=>{const A=g.away.abbr,H=g.home.abbr;const base=Math.round(s.margin*2)/2;const r=[];
    [-6,-3,0,3,6].forEach(d=>{const l=-(base+d)||0.5;r.push([`${H} ${nbaSgn(l)}`,(s.homeCover(l)*100).toFixed(0)+'%',nbaSgn(nbaFair(s.homeCover(l))),`${A} ${nbaSgn(-l)}`,(s.awayCover(-l)*100).toFixed(0)+'%',nbaSgn(nbaFair(s.awayCover(-l)))]);});
    const tb=Math.round(s.total);const t=[];[-10,-5,0,5,10].forEach(d=>{const l=tb+d+0.5;t.push([l,(s.over(l)*100).toFixed(0)+'%',nbaSgn(nbaFair(s.over(l))),(s.under(l)*100).toFixed(0)+'%',nbaSgn(nbaFair(s.under(l)))]);});
    const h1=nbaSimFor(g,'h1'),q1=nbaSimFor(g,'q1');
    return'<div class="sub">Model fair prices — compare against your book\'s alt board.</div>'+nbaTable(['home','model','fair','away','model','fair'],r)+nbaTable(['total','over','fair','under','fair'],t)+
      nbaTable(['period','model score','total','home win'],[['1st half',`${h1.awayProj}–${h1.homeProj}`,h1.total.toFixed(1),Math.round(h1.hw*100)+'%'],['1st quarter',`${q1.awayProj}–${q1.homeProj}`,q1.total.toFixed(1),Math.round(q1.hw*100)+'%']]);},
  roster:async(g)=>{const side=async ab=>{const Rr=await rsRoster('nba',ab);if(!Rr.length)return`<div class="sub">${ab}: roster unavailable</div>`;
      return`<div style="flex:1;min-width:150px"><div class="sub"><b>${ab}</b></div>${Rr.map(a=>{const J=pstProj('nba',a.name,'pts');
        return`<div style="font-size:11px">${esc(a.name)} <span style="color:var(--mute)">${esc(a.pos)}</span>${J?` <span class="mono" style="font-size:9.5px;color:var(--gold)">${J.mu.toFixed(1)} pts</span>`:''}</div>`;}).join('')}</div>`;};
    const [a,h]=await Promise.all([side(g.away.abbr),side(g.home.abbr)]);return`<div style="display:flex;gap:12px;flex-wrap:wrap">${a}${h}</div>`;},
  props:(g)=>{const game=g.away.abbr+'@'+g.home.abbr;let h='';try{h+=propBoardHtml('nba',game,20)||'';}catch(e){}
    try{const L=propLikely('nba',30).filter(x=>x.team===g.away.abbr||x.team===g.home.abbr);if(L.length)h+='<div class="mktlab">Likely outcomes (from game logs)</div>'+L.map(x=>`<div class="mono" style="font-size:10.5px;padding:3px 0;border-bottom:1px solid var(--rule)"><b>${esc(x.player)}</b> ${esc(x.team)} · <b>${x.thr}+ ${x.k}</b> · <span style="color:var(--win)">${Math.round(x.p*100)}%</span> · avg ${x.mu.toFixed(1)}</div>`).join('');}catch(e){}
    try{h+=pstCardHtml('nba',g)||'';}catch(e){}
    return h||'<div class="sub">No player data yet — paste NBA prop lines (PROP: Name PTS 24.5 (-110/-110)) and the app pulls each player\'s game log.</div>';},
  box:(g,s)=>{const rows=t=>{const P=(typeof pstTeam==='function'?pstTeam('nba',t,9):[]);if(!P.length)return[[`${t}`,'no player data yet','','','']];
      return P.map(x=>{const v=k=>{const J=pstProj('nba',x.name,k);return J?J.mu.toFixed(1):'—';};return[esc(x.name),v('pts'),v('reb'),v('ast'),v('fg3')];});};
    return`<div class="sub">Projected team score ${g.away.abbr} ${s.awayProj} – ${s.homeProj} ${g.home.abbr} · per-player lines are form-weighted season averages.</div>`+
      nbaTable([g.away.abbr,'PTS','REB','AST','3PM'],rows(g.away.abbr))+nbaTable([g.home.abbr,'PTS','REB','AST','3PM'],rows(g.home.abbr));},
  verdict:(g,s)=>{let v=null;try{v=takeFadeVerdict(g,s,'nba')}catch(e){}if(!v)return'<div class="sub">No take/fade read yet.</div>';
    return`<div class="sub"><b>${esc(v.verdict)}</b>${!(v.reasons||[]).length?' — no strong take or fade signals on this game (your team records, trends and model all quiet).':''}</div>`+(v.reasons||[]).map(x=>`<div class="sub">• ${esc(typeof x==='string'?x:(x.text||''))}</div>`).join('');},
  live:async(g)=>{const j=await fetch(NBA_ESPN+'/summary?event='+g.id).then(r=>r.json()).catch(()=>null);if(!j)return'<div class="sub">Box score unavailable.</div>';
    const box=fbpParseBasketball(j);if(box&&box.state==='post')try{pstatFeed('nba',String(g.id),{...box,date:g.start});}catch(e){}
    const cols=['MIN','PTS','REB','AST','3PT','STL','BLK','TO','+/-'];
    return Object.entries(box.teams||{}).map(([ab,t])=>nbaTable([ab,...cols],(t.players||[]).filter(p=>p.MIN&&p.MIN!=='0').map(p=>[esc(p.name),...cols.map(c=>esc(p[c]==null?'':p[c]))]))).join('')||'<div class="sub">No box score yet.</div>';}};
function renderNBA(){const el=document.getElementById('slate');if(!el)return;
  const by=st=>NBA_GAMES.filter(g=>g.abstract===st);const tag=g=>g.pre?'<div class="mono" style="font-size:9px;color:var(--gold)">PRESEASON — rotations are limited; treat the model as a rough read</div>':'';
  const card=g=>{try{return tag(g)+nbaCard(g);}catch(e){console.warn('nba card',g.id,e);return`<div class="tkt"><b>${esc(g.away.abbr)} @ ${esc(g.home.abbr)}</b><div class="sub">Card failed to build: ${esc(e&&e.message||e)}</div></div>`;}};
  let h=[['in','LIVE'],['pre','TODAY'],['post','FINAL']].map(([k,l])=>by(k).length?`<div class="mktlab">${l}</div>`+by(k).map(card).join(''):'').join('');
  if(!NBA_GAMES.length)h+=`<div class="empty" style="padding:10px 0">No NBA games today.${NBA_UPCOMING.length?' Next games below.':' Nothing scheduled in the next 7 days — the board fills in as the schedule posts.'}${NBA_LOAD_NOTE?`<div class="mono" style="font-size:9.5px;color:var(--mute);margin-top:4px">${esc(NBA_LOAD_NOTE)}</div>`:''}</div>`;
  const days=[...new Set(NBA_UPCOMING.map(g=>g.__date))].sort();
  days.forEach(d=>{const G=NBA_UPCOMING.filter(g=>g.__date===d).sort((a,b)=>String(a.start).localeCompare(String(b.start)));
    h+=`<div class="mktlab">UPCOMING · ${new Date(d+'T12:00:00').toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})} · ${G.length} game${G.length>1?'s':''}</div>`+G.map(card).join('');});
  el.innerHTML=h;}
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
