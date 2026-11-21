/* v3.3 · Tonight's Game pages (Nov 19, the growth playbook): one commit per write through a fake GitHub (inline tree, three
   write calls), new pages within 30 min, finals every 2 h, each game page written at most twice, games.json keeps the rows the
   slate drops at the start, late games finish after midnight, old days pruned, robots.txt once, 401 backoff, the retry when the
   phone commits in between, nothing hidden ever printed. No network. */
import { readFileSync } from 'node:fs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 500))); };
process.env.AUTOPILOT_KEY = 'k'; process.env.TG_BOT_TOKEN = 't'; for (const k of ['SITE_TOKEN', 'GAME_PAGES', 'STATE_REPO', 'APP_URL']) delete process.env[k];
const Gr = await import('/home/claude/work/autopilot/growth.mjs');
const Wk = await import('/home/claude/work/autopilot/worker.mjs');
const SITE = 'ironsilkstrategies/ironsilk-weekly-site', API = `https://api.github.com/repos/${SITE}/`;

/* ── a fake GitHub holding the site's files ── */
function fakeSite(init) { const F = { files: { ...init }, head: 'c0', n: 0, trees: {}, commits: { c0: { tree: 't0' } }, calls: [], writes: {}, msgs: [], fail422: 0, phone: null, good: 'GOOD' };
  F.trees.t0 = { ...F.files };
  const res = (status, body, raw) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => raw ?? JSON.stringify(body) });
  F.fetch = async (url, o = {}) => { const u = String(url), m = (o.method || 'GET').toUpperCase(); F.calls.push(m + ' ' + u.replace(API, ''));
    if (!u.startsWith(API)) return res(404, {});
    if ((o.headers || {}).Authorization !== 'Bearer ' + F.good) return res(401, { message: 'Bad credentials' });
    const p = u.slice(API.length);
    if (m === 'GET' && p === 'contents/desk?ref=main') { const list = [{ name: 'index.html', type: 'file' }]; if (Object.keys(F.files).some(f => f.startsWith('desk/games/'))) list.push({ name: 'games', type: 'dir', sha: 'GAMES-' + F.head }); return res(200, list); }
    if (m === 'GET' && p.startsWith('git/trees/GAMES-')) return res(200, { tree: Object.keys(F.files).filter(f => f.startsWith('desk/games/')).map(f => ({ path: f.slice('desk/games/'.length), type: 'blob' })) });
    if (m === 'GET' && p.startsWith('contents/')) { const f = decodeURIComponent(p.slice(9).replace(/\?ref=main$/, '')); return f in F.files ? res(200, null, F.files[f]) : res(404, { message: 'Not Found' }); }
    if (m === 'GET' && p === 'git/ref/heads/main') return res(200, { object: { sha: F.head } });
    if (m === 'GET' && p.startsWith('git/commits/')) { const c = F.commits[p.slice(12)]; return c ? res(200, { tree: { sha: c.tree } }) : res(404, {}); }
    const B = o.body ? JSON.parse(o.body) : {};
    if (m === 'POST' && p === 'git/trees') { const base = F.trees[B.base_tree]; if (!base) return res(422, { message: 'bad base' }); const next = { ...base };
      for (const e of B.tree) { if (e.sha === null) { if (!(e.path in next)) return res(422, { message: 'GitRPC::BadObjectState' }); delete next[e.path]; } else if ('content' in e) next[e.path] = e.content; else return res(422, { message: 'want content' }); }
      const sha = 't' + (++F.n); F.trees[sha] = next; return res(201, { sha }); }
    if (m === 'POST' && p === 'git/commits') { const sha = 'c' + (++F.n); F.commits[sha] = { tree: B.tree, parent: B.parents[0], message: B.message }; return res(201, { sha }); }
    if (m === 'PATCH' && p === 'git/refs/heads/main') { const c = F.commits[B.sha];
      if (F.fail422 > 0) { F.fail422--; const nx = { ...F.files, 'public/picks.json': F.phone || 'phone-new' }; const ts = 't' + (++F.n), cs = 'c' + (++F.n); F.trees[ts] = nx; F.commits[cs] = { tree: ts, parent: F.head, message: 'Update (the phone)' }; F.head = cs; F.files = nx; return res(422, { message: 'Update is not a fast forward' }); }
      if (B.force !== false || !c || c.parent !== F.head) return res(422, { message: 'Update is not a fast forward' });
      const before = F.files, after = F.trees[c.tree]; for (const f of Object.keys(after)) if (after[f] !== before[f]) F.writes[f] = (F.writes[f] || 0) + 1;
      F.files = after; F.head = B.sha; F.msgs.push(c.message); return res(200, { object: { sha: B.sha } }); }
    return res(404, { message: 'unhandled ' + m + ' ' + p }); };
  F.writeCalls = () => F.calls.filter(c => !c.startsWith('GET')).length;
  return F; }

