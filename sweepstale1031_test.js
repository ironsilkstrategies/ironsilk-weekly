/* v2.80.10 · the grade sweeper's heavy pass doesn't re-run on every page load for legs it already couldn't settle,
   a tap on "Sweep again" always runs it, and the relay pages (bg=1) don't sweep at all */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function page(file,qs){let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file+(qs||''),pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-31T15:00:00Z')+(RD.now()-T00)]))}static now(){return RD.parse('2026-10-31T15:00:00Z')+(RD.now()-T00)}}const T00=RD.now();w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
(async()=>{try{
  const w=page('nba.html');await new Promise(r=>setTimeout(r,2500));
  w.eval(`window.__MG=0;mgRefresh=async function(){window.__MG++;};sweepAutoRekey=function(){};regradeAllProps=async function(){};backfillGrading=async function(){};
    sweepOverdue=function(){return[{t:{id:'T1',name:'Slip'},i:0,l:{pick:'GB 1H spread',game:'GB@CHI',gameDate:'2026-10-25'},sp:'nfl',d:'2026-10-25'}];};
    legDiagnose=function(){return{code:'pick',msg:'a pick it can\\'t read'};};localStorage.removeItem(GHEALTH_KEY);`);
  await w.eval(`gradeSweep({force:true})`);
  T('first sweep with a stuck leg does the heavy pass',w.eval('window.__MG')===1);
  w.eval('SWEEP_TS=0');await w.eval(`gradeSweep({force:true})`);
  T('the next page load (same stuck leg, within 30 min) skips it',w.eval('window.__MG')===1,String(w.eval('window.__MG')));
  T('the stuck leg is still listed with its reason',(w.eval('get(GHEALTH_KEY,null).left')||[]).length===1);
  w.eval('SWEEP_TS=0');await w.eval(`gradeSweep({force:true,user:true})`);
  T('tapping "Sweep again" always runs it',w.eval('window.__MG')===2);
  w.eval(`sweepOverdue=function(){return[{t:{id:'T1'},i:0,l:{pick:'GB 1H spread',game:'GB@CHI'},sp:'nfl',d:'2026-10-25'},{t:{id:'T2'},i:1,l:{pick:'NEW leg',game:'A@B'},sp:'nba',d:'2026-10-30'}];};SWEEP_TS=0;`);
  await w.eval(`gradeSweep({force:true})`);
  T('a newly overdue leg brings the heavy pass back',w.eval('window.__MG')===3);
  w.close();
  const src=fs.readFileSync(path.join(W,'shared.js'),'utf8');
  T('relay pages (bg=1) never start the sweeper',/!window\.__NO_GRADELOOP__&&!\(typeof location!=='undefined'&&\/\[\?&\]bg=1\//.test(src));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
