const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const vc=new (require('jsdom').VirtualConsole)();const errors=[];vc.on('jsdomError',e=>errors.push(String(e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-13T15:00:00Z')]))}static now(){return RD.parse('2026-10-13T15:00:00Z')}}w.Date=FD;
  w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
const J=x=>JSON.stringify(x);const clr=()=>w.eval('for(const k in RO_CACHE)delete RO_CACHE[k];');
setTimeout(async()=>{try{
  /* ── 🏦 the Banker ─────────────────────────────────────────── */
  T('roster: the Banker is a character and never votes (derived from the Blend)',w.eval(`!!CHARS.Banker&&CHAR_ORDER.includes('Banker')&&!isVoter('Banker')&&VOTER_ORDER.length===9`));
  w.eval(`blendSideP=function(sp,g,m,sd,mp){return mp};brainSideP=function(){return null};marketFair=function(){return null};`);
  const bank=(simP,ph,pa)=>{const got=[];w.__g=got;w.eval(`metaCalls('nfl',{away:{abbr:'A'},home:{abbr:'H'}},[{voice:'Sim',market:'ml',side:'home',simP:${simP},line:null}],{mlH:{price:${ph}},mlA:{price:${pa}}},(v,m,s,ex)=>window.__g.push({v,m,s,ex}))`);return got.filter(x=>x.v==='Banker');};
  const b1=bank(0.60,-110,-110);T('Banker plays the side whose price the calibrated chance beats by 3%+',b1.length===1&&b1[0].s==='home'&&Math.abs(b1[0].ex.ev-0.1455)<0.002,J(b1));
  T('…and stays quiet when no price clears +3% EV',bank(0.52,-110,-110).length===0);
  T('…and never takes a price shorter than -300',bank(0.85,-400,300).length===0||bank(0.85,-400,300)[0].s==='away',J(bank(0.85,-400,300)));

  /* ── 🏆 squads ─────────────────────────────────────────────── */
  w.eval(`(function(){const V=[];for(let i=0;i<40;i++){const d='2026-09-'+String(10+(i%20)).padStart(2,'0');const g='A'+i+'@H'+i;const hit=i%5!==0;
      ['Sim','Judge','Most common'].forEach(v=>V.push({id:v+i,sp:'nfl',game:g,date:d,voice:v,market:'ml',side:'home',graded:true,hit,units:hit?0.9:-1}));
      ['Coach','Trends','Pred'].forEach(v=>V.push({id:v+i,sp:'nfl',game:g,date:d,voice:v,market:'ml',side:'away',graded:true,hit:!hit,units:hit?-1:0.9}));}
    V.push(...['Sim','Judge','Most common','Coach'].map(v=>({id:'t'+v,sp:'nfl',game:'X@Y',date:'2026-10-13',voice:v,market:'ml',side:'home',price:-110})));set(VOICES_KEY,V);})()`);clr();
  const Q=w.eval('squadCompute()');
  T('squads: the winning trio is proven (both halves)',(Q.best[3]||[]).some(s=>s.m.join('+')==='Judge+Most common+Sim'&&s.w===32&&s.n===40),J(Q.best[3]&&Q.best[3].map(s=>[s.m.join('+'),s.w,s.n])));
  T('squads: the losing trio is named too',(Q.worst[3]||[]).some(s=>s.m.join('+')==='Coach+Pred+Trends'),J(Q.worst[3]&&Q.worst[3].map(s=>s.m.join('+'))));
  T('squads: 4- and 5-character squads are evaluated too',Array.isArray(Q.best[4])&&Array.isArray(Q.best[5])&&Array.isArray(Q.worst[5])&&/k<=Math.min\(5,vs.length\)/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8')));
  clr();const on=w.eval(`squadOn('nfl','X@Y','2026-10-13','ml','home')`);T('a proven squad all on today\'s pick is found',on&&on.best&&on.best.m.join('+')==='Judge+Most common+Sim',J(on&&on.best));
  const ca=w.eval(`chemLegAdj({voice:'Judge',sp:'nfl',game:'X@Y',date:'2026-10-13',market:'ml',side:'home'})`);T('squad bonus reaches the parlay leg (capped)',ca.why.some(x=>/squad/.test(x))&&ca.adj>0&&ca.adj<=0.03,J(ca));
  T('squads show in Records → Characters (chemistry card)',/Squads/.test(w.eval('chemHtml()')));

  /* ── 🧭 researched situations + player tags ───────────────── */
  w.__F={'nfl:BUF@MIA':{d:'2026-09-14',a:24,h:20},'nfl:NYJ@BUF':{d:'2026-09-21',a:10,h:31},'nfl:BUF@NE':{d:'2026-09-28',a:27,h:13},'nfl:CLE@BUF':{d:'2026-10-05',a:9,h:30},'nfl:BUF@HOU':{d:'2026-10-09',a:23,h:17},
    'nfl:MIA@NE':{d:'2026-09-28',a:20,h:21}};
  w.eval(`allFinals=function(){return window.__F};`);
  const fs1=w.eval(`factorsFor('nfl',{away:{abbr:'BUF'},home:{abbr:'MIA'},date:'2026-10-13T17:00:00Z'},{side:'away',market:'ml',price:-150})`);
  T('short week, opponent off a bye, division game, red-hot form are tagged',['shortweek','oppoffbye','divgame','hot5','roadfav','restplus'].every(k=>fs1.includes(k))===false?['shortweek','oppoffbye','divgame','hot5','roadfav'].every(k=>fs1.includes(k)):true,J(fs1));
  const fs2=w.eval(`factorsFor('nfl',{away:{abbr:'SEA'},home:{abbr:'BUF'},date:'2026-10-18T17:00:00Z'},{side:'away',market:'ml',price:120})`);
  T('west-coast team at a 1pm ET kickoff is tagged (body clock)',fs2.includes('westearly'),J(fs2));
  const fs3=w.eval(`factorsFor('nfl',{away:{abbr:'NYJ'},home:{abbr:'SF'},date:'2026-10-19T00:20:00Z'},{side:'home',market:'spread',line:3.5})`);
  T('west-coast team at night vs an Eastern team + home dog are tagged',fs3.includes('westnight')&&fs3.includes('homedog'),J(fs3));
  T('every new tag has a plain-English label',['shortweek','offbye','westearly','westnight','3in4','talent+','qbstar','goaliebust','homedog','divgame'].every(k=>!!w.eval(`FAC_LAB[${J(k)}]`)));
  /* talent tags from the scouting ledger */
  w.eval(`SCOUT_MEM.nfl={v:1,p:{},t:{},fed:{},bf:null};SCOUT_BOARD={};SCOUT_PRIM={};`);
  const teams=['ELT','BST','T03','T04','T05','T06','T07','T08','T09','T10','T11','T12'];let ev=1;
  for(let r=0;r<4;r++)for(let i=0;i<12;i+=2){const a=teams[(i+r*2)%12],h=teams[(i+1+r*2)%12];
    const qb=t=>t==='ELT'?{'C/ATT':'27/32',YDS:'360',TD:'4',INT:'0',SACKS:'0-0'}:t==='BST'?{'C/ATT':'10/30',YDS:'100',TD:'0',INT:'3',SACKS:'6-40'}:{'C/ATT':'20/32',YDS:'230',TD:'1',INT:'1',SACKS:'2-12'};
    const tm=t=>({passing:[{name:t+' QB',...qb(t)}],rushing:[{name:t+' RB',CAR:'15',YDS:t==='ELT'?'120':'60',TD:'1'}],receiving:[{name:t+' WR',REC:'6',YDS:'80',TD:'1',TGTS:'8'}],defensive:[{name:t+' EDGE',TOT:'4',SACKS:t==='ELT'?'3':'1',TFL:'1','QB HTS':'2',PD:'0'}],ints:[]});
    w.__B={state:'post',date:'2026-10-0'+(r+1),teamStats:{[a]:tm(a),[h]:tm(h)}};w.eval(`scoutFeed('nfl','e${ev}',window.__B)`);ev++;}
  w.eval('SCOUT_BOARD={};SCOUT_PRIM={};');
  const ft=w.eval(`factorsFor('nfl',{away:{abbr:'BST'},home:{abbr:'ELT'},date:'2026-10-13T17:00:00Z'},{side:'home',market:'ml',price:-200})`);
  T('player tags: elite QB, bust opposing QB, talent edge and a unit mismatch',['qbstar','oppqbbust','talent+','mismatch+'].every(k=>ft.includes(k)),J(ft));
  const R=w.eval(`scoutDb('nfl').p.eltqb`);T('last-5 game lines are kept per player (with opponent)',R&&R.l5&&R.l5.length===4&&R.l5[0].v.pyd===360&&!!R.l5[0].o,R&&J(R.l5&&R.l5[0]));

  /* ── 📝 the reasons get players ───────────────────────────── */
  w.eval(`NFL_GAMES.length=0;NFL_GAMES.push({id:'gx',away:{abbr:'BST'},home:{abbr:'ELT'},abstract:'pre',date:'2026-10-13T17:00:00Z'});NFL_SIMS.gx={awayProj:13.4,homeProj:30.2,aw:0.12,hw:0.88};`);
  const P=w.eval(`pickWhyPlayers({sp:'nfl',game:'BST@ELT',m:'ml',sd:'home',date:'2026-10-13',price:-200},'ELT','BST','BST','ELT')`);
  const all=P.B.join(' | ');
  T('reasons: projected final score',/Projected final: BST 13, ELT 30/.test(all),P.B[0]);
  T('reasons: key players with their last 5 games',/ELT key players — ELT QB ⭐: last 4: 360 pass yds, 4\.0 TD, 0\.0 INT a game/.test(all),(P.B.find(b=>/key players/.test(b))||'').slice(0,160));
  T('reasons: stars, busts and the mismatch',/⚔️ ELT/.test(all)&&/Stars & busts in this game/.test(all));
  T('reasons: how each team plays',/Style: .*throws on \d+% of its plays/.test(all));
  T('reasons: the situations in play, and whether they\'re proven yet',/Situations: .*(testing|proven)/.test(all));
  T('the reel script leads with the projected final',/projected final/i.test(P.S.join(' ')));

  /* ── 🧊 the master-evaluation freeze ───────────────────────── */
  w.eval(`(function(){const V=get(VOICES_KEY,[]).filter(x=>x.date!=='2026-10-13');
      V.push({id:'f1',sp:'nfl',game:'BST@ELT',date:'2026-10-13',voice:'Coach',market:'ml',side:'away',price:170},{id:'f2',sp:'nfl',game:'BST@ELT',date:'2026-10-13',voice:'Judge',market:'ml',side:'home',price:-200});set(VOICES_KEY,V);})()`);
  w.eval('voicesLog=function(){return 0};');   /* isolate the freeze from the live call builder */
  T('the first intake of the day saves every character\'s pre-intake call',w.eval('preIntakeSnap()')===2&&w.eval(`get(PREINT_KEY,{})['2026-10-13'].c.f1`)==='away|');
  w.eval(`(function(){const V=get(VOICES_KEY,[]);V.find(x=>x.id==='f1').side='home';set(VOICES_KEY,V);})()`);   /* the Coach flips after the intake */
  T('a second intake never overwrites the pre-intake read',w.eval('preIntakeSnap()')===0&&w.eval(`get(PREINT_KEY,{})['2026-10-13'].c.f1`)==='away|');
  const fz=w.eval(`evalFreeze('nfl')`);
  T('eval freeze locks every call and counts the flips',fz.n===2&&fz.fl===1&&w.eval(`get(VOICES_KEY,[]).filter(x=>x.date==='2026-10-13').every(x=>x.lk&&x.pi)`),J(fz));
  T('the sim\'s numbers are locked with the eval',J(w.eval(`simLockFor('nfl','BST@ELT','2026-10-13')`))===J({a:13.4,h:30.2,aw:0.12,hw:0.88}));
  T('locked calls are never overwritten by a later re-read',/V\[i\]\.lk\)return;V\[i\]=c;/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8')));
  w.eval(`apRun=function(){return{steps:[]}};brainLearnAll=function(){return{}};`);
  const prep=w.eval(`evalPrep('nfl')`);T('re-running the eval re-opens today\'s calls before it re-locks',prep.find(s=>s.k==='unlock').n===2&&prep.map(s=>s.k).join(',')==='learn,autopilot,unlock,resim,reread',J(prep));
  w.eval(`evalFreeze('nfl');(function(){const V=get(VOICES_KEY,[]);V.forEach(x=>{if(x.date==='2026-10-13'){x.graded=true;x.hit=x.side==='home';x.units=x.hit?0.5:-1;}});set(VOICES_KEY,V);})()`);clr();
  const IE=w.eval('intakeEffect()');T('intake effect: the Coach\'s post-intake flip graded as a win',IE.Coach&&IE.Coach.flip===1&&IE.Coach.fw===1&&IE.Judge&&IE.Judge.flip===0,J(IE));
  T('football + hockey evals run the prep first',/function runFootballEval\(sp\)\{try\{if\(typeof evalPrep/.test(fs.readFileSync(path.join(W,'football-engine.js'),'utf8'))&&/function runNHLMasterEval\(\)\{try\{if\(typeof evalPrep/.test(fs.readFileSync(path.join(W,'nhl-engine.js'),'utf8')));

  /* ── 🎚 ideology floors ───────────────────────────────────── */
  w.eval(`(function(){const V=get(VOICES_KEY,[]);for(let i=0;i<80;i++){const d='2026-08-'+String(1+Math.floor(i/3)).padStart(2,'0');const pP=0.5+((i*7)%40)/100;const hit=pP>=0.62?(i%4!==0):(i%3===0);
      V.push({id:'pw'+i,sp:'nhl',game:'P'+i+'@Q'+i,date:d,voice:'Power',market:'ml',side:'home',price:-110,pP,graded:true,hit,units:hit?0.91:-1});}set(VOICES_KEY,V);})()`);clr();
  w.eval('ideoTune(true)');const I=w.eval(`get(IDEO_KEY,null).by['Power|nhl|ml']`);
  T('ideology: a confidence floor is fit on old games and kept only if it holds on unseen ones',I&&I.fl!=null&&I.adopted===true&&I.hoU>I.hoAll,J(I));
  T('a call under the adopted floor is caught (kept out of parlays)',!!w.eval(`ideoLow({voice:'Power',sp:'nhl',market:'ml',pP:0.52,price:-110})`)&&!w.eval(`ideoLow({voice:'Power',sp:'nhl',market:'ml',pP:0.8,price:-110})`));

  /* ── 🛠 autopilot + engine room ───────────────────────────── */
  const er=w.eval('engineRoomHtml()');
  T('Engine Room renders the plain-English summary and every section',/Engine Room/.test(er)&&/Autopilot loops/.test(er)&&/absorbed/.test(er)&&/Situations being tested/.test(er)&&/Ideology floors/.test(er)&&/freeze/.test(er));
  T('Records has an Engine Room tab',/'engine','🛠 Engine Room'/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8')));
  T('autopilot runs 15 loops in order (v2.31: the confidence meter learns right after grading; v2.44: the health check right after it)',w.eval('AP_STEPS.map(s=>s[0]).join(",")')==='learn,voices,conf,status,factors,feel,chem,squads,scout,ideo,parlays,props,banker,cal,mlbcal');
  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},3000);
