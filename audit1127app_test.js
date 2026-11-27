/* v82 · Nov 27, 10:57 AM, Chris: "Do an extensive audit to fix anything you see wrong on the public site". What the audit found and fixed,
   held in place: the Props page draws 24 cards at a time; buttons with no look of their own (the account page's "Sign in", "Track it")
   were the browser's flat grey; the new-ticket form and the 320px top bar ran off the side of a phone; gold links on cream; the Gamecast's
   pick rows; "Your public record" unstyled; the empty LongShots page; "The Oracle · The Oracle"; chat times with no date; the chatroom
   "Soon" on the Join table; D$ columns for markets nobody posted; the card refresh pulling both copies every 2 minutes; a full storage
   costing a sign-in; and the card published pretty-printed (40% bigger). Real browser, the repo's files, invented data, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 600))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
/* Friday 1:00 PM Central */
const AT = Date.parse('2026-11-27T19:00:00Z'), D = '2026-11-27', iso = t => new Date(t).toISOString();
const prop = i => ({ id: 'ncaab|p' + i + '|pts|10|over', sp: 'ncaab', player: 'Player ' + String(i).padStart(2, '0'), team: 'BBB', k: 'pts', lab: 'PTS', thr: 10, side: 'over', opp: 'AAA', home: true, start: iso(AT + 3 * 36e5),
  last: [12, 14, 11, 15, 13, 12, 16, 11, 14, 13], l5: [5, 5], l10: [10, 10], streak: 10, avg10: 13.1, by: [{ v: 'Scout', p: 0.8 }], votes: 1, p: 0.8 - i / 1000, fair: -400 });
const ch = (v, name, title, color) => ({ v, name, chip: name, color, title, bio: 'Bio.', origin: '', best: [], still: [], record: { w: 10, l: 8, pu: 0, u: 1.2 }, props: { w: 0, l: 0 }, picks: [], recent: [], teams: [], players: [] });
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: AT - 20 * 60e3, record: { w: 59, l: 41, pu: 0, u: 4.09, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 4 * 36e5, unlockMin: 30, props: [], picks: [] },
  characters: [ch('Pred', 'The Oracle', 'The Oracle', '#A78BFA'), ch('Scout', 'The Scout', 'The Talent Hunter', '#FB7185')],
  founder: { tix: [], rec: { cashed: 0, lost: 39 } },
  props: { d: D, props: Array.from({ length: 30 }, (_, i) => prop(i)) } };
/* one game the book only posted a spread and a total for, one with all three */
const SLATE = { v: 1, ts: AT - 10 * 60e3, tz: 'America/Chicago', ranks: {}, days: [{ d: D, games: [
  { k: 'ncaab|AAA@BBB', sp: 'ncaab', t: AT + 3 * 36e5, a: { ab: 'AAA', name: 'Aces', nick: 'Aces' }, h: { ab: 'BBB', name: 'Bees', nick: 'Bees' }, ln: { fav: 'BBB', line: 3.5, tot: 141.5, spA: -110, spH: -110, ov: -110, un: -110 } },
  { k: 'nba|CCC@DDD', sp: 'nba', t: AT + 5 * 36e5, a: { ab: 'CCC', name: 'Cats', nick: 'Cats' }, h: { ab: 'DDD', name: 'Dogs', nick: 'Dogs' }, ln: { fav: 'DDD', line: 5.5, tot: 224.5, mlA: 180, mlH: -220, spA: -110, spH: -110, ov: -110, un: -110 } }] }] };
const ME = { name: 'Tester', since: AT - 40 * 864e5, xp: 300, rank: { name: 'Runner', next: 500, nextName: 'Hustler', pct: 0.3 }, trophies: {}, xplog: [], wallet: { bal: 975, bought: 0, prize: 0, w: 0, l: 0, p: 0 },
  tickets: [], bets: [], runs: [], leagues: [{ lid: 'lg1', name: 'Thanksgiving Week Classic', status: 'live', bal: 1012, start: 1000, open: 0, starts: AT - 3 * 864e5, ends: AT + 4 * 864e5, sports: ['nba', 'ncaab'] }],
  drafts: [], inbox: { msgs: [], unread: 0 }, pub: false };
