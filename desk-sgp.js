/* ═══ PERFECT SGPs (v2.88.0) ═════════════════════════════════════════════════════════════════════════════════════════
   Loaded on every sport page after desk-mcal.js.

   Nov 7, 5:05 PM: "a feature where I can see perfect SGPs for each game only playing what hits at 70% confidence… when
   there's more cohesiveness in certain characters it heightens confidence… games with a lot of player action and multiple
   characters' interest (and the systems) — the Banker builds the best SGP games so I can put the best together, 4–5 games
   a piece running 20–30 legs… throw a couple dollars to all available SGP combos."

   §1 · LEGS. For every game today that hasn't started: each side/total the characters called, and each player threshold
        they called, priced by the master calibration (desk-mcal.js). A leg makes it only at 70%+ calibrated AND with the
        characters behind it (props: how many of the five clear the line — 5 of 5 hit 79% in the ledger, 1–2 of 5 about 65%).
        One line per player stat: the highest one that still clears the bar.
   §2 · ONE GAME. The Banker keeps the strongest legs that belong together: no side and moneyline on the same team twice, no
        game Under next to a stack of scoring overs, at most two stats per player. Games rank by player action, the
        characters' agreement and the systems' interest (Banker/Best on a side counts).
   §3 · THE SLATE. Every 4- and 5-game combination of the best games, trimmed to 20–30 legs, with its honest chance — the
        product of calibrated chances (a same-game parlay's legs move together, so the book prices it shorter than this).
   Every leg says who it came from. */

const SGP_F_K='d4.sgpf',SGP_DEF={th:0.70,coh:4,per:7,games:6,lo:20,hi:30,sp:'all',dk:0};
const SGP_SYS=new Set(['Banker','Best','Consensus','Covers','Trends']);
function sgpF(){let f={};try{f=JSON.parse(localStorage.getItem(SGP_F_K)||'{}')||{};}catch(e){}return{...SGP_DEF,...f};}
function sgpSet(k,v){const f=sgpF();f[k]=v;try{localStorage.setItem(SGP_F_K,JSON.stringify(f));}catch(e){}SGP_C=null;sgpRepaint();}
const SGP_SP_LAB={nfl:'🏈 NFL',ncaaf:'🏟 CFB',nhl:'🏒 NHL',nba:'🏀 NBA',ncaab:'🏀 CBB',mlb:'⚾ MLB'};

/* §1 · today's games and their legs ──────────────────────────────────────────────────────────────────────────────── */
function sgpGames(){const d=today(),now=Date.now();const G={};
  const add=(sp,g,s)=>{if(!sp||!g||!/@/.test(g))return;const k=sp+'|'+g;const o=G[k]||(G[k]={sp,game:g,start:null});if(!o.start&&s)o.start=s;};
  try{const T=roGet(TC_KEY,{})||{};if(T.d===d)Object.entries(T.by||{}).forEach(([sp,B])=>{(B&&B.games||[]).forEach(x=>add(sp,x.g,x.s));(B&&B.picks||[]).forEach(p=>add(sp,p.game,p.start));});}catch(e){}
  try{(roGet(VOICES_KEY,[],30e3)||[]).forEach(x=>{if(x.date===d&&!x.graded)add(x.sp,x.game,null);});}catch(e){}
  Object.values(G).forEach(o=>{if(!o.start)try{o.start=boardStart(o.sp,o.game,d);}catch(e){}});
  return Object.values(G).filter(o=>!o.start||Date.parse(o.start)>now-60e3);}
function sgpTeamOf(sp,team,games){const T=String(team||'').toUpperCase();const ab=x=>typeof mgAb==='function'?mgAb(sp,x):x;
  return games.find(o=>{if(o.sp!==sp)return false;const [a,h]=o.game.split('@');return a===T||h===T||ab(a)===ab(T)||ab(h)===ab(T);})||null;}
