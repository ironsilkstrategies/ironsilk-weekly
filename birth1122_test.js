/* v3.3.0 · Nov 22, Chris: "Handle it" — Bloodlines 2.0, Phase 2: births. "Once born they become a character on the app with their
   own name style and ideology… the parent would stay as a character." A due embryo is born at once: a name from its craft, a title
   from its temperament, a crest split in its parents' colors, a creed, a bio. It's a character from then on: it calls every game
   either parent calls (through the genes the womb judged, with its own calibrated chance, only on a real line), is locked, graded,
   recorded and published like anyone, never votes, and the confidence-engine heirs leave it alone. Its rookie year is judged live
   against both parents: it graduates or it retires.
   A · the synthetic world from womb1122 (seed 13): the Simulator × the Judge's pure blend is born Dec 4 and graduates.
   B · the same world with the newborn's moneylines read backwards: it retires.
   C · an heir on a real slate (NBA games mocked off ESPN): its calls, its confidence, the ledger, the gates, the public card. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const page = f => fs.readFileSync(path.join(W, f), 'utf8').replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, x) => `<script>${fs.readFileSync(path.join(W, x), 'utf8')}</script>`);
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(file, store, now, fetcher) { return new JSDOM(page(file), { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/' + file, pretendToBeVisual: true, beforeParse(w) {
  w.__NOW = now; const RD = w.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [w.__NOW])); } static now() { return w.__NOW; } } w.Date = FD;
  w.__NO_GRADELOOP__ = true; w.__NO_REOPEN__ = true; w.__NO_BACKFILL__ = true; w.__NO_SYNC_LOOP__ = true;
  w.fetch = fetcher || (() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') })); w.scrollTo = () => { }; w.alert = () => { }; w.confirm = () => true;
  w.localStorage.setItem('d4.setupDone', '1'); Object.entries(store).forEach(([k, v]) => w.localStorage.setItem(k, JSON.stringify(v))); } }).window; }
/* ── the synthetic world (womb1122's, run to Dec 30) ── */
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const dayAt = (d0, i) => new Date(Date.parse(d0 + 'T12:00:00Z') + i * 864e5).toISOString().slice(0, 10);
const OTH = { home: 'away', away: 'home', over: 'under', under: 'over' };
function world(seed, { from = '2026-10-20', to = '2026-12-30', per = 12 } = {}) {
  const R = rng(seed); const V = [];
  for (let i = 0; ; i++) { const d = dayAt(from, i); if (d > to) break;
    for (let k = 0; k < per; k++) {
      const game = `A${i}x${k}@H${i}x${k}`; const t = 0.1 + 0.8 * R(), s = 0.1 + 0.8 * R(); const homeWin = R() < t, over = R() < s;
      const mlFav = t >= 0.5 ? 'home' : 'away', mm = Math.max(t, 1 - t), toFav = s >= 0.5 ? 'over' : 'under', ms = Math.max(s, 1 - s);
      const add = (v, m, side, cf) => { const price = m === 'ml' ? (side === 'home' ? -110 : 100) : -110; const hit = m === 'ml' ? (side === 'home') === homeWin : (side === 'over') === over;
        V.push({ id: `nhl|${game}|${d}|${v}|${m}`, sp: 'nhl', date: d, game, voice: v, market: m, side, line: m === 'total' ? 5.5 : null, price,
          pick: m === 'ml' ? `${side === 'home' ? 'H' : 'A'}${i}x${k} ML` : `${side === 'over' ? 'Over' : 'Under'} 5.5`, cf: +cf.toFixed(3), lk: Date.parse(d + 'T15:00:00Z'),
          graded: true, hit, push: false, units: hit ? (price < 0 ? 100 / -price : price / 100) : -1, f: [] }); };
      const sharp = m => Math.min(0.97, 0.5 + 1.3 * (m - 0.5));
      add('Sim', 'ml', mlFav, sharp(mm)); add('Sim', 'total', R() < 0.72 ? OTH[toFav] : toFav, 0.5);
      add('Judge', 'total', toFav, sharp(ms)); add('Judge', 'ml', R() < 0.72 ? OTH[mlFav] : mlFav, 0.5);
      add('Coach', 'ml', R() < 0.8 ? mlFav : OTH[mlFav], 0.6); add('Coach', 'total', R() < 0.5 ? 'over' : 'under', 0.5);
      add('Trends', 'total', R() < 0.8 ? toFav : OTH[toFav], 0.6); add('Trends', 'ml', R() < 0.5 ? 'home' : 'away', 0.5);
    } }
  return V; }