const counts = { site: 0, raw: 0 };
const route = r => { const u = new URL(r.request().url());
  if (/picks\.json$/.test(u.pathname)) { counts[u.hostname === 'raw.githubusercontent.com' ? 'raw' : 'site']++; return r.fulfill({ contentType: 'application/json', body: JSON.stringify(FEED) }); }
  if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
  if (/ghost\.json$/.test(u.pathname)) return r.fulfill({ status: 404, body: '' });
  if (u.hostname === 'site.api.espn.com') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [] }) });
  if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') { const J = o => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (u.pathname === '/acct/me') return J(ME);
    if (u.pathname === '/acct/board') return J({ rows: [{ name: 'TheDesk', earned: 1600.52, w: 1, l: 3 }, { name: 'NDR', pub: true, earned: 1000, w: 0, l: 0 }] });
    if (u.pathname === '/chat/history') return J({ messages: [{ id: 'm1', name: 'TheDesk', owner: true, ts: AT - 10 * 864e5, text: 'Ten days ago' }, { id: 'm2', name: 'Fan', ts: AT - 36e5, text: 'An hour ago' }] });
    return J({ rows: [], n: 0, messages: [], rooms: [], by: {}, leaders: [], recent: [] }); }
  if (u.hostname !== 'desk.test') return r.abort();
  let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
  r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); };
