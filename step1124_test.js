/* v64 · Nov 23, Chris, three asks after the v62 run board:
   1 · 11:26 PM "I should be able to click every step on the roadmap and see what's required to get to the next step with a clear
       understanding on how I can move forward the best … also making sure that it recalibrates the next step when the step before was a
       few numerals one way or the other in regards to the parlay odds"
   2 · 11:26 PM "even though you can quick pick you need to be able to manually pick your own ticket"
   3 · 11:32 PM "color code the slate with two different colors so people can tell which game they are highlighting to expand (I also think
       the pick bars should be visible before a game expands)"
   Same harness as runs1123_test.js: real browser, the repo's own files, invented feeds and account, no network, the clock fixed at
   Nov 23, 8:40 PM Central. node step1124_test.js [shots-dir] → also saves screenshots. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname, SHOTS = process.argv[2] || ''; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 500))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const AT = Date.parse('2026-11-24T02:40:00Z'), D = '2026-11-23', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z', m = n => AT + n * 60e3;
/* ── the board: five games tonight, the characters' calls (with their reasons and exact finals) ── */
const call = (v, s, pick, price, p, o, x = {}) => ({ v, s, pick, price, p, o: o ? 1 : 0, r: x.r || { lab: 'CBB ML dogs', rk: 2, of: 4, w: 7, l: 7, u: 9.5, say: '' }, hit: null, ...(x.q ? { q: x.q } : {}) });
const bg = (sp, g, start, st, picks, calls, sc) => ({ sp, game: g, gl: g.replace('@', ' at '), start: iso(start), day: D, st, picks, calls, ...(sc ? { sc } : {}) });
const pk = (m0, sd, pick, price, p, tier, unan, by) => ({ m: m0, sd, pick, price, p, tier, unan: !!unan, off: false, by });
const SJSU_CALLS = { ml: [call('Scout', 'away', 'SJSU ML', 105, 0.61, true, { q: 'picked team on 2nd night of back-to-back · opponent on back-to-back' }),
    call('Power', 'away', 'SJSU ML', 105, 0.6, false, { r: { lab: 'CBB ML dogs', rk: 1, of: 4, w: 20, l: 13, u: 17.5, say: 'top' } }), call('Judge', 'away', 'SJSU ML', 105, 0.58, false, { q: 'road favorite · picked team won 4+ of its last 5' }),
    call('Sim', 'away', 'SJSU ML', 105, 0.57, false), call('Covers', 'home', 'UCSD ML', -125, 0.49, false, { r: { lab: 'CBB ML favorites', w: 87, l: 34, u: -11.3, say: 'worst' } })],
  spread: ['Sim', 'Judge', 'Scout', 'Power', 'Coach', 'Most common', 'Covers'].map(v => call(v, 'away', 'SJSU +1.5', -105, 0.5, false, { r: { lab: 'CBB spread dogs', rk: 4, of: 10, w: 91, l: 68, u: 14.2 } })) };
