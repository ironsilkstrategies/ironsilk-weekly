/* TheDesk · data feeds (v2.47) — runs on GitHub Actions (.github/workflows/feeds.yml), never in the app.
   Reads ESPN's public scoreboards and game summaries and writes compact JSON to the `feeds` branch, which the
   app reads from raw.githubusercontent.com. Public sports data only (scores, closing lines, officials) — never a pick.
   Incremental: a final already stored is never fetched again; 21 days kept.
   usage: node feeds/build.mjs <outDir>          (FEEDS_FIXTURES=<file.json> replays saved responses, for tests) */
import fs from 'node:fs';import path from 'node:path';
const OUT=process.argv[2]||'out';fs.mkdirSync(OUT,{recursive:true});
const SPORTS={nfl:['football','nfl',''],ncaaf:['football','college-football','&groups=80&limit=300'],nba:['basketball','nba',''],ncaab:['basketball','mens-college-basketball','&groups=50&limit=300'],nhl:['hockey','nhl',''],mlb:['baseball','mlb','']};
const KEEP_DAYS=21,DAYS_BACK=2,CONC=4;
const FIX=process.env.FEEDS_FIXTURES?JSON.parse(fs.readFileSync(process.env.FEEDS_FIXTURES,'utf8')):null;let calls=0;
async function getJSON(url,hdr){calls++;if(FIX){const v=FIX[url];if(v===undefined)throw new Error('no fixture for '+url);return JSON.parse(JSON.stringify(v));}
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),20000);
  try{const r=await fetch(url,{signal:ctl.signal,headers:hdr||{'user-agent':'TheDesk-feeds/1'}});if(!r.ok)throw new Error(r.status+' '+url);return await r.json();}finally{clearTimeout(t);}}
const read=f=>{try{return JSON.parse(fs.readFileSync(path.join(OUT,f),'utf8'));}catch(e){return null;}};
const ymd=t=>new Date(t).toISOString().slice(0,10).replace(/-/g,'');
const num=s=>{if(s==null)return null;const x=String(s).trim();if(/^even$/i.test(x))return 100;const v=parseFloat(x.replace(/^[ou]/i,''));return isFinite(v)?v:null;};
const side=o=>o?{o:num((o.open||{}).odds),c:num((o.close||{}).odds),ol:num((o.open||{}).line),cl:num((o.close||{}).line)}:null;
/* one final: the score, DraftKings' open → close for every market, and the officials */
function parseSummary(sp,j){const H=j.header||{};const c=(H.competitions||[])[0]||{};if((((c.status||{}).type)||{}).state!=='post')return null;
  const cs=c.competitors||[];const A=cs.find(x=>x.homeAway==='away'),Hm=cs.find(x=>x.homeAway==='home');if(!A||!Hm)return null;
  const ab=t=>String(((t.team||{}).abbreviation)||'').toUpperCase();
  const pc=(j.pickcenter||[]).find(x=>x&&(x.moneyline||x.pointSpread||x.total))||null;
  const refs=(((j.gameInfo||{}).officials)||[]).map(o=>({n:o.displayName||o.fullName||'',p:((o.position||{}).displayName)||((o.position||{}).name)||''})).filter(o=>o.n);
  return{id:String(H.id||c.id||''),sp,st:c.date||'',a:ab(A),h:ab(Hm),as:+A.score||0,hs:+Hm.score||0,neutral:!!c.neutralSite,
    pc:pc?{src:(pc.provider||{}).name||'',ml:{home:side((pc.moneyline||{}).home),away:side((pc.moneyline||{}).away)},spread:{home:side((pc.pointSpread||{}).home),away:side((pc.pointSpread||{}).away)},total:{over:side((pc.total||{}).over),under:side((pc.total||{}).under)}}:null,
    refs};}
async function pool(items,fn){const out=[];let i=0;await Promise.all(Array.from({length:CONC},async()=>{while(i<items.length){const k=i++;try{out[k]=await fn(items[k]);}catch(e){out[k]={err:String(e.message||e).slice(0,160)};}}}));return out;}
/* v2.87.7 · A SECOND OPINION on every final — the leagues' own public score feeds, checked against ESPN's:
   NHL (api-web.nhle.com), NBA (cdn.nba.com's season schedule), college basketball and football (NCAA.com via ncaa-api).
   Each ESPN final gets x:{s:source, as, hs} when the league agrees or disagrees; the app grades on ESPN and
   holds a leg whose two sources disagree. Public scores only. */
const VERIFY_DAYS=3;
/* the NBA's CDN answers browsers only; NCAA.com's own scoreboard JSON is gone (404), so college comes through the open-source
   ncaa-api (ncaa-api.henrygd.me), which reads NCAA.com's scoreboards and serves them in NCAA's own format */
