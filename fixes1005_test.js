const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function boot(page,fetchFn){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    w.fetch=fetchFn||(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')}));
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;
    w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');}}).window;}
const J=o=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(o),text:()=>Promise.resolve(JSON.stringify(o))});
const urls=[];
const mlb=boot('mlb.html',u=>{urls.push(String(u));
  if(/schedule\?teamId=/.test(u))return J({dates:[{games:[
    {gamePk:9001,gameType:'D',gameDate:'2026-10-03T23:00Z',status:{abstractGameState:'Final'}},
    {gamePk:8001,gameType:'S',gameDate:'2026-10-04T23:00Z',status:{abstractGameState:'Final'}}]}]});
  if(/game\/9001\/boxscore/.test(u))return J({teams:{away:{team:{id:147},players:Object.fromEntries(Array.from({length:9},(_,i)=>['ID'+i,{battingOrder:String(i+1)+'00',person:{id:600+i,fullName:'Bat '+i}}]))},home:{team:{id:139},players:{}}}});
  return J({});});
const nfl=boot('nfl.html');const cfb=boot('cfb.html');const nhl=boot('nhl.html');
setTimeout(async()=>{try{
  // 1. postseason projected lineups
  const lu=await mlb.eval('(localStorage.removeItem("d4.projlu"),projectedLineupFor(147))');
  const u=urls.find(x=>/schedule\?teamId=147/.test(x))||'';
  T('projected lineup: postseason game counts (no gameType=R in the URL)',lu.length===9&&!/gameType=R/.test(u),`${lu.length} batters · ${u.slice(-60)}`);
  T('projected lineup: spring/exhibition games skipped — picks the Division Series box, not the newer S game',urls.some(x=>/game\/9001\/boxscore/.test(x))&&!urls.some(x=>/game\/8001/.test(x)));
  // 2. unanimous needs an independent voice
  const w=nfl;w.eval(`window.__C=[];characterCalls=()=>window.__C;`);
  const g={id:'g1',away:{abbr:'ATL'},home:{abbr:'NO'}},s={aw:.4,hw:.6};
  const mk=v=>({voice:v,market:'ml',side:'home',line:null});
  w.eval(`window.__C=${JSON.stringify(['Sim','Judge','Most common','Pred'].map(mk))}`);
  const a=w.eval(`charSquare('nfl',${JSON.stringify(g)},${JSON.stringify(s)},'NO ML',{price:-150})`);
  T('4 sim-derived voices (Sim/J/M/P) agreeing is NOT unanimous',a.unanimous===false,JSON.stringify({u:a.unanimous}));
  w.eval(`window.__C=${JSON.stringify(['Sim','Judge','Most common','Pred','Coach'].map(mk))}`);
  const b=w.eval(`charSquare('nfl',${JSON.stringify(g)},${JSON.stringify(s)},'NO ML',{price:-150})`);
  T('all agree + Coach (independent) → unanimous',b.unanimous===true);
  w.eval(`window.__C=${JSON.stringify([...['Sim','Judge','Most common','Pred'].map(mk),{voice:'Trends',market:'ml',side:'away',line:null}])}`);
  const c=w.eval(`charSquare('nfl',${JSON.stringify(g)},${JSON.stringify(s)},'NO ML',{price:-150})`);
  T('an independent voice dissenting kills unanimous',c.unanimous===false);
  // 3. cancelling a mission keeps its XP
  nfl.eval("set(MS_KEY,[{id:55,name:'Lunch Money',status:'busted',xp:70,steps:[],start:3,goal:300,days:21,startDate:today(),balance:0}]);set(MSG_KEY,{xp:125})");
  const before=nfl.eval('msXP()');nfl.eval('msDelete(55)');const after=nfl.eval('msXP()');
  T('lose → cancel: mission XP is banked, total unchanged',before===195&&after===195&&nfl.eval('msAll().length')===0,`${before} → ${after}`);
  T('the bank shows in the XP log',/XP kept after cancel/.test(JSON.stringify(nfl.eval('msgGet().log'))));
  nfl.eval("set(MS_KEY,[{id:56,name:'Zero',status:'active',xp:0,steps:[],start:3,goal:9,days:7,startDate:today(),balance:3}])");
  nfl.eval('msDelete(56)');T('deleting a 0-XP mission adds nothing',nfl.eval('msXP()')===195);
  // 4. mission orders follow the live balance after a loss
  nfl.eval("set(MS_KEY,[]);msStart('first_win')");const m0=nfl.eval('msAll()[0]');
  const o1=nfl.eval('JSON.stringify(msOrders(msAll()[0]))');
  nfl.eval(`(()=>{const A=msAll();A[0].balance=${m0.start/2};msSave(A)})()`);
  const o2=nfl.eval('JSON.stringify(msOrders(msAll()[0]))');
  T('mission plan re-sizes when the balance drops (path follows current balance)',o1!==o2,`start $${m0.start} → $${m0.start/2}`);
  // 5. bankroll is read live
  nfl.eval("set(BR_AMT,'50')");const b50=nfl.eval('brAmount()');nfl.eval("set(BR_AMT,'80')");
  T('bankroll entry is read immediately (no stale cache)',b50===50&&nfl.eval('brAmount()')===80);
  // 6. CFB props: leaders parse + ladder like NFL
  const sum={leaders:[
    {team:{abbreviation:'UGA',id:'61'},leaders:[{name:'passingYards',leaders:[{value:1500,athlete:{id:'11',displayName:'Gunner Stockton',position:{abbreviation:'QB'}}}]},
      {name:'rushingYards',leaders:[{value:400,athlete:{id:'12',displayName:'Nate Frazier',position:{abbreviation:'RB'}}}]},
      {name:'receivingYards',leaders:[{value:420,athlete:{id:'13',displayName:'Zachariah Branch',position:{abbreviation:'WR'}}},{value:300,athlete:{id:'14',displayName:'Colbie Young',position:{abbreviation:'WR'}}}]}]},
    {team:{abbreviation:'BAMA',id:'333'},leaders:[{name:'passingYards',leaders:[{value:1600,athlete:{id:'21',displayName:'Ty Simpson',position:{abbreviation:'QB'}}}]}]}]};
  const gc={id:'c1',espnId:'c1',away:{abbr:'UGA',id:'61'},home:{abbr:'BAMA',id:'333'}};
  const LD=cfb.eval(`cfbParseLeaders(${JSON.stringify(sum)},${JSON.stringify(gc)})`);
  T('CFB leaders: QB, RB and top-2 WR per team, matched to the right side',LD.UGA.length===4&&LD.BAMA.length===1&&LD.UGA[3].name==='Colbie Young');
  cfb.eval(`(()=>{const W=get(CFB_LEAD_KEY,{});W.c1={ts:Date.now(),v:${JSON.stringify(LD)}};set(CFB_LEAD_KEY,W);
    const F=get(NFL_FORM_KEY,{});const lg=(k,vals)=>({ts:Date.now(),v:vals.map((x,i)=>({id:'e'+i,date:'2026-09-'+(20-i),[k]:x,recs:k==='rec'?Math.round(x/12):null}))});
    F['cfb:11']=lg('pass',[260,300,240,310,290]);F['cfb:13']=lg('rec',[90,70,85,100,75]);set(NFL_FORM_KEY,F);})()`);
  const P=cfb.eval(`cfbModelProps(${JSON.stringify(gc)},null)`);const qb=P.find(x=>x.pid==='11'),wr=P.filter(x=>x.pid==='13');
  T('CFB QB: season/g = total ÷ games, blended with last 5, 3-rung ladder',qb&&qb.seasonPG===300&&qb.ladder.length===3&&qb.proj>270&&qb.proj<300,qb&&`${qb.seasonPG}/g · L5 ${qb.last5} · proj ${qb.proj}`);
  T('CFB WR gets Rec Yds AND Receptions, like the NFL card',wr.length===2&&wr.some(x=>x.k==='recs'));
  const html=cfb.eval(`cfbFormHTML(${JSON.stringify(gc)},null)`);
  T('CFB props panel renders NFL-style rows (proj · season · last5 · ladder %)',/Gunner Stockton/.test(html)&&/proj <b/.test(html)&&/last5/.test(html)&&/\d+\.5\+ <b>\d+%/.test(html));
  T('old dead message is gone',!/No CFB player props yet/.test(cfb.eval(`ncaafPropsPanel(${JSON.stringify(gc)})`)));
  // 7. NHL props NFL-style
  nhl.eval(`NHL_PLAYERS={'Connor McDavid':{name:'Connor McDavid',team:'EDM',pos:'C',gp:20,gpPrev:82,g:.6,a:1.1,pts:1.7,sog:3.6},
    'Stuart Skinner':{name:'Stuart Skinner',team:'EDM',pos:'G',gp:15,gpPrev:50,sv:25,sa:27.5,g:0,a:0,pts:0,sog:0},
    'Elias Pettersson':{name:'Elias Pettersson',team:'VAN',pos:'C',gp:20,gpPrev:80,g:.3,a:.5,pts:.8,sog:2.4}};NHL_STATUS.players='player stats: test';`);
  const gh={id:'h1',away:{abbr:'VAN'},home:{abbr:'EDM'}},sh={awayProj:2.6,homeProj:3.6,aw:.35,hw:.65,otP:.2};
  const nh=nhl.eval(`NHL_PANELS.props(${JSON.stringify(gh)},${JSON.stringify(sh)})`);
  T('NHL props grouped by team like NFL (away block then home block)',nh.indexOf('<b>VAN</b>')>-1&&nh.indexOf('<b>VAN</b>')<nh.indexOf('<b>EDM</b>'));
  T('NHL skater row: PTS + SOG proj, season rate, ladder % rungs',/Connor McDavid/.test(nh)&&/PTS proj <b/.test(nh)&&/3\+ SOG <b>\d+%/.test(nh)&&/1\+ PTS <b>\d+%/.test(nh));
  T('NHL goalie row: saves proj + ladder',/Stuart Skinner/.test(nh)&&/\+ SV <b>\d+%/.test(nh));
  T('NHL rungs still tap onto the slip',/sportSlipToggle\('nhl','h1'/.test(nh)&&/nhlProp:\{player:'Connor McDavid',stat:'shots'/.test(nh));
}catch(e){T('harness',false,e.stack.split('\n').slice(0,3).join(' | '));}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);},3500);
