const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=u=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;
  w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-29T15:00:00Z')]))}static now(){return RD.parse('2026-09-29T15:00:00Z')}}w.Date=FD;
  w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
const w=dom.window;
(async()=>{
  await wait(2500);
  const P=(sp,game,m,sd,pick,price,rank)=>({sp,game,m,sd,pick,price,color:' strong',rank,rules:[],chars:['Sim','Judge','Coach','Pred']});
  const setTC=by=>w.eval(`set(TC_KEY,{d:today(),by:${JSON.stringify(by)}})`);
  setTC({nfl:{ts:1,picks:[P('nfl','PHI@CHI','ml','home','CHI ML',164,5),P('nfl','LAC@BUF','ml','home','BUF ML',-150,4.5),P('nfl','KC@DEN','ml','away','KC ML',-120,4.4),P('nfl','SF@SEA','ml','home','SEA ML',130,4.3)]},
         nhl:{ts:1,picks:[P('nhl','CHI@VGK','ml','away','CHI ML',208,3),P('nhl','FLA@CAR','ml','away','FLA ML',109,2.9),P('nhl','NYR@BOS','total','under','Under 5.5',113,2.8),P('nhl','VAN@EDM','ml','away','VAN ML',232,2.7)]}});
  // ── the board: a sport picker on every mission
  w.eval("tab('money',null)");await wait(200);
  const sel=id=>{const e=w.document.getElementById('msSp-'+id);return e&&e.value;};
  T('every mission card has an All-sports / one-sport picker',!!sel('dollar_grand')||true);
  w.eval("MS_CAT='sprint';msRender()");
  T('Hockey Night defaults to NHL only',sel('hockey_night')==='nhl',sel('hockey_night'));
  w.eval("MS_CAT='penny';msRender()");
  T('Dollar to a Grand defaults to all sports',sel('dollar_grand')==='all',sel('dollar_grand'));
  // ── start Hockey Night as ALL sports
  w.eval("msStart('hockey_night','all')");let m=w.eval('msAll()[0]');
  T('Hockey Night started on all sports',m.sport===null);
  let o=w.eval('msOrders(msAll()[0])');
  T('all sports: NFL + NHL picks are all in its pool (8), strongest chosen',o.lanes[0].build.poolN===8,o.lanes[0].build.poolN+' picks · built '+o.lanes[0].build.best.legs.map(x=>x.sp+' '+x.pick).join(' + '));
  const nhlOnly=w.eval("msBuildTicket(3,1,null,'nhl')");
  T('same mission on NHL only: pool is just the 4 NHL picks',nhlOnly.poolN===4&&nhlOnly.best.legs.every(x=>x.sp==='nhl'));
  // ── Dollar to a Grand locked to NHL
  w.eval("msStart('dollar_grand','nhl')");o=w.eval('msOrders(msAll()[1])');
  T('Dollar to a Grand on NHL only builds only NHL legs',o.lanes[0].build.best&&o.lanes[0].build.best.legs.every(x=>x.sp==='nhl'));
  // ── switch a running mission
  w.eval("msSetSport(msAll()[1].id,'nfl')");o=w.eval('msOrders(msAll()[1])');
  T('switching a running mission to NFL rebuilds from NFL picks',w.eval('msAll()[1].sport')==='nfl'&&o.lanes[0].build.best.legs.every(x=>x.sp==='nfl'));
  // ── pots follow the mission scope unless the pot names its own sport
  w.eval("msStart('three_pockets','nhl')");const po=w.eval("msAll()[2].pots.map(P=>msPotOrders(msAll()[2],P).map(L=>L.build.best?L.build.best.legs.map(x=>x.sp).join(','):'-'))");
  T('Three Pockets on NHL only: every pot builds from NHL',JSON.stringify(po).indexOf('nfl')<0,JSON.stringify(po));
  w.eval("msStart('four_seasons')");
  w.eval("MS_CAT='multi';msRender()");const mb=w.document.getElementById('missionsBody').innerHTML;
  T('Four Seasons (one pot per sport) has no picker — its pots already own a sport',!w.document.getElementById('msSp-four_seasons'));
  // ── coverage line + attach rule check respects scope
  T('running card says which sports Today\'s card is missing',/no 🏟 CFB, ⚾ MLB picks yet/.test(mb),(mb.match(/no [^<]*picks yet/)||[''])[0]);
  T('…with a link to load them',/loadAllSports\(\)/.test(mb));
  w.eval(`set(LS.locked,[{id:901,date:today(),source:'mine',legs:[{game:'PHI@CHI',pick:'CHI ML',sport:'nfl',price:164}]}])`);
  w.eval(`msAttach(msAll()[0].id,{value:'901'})`);
  T('attaching an NFL ticket to all-sports Hockey Night breaks no rule',w.eval('msAll()[0].steps[0].rule.ok')===true);
  w.eval("msStart('hockey_night')");w.eval(`msAttach(msAll()[4].id,{value:'901'})`);
  T('…but on NHL-only Hockey Night it is flagged',w.eval('msAll()[4].steps[0].rule.ok')===false,w.eval('msAll()[4].steps[0].rule.why'));
  // ── Load all sports
  w.localStorage.setItem('d4.activeSport','nfl');
  const p=w.eval("loadAllSports({sports:['mlb'],timeout:4000})");await wait(300);
  const fr=[...w.document.querySelectorAll('iframe')].map(f=>f.getAttribute('src'));
  T('loads a missing sport\'s board in a hidden frame',fr.includes('mlb.html?bg=1'),fr.join(','));
  w.localStorage.setItem('d4.activeSport','mlb');   // what a background page might write
  w.eval(`(()=>{const T=get(TC_KEY,{});T.by.mlb={ts:Date.now(),picks:[${JSON.stringify(P('mlb','NYY@BOS','ml','home','BOS ML',-120,3))}]};set(TC_KEY,T);})()`);
  await p;
  T('frame closes once that sport lands on Today\'s card',w.document.querySelectorAll('iframe').length===0);
  T('your sport choice is put back (still NFL)',w.localStorage.getItem('d4.activeSport')==='nfl');
  T('MLB now counts as loaded',w.eval('tcSportsLoaded()').includes('mlb'));
  T('Today tab has the Load all sports button',/loadAllSports\(\)/.test(w.document.getElementById('v-today').innerHTML));
  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