const BOARD = { d: D, heavy: -500, fc: {}, cast: { Sim: { name: 'The Simulator', color: '#FFD75E' }, Judge: { name: 'The Judge', color: '#F5A524' }, Scout: { name: 'The Scout', color: '#FB7185' }, Power: { name: 'The Commissioner', color: '#8E9BFF' }, Covers: { name: 'Covers', color: '#FF8A3D' }, Coach: { name: 'The Coach', color: '#5FD3E8' }, 'Most common': { name: 'The Scorekeeper', color: '#B8A1FF' } },
  games: [
    bg('nba', 'UTAH@LAL', m(-40), 'in', [pk('ml', 'home', 'LAL ML', -750, 0.94, 'strong', false, ['Sim', 'Judge'])], { ml: [call('Sim', 'home', 'LAL ML', -750, 0.9, true), call('Judge', 'home', 'LAL ML', -750, 0.88, false)] }),
    bg('nba', 'SA@SAC', m(20), 'pre', [pk('total', 'under', 'Under 225', -110, 0.507, 'strong', false, ['Sim', 'Judge', 'Most common'])], { total: [call('Sim', 'under', 'Under 225', -110, 0.55, false), call('Judge', 'under', 'Under 225', -110, 0.53, false), call('Most common', 'under', 'Under 225', -110, 0.52, false), call('Power', 'over', 'Over 225', -110, 0.5, false)] }),
    bg('nhl', 'MIN@SJ', m(20), 'pre', [pk('ml', 'away', 'MIN ML', -180, 0.66, 'strong', false, ['Judge', 'Scout'])], { ml: [call('Judge', 'away', 'MIN ML', -180, 0.66, true, { q: 'road favorite · picked team has the clear talent edge (Scout)' }), call('Scout', 'away', 'MIN ML', -180, 0.58, false), call('Sim', 'home', 'SJ ML', 150, 0.45, false)] }),
    bg('ncaab', 'CSU@ARIZ', m(110), 'pre', [pk('total', 'under', 'Under 158.5', -105, 0.533, 'supreme', true, ['Sim', 'Judge', 'Most common', 'Covers', 'Coach']), pk('spread', 'away', 'CSU +16.5', -112, 0.535, 'value', false, ['Sim'])],
      { total: ['Sim', 'Judge', 'Most common', 'Covers', 'Coach'].map(v => call(v, 'under', 'Under 158.5', -105, 0.55, false)).concat([call('Scout', 'under', 'Under 158.5', -105, 0.56, false)]), spread: [call('Sim', 'away', 'CSU +16.5', -112, 0.54, false)] }),
    bg('ncaab', 'SJSU@UCSD', m(139), 'pre', [pk('spread', 'away', 'SJSU +1.5', -105, 0.5, 'strong', false, ['Sim', 'Judge', 'Scout'])], SJSU_CALLS, { Scout: [85, 81], Power: [85, 81], Judge: [84, 82], Sim: [85, 81], Covers: [79, 78] }),
    /* filed NEV@SF on the board, SF@NEV on the Slate (a re-filed neutral-site game): Quick Pick still finds it */
    bg('ncaab', 'NEV@SF', m(80), 'pre', [pk('ml', 'away', 'NEV ML', -150, 0.6, 'value', false, ['Sim'])], { ml: [call('Sim', 'away', 'NEV ML', -150, 0.6, false)] })] };
const ch = (v, name, color, recent) => ({ v, name, chip: name, color, title: '', bio: '', origin: '', best: [], still: [], record: { w: 10, l: 8, pu: 0, u: 1.2 }, props: { w: 0, l: 0 }, picks: [], recent, teams: [], players: [] });
const rec = (n, w, price = -110) => Array.from({ length: n }, (_, i) => ({ d: new Date(AT - (i % 6 + 1) * 864e5).toISOString().slice(0, 10), kind: 'game', sp: 'nba', pick: 'X ML', price, gl: 'A@B', r: i < w ? 'win' : 'loss' }));
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: AT - 30 * 60e3, record: { w: 53, l: 38, pu: 0, u: 2.3, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 10 * 36e5, unlockMin: 30, props: [], picks: [{ sp: 'ncaab', game: 'W&M@IUIN', pick: 'IUIN +6.5', price: -112, p: 0.63, start: '2026-11-23T20:30Z', hit: true, push: false, unlockAt: Date.parse('2026-11-23T20:00Z') }] },
  characters: [ch('Scout', 'The Scout', '#FB7185', rec(10, 8)), ch('Judge', 'The Judge', '#F5A524', rec(10, 3)), ch('Sim', 'The Simulator', '#FFD75E', rec(10, 6))],
  founder: { tix: [{ id: 'f1', date: D, price: '+625', p0: 0.14, now: 0.14, legs: [
    { sp: 'ncaab', game: 'SFA@UVU', pick: 'Over 145.5', price: -105, st: 'hit', start: iso(m(-100)), day: D },
    { sp: 'ncaab', game: 'TEM@UTM', pick: 'Over 141.5', price: -110, st: 'hit', start: iso(m(-220)), day: D, detail: 'TEM 72–78 UTM (live) · total 150 — already clinched' },
    { sp: 'ncaab', game: 'SJSU@UCSD', pick: 'SJSU +1.5', price: -107, st: 'open', start: iso(m(139)), day: D }] }], rec: { w: 0, l: 39 } },
  board: BOARD };
