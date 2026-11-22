/* v3.2.0 · Nov 22, Chris: "characters with the best traits would get with another character and blend their minds… thus creating
   heirs… heirs are only born when they have proven to be better than both parents all around" and "the type of child you end up with
   depends on what type of records the parents were running." Bloodlines 2.0, Phase 1: DNA read off each character's own ledger,
   courtship by coverage and chemistry, the Goosebumps rule, and the womb — embryos fixed at conception that read every later game in
   the shadows and are due only when they beat BOTH parents on games they never saw. Nothing is backdated, the preview never counts,
   no side without a real line is ever called, and no pick changes.
   The test world: four characters calling 10 NHL games a day from Oct 20. The Simulator is sharp (and overconfident) on moneylines and
   backwards on totals; the Judge is the mirror; the Coach is decent on moneylines, the Historian decent on totals. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8').replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
function boot(store, now) { return new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(w) {
  w.__NOW = now; const RD = w.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [w.__NOW])); } static now() { return w.__NOW; } } w.Date = FD;
  w.__NO_GRADELOOP__ = true; w.__NO_REOPEN__ = true; w.__NO_BACKFILL__ = true; w.__NO_SYNC_LOOP__ = true;
  w.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); w.scrollTo = () => { }; w.alert = () => { }; w.confirm = () => true;
  w.localStorage.setItem('d4.setupDone', '1'); Object.entries(store).forEach(([k, v]) => w.localStorage.setItem(k, JSON.stringify(v))); } }).window; }
const wait = ms => new Promise(r => setTimeout(r, ms));
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const dayAt = (d0, i) => new Date(Date.parse(d0 + 'T12:00:00Z') + i * 864e5).toISOString().slice(0, 10);
const OTH = { home: 'away', away: 'home', over: 'under', under: 'over' };
function world(seed, { from = '2026-10-20', to = '2026-12-07', per = 12, simCold = null } = {}) {
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
      const cold = simCold && d >= simCold[0] && d <= simCold[1];
      add('Sim', 'ml', cold ? ((i * 7 + k) % 10 < 7 ? OTH[mlFav] : mlFav) : mlFav, sharp(mm));   /* (the slump draws no random numbers: everything else stays the same world) */ add('Sim', 'total', R() < 0.72 ? OTH[toFav] : toFav, 0.5);
      add('Judge', 'total', toFav, sharp(ms)); add('Judge', 'ml', R() < 0.72 ? OTH[mlFav] : mlFav, 0.5);
      add('Coach', 'ml', R() < 0.8 ? mlFav : OTH[mlFav], 0.6); add('Coach', 'total', R() < 0.5 ? 'over' : 'under', 0.5);
      add('Trends', 'total', R() < 0.8 ? toFav : OTH[toFav], 0.6); add('Trends', 'ml', R() < 0.5 ? 'home' : 'away', 0.5);
    } }
  return V; }
