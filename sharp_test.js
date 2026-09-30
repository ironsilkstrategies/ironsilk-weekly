const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const comp=(side,name,abbr,id)=>({homeAway:side,team:{displayName:name,abbreviation:abbr,id},score:'',linescores:[],records:[{summary:'0-0-0'}]});
const sb={season:{year:2027,type:2},events:[{id:'502',date:'2026-09-30T02:00Z',season:{type:2},status:{type:{state:'pre',shortDetail:'9:00 PM'},period:0},competitions:[{competitors:[comp('away','Vancouver Canucks','VAN','23'),comp('home','Edmonton Oilers','EDM','6')]}]}]};
const st=(ab,name,gp,gf,ga)=>({team:{abbreviation:ab,displayName:name},stats:[{name:'gamesPlayed',value:gp},{name:'pointsFor',value:gf},{name:'pointsAgainst',value:ga}]});
const stand={children:[{standings:{entries:[st('VAN','Vancouver Canucks',82,225,270),st('EDM','Edmonton Oilers',82,300,235)]}}]};
let PIN={h2h:[['Vancouver Canucks',215],['Edmonton Oilers',-255]],sp:[['Vancouver Canucks',1.5,-120],['Edmonton Oilers',-1.5,100]],tot:[6.5,-115,-105]};
const pinnacle=()=>[{away_team:'Vancouver Canucks',home_team:'Edmonton Oilers',commence_time:'2026-09-30T02:00:00Z',bookmakers:[{key:'pinnacle',markets:[
  {key:'h2h',outcomes:PIN.h2h.map(([n,p])=>({name:n,price:p}))},{key:'spreads',outcomes:PIN.sp.map(([n,pt,p])=>({name:n,point:pt,price:p}))},
  {key:'totals',outcomes:[{name:'Over',point:PIN.tot[0],price:PIN.tot[1]},{name:'Under',point:PIN.tot[0],price:PIN.tot[2]}]}]}]}];
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errors=[];const calls=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=u=>{calls.push(u);let j={};if(/the-odds-api.*icehockey_nhl/.test(u))j=pinnacle();else if(/the-odds-api/.test(u))j=[];else if(/hockey\/nhl\/scoreboard/.test(u))j=/dates=\d{8}-\d{8}/.test(u)?{events:[]}:sb;else if(/standings/.test(u))j=stand;
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(j),text:()=>Promise.resolve('{}')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.key',JSON.stringify('ODDSKEY'));w.localStorage.setItem('d4.setupDone','1');w.localStorage.setItem('d4.nhlseed',JSON.stringify({}));
  const RD=w.Date;let off=0;w.__adv=ms=>{off+=ms};class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-29T15:00:00Z')+off]))}static now(){return RD.parse('2026-09-29T15:00:00Z')+off}}w.Date=FD;
  w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
const w=dom.window;
(async()=>{
  await wait(3500);
  // your book (sportsbetting.ag) for the same game — VAN is +232 here vs Pinnacle +215
  w.eval(`nhlPutLines([['moneyline','away',null,232],['moneyline','home',null,-270],['spread','away',1.5,-110],['spread','home',-1.5,-110],['total','over',6.5,-125],['total','under',6.5,109]]
    .map(([market,side,line,price])=>({away:'VAN',home:'EDM',game:'VAN@EDM',market,side,line,price,src:'mine',capturedAt:Date.now()})))`);
  // ── 4. power devig
  const pw=w.eval('devigPower(imp(215),imp(-255))'),mul=w.eval('(()=>{const a=imp(215),b=imp(-255);return[a/(a+b),b/(a+b)]})()');
  T('power devig: probabilities sum to 1',Math.abs(pw[0]+pw[1]-1)<1e-9);
  T('power devig puts more of the margin on the longshot (VAN fair < even split)',pw[0]<mul[0],`power ${(pw[0]*100).toFixed(2)}% vs even ${(mul[0]*100).toFixed(2)}%`);
  // ── 1. pull Pinnacle, fair price, ⚡ badge
  const r=await w.eval('pullSharp(["nhl"])');
  T('pulls Pinnacle through your Odds API key (regions=eu, pinnacle only)',r.n===6&&calls.some(u=>/regions=eu&bookmakers=pinnacle/.test(u)&&/apiKey=ODDSKEY/.test(u)),JSON.stringify(r));
  const f=w.eval("sharpFair('nhl','VAN@EDM','ml','away',null)");
  T('sharp fair chance for VAN from Pinnacle, margin removed',f&&Math.abs(f.p-pw[0])<1e-6,f&&(f.p*100).toFixed(2)+'%');
  const g=()=>w.eval("NHL_GAMES.find(z=>z.away.abbr==='VAN')");
  const R=p=>w.eval(`rulesFor('nhl',NHL_GAMES.find(z=>z.away.abbr==='VAN'),${JSON.stringify(p)})`).map(x=>x.icon+' '+x.text);
  const van=R('VAN ML');
  T('VAN +232 is NOT flagged: vs Pinnacle fair 29.6% it pays back 0.98 (a small loss)',!van.some(x=>x.startsWith('⚡')),van.join(' | '));
  const un=R('Under 6.5');
  T('the Under at +109 vs Pinnacle -105 flags ⚡ too',un.some(x=>x.startsWith('⚡')),un.join(' | '));
  const ov=R('Over 6.5');
  T('the Over at -125 (worse than sharp) gets no ⚡',!ov.some(x=>x.startsWith('⚡')),ov.join(' | '));
  // ── 5. every Sim call carries its own % and the market's
  const sc=w.eval("characterCalls('nhl',NHL_GAMES.find(z=>z.away.abbr==='VAN'),nhlSimFor(NHL_GAMES.find(z=>z.away.abbr==='VAN'))).filter(c=>c.voice==='Sim')");
  T('Sim calls record simP + the sharp market %',sc.length>=3&&sc.every(c=>c.simP>0&&c.mktP>0&&c.mktSrc==='sharp'),JSON.stringify(sc.map(c=>[c.market,c.side,c.simP,c.mktP])));
  // ── 2. CLV vs the sharp close
  w.eval("clvCapture('nhl')");w.__adv(5*3600e3);
  PIN={h2h:[['Vancouver Canucks',175],['Edmonton Oilers',-205]],sp:PIN.sp,tot:PIN.tot};await w.eval('pullSharp(["nhl"])');
  const e=w.eval("clvEntry('nhl','VAN@EDM','ml','away|S',today())");
  T('sharp open +215 and close +175 both kept',e&&e.open.price===215&&e.close.price===175,e&&JSON.stringify([e.open.price,e.close.price]));
  const t={id:1,date:'2026-09-29',source:'mine',legs:[{game:'VAN@EDM',pick:'VAN ML',sport:'nhl',price:232,gameDate:'2026-09-29'}]};
  const cs=w.eval(`clvLegSharp(${JSON.stringify(t.legs[0])},${JSON.stringify(t)})`);
  const fc=w.eval('devigPower(imp(175),imp(-205))[0]');
  T('VAN +232 graded against the sharp close: +EV = fair × payout − 1',cs&&Math.abs(cs.ev-(fc*3.32-1)*100)<1e-6&&cs.ev>0,cs&&cs.ev.toFixed(2)+'%');
  w.eval(`set(LS.locked,[${JSON.stringify(t)}])`);
  const clv=w.eval('clvHtml()');
  T('Records shows CLV vs the SHARP close',/vs the SHARP close \(Pinnacle\)/.test(clv)&&/% EV/.test(clv));
  // ── 9. line movement: steam + reverse line move against the public
  const R2=R('VAN ML');
  T('📈 steam badge: sharp price moved toward VAN (+215 → +175)',R2.some(x=>/sharp steam: 215 → 175/.test(x)),R2.join(' | '));
  w.eval(`set(INTEL_KEY,[{sp:'nhl',kind:'cons',game:'VAN@EDM',date:today(),market:'moneyline',metric:'bets',awayPct:21,homePct:79}])`);
  const R3=R('VAN ML');
  T('🔄 reverse line move: price toward VAN with only 21% of tickets on VAN',R3.some(x=>/^🔄 reverse line move: sharp price moved here \(215→175\) with only 21% of tickets/.test(x)),R3.join(' | '));
  // ── 3. correlated parlays
  const corr=legs=>w.eval(`parlayCorrelation({legs:${JSON.stringify(legs.map(p=>({game:'VAN@EDM',pick:p,sport:'nhl'})))}})`);
  const c1=corr(['EDM ML','EDM -1.5']);
  const pEdm=w.eval("(()=>{const g=NHL_GAMES.find(z=>z.away.abbr==='VAN');const D=gameDraws('nhl',nhlSimFor(g),4000,7);return D.filter(([a,h])=>h>a).length/D.length})()");
  T('EDM ML + EDM -1.5 move together: ratio = 1 ÷ P(EDM wins), exactly as the math says',Math.abs(c1.groups[0].ratio-1/pEdm)<0.01&&c1.groups[0].ratio>1.2,`ratio ${c1.groups[0].ratio.toFixed(2)} · joint ${(c1.joint*100).toFixed(1)}% vs indep ${(c1.indep*100).toFixed(1)}%`);
  const c2=corr(['EDM ML','VAN ML']);
  T('EDM ML + VAN ML can never both win: joint 0',c2.joint===0);
  const c3=corr(['VAN +1.5','Under 6.5']);
  T('VAN +1.5 + Under: the dog covering and a low score go together (ratio > 1)',c3.groups[0].ratio>1.0,c3.groups[0].ratio.toFixed(2));
  const card=w.eval(`parlayCorrHtml({id:9,imported:true,stake:'1',toWin:'3',legs:[{game:'VAN@EDM',pick:'EDM ML',sport:'nhl'},{game:'VAN@EDM',pick:'EDM -1.5',sport:'nhl'}]})`);
  T('ticket card explains it: true chance vs independent vs what the book pays',/Same-game legs/.test(card)&&/legs help each other/.test(card)&&/book pays like 1 in 4/.test(card),card.replace(/<[^>]+>/g,'').slice(0,160));
  // ── 5. blend learns which predicts better
  const mkV=(better)=>{const V=[];for(let i=0;i<120;i++){const hit=i%10<6;const good=hit?0.6:0.4,bad=0.5;V.push({id:'b'+i,sp:'nhl',voice:'Sim',market:'ml',side:'home',graded:true,hit,simP:better==='sim'?good:bad,mktP:better==='sim'?bad:good});}return V;};
  w.eval(`set(VOICES_KEY,${JSON.stringify(mkV('mkt'))})`);const wm=w.eval("blendWeight('nhl','ml').w");
  w.eval(`set(VOICES_KEY,${JSON.stringify(mkV('sim'))})`);const ws=w.eval("blendWeight('nhl','ml').w");
  T('blend leans to the market when the market has predicted better',wm<0.35,wm.toFixed(2));
  T('blend leans to the Sim when the Sim has predicted better',ws>0.65,ws.toFixed(2));
  // ── 6. calibration + luck vs skill
  const cal=w.eval('calibrationHtml()');
  T('calibration table: said vs actually won, with Brier score',/actually won/.test(cal)&&/Brier 0\.\d{3}/.test(cal));
  const L1=w.eval('luckSkill(11,20)'),L2=w.eval('luckSkill(15,5+15)'),L3=w.eval('luckSkill(60,100)'),L4=w.eval('luckSkill(8,20)');
  T('luck vs skill: 11-9 = could be luck, 15-5 = strong sign, 60-40 = leaning, 8-12 = below breakeven',L1.lab==='could easily be luck'&&L2.lab==='strong sign of skill'&&L3.lab==='leaning skill'&&L4.lab==='below breakeven',[L1,L2,L3,L4].map(x=>x.lab+(x.p!=null?' p='+x.p.toFixed(3):'')).join(' | '));
  // ── 7. data-mined trend haircut
  const ev=w.eval(`(()=>{const g=NHL_GAMES.find(z=>z.away.abbr==='VAN');const orig=brainAdapter;let L=[];
    brainAdapter=function(sp){const A=orig(sp);return{...A,trends:()=>L};};
    L=[{text:'Over is 8-0 in Canucks last 8',team:'VAN'},{text:'Over is 7-1 in Canucks last 8',team:'VAN'},{text:'Over is 6-2 in Oilers last 8',team:'EDM'}];const a=brainTrendEvidence(g,'nhl');
    L=[{text:'Over is 8-0 in Canucks last 8',team:'VAN'}];const b=brainTrendEvidence(g,'nhl');brainAdapter=orig;return{three:a.dTot,one:b.dTot}})()`);
  const ps=(8+20)/(8+40)-0.5;
  const raw=w.eval("BR_CFG.nhl.trTot")*ps*w.eval("(typeof intelTrendFactor==='function'?intelTrendFactor('nhl','VAN'):1)");
  T('one 8-0 trend keeps exactly 20% of its raw pull (half × 8/20 sample)',Math.abs(ev.one-raw*0.2)<1e-9,`${ev.one.toFixed(4)} vs raw ${raw.toFixed(4)}`);
  T('stacked trends pointing the same way add less and less (3 trends < 1.9× one)',ev.three<ev.one*1.9,`${ev.three.toFixed(4)} vs ${ev.one.toFixed(4)}`);
  // ── 8. risk of ruin + correlated stakes
  w.eval("set(BR_AMT,'100')");
  const mk=(n,stake,win,lose)=>{const L=[];for(let i=0;i<n;i++){const won=i%3===0;L.push({id:'r'+i,date:'2026-09-0'+(i%9+1),source:'mine',archived:true,imported:true,stake:String(stake),toWin:String(win),legs:[{game:'Z'+i+'@Y',pick:'Y ML',sport:'nhl',price:-110}]});}return L;};
  const F=[];for(let i=0;i<30;i++)F.push([i]);
  w.eval(`(()=>{const F=get(LS.allfinals,{});for(let i=0;i<30;i++){F[finalsKey('nhl','Z'+i+'@Y')]={sport:'nhl',a:i%3===0?1:3,h:i%3===0?3:1,ts:1};}set(LS.allfinals,F);})()`);
  w.eval(`set(LS.locked,${JSON.stringify(mk(30,2,4))})`);const small=w.eval('(ROR_C=null,riskOfRuin())');
  w.eval(`set(LS.locked,${JSON.stringify(mk(30,25,50))})`);const big=w.eval('(ROR_C=null,riskOfRuin())');
  T('risk of ruin from your own history: $2 stakes safe, $25 stakes dangerous',small.ruin<0.05&&big.ruin>small.ruin&&big.half>0.5,`$2: ruin ${(small.ruin*100).toFixed(1)}% · $25: ruin ${(big.ruin*100).toFixed(1)}%, halve ${(big.half*100).toFixed(0)}%`);
  const cs2=w.eval(`correlatedStakes([{sp:'nhl',game:'A@B',mp:0.62,price:-110},{sp:'nhl',game:'A@B',mp:0.62,price:-110},{sp:'nhl',game:'C@D',mp:0.62,price:-110}])`);
  T('two picks in one game each stake 1/√2 of a lone pick',Math.abs(cs2[0].stakeF/cs2[2].stakeF-1/Math.sqrt(2))<1e-9,`${cs2[0].stakeF.toFixed(4)} vs ${cs2[2].stakeF.toFixed(4)}`);
  const many=[];for(let i=0;i<12;i++)many.push({sp:'nhl',game:'G'+i,mp:0.7,price:-110});const cm=w.eval(`correlatedStakes(${JSON.stringify(many)})`);
  T('a day\'s total stake is capped at 10% of bankroll',Math.abs(cm.reduce((a,x)=>a+x.stakeF,0)-0.10)<1e-9&&cm[0].capped);
  w.eval("tab('money',null)");await wait(200);
  T('Money tab shows risk of ruin',/Risk of ruin/.test(w.document.getElementById('moneyBody').innerHTML));
  T('Today tab has the ⚡ Pull sharp lines button',/Pull sharp lines/.test(w.document.getElementById('v-today').innerHTML));
  T('no uncaught errors',errors.length===0,errors.slice(0,2).join('|'));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
