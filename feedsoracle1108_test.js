/* v2.94.0 · the Oracle's wire on the feeds robot: every game on the next slates read from ESPN's FPI/BPI predictor, Kalshi and
   Polymarket game markets and the betting public — stored until the final, then each source graded (straight-up, against the
   closing spread and total, the margin miss). Saved responses, invented games, no network. */
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');const W='/home/claude/work';
const NOW=Date.parse('2026-11-08T15:00:00Z');const st='2026-11-08T18:00:00Z',st2='2026-11-08T21:25:00Z';
const team=(ab,loc,nick)=>({id:ab,abbreviation:ab,location:loc,name:nick,shortDisplayName:nick,displayName:loc+' '+nick});
const ev=(id,date,state,a,h,odds)=>({id,date,status:{type:{state}},competitions:[{date,odds:odds?[odds]:[],competitors:[{homeAway:'away',team:a},{homeAway:'home',team:h}]}]});
const CLE=team('CLE','Cleveland','Browns'),NO=team('NO','New Orleans','Saints'),NYG=team('NYG','New York','Giants'),DAL=team('DAL','Dallas','Cowboys');
const SB='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20261108';
const fx1={[SB]:{events:[ev('401','2026-11-08T18:00Z','pre',CLE,NO,{details:'NO -3',overUnder:44.5}),ev('402','2026-11-08T21:25Z','pre',NYG,DAL,{details:'DAL -3.5',overUnder:47.5})]},
  'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/401/competitions/401/predictor':{homeTeam:{statistics:[{name:'gameProjection',value:'72.5'},{name:'teamPredPtDiff',value:'6.1'},{name:'matchupQuality',value:'40'}]},awayTeam:{statistics:[{name:'gameProjection',value:'27.5'}]}},
  'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/402/competitions/402/predictor':{homeTeam:{statistics:[{name:'gameProjection',value:'61.0'}]},awayTeam:{statistics:[]}},
  'https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=KXNFLGAME&status=open&limit=1000':{markets:[
    {event_ticker:'KXNFLGAME-26NOV08CLENO',ticker:'KXNFLGAME-26NOV08CLENO-NO',title:'Cleveland at New Orleans Winner?',yes_sub_title:'New Orleans',yes_bid_dollars:'0.70',yes_ask_dollars:'0.72'},
    {event_ticker:'KXNFLGAME-26NOV08CLENO',ticker:'KXNFLGAME-26NOV08CLENO-CLE',title:'Cleveland at New Orleans Winner?',yes_sub_title:'Cleveland',yes_bid_dollars:'0.28',yes_ask_dollars:'0.30'},
    {event_ticker:'KXNFLGAME-26NOV08NYGDAL',ticker:'KXNFLGAME-26NOV08NYGDAL-NYG',title:'New York G at Dallas Winner?',yes_sub_title:'New York G',yes_bid_dollars:'0.20',yes_ask_dollars:'0.60',last_price_dollars:'0.36'}]},
  'https://gamma-api.polymarket.com/events?tag_slug=nfl&closed=false&active=true&limit=500':[{title:'Super Bowl Champion',markets:[{question:'Will Kansas City win?',outcomes:'["Yes","No"]',outcomePrices:'["0.2","0.8"]'}]},
    {title:'Giants vs. Cowboys',markets:[{question:'Spread: Cowboys (-3.5)',outcomes:'["Cowboys","Giants"]',outcomePrices:'["0.5","0.5"]',sportsMarketType:'spreads'},{question:'Giants vs. Cowboys',outcomes:'["Giants","Cowboys"]',outcomePrices:'["0.35","0.65"]',sportsMarketType:'moneyline'}]}],
  'https://api.actionnetwork.com/web/v1/scoreboard/nfl?period=game&bookIds=15,30&date=20261108':{games:[{away_team_id:1,home_team_id:2,start_time:st,teams:[{id:1,full_name:'Cleveland Browns'},{id:2,full_name:'New Orleans Saints'}],odds:[{book_id:15,ml_home_public:80,spread_home_public:64,total_over_public:58,ml_home_money:85}]}]}};
