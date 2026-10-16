/* v2.32 · basketball: the NBA board on the new engine and the college fork (every D1 team).
   Schedule + ESPN lines, the sim and its push bands, ratings learned from finals (preseason never counts),
   the full card (Coach · Trends · A–G · Alt · Proj. Box · Props · Take/Fade · Box · My Bets · Roster),
   the freeze, the master evaluation, the Judge, intake for college names, the character ledger's limits,
   last-5 / last-10 player logs, preseason + price-less calls never official, the Odds API pull. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const load=page=>{let h=fs.readFileSync(path.join(W,page),'utf8');return h.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);};
const errors=[];const vc=new (require('jsdom').VirtualConsole)();vc.on('jsdomError',e=>errors.push(String(e.message||e)));
let NOW=Date.parse('2026-10-21T17:00:00Z');   // Wednesday noon CT — the night after the NBA opener
const FETCHED=[];
const comp=(side,t,score,ls)=>({homeAway:side,team:{abbreviation:t[0],displayName:t[1],shortDisplayName:t[1].split(' ').slice(-1)[0],location:t[1].split(' ').slice(0,-1).join(' '),id:t[2]},
  score:score==null?'':String(score),linescores:(ls||[]).map(v=>({value:v})),records:[{summary:'1-0'}],curatedRank:{current:t[3]||99}});
const ev=(id,date,a,h,o)=>{o=o||{};return{id,date,season:{type:o.pre?1:2,slug:o.pre?'preseason':'regular-season'},competitions:[{status:{type:{state:o.state||'pre',shortDetail:o.det||'7:00 PM'},period:o.per||0,clock:o.clock},
  neutralSite:!!o.neutral,venue:{fullName:'Arena'},odds:o.odds?[o.odds]:[],competitors:[comp('away',a,o.as,o.lsA),comp('home',h,o.hs,o.lsH)]}]};};
const odds=(hsp,tot,aml,hml)=>({details:'',overUnder:tot,spread:hsp,awayTeamOdds:{moneyLine:aml,spreadOdds:-110},homeTeamOdds:{moneyLine:hml,spreadOdds:-110},provider:{name:'DraftKings'}});
const NBA={BOS:['BOS','Boston Celtics','2'],DET:['DET','Detroit Pistons','8'],PHI:['PHI','Philadelphia 76ers','20'],NY:['NY','New York Knicks','18'],OKC:['OKC','Oklahoma City Thunder','25'],SA:['SA','San Antonio Spurs','24'],
  LAL:['LAL','Los Angeles Lakers','13'],GS:['GS','Golden State Warriors','9'],MIA:['MIA','Miami Heat','14'],ORL:['ORL','Orlando Magic','19']};
const ymd=d=>d.replace(/-/g,'');
const nbaEvents=u=>{const m=u.match(/dates=(\d{8})(?:-(\d{8}))?/);const a=m?m[1]:'',b=m&&m[2]?m[2]:a;const inR=d=>ymd(d)>=a&&ymd(d)<=b;const E=[];
  /* opening night finals + a preseason final the ratings must ignore */
  if(inR('2026-10-20'))E.push(ev('n1','2026-10-20T23:00Z',NBA.BOS,NBA.DET,{state:'post',as:118,hs:104,lsA:[30,28,32,28],lsH:[25,27,26,26],det:'Final'}),ev('n2','2026-10-21T01:30Z',NBA.OKC,NBA.SA,{state:'post',as:121,hs:115,lsA:[31,30,30,30],lsH:[28,29,29,29],det:'Final'}));
  if(inR('2026-10-16'))E.push(ev('p1','2026-10-16T23:30Z',NBA.LAL,NBA.GS,{state:'post',pre:true,as:80,hs:140,det:'Final'}));
  if(inR('2026-10-21'))E.push(ev('n3','2026-10-22T00:00Z',NBA.LAL,NBA.GS,{odds:odds(-4.5,226.5,160,-190)}),ev('n4','2026-10-21T23:30Z',NBA.MIA,NBA.ORL,{odds:odds(-2,215,110,-130)}),
    ev('n5','2026-10-21T23:00Z',NBA.PHI,NBA.NY,{state:'in',per:3,clock:300,as:70,hs:66,lsA:[25,22,23],lsH:[20,24,22],det:'5:00 - 3rd'}));
  if(inR('2026-10-23'))E.push(ev('n6','2026-10-24T00:00Z',NBA.BOS,NBA.NY,{}));
  return{events:E};};
