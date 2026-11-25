/* v3.5.23 · Nov 25, Chris: "All of it… X1000." — the half model: every character's 1st-half / 1st-period call is priced from its own
   read (the half's shares learned from graded halves, starting where the books put them; hockey's period as two Poisson scorelines with
   the draw), each side's chance held against the price and pulled to the market's until a sport's half calls earn more; the half on
   every game card and on the public board; the day's feed lines no longer wiped at every page open. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 900))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-25T18:00:00Z'); const errs = [];
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1');
  x.addEventListener('error', e => errs.push(String(e.message || e))); } }).window;
setTimeout(async () => { try {
  const E = s => w.eval(s), J = JSON.stringify, P = s => JSON.parse(E(s)); const D = E('today()');
  /* ── 1 · the shares start where the books put them and move only on a long record ── */
  let m = P(`JSON.stringify(halfModel('nba'))`);
  T('no graded halves yet: the books\' own shape (NBA half spreads ≈ 0.56 of the game\'s margin, totals half)', m.n === 0 && m.km === 0.56 && m.kt === 0.5 && m.sm === 10.5, J(m));
  /* 200 graded NBA halves where the half runs 0.66 of the line's margin: shrunk hard toward the books (1,000 games to move halfway) */
  const arc = {}; for (let i = 0; i < 200; i++) { const d = new Date(Date.parse('2026-10-25T12:00:00Z') + Math.floor(i / 8) * 864e5).toISOString().slice(0, 10); const M = (i % 13) - 6, T0 = 224 + (i % 7);
    const mA = (T0 - M) / 2, mH = (T0 + M) / 2, m1 = Math.round(0.66 * M), t1 = Math.round(0.5 * T0); (arc[d] = arc[d] || { rows: [] }).rows.push({ gid: 'g' + i, game: 'BOS@NY', judge: { a: mA, h: mH, w: [{ src: 'market', a: mA, h: mH }] }, final: { a: 100, h: 100, h1a: (t1 - m1) / 2, h1h: (t1 + m1) / 2 } }); }
  E(`set('d4.nbaarc',${J(arc)});delete RO_CACHE['d4.nbaarc'];HALF_MC={};`);
  m = P(`JSON.stringify(halfModel('nba'))`);
  T('200 graded halves at 0.66 move it only part of the way (the books\' estimate outweighs a short record)', m.n === 200 && m.km > 0.56 && m.km < 0.6 && Math.abs(m.kt - 0.5) < 0.01, J(m));
  /* ── 2 · hockey's 1st period: two scorelines, the draw counted ── */
  const r = P(`(()=>{const R=halfRead('nhl',{kt:0.3},2.5,2.45);return JSON.stringify({pA:R.pA,pH:R.pH,pD:R.pD,cH:R.cover(-0.5),cA:R.coverA(-0.5),c1:R.cover(1),cA1:R.coverA(1),o15:R.over(1.5),u15:R.under(1.5),o1:R.over(1),u1:R.under(1)});})()`);
  T('a 1st period is win / draw / loss, and the draw is the likeliest single result here', Math.abs(r.pA + r.pH + r.pD - 1) < 1e-6 && r.pD > r.pA && r.pD > r.pH && r.pD > 0.3, J(r));
  T('…the ±0.5 puck line reads off the same scoreline (home −0.5 = home wins it; away +0.5 = away wins or draws)', Math.abs(r.cH - r.pH) < 1e-9 && Math.abs(r.cA - (r.pA + r.pD)) < 1e-9, J(r));
  T('…an integer line can push: home +1 and away −1 leave the one-goal away win as neither', r.c1 + r.cA1 < 1 - 0.05, J(r));
  T('…and the period total (over 1.5 / under 1.5 split it all; over 1 / under 1 leave the 1-goal push)', Math.abs(r.o15 + r.u15 - 1) < 1e-6 && r.o1 + r.u1 < 0.8, J(r));
  /* ── 3 · the calls: priced from each character's own read ── */
  E(`HALF_MC={};HALF_BW={};set('d4.nbaarc',{});delete RO_CACHE['d4.nbaarc'];set(HALF_KEY,{});delete RO_CACHE[HALF_KEY];
     set(HALFLN_KEY,{d:today(),g:{'nhl|BOS@NYR':{ml:{a:{price:150},h:{price:185},d:{price:175}},sp:{a:{line:-0.5,price:150},h:{line:0.5,price:-190}},ou:{line:1.5,o:110,u:-135}},
       'nba|MIA@PHI':{ml:{a:{price:100},h:{price:-120}},sp:{a:{line:0.5,price:-110},h:{line:-0.5,price:-110}},ou:{line:112.5,o:-110,u:-110}}}});delete RO_CACHE[HALFLN_KEY];`);
  const log = (sp, A, H, scores) => E(`halfCallsLog('${sp}',{away:{abbr:'${A}'},home:{abbr:'${H}'}},[{date:today()}],${J(scores)})`);
  const n1 = log('nhl', 'BOS', 'NYR', [{ voice: 'Judge', a: 2.5, h: 2.45 }, { voice: 'Dog', a: 4.4, h: 1.9 }]);
  let L = P('JSON.stringify(get(HALF_KEY,{}))');
  const jm = Object.values(L).find(x => x.voice === 'Judge' && x.mk === 'p1ml'), dm = Object.values(L).find(x => x.voice === 'Dog' && x.mk === 'p1ml');
  T('a near-even read on a 3-way board calls THE DRAW when the draw is the price worth taking (+175 on the likeliest result)', n1 > 0 && jm && jm.side === 'draw' && jm.pick === 'P1 Draw' && jm.w3 === 1, J(jm));
  T('…every call carries its chance (p), the market\'s (m), the blend at the price (q) and its value (ev)', jm.p > 0.3 && jm.m > 0.3 && jm.q > 0 && jm.ev != null && Math.abs(jm.q - (jm.m + 0.2 * (jm.p - jm.m))) < 1e-3, J(jm));
  T('…a read that has the away side well ahead backs the away team', dm && dm.side === 'away' && dm.pick === 'P1 BOS ML', J(dm));
  const jp = Object.values(L).find(x => x.voice === 'Judge' && x.mk === 'p1spread'), jt = Object.values(L).find(x => x.voice === 'Judge' && x.mk === 'p1total');
  T('…the puck line and the period total are priced off the same scoreline', jp && (jp.side === 'home' || jp.side === 'away') && jp.p > 0 && jt && (jt.side === 'over' || jt.side === 'under') && jt.line === 1.5, J([jp, jt]));
  /* no draw price on the board and neither team worth backing: no moneyline call at all */
  E(`set(HALFLN_KEY,{d:today(),g:{'nhl|BOS@NYR':{ml:{a:{price:140},h:{price:155}}}}});delete RO_CACHE[HALFLN_KEY];set(HALF_KEY,{});delete RO_CACHE[HALF_KEY];`);
  log('nhl', 'BOS', 'NYR', [{ voice: 'Judge', a: 3.0, h: 3.0 }]);
  L = P('JSON.stringify(get(HALF_KEY,{}))');
  T('a 3-way board without the draw\'s price, and no team worth +140 / +155 on an even read: no 1st-period moneyline call', !Object.values(L).some(x => x.mk === 'p1ml'), J(L));
  /* the feed's consensus period line is 2-way (+115 / −150 — Action Network, Nov 25): a tie refunds, so the read is counted on untied periods */
  E(`set(HALFLN_KEY,{d:today(),g:{'nhl|CGY@PIT':{ml:{a:{price:115},h:{price:-150}}}}});delete RO_CACHE[HALFLN_KEY];set(HALF_KEY,{});delete RO_CACHE[HALF_KEY];`);
  log('nhl', 'CGY', 'PIT', [{ voice: 'Judge', a: 2.6, h: 3.4 }, { voice: 'Dog', a: 3.6, h: 2.4 }]);
  L = P('JSON.stringify(get(HALF_KEY,{}))');
  const r2 = P(`(()=>{const R=halfRead('nhl',halfModel('nhl'),2.6,3.4),S=halfRead('nhl',halfModel('nhl'),3.6,2.4);return JSON.stringify({h:R.pH/(R.pA+R.pH),hr:R.pH,a:S.pA/(S.pA+S.pH)});})()`);
  const j2 = Object.values(L).find(x => x.voice === 'Judge' && x.mk === 'p1ml'), d2 = Object.values(L).find(x => x.voice === 'Dog' && x.mk === 'p1ml');
  T('a 2-way period board (+115 / −150) is stamped 2-way, and each side\'s chance is the read\'s on the periods that aren\'t tied (not ~30% low)', j2 && j2.w3 === 0 && j2.side === 'home' && Math.abs(j2.p - r2.h) < 1e-3 && j2.p > r2.hr + 0.1 && d2 && d2.side === 'away' && Math.abs(d2.p - r2.a) < 1e-3, J([j2, d2, r2]));
  /* basketball: the half priced on the books' shape; a lopsided price can turn the side */
  E(`set(HALF_KEY,{});delete RO_CACHE[HALF_KEY];set(HALFLN_KEY,{d:today(),g:{'nba|MIA@PHI':{ml:{a:{price:100},h:{price:-120}},sp:{a:{line:0.5,price:-110},h:{line:-0.5,price:-110}},ou:{line:112.5,o:-110,u:-110}}}});delete RO_CACHE[HALFLN_KEY];`);
  log('nba', 'MIA', 'PHI', [{ voice: 'Sim', a: 110, h: 116 }, { voice: 'Coach', a: 113, h: 112 }]);
  L = P('JSON.stringify(get(HALF_KEY,{}))');
  const ss = Object.values(L).find(x => x.voice === 'Sim' && x.mk === 'h1spread'), cs = Object.values(L).find(x => x.voice === 'Coach' && x.mk === 'h1spread'), so = Object.values(L).find(x => x.voice === 'Sim' && x.mk === 'h1total');
  T('a read with PHI by 6 lays the half\'s −0.5; a read with MIA by 1 takes MIA +0.5 — each from its own read, not one shared copy', ss && ss.side === 'home' && ss.pick === '1H PHI -0.5' && cs && cs.side === 'away' && cs.pick === '1H MIA +0.5', J([ss, cs]));
  T('…the half projection comes from the shares (PHI by 6 → ~3.4 at the half), the total too (226 → 113 vs 112.5: a lean over)', Math.abs((ss.ph - ss.pa) - 0.56 * 6) < 0.05 && so && so.side === 'over' && Math.abs((so.pa + so.ph) - 113) < 0.05, J([ss, so]));
  const sm = Object.values(L).find(x => x.voice === 'Sim' && x.mk === 'h1ml');
  T('…the 2-way half moneyline: PHI −120 on a read that has PHI winning the half', sm && sm.side === 'home' && sm.price === -120, J(sm));
  /* a draw call grades on a tied period */
  E(`set(HALF_KEY,{a:{sp:'nhl',game:'BOS@NYR',date:today(),voice:'Judge',mk:'p1ml',side:'draw',line:null,price:175,pick:'P1 Draw',w3:1},b:{sp:'nhl',game:'BOS@NYR',date:today(),voice:'Dog',mk:'p1ml',side:'away',line:null,price:150,pick:'P1 BOS ML',w3:1}});delete RO_CACHE[HALF_KEY];
     finalsFor=function(){return{a:2,h:3,p1a:1,p1h:1};};gradeHalfCalls();`);
  L = P('JSON.stringify(get(HALF_KEY,{}))');
  T('a draw call wins on a tied period (+175 pays 1.75u); a team call on the same period loses', L.a.hit === true && Math.abs(L.a.units - 1.75) < 1e-9 && L.b.hit === false && L.b.units === -1, J([L.a, L.b]));
  /* the blend learns: a sport whose half calls did no better than the market's own chance keeps the market's say */
  const G = {}; for (let i = 0; i < 120; i++) G['k' + i] = { sp: 'nba', mk: 'h1spread', voice: 'Sim', date: '2026-11-20', graded: 1, hit: i % 2 === 0, p: i % 4 < 2 ? 0.7 : 0.3, m: 0.5 };
  E(`set(HALF_KEY,${J(G)});delete RO_CACHE[HALF_KEY];HALF_BW={};`);
  const bw = E(`halfBlendW('nba','spread')`);
  T('the blend weight is earned: half calls whose own chance said nothing the market didn\'t → the market keeps nearly all the say', bw < 0.06, bw);
  /* ── 4 · the feed's lines survive the page opening ── */
  E(`set(HALFLN_KEY,{d:today(),g:{'nba|MIA@PHI':{sp:{a:{line:0.5,price:-110},h:{line:-0.5,price:-110}},src:'an'},'ncaab|ASU@LSU':{ou:{line:68,o:-117,u:-110},src:'an'}}});delete RO_CACHE[HALFLN_KEY];
     intakeDayText=async function(){return 'NBA\\nMIA @ PHI\\nH1OU: o111.5 (-110) / u111.5 (-110)\\nH1SPREAD: MIA +1.5 (-110) / PHI -1.5 (-110)\\n';};`);
  await E('halfLinesRefresh()');
  const LN = P('JSON.stringify(get(HALFLN_KEY,{}))');
  T('the day\'s paste merges with the feed\'s lines instead of wiping them (it ran at every page open)', LN.g['ncaab|ASU@LSU'] && LN.g['ncaab|ASU@LSU'].ou.line === 68 && LN.g['nba|MIA@PHI'].sp.h.line === -1.5 && LN.g['nba|MIA@PHI'].ou.line === 111.5, J(LN));
  const fh = E(`feedStoreHalves({v:1,g:{'nfl|GB@LAR':{d:today(),sp:{a:{line:1,price:-112},h:{line:-1,price:-107}},ou:{line:21,o:-114,u:-105},src:'an'},'nfl|PHI@DAL':{d:'2099-01-01',sp:{a:{line:6,price:-110},h:{line:-6,price:-109}}},'nba|MIA@PHI':{d:today(),sp:{a:{line:3,price:-110},h:{line:-3,price:-110}}}}})`);
  const LN2 = P('JSON.stringify(get(HALFLN_KEY,{}))');
  T('the halves feed adds today\'s games (the NFL, with prices), never another day\'s, never over a line the day already has', fh >= 2 && LN2.g['nfl|GB@LAR'] && LN2.g['nfl|GB@LAR'].ou.o === -114 && !LN2.g['nfl|PHI@DAL'] && LN2.g['nba|MIA@PHI'].sp.h.line === -1.5, J(LN2));
  /* ── 5 · on the game card and the public board ── */
  E(`set(HALF_KEY,{});delete RO_CACHE[HALF_KEY];HALF_TD=null;HALF_RI=null;set(HALFLN_KEY,{d:today(),g:{'nba|MIA@PHI':{ml:{a:{price:100},h:{price:-120}},sp:{a:{line:0.5,price:-110},h:{line:-0.5,price:-110}},ou:{line:112.5,o:-110,u:-110}}}});delete RO_CACHE[HALFLN_KEY];`);
  log('nba', 'MIA', 'PHI', [{ voice: 'Sim', a: 110, h: 116 }, { voice: 'Coach', a: 113, h: 112 }, { voice: 'Judge', a: 111, h: 115 }]);
  const card = E(`sgpCardHtml('nba',{id:'x',away:{abbr:'MIA'},home:{abbr:'PHI'},abstract:'pre'},null)`);
  const ct = card.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  T('every game card on the sport\'s board gets the half: its lines, each pick with the characters on it, the % at the price', /🕐 1st half/.test(ct) && /Lines: PHI -0.5/.test(ct) && /1H PHI -0.5/.test(ct) && /1H MIA \+0.5/.test(ct) && /2 characters/.test(ct) && /% at the price/.test(ct), ct.slice(0, 700));
  E(`slotGames=function(){return{all:[{sp:'nba',game:'MIA@PHI',gid:'x',day:today(),t:0,start:'${new Date(NOW + 3 * 36e5).toISOString()}',st:'pre',picks:[]}]};};PUB_BOARD_MEMO=null;`);
  const B = P(`JSON.stringify(pubBoard0([],today()))`);
  const bg = B.games.find(g => g.game === 'MIA@PHI');
  T('the public board carries each game\'s half calls (even a game with no full-game call yet): pick, price, %, record, official', bg && bg.half && bg.half.spread && bg.half.spread.length === 3 && bg.half.spread.some(c => c.pick === '1H PHI -0.5' && c.price === -110 && c.p > 0 && c.w === 0 && c.o === 0) && B.cast.Sim, J(bg));
  /* the public app draws it */
  const src = fs.readFileSync(path.join(W, 'desk/app.js'), 'utf8');
  const line = name => { const mm = src.match(new RegExp(`const ${name} = [^\\n]+;`)); if (!mm) throw new Error('no ' + name); return mm[0]; };
  const i = src.indexOf('const HALF_MK ='), j = src.indexOf('function boardPicksHtml(', i);
  const castOf = v => ({ name: B.cast[v] ? B.cast[v].name : v, color: '#fff' });
  const { halfOnHtml, halfRowHtml } = new Function('castOf', `${line('esc')}\n${src.includes('const odds = ') ? line('odds') : 'const odds=x=>String(x);'}\n${src.slice(i, j)}\nreturn { halfOnHtml, halfRowHtml };`)(castOf);
  const on = halfOnHtml(bg).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), row = halfRowHtml(bg).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  T('the Slate\'s open game shows every half call by market and pick, who\'s on it and its record there', /Spread/.test(on) && /1H PHI −0\.5/.test(on) && /2 with|2 on it/.test(on) && /1 against/.test(on) && /new/.test(on), on.slice(0, 500));
  T('…and the closed row says the half\'s most-backed calls in one line', /🕐 1st half:/.test(row) && /PHI −0\.5 \d on it/.test(row), row);
  T('…in the open card, under Who\'s with it', /The \$\{halfTag\(b\.sp\)\}<\/h4>/.test(src) && /\$\{halfRowHtml\(b\)\}/.test(src));
  T('no uncaught errors', !errs.length, errs.join(' | '));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 3000);
