const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');
const W='/home/claude/work';
const TODAY='2026-10-10',YMD='20261010';
function comp(side,name,abbr,id,score,ls,rec){return{homeAway:side,team:{displayName:name,abbreviation:abbr,id},score:score==null?'':String(score),
  linescores:(ls||[]).map(v=>({value:v})),records:[{summary:rec}]};}
const scoreboard={season:{year:2027,type:2},events:[
  {id:'401001',date:'2026-10-10T23:00Z',season:{type:2},status:{type:{state:'pre',shortDetail:'7:00 PM'},period:0,displayClock:'0:00'},
   competitions:[{venue:{fullName:'TD Garden'},competitors:[comp('away','Toronto Maple Leafs','TOR','21',null,[],'2-1-0'),comp('home','Boston Bruins','BOS','1',null,[],'1-2-0')],
     odds:[{details:'BOS -115',overUnder:6.5,overOdds:-110,underOdds:-110,awayTeamOdds:{moneyLine:-105,spreadOdds:210},homeTeamOdds:{moneyLine:-115,spreadOdds:-250},
       pointSpread:{away:{close:{line:'+1.5'}},home:{close:{line:'-1.5'}}}}]}]},
  {id:'401002',date:'2026-10-10T23:30Z',season:{type:2},status:{type:{state:'in',shortDetail:'2nd 10:12'},period:2,displayClock:'10:12'},
   competitions:[{competitors:[comp('away','Edmonton Oilers','EDM','6',2,[1,1],'2-0-1'),comp('home','Vegas Golden Knights','VGK','37',1,[0,1],'1-1-1')]}]},
  {id:'401003',date:'2026-10-10T17:00Z',season:{type:2},status:{type:{state:'post',shortDetail:'Final/OT'},period:4,displayClock:'0:00'},
   competitions:[{competitors:[comp('away','New York Rangers','NYR','13',3,[1,1,0,1],'3-0-0'),comp('home','New Jersey Devils','NJ','11',2,[0,2,0,0],'1-2-0')]}]}]};
const st=(ab,name,gp,gf,ga)=>({team:{abbreviation:ab,displayName:name},stats:[{name:'gamesPlayed',value:gp},{name:'pointsFor',value:gf},{name:'pointsAgainst',value:ga}]});
const standingsCur={children:[{standings:{entries:[st('TOR','Toronto Maple Leafs',3,11,8),st('BOS','Boston Bruins',3,7,10),st('EDM','Edmonton Oilers',3,12,7),st('VGK','Vegas Golden Knights',3,8,9),st('NYR','New York Rangers',3,10,6),st('NJ','New Jersey Devils',3,7,10)]}}]};
const standingsPrev={children:[{children:[{standings:{entries:[st('TOR','Toronto Maple Leafs',82,280,240),st('BOS','Boston Bruins',82,230,260),st('EDM','Edmonton Oilers',82,290,250),st('VGK','Vegas Golden Knights',82,260,230),st('NYR','New York Rangers',82,250,240),st('NJ','New Jersey Devils',82,245,245)]}}]}]};
const players={categories:[{names:['gamesPlayed','goals','assists','points','shotsTotal']},{names:['saves','shotsAgainst']}],athletes:[
  {athlete:{displayName:'Auston Matthews',teamShortName:'Toronto',position:{abbreviation:'C'}},categories:[{totals:['3','3','1','4','14']},{totals:['','']}]},
  {athlete:{displayName:'David Pastrnak',teamShortName:'Boston',position:{abbreviation:'RW'}},categories:[{totals:['3','2','2','4','12']},{totals:['','']}]},
  {athlete:{displayName:'Jeremy Swayman',teamShortName:'Boston',position:{abbreviation:'G'}},categories:[{totals:['3','0','0','0','0']},{totals:['85','93']}]}]};
