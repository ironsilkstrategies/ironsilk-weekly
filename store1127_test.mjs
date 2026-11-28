/* v3.5.37 · ALL THE WAY DOWN. Nov 26, evening: a page opened before the big store answered, saw an empty womb, empty calibration rows
   and one day of power ranks, and saved those on the small shelf; the next morning's merge (one level deep) put them over the full ones:
   the womb's three families in progress, 7,751 calibration rows, two weeks of NFL/NHL/college basketball power history. The replay with
   the phone's own copies lives in scratchpad/womb (private data, never committed); this is the real store.js on a fake IndexedDB. */
import 'fake-indexeddb/auto'; import fs from 'fs'; import vm from 'vm';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
const src = fs.readFileSync('/home/claude/work/store.js', 'utf8');
function page(seedLS) {
  const ls = seedLS instanceof Map ? seedLS : new Map(Object.entries(seedLS || {})); const RLS = { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k), key: i => [...ls.keys()][i] ?? null, get length() { return ls.size; }, clear: () => ls.clear() };
  const doc = { readyState: 'complete', getElementById: id => id === 'd4s' ? { content: { querySelectorAll: () => [{ getAttribute: a => (a === 'src' ? 'app.js' : null), textContent: '' }] } } : null,
    createElement: () => ({ style: {}, setAttribute() { }, remove() { } }), body: { appendChild: n => { if (n.src) setTimeout(() => n.onload && n.onload(), 0); } }, documentElement: {}, addEventListener() { }, dispatchEvent() { } };
  const w = { indexedDB, localStorage: RLS, document: doc, navigator: { userAgent: 'iPhone Safari' }, location: { search: '', href: '', reload() { } }, Promise, Proxy, Map, Set, JSON, Date, Math, String, Array, Object, Error, console, setTimeout, clearTimeout,
    addEventListener() { }, dispatchEvent() { }, Event: function () { }, StorageEvent: function () { }, BroadcastChannel: function () { this.postMessage = () => { }; } };
  w.window = w; vm.createContext(w); vm.runInContext(src, w); return { w, ls };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad = 'z'.repeat(1200);
/* the full copies (each big enough to live in IndexedDB) */
const litter = (id, a, b, st, d) => ({ id, a, b, st, conceived: d, embryos: [1, 2, 3].map(i => ({ id: id + 'e' + i, st: st === 'born' && i === 1 ? 'born' : st === 'born' ? 'released' : 'womb', recipe: { pad } })) });
const WOMB = { v: 1, litters: [litter('L1', 'Judge', 'Covers', 'live', '2026-11-22'), litter('L2', 'Sim', 'Power', 'born', '2026-11-09'), litter('L3', 'Most common', 'Scout', 'born', '2026-11-09'), litter('L4', 'Sim', 'Coach', 'live', '2026-11-23'), litter('L5', 'Power', 'Scout', 'live', '2026-11-24')],
  tried: 15, firstDone: 1, lastConceived: '2026-11-24', north: {}, kids: [{ key: 'H_L2e1', id: 'L2e1', st: 'rookie', cal: [{ lo: 0.5, hi: 0.55, w: 646, n: 1228 }], pad }, { key: 'H_L3e1', id: 'L3e1', st: 'rookie', cal: [{ lo: 0.5, hi: 0.55, w: 431, n: 789 }], pad }] };
const rows = {}; for (let i = 0; i < 300; i++) rows[`s|nfl|2026-10-${String(1 + (i % 28)).padStart(2, '0')}|G${i}|ml|home|`] = { d: '2026-10-' + String(1 + (i % 28)).padStart(2, '0'), y: i % 2, q: 0.5 };
const MCAL = { v: 1, ts: 1, rows };
const day = i => '2026-11-' + String(13 + i).padStart(2, '0');
const PWR = { nfl: Object.fromEntries([...Array(14)].map((_, i) => [day(i), Array(150).fill('KC')])), nhl: Object.fromEntries([...Array(10)].map((_, i) => [day(i + 4), Array(150).fill('EDM')])), mlb: { '2026-11-06': Array(30).fill('LAD') } };
const J = x => JSON.stringify(x);
[WOMB, MCAL, PWR].forEach(x => { if (J(x).length < 16000) throw new Error('fixture too small: ' + J(x).length); });

