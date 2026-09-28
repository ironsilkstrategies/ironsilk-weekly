const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const nflSB={events:[{id:'9001',date:'2026-09-28T23:15Z',competitions:[{status:{type:{state:'pre',shortDetail:'7:15 PM'},period:0},competitors:[
  {homeAway:'away',team:{abbreviation:'PHI',displayName:'Philadelphia Eagles',id:'21'},score:'0'},{homeAway:'home',team:{abbreviation:'CHI',displayName:'Chicago Bears',id:'3'},score:'0'}]}]}]};
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=u=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(/football\/nfl\/scoreboard/.test(u)?nflSB:{}),text:()=>Promise.resolve('{}')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;
  w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
  const RD=w.Date;let off=0;w.__adv=ms=>{off+=ms};class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-28T13:00:00Z')+off]))}static now(){return RD.parse('2026-09-28T13:00:00Z')+off}}w.Date=FD;
  w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
const w=dom.window;
const L=(ml,spA,spH,spL)=>JSON.stringify([{away:'PHI',home:'CHI',game:'PHI@CHI',market:'moneyline',side:'away',line:null,price:ml[0]},{away:'PHI',home:'CHI',game:'PHI@CHI',market:'moneyline',side:'home',line:null,price:ml[1]},
  {away:'PHI',home:'CHI',game:'PHI@CHI',market:'spread',side:'away',line:-spL,price:spA},{away:'PHI',home:'CHI',game:'PHI@CHI',market:'spread',side:'home',line:spL,price:spH},
  {away:'PHI',home:'CHI',game:'PHI@CHI',market:'total',side:'over',line:41.5,price:-105},{away:'PHI',home:'CHI',game:'PHI@CHI',market:'total',side:'under',line:41.5,price:-115}]);
