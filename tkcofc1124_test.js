/* v3.5.17 · Nov 24, 7:08 PM, Chris: "This ticket is reading one unrecognized" — ticket 1018641748, ten legs, and "UTEP vs Coll Of
   Charleston" fell off ("team name not recognized"). The book spells College of Charleston "Coll Of Charleston"; the resolver knew "Col Of"
   and "College Of", and its last resort tied Charleston with Charleston Southern. "Coll" now reads as "College" anywhere in a name. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 600))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-25T01:00:00Z');
const TICKET = `Ticket Number:
1018641748
Accepted Date:
11/24/26
Amount:
$2.50
Status:
Pending
To win:
$330.20
Type:
Parlay
Description:
Basketball - NCAA - Sam Houston vs Washington State - Parlay | 665 Sam Houston +200 for GAME | 11/24/2026 09:00:00 PM (EST) | Pending
Hockey - NHL - Vegas Golden Knights vs Edmonton Oilers - Parlay | 26 Edmonton Oilers +1½ -245 for GAME | 11/24/2026 08:07:00 PM (EST) | Pending
Football - NCAA - Miami Ohio vs Western Michigan - Parlay | 102 Western Michigan -215 for GAME | 11/24/2026 07:00:00 PM (EST) | Pending
Basketball - NBA - Dallas Mavericks vs Denver Nuggets - Parlay | 505 Dallas Mavericks +11 -169 buying -2½ for GAME | 11/24/2026 10:10:00 PM (EST) | Pending
Basketball - NCAA - IPFW vs SE Missouri State - Parlay | 650 SE Missouri State -152 for GAME | 11/24/2026 07:30:00 PM (EST) | Pending
Basketball - NCAA - Oral Roberts vs UT Arlington - Parlay | 654 UT Arlington -205 for GAME | 11/24/2026 08:00:00 PM (EST) | Pending
Basketball - NCAA - Drexel vs Pennsylvania - Parlay | 658 Pennsylvania -250 for GAME | 11/24/2026 08:00:00 PM (EST) | Pending
Basketball - NCAA - UTEP vs Coll Of Charleston - Parlay | 702 Coll Of Charleston -128 for GAME | 11/24/2026 08:30:00 PM (EST) | Pending
Cancun Challenge - Semifinal Round @ Hard Rock Riviera Maya - Cancun, Mexico
Basketball - NCAA - Va Commonwealth vs Colorado State - Parlay | 677 Va Commonwealth -235 for GAME | 11/24/2026 10:30:00 PM (EST) | Pending
Maui Invitational - Second Round - Lahaina Civic Center - Maui, HI.
Basketball - NCAA - Colorado vs Stanford - Parlay | 670 Stanford -185 for GAME | 11/24/2026 11:59:00 PM (EST) | Pending
@ Neutral Court.`;
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  const E = s => w.eval(s); w.__T = TICKET;
  const r = JSON.parse(E('JSON.stringify(parseMyTicketText(window.__T))')), t = JSON.parse(E(`JSON.stringify(get(LS.locked,[]).find(x=>x.id==='ext1018641748'))`));
  T('all ten legs read, nothing unrecognized (the venue lines under two legs are ignored)', r.ok && r.legCount === 10 && r.skipped.length === 0 && t && t.legs.length === 10, JSON.stringify(r));
  const leg = g => t.legs.find(l => l.game === g) || {};
  T('the leg that fell off: UTEP vs Coll Of Charleston → Charleston ML −128, 8:30 PM Eastern', leg('UTEP@COFC').pick === 'COFC ML' && leg('UTEP@COFC').price === -128 && leg('UTEP@COFC').start === '2026-11-25T01:30:00Z', JSON.stringify(leg('UTEP@COFC')));
  T('the others as before: Oilers +1.5 −245, Mavericks +11 −169 (the bought line), Western Michigan ML −215 (football), Purdue Fort Wayne vs SEMO, VCU', leg('VGK@EDM').pick === 'EDM +1.5' && leg('VGK@EDM').price === -245 && leg('DAL@DEN').pick === 'DAL +11' && leg('DAL@DEN').price === -169 && leg('M-OH@WMU').pick === 'WMU ML' && leg('M-OH@WMU').sport === 'ncaaf' && leg('PFW@SEMO').pick === 'SEMO ML' && leg('VCU@CSU').pick === 'VCU ML', JSON.stringify(t.legs.map(l => [l.sport, l.game, l.pick, l.price])));
  T('the stake and the payout stay the book\'s ($2.50 to win $330.20)', t.stake === '2.5' && t.toWin === '330.2', JSON.stringify([t.stake, t.toWin]));
  const ab = n => E(`intakeAbbr('ncaab',${JSON.stringify(n)})`);
  T('"Coll" reads as "College" anywhere: Coll Of Charleston, Col Of Charleston, College of Charleston → Charleston; Boston Coll → Boston College; Charleston Southern stays itself', ab('Coll Of Charleston') === 'COFC' && ab('Col Of Charleston') === 'COFC' && ab('College of Charleston') === 'COFC' && ab('Boston Coll') === 'BC' && ab('Charleston Southern') === 'CHSO' && ab('Charleston So') === 'CHSO', JSON.stringify(['Coll Of Charleston', 'Boston Coll', 'Charleston Southern'].map(ab)));
  w.__T2 = TICKET; const r2 = JSON.parse(E('JSON.stringify(parseMyTicketText(window.__T2))'));
  T('pasting the ticket again replaces it in place (that\'s how the phone\'s copy picks up the tenth leg)', r2.ok && r2.replaced === true && JSON.parse(E(`JSON.stringify(get(LS.locked,[]).filter(x=>x.id==='ext1018641748').length)`)) === 1, JSON.stringify(r2));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 2500);
