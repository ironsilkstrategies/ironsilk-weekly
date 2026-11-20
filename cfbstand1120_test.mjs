/* v3.1.3 · the CFB ratings fallback reads ESPN's v2 standings. The site API's path (apis/site/v2/…/college-football/standings)
   started answering 404 "Event ID 'null' not found", so the ratings fallback and the Settings self-test read nothing.
   fetchCFBStandings tries apis/v2 on two hosts, keeps the old path last, walks nested conferences, and games played falls
   back to the record when ESPN leaves gamesPlayed out. No network: fetch is faked. */
import fs from 'node:fs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 300))); };
const shared = fs.readFileSync(new URL('./shared.js', import.meta.url), 'utf8'), fe = fs.readFileSync(new URL('./football-engine.js', import.meta.url), 'utf8');
const a = shared.indexOf('const CFB_STANDINGS_URLS'), b = shared.indexOf('/* ── LIVE SELF-TEST');
T('the helper lives in shared.js, ahead of the self-test', a > 0 && b > a);
const code = shared.slice(a, b);
const team = (n, gp, w, l, pf, pa) => ({ team: { displayName: n, abbreviation: n.slice(0, 4).toUpperCase() }, stats: [...(gp == null ? [] : [{ name: 'gamesPlayed', value: gp }]), { name: 'wins', value: w }, { name: 'losses', value: l }, { name: 'pointsFor', value: pf }, { name: 'pointsAgainst', value: pa }] });
const V2 = { children: [{ name: 'ACC', standings: { entries: [team('Duke Blue Devils', null, 7, 4, 330, 260), team('Clemson Tigers', null, 8, 3, 360, 220)] } },
  { name: 'Big Ten', children: [{ name: 'East', standings: { entries: [team('Ohio State Buckeyes', 11, 11, 0, 440, 120)] } }] }] };
const DEAD = { code: 404, message: "Event ID 'null' not found for sport/league 'football/college-football'" };
const make = route => { const calls = []; const fetch = async url => { calls.push(url); const [status, body] = route(url); return { status, ok: status >= 200 && status < 300, json: async () => body }; }; return { calls, fetch }; };
const load = fetch => new Function('fetch', code + '\nreturn { CFB_STANDINGS_URLS, standingsEntries, fetchCFBStandings, standingsGP };')(fetch);
{ const m = make(u => (/apis\/site\/v2/.test(u) ? [404, DEAD] : /site\.api\.espn\.com\/apis\/v2/.test(u) ? [200, V2] : [500, {}])); const H = load(m.fetch);
  const res = await H.fetchCFBStandings(2026);
  T('the v2 standings API is asked first', /^https:\/\/site\.api\.espn\.com\/apis\/v2\/sports\/football\/college-football\/standings\?season=2026$/.test(m.calls[0]), m.calls[0]);
  T('…and answers: every team, nested divisions included', res.status === 200 && res.entries.length === 3, JSON.stringify(res.entries.map(e => e.team.displayName)));
  T('the dead site-API path is never touched when v2 works', !m.calls.some(u => /apis\/site\/v2/.test(u)), m.calls.join(' '));
  T('games played falls back to the record when ESPN leaves it out', H.standingsGP({ wins: 7, losses: 4 }) === 11 && H.standingsGP({ gamesPlayed: 11, wins: 11, losses: 0 }) === 11 && H.standingsGP({}) === 0); }
{ const m = make(u => (/site\.web\.api/.test(u) ? [200, V2] : /apis\/site\/v2/.test(u) ? [404, DEAD] : [503, { error: 'down' }])); const H = load(m.fetch);
  const res = await H.fetchCFBStandings(2026); T('if the main host is down, the web host is next', /site\.web\.api\.espn\.com\/apis\/v2/.test(res.url) && res.entries.length === 3, res.url); }
{ const m = make(u => (/apis\/site\/v2/.test(u) ? [404, DEAD] : [404, { code: 404 }])); const H = load(m.fetch);
  const res = await H.fetchCFBStandings(2026);
  T('when everything fails it says so: the last answer comes back with no entries', res.entries.length === 0 && res.status === 404 && m.calls.length === 3, JSON.stringify(res).slice(0, 160)); }
{ const H = load(async () => { throw new Error('Load failed'); }); const res = await H.fetchCFBStandings(2026);
  T('a network error is reported, not thrown', res.entries.length === 0 && /Load failed/.test(res.err), JSON.stringify(res)); }
const fn = fe.slice(fe.indexOf('async function fetchNCAAFPowerRatings'), fe.indexOf('ncaafPowerFlags();', fe.indexOf('async function fetchNCAAFPowerRatings')));
T('the ratings fallback reads fetchCFBStandings, not the dead path', /fetchCFBStandings\(\+NCAAF_SEASON\|\|cfbSeasonYear\(\)\)/.test(fn) && !/apis\/site\/v2/.test(fn));
T('…walks every entry it found and counts games from the record when needed', /\(res\.entries\|\|\[\]\)\.forEach/.test(fn) && /standingsGP\(stats\)/.test(fn));
const st = shared.slice(shared.indexOf('// 4) ESPN CFB standings'), shared.indexOf('// 5-7) CollegeFootballData'));
T('the Settings self-test reads the same helper, this season first', /fetchCFBStandings\(cur\)/.test(st) && /fetchCFBStandings\(cur-1\)/.test(st) && !/fetch\('https:\/\/site\.api\.espn\.com\/apis\/site\/v2/.test(st));
T('no other code still fetches the dead CFB standings path', (shared + fe).split('apis/site/v2/sports/football/college-football/standings').length - 1 === 1);
console.log(pass + ' pass / ' + fail + ' fail'); if (fail) process.exit(1);