Object.assign(fx1,{
  'https://www.dratings.com/predictor/nfl-football-predictions/upcoming/1':'<table><thead><tr><th>Time</th><th>Teams</th><th>Quarterbacks</th><th>Win</th><th>Best ML</th><th>Best Spread</th><th>Points</th><th>Total Points</th></tr></thead><tbody><tr><td>11/08/2026 01:00 PM</td><td><a>Cleveland Browns</a> (2-6)<br><a>New Orleans Saints</a> (5-3)</td><td>A B</td><td><span>30.5%</span><br><span>69.5%</span></td><td>+240 -290</td><td>+3 -3</td><td>17.4<br>24.9</td><td>42.3</td></tr></tbody></table>',
  'https://www.thepredictiontracker.com/nflpredictions.csv':'lineopen,line,road,home,linesag,linenfelo,lineavg\n-2.5,-3,Cleveland,New Orleans,-5.5,-1,-3.2\n-3,-3.5,NY Giants,Dallas,-6,-2,-4\n',
  'https://www.oddsshark.com/nfl/computer-picks':'<table><tr><th>Team</th><th>Predicted Score</th><th>Spread</th><th>Total</th><th>ML</th></tr><tr><th>CLE CLE</th><td>18.5</td><td>+3</td><td>u44</td><td>+240</td></tr><tr><th>NO NO</th><td>25.1</td><td>-3</td><td>u44</td><td>-290</td></tr></table>',
  'https://contests.covers.com/consensus/topconsensus/nfl/overall':'<table><tr><th>Matchup</th><th>Date</th><th>Consensus</th><th>Sides</th><th>Picks</th></tr><tr><td>NFL</td><td>Cle</td><td>No</td><td>Sun. Nov 08 1:00 pm ET</td><td>27%</td><td>73%</td><td>+3</td><td>-3</td><td>271</td><td>725</td><td>Details</td></tr></table>',
  'https://www.cbssports.com/nfl/picks/experts/':'<table><tr class="TableBase-bodyTr"><td>FINAL</td><td>JAX 6-2 33 BAL 4-5 10</td><td>WIN JAX -9.5</td></tr><tr class="TableBase-bodyTr"><td>1:00 pm CBS</td><td>CLE 5-3</td><td>NO 2-5</td><td>Preview</td><td>NO -3 Remove</td><td>NO -3 Remove</td><td>CLE +3 Remove</td><td>NO -3 Remove</td></tr></table>',
  'https://www.pickswise.com/nfl/picks/':'<table><tr><th>Match</th><th>Our Pick</th><th>Rating</th></tr><tr><td>CLE vs NO</td><td>Saints -3</td><td>3⭐</td></tr><tr><td>NYG vs DAL</td><td>Over 47.5</td><td>2⭐</td></tr></table>'});
const dir=fs.mkdtempSync(path.join(require('os').tmpdir(),'fo-'));const run=(fx,now)=>{fs.writeFileSync(dir+'.fx.json',JSON.stringify(fx));execFileSync('node',[path.join(W,'feeds/build.mjs'),dir],{env:{...process.env,FEEDS_FIXTURES:dir+'.fx.json',FEEDS_ORACLE:'1',FEEDS_NOW:String(now)}});
  return JSON.parse(fs.readFileSync(path.join(dir,'oracle.json'),'utf8'));};
