const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const DROP=fs.readFileSync(path.join(W,'intake/2026-10-09.txt'),'utf8');
function boot(page,store){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-09T19:30:00Z')]))}static now(){return RD.parse('2026-10-09T19:30:00Z')}}w.Date=FD;
    w.fetch=u=>{u=String(u);if(/intake\/2026-10-09\.txt/.test(u))return Promise.resolve({ok:true,status:200,text:()=>Promise.resolve(DROP),json:()=>Promise.resolve({})});
      return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');
    Object.entries(store||{}).forEach(([k,v])=>w.localStorage.setItem(k,v));}}).window;}
const dump=w=>{const o={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);o[k]=w.localStorage.getItem(k);}return o;};
const nhl=boot('nhl.html');
setTimeout(()=>{try{
  const G=[['PIT','Pittsburgh Penguins','CBJ','Columbus Blue Jackets'],['NYR','New York Rangers','WSH','Washington Capitals'],['SEA','Seattle Kraken','DET','Detroit Red Wings'],['ANA','Anaheim Ducks','WPG','Winnipeg Jets']]
    .map(([a,an,h,hn],i)=>({id:'n'+i,abstract:'pre',start:'2026-10-09T23:07:00Z',time:'6:07 PM',away:{abbr:a,name:an},home:{abbr:h,name:hn}}));
  nhl.eval(`NHL_GAMES.length=0;NHL_GAMES.push(...${JSON.stringify(G)});`);
  const I=nhl.eval('JSON.stringify(nhlEvalInputs())');
  T('NHL eval sees today\'s lines, Covers preds and trends',/"lined":4/.test(I)&&/"preds":4/.test(I)&&/"trends":32/.test(I),I);
  T('NHL page → Model eval shows the NHL evaluator (not MLB\'s)',/NHL master evaluation/.test(nhl.eval("masterEvalFor('nhl')")));
  T('before running: parlays not frozen',nhl.eval('evalRanToday()')===false);
  const ev=nhl.eval('runNHLMasterEval()');
  T('evaluates all 4 games',ev.length===4,String(ev.length));
  const pit=ev.find(e=>e.game==='PIT@CBJ');const labs=pit.mkts.map(m=>m.label).join(', ');
  T('every posted market scored (ML, puck line, total, P1 ML/PL/total)',pit.mkts.length===6,labs);
  T('Covers prediction is a witness on every full-game market',pit.mkts.filter(m=>['ml','pl','total'].includes(m.market)).every(m=>m.sig.some(s=>s.src==='Prediction')));
  T('EV uses the book price (−115 ML math is sane)',pit.mkts.every(m=>isFinite(m.ev)&&Math.abs(m.ev)<60));
  T('running ANY sport\'s eval is "the master evaluation ran" (parlays freeze)',nhl.eval('evalRanToday()')===true&&nhl.eval('cparState().locked')===true);
  if(process.env.SHOW)ev.forEach(e=>console.log(e.game,e.mkts.map(m=>m.label+' '+m.verdict+' '+(m.p*100).toFixed(0)+'% '+m.ev.toFixed(1)+' ['+m.sig.map(s=>s.src+(s.ok?'+':'-')).join(',')+']').join(' | ')));
  const strip=nhl.eval("evalSportStrip('nhl')");
  T('status strip: NHL ✓, others link to their page\'s eval',/NHL <span[^>]*>✓/.test(strip)&&/cfb\.html\?b=[^']+#eval/.test(strip)&&/mlb\.html\?b=[^']+#eval/.test(strip));
  T('rendered eval lists results',/PIT@CBJ/.test(nhl.eval('renderNHLMasterEval()')));
  // the CFB page sees that NHL already ran, and its own eval still routes to football
  const cfb=boot('cfb.html',dump(nhl));
  setTimeout(()=>{try{
    T('CFB page: Model eval routes to the CFB evaluator',/CFB master evaluation/.test(cfb.eval("masterEvalFor('ncaaf')")));
    T('CFB page: strip shows NHL already evaluated today',/NHL <span[^>]*>✓/.test(cfb.eval("evalSportStrip('ncaaf')")));
    T('NBA has an honest placeholder, not MLB\'s eval',/Not built for this sport yet/.test(cfb.eval("masterEvalFor('nba')")));
  }catch(e){T('harness cfb',false,e.stack)}
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
}catch(e){T('harness',false,e.stack);console.log(out.join('\n'));process.exit(0);}},3500);
