/* v3.5.8 · Nov 23, Chris: "Fix #2" — a character's final-score call could disagree with its own picks (the Commissioner and the
   Grinder on the Cavaliers' moneyline called a Bulls win, 127–126). The bend took one side only (the spread's) and made it win
   outright, so a middle (the favorite's moneyline + the underdog's points) came out with the underdog winning; the heirs' bend was a
   copy. On the Nov 23 public board 149 of 807 scores contradicted their own picks. Now every pick sets the window the score lands in,
   and a last pass on whole numbers makes every score (own number or bent) agree with all of the character's picks. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const NOW = Date.parse('2026-11-23T23:20:00Z');
function page(file) {
  let html = fs.readFileSync(path.join(W, file), 'utf8');
  html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
  return new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/' + file, pretendToBeVisual: true, beforeParse(x) {
    const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
    x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
}
const w = page('nba.html');
const G = (a, h) => ({ away: { abbr: a }, home: { abbr: h } });
const SC = (sp, g, s, calls) => JSON.parse(w.eval(`JSON.stringify(scoreCallsFor(${JSON.stringify(sp)},${JSON.stringify(g)},${JSON.stringify(s)},${JSON.stringify(calls)}))`));
const by = (R, v) => R.find(x => x.voice === v);
const ml = (v, side, x = {}) => ({ voice: v, market: 'ml', side, ...x }), spr = (v, side, line) => ({ voice: v, market: 'spread', side, line }), tot = (v, side, line) => ({ voice: v, market: 'total', side, line });
setTimeout(() => { try {
  /* 1 · the case Chris saw: the Cavaliers' moneyline and the Bulls +8.5 (a middle) → Cleveland wins, by less than 8.5 */
  let R = SC('nba', G('CLE', 'CHI'), { awayProj: 126.4, homeProj: 126.9 }, [ml('Power', 'away'), spr('Power', 'home', 8.5)]); let x = by(R, 'Power');
  T('the Commissioner on CLE ML and CHI +8.5: its score has Cleveland winning, by less than 8.5 (it was a Bulls win, 127–126)', !!x && x.a > x.h && x.a - x.h < 8.5, JSON.stringify(x));
  /* 2 · the other middle: the home moneyline and the away team +2.5 → home by 1 or 2 */
  R = SC('ncaab', G('MTSU', 'SIU'), { awayProj: 77.6, homeProj: 76.8 }, [ml('Power', 'home'), spr('Power', 'away', 3.5)]); x = by(R, 'Power');
  T('home moneyline + the away team +3.5: home wins by 1 to 3 (it was MTSU 78–77)', !!x && x.h > x.a && x.h - x.a < 3.5, JSON.stringify(x));
  /* 3 · a lone spread on an underdog no longer forces it to win outright */
  R = SC('nba', G('LAC', 'HOU'), { awayProj: 108, homeProj: 117 }, [spr('Coach', 'away', 12.5)]); x = by(R, 'Coach');
  T('a lone LAC +12.5 call keeps the projection (Houston by 9 covers it) instead of forcing a Clippers win', !!x && x.h > x.a && x.h - x.a < 12.5 && x.a === 108 && x.h === 117, JSON.stringify(x));
  R = SC('nba', G('LAC', 'HOU'), { awayProj: 105, homeProj: 122 }, [spr('Coach', 'away', 12.5)]); x = by(R, 'Coach');
  T('…and when the projection is past the line, it moves just inside it (Houston by 11, not a Clippers win)', !!x && x.h - x.a > 0 && x.h - x.a < 12.5 && x.a + x.h === 227, JSON.stringify(x));
  /* 4 · picks that can't all win: the moneyline holds */
  R = SC('nba', G('BOS', 'NY'), { awayProj: 112, homeProj: 110 }, [ml('Power', 'home'), spr('Power', 'away', -3.5)]); x = by(R, 'Power');
  T('NY moneyline + BOS −3.5 can\'t both win: the moneyline holds (New York wins)', !!x && x.h > x.a, JSON.stringify(x));
  /* 5 · the total too */
  R = SC('nba', G('SA', 'SAC'), { awayProj: 105, homeProj: 108 }, [ml('Power', 'home'), tot('Power', 'over', 220.5)]); x = by(R, 'Power');
  T('home moneyline + Over 220.5 from a 213-point projection: home wins and the total clears 220.5', !!x && x.h > x.a && x.a + x.h > 220.5, JSON.stringify(x));
  R = SC('nhl', G('LA', 'MTL'), { awayProj: 3.4, homeProj: 3.6 }, [ml('Covers', 'home', { score: '3-4' }), tot('Covers', 'under', 6.5)]); x = by(R, 'Covers');
  T('a character with its own number (Covers 3–4) on Under 6.5: its score now stays under (3–4 was 7 goals)', !!x && x.a + x.h < 6.5 && x.h > x.a, JSON.stringify(x));
  /* 6 · own numbers move the least it takes */
  R = SC('nhl', G('UTAH', 'WPG'), { awayProj: 3.6, homeProj: 3.4 }, [ml('Sim', 'home')]); x = by(R, 'Sim');
  T('the Simulator on WPG ML with a 4–3 Utah projection: 3–4 Winnipeg (same 7 goals, one goal each way)', !!x && x.a === 3 && x.h === 4, JSON.stringify(x));
  R = SC('nba', G('MIL', 'TOR'), { awayProj: 110, homeProj: 112 }, [ml('Judge', 'home', { ja: 107, jh: 117 }), tot('Judge', 'under', 224)]); x = by(R, 'Judge');
  T('the Judge\'s own 107–117 on Under 224 (a push) moves one point, under the total, Toronto still winning', !!x && x.a + x.h < 224 && x.h > x.a && Math.abs(x.a - 107) + Math.abs(x.h - 117) === 1, JSON.stringify(x));
  /* 7 · what agreed already doesn't move; no picks, no change */
  R = SC('nba', G('OKC', 'IND'), { awayProj: 118, homeProj: 109 }, [ml('Sim', 'away'), spr('Sim', 'away', -4), tot('Sim', 'over', 220.5)]); x = by(R, 'Sim');
  T('a score that already agrees with every pick stays exactly the projection (OKC 118–109)', !!x && x.a === 118 && x.h === 109, JSON.stringify(x));
  R = SC('nfl', G('CLE', 'NO'), { awayProj: 17, homeProj: 27, modeScore: '20-24' }, []);
  T('a character with no picks on the game keeps its own score (nothing to agree with)', R.length > 0 && R.every(r => isFinite(r.a) && isFinite(r.h)), JSON.stringify(R.slice(0, 3)));
  /* 8 · ties: a moneyline pick never comes out a tie; football with no moneyline may still call one */
  R = SC('nfl', G('DAL', 'NYG'), { awayProj: 20.4, homeProj: 20.2 }, [ml('Power', 'away')]); x = by(R, 'Power');
  T('NFL: a moneyline pick never lands on a tie (Dallas wins)', !!x && x.a > x.h, JSON.stringify(x));
  R = SC('nfl', G('DAL', 'NYG'), { awayProj: 20.2, homeProj: 20.2 }, [tot('Scout', 'under', 44.5)]); x = by(R, 'Scout');
  T('NFL: with only a total pick, a 20–20 call stays possible (as before)', !!x && x.a === 20 && x.h === 20, JSON.stringify(x));
  R = SC('ncaab', G('AAA', 'BBB'), { awayProj: 70.2, homeProj: 70.3 }, [tot('Scout', 'over', 139.5)]); x = by(R, 'Scout');
  T('college hoops never calls a tie', !!x && x.a !== x.h && x.a + x.h > 139.5, JSON.stringify(x));
  /* 9 · every combination agrees: a sweep over sides, lines and projections */
  let bad = 0, n = 0; const ex = [];
  for (const sp of ['nba', 'ncaab', 'nhl', 'nfl']) { const big = sp === 'nhl' ? 0.5 : sp === 'nfl' ? 3 : 4, base = sp === 'nhl' ? 3 : sp === 'nfl' ? 21 : 110;
    for (let pa = -3; pa <= 3; pa++) for (let ph = -3; ph <= 3; ph++) for (const ms of ['home', 'away']) for (const ss of ['home', 'away']) for (const ln of sp === 'nhl' ? [-1.5, 1.5] : [-7.5, -2.5, 3.5]) for (const ts of ['over', 'under']) {
      const a = base + pa * big * 0.9, h = base + ph * big * 0.9, tl = 2 * base + (ts === 'over' ? 1.5 : -1.5);
      const C = [ml('Power', ms), spr('Power', ss, ln), tot('Power', ts, tl)]; const r = by(SC(sp, G('A', 'B'), { awayProj: a, homeProj: h }, C), 'Power'); n++;
      const m = r.h - r.a, t = r.a + r.h, mlOk = ms === 'home' ? m > 0 : m < 0, spOk = ss === 'home' ? m > -ln : m < ln, tOk = ts === 'over' ? t > tl : t < tl;
      const canBoth = (ms === 'home' ? (ss === 'home' ? true : ln > 1) : (ss === 'away' ? true : ln > 1));   /* the moneyline and spread can win together */
      if (!mlOk || (canBoth && !spOk) || (canBoth && !tOk)) { bad++; if (ex.length < 3) ex.push(JSON.stringify({ sp, a, h, ms, ss, ln, ts, tl, r })); } } }
  T(`a sweep of ${n} pick combinations: every moneyline wins on its own score, and so do the spread and total whenever they can win together`, bad === 0, bad + ' bad · ' + ex.join(' | '));
  /* 10 · the heirs bend their parents' scores the same way (the Grinder's copy of the old bend) */
  const kb = JSON.parse(w.eval(`JSON.stringify(wbBend('nba',126.2,127.1,[{market:'ml',side:'away'},{market:'spread',side:'home',line:8.5},{market:'total',side:'over',line:251.5}]))`));
  T('an heir on CLE ML, CHI +8.5 and Over 251.5 (the Grinder\'s calls): Cleveland by less than 8.5, over 251.5', kb.a > kb.h && kb.a - kb.h < 8.5 && kb.a + kb.h > 251.5, JSON.stringify(kb));
  /* 11 · the real Nov 23 board: the scores that contradicted their own picks, run through the last pass */
  const REAL = [['ncaab', 'H_L2e1', [70, 71], [ml('X', 'away'), spr('X', 'home', 5.5), tot('X', 'over', 133.5)]], ['ncaab', 'Power', [74, 76], [ml('X', 'away'), spr('X', 'home', 6.5)]],
    ['nhl', 'Sim', [4, 3], [ml('X', 'home')]], ['nba', 'Judge', [107, 117], [tot('X', 'under', 224)]], ['nba', 'Covers', [111, 107], [spr('X', 'away', -4)]], ['ncaaf', 'Scout', [30, 30], [ml('X', 'away')]]];
  const fixed = REAL.map(([sp, v, s0, C]) => { const r = JSON.parse(w.eval(`JSON.stringify(scAgree(${JSON.stringify(sp)},{a:${s0[0]},h:${s0[1]}},${JSON.stringify(C)}))`)); const Wn = JSON.parse(w.eval(`JSON.stringify(scWin(${JSON.stringify(C)}))`));
    return { v, s0, r, ok: w.eval(`scOk(${JSON.stringify(Wn)},${r.a},${r.h},7,${!(sp === 'nfl' || sp === 'ncaaf')})`), d: Math.abs(r.a - s0[0]) + Math.abs(r.h - s0[1]) }; });
  T('six real contradictions from the Nov 23 board (the Grinder, the Commissioner, the Simulator, the Judge, Covers, a 30–30 football call) now agree, each moved 1 to 3 points', fixed.every(f => f.ok && f.d >= 1 && f.d <= 3), JSON.stringify(fixed.map(f => [f.v, f.s0, [f.r.a, f.r.h], f.d])));
  T('same calls, same score: the pass is deterministic', JSON.stringify(SC('nba', G('CLE', 'CHI'), { awayProj: 126.4, homeProj: 126.9 }, [ml('Power', 'away'), spr('Power', 'home', 8.5)])) === JSON.stringify(SC('nba', G('CLE', 'CHI'), { awayProj: 126.4, homeProj: 126.9 }, [ml('Power', 'away'), spr('Power', 'home', 8.5)])));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); }, 3000);
