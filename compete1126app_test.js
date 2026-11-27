/* v81 · Nov 26, 7:30 PM, Chris: "the option to also tail a separate character ghost than the one you're going against… where you are on the
   challenge vs all characters… a league where the players go against each other… a head to head league option… a quick pick ticket builder…
   with all the options in the machine… That fade at the top makes it difficult to see the options… I also want to see what the character
   record was in the challenge!" Same harness as step1124_test.js: real browser, the repo's files, invented feeds and account, no network. */
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
/* v81: every character in the lane, its days packed "result:decimal", comma-separated (the Scout's rows repeated, the Judge and the Simulator their own) */
const pack = row => row.map(x => (x ? x[0] + ':' + x[1] : '')).join(',').replace(/,+$/, '');
const SC = GHOST.lanes['any|any'];
GHOST.lanes['any|any'].all = [{ v: 'Scout', n: 'The Scout', c: '#FB7185', w: 731, l: 508, u: 32.24, r: Object.fromEntries(Object.entries(SC.k).map(([k, r]) => [k, pack(r)])), t: SC.t },
  { v: 'Judge', n: 'The Judge', c: '#F5A524', w: 900, l: 700, u: 12.5, r: { 1: pack(krow([[3, [1, 1.8]], [2, [1, 1.7]], [0, [9, 1.6]]])), 2: pack(krow([[3, [1, 3.3]], [2, [1, 3.1]], [1, [1, 2.9]], [0, [9, 2.8]]])), 4: pack(krow([[3, [1, 10]]])) }, t: { 2: [['MIN ML', -180, null, 'nhl', 'MIN@SJ'], ['SJSU +1.5', -105, null, 'ncaab', 'SJSU@UCSD']] } },
  { v: 'Sim', n: 'The Simulator', c: '#FFD75E', w: 1400, l: 1300, u: -40.1, r: { 1: pack(krow([[3, [0, 1.9]]])), 2: pack(krow([[3, [0, 3.6]], [2, [0, 3.4]]])), 4: pack(krow([[3, [0, 11]]])) } }];
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
/* the draft rooms: one drafting (your pick), one live head-to-head (you have the Scout, the Judge and the Simulator) */
const POOL = [['Scout', 'The Scout', '#FB7185', 8, 10], ['Judge', 'The Judge', '#F5A524', 3, 10], ['Sim', 'The Simulator', '#FFD75E', 6, 10], ['Power', 'The Commissioner', '#8E9BFF', 5, 9], ['Covers', 'Covers', '#FF8A3D', 4, 9], ['Coach', 'The Coach', '#5FD3E8', 5, 10]].map(([v, name, color, w, n]) => ({ v, name, color, w, n, r: (w + 5) / (n + 10) }));
const NAMES = Object.fromEntries(POOL.map(x => [x.v, x.name])), COLORS = Object.fromEntries(POOL.map(x => [x.v, x.color]));
const DRAFTS = [
  { did: 'd1', name: 'Turkey Bowl', fmt: 'pick', fmtLab: 'Head-to-head', legs: 'per', by: 'Rival', size: 2, per: 3, days: 7, bank: 1000, fee: 25, pot: 50, status: 'draft', players: [{ name: 'Rival', auto: false, me: false }, { name: 'Tester', auto: false, me: true }],
    order: ['Rival', 'Tester', 'Tester', 'Rival', 'Rival', 'Tester'], picks: [{ who: 'Rival', v: 'Scout', me: false }], turn: 'Tester', myTurn: true, turnAt: AT + 36e5, pool: POOL, names: NAMES, colors: COLORS, rows: [{ name: 'Rival', bal: 1000, roster: ['Scout'] }, { name: 'Tester', me: true, bal: 1000, roster: [] }] },
  { did: 'd2', name: 'Friendsgiving', fmt: 'pick', fmtLab: 'Head-to-head', legs: 'per', by: 'Tester', size: 2, per: 3, days: 7, bank: 1000, fee: 0, pot: 0, status: 'live', starts: AT - 864e5, ends: AT + 6 * 864e5, players: [{ name: 'Tester', me: true }, { name: 'Pal', me: false }],
    order: [], picks: [], pool: POOL, names: NAMES, colors: COLORS, rows: [{ name: 'Tester', me: true, bal: 1040, w: 1, l: 0, roster: ['Scout', 'Judge', 'Sim'], played: false }, { name: 'Pal', bal: 980, w: 0, l: 1, roster: ['Power', 'Covers', 'Coach'] }] }];
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
        if (u.pathname === '/acct/me') return J({ name: 'Tester', xp: 300, rank: { name: 'Runner', next: 500, nextName: 'Hustler', pct: 0.3 }, trophies: {}, xplog: [], wallet: { bal: 975, bought: 0, prize: 0, w: 0, l: 0, p: 0 }, tickets: [], bets: BETS, runs, leagues: [], drafts: DRAFTS, inbox: { msgs: [], unread: 0 } });
        if (u.pathname === '/acct/dr') return J({ rooms: [{ did: 'open1', name: 'Anyone for a draft?', fmt: 'pick', by: 'Stranger', size: 2, n: 1, days: 7, fee: 25, pot: 25, status: 'open', at: AT, players: ['Stranger'] }] });
        if (u.pathname === '/acct/dr/create') return J({ room: { ...DRAFTS[0], did: 'new1', name: body.name || 'Tester’s team draft', status: 'open', fmt: body.fmt, size: body.size, days: body.days, fee: body.fee, priv: body.priv, code: body.priv ? 'ABC123' : null, players: [{ name: 'Tester', me: true }], picks: [], order: [], rows: [{ name: 'Tester', me: true, bal: 200, w: 0, l: 0, roster: [] }] }, wallet: { bal: 950 } });
        if (u.pathname === '/acct/dr/pick') { const R = JSON.parse(JSON.stringify(DRAFTS.find(x => x.did === body.id))); R.picks.push({ who: 'Tester', v: body.v, me: true }); R.myTurn = false; R.turn = 'Rival'; return J({ room: R }); }
        if (u.pathname === '/acct/chal') return J({ by: {}, leaders: [], recent: [], xp: [], totals: {} });
        if (u.pathname === '/acct/chal/route') { const run = runs.find(x => x.rid === body.rid); return J({ run: { ...run, route: body.route } }); }
        if (u.pathname === '/acct/bet') { const run = runs.find(x => x.rid === body.run); const bet = { id: 'b9', ts: AT, stake: body.stake, mode: 'parlay', dec: 3.5, toWin: body.stake * 2.5, legs: body.legs.map(l => ({ ...l, sp: l.k.split('|')[0], t: m(60), game: l.k.split('|')[1], price: -110, pick: l.k, res: null })), run: body.run, status: 'open' };
          return J({ bet: { ...bet, dr: body.dr }, wallet: { bal: body.run || body.dr ? 975 : +(975 - body.stake).toFixed(2), bought: 0, w: 0, l: 0, p: 0 }, run: run ? { ...run, bal: +(run.bal - body.stake).toFixed(2), open: (run.open || 0) + 1 } : null, entry: null, dentry: body.dr ? { did: body.dr, bal: 1000 - body.stake } : null }); }
        return J({ rows: [], n: 0 }); }
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    return { ctx, p, errs }; };
  try {
    /* ── 1 · the ghost: race anyone, tail a second, see the whole field ── */
    let { ctx, p, errs } = await page([{ ...RUN, ts: AT - 3 * 864e5 }]);
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2600);
    await p.click('.runcard [data-act="ghoston"]'); await p.waitForTimeout(1200);
    const gbox = () => p.evaluate(() => { const g = document.querySelector('.runcard .gh-box'); return g ? g.innerText.replace(/\s+/g, ' ') : ''; });
    let g = await gbox();
    T('the ghost box names who you race and both records: "in this challenge" and the lane\'s last 60 days', /Racing The Scout/.test(g) && /Last 60 days in this lane: 731–508/.test(g) && /1–1 in this challenge/.test(g), g.slice(0, 400));
    T('…a picker to race anyone in the lane, and one to tail a second character', (await p.locator('.runcard [data-change="ghrace"] option').count()) === 3 && (await p.locator('.runcard [data-change="ghtail"] option').count()) === 4);
    await p.selectOption('.runcard [data-change="ghrace"]', 'Judge'); await p.waitForTimeout(400); g = await gbox();
    T('race the Judge instead: its run in this challenge (3–0 from your start, a ticket in play)', /Racing The Judge/.test(g) && /JUDGE\s*D\$[\d.]+\s*3–0 in this challenge/i.test(g), g.slice(0, 500));
    await p.click('.runcard .gh-field > summary'); await p.waitForTimeout(300); g = await gbox();
    const field = await p.evaluate(() => [...document.querySelectorAll('.runcard .ghf li')].map(li => li.innerText.replace(/\s+/g, ' ')));
    T('Where you stand: you and every character, richest first, each with its record in this challenge', /Where you stand: \d(st|nd|rd|th) of 4/.test(g) && field.length === 4 && field.some(x => /^\d You/.test(x)) && field.filter(x => /in this challenge/.test(x)).length === 4, JSON.stringify(field));
    await p.click('.runcard .ghf [data-act="ghtail"][data-v="Scout"]'); await p.waitForTimeout(400); g = await gbox();
    T('Tail the Scout from the field: a second ghost under the first, its ticket today and ⚡ Play its picks', /Tailing Scout/i.test(g) && /Its ticket today/i.test(g) && (await p.locator('.runcard [data-act="qptail"]').count()) === 1, g.slice(g.indexOf('Tailing') - 10, g.indexOf('Tailing') + 300));
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2600); g = await gbox();
    T('…remembered: still racing the Judge and tailing the Scout after a reload, the field still open', /Racing The Judge/.test(g) && /Tailing Scout/i.test(g) && (await p.locator('.runcard .gh-field[open]').count()) === 1, g.slice(0, 200));
    await p.click('.runcard [data-act="qptail"]'); await p.waitForTimeout(800);
    let q = await p.evaluate(() => (document.querySelector('.qps') || {}).innerText || '');
    T('⚡ Play its picks opens Quick Pick on 👤 Tail a character with the Scout picked, its own calls on the ticket', /Tail a character/.test(q) && /The Scout’s own calls/.test(q) && (await p.locator('.qps .qp-legs li').count()) === 2 && /The Scout/.test(q), q.slice(0, 600));
    T('no script errors (ghosts)', errs.length === 0, errs.join(' | ')); await ctx.close();
    /* ── 2 · Quick Pick from the wallet, on the Slate ── */
    ({ ctx, p, errs } = await page([]));
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(2600);
    T('the Slate has a ⚡ Quick Pick door near the top', (await p.locator('#v-slate .qpdoor').count()) === 1);
    await p.click('#v-slate .qpdoor'); await p.waitForTimeout(700);
    q = await p.evaluate(() => (document.querySelector('.qps') || {}).innerText || '');
    T('…it opens for your wallet: three big ways (Safest, The room agrees, Bigger payout)', /Your wallet/.test(q) && /Safest/.test(q) && /The room agrees/.test(q) && /Bigger payout/.test(q), q.slice(0, 300));
    const legsOf = () => p.evaluate(() => [...document.querySelectorAll('.qps .qp-legs li')].map(li => ({ t: li.querySelector('.qp-b b').innerText.replace(/\s+/g, ' '), price: +li.querySelector('.qp-b b small').innerText.replace('−', '-') })));
    await p.click('.qps [data-act="qpsrc"][data-v="safe"]'); await p.waitForTimeout(300); let L = await legsOf();
    T('🛡️ Safest: favorites only (−105 or shorter), never a heavy one', L.length === 2 && L.every(x => x.price <= -105 && x.price >= -600), JSON.stringify(L));
    await p.click('.qps [data-act="qpsrc"][data-v="value"]'); await p.waitForTimeout(300); L = await legsOf();
    T('💰 Bigger payout: plus money', L.length >= 1 && L.every(x => x.price >= 100), JSON.stringify(L));
    await p.click('.qps [data-act="qpsrc"][data-v="agree"]'); await p.waitForTimeout(300);
    await p.click('.qps .qp-tune > summary'); await p.waitForTimeout(200);
    await p.click('.qps [data-act="qpk"][data-d="1"]'); await p.waitForTimeout(300); L = await legsOf();
    T('⚙️ Fine-tune · Legs +1: a 3-leg ticket', L.length === 3, JSON.stringify(L));
    /* v84: bet types moved into 🎛 Filters (with the Slate's other filters) */
    await p.click('.qps .qp-filt > summary'); await p.waitForTimeout(200);
    await p.click('.qps [data-act="qpf"][data-k="mk"][data-v="spread"]'); await p.waitForTimeout(200); await p.click('.qps [data-act="qpf"][data-k="mk"][data-v="total"]'); await p.waitForTimeout(300); L = await legsOf();
    const qtxt = await p.evaluate(() => document.querySelector('.qps').innerText);
    T('…Bet types: moneylines only (fewer games fit, and it says so plainly)', L.every(x => / ML$/.test(x.t.replace(/ [+−-]\d+$/, ''))) || /fit right now/.test(qtxt), JSON.stringify(L) + qtxt.slice(0, 200));
    await p.click('.qps [data-act="qpf"][data-k="mk"][data-v="spread"]'); await p.click('.qps [data-act="qpf"][data-k="mk"][data-v="total"]'); await p.waitForTimeout(200);
    await p.click('.qps [data-act="qpaim"][data-v="500"]'); await p.waitForTimeout(300);
    const dec = await p.evaluate(() => { const t = document.querySelector('.qps .qp-tkh b').innerText.replace('−', '-'); return +t; });
    T('…Aim for ≈ +500: legs go on until the ticket pays about that (or the board runs out)', dec >= 300 || (await legsOf()).length >= 4, String(dec));
    await p.click('.qps [data-act="qpaim"][data-v="0"]'); await p.waitForTimeout(200);
    L = await legsOf(); const first = L[0].t;
    await p.click('.qps .qp-legs li:first-child [data-act="qphold"]'); await p.waitForTimeout(200); await p.click('.qps [data-act="qpshuf"]'); await p.waitForTimeout(300); const L2 = await legsOf();
    T('🔒 hold a leg, 🔀 shuffle: the held leg stays, the rest change', L2[0].t === first && JSON.stringify(L2) !== JSON.stringify(L) && (await p.locator('.qps .qp-legs li.held').count()) === 1, JSON.stringify([L, L2]));
    await p.fill('#qpStake', '7'); await p.click('.qps [data-act="qpplace"]'); await p.waitForTimeout(800);
    let sent = posts.filter(([u0]) => u0 === '/acct/bet').pop();
    T('Place it: from the wallet (no run, no league), at your stake, the legs off the Slate', sent && sent[1].stake === 7 && !sent[1].run && !sent[1].league && !sent[1].dr && sent[1].legs.length === 3, JSON.stringify(sent));
    T('no script errors (Quick Pick)', errs.length === 0, errs.join(' | ')); await ctx.close();
    /* ── 3 · draft leagues ── */
    ({ ctx, p, errs } = await page([]));
    await p.goto('https://desk.test/desk/#leagues', { waitUntil: 'load' }); await p.waitForTimeout(2600);
    let t = await p.evaluate(() => document.querySelector('#v-leagues').innerText);
    T('Leagues: draft leagues first, plain words, your rooms and open ones', /DRAFT LEAGUES/i.test(t) && /Turkey Bowl/i.test(t) && /Friendsgiving/i.test(t) && /Anyone for a draft\?/.test(t) && /THE DESK’S LEAGUES/i.test(t), t.slice(0, 500));
    T('a drafting room: your pick, the characters left with their form', /YOUR PICK/i.test(t) && (await p.locator('[data-drc="d1"] [data-act="drpick"]').count()) === 5 && /8–2 last 4 weeks|3–7 last 4 weeks/.test(t));
    await p.click('[data-drc="d1"] [data-act="drpick"][data-v="Judge"]'); await p.waitForTimeout(600);
    sent = posts.filter(([u0]) => u0 === '/acct/dr/pick').pop();
    T('tap a character: the pick goes to the server', sent && sent[1].id === 'd1' && sent[1].v === 'Judge', JSON.stringify(sent));
    await p.click('[data-act="drform"]'); await p.waitForTimeout(300);
    t = await p.evaluate(() => (document.querySelector('.drnew') || {}).innerText || '');
    T('Start a draft league: four questions, in plain words', /How do you want to play\?/.test(t) && /How many players\?/.test(t) && /How long\?/.test(t) && /Entry fee\?/.test(t) && /Head-to-head/.test(t) && /Team draft/.test(t), t.slice(0, 400));
    await p.click('.drnew [data-act="drf"][data-k="fmt"][data-v="auto"]'); await p.click('.drnew [data-act="drf"][data-k="size"][data-v="3"]'); await p.click('.drnew [data-act="drf"][data-k="days"][data-v="14"]'); await p.click('.drnew [data-act="drf"][data-k="fee"][data-v="25"]'); await p.check('.drnew [data-act="drpriv"]'); await p.fill('#drName', 'Cousins Cup');
    await p.click('.drnew [data-act="drcreate"]'); await p.waitForTimeout(700);
    sent = posts.filter(([u0]) => u0 === '/acct/dr/create').pop();
    T('…Start it: the room as chosen (team draft, 3 players, 14 days, D$25, private, named)', sent && sent[1].fmt === 'auto' && sent[1].size === 3 && sent[1].days === 14 && sent[1].fee === 25 && sent[1].priv === true && sent[1].name === 'Cousins Cup', JSON.stringify(sent));
    await p.click('[data-drc="d2"] [data-act="qpopen"]'); await p.waitForTimeout(800);
    q = await p.evaluate(() => (document.querySelector('.qps') || {}).innerText || '');
    T('a live head-to-head: ⚡ Build today\'s ticket shows each of your characters with its calls', /Friendsgiving/.test(q) && /Scout/.test(q) && /Judge/.test(q) && /Simulator/.test(q) && (await p.locator('.qps .drq-c').count()) === 3, q.slice(0, 500));
    await p.click('.qps [data-act="drqauto"]'); await p.waitForTimeout(300);
    const dl = await p.evaluate(() => [...document.querySelectorAll('.qps .qp-legs li em')].map(x => x.innerText));
    T('⚡ Auto-pick the best: each character\'s best picks, 2 at most from any one, one a game', dl.length >= 2 && ['Scout', 'Judge', 'Simulator'].every(v => dl.filter(x => x.includes(v)).length <= 2), JSON.stringify(dl));
    await p.click('.qps [data-act="qpownclear"]'); await p.waitForTimeout(200);
    const sc = p.locator('.qps .drq-c').first().locator('[data-act="drqpick"]'); const nSc = await sc.count();
    for (let i = 0; i < Math.min(3, nSc); i++) { await sc.nth(i).click(); await p.waitForTimeout(150); }
    const nOn = await p.locator('.qps .drq-c').first().locator('[data-act="drqpick"].on').count();
    T('…tapping a third pick from one character is turned away (2 a character)', nSc < 3 || nOn <= 2, String(nOn));
    await p.click('.qps [data-act="drqauto"]'); await p.waitForTimeout(200); await p.click('.qps [data-act="qpplace"]'); await p.waitForTimeout(800);
    sent = posts.filter(([u0]) => u0 === '/acct/bet').pop();
    T('…Place it: from the draft room\'s bankroll', sent && sent[1].dr === 'd2' && !sent[1].run && sent[1].legs.length >= 2, JSON.stringify(sent));
    T('no script errors (draft leagues)', errs.length === 0, errs.join(' | ')); await ctx.close();
    /* ── 4 · the header sits clear of the iPhone's status-bar blur; sheets never reach it ── */
    ({ ctx, p, errs } = await page([RUN]));
    await p.goto('https://desk.test/desk/#tix', { waitUntil: 'load' }); await p.waitForTimeout(2000);
    T('a solid strip sits under the status bar, and the header starts below the blurred band', await p.evaluate(() => { const sb = document.querySelector('.statusband'), top = document.querySelector('.top'); return !!sb && getComputedStyle(sb).position === 'fixed' && parseFloat(getComputedStyle(top).paddingTop) >= 28; }));
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2200); await p.click('.runcard [data-act="qpopen"]'); await p.waitForTimeout(600);
    T('a tall sheet stops below the status bar: its ✕ is never under the blur', await p.evaluate(() => { const s = document.querySelector('.qps'), x = s && s.querySelector('.cs-x'); return !!x && x.getBoundingClientRect().top >= 28; }));
    T('no script errors (header)', errs.length === 0, errs.join(' | ')); await ctx.close();
  } catch (e) { T('test ran', false, e.stack); }
  await b.close(); console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
