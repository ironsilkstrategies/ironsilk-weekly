/* v3.0.11 / worker v3.1.5 · the hand-off file crossed 1 MB on Nov 13: GitHub's contents API then sends no body ("encoding":"none"), so the
   app couldn't hand off and the worker read "unknown format" — no card after Nov 13. Both now fall back to the blob API (up to 100 MB),
   and only the two newest days keep their full public card. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) { x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); try { Object.defineProperty(x, 'crypto', { value: require('crypto').webcrypto, configurable: true }); } catch (e) { } x.TextEncoder = TextEncoder; x.TextDecoder = TextDecoder; } }).window;
setTimeout(async () => { try {
  /* the app reads a >1 MB hand-off through the blob API */
  const calls = [];
  w.eval(`set(LS.ghtoken,'tok-test');window.__ENC=null;`);
  const enc = await w.eval(`tgwEncrypt({v:1,posts:{'2026-11-14':{d:'2026-11-14',x:1}}})`);
  const b64 = Buffer.from(enc, 'utf8').toString('base64');
  w.fetch = (u, o) => { calls.push(u.split('?')[0]); if (/\/contents\/tg\.enc/.test(u)) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ sha: 'abc123', size: 1544532, encoding: 'none', content: '' }) });
    if (/\/git\/blobs\/abc123/.test(u)) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ sha: 'abc123', encoding: 'base64', content: b64.replace(/(.{60})/g, '$1\n') }) });
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }); };
  const R = await w.eval('tgwRead()');
  T('app: a hand-off file over 1 MB is read through the blob API', R.ok && R.sha === 'abc123' && R.state && R.state.posts['2026-11-14'].x === 1 && calls.some(c => /git\/blobs\/abc123/.test(c)), JSON.stringify([R.ok, R.reason, calls]));
  /* only the two newest days keep the full card */
  const M = w.eval(`tgwMerge({v:1,posts:{}},{v:1,posts:{'2026-11-10':{d:'2026-11-10',feed:{a:1},legs:[1]},'2026-11-11':{d:'2026-11-11',feed:{a:1}},'2026-11-12':{d:'2026-11-12',feed:{a:1}},'2026-11-13':{d:'2026-11-13',feed:{a:1}},'2026-11-14':{d:'2026-11-14',feed:{a:1}}}})`);
  T('app: only the two newest days keep their public card; older days keep the rest', !M.posts['2026-11-10'].feed && M.posts['2026-11-10'].legs.length === 1 && !M.posts['2026-11-12'].feed && M.posts['2026-11-13'].feed && M.posts['2026-11-14'].feed, JSON.stringify(Object.fromEntries(Object.entries(M.posts).map(([d, p]) => [d, !!p.feed]))));
  /* the worker */
  process.env.AUTOPILOT_KEY = 'k'; process.env.TG_BOT_TOKEN = 't';
  const Wk = await import(path.join(W, 'autopilot/worker.mjs'));
  const S = Wk.slimFeeds({ v: 1, posts: { '2026-11-12': { feed: { a: 1 }, st: { x: 'W' } }, '2026-11-13': { feed: { a: 1 } }, '2026-11-14': { feed: { a: 1 } } } });
  T('worker: same slimming before it writes (two newest days keep the card)', !S.posts['2026-11-12'].feed && S.posts['2026-11-12'].st.x === 'W' && S.posts['2026-11-13'].feed && S.posts['2026-11-14'].feed);
  const src = fs.readFileSync(path.join(W, 'autopilot/worker.mjs'), 'utf8');
  T('worker: readStateAt falls back to the blob API when the contents API sends no body', /if \(!raw \|\| j\.encoding === 'none'\) \{ const b = await fetch\(`https:\/\/api\.github\.com\/repos\/\$\{repo\}\/git\/blobs\/\$\{j\.sha\}`/.test(src));
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 2500);
