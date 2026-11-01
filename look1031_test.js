/* v2.81.6 · the game-night look: theme.css on every sport page (self-hosted Barlow), switched before first paint,
   and a Settings switch back to the classic look */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const PAGES=['cfb.html','mlb.html','nba.html','ncaab.html','nfl.html','nhl.html'];
(async()=>{try{
  const css=fs.readFileSync(path.join(W,'theme.css'),'utf8');
  const urls=[...css.matchAll(/url\((fonts\/[^)]+)\)/g)].map(m=>m[1]);
  T('every font the theme names is in the repo',urls.length>=20&&urls.every(u=>fs.existsSync(path.join(W,u))),urls.filter(u=>!fs.existsSync(path.join(W,u))).join(','));
  T('the font license ships with the fonts',fs.existsSync(path.join(W,'fonts/OFL.txt')));
  T('the old family names are mapped (inline styles change too)',['Inter','Archivo','IBM Plex Mono','IBM Plex Sans'].every(f=>css.includes(`font-family:"${f}"`)));
  T('every rule beyond the fonts is scoped to the new look (html.th)',css.replace(/\/\*[\s\S]*?\*\//g,'').split('}').filter(r=>r.includes('{')&&!/@font-face|@media|^\s*$/.test(r)).every(r=>/html\.th/.test(r.split('{')[0])||/^\s*html\.th/.test(r)));
  const stamp=fs.readFileSync(path.join(W,'nba.html'),'utf8').match(/min\/shared\.js\?v=(\w+)/)[1];
  PAGES.forEach(f=>{const h=fs.readFileSync(path.join(W,f),'utf8');
    T(`${f}: links the theme with the build stamp and switches it before first paint`,h.includes(`<link rel="stylesheet" id="d4theme" href="theme.css?v=${stamp}">`)&&/getElementById\('d4theme'\)[^<]*disabled=true/.test(h)&&h.indexOf('id="d4theme"')<h.indexOf('<body'));});
  /* the switch */
  let html=fs.readFileSync(path.join(W,'nba.html'),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nba.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
  await new Promise(r=>setTimeout(r,2500));
  T('a fresh device gets the game-night look',w.document.documentElement.classList.contains('th')&&!w.document.documentElement.classList.contains('classic'));
  w.eval("tab('settings')");const lb=w.document.getElementById('lookBox');
  T('Settings → Look offers Game night and Classic, current one marked',lb&&/Game night/.test(lb.innerHTML)&&/Classic/.test(lb.innerHTML)&&/class="on"[^>]*>Game night/.test(lb.innerHTML),lb&&lb.textContent.slice(0,80));
  w.eval("lookReload=function(){window.__RL=1};lookSet(true)");
  T('choosing Classic is remembered on the device and reloads the page',w.localStorage.getItem('d4.classic')==='1'&&w.eval('window.__RL')===1);
  w.eval("lookSet(false)");T('…and Game night clears it',w.localStorage.getItem('d4.classic')===null);
  w.close();
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);})();
