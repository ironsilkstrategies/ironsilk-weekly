const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const vc=new (require('jsdom').VirtualConsole)();const errors=[];vc.on('jsdomError',e=>errors.push(String(e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-13T15:00:00Z')]))}static now(){return RD.parse('2026-10-13T15:00:00Z')}}w.Date=FD;
  w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
const J=x=>JSON.stringify(x);
setTimeout(async()=>{try{
  /* ── 1. CHEMISTRY ─────────────────────────────────────────────── */
  /* 60 graded markets over 10 days. Judge & Sim agree on 40 (Judge hits 30), split on 20 (Judge hits 6) → Sim is Judge's partner.
     Coach splits from Sim 30 times and Sim wins 22 → Sim is Coach's nemesis. */
  w.eval(`(function(){const V=[];let id=0;const days=[...Array(10)].map((_,i)=>'2026-10-0'+i).map(d=>d.replace('-0','-0'));
    for(let i=0;i<60;i++){const d='2026-09-'+String(20+(i%10)).padStart(2,'0');const g='A'+i+'@H'+i;const agree=i<40;const jh=agree?(i%4!==0):(i%10<3);
      V.push({id:'j'+i,sp:'nfl',game:g,date:d,voice:'Judge',market:'ml',side:'home',hit:jh,graded:true,units:jh?0.9:-1});
      V.push({id:'s'+i,sp:'nfl',game:g,date:d,voice:'Sim',market:'ml',side:agree?'home':'away',hit:agree?jh:!jh,graded:true,units:0});}
    for(let i=0;i<30;i++){const d='2026-09-'+String(20+(i%10)).padStart(2,'0');const g='C'+i+'@D'+i;const sw=i%15<11;
      V.push({id:'c'+i,sp:'nfl',game:g,date:d,voice:'Coach',market:'total',side:'over',hit:!sw,graded:true,units:0});
      V.push({id:'t'+i,sp:'nfl',game:g,date:d,voice:'Sim',market:'total',side:'under',hit:sw,graded:true,units:0});}
    set(VOICES_KEY,V);for(const k in RO_CACHE)delete RO_CACHE[k];})()`);
  w.eval('(()=>{for(const k in RO_CACHE)delete RO_CACHE[k]})()');
  const I=w.eval('chemIdx()');
  T('chemistry: pairs counted both ways',I.P['Judge>Sim'].ag.n===40&&I.P['Judge>Sim'].sp.n===20,J(I.P['Judge>Sim'].ag)+J(I.P['Judge>Sim'].sp));
  const RJ=w.eval('chemRead("Judge")');
  T('Judge\'s partner is the Sim (agreeing lifts it, held in both halves)',RJ&&RJ.partner&&RJ.partner.b==='Sim'&&RJ.partner.held&&RJ.partner.lift>0.04,RJ&&J(RJ.partner&&{b:RJ.partner.b,l:RJ.partner.lift}));
  const RC=w.eval('chemRead("Coach")');
  T('Coach\'s nemesis is the Sim (wins 22 of 30 splits)',RC&&RC.nemesis&&RC.nemesis.b==='Sim'&&RC.nemesis.rec==='22-8',RC&&J(RC.nemesis));
  /* today's leg: the Sim agrees with the Judge → bonus; disagrees → penalty; capped ±3 */
  w.eval(`(function(){const V=get(VOICES_KEY,[]);V.push({id:'tj',sp:'nfl',game:'X@Y',date:'2026-10-13',voice:'Judge',market:'ml',side:'home',price:-110},{id:'ts',sp:'nfl',game:'X@Y',date:'2026-10-13',voice:'Sim',market:'ml',side:'home',price:-110});set(VOICES_KEY,V);(()=>{for(const k in RO_CACHE)delete RO_CACHE[k]})();})()`);
  const A1=w.eval(`chemLegAdj({voice:'Judge',sp:'nfl',game:'X@Y',date:'2026-10-13',market:'ml',side:'home'})`);
  const A2=w.eval(`chemLegAdj({voice:'Judge',sp:'nfl',game:'X@Y',date:'2026-10-13',market:'ml',side:'away'})`);
  T('partner on the same side lifts the leg, opposite side cuts it',A1.adj>0&&A2.adj<0&&/agrees/.test(A1.why[0]||'')&&/disagrees/.test(A2.why[0]||''),J([A1,A2]));
  T('chemistry moves a leg ±3 points at most',Math.abs(A1.adj)<=0.03&&Math.abs(A2.adj)<=0.03);
  const ch=w.eval('chemHtml()');T('chemistry table renders in Records',/Chemistry/.test(ch)&&/best with/.test(ch)&&/nemesis/.test(ch));

  /* ── 2. PARLAY HUB — props ticket ─────────────────────────────── */
  w.eval(`NFL_GAMES.length=0;NFL_GAMES.push({id:'g1',away:{abbr:'BUF'},home:{abbr:'MIA'},abstract:'pre'},{id:'g2',away:{abbr:'KC'},home:{abbr:'DEN'},abstract:'pre'},{id:'g3',away:{abbr:'DAL'},home:{abbr:'PHI'},abstract:'pre'})`);
  w.eval(`cparCands=function(){return[{c:{sp:'nfl',game:'BUF@MIA',market:'ml',side:'away',price:-150,voice:'Sim'},p:0.66,score:0.7,why:['x']},{c:{sp:'nfl',game:'KC@DEN',market:'ml',side:'away',price:-130,voice:'Sim'},p:0.62,score:0.66,why:[]}];}`);
  const calls=[{voice:'Sim',sp:'nfl',player:'Josh Allen',team:'BUF',k:'ptd',thr:2,cal:0.80,fav:null,rec:null,why:''},
               {voice:'Sim',sp:'nfl',player:'Jalen Hurts',team:'PHI',k:'py',thr:200,cal:0.78,fav:'fav',rec:'5-1',why:''},
               {voice:'Sim',sp:'nfl',player:'Bad Call',team:'PHI',k:'py',thr:200,cal:0.90,fav:'fade',rec:'1-5',why:''}];
  w.__C=calls;const X=w.eval(`cpxBuild('Sim',[],'2026-10-13',window.__C)`);
  T('props ticket: built with at least one prop leg',X&&X.props>=1&&X.legs.length>=2,X&&J(X.legs.map(l=>l.pick)));
  T('no prop on a game already in the ticket (no same-game correlation)',X&&!X.legs.some(l=>l.kind==='prop'&&l.player==='Josh Allen'),X&&J(X.legs.map(l=>l.pick)));
  T('a character\'s fade-listed player never makes its ticket',X&&!X.legs.some(l=>l.player==='Bad Call'));
  const fair=w.eval('decimalToAmerican(1/0.78)');T('prop without a book line is priced fair + hold and marked ≈',X&&X.legs.filter(l=>l.kind==='prop').every(l=>l.est&&+l.price<0&&+l.price<=+fair),X&&J(X.legs.filter(l=>l.kind==='prop').map(l=>[l.price,fair])));
  T('non-prop characters get no props ticket',w.eval(`cpxBuild('Power',[],'2026-10-13',window.__C)`)===null);
  /* grading a frozen props ticket */
  w.eval(`set(CPX_KEY,{'2026-10-10':{locked:true,by:{Sim:{voice:'Sim',d:'2026-10-10',dec:3,p:.3,legs:[{kind:'prop',sp:'nfl',player:'Jalen Hurts',k:'py',thr:200,price:-300,p:.78},{kind:'prop',sp:'nfl',player:'Nobody Here',k:'ry',thr:50,price:-200,p:.7}]}}}});
    set('d4.pstlast.nfl',{jalenhurts:{d:'2026-10-11',v:{py:231}}});`);
  w.eval('cpxGrade()');const G=w.eval(`get(CPX_KEY,{})['2026-10-10'].by.Sim`);
  T('prop legs grade off the real box line; a player with no line voids after 2 days',G.legs[0].hit===true&&G.legs[0].actual===231&&G.legs[1].push===true&&G.done&&G.won,J(G.legs));
  const R=w.eval(`cpxRecord('Sim')`);T('with-props record counts it',R.w===1&&R.pw===1,J(R));
  const hub=w.eval('parlayHubHtml()');T('Parlay Hub renders both records',/Parlay Hub/.test(hub)&&/no props/.test(hub)&&/with props/.test(hub));
  T('Today menu has Parlays and Stars & Busts views',/'parlays'/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8'))&&w.eval(`typeof parlayHubHtml==='function'&&typeof starsHtml==='function'`));

  /* ── 3. STARS & BUSTS ─────────────────────────────────────────── */
  const fbBox=(i,A,H,qbA,qbH,rtgA)=>({state:'post',teamStats:{
    [A]:{passing:[{name:qbA,'C/ATT':rtgA?'25/30':'12/30',YDS:rtgA?'330':'120',TD:rtgA?'3':'0',INT:rtgA?'0':'3',SACKS:rtgA?'0-0':'6-40'}],rushing:[{name:A+' RB',CAR:'15',YDS:rtgA?'90':'40',TD:'0'}],receiving:[{name:A+' WR',REC:'6',YDS:'80',TD:'1',TGTS:'8'}],
      defensive:[{name:A+' EDGE',TOT:'4',SACKS:rtgA?'3':'0',TFL:'2','QB HTS':'4',PD:'0'}],ints:[]},
    [H]:{passing:[{name:qbH,'C/ATT':'20/32',YDS:'230',TD:'1',INT:'1',SACKS:'2-12'}],rushing:[{name:H+' RB',CAR:'18',YDS:'80',TD:'1'}],receiving:[{name:H+' WR',REC:'5',YDS:'60',TD:'0',TGTS:'7'}],
      defensive:[{name:H+' EDGE',TOT:'5',SACKS:'1',TFL:'1','QB HTS':'2',PD:'1'}],ints:[{name:H+' CB',INT:rtgA?'0':'2'}]}}});
  /* 12 teams, 4 games each: ELITE's QB is great, BUST's QB is awful */
  w.eval(`SCOUT_MEM.nfl={v:1,p:{},t:{},fed:{},bf:null};SCOUT_BOARD={};`);
  const teams=['ELT','BST','T03','T04','T05','T06','T07','T08','T09','T10','T11','T12'];let ev=1000;
  for(let r=0;r<4;r++)for(let i=0;i<teams.length;i+=2){const a=teams[(i+r*2)%12],h=teams[(i+1+r*2)%12];
    const B=fbBox(ev,a,h,a+' QB',h+' QB',a!=='BST');if(h==='BST'){B.teamStats[h].passing[0]={name:'BST QB','C/ATT':'10/30',YDS:'100',TD:'0',INT:'3',SACKS:'6-40'};}
    if(a==='ELT'||h==='ELT'){const t=a==='ELT'?a:h;B.teamStats[t].passing[0]={name:'ELT QB','C/ATT':'27/32',YDS:'360',TD:'4',INT:'0',SACKS:'0-0'};}
    w.__B=B;w.eval(`scoutFeed('nfl','e${ev}',window.__B)`);ev++;}
  const n1=w.eval(`scoutFeed('nfl','e1000',window.__B)`);T('each final is fed exactly once',n1===0);
  T('preseason/live boxes never feed',w.eval(`scoutFeed('nfl','live1',{state:'in',teamStats:{}})`)===0);
  const SB=w.eval(`scoutBoard('nfl')`);const cat=id=>SB.cats.find(x=>x.c.id===id);
  T('passer rating ranked: the elite QB is ⭐, the awful QB is 🤡',cat('qb_rtg')&&cat('qb_rtg').top[0].R.nm==='ELT QB'&&cat('qb_rtg').bot[0].R.nm==='BST QB',cat('qb_rtg')&&J([cat('qb_rtg').top.map(r=>r.R.nm),cat('qb_rtg').bot.map(r=>r.R.nm)]));
  T('top/bottom 5% = ceil(5% of the qualified pool)',cat('qb_rtg').top.length===Math.max(1,Math.ceil(0.05*cat('qb_rtg').N)));
  T('defensive counting stats have stars but never "busts"',cat('d_sk')&&cat('d_sk').top.length>=1&&cat('d_sk').bot.length===0,cat('d_sk')&&J(cat('d_sk').top.map(r=>r.R.nm)));
  T('teams ranked both ways (offense + what they allow)',SB.tcats.some(x=>x.c.id==='off_rtg')&&SB.tcats.some(x=>x.c.id==='def_rtg')&&SB.tp.ELT.off_rtg>0.9&&SB.tp.BST.off_rtg<0.1,J({e:SB.tp.ELT&&SB.tp.ELT.off_rtg,b:SB.tp.BST&&SB.tp.BST.off_rtg}));
  const S=w.eval(`scoutGame('nfl','BST','ELT')`);
  T('matchup: composite edge points to the talented team',S&&S.edge>0,S&&S.edge.toFixed(3));
  T('mismatch flags name the elite unit vs the bottom unit',S&&S.flags.some(f=>/ELT/.test(f.txt)&&/top/.test(f.txt)),S&&J(S.flags.map(f=>f.txt)));
  /* form: a season star whose last 3 collapse */
  w.eval(`(function(){const D=scoutDb('nfl');D.p.fadeqb={nm:'Fade QB',tm:'T03',n:6,rc:{QB:6},s:{att:180,cmp:140,pyd:2100,ptd:18,pint:0,sk:2},f:[40,45,38]};SCOUT_BOARD={};})()`);
  const SB2=w.eval(`scoutBoard('nfl')`);T('📉 fading: season star, last 3 in the bottom third',SB2.form.some(f=>f.R.nm==='Fade QB'&&f.dir==='fade'),J(SB2.form.map(f=>f.R.nm+':'+f.dir)));
  /* market vs reality: priced like a 50% TD scorer, scores in ~1 of 6 */
  w.eval(`(function(){const D=scoutDb('nfl');D.p.hypeman={nm:'Hype Man',tm:'T04',n:6,rc:{WR:6},s:{tgt:40,rec:25,wyd:300,wtd:1},f:[50,50,50]};
    set('d4.nflprops',{'2026-10-11':[{stat:'anytime_td',side:'hype man',price:-120}]});SCOUT_BOARD={};})()`);
  const SB3=w.eval(`scoutBoard('nfl')`);T('🎭 over-hyped: book TD price far above his real scoring rate',SB3.hype.some(h=>h.R.nm==='Hype Man'&&h.dir==='hype'),J(SB3.hype.map(h=>[h.R.nm,h.dir,+h.mk.toFixed(2),+h.act.toFixed(2)])));
  const sh=w.eval(`starsHtml('nfl')`);T('Stars & Busts view renders matchups, tiers, form, hype',/Stars &amp; Busts|Stars & Busts/.test(sh)&&/Superstars/.test(sh)&&/Fading/.test(sh)&&/over-hyped/.test(sh));
  /* hockey goalies + skaters */
  w.eval(`SCOUT_MEM.nhl={v:1,p:{},t:{},fed:{},bf:null};`);
  const hb={state:'post',teams:{AAA:{skaters:[{name:'Sniper',G:'2',A:'1','+/-':'2',S:'5',BS:'0',HT:'1',TK:'1',GV:'0',TOI:'19:30'}],goalies:[{name:'Wall',SA:'35',GA:'1',SV:'34'}]},
                               BBB:{skaters:[{name:'Grinder',G:'0',A:'0','+/-':'-2',S:'1',BS:'4',HT:'6',TK:'0',GV:'2',TOI:'16:00'}],goalies:[{name:'Sieve',SA:'20',GA:'5',SV:'15'}]}}};
  w.__H=hb;w.eval(`scoutFeed('nhl','h1',window.__H)`);const HD=w.eval(`scoutDb('nhl')`);
  T('hockey: skater +/-, blocks, hits, TOI and goalie saves are kept',HD.p.sniper.s.g===2&&HD.p.grinder.s.bs===4&&HD.p.grinder.s.ht===6&&Math.abs(HD.p.sniper.s.toi-19.5)<0.01&&HD.p.wall.s.sv===34&&HD.p.wall.rc.G===1,J(HD.p.wall));
  T('hockey team: goals for/against and team save inputs',HD.t.AAA.f.g===2&&(HD.t.AAA.a.g||0)===0&&HD.t.BBB.f.ga===5&&HD.t.BBB.f.sa===20);

  /* ── 4. THE SCOUT — calls, probation ─────────────────────────── */
  const calls2=[];w.__add=(v,m,s,ex)=>calls2.push({v,m,s,ex});
  w.eval(`scoutCharCalls('nfl',{away:{abbr:'BST'},home:{abbr:'ELT'}},-6.5,44.5,false,false,window.__add)`);
  T('the Scout calls the talented side (ML, and spread on a big edge)',calls2.some(c=>c.v==='Scout'&&c.m==='ml'&&c.s==='home'),J(calls2));
  T('its calls carry a confidence for its inner feeling',calls2.every(c=>c.ex&&c.ex.sP>0.5&&c.ex.sP<=0.7));
  T('roster: the Scout is a character',w.eval(`!!CHARS.Scout&&CHAR_ORDER.includes('Scout')`));
  T('on probation it does NOT vote (squares, unanimity, Brain) and the roster count stays 9',w.eval(`isVoter('Scout')`)===false&&w.eval('VOTER_ORDER.length')===9);
  w.eval(`(function(){const V=get(VOICES_KEY,[]);for(let i=0;i<50;i++)V.push({id:'sc'+i,sp:'nfl',game:'Q'+i+'@R'+i,date:'2026-10-0'+(1+i%9),voice:'Scout',market:'ml',side:'home',graded:true,hit:i%5!==0,units:i%5!==0?0.8:-1});set(VOICES_KEY,V);(()=>{for(const k in RO_CACHE)delete RO_CACHE[k]})();})()`);
  const P=w.eval('scoutProbation()');
  T('40+ graded calls at 53%+ and not losing money → it graduates and votes',P.ok&&w.eval(`isVoter('Scout')`)===true&&w.eval(`VOTER_ORDER.includes('Scout')`),J(P));
  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},3000);
