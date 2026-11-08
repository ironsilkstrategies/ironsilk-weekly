/* ═══ THE BANKER, REBUILT (v2.89.0) ════════════════════════════════════════════════════════════════════════════════════
   Loaded on every sport page after desk-sgp.js.

   Nov 8, 12:37 AM: "The banker isn't supposed to find value… he's supposed to speculate value by what a character is worth
   in calls. He's more of a secretary who is so good at being efficient in how it approaches tickets… it doesn't want me to
   triple dip on teams… by the time I get to the banker he should be listing 5–10 8–10 team parlays for the day… spread the
   games out so I could watch each ticket individually — one game at 12, one at 2:30, one at 5, one at 7:30… if not, do
   tickets in shifts… it should also make its own single picks… built on every character's bank ledger history."
   12:40 AM: "Limit to 10 teamer."

   §1 · THE BOOKS. Every character keeps accounts: sport × bet type × role (favorite / dog / over / under). Each account has a
        record, units, and its edge over the market's own chance (recency-weighted, a month counts half, shrunk until it has
        real volume). The Banker reads the books — only he weighs one account against another.
   §2 · HIS OWN PICKS. On every game he backs the side the strongest accounts are on — never a split room (60%+ of the
        weighted backing), never against the calibrated chance, never shorter than -300. Graded like everyone else, with his
        own predicted score (the Scorekeeper's ledger keeps it).
   §3 · THE MASTER PARLAY SHEET. Every official pick of the day, each game on exactly ONE ticket (no paperwork twice), at most
        10 legs a ticket, at most 10 tickets. Spread: each ticket takes one game per time window, so every ticket has one game
        on at a time and you can follow them one by one. Shifts: when the day bunches up, the noon ticket, the 2:30 ticket…
        Strength is dealt round-robin so no ticket is all coin flips; a side and its moneyline never ride together. */

const BKS_F_K='d4.bksheetf';
const BK_ACCT_SHRINK=25,BK_ACCT_HL=28,BK_MAXLEG=10,BK_MAXTIX=10,BK_WIN_MIN=90;
function bkSheetF(){let f={};try{f=JSON.parse(localStorage.getItem(BKS_F_K)||'{}')||{};}catch(e){}return{mode:'auto',...f};}
function bkSheetSet(k,v){const f=bkSheetF();f[k]=v;try{localStorage.setItem(BKS_F_K,JSON.stringify(f));}catch(e){}BKSH_C=null;try{renderBankerTab();}catch(e){}}

/* §1 · the books ─────────────────────────────────────────────────────────────────────────────────────────────────── */
function bkImpQ(price,mk){if(typeof mcNoVig==='function'){const q=mcNoVig(price,mk);if(q!=null)return q;}return mk==='ml'?null:0.5;}
/* the role a call plays in its account: favorite or dog on a side, over or under on a total */
function bkRole(mk,side,line,price){if(mk==='total')return/under/i.test(side)?'under':'over';
  if(mk==='spread')return line!=null&&+line<0?'fav':line!=null&&+line>0?'dog':(+price<0?'fav':'dog');return price!=null&&+price<0?'fav':'dog';}
let BKA_C=null;
function bkAcctBook(){const V=roGet(VOICES_KEY,[],30e3)||[];const sig=(typeof ledgerSig==='function'?ledgerSig(V):V.length)+'|'+today();if(BKA_C&&BKA_C.sig===sig)return BKA_C.A;
  const A={};const ref=Date.parse(today()+'T12:00:00Z');
  V.forEach(x=>{if(!x||!x.graded||x.hit==null||!['ml','spread','total'].includes(x.market)||!CHARS[x.voice]||(typeof META_VOICES!=='undefined'&&META_VOICES.has(x.voice)))return;
    const q=bkImpQ(x.price,x.market);if(q==null)return;const role=bkRole(x.market,x.side,x.line,x.price);const k=[x.voice,x.sp,x.market,role].join('|');
    const o=A[k]||(A[k]={v:x.voice,sp:x.sp,mk:x.market,role,n:0,w:0,l:0,u:0,sw:0,se:0});
    const age=Math.max(0,(ref-Date.parse(String(x.date).slice(0,10)+'T12:00:00Z'))/864e5),wt=Math.pow(0.5,age/BK_ACCT_HL);
    o.n++;x.hit?o.w++:o.l++;o.u+=x.hit?(x.price!=null&&Math.abs(+x.price)>=100?americanToDecimal(+x.price)-1:0.91):-1;o.sw+=wt;o.se+=wt*((x.hit?1:0)-q);});
  Object.values(A).forEach(o=>{o.edge=o.se/(o.sw+BK_ACCT_SHRINK);o.u=+o.u.toFixed(2);});
  BKA_C={sig,A};return A;}
