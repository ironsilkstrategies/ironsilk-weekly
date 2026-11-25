/* v70 · Nov 25, 1:47 PM, Chris: "I need a filter for only characters with winning + units on a bet… does that make sense". 💰 Winning &
   up on the Slate: only the calls from a character with a winning record AND up units in that kind of bet (12+ graded there), each
   with that record beside its name; the half line on a closed row follows it on the half record. Real browser, the repo's files, an
   invented feed, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 700))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const AT = Date.parse('2026-11-25T00:10:00Z'), D = '2026-11-24', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z', m = n => AT + n * 60e3;
const r = (lab, w, l, u, x = {}) => ({ lab, rk: 2, of: 8, w, l, u, say: '', ...x });
const call = (v, s, pk, p, rr, x = {}) => ({ v, s, pick: pk, price: -110, p, o: 0, r: rr, hit: null, ...x });
const hc = (v, s, pk, price, p, w, l, u) => ({ v, s, pick: pk, price, p, o: 0, w, l, u, hit: null });
const CAST = { H_L3e1: { name: 'The Closer', chip: '⚙️', color: '#c0b2ab' }, Scout: { name: 'The Scout', chip: '🔭', color: '#4fd' }, Judge: { name: 'The Judge', chip: '⚖️', color: '#fd4' }, Dog: { name: 'The Dog', chip: '🐕', color: '#f84' } };
const BOARD = { d: D, heavy: -500, cast: CAST, games: [
  { sp: 'nba', game: 'SA@SAC', gl: 'SA@SAC', start: iso(m(50)), day: D, st: 'pre', picks: [{ m: 'total', sd: 'over', pick: 'Over 225', price: -110, p: 0.63, tier: 'strong', unan: false, off: false, by: ['H_L3e1', 'Scout'] }],
    calls: { total: [call('H_L3e1', 'over', 'Over 225', 0.63, r('NBA overs', 14, 9, 3.2, { rk: 1, say: 'top' })), call('Scout', 'over', 'Over 225', 0.6, r('NBA overs', 10, 12, -2.1)), call('Judge', 'under', 'Under 225', 0.56, r('NBA unders', 12, 10, -0.8))],
      spread: [call('Dog', 'home', 'SAC +8.5', 0.55, r('NBA spread dogs', 7, 3, 2.0))] },
    half: { ml: [hc('H_L3e1', 'away', '1H SA ML', -180, 0.6, 13, 9, 2.4), hc('Scout', 'home', '1H SAC ML', 150, 0.42, 8, 12, -4.0)], total: [hc('Judge', 'over', '1H Over 114.5', -112, 0.55, 20, 15, 3.1), hc('Dog', 'over', '1H Over 114.5', -112, 0.54, 6, 2, 3.5)] } },
  { sp: 'nba', game: 'UTAH@LAL', gl: 'UTAH@LAL', start: iso(m(80)), day: D, st: 'pre', picks: [],
    calls: { ml: [call('Judge', 'home', 'LAL ML', 0.61, r('NBA ML favorites', 12, 12, 0.5)), call('Scout', 'home', 'LAL ML', 0.58, { lab: 'NBA ML favorites', of: 8 })] } },
  { sp: 'nba', game: 'MIL@BKN', gl: 'MIL@BKN', start: iso(m(90)), day: D, st: 'pre', picks: [],
    calls: { spread: [call('Judge', 'away', 'MIL -3.5', 0.57, r('NBA spread favorites', 13, 11, 0.4))], total: [call('Scout', 'under', 'Under 214.5', 0.59, r('NBA unders', 15, 9, 0))] } }] };
const feed = () => ({ v: 4, beta: true, brand: 'TheDesk', generated: AT - 20 * 60e3, record: { w: 53, l: 38, pu: 0, u: 2.3, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 10 * 36e5, unlockMin: 30, props: [], picks: [] }, characters: [], board: BOARD });
const sg = (a, an, h, hn, t) => ({ k: `nba|${a}@${h}`, sp: 'nba', t, a: { ab: a, name: an, nick: an }, h: { ab: h, name: hn, nick: hn }, ln: { fav: a, line: 8.5, tot: 225, mlA: -350, mlH: 280, spA: -110, spH: -110, ov: -110, un: -110 } });
const SLATE = { v: 1, ts: AT - 10 * 60e3, tz: 'America/Chicago', ranks: {}, days: [{ d: D, games: [sg('SA', 'San Antonio', 'SAC', 'Sacramento', m(50)), sg('UTAH', 'Utah', 'LAL', 'Los Angeles', m(80)), sg('MIL', 'Milwaukee', 'BKN', 'Brooklyn', m(90))] }] };
(async () => {
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 400, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.clock.setFixedTime(new Date(AT));
  await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); } catch (e) { } });
  await p.route('**/*', rq => { const u = new URL(rq.request().url());
    if (/picks\.json$/.test(u.pathname)) return rq.fulfill({ contentType: 'application/json', body: JSON.stringify(feed()) });
    if (/slate\.json$/.test(u.pathname)) return rq.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
    if (/ghost\.json$/.test(u.pathname)) return rq.fulfill({ status: 404, body: '' });
    if (u.hostname === 'site.api.espn.com') return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [] }) });
    if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ rows: [], n: 0 }) });
    if (u.hostname !== 'desk.test') return rq.abort();
    let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return rq.fulfill({ status: 404, body: '' });
    rq.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
  try {
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(1800);
    const st = () => p.evaluate(() => {
      const chip = document.querySelector('#v-slate .bf [data-k="up"][data-v="win"]');
      const games = [...document.querySelectorAll('#v-slate .game')].map(g => ({ teams: g.querySelector('.g-teams') ? g.querySelector('.g-teams').innerText.replace(/\s+/g, ' ') : '',
        tags: [...g.querySelectorAll('.g-bp .tb.ch')].map(t => t.innerText.replace(/\s+/g, ' ').trim()), half: (g.querySelector('.g-half') || {}).innerText || '' }));
      return { chip: chip ? { txt: chip.innerText.replace(/\s+/g, ' ').trim(), on: chip.getAttribute('aria-pressed') } : null, note: (document.querySelector('#v-slate .bf-note') || {}).innerText || '', games }; });
    let s = await st();
    T('the Slate has a 💰 Winning & up chip beside 👑 #1s only; its count is the games with a call from a character winning and up in that kind of bet (2 of 3)', s.chip && /💰 Winning & up 2$/.test(s.chip.txt) && s.chip.on === 'false', JSON.stringify(s.chip));
    T('…off by default: every game, the desk\'s colored picks, the full half line', s.games.length === 3 && /SA ML 1 on it/.test(s.games[0].half) && /SAC ML 1 on it|Over 114\.5 2 on it/.test(s.games[0].half), JSON.stringify(s.games.map(g => g.half)));
    await p.click('#v-slate .bf [data-k="up"][data-v="win"]'); await p.waitForTimeout(400); s = await st();
    const names = s.games.map(g => g.teams);
    T('on: only the games with a winning-and-up call stay (Utah@LA is gone: 12–12 is not winning; unranked is not either)', s.chip.on === 'true' && s.games.length === 2 && !names.some(n => /Utah/.test(n)), JSON.stringify(names));
    const g1 = s.games.find(g => /San Antonio|SA\b/.test(g.teams)), g3 = s.games.find(g => /Milwaukee|MIL/.test(g.teams));
    T('…a game\'s row shows only the characters winning and up in that kind of bet: the Closer (14–9, +3.2u in NBA overs)…', g1 && g1.tags.length === 1 && /the closer/i.test(g1.tags[0]) && /14–9, \+3\.2u/.test(g1.tags[0]), JSON.stringify(g1));
    T('…not the Scout (10–12, down), the Judge (12–10 but down units), the Dog (7–3, up, but only 10 graded)', g1 && !g1.tags.some(t => /scout|judge|dog/i.test(t)), JSON.stringify(g1 && g1.tags));
    T('…a winning record that\'s even on units (15–9, +0.0u) doesn\'t make it; a thin profit does (13–11, +0.4u)', g3 && g3.tags.length === 1 && /the judge/i.test(g3.tags[0]) && /13–11, \+0\.4u/.test(g3.tags[0]), JSON.stringify(g3));
    T('the half line follows it on the half record: the Closer\'s 1H SA ML (13–9, +2.4u) and the Judge\'s 1H over (20–15, +3.1u) stay; the Scout\'s (8–12) and the Dog\'s (8 graded) go', g1 && /SA ML 1 on it/.test(g1.half) && /Over 114\.5 1 on it/.test(g1.half) && !/SAC ML/.test(g1.half), g1 && g1.half);
    T('the note says what it keeps, in plain words', /winning record and up units/.test(s.note) && /12\+ graded/.test(s.note), s.note);
    await p.click('#v-slate .bf [data-k="up"][data-v="win"]'); await p.waitForTimeout(400); s = await st();
    T('tap it again and it\'s off: all three games back, no records on the tags', s.chip.on === 'false' && s.games.length === 3 && !s.games.some(g => g.tags.some(t => /–\d+, [+−]/.test(t))), JSON.stringify(s.games.map(g => g.tags)));
    await p.click('#v-slate .bf [data-k="up"][data-v="win"]'); await p.waitForTimeout(300);
    await p.click('#v-slate .bf [data-k="tier"][data-v="all"]'); await p.waitForTimeout(300); s = await st();
    T('a strength chip goes back to the desk\'s colored picks (and turns it off)', s.chip.on === 'false' && s.games.length === 3, JSON.stringify(s.chip));
    await p.click('#v-slate .bf [data-k="up"][data-v="win"]'); await p.waitForTimeout(300);
    const kept = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('tdp.bf') || 'null'); } catch (e) { return 'x'; } });
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1800); s = await st();
    T('it stays on when the app opens again, like the other filters', s.chip && s.chip.on === 'true' && s.games.length === 2, JSON.stringify([kept, s.chip]));
    const reset = await p.$('#v-slate .bf-reset'); if (reset) { await reset.click(); await p.waitForTimeout(300); } s = await st();
    T('"Show everything" clears it', reset && s.chip.on === 'false' && s.games.length === 3);
    T('no page errors', errs.length === 0, errs.join(' | '));
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
