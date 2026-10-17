/* v2.34 · the worker's main loop, run for real as a process against a stand-in GitHub / ESPN / Telegram
   (relayloop_mock.cjs). It must: grade and post each result once, survive a GitHub hiccup and a failed
   save without breaking the chain or posting twice, hand off to its next run while a slate is live,
   rest once everything is graded, and honor the RELAY=off switch. */
const { spawnSync } = require('child_process'); const fs = require('fs'), os = require('os'), path = require('path');
const W = __dirname; const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() - 5 * 36e5));
const KEY = Buffer.from(require('crypto').randomBytes(32)).toString('base64');
const card = () => ({ v: 1, lastRun: Date.now() - 10 * 60e3, runs: 7, pubSig: {}, posts: { [day]: { d: day, chat: '-100', ids: [11], parts: ['Card ⟦m:a⟧ COL ML · ⟦m:b⟧ NYR/PIT o6.5'],
  legs: [{ k: 'a', sp: 'nhl', game: 'COL@BOS', pick: 'COL ML', label: 'COL ML', kind: 'ML' }, { k: 'b', sp: 'nhl', game: 'NYR@PIT', pick: 'Over 6.5', label: 'NYR/PIT Over 6.5', kind: 'Total' }],
  recapPlan: { day, best: [{ k: 'a', price: -120 }, { k: 'b', price: -110 }] }, postedTs: Date.now() - 36e5, st: {}, sent: {}, recap: false, worker: true } } });
function run(name, envx, files) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-' + name + '-'));
  const F = files || { 'init.json': card() }; for (const [f, v] of Object.entries(F)) if (v) fs.writeFileSync(path.join(dir, f), JSON.stringify(v));
  const env = { PATH: process.env.PATH, AUTOPILOT_KEY: KEY, TG_BOT_TOKEN: 't', GITHUB_REPOSITORY: 'o/r', GITHUB_TOKEN: 'g', GITHUB_EVENT_NAME: 'schedule', STATE_REPO: 's/site',
    RELAY_BUDGET_MS: '1300', RELAY_STEP_MS: '110', RELAY_MARGIN_MS: '40', MOCK_DIR: dir, ...envx };
  const r = spawnSync(process.execPath, ['-r', path.join(W, 'relayloop_mock.cjs'), path.join(W, 'autopilot/worker.mjs')], { env, encoding: 'utf8', timeout: 30000 });
  let o = null; try { o = JSON.parse(fs.readFileSync(path.join(dir, 'out.json'), 'utf8')); } catch (e) { }
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { }
  return { code: r.status, log: (r.stdout || '') + (r.stderr || ''), o }; }
