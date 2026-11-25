/* v3.5.26 · Nov 25, 2:57 PM, Chris: "I want them in the actual character menu when you click the character… so I can see the record it carries
   with parlays and its parlay history". The machine publishes each character's ticket history with its legs (par.hist). */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 900))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-25T20:00:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  const E = s => w.eval(s), J = JSON.stringify;
  const g = (game, pick, price, hit, x = {}) => ({ sp: 'nba', game, pick, price, p: 0.6, ...(hit != null ? { hit } : {}), ...x });
  const CPA = {
    '2026-11-23': { locked: true, by: { Scout: { voice: 'Scout', legs: [g('MIA@PHI', 'PHI ML', -150, true), g('SA@SAC', 'Over 225', -110, true)], p: 0.44, done: true, won: true, skill: true } } },
    '2026-11-24': { locked: true, by: { Scout: { voice: 'Scout', legs: [g('NYK@BOS', 'BOS -3.5', -110, false), g('LAL@GSW', 'GSW ML', -120, true), g('DEN@PHX', 'Under 230', -110, null, { push: true })], p: 0.31, done: true, won: false } } },
    '2026-11-22': { locked: true, by: { Scout: { voice: 'Scout', legs: [g('CHI@MIL', 'MIL ML', -200, true), g('ATL@ORL', 'ATL +5.5', -110)], p: 0.5 } } },
    '2026-11-25': { locked: true, by: { Scout: { voice: 'Scout', legs: [g('OKC@MIN', 'OKC ML', -130, null)], p: 0.55 } } },
    '2026-11-20': { locked: false, by: { Scout: { voice: 'Scout', legs: [g('X@Y', 'X ML', 100, true)] } } } };
  const CPXA = { '2026-11-24': { locked: true, by: { Scout: { voice: 'Scout', legs: [{ kind: 'prop', sp: 'nba', player: 'Jalen Brunson', k: 'pts', thr: 25, side: 'over', pick: 'Jalen Brunson 25+ PTS', price: -150, hit: true }, { kind: 'prop', sp: 'nba', player: 'Tyrese Maxey', k: 'ast', thr: 6, side: 'over', pick: 'Tyrese Maxey 6+ AST', price: -120, hit: true }], p: 0.55, done: true, won: true } } } };
  const R = JSON.parse(E(`JSON.stringify(pubParRec('Scout','2026-09-26','2026-11-25',${J(CPA)},${J(CPXA)}))`));
  const H = R.hist || [];
  T('every ticket from the days before today, newest first (props after the game ticket on a day); today\'s and unlocked days stay out', H.map(t => t.d + ':' + t.k).join(',') === '2026-11-24:game,2026-11-24:props,2026-11-23:suit,2026-11-22:game', J(H.map(t => t.d + ':' + t.k)));
  const won = H.find(t => t.d === '2026-11-23'), lost = H.find(t => t.d === '2026-11-24' && t.k === 'game'), wait = H.find(t => t.d === '2026-11-22'), pr = H.find(t => t.k === 'props');
  T('a cashed ticket: its price, what it paid, its chance to cash (−150 and −110 → +218, +2.18u, 44%)', won && won.r === 'win' && won.price === 218 && Math.abs(won.u - 2.18) < 0.011 && won.p === 0.44, J(won));
  T('…a missed one costs the unit, the pushed leg drops out of the price', lost && lost.r === 'loss' && lost.u === -1 && lost.price === 250, J(lost));
  T('…its legs: each pick, its price and how it went (✓ 1, ✗ 0, push 2)', lost && J(lost.legs.map(l => [l.g, l.pk, l.pr, l.h])) === J([['NYK@BOS', 'BOS -3.5', -110, 0], ['LAL@GSW', 'GSW ML', -120, 1], ['DEN@PHX', 'Under 230', -110, 2]]), J(lost && lost.legs));
  T('…one still waiting on a leg is in the history as waiting (no result, no units)', wait && wait.r === null && wait.u === 0 && wait.legs[1].h === null, J(wait));
  T('…a prop parlay\'s legs read as the props they were', pr && pr.r === 'win' && pr.legs[0].pk === 'Jalen Brunson 25+ PTS' && pr.legs[0].g === '', J(pr));
  T('the records and the last-six chips are as before', R.suit.w === 1 && R.game.l === 1 && R.props.w === 1 && R.last.length === 3, J([R.suit, R.game, R.props, R.last.length]));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 3000);
