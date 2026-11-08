/* v2.97.0 · Nov 8: "every ticket from every character and my tickets should have a share button to send them to those
   sites and groups". One sheet behind every 📤 Share: a picture + the words → the phone's share sheet, 𝕏, Facebook,
   Telegram, copy, save — and straight into TheDesk's Telegram chats through the bot. Invented tickets, fake Telegram. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));const TG=[],OPEN=[];
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  const RD=w.Date;const OFF=RD.parse('2026-11-08T11:00:00-06:00')-RD.now();class FD extends RD{constructor(...a){if(a.length)super(...a);else super(RD.now()+OFF);}static now(){return RD.now()+OFF;}}FD.parse=RD.parse;FD.UTC=RD.UTC;w.Date=FD;
  w.fetch=(u,o)=>{u=String(u);if(/api\.telegram\.org/.test(u)){TG.push({u,p:Object.fromEntries(new URLSearchParams((o||{}).body||''))});return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({ok:true,result:{}})});}
    return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});};
  w.open=(u)=>{OPEN.push(String(u));return null;};w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;const D='2026-11-08';
  const tk={id:777,name:'Sunday early window',date:D,p:0.18,legs:[{id:'a',pick:'NO -3',game:'CLE@NO',sport:'nfl',price:-110,p:0.6,hit:true},{id:'b',pick:'SF ML',game:'SF@LAR',sport:'nfl',price:-140,p:0.6,start:'2026-11-08T21:25:00Z'},{id:'c',pick:'Over 44.5',game:'NYG@PHI',sport:'nfl',price:-105,p:0.5}]};
  E(`set(LS.locked,${J([tk])})`);
  E('tksMine(777)');const sh=w.document.getElementById('tksSheet');const card=w.document.getElementById('tksCard');
  T('your ticket: 📤 Share opens one sheet with a picture of it',!!sh&&!!card&&/Sunday early window/.test(card.textContent)&&/NO -3/.test(card.textContent)&&/SF ML/.test(card.textContent));
  T('…the parlay price from the legs\' own prices (-110 · -140 · -105 ≈ +590)',/\+5\d\d/.test(card.textContent),card.textContent.slice(0,120));
  T('…a won leg wears its ✅, an open one its start time',/✅/.test(card.textContent)&&/3:25 PM CT/.test(card.textContent));
  const text=E('tksText(TKS_CUR)');T('the words: the ticket, every leg, locked-before-the-games, and the lounge invite',/^🎫 Sunday early window · \+5\d\d/.test(text)&&/✅ NO -3 \(-110\) · 🏈 CLE@NO/.test(text)&&/▫️ SF ML \(-140\)/.test(text)&&/Talk sports with us, not just picks → https:\/\/t\.me\/TheDeskApp/.test(text),text);
  T('the share sheet offers everything: phone share, 𝕏, Facebook, Telegram, copy, save',['Share picture + words','𝕏 Post','Facebook','Telegram','Copy words','Save picture'].every(s=>sh.textContent.includes(s)));
  T('…and says plainly how Facebook groups work (the phone\'s share sheet)',/Facebook doesn't let apps post into groups/.test(sh.textContent));
  T('no bot saved, no Telegram buttons',!/STRAIGHT TO THEDESK/.test(sh.textContent));
  await E(`tksAct('x')`);T('𝕏: the post window opens with the words filled in (under 280)',OPEN.some(u=>/twitter\.com\/intent\/tweet\?text=/.test(u)&&decodeURIComponent(u.split('text=')[1]).length<=280),OPEN.slice(-1)[0]);
  await E(`tksAct('tg')`);T('Telegram: the share window opens with the ticket',OPEN.some(u=>/t\.me\/share\/url\?url=/.test(u)&&/NO%20-3/.test(u)));
  await E(`tksAct('fb')`);T('Facebook: the words copied, Facebook opened',OPEN.some(u=>/facebook\.com\/sharer/.test(u)));
  /* through the bot */
  E(`set('d4.tgbot','123:abc');set(BCAST_KEY,{pub:'@TheDeskApp',pubLounge:'-100888',vipLounge:'-100777'});tksMine(777)`);const sh2=w.document.getElementById('tksSheet');
  T('with the bot saved: straight into the free channel, the public lounge and the VIP lounge',/STRAIGHT TO THEDESK'S TELEGRAM/.test(sh2.textContent)&&/Free channel/.test(sh2.textContent)&&/Public lounge/.test(sh2.textContent)&&/VIP lounge/.test(sh2.textContent));
  await E(`tksTg('pubL',null)`);const m=TG.find(x=>x.p.chat_id==='-100888');T('…a tap posts the ticket to the public lounge, as HTML',m&&/sendMessage/.test(m.u)&&/<b>🎫 Sunday early window/.test(m.p.text)&&m.p.parse_mode==='HTML',J(m&&m.p).slice(0,200));
  /* a long ticket for 𝕏 */
  const big={title:'The Banker · Ticket A',legs:Array.from({length:14},(_,i)=>({pick:'Team '+i+' -3.5 alternate line',game:'A@B',sp:'nfl',price:-110}))};
  const xt=E(`tksXText(tksTicket(${J(big)}))`);T('a 14-leg ticket still fits 𝕏 (cut with …, the link kept)',xt.length<=280&&/…/.test(xt)&&/t\.me\/TheDeskApp/.test(xt),String(xt.length));
  /* the other tickets */
  E(`bkSheet=()=>({tix:[{name:'A',dec:4.2,games:2,legs:[{pick:'NO -3',game:'CLE@NO',sp:'nfl',price:-110},{pick:'Over 47.5',game:'NYG@DAL',sp:'nfl',price:-110}]}]});tksBank(0)`);
  T('the Banker\'s sheet: each ticket shares the same way',/The Banker · Ticket A/.test(w.document.getElementById('tksCard').textContent)&&/\+320/.test(w.document.getElementById('tksCard').textContent));
  E(`sgpData=()=>({games:[{game:'CLE@NO',sp:'nfl',chars:new Set(['Sim','Judge']),sgp:[{pick:'Olave 60+ rec yds',kind:'p',dk:-120,p:0.7},{pick:'NO -3',p:0.72,price:-110}]}],combos:[]});tksSgp('g',0)`);
  T('a Perfect SGP shares too (the prop at its DraftKings price)',/Perfect SGP · CLE@NO/.test(w.document.getElementById('tksCard').textContent)&&/-120/.test(w.document.getElementById('tksCard').textContent));
  /* the buttons are on every ticket */
  const S=fs.readFileSync(path.join(W,'shared.js'),'utf8'),B=fs.readFileSync(path.join(W,'desk-bank.js'),'utf8'),G=fs.readFileSync(path.join(W,'desk-sgp.js'),'utf8');
  T('a 📤 Share button on your tickets (pending and archived), each character\'s ticket, the builder, the Banker\'s sheet and the SGPs',(S.match(/onclick="tksMine\(/g)||[]).length===2&&/onclick="tksChar\(\)"/.test(S)&&/onclick="tksBuilt\(\)"/.test(S)&&/onclick="tksBank\(\$\{i\}\)"/.test(B)&&(G.match(/onclick="tksSgp\(/g)||[]).length===2);
  try{E('renderTickets()');}catch(e){}T('…and it shows on the tickets board',/tksMine\(777\)|tksMine\("777"\)|tksMine\(&quot;777/.test(w.document.body.innerHTML)||w.document.body.innerHTML.includes('tksMine('),'');
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