function sgpLegs(f){f=f||sgpF();const d=today();const games=sgpGames();const byG={};games.forEach(o=>byG[o.sp+'|'+o.game]={...o,legs:[],chars:new Set(),sys:new Set()});
  /* sides & totals */
  try{const V=(roGet(VOICES_KEY,[],30e3)||[]).filter(x=>x.date===d&&!x.graded&&['ml','spread','total'].includes(x.market)&&byG[x.sp+'|'+x.game]);
    const L={};V.forEach(x=>{const k=[x.sp,x.game,x.market,x.side,x.line==null?'':x.line].join('|');const o=L[k]||(L[k]={sp:x.sp,game:x.game,mk:x.market,side:x.side,line:x.line,price:x.price,pick:x.pick,v:{}});
      o.v[x.voice]=x.cf!=null?+x.cf:x.pUsed!=null?+x.pUsed:x.simP!=null?+x.simP:null;if(o.price==null)o.price=x.price;if(!o.pick)o.pick=x.pick;});
    const byM={};Object.values(L).forEach(o=>{(byM[o.sp+'|'+o.game+'|'+o.mk]=byM[o.sp+'|'+o.game+'|'+o.mk]||[]).push(o);});
    Object.values(byM).forEach(list=>{list.forEach(o=>{const opp=new Set();list.forEach(z=>{if(z!==o&&z.side!==o.side)Object.keys(z.v).forEach(v=>opp.add(v));});
      const p=mcalTeam({sp:o.sp,mk:o.mk,price:o.price,v:o.v,opp:[...opp]});if(p==null)return;const n=Object.keys(o.v).length;
      const G0=byG[o.sp+'|'+o.game];Object.keys(o.v).forEach(v=>{G0.chars.add(v);if(SGP_SYS.has(v))G0.sys.add(v);});
      const coh=n/(n+opp.size||1);
      if(p<f.th||n<2||coh<0.6)return;   /* a side needs the characters with it, not split down the middle */
      G0.legs.push({kind:'s',sp:o.sp,game:o.game,mk:o.mk,side:o.side,line:o.line,price:o.price,pick:o.pick||`${o.side} ${o.mk}`,p,n,no:opp.size,coh,by:Object.keys(o.v)});});});}catch(e){console.warn('sgp sides',e);}
  /* player thresholds */
  try{const P=(roGet(typeof CPROP_KEY!=='undefined'?CPROP_KEY:'d4.charprops',[],30e3)||[]).filter(x=>x.d===d&&x.hit==null&&(x.mv||1)>=2);
    const byP={};P.forEach(x=>{(byP[x.sp+'|'+x.player+'|'+x.k]=byP[x.sp+'|'+x.player+'|'+x.k]||[]).push(x);});
    Object.values(byP).forEach(xs=>{const x0=xs[0];const G0=sgpTeamOf(x0.sp,x0.team,games);if(!G0)return;const g=byG[G0.sp+'|'+G0.game];
      let best=null;[...new Set(xs.map(x=>+x.thr))].sort((a,b)=>b-a).forEach(T=>{if(best)return;const at=xs.filter(x=>+x.thr===T);const ge=xs.filter(x=>+x.thr>=T);
        const nge=new Set(ge.map(x=>x.voice)).size;const pm=mcSig(at.reduce((a,x)=>a+mcLogit(x.p),0)/at.length);const p=mcalProp({sp:x0.sp,k:x0.k,pm,nge});
        /* DraftKings' price on this exact line, when its board has it (and, asked for, only lines it offers) */
        const dk=typeof feedPropPrice==='function'?feedPropPrice(x0.sp,x0.player,x0.k,T):null;if(f.dk&&!(dk&&dk.price!=null))return;
        if(p>=f.th&&nge>=f.coh)best={kind:'p',sp:x0.sp,game:G0.game,player:x0.player,team:x0.team,k:x0.k,thr:T,p,pm,nge,dk:dk&&dk.price!=null?dk.price:null,by:[...new Set(ge.map(x=>x.voice))],pick:`${x0.player} ${T}+ ${(typeof CPROP_LAB!=='undefined'&&CPROP_LAB[x0.k])||x0.k}`};});
      xs.forEach(x=>g.chars.add(x.voice));if(best)g.legs.push(best);});}catch(e){console.warn('sgp props',e);}
  return Object.values(byG);}

