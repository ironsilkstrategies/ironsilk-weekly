/* v3.5.29 · Nov 26, 11:47 AM, Chris, with the CHI@DET and PHI@DAL Props panels: "I got are stats getting stuck loading".
   Most starters (Swift, Odunze, Gibbs, St. Brown, Barkley, Lamb…) sat on "loading stats…" for good; the QBs had a season number
   but no last 5; only rookies (Burden, Loveland, Cooper) had a last 5. Two causes, both reproduced from the phone's own data:
   1. the game-log cache dropped its overflow by key order, and number-like ESPN ids list smallest first, so every veteran's log
      was deleted a moment after it loaded (the cache was full of two-month-old college logs that were never dropped);
   2. ESPN's league-wide stat feed answered passing only (85 passers) at 7:12 AM and that partial load was kept 12 hours. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 900))); };
let html = fs.readFileSync(path.join(W, 'nfl.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-26T17:47:00Z');
const STARTERS = {
  CHI: [['4431611', 'Caleb Williams', 'QB'], ['4259545', "D'Andre Swift", 'RB'], ['4685278', 'Luther Burden III', 'WR'], ['4431299', 'Rome Odunze', 'WR'], ['4723086', 'Colston Loveland', 'TE']],
  DET: [['3046779', 'Jared Goff', 'QB'], ['4429795', 'Jahmyr Gibbs', 'RB'], ['4374302', 'Amon-Ra St. Brown', 'WR'], ['4426388', 'Jameson Williams', 'WR'], ['4430027', 'Sam LaPorta', 'TE']]
};
const POS = {}; Object.values(STARTERS).flat().forEach(([id, , pos]) => POS[id] = pos);
/* an ESPN-shaped game log: 11 regular-season games (newest first, one a week back from Nov 23) plus two preseason games */
function gamelog(id) {
  const pos = POS[id] || 'WR';
  const names = pos === 'QB' ? ['completions', 'passingAttempts', 'passingYards', 'passingTouchdowns', 'rushingYards'] : pos === 'RB' ? ['rushingAttempts', 'rushingYards', 'receptions', 'receivingYards'] : ['receptions', 'receivingTargets', 'receivingYards', 'rushingYards'];
  const base = pos === 'QB' ? 250 : pos === 'RB' ? 80 : 60;
  const events = {}, reg = [], pre = [];
  for (let i = 0; i < 11; i++) {
    const eid = id + '-' + i, d = new Date(Date.parse('2026-11-23T18:00:00Z') - i * 7 * 864e5).toISOString(); events[eid] = { gameDate: d, opponent: { abbreviation: 'GB' } };
    const y = base + (i % 3) * 10;   // 250/260/270… so the season and last-5 averages differ a little
    reg.push({ eventId: eid, stats: pos === 'QB' ? ['22', '33', String(y), '2', '12'] : pos === 'RB' ? ['18', String(y), '3', '20'] : ['5', '7', String(y), '0'] });
  }
  for (let i = 0; i < 2; i++) { const eid = id + '-p' + i; events[eid] = { gameDate: '2026-08-1' + i + 'T18:00:00Z', opponent: { abbreviation: 'KC' } }; pre.push({ eventId: eid, stats: pos === 'QB' ? ['5', '9', '999', '0', '0'] : pos === 'RB' ? ['4', '999', '1', '9'] : ['1', '2', '999', '0'] }); }
  return { names, events, seasonTypes: [{ displayName: '2026 Regular Season', categories: [{ displayName: 'Regular Season Stats', events: reg }] }, { displayName: '2026 Preseason', categories: [{ displayName: 'Preseason', events: pre }] }] };
}
/* ESPN's league-wide feed (one request per category; each athlete carries every category's totals) */
function byathlete(cat) {
  const A = [];
  const add = (id, name, pos, gp, py, ry, rc, cy) => A.push({ athlete: { id, displayName: name, position: { abbreviation: pos } }, categories: [{ name: 'general', totals: [String(gp)] }, { name: 'passing', totals: [String(py)] }, { name: 'rushing', totals: [String(ry)] }, { name: 'receiving', totals: [String(rc), String(cy)] }] });
  if (cat === 'passing') { add('4431611', 'Caleb Williams', 'QB', 10, 2600, 150, 0, 0); add('3046779', 'Jared Goff', 'QB', 11, 2800, 20, 0, 0); }
  if (cat === 'rushing') { add('4429795', 'Jahmyr Gibbs', 'RB', 11, 0, 1100, 40, 300); add('4259545', "D'Andre Swift", 'RB', 11, 0, 800, 25, 200); }
  if (cat === 'receiving') { add('4374302', 'Amon-Ra St. Brown', 'WR', 11, 0, 0, 80, 990); }
  return { categories: [{ name: 'general', names: ['gamesPlayed'] }, { name: 'passing', names: ['passingYards'] }, { name: 'rushing', names: ['rushingYards'] }, { name: 'receiving', names: ['receptions', 'receivingYards'] }], athletes: A };
}
const MODE = {}, SS = { passing: 'ok', rushing: 'ok', receiving: 'ok' }; let fetched = [];
const ok = o => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(o) });
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nfl.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true;
  x.fetch = u => { u = String(u); fetched.push(u);
    let m = u.match(/athletes\/(\d+)\/gamelog/);
    if (m) { const md = MODE[m[1]] || 'ok'; if (md === 'fail') return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) }); if (md === 'err404') return ok({ code: 404, message: 'Not Found' }); if (md === 'hang') return new Promise(() => { });
      if (md === 'empty') return ok({ names: ['receptions', 'receivingYards'], events: {}, seasonTypes: [] }); return ok(gamelog(m[1])); }
    m = u.match(/statistics\/byathlete.*category=offense:(\w+)/);
    if (m) { const md = SS[m[1]]; if (md === 'fail') return Promise.resolve({ ok: false, status: 502, json: () => Promise.resolve({}) }); if (md === 'hang') return new Promise(() => { }); return ok(byathlete(m[1])); }
    return ok({}); };
  x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
