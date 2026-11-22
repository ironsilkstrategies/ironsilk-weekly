/* v3.5.0 · public app v56 · Bloodlines 2.0, Phase 4 on the public page (Chris, Nov 22: "the parent has to EVOLVE to a higher set of
   standards and becomes a 'legacy 2' character and the child becomes a 'gen 2'… til we have our characters hitting on 90% of their calls
   of confidence of 80% or more"). An evolved character wears its Legacy (card and profile), an heir that made a parent evolve wears its
   Gen; the family's news and the North Star sit under the roster. Hostile values in the feed stay inert. Real browser (Playwright),
   the repo's own files served from disk, an invented feed, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 400))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const now = Date.now(), day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(now));
const dayBack = n => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(now - n * 864e5));
const md = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const base = { v: 4, beta: true, brand: 'TheDesk', price: '$25/mo', social: {}, handle: 'Tester', subscribe: 'https://whop.com/ironsilkweekly/thedesk-vip', record: { w: 1, l: 0, pu: 0, u: 0.9, first: '2026-10-06' },
  parlay: null, updates: [], cashed: [], history: [], unlockMin: 30, generated: now, today: { d: day, lockedAt: now - 36e5, unlockMin: 30, picks: [], props: [] },
  plans: [{ id: 'month', name: 'Monthly', price: 50, per: 'month', note: 'Everything' }] };
const ch = (v, name, o = {}) => ({ v, name, chip: '⚖️ ' + v.toUpperCase(), color: '#f5a524', title: 'The ' + v, bio: `${name} reads the game its own way.`, record: { w: 10, l: 8, pu: 0, u: 1.2 }, props: { w: 0, l: 0 }, picks: [], recent: [], teams: [], players: [], best: [], ...o });
const kid = (o = {}) => ch('H_L1e1', 'The Architect', { chip: '📐 ARCH', color: '#fabe41', title: 'The Golden Child', bio: 'Born Dec 4 to the Simulator and the Judge.',
  kid: { a: 'The Simulator', b: 'The Judge', ca: '#FFD75E', cb: '#f5a524', born: dayBack(40), st: 'grad', arch: 'Prodigy Architect', creed: "Ride what's working.", g: '📐', t: '✨', gen: 2, genAt: dayBack(3), genBy: 'The Judge', family: [], lessons: [], ...(o.kid || {}) } });
const events = [{ id: 'north-Power', t: 'north', d: dayBack(1), who: 'The Commissioner', v: 'Power' }, { id: 'evolve-Judge-2', t: 'evolve', d: dayBack(3), who: 'The Judge', v: 'Judge', n: 2, by: 'The Architect', gen: 2 },
  { id: 'grad-H_L1e1', t: 'grad', d: dayBack(18), who: 'The Architect', v: 'H_L1e1', a: 'The Simulator', b: 'The Judge' }, { id: 'born-H_L1e1', t: 'born', d: dayBack(40), who: 'The Architect', v: 'H_L1e1', a: 'The Simulator', b: 'The Judge', arch: 'Prodigy Architect' }];
const north = { cf: 0.8, goal: 0.9, days: 30, n: 236, w: 169, rate: 0.716, desk: false, std: '2026-11-23', top: [{ v: 'Brain', who: 'The Brain', n: 40, rate: 0.925, star: true }, { v: 'Sim', who: 'The Simulator', n: 46, rate: 0.804, star: false }], exact: { n: 6197, e: 50, rate: 0.008, sp: {} } };
const FEED = { ...base, characters: [ch('Judge', 'The Judge', { legacy: { n: 2, since: dayBack(2), by: 'The Architect' } }), ch('Scout', 'The Scout'), kid()],
  bloodlines: { need: { n: 100, days: 10 }, cells: [], womb: { litters: [], heirs: 1, events }, north } };
const X = '<img src=x onerror="window.__xss=1">';
const EVIL = { ...base, characters: [ch('Judge', 'The Judge', { legacy: { n: X, since: X, by: X } }), ch('Scout', 'The Scout', { legacy: { n: '7"><svg onload="window.__xss=2">', by: '<script>window.__xss=3</script>' } }), kid({ kid: { gen: X, genAt: dayBack(2), genBy: X } })],
  bloodlines: { need: { n: 100, days: 10 }, cells: [], womb: { litters: [], heirs: 1, events: [{ id: 'e1', t: 'evolve', d: X, who: X, n: X, by: '<svg onload="window.__xss=4">', gen: X }, { id: 'e2', t: 'born', d: day, who: 'Kid', a: X, b: '<script>window.__xss=5</script>' }, { id: 'e3', t: '<b>x</b>', d: day, who: X }] },
    north: { n: 50, w: '1e9"><img src=x onerror="window.__xss=6">', rate: 'NaN', days: X, top: [{ who: X, n: X, rate: '0.9"><svg onload="window.__xss=7">', star: X }] } } };
const SLATE = { v: 1, ts: now, tz: 'America/Chicago', ranks: {}, days: [] };
(async () => {
  const b = await pw.chromium.launch();
  async function visit(feed, hash = '#cast') {
    const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
    await p.route('**/*', r => { const u = new URL(r.request().url());
      if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) });
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); } catch (e) { } });
    await p.goto('https://desk.test/desk/' + hash, { waitUntil: 'load' }); await p.waitForTimeout(1000);
    return { p, ctx, errs, text: () => p.evaluate(() => document.querySelector('#v-cast').innerText), html: () => p.evaluate(() => document.querySelector('#v-cast').innerHTML) };
  }
  let v = await visit(FEED); let t = await v.text();
  const card = async who => v.p.locator('#v-cast .castcard', { hasText: who }).first().innerText();
  T('the roster: the Judge\'s card wears "Legacy 2"; the Architect\'s wears "⚡ Gen 2" (not "Graduated"); the Scout\'s neither', /Legacy 2/.test(await card('The Judge')) && /⚡ Gen 2/.test(await card('The Architect')) && !/Graduated/.test(await card('The Architect')) && !/Legacy|Gen \d/.test(await card('The Scout')));
  T('the family\'s news under the roster: the evolution (who did it, the generation it earned), the graduation, the birth, the North Star', /Family news/i.test(t) && /The Judge evolved into Legacy 2: The Architect outdid it and became Gen 2/.test(t) && /The Architect graduated: it kept beating The Simulator and The Judge/.test(t) && /The Architect was born, the child of The Simulator and The Judge/.test(t) && /The Commissioner reached the North Star/.test(t), (t.match(/Family news[\s\S]{0,500}/i) || [''])[0]);
  const bar = await v.p.locator('#v-cast .crown.north .bl-bar i').getAttribute('style');
  T('the North Star: the desk\'s number against the 90% goal (72% of 236 official picks at 80%+), the honest-claims standard since Nov 23, a bar at 80% of the way, who\'s closest (⭐ for one that\'s there)', /The North Star/i.test(t) && /72%/.test(t) && /of 236 official picks at 80% or more hit · last 30 days · goal 90%/.test(t) && /Since (?:\w{3}, )?Nov 23, no character can claim more than its own record proves\./i.test(t) && /width:\s*80%/.test(bar || '') && /The Brain[\s\S]{0,60}93%/.test(t) && (await v.p.locator('#v-cast .crown.north .rcr .n', { hasText: '⭐' }).count()) === 1, (t.match(/The North Star[\s\S]{0,400}/i) || [''])[0] + ' | ' + bar);
  T('no page errors', !v.errs.length, v.errs.join(' | '));
  await v.p.click('#v-cast .castcard:has-text("The Judge")'); await v.p.waitForTimeout(400); t = await v.text();
  T('the Judge\'s profile: "Legacy 2", since when and who outdid it, and what its higher standard means', /Legacy 2/i.test(t) && new RegExp(`Since (?:\\w{3}, )?${md(dayBack(2))}, when its child The Architect outdid it\\. It plays to a higher standard now: it can only claim what its own record proves, so its 80% has to be the real thing\\.`).test(t), (t.match(/Legacy 2[\s\S]{0,300}/i) || [''])[0]);
  await v.p.click('#v-cast .back'); await v.p.waitForTimeout(300); await v.p.click('#v-cast .castcard:has-text("The Architect")'); await v.p.waitForTimeout(400); t = await v.text();
  T('the Architect\'s profile: "⚡ Gen 2 since …, when it outdid The Judge" in its family line', new RegExp(`⚡ Gen 2 since (?:\\w{3}, )?${md(dayBack(3))}, when it outdid The Judge`, 'i').test(t) && /Child of The Simulator and The Judge/i.test(t), (t.match(/Child of[\s\S]{0,300}/i) || [''])[0]);
  await v.ctx.close();
  v = await visit(EVIL); const h = await v.html(); t = await v.text();
  const bad = () => v.p.evaluate(() => { const els = [...document.querySelectorAll('#v-cast *')]; return { tags: document.querySelectorAll('#v-cast img, #v-cast script, #v-cast iframe, #v-cast svg:not(.crest)').length, attrs: els.filter(el => [...el.attributes].some(a => /^on/i.test(a.name) || /javascript:/i.test(a.value))).length }; });
  const b1 = await bad(); await v.p.click('#v-cast .castcard:has-text("The Judge")').catch(() => { }); await v.p.waitForTimeout(400); const b2 = await bad();
  T('hostile values in the feed stay inert: no element or handler from it, a Legacy with no real number shows no badge, words shown as text, a broken rate shows a dash, no script ran', !(await v.p.evaluate(() => window.__xss)) && !b1.tags && !b1.attrs && !b2.tags && !b2.attrs && /&lt;img src=x/.test(h) && /The North Star/i.test(t) && /—/.test(t), JSON.stringify([b1, b2]));
  T('…and nothing broke', !v.errs.length, v.errs.join(' | ')); await v.ctx.close();
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
