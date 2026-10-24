/* v2.57 · the Best card's Unfreeze button clears today's freeze and re-runs the master evaluation */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);const NOW=Date.parse('2026-10-24T15:00:00Z'),D='2026-10-24';
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_BACKFILL__=true;x.__NO_SYNC_LOOP__=true;x.__NO_FLIP_RELOAD__=true;
  x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  w.eval(`set(BEST5_KEY,{d:'${D}',locked:true,lockedAt:Date.now(),top3:[{sp:'nhl',game:'A@B',pick:'B ML',price:-150,start:'2026-10-24T23:00:00Z'}],bySport:{},picks:[],props:[]});set(FREEZE_KEY,{d:'${D}',ts:Date.now()});set(EVAL_LOCK_KEY,{date:'${D}',by:{nhl:1}});
    window.__ran=0;sportGames=()=>[{}];masterEvalAll=function(){window.__ran++;return Promise.resolve();};if(!document.getElementById('bestCard')){const d=document.createElement('div');d.id='bestCard';document.body.appendChild(d);}renderBest();`);
  T('the Best card has the Unfreeze button',/Unfreeze &amp; re-evaluate every sport/.test(w.document.getElementById('bestCard').innerHTML));
  const ok=w.eval('deskUnfreezeNow()');
  T('tapping it clears the freeze, the eval locks and the Best 3',ok===true&&w.eval(`!(get(FREEZE_KEY,{})||{}).d&&!(get(EVAL_LOCK_KEY,{})||{}).date&&!get(BEST5_KEY,{}).locked`));
  setTimeout(()=>{T('…and re-runs the master evaluation',w.eval('window.__ran')===1,String(w.eval('window.__ran')));
    const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3000);
}catch(e){console.log('FAIL crash',e.stack);process.exit(0);}},3000);
