const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const d=w.eval('today()');
  const V=[['Judge','spread',true,0.91],['Judge','spread',true,0.91],['Judge','ml',false,-1],['Judge','total',null,0],['Judge','total',undefined],['Coach','ml',true,0.5],['Coach','spread',false,-1]];
  w.eval(`set(VOICES_KEY,${JSON.stringify(V.map(([v,m,h,u],i)=>({id:'c'+i,voice:v,sp:i===5?'ncaaf':'nfl',date:d,game:'A@B',market:m,side:'home',graded:h!==undefined,hit:h===undefined?null:h,units:u})))});
    set(CPROP_KEY,[{id:'p1',voice:'Judge',sp:'nfl',player:'X',k:'rec',thr:4,d:today(),hit:true},{id:'p2',voice:'Judge',sp:'nfl',player:'Y',k:'wy',thr:60,d:today(),hit:false},{id:'p3',voice:'Coach',sp:'nfl',player:'Z',k:'rec',thr:5,d:today(),hit:null}]);`);
  const L=w.eval(`charDayRecord(today(),'all')`);const J=L.find(o=>o.v==='Judge'),C=L.find(o=>o.v==='Coach');
  T('Judge: ATS 2-0, ML 0-1, O/U push + 1 pending, props 1-1',J.by.spread.w===2&&J.by.ml.l===1&&J.by.total.p===1&&J.by.total.pend===1&&J.by.prop.w===1&&J.by.prop.l===1,JSON.stringify(J.by));
  T('Coach: ML 1-0, ATS 0-1, a prop pending',C.by.ml.w===1&&C.by.spread.l===1&&C.by.prop.pend===1);
  T('day total and units (props not priced)',J.w===3&&J.l===2&&J.p===1&&Math.abs(J.u-0.82)<1e-9);
  const h=w.eval(`charDayHtml('all')`).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  T('scoreboard columns ATS · ML · O/U · Props · day · units',/character ATS ML O\/U Props day units/.test(h)&&/2-0/.test(h)&&/\+0\.82u/.test(h),h.slice(0,260));
  T('sport filter',w.eval(`charDayRecord(today(),'ncaaf')`).length===1);
  const H=w.eval(`charDayHtml('all')`);T('all sports combined, then each sport broken out',/All sports/.test(H)&&/>🏈 NFL</.test(H.replace(/<summary[^>]*>/g,'>'))&&/CFB/.test(H)&&(H.match(/<table/g)||[]).length===3,(H.match(/<table/g)||[]).length+' tables');
  /* the ledger repair: an early copy moves to game day, a duplicate and a post-game call are dropped */
  w.eval(`(()=>{const F=get(LS.allfinals,{});F[finalsKey('ncaaf','AAA@BBB')]={sport:'ncaaf',a:10,h:20,d:dayShift(today(),-2)};set(LS.allfinals,F);
    const V=get(VOICES_KEY,[]);const g=dayShift(today(),-2);
    V.push({id:'ncaaf|AAA@BBB|'+dayShift(g,-4)+'|Sim|ml',sp:'ncaaf',game:'AAA@BBB',date:dayShift(g,-4),voice:'Sim',market:'ml',side:'home',price:-150});
    V.push({id:'ncaaf|AAA@BBB|'+dayShift(g,-3)+'|Sim|ml',sp:'ncaaf',game:'AAA@BBB',date:dayShift(g,-3),voice:'Sim',market:'ml',side:'away',price:120});
    V.push({id:'ncaaf|AAA@BBB|'+dayShift(g,1)+'|Sim|total',sp:'ncaaf',game:'AAA@BBB',date:dayShift(g,1),voice:'Sim',market:'total',side:'over',line:25,price:-110});
    set(VOICES_KEY,V);})()`);
  const n=w.eval('voicesRepairDates(true)');w.eval('gradeVoices()');
  const left=w.eval(`get(VOICES_KEY,[]).filter(x=>x.game==='AAA@BBB')`);
  T('stranded copies: the latest pre-game call moves to game day and grades, the older copy and the post-game call are dropped',n===3&&left.length===1&&left[0].side==='away'&&left[0].date===w.eval('dayShift(today(),-2)')&&left[0].graded&&left[0].hit===false,JSON.stringify(left.map(x=>[x.date,x.side,x.graded,x.hit])));
  T('new calls are dated by the game, not the day they were logged',/const d=g\.__date\|\|gd\|\|today\(\)/.test(w.eval('characterCalls.toString()')));
  w.eval('cdayStep(-1)');T('‹ steps back a day',w.eval('CDAY_D')===w.eval('dayShift(today(),-1)'));w.eval('cdayStep(1)');w.eval('cdayStep(1)');T('› stops at today',w.eval('CDAY_D')===d);
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
