const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=m=>{w.__al=String(m)};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const st=w.eval(`today()`)+'T23:59:00-05:00';
  const mk=(g,pick,price,color,blend,extra)=>({game:g,m:/ML$/.test(pick)?'ml':/^(Over|Under)/.test(pick)?'total':'spread',sd:'home',pick,price,color,chars:['Sim','Judge'],blend,start:st,...(extra||{})});
  const P=[mk('A@B','B ML',-150,' supreme',0.66,{unan:true}),mk('C@D','D ML',-130,' strong',0.6),mk('E@F','F ML',+120,' supreme',0.5),
    mk('G@H','H ML',-110,'value',0.6),                         // only VALUE, no proven character → not used
    mk('I@J','J ML',-400,' supreme',0.85,{unan:true}),        // shorter than -300 → never
    mk('K@L','L ML',-120,' supreme',0.4),                      // calibrated EV far below −3% → never
    mk('M@N','N ML',+105,' strong',0.55,{suspect:'model 70% vs market 49%'})];
  w.eval(`localStorage.removeItem(BEST5_KEY);set(TC_KEY,{d:today(),by:{nhl:{ts:Date.now(),picks:${JSON.stringify(P)},props:[]}}});set(LS.locked,[]);set(MS_KEY,[]);truthP=(sp,p)=>p;msStart('first_win');`);
  const m=w.eval('msAll()[0]');
  const B=w.eval(`(()=>{const m=msAll()[0];m.routeKey=R_('stairs',2,.5);const A=msAll();A[0]=m;msSave(A);const P=msPotsOf(m)[0];return msPotOrders(m,P,msParse(m.routeKey))[0];})()`);
  const picks=(B.build.best&&B.build.best.legs||[]).map(x=>x.pick);
  T('the challenge builds its own ticket from the Today menu',!!B.build.best&&B.build.best.legs.length===2,picks.join(', '));
  T('only unanimous / SUPREME / STRONG (or proven-character) picks are eligible when they can make the ticket',w.eval(`msBuildTicket(2,1.01,null,null)`).poolN===3&&!w.eval(`msBuildTicket(2,1.01,null,null)`).widened);
  T('never: shorter than -300, EV-suspect, or calibrated EV worse than −3%',!picks.some(p=>/J ML|N ML|L ML|H ML/.test(p)));
  T('each leg says why it\'s there',B.build.best.legs.every(x=>(x.why||[]).length&&/unanimous|SUPREME|STRONG/.test(x.why.join(' '))));
  w.eval(`document.body.insertAdjacentHTML('beforeend','<div id="missionsBody"></div>');msRender();`);
  const h=w.document.getElementById('missionsBody').innerHTML;T('the challenge card offers ✅ Accept → My Tickets',/msAcceptBuild\(/.test(h)&&/Accept → My Tickets/.test(h));
  w.eval(`msAcceptBuild(msAll()[0].id,0,0)`);
  const L=w.eval('get(LS.locked,[])');const t=L[0];
  T('accept puts it on My Tickets as pending, staked at the plan, legs priced',L.length===1&&t.source==='mine'&&!t.archived&&+t.stake>0&&+t.toWin>0&&t.legs.length===2&&t.legs.every(l=>l.price!=null&&l.sport==='nhl'),JSON.stringify({stake:t.stake,toWin:t.toWin,name:t.name}));
  const m2=w.eval('msAll()[0]');T('…and it\'s attached to the challenge as today\'s step',m2.steps.length===1&&String(m2.steps[0].ticketId)===String(t.id)&&m2.steps[0].rule.ok);
  w.eval('msRender()');T('the card then shows the step is in (no double-accept)',/Today's step is in/.test(w.document.getElementById('missionsBody').innerHTML)&&!/msAcceptBuild\(/.test(w.document.getElementById('missionsBody').innerHTML));
  w.eval(`set(TC_KEY,{d:today(),by:{nhl:{ts:Date.now(),picks:${JSON.stringify(P.slice(0,1))},props:[]}}});set(MS_KEY,[]);msStart('first_win');(()=>{const A=msAll();A[0].routeKey=R_('stairs',2,.5);msSave(A);})();msRender();`);
  T('thin night: says which picks qualify and to sit it out',/Only 1 pick on Today's card makes sense/.test(w.document.getElementById('missionsBody').innerHTML)&&/B ML/.test(w.document.getElementById('missionsBody').innerHTML));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