function bkAcct(v,sp,mk,role){return bkAcctBook()[[v,sp,mk,role].join('|')]||null;}
/* what a character's call is worth to the Banker: 1 for an unproven account, more for one that's beaten the market, less (never
   zero) for one that's bled */
function bkWorth(v,sp,mk,role){const a=bkAcct(v,sp,mk,role);return a?Math.max(0.25,Math.min(2.5,1+8*a.edge)):1;}

/* §2 · his own picks — called from metaCalls() on every board ─────────────────────────────────────────────────────── */
function bkBankerPick(sp,m,sides,voters){if(!sides||sides.length<2)return null;
  const W=sides.map(o=>{const by=voters.filter(c=>c.side===o.sd).map(c=>c.voice);const role=bkRole(m,o.sd,o.line,o.price);
    return{o,by,w:by.reduce((a,v)=>a+bkWorth(v,sp,m,role),0)};});
  const i=W[0].w>=W[1].w?0:1;const S=W[i],O=W[1-i];if(S.by.length<2)return null;
  const share=S.w/((S.w+O.w)||1);if(share<0.6-1e-9)return null;
  const p=S.o.blend;if(p!=null&&p<0.52)return null;
  if(S.o.price==null||(typeof bkPriceOk==='function'&&!bkPriceOk(S.o.price)))return null;
  return{sd:S.o.sd,ex:{simP:p!=null?+(+p).toFixed(4):null,mktP:S.o.mk!=null?+(+S.o.mk).toFixed(4):null,acct:+share.toFixed(3),by:S.by}};}

/* §3 · the master parlay sheet ───────────────────────────────────────────────────────────────────────────────────── */
/* the day's official picks become legs: one per game side (spread or moneyline — never both), one per total */
function bkSheetLegs(){const d=today();let C=[];try{C=deskCands(roGet(VOICES_KEY,[],30e3)||[],d);}catch(e){console.warn('bk sheet cands',e);}
  const L={};C.forEach(c=>{const k=[c.sp,c.game,c.m,c.sd,c.line==null?'':c.line].join('|');const o=L[k]||(L[k]={sp:c.sp,game:c.game,m:c.m,sd:c.sd,line:c.line,price:c.price,pick:c.pick,start:c.start,by:[],cf:[]});
    if(!o.by.includes(c.v)){o.by.push(c.v);o.cf.push(c.cf);}if(!o.start&&c.start)o.start=c.start;});
  /* a pick with official characters on BOTH sides is a fight, not a play */
  const bySide={};Object.values(L).forEach(o=>{const g=o.sp+'|'+o.game+'|'+o.m;(bySide[g]=bySide[g]||[]).push(o);});
  const legs=[];Object.values(bySide).forEach(list=>{if(new Set(list.map(o=>o.sd)).size>1)return;list.forEach(o=>legs.push(o));});
  legs.forEach(o=>{const role=bkRole(o.m,o.sd,o.line,o.price);const cf=o.cf.reduce((a,b)=>a+b,0)/o.cf.length;
    const acc=o.by.reduce((a,v)=>{const A=bkAcct(v,o.sp,o.m,role);return a+(A?A.edge:0);},0)/o.by.length;   /* the backers' average account, not their sum — six voices aren't six times the proof */
    o.role=role;o.cf0=cf;o.acc=+Math.max(-0.03,Math.min(0.03,acc)).toFixed(4);
    o.score=cf+o.acc+0.01*Math.min(4,o.by.length-1);
    let pc=null;try{pc=typeof mcalTeam==='function'?mcalTeam({sp:o.sp,mk:o.m,price:o.price,v:Object.fromEntries(o.by.map((v,i)=>[v,o.cf[i]])),opp:[]}):null;}catch(e){}
    o.p=Math.max(0.02,Math.min(0.98,(pc!=null?pc:cf)+o.acc));if(!o.start){try{o.start=boardStart(o.sp,o.game,d)||'';}catch(e){}}});
  /* one side per game: the spread or the moneyline, whichever the Banker rates higher */
  const G={};legs.forEach(o=>{const g=o.sp+'|'+o.game;const e=G[g]||(G[g]={sp:o.sp,game:o.game,start:o.start,legs:[]});if(!e.start&&o.start)e.start=o.start;
    if(o.m!=='total'){const i=e.legs.findIndex(z=>z.m!=='total');if(i>=0){if(e.legs[i].score>=o.score)return;e.legs.splice(i,1);}}e.legs.push(o);});
  return Object.values(G).filter(g=>g.legs.length).map(g=>({...g,score:g.legs.reduce((a,o)=>a+o.score,0)/g.legs.length,n:g.legs.length,t:g.start?Date.parse(g.start):Infinity}));}
