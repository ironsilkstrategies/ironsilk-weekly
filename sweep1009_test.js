const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const asked=[];
/* ESPN: NHL finals on Aug 20 (50 days back — past the old 30-day limit) and Oct 8; one game listed under other abbreviations */
const ev=(id,d,a,h,sa,sh)=>({id,date:d+'T23:00:00Z',status:{type:{state:'post',shortDetail:'Final'}},competitions:[{competitors:[{homeAway:'away',score:String(sa),team:{abbreviation:a,displayName:a}},{homeAway:'home',score:String(sh),team:{abbreviation:h,displayName:h}}]}]});
const SB={'20260820':[ev('1','2026-08-20','NYR','WSH',2,4)],'20261008':[ev('2','2026-10-08','PIT','CBJ',3,2),ev('3','2026-10-08','LAK','SJS',1,5)]};
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-09T19:30:00Z')]))}static now(){return RD.parse('2026-10-09T19:30:00Z')}}w.Date=FD;
  w.__NO_GRADELOOP__=true;
  w.fetch=u=>{u=String(u);const m=u.match(/hockey\/nhl\/scoreboard\?dates=(\d{8})/);if(m){asked.push(m[1]);return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({events:SB[m[1]]||[]})});}
    return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  const L=[{id:'old',date:'2026-08-20',source:'mine',legs:[{sport:'nhl',game:'NYR@WSH',pick:'WSH ML',price:-140,gameDate:'2026-08-20'}]},
           {id:'y1',date:'2026-10-08',source:'mine',legs:[{sport:'nhl',game:'PIT@CBJ',pick:'PIT ML',price:101,gameDate:'2026-10-08'},{sport:'nhl',game:'PIT@CBJ',pick:'Under 6.5',price:-106,gameDate:'2026-10-08'}]},
           {id:'rk',date:'2026-10-08',source:'mine',legs:[{sport:'nhl',game:'LA@SJ',pick:'SJ ML',price:-120,gameDate:'2026-10-08'}]},
           {id:'tdy',date:'2026-10-09',source:'mine',legs:[{sport:'nhl',game:'ANA@WPG',pick:'WPG ML',price:-121,gameDate:'2026-10-09'}]}];
  w.eval(`set(LS.locked,${JSON.stringify(L)})`);
  T('before: 4 overdue legs (tonight\'s game is not overdue)',w.eval('sweepOverdue().length')===4,String(w.eval('sweepOverdue().length')));
  const H=JSON.parse(JSON.stringify(await w.eval('gradeSweep({force:true})')));
  T('the sweeper asked ESPN for Aug 20 (50 days back — past the old 30-day limit)',asked.includes('20260820'),asked.join(','));
  const g=(tid,i)=>w.eval(`(()=>{const t=get(LS.locked,[]).find(x=>x.id==='${tid}');return JSON.stringify(gradeLeg(t.legs[${i}],t.date))})()`);
  T('50-day-old leg graded (WSH 4-2 → won)',JSON.parse(g('old',0)).hit===true,g('old',0));
  T('yesterday\'s legs graded (PIT 3-2 won; 5 goals under 6.5 won)',JSON.parse(g('y1',0)).hit===true&&JSON.parse(g('y1',1)).hit===true);
  T('a matchup ESPN lists under other abbreviations is re-keyed and graded (LAK@SJS)',JSON.parse(g('rk',0)).hit===true,w.eval(`get(LS.locked,[]).find(x=>x.id==='rk').legs[0].game`)+' '+g('rk',0));
  T('nothing overdue left; tonight\'s game still pending',H.left.length===0&&w.eval('sweepOverdue().length')===0,JSON.stringify(H.left).slice(0,200));
  T('settled tickets are frozen in the permanent ledger',w.eval(`(()=>{const S=settledAll();return !!(S.old&&S.y1&&S.rk)&&!S.tdy})()`));
  /* a leg it truly can't grade is reported with the reason, on every page */
  w.eval(`(()=>{const L=get(LS.locked,[]);L.push({id:'bad',date:'2026-10-08',source:'mine',legs:[{sport:'nhl',game:'PIT@CBJ',pick:'Crosby anytime goal???',price:200,gameDate:'2026-10-08'}]});set(LS.locked,L);})()`);
  const H2=JSON.parse(JSON.stringify(await w.eval('gradeSweep({force:true})')));
  T('an unreadable leg is listed with its reason',H2.left.length===1&&/couldn't be read|set the result/.test(H2.left[0].msg),H2.left[0]&&H2.left[0].msg);
  const b=w.document.getElementById('gradeBanner');
  T('…and a banner with one-tap Won/Lost/Push shows on the page',!!b&&/1 leg past game day/.test(b.textContent)&&/Won/.test(b.innerHTML));
  w.eval(`legSetManual('bad',0,'lost')`);await w.eval('gradeSweep({force:true})');
  T('setting it clears the banner',!w.document.getElementById('gradeBanner'));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
