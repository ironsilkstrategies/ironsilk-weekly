/* Test double for the worker's outside world (GitHub state branches + Actions + the site page, ESPN, Telegram).
   Loaded with `node -r` by relayloop1016_test.js only; the workflow never loads it.
   MOCK_DIR: folder with init.json (this repo's plain state) and optionally site.json (the site repo's) — results land in out.json.
   MOCK_FAIL_READS / MOCK_CONFLICT_WRITES: comma lists of 1-based call numbers (this repo's state) that fail.
   MOCK_FINAL_FROM: per game, the pass (= this repo's state reads) from which it reads final: "COL@BOS:3,NYR@PIT:99".
   MOCK_PRIVATE=1: this repo reports private. MOCK_RUNS: relayed runs GitHub reports today. */
const fs = require('fs'), path = require('path'), wc = require('crypto').webcrypto;
const DIR = process.env.MOCK_DIR, KEYB = Buffer.from(process.env.AUTOPILOT_KEY, 'base64');
const OWN = process.env.GITHUB_REPOSITORY, SITE = process.env.STATE_REPO || 'ironsilkstrategies/ironsilk-weekly-site';
const nums = s => String(s || '').split(',').filter(Boolean).map(Number);
const FAIL_READS = nums(process.env.MOCK_FAIL_READS), CONFLICT = nums(process.env.MOCK_CONFLICT_WRITES);
const FINAL = Object.fromEntries(String(process.env.MOCK_FINAL_FROM || '').split(',').filter(Boolean).map(x => { const [g, n] = x.split(':'); return [g, +n]; }));
const SCORE = process.env.MOCK_SCORES ? JSON.parse(process.env.MOCK_SCORES) : { 'COL@BOS': [4, 2], 'NYR@PIT': [3, 2] };
const R = { reads: 0, writes: 0, written: [], sreads: 0, swrites: 0, swritten: [], sauth: [], tg: [], dispatch: [], runsAsked: 0, espn: 0, page: [], repoAsked: 0 };
const load = f => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { return null; } };
const store = { [OWN]: { plain: load('init.json'), sha: 'o0' }, [SITE]: { plain: load('site.json'), sha: 's0' } };
async function enc(obj) { const k = await wc.subtle.importKey('raw', KEYB, 'AES-GCM', false, ['encrypt']); const iv = wc.getRandomValues(new Uint8Array(12));
  const ct = await wc.subtle.encrypt({ name: 'AES-GCM', iv }, k, Buffer.from(JSON.stringify(obj), 'utf8')); return 'v1.' + Buffer.from(iv).toString('base64') + '.' + Buffer.from(new Uint8Array(ct)).toString('base64'); }
async function dec(str) { const [, iv, ct] = String(str).trim().split('.'); const k = await wc.subtle.importKey('raw', KEYB, 'AES-GCM', false, ['decrypt']);
  return JSON.parse(Buffer.from(await wc.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(iv, 'base64') }, k, Buffer.from(ct, 'base64'))).toString('utf8')); }
const res = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body, text: async () => JSON.stringify(body) });
const hdr = (o, k) => { const h = (o && o.headers) || {}; return h[k] || h[k.toLowerCase()] || ''; };
globalThis.fetch = async (url, o = {}) => { url = String(url); const m = (o.method || 'GET').toUpperCase();
  const st = url.match(/api\.github\.com\/repos\/([^/]+\/[^/]+)\/contents\/tg\.enc/);
  if (st) { const repo = st[1], S = store[repo]; if (!S) return res(404, {}); const own = repo === OWN;
    if (m === 'GET') { if (own) { R.reads++; if (FAIL_READS.includes(R.reads)) return res(500, { message: 'boom' }); } else R.sreads++;
      if (!S.plain) return res(404, { message: 'Not Found' }); return res(200, { sha: S.sha, content: Buffer.from(await enc(S.plain), 'utf8').toString('base64') }); }
    if (m === 'PUT') { const b = JSON.parse(o.body); const n = own ? ++R.writes : ++R.swrites; if (!own) R.sauth.push(hdr(o, 'Authorization'));
      if ((own && CONFLICT.includes(n)) || (b.sha || '') !== (S.plain ? S.sha : '')) return res(409, { message: 'conflict' });
      S.plain = await dec(Buffer.from(b.content, 'base64').toString('utf8')); S.sha = (own ? 'o' : 's') + n; (own ? R.written : R.swritten).push(S.plain); return res(200, { content: { sha: S.sha } }); } }
  if (/api\.github\.com\/repos\/[^/]+\/[^/]+\/contents\/public\/picks\.json/.test(url)) { if (m === 'PUT') { R.page.push({ auth: hdr(o, 'Authorization'), body: JSON.parse(Buffer.from(JSON.parse(o.body).content, 'base64').toString('utf8')) }); return res(201, {}); } return res(404, {}); }
  if (url === `https://api.github.com/repos/${OWN}`) { R.repoAsked++; return res(200, { private: process.env.MOCK_PRIVATE === '1' }); }
  if (/\/actions\/workflows\/[^/]+\/runs\?/.test(url)) { R.runsAsked++; return res(200, { total_count: +(process.env.MOCK_RUNS || 3) }); }
  if (/\/actions\/workflows\/[^/]+\/dispatches$/.test(url)) { R.dispatch.push(JSON.parse(o.body)); return { status: 204, ok: true, json: async () => ({}) }; }
  if (/site\.api\.espn\.com/.test(url)) { R.espn++; const pass = R.reads;
    const events = Object.keys(SCORE).map((g, i) => { const [a, h] = g.split('@'); const fin = pass >= (FINAL[g] || 1e9); const [as, hs] = SCORE[g];
      return { id: 'e' + i, competitions: [{ status: { type: { completed: fin, state: fin ? 'post' : 'in' } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] }; });
    return res(200, { events }); }
  if (/api\.telegram\.org/.test(url)) { const meth = url.split('/').pop(); const params = Object.fromEntries(new URLSearchParams(o.body)); R.tgTries = (R.tgTries || 0) + 1;
    if (nums(process.env.MOCK_TG_FAIL).includes(R.tgTries)) return res(429, { ok: false, description: 'Too Many Requests: retry after 5' });
    R.tg.push({ meth, params }); return res(200, { ok: true, result: { message_id: 500 + R.tg.length } }); }
  return res(404, {}); };
process.on('exit', () => { try { fs.writeFileSync(path.join(DIR, 'out.json'), JSON.stringify({ ...R, final: store[OWN].plain, siteFinal: store[SITE] && store[SITE].plain })); } catch (e) { } });
