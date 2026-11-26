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
const leg = (pick, res) => ({ src: 'own', pick, price: -110, res });
const MEMBER = { tickets: [{ id: 't1', ts: AT - 36e5, title: 'Sunday 2-leg', legs: [leg('Bills -3', 'hit'), leg('Over 221.5', null)] }, { id: 't2', ts: AT - 3 * 864e5, title: 'Old heater', legs: [leg('Lions ML', 'hit'), leg('Under 44', 'hit')] }],
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
      if (u.hostname === 'site.api.espn.com') return rq.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [] }) });
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
    /* signed out */
    let { ctx, p, errs } = await open(null, '#today');
    const hb = await p.evaluate(() => { const t = document.querySelector('#tixBtn'), j = document.querySelector('.joinpill'), a = document.querySelector('#acctBtn'); const r = x => x && x.getBoundingClientRect();
      return { vis: !!t && r(t).width > 0, order: t && j && a ? r(j).left < r(t).left && r(t).left < r(a).left : false, badge: t && !t.querySelector('.tx-n').hidden, fits: document.documentElement.scrollWidth <= innerWidth }; });
    T('the top bar has a My tickets button between Join and your profile, on a phone, with no sideways scroll', hb.vis && hb.order && !hb.badge && hb.fits, JSON.stringify(hb));
    await p.click('#tixBtn'); await p.waitForTimeout(300);
    T('signed out: My tickets says what it is and offers sign-in', /#tix$/.test(p.url()) && /MY TICKETS/i.test(await txt(p, '#v-tix')) && /Active[^]*Graded/.test(await txt(p, '#v-tix')) && (await p.locator('#v-tix [data-go="me"]').count()) === 1, await txt(p, '#v-tix'));
    T('no page errors (signed out)', errs.length === 0, errs.join(' | ')); await ctx.close();
    /* a member */
    let s; ({ ctx, p, errs, saves: s } = await open({ name: 'Puck Head' }, '#today'));
    T('signed in: the ticket button shows how many are still active (an open ticket + an open D$ bet = 2)', (await p.evaluate(() => { const n = document.querySelector('#tixBtn .tx-n'); return !n.hidden && n.textContent; })) === '2');
    await p.click('#tixBtn'); await p.waitForTimeout(300);
    let a = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('.tixtabs button')].map(b => b.innerText.replace(/\s+/g, ' ').trim() + (b.classList.contains('on') ? '*' : '')), h: [...document.querySelectorAll('#tixList .tix-h')].map(h => h.innerText.replace(/\s+/g, ' ')), t: document.querySelector('#tixList').innerText, cur: document.querySelector('#tixBtn').getAttribute('aria-current') }));
    T('Active tab first: the tickets you track and your D$ bets still playing', JSON.stringify(a.tabs) === JSON.stringify(['Active 2*', 'Graded 2']) && a.h.join('|').toLowerCase() === 'tickets you track 1|your d$ bets 1' && /Sunday 2-leg/i.test(a.t) && /Bills ML|BUF ML/.test(a.t) && !/Old heater/i.test(a.t) && a.cur === 'page', JSON.stringify(a));
    await p.click('.tixtabs [data-v="graded"]'); await p.waitForTimeout(200);
    a = await p.evaluate(() => ({ t: document.querySelector('#tixList').innerText, sum: (document.querySelector('.tix-sum') || {}).innerText || '', form: !!document.querySelector('#v-tix .newtk') }));
    T('Graded tab: what settled, with the tally (1 cashed · 1 lost)', /Old heater/i.test(a.t) && /Thunder −5\.5|OKC -5\.5/.test(a.t) && !/Sunday 2-leg/i.test(a.t) && /1 cashed · 1 lost · 50% cashed/.test(a.sum) && !a.form, JSON.stringify(a));
    await p.goto('https://desk.test/desk/#tix'); await p.waitForTimeout(1500);
    T('…the tab you left it on is the one it opens on', (await p.evaluate(() => document.querySelector('.tixtabs .on').dataset.v)) === 'graded');
    await p.click('.tixtabs [data-v="active"]'); await p.waitForTimeout(200);
    await p.click('#v-tix .newtk summary'); await p.fill('#v-tix form[data-form="newtk"] textarea', 'Lions ML -150\nOver 47.5 -110'); await p.fill('#v-tix form[data-form="newtk"] input[name="title"]', 'Night cap');
    await p.click('#v-tix form[data-form="newtk"] button[type="submit"]'); await p.waitForTimeout(500);
    T('＋ New ticket on the Active tab tracks it and shows it right there', s.length === 1 && s[0].legs.length === 2 && /Night cap/i.test(await txt(p, '#tixList')) && /#tix$/.test(p.url()), JSON.stringify(s));
    await p.click('#acctBtn'); await p.waitForTimeout(400);
    a = await p.evaluate(() => ({ t: document.querySelector('#v-me').innerText, list: document.querySelectorAll('#v-me .mytk').length, go: (document.querySelector('#v-me .tixgo') || {}).innerText || '' }));
    T('your profile button: Your account (wallet, record, leaderboard) with one link into My tickets — the tickets aren\'t listed twice', /YOUR ACCOUNT/i.test(a.t) && a.list === 0 && /My tickets/i.test(a.go) && /active · \d+ graded/.test(a.go), JSON.stringify(a));
    await p.click('#v-me .tixgo'); await p.waitForTimeout(300);
    T('…and it opens My tickets', /#tix$/.test(p.url()) && !(await p.evaluate(() => document.querySelector('#v-tix').hidden)));
    T('no page errors (member)', errs.length === 0, errs.join(' | ')); await ctx.close();
    /* the owner: the founder's LongShots are his own picks */
    ({ ctx, p, errs } = await open({ name: 'TheDesk', owner: true }, '#tix'));
    a = await p.evaluate(() => ({ h: [...document.querySelectorAll('#tixList .tix-h')].map(h => h.innerText.replace(/\s+/g, ' ')), t: document.querySelector('#tixList').innerText, n: document.querySelector('#tixBtn .tx-n').textContent }));
    T('the owner\'s My tickets: the founder\'s live LongShot under "Your LongShot picks" (Active), counted on the button', a.h.join('|').toLowerCase() === 'your longshot picks 1' && /Turkey Day Stack/i.test(a.t) && !/Monday Heater/i.test(a.t) && a.n === '1', JSON.stringify(a));
    await p.click('.tixtabs [data-v="graded"]'); await p.waitForTimeout(200);
    T('…and the cashed one under Graded', /Monday Heater/i.test(await txt(p, '#tixList')) && /1 cashed · 0 lost/.test(await txt(p, '#tixList')), await txt(p, '#tixList'));
    await p.goto('https://desk.test/desk/#u=TheDesk'); await p.waitForTimeout(1500);
    a = await p.evaluate(() => ({ t: document.querySelector('#v-u').innerText }));
    T('the founder\'s public record page shows his LongShot picks (even with his D$ record private)', /FOUNDER LONGSHOT PICKS/i.test(a.t) && /Turkey Day Stack/i.test(a.t) && /Monday Heater/i.test(a.t), a.t.slice(0, 600));
    T('no page errors (owner)', errs.length === 0, errs.join(' | ')); await ctx.close();
    /* a wide screen: the button carries its label */
    ({ ctx, p, errs } = await open({ name: 'Puck Head' }, '#today', 1200));
    T('on a wide screen the button reads "My tickets"', /My tickets/.test(await p.evaluate(() => document.querySelector('#tixBtn').innerText)));
    await ctx.close();
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
