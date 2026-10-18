/* v2.46 · THE WORLD — every sport's weather (home teams, overs, favorites outright and against the
   number) over the last two weeks against an inherited baseline; a shift past luck is watched, a
   change is journaled once, heard in the voices, and brings fast-learning heirs into the shadows —
   never a change to a pick by itself. Nothing before Oct 18 hears it. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
if(!/desk-heir\.js/.test(html))html=html.replace(/(<script src="desk-voice\.js\?v=[^"]+"><\/script>)/,'$1\n<script src="desk-heir.js?v=t"></script>');
if(!/desk-world\.js/.test(html))html=html.replace(/(<script src="desk-heir\.js\?v=[^"]+"><\/script>)/,'$1\n<script src="desk-world.js?v=t"></script>');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
function boot(store,now){return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.__NOW=now;const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[w.__NOW]))}static now(){return w.__NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.setupDone','1');Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,JSON.stringify(v)));}}).window;}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const dayAt=(d0,i)=>new Date(Date.parse(d0+'T12:00:00Z')+i*864e5).toISOString().slice(0,10);
/* NFL: 60 days of Sim calls, 3 games a day; overs hit 49% until the last two weeks, then `hot` */
function ledger(seed,{hot=0.8,from='2026-08-26',days=60,per=3}={}){const R=rng(seed);const V=[];const cut=dayAt(from,days-14);
  for(let i=0;i<days;i++){const d=dayAt(from,i);for(let k=0;k<per;k++){const g=`A${i}x${k}@H${i}x${k}`;const lk=Date.parse(d+'T17:00:00Z');
    const homeWon=R()<0.55,favHome=R()<0.6;const over=R()<(d>=cut?hot:0.49);const favCov=R()<0.49;
    V.push({id:`nfl|${g}|${d}|Sim|ml`,sp:'nfl',date:d,game:g,voice:'Sim',market:'ml',side:'home',line:null,price:favHome?-160:140,simP:0.55,cf:0.6,lk,graded:true,hit:homeWon,units:homeWon?0.6:-1});
    V.push({id:`nfl|${g}|${d}|Sim|total`,sp:'nfl',date:d,game:g,voice:'Sim',market:'total',side:'under',line:44.5,price:-110,simP:0.52,cf:0.55,lk,graded:true,hit:!over,units:!over?0.909:-1});
    V.push({id:`nfl|${g}|${d}|Sim|spread`,sp:'nfl',date:d,game:g,voice:'Sim',market:'spread',side:favHome?'home':'away',line:-3.5,price:-110,simP:0.52,cf:0.55,lk,graded:true,hit:favCov,units:favCov?0.909:-1});}}
  return V;}