const std=(rows)=>({children:[{standings:{entries:rows.map(([ab,pf,pa,gp])=>({team:{abbreviation:ab,id:ab},stats:[{name:'avgPointsFor',value:pf},{name:'avgPointsAgainst',value:pa},{name:'gamesPlayed',value:gp},{name:'wins',value:Math.round(gp/2)},{name:'losses',value:gp-Math.round(gp/2)}]}))}}]});
const NBA_LAST=std([['BOS',117,108,82],['DET',110,113,82],['PHI',111,112,82],['NY',116,111,82],['OKC',119,106,82],['SA',113,115,82],['LAL',115,113,82],['GS',114,112,82],['MIA',110,110,82],['ORL',106,105,82]]);
/* college: 40 D1 teams, 20 games tonight — 6 carry ESPN lines, 2 are ranked, 1 is live, 1 is final */
const CT=Array.from({length:40},(_,i)=>{const names=['Duke Blue Devils','North Carolina Tar Heels','Kentucky Wildcats','Kansas Jayhawks','Michigan State Spartans','Saint John\'s Red Storm','Gonzaga Bulldogs','UConn Huskies'];
  const abs=['DUKE','UNC','UK','KU','MSU','SJU','GONZ','CONN'];return i<8?[abs[i],names[i],String(150+i),i===0?3:i===2?11:null]:['T'+i,'Team'+i+' Owls',String(500+i),null];});
const ncaabEvents=u=>{const m=u.match(/dates=(\d{8})(?:-(\d{8}))?/);const a=m?m[1]:'',b=m&&m[2]?m[2]:a;const inR=d=>ymd(d)>=a&&ymd(d)<=b;const E=[];
  if(inR('2026-11-14'))for(let i=0;i<20;i++){const A=CT[2*i],H=CT[2*i+1];const o={};if(i<6)o.odds=odds(-(2+i),140+i,120,-140);if(i===7){o.state='in';o.per=2;o.clock=600;o.as=40;o.hs=44;o.lsA=[30,10];o.lsH=[31,13];}
    if(i===8){o.state='post';o.as=70;o.hs=66;o.lsA=[33,37];o.lsH=[30,36];o.det='Final';}E.push(ev('c'+i,'2026-11-15T0'+(i%5)+':00Z',A,H,o));}
  if(inR('2026-11-12'))E.push(ev('cf1','2026-11-13T00:00Z',CT[0],CT[3],{state:'post',as:81,hs:70,det:'Final'}),ev('cf2','2026-11-13T00:00Z',CT[1],CT[2],{state:'post',as:65,hs:74,det:'Final'}));
  if(inR('2026-11-15'))E.push(ev('cn1','2026-11-16T00:00Z',CT[4],CT[5],{}));
  return{events:E};};
const TEAMS={sports:[{leagues:[{teams:CT.map(t=>({team:{abbreviation:t[0],id:t[2],location:t[1].split(' ').slice(0,-1).join(' ').replace(/ (Blue|Tar|Red)$/,''),name:t[1].split(' ').slice(-1)[0],displayName:t[1],shortDisplayName:t[1].replace(/ State /,' St ').split(' ').slice(0,2).join(' '),nickname:t[1].split(' ')[0]}}))}]}]};
const SUMMARY={header:{competitions:[{status:{type:{state:'post'}},date:'2026-11-14T23:00Z'}]},boxscore:{players:[{team:{abbreviation:'T16'},statistics:[{labels:['MIN','PTS','REB','AST','3PT','STL','BLK','TO'],athletes:[{athlete:{displayName:'Sam Owl'},stats:['30','21','6','3','3-7','1','0','2']}]}]}]}};
const ODDSAPI=[{away_team:'Los Angeles Lakers',home_team:'Golden State Warriors',bookmakers:[{key:'draftkings',markets:[{key:'h2h',outcomes:[{name:'Los Angeles Lakers',price:150},{name:'Golden State Warriors',price:-175}]},
  {key:'spreads',outcomes:[{name:'Los Angeles Lakers',price:-108,point:4},{name:'Golden State Warriors',price:-112,point:-4}]},{key:'totals',outcomes:[{name:'Over',price:-110,point:227.5},{name:'Under',price:-110,point:227.5}]}]}]}];
