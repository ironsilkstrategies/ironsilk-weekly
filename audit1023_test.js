/* v2.50 · THE AUDIT — four leaks found on the phone's real state (Oct 16–23):
   1. Props: the football boards hold the whole week, so Thursday's Best 3 showed Sunday's players (CeeDee Lamb, Chris Olave).
   2. The Best 3 was hockey-only for a week: one sport could take all three while another sport had an official pick.
   3. College football sat capped at 55%: its lanes were blocked by the losses of the broken-input days (flat-55 sim, Sep 28 → Oct 16).
   4. NBA calls were never priced: the ledger looked their book lines up in the MLB table, so no NBA call could ever be official. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const NOW=Date.parse('2026-10-22T14:00:00Z'),D='2026-10-22';   /* Thursday, 9 AM CT */
function page(file,V,extra){let html=fs.readFileSync(path.join(W,file),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;w.__NO_FLIP_RELOAD__=true;
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
    w.localStorage.setItem('d4.setupDone','1');if(V)w.localStorage.setItem('d4.voices',JSON.stringify(V));if(extra)extra(w);}}).window;}
let id=0;const c=(sp,date,voice,game,market,side,price,cf,x)=>({id:'t'+(++id),sp,date,game,gid:'g'+id,voice,market,side,line:null,price,pick:'x',cf,...(x||{})});
(async()=>{try{
  /* ── 1 · props: only players whose team plays today ── */
  {const w=page('nhl.html',[]);await wait(2500);
    w.eval(`NFL_GAMES=[{id:'n1',away:{abbr:'MIN'},home:{abbr:'LAC'},abstract:'pre',date:'2026-10-23T00:15Z'},{id:'n2',away:{abbr:'DAL'},home:{abbr:'DEN'},abstract:'pre',date:'2026-10-25T20:25Z'}];
      set(TC_KEY,{d:today(),by:{nfl:{ts:Date.now(),picks:[{sp:'nfl',game:'DAL@DEN',m:'ml',sd:'home',pick:'DEN ML',price:-150,start:'2026-10-25T20:25Z'}]}}});`);
    const tt=w.eval(`[...teamsToday('nfl')].sort().join(',')`);
    T("Thursday: the NFL teams playing today are only Thursday night's (not Sunday's, not a Sunday pick's)",tt==='LAC,MIN',tt);
    w.eval(`(()=>{const D=pstDb('nfl');const st=(mu)=>({wy:{sum:mu*20,sq:20*(mu*mu+400),ema:mu,gp:20}});
      D.p[pstId('CeeDee Lamb')]={name:'CeeDee Lamb',team:'DAL',n:20,s:st(96)};D.p[pstId('Justin Jefferson')]={name:'Justin Jefferson',team:'MIN',n:20,s:st(96)};
      propLinesPut('nfl',[{player:'CeeDee Lamb',stat:'REC YDS',keys:['wy'],thr:60.5,over:-110,under:-110},{player:'Justin Jefferson',stat:'REC YDS',keys:['wy'],thr:60.5,over:-110,under:-110}]);})()`);
    const P=w.eval(`best3Props().map(x=>x.player+'|'+x.team)`);
    T("the Best 3 props never show a player whose game isn't today (CeeDee Lamb on a Thursday)",!P.some(x=>/\|(DAL|DEN)$/.test(x)),JSON.stringify(P));
    T("…while tonight's player still makes it",P.some(x=>/^Justin Jefferson\|MIN$/.test(x)),JSON.stringify(P));
    const L=w.eval(`propLikely('nfl',8).map(x=>x.team)`);T('the game-log likely lines follow the same slate',!L.some(t=>t==='DAL'||t==='DEN'),JSON.stringify(L));
    w.eval(`NFL_GAMES=[NFL_GAMES[1]]`);T('a day with no NFL game: no NFL team counts as playing',w.eval(`teamsToday('nfl').size`)===0);
    T('…so no NFL prop can reach the card',!w.eval(`best3Props().map(x=>x.sp)`).includes('nfl'));}
  /* ── 2 · the Best 3 mixes sports ── */
  {const V=[c('nhl',D,'Judge','DAL@CHI','ml','away',-120,0.80),c('nhl',D,'Judge','MIN@BOS','ml','away',-120,0.78),c('nhl',D,'Judge','NJ@WSH','ml','home',-120,0.76),
      c('nfl',D,'Judge','MIN@LAC','ml','away',-115,0.72)];
    const w=page('nhl.html',V);await wait(2500);
    const pk=(sp,game,sd,pick,price,h)=>({sp,game,m:'ml',sd,pick,price,start:`2026-10-22T${h}:00:00-05:00`});
    const by={nhl:{picks:[pk('nhl','DAL@CHI','away','DAL ML',-120,'19'),pk('nhl','MIN@BOS','away','MIN ML',-120,'18'),pk('nhl','NJ@WSH','home','WSH ML',-120,'18')]},nfl:{picks:[pk('nfl','MIN@LAC','away','MIN ML',-115,'19')]}};
    const r=w.eval(`best3Pool(${JSON.stringify(by)},null).map(x=>x.sp+' '+x.pick)`);
    T('three NHL picks rank above an official NFL pick → the NFL pick still takes a spot',r.length===3&&r.includes('nfl MIN ML')&&r.filter(x=>/^nhl/.test(x)).length===2,JSON.stringify(r));
    T('…the two NHL picks kept are its best two, and the card stays ranked by fit',r[0]==='nhl DAL ML'&&r[1]==='nhl MIN ML'&&r[2]==='nfl MIN ML',JSON.stringify(r));
    const r2=w.eval(`best3Pool(${JSON.stringify({nhl:by.nhl})},null).map(x=>x.sp+' '+x.pick)`);
    T('one sport with official picks and nobody else: it fills all three',r2.length===3&&r2.every(x=>/^nhl/.test(x)),JSON.stringify(r2));}
  /* ── 3 · broken-input days never block a lane or train the meter ── */
  {const V=[];for(let i=0;i<40;i++)V.push(c('ncaaf','2026-10-0'+(1+i%9),'Judge','A'+i+'@B'+i,'ml','home',-150,0.6,{graded:true,hit:i%4===0,units:i%4===0?0.67:-1}));
    for(let i=0;i<40;i++)V.push(c('nfl','2026-10-'+(['08','09','10','11'][i%4]),'Judge','C'+i+'@D'+i,i%2?'total':'spread',i%2?'under':'home',-110,0.6,{line:i%2?44.5:-3,graded:true,hit:i%5===0,units:i%5===0?0.91:-1}));
    const w=page('nhl.html',V,x=>x.localStorage.setItem('d4.conf',JSON.stringify({v:1,ts:Date.now(),sig:'old',n:9,skill:{},cal:{}})));await wait(2500);
    T('the broken days are named: CFB Sep 28 → Oct 16, NFL totals Oct 8-11',w.eval(`inputsBroken({sp:'ncaaf',date:'2026-10-05',market:'ml'})&&!inputsBroken({sp:'ncaaf',date:'2026-10-17',market:'ml'})&&inputsBroken({sp:'nfl',date:'2026-10-09',market:'total'})&&!inputsBroken({sp:'nfl',date:'2026-10-09',market:'spread'})`)===true);
    T("30 CFB favorite losses from the flat-55 days don't block the CFB favorite lane",w.eval(`laneStatus(laneKey('ncaaf','ml','home',-150,null))`)!=='blocked',w.eval(`JSON.stringify(laneTable().G['ncaaf|ml|fav']||null)`));
    T("NFL totals from Oct 8-11 don't count, NFL spreads from those days still do",w.eval(`!laneTable().G['nfl|total|under']&&!!laneTable().G['nfl|spread|fav']`)===true,w.eval(`JSON.stringify(Object.keys(laneTable().G))`));
    const M=w.eval(`(()=>{const k=typeof CONF_KEY!=='undefined'?CONF_KEY:null;const M=confModel();return{rule:M.rule,n:M.n,k};})()`);
    T('a meter built under the old rule rebuilds once, without the broken days',M.rule===2&&M.n===20,JSON.stringify(M));}
  /* ── 4 · NBA calls carry their book price ── */
  {const w=page('nba.html',[]);await wait(3000);
    w.eval(`bbPutLines(BB_CFG.nba,[{away:'NY',home:'BOS',game:'NY@BOS',src:'espn',book:'DraftKings',capturedAt:Date.now(),market:'moneyline',side:'away',line:null,price:114,date:today()},
      {away:'NY',home:'BOS',game:'NY@BOS',src:'espn',book:'DraftKings',capturedAt:Date.now(),market:'moneyline',side:'home',line:null,price:-135,date:today()},
      {away:'NY',home:'BOS',game:'NY@BOS',src:'espn',book:'DraftKings',capturedAt:Date.now(),market:'spread',side:'home',line:-2.5,price:-110,date:today()},
      {away:'NY',home:'BOS',game:'NY@BOS',src:'espn',book:'DraftKings',capturedAt:Date.now(),market:'total',side:'over',line:221.5,price:-108,date:today()}])`);
    const L=w.eval(`(()=>{const L=voicesLines('nba',{id:'x',away:{abbr:'NY'},home:{abbr:'BOS'},__date:today()});return{mlH:L.mlH&&L.mlH.price,mlA:L.mlA&&L.mlA.price,sp:L.spH&&L.spH.line,ov:L.ov&&L.ov.line};})()`);
    T("an NBA game's calls read the NBA book (DraftKings via ESPN): moneyline, spread and total",L.mlH===-135&&L.mlA===114&&L.sp===-2.5&&L.ov===221.5,JSON.stringify(L));
    const C=w.eval(`(()=>{const g={id:'x',away:{abbr:'NY'},home:{abbr:'BOS'},abstract:'pre',__date:today()};const s={aw:0.42,hw:0.58,awayProj:108,homeProj:113,med:222};return characterCalls('nba',g,s).filter(x=>x.market==='ml').map(x=>x.voice+' '+x.side+' '+x.price);})()`);
    T('…so the characters\' NBA moneyline calls are priced (they can be official now)',C.length>0&&C.every(x=>/ (114|-135)$/.test(x)),JSON.stringify(C));}
}catch(e){T('no crash',false,String(e&&e.stack||e).slice(0,500));}
  const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);})();
