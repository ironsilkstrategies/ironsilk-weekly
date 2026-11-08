/* v2.97 · the autopilot mirrors every public post to TheDesk's Facebook page (unlocks, results, the public recap, cashed
   tickets) with the lounge invite, plus one lounge invite a day — never anything before Telegram has it, never VIP
   content, and only with FB_PAGE_ID + FB_PAGE_TOKEN set. Invented card, fake Graph API, no network. */
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
process.env.AUTOPILOT_KEY='k';process.env.TG_BOT_TOKEN='t';delete process.env.FB_PAGE_ID;delete process.env.FB_PAGE_TOKEN;
const Wk=await import('/home/claude/work/autopilot/worker.mjs');
const u0=Date.parse('2026-11-08T17:30:00Z');   /* 11:30 AM CT: the 12:00 game unlocks */
const legs=[{k:'nfl|CLE@NO|NO -3',kind:'Best 3',n:1,label:'NO -3',sp:'nfl',game:'CLE@NO',price:-110,start:'2026-11-08T18:00:00Z',unlockAt:u0},
  {k:'nfl|SF@LAR|SF ML',kind:'Best 3',n:2,label:'SF ML',sp:'nfl',game:'SF@LAR',price:-140,start:'2026-11-08T21:25:00Z',unlockAt:Date.parse('2026-11-08T20:55:00Z')}];
