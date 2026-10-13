const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
const TXT=`Ticket Number:
1004800415
Accepted Date:
10/12/26
Amount:
$5.00
Status:
Pending
To win:
$400.00
Type:
Same Game Parlay
Description:
FOOTBALL - NFL - Los Angeles Rams v Buffalo Bills
Player TDs - James Cook Score anytime (Game)
Player TDs - Josh Allen Score anytime (Game)
Player stats - James Cook 60+ Rushing yds (Game)
Player TDs - Keon Coleman Score anytime (Game)
Player stats - G. Rousseau 1+ Sacks made (Game)
Player stats - Khalil Shakir 35+ Receiving yds (Game)
Player stats - Keon Coleman 25+ Receiving yds (Game)
Spread - Bills +7.5 (Game)`;
setTimeout(async()=>{try{
  w.__T=TXT;w.eval(`set(LS.locked,[]);set('d4.nflgames',{'2026w5':{v:[{id:'401872994',away:{abbr:'BUF'},home:{abbr:'LAR'},date:'2026-10-12T19:15:00-05:00'}]}});`);
  const r=await w.eval(`intakeText(window.__T,null,'auto','')`);
  const t=w.eval(`get(LS.locked,[])[0]`);
  T('a single-game SGP paste (no "SGP 1:" line) is read: all 8 legs',t&&t.legs.length===8,r.how);
  T('stake and to-win carried, game oriented BUF@LAR',t.stake==='5'&&t.toWin==='400'&&t.legs.every(l=>l.game==='BUF@LAR'));
  T('anytime TDs, sacks, yards and the spread all understood',t.legs.filter(l=>l.fbProp&&l.fbProp.stat==='td').length===3&&t.legs.some(l=>l.fbProp&&l.fbProp.stat==='sacks')&&t.legs.some(l=>l.pick==='BUF +7.5'));
  /* grading from an ESPN-shaped box */
  const cat=(name,labels,rows)=>({name,labels,athletes:rows.map(([n,s])=>({athlete:{displayName:n,shortName:n.replace(/^(\w)\w+ /,'$1. ')},stats:s}))});
  const J={header:{competitions:[{status:{type:{state:'post'}}}]},boxscore:{players:[{team:{abbreviation:'BUF'},statistics:[
    cat('passing',['C/ATT','YDS','AVG','TD','INT','SACKS','QBR','RTG'],[['Josh Allen',['22/31','270','8.7','3','0','2-12','70','120']]]),
    cat('rushing',['CAR','YDS','AVG','TD','LONG'],[['James Cook',['18','74','4.1','1','15']],['Josh Allen',['6','30','5','0','9']]]),
    cat('receiving',['REC','YDS','AVG','TD','LONG','TGTS'],[['Khalil Shakir',['5','41','8.2','0','12','6']],['Keon Coleman',['3','22','7.3','1','10','5']]]),
    cat('defensive',['TOT','SOLO','SACKS','TFL','PD','QB HTS','TD'],[['Gregory Rousseau',['4','3','1.5','2','0','3','0']]])]}]}};
  const box=w.eval(`fbpParseBox(${JSON.stringify(J)})`);
  T('box parser keeps the defensive table',!!(box.teamStats.BUF.defensive||[]).length);
  const g=(pl,stat,thr)=>w.eval(`gradeFBSpecialProp({fbProp:{player:'${pl}',stat:'${stat}',thr:${thr},dir:'atleast'}},${JSON.stringify(box)},null)`);
  T('anytime TD: rushing TD counts (Cook ✓)',g('James Cook','td',1).hit===true);
  T('anytime TD: a QB\'s passing TDs don\'t (Allen ✗ with 3 passing, 0 rushing)',g('Josh Allen','td',1).hit===false);
  T('anytime TD: receiving TD counts (Coleman ✓)',g('Keon Coleman','td',1).hit===true);
  T('sacks: "G. Rousseau" finds Gregory Rousseau, 1.5 sacks clears 1+',g('G. Rousseau','sacks',1).hit===true,JSON.stringify(g('G. Rousseau','sacks',1)));
  /* v2.23: the second ticket — passing TDs thrown */
  w.__T2=`Ticket Number:
1004799266
Accepted Date:
10/12/26
Amount:
$6.00
Status:
Pending
To win:
$72.00
Type:
Same Game Parlay
Description:
FOOTBALL - NFL - Los Angeles Rams v Buffalo Bills
Player TDs - Puka Nacua Score anytime (Game)
Player stats - Josh Allen over 1.5 Passing TDs thrown (Game)
Player TDs - D. Adams Score anytime (Game)
Player stats - Puka Nacua 100+ Receiving yds (Game)
Player stats - Blake Corum 30+ Rushing yds (Game)
Total points - Over 48.5 (Game)`;
  const r2=await w.eval(`intakeText(window.__T2,null,'auto','')`);const t2=w.eval(`get(LS.locked,[]).find(x=>x.id==='ext1004799266')`);
  T('ticket 2: all 6 legs, including "Josh Allen over 1.5 Passing TDs thrown"',t2&&t2.legs.length===6&&t2.legs.some(l=>l.pick==='Josh Allen over 1.5 passing TDs'),r2.how);
  const gg=(pl,stat,thr,dir)=>w.eval(`gradeFBSpecialProp({fbProp:${JSON.stringify(Object.assign({player:pl,thr,dir},stat))}},${JSON.stringify(box)},null)`);
  T('passing TDs: Allen 3 thrown clears over 1.5',gg('Josh Allen',{stat:'gen',cat:'passing',field:'TD',label:'passing TDs'},1.5,'over').hit===true);
  T('completions read from C/ATT (22/31 → 22)',gg('Josh Allen',{stat:'gen',cat:'passing',field:'C/ATT',part:0,label:'completions'},20.5,'over').hit===true);
  T('tackles from the defensive table (Rousseau 4 tackles, under 3.5 loses)',gg('G. Rousseau',{stat:'gen',cat:'defensive',field:'TOT',label:'tackles'},3.5,'under').hit===false);
  T('stat phrases map: carries, longest reception, tackles + assists, INTs thrown',w.eval(`['Carries','Longest Reception','Tackles + Assists','Interceptions thrown'].every(x=>!!fbGenStat(x))`)&&w.eval(`fbGenStat('Interceptions thrown').cat`)==='passing'&&w.eval(`fbGenStat('Interceptions').cat`)==='ints');
  w.__T3=`Ticket Number:
1003279121
Accepted Date:
10/7/26
Amount:
$5.00
Status:
Pending
To win:
$45.00
Type:
Same Game Parlay
Description:
FOOTBALL - NFL - Los Angeles Rams v Buffalo Bills
Player TDs - Josh Allen Score anytime (Game)
Player stats - James Cook over 75.5 Rushing yds (Game)
Player stats - Josh Allen over 36.5 Rushing yds (Game)
Player stats - Josh Allen over 20.5 Pass completions (Game)`;
  const r3=await w.eval(`intakeText(window.__T3,null,'auto','')`);const t3=w.eval(`get(LS.locked,[]).find(x=>x.id==='ext1003279121')`);
  T('ticket 3: all 4 legs incl. "over 20.5 Pass completions", BUF@LAR, $5 to win $45',t3&&t3.legs.length===4&&t3.legs.some(l=>/completions/.test(l.pick)&&l.fbProp.part===0)&&t3.legs.every(l=>l.game==='BUF@LAR')&&t3.stake==='5'&&t3.toWin==='45',r3.how);
  T('bet on 10/7 for the 10/12 game: legs carry the game\'s own date',t3.legs.every(l=>l.gameDate==='2026-10-12'&&!l.gdApprox),JSON.stringify(t3.legs.map(l=>l.gameDate)));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
