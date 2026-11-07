/* ═══ v2.79 · THE STORE — your data off the 5 MB shelf ═══════════════════════════════════════════════════════
   Safari gives a website ~5 MB of localStorage, and TheDesk's history outgrew it (94% full = crashes, dropped
   saves, pruning). Now every BIG value (40 KB+: the call ledger, archives, box scores…) lives in IndexedDB,
   which has no 5 MB cap; small values (settings, flags) stay in localStorage. The app still sees ONE ordinary,
   synchronous localStorage: this file loads everything into memory before the app's code starts, then keeps
   both shelves in step. Pages load the app through D4_BOOT (their scripts sit in <template id="d4s">).
   Without IndexedDB (or under the test harness) nothing changes — plain localStorage, exactly as before. */
(function(){
  var RLS;try{RLS=window.localStorage;}catch(e){RLS=null;}
  var BIG=16000,MEM=new Map(),INIDB=new Set(),DB=null,ON=false,PEND=new Map(),TIMER=null,FLUSHING=Promise.resolve(),LOADED=false,BC=null;
  /* v2.86.7 · NEVER WRITE A PARTIAL COPY OVER THE FULL ONE. When IndexedDB didn't answer in time, a page ran on the small shelf alone:
     it couldn't see the big values, so the call ledger, the prop calls, tickets and archives it saved were fresh, nearly empty copies —
     and the next page that DID load the big store took those small copies as "newer" and wrote them over the full history (Nov 6:
     16,000 character calls → 246). Now: every write made while the big store is off is listed; the next good load MERGES each listed
     copy into the full one (lists by id, maps by key, the newer entry winning), keeps the old full copy aside (__prev:), and says why
     the store was off. */
  var WHY_K='d4.__storewhy',DG_K='d4.__dgkeys',PREV='__prev:',DEGRADED=false;
  function note(why,ms){try{RLS.setItem(WHY_K,JSON.stringify({ts:Date.now(),why:String(why||''),ms:ms||0}));}catch(e){}}
  function idOf(x){return x&&typeof x==='object'?(x.id!=null?'i:'+x.id:x.ts!=null&&x.d==null&&x.date==null?'t:'+x.ts+':'+JSON.stringify(x).length:'j:'+JSON.stringify(x)):'j:'+JSON.stringify(x);}
  function merge(a,b){var A,B;try{A=JSON.parse(a);B=JSON.parse(b);}catch(e){return null;}
    if(Array.isArray(A)&&Array.isArray(B)){var out=A.slice(),pos=new Map();out.forEach(function(x,i){pos.set(idOf(x),i);});
      B.forEach(function(x){var k=idOf(x);if(pos.has(k))out[pos.get(k)]=x;else{pos.set(k,out.length);out.push(x);}});return JSON.stringify(out);}
    if(A&&B&&typeof A==='object'&&typeof B==='object'&&!Array.isArray(A)&&!Array.isArray(B)){var o={},k;for(k in A)o[k]=A[k];for(k in B)o[k]=B[k];return JSON.stringify(o);}
    return null;}
  window.addEventListener('load',function(){LOADED=true;});
  function open(){return new Promise(function(res,rej){var r=indexedDB.open('thedesk',1);r.onupgradeneeded=function(){r.result.createObjectStore('kv');};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};r.onblocked=function(){rej(new Error('blocked'));};});}
  function all(db){return new Promise(function(res,rej){var out=new Map();var c=db.transaction('kv','readonly').objectStore('kv').openCursor();c.onsuccess=function(){var x=c.result;if(x){out.set(String(x.key),x.value);x.continue();}else res(out);};c.onerror=function(){rej(c.error);};});}
  function flush(){if(TIMER){clearTimeout(TIMER);TIMER=null;}if(!DB||!PEND.size)return FLUSHING;var batch=new Map(PEND);PEND.clear();
    FLUSHING=FLUSHING.then(function(){return new Promise(function(res){try{var t=DB.transaction('kv','readwrite'),s=t.objectStore('kv');
      batch.forEach(function(v,k){if(v===null){s.delete(k);}else{s.put(v,k);}});
      t.oncomplete=function(){batch.forEach(function(v,k){if(v===null){INIDB.delete(k);return;}INIDB.add(k);
          /* the big copy is safe in IndexedDB: drop the localStorage copy (only if nothing newer was written since) */
          if(MEM.get(k)===v){try{if(RLS.getItem(k)!=null)RLS.removeItem(k);}catch(e){}}});res();};
      t.onerror=t.onabort=function(){batch.forEach(function(v,k){if(!PEND.has(k))PEND.set(k,v);});res();};}catch(e){batch.forEach(function(v,k){if(!PEND.has(k))PEND.set(k,v);});res();}});});
    return FLUSHING;}
  function queue(k,v){PEND.set(k,v);if(!TIMER)TIMER=setTimeout(flush,60);}
  function tell(k,v){try{if(BC)BC.postMessage({k:k,v:v});}catch(e){}}
  var shim={
    getItem:function(k){k=String(k);return MEM.has(k)?MEM.get(k):null;},
    setItem:function(k,v){k=String(k);v=String(v);var had=MEM.has(k),old=MEM.get(k);
      if(v.length>=BIG){MEM.set(k,v);queue(k,v);}
      else{try{RLS.setItem(k,v);}catch(e){if(had)MEM.set(k,old);throw e;}MEM.set(k,v);if(INIDB.has(k)||PEND.has(k))queue(k,null);}
      tell(k,v);},
    removeItem:function(k){k=String(k);MEM.delete(k);try{RLS.removeItem(k);}catch(e){}if(INIDB.has(k)||PEND.has(k))queue(k,null);tell(k,null);},
    clear:function(){MEM.forEach(function(v,k){if(INIDB.has(k))queue(k,null);});MEM.clear();try{RLS.clear();}catch(e){}},
    key:function(i){return Array.from(MEM.keys())[i]==null?null:Array.from(MEM.keys())[i];},
    get length(){return MEM.size;}};
  var proxy=typeof Proxy==='function'?new Proxy(shim,{
    ownKeys:function(){return Array.from(MEM.keys());},
    getOwnPropertyDescriptor:function(t,k){return MEM.has(k)?{value:MEM.get(k),enumerable:true,configurable:true,writable:true}:undefined;},
    has:function(t,k){return k in t||MEM.has(k);},
    get:function(t,k){if(k in t)return t[k];return MEM.has(k)?MEM.get(k):undefined;}}):shim;
  /* what's where, for the storage meter */
  window.D4_STORE={on:function(){return ON;},flush:flush,merge:merge,degraded:function(){return DEGRADED;},idb:function(){return typeof indexedDB!=='undefined';},
    why:function(){try{return JSON.parse(RLS.getItem(WHY_K)||'null');}catch(e){return null;}},
    inLS:function(k){return!ON||!INIDB.has(k)||PEND.get(k)===null;},
    bytes:function(){var ls=0,db=0;MEM.forEach(function(v,k){var n=v.length*2;if(ON&&(INIDB.has(k)||(PEND.has(k)&&PEND.get(k)!==null)))db+=n;else ls+=n;});return{ls:ls,db:db};}};
  window.D4_FLUSH=function(){return flush();};
  function hydrate(late){var t0=Date.now();return open().then(function(db){DB=db;return all(db);}).then(function(m){if(late())throw new Error('too late');
      var dg={};try{(JSON.parse(RLS.getItem(DG_K)||'[]')||[]).forEach(function(k){dg[k]=1;});}catch(e){}
      var stash=[],fix=[];
      m.forEach(function(v,k){if(k.indexOf(PREV)===0)return;MEM.set(k,v);INIDB.add(k);});   /* the kept-aside copies stay in IndexedDB only */
      /* localStorage is the newer word on anything it still holds — except a copy made while the big store was off (v2.86.7):
         that page never saw the full value, so its copy is MERGED into the full one instead of replacing it */
      for(var i=0;i<RLS.length;i++){var k=RLS.key(i),lv=RLS.getItem(k);if(k===DG_K)continue;   /* the list is the store's own, never the app's */
        if(k!==WHY_K&&m.has(k)&&lv!=null){var iv=m.get(k);
          if(iv!==lv&&(dg[k]||lv.length>=BIG||iv.length>lv.length*2)){var mv=merge(iv,lv);if(mv==null)mv=iv.length>=lv.length?iv:lv;
            if(!m.has(PREV+k))stash.push([PREV+k,iv]);MEM.set(k,mv);fix.push(k);continue;}}
        MEM.set(k,lv);}
      try{Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return proxy;}});}catch(e){throw e;}
      if(window.localStorage!==proxy)throw new Error('could not take over localStorage');
      ON=true;
      stash.forEach(function(p){queue(p[0],p[1]);});
      /* a merged value smaller than the big-store size lives on the small shelf (and its big copy goes) */
      fix.forEach(function(k){var v=MEM.get(k);if(v!=null&&v.length<BIG){try{RLS.setItem(k,v);}catch(e){}queue(k,null);}});
      /* move every big value that is still on the small shelf (merged ones included) */
      MEM.forEach(function(v,k){if(v!=null&&v.length>=BIG&&RLS.getItem(k)!=null)queue(k,v);});
      try{RLS.removeItem(DG_K);}catch(e){}note(fix.length?'ok · merged '+fix.length+' records written while it was off':'ok',Date.now()-t0);if(fix.length)window.__D4_MERGED=fix.slice();
      try{BC=new BroadcastChannel('d4store');BC.onmessage=function(e){var d=e.data||{};if(d.k==null)return;if(d.v===null)MEM.delete(d.k);else MEM.set(d.k,d.v);
        try{window.dispatchEvent(new StorageEvent('storage',{key:d.k,newValue:d.v}));}catch(_){}};}catch(e){}
      document.addEventListener('visibilitychange',function(){if(document.hidden)flush();});
      window.addEventListener('pagehide',function(){flush();});
    });}
  function run(){var tpl=document.getElementById('d4s');if(!tpl)return;var items=[].slice.call((tpl.content||tpl).querySelectorAll('script'));var dcl=document.readyState!=='loading';
    var i=0;function next(){if(i>=items.length){if(dcl||document.readyState!=='loading'){try{document.dispatchEvent(new Event('DOMContentLoaded'));}catch(e){}}if(LOADED){try{window.dispatchEvent(new Event('load'));}catch(e){}}return;}
      var it=items[i++];var s=document.createElement('script');
      if(it.getAttribute('src')){s.src=it.getAttribute('src');s.async=false;var last=s;
        /* consecutive file scripts go in together (they still run in order); wait on the last one */
        while(i<items.length&&items[i].getAttribute('src')){var t=document.createElement('script');t.src=items[i++].getAttribute('src');t.async=false;document.body.appendChild(s);s=t;last=t;}
        last.onload=next;last.onerror=next;document.body.appendChild(last);}
      else{s.text=it.textContent;document.body.appendChild(s);next();}}
    next();}
  /* the test harness inlines the scripts: run them right away, synchronously, on plain localStorage */
  function inline(){var tpl=document.getElementById('d4s');if(!tpl)return false;return[].slice.call((tpl.content||tpl).querySelectorAll('script')).every(function(x){return!x.getAttribute('src');});}
  function degrade(why,ms){note(why,ms);DEGRADED=true;if(!RLS)return;var seen={};try{(JSON.parse(RLS.getItem(DG_K)||'[]')||[]).forEach(function(k){seen[k]=1;});}catch(e){}
    var rec=function(k){k=String(k);if(seen[k]||k===DG_K||k===WHY_K)return;seen[k]=1;try{RLS.setItem(DG_K,JSON.stringify(Object.keys(seen).slice(-600)));}catch(e){}};
    var keys=function(){var a=[];for(var i=0;i<RLS.length;i++)a.push(RLS.key(i));return a;};
    var d={getItem:function(k){return RLS.getItem(k);},setItem:function(k,v){RLS.setItem(k,v);rec(k);},removeItem:function(k){RLS.removeItem(k);rec(k);},
      clear:function(){keys().forEach(rec);RLS.clear();},key:function(i){return RLS.key(i);},get length(){return RLS.length;}};
    var dp=typeof Proxy==='function'?new Proxy(d,{ownKeys:function(){return keys();},getOwnPropertyDescriptor:function(t,k){var v=RLS.getItem(k);return v!=null?{value:v,enumerable:true,configurable:true,writable:true}:undefined;},
      has:function(t,k){return k in t||RLS.getItem(k)!=null;},get:function(t,k){if(k in t)return t[k];var v=RLS.getItem(k);return v!=null?v:undefined;}}):d;
    try{Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return dp;}});}catch(e){}}
  window.D4_BOOT=function(){
    if(!RLS||typeof indexedDB==='undefined'||!window.Promise||inline()||/jsdom/i.test(navigator.userAgent||'')){if(inline()){var tpl=document.getElementById('d4s');[].slice.call((tpl.content||tpl).querySelectorAll('script')).forEach(function(it){var s=document.createElement('script');s.text=it.textContent;document.body.appendChild(s);});}else run();return;}
    var done=false,T0=Date.now();window.__D4_WAIT=Date.now();var go=function(){if(done)return;done=true;window.__D4_WAIT=0;run();};   /* v2.82.3 · the pages' "code did not load" check waits while this is set */
    /* v2.86.7 · waits up to 12 s (relay pages 30 s) — it was 6 s; a slow phone morning tipped pages onto the small shelf */
    var lim=/[?&]bg=1/.test(location.search||'')?30000:12000;
    hydrate(function(){return done;}).then(go,function(e){if(done)return;try{console.warn('store: staying on localStorage —',e&&e.message);}catch(_){}degrade('IndexedDB error: '+String(e&&e.message||e).slice(0,120),Date.now()-T0);go();});
    setTimeout(function(){if(!done){try{console.warn('store: IndexedDB too slow — staying on localStorage this load');}catch(_){}degrade('IndexedDB didn\'t answer in '+Math.round(lim/1000)+' s',lim);go();}},lim);};
})();
