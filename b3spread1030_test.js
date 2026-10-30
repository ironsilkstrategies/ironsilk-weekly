/* v2.80.5 · the optional "spread the Best 3 across sports" switch */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nba.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nba.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-30T19:30:00Z')]))}static now(){return RD.parse('2026-10-30T19:30:00Z')}}w.Date=FD;
  w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  /* the safety rules are the card's own; here they're stubbed so the test is about the spread logic */
  w.eval(`tcIsToday=x=>!x.tomorrow;best5Started=x=>!!x.started;laneStatus=()=> 'ok';pickLane=()=> 'k';pickDisagrees=x=>!!x.fights;pickConfAny=(x)=>x.anyP!=null?x.anyP:null;`);
  const nba=(g,pick,fit,price)=>({sp:'nba',game:g,pick,price:price||-110,p:0.72,ev:5,fit,m:'ml',sd:'home'});
  const top=[nba('A@B','B ML',0.9),nba('C@D','D ML',0.8),nba('E@F','F ML',0.7)];
  const by=(nhl)=>({nba:{picks:top},nhl:{picks:nhl}});
  T('off by default — the card never forces a pick',w.eval('b3SpreadOn()')===false);
  let r=w.eval(`best3Spread(${JSON.stringify(by([{game:'BOS@TOR',pick:'TOR ML',price:-120,anyP:0.62,m:'ml',sd:'home'}]))},${JSON.stringify(top)})`);
  T('a sport with no qualifying play takes the weakest slot from the sport holding two+',r.length===3&&r.some(x=>x.sp==='nhl'&&x.spread)&&!r.some(x=>x.pick==='F ML'),r.map(x=>x.pick).join(', '));
  T('the spread pick is marked and listed after the real ones',r[2].spread===true&&r[0].pick==='B ML'&&r[1].pick==='D ML');
  r=w.eval(`best3Spread(${JSON.stringify(by([{game:'BOS@TOR',pick:'TOR ML',price:-120,anyP:0.52,m:'ml',sd:'home'}]))},${JSON.stringify(top)})`);
  T('below 55% from every character: no spread pick',!r.some(x=>x.spread));
  r=w.eval(`best3Spread(${JSON.stringify(by([{game:'BOS@TOR',pick:'TOR ML',price:-250,anyP:0.75,m:'ml',sd:'home'}]))},${JSON.stringify(top)})`);
  T('the price window still holds (-250 stays off)',!r.some(x=>x.spread));
  r=w.eval(`best3Spread(${JSON.stringify(by([{game:'BOS@TOR',pick:'TOR ML',price:-120,anyP:0.7,started:true,m:'ml',sd:'home'},{game:'X@Y',pick:'Y ML',price:105,anyP:0.6,fights:true,m:'ml',sd:'home'}]))},${JSON.stringify(top)})`);
  T('started games and model-fighting-the-market picks stay off',!r.some(x=>x.spread));
  r=w.eval(`best3Spread(${JSON.stringify(by([{game:'BOS@TOR',pick:'TOR ML',price:+150,anyP:0.35,m:'ml',sd:'home'}]))},${JSON.stringify(top)})`);
  T('negative EV stays off',!r.some(x=>x.spread));
  r=w.eval(`best3Spread(${JSON.stringify(by([{game:'BOS@TOR',pick:'TOR ML',price:-120,anyP:0.62,m:'ml',sd:'home'}]))},${JSON.stringify(top.slice(0,2))})`);
  T('a card with an open slot just adds it',r.length===3&&r[2].spread===true);
  const three=[nba('A@B','B ML',0.9),{...nba('G@H','H ML',0.8),sp:'ncaab'},{...nba('I@J','J ML',0.7),sp:'mlb'}];
  r=w.eval(`best3Spread(${JSON.stringify({nba:{picks:[three[0]]},ncaab:{picks:[three[1]]},mlb:{picks:[three[2]]},nhl:{picks:[{game:'BOS@TOR',pick:'TOR ML',price:-120,anyP:0.62,m:'ml',sd:'home'}]}})},${JSON.stringify(three)})`);
  T('one pick per sport already: nobody gives up a slot',!r.some(x=>x.spread)&&r.length===3);
  w.eval('b3SpreadToggle()');T('the switch turns it on',w.eval('b3SpreadOn()')===true);
  const txt=w.eval(`subTelegramText({d:'2026-10-30',best:[{sp:'nba',game:'A@B',pick:'B ML',price:-110,p:0.72},{sp:'nhl',game:'BOS@TOR',pick:'TOR ML',price:-120,p:0.62,spread:true}],top10:[],chars:[],props:[],locked:true,record:null}).join('\\n')`);
  T('the VIP post marks it 🌐 and says what that means',/🌐 <b>TOR ML/.test(txt)&&/spread pick: below the 70% bar/.test(txt),txt.slice(0,300));
  const card=w.eval(`bestPublicCardHtml({top3:[{sp:'nhl',game:'BOS@TOR',pick:'TOR ML',price:-120,p:0.62,ev:4,spread:true}],locked:true},{})`);
  T('the card shows it as a spread pick',/🌐 spread pick/.test(card));
  w.eval('b3SpreadToggle()');T('and off again',w.eval('b3SpreadOn()')===false);
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