/* ── the Slate (what D$ tickets are priced from) ── */
const sg = (sp, a, h, t, ln) => ({ k: `${sp}|${a}@${h}`, sp, t, a: { ab: a, name: a, nick: a }, h: { ab: h, name: h, nick: h }, ln });
const SLATE = { v: 1, ts: AT - 10 * 60e3, tz: 'America/Chicago', ranks: {}, days: [{ d: D, games: [
  sg('nba', 'UTAH', 'LAL', m(-40), { fav: 'LAL', line: 13.5, tot: 228, mlA: 520, mlH: -750, spA: -110, spH: -110, ov: -115, un: -105 }),
  sg('nba', 'SA', 'SAC', m(20), { fav: 'SA', line: 8.5, tot: 225, mlA: -350, mlH: 280, spA: -110, spH: -110, ov: -110, un: -110 }),
  sg('nhl', 'MIN', 'SJ', m(20), { fav: 'MIN', line: 1.5, tot: 6, mlA: -180, mlH: 150, spA: 130, spH: -150, ov: -110, un: -110 }),
  sg('ncaab', 'CSU', 'ARIZ', m(110), { fav: 'ARIZ', line: 16.5, tot: 158.5, mlA: 1100, mlH: -2100, spA: -108, spH: -112, ov: -108, un: -112 }),
  sg('ncaab', 'SJSU', 'UCSD', m(139), { fav: 'UCSD', line: 1.5, tot: 155.5, mlA: 114, mlH: -135, spA: -105, spH: -115, ov: -105, un: -115 }),
  sg('ncaab', 'SF', 'NEV', m(80), { fav: 'NEV', line: 3.5, tot: 141.5, mlA: 130, mlH: -150, spA: -110, spH: -110, ov: -110, un: -110 })] }] };
