const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function boot(page){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-09T20:30:00Z')]))}static now(){return RD.parse('2026-10-09T20:30:00Z')}}w.Date=FD;
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const w=boot('mlb.html');
setTimeout(()=>{try{
  const day=n=>new Date(Date.parse('2026-10-09T12:00:00Z')-n*86400e3).toISOString().slice(0,10);
  const leg=(g,pk,res)=>({game:g,pick:pk,price:-110,sport:'mlb',manual:{hit:res==='W',push:res==='P',at:1}});
  const tk=[];let id=1;
  // 1 win, 9 losses, settled long ago and recently
  tk.push({id:'t'+id++,date:day(60),source:'mine',stake:10,toWin:9.09,legs:[leg('NYY@BOS','NYY ML','W')],archived:true,archivedAt:Date.parse(day(60))});
  for(let i=0;i<9;i++)tk.push({id:'t'+id++,date:day(i<4?50:5),source:'mine',stake:5,toWin:20,legs:[leg('LAD@SD','LAD ML','W'),leg('SEA@HOU','SEA ML','L')],archived:true,archivedAt:Date.parse(day(i<4?50:5))});
  tk.push({id:'tp',date:day(0),source:'mine',legs:[{game:'CHC@MIL',pick:'CHC ML',price:-110,sport:'mlb'}]});   // pending
  w.eval(`set(LS.locked,${JSON.stringify(tk)});localStorage.removeItem(SETTLED_KEY);`);
  const r0=w.eval('settledRecord("mine")');
  T('ledger freezes every settled ticket: 1-9',r0.w===1&&r0.l===9&&r0.n===10,JSON.stringify(r0));
  T('a pending ticket is not in the record',!w.eval('settledAll()').tp);
  // the device "forgets" how to grade old legs (finals gone) — record must not move
  w.eval(`(()=>{const L=get(LS.locked,[]);L.forEach(t=>t.legs.forEach(l=>delete l.manual));set(LS.locked,L);})()`);
  const r1=w.eval('settledRecord("mine")');
  T('losing old finals no longer shrinks the record',r1.w===1&&r1.l===9,JSON.stringify(r1));
  T('Records hub "Your tickets" reads the frozen ledger',w.eval('JSON.stringify(hubYou().tickets)')===JSON.stringify({w:1,l:9,units:r1.profit}),w.eval('JSON.stringify(hubYou().tickets)'));
  // restore grades, run daily maintenance: 45-day purge, record unchanged
  w.eval(`set(LS.locked,${JSON.stringify(tk)});localStorage.removeItem('d4.lastMaint');maybeRunDailyMaintenance();`);
  const left=w.eval('get(LS.locked,[]).length');
  T('maintenance keeps 45 days of tickets itemized (purges only 50+ day ones)',left===6,String(left));
  const r2=w.eval('settledRecord("mine")');
  T('purged tickets still count — ticket record unchanged after purge',r2.w===1&&r2.l===9,JSON.stringify(r2));
  T('a ticket the ledger has not frozen is never purged',w.eval(`(()=>{localStorage.removeItem(SETTLED_KEY);set(LS.locked,[{id:'old',date:'${day(90)}',source:'mine',archived:true,archivedAt:${Date.parse(day(90))},legs:[{game:'A@B',pick:'A ML',sport:'mlb'}]}]);purgeOldArchivedTickets(45);return get(LS.locked,[]).length})()`)===1);
  // recovery: tickets purged BEFORE the ledger existed come back from bankroll history
  w.eval(`(()=>{localStorage.removeItem(SETTLED_KEY);set(LS.locked,[]);const b=getBankroll();b.history=[];
    for(let i=0;i<20;i++)b.history.push({id:'old'+i,date:'2026-09-'+String(10+i).padStart(2,'0'),stake:5,profit:-5,won:false,ts:i});
    b.history.push({id:'oldw',date:'2026-09-01',stake:5,profit:45,won:true,ts:99});saveBankroll(b);})()`);
  const r3=w.eval('settledRecord("mine")');
  T('purged tickets are rebuilt from the money history (1-20)',r3.w===1&&r3.l===20,JSON.stringify(r3));
  T('…with their real booked profit',Math.abs(r3.profit-(45-100))<1e-9,String(r3.profit));
  // explicit delete is honored and never resurrected by recovery
  w.eval(`set(LS.locked,[{id:'oldw',date:'2026-09-01',source:'mine',legs:[{game:'A@B',pick:'A ML',sport:'mlb',manual:{hit:true}}]}]);delLocked('oldw');`);
  const r4=w.eval('settledRecord("mine")');
  T('a ticket you delete leaves the record and stays gone',r4.w===0&&r4.l===20,JSON.stringify(r4));
  // a manual leg override re-freezes that one ticket
  w.eval(`set(LS.locked,[{id:'m1',date:'${day(1)}',source:'mine',legs:[{game:'A@B',pick:'A ML',sport:'mlb',manual:{hit:false}}]}]);settledSync(true);legSetManual('m1',0,'won');`);
  T('manual override updates the frozen entry',w.eval('settledAll().m1.won')===true);
  // all-time leg record keeps a frozen leg result when live grading is gone
  w.eval(`(()=>{const L=get(LS.locked,[]);delete L[0].legs[0].manual;set(LS.locked,L);})()`);
  T('All-time record falls back to the frozen leg result',w.eval(`buildAllTimeRecord().mine.some(x=>x.ticketId==='m1'&&x.hit===true)`));
  T('Your tickets shows the locked lifetime line',/Lifetime ticket record/.test(w.eval('minePicksHtml()')));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},1500);