const BROWSER={'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15','accept':'application/json,text/plain,*/*'};
const NCAA_API='https://ncaa-api.henrygd.me/scoreboard/';
const etDay=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const NHL_C={NJD:'NJ',SJS:'SJ',TBL:'TB',LAK:'LA',UTA:'UTAH',VEG:'VGK',MON:'MTL',WAS:'WSH'},NBA_C={GSW:'GS',NYK:'NY',NOP:'NO',SAS:'SA',UTA:'UTAH',WAS:'WSH',BRK:'BKN',PHO:'PHX',CHO:'CHA'};
const near=(a,b,h)=>{const x=Date.parse(a),y=Date.parse(b);return isFinite(x)&&isFinite(y)&&Math.abs(x-y)<=h*36e5;};
/* school names, both ways: "Iowa St." / "Iowa State" / "Saint Mary's (CA)" → comparable tokens */
const norm=s=>String(s||'').toLowerCase().replace(/\(.*?\)/g,' ').replace(/&/g,' and ').replace(/\bst\.?(?=\s|$)/g,'state').replace(/\bsaint\b/g,'state').replace(/\buniversity\b|\buniv\.?\b|\bof\b|\bthe\b|\bat\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
const toks=s=>norm(s).split(' ').filter(Boolean);
function nameHit(A,B){let best=0;for(const a of A){const ta=toks(a);if(!ta.length)continue;for(const b of B){const tb=toks(b);if(!tb.length)continue;
  if(ta.join(' ')===tb.join(' '))return 1;const [s,l]=ta.length<=tb.length?[ta,tb]:[tb,ta];if(s.every(x=>l.includes(x))&&s.join('').length>=4)best=Math.max(best,.8);}}return best;}
async function verifyFinals(games,diag){
  const since=new Date(Date.now()-VERIFY_DAYS*864e5).toISOString();
  const open=Object.values(games).filter(g=>g&&g.st>=since&&!g.x);if(!open.length)return;
  const days=sp=>[...new Set(open.filter(g=>g.sp===sp).map(g=>etDay(g.st)))];
  const put=(g,s,as,hs)=>{g.x={s,as:+as,hs:+hs,ok:+as===g.as&&+hs===g.hs};const D=diag[s]||(diag[s]={n:0,ok:0,bad:0});D.n++;g.x.ok?D.ok++:D.bad++;};
  /* NHL — one call per day */
  for(const d of days('nhl')){try{const j=await getJSON(`https://api-web.nhle.com/v1/score/${d}`);
    (j.games||[]).forEach(o=>{if(!/OFF|FINAL/.test(o.gameState||''))return;const a=NHL_C[o.awayTeam.abbrev]||o.awayTeam.abbrev,h=NHL_C[o.homeTeam.abbrev]||o.homeTeam.abbrev;
      const g=open.find(z=>z.sp==='nhl'&&!z.x&&z.a===a&&z.h===h&&near(z.st,o.startTimeUTC,4));if(g)put(g,'nhl',o.awayTeam.score,o.homeTeam.score);});}catch(e){(diag.err=diag.err||[]).push('nhl '+d+': '+String(e.message).slice(0,60));}}
  /* NBA — the season schedule carries every final's score */
  if(days('nba').length){try{const j=await getJSON('https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json',{...BROWSER,referer:'https://www.nba.com/',origin:'https://www.nba.com'});
    ((j.leagueSchedule||{}).gameDates||[]).forEach(D=>(D.games||[]).forEach(o=>{if(+o.gameStatus!==3)return;const a=NBA_C[o.awayTeam.teamTricode]||o.awayTeam.teamTricode,h=NBA_C[o.homeTeam.teamTricode]||o.homeTeam.teamTricode;
      const g=open.find(z=>z.sp==='nba'&&!z.x&&z.a===a&&z.h===h&&near(z.st,o.gameDateTimeUTC,4));if(g)put(g,'nba',o.awayTeam.score,o.homeTeam.score);}));}catch(e){(diag.err=diag.err||[]).push('nba: '+String(e.message).slice(0,60));}}
  /* college — NCAA.com (via ncaa-api), matched by school names (both orientations: neutral sites) and kickoff */
  const ncaa=async(sp,url)=>{const j=await getJSON(url);(j.games||[]).forEach(w=>{const o=w.game||w;if(!/final/i.test(o.gameState||''))return;
    const nm=t=>[t.names&&t.names.short,t.names&&t.names.full,t.names&&t.names.seo&&t.names.seo.replace(/-/g,' '),t.names&&t.names.char6].filter(Boolean);
    const st=o.startTimeEpoch?new Date(+o.startTimeEpoch*1000).toISOString():null;
    const cand=open.filter(z=>z.sp===sp&&!z.x&&z.n&&(!st||near(z.st,st,5)));
    for(const g of cand){const s1=nameHit(nm(o.away),g.n.a)+nameHit(nm(o.home),g.n.h),s2=nameHit(nm(o.away),g.n.h)+nameHit(nm(o.home),g.n.a);
      if(s1>=1.6){put(g,'ncaa',o.away.score,o.home.score);break;}if(s2>=1.6){put(g,'ncaa',o.home.score,o.away.score);break;}}});};
  for(const d of days('ncaab')){const [Y,M,Dd]=d.split('-');try{await ncaa('ncaab',`${NCAA_API}basketball-men/d1/${Y}/${M}/${Dd}/all-conf`);}catch(e){(diag.err=diag.err||[]).push('ncaab '+d+': '+String(e.message).slice(0,60));}}
  const wk=[...new Set(open.filter(g=>g.sp==='ncaaf'&&g.wk).map(g=>g.wk))];
  for(const w of wk){const Y=String(open.find(g=>g.wk===w).st).slice(0,4);try{await ncaa('ncaaf',`${NCAA_API}football/fbs/${Y}/${String(w).padStart(2,'0')}/all-conf`);}catch(e){(diag.err=diag.err||[]).push('ncaaf wk'+w+': '+String(e.message).slice(0,60));}}
}
/* v2.88.1 · PROPS — DraftKings' board for every game in the next day and a half, through ESPN's public odds API: player
   lines and "X+" milestones (for the SGP legs' prices) and the 1st-half / 1st-period lines (the 1st-half list without a paste).
   Public prices only. Athlete names are looked up once and kept (ath.json). */
const PROP_SP={nba:['basketball/nba','basketball/leagues/nba'],ncaab:['basketball/mens-college-basketball','basketball/leagues/mens-college-basketball','&groups=50&limit=300'],
  nhl:['hockey/nhl','hockey/leagues/nhl'],nfl:['football/nfl','football/leagues/nfl'],ncaaf:['football/college-football','football/leagues/college-football','&groups=80&limit=300']};
const PROP_MAX_EV={nba:15,nhl:16,nfl:16,ncaaf:40,ncaab:60};
/* the stat a DraftKings prop type is about (combos like "Points and Rebounds" are left out) */
function propStat(sp,t){t=String(t||'').trim().replace(/\s+/g,' ');const is=(re)=>re.test(t);   /* exact names only — "Offensive Rebounds" is not rebounds */
  const M=n=>new RegExp('^(total )?'+n+'( milestones)?$','i');
  if(sp==='nhl'){if(is(M('shots on goal')))return's';if(is(M('points')))return'pts';if(is(M('assists')))return'ast';if(is(/^goals milestones$/i))return'g';return null;}
  if(sp==='nba'||sp==='ncaab'){if(is(M('points')))return'pts';if(is(M('rebounds')))return'reb';if(is(M('assists')))return'ast';if(is(M('(3-point field goals|threes|3-pointers made)')))return'fg3';return null;}
  if(is(M('passing yards')))return'py';if(is(M('rushing yards')))return'ry';if(is(M('receiving yards')))return'wy';if(is(M('receptions')))return'rec';return null;}
const refId=(o,re)=>{const m=String((o||{}).$ref||'').match(re);return m?m[1]:null;};
async function buildProps(diag){const now=Date.now();const ath=read('ath.json')||{v:1,a:{}};const A=ath.a||{};const out={v:1,ts:new Date(now).toISOString(),ev:{}};const D={ev:0,items:0,props:0,half:0,types:{},err:[]};
  const days=[0,1].map(b=>etDay(now+b*864e5).replace(/-/g,''));
  for(const [sp,[path,core,q]] of Object.entries(PROP_SP)){let evs=[];
    for(const d of days){try{const sb=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${d}${q||''}`);
      (sb.events||[]).forEach(ev=>{const st=ev.date;const s=(((ev.status||{}).type)||{}).state;if(s!=='pre'||!st||Date.parse(st)>now+36*36e5||evs.some(e=>e.id===ev.id))return;
        const cs=(((ev.competitions||[])[0]||{}).competitors)||[];const aw=cs.find(x=>x.homeAway==='away'),hm=cs.find(x=>x.homeAway==='home');if(!aw||!hm)return;
        evs.push({id:String(ev.id),st,a:String(aw.team.abbreviation).toUpperCase(),h:String(hm.team.abbreviation).toUpperCase(),ta:String(aw.team.id),th:String(hm.team.id),
          rank:Math.min(+(((aw.curatedRank||{}).current)||99),+(((hm.curatedRank||{}).current)||99))});});}catch(e){D.err.push(sp+' sb '+String(e.message).slice(0,40));}}
    evs.sort((x,y)=>x.rank-y.rank||x.st.localeCompare(y.st));evs=evs.slice(0,PROP_MAX_EV[sp]||16);
    await pool(evs,async e=>{let items=[];try{for(let pg=1;pg<=4;pg++){const j=await getJSON(`https://sports.core.api.espn.com/v2/sports/${core}/events/${e.id}/competitions/${e.id}/odds/100/propBets?lang=en&region=us&limit=1000&page=${pg}`);
          items=items.concat(j.items||[]);if(!j.pageCount||pg>=j.pageCount)break;}}catch(err){if(!/404/.test(err.message))D.err.push(sp+' '+e.id+' '+String(err.message).slice(0,40));return;}
      if(!items.length)return;D.ev++;D.items+=items.length;const E={sp,a:e.a,h:e.h,st:e.st,p:[],half:{}};
      const half=[];
      items.forEach(it=>{const t=(it.type||{}).name||'';D.types[sp+'|'+t]=(D.types[sp+'|'+t]||0)+1;const pr=+((it.odds||{}).american||{}).value;const line=+(((it.current||{}).target||{}).value);
        const aid=refId(it.athlete,/athletes\/(\d+)/);
        if(aid){const k=propStat(sp,t);if(!k||!isFinite(pr))return;E.p.push([aid,k,isFinite(line)?line:null,pr,/milestone/i.test(t)?'m':'t',String((it.type||{}).id||'')]);return;}
        if(/^(1st half|1st period)/i.test(t))half.push({t,pr,line,team:refId(it.team,/teams\/(\d+)/)||refId(it.competitor,/competitors\/(\d+)/),raw:it});});
      /* one stat name can carry two ladders (DraftKings' 1st-quarter "Rebounds Milestones" shares the full game's name, under
         another type id): per player and stat, the full-game ladder is the one with the higher lines */
      {const G={};E.p.forEach(r=>{const k=r[0]+'|'+r[1]+'|'+r[4];(G[k]=G[k]||{})[r[5]]=(G[k][r[5]]||[]).concat([r]);});
        const keep=new Set();Object.values(G).forEach(byT=>{const med=L=>{const v=L.map(r=>+r[2]).filter(isFinite).sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:0;};
          const best=Object.entries(byT).sort((a,b)=>med(b[1])-med(a[1])||b[1].length-a[1].length)[0];if(best)best[1].forEach(r=>keep.add(r));});
        E.p=E.p.filter(r=>keep.has(r)).map(r=>r.slice(0,5));}
      /* first half / first period: totals come as an over-under pair at one line; sides carry their team */
      const H={};half.forEach(x=>{const tt=x.t.toLowerCase();const side=x.team===e.ta?'a':x.team===e.th?'h':null;
        if(/total/.test(tt)&&!/team/.test(tt)){(H.ouL=H.ouL||[]).push(x);}
        else if(/spread|puck line/.test(tt)&&side){(H.sp=H.sp||{})[side]={line:x.line,price:x.pr};}
        else if(/moneyline/.test(tt)&&side){(H.ml=H.ml||{})[side]={price:x.pr};}});
      /* the pair carries no over/under tag and its order isn't reliable — the line, and both prices unassigned */
      if(H.ouL&&H.ouL.length>=2){const L=H.ouL.filter(x=>x.line===H.ouL[0].line);if(L.length>=2)H.ou={line:L[0].line,pr:[L[0].pr,L[1].pr]};}delete H.ouL;
      if(Object.keys(H).length){E.half=H;D.half++;}
      if(!D.halfSample&&half.length)D.halfSample=JSON.stringify(half.slice(0,3).map(x=>({t:x.t,pr:x.pr,line:x.line,team:x.team,keys:Object.keys(x.raw)}))).slice(0,600);
      /* names: looked up once, kept */
      const need=[...new Set(E.p.map(r=>r[0]))].filter(id=>!A[id]);
      await pool(need,async id=>{try{const j=await getJSON(`https://sports.core.api.espn.com/v2/sports/${core}/athletes/${id}?lang=en&region=us`);A[id]=j.displayName||j.fullName||'';}catch(err){A[id]=A[id]||'';}});
      E.p=E.p.map(r=>[A[r[0]]||'',r[1],r[2],r[3],r[4]]).filter(r=>r[0]);D.props+=E.p.length;out.ev[e.id]=E;});}
  fs.writeFileSync(path.join(OUT,'props.json'),JSON.stringify(out));
  const ids=Object.keys(A);if(ids.length>30000)ids.slice(0,ids.length-30000).forEach(k=>delete A[k]);fs.writeFileSync(path.join(OUT,'ath.json'),JSON.stringify({v:1,a:A}));
  D.types=Object.entries(D.types).sort((x,y)=>y[1]-x[1]).slice(0,40).map(([k,n])=>k+':'+n).join(' | ');D.err=D.err.slice(0,8);diag.props=D;return out;}
