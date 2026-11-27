/* v84 · Nov 27, 4:23 PM, Chris: "On the quick pick I should be able to lock picks and still pick other filters and those locked should
   stay … also give me a list of filters just like the slate so I can come up with different quick pick variables … make it extremely
   versatile". Quick Pick from the wallet on a 12-game board (NBA, NHL, college hoops; today and tomorrow): locked legs ride through
   every way to build it, every filter, Pick my own and back; the 🎛 Filters panel has the Slate's filters and more, each chip counting
   the games it leaves; builds save and come back. Real browser, the repo's files, invented feed, Slate and account, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 700))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
/* Friday 11:00 AM Central */
const AT = Date.parse('2026-11-27T17:00:00Z'), D = '2026-11-27', D1 = '2026-11-28', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z', h = n => AT + n * 36e5;
const CAST = ['Sim', 'Judge', 'Scout', 'Power', 'Covers', 'Coach', 'Most common'];
const R0 = { lab: 'x', w: 8, l: 9, u: -1 }, TOP = { lab: 'NHL ML favorites', w: 30, l: 12, u: 9, rk: 1, say: 'top' }, UP = { lab: 'NBA overs', w: 20, l: 10, u: 5 };
const call = (v, pick, p, r, o) => ({ v, s: '', pick, price: 0, p, o: o ? 1 : 0, r: r || R0, hit: null });
/* g: [sp, away, home, hours from now, day, market, pick, other side's pick, price, tier, unanimous, characters on it of how many, p, who's #1 / up] */
const GAMES = [
  ['nba', 'BA1', 'BH1', 2, D, 'ml', 'BH1 ML', 'BA1 ML', -150, 'supreme', true, 7, 7, 0.70],
  ['nba', 'BA2', 'BH2', 3, D, 'total', 'Over 220.5', 'Under 220.5', -110, 'strong', false, 4, 6, 0.58, 'up'],
  ['nba', 'BA3', 'BH3', 4, D, 'spread', 'BA3 +5.5', 'BH3 -5.5', -110, 'value', false, 2, 5, 0.55],
  ['nba', 'BA4', 'BH4', 5, D, 'ml', 'BA4 ML', 'BH4 ML', 160, 'value', false, 3, 6, 0.45],
  ['nhl', 'KA5', 'KH5', 2.5, D, 'ml', 'KH5 ML', 'KA5 ML', -200, 'supreme', false, 5, 6, 0.68, 'top'],
  ['nhl', 'KA6', 'KH6', 3.5, D, 'total', 'Under 6', 'Over 6', -115, 'strong', false, 4, 7, 0.57],
  ['nhl', 'KA7', 'KH7', 6, D, 'ml', 'KA7 ML', 'KH7 ML', 140, 'value', false, 3, 5, 0.48],
  ['ncaab', 'CA8', 'CH8', 1.5, D, 'spread', 'CH8 -7.5', 'CA8 +7.5', -110, 'strong', false, 5, 7, 0.62, 'top'],
  ['ncaab', 'CA9', 'CH9', 4.5, D, 'total', 'Under 140.5', 'Over 140.5', -105, 'supreme', true, 6, 6, 0.66, 'up'],
  ['ncaab', 'CA10', 'CH10', 7, D, 'ml', 'CA10 ML', 'CH10 ML', 250, 'value', false, 2, 4, 0.40],
  ['nba', 'BA11', 'BH11', 26, D1, 'ml', 'BH11 ML', 'BA11 ML', -130, 'strong', false, 4, 6, 0.60],
  ['nhl', 'KA12', 'KH12', 28, D1, 'ml', 'KA12 ML', 'KH12 ML', 120, 'value', false, 3, 6, 0.50]];
const BOARD = { d: D, heavy: -1000, cast: Object.fromEntries(CAST.map(v => [v, { name: 'The ' + v, color: '#E9C25A' }])),
  fc: { 'nhl|ml|fav': { lv: 2, w: 20, l: 8, u: 6 }, 'nba|total|over': { lv: -2, w: 5, l: 12, u: -7 } },
  games: GAMES.map(([sp, a, hm, hh, day, m, pick, other, price, tier, unan, on, all, p, x]) => ({ sp, game: `${a}@${hm}`, gl: `${a} at ${hm}`, start: iso(h(hh)), day, st: 'pre',
    picks: [{ m, sd: '', pick, price, p, tier, unan, off: tier === 'supreme', by: CAST.slice(0, on) }],
    calls: { [m]: CAST.slice(0, all).map((v, j) => j < on ? call(v, pick, p - j / 100, j === 1 && x === 'top' ? TOP : j === 2 && x === 'up' ? UP : R0, j === 0 && tier === 'supreme') : call(v, other, 0.45)) } })) };
