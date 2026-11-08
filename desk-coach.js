/* ═══ THE COACH, REBUILT (v2.93.0) ═════════════════════════════════════════════════════════════════════════════════════
   Loaded on every sport page after desk-fcst.js.

   Nov 8, 1:25 AM: "both need to make a predicted final score for all calls, independent from anyone else's, based on their
   skillsets. The coach is supposed to be a bridge between the calibration feature and the characters… he sees the flaws and
   makes sure they're corrected in ways that are outside the box… he knows what the other characters are doing, he's not
   influenced by it, but he makes sure nobody ever has too much dip on their chip via strategic calibrations, seeing his own
   skills vs the other characters." 1:26 AM: "Also the coach reads all news articles about the games he's calling."

   §1 · THE CLIPBOARD (strategic calibration). For every character's lane — sport × bet type × favorite/dog/over/under — he
        compares how sure its sure calls (60%+) say they are with how often they're right, and scales its confidence to the
        truth: a lane that says 70% and hits 60% is reined in, one that says 65% and hits 72% gets room. A prior worth twenty
        70% calls keeps a thin lane near face value; never above 92%. A rebuilt character's gut is judged only on its own
        graded calls, not the old ideology's. It decides what's OFFICIAL (and so what reaches the Banker's sheet) — the characters' own numbers
        are left as they made them. He coaches himself the same way.
   §2 · GROUPTHINK. When five characters agree, does it hit more than when two do? Sport by sport, against the prices. If
        it doesn't, the Banker stops paying extra for a crowd.
   §3 · HIS OWN GAME. A predicted score for every game, from nobody else's numbers: each team's season scoring and defense,
        adjusted for who they played, then what a coach sees — rest and back-to-backs, short weeks, the letdown after a big
        win, the look-ahead to a big game next, the bounce-back after a beating, revenge for the last meeting, the weather at
        kickoff, and the news (who's out, a quarterback or goalie change, a fired coach, a suspension, turmoil). His side and
        total come from his score against the line; official at 70+. */

const COACH_IDX_K='d4.feedcache.coachidx',COACH_SHK=60,COACH_CEIL=0.92;
const COACH_SIG={nfl:13.5,ncaaf:16,nba:12,ncaab:10.5,nhl:2.2},COACH_TSIG={nfl:10,ncaaf:13,nba:13,ncaab:11,nhl:1.6},COACH_HFA={nfl:1.8,ncaaf:2.6,nba:2.2,ncaab:3.0,nhl:0.25};
let COACH_D=null;
function coachStore(data){if(!data||!data.g)return 0;set(COACH_IDX_K,{ts:data.ts,g:data.g});COACH_D=null;return Object.keys(data.g).length;}
function coachIdx(){if(COACH_D&&Date.now()-COACH_D._t<60e3)return COACH_D.v;const v=roGet(COACH_IDX_K,null,60e3);COACH_D={v,_t:Date.now()};return v;}
function coachGameFile(sp,a,h){const D=coachIdx();if(!D)return null;return D.g[sp+'|'+a+'@'+h]||(typeof mgAb==='function'?D.g[sp+'|'+mgAb(sp,a)+'@'+mgAb(sp,h)]:null)||null;}

/* §1 · the clipboard ─────────────────────────────────────────────────────────────────────────────────────────────── */
/* a call's confidence as its character made it: the gut (Dog, Historian, Coach) or the confidence */
function coachBase(x){if(!x)return null;if(x.dG!=null)return x.dG/100;if(x.hG!=null)return x.hG/100;if(x.cG!=null)return x.cG/100;if(x.oG!=null)return x.oG/100;if(x.bG!=null)return x.bG/100;if(x.kG!=null)return x.kG/100;return x.cf!=null?+x.cf:x.cfr!=null?+x.cfr:null;}
function coachRoleOf(x){return typeof bkRole==='function'?bkRole(x.market,x.side,x.line,x.price):(x.market==='total'?(/under/i.test(x.side)?'under':'over'):(+x.price<0?'fav':'dog'));}
let COACH_B=null;
/* a gut-based call (the rebuilt Dog, Historian, Coach) is judged only against that gut's own graded calls — the old
   ideology's record isn't the new one's */