/* 1 · a good load puts the three records in IndexedDB */
let A = page({ 'd4.womb': J(WOMB), 'd4.mcalrows': J(MCAL), 'd4.pwrhist': J(PWR), 'd4.small': '1' }); A.w.D4_BOOT(); await sleep(300); await A.w.D4_FLUSH();
T('the three records live in the big store', A.w.D4_STORE.on() && A.ls.get('d4.womb') == null && A.ls.get('d4.mcalrows') == null && A.ls.get('d4.pwrhist') == null, [...A.ls.keys()]);
/* 2 · a page that opens without it (IndexedDB errors) and saves its own thin copies */
const open0 = indexedDB.open.bind(indexedDB); indexedDB.open = () => { const r = {}; setTimeout(() => r.onerror && r.onerror(), 0); return r; };
let B = page(new Map(A.ls)); B.w.D4_BOOT(); await sleep(200);
T('a page whose IndexedDB errors runs on the small shelf (degraded)', B.w.D4_STORE.degraded() === true);
B.w.localStorage.setItem('d4.womb', J({ v: 1, litters: [], tried: 0, firstDone: 1, lastConceived: '2026-11-26', north: {} }));
B.w.localStorage.setItem('d4.mcalrows', J({ v: 1, ts: 2, rows: {} }));
B.w.localStorage.setItem('d4.pwrhist', J({ nfl: { '2026-11-26': ['BUF'] }, nhl: { '2026-11-26': ['VGK'] } }));
T('…and lists every key it wrote', JSON.parse(B.ls.get('d4.__dgkeys')).includes('d4.womb'));
indexedDB.open = open0;
/* 3 · the next good load merges those copies into the full ones — all the way down */
let C = page(new Map(B.ls)); C.w.D4_BOOT(); await sleep(300);
const Wm = JSON.parse(C.w.localStorage.getItem('d4.womb')), Mm = JSON.parse(C.w.localStorage.getItem('d4.mcalrows')), Pm = JSON.parse(C.w.localStorage.getItem('d4.pwrhist'));
T('the womb keeps every family (an empty list of families never empties the full one) and both heirs', Wm.litters.map(L => L.id).join(',') === 'L1,L2,L3,L4,L5' && Wm.kids.length === 2, J(Wm.litters.map(L => L.id)));
T('…the thin copy still wins the plain values it wrote (its day, its marks)', Wm.lastConceived === '2026-11-26' && Wm.firstDone === 1);
T('the calibration rows keep every row (300), the newer copy\'s stamp', Object.keys(Mm.rows).length === 300 && Mm.ts === 2, Object.keys(Mm.rows).length);
T('the power history keeps every day per sport (the thin copy wins the day it wrote); a sport the thin copy never touched is untouched', Object.keys(Pm.nfl).length === 14 && Pm.nfl['2026-11-26'][0] === 'BUF' && Pm.nfl['2026-11-13'][0] === 'KC' && Object.keys(Pm.nhl).length === 10 && Pm.nhl['2026-11-26'][0] === 'VGK' && Pm.mlb['2026-11-06'][0] === 'LAD',
  [Object.keys(Pm.nfl).length, Object.keys(Pm.nhl).length]);