/* games that start within 90 minutes of a window's first game share it */
function bkWindows(G){const S=G.slice().sort((a,b)=>a.t-b.t);const W=[];S.forEach(g=>{const w=W[W.length-1];if(w&&isFinite(g.t)&&g.t-w.t0<=BK_WIN_MIN*6e4)w.games.push(g);else W.push({t0:g.t,games:[g]});});return W;}
function bkSheet(){if(BKSH_C&&Date.now()-BKSH_C.ts<60e3&&BKSH_C.mode===bkSheetF().mode)return BKSH_C.v;const f=bkSheetF();
  let G=bkSheetLegs();let N=G.reduce((a,g)=>a+g.n,0);const dropped=[];
  /* over 10 full tickets: the weakest games go first */
  if(N>BK_MAXLEG*BK_MAXTIX){G.sort((a,b)=>b.score-a.score);while(N>BK_MAXLEG*BK_MAXTIX&&G.length){const x=G.pop();N-=x.n;dropped.push(x);}}
  const W=bkWindows(G);const T=Math.max(1,Math.min(BK_MAXTIX,Math.ceil(N/BK_MAXLEG)));const per=Math.ceil(N/T);
  const biggest=W.reduce((a,w)=>Math.max(a,w.games.length),0);
  const mode=f.mode==='spread'||f.mode==='shift'?f.mode:(W.length>=3&&biggest<=T+1?'spread':'shift');
  const tix=Array.from({length:T},()=>({games:[],n:0,s:0,wins:new Set()}));
  if(mode==='spread'){
    /* deal each window's games across the tickets, strongest to the ticket that's weakest so far, one per ticket per window */
    W.forEach((w,wi)=>{w.games.slice().sort((a,b)=>b.score-a.score).forEach(g=>{
      let cand=tix.filter(t=>!t.wins.has(wi)&&t.n+g.n<=BK_MAXLEG);if(!cand.length)cand=tix.filter(t=>t.n+g.n<=BK_MAXLEG);
      if(!cand.length){dropped.push(g);return;}cand.sort((a,b)=>(a.n>=per)-(b.n>=per)||a.s-b.s||a.n-b.n);const t=cand[0];t.games.push(g);t.n+=g.n;t.s+=g.score*g.n;t.wins.add(wi);});});}
  else{
    /* shifts: in start order, fill a ticket to its share, then the next */
    let i=0;G.slice().sort((a,b)=>a.t-b.t).forEach(g=>{while(i<T-1&&(tix[i].n>=per||tix[i].n+g.n>BK_MAXLEG))i++;const t=tix[i];if(t.n+g.n>BK_MAXLEG){dropped.push(g);return;}t.games.push(g);t.n+=g.n;t.s+=g.score*g.n;});}
  const out=tix.filter(t=>t.n).map((t,k)=>{const legs=t.games.slice().sort((a,b)=>a.t-b.t).flatMap(g=>g.legs.map(o=>({...o,start:o.start||g.start})));
    const p=legs.reduce((a,o)=>a*o.p,1),dec=legs.reduce((a,o)=>a*(o.price!=null?americanToDecimal(+o.price):1.91),1);
    const ts=t.games.map(g=>g.t).filter(isFinite).sort((a,b)=>a-b);
    return{name:String.fromCharCode(65+k),legs,games:t.games.length,p,dec,first:ts[0]||null,last:ts[ts.length-1]||null,watch:[...new Set(t.games.map(g=>g.t).filter(isFinite))].sort((a,b)=>a-b)};});
  /* shifts read best in start order; spread tickets all run the whole day — strongest first */
  out.sort((a,b)=>mode==='shift'?(a.first||0)-(b.first||0):b.p-a.p);out.forEach((t,k)=>t.name=String.fromCharCode(65+k));
  const v={mode,auto:f.mode==='auto',tix:out,N,windows:W.length,dropped,games:G.length};BKSH_C={ts:Date.now(),mode:f.mode,v};return v;}