const coachGutTag=x=>x.dG!=null||x.hG!=null||x.cG!=null||x.oG!=null||x.bG!=null||x.kG!=null?'g':'c';
/* the scale on a lane: how far its sure calls (60%+) land above a coin flip, against how far they claim to — with a prior
   worth twenty 70% calls at face value, so a thin lane barely moves */
/* he never rewrites history: a call on day D is judged only by what was graded before D, and nothing before his first day
   (Nov 8) is touched — the official record of every earlier day stands as it was posted */
const COACH_FROM='2026-11-08';
function coachBook(D){D=String(D||today()).slice(0,10);const V=roGet(VOICES_KEY,[],30e3)||[];const sig=typeof ledgerSig==='function'?ledgerSig(V):V.length;
  if(!COACH_B||COACH_B.sig!==sig)COACH_B={sig,by:{}};if(COACH_B.by[D])return COACH_B.by[D];
  const B={};const put=(k,y,c)=>{const o=B[k]||(B[k]={n:0,w:0,sy:0,sc:0,c:0});o.n++;o.w+=y;o.sy+=y-0.5;o.sc+=c-0.5;o.c+=c;};
  V.forEach(x=>{if(!x||!x.graded||x.hit==null||x.push||!['ml','spread','total'].includes(x.market)||!CHARS[x.voice]||String(x.date).slice(0,10)>=D)return;const c=coachBase(x);if(c==null||c<0.6)return;const y=x.hit?1:0;const g=coachGutTag(x);
    put([x.voice+(g==='g'?'~':''),x.sp,x.market,coachRoleOf(x)].join('|'),y,c);put(x.voice+(g==='g'?'~':'')+'|*',y,c);});
  Object.values(B).forEach(o=>{o.k=Math.max(0.35,Math.min(1.25,(o.sy+4)/(o.sc+4)));o.hit=o.w/o.n;o.say=o.c/o.n;});
  COACH_B.by[D]=B;return B;}
/* the confidence the Coach lets a call carry: its lane's truth, else the character's overall truth (half strength) */
/* he steps in on real flaws, not noise: a lane within ±10% of its word is left alone */
const coachBand=k=>k>=0.9&&k<=1.1?1:k;
function coachK(x){const d=String(x.date||today()).slice(0,10);if(d<COACH_FROM)return 1;const B=coachBook(d);const v=x.voice+(coachGutTag(x)==='g'?'~':'');const L=B[[v,x.sp,x.market,coachRoleOf(x)].join('|')];if(L&&L.n>=12)return coachBand(L.k);const A=B[v+'|*'];return A&&A.n>=20?coachBand(1+(A.k-1)*0.5):1;}
function coachConf(x){const c=coachBase(x);if(c==null)return null;let k=1;try{k=coachK(x);}catch(e){}return Math.min(COACH_CEIL,0.5+k*(c-0.5));}

/* §2 · groupthink — from the master calibration's leg rows: edge over the prices by how many characters agreed ───────── */
let COACH_GT=null;
function coachGroupthink(){if(COACH_GT&&Date.now()-COACH_GT.t<10*60e3)return COACH_GT.v;const out={};
  try{(typeof mcalRowList==='function'?mcalRowList():[]).forEach(r=>{if(r.t!=='s'||r.y==null||!(r.q>0))return;const b=r.n>=5?'5+':r.n>=3?'3-4':'1-2';const o=(out[r.sp]=out[r.sp]||{})[b]||(out[r.sp][b]={n:0,e:0});o.n++;o.e+=r.y-r.q;});
    Object.values(out).forEach(S=>Object.values(S).forEach(o=>{o.edge=o.e/o.n;}));}catch(e){}
  COACH_GT={t:Date.now(),v:out};return out;}
/* does a bigger crowd earn more in this sport? 1 = yes, 0 = no, 0.5 = can't tell yet */
function coachAgreeW(sp){const S=coachGroupthink()[sp];if(!S||!S['5+']||!S['1-2']||S['5+'].n<40||S['1-2'].n<40)return 0.5;return S['5+'].edge-S['1-2'].edge>0.02?1:0;}