/* v2.90.0 · THE SEASON — every final since opening day with its closing line, for the Underdog Spotter: who wins and covers
   as a dog, who loses as a favorite, a power rating from the margins, each team's rest, and who's back from injury.
   season.json keeps the games (the robot's own memory); teams.json is what the app reads. Public results and lines only. */
const SEASON_FROM={nfl:'2026-09-09',ncaaf:'2026-08-29',nhl:'2026-10-06',nba:'2026-10-20',ncaab:'2026-11-02'};
const TEAM_SP={nfl:['football','nfl',''],ncaaf:['football','college-football','&groups=80&limit=300'],nhl:['hockey','nhl',''],nba:['basketball','nba',''],ncaab:['basketball','mens-college-basketball','&groups=50&limit=300']};
const BACKFILL_DAYS=14,SUMMARY_BUDGET=160;
const dayAdd=(d,n)=>{const t=new Date(d+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);};
/* the closing line off a scoreboard event (both of ESPN's shapes): home spread, both moneylines, the total */
function sbLine(c,a,h){const o=(c.odds||[])[0];if(!o)return null;let spH=null,mlA=null,mlH=null,tot=null;
  const cl=x=>x&&(x.close||x.current||x.open)||null;
  if(o.pointSpread){const x=cl(o.pointSpread.home);if(x)spH=num(x.line);}if(o.moneyline){const xa=cl(o.moneyline.away),xh=cl(o.moneyline.home);if(xa)mlA=num(xa.odds);if(xh)mlH=num(xh.odds);}
  if(o.total){const x=cl(o.total.over);if(x)tot=num(x.line);}
  if(mlA==null&&o.awayTeamOdds&&isFinite(+o.awayTeamOdds.moneyLine))mlA=+o.awayTeamOdds.moneyLine;if(mlH==null&&o.homeTeamOdds&&isFinite(+o.homeTeamOdds.moneyLine))mlH=+o.homeTeamOdds.moneyLine;
  if(spH==null&&o.details){const m=String(o.details).match(/^([A-Z0-9&]+)\s*([+-]?\d+(?:\.\d+)?)$/i);if(m){const v=Math.abs(+m[2]);spH=m[1].toUpperCase()===h?-v:m[1].toUpperCase()===a?v:null;}else if(/^(even|pk|pick)/i.test(o.details))spH=0;}
  if(tot==null&&isFinite(+o.overUnder))tot=+o.overUnder;
  return spH==null&&mlA==null?null:{spH,mlA,mlH,tot};}