/* §2 · one game's SGP ────────────────────────────────────────────────────────────────────────────────────────────── */
const SGP_SCORING=new Set(['pts','py','ry','wy','rec','fg3','s','tb','h','g']);
function sgpBuildGame(G,f){f=f||sgpF();let L=G.legs.slice().sort((a,b)=>b.p-a.p);const out=[];const perPlayer={};let sideTeam={};
  const overs=L.filter(x=>x.kind==='p'&&SGP_SCORING.has(x.k)).length;
  for(const x of L){if(out.length>=f.per)break;
    if(x.kind==='p'){const c=perPlayer[x.player]||0;if(c>=2)continue;perPlayer[x.player]=c+1;out.push(x);continue;}
    if(x.mk==='total'&&/under/i.test(x.side)&&overs>=2)continue;   /* a game Under fights a stack of scoring overs */
    if(x.mk==='ml'||x.mk==='spread'){const t=x.side;if(sideTeam[t])continue;sideTeam[t]=1;}
    if(out.some(z=>z.kind==='s'&&z.mk===x.mk))continue;
    out.push(x);}
  const joint=out.reduce((a,x)=>a*x.p,1);
  const props=out.filter(x=>x.kind==='p');const coh=out.length?out.reduce((a,x)=>a+(x.kind==='p'?x.nge/5:x.coh),0)/out.length:0;
  const banker=[...G.sys].includes('Banker');
  const score=out.length*(out.reduce((a,x)=>a+x.p,0)/(out.length||1))*(0.7+0.3*coh)+(banker?0.8:0)+0.15*G.chars.size+0.1*G.sys.size+0.1*props.length;
  return{...G,sgp:out,joint,coh,banker,score};}

/* §3 · the slate ─────────────────────────────────────────────────────────────────────────────────────────────────── */
function sgpCombos(B,f){f=f||sgpF();const top=B.slice(0,f.games);const out=[];
  const pick=(k,start,cur)=>{if(cur.length===k){out.push(cur.slice());return;}for(let i=start;i<top.length;i++){cur.push(top[i]);pick(k,i+1,cur);cur.pop();}};
  [4,5].forEach(k=>{if(top.length>=k)pick(k,0,[]);});
  return out.map(gs=>{let legs=gs.flatMap(g=>g.sgp.map(x=>({...x,_g:g.game})));
    if(legs.length>f.hi){const keep=new Map(gs.map(g=>[g.game,0]));const sorted=legs.slice().sort((a,b)=>b.p-a.p);const sel=[];
      sorted.forEach(x=>{if(sel.length<f.hi||keep.get(x._g)<2){sel.push(x);keep.set(x._g,keep.get(x._g)+1);}});legs=sel.slice(0,Math.max(f.hi,gs.length*2));}
    const joint=legs.reduce((a,x)=>a*x.p,1);return{games:gs,legs,joint,short:legs.length<f.lo};})
    .sort((a,b)=>(a.short-b.short)||b.joint-a.joint);}
let SGP_C=null;
function sgpData(){if(SGP_C&&Date.now()-SGP_C.t<60e3)return SGP_C.v;const f=sgpF();
  const B=sgpLegs(f).filter(G=>f.sp==='all'||G.sp===f.sp).map(G=>sgpBuildGame(G,f)).filter(G=>G.sgp.length>=2).sort((a,b)=>b.score-a.score);
  const v={f,games:B,combos:sgpCombos(B,f)};SGP_C={t:Date.now(),v};return v;}

