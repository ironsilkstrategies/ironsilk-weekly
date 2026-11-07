/* v2.88.0 · Nov 7: "a master calibration that tightens up more per week… with the data we've stacked" and "perfect SGPs for
   each game, only what hits at 70%… more cohesiveness in certain characters heightens confidence… the Banker builds the best
   SGP games… 4–5 games a piece, 20–30 legs." Invented games and calls, no network. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nba.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nba.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  const RD=w.Date;const OFF=RD.parse('2026-11-07T16:40:00-06:00')-RD.now();class FD extends RD{constructor(...a){if(a.length)super(...a);else super(RD.now()+OFF);}static now(){return RD.now()+OFF;}}FD.parse=RD.parse;FD.UTC=RD.UTC;w.Date=FD;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;const D='2026-11-07';
  /* the pieces */
  T('the market\'s chance without the house\'s cut (-110 both ways = 50%)',Math.abs(E(`mcNoVig(-110,'spread')`)-0.5)<0.01&&Math.abs(E(`mcNoVig(-300,'ml')`)-0.721)<0.01);
  T('with no evidence the fit returns its prior exactly (sides: the market, untouched)',J(E(`mcFitLR([],[],[],[0,1,0],[1,1,1],5)`))==='[0,1,0]');
  const tr=E(`mcalTeamRows([{sp:'nba',date:'${D}',game:'NY@CLE',market:'spread',side:'home',line:-3.5,price:-110,voice:'Sim',simP:0.6,graded:true,hit:true},
    {sp:'nba',date:'${D}',game:'NY@CLE',market:'spread',side:'home',line:-3.5,price:-110,voice:'Judge',cf:0.58,graded:true,hit:true},
    {sp:'nba',date:'${D}',game:'NY@CLE',market:'spread',side:'away',line:3.5,price:-110,voice:'Coach',cf:0.55,graded:true,hit:false}],true)`);
  const home=tr.find(r=>r.side==='home');
  T('one row per leg: who backed it (2), who was against it (1), the market (50%), the outcome',home&&home.n===2&&home.no===1&&Math.abs(home.q-0.5)<0.01&&home.y===1&&home.e>0,J(home));
  const pr=E(`mcalPropRows([{sp:'nba',d:'${D}',player:'A B',team:'NY',k:'pts',thr:20,p:0.72,voice:'Sim',hit:true,mv:2},{sp:'nba',d:'${D}',player:'A B',team:'NY',k:'pts',thr:25,p:0.71,voice:'Trends',hit:false,mv:2},
    {sp:'nba',d:'${D}',player:'A B',team:'NY',k:'pts',thr:20,p:0.74,voice:'Judge',hit:true,mv:2}],true)`);
  const p20=pr.find(r=>r.thr===20),p25=pr.find(r=>r.thr===25);
  T('props: a character whose own line is higher clears every lower one (20+: 3 clear it, 25+: 1)',p20&&p20.nge===3&&p25&&p25.nge===1&&p20.y===1&&p25.y===0,J(pr));

  /* six weeks of invented history: sides priced fairly by the market; props where agreement matters (5 of 5 hit 85%, 1 of 5 hit 55%) */
  const V=[],P=[];let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
  const voices=['Sim','Most common','Trends','Coach','Judge'];
  for(let b=42;b>=1;b--){const d=E(`dayShift('${D}',-${b})`);
    for(let g=0;g<14;g++){const fav=-110-Math.round(rnd()*250);const q=E(`mcNoVig(${fav},'ml')`);const hit=rnd()<q;const gm=`A${g}@H${g}`;
      ['Sim','Judge','Brain'].forEach(v=>V.push({id:[d,gm,v].join('|'),sp:'nba',date:d,game:gm,market:'ml',side:'home',line:null,price:fav,voice:v,cf:q+0.03,graded:true,hit}));}
    for(let i=0;i<34;i++){const nge=1+Math.floor(rnd()*5);const hp=nge===5?0.85:nge>=3?0.72:0.55;const hit=rnd()<hp;
      voices.slice(0,nge).forEach(v=>P.push({id:[d,'p'+i,v].join('|'),sp:'nba',d,player:'P'+i,team:'T'+(i%10),k:'pts',thr:15,p:0.72,voice:v,hit,mv:2}));}}
  E(`set(VOICES_KEY,${J(V)});set(CPROP_KEY,${J(P)});Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);`);
  const M=E(`(()=>{const M=mcalRefit('test');return{rows:M.rows,tc:M.team.c,pc:M.prop.c,raceP:M.race.prop.best,raceT:M.race.team.best,hist:M.hist.length,wk:M.wk,S:M.race.prop.S};})()`);
  T('the stack holds every graded leg (42 days × 14 sides + 34 props)',M.rows===42*14+42*34,M.rows);
  T('the weekly race keeps the market for sides it already prices fairly',M.tc==='market'&&M.raceT==='market',J({tc:M.tc}));
  T('…and promotes a sharper prop model when it predicts better on games it never saw',M.pc!=='chars'&&M.S[M.pc].ll<M.S.chars.ll,J({pc:M.pc,ll:M.S[M.pc]&&M.S[M.pc].ll,raw:M.S.chars.ll}));
  const p5=E(`mcalProp({sp:'nba',k:'pts',pm:0.72,nge:5})`),p1=E(`mcalProp({sp:'nba',k:'pts',pm:0.72,nge:1})`);
  T('cohesion is learned, not assumed: the same 72% call reads near 80% when all five clear it, near 55% alone (they hit 85% / 55%)',p5>0.76&&p1<0.62&&p5-p1>0.18,J({p5,p1}));
  T('…sides stay on the market\'s own chance (-300 → ~72%)',Math.abs(E(`mcalTeam({sp:'nba',mk:'ml',price:-300,v:{Sim:0.8,Judge:0.78}})`)-E(`mcNoVig(-300,'ml')`))<0.01);
  T('each week\'s result is kept (the week-by-week record of the tightening)',M.hist===1&&M.wk==='2026-11-02');
  const card=E(`mcalCardHtml()`).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  T('the card shows the race, the winner and the proof',/Master calibration/.test(card)&&/Player props — the race/.test(card)&&/✓/.test(card)&&/walk-forward/.test(card),card.slice(0,300));
  T('…on the calibration page, above the Sim\'s own table',/🎯 Master calibration/.test(E('calibrationHtml()')));

  /* today: five games, props with and without the characters behind them */
  const TV=[],TP=[];const G=[['NY','CLE','2026-11-08T00:00Z'],['BKN','ATL','2026-11-08T00:30Z'],['WSH','OKC','2026-11-08T01:00Z'],['SA','POR','2026-11-08T03:00Z'],['ORL','GS','2026-11-08T03:30Z'],['DEN','IND','2026-11-07T22:00Z']];
  const sched={d:D,ts:Date.now(),games:G.map(([a,h,s],i)=>({id:'g'+i,away:{abbr:a},home:{abbr:h},start:s,__date:D})),up:[]};
  G.forEach(([a,h],gi)=>{const gm=a+'@'+h;['Sim','Judge','Brain','Banker'].forEach(v=>TV.push({id:[D,gm,v].join('|'),sp:'nba',date:D,game:gm,market:'ml',side:'home',line:null,price:-400,voice:v,cf:0.8}));
    for(let i=0;i<6;i++){const team=i%2?a:h;const nge=i<4?5:2;voices.slice(0,nge).forEach(v=>TP.push({id:[D,gm,i,v].join('|'),sp:'nba',d:D,player:`${gm}-P${i}`,team,k:i%3===0?'reb':'pts',thr:10+i,p:0.74,voice:v,hit:null,mv:2}));}});
  E(`set('d4.nbasched',${J(sched)});set(VOICES_KEY,${J(V.concat(TV))});set(CPROP_KEY,${J(P.concat(TP))});Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);BSTART_C=null;SGP_C=null;localStorage.removeItem(SGP_F_K);`);
  const S=E(`(()=>{const D=sgpData();return{games:D.games.map(g=>({g:g.game,n:g.sgp.length,banker:g.banker,legs:g.sgp.map(x=>x.kind+':'+(x.nge||x.n)+':'+Math.round(x.p*100))})),combos:D.combos.map(c=>({n:c.legs.length,g:c.games.length,j:c.joint,short:c.short}))};})()`);
  T('the game already under way (DEN@IND, 4 PM) is left out; the other five qualify',S.games.length===5&&!S.games.some(g=>g.g==='DEN@IND'),J(S.games.map(g=>g.g)));
  T('only legs at 70%+ with 4 of 5 characters behind them — the 2-of-5 props stay out',S.games.every(g=>g.legs.every(l=>!/^p:2:/.test(l)&&+l.split(':')[2]>=70)),J(S.games[0]));
  T('…the Banker\'s side counts (each game: the favorite + four 5-of-5 props)',S.games.every(g=>g.n===5&&g.banker&&g.legs.filter(l=>l[0]==='s').length===1),J(S.games[0]));
  T('every 4- and 5-game slate of the top games is laid out (C(5,4)+C(5,5)=6), likeliest first',S.combos.length===6&&S.combos.every((c,i,a)=>i===0||a[i-1].short||a[i-1].j>=c.j-1e-12)&&S.combos.some(c=>c.g===5&&c.n===25),J(S.combos));
  E(`sgpSet('per',9);sgpSet('coh',3);`);
  T('the bars move: ≤9 a game, 3 of 5 agree still keeps the 2-of-5 props out',E(`sgpData().games.every(g=>g.sgp.every(x=>x.kind!=='p'||x.nge>=3))`));
  E(`sgpSet('coh',4);sgpSet('per',7);`);
  const txt=E(`sgpText(sgpData().combos[0].legs,sgpData().combos[0].games)`);
  T('copy gives the book-ready list, game by game',/^NBA [A-Z]+@[A-Z]+\n  • /.test(txt)&&/\(\d+%\)/.test(txt),txt.slice(0,120));
  /* DraftKings' board (the feeds robot's props.json): milestone prices on the legs, 1st-half sides into the half lines */
  const PJ={v:1,ts:new Date().toISOString(),ev:{e1:{sp:'nba',a:'NY',h:'CLE',st:'2026-11-08T00:00Z',p:[['NY@CLE-P1','pts',11,-300,'m'],['NY@CLE-P1','pts',15,120,'m'],['NY@CLE-P1','pts',11.5,-140,'t'],['NY@CLE-P1','pts',11.5,110,'t']],
    half:{ml:{a:{price:150},h:{price:-180}},sp:{a:{line:3.5,price:-110},h:{line:-3.5,price:-110}},ou:{line:110.5,pr:[-112,-108]}}}}};
  E(`feedStoreProps(${J(PJ)});SGP_C=null;`);
  T('a prop leg carries DraftKings\' price on that exact line (11+ at -300) and the calibrated edge over it',E(`(()=>{const g=sgpData().games.find(g=>g.game==='NY@CLE');const x=g.sgp.find(x=>x.player==='NY@CLE-P1');return x&&x.dk===-300;})()`));
  T('…a total\'s untagged over/under pair is never priced (no guessing which is which)',E(`feedPropPrice('nba','NY@CLE-P1','pts',12)`).price===null);
  T('…and the 1st-half sides and moneylines fill the half lines when the day\'s paste has none (the total stays out)',E(`(()=>{const L=get(HALFLN_KEY,null);const g=L&&L.g['nba|NY@CLE'];return!!g&&g.ml.h.price===-180&&g.sp.a.line===3.5&&!g.ou&&g.src==='dk';})()`));
  E(`sgpSet('dk',1)`);
  T('"DraftKings lines only": every prop leg left is one DraftKings prices',E(`sgpData().games.every(g=>g.sgp.every(x=>x.kind!=='p'||x.dk!=null))`)&&E(`sgpData().games.length`)>=1);
  E(`sgpSet('dk',0)`);
  E(`TICKETTAB='build';BUILD_MODE='sgp';renderTickets()`);
  const tb=(w.document.getElementById('ticketBody')||{}).textContent||'';
  T('Tickets → Build → 🎯 Perfect SGPs: the slates, then the games in the Banker\'s order, every leg credited',/🎯 Perfect SGPs/.test(tb)&&/The slates — 6 combos/i.test(tb)&&/Banker's order/i.test(tb)&&/★ SIM/.test(tb),tb.slice(0,200));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
