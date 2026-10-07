const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const td=w.eval('today()'),tom=w.eval('dayShift(today(),4)');
  // ── ticket ↔ challenge matcher ──
  w.eval(`set(MS_KEY,[]);msStart('first_win')`);
  const m=w.eval('msAll()[0]');const P=w.eval('msPotsOf(msAll()[0])[0]');
  const lane=w.eval(`(()=>{const m=msAll()[0];return msPotOrders(m,msPotsOf(m)[0],msActiveRoute(m))[0];})()`);
  const k=lane.k;const mk=(n,price)=>Array.from({length:n},(_,i)=>({game:'G'+i+'@H'+i,pick:'H'+i+' ML',sport:'nhl',price,gameDate:td}));
  const dec=w.eval(`americanToDecimal(${150})`);const fitStake=lane.stake;
  const good={id:'good',date:td,source:'mine',imported:true,stake:String(fitStake),toWin:String((Math.pow(2.6,k)-1)*fitStake),legs:mk(k,160)};
  const bad={id:'bad',date:td,source:'mine',imported:true,stake:String(fitStake*10),toWin:'1',legs:mk(k+1,-300)};
  const fut={id:'fut',date:td,source:'mine',imported:true,stake:String(fitStake),toWin:String((Math.pow(2.6,k)-1)*fitStake),legs:mk(k,160).map(l=>({...l,gameDate:tom}))};
  w.eval(`set(LS.locked,${JSON.stringify([good,bad,fut])})`);
  const fg=w.eval(`msTicketFit(msAll()[0],0,get(LS.locked,[])[0])`),fb=w.eval(`msTicketFit(msAll()[0],0,get(LS.locked,[])[1])`),ff=w.eval(`msTicketFit(msAll()[0],0,get(LS.locked,[])[2])`);
  T('a ticket matching the plan scores a full fit',fg.full,fg.checks.map(c=>(c.ok?'✓':'✗')+c.lab).join(' '));
  T('a ticket breaking legs/price/stake scores low with reasons',fb.score<=2&&fb.checks.filter(c=>!c.ok).every(c=>c.why),fb.checks.filter(c=>!c.ok).map(c=>c.lab+': '+c.why).join(' | '));
  T('upcoming-game ticket (4 days out) fits when inside the window',ff.checks.find(c=>/window/.test(c.lab)).ok===(w.eval(`dayShift(msAll()[0].startDate,msAll()[0].days-1)`)>=tom));
  const panel=w.eval('msMatcherHtml()');
  T('Money tab lists where each loaded ticket fits',/Where your tickets fit/.test(panel)&&/#good/.test(panel)&&/Attach/.test(panel));
  T('ticket card gets a "fits <challenge>" chip',/🎯 fits/.test(w.eval(`msFitChip(get(LS.locked,[])[0])`)));
  w.eval(`msAttachId(msAll()[0].id,'good',0)`);
  T('attach from the matcher puts it on the challenge and drops it from the free list',w.eval(`msAll()[0].steps.some(s=>s.ticketId==='good')`)&&!w.eval('msFreeTickets()').some(t=>t.id==='good'));
  // ── character parlays ──
  const V=[];const hist=(voice,game,market,side,n,wins)=>{for(let i=0;i<n;i++)V.push({id:voice+game+market+i,sp:'nhl',date:'2026-09-'+String(1+i).padStart(2,'0'),game,voice,market,side,graded:true,hit:i<wins});};
  hist('Coach','A@B','total','under',10,8);hist('Coach','X@Y','ml','home',20,15);hist('Coach','C@D','ml','home',10,3);
  ['A@B','C@D','E@F','G@H','I@J','K@L'].forEach((g,i)=>{const mkt=i===0?'total':'ml',side=i===0?'under':'home';V.push({id:'t'+i,sp:'nhl',date:td,game:g,voice:'Coach',market:mkt,side,price:i===0?-110:-120,pick:i===0?'Under 5.5':g.split('@')[1]+' ML'});});
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)});set(TC_KEY,{d:today(),by:{}});set(LS_EVAL,{});localStorage.removeItem(CPAR_KEY)`);
  const pb=w.eval(`cparBuild('Coach')`);
  T('character builds its own 3–5 leg parlay',pb&&pb.legs.length>=3&&pb.legs.length<=5,pb&&pb.legs.map(l=>l.pick).join(', '));
  T('its strongest spot leads (Coach unders 8-2) and its weak spot is left off (C@D ML 3-7)',pb.legs[0].pick==='Under 5.5'&&!pb.legs.some(l=>l.game==='C@D'));
  T('parlay price is the product of its legs',Math.abs(pb.dec-pb.legs.reduce((a,l)=>a*w.eval(`americanToDecimal(${l.price})`),1))<1e-9);
  T('not frozen before the master evaluation',!w.eval('cparState().locked'));
  w.eval(`set(LS_EVAL,{date:today()})`);const s1=w.eval('cparState()');
  T('frozen at the master evaluation',s1.locked&&s1.by.Coach);
  w.eval(`(()=>{const F=get(LS.allfinals,{});${JSON.stringify(pb.legs)}.forEach((l,i)=>{F[finalsKey('nhl',l.game)]={sport:'nhl',a:1,h:i===0?2:4,d:today(),ts:Date.now()};});set(LS.allfinals,F);})()`);
  w.eval('cparGrade()');const R=w.eval(`cparRecord('Coach')`);
  T('graded at the finals and tallied in the record',R.w===1&&R.lw===pb.legs.length,JSON.stringify(R));
  // ── character props ──
  w.eval(`(()=>{const D=pstDb('nhl');D.p[pstId('Connor McDavid')]={name:'Connor McDavid',team:'EDM',n:20,s:{s:{sum:80,sq:360,ema:5.2,gp:20},pts:{sum:34,sq:80,ema:2.1,gp:20},g:{sum:12,sq:14,ema:0.8,gp:20}}};
    set(TC_KEY,{d:today(),by:{nhl:{ts:Date.now(),picks:[{game:'VAN@EDM',m:'ml',sd:'home',pick:'EDM ML',price:-150,color:' strong',chars:['Sim'],brainP:.6,start:'${td}T23:59:00-05:00'}],props:[]}}});localStorage.removeItem(CPROP_KEY);})()`);
  const calls=w.eval('cpropToday()');const mc=calls.filter(c=>c.player==='Connor McDavid');
  T('characters make 70%+ prop calls on today\'s players',mc.length>=3&&mc.every(c=>c.p>=0.70),mc.map(c=>c.voice+' '+c.thr+'+ '+c.k+' '+Math.round(c.p*100)+'%').join(' · '));
  T('each call is the sweet spot: the highest line that character gives 70%+',mc.filter(c=>c.k==='s').every(c=>!w.eval(`(()=>{const r=cpropReads('nhl','Connor McDavid','s',${c.thr+1});return r&&r.r['${c.voice}']>=0.7&&LIKELY_LADDER.nhl.s.includes(${c.thr+1});})()`)));
  T('Trends (recent form) reads differently from Most common (season rate)',w.eval(`(()=>{const r=cpropReads('nhl','Connor McDavid','s',4).r;return Math.abs(r.Trends-r['Most common'])>0.05;})()`));
  w.eval('cpropLog(cpropToday())');const n0=w.eval('get(CPROP_KEY,[]).length');w.eval('cpropLog(cpropToday())');
  T('calls are logged once',w.eval('get(CPROP_KEY,[]).length')===n0&&n0>0);
  /* calibration: Judge stated 70-73% on 10 graded calls and hit 9 */
  w.eval(`(()=>{const L=get(CPROP_KEY,[]);for(let i=0;i<10;i++)L.push({id:'cal'+i,sp:'nhl',voice:'Judge',player:'X'+i,team:'T',k:'s',thr:2,p:0.715,d:'2026-09-01',hit:i<9});set(CPROP_KEY,L);})()`);
  const C=w.eval('cpropCalib()');const b=C.Judge[0];
  T('confidence buckets: "Judge hits 9/10 of his 70–73% calls"',b.n===10&&b.h===9&&Math.abs(b.rate-0.9)<1e-9);
  const cal=w.eval('cpropCal(cpropCalib(),"Judge",0.715)');
  T('calibrated % moves toward the real hit rate',cal>0.715&&cal<0.9,(cal*100).toFixed(1)+'%');
  w.eval(`(()=>{const L=get('d4.pstlast.nhl',{});L[pstId('Connor McDavid')]={d:today(),v:{s:6,pts:2,g:1}};set('d4.pstlast.nhl',L);})()`);
  const g=w.eval('cpropGrade()');const gl=w.eval(`get(CPROP_KEY,[]).filter(x=>x.player==='Connor McDavid'&&x.hit!=null)`);
  T('graded from the real box line',g>0&&gl.every(x=>x.hit===(x.actual>=x.thr)));
  T('master learning loop grades character props and parlays',/cpropGrade\(\)/.test(w.eval('brainLearnAll.toString()'))&&/cparGrade\(\)/.test(w.eval('brainLearnAll.toString()')));
  w.eval(`(()=>{const L=get('d4.pstlast.nhl',{});delete L[pstId('Connor McDavid')];set('d4.pstlast.nhl',L);})()`);
  w.eval(`if(!document.getElementById('todayBody')){const d=document.createElement('div');d.id='todayBody';document.body.appendChild(d);}set(TF_KEY,{view:'props'});renderToday(true);`);
  const ph=w.document.getElementById('todayBody').innerHTML;
  T('Props view: confidence table + calls with calibrated %',/Prop confidence/.test(ph)&&/Connor McDavid/.test(ph)&&/calibrated · says/.test(ph));
  w.eval(`cpropFocus('nhl|'+pstId('Connor McDavid'))`);const fh=w.document.getElementById('todayBody').innerHTML;
  T('tap a player → sweet-spot table, every line, every character',/sweet spots/.test(fh)&&/shots on goal/.test(fh)&&/season 4\.0\/g/.test(fh));
  w.eval(`set(TF_KEY,{view:'chars'});renderToday(true)`);
  T('Characters view shows the character parlays',/Character parlays/.test(w.document.getElementById('todayBody').innerHTML));
}catch(e){T('harness',false,e.stack.split('\n').slice(0,3).join(' | '));}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);},3500);
