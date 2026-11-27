/* v3.5.15 · Nov 23, 11:26 PM, Chris: "if you can activate the ghost runs where you can run the challenge side by side with the top character
   in the particular lane the challenge focuses on". The machine's half: ghostBuild picks each lane's best character (most units on single
   calls over 60 days, 8+ graded, in the black) and writes its ticket for every day of the last 31 at each leg count the routes play;
   ghostPublish writes public/ghost.json beside the picks, only while the beta publishes the board, and only when something changed. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 500))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-23T22:00:00Z'), D = '2026-11-23';
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
const day = i => new Date(Date.parse(D + 'T12:00:00Z') - (11 - i) * 864e5).toISOString().slice(0, 10);
/* twelve days: the Scout takes NHL road dogs (+120, two in three cash), the Judge takes college home favorites (−150, three in four), the
   Simulator takes NHL overs (−110, half). Today's last two games of each are still to play. */
const V = []; const NHL = ['BOS@TOR', 'NYR@PIT', 'CHI@STL', 'SEA@VAN'], CBB = ['DUKE@UNC', 'KU@BAY', 'UK@TENN', 'UCLA@ARIZ'];
for (let i = 0; i < 12; i++) for (let g = 0; g < 4; g++) { const d = day(i), open = i === 11 && g >= 2;
  const mk = (voice, sp, game, market, side, price, cf, hit, pick) => V.push({ id: [voice, sp, game, d, market].join('|'), voice, sp, game, date: d, market, side, price, cf, pick, graded: !open, hit: open ? null : hit });
  mk('Scout', 'nhl', NHL[g], 'ml', 'away', 120, 0.56 + 0.01 * g, (i + g) % 3 !== 0, NHL[g].split('@')[0] + ' ML');
  mk('Judge', 'ncaab', CBB[g], 'ml', 'home', -150, 0.7 - 0.01 * g, (i + g) % 4 !== 0, CBB[g].split('@')[1] + ' ML');
  mk('Sim', 'nhl', NHL[g], 'total', 'over', -110, 0.53, (i + g) % 2 === 0, 'Over 6'); }
