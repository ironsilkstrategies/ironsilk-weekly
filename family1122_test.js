/* v3.4.0 · Nov 22, Chris: "Execute" — Bloodlines 2.0, Phase 3: family life. "The new character learns from its parents mistakes much
   quicker and absorbs every attribute from its parents that are being embedded in its ideology over time… the rebellion, disciplines,
   the respect, the admiration." From the day after its birth an heir's genes move with its family, each day only from the days before
   it, in the same walk that judges it; its live calls use the same day's genes. A week's memory (quicker than its parents' season).
   A · the engine on paper: each force, its thresholds, the Steady heir that never rebels, lessons, short memory, walk-forward.
   B · the synthetic world, with the Judge's totals going cold right after the Architect's birth: the heir learns, then rebels, and
       beats the same heir with its birth genes frozen.
   C · whose finals to trust: an heir's score call leans on the parent who has been closer lately.
   D · the rooms: family life in the Nursery, in the chronicle, and on the public card. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const page = f => fs.readFileSync(path.join(W, f), 'utf8').replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, x) => `<script>${fs.readFileSync(path.join(W, x), 'utf8')}</script>`);
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(file, store, now, fetcher) { return new JSDOM(page(file), { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/' + file, pretendToBeVisual: true, beforeParse(w) {
  w.__NOW = now; const RD = w.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [w.__NOW])); } static now() { return w.__NOW; } } w.Date = FD;
  w.__NO_GRADELOOP__ = true; w.__NO_REOPEN__ = true; w.__NO_BACKFILL__ = true; w.__NO_SYNC_LOOP__ = true;
  w.fetch = fetcher || (() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') })); w.scrollTo = () => { }; w.alert = () => { }; w.confirm = () => true;
  w.localStorage.setItem('d4.setupDone', '1'); Object.entries(store).forEach(([k, v]) => w.localStorage.setItem(k, JSON.stringify(v))); } }).window; }
/* ── the synthetic world (womb1122's, run to Jan 3), the Judge's totals going cold from Dec 5 (no extra random draws: the rest is unchanged) ── */
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const dayAt = (d0, i) => new Date(Date.parse(d0 + 'T12:00:00Z') + i * 864e5).toISOString().slice(0, 10);
const OTH = { home: 'away', away: 'home', over: 'under', under: 'over' };
function world(seed, { from = '2026-10-20', to = '2027-01-03', per = 12, judgeCold = null } = {}) {
  const R = rng(seed); const V = [];
  for (let i = 0; ; i++) { const d = dayAt(from, i); if (d > to) break;
    for (let k = 0; k < per; k++) {
      const game = `A${i}x${k}@H${i}x${k}`; const t = 0.1 + 0.8 * R(), s = 0.1 + 0.8 * R(); const homeWin = R() < t, over = R() < s;
      const mlFav = t >= 0.5 ? 'home' : 'away', mm = Math.max(t, 1 - t), toFav = s >= 0.5 ? 'over' : 'under', ms = Math.max(s, 1 - s);
      const add = (v, m, side, cf) => { const price = m === 'ml' ? (side === 'home' ? -110 : 100) : -110; const hit = m === 'ml' ? (side === 'home') === homeWin : (side === 'over') === over;
        V.push({ id: `nhl|${game}|${d}|${v}|${m}`, sp: 'nhl', date: d, game, voice: v, market: m, side, line: m === 'total' ? 5.5 : null, price,
          pick: m === 'ml' ? `${side === 'home' ? 'H' : 'A'}${i}x${k} ML` : `${side === 'over' ? 'Over' : 'Under'} 5.5`, cf: +cf.toFixed(3), lk: Date.parse(d + 'T15:00:00Z'),
          graded: true, hit, push: false, units: hit ? (price < 0 ? 100 / -price : price / 100) : -1, f: [] }); };
      const sharp = m => Math.min(0.97, 0.5 + 1.3 * (m - 0.5)), cold = judgeCold && d >= judgeCold;
      add('Sim', 'ml', mlFav, sharp(mm)); add('Sim', 'total', R() < 0.72 ? OTH[toFav] : toFav, 0.5);
      add('Judge', 'total', cold ? ((i * 7 + k) % 20 < 19 ? OTH[toFav] : toFav) : toFav, sharp(ms)); add('Judge', 'ml', R() < 0.72 ? OTH[mlFav] : mlFav, 0.5);
      add('Coach', 'ml', R() < 0.8 ? mlFav : OTH[mlFav], 0.6); add('Coach', 'total', R() < 0.5 ? 'over' : 'under', 0.5);
      add('Trends', 'total', R() < 0.8 ? toFav : OTH[toFav], 0.6); add('Trends', 'ml', R() < 0.5 ? 'home' : 'away', 0.5);
    } }
  return V; }
