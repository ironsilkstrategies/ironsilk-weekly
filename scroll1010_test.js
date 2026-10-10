const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const scrolls=[];
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  let Y=0;w.scrollTo=(x,y)=>{scrolls.push(y);Y=y;};Object.defineProperty(w,'scrollY',{get:()=>Y,configurable:true});
  w.eval(`TICKETTAB='mine';MINE_VIEW='pending';renderTickets();`);
  T('opening My Picks starts at the top',scrolls[scrolls.length-1]===0);
  Y=1400;scrolls.length=0;
  w.eval('renderTickets()');   // a background refresh of the same screen
  T('a background refresh keeps your place (no jump to top)',!scrolls.includes(0),JSON.stringify(scrolls));
  w.dispatchEvent(new w.Event('scroll'));scrolls.length=0;let ran=0;w.eval('window.__rt=renderTicketsRaw;renderTicketsRaw=function(){window.__ran=(window.__ran||0)+1;return __rt.apply(this,arguments)}');
  w.eval('renderTickets()');
  T('a refresh that lands mid-scroll waits until you stop',!w.eval('window.__ran'));
  w.eval(`TICKETTAB='build';renderTickets();`);
  T('switching sub-tabs still goes to the top',scrolls[scrolls.length-1]===0);
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2000);
