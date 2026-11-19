/* v3.3 · the public app's growth pieces (Nov 19, the playbook): ?src= kept from the first tagged visit and sent with the sign-up,
   the Open Scoreboard (#u=<name>: a member's public record with lock times), leaderboard names that open records, the member's own
   switches, and Admin's sources + Verify capper. Real browser (Playwright), the repo's own files, an invented server, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 400))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const now = Date.now(), day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(now));
const FEED = { v: 4, beta: false, brand: 'TheDesk', generated: now, record: { w: 1, l: 0, pu: 0, u: 0.9, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30, today: { d: day, picks: [], props: [] } };
const SLATE = { v: 1, ts: now, tz: 'America/Chicago', days: [{ d: day, more: 0, games: [] }] };
const leg = (pick, t, res, extra) => ({ sp: 'nfl', game: 'BUF@MIA', pick, price: -110, t, res, ...(extra || {}) });
const PROFILES = {
  bigshot: { name: 'BigShot', since: now - 40 * 864e5, cap: true, rank: 'Sharp', xp: 2140, trophies: {}, earned: 412.5, w: 9, l: 3, p: 1, roi: 18.4,
    settled: [{ ts: now - 2 * 864e5, status: 'won', stake: 50, dec: 1.909, back: 95.45, mode: 'parlay', ctx: 'wallet', legs: [leg('BUF -3.5', now - 2 * 864e5 + (2 * 60 + 14) * 60e3, 'hit')] },
      { ts: now - 864e5, status: 'lost', stake: 20, dec: 3.6, back: 0, mode: 'parlay', ctx: 'league', legs: [leg('MIA +3.5', now - 864e5 + 45 * 60e3, 'miss'), leg('<img src=x onerror="window.__xss=1">', now - 864e5 + 50 * 60e3, 'hit')] }],
    open: null, openHidden: true },
  quiet: { name: 'Quiet', since: now - 10 * 864e5, cap: false, rank: 'Rookie', xp: 0, trophies: {}, earned: 0, w: 1, l: 1, p: 0, roi: -4.2, private: true } };
(async () => {
  const b = await pw.chromium.launch();
  async function visit({ url, init, onPost, acct } = {}) {
    const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message))); const posts = [], gets = [];
    await p.addInitScript(([acctJ, initJ]) => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); if (acctJ) localStorage.setItem('tdp.acct', acctJ); if (initJ) for (const [k, v] of Object.entries(JSON.parse(initJ))) localStorage.setItem(k, v); } catch (e) { } }, [acct ? JSON.stringify(acct) : '', init ? JSON.stringify(init) : '']);
    await p.route('**/*', r => { const u = new URL(r.request().url()), req = r.request();
      if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(FEED) });
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (u.hostname === 'site.api.espn.com') return r.fulfill({ contentType: 'application/json', body: '{"events":[]}' });
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') { const body = req.method() === 'POST' ? JSON.parse(req.postData() || '{}') : null; if (body) posts.push([u.pathname, body]); else gets.push(u.pathname + u.search);
        const J = (o, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
        if (onPost) { const x = onPost(u, body); if (x) return J(x[0], x[1]); }
        if (u.pathname === '/acct/u') { const P = PROFILES[(u.searchParams.get('name') || '').toLowerCase()]; return P ? J(P) : J({ error: 'no such member' }, 404); }
        if (u.pathname === '/acct/board') return J({ rows: [{ name: 'BigShot', bal: 1412, bought: 0, earned: 412.5, w: 9, l: 3, roi: 18.4, pub: true, cap: true }, { name: 'Quiet', bal: 990, bought: 0, earned: -10, w: 1, l: 1, roi: -4.2 }], n: 2 });
        return J({ rows: [], n: 0, leagues: [], by: {}, leaders: [], recent: [], xp: [] }); }
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(1000); return { p, ctx, errs, posts, gets };
  }
  /* 1 · ?src= from a bio link, kept first-touch, sent with the sign-up */
  { const V = await visit({ url: 'https://desk.test/desk/?src=TT#me', onPost: (u, body) => u.pathname === '/acct/signup' ? [{ token: 't'.repeat(32), name: body.name, exp: now + 864e5 }] : u.pathname === '/acct/me' ? [{ name: 'Newbie', wallet: { bal: 1000, bought: 0, w: 0, l: 0, p: 0 }, tickets: [], bets: [], runs: [], leagues: [], inbox: { msgs: [], unread: 0 } }] : null });
    const src = await V.p.evaluate(() => JSON.parse(localStorage.getItem('tdp.src') || 'null'));
    T('a visit from a tagged link (?src=TT) keeps the tag, lower-cased', src && src.s === 'tt', JSON.stringify(src));
    await V.p.click('[data-act="acmode"][data-v="signup"]'); await V.p.fill('form[data-form="acct"] input[name="name"]', 'Newbie'); await V.p.fill('form[data-form="acct"] input[name="pass"]', 'longenough1'); await V.p.check('form[data-form="acct"] input[name="age21"]');
    await V.p.click('form[data-form="acct"] button[type="submit"]'); await V.p.waitForTimeout(800);
    const su = V.posts.find(([u]) => u === '/acct/signup');
    T('…and the sign-up carries it to the server', su && su[1].src === 'tt' && su[1].name === 'Newbie', JSON.stringify(su));
    T('…no page errors', !V.errs.length, V.errs.join(' | ')); await V.ctx.close(); }
  { const V = await visit({ url: 'https://desk.test/desk/?src=x#today', init: { 'tdp.src': JSON.stringify({ s: 'tt', t: Date.now() - 3 * 864e5 }) } });
    const src = await V.p.evaluate(() => JSON.parse(localStorage.getItem('tdp.src') || 'null')); T('a second tagged visit within 30 days keeps the first source (first touch wins)', src.s === 'tt', JSON.stringify(src)); await V.ctx.close(); }
  { const V = await visit({ url: 'https://desk.test/desk/?src=ig#today', init: { 'tdp.src': JSON.stringify({ s: 'tt', t: Date.now() - 40 * 864e5 }) } });
    const src = await V.p.evaluate(() => JSON.parse(localStorage.getItem('tdp.src') || 'null')); T('…after 30 days, a new tagged visit takes over', src.s === 'ig', JSON.stringify(src)); await V.ctx.close(); }
  /* 2 · the Open Scoreboard */
  { const V = await visit({ url: 'https://desk.test/desk/#u=BigShot' }); const t = await V.p.evaluate(() => document.querySelector('#v-u').innerText);
    T('#u=BigShot opens his public record: name, the verified ✔, rank, record, ROI, D$ earned', /bigshot/i.test(t) && /Verified capper/i.test(t) && /Sharp/.test(t) && /9-3-1/.test(t) && /\+18\.4%/.test(t) && /D\$412\.5/.test(t), t.slice(0, 500));
    T('…every settled bet with when it was placed, how long before the first game, and when each game started', /Placed .* CT · 2h 14m before the first game/.test(t) && /Placed .* CT · 45 min before the first game/.test(t) && /started .* CT/.test(t), t.slice(0, 1400));
    T('…open bets hidden (his choice), a copy-link button, the play-money line', /Open bets stay hidden until they settle/.test(t) && (await V.p.locator('[data-act="proflink"]').count()) === 1 && /play money, never cashed out/i.test(t));
    T('…hostile strings are shown, never run', !(await V.p.evaluate(() => window.__xss)) && /<img src=x/.test(t));
    T('…the page asked the server for exactly that member', V.gets.some(g => g === '/acct/u?name=BigShot'), V.gets.join(' '));
    T('…the page title names the record', /BigShot: the record/.test(await V.p.title()), await V.p.title());
    T('…no page errors', !V.errs.length, V.errs.join(' | ')); await V.ctx.close(); }
  { const V = await visit({ url: 'https://desk.test/desk/#u=Quiet' }); const t = await V.p.evaluate(() => document.querySelector('#v-u').innerText);
    T('a private record: the totals and "This record is private", no bets', /quiet/i.test(t) && /This record is private/i.test(t) && /1-1/.test(t) && !/Placed/.test(t), t.slice(0, 400)); await V.ctx.close(); }
  { const V = await visit({ url: 'https://desk.test/desk/#u=Nobody' }); const t = await V.p.evaluate(() => document.querySelector('#v-u').innerText);
    T('no such member: says so, with a way to the leaderboard', /No member by that name/.test(t) && (await V.p.locator('#v-u [data-go="me"]').count()) === 1, t); await V.ctx.close(); }
  /* 3 · the leaderboard links public records */
  { const V = await visit({ url: 'https://desk.test/desk/#me' }); await V.p.waitForTimeout(500);
    T('the leaderboard: a public record\'s name is a link (with the ✔), a private one isn\'t', (await V.p.locator('#lb [data-act="prof"][data-name="BigShot"]').count()) === 1 && (await V.p.locator('#lb [data-act="prof"][data-name="Quiet"]').count()) === 0);
    await V.p.click('#lb [data-act="prof"][data-name="BigShot"]'); await V.p.waitForTimeout(700);
    T('…tap it: his record opens, and the address can be shared (#u=BigShot)', /#u=BigShot$/.test(V.p.url()) && /Verified capper/i.test(await V.p.evaluate(() => document.querySelector('#v-u').innerText)), V.p.url());
    await V.p.goBack(); await V.p.waitForTimeout(500); T('…and Back returns to the leaderboard', /#me$/.test(V.p.url()) && !(await V.p.evaluate(() => document.querySelector('#v-me').hidden)), V.p.url()); await V.ctx.close(); }
  /* 4 · a member's own switches */
  { let ME = { name: 'Hooper', pub: false, pubOpen: false, cap: false, wallet: { bal: 1000, bought: 0, w: 0, l: 0, p: 0 }, tickets: [], bets: [], runs: [], leagues: [], inbox: { msgs: [], unread: 0 } };
    const V = await visit({ url: 'https://desk.test/desk/#me', acct: { token: 'h'.repeat(32), name: 'Hooper', exp: now + 864e5 }, onPost: (u, body) => { if (u.pathname === '/acct/me') return [ME]; if (u.pathname === '/acct/pub') { ME = { ...ME, pub: body.on, pubOpen: body.on && body.open }; return [{ pub: ME.pub, open: ME.pubOpen }]; } return null; } });
    await V.p.waitForTimeout(500); let t = await V.p.evaluate(() => document.querySelector('#v-me').innerText);
    T('Your tickets: the public-record switches (off to start; open bets off until the record is on)', /Your public record/i.test(t) && !(await V.p.isChecked('[data-act="pubtoggle"][data-k="pub"]')) && await V.p.isDisabled('[data-act="pubtoggle"][data-k="open"]'), t.slice(0, 600));
    await V.p.click('[data-act="pubtoggle"][data-k="pub"]'); await V.p.waitForTimeout(600);
    const pp = V.posts.filter(([u]) => u === '/acct/pub');
    T('…switch it on: the server hears it, the link buttons appear, open bets can be switched on', pp.length === 1 && pp[0][1].on === true && pp[0][1].open === false && (await V.p.locator('#v-me [data-act="proflink"]').count()) === 1 && !(await V.p.isDisabled('[data-act="pubtoggle"][data-k="open"]')), JSON.stringify(pp));
    await V.p.click('[data-act="pubtoggle"][data-k="open"]'); await V.p.waitForTimeout(600);
    T('…and open bets too', V.posts.filter(([u]) => u === '/acct/pub').pop()[1].open === true && await V.p.isChecked('[data-act="pubtoggle"][data-k="open"]'));
    T('…no page errors', !V.errs.length, V.errs.join(' | ')); await V.ctx.close(); }
  /* 5 · Admin: where members came from, Verify capper */
  { const users = [{ name: 'TheDesk', owner: true, at: now - 9e8, seen: now, visits: 40, bal: 1000, bought: 0, prize: 0, w: 0, l: 0, xp: 0, rank: 'Rookie', runs: 0, lgs: 0, sus: false, note: '' },
      { name: 'BigShot', at: now - 3 * 864e5, seen: now - 36e5, visits: 12, bal: 4120, bought: 0, prize: 250, w: 9, l: 3, xp: 2140, rank: 'Sharp', runs: 2, lgs: 1, sus: false, note: '', src: 'tt', pub: false, cap: false }];
    const ST = { k: { members: 2, new1: 1, new7: 2, act1: 2, act7: 2, dd: 5120, bought: 0, prizes: 250, staked: 900, open: 4, bets: 20, settled: 16, runs: 2, runsWon: 1, lgLive: 1, lgAll: 2, unread: 0, threads: 0, sus: 0, chatDay: 14, chatTotal: 120, bans: 0, paid: null, bySrc: { tt: 5, x: 3, direct: 2 }, src7: { tt: 2 } },
      days: Array.from({ length: 14 }, (_, i) => ({ d: new Date(now - (13 - i) * 864e5).toISOString().slice(0, 10), n: i % 3, act: i % 4 + 1 })), users, cfg: { lgOpen: false, envOpen: false, store: false } };
    let capped = false;
    const V = await visit({ url: 'https://desk.test/desk/#me', acct: { token: 'x'.repeat(32), name: 'TheDesk', exp: now + 864e5 }, init: { 'tdp.adtab': '"overview"' }, onPost: (u, body) => {
      if (u.pathname === '/acct/me') return [{ name: 'TheDesk', owner: true, wallet: { bal: 1000, bought: 0, w: 0, l: 0, p: 0 }, tickets: [], bets: [], runs: [], leagues: [], inbox: { msgs: [], unread: 0 } }];
      if (u.pathname === '/acct/admin') { if (body.act === 'stats') return [ST]; if (body.act === 'cap') { capped = body.on; return [{ ok: true, cap: body.on, pub: true }]; }
        if (body.act === 'user') return [{ user: { name: body.name, at: now - 3 * 864e5, seen: now - 36e5, visits: 12, src: 'tt', pub: capped, cap: capped, wallet: { bal: 4120, bought: 0, prize: 250, w: 9, l: 3, p: 0, staked: 900 }, xp: 2140, rank: { name: 'Sharp' }, trophies: {}, xplog: [], note: '', sus: false, sessions: 1 }, bets: [], runs: [], leagues: [], inbox: [] }];
        return [{ ok: true }]; } return null; } });
    await V.p.click('[data-go="admin"].btn'); await V.p.waitForTimeout(800); let t = await V.p.evaluate(() => document.querySelector('#v-admin').innerText);
    T('Admin: where members came from (TikTok 5, +2 this week; X 3; direct 2) and how to tag links', /WHERE MEMBERS CAME FROM/i.test(t) && /TikTok\s*5 · \+2 this week/.test(t) && /X\s*3/.test(t) && /Direct or unknown\s*2/.test(t) && /\?src=/.test(t), t.slice(t.search(/where members/i), t.search(/where members/i) + 300));
    await V.p.click('.adtabs [data-v="members"]'); await V.p.waitForTimeout(400); t = await V.p.evaluate(() => document.querySelector('#v-admin').innerText);
    T('…each member row says where they came from', /from TikTok/.test(t), t.slice(0, 900));
    await V.p.click('.adtr[data-name="BigShot"]'); await V.p.waitForTimeout(700); t = await V.p.evaluate(() => document.querySelector('.adpanel').innerText);
    T('…the member panel: came from TikTok, and a Verify capper button', /came from TikTok/.test(t) && /Verify capper/.test(t), t.slice(0, 600));
    await V.p.click('[data-act="adcap"]'); await V.p.waitForTimeout(800); t = await V.p.evaluate(() => (document.querySelector('.adpanel') || {}).innerText || '');
    T('…tap it: the server verifies them, and the button flips to remove', V.posts.some(([u, bd]) => u === '/acct/admin' && bd.act === 'cap' && bd.on === true && bd.name === 'BigShot') && /Remove verified capper/.test(t), t.slice(0, 600));
    T('…no page errors', !V.errs.length, V.errs.join(' | ')); await V.ctx.close(); }
  await b.close(); console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e && e.stack || e); process.exit(1); });
