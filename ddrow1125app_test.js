/* v71 · Nov 25, 2:02 PM, Chris: "Can we make it where all open games … with the odds already ready to pick before you click the game".
   Every game that hasn't started carries its Desk Dollars prices on its row (moneyline, spread, total, both sides), under the desk's
   picks; a tap puts it on the ticket without opening the game; the rules show once at the top of the sheet. Real browser, the repo's
   files, an invented feed, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 700))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const AT = Date.parse('2026-11-25T00:10:00Z'), D = '2026-11-24', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z', m = n => AT + n * 60e3;
const CAST = { H_L3e1: { name: 'The Closer', chip: '⚙️', color: '#c0b2ab' }, Scout: { name: 'The Scout', chip: '🔭', color: '#4fd' } };
const call = (v, s, pk, p) => ({ v, s, pick: pk, price: -110, p, o: 0, r: null, hit: null });
const bg = (game, t) => ({ sp: 'nba', game, gl: game, start: iso(t), day: D, st: 'pre', picks: [{ m: 'total', sd: 'over', pick: 'Over 225', price: -110, p: 0.63, tier: 'strong', unan: false, off: false, by: ['H_L3e1'] }], calls: { total: [call('H_L3e1', 'over', 'Over 225', 0.63), call('Scout', 'under', 'Under 225', 0.55)] } });
const sg = (a, an, h, hn, t) => ({ k: `nba|${a}@${h}`, sp: 'nba', t, a: { ab: a, name: an, nick: an }, h: { ab: h, name: hn, nick: hn }, ln: { fav: a, line: 8.5, tot: 225, mlA: -350, mlH: 280, spA: -110, spH: -110, ov: -110, un: -110 } });
const mk = (nGames) => { const G = [sg('SA', 'San Antonio', 'SAC', 'Sacramento', m(50)), sg('UTAH', 'Utah', 'LAL', 'Los Angeles', m(80)), sg('MIL', 'Milwaukee', 'BKN', 'Brooklyn', m(-30))];
  for (let i = 0; i < nGames; i++) G.push(sg('A' + i, 'Away ' + i, 'H' + i, 'Home ' + i, m(100 + i)));
  const board = { d: D, heavy: -500, cast: CAST, games: [bg('SA@SAC', m(50)), bg('MIL@BKN', m(-30)), ...Array.from({ length: nGames }, (_, i) => bg(`A${i}@H${i}`, m(100 + i)))] };
  return { slate: { v: 1, ts: AT - 10 * 60e3, tz: 'America/Chicago', ranks: {}, days: [{ d: D, games: G }] },
    feed: { v: 4, beta: true, brand: 'TheDesk', generated: AT - 20 * 60e3, record: { w: 53, l: 38, pu: 0, u: 2.3, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30, today: { d: D, lockedAt: AT - 10 * 36e5, unlockMin: 30, props: [], picks: [] }, characters: [], board } }; };
(async () => {
  const b = await pw.chromium.launch();
  const open = async (X) => { const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 860 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.clock.setFixedTime(new Date(AT));
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); } catch (e) { } });
    await p.route('**/*', rq => { const u = new URL(rq.request().url());
      if (/picks\.json$/.test(u.pathname)) return rq.fulfill({ contentType: 'application/json', body: JSON.stringify(X.feed) });
      if (/slate\.json$/.test(u.pathname)) return rq.fulfill({ contentType: 'application/json', body: JSON.stringify(X.slate) });
      if (/ghost\.json$/.test(u.pathname)) return rq.fulfill({ status: 404, body: '' });
      if (u.hostname === 'site.api.espn.com') return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [] }) });
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ rows: [], n: 0 }) });
      if (u.hostname !== 'desk.test') return rq.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return rq.fulfill({ status: 404, body: '' });
      rq.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(1800); return { ctx, p, errs }; };
  try {
    let { ctx, p, errs } = await open(mk(0));
    const st = () => p.evaluate(() => [...document.querySelectorAll('#v-slate .game')].map(g => ({ t: (g.querySelector('.g-teams') || {}).innerText.replace(/\s+/g, ' '), open: g.classList.contains('g-open'),
      row: [...g.querySelectorAll(':scope > .g-dd .ddb')].map(x => ({ t: x.innerText.replace(/\s+/g, ' ').trim(), on: x.classList.contains('on') })), grids: g.querySelectorAll('.ddgrid').length, picks: !!g.querySelector('.g-bp .bp'),
      sec: [...g.querySelectorAll('.g-sec h4')].map(h => h.textContent) })));
    let s = await st(); const sa = s.find(g => /San Antonio/.test(g.t)), ut = s.find(g => /Utah/.test(g.t)), mi = s.find(g => /Milwaukee/.test(g.t));
    T('on first load, an open game\'s row has its prices ready, no tap needed: both moneylines, both spreads, over and under', sa && !sa.open && sa.row.length === 6 && JSON.stringify(sa.row.map(x => x.t.replace('-8.5', '−8.5'))) === JSON.stringify(['SA ML −350', 'SA −8.5 −110', 'Over 225 −110', 'SAC ML +280', 'SAC +8.5 −110', 'Under 225 −110']), JSON.stringify(sa));
    T('…under the desk\'s picks, which stay on the row', sa && sa.picks, JSON.stringify(sa));
    T('…every open game, even one the desk has no pick on', ut && ut.row.length === 6 && !ut.picks, JSON.stringify(ut));
    T('…but not a game that has started (no betting it)', mi && mi.row.length === 0 && mi.grids === 0, JSON.stringify(mi));
    const key = await p.evaluate(() => [...document.querySelectorAll('#v-slate .dd-key')].map(x => x.innerText));
    T('the D$ rules show once, at the top of the sheet, not on every game', key.length === 1 && /tap a price on any game that hasn’t started/.test(key[0]) && /No ticket pays over 10,000x/.test(key[0]), JSON.stringify(key));
    const SA = () => p.locator('#v-slate .game', { hasText: 'San Antonio' }), saOf = x => x.find(g => /San Antonio/.test(g.t));
    await SA().locator('.g-dd .ddb', { hasText: 'Over 225' }).click(); await p.waitForTimeout(300); s = await st();
    const slip = await p.evaluate(() => (document.querySelector('.ddslip') || {}).innerText || ''), s1 = saOf(s);
    T('tap a price on the row: it\'s on the ticket (the slip shows it) and the game stays closed', s1.row.find(x => /Over 225/.test(x.t)).on && !s1.open && /1 leg/.test(slip) && /Over 225/.test(slip), JSON.stringify([s1, slip.slice(0, 120)]));
    await SA().locator('button[data-act="game"]').click(); await p.waitForTimeout(300); s = await st(); const s2 = saOf(s);
    T('open the game: the prices aren\'t doubled — the open card has the one grid, with its rules, the pick still on', s2.open && s2.row.length === 0 && s2.grids === 1 && s2.sec.includes('Play it with Desk Dollars') && await p.evaluate(() => !!document.querySelector('.g-open .ddb.on')), JSON.stringify(s2));
    await SA().locator('button[data-act="game"]').click(); await p.waitForTimeout(300);
    await SA().locator('.g-dd .ddb', { hasText: 'Over 225' }).click(); await p.waitForTimeout(300);
    T('tap it again and it comes off the ticket', !(await p.evaluate(() => !!document.querySelector('.ddslip'))));
    T('no page errors', errs.length === 0, errs.join(' | ')); await ctx.close();
    /* a full sheet: 60 open games, each with its prices, and a tap still answers fast */
    ({ ctx, p, errs } = await open(mk(60)));
    const n = await p.evaluate(() => document.querySelectorAll('#v-slate .g-dd .ddgrid').length);
    const ms = await p.evaluate(() => { const x = document.querySelectorAll('#v-slate .g-dd .ddb')[40]; const t0 = performance.now(); x.click(); return performance.now() - t0; });
    T(`a full sheet: all 62 open games carry their prices (${n}), and a tap re-draws it in ${Math.round(ms)}ms (under 400)`, n === 62 && ms < 400, JSON.stringify({ n, ms }));
    T('…no page errors', errs.length === 0, errs.join(' | ')); await ctx.close();
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