const summary={boxscore:{players:[{team:{displayName:'Edmonton Oilers'},statistics:[
  {name:'forwards',labels:['G','A','SOG','TOI'],athletes:[{athlete:{displayName:'Connor McDavid'},stats:['1','1','4','14:02']},{athlete:{displayName:'Leon Draisaitl'},stats:['1','0','2','13:40']}]},
  {name:'goalies',labels:['SA','GA','SV','SV%'],athletes:[{athlete:{displayName:'Stuart Skinner'},stats:['15','1','14','.933']}]}]},
 {team:{displayName:'Vegas Golden Knights'},statistics:[{name:'forwards',labels:['G','A','SOG','TOI'],athletes:[{athlete:{displayName:'Jack Eichel'},stats:['1','0','3','15:00']}]}]}]}};
const oddsApi=[{away_team:'Toronto Maple Leafs',home_team:'Boston Bruins',bookmakers:[{key:'draftkings',markets:[
  {key:'h2h',outcomes:[{name:'Toronto Maple Leafs',price:-102},{name:'Boston Bruins',price:-118}]},
  {key:'totals',outcomes:[{name:'Over',point:6.5,price:-105},{name:'Under',point:6.5,price:-115}]}]}]}];
const roster={athletes:[{position:'Centers',items:[{fullName:'Auston Matthews',jersey:'34',position:{abbreviation:'C'},injuries:[]}]},{position:'Goalies',items:[{fullName:'Joseph Woll',jersey:'60',position:{abbreviation:'G'},injuries:[{status:'Day-To-Day'}]}]}]};
const calls=[];
function fakeFetch(url){calls.push(url);const ok=j=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(j),text:()=>Promise.resolve(JSON.stringify(j))});
  if(url.includes('hockey/nhl/scoreboard'))return ok(scoreboard);
  if(url.includes('hockey/nhl/standings'))return ok(url.includes('season=2026')?standingsPrev:standingsCur);
  if(url.includes('statistics/byathlete'))return ok(players);
  if(url.includes('hockey/nhl/summary'))return ok(summary);
  if(url.includes('/roster'))return ok(roster);
  if(url.includes('icehockey_nhl'))return ok(oddsApi);
  return ok({});}
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,
  beforeParse(w){w.fetch=fakeFetch;w.localStorage.setItem('d4.key',JSON.stringify('TESTKEY'));w.localStorage.setItem('d4.setupDone','1');w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T20:00:00Z')]))}static now(){return RD.parse('2026-10-10T20:00:00Z')}}w.Date=FD;
    w.addEventListener('error',e=>errors.push('window error: '+(e.error&&e.error.stack||e.message)));
    w.console.error=(...a)=>errors.push('console.error: '+a.join(' '));}});
