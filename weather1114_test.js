/* v3.0.19 · the weather moves the picks: a lane that's not working for the whole room (7 AND 30 days under water) takes points off
   every character's confidence there; a working lane adds; the league's own shift (desk-world) nudges with/against. Posted days stand. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-15T18:00:00Z'); const V = []; let id = 0;
const day = i => new Date(NOW - i * 864e5).toISOString().slice(0, 10);
/* NFL spread dogs: 6-20 in the last week, 10-30 over the month. NFL spread favorites: 18-6 this week, 30-14 the month. */
const seed = (role, i, hit) => V.push({ id: 's' + (id++), sp: 'nfl', date: day(i), game: `A${id}@H${id}`, voice: ['Coach', 'Scout', 'Judge'][id % 3], market: 'spread', side: 'home', line: role === 'dog' ? 6.5 : -6.5, price: -110, pick: 'x', cf: 0.7, graded: true, hit, units: hit ? 0.909 : -1 });
for (let k = 0; k < 26; k++) seed('dog', 1 + (k % 6), k < 6); for (let k = 0; k < 14; k++) seed('dog', 10 + (k % 15), k < 4);
for (let k = 0; k < 24; k++) seed('fav', 1 + (k % 6), k < 18); for (let k = 0; k < 20; k++) seed('fav', 10 + (k % 15), k < 12);
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) { const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); x.localStorage.setItem('d4.voices', JSON.stringify(V)); } }).window;
setTimeout(() => { try {
  w.eval(`worldLine=()=>null;`);
  const q = (role, date) => w.eval(`(()=>{const x={id:'q',sp:'nfl',date:'${date}',game:'Q@R',voice:'Coach',market:'spread',side:'home',line:${role === 'dog' ? 6.5 : -6.5},price:-110,cf:0.72};return{wx:wxOf(x),c:coachConf(x)};})()`);
  const dog = q('dog', '2026-11-15'), fav = q('fav', '2026-11-15'), old = q('dog', '2026-11-14');
  T('NFL spread dogs, 6-20 this week and under water for the month: broken → −6 points on every character there', dog.wx.d === -0.06 && /broken/.test(dog.wx.why[0].t), JSON.stringify(dog.wx));
  T('NFL spread favorites, 18-6 and up for the month: working → +4', fav.wx.d === 0.04 && /working/.test(fav.wx.why[0].t), JSON.stringify(fav.wx));
  const off = w.eval(`(()=>{const W0=wxOf;wxOf=()=>({d:0,why:[]});const x={sp:'nfl',date:'2026-11-15',game:'Q@R',voice:'Coach',market:'spread',side:'home',line:6.5,price:-110,cf:0.72};const c=coachConf(x);wxOf=W0;return c;})()`);
  T('…and it moves the character\'s own confidence by exactly that', Math.abs((off - dog.c) - 0.06) < 1e-6, JSON.stringify([off, dog.c]));
  T('posted days stand: nothing before Nov 15 moves', old.wx.d === 0);
  T('the day\'s lane weather is stamped (a posted day reads its stamp, not today\'s)', w.eval(`(()=>{const L=get('d4.wxlog',{});return L['2026-11-15']&&L['2026-11-15']['nfl|spread|dog'].d===-0.06;})()`));
  w.eval(`worldLine=x=>x.side==='home'?{w:3.2,help:true,txt:'Home teams have won 77%'}:{w:3.2,help:false,txt:'Home teams have won 77%'};WX_M=null;`);
  const lg = q('fav', '2026-11-15');
  T('the league has changed (3σ) toward home teams: a home pick gets +3 on top of the lane', Math.abs(lg.wx.d - 0.06) < 1e-9 && lg.wx.why.some(x => x.k === 'league' && x.d === 0.03), JSON.stringify(lg.wx));
  T('never more than +6 / −8 in all', w.eval(`(()=>{const x={sp:'nfl',date:'2026-11-15',game:'Q@R',voice:'Coach',market:'spread',side:'away',line:6.5,price:-110,cf:0.72};return wxOf(x).d;})()`) >= -0.08);
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 2500);