const boot=(page)=>new JSDOM(load(page),{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;
  w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=(u)=>{u=String(u);FETCHED.push(u);const J=b=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(b),text:()=>Promise.resolve(JSON.stringify(b))});
    if(/the-odds-api/.test(u))return J(ODDSAPI);
    if(/basketball\/nba\/scoreboard/.test(u))return J(nbaEvents(u));
    if(/basketball\/nba\/standings/.test(u))return J(/season=2027/.test(u)?std([]):NBA_LAST);
    if(/mens-college-basketball\/teams\?/.test(u))return J(TEAMS);
    if(/mens-college-basketball\/scoreboard/.test(u))return J(ncaabEvents(u));
    if(/mens-college-basketball\/standings/.test(u))return J(/season=2027/.test(u)?std([]):std(CT.map((t,i)=>[t[0],70+(i%7),70-(i%5),31])));
    if(/mens-college-basketball\/summary/.test(u))return J(SUMMARY);
    return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  /* ═════════════ NBA ═════════════ */
  const w=boot('nba.html');const E=s=>w.eval(s);await sleep(3500);
  T('the NBA page runs the new engine',E("typeof bbBoot==='function'&&typeof renderNBA==='function'&&ACTIVE_SPORT==='nba'"));
  T('today = Oct 21, the regular season',E('today()')==='2026-10-21'&&E("seasonPre('nba','2026-10-21')")===false&&E("seasonPre('nba','2026-10-16')")===true&&E("seasonPre('nba','2026-10-20')")===false,E("PRE_START.nba('2026-10-21')"));
  const slate=E("document.getElementById('slate').innerHTML");
  T('board: tonight\'s three games as full cards, live first',E('NBA_GAMES.length')===3&&/PHI/.test(slate)&&/LAL/.test(slate)&&slate.indexOf('LIVE')<slate.indexOf('TODAY'),E('NBA_GAMES.map(g=>g.away.abbr+"@"+g.home.abbr+":"+g.abstract).join(" ")'));
  T('every card carries all ten tabs',['Coach','Trends','A–G','Alt Lines','Proj. Box','Props','Take/Fade','My Bets','Roster','Live Box'].every(t=>slate.includes('>'+t+'<')));
  T('upcoming games wait as one-line rows (tap to open)',/nba-row-n6/.test(slate)&&/UPCOMING/.test(slate));
  /* ESPN lines filed as 'espn' */
  const L=E("JSON.stringify(nbaBookLinesFor('LAL@GS'))");const Lj=JSON.parse(L);
  T('ESPN\'s lines are filed (moneyline, spread, total) and marked as ESPN\'s',Lj.length===6&&Lj.every(x=>x.src==='espn')&&Lj.find(x=>x.market==='spread'&&x.side==='home').line===-4.5&&Lj.find(x=>x.market==='total').line===226.5,Lj.map(x=>x.market+':'+x.side+':'+x.line+':'+x.price).join(' '));
  /* results: opening night learned, preseason ignored */
  const R=JSON.parse(E("JSON.stringify(get('d4.nbares',{}))"));
  T('finals are kept (backfill + tonight), the preseason game flagged',R.n1&&R.n2&&R.p1&&R.p1[8]===1&&R.n1[8]===0,Object.keys(R).join(','));
  const lg=JSON.parse(E("JSON.stringify(bbLearned(BB_CFG.nba).teams)"));
  T('learned ratings come from regular-season games only (LAL/GS preseason blowout ignored)',lg.BOS&&lg.DET&&!lg.LAL&&!lg.GS,Object.keys(lg).join(','));
  /* the sim */
  const S=JSON.parse(E("(()=>{const g=NBA_GAMES.find(x=>x.id==='n3');const s=bbSim(BB_CFG.nba,g);return JSON.stringify({a:s.awayProj,h:s.homeProj,hw:s.hw,aw:s.aw,c45:s.homeCover(-4.5),a45:s.awayCover(4.5),p:s.cover('home',-4).p,o:s.over(226.5),u:s.under(226.5),h1:nbaSimFor(g,'h1').total,q1:nbaSimFor(g,'q1').total,full:s.total})})()"));
  T('sim: win chances add to 1, a cover and its mirror add to 1',Math.abs(S.hw+S.aw-1)<1e-9&&Math.abs(S.c45+S.a45-1)<1e-9&&Math.abs(S.o+S.u-1)<1e-9,JSON.stringify(S));
  T('an integer line has a real push band; periods scale (half ½, quarter ¼)',S.p>0.02&&S.p<0.05&&Math.abs(S.h1-S.full/2)<0.2&&Math.abs(S.q1-S.full/4)<0.2,`push ${S.p.toFixed(3)} · h1 ${S.h1.toFixed(1)} · q1 ${S.q1.toFixed(1)}`);
  T('home court is in the number (GS favored at home)',S.hw>0.5&&S.h>S.a);
  /* live */
  const lv=JSON.parse(E("JSON.stringify(nbaLive(NBA_GAMES.find(x=>x.id==='n5')))"));
  T('live: up 4 with 17 minutes left → the leader is the favorite',lv&&lv.aw>0.55&&lv.f>0.3&&lv.f<0.4,JSON.stringify(lv));
  /* the grader reads p1 (Q1) and h1 */
  const g5=JSON.parse(E("JSON.stringify(NBA_GAMES.find(x=>x.id==='n5'))"));
  T('in-game: Q1 recorded, the half too once it\'s over',g5.p1a===25&&g5.p1h===20&&g5.h1a===47&&g5.h1h===44,`${g5.p1a}-${g5.p1h} · ${g5.h1a}-${g5.h1h}`);
  /* tabs */
  for(const k of ['coach','trends','ag','alt','box','props','verdict','mybets','roster']){await E(`bbPan('nba','n3','${k}',null)`);}
  await sleep(400);
  const ag=E("BB_PANELS.ag(BB_CFG.nba,NBA_GAMES.find(x=>x.id==='n3'),bbSim(BB_CFG.nba,NBA_GAMES.find(x=>x.id==='n3')))");
  T('A–G reads A through G',['A) My line','B) Outside range','C) Vs the market','D) My picks','E) Props','F) Props vs the market','G) Confidence'].every(x=>ag.includes(x)));
  const alt=E("BB_PANELS.alt(BB_CFG.nba,NBA_GAMES.find(x=>x.id==='n3'),bbSim(BB_CFG.nba,NBA_GAMES.find(x=>x.id==='n3')))");
  T('Alt Lines: spreads, totals and the period table',/1st half/.test(alt)&&/1st quarter/.test(alt)&&(alt.match(/<tr>/g)||[]).length>=13);
  const box=E("BB_PANELS.box(BB_CFG.nba,NBA_GAMES.find(x=>x.id==='n3'),bbSim(BB_CFG.nba,NBA_GAMES.find(x=>x.id==='n3')))");
  T('Proj. Box: Q1–Q4, both halves, final',/>Q1</.test(box)&&/>Q2</.test(box)&&/>Q3</.test(box)&&/>Q4</.test(box)&&/2nd half/.test(box)&&/>Final</.test(box));
  /* the Judge works for the NBA now (it never had a config) */
  const J=E("(()=>{const g=NBA_GAMES.find(x=>x.id==='n3');const J=brainJudge(g,bbSim(BB_CFG.nba,g),'nba');return J?J.a+'-'+J.h:null})()");
  T('the Judge reads NBA games',J&&/^\d+(\.\d)?-\d+(\.\d)?$/.test(J),J);
  /* intake: book lines beat ESPN's */
  E(`saveNBABookOdds(parseNBASlateText("NBA\\nLakers @ Warriors\\nML: Lakers +170 / Warriors -200\\nSPREAD: Lakers +5 (-110) / Warriors -5 (-110)\\nOU: o228 (-110) / u228 (-110)\\nH1SPREAD: Lakers +2.5 (-110) / Warriors -2.5 (-110)").picks,null)`);
  const L2=JSON.parse(E("JSON.stringify(nbaBookLinesFor('LAL@GS'))"));
  T('your lines replace ESPN\'s; a 1st-half line files too',L2.find(x=>x.market==='spread'&&x.side==='home').line===-5&&L2.find(x=>x.market==='spread').src==='mine'&&L2.some(x=>x.market==='h1spread'),L2.map(x=>x.market+':'+x.src).join(' '));
  const card=E("document.getElementById('slate').innerHTML");
  T('the card shows the 1st-half spread as a REAL LINE section',/1ST HALF · SPREAD/.test(card));
  /* Odds API */
  E("set(LS.key,'k')");const nOdds=await E("bbFetchLiveOdds('nba')");
  const L3=JSON.parse(E("JSON.stringify(get('d4.nbashots',{})[today()].filter(x=>x.src==='live'))"));
  T('the Odds API pull files DraftKings lines as live (yours still win)',nOdds===6&&L3.length===6&&JSON.parse(E("JSON.stringify(nbaBookLinesFor('LAL@GS'))")).find(x=>x.market==='spread').src==='mine',`${nOdds} rows`);
  /* calls: regular season official only with a price; preseason never */
  E('voicesLog("nba")');const V=JSON.parse(E("JSON.stringify(get(VOICES_KEY,[]).filter(x=>x.sp==='nba'))"));
  T('the characters call tonight\'s NBA games',V.length>=6&&V.some(x=>x.voice==='Sim'),V.length+' calls');
  T('no NBA spread call sits on a ±1.5 run-line',!V.some(x=>x.market==='spread'&&Math.abs(x.line)===1.5),V.filter(x=>x.market==='spread').map(x=>x.line).join(','));
  const off=E("[{voice:'Sim',sp:'nba',market:'ml',side:'home',price:-150,cf:0.8,date:'2026-10-21'},{voice:'Sim',sp:'nba',market:'ml',side:'home',price:null,cf:0.8,date:'2026-10-21'},{voice:'Sim',sp:'nba',market:'ml',side:'home',price:-150,cf:0.8,date:'2026-10-16'},{voice:'Sim',sp:'nba',market:'ml',side:'home',price:-150,cf:0.8,date:'2026-10-21',pre:1}].map(isOfficial).join(',')");
  T('official needs a price and a regular-season game (preseason and sim-only calls stay shadow)',off==='true,false,false,false',off);
  /* the master evaluation, then the freeze holds the numbers */
  const ev1=E("runBasketballEval('nba').length");const run=JSON.parse(E("JSON.stringify(get('d4.nbaeval',{}))"));
  T('master evaluation: every lined pregame game, locked for the day',ev1===2&&run.evals.every(e=>e.mkts.length)&&E("(get(EVAL_LOCK_KEY,{}).by||{}).nba>0"),ev1+' games');
  const lock=JSON.parse(E("JSON.stringify(simLockFor('nba','LAL@GS'))"));
  T('the freeze stores tonight\'s numbers',lock&&lock.a>80&&lock.h>80,JSON.stringify(lock));
  E("(()=>{const R=get('d4.nbares',{});R.zz={};R.zz=['2026-10-21','LAL','DET',150,60,0,null,null,0];set('d4.nbares',R);BB_LEARN.nba=null;})()");
  const after=JSON.parse(E("(()=>{const g=NBA_GAMES.find(x=>x.id==='n3');const s=bbSim(BB_CFG.nba,g);return JSON.stringify({a:s.awayProj,h:s.homeProj,f:s.frozen})})()"));
  T('after the freeze a new final can\'t move a frozen game',after.f===true&&Math.abs(after.a-lock.a)<0.051&&Math.abs(after.h-lock.h)<0.051,JSON.stringify(after));
  T('no uncaught errors on the NBA page',!errors.length,errors.slice(0,3).join(' | '));
  /* ═════════════ COLLEGE ═════════════ */
  NOW=Date.parse('2026-11-14T18:00:00Z');   // Saturday noon CT
  const c=boot('ncaab.html');const C=s=>c.eval(s);await sleep(3500);
  T('the college page boots its own board',C("ACTIVE_SPORT==='ncaab'&&window.__PAGE_SPORT__==='ncaab'")&&C('NCAAB_GAMES.length')===20,C('NCAAB_LOAD_NOTE'));
  T('every D1 team is indexed for names → abbreviations',C("(get('d4.ncaabteams',{}).t||[]).length")===40);
  const nm=C("['Duke Blue Devils','duke','Michigan State','Michigan St Spartans','St. John\\'s','Saint John\\'s Red Storm','#3 Duke','UConn Huskies'].map(ncaabAbbrFor).join(',')");
  T('college names resolve (mascots, St./State, rankings)',nm==='DUKE,DUKE,MSU,MSU,SJU,SJU,DUKE,CONN',nm);
  const cs=C("document.getElementById('slate').innerHTML");
  T('the board opens on the games with lines (6 of 20) — filters for Top 25, Live, All',(cs.match(/class="tkt game-bb"/g)||[]).length===6&&/With lines/.test(cs)&&/Top 25/.test(cs)&&/>All /.test(cs),(cs.match(/class="tkt game-bb"/g)||[]).length+' full cards');
  C("bbSetView('ncaab','f','all')");const all=C("document.getElementById('slate').innerHTML");
  T('All: 20 games — ten open cards, the rest one-line rows plus "show more"',(all.match(/class="tkt game-bb"/g)||[]).length===10&&/Show 10 more/.test(all)&&(all.match(/class="tkt bb-row"/g)||[]).length>=9,(all.match(/class="tkt game-bb"/g)||[]).length+' cards · '+(all.match(/class="tkt bb-row"/g)||[]).length+' rows');
  C("BB_VIEW.ncaab.q='duke';bbRender('ncaab')");const q=C("document.getElementById('slate').innerHTML");
  T('search finds a team',/DUKE/.test(q)&&!/T10 /.test(q));
  C("BB_VIEW.ncaab.q='';bbSetView('ncaab','f','all')");C("bbExpand('ncaab','c15')");
  T('tapping a row opens its full card in place',!!C("document.getElementById('ncaab-card-c15')"));
  /* the characters work the lined games only */
  C('voicesLog("ncaab")');const games=C("[...new Set(get(VOICES_KEY,[]).filter(x=>x.sp==='ncaab').map(x=>x.game))].length");
  T('characters work the lined college games, not all 150',games===6,games+' games');
  /* college grammar + intake routing */
  T('a college sheet is recognized by its header or its totals',C("intakeGuessSport('NCAAB\\nDuke @ North Carolina')")==='ncaab'&&C("intakeGuessSport('Duke @ UNC\\nOU: o141.5 (-110) / u141.5 (-110)')")==='ncaab'&&C("intakeGuessSport('CBB\\nx')")==='ncaab');
  C(`saveNCAABBookOdds(parseNCAABSlateText("CBB\\nDuke Blue Devils @ North Carolina Tar Heels\\nML: Duke +130 / North Carolina -150\\nSPREAD: Duke +3 (-110) / North Carolina -3 (-110)\\n1H SPREAD: Duke +1.5 (-110) / North Carolina -1.5 (-110)\\nOU: o150 (-110) / u150 (-110)").picks,null)`);
  const cl=JSON.parse(C("JSON.stringify(ncaabBookLinesFor('DUKE@UNC'))"));
  T('college lines file under ESPN abbreviations, the 1st half too',cl.length===8&&cl.every(x=>x.src==='mine')&&cl.some(x=>x.market==='h1spread'),cl.map(x=>x.market).join(','));
  T('the Duke game (ranked, with your lines) is workable',C("bbWorkable('ncaab',NCAAB_GAMES.find(g=>g.away.abbr==='DUKE'))"));
  /* the grader reads college halves */
  const fin=JSON.parse(C("JSON.stringify(NCAAB_GAMES.find(g=>g.id==='c8'))"));
  T('college final: the first half is period 1',fin.h1a===33&&fin.h1h===30&&fin.p1a===33,`${fin.h1a}-${fin.h1h}`);
  const lvc=JSON.parse(C("JSON.stringify(NCAAB_GAMES.find(g=>g.id==='c7'))"));
  T('college live in the 2nd half: the half is in',lvc.h1a===30&&lvc.h1h===31);
  const leg=JSON.parse(C("JSON.stringify(resolveLeg({sport:'ncaab',game:'T16@T17',gid:'c8',pick:'T16 ML',gameDate:'2026-11-14'},'2026-11-14'))"));
  T('a college leg grades off the board',leg&&leg.a===70&&leg.h===66&&leg.live===false,JSON.stringify(leg).slice(0,120));
  /* box score → player logs with dates → last 5 / last 10 */
  await C("BB_PANELS.live(BB_CFG.ncaab,NCAAB_GAMES.find(g=>g.id==='c8'))");
  const f1=JSON.parse(C("JSON.stringify(pstForm('ncaab','Sam Owl','pts',5))"));
  T('a final box feeds the player log (last-5 average)',f1&&f1.n===1&&f1.avg===21,JSON.stringify(f1));
  C("['2026-11-01','2026-11-03','2026-11-05','2026-11-07','2026-11-09','2026-11-11'].forEach((d,i)=>pstAdd('ncaab','Sam Owl','T16',{pts:10+i,reb:5,ast:2,fg3:1,stl:0,blk:0},'e'+i,d))");
  const f5=JSON.parse(C("(()=>{const f=pstForm('ncaab','Sam Owl','pts',5),t=pstForm('ncaab','Sam Owl','pts',10);return JSON.stringify({a5:f.avg,n5:f.n,a10:t.avg,n10:t.n,last:f.last,hit:f.hit(14)})})()"));
  T('last 5 / last 10 read in date order (the newest game last)',f5.n5===5&&f5.n10===7&&f5.last===21&&Math.abs(f5.a5-(12+13+14+15+21)/5)<1e-9&&f5.hit===3,JSON.stringify(f5));
  const pk=C("(()=>{const D=pstDb('ncaab');const R=pstUnpack(pstPack(D));return R.p[pstId('Sam Owl')].r.length})()");
  T('the log survives the compact save format',pk===7,pk);
  /* the ledger stays phone-sized and sync can't undo it */
  const tr=JSON.parse(C("(()=>{const V=[];for(let i=0;i<7000;i++)V.push({id:'x'+i,sp:'ncaab',date:dayShift(today(),-(i%30)),graded:true,hit:true});V.push({id:'old',sp:'nhl',date:'2026-10-01',graded:false});V.push({id:'keep',sp:'nhl',date:today(),graded:false});const T2=voicesTrim(V);return JSON.stringify({n:T2.length,cb:T2.filter(x=>x.sp==='ncaab').length,old:T2.some(x=>x.id==='old'),keep:T2.some(x=>x.id==='keep'),newest:T2.some(x=>x.id==='x0')})})()"));
  T('ledger: college keeps a rolling 6,000, stale ungraded calls go, today\'s stay',tr.cb===6000&&!tr.old&&tr.keep&&tr.newest,JSON.stringify(tr));
  const mg=C("(()=>{const a=[];for(let i=0;i<6500;i++)a.push({id:'a'+i,sp:'ncaab',date:today(),graded:true});const b=[{id:'b1',sp:'nhl',date:today(),graded:true}];return syncMergeVal(VOICES_KEY,{t:2,v:a},{t:1,v:b},{}).length})()");
  T('a sync merge applies the same limits (a trimmed call can\'t come back)',mg===6001,mg);
  /* the college eval + record */
  const ce=C("runBasketballEval('ncaab').length");T('college master evaluation runs on the lined games',ce>=6,ce+' games');
  T('no uncaught errors on the college page',!errors.length,errors.slice(0,3).join(' | '));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));const p=out.filter(x=>x.startsWith('PASS')).length;console.log(`\n${p} pass / ${out.length-p} fail`);process.exit(0);})();
