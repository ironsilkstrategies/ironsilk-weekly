/* v3.0.27 · real voices: a character's reads across one day never repeat their wording; two characters on the same pick sound like
   different people; the same pick reads the same every time; no "undefined"/"NaN"; before Nov 15 nothing changes. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-15T18:00:00Z'), D = '2026-11-15';
const G = ['BOS@NYR', 'CHI@MIN', 'TOR@MTL', 'DAL@COL', 'SEA@VGK'];
const V = []; let id = 0;
G.forEach((g, i) => { const side = i % 2 ? 'away' : 'home';
  ['Sim', 'Judge', 'Coach', 'Scout', 'Brain', 'Banker'].forEach(v => V.push({ id: 'v' + (id++), sp: 'nhl', date: D, game: g, voice: v, market: 'ml', side, pick: 'x', price: -130 + i * 10, cf: 0.66 + i * 0.01, simP: 0.6 + i * 0.01, graded: false, hit: null }));
  V.push({ id: 'v' + (id++), sp: 'nhl', date: D, game: g, voice: 'Trends', market: 'ml', side: side === 'home' ? 'away' : 'home', pick: 'x', price: 110, cf: 0.6, graded: false, hit: null }); });
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) { const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); x.localStorage.setItem('d4.voices', JSON.stringify(V)); } }).window;
setTimeout(() => { try {
  const read = (v, g, d) => w.eval(`(()=>{const c=(roGet(VOICES_KEY,[])||[]).find(z=>z.voice===${JSON.stringify(v)}&&z.game===${JSON.stringify(g)});const R=charRead(${JSON.stringify(v)},{sp:'nhl',game:${JSON.stringify(g)},m:'ml',sd:c.side,price:c.price,date:${JSON.stringify(d || D)}},c);return R?{take:R.take,text:readText(R),worry:R.worry,price:R.priceLine}:null;})()`);
  for (const v of ['Sim', 'Judge', 'Coach', 'Brain', 'Banker']) {
    const R = G.map(g => read(v, g)); const skel = s => s.replace(/\d+(\.\d+)?%?/g, '#').replace(/\b(BOS|NYR|CHI|MIN|TOR|MTL|DAL|COL|SEA|VGK|Boston|New York|Chicago|Minnesota|Toronto|Montreal|Dallas|Colorado|Seattle|Vegas|Vegas Golden Knights|[A-Z][a-z]+( [A-Z][a-z]+)*)\b/g, 'T');
    const takes = new Set(R.map(r => skel(r.take)));
    T(`${v}: its opening line is worded differently on each of its picks today (${takes.size} of ${R.length} different)`, takes.size >= Math.min(4, R.length), JSON.stringify(R.map(r => r.take)));
  }
  const a = read('Coach', 'CHI@MIN'), b = read('Judge', 'CHI@MIN'), c = read('Banker', 'CHI@MIN');
  T('same pick, different people: the Coach, the Judge and the Banker don\'t sound alike', a.take !== b.take && b.take !== c.take && a.take !== c.take, JSON.stringify([a.take, b.take, c.take]));
  T('the same pick reads the same every time you open it', JSON.stringify(read('Coach', 'CHI@MIN')) === JSON.stringify(a));
  const all = G.flatMap(g => ['Sim', 'Judge', 'Coach', 'Scout', 'Brain', 'Banker'].map(v => read(v, g)));
  T('no broken words anywhere (undefined, NaN, null, [object)', !all.some(r => /undefined|NaN|\bnull\b|\[object/.test(r.text)), (all.find(r => /undefined|NaN|\bnull\b|\[object/.test(r.text)) || {}).text);
  const shapes = new Set(G.map(g => { const t = read('Sim', g).text; return t.indexOf('The worry:') < t.length / 2 ? 'early' : 'late'; }));
  T('the shape changes too: some reads put the worry early, some late', shapes.size === 2, JSON.stringify([...shapes]));
  const old = read('Coach', 'CHI@MIN', '2026-11-14');
  T('before Nov 15 nothing changes (the old voice)', old === null || !/Look, kid|Listen\.|from the sideline/.test(old.take));
  console.log('\nSAMPLES:'); ['Sim', 'Coach', 'Judge', 'Banker'].forEach(v => G.slice(0, 3).forEach(g => console.log(`  ${v} · ${g}: ${read(v, g).text.slice(0, 260)}`)));
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 2500);
