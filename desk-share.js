/* ═══ SHARE ANY TICKET (v2.97.0) ═══════════════════════════════════════════════════════════════════════════════════
   Loaded on every sport page after desk-score.js.

   Nov 8, 1:47 PM: "every ticket from every character and my tickets should have a share button to send them to those
   sites and groups as well."

   One sheet behind every 📤 Share button — your tickets, each character's builder ticket, the general builder, the
   Banker's master sheet, the Perfect SGPs. It shows a picture of the ticket and the words, then:
     · your phone's share sheet, picture and words together — X, Facebook (your page or a group), Messenger, Telegram,
       WhatsApp, Instagram… whatever's on the phone (Facebook doesn't let any app post into groups on its own)
     · 𝕏 and Telegram with the words filled in, Facebook with the words copied, copy, save the picture
     · straight into TheDesk's Telegram — the free channel, the public lounge, the VIP lounge and channel — through your
       bot, the same way the broadcast composer does
   No lock: anything can be shared any time (your call, Nov 8). */

const TKS_SP={nfl:'🏈',ncaaf:'🏟',nba:'🏀',ncaab:'🏀',nhl:'🏒',mlb:'⚾'};
let TKS_CUR=null;
const tksDec=pr=>{pr=+pr;if(!isFinite(pr)||Math.abs(pr)<100)return null;return pr>0?1+pr/100:1+100/(-pr);};
const tksAm=d=>d==null||!isFinite(d)||d<=1?'':d>=2?'+'+Math.round((d-1)*100).toLocaleString():'-'+Math.round(100/(d-1));
const tksSgn=pr=>pr==null||!isFinite(+pr)||Math.abs(+pr)<100?'':(+pr>0?'+':'')+Math.round(+pr);
const tksLounge=()=>(typeof THEDESK_SOCIAL!=='undefined'&&THEDESK_SOCIAL.tg)||'https://t.me/TheDeskApp';
const tksTime=t=>{const x=Date.parse(t||'');if(!isFinite(x))return'';try{return new Date(x).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})+' CT';}catch(e){return'';}};
/* a leg in any shape → {pick, game, sp, price, start, res} */
function tksLeg(l,d){const sp=l.sp||l.sport||'';let res=l.res||null;
  if(!res&&l.hit===true)res='W';else if(!res&&l.hit===false)res='L';else if(!res&&l.push)res='P';
  if(!res&&typeof gradeLeg==='function'&&l.game&&l.pick){try{const r=gradeLeg({...l,sport:sp},d);if(r&&!r.live){if(r.push)res='P';else if(r.hit===true)res='W';else if(r.hit===false)res='L';}}catch(e){}}
  let start=l.start||'';if(!start&&typeof legStartOf==='function'){try{start=legStartOf({...l,sport:sp},d)||'';}catch(e){}}
  const pr=l.kind==='p'&&l.dk!=null?l.dk:l.price;return{pick:String(l.pick||l.label||''),game:String(l.game||l._g||''),sp,price:pr!=null&&isFinite(+pr)?+pr:null,start,res};}
function tksTicket(o){const legs=o.legs.map(l=>tksLeg(l,o.date||today()));const decs=legs.map(l=>tksDec(l.price));const all=decs.every(x=>x);
  const res=legs.some(l=>l.res==='L')?'L':legs.length&&legs.every(l=>l.res==='W'||l.res==='P')&&legs.some(l=>l.res==='W')?'W':null;
  return{title:o.title,who:o.who||'',date:o.date||today(),legs,price:o.price||(all&&legs.length>1?tksAm(decs.reduce((a,b)=>a*b,1)):legs.length===1?tksSgn(legs[0].price):''),res,sub:o.sub||''};}
