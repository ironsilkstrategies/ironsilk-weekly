const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function load(page,fetcher,iso,seed){
  let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const errors=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    w.fetch=u=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(fetcher(u)),text:()=>Promise.resolve('{}')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
    w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
    Object.entries(seed||{}).forEach(([k,v])=>w.localStorage.setItem(k,JSON.stringify(v)));
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse(iso)]))}static now(){return RD.parse(iso)}}w.Date=FD;
    w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
  return{w:dom.window,errors};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  /* ───────────── NFL: characters, tiers, ledger, brain, box grade ───────────── */
  const nflSB={events:[{id:'9001',date:'2026-09-28T23:15Z',competitions:[{status:{type:{state:'pre',shortDetail:'7:15 PM'},period:0},competitors:[
    {homeAway:'away',team:{abbreviation:'PHI',displayName:'Philadelphia Eagles',id:'21'},score:'0'},
    {homeAway:'home',team:{abbreviation:'CHI',displayName:'Chicago Bears',id:'3'},score:'0'}]}]}]};
  const seed={'d4.preds':{nfl:{'2026-09-28':{'PHI@CHI':{a:21.98,h:18.5}}}},
    'd4.intel':[{sp:'nfl',kind:'cons',game:'PHI@CHI',date:'2026-09-28',market:'moneyline',metric:'money',awayPct:70,homePct:30}]};
  const {w,errors}=load('nfl.html',u=>/scoreboard/.test(u)?nflSB:{}, '2026-09-28T17:10:00Z',seed);
  await wait(3000);
  const INTEL=w.eval('INTEL_KEY');
  if(INTEL!=='d4.intel'){w.eval(`set(INTEL_KEY,${JSON.stringify(seed['d4.intel'])})`);}
  const calls=w.eval("characterCalls('nfl',NFL_GAMES[0],NFL_SIMS[NFL_GAMES[0].id]).map(c=>c.voice+':'+c.market+':'+c.side)");
  T('Sim makes a call on side, spread and total',['Sim:ml:','Sim:spread:','Sim:total:'].every(p=>calls.some(c=>c.startsWith(p))),calls.join(' '));
  T('Pred (gold line PHI 21.98–18.5) picks PHI on the side',calls.includes('Pred:ml:away'),calls.filter(c=>c.startsWith('Pred')).join(' '));
  T('Consensus (70% of money on PHI) picks PHI',calls.includes('Consensus:ml:away'),calls.filter(c=>c.startsWith('Consensus')).join(' '));
  T('Most common score makes its own picks',calls.some(c=>c.startsWith('Most common:')));
  w.eval('renderNFL()');await wait(300);
  const slate=w.document.getElementById('slate').innerHTML;
  T('character chips render on the card squares',(slate.match(/hs-chip/g)||[]).length>=4,(slate.match(/hs-chip/g)||[]).length+' chips');
  T('sim-only squares now carry a tier outline',/class="bet (lean|strong|supreme|conflict)/.test(slate));
  T('the ★ Sim chip is drawn',/hs-chip god/.test(slate));
  T('agreement meter renders',/characters<\/div>|characters ·/.test(slate));
  // tier rule
  const tier=(o,c)=>w.eval(`charTier(${JSON.stringify(o)},${JSON.stringify(c)})`);
  T('app vs crowd = CONFLICT',tier({hasLine:false},{simHere:true,charsAgainst:true})===' conflict');
  T('app + unanimous crowd, no line = SUPREME',tier({hasLine:false},{simHere:true,unanimous:true})===' supreme');
  T('app alone, no line = LEAN (the app always gets an outline)',tier({hasLine:false},{simHere:true})===' lean');
  T('real line: book + model + characters = SUPREME',tier({hasLine:true,bookLeans:true,modelEdgeHere:true},{charsAgree:true})===' supreme');
  T('real line: model edge but characters against = CONFLICT',tier({hasLine:true,modelEdgeHere:true},{charsAgainst:true})===' conflict');
  // per-game team record
  const games=[['LAC@BUF',16,24],['BUF@MIA',27,20],['NYJ@BUF',10,31],['BUF@NE',24,17],['KC@BUF',30,20],['BUF@BAL',14,28]];
  w.eval(`(()=>{const F=get(LS.allfinals,{});${JSON.stringify(games)}.forEach(([g,a,h])=>F[finalsKey('nfl',g)]={sport:'nfl',a,h,ts:1});set(LS.allfinals,F);
    const L=[];let id=1;${JSON.stringify(games)}.forEach(([g],i)=>{for(let k=0;k<10;k++)L.push({id:id++,date:'2026-09-'+String(10+i).padStart(2,'0'),source:'mine',archived:true,legs:[{game:g,pick:'BUF ML',sport:'nfl',price:-150,p:.6}]});});
    set(LS.locked,L);})()`);
  const led=w.eval("(()=>{const T=teamLedger(true);return T.BUF})()");
  T('10 tickets × 6 games on BUF = 4-2, not 40-20',led&&led.sideW===4&&led.sideL===2,led?`${led.sideW}-${led.sideL} n=${led.n}`:'none');
  const chip=w.eval("teamRecordChip('BUF')");
  T('card chip shows the per-game record',/BUF you <b>4-2<\/b>/.test(chip),chip.replace(/\s+/g,' ').slice(0,120));
  // brain learns from graded character calls
  w.eval(`(()=>{const V=[];for(let i=0;i<30;i++)V.push({id:'x'+i,sp:'nfl',date:'2026-09-0'+(i%9+1),game:'G'+i+'@H',voice:'Judge',market:'total',side:'under',line:44,graded:true,hit:i<22});
    for(let i=0;i<30;i++)V.push({id:'y'+i,sp:'nfl',date:'2026-09-0'+(i%9+1),game:'G'+i+'@H',voice:'Sim',market:'total',side:'under',line:44,graded:true,hit:i<22});
    for(let i=0;i<30;i++)V.push({id:'z'+i,sp:'nfl',date:'2026-09-0'+(i%9+1),game:'G'+i+'@H',voice:'Coach',market:'total',side:'over',line:44,graded:true,hit:i<10});
    set(VOICES_KEY,V);})()`);
  const rj=w.eval("charRate('nfl','Judge','total','under')"),rc=w.eval("charRate('nfl','Coach','total','over')");
  T('brain: Judge 22-8 on unders is trusted above 50% (shrunk below raw 73%)',rj.p>0.6&&rj.p<0.733,rj.p.toFixed(3));
  T('brain: Coach 10-20 on overs is marked below 50%',rc.p<0.42,rc.p.toFixed(3));
  const wj=w.eval("charWeight('nfl','Judge','total','under').w"),wc=w.eval("charWeight('nfl','Coach','total','over').w"),ws=w.eval("charWeight('nfl','Sim','total','under').w");
  T('weights: Sim ≥ 2 (reigns), Judge > 1, Coach < 1',ws>=2&&wj>1&&wc<1,`sim ${ws.toFixed(2)} judge ${wj.toFixed(2)} coach ${wc.toFixed(2)}`);
  const rep=w.eval("charBrainReport('nfl')");
  T('character brain report names best edge + crowd-vs-app buckets',/Judge/.test(rep)&&/crowd meets the app/.test(rep));
  // predicted box grade
  const G=w.eval("predBoxGrade('nfl',{away:{yds:340,pass:240,rush:100},home:{yds:300,pass:200,rush:100}},{away:{yds:350,pass:250,rush:100},home:{yds:200,pass:150,rush:50}})");
  T('predicted box graded per stat with a letter',G&&G.rows.length===6&&/[ABCDF]/.test(G.letter)&&G.rows.find(r=>r.sd==='away'&&r.st==='rush').miss===0,G&&G.letter);
  T('NFL: no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));

  /* ───────────── NHL: upcoming days + seeded lines + judge lock ───────────── */
  const comp=(side,name,abbr,id)=>({homeAway:side,team:{displayName:name,abbreviation:abbr,id},score:'',linescores:[],records:[{summary:'0-0-0'}]});
  const ev=(id,date,a,h)=>({id,date,season:{type:1},status:{type:{state:'pre',shortDetail:'x'},period:0},competitions:[{competitors:[comp('away',...a),comp('home',...h)]}]});
  const upcoming={season:{year:2027},events:[
    ev('501','2026-09-29T21:07Z',['Florida Panthers','FLA','26'],['Carolina Hurricanes','CAR','7']),
    // listed the OTHER way round on purpose — seed must flip to match
    ev('502','2026-09-30T00:07Z',['Boston Bruins','BOS','1'],['New York Rangers','NYR','13']),
    ev('503','2026-09-30T23:37Z',['Pittsburgh Penguins','PIT','16'],['Philadelphia Flyers','PHI','15'])]};
  const today_={season:{year:2027},events:[]};
  const st=(ab,name)=>({team:{abbreviation:ab,displayName:name},stats:[{name:'gamesPlayed',value:82},{name:'pointsFor',value:250},{name:'pointsAgainst',value:245}]});
  const stand={children:[{standings:{entries:[st('FLA','Florida Panthers'),st('CAR','Carolina Hurricanes'),st('BOS','Boston Bruins'),st('NYR','New York Rangers'),st('PIT','Pittsburgh Penguins'),st('PHI','Philadelphia Flyers')]}}]};
  const H=load('nhl.html',u=>/scoreboard\?dates=\d{8}-\d{8}/.test(u)?upcoming:/scoreboard/.test(u)?today_:/standings/.test(u)?stand:{}, '2026-09-28T18:36:00Z');
  await wait(3500);
  const hw=H.w;
  const up=hw.eval("NHL_UPCOMING.map(g=>g.__date+' '+g.away.abbr+'@'+g.home.abbr)");
  T('upcoming NHL games load with their local game dates',up.join(',')==='2026-09-29 FLA@CAR,2026-09-29 BOS@NYR,2026-09-30 PIT@PHI',up.join(','));
  const fl=hw.eval("nhlLineObj('FLA@CAR')");
  T('seeded FLA@CAR lines on tap: ML +109/-123, PL -225/+189, O6.5 +109',fl.awayML&&fl.awayML.price===109&&fl.homeML.price===-123&&fl.awayPL.price===-225&&fl.homePL.price===189&&fl.over.line===6.5&&fl.over.price===109,
    JSON.stringify([fl.awayML&&fl.awayML.price,fl.homeML&&fl.homeML.price,fl.awayPL&&fl.awayPL.price,fl.over&&fl.over.price]));
  const bn=hw.eval("nhlLineObj('BOS@NYR')");
  T('seed flipped to ESPN orientation: BOS (listed home in the seed) keeps -112',bn.awayML&&bn.awayML.price===-112&&bn.homeML.price===-102&&bn.awayPL.line===-1.5,JSON.stringify([bn.awayML&&bn.awayML.price,bn.homeML&&bn.homeML.price,bn.awayPL&&bn.awayPL.line]));
  const pp=hw.eval("nhlLineObj('PIT@PHI')");
  T('Wed PIT@PHI: ML + total, no puck line',pp.awayML.price===110&&pp.homeML.price===-125&&pp.over.line===5.5&&!pp.awayPL);
  T('seeded lines filed under the GAME date, not today',hw.eval("!!(get(NHL_LS.shots,{})['2026-09-29']||[]).length&&!(get(NHL_LS.shots,{})['2026-09-28']||[]).length"));
  hw.eval('renderNHL()');await wait(300);
  const sl=hw.document.getElementById('slate').innerHTML;
  T('board shows the upcoming section with full cards',/upcoming/.test(sl)&&/FLA/.test(sl)&&/\+109/.test(sl),'');
  T('upcoming squares carry REAL badges and character chips',/REAL/.test(sl)&&/hs-chip/.test(sl));
  T('seed runs once (no duplicates on reboot)',hw.eval("nhlApplySeed()")===0);
  T('NHL: no uncaught errors',H.errors.length===0,H.errors.slice(0,3).join(' || '));

  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
