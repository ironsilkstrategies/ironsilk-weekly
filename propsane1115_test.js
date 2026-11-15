/* v3.0.28 · props only on stats a player plays — on Chris's real NFL player logs (Nov 15): no "Mahomes under 39.5 rec yds", no
   "Jadarian Price under 199.5 pass yds"; Smith-Njigba's receiving and Darnold's passing still get read; the junk already logged
   stops counting; no prop leg past -1000 in a character parlay. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nfl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-15T15:00:00Z'); const PST = fs.readFileSync('/home/claude/thedesk-data/k/d4.pst.nfl/all', 'utf8');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nfl.html', pretendToBeVisual: true, beforeParse(x) { const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  w.eval(`set(PST_KEY('nfl'),JSON.parse(${JSON.stringify(PST)}));PST_MEM.nfl=null;teamsToday=sp=>sp==='nfl'?new Set(['KC','ATL','SEA','LV']):new Set();rsInjury=()=>null;`);
  const C = w.eval(`cpropToday().filter(c=>c.sp==='nfl').map(c=>({p:c.player,k:c.k,thr:c.thr,side:c.side,v:c.voice}))`);
  const bad = C.filter(c => (c.p === 'Patrick Mahomes' && ['wy', 'rec', 'wtd', 'lwy'].includes(c.k)) || (['Jadarian Price', 'Zach Charbonnet', 'George Holani', 'Jaxon Smith-Njigba', 'Tory Horton'].includes(c.p) && ['py', 'pry', 'cmp', 'att', 'ptd'].includes(c.k)));
  T('no receiving props on Mahomes, no passing props on Seattle\'s backs and receivers (overs or unders)', bad.length === 0, JSON.stringify(bad.slice(0, 5)));
  const gimme = C.filter(c => c.side === 'under' && w.eval(`(()=>{const P=pstDb('nfl').p[pstId(${JSON.stringify(c.p)})];const S=pstStatOf(P,${JSON.stringify(c.k)});return S.sum/S.gp;})()`) < 0.6 * c.thr);
  T('no gimme unders (his average under 60% of the line)', gimme.length === 0, JSON.stringify(gimme.slice(0, 4)));
  const real = w.eval(`(()=>{const L=LIKELY_LADDER.nfl;const r={};[['Jaxon Smith-Njigba','wy'],['Jaxon Smith-Njigba','rec'],['Sam Darnold','py'],['Patrick Mahomes','py'],['Zach Charbonnet','ry']].forEach(([n,k])=>{r[n+'|'+k]=pstPlays('nfl',pstDb('nfl').p[pstId(n)],k);});return r;})()`);
  T('real roles still count: Smith-Njigba receiving, Darnold and Mahomes passing, Charbonnet rushing', Object.values(real).every(Boolean), JSON.stringify(real));
  const L = w.eval(`propLikely('nfl',60).map(x=>x.player+' '+x.k)`);
  T('the "likely" list follows the same rule', !L.some(s => /Mahomes (wy|rec)|(Price|Charbonnet|Holani|Smith-Njigba|Horton) py/.test(s)), JSON.stringify(L.slice(0, 8)));
  const junk = w.eval(`[{sp:'nfl',player:'Patrick Mahomes',k:'wy',thr:40,side:'under',mv:2},{sp:'nfl',player:'Jadarian Price',k:'py',thr:200,side:'under',mv:2},{sp:'nfl',player:'Jaxon Smith-Njigba',k:'wy',thr:60,side:'over',mv:2}].map(x=>cpropNew(x))`);
  T('the junk already logged is off the records and calibration; a real call stays', junk[0] === false && junk[1] === false && junk[2] === true, JSON.stringify(junk));
  T('no estimated prop leg past -1000 in a character parlay', w.eval(`cpxPropPrice(0.999)<=-1000&&cpxPropPrice(0.80)>-1000`));
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 3000);
