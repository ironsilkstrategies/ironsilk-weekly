/* public app v77 · Nov 26, 1:00 PM, Chris: "give the subscribers a chance to pick their fav characters per sport per option for instance the
   scorekeeper on nba ml's and judge for nhl overs and the grinder for underdog ml picks in NCAAB etc….. like a way that they can select a
   “store as fav” option when they are on the characters profiles…which doubles as a filter on slates so they can filter down and see what
   their favs picked across the board". Real browser (iPhone 14), the repo's files, an invented open-beta feed, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 600))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const now = Date.now(), iso = t => new Date(t).toISOString().slice(0, 16) + 'Z';
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(now));
const r = (k, lab, rk, of, w, l, u, say = '') => ({ ...(k ? { k } : {}), lab, rk, of, w, l, u, say });
const call = (v, s, pick, price, p, rr, o = 0) => ({ v, s, pick, price, p, o, r: rr, hit: null });
const CAST = { 'Most common': { name: 'The Scorekeeper', color: '#ffcc44' }, Judge: { name: 'The Judge', color: '#f5a524' }, H_L2e1: { name: 'The Grinder', color: '#9ae6b4' }, Coach: { name: 'The Coach', color: '#5FD3E8' } };
const BOARD = { d: day, heavy: -500, cast: CAST, games: [
  { sp: 'nba', game: 'DAL@MIN', gl: 'DAL@MIN', start: iso(now + 3 * 36e5), day, st: 'pre', picks: [],
    calls: { ml: [call('Most common', 'home', 'MIN ML', -220, 0.71, r('nba|ml|fav', 'NBA ML favorites', 1, 9, 41, 19, 8.2, 'top')), call('Coach', 'away', 'DAL ML', 180, 0.4, r('nba|ml|dog', 'NBA ML dogs', 3, 7, 10, 12, -1.1))],
      total: [call('Judge', 'over', 'Over 228.5', -110, 0.6, r('nba|total|over', 'NBA overs', 2, 8, 30, 25, 2.1))] } },
  { sp: 'nhl', game: 'BOS@TOR', gl: 'BOS@TOR', start: iso(now + 5 * 36e5), day, st: 'pre', picks: [],
    calls: { total: [call('Judge', 'over', 'Over 6.5', -105, 0.66, r('nhl|total|over', 'NHL overs', 1, 6, 33, 19, 11.2, 'top'))], ml: [call('Most common', 'home', 'TOR ML', -140, 0.6, r('nhl|ml|fav', 'NHL ML favorites', 4, 6, 20, 18, -3.0))] } },
  /* an older feed's call: no lane key, only its label — still matched */
  { sp: 'ncaab', game: 'UND@SELA', gl: 'UND@SELA', start: iso(now + 6 * 36e5), day, st: 'pre', picks: [],
    calls: { ml: [call('H_L2e1', 'away', 'UND ML', 145, 0.45, r(null, 'CBB ML dogs', 2, 8, 44, 40, 9.7))] } }] };
