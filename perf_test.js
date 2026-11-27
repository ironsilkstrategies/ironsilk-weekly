const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errors=[];let pend=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){
  // ESPN answers slowly and never has the game — the worst case
  w.fetch=u=>new Promise(r=>setTimeout(()=>r({ok:true,status:200,json:()=>Promise.resolve({events:[]}),text:()=>Promise.resolve('{}')}),40));
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');
  w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
const w=dom.window;
(async()=>{
  await wait(2500);
  // a realistic big archive: 20 weeks × 16 games with judge blobs
  const arc={};for(let k=0;k<20;k++){const rows=[];for(let i=0;i<16;i++)rows.push({id:String(4000+k*16+i),game:'T'+i+'@U'+i,v:2,picks:Array(12).fill({pick:'x',p:.5,price:-110}),judge:{a:21,h:24,box:{away:{pts:21,yds:330},home:{pts:24,yds:340}},why:'x'.repeat(400)}});arc['w2026-'+k]={ts:Date.now(),rows,finals:{}};}
  w.eval(`set(LS.nflarc,${JSON.stringify(arc)})`);
  const legs=[];for(let i=0;i<76;i++)legs.push({game:'MIA@KC',pick:'P'+i+' 40+ Receiving yds',sport:'nfl',gameDate:'2026-09-27',isProp:1,fbProp:{player:'Player '+i,stat:'receiving',thr:40,dir:'atleast'}});
  const T=[];for(let i=0;i<6;i++)T.push({id:100+i,date:'2026-09-27',source:'mine',legs:legs.slice(i*13,i*13+13)});
  w.eval(`set(LS.locked,${JSON.stringify(T)})`);
  let t0=Date.now();w.eval("get(LS.locked,[]).forEach(t=>t.legs.forEach(l=>gradeLeg(l,t.date)))");const grade=Date.now()-t0;
  t0=Date.now();w.eval("tab('tickets',null)");const rt=Date.now()-t0;
  let renders=0;const orig=w.renderTickets;w.renderTickets=function(){renders++;return orig.apply(this,arguments);};
  t0=Date.now();w.eval("tab('mine',null)");const mg=Date.now()-t0;
  await wait(3000);
  const out=[];const chk=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
  chk('grading 76 prop legs stays fast with a season-sized archive (<150ms)',grade<150,grade+'ms (was 626)');
  chk('Tickets tab opens fast (<300ms)',rt<300,rt+'ms (was 1257)');
  chk('My Games opens fast (<400ms)',mg<400,mg+'ms (was 2959)');
  chk('no uncaught errors',errors.length===0);
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})();
