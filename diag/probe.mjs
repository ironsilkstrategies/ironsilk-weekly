/* probe 5: an NFL depth chart a browser can read (the site API's has no CORS) */
import fs from 'fs';fs.mkdirSync('diag/out5',{recursive:true});const meta=[];
async function get(url,name){try{const r=await fetch(url,{headers:{Origin:'https://ironsilkweekly.com'}});const t=await r.text();meta.push({name,url,status:r.status,acao:r.headers.get('access-control-allow-origin'),bytes:t.length});fs.writeFileSync('diag/out5/'+name+'.json',t);return t;}catch(e){meta.push({name,url,error:String(e)});}}
await get('https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/teams/12/depthcharts','core-depth-12');
await get('https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/teams/12/depthcharts','web-depth-12');
await get('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/12/depthcharts?region=us&lang=en','site-depth-12-params');
await get('https://cdn.espn.com/core/nfl/team/depth/_/name/kc?xhr=1','cdn-depth-kc');
fs.writeFileSync('diag/out5/_meta.json',JSON.stringify(meta,null,1));console.log(JSON.stringify(meta));
