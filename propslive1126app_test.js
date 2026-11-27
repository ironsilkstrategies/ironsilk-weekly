/* v81 · Nov 26, 7:14 PM, Chris: "Can we get live updates here" (the Props tab). Cards went out as "NFL · KC" — no game, no time — so they
   could never follow a score. Now a card finds its game on tonight's Slate by the player's team, and follows it: his number so far on a
   meter against the line, the clock, HIT the moment he clears it, a "Live now" lens, and the whispers lead with what's happening. Real
   browser at phone size, the repo's files, an invented feed, Slate, scoreboard and box score; no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 700))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
/* Thanksgiving night, 8:05 PM Central: KC at BUF kicked off at 7:20, DAL at MIN tips at 9:00 */
const AT = Date.parse('2026-11-27T02:05:00Z'), D = '2026-11-26', iso = t => new Date(t).toISOString();
const prop = (o) => ({ k: 'cmp', side: 'over', last: [15, 32, 20, 15, 23, 19, 30, 23, 22, 27], l5: [5, 5], l10: [10, 10], streak: 10, avg10: 22.6, by: [{ v: 'Trends', p: 0.93 }, { v: 'Judge', p: 0.87 }], votes: 2, p: 0.9, fair: -742, ...o });
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: AT - 20 * 60e3, record: { w: 53, l: 38, pu: 0, u: 2.3, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 5 * 36e5, unlockMin: 30, props: [], picks: [] }, characters: [],
  props: { d: D, props: [
    /* published with no game: the machine hadn't loaded the NFL page */
    prop({ id: 'nfl|pm|cmp|15|over', sp: 'nfl', player: 'Patrick Mahomes', team: 'KC', lab: 'completions', thr: 15, opp: null, home: null, start: null }),
    prop({ id: 'nba|ae|pts|25|over', sp: 'nba', player: 'Anthony Edwards', team: 'MIN', k: 'pts', lab: 'PTS', thr: 25, opp: null, home: null, start: null, last: [30, 28, 31, 26, 22, 29, 27, 33, 25, 24], streak: 3 })] } };
const SLATE = { v: 1, ts: AT - 10 * 60e3, tz: 'America/Chicago', ranks: {}, days: [{ d: D, games: [
  { k: 'nfl|KC@BUF', sp: 'nfl', t: Date.parse('2026-11-27T01:20:00Z'), a: { ab: 'KC', name: 'Chiefs', nick: 'Chiefs' }, h: { ab: 'BUF', name: 'Bills', nick: 'Bills' }, ln: { fav: 'BUF', line: 2.5, tot: 47.5, mlA: 120, mlH: -142 } },
  { k: 'nba|DAL@MIN', sp: 'nba', t: Date.parse('2026-11-27T03:00:00Z'), a: { ab: 'DAL', name: 'Mavericks', nick: 'Mavericks' }, h: { ab: 'MIN', name: 'Timberwolves', nick: 'Timberwolves' }, ln: { fav: 'MIN', line: 5.5, tot: 224.5, mlA: 180, mlH: -220 } }] }] };
const SB = { nfl: { events: [{ id: '401', date: iso(Date.parse('2026-11-27T01:20:00Z')), competitions: [{ status: { period: 3, clock: 412, type: { state: 'in', completed: false, shortDetail: '6:52 - 3rd' } }, competitors: [{ homeAway: 'away', team: { abbreviation: 'KC' }, score: '17' }, { homeAway: 'home', team: { abbreviation: 'BUF' }, score: '20' }] }] }] },
  nba: { events: [{ id: '402', date: iso(Date.parse('2026-11-27T03:00:00Z')), competitions: [{ status: { period: 0, type: { state: 'pre', completed: false, shortDetail: '9:00 PM' } }, competitors: [{ homeAway: 'away', team: { abbreviation: 'DAL' }, score: '0' }, { homeAway: 'home', team: { abbreviation: 'MIN' }, score: '0' }] }] }] } };
