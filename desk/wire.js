/* TheDesk · the Live feed (public app v78) — loaded right after the first paint.
   Nov 26, 12:56 PM, Chris: "Can we also incorporate a live feed scroll as well as a social box that shows us all the updates and box scores
   that are live and what people are talking about in the chat room… maybe even a way to pull big name sports analyst tweets and posts from
   all over the net…". A score ticker (live first; tap a live game for its Gamecast), a social box on Today, and the Live page: the live box
   scores, then one feed — scoring and finals as they happen on this phone, what the members' chat is saying, and ESPN's reporters' news
   (Schefter, Shams and the beat writers post there first). X/Twitter's feed is paid, so it isn't pulled. */
const NEWS = { nfl: 'football/nfl', ncaaf: 'football/college-football', nba: 'basketball/nba', ncaab: 'basketball/mens-college-basketball', nhl: 'hockey/nhl', mlb: 'baseball/mlb' };
const TAG = { nfl: '🏈 NFL', ncaaf: '🏟 CFB', nba: '🏀 NBA', ncaab: '🏀 CBB', nhl: '🏒 NHL', mlb: '⚾ MLB' };
const START = { nfl: 'Kickoff', ncaaf: 'Kickoff', nba: 'Tip-off', ncaab: 'Tip-off', nhl: 'Puck drop', mlb: 'First pitch' };
const X = { ctx: null, news: {}, newsAt: 0, chat: [], chatAt: 0, ev: [], prev: null, f: 'all', el: null, t: 0, busy: false };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date()).replace(/-/g, '');
const ago = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
try { const E = JSON.parse(sessionStorage.getItem('tdp.wire') || '[]'); if (Array.isArray(E)) X.ev = E.filter(e => e && e.ts > Date.now() - 12 * 36e5); } catch (e) { }

export function init(ctx) { X.ctx = ctx; if (!X.prev) X.prev = snap(); return { ticker, box, mount, unmount, tick }; }
const S = () => X.ctx.S;
/* today's games from the live scores, with names from the Slate when it has them */
/* today's rows: the app keeps one copy of each game per day (liveD, "sp|AWY@HOM#yyyymmdd") — the shared copy moves to a game's latest date */
function todayRows() { const D = S().liveD || {}, td = today(), o = {}; for (const [k, r] of Object.entries(D)) { const i = k.lastIndexOf('#'); if (i > 0 && k.slice(i + 1) === td && r) o[k.slice(0, i)] = r; }
  for (const [k, r] of Object.entries(S().live || {})) if (r && r.ymd === td && !o[k]) o[k] = r; return o; }
function games() { const L = todayRows(), td = today(), nick = {}, slate = S().slate;
  for (const d of (slate && slate.days) || []) for (const g of d.games || []) nick[g.k] = g;
  const out = [];
  for (const [k, r] of Object.entries(L)) { const i = k.indexOf('|'), sp = k.slice(0, i), [a, h] = k.slice(i + 1).split('@'), sg = nick[k];
    out.push({ k, sp, a, h, an: (sg && (sg.a.nick || sg.a.ab)) || a, hn: (sg && (sg.h.nick || sg.h.ab)) || h, as: r.a, hs: r.h, st: r.state, det: r.detail || '', id: r.id, t: sg ? sg.t : 0 }); }
  /* games on today's Slate that haven't started (no score row yet) */
  for (const d of (slate && slate.days) || []) for (const g of d.games || []) { if (d.d && d.d.replace(/-/g, '') !== td) continue; if (L[g.k]) continue;
    out.push({ k: g.k, sp: g.sp, a: g.a.ab, h: g.h.ab, an: g.a.nick || g.a.ab, hn: g.h.nick || g.h.ab, st: 'pre', det: '', t: g.t }); }
  const ord = { in: 0, pre: 1, post: 2 }; return out.sort((x, y) => ord[x.st] - ord[y.st] || (x.st === 'pre' ? x.t - y.t : 0) || x.sp.localeCompare(y.sp)); }
