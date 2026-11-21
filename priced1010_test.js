const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const EV={events:[{id:'77',date:'2026-10-08T23:00:00Z',status:{type:{state:'post',shortDetail:'Final'},period:3},competitions:[{competitors:[
  {homeAway:'away',score:'2',team:{displayName:'Seattle Kraken',abbreviation:'SEA',id:'1'},linescores:[{value:1},{value:1},{value:0}]},
  {homeAway:'home',score:'4',team:{displayName:'Detroit Red Wings',abbreviation:'DET',id:'2'},linescores:[{value:2},{value:1},{value:1}]}]}]}]};
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
let asked=[];
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T19:30:00Z')]))}static now(){return RD.parse('2026-10-10T19:30:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;
  w.fetch=u=>{u=String(u);if(/nhl\/scoreboard\?dates=\d{8}-\d{8}&limit=300/.test(u)){asked.push(u);return Promise.resolve({ok:true,json:()=>Promise.resolve(EV)});}return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  const L=(o)=>w.eval(`luckSkillPriced(${JSON.stringify(o)})`);
  const mk=(w_,n,price)=>{const q=price<0?-price/(-price+100):100/(price+100);return{w:w_,n,be:q*n,bv:q*(1-q)*n};};
  T('68% on -300 legs is BELOW break-even (needs 75%), not "strong skill"',L(mk(196,287,-300)).lab==='below breakeven',L(mk(196,287,-300)).lab);
  T('68% on -110 legs is strong skill',L(mk(196,287,-110)).lab==='strong sign of skill');
  T('45% on +150 dogs (needs 40%) still reads as skill-leaning or better',/skill/.test(L(mk(90,200,150)).lab),L(mk(90,200,150)).lab);
  T('nhlProfit refuses a zero/missing price instead of returning Infinity',w.eval('nhlProfit(0)')===null&&w.eval('nhlProfit(undefined)')===null&&Math.abs(w.eval('nhlProfit(-150)')-0.6667)<0.001);
  w.eval(`set(NHL_LS.arc,{'2026-10-08':{rows:[{gid:'77',picks:[{m:'ml',side:'home',price:-150},{m:'ml',side:'away',price:0},{m:'total',side:'over',line:6,price:-110}]}]}})`);
  const n=await w.eval('nhlBackfillFinals(true)');
  T('past-day NHL picks get their finals (one ranged scoreboard call)',n===1&&asked.length===1&&/dates=20261008-20261009/.test(asked[0]),asked[0]);
  let g=w.document.getElementById('gradeBody');if(!g){g=w.document.createElement('div');g.id='gradeBody';w.document.body.appendChild(g);}
  w.eval('renderNHLRecord()');const H=g.innerHTML;
  T('record has no Infinity and flags the unpriced pick',!/Infinity/.test(H)&&/1 unpriced/.test(H),H.slice(0,300).replace(/<[^>]+>/g,' '));
  T('nothing left waiting on finals',!/waiting on finals/.test(H));
  T('a second call inside 10 minutes is throttled',await w.eval('nhlBackfillFinals()')===0&&asked.length===1);
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
