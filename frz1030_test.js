/* v2.80.3 · the freeze recorder: stalls, crash-restarts, dialogs aren't freezes, Settings shows it, the crash guard
   only counts real crashes, and the device-local keys never sync. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function page(file,pre){let html=fs.readFileSync(path.join(W,file),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;const T0=RD.parse('2026-10-30T19:30:00Z'),t0=RD.now();class FD extends RD{constructor(...a){super(...(a.length?a:[T0+(RD.now()-t0)]))}static now(){return T0+(RD.now()-t0)}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__FRZ_TEST__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>{const a=RD.now();while(RD.now()-a<3200){}return true;};w.localStorage.setItem('d4.setupDone','1');if(pre)pre(w,T0);}}).window;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  /* a previous page died on screen 10 s ago (no pagehide) */
  const w=page('nba.html',(w,T0)=>{w.localStorage.setItem('d4.perflive',JSON.stringify({t:T0-10e3,page:'nhl',tab:'grades',act:'Run master evaluation [masterEvalAll()]',b:'x'}));});
  await sleep(2500);
  let L=JSON.parse(w.localStorage.getItem('d4.perfstalls')||'[]');
  const rs=L.find(x=>x.kind==='restart');
  T('a page that died on screen is recorded as a restart on the next load, with what was tapped',rs&&rs.page==='nhl'&&rs.tab==='grades'&&/master evaluation/.test(rs.act),JSON.stringify(rs));
  T('this page is marked live',JSON.parse(w.localStorage.getItem('d4.perflive')).t>0);
  /* a tap, then a 3 s stuck screen */
  const b=w.document.createElement('button');b.setAttribute('onclick',"tab('grades')");b.textContent='Records';w.document.body.appendChild(b);
  b.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await sleep(1200);   /* let the boot window pass for the classification below */
  w.eval(`FRZ.t0=Date.now()-60e3;`);
  w.eval(`setTimeout(()=>{const a=performance.now();while(performance.now()-a<3300){}},10)`);
  await sleep(5200);
  L=JSON.parse(w.localStorage.getItem('d4.perfstalls')||'[]');
  const st=L.find(x=>x.kind==='stall');
  T('a 3 s+ stuck screen is recorded with its length and the last tap',st&&st.ms>=2000&&/Records/.test(st.act)&&st.page==='nba',JSON.stringify(st));
  /* a confirm() dialog held for 3 s is not a freeze */
  const n0=L.filter(x=>x.kind==='stall').length;
  w.eval(`setTimeout(()=>{window.confirm('sure?')},10)`);await sleep(5200);
  L=JSON.parse(w.localStorage.getItem('d4.perfstalls')||'[]');
  T('time spent in a confirm/alert dialog is not counted as a freeze',L.filter(x=>x.kind==='stall').length===n0,L.length+' entries');
  /* Settings shows it */
  const H=w.eval('storageMeterHtml()');
  T('Settings lists stuck screens and restarts',/Freezes &amp; restarts/.test(H)&&/stuck 3\.\d|stuck [2-4]\.\d/.test(H)&&/restart/.test(H),H.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(-400));
  /* leaving on purpose */
  w.dispatchEvent(new w.Event('pagehide'));
  T('leaving the page on purpose clears the live mark (no false restart next time)',JSON.parse(w.localStorage.getItem('d4.perflive')).t===0);
  T('leaving the page on purpose settles the crash guard (fast page hops never trip safe mode)',JSON.parse(w.localStorage.getItem('d4.bootguard')||'{}').ok===true);
  T('the freeze log, the live mark, the crash guard and the relay never sync',w.eval(`syncSkip('d4.perfstalls')&&syncSkip('d4.perflive')&&syncSkip('d4.bootguard')&&syncSkip('d4.evalchain')`));
  T('clearing empties the list',(w.eval(`frzClear();frzList().length`))===0);
  w.close();
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
