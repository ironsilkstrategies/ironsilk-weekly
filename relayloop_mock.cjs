/* Test double for the worker's outside world (GitHub state branch + Actions, ESPN, Telegram).
   Loaded with `node -r` by relayloop1016_test.js only; the workflow never loads it.
   MOCK_DIR: folder with init.json (the plain state) — results land in out.json there.
   MOCK_FAIL_READS / MOCK_CONFLICT_WRITES: comma lists of 1-based call numbers that fail.
   MOCK_FINAL_FROM: the state-read count from which a game reads final (per game: "COL@BOS:3,NYR@PIT:99"). */
const fs = require('fs'), path = require('path'), wc = require('crypto').webcrypto;
const DIR = process.env.MOCK_DIR, KEYB = Buffer.from(process.env.AUTOPILOT_KEY, 'base64');
const nums = s => String(s || '').split(',').filter(Boolean).map(Number);
const FAIL_READS = nums(process.env.MOCK_FAIL_READS), CONFLICT = nums(process.env.MOCK_CONFLICT_WRITES);
const FINAL = Object.fromEntries(String(process.env.MOCK_FINAL_FROM || '').split(',').filter(Boolean).map(x => { const [g, n] = x.split(':'); return [g, +n]; }));
const SCORE = { 'COL@BOS': [4, 2], 'NYR@PIT': [3, 2] };
const R = { reads: 0, writes: 0, written: [], tg: [], dispatch: [], runsAsked: 0, espn: 0 };
let plain = JSON.parse(fs.readFileSync(path.join(DIR, 'init.json'), 'utf8')), sha = 's0';
async function enc(obj) { const k = await wc.subtle.importKey('raw', KEYB, 'AES-GCM', false, ['encrypt']); const iv = wc.getRandomValues(new Uint8Array(12));
  const ct = await wc.subtle.encrypt({ name: 'AES-GCM', iv }, k, Buffer.from(JSON.stringify(obj), 'utf8')); return 'v1.' + Buffer.from(iv).toString('base64') + '.' + Buffer.from(new Uint8Array(ct)).toString('base64'); }
async function dec(str) { const [, iv, ct] = String(str).trim().split('.'); const k = await wc.subtle.importKey('raw', KEYB, 'AES-GCM', false, ['decrypt']);
  return JSON.parse(Buffer.from(await wc.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(iv, 'base64') }, k, Buffer.from(ct, 'base64'))).toString('utf8')); }
const res = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body, text: async () => JSON.stringify(body) });
globalThis.fetch = async (url, o = {}) => { url = String(url); const m = (o.method || 'GET').toUpperCase();
  if (/api\.github\.com\/repos\/[^/]+\/[^/]+\/contents\/tg\.enc/.test(url)) {
    if (m === 'GET') { R.reads++; if (FAIL_READS.includes(R.reads)) return res(500, { message: 'boom' });
      return res(200, { sha, content: Buffer.from(await enc(plain), 'utf8').toString('base64') }); }
    if (m === 'PUT') { R.writes++; const b = JSON.parse(o.body); if (CONFLICT.includes(R.writes) || (b.sha || '') !== sha) return res(409, { message: 'conflict' });
      plain = await dec(Buffer.from(b.content, 'base64').toString('utf8')); sha = 's' + R.writes; R.written.push(plain); return res(200, { content: { sha } }); } }
  if (/\/actions\/workflows\/[^/]+\/runs\?/.test(url)) { R.runsAsked++; return res(200, { total_count: +(process.env.MOCK_RUNS || 3) }); }
  if (/\/actions\/workflows\/[^/]+\/dispatches$/.test(url)) { R.dispatch.push(JSON.parse(o.body)); return { status: 204, ok: true, json: async () => ({}) }; }
  if (/site\.api\.espn\.com/.test(url)) { R.espn++; const pass = R.reads;
    const events = Object.keys(SCORE).map((g, i) => { const [a, h] = g.split('@'); const fin = pass >= (FINAL[g] || 1e9); const [as, hs] = SCORE[g];
      return { id: 'e' + i, competitions: [{ status: { type: { completed: fin, state: fin ? 'post' : 'in' } }, competitors: [{ homeAway: 'away', team: { abbreviation: a }, score: String(as) }, { homeAway: 'home', team: { abbreviation: h }, score: String(hs) }] }] }; });
    return res(200, { events }); }
  if (/api\.telegram\.org/.test(url)) { const meth = url.split('/').pop(); const params = Object.fromEntries(new URLSearchParams(o.body)); R.tg.push({ meth, params }); return res(200, { ok: true, result: { message_id: 500 + R.tg.length } }); }
  return res(404, {}); };
process.on('exit', () => { try { fs.writeFileSync(path.join(DIR, 'out.json'), JSON.stringify({ ...R, final: plain })); } catch (e) { } });
