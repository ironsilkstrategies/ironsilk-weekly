/* v2.80.2 · ESPN refuses date RANGES (400) for some leagues/sizes: every backfill must fall back to single days.
   Covers espnRange itself, NHL upcoming + past finals, the basketball results backfill (incl. the late-night gap),
   and the player-stat backfill. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW='2026-10-30T19:30:00Z';
function page(file,fetchFn){let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse(NOW)]))}static now(){return RD.parse(NOW)}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.fetch=fetchFn;w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const res=(status,j)=>Promise.resolve({ok:status===200,status,json:()=>Promise.resolve(j),text:()=>Promise.resolve(JSON.stringify(j))});
const ymd=d=>d.replace(/-/g,'');
/* one final per day: away 100+i, home 90 */
const bbEv=(id,day,a,h,state)=>({id:String(id),date:day+'T23:30:00Z',season:{type:2},status:{type:{state:state||'post',shortDetail:'Final'},period:4},competitions:[{competitors:[
  {homeAway:'away',score:'101',team:{abbreviation:a,displayName:a,id:'1'},linescores:[{value:25},{value:25},{value:25},{value:26}]},
  {homeAway:'home',score:'90',team:{abbreviation:h,displayName:h,id:'2'},linescores:[{value:20},{value:20},{value:25},{value:25}]}]}]});
const nhlEv=(id,day,a,h,as,hs,state)=>({id:String(id),date:day+'T23:00:00Z',season:{type:2,year:2027},status:{type:{state:state||'post',shortDetail:'Final'},period:3},competitions:[{competitors:[
  {homeAway:'away',score:String(as),team:{displayName:a,abbreviation:a.slice(0,3).toUpperCase(),id:'1'},linescores:[{value:1},{value:1},{value:0}]},
  {homeAway:'home',score:String(hs),team:{displayName:h,abbreviation:h.slice(0,3).toUpperCase(),id:'2'},linescores:[{value:2},{value:1},{value:1}]}]}]});
