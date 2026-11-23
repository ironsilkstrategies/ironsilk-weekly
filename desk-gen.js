/* ═══ BLOODLINES (v2.74) — the Generations, as an experience ═══════════════════════════════════════════
   One full-screen book, four rooms:
     👑 THE THRONE RACE — every heir in every bloodline, ranked by how close it is to taking the chair:
        unseen games (of 150), days in the shadows (of 14), its edge vs the bar, and the money check.
     🌳 FAMILY TREES   — pick a character: the original → each crowned generation → the champion now →
        heirs glowing in the shadows → the retired, faded. Tap any branch for its whole story, including
        the Generation Book's walk (every question it was asked and how it answered).
     📜 THE CHRONICLE  — crownings, retirements, births, and the season's chapter for every sport.
     💎 HEIRLOOMS & SCARS — the beliefs that keep paying, the ones costing it, and the lanes its losses blocked.
   Reads the live heirs (heirsRun); nothing here changes a pick. */
const GEN_MK={ml:'Moneylines',spread:'Spreads',total:'Totals'};
const GEN_CSS=`#genView{position:fixed;inset:0;z-index:99997;background:radial-gradient(1200px 600px at 80% -10%,rgba(245,197,66,.10),transparent),#070b14;color:#e2e8f0;overflow-y:auto;-webkit-overflow-scrolling:touch;font-family:system-ui,-apple-system,sans-serif}
#genView .gh{position:sticky;top:0;z-index:3;background:rgba(7,11,20,.92);backdrop-filter:blur(8px);padding:14px 16px 8px;border-bottom:1px solid rgba(245,197,66,.18)}
#genView .gt{font:900 22px/1.1 system-ui;letter-spacing:.5px}#genView .gt span{color:#f5c542}
#genView .tabs{display:flex;gap:6px;overflow-x:auto;margin-top:10px;padding-bottom:4px}#genView .tabs button{flex:0 0 auto;border:1px solid #334155;background:#0f172a;color:#cbd5e1;border-radius:999px;padding:7px 12px;font:700 13px system-ui}
#genView .tabs button.on{background:#f5c542;color:#111;border-color:#f5c542}
#genView .gb{padding:14px 16px 120px}
#genView .card{background:linear-gradient(180deg,#111a2e,#0b1220);border:1px solid #1e293b;border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:0 8px 30px rgba(0,0,0,.35)}
#genView .race{display:grid;grid-template-columns:44px 1fr;gap:10px;align-items:center}
#genView .rk{font:900 26px system-ui;color:#475569;text-align:center}#genView .rk.top{color:#f5c542}
#genView .bar{height:8px;border-radius:6px;background:#1e293b;overflow:hidden;margin-top:4px}#genView .bar i{display:block;height:100%;border-radius:6px}
#genView .lbl{display:flex;justify-content:space-between;font:600 11px ui-monospace,monospace;color:#94a3b8;margin-top:6px}
#genView .chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #334155;border-radius:999px;padding:6px 11px;margin:0 6px 6px 0;background:#0f172a;font:700 12.5px system-ui;color:#e2e8f0}
#genView .chip.on{box-shadow:0 0 0 2px currentColor inset}
#genView .muted{color:#94a3b8;font-size:12.5px}#genView .mono{font-family:ui-monospace,monospace}
#genView .node{cursor:pointer}#genView .node:hover circle{stroke-width:4}
#genView .tl{border-left:2px solid #334155;margin-left:8px;padding-left:14px}#genView .tl .ev{position:relative;margin:0 0 14px}
#genView .tl .ev:before{content:'';position:absolute;left:-21px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--c,#f5c542);box-shadow:0 0 12px var(--c,#f5c542)}
#genView .step{display:flex;gap:8px;align-items:flex-start;margin:6px 0;font-size:12.5px}#genView .step b{color:#f5c542}
@keyframes genGlow{0%,100%{opacity:.55}50%{opacity:1}}#genView .glow{animation:genGlow 2.4s ease-in-out infinite}
#genView .hero{background:radial-gradient(420px 200px at 100% 0,rgba(245,197,66,.18),transparent),linear-gradient(180deg,#131d33,#0b1220)}
#genView .hh{font:900 13px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#f5c542}
#genView .nb{font:800 19px/1.25 system-ui;margin-top:6px}#genView .nb b{color:#f5c542}#genView .nb span{font-weight:600;font-size:13px;color:#94a3b8}
#genView .cnt{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:12px}
#genView .cnt div{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:9px 4px;text-align:center}
#genView .cnt b{display:block;font:900 24px/1 system-ui}#genView .cnt span{display:block;margin-top:4px;font:700 10px system-ui;color:#94a3b8;text-transform:uppercase;letter-spacing:.03em}
#genView .jr{display:flex;align-items:flex-start;margin-top:14px}#genView .jr .ln{flex:1 1 6px;height:2px;background:#334155;margin-top:16px}
#genView .jr .n{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:4px;font:700 10px system-ui;color:#64748b;white-space:nowrap}
#genView .jr .n i{font-style:normal;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#0f172a;border:2px solid #334155;font-size:15px}
#genView .jr .n.on{color:#e2e8f0}#genView .jr .n.on i{border-color:#f5c542;box-shadow:0 0 12px rgba(245,197,66,.4)}
#genView .sec{font:900 15px system-ui;margin:18px 2px 10px}
#genView .fam{margin-bottom:6px}#genView .fh{font:800 13px system-ui;margin:0 2px 8px}
#genView .life{background:linear-gradient(180deg,#111a2e,#0b1220);border:1px solid #1e293b;border-radius:16px;padding:12px;margin-bottom:10px}
#genView .life.open{border-color:rgba(245,197,66,.45);box-shadow:0 8px 30px rgba(0,0,0,.35)}#genView .life:not(.open)>.lb,#genView .how:not(.open)>.lb{display:none}
#genView .life>.sm{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:10px;align-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
#genView .av{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;box-shadow:inset 0 0 0 2px rgba(255,255,255,.18)}#genView .av span{font-size:22px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}
#genView .lf-n{font:900 15px/1.2 system-ui}#genView .lf-s{font-size:11.5px;color:#94a3b8;margin-top:2px}
#genView .rd{font:900 22px/1 system-ui;text-align:right}#genView .rd small{display:block;margin-top:3px;font:700 9.5px system-ui;color:#94a3b8;text-transform:uppercase;letter-spacing:.03em;max-width:84px}
#genView .stc{display:inline-block;margin-top:5px;padding:3px 9px;border-radius:999px;font:800 11px system-ui}
#genView .stc.g{background:rgba(34,197,94,.15);color:#4ade80}#genView .stc.y{background:rgba(245,197,66,.14);color:#f5c542}#genView .stc.r{background:rgba(248,113,113,.15);color:#f87171}
#genView .stat{margin-top:12px}#genView .st-h{display:flex;justify-content:space-between;font:800 13.5px system-ui}
#genView .sb{height:12px;border-radius:7px;background:#1e293b;overflow:hidden;margin-top:5px}#genView .sb i{display:block;height:100%;border-radius:7px;transition:width .4s}
#genView .st-v{font-size:11.5px;color:#94a3b8;margin-top:4px;line-height:1.4}
#genView .when{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}#genView .when div{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:9px 10px}
#genView .when small{display:block;font:700 10px system-ui;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em}#genView .when b{display:block;font:900 15px system-ui;margin-top:3px}#genView .when span{font-size:11.5px;color:#94a3b8}
#genView .wt{margin-top:10px;font-size:12.5px;line-height:1.45;background:rgba(245,197,66,.07);border-radius:10px;padding:8px 10px}
#genView .log{margin-top:12px;border-left:2px solid #334155;padding-left:12px}#genView .log div{font-size:12.5px;line-height:1.4;margin:7px 0}#genView .log div b{color:#f5c542;margin-right:4px}
#genView .log div.fut{color:#64748b}#genView .log div.fut b{color:#64748b}
#genView .up{display:grid;grid-template-columns:86px minmax(0,1fr) auto;gap:8px;align-items:baseline;font-size:12.5px;padding:7px 0;border-bottom:1px solid #1e293b}#genView .up:last-child{border-bottom:0}
#genView .up b{color:#f5c542;font-size:12px}#genView .up small{color:#64748b;font-size:11px}
#genView .how .hw{cursor:pointer;font:800 14px system-ui;display:flex;justify-content:space-between}#genView .how .hw span{font:700 11px system-ui;color:#64748b}#genView .how.open .hw span{display:none}
#genView .how .step{margin-top:10px}#genView .how .step>b{flex:0 0 22px;height:22px;border-radius:50%;background:#f5c542;color:#111;display:grid;place-items:center;font-size:12px}`;
let GEN_TAB='home',GEN_CHAR=null,GEN_PICK=null,GEN_R=null;
function genData(force){try{GEN_R=heirsRun(!!force);}catch(e){GEN_R={cells:{},err:e.message};}return GEN_R;}
/* every live heir with its progress toward the chair */
function genRace(){const R=GEN_R||genData();const H=heirsAll();const out=[];
  Object.entries(R.cells||{}).forEach(([k,c])=>{const C=H.cells[k];if(!C)return;const ctx=c.ctx||{};
    (c.heirs||[]).filter(h=>h.st==='shadow').forEach(h=>{const bar=ctx.bar||HEIR_BAR;const du=h.off.u-h.offC.u;
      const pg=Math.min(1,h.n/HEIR_MIN_N),pd=Math.min(1,h.days/HEIR_MIN_DAYS),pz=Math.max(0,Math.min(1,h.z/bar));
      out.push({k,v:C.v,m:C.m,gen:C.gen,h,bar,du,pg,pd,pz,score:(pg+pd+2*pz)/4+(h.z>=bar&&pg>=1&&pd>=1&&du>=-1?1:0),moneyOk:du>=-1});});});
  return out.sort((a,b)=>b.score-a.score);}
