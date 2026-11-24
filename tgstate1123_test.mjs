/* v3.5.9 · Nov 23, Chris: "I'm tired of this issue…" — the VIP worker box said "Load failed". The hand-off file on the
   autopilot-state branch had grown to 7.6 MB, 4.2 MB of it pubSig: a full copy of the public page for every day since Oct 17,
   kept only to tell whether the page changed. The phone reads and rewrites that file on every status check, check-in and
   hand-off, so over 5G those kept dropping (today's card never reached the worker). The fingerprint is now a short hash and
   only the three newest days keep one, on every merge and every write. */
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
process.env.AUTOPILOT_KEY = 'k'; process.env.TG_BOT_TOKEN = 't'; for (const k of ['FB_PAGE_ID', 'FB_PAGE_TOKEN', 'IG_USER_ID', 'IG_TOKEN', 'THREADS_TOKEN', 'X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET']) delete process.env[k];
const Wk = await import('/home/claude/work/autopilot/worker.mjs');
const day = i => new Date(Date.UTC(2026, 9, 17 + i)).toISOString().slice(0, 10);   /* Oct 17 + i */
const big = n => 'x'.repeat(n);
/* the file as it was: 29 days of full-page copies (the recent ones ~500–700 KB) */
const oldSig = {}; for (let i = 0; i < 29; i++) oldSig[day(i)] = big(i > 20 ? 600000 : 17000);
const sz = o => Buffer.byteLength(JSON.stringify(o));
T('the old fingerprints alone weigh over 4 MB (29 days of whole pages)', sz(oldSig) > 4e6, sz(oldSig));
const tp = Wk.trimPubSig({ ...oldSig, '2026-11-22': 'a'.repeat(24), '2026-11-23': 'b'.repeat(24) });
T('trimPubSig: only the three newest days, and only short fingerprints (a legacy whole-page copy is dropped)', JSON.stringify(Object.keys(tp)) === '["2026-11-22","2026-11-23"]' && Object.values(tp).every(v => v.length <= 64), JSON.stringify(Object.keys(tp)));
const fresh = { '2026-11-21': 'c'.repeat(24), '2026-11-22': 'd'.repeat(24), '2026-11-23': 'e'.repeat(24), '2026-11-20': 'f'.repeat(24) };
T('…three newest of four short ones', JSON.stringify(Object.keys(Wk.trimPubSig(fresh))) === '["2026-11-21","2026-11-22","2026-11-23"]');
/* merge: the worker's copy (old, huge) with a newer hand-off */
const posts = { '2026-11-22': { d: '2026-11-22', st: {}, ids: [1], feed: { today: { d: '2026-11-22', picks: [] } }, feedTs: 1, site: { repo: 'r', tok: 't' } } };
const M = Wk.mergeState({ v: 1, posts: {}, pubSig: { '2026-11-23': 'e'.repeat(24) } }, { v: 1, posts, pubSig: oldSig });
T('mergeState: the merged fingerprints are three short entries at most (4 MB → a few hundred bytes)', Object.keys(M.pubSig).length <= 3 && sz(M.pubSig) < 400 && M.pubSig['2026-11-23'] === 'e'.repeat(24), sz(M.pubSig));
T('…and the posts merge exactly as before', !!M.posts['2026-11-22'] && JSON.stringify(M.posts['2026-11-22'].ids) === '[1]');
const S = Wk.slimFeeds({ v: 1, posts, pubSig: oldSig, lastRun: 5 });
T('slimFeeds (every write goes through it): trims the fingerprints too, keeps everything else', Object.keys(S.pubSig).length === 0 && S.lastRun === 5 && !!S.posts['2026-11-22'].feed, JSON.stringify(Object.keys(S.pubSig)));
T('a state without fingerprints writes without them (nothing invented)', !('pubSig' in Wk.slimFeeds({ v: 1, posts })));
/* the public page: published once per change, its fingerprint a 24-character hash */
const puts = []; const fetch = async (url, opt = {}) => { if (opt.method === 'PUT') { puts.push(url); return { ok: true, status: 201, json: async () => ({}) }; } return { ok: true, status: 200, json: async () => ({ sha: 'abc' }) }; };
const feed = { beta: true, today: { d: '2026-11-23', picks: [{ sp: 'nba', game: 'SA@SAC', pick: 'SA ML', start: '2026-11-24T03:00:00Z' }] }, history: [], record: { w: 1, l: 0, u: 0.5 } };
const st0 = { v: 1, posts: { '2026-11-23': { d: '2026-11-23', st: {}, feed, feedTs: 2, site: { repo: 'ironsilkstrategies/ironsilk-weekly-site', tok: 'x' } } }, pubSig: { ...oldSig } };
const now = Date.parse('2026-11-24T01:00:00Z');
const r1 = await Wk.publishPublic(st0, { fetch, now });
T('publishPublic: the page goes up once, and its fingerprint is a 24-character hash', r1 === 1 && puts.length === 1 && /^[0-9a-f]{24}$/.test(st0.pubSig['2026-11-23']), JSON.stringify([r1, puts.length, String(st0.pubSig['2026-11-23']).slice(0, 30)]));
T('…the old whole-page copies are gone from the state right away', Object.keys(st0.pubSig).length <= 3 && sz(st0.pubSig) < 400, sz(st0.pubSig));
const r2 = await Wk.publishPublic(st0, { fetch, now });
T('…the same page again: nothing goes up (the hash matches)', r2 === 0 && puts.length === 1);
st0.posts['2026-11-23'].st = { 'nba|SA@SAC|SA ML': 'W' };
const r3 = await Wk.publishPublic(st0, { fetch, now });
T('…a graded pick changes the page: it goes up again', r3 === 1 && puts.length === 2);
T('sigOf: same text, same hash; different text, different hash', Wk.sigOf('a') === Wk.sigOf('a') && Wk.sigOf('a') !== Wk.sigOf('b') && Wk.sigOf('a').length === 24);
console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
