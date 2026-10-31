/* v2.81.5 · freezes: the football board moves to the current week by itself (and the evaluation waits for it), the
   line window parses once per change, the characters' re-read and today's candidates skip when nothing changed,
   football snapshot+grade run after the paint, a phone paints one card first */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW='2026-10-31T15:00:00Z';
const team=(ab,nm)=>({team:{abbreviation:ab,displayName:nm,shortDisplayName:nm,location:nm,name:nm},homeAway:'',score:'0'});
const ev=(id,date,a,h,state)=>({id,date,status:{type:{state,description:state==='post'?'Final':'Scheduled'}},competitions:[{date,status:{type:{state,description:state==='post'?'Final':'Scheduled'},period:0,displayClock:'0:00'},competitors:[{...team(a[0],a[1]),homeAway:'away'},{...team(h[0],h[1]),homeAway:'home'}]}]});
const WEEK10={season:{year:2026,type:2},week:{number:10},events:[ev('901','2026-10-31T19:00Z',['ILL','Illinois Fighting Illini'],['MD','Maryland Terrapins'],'pre'),ev('902','2026-10-31T23:30Z',['SMU','SMU Mustangs'],['SYR','Syracuse Orange'],'pre')]};
function page(file,setup){let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;const T0=RD.now();class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse(NOW)+(RD.now()-T0)]))}static now(){return RD.parse(NOW)+(RD.now()-T0)}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__F=[];
    w.fetch=(u)=>{u=String(u);w.__F.push(u);if(/college-football\/scoreboard\?groups=80&limit=100$/.test(u))return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(JSON.parse(JSON.stringify(WEEK10)))});
      return Promise.resolve({ok:false,status:404,headers:{get:()=>null},json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');if(setup)setup(w);}}).window;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  /* ── CFB: last week's finished board on the device ── */
  const c=page('cfb.html',w=>{w.localStorage.setItem('d4.ncaafgames',JSON.stringify({'2026w9':{ts:Date.parse(NOW)-30*36e5,week:9,season:2026,
    v:[{id:'801',away:{abbr:'OSU',name:'Ohio State Buckeyes'},home:{abbr:'PSU',name:'Penn State Nittany Lions'},date:'2026-10-24T23:30Z',abstract:'post',status:'Final',awayScore:24,homeScore:17}]}}));});
  await sleep(3000);
  T('opening the page with last week cached loads the current week by itself',c.eval('NCAAF_GAMES.length')===2&&c.eval('NCAAF_WEEK')===10,String(c.eval('NCAAF_GAMES.length')));
  c.eval(`NCAAF_GAMES=[{id:'801',away:{abbr:'OSU',name:'Ohio State Buckeyes'},home:{abbr:'PSU',name:'Penn State Nittany Lions'},date:'2026-10-24T23:30Z',abstract:'post',status:'Final',awayScore:24,homeScore:17}];NCAAF_WEEK=9;`);
  T('a finished week on the board is stale',c.eval("fbWeekStale('ncaaf')")==='every game final',c.eval("fbWeekStale('ncaaf')"));
  const why=await c.eval("fbAutoWeek('ncaaf')");
  T('…so the page pulls the current week by itself',why==='every game final'&&c.eval('NCAAF_GAMES.length')===2&&c.eval('NCAAF_WEEK')===10,JSON.stringify({why,n:c.eval('NCAAF_GAMES.length')}));
  T('the evaluation\'s wait flag is cleared and the load time stamped',!c.eval('window.__FB_WEEK_LOADING')&&c.eval('window.__FB_WEEK_DONE')>0);
  T('a fresh current week is left alone',c.eval("fbWeekStale('ncaaf')")===null);
  T('the relay page waits while a football week loads',/__FB_WEEK_LOADING/.test(fs.readFileSync(path.join(W,'desk-core.js'),'utf8').match(/if\(DESK_BG_EVAL&&typeof window!=='undefined'\)window\.addEventListener\('load'[\s\S]{0,400}/)[0]));
  /* the line window: one parse per change */
  c.eval(`set(LS.ncaafshots,{[today()]:[{game:'ILL@MD',market:'spread',side:'away',line:-2.5,price:-113,src:'mine',capturedAt:1}]}) ;window.__GETN=0;const G0=get;get=function(k){if(k===LS.ncaafshots)window.__GETN++;return G0.apply(this,arguments);};`);
  c.eval(`for(let i=0;i<40;i++)ncaafBookLinesFor('ILL@MD');`);
  T('40 line lookups parse the stored lines once',c.eval('window.__GETN')===1,String(c.eval('window.__GETN')));
  c.eval(`set(LS.ncaafshots,{[today()]:[{game:'ILL@MD',market:'spread',side:'away',line:-3,price:-110,src:'mine',capturedAt:2}]})`);
  T('…and a save is seen at once',c.eval(`ncaafBookLinesFor('ILL@MD')[0].line`)===-3);
  /* snapshot + grade after the paint */
  c.eval(`window.__SN=0;const S0=snapshotNCAAF;snapshotNCAAF=function(){window.__SN++;return S0.apply(this,arguments);};ACTIVE_SPORT='ncaaf';renderNCAAF();`);
  T('the CFB board paints before its snapshot runs',c.eval('window.__SN')===0);
  await sleep(1200);T('…which follows right after (coalesced: one for the paint, one more if new sims finished)',c.eval('window.__SN')>=1&&c.eval('window.__SN')<=2,String(c.eval('window.__SN')));
  c.close();
  /* ── NBA: re-read and candidates skip when nothing changed ── */
  const w=page('nba.html');await sleep(2500);
  w.eval(`NBA_GAMES.length=0;NBA_GAMES.push({id:'g1',away:{abbr:'ATL',name:'Atlanta Hawks'},home:{abbr:'BOS',name:'Boston Celtics'},start:'2026-10-31T23:10:00Z',__date:'2026-10-31',abstract:'pre'});
    window.__V0=0;const V0f=voicesLog0;voicesLog0=function(){window.__V0++;return V0f.apply(this,arguments);};`);
  w.eval(`voicesLog('nba')`);w.eval(`voicesLog('nba')`);
  T('the characters\' re-read skips when nothing it reads changed',w.eval('window.__V0')===1,String(w.eval('window.__V0')));
  w.eval(`voicesLog('nba',true)`);T('…the evaluation\'s re-read always runs (force)',w.eval('window.__V0')===2);
  w.eval(`bbPutLines(BB_CFG.nba,[{away:'ATL',home:'BOS',game:'ATL@BOS',market:'moneyline',side:'away',line:null,price:150,src:'mine',capturedAt:Date.now(),date:'2026-10-31'}]);voicesLog('nba');`);
  T('…and a new line brings it back',w.eval('window.__V0')===3,String(w.eval('window.__V0')));
  w.eval(`window.__TC=0;const TCf=todayCandidates;todayCandidates=function(){window.__TC++;return TCf.apply(this,arguments);};todaySnapshot();todaySnapshot();`);
  T('today\'s candidates rebuild once for unchanged inputs',w.eval('window.__TC')===1,String(w.eval('window.__TC')));
  w.eval('todaySnapshot(true)');T('…and always when forced (evaluation, Load all sports)',w.eval('window.__TC')===2);
  T('the master evaluation forces both',/st\('reread',\(\)=>voicesLog\(sp,true\)\)/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8'))&&/try\{todaySnapshot\(true\);\}catch\(e\)\{\}/.test(fs.readFileSync(path.join(W,'desk-core.js'),'utf8')));
  /* bookkeeping writes keep the calls cache */
  w.eval('window.__G0=CHAR_GEN;set("d4.apsteps",{x:1});set("d4.heallog",[]);set("d4.bollog",[]);');
  T('health, BetOnline and audit bookkeeping writes don\'t throw away cached calls',w.eval('CHAR_GEN')===w.eval('window.__G0'));
  w.eval('set("d4.nbashots",get("d4.nbashots",{}))');T('…a line write still does',w.eval('CHAR_GEN')>w.eval('window.__G0'));
  /* a phone paints one card first */
  w.eval('window.innerWidth=390;lzBegin(3);');T('a phone paints one full card first (the rest in idle slots)',w.eval('LZ.first')===1);
  w.eval('window.innerWidth=1200;lzBegin(3);');T('a wide screen keeps three',w.eval('LZ.first')===3);
  /* grading only parses when something can be graded */
  T('grading looks before it parses (no private copy when nothing can be graded)',/let any=false;try\{const R0=roGet\(VOICES_KEY/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8')));
  w.close();
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
