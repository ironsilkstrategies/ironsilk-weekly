/* v3.1.7 + public app v53 · Nov 21, Chris: "can the forecast emoji be on game picks on the slate so I know if I should stay away or
   it's working?" The machine's Forecast (desk-fcst.js) rides on the public board as board.fc: for every game lane (sport · bet type ·
   side) its weather level and the week and month behind it. The app reads each pick's lane the same way the machine files it. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-21T18:00:00Z');
const V = []; let id = 0;
/* one graded call: sport, day, game, voice, market, side, the line on that side, price, hit */
const g = (sp, date, game, voice, market, side, line, price, hit) => { const [A, H] = game.split('@');
  const pick = market === 'ml' ? (side === 'home' ? H : A) + ' ML' : market === 'total' ? (side === 'over' ? 'Over ' : 'Under ') + line : (side === 'home' ? H : A) + ' ' + (line > 0 ? '+' : '') + line;
  V.push({ id: 'f' + (id++), sp, date, game, voice, market, side, line: market === 'ml' ? null : line, price, pick, cf: 0.7, graded: true, hit }); };
const days = ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
/* NBA unders: 10 picks, 8 hit at −110 → +5.3u, +53% a pick → ☀️ working. Two characters on the same pick count once. */
for (let i = 0; i < 10; i++) { g('nba', days[i % 6], `A${i}@H${i}`, 'Coach', 'total', 'under', 220.5 + i, -110, i < 8); if (i < 3) g('nba', days[i % 6], `A${i}@H${i}`, 'Scout', 'total', 'under', 220.5 + i, -110, i < 8); }
/* NBA spread dogs: 10 picks, 2 hit → −6.2u → 🌧 not working (under 20 picks, so not ⛈) */
for (let i = 0; i < 10; i++) g('nba', days[i % 6], `D${i}@E${i}`, 'Judge', 'spread', 'away', 6.5, -110, i < 2);
/* NBA spread favorites: 22 picks, 4 hit → ⛈ broken */
for (let i = 0; i < 22; i++) g('nba', days[i % 6], `F${i}@G${i}`, 'Sim', 'spread', 'home', -4.5, -110, i < 4);
/* NBA ML favorites: 4 picks → 💤 too few to say */
for (let i = 0; i < 4; i++) g('nba', days[i % 6], `M${i}@N${i}`, 'Covers', 'ml', 'home', null, -150, true);
/* NHL ML dogs at +150: 10 picks, 5 hit → +2.5u, +25% → ☀️; a heavy favorite (−600) files in its own lane */
for (let i = 0; i < 10; i++) g('nhl', days[i % 6], `P${i}@Q${i}`, 'Power', 'ml', 'away', null, 150, i < 5);
for (let i = 0; i < 9; i++) g('nhl', days[i % 6], `R${i}@S${i}`, 'Power', 'ml', 'home', null, -600, true);
/* a moneyline with no real price is never filed (no line, no listing) */
g('nhl', days[0], 'X@Y', 'Coach', 'ml', 'home', null, null, true);
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1');
  x.localStorage.setItem('d4.voices', JSON.stringify(V)); } }).window;
