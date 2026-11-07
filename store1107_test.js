/* v2.86.7 · NEVER WRITE A PARTIAL COPY OVER THE FULL ONE. Nov 6–7: IndexedDB stopped answering in time on the phone, pages ran on the
   small shelf alone, saved nearly empty copies of the call ledger, prop calls, tickets and archives — and the next page that loaded the
   big store took those small copies as newer and wrote them over the full history (16,000 character calls → 246). The real-browser
   replay with the phone's data lives in scratchpad/storetest.js (private data — never committed); this pins the rules. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const st=fs.readFileSync(path.join(W,'store.js'),'utf8'),sh=fs.readFileSync(path.join(W,'shared.js'),'utf8');
/* the merge itself, lifted out of store.js */
const src=st.slice(st.indexOf('function idOf('),st.indexOf("    return null;}",st.indexOf('function merge('))+"    return null;}".length);
const merge=new Function(src+';return merge;')();
const J=x=>JSON.stringify(x);
T('lists merge by id: the full list keeps everything, the newer copy wins where both have an entry, new entries are added',
  merge(J([{id:1,a:1},{id:2,v:'old'},{id:3}]),J([{id:2,v:'new'},{id:4}]))===J([{id:1,a:1},{id:2,v:'new'},{id:3},{id:4}]));
T('a thin copy never shrinks the full list (16,000 calls + a 246-call copy keeps all 16,000)',
  JSON.parse(merge(J(Array.from({length:16000},(_,i)=>({id:'c'+i}))),J(Array.from({length:246},(_,i)=>({id:'c'+(15900+i)}))))).length===16146);
T('maps merge by key (archives by date, score calls by game): every day kept, the newer copy wins a day both have',
  merge(J({'2026-11-04':[1],'2026-11-05':[2]}),J({'2026-11-05':[9],'2026-11-06':[3]}))===J({'2026-11-04':[1],'2026-11-05':[9],'2026-11-06':[3]}));
T('two different shapes are not merged (the caller keeps the bigger copy)',merge(J([1,2]),J({a:1}))===null&&merge('not json',J([1]))===null);
/* the rules around it */
T('a good load merges a small-shelf copy into the big-store copy instead of letting it win, and keeps the old full copy aside (__prev:)',
  /if\(iv!==lv&&\(dg\[k\]\|\|lv\.length>=BIG\|\|iv\.length>lv\.length\*2\)\)\{var mv=merge\(iv,lv\);/.test(st)&&/stash\.push\(\[PREV\+k,iv\]\)/.test(st));
T('the kept-aside copies stay in IndexedDB only (never loaded, never synced)',/if\(k\.indexOf\(PREV\)===0\)return;MEM\.set\(k,v\);INIDB\.add\(k\);/.test(st));
T('a page without the big store lists every key it writes, for the next good load',/function degrade\(why,ms\)\{note\(why,ms\);DEGRADED=true;/.test(st)&&/setItem:function\(k,v\)\{RLS\.setItem\(k,v\);rec\(k\);\}/.test(st));
T('…and says why the store was off ("IndexedDB didn\'t answer in 12 s" / the error)',/degrade\('IndexedDB didn\\'t answer in '\+Math\.round\(lim\/1000\)\+' s',lim\)/.test(st)&&/degrade\('IndexedDB error: '/.test(st));
T('the store waits 12 s on a normal page (was 6 s), 30 s on a relay page',/var lim=\/\[\?&\]bg=1\/\.test\(location\.search\|\|''\)\?30000:12000;/.test(st));
T('on a page without the big store: no backup (it would save the partial copy over the full one), no tidying, a banner',
  /if\(storeDegraded\(\)\)\{const m='your saved history didn\\'t load on this page/.test(sh)&&/function storageTidy\(force\)\{if\(storeDegraded\(\)\)return 0;/.test(sh)&&/b\.id='storeWarn'/.test(sh));
T('the store\'s own notes never sync',/__storewhy\$\|__dgkeys\$\)\/\.test\(k\)/.test(sh));
console.log(pass+' pass / '+fail+' fail');
