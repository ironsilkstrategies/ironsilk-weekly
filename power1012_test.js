const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  /* ── the roster ── */
  T('the Commissioner is a full, voting, independent character',w.eval(`!!CHARS.Power&&isVoter('Power')&&INDEP_VOICES.has('Power')&&VOTER_ORDER.includes('Power')&&CHAR_ORDER.indexOf('Power')<CHAR_ORDER.indexOf('Brain')`));
  /* ── calls: ratings say home by 7; history nudges ── */
  w.eval(`pwrLine=function(sp,a,h){return{a:{abbr:a,off:0,def:0},h:{abbr:h,off:0,def:0},m:7};};pwrHx=function(){return{g:{},done:{}};};PWR_SER_IDX={};`);
  const g={id:'g1',away:{abbr:'ALA'},home:{abbr:'TROY'},date:'2026-10-17T19:00Z'};
  const calls=[];const add=(v,m,sd,ex)=>calls.push({v,m,sd,...ex});
  w.eval(`window.__C=[];pwrCharCalls('ncaaf',${JSON.stringify(g)},-3,52.5,false,false,(v,m,sd,ex)=>__C.push({v,m,sd,...ex}))`);let C=w.eval('__C');
  const ml=C.find(c=>c.m==='ml'),sp=C.find(c=>c.m==='spread');
  T('ML: the team ahead on power (home field and history included)',ml&&ml.sd==='home'&&ml.pP>0.6,JSON.stringify(ml));
  T('the blue blood is tagged: picking Troy over Alabama is siding against the bigger name',ml&&ml.tags.includes('pres:down'));
  T('prestige pulls the margin toward the bigger program (small, capped)',ml&&ml.hist<0&&ml.hist>=-2,String(ml&&ml.hist));
  T('spread: called only when power beats the number (home -3 vs power ~+5.8 → home)',sp&&sp.sd==='home'&&sp.edge>=1.5,JSON.stringify(sp));
  T('no totals — tested with no skill, so it stays silent',!C.some(c=>c.m==='total'));
  w.eval(`window.__C=[];pwrCharCalls('ncaaf',${JSON.stringify(g)},-6.5,52.5,false,false,(v,m,sd,ex)=>__C.push({v,m,sd,...ex}))`);C=w.eval('__C');
  T('no spread call when the edge is under the bar (power 5.8 vs -6.5)',!C.some(c=>c.m==='spread'));
  w.eval(`window.__C=[];pwrCharCalls('ncaaf',${JSON.stringify(g)},-3,null,true,true,(v,m,sd,ex)=>__C.push({v,m,sd,...ex}))`);C=w.eval('__C');
  T('never calls a spread against the sim\'s own placeholder line',!C.some(c=>c.m==='spread'));
  /* ── the all-time series ── */
  w.eval(`pwrHx=function(){return{g:{a:['2019-10-05','ALA','TROY',10,31,0],b:['2021-10-02','TROY','ALA',27,24,0],c:['2023-09-30','ALA','TROY',20,24,0],d:['2018-09-01','ALA','TROY',3,20,0]},done:{}};};PWR_SER_IDX={};`);
  const S=w.eval(`pwrSeries('ncaaf','ALA','TROY')`);T('series: past seasons counted from both sides of the field',S.n===4&&S.h===4&&S.a===0&&S.since==='2018',JSON.stringify(S));
  w.eval(`window.__C=[];pwrCharCalls('ncaaf',${JSON.stringify(g)},-3,52.5,false,false,(v,m,sd,ex)=>__C.push({v,m,sd,...ex}))`);C=w.eval('__C');
  T('siding with the series leader is tagged',C.find(c=>c.m==='ml').tags.includes('ser:with'));
  const ev={id:'e1',date:'2023-10-07T19:00Z',competitions:[{status:{type:{completed:true}},competitors:[{homeAway:'home',team:{abbreviation:'GB'},score:{value:24,displayValue:'24'}},{homeAway:'away',team:{abbreviation:'CHI'},score:{value:17,displayValue:'17'}}]}]};
  const H=w.eval(`(()=>{const H={g:{},done:{}};pwrHxEvent('nfl',${JSON.stringify(ev)},H);pwrHxEvent('nfl',${JSON.stringify({...ev,id:'e2',date:'2099-10-07T19:00Z'})},H);return H;})()`);
  T('schedule events parse (score objects) and this season is left to the live results',H.g.e1&&H.g.e1.join()==='2023-10-07,CHI,GB,17,24,0'&&!H.g.e2,JSON.stringify(H.g));
  /* ── reign ── */
  w.eval(`pwrRank=function(sp){return{acc:sp==='ncaaf'?{n:200,acc:0.75}:{n:200,acc:0.66},teams:[],by:{}}};PWR_REIGN_C={};set(VOICES_KEY,[]);set(SPLIT_KEY,{});`);
  const Rc=w.eval(`pwrReign('ncaaf')`),Rn=w.eval(`pwrReign('nhl')`);
  T('under 70% straight up: no say',Rn.w===0&&!Rn.supreme);
  T('75% over 200 games: a real say (¾, trimmed for sample size)',Rc.supreme&&Rc.w>0.45&&Rc.w<0.7,JSON.stringify(Rc));
  const V=[];for(let i=0;i<50;i++)V.push({id:'p'+i,voice:'Power',sp:'ncaaf',date:'2026-10-0'+(1+i%9),game:'A'+i+'@B'+i,market:'ml',side:'home',price:-300,graded:true,hit:i%10<7,units:i%10<7?0.33:-1});
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)});PWR_REIGN_C={};`);const Rc2=w.eval(`pwrReign('ncaaf')`);
  T('the say is halved while its money record runs under −5% ROI',Rc2.cut&&Rc2.w<Rc.w,JSON.stringify(Rc2));
  const adj=w.eval(`pwrCalAdj('ncaaf',${JSON.stringify(g)},'ml','home',null,0.5)`),adj0=w.eval(`pwrCalAdj('nhl',${JSON.stringify(g)},'ml','home',null,0.5)`);
  T('calibration: pulled toward the Commissioner where it reigns, capped at 4 pts; untouched where it doesn\'t',adj>0&&adj<=0.04&&adj0===0,adj+' / '+adj0);
  T('master evaluation shows the Commissioner\'s reign for the league',/Commissioner/.test(w.eval(`masterEvalFor('ncaaf')`))&&/Reigns supreme/.test(w.eval(`pwrEvalHtml('ncaaf')`)));
  /* ── inner feeling: the pure core ── */
  const W1=w.eval(`Object.fromEntries(FEEL_KEYS.map(k=>[k,1]))`);
  const f0=w.eval(`feelCore(0.55,{team:[1,6]},${JSON.stringify(W1)})`);T('blacklist: 5+ losses with a team at 30% or worse',f0.black&&f0.p<=0.45,JSON.stringify(f0.black));
  const f1=w.eval(`feelCore(0.55,{role:[30,10],where:[20,8]},${JSON.stringify(W1)})`);T('a strong split lifts the feeling, capped',f1.p>0.55&&f1.dz<=0.5);
  const fz=w.eval(`feelCore(0.55,{role:[30,10]},Object.fromEntries(FEEL_KEYS.map(k=>[k,0])))`);T('an unproven check (weight 0) is shown but moves nothing',Math.abs(fz.p-0.55)<1e-9&&fz.why.length===1);
  const fs3=w.eval(`feelCore(0.55,{streak:Object.assign([0,0],{s:-5})},Object.fromEntries(FEEL_KEYS.map(k=>[k,0])))`);T('streaks are noted (L5) — zero weight until they prove themselves',fs3.why.some(x=>x.k==='streak'&&x.txt==='L5')&&Math.abs(fs3.p-0.55)<1e-9);
  /* ── the permanent record grows what the feeling needs ── */
  const L=[];const d0=n=>'2026-10-'+String(n).padStart(2,'0');
  for(let i=0;i<8;i++)L.push({id:'j'+i,voice:'Judge',sp:'ncaaf',date:d0(1+i),game:'ARK@MISS',market:'spread',side:'away',line:7,price:-110,graded:true,hit:i===0});
  w.eval(`set(SPLIT_KEY,{});set(VOICES_KEY,${JSON.stringify(L)});splitRoll(get(VOICES_KEY,[]));CH_IDX=null;`);
  const M=w.eval(`get(SPLIT_KEY,{}).ncaaf.Judge.spread`);
  T('splits keep the day, the streak, team home/road and team fav/dog',M.day&&M.day['2026-10-08']&&M.seq==='WLLLLLLL'&&M.tw['ARK|away'][1]===7&&M.tr['ARK|dog'][1]===7,JSON.stringify({seq:M.seq,tw:M.tw,tr:M.tr}));
  const c={id:'nj',voice:'Judge',sp:'ncaaf',date:'2026-10-12',game:'ARK@LSU',market:'spread',side:'away',line:10.5,price:-110};
  const F=w.eval(`charFeel(${JSON.stringify(c)},get(VOICES_KEY,[]))`);
  T('a team it keeps losing on gets blacklisted (1-7 on ARK), and the feeling says so',F.black&&/ARK/.test(F.black.lab)&&F.p<=0.45,JSON.stringify(F.black));
  T('windows and streak are read from the dated record',F.why.some(x=>x.k==='d7')&&F.why.some(x=>x.k==='streak'&&x.txt==='L7'),F.why.map(x=>x.k+':'+x.txt).join(' '));
  /* ── self-tuning: a real fav/dog edge gets weight, noise doesn't ── */
  const R=[];let k=0;for(let d=1;d<=12;d++)for(let i=0;i<80;i++){const fav=i%2===0;const hit=fav?(i%10<8):(i%10<3);R.push({id:'t'+(k++),voice:'Judge',sp:'nhl',date:d0(d),game:'T'+(i%7)+'@U'+(i%5),market:'ml',side:i%3?'home':'away',price:fav?-130:120,graded:true,hit});}
  w.eval(`set(VOICES_KEY,${JSON.stringify(R)});localStorage.removeItem(FEEL_TUNE_KEY);`);
  const TU=w.eval('feelTune(true)');
  T('self-tune: the proven fav/dog split earns weight, the feeling beats the plain record on unseen days',TU.W.role>0&&TU.gain>0&&TU.trusted,JSON.stringify({W:TU.W,gain:TU.gain,trusted:TU.trusted}));
  T('…and the Brain listens once it\'s trusted',w.eval(`voterP({id:'tnew',voice:'Judge',sp:'nhl',date:'2026-10-13',game:'T1@U1',market:'ml',side:'home',price:-130},{p:0.5})`)!==0.5);
  /* ── the preset ── */
  w.eval(`window.fullPresetPool=()=>[{game:'ALA@TROY',sport:'ncaaf',kind:'side',pick:'TROY ML',price:150,p:0.45},{game:'LSU@ARK',sport:'ncaaf',kind:'spread',pick:'ARK +3',price:-110,p:0.55},{game:'X@Y',sport:'ncaaf',kind:'side',pick:'Y ML',price:-150,p:0.6}];
    window.applyDupeFilter=x=>x;['ml','spread','total'].forEach(m=>PRESET_MARKETS.add(m));PRESET_HELD.clear();
    set(VOICES_KEY,[{id:'pw1',voice:'Power',sp:'ncaaf',date:today(),game:'ALA@TROY',market:'ml',side:'home',price:150,pP:0.62},{id:'pw2',voice:'Power',sp:'ncaaf',date:today(),game:'LSU@ARK',market:'spread',side:'home',line:3,price:-110,pP:0.58,edge:2.5}]);set(SPLIT_KEY,{});`);
  w.eval('TARGET_LEGS=-1');const legs=w.eval(`buildPreset('power')`);
  T('⚡ Power plays: only the Commissioner\'s calls, with why',legs.length===2&&legs.every(l=>/TROY|ARK/.test(l.pick)&&/Commissioner/.test(l.hotWhy)),legs.map(l=>l.pick+' · '+l.hotWhy).join(' | '));
  w.eval('TARGET_LEGS=1');T('leg count picker is honored',w.eval(`buildPreset('power')`).length===1);
  T('listed, named, files under My picks',w.eval(`PRESETS.some(p=>p[0]==='power')&&PRESET_SOURCE.power==='mine'&&PRESET_DISPLAY_NAME.power==='Power plays'`));
  /* ── housekeeping ── */
  T('history and self-tune stores stay off the sync file',w.eval(`syncSkip('d4.h2hx.nfl')&&syncSkip('d4.feeltune')&&!syncSkip('d4.voices')`));
  w.eval(`set('d4.allfinals',{'nfl:A@B':{sport:'nfl',d:'2026-08-20',a:10,h:13},'nfl:C@D':{sport:'nfl',a:21,h:14,ts:Date.parse('2026-09-21T03:00:00Z')},'nfl:E@F':{sport:'nfl',d:'2099-01-01',a:1,h:2}});`);
  const G=w.eval(`pwrLocalGames('nfl')`),GA=w.eval(`pwrAllGames('nfl')`);
  T('power data: preseason and impossible future finals are dropped; an undated final takes its recorded day',!GA.some(x=>x[1]==='A'||x[1]==='E')&&G.some(x=>x[1]==='C'&&x[0]==='2026-09-20'&&x[6]===1),JSON.stringify(GA));
  T('archive weeks that carried last week\'s games over count each game once',(()=>{w.eval(`set('d4.ncaafarc',{'w2026-6':{rows:[{id:'9',game:'Q@R'}],finals:{'9':{a:7,h:10}}},'w2026-7':{rows:[{id:'9',game:'Q@R'}],finals:{'9':{a:7,h:10}}}})`);const L2=w.eval(`pwrLocalGames('ncaaf').filter(x=>x[1]==='Q')`);return L2.length===1&&L2[0][0]==='2026-10-10';})());
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
