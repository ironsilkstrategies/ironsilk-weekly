/* v3.5.6 · Nov 23, Chris (the public sheet's character list had no Grinder): "I don't want new characters missing anywhere characters
   are implemented on either app". An heir never votes (its calls come from its parents': counting it would count them twice), but
   everywhere the characters are shown it's there: the public board (each game's calls, the sheet's character list), the machine's
   squares (its chip, dashed: no vote; the count stays the voters'), the machine's sheet, the challenge tickets. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-14T18:00:00Z');
const V = []; let id = 0;
const call = (voice, market, side, pick, price, line) => V.push({ id: 't' + (id++), sp: 'nba', date: '2026-11-14', game: 'ATL@CHI', voice, market, side, pick, price, line, cf: 0.72, graded: false, hit: null });
call('Coach', 'total', 'under', 'Under 245.5', -110, 245.5); call('Scout', 'total', 'under', 'Under 245.5', -110, 245.5); call('Judge', 'total', 'over', 'Over 245.5', -110, 245.5);
call('Brain', 'total', 'under', 'Under 245.5', -110, 245.5); call('H_T1', 'total', 'under', 'Under 245.5', -110, 245.5);
const TC = { d: '2026-11-14', ts: NOW, by: { nba: { games: [{ g: 'ATL@CHI', s: '2026-11-15T01:00:00Z', id: '7', w: 1 }], picks: [
  { sp: 'nba', gid: '7', game: 'ATL@CHI', start: '2026-11-15T01:00:00Z', m: 'total', sd: 'under', pick: 'Under 245.5', price: -110, color: ' supreme', unan: true, chars: ['Coach', 'Scout', 'Brain'], mp: 0.62, brainP: 0.66 }] } } };
const KC = { key: 'H_T1', id: 'T1', litter: 'LT', a: 'Sim', b: 'Judge', arch: 'Steady Grinder', temper: 'Steady', craft: 'Grinder', name: 'The Grinder', chip: '⚙️ GRINDER', title: 'The Steady Hand', color: '#f7c04a', crest: { g: '⚙️', t: '⚓' },
  creed: 'The market is the check.', pub: { bio: 'Born Nov 12 to the Simulator and the Judge.', origin: 'Child of the Simulator and the Judge.' }, born: '2026-11-12', liveFrom: '2026-11-13', since: '2026-11-01', conceived: '2026-10-31',
  recipe: { P: { b: 0.45, T: 1, contrast: 1 }, lanes: {}, vacc: [], fade: [], hot: [], mut: 'none', temper: 'Steady', craft: 'Grinder' }, domA: [], domB: [], n: 1, st: 'rookie', womb: { days: 18, zA: 2.4, zB: 3.1 }, cal: [] };
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1');
  x.localStorage.setItem('d4.voices', JSON.stringify(V)); x.localStorage.setItem('d4.todaycard', JSON.stringify(TC)); x.localStorage.setItem('d4.womb', JSON.stringify({ v: 1, litters: [], tried: 1, firstDone: 1, lastConceived: '2026-11-11', kids: [KC] })); } }).window;
setTimeout(() => { try {
  w.eval('wbRegisterKids()');
  T('the heir is on the roster, a meta voice that never votes', w.eval(`!!CHARS.H_T1&&CHARS.H_T1.kid&&META_VOICES.has('H_T1')&&!isVoter('H_T1')&&shownV('H_T1')&&!shownV('Brain')&&shownV('Coach')`));
  /* the public board */
  const B = w.eval(`pubBoard(roGet(VOICES_KEY,[])||[])`), g = B && B.games[0], tot = (g && g.calls.total) || [];
  T('the public board: the heir\'s call is on the game with everyone\'s (its pick, its own confidence), and it\'s in the sheet\'s character list by name', tot.some(c => c.v === 'H_T1' && c.s === 'under' && c.p != null) && B.cast.H_T1 && B.cast.H_T1.name === 'The Grinder' && B.cast.H_T1.chip === '⚙️ GRINDER', JSON.stringify([tot, B && B.cast && B.cast.H_T1]));
  T('…the Brain still isn\'t listed (it\'s made from the others), and the heir isn\'t named as a backer of the colored pick (it doesn\'t vote)', !tot.some(c => c.v === 'Brain') && !B.cast.Brain && !g.picks[0].by.includes('H_T1') && g.picks[0].by.includes('Coach'), JSON.stringify(g && g.picks[0].by));
  /* the machine's squares */
  const G = { id: 'g1', away: { abbr: 'COL', name: 'Colorado Avalanche' }, home: { abbr: 'WPG', name: 'Winnipeg Jets' }, __date: '2026-10-07' };
  w.eval(`window.__C=[];characterCalls=()=>window.__C;`);
  w.eval(`window.__C=${JSON.stringify([['Sim', 'home'], ['Judge', 'home'], ['Most common', 'home'], ['H_T1', 'home']].map(([v, s]) => ({ voice: v, market: 'ml', side: s })))}`);
  const a = w.eval(`charSquare('nhl',${JSON.stringify(G)},{aw:.4,hw:.6},'WPG ML',{price:-150})`), nv = w.eval('VOTER_ORDER.length');
  T('the machine\'s square: the heir\'s chip is on the side it\'s on (dashed: it doesn\'t vote); the count is still the voters\' and says an heir is with it', /hs-chip kid[^>]*>⚙️ GRINDER</.test(a.chips) && new RegExp(`3 of ${nv} on this side`).test(a.meter) && /🍼 1 heir with it \(no vote\)/.test(a.meter) && a.unanimous === false, a.meter.replace(/<[^>]+>/g, ' ').slice(0, 220));
  w.eval(`window.__C=${JSON.stringify([['Sim', 'home'], ['Judge', 'home'], ['Most common', 'home'], ['H_T1', 'away']].map(([v, s]) => ({ voice: v, market: 'ml', side: s })))}`);
  const b = w.eval(`charSquare('nhl',${JSON.stringify(G)},{aw:.4,hw:.6},'WPG ML',{price:-150})`);
  T('…and not on the side it isn\'t on', !/GRINDER/.test(b.chips) && !/heir/.test(b.meter));
  /* the challenge tickets */
  T('a living heir gets its own ticket in the challenges, like every character; a retired one doesn\'t', w.eval(`ch2Sources().some(x=>x[0]==='char:H_T1'&&/Grinder's Ticket/.test(x[1]))`) && w.eval(`(()=>{CHARS.H_T1.quiet='retired';const r=!ch2Sources().some(x=>x[0]==='char:H_T1');CHARS.H_T1.quiet='';return r;})()`));
  /* every view that lists the characters takes the heir without a hitch, and names it where it has something to show */
  const views = w.eval(`(()=>{const o={};const tryV=(k,f)=>{try{const h=String(f()||'');o[k]={ok:true,grinder:/GRINDER|The Grinder/.test(h)};}catch(e){o[k]={ok:false,err:String(e&&e.message||e)};}};
    tryV('chips',()=>charChipRow({tier:'all'},'x','all'));tryV('ideology',()=>ideologyHtml());tryV('records',()=>voicesReportCore('all'));tryV('chardesk',()=>charDeskHtml({ch:'all',tier:'all',m:'all',sp:'all'}));
    tryV('cast',()=>JSON.stringify(pubCharacters(roGet(VOICES_KEY,[])||[],today())));return o;})()`);
  T('every view that lists the characters takes the heir (no errors), and names it: the character buttons, the ideology cards, the public cast', Object.values(views).every(x => x.ok) && views.chips.grinder && views.ideology.grinder && views.cast.grinder, JSON.stringify(views));
} catch (e) { T('crashed', false, e.stack); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); }, 2500);
