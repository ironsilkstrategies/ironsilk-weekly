/* v3.5.30 · Nov 26, 12:41 PM, Chris, on capping heavy prop legs in the characters' parlays: "Whatever you feel yields the best results
   for us". 71 settled prop parlays went 55–16 and lost 4.5 units on −850 to −3,233 legs; overs rated 85%+ hit under their number and
   cost three times as much a leg as those under 85%. A prop goes into a parlay only under 85% sure; the props of the day are unchanged. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 900))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-27T15:00:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true;
  x.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(async () => { try {
  const E = s => w.eval(s), J = JSON.stringify, P = s => JSON.parse(E(s));
  /* the Judge's over calls tonight: two gimmes (93%, 88%), two in the band that has paid (84%, 81%), one at 74% */
  const calls = [['Gimme Guard', 'BOS', 0.93], ['Lock Wing', 'NYK', 0.88], ['Band Center', 'MIA', 0.84], ['Band Forward', 'LAL', 0.81], ['Low Guard', 'DEN', 0.74]]
    .map(([player, team, cal]) => ({ voice: 'Judge', sp: 'nba', player, team, k: 'pts', thr: 20, cal, p: cal, side: 'over', fav: '', rec: '', why: '' }));
  const games = { BOS: 'BOS@PHI', NYK: 'NYK@TOR', MIA: 'MIA@ORL', LAL: 'LAL@PHX', DEN: 'DEN@UTA' };
  E(`cpropToday=()=>${J(calls)};cpxPropGame=(sp,team)=>(${J(games)})[team]||null;localStorage.removeItem(DESK_KEY);`);
  T('the cap: 85% (about −795 at the desk\'s price)', E('CPX_PROP_MAXP') === 0.85 && E('cpxPropPrice(0.85)') === -795, E('cpxPropPrice(0.85)'));
  const plan = P(`JSON.stringify(deskAllocate(null,today()))`);
  const px = plan.px && plan.px.Judge, legs = px ? px.legs.filter(l => l.kind === 'prop') : [];
  T('the Judge\'s prop parlay takes its most confident props UNDER 85% (84% and 81%), not the 93% and 88% gimmes', legs.length === 2 && J(legs.map(l => l.player).sort()) === J(['Band Center', 'Band Forward']), J(px));
  T('…so every leg is priced longer than −800 (it was −852 to −3,233 on Thanksgiving)', legs.every(l => l.price > -800), J(legs.map(l => l.price)));
  T('…and the ticket lands in the −200 to −400 band that has paid (here about −250)', px && px.dec >= 1.25 && px.dec <= 1.5, px && px.dec);
  T('the props of the day (singles) are unchanged: the Judge\'s best is still its 93% call', (plan.props || []).some(c => c.player === 'Gimme Guard' && c.v === 'Judge'), J(plan.props));
  const cx = P(`JSON.stringify(cpxBuild('Judge',[],today(),${J(calls)}))`);
  T('the older "with props" builder holds the same line (no 85%+ prop leg)', cx && cx.legs.filter(l => l.kind === 'prop').every(l => l.p < 0.85) && cx.legs.some(l => l.kind === 'prop'), J(cx && cx.legs.map(l => [l.player, l.p])));
  E(`cpropToday=()=>${J(calls.slice(0, 2))};localStorage.removeItem(DESK_KEY);`);
  const p2 = P(`JSON.stringify(deskAllocate(null,today()))`);
  T('a character with only gimmes today gets no prop parlay (better none than a −1,800 ticket)', !(p2.px && p2.px.Judge), J(p2.px));
  T('version 3.5.30 or later', (v => v[0] > 3 || (v[0] === 3 && (v[1] > 5 || (v[1] === 5 && v[2] >= 30))))(String(E('DESK_VER')).split('.').map(Number)), E('DESK_VER'));
} catch (e) { T('no exceptions', false, e && e.stack); }
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
}, 2500);
