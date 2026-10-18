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
async function getJSON(url){calls++;if(FIX){const v=FIX[url];if(v===undefined)throw new Error('no fixture for '+url);return JSON.parse(JSON.stringify(v));}
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),15000);
  try{const r=await fetch(url,{signal:ctl.signal,headers:{'user-agent':'TheDesk-feeds/1'}});if(!r.ok)throw new Error(r.status+' '+url);return await r.json();}finally{clearTimeout(t);}}
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
async function main(){const now=Date.now();const prev=read('closes.json');const games=(prev&&prev.v===1&&prev.games)||{};const log={ts:new Date(now).toISOString(),added:0,errors:[],calls:0};
  const cut=new Date(now-KEEP_DAYS*864e5).toISOString();Object.keys(games).forEach(k=>{if(String(games[k].st||'')<cut)delete games[k];});
  const todo=[];
  for(const[sp,[s,l,q]]of Object.entries(SPORTS)){for(let b=DAYS_BACK;b>=0;b--){const d=ymd(now-b*864e5);
      let sb=null;try{sb=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/scoreboard?dates=${d}${q}`);}catch(e){log.errors.push(sp+' '+d+': '+e.message);continue;}
      (sb.events||[]).forEach(ev=>{const st=(((ev.status||{}).type)||{}).state||(((((ev.competitions||[])[0]||{}).status||{}).type||{}).state);if(st!=='post')return;const id=String(ev.id);if(games[id])return;todo.push({sp,s,l,id});});}}
  const res=await pool(todo,async t=>{const j=await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${t.s}/${t.l}/summary?event=${t.id}`);const r=parseSummary(t.sp,j);if(r){games[t.id]=r;log.added++;}return r;});
  res.forEach((r,i)=>{if(r&&r.err&&log.errors.length<20)log.errors.push(todo[i].sp+' '+todo[i].id+': '+r.err);});
  log.calls=calls;const n=Object.keys(games).length;
  fs.writeFileSync(path.join(OUT,'closes.json'),JSON.stringify({v:1,ts:log.ts,n,games}));
  const idx=read('index.json')||{v:1,runs:[]};idx.v=1;idx.ts=log.ts;idx.files={...(idx.files||{}),closes:{ts:log.ts,n}};idx.runs=[log,...(idx.runs||[])].slice(0,12);
  fs.writeFileSync(path.join(OUT,'index.json'),JSON.stringify(idx));
  console.log(`feeds: +${log.added} finals, ${n} kept, ${calls} requests, ${log.errors.length} errors`);}
main().catch(e=>{console.error('feeds failed',e);process.exit(1);});
