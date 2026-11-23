/* v3.5.5 · Nov 23: the cloud backup hadn't saved since 1 AM — "Load failed". Ten hours of changes had to go up over 5G while the app
   went to the background every few minutes; every try started from zero and none finished. Now a backup that drops mid-way picks up
   where it left off: the tree GitHub already took is kept, the next try (on the same cloud copy) skips every file it already holds.
   The fake GitHub is sync1106's. */
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

const DAYS=Array.from({length:8},(_,i)=>new Date(Date.parse('2026-11-06T12:00:00Z')-i*864e5).toISOString().slice(0,10));
const ledger=tag=>{const a=[];DAYS.forEach(d=>{for(let i=0;i<900;i++)a.push({id:`nhl|G${i}@H|${d}|Sim|ml`,sp:'nhl',date:d,game:`G${i}@H`,voice:'Sim',market:'ml',side:i%2?'home':'away',price:-120-i%40,simP:0.58,graded:true,hit:(i+tag.length)%3===0,note:tag+' '+'x'.repeat(260),f:['home','fav','divgame']});});return a;};
const treePosts=w=>{const real=w.fetch,log=[];w.fetch=(u,o)=>{if(/\/git\/trees$/.test(String(u))&&o&&o.method==='POST'){try{log.push(JSON.parse(o.body).tree.map(e=>e.path+(e.sha===null?' ✕':'')));}catch(e){}}return real(u,o);};return{log,undo:()=>{w.fetch=real;}};};
const dropAfter=(w,k)=>{const real=w.fetch;let n=0;w.fetch=(u,o)=>{if(/\/git\/trees$/.test(String(u))&&o&&o.method==='POST'){n++;if(n>k)return Promise.reject(new TypeError('Load failed'));}return real(u,o);};return{n:()=>n,undo:()=>{w.fetch=real;}};};
const V=w=>w.eval('JSON.stringify(get(VOICES_KEY,[]))');
setTimeout(async()=>{try{
  const phone=mk('iPhone-test');
  phone.eval(`set(LS.locked,[]);set(VOICES_KEY,${JSON.stringify(ledger('v1'))})`);
  await conn(phone);const first=G.ref;
  T('the first save goes up: eight days of the ledger, a file a day', !!first&&DAYS.every(d=>Object.keys(curFiles()).includes('k/d4.voices/a.'+d)));
  /* ten hours of changes: every day of the ledger graded again */
  tick(phone,36e6);phone.eval(`set(VOICES_KEY,${JSON.stringify(ledger('v2'))})`);
  let D=dropAfter(phone,2);let r=await phone.eval('syncNow(false)');D.undo();
  const ck=JSON.parse(phone.localStorage.getItem('d4.sync3ck')||'null');const state=phone.eval('JSON.stringify(SYNC_STATE)');
  T('the connection drops on the third upload (all three tries): nothing is committed, the cloud copy is untouched, the error says "Load failed", how big the upload was and that what is up is kept', r&&r.ok===false&&G.ref===first&&/Load failed — an upload dropped \(\d+\.\d MB\); \d+ files are already up and kept, the next try carries on/.test(state)&&D.n()>=5, JSON.stringify(r)+' '+state+' uploads tried '+D.n());
  T('…but what GitHub took is kept: the tree the first two uploads built, and the files it holds', !!ck&&ck.ref===first&&!!ck.tree&&ck.done.length>=2&&ck.done.every(([p,h])=>/^k\//.test(p)&&h&&h!=='∅'), JSON.stringify(ck&&{ref:ck.ref,tree:ck.tree,done:ck.done.map(x=>x[0])}));
  /* the next try: the connection holds */
  tick(phone,60e3);const P=treePosts(phone);r=await phone.eval('syncNow(false)');P.undo();
  const again=P.log.flat().filter(p=>/d4\.voices/.test(p)&&ck.done.some(([q])=>q===p));   /* (a file the page rewrote since, like its own counters, goes again: that's new content) */
  T('the next try picks up where it left off: none of the ledger days already up goes again, and the backup saves', ck.done.filter(([q])=>/d4\.voices/.test(q)).length>=2&&r&&r.ok===true&&again.length===0&&G.ref!==first&&!phone.localStorage.getItem('d4.sync3ck'), JSON.stringify(r)+' resent: '+again.join(',')+' | uploads: '+JSON.stringify(P.log));
  const laptop=mk('Desktop-test');await conn(laptop);
  T('…and the cloud copy holds every change: a fresh device pulls the whole ledger exactly as the phone has it', V(laptop)===V(phone)&&JSON.parse(V(laptop)).every(x=>/^v2 /.test(x.note)), JSON.parse(V(laptop)).length+' rows');
  /* another device saves while the phone's half-done upload waits: the phone drops it, pulls, and saves fresh */
  tick(phone,60e3);phone.eval(`const L=get(VOICES_KEY,[]);L.forEach((x,i)=>{if(i%2===0)x.note='v3 phone '+'y'.repeat(200);});set(VOICES_KEY,L)`);
  D=dropAfter(phone,1);r=await phone.eval('syncNow(false)');D.undo();const ck2=JSON.parse(phone.localStorage.getItem('d4.sync3ck')||'null');
  tick(laptop,90e3);laptop.eval(`set(LS.locked,[${JSON.stringify({id:7,date:'2026-11-06',source:'mine',legs:[{sport:'nhl',game:'A@B',pick:'B ML',price:-120}]})}])`);await laptop.eval('syncNow(false)');
  tick(phone,60e3);r=await phone.eval('syncNow(false)');if(!(r&&r.ok))r=await phone.eval('syncNow(false)');
  T('another device saved in between: the half-done upload is dropped (it was built on the old copy), the phone pulls the other device\'s change and saves its own', !!ck2&&r&&r.ok===true&&!phone.localStorage.getItem('d4.sync3ck')&&phone.eval('get(LS.locked,[]).map(t=>t.id).join()')==='7', JSON.stringify(r)+' locked '+phone.eval('get(LS.locked,[]).map(t=>t.id).join()'));
  await laptop.eval('syncNow(false)');
  T('…and both end with both changes (the laptop\'s ticket, the phone\'s ledger)', V(laptop)===V(phone)&&laptop.eval('get(LS.locked,[]).map(t=>t.id).join()')==='7'&&JSON.parse(V(laptop)).filter(x=>/^v3 phone/.test(x.note)).length===JSON.parse(V(phone)).length/2);
  /* a day that leaves the ledger between two tries leaves the cloud too (the kept tree had it) */
  tick(phone,60e3);phone.eval(`const L=get(VOICES_KEY,[]);L.forEach(x=>{x.note='v4 '+'z'.repeat(250);});set(VOICES_KEY,L)`);
  D=dropAfter(phone,3);r=await phone.eval('syncNow(false)');D.undo();const ck3=JSON.parse(phone.localStorage.getItem('d4.sync3ck')||'null');
  const gone=DAYS[DAYS.length-1];phone.eval(`set(VOICES_KEY,get(VOICES_KEY,[]).filter(x=>x.date!=='${gone}'))`);tick(phone,60e3);
  r=await phone.eval('syncNow(false)');
  T('a day that left the ledger between two tries leaves the cloud as well; everything else is there once', !!ck3&&r&&r.ok===true&&!Object.keys(curFiles()).includes('k/d4.voices/a.'+gone)&&DAYS.slice(0,-1).every(d=>Object.keys(curFiles()).includes('k/d4.voices/a.'+d)), Object.keys(curFiles()).filter(p=>/voices/.test(p)).join(','));
  const fresh=mk('Desktop-new');await conn(fresh);
  T('…a fresh device pulls it exactly as the phone has it', V(fresh)===V(phone), JSON.parse(V(fresh)).length+' / '+JSON.parse(V(phone)).length);
  /* a brand-new day an earlier try already put up, gone from the ledger before the next try: it doesn't land in the cloud */
  tick(phone,60e3);phone.eval(`const L=get(VOICES_KEY,[]);for(let i=0;i<900;i++)L.push({id:'nhl|N'+i+'@H|2026-11-07|Sim|ml',sp:'nhl',date:'2026-11-07',game:'N'+i+'@H',voice:'Sim',market:'ml',side:'home',price:-110,simP:0.55,graded:false,hit:null,note:'new '+'n'.repeat(1100),f:[]});L.forEach(x=>{if(x.date==='2026-11-06'||x.date==='2026-11-05')x.note='v6 '+'w'.repeat(600);});set(VOICES_KEY,L)`);
  {const real=phone.fetch;phone.fetch=(u,o)=>{if(/\/git\/trees$/.test(String(u))&&o&&o.method==='POST'&&/meta\.json/.test(o.body||''))return Promise.reject(new TypeError('Load failed'));return real(u,o);};D={undo:()=>{phone.fetch=real;}};}   /* the last upload (the one that carries meta.json) drops */
  r=await phone.eval('syncNow(false)');D.undo();const ck5=JSON.parse(phone.localStorage.getItem('d4.sync3ck')||'null');
  phone.eval(`set(VOICES_KEY,get(VOICES_KEY,[]).filter(x=>x.date!=='2026-11-07'))`);tick(phone,60e3);r=await phone.eval('syncNow(false)');
  T('a brand-new day an earlier try already put up, gone from the ledger before the next try, doesn\'t land in the cloud (the kept tree had it; it\'s taken out again)', !!ck5&&ck5.done.some(([q])=>q==='k/d4.voices/a.2026-11-07')&&r&&r.ok===true&&!Object.keys(curFiles()).includes('k/d4.voices/a.2026-11-07'), JSON.stringify(ck5&&ck5.done.map(x=>x[0]))+' | '+Object.keys(curFiles()).filter(p=>/voices/.test(p)).join(','));
  /* a kept upload more than a day old is not used */
  tick(phone,60e3);phone.eval(`const L=get(VOICES_KEY,[]);L[0].note='v5';set(VOICES_KEY,L)`);D=dropAfter(phone,0);await phone.eval('syncNow(false)');D.undo();
  const ck4=JSON.parse(phone.localStorage.getItem('d4.sync3ck')||'null');
  if(ck4){ck4.ts=Date.now()-25*36e5;ck4.done=[['k/d4.voices/a.'+DAYS[0],'bogus']];phone.localStorage.setItem('d4.sync3ck',JSON.stringify(ck4));}
  r=await phone.eval('syncNow(false)');
  T('a kept upload more than a day old is set aside: the try starts from the cloud copy', r&&r.ok===true&&!phone.localStorage.getItem('d4.sync3ck')&&(await (async()=>{const f2=mk('Desktop-3');await conn(f2);return V(f2)===V(phone);})()));
  T('the kept upload never travels to the cloud itself', !Object.keys(curFiles()).some(p=>/sync3ck/.test(p)));
}catch(e){T('crashed',false,e.stack);}
console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(f?1:0);},2500);
