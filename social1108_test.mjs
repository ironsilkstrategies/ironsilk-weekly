/* v2.98 · the Social Desk: every public post the autopilot makes goes out as a TheDesk picture card — Telegram (the picture
   with the words as its caption), the Facebook page (a photo post), Instagram (the same picture from Facebook's public copy)
   and Threads — and the daily lounge invite too. Only after Telegram has it, only outlets whose keys are set, tokens never
   in a log line. Real card renderer, invented card, fake Telegram / Graph / Threads APIs, no network. */
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
process.env.AUTOPILOT_KEY='k';process.env.TG_BOT_TOKEN='t';for(const k of ['FB_PAGE_ID','FB_PAGE_TOKEN','IG_USER_ID','IG_TOKEN','IG_KINDS','THREADS_TOKEN','THREADS_USER_ID'])delete process.env[k];
const Wk=await import('/home/claude/work/autopilot/worker.mjs');const S=await import('/home/claude/work/autopilot/social.mjs');
const fs=await import('fs');
/* ── the card ── */
const png=b=>b&&b[0]===0x89&&b.slice(1,4).toString()==='PNG',jpg=b=>b&&b[0]===0xFF&&b[1]===0xD8;const dims=b=>[b.readUInt32BE(16),b.readUInt32BE(20)];
const six=['The Simulator — Chiefs ML','The Dog — Jets +7','The Brain — Bucks −3','Most common — U 47.5','The Oracle — Over 9','The Coach — Duke −6'].map((label,i)=>({label,meta:'−110',res:'WLWPWW'[i]}));
const img=await S.renderCard({kicker:'Cashed · Sun, Nov 8',title:'🎭 The Simulator (props)',big:{value:'+264',label:'6-leg parlay · +2.64u'},rows:six});
T('a card renders: a 1080×1350 PNG for Telegram and a JPEG for Facebook/Instagram',png(img&&img.png)&&jpg(img&&img.jpg)&&dims(img.png).join('x')==='1080x1350',img&&dims(img.png).join('x'));
T('the card\'s fonts are Latin only: emoji dropped, arrows become a dot',S.txt('🎉 CASHED — 🎭 The Simulator')==='CASHED — The Simulator'&&S.txt('Pull up → t.me/x')==='Pull up · t.me/x');
const L6=S.layout({title:'x',big:{value:'1'},rows:six}),L12=S.layout({title:'x',big:{value:'1'},rows:[...six,...six]}),L2=S.layout({title:'x',rows:six.slice(0,2)});
T('rows fit by measure: 2 rows roomy, 6 under a big number go tight, 12 show what fits + "N more"',L2.dens==='normal'&&L6.dens==='tight'&&L6.rows.length===6&&L12.more>0&&L12.rows.length+L12.more===12,[L2.dens,L6.dens,L6.rows.length,L12.rows.length,L12.more].join(' '));
/* ── fakes ── */
const CALLS=[];const ent=b=>b instanceof FormData?Object.fromEntries([...b.entries()].map(([k,v])=>[k,typeof v==='string'?v:{file:v.type,size:v.size}])):Object.fromEntries(new URLSearchParams(b||''));
const ok=j=>({ok:true,status:200,json:async()=>j});
const fetchAll=async(u,o={})=>{u=String(u);const c={u,m:o.method||'GET',b:ent(o.body)};CALLS.push(c);
  if(/\/photos$/.test(u))return ok({id:'PH1',post_id:'1_2'});if(/\/PH1\?fields=images/.test(u))return ok({images:[{source:'https://scontent.xx.fbcdn.net/v/t39/PH1_n.jpg?oh=abc',width:1080}]});
  if(/\/feed$/.test(u))return ok({id:'1_3'});if(/\/1784\/media$/.test(u))return ok({id:'C1'});if(/\/C1\?fields=status_code/.test(u))return ok({status_code:'FINISHED'});if(/media_publish$/.test(u))return ok({id:'M1'});
  if(/threads\.net\/v1\.0\/me\/threads$/.test(u))return ok({id:'T1'});if(/\/T1\?fields=status/.test(u))return ok({status:'FINISHED'});if(/threads_publish$/.test(u))return ok({id:'TP1'});
  if(/refresh_access_token/.test(u))return ok({access_token:'TH-NEW-TOKEN',expires_in:5184000});return{ok:false,status:404,json:async()=>({error:{message:'unknown '+u}})};};
