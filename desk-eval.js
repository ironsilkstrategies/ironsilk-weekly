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
