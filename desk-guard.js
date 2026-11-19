/* ═══ v3.2 · THE GUARD — nothing fails silently again (Nov 18) ═══════════════════════════════════════════
   Nov 17: iOS wiped the home-screen app. Sync brought the history back, but every key was gone (no transfer code had been
   saved) and the Telegram token went with them — so the VIP card never posted, never reached the 24/7 worker, and the worker
   sat on Nov 16 for two days. Then the sync token died (HTTP 401) and nothing saved for 15 hours while Today said "Load failed".
   This module makes each of those loud, and gives the data a second way out:
     1 · sync: a pasted token is cleaned and checked; a 401 says the token is dead (not "needs permissions") and keeps a red
         banner on Today until it's fixed; a dropped connection retries itself; a token GitHub refused is never kept
     2 · the 24/7 worker: the phone checks in (no secrets — times and yes/no) so the worker can tell you on Telegram when the
         phone goes quiet, a card is missing or backups fail; a card sealed with the wrong key says so
     3 · 🛟 the vault: everything sync keeps, compressed and encrypted (the worker key), saved through the PUBLISH token to the
         site repo (branch desk-vault) — a second copy that doesn't need the sync token; the worker keeps four days of it
     4 · keys: a transfer code you never saved, or saved before a key changed, says so; one tap puts it in Files
     5 · the browser is asked to keep this site's storage (navigator.storage.persist) */
const GRD_AUTH='d4.syncauth',GRD_BEAT='d4.tgwbeat',GRD_XFER='d4.xferSaved',GRD_XFP='d4.xferFp',GRD_VMETA='d4.vaultmeta',GRD_PERSIST='d4.persist';
try{[GRD_AUTH,GRD_BEAT,GRD_XFER,GRD_XFP,GRD_VMETA,GRD_PERSIST].forEach(k=>SYNC_NEVER.add(k));}catch(e){}
/* the worker key travels with the transfer code too: without it neither the vault nor the 24/7 hand-off can be opened */
try{if(!MOVE_KEYS.includes('d4.tgautokey'))MOVE_KEYS.push('d4.tgautokey');}catch(e){}
const grdLS=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const grdJ=k=>{try{return JSON.parse(grdLS(k)||'null');}catch(e){return null;}};
const grdPut=(k,v)=>{try{localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));}catch(e){}};
const grdWhen=t=>{if(!t)return'never';try{return new Date(t).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}catch(e){return String(t);}};
const grdAgo=t=>{const ms=Date.now()-t;const h=ms/36e5;return h<1?Math.max(1,Math.round(ms/60e3))+' min':h<48?Math.round(h)+' h':Math.round(h/24)+' days';};

