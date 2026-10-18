/* v2.46.2 · between midnight and 5 AM the Today tab says last night's slate is still up and why, and you can start the new day yourself */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const NOW=Date.parse('2026-10-18T07:51:00Z');   /* 2:51 AM CDT, Sunday */
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_FLIP_RELOAD__=true;x.__NO_REOPEN__=true;x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  T('2:51 AM Sunday, nothing turned yet: the desk is still on Saturday',w.eval('today()')==='2026-10-17',w.eval('today()'));
  w.eval(`SLATE_FLIP_R={ts:Date.now(),why:'1 still going',open:['ncaaf HAW vs SJSU']}`);
  const h=w.eval('deskProcessHtml()');
  T('the Today tab says why, and offers "Start Sunday now"',/Saturday's slate is still up/.test(h)&&/still going: ncaaf HAW vs SJSU/.test(h)&&/Start Sunday now/.test(h),h.slice(0,300));
  T('tap it: the desk is on Sunday',w.eval('slateFlipNow()')===true&&w.eval('today()')==='2026-10-18',w.eval('today()'));
  T('…and the banner is gone (nothing left to turn)',!/still up/.test(w.eval('deskProcessHtml()')));
}catch(e){T('crashed',false,String(e&&e.stack||e).slice(0,300));}
  console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);},2500);
