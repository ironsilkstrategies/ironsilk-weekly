/* v3.5.20 · Nov 24, 10:35 PM, Chris: "Yes" (test whether the team book should move confidence before it ever does). The shadow test:
   every graded call, as it's rolled into the splits, gets the nudge the team book would have given it, from calls graded BEFORE it
   (never its own result), and is judged against its own confidence. Running numbers only; it never touches a pick; the verdict rule
   is written down in advance. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 700))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-25T05:00:00Z'), D = '2026-11-24';
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  const E = s => w.eval(s), J = JSON.stringify;
  /* the Judge's college book before tonight: half its overs hit, half its unders; but overs in ND games 9-1 and in CMU games 6-1, unders in
     KENT games 1-7, and overs in UNC games 5-0 (one short of counting) */
  const S = { ncaab: { Judge: { total: { all: [80, 80, 0], side: { over: [40, 40, 0], under: [40, 40, 0] }, role: {}, team: { ND: { over: [9, 1, 0] }, CMU: { over: [6, 1, 0] }, KENT: { under: [1, 7, 0] }, UNC: { over: [5, 0, 0] } }, h2h: {} },
    ml: { all: [30, 20, 0], side: {}, role: { fav: [30, 20, 0] }, team: { WYO: [7, 0, 0] }, h2h: { 'KENT-WYO': { WYO: [7, 0, 0] } } } } } };
  E(`set(SPLIT_KEY,${J(S)});delete RO_CACHE[SPLIT_KEY];set(TMS_KEY,null);TMS_C=null;coachConf=x=>x.__c!=null?x.__c:0.6;`);
  const call = (id, game, market, side, hit, c, x = {}) => ({ id, sp: 'ncaab', date: D, game, voice: 'Judge', market, side, price: -110, pick: side, cf: c, __c: c, graded: true, hit, push: false, ...x });
  const roll = calls => E(`(()=>{const V=get(VOICES_KEY,[]).concat(${J(calls)});set(VOICES_KEY,V);delete RO_CACHE[VOICES_KEY];return 1;})()`);
  const Z = () => JSON.parse(E(`JSON.stringify(get(TMS_KEY,null))`));
  /* 1 · an over in CMU@ND that hit, at 69%: both lines count (7 and 10 calls, well past half) → +2 and +2, capped at +3 → 72%, over the Judge's 70 bar */
  roll([call('a1', 'CMU@ND', 'total', 'over', true, 0.69, { line: 152.5 })]);
  let t = Z();
  T('a graded call gets the nudge it would have had: pushed up 3 points (two strong lines, capped), judged against its own 69%', t && t.all.up.n === 1 && t.all.up.h === 1 && Math.abs(t.all.up.c - 0.69) < 1e-9 && Math.abs(t.all.up.d - 0.03) < 1e-9, J(t && t.all));
  T('…69% + 3 crosses the Judge\'s 70 bar: one pick it would have made official, a win at -110', t.all.fin.n === 1 && t.all.fin.w === 1 && Math.abs(t.all.fin.u - 100 / 110) < 1e-6 && t.all.fout.n === 0, J(t.all.fin));
  T('…the nudged number landed closer to what happened (Brier)', t.all.bn < t.all.bb, J([t.all.bb, t.all.bn]));
  T('…counted for the Judge and for everyone', t.by.Judge && t.by.Judge.up.n === 1 && t.from === D, J(t.by));
  /* 2 · never its own result: UNC overs were 5-0, one short of the six a line needs; this over hits and makes it 6-0, but it's judged on 5-0 */
  roll([call('a2', 'UNC@VT', 'total', 'over', true, 0.62, { line: 140 })]);
  t = Z();
  T('a call is judged on the book before it, never on its own result (UNC overs 5-0 → no nudge, though it makes them 6-0)', t.all.up.n === 1 && t.all.n0 === 1, J(t.all));
  T('…and it still joined the book as usual (UNC overs now 6-0)', J(JSON.parse(E(`JSON.stringify(get(SPLIT_KEY,{}).ncaab.Judge.total.team.UNC.over)`))) === J([6, 0, 0]));
  /* 3 · pushed down: an under in a KENT game, where its unders are 1-7, that missed; and a WYO moneyline (7-0 with them) that hit */
  roll([call('a3', 'WYO@KENT', 'total', 'under', false, 0.71, { line: 138 }), call('a4', 'WYO@KENT', 'ml', 'away', true, 0.74, { pick: 'WYO ML', price: -410 })]);
  t = Z();
  T('pushed down: its under in a KENT game (1-7 on those) loses 2 points, and the miss is on the books against its 71%', t.all.dn.n === 1 && t.all.dn.h === 0 && Math.abs(t.all.dn.d + 0.02) < 1e-9, J(t.all.dn));
  T('…71% − 2 drops under the bar: a pick it would have taken off (a loss, so dropping it saves the unit)', t.all.fout.n === 1 && t.all.fout.w === 0 && t.all.fout.u === -1, J(t.all.fout));
  T('…and with a team on the moneyline (WYO 7-0 with, KENT 7-0 against): pushed up', t.all.up.n === 2 && t.all.up.h === 2, J(t.all.up));
  /* 4 · each call once; pushes and the Blend are left out */
  roll([call('a5', 'CMU@ND', 'total', 'over', null, 0.6, { push: true, line: 150 }), { ...call('a6', 'CMU@ND', 'total', 'over', true, 0.6, { line: 150 }), voice: 'Blend' }]);
  E(`(()=>{const V=get(VOICES_KEY,[]);set(VOICES_KEY,V);delete RO_CACHE[VOICES_KEY];})()`);
  const t2 = Z();
  T('every call counted once (writing the ledger again adds nothing), pushes and the Blend left out', J(t2.all) === J(t.all), J([t.all, t2.all]));
  /* 5 · it never touches a pick */
  const V = JSON.parse(E(`JSON.stringify(get(VOICES_KEY,[]))`));
  T('it never touches a call: the confidence and every field are as they were (only the rolled mark)', V.every(c => c.cf === c.__c) && V.filter(c => c.voice === 'Judge').every(c => c.sr === 1) && !V.some(c => 'tm' in c || 'tms' in c || 'nudge' in c), J(V.map(c => Object.keys(c))));
  const coach = fs.readFileSync(path.join(W, 'desk-coach.js'), 'utf8');
  T('…and the Coach\'s confidence doesn\'t read it (chemistry and weather only)', !/tms|tbTell|tbBook|tbAll/.test(coach));
  /* 6 · the verdict, by the rules written down */
  const zero = () => ({ up: { n: 0, h: 0, c: 0, v: 0, d: 0 }, dn: { n: 0, h: 0, c: 0, v: 0, d: 0 }, n0: 0, bb: 0, bn: 0, fin: { n: 0, w: 0, u: 0 }, fout: { n: 0, w: 0, u: 0 } });
  const mk = (upN, upH, dnN, dnH, c, bb, bn, fu, fo) => ({ ...zero(), up: { n: upN, h: upH, c: c * upN, v: c * (1 - c) * upN, d: 0.025 * upN }, dn: { n: dnN, h: dnH, c: c * dnN, v: c * (1 - c) * dnN, d: -0.025 * dnN }, n0: 2000, bb, bn, fin: { n: 10, w: 6, u: fu }, fout: { n: 5, w: 2, u: fo } });
  const verdict = (Zx, from) => JSON.parse(E(`JSON.stringify(tmsVerdict(${J(Zx)},'${from}'))`));
  const strong = mk(200, 140, 150, 75, 0.6, 80, 78, 3.1, -1.2);   /* up hits 70% vs 60%, down 50% vs 60% */
  T('too early before 21 days, however good it looks', verdict(strong, '2026-11-20').st === 'early');
  const vS = verdict(strong, '2026-10-25');
  T('after 21 days and 300 nudged calls: pushed-up beat their confidence, pushed-down fell short (z ≥ 2), closer, and the changed official picks made money → earned', vS.st === 'earned' && vS.z >= 2 && vS.size > 0 && vS.size <= 0.02, J(vS));
  T('…sized by what it actually earned (up 10 pts over its confidence on a 2.5-pt nudge → the full 2 points)', Math.abs(vS.size - 0.02) < 1e-9, J(vS));
  T('no edge after the minimum → not earning it', verdict(mk(200, 121, 150, 89, 0.6, 80, 80.5, 0.4, 0.2), '2026-10-25').st === 'no');
  T('an edge but the official picks it would have changed lost money → not earned (keeps watching)', verdict(mk(200, 140, 150, 75, 0.6, 80, 78, -2, 1), '2026-10-25').st === 'watch');
  /* 7 · the Records page shows it */
  const h = E('tmsHtml()');
  T('the Records → Characters page shows the test: the verdict, the pushed up/down records against their confidence, the official picks it would change, the rule', /Team book · shadow test/.test(h) && /Too early: day \d+ of 21, \d+ of 300 nudged calls/.test(h) && /pushed up: hit \(vs conf\)/.test(h) && /official it would add \/ drop/.test(h) && /z ≥ 2 together/.test(h) && /Everyone/.test(h), h.slice(0, 600));
  T('…beside chemistry', /chemHtml\(\)\}catch\(e\)\{return''\}\}\)\(\)\+\(\(\)=>\{try\{return tmsHtml\(\)/.test(fs.readFileSync(path.join(W, 'shared.js'), 'utf8')));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 3000);
