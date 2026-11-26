/* v73 · Nov 25, 2:57 PM, Chris: "I want them in the actual character menu when you click the character… so I can see the record it carries
   with parlays and its parlay history". A character's profile: its parlay record, today's tickets, and every ticket of the last 60 days
   (tap one for its legs), narrowed by kind. Real browser, the repo's files, an invented feed, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 700))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const AT = Date.parse('2026-11-25T20:30:00Z'), D = '2026-11-25', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z', m = n => AT + n * 60e3;
const hl = (sp, g, pk, pr, h) => ({ sp, g, pk, pr, h });
const HIST = [
  { d: '2026-11-24', k: 'suit', r: 'win', price: 226, u: 2.26, p: 0.31, legs: [hl('ncaab', 'KENT@BALL', 'KENT ML', -150, 1), hl('ncaab', 'UND@SELA', 'Over 138.5', -110, 1), hl('nba', 'MIA@PHI', 'PHI -2.5', -110, 1)] },
  { d: '2026-11-24', k: 'props', r: 'loss', price: -293, u: -1, p: 0.62, legs: [hl('nba', '', 'Jalen Brunson 25+ PTS', -150, 0), hl('nba', '', 'Tyrese Maxey 6+ AST', -120, 1)] },
  { d: '2026-11-23', k: 'suit', r: 'loss', price: 365, u: -1, p: 0.24, legs: [hl('nba', 'NYK@BOS', 'BOS -3.5', -110, 0), hl('nba', 'LAL@GSW', 'GSW ML', -120, 1), hl('nba', 'DEN@PHX', 'Under 230', -110, 2)] },
  { d: '2026-11-22', k: 'game', r: null, price: 180, u: 0, p: 0.4, legs: [hl('nba', 'CHI@MIL', 'MIL ML', -200, 1), hl('nba', 'ATL@ORL', 'ATL +5.5', -110, null)] }];
const PAR = { game: { w: 0, l: 0, p: 0, u: 0, lw: 1, ll: 0 }, suit: { w: 1, l: 1, p: 0, u: 1.26, lw: 4, ll: 1 }, props: { w: 0, l: 1, p: 0, u: -1, lw: 1, ll: 1 }, last: [{ d: '2026-11-24', k: 'suit', r: 'win', n: 3, hit: 3, price: 226 }], hist: HIST };
const ch = (v, name, par) => ({ v, name, chip: '', color: '#44ddff', title: '', bio: 'A voice.', origin: '', best: [], still: [], record: { w: 3, l: 2, pu: 0, u: 1.1 }, props: { w: 0, l: 0 }, par, picks: [], recent: [], teams: [], players: [] });
const OLDPAR = { ...PAR }; delete OLDPAR.hist;
const leg = (sp, game, pick, price, p) => ({ sp, game, gl: game.replace('@', ' @ '), pick, price, p, q: null, start: iso(m(60)), hit: null, push: false, by: [], voices: [] });
const VIP = { top10: [], banker: null, props: [], parlays: [{ who: 'The Scout', v: 'Scout', skill: true, px: false, price: '+306', p: 0.315, legs: [leg('ncaab', 'UND@SELA', 'UND ML', 105, 0.55), leg('ncaab', 'UWF@KENN', 'UWF ML', -102, 0.57)] }] };
const feed = chars => ({ v: 4, beta: true, brand: 'TheDesk', generated: AT - 20 * 60e3, record: { w: 53, l: 38, pu: 0, u: 2.3, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 5 * 36e5, unlockMin: 30, props: [], picks: [] }, characters: chars, vip: VIP });
(async () => {
  const b = await pw.chromium.launch();
  const open = async (F) => { const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 860 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.clock.setFixedTime(new Date(AT));
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); localStorage.setItem('tdp.castpick', '"Scout"'); } catch (e) { } });
    await p.route('**/*', rq => { const u = new URL(rq.request().url());
      if (/picks\.json$/.test(u.pathname)) return rq.fulfill({ contentType: 'application/json', body: JSON.stringify(F) });
      if (/slate\.json$|ghost\.json$/.test(u.pathname)) return rq.fulfill({ status: 404, body: '' });
      if (u.hostname === 'site.api.espn.com') return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [] }) });
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ rows: [], n: 0 }) });
      if (u.hostname !== 'desk.test') return rq.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return rq.fulfill({ status: 404, body: '' });
      rq.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.goto('https://desk.test/desk/#cast', { waitUntil: 'load' }); await p.waitForTimeout(1800); return { ctx, p, errs }; };
  try {
    let { ctx, p, errs } = await open(feed([ch('Scout', 'The Scout', PAR)]));
    const st = () => p.evaluate(() => { const th = [...document.querySelectorAll('#v-cast .pl-th')].map(h => h.textContent);
      return { title: (document.querySelector('#v-cast .profile .title') || {}).textContent, lane: !!document.querySelector('#v-cast .parlane'), th, chips: !!document.querySelector('#v-cast .pl-last'),
        sum: (document.querySelector('#v-cast .ph-sum') || {}).innerText || '', kinds: [...document.querySelectorAll('#v-cast .ph-k button')].map(x => ({ t: x.innerText.replace(/\s+/g, ' ').trim(), on: x.getAttribute('aria-pressed') })),
        rows: [...document.querySelectorAll('#v-cast .ph')].map(d => ({ s: d.querySelector('summary').innerText.replace(/\s+/g, ' ').trim(), open: d.open, legs: [...d.querySelectorAll('.ph-legs .leg .pk')].map(x => x.childNodes[0].textContent.trim()), marks: [...d.querySelectorAll('.ph-legs .mk')].map(x => x.textContent) })) }; });
    let s = await st();
    T('the character\'s profile: the parlay lane with today\'s parlays first (v75), its record, then its parlay history', s.title === 'The Scout' && s.lane && s.th.join('|') === 'Today’s parlays|Parlay history', JSON.stringify(s.th));
    T('…every ticket of the last 60 days, newest first: the day, the kind, legs hit, price, chance to cash, what it paid', s.rows.length === 4 && /Tue, Nov 24/.test(s.rows[0].s) && /Strong-suit ticket/i.test(s.rows[0].s) && /3\/3 legs hit · \+226 · 31% to cash/.test(s.rows[0].s) && /\+2\.26u/.test(s.rows[0].s) && /−1\.00u/.test(s.rows[1].s) && /Waiting/.test(s.rows[3].s), JSON.stringify(s.rows.map(r => r.s)));
    T('…the history adds up at the top (4 tickets, 1–2, +0.26u; one still waiting)', /4 tickets · 1–2 · \+0\.26u/.test(s.sum), s.sum);
    T('…closed until tapped (the list stays short); the old last-six chips give way to it', s.rows.every(r => !r.open) && !s.chips, JSON.stringify([s.rows.map(r => r.open), s.chips]));
    await p.click('#v-cast .ph summary >> nth=2'); await p.waitForTimeout(200); s = await st();
    const r2 = s.rows[2];
    T('tap a ticket: its legs, each pick with its price and how it went (✓, ✗, a push =)', r2.open && r2.legs.length === 3 && /Celtics|BOS/.test(r2.legs[0]) && /−110/.test(r2.legs[0]) && r2.marks.join('') === '✗✓=', JSON.stringify(r2));
    const pr = await p.evaluate(() => [...document.querySelectorAll('#v-cast .ph')][1].querySelector('.ph-legs .pk').childNodes[0].textContent.trim());
    T('…a prop parlay\'s legs read as the props', /Jalen Brunson 25\+ PTS −150/.test(pr), pr);
    T('kind chips: every ticket, or one kind (with counts)', s.kinds.length === 4 && /Every ticket 4/.test(s.kinds[0].t) && s.kinds[0].on === 'true' && /Strong-suit ticket 2/i.test(s.kinds.find(k => /Strong/i.test(k.t)).t), JSON.stringify(s.kinds));
    await p.click('#v-cast .ph-k button[data-v="suit"]'); await p.waitForTimeout(300); s = await st();
    T('…pick one: only that kind, and the sum is that kind\'s (2 tickets · 1–1 · +1.26u)', s.rows.length === 2 && s.rows.every(r => /Strong-suit/i.test(r.s)) && /2 tickets · 1–1 · \+1\.26u/.test(s.sum) && s.title === 'The Scout', JSON.stringify([s.rows.map(r => r.s), s.sum]));
    T('no page errors', errs.length === 0, errs.join(' | ')); await ctx.close();
    ({ ctx, p, errs } = await open(feed([ch('Scout', 'The Scout', OLDPAR)])));
    s = await st();
    T('an older feed (no history yet) keeps the last-six chips', s.chips && !s.rows.length && s.th.join('|') === 'Today’s parlays', JSON.stringify(s));
    T('…no page errors', errs.length === 0, errs.join(' | ')); await ctx.close();
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