const genPct=x=>Math.round(x*100);
function genRaceHtml(){const L=genRace();if(!L.length)return`<div class="card"><div class="muted">No heirs reading yet — they're born the first time each character's calls are graded.</div></div>`;
  const col=v=>(CHARS[v]||{}).color||'#f5c542';
  const H0=heirsAll(),C0=Object.values(H0.cells);
  return`<div class="card"><div style="font:800 15px system-ui">🔧 Tune-ups: who's closest to the crown</div><div class="muted" style="margin-top:4px"><b>Not the womb.</b> Every character also races tweaked copies of its own settings, one per bet type (${C0.length} bloodlines, ${C0.reduce((n,C)=>n+(C.heirs||[]).filter(h=>h.st==='shadow').length,0)} copies in the shadows, ${C0.reduce((n,C)=>n+(C.gen-1),0)} crowned so far). A copy that beats the original takes its chair; that's "crowned". The womb's babies are new characters. An heir takes the chair after ${HEIR_MIN_N}+ games it was never tuned on, ${HEIR_MIN_DAYS}+ days in the shadows, beating its parent past the bar (the bar rises with every heir a bloodline tries — luck protection), without its official picks making less money.</div></div>`+
  L.slice(0,30).map((x,i)=>`<div class="card race" onclick="GEN_TAB='tree';GEN_CHAR='${x.v.replace(/'/g,"\\'")}';GEN_PICK='${x.k.replace(/'/g,"\\'")}|${x.h.id}';genRender()">
    <div class="rk ${i<3?'top':''}">${i+1}</div><div>
      <div style="font:800 14px system-ui"><span style="color:${col(x.v)}">${txtEsc(charName(x.v))}</span> · ${GEN_MK[x.m]} <span class="mono muted">Gen ${x.gen+1} hopeful</span></div>
      <div class="muted" style="margin-top:2px">🌘 ${txtEsc(x.h.lab)}</div>
      <div class="lbl"><span>Unseen games</span><span>${Math.min(x.h.n,HEIR_MIN_N)}/${HEIR_MIN_N}</span></div><div class="bar"><i style="width:${genPct(x.pg)}%;background:#60a5fa"></i></div>
      <div class="lbl"><span>Days in the shadows</span><span>${Math.min(x.h.days,HEIR_MIN_DAYS)}/${HEIR_MIN_DAYS}</span></div><div class="bar"><i style="width:${genPct(x.pd)}%;background:#a78bfa"></i></div>
      <div class="lbl"><span>Edge vs parent</span><span>${x.h.z>=0?'+':''}${x.h.z.toFixed(1)}σ of ${x.bar.toFixed(1)}σ</span></div><div class="bar"><i style="width:${genPct(x.pz)}%;background:${x.h.z<0?'#f87171':'#22c55e'}"></i></div>
      <div class="lbl"><span>Money check</span><span style="color:${x.moneyOk?'#22c55e':'#f87171'}">${x.du>=0?'+':''}${x.du.toFixed(1)}u vs parent ${x.moneyOk?'✓':'✗'}</span></div>
    </div></div>`).join('');}
