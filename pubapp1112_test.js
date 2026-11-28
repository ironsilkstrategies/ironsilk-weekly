/* v3.0 · the public app (/desk/): a separate, read-only app for the public. It shows what the desk publishes — the Best 3
   (each sealed until 30 minutes before its game), every graded result, the day's slate — and nothing else. No engine code,
   no keys, no settings. Real browser (Playwright), the repo's own files served from disk, invented feeds, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 300))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const now = Date.now(), iso = t => new Date(t).toISOString().slice(0, 16) + 'Z';
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(now));
const P = [
  { sp: 'nba', game: 'DET@WSH', pick: 'DET -9.5', price: -110, p: 0.724, start: iso(now + 20 * 60e3), tier: 'SUPREME', hit: null, push: false, why: { read: { who: 'The Coach', take: 'Washington has lost five straight.', text: 'Washington has lost five straight. Detroit defends.\nThe Pistons travel well.' } } },
  { sp: 'nfl', game: 'WSH@NYG', pick: 'Under 40.5', price: -108, p: 0.711, start: iso(now + 3 * 36e5), tier: 'UNANIMOUS', hit: null, push: false },
  { sp: 'nhl', game: 'PIT@SJ', pick: 'SJ +1.5', price: -193, p: 0.702, start: iso(now + 6 * 36e5), tier: 'STRONG', hit: null, push: false }];
const un = x => Date.parse(x.start) - 30 * 60e3, hide = x => ({ hidden: true, sp: x.sp, start: x.start, unlockAt: un(x) }), open = x => ({ ...x, unlockAt: un(x) });
const hist = [{ d: '2026-11-10', picks: [{ sp: 'nba', game: 'CLE@NY', pick: 'NY ML', price: -160, p: 0.73, hit: false, push: false }, { sp: 'nhl', game: 'PIT@SJ', pick: 'SJ +1.5', price: -193, p: 0.66, hit: true, push: false }] },
  { d: '2026-11-09', picks: [{ sp: 'nfl', game: 'BUF@MIN', pick: 'Under 44.5', price: -110, p: 0.7, hit: true, push: false }] }];
const base = { v: 4, beta: false, brand: 'TheDesk', price: '$25/mo · $10/wk', social: { fb: 'https://www.facebook.com/share/1FCDFdUvRp/', tg: 'https://t.me/TheDeskApp' }, handle: 'Tester', subscribe: 'https://whop.com/ironsilkweekly/thedesk-vip',
  record: { w: 38, l: 27, pu: 0, u: 1.24, first: '2026-10-06' }, parlay: null, updates: [], cashed: [], history: hist, unlockMin: 30 };
const today = picks => ({ d: day, lockedAt: now - 2 * 36e5, unlockMin: 30, picks, props: [] });
const FEEDS = {
  locked: { ...base, generated: now, today: today(P.map(hide)) },
  morning: { ...base, generated: now, today: today([open(P[0]), hide(P[1]), hide(P[2])]) },
  final: { ...base, generated: now, today: today([open({ ...P[0], hit: true }), open({ ...P[1], hit: true }), open({ ...P[2], hit: false })]) },
  /* a broken publisher: "hidden" entries that still carry the pick. The app must not show any of it. */
  leaky: { ...base, generated: now, today: today(P.map(x => ({ ...x, hidden: true, unlockAt: un(x) }))) },
  /* hostile strings everywhere a string can ride */
  evil: { ...base, generated: now, handle: '<img src=x onerror="window.__xss=1">', subscribe: 'javascript:window.__xss=2', price: '<b onmouseover="window.__xss=3">$1</b>',
    updates: [{ ts: now, text: '<script>window.__xss=4</script><img src=x onerror="window.__xss=5">' }],
    today: today([open({ ...P[0], pick: '<img src=x onerror="window.__xss=6">', why: { read: { who: '<i onclick="window.__xss=7">x</i>', take: '"><svg onload="window.__xss=8">', text: '<iframe srcdoc="<script>parent.__xss=9</script>">' } } })]) },
  stale: { ...base, generated: now - 864e5, today: { d: '2026-11-10', lockedAt: now - 30 * 36e5, unlockMin: 30, picks: hist[0].picks, props: [] } },
};
/* v3.3 · the open beta: the whole card at lock, every character's say, the roster, the bloodlines, the plans */
const call = (who, v, w, p, note, official) => ({ who, v, with: w, pick: w ? 'DET -9.5' : 'WSH +9.5', p, official: !!official, note });
const CALLS = [call('The Coach', 'Coach', true, 0.74, 'rest edge · opponent on a back-to-back', true), call('The Scout', 'Scout', true, 0.71, 'talent edge'), call('The Historian', 'Trends', false, 0.58, 'head-to-head edge')];
const PLANS = [{ id: 'month', name: 'Monthly', price: 50, per: 'month', note: 'Everything, every day' }, { id: 'year', name: 'Yearly', price: 300, per: 'year', note: 'Everything, plus the VIP lounge', best: true },
  { id: 'league', name: 'League pass', price: 100, per: 'league, per season', note: 'One league, all season' }, { id: 'pass', name: '2-day pass', price: 20, per: '2 days', note: '48 hours' }, { id: 'single', name: 'Single pick', price: 2, per: 'pick', note: 'One pick' }];
const leg = (sp, game, pick, price, p, x = {}) => ({ sp, game, gl: game.replace('@', ' at '), pick, price, p, start: iso(now + 4 * 36e5), hit: null, push: false, by: [], voices: [], ...x });
const BETA = { ...base, generated: now, beta: true, plans: PLANS,
  today: today(P.map(x => ({ ...open(x), calls: x === P[0] ? CALLS : undefined }))),
  vip: { top10: [leg('nba', 'DAL@MIN', 'MIN -5.5', -110, 0.72, { voices: CALLS }), leg('nhl', 'SEA@COL', 'COL ML', -1500, 0.92)], banker: { price: '+264', p: 0.31, legs: [leg('nhl', 'BUF@CHI', 'BUF ML', -140, 0.66), leg('nba', 'CHA@PHX', 'PHX -6.5', -110, 0.7)] },
    parlays: [{ who: 'The Scout', v: 'Scout', skill: false, px: false, price: '+310', p: 0.29, legs: [leg('nfl', 'WSH@NYG', 'NYG ML', -130, 0.71, { by: ['The Scout'] }), leg('nhl', 'NYR@DAL', 'DAL ML', -125, 0.7, { by: ['The Scout'] })] }],
    props: [{ who: 'The Scorekeeper', v: 'Most common', sp: 'nba', pick: 'Anthony Edwards 30+ points', price: -115, p: 0.71, star: true }] },
  characters: [{ v: 'Scout', name: 'The Scout', chip: '🔭 SCOUT', color: '#fb7185', title: 'The Talent Hunter', bio: 'The Scout watches players, not teams.', origin: 'Spent years on the road in empty gyms.', best: [{ lane: 'NHL favorites on the spread', w: 17, l: 13, u: 13.3 }], still: [{ lane: 'College football favorites on the spread', w: 21, l: 20 }], record: { w: 41, l: 30, pu: 1, u: 6.4 }, props: { w: 12, l: 5 },
      par: { game: { w: 2, l: 5, p: 1, u: -1.4, lw: 11, ll: 7 }, suit: { w: 1, l: 0, p: 0, u: 2.1, lw: 3, ll: 0 }, props: { w: 0, l: 2, p: 0, u: -2, lw: 3, ll: 2 }, last: [{ d: '2026-11-22', k: 'game', r: 'win', n: 2, hit: 2, price: 264 }, { d: '2026-11-21', k: 'props', r: 'loss', n: 3, hit: 2, price: 595 }, { d: '2026-11-20', k: '<img src=x onerror=alert(1)>', r: 'win', n: 1, hit: 1, price: 100 }] },
      picks: [{ kind: 'game', sp: 'nfl', game: 'WSH@NYG', gl: 'Commanders at Giants', pick: 'NYG ML', price: -130, p: 0.71, start: iso(now + 3 * 36e5), hit: null, push: false, note: 'talent edge · QB star' }, { kind: 'prop', sp: 'nba', pick: 'Anthony Edwards under 39.5 PTS+REB+AST', team: 'MIN', side: 'under', p: 0.72, hit: null, push: false, note: '3-1 on him before' }],
      recent: [{ d: '2026-11-11', kind: 'game', sp: 'nhl', pick: 'SJ +1.5', price: -193, gl: 'Penguins at Sharks', r: 'loss' }], teams: [{ sp: 'nhl', team: 'MIN', for: { w: 6, l: 2 }, vs: { w: 1, l: 1 } }], players: [{ sp: 'nba', player: 'Anthony Edwards', team: 'MIN', over: { w: 4, l: 1 }, under: { w: 2, l: 0 } }] },
    { v: 'Coach', name: 'The Coach', chip: 'COACH', color: 'red;background:url(javascript:alert(1))', title: 'The Sideline General', bio: 'Twenty seasons of road trips.', record: { w: 0, l: 0, pu: 0, u: 0 }, props: { w: 0, l: 0 }, picks: [] }],
  bloodlines: { need: { n: 100, days: 10 }, cells: [{ who: 'The Scout', v: 'Scout', m: 'ml', gen: 2, champ: 'the worldview', heirs: 2, retired: 1, best: { lab: 'how fast it learns: 0.04 → 0.08', n: 80, days: 12, z: 1.2, bar: 1.75 }, hist: [{ gen: 1, lab: 'the original confidence', to: '2026-11-10', why: 'retired' }] }] } };
/* v3.0.3 · the board: colored picks per game, every character's call, and who has the say */
const r = (lab, rk, of, w, l, u, say = '') => ({ lab, rk, of, w, l, u, say });
BETA.board = { d: day, heavy: -500, cast: { Coach: { name: 'The Coach', color: '#3DDC84' }, Scout: { name: 'The Scout', color: '#22D3EE' }, Trends: { name: 'The Historian', color: 'red;x:url(javascript:1)' } },
  games: [{ sp: 'nfl', game: 'WSH@NYG', gl: 'WSH@NYG', start: iso(now + 3 * 36e5), day, st: 'pre',
    picks: [{ m: 'total', sd: 'under', pick: 'Under 40.5', price: -108, p: 0.71, tier: 'supreme', unan: false, off: true, by: ['Coach', 'Scout'] }, { m: 'ml', sd: 'home', pick: 'NYG ML', price: -142, p: 0.64, tier: 'strong', unan: true, off: false, by: ['Coach'] }, { m: 'ml', sd: 'away', pick: 'WSH ML', price: -1200, p: 0.91, tier: 'supreme', unan: true, off: true, by: ['Scout'] }],
    calls: { ml: [{ v: 'Scout', s: 'home', pick: 'NYG ML', price: -1100, p: 0.9, o: 1, r: null }], total: [{ v: 'Coach', s: 'under', pick: 'Under 40.5', price: -108, p: 0.74, o: 1, r: r('NFL unders', 1, 9, 30, 12, 14.2, 'top') }, { v: 'Scout', s: 'under', pick: 'Under 40.5', price: -108, p: 0.66, o: 0, r: r('NFL unders', 4, 9, 18, 16, -0.4) },
      { v: 'Trends', s: 'over', pick: 'Over 40.5', price: -112, p: 0.58, o: 0, r: r('NFL overs', 9, 9, 10, 22, -13.1, 'worst') }], } },
    { sp: 'nba', game: 'DAL@MIN', gl: 'DAL@MIN', start: iso(now + 5 * 36e5), day, st: 'pre', picks: [{ m: 'spread', sd: 'home', pick: 'MIN -5.5', price: -110, p: 0.62, tier: 'strong', unan: false, off: false, by: ['Scout'] }], calls: { spread: [{ v: 'Scout', s: 'home', pick: 'MIN -5.5', price: -110, p: 0.62, o: 0, r: null }] } }] };
/* v3.0.16 · Founder Parlays: the founder's tickets, live, to tail */
BETA.founder = { rec: { hits: 3 }, tix: [
  { id: 'fx1', date: day, dec: 12.5, res: 'live', hit: 1, n: 3, legs: [{ sp: 'nfl', game: 'WSH@NYG', pick: 'NYG ML', price: -142, start: iso(now - 36e5), day, st: 'hit', detail: 'WSH 10–24 NYG' },
    { sp: 'nba', game: 'DAL@MIN', pick: 'MIN -5.5', price: -110, start: iso(now + 5 * 36e5), day, st: 'open' }, { sp: 'nba', game: 'DAL@MIN', pick: 'A. Edwards 25+ points', start: iso(now + 5 * 36e5), day, st: 'live', prog: { v: 18, t: 25, d: 'atleast' }, detail: 'A. Edwards 18' }] },
  { id: 'fx2', date: day, dec: 3.1, res: 'lost', hit: 0, n: 2, legs: [{ sp: 'nfl', game: 'WSH@NYG', pick: 'WSH +9.5', price: -110, day, st: 'miss', detail: 'WSH 10–24 NYG' }, { sp: 'nfl', game: 'WSH@NYG', pick: '<img src=x onerror=alert(1)>', price: 120, day, st: 'open' }] }] };
BETA.props = { d: day, props: [
  { id: 'nhl|kk|s|3|over', sp: 'nhl', player: 'Kirill Kaprizov', team: 'MIN', k: 's', lab: 'SOG', thr: 3, side: 'over', opp: 'CHI', home: true, start: iso(now + 5 * 36e5), last: [1,4,3,2,5,3,4,3,6,3], l5: [5,5], l10: [8,10], streak: 6, avg10: 3.4, by: [{ v: 'Sim', p: 0.76 }, { v: 'Coach', p: 0.72 }, { v: 'Judge', p: 0.7 }], votes: 3, p: 0.727, fair: -266 },
  { id: 'nba|ae|pts|25|over', sp: 'nba', player: 'Anthony Edwards', team: 'MIN', k: 'pts', lab: 'PTS', thr: 25, side: 'over', opp: 'DAL', home: false, start: iso(now + 5 * 36e5), last: [30,28,31,26,22], l5: [4,5], l10: [4,5], streak: -1, avg10: 27.4, by: [{ v: 'Coach', p: 0.7 }], votes: 1, p: 0.7, fair: -233 }] };
