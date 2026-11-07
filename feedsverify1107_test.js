/* v2.87.7 · the feeds robot double-checks every ESPN final against the leagues' own feeds — NHL.com, NBA.com, NCAA.com (through
   the open-source ncaa-api). Saved responses, no network; invented games. */
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');const W='/home/claude/work';
const now=Date.now();const ymd=t=>new Date(t).toISOString().slice(0,10).replace(/-/g,'');const et=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const st=new Date(now-6*36e5).toISOString().replace(/\.\d{3}Z$/,'Z');
const ev=(id,sp,a,h,as,hs,names)=>({id,date:st,week:{number:10},status:{type:{state:'post'}},competitions:[{competitors:[{homeAway:'away',team:{abbreviation:a,location:names?names[0]:a,shortDisplayName:names?names[0]:a,displayName:(names?names[0]:a)+' X'},score:String(as)},{homeAway:'home',team:{abbreviation:h,location:names?names[1]:h,shortDisplayName:names?names[1]:h,displayName:(names?names[1]:h)+' Y'},score:String(hs)}]}]});
const SP={nfl:['football','nfl',''],ncaaf:['football','college-football','&groups=80&limit=300'],nba:['basketball','nba',''],ncaab:['basketball','mens-college-basketball','&groups=50&limit=300'],nhl:['hockey','nhl',''],mlb:['baseball','mlb','']};
const games={nhl:[ev('n1','nhl','NJ','TB',3,2)],nba:[ev('b1','nba','GS','NY',110,104)],ncaab:[ev('c1','ncaab','ISU','SMC',70,65,['Iowa State',"Saint Mary's"]),ev('c2','ncaab','MONM','URI',60,72,['Monmouth','Rhode Island'])],ncaaf:[ev('f1','ncaaf','UGA','MISS',24,21,['Georgia','Ole Miss'])],nfl:[],mlb:[]};
const FX={};for(const [sp,[s,l,q]] of Object.entries(SP)){for(let b=2;b>=0;b--){FX[`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/scoreboard?dates=${ymd(now-b*864e5)}${q}`]={events:b===0?games[sp]:[]};}
  games[sp].forEach(e=>{const c=e.competitions[0].competitors;FX[`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/summary?event=${e.id}`]={header:{id:e.id,competitions:[{date:st,status:{type:{state:'post'}},competitors:c}]}};});}
const d=et(st),[Y,M,D]=d.split('-');const ep=String(Math.round(Date.parse(st)/1000));
FX[`https://api-web.nhle.com/v1/score/${d}`]={games:[{gameState:'OFF',startTimeUTC:st,awayTeam:{abbrev:'NJD',score:3},homeTeam:{abbrev:'TBL',score:2}}]};
FX['https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json']={leagueSchedule:{gameDates:[{games:[{gameStatus:3,gameDateTimeUTC:st,awayTeam:{teamTricode:'GSW',score:110},homeTeam:{teamTricode:'NYK',score:101}}]}]}};
FX[`https://ncaa-api.henrygd.me/scoreboard/basketball-men/d1/${Y}/${M}/${D}/all-conf`]={games:[{game:{gameState:'final',startTimeEpoch:ep,away:{score:'70',names:{short:'Iowa St.',seo:'iowa-st',char6:'IOWAST'}},home:{score:'65',names:{short:"Saint Mary's (CA)",seo:'st-marys-ca',char6:'STMARY'}}}},
  {game:{gameState:'final',startTimeEpoch:ep,away:{score:'72',names:{short:'Rhode Island',seo:'rhode-island',char6:'URI'}},home:{score:'60',names:{short:'Monmouth',seo:'monmouth',char6:'MONMTH'}}}}]};
FX[`https://ncaa-api.henrygd.me/scoreboard/football/fbs/${Y}/10/all-conf`]={games:[{game:{gameState:'final',startTimeEpoch:ep,away:{score:'24',names:{short:'Georgia',seo:'georgia',char6:'UGA'}},home:{score:'21',names:{short:'Ole Miss',seo:'ole-miss',char6:'OLEMIS'}}}}]};
const dir=fs.mkdtempSync(path.join(require('os').tmpdir(),'fv-'));const fx=dir+'.fx.json';fs.writeFileSync(fx,JSON.stringify(FX));
execFileSync('node',[path.join(W,'feeds/build.mjs'),dir],{env:{...process.env,FEEDS_FIXTURES:fx,FEEDS_VERIFY:'1'}});
const C=JSON.parse(fs.readFileSync(path.join(dir,'closes.json'),'utf8')).games;const x=id=>(C[id]||{}).x||{};
T('NHL.com agrees with ESPN (its NJD/TBL codes read as ESPN\'s NJ/TB)',x('n1').s==='nhl'&&x('n1').ok===true,JSON.stringify(x('n1')));
T('NBA.com disagrees (101 vs ESPN\'s 104) — flagged, both scores kept',x('b1').s==='nba'&&x('b1').ok===false&&x('b1').hs===101,JSON.stringify(x('b1')));
T('NCAA.com matches college games by school name — "Iowa St." / "Saint Mary\'s (CA)" = Iowa State / Saint Mary\'s',x('c1').s==='ncaa'&&x('c1').ok===true,JSON.stringify(x('c1')));
T('…even listed the other way round (a neutral site), scores flipped to match',x('c2').s==='ncaa'&&x('c2').as===60&&x('c2').hs===72&&x('c2').ok===true,JSON.stringify(x('c2')));
T('…and college football by its week (Georgia @ Ole Miss)',x('f1').s==='ncaa'&&x('f1').ok===true,JSON.stringify(x('f1')));
const I=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8')).runs[0].verify;
T('the run log counts what was checked and what disagreed',I.nhl.ok===1&&I.nba.bad===1&&I.ncaa.ok===3,JSON.stringify(I));
fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(fx,{force:true});
console.log(pass+' pass / '+fail+' fail');