T('…the full copies are still kept aside (__prev:)', await new Promise(res => { const r = indexedDB.open('thedesk', 1); r.onsuccess = () => { const g = r.result.transaction('kv').objectStore('kv').get('__prev:d4.womb'); g.onsuccess = () => { res(!!g.result && JSON.parse(g.result).litters.length === 5); r.result.close(); }; }; }));
await C.w.D4_FLUSH();
/* 4 · the merge itself */
const M = C.w.D4_STORE.merge;
T('a list of records with ids merges by id at any depth; any other list is the newer copy\'s (no doubled calibration bins)',
  M(J({ a: { L: [{ id: 1, v: 'old' }, { id: 2 }] }, cal: [{ lo: 0.5, n: 1 }] }), J({ a: { L: [{ id: 1, v: 'new' }, { id: 3 }] }, cal: [{ lo: 0.5, n: 2 }] })) === J({ a: { L: [{ id: 1, v: 'new' }, { id: 2 }, { id: 3 }] }, cal: [{ lo: 0.5, n: 2 }] }));
T('…top-level lists keep their old rule (union, newer wins by id)', M(J([{ id: 1, a: 1 }, { id: 2, v: 'old' }]), J([{ id: 2, v: 'new' }, { id: 4 }])) === J([{ id: 1, a: 1 }, { id: 2, v: 'new' }, { id: 4 }]));
/* 5 · the phone, today: the thin copies already folded in by the old merge, the full ones kept aside — merged back once */
const put = (k, v) => new Promise(res => { const r = indexedDB.open('thedesk', 1); r.onsuccess = () => { const t = r.result.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => { r.result.close(); res(); }; }; });
const getI = k => new Promise(res => { const r = indexedDB.open('thedesk', 1); r.onsuccess = () => { const g = r.result.transaction('kv').objectStore('kv').get(k); g.onsuccess = () => { res(g.result); r.result.close(); }; }; });
const thinRows = Object.fromEntries(Object.entries(rows).slice(250).concat([['s|nba|2026-11-27|X|ml|home|', { d: '2026-11-27', y: 1 }]]));
await put('__prev:d4.mcalrows', J(MCAL)); await put('d4.mcalrows', J({ v: 1, ts: 9, rows: { ...thinRows, pad: { d: '2026-11-27', p: 'q'.repeat(16000) } } }));
await put('__prev:d4.pwrhist', J(PWR)); await put('d4.pwrhist', J({ nfl: { '2026-11-26': ['BUF'], '2026-11-27': ['BUF'] }, nhl: { '2026-11-27': ['VGK'] }, mlb: { '2026-11-06': Array(30).fill('LAD') }, pad: 'p'.repeat(16000) }));
let D = page({ 'd4.small': '1' }); D.w.D4_BOOT(); await sleep(300); await D.w.D4_FLUSH();
const Md = JSON.parse(D.w.localStorage.getItem('d4.mcalrows')), Pd = JSON.parse(D.w.localStorage.getItem('d4.pwrhist'));
T('once: the kept-aside calibration rows are merged back under today\'s (every row either copy has; today\'s wins where both do)', Object.keys(Md.rows).length === 302 && Md.ts === 9 && Md.rows['s|nba|2026-11-27|X|ml|home|'].y === 1, Object.keys(Md.rows).length);
T('…and the power history (every day either copy has)', Object.keys(Pd.nfl).length === 15 && Object.keys(Pd.nhl).length === 11, [Object.keys(Pd.nfl).length, Object.keys(Pd.nhl).length]);
T('…written back to the big store, and marked done on this device (never synced)', JSON.parse(await getI('d4.mcalrows')).rows['s|nfl|2026-10-01|G0|ml|home|'] != null && !!JSON.parse(D.ls.get('d4store.remerged'))['d4.mcalrows'] && !/^d4\./.test('d4store.remerged'));
await put('d4.mcalrows', J({ v: 1, ts: 10, rows: { only: { d: '2026-11-28', y: 0 }, pad: { d: '2026-11-28', p: 'q'.repeat(16000) } } }));
let E2 = page(new Map(D.ls)); E2.w.D4_BOOT(); await sleep(300);
T('…it never runs twice', Object.keys(JSON.parse(E2.w.localStorage.getItem('d4.mcalrows')).rows).length === 2);
T('the store\'s note says what it did', /thinned records filled back in/.test(src) && /window\.__D4_REMERGED=again\.slice\(\)/.test(src));
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
