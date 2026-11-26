/* public app v77 · Nov 26, 12:56 PM, Chris: "Can we also incorporate a live feed scroll as well as a social box that shows us all the updates and
   box scores that are live and what people are talking about in the chat room… maybe even a way to pull big name sports analyst tweets and posts
   from all over the net". Real browser (iPhone 14), the repo's files, invented ESPN scores / news and chat in their real shapes, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 600))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const now = Date.now(), iso = t => new Date(t).toISOString().slice(0, 16) + 'Z';
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(now)), ymd = day.replace(/-/g, '');
let detScore = 10;
const ev = (id, a, as, h, hs, state, det) => ({ id, competitions: [{ competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }], status: { type: { state, completed: state === 'post', shortDetail: det }, period: 2, clock: 600 } }] });
const SB = sp => sp === 'nfl' ? { events: [ev('401873081', 'CHI', 3, 'DET', detScore, 'in', '10:52 - 2nd')] } : sp === 'nba' ? { events: [ev('401909320', 'MIN', 113, 'OKC', 106, 'post', 'Final')] } : { events: [] };
const art = (id, h, by, minsAgo, sp) => ({ id, headline: h, description: h + ' — the details.', byline: by, published: new Date(now - minsAgo * 60e3).toISOString(), links: { web: { href: `https://www.espn.com/${sp}/story/_/id/${id}` } }, premium: false });
const NEWS = { nfl: { articles: [art(1, 'Bears TE Colston Loveland ruled out vs. Lions with knee injury', 'Courtney Cronin', 4, 'nfl'), art(2, 'NFL Week 12: Highlights of Thanksgiving games', 'NFL Nation', 30, 'nfl'), { ...art(3, 'Insider-only story', 'Somebody', 2, 'nfl'), premium: true }] },
  nba: { articles: [art(4, 'Wolves edge Thunder behind Edwards’ 38', 'Tim MacMahon', 600, 'nba')] }, nhl: { articles: [art(5, 'Sabres top Rangers for fourth straight win', 'Kristen Shilton', 90, 'nhl')] } };
const CHAT = { messages: [{ id: 'm1', name: 'Hoops Fan', text: 'Gibbs is cooking today', ts: now - 6 * 60e3 }, { id: 'm2', name: 'TheDesk', owner: true, text: 'Bears ML still alive, halftime soon', ts: now - 3 * 60e3 }, { id: 'm3', name: 'Puck Head', text: '<b>Sabres</b> money line hit', ts: now - 60e3 }] };
const BOARD = { d: day, heavy: -500, cast: {}, games: [{ sp: 'nfl', game: 'CHI@DET', gl: 'CHI@DET', start: iso(now - 36e5), day, st: 'in', picks: [{ m: 'ml', sd: 'away', pick: 'CHI ML', price: -116, p: 0.56, tier: 'strong', off: true, by: [] }], calls: {} },
  { sp: 'nba', game: 'MIN@OKC', gl: 'MIN@OKC', start: iso(now - 5 * 36e5), day, st: 'post', picks: [{ m: 'ml', sd: 'home', pick: 'OKC ML', price: -200, p: 0.66, tier: 'strong', off: true, by: [] }], calls: {} }] };
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: now, record: { w: 1, l: 1, pu: 0, u: 0 }, history: [], updates: [], cashed: [], unlockMin: 30, today: { d: day, lockedAt: now - 36e5, unlockMin: 30, picks: [], props: [] }, board: BOARD, characters: [] };
const G = (sp, a, h, hr) => ({ k: `${sp}|${a}@${h}`, sp, t: now + hr * 36e5, a: { ab: a, name: a, nick: a + 's', w: 5, l: 5 }, h: { ab: h, name: h, nick: h + 's', w: 7, l: 3 }, ln: null });
const SLATE = { v: 1, ts: now, tz: 'America/Chicago', ranks: {}, days: [{ d: day, more: 0, games: [G('nfl', 'CHI', 'DET', -1), G('nba', 'MIN', 'OKC', -5), G('nhl', 'NYR', 'BUF', 3)] }] };
const NFLSUM = { header: { competitions: [{ status: { type: { state: 'in', shortDetail: '10:52 - 2nd' } }, competitors: [{ homeAway: 'away', score: '3', team: { id: '3', abbreviation: 'CHI', color: '0b1c3a' } }, { homeAway: 'home', score: '10', team: { id: '8', abbreviation: 'DET', color: '0076b6' } }] }] }, drives: { previous: [] } };
(async () => {
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
  const got = []; await p.route('**/*', rt => { const u = new URL(rt.request().url());
    if (/picks\.json$/.test(u.pathname)) return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(FEED) });
    if (/slate\.json$/.test(u.pathname)) return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
    if (u.hostname === 'site.api.espn.com') { const m = u.pathname.match(/sports\/\w+\/([\w-]+)\/(scoreboard|news|summary)/), sp = m && { nfl: 'nfl', nba: 'nba', nhl: 'nhl' }[m[1]]; got.push(m ? m[2] + ':' + m[1] : u.pathname);
      if (m && m[2] === 'news') return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(NEWS[sp] || { articles: [] }) });
      if (m && m[2] === 'summary') return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(NFLSUM) });
      return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(sp && u.searchParams.get('dates') === ymd ? SB(sp) : { events: [] }) }); }
    if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(/chat\/history/.test(u.pathname) ? CHAT : { rows: [], n: 0 }) });
    if (u.hostname !== 'desk.test') return rt.abort();
    let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return rt.fulfill({ status: 404, body: '' });
    rt.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
  await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); } catch (e) { } });
  try {
    await p.goto('https://desk.test/desk/#today', { waitUntil: 'load' }); await p.waitForTimeout(3500);
    const tk = await p.evaluate(() => [...document.querySelectorAll('#wtick .wt-c')].map(c => [c.innerText.replace(/\s+/g, ' ').trim(), c.dataset.go]));
    T('Today opens with a score ticker: 📡 Live first, the game on now, today\'s final, then how many are up next (no matchups before they start: a sealed pick could be on one)', tk.length === 4 && /📡 Live 1 on now/.test(tk[0][0]) && tk[0][1] === 'live' && /CHI 3 DET 10 ● 10:52 - 2nd/.test(tk[1][0]) && tk[1][1] === 'gc=nfl:401873081' && /MIN 113 OKC 106 Final/.test(tk[2][0]) && /Up next 1 game See the Slate/.test(tk[3][0]) && tk[3][1] === 'slate' && !/NYR|BUF/.test(JSON.stringify(tk)), JSON.stringify(tk));
    const bx = await p.evaluate(() => (document.querySelector('#wbox .wbox') || {}).innerText || '');
    T('…and a social box: what\'s on now, the latest from the chat, the newest headline', /1 game on now/.test(bx) && /CHI 3–10 DET/.test(bx) && /Puck Head in the chat/.test(bx) && /<b>Sabres<\/b> money line hit/.test(bx) && /Loveland ruled out/.test(bx), bx);
    T('…a chat message stays plain text (no HTML from a member runs)', await p.evaluate(() => !document.querySelector('#wbox b b') && !/<b>Sabres/.test(document.querySelector('#wbox').innerHTML.replace(/&lt;b&gt;Sabres/g, ''))));
    await p.click('#wtick .wt-c.in'); await p.waitForTimeout(1200);
    T('tap the live game in the ticker: its Gamecast', /#gc=nfl:401873081$/.test(p.url()) && !!(await p.$('#v-gc .gc-bug')));
    await p.click('[data-gc="back"]'); await p.waitForTimeout(800);
    T('…and back to Today', /#today$/.test(p.url()));
    await p.click('#wbox .wbox'); await p.waitForTimeout(1200);
    let lv = await p.evaluate(() => { const v = document.querySelector('#v-live'); return { url: location.hash, on: [...v.querySelectorAll('.wl-grid')][0] ? [...v.querySelectorAll('.wl-grid')][0].innerText.replace(/\s+/g, ' ') : '', more: [...v.querySelectorAll('.wl-more summary')].map(s => s.innerText), feed: [...v.querySelectorAll('.wf li')].map(l => [l.className, l.innerText.replace(/\s+/g, ' ').slice(0, 300)]) }; });
    T('the social box opens Live: the game on now (📺 Gamecast), up next and today\'s finals folded below', lv.url === '#live' && /CHIs 3 DETs 10 ● 10:52 - 2nd · 📺 Gamecast/.test(lv.on) && lv.more.some(s => /Up next · 1/.test(s)) && lv.more.some(s => /Final today · 1/.test(s)), JSON.stringify(lv).slice(0, 500));
    T('…the feed: the chat and the reporters together, newest first (insider-only stories left out)', lv.feed.length === 7 && lv.feed[0][0] === 'wf-chat' && /Puck Head/.test(lv.feed[0][1]) && lv.feed.some(x => x[0] === 'wf-news' && /Loveland ruled out/.test(x[1]) && /Courtney Cronin · ESPN/.test(x[1])) && !lv.feed.some(x => /Insider-only/.test(x[1])), JSON.stringify(lv.feed));
    T('…the desk\'s own chat posts are marked', lv.feed.some(x => /TheDesk the desk/.test(x[1])), JSON.stringify(lv.feed.map(x => x[1])));
    T('…a headline links to the story on ESPN, in a new tab', await p.evaluate(() => { const a = document.querySelector('#v-live .wf-news b a'); return !!a && /^https:\/\/www\.espn\.com\//.test(a.href) && a.target === '_blank' && /noopener/.test(a.rel); }));
    await p.click('[data-wf="chat"]'); await p.waitForTimeout(200);
    T('filters: 💬 Chat shows only the chat', (await p.$$eval('#v-live .wf li', l => l.map(x => x.className))).every(c => c === 'wf-chat') && (await p.locator('#v-live .wf li').count()) === 3);
    await p.click('[data-wf="news"]'); await p.waitForTimeout(200);
    T('…📰 Reporters only the news', (await p.$$eval('#v-live .wf li', l => l.map(x => x.className))).every(c => c === 'wf-news') && (await p.locator('#v-live .wf li').count()) === 4);
    await p.click('[data-wf="score"]'); await p.waitForTimeout(200);
    const sc0 = await p.locator('#v-live').innerText(); T('…⚡ Scores: nothing yet this visit, and it says when they come', /No scoring yet this visit/i.test(sc0), sc0.slice(-700));
    /* DET scores a touchdown: the next score refresh puts it on the feed */
    detScore = 17; await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(2500);
    lv = await p.evaluate(() => [...document.querySelectorAll('#v-live .wf li')].map(l => l.innerText.replace(/\s+/g, ' ')));
    T('a score lands while you watch: "DET scores (+7): CHI 3 · DET 17", with the clock', lv.length === 1 && /DET scores \(\+7\): CHI 3 · DET 17/.test(lv[0]) && /10:52 - 2nd/.test(lv[0]), JSON.stringify(lv));
    T('…the game card moves with it', /DETs 17/.test(await p.locator('#v-live .wl-grid').first().innerText().then(s => s.replace(/\s+/g, ' '))));
    await p.click('[data-wf="all"]'); await p.goto('https://desk.test/desk/#live'); await p.waitForTimeout(2000);
    T('the scoring you saw stays on the feed for the visit (it survives a reload)', /DET scores \(\+7\)/.test(await p.locator('#v-live .wf').innerText()));
    T('no page errors', errs.length === 0, errs.join(' | '));
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
