/* v3.5.0 · Nov 22, Chris: "Execute" — Bloodlines 2.0, Phase 4: evolution. "once they out do a parent by so much to the point of where
   the parent has to EVOLVE to a higher set of standards and becomes a 'legacy 2' character and the child becomes a 'gen 2' and so on
   and so on til we have our characters hitting on 90% of their calls of confidence of 80% or more…. And characters calling a exact
   score more often than not."
   A · the higher standard on paper: what an evolved character may claim (its record at the number it said, in that kind of bet, the
       low end of it, less 2.5 points a level), never raised, never before its day, walk-forward, on its public number and its official
       gates, never on what it said (its children read that), an heir's own gates too.
   B · the synthetic world run long: the Architect graduates, outdoes both parents by so much that they evolve (Legacy 2) and it earns
       Gen 2; the race starts over against their new selves; three weeks later the Judge evolves again (Legacy 3). Chronicle, rooms,
       public card, family news.
   C · selection: a graduate courts like anyone proven, never its own blood; a full desk makes the weakest graduate step aside for a
       stronger newborn (or the newborn waits).
   D · the North Star on a ledger with known answers: who's there, the desk, exact finals, the chronicle (once), the room.
   E · sync: an evolution, a generation and the North Star on either device stand. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const page = f => fs.readFileSync(path.join(W, f), 'utf8').replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, x) => `<script>${fs.readFileSync(path.join(W, x), 'utf8')}</script>`);
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(file, store, now) { return new JSDOM(page(file), { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/' + file, pretendToBeVisual: true, beforeParse(w) {
  w.__NOW = now; const RD = w.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [w.__NOW])); } static now() { return w.__NOW; } } w.Date = FD;
  w.__NO_GRADELOOP__ = true; w.__NO_REOPEN__ = true; w.__NO_BACKFILL__ = true; w.__NO_SYNC_LOOP__ = true;
  w.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); w.scrollTo = () => { }; w.alert = () => { }; w.confirm = () => true;
  w.localStorage.setItem('d4.setupDone', '1'); Object.entries(store).forEach(([k, v]) => w.localStorage.setItem(k, JSON.stringify(v))); } }).window; }
const near = (a, b, e = 0.0025) => typeof a === 'number' && Math.abs(a - b) <= e;
const dayAt = (d0, i) => new Date(Date.parse(d0 + 'T12:00:00Z') + i * 864e5).toISOString().slice(0, 10);
/* ── the synthetic world (womb1122's, run long) ── */
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const OTH = { home: 'away', away: 'home', over: 'under', under: 'over' };
function world(seed, { from = '2026-10-20', to = '2027-01-21', per = 12 } = {}) {
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
const snap = (D, V = WORLD) => V.filter(x => x.date <= D).map(x => x.date === D ? { ...x, graded: false, hit: null, units: null } : x);
const at = D => Date.parse(D + 'T18:00:00Z'), KEY = 'H_L1e1';

(async () => { try {
  /* ══ A · the higher standard on paper (before the Coach's first day, so his clipboard, the chemistry and the weather stay out of it) ══ */
  const L = []; let gi = 0;
  const hist = (n, hits, o) => { for (let i = 0; i < n; i++) { const d = dayAt('2026-10-01', i % 36), g = `HA${gi}@HB${gi}`; gi++; const hit = i < hits;
    L.push({ id: `nhl|${g}|${d}|Judge|${o.m}`, sp: 'nhl', date: d, game: g, voice: 'Judge', market: o.m, side: o.side, line: o.line ?? null, price: o.price, pick: 'x', cf: o.cf, graded: true, hit, push: false, units: hit ? 0.909 : -1, f: [] }); } };
  hist(100, 85, { m: 'spread', side: 'home', line: -3.5, price: -110, cf: 0.85 });   /* spread favorites: says 85%, hits 85% */
  hist(100, 72, { m: 'spread', side: 'away', line: 3.5, price: -110, cf: 0.72 });    /* spread dogs: says 72%, hits 72% */
  hist(100, 60, { m: 'total', side: 'over', line: 5.5, price: -110, cf: 0.85 });     /* overs: says 85%, hits 60% */
  hist(100, 95, { m: 'total', side: 'under', line: 5.5, price: -110, cf: 0.75 });    /* unders: says 75%, hits 95% */
  hist(60, 57, { m: 'ml', side: 'home', price: -700, cf: 0.88 });                    /* −700 favorites: says 88%, hits 95% */
  hist(20, 12, { m: 'ml', side: 'home', price: -300, cf: 0.88 });                    /* −300 favorites: says 88%, hits 60% */
  const NEW = (id, o) => ({ id: 'new|' + id, sp: 'nhl', date: '2026-11-06', game: 'NA@NB' + id, voice: o.v || 'Judge', market: o.m, side: o.side, line: o.line ?? null, price: o.price, pick: 'x', cf: o.cf, graded: false, f: [] });
  const N = { fav: NEW('fav', { m: 'spread', side: 'home', line: -3.5, price: -110, cf: 0.85 }), dog: NEW('dog', { m: 'spread', side: 'away', line: 3.5, price: -110, cf: 0.72 }),
    over: NEW('over', { m: 'total', side: 'over', line: 5.5, price: -110, cf: 0.85 }), under: NEW('under', { m: 'total', side: 'under', line: 5.5, price: -110, cf: 0.75 }),
    heavy: NEW('heavy', { m: 'ml', side: 'home', price: -700, cf: 0.88 }), chalk: NEW('chalk', { m: 'ml', side: 'home', price: -300, cf: 0.88 }), thin: NEW('thin', { m: 'total', side: 'over', line: 5.5, price: -110, cf: 0.65 }) };
  const KC = { key: 'H_T1', id: 'T1', litter: 'LT', a: 'Sim', b: 'Judge', arch: 'Steady All-rounder', temper: 'Steady', craft: 'All-rounder', name: 'The Heir', chip: '⭐ HEIR', title: 'The Steady Hand', color: '#f7c04a', crest: { g: '⭐', t: '⚓' },
    creed: 'x', pub: { bio: 'x', origin: 'x' }, born: '2026-11-03', liveFrom: '2026-11-04', since: '2026-10-20', conceived: '2026-10-19', recipe: { P: { b: 0.45, T: 1, contrast: 1 }, lanes: {}, vacc: [], fade: [], hot: [], mut: 'none', temper: 'Steady', craft: 'All-rounder' }, domA: [], domB: [], n: 1, st: 'grad', womb: { days: 14 }, cal: [] };
  const KX = NEW('kid', { v: 'H_T1', m: 'spread', side: 'home', line: -3.5, price: -110, cf: 0.72 });
  const p = boot('nhl.html', { 'd4.voices': [...L, ...Object.values(N), KX], 'd4.womb': { v: 1, litters: [], tried: 1, firstDone: 1, lastConceived: '2026-11-06', kids: [KC] } }, at('2026-11-06')); await wait(1500);
  const PJ = s => JSON.parse(p.eval(`JSON.stringify(${s})`));
  p.__N = N; p.__KX = KX;
  const cap = (k, lv, from = '2026-11-01') => PJ(`(()=>{WB_LEGM=${lv > 1 ? `{Judge:{n:${lv},from:'${from}'}}` : '{}'};const x=window.__N['${k}'];return wbLegCap(x,x.cf);})()`);
  const c2 = Object.fromEntries(Object.keys(N).map(k => [k, cap(k, 2)])), c3 = cap('fav', 3);
  T('Legacy 2 on a lane it calls honestly (says 85%, hits 85% on 100): it now has to prove it, so the low end of its record less 2.5 points (85% → 79.5%)', near(c2.fav, 0.7948), JSON.stringify(c2));
  T('…Legacy 3 asks twice as much (two standard errors, 5 points: 85% → 74%)', near(c3, 0.7396), String(c3));
  T('…a lane where it overclaims (says 85%, hits 60%) is cut to what its record proves (59%)', near(c2.over, 0.5884), String(c2.over));
  T('…a lane it undersells (says 75%, hits 95%) keeps its number: the standard never raises one', c2.under === 0.75, String(c2.under));
  T('…its −700 favorites (hit 95%) don\'t vouch for its −300 ones (hit 60%): 88% becomes 86% on one, 70% on the other', near(c2.heavy, 0.8648) && near(c2.chalk, 0.7003), JSON.stringify([c2.heavy, c2.chalk]));
  T('…no record at the number it said is no proof of it: a 65% over (it has only ever said 85% on overs) borrows nothing and is cut by the margin and the doubt (55%)', near(c2.thin, 0.5496), String(c2.thin));
  T('…nothing before its day, nothing for a character that never evolved', cap('fav', 2, '2026-11-07') === 0.85 && cap('fav', 1) === 0.85);
  const flip = PJ(`(()=>{WB_LEGM={Judge:{n:2,from:'2026-11-01'}};const V=get(VOICES_KEY,[]);const extra=Array.from({length:40},(_,i)=>({id:'late'+i,sp:'nhl',date:'2026-11-06',game:'LA'+i+'@LB'+i,voice:'Judge',market:'spread',side:'home',line:-3.5,price:-110,pick:'x',cf:0.85,graded:true,hit:false,push:false,units:-1,f:[]}));
    set(VOICES_KEY,V.concat(extra));WB_LT=new Map();const x=window.__N.fav;const a=wbLegCap(x,x.cf);set(VOICES_KEY,V);WB_LT=new Map();return a;})()`);
  T('walk-forward: 40 losses graded the same day don\'t move that day\'s call (only the days before it count)', near(flip, 0.7948), String(flip));
  const off = PJ(`(()=>{const r={};for(const lv of [1,2]){WB_LEGM=lv>1?{Judge:{n:lv,from:'2026-11-01'}}:{};WB_LT=new Map();r[lv]={dog:isOfficial(window.__N.dog),under:isOfficial(window.__N.under),pub:+pubConf(window.__N.dog).toFixed(4),cf:window.__N.dog.cf,said:confOf(window.__N.dog)};}return r;})()`);
  T('its official gates: a 72% spread dog (a lane it calls honestly) is official at Legacy 1, not at Legacy 2 (its record proves 66%, under the 70% bar)', off[1].dog === true && off[2].dog === false, JSON.stringify(off));
  T('…a lane its record more than proves (unders) stays official at Legacy 2', off[2].under === true, JSON.stringify(off));
  T('…its public number carries the standard (72% → 66%) while what it said stays on the call (its children and the races read that)', near(off[2].pub, 0.6571) && off[1].pub === 0.72 && off[2].cf === 0.72 && off[2].said === 0.72, JSON.stringify(off));
  const ko = PJ(`(()=>{const x=window.__KX;WB_LEGM={};const a=isOfficial(x);WB_LEGM={H_T1:{n:2,from:'2026-11-01'}};WB_LT=new Map();const b=isOfficial(x);WB_LEGM={};return[a,b,!!CHARS.H_T1&&!!CHARS.H_T1.kid];})()`);
  T('an heir that evolves plays to the standard on its own gates too (72% with no record at that number: official at Legacy 1, not at Legacy 2)', ko[0] === true && ko[1] === false && ko[2] === true, JSON.stringify(ko));

  /* ══ B · the world: the Architect outdoes both parents by so much that they evolve ══ */
  const w = boot('nhl.html', { 'd4.voices': snap('2026-11-22') }, at('2026-11-22')); await wait(1500);
  const E = s => w.eval(s), J = s => JSON.parse(w.eval(`JSON.stringify(${s})`));
  const go = D => { w.__NOW = at(D); w.__VJ = JSON.stringify(snap(D)); E('set(VOICES_KEY,JSON.parse(window.__VJ));WB_IX=null;WOMB_MEMO=null;WB_NS=null;WB_LT=new Map();'); };
  const kid = () => J(`(wombAll().kids||[]).find(K=>K.key==='${KEY}')||null`);
  E('wombRun(true)'); for (const D of ['2026-12-04', '2026-12-28']) { go(D); E('wombRun(true)'); }
  const K0 = kid();
  T('the Architect is born Dec 4 and graduates Dec 28, a Gen 2 by blood (its title not earned yet)', !!K0 && K0.born === '2026-12-04' && K0.st === 'grad' && K0.gradAt === '2026-12-28' && K0.gen === 2 && !K0.genAt, JSON.stringify(K0 && [K0.born, K0.st, K0.gradAt, K0.gen, K0.genAt]));
  go('2026-12-30'); const R1 = J('(()=>{const R=wombRun(true);return R.evo;})()'); const W1 = J('wombAll()'), K1 = kid();
  const eS = (R1[KEY] || {}).Sim || {}, eJ = (R1[KEY] || {}).Judge || {};
  T('Dec 30, the race: against each parent 21+ days, 300+ of its calls, 3σ+ ahead, more money on its official calls', eS.ok && eJ.ok && eS.days >= 21 && eS.n >= 300 && eS.z >= 3 && eS.du > 0 && eJ.z >= 3, JSON.stringify([eS, eJ]));
  T('…so both parents evolve: Legacy 2, their new standards from Dec 31 (nothing backdated)', W1.legacy && W1.legacy.Sim && W1.legacy.Sim.n === 2 && W1.legacy.Judge.n === 2 && W1.legacy.Sim.from === '2026-12-31' && W1.legacy.Sim.by === KEY && W1.legacy.Sim.hist.length === 1, JSON.stringify(W1.legacy));
  T('…and the child earns its generation: Gen 2, the day it made the Simulator evolve', K1.gen === 2 && K1.genAt === '2026-12-30' && K1.genBy === 'Sim', JSON.stringify([K1.gen, K1.genAt, K1.genBy]));
  const ch1 = J(`journalAll().filter(x=>x.kind==='womb'&&/^⚡/.test(x.title)).map(x=>x.d+' '+x.title+' | '+x.what)`);
  T('the chronicle: "⚡ The Simulator evolves: Legacy 2 · The Architect is Gen 2", with why, by how much and when its standards start', ch1.some(t => /^2026-12-30 ⚡ The Simulator evolves: Legacy 2 · The Architect is Gen 2 \| The Architect outdid the Simulator by \d+\.\dσ on \d+ of its calls over \d+ days, its official calls \+\d+\.\du against [+−]\d+\.\du\. From Dec 31 the Simulator plays to Legacy 2 standards/.test(t)) && ch1.some(t => /⚡ The Judge evolves: Legacy 2 \|/.test(t)), JSON.stringify(ch1));
  go('2027-01-01'); const R2 = J('(()=>{const R=wombRun(true);return R.evo;})()');
  T('the race starts over against its new self: on Jan 1 the Simulator has been raced one day, since Dec 31', ((R2[KEY] || {}).Sim || {}).from === '2026-12-31' && R2[KEY].Sim.days === 1 && !R2[KEY].Sim.ok, JSON.stringify(R2[KEY] && R2[KEY].Sim));
  const capd = J(`(()=>{const V=get(VOICES_KEY,[]);const pick=d=>V.filter(x=>x.voice==='Sim'&&x.market==='ml'&&String(x.date).slice(0,10)===d);const f=xs=>xs.map(x=>({raw:+WB_CC0(x).toFixed(4),pub:+coachOk(x).toFixed(4),cf:x.cf}));return{d30:f(pick('2026-12-30')),d31:f(pick('2026-12-31'))};})()`);
  T('nothing backdated: the Simulator\'s Dec 30 calls carry what they always did; from Dec 31 its overclaims are cut (what it said untouched)', capd.d30.length && capd.d30.every(x => x.pub === x.raw) && capd.d31.length && capd.d31.some(x => x.pub < x.raw - 0.01) && capd.d31.every(x => x.pub <= x.raw), JSON.stringify(capd).slice(0, 400));
  const pc = J(`(()=>{PUB_CHAR_MEMO=null;const V=get(VOICES_KEY,[]).slice();V.push({id:'x1',sp:'nhl',date:today(),game:'A@B',voice:'${KEY}',market:'ml',side:'home',price:-120,pick:'B ML',cf:0.75,kp:0.75,graded:false});const C=pubCharacters(V,today());return{sim:(C.find(c=>c.v==='Sim')||{}).legacy||null,kid:((C.find(c=>c.v==='${KEY}')||{}).kid)||null};})()`);
  T('🌐 the public card: the Simulator wears Legacy 2 (since Dec 31, outdone by the Architect); the Architect wears Gen 2', pc.sim && pc.sim.n === 2 && pc.sim.since === '2026-12-31' && pc.sim.by === 'The Architect' && pc.kid && pc.kid.gen === 2 && pc.kid.genAt === '2026-12-30' && pc.kid.genBy === 'The Simulator', JSON.stringify(pc));
  const ev = J(`wbEvents(wombAll(),'2026-12-01')`);
  T('…and the family\'s news: born, graduated, evolved (with who did it and the generation it earned)', ev.some(e => e.t === 'born' && e.who === 'The Architect') && ev.some(e => e.t === 'grad') && ev.some(e => e.t === 'evolve' && e.who === 'The Simulator' && e.n === 2 && e.by === 'The Architect' && e.gen === 2) && ev.some(e => e.t === 'evolve' && e.who === 'The Judge' && e.gen == null), JSON.stringify(ev));
  const evo = E(`(GEN_TAB='evo',evoHtml())`).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), nur = E(`(GEN_TAB='nursery',nurseryHtml())`).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  T('⚡ the Evolution room: the Legacy board (who evolved, why, its standard since), the race, the lineage', /The Legacy board/.test(evo) && /The Simulator · Legacy 2/.test(evo) && /⚡ Legacy 2 on Dec 30: The Architect outdid it by \d+\.\dσ/.test(evo) && /The race/.test(evo) && /vs The Simulator \(Legacy 2, raced since Dec 31\)/.test(evo) && /The lineage/.test(evo) && /The Architect Gen 2 · child of The Simulator and The Judge/.test(evo), evo.slice(0, 900));
  T('🍼 the Nursery card: ⚡ Gen 2, the day it earned it, and its race against each parent', /⚡ Gen 2/.test(nur) && /Gen 2 since Dec 30, the day it made The Simulator evolve/.test(nur) && /The race to make a parent evolve/.test(nur) && /To make it evolve:/.test(nur), nur.slice(nur.indexOf('The Architect'), nur.indexOf('The Architect') + 600));
  go('2027-01-21'); E('wombRun(true)'); const W3 = J('wombAll()'), K3 = kid();
  const ch3 = J(`journalAll().filter(x=>x.kind==='womb'&&/^⚡ The Judge evolves: Legacy 3/.test(x.title)).map(x=>x.title+' | '+x.what)`);
  T('and so on: three weeks on it has outdone the Judge\'s new self by so much again: Legacy 3 (its title stays the one it earned)', W3.legacy.Judge.n === 3 && W3.legacy.Judge.from === '2027-01-22' && W3.legacy.Judge.hist.length === 2 && K3.genAt === '2026-12-30' && ch3.length === 1 && /^⚡ The Judge evolves: Legacy 3 \| The Architect outdid the Judge by \d+\.\dσ on \d+ of its calls over 21 days/.test(ch3[0]) && /2 standard errors down\) less 5 points\.$/.test(ch3[0]), JSON.stringify([W3.legacy.Judge, ch3]));

  /* ══ C · selection ══ */
  const heirCalls = WORLD.filter(x => x.date >= '2026-12-05' && x.date <= '2027-01-20' && ((x.voice === 'Sim' && x.market === 'ml') || (x.voice === 'Judge' && x.market === 'total')))
    .map(x => ({ ...x, id: x.id.replace(/\|(Sim|Judge)\|/, `|${KEY}|`), voice: KEY, cf: +Math.min(0.9, 0.5 + (x.cf - 0.5) / 1.3).toFixed(3) }));
  w.__VJ = JSON.stringify(snap('2027-01-21').concat(heirCalls)); E('set(VOICES_KEY,JSON.parse(window.__VJ));WB_IX=null;WB_BOARD=null;');
  const CT = J(`(()=>{const C=wbCourt(dayShift(today(),1),wbIndex());return{el:wbEligible(),P:C.P.map(P=>[P.a,P.b])};})()`);
  T('a graduate courts like any proven character (the Architect pairs with the Coach and the Historian)…', CT.el.includes(KEY) && CT.P.some(P => P.includes(KEY) && (P.includes('Coach') || P.includes('Trends'))), JSON.stringify(CT));
  T('…never with its own blood (never the Simulator, never the Judge)', !CT.P.some(P => P.includes(KEY) && (P.includes('Sim') || P.includes('Judge'))), JSON.stringify(CT.P));
  const bl = J(`(()=>{const W=wombAll();W.kids=W.kids.concat([{key:'H_G3',a:'${KEY}',b:'Coach',born:'2027-01-20',st:'rookie'}]);return{k1:wbKin('${KEY}','Sim',W),k2:wbKin('${KEY}','Coach',W),k3:wbKin('H_G3','Judge',W),k4:wbKin('H_G3','Trends',W),g:wbGenOf('H_G3',W),b:[...wbBlood('H_G3',W)].sort()};})()`);
  T('blood: a child of the Architect and the Coach carries the Simulator, the Judge, the Coach and the Architect (never pairs with any of them) and is Gen 3 by blood', bl.k1 && !bl.k2 && bl.k3 && !bl.k4 && bl.g === 3 && JSON.stringify(bl.b) === JSON.stringify(['Coach', 'H_G3', 'H_L1e1', 'Judge', 'Sim']), JSON.stringify(bl));
  /* a full desk: twelve living heirs on the day the Architect is due */
  const full = (s) => { const v = boot('nhl.html', { 'd4.voices': snap('2026-11-22') }, at('2026-11-22')); return v; };
  for (const [lab, s, born] of [['weaker', 0.5, true], ['stronger', 9, false]]) {
    const v = full(); await wait(1500); const Ev = x => v.eval(x), Jv = x => JSON.parse(v.eval(`JSON.stringify(${x})`));
    Ev('wombRun(true)'); v.__NOW = at('2026-12-04'); v.__VJ = JSON.stringify(snap('2026-12-04')); Ev('set(VOICES_KEY,JSON.parse(window.__VJ));WB_IX=null;WOMB_MEMO=null;');
    Ev(`(()=>{const W=wombAll();W.kids=Array.from({length:12},(_,i)=>({key:'H_P'+i,id:'P'+i,litter:'LP',a:'Coach',b:'Trends',name:'Placeholder '+i,chip:'x',title:'x',color:'#f5c542',crest:{g:'⭐',t:'⚓'},creed:'x',pub:{bio:'x',origin:'x'},gen:2,born:'2026-11-01',liveFrom:'2026-11-02',since:'2026-10-20',recipe:{P:{b:0.45,T:1,contrast:1},lanes:{},vacc:[],fade:[],hot:[],mut:'none'},domA:[],domB:[],n:0,st:'grad',gradAt:'2026-11-25',womb:{days:10},cal:[]}));set(WOMB_KEY,W);
      wbWeakest=function(W){const K=(W.kids||[]).find(k=>k.key==='H_P3');return{K,s:${s}};};})()`);
    Ev('wombRun(true)'); const Wv = Jv('wombAll()'); const J5 = Jv(`journalAll().filter(x=>x.kind==='womb'&&/^(🍂|🍼|👶)/.test(x.title)).map(x=>x.title+' | '+x.what)`);
    if (born) T('a full desk (12 heirs): the weakest graduate steps aside for a stronger newborn: 🍂 in the chronicle, its record kept, the Architect born', Wv.kids.some(k => k.key === KEY) && Wv.kids.find(k => k.key === 'H_P3').st === 'retired' && Wv.kids.find(k => k.key === 'H_P3').stepAside === 1 && J5.some(t => /^🍂 Placeholder 3 steps aside \| Stepped aside for the child of the Simulator and the Judge: the desk holds 12 heirs, and the newborn beat its parents by more/.test(t)) && J5.some(t => /^👶 /.test(t)), JSON.stringify(J5));
    else T('…and when every graduate is ahead by more, the newborn waits (due), and the chronicle says why', !Wv.kids.some(k => k.key === KEY) && Wv.litters[0].embryos.some(e => e.st === 'due') && J5.some(t => /^🍼 The Simulator × The Judge: due, waiting for room \| The desk is full \(12 heirs\)/.test(t)) && Wv.kids.every(k => k.st === 'grad'), JSON.stringify([J5, Wv.kids.map(k => k.st)]));
    v.close(); }

  /* ══ D · the North Star on a ledger with known answers (before the Coach's first day: the public number is what each said) ══ */
  const NL = []; let ni = 0;
  const nc = (v, n, hits, cf, o = {}) => { for (let i = 0; i < n; i++) { const d = dayAt('2026-10-09', i % 29), g = `NS${ni}@NT${ni}`; ni++; const hit = i < hits;
    NL.push({ id: `nhl|${g}|${d}|${v}|spread`, sp: 'nhl', date: d, game: g, voice: v, market: 'spread', side: 'home', line: -3.5, price: o.noPrice ? null : -110, pick: 'x', cf, graded: true, hit, push: false, units: hit ? 0.909 : -1, f: [] }); } };
  nc('Judge', 40, 36, 0.85); nc('Sim', 40, 28, 0.82); nc('Power', 1, 1, 0.9, { noPrice: true }); nc('Scout', 30, 15, 0.72);
  const SCN = {}; for (let i = 0; i < 10; i++) { SCN['h' + i] = { voice: 'Judge', sp: 'nhl', date: dayAt('2026-10-20', i), game: 'X@Y', a: 3, h: 2, graded: 1, exact: i < 2 ? 1 : 0, err: 2 }; SCN['b' + i] = { voice: 'Sim', sp: 'nba', date: dayAt('2026-10-20', i), game: 'X@Y', a: 100, h: 100, graded: 1, exact: 0, err: 20 }; }
  const q = boot('nhl.html', { 'd4.voices': NL, 'd4.scorecalls': SCN }, at('2026-11-07')); await wait(1500);
  const QJ = s => JSON.parse(q.eval(`JSON.stringify(${s})`));
  const NS = QJ('wbNorth()');
  T('⭐ the North Star: the Judge is there (36 of 40 official calls at 80%+ hit: 90%), the Simulator isn\'t (28 of 40)', NS.by.Judge && NS.by.Judge.n === 40 && NS.by.Judge.w === 36 && NS.by.Judge.star === true && NS.by.Sim.n === 40 && NS.by.Sim.w === 28 && NS.by.Sim.star === false, JSON.stringify(NS.by));
  T('…the desk: 64 of 80 (80%), not there; an unpriced 90% call counts among every call at 80%+ but not among the official ones; a 72% call counts nowhere', NS.all.n === 80 && NS.all.w === 64 && NS.desk === false && NS.any.n === 81 && !NS.by.Scout && !NS.by.Power, JSON.stringify([NS.all, NS.any]));
  T('…exact finals: 2 of 20, the NHL 2 of 10 (2 goals off), the NBA none of 10 (20 points off)', NS.exact.n === 20 && NS.exact.e === 2 && NS.exact.sp.nhl.e === 2 && near(NS.exact.sp.nhl.rate, 0.2, 1e-9) && near(NS.exact.sp.nhl.err, 2, 1e-9) && NS.exact.sp.nba.e === 0 && near(NS.exact.sp.nba.err, 20, 1e-9), JSON.stringify(NS.exact));
  q.eval('wombRun(true)'); q.__NOW = at('2026-11-08'); q.eval('WOMB_MEMO=null;WB_NS=null;wombRun(true)');
  const NJ = QJ(`journalAll().filter(x=>/North Star/.test(x.title)).map(x=>x.d+' '+x.title+' | '+x.what)`);
  T('…the chronicle, once: "⭐ The Judge reaches the North Star" (and only the Judge)', NJ.length === 1 && /^2026-11-07 ⭐ The Judge reaches the North Star \| 36 of its 40 official calls at 80%\+ confidence hit over the last 30 days \(90%\)\. The goal is 90%\.$/.test(NJ[0]) && QJ('wombAll().north').Judge === '2026-11-07', JSON.stringify(NJ));
  q.__NOW = at('2026-11-07'); q.eval('TODAY_T=0;WB_NS=null;');   /* (the clock goes back a day: today() forgets its cache) */
  const nr = q.eval('northHtml()').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  T('…the ⭐ North Star room: the desk\'s number against 90%, who\'s there and how far the rest are, exact finals and the honest note', /⭐ The North Star/.test(nr) && /80% 64-16 official calls at 80%\+ · goal 90%/.test(nr) && /The Judge 36-4 · 90% \(says 85%\) · ⭐ there/.test(nr) && /The Simulator 28-12 · 70% \(says 82%\) · 20 points to go/.test(nr) && /NHL best: The Judge 20%? ?.*2 of 10 exact · 20% · 2\.0 points off|NHL .*2 of 10 exact · 20% · 2\.0 points off/.test(nr) && /nobody calls exact finals more often than not/.test(nr), nr.slice(0, 900));
  const pb = QJ('wbNorthPub()');
  T('…and for the public page: numbers only (the desk\'s rate, who\'s closest, exact finals)', pb && pb.n === 80 && pb.rate === 0.8 && pb.top[0].who === 'The Judge' && pb.top[0].star === true && pb.top.length === 2 && pb.exact.n === 20, JSON.stringify(pb));

  /* ══ E · sync: an evolution, a generation and the North Star on either device stand ══ */
  const mg = QJ(`(()=>{const base={v:1,litters:[],tried:2,kids:[{key:'H_A',born:'2026-12-01',st:'grad'}]};
    const A={...base,legacy:{Sim:{n:2,at:'2026-12-30',from:'2026-12-31',by:'H_A',hist:[{n:2,at:'2026-12-30'}]}},north:{Judge:'2026-12-02'},kids:[{key:'H_A',born:'2026-12-01',st:'grad',gen:2,genAt:'2026-12-30',genBy:'Sim'}]};
    const B={...base,legacy:{Sim:{n:3,at:'2027-01-21',from:'2027-01-22',by:'H_A',hist:[{n:2,at:'2026-12-30'},{n:3,at:'2027-01-21'}]},Judge:{n:2,at:'2026-12-30',from:'2026-12-31',by:'H_A',hist:[{n:2,at:'2026-12-30'}]}},north:{Judge:'2026-12-05',Power:'2026-12-10'}};
    const M1=wombMerge(A,B),M2=wombMerge(B,A);return{m1:M1,m2:M2};})()`);
  T('sync: the higher Legacy wins with the whole history, an evolution only one device saw stands, the North Star keeps its first day, an earned generation survives either order', [mg.m1, mg.m2].every(M => M.legacy.Sim.n === 3 && M.legacy.Sim.hist.length === 2 && M.legacy.Judge.n === 2 && M.north.Judge === '2026-12-02' && M.north.Power === '2026-12-10' && M.kids[0].genAt === '2026-12-30' && M.kids[0].gen === 2), JSON.stringify(mg.m1).slice(0, 500));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); })();
