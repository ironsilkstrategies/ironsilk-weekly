/* v88 · THE CALM PASS + Noah's layer. Chris, Nov 27: "really try to modernize it… pop up filters pages etc… ways to compartmentalize
   things so the screens aren't always so busy… but make sure we don't lose any of the tech and options we've built". The dock (four
   rooms you choose + Rooms, with Jump), the filter sheets (every filter still there: the test counts them), the ⓘ sheets, the folded
   ten-leg tickets, the effects layer (foil, the bell's sheet, My Desk) and the widget page. Real browser, the repo's files, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 600))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const AT = Date.parse('2026-11-27T21:00:00Z'), D = '2026-11-27', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z', m = n => AT + n * 60e3;
const TEAMS = Array.from({ length: 6 }, (_, i) => ['A' + String.fromCharCode(65 + i) + 'X', 'H' + String.fromCharCode(65 + i) + 'Y']);
const CAST = ['Sim', 'Judge', 'Scout', 'Coach'];
const call = (v, s, pick, price, p) => ({ v, s, pick, price, p, o: 0, r: { lab: 'NBA ML favorites', w: 10, l: 8, u: 1 }, hit: null });
const BOARD = { d: D, heavy: -1000, fc: {}, cast: Object.fromEntries(CAST.map(v => [v, { name: v, color: '#E9C25A' }])),
  games: TEAMS.map(([a, h], i) => ({ sp: 'nba', game: `${a}@${h}`, gl: `${a} at ${h}`, start: iso(m(120 + i * 15)), day: D, st: 'pre',
    picks: [{ m: 'ml', sd: 'home', pick: h + ' ML', price: -140 - i * 5, p: 0.62, tier: i % 2 ? 'strong' : 'supreme', unan: i === 0, off: false, by: CAST.slice(0, 3) }],
    calls: { ml: CAST.map((v, j) => j < 3 ? call(v, 'home', h + ' ML', -140, 0.6) : call(v, 'away', a + ' ML', 120, 0.45)) } })) };
const LEGS = Array.from({ length: 10 }, (_, i) => ({ sp: 'nba', game: `${TEAMS[i % 6][0]}@${TEAMS[i % 6][1]}`, pick: TEAMS[i % 6][1] + ' ML', price: -150, st: i < 3 ? 'hit' : 'open', start: iso(m(120 + i * 10)) }));
const CHARS = CAST.map((v, i) => ({ v, name: 'The ' + v, color: ['#E9C25A', '#5FD3E8', '#FF6FAE', '#7BE3A6'][i], chip: v.toUpperCase(), record: { w: 10 + i, l: 8, u: 1.2 }, props: { w: 3, l: 2 }, picks: [] }));
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: AT - 20 * 60e3, record: { w: 59, l: 41, pu: 0, u: 4.09, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 6 * 36e5, unlockMin: 30, props: [], picks: [{ sp: 'nba', game: 'AAX@HAY', pick: 'HAY ML', price: -150, p: 0.72, start: iso(m(120)), tier: 'STRONG', calls: [{ who: 'The Sim', v: 'Sim', with: true, pick: 'HAY ML', p: 0.7, official: true }] }] },
  characters: CHARS, founder: { tix: [{ id: 'lt1', name: 'LongShot', dec: 155.4, res: 'live', hit: 3, legs: LEGS }], rec: { hits: 1 } }, board: BOARD };
const SLATE = { v: 1, ts: AT - 10 * 60e3, tz: 'America/Chicago', ranks: {}, days: [{ d: D, games: TEAMS.map(([a, h], i) => ({ k: `nba|${a}@${h}`, sp: 'nba', t: m(120 + i * 15), a: { ab: a, name: 'Alpha ' + a, nick: 'Alphas' + i }, h: { ab: h, name: 'Home ' + h, nick: 'Homers' + i },
  ln: { fav: h, line: 3.5, tot: 225.5, mlA: 120, mlH: -140, spA: -110, spH: -110, ov: -110, un: -110 } })) }] };
const PULSE = { v: 1, day: D, beta: false, rec: { w: 59, l: 41, u: 4.09 }, picks: [{ i: 0, sp: 'nba', pick: 'HAY ML', price: -150, game: 'AAX@HAY', start: iso(m(120)) }, { i: 1, sp: 'nhl', sealed: 1, start: iso(m(200)), opens: m(170) }, { i: 2, sp: 'nba', pick: 'Over 225.5', price: -110, game: 'ABX@HBY', start: iso(m(-60)), res: 'win' }], ls: [] };
const route = r => { const u = new URL(r.request().url());
  if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(FEED) });
  if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
  if (/ghost\.json$/.test(u.pathname)) return r.fulfill({ status: 404, body: '' });
  if (u.hostname === 'site.api.espn.com') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [] }) });
  if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(u.pathname === '/pulse' ? PULSE : u.pathname === '/push/key' ? { key: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8' } : { rows: [], n: 0 }) });
  if (u.hostname !== 'desk.test') return r.abort();
  let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
  r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); };
(async () => {
  const b = await pw.chromium.launch(); const ctx = await b.newContext({ ...pw.devices['iPhone 14'], serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
  p.on('console', x => { if (x.type() === 'error' && !/Failed to load resource|net::ERR/.test(x.text())) errs.push('console: ' + x.text().slice(0, 160)); });
  await p.clock.setFixedTime(new Date(AT));
  await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); } catch (e) { } });
  await p.route('**/*', route);
  try {
    await p.goto('https://desk.test/desk/#today', { waitUntil: 'load' }); await p.waitForTimeout(2600);
    /* ── the dock ── */
    const dock = await p.evaluate(() => [...document.querySelectorAll('.tabs button')].filter(x => x.offsetParent).map(x => x.dataset.go || (x.classList.contains('rooms-btn') ? 'rooms' : '?')));
    T('the dock: Today, Slate, Props, the Characters and Rooms (five, not eight)', dock.join() === 'today,slate,props,cast,rooms', dock.join());
    T('…all eight rooms are still in the page (nothing removed, only tucked away)', await p.evaluate(() => ['today', 'slate', 'props', 'longshots', 'challenges', 'cast', 'chat', 'receipts'].every(k => document.querySelector(`.tabs [data-go="${k}"]`))));
    await p.click('.tabs .rooms-btn'); await p.waitForSelector('#roomsLayer .roomsheet'); await p.waitForTimeout(300);
    const rooms = await p.$$eval('#roomsLayer .rm', els => els.map(e => e.dataset.go));
    T('Rooms opens every room in one sheet: LongShots, Compete, Chat, Receipts, My tickets, Account and the rest', ['today', 'slate', 'props', 'longshots', 'challenges', 'cast', 'chat', 'receipts', 'tix', 'me', 'join'].every(k => rooms.includes(k)), rooms.join());
    await p.fill('#jumpQ', 'homers2'); await p.waitForTimeout(200);
    const hits = await p.$$eval('#jumpHits .jh', els => els.map(e => e.innerText.replace(/\s+/g, ' ')));
    T('Jump finds a team on today\'s sheet by name', hits.some(h => /Homers2/.test(h)), JSON.stringify(hits));
    await p.keyboard.press('Enter'); await p.waitForTimeout(900);
    T('…Enter opens the Slate with that game open', /#slate$/.test(p.url()) && await p.evaluate(() => { const g = document.querySelector('#v-slate [data-act="game"][data-k="nba|ACX@HCY"]'); return !!g && g.getAttribute('aria-expanded') === 'true'; }));
    await p.click('.tabs .rooms-btn'); await p.waitForSelector('#roomsLayer .roomsheet'); await p.fill('#jumpQ', 'the coach'); await p.waitForTimeout(150);
    T('…and finds a character', (await p.$$eval('#jumpHits .jh', els => els.map(e => e.innerText))).some(h => /The Coach/.test(h)));
    await p.click('[data-act="dockedit"]'); await p.waitForTimeout(200);
    await p.click('#roomsLayer .rm[data-k="receipts"]'); await p.waitForTimeout(200);
    T('choosing your dock: a fifth room asks you to take one off first', await p.evaluate(() => /holds 4/.test(document.body.innerText)) || (await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('tdp.dock') || 'null')))) === null);
    await p.click('#roomsLayer .rm[data-k="cast"]'); await p.waitForTimeout(150); await p.click('#roomsLayer .rm[data-k="receipts"]'); await p.waitForTimeout(150);
    await p.keyboard.press('Escape'); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2200);
    const dock2 = await p.evaluate(() => [...document.querySelectorAll('.tabs button')].filter(x => x.offsetParent).map(x => x.dataset.go || 'rooms'));
    T('…swap the Characters for Receipts: the dock keeps it after a reload', dock2.join() === 'today,slate,props,receipts,rooms', dock2.join());
    /* ── the Slate's filters in a sheet ── */
    await p.click('.tabs [data-go="slate"]'); await p.waitForTimeout(900);
    T('the Slate shows one quick row (day and league) and a Filters button, not six rows of chips', await p.locator('#v-slate .fs-bar .fs-btn').isVisible() && !(await p.locator('#v-slate .bf').isVisible()));
    await p.click('[data-act="fsopen"][data-k="slate"]'); await p.waitForTimeout(500);
    const keys = await p.$$eval('#v-slate .fsheet [data-act="bf"]', els => [...new Set(els.map(e => e.dataset.k))].sort());
    T('nothing lost: the sheet holds every filter the page had (view, start time, strength, bet type, #1s, winning & up, favs, top 10%) and both menus', ['bt', 'cf', 'fav', 'say', 'tier', 'up', 'view', 'win'].every(k => keys.includes(k)) && await p.locator('#v-slate .fsheet [data-change="bfch"]').count() === 1 && await p.locator('#v-slate .fsheet [data-change="bfcf"]').count() === 1, keys.join());
    const n0 = await p.locator('.fs-done').innerText();
    await p.click('.fsheet [data-act="bf"][data-k="tier"][data-v="supreme"]'); await p.waitForTimeout(400);
    T('tap a filter: the sheet stays up (it doesn\'t slide in again) and its button counts what\'s left', await p.locator('.fs-wrap.open .fsheet.still').count() === 1 && (await p.locator('.fs-done').innerText()) !== n0, n0 + ' → ' + await p.locator('.fs-done').innerText());
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    T('Esc closes it, and the Filters button gets the focus back', await p.locator('.fs-wrap.open').count() === 0 && await p.evaluate(() => document.activeElement && document.activeElement.dataset.act === 'fsopen'));
    T('…the filter that\'s on rides under the button as a pill, with the count on the button', await p.locator('#v-slate .fs-pill').count() === 1 && /1/.test(await p.locator('#v-slate .fs-btn .fs-n').innerText()));
    await p.click('#v-slate .fs-pill'); await p.waitForTimeout(400);
    T('…tap the pill: that filter turns off', await p.locator('#v-slate .fs-pill').count() === 0 && (await p.evaluate(() => JSON.parse(localStorage.getItem('tdp.bf')).tier)) === 'all');
    /* ── ⓘ: an explainer is one line, its tips in a sheet ── */
    await p.click('.tabs [data-go="props"]'); await p.waitForTimeout(700);
    const how = await p.locator('#v-props .howto-open').count();
    if (how) { await p.click('#v-props .howto-open'); await p.waitForTimeout(400); }
    T('Props: "How to read a prop card" is one line; tap it and the three tips open in a sheet', how === 1 && await p.locator('#infoLayer .infosheet li').count() === 3);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    /* ── LongShots: ten legs fold to a strip ── */
    await p.evaluate(() => { location.hash = '#longshots'; }); await p.waitForTimeout(900);
    T('a ten-leg LongShot folds to its strip of ten dots (three hit), the legs one tap away', await p.locator('#v-longshots .fl-fold:not([open])').count() === 1 && await p.locator('#v-longshots .fl-strip i').count() === 10 && await p.locator('#v-longshots .fl-strip i.hit').count() === 3);
    await p.click('#v-longshots .fl-fold > summary'); await p.waitForTimeout(200); await p.evaluate(() => { location.hash = '#today'; }); await p.waitForTimeout(400); await p.evaluate(() => { location.hash = '#longshots'; }); await p.waitForTimeout(700);
    T('…opened, it stays open through a redraw', await p.locator('#v-longshots .fl-fold[open] .fl-list li').count() === 10);
    /* ── Noah's layer ── */
    await p.waitForTimeout(1500);
    T('the effects layer loaded on its own after the page (its styles, foil on the cards)', await p.evaluate(() => !!document.getElementById('fxCss') && document.documentElement.classList.contains('fx-on')));
    await p.evaluate(() => { location.hash = '#today'; }); await p.waitForTimeout(800);
    T('…today\'s slips wear foil', await p.locator('#v-today .slip[data-foil] .fx-holo').count() >= 1);
    await p.click('.tabs .rooms-btn'); await p.waitForSelector('#roomsLayer .roomsheet'); await p.click('#roomsLayer [data-act="cc"]'); await p.waitForSelector('#ccLayer .ccsheet'); await p.waitForTimeout(400);
    T('the bell\'s sheet: Alerts, Sound & feel, My Desk', (await p.$$eval('#ccLayer .cc-tabs button', els => els.map(e => e.innerText.trim()))).join('|').replace(/[^A-Za-z&| ]/g, '').trim() === 'Alerts| Sound & feel| My Desk'.replace(/[^A-Za-z&| ]/g, ''));
    await p.click('#ccLayer [data-k="tab"][data-v="feel"]'); await p.waitForTimeout(200); await p.click('#ccLayer [data-k="motion"][data-v="calm"]'); await p.waitForTimeout(200);
    T('Motion → Calm: everything holds still (and it\'s remembered)', await p.evaluate(() => document.documentElement.classList.contains('calm') && JSON.parse(localStorage.getItem('tdp.fx')).motion === 'calm'));
    await p.click('#ccLayer [data-k="motion"][data-v="full"]'); await p.waitForTimeout(150);
    await p.click('#ccLayer [data-k="tab"][data-v="desk"]'); await p.waitForTimeout(400); await p.click('#ccLayer [data-k="md.sp"][data-v="nba"]'); await p.waitForTimeout(300);
    const md = await p.evaluate(() => JSON.parse(localStorage.getItem('tdp.mydesk')));
    const src = await p.locator('#ccLayer .cc-prev iframe').getAttribute('src');
    T('My Desk: pick NBA and it\'s saved, and the live preview is the widget with your settings in its link', md.sp.join() === 'nba' && /widget\.html\?c=/.test(src) && JSON.parse(Buffer.from(new URL(src).searchParams.get('c').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()).sp[0] === 'nba', src);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    T('Esc closes the bell\'s sheet', await p.locator('#ccLayer .ccsheet').count() === 0);
    /* ── the widget page ── */
    const c = Buffer.from(JSON.stringify({ sp: ['nba'], ch: [], show: { best3: true, record: true }, theme: 'gold', size: 'm' })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const wp = await ctx.newPage(); await wp.route('**/*', route); await wp.clock.setFixedTime(new Date(AT)); await wp.goto('https://desk.test/desk/widget.html?mode=embed&c=' + c, { waitUntil: 'load' }); await wp.waitForTimeout(900);
    const wt = await wp.evaluate(() => ({ rows: [...document.querySelectorAll('.row')].map(r => r.className + ':' + r.innerText.replace(/\s+/g, ' ')), theme: document.documentElement.dataset.theme, rec: (document.querySelector('.ft') || {}).innerText || '' }));
    T('the widget reads the pulse through My Desk: NBA only (the NHL pick drops), a win stamped, the gold look, the record', wt.rows.length === 2 && wt.rows.some(r => /win/.test(r) && /OVER 225\.5/i.test(r)) && !wt.rows.some(r => /sealed/.test(r)) && wt.theme === 'gold' && /59–41/.test(wt.rec), JSON.stringify(wt));
    await wp.goto('https://desk.test/desk/widget.html?mode=overlay', { waitUntil: 'load' }); await wp.waitForTimeout(700);
    T('…the stream overlay is see-through, and shows the sealed pick as sealed (never what it is)', await wp.evaluate(() => getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)' && !!document.querySelector('.row.sealed') && !/sealed/i.test(document.querySelector('.row.sealed b').innerText) === false));
    await wp.close();
    /* ── ?fx=0 ── */
    const p2 = await ctx.newPage(); await p2.route('**/*', route); await p2.goto('https://desk.test/desk/?fx=0#today', { waitUntil: 'load' }); await p2.waitForTimeout(2500);
    T('?fx=0: the app without the effects layer (the kill switch)', await p2.evaluate(() => !document.getElementById('fxCss') && !!document.querySelector('#v-today .slip')));
    await p2.close();
    T('no page errors', errs.length === 0, errs.join(' | '));
  } catch (e) { T('test ran', false, e.stack); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
