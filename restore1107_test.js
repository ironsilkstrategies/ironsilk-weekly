/* v2.86.7 · RESTORE: the Nov 5 history backup (private repo, "restore" branch) merges UNDER what's on the phone — the phone wins every
   entry both have; the backup only adds what's missing; never on a page whose storage didn't load. Synthetic backup here; the replay
   with the real one is scratchpad/restoretest.js (private data, never committed). */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));let hits=[],BODY='';
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=(u)=>{hits.push(String(u));if(/\/contents\/history-2026-11-05\.lz\?ref=restore/.test(String(u)))return Promise.resolve({ok:true,status:200,text:()=>Promise.resolve(BODY)});return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});};
  w.scrollTo=()=>{};w.alert=m=>errs.push('ALERT '+m);w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{const E=s=>w.eval(s);
  E(`set(SYNC.repo,'me/private-sync');set(SYNC.token,'x');`);
  /* the phone after the loss: a thin ledger with one call it changed itself */
  E(`set(VOICES_KEY,[{id:'v-keep',sp:'nhl',date:'2026-11-08',voice:'Sim',market:'ml',side:'home',price:-999}]);set(CPROP_KEY,[]);set('d4.clv',{'2026-11-06':[1]});`);
  /* the backup: older days, plus its own (older) copy of the same call */
  const backup={v:1,from:'2026-11-05T17:01:37-06:00',keys:{'d4.voices':[{id:'v-old1',sp:'nba',date:'2026-11-04',voice:'Sim',market:'ml',side:'home',graded:true,hit:true,units:1},{id:'v-old2',sp:'nba',date:'2026-11-05',voice:'Judge',market:'spread',side:'away',graded:true,hit:false,units:-1},{id:'v-keep',sp:'nhl',date:'2026-11-08',voice:'Sim',market:'ml',side:'home',price:-150}],
    'd4.charprops':[{id:'p1',sp:'nba',voice:'Sim',player:'X',k:'pts',thr:20,p:0.6,d:'2026-11-04',hit:true}],'d4.clv':{'2026-11-04':[7],'2026-11-05':[8],'2026-11-06':[0]}}};
  BODY=E(`LZString.compressToBase64(${JSON.stringify(JSON.stringify(backup))})`);
  /* not while the storage didn't load */
  E(`window.D4_STORE.on=()=>false`);let r=await E('restoreHistory()');
  T('Restore refuses on a page whose storage didn\'t load (it says to force-quit and reopen)',r.ok===false&&errs.some(x=>/storage has to load first/.test(x))&&!hits.some(u=>/restore/.test(u)));
  E(`window.D4_STORE.on=()=>true;window.D4_STORE.degraded=()=>false`);
  w.document.body.insertAdjacentHTML('beforeend','<div class="restoreStatus" id="rs"></div>');
  r=await E('restoreHistory()');
  T('Restore reads the backup from the private repo\'s restore branch, raw',r.ok===true&&hits.some(u=>/api\.github\.com\/repos\/me\/private-sync\/contents\/history-2026-11-05\.lz\?ref=restore/.test(u)),JSON.stringify(r));
  const V=E('get(VOICES_KEY,[])');
  T('the missing calls come back (Nov 4, Nov 5)',V.some(x=>x.id==='v-old1')&&V.some(x=>x.id==='v-old2'),JSON.stringify(V.map(x=>x.id)));
  T('the phone\'s own copy of a call wins over the backup\'s',(V.find(x=>x.id==='v-keep')||{}).price===-999);
  T('the scoreboard has Nov 4 again',E(`charDayRecord('2026-11-04','all').length`)>0);
  T('maps fill in missing days, the phone\'s day wins where both have it',JSON.stringify(E(`get('d4.clv',{})`))===JSON.stringify({'2026-11-04':[7],'2026-11-05':[8],'2026-11-06':[1]}),JSON.stringify(E(`get('d4.clv',{})`)));
  T('prop calls come back',E(`get(CPROP_KEY,[]).length`)===1);
  T('it says what it did',/Restored from the Nov 5 backup — 2 character calls, 1 prop calls/.test(w.document.getElementById('rs').textContent),w.document.getElementById('rs').textContent);
  const r2=await E('restoreHistory()');T('tapping it again adds nothing twice',r2.ok&&E('get(VOICES_KEY,[]).length')===3);
  T('the storage panel row reads "restored … · Restore again"',/restored [A-Z][a-z]{2} \d+/.test(E('restoreRowHtml()'))&&/Restore again/.test(E('restoreRowHtml()')));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
