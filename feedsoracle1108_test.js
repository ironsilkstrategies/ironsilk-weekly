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
const dir=fs.mkdtempSync(path.join(require('os').tmpdir(),'fo-'));const run=(fx,now)=>{fs.writeFileSync(dir+'.fx.json',JSON.stringify(fx));execFileSync('node',[path.join(W,'feeds/build.mjs'),dir],{env:{...process.env,FEEDS_FIXTURES:dir+'.fx.json',FEEDS_ORACLE:'1',FEEDS_NOW:String(now)}});
  return JSON.parse(fs.readFileSync(path.join(dir,'oracle.json'),'utf8'));};
const O=run(fx1,NOW);const g1=O.g['nfl|CLE@NO|2026-11-08'],g2=O.g['nfl|NYG@DAL|2026-11-08'];
T('the slate: both of today\'s games, with the line',g1&&g2&&g1.ln&&g1.ln.spH===-3&&g1.ln.tot===44.5,JSON.stringify(g1&&g1.ln));
T('ESPN\'s FPI: win chance and predicted margin for the home side',g1.s.espn&&g1.s.espn.wp===0.725&&g1.s.espn.mg===6.1&&g2.s.espn.wp===0.61&&g2.s.espn.mg==null,JSON.stringify([g1.s.espn,g2.s.espn]));
T('Kalshi: both sides\' markets read as one home chance (mid of a tight bid/ask)',g1.s.kalshi&&Math.abs(g1.s.kalshi.wp-0.71)<1e-9,JSON.stringify(g1.s.kalshi));
T('…a wide market falls back to its last trade ("New York G" is the Giants, so Dallas 64%)',g2.s.kalshi&&Math.abs(g2.s.kalshi.wp-0.64)<1e-9,JSON.stringify(g2.s.kalshi));
T('Polymarket: the moneyline market, not the spread or a futures yes/no',g2.s.poly&&g2.s.poly.wp===0.65&&!g1.s.poly,JSON.stringify(g2.s.poly));
T('the betting public: home and over splits, tickets and money',g1.s.public&&g1.s.public.pub.ml===80&&g1.s.public.pub.sp===64&&g1.s.public.pub.ou===58&&g1.s.public.pub.mlm===85,JSON.stringify(g1.s.public));
T('no record before anything is final',Object.keys(O.rec).length===0);
const fs2=(f,o)=>fs.writeFileSync(path.join(dir,f),JSON.stringify(o));
fs2('closes.json',{v:1,games:{'401':{id:'401',sp:'nfl',st,a:'CLE',h:'NO',as:17,hs:27,pc:{spread:{home:{cl:-3}},total:{over:{cl:44.5}}}},'402':{id:'402',sp:'nfl',st:st2,a:'NYG',h:'DAL',as:24,hs:20,pc:{spread:{home:{cl:-3.5}},total:{over:{cl:47.5}}}}}});
const fx2={...fx1,[SB]:{events:[ev('401','2026-11-08T18:00Z','post',CLE,NO),ev('402','2026-11-08T21:25Z','post',NYG,DAL)]}};
const O2=run(fx2,NOW+10*36e5);const R=O2.rec;const r=(k)=>((R[k]||{}).nfl||{}).all||{};
T('after the finals: ESPN 1-1 straight up, covered the one game it gave a margin for (NO by 6.1 vs -3; won by 10), missed by 3.9',JSON.stringify(r('espn').su)==='[1,2]'&&JSON.stringify(r('espn').ats)==='[1,1]'&&r('espn').mae===3.9,JSON.stringify(r('espn')));
T('Kalshi 1-1 (the Giants upset), its probability error kept (Brier)',JSON.stringify(r('kalshi').su)==='[1,2]'&&r('kalshi').br>0,JSON.stringify(r('kalshi')));
T('Polymarket 0-1',JSON.stringify(r('poly').su)==='[0,1]',JSON.stringify(r('poly')));
T('the public: right on the side and the spread, wrong on the over (44 under 44.5)',JSON.stringify(r('public').su)==='[1,1]'&&JSON.stringify(r('public').ats)==='[1,1]'&&JSON.stringify(r('public').ou)==='[0,1]',JSON.stringify(r('public')));
T('graded games leave the wire; today\'s file is only games still to play',Object.keys(O2.g).length===0);
T('each source listed with when it last answered',O2.src.espn&&O2.src.espn.ok&&O2.src.kalshi.lab==='Kalshi'&&O2.src.public.kind==='crowd');
const C2=JSON.parse(fs.readFileSync(path.join(dir,'oraclecache.json'),'utf8'));
T('a source that answers nothing for a day is rested (retried every 6 hours)',(()=>{C2.h.poly={ok:0,fail:30,try:NOW+10*36e5};fs2('oraclecache.json',C2);const O3=run(fx1,NOW+11*36e5);return !O3.g['nfl|NYG@DAL|2026-11-08'].s.poly&&O3.g['nfl|NYG@DAL|2026-11-08'].s.kalshi;})());
T('…and nothing in the public file is a pick — only the outside world\'s numbers',!/"pick"|"call"|"official"/.test(fs.readFileSync(path.join(dir,'oracle.json'),'utf8')));
console.log(pass+' pass / '+fail+' fail');