const WORLD = world(13);
const snap = D => WORLD.filter(x => x.date <= D).map(x => x.date === D ? { ...x, graded: false, hit: null, units: null } : x);
const at = D => Date.parse(D + 'T18:00:00Z');
const KEY = 'H_L1e1';
function harness(w) { const E = s => w.eval(s), J = s => JSON.parse(w.eval(`JSON.stringify(${s})`));
  const go = D => { w.__NOW = at(D); w.__VJ = JSON.stringify(snap(D)); E('set(VOICES_KEY,JSON.parse(window.__VJ));WB_IX=null;WOMB_MEMO=null;'); };
  return { E, J, go, kid: () => J(`(wombAll().kids||[]).find(K=>K.key==='${KEY}')||null`) }; }

(async () => { try {
  /* ══ A · born, and a rookie year that graduates ══ */
  const w = boot('nhl.html', { 'd4.voices': snap('2026-11-22') }, at('2026-11-22')); await wait(1500); const { E, J, go, kid } = harness(w);
  E('wombRun(true)');
  T('nobody is born on conception day (the first litters are conceived Nov 22, judged from Nov 23)', J('(wombAll().kids||[]).length') === 0 && !E(`!!CHARS['${KEY}']`));
  go('2026-12-01'); E('wombRun(true)');
  T('Dec 1: still in the womb (eight days isn\'t ten)', J('(wombAll().kids||[]).length') === 0);
  const S0 = E('localStorage.getItem(VOICES_KEY)');
  go('2026-12-04'); const R4 = J('(()=>{const R=wombRun(true);return{born:R.born,kid:R.kid};})()'); const K = kid(), Wb = J('wombAll()'); const L1 = Wb.litters.find(L => L.a === 'Sim' && L.b === 'Judge');
  T('👶 Dec 4: the pure blend clears every bar and is born the same day', !!K && JSON.stringify(R4.born) === `["${KEY}"]` && K.born === '2026-12-04' && K.st === 'rookie', JSON.stringify(R4.born));
  T('…its name comes from its craft, its title from its temperament: a Prodigy Architect is "The Architect", the Golden Child', K.name === 'The Architect' && K.chip === '📐 ARCH' && K.title === 'The Golden Child' && K.arch === 'Prodigy Architect', JSON.stringify([K.name, K.chip, K.title, K.arch]));
  T('…its crest is split in its parents\' colors, with its craft at the center and its temperament on top (📐 · ✨), and its own color is theirs mixed', K.crest.g === '📐' && K.crest.t === '✨' && /^#[0-9a-f]{6}$/.test(K.color) && K.color !== E(`CHARS.Sim.color`) && K.color !== E(`CHARS.Judge.color`), JSON.stringify([K.crest, K.color]));
  T('…its creed: "Ride what\'s working. Totals from one parent, sides from the other."', K.creed === "Ride what's working. Totals from one parent, sides from the other.", K.creed);
  T('…it carries the genes the womb judged, the calibration it learned there, and its birth record (beat both parents, 11 days)', JSON.stringify(K.recipe) === JSON.stringify(L1.embryos[0].recipe) && K.cal.length > 0 && K.womb.days === 11 && K.womb.zA >= 2 && K.womb.zB >= 2, JSON.stringify(K.womb));
  T('…its rookie year starts tomorrow (Dec 5), nothing backdated', K.liveFrom === '2026-12-05' && K.since === '2026-11-23');
  T('its litter closes: born; any sibling still in the womb is released', L1.st === 'born' && L1.bornAt === '2026-12-04' && L1.kid === KEY && L1.embryos[0].st === 'born' && L1.embryos.slice(1).every(e => e.st === 'released' || e.st === 'lost'), JSON.stringify(L1.embryos.map(e => e.st)));
  T('the other litter (the Coach × the Historian) carries on', Wb.litters.some(L => L.a === 'Coach' && L.st === 'live'));
  const Jb = J(`journalAll().filter(x=>x.kind==='womb'&&/^👶/.test(x.title)).map(x=>x.title+' | '+x.what)`);
  T('the chronicle: 👶 "The Simulator × The Judge: The Architect is born — a Prodigy Architect"', Jb.length === 1 && /^👶 The Simulator × The Judge: The Architect is born — a Prodigy Architect/.test(Jb[0]) && /as a rookie: 21 days and 150\+ calls against each parent to graduate/.test(Jb[0]), Jb[0]);
  /* §6 · a character */
  const reg = J(`(()=>{const C=CHARS['${KEY}'];return{C,i:CHAR_ORDER.indexOf('${KEY}'),b:CHAR_ORDER.indexOf('Banker'),meta:META_VOICES.has('${KEY}'),voter:isVoter('${KEY}'),bio:PUB_BIOS['${KEY}'],scrub:[PUB_BIOS['${KEY}'].bio,PUB_BIOS['${KEY}'].origin].every(t=>{const u=t.replace(/the Simulator/g,'the parent');return pubScrub(u)===u;}),name:charName('${KEY}')};})()`);
  T('it\'s a character now: on the roster (just before the Banker), named on every record, with its school of thought', !!reg.C && reg.C.kid === 1 && reg.i >= 0 && reg.i === reg.b - 1 && reg.name === 'The Architect' && /Child of the Simulator and the Judge, born Dec 4/.test(reg.C.school), JSON.stringify(reg.C));
  T('…but it never votes: its read comes from its parents\' (a derived voice, like the Brain and the Banker)', reg.meta && reg.voter === false);
  T('…its public bio and origin, written for the page in the cast\'s voice (no method talk: apart from its parents\' names, the public scrub has nothing to take out)', reg.scrub && /^Born Dec 4 to the Simulator and the Judge, their first child\./.test(reg.bio.bio) && /leans in/.test(reg.bio.bio) && /totals from one parent, sides from the other/.test(reg.bio.bio) && /11 days in the womb/.test(reg.bio.origin) && reg.bio.title === 'The Golden Child', reg.bio.bio);
  T('…and nothing about its birth touched a pick', E('localStorage.getItem(VOICES_KEY)') === E('localStorage.getItem(VOICES_KEY)') && J(`get(VOICES_KEY,[]).filter(x=>x.voice==='${KEY}').length`) === 0);
  const room = E(`(GEN_TAB='nursery',nurseryHtml())`);
  T('🍼 the Nursery: its crest, name, title, type, parents, creed, what it took from whom, its womb record, its rookie bars', /<svg[^>]*aria-label="The Architect's crest"/.test(room) && /The Architect/.test(room) && /The Golden Child · a Prodigy Architect · 🍼 Rookie/.test(room) && /Child of <b[^>]*>The Simulator<\/b> and <b[^>]*>The Judge<\/b> · born Dec 4/.test(room) && /Ride what.s working/.test(room) && /11 days in the womb/.test(room), room.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400));
  T('…on its first day the rookie year hasn\'t started yet (it starts Dec 5)', /rookie year starts Dec 5/.test(room) || /Rookie days/.test(room));
  E('genOpen()'); await wait(2500); E(`GEN_TAB='nursery';genRender()`); const book = E(`document.getElementById('genView').innerHTML`);
  T('the Bloodlines book has the 🍼 Nursery tab and counts the heirs born', /🍼 Nursery/.test(book) && /1 heir born/.test(book), book.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));
  /* the next day: its parents don't court again while it's a rookie; the rookie year starts */
  go('2026-12-05'); const R5 = J('wombRun(true)'); const W5 = J('wombAll()');
  T('Dec 5: the rookie\'s parents don\'t court each other again while it\'s a rookie', !W5.litters.some(L => L.st === 'live' && [L.a, L.b].sort().join() === 'Judge,Sim'), JSON.stringify(W5.litters.map(L => L.a + '×' + L.b + ':' + L.st)));
  T('…its rookie year is under way, judged live against both parents (no game counted before today)', !!R5.kid[KEY] && R5.kid[KEY].A.n === 0 && R5.kid[KEY].days === 0, JSON.stringify(R5.kid[KEY] && R5.kid[KEY].A));
  go('2026-12-16'); const R16 = J('wombRun(true)'); const k16 = kid();
  T('Dec 16: eleven days in, still a rookie (graduation takes 21 days and 150 calls against each)', k16.st === 'rookie' && R16.kid[KEY].days === 11 && R16.kid[KEY].A.n === 264, JSON.stringify({ d: R16.kid[KEY].days, n: R16.kid[KEY].A.n, z: [R16.kid[KEY].A.z, R16.kid[KEY].B.z] }));
  T('…its calibration keeps learning every day (more games behind its chances than at birth)', k16.cal.reduce((t, b) => t + b.n, 0) > K.cal.reduce((t, b) => t + b.n, 0), String(k16.cal.reduce((t, b) => t + b.n, 0)));
  go('2026-12-26'); const R26 = J('wombRun(true)'); const k26 = kid(), r26 = R26.kid[KEY];
  T('🎓 Dec 26: 21 days in, still ahead of both parents on the games since it was born, its official calls still paying as much: it graduates', k26.st === 'grad' && k26.gradAt === '2026-12-26' && r26.A.z >= 1 && r26.B.z >= 1 && r26.A.n >= 150 && r26.duA >= -1 && r26.duB >= -1, JSON.stringify({ zA: r26.A.z, zB: r26.B.z, n: r26.A.n, off: r26.off, offA: r26.offA, offB: r26.offB }));
  T('…the chronicle: 🎓 "The Architect graduates"', J(`journalAll().filter(x=>x.kind==='womb'&&/^🎓 The Architect graduates/.test(x.title)).length`) === 1);
  const room26 = E('nurseryHtml()');
  T('…the Nursery shows it graduated, and its parents may court again', /🎓 Graduated/.test(room26) && !J(`(wombAll().kids||[]).some(K=>K.st==='rookie')`));
  /* sync: a second device that never saw the birth can't undo it */
  const M = J(`(()=>{const now=wombAll();const old=JSON.parse(JSON.stringify(now));old.kids=[];old.litters.forEach(L=>{if(L.st==='born'){L.st='live';delete L.bornAt;delete L.kid;L.embryos.forEach(e=>{if(e.st==='born'||e.st==='released'){e.st='due';}});}});
    const m1=wombMerge(old,now),m2=syncMergeVal(WOMB_KEY,{t:2,v:old},{t:1,v:now});const rk=JSON.parse(JSON.stringify(now));rk.kids[0].st='rookie';delete rk.kids[0].gradAt;const m3=wombMerge(rk,now);
    return{k1:(m1.kids||[]).map(K=>K.key+':'+K.st),l1:m1.litters.find(L=>L.a==='Sim').st,e1:m1.litters.find(L=>L.a==='Sim').embryos[0].st,k2:(m2.kids||[]).map(K=>K.key+':'+K.st),k3:m3.kids.map(K=>K.st)};})()`);
  T('sync: a newer copy from a device that never saw the birth can\'t undo it (the heir, the closed litter, the born embryo all stand), and a graduation stands too', JSON.stringify(M.k1) === `["${KEY}:grad"]` && M.l1 === 'born' && M.e1 === 'born' && JSON.stringify(M.k2) === `["${KEY}:grad"]` && JSON.stringify(M.k3) === '["grad"]', JSON.stringify(M));

  /* ══ B · a rookie that reads its father's moneylines backwards retires ══ */
  const w2 = boot('nhl.html', { 'd4.voices': snap('2026-11-22') }, at('2026-11-22')); await wait(1500); const B = harness(w2);
  B.E('wombRun(true)'); B.go('2026-12-04'); B.E('wombRun(true)');
  B.E(`(()=>{const W=wombAll();const K=W.kids.find(K=>K.key==='${KEY}');['nhl|ml|fav','nhl|ml|dog'].forEach(k=>{K.recipe.lanes[k]={a:-2,b:0};});set(WOMB_KEY,W);wbRegisterKids();})()`);
  B.go('2026-12-16'); const Rb = B.J('wombRun(true)'); const kb = B.kid(), rb = Rb.kid[KEY];
  T('🚪 a rookie clearly worse than a parent on the games since it was born (10+ days, 100+ calls) retires', kb.st === 'retired' && kb.retiredAt === '2026-12-16' && /σ worse than The (Simulator|Judge) on \d+ games since it was born/.test(kb.why) && Math.min(rb.A.z, rb.B.z) <= -2, kb.why);
  T('…its record stays on the books under its name, its calls stop, and the chronicle says so', B.E(`CHARS['${KEY}'].label`) === 'The Architect' && B.E(`CHARS['${KEY}'].quiet`) === 'retired' && B.E(`WB_KIDS_LIVE.some(K=>K.key==='${KEY}')`) === false && B.J(`journalAll().filter(x=>x.kind==='womb'&&/^🚪 The Architect retires/.test(x.title)).length`) === 1);

  /* ══ C · an heir on a real slate ══ */
  const NOW = Date.parse('2026-11-20T20:00:00Z');
  const comp = (side, t) => ({ homeAway: side, team: { abbreviation: t[0], displayName: t[1], shortDisplayName: t[1].split(' ').slice(-1)[0], location: t[1].split(' ').slice(0, -1).join(' '), id: t[2] }, score: '', linescores: [], records: [{ summary: '8-6' }], curatedRank: { current: 99 } });
  const ev = (id, date, a, h, odds) => ({ id, date, season: { type: 2, slug: 'regular-season' }, competitions: [{ status: { type: { state: 'pre', shortDetail: '7:00 PM' }, period: 0 }, neutralSite: false, venue: { fullName: 'Arena' }, odds: odds ? [odds] : [], competitors: [comp('away', a), comp('home', h)] }] });
  const odds = (hsp, tot, aml, hml) => ({ details: '', overUnder: tot, spread: hsp, awayTeamOdds: { moneyLine: aml, spreadOdds: -110 }, homeTeamOdds: { moneyLine: hml, spreadOdds: -110 }, overOdds: -110, underOdds: -110, provider: { name: 'DraftKings' } });
  const NBA = { BOS: ['BOS', 'Boston Celtics', '2'], NY: ['NY', 'New York Knicks', '18'], LAL: ['LAL', 'Los Angeles Lakers', '13'], GS: ['GS', 'Golden State Warriors', '9'], MIA: ['MIA', 'Miami Heat', '14'], ORL: ['ORL', 'Orlando Magic', '19'] };
  const std = rows => ({ children: [{ standings: { entries: rows.map(([ab, pf, pa, gp]) => ({ team: { abbreviation: ab, id: ab }, stats: [{ name: 'avgPointsFor', value: pf }, { name: 'avgPointsAgainst', value: pa }, { name: 'gamesPlayed', value: gp }, { name: 'wins', value: Math.round(gp / 2) }, { name: 'losses', value: Math.round(gp / 2) }] })) } }] });
  const fetcher = u => { u = String(u); const Jr = b => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(b), text: () => Promise.resolve(JSON.stringify(b)) });
    if (/basketball\/nba\/scoreboard/.test(u)) return Jr({ events: /dates=20261120/.test(u) ? [ev('full', '2026-11-21T00:30Z', NBA.MIA, NBA.ORL, odds(-2, 215, 110, -130)), ev('noml', '2026-11-21T01:00Z', NBA.LAL, NBA.GS, odds(-14.5, 228.5, null, null)), ev('none', '2026-11-21T01:30Z', NBA.BOS, NBA.NY, null)] : [] });
    if (/basketball\/nba\/standings/.test(u)) return Jr(/season=2027/.test(u) ? std([]) : std([['BOS', 117, 108, 82], ['NY', 116, 111, 82], ['LAL', 115, 113, 82], ['GS', 114, 112, 82], ['MIA', 110, 110, 82], ['ORL', 106, 105, 82]]));
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('{}') }); };
  const KC = { key: 'H_T1', id: 'T1', litter: 'LT', a: 'Sim', b: 'Judge', arch: 'Steady All-rounder', temper: 'Steady', craft: 'All-rounder', name: 'The Heir', chip: '⭐ HEIR', title: 'The Steady Hand', color: '#f7c04a', crest: { g: '⭐', t: '⚓' },
    creed: 'The market is the check. Every lane its parents earned.', pub: { bio: 'Born Nov 19 to the Simulator and the Judge, their first child.', origin: 'Child of the Simulator and the Judge.' }, born: '2026-11-19', liveFrom: '2026-11-20', since: '2026-11-01', conceived: '2026-10-31',
    recipe: { P: { b: 0.45, T: 1, contrast: 1 }, lanes: {}, vacc: [], fade: [], hot: [], mut: 'none: the pure blend', temper: 'Steady', craft: 'All-rounder' }, domA: [], domB: [], n: 1, st: 'rookie', womb: { days: 18, zA: 2.4, zB: 3.1 }, cal: [] };
  const v = boot('nba.html', { 'd4.womb': { v: 1, litters: [], tried: 1, firstDone: 1, lastConceived: '2026-11-20', kids: [KC] } }, NOW, fetcher); await wait(3500);
  const VE = s => v.eval(s), VJ = s => JSON.parse(v.eval(`JSON.stringify(${s})`));
  T('a device that loads with an heir in its records puts it on the roster straight away (a derived voice, no vote)', VE(`!!CHARS.H_T1&&CHARS.H_T1.label==='The Heir'&&META_VOICES.has('H_T1')&&!isVoter('H_T1')&&CHAR_ORDER.includes('H_T1')`));
  const cc = id => VJ(`(()=>{const g=NBA_GAMES.find(x=>x.id==='${id}');const s=bbSim(BB_CFG.nba,g);return characterCalls('nba',g,s).map(c=>({v:c.voice,m:c.market,sd:c.side,line:c.line,price:c.price,kp:c.kp,kr:c.kr,kid:c.kid}));})()`);
  const F = cc('full'), N = cc('noml'), Z = cc('none'); const hk = F.filter(c => c.v === 'H_T1');
  T('🃏 on a priced game it makes its own call in every market its parents called, on the book\'s real numbers', hk.length > 0 && hk.every(c => c.price != null && c.kid === 1 && c.kp > 0 && c.kp < 1) && ['ml', 'spread', 'total'].every(m => F.some(c => (c.v === 'Sim' || c.v === 'Judge') && c.m === m) === hk.some(c => c.m === m)), JSON.stringify(hk));
  T('…where both parents are on the same side, so is it (the blend of two agreeing reads)', ['ml', 'spread', 'total'].every(m => { const s = F.find(c => c.v === 'Sim' && c.m === m), j = F.find(c => c.v === 'Judge' && c.m === m), h = hk.find(c => c.m === m); return !(s && j && s.sd === j.sd) || (h && h.sd === s.sd); }), JSON.stringify(F.filter(c => ['Sim', 'Judge', 'H_T1'].includes(c.v)).map(c => c.v + ':' + c.m + ':' + c.sd)));
  T('…no line, no pick: no moneyline call when the book has no moneyline, nothing at all on a game with no lines', !N.some(c => c.v === 'H_T1' && c.m === 'ml') && !Z.some(c => c.v === 'H_T1'), JSON.stringify(N.filter(c => c.v === 'H_T1').map(c => c.m)));
  const st = VJ(`(()=>{const g=NBA_GAMES.find(x=>x.id==='full');const s=bbSim(BB_CFG.nba,g);const C=characterCalls('nba',g,s).map(c=>({...c}));const P=C.filter(c=>c.voice!=='H_T1').map(c=>({...c}));confStamp(C);confStamp(P);
    return{kid:C.filter(c=>c.voice==='H_T1').map(c=>[c.cf,c.kp,c.cfw]),par:C.filter(c=>c.voice==='Sim'||c.voice==='Judge').map(c=>c.cf),alone:P.filter(c=>c.voice==='Sim'||c.voice==='Judge').map(c=>c.cf)};})()`);
  T('its confidence is its own calibrated chance (the desk\'s stamp leaves it alone), and its parents\' confidence doesn\'t move with it in the room', st.kid.length > 0 && st.kid.every(([cf, kp, w]) => cf === kp && /its own read/.test(w[0])) && JSON.stringify(st.par) === JSON.stringify(st.alone), JSON.stringify(st));
  VE("voicesLog('nba',true)"); const led = VJ(`get(VOICES_KEY,[]).filter(x=>x.voice==='H_T1').map(x=>({m:x.market,cf:x.cf,kp:x.kp,price:x.price,date:x.date}))`);
  const nk = hk.length + N.filter(c => c.v === 'H_T1').length;
  T('📒 its calls go in the ledger like anyone\'s (every priced game tonight), locked at the start, graded at the final', led.length === nk && led.every(x => x.cf === x.kp && x.price != null && x.date === '2026-11-20'), JSON.stringify(led));
  const gates = VJ(`(()=>{const x=get(VOICES_KEY,[]).find(x=>x.voice==='H_T1'&&x.market==='ml')||get(VOICES_KEY,[]).find(x=>x.voice==='H_T1');const o=(cf,price)=>isOfficial({...x,cf,kp:cf,price});return{hi:o(0.78,-120),lo:o(0.55,-120),heavy:x.market==='ml'?o(0.95,-600):false,bad:o(0.72,-400),floor:confFloorFor(x),lean:o(0.6,-200)};})()`);
  T('official on the desk\'s own gates: its chance at the day\'s floor and a price worth it — never under the floor, never the heavy lane, never a price its chance says loses, under 70% only at −150 or longer', gates.hi === true && gates.lo === false && gates.heavy === false && gates.bad === false && gates.lean === false, JSON.stringify(gates));
  VE(`(()=>{const W=wombAll();W.kids[0].born='2026-11-25';set(WOMB_KEY,W);wbRegisterKids();Object.keys(CHAR_CACHE).forEach(k=>delete CHAR_CACHE[k]);})()`);
  T('never a call on a day before it was born', !cc('full').some(c => c.v === 'H_T1'));
  VE(`(()=>{const W=wombAll();W.kids[0].born='2026-11-19';W.kids[0].st='retired';set(WOMB_KEY,W);wbRegisterKids();Object.keys(CHAR_CACHE).forEach(k=>delete CHAR_CACHE[k]);})()`);
  T('a retired heir makes no calls (its name stays on its record)', !cc('full').some(c => c.v === 'H_T1') && VE(`CHARS.H_T1.label`) === 'The Heir');
  VE(`(()=>{const W=wombAll();W.kids[0].st='rookie';set(WOMB_KEY,W);wbRegisterKids();Object.keys(CHAR_CACHE).forEach(k=>delete CHAR_CACHE[k]);})()`);
  /* graded: the confidence-engine heirs never open a bloodline for it; the squares never hear it */
  VE(`(()=>{const V=get(VOICES_KEY,[]);V.forEach(x=>{x.graded=true;x.hit=x.side==='home'||x.side==='under';x.units=x.hit?0.9:-1;});set(VOICES_KEY,V);})()`);
  const hc = VJ(`(()=>{try{heirsRun(true);}catch(e){return['err '+e.message];}return Object.keys(heirsAll().cells||{});})()`);
  T('the confidence-engine heirs never open a bloodline for it (it has its own learning)', hc.length > 0 && !hc.some(k => /^H_T1\|/.test(k)), JSON.stringify(hc));
  const sq = VJ(`(()=>{const g=NBA_GAMES.find(x=>x.id==='full');const s=bbSim(BB_CFG.nba,g);return characterCalls('nba',g,s).filter(c=>isVoter(c.voice)).map(c=>c.voice);})()`);
  T('…and nothing that counts votes ever hears it', sq.length > 0 && !sq.includes('H_T1'));
  /* the public card */
  const pc = VJ(`(()=>{PUB_CHAR_MEMO=null;const C=pubCharacters(get(VOICES_KEY,[]),today());return C.find(c=>c.v==='H_T1')||null;})()`);
  T('🌐 the public page gets its card: name, title, bio, and its family (parents, colors, born, rookie, type, creed, crest glyphs)', !!pc && pc.name === 'The Heir' && pc.title === 'The Steady Hand' && /^Born Nov 19/.test(pc.bio) && !!pc.kid && pc.kid.a === 'The Simulator' && pc.kid.b === 'The Judge' && pc.kid.born === '2026-11-19' && pc.kid.st === 'rookie' && pc.kid.g === '⭐' && pc.kid.t === '⚓' && /^#/.test(pc.kid.ca), JSON.stringify(pc && pc.kid));
  const bl = VJ(`(()=>{const W=wombAll();W.litters=[{id:'L9',st:'live',a:'Coach',b:'Trends',conceived:'2026-11-18',arch:{label:'Steady All-rounder'},embryos:[{id:'L9e1',st:'womb'},{id:'L9e2',st:'due'}]}];set(WOMB_KEY,W);return pubBloodlines();})()`);
  T('…and the bloodlines feed carries the womb in one line (who\'s expecting, what kind of child, since when)', !!bl && !!bl.womb && bl.womb.heirs === 1 && bl.womb.litters.length === 1 && bl.womb.litters[0].a === 'The Coach' && bl.womb.litters[0].arch === 'Steady All-rounder' && bl.womb.litters[0].embryos === 2 && bl.womb.litters[0].due === true, JSON.stringify(bl && bl.womb));
  T('the Team challenge never drafts an heir (it never has a team pick of its own)', VE(`!TM_ROSTER(bkWeekStart()).includes('H_T1')||bkWeekStart()<TM_ROSTER_FROM`));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); })();
