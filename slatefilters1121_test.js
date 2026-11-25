/* public app v53 · Nov 21, Chris: "Can I make it where on the public page I can filter from characters the confidence rating … then
   also have a filter for when #1 on a pick category I can see all their picks inside that scope…. Also can the forecast emoji be on
   game picks on the slate so I know if I should stay away or it's working?"
   Real browser (Playwright, iPhone 14), the repo's own files from disk, an invented open-beta feed, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 400))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const now = Date.now(), iso = t => new Date(t).toISOString().slice(0, 16) + 'Z';
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(now));
const r = (lab, rk, of, w, l, u, say = '') => ({ lab, rk, of, w, l, u, say });
const call = (v, s, pick, price, p, rr, o = 0) => ({ v, s, pick, price, p, o, r: rr, hit: null });
const BOARD = { d: day, heavy: -500,
  cast: { Coach: { name: 'The Coach', color: '#5FD3E8' }, Scout: { name: 'The Scout', color: '#fb7185' }, Judge: { name: 'The Judge', color: '#f5a524' }, Power: { name: 'The Commissioner', color: '#818cf8' } },
  games: [
    { sp: 'nba', game: 'DAL@MIN', gl: 'DAL@MIN', start: iso(now + 3 * 36e5), day, st: 'pre',
      picks: [{ m: 'spread', sd: 'home', pick: 'MIN -5.5', price: -110, p: 0.6, tier: 'strong', unan: false, off: false, by: ['Coach', 'Scout'] }, { m: 'total', sd: 'over', pick: 'Over 228.5', price: -110, p: 0.62, tier: 'supreme', unan: false, off: true, by: ['Coach'] }],
      calls: { spread: [call('Coach', 'home', 'MIN -5.5', -110, 0.72, r('NBA spread favorites', 1, 8, 41, 22, 15.1, 'top'), 1), call('Scout', 'home', 'MIN -5.5', -110, 0.58, r('NBA spread favorites', 3, 8, 30, 28, 0.4)), call('Judge', 'away', 'DAL +5.5', -110, 0.66, r('NBA spread dogs', 7, 7, 12, 25, -14.9, 'worst'))],
        total: [call('Coach', 'over', 'Over 228.5', -110, 0.81, r('NBA overs', 1, 6, 33, 19, 11.2, 'top')), call('Scout', 'under', 'Under 228.5', -110, 0.52, r('<img src=x onerror="window.__xss=1">', 2, 6, 20, 20, -1))] } },
    { sp: 'nhl', game: 'BOS@TOR', gl: 'BOS@TOR', start: iso(now + 5 * 36e5), day, st: 'pre',
      picks: [{ m: 'ml', sd: 'home', pick: 'TOR ML', price: -140, p: 0.6, tier: 'strong', unan: true, off: false, by: ['Scout'] }],
      calls: { ml: [call('Scout', 'home', 'TOR ML', -140, 0.77, r('NHL ML favorites', 1, 5, 25, 11, 6.3, 'top')), call('Power', 'away', 'BOS ML', 120, 0.61, r('NHL ML dogs', 2, 4, 14, 15, 1.2))] } },
    { sp: 'nba', game: 'LAL@GS', gl: 'LAL@GS', start: iso(now + 6 * 36e5), day, st: 'pre',
      picks: [{ m: 'ml', sd: 'home', pick: 'GS ML', price: -160, p: 0.58, tier: 'value', unan: false, off: false, by: ['Judge'] }],
      calls: { ml: [call('Judge', 'home', 'GS ML', -160, 0.55, r('NBA ML favorites', 4, 6, 20, 14, -2.2))] } }],
  fc: { 'nba|spread|fav': { lv: -3, w: 6, l: 19, u: -14.1, w30: 30, l30: 41, u30: -15.0, tr: -1 }, 'nba|total|over': { lv: 2, w: 14, l: 6, u: 7.1, w30: 40, l30: 31, u30: 5.2, tr: 1 },
    'nhl|ml|fav': { lv: 1, w: 9, l: 5, u: 1.4, w30: 33, l30: 20, u30: 3.0 }, 'nhl|ml|dog': { lv: -2, w: 3, l: 9, u: -5.6, w30: 15, l30: 25, u30: -6.1 },
    'nba|ml|fav': { lv: null, w: 3, l: 1, u: 0.9, w30: 12, l30: 9, u30: -0.4 }, 'nba|spread|dog': { lv: 0, w: 10, l: 10, u: -0.9, w30: 38, l30: 40, u30: -5.5 } } };
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: now, record: { w: 1, l: 1, pu: 0, u: 0 }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: day, lockedAt: now - 36e5, unlockMin: 30, picks: [], props: [] }, board: BOARD };
const SLATE = { v: 1, ts: now, tz: 'America/Chicago', ranks: {}, days: [{ d: day, more: 0, games: [
  { k: 'nba|DAL@MIN', sp: 'nba', t: now + 3 * 36e5, a: { ab: 'DAL', name: 'Dallas Mavericks', nick: 'Mavericks', rk: 12, w: 5, l: 5 }, h: { ab: 'MIN', name: 'Minnesota Timberwolves', nick: 'Timberwolves', rk: 6, w: 7, l: 3 }, ln: { fav: 'MIN', line: 5.5, tot: 228.5, mlA: 180, mlH: -220 } }] }] };
(async () => {
  const b = await pw.chromium.launch();
  async function visit(feed, bf) {
    const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
    await p.route('**/*', rt => { const u = new URL(rt.request().url());
      if (/picks\.json$/.test(u.pathname)) return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) });
      if (/slate\.json$/.test(u.pathname)) return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (u.hostname === 'site.api.espn.com') return rt.fulfill({ contentType: 'application/json', body: '{"events":[]}' });
      if (u.hostname !== 'desk.test') return rt.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return rt.fulfill({ status: 404, body: '' });
      rt.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.addInitScript(x => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); if (x) localStorage.setItem('tdp.bf', x); } catch (e) { } }, bf ? JSON.stringify(bf) : '');
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(1000);
    /* v71: a game's row text without its D$ prices (the market's own lines, on every open game since v71 — not anyone's call) */
    const rows = () => p.$$eval('#v-slate .game', els => els.map(e => { const d = [...e.querySelectorAll('.g-dd')]; d.forEach(x => { x.style.display = 'none'; }); const t = e.innerText.replace(/\s+/g, ' ').trim(); d.forEach(x => { x.style.display = ''; }); return t; }));
    return { p, ctx, errs, rows, text: () => p.evaluate(() => document.querySelector('#v-slate').innerText) };
  }
  let v = await visit(FEED), rows = await v.rows(), t = await v.text();
  /* ── the Forecast on every pick ── */
  const badges = await v.p.$$eval('#v-slate .g-bp .fcx', els => els.map(e => [e.textContent, e.getAttribute('aria-label'), e.getAttribute('title')]));
  T('every colored pick on the Slate wears its Forecast: ⛈ on the Wolves −5.5 (NBA spread favorites, broken), ☀️ on the over, 🌤 on the Leafs ML', badges.length === 3 && badges.some(x => x[0] === '⛈' && /NBA spread favorites: broken/.test(x[1])) && badges.some(x => x[0] === '☀️' && /NBA overs: working/.test(x[1])) && badges.some(x => x[0] === '🌤' && /NHL ML favorites: warm/.test(x[1])), JSON.stringify(badges));
  T('…the badge carries the week behind it (record and units)', badges.some(x => /last 7 days 6–19, −14\.1u/.test(x[2])), JSON.stringify(badges.map(x => x[2])));
  T('…and the sheet says what the emoji mean', /The Forecast on each pick, that kind of bet over the last 7 days: ☀️ working · 🌤 warm · ⛅ even · 🌥 cooling · 🌧 not working · ⛈ broken/.test(t), t.slice(0, 300));
  /* ── how sure: the confidence filter ── */
  const opts = await v.p.$$eval('[data-change="bfcf"] option', els => els.map(e => e.textContent));
  T('a confidence menu beside the character menu: Any, 55%+ … 80%+, then 🎯 the top 10% most confident, each with how many games have a call that sure', opts.length === 7 && opts[0] === 'Any confidence' && opts.includes('70%+ sure · 2') && opts.includes('80%+ sure · 1') && opts.includes('55%+ sure · 3') && opts[6] === '🎯 Top 10% most confident · 1', JSON.stringify(opts));
  T('…both menus sit on one row on a phone', await v.p.evaluate(() => { const a = document.querySelector('[data-change="bfch"]').getBoundingClientRect(), c = document.querySelector('[data-change="bfcf"]').getBoundingClientRect(); return Math.abs(a.top - c.top) < 2 && c.left > a.right; }));
  await v.p.selectOption('[data-change="bfcf"]', '70'); await v.p.waitForTimeout(300); rows = await v.rows(); t = await v.text();
  T('70%+: only the games with a call that sure (the Warriors game drops), each row turns to the characters\' own calls', rows.length === 2 && !rows.some(x => /Warriors|GS ML/.test(x)) && rows.some(x => /Timberwolves −5\.5 −110 ⛈ 👑 The Coach 72%/i.test(x)) && rows.some(x => /Over 228\.5 −110 ☀️ 👑 The Coach 81%/i.test(x)) && rows.some(x => /Maple Leafs ML −140 🌤 👑 The Scout 77%/i.test(x)), JSON.stringify(rows));
  T('…a call under 70% stays off (the Scout 58% on the Wolves, the Judge 66% on Dallas, the Commissioner 61% on Boston)', !rows.some(x => /58%|66%|61%|DAL \+5\.5|Mavericks \+5\.5|Bruins ML/i.test(x)), JSON.stringify(rows));
  T('…the character\'s official call keeps its ✓ Official, and the strength chips dim (they\'re for the desk\'s colored picks)', rows.some(x => /The Coach 72% ✓ Official/i.test(x)) && (await v.p.locator('#v-slate .seg.dim[aria-label="Pick strength"]').count()) === 1 && /at 70%\+ sure/.test(t), JSON.stringify(rows));
  T('…the menu shows it\'s on', (await v.p.locator('.bf-sel.on [data-change="bfcf"]').count()) === 1 && (await v.p.evaluate(() => JSON.parse(localStorage.getItem('tdp.bf')).cf)) === 70);
  /* a strength chip goes back to the colored picks */
  await v.p.click('[data-act="bf"][data-k="tier"][data-v="all"]'); await v.p.waitForTimeout(300); rows = await v.rows();
  T('tapping a strength chip goes back to the desk\'s colored picks (the confidence filter clears)', rows.length === 3 && rows.some(x => /STRONG Timberwolves −5\.5 −110 ⛈ 60%/i.test(x)) && !rows.some(x => /The Coach 72%/i.test(x)) && (await v.p.$eval('[data-change="bfcf"]', e => e.value)) === '0' && (await v.p.locator('#v-slate .seg.dim').count()) === 0, JSON.stringify(rows));
  /* v66 · Nov 24, Chris: "Can we add a filter that's 'confidence' where it shows the highest confidence picks… the top 10%" */
  await v.p.click('[data-act="bf"][data-k="cf"][data-v="top10"]'); await v.p.waitForTimeout(300); rows = await v.rows(); t = await v.text();
  T('🎯 Top 10% sure: the most confident tenth of the characters\' calls on the sheet (8 calls → the top one, the Coach 81% on the over)', rows.length === 1 && /Over 228\.5 −110 ☀️ 👑 The Coach 81%/i.test(rows[0]) && !/72%|77%/.test(rows[0]), JSON.stringify(rows));
  T('…the sheet says where the cut is, and the chip and the menu both show it\'s on (it\'s remembered)', /top 10% most confident \(81%\+ sure\)/.test(t) && (await v.p.locator('[data-act="bf"][data-k="cf"][data-v="top10"][aria-pressed="true"]').count()) === 1 && (await v.p.$eval('[data-change="bfcf"]', e => e.value)) === 'top10' && (await v.p.evaluate(() => JSON.parse(localStorage.getItem('tdp.bf')).cf)) === 'top10', t.slice(0, 700));
  await v.p.click('[data-act="bf"][data-k="bt"][data-v="ml"]'); await v.p.waitForTimeout(300); rows = await v.rows(); t = await v.text();
  T('…it follows the other filters: moneylines only → the top tenth of the moneyline calls (the Scout 77% on the Leafs)', rows.length === 1 && /Maple Leafs ML −140 🌤 👑 The Scout 77%/i.test(rows[0]) && /77%\+ sure/.test(t), JSON.stringify(rows));
  await v.p.click('[data-act="bf"][data-k="bt"][data-v="all"]'); await v.p.waitForTimeout(250); await v.p.click('[data-act="bf"][data-k="cf"][data-v="top10"]'); await v.p.waitForTimeout(300); rows = await v.rows();
  T('…tap it again and it lets go', (await v.p.locator('[data-act="bf"][data-k="cf"][data-v="top10"][aria-pressed="true"]').count()) === 0 && rows.length === 3, JSON.stringify(rows));
  /* ── 👑 #1s only, and one #1's scope ── */
  if (await v.p.locator('[data-act="bfreset"]').count()) { await v.p.click('[data-act="bfreset"]'); await v.p.waitForTimeout(250); }
  await v.p.click('[data-act="bf"][data-k="say"]'); await v.p.waitForTimeout(300); rows = await v.rows(); t = await v.text();
  const strip = await v.p.$$eval('#v-slate .seg.tops button', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  T('👑 #1s only: only calls from the character ranked #1 in that kind of bet', rows.length === 2 && rows.every(x => /👑/.test(x)) && !rows.some(x => /The Scout 58%|The Judge|Commissioner|Warriors/i.test(x)), JSON.stringify(rows));
  T('…a strip of today\'s #1s: who leads which kind of bet, with how many calls it has in it', strip[0] === 'All #1s 3' && strip.includes('👑 The Coach · NBA spread favorites 1') && strip.includes('👑 The Coach · NBA overs 1') && strip.includes('👑 The Scout · NHL ML favorites 1'), JSON.stringify(strip));
  await v.p.click('#v-slate .seg.tops button:has-text("NHL ML favorites")'); await v.p.waitForTimeout(300); rows = await v.rows(); t = await v.text();
  T('tap one: every pick that #1 has in its kind of bet, and nothing else', rows.length === 1 && /Maple Leafs ML −140 🌤 👑 The Scout 77%/i.test(rows[0]), JSON.stringify(rows));
  T('…with its record there spelled out', /👑 The Scout is #1 in NHL ML favorites \(25–11, \+6\.3u\)\. Every NHL ML favorites call it has on this sheet: 1\./.test(t), t.slice(t.indexOf('👑 The Scout is'), t.indexOf('👑 The Scout is') + 160));
  T('…the chip you picked sits first in the strip, pressed', await v.p.evaluate(() => { const B = [...document.querySelectorAll('#v-slate .seg.tops button')]; return B[1].getAttribute('aria-pressed') === 'true' && /NHL ML favorites/.test(B[1].innerText); }));
  T('…and it\'s remembered (the scope rides in the saved filter)', (await v.p.evaluate(() => JSON.parse(localStorage.getItem('tdp.bf')).lane)) === 'NHL ML favorites');
  await v.p.click('[data-act="bf"][data-k="say"]'); await v.p.waitForTimeout(300); rows = await v.rows();
  T('tap 👑 #1s only again: it switches off, the scope with it', rows.length === 3 && (await v.p.locator('#v-slate .seg.tops').count()) === 0 && (await v.p.evaluate(() => JSON.parse(localStorage.getItem('tdp.bf')).lane)) === '', JSON.stringify(rows));
  /* ── the Forecast filter ── */
  await v.p.click('[data-act="bf"][data-k="fc"][data-v="dry"]'); await v.p.waitForTimeout(300); rows = await v.rows();
  T('"Skip 🌧 ⛈" drops the picks whose kind of bet isn\'t paying (the ⛈ Wolves spread), keeps the rest, and a lane too new to call (💤) stays', rows.length === 3 && !rows.some(x => /Timberwolves −5\.5 −110/i.test(x)) && rows.some(x => /Over 228\.5/.test(x)) && rows.some(x => /Warriors ML/.test(x)), JSON.stringify(rows));
  await v.p.click('[data-act="bf"][data-k="fc"][data-v="sun"]'); await v.p.waitForTimeout(300); rows = await v.rows();
  T('"☀️ Working" keeps only ☀️ and 🌤 kinds of bet (the over, the Leafs); the Warriors (too few picks to say) drop', rows.length === 2 && rows.some(x => /Over 228\.5 −110 ☀️/.test(x)) && rows.some(x => /Maple Leafs ML −140 🌤/.test(x)) && !rows.some(x => /Warriors/.test(x)), JSON.stringify(rows));
  await v.p.selectOption('[data-change="bfcf"]', '60'); await v.p.waitForTimeout(300); rows = await v.rows();
  T('…and it works on the characters\' calls too (60%+ and working: the Coach\'s over, the Scout\'s Leafs, not the Commissioner\'s 🌧 Bruins)', rows.length === 2 && rows.some(x => /Over 228\.5 −110 ☀️ 👑 The Coach 81%/i.test(x)) && rows.some(x => /The Scout 77%/i.test(x)) && !rows.some(x => /Bruins ML|Commissioner/i.test(x)), JSON.stringify(rows));
  await v.p.click('[data-act="bfreset"]'); await v.p.waitForTimeout(250);
  /* ── the open game ── */
  await v.p.locator('#v-slate .game > button', { hasText: 'Timberwolves' }).first().click(); await v.p.waitForTimeout(300); t = await v.text();
  T('tap a game: 🌦 The Forecast for every kind of bet on it, best first, with the week and the month', /🌦 THE FORECAST/i.test(t) && /NBA overs working · ↑ rising\s*last 7 days 14–6, \+7\.1u · 30 days 40–31, \+5\.2u/.test(t) && /NBA spread dogs even/.test(t) && /NBA spread favorites broken · ↓ sliding/.test(t) && t.indexOf('NBA overs working') < t.indexOf('NBA spread favorites broken'), t.slice(t.indexOf('THE FORECAST') - 20, t.indexOf('THE FORECAST') + 400));
  T('…and each side in "Who\'s with it" wears its emoji', (await v.p.$$eval('.won-pk .fcx', els => els.map(e => e.textContent))).join('') === '⛈⛅☀️', JSON.stringify(await v.p.$$eval('.won-pk .fcx', els => els.map(e => e.textContent))));
  await v.p.click('[data-act="bfscope"]:has-text("NBA spread favorites")'); await v.p.waitForTimeout(300); rows = await v.rows(); t = await v.text();
  T('in a game, "👑 The Coach has the say" links to every pick the Coach has as #1 in that kind of bet, across the sheet', rows.length === 1 && /Timberwolves −5\.5 −110 ⛈ 👑 The Coach 72%/i.test(rows[0]) && /👑 The Coach is #1 in NBA spread favorites \(41–22, \+15\.1u\)/.test(t) && (await v.p.evaluate(() => { const f = JSON.parse(localStorage.getItem('tdp.bf')); return f.say === 'top' && f.lane === 'NBA spread favorites'; })), JSON.stringify(rows));
  T('a hostile category name from the feed stays text', !(await v.p.evaluate(() => window.__xss)) && (await v.p.locator('#v-slate img[src="x"]').count()) === 0);
  T('no sideways scroll on a phone, no script errors', (await v.p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0 && v.errs.length === 0, v.errs.join(' | '));
  await v.ctx.close();
  /* ── a feed from before the Forecast: no emoji, no Forecast chips, and a saved Forecast filter drops back ── */
  const OLD = JSON.parse(JSON.stringify(FEED)); delete OLD.board.fc;
  v = await visit(OLD, { win: 'up', tier: 'all', bt: 'all', ch: 'Nobody', view: 'time', cf: 70, say: 'all', lane: '', fc: 'sun' }); rows = await v.rows(); t = await v.text();
  T('a feed without the Forecast: no emoji, no legend, no Forecast chips', (await v.p.locator('#v-slate .fcx').count()) === 0 && !/The Forecast on each pick/.test(t) && (await v.p.locator('[data-k="fc"]').count()) === 0);
  T('…a saved Forecast filter, or a character no longer on the board, drops back (the 70%+ stays)', rows.length === 2 && (await v.p.$eval('[data-change="bfch"]', e => e.value)) === 'all' && (await v.p.$eval('[data-change="bfcf"]', e => e.value)) === '70', JSON.stringify(rows));
  T('…no script errors', v.errs.length === 0, v.errs.join(' | '));
  await v.ctx.close();
  /* ── the app's version reaches phones ── */
  const idx = fs.readFileSync(path.join(W, 'desk/index.html'), 'utf8'), sw = fs.readFileSync(path.join(W, 'desk/sw.js'), 'utf8');
  const av = (idx.match(/app\.js\?v=(\d+)/) || [])[1], cv = (idx.match(/app\.css\?v=(\d+)/) || [])[1];
  T('phones fetch the new app and stylesheet (index and the service worker agree, v53 / v32+)', +av >= 53 && +cv >= 32 && sw.includes(`'app.js?v=${av}'`) && sw.includes(`'app.css?v=${cv}'`), av + ' / ' + cv);
  await b.close();
  console.log(pass + ' pass / ' + fail + ' fail'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL test ran — ' + (e && e.stack || e)); process.exit(1); });
