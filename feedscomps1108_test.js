/* v2.96.0 · the Scorekeeper's box scores on the feeds robot: every final read once for the parts a score is built from —
   touchdowns / field goals / safeties / what the touchdowns brought, field goals / threes / free throws / offensive boards /
   turnovers, shots and power plays. Saved responses, invented games, no network. */
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');const W='/home/claude/work';
const dir=fs.mkdtempSync(path.join(require('os').tmpdir(),'fc-'));
fs.writeFileSync(path.join(dir,'season.json'),JSON.stringify({v:1,done:{},g:{'901':['nfl','2026-11-01','CLE','NO',11,16],'902':['nba','2026-11-07','BOS','NY',110,104],'903':['nhl','2026-11-06','NJ','TB',3,2],'904':['nba','2026-11-02','GS','LAL',99,101]}}));
const sp=(t,s,a,h,txt)=>({type:{abbreviation:t},scoringType:{name:s},awayScore:a,homeScore:h,text:txt||''});
const FX={'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=901':{boxscore:{teams:[{homeAway:'away',statistics:[{name:'totalDrives',displayValue:'11'},{name:'possessionTime',displayValue:'28:38'}]},{homeAway:'home',statistics:[{name:'totalDrives',displayValue:'10'},{name:'possessionTime',displayValue:'31:22'}]}]},
    scoringPlays:[sp('TD','touchdown',0,7,'Olave 12 yd pass (Grupe kick)'),sp('FG','field-goal',3,7),sp('TD','touchdown',3,13,'Kamara 2 yd run'),sp('PAT','extra-point',3,14,'Grupe extra point good'),sp('SF','safety',3,16,'Safety'),sp('TD','touchdown',9,16,'Chubb 5 yd run'),sp('2PT','two-point',11,16,'two-point conversion good')]},
  'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=902':{boxscore:{teams:[{homeAway:'away',statistics:[{name:'fieldGoalsMade-fieldGoalsAttempted',displayValue:'41-88'},{name:'threePointFieldGoalsMade-threePointFieldGoalsAttempted',displayValue:'15-40'},{name:'freeThrowsMade-freeThrowsAttempted',displayValue:'13-17'},{name:'offensiveRebounds',displayValue:'10'},{name:'totalTurnovers',displayValue:'12'}]},
    {homeAway:'home',statistics:[{name:'fieldGoalsMade-fieldGoalsAttempted',displayValue:'38-85'},{name:'threePointFieldGoalsMade-threePointFieldGoalsAttempted',displayValue:'12-35'},{name:'freeThrowsMade-freeThrowsAttempted',displayValue:'16-20'},{name:'offensiveRebounds',displayValue:'9'},{name:'turnovers',displayValue:'14'}]}]}},
  'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary?event=903':{boxscore:{teams:[{homeAway:'away',statistics:[{name:'shotsTotal',displayValue:'31'},{name:'powerPlayGoals',displayValue:'1'},{name:'powerPlayOpportunities',displayValue:'3'}]},{homeAway:'home',statistics:[{name:'shotsTotal',displayValue:'27'},{name:'powerPlayGoals',displayValue:'0'},{name:'powerPlayOpportunities',displayValue:'4'}]}]}},
  'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=904':{boxscore:{teams:[]}}};
fs.writeFileSync(dir+'.fx.json',JSON.stringify(FX));
execFileSync('node',[path.join(W,'feeds/build.mjs'),dir],{env:{...process.env,FEEDS_FIXTURES:dir+'.fx.json',FEEDS_COMPS:'1'}});
const C=JSON.parse(fs.readFileSync(path.join(dir,'comps.json'),'utf8'));const g=C.g;
T('football: touchdowns, field goals, safeties and what the touchdowns brought — a separate PAT and a 2-pt try added to their touchdown',JSON.stringify(g['901'].slice(6))==='[[1,1,0,8,11,28.63],[2,0,1,14,10,31.37]]',JSON.stringify(g['901']));
T('basketball: makes and tries for field goals, threes and free throws, offensive boards, turnovers (either name)',JSON.stringify(g['902'].slice(6))==='[[41,88,15,40,13,17,10,12],[38,85,12,35,16,20,9,14]]',JSON.stringify(g['902']));
T('hockey: shots on goal and power plays',JSON.stringify(g['903'].slice(6))==='[[31,1,3],[27,0,4]]',JSON.stringify(g['903']));
T('each row keeps the game: sport, day, teams and final',g['901'][0]==='nfl'&&g['901'][2]==='CLE'&&g['901'][4]===11&&g['901'][5]===16);
T('a summary with no box score is retried later (three tries), never stored empty',!g['904']&&C.bad['904']===1);
const I=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8'));T('the robot reports what it read',I.runs[0].verify.comps.added===3&&I.runs[0].verify.comps.have.nfl===1);
console.log(pass+' pass / '+fail+' fail');