let BKSH_C=null;

/* the page ───────────────────────────────────────────────────────────────────────────────────────────────────────── */
const bkT=t=>t?new Date(t).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:APP_TZ}):'—';
function bkSheetLegHtml(o){const ch=o.by.map(v=>{const C=CHARS[v]||{};return`<span class="mono" style="font-size:8.5px;color:${C.color||'var(--mute)'};border:1px solid ${C.color||'var(--rule)'};border-radius:3px;padding:0 3px;margin-right:2px;white-space:nowrap">${txtEsc(C.chip||v)}</span>`;}).join('');
  const sp=({nfl:'🏈',ncaaf:'🏟',nhl:'🏒',nba:'🏀',ncaab:'🏀',mlb:'⚾'})[o.sp]||'';
  return`<li style="margin:3px 0"><span class="mono" style="font-size:9.5px;color:var(--gold)">${bkT(o.start?Date.parse(o.start):null)}</span> ${sp} <b>${txtEsc(o.pick)}</b> <span class="mono" style="font-size:10px">${o.price!=null?(o.price>0?'+':'')+o.price:''}</span>
    <span class="mono" style="font-size:9.5px;color:var(--mute)">${Math.round(o.p*100)}%${o.acc?` · books ${o.acc>0?'+':''}${Math.round(o.acc*100)}`:''}</span><div style="margin-top:1px">${ch}</div></li>`;}