/* the family tree: an SVG — root (the original) → crowned generations → champion → heirs; retired hang faded */
function genTreeSvg(v,m){const H=heirsAll();const C=H.cells[v+'|'+m];if(!C)return'<div class="muted">No bloodline yet.</div>';const col=(CHARS[v]||{}).color||'#f5c542';
  const gens=[...(C.hist||[]).map(h=>({id:h.champ,lab:h.lab,gen:h.gen,st:'past',from:h.from,to:h.to,why:h.why})),{id:C.champ.id,lab:C.champ.lab,gen:C.gen,st:'champ',from:C.champ.since}];
  const heirs=(C.heirs||[]).filter(h=>h.st==='shadow'),ret=(C.heirs||[]).filter(h=>h.st==='retired');
  const W=340,rowH=84,top=34;const H2=top+(gens.length-1)*rowH+(heirs.length?rowH+40:30)+(ret.length?40:0);const cx=44;let svg='';
  gens.forEach((g,i)=>{const y=top+i*rowH;if(i)svg+=`<line x1="${cx}" y1="${y-rowH+24}" x2="${cx}" y2="${y-24}" stroke="${col}" stroke-width="3" opacity=".6"/>`;
    const champ=g.st==='champ';svg+=`<g class="node" onclick="GEN_PICK='${v}|${m}|gen${g.gen}';genRender()"><circle cx="${cx}" cy="${y}" r="${champ?26:20}" fill="${champ?col:'#0f172a'}" stroke="${col}" stroke-width="3"/>
      <text x="${cx}" y="${y+5}" text-anchor="middle" font-size="${champ?15:13}" font-weight="900" fill="${champ?'#111':col}">${champ?'👑':'G'+g.gen}</text>
      <text x="${cx+(champ?36:30)}" y="${y-4}" font-size="12" font-weight="800" fill="#e2e8f0">Gen ${g.gen}${champ?' · champion':''}</text>
      <text x="${cx+(champ?36:30)}" y="${y+12}" font-size="10" fill="#94a3b8">${txtEsc(String(g.lab).slice(0,44))}</text></g>`;});
  const yH=top+gens.length*rowH;
  heirs.forEach((h,j)=>{const x=heirs.length===1?cx+60:(j?cx+200:cx+60);svg+=`<path d="M${cx} ${yH-rowH+26} C ${cx} ${yH-40}, ${x} ${yH-50}, ${x} ${yH-20}" stroke="${col}" stroke-width="2" fill="none" stroke-dasharray="5 5" opacity=".7"/>
    <g class="node" onclick="GEN_PICK='${v}|${m}|${h.id}';genRender()"><circle class="glow" cx="${x}" cy="${yH}" r="20" fill="#0b1220" stroke="${col}" stroke-width="2" stroke-dasharray="4 3"/><text x="${x}" y="${yH+5}" text-anchor="middle" font-size="15">🌘</text>
    <text x="${x}" y="${yH+36}" text-anchor="middle" font-size="10" fill="#cbd5e1">heir · born ${txtEsc(h.born)}</text></g>`;});
  if(ret.length){const yr=yH+(heirs.length?66:16);svg+=`<text x="12" y="${yr}" font-size="10" fill="#64748b">🪦 retired heirs:</text>`;
    ret.slice(-6).forEach((h,j)=>{svg+=`<g class="node" onclick="GEN_PICK='${v}|${m}|${h.id}';genRender()" opacity=".45"><circle cx="${110+j*36}" cy="${yr-4}" r="13" fill="#0f172a" stroke="#64748b"/><text x="${110+j*36}" y="${yr}" text-anchor="middle" font-size="11">🪦</text></g>`;});}
  return`<svg viewBox="0 0 ${W} ${H2}" width="100%" style="max-width:520px;display:block;margin:0 auto">${svg}</svg>`;}
