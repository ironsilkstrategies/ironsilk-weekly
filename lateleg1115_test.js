/* v3.0.30 · late legs stuck on "(live)": ticket #1015366949 is dated Nov 15 (the book's next-morning date) but FAU@TLSA and PUR@IOWA
   finished Nov 14. The live cache still held last night's 14–28 snapshot and beat the real 21–38 final. Now the final wins, and a
   "live" from a game that started 7+ hours ago is never trusted. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'cfb.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-15T16:00:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/cfb.html', pretendToBeVisual: true, beforeParse(x) { const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  w.eval(`MG_LIVE.ncaaf=MG_LIVE.ncaaf||{};MG_LIVE.ncaaf[mgKey('ncaaf','FAU@TLSA')]=[{date:'2026-11-14',start:'2026-11-14T23:00:00Z',state:'in',a:14,h:28,detail:'Q3'}];
    MG_LIVE.ncaaf[mgKey('ncaaf','PUR@IOWA')]=[{date:'2026-11-14',start:'2026-11-14T20:30:00Z',state:'in',a:7,h:28,detail:'Q3'}];
    const A=get(LS.allfinals,{});A[finalsKey('ncaaf','FAU@TLSA')]={sport:'ncaaf',a:21,h:38,d:'2026-11-14',st:'2026-11-14T23:00:00Z',ts:Date.now()};A[finalsKey('ncaaf','PUR@IOWA')]={sport:'ncaaf',a:7,h:35,d:'2026-11-14',st:'2026-11-14T20:30:00Z',ts:Date.now()};set(LS.allfinals,A);ALLF_C=null;`);
  const g = (game, pick, start) => w.eval(`gradeLeg({id:'x'+Math.random(),sport:'ncaaf',game:${JSON.stringify(game)},pick:${JSON.stringify(pick)},price:-110,book:'external',start:${JSON.stringify(start)}},'2026-11-15')`);
  const u = g('FAU@TLSA', 'Under 81.5', '2026-11-14T23:00:00Z'), s = g('FAU@TLSA', 'TLSA +1.5', '2026-11-14T23:00:00Z'), o = g('PUR@IOWA', 'Over 39.5', '2026-11-14T20:30:00Z'), sp = g('PUR@IOWA', 'IOWA -8.5', '2026-11-14T20:30:00Z');
  T('Under 81.5 grades from the 21–38 final (59): a hit, not "14–28 (live)"', u.hit === true && !u.live && /21–38/.test(u.detail || ''), JSON.stringify(u));
  T('TLSA +1.5 grades from the final: a hit', s.hit === true && !s.live, JSON.stringify(s));
  T('Over 39.5 at PUR 7–35 IOWA (42): a hit, not "total 35 so far"', o.hit === true && !o.live, JSON.stringify(o));
  T('IOWA -8.5 (won by 28): a hit', sp.hit === true && !sp.live, JSON.stringify(sp));
  /* no final yet, but the "live" is from a game that started 17 hours ago: not live */
  w.eval(`MG_LIVE.ncaaf[mgKey('ncaaf','ARMY@NAVY')]=[{date:'2026-11-14',start:'2026-11-14T23:00:00Z',state:'in',a:10,h:7,detail:'Q2'}];`);
  const z = g('ARMY@NAVY', 'Under 40.5', '2026-11-14T23:00:00Z');
  T('a 17-hour-old "live" snapshot with no final is not shown as live', !z.live, JSON.stringify(z));
  /* a game really live right now still is */
  w.eval(`MG_LIVE.ncaaf[mgKey('ncaaf','OSU@MICH')]=[{date:'2026-11-15',start:'2026-11-15T14:30:00Z',state:'in',a:10,h:7,detail:'Q2'}];`);
  const lv = g('OSU@MICH', 'Under 40.5', '2026-11-15T14:30:00Z');
  T('a game live right now still shows live', lv.live === true, JSON.stringify(lv));
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 2500);
