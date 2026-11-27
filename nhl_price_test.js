const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const comp=(side,name,abbr,id)=>({homeAway:side,team:{displayName:name,abbreviation:abbr,id},score:'',linescores:[],records:[{summary:'0-0-0'}]});
// ESPN hands back a 0 moneyline for VAN@EDM (the kind of feed hiccup that must never become a price)
const sb={season:{year:2027,type:1},events:[
 {id:'501',date:'2026-09-29T23:00Z',season:{type:1},status:{type:{state:'pre',shortDetail:'6:00 PM'},period:0},competitions:[{competitors:[comp('away','Montreal Canadiens','MTL','8'),comp('home','Toronto Maple Leafs','TOR','10')]}]},
 {id:'502',date:'2026-09-30T02:00Z',season:{type:1},status:{type:{state:'pre',shortDetail:'9:00 PM'},period:0},competitions:[{competitors:[comp('away','Vancouver Canucks','VAN','23'),comp('home','Edmonton Oilers','EDM','6')],
   odds:[{overUnder:6.5,overOdds:-125,underOdds:109,awayTeamOdds:{moneyLine:0,spreadOdds:-110},homeTeamOdds:{moneyLine:0,spreadOdds:-110},pointSpread:{away:{close:{line:'+1.5'}},home:{close:{line:'-1.5'}}}}]}]}]};
