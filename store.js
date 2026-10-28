/* ═══ v2.79 · THE STORE — your data off the 5 MB shelf ═══════════════════════════════════════════════════════
   Safari gives a website ~5 MB of localStorage, and TheDesk's history outgrew it (94% full = crashes, dropped
   saves, pruning). Now every BIG value (40 KB+: the call ledger, archives, box scores…) lives in IndexedDB,
   which has no 5 MB cap; small values (settings, flags) stay in localStorage. The app still sees ONE ordinary,
   synchronous localStorage: this file loads everything into memory before the app's code starts, then keeps
   both shelves in step. Pages load the app through D4_BOOT (their scripts sit in <template id="d4s">).
   Without IndexedDB (or under the test harness) nothing changes — plain localStorage, exactly as before. */
(function(){
  var RLS;try{RLS=window.localStorage;}catch(e){RLS=null;}
  var BIG=40000,MEM=new Map(),INIDB=new Set(),DB=null,ON=false,PEND=new Map(),TIMER=null,FLUSHING=Promise.resolve(),LOADED=false,BC=null;
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
  window.D4_STORE={on:function(){return ON;},flush:flush,
    inLS:function(k){return!ON||!INIDB.has(k)||PEND.get(k)===null;},
    bytes:function(){var ls=0,db=0;MEM.forEach(function(v,k){var n=v.length*2;if(ON&&(INIDB.has(k)||(PEND.has(k)&&PEND.get(k)!==null)))db+=n;else ls+=n;});return{ls:ls,db:db};}};
  window.D4_FLUSH=function(){return flush();};
  function hydrate(late){return open().then(function(db){DB=db;return all(db);}).then(function(m){if(late())throw new Error('too late');
      m.forEach(function(v,k){MEM.set(k,v);INIDB.add(k);});
      /* localStorage is the newer word on anything it still holds */
      for(var i=0;i<RLS.length;i++){var k=RLS.key(i);MEM.set(k,RLS.getItem(k));}
      try{Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return proxy;}});}catch(e){throw e;}
      if(window.localStorage!==proxy)throw new Error('could not take over localStorage');
      ON=true;
      /* move every big value that is still on the small shelf */
      MEM.forEach(function(v,k){if(v!=null&&v.length>=BIG&&RLS.getItem(k)!=null)queue(k,v);});
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
  window.D4_BOOT=function(){
    if(!RLS||typeof indexedDB==='undefined'||!window.Promise||inline()||/jsdom/i.test(navigator.userAgent||'')){if(inline()){var tpl=document.getElementById('d4s');[].slice.call((tpl.content||tpl).querySelectorAll('script')).forEach(function(it){var s=document.createElement('script');s.text=it.textContent;document.body.appendChild(s);});}else run();return;}
    var done=false;var go=function(){if(done)return;done=true;run();};
    hydrate(function(){return done;}).then(go,function(e){try{console.warn('store: staying on localStorage —',e&&e.message);}catch(_){}go();});
    setTimeout(function(){if(!done){try{console.warn('store: IndexedDB too slow — staying on localStorage this load');}catch(_){}go();}},6000);};
})();
