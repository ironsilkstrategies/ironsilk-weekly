/* v3.5.2 · Nov 23, Chris: "the bloodline screen is difficult asf to understand… can we make the ui better so I can truly understand what
   the fuck is going on… how close I am to a birth etc" and "I compared this feature to the game bitlife… it was never hard to understand
   what was going on on there… plus their should be multiple varieties of 'type' (rebel, all around etc) of characters are being birthed".
   A · brothers and sisters come out different: the odds by the parents' records, a seeded draw that never repeats a kind in a litter,
       three babies a litter with the rule's own child first, a replacement that's a kind none of its living siblings is, the litters
       conceived the day before under the old rule getting their siblings (and nothing else touched).
   B · the 👪 Family page (BitLife): the book opens on it; the header says where the family stands; every baby a life card (avatar, kind,
       age, a status in plain words, % to birth, four bars: growth, experience, smarts, money), the day it can be born and its deadline,
       what it's waiting on (no σ), its life so far in date order; tap to open; coming up by date; how it works; an heir's card on the desk.
   C · the readiness math and the statuses on paper. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const page = f => fs.readFileSync(path.join(W, f), 'utf8').replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, x) => `<script>${fs.readFileSync(path.join(W, x), 'utf8')}</script>`);
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(store, now) { return new JSDOM(page('nhl.html'), { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(w) {
  w.__NOW = now; const RD = w.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [w.__NOW])); } static now() { return w.__NOW; } } w.Date = FD;
  w.__NO_GRADELOOP__ = true; w.__NO_REOPEN__ = true; w.__NO_BACKFILL__ = true; w.__NO_SYNC_LOOP__ = true;
  w.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); w.scrollTo = () => { }; w.alert = () => { }; w.confirm = () => true;
  w.localStorage.setItem('d4.setupDone', '1'); Object.entries(store).forEach(([k, v]) => w.localStorage.setItem(k, JSON.stringify(v))); } }).window; }
const dayAt = (d0, i) => new Date(Date.parse(d0 + 'T12:00:00Z') + i * 864e5).toISOString().slice(0, 10);
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const OTH = { home: 'away', away: 'home', over: 'under', under: 'over' };
function world(seed, { from = '2026-10-20', to = '2026-12-06', per = 12 } = {}) {
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
const at = D => Date.parse(D + 'T18:00:00Z');
const txt = h => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

(async () => { try {
  const w = boot({ 'd4.voices': snap('2026-11-22') }, at('2026-11-22')); await wait(1500);
  const E = s => w.eval(s), J = s => JSON.parse(w.eval(`JSON.stringify(${s})`));
  const go = D => { w.__NOW = at(D); w.__VJ = JSON.stringify(snap(D)); E('set(VOICES_KEY,JSON.parse(window.__VJ));WB_IX=null;WOMB_MEMO=null;WB_NS=null;WB_LT=new Map();'); };

  /* ══ A · brothers and sisters come out different ══ */
  const od = J(`(()=>{const D=(form,tot,side,chalk,dog,score)=>({form:{state:form},style:{totU:tot,sideU:side,chalkU:chalk,dogU:dog},score});const top=O=>Object.entries(O).sort((a,b)=>b[1]-a[1])[0][0];
    const r={};for(const[k,a,b]of[['hot',['hot'],['hot']],['cold',['cold'],['cold']],['split',['hot'],['cold']],['steady',['steady'],['steady']]]){const dA=D(a[0],1,1,1,1,null),dB=D(b[0],1,1,1,1,null);const arch=wbArch({...dA,v:'Sim',upc:0,form:{state:a[0],u:0,upc:0}},{...dB,v:'Judge',upc:0,form:{state:b[0],u:0,upc:0}});const O=wbOdds(dA,dB,arch);r[k]={rule:arch.temper,top:top(O.T),seer:O.C.Seer};}
    return r;})()`);
  T('the odds follow the parents\' records: both hot → a Prodigy likeliest, both slumping → a Rebel, one of each → a Prodigal, both steady → a Steady; no Seer without two score callers', od.hot.top === 'Prodigy' && od.cold.top === 'Rebel' && od.split.top === 'Prodigal' && od.steady.top === 'Steady' && Object.values(od).every(o => o.seer === 0 && o.top === o.rule), JSON.stringify(od));
  const dr = J(`(()=>{const a=dnaOf('Sim','2026-11-23'),b=dnaOf('Judge','2026-11-23'),arch=wbArch(a,b);const one=s=>wbDraw(a,b,arch,new Set([arch.label]),s).label;
    const seeds=Array.from({length:60},(_,i)=>'L9|Sim|Judge|2026-11-22|'+i),draws=seeds.map(one);
    return{rule:arch.label,same:one('X|1')===one('X|1'),never:!draws.includes(arch.label),tempers:[...new Set(draws.map(x=>x.split(' ')[0]))],crafts:[...new Set(draws.map(x=>x.split(' ').slice(1).join(' ')))],ruleT:draws.filter(x=>x.split(' ')[0]===arch.temper).length};})()`);
  T('a sibling\'s kind is a seeded draw (the same litter draws the same child on every device), never the kind already taken, and across litters every temperament and several crafts turn up', dr.same && dr.never && dr.tempers.length === 4 && dr.crafts.length >= 3, JSON.stringify(dr));
  E('wombRun(true)'); const W0 = J('wombAll()'), J0 = J(`journalAll().filter(x=>x.kind==='womb'&&/^💞/.test(x.title)).map(x=>x.title)`);
  T('three babies a litter, three different kinds, the first the rule\'s own child; the chronicle names all three', W0.litters.length === 2 && W0.litters.every(L => L.embryos.length === 3 && new Set(L.embryos.map(e => e.arch)).size === 3 && L.embryos[0].arch === L.arch.label && L.mix === 1) && J0.every(t => /expecting three — a [A-Z]\w+ [\w-]+, a [A-Z]\w+ [\w-]+ and a [A-Z]\w+ [\w-]+$/.test(t)), JSON.stringify([W0.litters.map(L => L.embryos.map(e => e.arch)), J0]));
  T('…each sibling\'s genes follow its own kind (an Architect leans on each parent\'s side of the board, a Grinder on favorites…)', W0.litters.every(L => L.embryos.every(e => e.recipe.temper + ' ' + e.recipe.craft === e.arch)), JSON.stringify(W0.litters.map(L => L.embryos.map(e => [e.arch, e.recipe.temper, e.recipe.craft]))));
  const w2 = boot({ 'd4.voices': snap('2026-11-22') }, at('2026-11-22')); await wait(1500); w2.eval('wombRun(true)'); const W2 = JSON.parse(w2.eval('JSON.stringify(wombAll())')); w2.close();
  T('…and a second device conceiving the same litters draws exactly the same children', JSON.stringify(W2.litters.map(L => L.embryos.map(e => e.arch))) === JSON.stringify(W0.litters.map(L => L.embryos.map(e => e.arch))));
  /* the litters conceived on Nov 22 under the old rule: two babies of one kind */
  const old = J(`(()=>{const W=wombAll();const L0=JSON.parse(JSON.stringify(W.litters[0])),L1=JSON.parse(JSON.stringify(W.litters[1]));
    const mk=(L,conceived)=>{const e1=L.embryos[0];L.mix=undefined;L.conceived=conceived;L.embryos=[e1,{...JSON.parse(JSON.stringify(e1)),id:L.id+'e2',arch:e1.arch,n:e1.n+1}].map(e=>({...e,conceived}));return L;};
    W.litters=[mk(L0,'2026-11-22'),mk(L1,'2026-11-18')];W.tried=8;set(WOMB_KEY,W);return W.litters.map(L=>({id:L.id,kinds:L.embryos.map(e=>e.arch),r1:JSON.stringify(L.embryos[0].recipe)}));})()`);
  E('WOMB_MEMO=null;wombRun(true)'); const W1 = J('wombAll()'), Jm = J(`journalAll().filter(x=>x.kind==='womb'&&/siblings of other kinds/.test(x.title)).map(x=>x.title+' | '+x.what)`);
  const L0 = W1.litters[0], L1 = W1.litters[1];
  T('a litter conceived Nov 22 under the old rule (two babies, one kind) gets its brothers and sisters: the first untouched, the second redrawn, a third added, judged from the same day', L0.embryos.length === 3 && new Set(L0.embryos.map(e => e.arch)).size === 3 && JSON.stringify(L0.embryos[0].recipe) === old[0].r1 && L0.embryos[1].arch !== old[0].kinds[0] && L0.embryos[2].since === L0.embryos[0].since && L0.embryos[2].n === 9 && L0.mix === 1, JSON.stringify(L0.embryos.map(e => [e.id, e.arch, e.since, e.n])));
  T('…the chronicle says so once ("🥚 …: siblings of other kinds"); a litter from before Nov 20 isn\'t redrawn (a third baby joins it the ordinary way: conceived today, judged from tomorrow)', Jm.length === 1 && /^🥚 The Simulator × The Judge: siblings of other kinds \| Brothers and sisters don't all come out the same: alongside its .+, the litter now carries a .+ and a .+, drawn from the same records they were conceived on and judged from the same day\.$/.test(Jm[0]) && L1.embryos.slice(0, 2).every(e => e.arch === old[1].kinds[0]) && !L1.mix && (!L1.embryos[2] || (L1.embryos[2].conceived === '2026-11-22' && L1.embryos[2].since === '2026-11-23' && L1.embryos[2].arch !== old[1].kinds[0])), JSON.stringify([Jm, L1.embryos.map(e => [e.arch, e.conceived, e.since])]));
  E('WOMB_MEMO=null;wombRun(true)'); const W1b = J('wombAll()');
  T('…and running it again changes nothing', JSON.stringify(W1b.litters.map(L => L.embryos.map(e => [e.id, e.arch]))) === JSON.stringify(W1.litters.map(L => L.embryos.map(e => [e.id, e.arch]))) && J(`journalAll().filter(x=>/siblings of other kinds/.test(x.title)).length`) === 1);
  /* sync: the phone redrew the siblings while the other copy still holds the old second baby */
  const mg = J(`(()=>{const N=wombAll(),O=JSON.parse(JSON.stringify(N)),L=O.litters[0],e1=L.embryos[0];delete L.mix;L.embryos=[e1,{...JSON.parse(JSON.stringify(e1)),id:L.id+'e2',arch:e1.arch,n:e1.n+1}];
    const k=W=>W.litters[0].embryos.map(e=>e.arch).join(','),m1=wombMerge(O,N),m2=wombMerge(N,O);
    const B=JSON.parse(JSON.stringify(N));B.litters[0].embryos[1]=JSON.parse(JSON.stringify(L.embryos[1]));delete B.litters[0].mix;set(WOMB_KEY,B);__NOW+=864e5;TODAY_T=0;WOMB_MEMO=null;wombRun(true);
    const H=wombAll();__NOW-=864e5;TODAY_T=0;
    return{want:k(N),old:k(O),m1:k(m1),m2:k(m2),mix:[m1.litters[0].mix,m2.litters[0].mix],healed:k(H),healMix:H.litters[0].mix,J:journalAll().filter(x=>/siblings of other kinds/.test(x.title)).length};})()`);
  T('sync: the copy that drew the siblings beats the old copy whichever side the merge starts from; a device whose older app dropped them gets the same siblings back on its next run, and the chronicle still says it once', new Set(mg.want.split(',')).size === 3 && mg.m1 === mg.want && mg.m2 === mg.want && mg.mix.every(x => x === 1) && mg.healed === mg.want && mg.healMix === 1 && mg.J === 1, JSON.stringify(mg));
  w.close();

  /* ══ B · the 👪 Family page ══ */
  const f = boot({ 'd4.voices': snap('2026-11-22') }, at('2026-11-22')); await wait(1500);
  const F = s => f.eval(s), FJ = s => JSON.parse(f.eval(`JSON.stringify(${s})`));
  const fgo = D => { f.__NOW = at(D); f.__VJ = JSON.stringify(snap(D)); F('TODAY_T=0;set(VOICES_KEY,JSON.parse(window.__VJ));WB_IX=null;WOMB_MEMO=null;WB_NS=null;WB_LT=new Map();'); };
  F('wombRun(true)'); fgo('2026-12-01'); F('wombRun(true)');
  F('genOpen()'); await wait(3000);
  const book = F(`document.getElementById('genView').innerHTML`), bt = txt(book);
  T('the book opens on 👪 Family; the header says where the family stands (families, babies, the next birth); the other system is "🔧 Tune-ups"', F('GEN_TAB') === 'home' && /👪 Family/.test(bt) && /2 families expecting · 6 babies in the womb · next birth Thu, Dec 3/.test(bt) && /🔧 Tune-ups/.test(bt) && !/Throne race/.test(bt), bt.slice(0, 400));
  T('the hero: the next possible birth and when, the family by stage, the journey (pair → womb → born → graduate → evolve)', /Your family/i.test(bt) && /Next possible birth: Thu, Dec 3 \(in 2 days\)/.test(bt) && /6 🥚 in the womb/.test(bt) && /0 🍼 rookies/.test(bt) && /Pair · 2/.test(bt) && /Womb · 6/.test(bt) && /Graduate/.test(bt) && /Evolve/.test(bt), bt.slice(0, 700));
  const cards = FJ(`[...document.querySelectorAll('#genView .life')].map(el=>({open:el.classList.contains('open'),t:el.innerHTML}))`);
  const c0 = cards[0] ? txt(cards[0].t) : '';
  T('every baby is a life card (six), the closest one open, the rest closed', cards.length === 6 && cards.filter(c => c.open).length === 1 && cards[0].open, JSON.stringify(cards.map(c => c.open)));
  T('…the card: its kind, its parents and age, a status in plain words, % to birth', /a (Prodigy|Steady|Rebel|Prodigal) [\w-]+/.test(c0) && /Simulator × Judge · day 8 of up to 28/.test(c0) && /(Still learning|Ahead, not clearly yet|Clearing every bar|Behind)/.test(c0) && /\d+% to birth/i.test(c0), c0.slice(0, 300));
  T('…four bars: growth (8 of 10 days, 80%), experience (games against each parent), smarts (its edge on each parent against what it needs), money', /Growth 80%/.test(c0) && /8 of 10 days/.test(c0) && /Experience 100%/.test(c0) && /192 games against each parent ✓ \(100 needed\)/.test(c0) && /Smarts \d+%/.test(c0) && /vs Simulator · [+−]\d\.\d vs Judge \(needs \+2\.0 against both\)/.test(c0) && /Money \d+%/.test(c0) && /its official picks [+−]/.test(c0), c0.slice(0, 900));
  T('…when: the earliest birth (Thu, Dec 3, in 2 days) and its deadline (Mon, Dec 21); what it\'s waiting on, in plain words (no σ)', /Earliest birth Thu, Dec 3 in 2 days/.test(c0) && /Deadline Mon, Dec 21 in 20 days/.test(c0) && /Waiting on:/.test(c0) && !/σ/.test(c0), c0.slice(0, 1200));
  const logT = FJ(`[...document.querySelectorAll('#genView .life.open .log div')].map(d=>d.textContent)`);
  T('…its life so far, in date order: conceived, the first games, today, and what\'s ahead (greyed)', logT.length >= 4 && /^Sun, Nov 22 Conceived by The Simulator and The Judge/.test(logT[0]) && logT.some(x => /^Tue, Dec 1 Day 8: \d+-\d+ so far\./.test(x)) && logT.some(x => /^Thu, Dec 3 The earliest day it can be born\./.test(x)) && /^Mon, Dec 21 Its deadline/.test(logT[logT.length - 1]) && FJ(`document.querySelectorAll('#genView .life.open .log div.fut').length`) >= 2, JSON.stringify(logT));
  F(`document.querySelectorAll('#genView .life .sm')[1].click()`); const tog = FJ(`[...document.querySelectorAll('#genView .life')].slice(0,2).map(el=>el.classList.contains('open'))`);
  F(`document.querySelectorAll('#genView .life .sm')[0].click()`); const tog2 = FJ(`document.querySelectorAll('#genView .life')[0].classList.contains('open')`);
  T('tap a card and it opens, tap again and it closes (BitLife: one life at a glance, the detail a tap away)', tog[0] === true && tog[1] === true && tog2 === false, JSON.stringify([tog, tog2]));
  T('📅 coming up, by date, one line each (the earliest birth, the deadline, for all the families at once)', /Coming up/.test(bt) && /Thu, Dec 3 The earliest a baby can be born \(The Simulator × The Judge and The Coach × The Historian\)|Thu, Dec 3 The earliest a baby can be born \(Simulator × Judge and Coach × Historian\)/.test(bt) && /Mon, Dec 21 Deadline: babies not born by then are lost/.test(bt), (bt.match(/Coming up.{0,300}/) || [''])[0]);
  T('❓ how it works, in five plain steps, closed until tapped; 📰 the family news', /How it works, in 5 steps/.test(bt) && /Pairing\./.test(bt) && /Birth\./.test(bt) && /Evolution\./.test(bt) && FJ(`!document.querySelector('#genView .how').classList.contains('open')`) && /Family news/.test(bt), '');
  /* Dec 4: a birth; the heir's card on the desk */
  fgo('2026-12-04'); F('wombRun(true);GEN_TAB="home";genRender()'); await wait(300);
  const bt4 = txt(F(`document.getElementById('genView').innerHTML`)), kc = txt(FJ(`(()=>{const el=[...document.querySelectorAll('#genView .life')].find(el=>/to graduate/i.test(el.textContent));return el?el.innerHTML:'';})()`));
  T('🍼 on the desk: the newborn\'s card counts down to graduation (rookie day 0 of 21, % to graduate, earliest graduation Sat, Dec 26)', /On the desk/.test(bt4) && /Rookie · day 0 of 21/.test(kc) && /to graduate/i.test(kc) && /Earliest graduation Sat, Dec 26/.test(txt(kc)) && /Born to The Simulator and The Judge/.test(kc), txt(kc).slice(0, 500));
  T('…and the header counts it ("1 heir on the desk")', /1 heir on the desk/.test(bt4), bt4.slice(0, 200));
  f.close();

  /* ══ C · the readiness math and the statuses on paper ══ */
  const q = boot({ 'd4.voices': [] }, at('2026-11-30')); await wait(1200);
  const Q = s => JSON.parse(q.eval(`JSON.stringify(${s})`));
  const L = o => Q(`(()=>{const r=wbLife(Object.assign({days:5,minDays:10,n:[50,60],minN:100,z:[1.0,1.4],bar:2,names:['Judge','Covers'],mOk:true,respBad:false,done:false,doneTxt:'🍼 Ready to be born',etaMin:'2026-12-05',dl:'2026-12-23',mTxt:'x'},${JSON.stringify(o)}));return{ready:+r.ready.toFixed(3),eta:r.eta,st:r.st,tone:r.tone};})()`);
  const a = L({}), b = L({ n: [40, 70], z: [-1.2, 0.5] }), c = L({ days: 10, n: [100, 120], z: [1.0, 1.5] }), d = L({ days: 10, n: [100, 120], z: [2.2, 2.5], mOk: false }), e = L({ days: 12, n: [130, 140], z: [2.2, 2.5] }), g = L({ done: true }), h = L({ days: 12, n: [130, 140], z: [1.2, 1.5], dl: '2026-12-03' });
  T('readiness: five days of ten, half the games, half the edge on its weaker parent, money fine (it counts as the games come in) → 50%; earliest birth paced by its games (10 a day: five more days)', a.ready === 0.5 && a.eta === '2026-12-05' && a.st === '⏳ Still learning' && a.tone === 'y', JSON.stringify(a));
  T('…the statuses, in plain words: behind a parent, ahead but not clearly, its picks behind on money, clearing every bar, ready to be born (100%), and the last days counted down', b.st === '📉 Behind Judge' && b.tone === 'r' && c.st === '📈 Ahead, not clearly yet' && d.st === '💸 Its picks are behind on money' && e.st === '🟢 Clearing every bar' && g.st === '🍼 Ready to be born' && g.ready === 1 && /^📈 Ahead, not clearly yet · ⌛ 3 days left$/.test(h.st), JSON.stringify([b, c, d, e, g, h]));
  const pl = Q(`["100 more of Judge's calls","1.2σ more against Judge","to hold its own in Judge's best lanes (−1.3σ)","0.5u more on its official calls (vs Judge's +1.0u)"].map(wbPlain)`);
  T('…"waiting on" in plain words: games against a parent, a bigger edge on it, no σ anywhere', pl[0] === '100 more games against Judge' && pl[1] === 'a bigger edge on Judge (+1.2)' && pl[2] === "to hold its own in Judge's best lanes" && /0\.5u more from its official picks/.test(pl[3]) && !pl.join(' ').includes('σ'), JSON.stringify(pl));
  q.close();
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  console.log(out.join('\n')); const fl = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - fl}/${out.length} passed`); process.exit(fl ? 1 : 0); })();