const sleep = ms => new Promise(r => setTimeout(r, ms));
setTimeout(async () => { try {
  const E = s => w.eval(s), J = JSON.stringify, P = s => JSON.parse(E(s));
  const G = { id: '401873100', espnId: '401873100', away: { abbr: 'CHI' }, home: { abbr: 'DET' }, abstract: 'pre' };
  E(`NFL_DEPTH=${J(Object.fromEntries(Object.entries(STARTERS).map(([ab, L]) => [ab, { players: L.map(([id, name, pos]) => ({ id, name, pos, depth: 1 })) }])))};
     NFL_GAMES=[${J(G)}];NFL_SIMS={};NFL_POWER={};NFL_SEASON=2026;
     (()=>{const d=document.createElement('div');d.id='nflform-${G.id}';document.body.appendChild(d);})();`);
  const panel = () => E(`document.getElementById('nflform-${G.id}').innerHTML`).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const ids = Object.values(STARTERS).flat().map(x => x[0]);

  /* ── 1 · the phone's cache, as it was at 11:50 AM: 98 college logs and 52 high-id NFL logs, nothing older than a day here ── */
  const seed = {}; for (let i = 0; i < 98; i++) seed['cfb:' + (5000000 + i)] = { ts: NOW - (20 - i / 10) * 36e5, v: [{ id: 'c' + i, rush: 50 }] };
  for (let i = 0; i < 52; i++) seed[String(4569987 + i * 10000)] = { ts: NOW - 36e5, v: [{ id: 'n' + i, rec: 40 }] };
  /* the old prune, run on a copy (same JavaScript key order the phone uses): only the high ids live */
  const old = JSON.parse(J(seed)); ids.forEach(id => { old[id] = { ts: NOW, v: [1] }; const ks = Object.keys(old); if (ks.length > 150) ks.slice(0, ks.length - 150).forEach(k => delete old[k]); });
  T('before the fix: the old key-order prune keeps only the rookies (Burden, Loveland) and drops every veteran it just loaded', J(ids.filter(id => old[id])) === J(['4685278', '4723086']), J(ids.filter(id => old[id])));
  E(`set(NFL_FORM_KEY,${J(seed)});set(NFL_SEASONSTATS_KEY,{});NFL_SEASONSTATS={};`);
  SS.passing = SS.rushing = SS.receiving = 'fail';      // the league feed down entirely: the game logs alone must carry the panel
  await w.eval(`nflLoadForm(NFL_GAMES[0])`);
  const C1 = P(`JSON.stringify(get(NFL_FORM_KEY,{}))`);
  T('every starter\'s game log survives the save, veterans included (Goff 3046779, Swift, Gibbs, St. Brown)', ids.every(id => C1[id] && C1[id].v.length === 8), J(ids.filter(id => !C1[id])));
  T('…the cache stays at 150 and the oldest by load time went first (the 20-hour-old college logs, not the 1-hour-old NFL ones)', Object.keys(C1).length === 150 && !C1['cfb:5000000'] && C1[String(4569987)] !== undefined, Object.keys(C1).length);
  const txt1 = panel();
  T('the panel: every starter has a projection, nobody stuck on "loading stats…"', !/loading stats/.test(txt1) && Object.values(STARTERS).flat().every(([, n]) => txt1.includes(n + ' ')) && (txt1.match(/proj /g) || []).length === 2 + 2 + 6 * 2, txt1);
  /* season numbers from the game log itself (11 regular-season games; the two preseason games, at 999, don't count) */
  const props = P(`JSON.stringify(nflModelProps(NFL_GAMES[0],null))`);
  const gibbs = props.find(x => x.pid === '4429795'), goff = props.find(x => x.pid === '3046779');
  const reg = i => (i % 3) * 10, avg = (b, n) => { let s = 0; for (let i = 0; i < n; i++) s += b + reg(i); return +(s / n).toFixed(1); };
  T('with ESPN\'s league feed down, "season X/g" comes from the player\'s own game log: Gibbs 11 games, preseason left out', gibbs && gibbs.gp === 11 && gibbs.seasonPG === avg(80, 11) && gibbs.last5 === avg(80, 5), J(gibbs));
  T('…and the QBs get their last 5 back (it read "last5 —" on the phone)', goff && goff.last5 === avg(250, 5) && goff.seasonPG === avg(250, 11), J(goff));
  T('a game log stores the whole season (games, yards) beside the last 8 games', J(C1['4429795'].s) === J({ gp: 11, pass: null, rush: 80 * 11 + (0 + 10 + 20) * 3 + 0 + 10, rec: 220, recs: 33 }), J(C1['4429795'].s));

  /* ── 2 · the league feed, partial then whole ── */
  E(`set(NFL_SEASONSTATS_KEY,{season:2026,ts:Date.now()-4.6*36e5,v:{'4431611':{name:'Caleb Williams',pos:'QB',gp:7,pass:1727,rush:90,rec:0,recs:0}}});NFL_SEASONSTATS={};`);
  SS.passing = 'ok'; SS.rushing = 'fail'; SS.receiving = 'fail'; fetched = [];
  await w.eval('nflLoadSeasonStats()');
  const nSS = () => fetched.filter(u => /byathlete/.test(u)).length;
  T('the phone\'s 7:12 AM load (no "all three feeds answered" mark) is retried, not trusted for 12 hours', nSS() === 3, nSS());
  const c2 = P(`JSON.stringify(get(NFL_SEASONSTATS_KEY,{}))`);
  T('a partial answer is kept and marked partial (1 of 3 feeds), merged over what was there', c2.ok === 1 && c2.v['4431611'].gp === 10 && c2.v['3046779'] && E(`NFL_SEASONSTATS_STATUS`).includes('1/3 feeds answered'), J({ ok: c2.ok, n: Object.keys(c2.v || {}).length, st: E('NFL_SEASONSTATS_STATUS') }));
  fetched = []; await w.eval('nflLoadSeasonStats()');
  T('…within 30 minutes it isn\'t pulled again (the feeds run 4 MB or more each)', nSS() === 0 && /retrying soon/.test(E('NFL_SEASONSTATS_STATUS')), E('NFL_SEASONSTATS_STATUS'));
  E(`(()=>{const c=get(NFL_SEASONSTATS_KEY,{});c.ts=Date.now()-31*6e4;set(NFL_SEASONSTATS_KEY,c);})()`); SS.rushing = SS.receiving = 'ok';
  fetched = []; await w.eval('nflLoadSeasonStats()');
  const c3 = P(`JSON.stringify(get(NFL_SEASONSTATS_KEY,{}))`);
  T('…after 30 minutes it tries again, and a whole answer is marked whole', nSS() === 3 && c3.ok === 3 && c3.v['4429795'] && c3.v['4374302'] && /^loaded /.test(E('NFL_SEASONSTATS_STATUS')), J({ n: nSS(), ok: c3.ok, st: E('NFL_SEASONSTATS_STATUS') }));
  fetched = []; await w.eval('nflLoadSeasonStats()');
  T('…and a whole answer is kept 12 hours', nSS() === 0 && /^cached \d+ players$/.test(E('NFL_SEASONSTATS_STATUS')), E('NFL_SEASONSTATS_STATUS'));
  SS.rushing = 'fail'; E(`(()=>{const c=get(NFL_SEASONSTATS_KEY,{});c.ts=Date.now()-13*36e5;set(NFL_SEASONSTATS_KEY,c);})()`); fetched = []; await w.eval('nflLoadSeasonStats()');
  const c4 = P(`JSON.stringify(get(NFL_SEASONSTATS_KEY,{}))`);
  T('a later partial answer doesn\'t throw away yesterday\'s backs and receivers', c4.ok === 2 && c4.v['4429795'] && c4.v['4259545'], J(Object.keys(c4.v || {})));
  E(`set(NFL_SEASONSTATS_KEY,{});NFL_SEASONSTATS={};`); SS.rushing = 'ok'; fetched = [];
  await Promise.all([w.eval('nflLoadSeasonStats()'), w.eval('nflLoadSeasonStats()')]);
  T('two Props panels opening together share one load (3 requests, not 6)', nSS() === 3, nSS());
  /* the league feed, when it has seen more games, wins; when the game log has seen more (last night\'s game), the log wins */
  E(`NFL_SEASONSTATS['4429795']={name:'Jahmyr Gibbs',pos:'RB',gp:10,rush:1000};NFL_SEASONSTATS['4374302']={name:'Amon-Ra St. Brown',pos:'WR',gp:12,rec:1200,recs:96};`);
  const p2 = P(`JSON.stringify(nflModelProps(NFL_GAMES[0],null))`);
  const g2 = p2.find(x => x.pid === '4429795'), a2 = p2.find(x => x.k === 'rec' && x.pid === '4374302');
  T('season source: whichever has seen more games (game log 11 > feed 10 for Gibbs; feed 12 > log 11 for St. Brown)', g2.gp === 11 && g2.seasonPG === avg(80, 11) && a2.gp === 12 && a2.seasonPG === 100, J({ g2, a2 }));

  /* ── 3 · what a row says while it has no numbers ── */
  E(`NFL_SEASONSTATS={};set(NFL_SEASONSTATS_KEY,{season:2026,ts:Date.now(),v:{'1':{gp:1}},ok:3});(()=>{const C=get(NFL_FORM_KEY,{});['4429795','4723086','4431299','4430027'].forEach(k=>delete C[k]);set(NFL_FORM_KEY,C);})()`);
  MODE['4429795'] = 'fail'; MODE['4723086'] = 'empty'; MODE['4431299'] = 'err404'; MODE['4430027'] = 'hang';
  const run = w.eval(`nflLoadForm(NFL_GAMES[0])`); await sleep(400);
  const txt3 = panel();
  T('while a log is still coming: "loading stats…" for that player only, the rest already filled in (no waiting on the slowest)', /Sam LaPorta TE · loading stats…/.test(txt3) && /Jared Goff QB · Pass Yds proj/.test(txt3), txt3);
  T('a log that failed says so (Gibbs: "stats didn\'t load"), with a Retry button, instead of "loading" forever', /Jahmyr Gibbs RB · stats didn't load/.test(txt3) && /↻ Retry stats/.test(txt3), txt3);
  T('ESPN\'s error page ({code:404}) counts as a failed load, not as "no games", and isn\'t kept', /Rome Odunze WR · stats didn't load/.test(txt3) && !P(`JSON.stringify(Object.keys(get(NFL_FORM_KEY,{})))`).includes('4431299'), txt3);
  T('a player with no games logged this season says that', /Colston Loveland TE · no games logged this season/.test(txt3), txt3);
  MODE['4429795'] = 'ok'; MODE['4431299'] = 'ok'; fetched = [];
  E(`nflRetryForm('${G.id}')`); await sleep(400);
  const txt4 = panel();
  T('Retry stats fetches the failed players again and fills them in', /Jahmyr Gibbs RB · Rush Yds proj/.test(txt4) && /Rome Odunze WR · Rec Yds proj/.test(txt4) && !/didn't load/.test(txt4) && fetched.some(u => /athletes\/4429795\/gamelog/.test(u)), txt4);
  T('…a log already loaded isn\'t fetched again (Goff stays cached)', !fetched.some(u => /athletes\/3046779\/gamelog/.test(u)), J(fetched.filter(u => /gamelog/.test(u))));
  void run;

  /* ── 4 · housekeeping ── */
  E(`(()=>{const C=get(NFL_FORM_KEY,{});C['cfb:1']={ts:Date.now()-60*864e5,v:[{rush:9}]};C['9']={ts:Date.now()-4*864e5,v:[{rec:9}]};set(NFL_FORM_KEY,C);})()`);
  await w.eval(`_nflPlayerFormFetch('4241389','nfl')`);
  const C5 = P(`JSON.stringify(get(NFL_FORM_KEY,{}))`);
  T('logs older than three days are cleared on the next save (the phone had college logs from late September)', !C5['cfb:1'] && !C5['9'] && C5['4241389'], J(Object.keys(C5).length));
  E(`(()=>{const C=get(NFL_FORM_KEY,{});C['4241389'].s=undefined;delete C['4241389'].s;set(NFL_FORM_KEY,C);})()`); fetched = [];
  await w.eval(`nflPlayerForm('4241389')`);
  T('a log saved before this update (no season totals) is fetched once more so the season line fills in', fetched.some(u => /athletes\/4241389\/gamelog/.test(u)), J(fetched));

  /* ── 5 · college: same cache, same fixes ── */
  const GC = { id: '401752999', espnId: '401752999', away: { abbr: 'UGA', id: '61' }, home: { abbr: 'BAMA', id: '333' } };
  const LD = { UGA: [{ id: '31', name: 'Nate Frazier', pos: 'RB', k: 'rush', total: 1200 }], BAMA: [] };
  E(`(()=>{const L=get(CFB_LEAD_KEY,{});L['${GC.id}']={ts:Date.now(),v:${J(LD)}};set(CFB_LEAD_KEY,L);
     const C=get(NFL_FORM_KEY,{});C['cfb:31']={ts:Date.now(),v:Array.from({length:8},(_,i)=>({id:'e'+i,date:'2026-11-'+(22-i),rush:100})),s:{gp:12,pass:null,rush:1200,rec:null,recs:null}};set(NFL_FORM_KEY,C);})()`);
  const cp = P(`JSON.stringify(cfbModelProps(${J(GC)},null))`)[0];
  T('college: season per game divides by every game this season (1,200 yds in 12 = 100/g), not by the 8 the cache keeps (it read 150)', cp && cp.seasonPG === 100 && cp.gp === 12, J(cp));
  E(`(()=>{const C=get(NFL_FORM_KEY,{});delete C['cfb:31'];set(NFL_FORM_KEY,C);const d=document.createElement('div');d.id='cfbform-${GC.id}';document.body.appendChild(d);})()`); fetched = [];
  await Promise.all([w.eval(`cfbLoadForm(${J(GC)})`), w.eval(`cfbLoadForm(${J(GC)})`)]);
  T('college: two loads at once share one fetch per player', fetched.filter(u => /college-football\/athletes\/31\/gamelog/.test(u)).length === 1, J(fetched));
  MODE['32'] = 'fail'; LD.UGA.push({ id: '32', name: 'Gunner Stockton', pos: 'QB', k: 'pass', total: 2000 });
  E(`(()=>{const L=get(CFB_LEAD_KEY,{});L['${GC.id}'].v=${J(LD)};set(CFB_LEAD_KEY,L);})()`);
  await w.eval(`cfbLoadForm(${J(GC)})`);
  const ct = E(`document.getElementById('cfbform-${GC.id}').innerHTML`).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  T('college: a failed log says "game log didn\'t load", not "loading game log…" forever', /Gunner Stockton QB · game log didn't load/.test(ct) && /Nate Frazier RB · Rush Yds proj/.test(ct), ct);

  T('version 3.5.29', E('DESK_VER') === '3.5.29', E('DESK_VER'));
} catch (e) { T('no exceptions', false, e && e.stack); }
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
}, 2500);
