/* TheDesk · My Desk, the widget (v88). One page, four places: the app's preview (mode=embed&prev=1), the pop-out mini desk that floats
   over everything (mode=pop), an embed on any site (mode=embed), and a see-through stream overlay (mode=overlay). The member's My Desk
   rides in ?c= (sports, characters, what to show, the look). It reads the pulse (a few hundred bytes from the chat worker: the public
   card, sealed picks sealed) and, only if there's no pulse yet, the public page once. Times in the viewer's own time zone. */
const Q = new URLSearchParams(location.search), MODE = Q.get('mode') || 'pop';
const API = 'https://thedesk-chat.ironsilkstrategies.workers.dev';
const CFG = (() => { try { const s = (Q.get('c') || '').replace(/-/g, '+').replace(/_/g, '/'); return s ? JSON.parse(decodeURIComponent(escape(atob(s + '='.repeat((4 - s.length % 4) % 4))))) : {}; } catch (e) { return {}; } })();
const SP = Array.isArray(CFG.sp) ? CFG.sp : [], CH = Array.isArray(CFG.ch) ? CFG.ch : [], SHOW = Object.assign({ best3: true, live: true, longshots: true, record: true }, CFG.show || {});
document.documentElement.dataset.theme = ['felt', 'midnight', 'gold'].includes(CFG.theme) ? CFG.theme : 'felt';
document.documentElement.dataset.size = ['s', 'm', 'l'].includes(CFG.size) ? CFG.size : 'm';
document.documentElement.dataset.mode = MODE; if (MODE === 'overlay') document.body.classList.add('overlay');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LG = { nfl: 'NFL', ncaaf: 'CFB', nba: 'NBA', ncaab: 'CBB', nhl: 'NHL', mlb: 'MLB' };
const clock = t => { const d = new Date(typeof t === 'number' ? t : Date.parse(t)); return isFinite(d) ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''; };
const odds = p => { p = +p; return !isFinite(p) || !p ? '' : p > 0 ? '+' + p : '−' + Math.abs(p); };
const u = n => (n >= 0 ? '+' : '−') + Math.abs(+n || 0).toFixed(1) + 'u';
const day = d => { try { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }); } catch (e) { return 'Today'; } };
/* the same summary the desk posts, for the one time there's no pulse yet */
function pulseFrom(F) { const T = F.today || {}, R = F.record || {}, res = x => x.push ? 'push' : x.hit === true ? 'win' : x.hit === false ? 'loss' : null;
  return { day: T.d, rec: R, picks: (T.picks || []).map((x, i) => x.hidden ? { i, sp: x.sp, sealed: 1, start: x.start, opens: x.unlockAt } : { i, sp: x.sp, pick: x.pick, price: x.price, game: x.game, start: x.start, res: res(x), who: (x.calls || []).filter(c => c.with).map(c => c.v) }),
    ls: (((F.founder || {}).tix) || []).slice(0, 2).map(t => ({ id: t.id, name: t.name, n: (t.legs || []).length, hit: (t.legs || []).filter(l => l.st === 'hit').length, res: t.res })) }; }
let P = null, at = 0;
async function load() {
  try { const r = await fetch(API + '/pulse', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (j && j.day && !j.none) { P = j; at = Date.now(); return; } } } catch (e) { }
  if (!P) try { const r = await fetch('../public/picks.json', { cache: 'no-store' }); if (r.ok) { P = pulseFrom(await r.json()); at = Date.now(); } } catch (e) { } }
function paint() { const w = document.getElementById('w'); if (!P) { w.innerHTML = '<p class="blank">Can’t reach the desk right now.</p>'; return; }
  const now = Date.now(), L = (P.picks || []).filter(x => (!SP.length || SP.includes(x.sp)) && (!CH.length || x.sealed || !(x.who || []).length || x.who.some(v => CH.includes(v))));
  const row = x => { const live = !x.sealed && !x.res && Date.parse(x.start) <= now && now - Date.parse(x.start) < 4 * 36e5;
    if (x.sealed) return `<div class="row sealed"><span class="n">No. ${x.i + 1}</span><span><b>Sealed</b><small>${esc(LG[x.sp] || '')} · opens ${esc(clock(x.opens || (Date.parse(x.start) - 30 * 60e3)))}</small></span><span class="r">🔒</span></div>`;
    const cls = x.res || (live ? 'live' : ''), tag = x.res === 'win' ? 'Win' : x.res === 'loss' ? 'Loss' : x.res === 'push' ? 'Push' : live ? 'Live' : clock(x.start);
    return `<div class="row ${cls}"><span class="n">No. ${x.i + 1}</span><span><b>${esc(x.pick)}${x.price ? ' ' + esc(odds(x.price)) : ''}</b><small>${esc(String(x.game || '').replace('@', ' at '))} · ${esc(LG[x.sp] || '')}</small></span><span class="r">${esc(tag)}</span></div>`; };
  const showRows = SHOW.best3 ? L : SHOW.live ? L.filter(x => !x.sealed && !x.res && Date.parse(x.start) <= now) : [];
  const R = P.rec || {}, n = (R.w || 0) + (R.l || 0);
  const ls = SHOW.longshots ? (P.ls || []).filter(t => t.res === 'live' || t.res === 'open' || t.res === 'cashed').slice(0, 1) : [];
  w.innerHTML = `<div class="hd"><h1>${esc(day(P.day))}’s Best ${(P.picks || []).length || 3}</h1>${MODE === 'overlay' ? '' : '<a href="https://ironsilkweekly.com/desk/#today" target="_blank" rel="noopener">TheDesk ↗</a>'}</div>
    <div class="rows">${showRows.map(row).join('') || `<p class="blank">${L.length ? 'Nothing live right now.' : (P.picks || []).length ? 'No picks in your sports today.' : 'No play today: nothing cleared the bar.'}</p>`}</div>
    ${ls.map(t => `<div class="ls"><i>🎯</i><span>${esc(t.name || 'LongShot')}: <b>${t.res === 'cashed' ? 'cashed' : `${t.hit || 0} of ${t.n} hit`}</b></span></div>`).join('')}
    ${SHOW.record && n ? `<div class="ft"><span>On the record: <b>${R.w}–${R.l}${R.pu ? '–' + R.pu : ''}</b>, ${esc(u(R.u))}</span><span>${esc(clock(at))}</span></div>` : ''}`; }
const tick = async () => { await load(); paint(); const live = (P && P.picks || []).some(x => !x.sealed && !x.res && Date.parse(x.start) <= Date.now()); setTimeout(tick, live ? 30e3 : 120e3); };
tick();