(async()=>{try{
  /* ── NBA page: espnRange + bbBackfill + pstatBackfill ── */
  const DAYS={};const asked=[];let rangeOK=false;
  ['2026-10-25','2026-10-26','2026-10-27','2026-10-28','2026-10-29'].forEach((d,i)=>{DAYS[ymd(d)]=[bbEv(5000+i,d,'BOS','NYK')];});
  DAYS['20261030']=[bbEv(5010,'2026-10-30','LAL','GSW')];
  const nbaFetch=u=>{u=String(u);asked.push(u);
    const r=u.match(/scoreboard\?dates=(\d{8})-(\d{8})/);if(r){if(!rangeOK)return res(400,{code:400,message:'Failed to get events endpoint.'});
      const E=[];Object.keys(DAYS).forEach(k=>{if(k>=r[1]&&k<=r[2])E.push(...DAYS[k]);});return res(200,{events:E});}
    const d=u.match(/scoreboard\?dates=(\d{8})(?:&|$)/);if(d)return res(200,{events:DAYS[d[1]]||[]});
    if(/summary\?event=/.test(u))return res(200,{});
    return res(404,{});};
  const w=page('nba.html',nbaFetch);await new Promise(r=>setTimeout(r,2500));
  /* espnRange itself */
  asked.length=0;
  let R=await w.eval(`espnRange('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261026-20261028&limit=600',{map:e=>({id:e.id,d:e.date.slice(0,10)})})`);
  T('a refused range walks the days and merges them',R.ok&&R.split&&R.events.length===3&&R.covered.length===3,JSON.stringify(R).slice(0,200));
  T('the per-day asks carry the same query, one date each',asked.filter(u=>/dates=\d{8}&limit=600$/.test(u)).length===3,asked.join(' | ').slice(0,300));
  asked.length=0;
  R=await w.eval(`espnRange('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261025-20261029&limit=600',{map:e=>({id:e.id}),only:['2026-10-27','2026-10-29']})`);
  T('the league is remembered as "no ranges" — no second refused call',!asked.some(u=>/dates=\d{8}-\d{8}/.test(u)),asked.join(' | '));
  T('only the asked-for days are fetched',asked.length===2&&R.events.length===2,asked.join(' | '));
  asked.length=0;
  R=await w.eval(`espnRange('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261020-20261029&limit=600',{map:e=>({id:e.id}),newestFirst:true,conc:1,enough:L=>L.length>=2})`);
  T('newest first, and it stops once it has enough',R.events.length===2&&asked.length<=3&&/20261029/.test(asked[0]),asked.join(' | '));
  asked.length=0;
  R=await w.eval(`espnRange('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261020-20261029&limit=1500',{map:e=>({id:e.id}),tag:'t1'})`);
  T('a big limit is capped on the single-day asks (the range is tried once more: refusals are remembered per size)',asked.length===11&&asked.slice(1).every(u=>/dates=\d{8}&limit=900$/.test(u)),asked.slice(0,2).join(' | '));
  asked.length=0;
  const R2=await w.eval(`espnRange('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261020-20261029&limit=1500',{map:e=>({id:e.id}),tag:'t1'})`);
  T('past days are remembered for the session (a repeat pass makes no calls)',asked.length===0&&R2.events.length===R.events.length,asked.length+' calls');
  const nil=await w.eval(`(async()=>{const f=window.fetch;window.fetch=()=>Promise.reject(new Error('offline'));try{return await espnRange('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261001-20261003',{})}finally{window.fetch=f;}})()`);
  T('offline: no throw, ok=false',nil&&nil.ok===false&&nil.events.length===0);
  /* bbBackfill — the late-night gap: tonight's final is already on file, the 5 days before it are not */
  w.eval(`set('d4.nbares',{'5010':['2026-10-30','LAL','GSW',101,90,0,null,null,0]});localStorage.removeItem('d4.nbares.cov');BB_BF_TS={};`);
  asked.length=0;
  const n=await w.eval(`bbBackfill(bbC('nba'),true)`);
  const resK=Object.keys(w.eval(`get('d4.nbares',{})`));
  T('the gap before tonight\'s final is backfilled (it used to start from the newest final and skip it)',n===5&&['5000','5001','5002','5003','5004'].every(k=>resK.includes(k)),'n='+n+' keys '+resK.join(','));
  const cov=w.eval(`get('d4.nbares.cov',[])`);
  T('the days it walked are marked covered',cov.length===30&&cov.includes('2026-10-29')&&!cov.includes('2026-10-30'),cov.length+' '+cov.slice(-3).join(','));
  asked.length=0;await w.eval(`bbBackfill(bbC('nba'),true)`);
  T('a covered window costs nothing next time',asked.length===0,asked.join(' | ').slice(0,200));
  /* refused everything → retried sooner, nothing marked */
  w.eval(`localStorage.removeItem('d4.nbares.cov');BB_BF_TS={};`);
  await w.eval(`(async()=>{const f=window.fetch;window.fetch=()=>Promise.resolve({ok:false,status:503,json:()=>Promise.resolve({})});try{await bbBackfill(bbC('nba'),true);}finally{window.fetch=f;}})()`);
  T('when ESPN answers nothing, no day is marked covered and it retries in 5 minutes',(w.eval(`get('d4.nbares.cov',[])`)||[]).length===0&&w.eval(`Date.now()-BB_BF_TS.nba`)>=25*60e3-5,w.eval(`Date.now()-BB_BF_TS.nba`));
  /* pstatBackfill with the range refused */
  asked.length=0;w.eval(`for(const k in PST_MEM)delete PST_MEM[k];`);
  await w.eval(`pstatBackfill('nba',3)`);
  const sum=asked.filter(u=>/summary\?event=/.test(u)).map(u=>u.split('event=')[1]);
  T('player-stat backfill reads boxes from the per-day walk (newest finals first)',sum.length===3&&sum[0]==='5010',sum.join(','));
  /* the range still wins when ESPN takes it */
  rangeOK=true;w.eval(`for(const k in ESPN_NORANGE)delete ESPN_NORANGE[k];ESPN_RNG_MEMO.clear();`);asked.length=0;
  R=await w.eval(`espnRange('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261025-20261030&limit=600',{map:e=>({id:e.id})})`);
  T('when ESPN takes the range it is still one call',R.ok&&!R.split&&asked.length===1&&R.events.length===6,asked.length+' calls, '+R.events.length+' events');
  w.close();

  /* ── NHL page: upcoming + past finals ── */
  const askedN=[];const ND={'20261031':[nhlEv(9001,'2026-10-31','Seattle Kraken','Detroit Red Wings',0,0,'pre')],'20261101':[nhlEv(9002,'2026-11-01','Boston Bruins','Toronto Maple Leafs',0,0,'pre')],
    '20261028':[nhlEv(8001,'2026-10-28','Seattle Kraken','Detroit Red Wings',2,4)],'20261029':[nhlEv(8002,'2026-10-29','Boston Bruins','Toronto Maple Leafs',3,1)]};
  const nhlFetch=u=>{u=String(u);askedN.push(u);
    if(/hockey\/nhl\/scoreboard\?dates=\d{8}-\d{8}/.test(u))return res(400,{code:400});
    const d=u.match(/hockey\/nhl\/scoreboard\?dates=(\d{8})(?:&|$)/);if(d)return res(200,{events:ND[d[1]]||[]});
    return res(404,{});};
  const v=page('nhl.html',nhlFetch);await new Promise(r=>setTimeout(r,2500));
  v.eval(`set('d4.nhlupcoming',{d:'2026-10-30',games:[{id:'x1',__date:'2026-10-31',away:{abbr:'SEA'},home:{abbr:'DET'}}],ts:1});NHL_UPCOMING=[];`);
  const up=await v.eval(`loadNHLUpcoming(3).then(L=>L.map(g=>g.id))`);
  T('NHL upcoming survives a refused range (walks the days)',up.includes('9001')&&up.includes('9002'),up.join(','));
  const up2=await v.eval(`(async()=>{const f=window.fetch;window.fetch=()=>Promise.reject(new Error('offline'));try{NHL_UPCOMING=[];return (await loadNHLUpcoming(3)).length;}finally{window.fetch=f;}})()`);
  T('offline, the saved upcoming list is kept (not wiped to empty)',up2===2,String(up2));
  v.eval(`set(NHL_LS.arc,{'2026-10-28':{rows:[{gid:'8001',picks:[{m:'ml',side:'home',price:-150}]}]},'2026-10-29':{rows:[{gid:'8002',picks:[{m:'ml',side:'away',price:120}]}]}});NHL_BACKFILL_TS=0;`);
  askedN.length=0;
  const fn=await v.eval('nhlBackfillFinals(true)');
  T('past NHL finals arrive through the per-day walk',fn===2,'filled '+fn+' via '+askedN.join(' | ').slice(0,200));
  T('only the open days were asked for',askedN.filter(u=>/scoreboard\?dates=\d{8}&/.test(u)).length===2,askedN.join(' | '));
  v.close();
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
