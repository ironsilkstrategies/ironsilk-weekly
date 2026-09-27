const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
(async()=>{
  const nflSB={events:[{id:'9001',date:'2026-09-27T17:00Z',
    competitions:[{status:{type:{state:'in',description:'In Progress',shortDetail:'1st 12:13'},period:1,displayClock:'12:13'},competitors:[
      {homeAway:'away',team:{abbreviation:'CLE',displayName:'Cleveland Browns',id:'5'},score:'0',linescores:[{value:0}]},
      {homeAway:'home',team:{abbreviation:'CAR',displayName:'Carolina Panthers',id:'29'},score:'0',linescores:[{value:0}]}]}]},
    {id:'9002',date:'2026-09-27T17:00Z',competitions:[{status:{type:{state:'pre'}},competitors:[
      {homeAway:'away',team:{abbreviation:'BUF',displayName:'Buffalo Bills',id:'2'},score:''},
      {homeAway:'home',team:{abbreviation:'LAC',displayName:'Los Angeles Chargers',id:'24'},score:''}]}]}]};
  let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const errors=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
    w.fetch=u=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(/football\/nfl\/scoreboard/.test(u)?nflSB:{}),text:()=>Promise.resolve('{}')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
    w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-27T17:10:00Z')]))}static now(){return RD.parse('2026-09-27T17:10:00Z')}}w.Date=FD;
    w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
  const w=dom.window;await new Promise(r=>setTimeout(r,3000));
  const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);

  const sgp=`Ticket Number:\n1000001004\nAccepted Date:\n9/27/26\nAmount:\n$1.00\nStatus:\nPending\nTo win:\n$4,130.00\nType:\nSGPs Combined\nDescription:\n2 Leg Parlay (Includes 1 SGPs)\nSGP 1: FOOTBALL - NFL - Cleveland Browns v Carolina Panthers\nSpread - Panthers +7.5 (Game)\nTotal points - Over 32.5 (Game)`;
  await w.eval('intakeText('+JSON.stringify(sgp)+',null,"auto","")');
  w.eval("TICKETTAB='mine';MINE_VIEW='pending';renderTickets();");
  await new Promise(r=>setTimeout(r,200));
  const html1=w.document.getElementById('tickets').innerHTML;
  T('SGP legs (no price) show no fake 50%',!/>50%</.test(html1),html1.match(/<span class="pp"[^>]*>[^<]*<\/span>/g)||'no pp spans');
  T('live leg shows live score detail instead',/CLE@CAR/.test(html1)&&/so far|already/.test(html1),html1.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').match(/CAR \+7\.5[^—]*/)?.[0]);

  const flat=`Ticket Number:\n2000000001\nAccepted Date:\n9/27/26\nAmount:\n$1.00\nStatus:\nPending\nTo win:\n$100.00\nType:\nParlay\nDescription:\nFootball - NFL - Cleveland Browns vs Carolina Panthers - Parlay | 1 Carolina Panthers -150 for GAME | 09/27/2026 01:00:00 PM (EST) | Pending`;
  await w.eval('intakeText('+JSON.stringify(flat)+',null,"auto","")');
  w.eval("renderTickets();");await new Promise(r=>setTimeout(r,200));
  const html2=w.document.getElementById('tickets').innerHTML;
  T('a REAL priced leg still shows its price-implied %',/6[0-4]%/.test(html2),html2.match(/CAR ML[^—]*<span class="pp">[^<]*<\/span>/)?.[0]);

  T('tickets tab has a live-refresh timer running',w.eval('!!TICKETS_LIVE_TIMER'));
  w.eval("document.getElementById('v-tickets').classList.add('on');");
  const before=w.document.getElementById('tickets').innerHTML.length;
  w.eval("const __L=get(LS.locked,[]);__L[0].legs[0].pick='CAR +99';set(LS.locked,__L);"); // force a visible mutation
  await new Promise(r=>setTimeout(r,21000));
  const after=w.document.getElementById('tickets').innerHTML;
  T('sitting on the tickets tab, board updates itself within ~20s (no manual nav)',/CAR \+99/.test(after));

  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log('CRASH',e.stack);process.exit(1)});
