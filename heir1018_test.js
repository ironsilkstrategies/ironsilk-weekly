/* v2.45 · GENERATIONS — every character is a bloodline: a champion (the confidence that counts) and
   heirs in the shadows that read every game walk-forward. An heir takes the chair only after beating
   its parent on 150+ games it was never tuned on, over two weeks, by more than luck allows, without
   its official picks making less money — and only from the next day. Nothing before Oct 18 moves. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
if(!/desk-heir\.js/.test(html))html=html.replace(/(<script src="desk-voice\.js\?v=[^"]+"><\/script>)/,'$1\n<script src="desk-heir.js?v=t"></script>');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
function boot(store,now){return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.__NOW=now;const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[w.__NOW]))}static now(){return w.__NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.setupDone','1');Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,JSON.stringify(v)));}}).window;}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const dayAt=(d0,i)=>new Date(Date.parse(d0+'T12:00:00Z')+i*864e5).toISOString().slice(0,10);
/* a Sim moneyline bloodline whose stamped confidence is badly calibrated (always 75%) while its own read
   (the simulator's chance) is the truth: an honest heir should beat it, given enough unseen games */
function ledger(seed,{from='2026-09-18',days=49,per=10,cf=0.75}={}){const R=rng(seed);const V=[];
  for(let i=0;i<days;i++){const d=dayAt(from,i);for(let k=0;k<per;k++){const p=R()<0.5?0.35:0.65;const hit=R()<p;
    V.push({id:`nhl|G${i}x${k}@H${i}x${k}|${d}|Sim|ml`,sp:'nhl',date:d,game:`G${i}x${k}@H${i}x${k}`,gid:'g'+i+'x'+k,voice:'Sim',market:'ml',side:'home',line:null,price:-110,
      pick:`H${i}x${k} ML`,simP:p,cf,lk:Date.parse(d+'T15:00:00Z'),graded:true,hit,units:hit?0.909:-1,f:[]});}}return V;}
