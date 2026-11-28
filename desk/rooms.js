/* TheDesk · Rooms (v88, the calm pass). The dock holds four rooms the member chooses; this sheet holds every room, live badges,
   a Jump search across rooms, today's games and the characters, and the dock editor. Loaded the first time Rooms is tapped. */
let A = null, S, ROOMS, store, esc, toast, $, acctPass, cTitle, deskDay, teamName, LEAGUE, fin, clock, dockPaint, settle;
const ROOM_LIST = [['today', 'Today', 'The Best 3, locked before the games'], ['slate', 'Slate', 'Every game and the desk’s colored picks'], ['props', 'Props', 'Player props the characters like'],
  ['longshots', 'LongShots', 'The founder’s big-odds tickets'], ['challenges', 'Compete', 'Challenges and leagues for D$'], ['cast', 'Characters', 'Who makes the picks, and their records'],
  ['chat', 'Chat', 'The members’ lounge'], ['receipts', 'Receipts', 'Every result on the record'], ['tix', 'My tickets', 'Tickets you’re tracking'], ['me', 'Account', 'Your wallet, record and sign-in'], ['join', 'Join', 'What members get']];
const DOCK_OK = ['today', 'slate', 'props', 'longshots', 'challenges', 'cast', 'chat', 'receipts'];
export function init(api) { if (A) return; A = api; ({ S, ROOMS, store, esc, toast, $, acctPass, cTitle, deskDay, teamName, LEAGUE, fin, clock, dockPaint, settle } = api);
  document.addEventListener('input', e => { if (e.target.id !== 'jumpQ') return; ROOMS.q = e.target.value; const h = $('#jumpHits'); if (h) h.innerHTML = jumpHtml(ROOMS.q); });
  document.addEventListener('keydown', e => { if (e.target.id === 'jumpQ' && e.key === 'Enter') { const f = $('#jumpHits .jh'); if (f) { e.preventDefault(); f.click(); } } }); }
