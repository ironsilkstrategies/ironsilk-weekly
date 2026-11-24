/* v61 · Nov 23, 10:19 PM, Chris: "Why didn't these get graded?! I don't want this to be an issue going forward." On the public app,
   NEV ML −325 and Over 142.5 (Nevada–San Francisco, a neutral-site game) sat at "Today 3:30 PM" all night: the card says NEV@SF and
   ESPN re-filed the game as SF@NEV, so its score never found the pick. Now the same game on the same day, filed the other way round,
   answers — its scores turned back to the way the pick reads its game. Real browser, the repo's own files, invented feeds, no network.
   The clock is fixed at Nov 23, 10:19 PM Central. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 400))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const AT = Date.parse('2026-11-24T04:19:00Z'), D = '2026-11-23', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z';
const by = ['Sim', 'Judge', 'Covers', 'Power'];
const game = (sp, g, start, st, picks) => ({ sp, game: g, gl: g.replace('@', ' at '), start, day: D, st, picks, calls: {} });
const pk = (m, sd, pick, price, p, tier, unan = false) => ({ m, sd, pick, price, p, tier, unan, off: false, by });
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: AT - 3 * 36e5, record: { w: 53, l: 38, pu: 0, u: 2.3, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 10 * 36e5, unlockMin: 30, props: [], picks: [{ sp: 'ncaab', game: 'W&M@IUIN', pick: 'IUIN +6.5', price: -112, p: 0.63, start: '2026-11-23T20:30Z', hit: null, push: false, unlockAt: Date.parse('2026-11-23T20:00Z') }] },
  board: { d: D, heavy: -500, fc: {}, cast: { Sim: { name: 'The Simulator' }, Judge: { name: 'The Judge' }, Covers: { name: 'Covers' }, Power: { name: 'The Commissioner' } }, games: [
    game('ncaab', 'NEV@SF', '2026-11-23T21:30:00.000Z', 'post', [pk('ml', 'away', 'NEV ML', -325, 0.55, 'supreme'), pk('total', 'over', 'Over 142.5', -105, 0.6, 'strong'), pk('spread', 'home', 'SF +5.5', -110, 0.52, 'strong')]),
    game('ncaab', 'ARST@SUU', '2026-11-24T03:30:00.000Z', 'in', [pk('ml', 'home', 'SUU ML', -150, 0.6, 'strong')]),
    game('ncaab', 'W&M@IUIN', '2026-11-23T20:30:00.000Z', 'post', [pk('spread', 'home', 'IUIN +6.5', -112, 0.63, 'supreme', true)]),
    game('ncaab', 'AAA@BBB', '2026-11-23T22:00:00.000Z', 'post', [pk('ml', 'away', 'AAA ML', -200, 0.6, 'strong')])] } };
/* ESPN tonight: San Francisco 70, Nevada 76, filed SF@NEV; Southern Utah 40, Arkansas State 38 live, filed SUU@ARST; W&M 87–82 IUIN as written */
const ev = (id, a, h, as, hs, state, det) => ({ id, competitions: [{ status: { period: 2, clock: 600, type: { state, completed: state === 'post', shortDetail: det } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] });
const EVENTS = [ev('401911457', 'SF', 'NEV', 70, 76, 'post', 'Final'), ev('401929445', 'SUU', 'ARST', 40, 38, 'in', '9:12 - 2nd'), ev('401900001', 'W&M', 'IUIN', 87, 82, 'post', 'Final')];
(async () => {
  const b = await pw.chromium.launch();
  try {
    const ctx = await b.newContext({ ...pw.devices['iPhone 14'], serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
    const espn = []; await p.clock.setFixedTime(new Date(AT));
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); } catch (e) { } });
    await p.route('**/*', r => { const u = new URL(r.request().url());
      if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(FEED) });
      if (u.hostname === 'site.api.espn.com') { espn.push(u.pathname + u.search); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: /mens-college-basketball\/scoreboard/.test(u.pathname) && /dates=20261123/.test(u.search) ? EVENTS : [] }) }); }
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.goto('https://desk.test/desk/#today', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#v-today .leg')].map(e => e.innerText.replace(/\s+/g, ' ')));
    const row = s => rows.find(t => t.startsWith(s)) || rows.find(t => t.includes(s + ' ')) || '';
    T('the scoreboard was asked for (college, Nov 23)', espn.some(u => /mens-college-basketball\/scoreboard/.test(u) && /dates=20261123/.test(u)), espn.join(' | '));
    T('NEV ML grades a hit: ESPN filed the game SF@NEV, the card says NEV@SF — the final reads the card\'s way (Nevada 76–70)', /NEV ML/.test(row('NEV ML')) && /✓ Hit · Final NEV 76–70 SF/.test(row('NEV ML')) && !/Today 3:30 PM/.test(row('NEV ML')), row('NEV ML'));
    T('…Over 142.5 hits (146), SF +5.5 misses (lost by 6)', /✓ Hit · Final NEV 76–70 SF/.test(row('Over 142.5')) && /✗ Missed · Final NEV 76–70 SF/.test(row('SF +5.5')), row('Over 142.5') + ' || ' + row('SF +5.5'));
    T('a live game filed the other way round shows live, the card\'s way round (ARST 38–40 SUU)', /● LIVE ARST 38–40 SUU · 9:12 - 2nd/.test(row('SUU ML')), row('SUU ML'));
    T('a game on file as written grades as before (IUIN +6.5 with W&M 87–82)', /✓ Hit · Final W&M 87–82 IUIN/.test(row('IUIN +6.5')), row('IUIN +6.5'));
    T('a game ESPN doesn\'t list at all stays open — never graded on a guess', /AAA ML/.test(row('AAA ML')) && !/Hit|Missed|Final|LIVE/.test(row('AAA ML')), row('AAA ML'));
    T('the day\'s tally counts the flipped game\'s grades', await p.evaluate(() => /Today: .*\d+ hit/i.test((document.querySelector('#v-today .hmrow') || {}).innerText || '')), await p.evaluate(() => (document.querySelector('#v-today .hmrow') || {}).innerText));
    T('no script errors', errs.length === 0, errs.join(' | '));
    await ctx.close();
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
