/* v2.86.0 · SYNC v3: one file per key (per day for the big ledgers), only changes travel, no full download on load */
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const LZ=require('lz-string');
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
/* ── a fake GitHub: refs, commits, flat trees, blobs, the contents API for an empty repo / the old file ── */
const G={ref:null,commits:{},trees:{},blobs:{},n:0,calls:[],tok:'Bearer github_pat_TESTTOKEN_123456789',publicRepo:false};
const id=()=>('0000000000000000000000000000000000000000'+(++G.n).toString(16)).slice(-40);
const putBlob=c=>{const s=id();G.blobs[s]=String(c);return s;};
const mkCommit=(tree,msg)=>{const s=id();G.commits[s]={tree,msg:msg||'x',date:new Date().toISOString()};return s;};
const curFiles=()=>G.ref?G.trees[G.commits[G.ref].tree]:{};
function gh(u,o){o=o||{};const m=(o.method||'GET').toUpperCase();u=String(u);
  const J=(st,b)=>Promise.resolve({ok:st<300,status:st,json:()=>Promise.resolve(b),text:()=>Promise.resolve(typeof b==='string'?b:JSON.stringify(b))});
  const auth=(o.headers||{}).Authorization||'';
  if(/repos\/me\/thedesk-data/.test(u)&&auth!==G.tok)return J(401,{});
  if(/repos\/me\/thedesk-data$/.test(u)&&m==='GET')return J(200,{private:!G.publicRepo});
  if(!/repos\/me\/thedesk-data/.test(u))return J(404,{});
  const p=u.replace(/.*thedesk-data\//,'').replace(/\?.*/,'');G.calls.push(m+' '+p);
  if(p==='git/ref/heads/main')return G.ref?J(200,{object:{sha:G.ref}}):J(409,{message:'Git Repository is empty.'});
  if(/^contents\//.test(p)&&m==='PUT'){const b=JSON.parse(o.body);const f={...curFiles()};f[p.slice(9)]=putBlob(Buffer.from(b.content,'base64').toString());const t=id();G.trees[t]=f;G.ref=mkCommit(t,b.message);return J(201,{});}
  if(/^contents\//.test(p)&&m==='GET'){const s=curFiles()[p.slice(9)];return s?J(200,G.blobs[s]):J(404,{});}
  let mm;
  if((mm=/^git\/commits\/(\w+)$/.exec(p))){const c=G.commits[mm[1]];return c?J(200,{sha:mm[1],tree:{sha:c.tree},message:c.msg,committer:{date:c.date}}):J(404,{});}
  if((mm=/^git\/trees\/(\w+)$/.exec(p))){const f=G.trees[mm[1]];if(!f)return J(404,{});const dirs=new Set();Object.keys(f).forEach(x=>{const a=x.split('/');for(let i=1;i<a.length;i++)dirs.add(a.slice(0,i).join('/'));});
    return J(200,{sha:mm[1],tree:[...[...dirs].map(d=>({path:d,type:'tree',sha:'d'})),...Object.entries(f).map(([path,sha])=>({path,type:'blob',sha}))],truncated:false});}
  if(p==='git/trees'&&m==='POST'){const b=JSON.parse(o.body);const f=b.base_tree?{...G.trees[b.base_tree]}:{};
    for(const e of b.tree){if(e.sha===null){if(!(e.path in f))return J(422,{message:'path not in tree'});delete f[e.path];}else if(e.content!=null)f[e.path]=putBlob(e.content);else f[e.path]=e.sha;}
    const t=id();G.trees[t]=f;G.lastTreePost=b.tree;return J(201,{sha:t});}
  if((mm=/^git\/blobs\/(\w+)$/.exec(p))){const c=G.blobs[mm[1]];return c==null?J(404,{}):J(200,c);}
  if(p==='git/blobs'&&m==='POST'){const b=JSON.parse(o.body);return J(201,{sha:putBlob(b.content)});}
  if(p==='git/commits'&&m==='POST'){const b=JSON.parse(o.body);return J(201,{sha:mkCommit(b.tree,b.message)});}
  if(p==='git/refs/heads/main'&&m==='PATCH'){G.ref=JSON.parse(o.body).sha;return J(200,{});}
  return J(404,{});}
const vc=new VirtualConsole();
const mk=(dev,q)=>new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html'+(q||''),pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-11-06T17:30:00Z')+(FD.off||0)]))}static now(){return RD.parse('2026-11-06T17:30:00Z')+(FD.off||0)}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=gh;w.scrollTo=()=>{};w.alert=m=>{w.__alerts=(w.__alerts||[]).concat(m)};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');w.localStorage.setItem('d4.__dev',dev);}}).window;
const tick=(w,ms)=>{w.Date.off=(w.Date.off||0)+ms;};
const conn=async(w)=>{w.document.body.insertAdjacentHTML('beforeend','<input id="syncRepoIn" value="me/thedesk-data"><input id="syncTokIn" value="github_pat_TESTTOKEN_123456789">');await w.eval('syncConnect()');w.document.getElementById('syncRepoIn').remove();w.document.getElementById('syncTokIn').remove();};
const days=['2026-11-06','2026-11-05','2026-11-04'];
const voices=()=>{const a=[];days.forEach(d=>{for(let i=0;i<220;i++)a.push({id:`nhl|G${i}@H|${d}|Sim|ml`,sp:'nhl',date:d,game:`G${i}@H`,voice:'Sim',market:'ml',side:'home',price:-120,simP:0.58,graded:d!=='2026-11-06',hit:i%2===0,f:['home','fav','divgame']});});return a;};
const tk=(n)=>({id:n,date:'2026-11-06',source:'mine',legs:[{sport:'nhl',game:'A@B',pick:'B ML',price:-120}]});
const allBlobText=()=>Object.values(curFiles()).map(s=>G.blobs[s]).join('\n');
setTimeout(async()=>{try{
  const phone=mk('iPhone-test');
  phone.eval(`set(LS.locked,${JSON.stringify([tk(1),tk(2)])});set(LS.key,'SECRET-ODDS-KEY');set(LS.cfbd,'SECRET-CFBD');set(VOICES_KEY,${JSON.stringify(voices())});set('d4.fbbox',{'401':{x:1}})`);
  await conn(phone);
  const F=curFiles();const paths=Object.keys(F);
  T('first save: one file per key, the dated ledger one file per day',paths.includes('meta.json')&&days.every(d=>paths.includes('k/'+encodeURIComponent('d4.voices')+'/a.'+d))&&paths.some(p=>p.startsWith('k/d4.locked')),paths.filter(p=>/voices|locked/.test(p)).join(','));
  T('the old single file is not written',!paths.includes('thedesk-sync.json'));
  T('API keys never leave the device',!/SECRET-ODDS-KEY|SECRET-CFBD|TESTTOKEN/.test(allBlobText()));
  T('the box-score cache stays on the device',!paths.some(p=>/fbbox/.test(p)));
  /* nothing changed: one tiny check, nothing downloaded, nothing uploaded */
  let r=await phone.eval('syncNow(false)');   /* anything the page wrote on its own since the first save */
  G.calls=[];G.lastTreePost=null;r=await phone.eval('syncNow(false)');
  T('idle sync: just the branch check',r.ok&&G.calls.every(c=>/ref\/heads\/main/.test(c))&&G.calls.length>=1,G.calls.join(' | '));
  /* one row of today's ledger changes: only today's file + meta go up */
  tick(phone,60e3);phone.eval(`const V=get(VOICES_KEY,[]);V[0].hit=true;V[0].graded=true;set(VOICES_KEY,V)`);
  G.calls=[];r=await phone.eval('syncNow(false)');const sent=(G.lastTreePost||[]).map(e=>e.path);
  const vs=sent.filter(x=>/d4\.voices/.test(x));T('a change to today uploads today\'s file only (no other day of the ledger)',r.ok&&vs.length===1&&vs[0]==='k/d4.voices/a.2026-11-06'&&sent.includes('meta.json'),sent.join(','));
  T('…and downloads no file contents (only the file list)',!G.calls.some(c=>/git\/blobs\/|contents/.test(c)),G.calls.join(' | '));
  /* a fresh laptop takes the cloud copy */
  const laptop=mk('Desktop-test');await conn(laptop);
  T('laptop pulls the phone\'s tickets',laptop.eval('get(LS.locked,[]).map(t=>t.id).join()')==='1,2');
  T('laptop pulls the whole ledger, in order',laptop.eval('JSON.stringify(get(VOICES_KEY,[]))')===phone.eval('JSON.stringify(get(VOICES_KEY,[]))'),laptop.eval('get(VOICES_KEY,[]).length')+' rows');
  T('laptop does not receive the phone\'s API keys',laptop.eval(`get(LS.key,'')`)==='');
  /* both change: laptop adds 3; phone deletes 2 and adds 4 */
  tick(laptop,90e3);laptop.eval(`set(LS.locked,get(LS.locked,[]).concat([${JSON.stringify(tk(3))}]))`);
  tick(phone,120e3);phone.eval(`delLocked(2);set(LS.locked,get(LS.locked,[]).concat([${JSON.stringify(tk(4))}]))`);
  await laptop.eval('syncNow(false)');await phone.eval('syncNow(false)');await laptop.eval('syncNow(false)');
  const ids=w=>w.eval('get(LS.locked,[]).map(t=>t.id).sort().join()');
  T('both devices end with 1,3,4 (the deletion sticks, both additions land)',ids(phone)==='1,3,4'&&ids(laptop)==='1,3,4',ids(phone)+' / '+ids(laptop));
  /* the laptop grades a row on another day; the phone pulls only that day's file */
  tick(laptop,60e3);laptop.eval(`const V=get(VOICES_KEY,[]);const x=V.find(r=>r.date==='2026-11-04');x.hit=false;x.note='laptop';set(VOICES_KEY,V)`);
  await laptop.eval('syncNow(false)');G.calls=[];await phone.eval('syncNow(false)');
  const blobGets=G.calls.filter(c=>/git\/blobs\//.test(c)).length;
  T('phone downloads only the changed day (+ meta)',blobGets===2,blobGets+' files: '+G.calls.join(' | '));
  T('…and has the laptop\'s change',phone.eval(`get(VOICES_KEY,[]).find(r=>r.date==='2026-11-04').note`)==='laptop');
  /* an old-layout cloud (one big file) + this phone: moves to the new layout WITHOUT downloading the big file */
  G.ref=null;G.trees={};G.commits={};G.blobs={};
  const legacy=LZ.compressToBase64(JSON.stringify({v:1,dev:'old',ts:1,keys:{'d4.locked':{t:1,v:[tk(9)]}}}));const ls=putBlob(legacy),lt=id();G.trees[lt]={'thedesk-sync.json':ls};G.ref=mkCommit(lt,'TheDesk sync — iPhone-old — 2026-11-05T23:01:00Z');
  phone.eval(`localStorage.removeItem('d4.sync3base')`);G.calls=[];r=await phone.eval('syncNow(false)');
  const P2=Object.keys(curFiles());
  T('old layout → new layout in one save',r.ok&&!P2.includes('thedesk-sync.json')&&P2.some(p=>p.startsWith('k/d4.voices/')),P2.length+' files');
  T('…without downloading the old 7 MB file',!G.calls.some(c=>/contents\/thedesk-sync|blobs\//.test(c)),G.calls.join(' | '));
  /* a brand-new device and an old-layout cloud: the one-time full download still works */
  G.ref=null;G.trees={};G.commits={};G.blobs={};const ls2=putBlob(legacy),lt2=id();G.trees[lt2]={'thedesk-sync.json':ls2};G.ref=mkCommit(lt2,'TheDesk sync — iPhone-old — 2026-11-05T23:01:00Z');
  const fresh=mk('Desktop-new');await conn(fresh);
  T('fresh device + old-layout cloud: pulls the old copy',fresh.eval('get(LS.locked,[]).map(t=>t.id).join()')==='9');
  T('…then saves it in the new layout',Object.keys(curFiles()).some(p=>p.startsWith('k/d4.locked/')));
  /* relay pages never sync */
  const relay=mk('iPhone-test','?chain=1&eval=1');T('master-evaluation relay pages never sync',relay.eval('SY3_RELAY')===true&&phone.eval('SY3_RELAY')===false);
  /* safety rails kept */
  phone.eval(`localStorage.setItem('d4.synctoken',JSON.stringify('github_pat_WRONG_000000000000'))`);phone.eval('SYNC_SAFE=null');r=await phone.eval('syncNow(false)');
  T('a wrong token stops sync with a reason',r.ok===false&&/token/i.test(r.reason||''),r.reason);
  phone.eval(`localStorage.setItem('d4.synctoken',JSON.stringify('github_pat_TESTTOKEN_123456789'))`);phone.eval('SYNC_SAFE=null');G.publicRepo=true;r=await phone.eval('syncNow(false)');
  T('a PUBLIC sync repo is refused',r.ok===false&&/PUBLIC/.test(r.reason||''),r.reason);G.publicRepo=false;
  phone.eval(`localStorage.setItem('d4.syncrepo',JSON.stringify('ironsilkstrategies/ironsilk-weekly'))`);phone.eval('SYNC_SAFE=null');r=await phone.eval('syncNow(false)');
  T('the app/site repo is refused as a sync target',r.ok===false&&/app\/site repo/.test(r.reason||''),r.reason);
  phone.eval(`localStorage.setItem('d4.syncrepo',JSON.stringify('me/thedesk-data'))`);phone.eval('SYNC_SAFE=null');r=await phone.eval('syncNow(false)');
  T('a private repo syncs again right away',r.ok===true,JSON.stringify(r));
  const card=phone.eval(`syncSettingsHtml()`);T('settings card still renders',/Sync across devices/.test(card));
  /* v2.98.3 · Nov 13: a backup stuck "busy" made Sync now do nothing, silently */
  phone.eval('SYNC_BUSY=new Promise(()=>{});SYNC_BUSY_AT=Date.now()-5*60e3;SYNC_SAFE=null');r=await phone.eval('syncNow(true)');
  T('a backup stuck for 4+ minutes is dropped and Sync now runs a fresh one',r&&r.ok===true&&phone.eval('SYNC_BUSY')===null,JSON.stringify(r));
  /* v2.98.4 · a dropped connection mid-backup is tried again instead of failing the whole save */
  { let drops=2;const real=phone.fetch;phone.fetch=(u,o)=>{if(drops>0&&/\/git\/(trees|commits)/.test(String(u))&&o&&o.method==='POST'){drops--;return Promise.reject(new TypeError('Load failed'));}return real(u,o);};
    phone.eval(`set('d4.locked',get('d4.locked',[]).concat([{id:'drop-test',sp:'nhl',game:'A@B',pick:'A ML'}]))`);phone.eval('SYNC_SAFE=null');r=await phone.eval('syncNow(true)');phone.fetch=real;
    T('a dropped connection ("Load failed") during the upload is retried and the backup still saves',r&&r.ok===true&&drops===0,JSON.stringify(r)+' drops left '+drops); }
  phone.eval('window.__busy=new Promise(()=>{});SYNC_BUSY=window.__busy;SYNC_BUSY_AT=Date.now()-5e3');phone.eval('syncNow(true)');await new Promise(r=>setTimeout(r,300));const same=phone.eval('SYNC_BUSY===window.__busy');
  T('…a backup that is genuinely running is left alone (Sync now says so instead of starting a second)',same===true);phone.eval('SYNC_BUSY=null');
}catch(e){T('crashed',false,e.stack);}
console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);},2500);