/* the words */
function tksText(T){const mk=r=>r==='W'?'✅':r==='L'?'❌':r==='P'?'➖':'▫️';
  const L=T.legs.map(l=>`${mk(l.res)} ${l.pick}${l.price!=null?' ('+tksSgn(l.price)+')':''}${l.game?' · '+(TKS_SP[l.sp]||'')+(TKS_SP[l.sp]?' ':'')+l.game:''}${!l.res&&l.start?' · '+tksTime(l.start):''}`);
  return[`🎫 ${T.title}${T.price?' · '+T.price:''}${T.res==='W'?' · ✅ CASHED':''}`,...L,'','TheDesk… every pick locked before the games, graded at the final.',`💬 Talk sports with us, not just picks → ${tksLounge()}`].join('\n');}
function tksXText(T){const head=`🎫 ${T.title}${T.price?' '+T.price:''}${T.res==='W'?' ✅ CASHED':''}`;const tail=`\n→ ${tksLounge()}`;let body='';
  for(const l of T.legs){const ln=`\n${l.res==='W'?'✅':l.res==='L'?'❌':'•'} ${l.pick}`;if((head+body+ln+tail).length>270){body+='\n…';break;}body+=ln;}return head+body+tail;}
/* the picture */
function tksCardHtml(T){const e=typeof txtEsc==='function'?txtEsc:(x=>String(x));const mk=r=>r==='W'?'<span style="color:#3ddc84">✅</span>':r==='L'?'<span style="color:#ff6b5b">❌</span>':r==='P'?'➖':'<span style="color:#7d8aa0">▫️</span>';
  return`<div id="tksCard" style="background:#0B0F14;border:1px solid #2a3442;border-left:4px solid #c9a227;border-radius:14px;padding:14px 14px 10px;color:#e8edf3;font-family:'IBM Plex Sans',system-ui,sans-serif">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><div style="font-weight:900;font-size:16px">${e(T.title)}</div><div style="font-weight:900;font-size:18px;color:#f2c94c;font-family:'Archivo',sans-serif">${e(T.price||'')}</div></div>
    ${T.sub?`<div style="font:500 10.5px/1.3 'IBM Plex Mono',monospace;color:#7d8aa0;margin-top:2px">${e(T.sub)}</div>`:''}
    <div style="margin-top:8px">${T.legs.map(l=>`<div style="display:flex;gap:8px;align-items:baseline;padding:4px 0;border-top:1px solid #1c2430"><span style="width:18px">${mk(l.res)}</span>
      <span style="flex:1"><b>${e(l.pick)}</b>${l.price!=null?` <span style="font:600 11px 'IBM Plex Mono',monospace;color:#f2c94c">${tksSgn(l.price)}</span>`:''}<br><span style="font:500 10px 'IBM Plex Mono',monospace;color:#7d8aa0">${TKS_SP[l.sp]||''} ${e(l.game)}${!l.res&&l.start?' · '+tksTime(l.start):''}</span></span></div>`).join('')}</div>
    ${T.res==='W'?`<div style="margin-top:6px;font-weight:900;color:#3ddc84;letter-spacing:.06em">✅ CASHED</div>`:''}
    <div style="display:flex;justify-content:space-between;margin-top:8px;font:600 9.5px 'IBM Plex Mono',monospace;color:#7d8aa0"><span>THEDESK${T.who?' · '+e(T.who).toUpperCase():''}</span><span>${e(new Date(T.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}))} · locked before the games</span></div></div>`;}
