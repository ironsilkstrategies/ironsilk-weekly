/* v2.86.4 · TAPS THAT LAND · (1) the 📣 button never sits over a bar, a sheet or Chat's Send; (2) a pill tap, Clear and a
   leg's ✕ repaint only the pills' pressed state — they no longer rebuild the whole board (≈0.9 s a tap on a full NHL slate). */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
/* 1 · the 📣 button's layer, statically: below the slip bar (79), the nav (80), the More menu (85) and every sheet (95) */
const core=fs.readFileSync(path.join(W,'desk-core.js'),'utf8'),shared=fs.readFileSync(path.join(W,'shared.js'),'utf8');
const fabCss=(core.match(/st\.id='fbpFabCss';\s*st\.textContent='([^]*?)';document\.head/)||[])[1]||'';
const fz=+((fabCss.match(/#fbpFab\{[^}]*z-index:(\d+)/)||[])[1]||NaN);
const zOf=(src,re)=>+((src.match(re)||[])[1]||NaN);
const zSlip=zOf(shared,/body\.bnav \.slip\{[^}]*z-index:(\d+)/),zNav=zOf(shared,/body\.bnav nav\{[^}]*z-index:(\d+)/),zMore=zOf(shared,/ov\.id='bnMore';ov\.style\.cssText='[^']*z-index:(\d+)/),zSheet=zOf(core,/\.desk-modal\{[^}]*z-index:(\d+)/);
T('📣 sits under the slip bar, the nav, the More menu and every sheet',fz<zSlip&&fz<zNav&&fz<zMore&&fz<zSheet,JSON.stringify({fz,zSlip,zNav,zMore,zSheet}));
T('📣 has no inline z-index of its own any more (it used to be 9000)',!/b\.style\.cssText='position:fixed;right:14px;bottom:96px;z-index:9000/.test(core));
T('📣 lifts clear of the slip bar while it shows',/body\.slipon #fbpFab\{bottom:calc\(var\(--bnh,60px\) \+ \d+px\)\}/.test(fabCss));
T('📣 hides in Chat, where Send lives in its corner',/body:has\(#v-chat\.on\) #fbpFab\{display:none\}/.test(fabCss));
/* 2 · the pills repaint in place, on a real page */
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const d=w.document;const box=d.createElement('div');box.id='pillTest';
  /* one pill of every kind the boards draw: NHL/NBA game line, NFL, NCAAF, MLB game line, MLB prop, NHL prop rung */
  box.innerHTML=`<div class="bet" id="p1" onclick="sportSlipToggle('nhl','G1','MTL +1.5',-238)"></div>
    <div class="bet" id="p2" onclick="sportSlipToggle('nhl','G1','UTAH ML',-122)"></div>
    <div class="bet" id="p3" onclick="nflSlipToggle('N1','KC -3.5',-110)"></div>
    <div class="bet" id="p4" onclick="ncaafSlipToggle('C1','Hawai\\'i +7',-105)"></div>
    <div class="bet" id="p5" onclick="tog('M1-ml-h','NYY@BOS','BOS ML',0.55,123)"></div>
    <div class="prop" id="p6" onclick="tog('M1-hr-judge','NYY@BOS','Aaron Judge HR',0.31,123,'hr','Aaron Judge','HR')"></div>
    <span role="button" class="nhl-rung" id="p7" onclick="sportSlipToggle('nhl','G1','Cole Caufield 3+ shots',-150,{nhlProp:{player:'Cole Caufield',stat:'shots',thr:3,dir:'atleast'},isProp:1})">Caufield 3+ shots <b>61%</b></span>`;
  d.body.appendChild(box);
  w.eval(`SLIP=[{id:'G1|MTL +1.5'},{id:'N1|KC -3.5'},{id:'C1|Hawai\\'i +7'},{id:'M1-hr-judge'},{id:'G1|Cole Caufield 3+ shots'},{id:'X|spread -2.5',sq:'G1|UTAH ML'}]`);
  const n=w.eval('slipRepaint()');const on=id=>d.getElementById(id).classList.contains('on');
  T('every kind of pill is found',n>=7,'repainted '+n);
  T('NHL game line in the slip → pressed; one not in it → pressed only through its spread twin (sq)',on('p1')&&on('p2'),[on('p1'),on('p2')].join());
  T('NFL and NCAAF pills (an apostrophe in the label) → pressed',on('p3')&&on('p4'));
  T('MLB game line not in the slip → not pressed; MLB prop in it → pressed',!on('p5')&&on('p6'));
  const r=d.getElementById('p7');T('NHL prop rung in the slip → gold with a ✓',/^✓ /.test(r.firstChild.nodeValue)&&/gold/.test(r.getAttribute('style')||''),r.outerHTML.slice(0,160));
  w.eval(`SLIP=[]`);w.eval('slipRepaint()');
  T('an empty slip un-presses all of them, and the rung loses its ✓ (once, not twice)',!['p1','p2','p3','p4','p6'].some(on)&&!/✓/.test(r.textContent)&&r.textContent.startsWith('Caufield'),r.textContent);
  /* a real tap: the board is not rebuilt, the pill presses at once, and the slip gets the leg */
  w.eval(`window.__RAB=0;const _rab=renderActiveBoard;renderActiveBoard=function(){window.__RAB++;return _rab.apply(this,arguments);};
    const _sg=sportGames;sportGames=function(sp){return sp==='nhl'?[{id:'G1',date:'2026-11-06',away:{abbr:'MTL'},home:{abbr:'UTAH'}}]:_sg.apply(this,arguments);};`);
  const e0=errs.length;
  d.getElementById('p1').click();
  T('tapping a pill puts the leg in the slip and presses it at once',w.eval(`SLIP.some(x=>x.id==='G1|MTL +1.5'||x.sq==='G1|MTL +1.5')`)&&on('p1'),w.eval('JSON.stringify(SLIP)'));
  T('…without rebuilding the board',w.eval('window.__RAB')===0,'renderActiveBoard ran '+w.eval('window.__RAB')+'×');
  d.getElementById('p1').click();
  T('tapping it again takes the leg out and un-presses it',!w.eval(`SLIP.some(x=>x.id==='G1|MTL +1.5'||x.sq==='G1|MTL +1.5')`)&&!on('p1'));
  d.getElementById('p5').click();T('an MLB pill (tog) presses at once, no rebuild',on('p5')&&w.eval('window.__RAB')===0);
  w.eval('clearSlip()');T('Clear empties the slip and un-presses everything, no rebuild',w.eval('SLIP.length')===0&&!on('p5')&&w.eval('window.__RAB')===0);
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
  /* 3 · Refresh everything answers the tap at once */
  const rb=[...d.querySelectorAll('[onclick]')].find(b=>/refreshEverything\(/.test(b.getAttribute('onclick')||''));
  T('the page has a Refresh everything button',!!rb);
  if(rb){const label=rb.innerHTML;w.eval(`window.__RRUNS=0;refreshEverythingRaw=function(){window.__RRUNS++;return new Promise(r=>{window.__RDONE=r;});};`);
    rb.click();
    T('…which reads "Refreshing…" and is disabled the moment it is tapped',/Refreshing…/.test(rb.textContent)&&rb.disabled===true,rb.outerHTML.slice(0,140));
    (async()=>{await new Promise(r=>setTimeout(r,120));
      w.eval('refreshEverything()');await new Promise(r=>setTimeout(r,120));
      T('a second tap while it runs starts nothing new',w.eval('window.__RRUNS')===1,'runs '+w.eval('window.__RRUNS'));
      w.eval('window.__RDONE()');await new Promise(r=>setTimeout(r,60));
      T('…and the button comes back as it was when the refresh ends',rb.innerHTML===label&&rb.disabled===false,rb.outerHTML.slice(0,140));
      console.log(pass+' pass / '+fail+' fail');process.exit(0);})();
    return;}
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
