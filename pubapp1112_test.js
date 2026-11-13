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
  vip: { top10: [leg('nba', 'DAL@MIN', 'MIN -5.5', -110, 0.72, { voices: CALLS }), leg('nhl', 'SEA@COL', 'COL ML', -800, 0.92)], banker: { price: '+264', p: 0.31, legs: [leg('nhl', 'BUF@CHI', 'BUF ML', -140, 0.66), leg('nba', 'CHA@PHX', 'PHX -6.5', -110, 0.7)] },
    parlays: [{ who: 'The Scout', v: 'Scout', skill: false, px: false, price: '+310', p: 0.29, legs: [leg('nfl', 'WSH@NYG', 'NYG ML', -130, 0.71, { by: ['The Scout'] }), leg('nhl', 'NYR@DAL', 'DAL ML', -125, 0.7, { by: ['The Scout'] })] }],
    props: [{ who: 'The Scorekeeper', v: 'Most common', sp: 'nba', pick: 'Anthony Edwards 30+ points', price: -115, p: 0.71, star: true }] },
  characters: [{ v: 'Scout', name: 'The Scout', chip: '🔭 SCOUT', color: '#fb7185', title: 'The Talent Hunter', bio: 'The Scout watches players, not teams.', origin: 'Spent years on the road in empty gyms.', best: [{ lane: 'NHL favorites on the spread', w: 17, l: 13, u: 13.3 }], still: [{ lane: 'College football favorites on the spread', w: 21, l: 20 }], record: { w: 41, l: 30, pu: 1, u: 6.4 }, props: { w: 12, l: 5 },
      picks: [{ kind: 'game', sp: 'nfl', game: 'WSH@NYG', gl: 'Commanders at Giants', pick: 'NYG ML', price: -130, p: 0.71, start: iso(now + 3 * 36e5), hit: null, push: false, note: 'talent edge · QB star' }, { kind: 'prop', sp: 'nba', pick: 'Anthony Edwards under 39.5 PTS+REB+AST', team: 'MIN', side: 'under', p: 0.72, hit: null, push: false, note: '3-1 on him before' }],
      recent: [{ d: '2026-11-11', kind: 'game', sp: 'nhl', pick: 'SJ +1.5', price: -193, gl: 'Penguins at Sharks', r: 'loss' }], teams: [{ sp: 'nhl', team: 'MIN', for: { w: 6, l: 2 }, vs: { w: 1, l: 1 } }], players: [{ sp: 'nba', player: 'Anthony Edwards', team: 'MIN', over: { w: 4, l: 1 }, under: { w: 2, l: 0 } }] },
    { v: 'Coach', name: 'The Coach', chip: 'COACH', color: 'red;background:url(javascript:alert(1))', title: 'The Sideline General', bio: 'Twenty seasons of road trips.', record: { w: 0, l: 0, pu: 0, u: 0 }, props: { w: 0, l: 0 }, picks: [] }],
  bloodlines: { need: { n: 100, days: 10 }, cells: [{ who: 'The Scout', v: 'Scout', m: 'ml', gen: 2, champ: 'the worldview', heirs: 2, retired: 1, best: { lab: 'how fast it learns: 0.04 → 0.08', n: 80, days: 12, z: 1.2, bar: 1.75 }, hist: [{ gen: 1, lab: 'the original confidence', to: '2026-11-10', why: 'retired' }] }] } };
