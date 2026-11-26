/* v3.0.3 · the public board: every game on today's card with its colored picks (★ unanimous / supreme / strong / value / outside),
   every character's call per bet with its own confidence, and its rank in that kind of bet (👑 #1 has the say, 🧊 the worst doesn't).
   Records and tiers only — no reasons, no method. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-14T18:00:00Z');
/* 30 graded NBA unders each: the Coach wins most, the Judge loses most, the Scout breaks even */
const V = []; let id = 0; const day = i => new Date(Date.parse('2026-10-10T12:00:00Z') + i * 864e5).toISOString().slice(0, 10);
const rate = { Coach: 0.75, Scout: 0.52, Judge: 0.3 };
for (let i = 0; i < 30; i++) for (const v of Object.keys(rate)) { const hit = (i % 10) < rate[v] * 10;
  V.push({ id: 'h' + (id++), sp: 'nba', date: day(i), game: `A${i}@H${i}`, voice: v, market: 'total', side: 'under', line: 225.5, price: -110, pick: 'Under 225.5', cf: 0.7, graded: true, hit, units: hit ? 0.909 : -1 }); }
const call = (voice, market, side, pick, price, line) => V.push({ id: 't' + (id++), sp: 'nba', date: '2026-11-14', game: 'ATL@CHI', voice, market, side, pick, price, line, cf: 0.7, graded: false, hit: null });
call('Coach', 'total', 'under', 'Under 245.5', -110, 245.5); call('Scout', 'total', 'under', 'Under 245.5', -110, 245.5);
V[V.length - 2].why = 'opponent on a back-to-back · picked team won 4+ of its last 5';   /* v3.5.13 · the Coach's reason, in its own words */
V[V.length - 1].why = 'simulated 10,000 times · rest edge';                                /* …and one that talks method: never published */ call('Judge', 'total', 'over', 'Over 245.5', -110, 245.5);
call('Brain', 'total', 'under', 'Under 245.5', -110, 245.5); call('Coach', 'ml', 'home', 'CHI ML', -600, null);
const TC = { d: '2026-11-14', ts: NOW, by: { nba: { games: [{ g: 'ATL@CHI', s: '2026-11-15T01:00:00Z', id: '7', w: 1 }], picks: [
  { sp: 'nba', gid: '7', game: 'ATL@CHI', start: '2026-11-15T01:00:00Z', m: 'total', sd: 'under', pick: 'Under 245.5', price: -110, color: ' supreme', unan: true, chars: ['Coach', 'Scout', 'Brain'], mp: 0.62, brainP: 0.66 },
  { sp: 'nba', gid: '7', game: 'ATL@CHI', start: '2026-11-15T01:00:00Z', m: 'ml', sd: 'home', pick: 'CHI ML', price: -600, color: ' strong', unan: false, chars: ['Coach'], mp: 0.84 },
  { sp: 'nba', gid: '7', game: 'ATL@CHI', start: '2026-11-15T01:00:00Z', m: 'spread', sd: 'home', pick: 'CHI -9.5', price: -110, color: 'value', chars: [], mp: 0.6, suspect: 'model 60% vs market 40%' }] } } };
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1');
  x.localStorage.setItem('d4.voices', JSON.stringify(V)); x.localStorage.setItem('d4.todaycard', JSON.stringify(TC)); } }).window;
