const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
/* ── a fake GitHub: one repo, git data API + contents API ── */
const G={ref:null,objs:{},n:0,commits:[],publicWrites:0,log:[]};const sha=()=>'s'+(++G.n);
function gh(u,o){o=o||{};const m=(o.method||'GET').toUpperCase();u=String(u);const J=(st,b)=>Promise.resolve({ok:st<300,status:st,json:()=>Promise.resolve(b),text:()=>Promise.resolve(typeof b==='string'?b:JSON.stringify(b))});
  const auth=(o.headers||{}).Authorization||'';if(/repos\/me\/thedesk-data/.test(u)&&auth!=='Bearer github_pat_TESTTOKEN_123456789')return J(401,{});
  if(/repos\/me\/ironsilk-weekly\/contents/.test(u)&&m==='PUT'){G.publicWrites++;return J(201,{});}
  if(!/repos\/me\/thedesk-data/.test(u))return J(404,{});G.log.push(m+' '+u.replace(/.*thedesk-data\//,'').replace(/\?.*/,''));
  if(/git\/ref\/heads\/main/.test(u))return G.ref?J(200,{object:{sha:G.ref}}):J(409,{message:'Git Repository is empty.'});
  if(/contents\/thedesk-sync\.json/.test(u)&&m==='GET'){const c=G.ref&&G.objs[G.objs[G.ref].tree];return c?J(200,G.objs[c[0].sha].content):J(404,{});}
  if(/contents\/thedesk-sync\.json/.test(u)&&m==='PUT'){const b=JSON.parse(o.body);const bs=sha(),ts=sha(),cs=sha();G.objs[bs]={content:Buffer.from(b.content,'base64').toString()};G.objs[ts]=[{sha:bs}];G.objs[cs]={tree:ts,parents:[]};G.ref=cs;G.commits.push(cs);return J(201,{});}
  if(/git\/blobs/.test(u)){const b=JSON.parse(o.body);const s=sha();G.objs[s]={content:b.content};return J(201,{sha:s});}
  if(/git\/trees/.test(u)){const b=JSON.parse(o.body);const s=sha();G.objs[s]=b.tree;return J(201,{sha:s});}
  if(/git\/commits/.test(u)){const b=JSON.parse(o.body);const s=sha();G.objs[s]={tree:b.tree,parents:b.parents};G.commits.push(s);return J(201,{sha:s});}
  if(/git\/refs\/heads\/main/.test(u)&&m==='PATCH'){G.ref=JSON.parse(o.body).sha;return J(200,{});}
  return J(404,{});}
const vc=new VirtualConsole();
const mk=(dev)=>new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T19:30:00Z')+(FD.off||0)]))}static now(){return RD.parse('2026-10-10T19:30:00Z')+(FD.off||0)}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=gh;w.scrollTo=()=>{};w.alert=m=>{w.__alerts=(w.__alerts||[]).concat(m)};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');w.localStorage.setItem('d4.__dev',dev);}}).window;
const phone=mk('iPhone-test'),laptop=mk('Desktop-test');
const tick=(w,ms)=>{w.Date.off=(w.Date.off||0)+ms;};
setTimeout(async()=>{try{
  const tk=(id,extra)=>({id,date:'2026-10-10',source:'mine',legs:[{sport:'nhl',game:'A@B',pick:'B ML',price:-120}],...(extra||{})});
  phone.eval(`set(LS.locked,${JSON.stringify([tk(1),tk(2)])});set(LS.key,'SECRET-ODDS-KEY');set(LS.cfbd,'SECRET-CFBD');set(VOICES_KEY,[{id:'v1',voice:'Judge',sp:'nhl',graded:true,hit:true,units:0.8}])`);
  const conn=async(w)=>{w.document.body.insertAdjacentHTML('beforeend','<input id="syncRepoIn" value="me/thedesk-data"><input id="syncTokIn" value="github_pat_TESTTOKEN_123456789">');await w.eval('syncConnect()');w.document.getElementById('syncRepoIn').remove();w.document.getElementById('syncTokIn').remove();};
  await conn(phone);
  T('phone connects to an empty private repo and saves the first copy',!!G.ref&&G.commits.length===1);
  const stored=G.objs[G.objs[G.objs[G.ref].tree][0].sha].content;
  const payload=phone.eval(`LZString.decompressFromBase64(${JSON.stringify(stored)})`);
  T('API keys never leave the device',!/SECRET-ODDS-KEY|SECRET-CFBD|TESTTOKEN/.test(payload));
  await conn(laptop);
  T('laptop pulls the phone\'s tickets and graded history',laptop.eval('get(LS.locked,[]).map(t=>t.id).join()')==='1,2'&&laptop.eval('get(VOICES_KEY,[]).length')===1);
  T('laptop does not receive the phone\'s API keys',laptop.eval(`get(LS.key,'')`)==='');
  /* both devices change things */
  tick(laptop,60e3);laptop.eval(`set(LS.locked,get(LS.locked,[]).concat([${JSON.stringify(tk(3))}]))`);
  laptop.eval(`set(VOICES_KEY,[{id:'v1',voice:'Judge',sp:'nhl'}])`);   /* stale, ungraded copy written later */
  tick(phone,90e3);phone.eval(`delLocked(2);set(LS.locked,get(LS.locked,[]).concat([${JSON.stringify(tk(4))}]))`);
  await laptop.eval('syncNow(true)');await phone.eval('syncNow(true)');await laptop.eval('syncNow(true)');
  const ids=w=>w.eval('get(LS.locked,[]).map(t=>t.id).sort().join()');
  T('tickets made on either device end up on both',ids(phone)==='1,3,4'&&ids(laptop)==='1,3,4',ids(phone)+' | '+ids(laptop));
  T('a ticket deleted on the phone stays deleted (tombstone)',!/2/.test(ids(laptop)));
  T('a graded call never loses to a newer ungraded copy',phone.eval('get(VOICES_KEY,[])[0].graded')===true&&laptop.eval('get(VOICES_KEY,[])[0].graded')===true);
  T('repo stays one commit deep — every save is parentless',G.commits.slice(1).every(c=>G.objs[c].parents.length===0)&&G.commits.length>=3);
  /* id-keyed ledgers union */
  tick(phone,10e3);phone.eval(`set(SETTLED_KEY,{...settledAll(),ext111:{id:'ext111',won:false,legs:[]}})`);tick(laptop,20e3);laptop.eval(`set(SETTLED_KEY,{...settledAll(),ext222:{id:'ext222',won:true,legs:[]}})`);
  await phone.eval('syncNow(true)');await laptop.eval('syncNow(true)');await phone.eval('syncNow(true)');
  T('settled ledger keyed by ticket id keeps both devices\' entries',['ext111','ext222'].every(k=>phone.eval(`!!settledAll()['${k}']`)&&laptop.eval(`!!settledAll()['${k}']`)));
  /* settings: newest write wins */
  tick(phone,30e3);phone.eval(`set(LS.handle,'RuleTheWorldKid')`);await phone.eval('syncNow(true)');await laptop.eval('syncNow(true)');
  T('plain settings: newest write wins across devices',laptop.eval(`get(LS.handle,'')`)==='RuleTheWorldKid');
  const before=G.commits.length;await laptop.eval('syncNow(true)');
  T('nothing changed → nothing pushed',G.commits.length===before);
  /* bad token */
  laptop.eval(`localStorage.setItem('d4.synctoken',JSON.stringify('github_pat_WRONG_000000000000'))`);const r=await laptop.eval('syncNow(false)');
  T('a rejected token reports clearly instead of failing silently',r.ok===false&&/token rejected/.test(r.reason),r.reason);
  /* public repo no longer receives your data */
  const fresh=mk('Desktop-2');await new Promise(z=>setTimeout(z,2600));fresh.eval(`set(LS.ghrepo,'me/ironsilk-weekly');set(LS.ghtoken,'x')`);await fresh.eval('pushToGitHub(false)');
  T('old public backup path is retired (no write to the site repo)',G.publicWrites===0);
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2600);
