const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(w){
  w.__NO_GRADELOOP__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const css=w.eval('SKIN_CSS');
  T('game-card button rows wrap (an 11-button row widened the page to ~600px on phones)',/\.exprow\{flex-wrap:wrap/.test(css)&&/\.exprow>button\{flex:1 1 calc\(25% - 5px\);min-width:0/.test(css));
  T('backstop: page can never be pushed wider than the screen',/html,body\{max-width:100%;overflow-x:clip\}/.test(css)&&/main\{overflow-x:clip/.test(css));
  w.eval('skinSetup()');T('skin css live on the CFB page',!!w.document.getElementById('skinCss'));
  const src=fs.readFileSync(path.join(W,'shared.js'),'utf8');
  T('no summary carries its own ▼ (the skin draws the arrow)',!/<summary[^>]*>\s*▼/.test(src));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