/* ── the public data: the slate (games drop off once they start) and the public picks.json ── */
const side = (ab, name, nick, rk) => ({ ab, name, nick, rk, of: 32, w: 7, l: 3, l5: 'WWLWW', pf: 24, pa: 18 });
const row = (k, sp, t, A, H, x = {}) => ({ k, sp, t: Date.parse(t), a: A, h: H, venue: x.venue || 'Home Field', ln: x.ln || { fav: A.ab, line: 3.5, tot: 47.5, mlA: -170, mlH: 145 }, mv: { line: 0.5 }, mkt: { ab: A.ab, pct: 61 }, read: { a: 27, h: 21 }, note: x.note || '', q: 'Who you got?' });
const g1 = row('nfl|BUF@MIA', 'nfl', '2026-11-19T18:00:00Z', side('BUF', 'Buffalo Bills', 'Bills', 3), side('MIA', 'Miami Dolphins', 'Dolphins', 19));
const g2 = row('nba|LAL@ATL', 'nba', '2026-11-20T00:30:00Z', side('LAL', 'Los Angeles Lakers', 'Lakers', 8), side('ATL', 'Atlanta Hawks', 'Hawks', 12));
const g3 = row('nhl|SEA@VGK', 'nhl', '2026-11-20T04:00:00Z', side('SEA', 'Seattle Kraken', 'Kraken', 20), side('VGK', 'Vegas Golden Knights', 'Golden Knights', 4));
const g4 = row('nfl|KC@LV', 'nfl', '2026-11-21T01:15:00Z', side('KC', 'Kansas City Chiefs', 'Chiefs', 2), side('LV', 'Las Vegas Raiders', 'Raiders', 28));
const g5 = row('ncaab|DUKE@UNC', 'ncaab', '2026-11-21T00:00:00Z', side('DUKE', 'Duke Blue Devils', 'Blue Devils', 5), side('UNC', 'North Carolina Tar Heels', 'Tar Heels', 9));
const g6 = row('nhl|TOR@BOS', 'nhl', '2026-11-20T00:00:00Z', side('TOR', 'Toronto Maple Leafs', 'Maple Leafs', 6), side('BOS', 'Boston Bruins', 'Bruins', 7));
const g7 = row('nba|BOS@NY', 'nba', '2026-11-22T00:30:00Z', side('BOS', 'Boston Celtics', 'Celtics', 1), side('NY', 'New York Knicks', 'Knicks', 5));
const slate = (days) => ({ at: 0, days: Object.entries(days).map(([d, games]) => ({ d, games })) });
const cast = { Sim: { name: 'The Simulator' }, Judge: { name: 'The Judge' }, Dog: { name: 'The Underdog Spotter' } };
const call = (v, s, pick) => ({ v, s, pick, price: -110, p: 0.55, r: { lab: 'x', rk: 1, of: 8 } });
const board = { d: '2026-11-19', cast, games: [{ sp: 'nfl', game: 'BUF@MIA', start: '2026-11-19T18:00:00Z', day: '2026-11-19', st: 'pre',
  picks: [{ m: 'spread', sd: 'away', pick: 'BUF -3.5', price: -110, p: 0.56, tier: 'strong', by: ['Sim', 'Judge'] }], calls: { spread: [call('Sim', 'away', 'BUF -3.5'), call('Judge', 'away', 'BUF -3.5'), call('Dog', 'home', 'MIA +3.5')] } }] };
