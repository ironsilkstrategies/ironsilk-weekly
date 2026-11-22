/* v3.3.0 · public app v54 · Bloodlines 2.0 births on the public page (Chris, Nov 22: "once born they become a character on the app
   with their own name style and ideology"). An heir's card wears its crest (split in its parents' colors), its rookie badge and its
   family line; a newborn gets a "New on the desk" banner for a week; the womb's litters get a line under the roster. Hostile values in
   the feed stay inert. Real browser (Playwright), the repo's own files served from disk, an invented feed, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 300))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const now = Date.now(), day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(now));
const dayBack = n => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(now - n * 864e5));
const base = { v: 4, beta: true, brand: 'TheDesk', price: '$25/mo', social: {}, handle: 'Tester', subscribe: 'https://whop.com/ironsilkweekly/thedesk-vip', record: { w: 1, l: 0, pu: 0, u: 0.9, first: '2026-10-06' },
  parlay: null, updates: [], cashed: [], history: [], unlockMin: 30, generated: now, today: { d: day, lockedAt: now - 36e5, unlockMin: 30, picks: [], props: [] },
  plans: [{ id: 'month', name: 'Monthly', price: 50, per: 'month', note: 'Everything' }] };
const kid = (o = {}) => ({ v: 'H_L1e1', name: 'The Architect', chip: '📐 ARCH', color: '#fabe41', title: 'The Golden Child',
  bio: 'Born Dec 4 to the Simulator and the Judge, their first child. Both of its parents were on a heater when it arrived, and it carries that swagger.', origin: 'Child of the Simulator and the Judge.',
  record: { w: 3, l: 1, pu: 0, u: 1.7 }, props: { w: 0, l: 0 }, picks: [], recent: [], teams: [], players: [], best: [],
  kid: { a: 'The Simulator', b: 'The Judge', ca: '#FFD75E', cb: '#f5a524', born: dayBack(1), st: 'rookie', arch: 'Prodigy Architect', creed: "Ride what's working. Totals from one parent, sides from the other.", g: '📐', t: '✨', ...(o.kid || {}) }, ...o.top });
const scout = { v: 'Scout', name: 'The Scout', chip: '🔭 SCOUT', color: '#fb7185', title: 'The Talent Hunter', bio: 'The Scout watches players, not teams.', record: { w: 10, l: 8, pu: 0, u: 1.2 }, props: { w: 0, l: 0 }, picks: [], recent: [], teams: [], players: [], best: [] };
const womb = { litters: [{ a: 'The Coach', b: 'The Historian', ca: '#5FD3E8', cb: '#34d399', arch: 'Steady All-rounder', conceived: dayBack(3), embryos: 2, due: false }], heirs: 1 };
const FEED = { ...base, characters: [scout, kid()], bloodlines: { need: { n: 100, days: 10 }, cells: [], womb } };
const OLD = { ...base, characters: [scout, kid({ kid: { born: dayBack(20), st: 'grad' } })], bloodlines: { need: { n: 100, days: 10 }, cells: [] } };
const EVIL = { ...base, characters: [scout, kid({ kid: { a: '<img src=x onerror="window.__xss=1">', ca: 'red;background:url(javascript:window.__xss=2)', g: '<img src=x onerror="window.__xss=3">', t: '"><svg onload="window.__xss=4">', creed: '<script>window.__xss=5</script>', arch: '<b onmouseover="window.__xss=6">x</b>', st: '<i>x</i>' } })],
  bloodlines: { need: { n: 100, days: 10 }, cells: [], womb: { litters: [{ a: '<img src=x onerror="window.__xss=7">', b: 'B', arch: '<script>window.__xss=8</script>', conceived: day, embryos: 1 }], heirs: 1 } } };
const SLATE = { v: 1, ts: now, tz: 'America/Chicago', ranks: {}, days: [] };
(async () => {
  const b = await pw.chromium.launch();
  async function visit(feed) {
    const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
    await p.route('**/*', r => { const u = new URL(r.request().url());
      if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) });
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); } catch (e) { } });
    await p.goto('https://desk.test/desk/#cast', { waitUntil: 'load' }); await p.waitForTimeout(1000);
    return { p, ctx, errs, text: () => p.evaluate(() => document.querySelector('#v-cast').innerText), html: () => p.evaluate(() => document.querySelector('#v-cast').innerHTML) };
  }
  let v = await visit(FEED); let t = await v.text(), h = await v.html();
  T('the Cast page: a newborn gets a "New on the desk" banner with its crest, its parents and its birthday', /New on the desk: The Architect/i.test(t) && /Child of The Simulator and The Judge/i.test(t) && (await v.p.locator('#v-cast .newheir svg.crest').count()) === 1, t.slice(0, 300));
  T('…its card on the roster wears its crest and its rookie badge (the other characters\' cards don\'t)', (await v.p.locator('#v-cast .castcard.kid svg.cc-crest').count()) === 1 && /🍼 Rookie/.test(await v.p.locator('#v-cast .castcard.kid').innerText()) && (await v.p.locator('#v-cast .castcard:not(.kid) svg').count()) === 0);
  T('…the crest is split in its parents\' colors', /fill="#FFD75E"/.test(h) && /fill="#f5a524"/.test(h));
  T('…and the womb gets its line under the roster: who\'s expecting, what kind of child, since when', /The womb/i.test(t) && /The Coach × The Historian/.test(t) && /a Steady All-rounder/.test(t) && /Expecting/i.test(t), (t.match(/The womb[\s\S]{0,200}/i) || [''])[0]);
  await v.p.click('#v-cast .newheir .nh'); await v.p.waitForTimeout(400); t = await v.text();
  T('tapping the banner opens its profile: the family line (whose child, born when, what kind, rookie), its creed, how a rookie graduates', /Child of The Simulator and The Judge/i.test(t) && /Born /.test(t) && /Prodigy Architect/.test(t) && /Rookie/.test(t) && /Ride what.s working/.test(t) && /graduates once it keeps beating both of its parents/.test(t) && (await v.p.locator('#v-cast .family svg.crest').count()) === 1, t.slice(0, 400));
  T('…with its bio and record like any character', /Born Dec 4 to the Simulator and the Judge/.test(t) && /3–1/.test(t));
  T('no page errors', !v.errs.length, v.errs.join(' | ')); await v.ctx.close();
  v = await visit(OLD); t = await v.text();
  T('three weeks on, no banner; a graduate wears 🎓 Graduated; no womb line when nobody is expecting', !/New on the desk/i.test(t) && /🎓 Graduated/.test(t) && !/The womb/i.test(t)); await v.ctx.close();
  v = await visit(EVIL); h = await v.html();
  const bad = () => v.p.evaluate(() => { const els = [...document.querySelectorAll('#v-cast *')]; return { tags: document.querySelectorAll('#v-cast img, #v-cast script, #v-cast iframe').length, attrs: els.filter(el => [...el.attributes].some(a => /^on/i.test(a.name) || /javascript:/i.test(a.value))).length }; });
  const b1 = await bad(); await v.p.click('#v-cast .newheir .nh').catch(() => { }); await v.p.waitForTimeout(400); const b2 = await bad(), t2 = await v.text();
  T('hostile values in an heir\'s family stay inert: no element or handler from the feed, the names shown as plain text, a whitelisted crest glyph, a safe color, no script ran', !(await v.p.evaluate(() => window.__xss)) && !b1.tags && !b1.attrs && !b2.tags && !b2.attrs && /<img src=x/i.test(t2) && /fill="#F2D067"/.test(h) && !/fill="red/.test(h), JSON.stringify([b1, b2]));
  T('…and nothing broke', !v.errs.length, v.errs.join(' | ')); await v.ctx.close();
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
