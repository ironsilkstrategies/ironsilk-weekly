/* v3.5.16 · Nov 24, 9:00 AM, Chris (the 🧭 Situations board): "Why are all these in the wrong directions". Every gauge under 50% drew its
   arc with the sweep flag flipped, so it bent inward across its own number (Dome 47%, Division 48%, Non-conf 44%…). A gauge is at most a
   half circle: the value arc is always the short way, clockwise from the left end, exactly like the track beneath it. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 500))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) { x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  /* the arc as drawn: from (10,38) on a radius-30 circle around (40,38). Its flags and end point say which way it runs. */
  const arc = (rate, n = 72) => { const h = w.eval(`revGauge(${rate},0.524,${n},'Dome','x')`);
    const m = [...h.matchAll(/<path d="M10 38A30 30 0 ([01]) ([01]) ([\d.]+) ([\d.]+)" fill="none" stroke="(#[0-9a-fA-F]+)"/g)].find(x => x[5].toLowerCase() !== '#2c2a24');
    return m ? { large: +m[1], sweep: +m[2], x: +m[3], y: +m[4] } : null; };
  const rates = [0.03, 0.2, 0.42, 0.44, 0.47, 0.48, 0.497, 0.5, 0.53, 0.58, 0.64, 0.9, 1];
  const A = rates.map(r => ({ r, a: arc(r) }));
  T('every gauge, under half or over it, runs the short way clockwise from the left end, like its track', A.every(({ a }) => a && a.large === 0 && a.sweep === 1), JSON.stringify(A));
  T('…and ends on the top half of the circle at its value (47% just left of the top, 64% past it)', A.every(({ r, a }) => { const ang = Math.PI * (1 - r); return Math.abs(a.x - (40 + 30 * Math.cos(ang))) < 0.06 && Math.abs(a.y - (38 - 30 * Math.sin(ang))) < 0.06 && a.y <= 38.05; }), JSON.stringify(A.map(({ r, a }) => [r, a && a.x, a && a.y])));
  const h47 = w.eval(`revGauge(0.47,0.524,72,'Dome','34-38')`), h64 = w.eval(`revGauge(0.64,0.524,42,'Conference','27-15')`);
  T('the colors still say where it sits against what was expected (Dome 47% red, Conference 64% green), the number stays in the middle', /stroke="#ff5a5a"/.test(h47) && />47%</.test(h47) && /stroke="#3DDC84"/.test(h64) && />64%</.test(h64), h47.slice(0, 300));
  T('a situation with no graded picks still draws only its track and a dash', !/stroke="#7d7a72"/.test(w.eval(`revGauge(null,0.524,0,'Roof','new')`).replace(/<path d="M10 38A30 30 0 0 1 70 38"[^>]*>/, '')) && />—</.test(w.eval(`revGauge(null,0.524,0,'Roof','new')`)));
  const src = fs.readFileSync(path.join(W, 'desk-revive.js'), 'utf8');
  T('no gauge in the source flips its sweep by value any more', !/A30 30 0 0 \$\{[^}]*\?1:0\}/.test(src));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 2500);
