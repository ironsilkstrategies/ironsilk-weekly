/* v2.81.3 · 🩺 system health: every loop's last good run, what's wrong, a fix button, and a self-healing pass */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function page(file,qs){let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file+(qs||''),pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;const T0=RD.now();class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-31T17:00:00Z')+(RD.now()-T0)]))}static now(){return RD.parse('2026-10-31T17:00:00Z')+(RD.now()-T0)}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,headers:{get:()=>null},json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  const w=page('nba.html');await sleep(2500);
  /* a loop that fails is listed with its error and a fix */
  w.eval(`window.__N=0;AP_STEPS.push(['zz','Test loop','a loop for the test',()=>{window.__N++;if(window.__FAILZZ)throw new Error('boom');return 7;}]);window.__FAILZZ=true;`);
  await w.eval(`apStepRun('zz','test')`);
  let C=w.eval('healthChecks(false)');let z=C.find(x=>x.k==='ap:zz');
  T('a failed loop shows red with its error and a ↻ fix',z&&z.st==='bad'&&/boom/.test(z.note)&&/apStepRun\('zz'/.test(z.fix||''),JSON.stringify(z));
  /* the self-healing pass re-runs it (once it's 10+ min old) */
  w.eval(`(()=>{const M=get(AP_STEPS_KEY,{});M.zz.fail.ts-=11*60e3;set(AP_STEPS_KEY,M);})();window.__FAILZZ=false;`);
  const r=await w.eval('healthTick(true)');
  T('the self-healing pass re-runs the failed loop',r&&r.k==='zz'&&r.ok===1&&w.eval('window.__N')===2,JSON.stringify(r));
  C=w.eval('healthChecks(false)');T('…and it leaves the list',!C.some(x=>x.k==='ap:zz'));
  T('the heal is logged',/self-heal: zz/.test(JSON.stringify(w.eval(`get(HEAL_KEY,[])`))));
  /* a stale rule audit is re-judged by the next pass */
  w.eval(`localStorage.removeItem(RULE_KEY);RULE_NOW_C=null;`);C=w.eval('healthChecks(false)');
  T('a rule audit not judged today shows yellow',(C.find(x=>x.k==='rules')||{}).st==='warn');
  const r2=await w.eval('healthTick(true)');T('…and the next pass re-judges it',r2&&r2.k==='rules'&&w.eval('get(RULE_KEY,null).d===today()'));
  /* every runner records each loop's result */
  w.eval(`AP_STEPS.length=0;AP_STEPS.push(['a1','A','',()=>1],['a2','B','',()=>{throw new Error('nope')}]);apRun(true,'test');`);
  const M=w.eval('get(AP_STEPS_KEY,{})');T('a full autopilot run records every loop (good and failed)',M.a1&&M.a1.ok&&M.a2&&M.a2.fail&&/nope/.test(M.a2.fail.err),JSON.stringify(M.a2));
  /* the freeze recorder feeds it */
  w.eval(`localStorage.setItem(FRZ_KEY,JSON.stringify([{kind:'stall',ms:6200,ts:Date.now()-3600e3,page:'cfb',tab:'games',step:'renderNCAAF'}]))`);
  C=w.eval('healthChecks(false)');const f=C.find(x=>x.k==='frz');T('a 6 s stall in the last day shows red with where it happened',f&&f.st==='bad'&&/6\.2 s on cfb · renderNCAAF/.test(f.note),JSON.stringify(f));
  /* the board and the chip */
  const H=w.eval('engineRoomHtml()');T('Engine Room opens with the health board',/^<div class="tkt" id="healthBoard"/.test(H)&&/System health/.test(H));
  T('red items sort first',H.indexOf('🔴')<H.indexOf('🟢')||H.indexOf('🟢')<0);
  T('the Best tab carries a one-line health chip',/🩺/.test(w.eval('healthChipHtml()'))&&(()=>{w.eval("tab('best')");return /🩺/.test(w.document.getElementById('bestCard').innerHTML);})());
  T('the health chip never rebuilds the Best card (read-only)',!/best5State\(\)/.test(w.eval('healthChecks.toString()')));
  w.close();
  /* never on a relay page */
  const b=page('nba.html','?bg=1&eval=1');await sleep(2500);
  T('the self-healing pass never runs on a relay (bg=1) page',(await b.eval('healthTick(true)'))===null);
  b.close();
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
