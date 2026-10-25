/* v2.64 · likely outcomes are logged when shown and graded from the real box line */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);const NOW=Date.parse('2026-10-25T15:00:00Z');
let html=fs.readFileSync(path.join(W,'nba.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nba.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_BACKFILL__=true;x.__NO_SYNC_LOOP__=true;x.__NO_FLIP_RELOAD__=true;
  x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const d='2026-10-24';w.eval(`likelyLog([{sp:'nba',player:"De'Aaron Fox",team:'SA',k:'ast',thr:4,p:0.84},{sp:'nba',player:'Stephen Curry',team:'GS',k:'pts',thr:15,p:0.81}],'${d}');
    set('d4.pstlast.nba',{[pstId("De'Aaron Fox")]:{d:'${d}',v:{ast:7}},[pstId('Stephen Curry')]:{d:'${d}',v:{pts:12}}});`);
  const n=w.eval('likelyGrade()');const L=w.eval(`get(LIKELY_KEY,{})['${d}']`);
  T('yesterday\'s likely outcomes graded from the box line',n===2&&L[0].hit===true&&L[0].actual===7&&L[1].hit===false,JSON.stringify(L));
  const R=w.eval('likelyRecord(30)');T('the record: 1-1, by sport',R.w===1&&R.l===1&&R.by.nba.w===1);
  w.eval(`likelyLog([{sp:'nba',player:"De'Aaron Fox",team:'SA',k:'ast',thr:4,p:0.84}],'${d}')`);T('logged once per player and stat a day',w.eval(`get(LIKELY_KEY,{})['${d}'].length`)===2);
}catch(e){T('no crash',false,e.stack.slice(0,400));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3500);