/* v3.0.3 · the board: colored picks per game, every character's call, and who has the say */
const r = (lab, rk, of, w, l, u, say = '') => ({ lab, rk, of, w, l, u, say });
BETA.board = { d: day, heavy: -500, cast: { Coach: { name: 'The Coach', color: '#3DDC84' }, Scout: { name: 'The Scout', color: '#22D3EE' }, Trends: { name: 'The Historian', color: 'red;x:url(javascript:1)' } },
  games: [{ sp: 'nfl', game: 'WSH@NYG', gl: 'WSH@NYG', start: iso(now + 3 * 36e5), day, st: 'pre',
    picks: [{ m: 'total', sd: 'under', pick: 'Under 40.5', price: -108, p: 0.71, tier: 'supreme', unan: false, off: true, by: ['Coach', 'Scout'] }, { m: 'ml', sd: 'home', pick: 'NYG ML', price: -142, p: 0.64, tier: 'strong', unan: true, off: false, by: ['Coach'] }, { m: 'ml', sd: 'away', pick: 'WSH ML', price: -650, p: 0.91, tier: 'supreme', unan: true, off: true, by: ['Scout'] }],
    calls: { ml: [{ v: 'Scout', s: 'home', pick: 'NYG ML', price: -700, p: 0.9, o: 1, r: null }], total: [{ v: 'Coach', s: 'under', pick: 'Under 40.5', price: -108, p: 0.74, o: 1, r: r('NFL unders', 1, 9, 30, 12, 14.2, 'top') }, { v: 'Scout', s: 'under', pick: 'Under 40.5', price: -108, p: 0.66, o: 0, r: r('NFL unders', 4, 9, 18, 16, -0.4) },
      { v: 'Trends', s: 'over', pick: 'Over 40.5', price: -112, p: 0.58, o: 0, r: r('NFL overs', 9, 9, 10, 22, -13.1, 'worst') }], } },
    { sp: 'nba', game: 'DAL@MIN', gl: 'DAL@MIN', start: iso(now + 5 * 36e5), day, st: 'pre', picks: [{ m: 'spread', sd: 'home', pick: 'MIN -5.5', price: -110, p: 0.62, tier: 'strong', unan: false, off: false, by: ['Scout'] }], calls: { spread: [{ v: 'Scout', s: 'home', pick: 'MIN -5.5', price: -110, p: 0.62, o: 0, r: null }] } }] };
const SLATE = { v: 1, ts: now, tz: 'America/Chicago', ranks: { nfl: [{ rk: 1, ab: 'JAX', name: 'Jacksonville Jaguars', w: 6, l: 2, rt: 9.4, l5: 'WWLWW', st: 'W2' }] },
  days: [{ d: day, more: 0, games: [{ k: 'nfl|WSH@NYG', sp: 'nfl', t: now + 3 * 36e5, a: { ab: 'WSH', name: 'Washington Commanders', nick: 'Commanders', rk: 27, of: 32, w: 2, l: 6, l5: 'LLLWL', st: '', pf: 21.5, pa: 25.3 }, h: { ab: 'NYG', name: 'New York Giants', nick: 'Giants', rk: 20, of: 32, w: 5, l: 3, l5: 'WLLWW', st: 'W2', pf: 22.8, pa: 21.5 }, venue: 'MetLife Stadium', ln: { fav: 'NYG', line: 2.5, tot: 40.5, mlA: 120, mlH: -142 }, mv: ['total opened 47.5, now 40.5'], mkt: { ab: 'NYG', pct: 56, src: 'markets' }, read: { a: 20, h: 20 }, note: 'A note', q: { title: 'Over or under 40.5?', opts: ['Over 40.5', 'Under 40.5'] }, hot: 100 },
    { k: 'nba|DET@WSH', sp: 'nba', t: now + 20 * 60e3, a: { ab: 'DET', name: 'Detroit Pistons', nick: 'Pistons', rk: 9, of: 30, w: 7, l: 3, l5: 'WWLLW', st: '', pf: 112, pa: 104 }, h: { ab: 'WSH', name: 'Washington Wizards', nick: 'Wizards', rk: 25, of: 30, w: 4, l: 8, l5: 'LLLLL', st: 'L5', pf: 107, pa: 113 }, venue: '', ln: { fav: 'DET', line: 9.5, tot: 220.5, mlA: -423, mlH: 331 }, mv: [], mkt: null, read: null, note: '', q: { title: 'Upset alert or chalk?', opts: ['Pistons handle it', 'Wizards pull it off'] }, hot: 60 }] }] };