const O=run(fx1,NOW);const g1=O.g['nfl|CLE@NO|2026-11-08'],g2=O.g['nfl|NYG@DAL|2026-11-08'];
T('the slate: both of today\'s games, with the line',g1&&g2&&g1.ln&&g1.ln.spH===-3&&g1.ln.tot===44.5,JSON.stringify(g1&&g1.ln));
T('ESPN\'s FPI: win chance and predicted margin for the home side',g1.s.espn&&g1.s.espn.wp===0.725&&g1.s.espn.mg===6.1&&g2.s.espn.wp===0.61&&g2.s.espn.mg==null,JSON.stringify([g1.s.espn,g2.s.espn]));
T('Kalshi: both sides\' markets read as one home chance (mid of a tight bid/ask)',g1.s.kalshi&&Math.abs(g1.s.kalshi.wp-0.71)<1e-9,JSON.stringify(g1.s.kalshi));
T('…a wide market falls back to its last trade ("New York G" is the Giants, so Dallas 64%)',g2.s.kalshi&&Math.abs(g2.s.kalshi.wp-0.64)<1e-9,JSON.stringify(g2.s.kalshi));
T('Polymarket: the moneyline market, not the spread or a futures yes/no',g2.s.poly&&g2.s.poly.wp===0.65&&!g1.s.poly,JSON.stringify(g2.s.poly));
T('the betting public: home and over splits, tickets and money',g1.s.public&&g1.s.public.pub.ml===80&&g1.s.public.pub.sp===64&&g1.s.public.pub.ou===58&&g1.s.public.pub.mlm===85,JSON.stringify(g1.s.public));
T('DRatings: win chance and predicted score (away listed first)',g1.s.dr&&g1.s.dr.wp===0.695&&g1.s.dr.pa===17.4&&g1.s.dr.ph===24.9&&g1.s.dr.tot===42.3,JSON.stringify(g1.s.dr));
T('the Prediction Tracker: each rating system is its own source, the sign read off the file ("NY Giants" = the Giants)',g1.s['pt.sag']&&g1.s['pt.sag'].mg===5.5&&g1.s['pt.nfelo'].mg===1&&g2.s['pt.sag'].mg===6&&!g1.s['pt.avg']&&O.src['pt.sag'].lab==='Sagarin (Prediction Tracker)',JSON.stringify([g1.s['pt.sag'],g2.s['pt.nfelo']]));
T('OddsShark\'s computer: a predicted score per team',g1.s.os&&g1.s.os.pa===18.5&&g1.s.os.ph===25.1,JSON.stringify(g1.s.os));
T('Pickswise: the expert\'s pick and stars — a side with its line, a total',g1.s.pw&&g1.s.pw.pk[0].mk==='spread'&&g1.s.pw.pk[0].side==='home'&&g1.s.pw.pk[0].line===-3&&g1.s.pw.pk[0].st===3&&g2.s.pw.pk[0].mk==='total'&&g2.s.pw.pk[0].side==='over',JSON.stringify([g1.s.pw,g2.s.pw]));
T('Covers\' contest consensus: 73% of its players on NO against the spread',g1.s.covers&&g1.s.covers.pub.sp===73&&g1.s.covers.pub.n===996,JSON.stringify(g1.s.covers));
T('CBS Sports\' experts: 3 on NO, 1 on CLE (finished games skipped)',g1.s.cbs&&g1.s.cbs.xp.h===3&&g1.s.cbs.xp.a===1,JSON.stringify(g1.s.cbs));
T('no record before anything is final',Object.keys(O.rec).length===0);
const fs2=(f,o)=>fs.writeFileSync(path.join(dir,f),JSON.stringify(o));
fs2('closes.json',{v:1,games:{'401':{id:'401',sp:'nfl',st,a:'CLE',h:'NO',as:17,hs:27,pc:{spread:{home:{cl:-3}},total:{over:{cl:44.5}}}},'402':{id:'402',sp:'nfl',st:st2,a:'NYG',h:'DAL',as:24,hs:20,pc:{spread:{home:{cl:-3.5}},total:{over:{cl:47.5}}}}}});
const fx2={...fx1,[SB]:{events:[ev('401','2026-11-08T18:00Z','post',CLE,NO),ev('402','2026-11-08T21:25Z','post',NYG,DAL)]}};
const O2=run(fx2,NOW+10*36e5);const R=O2.rec;const r=(k)=>((R[k]||{}).nfl||{}).all||{};
T('after the finals: ESPN 1-1 straight up, covered the one game it gave a margin for (NO by 6.1 vs -3; won by 10), missed by 3.9',JSON.stringify(r('espn').su)==='[1,2]'&&JSON.stringify(r('espn').ats)==='[1,1]'&&r('espn').mae===3.9,JSON.stringify(r('espn')));
T('Kalshi 1-1 (the Giants upset), its probability error kept (Brier)',JSON.stringify(r('kalshi').su)==='[1,2]'&&r('kalshi').br>0,JSON.stringify(r('kalshi')));
T('Polymarket 0-1',JSON.stringify(r('poly').su)==='[0,1]',JSON.stringify(r('poly')));
T('the public: right on the side and the spread, wrong on the over (44 under 44.5)',JSON.stringify(r('public').su)==='[1,1]'&&JSON.stringify(r('public').ats)==='[1,1]'&&JSON.stringify(r('public').ou)==='[0,1]',JSON.stringify(r('public')));
T('each Prediction Tracker system earns its own ATS record (Sagarin 1-1, nfelo 1-1, on different games)',JSON.stringify(r('pt.sag').ats)==='[1,2]'&&JSON.stringify(r('pt.nfelo').ats)==='[1,2]'&&r('pt.sag').mae===7.25,JSON.stringify([r('pt.sag'),r('pt.nfelo')]));
T('Pickswise graded on its own picks: Saints -3 covered, the over missed',JSON.stringify(r('pw').ats)==='[1,1]'&&JSON.stringify(r('pw').ou)==='[0,1]',JSON.stringify(r('pw')));
T('DRatings graded on its score: right side, covered, under 44.5 — right (42.3 projected, 44 scored)',JSON.stringify(r('dr').su)==='[1,1]'&&JSON.stringify(r('dr').ats)==='[1,1]'&&JSON.stringify(r('dr').ou)==='[1,1]',JSON.stringify(r('dr')));
T('the crowds graded on their majority side: Covers and the CBS panel both on NO -3, covered',JSON.stringify(r('covers').ats)==='[1,1]'&&JSON.stringify(r('cbs').ats)==='[1,1]',JSON.stringify([r('covers'),r('cbs')]));
T('graded games leave the wire; today\'s file is only games still to play',Object.keys(O2.g).length===0);
T('each source listed with when it last answered',O2.src.espn&&O2.src.espn.ok&&O2.src.kalshi.lab==='Kalshi'&&O2.src.public.kind==='crowd');
const C2=JSON.parse(fs.readFileSync(path.join(dir,'oraclecache.json'),'utf8'));
T('a source that answers nothing for a day is rested (retried every 6 hours)',(()=>{C2.h.poly={ok:0,fail:30,try:NOW+10*36e5};fs2('oraclecache.json',C2);const O3=run(fx1,NOW+11*36e5);return !O3.g['nfl|NYG@DAL|2026-11-08'].s.poly&&O3.g['nfl|NYG@DAL|2026-11-08'].s.kalshi;})());
T('…and nothing in the public file is a pick — only the outside world\'s numbers',!/"pick"|"call"|"official"/.test(fs.readFileSync(path.join(dir,'oracle.json'),'utf8')));
console.log(pass+' pass / '+fail+' fail');