const lum = c => { const m = String(c).match(/\d+(\.\d+)?/g) || [0, 0, 0]; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(+m[0]) + 0.7152 * f(+m[1]) + 0.0722 * f(+m[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
async function page(b, dev, o = {}) { const ctx = await b.newContext({ ...dev, serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
  if (o.clock === 'install') await p.clock.install({ time: new Date(AT) }); else await p.clock.setFixedTime(new Date(AT));
  await p.addInitScript(([signed, full]) => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1');
    if (signed) localStorage.setItem('tdp.acct', JSON.stringify({ token: 'x'.repeat(32), name: 'Tester', exp: Date.now() + 864e5 }));
    /* a storage that's full: with the saved card in it, nothing else fits (window.__full turns it on); or the card itself never fits */
    const set0 = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if ((window.__full && k !== 'tdp.feed' && this.getItem('tdp.feed') != null) || (full === 'feed' && k === 'tdp.feed')) throw new DOMException('full', 'QuotaExceededError'); return set0.call(this, k, v); };
    if (full === 'feed') set0.call(localStorage, 'tdp.feed', JSON.stringify({ v: 4, beta: true, generated: 1, record: { w: 1, l: 0 } })); } catch (e) { } }, [!!o.signed, o.full || '']);
  await p.route('**/*', route); return { ctx, p, errs }; }
(async () => {
  const b = await pw.chromium.launch(); const PHONE = pw.devices['iPhone 14'];
  try {
    /* ── signed out, phone ── */
    let { ctx, p, errs } = await page(b, PHONE);
    await p.goto('https://desk.test/desk/#props', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    let n = await p.locator('.pcard').count(), more = await p.evaluate(() => (document.querySelector('[data-act="pmore"]') || {}).innerText || '');
    T('Props draws 24 cards, not all 30, with "Show 6 more · 24 of 30"', n === 24 && /Show 6 more/.test(more) && /24 of 30/.test(more), n + ' / ' + more);
    await p.click('[data-act="pmore"]'); await p.waitForTimeout(400);
    T('…"Show more" adds the rest and the button goes', (await p.locator('.pcard').count()) === 30 && (await p.locator('[data-act="pmore"]').count()) === 0);
    await p.click('.lens[data-k="lens"][data-v="heat"]'); await p.waitForTimeout(400);
    T('…a new lens starts over at 24', (await p.locator('.pcard').count()) === 24);
    const fresh = await p.evaluate(() => { try { localStorage.removeItem('tdp.pf'); } catch (e) { } window.__full = true; return 1; });
    await p.click('.lens[data-k="lens"][data-v="all"]'); await p.waitForTimeout(400);
    const st = await p.evaluate(() => { window.__full = false; return { pf: localStorage.getItem('tdp.pf'), feed: localStorage.getItem('tdp.feed') }; });
    T('a full storage never costs a setting: the saved card makes way and the setting is written', fresh && st.pf && /"lens":"all"/.test(st.pf) && st.feed === null, JSON.stringify(st).slice(0, 200));

    await p.evaluate(() => { location.hash = '#me'; }); await p.waitForTimeout(1500);
    const si = await p.evaluate(() => { const b0 = document.querySelector('#v-me form button[type="submit"]'); if (!b0) return null; const cs = getComputedStyle(b0); return { t: b0.innerText.trim(), bg: cs.backgroundColor, img: cs.backgroundImage, fg: cs.color }; });
    T('the account page\'s "Sign in" is ink with cream letters, not the browser\'s flat grey', si && /Sign in/.test(si.t) && !/107, 107, 107|239, 239, 239/.test(si.bg) && ratio(si.bg, si.fg) >= 7, JSON.stringify(si));
    const lk = await p.evaluate(() => { const e = [...document.querySelectorAll('#lb .link')].find(x => x.innerText.trim() === 'NDR'); return e ? getComputedStyle(e.querySelector('b') || e).color : null; });
    T('a tappable name on the leaderboard reads dark on its cream sheet', lk && ratio(lk, 'rgb(244, 236, 216)') >= 4.5, lk);

    await p.evaluate(() => { location.hash = '#longshots'; }); await p.waitForTimeout(800);
    const ls = await p.evaluate(() => document.querySelector('#v-longshots').innerText.replace(/\s+/g, ' '));
    T('the empty LongShots page says why, and keeps the 30-day record on screen', /No LongShot ticket up yet today/i.test(ls) && /Yesterday’s tickets come down when today’s card locks/.test(ls) && /Last 30 days: 0 cashed, 39 lost/.test(ls), ls.slice(0, 400));

    await p.evaluate(() => { location.hash = '#join'; }); await p.waitForTimeout(800);
    const jr = await p.evaluate(() => { const r0 = [...document.querySelectorAll('#v-join tr')].find(x => /chatroom/i.test(x.innerText)); const last = r0 && r0.querySelector('td:last-child'); return r0 ? r0.innerText.replace(/\s+/g, ' ') + '|' + (last && last.querySelector('svg.y') ? 'yes' : 'no') : null; });
    T('the Join table no longer calls the live chatroom "Soon": VIP includes it', jr && !/Soon/.test(jr) && /\|yes$/.test(jr), jr);

    await p.evaluate(() => { location.hash = '#cast'; }); await p.waitForTimeout(800);
    const op = await p.evaluate(() => [...document.querySelectorAll('#castSel option')].map(o => o.text));
    T('the character picker says "The Oracle" once and keeps a real title: "The Scout · The Talent Hunter"', op.includes('The Oracle') && op.includes('The Scout · The Talent Hunter') && !op.some(x => /The Oracle · The Oracle/.test(x)), JSON.stringify(op));

    await p.evaluate(() => { location.hash = '#chat'; }); await p.waitForTimeout(1200);
    const tm = await p.evaluate(() => [...document.querySelectorAll('#msgs .msg time')].map(x => x.innerText.trim()));
    T('a chat message from another day carries its date ("Nov 17, …"); today\'s shows the time alone', tm.length === 2 && /^Nov 17, \d/.test(tm[0]) && /^\d{1,2}:\d\d\s[AP]M$/.test(tm[1]), JSON.stringify(tm));

    await p.evaluate(() => { location.hash = '#slate'; }); await p.waitForTimeout(1500);
    const dd = await p.evaluate(() => { const one = k => { const g = [...document.querySelectorAll('.ddgrid')].find(x => x.querySelector(`[data-k="${k}"]`)); return g ? [...g.querySelectorAll('.ddh')].map(h => h.innerText.trim()).join(',') + '|' + g.querySelectorAll('.ddb').length : null; }; return [one('ncaab|AAA@BBB'), one('nba|CCC@DDD')]; });
    T('no moneyline posted: the D$ prices show Spread and Total only, no blank Moneyline column', dd[0] && /^Spread,Total\|4$/i.test(dd[0]) && /^Moneyline,Spread,Total\|6$/i.test(dd[1]), JSON.stringify(dd));

    const gc = await p.evaluate(() => { const w = document.createElement('div'); w.className = 'gc-on'; w.innerHTML = '<div class="bp t-strong"><span class="bp-pk">UVA ML −280</span></div>'; document.body.appendChild(w); const e = w.querySelector('.bp'), k = w.querySelector('.bp-pk'); const r = [getComputedStyle(e).backgroundColor, getComputedStyle(k).color]; w.remove(); return r; });
    T('on the Gamecast the desk\'s pick rows are solid paper with ink, readable', ratio(gc[0], gc[1]) >= 7, JSON.stringify(gc));
    T('no script errors (signed out)', errs.length === 0, errs.join(' | '));
    await ctx.close();

    /* ── signed in, phone: My tickets and Your account ── */
    ({ ctx, p, errs } = await page(b, PHONE, { signed: true }));
    await p.goto('https://desk.test/desk/#tix', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const tf = await p.evaluate(() => { const d = document.querySelector('details.newtk'); if (!d) return null; d.open = true; const b0 = d.querySelector('button[type="submit"]'), cs = getComputedStyle(b0); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, right: Math.round(d.querySelector('form').getBoundingClientRect().right), bg: cs.backgroundColor, fg: cs.color }; });
    T('the new-ticket form fits a 390px phone (it ran to 498px and the page scrolled sideways)', tf && tf.sw === tf.cw && tf.right <= tf.cw, JSON.stringify(tf));
    T('…and its "Track it" is a real button: ink with cream letters', tf && !/107, 107, 107/.test(tf.bg) && ratio(tf.bg, tf.fg) >= 7, JSON.stringify(tf));
    await p.evaluate(() => { location.hash = '#me'; }); await p.waitForTimeout(1500);
    const pr = await p.evaluate(() => { const c = document.querySelector('.pubrec'); if (!c) return null; const L = [...c.querySelectorAll('.chk')].map(x => Math.round(x.getBoundingClientRect().top)); return { pad: parseFloat(getComputedStyle(c).paddingLeft), tops: L }; });
    T('"Your public record" has room inside its card, one checkbox to a line', pr && pr.pad >= 12 && pr.tops.length === 2 && pr.tops[1] > pr.tops[0] + 20, JSON.stringify(pr));
    await p.evaluate(() => { location.hash = '#slate'; }); await p.waitForTimeout(1500);
    await p.click('.ddb'); await p.waitForTimeout(600);
    const sl = await p.evaluate(() => { const x = document.querySelector('[data-act="ddclear"]'), pl = document.querySelector('[data-act="ddplace"]'), f = document.querySelector('#ddFrom'); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, x: x && Math.round(x.getBoundingClientRect().right), ph: pl && Math.round(pl.getBoundingClientRect().height), opts: f ? f.options.length : 0 }; });
    T('the D$ slip fits a phone with a league in its "From" menu (its ✕ sat 49px off the side), "Place it" on one line', sl.opts >= 2 && sl.sw === sl.cw && sl.x <= sl.cw && sl.ph <= 44, JSON.stringify(sl));
    T('no script errors (signed in)', errs.length === 0, errs.join(' | '));
    await ctx.close();

    /* ── 320px ── */
    ({ ctx, p, errs } = await page(b, pw.devices['iPhone SE']));
    await p.goto('https://desk.test/desk/#today', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const sm = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, tabs: [...document.querySelectorAll('.tabs button')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.dataset.go) }));
    T('at 320px no page scrolls sideways (the top bar ran 15px over) and every bottom-bar label fits', sm.sw === sm.cw && sm.tabs.length === 0, JSON.stringify(sm));
    await ctx.close();

    /* ── the card refresh: both copies on open, then one copy a turn every 2 minutes ── */
    ({ ctx, p, errs } = await page(b, PHONE, { clock: 'install' })); counts.site = counts.raw = 0;
    await p.goto('https://desk.test/desk/#today', { waitUntil: 'load' }); await p.clock.runFor(6000); await p.waitForTimeout(300);
    const c0 = { ...counts }; T('opening the app reads both copies of the card', c0.site >= 1 && c0.raw >= 1, JSON.stringify(c0));
    counts.site = counts.raw = 0; await p.clock.runFor(120500); await p.waitForTimeout(300); const c1 = { ...counts };
    counts.site = counts.raw = 0; await p.clock.runFor(120500); await p.waitForTimeout(300); const c2 = { ...counts };
    T('the 2-minute refresh reads one copy, and the next one the other (it pulled both, ~340 KB, every time)', c1.site + c1.raw === 1 && c2.site + c2.raw === 1 && c1.site !== c2.site, JSON.stringify([c1, c2]));
    await ctx.close();

    /* ── a card too big to save is dropped, not left days old for the next open ── */
    ({ ctx, p, errs } = await page(b, PHONE, { full: 'feed' }));
    await p.goto('https://desk.test/desk/#today', { waitUntil: 'load' }); await p.waitForTimeout(3000);
    T('a card that won\'t fit in storage takes the stale saved one with it', await p.evaluate(() => localStorage.getItem('tdp.feed') === null));
    T('…and the page still shows today\'s card (59–41)', /59–41/.test(await p.evaluate(() => document.querySelector('#v-today').innerText)));
    await ctx.close();
  } catch (e) { T('test ran', false, e.stack); }
  await b.close();
  /* ── the publishers: compact JSON (2.6 MB → 1.5 MB on a full board; same data) ── */
  const src = f => fs.readFileSync(path.join(W, f), 'utf8');
  T('the phone publishes the card compact (deskPublishPage and publishPicks)', !/ghPut\('public\/picks\.json',JSON\.stringify\(F,null,1\)/.test(src('desk-core.js')) && /const txt=JSON\.stringify\(F\);/.test(src('shared.js')) && !/JSON\.stringify\(F,null,1\)/.test(src('shared.js')));
  T('…and so does the autopilot\'s update', /sitePut\(p\.site, JSON\.stringify\(V\), deps\)/.test(src('autopilot/worker.mjs')));
  console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
