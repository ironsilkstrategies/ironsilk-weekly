const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const vc=new (require('jsdom').VirtualConsole)();vc.on('error',()=>{});
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  w.eval(`NCAAF_GAMES.length=0;NCAAF_GAMES.push({id:'x1',away:{abbr:'DEL',name:'Delaware Blue Hens',location:'Delaware'},home:{abbr:'MTSU',name:'Middle Tennessee Blue Raiders',location:'Middle Tennessee'}},
    {id:'x2',away:{abbr:'FIU',name:'Florida International Panthers',location:'Florida International'},home:{abbr:'JXST',name:'Jacksonville State Gamecocks',location:'Jacksonville State'}})`);
  T('book name "Middle Tennessee State" resolves to MTSU',w.eval(`ncaafAbbrFor('Middle Tennessee State')`)==='MTSU');
  T('"Middle Tennessee St" too',w.eval(`ncaafAbbrFor('Middle Tennessee St')`)==='MTSU');
  T('ESPN name still resolves',w.eval(`ncaafAbbrFor('Middle Tennessee')`)==='MTSU');
  T('Florida International → FIU, Jacksonville State → JXST',w.eval(`ncaafAbbrFor('Florida International')`)==='FIU'&&w.eval(`ncaafAbbrFor('Jacksonville State')`)==='JXST');
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
