/* v3.5.19 · Nov 24, 9:42 PM, Chris: "I'd like the characters to be aware of not only who they win with or against etc.. but who they hit
   over unders with or against… who they hit spreads with or against… and I think it should cover all sports for all characters if that
   makes sense… also this character and all characters need a way more vast vocabulary instead of saying the same thing about every game".
   The machine's half: every character's team book (the permanent splits plus the graded calls not rolled in yet), three ways and every
   sport; what each call's note now carries (its own reasons, its book on these teams, the game's own numbers), built from whole reasons;
   the three-way team table in the feed; the board's game numbers; and the book in the machine's own written reads. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 600))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-25T01:00:00Z'), D = '2026-11-24';
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  const E = s => w.eval(s), J = JSON.stringify;
  /* the permanent splits: the Judge in college hoops. Moneyline: 3-1 picking ND, and in ND's games it took the other side 2-0 (h2h);
     spread: 1-2 picking ND; totals: overs in ND games 4-1, unders 0-2. Hockey too: 2-0 picking BOS on the puck line. */
  const S = { ncaab: { Judge: {
      ml: { all: [9, 4, 0], side: {}, role: {}, team: { ND: [3, 1, 0], CMU: [1, 2, 0] }, h2h: { 'CMU-ND': { ND: [3, 1, 0] }, 'ND-UNC': { UNC: [2, 0, 0] } } },
      spread: { all: [5, 5, 0], side: {}, role: {}, team: { ND: [1, 2, 0] }, h2h: { 'CMU-ND': { ND: [1, 2, 0] } } },
      total: { all: [6, 4, 0], side: {}, role: {}, team: { ND: { over: [4, 1, 0], under: [0, 2, 0] }, CMU: { over: [2, 0, 0] } }, h2h: {} } } },
    nhl: { Judge: { spread: { all: [2, 0, 0], side: {}, role: {}, team: { BOS: [2, 0, 0] }, h2h: { 'BOS-TOR': { BOS: [2, 0, 0] } } } } } };
  /* graded calls not rolled in yet count too: one more ND over that hit, one more pick against CMU on the moneyline that hit */
  const call = (id, date, game, market, side, hit, x = {}) => ({ id, sp: 'ncaab', date, game, voice: 'Judge', market, side, price: -110, pick: side, cf: 0.74, graded: hit != null, hit, push: false, ...x });
  const V = [call('r1', '2026-11-22', 'CMU@ND', 'total', 'over', true, { line: 150 }), call('r2', '2026-11-22', 'CMU@ND', 'ml', 'home', true, { pick: 'ND ML' }),
    call('t1', D, 'CMU@ND', 'total', 'over', null, { line: 152.5, pick: 'Over 152.5', f: ['offedge', 'hitot'] }), call('t2', D, 'CMU@ND', 'ml', 'home', null, { pick: 'ND ML', f: ['talent+'] }),
    call('t3', D, 'CMU@ND', 'spread', 'home', null, { pick: 'ND -8.5', line: -8.5, why: 'power says ND by 11.2, the line says 8.5 · still learning these sources (too few graded picks) — the consensus edge counts' })];
  E(`set(SPLIT_KEY,${J(S)});set(VOICES_KEY,${J(V)});delete RO_CACHE[SPLIT_KEY];delete RO_CACHE[VOICES_KEY];TB_C=null;`);
  /* ── the book ── */
  const B = JSON.parse(E(`JSON.stringify(tbBook('Judge','ncaab'))`));
  T('with a team on the moneyline: its picks of that team (3-1 from the splits, plus the unrolled win = 4-1)', J(B.ND.ml.slice(0, 2)) === J([4, 1]), J(B.ND));
  T('…against a team: picking the other side in that team\'s games (UNC over ND 2-0 in the head-to-head, plus ND over CMU unrolled → CMU 1-0 against)', J(B.ND.ml.slice(2)) === J([2, 0]) && J(B.CMU.ml.slice(2)) === J([4, 1]), J([B.ND.ml, B.CMU.ml]));
  T('the spread the same way (ND 1-2 with, CMU 1-2 against)', J(B.ND.ats) === J([1, 2, 0, 0]) && J(B.CMU.ats) === J([0, 0, 1, 2]), J([B.ND.ats, B.CMU.ats]));
  T('overs and unders in a team\'s games (ND overs 4-1 plus the unrolled hit = 5-1, unders 0-2; CMU overs 3-0)', J(B.ND.ou) === J([5, 1, 0, 2]) && J(B.CMU.ou) === J([3, 0, 0, 0]), J([B.ND.ou, B.CMU.ou]));
  T('every sport (its hockey book: 2-0 with BOS on the puck line, TOR 2-0 against)', J(JSON.parse(E(`JSON.stringify(tbBook('Judge','nhl'))`)).BOS.ats) === J([2, 0, 0, 0]) && J(JSON.parse(E(`JSON.stringify(tbBook('Judge','nhl'))`)).TOR.ats) === J([0, 0, 2, 0]));
  const cells = JSON.parse(E(`JSON.stringify([tbCellsFor(get(VOICES_KEY,[]).find(c=>c.id==='t1')),tbCellsFor(get(VOICES_KEY,[]).find(c=>c.id==='t2'))])`));
  T('a call reads its own lines: an over → its overs in both teams\' games; a side → with its team, against the other', J(cells[0]) === J([{ t: 'CMU', mk: 'ou', rel: 'over', w: 3, l: 0 }, { t: 'ND', mk: 'ou', rel: 'over', w: 5, l: 1 }]) && J(cells[1]) === J([{ t: 'ND', mk: 'ml', rel: 'with', w: 4, l: 1 }, { t: 'CMU', mk: 'ml', rel: 'vs', w: 4, l: 1 }]), J(cells));
  /* ── the game's own numbers ── */
  E(`set('d4.seasonstats',{ncaab:{d:'${D}',teams:{ND:{w:5,l:1,gp:6,pf:480,pa:400},CMU:{w:2,l:4,gp:6,pf:430,pa:450}}}});delete RO_CACHE['d4.seasonstats'];
    set(LS.allfinals,{'ncaab:ND@UNC':{sport:'ncaab',d:'2026-11-10',a:80,h:70},'ncaab:IU@ND':{sport:'ncaab',d:'2026-11-12',a:71,h:88},'ncaab:ND@DUKE':{sport:'ncaab',d:'2026-11-15',a:79,h:81},'ncaab:PUR@ND':{sport:'ncaab',d:'2026-11-18',a:70,h:90},'ncaab:ND@MSU':{sport:'ncaab',d:'2026-11-20',a:84,h:72},
      'ncaab:CMU@OHIO':{sport:'ncaab',d:'2026-11-10',a:66,h:70},'ncaab:BALL@CMU':{sport:'ncaab',d:'2026-11-13',a:80,h:76},'ncaab:CMU@TOL':{sport:'ncaab',d:'2026-11-16',a:75,h:85},'ncaab:WMU@CMU':{sport:'ncaab',d:'2026-11-19',a:64,h:69}});ALLF_C=null;FAC_IDX=null;PUB_GF=null;`);
  const gf = E(`pubGameFacts('ncaab','CMU@ND',152.5)`);
  T('the game\'s numbers: each team\'s scoring for and against a game, records, the last five, and how often their games cleared 152.5',
    /avg CMU 71\.7-75 ND 80-66\.7/.test(gf) && /rec CMU 2-4 ND 5-1/.test(gf) && /last5 CMU 1-3 ND 4-1/.test(gf) && /past 152\.5: CMU 2\/4 ND 4\/5/.test(gf), gf);
  T('…a side gets no total line in them (no "past")', !/past/.test(E(`pubGameFacts('ncaab','CMU@ND',null)`)));
  /* ── the notes ── */
  const nT = E(`pubCallNote(get(VOICES_KEY,[]).find(c=>c.id==='t1'),{max:320,gf:pubGameFacts('ncaab','CMU@ND',152.5)})`);
  T('a call\'s note: its own reasons, then its book on these teams, then the game\'s numbers', /^both offenses outclass the defenses \(Scout\) · high total · me on ND over 5-1/.test(nT) && /avg CMU/.test(nT) && /past 152\.5/.test(nT), nT);
  const nS = E(`pubCallNote(get(VOICES_KEY,[]).find(c=>c.id==='t3'),{max:240})`);
  T('the desk\'s housekeeping never reaches a note ("still learning these sources")', /power says ND by 11\.2/.test(nS) && !/still learning/.test(nS), nS);
  const nCut = E(`pubCallNote({...get(VOICES_KEY,[]).find(c=>c.id==='t1'),why:'his total 158.2 vs 152.5 · +8.6 RICE as a dog: 2-1 outright · DRatings: 154.6 total — 54% on 612'},{max:60,tb:false})`);
  T('a note is cut between reasons, never mid-word (Nov 24: "as a dog: 2-", "the line s")', nCut === 'his total 158.2 vs 152.5 · +8.6 RICE as a dog: 2-1 outright', nCut);
  const nBoard = E(`pubCallNote(get(VOICES_KEY,[]).find(c=>c.id==='t1'),{max:180,tbN:3,tbGap:2})`), nThin = E(`pubCallNote({...get(VOICES_KEY,[]).find(c=>c.id==='t1'),voice:'Scout'},{max:180,tbN:3,tbGap:2})`);
  T('on the board a call carries its book only when it\'s lopsided (3+ calls, 2+ apart); a character with no book on them carries none', /me on ND over 5-1/.test(nBoard) && !/\bme (on|with|vs)\b/.test(nThin), J([nBoard, nThin]));
  /* ── the feed's team table ── */
  const pc = JSON.parse(E(`(()=>{const o=isOfficial;isOfficial=c=>c.id==='t1';PUB_CHAR_MEMO=null;try{return JSON.stringify((pubCharacters0(get(VOICES_KEY,[]),'${D}').find(c=>c.v==='Judge'))||null);}finally{isOfficial=o;}})()`));
  const tm = pc && pc.teams || [];
  T('the team table: today\'s teams first (its over on CMU@ND is on the card), every sport, three ways', tm.length >= 3 && tm[0].now === 1 && tm[1].now === 1 && tm.some(t => t.sp === 'nhl' && t.team === 'BOS') && J(tm.find(t => t.team === 'ND').ou) === J([5, 1, 0, 2]) && J(tm.find(t => t.team === 'ND').ml) === J([4, 1, 2, 0]), J(tm));
  const bos = tm.find(t => t.team === 'BOS' && t.sp === 'nhl') || {};
  T('…an empty bet type is left off, and older copies of the app still get with/against (moneyline + spread)', J(bos.ats) === J([2, 0, 0, 0]) && bos.ml === undefined && bos.ou === undefined && J(tm.find(t => t.team === 'ND').for) === J({ w: 5, l: 3 }) && J(tm.find(t => t.team === 'ND').vs) === J({ w: 2, l: 0 }), J(bos));
  const pk = (pc.picks || []).find(p => p.pick === 'Over 152.5');
  T('…and its pick carries the richer note (its book, the game\'s numbers)', pk && /me on ND over 5-1/.test(pk.note) && /avg CMU/.test(pk.note), pk && pk.note);
  /* ── the machine's own written read ── */
  const R = JSON.parse(E(`(()=>{const c=get(VOICES_KEY,[]).find(x=>x.id==='t1');try{return JSON.stringify(charRead('Judge',{sp:'ncaab',game:'CMU@ND',m:'total',sd:'over',pick:'Over 152.5',price:-110,line:152.5,date:'${D}'},c));}catch(e){return JSON.stringify({err:String(e)});}})()`));
  T('the machine\'s written read says its book out loud (its ND overs)', R && Array.isArray(R.proof) && R.proof.some(s => /over/i.test(s) && /5-1|five of six|5 of 6/.test(s) && /Notre Dame|ND/.test(s)), J(R && R.proof));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 3000);