setTimeout(async () => { try {
  const E = s => w.eval(s); w.__V = JSON.stringify(V);
  const G = JSON.parse(E(`JSON.stringify(ghostBuild(JSON.parse(window.__V),'${D}'))`)), L = G.lanes;
  /* expected records, worked out here on their own */
  const units = (voice, ok) => V.filter(c => c.voice === voice && c.hit != null && ok(c)).reduce((a, c) => a + (c.hit ? (c.price > 0 ? c.price / 100 : 100 / -c.price) : -1), 0);
  const uS = units('Scout', () => true), uJ = units('Judge', () => true);
  T('31 days, ending today', G.days.length === 31 && G.days[30] === D && G.days[0] === '2026-10-24', JSON.stringify([G.days[0], G.days[30]]));
  T('the open book\'s ghost is whoever made the most units on single calls (here ' + (uS > uJ ? 'the Scout' : 'the Judge') + ')', L['any|any'] && L['any|any'].v === (uS > uJ ? 'Scout' : 'Judge') && Math.abs(L['any|any'].u - +(Math.max(uS, uJ)).toFixed(2)) < 0.011, JSON.stringify(L['any|any'] && { v: L['any|any'].v, u: L['any|any'].u, uS, uJ }));
  T('Dog pound × NHL: the Scout (its road dogs), with its record in the lane', L['dogs|nhl'] && L['dogs|nhl'].v === 'Scout' && L['dogs|nhl'].w + L['dogs|nhl'].l === 46 && L['dogs|nhl'].n === 'The Scout', JSON.stringify(L['dogs|nhl'] && { v: L['dogs|nhl'].v, w: L['dogs|nhl'].w, l: L['dogs|nhl'].l }));
  T('Chalk walk × college hoops: the Judge (−150 favorites)', L['chalk|ncaab'] && L['chalk|ncaab'].v === 'Judge', JSON.stringify(L['chalk|ncaab'] && L['chalk|ncaab'].v));
  T('a lane where nobody is in the black has no default ghost (NHL overs: the Simulator is down) — v3.5.34: but every character in it can still be raced', L['overs|nhl'] && !L['overs|nhl'].v && !L['overs|nhl'].k && L['overs|nhl'].all.length === 1 && L['overs|nhl'].all[0].v === 'Sim' && L['overs|nhl'].all[0].u < 0, JSON.stringify(L['overs|nhl'] && { v: L['overs|nhl'].v, all: (L['overs|nhl'].all || []).map(x => [x.v, x.u]) }));
  /* v3.5.34 · Nov 26, Chris: "tail a separate character ghost… where you are on the challenge vs all characters… what the character record was in the challenge" */
  { const A = L['any|any'].all || [], unpack = s => String(s || '').split(',').map(x => x ? x.split(':').map(Number) : null);
    T('every character with 8+ graded calls in the lane rides along (open book: the Scout, the Judge and the Simulator), best first', A.length === 3 && A[0].v === L['any|any'].v && A.every((x, i) => !i || A[i - 1].u >= x.u) && ['Scout', 'Judge', 'Sim'].every(v => A.some(x => x.v === v)), JSON.stringify(A.map(x => [x.v, x.u])));
    const me = A.find(x => x.v === L['any|any'].v), best = L['any|any'];
    T('…its days packed small, and they unpack to exactly the default ghost\'s tickets', Object.keys(best.k).every(kk => { const U = unpack(me.r[kk]); return best.k[kk].every((t, i) => JSON.stringify(t) === JSON.stringify(U[i] || null)); }), JSON.stringify([me.r, best.k]));
    T('…each with its record in the lane', A.every(x => Number.isFinite(x.w) && Number.isFinite(x.l) && Number.isFinite(x.u) && x.n && x.c)); }
  T('a world tour has no one-sport lane', !Object.keys(L).some(k => /^world\|(?!any)/.test(k)) && !!L['world|any'], Object.keys(L).filter(k => /^world/.test(k)).join());
  T('each rule carries the leg counts its routes play (singles 1; two-teamers 2; three-piece 3 and 4; the rest 1, 2 and 4)', L['singles|any'] && Object.keys(L['singles|any'].k).join() === '1' && Object.keys(L['two|any'].k).join() === '2' && Object.keys(L['three|any'].k).join() === '3,4' && Object.keys(L['dogs|nhl'].k).join() === '1,2,4', JSON.stringify(Object.fromEntries(['singles|any', 'two|any', 'three|any', 'dogs|nhl'].map(k => [k, L[k] && Object.keys(L[k].k)]))));
  /* the Scout's 2-leg ticket each day: its two most confident NHL dogs (SEA, CHI), one leg a game */
  const row = L['dogs|nhl'].k[2], dec2 = (1 + 120 / 100) ** 2;
  const want = i => { const a = (i + 3) % 3 !== 0, b = (i + 2) % 3 !== 0; return i === 11 ? 9 : a && b ? 1 : 0; };
  T('its 2-leg ticket every day: its two most confident calls in the lane, cashed only when both hit, at the product of their prices', Array.from({ length: 11 }, (_, i) => i).every(i => row[19 + i] && row[19 + i][0] === want(i) && Math.abs(row[19 + i][1] - +dec2.toFixed(3)) < 0.001), JSON.stringify(row.slice(19)));
  T('…today\'s ticket is still open (9), the days before its first call have none', row[30][0] === 9 && row.slice(0, 19).every(x => x === null), JSON.stringify([row[30], row.slice(0, 19).filter(Boolean).length]));
  T('…and today\'s legs ride along: its two picks, their prices, still to play', JSON.stringify(L['dogs|nhl'].t[2]) === JSON.stringify([['SEA ML', 120, null, 'nhl', 'SEA@VAN'], ['CHI ML', 120, null, 'nhl', 'CHI@STL']]), JSON.stringify(L['dogs|nhl'].t));
  /* a push drops out of the price; every leg pushed is a push; a miss beats an open leg */
  const P = [{ voice: 'Scout', sp: 'nhl', game: 'A@B', date: D, market: 'ml', side: 'away', price: 150, cf: 0.9, pick: 'A ML', push: true, hit: null },
    { voice: 'Scout', sp: 'nhl', game: 'C@E', date: D, market: 'ml', side: 'away', price: 110, cf: 0.89, pick: 'C ML', hit: true }];
  w.__P = JSON.stringify(V.filter(c => !(c.voice === 'Scout' && c.date === D)).concat(P));
  const Lp = JSON.parse(E(`JSON.stringify(ghostBuild(JSON.parse(window.__P),'${D}').lanes['dogs|nhl'].k[2][30])`));
  T('a pushed leg drops out of the ticket\'s price (A pushed, C cashed at +110: 2.10)', Lp && Lp[0] === 1 && Math.abs(Lp[1] - 2.1) < 0.001, JSON.stringify(Lp));
  w.__P2 = JSON.stringify(V.filter(c => !(c.voice === 'Scout' && c.date === D)).concat(P.map(c => ({ ...c, push: true, hit: null }))));
  const Lp2 = JSON.parse(E(`JSON.stringify(ghostBuild(JSON.parse(window.__P2),'${D}').lanes['dogs|nhl'].k[2][30])`));
  T('every leg pushed is a push (2), paying back the stake', Lp2 && Lp2[0] === 2 && Lp2[1] === 1, JSON.stringify(Lp2));
  /* publishing: beta only, only on a change, beside the picks */
  E(`window.__puts=[];ghPut=async(p,t)=>{window.__puts.push([p,t.length]);return{ok:true};};set(VOICES_KEY,JSON.parse(window.__V));set('d4.pubbeta',false);set('d4.ghoststate',{});`);
  let r = await E('ghostPublish(false)');
  T('with the beta off nothing is published (the ghosts carry today\'s calls, like the board)', r.ok === false && JSON.parse(E('JSON.stringify(window.__puts)')).length === 0, JSON.stringify(r));
  E(`set('d4.pubbeta',true);`); r = await E('ghostPublish(false)'); const puts = JSON.parse(E('JSON.stringify(window.__puts)'));
  T('with the beta on it writes public/ghost.json and remembers what it wrote', r.ok === true && puts.length === 1 && puts[0][0] === 'public/ghost.json' && JSON.parse(E(`JSON.stringify(get('d4.ghoststate',{}))`)).n === Object.keys(L).length, JSON.stringify([r, puts]));
  r = await E('ghostPublish(false)');
  T('…nothing changed: it doesn\'t write again', r.same === 1 && JSON.parse(E('JSON.stringify(window.__puts)')).length === 1, JSON.stringify(r));
  E(`(()=>{const V=get(VOICES_KEY,[]);const x=V.find(c=>c.hit==null);x.hit=true;x.graded=true;set(VOICES_KEY,V);delete RO_CACHE[VOICES_KEY];})()`);
  r = await E('ghostPublish(false)');
  T('…a call grades within 30 minutes of the last write: it waits (the next publish picks it up)', r.wait === 1 && JSON.parse(E('JSON.stringify(window.__puts)')).length === 1, JSON.stringify(r));
  r = await E('ghostPublish(true)');
  T('…forced, it writes at once', r.ok === true && JSON.parse(E('JSON.stringify(window.__puts)')).length === 2, JSON.stringify(r));
  const src = fs.readFileSync(path.join(W, 'shared.js'), 'utf8');
  T('every successful publish of the picks runs it', /if\(a\.ok\)try\{await ghostPublish\(false\);\}catch\(e\)/.test(src));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 2500);
