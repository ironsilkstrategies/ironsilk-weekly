/* v3.2 · the safeguards, phone side: tokens, a refused sync token, the card without a bot token, the check-in, the vault, the transfer code */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const {webcrypto}=require('crypto');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<template id="d4s">([\s\S]*?)<\/template>/,'$1').replace(/<script src="min\/store\.js[^"]*"><\/script>\s*<script>D4_BOOT\(\);<\/script>/,'');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
/* a small GitHub: refs, contents with sha, the git data API, a repo that can be told to refuse (401) */
const GH={refs:{'ironsilkstrategies/ironsilk-weekly-site@main':'m0','ironsilkstrategies/thedesk-data@main':'m1'},files:{},blobs:{},trees:{t0:[]},commits:{m0:{tree:'t0',parents:[]},m1:{tree:'t0',parents:[],message:'TheDesk sync — iPhone-test — 2026-11-18T00:00:00.000Z'}},refuse:new Set(),n:0};const TGapp=[];
const J=(s,b,h)=>Promise.resolve({ok:s<300,status:s,headers:{get:k=>(h||{})[k.toLowerCase()]||null},json:()=>Promise.resolve(b),text:()=>Promise.resolve(typeof b==='string'?b:JSON.stringify(b))});
const ghFetch=(u,o)=>{o=o||{};const m=o.method||'GET';const url=new URL(u);const p=url.pathname;const mm=/^\/repos\/([^/]+\/[^/]+)(\/.*)?$/.exec(p);if(!mm)return J(404,{});const repo=mm[1],rest=mm[2]||'';
  const auth=(o.headers||{}).Authorization||(o.headers||{}).authorization||'';if(GH.refuse.has(repo)&&auth)return J(401,{message:'Bad credentials'});
  const key=b=>repo+'@'+b;
  if(rest==='')return J(200,{default_branch:'main',permissions:{push:true}});
  let x;if((x=/^\/git\/ref\/heads\/(.+)$/.exec(rest)))return GH.refs[key(x[1])]?J(200,{object:{sha:GH.refs[key(x[1])]}}):J(404,{});
  if(rest==='/git/refs'&&m==='POST'){const b=JSON.parse(o.body);GH.refs[key(b.ref.replace('refs/heads/',''))]=b.sha;return J(201,{});}
  if((x=/^\/git\/refs\/heads\/(.+)$/.exec(rest))&&m==='PATCH'){const b=JSON.parse(o.body);GH.refs[key(x[1])]=b.sha;return J(200,{});}
  if(rest==='/git/blobs'&&m==='POST'){const b=JSON.parse(o.body);const sha='b'+(++GH.n);GH.blobs[sha]=b.encoding==='base64'?Buffer.from(b.content,'base64').toString('utf8'):b.content;return J(201,{sha});}
  if((x=/^\/git\/blobs\/(\w+)$/.exec(rest))){const t=GH.blobs[x[1]];if(t==null)return J(404,{});const raw=/raw/.test((o.headers||{}).Accept||'');return raw?J(200,t):J(200,{sha:x[1],content:Buffer.from(t).toString('base64'),encoding:'base64'});}
  if(rest==='/git/trees'&&m==='POST'){const b=JSON.parse(o.body);const sha='t'+(++GH.n);GH.trees[sha]=b.tree;return J(201,{sha});}
  if((x=/^\/git\/trees\/(\w+)$/.exec(rest)))return GH.trees[x[1]]?J(200,{tree:GH.trees[x[1]].map(e=>({...e,type:'blob'}))}):J(404,{});
  if(rest==='/git/commits'&&m==='POST'){const b=JSON.parse(o.body);const sha='c'+(++GH.n);GH.commits[sha]=b;return J(201,{sha});}
  if((x=/^\/git\/commits\/(\w+)$/.exec(rest)))return GH.commits[x[1]]?J(200,{tree:{sha:GH.commits[x[1]].tree},parents:GH.commits[x[1]].parents||[],message:GH.commits[x[1]].message||''}):J(404,{});
  if((x=/^\/contents\/(.+)$/.exec(rest))){const f=x[1];const br=url.searchParams.get('ref')||(o.body&&JSON.parse(o.body).branch)||'main';const k=repo+'@'+br+':'+f;
    if(m==='GET')return GH.files[k]?J(200,{sha:GH.files[k].sha,content:GH.files[k].content}):J(404,{});
    const b=JSON.parse(o.body);const cur=GH.files[k];if(cur&&b.sha!==cur.sha)return J(409,{});if(!GH.refs[key(br)])GH.refs[key(br)]='seed';GH.files[k]={sha:'s'+(++GH.n),content:b.content};return J(200,{content:{sha:GH.files[k].sha}});}
  return J(404,{});};
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkstrategies.github.io/ironsilk-weekly/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;w.__NO_GUARD_LOOP__=true;
  Object.defineProperty(w,'crypto',{value:webcrypto,configurable:true});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
  w.CompressionStream=CompressionStream;w.DecompressionStream=DecompressionStream;w.Blob=Blob;w.Response=Response;
  w.fetch=(u,o)=>{u=String(u);if(/api\.telegram\.org/.test(u)){const m=u.split('/').pop();TGapp.push({m});return Promise.resolve({ok:true,json:()=>Promise.resolve({ok:true,result:{message_id:1}})});}
    if(/api\.github\.com/.test(u))return ghFetch(u,o);return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
  w.scrollTo=()=>{};w.alert=m=>{w.__alerts=(w.__alerts||[]).concat(String(m));};w.confirm=m=>{w.__confirms=(w.__confirms||[]).concat(String(m));return w.__confirmAns!==false;};w.localStorage.setItem('d4.setupDone','1');}}).window;