const w=dom.window;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await wait(2500);
  const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
  T('today() is test date',w.eval('today()')===TODAY,w.eval('today()'));
  T('page sport is nhl',w.eval('ACTIVE_SPORT')==='nhl');
  T('3 games loaded',w.eval('NHL_GAMES.length')===3,w.eval('NHL_GAMES.map(g=>g.away.abbr+"@"+g.home.abbr+":"+g.abstract).join(" ")'));
  T('abbr normalized (NJ, VGK)',w.eval("NHL_GAMES.some(g=>g.home.abbr==='NJ')&&NHL_GAMES.some(g=>g.home.abbr==='VGK')"));
  T('ratings not flat',w.eval('NHL_FLAT')===false,w.eval('NHL_STATUS.ratings'));
  const slate=w.document.getElementById('slate').innerHTML;
  T('3 cards rendered',(slate.match(/id="nhl-card-/g)||[]).length===3);
  T('no card errors',!/card error/.test(slate));
  T('TOR@BOS has ESPN lines (REAL badge)',/TOTAL GOALS · 6.5<span[^>]*>REAL/.test(slate));
  const s=w.eval("(()=>{const g=NHL_GAMES.find(x=>x.id==='401001');const s=nhlSimFor(g);return JSON.stringify({aw:s.aw,hw:s.hw,a:s.awayProj,h:s.homeProj,ot:s.otP,o65:s.over(6.5),u65:s.under(6.5),hc:s.homeCover(-1.5),ac:s.awayCover(1.5),p1:s.p1Proj,mode:s.modeScore})})()");
  const S=JSON.parse(s);
  T('win probs sum to 1',Math.abs(S.aw+S.hw-1)<1e-9,s);
  T('over+under 6.5 = 1 (no push)',Math.abs(S.o65+S.u65-1)<1e-9);
  T('puck lines complementary',Math.abs(S.hc+S.ac-1)<1e-9,`home -1.5 ${S.hc.toFixed(3)} away +1.5 ${S.ac.toFixed(3)}`);
  T('home -1.5 in realistic band (0.2-0.45)',S.hc>0.2&&S.hc<0.45);
  T('OT rate realistic (0.15-0.28)',S.ot>0.15&&S.ot<0.28,S.ot.toFixed(3));
  T('P1 goals ~31% of total',Math.abs(S.p1/(S.a+S.h)-0.31)<0.03,S.p1);
  // Odds API pull — live must not overwrite my own upload
  w.eval("saveNHLBookOdds(parseNHLSlateText(`NHL\\nToronto Maple Leafs @ Boston Bruins\\nML: TOR +120 / BOS -140\\nP1OU: o1.5 (-125) / u1.5 (+105)\\nPROP: Auston Matthews SOG 3.5 (-120/+100)`).picks,null)");
  const n=await w.eval('fetchNHLLiveOdds()');
  T('Odds API pull stored lines',n===4,n);
  const L=JSON.parse(w.eval("JSON.stringify(nhlLineObj('TOR@BOS'))"));
  T('my ML outranks live + ESPN',L.awayML.price===120&&L.awayML.src==='mine',JSON.stringify(L.awayML));
  T('live total outranks ESPN',L.over.src==='live'&&L.over.price===-105);
  T('P1 total + prop parsed',L.p1over&&L.p1over.line===1.5&&L.props.length===2);
  // Intake through the SHARED pipeline (sport header routing)
  const r=await w.eval("intakeText(`NHL\\nEdmonton Oilers @ Vegas Golden Knights\\nPL: EDM -1.5 (+170) / VGK +1.5 (-200)\\nOU: o6 (-110) / u6 (-110)\\nPRED: EDM 3.4 / VGK 2.9\\nTREND EDM: Over is 5-1 in Oilers last 6 road games.`,null,'auto','Covers')");
  const b=r.r.nhl||{};
  T('shared intake routes NHL odds',(b.picks||[]).length===4,`picks ${(b.picks||[]).length} preds ${(b.preds||[]).length} trends ${(b.trends||[]).length}`);
  T('shared intake reads NHL pred + trend',(b.preds||[]).length===1&&(b.trends||[]).length===1);
  // Voices + Judge
  w.eval('renderNHL()');await wait(300);
  const V=JSON.parse(w.eval("JSON.stringify(get('d4.voices',[]).filter(x=>x.sp==='nhl').map(x=>x.voice+':'+x.market))"));
  T('voices logged for NHL',V.length>0,V.slice(0,8).join(' '));
  T('Judge block renders on pregame card',/JUDGE/.test(w.document.getElementById('nhl-card-401001').innerHTML));
  // Slip toggle on/off
  w.eval("sportSlipToggle('nhl','401001','TOR ML',120)");
  T('slip add',w.eval('SLIP.length')===1&&w.eval("SLIP[0].sport")==='nhl');
  T('tile shows selected',/class="bet[^"]* on"/.test(w.document.getElementById('nhl-card-401001').innerHTML));
  w.eval("sportSlipToggle('nhl','401001','TOR ML',120)");
  T('slip second tap removes',w.eval('SLIP.length')===0);
  // Ticket import (flat + SGP) and grading
  const flat=`Ticket Number:\n555001\nAccepted Date:\n10/10/26\nAmount:\n$1.00\nStatus:\nPending\nTo win:\n$10.00\nType:\nParlay\nDescription:\nHockey - NHL - New York Rangers vs New Jersey Devils - Parlay | 51 New York Rangers -130 for GAME | 10/10/2026 01:00:00 PM (EST) | Pending\nHockey - NHL - New York Rangers vs New Jersey Devils - Parlay | 52 New York Rangers/New Jersey Devils over 5½ -110 for GAME | 10/10/2026 01:00:00 PM (EST) | Pending\nHockey - NHL - New York Rangers vs New Jersey Devils - Parlay | 53 New York Rangers/New Jersey Devils under 1½ +100 for 1ST PERIOD | 10/10/2026 01:00:00 PM (EST) | Pending\nHockey - NHL - New York Rangers vs New Jersey Devils - Parlay | 54 New Jersey Devils +1½ -200 for GAME | 10/10/2026 01:00:00 PM (EST) | Pending`;
  const fr=await w.eval('intakeText('+JSON.stringify(flat)+',null,"auto","")');
  T('flat hockey ticket imports 4/4',/4 legs/.test(fr.how)&&!/skipped/.test(fr.how),fr.how);
  const tk=JSON.parse(w.eval("JSON.stringify(get(LS.locked,[]).find(t=>t.id==='ext555001'))"));
  const gr=tk.legs.map(l=>l.pick+'='+JSON.stringify(w.eval('gradeLeg('+JSON.stringify(l)+',"'+TODAY+'").hit')));
  // Final 3-2 OT: NYR ML win; total 5 under 5.5 -> over loses; P1 1-0 total 1 < 1.5 -> under wins; NJ +1.5 lost by 1 -> covers
  T('flat legs grade correctly',gr.join(' ')==='NYR ML=true Over 5.5=false P1 Under 1.5=true NJ +1.5=true',gr.join(' '));
  const sgp=`Ticket Number:\n555002\nAccepted Date:\n10/10/26\nAmount:\n$1.00\nStatus:\nPending\nTo win:\n$50.00\nType:\nSGPs Combined\nDescription:\n4 Leg Parlay (Includes 1 SGPs)\nSGP 1: HOCKEY - NHL - Edmonton Oilers v Vegas Golden Knights\nPlayer stats - Connor McDavid 1+ Points (Game)\nPlayer stats - Leon Draisaitl 3+ Shots on Goal (Game)\nPlayer stats - Stuart Skinner over 24.5 Saves (Game)\nPuck line - Oilers -1.5 (Game)`;
  const sr=await w.eval('intakeText('+JSON.stringify(sgp)+',null,"auto","")');
  T('hockey SGP imports 4/4',/4 legs/.test(sr.how)&&!/unrecognized|not recognized/.test(sr.how),sr.how);
  const tk2=JSON.parse(w.eval("JSON.stringify(get(LS.locked,[]).find(t=>t.id==='ext555002'))"));
  // first call kicks off the box fetch, second reads it
  tk2.legs.forEach(l=>w.eval('gradeLeg('+JSON.stringify(l)+',"'+TODAY+'")'));await wait(200);
  const g2=tk2.legs.map(l=>{const x=w.eval('gradeLeg('+JSON.stringify(l)+',"'+TODAY+'")');return l.pick+'='+x.hit+'('+(x.detail||'')+')';});
  // Live: McDavid 2 pts -> locked WIN; Draisaitl 2 SOG, needs 3, still live -> null; Skinner 14 saves live -> null; EDM -1.5 live -> null
  T('SGP live props: reached=locked win, others pending',g2[0].startsWith('Connor McDavid 1+ Points=true')&&/=null/.test(g2[1])&&/=null/.test(g2[2]),g2.join(' | '));
  // Panels
  for(const k of ['coach','trends','alt','roster','props','box','verdict','live','mybets']){
    const gid=k==='live'||k==='mybets'?'401002':'401001';w.eval(`Object.keys(NHL_OPEN).forEach(k=>delete NHL_OPEN[k])`);await w.eval(`nhlPan('${gid}','${k}',null)`);
    const h=w.document.getElementById('nhlp-'+gid).innerHTML;T('panel '+k,h.length>40&&!/Couldn't load/.test(h),h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,90));}
  // Record + finals sync
  w.eval('renderNHLRecord()');T('record tab renders',/System picks/.test(w.document.getElementById('gradeBody').innerHTML));
  T('final synced to shared store under nhl:',w.eval("!!allFinals()['nhl:NYR@NJ']"));
  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);
})().catch(e=>{console.log('HARNESS CRASH',e.stack);process.exit(1)});
