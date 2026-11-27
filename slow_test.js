const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const games=[];for(let i=0;i<14;i++)games.push({id:String(9100+i),date:'2026-09-29T23:15Z',competitions:[{status:{type:{state:'pre',shortDetail:'7:15 PM'},period:0},competitors:[
  {homeAway:'away',team:{abbreviation:['PHI','DAL','NYG','WSH','GB','MIN','DET','CHI','SF','SEA','LAR','ARI','ATL','NO'][i],displayName:'A'+i,id:String(i+1)},score:'0'},
  {homeAway:'home',team:{abbreviation:['BUF','MIA','NE','NYJ','BAL','CIN','CLE','PIT','HOU','IND','JAX','TEN','KC','LV'][i],displayName:'H'+i,id:String(i+40)},score:'0'}]}]});
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=u=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(/nfl\/scoreboard/.test(u)?{events:games}:{}),text:()=>Promise.resolve('{}')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;
  w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-09-29T17:00:00Z')]))}static now(){return RD.parse('2026-09-29T17:00:00Z')}}w.Date=FD;
  w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
const w=dom.window;const out=[];const chk=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
(async()=>{
  await wait(3000);
  // a heavy-use month of data
  w.eval(`(()=>{const V=[];const vs=['Sim','Judge','Coach','Most common','Pred','Trends','Consensus','Books'],ms=['ml','spread','total'];
    for(let i=0;i<7000;i++)V.push({id:'v'+i,sp:['nfl','mlb','nhl','ncaaf'][i%4],date:'2026-09-'+String(1+i%28).padStart(2,'0'),game:'G'+(i%300)+'@H',voice:vs[i%8],market:ms[i%3],side:i%2?'home':'away',price:i%2?-130:120,line:-3,graded:true,hit:i%3!==0,units:.5});
    set(VOICES_KEY,V);
    const I=[];for(let i=0;i<2500;i++)I.push({sp:'nfl',kind:i%2?'cons':'pred',game:'G'+i+'@H',date:'2026-09-2'+(i%9),market:'moneyline',metric:'bets',homePct:55,awayPct:45,a:20,h:24,src:'Covers'});set(INTEL_KEY,I);
    const F=get(LS.allfinals,{});const L=[];for(let t=0;t<160;t++){const legs=[];for(let k=0;k<8;k++){const g='X'+(t*8+k)+'@Y';F[finalsKey('nfl',g)]={sport:'nfl',a:20,h:24,ts:1};legs.push({game:g,pick:'Y ML',sport:'nfl',price:-120});}
      L.push({id:5000+t,date:'2026-09-'+String(1+t%27).padStart(2,'0'),source:'mine',archived:true,legs});}
    set(LS.allfinals,F);set(LS.locked,L);})()`);
  w.eval("msStart('dollar_grand');msStart('three_pockets');msStart('heist');");
  let t0=Date.now();w.eval('renderNFL()');const board=Date.now()-t0;
  t0=Date.now();w.eval("tab('money',null)");const money=Date.now()-t0;
  t0=Date.now();w.eval("MS_CAT='multi';msRender()");const click=Date.now()-t0;
  t0=Date.now();w.eval("msPickRoute(msAll()[2].id,'stairs|2|0.25')");const pick=Date.now()-t0;
  chk('NFL board (14 games) renders fast (<1500ms)',board<1500,board+'ms');
  chk('Money tab opens fast (<1500ms)',money<1500,money+'ms');
  chk('switching mission category is quick (<600ms)',click<600,click+'ms');
  chk('changing a route is quick (<800ms)',pick<800,pick+'ms');
  chk('no uncaught errors',errors.length===0,errors.slice(0,2).join(' | '));
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
