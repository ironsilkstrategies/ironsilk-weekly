/* v3.5.21 · Nov 25, 12:22 AM, Chris: "My calibration machine is only doing baseball for full calibration?!"
   The basketball pages' Grades screen read the MLB archive on every tab, hockey and football had no Calibration at all, and the
   Brain (the calibration machine every other sport runs on) weighed the sim and the line by each one's miss alone and applied team
   memory that, replayed, made the miss bigger in every sport. Now: weights against the line from what each witness adds (margins
   and totals apart, seeded from each sport's archive), team memory and a league drift scored on lock-time numbers and switched on
   only when they shrink the miss, and a Calibration screen for every sport. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 900))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-25T18:00:00Z');
const errs = [];
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1');
  x.addEventListener('error', e => errs.push(String(e.message || e))); } }).window;
/* a seeded random stream, so every run sees the same season */
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const TEAMS = ['BOS', 'NY', 'MIA', 'CHI', 'DEN', 'LAL', 'GS', 'PHX', 'DAL', 'MIL'];
/* a season of games in pairs: the same line and the same result, the sim off the line by +x in one and −x in the other — so its
   disagreements with the line say nothing about the result (simInfo 0), or (simInfo 1) its margin lands right on the result's */
function season(nDays, perDay, simInfo, startDay) {
  const arc = {}; let d0 = Date.parse((startDay || '2026-10-01') + 'T12:00:00Z');
  for (let i = 0; i < nDays; i++) { const d = new Date(d0 + i * 864e5).toISOString().slice(0, 10); const rows = [];
    let mT, mM, actM, actT, dM, dT;
    for (let j = 0; j < perDay; j++) { const a = TEAMS[(i + j) % 10], h = TEAMS[(i + j + 3) % 10]; if (a === h) continue;
      if (j % 2 === 0) { mT = 224 + 8 * gauss(); mM = 6 * gauss(); actM = Math.round(mM + 11 * gauss()); actT = Math.round(mT + 16 * gauss()); dM = 5 * gauss(); dT = 7 * gauss(); }
      else { dM = -dM; dT = -dT; }
      const sM = simInfo ? actM + 0.5 * gauss() : mM + dM, sT = mT + dT;
      const ah = Math.round((actT + actM) / 2), aa = actT - ah;
      rows.push({ gid: 'g' + i + '_' + j, game: a + '@' + h, picks: [], judge: { a: +((mT - mM) / 2).toFixed(1), h: +((mT + mM) / 2).toFixed(1), w: [{ src: 'sim', a: +((sT - sM) / 2).toFixed(2), h: +((sT + sM) / 2).toFixed(2) }, { src: 'market', a: +((mT - mM) / 2).toFixed(2), h: +((mT + mM) / 2).toFixed(2) }], tMar: 0, tTot: 0, money: 0, box: null }, final: { a: aa, h: ah } }); }
    arc[d] = { rows }; }
  return arc;
}
setTimeout(() => { try {
  const E = s => w.eval(s), J = JSON.stringify, P = s => JSON.parse(E(s));
  /* ── 1 · the weights against the line ── */
  T('no graded games: the sim starts at 30% of the say against the line', Math.abs(E(`brainCvW({},'mar','sim')`) - 0.3) < 1e-9 && Math.abs(E(`brainCvW({cv:{mar:{}}},'tot','sim')`) - 0.3) < 1e-9);
  const noise = season(40, 8, 0), info = season(40, 8, 1);
  const learnAll = arc => E(`(()=>{const b={src:{},team:{},vol:{n:0,v:0},trend:{n:0,hit:0},money:{n:0,hit:0},box:{},log:[]};const A=${J(arc)};
    Object.keys(A).sort().forEach(d=>A[d].rows.forEach(r=>brainCvLearn(b,r.judge.w,r.final.a,r.final.h)));return JSON.stringify({m:brainCvW(b,'mar','sim'),t:brainCvW(b,'tot','sim'),n:b.cv.mar.sim.n});})()`);
  const wn = JSON.parse(learnAll(noise)), wi = JSON.parse(learnAll(info));
  T('a sim whose disagreements with the line say nothing about the result: its say falls toward nothing (margins and totals)', wn.m < 0.12 && wn.t < 0.12, J(wn));
  T('a sim that reads what the line misses: it earns most of the margin say (the totals stay with the line, where it adds nothing)', wi.m > 0.6 && wi.t < 0.12, J(wi));
  T('…recent games count most (about a 100-game memory)', wi.n > 90 && wi.n < 101, J(wi));
  T('a handful of lucky games can\'t hand a witness the game: a 300% least-squares share is held to 100% and pulled to the prior by n/(n+30)',
    Math.abs(E(`brainCvW({cv:{mar:{pred:{n:3,num:30,den:10}}}},'mar','pred')`) - (3 / 33 * 1 + 30 / 33 * 0.3)) < 1e-9);
  /* ── 2 · the Judge combines margins and totals with those shares ── */
  E(`window.__AD={key:g=>g.away.abbr+'@'+g.home.abbr,lines:()=>[],flat:()=>false,sim:s=>s?{a:s.a,h:s.h}:null,trends:()=>[],cons:()=>[],snap:x=>Math.round(x),market:()=>({a:100,h:106}),
    box:(A,H)=>({away:{p:'',pts:Math.round(A)},home:{p:'',pts:Math.round(H)}}),boxCols:[],boxStats:[]};brainAdapter=function(){return window.__AD;};predFor=function(){return null;};`);
  const brain = (extra) => E(`set(BRAIN_KEY,{nba:Object.assign({src:{},team:{},vol:{n:0,v:0},trend:{n:0,hit:0},money:{n:0,hit:0},box:{},log:[]},${J(extra || {})})});delete RO_CACHE[BRAIN_KEY];`);
  const g = { id: 'x1', away: { abbr: 'BOS' }, home: { abbr: 'NY' } }, s = { a: 110, h: 104 };
  const judge = () => P(`JSON.stringify(brainJudge(${J(g)},${J(s)},'nba'))`);
  brain({ cv: { mar: { sim: { n: 100, num: 0, den: 900 } }, tot: { sim: { n: 100, num: 900, den: 900 } }, seeded: 1 } });
  let j = judge(); const wm = 30 / 130 * 0.3, wt = 100 / 130 * 1 + 30 / 130 * 0.3;
  const expM = 6 + wm * (-6 - 6), expT = 206 + wt * (214 - 206);
  T('the Judge weighs margins and totals apart: margin mostly the line\'s, total mostly the sim\'s, exactly by the learned shares',
    Math.abs((j.h - j.a) - expM) < 0.11 && Math.abs((j.h + j.a) - expT) < 0.11 && Math.abs(j.witnesses.find(x => x.src === 'market').shm - (1 - wm)) < 1e-9 && Math.abs(j.witnesses.find(x => x.src === 'sim').sht - wt) < 1e-9, J({ a: j.a, h: j.h, expM, expT }));
  T('…the pre-correction projection is kept (j0) and nothing else moved it', Math.abs(j.j0.a - j.a) < 0.06 && Math.abs(j.j0.h - j.h) < 0.06 && j.on.mem === 0 && j.on.dr === 0, J(j.j0));
  const why = E(`brainBlock(${J(g)},${J(s)},'nba')`);
  T('…and the "why" panel shows each witness\'s margin and total weight', /Sim: .*weight margin \d+% · total \d+%/.test(why.replace(/<[^>]+>/g, ' ')), why.replace(/<[^>]+>/g, ' ').slice(0, 400));
  /* ── 3 · team memory and the drift: worked out every game, applied only through their gate ── */
  const mem = { BOS: { off: { n: 10, r: 4 }, def: { n: 10, r: -2 } }, NY: { off: { n: 10, r: 1 }, def: { n: 10, r: 3 } } };
  brain({ team: mem, cv: { mar: {}, tot: {}, seeded: 1 }, lg: { n: 200, r: 6 } });
  j = judge();
  const mA = (4 * 10 / 16 + 3 * 10 / 16) / 2, mH = (1 * 10 / 16 - 2 * 10 / 16) / 2;
  T('gate closed: team memory is worked out (what it would add) but not applied', Math.abs(j.memRaw.a - mA) < 0.01 && Math.abs(j.memRaw.h - mH) < 0.01 && j.mem.a === 0 && j.mem.h === 0 && Math.abs(j.a - j.j0.a) < 0.06, J({ memRaw: j.memRaw, mem: j.mem, a: j.a, j0: j.j0 }));
  T('…the league drift too: half the shrunk lean to each side, capped (NBA ±4 a game), not applied', Math.abs(j.dr - Math.min(4, 6 * 200 / 240) / 2) < 0.01 && j.on.dr === 0, J(j.dr));
  brain({ team: mem, cv: { mar: {}, tot: {}, seeded: 1 }, lg: { n: 200, r: 6 }, sh: { mem: { n: 80, s: -40, q: 60, on: 1, N: 80 }, dr: { n: 80, s: -20, q: 40, on: 1, N: 80 } } });
  j = judge();
  T('gate open: memory and drift are applied on top of the weighed witnesses', Math.abs(j.a - (j.j0.a + mA + j.dr)) < 0.06 && Math.abs(j.h - (j.j0.h + mH + j.dr)) < 0.06 && j.on.mem === 1 && j.on.dr === 1, J({ a: j.a, j0: j.j0, dr: j.dr }));
  T('MLB never gets the league drift (its sim corrects its own)', E(`brainDrift({lg:{n:300,r:2}},'mlb')`) === 0);
  const lk = P(`JSON.stringify(brainLockable(brainJudge(${J(g)},${J(s)},'nba')))`);
  T('the locked ruling carries what each correction would add and whether it was on', lk.j0 && lk.mem && Math.abs(lk.mem.a - mA) < 0.01 && Math.abs(lk.dr - j.dr) < 0.01 && lk.on.mem === 1, J(lk));
  /* ── 4 · grading: memory learns the miss before any memory; each correction is scored with vs without ── */
  const fresh = () => ({ src: {}, team: {}, vol: { n: 0, v: 0 }, trend: { n: 0, hit: 0 }, money: { n: 0, hit: 0 }, box: {}, log: [] });
  let b = P(`(()=>{const b=${J(fresh())};brainLearnOne('nba',b,'BOS@NY',{a:105,h:100,w:[],j0:{a:100,h:100},mem:{a:5,h:0},dr:0,on:{mem:1,dr:0}},100,100,null);return JSON.stringify(b);})()`);
  T('memory learns what the projection missed BEFORE memory (it used to chase its own correction): a dead-on base teaches nothing', b.team.BOS.off.r === 0 && b.team.NY.def.r === 0, J(b.team));
  T('…and the old rulings (no frozen base) still learn the old way', P(`(()=>{const b=${J(fresh())};brainLearnOne('nba',b,'BOS@NY',{a:105,h:100,w:[]},100,100,null);return JSON.stringify(b.team.BOS.off);})()`).r === -5);
  T('…the game scored team memory: with it the miss was 5 bigger (margin 5 off, total 5 off)', b.sh && b.sh.mem && b.sh.mem.N === 1 && Math.abs(b.sh.mem.s - 5) < 1e-9, J(b.sh));
  const gate = (k, games) => P(`(()=>{const b=${J(fresh())};${J(games)}.forEach(([e0,e1])=>brainGateAdd(b,'${k}',e1-e0));return JSON.stringify(b.sh['${k}']);})()`);
  const helps = Array.from({ length: 80 }, (_, i) => [10, 10 - 0.6 + (i % 5 - 2) * 0.4]);
  let o = gate('mem', helps.slice(0, 59));
  T('a correction can\'t switch on before 60 scored games, however good it looks', o.on === 0 && o.N === 59, J(o));
  o = gate('mem', helps);
  T('…after 60, shrinking the miss with z ≥ 1.5 switches it on', o.on === 1 && o.z >= 1.5, J(o));
  o = gate('mem', helps.concat(Array.from({ length: 6 }, () => [10, 11])));
  T('…a few bad games don\'t flip it back (off again only under z 0.5)', o.on === 1, J(o));
  o = gate('mem', Array.from({ length: 120 }, (_, i) => [10, 10.3 + (i % 3 - 1) * 0.2]));
  T('one that makes the miss bigger never switches on', o.on === 0 && o.z < 0, J(o));
  b = P(`(()=>{const b=${J(fresh())};for(let i=0;i<50;i++)brainLearnOne('nba',b,'BOS@NY',{a:110,h:110,w:[],j0:{a:110,h:110},mem:{a:0,h:0},dr:0,on:{mem:0,dr:0}},105,107,null);return JSON.stringify(b.lg);})()`);
  T('the league drift learns the totals\' lean before any correction (8 too high → −8)', b.n === 50 && Math.abs(b.r + 8) < 1e-6, J(b));
  /* ── 5 · seeding: everything already graded ── */
  E(`set('d4.nbaarc',${J(info)});delete RO_CACHE['d4.nbaarc'];set(BRAIN_KEY,{});delete RO_CACHE[BRAIN_KEY];`);
  const sd = P(`(()=>{const b=brainGet('nba');const s1=brainCvSeed('nba',b);const s2=brainCvSeed('nba',b);return JSON.stringify({s1,s2,from:b.cv.from,m:brainCvW(b,'mar','sim'),lg:b.lg});})()`);
  T('first run: the weights and the drift learn from every game already in the archive, once', sd.s1 === true && sd.s2 === false && sd.from === 320 && sd.m > 0.6 && sd.lg.n === 320, J(sd));
  E(`set(BRAIN_KEY,{});delete RO_CACHE[BRAIN_KEY];brainLearn('nba');`);
  T('…brainLearn seeds a sport the first time it runs', P(`JSON.stringify(brainGetRO('nba').cv||{})`).seeded === 1);
  const empty = P(`(()=>{const b={src:{},team:{},vol:{n:0,v:0},trend:{n:0,hit:0},money:{n:0,hit:0},box:{},log:[]};const s=brainCvSeed('ncaab',b);return JSON.stringify({s,cv:b.cv||null});})()`);
  T('…but nothing graded yet (or the archive not loaded yet) isn\'t marked done: it tries again next time', empty.s === false && empty.cv === null, J(empty));
  const nfl = { 'w2026-8': { rows: [{ id: 'f1', game: 'DAL@NYG', v: 2, pickedAt: Date.parse('2026-10-26T17:00:00Z'), judge: { a: 24, h: 21, w: [{ src: 'market', a: 23, h: 21 }, { src: 'sim', a: 26, h: 20 }] } }], finals: { f1: { a: 27, h: 17 } } },
    '2026-09-27': { rows: [{ id: 'f0', game: 'KC@LV', v: 2, judge: { a: 27, h: 20, w: [{ src: 'market', a: 26, h: 20 }] } }], finals: { f0: { a: 31, h: 10 } } } };
  E(`set(LS.nflarc,${J(nfl)});delete RO_CACHE[LS.nflarc];`);
  const gr = P(`JSON.stringify(brainGraded('nfl'))`);
  T('football\'s archive (old dated days and the newer week keys) reads as graded rulings, oldest first, labeled by week', gr.length === 2 && gr[0].game === 'KC@LV' && gr[1].lab === 'Week 8' && gr[1].aa === 27, J(gr.map(x => [x.d, x.lab, x.game])));
  /* ── 6 · the screens ── */
  E(`set('d4.nbaarc',${J(noise)});delete RO_CACHE['d4.nbaarc'];set(BRAIN_KEY,{});delete RO_CACHE[BRAIN_KEY];brainLearn('nba');`);
  E(`(()=>{const A=get('d4.nbaarc',{});const d=Object.keys(A).sort().pop();A[d].rows[0].picks=[{m:'spread',side:'home',line:-3,price:-110,p:0.72,ev:30},{m:'total',side:'over',line:220,price:-110,p:0.66,ev:20}];set('d4.nbaarc',A);delete RO_CACHE['d4.nbaarc'];})()`);
  E(`set(LS.arc,{'2026-09-20':{rows:[{id:'m1',a:'NYY',h:'BOS',side:'NYY',sp:0.6,pa:4,ph:3,pt:7,edge:1}],finals:{m1:{a:5,h:2}},locked:true}});delete RO_CACHE[LS.arc];`);
  const gb = w.document.getElementById('gradeBody'), gn = w.document.getElementById('gradeNav');
  E(`SPGRADE_TAB='record';renderGrades();`);
  T('the NBA page\'s Grades screen is basketball\'s now: its record and a Calibration tab, not baseball\'s five tabs', /NBA record/.test(gn.innerHTML) && /Calibration/.test(gn.innerHTML) && !/Sim vs Book|📋 Ledger|History/.test(gn.innerHTML) && /System picks — the sim's best-EV side/.test(gb.innerHTML) && !/straight sides|Total runs/.test(gb.innerHTML), gn.innerHTML + ' | ' + gb.innerHTML.slice(0, 300));
  const txt = () => gb.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  E(`SPGRADE_TAB='calib';SPCAL_MODE='calib';renderGrades();`);
  T('Calibration → Corrections: the weights against the line, the season replayed old vs new, the league drift, team memory, the daily miss',
    /How the Judge weighs the sim against the line/.test(txt()) && /Margins: the sim gets \d+% of the say/.test(txt()) && /Replayed game by game .* 320 games: margin miss [\d.]+ with the old weights → [\d.]+ with these/.test(txt()) && /League drift · every graded game/.test(txt()) && /Team memory/.test(txt()) && /Daily average miss/.test(txt()) && !/TEAM RUN BIAS|runs over/i.test(txt()), txt().slice(0, 900));
  const rp = P(`JSON.stringify(spCalReplay('nba',spCalRows('nba')))`);
  T('…on a season where the sim adds nothing, the replay shows the new weights miss less than the old', rp.n === 320 && rp.nu.m < rp.old.m && rp.nu.t < rp.old.t, J(rp));
  T('…the gates read OFF, not yet scored (no ruling locked with this version yet)', /OFF · not scored yet/.test(txt()));
  E(`SPCAL_MODE='conf';renderGrades();`);
  T('Calibration → Confidence: the characters\' % against what happened (this sport), and the sim\'s own % from its system picks', /The characters' % — did it come true\?/.test(txt()) && /The sim's own %/.test(txt()), txt().slice(0, 500));
  E(`SPCAL_MODE='learn';renderGrades();`);
  T('Calibration → Learned bias: team by team, projected minus actual, and what memory would add (shown as not applied)', /Team bias/.test(txt()) && /Scores/.test(txt()) && /Allows/.test(txt()) && /is OFF right now/.test(txt()) && /<td>BOS<\/td>/.test(gb.innerHTML), txt().slice(0, 500));
  E(`SPCAL_MODE='book';renderGrades();`);
  T('Calibration → System vs Book: the Judge, the line and the sim alone, margin and total', /System vs the book/.test(txt()) && /Judge [\d.]+ [\d.]+/.test(txt()) && /The line [\d.]+ [\d.]+/.test(txt()) && /Sim alone [\d.]+ [\d.]+/.test(txt()), txt().slice(0, 500));
  const nflh = E(`SPCAL_MODE='calib';spCalHtml('nfl')`).replace(/<[^>]+>/g, ' ');
  T('football\'s Calibration reads its own archive, weekly', /League drift/.test(nflh) && /Weekly average miss/.test(nflh) && /Week 8/.test(nflh), nflh.slice(0, 400));
  /* the basketball archive's missing days: filled from the engine's own results ledger, by game id, teams checked */
  const fill = P(`(()=>{const C={res:'d4.nbares'};set('d4.nbares',{'401':['2026-11-04','BOS','NY',101,99,0,50,48,0],'402':['2026-11-04','MIA','CHI',90,95,0,44,49,0]});delete RO_CACHE['d4.nbares'];
    const arc={'2026-11-04':{rows:[{gid:'401',game:'BOS@NY',picks:[]},{gid:'402',game:'DEN@CHI',picks:[]},{gid:'403',game:'GS@LAL',picks:[]},{gid:'404',game:'PHX@DAL',picks:[],final:{a:1,h:2}}]}};
    const n=bbArchiveFromRes(C,arc);return JSON.stringify({n,rows:arc['2026-11-04'].rows});})()`);
  T('days the archive never got finals for are filled from the results ledger (by game id, only when the teams match)', fill.n === 1 && fill.rows[0].final.a === 101 && fill.rows[0].final.h1h === 48 && fill.rows[0].fr === 1 && !fill.rows[1].final && !fill.rows[2].final && fill.rows[3].final.a === 1, J(fill));
  const nhlSrc = fs.readFileSync(path.join(W, 'nhl-engine.js'), 'utf8'), fbSrc = fs.readFileSync(path.join(W, 'football-engine.js'), 'utf8');
  T('the NHL and football record screens carry the Calibration tab', /spGradeNav\('nhl'/.test(nhlSrc) && /spCalHtml\('nhl'\)/.test(nhlSrc) && /spGradeNav\(sport/.test(fbSrc) && /spCalHtml\(sport\)/.test(fbSrc));
  E(`ACTIVE_SPORT='mlb';GRADETAB='calib';CALIB_MODE='calib';renderGrades();`);
  T('MLB keeps its own Calibration screen', /Corrections/.test(gn.innerHTML + gb.innerHTML) && /Results/.test(gn.innerHTML) && /Ledger/.test(gn.innerHTML), gn.innerHTML.slice(0, 300));
  T('no uncaught errors', !errs.length, errs.join(' | '));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 3000);
