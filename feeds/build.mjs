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
  log.verify=diag;
  log.calls=calls;const n=Object.keys(games).length;
  fs.writeFileSync(path.join(OUT,'closes.json'),JSON.stringify({v:1,ts:log.ts,n,games}));
  const idx=read('index.json')||{v:1,runs:[]};idx.v=1;idx.ts=log.ts;idx.files={...(idx.files||{}),closes:{ts:log.ts,n}};idx.runs=[log,...(idx.runs||[])].slice(0,12);
  fs.writeFileSync(path.join(OUT,'index.json'),JSON.stringify(idx));
  console.log(`feeds: +${log.added} finals, ${n} kept, ${calls} requests, ${log.errors.length} errors`);}
main().catch(e=>{console.error('feeds failed',e);process.exit(1);});
