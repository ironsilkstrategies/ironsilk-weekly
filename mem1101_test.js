/* v2.83.2 · the memory tidy: the date-keyed caches that only ever grew (25.8 MB on the phone, all loaded into memory on every
   page) are trimmed once a day, and a sync can't bring the trimmed days back. Records, calls and archives are never touched. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW='2026-11-01T18:00:00Z';
let html=fs.readFileSync(path.join(W,'nba.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nba.html',pretendToBeVisual:true,beforeParse(x){
  const RD=x.Date;const t0=RD.now();class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse(NOW)+(RD.now()-t0)]))}static now(){return RD.parse(NOW)+(RD.now()-t0)}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_BACKFILL__=true;x.__NO_REOPEN__=true;x.__NO_SYNC_LOOP__=true;
  x.fetch=()=>Promise.resolve({ok:false,status:404,headers:{get:()=>null},json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  w.eval(`set('d4.nflprops',{'2026-09-07':{a:1},'2026-10-31':{b:1}});set('d4.nflshots',{'2026-10-10':[1],'2026-10-25':[2],'2026-11-01':[3]});set('d4.clv',{'2026-09-20':{x:1},'2026-10-20':{y:1}});
    set('d4.syslog',{'2026-09-01':[1],'2026-10-30':[2]});set('d4.fbbox',{'nfl:1':{ts:Date.now()-20*864e5,box:1},'nfl:2':{ts:Date.now()-2*864e5,box:2}});
    set('d4.arc',{'2026-08-01':{keep:1}});set(VOICES_KEY,[{id:'v1',voice:'Judge',date:'2026-09-01',sp:'nba',game:'A@B',market:'ml',side:'home',price:-110}]);`);
  const n=w.eval('memTidy()');
  T('props from Sept 7 are gone, the last 3 days stay',JSON.stringify(Object.keys(w.eval("get('d4.nflprops')")))==='["2026-10-31"]');
  T('line snapshots keep 10 days',JSON.stringify(Object.keys(w.eval("get('d4.nflshots')")).sort())==='["2026-10-25","2026-11-01"]');
  T('closing-line records keep 30 days, the system log 10',JSON.stringify(Object.keys(w.eval("get('d4.clv')")))==='["2026-10-20"]'&&JSON.stringify(Object.keys(w.eval("get('d4.syslog')")))==='["2026-10-30"]');
  T('box scores older than 10 days go (graded long ago, refetchable)',JSON.stringify(Object.keys(w.eval("get('d4.fbbox')")))==='["nfl:2"]');
  T('archives and the call ledger are never touched',!!w.eval("get('d4.arc')")['2026-08-01']&&w.eval('get(VOICES_KEY).length')===1&&n>=5,String(n));
  const M=w.eval(`syncMergeVal('d4.nflshots',{t:2,v:{'2026-11-01':[3]}},{t:1,v:{'2026-09-01':[9],'2026-10-28':[8]}},{})`);
  T('a sync can\'t bring a trimmed day back (the merge applies the same rule)',!M['2026-09-01']&&!!M['2026-10-28']&&!!M['2026-11-01'],JSON.stringify(Object.keys(M)));
  const A=w.eval(`syncMergeVal('d4.arc',{t:2,v:{'2026-11-01':{a:1}}},{t:1,v:{'2026-08-01':{b:1}}},{})`);
  T('…while maps outside the tidy still merge in full',!!A['2026-08-01']&&!!A['2026-11-01']);
  w.eval(`set('d4.nflprops',{'2026-09-07':{a:1}});set('d4.tidyDay',today());localStorage.removeItem('d4.memtidy');storageTidy();`);
  T('it runs today even when the old tidy already ran (its own daily mark)',!w.eval("get('d4.nflprops')")['2026-09-07']&&w.eval("get('d4.memtidy')")===w.eval('today()'));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
