/* v3.2 · the safeguards, worker side: the card the phone couldn't post, the watchdog, /health, the squash, the vault courier */
import path from 'node:path';
const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
process.env.AUTOPILOT_KEY = Buffer.alloc(32, 7).toString('base64'); process.env.TG_BOT_TOKEN = '123:abc';
process.env.GITHUB_REPOSITORY = 'ironsilkstrategies/ironsilk-weekly'; process.env.GITHUB_TOKEN = 'x';
const Wk = await import(path.join(W, 'autopilot/worker.mjs'));
const day = Wk.chicagoDay(Date.now());
const at = (h, d = day) => { /* a Central-time moment on that day */ const base = Date.parse(d + 'T12:00:00Z'); for (let t = base - 18 * 36e5; t < base + 18 * 36e5; t += 15 * 60e3) { const hh = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' }).format(new Date(t)); if (hh === h && Wk.chicagoDay(t) === d) return t; } return base; };

/* ── 1 · the merge never makes the worker post a card twice ── */
{ const phone = { v: 1, posts: { [day]: { d: day, chat: '-100', ids: [], needPost: true, postedTs: 5, parts: ['a'], legs: [], st: {}, sent: {} } } };
  const worker = { v: 1, posts: { [day]: { d: day, chat: '-100', ids: [11], needPost: false, postedBy: 'worker', postedTs: 5, parts: ['a'], legs: [], st: { k: 'W' }, sent: {} } } };
  const m1 = Wk.mergeState(phone, worker).posts[day], m2 = Wk.mergeState(worker, phone).posts[day];
  T('a later hand-off without ids keeps the ids the worker posted with', m1.ids.length === 1 && m2.ids.length === 1, JSON.stringify(m1.ids));
  T('…and the card is no longer waiting to be posted', m1.needPost === false && m2.needPost === false && m1.postedBy === 'worker');
  const fresh = Wk.mergeState(phone, { v: 1, posts: {} }).posts[day]; T('a brand-new unposted card stays waiting for the worker', fresh.needPost === true);
  const re = Wk.mergeState({ v: 1, posts: { [day]: { ...worker.posts[day], ids: [21, 22], postedTs: 9, postedBy: undefined } } }, worker).posts[day];
  T('a newer post from the phone (a manual re-post) keeps its own ids', re.ids.join() === '21,22');
  const ph = Wk.mergeState({ v: 1, posts: {}, phone: { ts: 10, build: 'v3.0.39' } }, { v: 1, posts: {}, phone: { ts: 5 }, watch: { sent: { silent: { d: day, ts: 1 } } } });
  T('the phone check-in keeps the newest, the watchdog memory rides along', ph.phone.ts === 10 && ph.watch.sent.silent.d === day); }

/* ── 2 · the worker posts the card itself ── */
{ const sent = []; let mid = 700; const tg = async (m, p) => { sent.push({ m, p }); return m === 'sendMessage' ? { ok: true, result: { message_id: ++mid } } : { ok: true }; };
  const state = { v: 1, posts: { [day]: { d: day, chat: '-100', ids: [], needPost: true, postedTs: Date.now(), parts: ['<b>VIP</b> ⟦m:nfl|LV@KC|KC ML⟧KC ML', 'part two'], legs: [{ k: 'nfl|LV@KC|KC ML', sp: 'nfl', game: 'LV@KC', pick: 'KC ML', label: 'KC ML' }], st: {}, sent: {}, recapPlan: {} } } };
  await Wk.runOnce(state, day, { tg, gradePick: async () => null, gradeProp: async () => null, now: Date.now() });
  const p = state.posts[day]; const posts = sent.filter(x => x.m === 'sendMessage' && x.p.chat_id === '-100');
  T('a card the phone couldn\'t post goes out from the worker, every part', posts.length === 2 && p.ids.length === 2 && p.needPost === false && p.postedBy === 'worker', JSON.stringify(p.ids));
  T('the result slots go out empty (no stray markers)', !/⟦/.test(posts[0].p.text));
  sent.length = 0; await Wk.runOnce(state, day, { tg, gradePick: async () => 'W', gradeProp: async () => null, now: Date.now() });
  T('a result edits the post the worker made (it has the ids now)', sent.some(x => x.m === 'editMessageText' && x.p.message_id === p.ids[0] && /✅/.test(x.p.text)));
  T('…and it never posts the card a second time', !sent.some(x => x.m === 'sendMessage' && /VIP/.test(x.p.text || '')));
  const refused = { v: 1, posts: { [day]: { d: day, chat: '-100', ids: [], needPost: true, postedTs: Date.now(), parts: ['x'], legs: [], st: {}, sent: {} } } };
  await Wk.runOnce(refused, day, { tg: async () => null, gradePick: async () => null, now: Date.now() });
  T('Telegram refusing it leaves the card waiting for the next pass', refused.posts[day].needPost === true && !refused.posts[day].ids.length); }

/* ── 3 · the watchdog ── */
{ const noon = at(12), late = at(16); const base = { v: 1, posts: {}, phone: null };
  T('no alarms before the phone has ever checked in, before 3 PM', Wk.watchPlan(base, noon).length === 0);
  T('no card by 3 PM says so', Wk.watchPlan(base, late).map(a => a.k).includes('nocard'));
  const silent = { v: 1, posts: { [day]: { d: day, legs: [] } }, phone: { ts: noon - 30 * 36e5, sync: { on: true, last: noon - 31 * 36e5 }, keys: { n: 4, missing: 0 }, xfer: 1 } };
  const k1 = Wk.watchPlan(silent, noon).map(a => a.k); T('a phone silent for 30 hours is flagged (and stale backups wait for it)', k1.includes('silent') && !k1.includes('backup'), k1.join());
  const auth = { v: 1, posts: { [day]: { d: day, legs: [] } }, phone: { ts: noon - 36e5, sync: { on: true, last: noon - 40 * 36e5, auth: true, authTs: noon - 2 * 36e5, err: 'HTTP 401' }, vault: { on: true, ts: noon - 3 * 36e5 }, keys: { n: 4, missing: 0 }, xfer: 1 } };
  const a2 = Wk.watchPlan(auth, noon); const b = a2.find(a => a.k === 'backup');
  T('a refused sync token is flagged, with the vault\'s time for comfort', !!b && /OFF/.test(b.text) && /vault/.test(b.text), a2.map(a => a.k).join());
  const tok = { v: 1, posts: { [day]: { d: day, legs: [] } }, watch: { siteErr: { status: 401, ts: noon - 36e5 } } };
  T('a refused publish token inside the card is flagged', Wk.watchPlan(tok, noon).some(a => a.k === 'sitetok'));
  const once = { ...tok, watch: { ...tok.watch, sent: { sitetok: { d: day, ts: noon - 60e3 } } } };
  T('each alert goes out once a day', !Wk.watchPlan(once, noon).some(a => a.k === 'sitetok'));
  const nox = { v: 1, posts: { [day]: { d: day, legs: [] } }, phone: { ts: noon - 36e5, sync: { on: true, last: noon - 36e5 }, keys: { n: 3, missing: 1 }, xfer: 0 } };
  const xf = Wk.watchPlan(nox, noon).find(a => a.k === 'xfer'); T('no transfer code saved: a weekly nudge', !!xf && xf.every === 7);
  const wk = { ...nox, watch: { sent: { xfer: { d: Wk.chicagoDay(noon - 3 * 864e5), ts: 1 } } } }; T('…not again three days later', !Wk.watchPlan(wk, noon).some(a => a.k === 'xfer'));
  const sent = []; const tg = async (m, p) => { sent.push({ m, p }); if (m === 'getChatAdministrators') return { ok: true, result: [{ status: 'creator', user: { id: 42, is_bot: false } }] }; return { ok: true, result: { message_id: 1 } }; };
  const st = { v: 1, posts: { [Wk.chicagoDay(late - 864e5)]: { d: 'x', chat: '-100', legs: [] } } };
  const n = await Wk.runWatchdog(st, { tg, now: late }); const dm = sent.find(x => x.m === 'sendMessage');
  T('the owner gets a private message (the VIP channel\'s creator)', n >= 1 && dm && dm.p.chat_id === '42' && /No card/.test(dm.p.text), dm && dm.p.text.slice(0, 60));
  sent.length = 0; await Wk.runWatchdog(st, { tg, now: late + 60e3 }); T('…and not again on the next pass', !sent.some(x => x.m === 'sendMessage'));
  const night = at(23); const st2 = { v: 1, posts: { x: { d: 'x', chat: '-100', legs: [] } } }; sent.length = 0;
  T('quiet hours: nothing after 10 PM Central', (await Wk.runWatchdog(st2, { tg, now: night })) === 0 && !sent.length);
  const st3 = { v: 1, posts: { x: { d: 'x', chat: '-100', legs: [] } } }; const tgNo = async m => m === 'getChatAdministrators' ? { ok: true, result: [{ status: 'creator', user: { id: 42 } }] } : null;
  await Wk.runWatchdog(st3, { tg: tgNo, now: late }); T('a DM that can\'t land is remembered (no retry every 75 seconds)', st3.watch.sent.nocard && st3.watch.sent.nocard.fail === true); }

/* ── 4 · /health and health.json ── */
{ const now = at(14); const state = { v: 1, lastRun: now - 5 * 60e3, runs: 970, posts: { [day]: { d: day, legs: [{ k: 'a' }, { k: 'b' }], st: { a: 'W', zz: 'L' }, ids: [], needPost: false, postedBy: 'worker' } },
    phone: { ts: now - 2 * 36e5, build: 'v3.0.39', sync: { on: true, last: now - 3 * 36e5 }, vault: { on: true, ts: now - 36e5 }, keys: { n: 4, missing: 0, tg: false }, xfer: 1 }, watch: { vault: { ts: now - 36e5, gens: [{ day, ts: now - 36e5, keys: 230 }] } } };
  const H = Wk.healthOf(state, now); const s = JSON.stringify(H);
  T('health counts only today\'s legs as graded', H.card.graded === 1 && H.card.legs === 2 && H.card.posted === 'worker');
  T('health.json carries no secrets or picks — times, counts, yes/no', !/tok|key"|pick|ghp_|github_pat/i.test(s.replace(/keysMissing/g, '')), s.slice(0, 120));
  const txt = Wk.healthText(state, now); T('/health reads like a status board', /Worker: last run/.test(txt) && /Cloud backup: last saved/.test(txt) && /Vault: newest/.test(txt) && !/Needs you/.test(txt));
  const bad = { ...state, watch: { siteErr: { status: 401, ts: now - 60e3 } } }; T('/health names what needs you', /REFUSED/.test(Wk.healthText(bad, now)) && /Needs you:.*sitetok/.test(Wk.healthText(bad, now)));
  const calls = []; const F = async (u, o) => { const m = (o && o.method) || 'GET'; calls.push({ u, m, b: o && o.body }); const J = (st, b) => ({ ok: st < 300, status: st, json: async () => b });
    if (/git\/blobs$/.test(u)) return J(201, { sha: 'hb' }); if (/git\/trees$/.test(u)) return J(201, { sha: 'ht' }); if (/git\/commits$/.test(u)) return J(201, { sha: 'hc' });
    if (/git\/refs\/heads\/desk-health$/.test(u) && m === 'PATCH') return J(calls.filter(c => c.m === 'PATCH').length > 1 ? 200 : 422, {}); if (/git\/refs$/.test(u)) return J(201, {}); return J(404, {}); };
  await Wk.writeHealth(state, { fetch: F, now }); const blob = calls.find(c => /git\/blobs$/.test(c.u)), cm = calls.find(c => /git\/commits$/.test(c.u)), mk = calls.find(c => /git\/refs$/.test(c.u));
  T('health.json goes to its own branch (desk-health), never the site or the state branch', blob && /ironsilk-weekly\/git/.test(blob.u) && mk && JSON.parse(mk.b).ref === 'refs/heads/desk-health' && !calls.some(c => /autopilot-state|ironsilk-weekly-site/.test(c.u)));
  T('…as one commit with no history', cm && JSON.parse(cm.b).parents.length === 0 && JSON.parse(JSON.parse(blob.b).content).card.legs === 2);
  calls.length = 0; await Wk.writeHealth(state, { fetch: F, now: now + 60e3 }); T('…and isn\'t rewritten when nothing changed', !calls.length); }

/* ── 5 · a refused site token: noted once, cleared by a success ── */
{ const st = { v: 1, posts: {} }; const t0 = Date.now();
  T('a 401 from the site is noted', Wk.siteNote(st, { status: 401, ts: t0 }, 0) && st.watch.siteErr.status === 401);
  T('…but the same refusal minutes later doesn\'t make the run save again', !Wk.siteNote(st, { status: 401, ts: t0 + 5 * 60e3 }, 0));
  T('a later successful write clears it', Wk.siteNote(st, null, t0 + 10 * 60e3) && !st.watch.siteErr);
  const m = Wk.mergeWatch({ siteErr: { status: 401, ts: 5 } }, { siteOk: 9 }); T('the merge keeps "fixed" when the success is newer', !m.siteErr && m.siteOk === 9); }

/* ── 6 · the history squash ── */
{ const calls = []; let head = 'h1'; const F = async (u, o) => { const m = (o && o.method) || 'GET'; calls.push({ u, m, b: o && o.body });
    const J = (s, b) => ({ ok: s < 300, status: s, json: async () => b });
    if (/git\/ref\/heads\/autopilot-state$/.test(u)) return J(200, { object: { sha: head } });
    if (/git\/commits\/h1$/.test(u)) return J(200, { tree: { sha: 't1' }, parents: [{ sha: 'h0' }] });
    if (/git\/commits$/.test(u) && m === 'POST') return J(201, { sha: 'n1' });
    if (/git\/refs\/heads\/autopilot-state$/.test(u) && m === 'PATCH') { head = JSON.parse(o.body).sha; return J(200, {}); }
    return J(404, {}); };
  const ok = await Wk.squashBranch('o/r', 'tok', { fetch: F }); const nc = calls.find(c => c.m === 'POST');
  T('the state branch is squashed to one commit with the same files', ok && JSON.parse(nc.b).parents.length === 0 && JSON.parse(nc.b).tree === 't1' && head === 'n1');
  const F2 = async (u, o) => { const m = (o && o.method) || 'GET'; const J = (s, b) => ({ ok: s < 300, status: s, json: async () => b });
    if (/git\/ref\/heads\//.test(u)) { F2.n = (F2.n || 0) + 1; return J(200, { object: { sha: F2.n > 1 ? 'h2' : 'h1' } }); }
    if (/git\/commits\/h1$/.test(u)) return J(200, { tree: { sha: 't1' }, parents: [{}] }); if (/git\/commits$/.test(u)) return J(201, { sha: 'n1' });
    if (m === 'PATCH') { F2.patched = true; return J(200, {}); } return J(404, {}); };
  T('a save that lands mid-squash wins (the squash waits for tomorrow)', !(await Wk.squashBranch('o/r', 't', { fetch: F2 })) && !F2.patched); }

/* ── 7 · the vault courier ── */
{ const mk = () => { const repo = { ref: null, files: {}, blobs: {}, n: 0 }; const site = { meta: null, enc: null };
    const F = async (u, o) => { const m = (o && o.method) || 'GET'; const J = (s, b) => ({ ok: s < 300, status: s, json: async () => b, text: async () => (typeof b === 'string' ? b : JSON.stringify(b)) });
      if (/raw\.githubusercontent\.com\/ironsilkstrategies\/ironsilk-weekly-site\/desk-vault\/vault\.json/.test(u)) return site.meta ? J(200, site.meta) : J(404, {});
      if (/raw\.githubusercontent\.com\/ironsilkstrategies\/ironsilk-weekly-site\/desk-vault\/vault\.enc/.test(u)) return site.enc ? J(200, site.enc) : J(404, '');
      if (/git\/ref\/heads\/desk-vault$/.test(u)) return repo.ref ? J(200, { object: { sha: repo.ref } }) : J(404, {});
      if (/git\/commits\/(\w+)$/.test(u) && m === 'GET') return J(200, { tree: { sha: repo.tree } });
      if (/git\/trees\/\w+$/.test(u) && m === 'GET') return J(200, { tree: Object.entries(repo.files).map(([path, sha]) => ({ path, sha, type: 'blob' })) });
      if (/git\/blobs\/(\w+)$/.test(u) && m === 'GET') { const sha = u.split('/').pop(); return J(200, { content: Buffer.from(repo.blobs[sha] || '').toString('base64') }); }
      if (/git\/blobs$/.test(u)) { const sha = 'b' + (++repo.n); repo.blobs[sha] = JSON.parse(o.body).content; return J(201, { sha }); }
      if (/git\/trees$/.test(u)) { const sha = 't' + (++repo.n); repo.pending = JSON.parse(o.body).tree; repo.trees = repo.trees || {}; repo.trees[sha] = repo.pending; return J(201, { sha }); }
      if (/git\/commits$/.test(u)) { const sha = 'c' + (++repo.n); const b = JSON.parse(o.body); repo.commits = repo.commits || {}; repo.commits[sha] = b; return J(201, { sha }); }
      if (/git\/refs/.test(u)) { const b = JSON.parse(o.body); const c = repo.commits[b.sha]; repo.ref = b.sha; repo.tree = c.tree; repo.files = Object.fromEntries(repo.trees[c.tree].map(e => [e.path, e.sha])); repo.parents = c.parents; return J(200, {}); }
      return J(404, {}); }; return { repo, site, F }; };
  const { repo, site, F } = mk(); const st = { v: 1, posts: {} }; const d1 = '2026-11-15', t1 = Date.parse(d1 + 'T20:00:00Z');
  site.meta = { v: 2, ts: t1, keys: 230, bytes: 9e6 }; site.enc = 'v2g.AAAA.BBBB';
  T('a new vault copy on the site is copied here', (await Wk.vaultCourier(st, { fetch: F, now: t1 + 60e3 })) === 1 && repo.files['vault.enc'] && repo.blobs[repo.files['vault.enc']] === 'v2g.AAAA.BBBB');
  T('…as one commit (no history pile-up)', repo.parents && repo.parents.length === 0);
  T('…and nothing happens when it hasn\'t changed', (await Wk.vaultCourier(st, { fetch: F, now: t1 + 120e3 })) === 0);
  for (const [i, d] of [[2, '2026-11-16'], [3, '2026-11-17'], [4, '2026-11-18'], [5, '2026-11-19']].map(([i, d]) => [i, d])) { site.meta = { v: 2, ts: Date.parse(d + 'T20:00:00Z'), keys: 230 + i, bytes: 9e6 }; site.enc = 'v2g.D' + i + '.E'; await Wk.vaultCourier(st, { fetch: F, now: site.meta.ts + 60e3 }); }
  const meta = JSON.parse(repo.blobs[repo.files['vault.json']]);
  T('four days are kept, newest first, the oldest rotated out', meta.gens.length === 4 && meta.gens[0].day === '2026-11-19' && meta.gens[3].day === '2026-11-16' && Object.keys(repo.files).length === 5, meta.gens.map(g => g.day).join(','));
  T('…each day\'s own file', repo.blobs[repo.files['vault-1.enc']] === 'v2g.D4.E' && repo.blobs[repo.files['vault-3.enc']] === 'v2g.D2.E');
  site.meta = { v: 2, ts: Date.parse('2026-11-19T23:00:00Z'), keys: 240, bytes: 9e6 }; site.enc = 'v2g.SAME.DAY'; await Wk.vaultCourier(st, { fetch: F, now: site.meta.ts + 60e3 });
  const meta2 = JSON.parse(repo.blobs[repo.files['vault.json']]); T('a second save the same day replaces that day, the older days stay', meta2.gens.length === 4 && meta2.gens[0].day === '2026-11-19' && meta2.gens[1].day === '2026-11-18' && repo.blobs[repo.files['vault.enc']] === 'v2g.SAME.DAY');
  site.meta = { v: 2, ts: Date.parse('2026-11-20T20:00:00Z'), keys: 12, bytes: 1e5 }; site.enc = 'v2g.TINY.X';
  const r = await Wk.vaultCourier(st, { fetch: F, now: site.meta.ts + 60e3 }); const meta3 = JSON.parse(repo.blobs[repo.files['vault.json']]);
  T('a copy from a half-empty phone is held back — the good days stay', r === 1 && st.watch.vaultHold && meta3.gens[0].day === '2026-11-19' && repo.blobs[repo.files['vault.enc']] === 'v2g.SAME.DAY');
  site.enc = '<html>not a vault</html>'; site.meta = { v: 2, ts: Date.parse('2026-11-21T20:00:00Z'), keys: 250 };
  T('anything that isn\'t a sealed vault is refused', (await Wk.vaultCourier(st, { fetch: F, now: site.meta.ts + 60e3 })) === 0); }

/* ── 8 · a card sealed with the wrong key ── */
{ T('a decrypt failure is recognized as a key mismatch', Wk.keyBadErr(Object.assign(new Error('The operation failed for an operation-specific reason'), { name: 'OperationError' })) && !Wk.keyBadErr(new Error('read state HTTP 500')));
  const now = Date.now(); const st = { v: 1, posts: { [day]: { d: day, legs: [] } }, watch: { keyBad: now - 36e5 } };
  T('…and the owner is told how to fix it', Wk.watchPlan(st, now).some(a => a.k === 'key' && /AUTOPILOT_KEY/.test(a.text))); }

console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0);
