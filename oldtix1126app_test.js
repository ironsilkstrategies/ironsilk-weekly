/* v80 · Nov 26, Chris: "Those singles were from last week and just never got graded" — tracked desk picks only looked at TODAY's board. */
/* v76 · Nov 26, 12:46 PM, Chris: "the founder long shot tickets I want in my TheDesk profile as picks I made… also a tab or easier spot …
   (maybe at the top by profile and join..) we can have a “my tickets” section. With a tab for graded and a tab for active once you’ve
   clicked in it… so it leaves quick access for subscribers". Real browser at phone size, the repo's files, an invented feed and account
   server, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 700))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const AT = Date.parse('2026-11-26T19:00:00Z'), D = '2026-11-26', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z';
const fleg = (pick, st, x = {}) => ({ sp: 'nfl', game: 'PHI@DAL', pick, price: null, start: null, day: D, st, p: 0.5, q: 0.5, detail: null, prog: null, prop: true, ...x });
const FOUNDER = { rec: { cashed: 1, lost: 0 }, tix: [
  { id: 'fLive', name: 'Turkey Day Stack', date: D, dec: 41, res: 'open', legs: [fleg('S. Barkley anytime TD', 'hit'), fleg('C. Lamb 70+ Receiving yds', 'open')] },
  { id: 'fDone', name: 'Monday Heater', date: '2026-11-24', dec: 12.5, res: 'cashed', legs: [fleg('J. Allen 250+ Passing yds', 'hit', { game: 'BUF@MIA', day: '2026-11-24' }), fleg('BUF ML', 'hit', { prop: false, game: 'BUF@MIA', day: '2026-11-24' })] }] };
const feed = { v: 4, beta: true, brand: 'TheDesk', generated: AT - 20 * 60e3, record: { w: 53, l: 38, pu: 0, u: 2.3, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 5 * 36e5, unlockMin: 30, props: [], picks: [] }, characters: [], founder: FOUNDER };
const espnAsk = [];
const leg = (pick, res) => ({ src: 'own', pick, price: -110, res });
const WK = Date.parse('2026-11-19T20:00:00Z');
const MEMBER = { tickets: [{ id: 'old1', ts: WK, title: '', legs: [{ src: 'pick', sp: 'nhl', game: 'EDM@PHI', pick: 'EDM ML', price: -155, start: '', res: null }] },
  { id: 'old2', ts: WK + 864e5, title: '', legs: [{ src: 'pick', sp: 'nhl', game: 'BOS@NYR', pick: 'BOS ML', price: 120, start: '2026-11-21T00:00:00Z', res: null }] },{ id: 't1', ts: AT - 36e5, title: 'Sunday 2-leg', legs: [leg('Bills -3', 'hit'), leg('Over 221.5', null)] }, { id: 't2', ts: AT - 3 * 864e5, title: 'Old heater', legs: [leg('Lions ML', 'hit'), leg('Under 44', 'hit')] }],
  bets: [{ id: 'b1', ts: AT - 2 * 36e5, stake: 50, dec: 2.1, status: 'open', mode: 'parlay', legs: [{ sp: 'nfl', game: 'KC@BUF', pick: 'BUF ML', price: -150, t: AT + 3 * 36e5, res: null }] },
    { id: 'b2', ts: AT - 4 * 864e5, stake: 20, dec: 1.9, status: 'lost', mode: 'parlay', back: 0, legs: [{ sp: 'nba', game: 'MIN@OKC', pick: 'OKC -5.5', price: -110, t: AT - 4 * 864e5, res: 'miss' }] }] };
(async () => {
  const b = await pw.chromium.launch();
  const open = async (who, hash, w = 390) => { const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: w, height: 860 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.clock.setFixedTime(new Date(AT)); const saves = [];
    await p.addInitScript(a => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); if (a) localStorage.setItem('tdp.acct', JSON.stringify(a)); } catch (e) { } }, who ? { token: 'tok-' + who.name, name: who.name, owner: !!who.owner } : null);
    await p.route('**/*', async rq => { const u = new URL(rq.request().url());
      if (/picks\.json$/.test(u.pathname)) return rq.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) });
      if (/slate\.json$|ghost\.json$/.test(u.pathname)) return rq.fulfill({ status: 404, body: '' });
      if (u.hostname === 'site.api.espn.com') { const d = u.searchParams.get('dates'); espnAsk.push(d); const ev = (a, h, as, hs) => ({ id: '1', competitions: [{ status: { type: { state: 'post', completed: true, shortDetail: 'Final' } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] });
        return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: u.pathname.includes('hockey') && d === '20261119' ? [ev('EDM', 'PHI', 4, 2)] : u.pathname.includes('hockey') && d === '20261120' ? [ev('BOS', 'NYR', 1, 3)] : [] }) }); }
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') { const body = JSON.parse(rq.request().postData() || '{}');
        if (u.pathname === '/acct/me' && who) return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ name: who.name, owner: !!who.owner, since: AT - 30 * 864e5, wallet: { bal: 980, bought: 0, w: 1, l: 1, p: 0 }, tickets: who.owner ? [] : MEMBER.tickets, bets: who.owner ? [] : MEMBER.bets }) });
        if (u.pathname === '/acct/save') { saves.push(body.ticket); return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ ticket: body.ticket }) }); }
        if (u.pathname === '/acct/u') return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ name: 'TheDesk', since: AT - 60 * 864e5, cap: false, rank: 'Rookie', xp: 0, trophies: {}, earned: 0, w: 0, l: 0, p: 0, roi: null, private: true }) });
        return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ rows: [], n: 0 }) }); }
      if (u.hostname !== 'desk.test') return rq.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return rq.fulfill({ status: 404, body: '' });
      rq.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.goto('https://desk.test/desk/' + hash, { waitUntil: 'load' }); await p.waitForTimeout(1800); return { ctx, p, errs, saves }; };
  const txt = (p, sel) => p.evaluate(s => (document.querySelector(s) || {}).innerText || '', sel);
  try {
    const v = await open({ name: 'Chris', token: 'tok' }, '');
    await v.p.waitForTimeout(1500);
    T("last week's days were asked of ESPN (the tracked-on day, the start's day)", espnAsk.includes('20261119') && espnAsk.includes('20261120'), JSON.stringify([...new Set(espnAsk)]));
    const sv = v.saves.filter(t => t.id === 'old1' || t.id === 'old2');
    T('the grades were saved to the account: EDM ML hit (4–2), BOS ML miss (1–3)', sv.some(t => t.id === 'old1' && t.legs[0].res === 'hit') && sv.some(t => t.id === 'old2' && t.legs[0].res === 'miss'), JSON.stringify(sv));
    await v.p.click('#tixBtn'); await v.p.waitForTimeout(400);
    await v.p.evaluate(() => { const b = [...document.querySelectorAll('.tixtabs button')].find(x => /graded/i.test(x.innerText)); if (b) b.click(); }); await v.p.waitForTimeout(300);
    const t = await v.p.evaluate(() => document.querySelector('#v-tix').innerText);
    T('they show as graded: EDM ML cashed, BOS ML lost', /EDM ML/.test(t) && /BOS ML/.test(t) && /Cashed/i.test(t) && /Lost/i.test(t), t.slice(0, 900));
    T('no page errors', !v.errs.length, v.errs.join(' | '));
    await v.ctx.close();
  } catch (e) { T('no crash', false, e.stack); }
  await b.close(); console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
})();
