/* v3.5.22 · Nov 25, Chris: "Why am I not seeing any characters making 1st half bets?" — they are (a side ledger, d4.halfcalls),
   and tracing it turned up a grading bug: DraftKings' NHL 1st-period moneyline is 3-way (the draw is its own outcome), so a tied
   period LOSES either side. The half grader called it a push, dropping 320 of 909 calls (+164.5u on the books, about −155u real).
   The ticket grader always graded it right. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 700))); };
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-25T18:00:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  const E = s => w.eval(s), J = JSON.stringify, P = s => JSON.parse(E(s));
  const D = E('today()');
  /* the finals: WPG@BOS tied 1-1 after one; MIA@PHI tied 55-55 at the half; NYR@BUF 2-0 */
  E(`finalsFor=function(sp,game){return game==='WPG@BOS'?{a:3,h:2,p1a:1,p1h:1}:game==='MIA@PHI'?{a:110,h:104,h1a:55,h1h:55}:game==='NYR@BUF'?{a:2,h:4,p1a:2,p1h:0}:null;};`);
  const call = (id, sp, game, mk, side, price, x = {}) => ({ sp, game, date: D, voice: 'Scout', mk, side, line: null, price, pick: '1P ' + side, ...x });
  E(`set(HALF_KEY,${J({
    a: call('a', 'nhl', 'WPG@BOS', 'p1ml', 'home', 150),
    b: call('b', 'nhl', 'WPG@BOS', 'p1ml', 'away', -105, { w3: 0 }),
    c: call('c', 'nba', 'MIA@PHI', 'h1ml', 'home', -120),
    d: call('d', 'nhl', 'NYR@BUF', 'p1ml', 'away', 190),
    old: { ...call('old', 'nhl', 'WPG@BOS', 'p1ml', 'away', 205), date: '2026-11-20', graded: 1, fa: 1, fh: 1, hit: null },
    oldw: { ...call('oldw', 'nhl', 'NYR@BUF', 'p1ml', 'away', 205), date: '2026-11-20', graded: 1, fa: 2, fh: 0, hit: true, units: 2.05 },
    oldnba: { ...call('oldnba', 'nba', 'MIA@PHI', 'h1ml', 'home', -120), date: '2026-11-20', graded: 1, fa: 50, fh: 50, hit: null } })});delete RO_CACHE[HALF_KEY];`);
  E('gradeHalfCalls()');
  const L = P('JSON.stringify(get(HALF_KEY,{}))');
  T('a tied 1st period LOSES a 3-way 1st-period moneyline (DraftKings\' board: both teams plus money)', L.a.graded && L.a.hit === false && L.a.units === -1, J(L.a));
  T('…a 2-way one (draw no bet) still pushes on a tie', L.b.graded && L.b.hit === null, J(L.b));
  T('…basketball\'s 1st-half moneyline (2-way) still pushes on a tied half', L.c.graded && L.c.hit === null, J(L.c));
  T('…and a period with a winner grades as before (+190 hit pays 1.9u)', L.d.hit === true && Math.abs(L.d.units - 1.9) < 1e-9, J(L.d));
  T('the ties already on the books are regraded once: a tied period on an old 3-way call is a loss now', L.old.hit === false && L.old.units === -1 && L.old.w3fix === 1, J(L.old));
  T('…old calls with a winner, and basketball halves, are left alone', L.oldw.hit === true && L.oldw.units === 2.05 && !L.oldw.w3fix && L.oldnba.hit === null && !L.oldnba.w3fix, J([L.oldw, L.oldnba]));
  E('gradeHalfCalls()');
  T('…once (grading again changes nothing)', J(P('JSON.stringify(get(HALF_KEY,{}))')) === J(L));
  const R = P(`JSON.stringify(halfRecord('nhl','Scout','p1ml'))`);
  T('the record counts the tied periods as the losses they were', R.w === 2 && R.l === 2 && Math.abs(R.u - (1.9 + 2.05 - 2)) < 1e-9, J(R));
  /* new calls are stamped 3-way or 2-way from the two prices */
  E(`set(HALF_KEY,{});delete RO_CACHE[HALF_KEY];set(HALFLN_KEY,{d:today(),g:{'nhl|WPG@BOS':{ml:{a:{price:205},h:{price:150}},src:'dk'},'nhl|NYR@BUF':{ml:{a:{price:100},h:{price:-120}}}}});delete RO_CACHE[HALFLN_KEY];`);
  const n1 = E(`halfCallsLog('nhl',{away:{abbr:'WPG'},home:{abbr:'BOS'}},[{date:today()}],[{voice:'Scout',a:2,h:3.4}])`);
  const n2 = E(`halfCallsLog('nhl',{away:{abbr:'NYR'},home:{abbr:'BUF'}},[{date:today()}],[{voice:'Scout',a:2,h:3.4}])`);
  const L2 = P('JSON.stringify(get(HALF_KEY,{}))');
  const k1 = Object.keys(L2).find(k => /WPG@BOS.*p1ml/.test(k)), k2 = Object.keys(L2).find(k => /NYR@BUF.*p1ml/.test(k));
  T('a new 1st-period moneyline call is stamped 3-way when its prices leave room for the draw (+205 / +150), 2-way when they don\'t (+100 / −120)', n1 >= 1 && n2 >= 1 && L2[k1].w3 === 1 && L2[k2].w3 === 0, J([L2[k1], L2[k2]]));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 3000);
