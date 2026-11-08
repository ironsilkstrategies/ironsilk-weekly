/* v2.94.0 · Nov 8: "Oracle… scan the net for all kinds of sports sites predictions… the representation of the outside picks
   consensus… finds consistent sites… compares to the characters and finds his gut confidence by knowing what the other sites
   strength in picking picks is" + "a predicted final score for all calls… independent". Invented sources, records and games. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  const RD=w.Date;const OFF=RD.parse('2026-11-08T09:00:00-06:00')-RD.now();class FD extends RD{constructor(...a){if(a.length)super(...a);else super(RD.now()+OFF);}static now(){return RD.now()+OFF;}}FD.parse=RD.parse;FD.UTC=RD.UTC;w.Date=FD;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;const D='2026-11-08';
  const rec=(su,ats,ou,extra)=>({nfl:{all:{n:Math.max(su[1],ats[1]),su,ats,ou,mae:null,br:null,...(extra||{})},d14:{}}});
  const wire={v:1,ts:'2026-11-08T14:00:00Z',src:{covers:{lab:'Covers contest consensus',kind:'crowd',ok:'x'},cbs:{lab:'CBS Sports experts',kind:'expert',ok:'x'},kalshi:{lab:'Kalshi',kind:'market',ok:'2026-11-08T14:00:00Z'},poly:{lab:'Polymarket',kind:'market',ok:'x'},espn:{lab:'ESPN FPI/BPI',kind:'model',ok:'x'},dr:{lab:'DRatings',kind:'model',ok:'x'},
      os:{lab:'OddsShark computer',kind:'model',ok:'x'},pw:{lab:'Pickswise experts',kind:'expert',ok:'x'},'pt.sag':{lab:'Sagarin (Prediction Tracker)',kind:'model'},'pt.nfelo':{lab:'nfelo (Prediction Tracker)',kind:'model'}},
    g:{'nfl|CLE@NO|2026-11-08':{sp:'nfl',st:'2026-11-08T18:00Z',a:'CLE',h:'NO',ln:{spH:-3,tot:44.5},s:{kalshi:{wp:0.71},poly:{wp:0.70},espn:{wp:0.725,mg:6.1},dr:{wp:0.695,pa:17.4,ph:24.9,mg:7.5,tot:42.3},os:{pa:18.5,ph:25.1,mg:6.6,tot:43.6},
        pw:{pk:[{mk:'spread',side:'home',line:-3,st:3},{mk:'total',side:'under',line:44.5,st:2}]},covers:{pub:{sp:27,n:996}},cbs:{xp:{a:1,h:6}},'pt.sag':{mg:9},'pt.nfelo':{mg:8}}}},
    rec:{dr:rec([70,100],[60,100],[58,100],{mae:9.8}),espn:rec([68,100],[45,100],[0,0],{br:0.215}),pw:rec([0,0],[40,70],[30,60]),kalshi:rec([70,100],[0,0],[0,0],{br:0.198}),'pt.sag':rec([0,0],[70,120],[0,0]),covers:rec([0,0],[40,100],[0,0]),cbs:rec([0,0],[58,100],[0,0]),'pt.nfelo':rec([0,0],[52,100],[0,0])}};
  T('the wire is stored from the robot\'s file (a cache key, never synced)',E(`oracleStore(${J(wire)})`)===1&&E(`ORA_IDX_K`).includes('cache'));
  const g={away:{abbr:'CLE'},home:{abbr:'NO'}};const R=E(`oraGame('nfl',${J(g)},-3,44.5,'${D}',null)`);
  T('consensus win chance from the markets and models (~71% NO)',R.pH>0.68&&R.pH<0.75,String(R.pH));
  T('consensus margin between the line (-3) and the models (6–9), the rating systems one capped family',R.M>3.5&&R.M<8&&R.ptN===2&&R.ptM>8&&R.ptM<9,J({M:R.M,ptM:R.ptM}));
  T('his own score from the consensus margin and total (total pulled toward 44.5 by the book)',R.ps&&R.ps.h>R.ps.a&&R.ps.a+R.ps.h>42.3&&R.ps.a+R.ps.h<44.5,J(R.ps));
  const G=E(`oraGut('nfl',${J(R)},'spread',-3,${J(g)})`);
  T('his spread side: NO, with a gut from the edge and the votes',G.side==='home'&&G.oG>=60,J({oG:G.oG,vs:G.vs,e:G.e}));
  T('…each source\'s vote by its record: DRatings (60% ATS) and Pickswise\'s 3 stars for NO; ESPN (45% ATS) counts against it',G.why.some(x=>/DRatings: NO by 7\.5 — 60% on 100/.test(x))&&G.why.some(x=>/ESPN FPI\/BPI: NO by 6\.1 — 45% on 100 \(counts against it\)/.test(x)),G.why.join(' | '));
  T('the crowd and the experts vote too: 6 of 7 CBS experts on NO (58% ATS); Covers players 73% on CLE but they hit 40% → that counts FOR NO',G.why.some(x=>/CBS Sports experts: 6 of 7 experts on NO — 58% on 100/.test(x))&&G.why.some(x=>/Covers contest consensus: 73% of Covers players on CLE — 40% on 100 \(counts against it\)/.test(x)),G.why.join(' | '));
  T('…and the rating systems with records vote as one family',G.why.some(x=>/2 rating systems with records vote NO/.test(x)),G.why.join(' | '));
  /* a losing source alone: its side is faded */
  const lone={...wire,g:{'nfl|CLE@NO|2026-11-08':{...wire.g['nfl|CLE@NO|2026-11-08'],s:{espn:{wp:0.725,mg:6.1}}}}};E(`oracleStore(${J(lone)})`);
  const R2=E(`oraGut('nfl',oraGame('nfl',${J(g)},-3,44.5,'${D}',null),'spread',-3,${J(g)})`);
  T('a source that keeps losing against the spread pulls the gut the other way, even when its margin likes the side',R2.vs<0,J({vs:R2.vs,oG:R2.oG,side:R2.side}));
  E(`oracleStore(${J(wire)})`);
  /* 50 rating systems screaming NO by 20 don't drown the markets */
  E(`oracleStore(${J({...wire,rec:{}})})`);const GL=E(`oraGut('nfl',oraGame('nfl',${J(g)},-3,44.5,'${D}',null),'spread',-3,${J(g)})`);E(`oracleStore(${J(wire)})`);
  T('before his sources have records he runs cautious — the consensus edge at 60%, and he says so',GL.oG<G.oG&&GL.why.some(x=>/still learning these sources .* counts at 60%/.test(x)),JSON.stringify({a:GL.oG,b:G.oG}));
  E(`oracleStore(${J({...wire,g:{'nfl|CLE@NO|2026-11-08':{...wire.g['nfl|CLE@NO|2026-11-08'],s:{kalshi:{wp:0.99},espn:{mg:30}}}}})})`);
  const RB=E(`oraGame('nfl',${J(g)},-28,44.5,'${D}',null)`);E(`oracleStore(${J(wire)})`);
  T('a 99% market says little about a 28-point line: only the margins (and the book) set his number there',RB.M>27&&RB.M<31,String(RB.M));
  const big=JSON.parse(J(wire));for(let i=0;i<50;i++){big.g['nfl|CLE@NO|2026-11-08'].s['pt.x'+i]={mg:20};}E(`oracleStore(${J(big)})`);
  const R3=E(`oraGame('nfl',${J(g)},-3,44.5,'${D}',null)`);T('fifty rating systems at NO by 20 count as one family — the consensus stays sane',R3.M<12,String(R3.M));E(`oracleStore(${J(wire)})`);
  /* the outside world vs the Desk: the Desk's sure NFL spread calls hit 40% on 50, the outside sources ~55% → he leans in */
  const V=[];for(let i=0;i<50;i++)V.push({id:'v'+i,sp:'nfl',date:E(`dayShift('${D}',-${1+(i%20)})`),game:'X'+i+'@Y'+i,voice:'Sim',market:'spread',side:'home',line:-3,price:-110,cf:0.66,graded:true,hit:i%5<2});
  E(`set(VOICES_KEY,${J(V)});Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);ORA_VS=null;`);
  const VS=E(`oraVsDesk('nfl','spread')`);T('the outside world vs the Desk on NFL spreads: outside ~53%, the Desk 40% → ×1.35 at most',VS.desk===0.4&&VS.out>0.52&&VS.m>1.3&&VS.m<=1.35,J(VS));
  const G2=E(`oraGut('nfl',oraGame('nfl',${J(g)},-3,44.5,'${D}',null),'spread',-3,${J(g)})`);
  T('…and says so in his why',G2.oG>G.oG&&G2.why.some(x=>/the outside world 5\d% vs the Desk 40% on NFL spreads → ×1\.35/.test(x)),G2.why.join(' | '));
  const got=[];w.__got=got;
  E(`oracleCallsV2('nfl',${J(g)},{mlA:{price:240},mlH:{price:-290},spH:{line:-3,price:-110}},-3,false,44.5,false,(v,m,s,ex)=>window.__got.push({v,m,s,ex}),'${D}',null)`);
  const sc=got.find(x=>x.m==='spread'),tc=got.find(x=>x.m==='total'),mc=got.find(x=>x.m==='ml');
  T('his calls speak as the Oracle with his gut (oG) and his score on them',sc&&sc.v==='Pred'&&sc.s==='home'&&sc.ex.oG>=60&&sc.ex.pa!=null&&sc.ex.ph!=null,J(sc));
  const GT=E(`oraGut('nfl',oraGame('nfl',${J(g)},-3,44.5,'${D}',null),'total',44.5,${J(g)})`);
  T('…his total leans under (DRatings 42.3, OddsShark 43.6 vs 44.5) but a lean under 60 stays off the board',GT.side==='under'&&GT.oG>50&&GT.oG<60&&!tc,J({oG:GT.oG,tc}));
  T('…a moneyline only at 75%+ inside -300…+250 (NO -290 at ~71% → no)',!mc);
  T('official at 70+ through the Coach\'s clipboard, like every gut',E(`isOfficial({voice:'Pred',sp:'nfl',market:'spread',side:'home',line:-3,price:-110,oG:73,date:'${D}'})`)===true&&E(`isOfficial({voice:'Pred',sp:'nfl',market:'spread',side:'home',line:-3,price:-110,oG:65,date:'${D}'})`)===false);
  T('the Coach judges the new Oracle only on his own gut calls (not the old upload calls)',E(`coachGutTag({oG:70})`)==='g'&&E(`coachBase({oG:70})`)===0.7);
  T('a predicted score on every game he reads',E(`scoreCallsFor('nfl',${J(g)},{awayProj:17,homeProj:27},[])`).some(x=>x.voice==='Pred'));
  /* your upload is one source: with no wire at all he still reads it */
  E(`oracleStore({v:1,ts:'x',g:{},rec:{},src:{}})`);const R4=E(`oraGame('nfl',${J(g)},-3,44.5,'${D}',{a:20,h:27,src:'my site'})`);
  T('your uploaded prediction is one source in his consensus',R4&&R4.S.upload&&R4.S.upload.mg===7&&R4.M>-(-3),J(R4&&R4.S));
  const src=fs.readFileSync(path.join(W,'shared.js'),'utf8');
  T('uploads: Covers keeps its own voice; any other upload goes to the Oracle',/if\(isCovers\(p\.src\)\)\{byMargin\('Covers'/.test(src)&&/oracleCallsV2\(sp,g,Ln,hl,hlSim,tl,tlSim,add,d,oraUp\)/.test(src)&&/if\(!oraDone&&oraUp\)byMargin\('Pred'/.test(src));
  E(`oracleStore(${J(wire)})`);const card=E('oracleCardHtml()').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  T('his card: every source\'s record by sport, the best rating systems, outside vs the Desk',/The Oracle — the outside world's consensus/.test(card)&&/DRatings 70-30 70% 60-40 60%/.test(card)&&/best rating systems against the spread \(of 2\) Sagarin/.test(card)&&/spreads: outside \d+% vs the Desk 40%/.test(card),card.slice(0,600));
  T('his description',/the outside world's consensus/.test(E("CHARS.Pred.school")));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