/* the page ───────────────────────────────────────────────────────────────────────────────────────────────────────── */
const sgpOdds=p=>{if(!(p>0&&p<1))return'—';const a=p>=0.5?-Math.round(100*p/(1-p)):Math.round(100*(1-p)/p);return(a>0?'+':'')+a.toLocaleString();};
const sgpOneIn=p=>p>0?'1 in '+Math.max(1,Math.round(1/p)).toLocaleString():'—';
function sgpChips(by){return(by||[]).map(v=>{const C=CHARS[v]||{};return`<span class="mono" style="font-size:8.5px;color:${C.color||'var(--mute)'};border:1px solid ${C.color||'var(--rule)'};border-radius:3px;padding:0 3px;margin-right:2px;white-space:nowrap">${txtEsc(C.chip||v)}</span>`;}).join('');}
const sgpAm=a=>(a>0?'+':'')+a;const sgpImp=a=>a>0?100/(a+100):(-a)/((-a)+100);const sgpDec=a=>a>0?1+a/100:1+100/(-a);
function sgpLegHtml(x){const who=x.kind==='p'?`<b style="color:${x.nge>=5?'var(--win)':'var(--gold)'}">${x.nge}/5</b> clear it`:`${x.n} with it${x.no?` · ${x.no} against`:''}`;
  const pr=x.kind==='p'?x.dk:x.price;const edge=pr!=null?Math.round((x.p-sgpImp(pr))*100):null;
  const px=pr!=null?` <span class="mono" style="font-size:9.5px;color:var(--chalk,#ddd)">${x.kind==='p'?'DK ':''}${sgpAm(pr)}</span>${edge!=null?` <span class="mono" style="font-size:9.5px;color:${edge>=0?'var(--win)':'var(--rust)'}">${edge>=0?'+':''}${edge}</span>`:''}`:'';
  return`<li style="margin:2px 0">${txtEsc(x.pick)} <b class="mono" style="color:var(--gold)">${Math.round(x.p*100)}%</b>${px} <span class="mono" style="font-size:9.5px;color:var(--mute)">${who}</span><div style="margin-top:1px">${sgpChips(x.by)}</div></li>`;}
/* the legs' own prices multiplied, when every leg has one — what they'd pay as a straight parlay (an SGP pays less) */
function sgpBook(legs){const pr=legs.map(x=>x.kind==='p'?x.dk:x.price);if(!pr.length||pr.some(a=>a==null))return null;const d=pr.reduce((a,b)=>a*sgpDec(b),1);return d>2?'+'+Math.round((d-1)*100).toLocaleString():null;}
function sgpGameHtml(G,i){const st=G.start?gameWhen(G.sp,G.game,G.start):'';
  return`<div class="tkt" style="margin:6px 0"><div style="display:flex;justify-content:space-between;gap:6px;align-items:baseline"><div style="font-weight:900">${i+1}. ${SGP_SP_LAB[G.sp]||''} ${typeof gameLabelHtml==='function'?gameLabelHtml(G.sp,G.game):txtEsc(G.game)}</div><div class="mono" style="font-size:10px;color:var(--gold)">${st?'⏰ '+st:''}</div></div>
    <div class="mono" style="font-size:9.5px;color:var(--mute);margin:2px 0">${G.sgp.length} legs · ${sgpOneIn(G.joint)} (${sgpOdds(G.joint)} fair) · ${G.chars.size} characters on this game${G.banker?' · 🏦 Banker in':''}${G.sys.size?' · systems: '+[...G.sys].map(v=>(CHARS[v]||{}).chip||v).join(', '):''}</div>
    <ol style="margin:4px 0 0 18px;padding:0">${G.sgp.map(sgpLegHtml).join('')}</ol>
    <div class="bar" style="margin-top:4px"><button onclick="sgpCopy('g',${i})">📋 Copy this SGP</button></div></div>`;}
function sgpComboHtml(C,i){return`<details class="tkt" style="margin:5px 0"><summary><b>#${i+1}</b> · ${C.games.length} games · <b>${C.legs.length} legs</b>${C.short?' <span style="color:var(--gold)">(short of 20)</span>':''} · <b class="mono" style="color:var(--gold)">${sgpOneIn(C.joint)}</b> <span class="mono" style="font-size:10px;color:var(--mute)">${sgpOdds(C.joint)} fair</span>
    <div class="mono" style="font-size:9.5px;color:var(--mute)">${C.games.map(g=>txtEsc(g.game)).join(' · ')}${(()=>{const b=sgpBook(C.legs);const n=C.legs.filter(x=>(x.kind==='p'?x.dk:x.price)!=null).length;return b?` · as straight legs ${b}`:n?` · ${n}/${C.legs.length} legs priced`:'';})()}</div></summary>
    ${C.games.map(g=>`<div class="mono" style="font-size:10px;margin:6px 0 2px;color:var(--gold)">${SGP_SP_LAB[g.sp]||''} ${txtEsc(g.game)}</div><ol style="margin:0 0 0 18px;padding:0">${C.legs.filter(x=>x._g===g.game).map(sgpLegHtml).join('')}</ol>`).join('')}
    <div class="bar" style="margin-top:4px"><button onclick="sgpCopy('c',${i})">📋 Copy all ${C.legs.length} legs</button></div></details>`;}
