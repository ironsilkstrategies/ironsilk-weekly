/* v3.5.14 · Nov 23, 11:32 PM, Chris: "it's giving losses when the characters picked right … which threw off the unanimous picks … a glitch
   that has to be fixed site wide". CLE@CHI: the Commissioner and the Grinder took Cavaliers ML while their exact finals said CHI 127–126;
   Covers took Bulls +8.5 with a final that had CLE by 9. Saved before every score had to agree with its picks and never recomputed before
   tip-off. Now every pre-game score call is checked against the character's calls on every voices pass and before every publish. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-23T22:00:00Z');   /* Nov 23, 4 PM CT — before the 7 PM tip */
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  const E = s => w.eval(s), J = JSON.stringify, D = '2026-11-23';
  const call = (voice, game, market, side, line, pick) => ({ id: [voice, 'nba', game, D, market].join('|'), sp: 'nba', date: D, game, voice, market, side, line, price: -110, pick, cf: 0.6, graded: false, hit: null });
  const V = [call('Power', 'CLE@CHI', 'ml', 'away', null, 'CLE ML'), call('Power', 'CLE@CHI', 'spread', 'home', 8.5, 'CHI +8.5'),
    call('H_L2e1', 'CLE@CHI', 'ml', 'away', null, 'CLE ML'), call('H_L2e1', 'CLE@CHI', 'spread', 'home', 8.5, 'CHI +8.5'), call('H_L2e1', 'CLE@CHI', 'total', 'over', 239.5, 'Over 239.5'),
    call('Covers', 'CLE@CHI', 'ml', 'away', null, 'CLE ML'), call('Covers', 'CLE@CHI', 'spread', 'home', 8.5, 'CHI +8.5'), call('Covers', 'CLE@CHI', 'total', 'under', 239.5, 'Under 239.5'),
    call('Sim', 'CLE@CHI', 'ml', 'away', null, 'CLE ML'), call('Sim', 'CLE@CHI', 'spread', 'home', 8.5, 'CHI +8.5'), call('Sim', 'CLE@CHI', 'total', 'over', 239.5, 'Over 239.5'),
    call('Judge', 'PHX@NO', 'ml', 'away', null, 'PHX ML'), call('Scout', 'MEM@CHA', 'ml', 'away', null, 'MEM ML')];
  const id = (g, v) => ['nba', g, D, v].join('|');
  const SC = { [id('CLE@CHI', 'Power')]: { sp: 'nba', game: 'CLE@CHI', date: D, voice: 'Power', a: 126, h: 127 }, [id('CLE@CHI', 'H_L2e1')]: { sp: 'nba', game: 'CLE@CHI', date: D, voice: 'H_L2e1', a: 126, h: 127 },
    [id('CLE@CHI', 'Covers')]: { sp: 'nba', game: 'CLE@CHI', date: D, voice: 'Covers', a: 124, h: 115 }, [id('CLE@CHI', 'Sim')]: { sp: 'nba', game: 'CLE@CHI', date: D, voice: 'Sim', a: 130, h: 123 },
    [id('PHX@NO', 'Judge')]: { sp: 'nba', game: 'PHX@NO', date: D, voice: 'Judge', a: 110, h: 115, graded: 1, fa: 110, fh: 101 },          /* graded: stays as made */
    [id('MEM@CHA', 'Scout')]: { sp: 'nba', game: 'MEM@CHA', date: D, voice: 'Scout', a: 100, h: 104 } };                                  /* under way: stays as made */
  const TC = { d: D, ts: NOW, by: { nba: { games: [], picks: [{ sp: 'nba', game: 'CLE@CHI', start: '2026-11-24T01:00:00Z', m: 'ml', sd: 'away', pick: 'CLE ML' }, { sp: 'nba', game: 'MEM@CHA', start: '2026-11-23T21:00:00Z', m: 'ml', sd: 'away', pick: 'MEM ML' }, { sp: 'nba', game: 'PHX@NO', start: '2026-11-23T20:00:00Z', m: 'ml', sd: 'away', pick: 'PHX ML' }] } } };
  E(`set(VOICES_KEY,${J(V)});set(SCORECALL_KEY,${J(SC)});set(TC_KEY,${J(TC)});`);
  const n = E('scoreCallsReconcile()'), L = JSON.parse(E('JSON.stringify(get(SCORECALL_KEY,{}))')), at = (g, v) => L[id(g, v)];
  T('the Commissioner on Cavaliers ML no longer calls CHI 127–126: its final now has CLE winning (and still inside +8.5)', at('CLE@CHI', 'Power').a > at('CLE@CHI', 'Power').h && at('CLE@CHI', 'Power').a - at('CLE@CHI', 'Power').h < 8.5, J(at('CLE@CHI', 'Power')));
  T('…the Grinder too, and its total still clears its over (239.5)', at('CLE@CHI', 'H_L2e1').a > at('CLE@CHI', 'H_L2e1').h && at('CLE@CHI', 'H_L2e1').a + at('CLE@CHI', 'H_L2e1').h > 239.5, J(at('CLE@CHI', 'H_L2e1')));
  T('…Covers on Bulls +8.5 and the under: CLE by under 8.5, the total under 239.5', (x => x.a > x.h && x.a - x.h < 8.5 && x.a + x.h < 239.5)(at('CLE@CHI', 'Covers')), J(at('CLE@CHI', 'Covers')));
  T('…a score that already agreed is left alone (the Simulator, CLE 130–123)', at('CLE@CHI', 'Sim').a === 130 && at('CLE@CHI', 'Sim').h === 123 && !at('CLE@CHI', 'Sim').fixed);
  T('a graded call and a game already under way stay exactly as they were made', at('PHX@NO', 'Judge').a === 110 && at('PHX@NO', 'Judge').h === 115 && at('MEM@CHA', 'Scout').a === 100 && at('MEM@CHA', 'Scout').h === 104, J([at('PHX@NO', 'Judge'), at('MEM@CHA', 'Scout')]));
  T('three calls fixed, and a second pass finds nothing left to fix', n === 3 && E('scoreCallsReconcile()') === 0, n);
  /* it runs on its own: after every voices pass */
  E(`set(SCORECALL_KEY,${J(SC)});VLOG_SIG.nba=null;`); E(`voicesLog('nba',true)`);
  const L2 = JSON.parse(E('JSON.stringify(get(SCORECALL_KEY,{}))'));
  T('every voices pass ends with the check (the Commissioner is fixed without anyone asking)', L2[id('CLE@CHI', 'Power')].a > L2[id('CLE@CHI', 'Power')].h, J(L2[id('CLE@CHI', 'Power')]));
  const src = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  T('…and every publish starts with it', /try\{if\(scoreCallsReconcile\(\)\)\{PUB_BOARD_MEMO=null;\}\}catch\(e\)\{\}[^\n]*\n\s*const F=publicFeed\(\)/.test(src));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 2500);
