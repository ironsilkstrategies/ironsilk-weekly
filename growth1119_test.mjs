/* v3.3 · the growth desk (Nov 19, "Let's execute it all"): the debate (pick, words, poll, X kit, settle), Receipts Sunday,
   recruiting links (/mylink, /sourcelinks, /joins, join counting, the Sunday shout-out). Fake Telegram, no network. */
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
process.env.AUTOPILOT_KEY = 'k'; process.env.TG_BOT_TOKEN = 't'; for (const k of ['FB_PAGE_ID', 'FB_PAGE_TOKEN', 'IG_USER_ID', 'IG_TOKEN', 'THREADS_TOKEN', 'X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET', 'X_KINDS', 'IG_KINDS', 'DEBATE', 'WEEKLY']) delete process.env[k];
const Gr = await import('/home/claude/work/autopilot/growth.mjs');
const Wk = await import('/home/claude/work/autopilot/worker.mjs');
const Soc = await import('/home/claude/work/autopilot/social.mjs');

/* ── the board (the shape the public picks.json carries in the beta) ── */
const NOW = Date.parse('2026-11-19T16:30:00Z');   /* Thu Nov 19, 10:30 AM Central */
const call = (v, s, pick, rk, p, lab) => ({ v, s, pick, price: -110, p, o: 0, r: { lab, rk, of: 8, w: 100 + rk, l: 60 }, hit: null });
const board = { d: '2026-11-19', cast: { Sim: { name: 'The Simulator' }, Judge: { name: 'The Judge' }, Power: { name: 'The Commissioner' }, Scout: { name: 'The Scout' }, Dog: { name: 'The Underdog Spotter' } }, games: [
  { sp: 'nfl', game: 'BUF@MIA', start: '2026-11-19T22:00:00Z', st: 'pre', picks: [], calls: { spread: [call('Sim', 'away', 'BUF -3.5', 5, 0.55, 'NFL spread favorites'), call('Judge', 'away', 'BUF -3.5', 2, 0.53, 'NFL spread favorites'), call('Power', 'away', 'BUF -3.5', 6, 0.52, 'NFL spread favorites'), call('Scout', 'home', 'MIA +3.5', 3, 0.51, 'NFL spread dogs'), call('Dog', 'home', 'MIA +3.5', 1, 0.56, 'NFL spread dogs')] } },
  { sp: 'ncaaf', game: 'LSU@TENN', start: '2026-11-19T20:00:00Z', st: 'pre', picks: [], calls: { ml: [call('Sim', 'home', 'TENN ML', 4, 0.6, 'CFB ML favorites'), call('Judge', 'home', 'TENN ML', 3, 0.6, 'CFB ML favorites'), call('Power', 'home', 'TENN ML', 7, 0.6, 'CFB ML favorites'), call('Scout', 'home', 'TENN ML', 5, 0.6, 'CFB ML favorites'), call('Dog', 'away', 'LSU ML', 2, 0.45, 'CFB ML dogs')] } },
  { sp: 'nba', game: 'LAL@ATL', start: '2026-11-20T00:30:00Z', st: 'pre', picks: [], calls: { ml: [call('Sim', 'home', 'ATL ML', 1, 0.6, 'NBA ML'), call('Judge', 'home', 'ATL ML', 2, 0.6, 'NBA ML'), call('Power', 'home', 'ATL ML', 3, 0.6, 'NBA ML')] } },
  { sp: 'nfl', game: 'KC@LV', start: '2026-11-19T17:00:00Z', st: 'pre', picks: [], calls: { ml: [call('Sim', 'away', 'KC ML', 1, 0.7, 'x'), call('Judge', 'home', 'LV ML', 1, 0.4, 'x'), call('Dog', 'home', 'LV ML', 1, 0.4, 'x')] } },
  { sp: 'nfl', game: 'DAL@NYG', start: '2026-11-19T23:00:00Z', st: 'in', picks: [], calls: { ml: [call('Sim', 'away', 'DAL ML', 1, 0.7, 'x'), call('Judge', 'home', 'NYG ML', 1, 0.4, 'x'), call('Dog', 'home', 'NYG ML', 1, 0.4, 'x')] } }] };