function sgpText(legs,games){return games.map(g=>`${g.sp.toUpperCase()} ${g.game}\n`+legs.filter(x=>(x._g||x.game)===g.game).map(x=>`  • ${x.pick} (${Math.round(x.p*100)}%)`).join('\n')).join('\n');}
function sgpCopy(kind,i){try{const D=sgpData();let t='';if(kind==='g'){const G=D.games[i];t=sgpText(G.sgp,[G]);}else{const C=D.combos[i];t=sgpText(C.legs,C.games);}
  if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>{try{deskToast('📋 Copied',1500);}catch(e){}}).catch(()=>{});}catch(e){console.warn('sgp copy',e);}}
function sgpHtml(){let D;try{D=sgpData();}catch(e){return`<div class="tkt"><div class="sub">${txtEsc(e.message)}</div></div>`;}const f=D.f;
  const chip=(k,v,lab)=>`<button class="${f[k]===v||(k==='dk'&&f.dk&&v===0)?'on':''}" onclick="sgpSet('${k}',${typeof v==='string'?`'${v}'`:v})">${lab}</button>`;
  const sps=['all',...new Set(D.games.map(g=>g.sp))];
  const M=typeof mcalModel==='function'?mcalModel():null;
  const head=`<div class="tkt" style="margin-bottom:6px"><h3 style="margin:0 0 4px">🎯 Perfect SGPs</h3>
    <div class="sub" style="font-size:10.5px">Every leg is a <b>calibrated ${Math.round(f.th*100)}%+</b> with the characters behind it${M?` (master calibration, ${txtEsc(mcCL(M.prop.c,'p'))} for props)`:''}. The Banker ranks the games by player action, agreement and the systems, then lays out every 4- and 5-game slate at ${f.lo}–${f.hi} legs.</div>
    <div class="subnav" style="margin-top:6px">${chip('th',0.65,'65%+')}${chip('th',0.70,'70%+')}${chip('th',0.75,'75%+')}${chip('th',0.80,'80%+')}</div>
    <div class="subnav">${chip('coh',3,'3 of 5 agree')}${chip('coh',4,'4 of 5')}${chip('coh',5,'all 5')}</div>
    <div class="subnav">${chip('per',5,'≤5 a game')}${chip('per',7,'≤7')}${chip('per',9,'≤9')}${chip('games',5,'top 5 games')}${chip('games',6,'top 6')}${chip('games',8,'top 8')}</div>
    <div class="subnav">${sps.map(s=>chip('sp',s,s==='all'?'All sports':(SGP_SP_LAB[s]||s))).join('')}${chip('dk',f.dk?0:1,f.dk?'✓ DraftKings lines only':'Any line')}</div>
    <div class="sub mono" style="font-size:9px;color:var(--mute)">A prop shows DraftKings' price on that exact line when its board has it (and how far the calibrated chance is above or below the price). Chances are the product of each leg's calibrated chance — a same-game parlay's legs move together, so the book prices it shorter. In the ledger, a prop all five characters clear hit 79%; one only 1–2 of them clear, about 65%.</div></div>`;
  if(!D.games.length)return head+`<div class="tkt"><div class="sub">No game today has two or more legs at ${Math.round(f.th*100)}%+ with ${f.coh} of 5 characters behind them yet${f.coh>3||f.th>0.65?' — try a lower bar above':''}. Props and sides fill in as the characters make today's calls.</div></div>`;
  const combos=D.combos.slice(0,40);
  return head+`<div class="sbar"><h2>The slates — ${D.combos.length} combos</h2><div class="ln"></div></div>${combos.length?combos.map(sgpComboHtml).join(''):`<div class="sub">Fewer than 4 games qualify — the best single-game SGPs are below.</div>`}${D.combos.length>40?`<div class="sub mono" style="font-size:9.5px">Showing the 40 likeliest of ${D.combos.length}.</div>`:''}
    <div class="sbar"><h2>The games, the Banker's order</h2><div class="ln"></div></div>${D.games.map(sgpGameHtml).join('')}`;}
function sgpRepaint(){try{if(typeof BUILD_MODE!=='undefined'&&BUILD_MODE==='sgp'&&typeof renderTickets==='function')renderTickets();}catch(e){}}
