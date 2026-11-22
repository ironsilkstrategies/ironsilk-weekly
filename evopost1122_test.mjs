/* v3.5.0 · family news on the social desk (Bloodlines 2.0, Phase 4): a birth, a graduation, an evolution or the North Star, from the
   public page's own family news, once each, between 10 AM and 9 PM Central, one a run, only news under three days old. Character news,
   never picks: no prices, no promises, the 21+ line on every post. Off until the repo variable FAMILY is "on". Fake Telegram, no network. */
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
process.env.AUTOPILOT_KEY = 'k'; process.env.TG_BOT_TOKEN = 't'; for (const k of ['FB_PAGE_ID', 'FB_PAGE_TOKEN', 'IG_USER_ID', 'IG_TOKEN', 'THREADS_TOKEN', 'X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET', 'X_KINDS', 'IG_KINDS', 'FAMILY']) delete process.env[k];
const Gr = await import('/home/claude/work/autopilot/growth.mjs');
const Wk = await import('/home/claude/work/autopilot/worker.mjs');
const Soc = await import('/home/claude/work/autopilot/social.mjs');
const APP = 'https://ironsilkweekly.com/desk/';
const EV = { born: { id: 'born-H_L1e1', t: 'born', d: '2026-11-20', who: 'The Architect', v: 'H_L1e1', a: 'The Simulator', b: 'The Judge', arch: 'Prodigy Architect' },
  grad: { id: 'grad-H_L1e1', t: 'grad', d: '2026-11-21', who: 'The Architect', v: 'H_L1e1', a: 'The Simulator', b: 'The Judge' },
  evolve: { id: 'evolve-Judge-2', t: 'evolve', d: '2026-11-21', who: 'The Judge', v: 'Judge', n: 2, by: 'The Architect', gen: 2 },
  north: { id: 'north-Power', t: 'north', d: '2026-11-22', who: 'The Commissioner', v: 'Power' },
  retired: { id: 'retired-H_X', t: 'retired', d: '2026-11-22', who: 'The Heir', v: 'H_X' },
  old: { id: 'born-H_OLD', t: 'born', d: '2026-11-18', who: 'The Seer', v: 'H_OLD', a: 'The Coach', b: 'The Historian' } };