setTimeout(() => { try {
  const B = w.eval(`pubBoard(roGet(VOICES_KEY,[])||[])`);
  const F = B && B.fc;
  T('the public board carries the Forecast (board.fc)', !!F && typeof F === 'object', JSON.stringify(B && Object.keys(B)));
  T('NBA unders, 8–2 at −110: ☀️ working (lv 2), the week 8–2 +5.3u, each pick once (the Scout on the same three adds nothing)', F['nba|total|under'] && F['nba|total|under'].lv === 2 && F['nba|total|under'].w === 8 && F['nba|total|under'].l === 2 && F['nba|total|under'].u === 5.3, JSON.stringify(F['nba|total|under']));
  T('NBA spread dogs, 2–8: 🌧 not working (lv −2)', F['nba|spread|dog'] && F['nba|spread|dog'].lv === -2, JSON.stringify(F['nba|spread|dog']));
  T('NBA spread favorites, 4–18 on 22 picks: ⛈ broken (lv −3)', F['nba|spread|fav'] && F['nba|spread|fav'].lv === -3, JSON.stringify(F['nba|spread|fav']));
  T('NBA ML favorites on 4 picks: 💤 too few to say (lv null), the record still rides', F['nba|ml|fav'] && F['nba|ml|fav'].lv === null && F['nba|ml|fav'].w === 4, JSON.stringify(F['nba|ml|fav']));
  T('NHL ML dogs at +150, 5–5: ☀️ (it pays); a −600 favorite files in the heavy lane, not with the favorites', F['nhl|ml|dog'] && F['nhl|ml|dog'].lv === 2 && F['nhl|ml|heavy'] && F['nhl|ml|heavy'].w === 9 && !F['nhl|ml|fav'], JSON.stringify([F['nhl|ml|dog'], F['nhl|ml|heavy'], F['nhl|ml|fav']]));
  T('the 30-day record rides too, and nothing but game lanes (no props, no picks)', F['nba|total|under'].w30 === 8 && Object.keys(F).every(k => /^(nfl|ncaaf|nba|ncaab|nhl|mlb)\|(ml|spread|total)\|(fav|dog|heavy|over|under)$/.test(k)) && !JSON.stringify(F).includes('pick'), Object.keys(F).join(','));
  T('a moneyline with no real price never counts (the unpriced X@Y win would have made the NHL dogs 6–5)', F['nhl|ml|dog'].w === 5 && F['nhl|ml|dog'].l === 5, JSON.stringify(F['nhl|ml|dog']));
  /* the machine's own reading agrees with the board, lane for lane */
  const M = w.eval(`(()=>{const o={};fcData().lanes.forEach(L=>{o[L.k]=fcIcon(L)[0];});return o;})()`);
  const LV = { '☀️': 2, '🌤': 1, '⛅': 0, '🌥': -1, '🌧': -2, '⛈': -3, '💤': null };
  T('every lane on the board matches the Forecast card in the machine (same icon, same level)', Object.entries(F).every(([k, o]) => LV[M[k]] === o.lv), JSON.stringify(M));
  /* the app files a pick the same way */
  const src = fs.readFileSync(path.join(W, 'desk/app.js'), 'utf8');
  const line = name => { const m = src.match(new RegExp(`const ${name} = [^\\n]+;`)); if (!m) throw new Error('no ' + name); return m[0]; };
  const i = src.indexOf('function laneOf('), j = src.indexOf('const fcLab', i);
  const { laneOf } = new Function(`${line('fin')}\n${src.slice(i, j)}\nreturn { laneOf };`)();
  const role = x => { const m = x.market; return m === 'total' ? (/under/i.test(x.side) ? 'under' : 'over') : m === 'spread' ? (x.line != null && +x.line < 0 ? 'fav' : x.line != null && +x.line > 0 ? 'dog' : (+x.price < 0 ? 'fav' : 'dog')) : (+x.price <= -500 ? 'heavy' : +x.price < 0 ? 'fav' : 'dog'); };
  const priced = V.filter(x => x.market !== 'ml' || Math.abs(+x.price) >= 100);
  const bad = priced.filter(x => laneOf(x.sp, x.market, x.side, x.pick, x.price) !== `${x.sp}|${x.market}|${role(x)}`);
  T('the app reads every pick\'s lane the way the machine files it (totals by side, spreads by the line\'s sign, moneylines by price)', !bad.length, JSON.stringify(bad.slice(0, 2).map(x => [x.pick, x.price, laneOf(x.sp, x.market, x.side, x.pick, x.price)])));
  T('…a pick\'em spread goes by its price, an unpriced moneyline has no lane', laneOf('nba', 'spread', 'home', 'BOS 0', -105) === 'nba|spread|fav' && laneOf('nba', 'spread', 'away', 'NY 0', 105) === 'nba|spread|dog' && laneOf('nba', 'ml', 'home', 'BOS ML', null) === null && laneOf('ncaab', 'spread', 'away', 'SIE −6', -110) === 'ncaab|spread|fav');
  /* the board is still the board */
  T('the board keeps its shape (date, games, cast, heavy line)', B.d === '2026-11-21' && Array.isArray(B.games) && B.cast && B.heavy != null);
  /* no Forecast script on the page: the board goes out without it */
  const B2 = w.eval(`(()=>{const f=window.fcData;window.fcData=undefined;PUB_BOARD_MEMO=null;try{return pubBoard(roGet(VOICES_KEY,[])||[]);}finally{window.fcData=f;PUB_BOARD_MEMO=null;}})()`);
  T('…and without the Forecast loaded, the board still goes out (no fc, nothing breaks)', B2 && !('fc' in B2) && Array.isArray(B2.games), JSON.stringify(B2 && Object.keys(B2)));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 500)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); }, 3000);