setTimeout(() => { try {
  const B = w.eval(`pubBoard(roGet(VOICES_KEY,[])||[])`);
  T('the board carries today\'s game', B && B.games.length === 1 && B.games[0].game === 'ATL@CHI' && B.games[0].day === '2026-11-14', JSON.stringify(B && B.games.map(g => [g.game, g.day])));
  const g = B.games[0], P = g.picks;
  T('colored picks: unanimous + supreme first; a flagged pick never goes out', P[0].pick === 'Under 245.5' && P[0].unan && P[0].tier === 'supreme', JSON.stringify(P));
  T('no heavy moneyline (-1000 or shorter) goes public; a -600 still does', P.length === 2 && P[1].m === 'ml' && (g.calls.ml || []).length === 1, JSON.stringify([P, g.calls.ml]));
  T('…the line sits at -1000: a -1000 is out, a -999 stays', w.eval(`pubHeavy({m:'ml',price:-1000})&&!pubHeavy({m:'ml',price:-999})&&!pubHeavy({m:'ml',price:-600})&&!pubHeavy({m:'spread',price:-1200})&&pubHeavy({pick:'CHI ML',price:-1500})&&!pubHeavy({pick:'Under 1.5 SOG',price:-1200})`));
  T('…the Brain is never listed as a picker (it\'s made from the others)', !P[0].by.includes('Brain') && P[0].by.includes('Coach'));
  const tot = g.calls.total || [];
  T('every character\'s call on the total: with and against, each with its own confidence', tot.length === 3 && tot.some(c => c.v === 'Judge' && c.s === 'over') && tot.every(c => c.p != null), JSON.stringify(tot));
  const coach = tot.find(c => c.v === 'Coach'), judge = tot.find(c => c.v === 'Judge'), scout = tot.find(c => c.v === 'Scout');
  T('the Coach is #1 in NBA unders: he has the say', coach.r && coach.r.rk === 1 && coach.r.say === 'top' && /NBA unders/.test(coach.r.lab), JSON.stringify(coach.r));
  T('the Scout is ranked in the middle with its record', scout.r && scout.r.rk === 2 && scout.r.say === "" && scout.r.w + scout.r.l === 30, JSON.stringify(scout.r));
  /* v3.5.31 · Nov 26, Chris: "give the subscribers a chance to pick their fav characters per sport per option…" — each call carries its lane key
     so the app's ⭐ favorite lanes match exactly; every character publishes its full lane table */
  T('each call carries its lane key (nba|total|under), so ⭐ favorite lanes match exactly', coach.r.k === 'nba|total|under' && scout.r.k === 'nba|total|under', JSON.stringify([coach.r.k, scout.r.k]));
  const CH = w.eval(`pubCharacters0(roGet(VOICES_KEY,[])||[],'2026-11-14')`), cl = (CH.find(c => c.v === 'Coach') || {}).lanes || [], sl = (CH.find(c => c.v === 'Scout') || {}).lanes || [];
  T('every character publishes each lane it is ranked in: [key, W, L, units, rank, of] (the Coach #1 of 3 in NBA unders, 24–6)', JSON.stringify(cl.find(x => x[0] === 'nba|total|under')) === JSON.stringify(['nba|total|under', 24, 6, 15.8, 1, 3]) && (sl.find(x => x[0] === 'nba|total|under') || [])[4] === 2, JSON.stringify([cl, sl]));
  T('the Judge\'s over is a different kind of bet (NBA overs) where it has no record yet', judge.r == null || !judge.r.rk, JSON.stringify(judge.r));
  const judgeUnder = w.eval(`(()=>{const P=prFor('nba','total','under',-110,245.5);return P&&P.goat&&P.goat.v;})()`);
  T('…and in NBA unders, the Judge is the worst: no say', judgeUnder === 'Judge', judgeUnder);
  T('names and colors ride along once, in the cast', B.cast.Coach && B.cast.Coach.name && B.cast.Judge && !B.cast.Brain, JSON.stringify(Object.keys(B.cast)));
  /* v3.5.13 · Nov 23, Chris: "the characters reasoning is quoted inside their pick box" — each call carries its own reason (q) in plain
     words; still no method: nothing outside those quotes explains how a pick was made, and no quote talks method */
  const cu = (B.games[0].calls.total || []), qOf = v => (cu.find(c => c.v === v) || {}).q;
  T('each call carries its character\'s own reason, word for word (the Coach on the under)', qOf('Coach') === 'opponent on a back-to-back · picked team won 4+ of its last 5', JSON.stringify(cu.map(c => [c.v, c.q])));
  T('…a reason that talks method never goes out (the Scout\'s "simulated 10,000 times")', !qOf('Scout'), qOf('Scout'));
  const s = JSON.stringify(B, (k, v) => (k === 'q' ? undefined : v));
  T('no method: nothing in the board explains how a pick was made (outside the characters\' own quoted reasons)', !/sim|monte|model|edge|why|brainP|blend|mp"/i.test(s.replace(/"(Sim|Simulator)"/g, '')), s.match(/sim|monte|model|edge|why|brainP|blend/i));
  T('…and no quoted reason talks method', B.games.every(g => Object.values(g.calls || {}).every(L => L.every(c => !c.q || !/simulat|monte carlo|model|algorithm|brainP|blend|10,?000/i.test(c.q)))));
  const F = w.eval(`publicFeedCore(false)`);
  T('the open beta publishes the board; the signature changes with it', F.beta === true && F.board && F.board.games.length === 1 && /supreme\*/.test(F.betaSig), F.betaSig && F.betaSig.slice(0, 120));
  w.eval(`set('d4.pubbeta',false)`); const G = w.eval(`publicFeedCore(false)`);
  T('when the beta ends, the board doesn\'t go out', G.beta === false && G.board === undefined);
} catch (er) { T('no crash', false, String(er && er.stack || er).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 3000);
