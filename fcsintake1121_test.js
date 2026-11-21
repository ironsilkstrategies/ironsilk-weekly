/* v3.1.8 · Nov 21, Chris: "the machine not recognizing a pick on this ticket on intake" — ticket 1017510877 came in with 9 of 10
   legs: "Northern Illinois vs North Dakota State … under 45½" was skipped (team name not recognized). North Dakota State plays FCS
   football; off the CFB page the only football names were the FBS list. A college football name that reads as nothing now tries
   the CFB weeks the CFB page keeps (ESPN's own names and codes), then the D1 school list. Names that already resolved don't move. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const TICKET = `Ticket Number:
1017510877
Accepted Date:
11/21/26
Amount:
$1.00
Status:
Pending
To win:
$190.33
Type:
Parlay
Description:
Football - NCAA - Florida International vs Kennesaw State - Parlay | 398 Florida International/Kennesaw State under 46 -145 buying -2 for GAME | 11/21/2026 03:00:00 PM (EST) | Pending
Football - NCAA - Texas A&M vs Oklahoma - Parlay | 372 Texas A&M/Oklahoma under 38½ -147 buying -2 for GAME | 11/21/2026 03:45:00 PM (EST) | Pending
Football - NCAA - UCLA vs Michigan - Parlay | 402 UCLA/Michigan under 38½ -150 buying -2 for GAME | 11/21/2026 03:30:00 PM (EST) | Pending
Football - NCAA - LSU vs Tennessee - Parlay | 408 LSU/Tennessee under 47½ -150 buying -2 for GAME | 11/21/2026 03:30:00 PM (EST) | Pending
Football - NCAA - UNLV vs San Jose State - Parlay | 426 UNLV/San Jose State under 49½ -140 buying -2 for GAME | 11/21/2026 07:00:00 PM (EST) | Pending
Football - NCAA - Northern Illinois vs North Dakota State - Parlay | 418 Northern Illinois/North Dakota State under 45½ -110 for GAME | 11/21/2026 04:00:00 PM (EST) | Pending
Hockey - NHL - Minnesota Wild vs Vancouver Canucks - Parlay | 79 Minnesota Wild -270 for GAME | 11/21/2026 10:07:00 PM (EST) | Pending
Football - NCAA - Texas Tech vs Baylor - Parlay | 366 Texas Tech/Baylor under 59½ -150 buying -2 for GAME | 11/21/2026 03:30:00 PM (EST) | Pending
Football - NCAA - Delaware vs New Mexico State - Parlay | 396 Delaware/New Mexico State under 55½ -150 buying -2 for GAME | 11/21/2026 03:00:00 PM (EST) | Pending
Football - NCAA - Hawaii vs Nevada - Parlay | 390 Hawaii/Nevada under 40½ -105 for GAME | 11/21/2026 10:30:00 PM (EST) | Pending`;
const SGP = `Ticket Number:
1017599001
Accepted Date:
11/21/26
Amount:
$1.00
Status:
Pending
To win:
$12.00
Type:
SGPs Combined
Description:
2 Leg Parlay (Includes 1 SGPs)
SGP 1: FOOTBALL - NCAA - Northern Illinois v North Dakota State
Total points - Under 45.5 (Game)
Spread - Bison -24.5 (Game)`;
const NOW = Date.parse('2026-11-21T19:40:00Z');
function page(file, seed) {
  let html = fs.readFileSync(path.join(W, file), 'utf8');
  html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
  return new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/' + file, pretendToBeVisual: true, beforeParse(x) {
    const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
    x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1');
    if (seed) for (const [k, v] of Object.entries(seed)) x.localStorage.setItem(k, JSON.stringify(v)); } }).window;
}
const legsOf = (w, id) => w.eval(`(get(LS.locked,[])||[]).find(t=>t.id==='${id}')`);
const w1 = page('nhl.html'), w2 = page('cfb.html');
/* the CFB page's own week, with a team whose football code differs from its basketball code, and a name two teams share */
const team = (abbr, location, name, shortName) => ({ abbr, location, name, shortName });
const WEEK = { '2026|13': { season: 2026, week: 13, ts: NOW - 36e5, v: [
  { away: team('NIU', 'Northern Illinois', 'Northern Illinois Huskies', 'N Illinois'), home: team('NDST', 'North Dakota State', 'North Dakota State Bison', 'N Dakota St') },
  { away: team('AAA', 'Twin Name', 'Twin Name Ones', 'Twin'), home: team('BBB', 'Twin Name', 'Twin Name Twos', 'Twin') }] } };