/* §3 · his own game ──────────────────────────────────────────────────────────────────────────────────────────────── */
function coachGame(o){const sp=o.sp,sig=COACH_SIG[sp];if(!sig||typeof dogTeam!=='function')return null;
  const A=dogTeam(sp,o.a),H=dogTeam(sp,o.h);const D=typeof dogTeams==='function'?dogTeams():null;const L=(D&&D.lg&&D.lg[sp])||{};const ppg=L.ppg;if(!A||!H||!ppg)return null;
  const k={nfl:4,ncaaf:5,nba:10,nhl:12,ncaab:8}[sp]||6;const sh=(v,n)=>(v*n+ppg*k)/(n+k);
  /* the base: each offense against the other's defense, season-long, pulled to average while it's young */
  let a=(sh(A.pf,A.n)+sh(H.pa,H.n))/2,h=(sh(H.pf,H.n)+sh(A.pa,A.n))/2;const U=(D.up||{})[sp+'|'+o.a+'@'+o.h]||{};const hfa=U.neutral?0:(COACH_HFA[sp]||0);h+=hfa/2;a-=hfa/2;
  const why=[],twhy=[];const unit=sp==='nhl'?0.05:sp==='nba'||sp==='ncaab'?0.02:1;   /* hockey and hoops: adjustments are shares of the score, football: points */
  const adj=(side,v,lab)=>{const d=unit===1?v:v*(side==='a'?a:h)*unit;if(Math.abs(d)<0.05)return;if(side==='a')a+=d;else h+=d;why.push({v:+d.toFixed(2),lab});};   /* v = points for the team named (− hurts it) */
  const F=coachGameFile(sp,o.a,o.h);const nm={a:o.a,h:o.h};
  /* rest */
  const rest={a:U.restA,h:U.restH};['a','h'].forEach(s=>{const r=rest[s];if(r==null)return;
    if((sp==='nba'||sp==='nhl'||sp==='ncaab')&&r<=1)adj(s,-1.5,`${nm[s]} on a back-to-back`);
    if((sp==='nfl'||sp==='ncaaf')&&r<=5)adj(s,-1.2,`${nm[s]} on a short week`);if((sp==='nfl'||sp==='ncaaf')&&r>=13)adj(s,0.8,`${nm[s]} off a bye`);});
  /* spots: the letdown, the look-ahead, the bounce-back — from the file */
  if(F)['a','h'].forEach(s=>{const T=F[s];if(!T)return;const oppNow=s==='a'?H:A;
    if(T.last&&T.last.opw!=null&&oppNow&&T.last.m>=(unit===1?14:sp==='nhl'?3:15)&&T.last.opw>oppNow.pw+(unit===1?3:2))adj(s,unit===1?-1.5:-1,`${nm[s]} letdown spot: beat ${T.last.opp} by ${T.last.m}, now a lesser team`);
    if(T.last&&T.last.m<=-(unit===1?20:sp==='nhl'?4:25))adj(s,unit===1?1:0.8,`${nm[s]} bounce-back after losing by ${-T.last.m}`);
    if(T.next&&T.next.opw!=null&&oppNow&&T.next.opw>oppNow.pw+(unit===1?6:4)&&(Date.parse(T.next.d)-Date.parse(F.st))<9*864e5)adj(s,unit===1?-1.2:-0.8,`${nm[s]} look-ahead: ${T.next.opp} next`);
    /* the news */
    const f=T.fl||{};if(f.out)adj(s,-Math.min(2,f.out)*(unit===1?1.2:1),`${nm[s]} news: ${f.out} report${f.out>1?'s':''} of a player out`);
    if(f.qb&&(sp==='nfl'||sp==='ncaaf'))adj(s,-2.5,`${nm[s]} news: a quarterback change`);if(f.goalie&&sp==='nhl')adj(s,-0.6,`${nm[s]} news: goalie talk`);
    if(f.coach)adj(s,unit===1?-1:-0.8,`${nm[s]} news: a coaching change`);if(f.susp)adj(s,unit===1?-0.8:-0.6,`${nm[s]} news: a suspension`);if(f.turmoil)adj(s,unit===1?-0.8:-0.6,`${nm[s]} news: turmoil`);
    if(f.motive)adj(s,unit===1?0.6:0.5,`${nm[s]} news: something to play for`);});
  /* revenge: lost the last meeting */
  try{if(typeof histPair==='function'){const M=histPair(sp,o.a,o.h);if(M.length){const w=M[0][1];const loser=(w===o.h||(typeof mgAb==='function'&&mgAb(sp,w)===mgAb(sp,o.h)))?'a':'h';adj(loser,unit===1?0.8:0.6,`${nm[loser]} revenge: lost the last meeting (${String(M[0][0]).slice(0,4)})`);}}}catch(e){}
  /* the weather at kickoff */
  let wf=1;if(F&&F.wx&&(sp==='nfl'||sp==='ncaaf')&&!F.indoor){const W=F.wx;if(W.wind>=25){wf*=0.88;twhy.push({v:-12,lab:`wind ${W.wind} mph`});}else if(W.wind>=15){wf*=0.94;twhy.push({v:-6,lab:`wind ${W.wind} mph`});}
    if(W.pop!=null&&W.pop>=60){wf*=0.96;twhy.push({v:-4,lab:`${W.pop}% chance of ${/snow/i.test(W.cond)?'snow':'rain'}`});}if(W.temp!=null&&W.temp<25){wf*=0.96;twhy.push({v:-4,lab:`${W.temp}°F`});}}
  a*=wf;h*=wf;
  const ps={a:+a.toFixed(1),h:+h.toFixed(1)};
  return{ps,why:why.sort((x,y)=>Math.abs(y.v)-Math.abs(x.v)),twhy,wx:F&&F.wx||null,file:F};}
