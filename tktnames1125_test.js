/* v3.5.25 · Nov 25, 2:22 PM, Chris: "unrecognized teams ticket fixes now" — ticket 1018841082 lost its two Akron–Appalachian State legs
   ("App State" on ESPN's D1 list). A sweep of every common book spelling found 13 more college basketball names that read as nothing,
   two that read as the WRONG school (Louisiana State → Louisiana, North Carolina State → North Carolina), and 25 college football
   names filed under the wrong school by the drop-the-last-word fallback ("Texas Southern" → Texas, "Alabama State" → Alabama…). */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 900))); };
let html = fs.readFileSync(path.join(W, 'ncaab.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-25T20:20:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/ncaab.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
const TICKET = `Ticket Number:
1018841082
Accepted Date:
11/25/26
Amount:
$4.00
Status:
Pending
To win:
$83.08
Type:
Parlay
Description:
Basketball - NCAA - Akron vs Appalachian State - Parlay | 735 Akron -225 for GAME | 11/25/2026 03:00:00 PM (EST) | Pending
@ Neutral Court.
Basketball - NCAA - SE Louisiana vs North Dakota - Parlay | 767 SE Louisiana/North Dakota over 138½ -140 buying 2 for GAME | 11/25/2026 03:10:00 PM (EST) | Pending
Cancun Challenge - Final Round - Hard Rock Riviera Maya - Cancun, Mexico
Basketball - NCAA - Arkansas State vs Florida Intl - Parlay | 738 Florida Intl -130 for GAME | 11/25/2026 03:30:00 PM (EST) | Pending
Basketball - NCAA - Arkansas State vs Florida Intl - Parlay | 738 Arkansas State/Florida Intl under 179 -132 buying -2 for GAME | 11/25/2026 03:30:00 PM (EST) | Pending
Basketball - NCAA - SE Louisiana vs North Dakota - Parlay | 768 North Dakota +3 -154 buying -2 for GAME | 11/25/2026 03:10:00 PM (EST) | Pending
Cancun Challenge - Final Round - Hard Rock Riviera Maya - Cancun, Mexico
Basketball - NCAA - Akron vs Appalachian State - Parlay | 735 Akron/Appalachian State over 132½ -140 buying 2 for GAME | 11/25/2026 03:00:00 PM (EST) | Pending
@ Neutral Court.`;
setTimeout(() => { try {
  const E = s => w.eval(s), J = JSON.stringify;
  w.__TK = TICKET; const R = JSON.parse(E('JSON.stringify(parseMyTicketText(window.__TK))'));
  const t = JSON.parse(E('JSON.stringify(get(LS.locked,[]))')).find(x => x.id === 'ext1018841082');
  const legs = t ? t.legs.map(l => `${l.game} ${l.pick} ${l.price}`) : [];
  T('ticket 1018841082: all six legs on the ticket, none skipped', R.ok && R.legCount === 6 && !R.skipped.length, J(R));
  T('…the two Akron–Appalachian State legs are back (AKR@APP: Akron −225, over 132½ −140)', legs.includes('AKR@APP AKR ML -225') && legs.includes('AKR@APP Over 132.5 -140'), J(legs));
  T('…the rest as before, "buying 2" / "buying -2" dropped (the line shown is the bought line)', legs.includes('SELA@UND Over 138.5 -140') && legs.includes('SELA@UND UND +3 -154') && legs.includes('ARST@FIU FIU ML -130') && legs.includes('ARST@FIU Under 179 -132'), J(legs));
  T('…each leg keeps the book\'s start time (3:00 PM Eastern → 20:00Z)', t && t.legs.find(l => l.pick === 'AKR ML').start === '2026-11-25T20:00:00Z', J(t && t.legs[0]));
  const bb = n => E(`intakeAbbr('ncaab',${J(n)})`), fb = n => E(`intakeAbbr('ncaaf',${J(n)})`);
  const BB = { 'Appalachian State': 'APP', 'Appalachian St.': 'APP', 'Brigham Young': 'BYU', 'New Orleans': 'NOLA', 'New Jersey Tech': 'NJIT', 'Southern Illinois Edwardsville': 'SIUE', 'Southern Methodist': 'SMU', 'Texas Christian': 'TCU', 'TAMU Corpus Christi': 'AMCC', 'Virginia Military Institute': 'VMI', 'St. Thomas-Minnesota': 'STMN', 'Southeast Louisiana': 'SELA' };
  const bbBad = Object.entries(BB).filter(([n, a]) => bb(n) !== a).map(([n, a]) => `${n}: ${bb(n)} (want ${a})`);
  T('college basketball: 12 book spellings that read as nothing now find their school', !bbBad.length, bbBad.join(' | '));
  T('…and the two that found the WRONG school find the right one: Louisiana State is LSU (not Louisiana), North Carolina State is NC State (not North Carolina)', bb('Louisiana State') === 'LSU' && bb('North Carolina State') === 'NCSU' && bb('Louisiana') === 'UL' && bb('North Carolina') === 'UNC', J([bb('Louisiana State'), bb('North Carolina State')]));
  const FB = { 'Texas Southern': 'TXSO', 'Texas Christian': 'TCU', 'Texas El Paso': 'UTEP', 'Alabama State': 'ALST', 'Alabama A&M': 'AAMU', 'Alabama Birmingham': 'UAB', 'Tennessee State': 'TNST', 'Tennessee Tech': 'TNTC', 'Nevada Las Vegas': 'UNLV', 'Louisiana State': 'LSU', 'Virginia Military Institute': 'VMI', 'Illinois State': 'ILST', 'Utah Tech': 'UTU', 'Northwestern State': 'NWST', 'Houston Christian': 'HCU', 'Texas A&M Commerce': 'ETAM', 'Mississippi Valley State': 'MVSU', 'Arkansas Pine Bluff': 'UAPB', 'Florida A&M': 'FAMU', 'North Carolina A&T': 'NCAT', 'North Carolina Central': 'NCCU', 'South Carolina State': 'SCST', 'Delaware State': 'DSU', 'Cal Poly': 'CP', 'Southern Methodist': 'SMU' };
  const fbBad = Object.entries(FB).filter(([n, a]) => fb(n) !== a).map(([n, a]) => `${n}: ${fb(n)} (want ${a})`);
  T('college football: 25 names the fallback filed under the wrong school (Texas Southern → Texas, Alabama State → Alabama…) find their own', !fbBad.length, fbBad.join(' | '));
  const NK = { 'North Texas Mean Green': 'UNT', 'Ohio Bobcats': 'OHIO', 'Texas A&M Aggies': 'TA&M', 'Ole Miss Rebels': 'MISS', 'Hawaii Rainbow Warriors': 'HAW', 'Miami Hurricanes': 'MIA', 'Texas Longhorns': 'TEX', 'Alabama Crimson Tide': 'ALA', 'Nevada Wolf Pack': 'NEV', 'Tennessee Volunteers': 'TENN', 'North Carolina State Wolfpack': 'NCST' };
  const nkBad = Object.entries(NK).filter(([n, a]) => fb(n) !== a).map(([n, a]) => `${n}: ${fb(n)} (want ${a})`);
  T('…a school plus its own mascot still reads as that school (the nickname drop the fallback is for)', !nkBad.length, nkBad.join(' | '));
  T('…and the big names stay put (Ohio State, Texas A&M, Texas Tech, Florida State, Kansas State, Penn State)', fb('Ohio State') === 'OSU' && fb('Texas A&M') === 'TA&M' && fb('Texas Tech') === 'TTU' && fb('Florida State') === 'FSU' && fb('Kansas State') === 'KSU' && fb('Penn State') === 'PSU');
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 3000);
