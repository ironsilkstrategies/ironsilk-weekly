/* v2.95.0 · Nov 8: "a tougher brain… anyone can call a -10000 bet… handle everything between -350 and +350… a unit increase…
   find ways to give him the edge independently" · the Blend folds into him · heavy moneylines (-500+) leave every headline
   record and the official board (the Simulator is the heavy specialist; its other calls need 80%+) · a moneyline with no
   price never pays -110 again. Invented games, prices and records. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  const RD=w.Date;const OFF=RD.parse('2026-11-08T09:00:00-06:00')-RD.now();class FD extends RD{constructor(...a){if(a.length)super(...a);else super(RD.now()+OFF);}static now(){return RD.now()+OFF;}}FD.parse=RD.parse;FD.UTC=RD.UTC;w.Date=FD;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;const D='2026-11-08';
  const g={away:{abbr:'CLE'},home:{abbr:'NO'},__date:D};
  const wire=(s,ln,op)=>({v:1,ts:'x',src:{},rec:{},g:{['nfl|CLE@NO|'+D]:{sp:'nfl',st:D+'T18:00Z',a:'CLE',h:'NO',ln:ln||{spH:-3,mlH:-120,mlA:100,tot:44.5},op:op||null,s:s||{}}}});
  const run=(m,sides)=>{const got=[];w.__got=got;E(`brainToughCalls('nfl',${J(g)},'${m}',${J(sides)},{},(v,mk,sd,ex)=>window.__got.push({v,mk,sd,ex}))`);return got;};
  const ML=[{sd:'home',line:null,price:-120},{sd:'away',line:null,price:100}];
  E(`oracleStore(${J(wire({kalshi:{wp:0.60},poly:{wp:0.61}}))});Object.keys(ORA_G).forEach(k=>delete ORA_G[k]);`);
  const c1=run('ml',ML);const b=c1[0];
  T('the gap: the exchanges at ~60% NO vs the book\'s no-vig 52% → the Brain takes NO -120 with a real edge',b&&b.v==='Brain'&&b.sd==='home'&&b.ex.ev>=0.03&&b.ex.bc.gap>0&&b.ex.bG>=55,J(b&&b.ex));
  T('…and says why in plain words',b&&/edge \+\d/.test(b.ex.why[0])&&b.ex.why.some(x=>/the exchanges 6\d% vs the book's 52%/.test(x)),J(b&&b.ex.why));
  E(`oracleStore(${J(wire({kalshi:{wp:0.523}}))})`);T('no gap, no bet — most games he passes',run('ml',ML).length===0);
  E(`oracleStore(${J(wire({kalshi:{wp:0.86}},{spH:-9,mlH:-400,mlA:320,tot:44.5}))})`);
  T('the band: a -400 favorite is outside -350…+350, whatever the gap (the +320 side has no edge)',run('ml',[{sd:'home',line:null,price:-400},{sd:'away',line:null,price:320}]).length===0);
  E(`oracleStore(${J(wire({kalshi:{wp:0.33}},{spH:7,mlH:300,mlA:-380,tot:44.5}))})`);const lg=E(`brainSide('nfl',${J(g)},'ml',{sd:'home',line:null,price:300,oprice:-380},null,oracleFile('nfl','CLE','NO','${D}'),null,null)`);
  T('the longshot bias: a +300 dog carries a penalty, and needs a 6% edge',lg&&lg.bc.flb<0&&lg.why.some(x=>/longshots are overbet/.test(x)),J(lg));
  E(`oracleStore(${J(wire({},{spH:-3,mlH:-155,mlA:130,tot:44.5},{spH:-2.5,mlH:-135,mlA:115,tot:45.5}))})`);const F=E(`oracleFile('nfl','CLE','NO','${D}')`);
  const st=E(`brainSide('nfl',${J(g)},'ml',{sd:'home',line:null,price:-155,oprice:130},null,${J(F)},${J(F.ln)},${J(F.op)})`),sd=E(`brainSide('nfl',${J(g)},'ml',{sd:'away',line:null,price:130,oprice:-155},null,${J(F)},${J(F.ln)},${J(F.op)})`);
  T('steam: the favorite the line moved toward (-135 → -155) gets the nudge; the dog doesn\'t',st.bc.steam>0&&sd.bc.steam===0&&st.why.some(x=>/moved/.test(x)),J([st.bc,sd.bc]));
  E(`oracleStore(${J(wire({covers:{pub:{sp:82,n:900}}}))})`);const pb=E(`brainSide('nfl',${J(g)},'spread',{sd:'home',line:-3,price:-110,oprice:-110},null,oracleFile('nfl','CLE','NO','${D}'),null,null)`);
  T('the crowd: 82% of Covers players on NO -3 → a small fade of NO',pb.bc.pub<0&&pb.why.some(x=>/82% of the crowd/.test(x)),J(pb));
  /* probation, then official */
  const pick={voice:'Brain',sp:'nfl',market:'ml',side:'home',price:-120,bG:60,ev:0.1,date:D,game:'CLE@NO'};
  T('on probation: no official calls before 50 graded picks',E(`isOfficial(${J(pick)})`)===false&&!E('brainProof().proven'));
  const V=[];for(let i=0;i<60;i++)V.push({id:'b'+i,voice:'Brain',sp:'nfl',market:'ml',side:'home',price:-110,bG:58,ev:0.05,fb:0.5,bc:{gap:i%3===0?0.3:0,ora:0,steam:0,flb:0,pub:0},date:E(`dayShift('${D}',${i<30?0:0})`),game:'G'+i+'@H'+i,graded:true,hit:i%3===0?true:i%2===0,units:0,clv:0.4});
  V.forEach(x=>x.units=x.hit?0.909:-1);E(`set(VOICES_KEY,${J(V)});Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);BRN_PR=null;BRN_WC=null;COACH_B=null;`);
  const pr=E('brainProof()');T('proven once 50+ picks show units ≥ 0 and he beats the close',pr.n===60&&pr.proven===true,J(pr));
  T('…then official when his edge (after the Coach) is 4%+; not at 2%',E(`isOfficial(${J(pick)})`)===true&&E(`isOfficial(${J({...pick,bG:53})})`)===false);
  const Wt=E('brainWeights()');T('his weights refit on his own picks — the gap-driven ones all won, so the gap weighs more than its 0.7 prior',Wt.n===60&&Wt.gap>0.7,J(Wt));
  /* his score */
  E(`oracleStore(${J(wire({kalshi:{wp:0.60}}))});Object.keys(BRN_PS).forEach(k=>delete BRN_PS[k]);`);run('ml',ML);run('spread',[{sd:'home',line:-3,price:-110},{sd:'away',line:3,price:-110}]);run('total',[{sd:'over',line:44.5,price:-110},{sd:'under',line:44.5,price:-110}]);
  const ps=E(`brainPredFor('nfl',${J(g)})`);T('his own score from his chances (NO by about the spread, total near 44.5)',ps&&ps.h>ps.a&&Math.abs(ps.a+ps.h-44.5)<3,J(ps));
  T('…on every game he reads',E(`scoreCallsFor('nfl',${J(g)},{awayProj:17,homeProj:27},[])`).some(x=>x.voice==='Brain'));
  /* the Blend folds in */
  const mc=[];w.__mc=mc;E(`metaCalls('nfl',${J(g)},[{voice:'Sim',market:'ml',side:'home',simP:0.6,line:null}],{mlH:{price:-120},mlA:{price:100}},(v,m,s,ex)=>window.__mc.push(v))`);
  T('the Blend is folded into the Brain: no Blend calls from Nov 8',!mc.includes('Blend'),J(mc));
  /* the heavy lane */
  T('the heavy lane starts at -500',E('isHeavyML({market:"ml",price:-500})')===true&&E('isHeavyML({market:"ml",price:-499})')===false&&E('isHeavyML({market:"spread",price:-600})')===false&&E('BT_HEAVY')===-500);
  T('a heavy moneyline is never a character\'s official call from Nov 8 …',E(`isOfficial({voice:'Judge',sp:'nfl',market:'ml',side:'home',price:-700,cf:0.95,date:'${D}'})`)===false);
  T('…except the Simulator\'s, the heavy specialist',E(`isOfficial({voice:'Sim',sp:'nfl',market:'ml',side:'home',price:-700,cf:0.95,date:'${D}'})`)===true);
  T('the Simulator between -350 and +350: 75% isn\'t enough, 82% is',E(`isOfficial({voice:'Sim',sp:'nfl',market:'ml',side:'home',price:-150,cf:0.75,date:'${D}'})`)===false&&E(`isOfficial({voice:'Sim',sp:'nfl',market:'ml',side:'home',price:-150,cf:0.82,date:'${D}'})`)===true);
  T('history isn\'t rewritten: an Oct 30 call keeps the rule it was made under',E(`isOfficial({voice:'Sim',sp:'nfl',market:'ml',side:'home',price:-150,cf:0.75,date:'2026-10-30'})`)===true);
  T('the Coach and the Banker read heavy favorites as their own lane',E(`bkRole('ml','home',null,-600)`)==='heavy'&&E(`bkRole('ml','home',null,-300)`)==='fav');
  const HV=[{id:'h1',voice:'Judge',sp:'nfl',market:'ml',side:'home',price:-900,cf:0.95,date:D,game:'A@B',graded:true,hit:true,units:0.11},{id:'h2',voice:'Judge',sp:'nfl',market:'ml',side:'home',price:-150,cf:0.7,date:D,game:'C@D',graded:true,hit:false,units:-1}];
  E(`set(VOICES_KEY,${J(HV)});Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);HUB_CACHE=null;`);const R=E(`charDayRecord('${D}','nfl')`);const jr=(Array.isArray(R)?R:Object.values(R)).find(o=>o.v==='Judge');
  T('a character\'s record leaves the heavy lane out (the -900 win doesn\'t cover the -150 loss)',jr&&jr.w===0&&jr.l===1,J(jr));
  T('the records hub shows the heavy lane as its own row',!!E('hubData().M["Heavy ML lane"]'));
  /* units, honestly */
  E(`set('d4.closes',{'${D}':{'nfl|E@F':{ml:{home:{open:-450,close:-480},away:{open:350,close:370}}}}});Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);`);
  const u1=E(`vUnits({sp:'nfl',game:'E@F',date:'${D}',market:'ml',side:'home',price:null},true)`),u2=E(`vUnits({sp:'nfl',game:'X@Y',date:'${D}',market:'ml',side:'home',price:null},true)`),u3=E(`vUnits({sp:'nfl',game:'X@Y',date:'${D}',market:'spread',side:'home',price:null},true)`);
  T('a moneyline with no price takes its closing price (-480 pays 0.21), never -110',Math.abs(u1-100/480)<1e-6,String(u1));
  T('…with no close at all it counts in the record, not the units',u2===0&&E(`vUnits({sp:'nfl',game:'X@Y',date:'${D}',market:'ml',side:'home',price:null},false)`)===0);
  T('…spreads and totals without a price still settle at -110',Math.abs(u3-100/110)<1e-6);
  E(`set(VOICES_KEY,[{id:'r1',voice:'Sim',sp:'nfl',game:'E@F',date:'${D}',market:'ml',side:'home',price:null,graded:true,hit:true,units:0.909}]);Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);`);
  T('the stored ledger is re-scored once (0.909 → 0.21 from the close)',E('vUnitsRepair()')===1&&Math.abs(E('get(VOICES_KEY,[])[0].units')-100/480)<1e-6);
  T('his description',/the tough middle/.test(E('CHARS.Brain.school'))&&/retired/.test(E('CHARS.Blend.school'))&&/heavy moneylines/.test(E('CHARS.Sim.school')));
  E(`set(VOICES_KEY,${J(V)});Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);BRN_PR=null;`);const card=E('brainCardHtml()').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  T('his card: proven or on probation, his units and CLV, what drove his picks, his weights',/The Brain — the tough middle/.test(card)&&/Proven/.test(card)&&/CLV \+0\.4/.test(card)&&/the gap/.test(card)&&/refit on 60/.test(card),card.slice(0,400));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
