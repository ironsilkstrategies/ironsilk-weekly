/* probe 7: which data the new layers can actually reach — officials, career history,
   player-vs-player, former teams — and whether a phone may read each endpoint (CORS). */
import fs from 'fs';const OUT='diag/out7/';fs.mkdirSync(OUT,{recursive:true});const meta=[];
const H={Origin:'https://ironsilkweekly.com','User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'};
async function get(url,name,keep){try{const r=await fetch(url,{headers:H});const t=await r.text();const cors=r.headers.get('access-control-allow-origin');
    meta.push({name,url,status:r.status,bytes:t.length,cors});if(keep!==false)fs.writeFileSync(OUT+name+'.json',t.length>2.5e6?t.slice(0,2.5e6):t);try{return JSON.parse(t);}catch(e){return null;}}
  catch(e){meta.push({name,url,error:String(e)});return null;}}
const S='https://site.api.espn.com/apis/site/v2/sports/',W='https://site.web.api.espn.com/apis/common/v3/sports/',C='https://sports.core.api.espn.com/v2/sports/';
const P={nfl:'football/nfl',ncaaf:'football/college-football',nhl:'hockey/nhl',nba:'basketball/nba',mlb:'baseball/mlb',ncaab:'basketball/mens-college-basketball'};
const pick=(sb,st)=>((sb&&sb.events)||[]).find(e=>((e.status||{}).type||{}).state===st);
const sum={};
/* 1 · officials + team stats: one final and one upcoming game per sport */
for(const [sp,d] of [['nhl','20261017'],['nfl','20261012'],['ncaaf','20261017'],['nba','20261016'],['mlb','20261016'],['ncaab','20260310']]){
  const sb=await get(S+P[sp]+'/scoreboard?dates='+d+(sp==='ncaaf'?'&groups=80&limit=300':sp==='ncaab'?'&groups=50&limit=300':''),sp+'-sb-'+d,false);
  for(const st of ['post','pre','in']){const e=pick(sb,st);if(!e)continue;const j=await get(S+P[sp]+'/summary?event='+e.id,sp+'-sum-'+st,false);
    const gi=(j&&j.gameInfo)||{};const teams=((j&&j.boxscore&&j.boxscore.teams)||[]).map(t=>({team:(t.team||{}).abbreviation,stats:(t.statistics||[]).map(x=>(x.name||x.label)+'='+(x.displayValue!=null?x.displayValue:x.value)).slice(0,40)}));
    sum[sp+'-'+st]={id:e.id,name:e.shortName,officials:gi.officials||null,gameInfoKeys:Object.keys(gi),topKeys:j?Object.keys(j):null,teams,
      seasonseries:j&&j.seasonseries?j.seasonseries.map(s=>({type:s.type,title:s.title,summary:s.summary,events:(s.events||[]).length})):null,
      lastFive:j&&j.lastFiveGames?j.lastFiveGames.map(t=>({team:(t.team||{}).abbreviation,n:(t.events||[]).length})):null,
      againstTheSpread:j&&j.againstTheSpread?j.againstTheSpread.map(t=>({team:(t.team||{}).abbreviation,records:(t.records||[]).map(r=>r.summary||r.displayValue)})):null,
      pickcenter:j&&j.pickcenter?j.pickcenter.length:0,odds:j&&j.odds?j.odds.length:0,news:j&&j.news?(j.news.articles||[]).length:0,injuries:j&&j.injuries?j.injuries.length:0};}}
fs.writeFileSync(OUT+'_summaries.json',JSON.stringify(sum,null,1));
/* 2 · player vs player: Baker Mayfield (3052587) and Kyler Murray (3917315) game logs by season */
const pvp={};for(const [nm,id] of [['baker','3052587'],['kyler','3917315']]){for(const y of [2019,2021,2022,2026]){
  const j=await get(W+'football/nfl/athletes/'+id+'/gamelog?season='+y,'gl-'+nm+'-'+y,y===2022);
  const ev=j&&j.events?Object.entries(j.events).map(([k,e])=>({id:k,opp:(e.opponent||{}).abbreviation,res:e.gameResult,score:e.score,date:e.gameDate,team:(e.team||{}).abbreviation})):null;pvp[nm+y]=ev;}}
fs.writeFileSync(OUT+'_pvp.json',JSON.stringify(pvp,null,1));
/* 3 · former teams: athlete bio, overview, core statistics log */
await get(W+'football/nfl/athletes/3917315','ath-kyler-bio');await get(W+'football/nfl/athletes/3917315/overview','ath-kyler-overview');
await get(C+'football/leagues/nfl/athletes/3917315/statisticslog','ath-kyler-statlog');await get(C+'football/leagues/nfl/athletes/3917315','ath-kyler-core');
/* 4 · career head-to-head: a team's schedule by season, and season-range scoreboards */
await get(S+'football/nfl/teams/27/schedule?season=2025','sched-tb-2025');await get(S+'hockey/nhl/teams/25/schedule?season=2025','sched-nhl-2025');
const r1=await get(S+'hockey/nhl/scoreboard?dates=20251001-20251031&limit=400','nhl-range-oct2025',false);meta.push({name:'nhl-range-count',n:r1&&r1.events?r1.events.length:null});
const r2=await get(S+'football/nfl/scoreboard?dates=2025&seasontype=2&week=3','nfl-2025-w3',false);meta.push({name:'nfl-2025-w3-count',n:r2&&r2.events?r2.events.length:null});
const r3=await get(S+'basketball/nba/scoreboard?dates=20251101-20251130&limit=400','nba-range-nov2025',false);meta.push({name:'nba-range-count',n:r3&&r3.events?r3.events.length:null});
const r4=await get(S+'football/college-football/scoreboard?dates=2025&seasontype=2&week=8&groups=80&limit=300','cfb-2025-w8',false);meta.push({name:'cfb-2025-w8-count',n:r4&&r4.events?r4.events.length:null});
/* 5 · NBA referee assignments page (official.nba.com) — reachable? */
await get('https://official.nba.com/referee-assignments/','nba-ref-assign',false);
/* 6 · standings + team record splits (motivation) */
await get('https://site.api.espn.com/apis/v2/sports/hockey/nhl/standings','nhl-standings',false);
fs.writeFileSync(OUT+'_meta.json',JSON.stringify(meta,null,1));console.log(JSON.stringify(meta));
