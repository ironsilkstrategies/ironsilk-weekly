/* v3.5.23 · Nov 25, Chris: "Why am I not seeing any characters making 1st half bets?" — ESPN's DraftKings board carried NFL half
   lines with no prices and nothing for college basketball, so the NFL and every college game never got a half call. The feeds
   robot now reads Action Network's public v2 scoreboard for every sport's 1st half (1st period in hockey): spread, total with the
   over and under named, moneyline — pregame only, keyed by ESPN's codes. Responses trimmed from the real ones, no network. */
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');const W='/home/claude/work';
const NOW=Date.parse('2026-11-25T17:00:00Z');
const team=(id,ab,loc,nick)=>({id,abbreviation:ab,location:loc,name:nick,shortDisplayName:nick,displayName:loc+' '+nick});
const ev=(id,date,a,h)=>({id,date,status:{type:{state:'pre'}},competitions:[{date,competitors:[{homeAway:'away',team:a},{homeAway:'home',team:h}]}]});
const GB=team('9','GB','Green Bay','Packers'),LAR=team('14','LAR','Los Angeles','Rams'),CHI=team('3','CHI','Chicago','Bears'),DET=team('8','DET','Detroit','Lions'),PHI=team('21','PHI','Philadelphia','Eagles'),DAL=team('6','DAL','Dallas','Cowboys');
const ASU=team('9a','ASU','Arizona State','Sun Devils'),LSU=team('99','LSU','LSU','Tigers'),ARIZ=team('12','ARIZ','Arizona','Wildcats'),MISS=team('145','MISS','Ole Miss','Rebels'),MARQ=team('269','MARQ','Marquette','Golden Eagles'),UVA=team('258','UVA','Virginia','Cavaliers');
const ESPN=(s,l,d,q)=>`https://site.api.espn.com/apis/site/v2/sports/${s}/${l}/scoreboard?dates=${d}${q||''}`;
const an=(id,st,status,A,H,ml,sp,ou)=>({id,status,start_time:st,away_team_id:1,home_team_id:2,teams:[{id:1,abbr:A[0],full_name:A[1]},{id:2,abbr:H[0],full_name:H[1]}],
  markets:{'15':{firsthalf:{moneyline:[{side:'away',odds:ml[0],is_live:false},{side:'home',odds:ml[1],is_live:false},{side:'home',odds:1076,is_live:true}],
    spread:[{side:'away',value:sp[0],odds:sp[1],is_live:false},{side:'home',value:-sp[0],odds:sp[2],is_live:false},{side:'home',value:6.5,odds:-117,is_live:true},{side:'away',value:sp[0]+3,odds:150,is_live:false,is_alt_market:true}],
    total:[{side:'over',value:ou[0],odds:ou[1],is_live:false},{side:'under',value:ou[0],odds:ou[2],is_live:false},{side:'over',value:48.5,odds:100,is_live:true}]}}}});
