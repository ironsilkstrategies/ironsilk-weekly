/* v3.5.38 · THE PROVEN LANES. Nov 27, Chris: "is there a way with all this data we've collected to find a new ideology for the free 3
   picks that may give us better results going into next month?" From Dec 1 the Best 3 keeps every gate it has but ranks by who has been
   paying in exactly this bet: each character on the pick, its last 21 days in that sport × market × role, units per call shrunk toward
   zero (20 calls of nothing, 15 calls at least), the best two added. The walk-forward replay on the real ledger lives in
   scratchpad/bt (private data, never committed); this pins the rule. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + String(d).slice(0, 300) : ''}`);
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-12-01T19:30:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(w) {
  w.__NOW = NOW; const RD = w.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [w.__NOW])); } static now() { return w.__NOW; } } w.Date = FD;
  w.__NO_GRADELOOP__ = true; w.__NO_BACKFILL__ = true; w.__NO_REOPEN__ = true; w.__NO_SYNC_LOOP__ = true; w.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
  w.scrollTo = () => { }; w.alert = () => { }; w.confirm = () => true; w.localStorage.setItem('d4.setupDone', '1'); } }).window;
const day = (d0, i) => new Date(Date.parse(d0 + 'T12:00:00Z') + i * 864e5).toISOString().slice(0, 10);
setTimeout(() => { try {
  /* the card's own safety rules are stubbed: this is about the ranking */
  w.eval(`tcIsToday=x=>true;best5Started=x=>false;laneStatus=()=>'ok';pickLane=()=>'k';pickDisagrees=x=>false;ruleFloorAdmit=()=>null;
    pickConf=(x)=>({cf:x.oc,n:1,who:['Sim'],best:'Sim'});pickFit=(x)=>x.fitv;`);
  /* 21 days: the Scout pays on NBA spread dogs (16-6), the Simulator bleeds on NBA moneyline favorites (10-12 at -200);
     the Judge pays on NHL unders (14-6) */
  const V = []; let id = 0;
  for (let i = 1; i <= 22; i++) { const d = day('2026-12-01', -i);
    V.push({ id: 'v' + (id++), sp: 'nba', date: d, game: `D${i}@E${i}`, voice: 'Scout', market: 'spread', side: 'away', line: 5.5, price: -110, graded: true, hit: i % 11 < 8 ? true : false });
    V.push({ id: 'v' + (id++), sp: 'nba', date: d, game: `F${i}@G${i}`, voice: 'Sim', market: 'ml', side: 'home', line: null, price: -200, graded: true, hit: i % 2 === 0 && i < 21 });
    if (i <= 20) V.push({ id: 'v' + (id++), sp: 'nhl', date: d, game: `H${i}@I${i}`, voice: 'Judge', market: 'total', side: 'under', line: 6.5, price: -110, graded: true, hit: i % 10 < 7 }); }
  /* today: the Simulator on a moneyline favorite (the better confidence and fit), the Scout on a spread dog, the Judge on an NHL under */
  const td = '2026-12-01';
  V.push({ id: 't1', sp: 'nba', date: td, game: 'A@B', voice: 'Sim', market: 'ml', side: 'home', price: -150, graded: false, hit: null });
  V.push({ id: 't2', sp: 'nba', date: td, game: 'C@D', voice: 'Scout', market: 'spread', side: 'away', line: 4.5, price: -110, graded: false, hit: null });
  V.push({ id: 't3', sp: 'nhl', date: td, game: 'J@K', voice: 'Judge', market: 'total', side: 'under', line: 6.5, price: -110, graded: false, hit: null });
  w.__VJ = JSON.stringify(V); w.eval('set(VOICES_KEY,JSON.parse(window.__VJ));B3LT_C=null;');
  const by = { nba: { picks: [{ sp: 'nba', game: 'A@B', pick: 'B ML', price: -150, m: 'ml', sd: 'home', oc: 0.80, fitv: 0.9 }, { sp: 'nba', game: 'C@D', pick: 'C +4.5', price: -110, m: 'spread', sd: 'away', line: 4.5, oc: 0.72, fitv: 0.6 }] },
    nhl: { picks: [{ sp: 'nhl', game: 'J@K', pick: 'Under 6.5', price: -110, m: 'total', sd: 'under', line: 6.5, oc: 0.66, fitv: 0.5 }] } };
  w.__BY = JSON.stringify(by);
  const run = () => JSON.parse(w.eval(`JSON.stringify((()=>{const r=best3Pool(JSON.parse(window.__BY));return{p:r.map(x=>x.pick),rank:r.rank||null,lane:r.map(x=>x.lane),by:r.map(x=>x.laneBy)};})())`));
  let r = run();
  T('Dec 1: the proven-lanes ranking is on', w.eval('b3LaneOn()') === true && r.rank === 'lane');
  T('…the Scout\'s spread dog (a lane paying 16-6) is the NBA pick, ahead of the Simulator\'s better-confidence favorite (a lane at 10-12 for -200)', r.p[0] === 'C +4.5' && !r.p.includes('B ML') || (r.p.indexOf('C +4.5') < r.p.indexOf('B ML')), r.p.join(', '));
  T('…one sport each first still holds (the NHL under makes the card)', r.p.includes('Under 6.5'));
  T('…each pick carries the lanes it was ranked on (who, how many calls, units)', r.by[0] && r.by[0][0] && r.by[0][0].v === 'Scout' && r.by[0][0].n >= 15, JSON.stringify(r.by));
  const s = JSON.parse(w.eval(`JSON.stringify([b3LaneScore(JSON.parse(window.__BY).nba.picks[1],'nba'),b3LaneScore(JSON.parse(window.__BY).nba.picks[0],'nba')])`));
  T('the lane score: units per call with 20 calls of nothing in front (a paying lane scores above zero, a bleeding one below)', s[0].s > 0.1 && s[1].s < 0, JSON.stringify(s));
  T('…a lane needs 15 calls before it counts', w.eval('B3_LANE_N') === 15 && w.eval('B3_LANE_K') === 20 && w.eval('B3_LANE_DAYS') === 21);
  /* the switch */
  w.eval(`set(B3_LANE_KEY,false)`); r = run();
  T('switched off: the old ranking (confidence × record) is back', w.eval('b3LaneOn()') === false && r.rank === null && r.p[0] === 'B ML', r.p.join(', '));
  w.eval(`set(B3_LANE_KEY,true)`);
  /* before Dec 1: unchanged */
  w.__NOW = Date.parse('2026-11-30T19:30:00Z'); w.eval('TODAY_T=0;B3LT_C=null;');
  r = run();
  T('before Dec 1 (November\'s record) the card ranks as it always did', w.eval('b3LaneOn()') === false && r.p[0] === 'B ML', r.p.join(', '));
} catch (e) { T('harness', false, e.stack); }
  console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('PASS')).length} pass / ${out.filter(x => x.startsWith('FAIL')).length} fail`); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0); }, 2500);