const feed = (beta) => ({ beta, board: beta ? board : undefined, today: { d: '2026-11-19', picks: [{ sp: 'nba', game: 'LAL@ATL', pick: 'ATL ML', price: 120, tier: 'value' }, { sp: 'nhl', game: 'SEA@VGK', pick: 'Under 5.5', price: -125, tier: 'supreme', hidden: true }] } });
const ROBOTS = 'User-agent: *\nAllow: /\n\nSitemap: https://ironsilkweekly.com/sitemap.xml\n';
const site = fakeSite({ 'robots.txt': ROBOTS, 'index.html': '<!doctype html>home', 'public/picks.json': 'phone-v1',
  'desk/games/2026-11-01/old-game-prediction.html': 'old', 'desk/games/2026-11-01/index.html': 'old', 'desk/games/2026-11-01/games.json': '{}', 'desk/games/2026-11-10/keep-game-prediction.html': 'keep', 'desk/games/2026-11-10/index.html': 'keep' });
const grades = []; const gradePick = async (x) => { grades.push(x.pick); const R = { 'BUF -3.5': ['W', 'BUF 27–20 MIA'], 'ATL ML': ['L', 'LAL 112–104 ATL'] }[x.pick]; if (!R) return null; x.__fin = R[1]; return R[0]; };
const finals = { 'nhl|SEA@VGK': 'SEA 3–2 VGK' }; const finalOf = async (sp, game) => finals[sp + '|' + game] || null;
const S = {}; const D = (now, sl, extra = {}) => ({ now, slate: sl, pubFeed: feed(true), feeds: null, fetch: site.fetch, siteTok: 'GOOD', gradePick, finalOf, app: 'https://ironsilkweekly.com/desk/', ...extra });
const page = p => site.files['desk/games/' + p] || '';

