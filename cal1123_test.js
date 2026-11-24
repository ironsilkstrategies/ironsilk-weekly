/* v3.5.10 · Nov 23, Chris: "I love that calendar… can we have Noah curate us some fly shit like that somewhere in the public
   app". The public feed now carries every Best card day since the first (feed.cal: [day, won, lost, pushed, units, picks]) for
   the public app's month calendar. It must add up to the record exactly, leave today out (today rides in "today", gated), and
   the first load of the new build must publish it once. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work'; const { webcrypto } = require('crypto');
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const load = (page) => { const h = fs.readFileSync(path.join(W, page), 'utf8'); return h.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`); };
const NOW = Date.parse('2026-11-24T01:30:00Z');   /* Nov 23, 7:30 PM CT */
const w = new JSDOM(load('nba.html'), { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true;
  Object.defineProperty(x, 'crypto', { value: webcrypto }); x.TextEncoder = TextEncoder; x.TextDecoder = TextDecoder;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
  x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
const pk = (game, pick, price, hit, push, main = true) => ({ sp: 'nba', game, pick, price, p: 0.7, main, hit, push: !!push, start: '2026-11-01T00:00:00Z' });
setTimeout(async () => { try {
  const td = w.eval('today()');
  T('the clock reads Nov 23 (Central)', td === '2026-11-23', td);
  const LOG = {
    '2026-10-05': { picks: [pk('A@B', 'A ML', -150, null, false, false)] },                                   /* no main picks: not a card day */
    '2026-10-06': { picks: [pk('A@B', 'A ML', -150, true), pk('C@D', 'D +3.5', -110, false), pk('E@F', 'Over 220.5', 120, true), pk('G@H', 'G ML', -105, true, false, false)] },
    '2026-10-31': { picks: [pk('A@B', 'B -2.5', -110, false), pk('C@D', 'C ML', 140, false), pk('E@F', 'Under 210.5', -110, null, true)] },
    '2026-11-09': { picks: [pk('A@B', 'A ML', -200, true)] },
    '2026-11-12': { picks: [pk('A@B', 'A ML', -110, null), pk('C@D', 'D ML', -110, true)] },                /* one never graded (postponed) */
    '2026-11-23': { picks: [pk('W@X', 'X +6.5', -112, true), pk('Y@Z', 'Z +8.5', -105, null)] } };        /* today: one in, one to play */
  w.eval(`set('d4.best5log',${JSON.stringify(LOG)});set(BEST5_KEY,{d:'2026-11-23',locked:true,lockedAt:Date.now()-5*3600e3,top3:${JSON.stringify(LOG['2026-11-23'].picks.map(x => ({ ...x, start: '2026-11-24T03:00:00Z' })))},bySport:{},picks:[]});`);
  const F = JSON.parse(w.eval('JSON.stringify(publicFeedCore(false))')), R = JSON.parse(w.eval('JSON.stringify(best3Record())'));
  const C = F.cal || {}, D = C.d || [];
  T('the feed carries the calendar: every card day since the first, oldest first', C.first === '2026-10-06' && JSON.stringify(D.map(r => r[0])) === '["2026-10-06","2026-10-31","2026-11-09","2026-11-12"]', JSON.stringify(C));
  T('…a day with no main pick is no card day (Oct 5 stays off)', !D.some(r => r[0] === '2026-10-05'));
  T('…today stays out (it rides in "today", sealed until its unlock in the paid build)', !D.some(r => r[0] === td) && F.today && F.today.d === td);
  const row = d => D.find(r => r[0] === d) || [];
  T('…each day: won, lost, pushed, units at the posted price, picks on the card (a side pick never counts)', JSON.stringify(row('2026-10-06')) === JSON.stringify(['2026-10-06', 2, 1, 0, +(100 / 150 - 1 + 1.2).toFixed(2), 3]), JSON.stringify(row('2026-10-06')));
  T('…a push is a push (no units), a loss is one unit', JSON.stringify(row('2026-10-31')) === '["2026-10-31",0,2,1,-2,3]', JSON.stringify(row('2026-10-31')));
  T('…a pick that never graded counts as a pick on the card and nothing else', JSON.stringify(row('2026-11-12')) === JSON.stringify(['2026-11-12', 1, 0, 0, +(100 / 110).toFixed(2), 2]), JSON.stringify(row('2026-11-12')));
  /* the calendar and the record agree: the days plus today's graded picks are the record, to the cent */
  const todayU = 100 / 112; const sum = D.reduce((a, r) => ({ w: a.w + r[1], l: a.l + r[2], p: a.p + r[3], u: a.u + r[4] }), { w: 0, l: 0, p: 0, u: 0 });
  T('the calendar adds up to the record: every day since the first plus today\'s graded pick', sum.w + 1 === R.w && sum.l === R.l && sum.p === R.pu && Math.abs(sum.u + todayU - R.u) < 0.011 && R.first === C.first, JSON.stringify([sum, R]));
  T('…and the feed\'s record is that same record', F.record.w === R.w && F.record.l === R.l && Math.abs(F.record.u - R.u) < 1e-9);
  /* no card yet today: nothing is left out */
  w.eval(`localStorage.removeItem(BEST5_KEY)`);
  const F2 = JSON.parse(w.eval('JSON.stringify(publicFeedCore(false))'));
  T('with no card state the desk\'s day is still today: today stays out, every earlier day is in (the same rule as the history)', JSON.stringify((F2.cal.d || []).map(r => r[0])) === '["2026-10-06","2026-10-31","2026-11-09","2026-11-12"]' && F2.today === null, JSON.stringify((F2.cal.d || []).map(r => r[0])));
  w.eval(`set(BEST5_KEY,{d:'2026-11-23',locked:true,lockedAt:Date.now()-5*3600e3,top3:[],bySport:{},picks:[]});`);
  /* a fresh desk: no cards at all */
  w.eval(`set('d4.best5log',{})`);
  T('a desk with no cards sends no calendar (the app hides it)', JSON.parse(w.eval('JSON.stringify(publicFeedCore(false))')).cal === null);
  w.eval(`set('d4.best5log',${JSON.stringify(LOG)})`);
  /* the first load of v3.5.10 publishes the calendar once: the page's fingerprint now counts its days */
  const s1 = w.eval('pubSig(publicFeedCore(false))'), s0 = w.eval('(()=>{const F=publicFeedCore(false);delete F.cal;return pubSig(F);})()');
  T('the publish fingerprint changes when the calendar arrives (so the first load of the new build sends it)', s1 !== s0, s1.slice(-40) + ' vs ' + s0.slice(-40));
  T('…and holds still when nothing changed (no publish loop)', w.eval('pubSig(publicFeedCore(false))') === s1);
  /* the worker's copy: the page it publishes keeps the calendar untouched */
  process.env.AUTOPILOT_KEY = 'k'; process.env.TG_BOT_TOKEN = 't'; for (const k of ['FB_PAGE_ID', 'FB_PAGE_TOKEN', 'IG_USER_ID', 'IG_TOKEN', 'THREADS_TOKEN', 'X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET']) delete process.env[k];
  const Wk = await import('/home/claude/work/autopilot/worker.mjs');
  const V = Wk.publicView(F, { 'nba|Y@Z|Z +8.5': 'W' }, NOW);
  T('the 24/7 worker\'s page keeps the calendar as the app sent it (today graded on top)', JSON.stringify(V.cal) === JSON.stringify(F.cal) && V.today.picks.every(x => x.hit === true), JSON.stringify(V.cal).slice(0, 120));
  T('the calendar is small (a year of cards is a few KB)', JSON.stringify(Array.from({ length: 365 }, (_, i) => ['2026-01-01', 2, 1, 0, -0.48, 3])).length < 12000);
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 600)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); }, 2500);
