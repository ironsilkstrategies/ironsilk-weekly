/* public app v77 · Nov 26, 12:46 PM, Chris: "can we bring the gamecast feature (much more interactively sound for mobile when it comes to
   display of what's going on in a game… similar to espns interactive field and courts that show a shot being taken or a pass being completed
   and displayed on the court or field…) so we can follow games closer… make sure it's able to be backed out of so you can go back to the
   slate… but readily available if someone wants to sweat it out watching the courts movements". Real browser (iPhone 14), the repo's files,
   invented ESPN data in ESPN's shapes, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 600))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const now = Date.now(), iso = t => new Date(t).toISOString().slice(0, 16) + 'Z';
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(now)), ymd = day.replace(/-/g, '');
const comp = (aAb, aId, aSc, hAb, hId, hSc, state, detail, colors = ['0b1c3a', '0076b6']) => ({ competitions: [{ date: iso(now - 36e5), status: { type: { state, completed: state === 'post', shortDetail: detail } },
  competitors: [{ homeAway: 'away', score: String(aSc), team: { id: aId, abbreviation: aAb, shortDisplayName: aAb + ' team', color: colors[0], alternateColor: 'e64100' } }, { homeAway: 'home', score: String(hSc), team: { id: hId, abbreviation: hAb, shortDisplayName: hAb + ' team', color: colors[1], alternateColor: 'bbbbbb' } }] }] });
/* NFL: CHI (away, id 3) driving at DET (home, id 8); yard lines count from DET's goal line */
const play = (id, type, text, y0, y1, yds, team, x = {}) => ({ id: String(id), type: { text: type }, text, start: { yardLine: y0, team: { id: team }, shortDownDistanceText: x.dd || '1st & 10' }, end: { yardLine: y1, down: x.nd ?? 2, distance: x.ndist ?? 10, team: { id: team } }, statYardage: yds, scoringPlay: !!x.score, period: { number: 2 }, clock: { displayValue: x.clk || '12:00' }, awayScore: x.a ?? 3, homeScore: x.h ?? 10 });
const NFL = { header: comp('CHI', '3', 3, 'DET', '8', 10, 'in', '10:52 - 2nd'), winprobability: [{ homeWinPercentage: 0.71 }, { homeWinPercentage: 0.7465 }],
  drives: { previous: [{ id: 'd1', team: { id: '8' }, description: '8 plays, 75 yards, 4:10', displayResult: 'Touchdown', isScore: true, plays: [play(1, 'Rushing Touchdown', 'J.Gibbs left tackle for 1 yard, TOUCHDOWN.', 1, 0, 1, '8', { score: true, a: 3, h: 10, clk: '13:20' })] }],
    current: { id: 'd2', team: { id: '3' }, description: '4 plays, 43 yards, 1:50', plays: [
      play(2, 'Pass Incompletion', 'C.Williams pass incomplete short right to L.Burden.', 65, 65, 0, '3', { nd: 2, ndist: 10, clk: '12:45' }),
      play(3, 'Rush', 'S.Ahmed right end to DET 19 for 46 yards.', 65, 19, 46, '3', { nd: 1, ndist: 10, clk: '12:20' }),
      play(4, 'Sack', 'C.Williams sacked at DET 27 for -8 yards.', 19, 27, -8, '3', { nd: 2, ndist: 18, clk: '11:40' }),
      play(5, 'Pass Reception', 'C.Williams pass short right to K.Raymond to DET 22 for 5 yards.', 27, 22, 5, '3', { nd: 3, ndist: 13, clk: '11:01' })] } } };
/* NBA: final, 6 located shots + a free throw (ESPN's "no spot" value) */
const shot = (id, team, x, y, made, text, per = 1, pts) => ({ id: String(id), shootingPlay: true, scoringPlay: made, scoreValue: made ? (pts || 2) : 0, coordinate: { x, y }, team: { id: team }, text, period: { number: per }, clock: { displayValue: '10:00' }, awayScore: 0, homeScore: 0, type: { text: 'Jump Shot' } });
const NBA = { header: comp('MIN', '16', 108, 'OKC', '25', 112, 'post', 'Final', ['266092', '007ac1']), winprobability: [{ homeWinPercentage: 1 }],
  plays: [shot(1, '16', 24, 0, true, 'Rudy Gobert makes layup'), shot(2, '25', 27, 19, false, 'Shai Gilgeous-Alexander misses 19-foot jumper'), shot(3, '25', 48, 5, true, 'Ajay Mitchell makes 23-foot three point jumper', 1, 3),
    shot(4, '16', 29, 2, false, 'Ayo Dosunmu misses running pullup'), shot(5, '25', 22, 20, true, 'Ajay Mitchell makes 20-foot pullup', 2), shot(6, '16', 47, 11, false, 'Bennett Stirtz misses 24-foot three point jumper', 2),
    { id: '7', shootingPlay: true, scoringPlay: true, scoreValue: 1, coordinate: { x: -214748340, y: -214748365 }, team: { id: '25' }, text: 'Shai Gilgeous-Alexander makes free throw 1 of 2', period: { number: 2 }, clock: { displayValue: '9:00' }, type: { text: 'Free Throw' } }] };
