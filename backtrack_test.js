const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ath=(d,s,st)=>({athlete:{displayName:d,shortName:s},stats:st});
const box=(id,a,h,sa,sh,teams)=>({header:{competitions:[{competitors:[{homeAway:'away',team:{abbreviation:a},score:String(sa)},{homeAway:'home',team:{abbreviation:h},score:String(sh)}],status:{period:4,type:{state:'post'}}}]},boxscore:{players:teams}});
const miaKc=box('401','MIA','KC',16,24,[
  {team:{abbreviation:'KC'},statistics:[{name:'passing',labels:['C/ATT','YDS','TD'],athletes:[ath('Patrick Mahomes','P. Mahomes',['19/30','231','2'])]},
    {name:'receiving',labels:['REC','YDS','TD'],athletes:[ath('Travis Kelce','T. Kelce',['5','38','1']),ath('Rashee Rice','R. Rice',['6','72','0'])]},
    {name:'rushing',labels:['CAR','YDS','TD'],athletes:[ath('Kenneth Walker III','K. Walker III',['17','81','1'])]}]},
  {team:{abbreviation:'MIA'},statistics:[{name:'passing',labels:['C/ATT','YDS','TD'],athletes:[ath('Malik Willis','M. Willis',['18/29','167','1'])]},
    {name:'rushing',labels:['CAR','YDS','TD'],athletes:[ath("De'Von Achane",'D. Achane',['12','41','0'])]},
    {name:'receiving',labels:['REC','YDS','TD'],athletes:[ath('Tyquan Thornton','T. Thornton',['2','24','0']),ath('Greg Dulcich','G. Dulcich',['1','9','0'])]}]}]);
const indHou=box('402','IND','HOU',16,24,[
  {team:{abbreviation:'HOU'},statistics:[{name:'receiving',labels:['REC','YDS','TD'],athletes:[ath('Dalton Schultz','D. Schultz',['6','52','0'])]}]},
  {team:{abbreviation:'IND'},statistics:[{name:'receiving',labels:['REC','YDS','TD'],athletes:[ath('Josh Downs','J. Downs',['3','31','0'])]}]}]);
const calls=[];let scoreboardMode='empty';
const liveSB={events:[{id:'402',date:'2026-09-27T17:00Z',competitions:[{status:{type:{state:'post'}},competitors:[{homeAway:'away',team:{abbreviation:'IND'},score:'16'},{homeAway:'home',team:{abbreviation:'HOU'},score:'24'}]}]}]};
function fetcher(u){calls.push(u);
  if(/summary\?event=401/.test(u))return miaKc;if(/summary\?event=402/.test(u))return indHou;
  if(/football\/nfl\/scoreboard/.test(u)){
    if(/dates=\d{8}-\d{8}/.test(u))return{events:[]};                 // range: nothing (what bit us live)
    if(scoreboardMode==='single'&&/week=3/.test(u))return liveSB;  // only the week-based board answers (as on the live site)
    if(/dates=/.test(u))return{events:[]};
    return{events:[]};}
  return{};}
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errors=[];
const seedArc={'w-':{ts:Date.parse('2026-08-30T12:00:00Z'),finals:{'401':{a:16,h:24}},rows:[{id:'401',game:'MIA@KC',v:2}]}};
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=u=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(fetcher(u)),text:()=>Promise.resolve('{}')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-28T22:58:00Z')]))}static now(){return RD.parse('2026-09-28T22:58:00Z')}}w.Date=FD;
  w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
