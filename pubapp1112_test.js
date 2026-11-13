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
const base = { v: 4, brand: 'TheDesk', price: '$25/mo · $10/wk', social: { fb: 'https://www.facebook.com/share/1FCDFdUvRp/', tg: 'https://t.me/TheDeskApp' }, handle: 'Tester', subscribe: 'https://whop.com/ironsilkweekly/thedesk-vip',
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
const SLATE = { v: 1, ts: now, tz: 'America/Chicago', ranks: { nfl: [{ rk: 1, ab: 'JAX', name: 'Jacksonville Jaguars', w: 6, l: 2, rt: 9.4, l5: 'WWLWW', st: 'W2' }] },
  days: [{ d: day, more: 0, games: [{ k: 'nfl|WSH@NYG', sp: 'nfl', t: now + 3 * 36e5, a: { ab: 'WSH', name: 'Washington Commanders', nick: 'Commanders', rk: 27, of: 32, w: 2, l: 6, l5: 'LLLWL', st: '', pf: 21.5, pa: 25.3 }, h: { ab: 'NYG', name: 'New York Giants', nick: 'Giants', rk: 20, of: 32, w: 5, l: 3, l5: 'WLLWW', st: 'W2', pf: 22.8, pa: 21.5 }, venue: 'MetLife Stadium', ln: { fav: 'NYG', line: 2.5, tot: 40.5, mlA: 120, mlH: -142 }, mv: ['total opened 47.5, now 40.5'], mkt: { ab: 'NYG', pct: 56, src: 'markets' }, read: { a: 20, h: 20 }, note: 'A note', q: { title: 'Over or under 40.5?', opts: ['Over 40.5', 'Under 40.5'] }, hot: 100 },
    { k: 'nba|DET@WSH', sp: 'nba', t: now + 20 * 60e3, a: { ab: 'DET', name: 'Detroit Pistons', nick: 'Pistons', rk: 9, of: 30, w: 7, l: 3, l5: 'WWLLW', st: '', pf: 112, pa: 104 }, h: { ab: 'WSH', name: 'Washington Wizards', nick: 'Wizards', rk: 25, of: 30, w: 4, l: 8, l5: 'LLLLL', st: 'L5', pf: 107, pa: 113 }, venue: '', ln: { fav: 'DET', line: 9.5, tot: 220.5, mlA: -423, mlH: 331 }, mv: [], mkt: null, read: null, note: '', q: { title: 'Upset alert or chalk?', opts: ['Pistons handle it', 'Wizards pull it off'] }, hot: 60 }] }] };

(async () => {
  const b = await pw.chromium.launch(); const HOSTS = new Set();
  /* one visit: a fresh browser profile, the given feed, the tab; returns the page + what it asked the network for */
  async function visit(feed, { tab = 'today', ua, guide = false, width } = {}) {
    const ctx = await b.newContext({ ...pw.devices['iPhone 14'], ...(ua ? { userAgent: ua } : {}), ...(width ? { viewport: { width, height: 860 }, isMobile: false, hasTouch: false } : {}) });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
    await p.route('**/*', r => { const u = new URL(r.request().url()); HOSTS.add(u.hostname + (u.hostname === 'raw.githubusercontent.com' ? u.pathname : ''));
      if (/picks\.json$/.test(u.pathname)) return feed ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) }) : r.abort();
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (u.hostname === 'site.api.espn.com') return r.fulfill({ contentType: 'application/json', body: '{"events":[]}' });
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    if (!guide) await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); } catch (e) { } });
    await p.goto('https://desk.test/desk/#' + tab, { waitUntil: 'load' }); await p.waitForTimeout(900);
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
  T('Join: VIP (the Whop link from the feed), the free lounge, how the desk works', /\$25\/mo or \$10\/wk/.test(t) && hrefs.includes('https://whop.com/ironsilkweekly/thedesk-vip') && hrefs.includes('https://t.me/TheDeskLounge') && /Locked every morning/.test(t), hrefs.join(' '));
  for (const tab of ['today', 'slate', 'receipts', 'join']) { await v.p.click(`.tabs [data-go="${tab}"]`); await v.p.waitForTimeout(250); const o = await v.p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) T('no sideways scroll on ' + tab, false, o + 'px'); }
  T('no sideways scroll on a phone, any tab', true); T('no script errors', v.errs.length === 0, v.errs.join(' | '));
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
  T('the app is its own small set of files', ['index.html', 'app.js', 'app.css', 'sw.js', 'manifest.webmanifest', 'privacy.html', 'terms.html'].every(f => src[f]) && Buffer.byteLength(src['app.js']) < 80000);
  T('none of the desk\'s machinery: no engine scripts, no app storage, no keys or settings, no eval', !/shared\.js|desk-[a-z]+\.js|-engine\.js|store\.js|theme\.css/.test(all) && !/['"`]d4\./.test(all) && !/apiKey|api_key|odds-?api|ghp_|bot[0-9]{6,}|AUTOPILOT|tgautokey/i.test(all) && !/\beval\(|new Function\(/.test(all));
  const scripts = [...src['index.html'].matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
  T('one script, its own; fonts and styles self-hosted (no third-party code or font CDNs)', scripts.length === 1 && /^app\.js/.test(scripts[0]) && !/fonts\.googleapis|gstatic|cdn\.|unpkg|jsdelivr/.test(all));
  const allowed = h => h === 'desk.test' || h === 'site.api.espn.com' || h === 'raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly-site/main/public/picks.json' || h === 'raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly/feeds/slate.json';
  T('it only ever asks for: its own files, the published picks, the public slate, ESPN\'s public scores', [...HOSTS].every(allowed), [...HOSTS].filter(h => !allowed(h)).join(' '));
  const man = JSON.parse(src['manifest.webmanifest']);
  T('installable: its own manifest (scope and start inside /desk/, standalone, icons) and an offline shell that never caches the feeds', man.display === 'standalone' && man.scope === './' && /^\.\//.test(man.start_url) && man.icons.length >= 3 && man.icons.every(i => fs.existsSync(path.join(dir, i.src))) && /endsWith\('\.json'\)\) return/.test(src['sw.js']));
  T('share preview, privacy and terms are in place', fs.existsSync(path.join(dir, 'img/og.jpg')) && /og:image" content="https:\/\/ironsilkweekly\.com\/desk\/img\/og\.jpg/.test(src['index.html']) && /1-800-GAMBLER/.test(src['terms.html']) && /no cookies/i.test(src['privacy.html']));
  const pk = fs.readFileSync(path.join(W, 'picks.html'), 'utf8'), td = fs.readFileSync(path.join(W, 'TheDesk.html'), 'utf8');
  T('the old picks page hands visitors to the app, and the private launcher links to it', /location\.replace\("desk\/"/.test(pk) && /href="desk\/"/.test(td));
  T('the private app\'s pages ask search engines to stay out', ['TheDesk.html', 'nfl.html', 'nba.html', 'nhl.html', 'cfb.html', 'ncaab.html', 'mlb.html', 'odds-loader.html'].every(f => /name="robots" content="noindex/.test(fs.readFileSync(path.join(W, f), 'utf8'))));
  console.log(pass + ' pass / ' + fail + ' fail');
})().catch(e => { console.log('FAIL crashed — ' + (e && e.stack || e)); process.exit(1); });
