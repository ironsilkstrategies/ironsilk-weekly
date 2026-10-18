/* ═══ THE WORLD (v2.46) — the league's weather, read every day ═══════════════════════════
   Loaded on every sport page after desk-heir.js.

   The characters learned in one world. When the league shifts under them — home teams
   winning less, overs hitting more, favorites no longer covering — they should notice it,
   say it in plain words, and adapt. Each sport's weather is read from its own graded games
   (the Sim reads and grades every game): the last two weeks against an INHERITED baseline —
   the league's long-run norm carried forward like an inheritance, updated by everything
   graded before those two weeks.
   · a shift past luck (2σ) → 🌥 WATCH: the journal notes it and the voices mention it;
   · far past luck (3σ) → ⛈ CHANGED: the journal records it with its signature (a repeat is
     recognized), the voices say it, and every character working that market gets a
     FAST-LEARNING heir in the shadows (forgets old results in three weeks, learns twice as
     fast). It takes a chair only through the Generation Book, like every heir: the weather
     never changes a pick by itself. */

const WORLD_KEY='d4.world',WORLD_WIN=14,WORLD_MIN=30,WORLD_PRIOR_N=60,WORLD_FROM='2026-10-18';
/* the inheritance: long-run league norms (home winners, overs vs the number, favorites outright, favorites covering;
   hockey and baseball favorites "cover" the 1.5 puck/run line far less often than they win) */
const WORLD_NORM={nfl:{home:0.55,over:0.49,favml:0.66,favats:0.49},ncaaf:{home:0.58,over:0.49,favml:0.74,favats:0.49},
  nba:{home:0.56,over:0.50,favml:0.68,favats:0.49},ncaab:{home:0.63,over:0.50,favml:0.72,favats:0.49},
  nhl:{home:0.54,over:0.49,favml:0.59,favats:0.37},mlb:{home:0.53,over:0.49,favml:0.58,favats:0.42}};