const E=s=>w.eval(s);
setTimeout(async()=>{try{
  /* ── tokens ── */
  T('a pasted token is cleaned of spaces, line breaks and invisible characters',E(`grdTokClean(' github_pat_ABC\\u200b_def\\n\\u00a0')`)==='github_pat_ABC_def');
  T('a token cut off when copied is called out',/cut off/.test(E(`grdTokCheck('github_pat_'+'A'.repeat(30))`)));
  T('a whole fine-grained token passes',E(`grdTokCheck('github_pat_'+'A'.repeat(82))`)==='');
  T('a 401 is explained as a dead token, not "needs permissions"',/deleted, regenerated or has expired/.test(E(`grdMsg(401)`))&&!/needs Contents/.test(E(`grdMsg(401)`)));
  /* ── a refused sync token: never kept on connect ── */
  GH.refuse.add('ironsilkstrategies/thedesk-data');
  const box=w.document.createElement('div');box.innerHTML='<input id="syncRepoIn" value="ironsilkstrategies/thedesk-data"><input id="syncTokIn" value=" github_pat_'+'Z'.repeat(82)+' ">';w.document.body.appendChild(box);
  await E('syncConnect()');T('connecting with a token GitHub refuses keeps nothing',!E('syncOn()')&&/doesn't recognize/.test((w.__alerts||[]).pop()||''));
  /* ── connected, then the token dies ── */
  E(`_syncSetRaw(SYNC.repo,'ironsilkstrategies/thedesk-data');_syncSetRaw(SYNC.token,'github_pat_${'Y'.repeat(82)}');set(LS.locked,[{id:'t1',legs:[]}]);`);
  const r1=await E('syncNow(true)');const A=E('grdAuth()');
  T('a refused token turns the "backups are OFF" state on',!r1.ok&&A&&A.status===401,JSON.stringify(A));
  const ban=E('grdBannerHtml()');T('Today shows a red banner with a Fix button',/Cloud backups are OFF/.test(ban)&&/Fix it/.test(ban));
  const n0=GH.n;const r2=await E('syncNow(false)');T('the automatic backup stops hammering a token GitHub already refused',r2&&r2.auth===true);
  E(`_syncSetRaw(SYNC.token,'github_pat_${'X'.repeat(82)}')`);T('a new token clears the red state at once',!E('grdAuth()'));
  GH.refuse.delete('ironsilkstrategies/thedesk-data');
  /* ── the card without a bot token ── */
  E(`set('d4.tgchat','-1001234567890');set(LS.ghtoken,'github_pat_${'P'.repeat(82)}');set('d4.tgworker',true);tgwKey();localStorage.removeItem('d4.tgbot');
    window.subCard=()=>({d:today(),best:[{sp:'nfl',game:'LV@KC',pick:'KC ML',price:-150,p:0.62}],top10:[],banker:null,chars:[],props:[],record:null});`);
  TGapp.length=0;const pc=await E('deskTgPostCard(false)');await new Promise(r=>setTimeout(r,300));
  const site='ironsilkstrategies/ironsilk-weekly-site';const f=GH.files[site+'@autopilot-state:tg.enc'];
  T('no bot token: the card still goes to the worker',pc&&pc.ok&&pc.byWorker&&!!f&&!TGapp.some(x=>x.m==='sendMessage'));
  const st=await E(`tgwDecrypt(${JSON.stringify(Buffer.from(f.content,'base64').toString('utf8'))})`);const p=st.posts[E('today()')];
  T('…flagged so the worker posts it itself',p&&p.needPost===true&&(p.ids||[]).length===0&&p.chat==='-1001234567890');
  T('…with the phone\'s check-in (times and yes/no, no secrets)',st.phone&&st.phone.keys.tg===false&&st.phone.keys.pub===true&&!/github_pat_|ghp_/.test(JSON.stringify(st.phone)),JSON.stringify(st.phone).slice(0,140));
  T('…and the phone won\'t post it again itself',E(`get('d4.tgposted').by`)==='worker'&&!(await E('deskTgPostCard(false)')).ok);
  /* ── the worker's progress comes back through a merge that never re-posts ── */
  const wst=JSON.parse(JSON.stringify(st));wst.posts[E('today()')].ids=[901];wst.posts[E('today()')].needPost=false;wst.posts[E('today()')].postedBy='worker';wst.watch={sent:{silent:{d:'x',ts:1}}};wst.lounge={chat:'-5',locked:1};
  const merged=E(`tgwMerge({v:1,posts:{[today()]:tgwPayload(tgPosts()[today()])}},${JSON.stringify(wst)})`);const mp=merged.posts[E('today()')];
  T('a later hand-off keeps the worker\'s message ids — never a second post',mp.ids[0]===901&&mp.needPost===false);
  T('…and keeps the robot\'s watchdog memory and the lounge',merged.watch&&merged.watch.sent.silent&&merged.lounge&&merged.lounge.chat==='-5');
  /* ── the check-in on its own ── */
  E(`localStorage.removeItem('d4.tgwbeat')`);const b1=await E('grdBeat(false)');const f2=GH.files[site+'@autopilot-state:tg.enc'];const st2=await E(`tgwDecrypt(${JSON.stringify(Buffer.from(f2.content,'base64').toString('utf8'))})`);
  T('the phone checks in with the worker on its own (every few hours)',b1&&b1.ok&&st2.phone&&st2.phone.ts>st.phone.ts&&!!st2.posts[E('today()')]);
  T('…but not again minutes later',(await E('grdBeat(false)'))===null);
  /* ── a missing or different key never mints a new one ── */
  const realKey=E(`get('d4.tgautokey')`);E(`localStorage.removeItem('d4.tgautokey')`);const nk=await E('tgwRead()');
  T('reading the worker box with no key says so — and mints no key',nk.ok===false&&nk.noKey===true&&!E(`get('d4.tgautokey','')`));
  E(`set('d4.tgautokey',${JSON.stringify(Buffer.alloc(32,9).toString('base64'))})`);const mk=await E('tgwRead()');
  T('a card sealed with another key is named as that (not "no token can read it")',mk.ok===false&&mk.keyMismatch===true);
  E(`set('d4.tgautokey',${JSON.stringify(realKey)})`);
  T('the transfer code carries the worker key',E(`MOVE_KEYS.includes('d4.tgautokey')`)&&!!E(`moveParse(moveCode().code)['d4.tgautokey']`));
  /* ── 🛟 the vault ── */
  E(`set('d4.qa',[{id:'v1',d:'2026-11-17',who:'Judge',hit:true},{id:'v2',d:'2026-11-18',who:'Scout'}]);for(let i=0;i<30;i++)set('d4.filler'+i,{i})`);
  const vs=await E('grdVaultSave(true)');const ref=GH.refs[site+'@desk-vault'];const cm=GH.commits[ref];const tree=cm&&GH.trees[cm.tree];
  T('the vault saves to the site repo\'s desk-vault branch through the publish token',vs.ok&&!!ref&&tree.some(e=>e.path==='vault.enc')&&tree.some(e=>e.path==='vault.json'),vs.reason);
  T('…as one commit (no history pile-up)',cm&&cm.parents.length===0);
  const encTxt=GH.blobs[tree.find(e=>e.path==='vault.enc').sha];const meta=JSON.parse(GH.blobs[tree.find(e=>e.path==='vault.json').sha]);
  T('…sealed: nothing readable in the public repo',/^v2g\./.test(encTxt)&&!/Judge|Scout|d4\.qa/.test(encTxt)&&meta.keys>=30&&meta.kid===E('grdKid()'));
  const back=await E(`grdUnseal(${JSON.stringify(encTxt)})`);T('…and this phone\'s key opens it again',back.keys['d4.qa']&&back.keys['d4.qa'].v.length===2);
  /* a phone that lost most of its data can't replace the vault by itself */
  E(`for(let i=0;i<30;i++)localStorage.removeItem('d4.filler'+i);localStorage.removeItem('d4.qa')`);const shrink=await E('grdVaultSave(false)');
  T('a much emptier phone never replaces the vault automatically',!shrink.ok&&/not replacing/.test(shrink.reason||''),shrink.reason);
  /* restore = merge: newer wins per item, lists joined by id */
  E(`set('d4.qa',[{id:'v3',d:'2026-11-19',who:'Coach'}])`);const n=await E(`grdVaultMerge(${JSON.stringify(back)})`);const V=E(`get('d4.qa')`);
  T('restoring merges: what the phone has now stays, what only the vault had comes back',n>0&&V.some(x=>x.id==='v3')&&V.some(x=>x.id==='v1')&&V.some(x=>x.id==='v2'),JSON.stringify(V.map(x=>x.id)));
  T('…and the merged items are queued for the next cloud backup',!!E(`sy3Dirty()['d4.qa']`));
  /* a vault sealed with another key is never overwritten automatically */
  E(`set('d4.tgautokey',${JSON.stringify(Buffer.alloc(32,3).toString('base64'))})`);for(let i=0;i<20;i++)E(`set('d4.more${i}',${i})`);
  const km=await E('grdVaultSave(false)');T('a vault sealed with another key isn\'t overwritten automatically',!km.ok&&/another worker key/.test(km.reason||''),km.reason);
  E(`set('d4.tgautokey',${JSON.stringify(realKey)})`);
  /* ── the transfer code ── */
  T('no transfer code saved: Today nudges',/No transfer code saved/.test(E('grdBannerHtml()')));
  E('moveCopy()');T('copying it clears the nudge',E('grdXferOk()')&&!/transfer code/.test(E('grdBannerHtml()')));
  E(`set(LS.key,'new-odds-key')`);T('changing a key brings the nudge back ("save it again")',!E('grdXferOk()')&&/A key changed/.test(E('grdBannerHtml()')));
  const kh=E('grdKeysHtml()');T('Settings lists every key with a link to get the missing ones',/The Odds API/.test(kh)&&/Telegram bot/.test(kh)&&/t\.me\/BotFather/.test(kh));
  T('the device-only markers never sync',['d4.syncauth','d4.tgwbeat','d4.xferSaved','d4.vaultmeta'].every(k=>E(`syncSkip('${k}')`)));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));const f=out.filter(x=>!x.startsWith('PASS')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);},1800);
