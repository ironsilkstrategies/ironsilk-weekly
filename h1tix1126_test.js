/* v3.5.32 · "It's not reading my 1st half scores" — tickets 1019113933 / 1019115673 / 1019116461 (Nov 26).
   (1) "823 Miami Florida pk -115 for 1ST HALF" was skipped (and mislabeled a moneyline); (2) "112 Buffalo Bills -150 for 1ST HALF",
   a real 1H moneyline, was refused — and the grader would have read "BUF 1H ML" as a full-game ML; (3) NCAAB's first half was
   computed as linescore 0+1 — both halves, the whole regulation score — and football's as soon as the 2nd quarter began. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const H = (no, legs) => `Ticket Number:\n${no}\nAccepted Date:\n11/26/26\nAmount:\n$1.00\nStatus:\nPending\nTo win:\n$90.00\nType:\nParlay\nDescription:\n` + legs.map(l => l + ' | 11/26/2026 07:00:00 PM (EST) | Pending').join('\n') + '\n';
const T1 = H(1019113933, [
  'Basketball - NCAA - Arkansas vs Duke - Parlay | 805 Arkansas +3 -115 for 1ST HALF',
  'Basketball - NCAA - Arkansas vs Duke - Parlay | 805 Arkansas/Duke over 69½ -110 for 1ST HALF',
  'Basketball - NCAA - Miami Florida vs Kansas - Parlay | 823 Miami Florida pk -115 for 1ST HALF',
  'Basketball - NCAA - Utah State vs Gonzaga - Parlay | 811 Utah State +½ -110 for 1ST HALF',
  "Basketball - NCAA - St. John's vs Baylor - Parlay | 815 St. John's -½ -115 for 1ST HALF",
  'Basketball - NCAA - DePaul vs Pacific - Parlay | 807 DePaul pk -110 for 1ST HALF',
  'Basketball - NCAA - DePaul vs Pacific - Parlay | 808 Pacific -4 -110 for GAME']);
const T2 = H(1019115673, [
  'Football - NFL - Kansas City Chiefs vs Buffalo Bills - Parlay | 111 Kansas City Chiefs/Buffalo Bills over 23 -105 for 1ST HALF',
  'Football - NFL - Kansas City Chiefs vs Buffalo Bills - Parlay | 112 Buffalo Bills -150 for 1ST HALF',
  'Football - NFL - Kansas City Chiefs vs Buffalo Bills - Parlay | 112 Buffalo Bills -175 for GAME']);
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) { x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  w.__T = T1; const r1 = w.eval('parseMyTicketText(window.__T)');
  const L1 = w.eval(`(get(LS.locked,[])||[]).find(t=>t.id==='ext1019113933').legs.map(l=>l.pick)`);
  T('NCAAB 1H ticket: every leg read, nothing skipped', r1.ok && r1.legCount === 7 && !r1.skipped.length, JSON.stringify([r1.legCount, r1.skipped]));
  T('"Miami Florida pk" → a 1H pick\'em (+0); "DePaul pk" too', L1.some(p => / 1H \+0$/.test(p) && /^MIA|^MIAMI|^UM/.test(p)) && L1.filter(p => / 1H \+0$/.test(p)).length === 2, JSON.stringify(L1));
  T('1H spreads / total / half points kept as 1H', L1.includes('1H Over 69.5') && L1.some(p => / 1H \+3$/.test(p)) && L1.some(p => / 1H \+0\.5$/.test(p)) && L1.some(p => / 1H -0\.5$/.test(p)) && L1.some(p => / -4$/.test(p) && !/1H/.test(p)), JSON.stringify(L1));
  w.__T = T2; const r2 = w.eval('parseMyTicketText(window.__T)');
  const L2 = w.eval(`(get(LS.locked,[])||[]).find(t=>t.id==='ext1019115673').legs.map(l=>l.pick)`);
  T('NFL: "Buffalo Bills -150 for 1ST HALF" → BUF 1H ML (and the full-game ML stays BUF ML)', r2.ok && r2.legCount === 3 && L2.includes('BUF 1H ML') && L2.includes('BUF ML') && L2.includes('1H Over 23'), JSON.stringify([r2.skipped, L2]));
  /* grading */
  w.eval('window.__R=null;resolveLeg=function(){return window.__R;}');
  const g = (leg, R) => { w.__R = R; w.__L = leg; return w.eval('gradeLeg(window.__L,"2026-11-26")'); };
  const nfl = { sport: 'nfl', game: 'KC@BUF', gameDate: '2026-11-26' };
  let x = g({ ...nfl, pick: 'BUF 1H ML' }, { a: 24, h: 20, h1a: 7, h1h: 14, live: false });
  T('BUF 1H ML wins on the halftime lead even though BUF lost the game', x.hit === true, JSON.stringify(x));
  x = g({ ...nfl, pick: 'BUF 1H ML' }, { a: 30, h: 20, h1a: 10, h1h: 10, live: false });
  T('a tie at the half pushes', x.hit === null && x.push === true, JSON.stringify(x));
  x = g({ ...nfl, pick: '1H Over 23' }, { a: 10, h: 17, h1a: 10, h1h: 17, live: true, period: 2 });
  T('live in the 2nd quarter: the 1H total is held, not graded', x.hit === null && !x.push, JSON.stringify(x));
  x = g({ ...nfl, pick: '1H Over 23' }, { a: 10, h: 17, h1a: 10, h1h: 17, live: true, period: 3 });
  T('3rd quarter: the 1H total grades off the half (27 > 23)', x.hit === true, JSON.stringify(x));
  const cbb = { sport: 'ncaab', game: 'MIA@KU', gameDate: '2026-11-26' };
  x = g({ ...cbb, pick: 'MIA 1H +0' }, { a: 70, h: 80, h1a: 38, h1h: 33, live: true, period: 2 });
  T('NCAAB pick\'em grades once the 2nd half starts (period 2)', x.hit === true, JSON.stringify(x));
  x = g({ ...cbb, pick: 'MIA 1H +0' }, { a: 30, h: 30, h1a: 30, h1h: 30, live: false });
  T('pick\'em tied at the half pushes', x.push === true, JSON.stringify(x));
  /* the half score itself */
  const half = (sp, state, st, la, lh) => { w.__a = [sp, state, st, la, lh]; return w.eval('mgHalf(...window.__a)'); };
  let hf = half('ncaab', 'post', { period: 2 }, [38, 32], [33, 47]);
  T('NCAAB first half = the first HALF (38–33), not both halves added (70–80)', hf.h1a === 38 && hf.h1h === 33, JSON.stringify(hf));
  hf = half('ncaab', 'in', { period: 1, type: { name: 'STATUS_HALFTIME' } }, [38], [33]);
  T('NCAAB at halftime: the half is in', hf.h1a === 38 && hf.h1h === 33 && hf.half, JSON.stringify(hf));
  hf = half('nfl', 'in', { period: 2, type: { name: 'STATUS_IN_PROGRESS' } }, [7, 3], [7, 0]);
  T('NFL in the 2nd quarter: no halftime score yet', hf.h1a == null, JSON.stringify(hf));
  hf = half('nfl', 'in', { period: 3 }, [7, 3, 0], [7, 7, 0]);
  T('NFL 3rd quarter: Q1+Q2 (10–14)', hf.h1a === 10 && hf.h1h === 14, JSON.stringify(hf));
  /* a stored NCAAB final saved with the old (whole-game) half score gets rewritten */
  w.eval(`set(LS.allfinals,{[finalsKey('ncaab','MIA@KU')]:{sport:'ncaab',d:'2026-11-26',a:70,h:80,h1a:70,h1h:80,st:'2026-11-27T00:00:00Z'}})`);
  w.eval(`mgWriteFinals('ncaab',{[mgKey('ncaab','MIA@KU')]:[{state:'post',date:'2026-11-26',start:'2026-11-27T00:00:00Z',a:70,h:80,h1a:38,h1h:33}]})`);
  const F = w.eval(`allFinals()[finalsKey('ncaab','MIA@KU')]`);
  T('a final stored with the wrong half score is repaired', F.h1a === 38 && F.h1h === 33, JSON.stringify(F));
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 2500);