const fx={
  [ESPN('football','nfl','20261125')]:{events:[ev('401873079','2026-11-26T01:00Z',GB,LAR)]},
  [ESPN('football','nfl','20261126')]:{events:[ev('401873081','2026-11-26T18:00Z',CHI,DET),ev('401873080','2026-11-26T21:30Z',PHI,DAL)]},
  [ESPN('basketball','mens-college-basketball','20261125','&groups=50&limit=300')]:{events:[ev('1','2026-11-25T19:00Z',ASU,LSU),ev('2','2026-11-25T19:30Z',MISS,ARIZ),ev('3','2026-11-25T17:00Z',MARQ,UVA)]},
  'https://api.actionnetwork.com/web/v2/scoreboard/nfl?bookIds=15,30&periods=firsthalf':{games:[
    an(1,'2026-11-26T01:00:00.000Z','scheduled',['GB','Green Bay Packers'],['LA','Los Angeles Rams'],[112,-136],[1,-112,-107],[21,-114,-105]),
    an(2,'2026-11-26T18:00:00.000Z','scheduled',['CHI','Chicago Bears'],['DET','Detroit Lions'],[-117,-103],[-1,107,-127],[27.5,-106,-113]),
    an(3,'2026-11-26T21:30:00.000Z','scheduled',['PHI','Philadelphia Eagles'],['DAL','Dallas Cowboys'],[259,-332],[6,-110,-109],[24,-110,-110])]},
  'https://api.actionnetwork.com/web/v2/scoreboard/ncaab?bookIds=15,30&periods=firsthalf&division=D1&date=20261125':{games:[
    an(4,'2026-11-25T19:00:00.000Z','scheduled',['ASU','Arizona State Sun Devils'],['LSU','LSU Tigers'],[133,-168],[2.5,-116,-111],[68,-117,-110]),
    /* Action Network has Arizona away; ESPN has Ole Miss away (a neutral floor): the sides must flip to ESPN's */
    an(5,'2026-11-25T19:30:00.000Z','scheduled',['ARIZ','Arizona Wildcats'],['MISS','Ole Miss Rebels'],[-205,161],[-3.5,-106,-121],[72,-117,-110]),
    an(6,'2026-11-25T17:00:00.000Z','inprogress',['MARQ','Marquette Golden Eagles'],['UVA','Virginia Cavaliers'],[156,-201],[3,-114,-113],[71,-117,-110])]}};
const dir=fs.mkdtempSync(path.join(require('os').tmpdir(),'fh-'));fs.writeFileSync(dir+'.fx.json',JSON.stringify(fx));
execFileSync('node',[path.join(W,'feeds/build.mjs'),dir],{env:{...process.env,FEEDS_FIXTURES:dir+'.fx.json',FEEDS_HALVES:'1',FEEDS_NOW:String(NOW)},stdio:'pipe'});
const H=JSON.parse(fs.readFileSync(path.join(dir,'halves.json'),'utf8')),idx=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8'));
const g=H.g['nfl|GB@LAR'];
T('the NFL gets its half lines, with prices (ESPN\'s came without), keyed by ESPN\'s codes (Action Network\'s "LA" is the Rams, LAR)',g&&g.sp.a.line===1&&g.sp.a.price===-112&&g.sp.h.line===-1&&g.sp.h.price===-107&&g.ml.a.price===112&&g.ml.h.price===-136,JSON.stringify(g));
T('…the half total with the over and under named (ESPN\'s didn\'t say which price was which)',g.ou&&g.ou.line===21&&g.ou.o===-114&&g.ou.u===-105,JSON.stringify(g&&g.ou));
T('…every game on the week (Thursday\'s too), with its slate day and start',H.g['nfl|CHI@DET']&&H.g['nfl|PHI@DAL']&&H.g['nfl|PHI@DAL'].sp.h.line===-6&&H.g['nfl|PHI@DAL'].d==='2026-11-26'&&g.d==='2026-11-25',JSON.stringify(Object.keys(H.g)));
const c=H.g['ncaab|ASU@LSU'];
T('college basketball gets them for the first time',c&&c.sp.h.line===-2.5&&c.sp.h.price===-111&&c.sp.a.price===-116&&c.ou.line===68&&c.ou.o===-117&&c.ml.h.price===-168,JSON.stringify(c));
const f=H.g['ncaab|MISS@ARIZ'];
T('a game the two sources list the other way round (neutral floor) is turned to ESPN\'s sides',f&&!H.g['ncaab|ARIZ@MISS']&&f.sp.a.line===3.5&&f.sp.a.price===-121&&f.sp.h.line===-3.5&&f.sp.h.price===-106&&f.ml.h.price===-205&&f.ml.a.price===161,JSON.stringify(f));
T('pregame only: live prices, alternate lines and games already under way are left out',!H.g['ncaab|MARQ@UVA']&&g.sp.h.line===-1&&c.ou.o!==100&&!Object.values(H.g).some(x=>x.ml&&(x.ml.h.price===1076)),JSON.stringify(Object.keys(H.g)));
T('the feed index lists it',idx.files&&idx.files.halves&&idx.files.halves.n===5,JSON.stringify(idx.files&&idx.files.halves));
console.log(`\n${pass}/${pass+fail} passed`);process.exit(fail?1:0);