(async()=>{
  await wait(3000);
  // ── CLV: 8am lines, then the market moves before kickoff ──
  w.eval(`saveNFLBookOdds(${L([-198,164],-112,-108,3.5)},null)`);w.eval("clvCapture('nfl')");
  w.__adv(6*3600e3);
  w.eval(`saveNFLBookOdds(${L([-220,180],-110,-110,3)},null)`);w.eval("clvCapture('nfl')");
  const sp=w.eval("nflBookLinesFor('PHI@CHI').filter(x=>x.market==='spread'&&x.side==='home')");
  T('moved spread REPLACES the old one (was: stale 3.5 kept, board read it)',sp.length===1&&sp[0].line===3&&sp[0].price===-110,JSON.stringify(sp.map(x=>[x.line,x.price])));
  w.eval(`saveNFLBookOdds([{away:'PHI',home:'CHI',game:'PHI@CHI',market:'prop',side:'over',line:44.5,price:-115,player:'A.J. Brown',stat:'receiving'},{away:'PHI',home:'CHI',game:'PHI@CHI',market:'prop',side:'over',line:44.5,price:-110,player:'DJ Moore',stat:'receiving'}],null)`);
  T('two players at the same prop line both kept',w.eval("nflBookLinesFor('PHI@CHI').filter(x=>x.market==='prop'&&x.line===44.5).length")===2);
  const e=w.eval("clvEntry('nfl','PHI@CHI','ml','away',today())");
  T('open and close both kept (PHI ML -198 → -220)',e&&e.open.price===-198&&e.close.price===-220,e&&JSON.stringify([e.open.price,e.close.price]));
  const t={id:1,date:'2026-09-28',source:'mine',legs:[{game:'PHI@CHI',pick:'PHI ML',sport:'nfl',price:-198},{game:'PHI@CHI',pick:'CHI +3.5',sport:'nfl',price:-108}]};
  const c1=w.eval(`clvLeg(${JSON.stringify(t.legs[0])},${JSON.stringify(t)})`),c2=w.eval(`clvLeg(${JSON.stringify(t.legs[1])},${JSON.stringify(t)})`);
  T('you beat the close on PHI ML by +2.3 chance pts',c1&&Math.abs(c1.pct-2.31)<0.05,c1&&c1.pct.toFixed(2));
  T('CHI +3.5 vs a +3 close = +0.5 pts of CLV',c2&&c2.pts===0.5,JSON.stringify(c2));
  w.eval(`set(VOICES_KEY,[{id:'j1',sp:'nfl',date:today(),game:'PHI@CHI',voice:'Judge',market:'ml',side:'away',price:-198},{id:'c1',sp:'nfl',date:today(),game:'PHI@CHI',voice:'Coach',market:'ml',side:'home',price:164}])`);
  const S=w.eval('clvSummary()');
  T('market moved toward Judge (PHI) and away from Coach (CHI)',S.ch.Judge&&S.ch.Judge.s>0&&S.ch.Coach&&S.ch.Coach.s<0,JSON.stringify(S.ch));
  // ── rule badges ──
  const g=w.eval('NFL_GAMES[0]');
  const R=p=>w.eval(`rulesFor('nfl',NFL_GAMES[0],${JSON.stringify(p)})`).map(r=>r.icon+' '+r.text);
  T('🔑 +3.5 flagged as past the 3',R('CHI +3.5').some(x=>/^🔑 \+3\.5 is past 3/.test(x)),R('CHI +3.5').join(' | '));
  T('🔑 -3.5 flagged as needing 4+',R('PHI -3.5').some(x=>/needs 4\+/.test(x)),R('PHI -3.5').join(' | '));
  T('🔑 a line ON 3 flagged as push risk',R('CHI +3').some(x=>/ON a key number/.test(x)));
  T('no key-number badge on totals',!R('Over 41.5').some(x=>x.startsWith('🔑')));
  w.eval(`set(INTEL_KEY,[{sp:'nfl',kind:'cons',game:'PHI@CHI',date:today(),market:'moneyline',metric:'bets',awayPct:75,homePct:25},
    {sp:'nfl',kind:'cons',game:'PHI@CHI',date:today(),market:'moneyline',metric:'money',awayPct:52,homePct:48}])`);
  T('💰 sharp split on CHI: 48% of money on 25% of tickets',R('CHI ML').some(x=>/^💰 sharp split: 48% of money on 25% of tickets/.test(x)),R('CHI ML').join(' | '));
  w.eval(`set(INTEL_KEY,[{sp:'nfl',kind:'cons',game:'PHI@CHI',date:today(),market:'moneyline',metric:'bets',awayPct:75,homePct:25}])`);
  T('👥 heavy public on PHI at 75% of tickets',R('PHI ML').some(x=>/^👥 75% of tickets/.test(x)),R('PHI ML').join(' | '));
  // learned: Judge proven in both fav and dog spots on NFL sides
  const V=[];for(let i=0;i<20;i++){V.push({id:'f'+i,sp:'nfl',date:'2026-09-0'+(i%9+1),game:'X'+i+'@Y',voice:'Judge',market:'ml',side:'home',price:-150,graded:true,hit:i<16});
    V.push({id:'d'+i,sp:'nfl',date:'2026-09-0'+(i%9+1),game:'X'+i+'@Y',voice:'Judge',market:'ml',side:'away',price:140,graded:true,hit:i<16});
    V.push({id:'c'+i,sp:'nfl',date:'2026-09-0'+(i%9+1),game:'X'+i+'@Y',voice:'Coach',market:'ml',side:'away',price:140,graded:true,hit:i<5});
    V.push({id:'s'+i,sp:'nfl',date:'2026-09-0'+(i%9+1),game:'X'+i+'@Y',voice:'Sim',market:'ml',side:'home',price:-150,graded:true,hit:i<16});}
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)})`);
  const judgeSide=w.eval("characterCalls('nfl',NFL_GAMES[0],NFL_SIMS[NFL_GAMES[0].id]).find(c=>c.voice==='Judge'&&c.market==='ml').side");
  const jp=judgeSide==='home'?'CHI ML':'PHI ML';
  T('🔥 learned badge: Judge 16-4 shows on the side Judge picked',R(jp).some(x=>/^🔥 J 16-4 NFL/.test(x)),jp+': '+R(jp).join(' | '));
  const mkV=(n,hits)=>{const V=[];for(let i=0;i<n;i++)V.push({id:'q'+i,sp:'nfl',date:'2026-09-0'+(i%9+1),game:'Q'+i+'@R',voice:'Judge',market:'ml',side:judgeSide,price:judgeSide==='home'?-150:140,graded:true,hit:i<hits});return V;};
  w.eval(`set(VOICES_KEY,${JSON.stringify(mkV(8,7))})`);
  T('8 graded calls (7-1) now earns the 🔥 badge',R(jp).some(x=>/^🔥 J 7-1/.test(x)),R(jp).join(' | '));
  w.eval(`set(VOICES_KEY,${JSON.stringify(mkV(7,7))})`);
  T('7 calls is still too few — no badge, even at 7-0',!R(jp).some(x=>x.startsWith('🔥')),R(jp).join(' | '));
  w.eval(`set(VOICES_KEY,${JSON.stringify(mkV(8,5))})`);
  T('a lucky 5-3 does not badge (shrinkage)',!R(jp).some(x=>x.startsWith('🔥')),R(jp).join(' | '));
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)})`);
  w.eval('renderNFL()');await wait(300);
  const slate=w.document.getElementById('slate').innerHTML;
  T('rule badges render on the live board squares',/class="rule learned"/.test(slate)&&/class="rule principle"/.test(slate));
  // ── playbooks + CLV in the Records hub ──
  w.eval(`set(LS.locked,[${JSON.stringify(t)}])`);w.eval("tab('grades',null)");await wait(300);
  const hub=w.document.getElementById('recordsHub').innerHTML;
  T('Records hub shows Closing line value',/Closing line value/.test(hub)&&/You: <b[^>]*>\+/.test(hub));
  T('Playbooks list Judge edges and Coach as a fade',/Playbooks/.test(hub)&&/🔥 play: NFL side/.test(hub)&&/🧊 fade: NFL side/.test(hub));
  const C=w.eval("todayCandidates('nfl')");
  T("Today's card carries the rule badges",C.some(x=>(x.rules||[]).length>0),C.map(x=>x.pick+':'+(x.rules||[]).map(r=>r.icon).join('')).join(' '));
  T('no uncaught errors',errors.length===0,errors.slice(0,3).join(' || '));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
