/* TheDesk · Gamecast (public app v78) — loaded only when a game is opened.
   Nov 26, 12:46 PM, Chris: "can we bring the gamecast feature (much more interactively sound for mobile when it comes to display of what's
   going on in a game… similar to espns interactive field and courts that show a shot being taken or a pass being completed and displayed
   on the court or field…) so we can follow games closer… make sure it's able to be backed out of so you can go back to the slate… but
   readily available if someone wants to sweat it out watching the courts movements".
   ESPN's public game summary, every 12 s while the game is on and the screen is up: basketball shots where they were taken (made / missed,
   the latest one flies to the rim), hockey shots and goals on the rink, football drives on the field (each play drawn start to finish,
   the latest one animated, the ball, the line of scrimmage and the line to gain), win probability, and the play-by-play. */
const PATH = { nfl: 'football/nfl', ncaaf: 'football/college-football', nba: 'basketball/nba', ncaab: 'basketball/mens-college-basketball', nhl: 'hockey/nhl', mlb: 'baseball/mlb' };
const BB = { nba: 1, ncaab: 1 }, FB = { nfl: 1, ncaaf: 1 };
let G = null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => (v == null || v === '' || !isFinite(+v) ? null : +v);
const r1 = v => Math.round(v * 10) / 10;

export function mount(el, ctx) {
  unmount();
  G = { el, ctx, sp: ctx.sp, id: String(ctx.id), d: null, err: '', f: { side: 'all', per: 0, zoom: 'auto' }, lastKey: '', t: 0, at: 0 };
  el.addEventListener('click', onClick); document.addEventListener('visibilitychange', onVis);
  paint(); load();
}
export function unmount() { if (!G) return; clearTimeout(G.t); G.el.removeEventListener('click', onClick); document.removeEventListener('visibilitychange', onVis); G = null; }
function onVis() { if (!G) return; clearTimeout(G.t); if (!document.hidden) load(); }
function onClick(e) {
  const b = e.target.closest('[data-gc]'); if (!b || !G) return; e.preventDefault();
  const a = b.dataset.gc, v = b.dataset.v;
  if (a === 'back') return G.ctx.back();
  if (a === 'side') G.f.side = v; else if (a === 'per') G.f.per = +v || 0; else if (a === 'zoom') G.f.zoom = v; else if (a === 'retry') { G.err = ''; paint(); return load(); }
  paint(false);
}
async function load() {
  if (!G) return; const me = G;
  try {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 12000);
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${PATH[me.sp]}/summary?event=${encodeURIComponent(me.id)}&_=${Math.floor(Date.now() / 10e3)}`, { cache: 'no-store', signal: ac.signal }).finally(() => clearTimeout(to));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(); if (G !== me) return;
    me.d = parse(me.sp, j); me.err = ''; me.at = Date.now();
  } catch (e) { if (G !== me) return; if (!me.d) me.err = 'This game’s live data didn’t load.'; }
  if (G !== me) return; paint(true);
  const st = me.d && me.d.state, wait = st === 'in' ? 12e3 : st === 'pre' ? 60e3 : 0;
  clearTimeout(me.t); if (wait && !document.hidden) me.t = setTimeout(load, wait);
}

/* ── the data, every sport into one shape ── */
function teamColor(t, alt) { const c0 = /^[0-9a-f]{6}$/i.test(t.color || '') ? t.color : '888888', a0 = /^[0-9a-f]{6}$/i.test(t.alternateColor || '') ? t.alternateColor : 'ffffff', c = alt ? a0 : c0, a = alt ? c0 : a0;
  const lum = h => { const n = parseInt(h, 16), f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255); };
  /* readable on the dark felt: a very dark primary swaps to its alternate (or lightens) */
  return '#' + (lum(c) >= 0.07 ? c : lum(a) >= 0.07 ? a : 'cfd8dc'); }
function parse(sp, j) {
  const C = ((j.header || {}).competitions || [])[0] || {}, cs = C.competitors || [];
  const side = h => { const x = cs.find(z => z.homeAway === h) || {}, t = x.team || {}; return { id: String(t.id || ''), ab: t.abbreviation || (h === 'home' ? 'HOME' : 'AWAY'), name: t.shortDisplayName || t.displayName || t.name || t.abbreviation || '', color: teamColor(t), alt: teamColor(t, 1), score: num(x.score) ?? 0 }; };
  const a = side('away'), h = side('home'), st = (C.status || {}).type || {};
  /* two teams in the same color (Wolves and Thunder, both blue): the home side wears its other color */
  const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), far = (x, y) => { const [p, q] = [rgb(x), rgb(y)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
  if (far(a.color, h.color) < 90) { if (far(a.color, h.alt) >= 90) h.color = h.alt; else if (far(a.alt, h.color) >= 90) a.color = a.alt; }
  const D = { sp, a, h, state: st.state === 'post' || st.completed ? 'post' : st.state === 'in' ? 'in' : 'pre', detail: st.shortDetail || st.detail || '', start: C.date || '', wp: null, shots: [], feed: [], drives: [], sit: null };
  const sideOf = id => (String(id) === h.id ? 'h' : String(id) === a.id ? 'a' : '');
  const W = j.winprobability; if (Array.isArray(W) && W.length) { const w = num(W[W.length - 1].homeWinPercentage); if (w != null) D.wp = w; }
  if (D.state === 'post') D.wp = null;   /* a final needs no odds: the score says it */
  const P = Array.isArray(j.plays) ? j.plays : [];
  if (BB[sp]) {
    for (const p of P) { const c = p.coordinate; if (!p.shootingPlay || !c) continue; const x = num(c.x), y = num(c.y); if (x == null || y == null || x < 0 || x > 50 || y < -6 || y > 48) continue;
      D.shots.push({ k: String(p.id || p.sequenceNumber), s: sideOf((p.team || {}).id), x, y, made: !!p.scoringPlay, pts: num(p.scoreValue) || 0, three: /three point/i.test(p.text || '') || (num(p.pointsAttempted) === 3), text: p.text || '', per: num((p.period || {}).number) || 0, clock: (p.clock || {}).displayValue || '' }); }
  }
  if (sp === 'nhl') {
    const K = { Shot: 'shot', Goal: 'goal', Missed: 'miss', 'Missed Shot': 'miss', Blocked: 'block', 'Blocked Shot': 'block' }, raw = [];
    for (const p of P) { const k = K[(p.type || {}).text]; const c = p.coordinate; if (!k || !c) continue; const x = num(c.x), y = num(c.y); if (x == null || y == null) continue;
      raw.push({ k: String(p.id || p.sequenceNumber), s: sideOf((p.team || {}).id), x, y, kind: k, text: p.text || '', per: num((p.period || {}).number) || 0, clock: (p.clock || {}).displayValue || '' }); }
    /* teams switch ends every period: turn each period so the home team always shoots at the right-hand net */
    const flip = {}; let base = null;
    for (const per of [...new Set(raw.map(s => s.per))].sort((x, y) => x - y)) { const H = raw.filter(s => s.per === per && s.s === 'h' && s.kind !== 'block'), A = raw.filter(s => s.per === per && s.s === 'a' && s.kind !== 'block');
      const m = L => (L.length ? L.reduce((t, s) => t + s.x, 0) / L.length : 0), sc = m(H) - m(A);
      if (H.length + A.length >= 3 && Math.abs(sc) > 5) { flip[per] = sc < 0; if (base == null) base = { per, f: flip[per] }; } }
    for (const s of raw) { let f = flip[s.per]; if (f == null) f = base ? (Math.abs(s.per - base.per) % 2 ? !base.f : base.f) : false; D.shots.push(f ? { ...s, x: -s.x, y: -s.y } : s); }
  }
  if (FB[sp]) {
    const DR = j.drives || {}, all = [...(DR.previous || [])]; if (DR.current && !all.some(d => d.id === DR.current.id)) all.push(DR.current);
    D.drives = all.map(d => ({ id: String(d.id || ''), s: sideOf((d.team || {}).id), desc: d.description || '', res: d.displayResult || d.result || '', score: !!d.isScore,
      plays: (d.plays || []).map(p => ({ k: String(p.id || p.sequenceNumber), type: (p.type || {}).text || '', text: p.text || '', y0: num((p.start || {}).yardLine), y1: num((p.end || {}).yardLine), yds: num(p.statYardage) || 0,
        dd: (p.start || {}).shortDownDistanceText || '', s: sideOf(((p.start || {}).team || {}).id), score: !!p.scoringPlay, per: num((p.period || {}).number) || 0, clock: (p.clock || {}).displayValue || '',
        nd: num((p.end || {}).down), ndist: num((p.end || {}).distance), ny: num((p.end || {}).yardLine), ns: sideOf(((p.end || {}).team || {}).id), sc: [num(p.awayScore), num(p.homeScore)] })) })).filter(d => d.plays.length);
    const lastD = D.drives[D.drives.length - 1], lp = lastD && [...lastD.plays].reverse().find(p => p.ny != null);
    if (D.state === 'in' && lp && lp.nd > 0 && lp.ny > 0 && lp.ny < 100) { const ord = ['', '1st', '2nd', '3rd', '4th'][lp.nd] || '', s2 = lp.ns || lastD.s, goal = lp.ndist != null && (s2 === 'a' ? lp.ny - lp.ndist <= 0 : lp.ny + lp.ndist >= 100);
      D.sit = { y: lp.ny, dist: lp.ndist, s: s2, text: `${ord} & ${goal ? 'Goal' : lp.ndist ?? ''}`, rz: s2 === 'a' ? lp.ny <= 20 : lp.ny >= 80 }; }
    const flat = []; D.drives.slice(-4).forEach(d => d.plays.forEach(p => flat.push({ ...p, s: p.s || d.s }))); D.feed = flat.reverse().filter(p => p.text).slice(0, 30).map(p => ({ k: p.k, s: p.s, text: p.text, score: p.score, per: p.per, clock: p.clock, sc: p.sc }));
  } else {
    D.feed = P.slice().reverse().filter(p => p.text && !/^(Stoppage|Face ?Off|Substitution|.*Timeout)/i.test((p.type || {}).text || '')).slice(0, 30)
      .map(p => ({ k: String(p.id || p.sequenceNumber), s: sideOf((p.team || {}).id), text: p.text, score: !!p.scoringPlay, per: num((p.period || {}).number) || 0, clock: (p.clock || {}).displayValue || '', sc: [num(p.awayScore), num(p.homeScore)] }));
  }
  return D;
}

/* ── the screen ── */
const perLab = (sp, n) => (n ? (FB[sp] || sp === 'nba' ? (n > 4 ? (n === 5 ? 'OT' : `${n - 4}OT`) : `Q${n}`) : sp === 'ncaab' ? (n > 2 ? (n === 3 ? 'OT' : `${n - 2}OT`) : `H${n}`) : sp === 'nhl' ? (n > 3 ? (n === 4 ? 'OT' : 'SO') : `P${n}`) : String(n)) : '');
function paint(fresh) {
  if (!G) return; const { el, d, sp } = G;
  const top = `<div class="gc-top"><button type="button" class="gc-back" data-gc="back">← Back to the Slate</button>${G.at ? `<span class="gc-upd">${d && d.state === 'in' ? '● Live · ' : ''}updated ${new Date(G.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>` : ''}</div>`;
  if (!d) { el.innerHTML = top + (G.err ? `<div class="paper blank"><b>${esc(G.err)}</b><p>ESPN didn’t answer. <button type="button" class="link" data-gc="retry">Try again</button></p></div>` : '<div class="gc-load"><div class="shimmer"></div></div>'); return; }
  const lead = d.a.score === d.h.score ? '' : d.a.score > d.h.score ? 'a' : 'h';
  const chip = (t, k) => `<div class="gc-tm ${lead === k ? 'lead' : ''}" style="--tc:${t.color}"><b>${esc(t.ab)}</b><span>${esc(t.name)}</span><em>${d.state === 'pre' ? '' : t.score}</em></div>`;
  const status = d.state === 'in' ? `<span class="gc-st live">● ${esc(d.detail)}</span>` : d.state === 'post' ? `<span class="gc-st">${esc(d.detail || 'Final')}</span>` : `<span class="gc-st">${esc(d.start ? new Date(d.start).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : d.detail)}</span>`;
  const wp = d.wp != null ? `<div class="gc-wp" role="img" aria-label="Win probability: ${esc(d.a.ab)} ${Math.round((1 - d.wp) * 100)}%, ${esc(d.h.ab)} ${Math.round(d.wp * 100)}%"><span style="--w:${(1 - d.wp) * 100}%;--tc:${d.a.color}">${esc(d.a.ab)} ${Math.round((1 - d.wp) * 100)}%</span><span style="--w:${d.wp * 100}%;--tc:${d.h.color}">${Math.round(d.wp * 100)}% ${esc(d.h.ab)}</span></div>` : '';
  const key = d.feed[0] ? d.feed[0].k : '', isNew = fresh && key && key !== G.lastKey; if (fresh) G.lastKey = key;
  const picks = G.ctx.picksHtml ? G.ctx.picksHtml() : '';
  el.innerHTML = `${top}<div class="gc-bug">${chip(d.a, 'a')}${status}${chip(d.h, 'h')}</div>${wp}${picks ? `<div class="gc-on">${picks}</div>` : ''}
    <div class="gc-stage">${BB[sp] ? court(d, isNew) : sp === 'nhl' ? rink(d, isNew) : FB[sp] ? field(d, isNew) : `<div class="paper blank"><b>No live map for this sport</b><p>The play-by-play is below.</p></div>`}</div>
    ${feedHtml(d, isNew)}`;
}
function seg(name, opts, cur) { return `<div class="gc-seg" role="group">${opts.map(([v, l]) => `<button type="button" data-gc="${name}" data-v="${esc(v)}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`; }
function feedHtml(d, isNew) {
  if (!d.feed.length) return `<p class="note gc-note">${d.state === 'pre' ? 'The play-by-play starts at tip-off.' : 'No plays yet.'}</p>`;
  const T = { a: d.a, h: d.h };
  return `<h2 class="h2 gc-h">Play by play</h2><ol class="gc-feed">${d.feed.map((p, i) => `<li class="${p.score ? 'sc' : ''}${i === 0 && isNew ? ' fresh' : ''}" style="--tc:${T[p.s] ? T[p.s].color : 'var(--cream-3)'}"><span class="gc-tc">${esc(perLab(d.sp, p.per))} ${esc(p.clock)}</span><span class="gc-tx">${T[p.s] ? `<b>${esc(T[p.s].ab)}</b> ` : ''}${esc(p.text)}${p.score && p.sc[0] != null ? ` <em>${esc(d.a.ab)} ${p.sc[0]}–${p.sc[1]} ${esc(d.h.ab)}</em>` : ''}</span></li>`).join('')}</ol>`;
}

/* basketball: the full floor; the away team shoots at the left rim, home at the right (ESPN: x across 0–50 ft, y out from the rim) */
function court(d, isNew) {
  const ncaa = d.sp === 'ncaab', f = G.f, pers = [...new Set(d.shots.map(s => s.per))].sort((x, y) => x - y);
  if (f.per && !pers.includes(f.per)) f.per = 0;
  const S = d.shots.filter(s => s.s && (f.side === 'all' || s.s === f.side) && (!f.per || s.per === f.per));
  const pt = s => (s.s === 'a' ? [5.25 + s.y, s.x] : [94 - 5.25 - s.y, 50 - s.x]);
  const half = (key, arc, kw) => `<g class="gc-ln"><rect x="0" y="${25 - kw / 2}" width="19" height="${kw}"/><circle cx="19" cy="25" r="6"/><path d="M4 22v6"/><circle cx="5.25" cy="25" r=".75" class="rim"/><path d="M5.25 21a4 4 0 0 1 0 8" />${arc}</g>`;
  const arcN = '<path d="M0 3h14.2a23.75 23.75 0 0 1 0 44H0"/>', arcC = '<path d="M0 3.35h9.9a22.15 22.15 0 0 1 0 43.3H0"/>';
  const H = half('l', ncaa ? arcC : arcN, ncaa ? 12 : 16);
  const last = isNew ? d.shots[d.shots.length - 1] : null;
  const dots = S.map(s => { const [x, y] = pt(s), c = (s.s === 'a' ? d.a : d.h).color; return s.made ? `<circle cx="${r1(x)}" cy="${r1(y)}" r="1.05" fill="${c}" class="gc-m"><title>${esc(s.text)}</title></circle>` : `<g class="gc-x" stroke="${c}"><path d="M${r1(x - .8)} ${r1(y - .8)}l1.6 1.6m0-1.6l-1.6 1.6"/><title>${esc(s.text)}</title></g>`; }).join('');
  let fly = ''; if (last && last.s) { const [x, y] = pt(last), rx = last.s === 'a' ? 5.25 : 88.75, mx = (x + rx) / 2, my = Math.min(y, 25) - 6;
    fly = `<path class="gc-fly" d="M${r1(x)} ${r1(y)}Q${r1(mx)} ${r1(my)} ${rx} 25" pathLength="100"/><circle class="gc-ring" cx="${r1(x)}" cy="${r1(y)}" r="2.2" stroke="${(last.s === 'a' ? d.a : d.h).color}"/>${last.made ? `<circle class="gc-swish" cx="${rx}" cy="25" r="1.6"/>` : ''}`; }
  const vb = f.zoom === 'a' ? '0 0 47 50' : f.zoom === 'h' ? '47 0 47 50' : '0 0 94 50';
  const st = k => { const L = d.shots.filter(s => s.s === k && (!f.per || s.per === f.per)), m = L.filter(s => s.made).length, t3 = L.filter(s => s.three), m3 = t3.filter(s => s.made).length; return `<span style="--tc:${d[k].color}"><b>${esc(d[k].ab)}</b> FG ${m}/${L.length}${L.length ? ` (${Math.round(100 * m / L.length)}%)` : ''} · 3PT ${m3}/${t3.length}</span>`; };
  return `<svg class="gc-svg court" viewBox="${vb}" role="img" aria-label="Shot chart: ${S.length} shots shown"><rect width="94" height="50" class="floor"/><path class="gc-ln" d="M47 0v50"/><circle class="gc-ln" cx="47" cy="25" r="6"/><circle class="gc-ln" cx="47" cy="25" r="2"/>${H}<g transform="translate(94 50) rotate(180)">${H}</g>
      <text x="1.5" y="48.5" class="gc-bl">${esc(d.a.ab)} shoots ←</text><text x="92.5" y="48.5" class="gc-bl" text-anchor="end">→ ${esc(d.h.ab)} shoots</text>${dots}${fly}</svg>
    <div class="gc-ctl">${seg('side', [['all', 'Both teams'], ['a', esc(d.a.ab)], ['h', esc(d.h.ab)]], f.side)}${seg('zoom', [['auto', 'Full floor'], ['a', `${esc(d.a.ab)} end`], ['h', `${esc(d.h.ab)} end`]], f.zoom)}${pers.length > 1 ? seg('per', [[0, 'All'], ...pers.map(n => [n, perLab(d.sp, n)])], f.per) : ''}</div>
    <div class="gc-stats">${st('a')}${st('h')}</div><p class="gc-key">● made · ✕ missed${d.state === 'in' ? ' · the newest shot flies to the rim' : ''}</p>`;
}
/* hockey: the rink (x −100…100 ft, y −42.5…42.5); every period turned so home shoots right */
function rink(d, isNew) {
  const f = G.f, pers = [...new Set(d.shots.map(s => s.per))].sort((x, y) => x - y); if (f.per && !pers.includes(f.per)) f.per = 0;
  const S = d.shots.filter(s => s.s && (f.side === 'all' || s.s === f.side) && (!f.per || s.per === f.per)), last = isNew ? d.shots[d.shots.length - 1] : null;
  const mk = s => { const c = (s.s === 'a' ? d.a : d.h).color, x = r1(s.x), y = r1(-s.y);
    return s.kind === 'goal' ? `<g class="gc-goal"><circle cx="${x}" cy="${y}" r="3.6" fill="${c}"/><circle cx="${x}" cy="${y}" r="5.4" class="gl"/><title>${esc(s.text)}</title></g>` : s.kind === 'shot' ? `<circle cx="${x}" cy="${y}" r="2.1" fill="${c}" class="gc-m"><title>${esc(s.text)}</title></circle>`
      : s.kind === 'miss' ? `<circle cx="${x}" cy="${y}" r="2" fill="none" stroke="${c}" stroke-width=".9"><title>${esc(s.text)}</title></circle>` : `<path d="M${x - 1.6} ${y - 1.6}l3.2 3.2m0-3.2l-3.2 3.2" stroke="${c}" stroke-width=".9"><title>${esc(s.text)}</title></path>`; };
  let fly = ''; if (last && last.s) { const x = r1(last.x), y = r1(-last.y), gx = last.s === 'h' ? 89 : -89; fly = `<path class="gc-fly puck" d="M${x} ${y}L${gx} 0" pathLength="100"/><circle class="gc-ring" cx="${x}" cy="${y}" r="5" stroke="${(last.s === 'a' ? d.a : d.h).color}"/>`; }
  const vb = f.zoom === 'a' ? '-100 -42.5 100 85' : f.zoom === 'h' ? '0 -42.5 100 85' : '-100 -42.5 200 85';
  const fo = [[-69, -22], [-69, 22], [69, -22], [69, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" class="fo"/><circle cx="${x}" cy="${y}" r="1" class="dot"/>`).join('') + [[-20, -22], [-20, 22], [20, -22], [20, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" class="dot"/>`).join('');
  const st = k => { const L = d.shots.filter(s => s.s === k && (!f.per || s.per === f.per)); return `<span style="--tc:${d[k].color}"><b>${esc(d[k].ab)}</b> ${L.filter(s => s.kind === 'goal').length} G · ${L.filter(s => s.kind === 'shot' || s.kind === 'goal').length} SOG · ${L.filter(s => s.kind === 'miss').length} missed</span>`; };
  return `<svg class="gc-svg rink" viewBox="${vb}" role="img" aria-label="Shots on the rink: ${S.length} shown"><rect x="-100" y="-42.5" width="200" height="85" rx="28" class="ice"/><path d="M0 -42.5V42.5" class="red"/><path d="M-25 -42.5V42.5M25 -42.5V42.5" class="blue"/><path d="M-89 -40V40M89 -40V40" class="red thin"/>
      <circle cx="0" cy="0" r="15" class="fo blue-c"/><circle cx="0" cy="0" r="1" class="dot blue-d"/>${fo}<path d="M89 -4A6 6 0 0 0 89 4Z" class="crease"/><path d="M-89 -4A6 6 0 0 1 -89 4Z" class="crease"/><rect x="89" y="-3" width="2.4" height="6" class="net"/><rect x="-91.4" y="-3" width="2.4" height="6" class="net"/>
      <text x="-97" y="39" class="gc-rl">${esc(d.a.ab)} shoots ←</text><text x="97" y="39" class="gc-rl" text-anchor="end">→ ${esc(d.h.ab)} shoots</text>${S.map(mk).join('')}${fly}</svg>
    <div class="gc-ctl">${seg('side', [['all', 'Both teams'], ['a', esc(d.a.ab)], ['h', esc(d.h.ab)]], f.side)}${seg('zoom', [['auto', 'Whole rink'], ['a', `${esc(d.a.ab)} zone`], ['h', `${esc(d.h.ab)} zone`]], f.zoom)}${pers.length > 1 ? seg('per', [[0, 'All'], ...pers.map(n => [n, perLab('nhl', n)])], f.per) : ''}</div>
    <div class="gc-stats">${st('a')}${st('h')}</div><p class="gc-key">big ring = goal · ● on goal · ○ missed · ✕ blocked</p>`;
}
/* football: the field (away end zone left, home right; ESPN's yard line counts from the home goal line), the drive play by play */
function field(d, isNew) {
  const f = G.f, D = d.drives, cur = D[D.length - 1]; if (!cur) return '<p class="note gc-note">No drives yet.</p>';
  const X = y => 110 - y, P = cur.plays.filter(p => p.y0 != null && p.y1 != null && !/Timeout|End Period|End of/i.test(p.type)).slice(-8);
  const xs = P.flatMap(p => [X(p.y0), X(p.y1)]).concat(d.sit ? [X(d.sit.y)] : []); let lo = Math.min(...xs) - 8, hi = Math.max(...xs) + 8; if (hi - lo < 44) { const m = (lo + hi) / 2; lo = m - 22; hi = m + 22; } lo = Math.max(0, lo); hi = Math.min(120, hi);
  const vb = f.zoom === 'all' || !isFinite(lo) ? '0 0 120 53.3' : `${r1(lo)} 0 ${r1(hi - lo)} 53.3`;
  const T = { a: d.a, h: d.h }, row = i => 9 + i * (36 / Math.max(P.length, 1)) + 2;
  const lines = [];
  for (let i = 0; i < 21; i++) { const x = 10 + i * 5; lines.push(`<path d="M${x} 0V53.3" class="yl${i % 2 ? '' : ' ten'}"/>`); }
  const nums = [10, 20, 30, 40, 50, 40, 30, 20, 10].map((n, i) => `<text x="${20 + i * 10}" y="50.6" class="yn">${n}</text><text x="${20 + i * 10}" y="5.6" class="yn">${n}</text>`).join('');
  const hashes = Array.from({ length: 99 }, (_, i) => `<path d="M${11 + i} 22.4v1.2M${11 + i} 29.7v1.2"/>`).join('');
  const playEl = (p, i) => { const x0 = X(p.y0), x1 = X(p.y1), y = r1(row(i)), ty = p.type, pass = /Pass/i.test(ty), inc = /Incompletion/i.test(ty), sack = /Sack/i.test(ty), pen = /Penalty/i.test(ty), kick = /Kickoff|Punt|Field Goal/i.test(ty);
    const dir = (p.s === 'h' ? -1 : 1), tx = inc ? x0 + dir * 12 : x1, cls = 'gp-' + (p.score ? 'td' : sack || p.yds < 0 ? 'loss' : pen ? 'pen' : inc ? 'inc' : pass ? 'pass' : kick ? 'kick' : 'run');
    const d0 = pass || kick ? `M${r1(x0)} ${y}Q${r1((x0 + tx) / 2)} ${r1(y - (kick ? 7 : 4))} ${r1(tx)} ${y}` : `M${r1(x0)} ${y}L${r1(tx)} ${y}`;
    const fresh = isNew && i === P.length - 1;
    return `<g class="gc-pl ${cls}${fresh ? ' fresh' : ''}"><path d="${d0}" pathLength="100" style="--tc:${T[p.s] ? T[p.s].color : '#ccc'}"/>${inc ? `<path d="M${r1(tx - .9)} ${y - .9}l1.8 1.8m0-1.8l-1.8 1.8" class="xm"/>` : `<circle cx="${r1(tx)}" cy="${y}" r=".75" class="end"/>`}${fresh ? `<ellipse rx="1.3" ry=".8" class="ball"><animateMotion dur="1.3s" fill="freeze" path="${d0}"/></ellipse>` : ''}<title>${esc(p.dd ? p.dd + ' · ' : '')}${esc(p.text)}</title></g>`; };
  let sit = ''; if (d.sit) { const bx = X(d.sit.y), tg = d.sit.dist != null ? X(d.sit.y + (d.sit.s === 'a' ? -d.sit.dist : d.sit.dist)) : null;
    sit = `<path d="M${r1(bx)} 0V53.3" class="los"/>${tg != null && tg > 10 && tg < 110 ? `<path d="M${r1(tg)} 0V53.3" class="ltg"/>` : ''}<ellipse cx="${r1(bx)}" cy="26.65" rx="1.6" ry="1" class="ball"/>`; }
  const ez = (x, t) => `<rect x="${x}" y="0" width="10" height="53.3" fill="${t.color}" class="ez"/><text x="${x + 5}" y="26.65" class="ezt" transform="rotate(${x ? 90 : -90} ${x + 5} 26.65)">${esc(t.ab)}</text>`;
  const recent = D.slice(-6, -1).reverse().map(x => `<li style="--tc:${T[x.s] ? T[x.s].color : '#999'}"><b>${T[x.s] ? esc(T[x.s].ab) : ''}</b> ${esc(x.res || '')}<small>${esc(x.desc)}</small></li>`).join('');
  return `<div class="gc-sit">${d.sit ? `<b>${esc(T[d.sit.s] ? T[d.sit.s].ab : '')} ball · ${esc(d.sit.text)}</b>${d.sit.rz ? ' <span class="rz">Red zone</span>' : ''}` : ''}<span>${esc(T[cur.s] ? T[cur.s].ab : '')} drive · ${esc(cur.desc)}${cur.res && d.state !== 'in' ? ' · ' + esc(cur.res) : ''}</span></div>
    <svg class="gc-svg field" viewBox="${vb}" role="img" aria-label="The current drive: ${P.length} plays"><rect width="120" height="53.3" class="grass"/>${Array.from({ length: 10 }, (_, i) => `<rect x="${10 + i * 10}" y="0" width="5" height="53.3" class="stripe"/>`).join('')}${ez(0, d.a)}${ez(110, d.h)}<g class="gc-ln">${lines.join('')}</g><g class="hash">${hashes}</g>${nums}${sit}${P.map(playEl).join('')}</svg>
    <div class="gc-ctl">${seg('zoom', [['auto', 'Follow the drive'], ['all', 'Whole field']], f.zoom === 'all' ? 'all' : 'auto')}</div>
    <p class="gc-key"><i class="gk"></i>run <i class="gk gk-pass"></i>pass <i class="gk gk-inc"></i>incomplete <i class="gk gk-loss"></i>loss <i class="gk gk-td"></i>score · <i class="gk gk-los"></i>line of scrimmage <i class="gk gk-ltg"></i>line to gain</p>
    ${recent ? `<h2 class="h2 gc-h">Earlier drives</h2><ul class="gc-drv">${recent}</ul>` : ''}`;
}
