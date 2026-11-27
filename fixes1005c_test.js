const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function boot(page,fetchFn,url){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const urls=[];const w=new JSDOM(html,{runScripts:'dangerously',url:url||'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    w.fetch=u=>{urls.push(String(u));return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;w.__urls=urls;return w;}
const nfl=boot('nfl.html'),cfb=boot('cfb.html');
setTimeout(()=>{try{
  // ruin: 10 push-only tickets + 1 win, 1 loss → pushes count 0, not wins
  nfl.eval("set(BR_AMT,'100')");
  nfl.eval(`(()=>{const L=[],F=get(LS.allfinals,{});for(let i=0;i<12;i++){const d='2026-09-0'+(i%9+1);
    L.push({id:'p'+i,date:d,source:'mine',archived:true,imported:true,stake:'2',toWin:'1.82',legs:[{game:'Q'+i+'@Z',pick:i<10?'Z +1':'Z ML',sport:'nhl',price:-110}]});
    F[finalsKey('nhl','Q'+i+'@Z')]={sport:'nhl',a:i<10?2:(i===10?1:3),h:i<10?1:(i===10?3:1),d,ts:Date.now()};}set(LS.allfinals,F);set(LS.locked,L);})()`);
  const X=nfl.eval('(ROR_C=null,riskOfRuin())');
  T('risk of ruin: push-only tickets return the stake (0%), not a full win',X.wl&&X.wl.p===10&&X.wl.w===1&&X.wl.l===1&&Math.abs(X.roi-((1.82/2)-1)/12)<1e-6,JSON.stringify(X.wl)+' roi '+(X.roi*100).toFixed(1)+'%');
  T('risk card shows the W-L-P behind the ROI',/1-1-10\)/.test(nfl.eval('riskHtml()')));
  // CFB season year
  const y=cfb.eval('cfbSeasonYear()');T('CFB season year follows the calendar (no hard-coded 2025)',y===new Date().getMonth()<2?new Date().getFullYear()-1:new Date().getFullYear(),String(y));
  T('CFB standings URL never asks for season=2025 in 2026',!fs.readFileSync(path.join(W,'football-engine.js'),'utf8').includes('standings?season=2025'));
  // nav carries the build tag
  T('sport-to-sport links carry ?b=build',nfl.eval("pageUrl('nba')")===`nba.html?b=${nfl.eval('PAGE_BUILD')}`);
  // front door
  const fd=fs.readFileSync(path.join(W,'TheDesk.html'),'utf8');
  T('TheDesk.html routes NBA and links it',/nba:'nba\.html'/.test(fd)&&/href="nba\.html"/.test(fd));
  const B=(fd.match(/BUILD='(\w+)'/)||[])[1],PB=nfl.eval('PAGE_BUILD');
  const stamps=['mlb','nfl','cfb','nhl','nba'].map(f=>(fs.readFileSync(path.join(W,f+'.html'),'utf8').match(/v=(\d{8}\w)/)||[])[1]);
  T('front door, page build tag and every page stamp all match',B===PB&&stamps.every(x=>x===B),`${B} · ${PB} · ${stamps.join(',')}`);
}catch(e){T('harness',false,e.stack.split('\n').slice(0,3).join(' | '));}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);},3000);
