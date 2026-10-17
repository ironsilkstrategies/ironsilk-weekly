/* probe 8: do finished games still carry their CLOSING odds (scoreboard odds, summary pickcenter)?
   If they do, the app can grade every call against the market's close. */
import fs from 'fs';const OUT='diag/out8/';fs.mkdirSync(OUT,{recursive:true});const meta=[];
async function get(url){try{const r=await fetch(url);const t=await r.text();meta.push({url,status:r.status,bytes:t.length});return JSON.parse(t);}catch(e){meta.push({url,error:String(e)});return null;}}
const S='https://site.api.espn.com/apis/site/v2/sports/';const P={nfl:'football/nfl',ncaaf:'football/college-football',nhl:'hockey/nhl',nba:'basketball/nba',mlb:'baseball/mlb'};
const res={};
for(const [sp,d] of [['nhl','20261016'],['nhl','20261017'],['nfl','20261012'],['ncaaf','20261010'],['nba','20261016'],['mlb','20261016']]){
  const sb=await get(S+P[sp]+'/scoreboard?dates='+d+(sp==='ncaaf'?'&groups=80&limit=300':''));const evs=(sb&&sb.events)||[];
  res[sp+d]={n:evs.length,sample:[]};
  for(const e of evs.slice(0,3)){const c=(e.competitions||[])[0]||{};const st=((e.status||{}).type||{}).state;
    const j=await get(S+P[sp]+'/summary?event='+e.id);
    res[sp+d].sample.push({id:e.id,name:e.shortName,state:st,sbOdds:c.odds||null,pickcenter:j&&j.pickcenter||null,odds:j&&j.odds||null});}}
fs.writeFileSync(OUT+'_odds.json',JSON.stringify(res,null,1));fs.writeFileSync(OUT+'_meta.json',JSON.stringify(meta,null,1));console.log('ok');
