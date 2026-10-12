const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const {webcrypto}=require('crypto');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
/* a tiny in-memory GitHub: refs + contents with sha */
const GH={refs:{main:'aaa'},files:{}};let shaN=1;const TGapp=[];let mid=500;
const ghFetch=(u,o)=>{o=o||{};const m=o.method||'GET';const url=new URL(u);const p=url.pathname;
  const J=(s,b)=>Promise.resolve({ok:s<300,status:s,json:()=>Promise.resolve(b),text:()=>Promise.resolve(JSON.stringify(b))});
  if(/\/git\/ref\/heads\//.test(p)){const b=p.split('/heads/')[1];return GH.refs[b]?J(200,{object:{sha:GH.refs[b]}}):J(404,{});}
  if(/\/git\/refs$/.test(p)&&m==='POST'){const b=JSON.parse(o.body);GH.refs[b.ref.replace('refs/heads/','')]=b.sha;return J(201,{});}
  if(/\/contents\//.test(p)){const f=p.split('/contents/')[1];const br=url.searchParams.get('ref')||(o.body&&JSON.parse(o.body).branch)||'main';const key=br+':'+f;
    if(m==='GET')return GH.files[key]?J(200,{sha:GH.files[key].sha,content:GH.files[key].content}):J(404,{});
    const b=JSON.parse(o.body);const cur=GH.files[key];if(cur&&b.sha!==cur.sha)return J(409,{});GH.files[key]={sha:'s'+(shaN++),content:b.content};return J(200,{});}
  if(/\/repos\/[^/]+\/[^/]+$/.test(p))return J(200,{default_branch:'main'});
  return J(404,{});};
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;
  Object.defineProperty(w,'crypto',{value:webcrypto,configurable:true});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
  w.fetch=(u,o)=>{u=String(u);if(/api\.telegram\.org/.test(u)){const m=u.split('/').pop();TGapp.push({m,p:Object.fromEntries(new URLSearchParams(o.body))});return Promise.resolve({ok:true,json:()=>Promise.resolve(m==='sendMessage'?{ok:true,result:{message_id:mid++}}:{ok:true})});}
    if(/api\.github\.com/.test(u))return ghFetch(u,o);return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  w.eval(`set('d4.tgbot','123:abc');set('d4.tgchat','-1001234567890');set(LS.ghtoken,'ghp_test');set('d4.tgworker',true);
    window.subCard=()=>({d:'2026-10-11',best:[{sp:'nfl',game:'LV@KC',pick:'KC ML',price:-150,p:0.62}],top10:[{sp:'nfl',game:'LV@KC',pick:'KC ML',price:-150,p:0.62,ev:3,play:true},{sp:'nfl',game:'LV@KC',pick:'Over 44.5',price:-110,p:0.55,ev:2}],
      banker:{dec:2.5,p:0.4,legs:[{sp:'nfl',game:'LV@KC',pick:'KC ML',price:-150,p:0.62},{sp:'nfl',game:'DEN@LAC',pick:'DEN +3.5',price:-110,p:0.55}]},
      chars:[{v:'Judge',dec:3,p:0.3,legs:[{sp:'nfl',game:'LV@KC',pick:'Over 44.5',price:-110,p:0.55},{sp:'nfl',game:'NYG@WSH',pick:'WSH ML',price:-120,p:0.55},{sp:'nfl',game:'DEN@LAC',pick:'DEN +3.5',price:-110,p:0.55}]}],
      props:[{v:'Coach',sp:'nfl',player:'Travis Kelce',team:'KC',k:'rec',thr:5,cal:0.7,id:'pk1',d:'2026-10-11'}],record:null});`);
  await w.eval('subPostTelegram()');await new Promise(r=>setTimeout(r,600));
  const file=GH.files['autopilot-state:tg.enc'];T('posting hands the VIP card to the worker on its own branch (site untouched)',!!file&&!!GH.refs['autopilot-state']&&!Object.keys(GH.files).some(k=>k.startsWith('main:')));
  const raw=Buffer.from(file.content,'base64').toString('utf8');T('the handed-over card is encrypted — no pick readable in the public repo',/^v1\./.test(raw)&&!/KC ML|Kelce|Over 44/.test(raw));
  const P=w.eval(`tgPosts()['2026-10-11']`);T('the in-app autopilot stands down for that post',P.worker===true&&w.eval('tgAutoTick()')!==undefined);
  /* ── the worker (GitHub Actions) ── */
  process.env.AUTOPILOT_KEY=w.eval(`get('d4.tgautokey')`);process.env.TG_BOT_TOKEN='123:abc';process.env.GITHUB_REPOSITORY='ironsilkstrategies/ironsilk-weekly';process.env.GITHUB_TOKEN='x';
  const ESPN={};const ev=(id,a,h,as,hs,done)=>({id,date:'2026-10-11T20:00Z',status:{type:{completed:done,state:done?'post':'in'}},competitions:[{competitors:[{homeAway:'away',score:String(as),team:{abbreviation:a}},{homeAway:'home',score:String(hs),team:{abbreviation:h}}]}]});
  ESPN.board=[ev('1','LV','KC',20,27,true),ev('2','DEN','LAC',17,24,true),ev('3','NYG','WSH',10,7,false)];
  ESPN.box={boxscore:{players:[{team:{abbreviation:'KC'},statistics:[{name:'receiving',labels:['REC','YDS','AVG','TD','LONG','TGTS'],athletes:[{athlete:{displayName:'Travis Kelce'},stats:['7','88','12.6','1','25','9']}]}]}]}};
  globalThis.fetch=async u=>{u=String(u);if(/scoreboard\?dates=20261011/.test(u))return{ok:true,json:async()=>({events:ESPN.board})};if(/scoreboard/.test(u))return{ok:true,json:async()=>({events:[]})};
    if(/summary\?event=1/.test(u))return{ok:true,json:async()=>ESPN.box};return{ok:false,status:404,json:async()=>({})};};
  const Wk=await import(path.join(W,'autopilot/worker.mjs'));
  const state=await Wk.decrypt(raw);T('the worker decrypts it with the AUTOPILOT_KEY secret',state.posts['2026-10-11'].legs.length===5&&state.posts['2026-10-11'].chat==='-1001234567890',state.posts['2026-10-11'].legs.map(l=>l.label).join(' | '));
  const TGw=[];const tg=async(m,p)=>{TGw.push({m,p});return{ok:true};};
  let n=await Wk.runOnce(state,'2026-10-11',{tg});
  const ed=TGw.filter(x=>x.m==='editMessageText').map(x=>x.p.text).join('\n');const rp=TGw.filter(x=>x.m==='sendMessage');
  T('worker grades from ESPN and edits the VIP post in place',/✅ <b>KC ML<\/b>/.test(ed)&&/❌ DEN \+3\.5/.test(ed)&&/❌ <b>🏦 THE BANKER/.test(ed)&&TGw.filter(x=>x.m==='editMessageText').every(x=>x.p.chat_id==='-1001234567890'));
  const appView=w.eval(`(()=>{const st={'nfl|LV@KC|KC ML':'W','nfl|LV@KC|Over 44.5':'W','nfl|DEN@LAC|DEN +3.5':'L','nfl|KC|Travis Kelce|rec|5':'W'};return subTelegramText(subCard(),x=>st[tgLegKey(x)]?({W:'✅ ',L:'❌ ',P:'➖ '})[st[tgLegKey(x)]]:'').join('\\n');})()`);
  T('worker edited post is identical to what the app would render',ed===appView);
  T('a results reply under the post, with final scores',rp[0]&&/✅ <b>KC ML \(-150\)<\/b>/.test(rp[0].p.text)&&/LV 20–27 KC/.test(rp[0].p.text)&&/Kelce/.test(rp[0].p.text)&&rp[0].p.reply_to_message_id===state.posts['2026-10-11'].ids[0],rp[0]&&rp[0].p.text.replace(/<[^>]+>/g,'').replace(/\n/g,' | '));
  T('no recap while WSH is still playing',!rp.some(x=>/Day recap/.test(x.p.text)));
  TGw.length=0;n=await Wk.runOnce(state,'2026-10-11',{tg});T('next run: nothing new → nothing sent',TGw.length===0);
  ESPN.board[2]=ev('3','NYG','WSH',10,21,true);TGw.length=0;await Wk.runOnce(state,'2026-10-11',{tg});
  const rc=TGw.find(x=>x.m==='sendMessage'&&/Day recap/.test(x.p.text));T('everything final → one day recap',!!rc&&/Best 1: <b>1-0<\/b>/.test(rc.p.text)&&/Banker's parlay: ❌/.test(rc.p.text)&&/0 of 1 cashed/.test(rc.p.text)&&/Props: <b>1-0<\/b>/.test(rc.p.text),rc&&rc.p.text.replace(/<[^>]+>/g,'').replace(/\n/g,' | '));
  TGw.length=0;await Wk.runOnce(state,'2026-10-11',{tg});T('recap only once',TGw.length===0);
  /* a prop whose player isn't in the final box is voided, like the books */
  ESPN.box={boxscore:{players:[{team:{abbreviation:'KC'},statistics:[{name:'receiving',labels:['REC','YDS'],athletes:[{athlete:{displayName:'Xavier Worthy'},stats:['3','40']}]}]}]}};
  T('worker voids a DNP prop',await Wk.gradeProp({sp:'nfl',player:'Travis Kelce',team:'KC',stat:'rec',thr:5},'2026-10-11')==='P');
  /* app + worker writing at once never lose each other's work */
  const a={posts:{d1:{postedTs:2,st:{x:'W'},sent:{x:'W'},recap:false}}},b={posts:{d1:{postedTs:1,st:{y:'L'},sent:{},recap:true},d0:{postedTs:1}}};
  const M=Wk.mergeState(a,b),Ma=w.eval(`tgwMerge(${JSON.stringify(a)},${JSON.stringify(b)})`);
  T('merge keeps both sides grades and announcements (app and worker agree)',M.posts.d1.st.x==='W'&&M.posts.d1.st.y==='L'&&M.posts.d1.recap===true&&!!M.posts.d0&&JSON.stringify(M.posts)===JSON.stringify(Ma.posts));
  const wf=fs.readFileSync(path.join(W,'.github/workflows/tg-autopilot.yml'),'utf8');T('workflow runs every 10 minutes with the two secrets',/\*\/10 \* \* \* \*/.test(wf)&&/TG_BOT_TOKEN/.test(wf)&&/AUTOPILOT_KEY/.test(wf)&&/workflow_dispatch/.test(wf));
  T('setup box shows on the subscriber card',/24\/7 VIP worker/.test(w.eval('subCardHtml()')));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
