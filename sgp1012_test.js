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
  w.__T=TXT;w.eval(`set(LS.locked,[]);set('d4.nflgames',{'2026w5':{v:[{id:'401872994',away:{abbr:'BUF'},home:{abbr:'LAR'},date:'2026-10-13T00:15Z'}]}});`);
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
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
