/* v3.5.10 · Nov 23, 7:34 PM: "Has this game not started yet?" — SFA at Utah Valley tipped at 7:00 and the machine's college card
   still showed it pre-game. The live refresh re-downloaded three days of every D-I game from ESPN every 45 seconds; on a weak
   signal that pull dropped (or ran past the next one), and the card kept its pre-game copy. Now the live refresh pulls today's
   games only and folds them in by game, one pull at a time, and a pull that hangs gives up; the full schedule comes every
   10 minutes (and on open). */
const fs = require('fs'); const path = require('path'); const W = '/home/claude/work'; const { JSDOM, VirtualConsole } = require('jsdom');
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
let html = fs.readFileSync(path.join(W, 'ncaab.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
let NOW = Date.parse('2026-11-24T01:34:00Z');   /* Nov 23, 7:34 PM CT */
const errs = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(String(e && e.message || e)));
const URLS = []; let MODE = 'ok', HANG = null;
const team = (id, ab, name) => ({ id, abbreviation: ab, shortDisplayName: name, displayName: name, name });
const ev = (id, date, a, h, state, as, hs, per = 0) => ({ id, date, season: { type: 2, slug: 'regular-season' }, competitions: [{ status: { period: per, clock: 600, type: { state, shortDetail: state === 'in' ? '10:00 - 2nd' : state === 'post' ? 'Final' : '7:00 PM CST' } },
  competitors: [{ homeAway: 'away', team: a, score: as == null ? '' : String(as), linescores: as == null ? [] : [{ value: Math.floor(as / 2) }] }, { homeAway: 'home', team: h, score: hs == null ? '' : String(hs), linescores: hs == null ? [] : [{ value: Math.floor(hs / 2) }] }] }] });
const SFA = team('2617', 'SFA', 'Stephen F. Austin'), UVU = team('3084', 'UVU', 'Utah Valley'), TEM = team('218', 'TEM', 'Temple'), UTM = team('2630', 'UTM', 'UT Martin'), HAW = team('62', 'HAW', 'Hawaii'), UCR = team('27', 'UCR', 'UC Riverside'), DUKE = team('150', 'DUKE', 'Duke'), UNC = team('153', 'UNC', 'North Carolina');
const RANGE = [ev('401', '2026-11-24T01:00Z', SFA, UVU, 'pre'), ev('402', '2026-11-24T00:00Z', TEM, UTM, 'in', 50, 48, 2),
  ev('403', '2026-11-24T05:30Z', UCR, HAW, 'pre'),                        /* 11:30 PM CT: on ESPN's next day, still tonight here */
  ev('404', '2026-11-25T00:00Z', DUKE, UNC, 'pre')];                       /* tomorrow */
const TODAY = [ev('401', '2026-11-24T01:00Z', SFA, UVU, 'in', 31, 28, 2), ev('402', '2026-11-24T00:00Z', TEM, UTM, 'post', 77, 70, 2)];
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/ncaab.html', pretendToBeVisual: true, virtualConsole: vc, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD;
  x.__NO_GRADELOOP__ = true; x.__NO_BACKFILL__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = (u, o) => { u = String(u); if (/mens-college-basketball\/scoreboard/.test(u)) { URLS.push(u);
      if (MODE === 'drop') return Promise.reject(new TypeError('Load failed'));
      if (MODE === 'hang') return new Promise((res, rej) => { HANG = { res, rej }; if (o && o.signal) o.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))); });
      const range = /dates=\d{8}-\d{8}/.test(u); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ events: range ? RANGE : TODAY }) }); }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('{}') }); };
  x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.prompt = () => null; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(async () => { try {
  const E = s => w.eval(s); const e0 = errs.length;
  const td = E('today()'); T('the clock reads Nov 23 (Central)', td === '2026-11-23', td);
  const st = () => JSON.parse(E(`JSON.stringify({games:bbC('ncaab').games.map(g=>[g.id,g.abstract,g.awayScore,g.homeScore]),up:bbC('ncaab').up.map(g=>g.id)})`));
  /* the full pull (on open): three days, every game */
  URLS.length = 0; await E(`bbLoadSchedule(bbC('ncaab'))`); let S = st();
  T('on open: the full pull, today and the next two days (range)', URLS.length === 1 && /dates=20261123-20261125/.test(URLS[0]) && JSON.stringify(S.games.map(g => g[0])) === '["402","401","403"]' && JSON.stringify(S.up) === '["404"]', JSON.stringify([URLS, S]));
  T('…SFA at Utah Valley reads pre-game before the tip', JSON.stringify(S.games.find(g => g[0] === '401')) === '["401","pre",null,null]', JSON.stringify(S.games));
  /* the live pull: today only */
  URLS.length = 0; const r = await E(`bbLoadSchedule(bbC('ncaab'),true)`); S = st();
  T('the live refresh asks ESPN for today\'s games only (one day, not three)', r === true && URLS.length === 1 && /dates=20261123(&|$)/.test(URLS[0]) && !/dates=\d{8}-/.test(URLS[0]) && /groups=50/.test(URLS[0]), JSON.stringify(URLS));
  T('…and the card goes live: SFA 31, Utah Valley 28 in the 2nd half; Temple–UT Martin is final', JSON.stringify(S.games.find(g => g[0] === '401')) === '["401","in",31,28]' && JSON.stringify(S.games.find(g => g[0] === '402')) === '["402","post",77,70]', JSON.stringify(S.games));
  T('…a game tonight that ESPN files under tomorrow (11:30 PM tip) stays on the card; tomorrow\'s list is untouched', S.games.some(g => g[0] === '403') && JSON.stringify(S.up) === '["404"]', JSON.stringify(S));
  T('…the final goes on the record for grading', E(`(()=>{const R=get(bbC('ncaab').res,{})||{};return JSON.stringify(R).includes('77')})()`) === true);
  /* a dropped pull keeps the card as it was */
  MODE = 'drop'; URLS.length = 0; const r2 = await E(`bbLoadSchedule(bbC('ncaab'),true)`); S = st();
  T('a live pull that drops ("Load failed") changes nothing and says so (false)', r2 === false && JSON.stringify(S.games.find(g => g[0] === '401')) === '["401","in",31,28]', JSON.stringify([r2, S.games]));
  /* the loop: one pull at a time; today's games every tick, the full schedule every 10 minutes */
  MODE = 'hang'; let tick = null; w.setInterval = (f) => { tick = f; return 77; }; w.clearInterval = () => { };
  E(`bbLiveLoop('ncaab')`); URLS.length = 0;
  const p1 = tick(); await new Promise(res => setTimeout(res, 30)); const p2 = tick(); await new Promise(res => setTimeout(res, 30));
  T('one pull at a time: a slow pull isn\'t stacked on (the next tick waits its turn)', URLS.length === 1 && /dates=20261123(&|$)/.test(URLS[0]), JSON.stringify(URLS));
  HANG.res({ ok: true, status: 200, json: () => Promise.resolve({ events: TODAY }) }); await p1; await p2;
  MODE = 'ok'; URLS.length = 0; await tick();
  T('…once it lands, the next tick pulls again (today only)', URLS.length === 1 && /dates=20261123(&|$)/.test(URLS[0]), JSON.stringify(URLS));
  NOW += 11 * 60e3; URLS.length = 0; await tick();
  T('…and every 10 minutes the full schedule comes too (tomorrow\'s games, lines)', URLS.length === 1 && /dates=20261123-20261125/.test(URLS[0]), JSON.stringify(URLS));
  URLS.length = 0; await tick();
  T('…then back to today only', URLS.length === 1 && !/dates=\d{8}-/.test(URLS[0]), JSON.stringify(URLS));
  /* a pull that hangs gives up */
  MODE = 'hang'; const st0 = w.setTimeout; w.setTimeout = (f, ms) => st0(f, Math.min(ms || 0, 30));
  const r3 = await E(`bbLoadSchedule(bbC('ncaab'),true)`); w.setTimeout = st0;
  T('a pull that hangs on a weak signal gives up on its own (it used to sit there)', r3 === false, String(r3));
  T('no errors along the way', errs.length === e0, errs.slice(e0).join(' | '));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 2500);