const WORLD = world(13, { judgeCold: '2026-12-05' });
const snap = (D, V = WORLD) => V.filter(x => x.date <= D).map(x => x.date === D ? { ...x, graded: false, hit: null, units: null } : x);
const at = D => Date.parse(D + 'T18:00:00Z'), KEY = 'H_L1e1', TOT = ['nhl|total|over', 'nhl|total|under'];

(async () => { try {
  /* ══ A · the engine on paper ══ */
  const p0 = boot('nhl.html', {}, at('2026-11-22')); await wait(1200);
  const PJ = s => JSON.parse(p0.eval(`JSON.stringify(${s})`));
  const fam = (temper, feed, days, d0) => PJ(`(()=>{const R={P:{b:0.35,T:1,contrast:1},lanes:{X:{a:1,b:1},Y:{a:1,b:0},Z:{a:1,b:1},V:{a:1,b:1},W:{a:1,b:1}},vacc:[],fade:[],hot:[]};
    const F=wbFamily({from:'2026-12-01',temper:'${temper}',d0:'${d0 || days[days.length - 1]}'});const feed=${JSON.stringify(feed)};const out={};
    for(const D of ${JSON.stringify(days)}){const r=F.step(D,R);out[D]={lanes:r.lanes,vacc:r.vacc,T:r.P.T};(feed[D]||[]).forEach(x=>F.note(D,x));}
    const fin=F.final(R);return{days:out,fin};})()`);
  const many = (n, x) => Array.from({ length: n }, () => ({ ...x }));
  const D3 = ['2026-12-01', '2026-12-02', '2026-12-03'];
  const sink = { '2026-12-01': many(5, { k: 'X', p: 'a', u: -1 }), '2026-12-02': many(5, { k: 'X', p: 'a', u: -1 }) };
  const st = fam('Steady', sink, D3), rb = fam('Rebel', sink, D3), pr = fam('Prodigy', sink, D3);
  const tagsOf = r => r.fin.now.map(x => `${x.t}|${x.p}|${x.k}`);
  T('learning from a parent\'s mistakes: a parent sinking in a lane (10 straight losses) → the heir barely listens there (its weight × 0.3) and reads the lane softer', tagsOf(st).includes('learn|a|X') && st.days['2026-12-03'].lanes.X.a === 0.3 && st.days['2026-12-03'].lanes.X.t >= 1.15, JSON.stringify([tagsOf(st), st.days['2026-12-03'].lanes.X]));
  T('…a Steady heir never rebels; a Rebel heir fades that parent there (a negative weight)', !tagsOf(st).some(t => /^rebel/.test(t)) && tagsOf(rb).includes('rebel|a|X') && rb.days['2026-12-03'].lanes.X.a < 0, JSON.stringify([tagsOf(rb), rb.days['2026-12-03'].lanes.X]));
  T('…a Prodigy needs more before it rebels (2σ), and 10 straight losses is more', tagsOf(pr).includes('rebel|a|X'), JSON.stringify(tagsOf(pr)));
  const sink4 = { '2026-12-01': many(4, { k: 'X', p: 'a', u: -1 }) }; const s4 = fam('Steady', sink4, ['2026-12-01', '2026-12-02']);
  T('…but a short patch isn\'t a pattern (4 losses: nothing happens)', !tagsOf(s4).length, JSON.stringify(tagsOf(s4)));
  T('nothing counts the same day: day D\'s genes come only from the days before it (the losses on Dec 1–2 move Dec 3, not Dec 2)', !(st.days['2026-12-02'].lanes.X.a !== 1) && st.days['2026-12-03'].lanes.X.a === 0.3, JSON.stringify(st.days['2026-12-02'].lanes.X));
  const ab = fam('Steady', { '2026-12-01': many(8, { k: 'Y', p: 'b', u: 0.909 }) }, ['2026-12-01', '2026-12-02']);
  T('absorbing: a parent rising in a lane → it leans in, even where it was born not listening (a weight of 0 becomes 0.5)', tagsOf(ab).includes('absorb|b|Y') && ab.days['2026-12-02'].lanes.Y.b === 0.5, JSON.stringify(ab.days['2026-12-02'].lanes.Y));
  const re = fam('Steady', { '2026-12-01': many(8, { k: 'Z', p: 'b', u: 0, dis: 1 }) }, ['2026-12-01', '2026-12-02']);
  T('respect: where they disagreed and the parent kept being right (8 of 8) → it listens to that parent more there', tagsOf(re).includes('respect|b|Z') && re.days['2026-12-02'].lanes.Z.b === 1.25, JSON.stringify(re.days['2026-12-02'].lanes.Z));
  const ad = fam('Prodigy', { '2026-12-01': ['X', 'Y', 'Z', 'V', 'W', 'Q'].flatMap(k => many(4, { k, p: 'a', u: 0.5 })) }, ['2026-12-01', '2026-12-02']);   /* hot everywhere, no single lane loud enough on its own */
  T('admiration: a parent hot across the board (2σ) → it leans on that parent everywhere (× 1.25 for a Prodigy)', tagsOf(ad).includes('admire|a|*') && ad.days['2026-12-02'].lanes.W.a === 1.25, JSON.stringify([tagsOf(ad), ad.days['2026-12-02'].lanes.W]));
  const di = fam('Steady', { '2026-12-01': [...many(8, { h: 1, k: 'W', u: -1 }), ...many(12, { h: 1, k: 'V', u: -1 })] }, ['2026-12-01', '2026-12-02']);
  T('discipline: its own lane sliding → it reins its confidence in there (t 1.3); its whole card sliding → grounded (every read softer)', tagsOf(di).includes('discipline|h|W') && di.days['2026-12-02'].lanes.W.t === 1.3 && tagsOf(di).includes('grounded|h|*') && di.days['2026-12-02'].T === 1.15, JSON.stringify([tagsOf(di), di.days['2026-12-02'].lanes.W, di.days['2026-12-02'].T]));
  const va = fam('Steady', { '2026-12-01': [...many(8, { k: 'V', p: 'a', u: -1 }), ...many(8, { k: 'V', p: 'b', u: -1 })] }, ['2026-12-01', '2026-12-02']);
  T('both parents bleeding in a lane → a fresh vaccine (no official call there)', tagsOf(va).includes('vaccine|ab|V') && va.days['2026-12-02'].vacc.includes('V'));
  const wk = Array.from({ length: 12 }, (_, i) => dayAt('2026-12-01', i)); const lsF = {}; wk.slice(0, 10).forEach(d => { lsF[d] = many(3, { k: 'X', p: 'a', u: -1 }); });
  const ls = fam('Steady', lsF, wk);
  T('a pattern that holds seven straight game days becomes a lesson, kept for good', ls.fin.lessons.some(l => l.key === 'learn|a|X'), JSON.stringify(ls.fin.lessons));
  const gone = fam('Steady', sink, ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-31']);
  T('its memory is short on purpose (a week\'s half-life): four quiet weeks later the grudge is gone — and the moment is in its history', !tagsOf(gone).includes('learn|a|X') && gone.fin.events.some(e => e.key === 'learn|a|X' && e.st === 'start') && gone.fin.events.some(e => e.key === 'learn|a|X' && e.st === 'end'), JSON.stringify(gone.fin.events));
  const cap = fam('Steady', { '2026-12-01': many(5, { k: 'X', p: 'a', u: -1 }), '2026-12-02': many(5, { k: 'X', p: 'a', u: -1 }) }, D3, '2026-12-02');
  T('nothing past today: on Dec 2 its genes are Dec 2\'s (the Dec 2 losses wait for tomorrow)', cap.fin.adjD === '2026-12-02' && !cap.fin.now.some(x => x.t === 'learn'), JSON.stringify(cap.fin));

  /* ══ B · the world: the Judge goes cold on totals right after the birth ══ */
  const w = boot('nhl.html', { 'd4.voices': snap('2026-11-22') }, at('2026-11-22')); await wait(1500);
  const E = s => w.eval(s), J = s => JSON.parse(w.eval(`JSON.stringify(${s})`));
  const go = (D, V) => { w.__NOW = at(D); w.__VJ = JSON.stringify(V || snap(D)); E('set(VOICES_KEY,JSON.parse(window.__VJ));WB_IX=null;WOMB_MEMO=null;'); };
  const kid = () => J(`(wombAll().kids||[]).find(K=>K.key==='${KEY}')||null`);
  E('wombRun(true)'); go('2026-12-04'); E('wombRun(true)');
  const K0 = kid();
  /* the Judge's cold spell would make a rookie clearly worse than the Simulator within days (it'd retire, its family life frozen):
     here it has already graduated, and a graduate lives with its family for good */
  E(`(()=>{const W=wombAll();const K=W.kids.find(K=>K.key==='${KEY}');K.st='grad';K.gradAt='2026-12-04';set(WOMB_KEY,W);})()`);
  T('the Architect is born Dec 4, as before (the Judge\'s cold spell starts the next day)', !!K0 && K0.name === 'The Architect' && K0.born === '2026-12-04');
  T('…on its birthday its family life hasn\'t started (it starts Dec 5): it plays the genes it was born with', !K0.fam || !K0.fam.d || (K0.fam.now || []).length === 0, JSON.stringify(K0.fam));
  const seen = {}; let firstMove = null;
  for (const D of ['2026-12-12', '2026-12-16', '2026-12-20', '2026-12-24', '2026-12-28', '2027-01-02']) { go(D); E('wombRun(true)'); const k = kid(); seen[D] = (k.fam.now || []).map(x => `${x.t}|${x.p}|${x.k}`); if (!firstMove && seen[D].some(t => /^(learn|rebel)\|b\|nhl\|total/.test(t))) firstMove = D; }
  const TOTK = [...TOT, 'nhl|total|*'];
  const KJ = kid(); const nowJ = seen['2027-01-02'];
  T('it learns from the Judge\'s mistake: once the Judge\'s totals keep losing, it stops following the Judge there', !!firstMove, JSON.stringify(seen));
  T('…and then rebels: by Jan 2 it fades the Judge on NHL totals (a Prodigy, so only once the Judge is 2σ under)', TOTK.some(k => nowJ.includes(`rebel|b|${k}`)) && TOT.some(k => (KJ.fam.adj.lanes[k] || {}).b < 0), JSON.stringify([nowJ, TOT.map(k => KJ.fam.adj.lanes[k])]));
  T('…its live genes are today\'s (the moneylines it took from the Simulator untouched by the Judge\'s slump)', JSON.stringify(J(`wbKidRecipe((wombAll().kids||[])[0]).lanes['nhl|ml|fav'].a>0`)) === 'true' && J(`wbKidRecipe((wombAll().kids||[])[0]).lanes['nhl|total|over'].b`) < K0.recipe.lanes['nhl|total|over'].b);
  const cmp = J(`(()=>{const K=(wombAll().kids||[])[0],IX=wbIndex();const L={a:K.a,b:K.b,domA:K.domA,domB:K.domB},Ee={since:K.liveFrom,recipe:K.recipe},o={calFrom:K.since,minN:150,minDays:21,bar:1,maxDays:42,rookie:1};
    const dyn=wbEval(L,Ee,IX,today(),K.n,null,{...o,family:{from:K.liveFrom,temper:K.temper}}),fix=wbEval(L,Ee,IX,today(),K.n,null,o);return{dyn:[dyn.me,dyn.A.z,dyn.B.z],fix:[fix.me,fix.A.z,fix.B.z]};})()`);
  T('learning pays: from its birth to Jan 2 the living heir does better than the same heir with its birth genes frozen (more units, and less far behind the Simulator, whose totals it can\'t lean on anymore)', cmp.dyn[0].u > cmp.fix[0].u && cmp.dyn[1] > cmp.fix[1], JSON.stringify(cmp));
  /* walk-forward: what it knew on Dec 20 doesn't change whatever happens from Dec 20 on */
  const famOn = (D, V) => { go('2027-01-02', V); return J(`(()=>{const K=(wombAll().kids||[])[0];const r=wbEval({a:K.a,b:K.b,domA:K.domA,domB:K.domB},{since:K.liveFrom,recipe:K.recipe},wbIndex(),'${D}',K.n,'${D}',{calFrom:K.since,family:{from:K.liveFrom,temper:K.temper}});return{adj:r.fam.adj,now:r.fam.now};})()`); };
  const f0 = famOn('2026-12-20'), f1 = famOn('2026-12-20', snap('2027-01-02').map(x => x.date >= '2026-12-20' && x.graded ? { ...x, hit: !x.hit } : x));
  T('walk-forward: flip every result from Dec 20 on and its genes for Dec 20 don\'t move (each day only from the days before it)', JSON.stringify(f0) === JSON.stringify(f1), JSON.stringify([f0.now, f1.now]));
  go('2027-01-02'); E('wombRun(true)');
  const ch = J(`journalAll().filter(x=>x.kind==='womb'&&/^(✊|🌟|📚)/.test(x.title)).map(x=>x.d+' '+x.title+' | '+x.what)`);
  T('the chronicle: ✊ "The Architect rebels against The Judge" with the day it happened and why', ch.some(t => /^\d{4}-\d{2}-\d{2} ✊ The Architect rebels against The Judge \| Goes against The Judge on NHL [a-zA-Z ]+ \(The Judge −\d+\.\du there lately\)\.$/.test(t)), JSON.stringify(ch));
  const room = E(`(GEN_TAB='nursery',nurseryHtml())`), txt = room.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  T('🍼 the Nursery shows its family life: what\'s going on now, in words, and its latest moments', /👪 Family life/.test(txt) && /✊ Goes against The Judge on NHL [a-zA-Z ]+ \(The Judge −\d/.test(txt) && /Lately/.test(txt), txt.slice(txt.indexOf('Family life') - 10, txt.indexOf('Family life') + 400));
  const pc = J(`(()=>{PUB_CHAR_MEMO=null;const V=get(VOICES_KEY,[]).slice();V.push({id:'x1',sp:'nhl',date:today(),game:'A@B',voice:'${KEY}',market:'ml',side:'home',price:-120,pick:'B ML',cf:0.75,kp:0.75,graded:false});return(pubCharacters(V,today()).find(c=>c.v==='${KEY}')||{}).kid||null;})()`);
  T('🌐 its public card carries its family life in the cast\'s words (no σ, no units, no method talk)', !!pc && Array.isArray(pc.family) && pc.family.some(t => /^Goes against The Judge on NHL [a-zA-Z ]+$/.test(t)) && pc.family.every(t => !/σ|\d+\.\du|model|calibrat|sample/i.test(t)), JSON.stringify(pc && pc.family));

  /* ══ C · whose finals to trust ══ */
  const NOW = Date.parse('2026-11-20T20:00:00Z');
  const comp = (side, t) => ({ homeAway: side, team: { abbreviation: t[0], displayName: t[1], shortDisplayName: t[1].split(' ').slice(-1)[0], location: t[1].split(' ').slice(0, -1).join(' '), id: t[2] }, score: '', linescores: [], records: [{ summary: '8-6' }], curatedRank: { current: 99 } });
  const ev = (id, date, a, h, odds) => ({ id, date, season: { type: 2, slug: 'regular-season' }, competitions: [{ status: { type: { state: 'pre', shortDetail: '7:00 PM' }, period: 0 }, neutralSite: false, venue: { fullName: 'Arena' }, odds: odds ? [odds] : [], competitors: [comp('away', a), comp('home', h)] }] });
  const odds = (hsp, tot, aml, hml) => ({ details: '', overUnder: tot, spread: hsp, awayTeamOdds: { moneyLine: aml, spreadOdds: -110 }, homeTeamOdds: { moneyLine: hml, spreadOdds: -110 }, overOdds: -110, underOdds: -110, provider: { name: 'DraftKings' } });
  const MIA = ['MIA', 'Miami Heat', '14'], ORL = ['ORL', 'Orlando Magic', '19'];
  const std = rows => ({ children: [{ standings: { entries: rows.map(([ab, pf, pa, gp]) => ({ team: { abbreviation: ab, id: ab }, stats: [{ name: 'avgPointsFor', value: pf }, { name: 'avgPointsAgainst', value: pa }, { name: 'gamesPlayed', value: gp }, { name: 'wins', value: Math.round(gp / 2) }, { name: 'losses', value: Math.round(gp / 2) }] })) } }] });
  const fetcher = u => { u = String(u); const Jr = b => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(b), text: () => Promise.resolve(JSON.stringify(b)) });
    if (/basketball\/nba\/scoreboard/.test(u)) return Jr({ events: /dates=20261120/.test(u) ? [ev('full', '2026-11-21T00:30Z', MIA, ORL, odds(-2, 215, 110, -130))] : [] });
    if (/basketball\/nba\/standings/.test(u)) return Jr(/season=2027/.test(u) ? std([]) : std([['MIA', 110, 110, 82], ['ORL', 106, 105, 82]]));
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('{}') }); };
  const KC = { key: 'H_T1', id: 'T1', litter: 'LT', a: 'Sim', b: 'Judge', arch: 'Steady All-rounder', temper: 'Steady', craft: 'All-rounder', name: 'The Heir', chip: '⭐ HEIR', title: 'The Steady Hand', color: '#f7c04a', crest: { g: '⭐', t: '⚓' },
    creed: 'x', pub: { bio: 'x', origin: 'x' }, born: '2026-11-19', liveFrom: '2026-11-20', since: '2026-11-01', conceived: '2026-10-31', recipe: { P: { b: 0.45, T: 1, contrast: 1 }, lanes: {}, vacc: [], fade: [], hot: [], mut: 'none', temper: 'Steady', craft: 'All-rounder' }, domA: [], domB: [], n: 1, st: 'rookie', womb: { days: 18 }, cal: [] };
  const SC = {}; for (let i = 0; i < 30; i++) { const d = dayAt('2026-10-15', i); SC['s' + i] = { voice: 'Sim', sp: 'nba', date: d, game: 'X@Y', a: 100, h: 100, graded: 1, exact: 0, err: 22 }; SC['j' + i] = { voice: 'Judge', sp: 'nba', date: d, game: 'X@Y', a: 100, h: 100, graded: 1, exact: 0, err: 6 }; }
  const v = boot('nba.html', { 'd4.womb': { v: 1, litters: [], tried: 1, firstDone: 1, lastConceived: '2026-11-20', kids: [KC] }, 'd4.scorecalls': SC }, NOW, fetcher); await wait(3500);
  const sc = JSON.parse(v.eval(`JSON.stringify((()=>{const g=NBA_GAMES.find(x=>x.id==='full');const s=bbSim(BB_CFG.nba,g);const C=characterCalls('nba',g,s);const R=scoreCallsFor('nba',g,s,C);const by=v=>R.find(x=>x.voice===v);
    const ml=(C.find(c=>c.voice==='H_T1'&&c.market==='ml')||{}).side;return{k:by('H_T1'),s:by('Sim'),j:by('Judge'),ml,w:wbScoreAcc()};})())`));
  const dist = (x, y) => Math.abs(x.a - y.a) + Math.abs(x.h - y.h);
  T('🎯 whose finals to trust: its score call leans on the parent who has been closer lately (the Judge, 6 points off against the Simulator\'s 22)', !!sc.k && !!sc.s && !!sc.j && dist(sc.k, sc.j) <= dist(sc.k, sc.s) && (sc.ml !== 'home' || sc.k.h > sc.k.a) && (sc.ml !== 'away' || sc.k.a > sc.k.h), JSON.stringify([sc.k, sc.j, sc.s, sc.ml]));
  const nh = v.eval(`(GEN_TAB='nursery',nurseryHtml())`).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  T('…and the Nursery says so', /🎯 Its final scores lean on The Judge in NBA \(6\.0 vs 22\.0 points off lately\)/.test(nh), nh.slice(nh.indexOf('🎯'), nh.indexOf('🎯') + 120));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); })();
