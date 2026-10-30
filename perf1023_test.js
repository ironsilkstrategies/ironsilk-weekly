/* v2.51 · THE FREEZE AUDIT — measured on the phone's real state:
   · the cloud sync packed ~24 MB on the main thread (~8 s frozen, every 3 minutes and on every app switch)
   · every big write (the 3.7 MB call ledger after a board refresh) packed on the main thread (1-3 s)
   · grading the intel parsed the baseball line store once per line (~1,800 parses, 3+ s at boot)
   · regrading parsed the box-score store once per leg; the background loop ran as one 5-6 s task.
   Now: packing runs in a background worker, idle syncs are one tiny request, big writes land in memory
   at once and reach storage a moment later (always before the page goes away), hot loops read once. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const vm=require('vm');const W='/home/claude/work';
const LZ=require('/home/claude/node_modules/lz-string');
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const NOW=Date.parse('2026-10-23T18:00:00Z');
function page(file,fetchImpl,extra){let html=fs.readFileSync(path.join(W,file),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;const t0=Date.now();class FD extends RD{constructor(...a){super(...(a.length?a:[NOW+(Date.now()-t0)]))}static now(){return NOW+(Date.now()-t0)}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;w.__NO_FLIP_RELOAD__=true;w.__NO_SYNC_LOOP__=true;w.__NO_BACKFILL__=true;
    w.fetch=fetchImpl||(()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')}));w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
    w.localStorage.setItem('d4.setupDone','1');if(extra)extra(w);}}).window;}
(async()=>{try{
  /* ── 1 · write-behind ── */
  {const w=page('nhl.html');await wait(2500);
    const big=JSON.stringify(Array.from({length:3000},(_,i)=>({id:'c'+i,sp:'nhl',date:'2026-10-23',game:'A'+(i%40)+'@B',voice:'Judge',market:'ml',side:'home',price:-120,pick:'B ML',note:'x'.repeat(30)})));
    w.eval(`set('d4.bigtest',${big})`);
    T('a big write is readable at once (every read sees it)',w.eval(`get('d4.bigtest',[]).length`)===3000);
    T('…while the packing hasn\'t touched storage yet (no main-thread compress)',w.localStorage.getItem('d4.bigtest')===null);
    T('…and the sync snapshot already carries it',w.eval(`JSON.parse(syncSnapshotJson()).keys['d4.bigtest'].v.length`)===3000&&w.eval(`syncSnapshot().keys['d4.bigtest'].v.length`)===3000);
    await wait(2200);const raw=w.localStorage.getItem('d4.bigtest');
    T('a moment later storage holds the packed copy (same format as before)',!!raw&&raw.charCodeAt(0)===1&&JSON.parse(LZ.decompressFromUTF16(raw.slice(3))).length===3000,raw&&raw.slice(0,8));
    T('…and the next read is served from the unpacked text (no decompress)',w.eval(`(()=>{const c=_DEC_C.get('d4.bigtest');return !!c&&c.raw===localStorage.getItem('d4.bigtest');})()`)===true);
    w.eval(`(()=>{const a=get('d4.bigtest',[]);a.push({id:'n1'});set('d4.bigtest',a);const b=get('d4.bigtest',[]);b.push({id:'n2'});set('d4.bigtest',b);})()`);
    await wait(2600);T('two writes in a row: storage ends with the newest',JSON.parse(LZ.decompressFromUTF16(w.localStorage.getItem('d4.bigtest').slice(3))).length===3002);
    w.eval(`(()=>{const a=get('d4.bigtest',[]);a.push({id:'n3'});set('d4.bigtest',a);})()`);
    Object.defineProperty(w.document,'hidden',{configurable:true,get:()=>true});w.document.dispatchEvent(new w.Event('visibilitychange'));
    T('the app going to the background writes anything pending right away',JSON.parse(LZ.decompressFromUTF16(w.localStorage.getItem('d4.bigtest').slice(3))).length===3003&&w.eval('WB_PEND.size')===0);
    Object.defineProperty(w.document,'hidden',{configurable:true,get:()=>false});
    w.eval(`set('d4.smalltest',{a:1})`);T('a small write is stored immediately, as before',w.localStorage.getItem('d4.smalltest')==='{"a":1}');
    w.eval(`WB_SYNC=1;set('d4.bigtest2',${big});WB_SYNC=0;`);T('inside a storage-full recovery big writes go straight to storage',!!w.localStorage.getItem('d4.bigtest2'));
    w.eval(`(()=>{const a=get('d4.bigtest',[]);a.push({id:'n4'});set('d4.bigtest',a);})()`);const B=w.eval('backupData()');
    T('a backup never misses a pending write',JSON.parse(LZ.decompressFromUTF16(B['d4.bigtest'].slice(3))).length===3004);
    /* the raw snapshot = the parsed one */
    const a=w.eval(`JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(syncSnapshotJson()).keys).map(([k,o])=>[k,o.v])))`),b=w.eval(`JSON.stringify(Object.fromEntries(Object.entries(syncSnapshot().keys).map(([k,o])=>[k,o.v])))`);
    T('the fast snapshot (straight from storage) is identical to the full one',a===b,a.length+' vs '+b.length);
    /* the worker's code, run as a worker would */
    const src=w.eval('lzWorkerSrc()');const sent=[];const box={postMessage:m=>sent.push(m)};vm.createContext(box);vm.runInContext(src,box);
    const s='{"hello":"world","n":[1,2,3]}'.repeat(50);box.onmessage({data:{id:1,op:'c64',s}});box.onmessage({data:{id:2,op:'c16',s}});box.onmessage({data:{id:3,op:'d64',s:LZ.compressToBase64(s)}});
    T('the background worker packs exactly like the page (cloud and storage formats unchanged)',sent[0].r===LZ.compressToBase64(s)&&sent[1].r===LZ.compressToUTF16(s)&&sent[2].r===s);}
  /* ── 2 · the sync: idle = one tiny request; only local changes = no download ── */
  {let CUR='r1',REMOTE=LZ.compressToBase64(JSON.stringify({v:1,dev:'Desktop-x',ts:1,keys:{'d4.remoteonly':{t:5,v:{a:1}}}}));const C={ref:0,pull:0,push:0,blob:null};let cn=0;
    const json=o=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(o),text:()=>Promise.resolve(JSON.stringify(o))});
    const F=(u,o)=>{u=String(u);o=o||{};
      if(/repos\/me\/thedesk-data$/.test(u))return json({private:true});   /* v2.80.6 · the sync repo's privacy check */
      if(/\/git\/ref\/heads\/main/.test(u)){C.ref++;return json({object:{sha:CUR}});}
      if(/\/contents\/thedesk-sync\.json/.test(u)){C.pull++;return Promise.resolve({ok:true,status:200,text:()=>Promise.resolve(REMOTE)});}
      if(/\/git\/blobs$/.test(u)){C.push++;C.blob=JSON.parse(o.body).content;return json({sha:'b'+C.push});}
      if(/\/git\/trees$/.test(u))return json({sha:'t'});if(/\/git\/commits$/.test(u))return json({sha:'c'+(++cn)});
      if(/\/git\/refs\/heads\/main/.test(u)&&o.method==='PATCH'){CUR=JSON.parse(o.body).sha;REMOTE=C.blob;return json({});}
      return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
    const w=page('nhl.html',F,x=>{x.localStorage.setItem('d4.syncrepo',JSON.stringify('me/thedesk-data'));x.localStorage.setItem('d4.synctoken',JSON.stringify('github_pat_xxxxxxxxxxxxxxxxxxxxxxxx'));x.localStorage.setItem('d4.localthing',JSON.stringify({b:1}));});
    await wait(2500);
    let r=await w.eval('syncNow(false)');T('first sync: the full merge (pull, merge, push)',r.ok&&C.pull===1&&C.push===1&&w.eval(`get('d4.remoteonly',null).a`)===1,JSON.stringify(C));
    r=await w.eval('syncNow(false)');T('nothing new on either side: one tiny request, no download, no upload',r.ok&&C.pull===1&&C.push===1&&w.eval('SYNC_STATE.fast')==='idle',JSON.stringify(C));
    w.eval(`set('d4.localthing',{b:2})`);r=await w.eval('syncNow(false)');
    const snap=JSON.parse(LZ.decompressFromBase64(C.blob));
    T('only this device changed: pushed straight from storage, nothing downloaded',r.ok&&C.pull===1&&C.push===2&&w.eval('SYNC_STATE.fast')==='push'&&snap.keys['d4.localthing'].v.b===2&&snap.keys['d4.remoteonly'].v.a===1,JSON.stringify(C));
    CUR='r9';REMOTE=LZ.compressToBase64(JSON.stringify({...snap,dev:'Desktop-x',keys:{...snap.keys,'d4.remoteonly':{t:Date.now()+9e9,v:{a:2}}}}));
    r=await w.eval('syncNow(false)');T('another device saved: the full merge runs and its change lands here',r.ok&&C.pull===2&&w.eval(`get('d4.remoteonly',null).a`)===2,JSON.stringify(C));
    T('the cloud file\'s format is unchanged (any device or worker reads it)',!!JSON.parse(LZ.decompressFromBase64(REMOTE)).keys);
    T('display-only pregame snapshots never sync',w.eval(`syncSkip('d4.pregame')`)===true);}
  /* ── 3 · hot loops read once ── */
  {const w=page('nhl.html');await wait(2500);
    w.eval(`set(LS.bookshots,{'2026-10-22':[{game:'CLE@TB',market:'total',side:'over',line:7.5,price:-110}],'2026-10-23':[{game:'TB@MIL',market:'total',side:'over',line:8,price:-105},{game:'TB@MIL',market:'runline',side:'home',line:-1.5,price:140}]})`);
    const n=w.eval(`(()=>{let c=0;const g0=get;get=function(k){if(k===LS.bookshots)c++;return g0.apply(this,arguments);};let r=[];for(let i=0;i<300;i++)r.push(intelLineFor('mlb',i%2?'TB@MIL':'CLE@TB','total','over'));get=g0;return{c,a:r[0]&&r[0].line,b:r[1]&&r[1].line,rl:intelLineFor('mlb','TB@MIL','spread','home').line};})()`);
    T('grading 300 intel lines reads the line store once (was once per line)',n.c<=1&&n.a===7.5&&n.b===8&&n.rl===-1.5,JSON.stringify(n));
    const m=w.eval(`(()=>{set(FBP_BOX_KEY,{'nfl:1':{final:true,box:{teamStats:{a:{}}}}});let c=0;const g0=get;get=function(k){if(k===FBP_BOX_KEY)c++;return g0.apply(this,arguments);};for(let i=0;i<100;i++)fbpBox('1','nfl');get=g0;return c;})()`);
    T('regrading 100 legs reads the box-score store once (was once per leg)',m<=1,String(m));
    /* the background loop: one step per task */
    w.eval(`localStorage.removeItem(AP_KEY);window.__AP_N=0;window.__AP_SEEN=[];AP_STEPS.forEach(s=>{const f=s[3];s[3]=()=>{__AP_SEEN.push(s[0]);return f();};});`);
    const p=w.eval('apRunSoft("test")');const mid=w.eval('__AP_SEEN.length');const R=await p;
    T('the background loop runs one step per task — the screen stays live in between',mid===0&&R&&R.soft===1&&R.steps.length===w.eval('AP_STEPS.length'),`steps ${R&&R.steps.length}, before first yield ${mid}`);
    T('…and it still runs at most every 6 hours',(await w.eval('apRunSoft("again")'))===null);}
  /* ── 4 · an unchanged call isn't a write ── */
  {const w=page('nhl.html');await wait(2500);
    const r=w.eval(`(()=>{NHL_GAMES=[{id:'g1',away:{abbr:'NJ',name:'Devils'},home:{abbr:'WSH',name:'Capitals'},abstract:'pre',start:'2026-10-24T00:00:00Z',date:'2026-10-24T00:00:00Z'}];
      NHL_SIMS={g1:{aw:0.44,hw:0.56,awayProj:2.7,homeProj:3.2,med:5.9}};let w=0;const s0=set;set=function(k){if(k===VOICES_KEY)w++;return s0.apply(this,arguments);};
      const a=voicesLog('nhl'),b=voicesLog('nhl');set=s0;return{a,b,w};})()`);
    T('the call ledger is written when calls change, not on every board refresh',r.a>0&&r.b===0&&r.w===1,JSON.stringify(r));}
}catch(e){T('no crash',false,String(e&&e.stack||e).slice(0,600));}
  const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);})();
