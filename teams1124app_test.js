/* v68 · Nov 24, 9:42 PM, Chris: "I'd like the characters to be aware of not only who they win with or against etc.. but who they hit over
   unders with or against… who they hit spreads with or against… all sports for all characters … also this character and all characters
   need a way more vast vocabulary instead of saying the same thing about every game". The public app's half: the three-way team table
   on a character's page (an older feed keeps its two columns), the reads built from the richer notes, the heirs' family voice, and every
   character on an open Slate game talking from the game's own numbers. Real browser, the repo's files, an invented feed, no network. */
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const W = __dirname; let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x || '').slice(0, 700))); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const AT = Date.parse('2026-11-25T00:10:00Z'), D = '2026-11-24', iso = t => new Date(t).toISOString().slice(0, 16) + 'Z', m = n => AT + n * 60e3;
const KID = { a: 'The Scorekeeper', b: 'The Scout', ca: '#9ad', cb: '#fa6', born: '2026-11-20', st: 'rookie', arch: 'Prodigy Grinder', creed: 'Ride what\'s working.', g: '⚙️', t: '⚓', gen: null, genAt: null, genBy: null, family: [], lessons: [] };
const NOTE = 'both offenses outclass the defenses (Scout) · me on SAC over 4-1 · avg SA 121.4-108.2 SAC 109.9-118.3 · past 225: SA 6/8 SAC 5/8';
const pick = (game, pk, note, x = {}) => ({ kind: 'game', sp: 'nba', game, gl: game, pick: pk, price: -110, p: 0.63, start: iso(m(50)), hit: null, push: false, note, ...x });
const CLOSER = (teams) => ({ v: 'H_L3e1', name: 'The Closer', chip: '⚙️ CLOSER', color: '#c0b2ab', title: 'The Golden Child', bio: 'Born Nov 20.', origin: '', best: [], still: [], record: { w: 4, l: 5, pu: 0, u: -1.38 }, props: { w: 0, l: 0 }, par: null,
  picks: [pick('SA@SAC', 'Over 225', NOTE), pick('UTAH@LAL', 'Over 228', 'high total · me on LAL over 3-0 · avg UTAH 112.0-121.5 LAL 118.2-113.0 · past 228: UTAH 5/8 LAL 6/8'), pick('MIL@BKN', 'Over 214.5', 'both offenses outclass the defenses (Scout) · avg MIL 109.7-121.1 BKN 111.2-120.3')],
  recent: [], teams, players: [], kid: KID });
const NEW = [{ sp: 'nba', team: 'SAC', now: 1, ml: [0, 0, 2, 0], ou: [4, 1, 0, 2], for: { w: 0, l: 0 }, vs: { w: 2, l: 0 } }, { sp: 'nhl', team: 'BOS', ats: [2, 0, 0, 0], for: { w: 2, l: 0 }, vs: { w: 0, l: 0 } }, { sp: 'ncaab', team: 'KENT', ml: [0, 1, 0, 0], ats: [1, 1, 0, 3], for: { w: 1, l: 2 }, vs: { w: 0, l: 3 } }];
const OLD = [{ sp: 'ncaab', team: 'WYO', for: { w: 0, l: 1 }, vs: { w: 0, l: 0 } }, { sp: 'ncaab', team: 'KENT', for: { w: 0, l: 0 }, vs: { w: 0, l: 1 } }];
const call = (v, s, pk, p, o, x = {}) => ({ v, s, pick: pk, price: -110, p, o, hit: null, ...x });
const BOARD = { d: D, heavy: -500, cast: { H_L3e1: { name: 'The Closer', chip: '⚙️', color: '#c0b2ab' }, Scout: { name: 'The Scout', chip: '🔭', color: '#4fd' }, Judge: { name: 'The Judge', chip: '⚖️', color: '#fd4' } },
  games: [{ sp: 'nba', game: 'SA@SAC', gl: 'SA@SAC', start: iso(m(50)), day: D, st: 'pre', picks: [{ m: 'total', sd: 'over', pick: 'Over 225', price: -110, p: 0.63, tier: 'strong', unan: false, off: true, by: ['H_L3e1', 'Scout'] }],
    calls: { total: [call('H_L3e1', 'over', 'Over 225', 0.63, 1, { q: 'both offenses outclass the defenses (Scout) · me on SAC over 4-1' }), call('Scout', 'over', 'Over 225', 0.6, 0), call('Judge', 'under', 'Under 225', 0.56, 0)] },
    fx: 'avg SA 121.4-108.2 SAC 109.9-118.3 · rec SA 14-3 SAC 4-13 · last5 SA 4-1 SAC 1-4 · past 225: SA 6/8 SAC 5/8' }] };