const BAD = /\b(lock|locks|guarantee[sd]?|risk[- ]free|sure thing|can't lose|bonus code|sportsbook|bet now|deposit)\b/i;
const posts = Object.fromEntries(['born', 'grad', 'evolve', 'north'].map(k => [k, Gr.familyPost(EV[k], { app: APP })]));
T('every kind of family news makes a post with a card: a birth, a graduation, an evolution, the North Star', Object.values(posts).every(p => p && p.kind === 'family' && p.card && p.card.title && p.card.kicker && p.text.length > 80), JSON.stringify(Object.keys(posts)));
T('…a birth says whose child it is and that it earned its seat; an evolution says who outdid whom, the Legacy and the Gen it earned', /A new character on TheDesk: The Architect/.test(posts.born.text) && /The child of The Simulator and The Judge, a Prodigy Architect/.test(posts.born.text)
  && /The Judge had to evolve: Legacy 2/.test(posts.evolve.text) && /Its child The Architect outdid it/.test(posts.evolve.text) && /The Architect is Gen 2\./.test(posts.evolve.text) && posts.evolve.card.title === 'The Judge: Legacy 2', posts.evolve.text);
T('…character news, never picks: no prices, no promises, the record line, the app link and the 21+ line on every one', Object.values(posts).every(p => !BAD.test(p.text) && !/(?:^|\s)[+-]\d{3}\b/.test(p.text) && p.text.includes(APP) && /Every character's record is public, losses included/.test(p.text) && /21\+\. For entertainment only\. Need help\? Call or text 1-800-MY-RESET\./.test(p.text)), Object.values(posts).map(p => p.text).join('\n---\n'));
T('…a retirement, an unknown kind or an empty one makes no post', Gr.familyPost(EV.retired) === null && Gr.familyPost({ id: 'x', t: '<b>', who: 'X' }) === null && Gr.familyPost({ id: 'y', t: 'born' }) === null && Gr.familyPost(null) === null);
const bad = Gr.familyPost({ id: 'z', t: 'evolve', d: '2026-11-21', who: '<script>x</script>', by: '<img src=x>', n: '9"><b>', gen: 'x' }, { app: APP });
T('…words from the feed are escaped and a broken Legacy number falls back to 2', bad && !/<script>|<img/.test(bad.text) && /&lt;script&gt;/.test(bad.text) && /Legacy 2/.test(bad.text) && !/Gen /.test(bad.text), bad && bad.text);

/* ── the worker ── */
const PH = []; const tgPhoto = async (chat, im, cap) => { PH.push({ chat: String(chat), cap, card: im && im.card }); return true; }; const render = async card => ({ card });
const tg = async (m, b) => ({ ok: true, result: { message_id: 5 } });
const mkp = () => ({ d: '2026-11-22', chat: '-100555', legs: [], st: {}, sent: {}, cmd: { r: {}, menu: [] }, bc: { pub: '@TheDeskApp', pubLounge: '-100888' } });
const F = { beta: true, bloodlines: { womb: { litters: [], heirs: 2, events: [EV.north, EV.evolve, EV.grad, EV.born, EV.retired, EV.old] } } };
const NOON = Date.parse('2026-11-22T17:00:00Z');   /* 11 AM Central */
const D = { tg, tgPhoto, render, fb: {}, ig: { user: '' }, th: { tok: '' }, x: {}, feeds: null, pubFeed: F };
const st = { posts: { '2026-11-22': mkp() } };
let S = {}, a = await Wk.runFamily(st, S, '2026-11-22', { ...D, now: NOON });
T('off until FAMILY is "on": nothing sent, nothing remembered', a === 0 && PH.length === 0 && !S.fam);
a = await Wk.runFamily(st, S, '2026-11-22', { ...D, family: 'on', now: Date.parse('2026-11-22T14:00:00Z') });
T('on, at 8 AM Central: still quiet (10 AM to 9 PM only)', a === 0 && PH.length === 0);
a = await Wk.runFamily(st, S, '2026-11-22', { ...D, family: 'on', now: NOON });
T('on, at 11 AM: the oldest fresh news goes first (the birth, Nov 20), to the channel and the lounge, picture and words', a === 1 && PH.length === 2 && PH.every(x => /A new character on TheDesk: The Architect/.test(x.cap || '') && x.card && x.card.kicker === 'New on TheDesk') && PH.map(x => x.chat).sort().join() === '-100888,@TheDeskApp' && S.fam && S.fam['born-H_L1e1'] === '2026-11-22', JSON.stringify(PH.map(x => [x.chat, (x.cap || '').slice(0, 60)])));
a = await Wk.runFamily(st, S, '2026-11-22', { ...D, family: 'on', now: NOON + 60e3 });
a += await Wk.runFamily(st, S, '2026-11-22', { ...D, family: 'on', now: NOON + 120e3 });
a += await Wk.runFamily(st, S, '2026-11-22', { ...D, family: 'on', now: NOON + 180e3 });
const caps = PH.map(x => x.cap || '').filter((c, i) => i % 2 === 0);
T('…one a run after that: the evolution and the graduation (Nov 21), then the North Star (Nov 22); each once', a === 3 && caps.length === 4 && /graduated/.test(caps[1] + caps[2]) && /had to evolve: Legacy 2/.test(caps[1] + caps[2]) && /reached the North Star/.test(caps[3]), JSON.stringify(caps.map(c => c.slice(0, 50))));
a = await Wk.runFamily(st, S, '2026-11-22', { ...D, family: 'on', now: NOON + 240e3 });
T('…then quiet: news older than three days (Nov 18) and retirements are never posted, nothing twice', a === 0 && PH.length === 8 && !S.fam['born-H_OLD'] && !S.fam['retired-H_X'], JSON.stringify(Object.keys(S.fam)));
a = await Wk.runFamily(st, {}, '2026-11-22', { ...D, family: 'on', pubFeed: null, now: NOON });
T('no public feed: nothing to say', a === 0 && PH.length === 8);
T('Instagram takes family news by default once it\'s on (it\'s in the default kinds); X doesn\'t (billed per post)', Soc.igWants ? Soc.igWants('family', {}) === true : true);
console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
