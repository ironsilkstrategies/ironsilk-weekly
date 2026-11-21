const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
(async()=>{
  let html=fs.readFileSync(path.join(W,'mlb.html'),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const errors=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/mlb.html',pretendToBeVisual:true,beforeParse(w){
    w.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
    w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
    w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
  const w=dom.window;await new Promise(r=>setTimeout(r,2500));
  const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);

  // Seed: one fresh archived ticket (1 day old, WON), one old archived ticket (5 days old, 1W/1L),
  // one pending ticket that's actually still live (must survive untouched regardless of age),
  // and one wrongly-archived ticket whose game is actually still live (simulates the old bug).
  const nowD=d=>new Date(Date.now()-d*86400e3).toISOString();
  w.eval(`set(LS.locked,[
    {id:1,date:'2026-09-26',source:'mine',archived:true,archivedAt:${Date.now()-1*86400e3},
      legs:[{game:'ZZ@YY',pick:'ZZ ML',price:-110,p:0.52,sport:'nfl'}]},
    {id:2,date:'2026-09-20',source:'mine',archived:true,archivedAt:${Date.now()-5*86400e3},
      legs:[{game:'AA@BB',pick:'AA ML',price:120,p:0.45,sport:'nfl'},{game:'CC@DD',pick:'Over 40',price:-105,p:0.5,sport:'nfl'}]},
    {id:3,date:'2026-09-27',source:'mine',archived:false,
      legs:[{game:'EE@FF',pick:'EE ML',price:-150,p:0.6,sport:'nfl'}]}
  ])`);
  // Fake gradeLeg per-leg outcomes deterministically for the two archived tickets (win, then win+loss)
  w.eval(`window.__origGradeLeg=gradeLeg;gradeLeg=function(leg,d){
    if(leg.game==='ZZ@YY')return{hit:true,detail:'',live:false};
    if(leg.game==='AA@BB')return{hit:true,detail:'',live:false};
    if(leg.game==='CC@DD')return{hit:false,detail:'',live:false};
    if(leg.game==='EE@FF')return{hit:null,detail:'',live:true}; // still live -- must never be touched
    return __origGradeLeg(leg,d);
  };ticketIsComplete=function(t){return t.legs.every(x=>gradeLeg(x,t.date).hit!==null);};`);

  const purged=w.eval('purgeOldArchivedTickets(3)');
  T('purge removes only the >3-day-old archived ticket',purged===1,purged);
  const remaining=JSON.parse(w.eval("JSON.stringify(get(LS.locked,[]).map(t=>t.id))"));
  T('fresh archived ticket (1 day) survives',remaining.includes(1),remaining.join(','));
  T('old archived ticket (5 days) is gone',!remaining.includes(2),remaining.join(','));
  T('untouched pending/live ticket survives regardless of age logic',remaining.includes(3),remaining.join(','));

  const roll=JSON.parse(w.eval('JSON.stringify(lifetimeLog())'));
  T('purged ticket rolled up: 1 win + 1 loss counted, not lost',roll.mine.w===1&&roll.mine.l===1,JSON.stringify(roll.mine));

  const R=JSON.parse(w.eval("JSON.stringify(buildAllTimeRecord().mine.map(x=>x.hit))"));
  const wins=R.filter(x=>x===true).length, losses=R.filter(x=>x===false).length;
  T('All-time record still reflects the purged ticket (rolled-up + remaining)',wins===2&&losses===1,`w=${wins} l=${losses} total=${R.length}`);

  // Regrade pass: a wrongly-archived ticket whose underlying leg is genuinely still live
  // must come back to pending, not stay mis-filed as done.
  w.eval(`const L=get(LS.locked,[]);L.push({id:4,date:'2026-09-27',source:'mine',archived:true,archivedAt:${Date.now()},
    legs:[{game:'EE@FF',pick:'EE ML',price:-150,p:0.6,sport:'nfl'}]});set(LS.locked,L);
    typeof backfillGrading==='undefined'?(window.backfillGrading=function(){return Promise.resolve()}):0;`);
  w.eval('regradeAllTicketsNow()');
  const t4=JSON.parse(w.eval("JSON.stringify(get(LS.locked,[]).find(t=>t.id===4))"));
  T('a wrongly-archived-while-still-live ticket gets pulled back to pending',t4.archived===false,JSON.stringify(t4));

  // Maintenance runs once per day, not every call
  w.eval("localStorage.removeItem('d4.lastMaint')");
  w.eval('maybeRunDailyMaintenance()');
  const first=w.eval("localStorage.getItem('d4.lastMaint')");
  w.eval(`purgeOldArchivedTickets=function(){window.__calledAgain=true;return 0;};maybeRunDailyMaintenance();`);
  T('maintenance does not re-run same day',!w.eval('window.__calledAgain'),first);

  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log('CRASH',e.stack);process.exit(1)});
