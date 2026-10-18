/* v2.44 · STATUS — the health protocol: CLV on every call, 🟢🟡🟠🔴🔥🍀 per character × sport,
   judged against its sport's pool, broken-input days left out, only a call's own moved line as its
   CLV — WATCHING ONLY (it benches no one and trims no stake), fixed for the day at the freeze. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const D='2026-10-18',T0=Date.parse('2026-10-18T14:00:00Z');
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
function boot(store){return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.__NOW=T0;const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[w.__NOW]))}static now(){return w.__NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.setupDone','1');Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,JSON.stringify(v)));}}).window;}
const day=i=>new Date(Date.parse('2026-10-17T12:00:00Z')-i*864e5).toISOString().slice(0,10);
/* 40 graded NHL calls in the last 4 weeks at 65% confidence; `wins` of them hit; the market's close vs the locked price */
function hist(voice,wins,clvMove){const V=[],C={};for(let i=0;i<40;i++){const d=day(i%20),g=voice.slice(0,2).toUpperCase()+i+'@B'+i,lk=Date.parse(d+'T15:00:00Z');
  V.push({id:voice+i,sp:'nhl',date:d,game:g,voice,market:'ml',side:'home',line:null,price:-150,cf:0.65,lk,graded:true,hit:i<wins,units:i<wins?0.667:-1});
  if(clvMove!=null){const k='nhl|'+g+'|ml|home';(C[d]=C[d]||{})[k]={open:{line:null,price:-150,ts:lk-3600e3},close:{line:null,price:clvMove>0?-175:-130,ts:lk+3600e3}};}}return{V,C};}
