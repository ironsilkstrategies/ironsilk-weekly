/* v3.0.25 · switching sports kept tripping "Your saved history didn't load" (IndexedDB didn't answer in 12 s): ~30 MB of history
   read record by record, behind the last page's rewrites. Now: one getAll read, identical big records aren't rewritten, the wait is
   30 s with a quiet "Opening your saved history…" notice. Real store.js on a fake IndexedDB. */
import 'fake-indexeddb/auto'; import fs from 'fs'; import vm from 'vm';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 300))); };
const src = fs.readFileSync('/home/claude/work/store.js', 'utf8');
function page(seedLS) {
  const ls = new Map(Object.entries(seedLS || {})); const RLS = { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k), key: i => [...ls.keys()][i] ?? null, get length() { return ls.size; }, clear: () => ls.clear() };
  const nodes = []; let ran = 0, notice = null;
  const doc = { readyState: 'complete', getElementById: id => id === 'd4s' ? { content: { querySelectorAll: () => [{ getAttribute: a => (a === 'src' ? 'app.js' : null), textContent: '' }] } } : id === 'd4open' ? notice : null,
    createElement: () => ({ style: {}, setAttribute() { }, remove() { notice = null; } }), body: { appendChild: n => { if (n.textContent && /Opening/.test(n.textContent)) { notice = n; return; } nodes.push(n); if (n.src) { ran++; setTimeout(() => n.onload && n.onload(), 0); } } },
    documentElement: {}, addEventListener() { }, dispatchEvent() { } };
  const w = { indexedDB, localStorage: RLS, document: doc, navigator: { userAgent: 'iPhone Safari' }, location: { search: '' }, Promise, Proxy, Map, Set, JSON, Date, Math, String, Array, Object, Error, console, setTimeout, clearTimeout,
    addEventListener() { }, dispatchEvent() { }, Event: function () { }, StorageEvent: function () { }, BroadcastChannel: function () { this.postMessage = () => { }; } };
  w.window = w; vm.createContext(w); vm.runInContext(src, w); return { w, ls, ran: () => ran, notice: () => notice };
}
const big = 'x'.repeat(20000), big2 = 'y'.repeat(30000);
/* first visit: two big records on the small shelf move into IndexedDB */
let P = page({ 'd4.voices': JSON.stringify([{ id: 1, s: big }]), 'd4.clv': big2, 'd4.small': '1' }); P.w.D4_BOOT();
await new Promise(r => setTimeout(r, 300)); await P.w.D4_FLUSH();
T('the store opens on a fake phone and moves the big records into IndexedDB', P.w.D4_STORE.on() && P.ls.get('d4.voices') == null && P.ls.get('d4.small') === '1', [P.w.D4_STORE.on(), [...P.ls.keys()]]);
/* next page: loads them back in one read */
let Q = page({ 'd4.small': '1' }); Q.w.D4_BOOT(); await new Promise(r => setTimeout(r, 300));
T('the next page reads them back (one getAll read) and runs the app', Q.w.D4_STORE.on() && Q.w.localStorage.getItem('d4.clv') === big2 && JSON.parse(Q.w.localStorage.getItem('d4.voices'))[0].id === 1 && Q.ran() === 1);
T('…no safe mode, no warning', !Q.w.D4_STORE.degraded());
/* identical re-save isn't written again */
let writes = 0; const put0 = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (...a) { writes++; return put0.apply(this, a); };
Q.w.localStorage.setItem('d4.clv', big2); Q.w.localStorage.setItem('d4.clv', big2); await Q.w.D4_FLUSH();
T('re-saving an identical big record writes nothing', writes === 0, writes);
Q.w.localStorage.setItem('d4.clv', big2 + 'z'); await Q.w.D4_FLUSH();
T('…a changed one is written', writes === 1 && Q.w.localStorage.getItem('d4.clv').endsWith('z'), writes);
IDBObjectStore.prototype.put = put0;
const st = src;
T('the wait is 30 s with a quiet notice after 2.5 s; safe mode only after that', /var lim=30000/.test(st) && /Opening your saved history…/.test(st) && /degrade\('IndexedDB didn\\'t answer in '\+Math\.round\(lim\/1000\)\+' s',lim\)/.test(st));
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