const clock = t => (t ? new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '');
function chipHtml(g) { const sc = g.st !== 'pre', lead = sc && g.as !== g.hs ? (g.as > g.hs ? 'a' : 'h') : '';
  const body = `<span class="wt-sp">${esc(TAG[g.sp] || g.sp.toUpperCase())}</span><span class="wt-tm${lead === 'a' ? ' w' : ''}">${esc(g.a)}${sc ? ` <b>${g.as}</b>` : ''}</span><span class="wt-tm${lead === 'h' ? ' w' : ''}">${esc(g.h)}${sc ? ` <b>${g.hs}</b>` : ''}</span><small>${g.st === 'in' ? '● ' + esc(g.det) : g.st === 'post' ? 'Final' : esc(clock(g.t))}</small>`;
  return g.id && sc ? `<button type="button" class="wt-c ${g.st}" data-go="gc=${esc(g.sp)}:${esc(g.id)}" aria-label="${esc(g.an)} ${g.as}, ${esc(g.hn)} ${g.hs}, ${g.st === 'in' ? esc(g.det) : 'final'}: open the Gamecast">${body}</button>` : `<button type="button" class="wt-c pre" data-go="slate">${body}</button>`; }
/* live games and today's finals only: a game that hasn't started could be one a sealed pick is on, so the ticker just counts those */
export function ticker() { const G = games(); if (!G.length) return '';
  const live = G.filter(g => g.st === 'in'), fin = G.filter(g => g.st === 'post'), pre = G.filter(g => g.st === 'pre').length;
  return `<div class="wt" role="region" aria-label="Scores"><button type="button" class="wt-c wt-lead" data-go="live"><b>📡 Live</b><small>${live.length ? `${live.length} on now` : 'the feed'}</small></button>${[...live, ...fin].slice(0, 40).map(chipHtml).join('')}${pre ? `<button type="button" class="wt-c pre wt-next" data-go="slate"><span class="wt-sp">Up next</span><span class="wt-tm">${pre} game${pre === 1 ? '' : 's'}</span><small>See the Slate →</small></button>` : ''}</div>`; }

/* ── what happened since this phone last looked: scoring in football and hockey, lead changes and period breaks in basketball, starts, finals ── */
function snap() { const o = {}; if (!S()) return o; for (const [k, r] of Object.entries(todayRows())) o[k] = { a: r.a, h: r.h, st: r.state, p: r.period, det: r.detail, ymd: today() }; return o; }
export function tick() {
  if (!X.ctx) return; const now = snap(), P = X.prev || {}, td = today(), out = [];
  for (const [k, r] of Object.entries(now)) { const q = P[k]; if (!q || r.ymd !== td) continue; const i = k.indexOf('|'), sp = k.slice(0, i), [a, h] = k.slice(i + 1).split('@'), bb = sp === 'nba' || sp === 'ncaab';
    const line = `${a} ${r.a} · ${h} ${r.h}`;
    if (q.st === 'pre' && r.st === 'in') out.push({ k, sp, ty: 'start', tx: `${START[sp] || 'Underway'}: ${a} at ${h}` });
    else if (r.st === 'post' && q.st !== 'post') out.push({ k, sp, ty: 'final', tx: `Final: ${line}` });
    else if (r.st === 'in' && (r.a !== q.a || r.h !== q.h)) {
      if (!bb) { const who = r.a > q.a ? a : h, pts = Math.abs((r.a - q.a) + (r.h - q.h)); out.push({ k, sp, ty: 'score', tx: `${who} scores${sp === 'nhl' ? '' : pts ? ` (+${pts})` : ''}: ${line}`, det: r.det }); }
      else { const lq = Math.sign(q.a - q.h), lr = Math.sign(r.a - r.h); if (lr && lq !== lr) out.push({ k, sp, ty: 'lead', tx: `Lead change: ${lr > 0 ? a : h} up ${Math.abs(r.a - r.h)} · ${line}`, det: r.det }); } }
    if (bb && r.st === 'in' && q.st === 'in' && r.p > q.p && q.p > 0) out.push({ k, sp, ty: 'period', tx: `${r.p === 2 && sp === 'ncaab' ? 'Halftime' : `End of ${['', '1st', '2nd', '3rd', '4th'][q.p] || 'period'}`}: ${line}` }); }
  X.prev = now; if (!out.length) return;
  const ts = Date.now(); out.forEach((e, i) => X.ev.unshift({ ...e, ts: ts - i, id: `${e.k}|${e.ty}|${ts}|${i}` })); X.ev = X.ev.slice(0, 120);
  try { sessionStorage.setItem('tdp.wire', JSON.stringify(X.ev)); } catch (e) { }
  if (X.el) paint();
}

