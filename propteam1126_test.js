/* v3.5.33 · Nov 26, Chris: "when it's a prop can we label what team they play for next to their names … on public and the machine".
   What people see gets the team; the stored pick (which the live box score reads the name out of) stays plain. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) { x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  const c = { player: 'Josh Allen', team: 'BUF', thr: 250, k: 'py', side: 'over' };
  w.__c = c;
  const line = w.eval('cpropLine(window.__c)'), pick = w.eval('cpropPick(window.__c)');
  T('what people see: "Josh Allen (BUF) …"', /^Josh Allen \(BUF\) 250\+/.test(line), line);
  T('the stored pick stays "Josh Allen 250+ …"', /^Josh Allen 250\+/.test(pick), pick);
  w.__l = { player: 'Josh Allen', team: 'BUF', pick };
  T('a ticket/parlay leg shows the team too', /^Josh Allen \(BUF\) 250\+/.test(w.eval('pkShow(window.__l)')));
  w.__l = { pick: 'BUF ML', team: 'BUF' };
  T('a game pick is untouched', w.eval('pkShow(window.__l)') === 'BUF ML');
  w.__l = { player: 'Josh Allen', team: 'BUF', pick: 'Josh Allen (BUF) 250+ pass yds' };
  T('never doubled', w.eval('pkShow(window.__l)') === 'Josh Allen (BUF) 250+ pass yds');
  /* v3.5.34 · "Can we get live updates here" (Props): a card whose sport's page wasn't loaded on this phone still gets its game, from today's card */
  w.localStorage.setItem('d4.todaycard', JSON.stringify({ by: { nfl: { picks: [{ game: 'KC@BUF', start: '2026-11-27T01:20:00Z', pick: 'BUF ML' }] } } }));
  const o = JSON.parse(w.eval(`JSON.stringify(pubPropOpp('nfl','KC'))`) || 'null');
  T('a prop\'s game from today\'s card when the NFL page hasn\'t loaded: KC at BUF, with the kickoff', o && o.opp === 'BUF' && o.home === false && o.start === '2026-11-27T01:20:00Z', JSON.stringify(o));
  T('…and nothing invented for a team with no game today', w.eval(`pubPropOpp('nfl','SEA')`) === null);
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 400)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 2500);