/* NHL: BUF (home) shoots right in P1 and left in P2 — the Gamecast turns P2 around */
const hs = (id, type, team, x, y, per, text) => ({ id: String(id), type: { text: type }, team: { id: team }, coordinate: { x, y }, period: { number: per }, clock: { displayValue: '5:00' }, text, scoringPlay: type === 'Goal' });
const NHL = { header: comp('NYR', '13', 1, 'BUF', '2', 3, 'post', 'Final', ['0038a8', '003087']),
  plays: [hs(1, 'Goal', '2', 57, 1, 1, 'Rasmus Dahlin Goal (5) Wrist Shot'), hs(2, 'Shot', '13', -44, 6, 1, 'Gabe Perreault Wrist Shot saved'), hs(3, 'Shot', '2', 65, -25, 1, 'Jack Quinn Wrist Shot saved'), hs(4, 'Missed', '13', -70, 10, 1, 'Will Cuylle Missed'),
    hs(5, 'Shot', '2', -66, 4, 2, 'Tage Thompson Snap Shot saved'), hs(6, 'Goal', '2', -80, -2, 2, 'Alex Tuch Goal (7)'), hs(7, 'Shot', '13', 52, 9, 2, 'Mika Zibanejad Wrist Shot saved'), hs(8, 'Blocked', '13', 40, 12, 2, 'Blocked shot')] };
const SB = { nfl: { events: [{ id: '401873081', competitions: [{ competitors: [{ homeAway: 'away', team: { abbreviation: 'CHI' }, score: '3' }, { homeAway: 'home', team: { abbreviation: 'DET' }, score: '10' }], status: { type: { state: 'in', shortDetail: '10:52 - 2nd' }, period: 2, clock: 652 } }] }] },
  nba: { events: [{ id: '401909320', competitions: [{ competitors: [{ homeAway: 'away', team: { abbreviation: 'MIN' }, score: '108' }, { homeAway: 'home', team: { abbreviation: 'OKC' }, score: '112' }], status: { type: { state: 'post', completed: true, shortDetail: 'Final' }, period: 4 } }] }] },
  nhl: { events: [{ id: '401892782', competitions: [{ competitors: [{ homeAway: 'away', team: { abbreviation: 'NYR' }, score: '1' }, { homeAway: 'home', team: { abbreviation: 'BUF' }, score: '3' }], status: { type: { state: 'post', completed: true, shortDetail: 'Final' }, period: 3 } }] }] } };