async function buildTeams(diag,closes){const now=Date.now(),td=etDay(now);const S=read('season.json')||{v:1,g:{},done:{}};S.g=S.g||{};S.done=S.done||{};const D={fetched:0,added:0,lined:0,sum:0,err:[]};
  const upc={};let sumLeft=SUMMARY_BUDGET;
  for(const [sp,[s,l,q]] of Object.entries(TEAM_SP)){const from=SEASON_FROM[sp];if(!from||from>td)continue;
    const all=[];for(let d=from;d<=dayAdd(td,1);d=dayAdd(d,1))all.push(d);
    const recent=all.filter(d=>d>=dayAdd(td,-2));const back=all.filter(d=>d<dayAdd(td,-2)&&!S.done[sp+'|'+d]).reverse().slice(0,BACKFILL_DAYS);
    for(const d of [...recent,...back]){let sb=null;try{sb=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/scoreboard?dates=${d.replace(/-/g,'')}${q}`);D.fetched++;}catch(e){if(D.err.length<6)D.err.push(sp+' '+d+' '+String(e.message).slice(0,30));continue;}
      (sb.events||[]).forEach(ev=>{const c=(ev.competitions||[])[0]||{};const cs=c.competitors||[];const A=cs.find(x=>x.homeAway==='away'),H=cs.find(x=>x.homeAway==='home');if(!A||!H)return;
        const a=String((A.team||{}).abbreviation||'').toUpperCase(),h=String((H.team||{}).abbreviation||'').toUpperCase();const st=(((ev.status||{}).type)||{}).state;
        const ln=sbLine(c,a,h);const conf=c.conferenceCompetition?1:0;
        if(st==='pre'){if(Date.parse(ev.date)<=now+40*36e5)(upc[sp]=upc[sp]||[]).push({id:String(ev.id),st:ev.date,a,h,conf,neutral:c.neutralSite?1:0,ln});return;}
        if(st!=='post')return;const id=String(ev.id);const old=S.g[id];
        const row=[sp,etDay(ev.date),a,h,+A.score||0,+H.score||0,ln?ln.spH:null,ln?ln.mlA:null,ln?ln.mlH:null,ln?ln.tot:null,conf,c.neutralSite?1:0];
        if(!old){D.added++;S.g[id]=row;}else if(old[6]==null&&old[7]==null&&ln){S.g[id]=row;}});
      if(d<dayAdd(td,-2))S.done[sp+'|'+d]=1;}}
  /* DraftKings' close from the robot's own finals beats a scoreboard's leftovers; anything still lineless gets one summary read */
  Object.values(closes||{}).forEach(g=>{const r=S.g[g.id];if(!r||!g.pc)return;const c=x=>x?(x.c!=null?x.c:x.o):null,cl=x=>x?(x.cl!=null?x.cl:x.ol):null;
    const spH=cl((g.pc.spread||{}).home),mlA=c((g.pc.ml||{}).away),mlH=c((g.pc.ml||{}).home),tot=cl((g.pc.total||{}).over);if(spH!=null)r[6]=spH;if(mlA!=null)r[7]=mlA;if(mlH!=null)r[8]=mlH;if(tot!=null)r[9]=tot;});
  const need=Object.entries(S.g).filter(([id,r])=>r[6]==null&&r[7]==null&&!r[12]).slice(-sumLeft);
  await pool(need,async([id,r])=>{const [s,l]=TEAM_SP[r[0]];try{const j=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/summary?event=${id}`);D.sum++;
    const pc=(j.pickcenter||[]).find(x=>x&&(x.moneyline||x.pointSpread||x.spread!=null))||null;
    if(pc){const c=x=>x?num((x.close||x.open||{}).odds):null,cl=x=>x?num((x.close||x.open||{}).line):null;
      r[6]=cl((pc.pointSpread||{}).home);r[7]=c((pc.moneyline||{}).away);r[8]=c((pc.moneyline||{}).home);r[9]=cl((pc.total||{}).over);
      if(r[6]==null&&pc.spread!=null){const hf=pc.homeTeamOdds&&pc.homeTeamOdds.favorite;r[6]=hf?-Math.abs(+pc.spread):Math.abs(+pc.spread);}
      if(r[7]==null&&pc.awayTeamOdds)r[7]=num(pc.awayTeamOdds.moneyLine);if(r[8]==null&&pc.homeTeamOdds)r[8]=num(pc.homeTeamOdds.moneyLine);if(r[9]==null&&pc.overUnder!=null)r[9]=+pc.overUnder;}
    if(r[6]==null&&r[7]==null)r[12]=1;}catch(e){r[12]=1;}});   /* r[12]: no line anywhere — don't ask again */
  D.lined=Object.values(S.g).filter(r=>r[6]!=null||r[7]!=null).length;D.games=Object.keys(S.g).length;
  fs.writeFileSync(path.join(OUT,'season.json'),JSON.stringify(S));
  /* the teams */
  const T={};const lg={};
  Object.values(S.g).sort((x,y)=>x[1].localeCompare(y[1])).forEach(r=>{const [sp,d,a,h,as,hs,spH,mlA,mlH]=r;const L=lg[sp]||(lg[sp]={g:0,pts:0,dogN:0,dogW:0,dogC:0,dogATSn:0});L.g++;L.pts+=as+hs;
    [[a,h,as,hs,spH!=null?-spH:null,mlA,mlH,0],[h,a,hs,as,spH,mlH,mlA,1]].forEach(([t,o,pf,pa,sp_,ml,oml,home])=>{const k=sp+'|'+t;
      const x=T[k]||(T[k]={n:0,pf:0,pa:0,dog:[0,0,0,0],fav:[0,0,0,0],form:[],last:null,opp:[],mar:[]});x.n++;x.pf+=pf;x.pa+=pa;x.last=d;x.opp.push(sp+'|'+o);x.mar.push(pf-pa);
      const dog=ml!=null&&oml!=null?ml>oml:sp_!=null?sp_>0:null;const won=pf>pa;const cov=sp_!=null?(pf-pa+sp_>0?1:pf-pa+sp_===0?0.5:0):null;
      if(dog!=null){const B=dog?x.dog:x.fav;B[0]++;if(won)B[1]++;if(cov===1)B[2]++;if(cov===0.5)B[3]++;if(dog){L.dogN++;if(won)L.dogW++;if(cov!=null){L.dogATSn++;if(cov===1)L.dogC++;}}}
      x.form.push((won?'W':'L')+(cov===1?'c':cov===0?'x':''));if(x.form.length>6)x.form.shift();});});
  /* a power rating from the margins, adjusted for who they played (10 passes) */
  Object.keys(TEAM_SP).forEach(sp=>{const ks=Object.keys(T).filter(k=>k.startsWith(sp+'|'));const r={};ks.forEach(k=>r[k]=T[k].mar.reduce((a,b)=>a+b,0)/T[k].mar.length);
    for(let it=0;it<10;it++){const nr={};ks.forEach(k=>{const x=T[k];const os=x.opp.map(o=>r[o]||0);nr[k]=x.mar.reduce((a,b)=>a+b,0)/x.n+os.reduce((a,b)=>a+b,0)/os.length;});
      const m=ks.reduce((a,k)=>a+nr[k],0)/(ks.length||1);ks.forEach(k=>r[k]=nr[k]-m);}
    ks.forEach(k=>T[k].pw=+r[k].toFixed(2));});
  const out={v:1,ts:new Date(now).toISOString(),lg:{},t:{},up:{}};
  Object.entries(lg).forEach(([sp,L])=>out.lg[sp]={ppg:+(L.pts/L.g/2).toFixed(2),dogSU:L.dogN?+(L.dogW/L.dogN).toFixed(3):null,dogATS:L.dogATSn?+(L.dogC/L.dogATSn).toFixed(3):null,g:L.g});
  Object.entries(T).forEach(([k,x])=>out.t[k]={n:x.n,pf:+(x.pf/x.n).toFixed(2),pa:+(x.pa/x.n).toFixed(2),dog:x.dog,fav:x.fav,form:x.form.join(' '),last:x.last,pw:x.pw});
  /* the next day and a half: rest days and back-to-backs for both teams, conference games */
  Object.entries(upc).forEach(([sp,L])=>{out.up[sp]=L.map(u=>{const rest=t=>{const x=T[sp+'|'+t];if(!x||!x.last)return null;return Math.round((Date.parse(etDay(u.st)+'T12:00:00Z')-Date.parse(x.last+'T12:00:00Z'))/864e5);};
    return{...u,restA:rest(u.a),restH:rest(u.h)};});});
  /* back from injury: on the injury report last time, off it (or upgraded) now — remembered 3 days */
  try{const I=read('inj.json')||{snap:{},ret:{}};const snap={};
    for(const sp of ['nfl','nba','nhl']){const [s,l]=TEAM_SP[sp];try{const j=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/injuries`);
      (j.injuries||[]).forEach(t=>{const ab=String(((t.team||{}).abbreviation)||t.abbreviation||'').toUpperCase()||String(t.displayName||'');(t.injuries||[]).forEach(x=>{const n=((x.athlete||{}).displayName)||'';if(n)snap[sp+'|'+ab+'|'+n]=String(x.status||'');});});}catch(e){if(D.err.length<8)D.err.push(sp+' inj '+String(e.message).slice(0,30));}}
    const had=Object.keys(snap).length>0;
    if(had){Object.entries(I.snap||{}).forEach(([k,stt])=>{if(!/out|injured reserve|ir|doubtful/i.test(stt))return;const now2=snap[k];if(now2&&/out|injured reserve|doubtful/i.test(now2))return;
        const [sp,ab,n]=k.split('|');const K=sp+'|'+ab;(I.ret[K]=I.ret[K]||[]).push({n,d:td});});
      Object.keys(I.ret).forEach(K=>{I.ret[K]=I.ret[K].filter(x=>x.d>=dayAdd(td,-3));if(!I.ret[K].length)delete I.ret[K];});I.snap=snap;}
    fs.writeFileSync(path.join(OUT,'inj.json'),JSON.stringify(I));out.ret=I.ret;D.ret=Object.keys(I.ret).length;D.injSnap=Object.keys(I.snap).length;}catch(e){D.err.push('inj '+String(e.message).slice(0,40));}
  fs.writeFileSync(path.join(OUT,'teams.json'),JSON.stringify(out));D.teams=Object.keys(out.t).length;D.err=D.err.slice(0,8);diag.teams=D;return out;}
/* v2.91.0 · HISTORY — ten finished seasons for the Historian: every regular-season and postseason game (NFL, college football,
   NBA, NHL; the NCAA tournament for college basketball), fetched a slice per run until it's whole (history.json = the robot's
   memory). historian.json is what the app reads: each team's prestige (playoff trips, playoff wins, titles, ten-year and
   three-year records), units that have been exposed for years (scoring and defense against the league), every pairing's last
   meetings, and referees' home records as they pile up. Public results only. */
const HIST_SEASONS={nfl:[2016,2025],ncaaf:[2016,2025],nba:[2017,2026],nhl:[2017,2026],ncaab:[2016,2026]};
const HIST_BUDGET=230;
const HIST_PATH={nfl:['football','nfl'],ncaaf:['football','college-football'],nba:['basketball','nba'],nhl:['hockey','nhl'],ncaab:['basketball','mens-college-basketball']};
function histTasks(teamIds){const T=[];const [n0,n1]=HIST_SEASONS.nfl;for(let y=n1;y>=n0;y--){for(let w=1;w<=18;w++)T.push({k:`nfl|${y}|2|${w}`,sp:'nfl',y,st:2,u:`football/nfl/scoreboard?dates=${y}&seasontype=2&week=${w}`});for(let w=1;w<=5;w++)T.push({k:`nfl|${y}|3|${w}`,sp:'nfl',y,st:3,u:`football/nfl/scoreboard?dates=${y}&seasontype=3&week=${w}`});}
  const [c0,c1]=HIST_SEASONS.ncaaf;for(let y=c1;y>=c0;y--){for(let w=1;w<=15;w++)T.push({k:`ncaaf|${y}|2|${w}`,sp:'ncaaf',y,st:2,u:`football/college-football/scoreboard?dates=${y}&seasontype=2&week=${w}&groups=80&limit=300`});T.push({k:`ncaaf|${y}|3|1`,sp:'ncaaf',y,st:3,u:`football/college-football/scoreboard?dates=${y}&seasontype=3&week=1&groups=80&limit=300`});}
  const [b0,b1]=HIST_SEASONS.ncaab;for(let y=b1;y>=b0;y--){if(y===2020)continue;T.push({k:`ncaab|${y}|3|t`,sp:'ncaab',y,st:3,u:`basketball/mens-college-basketball/scoreboard?dates=${y}0314-${y}0410&seasontype=3&groups=100&limit=300`});}
  for(const sp of ['nba','nhl']){const [a0,a1]=HIST_SEASONS[sp];const [s,l]=HIST_PATH[sp];for(let y=a1;y>=a0;y--)(teamIds[sp]||[]).forEach(id=>{[2,3].forEach(st=>T.push({k:`${sp}|${y}|${st}|${id}`,sp,y,st,u:`${s}/${l}/teams/${id}/schedule?season=${y}&seasontype=${st}`}));});}
  /* newest seasons first, sports interleaved, so the recent meetings fill in before the old ones */
  return T.sort((x,y)=>y.y-x.y||x.sp.localeCompare(y.sp));}
const scoreOf=c=>{const v=c&&c.score;if(v==null)return null;if(typeof v==='object')return isFinite(+v.value)?+v.value:(isFinite(+v.displayValue)?+v.displayValue:null);return isFinite(+v)?+v:null;};
async function buildHistory(diag,closes,season){const H=read('history.json')||{v:1,g:{},done:{},ids:{},abbr:{},ref:{},refSeen:{}};['g','done','ids','abbr','ref','refSeen'].forEach(k=>H[k]=H[k]||{});const D={calls:0,added:0,err:[]};
  /* the teams now, by id — a franchise that moved (OAK → LV) reads as who it is today */
  for(const sp of ['nfl','nba','nhl','ncaaf']){if(H.ids[sp]&&H.ids[sp].length&&H.abbr[sp])continue;const [s,l]=HIST_PATH[sp];
    try{const j=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/teams?limit=1000${sp==='ncaaf'?'&groups=80':''}`);D.calls++;
      const L=(((j.sports||[])[0]||{}).leagues||[])[0]||{};const ts=(L.teams||[]).map(x=>x.team||x);H.ids[sp]=ts.map(t=>String(t.id));H.abbr[sp]={};ts.forEach(t=>{H.abbr[sp][String(t.id)]=String(t.abbreviation||'').toUpperCase();});}catch(e){D.err.push(sp+' teams '+String(e.message).slice(0,30));}}
  const tasks=histTasks(H.ids).filter(t=>!H.done[t.k]).slice(0,HIST_BUDGET);
  await pool(tasks,async t=>{let j;try{j=await getJSON('https://site.api.espn.com/apis/site/v2/sports/'+t.u);D.calls++;}catch(e){if(/404|400/.test(e.message))H.done[t.k]=1;else if(D.err.length<8)D.err.push(t.k+' '+String(e.message).slice(0,30));return;}
    (j.events||[]).forEach(ev=>{const c=(ev.competitions||[])[0]||{};if(!(((c.status||{}).type||{}).completed||((((c.status||ev.status||{}).type)||{}).state==='post')))return;
      const cs=c.competitors||[];const A=cs.find(x=>x.homeAway==='away'),Hm=cs.find(x=>x.homeAway==='home');if(!A||!Hm)return;
      const abT=x=>{const tm=x.team||{};return((H.abbr[t.sp]||{})[String(tm.id)])||String(tm.abbreviation||'').toUpperCase();};
      const a=abT(A),h=abT(Hm),as=scoreOf(A),hs=scoreOf(Hm);if(!a||!h||as==null||hs==null)return;
      const id=String(ev.id);if(!H.g[id])D.added++;H.g[id]=[t.sp,t.y,t.st,String(ev.date||c.date||'').slice(0,10),a,h,as,hs,c.neutralSite?1:0];});
    H.done[t.k]=1;});
  /* referees: the crew chief (first listed) on every final the robot has read, with the home team's result and cover */
  Object.values(closes||{}).forEach(g=>{if(!g||!g.refs||!g.refs.length||H.refSeen[g.id])return;const chief=(g.refs.find(r=>/referee|crew chief/i.test(r.p))||g.refs[0]).n;if(!chief)return;
    const k=g.sp+'|'+chief;const R=H.ref[k]||(H.ref[k]={g:0,hw:0,hc:0,hcn:0,hm:0});R.g++;if(g.hs>g.as)R.hw++;R.hm+=g.hs-g.as;
    const sp_=g.pc&&g.pc.spread&&g.pc.spread.home?(g.pc.spread.home.cl!=null?g.pc.spread.home.cl:g.pc.spread.home.ol):null;if(sp_!=null){R.hcn++;if(g.hs-g.as+sp_>0)R.hc++;}H.refSeen[g.id]=1;});
  D.games=Object.keys(H.g).length;D.left=histTasks(H.ids).filter(t=>!H.done[t.k]).length;
  fs.writeFileSync(path.join(OUT,'history.json'),JSON.stringify(H));
  /* the app's view */
  const all=Object.values(H.g).concat(Object.values((season&&season.g)||{}).map(r=>[r[0],'cur',2,r[1],r[2],r[3],r[4],r[5],r[11]||0]));
  const P={};const pk=(sp,t)=>sp+'|'+t;const lastPost={};
  all.forEach(r=>{const [sp,y,st,d,a,h,as,hs]=r;[[a,as,hs],[h,hs,as]].forEach(([t,pf,pa])=>{const x=P[pk(sp,t)]||(P[pk(sp,t)]={y:{},po:new Set(),pw:0,ti:0});
      if(st===2){const Y=x.y[y]||(x.y[y]={w:0,l:0,pf:0,pa:0,n:0});Y.n++;Y.pf+=pf;Y.pa+=pa;pf>pa?Y.w++:Y.l++;}else{x.po.add(y);if(pf>pa)x.pw++;}});
    if(st===3&&y!=='cur'){const k=sp+'|'+y;if(!lastPost[k]||d>=lastPost[k].d)lastPost[k]={d,w:as>hs?a:h};}});
  Object.values(lastPost).forEach((v,i)=>{const k=Object.keys(lastPost)[i].split('|')[0];const x=P[pk(k,v.w)];if(x)x.ti++;});
  /* scoring and defense against the league, season by season → each unit's percentile over the last three finished seasons */
  const out={v:1,ts:new Date().toISOString(),t:{},h2h:{},ref:{},lg:{}};
  Object.keys(HIST_SEASONS).forEach(sp=>{const ks=Object.keys(P).filter(k=>k.startsWith(sp+'|'));const yrs=[...new Set(ks.flatMap(k=>Object.keys(P[k].y)).filter(y=>y!=='cur'))].sort().slice(-3);
    const unit=(k,f)=>{const Y=yrs.map(y=>P[k].y[y]).filter(Boolean);return Y.length?Y.reduce((a,v)=>a+f(v)/v.n,0)/Y.length:null;};
    const off=ks.map(k=>[k,unit(k,v=>v.pf)]).filter(x=>x[1]!=null),def=ks.map(k=>[k,unit(k,v=>v.pa)]).filter(x=>x[1]!=null);
    const pct=(L,k,lowGood)=>{const v=(L.find(x=>x[0]===k)||[])[1];if(v==null)return null;const s=L.map(x=>x[1]).sort((a,b)=>a-b);const i=s.filter(x=>x<v).length;const q=s.length>1?i/(s.length-1):0.5;return+(lowGood?1-q:q).toFixed(2);};
    ks.forEach(k=>{const x=P[k];const fin=Object.entries(x.y).filter(([y])=>y!=='cur');const W=fin.reduce((a,[,v])=>a+v.w,0),N=fin.reduce((a,[,v])=>a+v.n,0);
      const f3=fin.sort((a,b)=>String(a[0]).localeCompare(String(b[0]))).slice(-3);const W3=f3.reduce((a,[,v])=>a+v.w,0),N3=f3.reduce((a,[,v])=>a+v.n,0);const cur=x.y.cur;
      const po=x.po.size,seasons=fin.length;const pres=Math.round(Math.min(100,40*po/Math.max(5,Math.min(10,seasons||1))+25*Math.min(1,x.pw/(sp==='ncaaf'||sp==='ncaab'?8:15))+15*Math.min(3,x.ti)/3+20*(N?W/N:0.5)));
      out.t[k]={s:seasons,po,pw:x.pw,ti:x.ti,w10:N?+(W/N).toFixed(3):null,w3:N3?+(W3/N3).toFixed(3):null,cur:cur?+(cur.w/cur.n).toFixed(3):null,curN:cur?cur.n:0,pres,off3:pct(off,k,false),def3:pct(def,k,true)};});});
  /* every pairing's last eight meetings (newest first): date, winner, margin, home team */
  const pairs={};all.forEach(r=>{const [sp,y,st,d,a,h,as,hs,neu]=r;if(as===hs)return;const k=sp+'|'+[a,h].sort().join('|');(pairs[k]=pairs[k]||[]).push([d,as>hs?a:h,Math.abs(as-hs),neu?'':h,st===3?1:0]);});
  Object.entries(pairs).forEach(([k,L])=>{out.h2h[k]=L.sort((x,y)=>y[0].localeCompare(x[0])).slice(0,8);});
  Object.entries(H.ref).forEach(([k,R])=>{if(R.g>=3)out.ref[k]={g:R.g,hw:+(R.hw/R.g).toFixed(3),hc:R.hcn?+(R.hc/R.hcn).toFixed(3):null,hcn:R.hcn,hm:+(R.hm/R.g).toFixed(2)};});
  fs.writeFileSync(path.join(OUT,'historian.json'),JSON.stringify(out));D.teams=Object.keys(out.t).length;D.pairs=Object.keys(out.h2h).length;D.refs=Object.keys(out.ref).length;D.err=D.err.slice(0,8);diag.hist=D;return out;}
