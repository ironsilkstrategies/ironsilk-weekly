/* v67 · Nov 24, 7:33 PM, Chris: "The public app is glitching … Trying to put a price on the box". Every score refresh repainted the
   whole tab (every 30 s during games, again as each league's scores landed), the slip's stake box with it: the box being typed in was
   swapped for a fresh one mid-number, the keyboard dropped and the number went back to the saved one. And the box was 14px, so an
   iPhone zoomed the page in on every tap. Now a repaint the page makes on its own waits while a box has the keyboard and runs the
   moment it lets go, the stake keeps every keystroke, and on iOS the page keeps its scale (the box is 16px everywhere).
   Real browser, the repo's own files, invented feed and slate, no network, the clock fixed at Nov 24, 7:40 PM Central. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 500))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const AT = Date.parse('2026-11-25T01:40:00Z'), D = '2026-11-24', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z', m = n => AT + n * 60e3;
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: AT - 30 * 60e3, record: { w: 53, l: 38, pu: 0, u: 2.3, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 10 * 36e5, unlockMin: 30, props: [], picks: [{ sp: 'nba', game: 'UTAH@LAL', pick: 'LAL -13.5', price: -110, p: 0.71, start: iso(m(-40)), hit: null, push: false, unlockAt: m(-70) }] }, characters: [] };
const sg = (sp, a, h, t, ln) => ({ k: `${sp}|${a}@${h}`, sp, t, a: { ab: a, name: a, nick: a }, h: { ab: h, name: h, nick: h }, ln });
const SLATE = { v: 1, ts: AT - 10 * 60e3, tz: 'America/Chicago', ranks: {}, days: [{ d: D, games: [
  sg('nba', 'UTAH', 'LAL', m(-40), { fav: 'LAL', line: 13.5, tot: 228, mlA: 520, mlH: -750, spA: -110, spH: -110, ov: -115, un: -105 }),
  sg('nba', 'SA', 'SAC', m(50), { fav: 'SA', line: 8.5, tot: 225, mlA: -350, mlH: 280, spA: -110, spH: -110, ov: -110, un: -110 })] }] };
const ev = (id, a, h, as, hs, state, det, per = 2) => ({ id, competitions: [{ status: { period: per, clock: 0, type: { state, completed: state === 'post', shortDetail: det } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] });
const SLIP = [{ k: 'nba|SA@SAC', mk: 'total', side: 'under', sp: 'nba', price: -110, pick: 'Under 225', line: 225 }];
(async () => {
  const b = await pw.chromium.launch(); let feeds = 0, scoreCalls = 0;
  const page = async (dev) => {
    const ctx = await b.newContext({ ...(dev || {}), serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.clock.setFixedTime(new Date(AT));
    await p.addInitScript(s => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); localStorage.setItem('tdp.ddslip', s); localStorage.setItem('tdp.ddmode', '"parlay"'); localStorage.setItem('tdp.ddstake', '25'); } catch (e) { } }, JSON.stringify(SLIP));
    await p.route('**/*', r => { const u = new URL(r.request().url());
      /* every fetch after the first brings a newer card: each one repaints the tab */
      if (/picks\.json$/.test(u.pathname)) { feeds++; return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...FEED, generated: FEED.generated + feeds * 60e3 }) }); }
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (/ghost\.json$/.test(u.pathname)) return r.fulfill({ status: 404, body: '' });
      if (u.hostname === 'site.api.espn.com') { scoreCalls++; return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: /nba\/scoreboard/.test(u.pathname) ? [ev('e5', 'UTAH', 'LAL', 42 + scoreCalls, 53, 'in', 'Halftime', 2)] : [] }) }); }
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ rows: [], n: 0 }) });
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    return { ctx, p, errs }; };
  try {
    let { ctx, p, errs } = await page(pw.devices['iPhone 14']);
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(2200);
    T('on an iPhone the page keeps its scale when a box gets the keyboard (no zoom on tap)', /maximum-scale=1/.test(await p.getAttribute('meta[name="viewport"]', 'content')), await p.getAttribute('meta[name="viewport"]', 'content'));
    T('the slip\'s stake box is 16px (an iPhone zooms in on anything smaller)', (await p.evaluate(() => getComputedStyle(document.querySelector('#ddStake')).fontSize)) === '16px');
    /* type a stake, and while the box has the keyboard let the page refresh the card and the scores */
    await p.evaluate(() => { document.querySelector('#ddStake').__mine = 1; });
    await p.click('#ddStake'); await p.keyboard.press('Control+A'); await p.keyboard.type('12.5');
    const before = feeds;
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await p.waitForTimeout(1600);
    const mid = await p.evaluate(() => { const i = document.querySelector('#ddStake'); return { same: !!(i && i.__mine), focus: document.activeElement === i, v: i && i.value, pays: (document.querySelector('#ddPays') || {}).textContent || '' }; });
    T('a new card and fresh scores land while the stake is being typed: the box stays put, keeps the keyboard and the number', feeds > before && mid.same && mid.focus && mid.v === '12.5', JSON.stringify({ feeds, before, mid }));
    T('…and what it pays follows the number typed', /D\$23\.86|D\$23\.9/.test(mid.pays), mid.pays);
    await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(700);
    const after = await p.evaluate(() => { const i = document.querySelector('#ddStake'); return { same: !!(i && i.__mine), v: i && i.value }; });
    T('the box lets go: the held repaint runs (a fresh slip) and it shows the stake you typed, not the old one', !after.same && after.v === '12.5', JSON.stringify(after));
    T('…no page errors', errs.length === 0, errs.join(' | '));
    await ctx.close();
    ({ ctx, p, errs } = await page(null));
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    T('off iOS the viewport is left alone (pinch zoom untouched)', !/maximum-scale/.test(await p.getAttribute('meta[name="viewport"]', 'content')));
    /* a refresh with nothing being typed repaints at once, as before */
    await p.evaluate(() => { document.querySelector('#ddStake').__mine = 1; });
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(1200);
    T('with no box being typed in, a new card repaints the tab straight away', await p.evaluate(() => !(document.querySelector('#ddStake') || {}).__mine));
    await ctx.close();
    const src = fs.readFileSync(path.join(W, 'desk', 'app.js'), 'utf8');
    T('every repaint the page makes on its own goes through the hold: the score refreshes, a new card, a new slate, the account refresh', /rpT = setTimeout\(\(\) => \{ whenFree\(repaintLive\); runDot\(\); \}, 120\)/.test(src) && (src.match(/whenFree\(render\)/g) || []).length >= 7 && /&& !typing\(\)\) acctLoad\(\);/.test(src));
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