const roomIc = k => { const s = document.querySelector(`.tabs [data-go="${k}"] svg`) || (k === 'tix' ? document.querySelector('#tixBtn svg') : null);
  return s ? s.outerHTML : k === 'me' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1.2-3.6 3.8-5.4 7-5.4s5.8 1.8 7 5.4" stroke-linecap="round"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8z" stroke-linejoin="round"/></svg>'; };
const roomBadge = k => { const b = document.querySelector(`.tabs [data-go="${k}"]`); if (b && b.classList.contains('live')) return '<b class="rm-live">● Live</b>';
  if (k === 'tix') { const n = ($('#tixBtn .tx-n') || {}).textContent; return n && +n ? `<b class="rm-n">${esc(n)}</b>` : ''; } return ''; };
function roomsBody() { const pinned = S.dock, tile = ([k, t, d]) => { const p = pinned.indexOf(k), canPin = DOCK_OK.includes(k);
    return `<button type="button" class="rm${S.tab === k || (k === 'challenges' && S.tab === 'leagues') ? ' here' : ''}${ROOMS.edit && p >= 0 ? ' pinned' : ''}" ${ROOMS.edit ? (canPin ? `data-act="dockpin" data-k="${k}" aria-pressed="${p >= 0}"` : 'disabled') : `data-go="${k}"`}>
      <span class="rm-ic">${roomIc(k)}</span><span class="rm-t"><b>${esc(t)}</b><small>${esc(d)}</small></span>${ROOMS.edit ? (canPin ? `<span class="rm-pin">${p >= 0 ? p + 1 : '+'}</span>` : '') : roomBadge(k)}</button>`; };
  return `<div class="rm-grid">${ROOM_LIST.filter(([k]) => k !== 'join' || !acctPass()).map(tile).join('')}</div>`; }
function jumpHits(q) { q = String(q || '').toLowerCase().trim(); if (!q) return []; const H = [], has = s => String(s || '').toLowerCase().includes(q);
  for (const [k, t, d] of ROOM_LIST) if (has(t) || has(d) || has(k)) H.push({ ic: '🚪', t, d, go: k });
  for (const c of ((S.feed || {}).characters || [])) if (has(c.name) || has(cTitle(c))) H.push({ ic: '🎭', t: c.name, d: cTitle(c) || 'Character', act: 'jumpcast', v: c.v });
  const days = (S.slate && S.slate.days) || [], d0 = days.find(d => d.d >= deskDay());
  if (d0) for (const g of d0.games) { const a = g.a || {}, h = g.h || {}; if (has(a.nick) || has(h.nick) || has(a.name) || has(h.name) || has(a.ab) || has(h.ab) || has(teamName(g.sp, a.ab)) || has(teamName(g.sp, h.ab)))
    H.push({ ic: '🏟', t: `${a.nick || teamName(g.sp, a.ab) || a.ab} at ${h.nick || teamName(g.sp, h.ab) || h.ab}`, d: `${LEAGUE[g.sp] || g.sp} · ${fin(g.t) ? clock(g.t) : ''}`, act: 'jumpgame', v: g.k }); }
  const ACTS = [['quick pick', '⚡', 'Quick Pick', 'The desk builds a D$ ticket', 'qpjump'], ['sound haptics motion settings alerts notifications', '🔔', 'Alerts & settings', 'Notifications, sound, haptics, motion', 'cc'],
    ['widget my desk pop out overlay home screen', '🧩', 'My Desk widget', 'Your picks on your home screen or desktop', 'ccwidget'], ['install app home screen', '📲', 'Get the app', 'Put TheDesk on your home screen', 'guide']];
  for (const [kw, ic, t, d, act] of ACTS) if (kw.includes(q) || has(t)) H.push({ ic, t, d, act });
  return H.slice(0, 12); }
const jumpHtml = q => { const H = jumpHits(q); if (!String(q || '').trim()) return '';
  return H.length ? `<div class="jump-hits" role="listbox" aria-label="Jump to">${H.map(h => `<button type="button" class="jh" role="option" ${h.go ? `data-go="${h.go}"` : `data-act="${h.act}"${h.v != null ? ` data-v="${esc(String(h.v))}"` : ''}`}><i aria-hidden="true">${h.ic}</i><span><b>${esc(h.t)}</b><small>${esc(h.d)}</small></span></button>`).join('')}</div>` : `<p class="jump-none">Nothing called “${esc(q)}”. Try a team, a character or a room.</p>`; };
export function open(focusSearch) { ROOMS.open = true; ROOMS.edit = false; let n = $('#roomsLayer'); if (!n) { n = document.createElement('div'); n.id = 'roomsLayer'; document.body.appendChild(n); }
  n.innerHTML = `<div class="sheet-bg" data-act="roomsclose"></div><section class="csheet fsheet roomsheet" role="dialog" aria-modal="true" aria-label="Rooms">
    <div class="fs-h"><h3>Rooms</h3><button type="button" class="fs-x" data-act="roomsclose" aria-label="Close">✕</button></div>
    <label class="jump"><span class="sr">Jump to a room, team or character</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input type="search" id="jumpQ" placeholder="Jump to a team, character or room" autocomplete="off" enterkeyhint="go" value="${esc(ROOMS.q)}"></label>
    <div id="jumpHits">${jumpHtml(ROOMS.q)}</div><div id="roomsBody">${roomsBody()}</div>
    <div class="rm-foot"><button type="button" class="btn line sm" data-act="dockedit" aria-pressed="false">Choose your dock</button><button type="button" class="btn line sm" data-act="cc">🔔 Alerts &amp; settings</button></div></section>`;
  dockPaint(); settle(); const f = focusSearch ? $('#jumpQ') : n.querySelector('.fs-x'); try { f && f.focus({ preventScroll: true }); } catch (e) { } }
export function repaint() { const b = $('#roomsBody'); if (b) b.innerHTML = roomsBody(); const e = $('[data-act="dockedit"]'); if (e) { e.setAttribute('aria-pressed', String(ROOMS.edit)); e.textContent = ROOMS.edit ? 'Done' : 'Choose your dock'; }
  const h = $('.roomsheet h3'); if (h) h.textContent = ROOMS.edit ? 'Your dock: pick up to 4' : 'Rooms'; }