/* v2.93.0 · THE COACH'S FILE — for every game in the next day and a half: each team's news (ESPN's team news, last 4 days,
   read for injuries, quarterback and goalie changes, coaching changes, suspensions, turmoil, motivation), the weather at
   kickoff for outdoor football (Open-Meteo), last result and the next opponent (letdown and look-ahead spots). coach.json.
   Public news and forecasts only. coachcache.json is the robot's memory (news 3 h, schedules a day, places for good). */
const CO_SP={nfl:['football','nfl',''],ncaaf:['football','college-football','&groups=80&limit=300'],nba:['basketball','nba',''],nhl:['hockey','nhl',''],ncaab:['basketball','mens-college-basketball','&groups=50&limit=300']};
const CO_FLAGS={out:/\b(ruled out|will miss|won't play|out for|sidelined|placed on (?:injured reserve|ir)|season-ending|out indefinitely|torn|fracture)/i,
  quest:/\b(questionable|game-time decision|day-to-day|limited in practice|doubtful)/i,back:/\b(returns?|activated|back in the lineup|cleared to play|set to return|will play)\b/i,
  qb:/\b(starting quarterback|start at quarterback|backup quarterback|benched|qb change|first career start|will start .{0,20}quarterback)/i,goalie:/\b(starting goalie|start in goal|in net|between the pipes)\b/i,
  coach:/\b(fired|interim (?:head )?coach|coach (?:out|dismissed)|parted ways)/i,susp:/\bsuspend/i,turmoil:/\b(trade request|holdout|locker room|feud|frustrat|turmoil|distraction|arrest)/i,
  motive:/\b(revenge|rivalry|must-win|must win|playoff (?:hopes|race|spot)|elimination|clinch|bowl eligib|win-and-in|statement)/i};
const ST_NAME={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia'};
const wxDesc=c=>c==null?'':c===0?'Clear':c<=3?'Partly cloudy':c<=48?'Fog':c<=57?'Drizzle':c<=67?'Rain':c<=77?'Snow':c<=82?'Showers':c<=86?'Snow showers':'Thunderstorms';
async function buildCoach(diag){const now=Date.now();const C=read('coachcache.json')||{v:1,news:{},sched:{},geo:{},wx:{}};['news','sched','geo','wx'].forEach(k=>C[k]=C[k]||{});
  const D={calls:0,games:0,news:0,wx:0,err:[]};const out={v:1,ts:new Date(now).toISOString(),g:{}};const S=read('season.json')||{g:{}};const TJ=read('teams.json')||{t:{}};
  const lastOf={};Object.values(S.g||{}).forEach(r=>{const [sp,d,a,h,as,hs]=r;[[a,h,as-hs],[h,a,hs-as]].forEach(([t,o,m])=>{const k=sp+'|'+t;if(!lastOf[k]||lastOf[k].d<d)lastOf[k]={d,opp:o,m};});});
  const days=[0,1].map(b=>etDay(now+b*864e5).replace(/-/g,''));
  for(const [sp,[s,l,q]] of Object.entries(CO_SP)){const seen=new Set();
    for(const d of days){let sb;try{sb=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/scoreboard?dates=${d}${q}`);D.calls++;}catch(e){continue;}
      for(const ev of (sb.events||[])){if((((ev.status||{}).type)||{}).state!=='pre'||Date.parse(ev.date)>now+36*36e5||seen.has(ev.id))continue;seen.add(ev.id);
        const c=(ev.competitions||[])[0]||{};const cs=c.competitors||[];const A=cs.find(x=>x.homeAway==='away'),H=cs.find(x=>x.homeAway==='home');if(!A||!H)continue;
        const rk=x=>+(((x.curatedRank||{}).current)||99);if(sp==='ncaab'&&rk(A)>25&&rk(H)>25)continue;   /* college hoops: ranked teams' games only (the news calls add up) */
        const tm=x=>({id:String(x.team.id),ab:String(x.team.abbreviation||'').toUpperCase(),name:x.team.displayName||x.team.shortDisplayName||''});
        const G={st:ev.date,venue:((c.venue||{}).fullName)||'',indoor:!!(c.venue||{}).indoor,a:tm(A),h:tm(H)};out.g[sp+'|'+G.a.ab+'@'+G.h.ab]=G;D.games++;
        G.city=((c.venue||{}).address||{}).city||'';G.state=((c.venue||{}).address||{}).state||'';}}}
  const games=Object.entries(out.g);
  /* news, per team, 3 hours */
  const teams=new Map();games.forEach(([k,G])=>{const sp=k.split('|')[0];[G.a,G.h].forEach(t=>teams.set(sp+'|'+t.id,{sp,...t}));});
  const needN=[...teams.entries()].filter(([k])=>!C.news[k]||now-C.news[k].at>3*36e5).slice(0,220);
  await pool(needN,async([k,t])=>{const [s,l]=CO_SP[t.sp];try{const j=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/news?team=${t.id}&limit=15`);D.calls++;D.news++;
      const arts=(j.articles||[]).filter(a=>a&&a.headline&&Date.parse(a.published||a.lastModified||0)>now-4*864e5).slice(0,12).map(a=>({h:String(a.headline).slice(0,140),d:String(a.description||'').slice(0,200),t:a.published||a.lastModified||''}));
      C.news[k]={at:now,arts};}catch(e){C.news[k]={at:now,arts:(C.news[k]||{}).arts||[]};}});
  /* the next game on each team's schedule (look-ahead), a day */
  const needS=[...teams.entries()].filter(([k,t])=>t.sp!=='ncaab'&&(!C.sched[k]||now-C.sched[k].at>864e5)).slice(0,140);
  await pool(needS,async([k,t])=>{const [s,l]=CO_SP[t.sp];try{const j=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/teams/${t.id}/schedule`);D.calls++;
      const up=(j.events||[]).map(ev=>{const c=(ev.competitions||[])[0]||{};const o=(c.competitors||[]).find(x=>String((x.team||{}).id)!==t.id);return{d:ev.date,opp:o?String(((o.team||{}).abbreviation)||'').toUpperCase():''};}).filter(x=>x.d&&Date.parse(x.d)>now).sort((a,b)=>a.d.localeCompare(b.d));
      C.sched[k]={at:now,up:up.slice(0,3)};}catch(e){C.sched[k]={at:now,up:[]};}});
  /* weather at kickoff, outdoor football */
  for(const [k,G] of games){const sp=k.split('|')[0];if((sp!=='nfl'&&sp!=='ncaaf')||G.indoor||!G.city)continue;const gk=G.city+'|'+G.state;
    if(!C.geo[gk]){try{const j=await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(G.city)}&count=10&language=en&format=json&countryCode=US`);D.calls++;
        const want=ST_NAME[G.state]||G.state;const r=(j.results||[]).find(x=>!want||x.admin1===want)||(j.results||[])[0];C.geo[gk]=r?{lat:+r.latitude.toFixed(3),lon:+r.longitude.toFixed(3)}:{none:1};}catch(e){C.geo[gk]={none:1};}}
    const g=C.geo[gk];if(!g||g.none)continue;const wk=k+'|'+G.st;
    if(!C.wx[wk]||now-C.wx[wk].at>3*36e5){try{const j=await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&hourly=temperature_2m,precipitation_probability,windspeed_10m,windgusts_10m,weathercode&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=UTC&forecast_days=3`);D.calls++;D.wx++;
        const T=(j.hourly||{}).time||[];const ko=Date.parse(G.st);let bi=-1,bd=Infinity;T.forEach((t,i)=>{const dd=Math.abs(Date.parse(t+'Z')-ko);if(dd<bd){bd=dd;bi=i;}});
        if(bi>=0&&bd<3*36e5){const H=j.hourly;C.wx[wk]={at:now,temp:Math.round(H.temperature_2m[bi]),wind:Math.round(H.windspeed_10m[bi]),gust:Math.round(H.windgusts_10m[bi]),pop:H.precipitation_probability?H.precipitation_probability[bi]:null,code:H.weathercode[bi],cond:wxDesc(H.weathercode[bi])};}}catch(e){if(D.err.length<6)D.err.push('wx '+String(e.message).slice(0,30));}}
    if(C.wx[wk]){const{at,...w}=C.wx[wk];G.wx=w;}}
  /* the file: flags read off each team's news, the last result, the next opponent */
  const pw=(sp,ab)=>((TJ.t||{})[sp+'|'+ab]||{}).pw;
  games.forEach(([k,G])=>{const sp=k.split('|')[0];[['a',G.a],['h',G.h]].forEach(([side,t])=>{const N=(C.news[sp+'|'+t.id]||{}).arts||[];const fl={};const heads=[];
      N.forEach(a=>{const txt=a.h+' '+a.d;let hit=false;Object.entries(CO_FLAGS).forEach(([f,re])=>{if(re.test(txt)){fl[f]=(fl[f]||0)+1;hit=true;}});if(hit||heads.length<2)heads.push({h:a.h,t:a.t,f:Object.keys(CO_FLAGS).filter(f=>CO_FLAGS[f].test(txt))});});
      const L=lastOf[sp+'|'+t.ab];const nx=((C.sched[sp+'|'+t.id]||{}).up||[]).find(x=>Date.parse(x.d)>Date.parse(G.st)+36e5);
      G[side]={...t,fl,heads:heads.slice(0,4),n:N.length,last:L?{d:L.d,opp:L.opp,m:L.m,opw:pw(sp,L.opp)}:null,next:nx?{d:nx.d,opp:nx.opp,opw:pw(sp,nx.opp)}:null};});
    delete G.city;delete G.state;});
  /* the robot's memory trimmed */
  Object.keys(C.wx).forEach(k=>{if(now-C.wx[k].at>2*864e5)delete C.wx[k];});Object.keys(C.news).forEach(k=>{if(now-C.news[k].at>5*864e5)delete C.news[k];});
  fs.writeFileSync(path.join(OUT,'coachcache.json'),JSON.stringify(C));fs.writeFileSync(path.join(OUT,'coach.json'),JSON.stringify(out));D.err=D.err.slice(0,6);diag.coach=D;return out;}
async function main(){const now=+process.env.FEEDS_NOW||Date.now();const prev=read('closes.json');const games=(prev&&prev.v===1&&prev.games)||{};const log={ts:new Date(now).toISOString(),added:0,errors:[],calls:0};
  const cut=new Date(now-KEEP_DAYS*864e5).toISOString();Object.keys(games).forEach(k=>{if(String(games[k].st||'')<cut)delete games[k];});
  const todo=[];
  for(const[sp,[s,l,q]]of Object.entries(SPORTS)){for(let b=DAYS_BACK;b>=0;b--){const d=ymd(now-b*864e5);
      let sb=null;try{sb=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/scoreboard?dates=${d}${q}`);}catch(e){log.errors.push(sp+' '+d+': '+e.message);continue;}
      (sb.events||[]).forEach(ev=>{const st=(((ev.status||{}).type)||{}).state||(((((ev.competitions||[])[0]||{}).status||{}).type||{}).state);if(st!=='post')return;const id=String(ev.id);
        const cs=(((ev.competitions||[])[0]||{}).competitors)||[];const tn=t=>{t=(t||{}).team||{};return[t.location,t.shortDisplayName,t.displayName,t.abbreviation].filter(Boolean);};
        const n=(sp==='ncaab'||sp==='ncaaf')?{a:tn(cs.find(x=>x.homeAway==='away')),h:tn(cs.find(x=>x.homeAway==='home'))}:null;const wk=sp==='ncaaf'?(((ev.week||sb.week)||{}).number||null):null;
        if(games[id]){if(n&&!games[id].n)games[id].n=n;if(wk&&!games[id].wk)games[id].wk=wk;return;}todo.push({sp,s,l,id,n,wk});});}}
  const res=await pool(todo,async t=>{const j=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${t.s}/${t.l}/summary?event=${t.id}`);const r=parseSummary(t.sp,j);if(r){if(t.n)r.n=t.n;if(t.wk)r.wk=t.wk;games[t.id]=r;log.added++;}return r;});
  res.forEach((r,i)=>{if(r&&r.err&&log.errors.length<20)log.errors.push(todo[i].sp+' '+todo[i].id+': '+r.err);});
  const diag={};if(!FIX||process.env.FEEDS_VERIFY){try{await verifyFinals(games,diag);}catch(e){diag.fail=String(e.message||e).slice(0,80);}}
  if(!FIX||process.env.FEEDS_PROPS){try{await buildProps(diag);}catch(e){diag.props={fail:String(e.message||e).slice(0,80)};}}
  if(!FIX||process.env.FEEDS_TEAMS){try{await buildTeams(diag,games);}catch(e){diag.teams={fail:String(e.message||e).slice(0,120)};}}
  if(!FIX||process.env.FEEDS_HIST){try{await buildHistory(diag,games,read('season.json'));}catch(e){diag.hist={fail:String(e.message||e).slice(0,120)};}}
  if(!FIX||process.env.FEEDS_COACH){try{await buildCoach(diag);}catch(e){diag.coach={fail:String(e.message||e).slice(0,120)};}}
  log.verify=diag;
  log.calls=calls;const n=Object.keys(games).length;
  fs.writeFileSync(path.join(OUT,'closes.json'),JSON.stringify({v:1,ts:log.ts,n,games}));
  const idx=read('index.json')||{v:1,runs:[]};idx.v=1;idx.ts=log.ts;idx.files={...(idx.files||{}),closes:{ts:log.ts,n},...(diag.props&&diag.props.ev!=null?{props:{ts:log.ts,n:diag.props.ev}}:{}),...(diag.teams&&diag.teams.teams!=null?{teams:{ts:log.ts,n:diag.teams.teams}}:{}),...(diag.hist&&diag.hist.teams!=null?{historian:{ts:log.ts,n:diag.hist.teams}}:{}),...(diag.coach&&diag.coach.games!=null?{coach:{ts:log.ts,n:diag.coach.games}}:{})};idx.runs=[log,...(idx.runs||[])].slice(0,12);
  fs.writeFileSync(path.join(OUT,'index.json'),JSON.stringify(idx));
  console.log(`feeds: +${log.added} finals, ${n} kept, ${calls} requests, ${log.errors.length} errors`);}
main().catch(e=>{console.error('feeds failed',e);process.exit(1);});