const SLATE = { v: 1, ts: now, tz: 'America/Chicago', ranks: { nfl: [{ rk: 1, ab: 'JAX', name: 'Jacksonville Jaguars', w: 6, l: 2, rt: 9.4, l5: 'WWLWW', st: 'W2' }] },
  days: [{ d: day, more: 0, games: [{ k: 'nfl|WSH@NYG', sp: 'nfl', t: now + 3 * 36e5, a: { ab: 'WSH', name: 'Washington Commanders', nick: 'Commanders', rk: 27, of: 32, w: 2, l: 6, l5: 'LLLWL', st: '', pf: 21.5, pa: 25.3 }, h: { ab: 'NYG', name: 'New York Giants', nick: 'Giants', rk: 20, of: 32, w: 5, l: 3, l5: 'WLLWW', st: 'W2', pf: 22.8, pa: 21.5 }, venue: 'MetLife Stadium', ln: { fav: 'NYG', line: 2.5, tot: 40.5, mlA: 120, mlH: -142 }, mv: ['total opened 47.5, now 40.5'], mkt: { ab: 'NYG', pct: 56, src: 'markets' }, read: { a: 20, h: 20 }, note: 'A note', q: { title: 'Over or under 40.5?', opts: ['Over 40.5', 'Under 40.5'] }, hot: 100 },
    { k: 'nba|DET@WSH', sp: 'nba', t: now + 20 * 60e3, a: { ab: 'DET', name: 'Detroit Pistons', nick: 'Pistons', rk: 9, of: 30, w: 7, l: 3, l5: 'WWLLW', st: '', pf: 112, pa: 104 }, h: { ab: 'WSH', name: 'Washington Wizards', nick: 'Wizards', rk: 25, of: 30, w: 4, l: 8, l5: 'LLLLL', st: 'L5', pf: 107, pa: 113 }, venue: '', ln: { fav: 'DET', line: 9.5, tot: 220.5, mlA: -423, mlH: 331 }, mv: [], mkt: null, read: null, note: '', q: { title: 'Upset alert or chalk?', opts: ['Pistons handle it', 'Wizards pull it off'] }, hot: 60 }] }] };