const CHARS = [
  { v: 'Most common', name: 'The Scorekeeper', chip: 'SCORE', color: '#ffcc44', title: '', bio: 'Counts.', origin: '', best: [], still: [], record: { w: 3, l: 2, pu: 0, u: 1 }, props: { w: 0, l: 0 }, par: null, picks: [], recent: [], teams: [], players: [],
    lanes: [['nba|ml|fav', 41, 19, 8.2, 1, 9], ['nhl|ml|fav', 20, 18, -3.0, 4, 6], ['ncaab|total|under', 60, 50, 4.4, 2, 9], ['nfl|spread|dog', 12, 20, -9.1, 8, 8], ['nba|total|over', 22, 21, 0.3, 5, 8], ['ncaaf|ml|fav', 30, 10, 2.2, 3, 7], ['nhl|total|under', 10, 12, -2.5, 6, 6]] },
  { v: 'Judge', name: 'The Judge', chip: 'JUDGE', color: '#f5a524', title: '', bio: 'Rules.', origin: '', best: [], still: [], record: { w: 3, l: 2, pu: 0, u: 1 }, props: { w: 0, l: 0 }, par: null, picks: [], recent: [], teams: [], players: [], lanes: [['nhl|total|over', 33, 19, 11.2, 1, 6], ['nba|total|over', 30, 25, 2.1, 2, 8]] },
  /* no lane table (an older feed): its lanes come from the board */
  { v: 'H_L2e1', name: 'The Grinder', chip: 'GRIND', color: '#9ae6b4', title: '', bio: 'Grinds.', origin: '', best: [], still: [], record: { w: 1, l: 1, pu: 0, u: 0 }, props: { w: 0, l: 0 }, par: null, picks: [], recent: [], teams: [], players: [] }];
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: now, record: { w: 1, l: 1, pu: 0, u: 0 }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: day, lockedAt: now - 36e5, unlockMin: 30, picks: [], props: [] }, board: BOARD, characters: CHARS };
const G = (sp, ab1, ab2, n1, n2, hr) => ({ k: `${sp}|${ab1}@${ab2}`, sp, t: now + hr * 36e5, a: { ab: ab1, name: n1, nick: n1, w: 5, l: 5 }, h: { ab: ab2, name: n2, nick: n2, w: 7, l: 3 }, ln: null });
const SLATE = { v: 1, ts: now, tz: 'America/Chicago', ranks: {}, days: [{ d: day, more: 0, games: [G('nba', 'DAL', 'MIN', 'Mavericks', 'Timberwolves', 3), G('nhl', 'BOS', 'TOR', 'Bruins', 'Maple Leafs', 5), G('ncaab', 'UND', 'SELA', 'North Dakota', 'SE Louisiana', 6)] }] };
(async () => {
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
  await p.route('**/*', rt => { const u = new URL(rt.request().url());
    if (/picks\.json$/.test(u.pathname)) return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(FEED) });
    if (/slate\.json$/.test(u.pathname)) return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
    if (u.hostname === 'site.api.espn.com') return rt.fulfill({ contentType: 'application/json', body: '{"events":[]}' });
    if (u.hostname !== 'desk.test') return rt.abort();
    let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return rt.fulfill({ status: 404, body: '' });
    rt.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
  await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); } catch (e) { } });
  const slateRows = () => p.$$eval('#v-slate .game', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  try {
    /* the filter with no favs yet */
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(1200);
    T('the Slate has a ⭐ My favs chip beside 💰 Winning & up', await p.locator('.bf [data-k="fav"]').count() === 1 && /My favs/.test(await p.locator('.bf [data-k="fav"]').innerText()));
    await p.click('.bf [data-k="fav"]'); await p.waitForTimeout(300);
    T('…on with no favs yet: it says how to star one (and points to the Cast)', /No favs yet/.test(await p.locator('.bf-note').innerText()) && await p.locator('.bf-note [data-go="cast"]').count() === 1, await p.locator('.bf-note').innerText());
    await p.click('.bf [data-k="fav"]'); await p.waitForTimeout(200);
    /* a profile: every lane with its record, rank and a star */
    await p.goto('https://desk.test/desk/#cast', { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.selectOption('#castSel', 'Most common'); await p.waitForTimeout(400);
    let L = await p.$$eval('#v-cast .lanes-x .ln', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    T('a character\'s profile: "Star its lanes", best first, each with its record, units and rank (👑 for #1)', /Star its lanes/i.test(await p.locator('#v-cast').innerText()) && /^☆ NBA ML favorites 👑 #1 of 9 41–19 \+8\.2u$/.test(L[0]) && /CBB unders #2 of 9 60–50 \+4\.4u/.test(L[1]), JSON.stringify(L));
    T('…the top 6 show, the rest fold under "All 7 of its lanes"', L.length === 7 && await p.locator('#v-cast .lanes-more summary').innerText() === 'All 7 of its lanes' && !(await p.locator('#v-cast .lanes-more').evaluate(d => d.open)), JSON.stringify(L.length));
    await p.click('#v-cast .lanes-x .ln >> nth=0 >> .favb'); await p.waitForTimeout(400);
    const st = await p.evaluate(() => ({ on: document.querySelector('#v-cast .lanes-x .ln .favb').getAttribute('aria-pressed'), ls: localStorage.getItem('tdp.favs'), toast: (document.querySelector('#toast') || document.querySelector('.toast') || {}).textContent || '' }));
    T('tap ☆: it turns ★, says so, and is kept on this phone', st.on === 'true' && JSON.parse(st.ls).includes('Most common#nba|ml|fav') && /The Scorekeeper · NBA ML favorites is a fav/.test(st.toast), JSON.stringify(st));
    await p.selectOption('#castSel', 'Judge'); await p.waitForTimeout(300);
    await p.click('#v-cast .lanes-x .ln >> nth=0 >> .favb'); await p.waitForTimeout(300);   // the Judge · NHL overs
    await p.selectOption('#castSel', 'H_L2e1'); await p.waitForTimeout(300);
    L = await p.$$eval('#v-cast .lanes-x .ln', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    T('a character with no lane table (an older feed) still lists the lanes the board shows for it', L.length === 1 && /CBB ML dogs #2 of 8 44–40 \+9\.7u/.test(L[0]), JSON.stringify(L));
    await p.click('#v-cast .lanes-x .ln >> nth=0 >> .favb'); await p.waitForTimeout(300);   // the Grinder · CBB ML dogs
    await p.selectOption('#castSel', ''); await p.waitForTimeout(400);
    const tags = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#v-cast .castcard')].map(c => [c.dataset.v, (c.querySelector('.cc-fav') || {}).textContent || ''])));
    T('the Cast roster marks who you\'ve starred', tags['Most common'] === '⭐ 1 lane starred' && tags.Judge === '⭐ 1 lane starred' && tags.H_L2e1 === '⭐ 1 lane starred' && !tags.Coach, JSON.stringify(tags));
    /* the Slate: only your favs, in their lanes */
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(1000);
    T('…the chip counts the games where a fav has a pick in a starred lane (all 3)', /My favs 3/.test((await p.locator('.bf [data-k="fav"]').innerText()).replace(/\s+/g, ' ')), await p.locator('.bf [data-k="fav"]').innerText());
    await p.click('.bf [data-k="fav"]'); await p.waitForTimeout(400);
    const rows = await slateRows(), note = await p.locator('.bf-note').innerText();
    T('⭐ My favs on: the Scorekeeper\'s Wolves ML, the Judge\'s NHL over, the Grinder\'s dog ML (matched by its label) — nothing else', rows.length === 3 && /Timberwolves ML/.test(rows[0]) && /Scorekeeper/i.test(rows[0]) && !/Coach|Judge/i.test(rows[0]) && /Over 6\.5/.test(rows[1]) && !/Maple Leafs ML|Scorekeeper/i.test(rows[1]) && /North Dakota ML|UND ML/.test(rows[2]) && /Grinder/i.test(rows[2]), JSON.stringify(rows));
    T('…each call shows its lane record and a ⭐', /The Scorekeeper 71% 41–19, \+8\.2u ⭐/i.test(rows[0]), rows[0]);
    T('…and the note adds the starred lanes up: 3 lanes, 3 picks, 118–78, +29.1u together', /Your 3 starred lanes: 3 picks on this sheet\. Together they’re 118–78, \+29\.1u in those lanes/.test(note), note);
    /* star or drop one straight from a game */
    await p.click('.bf [data-k="fav"]'); await p.waitForTimeout(300);
    await p.click('#v-slate .game >> nth=0 >> button[data-act="game"]'); await p.waitForTimeout(400);
    const coachStar = p.locator('#v-slate .won li', { hasText: 'The Coach' }).locator('.favb');
    T('in an open game, every call in "Who\'s with it" has its own ☆ (starred ones ★)', await p.locator('#v-slate .won li .favb').count() === 3 && (await p.locator('#v-slate .won li', { hasText: 'The Scorekeeper' }).locator('.favb').getAttribute('aria-pressed')) === 'true' && (await coachStar.getAttribute('aria-pressed')) === 'false');
    await coachStar.click(); await p.waitForTimeout(300);
    T('…tap the Coach\'s: now a fav (NBA ML dogs), the chip count holds (same game)', JSON.parse(await p.evaluate(() => localStorage.getItem('tdp.favs'))).includes('Coach#nba|ml|dog') && /My favs 3/.test((await p.locator('.bf [data-k="fav"]').innerText()).replace(/\s+/g, ' ')));
    /* Today: your favs' picks, one tap away */
    await p.goto('https://desk.test/desk/#today', { waitUntil: 'load' }); await p.waitForTimeout(1000);
    const ft = await p.locator('.favtoday').innerText().catch(() => '');
    T('Today: "Your favs: 4 picks today", from whom', /Your favs: 4 picks today/i.test(ft) && /Scorekeeper/.test(ft), ft);
    await p.click('.favtoday'); await p.waitForTimeout(600);
    T('…tap it: the Slate with ⭐ My favs on', /#slate$/.test(p.url()) && (await p.locator('.bf [data-k="fav"]').getAttribute('aria-pressed')) === 'true' && (await slateRows()).length === 3);
    T('no page errors', errs.length === 0, errs.join(' | '));
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
