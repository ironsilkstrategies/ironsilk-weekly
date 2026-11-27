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
  const P=(sp,game,m,sd,pick,price,color,rank,rules,chars)=>({sp,game,m,sd,pick,price,color,rank,rules:rules||[],chars:chars||['Sim','Judge','Coach','Pred','Trends']});
  w.eval(`set(TC_KEY,{d:today(),by:{
    nfl:{ts:1,picks:[${JSON.stringify(P('nfl','PHI@CHI','spread','home','CHI +3.5',-108,' supreme',5,[{icon:'🔑',kind:'principle',text:'+3.5 is past 3'}]))},
      ${JSON.stringify(P('nfl','LAC@BUF','ml','home','BUF ML',-150,' strong',4.2,[],['Sim','Coach']))},${JSON.stringify(P('nfl','DAL@NYG','total','under','Under 44.5',-110,'value',3,[{icon:'💰',kind:'principle',text:'sharp split'}]))},
      ${JSON.stringify(P('nfl','KC@DEN','ml','away','KC ML',-200,' strong',3.9))}],props:[]},
    nhl:{ts:1,picks:[${JSON.stringify(P('nhl','CHI@VGK','ml','away','CHI ML',208,' strong',3.8))},${JSON.stringify(P('nhl','FLA@CAR','ml','away','FLA ML',109,'source',2.5,[],['Sim']))},
      ${JSON.stringify(P('nhl','NYR@BOS','total','under','Under 5.5',113,' strong',3.1))}],props:[]}}})`);
  // ── the library ──
  const lib=w.eval('MS_LIB.length'),cats=w.eval('Object.keys(MS_CATS)');
  const perCat=cats.map(c=>[c,w.eval(`MS_LIB.filter(r=>r[1]==='${c}').length`)]);
  T('50+ missions on the board',lib>=50,lib+' missions');
  T('9 categories, 5+ missions each',cats.length===9&&perCat.every(x=>x[1]>=5),perCat.map(x=>x.join(':')).join(' '));
  T('penny missions: $1 → $1,000 and $5 → $500 exist',w.eval("!!MS_TEMPLATES.dollar_grand&&MS_TEMPLATES.dollar_grand.start===1&&MS_TEMPLATES.dollar_grand.goal===1000&&MS_TEMPLATES.five_hundred.start===5&&MS_TEMPLATES.five_hundred.goal===500"));
  // ── house money: small until you're up, then only profit rides ──
  const hm=(b,start)=>w.eval(`msStakeFor('housemoney',{k:3,f:.4,unit:1},${b},${start})`);
  T('house money: $5 roll bets $1 while it\'s your money',hm(5,5)===1&&hm(3,5)===1);
  T('house money: at $25 (up $20) the stake is $1 + 40% of profit = $9',hm(25,5)===9);
  T('drip: fixed $1 no matter the balance',w.eval("msStakeFor('drip',{k:6,unit:1},40,10)")===1);
  T('compound: 10% of the balance',w.eval("msStakeFor('compound',{k:1,f:.1},250,100)")===25);
  // ── start a $1 → $1,000 ──
  w.eval("msStart('dollar_grand')");let m=w.eval('msAll()[0]');
  T('$1 → $1,000 starts with a difficulty from the simulation',!!m.diff&&m.p0>=0,m.diff+' · '+(m.p0*100).toFixed(2)+'%');
  const o=w.eval('msOrders(msAll()[0])');
  T('first order: $1 on a 4-team parlay at +1,229 or longer (rounded toward the price you can hit)',o.lanes[0].stake===1&&o.lanes[0].k===4&&w.eval(`decimalToAmerican(${o.lanes[0].minDec})`)==='+1229',JSON.stringify([o.lanes[0].stake,o.lanes[0].k,w.eval(`decimalToAmerican(${o.lanes[0].minDec})`)]));
  // ── rules steer the builder ──
  const dogs=w.eval("msBuildTicket(2,Math.pow(2.4,2),'dogs',null)");
  T('Dog Pound builds only plus-money legs',dogs.best&&dogs.best.legs.every(x=>x.price>0),dogs.best&&dogs.best.legs.map(x=>x.pick+' '+x.price).join(' + '));
  const judge=w.eval("msBuildTicket(2,1,'judge',null)");
  T("Judge's Court skips legs without the Judge (BUF ML)",judge.best&&!judge.best.legs.some(x=>x.pick==='BUF ML'));
  const nhlOnly=w.eval("msBuildTicket(2,1,null,'nhl')");
  T('Hockey Night uses NHL legs only',nhlOnly.best&&nhlOnly.best.legs.every(x=>x.sp==='nhl'));
  const cross=w.eval("msBuildTicket(2,1,'cross',null)");
  T('World Tour tickets always span 2 sports',cross.best&&new Set(cross.best.legs.map(x=>x.sp)).size===2);
  const chalk=w.eval("msBuildTicket(1,1,'chalk',null)");
  T('Chalk Walk singles are favorites -130 or shorter',chalk.best&&chalk.best.legs[0].price<=-130,chalk.best&&chalk.best.legs[0].pick);
  // ── rule check on the ticket you attach ──
  w.eval("msStart('dog_pound')");
  w.eval(`set(LS.locked,[{id:801,date:today(),source:'mine',imported:true,stake:'1',toWin:'3',legs:[{game:'CHI@VGK',pick:'CHI ML',sport:'nhl',price:208},{game:'LAC@BUF',pick:'BUF ML',sport:'nfl',price:-150}]},
    {id:802,date:today(),source:'mine',imported:true,stake:'1',toWin:'5',legs:[{game:'CHI@VGK',pick:'CHI ML',sport:'nhl',price:208},{game:'FLA@CAR',pick:'FLA ML',sport:'nhl',price:109}]}])`);
  w.eval(`msAttach(msAll()[1].id,{value:'801'})`);w.eval(`msAttach(msAll()[1].id,{value:'802'})`);
  const dp=w.eval('msAll()[1]');
  T('breaking the rule is flagged on the step (BUF ML is chalk)',dp.steps[0].rule.ok===false&&/BUF ML/.test(dp.steps[0].rule.why),dp.steps[0].rule.why);
  T('following the rule passes',dp.steps[1].rule.ok===true);
  // ── multi-bankroll ──
  w.eval("msStart('three_pockets')");m=w.eval('msAll()[2]');
  T('Three Pockets splits $30 into $15 / $9 / $6',m.pots.map(p=>p.balance).join('/')==='15/9/6');
  const po=w.eval('msAll()[2].pots.map(P=>msPotOrders(msAll()[2],P).map(L=>[L.stake,L.k]))');
  T('each pot gets its own orders: Safe 10% single, Grind 25% 2-leg, Moon $1 4-leg',JSON.stringify(po)===JSON.stringify([[[1.5,1]],[[2.5,2]],[[1,4]]]),JSON.stringify(po));
  w.eval(`(()=>{const L=get(LS.locked,[]);L.push({id:803,date:today(),source:'mine',imported:true,stake:'1',toWin:'12',legs:[{game:'CHI@VGK',pick:'CHI ML',sport:'nhl',price:208},{game:'FLA@CAR',pick:'FLA ML',sport:'nhl',price:109}]});set(LS.locked,L);})()`);
  w.eval(`msAttach(msAll()[2].id,{value:'803'},2)`);
  w.eval(`(()=>{const F=get(LS.allfinals,{});F[finalsKey('nhl','CHI@VGK')]={sport:'nhl',a:4,h:2,d:today(),ts:Date.now()};F[finalsKey('nhl','FLA@CAR')]={sport:'nhl',a:3,h:1,d:today(),ts:Date.now()};set(LS.allfinals,F);})()`);
  const s3=w.eval('msSync()[2]');
  T('a Moon win moves only the Moon pot ($6 − $1 + $13 = $18), mission total $42',s3.pots[2].balance===18&&s3.pots[0].balance===15&&s3.pots[1].balance===9&&s3.balance===42,s3.pots.map(p=>p.balance).join('/')+' = '+s3.balance);
  // ── elevator banks half at a checkpoint ──
  w.eval("msStart('elevator')");const eid=w.eval('msAll()[3].id');
  w.eval(`(()=>{const L=get(LS.locked,[]);L.push({id:804,date:today(),source:'mine',imported:true,stake:'10',toWin:'59.6',legs:[{game:'CHI@VGK',pick:'CHI ML',sport:'nhl',price:208}]});set(LS.locked,L);})()`);
  w.eval(`msAttach(${eid},{value:'804'})`);const el=w.eval('msSync()[3]');
  T('Elevator: $10 → $69.60 passes The Corner ($22) and Chop Shop ($46) → half banked twice',Math.abs(el.safe-52.2)<0.01&&Math.abs(el.balance-17.4)<0.01,`balance ${el.balance} safe ${el.safe}`);
  // ── completing a mission pays XP by difficulty, bonus for a clean run ──
  w.eval("msStart('rule_72')");const rid=w.eval('msAll()[4].id');const diff=w.eval('msAll()[4].diff');
  w.eval(`(()=>{const L=get(LS.locked,[]);L.push({id:805,date:today(),source:'mine',imported:true,stake:'50',toWin:'60',legs:[{game:'CHI@VGK',pick:'CHI ML',sport:'nhl',price:208}]});set(LS.locked,L);})()`);
  const xp0=w.eval('msAll()[4].xp');w.eval(`msAttach(${rid},{value:'805'})`);const done=w.eval('msSync()[4]');
  const base=w.eval(`MS_DIFF.find(d=>d[1]==='${diff}')[3]`);
  T('mission complete → XP for its difficulty + clean-run bonus',done.status==='won'&&done.clean&&done.xp-xp0>=base*1.5,`${diff}: +${done.xp-xp0} XP`);
  // ── the board ──
  w.eval("tab('money',null)");await wait(300);let mb=w.document.getElementById('moneyBody').innerHTML;
  T('Money tab: mission board with categories and Start buttons (opens on Warm-ups)',/Mission board · 1\d\d/.test(mb)&&/Penny stocks/.test(mb)&&/Warm-ups/.test(mb)&&/First Win/.test(mb)&&/Start/.test(mb));
  T('board shows difficulty + finish % per mission',/(EASY|MEDIUM|HARD|LEGENDARY) · [\d.]+%/.test(mb));
  T("header totals today's stakes across running missions",/today's stakes across missions/.test(mb));
  w.eval("MS_CAT='multi';msRender()");mb=w.document.getElementById('missionsBody').innerHTML;
  T('switching category shows multi-bankroll missions',/Three Pockets/.test(mb)&&/Barbell/.test(mb)&&/Four Seasons/.test(mb));
  T('pot missions show a block per pot with its own attach box',/Safe<\/b>/.test(mb)&&/Attach the ticket to Moon/.test(mb));
  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
