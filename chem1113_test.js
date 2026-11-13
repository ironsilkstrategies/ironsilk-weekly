/* v3.0.2 · chemistry: each character's own confidence moves with whose company it keeps well — for that character only.
   And the number shown is the character's own confidence (the one that made the call official), not another one. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-14T18:00:00Z');
/* 60 days before Nov 14: the Scout says 70% on every NHL total; when the Historian is with it, it hits 90%; when the Commissioner is
   against it, 50%; otherwise 70%. The Brain agrees every time (and must never count). */
const V = []; let id = 0; const day = i => new Date(Date.parse('2026-09-15T12:00:00Z') + i * 864e5).toISOString().slice(0, 10);
const rng = (s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; })(11);
for (let i = 0; i < 60; i++) for (let g = 0; g < 4; g++) {
  const d = day(i), game = `A${i}x${g}@H${i}x${g}`, kind = g % 4, p = kind === 0 ? 0.9 : kind === 1 ? 0.5 : 0.7, hit = rng() < p;
  const call = (voice, side, extra = {}) => V.push({ id: 'c' + (id++), sp: 'nhl', date: d, game, voice, market: 'total', side, line: 6.5, price: -110, pick: side === 'over' ? 'Over 6.5' : 'Under 6.5', cf: 0.7, graded: true, hit: voice === 'Scout' ? hit : rng() < 0.5, units: 0, ...extra });
  call('Scout', 'over'); call('Brain', 'over');
  if (kind === 0) call('Trends', 'over'); if (kind === 1) call('Power', 'under');
}
/* today's calls (ungraded) */
const today = (game, partners) => { V.push({ id: 't' + game, sp: 'nhl', date: '2026-11-14', game, voice: 'Scout', market: 'total', side: 'over', line: 6.5, price: -110, pick: 'Over 6.5', cf: 0.7, graded: false, hit: null });
  partners.forEach(([v, side]) => V.push({ id: 't' + game + v, sp: 'nhl', date: '2026-11-14', game, voice: v, market: 'total', side, line: 6.5, price: -110, pick: 'x', cf: 0.7, graded: false, hit: null })); };
today('X1@Y1', [['Trends', 'over']]); today('X2@Y2', []); today('X3@Y3', [['Power', 'under']]); today('X4@Y4', [['Brain', 'over']]);
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1');
  x.localStorage.setItem('d4.voices', JSON.stringify(V)); } }).window;
setTimeout(() => { try {
  const c = g => w.eval(`(()=>{const x=(roGet(VOICES_KEY,[])||[]).find(y=>y.id==='t${g}');return{conf:coachConf(x),chem:chemOf(x)};})()`);
  const a = c('X1@Y1'), b = c('X2@Y2'), d = c('X3@Y3'), e = c('X4@Y4');
  T('with the Historian on its side, the Scout leans higher — its own lesson, from its own record', a.conf > b.conf && a.chem.d > 0 && a.chem.why.some(x => x.u === 'Trends' && x.rel === 'with'), JSON.stringify([a.conf, b.conf, a.chem]));
  T('…with the Commissioner against it, the Scout leans lower', d.conf < b.conf && d.chem.d < 0, JSON.stringify([d.conf, b.conf, d.chem]));
  T('…never more than 4 points per partner', Math.abs(a.chem.d) <= 0.04 + 1e-9 && Math.abs(d.chem.d) <= 0.04 + 1e-9);
  T('the Brain, the Banker and the Blend are never a partner (they are made from the others)', e.chem.d === 0 && Math.abs(e.conf - b.conf) < 1e-9, JSON.stringify(e));
  const old = w.eval(`(()=>{const x={...(roGet(VOICES_KEY,[])||[]).find(y=>y.id==='tX1@Y1'),date:'2026-11-12'};return chemOf(x).d;})()`);
  T('nothing before Nov 13 moves (posted days stand as they were)', old === 0);
  const shown = w.eval(`(()=>{const x=(roGet(VOICES_KEY,[])||[]).find(y=>y.id==='tX1@Y1');const R=charCallsToday?null:null;return{conf:coachOk(x),pub:pubConf(x)};})()`);
  T('the public number is the character\'s own confidence (the one that decides official)', Math.abs(shown.pub - +shown.conf.toFixed(3)) < 1e-9, JSON.stringify(shown));
} catch (er) { T('no crash', false, String(er && er.stack || er).slice(0, 400)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 3000);