const w=dom.window;
(async()=>{
  await wait(2500);
  w.eval("NFL_SEASON=2026;NFL_WEEK=4");
  w.eval(`set(LS.nflarc,${JSON.stringify(seedArc)})`);
  const L=(pick,player,stat,thr,game)=>({game:game||'MIA@KC',pick,sport:'nfl',gameDate:'2026-09-27',price:null,isProp:1,fbProp:{player,stat,thr,dir:'atleast'}});
  const legs=[L('T. Kelce 40+ Receiving yds','T. Kelce','receiving',40),L('P. Mahomes 175+ Passing yds','P. Mahomes','passing',175),L('Malik Willis 150+ Passing yds','Malik Willis','passing',150),
    L('Kenneth Walker III 60+ Rushing yds','Kenneth Walker III','rushing',60),L('Tyquan Thornton 10+ Receiving yds','Tyquan Thornton','receiving',10),L('Devon Achane 45+ Rushing yds','Devon Achane','rushing',45),
    L('Rashee Rice 35+ Receiving yds','Rashee Rice','receiving',35),L('Greg Dulcich 15+ Receiving yds','Greg Dulcich','receiving',15),
    {game:'MIA@KC',pick:'KC -0.5',sport:'nfl',price:null}];
  const t1={id:1000054317,date:'2026-09-27',source:'mine',name:'Ticket #1000054317',imported:true,stake:'1',toWin:'500',legs};
  const t2={id:999,date:'2026-09-27',source:'mine',archived:true,legs:[L('D. Schultz 40+ Receiving yds','D. Schultz','receiving',40,'IND@HOU'),L('Josh Downs 40+ Receiving yds','Josh Downs','receiving',40,'IND@HOU')]};
  w.eval(`set(LS.locked,${JSON.stringify([t1,t2])})`);
  w.eval(`(()=>{const F=get(LS.allfinals,{});F[finalsKey('nfl','MIA@KC')]={sport:'nfl',a:16,h:24,ts:1};F[finalsKey('nfl','IND@HOU')]={sport:'nfl',a:16,h:24,ts:1};set(LS.allfinals,F);})()`);
  // ── lookup ──
  calls.length=0;
  const id=w.eval("fbpEventId({game:'MIA@KC',sport:'nfl',gameDate:'2026-09-27'},'2026-09-27')");
  T('MIA@KC found in the app\'s own archive — no scoreboard needed',id.id==='401'&&!id.pending,JSON.stringify(id));
  T('archive lookup made zero ESPN calls',!calls.some(u=>/scoreboard/.test(u)));
  const before=w.eval("btUngraded().length");
  T('before: all 10 prop legs sit ungraded',before===10,String(before));
  // ── backtrack ──
  scoreboardMode='single';
  const res=await w.eval('regradeAllProps()');
  T('backtrack grades the old tickets',res&&res.legs===10&&res.left===0,JSON.stringify(res));
  T('one box-score pull per game (2), not per leg (10)',calls.filter(u=>/summary\?event=/.test(u)).length===2,calls.filter(u=>/summary/.test(u)).join(' '));
  T('IND@HOU (not in the archive) found via the week-based scoreboard, date queries empty',calls.some(u=>/seasontype=2&week=3/.test(u)));
  const G=legs.slice(0,8).map(l=>{const g=w.eval(`gradeLeg(${JSON.stringify(l)},'2026-09-27')`);return l.fbProp.player+'='+g.hit+'('+(g.prog?g.prog.val:'')+')';});
  const expect=['T. Kelce=false(38)','P. Mahomes=true(231)','Malik Willis=true(167)','Kenneth Walker III=true(81)','Tyquan Thornton=true(24)','Devon Achane=false(41)','Rashee Rice=true(72)','Greg Dulcich=false(9)'];
  T('every leg on #1000054317 graded against the real box',JSON.stringify(G)===JSON.stringify(expect),G.join(' | '));
  const a2=w.eval(`gradeLeg(${JSON.stringify(t2.legs[0])},'2026-09-27')`),b2=w.eval(`gradeLeg(${JSON.stringify(t2.legs[1])},'2026-09-27')`);
  T('archived ticket graded too (Schultz 52 ✓, Downs 31 ✗)',a2.hit===true&&b2.hit===false);
  T('boxes saved for good (2 finals stored)',Object.keys(w.eval('get(FBP_BOX_KEY,{})')).length===2);
  T('ticket now complete, settles as a loss',w.eval(`ticketIsComplete(get(LS.locked,[])[0])`)===true&&w.eval(`ticketRecord(get(LS.locked,[])[0]).l`)===3);
  calls.length=0;const again=await w.eval('regradeAllProps()');
  T('second run: nothing left, no refetching',again&&again.legs===0&&!calls.some(u=>/summary/.test(u)));
  // ── My Games display ──
  w.eval("tab('mine',null)");await wait(600);
  const mine=w.document.getElementById('mineBody').innerHTML;const txt=mine.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  T('My Games no longer prints each detail twice',!/(MIA 16–24 KC · margin \+8)[^|]*\1/.test(txt),(txt.match(/KC -0\.5[^T]*/)||[''])[0].slice(0,90));
  T('no "100%" glued onto team legs',!/\+8100%|40100%/.test(txt));
  T('prop legs show their progress bars',/38\/40|231\/175/.test(mine));
  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