let CMP = 14; const BOX = () => ({ boxscore: { players: [{ team: { abbreviation: 'KC' }, statistics: [{ name: 'passing', keys: ['completions/passingAttempts', 'passingYards', 'passingTouchdowns'], athletes: [{ athlete: { displayName: 'Patrick Mahomes', shortName: 'P. Mahomes' }, stats: [`${CMP}/22`, '188', '1'] }] }] }] } });
(async () => {
  const b = await pw.chromium.launch(); const ctx = await b.newContext({ ...pw.devices['iPhone 14'], serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
  await p.clock.setFixedTime(new Date(AT));
  await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); } catch (e) { } });
  await p.route('**/*', r => { const u = new URL(r.request().url());
    if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(FEED) });
    if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
    if (/ghost\.json$/.test(u.pathname)) return r.fulfill({ status: 404, body: '' });
    if (u.hostname === 'site.api.espn.com') { if (/summary/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(/event=401/.test(u.search) ? BOX() : {}) });
      const sp = /football\/nfl/.test(u.pathname) ? 'nfl' : /basketball\/nba/.test(u.pathname) ? 'nba' : ''; return r.fulfill({ contentType: 'application/json', body: JSON.stringify(sp && /dates=20261126/.test(u.search) ? SB[sp] : { events: [] }) }); }
    if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ rows: [], n: 0, messages: [] }) });
    if (u.hostname !== 'desk.test') return r.abort();
    let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
  try {
    await p.goto('https://desk.test/desk/#props', { waitUntil: 'load' }); await p.waitForTimeout(3500);
    const card = name => p.evaluate(n => { const c = [...document.querySelectorAll('.pcard')].find(x => x.innerText.includes(n)); return c ? c.innerText.replace(/\s+/g, ' ') : ''; }, name);
    let c = await card('PATRICK MAHOMES');
    T('a prop published with no game finds it on the Slate by his team: "at BUF", not "NFL · KC"', /NFL · at BUF/i.test(c) && !/NFL · KC\b/.test(c), c.slice(0, 200));
    T('…his team sits beside his name', await p.evaluate(() => [...document.querySelectorAll('.pc-tm')].some(x => x.innerText.trim() === 'KC')));
    T('…and it follows the game: a live meter with his number so far against the line, and the clock (14 of 15, 6:52 in the 3rd)', /14 completions of 15/i.test(c) && /6:52 - 3rd/.test(c) && (await p.locator('.pcard .pprog.live').count()) === 1, c);
    const ae = await card('ANTHONY EDWARDS');
    T('the NBA card found its game too, still to tip: "vs DAL" and its start time, no meter yet', /vs DAL/i.test(ae) && /9:00 PM/.test(ae) && !/of 25/.test(ae), ae.slice(0, 200));
    const lens = await p.evaluate(() => [...document.querySelectorAll('.lenses .lens')].map(x => x.innerText.replace(/\s+/g, ' ')));
    T('a "● Live now" lens appears while a game is on (1 prop)', lens.some(x => /Live now 1/.test(x)), JSON.stringify(lens));
    const wh = await p.evaluate(() => (document.querySelector('.whisper') || {}).innerText || '');
    T('the whispers lead with what\'s happening: "one away"', /Patrick Mahomes \(KC\) is one away: 14 of 15\+ completions/.test(wh), wh.slice(0, 300));
    /* he completes two more: the next refresh grades it */
    CMP = 16; await p.clock.setFixedTime(new Date(AT + 65e3)); await p.evaluate(() => window.dispatchEvent(new Event('focus'))); await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(3500);
    c = await card('PATRICK MAHOMES');
    T('16 completions: HIT on the card and a green meter', /HIT/.test(c) && /16 completions of 15/i.test(c) && (await p.locator('.pcard .pprog.hit').count()) === 1, c.slice(0, 300));
    T('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { T('test ran', false, e.stack); }
  await b.close(); console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
