/* v87 / machine v3.5.38 · AFTER THE BETA. Nov 27, Chris: "fully test the site while also getting ready to cut off the beta phase".
   A walk through every tab with the beta switched off found three rooms that went blank or said the wrong thing: the Cast ("the
   roster shows up here once the desk publishes it": the roster only rode with the VIP blocks), Props ("props post when the desk
   publishes today's card", which after the beta never happens) and LongShots ("no LongShot ticket up yet today"). Now the machine
   keeps the roster public with today's calls sealed, the app says plainly what's for members and how to get in, and every sealed
   pick has a way in on the card itself. The app shows whatever the feed carries: what goes public is decided in one place. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const { JSDOM } = require('jsdom');
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 400))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const now = Date.now(), iso = t => new Date(t).toISOString().slice(0, 16) + 'Z';
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(now));
const P = [{ sp: 'nba', game: 'DET@WSH', pick: 'DET -9.5', price: -110, p: 0.724, start: iso(now + 3 * 36e5) }, { sp: 'nfl', game: 'WSH@NYG', pick: 'Under 40.5', price: -108, p: 0.711, start: iso(now + 4 * 36e5) }];
const hide = x => ({ hidden: true, sp: x.sp, start: x.start, unlockAt: Date.parse(x.start) - 30 * 60e3 });
const FEED = { v: 4, beta: false, brand: 'TheDesk', price: '$50/mo', handle: 'Tester', subscribe: 'https://whop.com/ironsilkweekly/thedesk-vip', social: { tg: 'https://t.me/TheDeskApp' },
  record: { w: 38, l: 27, pu: 0, u: 1.24, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30, generated: now,
  today: { d: day, lockedAt: now - 2 * 36e5, unlockMin: 30, picks: P.map(hide), props: [] },
  characters: [{ v: 'Scout', name: 'The Scout', chip: 'SCOUT', color: '#fb7185', title: 'The Talent Hunter', bio: 'The Scout watches players, not teams.', record: { w: 41, l: 30, pu: 1, u: 6.2 }, props: { w: 12, l: 4 },
    best: [{ lane: 'College football unders', w: 37, l: 15, u: 19 }], lanes: [], par: null,
    picks: [{ hidden: true, kind: 'game', sp: 'nfl', start: P[1].start, unlockAt: Date.parse(P[1].start) - 30 * 60e3 }, { hidden: true, kind: 'prop', sp: 'nba', start: '', unlockAt: null },
      { kind: 'game', sp: 'nba', game: 'BOS@MIA', gl: 'Celtics at Heat', pick: 'MIA +4.5', price: -110, p: 0.7, start: iso(now - 36e5), hit: true, push: false, note: 'graded already' }],
    recent: [{ d: '2026-11-26', kind: 'game', sp: 'ncaaf', pick: 'Under 51.5', price: -110, gl: 'Army at Navy', r: 'win' }], teams: [{ sp: 'nfl', team: 'NYG', ml: [3, 1, 0, 2], ats: [2, 2, 1, 0], ou: [1, 3, 0, 0] }], players: [] }] };
(async () => {
  const b = await pw.chromium.launch();
  async function visit(feed, tab) { const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
    await p.route('**/*', r => { const u = new URL(r.request().url());
      if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) });
      if (/slate\.json$|ghost\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: '{"days":[]}' });
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); } catch (e) { } });
    await p.goto('https://desk.test/desk/#' + tab, { waitUntil: 'load' }); await p.waitForTimeout(1800);
    const txt = await p.evaluate(t => (document.querySelector('#v-' + t) || document.body).innerText.replace(/\s+/g, ' '), tab); return { p, ctx, txt, errs }; }
  try {
    let v = await visit(FEED, 'today');
    T('Today, after the beta: each sealed pick has a way in on the card ("Get it now" → the plans)', (await v.p.locator('#v-today .slip.locked .getnow[data-go="join"]').count()) === 2 && /Get it now/.test(v.txt), v.txt.slice(0, 300));
    T('…and the pick itself never shows', !/DET -9\.5|Under 40\.5/.test(v.txt)); await v.ctx.close();
    v = await visit(FEED, 'cast');
    T('the Cast stays up after the beta: the roster, the record, the lanes', /The Scout/.test(v.txt) && !/roster shows up here/.test(v.txt), v.txt.slice(0, 300));
    await v.p.evaluate(() => { const b = [...document.querySelectorAll('#v-cast [data-act="castpick"]')].find(x => x.dataset.v === 'Scout'); if (b) b.click(); }); await v.p.waitForTimeout(600);
    const prof = await v.p.evaluate(() => document.querySelector('#v-cast').innerText.replace(/\s+/g, ' '));
    T('…its page: today\'s calls are sealed rows (opens at a time, or members only until graded for a prop), the graded one shows', /Sealed pick/.test(prof) && /opens /.test(prof) && /Sealed prop/.test(prof) && /members only until it’s graded/.test(prof) && /Heat \+4\.5/.test(prof), prof.slice(prof.indexOf('TODAY'), prof.indexOf('TODAY') + 700));
    T('…no page errors', !v.errs.length, v.errs.join(' | ')); await v.ctx.close();
    v = await visit(FEED, 'props');
    T('Props after the beta says what\'s for members and how to get in (not "props post when the desk publishes")', /Today’s prop board is for members/i.test(v.txt) && !/Props post when the desk publishes/.test(v.txt) && (await v.p.locator('#v-props .vipgate a[href*="whop.com"]').count()) === 1, v.txt.slice(0, 400));
    await v.ctx.close();
    v = await visit(FEED, 'longshots');
    T('LongShots after the beta: the same, plainly', /The founder’s LongShots are for members now/i.test(v.txt) && !/No LongShot ticket up yet today/.test(v.txt), v.txt.slice(0, 400)); await v.ctx.close();
    /* the machine decides: a feed that carries the founder's tickets after the beta shows them */
    const F2 = { ...FEED, founder: { rec: { hits: 2 }, tix: [{ id: 't1', name: 'Saturday LongShot', dec: 41, res: 'open', legs: [{ sp: 'nba', game: 'BOS@MIA', pick: 'MIA ML', price: 150, st: 'pending', start: iso(now + 5 * 36e5) }] }] } };
    v = await visit(F2, 'longshots');
    T('…but if the desk keeps publishing the founder\'s tickets after the beta, they show (one gate, in the machine)', /Saturday LongShot/i.test(v.txt) && !/for members now/i.test(v.txt), v.txt.slice(0, 300)); await v.ctx.close();
  } catch (e) { T('harness', false, e.stack); }
  await b.close();

  /* the machine: after the beta the feed carries the roster, today's calls sealed, no "on today's card" team marks */
  const html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8').replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
  const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(w) { w.__NO_GRADELOOP__ = true; w.__NO_BACKFILL__ = true; w.__NO_REOPEN__ = true; w.__NO_SYNC_LOOP__ = true;
    w.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); w.scrollTo = () => { }; w.alert = () => { }; w.confirm = () => true; w.localStorage.setItem('d4.setupDone', '1'); } }).window;
  await new Promise(r => setTimeout(r, 2500));
  try {
    const C = [{ v: 'Scout', name: 'The Scout', record: { w: 1, l: 0 }, picks: [{ kind: 'game', sp: 'nba', game: 'A@B', pick: 'B -3', price: -110, start: new Date(Date.now() + 3 * 36e5).toISOString(), hit: null, push: false },
      { kind: 'game', sp: 'nba', game: 'C@D', pick: 'D ML', price: -150, start: new Date(Date.now() + 10 * 60e3).toISOString(), hit: null, push: false }, { kind: 'prop', sp: 'nba', pick: 'X 20+ points', hit: null, push: false },
      { kind: 'game', sp: 'nba', game: 'E@F', pick: 'F ML', price: -120, start: new Date(Date.now() - 4 * 36e5).toISOString(), hit: true, push: false }],
      teams: [{ sp: 'nba', team: 'B', now: true, ml: [1, 0, 0, 0], ats: [0, 0, 0, 0], ou: [0, 0, 0, 0] }, { sp: 'nba', team: 'Z', ml: [5, 2, 1, 1], ats: [3, 3, 0, 0], ou: [2, 2, 0, 0] }] }];
    w.__C = JSON.stringify(C);
    const S = JSON.parse(w.eval(`JSON.stringify(pubCharSealed(JSON.parse(window.__C),false,Date.now()))`))[0];
    T('the machine seals a call more than 30 minutes out (no pick, no game, no price: its sport, its start, when it opens)', S.picks[0].hidden === true && !('pick' in S.picks[0]) && !('game' in S.picks[0]) && !('price' in S.picks[0]) && S.picks[0].unlockAt > Date.now(), JSON.stringify(S.picks[0]));
    T('…opens one inside 30 minutes, keeps a graded one, seals a prop until it\'s graded', !S.picks[1].hidden && S.picks[1].pick === 'D ML' && S.picks[2].hidden === true && S.picks[2].kind === 'prop' && S.picks[3].pick === 'F ML');
    T('…and its team rows don\'t point at today\'s games (no "on today\'s card" mark, ordered by sample)', S.teams.every(t => !('now' in t)) && S.teams[0].team === 'Z', JSON.stringify(S.teams));
    const Sf = JSON.parse(w.eval(`JSON.stringify(pubCharSealed(JSON.parse(window.__C),true,Date.now()))`))[0];
    T('…the private copy (full) is untouched', Sf.picks[0].pick === 'B -3');
    w.eval(`set('d4.pubbeta',false)`); const G = JSON.parse(w.eval('JSON.stringify(publicFeedCore(false))'));
    T('after the beta the public feed carries the roster (sealed) and its own signature, still no board, founder, props or VIP blocks', G.beta === false && Array.isArray(G.characters) && typeof G.pbSig === 'string' && G.board === undefined && G.founder === undefined && G.props === undefined && G.vip === undefined, Object.keys(G).join(','));
    T('…and the publish signature follows the roster after the beta', /F\.beta\?F\.betaSig:\(F\.pbSig\|\|''\)/.test(fs.readFileSync(path.join(W, 'desk-core.js'), 'utf8')));
  } catch (e) { T('machine', false, e.stack); }
  console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
})();