const SEED = +process.env.WSEED || 13, WORLD = world(SEED);
const nCalls = (v, from, to) => WORLD.filter(x => x.voice === v && x.date >= from && x.date < to).length;   /* a character's calls on [from, to) */
/* what the ledger holds on a given slate day: everything before it graded, that day's calls still open, nothing after it */
const snap = (D, V = WORLD) => V.filter(x => x.date <= D).map(x => x.date === D ? { ...x, graded: false, hit: null, units: null } : x);
const at = D => Date.parse(D + 'T18:00:00Z');
const pk = (a, b) => [a, b].sort().join('×');
(async () => { try {
  const w = boot({ 'd4.voices': snap('2026-11-22') }, at('2026-11-22')); await wait(1500);
  const E = s => w.eval(s), J = s => JSON.parse(w.eval(`JSON.stringify(${s})`));
  const load = V => { w.__VJ = JSON.stringify(V); E('set(VOICES_KEY,JSON.parse(window.__VJ));WB_IX=null;WOMB_MEMO=null;'); };
  const go = D => { w.__NOW = at(D); load(snap(D)); };
  const lit = (a, b) => J(`wombAll().litters.find(L=>[L.a,L.b].sort().join('×')==='${pk(a, b)}')`);
  const store = () => J(`Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))`);
  const diff = (A, B) => [...new Set([...Object.keys(A), ...Object.keys(B)])].filter(k => A[k] !== B[k]);

  /* ── wiring ── */
  T('the womb runs in the daily background pass, right after the heirs', E(`(()=>{const i=AP_STEPS.findIndex(s=>s[0]==='heirs'),j=AP_STEPS.findIndex(s=>s[0]==='womb');return i>=0&&j===i+1;})()`));
  T('the womb\'s registry (d4.womb) syncs across devices like every other record', E(`WOMB_KEY==='d4.womb'&&!syncSkip(WOMB_KEY)`));
  T('today is Nov 22 on the desk\'s clock', E('today()') === '2026-11-22', E('today()'));

  /* ── §1 · DNA ── */
  const D = J(`(()=>{const IX=wbIndex(true),o={};for(const v of ['Sim','Judge','Coach','Trends']){const d=dnaOf(v,'2026-11-23',IX);o[v]={n:d.n,u:d.u,dom:d.dom,scars:d.scars,gap:d.honest&&+d.honest.gap.toFixed(3),form:d.form.state,fu:d.form.u,proven:wbProven(d),active:d.active};}return o;})()`);
  T('DNA comes off the character\'s own ledger: the Simulator\'s dominant genes are its moneylines (favorites and dogs), its scars both totals', ['nhl|ml|fav', 'nhl|ml|dog'].every(k => D.Sim.dom.includes(k)) && ['nhl|total|over', 'nhl|total|under'].every(k => D.Sim.scars.includes(k)), JSON.stringify(D.Sim));
  T('…the Judge is its mirror: totals dominant, moneylines scarred', ['nhl|total|over', 'nhl|total|under'].every(k => D.Judge.dom.includes(k)) && ['nhl|ml|fav', 'nhl|ml|dog'].every(k => D.Judge.scars.includes(k)), JSON.stringify(D.Judge));
  T('…all four are proven: 150+ graded calls, 2+ dominant genes, confidence within 10 points of the hit rate, still calling games', ['Sim', 'Judge', 'Coach', 'Trends'].every(v => D[v].proven && D[v].n >= 150 && Math.abs(D[v].gap) <= 0.10), JSON.stringify(Object.fromEntries(Object.entries(D).map(([v, d]) => [v, [d.n, d.gap, d.dom.length, d.proven]]))));
  T('…form is money over the last 14 days: the Simulator and the Judge have been making real money, so both read as running hot', D.Sim.form === 'hot' && D.Judge.form === 'hot', JSON.stringify([D.Sim.fu, D.Judge.fu]));
  T('…the DNA as of a day reads only the games before it (the Nov 22 slate, still open, isn\'t in it)', D.Sim.n === J(`get(VOICES_KEY,[]).filter(x=>x.voice==='Sim'&&x.graded&&x.date<'2026-11-22').length`), String(D.Sim.n));

  /* ── §2 · courtship ── */
  const C = J(`wbCourt('2026-11-23',wbIndex(),new Set()).P.map(P=>({k:[P.a,P.b].sort().join('×'),gain:P.gain,score:+P.score.toFixed(3)}))`);
  const rank = k => { const i = C.findIndex(p => p.k === k); return i < 0 ? 99 : i; };
  T('courtship pairs traits that cover each other: the strongest moneyline mind × the strongest totals mind (Simulator × Judge) tops the board', rank('Judge×Sim') === 0, JSON.stringify(C.slice(0, 6)));
  T('…every moneyline × totals pair ranks above both pairs with the same strengths (Simulator × Coach, Judge × Historian), if those pair at all', [rank('Coach×Sim'), rank('Judge×Trends')].every(r => r > Math.max(rank('Judge×Sim'), rank('Coach×Trends'), rank('Sim×Trends'), rank('Coach×Judge'))), JSON.stringify(C.map(p => p.k)));

  /* ── §4 · the first fill ── */
  const S0 = store(), VJ0 = E('localStorage.getItem(VOICES_KEY)');
  const R0 = J(`(()=>{const R=wombRun(true);return{n:R.n,emb:R.emb};})()`), W0 = J('wombAll()');
  const SJ0 = lit('Sim', 'Judge'), CT0 = lit('Coach', 'Trends');
  T('the first pass fills every slot it can: two litters (Simulator × Judge and Coach × Historian — four characters, two pairs)', W0.litters.length === 2 && !!SJ0 && !!CT0, JSON.stringify(W0.litters.map(L => L.a + '×' + L.b)));
  T('…two embryos each, every one numbered in the order tried (the bar rises with each)', W0.litters.every(L => L.embryos.length === 2 && L.embryos.every(e => e.st === 'womb')) && W0.tried === 4 && JSON.stringify(W0.litters.flatMap(L => L.embryos.map(e => e.n)).sort()) === '[1,2,3,4]', JSON.stringify([W0.tried]));
  T('nothing is backdated: conceived today (Nov 22) and judged only on games from tomorrow, though the ledger goes back to Oct 20', W0.litters.every(L => L.conceived === '2026-11-22' && L.embryos.every(e => e.conceived === '2026-11-22' && e.since === '2026-11-23')), JSON.stringify(W0.litters.map(L => [L.conceived, L.embryos.map(e => e.since)])));
  T('…so on conception day no embryo has a single game counted', Object.values(R0.emb).length === 4 && Object.values(R0.emb).every(r => r.A.n === 0 && r.B.n === 0 && r.me.n === 0 && !r.due && !r.lost), JSON.stringify(Object.values(R0.emb).map(r => [r.A.n, r.B.n])));
  T('🔮 every embryo carries a two-week preview (its recipe as of Nov 9, replayed on Nov 9–22) — shown, never counted', W0.litters.every(L => L.embryos.every(e => e.preview && e.preview.from === '2026-11-09' && e.preview.A.n > 0 && e.st === 'womb')), JSON.stringify(SJ0.embryos.map(e => e.preview && [e.preview.A, e.preview.B, e.preview.would])));
  /* §3 · the Goosebumps rule, on the real litter */
  const arch0 = J(`wbArch(dnaOf('Sim','2026-11-23'),dnaOf('Judge','2026-11-23'))`);
  T('the Goosebumps rule: two parents running hot, one making its money on sides and one on totals → a Prodigy Architect', SJ0.arch.label === 'Prodigy Architect' && arch0.label === SJ0.arch.label && /Simulator was running hot/.test(SJ0.arch.why) && /one makes its money on totals, the other on sides/i.test(SJ0.arch.why), SJ0.arch.why);
  const r1 = SJ0.embryos[0].recipe, r2 = SJ0.embryos[1].recipe;
  T('inheritance: in the Simulator\'s lanes its gene is dominant and the Judge (scarred there) has no say; in the Judge\'s lanes the reverse', ['nhl|ml|fav', 'nhl|ml|dog'].every(k => r1.lanes[k].a > 0 && r1.lanes[k].b === 0) && ['nhl|total|over', 'nhl|total|under'].every(k => r1.lanes[k].b > 0 && r1.lanes[k].a === 0), JSON.stringify(r1.lanes));
  T('…each parent\'s scar is covered by the other\'s paying gene, so nothing needs a vaccine', r1.vacc.length === 0, JSON.stringify(r1.vacc));
  const heat = J(`(()=>{const a=dnaOf('Sim','2026-11-23'),b=dnaOf('Judge','2026-11-23'),h=r=>!!r&&r.n>=10&&r.u>=3&&r.u/r.n>=0.15;return Object.fromEntries(['nhl|ml|fav','nhl|ml|dog','nhl|total|over','nhl|total|under'].map(k=>[k,h(a.recent[k])||h(b.recent[k])]));})()`);
  T('…a Prodigy rides its parents\' hot lanes harder: sharper exactly where a parent is really hot (10+ calls in 14 days, +15% a call), the Simulator\'s moneylines among them', Object.entries(heat).every(([k, h]) => r1.hot.includes(k) === h && (r1.lanes[k].t === 0.85) === h) && heat['nhl|ml|fav'] && heat['nhl|ml|dog'], JSON.stringify([heat, r1.hot]));
  T('…the first embryo is the pure blend, its sibling a mutation (leans on the market more)', r1.mut === 'none: the pure blend' && /market → 0\.5/.test(r2.mut) && r2.P.b === 0.5 && r1.P.b === 0.35, JSON.stringify([r1.mut, r2.mut]));
  const J0 = J(`journalAll().filter(x=>x.kind==='womb')`);
  T('the chronicle records each courtship (💞, dated the day it happened)', J0.length === 2 && J0.every(x => /^💞 /.test(x.title) && x.d === '2026-11-22' && /expecting — a /.test(x.title)), JSON.stringify(J0.map(x => [x.d, x.title])));
  const S1 = store(), ch0 = diff(S0, S1);
  T('nothing here changes a pick: the ledger is byte for byte the same, and the only records written are the womb and the chronicle (plus sync\'s own bookkeeping)', E('localStorage.getItem(VOICES_KEY)') === VJ0 && ch0.every(k => ['d4.womb', 'd4.journal', 'd4.__kts', 'd4.sync3dirty'].includes(k)), JSON.stringify(ch0));
  E('wombRun(true)'); const W0b = J('wombAll()');
  T('one courtship pass a day: running it again the same day conceives nothing more', W0b.litters.length === 2 && W0b.tried === 4);

  /* ── the rooms ── */
  const room0 = E('wombHtml()'), dna0 = E(`(WB_DNA_V='Sim',dnaHtml())`);
  T('🥚 the womb room: both litters, the Prodigy Architect, the progress to birth (0 of 100 unseen games), the preview and the courtship board', /The Simulator/.test(room0) && /The Judge/.test(room0) && /a Prodigy Architect/.test(room0) && /0\/100/.test(room0) && /Two-week preview/.test(room0) && /courtship board/.test(room0) && /judged on games from 2026-11-23/.test(room0), room0.slice(0, 300));
  T('🧬 the DNA room: a character\'s dominant genes and scars by lane', /Dominant genes/.test(dna0) && /NHL ML favorites/.test(dna0) && /Scars/.test(dna0) && /NHL overs/.test(dna0) && /NHL unders/.test(dna0), dna0.slice(0, 200));
  E('genOpen()'); await wait(2500); E(`GEN_TAB='womb';genRender()`); const book = E(`document.getElementById('genView').innerHTML`);
  T('the Bloodlines book opens on the new rooms (🥚 The womb · 🧬 DNA) and counts the embryos', /🥚 The womb/.test(book) && /🧬 DNA/.test(book) && /4 embryos in the womb/.test(book) && /The Simulator/.test(book), book.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300));

  /* ── Dec 1: eight days in ── */
  go('2026-12-01'); const R1 = J(`wombRun(true).emb`), SJ1 = lit('Sim', 'Judge'); const e1 = SJ1.embryos[0].id, e2 = SJ1.embryos[1].id;
  const n1 = nCalls('Sim', '2026-11-23', '2026-12-01');
  T(`Dec 1: the embryos have read every game from Nov 23 on — all ${n1} of each parent's calls (the Nov 22 slate, open when they were conceived, never counts)`, n1 === 192 && R1[e1].A.n === n1 && R1[e1].B.n === nCalls('Judge', '2026-11-23', '2026-12-01'), JSON.stringify([R1[e1].A, R1[e1].B]));
  T('…eight days isn\'t ten: still in the womb, however well it reads', SJ1.embryos[0].st === 'womb' && R1[e1].days === 8 && !R1[e1].due, JSON.stringify({ z: [R1[e1].A.z, R1[e1].B.z], days: R1[e1].days }));
  T('…the genes fixed at conception never change while it grows', JSON.stringify(SJ1.embryos.map(e => e.recipe)) === JSON.stringify(SJ0.embryos.map(e => e.recipe)));
  /* integrity: the results before conception could all be different and nothing it's judged on moves */
  load(snap('2026-12-01').map(x => x.date < '2026-11-23' && x.graded ? { ...x, hit: !x.hit } : x)); const R1f = J(`wombRun(true).emb`);
  T('flip every result before conception and the embryo\'s record since doesn\'t move by a hair: judged only on games it never saw', JSON.stringify([R1f[e1].A, R1f[e1].B, R1f[e1].me, R1f[e1].off]) === JSON.stringify([R1[e1].A, R1[e1].B, R1[e1].me, R1[e1].off]), JSON.stringify([R1f[e1].A, R1[e1].A]));
  /* walk-forward: each day is read only from the days before it */
  const evalTo = until => J(`(()=>{const L=wombAll().litters.find(L=>L.a==='Sim'&&L.b==='Judge'),e=L.embryos[0];const r=wbEval(L,e,wbIndex(),'2026-12-01',e.n,${until ? `'${until}'` : 'null'});return[r.A,r.B,r.me,r.off];})()`);
  load(snap('2026-12-01')); const wf0 = evalTo('2026-11-27');
  load(snap('2026-12-01').map(x => x.date >= '2026-11-27' && x.graded ? { ...x, hit: !x.hit } : x)); const wf1 = evalTo('2026-11-27'), wfAll = evalTo(null);
  T('walk-forward: up to Nov 27 its record is identical whatever happens after (no lookahead, its calibration learns only from days already played)', JSON.stringify(wf0) === JSON.stringify(wf1) && JSON.stringify(wfAll) !== JSON.stringify(wf0), JSON.stringify([wf0[2], wf1[2]]));

  /* ── Dec 4: eleven days in ── */
  E(`(()=>{const W=wombAll();const L=W.litters.find(L=>L.a==='Sim'&&L.b==='Judge');const R=L.embryos[1].recipe;['nhl|ml|fav','nhl|ml|dog'].forEach(k=>{R.lanes[k]={a:-2,b:0};});set(WOMB_KEY,W);})()`);   /* the sibling reads the Simulator backwards */
  /* v3.3.0 · a due embryo is born at once (birth1122_test.js). Here the nursery is full (six living heirs, from parents with no calls in
     this world), so the due one waits — and the rest of the womb's story plays out as it did in Phase 1. */
  E(`(()=>{const W=wombAll();W.kids=[1,2,3,4,5,6].map(i=>({key:'H_X'+i,id:'X'+i,litter:'LX',a:'Pred',b:'Consensus',arch:'Steady All-rounder',temper:'Steady',craft:'All-rounder',name:'Placeholder '+i,chip:'P'+i,title:'The Steady Hand',color:'#888888',crest:{g:'⭐',t:'⚓'},creed:'x',pub:{bio:'x',origin:'x'},born:'2026-11-01',liveFrom:'2026-11-02',since:'2026-10-20',conceived:'2026-10-19',recipe:{P:{b:0.45,T:1,contrast:1},lanes:{},vacc:[],fade:[],hot:[],mut:'none'},domA:[],domB:[],n:0,st:'rookie',womb:{days:10},cal:[]}));set(WOMB_KEY,W);})()`);
  go('2026-12-04'); const VJ4 = E('localStorage.getItem(VOICES_KEY)'); const R4 = J(`wombRun(true).emb`), SJ4 = lit('Sim', 'Judge'); const E1 = SJ4.embryos[0], E2 = SJ4.embryos[1], E3 = SJ4.embryos[2]; const a = R4[e1];
  const n4 = nCalls('Sim', '2026-11-23', '2026-12-04');
  T(`🍼 Dec 4: the pure blend is DUE — it beat both parents on games it never saw by 2σ or more (${n4} calls against each, 11 days); the nursery is full, so it waits for room`, E1.st === 'due' && E1.dueAt === '2026-12-04' && a.A.n === n4 && a.B.n === n4 && a.days === 11 && a.bar === 2 && a.A.z >= 2 && a.B.z >= 2, JSON.stringify({ zA: a.A.z, zB: a.B.z, bar: a.bar, n: [a.A.n, a.B.n] }));
  T('…its official calls made at least as much money as each parent\'s', a.duA >= -1 && a.duB >= -1 && a.off.n > 0, JSON.stringify({ off: a.off, A: a.offA, B: a.offB }));
  T('…and it held its own inside each parent\'s best lanes (respect: within a standard error of the Simulator on its moneylines, the Judge on its totals)', a.rA.n >= 15 && a.rA.z >= -1 && a.rB.n >= 15 && a.rB.z >= -1, JSON.stringify([a.rA, a.rB]));
  T('🕊 the sibling that read the Simulator\'s moneylines backwards is lost — clearly worse than a parent on games it never saw', E2.st === 'lost' && E2.lostAt === '2026-12-04' && new RegExp(`σ worse than The (Simulator|Judge) on ${n4} games it never saw`).test(E2.why) && Math.min(R4[e2].A.z, R4[e2].B.z) <= -2, E2.why);
  T('🥚 …and the parents try again: a new sibling conceived today, judged from tomorrow, another mutation (how bold it is)', !!E3 && E3.st === 'womb' && E3.conceived === '2026-12-04' && E3.since === '2026-12-05' && E3.n === 5 && /how bold it is → 0\.85/.test(E3.recipe.mut) && !!E3.preview, JSON.stringify(E3 && { c: E3.conceived, s: E3.since, n: E3.n, mut: E3.recipe.mut }));
  const bar3 = E(`(()=>{const L=wombAll().litters.find(L=>L.a==='Sim'&&L.b==='Judge');return wbEval(L,L.embryos[2],wbIndex(),today(),L.embryos[2].n).bar;})()`);
  T('…the bar rises with every embryo tried (2σ for the first, about 2.6σ for the fifth)', a.bar === 2 && bar3 > 2.55 && bar3 < 2.6, String(bar3));
  T('…still nothing changes a pick', E('localStorage.getItem(VOICES_KEY)') === VJ4);
  const J4 = J(`journalAll().filter(x=>x.kind==='womb'&&x.d==='2026-12-04').map(x=>x.title)`);
  T('the chronicle: 🍼 due (waiting for room), 🕊 lost, 🥚 a new embryo', J4.some(t => /^🍼 The Simulator × The Judge: due, waiting for room/.test(t)) && J4.some(t => /^🕊 /.test(t)) && J4.some(t => /^🥚 /.test(t)), JSON.stringify(J4));
  const room4 = E('wombHtml()'), chr4 = E('genChronicleHtml()');
  T('…and the rooms show it (🍼 due · 🕊 lost in the womb, the same in the chronicle)', /🍼 due/.test(room4) && /🕊 lost/.test(room4) && /🍼/.test(chr4) && /🕊/.test(chr4));

  /* ── a litter that loses every embryo ends; the pair rests; after the first fill, one new litter a day ── */
  /* both litters: four embryos that read both parents backwards, in the womb since Nov 1 */
  E(`(()=>{const W=wombAll();W.litters.filter(L=>L.st==='live').forEach(L=>{const b=L.embryos[0];L.embryos=[0,1,2,3].map(k=>{const R=JSON.parse(JSON.stringify(b.recipe));Object.keys(R.lanes).forEach(x=>{const o=R.lanes[x];R.lanes[x]={a:-(Math.abs(o.a)||1),b:-(Math.abs(o.b)||1)};});return{...JSON.parse(JSON.stringify(b)),id:L.id+'e'+(k+1),st:'womb',since:'2026-11-01',recipe:R};});});set(WOMB_KEY,W);})()`);
  go('2026-12-05'); E('wombRun(true)'); const W5 = J('wombAll()'), CT5 = lit('Coach', 'Trends');
  T('a litter whose four embryos are all lost ends (no fifth try)', W5.litters.length === 2 && W5.litters.every(L => L.st === 'ended' && L.ended === '2026-12-05' && L.embryos.length === 4 && L.embryos.every(e => e.st === 'lost')), JSON.stringify(W5.litters.map(L => [L.st, L.embryos.map(e => e.st)])));
  const whys = W5.litters.flatMap(L => L.embryos.map(e => e.why)), tl = /^28 days in the womb without clearing every bar \([+−]\d+\.\dσ against The \w+, [+−]\d+\.\dσ against The \w+\)$/;
  T('…an embryo that can\'t clear every bar in four weeks is lost too (it proves it or it makes room); the rest were clearly worse', whys.some(x => tl.test(x)) && whys.every(x => tl.test(x) || /σ worse than The \w+ on \d+ games it never saw$/.test(x)), JSON.stringify(whys));
  T('…the courtship board shows both pairs resting', (E('wombHtml()').match(/· resting/g) || []).length >= 2);
  T('…🕯 the chronicle says so', J(`journalAll().filter(x=>x.kind==='womb'&&/^🕯 /.test(x.title)).length`) === 2);
  go('2026-12-06'); E('wombRun(true)'); const W6 = J('wombAll()'); const n6 = W6.litters.filter(L => L.st === 'live');
  T('after the first fill, one new litter a day — and never a pair that just lost a whole litter (it rests 14 days)', n6.length === 1 && n6[0].conceived === '2026-12-06' && !['Judge×Sim', 'Coach×Trends'].includes(pk(n6[0].a, n6[0].b)), JSON.stringify(n6.map(L => L.a + '×' + L.b)));
  E('wombRun(true)'); T('…the same day again: still one', J('wombAll()').litters.filter(L => L.st === 'live').length === 1);
  go('2026-12-07'); E('wombRun(true)'); const n7 = J('wombAll()').litters.filter(L => L.st === 'live');
  T('…the next day, one more (two characters already expecting can\'t pair again)', n7.length === 2 && new Set(n7.flatMap(L => [L.a, L.b])).size === 4 && n7.every(L => !['Judge×Sim', 'Coach×Trends'].includes(pk(L.a, L.b))), JSON.stringify(n7.map(L => L.a + '×' + L.b + '@' + L.conceived)));

  /* ── the Goosebumps rule, the recipe and the no-line rule on paper ── */
  const v = boot({ 'd4.voices': snap('2026-11-22', world(SEED, { simCold: ['2026-11-09', '2026-11-22'] })) }, at('2026-11-22')); await wait(1500);
  const V = s => v.eval(s), VJ = s => JSON.parse(v.eval(`JSON.stringify(${s})`));
  const g = VJ(`(()=>{const a=dnaOf('Sim','2026-11-23'),b=dnaOf('Judge','2026-11-23');return{fa:a.form.state,fb:b.form.state,arch:wbArch(a,b)};})()`);
  T('same parents, a different stretch of the season, a different child: the same world with the Simulator slumping its last two weeks (the Judge still hot) → a Prodigal Architect', g.fa === 'cold' && g.fb === 'hot' && D.Judge.form === 'hot' && g.arch.label === 'Prodigal Architect' && /Simulator was slumping/.test(g.arch.why), JSON.stringify(g));
  const A = VJ(`(()=>{const mk=(v,st,sty,sc)=>({v,form:{state:st,u:st==='hot'?12:st==='cold'?-12:0,upc:st==='hot'?0.1:st==='cold'?-0.1:0,n:100},upc:0,style:Object.assign({totU:0,sideU:10,chalkU:5,dogU:5},sty||{}),score:sc||null});
    const L=(a,b)=>wbArch(a,b).label;const S={n:40,mult:1.6};
    return{pp:L(mk('Sim','hot'),mk('Judge','hot')),rr:L(mk('Sim','cold'),mk('Judge','cold')),pg:L(mk('Sim','hot'),mk('Judge','cold')),ss:L(mk('Sim','steady'),mk('Judge','steady')),hs:L(mk('Sim','hot'),mk('Judge','steady')),cs:L(mk('Sim','cold'),mk('Judge','steady')),
      seer:L(mk('Sim','steady',{},S),mk('Judge','steady',{},S)),seer1:L(mk('Sim','steady',{},S),mk('Judge','steady',{},{n:20,mult:2})),
      arch:L(mk('Sim','steady',{totU:10,sideU:0}),mk('Judge','steady',{totU:0,sideU:10})),long:L(mk('Sim','steady',{chalkU:1,dogU:9}),mk('Judge','steady',{chalkU:2,dogU:8})),
      grind:L(mk('Sim','steady',{chalkU:9,dogU:1}),mk('Judge','steady',{chalkU:8,dogU:2})),all:L(mk('Sim','steady',{chalkU:9,dogU:1}),mk('Judge','steady',{chalkU:1,dogU:9}))};})()`);
  T('the temperament comes from the parents\' form: hot + hot → Prodigy, cold + cold → Rebel, hot + cold → Prodigal, neither → Steady', /^Prodigy/.test(A.pp) && /^Rebel/.test(A.rr) && /^Prodigal/.test(A.pg) && /^Steady/.test(A.ss) && /^Prodigy/.test(A.hs) && /^Rebel/.test(A.cs), JSON.stringify(A));
  T('the craft from their style: two score callers → Seer (30+ score calls each, well above the cast\'s rate), sides + totals → Architect, two dog hunters → Longshot, two chalk grinders → Grinder, otherwise All-rounder', /Seer$/.test(A.seer) && !/Seer$/.test(A.seer1) && /Architect$/.test(A.arch) && /Longshot$/.test(A.long) && /Grinder$/.test(A.grind) && /All-rounder$/.test(A.all), JSON.stringify(A));
  const Rc = VJ(`(()=>{const d=(lanes,recent,st)=>({lanes,recent:recent||{},form:{state:st||'steady'}});const x='nhl|ml|fav',y='nhl|total|over',z='nhl|total|under',q='nhl|ml|dog',u='nba|ml|fav';
    const A=d({[x]:{val:10},[y]:{val:-6,scar:true},[z]:{val:-6,scar:true},[q]:{val:2},[u]:{val:-5,scar:true}},{[x]:{n:12,u:-5},[q]:{n:6,u:-5}});
    const B=d({[x]:{val:2},[y]:{val:3},[z]:{val:-1},[q]:{val:1},[u]:{val:-4,scar:true}},{[x]:{n:12,u:5},[y]:{n:12,u:5}});
    const base=wbRecipe(A,B,{temper:'Steady',craft:'All-rounder'},0),reb=wbRecipe(A,B,{temper:'Rebel',craft:'All-rounder'},0),pro=wbRecipe(A,B,{temper:'Prodigy',craft:'All-rounder'},0),m1=wbRecipe(A,B,{temper:'Steady',craft:'All-rounder'},1);
    return{base,reb,pro,m1};})()`);
  T('recipe: in every lane the stronger parent\'s gene is dominant', Rc.base.lanes['nhl|ml|fav'].a > Rc.base.lanes['nhl|ml|fav'].b && Rc.base.lanes['nhl|ml|dog'].a > Rc.base.lanes['nhl|ml|dog'].b, JSON.stringify(Rc.base.lanes));
  T('…a scar takes away that parent\'s say; the lane is vaccinated unless the other parent pays there (covered: NHL overs; vaccinated: NHL unders, and a lane both are scarred in)', Rc.base.lanes['nhl|total|over'].a === 0 && !Rc.base.vacc.includes('nhl|total|over') && Rc.base.vacc.includes('nhl|total|under') && Rc.base.vacc.includes('nba|ml|fav') && Rc.base.lanes['nba|ml|fav'].a === 0 && Rc.base.lanes['nba|ml|fav'].b === 0, JSON.stringify(Rc.base.vacc));
  T('…a Rebel fades a parent only where it\'s really sinking (10+ calls in 14 days, losing 15%+ a call) — not on 6 calls', Rc.reb.fade.includes('nhl|ml|fav') && Rc.reb.lanes['nhl|ml|fav'].a < 0 && !Rc.reb.fade.includes('nhl|ml|dog') && Rc.base.fade.length === 0, JSON.stringify(Rc.reb.fade));
  T('…a Prodigy sharpens where a parent is really hot', Rc.pro.hot.includes('nhl|ml|fav') && Rc.pro.hot.includes('nhl|total|over') && Rc.pro.lanes['nhl|ml|fav'].t === 0.85 && !Rc.base.hot.length, JSON.stringify(Rc.pro.hot));
  T('…and a sibling carries a mutation', Rc.base.mut === 'none: the pure blend' && Rc.m1.P.b === 0.5 && /market → 0\.5/.test(Rc.m1.mut));
  /* sync: two devices never split the family */
  const M = VJ(`(()=>{const L=(id,a,b,c,emb)=>({id,st:'live',a,b,conceived:c,arch:{label:'Steady All-rounder'},court:{},dna:{},domA:[],domB:[],embryos:emb});
    const e=(id,st,x)=>Object.assign({id,st,since:'2026-11-23',arch:'Steady All-rounder',recipe:{lanes:{},vacc:[],fade:[],hot:[],P:{}},n:1},x||{});
    const older={v:1,firstDone:1,lastConceived:'2026-11-22',tried:4,litters:[L('L1','Sim','Judge','2026-11-22',[e('L1e1','womb'),e('L1e2','womb')]),L('L2','Coach','Trends','2026-11-22',[e('L2e1','womb'),e('L2e2','womb')])]};
    const olderDue=JSON.parse(JSON.stringify(older));olderDue.litters[1].embryos[0].st='due';olderDue.litters[1].embryos[0].dueAt='2026-12-04';
    const newer=JSON.parse(JSON.stringify(older));newer.tried=5;newer.lastConceived='2026-12-04';newer.litters[0].embryos[1].st='lost';newer.litters[0].embryos.push(e('L1e3','womb',{n:5}));
    const m1=wombMerge(newer,olderDue);
    const parallel={v:1,firstDone:1,lastConceived:'2026-11-24',tried:2,litters:[L('L1','Judge','Covers','2026-11-24',[e('L1e1','womb'),e('L1e2','womb')])]};
    const m2=wombMerge(parallel,older),m3=syncMergeVal(WOMB_KEY,{t:2,v:parallel},{t:1,v:older});
    return{m1:m1.litters.map(L=>L.embryos.map(x=>x.id+':'+x.st)),t1:m1.tried,lc:m1.lastConceived,m2:m2.litters.map(L=>L.a+'×'+L.b+'@'+L.conceived),t2:m2.tried,m3:m3.litters.map(L=>L.a+'×'+L.b)};})()`);
  T('sync: two devices never split the family — one copy\'s lost embryo and new sibling and the other copy\'s due embryo all survive the merge', JSON.stringify(M.m1) === JSON.stringify([['L1e1:womb', 'L1e2:lost', 'L1e3:womb'], ['L2e1:due', 'L2e2:womb']]) && M.t1 === 5 && M.lc === '2026-12-04', JSON.stringify(M));
  T('…a device that courted on its own from an older copy doesn\'t start a second family: the one conceived first is kept, and the count tried never goes backwards', JSON.stringify(M.m2) === JSON.stringify(['Sim×Judge@2026-11-22', 'Coach×Trends@2026-11-22']) && M.t2 === 4 && JSON.stringify(M.m3) === JSON.stringify(['Sim×Judge', 'Coach×Trends']), JSON.stringify(M));
  /* no line, no pick — and a vaccinated lane never makes an official call */
  const mini = []; for (let i = 0; i < 30; i++) { const d = dayAt('2026-11-01', i % 15); for (const vv of ['Sim', 'Judge']) mini.push({ id: `m${i}${vv}`, sp: 'nhl', date: d, game: `X${i}@Y${i}`, voice: vv, market: 'ml', side: 'home', line: null, price: -110, pick: `Y${i} ML`, cf: 0.8, graded: true, hit: i % 3 > 0, push: false, f: [] }); }
  v.__VJ = JSON.stringify(mini); V('set(VOICES_KEY,JSON.parse(window.__VJ));WB_IX=null;');
  const NL = VJ(`(()=>{const IX=wbIndex(true);const L={a:'Sim',b:'Judge',domA:[],domB:[]};const mk=(w,vacc)=>({since:'2026-11-01',recipe:{P:{b:0.35,T:1,contrast:1},lanes:{'nhl|ml|fav':w,'nhl|ml|dog':w},vacc:vacc||[],fade:[],hot:[],craft:'All-rounder',temper:'Steady'}});
    const back=wbEval(L,mk({a:-1,b:-1}),IX,'2026-11-20',1),fwd=wbEval(L,mk({a:1,b:1}),IX,'2026-11-20',1),vac=wbEval(L,mk({a:1,b:1},['nhl|ml|fav']),IX,'2026-11-20',1);return{back:[back.me.n,back.off.n,back.A.n],fwd:[fwd.me.n,fwd.off.n],vac:[vac.me.n,vac.off.n]};})()`);
  T('no line, no pick: an embryo that likes a side nobody priced never calls it (30 games, every one priced only on the home side → 0 calls; it\'s still compared to both parents)', NL.back[0] === 0 && NL.back[1] === 0 && NL.back[2] === 30 && NL.fwd[0] === 30, JSON.stringify(NL));
  T('…and in a vaccinated lane it reads the games but never makes an official call (55% at most)', NL.vac[0] === 30 && NL.vac[1] === 0 && NL.fwd[1] > 0, JSON.stringify(NL));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 600)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); })();