/* 1 · the first pass (Thu 10:30 AM CT): every game on the slate, today and tomorrow, in one commit */
const T0 = Date.parse('2026-11-19T16:30:00Z'); let R = { d: '' };
/* v3.3.3 · a LITE sheet entry (a college game past the sheet's 14, there so the app can play its line) gets no page: still five */
const gLite = { k: 'ncaab|DETM@MSU', sp: 'ncaab', t: Date.parse('2026-11-19T17:00:00Z'), a: { ab: 'DETM', name: 'Detroit Mercy Titans', nick: 'DETM', rk: 362, w: 0, l: 4 }, h: { ab: 'MSU', name: 'Michigan State Spartans', nick: 'MSU', rk: 18, w: 4, l: 1 }, ln: { fav: 'MSU', line: 41.5, tot: 150.5, mlA: null, mlH: null }, lite: 1 };
const s1 = slate({ '2026-11-19': [g1, g2, g3, gLite], '2026-11-20': [g5, g4] });
let a = await Wk.runGamePages({}, S, '2026-11-19', D(T0, s1, { gpRun: R }));
T('first pass: one commit, five new pages ("Game pages · 2026-11-19 · 5 new · 3 old removed")', a === 1 && site.msgs.length === 1 && site.msgs[0] === 'Game pages · 2026-11-19 · 5 new · 3 old removed', site.msgs);
T('…three write calls for the whole commit (the files ride inline in one tree)', site.writeCalls() === 3, site.calls.filter(c => !c.startsWith('GET')));
const P1 = 'buffalo-bills-vs-miami-dolphins-prediction.html';
T('…pages at /desk/games/<day>/<away>-vs-<home>-prediction.html, a day page and games.json for each day', page('2026-11-19/' + P1) && page('2026-11-19/los-angeles-lakers-vs-atlanta-hawks-prediction.html') && page('2026-11-20/kansas-city-chiefs-vs-las-vegas-raiders-prediction.html') && page('2026-11-19/index.html') && page('2026-11-20/index.html') && JSON.parse(page('2026-11-19/games.json')).games.length === 3, Object.keys(site.files).filter(f => f.includes('games/')).join(' '));
const h1 = page('2026-11-19/' + P1);
T('…a real page: JSON-LD SportsEvent, canonical, the rankings, the read, the line, the CTA tagged ?src=games, the helpline', /"@type":"SportsEvent"/.test(h1) && /<link rel="canonical" href="https:\/\/ironsilkweekly\.com\/desk\/games\/2026-11-19\/buffalo-bills-vs-miami-dolphins-prediction\.html">/.test(h1) && /TheDesk Power Rankings/.test(h1) && /Bills 27, Dolphins 21/.test(h1) && /BUF -3\.5 · total 47\.5/.test(h1) && /desk\/\?src=games#slate/.test(h1) && /1-800-MY-RESET/.test(h1), h1.slice(0, 300));
T('…in the beta, the board\'s pick and where the cast lands', /<b>BUF -3\.5<\/b>/.test(h1) && /2 of the cast/.test(h1) && /Where the cast lands/.test(h1) && /2 with BUF -3\.5 \(The Simulator, The Judge\)/.test(h1), h1.match(/TheDesk's picks.*?<\/ul>/s)?.[0]);
const allSite = () => Object.entries(site.files).filter(([f]) => f.startsWith('desk/games/') || f === 'robots.txt').map(([, v]) => v).join('\n');
T('…a pick still hidden (not unlocked yet) never reaches any file; an unlocked one does', !/Under 5\.5/.test(allSite()) && /ATL ML/.test(page('2026-11-19/los-angeles-lakers-vs-atlanta-hawks-prediction.html')));
T('…days older than 14 removed (Nov 1), Nov 10 kept; the index and the sitemap agree', !Object.keys(site.files).some(f => f.includes('2026-11-01')) && page('2026-11-10/keep-game-prediction.html') === 'keep' && !/2026-11-01/.test(page('index.html') + page('sitemap.xml')) && /2026-11-10\/keep-game-prediction\.html<\/loc><lastmod>2026-11-10</.test(page('sitemap.xml')) && /href="2026-11-10\/"/.test(page('index.html')));
const sm = page('sitemap.xml');
T('…the sitemap lists pages and days only (no games.json, no index.html), a future page dated today', !/games\.json|index\.html/.test(sm) && /2026-11-20\/kansas-city-chiefs-vs-las-vegas-raiders-prediction\.html<\/loc><lastmod>2026-11-19</.test(sm) && /<loc>https:\/\/ironsilkweekly\.com\/desk\/games\/2026-11-20\/<\/loc>/.test(sm), sm.slice(0, 400));
T('…robots.txt gains the games sitemap once, its own lines kept', site.files['robots.txt'] === ROBOTS + 'Sitemap: https://ironsilkweekly.com/desk/games/sitemap.xml\n' && S.gp.robots === true, site.files['robots.txt']);
T('…the phone\'s files untouched', site.files['public/picks.json'] === 'phone-v1' && site.files['index.html'] === '<!doctype html>home');
T('…the worker\'s memory stays tiny: what it wrote, by day (a few hundred bytes, not the pages)', JSON.stringify(S.gp).length < 600 && Object.keys(S.gp.w).join() === '2026-11-19,2026-11-20' && /^p[0-9a-z]+$/.test(S.gp.w['2026-11-19']['nfl|BUF@MIA']), JSON.stringify(S.gp));

/* 2 · the next pass: nothing new, nothing final → no call to GitHub at all */
let calls0 = site.calls.length; a = await Wk.runGamePages({}, S, '2026-11-19', D(T0 + 5 * 60e3, s1, { gpRun: R }));
T('a quiet pass: no commit and not one call to GitHub', a === 0 && site.calls.length === calls0, site.calls.slice(calls0));

/* 3 · a game shows up: waits out the 30 minutes, then one page (and the day page keeps every game) */
const s2 = slate({ '2026-11-19': [g1, g6, g2, g3], '2026-11-20': [g5, g4] });
a = await Wk.runGamePages({}, S, '2026-11-19', D(T0 + 10 * 60e3, s2, { gpRun: { d: '' } }));
T('a new game 10 minutes after a write waits (new pages at most every 30 minutes)', a === 0 && site.msgs.length === 1);
a = await Wk.runGamePages({}, S, '2026-11-19', D(T0 + 40 * 60e3, s2, { gpRun: { d: '' } }));
T('…then goes out alone ("1 new"), and robots.txt isn\'t touched again', a === 1 && site.msgs[1] === 'Game pages · 2026-11-19 · 1 new' && page('2026-11-19/toronto-maple-leafs-vs-boston-bruins-prediction.html') && site.writes['robots.txt'] === 1, site.msgs);
T('…today\'s page lists all four games', (page('2026-11-19/index.html').match(/<li>/g) || []).length === 4);

/* 4 · the first final (3 PM CT): BUF@MIA has dropped off the slate; graded once a run; written as a final */
const s3 = slate({ '2026-11-19': [g6, g2, g3], '2026-11-20': [g5, g4] }); R = { d: '' };
const T4 = Date.parse('2026-11-19T21:00:00Z'); a = await Wk.runGamePages({}, S, '2026-11-19', D(T4, s3, { gpRun: R }));
T('3 PM: BUF@MIA (off the slate since kickoff) gets its final page from games.json ("1 final")', a === 1 && site.msgs[2] === 'Game pages · 2026-11-19 · 1 final', site.msgs);
const f1 = page('2026-11-19/' + P1);
T('…the final page: the score, the graded pick, the same read and the same line as before the game', /Final: BUF 27–20 MIA/.test(f1) && /<span class="w">✓ Won<\/span>/.test(f1) && /Bills 27, Dolphins 21/.test(f1) && /BUF -3\.5 · total 47\.5/.test(f1) && /^f/.test(S.gp.w['2026-11-19']['nfl|BUF@MIA']));
T('…today\'s page still lists the four games, BUF@MIA with its result', (page('2026-11-19/index.html').match(/<li>/g) || []).length === 4 && /Bills at Dolphins.*?✓ Won/.test(page('2026-11-19/index.html')));
const g0 = grades.length; a = await Wk.runGamePages({}, S, '2026-11-19', D(T4 + 5 * 60e3, s3, { gpRun: R }));
T('…graded once a run: the next pass in the same run asks ESPN nothing', a === 0 && grades.length === g0);

/* 5 · after midnight (1:30 AM CT, still Thursday's slate for the worker until 5 AM): the late games finish; the phone commits mid-write */
const s4 = slate({ '2026-11-20': [g5, g4], '2026-11-21': [g7] }); site.fail422 = 1; site.phone = 'phone-v2';
const T5 = Date.parse('2026-11-20T07:30:00Z'); a = await Wk.runGamePages({}, S, Wk.chicagoDay(T5), D(T5, s4, { gpRun: { d: '' } }));
T('1:30 AM: the worker\'s day is still the 19th (it turns at 5 AM)', Wk.chicagoDay(T5) === '2026-11-19');
T('…late finals from Thursday, gone from the slate since midnight, plus the new day ahead ("1 new · 2 final")', a === 1 && site.msgs[3] === 'Game pages · 2026-11-19 · 1 new · 2 final' && /Final: SEA 3–2 VGK/.test(page('2026-11-19/seattle-kraken-vs-vegas-golden-knights-prediction.html')) && /<span class="l">✗ Lost<\/span>/.test(page('2026-11-19/los-angeles-lakers-vs-atlanta-hawks-prediction.html')) && page('2026-11-21/boston-celtics-vs-new-york-knicks-prediction.html'), site.msgs);
T('…the phone published picks.json in between: the worker rebuilt on top of it (picks.json is the phone\'s new one)', site.files['public/picks.json'] === 'phone-v2' && site.msgs.length === 4);
T('…a game with no final yet (postponed) stays a pre-game page', /^p/.test(S.gp.w['2026-11-19']['nhl|TOR@BOS']) && !/Final:/.test(page('2026-11-19/toronto-maple-leafs-vs-boston-bruins-prediction.html')));
T('…Thursday\'s page still lists all four games after midnight', (page('2026-11-19/index.html').match(/<li>/g) || []).length === 4, page('2026-11-19/index.html').slice(-900));
const pw = Object.entries(site.writes).filter(([f]) => /-prediction\.html$/.test(f));
T('every game page written at most twice (before the game, at the final)', pw.length >= 7 && pw.every(([, n]) => n <= 2), JSON.stringify(pw));

/* 6 · the day turns at 5 AM: the memory forgets Thursday */
a = await Wk.runGamePages({}, S, '2026-11-20', D(Date.parse('2026-11-20T11:30:00Z'), s4, { gpRun: { d: '' } }));
T('the next day the memory drops the old day (only today and ahead)', !('2026-11-19' in S.gp.w) && '2026-11-20' in S.gp.w, Object.keys(S.gp.w));

/* 7 · a refused token waits an hour, a new one is tried at once */
const S2 = {}, site2 = fakeSite({ 'robots.txt': ROBOTS }); const T7 = T0;
a = await Wk.runGamePages({}, S2, '2026-11-19', { ...D(T7, s1, { gpRun: { d: '' } }), fetch: site2.fetch, siteTok: 'DEAD' });
T('a refused token (401): nothing written; the wait is saved (returns 1 so the memory is kept), remembered by a fingerprint, never the token', a === 1 && site2.msgs.length === 0 && S2.gp.err === T7 && S2.gp.errTok && !JSON.stringify(S2.gp).includes('DEAD'), JSON.stringify(S2.gp));
let c2 = site2.calls.length; a = await Wk.runGamePages({}, S2, '2026-11-19', { ...D(T7 + 10 * 60e3, s1, { gpRun: { d: '' } }), fetch: site2.fetch, siteTok: 'DEAD' });
T('…the same token isn\'t tried again for an hour (no calls)', a === 0 && site2.calls.length === c2);
a = await Wk.runGamePages({}, S2, '2026-11-19', { ...D(T7 + 11 * 60e3, s1, { gpRun: { d: '' } }), fetch: site2.fetch, siteTok: 'GOOD' });
T('…a new token is tried at once and works', a === 1 && site2.msgs.length === 1 && !S2.gp.err);

/* 8 · switches */
T('GAME_PAGES=off: nothing', await Wk.runGamePages({}, {}, '2026-11-19', { ...D(T0, s1), gamePages: 'off' }) === 0);
T('no token at all: nothing', await Wk.runGamePages({}, {}, '2026-11-19', { ...D(T0, s1), siteTok: '' }) === 0);

/* 9 · outside the beta: no board, no cast; only picks already public */
const PG = Gr.gamePages(feed(false), s1, T0, '2026-11-19', {}); const all9 = PG.pages.map(p => p.html).join('\n');
T('outside the beta: no cast section and no board pick; the unlocked free pick only; nothing hidden', !/Where the cast lands/.test(all9) && !/BUF -3\.5<\/b>/.test(all9) && /ATL ML/.test(all9) && !/Under 5\.5/.test(all9));
T('…and a page goes final only with the score (or every pick graded, long after)', PG.pages.every(p => p.phase === 'pre'));
const bare = row('ncaab|NCSU@MUR', 'ncaab', '2026-11-20T01:00:00Z', { ab: 'NCSU', name: 'NCSU', nick: 'NCSU', rk: 40 }, { ab: 'MUR', name: 'MUR', nick: 'MUR', rk: 90 });
const PB = Gr.gamePages(feed(false), slate({ '2026-11-19': [g1, bare] }), T0, '2026-11-19', {});
T('a game the feeds only know by abbreviation ("NCSU vs MUR") gets no page until its names come in', PB.pages.length === 1 && !PB.pages.some(p => /ncsu/.test(p.path)) && !Gr.named(bare) && Gr.named(g1));
T('the read uses full names when a college "nickname" is only the abbreviation', /land near <b>Rice Owls 24, Temple Owls 27/.test(Gr.gamePages(feed(false), slate({ '2026-11-19': [row('ncaaf|RICE@TEM', 'ncaaf', '2026-11-20T00:30:00Z', { ...side('RICE', 'Rice Owls', 'RICE', 122) }, { ...side('TEM', 'Temple Owls', 'TEM', 121) }, {})].map(r => ({ ...r, read: { a: 24, h: 27 } })) }), T0, '2026-11-19', {}).pages[0].html));

/* 10 · siteCommit: a file to remove that's already gone doesn't sink the commit */
const site3 = fakeSite({ 'a.txt': '1' }); const r3 = await Wk.siteCommit(SITE, 'GOOD', { 'b.txt': '2' }, ['missing.txt'], 'test', { fetch: site3.fetch });
T('siteCommit: removing a file already gone → the rest is still written', r3.ok && r3.removed === 0 && site3.files['b.txt'] === '2' && site3.files['a.txt'] === '1', JSON.stringify(r3));

/* 11 · the wiring */
const wf = readFileSync('/home/claude/work/.github/workflows/tg-autopilot.yml', 'utf8'), src = readFileSync('/home/claude/work/autopilot/worker.mjs', 'utf8');
T('the workflow passes SITE_TOKEN as a secret (optional) and GAME_PAGES as a switch', /SITE_TOKEN: \$\{\{ secrets\.SITE_TOKEN \}\}/.test(wf) && /GAME_PAGES: \$\{\{ vars\.GAME_PAGES \}\}/.test(wf));
T('the main loop runs the pages under the worker\'s memory and saves it when they act', /if \(SOCMEM\) try \{ if \(await runGamePages\(state, SOCMEM\.S, today\)\) await socialSave\(\); \}/.test(src));
T('the token never reaches a log line', !/log\([^)]*\btok\b/.test(src.slice(src.indexOf('Tonight\'s Game pages: the site'), src.indexOf('/* the public page: the full card'))));
console.log(`${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0);