const fb={page:'123456',tok:'SECRET-PAGE-TOKEN',v:'v24.0'},ig={user:'1784',tok:'SECRET-PAGE-TOKEN',v:'v24.0',kinds:''},th={user:'me',tok:'TH-SECRET-TOKEN'};
const PH=[];const tgPhoto=async(chat,im,cap)=>{PH.push({chat,im,cap});return true;};const WT=[];const tg=async(m,q)=>{WT.push({m,...q});return{ok:true};};
const render=c=>S.renderCard(c);const wait=async()=>{};
const u0=Date.parse('2026-11-08T17:30:00Z');
const legs=[{k:'nfl|CLE@NO|NO -3',kind:'Best 3',n:1,label:'NO -3',sp:'nfl',game:'CLE@NO',price:-110,start:'2026-11-08T18:00:00Z',unlockAt:u0},
  {k:'nfl|SF@LAR|SF ML',kind:'Best 3',n:2,label:'SF ML',sp:'nfl',game:'SF@LAR',price:-140,start:'2026-11-08T21:25:00Z',unlockAt:Date.parse('2026-11-08T20:55:00Z')}];
const mk=()=>({d:'2026-11-08',chat:'-100555',legs:legs.map(l=>({k:l.k,label:l.label,price:l.price})),st:{},sent:{},bc:{pub:'@TheDeskApp',pubLounge:'-100888',vipLounge:'-100777'},pub:{legs,day:'Sun, Nov 8'}});
const D={tg,tgPhoto,render,fetch:fetchAll,fb,ig,th,wait};
/* ── an unlock: picture everywhere ── */
let p=mk();await Wk.runPublic(p,{...D,now:u0+60e3});
T('the unlock goes to the public channel and lounge as a picture card, the words as its caption',PH.length===2&&PH.every(x=>png(x.im.png)&&/UNLOCKED — TheDesk · Sun, Nov 8/.test(x.cap)&&/NO -3/.test(x.cap))&&PH.map(x=>x.chat).join()==='@TheDeskApp,-100888'&&!WT.length,PH.map(x=>x.chat).join());
const fbp=CALLS.find(c=>/\/123456\/photos$/.test(c.u));
T('Facebook gets a photo post: the JPEG plus the words (plain text, pointing at the public app)',fbp&&fbp.b.source&&fbp.b.source.file==='image/jpeg'&&fbp.b.source.size>20000&&/UNLOCKED/.test(fbp.b.message)&&!/<b>/.test(fbp.b.message)&&/→ https:\/\/ironsilkweekly\.com\/desk\//.test(fbp.b.message)&&!/TheDeskLounge/.test(fbp.b.message)&&fbp.b.access_token==='SECRET-PAGE-TOKEN',fbp&&JSON.stringify(fbp.b).slice(0,200));
const igc=CALLS.find(c=>/\/1784\/media$/.test(c.u)),igp=CALLS.find(c=>/\/1784\/media_publish$/.test(c.u));
T('Instagram gets the same picture from Facebook\'s public copy, then publishes it',igc&&igc.b.image_url==='https://scontent.xx.fbcdn.net/v/t39/PH1_n.jpg?oh=abc'&&/UNLOCKED/.test(igc.b.caption)&&/#TheDesk/.test(igc.b.caption)&&igp&&igp.b.creation_id==='C1',igc&&JSON.stringify(igc.b).slice(0,160));
const thc=CALLS.find(c=>/threads\.net\/v1\.0\/me\/threads$/.test(c.u)),thp=CALLS.find(c=>/threads_publish$/.test(c.u));
T('Threads gets the picture and the words (within 500 characters), then publishes',thc&&thc.b.media_type==='IMAGE'&&thc.b.image_url===igc.b.image_url&&thc.b.text.length<=500&&/UNLOCKED/.test(thc.b.text)&&/ironsilkweekly\.com\/desk/.test(thc.b.text)&&!/TheDeskLounge/.test(thc.b.text)&&thp&&thp.b.creation_id==='T1'&&thc.b.access_token==='TH-SECRET-TOKEN',thc&&thc.b.text);
T('…only the unlocked pick (SF ML stays locked everywhere)',![fbp.b.message,igc.b.caption,thc.b.text,...PH.map(x=>x.cap)].some(x=>/SF ML/.test(x)));
let n=CALLS.length,np=PH.length;await Wk.runPublic(p,{...D,now:u0+120e3});T('…once',CALLS.length===n&&PH.length===np);
/* ── a result: Instagram skips by default (it's in the recap), Threads and Facebook get it ── */
p.st[legs[0].k]='W';n=CALLS.length;await Wk.runPublic(p,{...D,now:u0+3*36e5});const R=CALLS.slice(n);
T('a result: picture on Telegram + Facebook + Threads; Instagram waits for the recap (IG_KINDS unset)',PH.length===np+2&&/Results/.test(PH[PH.length-1].cap)&&R.some(c=>/\/photos$/.test(c.u))&&R.some(c=>/me\/threads$/.test(c.u))&&!R.some(c=>/1784\/media/.test(c.u)),R.map(c=>c.u.replace(/\?.*/,'')).join(' | '));
const p1=mk();p1.st[legs[0].k]='W';p1.sent['unlock|'+legs[0].k]=1;n=CALLS.length;await Wk.runPublic(p1,{...D,ig:{...ig,kinds:'all'},now:u0+3*36e5});
T('IG_KINDS=all: Instagram gets every result too',CALLS.slice(n).some(c=>/1784\/media_publish$/.test(c.u)));
/* ── the recap card ── */
p.st[legs[1].k]='L';PH.length=0;await Wk.runPublic(p,{...D,now:u0+9*36e5});
T('the public recap goes out as a picture (and Instagram takes it)',PH.some(x=>/Public recap/.test(x.cap))&&CALLS.slice(-12).some(c=>/1784\/media_publish$/.test(c.u)),PH.map(x=>x.cap.slice(0,30)).join(' | '));
/* ── Telegram misses: nobody else gets it ── */
const p2=mk();n=CALLS.length;await Wk.runPublic(p2,{...D,tgPhoto:async()=>false,tg:async()=>null,now:u0+60e3});
T('if Telegram misses (picture and words), no other outlet gets it — all retry next pass',CALLS.length===n&&!p2.sent['unlock|'+legs[0].k]);
/* ── no picture (renderer missing): words, exactly as before ── */
const p3=mk();WT.length=0;n=CALLS.length;await Wk.runPublic(p3,{...D,render:async()=>null,now:u0+60e3});
T('no picture → the words go out as before (Telegram text, Facebook text post; Threads text; Instagram needs a picture so skips)',WT.length===2&&/UNLOCKED/.test(WT[0].text)&&CALLS.slice(n).some(c=>/\/feed$/.test(c.u))&&CALLS.slice(n).some(c=>/me\/threads$/.test(c.u)&&c.b.media_type==='TEXT')&&!CALLS.slice(n).some(c=>/1784/.test(c.u)));
/* ── Facebook off: Threads goes text-only, Instagram can't (it needs Facebook's copy) ── */
const p4=mk();n=CALLS.length;await Wk.runPublic(p4,{...D,fb:{page:'',tok:''},now:u0+60e3});
T('Facebook off: Threads posts the words alone, Instagram sits out',CALLS.slice(n).some(c=>/me\/threads$/.test(c.u)&&c.b.media_type==='TEXT')&&!CALLS.slice(n).some(c=>/graph\.facebook/.test(c.u)));
/* ── a cashed ticket: the picture to the VIP channel, the lounges, the public channel and every outlet, once ── */
const p5=mk();p5.st={[legs[0].k]:'W',[legs[1].k]:'W'};p5.recapPlan={day:'Sun, Nov 8',chars:[{name:'The Simulator (props)',keys:legs.map(l=>l.k),price:'+150'}]};p5.recap=true;
legs.forEach(l=>{p5.sent['unlock|'+l.k]=1;p5.sent['pres|'+l.k]='W';});p5.sent.precap=1;const st5={posts:{'2026-11-08':p5}};PH.length=0;n=CALLS.length;
await Wk.runOnce(st5,'2026-11-08',{...D,now:u0+6*36e5,gradePick:async()=>null,gradeProp:async()=>null});const cs=Object.keys(p5.sent).filter(k=>/^cash\|/.test(k));
T('a cash: the picture to the VIP channel, the VIP lounge, the public channel and its lounge',PH.length===4&&PH.every(x=>/CASHED/.test(x.cap)&&png(x.im.png))&&PH.map(x=>x.chat).join()==='-100555,-100777,@TheDeskApp,-100888',PH.map(x=>x.chat).join());
T('…and to Facebook, Instagram and Threads, each marked',CALLS.slice(n).some(c=>/\/photos$/.test(c.u))&&CALLS.slice(n).some(c=>/media_publish$/.test(c.u))&&CALLS.slice(n).some(c=>/threads_publish$/.test(c.u))&&['fb','ig','th'].every(o=>cs.some(k=>k.endsWith('|'+o))),cs.join(' '));
const cc=Wk.cashCard(p5,{who:['🎭 The Simulator (props)'],keys:legs.map(l=>l.k)});T('the cash card carries the price, the units and every leg graded',cc.big.value==='+227'&&/2-leg parlay · \+2\.27u/.test(cc.big.label)&&cc.rows.length===2&&cc.rows.every(r=>r.res==='W'),JSON.stringify(cc.big));
n=CALLS.length;await Wk.runOnce(st5,'2026-11-08',{...D,now:u0+7*36e5,gradePick:async()=>null,gradeProp:async()=>null});T('…once',CALLS.length===n&&PH.length===4);
/* ── v3.1.3 · the lounge easter egg: a picture to every outlet and the free channel, once that day ── */
const st6={posts:{'2026-11-08':mk()}};n=CALLS.length;const np6=PH.length;await Wk.fbInvite(st6,{...D,eggDue:()=>true,now:Date.parse('2026-11-08T16:30:00Z')});const I=CALLS.slice(n);
T('the easter egg: a picture on Facebook, Instagram and Threads (one link each, no app footer)',I.some(c=>/\/photos$/.test(c.u)&&(c.b.message.match(/t\.me/g)||[]).length===1)&&I.some(c=>/media_publish$/.test(c.u))&&I.some(c=>/me\/threads$/.test(c.u)&&(c.b.text.match(/t\.me/g)||[]).length===1),I.map(c=>c.u.replace(/\?.*/,'')).join(' | '));
T('…and the free channel gets it too, not the lounge it points to',PH.slice(np6).map(x=>x.chat).join()==='@TheDeskApp'&&/t\.me/.test(PH[PH.length-1].cap),PH.slice(np6).map(x=>x.chat).join());
n=CALLS.length;const np7=PH.length;await Wk.fbInvite(st6,{...D,eggDue:()=>true,now:Date.parse('2026-11-08T20:30:00Z')});T('…once a day',CALLS.length===n&&PH.length===np7);
/* ── a long post: the picture with its headline, then the words ── */
const TGC=[];const fT=async(u,o)=>{TGC.push({u:String(u),b:ent(o.body)});return ok({ok:true,result:{}});};
await S.tgPhoto('BOT-TOKEN','@c',img,'<b>Headline</b>\n'+'x'.repeat(1200),{fetch:fT});
T('a post longer than a caption: the picture with its first line, then the full words',TGC.length===2&&/sendPhoto$/.test(TGC[0].u)&&TGC[0].b.caption==='<b>Headline</b>'&&TGC[0].b.photo.file==='image/png'&&/sendMessage$/.test(TGC[1].u)&&TGC[1].b.text.length>1200);
/* ── Facebook refuses the picture: the words still post ── */
const FBX=[];const noPhoto=async(u,o={})=>{u=String(u);FBX.push(u);return /\/photos$/.test(u)?{ok:false,status:403,json:async()=>({error:{message:'(#200) permission'}})}:fetchAll(u,o);};
const fx=await S.fbSend('<b>UNLOCKED</b> x',img,{fb,fetch:noPhoto});T('if Facebook refuses the picture, the words still post to the page',fx&&fx.ok&&FBX.some(u=>/\/photos$/.test(u))&&FBX.some(u=>/\/feed$/.test(u)),FBX.join(' | '));
/* ── tokens never show ── */
const LG=[];const ol=console.log;console.log=(...a)=>LG.push(a.join(' '));const bad=async(u)=>({ok:false,status:400,json:async()=>({error:{message:'Invalid OAuth access token SECRET-PAGE-TOKEN / TH-SECRET-TOKEN / BOT-TOKEN'}})});
await S.fbSend('x',img,{fb,fetch:bad});await S.igSend('x','https://e/x.jpg',{ig,fetch:bad,wait});await S.thSend('x',null,{th,fetch:bad,wait});await S.tgPhoto('BOT-TOKEN','@c',img,'x',{fetch:bad});console.log=ol;
T('errors from Facebook, Instagram, Threads and Telegram are logged without any token',LG.length>=4&&!LG.some(x=>/SECRET-PAGE-TOKEN|TH-SECRET-TOKEN|BOT-TOKEN/.test(x)),LG.join(' | '));
/* ── the Threads token: seeded from the secret, refreshed weekly, kept by the worker ── */
const M={};const t0=Date.parse('2026-11-08T12:00:00Z');n=CALLS.length;
let ch=await S.thRefresh(M,{thSeed:'TH-SECRET-TOKEN',now:t0,fetch:fetchAll});
T('Threads: the secret seeds the worker\'s memory and is refreshed at once (60 more days)',ch&&M.thTok==='TH-NEW-TOKEN'&&M.thAt===t0&&M.seed===S.seedOf('TH-SECRET-TOKEN')&&!JSON.stringify(M).includes('TH-SECRET-TOKEN'),JSON.stringify(M).slice(0,120));
ch=await S.thRefresh(M,{thSeed:'TH-SECRET-TOKEN',now:t0+3*864e5,fetch:fetchAll});T('…not again for a week',ch===false&&CALLS.length===n+1);
ch=await S.thRefresh(M,{thSeed:'TH-SECRET-TOKEN',now:t0+8*864e5,fetch:bad});T('…a refused refresh tries again tomorrow and keeps the token',ch===true&&M.thTok==='TH-NEW-TOKEN'&&M.thAt===t0+2*864e5);
ch=await S.thRefresh(M,{thSeed:'TH-BRAND-NEW',now:t0+8*864e5,fetch:fetchAll});T('a new THREADS_TOKEN secret takes over from the stored one',ch&&M.seed===S.seedOf('TH-BRAND-NEW')&&M.thTok==='TH-NEW-TOKEN'&&M.thAt===t0+8*864e5);
S.useSocial({});
/* ── wiring ── */
const wf=fs.readFileSync('/home/claude/work/.github/workflows/tg-autopilot.yml','utf8'),gi=fs.readFileSync('/home/claude/work/.gitignore','utf8'),wk=fs.readFileSync('/home/claude/work/autopilot/worker.mjs','utf8');
T('the workflow installs the renderer and only names the new secrets — no key in the file',/npm ci --prefix autopilot/.test(wf)&&/IG_USER_ID: \$\{\{ secrets\.IG_USER_ID \}\}/.test(wf)&&/THREADS_TOKEN: \$\{\{ secrets\.THREADS_TOKEN \}\}/.test(wf)&&/IG_KINDS: \$\{\{ vars\.IG_KINDS \}\}/.test(wf)&&!/EAA[A-Za-z0-9]{10}|THAA[A-Za-z0-9]{10}/.test(wf));
T('node_modules never commits',/^node_modules\/$/m.test(gi));
T('the Threads memory lives in its own file on this repo\'s state branch — never in the card or the site\'s copy',/const SOCFILE = 'social\.enc'/.test(wk)&&/repos\/\$\{REPO\}\/contents\/\$\{SOCFILE\}/.test(wk)&&!/SITE[^\n]*SOCFILE/.test(wk));
console.log(pass+' pass / '+fail+' fail');
