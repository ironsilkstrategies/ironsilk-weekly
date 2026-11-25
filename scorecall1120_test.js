/* v3.1.6 + public app v51 · Nov 20, Chris: "all the characters have predicted scores for every game… so I need them reflected next
   to their picks when you click a game in the public app." Each character's locked final-score call (d4.scorecalls) rides on the
   public board next to its calls (only the characters with a call on that game; never the derived Brain), and the public app's
   "Who's with it" panel shows it under each character: "Calls it CHI 115–108", with 🎯 once it graded dead on. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-14T18:00:00Z');
const V = []; let id = 0;
const call = (voice, market, side, pick, price, line) => V.push({ id: 't' + (id++), sp: 'nba', date: '2026-11-14', game: 'ATL@CHI', voice, market, side, pick, price, line, cf: 0.7, graded: false, hit: null });
call('Coach', 'total', 'under', 'Under 245.5', -110, 245.5); call('Scout', 'total', 'under', 'Under 245.5', -110, 245.5); call('Judge', 'total', 'over', 'Over 245.5', -110, 245.5);
call('Brain', 'total', 'under', 'Under 245.5', -110, 245.5); call('Judge', 'ml', 'home', 'CHI ML', -150, null);
const TC = { d: '2026-11-14', ts: NOW, by: { nba: { games: [{ g: 'ATL@CHI', s: '2026-11-15T01:00:00Z', id: '7', w: 1 }], picks: [
  { sp: 'nba', gid: '7', game: 'ATL@CHI', start: '2026-11-15T01:00:00Z', m: 'total', sd: 'under', pick: 'Under 245.5', price: -110, color: ' supreme', unan: true, chars: ['Coach', 'Scout'], mp: 0.62 }] } } };
const sc = (voice, a, h, extra) => [`nba|ATL@CHI|2026-11-14|${voice}`, { sp: 'nba', game: 'ATL@CHI', date: '2026-11-14', voice, a, h, ...(extra || {}) }];
const SC = Object.fromEntries([sc('Coach', 108, 115), sc('Scout', 110, 112), sc('Judge', 121, 126, { graded: 1, exact: 1, fa: 121, fh: 126 }), sc('Brain', 109, 114), sc('Covers', 112, 118),
  ['nba|ATL@CHI|2026-11-01|Coach', { sp: 'nba', game: 'ATL@CHI', date: '2026-11-01', voice: 'Coach', a: 99, h: 98 }]]);
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1');
  x.localStorage.setItem('d4.voices', JSON.stringify(V)); x.localStorage.setItem('d4.todaycard', JSON.stringify(TC)); x.localStorage.setItem('d4.scorecalls', JSON.stringify(SC)); } }).window;
setTimeout(() => { try {
  const B = w.eval(`pubBoard(roGet(VOICES_KEY,[])||[])`);
  const g = B && B.games[0];
  T('the board carries today\'s game with its calls', g && g.game === 'ATL@CHI' && (g.calls.total || []).length === 3, JSON.stringify(B && B.games.map(x => x.game)));
  T('each character with a call carries its final-score call: Coach 108–115, Scout 110–112', g.sc && JSON.stringify(g.sc.Coach) === '[108,115]' && JSON.stringify(g.sc.Scout) === '[110,112]', JSON.stringify(g.sc));
  T('a score call that graded dead on carries the 1 (the Judge, 121–126)', JSON.stringify(g.sc.Judge) === '[121,126,1]', JSON.stringify(g.sc.Judge));
  T('never the Brain (it\'s made from the others), never a character with no call on this game (Covers), never another day\'s call', !('Brain' in g.sc) && !('Covers' in g.sc) && Object.keys(g.sc).length === 3, Object.keys(g.sc).join(','));
  /* the public app */
  const src = fs.readFileSync(path.join(W, 'desk/app.js'), 'utf8');
  const line = name => { const m = src.match(new RegExp(`const ${name} = [^\\n]+;`)); if (!m) throw new Error('no ' + name); return m[0]; };
  const i = src.indexOf('function scoreCall('), j = src.indexOf('function whoOnHtml(', i);
  const { scoreCall } = new Function(`${line('esc')}\n${line('fin')}\n${src.slice(i, j)}\nreturn { scoreCall };`)();
  const strip = s => s.replace(/<[^>]+>/g, '').trim();
  T('the app writes the winner first: "Calls it CHI 115–108"', strip(scoreCall(g, 'Coach')) === 'Calls it CHI 115–108', strip(scoreCall(g, 'Coach')));
  T('…an away winner the same way: "Calls it ATL 121–118"', strip(scoreCall({ game: 'ATL@CHI', sc: { X: [121, 118] } }, 'X')) === 'Calls it ATL 121–118');
  T('…a tie (football) with both teams: "Calls it ATL 24–24 CHI"', strip(scoreCall({ game: 'ATL@CHI', sc: { X: [24, 24] } }, 'X')) === 'Calls it ATL 24–24 CHI');
  T('…and 🎯 dead on once it graded exact', /🎯 dead on/.test(scoreCall(g, 'Judge')) && !/dead on/.test(scoreCall(g, 'Coach')));
  T('…nothing when a character has no score call', scoreCall(g, 'Covers') === '' && scoreCall({ game: 'A@B' }, 'X') === '');
  /* v68 put the character's quote between the score call and its badge, so the row only has to carry both, in that order */
  T('the "Who\'s with it" rows carry it under each character\'s name and confidence', /\$\{scoreCall\(b, c\.v\)\}.*\$\{sayBadge\(c\.r\)\}/.test(src) && /\.won \.scc\{grid-column:1\/-1/.test(fs.readFileSync(path.join(W, 'desk/app.css'), 'utf8')));
  T('…and the panel says so when the board has them', /and the final score it calls/.test(src));
  const idx = fs.readFileSync(path.join(W, 'desk/index.html'), 'utf8'), sw = fs.readFileSync(path.join(W, 'desk/sw.js'), 'utf8');
  const v = (idx.match(/app\.js\?v=(\d+)/) || [])[1], cv = (idx.match(/app\.css\?v=(\d+)/) || [])[1];
  T('phones fetch the new app and stylesheet (index and service worker agree)', +v >= 51 && sw.includes(`'app.js?v=${v}'`) && sw.includes(`'app.css?v=${cv}'`) && +cv >= 31, v + ' / ' + cv);
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 400)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); }, 3000);