const w3 = page('nhl.html', { 'd4.ncaafgames': WEEK });
setTimeout(() => { try {
  for (const [w, pg] of [[w1, 'nhl.html'], [w2, 'cfb.html']]) {
    w.__T = TICKET; const r = w.eval('parseMyTicketText(window.__T)'); const t = legsOf(w, 'ext1017510877'); const L = t ? t.legs : [];
    const nd = L.find(l => l.game === 'NIU@NDSU');
    T(`[${pg}] ticket 1017510877: all 10 legs, nothing skipped`, r.ok && r.legCount === 10 && !(r.skipped || []).length && L.length === 10, JSON.stringify([r.legCount, r.skipped]));
    T(`[${pg}] …the leg that fell off: NIU@NDSU Under 45.5 at −110, college football, today, with its start`, !!nd && nd.pick === 'Under 45.5' && nd.price === -110 && nd.sport === 'ncaaf' && nd.gameDate === '2026-11-21' && !!nd.start, JSON.stringify(nd));
    T(`[${pg}] …and the other nine read as before (FIU@KENN Under 46, TA&M@OU Under 38.5, HAW@NEV Under 40.5, MIN ML −270)`, ['FIU@KENN|Under 46|-145', 'TA&M@OU|Under 38.5|-147', 'UCLA@MICH|Under 38.5|-150', 'LSU@TENN|Under 47.5|-150', 'UNLV@SJSU|Under 49.5|-140', 'MIN@VAN|MIN ML|-270', 'TTU@BAY|Under 59.5|-150', 'DEL@NMSU|Under 55.5|-150', 'HAW@NEV|Under 40.5|-105'].every(k => L.some(l => `${l.game}|${l.pick}|${l.price}` === k)), JSON.stringify(L.map(l => `${l.game}|${l.pick}|${l.price}`)));
  }
  /* paste it again: the same ticket updates (stake kept), still 10 */
  w1.__T = TICKET; const r2 = w1.eval('parseMyTicketText(window.__T)'); const t2 = legsOf(w1, 'ext1017510877');
  T('pasting the ticket again updates the same ticket: 10 legs, the $1 stake and $190.33 to win kept', r2.ok && r2.replaced === true && r2.legCount === 10 && t2.stake === '1' && t2.toWin === '190.33' && w1.eval(`(get(LS.locked,[])||[]).filter(t=>t.id==='ext1017510877').length`) === 1, JSON.stringify([r2.replaced, r2.legCount, t2 && t2.stake, t2 && t2.toWin]));
  /* FCS names, on a page with no football engine */
  const ab = (w, n) => w.eval(`intakeAbbr('ncaaf',${JSON.stringify(n)})`);
  const F = { 'North Dakota State': 'NDSU', 'N. Dakota St.': 'NDSU', 'South Dakota State': 'SDST', 'Montana State': 'MTST', 'Villanova': 'VILL', 'Idaho': 'IDHO', 'Samford': 'SAM' };
  T('FCS programs read now (North Dakota State, N. Dakota St., South Dakota State, Montana State, Villanova, Idaho, Samford)', Object.entries(F).every(([n, a]) => ab(w1, n) === a), JSON.stringify(Object.keys(F).map(n => [n, ab(w1, n)])));
  const B = { 'Florida International': 'FIU', 'Texas A&M': 'TA&M', 'Hawaii': 'HAW', 'San Jose State': 'SJSU', 'Kennesaw State': 'KENN', 'Delaware': 'DEL', 'Ohio State': 'OSU', 'Ohio': 'OHIO', 'Northern Illinois': 'NIU', 'Sacramento State': 'SAC' };
  T('names that read before read the same (FBS, Sacramento State, Ohio vs Ohio State)', Object.entries(B).every(([n, a]) => ab(w1, n) === a), JSON.stringify(Object.keys(B).map(n => [n, ab(w1, n)])));
  T('…and a name that isn\'t a school still reads as nothing', ab(w1, 'Hogwarts State') === null && ab(w1, 'Springfield Atoms') === null);
  /* the CFB page's own week wins over the D1 list (ESPN's football code), and a name two teams share counts for neither */
  T('a team in the weeks the CFB page keeps reads with that week\'s own code (NDST beats the D1 list\'s NDSU)', ab(w3, 'North Dakota State') === 'NDST' && ab(w3, 'N Dakota St') === 'NDST', JSON.stringify([ab(w3, 'North Dakota State'), ab(w3, 'N Dakota St')]));
  T('…a name two teams in those weeks share counts for neither', ab(w3, 'Twin Name') === null);
  T('…and an FBS name still reads from the FBS list first (Northern Illinois stays NIU)', ab(w3, 'Northern Illinois') === 'NIU');
  /* the SGP export reads the same names */
  w1.__S = SGP; const rs = w1.eval('parseSGPTicketText(window.__S)'); const ts = legsOf(w1, 'ext1017599001');
  T('an SGP with an FCS team in its header reads too (NIU@NDSU: Under 45.5 and the Bison spread)', rs.ok && rs.legCount === 2 && !!ts && ts.legs.every(l => l.game === 'NIU@NDSU') && ts.legs.some(l => /Under 45\.5/.test(l.pick)) && ts.legs.some(l => /NDSU -24\.5/.test(l.pick)), JSON.stringify([rs.ok, rs.legCount, rs.skipped, ts && ts.legs.map(l => l.game + ' ' + l.pick)]));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 500)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); }, 3000);