/* his calls: his score against the line */
const COACH_PS={};
function coachCallsV2(sp,g,Ln,hl,hlSim,tl,tlSim,add){const o={sp,a:g.away.abbr,h:g.home.abbr};const R=coachGame(o);if(!R)return null;COACH_PS[sp+'|'+o.a+'@'+o.h]=R.ps;
  const nc=typeof normCdf==='function'?normCdf:(z=>0.5*(1+Math.tanh(z*0.7978845608*(1+0.044715*z*z))));
  const w=L=>L.slice(0,5).map(x=>`${x.v>0?'+':''}${x.v} ${x.lab}`);const base={pa:R.ps.a,ph:R.ps.h};
  const mC=R.ps.h-R.ps.a;
  if(hl!=null&&!hlSim){const need=-(+hl);const pH=nc((mC-need)/COACH_SIG[sp]);const side=pH>=0.5?'home':'away';const p=Math.max(pH,1-pH);const cG=Math.round(p*100);
    if(cG>=60)add('Coach','spread',side,{...base,cG,why:w(R.why).concat([`his score ${o.a} ${Math.round(R.ps.a)} – ${Math.round(R.ps.h)} ${o.h} vs the line ${hl>0?'+':''}${hl}`])});
    const pr=side==='home'?Ln.mlH&&amerOk(Ln.mlH.price):Ln.mlA&&amerOk(Ln.mlA.price);const pW=nc((side==='home'?mC:-mC)/COACH_SIG[sp]);const cW=Math.round(pW*100);
    if(cW>=75&&pr!=null&&+pr>=-300&&+pr<=250)add('Coach','ml',side,{...base,cG:cW,why:w(R.why)});}
  if(tl!=null&&!tlSim){const T=R.ps.a+R.ps.h;const pO=nc((T-(+tl))/COACH_TSIG[sp]);const side=pO>=0.5?'over':'under';const cG=Math.round(Math.max(pO,1-pO)*100);
    if(cG>=60)add('Coach','total',side,{...base,cG,why:w(R.twhy).concat([`his total ${T.toFixed(1)} vs ${tl}`])});}
  return R;}
function coachPredFor(sp,g){return COACH_PS[sp+'|'+g.away.abbr+'@'+g.home.abbr]||null;}