const C = Gr.debates(board, NOW);
T('the debate: only splits, only games 90 minutes to 14 hours out, never one already on (the unanimous NBA game, KC@LV in 30 min and the live game are out)', C.length === 2 && C.every(c => !['LAL@ATL', 'KC@LV', 'DAL@NYG'].includes(c.game)), C.map(c => c.k).join(' '));
T('…the NFL 3-2 split beats a lopsided 4-1 college game', C[0].k === 'nfl|BUF@MIA|spread' && C[0].A.length === 3 && C[0].B.length === 2, C[0] && C[0].k);
T('…each side argued by its best-ranked caller (the Judge #2, the Underdog Spotter #1)', C[0].la.v === 'Judge' && C[0].lb.v === 'Dog', C[0].la.v + ' / ' + C[0].lb.v);
const P = Gr.debatePost(C[0], { cast: board.cast, day: 'Thu, Nov 19' });
T('the debate post names both sides, their picks, their lane and the split', /THE DESK DEBATE/.test(P.text) && /The Judge<\/b> takes <b>BUF -3\.5/.test(P.text) && /The Underdog Spotter<\/b> takes <b>MIA \+3\.5/.test(P.text) && /#2 of 8 on NFL spread favorites/.test(P.text) && /splits <b>3-2<\/b>/.test(P.text), P.text);
T('…with full team names (Buffalo Bills at Miami Dolphins) and the Central start time', /Buffalo Bills at Miami Dolphins/.test(P.text) && /4:00 PM CT/.test(P.text));
T('…a two-way poll', P.poll.options.length === 2 && P.poll.options[0] === 'The Judge: BUF -3.5' && P.poll.options[1] === 'The Underdog Spotter: MIA +3.5' && P.poll.question.length <= 290, JSON.stringify(P.poll));
T('…a card with the split as its big number', P.card.big.value === '3-2' && P.card.rows.length === 2 && P.card.title === 'Bills at Dolphins', JSON.stringify(P.card));
T('…and an X caption that fits 280 characters and ends with the tagged app link', P.x.length <= 280 && P.x.endsWith('https://ironsilkweekly.com/desk/?src=x') && /The Judge: BUF -3.5/.test(P.x), P.x.length + ' ' + P.x);
{ const long = { ...C[0], la: { ...C[0].la, v: 'X'.repeat(90) }, lb: { ...C[0].lb, v: 'Y'.repeat(90) } }; const P2 = Gr.debatePost(long, { cast: {} });
  T('…even with absurdly long names, the X caption still fits and keeps its link', P2.x.length <= 280 && P2.x.endsWith('?src=x'), P2.x.length); }
/* settle */
const S0 = { k: 'nfl|BUF@MIA|spread', d: '2026-11-19', wa: 'The Judge', wb: 'The Underdog Spotter', pa: 'BUF -3.5', pb: 'MIA +3.5', matchup: 'Bills at Dolphins', fullM: 'Buffalo Bills at Miami Dolphins' };
T('settle: one side right → "<name> called it"', Gr.settlePost(S0, 'W', 'L', { fin: 'BUF 27–20 MIA' }).card.title === 'The Judge called it' && /Final: BUF 27–20 MIA/.test(Gr.settlePost(S0, 'W', 'L', { fin: 'BUF 27–20 MIA' }).text));
T('settle: both wrong, both right, both push', Gr.settlePost(S0, 'L', 'L').card.title === 'Both missed' && Gr.settlePost(S0, 'W', 'W').card.title === 'Both called it' && Gr.settlePost(S0, 'P', 'P').card.title === 'A push');

/* ── Receipts Sunday ── */
const hist = [{ d: '2026-11-21', picks: [{ pick: 'BUF -3.5', game: 'BUF@MIA', price: -110, hit: true }, { pick: 'LV ML', game: 'KC@LV', price: 180, hit: true }] },
  { d: '2026-11-18', picks: [{ pick: 'CAR ML', game: 'CAR@CGY', price: -250, hit: false }, { pick: 'Over 47.5', game: 'DET@MIN', price: -105, hit: false }, { pick: 'NYR ML', game: 'NYR@PIT', price: -150, push: true }] },
  { d: '2026-11-14', picks: [{ pick: 'OLD ML', game: 'A@B', price: 500, hit: true }] }, { d: '2026-11-15', picks: [{ pick: 'SUN ML', game: 'C@D', price: -120, hit: true }] }];
const F = { history: hist, record: { w: 46, l: 35, pu: 0, first: '2026-10-06' } };
T('Receipts Sunday: nothing on a Saturday', Gr.weeklyPost(F, '2026-11-21') === null);
const Wp = Gr.weeklyPost(F, '2026-11-22');
const expU = (100 / 110) + 1.8 + (100 / 120) - 1 - 1;
T('…on Sunday: the seven days that ended Saturday (Nov 15–21), not the week before', Wp && Wp.w === 3 && Wp.l === 2 && Wp.pu === 1 && /Nov 15–Nov 21/.test(Wp.text), Wp && Wp.text);
T('…units at the posted prices, one unit a pick', Wp && Math.abs(Wp.u - expU) < 1e-9 && Wp.text.includes((expU >= 0 ? '+' : '') + expU.toFixed(2) + 'u'), Wp && Wp.u);
T('…best call = the longest-priced winner (LV +180), worst = the shortest-priced loser (CAR -250)', /Best call: <b>LV ML \(\+180\)/.test(Wp.text) && /Worst call: <b>CAR ML \(-250\)/.test(Wp.text), Wp.text);
T('…the season line and the receipts promise', /Season: <b>46-35<\/b> since Oct 6/.test(Wp.text) && /losses included/.test(Wp.text));
T('…and fewer than two graded picks: no post', Gr.weeklyPost({ history: [{ d: '2026-11-20', picks: [{ pick: 'A ML', price: -110, hit: true }] }] }, '2026-11-22') === null);

/* ── recruiting: pure parts ── */
const st0 = {};
T('a join through a member\'s link counts for that member', Gr.countJoin(st0, 'ref 111111', 222, NOW, '2026-11-19') === 'ref' && st0.refs.by['111111'].n === 1 && st0.refs.by['111111'].wk['2026-11-15'] === 1);
T('…the same person joining again doesn\'t count twice', Gr.countJoin(st0, 'ref 111111', 222, NOW + 1, '2026-11-19') === false && st0.refs.by['111111'].n === 1);
T('…nobody recruits themselves', Gr.countJoin(st0, 'ref 333333', 333333, NOW, '2026-11-19') === false && !st0.refs.by['333333']);
T('…a platform link counts for the platform', Gr.countJoin(st0, 'src tt', 444, NOW, '2026-11-19') === 'src' && st0.refs.src.tt.n === 1 && Gr.countJoin(st0, 'src tt', 444, NOW, '2026-11-19') === false);
T('…other links (VIP seats, the owner\'s) count for nobody', Gr.countJoin(st0, 'VIP 2026-11-19', 555, NOW, '2026-11-19') === false);
{ const a = { by: { '1': { n: 3, ts: 10 } }, seen: { '9': { r: '1', ts: 10 } }, src: {}, links: {}, srcLinks: {} }, b = { by: { '1': { n: 2, ts: 5 }, '2': { n: 1, ts: 7 } }, seen: { '8': { r: '2', ts: 7 } }, src: { x: { n: 4, ts: 3 } }, links: {}, srcLinks: {}, shout: '2026-11-08' };
  const M = Gr.mergeRefs(a, b); T('two copies merge: the newer record per key, every key kept', M.by['1'].n === 3 && M.by['2'].n === 1 && M.seen['9'] && M.seen['8'] && M.src.x.n === 4 && M.shout === '2026-11-08');
  const S2 = Wk.mergeState({ posts: {}, refs: a }, { posts: {}, refs: b }); T('…and the worker\'s state merge keeps them', S2.refs && S2.refs.by['2'] && S2.refs.by['1'].n === 3); }

/* ── recruiting: the bot ── */
const sent = []; let upd = []; const tg = async (m, b) => { sent.push({ m, ...b });
  if (m === 'getUpdates') { const r = upd; upd = []; return { ok: true, result: r }; }
  if (m === 'getChatAdministrators') return { ok: true, result: [{ status: 'creator', user: { id: 4242, is_bot: false } }] };
  if (m === 'getChatMember') return { ok: true, result: { status: 'member' } };
  if (m === 'createChatInviteLink') return { ok: true, result: { invite_link: 'https://t.me/+L' + sent.filter(x => x.m === 'createChatInviteLink').length, name: b.name } };
  if (m === 'getMe') return { ok: true, result: { username: 'TheDeskBot' } };
  return { ok: true, result: { message_id: 1 } }; };
const mkp = () => ({ d: '2026-11-19', chat: '-100555', legs: [], st: {}, sent: {}, cmd: { r: {}, menu: [{ command: 'help', description: 'Help' }] }, bc: { pub: '@TheDeskApp', pubLounge: '-100888' } });
const state = { posts: { '2026-11-19': mkp() } }; let id = 100; const msg = (from, text, chat) => ({ update_id: ++id, message: { message_id: id, date: Math.floor(NOW / 1000), chat: chat || { id: from.id, type: 'private' }, from, text } });
const fan = { id: 777001, is_bot: false, first_name: 'Hoops', last_name: 'Fan' }, owner = { id: 4242, is_bot: false, first_name: 'Chris' };
upd = [msg(fan, '/mylink')]; await Wk.runCommands(state, { tg, now: NOW });
const c1 = sent.filter(x => x.m === 'createChatInviteLink'); const r1 = sent.filter(x => x.m === 'sendMessage' && String(x.chat_id) === '777001').pop();
T('/mylink (DM): makes a personal link named after the member, on the public lounge', c1.length === 1 && c1[0].name === 'ref 777001' && c1[0].chat_id === '-100888', JSON.stringify(c1));
T('…and sends it back with how it counts', r1 && /Your personal TheDesk link/.test(r1.text) && r1.text.includes('https://t.me/+L1'), r1 && r1.text);
upd = [msg(fan, '/mylink')]; await Wk.runCommands(state, { tg, now: NOW + 60e3 });
T('…asking again hands back the same link (no new one)', sent.filter(x => x.m === 'createChatInviteLink').length === 1);
upd = [msg(fan, '/mylink', { id: -100888, type: 'supergroup' })]; await Wk.runCommands(state, { tg, now: NOW + 120e3 });
const g1 = sent.filter(x => x.m === 'sendMessage' && String(x.chat_id) === '-100888').pop();
T('…in the group, it says to DM the bot (links stay private)', g1 && /DM me \/mylink/.test(g1.text) && sent.filter(x => x.m === 'createChatInviteLink').length === 1, g1 && g1.text);
upd = [msg(owner, '/sourcelinks')]; await Wk.runCommands(state, { tg, now: NOW + 180e3 });
const c2 = sent.filter(x => x.m === 'createChatInviteLink').slice(1);
T('/sourcelinks (owner, DM): one named link per platform', c2.length === 7 && ['x', 'ig', 'fb', 'th', 'tt', 'yt', 'rd'].every(t => c2.some(c => c.name === 'src ' + t)), c2.map(c => c.name).join(','));
upd = [msg(fan, '/sourcelinks')]; const nBefore = sent.filter(x => x.m === 'createChatInviteLink').length; await Wk.runCommands(state, { tg, now: NOW + 240e3 });
T('…a member can\'t make them', sent.filter(x => x.m === 'createChatInviteLink').length === nBefore);
/* joins through the links */
const join = (uid, link, chat) => ({ update_id: ++id, chat_member: { chat: { id: chat || -100888, type: 'supergroup' }, from: { id: uid }, date: Math.floor(NOW / 1000), old_chat_member: { status: 'left', user: { id: uid } }, new_chat_member: { status: 'member', user: { id: uid, is_bot: false, first_name: 'New' } }, invite_link: link ? { invite_link: 'https://t.me/+x', name: link } : undefined } });
upd = [join(900001, 'ref 777001'), join(900002, 'ref 777001'), join(900001, 'ref 777001'), join(900003, 'src tt'), join(900004, null)]; await Wk.runCommands(state, { tg, now: NOW + 300e3 });
T('joins through a member\'s link count for that member, once per person', state.refs.by['777001'].n === 2, JSON.stringify(state.refs.by));
T('…a TikTok-link join counts for TikTok; a join with no link counts for nobody', state.refs.src.tt.n === 1 && Object.keys(state.refs.seen).length === 3);
upd = [msg(owner, '/joins')]; await Wk.runCommands(state, { tg, now: NOW + 360e3 });
const j1 = sent.filter(x => x.m === 'sendMessage' && String(x.chat_id) === '4242').pop();
T('/joins (owner): joins by platform and the top recruiters', j1 && /TikTok 1/.test(j1.text) && /Hoops Fan · 2/.test(j1.text), j1 && j1.text);
/* after the lock: the VIP door shows out a join that didn't come through a VIP invite, and it never counts */
state.lounge = { locked: NOW - 864e5, chat: '-100888', founders: 100 };
upd = [join(900005, 'ref 777001')]; await Wk.runCommands(state, { tg, now: NOW + 420e3 });
T('after the lock, a member\'s link can\'t get anyone into the VIP lounge, and the show-out never counts', state.refs.by['777001'].n === 2 && sent.some(x => x.m === 'banChatMember' && x.user_id === '900005'));
delete state.lounge;
/* the Sunday shout-out */
const SUN = Date.parse('2026-11-22T17:30:00Z');   /* Sun Nov 22, 11:30 AM Central */
let a = await Wk.runRecruitShout(state, { tg, now: SUN }); const sh = sent.filter(x => x.m === 'sendMessage' && /Recruiters of the week/.test(x.text || ''));
T('Sunday 11:30 AM: the lounge hears last week\'s top recruiters', a === 1 && sh.length === 1 && String(sh[0].chat_id) === '-100888' && /Hoops Fan<\/b> · 2 joined/.test(sh[0].text), sh[0] && sh[0].text);
a = await Wk.runRecruitShout(state, { tg, now: SUN + 36e5 }); T('…once', a === 0 && sent.filter(x => /Recruiters of the week/.test(x.text || '')).length === 1);
T('…never on another day', await Wk.runRecruitShout({ refs: { by: { '1': { n: 1, wk: { '2026-11-15': 1 }, ts: 1 } } }, posts: state.posts }, { tg, now: Date.parse('2026-11-21T18:00:00Z') }) === 0);

/* ── the debate in the worker ── */
const PH = []; const tgPhoto = async (chat, im, cap) => { PH.push({ chat: String(chat), cap, card: im && im.card }); return true; }; const render = async card => ({ card });
const SV = []; const tg2 = async (m, b) => { SV.push({ m, ...b }); if (m === 'getChatAdministrators') return { ok: true, result: [{ status: 'creator', user: { id: 4242, is_bot: false } }] }; return { ok: true, result: { message_id: 5 } }; };
const D = { tg: tg2, tgPhoto, render, fb: {}, ig: { user: '' }, th: { tok: '' }, x: {}, feeds: null, pubFeed: { beta: true, board } };
const st2 = { posts: { '2026-11-19': mkp() } }, S = {};
a = await Wk.runDebate(st2, S, '2026-11-19', { ...D, now: Date.parse('2026-11-19T15:30:00Z') });
T('the debate waits for 10 AM Central', a === 0 && !PH.length);
a = await Wk.runDebate(st2, S, '2026-11-19', { ...D, now: NOW });
const dp = PH.filter(x => /THE DESK DEBATE/.test(x.cap || '') && x.chat !== '4242'); const polls = SV.filter(x => x.m === 'sendPoll');
T('10:30 AM: the debate card goes to the free channel and the lounge, each with a poll', a >= 1 && dp.length === 2 && dp.map(x => x.chat).sort().join(',') === '-100888,@TheDeskApp' && polls.length === 2 && JSON.parse(polls[0].options).length === 2, JSON.stringify(dp.map(x => x.chat)));
const kit = PH.filter(x => x.chat === '4242');
T('…and the owner gets the card plus a ready-to-post X caption', kit.length === 1 && /For X/.test(kit[0].cap) && /\?src=x/.test(kit[0].cap) && kit[0].card && kit[0].card.title === 'Bills at Dolphins', kit[0] && kit[0].cap);
T('…remembered for the day (it settles later)', S.deb && S.deb.d === '2026-11-19' && S.deb.pa === 'BUF -3.5' && S.deb.pb === 'MIA +3.5');
a = await Wk.runDebate(st2, S, '2026-11-19', { ...D, now: NOW + 36e5 }); T('…once a day', a === 0 && PH.filter(x => /THE DESK DEBATE/.test(x.cap || '') && x.chat !== '4242').length === 2);
const G = async (x) => { x.__fin = 'BUF 27–20 MIA'; return x.pick === 'BUF -3.5' ? 'W' : 'L'; };
a = await Wk.runDebate(st2, S, '2026-11-19', { ...D, gradePick: G, now: Date.parse(board.games[0].start) + 60 * 60e3 });
T('the settle waits until the game could be over (2½ hours after the start)', a === 0 && !S.deb.done);
a = await Wk.runDebate(st2, S, '2026-11-19', { ...D, gradePick: G, now: Date.parse(board.games[0].start) + 3 * 36e5 });
const sp = PH.filter(x => /DEBATE SETTLED/.test(x.cap || ''));
T('…then both sides are graded and the result posts: "The Judge called it", with the final', a === 1 && sp.length === 2 && /Final: BUF 27–20 MIA/.test(sp[0].cap) && sp[0].card.title === 'The Judge called it' && S.deb.done === 'WL', sp[0] && sp[0].cap);
a = await Wk.runDebate(st2, S, '2026-11-19', { ...D, gradePick: G, now: Date.parse(board.games[0].start) + 4 * 36e5 }); T('…once', a === 0 && PH.filter(x => /DEBATE SETTLED/.test(x.cap || '')).length === 2);
{ const S3 = {}; const n0 = PH.length; await Wk.runDebate({ posts: { '2026-11-19': mkp() } }, S3, '2026-11-19', { ...D, pubFeed: { beta: false, board }, now: NOW });
  T('outside the open beta (the board isn\'t public), no debate', PH.length === n0 && !S3.deb); }
{ const S4 = {}; const n0 = PH.length; await Wk.runDebate({ posts: { '2026-11-19': mkp() } }, S4, '2026-11-19', { ...D, pubFeed: { beta: true, board: { ...board, d: '2026-11-18' } }, now: NOW });
  T('…nor from yesterday\'s board', PH.length === n0 && !S4.deb); }
{ const S5 = {}; const n0 = PH.length; await Wk.runDebate({ posts: { '2026-11-19': mkp() } }, S5, '2026-11-19', { ...D, debate: 'off', now: NOW }); T('DEBATE=off: silent', PH.length === n0 && !S5.deb); }

/* ── Receipts Sunday in the worker ── */
{ const S6 = {}; const st6 = { posts: { '2026-11-22': { ...mkp(), d: '2026-11-22' } } }; const n0 = PH.length;
  a = await Wk.runWeekly(st6, S6, '2026-11-21', { ...D, pubFeed: F, now: Date.parse('2026-11-21T16:00:00Z') }); T('Receipts Sunday: not on Saturday', a === 0 && PH.length === n0);
  a = await Wk.runWeekly(st6, S6, '2026-11-22', { ...D, pubFeed: F, now: Date.parse('2026-11-22T14:00:00Z') }); T('…not before 9 AM Sunday', a === 0 && PH.length === n0);
  a = await Wk.runWeekly(st6, S6, '2026-11-22', { ...D, pubFeed: F, now: Date.parse('2026-11-22T15:30:00Z') }); const wp = PH.slice(n0).filter(x => /RECEIPTS SUNDAY/.test(x.cap || ''));
  T('…9:30 AM Sunday: the week\'s card to the channel and the lounge', a === 1 && wp.length === 2 && wp[0].card.title === 'The week: 3-2-1', wp[0] && wp[0].card && wp[0].card.title);
  a = await Wk.runWeekly(st6, S6, '2026-11-22', { ...D, pubFeed: F, now: Date.parse('2026-11-22T18:00:00Z') }); T('…once', a === 0 && PH.filter(x => /RECEIPTS SUNDAY/.test(x.cap || '')).length === 2); }

/* the outlets: Instagram takes the debate and Sunday cards by default; X takes Receipts Sunday, not the daily debate (X bills per post) */
T('Instagram takes the debate and Receipts Sunday by default', Soc.igWants('debate', { ig: { kinds: '' } }) && Soc.igWants('weekly', { ig: { kinds: '' } }));
T('X takes Receipts Sunday by default, not the daily debate', Soc.xWants('weekly', { x: { kinds: '' } }) && !Soc.xWants('debate', { x: { kinds: '' } }));
{ const site = { posts: {}, cmdSig: 'v2|help,live' }, here = { posts: {}, cmdSig: 'v3|help,live,mylink', cmdSigTs: 5 };
  T('the / menu: the newer signature wins the merge, whichever copy comes first (a stale site copy can\'t make the menu re-send every pass)', Wk.combineStates(site, here, null).cmdSig === 'v3|help,live,mylink' && Wk.combineStates(here, site, null).cmdSig === 'v3|help,live,mylink' && Wk.mergeState({ posts: {}, cmdSig: 'a', cmdSigTs: 10 }, { posts: {}, cmdSig: 'b', cmdSigTs: 20 }).cmdSig === 'b'); }
T('the lounge rules carry the national helpline (1-800-MY-RESET)', Wk.RULES_DEFAULT.some(r => /1-800-MY-RESET/.test(r)) && !Wk.RULES_DEFAULT.some(r => /GAMBLER/.test(r)));
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