const feed = teams => ({ v: 4, beta: true, brand: 'TheDesk', generated: AT - 20 * 60e3, record: { w: 53, l: 38, pu: 0, u: 2.3, first: '2026-10-06' }, history: [], updates: [], cashed: [], unlockMin: 30,
  today: { d: D, lockedAt: AT - 10 * 36e5, unlockMin: 30, props: [], picks: [{ sp: 'nba', game: 'SA@SAC', pick: 'Over 225', price: -110, p: 0.71, start: iso(m(50)), hit: null, push: false, unlockAt: m(-70) }] }, characters: [CLOSER(teams)], board: BOARD });
const sg = (a, an, h, hn, t) => ({ k: `nba|${a}@${h}`, sp: 'nba', t, a: { ab: a, name: an, nick: an }, h: { ab: h, name: hn, nick: hn }, ln: { fav: a, line: 8.5, tot: 225, mlA: -350, mlH: 280, spA: -110, spH: -110, ov: -110, un: -110 } });
const SLATE = { v: 1, ts: AT - 10 * 60e3, tz: 'America/Chicago', ranks: {}, days: [{ d: D, games: [sg('SA', 'San Antonio', 'SAC', 'Sacramento', m(50)), sg('UTAH', 'Utah', 'LAL', 'Los Angeles', m(80)), sg('MIL', 'Milwaukee', 'BKN', 'Brooklyn', m(90))] }] };
(async () => {
  const b = await pw.chromium.launch();
  const page = async (teams, hash) => {
    const ctx = await b.newContext({ serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.clock.setFixedTime(new Date(AT));
    await p.addInitScript(() => { try { localStorage.setItem('tdp.guide', JSON.stringify({ at: Date.now(), n: 2 })); localStorage.setItem('tdp.intro', '1'); localStorage.setItem('tdp.castpick', '"H_L3e1"'); } catch (e) { } });
    await p.route('**/*', r => { const u = new URL(r.request().url());
      if (/picks\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed(teams)) });
      if (/slate\.json$/.test(u.pathname)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SLATE) });
      if (/ghost\.json$/.test(u.pathname)) return r.fulfill({ status: 404, body: '' });
      if (u.hostname === 'site.api.espn.com') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [] }) });
      if (u.hostname === 'thedesk-chat.ironsilkstrategies.workers.dev') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ rows: [], n: 0 }) });
      if (u.hostname !== 'desk.test') return r.abort();
      let f = path.join(W, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
    await p.goto('https://desk.test/desk/' + hash, { waitUntil: 'load' }); await p.waitForTimeout(1800); return { ctx, p, errs }; };
  try {
    let { ctx, p, errs } = await page(NEW, '#cast');
    const tb = await p.evaluate(() => { const t = document.querySelector('.tb3'); if (!t) return null; return { head: [...t.querySelectorAll('thead th')].map(x => x.textContent.replace(/­/g, '')), rows: [...t.querySelectorAll('tbody tr')].map(r => ({ now: r.classList.contains('now'), th: r.querySelector('th').innerText, cells: [...r.querySelectorAll('td')].map(td => [...td.querySelectorAll('.tbc')].map(s => s.className.replace('tbc', '').trim() + ':' + s.innerText.replace(/\s+/g, ' ').trim())) })) }; });
    T('the team table reads four ways across: team, moneyline, spread, over/under', tb && tb.head.join('|') === 'Team|Moneyline|Spread|Over/under', JSON.stringify(tb && tb.head));
    const sac = tb && tb.rows.find(r => /Sacramento|SAC|Kings/.test(r.th));
    T('…a team on today\'s card is marked and comes first; its book reads with/against and over/under, colored by how it went', tb && tb.rows[0] === sac && sac.now && /on today’s card/.test(sac.th) && sac.cells[0].join() === 'up:vs 2–0' && sac.cells[1].join() === 'none:—' && sac.cells[2].join() === 'up:over 4–1,dn:under 0–2', JSON.stringify(sac));
    const bos = tb && tb.rows.find(r => /BOS|Boston|Bruins/.test(r.th)), kent = tb && tb.rows.find(r => /KENT|Kent/.test(r.th));
    T('…every sport: a hockey team on the puck line, a college team three ways', bos && /Hockey|NHL/i.test(bos.th) && bos.cells[1].join() === 'up:with 2–0' && kent && kent.cells[1].join() === ':with 1–1,dn:vs 0–3' && kent.cells[0].join() === 'dn:with 0–1', JSON.stringify([bos, kent]));
    T('…and the page says what the book counts (every call, official or not)', await p.evaluate(() => /every call it has made, official or not/i.test((document.querySelector('.tb-sub') || {}).textContent || '')));
    const reads = await p.evaluate(() => [...document.querySelectorAll('#v-cast .why1')].map(x => x.innerText.replace(/^“|”$/g, '')));
    T('its picks\' reads: three different ones, each built from that game (teams and numbers), no tag read out loud', reads.length === 3 && new Set(reads).size === 3 && reads.every(s => /\d/.test(s) && !/\(Scout\)/.test(s)) && /Sacramento|San Antonio|Spurs|Kings/.test(reads[0]), JSON.stringify(reads));
    T('…in an heir\'s family voice, never the stock lines of old', reads.every(s => !/^(Quick one|Here's my read|I like this|Straightforward)\./.test(s)), JSON.stringify(reads));
    T('…no page errors', errs.length === 0, errs.join(' | '));
    await ctx.close();
    ({ ctx, p, errs } = await page(OLD, '#cast'));
    T('an older feed (with and against only) keeps its two columns', await p.evaluate(() => !document.querySelector('.tb3') && /Backed/.test((document.querySelector('#v-cast .tbl thead') || {}).textContent || '') && /Against/.test((document.querySelector('#v-cast .tbl thead') || {}).textContent || '')));
    await ctx.close();
    ({ ctx, p, errs } = await page(NEW, '#slate'));
    await p.click('[data-act="game"][data-k="nba|SA@SAC"]'); await p.waitForTimeout(500);
    const qs = await p.evaluate(() => [...document.querySelectorAll('.won li')].map(li => ({ who: (li.querySelector('.who') || {}).innerText || '', q: (li.querySelector('.cq') || {}).innerText || '' })));
    T('an open Slate game: every character on it talks, the ones with no reasons of their own from the game\'s numbers', qs.length === 3 && qs.every(x => x.q.length > 15) && new Set(qs.map(x => x.q)).size === 3, JSON.stringify(qs));
    const judge = qs.find(x => /Judge/.test(x.who)), scout = qs.find(x => /Scout/.test(x.who));
    T('…each from its own side: the Scout\'s over cites what backs an over, the Judge\'s under never sells it with the over\'s numbers', scout && /San Antonio|Sacramento|Spurs|Kings|\d/.test(scout.q) && judge && !/(6|five|six) of .*last|went past|keeps showing up|adds up to about 23/.test(judge.q), JSON.stringify([scout, judge]));
    T('…no page errors', errs.length === 0, errs.join(' | '));
    await ctx.close();
  } catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
