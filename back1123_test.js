/* v3.5.3 · Nov 23, Chris, on a baby whose two-week preview said it would have cleared every bar: "Can we treat it like it had been
   paired when it said….. if this would have been born or any others since the bloodlines started I'd like them born as if they did get
   paired on that date". Once, for the families in the womb that day: each is treated as paired on the day its preview named (or, if a
   parent's record wasn't proven yet that day, the first day both were; not even a day earlier than it really paired, and it stays as it
   is). Everything is drawn again from what was known that day (the kinds, the genes); each day since is replayed with only the games
   played by its end; the first day a baby clears every bar it's born, on that day; it joins the desk today and its rookie year starts
   with the first calls it makes. Families paired after that are judged from the day they're paired. The test world is home1123's. */
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
  const go = D => { w.__NOW = at(D); w.__VJ = JSON.stringify(snap(D)); E('TODAY_T=0;set(VOICES_KEY,JSON.parse(window.__VJ));WB_IX=null;WOMB_MEMO=null;WB_NS=null;WB_LT=new Map();'); };
  /* Nov 22: two families paired (by the code before this rule: no v) */
  E('wombRun(true)'); E(`(()=>{const W=wombAll();W.litters.forEach(L=>{delete L.v;});set(WOMB_KEY,W);})()`); const OLD = J('wombAll()');
  T('Nov 22: two families paired, three babies each, judged from Nov 23', OLD.litters.length === 2 && OLD.litters.every(L => L.conceived === '2026-11-22' && L.embryos.length === 3 && L.embryos.every(e => e.since === '2026-11-23' && e.preview)), JSON.stringify(OLD.litters.map(L => [L.a, L.b, L.conceived])));
  go('2026-11-23');
  /* the oracle, worked out with the womb's own parts before the update runs: the day each could have paired, the babies drawn that day, the first day one clears */
  const X = J(`(()=>{const IX=wbIndex(),W=wombAll();return W.litters.map(L=>{const s0=L.embryos[0].since,p0=dayShift(s0,-WOMB_PREVIEW);let c=p0;
      while(c<=s0&&!(wbProven(dnaOf(L.a,c,IX))&&wbProven(dnaOf(L.b,c,IX))))c=dayShift(c,1);const dA=dnaOf(L.a,c,IX),dB=dnaOf(L.b,c,IX),arch=wbArch(dA,dB),taken=new Set(),E=[];
      for(let k=0;k<3;k++){const ak=k===0?arch:wbDraw(dA,dB,arch,taken,[L.id,L.a,L.b,c,k].join('|'));taken.add(ak.label);E.push({id:L.embryos[k].id,n:L.embryos[k].n,arch:ak.label,recipe:wbRecipe(dA,dB,ak,k)});}
      let born=null,lostAny=false;const Lx={a:L.a,b:L.b,domA:wbBest(dA),domB:wbBest(dB)};
      for(let x=dayShift(c,WOMB_MIN_DAYS);x<'2026-11-23'&&!born;x=dayShift(x,1)){const R=E.map(e=>({e,r:wbEval(Lx,{since:c,recipe:e.recipe},IX,x,e.n,dayShift(x,1))}));
        if(R.some(o=>o.r.lost))lostAny=true;const due=R.filter(o=>o.r.due).sort((p,q)=>Math.min(q.r.A.z,q.r.B.z)-Math.min(p.r.A.z,p.r.B.z));if(due.length)born={d:x,id:due[0].e.id,arch:due[0].e.arch};}
      return{id:L.id,a:L.a,b:L.b,p0,c,np:[L.a,L.b].filter(v=>!wbProven(dnaOf(v,p0,IX))),E,born,lostAny};});})()`);
  const tried0 = OLD.tried;
  const R1 = J('wombRun(true).born'); const W1 = J('wombAll()'); const JW = J(`journalAll().filter(x=>x.kind==='womb').map(x=>({d:x.d,t:x.title,w:x.what}))`);
  const L1 = W1.litters.find(L => L.id === X[0].id), L2 = W1.litters.find(L => L.id === X[1].id);
  T('the oracle: the Simulator × the Judge couldn\'t have paired Nov 9 (the Judge\'s record wasn\'t proven yet) but could Nov 10; the Coach × the Historian could Nov 9; one of them clears by Nov 22', X[0].p0 === '2026-11-09' && X[0].np.join() === 'Judge' && X[0].c === '2026-11-10' && X[1].c === '2026-11-09' && !X[1].np.length && !!X[0].born && !X[0].lostAny, JSON.stringify(X.map(o => [o.c, o.np, o.born])));
  T('each family is dated back to that day: conceived and judged from it, the kinds drawn from the records the parents were running then (the first the Goosebumps rule\'s own), the genes rebuilt from them, no preview, nobody\'s count of tries changed', [[L1, X[0]], [L2, X[1]]].every(([L, x]) => L.conceived === x.c && L.back && L.back.to === x.c && L.back.from === '2026-11-22' && L.back.pv === '2026-11-09' && L.back.at === '2026-11-23' && L.embryos.every((e, k) => e.since === x.c && e.conceived === x.c && e.arch === x.E[k].arch && JSON.stringify(e.recipe) === JSON.stringify(x.E[k].recipe) && !e.preview && e.n === x.E[k].n) && new Set(L.embryos.map(e => e.arch)).size === 3) && W1.tried >= tried0, JSON.stringify([L1 && L1.back, L1 && L1.embryos.map(e => [e.arch, e.since]), X[0].E.map(e => e.arch)]));
  const K = (W1.kids || [])[0];
  T('a baby that would have cleared is born on the first day it did (the strongest that cleared that day), its brothers and sisters released', W1.kids.length === 1 && K.id === X[0].born.id && K.born === X[0].born.d && L1.st === 'born' && L1.bornAt === X[0].born.d && L1.embryos.filter(e => e.id !== K.id).every(e => e.st === 'released') && JSON.stringify(R1) === JSON.stringify([K.key]), JSON.stringify([K && [K.id, K.born], X[0].born, L1.st]));
  T('…it joins the desk today: born that day, its rookie year starting tomorrow with the first calls it makes (Nov 24), and its public story says the birth was dated back', K.liveFrom === '2026-11-24' && K.back === '2026-11-23' && K.st === 'rookie' && /Its birth was dated back: it joined the desk Nov 23\.$/.test(K.pub.bio) && K.since === X[0].c, JSON.stringify([K.liveFrom, K.back, K.pub && K.pub.bio]));
  const jb = JW.filter(j => /^📅/.test(j.t)), jborn = JW.find(j => /^👶/.test(j.t));
  T('the chronicle: "📅 … paired Nov 10 after all" (its preview named Nov 9, but that day the Judge\'s record wasn\'t proven: its calls said 63% and hit 53%), "📅 … paired Nov 9 after all", and the birth dated the day it happened', jb.length === 2 && /^📅 The Simulator × The Judge: paired Nov 10 after all$/.test(jb[0].t) && /^Dated back from Nov 22 to Nov 10: its two-week preview named Nov 9, but that day The Judge's record wasn't proven yet \(its calls said \d+% and hit \d+%\); Nov 10 was the first day they could have paired\. Its babies were drawn again from the records the parents were running that day: a .+, a .+ and a .+\. Every game since counts; the first day one clears every bar, it's born on that day\.$/.test(jb[0].w) && /^📅 The Coach × The Historian: paired Nov 9 after all$/.test(jb[1].t) && /Dated back from Nov 22 to Nov 9, the day its two-week preview named\./.test(jb[1].w) && !!jborn && jborn.d === X[0].born.d && /Its birth was dated back: it joins the desk Nov 23, and from Nov 24 it calls every game its parents call, as a rookie: 21 days and 150\+ calls against each parent to graduate, on calls it actually makes\.$/.test(jborn.w), JSON.stringify(jb.concat(jborn || [])));
  const R2 = J('WOMB_MEMO.emb');
  T('a family that hasn\'t cleared stays in the womb, judged on every game since Nov 9 (day 14 of 28 today)', L2.st === 'live' && L2.embryos.every(e => e.st === 'womb' && R2[e.id] && R2[e.id].days === 14), JSON.stringify(L2.embryos.map(e => [e.st, R2[e.id] && R2[e.id].days])));
  T('today\'s pass: no new pair in this world (the Coach and the Historian are expecting; the Simulator × the Judge rest while their child is a rookie)', W1.litters.length === 2 && W1.lastConceived === '2026-11-23', JSON.stringify(W1.litters.map(L => [L.id, L.conceived])));
  E('WOMB_MEMO=null;wombRun(true)'); const W1b = J('wombAll()');
  T('once: the next pass changes nothing (no family dated back twice, the chronicle says it once)', JSON.stringify(W1b.litters) === JSON.stringify(W1.litters) && JSON.stringify(W1b.kids) === JSON.stringify(W1.kids) && J(`journalAll().filter(x=>/^📅/.test(x.title)).length`) === 2);
  /* never dated back: a family paired under today's rule (marked), one paired after Nov 23, one paired before Nov 20 */
  const fx = J(`(()=>{const W=wombAll(),T=JSON.parse(JSON.stringify(W.litters[1])),mk=(id,c,v)=>({...JSON.parse(JSON.stringify(T)),id,conceived:c,...(v?{v}:{}),back:undefined,embryos:T.embryos.map((e,k)=>({...e,id:id+'e'+(k+1),st:'womb',conceived:c,since:dayShift(c,1),preview:{from:dayShift(c,-13)}}))});
    W.litters.push(mk('L7','2026-11-22',3),mk('L8','2026-11-24'),mk('L9','2026-11-18'));set(WOMB_KEY,W);WOMB_MEMO=null;wombRun(true);return wombAll().litters.filter(L=>['L7','L8','L9'].includes(L.id)).map(L=>[L.id,L.conceived,L.back||null,L.embryos.map(e=>e.since).join()]);})()`);
  T('never dated back: a family paired under today\'s rule, one paired after Nov 23, one paired before Nov 20', fx.length === 3 && fx.every(([id, c, bk, sn]) => !bk && c === { L7: '2026-11-22', L8: '2026-11-24', L9: '2026-11-18' }[id] && sn.split(',').every(x => x === ({ L7: '2026-11-23', L8: '2026-11-25', L9: '2026-11-19' }[id]))), JSON.stringify(fx));
  E(`(()=>{const W=wombAll();W.litters=W.litters.filter(L=>!['L7','L8','L9'].includes(L.id));set(WOMB_KEY,W);})()`);
  go('2026-11-23'); E('WOMB_MEMO=null;wombRun(true)');
  /* sync: the dated-back copy beats the old one whichever side the merge starts from */
  w.__OLD = JSON.stringify(OLD);
  const sg = J(`(()=>{const N=wombAll(),O=JSON.parse(window.__OLD),k=X=>JSON.stringify([X.litters.map(L=>[L.id,L.conceived,L.st,L.embryos.map(e=>[e.arch,e.st,e.since])]),(X.kids||[]).map(K=>[K.key,K.born,K.liveFrom])]);return[k(N),k(wombMerge(O,N)),k(wombMerge(N,O))];})()`);
  T('sync: the dated-back family beats the old copy whichever side the merge starts from (its litters, its heir)', sg[1] === sg[0] && sg[2] === sg[0], JSON.stringify(sg.map(x => x.slice(0, 200))));
  /* the pages */
  const H = E('homeHtml()').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), WR = E('wombHtml()').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  T('👪 Family: the family "📅 dated back", the baby\'s life ("Dated back: treated as paired on Mon, Nov 9, the day its two-week preview named (it was paired Sun, Nov 22)"), the heir\'s card ("(Dated back.)", "Joined the desk")', /The Coach × The Historian · 3 babies · since Mon, Nov 9 · 📅 dated back/.test(H) && /Dated back: treated as paired on Mon, Nov 9, the day its two-week preview named \(it was paired Sun, Nov 22\)\. Every game since counts\./.test(H) && /🍼 Rookie · day 0 of 21/.test(H) && /\(Dated back\.\) Mon, Nov 23 Joined the desk\. Its rookie year starts with the first calls it makes\./.test(H), H.slice(0, 1500));
  T('🥚 the lab: the baby\'s note says when and to what day it was dated back', /📅 dated back on 2026-11-23 \(paired 2026-11-22\): treated as paired 2026-11-09/.test(WR), WR.slice(0, 600));
  const PB = J(`(()=>{const P=pubBloodlines();return P&&P.womb&&P.womb.events||null;})()`);
  T('the public page: the birth in the family news, dated the day it happened', Array.isArray(PB) && PB.some(e => e.t === 'born' && e.d === X[0].born.d && e.v === K.key), JSON.stringify(PB));
  w.close();

  /* a second device still holding the old copy does the very same backdate */
  const w2 = boot({ 'd4.voices': snap('2026-11-23'), 'd4.womb': OLD }, at('2026-11-23')); await wait(1500);
  w2.eval('wombRun(true)'); const W3 = JSON.parse(w2.eval('JSON.stringify(wombAll())')); w2.close();
  const kk = X => JSON.stringify([X.litters.filter(L => L.v !== 3).map(L => [L.id, L.conceived, L.st, L.embryos.map(e => [e.arch, e.st])]), (X.kids || []).map(K => [K.key, K.born, K.liveFrom])]);
  T('a second device with the old copy dates back the same families the same way (the same babies, the same heir, the same day)', kk(W3) === kk(W1), kk(W3).slice(0, 300) + ' | ' + kk(W1).slice(0, 300));

  /* a parent with no proven record before it really paired: the family can't be dated back, and its preview says so */
  const WC = WORLD.concat(world(29, { from: '2026-11-16', to: '2026-12-06', per: 12 }).filter(x => x.voice === 'Sim').map(x => ({ ...x, id: `nhl|C${x.game}|${x.date}|Covers|${x.market}`, voice: 'Covers', game: 'C' + x.game })));
  const w3 = boot({ 'd4.voices': snap('2026-11-22', WC) }, at('2026-11-22')); await wait(1500);
  const E3 = s => w3.eval(s), J3 = s => JSON.parse(w3.eval(`JSON.stringify(${s})`));
  E3('wombRun(true)'); E3(`(()=>{const W=wombAll();const L=W.litters[0];W.litters=[{...L,a:'Sim',b:'Covers',v:undefined}];set(WOMB_KEY,W);})()`);
  const before = J3('wombAll().litters[0]');
  w3.__NOW = at('2026-11-23'); w3.__VJ = JSON.stringify(snap('2026-11-23', WC)); E3('TODAY_T=0;set(VOICES_KEY,JSON.parse(window.__VJ));WB_IX=null;WOMB_MEMO=null;WB_NS=null;WB_LT=new Map();wombRun(true);');
  const after = J3('wombAll().litters[0]'), jc = J3(`journalAll().filter(x=>/^📅/.test(x.title)).map(x=>x.title+' | '+x.what)`), WRc = E3('wombHtml()').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  T('a parent with no proven record before the family really paired: it isn\'t dated back (same day, same babies), the chronicle says why in plain words', after.conceived === '2026-11-22' && JSON.stringify(after.embryos.map(e => [e.arch, e.since])) === JSON.stringify(before.embryos.map(e => [e.arch, e.since])) && after.back && !after.back.to && after.back.no[0].v === 'Covers' && jc.length === 1 && /^📅 The Simulator × Covers: can't be dated back \| On Nov 9, the day its two-week preview named, Covers's record wasn't proven yet \((it hadn't made a graded call yet|only \d+ graded calls[^)]*)\), so they couldn't have paired then\. (They paired the first day they could, Nov 22\.|They never could have paired before they did\.) The family stays as it is\.$/.test(jc[0]), JSON.stringify([after.back, jc]));
  T('…and its preview no longer says "it would have cleared every bar": they couldn\'t have paired then', /They couldn't have paired then: Covers didn't have a proven record yet\./.test(WRc) && !/it would have cleared every bar/.test(WRc), (WRc.match(/Two-week preview.{0,300}/) || [''])[0]);
  w3.close();
} catch (e) { out.push('FAIL  crashed — ' + (e && e.stack || e)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); })();
