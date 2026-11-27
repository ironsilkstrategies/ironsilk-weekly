const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function boot(page){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    w.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const w=boot('nhl.html');
setTimeout(()=>{try{
  // ── challenge math ──
  const a=w.eval('barAmerican(3.644)'),pay=w.eval('5*barDec(3.644)');
  T('bar price rounds toward the longer price (+264.4 → +265)',a===265,String(a));
  T('quoted payout matches the quoted price ($5 at +265 = $18.25)',Math.abs(pay-18.25)<1e-9,pay.toFixed(2));
  T('favorite bar: 1.9091 → -110, never a shorter price',w.eval('barAmerican(1+100/110)')===-110&&w.eval('barAmerican(1.905)')===-110);
  T('a ticket priced exactly at the shown bar clears it',w.eval('americanToDecimal(barAmerican(3.644))>=barDec(3.644)*0.999'));
  w.eval(`set(MS_KEY,[]);msStart('first_win')`);
  const L=w.eval(`(()=>{const m=msAll()[0];const P=msPotsOf(m)[0];P.balance=2;return msPotOrders(m,P,{route:'twolane',cfg:{k:2}});})()`);
  const tot=L.reduce((a,x)=>a+x.stake,0);
  T('two-lane on a $2 balance never stakes twice the plan',tot<=1.01,L.map(x=>x.lab+' $'+x.stake).join(', '));
  // ── Judge: the math adds up ──
  const J=w.eval(`(()=>{const g={id:'j1',away:{abbr:'PHI',name:'Philadelphia Flyers'},home:{abbr:'TB',name:'Tampa Bay Lightning'}};
    return brainJudge(g,{aR:3.6,hR:4.1},'mlb');})()`);
  if(J&&J.ledger){const Lg=J.ledger;const sa=Lg.wA+Lg.memA+Lg.tA+Lg.mA+Lg.fA,sh=Lg.wH+Lg.memH+Lg.tH+Lg.mH+Lg.fH;
    T('Judge ledger sums to the headline score (away and home)',Math.abs(sa-J.a)<0.011&&Math.abs(sh-J.h)<0.011,`${sa.toFixed(2)}=${J.a} · ${sh.toFixed(2)}=${J.h}`);}
  else T('Judge ledger present',false,JSON.stringify(J&&Object.keys(J)));
  const bf=w.eval(`brainBoxFit({away:{q:'5-7-5-6',pts:23,yds:330,pass:210,rush:130},home:{q:'6-8-6-8',pts:28,yds:380,pass:240,rush:150}},24,27)`);
  const qs=x=>x.q.split('-').map(Number).reduce((a,b)=>a+b,0);
  T('football box: PTS and quarters match the Judge\'s called score',bf.away.pts===24&&qs(bf.away)===24&&bf.home.pts===27&&qs(bf.home)===27,bf.away.q+' / '+bf.home.q);
  T('football box: PASS + RUSH = YDS',bf.away.pass+bf.away.rush===bf.away.yds&&bf.home.pass+bf.home.rush===bf.home.yds);
  const mb=w.eval(`brainBoxFit({away:{runs:3.6,f5:2.2,late:1.5,hits:8},home:{runs:4,f5:2.4,late:1.8,hits:9}},4,5)`);
  T('MLB box: F5 + innings 6-9 = R',Math.abs(mb.away.f5+mb.away.late-mb.away.runs)<1e-9&&Math.abs(mb.home.f5+mb.home.late-mb.home.runs)<1e-9);
  const html=w.eval(`brainBlock({id:'j1',away:{abbr:'PHI',name:'Philadelphia Flyers'},home:{abbr:'TB',name:'Tampa Bay Lightning'}},{aR:3.6,hR:4.1},'mlb')`);
  T('Judge "why" shows the math line by line ending in the score',/The math/.test(html)&&/Witnesses \(weighted\)/.test(html)&&/= PHI/.test(html));
  // ── Today: filters + live on top ──
  const td=w.eval('today()');const st=n=>n>=23?`${td}T23:59:00-05:00`:`${td}T${String(n).padStart(2,"0")}:00:00-05:00`;
  const P=[
    {game:'OTT@BOS',m:'total',sd:'over',pick:'Over 5.5',price:-110,color:' supreme',unan:true,chars:['Sim','Judge','Coach'],brainP:.6,start:st(18)},
    {game:'SJ@DAL',m:'ml',sd:'home',pick:'DAL ML',price:-150,color:' strong',chars:['Sim','Judge'],brainP:.66,start:st(23)},
    {game:'PHI@TB',m:'ml',sd:'home',pick:'TB ML',price:-140,color:'value',chars:['Sim','Trends'],brainP:.62,start:st(17)},
    {game:'WPG@PIT',m:'spread',sd:'away',pick:'WPG +1.5',price:-170,color:'source',chars:['Pred'],brainP:.7,start:st(18)}];
  w.eval(`set(TC_KEY,{d:today(),by:{nhl:{ts:Date.now(),picks:${JSON.stringify(P)},props:[]}}});set(TF_KEY,{tier:"all"});
    MG_TS=Date.now();MG_LIVE={nhl:{[mgKey('nhl','PHI@TB')]:[{date:today(),state:'in',a:1,h:3,period:3,clock:300,detail:'5:00 - 3rd'}],
      [mgKey('nhl','SJ@DAL')]:[{date:today(),state:'post',a:2,h:4,period:3,clock:0,detail:'Final'}]}};
    if(!document.getElementById('todayBody')){const d=document.createElement('div');d.id='todayBody';document.body.appendChild(d);}renderToday(true);`);
  /* the Best-3 hero (v1.93) sits above the filtered list; filters apply to the list */
  const tb=()=>{const c=w.document.getElementById('todayBody').cloneNode(true);const h=c.querySelector('#todayBestHero');if(h)h.remove();return c.innerHTML;};
  const h0=tb();
  T('live game pinned at the top with score',h0.indexOf('Live now')>-1&&h0.indexOf('TB ML')<h0.indexOf('Over 5.5'),'');
  T('live pick shows a live win % moved from pre-game',/to win/.test(h0)&&/from 62%/.test(h0)&&/PHI <b>1<\/b> – <b>3<\/b> TB/.test(h0));
  const lp=w.eval(`tcLive('nhl',${JSON.stringify(P[2])}).p`);
  T('leading by 2 with 5:00 left → win chance above pre-game',lp>0.9,(lp*100).toFixed(1)+'%');
  T('finished game graded on the card (DAL won 4-2 → HIT)',/FINAL ·.*HIT/.test(h0));
  w.eval(`tfSet('tier','unan')`);const h1=tb();
  T('★ Unanimous filter shows only unanimous picks',/Over 5\.5/.test(h1)&&!/DAL ML/.test(h1)&&!/WPG \+1\.5/.test(h1));
  w.eval(`tfSet('tier','all');tfSet('ch','Trends')`);const h2=tb();
  T('character filter (Trends) shows only picks Trends is on',/TB ML/.test(h2)&&!/Over 5\.5/.test(h2)&&!/WPG/.test(h2));
  w.eval(`tfSet('ch','all');tfSet('tier','source')`);const h3=tb();
  T('tier filter (Outside) shows only purple picks',/WPG \+1\.5/.test(h3)&&!/DAL ML/.test(h3));
  w.eval(`tfSet('tier','all')`);
  // ── Best card ──
  const tom=w.eval('dayShift(today(),4)');
  const B=[
    {game:'A@B',m:'ml',sd:'home',pick:'B ML',price:-250,color:' supreme',unan:true,chars:['Sim'],blend:.75,evCal:2,start:st(23)},       // too short
    {game:'C@D',m:'ml',sd:'home',pick:'D ML',price:-120,color:' supreme',chars:['Sim','Judge'],blend:.6,evCal:4,start:st(23)},
    {game:'E@F',m:'total',sd:'over',pick:'Over 6.5',price:105,color:' strong',chars:['Sim'],blend:.52,evCal:6.6,start:st(23)},
    {game:'G@H',m:'ml',sd:'away',pick:'G ML',price:120,color:'value',chars:['Sim'],blend:.5,evCal:10,start:st(23)},
    {game:'I@J',m:'ml',sd:'away',pick:'I ML',price:110,color:' supreme',unan:true,chars:['Sim'],blend:.55,evCal:15.5,start:tom+'T19:00:00-05:00'}, // not today
    {game:'K@L',m:'ml',sd:'home',pick:'L ML',price:-105,color:' strong',chars:['Sim'],blend:.49,evCal:-4,start:st(23)},   // negative EV
    {game:'M@N',m:'ml',sd:'home',pick:'N ML',price:-110,color:'value',chars:['Sim'],blend:.55,evCal:5,start:st(23)}];
  w.eval(`localStorage.removeItem(BEST5_KEY);localStorage.removeItem('d4.best5log');set(LS_EVAL,{});set(TC_KEY,{d:today(),by:{nhl:{ts:Date.now(),picks:${JSON.stringify(B)},props:[]},ncaaf:{ts:Date.now(),picks:${JSON.stringify(B.slice(4,5).map(x=>({...x,game:'X@Y'})))},props:[]}}})`);
  const S=w.eval('best5State()');const top=S.top3.map(x=>x.pick);
  T('Best card: exactly 3 picks',S.top3.length===3,top.join(', '));
  T('Best: nothing shorter than -200, nothing from another day, no negative EV',!top.includes('B ML')&&!top.includes('I ML')&&!top.includes('L ML'));
  T('Best: ranked agreement first, then EV (D ML supreme, Over 6.5 strong, then the best value)',top[0]==='D ML'&&top[1]==='Over 6.5'&&top[2]==='G ML',top.join(' > '));
  T('Best: CFB game that isn\'t today stays off the card',!(S.bySport.ncaaf||[]).length);
  T('Best: not locked before the master evaluation',!S.locked);
  w.eval(`set(LS_EVAL,{date:today()})`);const S2=w.eval('best5State()');
  T('Best: freezes when the master evaluation runs',S2.locked&&/master evaluation/.test(S2.why));
  w.eval(`(()=>{const T=get(TC_KEY,{});T.by.nhl.picks.push({game:'Q@R',m:'ml',sd:'home',pick:'R ML',price:150,color:' supreme',unan:true,chars:['Sim'],blend:.6,evCal:50,start:'${st(23)}'});set(TC_KEY,T);})()`);
  const S3=w.eval('best5State()');
  T('Best: frozen card does not change when the board changes',S3.top3.map(x=>x.pick).join()===top.join());
  w.eval('best5Grade()');const lg=w.eval(`get('d4.best5log',{})[today()]`);
  T('Best: locked card goes to the graded ledger with its main three marked',lg&&lg.v===2&&lg.picks.filter(x=>x.main).length===3,JSON.stringify(lg).slice(0,300));
  w.eval(`if(!document.getElementById('bestCard')){const d=document.createElement('div');d.id='bestCard';document.body.appendChild(d);}renderBest();`);
  const bh=w.document.getElementById('bestCard').innerHTML;
  T('Best: public card shows picks, prices, % and the track record',/D ML/.test(bh)&&/-120/.test(bh)&&/Track record/.test(bh)&&/Whole slate/.test(bh));
  w.eval(`bestView('nhl')`);T('Best: sport filter switches the card',/NHL · today's 3 best/.test(w.document.getElementById('bestCard').innerHTML));
  // challenge builder ignores other-day games
  w.eval(`set(LS.locked,[])`);const bt=w.eval(`msBuildTicket(1,1.01,null,null)`);
  T('challenge ticket builder only uses today\'s games',bt.best&&!bt.best.legs.some(x=>x.pick==='I ML')&&!bt.best.legs.some(x=>x.game==='X@Y'));
  // ── character desk ──
  const V=[];const d=w.eval('today()');
  for(let i=0;i<8;i++)V.push({id:'h'+i,sp:'nhl',date:'2026-09-'+String(10+i).padStart(2,'0'),game:'BOS@OTT',voice:'Coach',market:'total',side:'under',graded:true,hit:i<7});
  V.push({id:'t1',sp:'nhl',date:d,game:'OTT@BOS',voice:'Coach',market:'total',side:'under',line:5.5});
  V.push({id:'t2',sp:'nhl',date:d,game:'OTT@BOS',voice:'Sim',market:'total',side:'over',line:5.5});
  V.push({id:'t3',sp:'nhl',date:d,game:'OTT@BOS',voice:'Judge',market:'total',side:'over',line:5.5});
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)});tfSet('view','chars')`);const ch=tb();
  T('character desk: Coach flagged hot on the H2H unders (7-1)',/Hot hands/.test(ch)&&/H2H 7-1/.test(ch));
  T('character desk: shows the split and who is on each side',/split 2-1/.test(ch)&&/Under 5\.5/.test(ch)&&/Over 5\.5/.test(ch));
  T('character desk: each character\'s slate listed',/Each character's slate/.test(ch)&&/calls today/.test(ch));
}catch(e){T('harness',false,e.stack.split('\n').slice(0,4).join(' | '));}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);},3500);
