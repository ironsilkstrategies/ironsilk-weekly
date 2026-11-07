/* v2.86.6 · Nov 7, 3:18 AM: (1) "I should be able to freeze whenever I need to" — weekends run all day, lock early;
   (2) "why isn't CBB being evaluated" — it was: the audit only knew relay pages, and the run started on the CBB page;
   plus the audit's reasons read like a bug ("model # vs market #"), and the phone's cloud backup had stopped with nothing on screen. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const core=fs.readFileSync(path.join(W,'desk-core.js'),'utf8'),shared=fs.readFileSync(path.join(W,'shared.js'),'utf8');
T('the sport evaluated on the page you start from writes its own result (only relay pages did)',/if\(hereLive\)try\{set\('d4\.bgeval\.'\+here,\{ts:Date\.now\(\),ok,err,d:today\(\),ms:Date\.now\(\)-te,home:1\}\);\}catch\(e\)\{\}/.test(core));
T('a freeze you tap locks the Best 3 at any hour',/const masterRan=evalRanToday\(\)&&\(\(typeof deskFrozen==='function'&&deskFrozen\(\)\)\|\|!\(typeof deskTooEarly==='function'&&deskTooEarly\(\)\)\);/.test(shared));
T('an early run is never frozen on its own — it waits for your OK like a review',/const early=!force&&deskTooEarly\(\);/.test(core)&&/if\(!force&&\(deskReviewOn\(\)\|\|early\)\)\{/.test(core)&&!/too early to freeze — most books post/.test(core));
T('every sync request has a 60 s limit',/function syncFetch\(url,o\)/.test(shared)&&(shared.match(/syncFetch\(/g)||[]).length>=4);
let html=fs.readFileSync(path.join(W,'ncaab.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/ncaab.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;
  /* the reasons, in plain words */
  const L=(why)=>E(`whyLabel(${JSON.stringify(why)})`);
  T('"priced -450 — the Best 3 lays -200 at most" → "priced past -200 — too expensive for the Best 3"',L('priced -450 — the Best 3 lays -200 at most')==='priced past -200 — too expensive for the Best 3');
  T('"flagged: model 82% vs market 64%" → "flagged — the model and the market are far apart"',L('flagged: model 82% vs market 64%')==='flagged — the model and the market are far apart');
  T('"most confident character: 64% — under the 70% rule" → "no character is 70%+ sure"',L('most confident character: 64% — under the 70% rule')==='no character is 70%+ sure');
  T('"model 74% vs the market\'s 60% — 14 pts apart; 8+ is treated…" → "model and market 8+ pts apart — treated as a likely model miss"',L("model 74% vs the market's 60% — 14 pts apart; 8+ is treated as a likely model miss unless that lane is ✓ proven")==='model and market 8+ pts apart — treated as a likely model miss');
  T('"97% sure, but -20000 needs 99% — never official…" → "the price asks for more certainty than the model has"',L('97% sure, but -20000 needs 99% — never official at a price its own number says loses')==='the price asks for more certainty than the model has');
  T('"no book price" → "no book price yet"; "longer than +400" keeps its meaning',L('no book price')==='no book price yet'&&/^longer than \+400/.test(L('longer than +400')));
  T('nothing in the labels reads "#"',!['priced -450 — the Best 3 lays -200 at most','flagged: model 82% vs market 64%','most confident character: 64% — under the 70% rule','97% sure, but -20000 needs 99% — never official at a price its own number says loses'].some(x=>/#/.test(L(x))));
  /* the audit: a sport evaluated on the page you started from */
  E(`set(EVAL_LOCK_KEY,{date:today(),by:{ncaab:Date.now()}});localStorage.removeItem('d4.bgeval.ncaab');set(TC_KEY,{d:today(),by:{ncaab:{ts:Date.now(),picks:[]}}});`);
  const au=E('evalAuditHtml()').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  T('the audit reads "✓ evaluated" for a sport whose evaluation ran on the starting page (from the eval lock)',/CBB ✓ evaluated/.test(au),au.slice(0,200));
  T('…and its note no longer explains "#"',!/# = a number/.test(au));
  /* the cloud backup */
  E(`localStorage.setItem(SYNC.last,String(Date.now()-5*36e5));set(SYNC.repo,'me/private-sync');set(SYNC.token,'x');`);
  E(`syncFailNote('HTTP 422 (trees)')`);
  const sw=E('syncWarnHtml()');
  T('a backup that stopped saving shows on Today, with the reason and ↻ Sync now',/hasn't saved since/.test(sw)&&/HTTP 422 \(trees\)/.test(sw)&&/onclick="syncNow\(true\)/.test(sw)&&E('syncOn()')===true,sw.slice(0,200)+' syncOn='+E('syncOn()'));
  T('…the failure is remembered on this device only (never synced)',E(`syncSkip('d4.syncfail')`)===true&&!!E(`localStorage.getItem('d4.syncfail')`));
  E(`localStorage.setItem(SYNC.last,String(Date.now()))`);T('…and disappears once a save goes through',E('syncWarnHtml()')==='');
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