(async()=>{try{
  /* ── on paper ── */
  {const w=boot({},Date.parse('2026-10-18T14:00:00Z'));await wait(1200);
    const C=w.eval('bookCheck(BOOKS.generation)');T('the Generation Book: every turn exists, every page reaches an ending',C.ok,C.errs.join(' | '));
    const X=w.eval('bookExplore(BOOKS.generation,heirRules)');
    T(`every combination (${X.n}) ends, and none breaks a rule (no chair changes without clearing every bar, no heir promised without room)`,X.bad.length===0&&X.broke.length===0,JSON.stringify(X.broke.slice(0,2)));
    T('every generation ending is reachable',['KEEP','PROMOTE','RETIRE','SPAWN'].every(e=>X.ends[e]>0),JSON.stringify(X.ends));
    T('the daily pass runs after the health check (and after the world\'s weather, when that\'s loaded)',w.eval(`(()=>{const i=AP_STEPS.findIndex(s=>s[0]==='status'),j=AP_STEPS.findIndex(s=>s[0]==='heirs'),k=AP_STEPS.findIndex(s=>s[0]==='world');return i>=0&&j>i&&(k<0||(k>i&&k===j-1));})()`));}
  /* ── walk-forward: a day is predicted only from the days before it ── */
  {const w=boot({},Date.parse('2026-10-18T14:00:00Z'));await wait(1000);const V=ledger(7,{days:30});
    const r=w.eval(`(()=>{const V=${JSON.stringify(V)};const D='2026-10-02';const full=wvRun(V,WV_DEF),cut=wvRun(V.filter(x=>x.date<=D),WV_DEF);
      const same=V.filter(x=>x.date<=D).every(x=>full.pred.get(x.id)===cut.pred.get(x.id));
      const V2=V.map(x=>x.date===D?{...x,hit:!x.hit}:x);const flip=wvRun(V2,WV_DEF);
      const sameUpTo=V.filter(x=>x.date<=D).every(x=>full.pred.get(x.id)===flip.pred.get(x.id));const later=V.filter(x=>x.date>D).some(x=>full.pred.get(x.id)!==flip.pred.get(x.id));
      return{same,sameUpTo,later};})()`);
    T('no lookahead: every prediction up to a day is identical whether or not the later days exist',r.same,JSON.stringify(r));
    T('…flipping a day\'s results changes nothing on that day or before it — only the days after',r.sameUpTo&&r.later,JSON.stringify(r));}
  /* ── own reads, in each character's terms ── */
  {const w=boot({},Date.parse('2026-10-18T14:00:00Z'));await wait(1000);
    const r=w.eval(`(()=>{const J={sp:'nfl',voice:'Judge',market:'spread',side:'home',line:-3.5,price:-110,ja:20,jh:27,jsd:13};const Jt={...J,market:'total',side:'over',line:44.5};
      const Tr={sp:'nfl',voice:'Trends',market:'spread',side:'home',line:-3.5,price:-110,tlp:1.5};const Tn={...Tr,tlp:-1.5};
      const sc={sp:'nhl',voice:'Most common',market:'ml',side:'away',price:120,score:'3-2'};return{j:wvOwn(J),jt:wvOwn(Jt),t:wvOwn(Tr),tn:wvOwn(Tn),m:wvMkt(Tr),s:wvOwn(sc)};})()`);
    T('the Judge reads its own weighed score: home by 7 on a 3.5-point line → about 61%',r.j>0.59&&r.j<0.63,JSON.stringify(r));
    T('…and its total: 47 against 44.5 → the over, about 57%',r.jt>0.55&&r.jt<0.59,JSON.stringify(r));
    T('the Historian moves the market by the trends\' lean: +1.5 points up, −1.5 down',r.t>r.m&&r.tn<r.m&&Math.abs((r.t-r.m)+(r.tn-r.m))<0.01,JSON.stringify(r));
    T('the Scorekeeper\'s 3-2 says the away side wins more often than not',r.s>0.55,JSON.stringify(r));
    const z=w.eval(`(()=>{const H=WV_DEF;return{none:wvZ(H,null,0.6),own:wvZ(H,0.6,0.6)};})()`);
    T('a character with no read of its own starts from the market at full weight (not shrunk toward a coin flip)',Math.abs(z.none-Math.log(0.6/0.4))<1e-9&&Math.abs(z.own-Math.log(0.6/0.4))<1e-9,JSON.stringify(z));
    const p=w.eval(`[wvPrior(WV_DEF,'Coach','restedge'),wvPrior(WV_DEF,'Coach','restedge:over'),wvPrior(WV_DEF,'Coach','ch:early')]`);
    T('beliefs start from the persona — but a totals belief starts at zero (rest doesn\'t push the over AND the under)',p[0]===0.15&&p[1]===0&&p[2]===0,JSON.stringify(p));}
  /* ── before the bar is cleared nothing changes ── */
  {const V=ledger(11,{days:36});   /* through Oct 23: a week of unseen games */
    const w=boot({'d4.voices':V},Date.parse('2026-10-23T20:00:00Z'));await wait(1200);
    const before=w.eval(`(()=>{const c={...${JSON.stringify(V[V.length-1])},id:'x1',graded:false,hit:null,date:today()};delete c.cf;confStamp([c]);return c.cf;})()`);
    const R=w.eval(`(()=>{const R=heirsRun(true);const C=heirsAll().cells['Sim|ml'];return{book:R.cells['Sim|ml'].book,gen:C.gen,champ:C.champ.id,shadows:C.heirs.filter(h=>h.st==='shadow').map(h=>h.id+'@'+h.born),ids:C.heirs.map(h=>h.id)};})()`);
    T('two heirs are born into the shadows (on Oct 18 at the earliest), each a different idea',R.shadows.length===2&&R.shadows.every(s=>s.endsWith('@2026-10-18'))&&new Set(R.ids).size===R.ids.length,JSON.stringify(R));
    T('…a week of unseen games is not enough: the champion keeps the chair',R.book.end==='KEEP'&&R.gen===1&&R.champ==='base',JSON.stringify(R.book));
    const after=w.eval(`(()=>{const c={...${JSON.stringify(V[V.length-1])},id:'x1',graded:false,hit:null,date:today()};delete c.cf;confStamp([c]);return c.cf;})()`);
    T('…and every confidence is exactly what it was without the heirs',before===after&&before!=null,before+' vs '+after);}
  /* ── a genuinely better heir takes the chair — from the next day only ── */
  {const V=ledger(5,{days:50});   /* Sep 18 → Nov 6: 20 days and 200 unseen graded games after Oct 18 */
    const w=boot({'d4.voices':V},Date.parse('2026-11-06T20:00:00Z'));await wait(1200);
    const R=w.eval(`(()=>{const R=heirsRun(true);const C=heirsAll().cells['Sim|ml'];const r=R.cells['Sim|ml'];return{book:r.book,heirs:r.heirs,gen:C.gen,champ:C.champ,hist:C.hist,shadows:C.heirs.filter(h=>h.st==='shadow').length,j:journalAll().filter(x=>x.kind==='generation').map(x=>x.title)};})()`);
    T('a better heir on 150+ unseen games over two weeks, past the bar → it takes the chair',R.book.end==='PROMOTE'&&R.gen===2,JSON.stringify(R.book)+' '+JSON.stringify(R.heirs.map(h=>[h.id,h.n,h.z,h.days])));
    T('…from tomorrow (Nov 7), never mid-day',R.champ.since==='2026-11-07',JSON.stringify(R.champ));
    T('…the parent retires to the family tree with its record, and a new heir is born so two still read',R.hist.length===1&&/retired/.test(R.hist[0].why)&&R.shadows===2,JSON.stringify(R.hist));
    T('…and the journal says so in plain words',R.j.some(t=>/Generation 2 takes the chair/.test(t)),JSON.stringify(R.j));
    const S=w.eval(`(()=>{const mk=d=>{const c={...${JSON.stringify(V[V.length-1])},id:'s'+d,graded:false,hit:null,date:d,simP:0.65};delete c.cf;return c;};const a=mk('2026-11-06'),b=mk('2026-11-07'),c=mk('2026-11-07');c.id='s3';
      confStamp([a]);confStamp([b]);const LS0=laneStatus;laneStatus=()=>'blocked';try{confStamp([c]);}finally{laneStatus=LS0;}return{a:[a.cf,a.cfo,a.cfg],b:[b.cf,b.cfo,b.cfg],c:[c.cf,c.cfo,c.cfg,c.cff]};})()`);
    T('a Nov 6 call keeps the original confidence',S.a[1]===undefined&&S.a[2]===undefined,JSON.stringify(S));
    T('a Nov 7 call carries the new champion\'s confidence, with the original kept beside it',S.b[2]===2&&S.b[1]!=null&&S.b[0]!==S.b[1]&&S.b[0]<0.7,JSON.stringify(S));
    T('…and the immune caps travel with it: a blocked lane stays at 55% at most',S.c[0]<=0.55,JSON.stringify(S));
    const old=w.eval(`(()=>{const c={...${JSON.stringify(V[0])},id:'o1',graded:false,hit:null,date:'2026-10-17'};delete c.cf;confStamp([c]);return[c.cfg,c.cfo];})()`);
    T('nothing dated before the champion\'s first day ever moves (Oct 17 included)',old[0]==null&&old[1]==null,JSON.stringify(old));
    w.eval(`REC_VIEW='family';renderRecordsHub()`);const h=w.document.getElementById('recordsHub').innerHTML;
    T('Records → 🧬 Generations shows the bloodline: Gen 2, its heirs, the book\'s reason',/🧬 Generations/.test(h)&&/Gen 2/.test(h)&&/born/.test(h),h.slice(0,160));}
  /* ── a clearly worse heir retires; a used-up bloodline is an ending, not a dead end ── */
  {const w=boot({},Date.parse('2026-11-06T20:00:00Z'));await wait(1000);
    const r=w.eval(`(()=>{const H={v:1,cells:{},tried:{}};const C=heirCell(H,'Coach','total');let n=0;while(heirSpawn(C,H,'2026-10-18','test'))n++;
      const sigs=C.heirs.map(h=>wvSig(h.p));const room=heirRoom(C);C.heirs.forEach(h=>h.st='retired');
      const R=bookWalkSync(BOOKS.generation,{heirs:0,room:heirRoom(C),n:0,days:0,z:0,bar:2,tried:n,du:0},null);
      return{n,uniq:new Set(sigs).size===sigs.length,ids:new Set(C.heirs.map(h=>h.id)).size===C.heirs.length,room,end:R.end,why:R.why,pri:C.heirs.some(h=>h.p.pri!==WV_DEF.pri)};})()`);
    T(`a bloodline tries every variation once, never the same idea twice (${r.n} heirs, unique)`,r.n>10&&r.uniq&&r.ids,JSON.stringify(r));
    T('…a totals bloodline never wastes an heir on starting beliefs (none apply to totals)',!r.pri,JSON.stringify(r));
    T('…and when every variation has been tried, the book ends "the champion keeps the chair" — no heir is promised',r.room===false&&r.end==='KEEP'&&/no heir left/.test(r.why),JSON.stringify(r));}
  /* ── two devices: the merge keeps the furthest generation and every heir either one has seen ── */
  {const w=boot({},Date.parse('2026-11-06T20:00:00Z'));await wait(1000);
    const r=w.eval(`(()=>{const A={v:1,tried:{'Sim|ml':3},cells:{'Sim|ml':{v:'Sim',m:'ml',gen:2,champ:{id:'wv1',since:'2026-11-07',gen:2,p:WV_DEF},heirs:[{id:'wv1',st:'champion',p:WV_DEF},{id:'wvb02-2',st:'shadow',p:{...WV_DEF,b:0.2}}],hist:[{gen:1}]}}};
      const B={v:1,tried:{'Sim|ml':4,'Judge|ml':2},cells:{'Sim|ml':{v:'Sim',m:'ml',gen:1,champ:{id:'base'},heirs:[{id:'wv1',st:'shadow',p:WV_DEF},{id:'wvhl21-3',st:'shadow',p:{...WV_DEF,hl:21}}],hist:[]},'Judge|ml':{v:'Judge',m:'ml',gen:1,champ:{id:'base'},heirs:[],hist:[]}}};
      const M=syncMergeVal(HEIR_KEY,{t:1,v:B},{t:2,v:A},{});const C=M.cells['Sim|ml'];return{gen:C.gen,champ:C.champ.id,heirs:C.heirs.map(h=>h.id+':'+h.st),tried:M.tried,judge:!!M.cells['Judge|ml']};})()`);
    T('a promotion on one device survives a newer copy from a device that never saw it',r.gen===2&&r.champ==='wv1',JSON.stringify(r));
    T('…every heir either device has seen is kept, and the count of heirs tried never goes backwards',r.heirs.includes('wvhl21-3:shadow')&&r.heirs.includes('wv1:champion')&&r.tried['Sim|ml']===4&&r.judge,JSON.stringify(r));}
}catch(e){T('suite crashed',false,String(e&&e.stack||e).slice(0,500));}
  console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);})();
