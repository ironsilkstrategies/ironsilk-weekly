/* v3.5.7 · Nov 23, Chris: "Teams not recognized" — ticket 1018216728 (three college hoops legs) came in with 2: "San Jose State vs
   UC San Diego … San Jose State +1½" was skipped (team name not recognized). The D1 list spells it as ESPN does, "San José State",
   and the accent read as a gap. Every college hoops name now loses its accents first, and curly / Hawaiian apostrophes drop out like
   a straight one, on both sides of the match. Names that already resolved don't move. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const TICKET = `Ticket Number:
1018216728
Accepted Date:
11/23/26
Amount:
$5.00
Status:
Pending
To win:
$31.25
Type:
Parlay
Description:
Basketball - NCAA - Stephen F. Austin vs Utah Valley - Parlay | 879 Stephen F. Austin/Utah Valley over 145½ -105 for GAME | 11/23/2026 08:00:00 PM (EST) | Pending
Paradise Jam - Final Round @ Virgin Islands Sports and Fitness - St. Thomas, VI.
Basketball - NCAA - Temple vs Tennessee Martin - Parlay | 877 Temple/Tennessee Martin over 141½ -110 for GAME | 11/23/2026 05:30:00 PM (EST) | Pending
Paradise Jam - Final Round @ Virgin Islands Sports and Fitness - St. Thomas, VI.
Basketball - NCAA - San Jose State vs UC San Diego - Parlay | 891 San Jose State +1½ -107 for GAME | 11/23/2026 11:59:00 PM (EST) | Pending
Acrisure Series - Pod 4 Final Round - Acrisure Arena, Palm Springs, CA.`;
const NOW = Date.parse('2026-11-23T23:20:00Z');
function page(file, seed) {
  let html = fs.readFileSync(path.join(W, file), 'utf8');
  html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
  return new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/' + file, pretendToBeVisual: true, beforeParse(x) {
    const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
    x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1');
    if (seed) for (const [k, v] of Object.entries(seed)) x.localStorage.setItem(k, JSON.stringify(v)); } }).window;
}
const legsOf = (w, id) => w.eval(`(get(LS.locked,[])||[]).find(t=>t.id==='${id}')`);
const w1 = page('ncaab.html'), w2 = page('nba.html');
/* ESPN's own team list (what the CBB page keeps after a refresh) spells it with the accent too */
const w3 = page('nhl.html');
setTimeout(async () => { try {
  for (const [w, pg] of [[w1, 'ncaab.html'], [w2, 'nba.html']]) {
    w.__T = TICKET; const r = w.eval('parseMyTicketText(window.__T)'); const t = legsOf(w, 'ext1018216728'); const L = t ? t.legs : [];
    const sj = L.find(l => l.game === 'SJSU@UCSD');
    T(`[${pg}] ticket 1018216728: all 3 legs, nothing skipped`, r.ok && r.legCount === 3 && !(r.skipped || []).length && L.length === 3, JSON.stringify([r.legCount, r.skipped]));
    T(`[${pg}] …the leg that fell off: SJSU@UCSD, SJSU +1.5 at −107, college hoops, today (11:59 PM Eastern is 10:59 PM here), with its start`, !!sj && sj.pick === 'SJSU +1.5' && sj.price === -107 && sj.sport === 'ncaab' && sj.gameDate === '2026-11-23' && sj.start === '2026-11-24T04:59:00Z', JSON.stringify(sj));
    const want = ['SFA@UVU|Over 145.5|-105', 'TEM@UTM|Over 141.5|-110'];
    T(`[${pg}] …and the other two read as before (SFA@UVU Over 145.5 −105, TEM@UTM Over 141.5 −110)`, want.every(k => L.some(l => [l.game, l.pick, l.price].join('|') === k)), JSON.stringify(L.map(l => [l.game, l.pick, l.price])));
  }
  /* the message on the phone */
  w3.__T = TICKET; const r3 = await w3.eval('intakeText(window.__T,null,"auto","")');
  T('the intake message says 3 legs and nothing about a name it couldn\'t read', /3 legs/.test(r3.how) && !/not recognized|unrecognized|skipped/.test(r3.how), r3.how);
  /* paste it again: the same ticket updates (stake kept), still 3 */
  w1.__T = TICKET; const r2 = w1.eval('parseMyTicketText(window.__T)'); const t2 = legsOf(w1, 'ext1018216728');
  T('pasting the ticket again updates the same ticket: 3 legs, the $5 stake and $31.25 to win kept', r2.ok && r2.replaced === true && r2.legCount === 3 && t2.stake === '5' && t2.toWin === '31.25' && w1.eval(`(get(LS.locked,[])||[]).filter(t=>t.id==='ext1018216728').length`) === 1, JSON.stringify([r2.replaced, r2.legCount, t2 && t2.stake, t2 && t2.toWin]));
  const ab = (w, n) => w.eval(`intakeAbbr('ncaab',${JSON.stringify(n)})`);
  const SJ = ['San Jose State', 'San José State', 'San Jose St', 'San Jose St.', 'SAN JOSE STATE', 'San José St'];
  T('San José State reads from every spelling a book or ESPN uses (accent or not, State or St.)', SJ.every(n => ab(w1, n) === 'SJSU'), JSON.stringify(SJ.map(n => [n, ab(w1, n)])));
  const AP = { 'Saint Mary’s': 'SMC', "Saint Mary's": 'SMC', 'St. John’s': 'SJU', "Hawai'i": 'HAW', 'Hawaiʻi': 'HAW', 'Hawaii': 'HAW' };
  T('a curly or Hawaiian apostrophe reads like a straight one (Saint Mary’s, St. John’s, Hawaiʻi)', Object.entries(AP).every(([n, a]) => ab(w1, n) === a), JSON.stringify(Object.keys(AP).map(n => [n, ab(w1, n)])));
  const B = { 'Stephen F. Austin': 'SFA', 'Utah Valley': 'UVU', 'Temple': 'TEM', 'Tennessee Martin': 'UTM', 'UC San Diego': 'UCSD', 'Texas A&M': 'TA&M', 'Miami FL': 'MIA', 'Cal Riverside': 'UCR', 'Loyola Chicago': 'LUC', "Mount St. Mary's": 'MSM' };
  T('names that read before read the same (SFA, UVU, TEM, UTM, UCSD, TA&M, Miami FL, Cal Riverside, Loyola Chicago, Mount St. Mary\'s)', Object.entries(B).every(([n, a]) => ab(w1, n) === a), JSON.stringify(Object.keys(B).map(n => [n, ab(w1, n)])));
  T('…and a name that isn\'t a school still reads as nothing', ab(w1, 'Hogwarts State') === null && ab(w1, 'Springfield Atoms') === null);
  T('football reads San Jose State as before (SJSU)', w1.eval(`intakeAbbr('ncaaf','San Jose State')`) === 'SJSU');
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 500)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); }, 3000);