(async () => {
  const b = await pw.chromium.launch(); const HOSTS = new Set();
  /* one visit: a fresh browser profile, the given feed, the tab; returns the page + what it asked the network for */
  async function visit(feed, { tab = 'today', ua, guide = false, width, chat, query = '', at } = {}) {
    const ctx = await b.newContext({ ...pw.devices['iPhone 14'], ...(ua ? { userAgent: ua } : {}), ...(width ? { viewport: { width, height: 860 }, isMobile: false, hasTouch: false } : {}) });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
    await p.route('**/*', r => { const u = new URL(r.request().url()); HOSTS.add(u.hostname + (u.hostname === 'raw.githubusercontent.com' ? u.pathname : ''));
      if (/picks\.json$/.test(u.pathname)) return feed ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) }) : r.abort();
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (u.hostname === 'site.api.espn.com') return r.fulfill({ contentType: 'application/json', body: '{"events":[]}' });
      if (chat && u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') return chat(r, u);
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    if (!guide) await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); } catch (e) { } });
    if (at) await p.clock.setFixedTime(new Date(at));   /* (a fixed clock where dates on the page matter) */
    await p.goto('https://desk.test/desk/' + query + '#' + tab, { waitUntil: 'load' }); await p.waitForTimeout(900);
    return { p, ctx, errs, text: () => p.evaluate(() => document.body.innerText), html: () => p.evaluate(() => document.body.innerHTML) };
  }
  const PICKWORDS = /DET|Pistons|9\.5|Under 40\.5|40\.5|SJ \+1\.5|Sharks|-110|−110|-108|−108|-193|−193|72%|71%|70%/;

  /* ── sealed means sealed ── */
  let v = await visit(FEEDS.locked); let t = await v.text();
  T('before the unlocks: three face-down slips, each with its unlock time and a running clock', (await v.p.locator('.slip.locked').count()) === 3 && (await v.p.locator('.slip.locked .count').count()) === 3 && /OPENS/i.test(t) && /in \d+m|in \d+h/.test(t), t.slice(0, 300));
  T('…and not a word of any pick, price or confidence', !PICKWORDS.test(t.replace(/\b9:\d\d|\b\d{1,2}:\d\d [AP]M/g, '')), t.match(PICKWORDS));
  T('…the VIP nudge is there (members have had it since the lock)', /VIP has had it since/.test(t) && /VIP already has all three/i.test(t));
  await v.ctx.close();
  v = await visit(FEEDS.leaky); t = await v.text(); const h0 = await v.html();
  T('a "hidden" entry that still carries its pick never reaches the screen (not in the page at all)', (await v.p.locator('.slip.locked').count()) === 3 && !/Pistons|Under 40\.5|SJ \+1\.5|Sharks|−110|-110|−193|72%/.test(h0), (h0.match(/Pistons|Under 40\.5|SJ \+1\.5|−110|72%/) || [])[0]);
  await v.p.evaluate(() => { location.hash = '#slate'; }); await v.p.click('.tabs [data-go="slate"]'); await v.p.waitForTimeout(500);
  T('…nor on the Slate tab (no "on today\'s card" flag for a sealed pick)', !/On today.s card/.test(await v.text()));
  await v.ctx.close();

  /* ── an opened slip ── */
  v = await visit(FEEDS.morning); t = await v.text();
  T('30 minutes out the slip is face up: the pick big, the price, plain words, the matchup, confidence', /PISTONS −9\.5/i.test(t) && /−110/.test(t) && /Pistons to win by 10 or more/.test(t) && /Pistons at Wizards/.test(t) && /72%/.test(t), t.slice(0, 500));
  T('…with the character\'s read on the stub', /THE COACH/i.test(t) && /Washington has lost five straight/.test(t) && /Detroit defends/.test(t));
  T('…the pull quote is said once, not repeated as the first line of the read', (t.match(/Washington has lost five straight/g) || []).length === 1, (t.match(/Washington has lost five straight/g) || []).length);
  T('…and the slip shows what one unit wins at the price (−110 → 0.91u)', /To win, 1u/i.test(t) && /0\.91u/.test(t), t.slice(0, 400));
  T('…and the other two stay sealed', (await v.p.locator('.slip.locked').count()) === 2 && !/Under 40\.5|Sharks/.test(t));
  T('the record line reads from the feed', /38–27/.test(t) && /\+1\.2 units/.test(t));
  await v.p.click('.tabs [data-go="slate"]'); await v.p.waitForTimeout(500); t = await v.text();
  T('Slate: the day\'s games with Power Rank, record, line and total — and the opened pick flagged on its game', /Commanders/.test(t) && /Giants/.test(t) && /NYG −2\.5/.test(t) && /O\/U 40\.5/.test(t) && /On today.s card: Pistons −9\.5/.test(t) && !/Under 40\.5 −108/.test(t), t.slice(0, 600));
  await v.p.click('[data-act="game"][data-k="nfl|WSH@NYG"]'); await v.p.waitForTimeout(300); t = await v.text();
  T('…tap a game: last five, moneyline, markets, projected score, line moves, the question for the lounge', /Last five/.test(t) && /Commanders \+120, Giants −142/.test(t) && /56% Giants/.test(t) && /Commanders 20, Giants 20/.test(t) && /total opened 47\.5, now 40\.5/.test(t) && /OVER OR UNDER 40\.5\?/i.test(t));
  T('…and TheDesk Power Rankings', /POWER RANKINGS/i.test(t) && /Jacksonville Jaguars/.test(t));
  await v.p.click('.tabs [data-go="receipts"]'); await v.p.waitForTimeout(400); t = await v.text();
  T('Receipts: the record, hit rate and units, then every card with each result', /38–27/.test(t) && /58%/.test(t) && /\+1\.24u/.test(t) && /Knicks ML −160/.test(t) && /Sharks \+1\.5 −193/.test(t) && /Under 44\.5/.test(t), t.slice(0, 500));
  await v.p.click('.joinpill'); await v.p.waitForTimeout(400); t = await v.text();
  const hrefs = await v.p.evaluate(() => [...document.querySelectorAll('#v-join a[href]')].map(a => a.href));
  T('Join: VIP (the Whop link from the feed), follow the desk (channel + Facebook; the lounge stays hidden), how the desk works', /\$50\/mo or \$300\/yr/.test(t) && !/\$25|\$10\/wk/.test(t) && hrefs.includes('https://whop.com/ironsilkweekly/thedesk-vip') && hrefs.includes('https://t.me/TheDeskApp') && !hrefs.some(h => /TheDeskLounge/.test(h)) && /Follow the desk/i.test(t) && /Locked every morning/.test(t), hrefs.join(' '));
  T('…the head start from the public timestamps (locked 2h before an unlock 10 min ago → about 1h 50m), the real record by the button', /HEAD START TODAY/i.test(t) && /1h (49|50)m/i.test(t) && /On the record: 38–27, \+1\.24 units since Oct 6/.test(t), t.slice(0, 700));
  T('…free vs VIP side by side (VIP: the card at lock, the Top 10, the parlays, the private Telegram)', (await v.p.locator('#v-join .cmp tbody tr').count()) === 9 && /The minute it locks/.test(t) && /30 min before each game/.test(t) && /Yearly plan/.test(t) && (await v.p.locator('#v-join .cmp td.v svg.y').count()) === 7 /* v82: the members' chatroom is live (it said Soon) */ && (await v.p.locator('#v-join .cmp td:not(.v) svg.n').count()) === 5);
  T('…and the straight answers: where picks land, no guarantees, cancel any time', /Where do the picks show up/.test(t) && /Do you guarantee wins/.test(t) && /Can I cancel/.test(t));
  for (const tab of ['today', 'slate', 'props', 'receipts', 'join']) { await v.p.click(tab === 'join' ? '.joinpill' : `.tabs [data-go="${tab}"]`); await v.p.waitForTimeout(250); const o = await v.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) T('no sideways scroll on ' + tab, false, o + 'px'); }
  T('no sideways scroll on a phone, any tab', true); T('no script errors', v.errs.length === 0, v.errs.join(' | '));
  await v.ctx.close();

  /* ── the month: the results calendar (v60 · Nov 23, Chris: "I love that calendar… can we have Noah curate us some fly shit
     like that somewhere in the public app"). The clock is fixed at Nov 23, 7:30 PM Central. ── */
  {
    const AT = Date.parse('2026-11-24T01:30:00Z'), AD = '2026-11-23', isoA = t => new Date(t).toISOString().slice(0, 16) + 'Z';
    const unA = x => Date.parse(x.start) - 30 * 60e3, seal = x => ({ hidden: true, sp: x.sp, start: x.start, unlockAt: unA(x) });
    const A0 = { ...P[0], start: isoA(AT + 20 * 60e3) }, A1 = { ...P[1], start: isoA(AT + 3 * 36e5) }, A2 = { ...P[2], start: isoA(AT + 6 * 36e5) };
    const OLD = { ...base, generated: AT, today: { d: AD, lockedAt: AT - 2 * 36e5, unlockMin: 30, picks: [{ ...A0, unlockAt: unA(A0) }, seal(A1), seal(A2)], props: [] } };
    const cal = async () => v.p.evaluate(() => { const c = document.querySelector('#cal'); if (!c) return null; const k = d => (c.querySelector(`.cd[data-d="${d}"]`) || {}).className || '';
      const all = s => c.querySelectorAll(s).length, sl = c.querySelector('.calday');
      return { text: c.innerText.replace(/\s+/g, ' '), slip: sl ? sl.innerText.replace(/\s+/g, ' ') : '', k, cls: Object.fromEntries([...c.querySelectorAll('.cd[data-d]')].map(e => [e.dataset.d, e.className])),
        heat: Object.fromEntries([...c.querySelectorAll('.cd[data-d]')].map(e => [e.dataset.d, e.style.getPropertyValue('--h')])), u: all('.cd.u'), q: all('.cd.q'), f: all('.cd.f'), x: all('.cd.x'),
        prev: c.querySelector('.calnv[data-v="-1"]').disabled, next: c.querySelector('.calnv[data-v="1"]').disabled, first: document.querySelector('#v-receipts .two').firstElementChild.id,
        pressed: [...c.querySelectorAll('.cd[aria-pressed="true"]')].map(e => e.dataset.d), focus: (document.activeElement || {}).className || '' }; });
    /* an older feed (no calendar from the desk yet): the last cards, and the days it can't show say so */
    v = await visit(OLD, { tab: 'receipts', at: AT }); let C = await cal();
    T('the month: Receipts opens on a calendar of the current month, before the ledger', C && C.first === 'cal' && /NOVEMBER 2026/i.test(C.text), C && C.text.slice(0, 120));
    T('…the month\'s units up top, then its record and its winning days', /\+0\.43u/.test(C.text) && /2–1 from Nov 9 on, 1 winning day of 2/.test(C.text), C.text.slice(0, 160));
    T('…a won day is green, a lost day red, deeper the bigger the day (+0.91 burns brighter than −0.48)', / w( |$)/.test(C.cls['2026-11-09']) && / l( |$)/.test(C.cls['2026-11-10']) && +C.heat['2026-11-09'] > +C.heat['2026-11-10'] && +C.heat['2026-11-10'] >= 0.42, JSON.stringify([C.cls['2026-11-09'], C.heat['2026-11-09'], C.cls['2026-11-10'], C.heat['2026-11-10']]));
    T('…today: the gold ring and the live pip, picked out, with its slip under the board (the open pick, the sealed two, what\'s left)', /\bt\b/.test(C.cls[AD]) && /\bo\b/.test(C.cls[AD]) && /\bs\b/.test(C.cls[AD]) && /cpip/.test(await v.p.evaluate(d => document.querySelector(`.cd[data-d="${d}"]`).innerHTML, AD))
      && /^Today/.test(C.slip) && /Pistons −9\.5 −110/.test(C.slip) && (C.slip.match(/Sealed pick/g) || []).length === 2 && /3 still to play/.test(C.slip) && !/Under 40\.5|Sharks/.test(C.text), C.slip);
    T('…days on the record this page can\'t show are dashed, and the board says so; the rest of the month is still to come', C.u === 8 && C.f === 7 && C.x === 12 && /Days before Nov 9 fill in with the desk’s next update/.test(C.text), JSON.stringify([C.u, C.f, C.x]));
    T('…the best day wears the star', /★ Best day: Mon, Nov 9, \+0\.91u/.test(C.text) && /cbest/.test(await v.p.evaluate(() => document.querySelector('.cd[data-d="2026-11-09"]').innerHTML)));
    await v.p.click('.cd[data-d="2026-11-10"]'); await v.p.waitForTimeout(350); C = await cal();
    T('tap a day: its slip comes off the board, pick by pick', /^Tue, Nov 10 1–1 −0\.48u/.test(C.slip) && /Knicks ML −160/.test(C.slip) && /Sharks \+1\.5 −193/.test(C.slip) && /−1\.00/.test(C.slip) && JSON.stringify(C.pressed) === '["2026-11-10"]' && /\bs\b/.test(C.cls['2026-11-10']) && !/\bs\b/.test(C.cls[AD]), C.slip);
    T('…and the keyboard stays on the day you picked', /\bcd\b/.test(C.focus) && /\bs\b/.test(C.focus), C.focus);
    T('…the next month waits (this is the current one); the previous one is there', C.next === true && C.prev === false);
    await v.p.click('.calnv[data-v="-1"]'); await v.p.waitForTimeout(900); C = await cal();
    T('previous month: October, from the first card on the record (Oct 6); nothing before it', /OCTOBER 2026/i.test(C.text) && C.prev === true && C.next === false && C.q === 5 && C.u === 26 && /These days aren’t on this page yet/.test(C.text) && /Days before Nov 9 fill in/.test(C.text), JSON.stringify([C.text.slice(0, 80), C.q, C.u, C.prev, C.next]));
    T('…the arrow keeps the keyboard (on the arrow still enabled)', /calnv/.test(C.focus), C.focus);
    await v.p.click('.calnv[data-v="1"]'); await v.p.waitForTimeout(900); C = await cal();
    T('…and back to November', /NOVEMBER 2026/i.test(C.text) && C.next === true);
    T('the calendar: no sideways scroll on a phone, no script errors', await v.p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 0) && v.errs.length === 0, v.errs.join(' | '));
    await v.ctx.close();
    /* the desk's calendar: every day since the first, hostile rows ignored */
    const B0 = { ...P[0], start: isoA(AT - 3 * 36e5) }, B1 = { ...P[1], start: isoA(AT - 2 * 36e5) }, B2 = { ...P[2], start: isoA(AT + 1 * 36e5) };
    const NEW = { ...OLD, today: { ...OLD.today, picks: [{ ...B0, hit: true, unlockAt: unA(B0) }, { ...B1, hit: false, unlockAt: unA(B1) }, seal(B2)] },
      cal: { first: '2026-10-06', d: [['2026-10-06', 2, 1, 0, 0.71, 3], ['2026-10-31', 0, 3, 0, -3, 3], ['2026-11-01', 1, 0, 1, 0.91, 2], ['2026-11-09', 1, 0, 0, 0.91, 1], ['2026-11-10', 1, 1, 0, -0.48, 2],
        ['<img src=x onerror="window.__xss=11">', 9, 9, 9, 9, 9], ['2026-11-12', '<b onmouseover="window.__xss=12">3</b>', 'x', 0, 'NaN', 1], 'junk', null, ['2026-11-13'], { d: '2026-11-14' }] } };
    v = await visit(NEW, { tab: 'receipts', at: AT }); C = await cal();
    T('with the desk\'s calendar: the whole month adds up — the days since the first plus today\'s graded picks', /\+1\.25u/.test(C.text) && /4–2–1 so far, 2 winning days of 4/.test(C.text) && C.u === 0 && !/fill in/.test(C.text), C.text.slice(0, 200));
    T('…today lost a little (−0.09): red, still live (one to play)', / l( |$)/.test(C.cls[AD]) && /\bt\b/.test(C.cls[AD]) && /−0\.09/.test(C.text) && /1 still to play/.test(C.slip), C.cls[AD] + ' | ' + C.slip);
    T('…the best day is the desk\'s (Nov 1, +0.91u); an older day without slips says where they are', /★ Best day: Sun, Nov 1, \+0\.91u/.test(C.text) && (await v.p.click('.cd[data-d="2026-11-01"]'), true));
    await v.p.waitForTimeout(300); C = await cal();
    T('…tap it: its line, and that pick-by-pick slips go back 30 cards', /^Sun, Nov 1 1–0–1 \+0\.91u/.test(C.slip) && /2 picks on the card\. The pick-by-pick slips go back 30 cards\./.test(C.slip), C.slip);
    T('…hostile or broken rows never reach the page (no script ran, no bad day, junk numbers read as nothing)', !(await v.p.evaluate(() => window.__xss)) && !C.cls['2026-11-13'] && !C.cls['2026-11-14'] && /\bo\b/.test(C.cls['2026-11-12'] || '') && !Object.keys(C.cls).some(d => !/^\d{4}-\d\d-\d\d$/.test(d)), JSON.stringify(Object.keys(C.cls)));
    await v.p.click('.calnv[data-v="-1"]'); await v.p.waitForTimeout(900); C = await cal();
    T('…October from the desk: its two cards, the −3 day at full heat', /OCTOBER 2026/i.test(C.text) && /−2\.29u/.test(C.text) && /2–4 in October, 1 winning day of 2/.test(C.text) && C.heat['2026-10-31'] === '1.00' && C.heat['2026-10-06'] === '0.56' && C.q === 5 && C.u === 0 && C.x === 24, JSON.stringify([C.text.slice(0, 90), C.heat['2026-10-31'], C.heat['2026-10-06'], C.q, C.x]));
    T('…no script errors', v.errs.length === 0, v.errs.join(' | '));
    await v.ctx.close();
    /* a wide screen: the ledger on the left, the month beside it */
    v = await visit(NEW, { tab: 'receipts', at: AT, width: 1280 });
    const L = await v.p.evaluate(() => { const c = document.querySelector('#cal').getBoundingClientRect(), t = document.querySelector('#v-receipts .tape').getBoundingClientRect(); return { cl: c.left, tr: t.right, ct: c.top, tt: t.top }; });
    T('on a wide screen the month sits beside the ledger, level with it', L.cl > L.tr && Math.abs(L.ct - L.tt) < 4, JSON.stringify(L));
    await v.ctx.close();
  }

  /* ── the open beta ── */
  v = await visit(BETA); t = await v.text();
  T('open beta: every Best 3 pick is face up at lock, and the page says it\'s open to everyone', (await v.p.locator('#v-today .slip.locked').count()) === 0 && /PISTONS −9\.5/i.test(t) && /UNDER 40\.5/i.test(t) && /Open to everyone during the beta/.test(t));
  T('Today teases Founder LongShot Parlays: the live ticket, with a link to the LongShots tab', /FOUNDER LONGSHOT PARLAYS/i.test(t) && /LONGSHOT · 3 LEGS/i.test(t) && /LongShots tab/.test(t) && (await v.p.locator('#v-today [data-act="tail"]').count()) === 1 && !/LONGSHOT · 2 LEGS/i.test(t));
  T('one row of tabs on a phone, Props third, LongShots fourth, Compete fifth', await v.p.evaluate(() => { const b = [...document.querySelectorAll('.tabs button')]; const tops = new Set(b.map(x => Math.round(x.getBoundingClientRect().top))); return b.length === 8 && tops.size === 1 && b[2].dataset.go === 'props' && b[3].dataset.go === 'longshots' && b.every(x => x.scrollWidth <= x.clientWidth + 1); }), await v.p.evaluate(() => JSON.stringify([...document.querySelectorAll('.tabs button')].map(x => [x.dataset.go, Math.round(x.getBoundingClientRect().top), x.scrollWidth, x.clientWidth]))));
  await v.p.click('.tabs [data-go="longshots"]'); await v.p.waitForTimeout(300); t = await v.text();
  T('the LongShots tab: every founder ticket, leg by leg, the odds, what $10 pays, how many have cashed (never the losses, v83); the live one tails, the lost one doesn\'t', /FOUNDER LONGSHOT PARLAYS/i.test(t) && /🎯 3 LongShots cashed/i.test(t) && !/\d+ lost\b/i.test(t) && /A\. Edwards 25\+ points/.test(t) && /\+1,150/.test(t) && /\$10 pays \$125/.test(t) && /LONGSHOT · 2 LEGS/i.test(t) && (await v.p.locator('#v-longshots [data-act="tail"]').count()) === 1 && (await v.p.locator('.slip.founder img').count()) === 0, (t.match(/Founder LongShot Parlays[^]{0,300}/i) || [])[0]);
  await v.p.click('#v-longshots [data-act="tail"]'); await v.p.waitForTimeout(300); t = await v.text();
  T('…"Tail this" copies the legs, with a note to paste them into the book', /Copied/.test(t));
  await v.p.click('.tabs [data-go="today"]'); await v.p.waitForTimeout(300); t = await v.text();
  await v.p.click('.tabs [data-go="props"]'); await v.p.waitForTimeout(300); t = await v.text();
  T('Props: Desk Score, run strip vs the line, L5/L10, streak, the room, whispers', /DESK/i.test(t) && (await v.p.locator('.pcard').count()) === 2 && (await v.p.locator('.pcard').first().locator('.pst').count()) === 10 && /L10 8\/10/.test(t) && /6 straight/.test(t) && /Simulator|Sim/.test(t) && /Kirill Kaprizov \(MIN vs CHI, [^)]+\) has cleared 3\+ SOG 6 straight/.test(t), t.slice(0, 300));
  await v.p.click('[data-act="pf"][data-v="bounce"]'); await v.p.waitForTimeout(200);
  T('…the Bounce-back lens: missed last time, usually clears → Edwards only', (await v.p.locator('.pcard').count()) === 1 && /Anthony Edwards/.test(await v.text()));
  await v.p.click('[data-act="pf"][data-v="all"][data-k="lens"]'); await v.p.click('.pcard [data-act="pslip"] >> nth=0'); await v.p.click('.pcard [data-act="pslip"] >> nth=1'); await v.p.waitForTimeout(200); t = await v.text();
  T('…the slip: two legs, the room\'s combined chance and fair odds', /Your slip · 2 legs/.test(t) && /51%/.test(t), (t.match(/Your slip[^]{0,80}/) || [])[0]);
  await v.p.click('[data-act="pf"][data-k="view"][data-v="sheet"]'); await v.p.waitForTimeout(200);
  T('…the Sheet view lists every prop, sortable', (await v.p.locator('.ps-r').count()) === 2);
  await v.p.click('[data-act="pslipclear"]'); await v.p.click('[data-act="pf"][data-k="view"][data-v="cards"]');
  await v.p.click('.tabs [data-go="today"]'); await v.p.waitForTimeout(300); t = await v.text();
  T('…the VIP sections ride along, each marked "VIP · free in beta": the rest of the Top 10, the Banker, the props (v75: every character\'s parlay lives in its profile now, not here)', /THE REST OF THE TOP 10/i.test(t) && /THE BANKER.S PARLAY/i.test(t) && !/EVERY CHARACTER.S PARLAY/i.test(t) && /PROPS OF THE DAY/i.test(t) && (await v.p.locator('#v-today .vipbadge').count()) >= 3 && /Anthony Edwards 30\+ points/.test(t) && /\+264/.test(t), t.slice(0, 900));
  T('…no VIP selling during the beta (no checkout link anywhere), a beta strip instead', !(await v.p.evaluate(() => [...document.querySelectorAll('a[href]')].some(a => /whop\.com/.test(a.href)))) && /Open beta: the whole card is free/i.test(t));
  await v.p.locator('#v-today .calls summary').first().click(); await v.p.waitForTimeout(200); t = await v.text();
  /* v68 · the reasons now read in each character's words ("rest edge" → "fresh legs against tired ones"…), so the check is on the facts, not the tags */
  T('…each pick opens "every character on it": who is with it, who is against, how sure, and why', /2 with · 1 against/.test(t) && /rested|fresh legs|night off|rest edge|slept/i.test(t) && /played last night|back-to-back|tired legs|running on fumes|no rest/i.test(t) && /On WSH \+9\.5\. [^\n]*(own this series|history between|number|usually walk away|head-to-head)/i.test(t) && (await v.p.locator('#v-today .calls li.off').count()) >= 1);
  T('Today: "Unanimous, Supreme & Strong" lists the strongest board picks with their tags and who is on them', /UNANIMOUS, SUPREME & STRONG/i.test(t) && /Giants ML/.test(t) && /Timberwolves −5\.5/.test(t) && /by The Coach, The Scout/.test(t) && /1 unanimous/.test(t), t.slice(t.indexOf('NANIMOUS, S') - 10, t.indexOf('NANIMOUS, S') + 400));
  T('…no heavy moneyline on Today (the −1500 Avalanche ML in the Top 10 never shows)', !/−1500|-1500|Avalanche ML/.test(t), (t.match(/.{80}(−1500|-1500|Avalanche ML).{40}/s)||[])[0]);
  await v.p.click('.tabs [data-go="slate"]'); await v.p.waitForTimeout(500); t = await v.text();
  T('Slate in beta: games by start time, each slot with its counts, filters for time, strength, bet type and character', /🕒 \d{1,2}:\d\d [AP]M/.test(t) && /BY TIME/i.test(t) && /Not over yet/.test(t) && /Every pick/.test(t) && !/Heavy ML/.test(t) && (await v.p.locator('[data-change="bfch"] option').count()) === 4 && /1 supreme/.test(t), JSON.stringify([/BY TIME/i.test(t), /Not over yet/.test(t), /Every pick/.test(t), !/Heavy ML/.test(t), await v.p.locator('[data-change="bfch"] option').count(), /1 supreme/.test(t)]) + t.slice(t.indexOf('SHEET'), t.indexOf('SHEET') + 600));
  T('…a board game the sheet skipped still shows (Mavericks at Timberwolves), with its strong pick', /Timberwolves/.test(t) && /Timberwolves −5\.5 −110/.test(t));
  await v.p.click('[data-act="bf"][data-k="tier"][data-v="unan"]'); await v.p.waitForTimeout(300); t = await v.text();
  T('…"★ Unanimous" keeps only games with a unanimous pick', /Giants/.test(t) && !/Timberwolves/.test(t));
  await v.p.selectOption('[data-change="bfch"]', 'Trends'); await v.p.waitForTimeout(300); t = await v.text();
  T('…pick a character: only the games it called, showing its call', /Giants/.test(t) && !/Timberwolves/.test(t) && /The Historian/.test(t) && /Over 40\.5 −112/.test(t));
  await v.p.click('[data-act="bfreset"]'); await v.p.waitForTimeout(300);
  await v.p.locator('#v-slate .game > button', { hasText: 'Giants' }).first().click(); await v.p.waitForTimeout(300); t = await v.text();
  T('…tap a game: the desk\'s colored picks with tags, and who\'s with it, who\'s against it', /THE DESK.S COLORED PICKS/i.test(t) && /WHO.S WITH IT, WHO.S AGAINST IT/i.test(t) && /2–1 split/.test(t) && /2 with/.test(t) && /1 against/.test(t), t.slice(t.indexOf('OLORED') - 20, t.indexOf('OLORED') + 700));
  T('…each call shows its confidence and its rank in that kind of bet: 👑 #1 has the say, 🧊 the worst shouldn\'t', /#1 in NFL unders: has the say/.test(t) && /Worst in NFL overs: no say/.test(t) && /#4 of 9 in NFL unders/.test(t) && /30–12, \+14\.2u/.test(t) && /74%/.test(t) && /The Coach has the say, on Under 40\.5/.test(t), t.slice(t.indexOf('AGAINST IT'), t.indexOf('AGAINST IT') + 900));
  T('…no heavy moneyline anywhere on the game (not the −1200 pick, not the −1100 call)', !/−1200|−1100|-1200|-1100/.test(t));
  T('…a color from the board can\'t smuggle in CSS', await v.p.evaluate(() => [...document.querySelectorAll('.won li')].every(li => /^#[0-9a-f]{3,8}$/i.test(li.style.getPropertyValue('--c').trim()))));
  T('…the board stays inside a phone screen', (await v.p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await v.p.click('.tabs [data-go="cast"]'); await v.p.waitForTimeout(400); t = await v.text();
  T('Characters: a dropdown to pick one, a card per character (name, title, game and prop records, today\'s count)', (await v.p.locator('#castSel option').count()) === 3 && /THE SCOUT/i.test(t) && /The Talent Hunter/i.test(t) && /41–30–1/.test(t) && /12–5/.test(t) && /2 picks today/.test(t) && /No pick today/.test(t), t.slice(0, 700));
  T('…the bloodlines in plain words (closest to a new generation, no math)', /CLOSEST TO A NEW GENERATION/i.test(t) && !/σ/.test(t));
  T('…a color from the feed can\'t smuggle in CSS (only #hex colors pass)', await v.p.evaluate(() => [...document.querySelectorAll('.castcard')].every(c => /^#[0-9a-f]{3,8}$/i.test(c.style.getPropertyValue('--cc').trim()))));
  await v.p.selectOption('#castSel', 'Scout'); await v.p.waitForTimeout(300); t = await v.text();
  T('picking the Scout opens its page: who it is, where its eye comes from, what it\'s best at, its records', /The Scout watches players, not teams/.test(t) && /WHERE THE EYE COMES FROM/i.test(t) && /Spent years on the road/.test(t) && /NHL favorites on the spread 17–13 \+13\.3u/.test(t) && /Still learning/.test(t) && /41–30–1/.test(t), t.slice(0, 900));
  T('…today\'s official picks, games and props (an under reads as an under), with the reason', /Giants ML/i.test(t) && /talent|better players|roster|man for man|deeper|future pros|position by position|good players/i.test(t) && /QB star/i.test(t) && /Anthony Edwards under 39\.5 PTS\+REB\+AST/.test(t) && /3-1/.test(t) && /“/.test(t));
  T('…in the character\'s own words, not a list of tags', !/·/.test(await v.p.evaluate(() => [...document.querySelectorAll('#v-cast .why1')].map(x => x.innerText).join(' '))));
  T('…recent results, the teams it backs and fades, the players it rides and fades', /RECENT RESULTS/i.test(t) && /TEAMS IT BACKS AND FADES/i.test(t) && /Wild/.test(t) && /6–2/.test(t) && /PLAYERS IT RIDES AND FADES/i.test(t) && /4–1/.test(t) && /2–0/.test(t));
  T('…and its bloodline in plain words', /% of the way to a new generation/.test(t) && /80\/100 games watched/.test(t));
  await v.p.click('[data-act="castpick"][data-v=""]'); await v.p.waitForTimeout(250);
  T('"All characters" goes back to the roster', (await v.p.locator('.castcard.mini').count()) === 2);
  T('every page ends with "Restart the app" (loads the newest version)', (await v.p.locator('[data-act="restart"]').count()) >= 1);
  await v.p.locator('#v-cast [data-act="restart"]').click(); await v.p.waitForTimeout(1200);
  T('…tapping it reloads the app fresh (and nothing saved is lost)', /[?&]fresh=\d+/.test(v.p.url()) && (await v.p.evaluate(() => localStorage.getItem('tdp.castpick'))) !== null, v.p.url());
  await v.p.click('.joinpill'); await v.p.waitForTimeout(400); t = await v.text();
  T('Join in beta: "Everything\'s free during the beta", the plans after the beta ($50 a month, $300 a year, $100 a league, $20 for 2 days, $2 a pick), no checkout', /EVERYTHING.S FREE DURING THE BETA/i.test(t) && /PLANS AFTER THE BETA/i.test(t) && ['$50', '$300', '$100', '$20', '$2'].every(x => t.includes(x)) && /Best value/i.test(t) && /What happens after the beta/.test(t) && !/HEAD START/i.test(t) && !(await v.p.evaluate(() => [...document.querySelectorAll('#v-join a[href]')].some(a => /whop/.test(a.href)))));
  for (const tab of ['today', 'cast', 'join']) { await v.p.click(tab === 'join' ? '.joinpill' : `.tabs [data-go="${tab}"]`); await v.p.waitForTimeout(250); const o = await v.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) T('beta: no sideways scroll on ' + tab, false, o + 'px'); }
  T('beta: no sideways scroll, no script errors', v.errs.length === 0, v.errs.join(' | '));
  await v.ctx.close();

  /* ── an older app's feed (no beta flag, old price line): the beta Join page with today's prices, never the old ones ── */
  { const old = { ...FEEDS.morning }; delete old.beta; v = await visit(old, { tab: 'join' }); t = await v.text();
    T('a feed from an older app still shows the new price list and no checkout (the beta is on unless the feed says off)', /EVERYTHING.S FREE DURING THE BETA/i.test(t) && ['$50', '$300', '$100', '$20', '$2'].every(x => t.includes(x)) && !/\$25|\$10\/wk|\$19\.99/.test(t) && !(await v.p.evaluate(() => [...document.querySelectorAll('a[href]')].some(a => /whop/.test(a.href)))));
    await v.ctx.close(); }


  /* ── following tickets live (v3.0.34) ── */
  { let bump = 0; const espnUrls = [], boxUrls = []; const F = JSON.parse(JSON.stringify(BETA)); const t0 = F.founder.tix[0]; t0.p0 = 0.02; t0.now = 0.035;
    t0.legs[1].p = 0.52; t0.legs[1].q = 0.61; t0.legs[1].st = 'live'; t0.legs[1].detail = 'DAL 50–58 MIN (live) · margin +8'; t0.legs[1].start = iso(now - 30 * 60e3); t0.legs[0].p = 0.6; t0.legs[2].p = 0.3; t0.legs[2].q = 0.05;
    F.props.props[1].home = true;     F.vip.parlays[0].legs[0].q = 0.8; F.vip.parlays[0].legs[0].start = iso(now - 40 * 60e3);
    const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
    await p.addInitScript(f => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.feed', f); } catch (e) { } }, JSON.stringify(F)); /* the same card already saved on the phone: no new publish to wake the live loop */
    await p.route('**/*', r => { const u = new URL(r.request().url());
      if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(F) });
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (u.hostname === 'site.api.espn.com') { const ev = (a, h, as, hs, det, per, clk) => ({ id: a + h, competitions: [{ status: { period: per, clock: clk, type: { state: 'in', shortDetail: det } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] });
        if (/summary$/.test(u.pathname)) { boxUrls.push(u.search); const id = u.searchParams.get('event');
          const P = id === 'DALMIN' ? [{ team: { abbreviation: 'MIN' }, statistics: [{ keys: ['minutes', 'points', 'fieldGoalsMade-fieldGoalsAttempted', 'threePointFieldGoalsMade-threePointFieldGoalsAttempted', 'rebounds', 'assists'], athletes: [{ athlete: { displayName: 'Anthony Edwards', shortName: 'A. Edwards' }, stats: ['30', String(18 + (bump ? 9 : 0)), '7-15', '2-6', '4', '5'] }, { athlete: { displayName: 'Anthony Black', shortName: 'A. Black' }, stats: ['20', '9', '4-9', '1-3', '2', '6'] }] }] }] : [];
          return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ boxscore: { players: P } }) }); }
        espnUrls.push(u.search); const E = /basketball\/nba/.test(u.pathname) ? [ev('DAL', 'MIN', 54 + bump, 61, bump ? '2:40 - 3rd' : '5:12 - 3rd', 3, bump ? 160 : 312)] : /football\/nfl/.test(u.pathname) ? [ev('WSH', 'NYG', 3, 10, '9:41 - 2nd', 2, 581)] : [];
        return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: E }) }); }
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.goto('https://desk.test/desk/#longshots', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    let t = await p.evaluate(() => document.querySelector('#v-longshots').innerText);
    T('live scores land straight away on open, even when the saved card is already the newest (no minute-long wait)', /LIVE DAL 54–61 MIN/.test(t), t.slice(0, 300));
    T('LongShots live: the ticket\'s chance and "1 in N", legs live, to go, and a live cash chance against pre-game', /2\.0%\s*·\s*1 in 50/.test(t) && /● \d+ live/.test(t) && /Live cash chance \d+\.\d%/i.test(t) && /was 1 in 50 pre-game/i.test(t), (t.match(/live cash chance[^]{0,60}/i) || [t.slice(0, 600)])[0]);
    T('player props live off ESPN\'s box score, on the phone: the stat against the line and its own live chance (the feed\'s stale 5% is ignored)', /A\. Edwards 25\+ points[^]{0,120}18 of 25\+ · 61% live \(was 30%\)/.test(t) && !/A\. Edwards 18\b/.test(t) && boxUrls.length > 0 && boxUrls.every(q => /event=DALMIN/.test(q)), (t.match(/A\. Edwards 25\+ points[^]{0,160}/) || [])[0]);
    T('…each live leg: score and clock, and its live chance (was X% pre-game)', /LIVE DAL 54–61 MIN · 5:12 - 3rd/i.test(t) && /70% live \(was 52%\)/i.test(t), (t.match(/LIVE DAL[^]{0,300}/) || [t.slice(0,900)])[0]);
    bump = 6; await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(900); t = await p.evaluate(() => document.querySelector('#v-longshots').innerText);
    T('scores keep updating: the next fetch shows the new score (no cached copy), with a "Scores updated" time', /LIVE DAL 60–61 MIN · 2:40 - 3rd/i.test(t) && /Scores updated/i.test(t) && espnUrls.length > 0 && espnUrls.every(q => /[?&]_=\d+/.test(q)), (t.match(/MIN -5\.5[^]{0,200}/) || [])[0] + ' ' + espnUrls[0]);
    T('…and the live chance is worked out on the phone: same feed, new score → the leg drops to 35%, the ticket\'s live cash chance moves with it (no republish from the desk)', /LIVE DAL 60–61 MIN · 2:40 - 3rd · 35% live \(was 52%\)/i.test(t) && /Live cash chance 34\.6%/i.test(t), (t.match(/LIVE DAL[^]{0,120}/) || [])[0] + ' | ' + (t.match(/live cash chance[^]{0,40}/i) || [])[0]);
    T('…a prop that clears mid-game is graded ✓ on the spot (no waiting on the desk), and the ticket counts it', /✓\s*A\. Edwards 25\+ points[^]{0,80}A\. Edwards 27 · cleared it/.test(t) && /2 OF 3 HIT|2 of 3 hit/i.test(t), (t.match(/.{0,4}A\. Edwards 25\+ points[^]{0,100}/) || [])[0] + ' | ' + (t.match(/LIVE · \d OF \d HIT/i) || [])[0]);
    T('…the founder ticket counts hits and misses', /✓ 2 hit · ✗ 0 missed/.test(t), (t.match(/legs ·[^\n]{0,80}/) || [])[0]);
    await p.click('.tabs [data-go="props"]'); await p.waitForTimeout(700); t = await p.evaluate(() => document.querySelector('#v-props').innerText);
    T('Props tab: a prop that cleared shows HIT with the player\'s number; a live one shows score and its live chance', /HIT/.test(t) && /✓ Hit · Anthony Edwards had 27/.test(t), (t.match(/Anthony Edwards[^]{0,260}/) || [t.slice(0, 400)])[0]);
    await p.click('.tabs [data-go="today"]'); await p.waitForTimeout(700); t = await p.evaluate(() => document.body.innerText);
    T('Today\'s Unanimous/Supreme/Strong board: live games show the score and each pick\'s live chance', /UNANIMOUS, SUPREME & STRONG/i.test(t) && /LIVE WSH 3–10 NYG[^\n]*% live/.test(t), (t.match(/UNANIMOUS, SUPREME[^]{0,700}/i) || [])[0]);
    await p.click('.tabs [data-go="slate"]'); await p.waitForTimeout(900);
    T('the Slate\'s colored picks carry their live chance while the game plays', await p.evaluate(() => [...document.querySelectorAll('.bp.bp-live .lvq')].length > 0), await p.evaluate(() => (document.querySelector('.bpicks') || {}).innerText));
    await p.click('.tabs [data-go="today"]'); await p.waitForTimeout(800); t = await p.evaluate(() => document.body.innerText);
    T('…one score line per live game leg (the stale grade line from the last publish stays off)', !/MIN -5\.5[^]{0,160}\(live\)/.test(t.split('Edwards')[0]), (t.match(/MIN -5\.5[^]{0,200}/) || [])[0]);
    /* v75 · Nov 26, Chris: "Also the character parlays weren’t in there profile today they were on the main page … fix that!" */
    T('v75 · the Today page no longer lists every character\'s parlay (each one lives in its profile)', !/EVERY CHARACTER’S PARLAY|Every character’s parlay/i.test(t), (t.match(/EVERY CHARACTER[^]{0,120}/i) || [])[0]);
    await p.click('.tabs [data-go="cast"]'); await p.waitForTimeout(500); t = await p.evaluate(() => document.querySelector('#v-cast').innerText);
    T('Cast: each character card shows today live (record so far, how many playing)', /Today 0–0 · ● 2 live/.test(t), t.slice(0, 400));
    /* v63 · Nov 23, 11:41 PM, Chris: "I want the cast section to show players parlay records and if they are up or down units in the parlay lane" */
    T('…each card shows its parlay record and whether it is up or down units (the Scout: 3–7–1, −1.3u)', /3–7–1\s*parlays, −1\.3u/.test(t) && (await p.evaluate(() => (document.querySelector('[data-v="Scout"].castcard .ccp em') || {}).className)) === 'dn', (t.match(/[^\n]*parlays[^\n]*/) || [])[0]);
    if (process.env.SHOTS) { await p.locator('#v-cast .castcard').first().screenshot({ path: process.env.SHOTS + '/cast-card.png' }); await p.locator('#v-cast .parboard').screenshot({ path: process.env.SHOTS + '/cast-lane.png' }); }
    T('…and the parlay lane board ranks who is up and who is down (only characters with settled tickets)', /THE PARLAY LANE/i.test(t) && (await p.locator('#v-cast .parboard .pl-b').count()) === 1 && /The Scout[^]{0,80}−1\.3u/.test(await p.locator('#v-cast .parboard').innerText()), t.slice(-900));
    await p.click('#v-cast [data-act="castpick"][data-v="Scout"]'); await p.waitForTimeout(400); t = await p.evaluate(() => document.querySelector('#v-cast').innerText);
    T('…its profile grades today\'s picks live: the game with score, clock and live chance; the prop with the stat against the line (found by team, off the box score)', /NYG ML|Giants ML/.test(t) && /LIVE WSH 3–10 NYG · 9:41 - 2nd · 86% live/i.test(t) && /Anthony Edwards under 39\.5 PTS\+REB\+AST[^]{0,200}36 \(under 39\.5\) · \d+% live/.test(t), (t.match(/Today’s official picks[^]{0,500}/i) || [t.slice(0, 500)])[0]);
    const ptx = await p.locator('#v-cast .pl-tix').innerText();
    T('…its parlay for today sits in its profile with the same summary; a live leg shows its score, clock and live chance', /legs · /.test(ptx) && /LIVE WSH 3–10 NYG · 9:41 - 2nd/i.test(ptx) && /86% live \(was 71%\)/i.test(ptx), ptx.slice(0, 500));
    const pl = await p.locator('#v-cast .parlane').innerText();
    if (process.env.SHOTS) { await p.locator('#v-cast .statrow').screenshot({ path: process.env.SHOTS + '/cast-stats.png' }); await p.locator('#v-cast .parlane').screenshot({ path: process.env.SHOTS + '/cast-parlane.png' }); }
    T('…its profile has the parlay lane: the total, up or down, each kind of ticket with its legs, and its last tickets', /3–7–1/.test(pl) && /Down\s*−1\.3u/.test(pl) && /Game parlay[^]{0,80}legs 11–7[^]{0,20}2–5–1\s*−1\.4u/.test(pl) && /Strong-suit ticket[^]{0,80}1–0\s*\+2\.1u/.test(pl) && /Prop parlay[^]{0,80}0–2\s*−2\.0u/.test(pl) && /✓ (Sun, )?Nov 22 · 🎟 2\/2 legs · \+264/.test(pl) && /✗ (Sat, )?Nov 21 · 🎯 2\/3 legs · \+595/.test(pl) && (await p.locator('#v-cast .pl-tk').count()) === 2, pl);
    T('…its stat row adds the parlays', /Parlays, −1\.3u/.test(await p.locator('#v-cast .statrow').innerText()));
    T('…no script errors', errs.length === 0, errs.join(' | ')); await ctx.close(); }
  /* ── Challenges + Leagues (v3.1.0) ── */
  { const L = (await import('./desk/chal-lib.js')).library(); const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message))); const posts = [];
    const runs = [], c7 = L.find(c => c.days === 7 && c.tier === 'normal'); let lgs = [{ lid: 'g1', name: 'Thanksgiving Week Classic', blurb: 'Turkey and D$.', starts: now - 864e5, ends: now + 5 * 864e5, bank: 1000, prizes: [5000, 2500, 1000], pool: 8500, sports: null, n: 41, max: 500, late: true, official: true, status: 'live', top: [{ name: 'BigShot', bal: 1640 }] },
      { lid: 'g2', name: 'December Hoops Invitational', blurb: '', starts: now + 9 * 864e5, ends: now + 30 * 864e5, bank: 2500, prizes: [10000, 5000], pool: 15000, sports: ['nba'], n: 12, max: 200, late: false, official: true, status: 'open', top: [] },
      { lid: 'g0', name: 'Week One Opener', blurb: '', starts: now - 20 * 864e5, ends: now - 13 * 864e5, bank: 1000, prizes: [2000, 1000, 500], pool: 3500, sports: null, n: 9, max: 500, late: true, official: true, status: 'final', top: [{ name: 'LoungeLizard', bal: 2210, prize: 2000 }] }];
    const leagues = [];
    const ME = () => ({ name: 'Tester', owner: true, lgOpen: true, xp: 860, rank: { name: 'Hustler', next: 1000, nextName: 'Sharp', pct: 0.72 }, trophies: { cakewalk: 2, easy: 1 }, xplog: [{ xp: 150, dd: 60, why: '🏆 Tip Jar' }], wallet: { bal: 1000, bought: 0, prize: 85, w: 0, l: 0, p: 0 }, tickets: [], bets: [], runs, leagues });
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.acct', JSON.stringify({ token: 'x'.repeat(32), name: 'Tester', exp: Date.now() + 864e5 }));
      localStorage.setItem('tdp.ddslip', JSON.stringify([{ k: 'nfl|WSH@NYG', mk: 'ml', side: 'home', sp: 'nfl', price: -130, pick: 'NYG ML' }])); } catch (e) { } });
    await p.route('**/*', r => { const u = new URL(r.request().url()), req = r.request();
      if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(BETA) });
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') { const body = req.method() === 'POST' ? JSON.parse(req.postData() || '{}') : null; if (body) posts.push([u.pathname, body]);
        const J = o => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
        if (u.pathname === '/acct/me') return J(ME());
        if (u.pathname === '/acct/chal') return J({ by: { [c7.id]: { live: 4, tries: 9, won: 3, fast: { name: 'BigShot', took: 30 * 36e5 } } }, leaders: [{ name: 'LoungeLizard', cid: c7.id, bal: 184, goal: 200, start: 100, ends: now + 2 * 864e5, pct: 88 }], recent: [{ name: 'BigShot', cid: c7.id, cname: c7.name, status: 'won', took: 30 * 36e5, prize: c7.prize }], xp: [{ name: 'BigShot', xp: 2140, rank: 'Sharp', won: 7 }], totals: {} });
        if (u.pathname === '/acct/lgs') return J({ leagues: lgs, open: false });
        if (u.pathname === '/acct/lgs/one') return J({ league: { ...lgs.find(g => g.lid === u.searchParams.get('id')) }, rows: [{ name: 'BigShot', bal: 1640, start: 1000, w: 4, l: 1, p: 0, open: 1, bets: 5 }, { name: 'Tester', bal: 1180, start: 1000, w: 2, l: 1, p: 0, open: 0, bets: 3 }] });
        if (u.pathname === '/acct/chal/join') { const run = { rid: 'run1', cid: body.id, name: 'Tester', ts: now, ends: now + c7.days * 864e5, start: c7.start, bal: c7.start, goal: c7.goal, route: body.route, status: 'live', open: 0, bets: 0, w: 0, l: 0, p: 0, cp: 0, buyIn: c7.start }; runs.unshift(run); return J({ run, wallet: { bal: 1000 - c7.start, bought: 0, prize: 85, w: 0, l: 0, p: 0, chalIn: c7.start } }); }
        if (u.pathname === '/acct/lgs/join') { leagues.push({ lid: body.id, name: 'Thanksgiving Week Classic', status: 'live', bal: 1000, start: 1000, open: 0 }); return J({ league: lgs[0], entry: { lid: body.id, bal: 1000, fee: 25 }, wallet: { bal: 975, bought: 0, prize: 85, w: 0, l: 0, p: 0, fees: 25 } }); }
        if (u.pathname === '/acct/bet') return J({ bet: { id: 'b1', stake: body.stake, mode: 'parlay', toWin: 19, legs: [], status: 'open' }, wallet: { bal: 1000, bought: 0, w: 0, l: 0, p: 0 }, run: null, entry: body.league ? { lid: body.league, bal: 975, open: 1 } : null });
        if (u.pathname === '/acct/lgs/create') { const g = { lid: 'g9', name: body.name, prizes: body.prizes }; lgs = [{ ...lgs[1], lid: 'g9', name: body.name, prizes: body.prizes, pool: body.prizes.reduce((a, x) => a + x, 0) }, ...lgs]; return J({ league: g }); }
        return J({ rows: [], n: 0 }); }
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.goto('https://desk.test/desk/#today', { waitUntil: 'load' }); await p.waitForTimeout(900);
    const bar = await p.evaluate(() => { const n = document.querySelector('.tabs'); const bs = [...n.querySelectorAll('button')]; return { n: bs.length, fits: bs.every(x => x.scrollWidth <= x.clientWidth + 1), labels: bs.map(x => x.innerText.trim()), over: document.documentElement.scrollWidth > innerWidth }; });
    T('the bottom bar has a Compete tab, still one row, every label fits', bar.n === 8 && bar.labels.includes('Compete') && bar.fits && !bar.over, JSON.stringify(bar));
    await p.click('.tabs [data-go="challenges"]'); await p.waitForTimeout(700); let t = await p.evaluate(() => document.querySelector('#v-challenges').innerText);
    T('Challenges: the player card (rank, XP to the next rank, trophies by tier, prizes), the challenge of the day, 1,000 to browse', /HUSTLER/i.test(t) && /860/.test(t) && /140 XP to Sharp/.test(t) && /LEGENDARY/i.test(t) && /D\$85 in prizes/.test(t) && /CHALLENGE OF THE DAY/i.test(t) && /1,000 of 1,000/.test(t), t.slice(0, 900));
    T('…24 cards at a time, each with its size, days, tier, rule, XP and D$ prize', (await p.locator('.cc2').count()) === 24 && /\+\d+ XP/.test(t) && /🏆 D\$\d+/.test(t));
    await p.click('[data-act="cxf"][data-k="d"][data-v="30"]'); await p.waitForTimeout(250); await p.click('[data-act="cxf"][data-k="t"][data-v="legendary"]'); await p.waitForTimeout(300);
    t = await p.evaluate(() => document.querySelector('#v-challenges').innerText); const n30 = L.filter(c => c.days === 30 && c.tier === 'legendary').length;
    T('filters: 30 days + Legendary narrows the 1,000 to just those', new RegExp(`${n30} of 1,000`).test(t) && (await p.evaluate(() => [...document.querySelectorAll('.cc2')].every(x => /30 days/.test(x.innerText) && /LEGENDARY/i.test(x.innerText)))), t.match(/\d+ of 1,000/));
    await p.click('[data-act="cxf"][data-k="d"][data-v="0"]'); await p.click('[data-act="cxf"][data-k="t"][data-v=""]'); await p.waitForTimeout(200);
    await p.fill('.cxf-q', c7.name); await p.waitForTimeout(600);
    T('search finds a challenge by name', (await p.locator('.cc2').count()) >= 1 && (await p.locator('.cc2').first().innerText()).includes(c7.name));
    await p.locator('.cc2').first().click(); await p.waitForTimeout(700); t = await p.evaluate(() => document.querySelector('.csheet').innerText);
    T('the sheet: number, why, the road map (six checkpoints to the vault), the day-by-day pace, every route with finish odds, the rules, XP and the D$ prize', new RegExp(`#${c7.n} OF 1,000`, 'i').test(t) && /WHY THIS ONE/i.test(t) && /The Corner/.test(t) && /The Vault/.test(t) && /Day 7/.test(t) && /PICK YOUR ROUTE/i.test(t) && (await p.locator('.csr').count()) === 8 && /best odds/i.test(t) && /\d+% bust/.test(t) && new RegExp(`\\+${c7.xp}`).test(t) && t.includes(`D$${c7.prize}`), t.slice(0, 700));
    /* css v38 · Nov 23: the sheet's notes (finish odds, who's running it) were cream on its cream paper */
    const shInk = await p.evaluate(() => [...document.querySelectorAll('.csheet .note')].map(el => { const c = getComputedStyle(el).color.match(/\d+(\.\d+)?/g).map(Number); return Math.round((c[0] + c[1] + c[2]) / 3); }));
    T('the sheet\'s notes write in ink on its paper (the finish-odds line was cream on cream)', shInk.length >= 1 && shInk.every(x => x < 90), JSON.stringify(shInk));
    T('D$ with cents always shows both digits on the sheet (D$931.90, never D$931.9)', /D\$[\d,]+\.\d\d/.test(t) && !/D\$[\d,]+\.\d(?!\d)/.test(t), (t.match(/D\$[\d,]+\.\d+/g) || []).slice(0, 8).join(' '));
    await p.click('.csr[data-route="snowball"]'); await p.waitForTimeout(300);
    T('…picking a route updates the start button', /Snowball route/.test(await p.locator('.cs-go').innerText()));
    /* v63 · Nov 23, Chris: "I do want challenge money to come from the players wallet" */
    T('…the start button is a buy-in from the wallet, and says what the wallet holds after it', new RegExp(`Buy in D\\$${c7.start.toLocaleString('en-US')}`).test(await p.locator('.cs-go').innerText()) && new RegExp(`Wallet D\\$1,000 → D\\$${(1000 - c7.start).toLocaleString('en-US')} after the buy-in`).test(await p.locator('.cs-go').innerText()) && /buy-in is D\$[\d,]+ from your wallet[^]*goes back to your wallet/.test(await p.locator('.cs-rules').innerText()), await p.locator('.cs-go').innerText());
    await p.click('.cs-go [data-act="chaljoin"]'); await p.waitForTimeout(700); t = await p.evaluate(() => document.querySelector('#v-challenges').innerText);
    T('…the buy-in comes off the wallet the moment the run starts, and the run card says so', new RegExp(`D\\$${(1000 - c7.start).toLocaleString('en-US')} in your wallet`).test(t) && new RegExp(`Bought in for D\\$${c7.start.toLocaleString('en-US')} from your wallet`).test(t), t.slice(0, 700));
    T('Start → your run: bankroll vs goal, the road map with pace, today\'s order on its route, finish odds', posts.some(([u, bd]) => u === '/acct/chal/join' && bd.id === c7.id && bd.route === 'snowball') && /YOUR RUNS/i.test(t) && /TODAY’S ORDER · 🎲 SNOWBALL/i.test(t) && /FINISH ODDS/i.test(t) && /pace/i.test(t) && (await p.locator('.runcard .rd-cp').count()) === 6, t.slice(0, 900));
    await p.click('[data-act="runuse"]'); await p.waitForTimeout(700);
    const from = await p.evaluate(() => { const s = document.querySelector('#ddFrom'); return s ? [s.value, [...s.options].map(o => o.text)] : null; });
    T('Bet from this run → the Slate, the slip bets from the run', from && from[0] === 'run:run1' && /Wallet/.test(from[1][0]) && from[1][1].includes(c7.name), JSON.stringify(from));
    await p.fill('#ddStake', '25'); await p.click('[data-act="ddplace"]'); await p.waitForTimeout(500);
    T('…placing sends the run with the bet', posts.some(([u, bd]) => u === '/acct/bet' && bd.run === 'run1' && bd.stake === 25));
    await p.click('.tabs [data-go="challenges"]'); await p.waitForTimeout(300); await p.click('.compsw [data-go="leagues"]'); await p.waitForTimeout(800); t = await p.evaluate(() => document.querySelector('#v-leagues').innerText);
    T('Leagues: live, open and final leagues; prize pools and payouts, dates and countdowns, bankroll, players, sports; the hall of champions', /LIVE NOW/i.test(t) && /OPEN FOR SIGN-UPS/i.test(t) && /FINAL/i.test(t) && /D\$8,500/.test(t) && /🥇 D\$5,000/.test(t) && /left/.test(t) && /Starts in 8d|Starts in 9d/.test(t) && /41\/500/.test(t) && /HALL OF CHAMPIONS/i.test(t) && /LoungeLizard/.test(t) && /\+D\$2,000/.test(t), t.slice(0, 1200));
    T('…the owner gets "Open a league"', /Open a league/.test(t));
    /* v63 · Nov 23, Chris: "to sign up for leagues there should be a signup fee (D$25 for starters)" */
    T('every league says its entry fee, and the join button says it comes out of the wallet', /D\$25 entry/.test(t) && /Join · D\$25 from your wallet/.test(await p.locator('.lgc [data-act="lgjoin"][data-lid="g1"]').innerText()), t.slice(0, 500));
    await p.click('.lgc [data-act="lgjoin"][data-lid="g1"]'); await p.waitForTimeout(800); t = await p.evaluate(() => document.querySelector('#v-leagues').innerText);
    T('Join → you\'re in with the league bankroll, and you can bet from it', posts.some(([u, bd]) => u === '/acct/lgs/join' && bd.id === 'g1') && /You: D\$1,000/.test(t) && (await p.locator('[data-act="lguse"]').count()) === 1, t.slice(0, 600));
    await p.click('[data-act="lgopen"][data-lid="g1"]'); await p.waitForTimeout(700); t = await p.evaluate(() => document.querySelector('#v-leagues').innerText);
    T('Standings: bankrolls, ROI, what each place is in line for', /BigShot/.test(t) && /\+64\.0%/.test(t) && /in line for D\$5,000/.test(t), t.slice(0, 900));
    await p.evaluate(() => localStorage.setItem('tdp.ddslip', JSON.stringify([{ k: 'nfl|WSH@NYG', mk: 'ml', side: 'home', sp: 'nfl', price: -130, pick: 'NYG ML' }]))); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200);
    await p.click('[data-act="lguse"]'); await p.waitForTimeout(600); await p.fill('#ddStake', '25'); await p.click('[data-act="ddplace"]'); await p.waitForTimeout(500);
    T('a league bet sends the league with it', posts.some(([u, bd]) => u === '/acct/bet' && bd.league === 'g1'));
    await p.click('.tabs [data-go="challenges"]'); await p.waitForTimeout(300); await p.click('.compsw [data-go="leagues"]'); await p.waitForTimeout(500);
    await p.click('.lgnew summary'); await p.fill('form[data-form="lgsnew"] input[name="name"]', 'Bowl Season Bash'); await p.fill('form[data-form="lgsnew"] input[name="prizes"]', '20000, 5000');
    /* v36 · Nov 23 ("the text is unseeable"): the page runs color-scheme:dark, so a field with no color of its own wrote light text on the cream paper */
    const ink = await p.evaluate(() => [...document.querySelectorAll('form[data-form="lgsnew"] input:not([type="checkbox"]), form[data-form="lgsnew"] select, form[data-form="lgsnew"] textarea')].map(el => { const c = getComputedStyle(el).color.match(/\d+(\.\d+)?/g).map(Number), b = getComputedStyle(el).backgroundColor.match(/\d+(\.\d+)?/g).map(Number); const L = x => 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]; return { n: el.name || el.type, fg: Math.round(L(c)), bg: Math.round(L(b)) }; }));
    T('the league form writes in ink: every field\'s text dark on its light paper (name, pitch, dates, bankroll, players, prizes)', ink.length >= 5 && ink.every(o => o.fg < 90 && o.bg > 200), JSON.stringify(ink));
    await p.click('form[data-form="lgsnew"] button[type="submit"]'); await p.waitForTimeout(900);
    T('the owner opens a league: name, dates, bankroll, prizes reach the server; it shows up', posts.some(([u, bd]) => u === '/acct/lgs/create' && bd.name === 'Bowl Season Bash' && bd.prizes[0] === 20000 && bd.ends > bd.starts && bd.bank === 1000) && /Bowl Season Bash/.test(await p.evaluate(() => document.querySelector('#v-leagues').innerText)));
    /* v58 · Nov 23, Chris: "Can we have a share option for the leagues" */
    await p.evaluate(() => { window.__shared = []; Object.defineProperty(navigator, 'share', { configurable: true, value: d => { window.__shared.push(d); return Promise.resolve(); } }); });
    for (const id of ['g9', 'g1', 'g0']) { await p.click(`[data-lgc="${id}"] [data-act="lgshare"]`); await p.waitForTimeout(200); }
    const sh = await p.evaluate(() => window.__shared), lab = await p.evaluate(() => ['g9', 'g0'].map(id => document.querySelector(`[data-lgc="${id}"] [data-act="lgshare"]`).textContent.trim()));
    T('every league card has an invite: the share sheet gets the league, its numbers, that D$ is play money, and a link that opens it', sh.length === 3 && sh[0].title === 'Bowl Season Bash · TheDesk' && sh[0].url === 'https://ironsilkweekly.com/desk/#lg=g9' && /^Join me in Bowl Season Bash on TheDesk\.\nD\$2,500 bankroll each · D\$25,000 prize pool · \w{3} \d+ – \w{3} \d+\nD\$25 to join, in Desk Dollars: play money, never cash\. 21\+\.$/.test(sh[0].text) && lab[0] === '↗ Invite', JSON.stringify(sh[0]) + ' ' + lab);
    T('…a live one says you can still get in (late joins on, room left); a final one is a "Share" with who took the crown', /^Thanksgiving Week Classic is live on TheDesk, and you can still get in\.\nTurkey and D\$\./.test(sh[1].text) && sh[1].url === 'https://ironsilkweekly.com/desk/#lg=g1' && /^Week One Opener is final on TheDesk: LoungeLizard took the crown with D\$2,210\./.test(sh[2].text) && lab[1] === '↗ Share', JSON.stringify([sh[1].text, sh[2].text, lab]));
    await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); window.__clip = ''; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip = t; return Promise.resolve(); } } }); });
    await p.click('[data-lgc="g2"] [data-act="lgshare"]'); await p.waitForTimeout(300);
    const clip = await p.evaluate(() => window.__clip), tst = await p.evaluate(() => (document.querySelector('#toast') || {}).textContent || '');
    T('…no share sheet (a desktop browser): the invite is copied, link and all', /^Join me in December Hoops Invitational on TheDesk\.[\s\S]*21\+\.\nhttps:\/\/ironsilkweekly\.com\/desk\/#lg=g2$/.test(clip) && /Invite copied/.test(tst), JSON.stringify([clip, tst]));
    const p2 = p, errs2 = errs; await p2.goto('https://desk.test/desk/?land=1#lg=g1', { waitUntil: 'load' }); await p2.waitForTimeout(1600);   /* (a fresh load, as a tapped link does) */
    const land = await p2.evaluate(() => ({ tab: !document.querySelector('#v-leagues').hidden, lit: !!document.querySelector('[data-lgc="g1"].lit'), open: /BigShot/.test((document.querySelector('[data-lgc="g1"]') || {}).innerText || ''), hide: /Hide standings/.test((document.querySelector('[data-lgc="g1"]') || {}).innerText || '') }));
    T('the link lands: #lg=<id> opens the Leagues tab on that league, lit up, its standings open', land.tab && land.lit && land.open && land.hide && !errs2.length, JSON.stringify(land) + ' ' + errs2.join(' | '));
    T('…no script errors', errs.length === 0, errs.join(' | ')); await ctx.close(); }
  /* ── the owner's dashboard (v3.1.1) ── */
  { const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message))); const posts = [];
    const users = [{ name: 'TheDesk', owner: true, at: now - 9e8, seen: now, visits: 40, bal: 1000, bought: 0, prize: 0, w: 0, l: 0, xp: 0, rank: 'Rookie', runs: 0, lgs: 0, sus: false, note: '' },
      { name: 'BigShot', at: now - 864e5 * 3, seen: now - 36e5, visits: 12, bal: 4120, bought: 0, prize: 250, w: 9, l: 3, xp: 2140, rank: 'Sharp', runs: 2, lgs: 1, sus: false, note: 'whale' },
      { name: 'Spammer9', at: now - 36e5, seen: now - 6e5, visits: 2, bal: 1000, bought: 0, prize: 0, w: 0, l: 0, xp: 0, rank: 'Rookie', runs: 0, lgs: 0, sus: false, note: '' }];
    const ST = { k: { members: 3, new1: 1, new7: 2, act1: 3, act7: 3, dd: 6120, bought: 0, prizes: 250, staked: 900, open: 4, bets: 20, settled: 16, runs: 2, runsWon: 1, lgLive: 1, lgAll: 2, unread: 2, threads: 1, sus: 0, chatDay: 14, chatTotal: 120, bans: 0, paid: null },
      days: Array.from({ length: 14 }, (_, i) => ({ d: new Date(now - (13 - i) * 864e5).toISOString().slice(0, 10), n: i % 3, act: i % 4 + 1 })), users, cfg: { lgOpen: false, envOpen: false, store: false } };
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.acct', JSON.stringify({ token: 'x'.repeat(32), name: 'TheDesk', exp: Date.now() + 864e5 })); localStorage.setItem('tdp.adtab', '"overview"'); } catch (e) { } });
    await p.route('**/*', r => { const u = new URL(r.request().url()), req = r.request();
      if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(BETA) });
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') { const body = req.method() === 'POST' ? JSON.parse(req.postData() || '{}') : {}; posts.push([u.pathname, body]); const J = o => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
        if (u.pathname === '/acct/me') return J({ name: 'TheDesk', owner: true, wallet: { bal: 1000, bought: 0, w: 0, l: 0, p: 0 }, tickets: [], bets: [], runs: [], leagues: [], inbox: { msgs: [], unread: 0 } });
        if (u.pathname === '/acct/admin') { const a = body.act;
          if (a === 'stats') return J(ST);
          if (a === 'user') return J({ user: { name: body.name, at: now - 864e5 * 3, seen: now - 36e5, visits: 12, wallet: { bal: 4120, bought: 0, prize: 250, w: 9, l: 3, p: 0, staked: 900 }, xp: 2140, rank: { name: 'Sharp' }, trophies: {}, xplog: [{ why: '🏆 Puck Chalk Payday', xp: 305, dd: 180 }], note: 'whale', sus: false, sessions: 2 }, bets: [{ stake: 50, status: 'won', legs: [{ pick: 'NYG ML' }] }], runs: [], leagues: [], inbox: [] });
          if (a === 'inbox') return J({ threads: [{ key: 'bigshot', name: 'BigShot', last: now - 6e5, unread: 2, n: 2, preview: 'When does the next league open?', from: 'me' }] });
          if (a === 'thread' || a === 'reply') return J({ thread: { name: 'BigShot', msgs: [{ from: 'me', text: 'When does the next league open?', t: now - 6e5 }, ...(a === 'reply' ? [{ from: 'desk', text: body.text, t: now }] : [])] } });
          if (a === 'chat') return J({ messages: [{ id: 'm1', name: 'Spammer9', text: 'buy my picks!!!', ts: now - 6e4 }], mutes: [], bans: body.sub === 'ban' ? ['spammer9'] : [], invites: [], total: 120, day: 14 });
          return J({ ok: true, wallet: { bal: 4370 }, xp: 2240, n: 2 }); }
        return J({ rows: [], n: 0, leagues: [], by: {}, leaders: [], recent: [], xp: [] }); }
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.goto('https://desk.test/desk/#me', { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.click('[data-go="admin"].btn'); await p.waitForTimeout(800); let t = await p.evaluate(() => document.querySelector('#v-admin').innerText);
    T('Admin (owner only): members, new and active, paid subscribers (Whop not connected), unread, D$ in wallets, prizes, bets, runs, leagues, chat, the 14-day chart, biggest bankrolls', /MEMBERS/i.test(t) && /\+1 today · \+2 this week/.test(t) && /Paid subscribers/i.test(t) && /Whop isn’t connected/.test(t) && /Unread messages/i.test(t) && /D\$6,120/.test(t) && /D\$250 paid in prizes/.test(t) && /Open bets/i.test(t) && /Chat messages today/i.test(t) && /LAST 14 DAYS/i.test(t) && /BIGGEST BANKROLLS/i.test(t) && (await p.locator('.adchart > div').count()) === 14, t.slice(0, 1000));
    await p.click('.adtabs [data-v="members"]'); await p.waitForTimeout(400); t = await p.evaluate(() => document.querySelector('#v-admin').innerText);
    T('Members: every name, balance, rank, XP, last seen, visits (record on wider screens)', /BigShot/.test(t) && /D\$4,120/.test(t) && /Sharp · 2140 XP/.test(t) && /1h ago/.test(t) && /12 visits/.test(t) && /Spammer9/.test(t), t.slice(250, 1100));
    await p.click('.adtr[data-name="BigShot"]'); await p.waitForTimeout(700); t = await p.evaluate(() => document.querySelector('.adpanel').innerText);
    T('…tap a member: wallet, record, XP, devices, their bets and XP log, and the actions (give/take D$, XP, note, suspend, sign out, message, delete)', /BigShot/.test(t) && /2 signed-in devices/.test(t) && /D\$4,120/.test(t) && /NYG ML/.test(t) && /Puck Chalk Payday/.test(t) && /Suspend/.test(t) && /Sign out everywhere/.test(t) && /Delete account/.test(t), t.slice(0, 700));
    await p.fill('form[data-form="admoney"] input[name="amt"]', '250'); await p.click('form[data-form="admoney"] button'); await p.waitForTimeout(500);
    T('…giving D$ as a prize hits the server', posts.some(([u, bd]) => u === '/acct/admin' && bd.act === 'grant' && bd.name === 'BigShot' && bd.amount === 250 && bd.kind === 'prize'));
    await p.click('[data-act="adsus"]'); await p.click('[data-act="adsus"]'); await p.waitForTimeout(500);
    T('…suspend takes a second tap to confirm, then goes', posts.some(([u, bd]) => bd.act === 'suspend' && bd.name === 'BigShot'));
    await p.click('.adpanel .cs-x'); await p.click('.adtabs [data-v="inbox"]'); await p.waitForTimeout(600); t = await p.evaluate(() => document.querySelector('#v-admin').innerText);
    T('Inbox: threads with unread counts and a broadcast to everyone', /BigShot/.test(t) && /When does the next league open/.test(t) && /Message every member/.test(t), t.slice(0, 500));
    await p.click('[data-act="adthread"]'); await p.waitForTimeout(500); await p.fill('form[data-form="adreply"] textarea', 'Friday at noon.'); await p.click('form[data-form="adreply"] button'); await p.waitForTimeout(500);
    T('…open a thread and reply', posts.some(([u, bd]) => bd.act === 'reply' && bd.text === 'Friday at noon.') && /Friday at noon/.test(await p.evaluate(() => document.querySelector('#v-admin').innerText)));
    await p.click('.adtabs [data-v="chat"]'); await p.waitForTimeout(600); t = await p.evaluate(() => document.querySelector('#v-admin').innerText);
    T('Chat: the latest messages with delete, mute and ban; invite codes', /Spammer9/.test(t) && /buy my picks/.test(t) && /Delete/.test(t) && /Mute 1h/.test(t) && /Ban/.test(t) && /New invite code/.test(t));
    await p.click('[data-act="adcban"]'); await p.click('[data-act="adcban"]'); await p.waitForTimeout(500);
    T('…ban from the chat', posts.some(([u, bd]) => bd.act === 'chat' && bd.sub === 'ban' && bd.name === 'Spammer9'));
    await p.click('.adtabs [data-v="settings"]'); await p.waitForTimeout(300); await p.click('[data-act="adlgopen"]'); await p.waitForTimeout(400);
    T('Settings: the switch that lets members open leagues', posts.some(([u, bd]) => bd.act === 'cfg' && bd.lgOpen === true));
    T('…no script errors', errs.length === 0, errs.join(' | ')); await ctx.close(); }
  { const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const posts = [];
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.acct', JSON.stringify({ token: 'x'.repeat(32), name: 'Tester', exp: Date.now() + 864e5 })); } catch (e) { } });
    await p.route('**/*', r => { const u = new URL(r.request().url()), req = r.request();
      if (/\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(/picks/.test(u.pathname) ? BETA : SLATE) });
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') { const body = req.method() === 'POST' ? JSON.parse(req.postData() || '{}') : {}; posts.push([u.pathname, body]); const J = o => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
        if (u.pathname === '/acct/me') return J({ name: 'Tester', wallet: { bal: 1000, bought: 0, w: 0, l: 0, p: 0 }, tickets: [], bets: [], runs: [], leagues: [], inbox: { msgs: [{ from: 'desk', text: 'Leagues open Friday.', t: now, all: true }], unread: 1 } });
        if (u.pathname === '/acct/inbox/send') return J({ inbox: { msgs: [{ from: 'desk', text: 'Leagues open Friday.', t: now }, { from: 'me', text: body.text, t: now }], unread: 0 } });
        if (u.pathname === '/acct/admin') return r.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"owner only"}' });
        return J({ ok: true, rows: [] }); }
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.goto('https://desk.test/desk/#me', { waitUntil: 'load' }); await p.waitForTimeout(1000);
    let t = await p.evaluate(() => document.querySelector('#v-me').innerText);
    T('a member: an unread dot on the account button, "Message the desk · 1 new"', await p.evaluate(() => document.querySelector('#acctBtn').classList.contains('dot')) && /Message the desk/.test(t) && /1 new/.test(t), t.slice(0, 500));
    await p.click('.myinbox summary'); await p.waitForTimeout(400); t = await p.evaluate(() => document.querySelector('#v-me').innerText);
    T('…opening it shows the desk\'s message and clears the dot', /Leagues open Friday/.test(t) && /The desk · to everyone/.test(t) && !(await p.evaluate(() => document.querySelector('#acctBtn').classList.contains('dot'))) && posts.some(([u]) => u === '/acct/inbox/read'), t.slice(0, 500));
    await p.fill('form[data-form="mymsg"] textarea', 'Can I get a league invite?'); await p.click('form[data-form="mymsg"] button'); await p.waitForTimeout(500);
    T('…they write back', posts.some(([u, bd]) => u === '/acct/inbox/send' && bd.text === 'Can I get a league invite?'));
    await p.goto('https://desk.test/desk/#admin', { waitUntil: 'load' }); await p.waitForTimeout(800);
    T('…and the Admin page is closed to them (no link, no dashboard)', /for the desk only/.test(await p.evaluate(() => document.querySelector('#v-admin').innerText)) && !(await p.evaluate(() => document.body.classList.contains('is-owner'))) && !posts.some(([u]) => u === '/acct/admin'));
    await ctx.close(); }
  /* ── inside Telegram (Mini App) ── */
  { const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
    await p.route('**/*', r => { const u = new URL(r.request().url());
      if (u.hostname === 'telegram.org') return r.fulfill({ contentType: 'text/javascript', body: '/* stub */' });
      if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(BETA) });
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.addInitScript(() => { window.__TG = { calls: [], back: null }; const L = n => (...a) => window.__TG.calls.push(n);
      window.Telegram = { WebApp: { initData: 'query_id=x&user=%7B%7D&hash=y', platform: 'ios', initDataUnsafe: { start_param: 'props' }, ready: L('ready'), expand: L('expand'), disableVerticalSwipes: L('noswipe'),
        setHeaderColor: L('header'), setBackgroundColor: L('bg'), openLink: L('openLink'), openTelegramLink: L('openTgLink'),
        BackButton: { show: () => { window.__TG.back = 'shown'; }, hide: () => { window.__TG.back = 'hidden'; }, onClick: f => { window.__TG.backFn = f; } } } }; });
    await p.goto('https://desk.test/desk/#tgWebAppData=query_id%3Dx&tgWebAppVersion=8.0', { waitUntil: 'load' }); await p.waitForTimeout(1000);
    const st = await p.evaluate(() => ({ tg: document.documentElement.classList.contains('tg'), calls: window.__TG.calls, back: window.__TG.back, props: !document.querySelector('#v-props').hidden,
      chip: (() => { const c = document.querySelector('#installChip'); return !c || getComputedStyle(c).display === 'none'; })(), guide: !!document.querySelector('#gT') }));
    T('Telegram Mini App: opens full screen in Telegram mode, swipe-down won\'t close it, our colors', st.tg && ['ready', 'expand', 'noswipe', 'header', 'bg'].every(c => st.calls.includes(c)), JSON.stringify(st));
    T('…the lounge link\'s start param opens straight on Props, with Telegram\'s back button', st.props && st.back === 'shown', JSON.stringify(st));
    T('…no "Get the app" and no home-screen guide inside Telegram', st.chip && !st.guide, JSON.stringify(st));
    await p.evaluate(() => window.__TG.backFn()); await p.waitForTimeout(300);
    T('…Telegram\'s back button goes home to Today (and hides there)', await p.evaluate(() => !document.querySelector('#v-today').hidden && window.__TG.back === 'hidden'));
    T('…no script errors in Telegram', errs.length === 0, errs.join(' | ')); await ctx.close(); }
  /* ── pull to refresh ── */
  { v = await visit(BETA); let pulls = 0; await v.p.route('**/picks.json*', r => { pulls++; r.continue(); });
    const fire = async (type, y) => v.p.evaluate(([type, y]) => { const t = new Touch({ identifier: 1, target: document.body, clientX: 200, clientY: y }); document.body.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true })); }, [type, y]);
    await v.p.evaluate(() => scrollTo(0, 0)); await fire('touchstart', 100); await fire('touchmove', 180); const mid = await v.p.locator('.ptr').innerText();
    await fire('touchmove', 300); const ready = await v.p.locator('.ptr').innerText(); await fire('touchend', 300); await v.p.waitForTimeout(1200);
    T('pull to refresh: pull down from the top, past the line, let go → it reloads the card', /Pull to refresh/.test(mid) && /Let go to refresh/.test(ready) && pulls >= 1, JSON.stringify([mid, ready, pulls]));
    T('pull to refresh: no script errors', v.errs.length === 0, v.errs.join(' | ')); await v.ctx.close(); }
  /* ── accounts + your tickets (v3.0.21) ── */
  { const users = {}, tix = {}; let lastSave = null, lastBet = null;
    const acctSrv = async (r, u) => { const ok = o => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) }); const no = (st, e) => r.fulfill({ status: st, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: e }) });
      const b = JSON.parse(r.request().postData() || '{}'); const who = tk => Object.keys(users).find(n => users[n].tok === tk);
      if (u.pathname === '/acct/board') return ok({ rows: [{ name: 'Puck Head', bal: 1200, bought: 0, earned: 1200, w: 3, l: 1, roi: 12.5 }, { name: 'Big Spender', bal: 6000, bought: 5000, earned: 1000, w: 0, l: 0, roi: null }], n: 2 });
      if (u.pathname === '/acct/signup') { if (b.age21 !== true) return no(400, 'TheDesk is for 21 and over'); users[b.name] = { pass: b.pass, tok: 'k'.repeat(30) + b.name.length }; tix[b.name] = []; return ok({ token: users[b.name].tok, name: b.name }); }
      if (u.pathname === '/acct/login') return users[b.name] && users[b.name].pass === b.pass ? ok({ token: users[b.name].tok, name: b.name }) : no(403, 'that username and password don’t match');
      const n = who(b.token); if (!n) return no(401, 'sign in first');
      if (u.pathname === '/acct/me') return ok({ name: n, tickets: tix[n], wallet: users[n].W || (users[n].W = { bal: 1000, bought: 0, w: 0, l: 0, p: 0 }), bets: users[n].bets || [] });
      if (u.pathname === '/acct/bet') { lastBet = b; const W = users[n].W; W.bal -= b.stake; const bet = { id: 'b1', stake: b.stake, toWin: 124, status: 'open', legs: b.legs.map(l => ({ ...l, pick: 'NE ML', price: 124, game: 'NE@DET', sp: 'nfl', t: Date.now() + 9e6, res: null })) }; (users[n].bets = users[n].bets || []).unshift(bet); return ok({ bet, wallet: W }); }
      if (u.pathname === '/acct/save') { lastSave = b.ticket; const L = tix[n]; const i = L.findIndex(x => x.id === b.ticket.id); if (i >= 0) L[i] = b.ticket; else L.unshift(b.ticket); return ok({ ticket: b.ticket }); }
      if (u.pathname === '/acct/del') { tix[n] = tix[n].filter(x => x.id !== b.id); return ok({ ok: true }); }
      return ok({ ok: true }); };
    v = await visit(BETA, { chat: acctSrv }); await v.p.click('#acctBtn'); await v.p.waitForTimeout(300); t = await v.text();
    T('Accounts: the person button opens sign-in (username + password)', /YOUR ACCOUNT/i.test(t) && (await v.p.locator('form[data-form="acct"]').count()) === 1);
    await v.p.click('[data-act="acmode"][data-v="signup"]'); await v.p.fill('form[data-form="acct"] input[name="name"]', 'Puck Head'); await v.p.fill('form[data-form="acct"] input[name="pass"]', 'longenough1');
    await v.p.check('form[data-form="acct"] input[name="age21"]'); await v.p.click('form[data-form="acct"] button[type="submit"]'); await v.p.waitForTimeout(300);
    await v.p.waitForTimeout(1300); const gOpen = await v.p.locator('#gT').count(); const gTxt = gOpen ? await v.p.locator('#guideRoot').innerText() : ''; if (gOpen) await v.p.click('[data-act="guide-done"]'); await v.p.waitForTimeout(200);
    T('…right after signing up in a browser, the save-as-app guide opens: saved as an app you stay signed in', gOpen === 1 && /stay signed in/.test(gTxt), gTxt.slice(0, 200));
    t = await v.text();
    T('…create an account (21+ box) → signed in, the button shows your initial', /Signed in as Puck Head/.test(t) && (await v.p.locator('#acctBtn.in').textContent()) === 'P');
    /* v76 · tickets live on My tickets (the top bar's ticket button), Active / Graded */
    await v.p.click('#tixBtn'); await v.p.waitForTimeout(300);
    await v.p.click('.newtk summary'); await v.p.fill('form[data-form="newtk"] textarea', 'Bills -3 -110\nOver 221.5 -105'); await v.p.fill('form[data-form="newtk"] input[name="stake"]', '5');
    await v.p.click('form[data-form="newtk"] button'); await v.p.waitForTimeout(400); t = await v.text();
    T('…type your own legs → a ticket with prices, the odds and what $5 pays', lastSave && lastSave.legs.length === 2 && lastSave.legs[0].price === -110 && /Bills -3/.test(t) && /\$5 to win/.test(t), JSON.stringify(lastSave));
    await v.p.click('.mytk [data-act="tkmark"][data-v="hit"] >> nth=0'); await v.p.waitForTimeout(300); t = await v.text();
    T('…mark a leg as it settles; it saves', lastSave.legs[0].res === 'hit' && /Live · 1 of 2/i.test(t), JSON.stringify(lastSave.legs));
    await v.p.click('.tabs [data-go="props"]'); await v.p.click('.pcard [data-act="pslip"] >> nth=0'); await v.p.waitForTimeout(200); await v.p.click('[data-act="psliptrack"]'); await v.p.waitForTimeout(400);
    T('…build a slip on Props → Track it saves it to your tickets', lastSave && lastSave.legs[0].src === 'prop' && /Kaprizov|Edwards/.test(lastSave.legs[0].pick) && !(await v.p.locator('.pslipbar').count()), JSON.stringify(lastSave));
    await v.p.click('#acctBtn'); await v.p.waitForTimeout(400); t = await v.text();
    T('Desk Dollars: D$1,000 in the wallet; the leaderboard ranks earned D$, bought shown apart', /D\$1,000/.test(t) && /THE LEADERBOARD/i.test(t) && /\+D\$5,000 bought/.test(t), JSON.stringify([/D\$1,000/.test(t), /THE LEADERBOARD/i.test(t), /\+D\$5,000 bought/.test(t), (t.match(/leaderboard[^]{0,300}/i)||[])[0]]));
    await v.p.click('.tabs [data-go="slate"]'); await v.p.waitForTimeout(500);
    const gk = await v.p.evaluate(() => { const b = [...document.querySelectorAll('.game > button[data-act="game"]')]; return b.length ? b[0].dataset.k : null; });
    if (gk) { await v.p.click(`.game > button[data-k="${gk}"]`); await v.p.waitForTimeout(300); }
    const nb = await v.p.locator('.ddb').count();
    const gks = await v.p.evaluate(() => [...document.querySelectorAll('.game > button[data-act="game"]')].map(b => b.dataset.k));
    if (nb && gks.length > 1) { await v.p.click('.ddb >> nth=0'); await v.p.waitForTimeout(200); await v.p.click(`.game > button[data-k="${gks[1]}"]`); await v.p.waitForTimeout(300); await v.p.click('.ddb >> nth=2'); await v.p.waitForTimeout(200);
      T('D$ parlays across games (one leg in each)', (await v.p.evaluate(() => JSON.parse(localStorage.getItem('tdp.ddslip') || '[]').length)) === 2, JSON.stringify([gks.slice(0, 3), await v.p.evaluate(() => localStorage.getItem('tdp.ddslip'))])); await v.p.click('[data-act="ddclear"]'); await v.p.click(`.game > button[data-k="${gk}"]`); await v.p.waitForTimeout(300);
      await v.p.click('.ddb >> nth=0'); await v.p.click('.ddb >> nth=2'); await v.p.click('.ddb >> nth=1'); await v.p.waitForTimeout(200);
      const sl = await v.p.evaluate(() => JSON.parse(localStorage.getItem('tdp.ddslip') || '[]').map(l => l.mk).sort().join());
      T('…per game: moneyline or spread, plus the total (the spread pushes the moneyline out, with a note)', sl === 'spread,total' && /moneyline or spread, plus the total/.test(await v.text()), sl);
      await v.p.click('[data-act="ddmode"][data-v="sgp"]'); await v.p.waitForTimeout(200);
      T('…SGP mode takes the same game picks', /SGP/.test(await v.text()) && !(await v.p.locator('.ddwarn').count()));
      await v.p.click('[data-act="ddmode"][data-v="parlay"]'); await v.p.waitForTimeout(200); await v.p.click('[data-act="ddclear"]'); await v.p.waitForTimeout(200); }
    if (nb) { await v.p.click('.ddb >> nth=0'); await v.p.waitForTimeout(200); await v.p.fill('#ddStake', '100'); await v.p.click('[data-act="ddplace"]'); await v.p.waitForTimeout(400); }
    T('…open a Slate game, tap a line, place D$100: the server gets the game, market and side (never a price)', nb >= 4 && lastBet && lastBet.stake === 100 && lastBet.legs[0].k === gk && !('price' in lastBet.legs[0]), JSON.stringify([nb, lastBet]));
    T('accounts: no script errors', v.errs.length === 0, v.errs.join(' | '));
    await v.ctx.close(); }
  /* ── the members' chat ── */
  const CHATLOG = [{ id: '1', name: 'Hoops Fan', owner: false, text: 'Wolves -6 feels right <img src=x onerror="window.__xss=11">', ts: now - 6e5 }, { id: '2', name: 'TheDesk', owner: true, text: 'Card is locked.', ts: now - 3e5 }];
  const chatSrv = (log, joinAs) => async (r, u) => { const ok = o => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
    if (u.pathname === '/chat/history') return ok({ messages: log });
    const b = JSON.parse(r.request().postData() || '{}');
    if (u.pathname === '/chat/join') return b.code === 'DESK-GOOD1' || joinAs ? ok({ token: 't'.repeat(32), name: joinAs ? 'TheDesk' : b.name, owner: !!joinAs, exp: Date.now() + 864e5 }) : r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'that invite code doesn’t work' }) });
    if (u.pathname === '/chat/send') { const m = { id: String(log.length + 1), name: 'Puck Head', owner: false, text: b.text, ts: Date.now() }; log.push(m); return ok({ message: m }); }
    if (u.pathname === '/chat/mod') return ok(b.act === 'invite' ? { code: 'DESK-NEW42', uses: 25 } : { ok: true });
    return r.abort(); };
  v = await visit(FEEDS.morning, { tab: 'chat', chat: chatSrv([...CHATLOG]) }); await v.p.waitForTimeout(500); t = await v.text();
  T('Chat: anyone can read the room; messages show as plain text; the desk\'s posts are marked', /Wolves -6 feels right <img/.test(t) && /Card is locked/.test(t) && (await v.p.locator('.msg.own').count()) === 1 && (await v.p.evaluate(() => window.__xss || 0)) === 0);
  T('…posting takes a name and an invite code', (await v.p.locator('form[data-form="chat-join"]').count()) === 1 && !(await v.p.locator('#chatText').count()));
  await v.p.fill('input[name="name"]', 'Puck Head'); await v.p.fill('input[name="code"]', 'DESK-BAD00'); await v.p.click('form[data-form="chat-join"] button'); await v.p.waitForTimeout(300);
  T('…a bad code says so', /that invite code doesn’t work/.test(await v.text()));
  await v.p.fill('input[name="code"]', 'DESK-GOOD1'); await v.p.click('form[data-form="chat-join"] button'); await v.p.waitForTimeout(400);
  await v.p.fill('#chatText', 'Wild ML is the lock tonight'); await v.p.keyboard.press('Enter'); await v.p.waitForTimeout(400); t = await v.text();
  T('…with a good code you\'re in: Enter sends, and your message lands in the room', /Posting as Puck Head/.test(t) && /Wild ML is the lock tonight/.test(t) && !(await v.p.locator('.msg-mod').count()));
  T('chat: no script errors, no sideways scroll', v.errs.length === 0 && (await v.p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, v.errs.join(' | '));
  await v.ctx.close();
  v = await visit(FEEDS.morning, { tab: 'chat', chat: chatSrv([...CHATLOG], true), query: '?embed=1' }); await v.p.waitForTimeout(400);
  await v.p.fill('input[name="code"]', 'owner-code'); await v.p.fill('input[name="name"]', 'x1'); await v.p.click('form[data-form="chat-join"] button'); await v.p.waitForTimeout(400);
  await v.p.click('[data-act="chat-invite"]'); await v.p.waitForTimeout(300); t = await v.text();
  T('inside the desk\'s own app (?embed=1): no header or tabs; the owner gets delete / mute / ban and makes invite codes', !(await v.p.locator('.tabs').isVisible()) && !(await v.p.locator('header.top').isVisible()) && (await v.p.locator('[data-act="chat-ban"]').count()) === 1 && (await v.p.locator('[data-act="chat-del"]').count()) === 2 && /DESK-NEW42/.test(t));
  await v.ctx.close();

  /* ── graded ── */
  v = await visit(FEEDS.final); t = await v.text();
  T('at the final each slip is stamped (two wins, one loss) and the card is summed up', (await v.p.locator('.stamp:not(.loss):not(.push)').count()) === 2 && (await v.p.locator('.stamp.loss').count()) === 1 && /went 2–1/.test(t) && /\+0\.84 units/.test(t), t.slice(0, 200));
  await v.ctx.close();

  /* ── hostile strings ── */
  v = await visit(FEEDS.evil); await v.p.click('.joinpill'); await v.p.waitForTimeout(300); await v.p.click('.tabs [data-go="today"]'); await v.p.waitForTimeout(300);
  const x = await v.p.evaluate(() => ({ xss: window.__xss || 0, bad: document.querySelectorAll('#main img[onerror],#main script,#main iframe,#main svg[onload],#main [onclick],#main [onmouseover]').length, js: [...document.querySelectorAll('a[href]')].filter(a => /^javascript:/i.test(a.getAttribute('href'))).length }));
  T('nothing in the feed can run as code or become a javascript: link (text is shown as text)', x.xss === 0 && x.bad === 0 && x.js === 0, JSON.stringify(x));
  await v.ctx.close();

  /* ── yesterday's card, and no feed at all ── */
  v = await visit(FEEDS.stale); t = await v.text();
  T('before the morning lock: "not locked yet", with the last graded card on the felt', /isn.t locked yet/i.test(t) && /LAST CARD/i.test(t) && /Knicks ML/i.test(t));
  await v.ctx.close();
  v = await visit(null); t = await v.text();
  T('can\'t reach the feed: says so, with a retry — never an empty or made-up card', /Can.t reach the desk/i.test(t) && (await v.p.locator('[data-act="retry"]').count()) === 1);
  await v.ctx.close();

  /* ── the install guide ── */
  v = await visit(FEEDS.locked, { guide: true }); t = await v.p.locator('.guide').innerText();
  T('first visit on an iPhone: the guide opens with Safari\'s steps (Share → Add to Home Screen → Add)', /HOME SCREEN/i.test(t) && /Share/.test(t) && /Add to Home Screen/.test(t) && (await v.p.locator('.dev [aria-pressed="true"]').innerText()) === 'iPhone');
  await v.p.click('[data-act="guide-done"]'); await v.p.reload(); await v.p.waitForTimeout(700);
  T('…dismissed, it doesn\'t nag on the next visit; "Get the app" brings it back', (await v.p.locator('.guide').count()) === 0 && (await v.p.locator('#installChip').isVisible()));
  await v.p.click('#installChip'); await v.p.click('[data-act="guide-tab"][data-tab="android"]'); t = await v.p.locator('.guide').innerText();
  T('…Android steps on its tab (Chrome menu → Add to Home screen → Install), and computer steps on theirs', /Chrome/.test(t) && /Add to Home screen/.test(t) && (await (async () => { await v.p.click('[data-act="guide-tab"][data-tab="computer"]'); return /address bar|Add to Dock/.test(await v.p.locator('.guide').innerText()); })()));
  await v.ctx.close();
  v = await visit(FEEDS.locked, { guide: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0;FBDV/iPhone15,2]' }); t = await v.p.locator('.guide').innerText();
  T('inside Facebook\'s browser: it says so and how to open in Safari, with a copy-the-link button', /Facebook/.test(t) && /Open in Safari/.test(t) && (await v.p.locator('[data-act="copylink"]').count()) === 1, t.slice(0, 300));
  await v.ctx.close();
  v = await visit(FEEDS.morning, { width: 1280 });
  T('on a computer: top navigation, slips side by side, no bottom tab bar', (await v.p.locator('.nav-top').isVisible()) && !(await v.p.locator('.tabs').isVisible()) && (await v.p.evaluate(() => { const r = [...document.querySelectorAll('#v-today .slips .slip')].map(e => e.getBoundingClientRect()); return r.length === 3 && Math.abs(r[0].top - r[1].top) < 4 && r[1].left > r[0].right; })));
  await v.ctx.close(); await b.close();

  /* ── what's in the box (and what isn't) ── */
  const dir = path.join(W, 'desk'), files = fs.readdirSync(dir).filter(f => /\.(html|js|css|webmanifest)$/.test(f)); const src = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')])); const all = Object.values(src).join('\n');
  T('the app is its own small set of files', ['index.html', 'app.js', 'app.css', 'sw.js', 'manifest.webmanifest', 'privacy.html'].every(f => src[f]) && Buffer.byteLength(src['app.js']) < 460000);   /* v87 (Nov 27): 440 → 460 KB for the post-beta rooms (members gates, sealed picks with a way in, the Cast kept up with today's calls sealed). v81 (Nov 26): 380 → 440 KB for the Quick Pick builder (every bankroll, nine recipes, fine-tune, hold & reroll), draft leagues, the ghost field and live props — the shell is cached on the phone after the first load; */ /* v3.3 (Nov 19): the budget grows 240 → 260 KB for the Open Scoreboard + sources; v3.5 (Nov 22): → 280 KB for Bloodlines (heirs, family life, evolution, the North Star); v62 (Nov 23): → 310 KB for the month calendar, the live run board and ⚡ Quick Pick; v64 (Nov 24): → 345 KB for wallet buy-ins, the parlay lane, the step sheets, ✍️ Pick my own and the ghost runs; v71 (Nov 25): → 360 KB for the 1st-half calls on the Slate, 💰 Winning & up and the D$ prices on every open game; v77 (Nov 26): → 380 KB for My tickets (Active / Graded) and ⭐ favorite lanes — Gamecast and the live feed load as their own files, only when opened */
  T('none of the desk\'s machinery: no engine scripts, no app storage, no keys or settings, no eval', !/shared\.js|desk-[a-z]+\.js|-engine\.js|store\.js|theme\.css/.test(all) && !/['"`]d4\./.test(all) && !/apiKey|api_key|odds-?api|ghp_|bot[0-9]{6,}|AUTOPILOT|tgautokey/i.test(all) && !/\beval\(|new Function\(/.test(all));
  const scripts = [...src['index.html'].matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]).filter(u => !/^https:\/\/telegram\.org\//.test(u));
  const tgLoader = /if\(\/tgWebApp\/\.test\(location\.hash\+location\.search\)\)document\.write\('<script src="https:\/\/telegram\.org\/js\/telegram-web-app\.js">/.test(src['index.html']);
  T('one script, its own; fonts and styles self-hosted (no third-party code or font CDNs); Telegram\'s bridge only loads inside Telegram', scripts.length === 1 && /^app\.js/.test(scripts[0]) && tgLoader && !/fonts\.googleapis|gstatic|cdn\.|unpkg|jsdelivr/.test(all));
  const allowed = h => h === 'desk.test' || h === 'site.api.espn.com' || h === 'raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly-site/main/public/picks.json' || h === 'raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly/feeds/slate.json' || h === 'thedesk-chat.ironsilkstrategies.workers.dev';
  T('it only ever asks for: its own files, the published picks, the public slate, ESPN\'s public scores', [...HOSTS].every(allowed), [...HOSTS].filter(h => !allowed(h)).join(' '));
  const man = JSON.parse(src['manifest.webmanifest']);
  T('installable: its own manifest (scope and start inside /desk/, standalone, icons) and an offline shell that never caches the feeds', man.display === 'standalone' && man.scope === './' && /^\.\//.test(man.start_url) && man.icons.length >= 3 && man.icons.every(i => fs.existsSync(path.join(dir, i.src))) && /endsWith\('\.json'\)\) return/.test(src['sw.js']));
  T('share preview and privacy are in place (no terms page since Nov 14)', fs.existsSync(path.join(dir, 'img/og.jpg')) && /og:image" content="https:\/\/ironsilkweekly\.com\/desk\/img\/og\.jpg/.test(src['index.html']) && !fs.existsSync(path.join(dir, 'terms.html')) && /no cookies/i.test(src['privacy.html']) && /TheDesk Poster/.test(src['privacy.html']));
  const pk = fs.readFileSync(path.join(W, 'picks.html'), 'utf8'), td = fs.readFileSync(path.join(W, 'TheDesk.html'), 'utf8');
  T('the old picks page hands visitors to the app, and the private launcher links to it', /location\.replace\("desk\/"/.test(pk) && /href="desk\/"/.test(td));
  T('the private app\'s pages ask search engines to stay out', ['TheDesk.html', 'nfl.html', 'nba.html', 'nhl.html', 'cfb.html', 'ncaab.html', 'mlb.html', 'odds-loader.html'].every(f => /name="robots" content="noindex/.test(fs.readFileSync(path.join(W, f), 'utf8'))));
  console.log(pass + ' pass / ' + fail + ' fail');
})().catch(e => { console.log('FAIL crashed — ' + (e && e.stack || e)); process.exit(1); });