const ln = (m, pick, other, price) => { /* the Slate's line for the game: the pick at its price, the rest a standard line */
  const L = { fav: '', line: null, tot: null, mlA: 110, mlH: -130, spA: -110, spH: -110, ov: -110, un: -110 };
  return L; };
const SLATE = { v: 1, ts: AT - 10 * 60e3, tz: 'America/Chicago', ranks: {}, days: [D, D1].map(d => ({ d, games: GAMES.filter(g => g[4] === d).map(([sp, a, hm, hh, day, m, pick, other, price]) => {
  const L = { fav: hm, line: 5.5, tot: 220.5, mlA: 130, mlH: -150, spA: -110, spH: -110, ov: -110, un: -110 };
  if (m === 'ml') { if (pick.startsWith(hm)) { L.mlH = price; L.mlA = price < 0 ? Math.round(-price * 0.85) : -Math.round(price * 1.2); } else { L.mlA = price; L.mlH = price > 0 ? -Math.round(price * 1.2) : 120; } }
  if (m === 'spread') { const v = +pick.split(' ')[1]; L.line = Math.abs(v); L.fav = v < 0 ? pick.split(' ')[0] : (pick.startsWith(a) ? hm : a); if (pick.startsWith(a)) L.spA = price; else L.spH = price; }
  if (m === 'total') { L.tot = +pick.split(' ')[1]; if (/^Over/.test(pick)) L.ov = price; else L.un = price; }
  return { k: `${sp}|${a}@${hm}`, sp, t: h(hh), a: { ab: a, name: a, nick: a }, h: { ab: hm, name: hm, nick: hm }, ln: L }; }) })) };
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: AT - 20 * 60e3, record: { w: 59, l: 41, pu: 0, u: 4.09, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 2 * 36e5, unlockMin: 30, props: [], picks: [] }, characters: CAST.map(v => ({ v, name: 'The ' + v, color: '#E9C25A', title: '', record: { w: 10, l: 8, u: 1 }, recent: [], picks: [] })), founder: { tix: [], rec: { hits: 1 } }, board: BOARD };
/* you already have an open D$ ticket on BA1@BH1 */
const ME = { name: 'Tester', xp: 300, rank: { name: 'Runner', next: 500, nextName: 'Hustler', pct: 0.3 }, trophies: {}, xplog: [], wallet: { bal: 1000, bought: 0, prize: 0, w: 0, l: 0, p: 0 }, tickets: [],
  bets: [{ id: 'b1', ts: AT - 36e5, stake: 10, mode: 'parlay', dec: 1.67, toWin: 6.7, status: 'open', legs: [{ k: 'nba|BA1@BH1', sp: 'nba', t: h(2), game: 'BA1@BH1', mk: 'ml', side: 'home', price: -150, pick: 'BH1 ML', res: null }] }], runs: [], leagues: [], drafts: [], inbox: { msgs: [], unread: 0 } };
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
  const legs = () => p.evaluate(() => [...document.querySelectorAll('.qps .qp-legs li')].map(li => ({ t: li.querySelector('.qp-b b').innerText.replace(/\s+/g, ' ').replace(/ [+−-]\d+$/, ''), price: +li.querySelector('.qp-b b small').innerText.replace('−', '-'), lg: li.querySelector('.qp-b > small').innerText.split(' · ')[0], why: (li.querySelector('em') || {}).innerText || '', held: li.classList.contains('held') })));
  const free = L => L.filter(x => !x.held), held = L => L.filter(x => x.held).map(x => x.t);
  const f = async (k, v) => { await p.click(`.qps [data-act="qpf"][data-k="${k}"][data-v="${v}"]`); await p.waitForTimeout(200); };
  const panel = () => p.evaluate(() => { const d = document.querySelector('.qps .qp-filt'); return d ? { open: d.open, rows: [...d.querySelectorAll('.qp-fr > span:first-child')].map(x => x.innerText.trim()), sum: d.querySelector('summary').innerText.replace(/\s+/g, ' ') } : null; });
  const chipN = (k, v) => p.evaluate(([k, v]) => { const b0 = document.querySelector(`.qps [data-act="qpf"][data-k="${k}"][data-v="${v}"] small`); return b0 ? +b0.innerText : null; }, [k, v]);
  try {
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(2600);
    await p.click('#v-slate .qpdoor'); await p.waitForTimeout(700);
    await p.click('.qps .qp-tune > summary'); await p.waitForTimeout(150);
    for (let i = 0; i < 2; i++) { await p.click('.qps [data-act="qpk"][data-d="1"]'); await p.waitForTimeout(120); }
    let L = await legs();
    T('The room agrees, 4 legs: the unanimous and supreme picks first', L.length === 4 && /BH1 ML/.test(L[0].t + L[1].t) && /Under 140\.5/.test(L[0].t + L[1].t), JSON.stringify(L.map(x => x.t)));
    /* the panel */
    await p.click('.qps .qp-filt > summary'); await p.waitForTimeout(200); let P = await panel();
    T('🎛 Filters opens with the Slate\'s rows and more: day, leagues, start time, bet types, side, odds, strength, how sure, characters on it, one character, the toggles, what fills the seats', P && P.open && ['Day', 'Leagues', 'Start time', 'Bet types', 'Side', 'Odds', 'Strength', 'How sure', 'Characters on it', 'With', 'Only', 'Fill by'].every(x => P.rows.some(r => r.toLowerCase() === x.toLowerCase())), JSON.stringify(P));
    T('…every chip counts the games it would leave (Leagues: NBA 5, NHL 4, College 3; Day: Today 10, Tomorrow 2)', (await chipN('lg', 'nba')) === 5 && (await chipN('lg', 'nhl')) === 4 && (await chipN('lg', 'ncaab')) === 3 && (await chipN('day', 'today')) === 10 && (await chipN('day', 'tomorrow')) === 2,
      JSON.stringify([await chipN('lg', 'nba'), await chipN('lg', 'nhl'), await chipN('lg', 'ncaab'), await chipN('day', 'today'), await chipN('day', 'tomorrow')]));
    /* lock two, then change everything around them */
    await p.click('.qps .qp-legs li:nth-child(1) [data-act="qphold"]'); await p.waitForTimeout(150); await p.click('.qps .qp-legs li:nth-child(2) [data-act="qphold"]'); await p.waitForTimeout(200);
    L = await legs(); const H0 = held(L);
    T('two legs locked', H0.length === 2, JSON.stringify(L));
    await p.click('.qps [data-act="qpsrc"][data-v="value"]'); await p.waitForTimeout(300); L = await legs();
    T('💰 Bigger payout: the two locked favorites stay; every other leg is plus money', JSON.stringify(held(L)) === JSON.stringify(H0) && free(L).length >= 1 && free(L).every(x => x.price >= 100), JSON.stringify(L.map(x => [x.t, x.price, x.held])));
    await p.click('.qps [data-act="qpsrc"][data-v="agree"]'); await p.waitForTimeout(300);
    await f('lg', 'nhl'); L = await legs();
    T('Leagues: NHL only — the locked legs stay whatever league they are; the free seats are NHL', JSON.stringify(held(L)) === JSON.stringify(H0) && free(L).length >= 1 && free(L).every(x => x.lg === 'NHL'), JSON.stringify(L.map(x => [x.t, x.lg, x.held])));
    await f('lg', 'ncaab'); L = await legs();
    T('…tap College hoops too: NHL or college in the free seats', free(L).every(x => x.lg === 'NHL' || /College/.test(x.lg)) && free(L).length >= 2, JSON.stringify(L.map(x => [x.t, x.lg])));
    await f('lg', 'nhl'); await f('lg', 'ncaab');
    await f('mk', 'ml'); await f('mk', 'spread'); L = await legs();
    T('Bet types: totals only — the free seats are overs and unders, the locked legs stay', JSON.stringify(held(L)) === JSON.stringify(H0) && free(L).length >= 1 && free(L).every(x => /^(Over|Under) /.test(x.t)), JSON.stringify(L.map(x => x.t)));
    await f('mk', 'ml'); await f('mk', 'spread');
    await f('side', 'dog'); L = await legs();
    T('Side: Underdogs — the free seats are the plus-money and getting-points sides', free(L).length >= 1 && free(L).every(x => x.price > 0 || /\+\d/.test(x.t)), JSON.stringify(L.map(x => [x.t, x.price])));
    await f('side', 'dog'); await f('odds', 'dog'); L = await legs();
    T('Odds: +131 to +300 — the free seats are priced there', free(L).length >= 1 && free(L).every(x => x.price >= 131 && x.price <= 300), JSON.stringify(L.map(x => [x.t, x.price])));
    await f('odds', 'dog'); await f('cf', '60'); L = await legs();
    T('How sure: 60%+ — every free leg is a 60%+ pick', free(L).length >= 1 && free(L).every(x => { const m = x.why.match(/(\d+)%$/); return m && +m[1] >= 60; }), JSON.stringify(L.map(x => [x.t, x.why])));
    await f('cf', '0'); await f('n', '5'); L = await legs();
    T('Characters on it: 5+ — every free leg has 5 or more characters on its side', free(L).length >= 1 && free(L).every(x => { const m = x.why.match(/(\d+) of \d+ characters/); return m && +m[1] >= 5; }), JSON.stringify(L.map(x => [x.t, x.why])));
    await f('n', '0'); await p.selectOption('.qps [data-change="qpfch"]', 'Power'); await p.waitForTimeout(250); L = await legs();
    T('With: The Power — only legs it is on (it sits 4th, so 4+ on it)', free(L).length >= 1 && free(L).every(x => { const m = x.why.match(/(\d+) of \d+ characters/); return m && +m[1] >= 4; }), JSON.stringify(L.map(x => [x.t, x.why])));
    await p.selectOption('.qps [data-change="qpfch"]', 'all'); await p.waitForTimeout(200);
    await f('top', 'top'); L = await legs();
    T('👑 #1s only: the free seats are the two sides a #1 is on (KH5 ML, CH8 −7.5)', free(L).length === 2 && free(L).every(x => /KH5 ML|CH8 −7\.5|CH8 -7\.5/.test(x.t)), JSON.stringify(L.map(x => x.t)));
    await f('top', 'top'); await f('up', 'up'); L = await legs();
    T('💰 Winning & up: only sides a character with a winning, up record is on (the two #1s are 30–12 too)', free(L).length >= 1 && free(L).every(x => /Over 220\.5|Under 140\.5|KH5 ML|CH8 [−-]7\.5/.test(x.t)), JSON.stringify(L.map(x => x.t)));
    await f('up', 'up'); await f('fc', 'sun'); L = await legs();
    T('☀️ Working: only kinds of bet that are paying (NHL moneyline favorites here)', free(L).length >= 1 && free(L).every(x => x.lg === 'NHL' && x.price < 0), JSON.stringify(L.map(x => [x.t, x.lg])));
    await f('fc', 'sun'); await f('fc', 'dry'); L = await legs();
    T('Skip 🌧 ⛈: the NBA over (a cold kind of bet) is out', !L.some(x => !x.held && /Over 220\.5/.test(x.t)), JSON.stringify(L.map(x => x.t)));
    await f('fc', 'dry');
    /* skip games I'm already on: BA1@BH1 is on an open ticket */
    await p.click('.qps .qp-legs li.held [data-act="qphold"]'); await p.waitForTimeout(150); await p.click('.qps .qp-legs li.held [data-act="qphold"]'); await p.waitForTimeout(150);
    await f('skip', 'skip'); L = await legs();
    T('🎟 Skip games I\'m on: the game on your open ticket (BH1 ML) stays off', !L.some(x => /BH1 ML/.test(x.t)), JSON.stringify(L.map(x => x.t)));
    await f('skip', 'skip');
    await f('sort', 'pay'); L = await legs();
    T('Fill by: Biggest payout — the longest prices first', L.length === 4 && L[0].price === Math.max(...L.map(x => x.price)) && L[0].price >= 160, JSON.stringify(L.map(x => [x.t, x.price])));
    await f('sort', 'best'); await f('mix', 'mix'); L = await legs();
    T('🌐 Mix the leagues: no two legs in a row from the same league', L.every((x, i) => !i || x.lg !== L[i - 1].lg), JSON.stringify(L.map(x => x.lg)));
    await f('mix', 'mix');
    await f('day', 'tomorrow'); L = await legs();
    T('Day: Tomorrow — tomorrow\'s two games', L.length === 2 && L.every(x => /BH11|KA12/.test(x.t)), JSON.stringify(L.map(x => x.t)));
    await f('day', 'both');
    /* save a build, clear, bring it back */
    await f('lg', 'nhl'); await f('side', 'dog');
    P = await panel();
    T('the panel says what\'s on, in words, with a count: "2 on"', /2 on/.test(P.sum), P.sum);
    if (process.env.QPSHOT) { const sh = async (sel, n, blk) => { await p.evaluate(([s0, b0]) => { const e = document.querySelector(s0); if (e) e.scrollIntoView({ block: b0 }); }, [sel, blk || 'start']); await p.waitForTimeout(250); await p.screenshot({ path: process.env.QPSHOT + '/' + n + '.png' }); };
      await sh('.qps .qp-filt', 'qpf_1'); await sh('.qps .qp-filt .qp-fr:nth-of-type(7)', 'qpf_2'); await sh('.qps .qp-fend', 'qpf_3', 'end');
      await p.click('.qps .qp-filt > summary'); await p.waitForTimeout(200); await sh('.qps .qp-filt', 'qpf_4', 'center'); await p.click('.qps .qp-filt > summary'); await p.waitForTimeout(200); }
    await p.fill('#qpBuildName', 'NHL dogs'); await p.click('.qps [data-act="qpbuildsave"]'); await p.waitForTimeout(300);
    T('💾 Save: "⚡ NHL dogs" under My builds', await p.locator('.qps .qp-bld [data-act="qpbuild"]:has-text("NHL dogs")').count() === 1);
    await p.click('.qps [data-act="qpfclear"]'); await p.waitForTimeout(250); P = await panel();
    T('Clear the filters: nothing on', !/ on/.test(P.sum.replace('🎛 Filters', '')), P.sum);
    await p.click('.qps .qp-bld [data-act="qpbuild"]'); await p.waitForTimeout(300); L = await legs(); P = await panel();
    T('…tap ⚡ NHL dogs: the filters come back (NHL, Underdogs) and the ticket follows', /2 on/.test(P.sum) && L.length >= 1 && L.every(x => x.lg === 'NHL' && x.price > 0), JSON.stringify([P.sum, L.map(x => [x.t, x.lg, x.price])]));
    T('…and it\'s saved on this phone for next time', await p.evaluate(() => /NHL dogs/.test(localStorage.getItem('tdp.qpbuilds') || '')));
    await p.click('.qps [data-act="qpfclear"]'); await p.waitForTimeout(200);
    /* Pick my own: locked legs come along as your picks, and go back out locked; the line filters apply to its list */
    L = await legs(); await p.click('.qps .qp-legs li:nth-child(1) [data-act="qphold"]'); await p.waitForTimeout(150); const lk = (await legs())[0].t;
    await p.click('.qps [data-act="qpmore"]').catch(() => { }); await p.waitForTimeout(150); await p.click('.qps [data-act="qpsrc"][data-v="own"]'); await p.waitForTimeout(300);
    const own = await legs();
    T('✍️ Pick my own: your locked leg comes along as your pick', own.length === 1 && own[0].t === lk, JSON.stringify([lk, own]));
    await f('lg', 'nhl');
    const ownG = await p.evaluate(() => [...document.querySelectorAll('.qps .qpo-g .qpo-h small')].map(x => x.innerText.split(' · ')[0]));
    T('…and its list takes the line filters (NHL only: four NHL games listed)', ownG.length === 4 && ownG.every(x => x === 'NHL'), JSON.stringify(ownG));
    await f('lg', 'nhl');
    await p.click('.qps .qpo-g:nth-child(3) .qpo-l'); await p.waitForTimeout(200);
    T('…tap another game\'s line in the list: two picks on your ticket', (await legs()).length === 2, JSON.stringify(await legs()));
    await p.click('.qps [data-act="qpsrc"][data-v="agree"]'); await p.waitForTimeout(300); L = await legs();
    T('…back to The room agrees: both your picks come back locked', held(L).length === 2 && held(L).includes(lk), JSON.stringify(L.map(x => [x.t, x.held])));
    /* a locked leg whose game starts comes off, and the sheet says so */
    const lockedGame = L.find(x => x.held && x.t === lk);
    await p.clock.setFixedTime(new Date(h(2.1))); await p.click('.qps [data-act="qpsrc"][data-v="safe"]'); await p.waitForTimeout(300);
    const note = await p.evaluate(() => (document.querySelector('.qps') || {}).innerText || '');
    T('a locked leg whose game starts comes off, and the sheet says so (' + lk + ' tipped at 1:00 PM)', /BH1 ML/.test(lk) && /locked leg is off the ticket: its game has started/.test(note) && !(await legs()).some(x => x.t === lk), note.slice(0, 300));
    T('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { T('test ran', false, e.stack); }
  await b.close(); console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