/* the clipboard card ────────────────────────────────────────────────────────────────────────────────────────────── */
function coachCardHtml(){try{const B=coachBook();const rl={fav:'favorites',dog:'dogs',over:'overs',under:'unders',heavy:'heavy favorites (-500+)'},ml={ml:'ML',spread:'spread',total:'total'};
  const lanes=Object.entries(B).filter(([k,o])=>!k.endsWith('|*')&&o.n>=20).map(([k,o])=>{const [v,sp,mk,role]=k.split('|');return{v,sp,mk,role,...o};});
  const rein=lanes.filter(o=>o.k<0.85).sort((a,b)=>a.k-b.k).slice(0,8),free=lanes.filter(o=>o.k>1.05).sort((a,b)=>b.k-a.k).slice(0,5);
  const ln=o=>`${txtEsc((CHARS[o.v.replace('~','')]||{}).chip||o.v)}${o.v.endsWith('~')?' (new gut)':''} ${(o.sp||'').toUpperCase()} ${ml[o.mk]||o.mk} ${rl[o.role]||o.role}: says ${Math.round(o.say*100)}%, hits ${Math.round(o.hit*100)}% on ${o.n} → <b>×${o.k.toFixed(2)}</b>`;
  const GT=coachGroupthink();const gt=Object.entries(GT).filter(([sp,S])=>S['5+']&&S['1-2']&&S['5+'].n>=40&&S['1-2'].n>=40).map(([sp,S])=>`${sp.toUpperCase()}: 5+ agree ${S['5+'].edge>=0?'+':''}${(S['5+'].edge*100).toFixed(1)} vs the prices, 1–2 agree ${S['1-2'].edge>=0?'+':''}${(S['1-2'].edge*100).toFixed(1)} → ${coachAgreeW(sp)===1?'the crowd earns it':'<b>a crowd isn\'t more right — no extra for agreeing</b>'}`);
  const me=B['Coach|*'];const V=roGet(VOICES_KEY,[],30e3)||[];const d=today();
  const L=V.filter(x=>x&&x.voice==='Coach'&&String(x.date).slice(0,10)===d&&!x.graded&&x.cG!=null).sort((a,b)=>(+b.cG||0)-(+a.cG||0)).slice(0,6);
  const rows=L.map(x=>{const F=coachGameFile(x.sp,...String(x.game).split('@'));const heads=F?[...((F.a||{}).heads||[]),...((F.h||{}).heads||[])].filter(h=>h.f&&h.f.length).slice(0,2):[];
    return`<div class="mono" style="font-size:10.5px;padding:5px 0;border-bottom:1px solid var(--rule)">${(SP_LAB[x.sp]||'').split(' ')[0]} <b style="color:var(--chalk)">${txtEsc(x.pick)}</b>${x.price!=null?` <span style="color:var(--gold)">${x.price>0?'+':''}${x.price}</span>`:''} · ${x.cG}%${x.pa!=null?` · his score ${Math.round(x.pa)}–${Math.round(x.ph)}`:''}
      <br><span style="color:var(--mute);font-size:9.5px">${(x.why||[]).slice(0,3).map(txtEsc).join(' · ')}</span>${F&&F.wx?`<br><span style="font-size:9.5px">🌦 ${F.wx.temp}°F · wind ${F.wx.wind} mph${F.wx.pop!=null?` · ${F.wx.pop}% precip`:''} · ${txtEsc(F.wx.cond||'')}</span>`:''}${heads.map(h=>`<br><span style="font-size:9.5px;color:var(--chalk)">📰 ${txtEsc(h.h)}</span>`).join('')}</div>`;}).join('');
  const D=coachIdx();
  return`<div class="tkt" style="margin-top:8px;border-left:3px solid #5FD3E8"><h3 style="margin:0 0 2px">🧢 The Coach's clipboard</h3>
    <div class="sub" style="font-size:10px">He keeps everyone honest: each character's confidence is scaled to how often that lane is actually right — that's what makes a pick official. He reads the news on every game he calls.</div>
    ${rein.length?`<div class="mktlab" style="margin-top:6px">Reined in</div><div class="mono" style="font-size:10px;line-height:1.55">${rein.map(ln).join('<br>')}</div>`:''}
    ${free.length?`<div class="mktlab" style="margin-top:6px">Given room</div><div class="mono" style="font-size:10px;line-height:1.55">${free.map(ln).join('<br>')}</div>`:''}
    ${gt.length?`<div class="mktlab" style="margin-top:6px">Groupthink check</div><div class="mono" style="font-size:10px;line-height:1.55">${gt.join('<br>')}</div>`:''}
    <div class="mono" style="font-size:9.5px;color:var(--mute);margin-top:4px">${me?`Himself: says ${Math.round(me.say*100)}%, hits ${Math.round(me.hit*100)}% on ${me.n} → ×${me.k.toFixed(2)}`:''}${D?` · news &amp; weather for ${Object.keys(D.g||{}).length} games`:' · news file not loaded yet'}</div>
    ${rows?`<div class="mktlab" style="margin-top:6px">His calls today</div>${rows}`:''}</div>`;}catch(e){return'';}}
if(typeof window!=='undefined'&&!window.__COACH_V2__){window.__COACH_V2__=1;
  if(typeof dogCardHtml==='function'){const D0=dogCardHtml;dogCardHtml=function(){return D0()+coachCardHtml();};}}