const st=(ab,name,gp,gf,ga)=>({team:{abbreviation:ab,displayName:name},stats:[{name:'gamesPlayed',value:gp},{name:'pointsFor',value:gf},{name:'pointsAgainst',value:ga}]});
const stand={children:[{standings:{entries:[st('MTL','Montreal Canadiens',82,250,250),st('TOR','Toronto Maple Leafs',82,260,245),st('VAN','Vancouver Canucks',82,225,270),st('EDM','Edmonton Oilers',82,300,235)]}}]};
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errors=[];const info=[];
const TD='2026-09-29';
// what was sitting in storage: a newer "mine" moneyline at 0 on top of the real seeded lines
const bad={[TD]:[
  ...[['MTL@TOR','MTL','TOR',-102,-112,1.5,-260,215,6.5,-102,-114]].flatMap(([g,a,h,mla,mlh,pl,pla,plh,t,o,u])=>{const b={away:a,home:h,game:g,src:'mine',capturedAt:1000};
    return[{...b,market:'moneyline',side:'away',line:null,price:mla},{...b,market:'moneyline',side:'home',line:null,price:mlh},{...b,market:'spread',side:'away',line:pl,price:pla},{...b,market:'spread',side:'home',line:-pl,price:plh},
      {...b,market:'total',side:'over',line:t,price:o},{...b,market:'total',side:'under',line:t,price:u},
      {...b,capturedAt:2000,market:'moneyline',side:'away',line:null,price:0},{...b,capturedAt:2000,market:'moneyline',side:'home',line:null,price:0}];})]};
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=u=>{const j=/hockey\/nhl\/scoreboard/.test(u)?(/dates=\d{8}-\d{8}/.test(u)?{events:[]}:sb):/standings/.test(u)?stand:{};return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(j),text:()=>Promise.resolve('{}')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
  w.localStorage.setItem('d4.nhlseed',JSON.stringify({x:1}));
  w.localStorage.setItem('d4.nhlshots',JSON.stringify(bad));
  const ci=w.console.info;w.console.info=(...a)=>{info.push(a.join(' '));};
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-29T20:00:00Z')]))}static now(){return RD.parse('2026-09-29T20:00:00Z')}}w.Date=FD;
  w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
const w=dom.window;
(async()=>{
  await wait(3500);
  T('on load, the stored 0-priced moneylines are removed',info.some(x=>/removed 2 stored line/.test(x)),info.join(' | '));
  const L=w.eval("nhlLineObj('MTL@TOR')");
  T('MTL@TOR moneyline shows the real -102 / -112 again',L.awayML&&L.awayML.price===-102&&L.homeML.price===-112,JSON.stringify([L.awayML&&L.awayML.price,L.homeML&&L.homeML.price]));
  // a 0 arriving later through any door is refused
  w.eval(`nhlPutLines([{away:'MTL',home:'TOR',game:'MTL@TOR',market:'moneyline',side:'away',line:null,price:0,src:'mine',capturedAt:Date.now()},{away:'MTL',home:'TOR',game:'MTL@TOR',market:'moneyline',side:'home',line:null,price:'EVEN',src:'mine',capturedAt:Date.now()}])`);
  const L2=w.eval("nhlLineObj('MTL@TOR')");
  T('a new 0 price is refused; "EVEN" is stored as +100',L2.awayML.price===-102&&L2.homeML.price===100,JSON.stringify([L2.awayML.price,L2.homeML.price]));
  const E=w.eval("nhlLineObj('VAN@EDM')");
  const espnML=w.eval("(get(NHL_LS.shots,{})[today()]||[]).filter(x=>x.game==='VAN@EDM'&&x.src==='espn'&&x.market==='moneyline').length");
  const espnOther=w.eval("(get(NHL_LS.shots,{})[today()]||[]).filter(x=>x.game==='VAN@EDM'&&x.src==='espn'&&x.market!=='moneyline').length");
  T('ESPN\'s 0 moneyline is never stored (its good total + puck line are)',espnML===0&&espnOther===4,`espn ML rows ${espnML}, other espn rows ${espnOther}`);
  T('VAN@EDM moneyline comes from your sportsbetting.ag seed: +232 / -270',E.awayML&&E.awayML.price===232&&E.homeML.price===-270,JSON.stringify([E.awayML&&E.awayML.price,E.homeML&&E.homeML.price]));
  w.eval('renderNHL()');await wait(300);
  const slate=w.document.getElementById('slate').innerHTML;
  T('no "Infinity" anywhere on the board',!/Infinity/.test(slate));
  T('no moneyline square showing a "0" price',!/<div class="bo"[^>]*>0<\/div>/.test(slate));
  T('edge chips only quote finite EVs',!/EDGE[^<]*NaN|EDGE[^<]*Infinity/.test(slate));
  // Judge: with EDM a clear favorite (standings + sim), a 0 price must not flip it to a VAN rout
  const J=w.eval("(()=>{const g=NHL_GAMES.find(z=>z.away.abbr==='VAN');const s=nhlSimFor(g);const J=brainJudge(g,s,'nhl');return J?{a:J.a,h:J.h,sa:s.awayProj,sh:s.homeProj}:null})()");
  T('Judge sides with the sim\'s favorite (EDM), no VAN blowout',J&&J.h>J.a&&isFinite(J.a)&&isFinite(J.h),JSON.stringify(J));
  // 🤝 badge: sport + market specific, not one all-sports number on every square
  const V=[];for(let i=0;i<12;i++){V.push({id:'s'+i,sp:'mlb',date:'2026-09-0'+(i%9+1),game:'G'+i+'@H',voice:'Sim',market:'ml',side:'home',price:-150,graded:true,hit:i<10},{id:'j'+i,sp:'mlb',date:'2026-09-0'+(i%9+1),game:'G'+i+'@H',voice:'Judge',market:'ml',side:'home',price:-150,graded:true,hit:i<10});}
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)})`);
  const r=w.eval("(()=>{const g=NHL_GAMES.find(z=>z.away.abbr==='MTL');return rulesFor('nhl',g,'MTL ML').filter(x=>x.icon==='🤝').map(x=>x.text)})()");
  T('an MLB side record (10-2) no longer stamps 🤝 on NHL squares',r.length===0,JSON.stringify(r));
  T('no uncaught errors',errors.length===0,errors.slice(0,2).join('|'));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
