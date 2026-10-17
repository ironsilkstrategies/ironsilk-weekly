/* probe 6: Saturday Oct 17 slates exactly as the app requests them */
import fs from 'fs';fs.mkdirSync('diag/out6',{recursive:true});const meta=[];
async function get(url,name){try{const r=await fetch(url);const t=await r.text();meta.push({name,url,status:r.status,bytes:t.length});fs.writeFileSync('diag/out6/'+name+'.json',t);}catch(e){meta.push({name,url,error:String(e)});}}
const S='https://site.api.espn.com/apis/site/v2/sports/';
await get(S+'football/college-football/scoreboard?groups=80&limit=100','cfb-current');
for(const w of [8,9])await get(S+`football/college-football/scoreboard?groups=80&limit=100&dates=2026&seasontype=2&week=${w}`,'cfb-w'+w);
await get(S+'football/college-football/scoreboard?dates=20261017&groups=80&limit=300','cfb-20261017');
await get(S+'hockey/nhl/scoreboard?dates=20261017','nhl-20261017');
await get(S+'baseball/mlb/scoreboard?dates=20261017','mlb-20261017');
fs.writeFileSync('diag/out6/_meta.json',JSON.stringify(meta,null,1));console.log(JSON.stringify(meta));
