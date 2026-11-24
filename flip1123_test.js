/* v3.5.12 · Nov 23, 10:19 PM, Chris: "Why didn't these get graded?! I don't want this to be an issue going forward." NEV ML −325 and
   Over 142.5 (Nevada–San Francisco, a neutral-site tournament game at Acrisure Arena) sat ungraded all night. The card, the characters'
   calls and their score calls were made on NEV@SF (gid 401911457); ESPN then re-filed the game as SF@NEV, and its final went into the
   store that way, so nothing keyed NEV@SF ever found it. Now a final filed the other way round on the same day answers, its scores
   swapped back to the way the pick reads its game — and nothing else changes (other days never match; a game on file as asked wins). */
const fs = require('fs'); const path = require('path'); const W = '/home/claude/work'; const { JSDOM, VirtualConsole } = require('jsdom');
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
let html = fs.readFileSync(path.join(W, 'ncaab.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-24T04:19:00Z');   /* Nov 23, 10:19 PM CT */
const errs = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(String(e && e.message || e)));
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/ncaab.html', pretendToBeVisual: true, virtualConsole: vc, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD;
  x.__NO_GRADELOOP__ = true; x.__NO_BACKFILL__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('{}') });
  x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.prompt = () => null; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  const E = s => w.eval(s), J = JSON.stringify, e0 = errs.length;
  T('the clock reads Nov 23 (Central)', E('today()') === '2026-11-23');
  /* ESPN's final, filed SF@NEV: San Francisco 70, Nevada 76 (halves 30–35) */
  E(`set(LS.allfinals,{
    'ncaab:SF@NEV':{sport:'ncaab',d:'2026-11-23',a:70,h:76,h1a:30,h1h:35,p1a:30,p1h:35,ts:Date.now()},
    'ncaab:TEM@UTM':{sport:'ncaab',d:'2026-11-23',a:77,h:70,h1a:40,h1h:33,ts:Date.now()},
    'ncaab:DUKE@UNC':{sport:'ncaab',d:'2026-11-20',a:80,h:70,ts:Date.now()},
    'ncaab:BBB@AAA':{sport:'ncaab',d:'2026-11-05',a:60,h:66,ts:Date.now()}});`);
  const f = E(`J0=finalsFor('ncaab','NEV@SF','2026-11-23',false);JSON.stringify(J0)`), F = JSON.parse(f || 'null');
  T('finalsFor: NEV@SF finds the game ESPN filed as SF@NEV, scores turned back (Nevada 76, San Francisco 70; halves too)', F && F.a === 76 && F.h === 70 && F.h1a === 35 && F.h1h === 30 && F.flip === 1 && F.d === '2026-11-23', f);
  T('…as filed, it\'s untouched (SF@NEV reads San Francisco 70, Nevada 76)', E(`(r=>r.a===70&&r.h===76&&!r.flip)(finalsFor('ncaab','SF@NEV','2026-11-23',false))`) === true);
  T('…only on the day asked: the 24th finds nothing, and a call with no day never flips', E(`finalsFor('ncaab','NEV@SF','2026-11-24',false)`) === null && E(`finalsFor('ncaab','NEV@SF','',false)`) === null);
  T('…a matchup filed the other way round on ANOTHER day never answers (UNC@DUKE on the 23rd ≠ DUKE@UNC on the 20th)', E(`finalsFor('ncaab','UNC@DUKE','2026-11-23',false)`) === null);
  T('…the exact lookup stays exact (finalsFor0 never flips)', E(`finalsFor0('ncaab','NEV@SF','2026-11-23',false)`) === null);
  /* the characters' calls on NEV@SF grade */
  const id = (v, m) => ['ncaab', 'NEV@SF', '2026-11-23', v, m].join('|');
  E(`set(VOICES_KEY,[
    {id:${J(id('Sim', 'ml'))},voice:'Sim',sp:'ncaab',game:'NEV@SF',date:'2026-11-23',market:'ml',side:'away',price:-325},
    {id:${J(id('Judge', 'spread'))},voice:'Judge',sp:'ncaab',game:'NEV@SF',date:'2026-11-23',market:'spread',side:'away',line:-5.5,price:-110},
    {id:${J(id('Coach', 'total'))},voice:'Coach',sp:'ncaab',game:'NEV@SF',date:'2026-11-23',market:'total',side:'over',line:142.5,price:-105},
    {id:${J(id('Power', 'ml'))},voice:'Power',sp:'ncaab',game:'NEV@SF',date:'2026-11-23',market:'ml',side:'home',price:250},
    {id:'tem',voice:'Sim',sp:'ncaab',game:'TEM@UTM',date:'2026-11-23',market:'ml',side:'away',price:-150},
    {id:'unc',voice:'Sim',sp:'ncaab',game:'UNC@DUKE',date:'2026-11-23',market:'ml',side:'away',price:120},
    {id:'old-flip',voice:'Sim',sp:'ncaab',game:'AAA@BBB',date:'2026-11-05',market:'ml',side:'away',price:-120},
    {id:'old-none',voice:'Sim',sp:'ncaab',game:'CCC@DDD',date:'2026-11-05',market:'ml',side:'away',price:-120}]);
    set(SCORECALL_KEY,{s1:{voice:'Sim',sp:'ncaab',game:'NEV@SF',date:'2026-11-23',a:76,h:68}});
    set(HALF_KEY,{h1:{voice:'Sim',sp:'ncaab',game:'NEV@SF',date:'2026-11-23',mk:'h1ml',side:'away',price:-200}});`);
  E(`voicesRepairDates(true)`);
  let V = JSON.parse(E(`JSON.stringify(get(VOICES_KEY,[]))`));
  T('the ledger tidy keeps an old call whose game ESPN filed the other way round on its day (it used to drop it as "no final")', V.some(x => x.id === 'old-flip') && V.find(x => x.id === 'old-flip').date === '2026-11-05', J(V.map(x => x.id)));
  T('…and still drops an old call that truly never found a final (as before)', !V.some(x => x.id === 'old-none'));
  E(`gradeVoices()`); V = JSON.parse(E(`JSON.stringify(get(VOICES_KEY,[]))`)); const g = i => V.find(x => x.id === i) || {};
  T('the calls on NEV@SF grade: NEV ML wins (Nevada 76–70)', g(id('Sim', 'ml')).graded === true && g(id('Sim', 'ml')).hit === true, J(g(id('Sim', 'ml'))));
  T('…NEV −5.5 covers (won by 6); Over 142.5 cashes (146); SF ML loses', g(id('Judge', 'spread')).hit === true && g(id('Coach', 'total')).hit === true && g(id('Power', 'ml')).hit === false, J([g(id('Judge', 'spread')).hit, g(id('Coach', 'total')).hit, g(id('Power', 'ml')).hit]));
  T('…a game on file as asked grades exactly as before (TEM 77–70)', g('tem').hit === true);
  T('…the other-day matchup stays open (never graded on the wrong game)', !g('unc').graded);
  T('…the old flipped call grades on its own day\'s final (BBB@AAA 60–66 → AAA won)', g('old-flip').hit === true, J(g('old-flip')));
  const sc = JSON.parse(E(`JSON.stringify(get(SCORECALL_KEY,{}).s1)`));
  T('the score call on NEV@SF grades against the real final, its way round: called 76–68, final 76–70 (winner right, 2 off)', sc.graded === 1 && sc.fa === 76 && sc.fh === 70 && sc.win === 1 && sc.err === 2 && sc.exact === 0, J(sc));
  const hc = JSON.parse(E(`JSON.stringify(get(HALF_KEY,{}).h1)`));
  T('the first-half call grades on the halves turned back too (Nevada led 35–30)', hc.graded === 1 && hc.fa === 35 && hc.fh === 30 && hc.hit === true, J(hc));
  /* the Best card's path (gradeLeg): with the game on the page (found by its ESPN id) and without it (the finals store only) */
  E(`NCAAB_GAMES.length=0;NCAAB_GAMES.push({sp:'ncaab',id:'401911457',start:'2026-11-23T21:30Z',__date:'2026-11-23',away:{abbr:'SF',name:'San Francisco'},home:{abbr:'NEV',name:'Nevada'},awayScore:70,homeScore:76,abstract:'post',status:'Final',h1a:30,h1h:35});`);
  const leg = p => `gradeLeg({sport:'ncaab',game:'NEV@SF',pick:${J(p)},gameDate:'2026-11-23',gid:'401911457'},'2026-11-23')`;
  T('Best card: NEV ML grades a win with the game on the page (found by its ESPN id)', E(`${leg('NEV ML')}.hit`) === true);
  T('…SF +5.5 loses (lost by 6), Over 142.5 wins', E(`${leg('SF +5.5')}.hit`) === false && E(`${leg('Over 142.5')}.hit`) === true);
  E(`window.__lfh=legFlipHeal;legFlipHeal=function(){};`);
  T('…even if the leg were never turned around, the id match reads the scores the leg\'s way (no side graded on the other team\'s score)', E(`${leg('NEV ML')}.hit`) === true && E(`${leg('SF +5.5')}.hit`) === false);
  E(`legFlipHeal=window.__lfh;NCAAB_GAMES.length=0;`);
  T('…and off the page, from the finals store alone', E(`gradeLeg({sport:'ncaab',game:'NEV@SF',pick:'NEV ML',gameDate:'2026-11-23'},'2026-11-23').hit`) === true && E(`gradeLeg({sport:'ncaab',game:'NEV@SF',pick:'SF ML',gameDate:'2026-11-23'},'2026-11-23').hit`) === false);
  T('no errors along the way', errs.length === e0, errs.slice(e0).join(' | '));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 700)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 2500);
