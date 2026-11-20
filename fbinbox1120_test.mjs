/* v3.3.2 · the Facebook inbox (chat/fb-inbox.mjs). Comment "FREE 3" on a TheDesk post → one private reply with the day's Free 3
   and a public "Sent ✅" under the comment; a message to the Page asking for picks → the Free 3; anything else → one automated
   welcome a day (a person answers the rest). Signed webhooks only, each event once, three Free 3 messages a person a day, every
   automated message says so, 21+ and 1-800-MY-RESET, no sportsbook links, a locked pick never shown early, the page token never
   in a log. Fake Graph API, fake storage, no network. */
import { createHmac } from 'node:crypto';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 500))); };
const FB = await import('/home/claude/work/chat/fb-inbox.mjs');
const W = (await import('/home/claude/work/chat/worker.mjs')).default;
const TOKEN = 'EAAtestPAGEtoken1234567890', SECRET = 'app-secret-xyz', VERIFY = 'verify-abc', PAGE = '1000001';
const storage = () => { const m = new Map(); return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async k => { if (Array.isArray(k)) k.forEach(x => m.delete(x)); else m.delete(k); }, list: async () => new Map(m) }; };
let NOW = Date.parse('2026-11-20T18:00:00Z');   /* Fri Nov 20, noon Central */
const READ = { who: 'The Coach', take: "Listen. Give me Utah. I like how they're set up for this one.", text: "Strip the names off and it's a 3.2-point hole for Utah, against a line of +4.5. I'm 29-22 on NBA underdogs against the spread. Where it goes wrong: Miles Bridges can beat this on his own. The book is pricing this like it happens 52% of the time." };
const FEED = { record: { w: 47, l: 35 }, history: [{ d: '2026-11-18', picks: [{ hit: false }, { hit: true }] }],
  today: { d: '2026-11-20', picks: [{ sp: 'nba', game: 'PHX@UTAH', pick: 'UTAH +4.5', price: -110, start: '2026-11-21T02:30Z', why: { read: READ } }, { sp: 'ncaab', game: 'LEM@MIZ', pick: 'Under 155.5', price: -110, start: '2026-11-21T01:00Z' }] } };