function bkSheetText(t){return`TICKET ${t.name} (${t.legs.length} legs)\n`+t.legs.map(o=>`  ${bkT(o.start?Date.parse(o.start):null)}  ${o.pick}${o.price!=null?' '+(o.price>0?'+':'')+o.price:''}`).join('\n');}
function bkSheetCopy(i){try{const S=bkSheet();const t=i==='all'?S.tix.map(bkSheetText).join('\n\n'):bkSheetText(S.tix[i]);if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>{try{deskToast('📋 Copied',1500);}catch(e){}}).catch(()=>{});}catch(e){}}
function bkSheetHtml(){let S;try{S=bkSheet();}catch(e){return`<div class="tkt"><div class="sub">${txtEsc(e.message)}</div></div>`;}const f=bkSheetF();
  const chip=(v,lab)=>`<button class="${f.mode===v?'on':''}" onclick="bkSheetSet('mode','${v}')">${lab}</button>`;
  const how=S.mode==='spread'?`Spread — every ticket takes one game per time window, so each ticket has one game on at a time across ${S.windows} windows.`:`Shifts — the day bunches up, so each ticket covers one stretch of start times and settles before the next one gets going.`;
  const head=`<div class="tkt" style="border-color:#c9a227;margin-bottom:6px"><h3 style="margin:0 0 4px">🏦 The Master Parlay Sheet</h3>
    <div class="sub" style="font-size:10.5px">${S.N} official picks on ${S.games} games → <b>${S.tix.length} ticket${S.tix.length===1?'':'s'}</b>, 10 legs max. Each game is on one ticket only — no team twice.</div>
    <div class="sub" style="font-size:10px;margin-top:3px">${how}${S.auto?' (his call)':''}</div>
    <div class="subnav" style="margin-top:6px">${chip('auto','His call')}${chip('spread','Spread by time')}${chip('shift','Shifts')}</div>
    ${S.dropped.length?`<div class="mono" style="font-size:9.5px;color:var(--mute)">Left off (weakest, over the 10×10 limit): ${S.dropped.map(g=>txtEsc(g.game)).join(', ')}</div>`:''}
    <div class="mono" style="font-size:9px;color:var(--mute);margin-top:3px">% = the calibrated chance; "books" = what the backers' accounts add or take (capped at 3 points). A side and its moneyline never ride together.</div></div>`;
  if(!S.tix.length)return head+`<div class="tkt"><div class="sub">No official picks yet today — they fill in as the characters make their calls on each board.</div></div>`;
  return head+S.tix.map((t,i)=>`<div class="tkt" style="margin:6px 0"><div style="display:flex;justify-content:space-between;gap:6px;align-items:baseline"><div style="font-weight:900;font-size:15px">Ticket ${t.name} · ${t.legs.length} legs</div>
      <div class="mono" style="font-size:10.5px;color:var(--gold)">${decimalToAmerican(t.dec)} · ${t.p>=0.01?(t.p*100).toFixed(1)+'%':'1 in '+Math.round(1/t.p).toLocaleString()}</div></div>
    <div class="mono" style="font-size:9.5px;color:var(--mute)">${t.games} games · ${bkT(t.first)} → ${bkT(t.last)}${t.watch.length>1?' · on at '+t.watch.map(bkT).join(' · '):''}</div>
    <ol style="margin:4px 0 0 18px;padding:0">${t.legs.map(bkSheetLegHtml).join('')}</ol>
    <div class="bar" style="margin-top:4px"><button onclick="bkSheetCopy(${i})">📋 Copy ticket ${t.name}</button></div></div>`).join('')+
    `<div class="bar"><button onclick="bkSheetCopy('all')">📋 Copy the whole sheet</button></div>`;}
/* the books, for anyone curious which accounts are strong */
function bkBooksHtml(){const A=Object.values(bkAcctBook()).filter(o=>o.n>=15);if(!A.length)return'';
  const rl={fav:'favorites',dog:'dogs',over:'overs',under:'unders'},ml={ml:'ML',spread:'spread',total:'total'};
  const row=o=>`<div class="mono" style="font-size:10px">${txtEsc((CHARS[o.v]||{}).chip||o.v)} · ${(o.sp||'').toUpperCase()} ${ml[o.mk]||o.mk} ${rl[o.role]||o.role}: ${o.w}-${o.l} · ${o.u>=0?'+':''}${o.u.toFixed(1)}u · <b style="color:${o.edge>=0?'var(--win)':'var(--rust)'}">${o.edge>=0?'+':''}${(o.edge*100).toFixed(1)}</b> vs the market</div>`;
  const top=A.slice().sort((a,b)=>b.edge-a.edge).slice(0,8),bot=A.slice().sort((a,b)=>a.edge-b.edge).slice(0,8);
  return`<details class="tkt" style="margin-top:8px"><summary><b>📒 The books — every character's accounts</b> <span class="mono" style="font-size:10px;color:var(--mute)">${A.length} accounts with 15+ calls</span></summary>
    <div class="sub" style="font-size:10px;margin:4px 0">Edge = how much more often the account wins than the market's own price says, recency-weighted and shrunk until it has volume. The Banker leans on the strong ones.</div>
    <div class="mktlab">Strongest</div>${top.map(row).join('')}<div class="mktlab" style="margin-top:6px">Weakest</div>${bot.map(row).join('')}</details>`;}
if(typeof renderBankerTab==='function'&&typeof window!=='undefined'&&!window.__BK_SHEET__){window.__BK_SHEET__=1;const R0=renderBankerTab;
  renderBankerTab=function(){R0();try{const el=document.getElementById('bankerBody');if(el)el.insertAdjacentHTML('afterbegin',bkSheetHtml()+bkBooksHtml()+`<div class="sbar"><h2>The desk</h2><div class="ln"></div></div>`);}catch(e){console.warn('bk sheet',e);}};}