const WORLD_MET={home:{lab:'home teams winning',mk:['ml','spread']},over:{lab:'overs against the number',mk:['total']},favml:{lab:'favorites winning outright',mk:['ml']},favats:{lab:'favorites covering',mk:['spread']}};
/* one row per graded game, from the Sim's three calls on it */
function worldGames(V){const G=new Map();
  (V||[]).forEach(x=>{if(!x||x.voice!=='Sim'||!x.graded||x.hit==null||x.push||x.pre||!WORLD_NORM[x.sp])return;const d=String(x.date||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return;
    const k=x.sp+'|'+x.game+'|'+d;const g=G.get(k)||{sp:x.sp,d,game:x.game};const hit=!!x.hit,pr=+x.price;
    if(x.market==='ml'){g.home=((x.side==='home')===hit)?1:0;if(isFinite(pr)&&(pr<=-120||pr>=110))g.favml=((pr<0)===hit)?1:0;}
    else if(x.market==='total'&&!x.simLine&&x.line!=null&&x.price!=null)g.over=((x.side==='over')===hit)?1:0;
    else if(x.market==='spread'&&!x.simLine&&x.line!=null&&x.price!=null&&+x.line!==0)g.favats=((+x.line<0)===hit)?1:0;
    G.set(k,g);});
  return[...G.values()];}
/* the weather for one sport on one day: the last two weeks (not counting the day itself) against the inheritance */
function worldRead(G,sp,d){const from=dayShift(d,-WORLD_WIN);const out={};
  Object.keys(WORLD_MET).forEach(m=>{const N=(WORLD_NORM[sp]||{})[m];if(N==null)return;let nr=0,wr=0,nb=0,wb=0;
    G.forEach(g=>{if(g.sp!==sp||g[m]==null||g.d>=d)return;if(g.d>=from){nr++;wr+=g[m];}else{nb++;wb+=g[m];}});
    const pb=(wb+N*WORLD_PRIOR_N)/(nb+WORLD_PRIOR_N),pr=nr?wr/nr:null;
    const se=pr!=null?Math.sqrt(Math.max(1e-6,pb*(1-pb))*(1/nr+1/(nb+WORLD_PRIOR_N))):null;const z=pr!=null?(pr-pb)/se:0;
    out[m]={nr,pr:pr!=null?+pr.toFixed(3):null,nb,pb:+pb.toFixed(3),z:+z.toFixed(2),dir:z>=0?'up':'down'};});
  return out;}
/* ── THE WORLD BOOK ── */
Object.assign(BOOK_ENDS,{QUIET:{ok:1,ico:'💤',lab:'Not enough games yet to read the weather'},STABLE:{ok:1,ico:'🌤',lab:'Same world — nothing past luck'},
  WATCH:{ok:1,ico:'🌥',lab:'A shift past luck — watching it'},CHANGED:{ok:1,ico:'⛈',lab:'The world changed — the characters adapt'}});
bookDefine({id:'world',title:'The world — has the league changed under the characters?',start:'enough',
  pages:{
    enough:{q:'Enough graded games in the last two weeks to read the weather?',to:['QUIET','shift'],ask:c=>c.nr<WORLD_MIN?['QUIET',`${c.nr} games in two weeks — not enough to tell`]:['shift',`${c.nr} games`]},
    shift:{q:'Is the shift bigger than luck?',to:['CHANGED','WATCH','STABLE'],ask:c=>Math.abs(c.z)>=3?['CHANGED',`${Math.abs(c.z).toFixed(1)}σ ${c.z>0?'above':'below'} the inheritance`]:Math.abs(c.z)>=2?['WATCH',`${Math.abs(c.z).toFixed(1)}σ ${c.z>0?'above':'below'} — past luck, not proven`]:['STABLE',`within luck (${c.z>=0?'+':''}${(+c.z).toFixed(1)}σ)`]}},
  vars:{nr:[10,30,80],z:[-3.5,-2.5,-1,0,1,2.5,3.5]}});
function worldRules(c,R){const e=R.end,a=Math.abs(c.z);if(e==='CHANGED'&&!(c.nr>=WORLD_MIN&&a>=3))return'declared a change without the evidence';
  if(e==='WATCH'&&!(c.nr>=WORLD_MIN&&a>=2&&a<3))return'watching without a real shift';if(e==='QUIET'&&c.nr>=WORLD_MIN)return'called quiet with enough games';
  if(e==='STABLE'&&(c.nr<WORLD_MIN||a>=2))return'called stable through a shift';return null;}
/* the daily pass: every sport's weather; a NEW change goes in the journal and brings a fast-learning heir */
let WORLD_MEMO=null;
function worldRun(force){const d=today();if(!force&&WORLD_MEMO&&WORLD_MEMO.d===d&&Date.now()-WORLD_MEMO.ts<30*60e3)return WORLD_MEMO;
  const V=roGet(VOICES_KEY,[],30e3)||[];const G=worldGames(V);const day={};const born=[];
  Object.keys(WORLD_NORM).forEach(sp=>{const W=worldRead(G,sp,d);const S={};
    Object.entries(W).forEach(([m,o])=>{const R=bookWalkSync(BOOKS.world,{nr:o.nr,z:o.z},null);S[m]={...o,st:R.end,why:R.why};});
    if(Object.values(S).some(o=>o.nr>0))day[sp]=S;});
  const A=get(WORLD_KEY,{})||{};const prev=Object.keys(A).filter(k=>k<d).sort().pop();
  if(JSON.stringify(A[d])!==JSON.stringify(day)){A[d]=day;Object.keys(A).sort().slice(0,-60).forEach(k=>delete A[k]);set(WORLD_KEY,A);}   /* written only when the weather changes */
  if(d>=WORLD_FROM)Object.entries(day).forEach(([sp,S])=>Object.entries(S).forEach(([m,o])=>{if(o.st!=='CHANGED')return;
    const sig=`world-${sp}-${m}-${o.dir}`;const was=prev&&A[prev]&&A[prev][sp]&&A[prev][sp][m];if(was&&was.st==='CHANGED'&&was.dir===o.dir)return;   /* only the day it turns */
    const seen=journalSeen(sig,d);
    journalAdd({kind:'world',sig,sp,sev:'warn',title:`⛈ ${vxSp(sp)}: ${WORLD_MET[m].lab} ${o.dir==='up'?'jumped':'dropped'}`,
      what:`${Math.round(o.pr*100)}% over the last two weeks (${o.nr} games) against an inherited ${Math.round(o.pb*100)}% — ${Math.abs(o.z).toFixed(1)}σ.${seen.n?` Seen before (${seen.last}).`:''} Every character working ${WORLD_MET[m].mk.map(k=>({ml:'moneylines',spread:'spreads',total:'totals'})[k]).join(' and ')} gets a fast-learning heir in the shadows.`});
    try{if(typeof heirsAll==='function'){const H=heirsAll();const from=dayShift(d,-30);const vs=new Set();V.forEach(x=>{if(x&&x.sp===sp&&CHARS[x.voice]&&WORLD_MET[m].mk.includes(x.market)&&String(x.date).slice(0,10)>=from)vs.add(x.voice+'|'+x.market);});
      let n=0;vs.forEach(k=>{const[v,mk]=k.split('|');const C=heirCell(H,v,mk);if(heirSpawnWith(C,H,d,[['hl',21],['lr',0.08]],`born when ${vxSp(sp)} ${WORLD_MET[m].lab} ${o.dir==='up'?'jumped':'dropped'}`)){n++;born.push(k);}});if(n)set(HEIR_KEY,H);}}catch(e){console.warn('world heirs',e);}}));
  WORLD_MEMO={d,ts:Date.now(),day,born};return WORLD_MEMO;}
/* the weather that stood on a call's day (the day itself, else the latest day before it) */
function worldOn(sp,d){try{if(d===today()){const R=worldRun();return R.day[sp]||null;}const A=roGet(WORLD_KEY,{},60e3)||{};const k=Object.keys(A).filter(x=>x<=d).sort().pop();return k&&A[k]?A[k][sp]||null:null;}catch(e){return null;}}
/* in plain words: the shift, and whether it helps or fights this pick */
function worldLine(x){try{const sp=x.sp,m=mkNorm(x.m||x.market),sd=x.sd||x.side,d=String(x.date||x.d||today()).slice(0,10);if(d<WORLD_FROM)return null;
    const S=worldOn(sp,d);if(!S)return null;const L=vxSp(sp);const pc=o=>Math.round(o.pr*100)+'%';const out=[];
    const add=(o,mine,txt)=>{if(!o||(o.st!=='WATCH'&&o.st!=='CHANGED'))return;out.push({w:Math.abs(o.z),help:mine===(o.dir==='up'),txt:txt+(o.st==='CHANGED'?' — the league has changed':'')+'.'});};
    if(m==='total'&&S.over)add(S.over,sd==='over',`Across ${L}, overs have hit ${pc(S.over)} against the number the last two weeks (${S.over.nr} games; it used to be about ${Math.round(S.over.pb*100)}%)`);
    if((m==='ml'||m==='spread')&&S.home)add(S.home,sd==='home',`Home teams have won ${pc(S.home)} across ${L} the last two weeks (${S.home.nr} games; it used to be about ${Math.round(S.home.pb*100)}%)`);
    const pr=+(x.price);const fav=m==='spread'?(x.line!=null?+x.line<0:null):isFinite(pr)&&(pr<=-120||pr>=110)?pr<0:null;
    if(m==='ml'&&S.favml&&fav!=null)add(S.favml,fav,`Favorites have won ${pc(S.favml)} outright across ${L} the last two weeks (it used to be about ${Math.round(S.favml.pb*100)}%)`);
    if(m==='spread'&&S.favats&&fav!=null)add(S.favats,fav,`Favorites have covered ${pc(S.favats)} across ${L} the last two weeks (it used to be about ${Math.round(S.favats.pb*100)}%)`);
    return out.sort((a,b)=>b.w-a.w)[0]||null;}catch(e){return null;}}
/* the voices hear the weather: a shift that helps the pick is part of the story; one that fights it is the worry */
if(typeof charRead==='function'&&typeof window!=='undefined'&&!window.__WORLD_VX__){window.__WORLD_VX__=1;const CR0=charRead;
  charRead=function(v,x,c){const R=CR0(v,x,c);try{if(!R||R.__world)return R;R.__world=1;const w=worldLine(x);if(!w)return R;
      if(w.help){if(R.story.length<3)R.story.push(w.txt);}
      else R.worry=/nothing here is a lock\.$/.test(R.worry||'')||!R.worry?w.txt:R.worry+' '+w.txt;}catch(e){}return R;};}
/* the board, in the Book view */
function worldBoardHtml(){let R=null;try{R=worldRun();}catch(e){return'';}const sps=Object.keys(R.day||{});if(!sps.length)return'';
  const cell=o=>o?`<span title="${txtEsc(o.why||'')}">${(BOOK_ENDS[o.st]||{}).ico||''}</span> ${o.pr!=null?Math.round(o.pr*100)+'%':'—'}<span style="color:var(--mute)"> / ${Math.round(o.pb*100)}%</span>`:'—';
  return`<div class="tkt"><h3 style="margin:0 0 4px">🌦 The world — the league's weather</h3><div class="sub" style="font-size:10.5px">The last two weeks against the inheritance (the league's long-run norm, updated by everything before). 🌥 a shift past luck · ⛈ the world changed — the characters in that market get a fast-learning heir.</div>
    <div style="overflow-x:auto"><table class="mono" style="width:100%;font-size:10.5px;border-collapse:collapse;margin-top:4px"><tr style="color:var(--mute)"><td></td>${Object.keys(WORLD_MET).map(m=>`<td>${txtEsc(WORLD_MET[m].lab)}</td>`).join('')}</tr>
    ${sps.map(sp=>`<tr><td><b>${txtEsc(vxSp(sp))}</b></td>${Object.keys(WORLD_MET).map(m=>`<td>${cell(R.day[sp][m])}</td>`).join('')}</tr>`).join('')}</table></div></div>`;}
if(typeof bookViewHtml==='function'&&typeof window!=='undefined'&&!window.__WORLD_BV__){window.__WORLD_BV__=1;const BV1=bookViewHtml;
  bookViewHtml=function(){const h=BV1();try{const i=h.indexOf('<div class="tkt"><h3 style="margin:0 0 4px">Today\'s story');return i>=0?h.slice(0,i)+worldBoardHtml()+h.slice(i):h+worldBoardHtml();}catch(e){return h;}};}
try{if(typeof AP_STEPS!=='undefined'&&!AP_STEPS.some(s=>s[0]==='world')){const i=AP_STEPS.findIndex(s=>s[0]==='heirs');
  AP_STEPS.splice(i>=0?i:AP_STEPS.length,0,['world','The world','Every sport\'s weather against its inheritance; a change brings fast-learning heirs before the Generation Book reads.',()=>Object.keys(worldRun(true).day).length]);}}catch(e){}
