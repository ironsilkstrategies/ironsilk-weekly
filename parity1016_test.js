/* v2.33 · every sport's card carries the same set (A–G, Proj. Box with players' last 5 / last 10, Take/Fade,
   Analysis after the final), the gamecast for basketball + hockey, a calm gamecast refresh on phones, the
   Tickets tab opening on what's riding, Today with the explainer folded away and strength plays one row per pick. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
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
const errors=[];const vc=new (require('jsdom').VirtualConsole)();vc.on('jsdomError',e=>errors.push(String(e.message||e)));
let GCJ=null;
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.fetch=u=>{u=String(u);if(GCJ&&/summary\?event=GC/.test(u))return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(GCJ)});return fakeFetch(u);};
    w.localStorage.setItem('d4.setupDone','1');w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T20:00:00Z')]))}static now(){return RD.parse('2026-10-10T20:00:00Z')}}w.Date=FD;}});
const w=dom.window;const E=s=>w.eval(s);const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
try{await wait(2600);
  const slate=E("document.getElementById('slate').innerHTML");
  const pre=slate.slice(slate.indexOf('nhl-card-401001'),slate.indexOf('nhl-card-401001')+60000);
  T('NHL card: A–G, Proj. Box, Take/Fade, My Bets, Roster',['A–G','Proj. Box','Take/Fade','My Bets','Roster','Coach','Trends','Alt Lines','Props'].every(t=>pre.includes('>'+t+'<')));
  T('NHL final: 📊 Analysis tab',/nhlPan\('401003','analysis'/.test(slate));
  E("pstAdd('nhl','Auston Matthews','TOR',{g:1,a:1,pts:2,s:5},'e1','2026-10-01');pstAdd('nhl','Auston Matthews','TOR',{g:0,a:0,pts:0,s:2},'e2','2026-10-03');pstAdd('nhl','Auston Matthews','TOR',{g:2,a:0,pts:2,s:6},'e3','2026-10-05')");
  const g1="NHL_GAMES.find(x=>x.id==='401001')";
  const ag=E(`NHL_PANELS.ag(${g1},nhlSimFor(${g1}))`);
  T('NHL A–G reads A through G with the market',['A) My line','B) Outside range','C) Vs the market','D) My picks','E) Props','F) Props vs the market','G) Confidence'].every(x=>ag.includes(x))&&/moneyline: book TOR|moneyline: book BOS/.test(ag),ag.replace(/<[^>]+>/g,'').slice(0,240));
  const box=E(`NHL_PANELS.box(${g1},nhlSimFor(${g1}))`);
  T('NHL Proj. Box: periods + the players (season · last 5 · last 10)',/P1/.test(box)&&/Players — season avg · last 5/.test(box)&&/Auston Matthews/.test(box)&&/L10/.test(box));
  const g3="NHL_GAMES.find(x=>x.id==='401003')";
  const post=E(`NHL_PANELS.analysis(${g3},nhlSimFor(${g3}))`);
  T('NHL Analysis after the final: model winner, total, the characters',/Post-game breakdown/.test(post)&&/Model winner/.test(post)&&/actual 3–2/.test(post),post.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,200));
  /* MLB: projected box by inning */
  const mb=E("mlbProjBoxHtml({id:9,away:{abbr:'NYY'},home:{abbr:'BOS'}},{aR:4.4,hR:3.9,hw:0.45,aw:0.55})");
  const cells=(mb.match(/<td>([\d.]+)<\/td>/g)||[]).map(x=>+x.replace(/<\/?td>/g,''));
  T('MLB Proj. Box: 9 innings + F5 + runs, innings add up',/<th>9<\/th>/.test(mb)&&/<th>F5<\/th>/.test(mb)&&Math.abs(cells.slice(0,9).reduce((a,b)=>a+b,0)-4.4)<0.06,cells.slice(0,11).join(' '));
  const src=fs.readFileSync(path.join(W,'shared.js'),'utf8');
  T('MLB card: Proj. Box, Take/Fade and 📊 Analysis tabs',/pan\(\$\{g\.id\},'projbox',this\)">Proj\. Box/.test(src)&&/pan\(\$\{g\.id\},'verdict',this\)">Take\/Fade/.test(src)&&/pan\(\$\{g\.id\},'post',this\)"[^>]*>📊 Analysis/.test(src));
  const fb=fs.readFileSync(path.join(W,'football-engine.js'),'utf8');
  T('NFL card: 📊 Analysis on finals; football Proj. Box carries the players',/nflTogglePanel\('analysis'/.test(fb)&&/p-nflanalysis-/.test(fb)&&/parPlayersHtml\(sport,g\)/.test(fb));
  /* gamecast: basketball court + hockey rink */
  const T2={away:{id:'13',abbr:'LAL',color:'#552583',score:'65'},home:{id:'9',abbr:'GS',color:'#1d428a',score:'73'}};
  const plays=[];let a=60,h=58;[['a',2],['h',3],['a',2],['h',3],['h',2],['h',3],['h',2],['h',2]].forEach(([s,p])=>{if(s==='a')a+=p;else h+=p;plays.push({text:(s==='a'?'LAL':'GS')+' scores',awayScore:a,homeScore:h,period:{number:3},clock:{displayValue:'5:00'}});});
  const nb=E(`gcPulse('nba',${JSON.stringify({plays,header:{competitions:[{competitors:[{homeAway:'away',linescores:[{displayValue:'30'},{displayValue:'35'}]},{homeAway:'home',linescores:[{displayValue:'40'},{displayValue:'33'}]}]}]}})},${JSON.stringify(T2)},{state:'in'})`);
  T('gamecast · basketball: the court, the run (GS 12-0), the momentum, quarters',/aria-label="court"/.test(nb)&&/GS 12-0 RUN/.test(nb)&&/last 8 scores/.test(nb)&&/<th>Q1<\/th>/.test(nb),(nb.match(/[A-Z]+ \d+-0 RUN/)||[''])[0]);
  const nh=E(`gcPulse('nhl',${JSON.stringify({plays:[{text:'g1',awayScore:1,homeScore:0},{text:'g2',awayScore:1,homeScore:1},{text:'g3',awayScore:1,homeScore:2},{text:'g4',awayScore:1,homeScore:3}],boxscore:{teams:[{team:{id:'13'},statistics:[{name:'shotsTotal',displayValue:'14'}]},{team:{id:'9'},statistics:[{name:'shotsTotal',displayValue:'22'}]}]}})},${JSON.stringify(T2)},{state:'in'})`);
  T('gamecast · hockey: the rink, unanswered goals, shots on goal',/aria-label="rink"/.test(nh)&&/3 UNANSWERED/.test(nh)&&/Shots on goal/.test(nh)&&/14/.test(nh)&&/22/.test(nh));
  /* the gamecast refresh: no repaint when nothing changed; a finger on the screen holds it */
  GCJ={header:{competitions:[{status:{period:2,displayClock:'10:00',type:{state:'in',shortDetail:'10:00 - 2nd'}},competitors:[{homeAway:'away',team:{id:'21',abbreviation:'TOR'},score:'1'},{homeAway:'home',team:{id:'1',abbreviation:'BOS'},score:'2'}]}]},plays:[{text:'goal',awayScore:1,homeScore:2}]};
  await E("openGamecast('nhl','TOR@BOS','2026-10-10','GC1')");await wait(50);
  E("document.getElementById('gcIn').firstElementChild.setAttribute('data-mark','1')");await E('gcLoad()');
  T('gamecast: an unchanged feed doesn\'t repaint (no flicker)',E("!!document.querySelector('#gcIn [data-mark]')"));
  GCJ.header.competitions[0].competitors[1].score='3';GCJ.plays.push({text:'goal 2',awayScore:1,homeScore:3});E('GC.touchAt=Date.now()');await E('gcLoad()');
  T('gamecast: a change waits while your finger is on the screen',E("!!document.querySelector('#gcIn [data-mark]')&&GC.pend===true"));
  E('GC.touchAt=0;gcPaint()');T('…then paints',E("!document.querySelector('#gcIn [data-mark]')&&/1\\s*<span[^>]*>–<\\/span>\\s*3/.test(document.getElementById('gcIn').innerHTML)"));
  E('closeGamecast()');
  /* Tickets opens on what's riding */
  E(`set(LS.locked,[{id:1,date:today(),name:'t',legs:[{game:'TOR@BOS',pick:'BOS ML',sport:'nhl',price:-115}]}]);TICKETTAB_USER=false;tab('tickets',null)`);
  T('Tickets opens on My picks while a ticket is riding',E('TICKETTAB')==='mine');
  E(`TICKETTAB='build';TICKETTAB_USER=true;tab('tickets',null)`);T('…and remembers when you pick a tab yourself',E('TICKETTAB')==='build');
  /* Today: the explainer is folded; strength plays are one row per pick */
  const tv=E("document.getElementById('v-today')?document.getElementById('v-today').innerHTML:''");
  T('Today: the board explainer lives in the 🧰 Tools fold',/<details class="tkt today-tools"[\s\S]*every gold, cyan/i.test(tv)&&tv.indexOf('todayBody')<tv.indexOf('today-tools'));
  const G=JSON.parse(E(`JSON.stringify(strengthGroups([{c:{sp:'nhl',game:'TOR@BOS',market:'ml',side:'home',voice:'Sim',price:-115},cf:0.81,lane:{w:26,l:6,p:0.8,n:32}},{c:{sp:'nhl',game:'TOR@BOS',market:'ml',side:'home',voice:'Scorekeeper',price:-115},cf:0.79,lane:{w:29,l:11,p:0.72,n:40}},{c:{sp:'nhl',game:'EDM@VGK',market:'total',side:'over',voice:'Trends',price:-110},cf:0.72,lane:{w:9,l:3,p:0.75,n:12}}]).map(g=>({k:g.k,n:g.who.length,cf:g.cf})))`));
  T('Today: strength plays group the characters on one pick',G.length===2&&G[0].n===2&&G[0].cf===0.81,JSON.stringify(G));
  T('no uncaught errors',!errors.length,errors.slice(0,3).join(' | '));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));const p=out.filter(x=>x.startsWith('PASS')).length;console.log(`\n${p} pass / ${out.length-p} fail`);process.exit(0);})();