/* ── 1 · TOKENS ──────────────────────────────────────────────────────────────────────────────────────── */
/* spaces, line breaks and invisible characters (Notes, password managers) turn a good token into a 401 */
function grdTokClean(t){return String(t==null?'':t).replace(/[\s\u00a0\u1680\u180e\u2000-\u200f\u2028-\u202f\u205f\u2060\u3000\ufeff]+/g,'').replace(/^["'`\u201c\u201d\u2018\u2019<]+|["'`\u201c\u201d\u2018\u2019>]+$/g,'');}
function grdTokCheck(t){if(!t)return'nothing was pasted';
  if(/^github_pat_[A-Za-z0-9_]+$/.test(t))return t.length>=80?'':'it\'s only '+t.length+' characters — a fine-grained token is about 93, so it was probably cut off when it was copied';
  if(/^gh[pousr]_[A-Za-z0-9]+$/.test(t))return t.length===40?'':'a classic token is 40 characters — this one is '+t.length;
  if(/[^A-Za-z0-9_]/.test(t))return'it contains characters a GitHub token never has';
  return'it doesn\'t start like a GitHub token (github_pat_… or ghp_…)';}
const grdTokFp=()=>sy3H(String(get(SYNC.token,'')||''));
function grdAuth(){const A=grdJ(GRD_AUTH);return A&&A.fp===grdTokFp()?A:null;}
function grdAuthSet(status,msg){grdPut(GRD_AUTH,{ts:(grdAuth()||{}).ts||Date.now(),status:status||401,msg:String(msg||'').slice(0,260),fp:grdTokFp()});}
function grdAuthClear(){try{localStorage.removeItem(GRD_AUTH);}catch(e){}}
const grdStatusOf=m=>{const x=/HTTP (\d{3})/.exec(String(m||''));return x?+x[1]:0;};
const grdTransient=m=>/load failed|failed to fetch|networkerror|network connection|didn't answer|timed? ?out|aborted|cancel+ed|HTTP 5\d\d|offline|internet connection/i.test(String(m||''));
function grdMsg(status,what,repo){repo=repo||get(SYNC.repo,'')||'the repo';what=what||'sync token';
  if(status===401)return`GitHub doesn't recognize the ${what} (HTTP 401): it was deleted, regenerated or has expired — or it got cut off when it was pasted. Make a new one for ${repo} (Contents: Read and write) and paste it in Settings`;
  if(status===403)return`the ${what} isn't allowed to write to ${repo} (HTTP 403) — it needs Contents: Read and write on that repo`;
  if(status===404)return`the ${what} can't see ${repo} (HTTP 404) — check the name, and that the token was given that repo (Repository access → Only select repositories)`;
  return'HTTP '+status;}
/* syncRef: a 401 means a dead token, a 404 can mean "no access" rather than "empty repo" — say which */
if(typeof syncRef==='function'){syncRef=async function(){const repo=get(SYNC.repo,'');const r=await syncFetch(syncGit('ref/heads/main')+'?t='+Date.now(),{headers:syncHeaders(),cache:'no-store'});
  const fail=(st,m)=>{const e=new Error(m||grdMsg(st,'sync token',repo));e.status=st;e.auth=true;return e;};
  if(r.status===401)throw fail(401);
  if(r.status===403){const lim=r.headers&&r.headers.get&&r.headers.get('x-ratelimit-remaining')==='0';if(lim){const e=new Error('GitHub\'s hourly limit for this token is used up — it resets within the hour');e.status=403;throw e;}throw fail(403);}
  if(r.status===404||r.status===409){if(r.status===404){let q=null;try{q=await syncFetch('https://api.github.com/repos/'+repo,{headers:syncHeaders(),cache:'no-store'});}catch(e){}
      if(q&&q.status===401)throw fail(401);if(q&&(q.status===404||q.status===403))throw fail(404);}return null;}
  if(!r.ok)throw new Error('HTTP '+r.status+' reading the repo');const j=await r.json();return j.object&&j.object.sha||null;};}
/* the same words for a refusal in the middle of a sync (trees, blobs, commits) */
if(typeof sy3Json==='function'){const SJ0=sy3Json;sy3Json=async function(path,o){try{return await SJ0(path,o);}catch(e){if(e&&e.status===401){const x=new Error(grdMsg(401));x.status=401;x.auth=true;throw x;}throw e;}};}
/* syncNow: a refused token turns the red banner on (and isn't hammered every few minutes); a dropped connection retries itself */
let GRD_RETRY_T=null,GRD_RETRY_N=0;
if(typeof syncNow==='function'){const SN0=syncNow;syncNow=async function(manual,first){
    const A=grdAuth();if(!manual&&A&&Date.now()-(A.last||A.ts)<2*36e5){try{renderSyncStatus();}catch(e){}return{ok:false,reason:A.msg,auth:true};}
    const r=await SN0.apply(this,arguments);
    try{if(r&&r.ok){grdAuthClear();GRD_RETRY_N=0;clearTimeout(GRD_RETRY_T);}
      else if(r&&r.reason){const st=grdStatusOf(r.reason);const authy=st===401||/doesn't recognize|isn't allowed|can't see/i.test(r.reason);
        if(authy){const msg=/doesn't recognize|isn't allowed|can't see/i.test(r.reason)?r.reason:grdMsg(st||401);grdAuthSet(st||401,msg);const A2=grdAuth();if(A2){A2.last=Date.now();grdPut(GRD_AUTH,A2);}
          try{SYNC_STATE={ok:false,ts:Date.now(),msg};renderSyncStatus();}catch(e){}}
        else if(grdTransient(r.reason)&&!manual&&GRD_RETRY_N<4){clearTimeout(GRD_RETRY_T);GRD_RETRY_T=setTimeout(()=>{try{syncNow(false);}catch(e){}},[30e3,90e3,240e3,600e3][GRD_RETRY_N++]);}}}catch(e){}
    try{grdRefreshBanners();}catch(e){}return r;};syncNow.__inner=SN0;}
/* connecting: clean and check the token, and never keep one GitHub just refused */
if(typeof syncConnect==='function'){syncConnect=async function(){const repo=String((document.getElementById('syncRepoIn')||{}).value||'').trim().replace(/^https?:\/\/github\.com\//i,'').replace(/\.git$/i,'').replace(/\/+$/,'');
  const tok=grdTokClean((document.getElementById('syncTokIn')||{}).value);
  if(!repo||!/^[\w.-]+\/[\w.-]+$/.test(repo)){alert('Repo should look like owner/name — e.g. ironsilkstrategies/thedesk-data');return;}
  if(!tok){alert('Paste the fine-grained token for that repo.');return;}
  const bad=grdTokCheck(tok);if(bad&&!confirm('That token looks off: '+bad+'.\n\nUse it anyway?'))return;
  const prev={repo:grdLS(SYNC.repo),tok:grdLS(SYNC.token)};_syncSetRaw(SYNC.repo,repo);_syncSetRaw(SYNC.token,tok);grdAuthClear();
  let remote=null;try{remote=await sy3Probe();}catch(e){
    try{if(prev.repo!=null)localStorage.setItem(SYNC.repo,prev.repo);else localStorage.removeItem(SYNC.repo);if(prev.tok!=null)localStorage.setItem(SYNC.token,prev.tok);else localStorage.removeItem(SYNC.token);}catch(x){}
    alert('Could not connect: '+(e.message||e)+(prev.tok?'\n\nYour previous connection is kept.':'\n\nNothing was saved — fix the token and tap Connect again.'));try{renderSyncStatus();}catch(x){}return;}
  const hasLocal=(get(LS.locked,[])||[]).length+Object.keys(get(LS.arc,{})||{}).length>0;
  let first;if(!remote)first='local';
  else if(hasLocal)first=confirm(`The cloud copy was last saved by ${remote.dev||'another device'} on ${new Date(remote.ts).toLocaleString()}.\n\nOK = MERGE this device into it (tickets and graded history from both are kept; for settings, this device wins).\nCancel = take the cloud copy for settings (tickets and history are still merged).`)?'local':'remote';
  else first='remote';
  const r=await syncNow(true,first);
  /* the cloud copy may be older than the vault (a dead sync token for hours): offer the newer one */
  let merged=0;try{if(r&&r.ok)merged=await grdVaultOfferNewer(remote&&remote.ts);}catch(e){}
  if(r&&r.ok&&(r.changed||merged)){setTimeout(()=>location.reload(),900);}};}
/* the publish token: cleaned, checked, and tested the moment it's saved */
if(typeof saveGhSettings==='function'){saveGhSettings=function(){const ri=document.getElementById('ghrepoIn'),ti=document.getElementById('ghtokenIn');
  const repo=String(ri&&ri.value||'').trim().replace(/^https?:\/\/github\.com\//i,'').replace(/\.git$/i,'').replace(/\/+$/,'');const tok=grdTokClean(ti&&ti.value);
  if(tok){const bad=grdTokCheck(tok);if(bad&&!confirm('That token looks off: '+bad+'.\n\nSave it anyway?'))return;}
  set(LS.ghrepo,repo);set(LS.ghtoken,tok);if(ti)ti.value=tok;
  try{deskToast(tok?'✓ Saved — checking the token with GitHub…':'Public page settings saved (no token)',3000);}catch(e){}
  if(tok&&repo)grdTestTok(repo,tok,'publish token').then(m=>{try{deskToast(m,m.startsWith('✓')?3500:9000);}catch(e){}}).catch(()=>{});};}
async function grdTestTok(repo,tok,what){try{const r=await syncFetch('https://api.github.com/repos/'+repo,{headers:{'Authorization':'Bearer '+tok,'Accept':'application/vnd.github+json'},cache:'no-store'});
    if(r.status===200){const j=await r.json();return j&&j.permissions&&j.permissions.push===false?'⚠ The '+what+' can read '+repo+' but not write to it — set Contents: Read and write':'✓ The '+what+' works on '+repo;}
    return'⚠ '+grdMsg(r.status,what,repo);}catch(e){return'⚠ Couldn\'t reach GitHub to check the '+what+' ('+(e.message||e)+')';}}
/* a big first pull that drops halfway picks up where it stopped (the base is saved after every key, not only at the end) */
if(typeof sy3Pull==='function'&&typeof sy3SaveBase==='function'){const SP0=sy3Pull;sy3Pull=async function(B,R,first){const save0=sy3SaveBase;let n=0;
  const tick=setInterval(()=>{try{save0(B);syncSaveKts();}catch(e){}},4000);   /* every few seconds while it runs: what's applied stays applied */
  try{const out=await SP0.call(this,B,R,first);n=out&&out.n||0;return out;}finally{clearInterval(tick);try{save0(B);}catch(e){}}};}

/* ── 2 · THE PHONE CHECKS IN WITH THE 24/7 WORKER ────────────────────────────────────────────────────── */
function grdPhone(){const last=+grdLS(SYNC.last)||0;const F=grdJ('d4.syncfail');const A=grdAuth();
  const has=k=>{const v=grdLS(k);return!!(v&&v!=='""'&&v!=='null');};
  const K={odds:has(LS.key),tg:has('d4.tgbot'),pub:has(LS.ghtoken),sync:has(SYNC.token)};const V=grdVaultLocal();
  return{ts:Date.now(),build:'v'+(typeof DESK_VER!=='undefined'?DESK_VER:'?'),
    sync:{on:syncOn(),last,err:F&&F.ts>last?String(F.msg||'').slice(0,120):'',auth:!!A,authTs:A?A.ts:0},
    vault:{on:grdVaultOn(),ts:V?V.ts:0,keys:V?V.keys:0},
    keys:{...K,n:Object.values(K).filter(Boolean).length,missing:Object.values(K).filter(x=>!x).length},xfer:grdXferOk()?(+grdLS(GRD_XFER)||0):0};}
async function grdTgwPush(mine,msg){for(let tries=0;tries<3;tries++){const R=await tgwRead();if(!R.ok)return R;
    if(!R.sha&&!(await tgwEnsureBranch(R.repo,R.H)))return{ok:false,reason:'couldn\'t create the autopilot branch'};
    const merged=tgwMerge(mine,R.state||{posts:{}});
    const body={message:msg,branch:TGW_BRANCH,content:b64u(await tgwEncrypt(merged)),...(R.sha?{sha:R.sha}:{})};
    const w=await fetch(`https://api.github.com/repos/${R.repo}/contents/${TGW_FILE}`,{method:'PUT',headers:{...R.H,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(w.ok){grdPut(GRD_BEAT,String(Date.now()));return{ok:true,state:merged};}
    if(w.status===401||w.status===403)return{ok:false,reason:grdMsg(w.status,'GitHub token',R.repo)};if(w.status!==409&&w.status!==422)return{ok:false,reason:'HTTP '+w.status};}
  return{ok:false,reason:'kept colliding with the worker — try again'};}
if(typeof tgwHandOff==='function'){tgwHandOff=async function(p){
  /* no key on this phone: a first hand-off (nothing on GitHub yet) may make one; with a card already there, a new key would lock the worker out */
  if(!get('d4.tgautokey','')){const R0=await tgwRead();if(R0&&R0.ok&&!R0.state)tgwKey();else return{ok:false,reason:'the worker key isn\'t on this phone yet — restore your transfer code or connect sync first (a new key would lock the worker out)'};}
  const r=await grdTgwPush({v:1,posts:{[p.d]:tgwPayload(p)},phone:grdPhone()},'autopilot handoff '+p.d);if(r&&r.ok)set('d4.tgwlast',{ts:Date.now(),d:p.d});return r;};}
/* tgwRead: a card sealed with another key used to read as "no GitHub token here can read …", and reading with no key on the phone
   minted a fresh one (which then synced over the real one) — now each case says what it is, and no key is ever made here */
if(typeof tgwRead==='function'){tgwRead=async function(){const{repo,toks}=await tgwGh();if(!toks.length)return{ok:false,reason:'no GitHub token saved on this phone'};let why='';
  for(const token of toks){const H={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json'};
    try{const r=await fetch(`https://api.github.com/repos/${repo}/contents/${TGW_FILE}?ref=${TGW_BRANCH}&t=${Date.now()}`,{headers:H,cache:'no-store'});
      if(r.status===404)return{ok:true,state:null,sha:null,token,H,repo};
      if(r.status===401||r.status===403){why=grdMsg(r.status,'GitHub token',repo);continue;}if(!r.ok){why='HTTP '+r.status+' reading the card';continue;}
      const j=await r.json();let raw=j.content;
      if(!raw||j.encoding==='none'){const b=await fetch(`https://api.github.com/repos/${repo}/git/blobs/${j.sha}`,{headers:H,cache:'no-store'});if(!b.ok){why='HTTP '+b.status+' reading the card';continue;}raw=(await b.json()).content;}
      if(!get('d4.tgautokey',''))return{ok:false,reason:'no worker key on this phone yet — restore your transfer code or connect sync first',noKey:true};
      const txt=new TextDecoder().decode(Uint8Array.from(atob(String(raw||'').replace(/\s/g,'')),c=>c.charCodeAt(0)));
      let state;try{state=await tgwDecrypt(txt);}catch(e){return{ok:false,reason:'the card on GitHub was sealed with a different worker key than this phone has — restore your transfer code (it carries the key), or copy this phone\'s key into the AUTOPILOT_KEY secret',keyMismatch:true};}
      return{ok:true,state,sha:j.sha,token,H,repo};}catch(e){why=String(e&&e.message||e);}}
  return{ok:false,reason:why||'no GitHub token here can read '+repo};};}
async function grdBeat(force){if(typeof tgwOn!=='function'||!tgwOn()||!get('d4.tgautokey',''))return null;const last=+grdLS(GRD_BEAT)||0;if(!force&&Date.now()-last<3*36e5)return null;
  if(!(get(LS.ghtoken,'')||get(SYNC.token,'')))return null;grdPut(GRD_BEAT,String(Date.now()));
  try{return await grdTgwPush({v:1,posts:{},phone:grdPhone()},'phone check-in '+new Date().toISOString().slice(0,16));}catch(e){return{ok:false,reason:e.message||String(e)};}}
/* the worker box: say when the newest card on file isn't today's, and when the token inside it was refused */
if(typeof tgwHtml==='function'){const TH0=tgwHtml;tgwHtml=function(){let h=TH0.apply(this,arguments);try{const S=typeof TGW_STATUS!=='undefined'?TGW_STATUS:null;if(!S||!S.state||!tgwOn())return h;
    const st=S.state,ds=Object.keys(st.posts||{}).sort(),dl=ds[ds.length-1];const notes=[];
    if(dl&&dl<today())notes.push(`⚠ The worker's newest card is ${txtEsc(dl)} — today's hasn't reached it. Tap <b>Re-send today's card</b> (no bot token needed: the worker posts it).`);
    const W=st.watch||{};if(W.siteErr&&(W.siteErr.status===401||W.siteErr.status===403))notes.push(`⚠ GitHub refused the publish token inside the card (HTTP ${W.siteErr.status}) — save a working one under Public picks page, then Re-send.`);
    if(notes.length)h=h.replace(/(<div class="sub mono" style="font-size:9\.5px;margin-top:4px">)/,`<div class="sub" style="font-size:10.5px;color:var(--rust);margin-top:6px">${notes.join('<br>')}</div>$1`);}catch(e){}return h;};}

/* ── 3 · 🛟 THE VAULT ─────────────────────────────────────────────────────────────────────────────────── */
const GRD_VBR='desk-vault',GRD_WREPO=typeof TGW_WORKER_REPO!=='undefined'?TGW_WORKER_REPO:'ironsilkstrategies/ironsilk-weekly';let GRD_VBUSY=false;
function grdVaultOn(){return get('d4.vaultoff',false)!==true;}
function grdVaultLocal(){return grdJ(GRD_VMETA);}
const grdKid=()=>{const k=get('d4.tgautokey','');return k?sy3H(String(k)):'';};
function grdSnapshot(){const K=syncKts();const parts=[];let n=0;
  for(const k of lsKeys()){if(syncSkip(k))continue;const j=syncRawJson(k);if(j==null)continue;n++;parts.push(JSON.stringify(k)+':{"t":'+(+K[k]||0)+',"v":'+j+'}');}
  return{json:'{"v":1,"dev":'+JSON.stringify(syncDevice())+',"ts":'+Date.now()+',"keys":{'+parts.join(',')+'}}',keys:n};}
async function grdGz(str){const s=new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));return new Uint8Array(await new Response(s).arrayBuffer());}
async function grdGunz(u8){const s=new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));return await new Response(s).text();}
async function grdSeal(json){const gz=await grdGz(json);const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},await tgwAes(),gz);return{text:'v2g.'+tgwB64(iv)+'.'+tgwB64(ct),gz:gz.length};}
async function grdUnseal(text){const p=String(text||'').trim().split('.');if(p[0]!=='v2g'||p.length!==3)throw new Error('that isn\'t a vault file');if(!get('d4.tgautokey',''))throw new Error('the worker key isn\'t on this phone — restore your transfer code or connect sync first');
  let pt;try{pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:tgwUnb64(p[1])},await tgwAes(),tgwUnb64(p[2]));}catch(e){throw new Error('this phone\'s worker key can\'t open that vault copy (it was sealed with another key)');}
  return JSON.parse(await grdGunz(new Uint8Array(pt)));}
async function grdGh(repo,tok,path,o){o=o||{};const H={'Accept':o.raw?'application/vnd.github.raw+json':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(tok?{'Authorization':'Bearer '+tok}:{}),...(o.body?{'Content-Type':'application/json'}:{})};
  const r=await syncFetch(`https://api.github.com/repos/${repo}/${path}`,{method:o.m||'GET',headers:H,body:o.body?JSON.stringify(o.body):undefined,cache:'no-store'});
  if(!r.ok){const e=new Error('HTTP '+r.status+' ('+String(path).split('/').slice(0,2).join('/')+')');e.status=r.status;throw e;}return o.raw?r.text():r.json();}
async function grdVaultRemote(repo,tok){try{const ref=await grdGh(repo,tok,'git/ref/heads/'+GRD_VBR);const c=await grdGh(repo,tok,'git/commits/'+ref.object.sha);const t=await grdGh(repo,tok,'git/trees/'+c.tree.sha);
    const F={};(t.tree||[]).forEach(e=>{if(e.type==='blob')F[e.path]=e.sha;});let meta=null;if(F['vault.json']){try{meta=JSON.parse(await grdGh(repo,tok,'git/blobs/'+F['vault.json'],{raw:true}));}catch(e){meta=null;}}
    return{ref:ref.object.sha,files:F,meta};}catch(e){if(e.status===404||e.status===409)return{ref:null,files:{},meta:null};throw e;}}
const grdToks=()=>[...new Set([get(LS.ghtoken,''),get(SYNC.token,'')].filter(Boolean))];
/* save: everything sync keeps → gzip → AES-256-GCM (the worker key) → the site repo's desk-vault branch, one commit (no history pile-up) */
async function grdVaultSave(manual){if(!manual&&!grdVaultOn())return{ok:false,reason:'the vault is off'};
  if(typeof CompressionStream==='undefined')return{ok:false,reason:'this browser can\'t compress (iOS 16.4 or newer needed)'};
  if(typeof storeDegraded==='function'&&storeDegraded())return{ok:false,reason:'your saved history didn\'t load on this page — the vault waits so a partial copy can\'t replace a full one'};
  const repo=typeof pubRepo==='function'?pubRepo():'';const toks=grdToks();if(!repo||!toks.length)return{ok:false,reason:'no GitHub token on this phone (Settings → Public picks page)'};
  if(!get('d4.tgautokey',''))return{ok:false,reason:'no worker key on this phone yet (restore your transfer code or connect sync first)'};
  if(GRD_VBUSY)return{ok:false,reason:'already saving'};GRD_VBUSY=true;
  try{const S=grdSnapshot();if(S.keys<5)return{ok:false,reason:'this phone holds almost nothing yet — a vault copy now would be empty'};
    let tok=null,cur=null,lastErr=null;for(const t of toks){try{cur=await grdVaultRemote(repo,t);tok=t;break;}catch(e){lastErr=e;}}
    if(!tok)return{ok:false,reason:lastErr&&lastErr.status?grdMsg(lastErr.status,'GitHub token',repo):String(lastErr&&lastErr.message||lastErr)};
    const M=cur&&cur.meta,kid=grdKid();
    if(M&&M.kid&&M.kid!==kid){if(!manual)return{ok:false,reason:'the vault on GitHub was sealed with another worker key — not overwriting it automatically'};
      if(!confirm('The vault on GitHub was sealed with a DIFFERENT worker key than this phone has.\n\nSaving now replaces that copy with one only this phone\'s key can open (the 24/7 worker keeps the older days).\n\nSave anyway?'))return{ok:false,reason:'cancelled'};}
    if(M&&+M.keys>0&&S.keys<M.keys*0.6){const why=`this phone has ${S.keys} saved items, the vault has ${M.keys}`;if(!manual)return{ok:false,reason:why+' — not replacing a fuller copy automatically'};
      if(!confirm('This phone looks emptier than the vault ('+why+').\n\nReplace the vault with this phone\'s copy anyway? (The 24/7 worker keeps the older days.)'))return{ok:false,reason:'cancelled'};}
    const sealed=await grdSeal(S.json);
    const meta={v:2,ts:Date.now(),keys:S.keys,bytes:S.json.length,gz:sealed.gz,kid,build:'v'+(typeof DESK_VER!=='undefined'?DESK_VER:'?'),dev:syncDevice()};
    const b1=await grdGh(repo,tok,'git/blobs',{m:'POST',body:{content:sealed.text,encoding:'utf-8'}});
    const b2=await grdGh(repo,tok,'git/blobs',{m:'POST',body:{content:JSON.stringify(meta,null,1),encoding:'utf-8'}});
    const tr=await grdGh(repo,tok,'git/trees',{m:'POST',body:{tree:[{path:'vault.enc',mode:'100644',type:'blob',sha:b1.sha},{path:'vault.json',mode:'100644',type:'blob',sha:b2.sha}]}});
    const cm=await grdGh(repo,tok,'git/commits',{m:'POST',body:{message:'TheDesk vault · '+meta.keys+' items · '+new Date(meta.ts).toISOString(),tree:tr.sha,parents:[]}});
    if(cur&&cur.ref)await grdGh(repo,tok,'git/refs/heads/'+GRD_VBR,{m:'PATCH',body:{sha:cm.sha,force:true}});
    else await grdGh(repo,tok,'git/refs',{m:'POST',body:{ref:'refs/heads/'+GRD_VBR,sha:cm.sha}});
    grdPut(GRD_VMETA,{ts:meta.ts,keys:meta.keys,bytes:meta.bytes,gz:meta.gz,repo,kid});return{ok:true,meta};}
  catch(e){return{ok:false,reason:e&&e.status?grdMsg(e.status,'GitHub token',repo):String(e&&e.message||e)};}
  finally{GRD_VBUSY=false;try{grdVaultPaint();}catch(e){}}}
/* every copy you could restore: the site's newest, then the worker's four days */
async function grdVaultList(){const out=[];const repo=typeof pubRepo==='function'?pubRepo():'';
  for(const t of [...grdToks(),null]){try{const R=await grdVaultRemote(repo,t);if(R.meta)out.push({src:'site',repo,tok:t,sha:R.files['vault.enc'],ts:+R.meta.ts,keys:+R.meta.keys||0,kid:R.meta.kid||'',label:'Newest (site repo)'});break;}catch(e){}}
  try{const r=await fetch(`https://raw.githubusercontent.com/${GRD_WREPO}/${GRD_VBR}/vault.json?t=${Date.now()}`,{cache:'no-store'});if(r.ok){const M=await r.json();
      (M.gens||[]).forEach((g,i)=>out.push({src:'worker',repo:GRD_WREPO,file:g.file,ts:+g.ts,keys:+g.keys||0,label:i?`${g.day} (worker copy)`:`${g.day} (worker's newest)`}));}}catch(e){}
  return out.sort((a,b)=>b.ts-a.ts);}
async function grdVaultFetch(c){if(c.src==='site'){try{return await grdGh(c.repo,c.tok,'git/blobs/'+c.sha,{raw:true});}catch(e){}
    const r=await fetch(`https://raw.githubusercontent.com/${c.repo}/${GRD_VBR}/vault.enc?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status+' reading the vault');return r.text();}
  const r=await fetch(`https://raw.githubusercontent.com/${c.repo}/${GRD_VBR}/${c.file}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status+' reading the worker\'s copy');return r.text();}
/* restore = MERGE: per item the newer copy wins; lists of tickets/calls are joined by id, date maps by day — nothing on the phone is dropped */
async function grdVaultMerge(snap){if(!snap||!snap.keys||typeof snap.keys!=='object')throw new Error('the vault copy is empty');
  const L=syncSnapshot();const M=syncMerge(L,snap);const K=syncKts();const D=sy3Dirty();let n=0;const now=Date.now();SYNC_APPLY=true;
  try{for(const[k,o]of Object.entries(M.keys)){if(syncSkip(k)||!o)continue;const cur=L.keys[k];if(cur&&JSON.stringify(cur.v)===JSON.stringify(o.v))continue;_syncSetRaw(k,o.v);K[k]=Math.max(K[k]||0,o.t||0,now);D[k]=now;n++;}}
  finally{SYNC_APPLY=false;}syncSaveKts();sy3SaveDirty(D);return n;}
async function grdVaultRestore(i){const L=window.__grdVList||[];const c=L[i];if(!c){alert('Pick a copy first.');return;}
  if(!confirm(`Merge the vault copy from ${grdWhen(c.ts)} (${c.keys} items) into this phone?\n\nNothing here is deleted: for each item the newer copy wins, and tickets/calls from both are kept.`))return;
  const st=document.getElementById('grdVStat');const say=h=>{if(st)st.innerHTML=h;};say('Downloading and unsealing…');
  try{const text=await grdVaultFetch(c);const snap=await grdUnseal(text);say('Merging…');const n=await grdVaultMerge(snap);
    say(`<span style="color:var(--win)">✓ Merged ${n} item${n===1?'':'s'} from ${grdWhen(c.ts)} — reloading…</span>`);if(syncOn())try{await syncNow(false);}catch(e){}setTimeout(()=>location.reload(),1200);}
  catch(e){say(`<span style="color:var(--rust)">⚠ ${txtEsc(e.message||String(e))}</span>`);}}
/* after (re)connecting sync: if the vault is newer than the cloud copy, the hours in between are offered back */
async function grdVaultOfferNewer(cloudTs){if(!get('d4.tgautokey',''))return 0;const L=await grdVaultList();const c=L[0];if(!c||!(c.ts>(+cloudTs||0)+30*60e3))return 0;
  if(!confirm(`Your vault backup (saved ${grdWhen(c.ts)}) is newer than the cloud copy${cloudTs?` (saved ${grdWhen(cloudTs)})`:''}.\n\nMerge it in too? Nothing on this phone is deleted.`))return 0;
  try{const snap=await grdUnseal(await grdVaultFetch(c));const n=await grdVaultMerge(snap);try{deskToast('🛟 Merged '+n+' items from the vault',4000);}catch(e){}return n;}catch(e){alert('The vault copy couldn\'t be merged: '+(e.message||e));return 0;}}
/* automatic: once a day, or every 4 hours while the cloud backup isn't working — only when something changed */
async function grdVaultAuto(){try{if(!grdVaultOn()||GRD_VBUSY||document.hidden||window.__RELAY_LEAVING||(typeof DESK_EVAL_BUSY!=='undefined'&&DESK_EVAL_BUSY))return;if(typeof CompressionStream==='undefined')return;
    if(!grdToks().length||!get('d4.tgautokey',''))return;const M=grdVaultLocal();const now=Date.now();
    const syncBad=!syncOn()||!!grdAuth()||now-(+grdLS(SYNC.last)||0)>6*36e5;const due=!M||now-M.ts>(syncBad?4:20)*36e5;if(!due)return;
    const K=syncKts();let newest=0;for(const k in K){if(!syncSkip(k)&&K[k]>newest)newest=K[k];}if(M&&newest<=M.ts)return;
    const r=await grdVaultSave(false);if(!r.ok&&!/off|already/.test(r.reason||''))console.warn('vault',r.reason);}catch(e){console.warn('vault',e);}}
function grdVaultHtml(){const M=grdVaultLocal();const on=grdVaultOn();const P=grdJ(GRD_PERSIST);
  return`<div class="sbar"><h2>🛟 Vault — the second backup</h2><div class="ln"></div></div><div class="tkt" id="grdVault">
    <div class="sub" style="font-size:10.5px">Everything sync keeps, compressed and <b>encrypted</b> with your worker key, saved through your <b>publish token</b> to the site repo (branch <code>desk-vault</code>). It doesn't need the sync token, so a dead sync token can't stop it. The 24/7 worker copies it into its own repo and keeps four days. Only your worker key opens it — it rides inside your transfer code.</div>
    <div class="mono" style="font-size:10px;margin-top:6px">${M?`Last saved <b>${grdWhen(M.ts)}</b> · ${M.keys} items · ${(M.gz/1048576).toFixed(1)} MB sealed`:'Not saved from this phone yet.'} · auto ${on?'<b style="color:var(--win)">on</b> (daily; every 4 h while sync is down)':'<b style="color:var(--rust)">off</b>'}</div>
    <div class="mono" style="font-size:10px;margin-top:2px;color:var(--mute)">This browser keeps TheDesk's storage: ${P?(P.p?'<b style="color:var(--win)">yes</b> (persistent)':'asked — iOS decides; keep the vault and sync on'):'checking…'}</div>
    <div class="bar" style="margin-top:8px;flex-wrap:wrap"><button class="primary" onclick="grdVaultSaveTap(this)">🛟 Save now</button><button onclick="grdVaultListTap(this)">Restore…</button><button onclick="set('d4.vaultoff',${on});grdVaultPaint()">${on?'Turn auto off':'Turn auto on'}</button></div>
    <div id="grdVList"></div><div class="sub mono" id="grdVStat" style="font-size:10px;margin-top:6px"></div></div>`;}
async function grdVaultSaveTap(b){if(b){b.disabled=true;b.textContent='Sealing…';}const r=await grdVaultSave(true);const st=document.getElementById('grdVStat');
  if(st)st.innerHTML=r.ok?`<span style="color:var(--win)">✓ Saved ${r.meta.keys} items (${(r.meta.gz/1048576).toFixed(1)} MB sealed)</span>`:`<span style="color:var(--rust)">⚠ ${txtEsc(r.reason||'failed')}</span>`;if(b){b.disabled=false;b.textContent='🛟 Save now';}}
async function grdVaultListTap(b){const box=document.getElementById('grdVList');if(!box)return;box.innerHTML='<div class="sub mono" style="font-size:10px">Looking…</div>';
  const L=await grdVaultList();window.__grdVList=L;if(!L.length){box.innerHTML='<div class="sub" style="font-size:10.5px">No vault copies found yet.</div>';return;}
  box.innerHTML=L.map((c,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--rule)"><div class="mono" style="font-size:10px"><b>${txtEsc(c.label)}</b><br>${grdWhen(c.ts)} · ${c.keys} items</div><button onclick="grdVaultRestore(${i})">Merge in</button></div>`).join('');}
function grdVaultPaint(){const sb=document.getElementById('syncBox');if(!sb)return;let v=document.getElementById('grdVaultBox');if(!v){v=document.createElement('div');v.id='grdVaultBox';sb.parentNode.insertBefore(v,sb.nextSibling);}v.innerHTML=grdVaultHtml()+grdKeysHtml();}

/* ── 4 · KEYS: the transfer code and the missing-keys list ─────────────────────────────────────────────── */
const GRD_KEYLIST=[[LS.key,'The Odds API','https://the-odds-api.com/account/'],[LS.sharp,'SharpAPI','https://sharpapi.io/'],[LS.rundown,'TheRundown','https://therundown.io/'],[LS.oddspapi,'OddsPapi','https://oddspapi.io/'],
  [LS.cfbd,'CollegeFootballData','https://collegefootballdata.com/key'],[LS.ai,'Gemini (chat + screenshots)','https://aistudio.google.com/apikey'],['d4.tgbot','Telegram bot','https://t.me/BotFather'],[LS.ghtoken,'GitHub publish token','https://github.com/settings/personal-access-tokens'],[SYNC.token,'GitHub sync token','https://github.com/settings/personal-access-tokens']];
const grdKeyFp=()=>{let s='';(typeof MOVE_KEYS!=='undefined'?MOVE_KEYS:[]).forEach(k=>{s+=k+'='+(grdLS(k)||'')+'|';});return sy3H(s);};
function grdXferOk(){return!!(+grdLS(GRD_XFER))&&grdLS(GRD_XFP)===grdKeyFp();}
function grdXferMark(){grdPut(GRD_XFER,String(Date.now()));grdPut(GRD_XFP,grdKeyFp());try{grdRefreshBanners();}catch(e){}}
if(typeof moveCopy==='function'){const MC0=moveCopy;moveCopy=function(){const m=typeof moveCode==='function'?moveCode():null;const r=MC0.apply(this,arguments);if(m&&m.n)grdXferMark();return r;};}
/* the code as a file — the share sheet puts it in Files or a password manager (it holds every key: keep it private) */
function grdXferFile(){if(typeof moveCode!=='function')return;const m=moveCode();if(!m.n){alert('No keys saved on this device yet.');return;}
  const name='TheDesk-transfer-code-'+new Date().toISOString().slice(0,10)+'.txt';const text=m.code+'\n\nTheDesk transfer code — '+new Date().toLocaleString()+'\nOpen TheDesk → Settings → ☁️ Sync → Restore from transfer code → paste the line above.\nIt holds every API key you own: keep this file private.\n';
  try{const f=new File([text],name,{type:'text/plain'});if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:'TheDesk transfer code'}).then(()=>grdXferMark()).catch(()=>{});return;}}catch(e){}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);grdXferMark();}catch(e){alert('Couldn\'t make the file — use 🔑 Copy transfer code instead.');}}
function grdKeysHtml(){const has=k=>{const v=grdLS(k);return!!(v&&v!=='""'&&v!=='null');};const miss=GRD_KEYLIST.filter(([k])=>!has(k));const ok=grdXferOk();const t=+grdLS(GRD_XFER)||0;
  return`<div class="sbar"><h2>🔑 Keys on this phone</h2><div class="ln"></div></div><div class="tkt" id="grdKeys">
    <div class="sub" style="font-size:10.5px">API keys never go to the cloud — after a wipe only your <b>transfer code</b> brings them back. ${ok?`<span style="color:var(--win)">✓ Saved ${grdWhen(t)} and still current.</span>`:t?'<b style="color:var(--rust)">A key changed since you saved the code — save it again.</b>':'<b style="color:var(--rust)">You haven\'t saved one from this phone yet.</b>'}</div>
    <div class="bar" style="margin-top:6px;flex-wrap:wrap"><button class="primary" onclick="moveCopy()">🔑 Copy transfer code</button><button onclick="grdXferFile()">💾 Save it to Files</button></div>
    <div style="margin-top:8px">${GRD_KEYLIST.map(([k,lab,url])=>`<div class="mono" style="font-size:10px;padding:3px 0;border-top:1px solid var(--rule);display:flex;justify-content:space-between;gap:8px"><span>${has(k)?'✅':'⬜'} ${txtEsc(lab)}</span>${has(k)?'':`<a href="${url}" target="_blank" rel="noopener" style="color:var(--gold)">get it →</a>`}</div>`).join('')}</div>
    ${miss.length?`<div class="sub" style="font-size:10px;margin-top:4px">${miss.length} missing. Paste them in the boxes above (the provider pages show the same key again — no need to make new ones).</div>`:''}</div>`;}

/* ── 5 · TODAY: the banners (red when your data is exposed; amber for a nudge) ───────────────────────── */
function grdBannerHtml(){try{const out=[];const btn=(lab,js)=>` <button onclick="${js}">${lab}</button>`;const red=h=>`<div class="tkt" style="margin:6px 0;border-color:var(--rust);background:rgba(232,90,79,.08)"><div class="sub" style="font-size:11px;color:var(--rust)">${h}</div></div>`;
    const amb=h=>`<div class="sub" style="color:var(--gold);margin-top:6px;font-size:10.5px">${h}</div>`;const now=Date.now();const last=+grdLS(SYNC.last)||0;const A=grdAuth();const V=grdVaultLocal();
    const local=(get(LS.locked,[])||[]).length+Object.keys(get(LS.arc,{})||{}).length>0;
    if(syncOn()&&A)out.push(red(`🔴 <b>Cloud backups are OFF</b> since ${grdWhen(A.ts)} — ${txtEsc(A.msg)}.${V&&V.ts?` Your vault copy is from ${grdWhen(V.ts)}.`:''}${btn('Fix it','tab(\'settings\');setTimeout(()=>{const e=document.getElementById(\'syncBox\');if(e)e.scrollIntoView({behavior:\'smooth\'});},300)')}`));
    else if(syncOn()){const F=grdJ('d4.syncfail');if(F&&F.ts>last&&now-last>=2*36e5)out.push(red(`☁️ The cloud backup hasn't saved since ${last?grdWhen(last):'—'} — ${txtEsc(String(F.msg||'unknown error').slice(0,160))}${btn('↻ Sync now','syncNow(true).then(()=>{try{deskRerender();}catch(e){}})')}`));}
    else if(local)out.push(red(`☁️ <b>Cloud sync isn't connected.</b> If iOS wipes this app, everything since your last backup is gone.${btn('Connect','tab(\'settings\')')}`));
    if(grdVaultOn()&&grdToks().length&&V&&now-V.ts>48*36e5)out.push(amb(`🛟 The vault backup is ${grdAgo(V.ts)} old.${btn('Save now','grdVaultSave(true).then(r=>{try{deskToast(r.ok?\'🛟 Vault saved\':\'⚠ \'+r.reason,4000);deskRerender();}catch(e){}})')}`));
    const anyKey=GRD_KEYLIST.some(([k])=>{const v=grdLS(k);return!!(v&&v!=='""'&&v!=='null');});
    if(anyKey&&!grdXferOk())out.push(amb(`🔑 ${+grdLS(GRD_XFER)?'A key changed since you saved your transfer code':'No transfer code saved'} — it's the only thing that brings your keys back after a wipe.${btn('Copy it','moveCopy()')}${btn('Save to Files','grdXferFile()')}`));
    return out.join('');}catch(e){return null;}}
function grdRefreshBanners(){try{if(typeof deskRerender==='function')deskRerender();}catch(e){}}

/* ── 6 · BOOT ────────────────────────────────────────────────────────────────────────────────────────── */
async function grdPersist(){try{if(!navigator.storage||!navigator.storage.persist)return null;let p=await navigator.storage.persisted();if(!p)p=await navigator.storage.persist();grdPut(GRD_PERSIST,{ts:Date.now(),p:!!p});return p;}catch(e){return null;}}
if(typeof renderSyncStatus==='function'){const RSS0=renderSyncStatus;renderSyncStatus=function(){const r=RSS0.apply(this,arguments);try{const A=grdAuth();const el=document.getElementById('syncStatus');
    if(el&&A&&syncOn())el.innerHTML=`<span style="color:var(--rust)">🔴 Backups are off since ${grdWhen(A.ts)} — ${txtEsc(A.msg)}</span><br><span style="color:var(--mute)">Tap Disconnect, then paste a new token and Connect (nothing is deleted).</span>`;}catch(e){}return r;};}
if(typeof syncSettingsPaint==='function'){const SSP0=syncSettingsPaint;syncSettingsPaint=function(){const r=SSP0.apply(this,arguments);try{grdVaultPaint();}catch(e){}return r;};}
if(typeof window!=='undefined'&&!window.__NO_GUARD_LOOP__&&!(typeof SY3_RELAY!=='undefined'&&SY3_RELAY)){
  const go=()=>{grdPersist();setTimeout(()=>{try{grdVaultPaint();}catch(e){}},1500);
    setTimeout(()=>{grdBeat(false).catch(()=>{});},25e3);setTimeout(()=>{grdVaultAuto();},120e3);
    setInterval(()=>{if(document.hidden)return;grdBeat(false).catch(()=>{});grdVaultAuto();},20*60e3);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>{grdBeat(false).catch(()=>{});grdVaultAuto();},8000);});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else setTimeout(go,0);}
