/* v2.82.3 · the "App code did not load" screen fired at 9 s while a background page was still opening the phone's storage
   (v2.82.2 lets it wait up to 20 s) and wiped the page mid-evaluation. Now it looks again while storage is opening. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function guardOf(f){const s=fs.readFileSync(path.join(W,f),'utf8');const m=s.match(/<script>\n\/\* ── DEPLOYMENT GUARD[\s\S]*?<\/script>/);return m?m[0].slice(8,-9):null;}
function run(f,setup){const w=new JSDOM('<!doctype html><body><div id="app">board</div></body>',{runScripts:'outside-only',url:'https://ironsilkweekly.com/'+f}).window;
  let now=0;const Q=[];w.setTimeout=(fn,ms)=>{Q.push({at:now+(ms||0),fn});return Q.length;};
  const adv=ms=>{const end=now+ms;for(;;){Q.sort((a,b)=>a.at-b.at);const q=Q[0];if(!q||q.at>end)break;Q.shift();now=q.at;q.fn();}now=end;};
  if(setup)setup(w);w.eval(guardOf(f));w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));return{w,adv,body:()=>w.document.body.textContent};}
try{
  for(const f of ['nfl.html','nba.html','nhl.html','cfb.html','ncaab.html','mlb.html']){
    T(`${f}: has the guard`,!!guardOf(f));
    const a=run(f,w=>{w.__D4_WAIT=1;});a.adv(9500);
    T(`${f}: 9 s in, storage still opening → the page is left alone`,/board/.test(a.body())&&!/did not load/.test(a.body()));
    a.w.get=function(){};a.w.__D4_WAIT=0;a.adv(5000);T(`${f}: …and the app loads at 12 s: nothing wiped`,/board/.test(a.body()));
    const b=run(f,w=>{w.__D4_WAIT=1;});b.adv(9500);b.w.__D4_WAIT=0;b.adv(4500);
    T(`${f}: storage opened but the code really didn't load → it still says so`,/App code did not load/.test(b.body()));
    const c=run(f,w=>{w.__D4_WAIT=1;});c.adv(60000);T(`${f}: storage never opens → it gives up and says so (about 49 s)`,/App code did not load/.test(c.body()));
    const d=run(f);d.adv(9500);T(`${f}: no storage wait and no code at 9 s → the message, as before`,/App code did not load/.test(d.body()));}
  const sj=fs.readFileSync(path.join(W,'store.js'),'utf8');
  T('store.js marks the wait and clears it when the app starts',/window\.__D4_WAIT=Date\.now\(\);var go=function\(\)\{if\(done\)return;done=true;window\.__D4_WAIT=0;run\(\);\}/.test(sj));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);
