/* v2.43 · the 70% rule stands; a sport with NO 70% call on a day drops to 65% for that day.
   From Oct 17 on only (earlier records don't move). Meta voices, unpriced and preseason calls don't count as "a 70% call". */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW=Date.parse('2026-10-18T15:00:00Z'),D='2026-10-18';
let id=0;const c=(sp,date,voice,game,market,side,price,cf,extra)=>({id:'t'+(++id),sp,date,game,gid:'g'+id,voice,market,side,line:null,price,pick:'x',cf,...(extra||{})});
const V=[
  c('nhl',D,'Sim','DAL@CHI','ml','away',-191,0.72),      /* NHL has a 70% call → NHL floor stays 70 */
  c('nhl',D,'Judge','NJ@WSH','ml','home',-120,0.66),     /* → not official */
  c('ncaaf',D,'Judge','OSU@IU','spread','home',-115,0.66),/* CFB has none at 70 → floor 65 → official */
  c('ncaaf',D,'Sim','PITT@BC','spread','away',-116,0.63), /* under 65 → not official */
  c('ncaaf',D,'Brain','UL@TROY','ml','home',-155,0.80),   /* a META voice at 80 doesn't count as CFB's 70% call */
  c('ncaaf',D,'Most common','X@Y','ml','home',null,0.78), /* unpriced: doesn't count */
  c('ncaaf','2026-10-16','Judge','A@B','spread','home',-110,0.66), /* before Oct 17: floor stays 70 */
];
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.setupDone','1');w.localStorage.setItem('d4.voices',JSON.stringify(V));}}).window;
setTimeout(()=>{try{
  const off=i=>w.eval(`isOfficial(get(VOICES_KEY,[])[${i}])`);
  T('NHL has a 70% call: its 72% call is official',off(0)===true);
  T('…and its 66% call is NOT (the 70% rule stands for NHL)',off(1)===false);
  T('CFB has no 70% call: its floor drops to 65% — a 66% call is official',off(2)===true);
  T('…a 63% CFB call is still not',off(3)===false);
  T('a meta voice (Brain) at 80% does not count as CFB’s 70% call',w.eval(`confFloorFor({sp:'ncaaf',market:'spread',date:'${D}'})`)===0.65);
  T('an unpriced 78% call does not count either',w.eval(`confHas70().has('ncaaf|${D}')`)===false);
  T('before Oct 17 nothing changes: a 66% CFB call from Oct 16 stays unofficial (records don’t move)',off(6)===false&&w.eval(`confFloorFor({sp:'ncaaf',market:'spread',date:'2026-10-16'})`)===0.70);
  T('NHL’s floor is 70, CFB’s is 65 on the same day',w.eval(`confFloorFor({sp:'nhl',market:'ml',date:'${D}'})`)===0.70&&w.eval(`confFloorFor({sp:'ncaaf',market:'ml',date:'${D}'})`)===0.65);
  /* the Best 3 sees it: the 66% CFB spread call makes the pick official */
  const o=w.eval(`pickConf({sp:'ncaaf',game:'OSU@IU',m:'spread',sd:'home'},'ncaaf')`);
  T('Best 3 / parlays see the CFB call as official (pickConf)',o&&o.n===1&&Math.abs(o.cf-0.66)<1e-9&&o.who[0]==='Judge',JSON.stringify(o));
  const n=w.eval(`(()=>{const B={ncaaf:{picks:[{sp:'ncaaf',game:'OSU@IU',m:'spread',sd:'home',pick:'IU +3',price:-115,start:'2026-10-18T20:00Z'}]}};return best3Pool(B,null).map(x=>x.pick+' '+Math.round(x.p*100)+'%');})()`);
  T('…and it can make the Best 3 (66%, priced -115)',n.length===1&&n[0]==='IU +3 66%',JSON.stringify(n));
  /* a custom floor set in Ideology still wins when it's lower */
  w.eval(`set(CONF_FLOOR_KEY,{spread:0.60})`);w.eval('CONF_FB_C=null');
  T('a lower floor set by hand in Ideology is respected',w.eval(`confFloorFor({sp:'ncaaf',market:'spread',date:'${D}'})`)===0.60);
}catch(e){T('no crash',false,e.stack.slice(0,400));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3000);
