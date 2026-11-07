/* v2.86.5 · THE MASTER-EVALUATION RELAY CAN'T JUST STOP. Nov 6: twice in one afternoon the relay died mid-walk on the phone
   ("fails at the second sport and just stops"). The relay now reads its clock from its last step, records every step in a
   log that syncs, shows a stopped run on Today with Resume / Finish, names what it missed with a one-tap retry, and a reopen
   never starts a second relay on top of a running one. (The hop itself — location.replace, the 4 s flush cap, the crash-reload
   check, the watchdog — is driven in a real browser with the phone's data by scratchpad/relay.js.) */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const core=fs.readFileSync(path.join(W,'desk-core.js'),'utf8');
T('a hop replaces the page (Safari can\'t keep the page it left alive) and never waits over 4 s on the storage flush',/location\.replace\(url\)/.test(core)&&/relayLog\('flush-slow'\);go\(\);\}\},4000\)/.test(core));
T('a page iOS reloads after dying (same address) is caught, and the relay has a 3-minute watchdog per page',/again=!!v&&C\.seen\.includes\(v\)/.test(core)&&/'page died and reloaded'/.test(core)&&/\},180e3\);/.test(core));
T('Skip goes now (it used to set a flag for a timer)',/b\.onclick=\(\)=>\{window\.__CHAIN_SKIP=1;[^\n]*?evalChainStep\(false,'skipped'\);\}/.test(core));
const shared=fs.readFileSync(path.join(W,'shared.js'),'utf8');
T('sync stands down while a master evaluation or a relay hop is running',/const sy3Quiet=\(\)=>/.test(shared)&&/if\(!syncOn\(\)\|\|sy3Quiet\(\)\)return;if\(document\.hidden\)/.test(shared)&&/syncOn\(\)&&!sy3Quiet\(\)\)syncNow\(false\);\},600e3\)/.test(shared));
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;w.__NO_REOPEN__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  const E=s=>w.eval(s);const e0=errs.length;
  /* the line of sports */
  E(`window.__C={ts:Date.now(),at:Date.now(),d:today(),order:['nhl','nfl','ncaaf','nba','ncaab'],todo:['nba','ncaab'],done:['nhl','nfl'],miss:['ncaaf'],back:'nhl.html'}`);
  const line=E(`evalChainLine(window.__C,'nba')`);
  T('the progress line marks each sport: ✓ done · ✗ missed · ⏳ now · ○ to go, in relay order',/^✓ .*NHL  ✓ .*NFL  ✗ .*CFB  ⏳ .*NBA  ○ .*CBB$/.test(line),line);
  /* the relay's clock */
  E(`set(EVAL_CHAIN_KEY,{...window.__C,ts:Date.now()-20*60e3,at:Date.now()-60e3})`);
  T('a relay that started 20 minutes ago but moved a minute ago is still alive (the clock runs from the last step)',!!E('evalChainNext()'));
  E(`set(EVAL_CHAIN_KEY,{...window.__C,ts:Date.now()-20*60e3,at:undefined})`);
  T('…and one with no step for 20 minutes is over',!E('evalChainNext()'));
  /* a stopped relay on Today */
  E(`set(EVAL_CHAIN_KEY,{...window.__C,at:Date.now()})`);
  T('a page that finds an unfinished relay it didn\'t start knows the relay stopped',!!E('evalChainStalled()'));
  const sh=E('evalChainStalledHtml()');
  T('Today says where it stopped, with Resume and Finish with what\'s done',/stopped at .*NBA — 2 of 5 sports done/.test(sh)&&/onclick="evalChainResume\(\)"/.test(sh)&&/onclick="evalChainFinishNow\(\)"/.test(sh),sh.replace(/<[^>]+>/g,' ').slice(0,200));
  const card=E('deskProcessHtml()');T('the process card shows it: "⏸ stopped mid-run — Resume below"',/⏸ stopped mid-run — Resume below/.test(card)&&/Resume from/.test(card));
  E('window.__CHAIN_MINE=1');T('…but never on the page that is handing the relay off',!E('evalChainStalled()'));E('window.__CHAIN_MINE=0');
  /* a reopen never starts a second relay on top */
  E(`set(REOPEN_KEY,{d:today(),ts:Date.now(),why:'test'});localStorage.setItem(REOPEN_DONE,'0');DESK_REOPEN_RUN=false;`);
  T('a reopen does not start a second relay while one is walking',E('deskReopenRun()')===false&&E(`(get(REOPEN_KEY,null)||{}).why`)==='test'&&E(`localStorage.getItem(REOPEN_DONE)`)==='0');
  /* Finish with what's done → the review step names what's missing, with a one-tap retry */
  E(`window.__NO_EARLY_HOLD__=true;set('d4.reviewFreeze',true);document.body.insertAdjacentHTML('beforeend','<div class="deskStatus" id="dsT"></div>');`);
  await w.eval('evalChainFinishNow()');
  const R=E(`get('d4.evalready',null)`)||{};const st=w.document.getElementById('dsT').innerHTML;
  T('Finish with what\'s done: the day waits for review with NHL and NFL done; CFB, NBA and CBB marked not evaluated',R.d===E('today()')&&R.done.join()==='nhl,nfl'&&['ncaaf','nba','ncaab'].every(s=>R.miss.includes(s))&&!E('evalChainNext()'),JSON.stringify(R));
  const bEl=w.document.querySelector('#dsT button');const btn=bEl?bEl.getAttribute('onclick'):'';let compiles=false;try{new w.Function(btn);compiles=true;}catch(e){}
  T('…and says so, with a button that retries just those sports',/not evaluated: .*CFB.*NBA.*CBB/.test(st.replace(/<[^>]+>/g,''))&&btn==='masterEvalOnly(["ncaaf","nba","ncaab"])'&&compiles&&/Try them again/.test(bEl.textContent),btn);
  const card2=E('deskProcessHtml()');T('the card keeps the retry until the freeze',/✗ Not evaluated: .*CFB/.test(card2.replace(/<[^>]+>/g,''))&&/onclick="masterEvalOnly\(\[&quot;ncaaf&quot;/.test(card2));
  /* the retry: it counts the sports it re-ran with the ones already done */
  T('a retry\'s finish merges with what was already evaluated',JSON.stringify(E(`evalChainMerge({only:1,done:['nba'],miss:['ncaab']})`))===JSON.stringify([['nhl','nfl','nba'],['ncaaf','ncaab']]),JSON.stringify(E(`evalChainMerge({only:1,done:['nba'],miss:['ncaab']})`)));
  /* the flight recorder */
  E(`localStorage.removeItem(RELAY_LOG);for(let i=0;i<130;i++)relayLog('hop',{to:'nfl',i});`);const L=E('get(RELAY_LOG,[])');
  T('the flight recorder keeps the last 120 steps, each with the time, the page and what happened',L.length===120&&L[119].i===129&&L[0].ev==='hop'&&L[0].pg==='nhl'&&L[0].t>0,JSON.stringify(L[0]));
  T('…and it syncs (the stall log stays on the phone)',!E(`syncSkip(RELAY_LOG)`)&&E(`syncSkip('d4.perfstalls')`));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