const BOARD = { d: day, heavy: -500, cast: { Judge: { name: 'The Judge', color: '#f5a524' } }, games: [{ sp: 'nfl', game: 'CHI@DET', gl: 'CHI@DET', start: iso(now - 36e5), day, st: 'in', picks: [{ m: 'ml', sd: 'away', pick: 'CHI ML', price: -116, p: 0.56, tier: 'strong', unan: false, off: true, by: ['Judge'] }], calls: {} }] };
const FEED = { v: 4, beta: true, brand: 'TheDesk', generated: now, record: { w: 1, l: 1, pu: 0, u: 0 }, history: [], updates: [], cashed: [], unlockMin: 30, today: { d: day, lockedAt: now - 36e5, unlockMin: 30, picks: [], props: [] }, board: BOARD, characters: [] };
const G = (sp, a, h, hr) => ({ k: `${sp}|${a}@${h}`, sp, t: now + hr * 36e5, a: { ab: a, name: a, nick: a, w: 5, l: 5 }, h: { ab: h, name: h, nick: h, w: 7, l: 3 }, ln: null });
const SLATE = { v: 1, ts: now, tz: 'America/Chicago', ranks: {}, days: [{ d: day, more: 0, games: [G('nfl', 'CHI', 'DET', -1), G('nba', 'MIN', 'OKC', -3), G('nhl', 'NYR', 'BUF', -3), G('nba', 'LAL', 'GS', 5)] }] };
(async () => {
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ ...pw.devices['iPhone 14'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
  const sums = []; let nflN = 0;
  await p.route('**/*', rt => { const u = new URL(rt.request().url());
    if (/picks\.json$/.test(u.pathname)) return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(FEED) });
    if (/slate\.json$/.test(u.pathname)) return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
    if (u.hostname === 'site.api.espn.com') { const m = u.pathname.match(/sports\/(\w+)\/([\w-]+)\/(scoreboard|summary)/); const sp = m && { nfl: 'nfl', nba: 'nba', nhl: 'nhl' }[m[2]];
      if (m && m[3] === 'summary') { sums.push(u.searchParams.get('event')); if (sp === 'nfl') nflN++; const body = sp === 'nfl' ? NFL : sp === 'nba' ? NBA : sp === 'nhl' ? NHL : {}; return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(body) }); }
      return rt.fulfill({ contentType: 'application/json', body: JSON.stringify(sp && SB[sp] && u.searchParams.get('dates') === ymd ? SB[sp] : { events: [] }) }); }
    if (u.hostname !== 'desk.test') return rt.abort();
    let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return rt.fulfill({ status: 404, body: '' });
    rt.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
  await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); localStorage.setItem('tdp.bf', JSON.stringify({ win: 'all' })); } catch (e) { } });
  try {
    await p.goto('https://desk.test/desk/#slate', { waitUntil: 'load' }); await p.waitForTimeout(1800);
    const btns = await p.$$eval('#v-slate .g-gc', els => els.map(e => [e.textContent.trim(), e.dataset.go]));
    T('the Slate: every game that has started carries a Gamecast button (live ones say so); a game not started has none', btns.length === 3 && btns.some(x => /📺 Gamecast · live/.test(x[0]) && x[1] === 'gc=nfl:401873081') && btns.some(x => x[1] === 'gc=nba:401909320' && /every play/.test(x[0])) && btns.some(x => x[1] === 'gc=nhl:401892782'), JSON.stringify(btns));
    /* football */
    await p.click('#v-slate .g-gc.live'); await p.waitForTimeout(1500);
    let gc = await p.evaluate(() => { const v = document.querySelector('#v-gc'); return { url: location.hash, bug: (v.querySelector('.gc-bug') || {}).innerText || '', wp: (v.querySelector('.gc-wp') || {}).innerText || '', sit: (v.querySelector('.gc-sit') || {}).innerText || '', field: !!v.querySelector('svg.field'), plays: v.querySelectorAll('svg.field .gc-pl').length,
      cls: [...v.querySelectorAll('svg.field .gc-pl')].map(g => g.getAttribute('class')), los: !!v.querySelector('svg.field .los'), ltg: !!v.querySelector('svg.field .ltg'), feed: [...v.querySelectorAll('.gc-feed li')].map(l => l.innerText.replace(/\s+/g, ' ')), picks: (v.querySelector('.gc-on') || {}).innerText || '', fits: document.documentElement.scrollWidth <= innerWidth }; });
    T('tap it: the Gamecast opens at #gc=nfl:… with the scoreboard (CHI 3, DET 10, live clock)', gc.url === '#gc=nfl:401873081' && /CHI[\s\S]*3[\s\S]*10:52 - 2nd[\s\S]*DET[\s\S]*10/.test(gc.bug), JSON.stringify(gc.bug));
    T('…win probability from ESPN (CHI 25% · DET 75%)', /CHI 25%/.test(gc.wp) && /75% DET/.test(gc.wp), gc.wp);
    T('…the field: the current drive play by play — incomplete, run, sack (a loss), pass', gc.field && gc.plays === 4 && /gp-inc/.test(gc.cls[0]) && /gp-run/.test(gc.cls[1]) && /gp-loss/.test(gc.cls[2]) && /gp-pass/.test(gc.cls[3]), JSON.stringify(gc.cls));
    T('…the ball, the line of scrimmage and the line to gain, with the down and distance ("CHI ball · 3rd & 13")', gc.los && gc.ltg && /CHI ball · 3rd & 13/.test(gc.sit) && /4 plays, 43 yards/.test(gc.sit), gc.sit);
    T('…the play-by-play, newest first, the touchdown marked with the score', /K\.Raymond/.test(gc.feed[0]) && gc.feed.some(x => /TOUCHDOWN/.test(x) && /CHI 3–10 DET/.test(x)), JSON.stringify(gc.feed.slice(0, 5)));
    T('…the desk\'s picks on this game ride along (CHI ML)', /Bears ML|CHI ML/.test(gc.picks), gc.picks);
    T('…fits a phone (no sideways scroll)', gc.fits);
    T('…the latest play is animated (the ball runs its path)', await p.evaluate(() => !!document.querySelector('#v-gc .gc-pl.fresh animateMotion')));
    await p.click('[data-gc="zoom"][data-v="all"]'); await p.waitForTimeout(200);
    T('"Whole field" shows all 120 yards; "Follow the drive" zooms in', (await p.getAttribute('#v-gc svg.field', 'viewBox')) === '0 0 120 53.3');
    await p.click('[data-gc="back"]'); await p.waitForTimeout(500);
    T('← Back to the Slate: back where it was opened, the polling stopped', /#slate$/.test(p.url()) && !(await p.evaluate(() => document.querySelector('#v-slate').hidden)) && (await p.evaluate(() => document.querySelector('#v-gc').hidden)));
    const n0 = nflN; await p.waitForTimeout(13000);
    T('…once you leave, it stops asking ESPN (no new fetch in 13 s)', nflN === n0, `${n0} → ${nflN}`);
    /* basketball */
    await p.click('#v-slate .g-gc[data-go="gc=nba:401909320"]'); await p.waitForTimeout(1500);
    gc = await p.evaluate(() => { const v = document.querySelector('#v-gc'); return { court: !!v.querySelector('svg.court'), made: v.querySelectorAll('svg.court .gc-m').length, miss: v.querySelectorAll('svg.court .gc-x').length, stats: (v.querySelector('.gc-stats') || {}).innerText || '', vb: v.querySelector('svg.court').getAttribute('viewBox') }; });
    T('basketball: the shot chart — 3 made (●), 3 missed (✕), the free throw left off the floor', gc.court && gc.made === 3 && gc.miss === 3, JSON.stringify(gc));
    T('…each team\'s shooting adds up (MIN FG 1/3, OKC FG 2/3 · 3PT 1/1)', /MIN FG 1\/3/.test(gc.stats) && /OKC FG 2\/3/.test(gc.stats) && /3PT 1\/1/.test(gc.stats), gc.stats);
    const xy = await p.evaluate(() => [...document.querySelectorAll('#v-gc svg.court .gc-m')].map(c => [+c.getAttribute('cx'), +c.getAttribute('cy')]));
    T('…the away team shoots at the left rim, home at the right (Gobert\'s layup by the left rim, Mitchell\'s corner three on the right)', xy.some(([x, y]) => x < 7 && Math.abs(y - 24) < 1) && xy.some(([x, y]) => x > 80 && y < 5), JSON.stringify(xy));
    await p.click('[data-gc="side"][data-v="h"]'); await p.waitForTimeout(150);
    T('…filter one team (OKC: 2 made, 1 missed)', (await p.locator('#v-gc svg.court .gc-m').count()) === 2 && (await p.locator('#v-gc svg.court .gc-x').count()) === 1);
    await p.click('[data-gc="per"][data-v="2"]'); await p.waitForTimeout(150);
    T('…and one half (OKC in the 2nd half: 1 made)', (await p.locator('#v-gc svg.court .gc-m').count()) === 1 && (await p.locator('#v-gc svg.court .gc-x').count()) === 0);
    await p.click('[data-gc="zoom"][data-v="h"]'); await p.waitForTimeout(150);
    T('…zoom to one end of the floor', (await p.getAttribute('#v-gc svg.court', 'viewBox')) === '47 0 47 50');
    await p.goBack(); await p.waitForTimeout(500);
    T('the phone\'s back gesture works too: back to the Slate', /#slate$/.test(p.url()) && !(await p.evaluate(() => document.querySelector('#v-slate').hidden)));
    /* hockey */
    await p.click('#v-slate .g-gc[data-go="gc=nhl:401892782"]'); await p.waitForTimeout(1500);
    gc = await p.evaluate(() => { const v = document.querySelector('#v-gc'); return { rink: !!v.querySelector('svg.rink'), goals: [...v.querySelectorAll('svg.rink .gc-goal circle:first-child')].map(c => +c.getAttribute('cx')), stats: (v.querySelector('.gc-stats') || {}).innerText || '' }; });
    T('hockey: the rink, both BUF goals at the right-hand net even though the teams switched ends in the 2nd', gc.rink && gc.goals.length === 2 && gc.goals.every(x => x > 50), JSON.stringify(gc));
    T('…shots on goal and goals per team (BUF 2 G · 4 SOG; NYR 0 G · 2 SOG)', /BUF 2 G · 4 SOG/.test(gc.stats) && /NYR 0 G · 2 SOG/.test(gc.stats), gc.stats);
    await p.click('[data-gc="back"]'); await p.waitForTimeout(400);
    /* a straight link to a Gamecast (opened from outside the app): Back still lands on the Slate */
    await p.goto('https://desk.test/desk/#gc=nba:401909320', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    T('a shared Gamecast link opens straight to the game', !!(await p.$('#v-gc svg.court')));
    await p.click('[data-gc="back"]'); await p.waitForTimeout(500);
    T('…and Back takes it to the Slate', /#slate$/.test(p.url()));
    T('no page errors', errs.length === 0, errs.join(' | '));
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
