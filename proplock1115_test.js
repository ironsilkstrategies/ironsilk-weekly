/* v3.0.35 · a character's official props are locked for the day once published: grading one doesn't swap in a new one. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + String(d).slice(0, 400) : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-15T18:00:00Z'), D = '2026-11-15';
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) { const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  const P = (n, p) => ({ sp: 'nfl', voice: 'Judge', player: 'Player ' + n, team: 'NE', k: 'ry', thr: 50, side: 'under', p, cal: p, d: D, id: 'nfl|p' + n + '|ry|50|Judge|' + D + '|u' });
  const A = [1, 2, 3, 4, 5, 6, 7, 8].map(n => P(n, 0.95 - n * 0.01));
  w.eval(`window.__C=${JSON.stringify(A)};cpropToday=()=>window.__C;set(CPROP_KEY,window.__C.map(x=>({...x,hit:null})));`);
  const card = () => JSON.parse(w.eval(`JSON.stringify(((pubCharacters0(roGet(VOICES_KEY,[])||[],'${D}')||[]).find(c=>c.v==='Judge')||{}).picks||[])`));
  let c1 = card().filter(x => x.kind === 'prop'); w.eval('pubPropLockSave()');
  T('the first publish posts the Judge\'s top six props', c1.length === 6 && /Player 1\b/.test(c1[0].pick) && !c1.some(x => /Player [78]\b/.test(x.pick)), JSON.stringify(c1.map(x => x.pick)));
  /* two of them finish and grade; the live list (cpropToday) no longer carries them and offers players 7 and 8 */
  w.eval(`set(CPROP_KEY,(get(CPROP_KEY,[])||[]).map(x=>/p1\\|/.test(x.id)?{...x,hit:true}:/p2\\|/.test(x.id)?{...x,hit:false}:x));window.__C=window.__C.filter(x=>!/Player [12]$/.test(x.player));`);
  let c2 = card().filter(x => x.kind === 'prop'); w.eval('pubPropLockSave()');
  T('the next publish keeps the same six: no swaps', c2.length === 6 && c2.map(x => x.pick).join() === c1.map(x => x.pick).join(), JSON.stringify(c2.map(x => x.pick)));
  T('…and the graded two show their results in place (✓ and ✗)', c2[0].hit === true && c2[1].hit === false && c2.slice(2).every(x => x.hit === null), JSON.stringify(c2.map(x => x.hit)));
  T('…they aren\'t repeated under recent results', !JSON.parse(w.eval(`JSON.stringify(((pubCharacters0(roGet(VOICES_KEY,[])||[],'${D}')||[]).find(c=>c.v==='Judge')||{}).recent||[])`)).some(r => r.kind === 'prop' && /Player [12]\b/.test(r.pick)));
  T('the lock is saved (it survives a reload)', JSON.parse(w.eval(`JSON.stringify(get('d4.pubproplock',{}))`)).by.Judge.length === 6);
  T('a new day starts a new six', JSON.parse(w.eval(`JSON.stringify(pubPropLock('2026-11-16'))`)).by.Judge === undefined);
} catch (e) { T('crashed', false, e.stack); } console.log(out.join('\n')); console.log(`${out.filter(x => x.startsWith('PASS')).length} pass / ${out.filter(x => x.startsWith('FAIL')).length} fail`); process.exit(0); }, 2500);