const mk=()=>({d:'2026-11-08',chat:'-100555',legs:legs.map(l=>({k:l.k,label:l.label,price:l.price})),st:{},sent:{},bc:{pub:'@TheDeskApp',pubLounge:'-100888',vipLounge:'-100777'},pub:{legs,day:'Sun, Nov 8'}});
const FB=[];const fetchFB=async(u,o)=>{FB.push({u,body:Object.fromEntries(new URLSearchParams(o.body))});return{ok:true,status:200,json:async()=>({id:'1_2'})};};
const fb={page:'123456',tok:'SECRET-PAGE-TOKEN',v:'v24.0'};const WT=[];const tg=async(m,q)=>{WT.push(q);return{ok:true};};
/* off without the page's keys */
let p=mk();await Wk.runPublic(p,{tg,now:u0+60e3,fetch:fetchFB});
T('no keys, no Facebook: the public channel still gets the unlock, the page gets nothing',WT.some(q=>/UNLOCKED/.test(q.text))&&FB.length===0&&!Wk.fbOn());
/* on */
p=mk();WT.length=0;await Wk.runPublic(p,{tg,now:u0-60e3,fetch:fetchFB,fb});T('nothing before the unlock — on Telegram or the page',WT.length===0&&FB.length===0);
await Wk.runPublic(p,{tg,now:u0+60e3,fetch:fetchFB,fb});const f1=FB[0];
T('at the unlock the page gets the same post, to the page\'s feed, with its token',FB.length===1&&/graph\.facebook\.com\/v24\.0\/123456\/feed/.test(f1.u)&&f1.body.access_token==='SECRET-PAGE-TOKEN',f1&&f1.u);
T('…in plain text (no Telegram HTML), only the unlocked pick (SF ML stays locked)',/UNLOCKED — TheDesk · Sun, Nov 8/.test(f1.body.message)&&/NO -3/.test(f1.body.message)&&!/SF ML/.test(f1.body.message)&&!/<b>|<i>/.test(f1.body.message),f1&&f1.body.message.slice(0,200));
T('…with the invite: we talk sports in the free lounge, not just picks',/We talk sports in TheDesk's free Telegram lounge… not just picks\. Pull up → https:\/\/t\.me\/TheDeskApp/.test(f1.body.message));
await Wk.runPublic(p,{tg,now:u0+120e3,fetch:fetchFB,fb});T('…once',FB.length===1);
p.st[legs[0].k]='W';await Wk.runPublic(p,{tg,now:u0+3*36e5,fetch:fetchFB,fb});T('a graded public pick goes to the page as a result',FB.length===2&&/Results/.test(FB[1].body.message)&&/✅/.test(FB[1].body.message),FB[1]&&FB[1].body.message.slice(0,120));
/* Telegram misses: the page waits, so both retry together */
const p2=mk();const FB2=FB.length;await Wk.runPublic(p2,{tg:async()=>null,now:u0+60e3,fetch:fetchFB,fb});T('if Telegram misses, the page waits too (both retry next pass — no orphan posts)',FB.length===FB2&&!p2.sent['unlock|'+legs[0].k]);
/* no public Telegram chat at all: the page alone */
const p3=mk();p3.bc={vipLounge:'-100777'};const n3=FB.length;await Wk.runPublic(p3,{tg,now:u0+60e3,fetch:fetchFB,fb});T('with no public Telegram chat set, the page still gets the unlock (and it\'s marked sent)',FB.length===n3+1&&p3.sent['unlock|'+legs[0].k]===1);
/* cashed tickets */
const p4=mk();p4.st={[legs[0].k]:'W',[legs[1].k]:'W'};p4.recapPlan={day:'Sun, Nov 8',banker:{keys:legs.map(l=>l.k)}};p4.recap=true;
Object.values(p4.pub.legs).forEach(l=>{p4.sent['unlock|'+l.k]=1;p4.sent['pres|'+l.k]='W';});p4.sent.precap=1;const st={posts:{'2026-11-08':p4}};const n4=FB.length;
await Wk.runOnce(st,'2026-11-08',{tg,now:u0+6*36e5,fetch:fetchFB,fb,gradePick:async()=>null,gradeProp:async()=>null});
T('a cashed ticket goes to the page once it\'s over',FB.slice(n4).some(x=>/CASH/i.test(x.body.message)),FB.slice(n4).map(x=>x.body.message.slice(0,60)).join(' | '));
const n5=FB.length;await Wk.runOnce(st,'2026-11-08',{tg,now:u0+7*36e5,fetch:fetchFB,fb,gradePick:async()=>null,gradeProp:async()=>null});T('…once',FB.length===n5);
/* the daily lounge invite */
const st6={posts:{'2026-11-08':mk()}};const n6=FB.length;
await Wk.fbInvite(st6,{now:Date.parse('2026-11-08T14:00:00Z'),fetch:fetchFB,fb});T('no lounge invite before 10 AM Central',FB.length===n6);
await Wk.fbInvite(st6,{now:Date.parse('2026-11-08T16:30:00Z'),fetch:fetchFB,fb,lounge:'https://t.me/+lounge'});const iv=FB[FB.length-1];
T('one invite a day after 10 — talk sports, not just picks — with the lounge link (no doubled footer)',FB.length===n6+1&&/https:\/\/t\.me\/\+lounge/.test(iv.body.message)&&(iv.body.message.match(/t\.me/g)||[]).length===1&&/sports|picks/i.test(iv.body.message),iv.body.message);
await Wk.fbInvite(st6,{now:Date.parse('2026-11-08T20:30:00Z'),fetch:fetchFB,fb});T('…once a day',FB.length===n6+1);
T('no card handed over that day → no invite',(await Wk.fbInvite({posts:{}},{now:Date.parse('2026-11-08T16:30:00Z'),fetch:fetchFB,fb}))===0);
/* the token never leaks into a log line */
const L=[];const ol=console.log;console.log=(...a)=>L.push(a.join(' '));await Wk.fbPost('x',{fb,fetch:async()=>({ok:false,status:400,json:async()=>({error:{message:'Invalid token SECRET-PAGE-TOKEN expired'}})})});console.log=ol;
T('a Facebook error is logged without the token',L.some(x=>/facebook: 400/.test(x))&&!L.some(x=>x.includes('SECRET-PAGE-TOKEN')),L.join(' | '));
const wf=(await import('fs')).readFileSync('/home/claude/work/.github/workflows/tg-autopilot.yml','utf8');
T('the public workflow only names the secrets — no key in the file',/FB_PAGE_TOKEN: \$\{\{ secrets\.FB_PAGE_TOKEN \}\}/.test(wf)&&!/EAA[A-Za-z0-9]{10}/.test(wf));
console.log(pass+' pass / '+fail+' fail');