/* ── ESPN tonight ── */
const ev = (id, a, h, as, hs, state, det, per = 2) => ({ id, competitions: [{ status: { period: per, clock: 0, type: { state, completed: state === 'post', shortDetail: det } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] });
/* ── the ghosts the desk publishes: the Scout runs the open book; one lane (Dog pound × NHL) has nobody yet ── */
const GDAYS = Array.from({ length: 31 }, (_, i) => new Date(Date.parse(D + 'T12:00:00Z') - (30 - i) * 864e5).toISOString().slice(0, 10));
const krow = cells => { const row = GDAYS.map(() => null); cells.forEach(([back, v]) => { row[30 - back] = v; }); return row; };
const GHOST = { v: 1, d: D, gen: AT - 20 * 60e3, days: GDAYS, lanes: { 'any|any': { v: 'Scout', n: 'The Scout', c: '#FB7185', w: 731, l: 508, u: 32.24,
  k: { 1: krow([[3, [1, 1.9]], [2, [0, 1.91]], [0, [9, 1.95]]]), 2: krow([[3, [1, 3.64]], [2, [0, 3.5]], [0, [9, 4.3]]]), 4: krow([[3, [0, 12]]]) },
  t: { 2: [['SJSU ML', 105, null, 'ncaab', 'SJSU@UCSD'], ['Under 158.5', -105, 1, 'ncaab', 'CSU@ARIZ']] } } } };
const ESPN = { ncaab: [ev('e1', 'SFA', 'UVU', 70, 81, 'post', 'Final'), ev('e2', 'TEM', 'UTM', 77, 80, 'post', 'Final'), ev('e3', 'W&M', 'IUIN', 87, 82, 'post', 'Final'), ev('e4', 'SJSU', 'UCSD', 0, 0, 'pre', '10:59 PM')],
  nba: [ev('e5', 'UTAH', 'LAL', 42, 53, 'in', 'Halftime', 2), ev('e6', 'PHX', 'NO', 110, 101, 'post', 'Final', 4)], nhl: [ev('e7', 'CBJ', 'NJ', 1, 4, 'post', 'Final', 3)] };
/* ── the account: a Classic Jackpot run with one ticket live and one lost, plus a wallet ticket ── */
const CJ = '30d25x50-any-any';
const leg = (sp, a, h, t, mk, side, line, price, pick, res) => ({ k: `${sp}|${a}@${h}`, sp, t, game: `${a}@${h}`, mk, side, line, price, pick, res });
const BETS = [
  { id: 'b1', ts: m(-120), stake: 2.5, mode: 'parlay', dec: 2.096, toWin: 2.74, run: 'r1', cid: CJ, status: 'open', legs: [leg('ncaab', 'SFA', 'UVU', m(-100), 'total', 'over', 145.5, -105, 'Over 145.5', null), leg('nba', 'UTAH', 'LAL', m(-40), 'ml', 'home', null, -750, 'LAL ML', null)] },
  { id: 'b2', ts: m(-300), stake: 2.5, mode: 'parlay', dec: 3.9, toWin: 7.25, run: 'r1', cid: CJ, status: 'lost', back: 0, done: m(-30), legs: [leg('nhl', 'CBJ', 'NJ', m(-160), 'spread', 'away', 1.5, -140, 'CBJ +1.5', 'miss'), leg('nba', 'PHX', 'NO', m(-160), 'ml', 'away', null, -130, 'PHX ML', 'hit')] },
  { id: 'b3', ts: m(-60), stake: 25, mode: 'parlay', dec: 1.9, toWin: 22.5, status: 'open', legs: [leg('nba', 'SA', 'SAC', m(20), 'total', 'under', 225, -110, 'Under 225', null)] }];
const RUN = { rid: 'r1', cid: CJ, name: 'Tester', ts: AT - 3 * 36e5, ends: AT + 30 * 864e5 - 3 * 36e5, start: 50, bal: 45, goal: 1250, peak: 50, route: 'housemoney', status: 'live', open: 1, bets: 2, w: 0, l: 1, p: 0, cp: 0 };
(async () => {
  const b = await pw.chromium.launch(); const posts = [];
  const page = async (runs, width) => {
    const ctx = await b.newContext({ ...pw.devices['iPhone 14'], ...(width ? { viewport: { width, height: 900 }, isMobile: false, hasTouch: false } : {}), serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
    await p.clock.setFixedTime(new Date(AT));
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); localStorage.setItem('tdp.acct', JSON.stringify({ token: 'x'.repeat(32), name: 'Tester', exp: Date.now() + 864e5 })); } catch (e) { } });
    await p.route('**/*', r => { const u = new URL(r.request().url()), req = r.request();
      if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(FEED) });
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (/ghost\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(GHOST) });
      if (u.hostname === 'site.api.espn.com') { const sp = /nba\/scoreboard/.test(u.pathname) ? 'nba' : /mens-college-basketball\/scoreboard/.test(u.pathname) ? 'ncaab' : /nhl\/scoreboard/.test(u.pathname) ? 'nhl' : ''; return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: sp && /dates=20261123/.test(u.search) ? ESPN[sp] : [] }) }); }
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') { const body = req.method() === 'POST' ? JSON.parse(req.postData() || '{}') : null; if (body) posts.push([u.pathname, body]);
        const J = o => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
        if (u.pathname === '/acct/me') return J({ name: 'Tester', xp: 300, rank: { name: 'Runner', next: 500, nextName: 'Hustler', pct: 0.3 }, trophies: {}, xplog: [], wallet: { bal: 975, bought: 0, prize: 0, w: 0, l: 0, p: 0 }, tickets: [], bets: BETS, runs, leagues: [], inbox: { msgs: [], unread: 0 } });
        if (u.pathname === '/acct/chal') return J({ by: {}, leaders: [], recent: [], xp: [], totals: {} });
        if (u.pathname === '/acct/chal/route') { const run = runs.find(x => x.rid === body.rid); return J({ run: { ...run, route: body.route } }); }
        if (u.pathname === '/acct/bet') { const run = runs.find(x => x.rid === body.run); const bet = { id: 'b9', ts: AT, stake: body.stake, mode: 'parlay', dec: 3.5, toWin: body.stake * 2.5, legs: body.legs.map(l => ({ ...l, sp: l.k.split('|')[0], t: m(60), game: l.k.split('|')[1], price: -110, pick: l.k, res: null })), run: body.run, status: 'open' };
          return J({ bet, wallet: { bal: 975, bought: 0, w: 0, l: 0, p: 0 }, run: run ? { ...run, bal: +(run.bal - body.stake).toFixed(2), open: (run.open || 0) + 1 } : null, entry: null }); }
        return J({ rows: [], n: 0 }); }
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    return { ctx, p, errs }; };
  try {
    /* ── 1 · every step on the road map opens ── */
    let { ctx, p, errs } = await page([RUN]);
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2600);
    T('the road map\'s six stops are buttons, the next one marked, with a line saying they open', (await p.locator('.runcard .rd-cp[data-act="stepopen"]').count()) === 6 && (await p.locator('.runcard .rd-names button[data-act="stepopen"]').count()) === 6 && (await p.locator('.runcard .rd-names button.nx').count()) === 1 && /Tap any step to see what it takes from here/.test(await p.locator('.runcard .rd-tap').innerText()));
    await p.click('.runcard .rd-names button[data-i="0"]'); await p.waitForTimeout(500);
    const sx = async () => p.evaluate(() => { const s = document.querySelector('.sxs'); return s ? s.innerText.replace(/\s+/g, ' ') : ''; });
    let t = await sx();
    T('tapping The Corner opens its step: step 1 of 6, its amount, the run now → the step, the multiplier, and what\'s left to go', /STEP 1 OF 6/i.test(t) && /The Corner/.test(t) && /THE RUN NOW\s*D\$45/i.test(t) && /×\d+\.\d\d/.test(t) && /D\$40\.50 to go/.test(t), t.slice(0, 500));
    T('…it says it is worked out from the balance as it stands, so a ticket that cashes long or short resets it, and what the open ticket would do', /Worked out from the run’s D\$45 as it stands, so every ticket that cashes at a longer or shorter price than planned resets this/.test(t) && /If your open ticket cashes, the run goes to D\$50\.24: then D\$35\.26 to go/.test(t), (t.match(/to go\..{0,330}/) || [])[0]);
    T('…the pace: what the plan wants by now, ahead or behind by how much, the day the pace gets there and the days left', /The plan wants D\$[\d.,]+ by now, so you’re (ahead|behind) by D\$[\d.,]+\. On pace, The Corner comes on day \d+ of 30; you’ve got \d+ days left/.test(t), (t.match(/The plan wants.{0,200}/) || [])[0]);
    const routes = await p.evaluate(() => [...document.querySelectorAll('.sxs .sx-r')].map(b => ({ k: b.dataset.route, on: b.classList.contains('on'), t: b.innerText.replace(/\s+/g, ' ') })));
    T('…every route from here: straight cashes and the chance in the days left, best first, yours and the best marked', routes.length === 8 && routes.filter(r => r.on).length === 1 && routes.find(r => r.on).k === 'housemoney' && /your route/i.test(routes.find(r => r.on).t) && /best odds/i.test(routes[0].t) && routes.every(r => /\d+ straight cash|won’t get there/.test(r.t) && /%/.test(r.t)), JSON.stringify(routes.map(r => r.t)));
    const pc = routes.map(r => parseFloat((r.t.match(/([\d.]+)%/) || [])[1] || '0'));
    T('…sorted by chance, best on top', pc.every((v, i) => i === 0 || v <= pc[i - 1] + 1e-9), JSON.stringify(pc));
    T('…its own route ticket by ticket: each stake from the balance the last ticket left, the price, and where it lands, ending past the step', /House money, ticket by ticket/i.test(t) && /1\s*D\$[\d.]+ on a 2-leg ticket \(\+264\) → D\$[\d.]+/.test(t) && /✓ The Corner/.test(t), (t.match(/ticket by ticket.{0,500}/i) || [])[0]);
    T('…the one-ticket shot with its honest chance (×1.9 from here: one −110 single does it), and what comes after the step', /Or one ticket\. Everything \(D\$45\) on a single at −110 gets to The Corner in one go/.test(t) && /It hits about 52% of the time, and a miss ends the run/.test(t) && /Then Chop Shop at D\$[\d.,]+: another ×\d\.\d\d/.test(t), (t.match(/Or one ticket.{0,260}/) || [])[0]);
    T('…and the ways to move on it: ⚡ Quick Pick today\'s order or ✍️ pick my own', (await p.locator('.sxs [data-act="qpopen"]').count()) === 1 && (await p.locator('.sxs [data-act="qpown"]').count()) === 1);
    if (SHOTS) { await p.screenshot({ path: path.join(SHOTS, 'step_1.png') }); await p.evaluate(() => { const c = document.querySelector('.sxs'); c.scrollTop = 700; }); await p.waitForTimeout(150); await p.screenshot({ path: path.join(SHOTS, 'step_2.png') }); await p.evaluate(() => { const c = document.querySelector('.sxs'); c.scrollTop = c.scrollHeight; }); await p.waitForTimeout(150); await p.screenshot({ path: path.join(SHOTS, 'step_3.png') }); await p.evaluate(() => { document.querySelector('.sxs').scrollTop = 0; }); }
    await p.click('.sxs .sx-nav button:has-text("Chop Shop")'); await p.waitForTimeout(300); t = await sx();
    T('→ Chop Shop: step 2, from the same live balance, with a way back', /STEP 2 OF 6/i.test(t) && /Chop Shop/.test(t) && /THE RUN NOW\s*D\$45/i.test(t) && /← The Corner/.test(t), t.slice(0, 300));
    const tChop = t;
    await p.click('.sxs .sx-r[data-route="snowball"]'); await p.waitForTimeout(700);
    const routed = posts.filter(([u]) => u === '/acct/chal/route').pop();
    T('tapping a route switches the run to it (the server is asked)', routed && routed[1].rid === 'r1' && routed[1].route === 'snowball', JSON.stringify(routed));
    await p.click('.sxs .cs-x'); await p.waitForTimeout(250);
    T('✕ closes the step', !(await p.locator('.sxs').count()));
    /* ── 2 · ✍️ Pick my own ── */
    await p.click('.runcard [data-act="qpopen"]'); await p.waitForTimeout(700);
    T('Quick Pick has a fourth way: ✍️ Pick my own', (await p.locator('.qps [data-act="qpsrc"][data-v="own"]').count()) === 1 && /Pick my own/.test(await p.locator('.qps .qp-src').innerText()));
    await p.click('.qps [data-act="qpsrc"][data-v="own"]'); await p.waitForTimeout(400);
    const own = async () => p.evaluate(() => { const s = document.querySelector('.qps'); return s ? s.innerText.replace(/\s+/g, ' ') : ''; });
    let q = await own();
    const games = await p.evaluate(() => [...document.querySelectorAll('.qpo-g')].map(g => ({ h: g.querySelector('.qpo-h').innerText.replace(/\s+/g, ' '), n: g.querySelectorAll('.qpo-l').length })));
    T('every line on the Slate that fits the run, games that haven\'t started (the live Lakers game isn\'t there), nothing on the ticket yet', games.length === 5 && !games.some(g => /Lakers|LAL/.test(g.h)) && games.every(g => g.n === 6) && /Tap a line to start the ticket/.test(q), JSON.stringify(games));
    T('…the desk\'s own picks are marked on their lines, with how many characters are on each side', (await p.locator('.qpo-l .qpo-dk').count()) >= 4 && /\d on it/.test(q), q.slice(0, 300));
    await p.click('.qpo-l[data-k="ncaab|CSU@ARIZ"][data-mk="total"][data-side="under"]'); await p.waitForTimeout(200);
    await p.click('.qpo-l[data-k="nhl|MIN@SJ"][data-mk="ml"][data-side="away"]'); await p.waitForTimeout(200);
    let L = await p.evaluate(() => [...document.querySelectorAll('.qp-legs li')].map(li => li.querySelector('.qp-b b').innerText.replace(/\s+/g, ' ')));
    T('tap two lines: the ticket builds in the order tapped, priced off the Slate, and the place button is live', L.length === 2 && /^Under 158\.5/.test(L[0]) && /ML/.test(L[1]) && !(await p.locator('.qps [data-act="qpplace"]').isDisabled()), JSON.stringify(L));
    await p.click('.qpo-l[data-k="nhl|MIN@SJ"][data-mk="spread"][data-side="away"]'); await p.waitForTimeout(200);
    L = await p.evaluate(() => [...document.querySelectorAll('.qp-legs li')].map(li => li.querySelector('.qp-b b').innerText.replace(/\s+/g, ' ')));
    T('…a second side on the same game swaps out the first (hockey: the puck line stands alone)', L.length === 2 && /1\.5/.test(L[1]) && !L.some(x => /ML/.test(x)), JSON.stringify(L));
    await p.click('.qps .qp-x[data-i="1"]'); await p.waitForTimeout(200);
    T('…✕ takes a leg off', (await p.locator('.qp-legs li').count()) === 1);
    await p.click('.qpo-l[data-k="ncaab|SJSU@UCSD"][data-mk="ml"][data-side="away"]'); await p.waitForTimeout(200);
    if (SHOTS) { await p.screenshot({ path: path.join(SHOTS, 'own_1.png') }); await p.evaluate(() => { const c = document.querySelector('.qps'); c.scrollTop = 520; }); await p.waitForTimeout(150); await p.screenshot({ path: path.join(SHOTS, 'own_2.png') }); await p.evaluate(() => { document.querySelector('.qps').scrollTop = 0; }); }
    await p.fill('#qpStake', '3'); await p.click('.qps [data-act="qpplace"]'); await p.waitForTimeout(800);
    const sent = posts.filter(([u]) => u === '/acct/bet').pop();
    T('Place it: my own two legs go out from the run at my stake', sent && sent[1].run === 'r1' && sent[1].stake === 3 && JSON.stringify(sent[1].legs) === JSON.stringify([{ k: 'ncaab|CSU@ARIZ', mk: 'total', side: 'under' }, { k: 'ncaab|SJSU@UCSD', mk: 'ml', side: 'away' }]), JSON.stringify(sent));
    T('no script errors', errs.length === 0, errs.join(' | '));
    await ctx.close();
    /* recalibration: the same run after a ticket that cashed a little longer than planned (D$47.20, not D$45) — every number moves */
    ({ ctx, p, errs } = await page([{ ...RUN, bal: 47.2 }]));
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2400);
    await p.click('.runcard .rd-names button[data-i="1"]'); await p.waitForTimeout(400); const t2 = await sx();
    T('the same step after a ticket that cashed a little longer (D$47.20, not D$45): it starts from the new balance, and the multiplier and the amount to go move with it', /THE RUN NOW\s*D\$47\.20/i.test(t2) && (t2.match(/×(\d+\.\d\d)/) || [])[1] !== (tChop.match(/×(\d+\.\d\d)/) || [])[1] && (t2.match(/(D\$[\d.,]+) to go/) || [])[1] !== (tChop.match(/(D\$[\d.,]+) to go/) || [])[1], (t2.match(/THE RUN NOW.{0,140}/i) || [])[0] + ' vs ' + (tChop.match(/THE RUN NOW.{0,140}/i) || [])[0]);
    await ctx.close();
    ({ ctx, p, errs } = await page([{ ...RUN, bal: 120 }]));
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2400);
    await p.click('.runcard .rd-names button[data-i="0"]'); await p.waitForTimeout(400); t = await sx();
    T('a step it already passed says so, by how much, and names the next one', /✓ Reached/.test(t) && /past The Corner by D\$[\d.,]+/.test(t) && /Next up is Chop Shop at D\$[\d.,]+/.test(t), t.slice(0, 400));
    T('no script errors on the steps', errs.length === 0, errs.join(' | '));
    await ctx.close();
    const chalkRun = { ...RUN, rid: 'r2', cid: '7d1.2x50-chalk-any', start: 50, bal: 50, goal: 60, route: 'stairs', open: 0, bets: 0, l: 0 };
    ({ ctx, p, errs } = await page([chalkRun]));
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2400);
    await p.click('.runcard [data-act="qpopen"]'); await p.waitForTimeout(500); await p.click('.qps [data-act="qpsrc"][data-v="own"]'); await p.waitForTimeout(300);
    const prices = await p.evaluate(() => [...document.querySelectorAll('.qpo-l b')].map(b => Number(b.innerText.replace('−', '-'))));
    T('a Chalk walk run only sees favorites at −130 or shorter', prices.length > 0 && prices.every(x => x <= -130), JSON.stringify(prices));
    await ctx.close();
    const twoRun = { ...RUN, rid: 'r4', cid: '3d1.25x250-two-any', start: 250, bal: 250, goal: 312.5, ends: AT + 3 * 864e5 - 3 * 36e5, route: 'stairs', open: 0, bets: 0, l: 0 };
    ({ ctx, p, errs } = await page([twoRun]));
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2400);
    await p.click('.runcard [data-act="qpopen"]'); await p.waitForTimeout(500); await p.click('.qps [data-act="qpsrc"][data-v="own"]'); await p.waitForTimeout(300);
    for (const k of ['ncaab|CSU@ARIZ', 'ncaab|SJSU@UCSD', 'nhl|MIN@SJ']) { await p.click(`.qpo-l[data-k="${k}"][data-mk="total"][data-side="over"]`); await p.waitForTimeout(120); }
    q = await own();
    T('a Two-teamers run with three legs: it says why and won\'t place', /Two-teamers: every ticket has exactly 2 legs/.test(q) && await p.locator('.qps [data-act="qpplace"]').isDisabled(), (q.match(/Two-teamers.{0,80}/) || [q.slice(0, 300)])[0]);
    await ctx.close();
    /* ── 3 · the Slate in two tones, the open game lit, every pick bar on its row ── */
    ({ ctx, p, errs } = await page([RUN]));
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(2400);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#v-slate .game')].map(g => ({ cls: g.className, bg: getComputedStyle(g).backgroundColor, bars: g.querySelectorAll('.g-bp .bp').length, k: g.querySelector('button[data-k]').dataset.k })));
    const tones = new Set(rows.map(r => r.bg));
    T('the sheet runs in two tones, game by game', rows.length >= 5 && tones.size === 2, JSON.stringify(rows.map(r => [r.k, r.cls, r.bg])));
    const arz = rows.find(r => /CSU@ARIZ/.test(r.k)), nev = rows.find(r => /NEV/.test(r.k));
    T('every colored pick shows on its row before the game is opened (CSU@ARIZ: the unanimous under and the value spread; NEV: its value pick)', arz && arz.bars === 2 && nev && nev.bars === 1, JSON.stringify(rows.map(r => [r.k, r.bars])));
    T('…each pick bar wears its tier\'s color (unanimous pink, value green)', await p.evaluate(() => { const g = [...document.querySelectorAll('#v-slate .game')].find(x => /CSU@ARIZ/.test(x.querySelector('button[data-k]').dataset.k)); const b = [...g.querySelectorAll('.g-bp .bp')]; const c = x => getComputedStyle(x, '::before').backgroundColor; return b.length === 2 && b[0].classList.contains('t-unan') && /255, 111, 174/.test(c(b[0])) && b[1].classList.contains('t-value') && /46, 204, 113/.test(c(b[1])); }));
    await p.click('#v-slate .game > button[data-k*="CSU@ARIZ"]'); await p.waitForTimeout(300);
    const lit = await p.evaluate(() => { const g = document.querySelector('#v-slate .game.g-open'); return g ? { k: g.querySelector('button[data-k]').dataset.k, bg: getComputedStyle(g).backgroundColor, sh: getComputedStyle(g).boxShadow } : null; });
    T('the open game is lit in gold with an edge, different from both tones', lit && /CSU@ARIZ/.test(lit.k) && !tones.has(lit.bg) && /201, 162, 39/.test(lit.sh), JSON.stringify(lit));
    if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'slate_tones.png'), fullPage: false });
    T('no script errors on the Slate', errs.length === 0, errs.join(' | '));
    await ctx.close();
    /* ── 4 · 👻 ghost runs ── */
    ({ ctx, p, errs } = await page([{ ...RUN, route: 'housemoney', ts: AT - 3 * 864e5 - 2 * 36e5, ends: AT + 27 * 864e5 }]));
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2400);
    T('a live run offers 👻 Race a ghost', /Race a ghost/.test(await p.locator('.runcard .gh-btn').innerText()));
    await p.click('.runcard [data-act="ghoston"]'); await p.waitForTimeout(900);
    const gb = await p.evaluate(() => { const g = document.querySelector('.runcard .gh-box'); return g ? g.innerText.replace(/\s+/g, ' ') : ''; });
    /* House money from D$50: day 1 D$2.50 cashes at 3.64 → D$56.60; day 2 D$5.80 misses → D$50.80; day 3 no ticket; today D$2.90 in play → D$47.90, D$60.37 if it cashes */
    T('the ghost is the lane\'s best (the Scout, its lane record), racing the same challenge from the same start on the same route', /GHOST RUN/i.test(gb) && /The Scout: the best in open book, 731–508, \+32\.2u/.test(gb), gb.slice(0, 300));
    T('…side by side: you D$45, the ghost D$47.90 after its own tickets (cash, miss, a day off, one in play)', /YOU\s*D\$45\s*0–1/i.test(gb) && /SCOUT\s*D\$47\.90\s*1–1 · in play → D\$60\.37/i.test(gb), gb);
    T('…who leads and by how much, its days as a strip, and its ticket today', /The ghost leads by D\$2\.90/.test(gb) && (await p.locator('.runcard .gh-strip i').count()) === 4 && /✓/.test(await p.locator('.runcard .gh-strip i.w').innerText()) && /Its ticket today/i.test(gb) && /SJSU ML \+105/.test(gb) && /✓ Under 158\.5 −105/.test(gb), gb);
    T('…and the ghost rides the road map', (await p.locator('.runcard .rd-gh').count()) === 1);
    if (SHOTS) await p.locator('.runcard').screenshot({ path: path.join(SHOTS, 'ghost_card.png') });
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2400);
    T('the ghost stays on for that run after a reload (remembered on this phone)', (await p.locator('.runcard .gh-box .gh-vs').count()) === 1);
    await p.click('.runcard [data-act="ghostoff"]'); await p.waitForTimeout(300);
    T('Hide the ghost takes it off the card and the road map', !(await p.locator('.runcard .gh-box').count()) && !(await p.locator('.runcard .rd-gh').count()) && (await p.locator('.runcard .gh-btn').count()) === 1);
    T('no script errors with the ghost', errs.length === 0, errs.join(' | '));
    await ctx.close();
    /* a lane nobody has earned yet says so */
    ({ ctx, p, errs } = await page([{ ...RUN, rid: 'r5', cid: '3d1.1x50-chalk-nhl', start: 50, bal: 50, goal: 55, route: 'stairs', open: 0, bets: 0, l: 0 }]));
    await p.addInitScript(() => { try { localStorage.setItem('tdp.ghost.r5', '1'); } catch (e) { } });
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2600);
    T('a lane with no ghost yet says why (nobody with 8+ graded picks in Chalk walk, NHL)', /No character has 8\+ graded picks in this lane yet \(Chalk walk, NHL\)/.test(await p.locator('.runcard .gh-box').innerText()), await p.locator('.runcard').innerText());
    await ctx.close();
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