const results = o => o.tg.filter(x => x.meth === 'sendMessage' && /📣 Results/.test(x.params.text) && x.params.chat_id === '-100');
try {
  /* 1 · a live night: COL@BOS goes final on the 3rd pass; the 2nd read of the card hits a GitHub 500; the first save collides once */
  const A = run('live', { MOCK_FINAL_FROM: 'COL@BOS:3', MOCK_FAIL_READS: '2', MOCK_CONFLICT_WRITES: '1' });
  T('live night: the run ends cleanly', A.code === 0 && A.o, 'exit ' + A.code + ' · ' + A.log.slice(-400));
  if (A.o) { const R = results(A.o);
    T('it polled several times inside one run', A.o.reads >= 5, A.o.reads + ' reads');
    T('a GitHub 500 cost one pass, not the run', /hiccup: read state HTTP 500/.test(A.log));
    T('COL ML posted exactly once, with the final', R.length === 1 && /COL ML/.test(R[0].params.text) && /COL 4–2 BOS/.test(R[0].params.text), R.map(x => x.params.text).join(' | '));
    T('the VIP card was edited with the ✅', A.o.tg.some(x => x.meth === 'editMessageText' && /✅/.test(x.params.text)));
    T('the collided save merged and landed: graded + marked sent on the branch', A.o.final.posts[day].st.a === 'W' && A.o.final.posts[day].sent.a === 'W' && A.o.writes === 2, 'writes ' + A.o.writes);
    T('no commit on quiet passes (one write for the one result)', A.o.written.length === 1);
    T('NYR/PIT still live → it handed off to its next run, once', A.o.dispatch.length === 1 && A.o.dispatch[0].ref === 'main' && /relay handed off/.test(A.log)); }
  /* 2 · every save fails on the pass that posts — the result must stay in memory and never post twice */
  const B = run('dirty', { MOCK_FINAL_FROM: 'COL@BOS:1', MOCK_CONFLICT_WRITES: '1,2,3' });
  if (B.o) { const R = results(B.o);
    T('failed save: the result still posted only once', R.length === 1, R.length + ' posts');
    T('failed save: retried on the next pass and landed', B.o.final.posts[day].sent.a === 'W' && B.o.written.length >= 1);
    T('failed save: the chain carried on (handed off)', B.o.dispatch.length === 1 && B.code === 0, 'exit ' + B.code); }
  else T('failed-save run produced output', false, B.log.slice(-400));
  /* 3 · both games final on the first pass: results, the recap, and the relay rests */
  const C = run('rest', { MOCK_FINAL_FROM: 'COL@BOS:1,NYR@PIT:1' });
  if (C.o) { const R = results(C.o);
    T('all graded: both results in one post', R.length === 1 && /COL ML/.test(R[0].params.text) && /NYR\/PIT Over 6\.5/.test(R[0].params.text));
    T('all graded: the day recap posted', C.o.tg.some(x => /Day recap/.test(x.params.text || '')));
    T('all graded: the relay rests — no next run, one pass', C.o.dispatch.length === 0 && C.o.reads === 1 && /the relay rests/.test(C.log) && C.code === 0, C.o.reads + ' reads'); }
  else T('rest run produced output', false, C.log.slice(-400));
  /* 4 · RELAY=off: it still does its work, it just doesn't start another run */
  const D = run('off', { RELAY: 'off', MOCK_FINAL_FROM: 'COL@BOS:2' });
  if (D.o) T('RELAY=off: posted, but started no next run', results(D.o).length === 1 && D.o.dispatch.length === 0 && D.o.runsAsked === 0 && D.code === 0);
  else T('off run produced output', false, D.log.slice(-400));
  /* 5 · at the cap: no next run */
  const E = run('cap', { MOCK_RUNS: '150' });
  if (E.o) T('150 relayed runs today: it stops relaying', E.o.dispatch.length === 0 && E.o.runsAsked === 1 && /relay cap reached/.test(E.log));
  else T('cap run produced output', false, E.log.slice(-400));
  /* 6 · GitHub down for the whole run: no card read → exit non-zero, no blind relay */
  const F = run('down', { MOCK_FAIL_READS: Array.from({ length: 40 }, (_, i) => i + 1).join(',') });
  if (F.o) T('GitHub down all run: no posts, no relay, run marked failed', F.code === 1 && F.o.tg.length === 0 && F.o.dispatch.length === 0, 'exit ' + F.code);
  else T('down run produced output', false, F.log.slice(-400));
  /* 7 · v2.35 · the card lives on the SITE repo (where the app hands it since v2.25); this repo only has old, closed days.
     Tonight's game goes final on pass 2. Three past cards nobody ever graded must close quietly — no late posts. */
  const H = Date.now(), iso = t => new Date(t).toISOString(), dshift = n => new Date(Date.parse(day + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const d3 = dshift(-3), d1 = dshift(-1), d9 = dshift(-4);
  const own = { v: 1, lastRun: H - 30 * 60e3, runs: 29, pubSig: {}, posts: { [d9]: { d: d9, chat: '-100', ids: [5], parts: ['x'], legs: [{ k: 'z', sp: 'nhl', game: 'COL@BOS', pick: 'COL ML', label: 'COL ML', kind: 'Best 3' }], st: { z: 'W' }, sent: { z: 'W' }, recap: true, worker: true, postedTs: H - 99 * 36e5 } } };
  const site = { v: 1, lastRun: 0, runs: 0, pubSig: {}, posts: {
    [d3]: { d: d3, chat: '-100', ids: [21], parts: ['Old card ⟦m:h1⟧ NYR/PIT o6.5'], legs: [{ k: 'h1', sp: 'nhl', game: 'NYR@PIT', pick: 'Over 6.5', label: 'NYR/PIT Over 6.5', kind: 'Best 3' }], recapPlan: { day: d3, best: [{ k: 'h1' }] }, st: {}, sent: {}, recap: false, worker: true, postedTs: H - 70 * 36e5 },
    [d1]: { d: d1, chat: '-100', ids: [31], parts: ['A ⟦m:y1⟧', 'B'], legs: [{ k: 'y1', sp: 'nhl', game: 'NYR@PIT', pick: 'NYR ML', label: 'NYR ML', kind: 'Best 3' }], recapPlan: { day: d1, best: [{ k: 'y1' }] }, st: {}, sent: {}, recap: false, worker: true, postedTs: H - 27 * 36e5 },
    [day]: { d: day, chat: '-100', ids: [41], parts: ['Tonight ⟦m:nhl|COL@BOS|COL ML⟧ COL ML'], legs: [{ k: 'nhl|COL@BOS|COL ML', sp: 'nhl', game: 'COL@BOS', pick: 'COL ML', label: 'COL ML', kind: 'Best 3' }], recapPlan: { day, best: [{ k: 'nhl|COL@BOS|COL ML', price: -205 }] }, st: {}, sent: {}, recap: false, worker: true, postedTs: H - 6 * 36e5,
      bc: { pub: '@pub', vipLounge: '', pubLounge: '' }, pub: { legs: [{ k: 'nhl|COL@BOS|COL ML', kind: 'Best 3', n: 1, label: 'COL ML (-205)', sp: 'nhl', game: 'COL@BOS', pick: 'COL ML', price: -205, start: iso(H - 150 * 60e3), unlockAt: H - 180 * 60e3 }], parlay: null, day: 'Tonight' },
      feed: { v: 3, today: { d: day, picks: [{ sp: 'nhl', game: 'COL@BOS', pick: 'COL ML', price: -205, start: iso(H - 150 * 60e3), unlockAt: H - 180 * 60e3 }, { sp: 'nhl', game: 'NYR@PIT', pick: 'NYR ML', price: 120 }], props: [] }, record: { w: 10, l: 5, pu: 0, u: 3 } },
      site: { repo: 's/site', path: 'public/picks.json', tok: 'SITETOK' }, feedTs: H - 6 * 36e5 } } };
  const G = run('site', { MOCK_FINAL_FROM: 'COL@BOS:2,NYR@PIT:1' }, { 'init.json': own, 'site.json': site });
  if (G.o) { const vip = G.o.tg.filter(x => x.params.chat_id === '-100'), pub = G.o.tg.filter(x => x.params.chat_id === '@pub');
    const vr = vip.filter(x => x.meth === 'sendMessage' && /📣 Results/.test(x.params.text));
    T('site card: tonight\'s result reached the VIP channel once', vr.length === 1 && /COL ML/.test(vr[0].params.text) && /COL 4–2 BOS/.test(vr[0].params.text), vr.map(x => x.params.text).join(' | ') + ' · ' + G.log.slice(-500));
    T('site card: the VIP post got its ✅ and the day recap posted', vip.some(x => x.meth === 'editMessageText' && x.params.message_id === '41' && /✅/.test(x.params.text)) && vip.some(x => /Day recap/.test(x.params.text || '')));
    T('site card: the public channel got the result and its recap (no stale unlock after the final)', pub.some(x => /📣 Results/.test(x.params.text) && /COL ML/.test(x.params.text)) && pub.some(x => /Public recap/.test(x.params.text)) && !pub.some(x => /UNLOCKED/.test(x.params.text) && /underway/.test(x.params.text) && false));
    T('history: the 3-day-old card got a quiet ✅/❌ edit, nothing sent', vip.some(x => x.meth === 'editMessageText' && x.params.message_id === '21') && !vip.some(x => x.meth === 'sendMessage' && /NYR\/PIT|Old card/.test(x.params.text)));
    T('history: yesterday\'s card (27 h old, never graded) closed quietly — no late results, no late recap', !G.o.tg.some(x => x.meth === 'sendMessage' && /NYR ML/.test(x.params.text)) && !G.o.tg.some(x => /Day recap — ' + d1/.test(x.params.text || '')));
    const sf = G.o.siteFinal, of = G.o.final;
    T('history days are closed on the record (graded + quiet mark)', sf && sf.posts[d3].recap === true && sf.posts[d3].st.h1 === 'L' && sf.posts[d3].sent['~quiet'] === 1 && sf.posts[d1].recap === true);
    T('the site\'s copy was written with the token from the card', G.o.swritten.length >= 1 && G.o.sauth.every(a => a === 'Bearer SITETOK') && sf.posts[day].st['nhl|COL@BOS|COL ML'] === 'W' && sf.posts[day].site.tok === 'SITETOK');
    T('this repo\'s copy has the grades but never the token', of && of.posts[day] && of.posts[day].st['nhl|COL@BOS|COL ML'] === 'W' && of.posts[day].site && of.posts[day].site.tok === '' && !JSON.stringify(of).includes('SITETOK'));
    const pg = G.o.page[G.o.page.length - 1];
    T('the public page published with the card token: COL graded, the unscheduled pick stays hidden', pg && pg.auth === 'Bearer SITETOK' && pg.body.today.picks[0].hit === true && pg.body.today.picks[1].hidden === true && !JSON.stringify(pg.body).includes('NYR ML'), JSON.stringify(pg && pg.body.today).slice(0, 300));
    T('graded and recapped → the relay rests', G.o.dispatch.length === 0 && /the relay rests/.test(G.log) && G.code === 0, 'exit ' + G.code);
    T('the token never shows in the log', !/SITETOK/.test(G.log)); }
  else T('site run produced output', false, G.log.slice(-600));
  /* 8 · a live game on the site card + an unlock that missed its T-30 → says "underway" */
  const site2 = JSON.parse(JSON.stringify(site)); delete site2.posts[d3]; delete site2.posts[d1];
  const K = run('late', { MOCK_FINAL_FROM: 'NYR@PIT:1' }, { 'init.json': own, 'site.json': site2 });
  if (K.o) { const un = K.o.tg.filter(x => x.params.chat_id === '@pub' && /UNLOCKED/.test(x.params.text));
    T('late unlock: posted once, marked underway, no false "30 minutes before" claim', un.length === 1 && /underway/.test(un[0].params.text) && /This post is late/.test(un[0].params.text) && !/posted 30 minutes before each start/.test(un[0].params.text), un.map(x => x.params.text).join(' | '));
    T('late unlock: game still on → the relay hands off', K.o.dispatch.length === 1); }
  else T('late run produced output', false, K.log.slice(-600));
  /* 9 · a private repo never relays (Actions minutes) */
  const Pv = run('private', { MOCK_PRIVATE: '1' });
  if (Pv.o) T('private repo: no relay, the schedule carries on', Pv.o.dispatch.length === 0 && /private/.test(Pv.log) && Pv.code === 0); else T('private run produced output', false, Pv.log.slice(-400));
  /* 10 · Telegram refuses the results post once (rate limit): it isn't marked sent, the next pass delivers it, once */
  const Q = run('refused', { MOCK_FINAL_FROM: 'COL@BOS:1', MOCK_TG_FAIL: '2' });
  if (Q.o) { const R2 = results(Q.o); T('a refused send retries next pass and lands once', R2.length === 1 && Q.o.final.posts[day].sent.a === 'W' && /sendMessage said Too Many Requests/.test(Q.log), R2.length + ' · ' + Q.log.slice(-300)); }
  else T('refused run produced output', false, Q.log.slice(-400));
  /* the mock never ships with the workflow */
  const wf = fs.readFileSync(path.join(W, '.github/workflows/tg-autopilot.yml'), 'utf8'); T('the workflow runs the worker alone (no test double)', !/relayloop_mock/.test(wf));
} catch (e) { T('harness', false, e.stack); }
console.log(out.join('\n')); const p = out.filter(x => x.startsWith('PASS')).length; console.log(`\n${p} pass / ${out.length - p} fail`); process.exit(0);
