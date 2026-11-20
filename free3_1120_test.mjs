/* v3.3.2 · THE FREE 3 (Nov 20, Chris: "I need templates built daily like this… we do the free 3 so make sure if there 3 that's it's
   reflected"). The day's free picks as one promo post: all three when there are three, two or one when that's all the board gives,
   each with a stat-backed reason out of its lead character's read (never the risk paragraph or the price math), the agreement count,
   tier, matchup and time; the last graded card and the record; 21+ and 1-800-MY-RESET; no sportsbook links, no "lock". A pick that
   hasn't unlocked is drawn locked. The worker posts it once a day, only with FREE3=on. Fake Telegram, no network. */
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
process.env.AUTOPILOT_KEY = 'k'; process.env.TG_BOT_TOKEN = 't'; for (const k of ['FB_PAGE_ID', 'FB_PAGE_TOKEN', 'IG_USER_ID', 'IG_TOKEN', 'THREADS_TOKEN', 'X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET', 'FREE3']) delete process.env[k];
const F3 = await import('/home/claude/work/autopilot/free3.mjs');
const Wk = await import('/home/claude/work/autopilot/worker.mjs');
const Soc = await import('/home/claude/work/autopilot/social.mjs');
const team = (abbr, name, short, loc, color, alt) => ({ abbr, name, short, loc, color, alt });
const teams = { nba: { PHX: team('PHX', 'Phoenix Suns', 'Suns', 'Phoenix', '#29127a', '#e56020'), UTAH: team('UTAH', 'Utah Jazz', 'Jazz', 'Utah', '#4b2a85', '#c9b6f2'), DAL: team('DAL', 'Dallas Mavericks', 'Mavericks', 'Dallas', '#0064b1', '#bbc4ca'), MIN: team('MIN', 'Minnesota Timberwolves', 'Timberwolves', 'Minnesota', '#266092', '#79bc43') },
  ncaab: { LEM: team('LEM', 'Le Moyne Dolphins', 'Dolphins', 'Le Moyne', '#00664f', '#f2a900'), MIZ: team('MIZ', 'Missouri Tigers', 'Tigers', 'Missouri', '#f1b82d', '#000000') },
  nhl: { MIN: team('MIN', 'Minnesota Wild', 'Wild', 'Minnesota', '#154734', '#a6192e'), TOR: team('TOR', 'Toronto Maple Leafs', 'Maple Leafs', 'Toronto', '#00205b', '#ffffff') } };
/* the shape public/picks.json carries (the open beta: every pick open at the lock) */
const READ_UNDER = { who: 'The Coach', take: "Listen. The game script says under. I'm riding it.", text: "Ty Francis averages 6.8 points a game, and 11 over his recent games — he's hot. Listen. The game script says under. I'm riding it. Bodies get tired. That's football, that's hockey, that's life. CBB unders is a lane I know: 41-21. Break-even at -110 is 52%. My number: 57%. The price pays more than the risk. The worry: A late foul-fest can swing a total like this — nothing here is a lock." };
const READ_UTAH = { who: 'The Coach', take: "Listen. Give me Utah. I like how they're set up for this one.", text: "Listen. Give me Utah. I like how they're set up for this one. Utah has won fewer than its scoring has earned — a spot we're still testing (31 graded games). Keep an eye on Keyonte George: 21 points a game. Strip the names off and it's a 3.2-point hole for Utah, against a line of +4.5. I'm 29-22 on NBA underdogs against the spread. Where it goes wrong: Miles Bridges is hot for Phoenix — 8.7 rebounds a game lately. He can beat this on his own. The book is pricing this like it happens 52% of the time. I say 57%. Translation: the price pays more than the risk." };
const READ_MIN = { who: 'The Judge', take: 'Minnesota, and it is not close.', text: 'Minnesota has won 7 of its last 8 at home by 9 a game. The Judge has weighed every witness. Where it goes wrong: a cold night from three can beat anyone.' };
const pick = (sp, game, pk, price, p, tier, start, read) => ({ sp, game, gl: game, pick: pk, price, p, ev: 9, start, tier, hit: null, push: false, why: read ? { read } : undefined });
const P3 = [pick('ncaab', 'LEM@MIZ', 'Under 155.5', -110, 0.573, 'STRONG', '2026-11-21T01:00Z', READ_UNDER), pick('nba', 'PHX@UTAH', 'UTAH +4.5', -110, 0.572, 'STRONG', '2026-11-21T02:30Z', READ_UTAH),
  pick('nba', 'DAL@MIN', 'MIN -6', -105, 0.57, 'SUPREME', '2026-11-21T01:00Z', READ_MIN)];
