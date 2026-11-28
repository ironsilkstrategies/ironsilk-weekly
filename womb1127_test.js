/* v3.5.37 · Nov 27, Chris: "Why are the bloodlines in the womb froze..?? Not doing anything?!" On Nov 26 a page opened before the
   phone's saved history loaded, saw an empty womb and saved it; the next morning the store folded that copy in one level deep and its
   empty list of families replaced the real one. The heirs came through; the three families in progress didn't, and the womb, finding
   itself empty, paired The Coach with The Scout at day 0. Pinned here: the families come back exactly (once, only for the family it
   happened to), a pair made since whose parent is already expecting is called off, a sync with the wiped copy can't undo it, a page
   without the saved history changes nothing, and a baby conceived today says so instead of showing a row of zeros. (The store's half:
   store1127_test.mjs.) */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + String(d).slice(0, 400) : ''}`);
const page = f => fs.readFileSync(path.join(W, f), 'utf8').replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, x) => `<script>${fs.readFileSync(path.join(W, x), 'utf8')}</script>`);
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(store, now, pre) { return new JSDOM(page('nhl.html'), { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(w) {
  w.__NOW = now; const RD = w.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [w.__NOW])); } static now() { return w.__NOW; } } w.Date = FD;
  w.__NO_GRADELOOP__ = true; w.__NO_REOPEN__ = true; w.__NO_BACKFILL__ = true; w.__NO_SYNC_LOOP__ = true;
  w.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); w.scrollTo = () => { }; w.alert = () => { }; w.confirm = () => true;
  if (pre) pre(w);
  w.localStorage.setItem('d4.setupDone', '1'); Object.entries(store).forEach(([k, v]) => w.localStorage.setItem(k, JSON.stringify(v))); } }).window; }
const at = D => Date.parse(D + 'T18:00:00Z');
const txt = h => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

(async () => { try {
  /* the registry as the phone had it on Nov 27: the two heirs, and the one family the empty womb made that morning */
  const w = boot({}, at('2026-11-27')); await wait(1500);
  const E = s => w.eval(s), J = s => JSON.parse(w.eval(`JSON.stringify(${s})`));
  const N = J('WB_FIX1127');
  T('the copy carried in the code is the Nov 26 registry: five families, 15 embryos tried', N.tried === 15 && N.litters.map(L => `${L.id}:${L.a}×${L.b}:${L.st}`).join(',') === 'L1:Judge×Covers:live,L2:Sim×Power:born,L3:Most common×Scout:born,L4:Sim×Coach:live,L5:Power×Scout:live',
    N.litters.map(L => `${L.id}:${L.a}×${L.b}:${L.st}`).join(','));
  const kid = (L, E0, name, born, liveFrom) => ({ key: 'H_' + E0.id, id: E0.id, litter: L.id, a: L.a, b: L.b, st: 'rookie', born, liveFrom, since: E0.since, conceived: L.conceived, recipe: E0.recipe, n: E0.n,
    name, chip: name.toUpperCase(), title: 'The Steady Hand', creed: 'Chalk, discipline, repeat.', arch: E0.arch, temper: E0.arch.split(' ')[0], craft: E0.arch.split(' ')[1], color: '#9ca3af', crest: { g: '⚙️', t: '⚓' },
    domA: L.domA, domB: L.domB, pub: { bio: 'x', origin: 'y' }, gen: 1 });
  const L2 = N.litters[1], L3 = N.litters[2];
  const KIDS = [kid(L2, L2.embryos[0], 'The Grinder', '2026-11-19', '2026-11-24'), kid(L3, L3.embryos[0], 'The Closer', '2026-11-24', '2026-11-25')];
  const CS = { id: 'L1', v: 3, st: 'live', a: 'Coach', b: 'Scout', conceived: '2026-11-27', arch: { label: 'Steady All-rounder', why: 'x' }, court: { score: 0.7, gain: 43, lift: 0.04, split: 0, ag: 130, sp: 488, right: 'Scout' },
    dna: {}, domA: [], domB: [], mix: 1, embryos: ['Steady All-rounder', 'Prodigy All-rounder', 'Rebel Architect'].map((a, i) => ({ id: 'L1e' + (i + 1), st: 'womb', conceived: '2026-11-27', since: '2026-11-28', arch: a, recipe: L2.embryos[0].recipe, n: i + 1 })) };
  const WIPED = { v: 1, litters: [CS], tried: 3, firstDone: 1, lastConceived: '2026-11-27', north: {}, kids: KIDS };
  w.__WJ = JSON.stringify(WIPED);
  E('set(WOMB_KEY,JSON.parse(window.__WJ));WOMB_MEMO=null;WB_IX=null;wombRun(true);');
  const R = J('wombAll()');
  T('the families come back exactly: Judge × Covers, Simulator × Coach and Commissioner × Scout in the womb, the two births on the books',
    R.litters.map(L => `${L.id}:${L.a}×${L.b}:${L.st}:${L.conceived}`).join(',') === N.litters.map(L => `${L.id}:${L.a}×${L.b}:${L.st}:${L.conceived}`).join(','), R.litters.map(L => `${L.id}:${L.a}×${L.b}:${L.st}`).join(','));
  T('…every baby as it was (same kinds, same genes, judged from the same day)', JSON.stringify(R.litters.map(L => L.embryos.map(e => [e.id, e.st, e.arch, e.since, e.recipe]))) === JSON.stringify(N.litters.map(L => L.embryos.map(e => [e.id, e.st, e.arch, e.since, e.recipe]))));
  T('…the Coach × Scout pairing from that morning is called off (both were already expecting)', !R.litters.some(L => L.a === 'Coach' && L.b === 'Scout'));
  T('…the count of embryos tried is the real one again (15), the heirs untouched, and it\'s marked done', R.tried === 15 && R.kids.length === 2 && R.kids.every(K => K.st === 'rookie') && R.fix1127 === '2026-11-27', [R.tried, R.kids.length, R.fix1127]);
  const jr = J(`journalAll().filter(x=>x.sig==='fix1127')`);
  T('the chronicle says what happened, in plain words', jr.length === 1 && /The families are back: The Judge × Covers, The Simulator × The Coach and The Commissioner × The Scout/.test(jr[0].title) && /saw an empty womb/.test(jr[0].what)
    && /The Coach × The Scout, paired this morning because the womb looked empty, is called off: the Coach is already expecting with the Simulator and the Scout is already expecting with the Commissioner\./.test(jr[0].what), jr[0] && jr[0].title + ' | ' + jr[0].what);
  T('…no new pairing that day (every slot is full again)', J('wombAll().litters.filter(L=>L.st===\'live\').length') === 3);
  /* the Family page */
  E('GEN_TAB="home";');
  const H = txt(E('homeHtml()'));
  T('the Family page shows the three families again, with their days in the womb', /The Judge × Covers/.test(H) && /The Simulator × The Coach/.test(H) && /The Commissioner × The Scout/.test(H) && /day 4 of up to 28/.test(H) && !/The Coach × The Scout/.test(H), H.slice(0, 600));
  T('…and the news line', /🩹 The families are back/.test(H));
  /* once */
  w.__NOW = at('2026-11-28'); E('TODAY_T=0;WOMB_MEMO=null;WB_IX=null;wombRun(true);');
  T('it happens once: the next day changes nothing and says nothing more', J('wombAll().litters.length') === 5 && J(`journalAll().filter(x=>x.sig==='fix1127').length`) === 1 && J('wombAll().fix1127') === '2026-11-27');
  /* a sync with the wiped copy (the cloud still has it) can't undo it, either way round */
  w.__WJ = JSON.stringify(WIPED);
  const M = J(`(()=>{const A=wombAll(),B=JSON.parse(window.__WJ);const k=X=>X.litters.map(L=>L.id+':'+L.a+'×'+L.b).join(',')+'|'+X.tried+'|'+X.fix1127+'|'+X.kids.length;return[k(wombMerge(A,B)),k(wombMerge(B,A)),k(syncMergeVal(WOMB_KEY,{t:1,v:A},{t:2,v:B})),k(A)];})()`);
  T('a sync with the wiped copy keeps the families (whichever copy is newer)', M[0] === M[3] && M[1] === M[3] && M[2] === M[3], M.join(' / '));
  /* only the family it happened to, and only from Nov 27 */
  E(`(()=>{const X=JSON.parse(window.__WJ);X.kids=[];set(WOMB_KEY,X);})()`); E('WOMB_MEMO=null;wombRun(true);');
  T('a womb without those two heirs is left alone (not this family)', J('wombAll().litters.map(L=>L.a+"×"+L.b).join(",")') === 'Coach×Scout' && !J('!!wombAll().fix1127'));
  E(`(()=>{const X=JSON.parse(window.__WJ);set(WOMB_KEY,X);})()`); w.__NOW = at('2026-11-26'); E('TODAY_T=0;WOMB_MEMO=null;WB_IX=null;wombRun(true);');
  T('…nor before Nov 27', J('wombAll().litters.map(L=>L.a+"×"+L.b).join(",")') === 'Coach×Scout' && !J('!!wombAll().fix1127'));
  /* a pairing made since with parents who are free stays, renumbered after the families that came back */
  w.__NOW = at('2026-11-28'); E(`(()=>{const X=JSON.parse(window.__WJ);X.litters[0].a='Trends';X.litters[0].b='Pred';set(WOMB_KEY,X);})()`); E('TODAY_T=0;WOMB_MEMO=null;WB_IX=null;wombRun(true);');
  const R2 = J('wombAll()');
  T('…a pairing made since whose parents are free stays, numbered after them (L6), and counts toward the embryos tried', R2.litters.length === 6 && R2.litters[5].a === 'Trends' && R2.litters[5].id === 'L6' && R2.litters[5].embryos.map(e => e.id).join(',') === 'L6e1,L6e2,L6e3' && R2.tried === 18,
    [R2.litters.map(L => L.id + ':' + L.a).join(','), R2.tried]);
  /* a baby conceived today says so */
  E(`(()=>{const X=JSON.parse(window.__WJ);X.litters[0].a='Trends';X.litters[0].b='Pred';X.litters[0].conceived='2026-11-28';X.litters[0].embryos.forEach(e=>{e.conceived='2026-11-28';e.since='2026-11-29';});X.fix1127='2026-11-27';set(WOMB_KEY,X);})()`);
  E('TODAY_T=0;WOMB_MEMO=null;WB_IX=null;wombRun(true);');
  const H2 = txt(E('homeHtml()'));
  T('a baby conceived today reads "Just conceived · first games tomorrow", not a stuck-looking "day 0"', /🌱 Just conceived · first games tomorrow/.test(H2) && /conceived Sat, Nov 28, up to 28 days/.test(H2) && !/day 0 of up to 28/.test(H2), H2.slice(0, 700));
  w.close();

  /* a page without the saved history changes nothing */
  const w2 = boot({ 'd4.womb': WIPED }, at('2026-11-27'), x => { x.__DEGRADED_TEST__ = 1; }); await wait(1500);
  w2.eval('window.D4_STORE={on:()=>false,degraded:()=>true,why:()=>({why:"IndexedDB didn\'t answer in 30 s"}),bytes:()=>null};');
  const before = w2.localStorage.getItem('d4.womb');
  w2.eval('WOMB_MEMO=null;WB_IX=null;wombRun(true);');
  T('on a page that opened without the saved history the womb changes nothing (no restore there, no pairing, no write)', w2.localStorage.getItem('d4.womb') === before && JSON.parse(w2.eval('JSON.stringify(WOMB_MEMO)')).paused === 1);
  w2.eval('GEN_TAB="home";');
  T('…and the Family page says it\'s paused and why', /⏸ The womb is paused on this page/.test(txt(w2.eval('homeHtml()'))) && /Force-quit TheDesk and reopen it/.test(txt(w2.eval('homeHtml()'))));
  T('…the calibration rows and the power history aren\'t saved there either', /function mcalStack\(\)\{if\(typeof storeDegraded==='function'&&storeDegraded\(\)\)return\{add:0,n:0\};/.test(fs.readFileSync(path.join(W, 'desk-mcal.js'), 'utf8'))
    && /if\(!storeDegraded\(\)\)set\(PWR_HIST_KEY,H\);/.test(fs.readFileSync(path.join(W, 'shared.js'), 'utf8')));
  w2.close();
} catch (e) { T('no crash', false, e.stack); }
  console.log(out.join('\n')); const p = out.filter(x => x.startsWith('PASS')).length; console.log(`${p}/${out.length} passed`); process.exit(p === out.length ? 0 : 1); })();