(async () => {
  const b = await pw.chromium.launch(); const HOSTS = new Set();
  /* one visit: a fresh browser profile, the given feed, the tab; returns the page + what it asked the network for */
  async function visit(feed, { tab = 'today', ua, guide = false, width, chat, query = '' } = {}) {
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
  await v.p.click('.tabs [data-go="join"]'); await v.p.waitForTimeout(400); t = await v.text();
  const hrefs = await v.p.evaluate(() => [...document.querySelectorAll('#v-join a[href]')].map(a => a.href));
  T('Join: VIP (the Whop link from the feed), the free lounge, how the desk works', /\$50\/mo or \$300\/yr/.test(t) && !/\$25|\$10\/wk/.test(t) && hrefs.includes('https://whop.com/ironsilkweekly/thedesk-vip') && hrefs.includes('https://t.me/TheDeskLounge') && /Locked every morning/.test(t), hrefs.join(' '));
  T('…the head start from the public timestamps (locked 2h before an unlock 10 min ago → about 1h 50m), the real record by the button', /HEAD START TODAY/i.test(t) && /1h (49|50)m/i.test(t) && /On the record: 38–27, \+1\.24 units since Oct 6/.test(t), t.slice(0, 700));
  T('…free vs VIP side by side (VIP: the card at lock, the Top 10, the parlays, the private Telegram)', (await v.p.locator('#v-join .cmp tbody tr').count()) === 9 && /The minute it locks/.test(t) && /30 min before each game/.test(t) && /Yearly plan/.test(t) && (await v.p.locator('#v-join .cmp td.v svg.y').count()) === 6 && (await v.p.locator('#v-join .cmp td:not(.v) svg.n').count()) === 5);
  T('…and the straight answers: where picks land, no guarantees, cancel any time', /Where do the picks show up/.test(t) && /Do you guarantee wins/.test(t) && /Can I cancel/.test(t));
  for (const tab of ['today', 'slate', 'receipts', 'join']) { await v.p.click(`.tabs [data-go="${tab}"]`); await v.p.waitForTimeout(250); const o = await v.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) T('no sideways scroll on ' + tab, false, o + 'px'); }
  T('no sideways scroll on a phone, any tab', true); T('no script errors', v.errs.length === 0, v.errs.join(' | '));
  await v.ctx.close();

  /* ── the open beta ── */
  v = await visit(BETA); t = await v.text();
  T('open beta: every Best 3 pick is face up at lock, and the page says it\'s open to everyone', (await v.p.locator('#v-today .slip.locked').count()) === 0 && /PISTONS −9\.5/i.test(t) && /UNDER 40\.5/i.test(t) && /Open to everyone during the beta/.test(t));
  T('…the VIP sections ride along, each marked "VIP · free in beta": the rest of the Top 10, the Banker, every character\'s parlay, the props', /THE REST OF THE TOP 10/i.test(t) && /THE BANKER.S PARLAY/i.test(t) && /EVERY CHARACTER.S PARLAY/i.test(t) && /PROPS OF THE DAY/i.test(t) && (await v.p.locator('#v-today .vipbadge').count()) >= 4 && /Anthony Edwards 30\+ points/.test(t) && /\+264/.test(t), t.slice(0, 900));
  T('…no VIP selling during the beta (no checkout link anywhere), a beta strip instead', !(await v.p.evaluate(() => [...document.querySelectorAll('a[href]')].some(a => /whop\.com/.test(a.href)))) && /Open beta: the whole card is free/i.test(t));
  await v.p.locator('#v-today .calls summary').first().click(); await v.p.waitForTimeout(200); t = await v.text();
  T('…each pick opens "every character on it": who is with it, who is against, how sure, and why', /2 with · 1 against/.test(t) && /rest edge · opponent on a back-to-back/.test(t) && /On WSH \+9\.5\. head-to-head edge/.test(t) && (await v.p.locator('#v-today .calls li.off').count()) >= 1);
  T('Today: "Unanimous, Supreme & Strong" lists the strongest board picks with their tags and who is on them', /UNANIMOUS, SUPREME & STRONG/i.test(t) && /Giants ML/.test(t) && /Timberwolves −5\.5/.test(t) && /by The Coach, The Scout/.test(t) && /1 unanimous/.test(t), t.slice(t.indexOf('NANIMOUS, S') - 10, t.indexOf('NANIMOUS, S') + 400));
  T('…no heavy moneyline on Today (the −800 Avalanche ML in the Top 10 never shows)', !/−800|[^1]-800|Avalanche ML/.test(t), (t.match(/.{80}(−800|[^1]-800|Avalanche ML).{40}/s)||[])[0]);
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
  T('…no heavy moneyline anywhere on the game (not the −650 pick, not the −700 call)', !/−650|−700|-650|-700/.test(t));
  T('…a color from the board can\'t smuggle in CSS', await v.p.evaluate(() => [...document.querySelectorAll('.won li')].every(li => /^#[0-9a-f]{3,8}$/i.test(li.style.getPropertyValue('--c').trim()))));
  T('…the board stays inside a phone screen', (await v.p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await v.p.click('.tabs [data-go="cast"]'); await v.p.waitForTimeout(400); t = await v.text();
  T('Characters: a dropdown to pick one, a card per character (name, title, game and prop records, today\'s count)', (await v.p.locator('#castSel option').count()) === 3 && /THE SCOUT/i.test(t) && /The Talent Hunter/i.test(t) && /41–30–1/.test(t) && /12–5/.test(t) && /2 picks today/.test(t) && /No pick today/.test(t), t.slice(0, 700));
  T('…the bloodlines in plain words (closest to a new generation, no math)', /CLOSEST TO A NEW GENERATION/i.test(t) && !/σ/.test(t));
  T('…a color from the feed can\'t smuggle in CSS (only #hex colors pass)', await v.p.evaluate(() => [...document.querySelectorAll('.castcard')].every(c => /^#[0-9a-f]{3,8}$/i.test(c.style.getPropertyValue('--cc').trim()))));
  await v.p.selectOption('#castSel', 'Scout'); await v.p.waitForTimeout(300); t = await v.text();
  T('picking the Scout opens its page: who it is, where its eye comes from, what it\'s best at, its records', /The Scout watches players, not teams/.test(t) && /WHERE THE EYE COMES FROM/i.test(t) && /Spent years on the road/.test(t) && /NHL favorites on the spread 17–13 \+13\.3u/.test(t) && /Still learning/.test(t) && /41–30–1/.test(t), t.slice(0, 900));
  T('…today\'s official picks, games and props (an under reads as an under), with the reason', /Giants ML/i.test(t) && /talent edge · QB star/.test(t) && /Anthony Edwards under 39\.5 PTS\+REB\+AST/.test(t) && /3-1 on him before/.test(t));
  T('…recent results, the teams it backs and fades, the players it rides and fades', /RECENT RESULTS/i.test(t) && /TEAMS IT BACKS AND FADES/i.test(t) && /Wild/.test(t) && /6–2/.test(t) && /PLAYERS IT RIDES AND FADES/i.test(t) && /4–1/.test(t) && /2–0/.test(t));
  T('…and its bloodline in plain words', /% of the way to a new generation/.test(t) && /80\/100 games watched/.test(t));
  await v.p.click('[data-act="castpick"][data-v=""]'); await v.p.waitForTimeout(250);
  T('"All characters" goes back to the roster', (await v.p.locator('.castcard.mini').count()) === 2);
  T('every page ends with "Restart the app" (loads the newest version)', (await v.p.locator('[data-act="restart"]').count()) >= 1);
  await v.p.locator('#v-cast [data-act="restart"]').click(); await v.p.waitForTimeout(1200);
  T('…tapping it reloads the app fresh (and nothing saved is lost)', /[?&]fresh=\d+/.test(v.p.url()) && (await v.p.evaluate(() => localStorage.getItem('tdp.castpick'))) !== null, v.p.url());
  await v.p.click('.tabs [data-go="join"]'); await v.p.waitForTimeout(400); t = await v.text();
  T('Join in beta: "Everything\'s free during the beta", the plans after the beta ($50 a month, $300 a year, $100 a league, $20 for 2 days, $2 a pick), no checkout', /EVERYTHING.S FREE DURING THE BETA/i.test(t) && /PLANS AFTER THE BETA/i.test(t) && ['$50', '$300', '$100', '$20', '$2'].every(x => t.includes(x)) && /Best value/i.test(t) && /What happens after the beta/.test(t) && !/HEAD START/i.test(t) && !(await v.p.evaluate(() => [...document.querySelectorAll('#v-join a[href]')].some(a => /whop/.test(a.href)))));
  for (const tab of ['today', 'cast', 'join']) { await v.p.click(`.tabs [data-go="${tab}"]`); await v.p.waitForTimeout(250); const o = await v.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) T('beta: no sideways scroll on ' + tab, false, o + 'px'); }
  T('beta: no sideways scroll, no script errors', v.errs.length === 0, v.errs.join(' | '));
  await v.ctx.close();

  /* ── an older app's feed (no beta flag, old price line): the beta Join page with today's prices, never the old ones ── */
  { const old = { ...FEEDS.morning }; delete old.beta; v = await visit(old, { tab: 'join' }); t = await v.text();
    T('a feed from an older app still shows the new price list and no checkout (the beta is on unless the feed says off)', /EVERYTHING.S FREE DURING THE BETA/i.test(t) && ['$50', '$300', '$100', '$20', '$2'].every(x => t.includes(x)) && !/\$25|\$10\/wk|\$19\.99/.test(t) && !(await v.p.evaluate(() => [...document.querySelectorAll('a[href]')].some(a => /whop/.test(a.href)))));
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
  v = await visit(FEEDS.evil); await v.p.click('.tabs [data-go="join"]'); await v.p.waitForTimeout(300); await v.p.click('.tabs [data-go="today"]'); await v.p.waitForTimeout(300);
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
  T('the app is its own small set of files', ['index.html', 'app.js', 'app.css', 'sw.js', 'manifest.webmanifest', 'privacy.html', 'terms.html'].every(f => src[f]) && Buffer.byteLength(src['app.js']) < 100000);
  T('none of the desk\'s machinery: no engine scripts, no app storage, no keys or settings, no eval', !/shared\.js|desk-[a-z]+\.js|-engine\.js|store\.js|theme\.css/.test(all) && !/['"`]d4\./.test(all) && !/apiKey|api_key|odds-?api|ghp_|bot[0-9]{6,}|AUTOPILOT|tgautokey/i.test(all) && !/\beval\(|new Function\(/.test(all));
  const scripts = [...src['index.html'].matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
  T('one script, its own; fonts and styles self-hosted (no third-party code or font CDNs)', scripts.length === 1 && /^app\.js/.test(scripts[0]) && !/fonts\.googleapis|gstatic|cdn\.|unpkg|jsdelivr/.test(all));
  const allowed = h => h === 'desk.test' || h === 'site.api.espn.com' || h === 'raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly-site/main/public/picks.json' || h === 'raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly/feeds/slate.json' || h === 'thedesk-chat.ironsilkstrategies.workers.dev';
  T('it only ever asks for: its own files, the published picks, the public slate, ESPN\'s public scores', [...HOSTS].every(allowed), [...HOSTS].filter(h => !allowed(h)).join(' '));
  const man = JSON.parse(src['manifest.webmanifest']);
  T('installable: its own manifest (scope and start inside /desk/, standalone, icons) and an offline shell that never caches the feeds', man.display === 'standalone' && man.scope === './' && /^\.\//.test(man.start_url) && man.icons.length >= 3 && man.icons.every(i => fs.existsSync(path.join(dir, i.src))) && /endsWith\('\.json'\)\) return/.test(src['sw.js']));
  T('share preview, privacy and terms are in place', fs.existsSync(path.join(dir, 'img/og.jpg')) && /og:image" content="https:\/\/ironsilkweekly\.com\/desk\/img\/og\.jpg/.test(src['index.html']) && /1-800-GAMBLER/.test(src['terms.html']) && /no cookies/i.test(src['privacy.html']));
  const pk = fs.readFileSync(path.join(W, 'picks.html'), 'utf8'), td = fs.readFileSync(path.join(W, 'TheDesk.html'), 'utf8');
  T('the old picks page hands visitors to the app, and the private launcher links to it', /location\.replace\("desk\/"/.test(pk) && /href="desk\/"/.test(td));
  T('the private app\'s pages ask search engines to stay out', ['TheDesk.html', 'nfl.html', 'nba.html', 'nhl.html', 'cfb.html', 'ncaab.html', 'mlb.html', 'odds-loader.html'].every(f => /name="robots" content="noindex/.test(fs.readFileSync(path.join(W, f), 'utf8'))));
  console.log(pass + ' pass / ' + fail + ' fail');
})().catch(e => { console.log('FAIL crashed — ' + (e && e.stack || e)); process.exit(1); });
