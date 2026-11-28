/* v83 · Nov 27, 3:22 PM, Chris: "The shuffle option disappears when I'm locking picks… also I want it to have an option for up to 10 legs…
   and the app glitches from time to time where certain buttons will disappear (most recent was my 'my tickets' button) but also sometimes
   there's only 4 tabs at the bottom … whatever that glitch is needs to be fixed". Quick Pick from the wallet on a 12-game board: legs to 10,
   locks that never move the other legs, a Shuffle that stays and swaps only the unlocked seats; and a page that can't be widened by
   anything on it (that widening is what stretched the bottom bar off the side and slid the top bar's buttons away). Real browser, the
   repo's files, invented feed, Slate and account, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 600))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const AT = Date.parse('2026-11-27T21:00:00Z'), D = '2026-11-27', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z', m = n => AT + n * 60e3;
/* twelve NBA games tonight, each with a pick the room agrees on (more agreement on the earlier ones, so the order is fixed) */
const TEAMS = Array.from({ length: 12 }, (_, i) => ['A' + String.fromCharCode(65 + i) + 'X', 'H' + String.fromCharCode(65 + i) + 'Y']);
const call = (v, s, pick, price, p) => ({ v, s, pick, price, p, o: 0, r: { lab: 'NBA ML favorites', w: 10, l: 8, u: 1 }, hit: null });
const CAST = ['Sim', 'Judge', 'Scout', 'Power', 'Covers', 'Coach', 'Most common'];
const BOARD = { d: D, heavy: -1000, fc: {}, cast: Object.fromEntries(CAST.map(v => [v, { name: v, color: '#E9C25A' }])),
  games: TEAMS.map(([a, h], i) => { const on = 7 - Math.floor(i / 2), pick = h + ' ML', price = -140 - i * 5;
    return { sp: 'nba', game: `${a}@${h}`, gl: `${a} at ${h}`, start: iso(m(120 + i * 15)), day: D, st: 'pre',
      picks: [{ m: 'ml', sd: 'home', pick, price, p: 0.62 - i / 200, tier: 'strong', unan: on === 7, off: false, by: CAST.slice(0, on) }],
      calls: { ml: CAST.map((v, j) => j < on ? call(v, 'home', pick, price, 0.6) : call(v, 'away', a + ' ML', 120, 0.45)) } }; }) };
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: AT - 20 * 60e3, record: { w: 59, l: 41, pu: 0, u: 4.09, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 6 * 36e5, unlockMin: 30, props: [], picks: [] }, characters: [], founder: { tix: [], rec: { hits: 1 } }, board: BOARD };
const SLATE = { v: 1, ts: AT - 10 * 60e3, tz: 'America/Chicago', ranks: {}, days: [{ d: D, games: TEAMS.map(([a, h], i) => ({ k: `nba|${a}@${h}`, sp: 'nba', t: m(120 + i * 15), a: { ab: a, name: a, nick: a }, h: { ab: h, name: h, nick: h },
  ln: { fav: h, line: 3.5, tot: 225.5, mlA: 120 + i * 5, mlH: -140 - i * 5, spA: -110, spH: -110, ov: -110, un: -110 } })) }] };