const board = { d: '2026-11-20', games: [{ sp: 'ncaab', game: 'LEM@MIZ', picks: [{ pick: 'Under 155.5', by: ['Sim', 'Judge', 'Most common', 'Coach'] }] }, { sp: 'nba', game: 'PHX@UTAH', picks: [{ pick: 'UTAH +4.5', by: ['Sim', 'Judge', 'Most common', 'Covers', 'Coach'] }] }] };
const history = [{ d: '2026-11-18', picks: [{ hit: false, push: false }, { hit: true, push: false }] }, { d: '2026-11-17', picks: [{ hit: true }, { hit: true }] }];
const feed = picks => ({ beta: true, record: { w: 47, l: 35, pu: 0, first: '2026-10-06' }, today: { d: '2026-11-20', lockedAt: 1, picks }, history, board });
const NOW = Date.parse('2026-11-20T18:00:00Z');   /* Fri Nov 20, noon Central */
const deps = { teams, now: NOW };

/* ── three picks ── */
let D = await F3.free3Of(feed(P3), deps);
T('three free picks on the board → three on the post, in order', D.n === 3 && D.open === 3 && D.picks.map(x => x.pick).join('|') === 'Under 155.5|UTAH +4.5|MIN -6', D && D.picks.map(x => x.pick));
T('a reason is a stat line about THIS pick: Utah gets "the 3.2-point hole… +4.5", never the risk paragraph or the price math', D.picks[1].reason === "Strip the names off and it's a 3.2-point hole for Utah, against a line of +4.5.", D.picks[1].reason);
T('a total with no stat line about the total uses the take, with the character\'s own record (hot-player aside skipped)', D.picks[0].reason === 'The game script says under, and the Coach is 41-21 on college hoops unders.' && D.picks[0].recInReason === true, D.picks[0].reason);
T('a character\'s record comes out of its first-person line ("I\'m 29-22 on NBA underdogs against the spread")', D.picks[1].rec && D.picks[1].rec.rec === '29-22' && D.picks[1].rec.lane === 'NBA dogs ATS', JSON.stringify(D.picks[1].rec));
T('the agreement count comes from the board (4 and 5 of 9), none when the board doesn\'t carry the pick', D.picks[0].on === 4 && D.picks[1].on === 5 && D.picks[2].on == null);
T('the last graded card (1–1) and the record (47–35)', D.last && D.last.w === 1 && D.last.l === 1 && D.record.w === 47 && D.record.l === 35);
let cap = F3.free3Caption(D, { app: 'https://ironsilkweekly.com/desk/' });
const plain = Soc.plain(cap);
T('the words: THE FREE 3 · the day · "today\'s three free picks"', /THE FREE 3 · Fri, Nov 20/.test(plain) && /today's three free picks/.test(plain), plain.split('\n')[0]);
T('…each pick with its price, matchup in names and Central time', /UTAH \+4\.5 \(−110\) \(Suns @ Jazz, 8:30 PM CT\)/.test(plain) && /UNDER 155\.5 \(−110\) \(Le Moyne @ Missouri, 7:00 PM CT\)/.test(plain) && /MIN −6 \(−105\)/.test(plain), plain);
T('…the agreement count and our number vs the price', /5 of our 9 characters are on it\. Our number: 57%\. The price says 52%\./.test(plain));
T('…last card, record, follow line, the app, 21+ with 1-800-MY-RESET, receipts', /Last card: 1–1, graded\. Record: 47 wins, 35 losses\./.test(plain) && /FOLLOW TheDesk — the Free 3, every day\./.test(plain) && /ironsilkweekly\.com\/desk/.test(plain) && /21\+\. For entertainment only\. Need help\? Call or text 1-800-MY-RESET\. Receipts tomorrow — win or lose\./.test(plain));
T('house rules: no "lock", no guarantee, no sportsbook / DFS links or promo codes, no Patreon', !/\block\b|guarantee|risk-free|prizepicks|dabble|draftkings|fanduel|underdog fantasy|promo code|patreon/i.test(plain), plain.match(/\block\b|guarantee|prizepicks|dabble|patreon/i));
let tree = JSON.stringify(F3.free3Tree(D));
T('the picture says "3 FREE PICKS" and "Graded in public"', tree.includes('"3 FREE PICKS"') && tree.includes('Graded in public. Receipts tomorrow'));
T('…every pick drawn: names, pills, team tiles (no photos, no logos — no image elements at all)', ['UTAH JAZZ', 'LE MOYNE @ MISSOURI', 'MINNESOTA TIMBERWOLVES', 'UTAH +4.5 (−110)', 'UNDER 155.5 (−110)', 'MIN −6 (−105)'].every(s => tree.includes(s)) && !/"type":"img"/.test(tree), tree.slice(0, 200));
T('…the gold line drops a record already told in the reason, keeps the count and our number', tree.includes('4 OF 9 ON IT · OUR NUMBER 57%') && tree.includes('COACH 29-22 ON NBA DOGS ATS'));
T('…tier · matchup · time in the green line; footer with the record and 1-800-MY-RESET', tree.includes('STRONG · PHX @ UTAH · 8:30 PM CT') && tree.includes('LAST CARD 1–1 · RECORD 47–35') && tree.includes('1-800-MY-RESET'));

/* ── two picks: the post says so, never forces a third ── */
D = await F3.free3Of(feed(P3.slice(0, 2)), deps); cap = Soc.plain(F3.free3Caption(D, {})); tree = JSON.stringify(F3.free3Tree(D));
T('two picks: "2 FREE PICKS" and "we don\'t force a third", in the picture and the words', D.n === 2 && tree.includes('"2 FREE PICKS"') && /We don't force a third/.test(tree) && /two free picks today/.test(cap) && /Only two cleared the bar today\. We don't force a third\./.test(cap));
D = await F3.free3Of(feed(P3.slice(1, 2)), deps); tree = JSON.stringify(F3.free3Tree(D));
T('one pick: "1 FREE PICK"', D.n === 1 && tree.includes('"1 FREE PICK"'));
T('no card today: nothing to post', (await F3.free3Of({ today: { d: '2026-11-20', picks: [] } }, deps)) === null && (await F3.free3Of({}, deps)) === null);

/* ── outside the open beta: a pick that hasn't unlocked is drawn locked, never shown early ── */
const hid = feed([P3[0], { hidden: true, sp: 'nba', start: '2026-11-21T02:30Z', unlockAt: Date.parse('2026-11-21T02:00Z') }, P3[2]]); hid.beta = false;
D = await F3.free3Of(hid, deps); cap = Soc.plain(F3.free3Caption(D, {})); tree = JSON.stringify(F3.free3Tree(D));
T('a locked pick: "unlocks 8:00 PM CT", its pick nowhere in the words or the picture', D.picks[1].hidden && /🔒 Free pick — unlocks 8:00 PM CT, 30 minutes before its game\./.test(cap) && !/UTAH/.test(cap) && !/UTAH/.test(tree) && tree.includes('LOCKED') && tree.includes('FREE PICK #2'), cap);

/* ── the picture renders (1080 × 1350) ── */
D = await F3.free3Of(feed(P3), deps); const img = await F3.renderFree3(D);
const dims = b => b && b.length > 24 ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
T('the picture renders: a 1080×1350 PNG and a JPEG', img && img.png && img.jpg && JSON.stringify(dims(img.png)) === '[1080,1350]' && img.jpg[0] === 0xff && img.jpg[1] === 0xd8, img && JSON.stringify(dims(img.png)));

/* ── reason picking on its own ── */
T('the risk paragraph and price math are never the reason', !/goes wrong|Break-even|My number|pricing this|lock/i.test(F3.reasonOf({ pick: 'MIN -6', why: { read: READ_MIN } }, [teams.nba.MIN]).text) && F3.reasonOf({ pick: 'MIN -6', why: { read: READ_MIN } }, [teams.nba.MIN]).text === 'Minnesota has won 7 of its last 8 at home by 9 a game.');
T('no read at all: no reason (the block still draws)', F3.reasonOf({ pick: 'UTAH +4.5' }, []).text === '');

/* ── the worker: once a day, only when FREE3 is on ── */
const PH = []; const tgPhoto = async (chat, im, c) => { PH.push({ chat: String(chat), cap: c, img: !!im }); return true; };
const SV = []; const tg = async (m, b) => { SV.push({ m, ...b }); return { ok: true, result: { message_id: 5 } }; };
const W = { tg, tgPhoto, renderFree3: async () => ({ png: Buffer.from('x'), jpg: Buffer.from('y') }), fb: {}, ig: { user: '' }, th: { tok: '' }, x: {}, teams, pubFeed: feed(P3) };
const st = { posts: { '2026-11-20': { bc: { pub: '-100777', pubLounge: '-100888' } } } }, S = {};
let a = await Wk.runFree3(st, S, '2026-11-20', { ...W, now: NOW });
T('off until FREE3 is "on"', a === 0 && !PH.length);
a = await Wk.runFree3(st, S, '2026-11-20', { ...W, free3: 'on', now: Date.parse('2026-11-20T14:00:00Z') });
T('waits for 9 AM Central', a === 0 && !PH.length);
a = await Wk.runFree3(st, S, '2026-11-20', { ...W, free3: 'on', now: NOW });
T('on: the picture and the words to the public channel and the lounge', a === 1 && PH.length === 2 && PH.every(x => x.img && /THE FREE 3/.test(x.cap)) && PH.map(x => x.chat).sort().join(',') === '-100777,-100888' && S.f3 === '2026-11-20', JSON.stringify(PH.map(x => x.chat)));
a = await Wk.runFree3(st, S, '2026-11-20', { ...W, free3: 'on', now: NOW + 36e5 });
T('…once a day', a === 0 && PH.length === 2);
const S2 = {}; a = await Wk.runFree3(st, S2, '2026-11-20', { ...W, free3: 'on', now: Date.parse('2026-11-21T02:45Z') });
T('every pick already started: no late post (the day is marked done)', a === 1 && PH.length === 2 && S2.f3 === '2026-11-20');
const S3 = {}; a = await Wk.runFree3(st, S3, '2026-11-20', { ...W, free3: 'on', now: NOW, pubFeed: { ...feed(P3), today: { d: '2026-11-19', picks: P3 } } });
T('yesterday\'s card on the public page: nothing posts', a === 0 && PH.length === 2);
T('Instagram takes the Free 3 by default', Soc.igWants('free3', { ig: { kinds: '' } }) === true);
console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