async function tksPng(){const el=document.getElementById('tksCard');if(!el||typeof html2canvas==='undefined')return null;try{const c=await html2canvas(el,{backgroundColor:'#0B0F14',scale:2,useCORS:true});const b=await new Promise(r=>c.toBlob(r,'image/png',1));return b?new File([b],'thedesk-ticket.png',{type:'image/png'}):null;}catch(e){return null;}}
async function tksCopy(t){try{if(typeof shCopy==='function')return await shCopy(t);if(navigator.clipboard){await navigator.clipboard.writeText(t);return true;}}catch(e){}return false;}
const tksToast=(m,ms)=>{try{deskToast(m,ms||1800);}catch(e){}};
/* the sheet */
function tkShare(o){const T=tksTicket(o);TKS_CUR=T;let ov=document.getElementById('tksSheet');if(ov)ov.remove();
  ov=document.createElement('div');ov.id='tksSheet';ov.className='desk-modal';ov.style.zIndex='1600';ov.onclick=ev=>{if(ev.target===ov)ov.remove();};
  const B=typeof bcCfg==='function'?bcCfg():{};const bot=!!String((typeof get==='function'&&get('d4.tgbot',''))||'').trim();const vipCh=typeof get==='function'?get('d4.tgchat',''):'';
  const tg=[['pub','📣 Free channel',B.pub],['pubL','💬 Public lounge',B.pubLounge],['vipL','💎 VIP lounge',B.vipLounge],['vip','💎 VIP channel',vipCh]].filter(x=>x[2]);
  ov.innerHTML=`<div class="desk-sheet" style="max-height:90vh;overflow-y:auto"><h3 style="margin:0 0 8px">📤 Share this ticket</h3>${tksCardHtml(T)}
    <div class="bar" style="margin-top:10px;flex-wrap:wrap;gap:6px"><button class="primary" id="tksNative" onclick="tksAct('native')">📤 Share picture + words…</button></div>
    <div class="bar" style="flex-wrap:wrap;gap:6px"><button onclick="tksAct('x')">𝕏 Post</button><button onclick="tksAct('fb')">📘 Facebook</button><button onclick="tksAct('tg')">✈️ Telegram</button><button onclick="tksAct('copy')">📋 Copy words</button><button onclick="tksAct('save')">⬇️ Save picture</button></div>
    ${bot&&tg.length?`<div class="mono" style="font-size:10px;color:var(--gold);letter-spacing:.06em;margin:10px 0 4px">STRAIGHT TO THEDESK'S TELEGRAM</div><div class="bar" style="flex-wrap:wrap;gap:6px">${tg.map(x=>`<button onclick="tksTg('${x[0]}',this)">${x[1]}</button>`).join('')}</div>`:''}
    <div class="sub" style="font-size:10px;margin-top:8px">Facebook page or group: tap “Share picture + words…” and pick Facebook — Facebook doesn't let apps post into groups on their own. Your page also gets every public pick, result and cash automatically once its key is set.</div>
    <div class="bar" style="margin-top:8px"><button onclick="document.getElementById('tksSheet').remove()">Close</button></div></div>`;
  document.body.appendChild(ov);return T;}
async function tksAct(how){const T=TKS_CUR;if(!T)return;const text=tksText(T);
  if(how==='x'){try{window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(tksXText(T)),'_blank','noopener');}catch(e){}return;}
  if(how==='tg'){try{window.open('https://t.me/share/url?url='+encodeURIComponent(tksLounge())+'&text='+encodeURIComponent(text.replace(/\n💬[^\n]*$/,'')),'_blank','noopener');}catch(e){}return;}
  if(how==='fb'){const ok=await tksCopy(text);tksToast(ok?'Words copied — paste them into the Facebook post':'Copy the words first',2800);try{window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(typeof PUB_URL!=='undefined'?PUB_URL:tksLounge()),'_blank','noopener');}catch(e){}return;}
  if(how==='copy'){const ok=await tksCopy(text);tksToast(ok?'📋 Copied':'Couldn\'t copy on this device');return;}
  const btn=document.getElementById('tksNative');const orig=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.textContent='Rendering…';}
  try{const f=await tksPng();
    if(how==='native'){if(f&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text,title:T.title});return;}
      if(navigator.share){await navigator.share({text,title:T.title});return;}const ok=await tksCopy(text);tksToast(ok?'Words copied — this device has no share sheet':'No share sheet here',2600);return;}
    if(how==='save'){if(!f){tksToast('The picture renderer didn\'t load');return;}const u=URL.createObjectURL(f);const a=document.createElement('a');a.href=u;a.download='thedesk-ticket.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}}
  catch(e){}finally{if(btn){btn.disabled=false;btn.textContent=orig;}}}
/* through your bot, as HTML, into the chats you've set up */
async function tksTg(to,btn){const T=TKS_CUR;if(!T||typeof tgApi!=='function')return;const B=typeof bcCfg==='function'?bcCfg():{};const c=to==='pub'?B.pub:to==='pubL'?B.pubLounge:to==='vipL'?B.vipLounge:get('d4.tgchat','');if(!c)return;
  const e=typeof txtEsc==='function'?txtEsc:(x=>String(x));const html=`<b>${e(tksText(T).split('\n')[0])}</b>\n`+e(tksText(T).split('\n').slice(1).join('\n'));
  if(btn){btn.disabled=true;}try{const j=await tgApi('sendMessage',{chat_id:c,text:html,parse_mode:'HTML',disable_web_page_preview:'true'});const ok=j&&j.ok!==false;tksToast(ok?'✓ Posted':'Telegram didn\'t take it — check the bot is in that chat',2400);if(btn&&ok)btn.textContent='✓ '+btn.textContent;}
  catch(e){tksToast('Telegram didn\'t take it',2000);}finally{if(btn)btn.disabled=false;}}

/* ── every ticket's button ─────────────────────────────────────────────────────────────────────────────────────── */
function tksMine(id){const t=(get(LS.locked,[])||[]).find(x=>String(x.id)===String(id));if(!t)return;
  return tkShare({title:t.name||'My ticket',date:String(t.date||today()).slice(0,10),legs:t.legs||[],sub:`${(t.legs||[]).length} legs${t.p?` · ${(t.p*100).toFixed(t.p<.01?2:1)}% to cash`:''}`});}
function tksChar(){if(typeof cbPool!=='function')return;const pool=cbPool(CB_V);const sel=pool.filter(x=>(CB_SEL||[]).includes(x.k));if(!sel.length)return;
  const who=CB_V==='__roll'?'Roll Call':(typeof charName==='function'?charName(CB_V):CB_V);
  return tkShare({title:`${who}'s ${sel.length}-leg ticket`,who,legs:sel.map(x=>({pick:x.pick,game:x.game,sp:x.sp,price:x.price,start:x.start})),sub:`${(sel.reduce((a,x)=>a*x.p,1)*100).toFixed(1)}% to cash`});}
function tksBuilt(){if(typeof LAST_COMBO==='undefined'||!LAST_COMBO.length)return;return tkShare({title:`Built ticket · ${LAST_COMBO.length} legs`,legs:LAST_COMBO.map(l=>({pick:l.pick,game:l.game,sp:l.sport||l.sp||(typeof SPORT!=='undefined'?SPORT:''),price:l.price,start:l.start})),sub:`${(LAST_COMBO.reduce((a,l)=>a*l.p,1)*100).toFixed(1)}% to cash`});}
function tksBank(i){if(typeof bkSheet!=='function')return;const t=bkSheet().tix[i];if(!t)return;return tkShare({title:`🏦 The Banker · Ticket ${t.name}`,who:'The Banker',price:typeof decimalToAmerican==='function'?decimalToAmerican(t.dec):'',legs:t.legs,sub:`${t.legs.length} legs · ${t.games} games`});}
function tksSgp(kind,i){if(typeof sgpData!=='function')return;const D=sgpData();
  if(kind==='g'){const G=D.games[i];if(!G)return;return tkShare({title:`🎯 Perfect SGP · ${G.game}`,legs:G.sgp.map(x=>({...x,game:G.game,sp:G.sp})),sub:`${G.sgp.length} legs · ${G.chars.size} characters on this game`});}
  const C=D.combos[i];if(!C)return;return tkShare({title:`🎯 Perfect SGP stack · ${C.games.length} games`,legs:C.legs.map(x=>({...x,game:x._g,sp:(C.games.find(g=>g.game===x._g)||{}).sp})),sub:`${C.legs.length} legs`});}
