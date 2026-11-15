/* v3.0.18 · the Outsider stops waiting on a paste: with no Covers score uploaded it bets OddsShark's computer score, read off
   the feeds robot (oracle.json). An uploaded Covers score still wins. Posted days (before Nov 15) stand. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-15T18:00:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) { const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  w.eval(`oracleStore({ts:'2026-11-15T17:00:00Z',src:{os:{lab:'OddsShark computer',kind:'model'}},rec:{},g:{
    'nhl|BUF@DAL|2026-11-15':{sp:'nhl',a:'BUF',h:'DAL',s:{os:{pa:2.4,ph:3.6,mg:1.2,tot:6.0}}},
    'nhl|BUF@DAL|2026-11-14':{sp:'nhl',a:'BUF',h:'DAL',s:{os:{pa:2.4,ph:3.6,mg:1.2,tot:6.0}}}}});
    window.__g=d=>({id:'g1'+d,away:{abbr:'BUF'},home:{abbr:'DAL'},__date:d});
    voicesLines=()=>({mlA:{price:140},mlH:{price:-165},spH:{line:-1.5,price:150},spA:{line:1.5,price:-180},ov:{line:6.5,price:-110},un:{line:6.5,price:-110}});`);
  const calls = d => w.eval(`characterCalls('nhl',__g('${d}'),{aw:0.45,hw:0.55,homeProj:3.2,awayProj:2.7,med:6}).filter(c=>c.voice==='Covers').map(c=>[c.market,c.pick,c.src,c.score])`);
  const C = calls('2026-11-15');
  T('no Covers paste: the Outsider bets OddsShark\'s computer (DAL 3.6–2.4 BUF) → DAL ML, BUF +1.5 (wins by 1.2), Under 6.5', C.length === 3 && C.some(c => c[1] === 'DAL ML') && C.some(c => c[1] === 'BUF +1.5') && C.some(c => c[1] === 'Under 6.5') && C.every(c => c[2] === 'OddsShark computer' && c[3] === '2.4-3.6'), JSON.stringify(C));
  T('posted days stand: nothing new on Nov 14', calls('2026-11-14').length === 0, JSON.stringify(calls('2026-11-14')));
  w.eval(`CHAR_GEN=(typeof CHAR_GEN==='number'?CHAR_GEN+1:CHAR_GEN);const I=roGet(INTEL_KEY,[])||[];I.push({sp:'nhl',kind:'pred',game:'BUF@DAL',date:'2026-11-15',a:4,h:2,src:'Covers'});set(INTEL_KEY,I);for(const k in CHAR_CACHE)delete CHAR_CACHE[k];`);
  const U = calls('2026-11-15');
  T('an uploaded Covers score still wins (BUF 4–2 → BUF ML, Under 6.5 from 6)', U.some(c => c[1] === 'BUF ML') && !U.some(c => c[1] === 'DAL ML') && U.every(c => c[2] === 'Covers'), JSON.stringify(U));
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 2500);