/* the rest of the sport's pool: three characters winning exactly what their 65% promised */
function pool(){const V=[];['Coach','Power','Scout'].forEach(v=>{for(let i=0;i<40;i++){const d=day(i%20);V.push({id:v+'p'+i,sp:'nhl',date:d,game:v.slice(0,2)+'P'+i+'@Q'+i,voice:v,market:'ml',side:'home',line:null,price:-150,cf:0.65,lk:Date.parse(d+'T15:00:00Z'),graded:true,hit:i<26,units:i<26?0.667:-1});}});return V;}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  {const w=boot({});await wait(1200);
    const C=w.eval('bookCheck(BOOKS.status)');T('the health book: every turn exists, every page reaches an ending',C.ok,C.errs.join(' | '));
    const X=w.eval('bookExplore(BOOKS.status,statusRules)');T(`every combination (${X.n}) ends, and none breaks a rule (never benched without the market confirming, never judged on too few calls)`,X.bad.length===0&&X.broke.length===0,JSON.stringify(X.broke.slice(0,2)));
    T('every health ending is reachable',['LEARNING','GREEN','YELLOW','ORANGE','RED','HEATER','LUCKY'].every(e=>X.ends[e]>0),JSON.stringify(X.ends));}
  /* CLV: only a line that moved after the call was locked counts */
  {const w=boot({});await wait(1000);
    const r=w.eval(`(()=>{const lk=Date.parse('2026-10-17T15:00:00Z');set(CLV_KEY,{'2026-10-17':{'nhl|X@Y|ml|home':{open:{price:-150,ts:lk-36e5},close:{price:-175,ts:lk+36e5}},'nhl|P@Q|ml|home':{open:{price:-150,ts:lk-72e5},close:{price:-175,ts:lk-36e5}}}});
      const a=callClv({sp:'nhl',game:'X@Y',market:'ml',side:'home',date:'2026-10-17',price:-150,lk});const b=callClv({sp:'nhl',game:'P@Q',market:'ml',side:'home',date:'2026-10-17',price:-150,lk});
      const c=callClv({sp:'nhl',game:'X@Y',market:'ml',side:'home',date:'2026-10-17',price:-150});return{a,b,c};})()`);
    T('a call locked at -150 that closed -175 beat the close (+3.6 pts)',r.a>3&&r.a<4,JSON.stringify(r));
    T('a move BEFORE the lock, or a call never locked, gets no CLV (never a fake zero)',r.b===null&&r.c===null,JSON.stringify(r));}
  /* the market's own open → close rides along with every parsed box score (DraftKings via ESPN) */
  {const w=boot({});await wait(1000);
    const j={header:{league:{slug:'nhl',uid:'s:70~l:90'},competitions:[{date:'2026-10-17T16:00Z',status:{type:{state:'post'}},competitors:[{homeAway:'away',team:{abbreviation:'NJ'}},{homeAway:'home',team:{abbreviation:'WSH'}}]}]},
      pickcenter:[{provider:{name:'Draft Kings'},moneyline:{home:{open:{odds:'-148'},close:{odds:'-118'}},away:{open:{odds:'+124'},close:{odds:'-102'}}},pointSpread:{home:{open:{line:'-1.5',odds:'+170'},close:{line:'-1.5',odds:'+220'}},away:{open:{line:'+1.5',odds:'-205'},close:{line:'+1.5',odds:'-270'}}},
        total:{over:{open:{line:'o5.5',odds:'-135'},close:{line:'o6.5',odds:'+114'}},under:{open:{line:'u5.5',odds:'+114'},close:{line:'u6.5',odds:'-135'}}}}]};
    const r=w.eval(`(()=>{const ok=fbpParseHockey(${JSON.stringify(j)})!==undefined;const base={sp:'nhl',game:'NJ@WSH',date:'2026-10-17'};
      return{ok,cap:!!closeOf('nhl','NJ@WSH','2026-10-17'),away:marketMove({...base,market:'ml',side:'away'}),home:marketMove({...base,market:'ml',side:'home'}),over:marketMove({...base,market:'total',side:'over'}),under:marketMove({...base,market:'total',side:'under'})};})()`);
    T('a parsed final stores the market\'s open and close (no extra download)',r.cap,JSON.stringify(r));
    T('…NJ went +124 → -102: the market moved toward NJ (+5.9 pts) and away from WSH',r.away>5&&r.home<-5,JSON.stringify(r));
    T('…the total went 5.5 → 6.5: toward the over (+8 pts), away from the under',r.over===8&&r.under===-8,JSON.stringify(r));}
  /* the protocol on real-shaped histories */
  const cases=[['RED',hist('Judge',14,-1)],['ORANGE',hist('Judge',14,null)],['YELLOW',hist('Judge',14,+1)],['GREEN',hist('Judge',26,null)],['HEATER',hist('Judge',37,+1)],['LUCKY',hist('Judge',37,-1)]];
  for(const [want,H] of cases){const w=boot({'d4.voices':[...H.V,...pool()],'d4.clv':H.C});await wait(900);w.eval('clvStampAll()');
    const o=w.eval(`statusSnap(today(),true).by['Judge|nhl']`);T(`${want}: ${o&&o.why}`,o&&o.st===want,JSON.stringify(o));}
  /* the meter's miss is nobody's fault: every character in a sport under its confidence → judged against the pool */
  {const V=[...hist('Judge',14,null).V,...hist('Sim',15,null).V,...hist('Coach',14,null).V,...hist('Power',13,null).V];const w=boot({'d4.voices':V});await wait(900);
    const r=w.eval(`(()=>{const S=statusSnap(today(),true);return{by:Object.fromEntries(Object.entries(S.by).map(([k,o])=>[k,o.st+' z='+o.z+' raw='+o.zr])),pool:S.pool};})()`);
    T('a whole sport under its confidence (the meter\'s miss): no character is flagged for it',Object.values(r.by).every(s=>/^(GREEN|YELLOW)/.test(s)),JSON.stringify(r));
    w.eval(`REC_VIEW='book';renderRecordsHub()`);T('…and the board says it\'s the confidence meter\'s miss',/confidence meter's miss/.test(w.document.getElementById('recordsHub').innerHTML));}
  /* days a sport's inputs were known broken are left out (the flat-55 college sim) */
  {const V=[];for(let i=0;i<40;i++){const d='2026-10-'+String(2+(i%14)).padStart(2,'0');V.push({id:'cf'+i,sp:'ncaaf',date:d,game:'C'+i+'@D'+i,voice:'Sim',market:'total',side:'over',line:55,price:-110,cf:0.7,graded:true,hit:i<10,units:i<10?0.909:-1});}
    const w=boot({'d4.voices':V});await wait(900);const o=w.eval(`statusSnap(today(),true).by['Sim|ncaaf']`);
    T('Sim\'s college totals from the flat-55 days (Sep 28 → Oct 16) are never held against it',!o,JSON.stringify(o));}
  /* WATCHING ONLY: what the protocol would do is shown, nothing official changes */
  {const H=hist('Judge',12,-1);const H2=hist('Sim',14,null);const V=[...H.V,...H2.V,...pool()];
    V.push({id:'t1',sp:'nhl',date:D,game:'DAL@CHI',voice:'Judge',market:'ml',side:'away',price:-150,cf:0.78},{id:'t2',sp:'nhl',date:D,game:'CAR@WPG',voice:'Sim',market:'ml',side:'away',price:-140,cf:0.72},
      {id:'t3',sp:'nhl',date:D,game:'OTT@PHI',voice:'Sim',market:'ml',side:'away',price:-144,cf:0.75},{id:'t0',sp:'nhl',date:'2026-10-17',game:'DAL@CHI',voice:'Judge',market:'ml',side:'away',price:-150,cf:0.78});
    const w=boot({'d4.voices':V,'d4.clv':{...H.C}});await wait(900);w.eval('clvStampAll()');
    const r=w.eval(`(()=>{const V=get(VOICES_KEY,[]);const f=id=>isOfficial(V.find(x=>x.id===id));return{judge:statusOf('Judge','nhl',today()),sim:statusOf('Sim','nhl',today()),t1:f('t1'),t2:f('t2'),t3:f('t3'),t0:f('t0')};})()`);
    T('🔴 the Judge in NHL reads broken — and its 78% call today is STILL official (watching only)',r.judge==='RED'&&r.t1===true,JSON.stringify(r));
    T('🟠 the Sim in NHL reads warning — its 72% and 75% calls both stay official (no higher bar)',r.sim==='ORANGE'&&r.t2===true&&r.t3===true,JSON.stringify(r));
    T('…and every earlier day is untouched (the Oct 17 call is official)',r.t0===true,JSON.stringify(r));
    const S1=w.eval(`get(STATUS_KEY,{})[today()]`);T('before the freeze the day\'s health is provisional',S1&&S1.prov===true);
    w.eval(`set(FREEZE_KEY,{d:today(),ts:Date.now(),why:'test'});STATUS_MEMO=null;statusSnap(today())`);const S2=w.eval(`get(STATUS_KEY,{})[today()]`);
    T('at the freeze it\'s fixed for the day, and the changes go in the journal',S2&&S2.prov===false&&S2.final>0&&w.eval(`journalAll().some(x=>x.kind==='status'&&/RED/.test(x.sig))`),JSON.stringify(w.eval('journalAll().map(x=>x.sig)')));
    w.eval(`REC_VIEW='book';renderRecordsHub()`);const h=w.document.getElementById('recordsHub').innerHTML;
    T('the Book view shows the health board',/Health — every character, every sport/.test(h)&&/🔴/.test(h));}
}catch(e){T('suite crashed',false,String(e&&e.stack||e).slice(0,400));}
  console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);})();
