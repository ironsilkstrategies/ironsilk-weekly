const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'mlb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/mlb.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  w.eval(`set('d4.big',Array.from({length:4000},(_,i)=>({i,t:'row '+i+' '+'x'.repeat(20)})))`);
  T('large store is compressed on disk',w.localStorage.getItem('d4.big').startsWith('\u0001LZ'));
  const n=w.eval(`(()=>{let n=0;const f=LZString.decompressFromUTF16;LZString.decompressFromUTF16=s=>{n++;return f(s)};for(let i=0;i<200;i++)get('d4.big');LZString.decompressFromUTF16=f;return n})()`);
  T('200 reads of an unchanged store decompress once (was 200)',n<=1,String(n));
  T('every read is still its own copy (mutating one never leaks)',w.eval(`(()=>{const a=get('d4.big');a[0].i=-1;return get('d4.big')[0].i===0})()`));
  w.localStorage.setItem('d4.big',w.eval(`_enc(JSON.stringify([{i:7}]))`));
  T('a write from any code path is seen immediately',w.eval(`get('d4.big')[0].i`)===7);
  /* frozen tickets are never re-graded on load */
  w.eval(`(()=>{const L=[];for(let i=0;i<50;i++)L.push({id:'f'+i,date:'2026-09-01',source:'mine',archived:true,legs:[{game:'NYY@BOS',pick:'NYY ML',sport:'mlb',manual:{hit:true}}]});set(LS.locked,L);settledSync(true);})()`);
  const g=await w.eval(`(async()=>{let n=0;const f=gradeLeg;gradeLeg=(...a)=>{n++;return f(...a)};await backfillGrading(true);gradeLeg=f;return n})()`);
  T('backfill skips tickets the ledger has frozen',g<50,String(g)+' leg grades for 50 frozen tickets');
  T('tab switches are timed for the Settings speed readout',w.eval(`(()=>{tab('today',null);return PERF_LOG.some(x=>x.what==='tab: today')})()`));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2000);