function genNodeHtml(){if(!GEN_PICK)return`<div class="muted" style="text-align:center">Tap any branch for its story.</div>`;const[v,m,id]=GEN_PICK.split('|');const H=heirsAll();const C=H.cells[v+'|'+m];if(!C)return'';
  const R=(GEN_R||genData()).cells[v+'|'+m]||{heirs:[]};
  if(/^gen\d+$/.test(id)){const g=+id.slice(3);const champ=g===C.gen;const h=champ?{lab:C.champ.lab,from:C.champ.since}:(C.hist||[]).find(x=>x.gen===g)||{};
    return`<div class="card"><div style="font:800 15px system-ui">${champ?'👑':'📜'} Generation ${g}${champ?' — on the throne':''}</div><div class="muted" style="margin-top:4px">${txtEsc(h.lab||'')}</div>
      <div class="mono" style="font-size:12px;margin-top:8px">${champ?`Reigning since ${txtEsc(h.from||'the start')}`:`Reigned ${txtEsc(h.from||'the start')} → ${txtEsc(h.to||'')}`}</div>${h.why?`<div class="muted" style="margin-top:6px">${txtEsc(h.why)}</div>`:''}
      ${champ&&R.book?`<div style="margin-top:10px;font:800 13px system-ui">The Generation Book, today:</div>${(R.book.steps||[]).map(s=>`<div class="step"><span>➜</span><div><b>${txtEsc((BOOKS.generation.pages[s.p]||{}).q||s.p)}</b><br>${txtEsc(s.why||'')}</div></div>`).join('')}<div class="step"><span>${(BOOK_ENDS[R.book.end]||{}).ico||'•'}</span><div><b>${txtEsc((BOOK_ENDS[R.book.end]||{}).lab||R.book.end)}</b></div></div>`:''}</div>`;}
  const h=(C.heirs||[]).find(x=>x.id===id);const r=(R.heirs||[]).find(x=>x.id===id);if(!h)return'';
  return`<div class="card"><div style="font:800 15px system-ui">${h.st==='retired'?'🪦 Retired heir':'🌘 Heir in the shadows'}</div>
    <div style="margin-top:6px">${txtEsc(h.lab)}</div><div class="muted" style="margin-top:4px">Born ${txtEsc(h.born)} — ${txtEsc(h.why||'')}${h.retired?` · retired ${txtEsc(h.retired)}: ${txtEsc(h.why2||'')}`:''}</div>
    ${r?`<div class="mono" style="font-size:12px;margin-top:10px;line-height:1.7">Unseen games: <b>${r.n}</b> over ${r.days} days<br>Edge vs its parent: <b style="color:${r.z>=0?'#22c55e':'#f87171'}">${r.z>=0?'+':''}${r.z}σ</b>${R.ctx?` (bar ${R.ctx.bar.toFixed(1)}σ)`:''}<br>Replayed on older games: ${r.hist.n?`${r.hist.z>=0?'+':''}${r.hist.z}σ over ${r.hist.n}`:'—'}<br>
      Its official picks: <b>${r.off.w}-${r.off.n-r.off.w}</b>, ${r.off.u>=0?'+':''}${r.off.u}u · parent's: ${r.offC.w}-${r.offC.n-r.offC.w}, ${r.offC.u>=0?'+':''}${r.offC.u}u</div>`:''}</div>`;}
function genTreeHtml(){const H=heirsAll();const vs=CHAR_ORDER.filter(v=>['ml','spread','total'].some(m=>H.cells[v+'|'+m]));if(!vs.length)return`<div class="card"><div class="muted">No bloodlines yet.</div></div>`;
  if(!GEN_CHAR||!vs.includes(GEN_CHAR))GEN_CHAR=vs[0];const v=GEN_CHAR;const ms=['ml','spread','total'].filter(m=>H.cells[v+'|'+m]);
  const pickM=(GEN_PICK&&GEN_PICK.split('|')[0]===v&&GEN_PICK.split('|')[1])||ms[0];
  return`<div style="margin-bottom:8px">${vs.map(x=>`<span class="chip ${x===v?'on':''}" style="color:${(CHARS[x]||{}).color}" onclick="GEN_CHAR='${x.replace(/'/g,"\\'")}';GEN_PICK=null;genRender()">${txtEsc(charName(x).replace(/^The /,''))}</span>`).join('')}</div>
    <div class="card"><div style="font:900 18px system-ui;color:${(CHARS[v]||{}).color}">${txtEsc(charName(v))}</div><div class="muted">${txtEsc((CHARS[v]||{}).school||'')}</div>
      <div style="margin-top:10px">${ms.map(m=>`<span class="chip ${m===pickM?'on':''}" onclick="GEN_PICK='${v.replace(/'/g,"\\'")}|${m}|gen${H.cells[v+'|'+m].gen}';genRender()">${GEN_MK[m]} · Gen ${H.cells[v+'|'+m].gen}</span>`).join('')}</div>
      <div style="margin-top:6px">${genTreeSvg(v,pickM)}</div></div>${genNodeHtml()}`;}
function genChronicleHtml(){const ev=[];try{journalAll().filter(x=>x&&(x.kind==='generation'||x.kind==='womb')).forEach(x=>ev.push({d:x.d,t:x.title,w:x.what,c:/👑|🍼|👶|🎓|⚡|⭐/.test(x.title)?'#f5c542':/💞|🥚|✊|🌟|📚/.test(x.title)?'#f472b6':'#64748b'}));}catch(e){}
  const H=heirsAll();Object.values(H.cells).forEach(C=>{(C.heirs||[]).forEach(h=>ev.push({d:h.born,t:`🐣 ${charName(C.v)}, ${GEN_MK[C.m].toLowerCase()}: an heir is born`,w:h.lab,c:'#60a5fa'}));});
  ev.sort((a,b)=>String(b.d).localeCompare(String(a.d)));const seen=new Set();const E=ev.filter(e=>{const k=e.d+e.t+e.w;if(seen.has(k))return false;seen.add(k);return true;});
  const d=today();const ch=['nfl','ncaaf','nba','ncaab','nhl','mlb'].map(sp=>[sp,wvChapter(sp,d)]).filter(x=>x[1]&&x[1]!=='off');
  return`<div class="card"><div style="font:800 15px system-ui">📖 The season's chapters</div><div style="margin-top:8px">${ch.map(([sp,c])=>`<span class="chip">${txtEsc(vxSp(sp))} · ${txtEsc(WV_CH_LAB[c])}</span>`).join('')||'<span class="muted">—</span>'}</div>
    <div class="muted" style="margin-top:4px">Early on last year's ratings matter most; late, motivation does — heirs that forget fast get born when a chapter turns.</div></div>
    <div class="card"><div style="font:800 15px system-ui;margin-bottom:10px">📜 The Chronicle</div><div class="tl">${E.slice(0,80).map(e=>`<div class="ev" style="--c:${e.c}"><div class="mono muted" style="font-size:11px">${txtEsc(e.d)}</div><div style="font-weight:800">${txtEsc(e.t)}</div><div class="muted">${txtEsc(e.w||'')}</div></div>`).join('')||'<div class="muted">Nothing yet.</div>'}</div></div>`;}
function genLoreHtml(){const run=(GEN_R||genData()).runs?(GEN_R.runs[JSON.stringify(WV_DEF)]):null;
  return CHAR_ORDER.map(v=>{let B={heirlooms:[],paying:[],costing:[]},S=[];try{B=heirBeliefs(v,run);}catch(e){}try{S=heirScars(v);}catch(e){}if(!B.heirlooms.length&&!B.paying.length&&!B.costing.length&&!S.length)return'';
    const row=(ico,o,c)=>`<div style="margin:5px 0;font-size:12.5px">${ico} <b>${txtEsc(vxSp(o.sp))}</b> · ${txtEsc(o.lab)} <span class="mono" style="color:${c}">${o.w}-${(o.n||o.w+o.l)-o.w}</span></div>`;
    return`<div class="card" style="border-left:4px solid ${(CHARS[v]||{}).color}"><div style="font:900 15px system-ui;color:${(CHARS[v]||{}).color}">${txtEsc(charName(v))}</div>
      ${B.heirlooms.map(o=>row('💎',o,'#22c55e')).join('')}${B.paying.slice(0,4).map(o=>row('🌱',o,'#86efac')).join('')}${B.costing.slice(0,4).map(o=>row('⚠️',o,'#f87171')).join('')}
      ${S.map(o=>`<div style="margin:5px 0;font-size:12.5px">🩹 ${txtEsc(o.lab)} <span class="mono" style="color:#f87171">${o.w}-${o.l}</span>${o.healing?' <span style="color:#22c55e">· healing</span>':''}</div>`).join('')}</div>`;}).join('')||`<div class="card"><div class="muted">No heirlooms or scars yet — beliefs need games to prove themselves.</div></div>`;}
function genRender(){const v=document.getElementById('genView');if(!v)return;const st=v.scrollTop;const tabs=[['home','👪 Family'],['womb','🥚 Womb'],['nursery','🍼 Nursery'],['evo','⚡ Evolution'],['north','⭐ North Star'],['dna','🧬 DNA'],['tree','🌳 Trees'],['chron','📜 Chronicle'],['race','🔧 Tune-ups'],['lore','💎 Heirlooms & scars']];
  let body='';try{body=GEN_TAB==='home'?(typeof homeHtml==='function'?homeHtml():''):GEN_TAB==='race'?genRaceHtml():GEN_TAB==='womb'?(typeof wombHtml==='function'?wombHtml():''):GEN_TAB==='nursery'?(typeof nurseryHtml==='function'?nurseryHtml():''):GEN_TAB==='evo'?(typeof evoHtml==='function'?evoHtml():''):GEN_TAB==='north'?(typeof northHtml==='function'?northHtml():''):GEN_TAB==='dna'?(typeof dnaHtml==='function'?dnaHtml():''):GEN_TAB==='tree'?genTreeHtml():GEN_TAB==='chron'?genChronicleHtml():genLoreHtml();}catch(e){body=`<div class="card"><div class="muted">${txtEsc(e.message)}</div></div>`;}
  const H=heirsAll();const cells=Object.values(H.cells);const live=cells.reduce((n,C)=>n+(C.heirs||[]).filter(h=>h.st==='shadow').length,0),crowned=cells.reduce((n,C)=>n+(C.gen-1),0);
  v.innerHTML=`<div class="gh"><div style="display:flex;justify-content:space-between;align-items:center"><div class="gt">🧬 BLOOD<span>LINES</span></div><button onclick="document.getElementById('genView').remove()" style="background:#1e293b;color:#fff;border:0;border-radius:10px;padding:8px 12px;font-weight:800">✕</button></div>
    <div class="mono muted" style="font-size:11px;margin-top:4px">${(()=>{try{const S=wbHomeSum();const p=[`${S.live.length} famil${S.live.length===1?'y':'ies'} expecting`,`${S.lifes.length} bab${S.lifes.length===1?'y':'ies'} in the womb`];const h=S.rook+S.grad;if(h)p.push(`${h} heir${h===1?'':'s'} on the desk`);if(S.evolved)p.push(`${S.evolved} evolved`);if(S.due)p.push(`${S.due} ready to be born`);else if(S.next)p.push(`next birth ${wbDay(S.next)}`);return p.join(' · ');}catch(x){return`${cells.length} bloodlines · ${live} heirs in the shadows · ${crowned} crowned so far`;}})()}</div>
    <div class="tabs">${tabs.map(([k,l])=>`<button class="${GEN_TAB===k?'on':''}" onclick="GEN_TAB='${k}';genRender()">${l}</button>`).join('')}</div></div><div class="gb">${body}</div>`;v.scrollTop=GEN_TAB==='tree'||GEN_TAB==='dna'?st:0;}
function genOpen(){GEN_TAB='home';if(!document.getElementById('genCss')){const s=document.createElement('style');s.id='genCss';s.textContent=GEN_CSS;document.head.appendChild(s);}
  let v=document.getElementById('genView');if(!v){v=document.createElement('div');v.id='genView';document.body.appendChild(v);}v.innerHTML='<div style="padding:40px;text-align:center;color:#f5c542;font-weight:800">🧬 Reading the bloodlines…</div>';
  heirsRunAsync().then(R=>{GEN_R=R;return typeof wombRunAsync==='function'?wombRunAsync().catch(()=>null):null;}).then(()=>genRender()).catch(e=>{GEN_R=GEN_R||{cells:{},err:e.message};genRender();});}
/* doors in: the Records 🧬 tab opens the book, plus a button on Today */
if(typeof familyHtml==='function'){const FH0=familyHtml;familyHtml=function(){return`<div class="tkt hi" style="text-align:center"><button class="primary" style="font-size:16px;padding:14px 18px" onclick="genOpen()">🧬 Open the Bloodlines</button><div class="sub" style="margin-top:6px">Throne race · the womb · the nursery · evolution · the North Star · DNA · family trees · the chronicle · heirlooms & scars</div></div>`+FH0();};}