(async()=>{try{
  {const w=boot({},Date.parse('2026-10-25T14:00:00Z'));await wait(1200);
    const C=w.eval('bookCheck(BOOKS.world)');T('the World book: every turn exists, every page reaches an ending',C.ok,C.errs.join(' | '));
    const X=w.eval('bookExplore(BOOKS.world,worldRules)');T(`every combination (${X.n}) ends, none breaks a rule (no change declared without the evidence, no shift called stable)`,X.bad.length===0&&X.broke.length===0,JSON.stringify(X.broke.slice(0,2)));
    T('every weather ending is reachable',['QUIET','STABLE','WATCH','CHANGED'].every(e=>X.ends[e]>0),JSON.stringify(X.ends));
    T('the weather is read before the Generation Book judges the heirs',w.eval(`(()=>{const i=AP_STEPS.findIndex(s=>s[0]==='world'),j=AP_STEPS.findIndex(s=>s[0]==='heirs');return i>=0&&j===i+1;})()`));}
  {const V=ledger(3);const w=boot({'d4.voices':V},Date.parse('2026-10-25T14:00:00Z'));await wait(1200);
    const R=w.eval(`(()=>{const R=worldRun(true);const H=heirsAll();const C=H.cells['Sim|total'];return{nfl:R.day.nfl,born:R.born,heirs:C?C.heirs.map(h=>h.id+'@'+h.born+':'+h.lab):[],j:journalAll().filter(x=>x.kind==='world').map(x=>x.title+' | '+x.what)};})()`);
    T('NFL overs jumped to ~80% in two weeks against an inherited ~49% → ⛈ the world changed',R.nfl&&R.nfl.over.st==='CHANGED'&&R.nfl.over.dir==='up',JSON.stringify(R.nfl&&R.nfl.over));
    T('…home teams and favorites, unchanged, read stable (or too few to tell)',['home','favml','favats'].every(m=>['STABLE','QUIET'].includes(R.nfl[m].st)),JSON.stringify(R.nfl));
    T('…the journal records it once, in plain words, with its signature',R.j.length===1&&/overs against the number jumped/.test(R.j[0])&&/fast-learning heir/.test(R.j[0]),JSON.stringify(R.j));
    T('…and the characters working NFL totals get a fast-learning heir in the shadows (forgets in 3 weeks, learns twice as fast)',R.heirs.some(h=>/@2026-10-25/.test(h)&&/forgets old results: 45 → 21/.test(h)&&/learns: 0.04 → 0.08/.test(h)),JSON.stringify(R.heirs));
    const r=w.eval(`(()=>{const x={sp:'nfl',game:'KC@DEN',m:'total',sd:'under',price:-110,line:44.5,pick:'Under 44.5',date:today()};const y={...x,sd:'over',pick:'Over 44.5'};
      const a=charRead('Sim',x,{voice:'Sim',sp:'nfl',game:'KC@DEN',market:'total',side:'under',price:-110,line:44.5,cf:0.6,date:today()});
      const b=charRead('Judge',y,{voice:'Judge',sp:'nfl',game:'KC@DEN',market:'total',side:'over',price:-110,line:44.5,cf:0.6,date:today()});
      const o=charRead('Sim',{...x,date:'2026-10-17'},{voice:'Sim',sp:'nfl',game:'KC@DEN',market:'total',side:'under',price:-110,line:44.5,cf:0.6,date:'2026-10-17'});
      return{under:a&&a.worry,over:b&&b.story,old:o&&[o.worry,...o.story].join(' ')};})()`);
    T('an Under hears it as the worry: "overs have hit 8x% … the league has changed"',/overs have hit 8\d%/.test(r.under)&&/league has changed/.test(r.under),r.under);
    T('an Over hears it as part of the story',(r.over||[]).some(s=>/overs have hit/.test(s)),JSON.stringify(r.over));
    T('nothing dated Oct 17 hears the weather',!/overs have hit/.test(r.old||''),r.old);
    const before=w.eval(`JSON.stringify(get(VOICES_KEY,[]).map(x=>[x.id,x.cf]))`);
    w.__NOW=Date.parse('2026-10-26T14:00:00Z');const R2=w.eval(`(()=>{const R=worldRun(true);return{st:R.day.nfl.over.st,j:journalAll().filter(x=>x.kind==='world').length};})()`);
    T('the next day, still changed: no second journal entry (only the day it turns)',R2.st==='CHANGED'&&R2.j===1,JSON.stringify(R2));
    T('the weather never touches a confidence or a pick',w.eval(`JSON.stringify(get(VOICES_KEY,[]).map(x=>[x.id,x.cf]))`)===before);
    w.eval(`REC_VIEW='book';renderRecordsHub()`);const h=w.document.getElementById('recordsHub').innerHTML;
    T('the Book view shows the weather board',/🌦 The world/.test(h)&&/⛈/.test(h),h.length+' chars');}
  {const V=ledger(9,{hot:0.49,days:60,per:3});const w=boot({'d4.voices':V},Date.parse('2026-10-25T14:00:00Z'));await wait(1200);
    const R=w.eval(`(()=>{const R=worldRun(true);return{nfl:R.day.nfl,j:journalAll().filter(x=>x.kind==='world').length,born:R.born.length};})()`);
    T('the same world: nothing past luck, nothing journaled, no heir born',Object.values(R.nfl).every(o=>o.st==='STABLE'||o.st==='QUIET')&&R.j===0&&R.born===0,JSON.stringify(R));}
  {const V=ledger(4,{days:20,per:1});const w=boot({'d4.voices':V},Date.parse('2026-09-15T14:00:00Z'));await wait(1000);
    const R=w.eval(`worldRun(true).day.nfl`);T('a thin two weeks reads "not enough games yet" — never a guess',R&&Object.values(R).every(o=>o.st==='QUIET'),JSON.stringify(R));}
}catch(e){T('suite crashed',false,String(e&&e.stack||e).slice(0,500));}
  console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);})();
