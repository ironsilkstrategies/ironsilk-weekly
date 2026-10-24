/* ═══ THE TICKET EVALUATOR (v2.48) — community tickets, read by the whole desk ═══════════════
   Loaded on every sport page after desk-feeds.js. Tickets tab → 🧾 Evaluate a ticket.
   Paste any ticket (one leg per line: "JAX ML", "Chiefs -3.5", "Over 44.5 KC@DEN", "1H BUF +2.5"…).
   Each leg is matched to the desk's own calls on that game and side (today and the next days);
   every character says agree / disagree with its confidence, the Sim's chance and the market's
   price set the leg's chance, and the ticket gets a verdict: its real chance to cash, its price
   if given, the legs to keep and the legs to cut. Nothing is saved or posted — a read only. */

const EV_SPS=['nfl','ncaaf','nba','ncaab','nhl','mlb'];
function evTeams(line){const out=[];const words=String(line).replace(/[^A-Za-z0-9 .&'-]/g,' ').split(/\s+/).filter(Boolean);
  EV_SPS.forEach(sp=>{for(let n=3;n>=1;n--)for(let i=0;i+n<=words.length;i++){const w=words.slice(i,i+n).join(' ');if(/^\d|^(ml|over|under|o|u|1h|2h|half|spread|game|vs|at)$/i.test(w))continue;
    let ab=null;try{ab=intakeAbbr(sp,w);}catch(e){}if(ab&&!out.some(x=>x.sp===sp&&x.ab===ab))out.push({sp,ab});}});return out;}
function evParseLeg(line){const s=String(line).trim();if(!s)return null;const L={raw:s,half:/\b(1h|1st half|first half)\b/i.test(s)};
  const pr=s.match(/(?:^|\s)\(?([+-]\d{3,4})\)?(?:\s|$)/);L.price=pr?+pr[1]:null;
  const ou=s.match(/\b(over|under|o|u)\s*(\d+(?:\.\d)?)/i);if(ou){L.m='total';L.sd=/^o/i.test(ou[1])?'over':'under';L.line=+ou[2];}
  else if(/\bml\b|moneyline|to win/i.test(s)){L.m='ml';}
  else{const sp=s.replace(/\(?[+-]\d{3,4}\)?/g,' ').match(/(?:^|\s)([+-]\d{1,2}(?:\.5)?|pk|pick'?em)(?:\s|$)/i);if(sp){L.m='spread';L.line=/pk|pick/i.test(sp[1])?0:+sp[1];}else L.m='ml';}
  L.teams=evTeams(s.replace(/\b(over|under|ml|moneyline)\b/ig,' '));return L;}
/* the desk's calls on a leg: same game, market and side, today or ahead */
function evMatch(L){const V=roGet(VOICES_KEY,[],30e3)||[];const from=dayShift(today(),-1);const c=V.filter(x=>x&&CHARS[x.voice]&&String(x.date).slice(0,10)>=from&&x.market===L.m&&!x.graded);
  for(const t of L.teams){const hits=c.filter(x=>x.sp===t.sp&&String(x.game).split('@').includes(t.ab));if(!hits.length)continue;
    const game=hits[0].game,d=String(hits[0].date).slice(0,10);let sd=L.sd;if(L.m!=='total'){const[A,H]=game.split('@');sd=t.ab===H?'home':'away';}
    const all=c.filter(x=>x.sp===t.sp&&x.game===game&&String(x.date).slice(0,10)===d);return{sp:t.sp,game,d,sd,all,on:all.filter(x=>x.side===sd),off:all.filter(x=>x.side!==sd)};}return null;}
function evLegChance(M,L){const sim=M.all.find(x=>x.voice==='Sim'&&(x.simP!=null||x.pUsed!=null));let p=null;
  if(sim){const q=sim.pUsed!=null?sim.pUsed:sim.simP;p=sim.side===M.sd?q:1-q;}
  const conf=M.on.map(x=>confOf(x)).filter(v=>v!=null);const cAvg=conf.length?conf.reduce((a,b)=>a+b,0)/conf.length:null;
  if(p==null&&cAvg!=null)p=cAvg;else if(p!=null&&cAvg!=null)p=(p+cAvg)/2;
  /* the leg's own number vs the desk's: a better or worse line than the one the desk read */
  const ref=M.all.find(x=>x.side===M.sd&&x.line!=null);if(p!=null&&ref&&L.line!=null&&L.m!=='ml'){const diff=L.m==='total'?(M.sd==='over'?ref.line-L.line:L.line-ref.line):(L.line-ref.line);p=Math.max(0.03,Math.min(0.97,p+diff*({nhl:0.08,mlb:0.06}[M.sp]||0.03)));}
  return p;}
function evTicket(text){const lines=String(text||'').split(/\n|;/).map(s=>s.trim()).filter(s=>s&&!/^(ticket|parlay|wager|risk|to win|payout|total odds)\b/i.test(s)&&!/^\(?[+-]\d{3,6}\)?$/.test(s));
  const legs=lines.map(raw=>{const L=evParseLeg(raw);if(!L)return null;const M=evMatch(L);if(!M)return{L,miss:true};const p=evLegChance(M,L);
    const off=M.on.filter(isOfficial);return{L,M,p,agree:M.on.map(x=>({v:x.voice,cf:confOf(x)})),against:M.off.map(x=>({v:x.voice,cf:confOf(x)})),official:off.length};}).filter(Boolean);
  const read=legs.filter(x=>!x.miss&&x.p!=null);const P=read.reduce((a,x)=>a*x.p,1);
  const tp=String(text).match(/(?:odds|total|price)?\s*([+-]\d{3,6})\s*$/im);const tot=read.length===legs.length&&legs.length>1&&tp?+tp[1]:null;
  const imp=tot!=null?(tot>0?100/(tot+100):-tot/(-tot+100)):null;
  return{legs,P:read.length?P:null,unread:legs.filter(x=>x.miss).length,imp,price:tot};}
function evHtml(R){if(!R||!R.legs.length)return'<div class="sub">Paste a ticket, one leg per line.</div>';const pc=v=>v==null?'—':Math.round(v*100)+'%';
  const rows=R.legs.map(x=>{if(x.miss)return`<div class="ev-leg"><b>${txtEsc(x.L.raw)}</b><div class="sub" style="color:var(--gold)">Not on the desk's board (game not loaded, or a market the characters don't read${x.L.half?' — first halves aren\'t read yet':''}).</div></div>`;
    const n=x.agree.length,m=x.against.length;const tone=x.p>=0.6?'var(--win)':x.p<0.48?'var(--rust)':'var(--chalk)';
    const who=a=>a.map(z=>`${txtEsc(charName(z.v).replace(/^The /,''))}${z.cf!=null?' '+pc(z.cf):''}`).join(', ');
    return`<div class="ev-leg"><b>${txtEsc(x.L.raw)}</b> <span class="mono" style="color:${tone}">${pc(x.p)}</span>${x.official?` <span class="mono" style="color:var(--gold)">★ ${x.official} official</span>`:''}
      <div class="sub" style="font-size:10.5px">${n} of ${n+m} characters agree${n?' — '+who(x.agree):''}${m?`<br><span style="color:var(--rust)">Against: ${who(x.against)}</span>`:''}</div>
      <div class="sub" style="font-size:10px">${x.p<0.48?'✂️ Cut it — the desk leans the other way.':x.p>=0.6?'✅ Keep it.':'⚖️ Coin-flip territory.'}</div></div>`;}).join('');
  const ev=R.P!=null&&R.imp!=null?R.P/R.imp-1:null;
  return`<div class="ev-sum"><b>Chance to cash: ${pc(R.P)}</b>${R.price!=null?` · priced ${R.price>0?'+':''}${R.price} (needs ${pc(R.imp)})`:''}${ev!=null?` · <b style="color:${ev>0?'var(--win)':'var(--rust)'}">${ev>0?'+':''}${Math.round(ev*100)}% value</b>`:''}${R.unread?` · ${R.unread} leg${R.unread>1?'s':''} not read`:''}</div>${rows}`;}
function evRun(){const ta=document.getElementById('evPaste'),out=document.getElementById('evOut');if(!ta||!out)return;try{out.innerHTML=evHtml(evTicket(ta.value));}catch(e){out.innerHTML='<div class="sub">'+txtEsc(e.message)+'</div>';}}
function evCardHtml(){return`<details class="tkt ev-card"><summary><b>🧾 Evaluate a ticket</b> <span class="mono" style="font-size:10px;color:var(--mute)">a community member's slip, read by every character</span></summary>
  <textarea id="evPaste" rows="5" style="width:100%;margin-top:6px" placeholder="One leg per line — e.g.&#10;Chiefs -3.5&#10;Over 44.5 BUF@MIA&#10;JAX ML&#10;+595"></textarea>
  <div class="bar"><button class="primary" onclick="evRun()">Read it</button></div><div id="evOut" style="margin-top:6px"></div></details>`;}
if(typeof renderTicketsRaw==='function'&&typeof window!=='undefined'&&!window.__EV_TK__){window.__EV_TK__=1;const RT0=renderTicketsRaw;
  renderTicketsRaw=function(){const r=RT0.apply(this,arguments);try{const b=document.getElementById('ticketBody');if(b&&!document.getElementById('evPaste')){const d=document.createElement('div');d.innerHTML=evCardHtml();b.insertBefore(d.firstChild,b.firstChild);}}catch(e){}return r;};}
const EV_CSS=`.ev-leg{padding:6px 0;border-top:1px solid var(--rule);font-size:12px}.ev-sum{font-size:12.5px;padding:4px 0}`;
if(typeof window!=='undefined'&&!window.__EV_BOOT__){window.__EV_BOOT__=1;window.addEventListener('load',()=>{try{const st=document.createElement('style');st.textContent=EV_CSS;document.head.appendChild(st);}catch(e){}});}
/* ═══ THE PUBLIC PAGE, SIMPLE (v2.49) — only the Best 3 goes out, in plain words ═══════════════
   What the phone publishes after the master evaluation: the Best 3 (locked until 30 minutes before
   each game, as always), the Best 3 record and history, and each pick's lead character's plain read.
   No props, no parlays, no cashed-ticket showcase, no model numbers, no "show the math" — the answers
   leave the phone; the machinery that made them never does. Your own app keeps everything. */
if(typeof publicFeed==='function'&&typeof window!=='undefined'&&!window.__EV_PUB__){window.__EV_PUB__=1;const PF1=publicFeed;
  publicFeed=function(){const F=PF1.apply(this,arguments);try{const simple=x=>{if(!x)return x;const o={...x};delete o.voices;
      if(o.why){const r=o.why.read;o.why=r?{read:{who:r.who,take:r.take,text:r.text}}:undefined;}return o;};
    if(F.today){F.today={...F.today,picks:(F.today.picks||[]).map(simple),props:[]};}F.parlay=null;F.parlayRecord=null;F.cashed=[];
    F.history=(F.history||[]).map(h=>({...h,picks:(h.picks||[]).map(simple)}));F.simple=1;}catch(e){}return F;};}
/* ═══ THE SHARE HUB (v2.52) — VIP, free, Telegram, X, Facebook: one place, ready to go ═══════════
   Telegram runs itself: the VIP card at the master evaluation; the free channel's "card is locked"
   note, each unlock and every result from the 24/7 worker. X and Facebook have no free posting API,
   so the hub hands you each post already written: one tap opens X with it typed in, opens Facebook
   with the page linked and the words copied, or opens the phone's share sheet (anywhere else).
   Every post is built from the PUBLIC page's own data — a pick can only be shared once it has
   unlocked (30 minutes before its game). The paid card never leaves through here. */
const SH_SP={mlb:'MLB',nfl:'NFL',ncaaf:'CFB',nhl:'NHL',nba:'NBA',ncaab:'CBB'};let SH_CUR=null;
const shTime=t=>{const v=typeof t==='number'?t:Date.parse(t||'');if(!isFinite(v))return'';try{return new Date(v).toLocaleTimeString([],{hour:'numeric',minute:'2-digit',timeZone:APP_TZ})+' CT';}catch(e){return'';}};
const shRec=R=>R&&(R.w+R.l)?`${R.w}-${R.l}${R.pu?'-'+R.pu:''} (${R.u>=0?'+':''}${(+R.u||0).toFixed(1)}u)`:'';
const shClip=(s,n)=>{s=String(s||'');return s.length<=n?s:s.slice(0,n-1).replace(/\s+\S*$/,'')+'…';};
const shDay=d=>{try{return new Date(d+'T12:00:00Z').toLocaleDateString([],{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});}catch(e){return d;}};
/* X counts every link as 23 characters; a post over 280 drops its quote line first, then gets cut */
function shXLen(s){return String(s).replace(/https?:\/\/\S+/g,'x'.repeat(23)).length;}
function shXFit(s){if(shXLen(s)<=280)return s;const L=String(s).split('\n');const q=L.findIndex(l=>/^"/.test(l));if(q>=0){L.splice(q,1);s=L.join('\n');if(shXLen(s)<=280)return s;}
  while(shXLen(s)>280&&s.length>40)s=s.slice(0,-12).replace(/\s+\S*$/,'')+'…';return s;}
function shLinks(F){const B=typeof bcCfg==='function'?bcCfg():{};const tg=String((F.social&&F.social.tg)||'').trim()||(B.pub?'https://t.me/'+String(B.pub).replace(/^@/,''):'');
  const h=String(F.handle||'').replace(/^@/,'').trim();
  return[['💎 VIP — join',F.subscribe||''],['📣 Free Telegram channel',tg],['🌐 Free picks page',typeof PUB_URL!=='undefined'?PUB_URL:''],['📘 Facebook',(F.social&&F.social.fb)||''],['𝕏 X',h?'https://x.com/'+h:'']].filter(x=>x[1]);}
function shPosts(F){const P=[];const T=F.today;const page=typeof PUB_URL!=='undefined'?PUB_URL:'';const vip=F.subscribe||'';const rec=shRec(F.record);
  const picks=(T&&T.picks)||[];const open=picks.filter(x=>!x.hidden),shut=picks.filter(x=>x.hidden);
  const sports=[...new Set(picks.map(x=>SH_SP[x.sp]||String(x.sp||'').toUpperCase()))].join(' · ');
  if(picks.length){P.push({title:'🔒 The card is locked',
      text:`🔒 Today's Best ${picks.length} is locked… ${sports}.\nEach play unlocks FREE 30 minutes before its game → ${page}${vip?`\nVIP has every play right now → ${vip}`:''}${rec?`\nBest 3 record: ${rec}`:''}`,
      x:`🔒 Today's Best ${picks.length} is locked… ${sports}.\nEach play unlocks free 30 min before its game → ${page}${vip?`\nVIP has them now → ${vip}`:''}`});}
  else P.push({title:'📭 No card yet today',text:`Today's card locks after the master evaluation… nothing forced. Some days the answer is pass.\nFree picks → ${page}${vip?`\nVIP → ${vip}`:''}`});
  open.forEach(x=>{const r=x.why&&x.why.read;const take=r&&r.take?String(r.take):'';const who=r&&r.who?String(r.who):'';
    const res=x.hit===true?'✅ CASHED':x.hit===false?'❌ Lost':x.push?'➖ Push':'';
    const head=`⭐ Best 3 · ${SH_SP[x.sp]||x.sp} · ${x.gl||x.game}`,line=`${x.pick} (${tcSgn(x.price)})${x.start&&!res?' · '+shTime(x.start):''}`;
    P.push({title:`${res?res+' · ':'⭐ '}${x.pick} (${tcSgn(x.price)})`,
      text:`${head}\n${line}${res?'\n'+res:''}${take?`\n"${take}" — ${who}`:''}\nThe full free card → ${page}`,
      x:`${head}\n${line}${res?' · '+res:''}${take?`\n"${shClip(take,120)}"`:''}\n→ ${page}`});});
  shut.forEach(x=>P.push({locked:true,title:`🔒 ${SH_SP[x.sp]||x.sp} pick — unlocks ${shTime(x.unlockAt!=null?x.unlockAt:Date.parse(x.start||'')-30*60e3)||'30 min before its game'}`}));
  const H=(F.history||[])[0];if(H&&(H.picks||[]).length){const w=H.picks.filter(x=>x.hit===true).length,l=H.picks.filter(x=>x.hit===false).length,pu=H.picks.filter(x=>x.push).length;
    if(w+l+pu){const ln=H.picks.map(x=>`${x.hit===true?'✅':x.hit===false?'❌':x.push?'➖':'·'} ${x.pick}`).join('  ');
      P.push({title:`📊 Results · ${shDay(H.d)}: ${w}-${l}${pu?'-'+pu:''}`,
        text:`📊 Best 3 · ${shDay(H.d)}: ${w}-${l}${pu?'-'+pu:''}\n${ln}${rec?`\nSeason: ${rec}`:''}\nEvery pick locked before the games, graded at the final → ${page}`,
        x:`📊 Best 3 · ${shDay(H.d)}: ${w}-${l}${pu?'-'+pu:''}\n${ln}${rec?`\nSeason: ${rec}`:''}\n→ ${page}`});}}
  if(vip)P.push({title:'💎 The VIP pitch',
    text:`💎 VIP gets the whole card the moment it locks… the Best 3, the Top 10 and every character's parlay, in a private Telegram.${F.price?' '+F.price+'.':''}\nNo promises. No politics. Every pick graded in public → ${vip}`,
    x:`💎 VIP gets the whole card the moment it locks… Best 3, Top 10, every parlay, private Telegram.${F.price?' '+F.price+'.':''}\n→ ${vip}`});
  return P;}
function shStatus(F){const d=today();const posted=get('d4.tgposted',null),pub=get('d4.pubstate',null),sent=get('d4.bcsent',null)||{};let B={};try{B=bcCfg();}catch(e){}
  const tgw=typeof tgwOn==='function'&&tgwOn();const chip=(ok,t)=>`<span class="sh-chip${ok?' ok':''}">${ok?'✓':'…'} ${t}</span>`;
  return chip(!!(posted&&posted.d===d),'VIP card posted')+chip(!!(pub&&pub.d===d&&pub.ok),'Free page live')+chip(!!(B.pub&&sent.d===d&&sent.k&&sent.k.pub),'Free channel told')+chip(!!tgw,'24/7 worker on');}
async function shCopy(t){try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(t);return true;}}catch(e){}
  try{const a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();return!!ok;}catch(e){return false;}}
function shAct(i,how){const p=SH_CUR&&SH_CUR.posts[i];if(!p||p.locked)return;const text=p.text,xt=shXFit(p.x||p.text);
  if(how==='x'){try{window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(xt),'_blank','noopener');}catch(e){}return;}
  if(how==='fb'){shCopy(text).then(ok=>deskToast(ok?'Words copied — paste them into the Facebook post':'Copy the words with Copy first',2800));
    try{window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(PUB_URL),'_blank','noopener');}catch(e){}return;}
  if(how==='share'&&typeof navigator!=='undefined'&&navigator.share){navigator.share({text}).catch(()=>{});return;}
  shCopy(text).then(ok=>deskToast(ok?'Copied':'Couldn\'t copy on this device',1600));}
function shCopyLink(i){const l=SH_CUR&&SH_CUR.links[i];if(l)shCopy(l[1]).then(ok=>deskToast(ok?'Link copied':'Couldn\'t copy',1400));}
function shCopyAll(){if(!SH_CUR)return;shCopy(SH_CUR.links.map(l=>`${l[0]}: ${l[1]}`).join('\n')).then(ok=>deskToast(ok?'All links copied — paste into a bio or a pinned post':'Couldn\'t copy',2400));}
function shareHub(){let ov=document.getElementById('shHub');if(ov){ov.remove();return;}let F={};try{F=publicFeed()||{};}catch(e){}
  const posts=shPosts(F),links=shLinks(F);SH_CUR={posts,links};const e=txtEsc;
  ov=document.createElement('div');ov.id='shHub';ov.className='desk-modal';ov.onclick=ev=>{if(ev.target===ov)ov.remove();};
  ov.innerHTML=`<div class="desk-sheet sh-sheet"><h3 style="margin:0 0 6px">📤 Share — ${e(shDay(today()))}</h3><div class="sh-st">${shStatus(F)}</div>
    <div class="sh-h">Your links</div>${links.map((l,i)=>`<div class="sh-link"><span>${e(l[0])}</span><div><button onclick="shCopyLink(${i})">Copy</button><a class="sh-open" href="${e(l[1])}" target="_blank" rel="noopener">Open</a></div></div>`).join('')}
    <button class="sh-all" onclick="shCopyAll()">Copy all links — for a bio or a pinned post</button>
    <div class="sh-h">Ready posts</div>${posts.map((p,i)=>p.locked?`<div class="sh-post off">${e(p.title)}</div>`:`<div class="sh-post"><b>${e(p.title)}</b><pre>${e(p.text)}</pre>
      <div class="sh-acts"><button class="primary" onclick="shAct(${i},'share')">Share…</button><button onclick="shAct(${i},'x')">𝕏 Post</button><button onclick="shAct(${i},'fb')">Facebook</button><button onclick="shAct(${i},'copy')">Copy</button></div></div>`).join('')}
    <div class="sub" style="font-size:10px;margin-top:8px">Built from the free page only — a pick can be shared once it unlocks (30 minutes before its game). Telegram posts itself.</div>
    <div class="bar" style="margin-top:8px"><button onclick="document.getElementById('shHub').remove()">Close</button></div></div>`;
  document.body.appendChild(ov);}
const SH_CSS=`.sh-sheet{max-height:88vh;overflow-y:auto}.sh-st{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px}.sh-chip{font:600 10px/1.2 'IBM Plex Mono',monospace;padding:4px 8px;border-radius:12px;border:1px solid var(--rule);color:var(--mute)}
.sh-chip.ok{color:var(--win);border-color:var(--win)}.sh-h{font:700 10px/1 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin:12px 0 6px}
.sh-link{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--rule);font-size:12px}.sh-link button,.sh-open{font-size:11px;padding:4px 10px;margin-left:4px}
.sh-open{display:inline-block;border:1px solid var(--rule);border-radius:8px;color:var(--chalk);text-decoration:none}.sh-all{width:100%;margin-top:6px;font-size:11px}
.sh-post{border:1px solid var(--rule);border-radius:12px;padding:8px 10px;margin:6px 0}.sh-post.off{color:var(--mute);font-size:11px;font-family:'IBM Plex Mono',monospace}
#shHub{z-index:1500}.sh-post pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:12.5px;line-height:1.45;margin:6px 0;color:var(--chalk)}.sh-acts{display:flex;flex-wrap:wrap;gap:5px}.sh-acts button{font-size:11px;padding:5px 10px}`;
if(typeof window!=='undefined'&&!window.__SH_BOOT__){window.__SH_BOOT__=1;window.addEventListener('load',()=>{try{const st=document.createElement('style');st.textContent=SH_CSS;document.head.appendChild(st);}catch(e){}});}
