/* v2.87.5 · Nov 7, 11:54 AM: "I want every available game to be worked… as long as it's not freezing, restarting or in a slow mode for
   more than 15 seconds". Working all 124 lined college games on the phone's full history froze the CBB page for 8 s at a time: every
   table built from the call ledger re-counted all 16,000 graded calls on every lookup. The real-browser measurements are
   scratchpad/perfcbb.js + profcbb.js (private data, never committed): longest freeze 8.0 s → 2.1 s (3× CPU throttle), total 24 s → 11 s. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const sh=fs.readFileSync(path.join(W,'shared.js'),'utf8'),bb=fs.readFileSync(path.join(W,'bball-engine.js'),'utf8');
T('no ledger table re-counts the graded calls on every lookup',!/V\.length\+'\|'\+V\.filter\(x=>x\.graded\)\.length/.test(sh));
T('…they share one signature, counted once per ledger read',(sh.match(/const sig=ledgerSig\(V\)/g)||[]).length>=7&&/function ledgerSig\(V\)\{if\(!V\|\|!V\.length\)return'0\|0';const c=LEDGER_SIG&&LEDGER_SIG\.get\(V\);if\(c&&c\.n===V\.length\)return c\.s;/.test(sh));
/* the signature itself */
const src=sh.slice(sh.indexOf('const LEDGER_SIG='),sh.indexOf('const VOICES_CAP='));const ledgerSig=new Function(src.replace(/^[^]*?(const LEDGER_SIG=)/,'$1')+';return ledgerSig;')();
const V=[{graded:1},{},{graded:1}];T('…the same answer as counting: 3 calls, 2 graded',ledgerSig(V)==='3|2');
V.push({graded:1});T('…and a call added in place still changes it',ledgerSig(V)==='4|3');
T('the brain judge reads the brain without a fresh parse per game; learning still reads its own copy',/b=brainGetRO\(sport\),k=AD\.key\(g\)/.test(sh)&&/function brainLearnAll|const b=brainGet\('nhl'\);let ch=false;/.test(sh));
T('rosters: read without a full parse per team, written from a fresh copy, every team on a full college slate kept',/const C0=roGet\('d4\.rsroster',\{\}\)/.test(sh)&&/const RS_KEEP=400;/.test(sh));
T('every lined college game is worked; the ledger holds 22,000 calls, college basketball held to 6,000 of them',/const BB_EXTRA=400;/.test(bb)&&/const VOICES_CAP=22000,VOICES_SP_CAP=\{ncaab:6000\};/.test(sh));
T('prop calls cover every scheduled game on every page, not just the ones with a colored pick',/\(B\.games\|\|\[\]\)\.forEach\(x=>\{if\(!x\|\|!x\.g\|\|!x\.s\|\|tdDay\(x\.s\)!==d\|\|Date\.parse\(x\.s\)<=now\)return;/.test(sh));
console.log(pass+' pass / '+fail+' fail');