const ME = { name: 'Tester', xp: 300, rank: { name: 'Runner', next: 500, nextName: 'Hustler', pct: 0.3 }, trophies: {}, xplog: [], wallet: { bal: 1180.5, bought: 0, prize: 0, w: 0, l: 0, p: 0 }, tickets: [], bets: [], runs: [], leagues: [], drafts: [], inbox: { msgs: [], unread: 0 } };
(async () => {
  const b = await pw.chromium.launch(); const ctx = await b.newContext({ ...pw.devices['iPhone 14'], serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
  await p.clock.setFixedTime(new Date(AT));
  await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); localStorage.setItem('tdp.acct', JSON.stringify({ token: 'x'.repeat(32), name: 'Tester', exp: Date.now() + 864e5 })); } catch (e) { } });
  await p.route('**/*', r => { const u = new URL(r.request().url());
    if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(FEED) });
    if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
    if (/ghost\.json$/.test(u.pathname)) return r.fulfill({ status: 404, body: '' });
    if (u.hostname === 'site.api.espn.com') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [] }) });
    if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(u.pathname === '/acct/me' ? ME : { rows: [], n: 0, by: {}, leaders: [], recent: [] }) });
    if (u.hostname !== 'desk.test') return r.abort();
    let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
  try {
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(2600);
    await p.click('#v-slate .qpdoor'); await p.waitForTimeout(700);
    const legs = () => p.evaluate(() => [...document.querySelectorAll('.qps .qp-legs li')].map(li => (li.classList.contains('held') ? '🔒' : '') + li.querySelector('.qp-b b').innerText.replace(/\s+/g, ' ').replace(/ [+−-]\d+$/, '')));
    const shuf = () => p.evaluate(() => { const s = document.querySelector('.qps [data-act="qpshuf"]'); return s ? (s.disabled ? 'off:' + (s.title || '') : 'on') : 'gone'; });
    await p.click('.qps .qp-tune > summary'); await p.waitForTimeout(200);
    /* v86 · "the screen jump[s] when I click + to add legs": the + stays where it was, tap after tap */
    const plusTop = () => p.evaluate(() => Math.round(document.querySelector('.qps [data-act="qpk"][data-d="1"]').getBoundingClientRect().top));
    await p.evaluate(() => { const b = document.querySelector('.qps [data-act="qpk"][data-d="1"]'), sh = document.querySelector('.qps'); sh.scrollTop += b.getBoundingClientRect().top - innerHeight * 0.6; });
    await p.waitForTimeout(150); const tops = [await plusTop()];
    for (let i = 0; i < 3; i++) { await p.click('.qps [data-act="qpk"][data-d="1"]'); await p.waitForTimeout(150); tops.push(await plusTop()); }
    const sheetTop = await p.evaluate(() => Math.round(document.querySelector('.qps').getBoundingClientRect().top));
    T('tapping + to add legs keeps the + under your finger (no jump), and the sheet holds its height', tops.every(x => Math.abs(x - tops[0]) <= 2), JSON.stringify({ tops, sheetTop }));
    for (let i = 0; i < 10; i++) { const plus = p.locator('.qps [data-act="qpk"][data-d="1"]'); if (await plus.isDisabled()) break; await plus.click(); await p.waitForTimeout(120); }
    let L = await legs(); const plusOff = await p.locator('.qps [data-act="qpk"][data-d="1"]').isDisabled(), kShown = await p.evaluate(() => document.querySelector('.qps .qp-step b').innerText);
    T('Legs go up to 10 now (it stopped at 8), and + switches off there', L.length === 10 && kShown === '10' && plusOff, JSON.stringify([L.length, kShown, plusOff]));
    T('…a 10-leg ticket with games left over has 🔀 Shuffle', (await shuf()) === 'on', await shuf());
    /* lock the 3rd and 5th: nothing else moves */
    const before = L.slice();
    await p.click('.qps .qp-legs li:nth-child(3) [data-act="qphold"]'); await p.waitForTimeout(150);
    await p.click('.qps .qp-legs li:nth-child(5) [data-act="qphold"]'); await p.waitForTimeout(200); L = await legs();
    const plain = x => x.replace('🔒', '');
    T('locking two legs never moves the others: the same ten, the two locked ones first', L.length === 10 && L.filter(x => x.startsWith('🔒')).length === 2 && JSON.stringify(L.map(plain).sort()) === JSON.stringify(before.slice().sort()) && L[0] === '🔒' + before[2] && L[1] === '🔒' + before[4], JSON.stringify([before, L]));
    T('…and 🔀 Shuffle is still there with two legs locked (it vanished: Chris, Nov 27)', (await shuf()) === 'on', await shuf());
    if (process.env.QPSHOT) { await p.evaluate(() => document.querySelector('.qps .qp-go').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); await p.screenshot({ path: process.env.QPSHOT + '/qp_two.png' }); await p.evaluate(() => document.querySelector('.qps .qp-tkh').scrollIntoView({ block: 'start' })); await p.waitForTimeout(200); await p.screenshot({ path: process.env.QPSHOT + '/qp_top.png' }); }
    /* shuffle five times: the locked two stay; the rest change every press, never the same set twice running */
    let prev = L, ok = true, changed = 0, why = '';
    for (let i = 0; i < 5; i++) { await p.click('.qps [data-act="qpshuf"]'); await p.waitForTimeout(200); const N = await legs();
      const held = N.filter(x => x.startsWith('🔒')), free = N.filter(x => !x.startsWith('🔒')), pfree = prev.filter(x => !x.startsWith('🔒'));
      if (N.length !== 10 || held.length !== 2 || held[0] !== L[0] || held[1] !== L[1]) { ok = false; why = 'held moved: ' + JSON.stringify(N); break; }
      if (JSON.stringify(free.slice().sort()) === JSON.stringify(pfree.slice().sort())) { ok = false; why = 'same set twice: ' + JSON.stringify(N); break; }
      if (new Set(N.map(plain)).size !== 10) { ok = false; why = 'a game twice: ' + JSON.stringify(N); break; }
      changed += free.filter(x => !pfree.includes(x)).length; prev = N; }
    T('🔀 Shuffle swaps only the unlocked legs: the locked two stay put, the others change on every press, one leg a game', ok && changed >= 5, why || String(changed));
    /* lock one more after a shuffle: the shuffled legs stay as they are */
    const S0 = await legs(); const firstFree = S0.findIndex(x => !x.startsWith('🔒'));
    await p.click(`.qps .qp-legs li:nth-child(${firstFree + 1}) [data-act="qphold"]`); await p.waitForTimeout(200); const S1 = await legs();
    T('…lock another after shuffling: the shuffled ticket stays exactly as it was', JSON.stringify(S1.map(plain).sort()) === JSON.stringify(S0.map(plain).sort()) && S1.filter(x => x.startsWith('🔒')).length === 3, JSON.stringify([S0, S1]));
    T('…three locked of ten, two games to spare: 🔀 Shuffle still there (the old count hid it: 12 games ≤ 3 locked + 9)', (await shuf()) === 'on', await shuf());
    /* lock all ten: Shuffle stays on screen, switched off, and says why */
    for (let i = 0; i < 10; i++) { const free = await p.locator('.qps .qp-legs li:not(.held) [data-act="qphold"]').count(); if (!free) break; await p.locator('.qps .qp-legs li:not(.held) [data-act="qphold"]').first().click(); await p.waitForTimeout(120); }
    T('every leg locked: 🔀 Shuffle stays on screen, switched off, and says why', /^off:Every leg is locked/.test(await shuf()), await shuf());
    if (process.env.QPSHOT) { await p.evaluate(() => document.querySelector('.qps .qp-go').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); await p.screenshot({ path: process.env.QPSHOT + '/qp_locked.png' }); }
    /* a leg fewer drops the last one; a leg more adds the next best, the rest stay */
    await p.locator('.qps .qp-legs li.held [data-act="qphold"]').last().click(); await p.waitForTimeout(150); const K0 = await legs();
    await p.click('.qps [data-act="qpk"][data-d="-1"]'); await p.waitForTimeout(200); const K1 = await legs();
    T('Legs −1 takes one unlocked leg off and leaves the rest', K1.length === 9 && K1.every(x => K0.includes(x)), JSON.stringify([K0, K1]));
    T('no script errors (Quick Pick)', errs.length === 0, errs.join(' | '));
    await p.click('.qps [data-act="qpclose"]').catch(() => { }); await p.evaluate(() => { const l = document.querySelector('#qpLayer'); if (l) l.innerHTML = ''; document.body.classList.remove('sheet-on'); }); await p.waitForTimeout(300);

    /* ── the glitch: anything on a page wider than the screen used to widen the whole page on a phone ── */
    await p.evaluate(() => { const d = document.createElement('div'); d.id = 'wideX'; d.style.cssText = 'width:800px;height:24px;background:red'; document.querySelector('#v-slate').prepend(d); });
    await p.waitForTimeout(600);
    const g = await p.evaluate(() => { const tb = document.querySelector('.tabs').getBoundingClientRect(), last = document.querySelector('.tabs button:last-child').getBoundingClientRect(), tx = document.querySelector('#tixBtn').getBoundingClientRect(), ac = document.querySelector('#acctBtn').getBoundingClientRect();
      return { iw: innerWidth, tabs: Math.round(tb.width), last: Math.round(last.right), tix: Math.round(tx.right), acct: Math.round(ac.right), n: [...document.querySelectorAll('.tabs button')].filter(x => { const r = x.getBoundingClientRect(); return r.width && r.left >= 0 && r.right <= innerWidth + 1; }).length }; });
    T('something 800px wide on a page no longer widens it: the whole dock (four rooms + Rooms) on screen, My tickets and your account in the top bar (the bar ran 816px wide and showed half its tabs)', g.iw === 390 && g.tabs <= 390 && g.tabs >= 360 && g.n === 5 && g.last <= 390 && g.tix <= 390 && g.acct <= 390, JSON.stringify(g));
    await p.evaluate(() => { location.hash = '#tix'; }); await p.waitForTimeout(800);
    await p.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'display:flex;gap:8px'; d.innerHTML = '<b style="white-space:nowrap">' + 'Thanksgiving Week Classic '.repeat(6) + '</b>'; document.querySelector('#v-tix').prepend(d); });
    await p.waitForTimeout(500);
    const g2 = await p.evaluate(() => ({ iw: innerWidth, tabs: Math.round(document.querySelector('.tabs').getBoundingClientRect().width) }));
    T('…a long line that won\'t wrap (a league name six times over) on My tickets: same, the page stays the phone\'s width', g2.iw === 390 && g2.tabs <= 390 && g2.tabs >= 360, JSON.stringify(g2));
    T('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { T('test ran', false, e.stack); }
  await b.close(); console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
