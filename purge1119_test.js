/* v3.1.1 · an open ticket rolls up only once its result is in (the ledger froze it) — or after two weeks as a stray.
   Before: any ticket 3 days past its last game was purged and tombstoned, graded or not, so an ungraded 1H spread,
   an ESPN outage or a phone closed for four days lost the ticket's result for good. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<template id="d4s">([\s\S]*?)<\/template>/,'$1').replace(/<script src="min\/store\.js[^"]*"><\/script>\s*<script>D4_BOOT\(\);<\/script>/,'');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(x){x.__NO_GRADELOOP__=true;x.__NO_BACKFILL__=true;x.__NO_SYNC_LOOP__=true;x.__NO_GUARD_LOOP__=true;
  x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');}}).window;
const E=s=>w.eval(s);
setTimeout(()=>{try{
  const D=n=>E(`dayShift(today(),${-n})`);
  const leg=(g,p,hit)=>({id:g+'|'+p,game:g,pick:p,sport:'nfl',...(hit==null?{}:{manual:{hit,ts:Date.now()}})});
  E(`localStorage.removeItem(SETTLED_KEY);localStorage.removeItem(LS_LIFELOG);set(LS.locked,${JSON.stringify([
    {id:'open6',date:D(6),source:'mine',stake:5,legs:[leg('GB@CHI','GB 1H spread',null),leg('BUF@NE','BUF ML',true)]},
    {id:'lost6',date:D(6),source:'mine',stake:5,legs:[leg('SEA@SF','SEA ML',false),leg('DAL@NYG','DAL ML',null)]},
    {id:'won6',date:D(6),source:'mine',stake:5,legs:[leg('KC@LV','KC ML',true),leg('DET@MIN','Over 47.5',true)]},
    {id:'stray20',date:D(20),source:'mine',stake:5,legs:[leg('LAR@ARI','LAR 1H spread',null)]},
    {id:'fresh1',date:D(1),source:'mine',stake:5,legs:[leg('PHI@WSH','PHI ML',true)]}])})`);
  const recBefore=E(`settledSync(true),settledRecord('mine')`);
  const n=E('purgeOldArchivedTickets(3)');const left=E(`get(LS.locked,[]).map(t=>t.id)`);
  T('an ungraded ticket 6 days old stays — you can still grade its 1H spread',left.includes('open6'),JSON.stringify(left));
  T('a settled ticket (a loss is in) rolls up once it\'s 3 days past its last game',!left.includes('lost6'));
  T('…and so does a winner whose every leg is in',!left.includes('won6'));
  T('a ticket nobody can grade rolls up after two weeks (the list can\'t fill with strays)',!left.includes('stray20'));
  T('yesterday\'s ticket is untouched',left.includes('fresh1'));
  T('three tickets rolled up',n===3,String(n));
  const recAfter=E(`settledRecord('mine')`);
  T('the ticket record is the same after the roll-up (results were frozen first)',recAfter.w===recBefore.w&&recAfter.l===recBefore.l,JSON.stringify(recBefore)+' → '+JSON.stringify(recAfter));
  T('rolled-up tickets are tombstoned so a sync can\'t bring them back',['lost6','won6','stray20'].every(id=>!!E(`(get(SYNC.tomb,{})||{})['${id}']`)));
  T('the ungraded one is not tombstoned',!E(`(get(SYNC.tomb,{})||{})['open6']`));
  /* grading it later works, and the next roll-up takes it */
  E(`(()=>{const L=get(LS.locked,[]);const t=L.find(x=>x.id==='open6');t.legs[0].manual={hit:false,ts:Date.now()};set(LS.locked,L);})()`);
  E('purgeOldArchivedTickets(3)');T('graded later, it rolls up on the next pass',!E(`get(LS.locked,[]).map(t=>t.id)`).includes('open6'));
  T('…with its loss in the record',E(`settledRecord('mine').l`)===recAfter.l+1,JSON.stringify(E(`settledRecord('mine')`)));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));const f=out.filter(x=>!x.startsWith('PASS')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);},1800);