/* ── the reporters (ESPN's news, every sport on today's sheet) and the members' chat ── */
async function getNews(force) { if (X.busy || (!force && Date.now() - X.newsAt < 3 * 60e3)) return; X.busy = true;
  const sps = [...new Set(games().map(g => g.sp))].filter(s => NEWS[s]); if (!sps.length) sps.push('nfl', 'nba');
  await Promise.all(sps.slice(0, 5).map(async sp => { try { const ac = new AbortController(), to = setTimeout(() => ac.abort(), 9000);
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${NEWS[sp]}/news?limit=12&_=${Math.floor(Date.now() / 60e3)}`, { cache: 'no-store', signal: ac.signal }).finally(() => clearTimeout(to)); if (!r.ok) return;
    const j = await r.json(); X.news[sp] = (j.articles || []).filter(a => a && a.headline && !a.premium).map(a => ({ id: 'n' + a.id, sp, ts: Date.parse(a.published || a.lastModified) || 0, h: a.headline, d: a.description || '', by: a.byline || '', url: ((a.links || {}).web || {}).href || '' })); } catch (e) { } }));
  X.newsAt = Date.now(); X.busy = false; }
async function getChat(force) { if (!force && Date.now() - X.chatAt < 20e3) return; try { const r = await fetch(X.ctx.chatUrl + '/chat/history', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); X.chat = (j.messages || []).filter(m => m && m.text && !m.gone).slice(-30).reverse(); X.chatAt = Date.now(); } } catch (e) { } }
/* drawn at once from what's loaded; fresh news and chat fill it in a moment later */
export function box() { if (!X.boxing && (Date.now() - X.newsAt > 3 * 60e3 || Date.now() - X.chatAt > 20e3)) { X.boxing = true; Promise.all([getNews(), getChat()]).then(() => { X.boxing = false; const n = document.getElementById('wbox'); if (n) n.innerHTML = box(); }); }
  const G = games(), live = G.filter(g => g.st === 'in'), N = Object.values(X.news).flat().sort((a, b) => b.ts - a.ts), C = X.chat[0];
  const rows = [live.length ? `<li><span class="wb-i">📺</span><span><b>${live.length} game${live.length === 1 ? '' : 's'} on now</b><small>${live.slice(0, 2).map(g => `${esc(g.a)} ${g.as}–${g.hs} ${esc(g.h)}`).join(' · ')}</small></span></li>` : '',
    C ? `<li><span class="wb-i">💬</span><span><b>${esc(C.name)}</b> in the chat<small>“${esc(String(C.text).slice(0, 110))}”</small></span></li>` : '',
    N[0] ? `<li><span class="wb-i">📰</span><span><b>${esc(N[0].h)}</b><small>${esc([N[0].by, ago(N[0].ts)].filter(Boolean).join(' · '))}</small></span></li>` : ''].filter(Boolean);
  return rows.length ? `<button type="button" class="paper wbox" data-go="live"><span class="wb-h">📡 Live now <em>Open the feed →</em></span><ul>${rows.join('')}</ul></button>` : ''; }

/* ── the Live page ── */
export function mount(el) { if (X.el === el) { paint(); return; } if (X.el) unmount(); X.el = el; el.addEventListener('click', onClick); paint(); refresh(true); }
export function unmount() { if (!X.el) return; X.el.removeEventListener('click', onClick); X.el = null; clearTimeout(X.t); }
async function refresh(force) { await Promise.all([getNews(force), getChat(force)]); if (!X.el) return; paint(); clearTimeout(X.t); X.t = setTimeout(() => { if (!document.hidden) refresh(false); else X.t = setTimeout(() => refresh(false), 30e3); }, 20e3); }
function onClick(e) { const b = e.target.closest('[data-wf]'); if (!b) return; X.f = b.dataset.wf; paint(); }
function paint() {
  if (!X.el) return; const G = games(), live = G.filter(g => g.st === 'in'), fin = G.filter(g => g.st === 'post'), next = G.filter(g => g.st === 'pre').slice(0, 8);
  const card = g => `<button type="button" class="wl-g ${g.st}" ${g.id && g.st !== 'pre' ? `data-go="gc=${esc(g.sp)}:${esc(g.id)}"` : 'data-go="slate"'}><span class="wl-sp">${esc(TAG[g.sp] || '')}</span><span class="wl-r${g.as > g.hs ? ' w' : ''}">${esc(g.an)}<b>${g.st === 'pre' ? '' : g.as}</b></span><span class="wl-r${g.hs > g.as ? ' w' : ''}">${esc(g.hn)}<b>${g.st === 'pre' ? '' : g.hs}</b></span><small>${g.st === 'in' ? '● ' + esc(g.det) + ' · 📺 Gamecast' : g.st === 'post' ? 'Final · 📺 every play' : esc(clock(g.t))}</small></button>`;
  const N = Object.values(X.news).flat(), items = [
    ...X.ev.map(e => ({ ty: 'score', ts: e.ts, html: `<span class="wf-i">${e.ty === 'final' ? '🏁' : e.ty === 'start' ? '🟢' : e.ty === 'score' ? '⚡' : e.ty === 'lead' ? '🔀' : '⏸'}</span><div><b>${esc(e.tx)}</b><small>${esc([TAG[e.sp], e.det, ago(e.ts)].filter(Boolean).join(' · '))}</small></div>` })),
    ...X.chat.map(m => ({ ty: 'chat', ts: +m.ts || 0, html: `<span class="wf-i">💬</span><div><b>${esc(m.name)}${m.owner ? ' <em>the desk</em>' : ''}</b><p>${esc(m.text)}</p><small>Members’ chat · ${ago(+m.ts || 0)}</small></div>` })),
    ...N.map(n => ({ ty: 'news', ts: n.ts, html: `<span class="wf-i">📰</span><div><b>${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.h)}</a>` : esc(n.h)}</b>${n.d ? `<p>${esc(n.d)}</p>` : ''}<small>${esc([TAG[n.sp], n.by ? n.by + ' · ESPN' : 'ESPN', ago(n.ts)].filter(Boolean).join(' · '))}</small></div>` }))]
    .filter(x => X.f === 'all' || x.ty === X.f).sort((a, b) => b.ts - a.ts).slice(0, 80);
  const F = [['all', 'All'], ['score', '⚡ Scores'], ['chat', '💬 Chat'], ['news', '📰 News']];
  X.el.innerHTML = `<h1 class="title">Live</h1><p class="lede">Every game on now, the scoring as it happens, what the members’ chat is saying and what the reporters are posting. Tap a game for its Gamecast.</p>
    ${live.length ? `<h2 class="h2">On now <small class="wl-n">${live.length}</small></h2><div class="wl-grid">${live.map(card).join('')}</div>` : '<p class="note">No games on right now.</p>'}
    ${next.length ? `<details class="wl-more"${live.length ? '' : ' open'}><summary>Up next · ${next.length}</summary><div class="wl-grid">${next.map(card).join('')}</div></details>` : ''}
    ${fin.length ? `<details class="wl-more"><summary>Final today · ${fin.length}</summary><div class="wl-grid">${fin.map(card).join('')}</div></details>` : ''}
    <h2 class="h2">The feed</h2><div class="pview wf-f" role="group" aria-label="Show">${F.map(([v, l]) => `<button type="button" class="${X.f === v ? 'on' : ''}" data-wf="${v}" aria-pressed="${X.f === v}">${l}</button>`).join('')}</div>
    ${items.length ? `<ol class="wf">${items.map(x => `<li class="wf-${x.ty}">${x.html}</li>`).join('')}</ol>` : `<div class="paper blank"><b>${X.f === 'score' ? 'No scoring yet this visit' : 'Nothing yet'}</b><p>${X.f === 'score' ? 'Scores, starts and finals land here as they happen while the app is open.' : 'The feed fills as games, the chat and the reporters move.'}</p></div>`}
    <p class="note">Scores: ESPN, as they happen while the app is open. Reporters: ESPN’s news. Chat: TheDesk members’ chat (<button type="button" class="link" data-go="chat">join it</button>).</p>${X.ctx.foot ? X.ctx.foot() : ''}`;
}
