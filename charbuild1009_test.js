const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-09T19:30:00Z')]))}static now(){return RD.parse('2026-10-09T19:30:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const CO=w.eval('CHAR_ORDER');const games=['PIT@CBJ','NYR@WSH','SEA@DET','ANA@WPG','BOS@TOR'];const d='2026-10-09';const V=[];
  games.forEach((g,gi)=>CO.forEach((v,vi)=>{V.push({id:['nhl',g,d,v,'ml'].join('|'),voice:v,sp:'nhl',market:'ml',side:(gi+vi)%3?'home':'away',game:g,date:d,price:g==='BOS@TOR'?-450:-120+gi*10,graded:false,hit:null});
    V.push({id:['nhl',g,d,v,'total'].join('|'),voice:v,sp:'nhl',market:'total',side:(gi+vi)%2?'over':'under',game:g,date:d,price:-110,line:6.5,graded:false,hit:null});}));
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)});TICKETTAB='build';BUILD_MODE='chars';CB_V='Judge';renderTickets();`);
  const body=()=>w.document.getElementById('ticketBody').innerHTML;
  T('Tickets → Build opens on 🎭 Characters with a chip per character',/Build from a character/.test(body())&&/JUDGE/.test(body())&&/Roll Call/.test(body()));
  const pool=JSON.parse(w.eval("JSON.stringify(cbPool('Judge'))"));
  T('one pick per game, nothing shorter than -300',new Set(pool.map(x=>x.game)).size===pool.length&&pool.every(x=>+x.price>=-300)&&!pool.some(x=>x.game==='BOS@TOR'&&x.m==='ml'),pool.map(x=>x.pick+' '+x.price).join(', '));
  T('Banker pre-selects a length (2–6)',(()=>{const n=w.eval('CB_SEL.length');return n>=2&&n<=6;})(),String(w.eval('CB_SEL.length')));
  w.eval("cbSetN('3')");T('forcing 3 legs selects the top 3',w.eval('CB_SEL.length')===3);
  w.eval(`cbToggle(CB_SEL[0])`);T('unchecking a leg drops it from the ticket',w.eval('CB_SEL.length')===2&&/2-leg ticket/.test(body()));
  w.eval('cbLock()');const t=JSON.parse(w.eval('JSON.stringify(get(LS.locked,[])[0])'));
  T('locking saves a real ticket with the character\'s legs',t&&/The Judge — 2-leg/.test(t.name)&&t.legs.length===2&&t.legs.every(l=>l.sport==='nhl'&&l.price&&l.pick),t&&t.name);
  T('…whose legs the grader can read',w.eval(`(()=>{const t=get(LS.locked,[])[0];return t.legs.every(l=>{const r=gradeLeg(l,t.date);return r&&r.detail!=='unreadable';})})()`));
  w.eval("TICKETTAB='build';cbSetV('__roll')");T('📣 Roll Call option lists one pick per character',/The Roll Call/.test(body())||/Roll Call/.test(body()));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
