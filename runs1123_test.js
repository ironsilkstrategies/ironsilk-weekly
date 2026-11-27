/* v62 · Nov 23, 10:52 PM, Chris, three screenshots:
   1 · "make sure in this area that the characters reasoning is quoted inside their pick box along with their predicted final exact score"
   2 · "the final score should be displayed no matter what the final results are with the final margin of victory and what the team totals
       equaled up to"
   3 · "I don't know if it's registering a ticket to attach to the challenge … it would take the best picks available and build an auto
       parlay … the best in said sport or the most confidence amongst the characters or who's hot … more than anything I want to be able to
       follow my challenges the same way I'd want to follow a ticket … design something 10000x more epic"
   Real browser, the repo's own files, invented feeds and account, no network. The clock is fixed at Nov 23, 8:40 PM Central.
   node runs1123_test.js [shots-dir] → also saves screenshots. */
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
      if (u.hostname === 'site.api.espn.com') { const sp = /nba\/scoreboard/.test(u.pathname) ? 'nba' : /mens-college-basketball\/scoreboard/.test(u.pathname) ? 'ncaab' : /nhl\/scoreboard/.test(u.pathname) ? 'nhl' : ''; return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: sp && /dates=20261123/.test(u.search) ? ESPN[sp] : [] }) }); }
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') { const body = req.method() === 'POST' ? JSON.parse(req.postData() || '{}') : null; if (body) posts.push([u.pathname, body]);
        const J = o => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
        if (u.pathname === '/acct/me') return J({ name: 'Tester', xp: 300, rank: { name: 'Runner', next: 500, nextName: 'Hustler', pct: 0.3 }, trophies: {}, xplog: [], wallet: { bal: 975, bought: 0, prize: 0, w: 0, l: 0, p: 0 }, tickets: [], bets: BETS, runs, leagues: [], inbox: { msgs: [], unread: 0 } });
        if (u.pathname === '/acct/chal') return J({ by: {}, leaders: [], recent: [], xp: [], totals: {} });
        if (u.pathname === '/acct/bet') { const run = runs.find(x => x.rid === body.run); const bet = { id: 'b9', ts: AT, stake: body.stake, mode: 'parlay', dec: 3.5, toWin: body.stake * 2.5, legs: body.legs.map(l => ({ ...l, sp: l.k.split('|')[0], t: m(60), game: l.k.split('|')[1], price: -110, pick: l.k, res: null })), run: body.run, status: 'open' };
          return J({ bet, wallet: { bal: 975, bought: 0, w: 0, l: 0, p: 0 }, run: run ? { ...run, bal: +(run.bal - body.stake).toFixed(2), open: (run.open || 0) + 1 } : null, entry: null }); }
        return J({ rows: [], n: 0 }); }
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    return { ctx, p, errs }; };
  try {
    /* ── 3 · the run: registering, following, Quick Pick ── */
    let { ctx, p, errs } = await page([RUN]);
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2600);
    const card = async () => p.evaluate(() => { const c = document.querySelector('.runcard'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
    let t = await card();
    T('the run card says what\'s in play from the run and where a cash lands it', /In play D\$2\.50 · 1 ticket/.test(t) && /If it cashes → D\$50\.24/.test(t), t.slice(0, 400));
    T('…the road map wears the cash as a ghost past today\'s bankroll, and names the next stop', (await p.locator('.runcard .rd-ghost').count()) === 1 && /D\$40\.50 to The Corner/.test(t), t.match(/to The Corner[^.]*/));
    T('…finish odds read honestly at the low end (a decimal and "1 in N", never a flat 0%)', /FINISH ODDS/i.test(t) && /\d\.\d%|<0\.2%/.test(t) && /1 in [\d,+]+/.test(t) && !/\b0% FINISH/i.test(t), (t.match(/[<\d.]+%\s*FINISH ODDS\s*[^ ]+ [^ ]+ [^ ]+/i) || [])[0]);
    T('every ticket from the run is on the card: the open one live, the lost one settled — the wallet\'s ticket isn\'t', /ON THE BOARD · 1 OPEN/i.test(t) && /● LIVE · 1 OF 2 HIT/i.test(t) && /✗ LOST/i.test(t) && (await p.locator('.runcard .rtk').count()) === 2, t.slice(t.indexOf('ON THE BOARD') - 5, t.indexOf('ON THE BOARD') + 600));
    T('…a leg that finished: its final, who won by how much, and the total (graded on the phone before the server gets there)', /Over 145\.5[^]*Final SFA 70–81 UVU · UVU by 11 · total 151/.test(t), (t.match(/Over 145\.5.{0,160}/) || [])[0]);
    T('…a leg in play: the live score and clock, and its live chance', /Lakers ML[^]*● LIVE UTAH 42–53 LAL · Halftime[^]*% live/.test(t), (t.match(/Lakers ML.{0,160}/) || [t.slice(0, 900)])[0]);
    T('…the ticket\'s cash chance moving with the scores, and what a cash does to the run', /📡 Live cash chance \d+(\.\d)?%/.test(t) && /Cashes for D\$5\.24 → the run goes to D\$50\.24/.test(t), (t.match(/📡.{0,120}/) || [])[0]);
    T('…the settled legs show their finals too, hit or miss (CBJ +1.5 lost 1–4)', /Blue Jackets \+1\.5[^]*Final CBJ 1–4 NJ · NJ by 3 · total 5/.test(t) && /Suns ML[^]*Final PHX 110–101 NO · PHX by 9 · total 211/.test(t), (t.match(/Blue Jackets.{0,140}/) || [t.slice(-700)])[0]);
    T('the Compete tab wears a live dot while a run\'s ticket is in play', await p.evaluate(() => document.querySelector('.tabs [data-go="challenges"]').classList.contains('live')));
    if (SHOTS) await p.locator('.runcard').screenshot({ path: path.join(SHOTS, 'run_card.png') });
    /* ⚡ Quick Pick */
    await p.click('.runcard [data-act="qpopen"]'); await p.waitForTimeout(900);
    const sheet = async () => p.evaluate(() => { const s = document.querySelector('.qps'); return s ? s.innerText.replace(/\s+/g, ' ') : ''; });
    let q = await sheet();
    T('⚡ Quick Pick opens on today\'s order (D$2.50 on a 2-leg ticket) and three big ways to fill it (v81: Safest · The room agrees · Bigger payout, the rest under More ways)', /QUICK PICK/i.test(q) && /Today’s order: D\$2\.50 on a 2-leg ticket/.test(q) && /Safest/.test(q) && /The room agrees/.test(q) && /Bigger payout/.test(q) && /More ways/.test(q) && !/Who’s hot/.test(q), q.slice(0, 400));
    const legsOf = async () => p.evaluate(() => [...document.querySelectorAll('.qp-legs li')].map(li => li.querySelector('.qp-b b').innerText.replace(/\s+/g, ' ')));
    let L = await legsOf();
    T('The room agrees: the unanimous under first, then the widest agreement — games that haven\'t started, one per game', L.length === 2 && /^Under 158\.5/.test(L[0]) && /^SJSU \+1\.5/.test(L[1]) && !L.some(x => /LAL/.test(x)), JSON.stringify(L));
    T('…the stake reads in ink on its white field (it was white on white)', await p.evaluate(() => { const c = getComputedStyle(document.querySelector('#qpStake')); const v = (c.webkitTextFillColor || c.color).match(/\d+/g).map(Number); return v[0] + v[1] + v[2] < 200; }));
    T('…each leg says why (★ Unanimous · 6 of 6 characters) and the ticket shows price, stake, pays, and where the run lands', /★ Unanimous · 6 of 6 characters/.test(q) && /Pays D\$[\d.]+/.test(q) && /Run after a cash D\$[\d.]+/.test(q) && (await p.inputValue('#qpStake')) === '2.5', q.slice(q.indexOf('2-LEG'), q.indexOf('2-LEG') + 400));
    await p.click('[data-act="qpshuf"]'); await p.waitForTimeout(300); const L2 = await legsOf();
    /* v83 · Chris, Nov 27: Shuffle swaps every leg that isn't locked (it only ever turned the last seat); 🔒 lock one to keep it */
    T('🔀 Shuffle draws a new ticket from the legs that aren\'t locked: still 2 legs, a different pair', L2.length === 2 && JSON.stringify(L2.slice().sort()) !== JSON.stringify(L.slice().sort()), JSON.stringify([L, L2]));
    await p.click('.qp-legs li:first-child [data-act="qphold"]'); await p.waitForTimeout(200); const Lk = await legsOf();
    await p.click('[data-act="qpshuf"]'); await p.waitForTimeout(300); const L3 = await legsOf();
    T('…🔒 lock a leg and shuffle: it stays, the other changes', L3.length === 2 && L3[0] === Lk[0] && L3[1] !== Lk[1], JSON.stringify([Lk, L3]));
    await p.click('.qp-legs li:first-child [data-act="qphold"]'); await p.waitForTimeout(200);
    await p.click('[data-act="qpmore"]'); await p.waitForTimeout(200); q = await sheet();
    T('More ways: who\'s hot, tail a character, my favorites, best in a sport, go against the room, pick my own', ['Who’s hot', 'Tail a character', 'My favorites', 'Best in a sport', 'Go against the room', 'Pick my own'].every(x => q.includes(x)), q.slice(0, 600));
    await p.click('[data-act="qpsrc"][data-v="hot"]'); await p.waitForTimeout(300); q = await sheet(); L = await legsOf();
    T('🔥 Who\'s hot: the character on the best run right now, its record, and its own calls (official first)', /The Scout is 8–2 over the last 7 days/.test(q) && L.length === 2 && /^SJSU ML/.test(L[0]) && /The Scout · official/.test(q), q.slice(q.indexOf('Scout') - 20, q.indexOf('Scout') + 300) + ' ' + JSON.stringify(L));
    await p.click('[data-act="qpsrc"][data-v="sport"]'); await p.waitForTimeout(300); q = await sheet(); L = await legsOf();
    const chips = await p.evaluate(() => [...document.querySelectorAll('.qp-chips button')].map(b => b.innerText));
    T('🏟 Best in a sport: a chip per sport with games still to play', chips.length >= 2 && chips.some(x => /NBA/.test(x)) && chips.some(x => /College/.test(x)), JSON.stringify(chips));
    await p.click('.qp-chips button:has-text("College")'); await p.waitForTimeout(300); L = await legsOf();
    T('…College hoops: the supreme under first; and a game the Slate files the other way round (NEV@SF ↔ SF@NEV) still counts', L.length === 2 && /^Under 158\.5/.test(L[0]) && L.every(x => !/SA|MIN|LAL/.test(x.split(' ')[0])), JSON.stringify(L));
    await p.click('[data-act="qpsrc"][data-v="agree"]'); await p.waitForTimeout(300);
    if (SHOTS) { await p.screenshot({ path: path.join(SHOTS, 'quick_pick.png') }); await p.evaluate(() => { const c = document.querySelector('.qps'); c.scrollTop = c.scrollHeight; }); await p.waitForTimeout(200); await p.screenshot({ path: path.join(SHOTS, 'quick_pick2.png') }); await p.evaluate(() => { document.querySelector('.qps').scrollTop = 0; }); }
    await p.click('[data-act="qpplace"]'); await p.waitForTimeout(800);
    const sent = posts.filter(([u]) => u === '/acct/bet').pop();
    T('Place it: the ticket goes out from the run — its run id, today\'s stake, the two legs off the Slate', sent && sent[1].run === 'r1' && sent[1].stake === 2.5 && sent[1].mode === 'parlay' && JSON.stringify(sent[1].legs) === JSON.stringify([{ k: 'ncaab|CSU@ARIZ', mk: 'total', side: 'under' }, { k: 'ncaab|SJSU@UCSD', mk: 'spread', side: 'away' }]), JSON.stringify(sent));
    t = await card(); const toastTxt = await p.evaluate(() => (document.querySelector('#toast') || {}).innerText || '');
    T('…the sheet closes, the toast says where it went, and the run card shows it at once (2 open)', !(await p.locator('.qps').count()) && /Placed from Classic Jackpot: D\$2\.50 on 2 legs/.test(toastTxt) && /· 2 open/.test(t) && /ON THE BOARD · 2 OPEN/i.test(t), toastTxt + ' | ' + t.slice(0, 200));
    T('no script errors on the run board', errs.length === 0, errs.join(' | '));
    await ctx.close();
    /* the rule and the sport shape what Quick Pick builds */
    const chalk = { ...RUN, rid: 'r2', cid: '7d1.2x50-chalk-any', start: 50, bal: 50, goal: 60, route: 'stairs', open: 0, bets: 0, l: 0 }, hoops = { ...RUN, rid: 'r3', cid: '3d1.5x250-any-ncaab', start: 250, bal: 250, goal: 375, route: 'heist', open: 0, bets: 0, l: 0 };
    ({ ctx, p, errs } = await page([chalk, hoops]));
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2200);
    await p.click('.runcard[data-rid="r2"] [data-act="qpopen"]'); await p.waitForTimeout(700); L = await legsOf();
    T('a Chalk walk run only ever gets favorites at −130 or shorter (a single, on its route)', L.length === 1 && /−(1[3-9]\d|[2-9]\d\d|\d{4})/.test(L[0]), JSON.stringify(L));
    await p.click('.cs-x[data-act="qpclose"]'); await p.waitForTimeout(200);
    await p.click('.runcard[data-rid="r3"] [data-act="qpopen"]'); await p.waitForTimeout(700); L = await legsOf(); q = await sheet();
    T('a College hoops run only gets college games (and no sport chips to wander off with)', L.length >= 1 && L.every(x => !/^(SA|MIN|LAL)\b/.test(x)) && !(await p.locator('.qp-chips').count()), JSON.stringify(L));
    await p.click('[data-act="qpslip"]'); await p.waitForTimeout(700);
    const slip = await p.evaluate(() => ({ from: (document.querySelector('#ddFrom') || {}).value, legs: JSON.parse(localStorage.getItem('tdp.ddslip') || '[]').map(l => l.k), tab: location.hash }));
    T('Edit on the Slate: the legs land on the slip, set to bet from the run', slip.from === 'run:r3' && slip.legs.length === L.length && slip.legs.every(k => k.startsWith('ncaab|')), JSON.stringify(slip));
    T('no script errors with rules and sports', errs.length === 0, errs.join(' | '));
    await ctx.close();
    /* a run with no tickets yet says so, and points at Quick Pick */
    ({ ctx, p, errs } = await page([{ ...RUN, rid: 'r4', open: 0, bets: 0, l: 0, bal: 50 }]));
    BETS.forEach(x => { x._run = x.run; delete x.run; });
    await p.goto('https://desk.test/desk/#challenges', { waitUntil: 'load' }); await p.waitForTimeout(2000); t = await card();
    T('a run with no tickets yet: a plain note, Quick Pick and Build my own', /No tickets from this run yet/.test(t) && /⚡ Quick Pick/.test(t) && /Build my own/.test(t), t.slice(-300));
    BETS.forEach(x => { if (x._run) x.run = x._run; delete x._run; });
    await ctx.close();
    /* ── 1 · the characters' reasons, quoted in their boxes beside their exact finals ── */
    ({ ctx, p, errs } = await page([]));
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(1800);
    await p.evaluate(() => { const g = [...document.querySelectorAll('[data-act="gopen"],[data-act="opengame"],.g-card,.sg')].find(x => /SJSU/.test(x.innerText)); if (g) g.click(); }); await p.waitForTimeout(700);
    let won = await p.evaluate(() => [...document.querySelectorAll('.won')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' || '));
    if (!/MONEYLINE/i.test(won)) { await p.evaluate(() => { const k = [...document.querySelectorAll('[data-k]')].find(x => /SJSU/.test(x.dataset.k || '')); if (k) k.click(); }); await p.waitForTimeout(700); won = await p.evaluate(() => [...document.querySelectorAll('.won')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' || ')); }
    const boxes = await p.evaluate(() => [...document.querySelectorAll('.won li')].map(li => ({ who: (li.querySelector('.who') || {}).innerText || '', score: (li.querySelector('.scc') || {}).innerText || '', q: (li.querySelector('.cq') || {}).innerText || '', order: [...li.children].map(c => c.className) })));
    const bx = n => boxes.find(x => x.who.includes(n)) || {};
    T('the Scout\'s box: its exact final, then its reasons quoted in its own voice (only what the desk gave it)', /Calls it SJSU 85–81/.test(bx('The Scout').score) && /played last night|back-to-back|tired legs|running on fumes|no rest/.test(bx('The Scout').q) && bx('The Scout').order.indexOf('scc') < bx('The Scout').order.indexOf('cq'), JSON.stringify(bx('The Scout')));
    T('…the Judge\'s too; a character with no reasons gets no made-up quote (the Simulator)', /Calls it SJSU 84–82/.test(bx('The Judge').score) && bx('The Judge').q.length > 10 && !bx('The Simulator').q, JSON.stringify([bx('The Judge'), bx('The Simulator')]));
    T('…quoted as a quote (curly marks around it)', await p.evaluate(() => { const q = document.querySelector('.won .cq'); const c = getComputedStyle(q, '::before').content; return !!q && (c === 'open-quote' || c.includes('\u201C')); }));
    const gap = await p.evaluate(() => { const e = document.querySelector('.won .say.sy-top'); return e ? [getComputedStyle(e).paddingTop, getComputedStyle(e).display, getComputedStyle(e).marginLeft] : null; });
    T('the #1\'s "has the say" badge sits right under its call (the page header\'s style gave it a big empty gap)', gap && gap[0] === '0px' && gap[1] !== 'flex', JSON.stringify(gap));
    if (SHOTS) { const box = await p.$('.won'); if (box) await box.screenshot({ path: path.join(SHOTS, 'quotes.png') }); }
    T('no script errors on the Slate', errs.length === 0, errs.join(' | '));
    /* ── 2 · finals with the margin and the total, everywhere a game settled ── */
    await p.click('.tabs [data-go="longshots"]'); await p.waitForTimeout(1500);
    t = await p.evaluate(() => document.querySelector('#v-longshots').innerText.replace(/\s+/g, ' '));
    T('LongShots: a settled leg shows its final, who won by how much, and the total (it showed nothing)', /Over 145\.5[^]*SFA at UVU[^]*Final SFA 70–81 UVU · UVU by 11 · total 151/.test(t), (t.match(/Over 145\.5.{0,160}/) || [])[0]);
    T('…the other settled leg too, once its game is final (TEM 77–80)', /Over 141\.5[^]*Final TEM 77–80 UTM · UTM by 3 · total 157/.test(t) && !/already clinched/.test(t), (t.match(/Over 141\.5.{0,180}/) || [])[0]);
    if (SHOTS) await p.locator('#v-longshots .slip').first().screenshot({ path: path.join(SHOTS, 'longshot_finals.png') });
    await p.click('.tabs [data-go="today"]'); await p.waitForTimeout(1500);
    t = await p.evaluate(() => document.querySelector('#v-today').innerText.replace(/\s+/g, ' '));
    T('Today: a pick the desk already graded shows its final with the margin and the total', /IUIN \+6\.5[^]*W&M 87, IUIN 82 W&M by 5 · total 169/.test(t), (t.match(/IUIN \+6\.5.{0,200}/) || [])[0]);
    T('no script errors on LongShots and Today', errs.length === 0, errs.join(' | '));
    await ctx.close();
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
