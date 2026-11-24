/* v3.5.9 · Nov 23, the phone side of "Load failed" on the VIP worker box: (1) the phone's merge keeps the worker's page
   fingerprints short (three newest days, hashes only), so a hand-off never carries the old 4 MB back; (2) a dropped read or
   write (iPhone Safari's "Load failed") is tried once more, and if it drops again the box says what it means. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const NOW = Date.parse('2026-11-24T00:55:00Z');
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_SYNC_LOOP__ = true;
  x.__mock = null; x.fetch = (u, o) => x.__mock ? x.__mock(String(u), o || {}) : Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
  try { Object.defineProperty(x, 'crypto', { value: require('crypto').webcrypto, configurable: true }); } catch (e) { }
  x.TextEncoder = TextEncoder; x.TextDecoder = TextDecoder;
  x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
w.setTimeout = ((st) => (f, ms) => st(f, Math.min(ms || 0, 20)))(w.setTimeout);   /* the retry's nap, shortened */
const day = i => new Date(Date.UTC(2026, 9, 17 + i)).toISOString().slice(0, 10);
setTimeout(async () => { try {
  /* 1 · the phone's merge */
  const old = {}; for (let i = 0; i < 29; i++) old[day(i)] = 'x'.repeat(i > 20 ? 300000 : 9000);
  w.__old = old; const m = JSON.parse(w.eval(`JSON.stringify(tgwMerge({v:1,posts:{}},{v:1,posts:{},pubSig:window.__old}).pubSig)`));
  T('the phone\'s merge never carries the old whole-page fingerprints back (29 days of copies → none)', Object.keys(m).length === 0, JSON.stringify(Object.keys(m)));
  const m2 = JSON.parse(w.eval(`JSON.stringify(tgwMerge({v:1,posts:{}},{v:1,posts:{},pubSig:{'2026-11-20':'${'a'.repeat(24)}','2026-11-21':'${'b'.repeat(24)}','2026-11-22':'${'c'.repeat(24)}','2026-11-23':'${'d'.repeat(24)}'}}).pubSig)`));
  T('…and keeps the three newest short ones', JSON.stringify(Object.keys(m2)) === '["2026-11-21","2026-11-22","2026-11-23"]', JSON.stringify(Object.keys(m2)));
  /* 2 · a dropped read is tried once more */
  w.eval(`set(LS.ghtoken,'tok-test');tgwKey();`);
  let calls = 0; w.__mock = async (u) => { if (!/tg\.enc/.test(u)) return { ok: false, status: 404, json: async () => ({}) }; calls++; if (calls === 1) throw new TypeError('Load failed'); return { ok: false, status: 404, json: async () => ({}) }; };
  let r = await w.eval('tgwRead()');
  T('a read that drops once ("Load failed") goes through on the second try', r && r.ok === true && r.state === null && calls === 2, JSON.stringify([r && r.ok, r && r.reason, calls]));
  calls = 0; w.__mock = async (u) => { if (!/tg\.enc/.test(u)) return { ok: false, status: 404, json: async () => ({}) }; calls++; throw new TypeError('Load failed'); };
  r = await w.eval('tgwRead()');
  T('a read that keeps dropping says what it means, not "Load failed"', r && r.ok === false && /couldn't reach GitHub just now \(weak signal\?\)/.test(r.reason) && !/Load failed/.test(r.reason) && calls === 2, JSON.stringify([r && r.reason, calls]));
  w.__mock = async () => { throw new TypeError('something else broke'); };
  r = await w.eval('tgwRead()');
  T('…any other error still shows as itself', r && r.ok === false && /something else broke/.test(r.reason), r && r.reason);
  /* 3 · a dropped write is tried once more, and the file written carries short fingerprints */
  const enc = await w.eval(`tgwEncrypt({v:1,posts:{},lastRun:7,pubSig:window.__old})`); const b64 = Buffer.from(enc, 'utf8').toString('base64');
  let puts = 0, body = null; w.__mock = async (u, o) => { if (o.method === 'PUT') { puts++; if (puts === 1) throw new TypeError('Load failed'); body = JSON.parse(o.body); return { ok: true, status: 200, json: async () => ({}) }; }
    if (/contents\/tg\.enc/.test(u)) return { ok: true, status: 200, json: async () => ({ content: b64, encoding: 'base64', sha: 's1' }) }; return { ok: false, status: 404, json: async () => ({}) }; };
  r = await w.eval(`grdTgwPush({v:1,posts:{'2026-11-23':{d:'2026-11-23',st:{}}},phone:{ts:1}},'test handoff')`);
  T('a hand-off whose upload drops once goes through on the second try', r && r.ok === true && puts === 2, JSON.stringify([r && r.ok, r && r.reason, puts]));
  w.__dec = Buffer.from(body.content, 'base64').toString('utf8'); const back = JSON.parse(w.eval(`window.__p=null;tgwDecrypt(window.__dec).then(s=>window.__p=JSON.stringify(s));'ok'`) && '{}');
  await new Promise(res => setTimeout(res, 200)); const st = JSON.parse(w.__p || '{}');
  T('…and the file it writes holds the card, the worker\'s memory, and no whole-page fingerprints', !!st.posts && !!st.posts['2026-11-23'] && st.lastRun === 7 && Object.keys(st.pubSig || {}).length === 0, JSON.stringify([Object.keys(st.posts || {}), st.lastRun, Object.keys(st.pubSig || {}).length]));
  T('…the upload is a fraction of the old one (under 100 KB here, from a 3 MB file)', Buffer.byteLength(body.content) < 100000 && b64.length > 3e6, JSON.stringify([Buffer.byteLength(body.content), b64.length]));
  puts = 0; w.__mock = async (u, o) => { if (o.method === 'PUT') { puts++; throw new TypeError('Load failed'); } if (/contents\/tg\.enc/.test(u)) return { ok: true, status: 200, json: async () => ({ content: b64, encoding: 'base64', sha: 's1' }) }; return { ok: false, status: 404, json: async () => ({}) }; };
  r = await w.eval(`grdTgwPush({v:1,posts:{},phone:{ts:2}},'test')`);
  T('an upload that keeps dropping says what it means (and nothing throws)', r && r.ok === false && r.net === true && /couldn't reach GitHub just now/.test(r.reason) && puts === 2, JSON.stringify([r && r.reason, puts]));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); }, 3000);