let feed = FEED; const calls = []; let graphFail = null;
const fakeFetch = async (url, init) => { url = String(url);
  if (url.startsWith('https://raw.githubusercontent.com/')) return new Response(JSON.stringify(feed), { status: 200 });
  if (url.startsWith('https://graph.facebook.com/')) { const b = JSON.parse(init.body); calls.push({ path: url.replace(/^https:\/\/graph\.facebook\.com\/v[\d.]+\//, ''), auth: init.headers.authorization, body: b });
    if (graphFail) return new Response(JSON.stringify({ error: { message: graphFail } }), { status: 400 }); return new Response(JSON.stringify({ recipient_id: '9', message_id: 'mid.x', id: 'c_1' }), { status: 200 }); }
  return new Response('{}', { status: 404 }); };
const st = storage(); const inbox = new FB.Inbox({ storage: st }, { FB_PAGE_TOKEN: TOKEN, FB_PAGE_ID: PAGE }, { fetch: fakeFetch, now: () => NOW });
const env = { FB_PAGE_TOKEN: TOKEN, FB_APP_SECRET: SECRET, FB_VERIFY_TOKEN: VERIFY, FB_PAGE_ID: PAGE, INBOX: { idFromName: () => 'fb', get: () => ({ fetch: (u, i) => inbox.fetch(new Request(u, i)) }) } };
const waits = []; const ctx = { waitUntil: p => waits.push(p) }; const settle = async () => { await Promise.all(waits.splice(0)); };
const sign = raw => 'sha256=' + createHmac('sha256', SECRET).update(raw).digest('hex');
const post = async (body, sig) => { const raw = JSON.stringify(body); const r = await W.fetch(new Request('https://thedesk-chat.example/fb/hook', { method: 'POST', body: raw, headers: { 'x-hub-signature-256': sig === undefined ? sign(raw) : sig } }), env, ctx); await settle(); return r; };
const comment = (id, message, from) => ({ object: 'page', entry: [{ id: PAGE, time: 1, changes: [{ field: 'feed', value: { item: 'comment', verb: 'add', comment_id: id, post_id: PAGE + '_55', message, from, created_time: 1 } }] }] });
const msg = (mid, text, psid, extra) => ({ object: 'page', entry: [{ id: PAGE, time: 1, messaging: [{ sender: { id: psid }, recipient: { id: PAGE }, timestamp: 1, message: { mid, text, ...(extra || {}) } }] }] });

/* ── the handshake and the signature ── */
let r = await W.fetch(new Request(`https://x/fb/hook?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=12345`), env, ctx);
T('Meta\'s handshake: the right verify token gets the challenge back', r.status === 200 && (await r.text()) === '12345');
r = await W.fetch(new Request('https://x/fb/hook?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=12345'), env, ctx);
T('…a wrong one is refused', r.status === 403);
r = await post(comment('c0', 'FREE 3', { id: '77', name: 'Mike Jones' }), 'sha256=' + '0'.repeat(64));
T('an unsigned or badly signed webhook does nothing (401)', r.status === 401 && calls.length === 0);
r = await W.fetch(new Request('https://x/fb/status'), env, ctx); const stt = await r.text();
T('/fb/status says configured, and never shows a key', r.status === 200 && JSON.parse(stt).configured === true && !stt.includes(TOKEN) && !stt.includes(SECRET) && !stt.includes(VERIFY), stt);
T('the chat and accounts routes still answer as before (unknown /chat route → 404 from the room, not the inbox)', (await W.fetch(new Request('https://x/nope'), env, ctx)).status === 404);

/* ── a FREE 3 comment ── */
r = await post(comment('c1', 'FREE 3 🔥', { id: '77', name: 'Mike Jones' }));
T('a FREE 3 comment: the webhook answers 200 at once', r.status === 200);
const pr = calls.find(c => c.path === `${PAGE}/messages` && c.body.recipient && c.body.recipient.comment_id === 'c1');
T('…a private reply to that comment with the day\'s Free 3', pr && /THE FREE 3 · Fri, Nov 20/.test(pr.body.message.text) && /UTAH \+4\.5 \(−110\)/.test(pr.body.message.text) && /UNDER 155\.5 \(−110\)/.test(pr.body.message.text), pr && pr.body.message.text);
T('…with the page token as a bearer header (never in the address)', pr && pr.auth === 'Bearer ' + TOKEN && !calls.some(c => c.path.includes(TOKEN)));
const pub = calls.find(c => c.path === 'c1/comments');
T('…then a public note under the comment: "Sent ✅ Check your messages, Mike."', pub && pub.body.message === 'Sent ✅ Check your messages, Mike.', pub && pub.body.message);
const text = pr.body.message.text;
T('the message: matchup + Central time, the reason line, two-pick note, last card + record', /PHX @ UTAH · 8:30 PM CT/.test(text) && /Strip the names off and it's a 3\.2-point hole for Utah/.test(text) && /Only two cleared the bar today\. We don't force a third\./.test(text) && /Last card 1–1 · Record 47–35 · graded in public/.test(text), text);
T('…the app, 21+ with 1-800-MY-RESET, and it says it\'s automated', /ironsilkweekly\.com\/desk/.test(text) && /21\+ · For entertainment only · Need help\? Call or text 1-800-MY-RESET/.test(text) && /🤖 Automated message from TheDesk/.test(text));
T('…house rules: no "lock", no guarantee, no sportsbook / DFS links, no risk paragraph or price math', !/\block\b|guarantee|prizepicks|dabble|draftkings|fanduel|promo code|goes wrong|pricing this/i.test(text) && text.length < 2000, text.length);
let n0 = calls.length; await post(comment('c1', 'FREE 3 🔥', { id: '77', name: 'Mike Jones' }));
T('Meta retries the same comment: answered once', calls.length === n0);
await post(comment('c2', 'great call yesterday', { id: '78', name: 'Ann' }));
T('a comment without the keyword: nothing', calls.length === n0);
await post(comment('c3', 'FREE 3', { id: PAGE, name: 'TheDesk' }));
T('the Page\'s own comment: nothing', calls.length === n0);
for (const id of ['c4', 'c5', 'c6']) await post(comment(id, 'free three please', { id: '77', name: 'Mike Jones' }));
T('three Free 3 messages a person a day: Mike\'s 4th comment gets nothing (and "free three" counts)', calls.filter(c => c.body.recipient && /^c[1-6]$/.test(c.body.recipient.comment_id || '')).length === 3, calls.filter(c => c.body.recipient && c.body.recipient.comment_id).map(c => c.body.recipient.comment_id).join(','));
graphFail = 'Invalid OAuth access token ' + TOKEN; const logs = []; const L0 = console.log; console.log = (...a) => logs.push(a.join(' '));
await post(comment('c7', 'FREE 3', { id: '80', name: 'Lee' })); console.log = L0; graphFail = null;
T('a private reply Facebook refuses: no public "Sent" note, and the token never reaches the log', !calls.some(c => c.path === 'c7/comments') && logs.some(l => /private reply/.test(l)) && !logs.some(l => l.includes(TOKEN)), logs.join(' | '));

/* ── the inbox ── */
n0 = calls.length; await post(msg('m1', 'hey are you guys legit?', 'p1'));
const wel = calls.slice(n0).find(c => c.body.recipient && c.body.recipient.id === 'p1');
T('a message that isn\'t asking for picks: one automated welcome, a FREE 3 button, "a real person reads every one"', wel && wel.body.messaging_type === 'RESPONSE' && /🤖 Automated reply from TheDesk/.test(wel.body.message.text) && /A real person reads every one/.test(wel.body.message.text) && wel.body.message.quick_replies[0].payload === 'FREE3', wel && JSON.stringify(wel.body));
n0 = calls.length; await post(msg('m2', 'also what time is the game', 'p1'));
T('…the next one the same day is left for a person (no second welcome)', calls.length === n0);
await post(msg('m3', 'FREE 3', 'p1', { quick_reply: { payload: 'FREE3' } }));
const f3 = calls.slice(n0).find(c => c.body.recipient && c.body.recipient.id === 'p1');
T('tapping FREE 3: the day\'s Free 3', f3 && /THE FREE 3 · Fri, Nov 20/.test(f3.body.message.text));
n0 = calls.length; await post(msg('m4', 'what are your picks today', 'p2'));
T('asking for picks in words: the Free 3 (no welcome first)', calls.length === n0 + 1 && /THE FREE 3/.test(calls[n0].body.message.text));
n0 = calls.length; await post(msg('m4', 'what are your picks today', 'p2'));
T('the same message delivered twice: answered once', calls.length === n0);
await post(msg('m5', 'FREE 3', PAGE, { is_echo: true }));
T('the Page\'s own messages (echoes): nothing', calls.length === n0);
NOW += 864e5; n0 = calls.length; await post(msg('m6', 'morning!', 'p1'));
T('a new day: the welcome again', calls.length === n0 + 1 && /Automated reply/.test(calls[n0].body.message.text));

/* ── what the message says on other days ── */
const D = FB.free3Dm;
T('before the card locks: "isn\'t out yet"', /isn't out yet/.test(D({ today: { d: '2026-11-19', picks: [] } }, Date.parse('2026-11-20T15:00:00Z'))));
T('a pass day: "No free picks today… we don\'t force plays"', /No free picks today\. Nothing cleared the bar, and we don't force plays\./.test(D({ today: { d: '2026-11-20', picks: [] } }, Date.parse('2026-11-20T18:00:00Z'))));
const hid = D({ today: { d: '2026-11-20', picks: [FEED.today.picks[1], { hidden: true, sp: 'nba', start: '2026-11-21T02:30Z', unlockAt: Date.parse('2026-11-21T02:00Z') }] } }, Date.parse('2026-11-20T18:00:00Z'));
T('a locked pick (outside the open beta): "unlocks 8:00 PM CT", never the pick', /2\) 🔒 Free pick: unlocks 8:00 PM CT, 30 minutes before its game/.test(hid) && !/UTAH/.test(hid), hid);
T('three picks: no "only two" note', !/Only/.test(D({ today: { d: '2026-11-20', picks: [FEED.today.picks[0], FEED.today.picks[1], { sp: 'nhl', game: 'MIN@TOR', pick: 'MIN ML', price: -170, start: '2026-11-21T00:00Z' }] } }, Date.parse('2026-11-20T18:00:00Z'))));
T('keywords: FREE 3 / free3 / Free Three / free-3, not "free agent 3"', ['FREE 3', 'free3', 'Free Three', 'free-3 pls'].every(s => FB.KEYWORD.test(s)) && !FB.KEYWORD.test('free agent 3'));
T('the public note uses a first name only when it\'s a plain name', FB.sentNote('Mike Jones') === 'Sent ✅ Check your messages, Mike.' && FB.sentNote('') === 'Sent ✅ Check your messages.' && FB.sentNote('<script>') === 'Sent ✅ Check your messages.');
/* ── the Free 3 post promises the DM only once FB_DM is on ── */
const F3 = await import('/home/claude/work/autopilot/free3.mjs');
const D3 = { d: '2026-11-20', day: 'Fri, Nov 20', n: 1, open: 1, picks: [{ sp: 'nba', game: 'PHX@UTAH', away: { abbr: 'PHX' }, home: { abbr: 'UTAH' }, pick: 'UTAH +4.5', price: -110, p: 0.57, mkt: 0.52, start: '2026-11-21T02:30Z', reason: 'x', on: 5 }], last: null, record: null };
T('the Free 3 post: no "Comment FREE 3" line until FB_DM is on, then it\'s there', !/Comment FREE 3/.test(F3.free3Caption(D3, {})) && /💬 Comment FREE 3 and we'll send today's picks to your messages\./.test(F3.free3Caption(D3, { dm: 'on' })));
console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
