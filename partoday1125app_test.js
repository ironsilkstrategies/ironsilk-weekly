/* v72 · Nov 25, 2:20 PM, Chris: "Can we make it where it shows every characters parlays for the day so I can gather the info without going
   back to the machine… I need to make sure I can at least see their parlays for the day". The Cast page lists every character's tickets
   for today (game or strong-suit ticket, prop parlay: every leg, its price, % to cash); each character's parlay lane shows its own. Real
   browser, the repo's files, an invented feed, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 700))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const AT = Date.parse('2026-11-25T20:30:00Z'), D = '2026-11-25', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z', m = n => AT + n * 60e3;
const leg = (sp, game, pick, price, p, x = {}) => ({ sp, game, gl: game.replace('@', ' @ '), pick, price, p, q: null, start: iso(m(60)), hit: null, push: false, by: [], voices: [], ...x });
const prop = (pick, price, p) => ({ sp: 'ncaab', game: '', gl: '', pick, price, p, q: null, start: '', hit: null, push: false, by: [], voices: [] });
const PARLAYS = [
  { who: 'The Scorekeeper', v: 'Scorekeeper', skill: false, px: true, price: '-1227', p: 0.854, legs: [prop('Joaquim Boumtje Boumtje 10+ REB', -3233, 0.97), prop("Amont'e Allen-Johnson 7+ AST", -2040, 0.95)] },
  { who: 'The Simulator', v: 'Sim', skill: true, px: false, price: '+129', p: 0.467, legs: [leg('nhl', 'OTT@FLA', 'OTT +1.5', -245, 0.7), leg('nba', 'SAS@POR', 'SAS ML', -160, 0.66)] },
  { who: 'The Scout', v: 'Scout', skill: false, px: false, price: '+306', p: 0.315, legs: [leg('ncaab', 'UND@SELA', 'UND ML', 105, 0.55, { hit: true }), leg('ncaab', 'UWF@KENN', 'UWF ML', -102, 0.57)] }];
const ch = (v, name, color, par) => ({ v, name, chip: '', color, title: '', bio: 'A voice.', origin: '', best: [], still: [], record: { w: 3, l: 2, pu: 0, u: 1.1 }, props: { w: 0, l: 0 }, par, picks: [], recent: [], teams: [], players: [] });
const PAR = { game: { w: 2, l: 4, p: 0, u: -3.3, lw: 10, ll: 4 }, suit: { w: 3, l: 3, p: 0, u: 2.9, lw: 8, ll: 3 }, props: { w: 0, l: 0, p: 0, u: 0, lw: 0, ll: 0 }, last: [{ d: '2026-11-24', k: 'suit', r: 'win', n: 2, hit: 2, price: 178 }] };
const CHARS = [ch('Scout', 'The Scout', '#44ddff', PAR), ch('Sim', 'The Simulator', '#aa88ff', PAR), ch('Scorekeeper', 'The Scorekeeper', '#ffcc44', null), ch('Judge', 'The Judge', '#ffdd44', PAR)];
const feed = vip => ({ v: 4, beta: true, brand: 'TheDesk', generated: AT - 20 * 60e3, record: { w: 53, l: 38, pu: 0, u: 2.3, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 5 * 36e5, unlockMin: 30, props: [], picks: [] }, characters: CHARS, ...(vip ? { vip } : {}) });
(async () => {
  const b = await pw.chromium.launch();
  const open = async (F, hash) => { const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 860 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.clock.setFixedTime(new Date(AT));
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); } catch (e) { } });
    await p.route('**/*', rq => { const u = new URL(rq.request().url());
      if (/picks\.json$/.test(u.pathname)) return rq.fulfill({ contentType: 'application/json', body: JSON.stringify(F) });
      if (/slate\.json$|ghost\.json$/.test(u.pathname)) return rq.fulfill({ status: 404, body: '' });
      if (u.hostname === 'site.api.espn.com') return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [] }) });
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ rows: [], n: 0 }) });
      if (u.hostname !== 'desk.test') return rq.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return rq.fulfill({ status: 404, body: '' });
      rq.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.goto('https://desk.test/desk/' + hash, { waitUntil: 'load' }); await p.waitForTimeout(1800); return { ctx, p, errs }; };
  try {
    let { ctx, p, errs } = await open(feed({ top10: [], banker: null, parlays: PARLAYS, props: [] }), '#cast');
    /* v74 · Nov 25, 3:24 PM, Chris: "Now that the parlays are in the characters profile.. can we take them off this main cast page?!" */
    T('the Cast page is the roster again: no list of every ticket on it (v74)', await p.evaluate(() => !document.querySelector('#v-cast .partoday') && !document.querySelector('#v-cast .ptk') && !!document.querySelector('#v-cast .castgrid')));
    await p.selectOption('#castSel', 'Scout'); await p.waitForTimeout(400);
    const prof = await p.evaluate(() => ({ title: (document.querySelector('#v-cast .profile .title') || {}).textContent, lane: !!document.querySelector('#v-cast .parlane'), th: (document.querySelector('#v-cast .pl-th') || {}).textContent || '',
      tix: [...document.querySelectorAll('#v-cast .pl-tix .ptk')].map(t => ({ h: t.querySelector('.tix-h').innerText.replace(/\s+/g, ' '), legs: [...t.querySelectorAll('.leg .pk')].map(x => x.childNodes[0].textContent.trim()), marks: [...t.querySelectorAll('.leg .mk')].map(x => x.textContent) })) }));
    T('a character\'s profile: the parlay lane keeps its record and shows today\'s ticket', prof.title === 'The Scout' && prof.lane && /Today’s parlays/.test(prof.th) && prof.tix.length === 1 && /🎟 Game parlay/i.test(prof.tix[0].h), JSON.stringify(prof));
    /* v75 · Nov 26, 12:00 PM, Chris: "Also the character parlays weren’t in there profile today they were on the main page … fix that!" */
    T('v75 · today\'s parlays come first in the lane, above its record (the first thing on tapping a character)', await p.evaluate(() => { const a = document.querySelector('#v-cast .pl-th'), b = document.querySelector('#v-cast .parlane'), h = [...document.querySelectorAll('#v-cast .h2')].find(x => /parlay lane/i.test(x.textContent));
      return !!(a && b && h) && !!(h.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); }));
    T('…every leg with its price, the ticket\'s price and its chance to cash', /2 legs · \+306 · 32% to cash/.test(prof.tix[0].h) && prof.tix[0].legs.length === 2 && /UND/.test(prof.tix[0].legs[0]) && /\+105/.test(prof.tix[0].legs[0]), JSON.stringify(prof.tix[0]));
    T('…a leg that already cashed shows ✓ (graded live like every ticket)', prof.tix[0].marks[0] === '✓', JSON.stringify(prof.tix[0].marks));
    await p.selectOption('#castSel', 'Sim'); await p.waitForTimeout(400);
    T('…the Simulator\'s shows its strong-suit ticket', await p.evaluate(() => [...document.querySelectorAll('#v-cast .pl-tix .ptk .tix-h')].map(x => x.innerText).join('|').match(/Strong-suit ticket/i) !== null));
    await p.selectOption('#castSel', 'Scorekeeper'); await p.waitForTimeout(400);
    const sk = await p.evaluate(() => ({ lane: !!document.querySelector('#v-cast .parlane'), tix: document.querySelectorAll('#v-cast .pl-tix .ptk').length, h2: [...document.querySelectorAll('#v-cast .h2')].map(h => h.textContent) }));
    T('a character with no settled tickets yet still shows today\'s (no empty record box)', !sk.lane && sk.tix === 1 && sk.h2.includes('The parlay lane'), JSON.stringify(sk));
    await p.selectOption('#castSel', 'Judge'); await p.waitForTimeout(400);
    const jd = await p.evaluate(() => ({ lane: !!document.querySelector('#v-cast .parlane'), th: !!document.querySelector('#v-cast .pl-th') }));
    T('…and one with no ticket today shows its record only', jd.lane && !jd.th, JSON.stringify(jd));
    T('v75 · …and says so plainly: "No parlay from it today." (once the desk has locked its card)', await p.evaluate(() => /No parlay from it today\./.test((document.querySelector('#v-cast .pl-none') || {}).textContent || '')));
    await p.click('#v-cast [data-act="castpick"][data-v=""]').catch(() => p.selectOption('#castSel', '')); await p.waitForTimeout(400);
    const tags = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#v-cast .castcard')].map(c => [c.dataset.v, (c.querySelector('.cc-par') || {}).textContent || ''])));
    T('v75 · the Cast roster marks who has a parlay today (Scout, Simulator, Scorekeeper: 1 each; the Judge none) — the tickets themselves stay in the profiles', tags.Scout === '🎟 1 parlay today' && tags.Sim === '🎟 1 parlay today' && tags.Scorekeeper === '🎟 1 parlay today' && tags.Judge === '' && await p.evaluate(() => !document.querySelector('#v-cast .ptk')), JSON.stringify(tags));
    await p.goto('https://desk.test/desk/#today', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const vs = await p.evaluate(() => ({ h: [...document.querySelectorAll('.vsec .h2')].map(h => h.textContent), tix: document.querySelectorAll('#v-today .pargrid .tix').length, txt: document.querySelector('#v-today').innerText }));
    T('v75 · the Today page no longer lists every character\'s parlay', !vs.h.some(h => /Every character’s parlay/i.test(h)) && !vs.tix && !/UND ML \+105/.test(vs.txt), JSON.stringify(vs.h));
    T('no page errors', errs.length === 0, errs.join(' | ')); await ctx.close();
    ({ ctx, p, errs } = await open(feed(null), '#cast'));
    await p.selectOption('#castSel', 'Scout'); await p.waitForTimeout(400);
    T('before the desk locks its card (no tickets in the feed yet), a profile shows no empty Today\'s parlays and no "No parlay" line', await p.evaluate(() => !document.querySelector('#v-cast .pl-th') && !document.querySelector('#v-cast .pl-none') && !!document.querySelector('#v-cast .parlane')));
    T('…no page errors', errs.length === 0, errs.join(' | ')); await ctx.close();
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
