const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=u=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;
  w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-28T15:00:00Z')]))}static now(){return RD.parse('2026-09-28T15:00:00Z')}}w.Date=FD;
  w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
const w=dom.window;
(async()=>{
  await wait(2500);
  // Today's card with priced picks across sports (what the boards snapshot each morning)
  const P=(sp,game,m,sd,pick,price,color,rank,rules,chars)=>({sp,game,m,sd,pick,price,color,rank,rules:rules||[],chars:chars||['Sim','Judge','Coach','Pred']});
  w.eval(`set(TC_KEY,{d:today(),by:{
    nfl:{ts:Date.now(),picks:[${JSON.stringify(P('nfl','PHI@CHI','spread','home','CHI +3.5',-108,' supreme',5,[{icon:'🔑',kind:'principle',text:'+3.5 is past 3'}]))},
      ${JSON.stringify(P('nfl','LAC@BUF','ml','home','BUF ML',-150,' strong',4.2))},${JSON.stringify(P('nfl','DAL@NYG','total','over','Over 44.5',-110,'value',3,[{icon:'💰',kind:'principle',text:'sharp split'}]))}],props:[]},
    nhl:{ts:Date.now(),picks:[${JSON.stringify(P('nhl','CHI@VGK','ml','away','CHI ML',208,' strong',3.8))},${JSON.stringify(P('nhl','FLA@CAR','total','under','Under 6.5',-125,'source',2.5,[],['Sim']))}],props:[]}}})`);
  // ── build today's ticket from the card ──
  const b3=w.eval('msBuildTicket(3,Math.pow(americanToDecimal(-110),3))');
  T('builds a 3-leg ticket, one leg per game',b3.best&&b3.best.legs.length===3&&new Set(b3.best.legs.map(x=>x.game)).size===3);
  T('the built ticket clears the +596 bar',b3.best.ok&&b3.best.d>=6.96,w.eval(`decimalToAmerican(${b3.best.d})`)+' · '+b3.best.legs.map(x=>x.pick).join(' + '));
  const b2=w.eval('msBuildTicket(2,Math.pow(americanToDecimal(-110),2))');
  T('2-leg build prefers the strongest pair that still clears +264',b2.best.ok&&b2.best.legs.map(x=>x.pick).includes('CHI +3.5'),b2.best.legs.map(x=>x.pick).join(' + '));
  const hard=w.eval('msBuildTicket(2,50)');
  T('when nothing clears the bar it says so (longest available shown)',hard.best&&!hard.best.ok);
  // ── heist mission ──
  w.eval("msStart('heist')");const m=w.eval('msAll()[0]');
  T('The Heist: $20 → $5,000 in 30 days, routed to the safe-house plan',m.goal===5000&&m.routeKey==='heist|3|');
  const cps=w.eval('msCheckpoints(msAll()[0])');
  T('six checkpoints from The Corner to The Vault, last = the goal',cps.length===6&&cps[0].name==='The Corner'&&cps[5].name==='The Vault'&&cps[5].amt===5000,cps.map(c=>c.name+' $'+c.amt).join(', '));
  const O=w.eval('msOrders(msAll()[0])');
  T("today's orders: all $20 on a 3-team parlay at +596 or longer",O.lanes[0].stake===20&&O.lanes[0].k===3&&w.eval(`decimalToAmerican(${O.lanes[0].minDec})`)==='+596');
  const R=w.eval('msRoutes(msAll()[0])');
  T('route planner simulates every route and ranks them by finish %',R.length>=15&&R.every((r,i)=>i===0||R[i-1].p>=r.p),R.length+' routes');
  T('simulation is repeatable (seeded)',JSON.stringify(R.map(r=>r.p))===JSON.stringify(w.eval('(()=>{Object.keys(MS_PLAN_CACHE).forEach(k=>delete MS_PLAN_CACHE[k]);return msRoutes(msAll()[0]).map(r=>r.p)})()')));
  const L_={dec:w.eval('americanToDecimal(-110)'),p:0.5};const sim=w.eval(`msSimPots([{route:'snowball',cfg:{k:2},bal:100,start:100,L:${JSON.stringify(L_)}}],300,30,4000,42)`);
  T('sim math checks out: one 2-team win at 50%/leg = 25%',Math.abs(sim.p-0.25)<0.025&&Math.abs(sim.bust-0.75)<0.025,sim.p.toFixed(3));
  const st=w.eval(`msSimPots([{route:'stairs',cfg:{k:2,f:.25},bal:200,start:200,L:${JSON.stringify(L_)}}],2500,30,3000,7)`);
  T('stair-step busts far less than snowball',st.bust<0.5,JSON.stringify(st));
  // ── attach + side quests + safe house ──
  w.eval(`set(LS.locked,[{id:701,date:today(),source:'mine',name:'Heist day 1',imported:true,stake:'20',toWin:'119.20',
    legs:[{game:'PHI@CHI',pick:'CHI +3.5',sport:'nfl',price:-108},{game:'LAC@BUF',pick:'BUF ML',sport:'nfl',price:-150},{game:'CHI@VGK',pick:'CHI ML',sport:'nhl',price:208}]}])`);
  const tk=w.eval("get(LS.locked,[])[0]");
  const q=id=>w.eval(`msCheckQuest({id:'${id}'},${JSON.stringify(tk)})`);
  T('Gold Rush: every leg SUPREME/STRONG ✓',q('gold')===true);
  T('Key Master: CHI +3.5 past the 3 ✓',q('key')===true);
  T('World Tour: NFL + NHL ✓',q('cross')===true);
  T('Follow the Money: no sharp-split leg ✗',q('money')===false);
  const todays=w.eval('msQuestsToday(msAll()[0])').map(x=>x.id);
  w.eval(`msAttach(msAll()[0].id,{value:'701'})`);const m2=w.eval('msAll()[0]');
  const expXP=w.eval('msQuestsToday(msAll()[0])').filter(x=>x.id!=='clv'&&w.eval(`msCheckQuest({id:'${x.id}'},${JSON.stringify(tk)})`)).reduce((a,x)=>a+x.xp,0);
  T("attaching scores today's two side quests into XP",m2.xp===expXP&&m2.steps[0].quests.length===2,`quests ${todays.join('+')} → ${m2.xp} XP`);
  w.eval(`(()=>{const F=get(LS.allfinals,{});F[finalsKey('nfl','PHI@CHI')]={sport:'nfl',a:20,h:21,ts:1};F[finalsKey('nfl','LAC@BUF')]={sport:'nfl',a:16,h:24,ts:1};F[finalsKey('nhl','CHI@VGK')]={sport:'nhl',a:4,h:2,ts:1};set(LS.allfinals,F);})()`);
  const m3=w.eval('msSync()[0]');
  T('heist win: 25% of the $119.20 profit ($29.80) goes to the safe house',m3.safe===29.8&&m3.balance===109.4,`balance ${m3.balance} safe ${m3.safe}`);
  T('rank from XP',w.eval('msRank(520).name')==='Hustler'&&w.eval('msRank(0).name')==='Rookie'&&w.eval('msRank(5000).name')==='Kingpin');
  // ── stairs + two-lane orders ──
  w.eval("msStart('grind')");const g=w.eval('msOrders(msAll()[1])');
  T('$200 grind: stake $50 (25%) on a 2-team parlay at +264 or longer',g.lanes[0].stake===50&&g.lanes[0].k===2&&w.eval(`decimalToAmerican(${g.lanes[0].minDec})`)==='+264');
  w.eval(`(()=>{const A=msAll();A[1].routeKey='twolane||';msSave(A);})()`);const tl=w.eval('msOrders(msAll()[1])');
  T('two-lane: $24 anchor (2-leg) + $16 moonshot (4-leg) = 20% of $200',tl.lanes.length===2&&tl.lanes[0].stake===24&&tl.lanes[1].stake===16&&tl.lanes[1].k===4);
  // ── the Money tab ──
  w.eval("tab('money',null)");await wait(300);const mb=w.document.getElementById('moneyBody').innerHTML;
  T("Money tab: rank, TODAY'S ORDERS, built legs, side quests, route planner, map",/RANK/.test(mb)&&/TODAY'S ORDERS/.test(mb)&&/Built from Today's card/.test(mb)&&/SIDE QUESTS/.test(mb)&&/Route planner/.test(mb)&&/The Vault/.test(mb));
  T('safe house shown on the heist card',/safe <b[^>]*>\$29\.80/.test(mb));
  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
