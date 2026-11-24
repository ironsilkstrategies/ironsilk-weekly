/* v3.5.14 · Nov 23, 11:41 PM, Chris: "I want the cast section to show players parlay records and if they are up or down units in the
   parlay lane". The feed's characters[].par: each character's game parlay (70%+ calls), strong-suit ticket and prop parlay over the
   same 60 days as its record, a unit a ticket, and its last six settled tickets. Read only from the graded stores. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 500))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-23T22:00:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  const E = s => w.eval(s), J = JSON.stringify, D = '2026-11-23';
  const leg = (price, r) => ({ sp: 'nba', game: 'CLE@CHI', pick: 'CHI ML', price, m: 'ml', sd: 'home', ...(r === 'push' ? { push: true } : r == null ? {} : { hit: r }) });
  const CPAR = {
    '2026-11-20': { locked: true, by: { Judge: { voice: 'Judge', legs: [leg(-110, true), leg(120, true)], done: true, won: true }, Dog: { voice: 'Dog', skill: true, legs: [leg(150, false), leg(-110, true)], done: true, won: false } } },
    '2026-11-21': { locked: true, by: { Judge: { voice: 'Judge', legs: [leg(-110, 'push'), leg(-110, 'push')], done: true, won: false } } },          /* every leg pushed: a push, not a loss */
    '2026-11-22': { locked: true, by: { Judge: { voice: 'Judge', legs: [leg(-110, true), leg(-110, null)], done: false } } },                         /* still open: its leg counts, the ticket doesn't */
    '2026-11-19': { locked: true, by: { Judge: { voice: 'Judge', skill: true, legs: [leg(-150, true), leg(-110, 'push'), leg(-120, true)], done: true, won: true } } },  /* a pushed leg drops out of the price */
    '2026-09-01': { locked: true, by: { Judge: { voice: 'Judge', legs: [leg(-110, false)], done: true, won: false } } },                              /* older than 60 days */
    '2026-11-23': { locked: false, by: { Judge: { voice: 'Judge', legs: [leg(-110, false)], done: true, won: false } } } };                          /* not locked: not a ticket */
  const CPX = { '2026-11-21': { locked: true, by: { Judge: { voice: 'Judge', legs: [{ kind: 'prop', price: -120, hit: true }, { kind: 'prop', price: -130, hit: false }], done: true, won: false } } } };
  E(`set(CPAR_KEY,${J(CPAR)});set(CPX_KEY,${J(CPX)});`);
  const P = JSON.parse(E(`JSON.stringify(pubParRec('Judge',dayShift('${D}',-60),'${D}',get(CPAR_KEY,{}),get(CPX_KEY,{})))`));
  const u2 = (1 + 100 / 110) * 2.2 - 1, u3 = (1 + 100 / 150) * (1 + 100 / 120) - 1;
  T('the game parlay: 1–0–1 (the all-push ticket is a push), up the cashed ticket\'s price, legs 3–0 (the open ticket\'s hit leg counts)', P.game.w === 1 && P.game.l === 0 && P.game.p === 1 && Math.abs(P.game.u - +u2.toFixed(2)) < 0.011 && P.game.lw === 3 && P.game.ll === 0, J(P.game));
  T('the strong-suit ticket keeps its own record, and a pushed leg drops out of its price', P.suit.w === 1 && P.suit.l === 0 && Math.abs(P.suit.u - +u3.toFixed(2)) < 0.011 && P.suit.lw === 2, J(P.suit));
  T('the prop parlay: a miss costs the unit', P.props.w === 0 && P.props.l === 1 && P.props.u === -1 && P.props.lw === 1 && P.props.ll === 1, J(P.props));
  T('nothing older than 60 days, nothing unlocked', P.game.l === 0, J(P.game));
  T('the last tickets, newest first, with legs hit and the price', P.last.length === 4 && P.last[0].d === '2026-11-21' && P.last.map(t => t.r).sort().join() === 'loss,push,win,win' && P.last.find(t => t.d === '2026-11-20').price === 320 && P.last.find(t => t.d === '2026-11-20').hit === 2 && P.last.find(t => t.r === 'push').price === null, J(P.last));
  const Pd = JSON.parse(E(`JSON.stringify(pubParRec('Dog',dayShift('${D}',-60),'${D}',get(CPAR_KEY,{}),get(CPX_KEY,{})))`));
  T('another character only gets its own tickets (Dog: one strong-suit miss)', Pd.suit.l === 1 && Pd.suit.u === -1 && Pd.game.w + Pd.game.l === 0 && Pd.props.w + Pd.props.l === 0, J(Pd));
  /* v3.5.14 · Nov 23, Chris: the Grinder's profile read "Official game picks —" under "Today 3–0". A graded pick from today counts
     in the record right away; it stays in today's list, and the recent results start with yesterday. */
  const call = (id, date, hit, price) => ({ id, sp: 'nba', date, game: 'CLE@CHI', voice: 'Judge', market: 'ml', side: 'home', price, pick: 'CHI ML', cf: 0.74, graded: hit != null, hit, push: false });
  w.__V = JSON.stringify([call('t1', D, true, -150), { ...call('t2', D, null, -120), game: 'PHX@NO', pick: 'NO ML' }, { ...call('y1', '2026-11-22', false, -110), game: 'MEM@CHA', pick: 'CHA ML' }]);
  const pc = JSON.parse(E(`(()=>{const o=isOfficial;isOfficial=()=>true;PUB_CHAR_MEMO=null;try{return JSON.stringify((pubCharacters0(JSON.parse(window.__V),'${D}').find(c=>c.v==='Judge'))||null);}finally{isOfficial=o;}})()`));
  T('today\'s graded pick counts in the record right away (1–1: today\'s win, yesterday\'s loss), the open one doesn\'t', !!pc && pc.record.w === 1 && pc.record.l === 1 && Math.abs(pc.record.u - (100 / 150 - 1)) < 0.011, JSON.stringify(pc && pc.record));
  T('…both of today\'s picks stay in today\'s list, and the recent results start with yesterday', pc.picks.filter(x => x.kind === 'game').length === 2 && pc.recent.length === 1 && pc.recent[0].d === '2026-11-22', JSON.stringify([pc.picks.length, pc.recent]));
  /* it rides on every character in the feed, and a settled ticket moves the publish signature */
  const src = fs.readFileSync(path.join(W, 'desk-core.js'), 'utf8');
  T('every character in the feed carries its parlay lane', /par:\(\(\)=>\{try\{return pubParRec\(v,from,d,CPA,CPXA\);\}catch\(e\)\{return null;\}\}\)\(\)/.test(src));
  T('…and the publish signature moves when one of its tickets settles', /c\.par\?\['game','suit','props'\]\.map\(k=>c\.par\[k\]\.w\+'-'\+c\.par\[k\]\.l\+'-'\+c\.par\[k\]\.p\)/.test(src));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 2500);
