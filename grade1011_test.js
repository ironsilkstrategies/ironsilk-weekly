const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
  w.__NO_GRADELOOP__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const box=(state)=>({state,teamStats:{KC:{passing:[{name:'Patrick Mahomes',YDS:'281'}],rushing:[{name:'Isiah Pacheco',YDS:'60'}],receiving:[{name:'Travis Kelce',REC:'6',YDS:'70'},{name:'William Crowder',REC:'3',YDS:'44'}]}}});
  const setBox=st=>w.eval(`(()=>{const S={};S['nfl:777']={ts:Date.now(),final:${st==='post'},box:${JSON.stringify(box(st))}};set(FBP_BOX_KEY,S);FBP_FOUND['nfl|'+fbpGameKey('KC@LV','nfl')+'|2026-10-04']='777';Object.keys(FBP_MEM).forEach(k=>delete FBP_MEM[k]);if(${st!=='post'})FBP_MEM['777']={ts:Date.now(),box:${JSON.stringify(box(st))}};})()`);
  const leg=(player,stat,dir,thr)=>({sport:'nfl',game:'KC@LV',gameDate:'2026-10-04',pick:player+' prop',price:-110,fbProp:{player,stat,dir,thr}});
  setBox('post');
  let g=w.eval(`gradeFBPropLeg(${JSON.stringify(leg('Rashee Rice','receiving','atleast',45))},'2026-10-04')`);
  T('player missing from a FINAL box → leg voided as a push (book rule), not stuck',g.push===true&&g.hit===null&&g.dnp,g.detail);
  g=w.eval(`gradeFBPropLeg(${JSON.stringify(leg('Will Crowder','receiving','atleast',40))},'2026-10-04')`);
  T('name variant (Will vs William) is rescued by unique last name → graded, not voided',g.hit===true&&!g.push,g.detail);
  g=w.eval(`gradeFBPropLeg(${JSON.stringify(leg('Travis Kelce','receptions','atleast',5))},'2026-10-04')`);
  T('normal prop still grades',g.hit===true,g.detail);
  setBox('in');
  g=w.eval(`gradeFBPropLeg(${JSON.stringify(leg('Rashee Rice','receiving','atleast',45))},'2026-10-04')`);
  T('while live a missing player stays open (could still check in)',g.hit===null&&!g.push,g.detail);
  /* frozen settled entry fills its open legs, money untouched */
  w.eval(`(()=>{const F=get(LS.allfinals,{});F[finalsKey('nfl','NYG@WSH')]={sport:'nfl',a:20,h:27,d:'2026-10-11',ts:Date.now()};F[finalsKey('nfl','DEN@LAC')]={sport:'nfl',a:24,h:20,d:'2026-10-11',ts:Date.now()};set(LS.allfinals,F);
    const t={id:'tz',date:'2026-10-11',source:'mine',archived:true,legs:[{sport:'nfl',game:'NYG@WSH',pick:'NYG +6',gameDate:'2026-10-11',price:-110},{sport:'nfl',game:'DEN@LAC',pick:'Over 40',gameDate:'2026-10-11',price:-110}]};
    set(LS.locked,[t]);const S={};S.tz={id:'tz',d:'2026-10-11',src:'mine',n:2,w:0,l:1,p:0,won:false,push:false,stake:5,profit:-5,legs:[{g:'NYG@WSH',pk:'NYG +6',h:'L'},{g:'DEN@LAC',pk:'Over 40',h:null}],at:1,v:1};set(SETTLED_KEY,S);})()`);
  w.eval('settledSync(true)');const e=w.eval(`settledAll().tz`);
  T('archived ticket: the leg left open at freeze is filled in once the final lands',e.legs[1].h==='W'&&e.w===1&&e.l===1,JSON.stringify(e.legs));
  T('…and its money/result never change',e.profit===-5&&e.won===false&&e.stake===5);
  /* the sweeper now looks at open legs on frozen tickets */
  w.eval(`(()=>{const L=get(LS.locked,[]);L[0].legs.push({sport:'nfl',game:'BAL@ATL',pick:'Over 41.5',gameDate:'2026-10-01',price:-110});set(LS.locked,L);})()`);
  T('sweeper includes an open leg on a frozen archived ticket',w.eval(`sweepOverdue().some(x=>x.t.id==='tz'&&x.l.game==='BAL@ATL')`));
  /* overdue the moment ESPN says final */
  w.eval(`window.mgEventFor=()=>({state:'post',start:new Date(Date.now()-3600e3).toISOString(),a:1,h:2})`);
  T('same-day leg is overdue as soon as ESPN calls the game final (not 5h later)',w.eval(`legOverdue({sport:'nfl',game:'X@Y',gameDate:today(),pick:'Y ML'},{date:today()})`));
  w.eval(`window.mgEventFor=()=>({state:'in',start:new Date(Date.now()-3600e3).toISOString()})`);
  T('a game in progress for 1h is not overdue',!w.eval(`legOverdue({sport:'nfl',game:'X@Y',gameDate:today(),pick:'Y ML'},{date:today()})`));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
