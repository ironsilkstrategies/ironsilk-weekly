/* v50 (public app) · Nov 20, Chris: "some odds aren't popping up on the right side." The daily sheet (slate.json) keeps the 14
   likeliest college games a sport; every other game on the board joined the Slate with no line, so its right side sat empty.
   Now a game the sheet skipped shows the line rebuilt from the prices on the desk's own calls (the same book lines the picks use).
   Display only: D$ still needs the sheet's full line. And no pick or call without a real price ever shows (no line, no listing). */
import fs from 'node:fs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 300))); };
const src = fs.readFileSync(new URL('./desk/app.js', import.meta.url), 'utf8');
const line = name => { const m = src.match(new RegExp(`const ${name} = [^\\n]+;`)); if (!m) throw new Error('no ' + name); return m[0]; };
const block = (from, to) => { const i = src.indexOf(from), j = src.indexOf(to, i); if (i < 0 || j < 0) throw new Error('no ' + from); return src.slice(i, j); };
const { lnFromBoard, lnText } = new Function(`${line('esc')}\n${line('fin')}\n${line('odds')}\n${block('function lnFromBoard(', 'function gameHtml(')}\nreturn { lnFromBoard, lnText };`)();
const c = (pick, price) => ({ v: 'Sim', pick, price });
const G = (a, h) => ({ a: { ab: a }, h: { ab: h } });
const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
/* TLSA@MSST, from today's real board: MSST ML −310 / TLSA ML +252, TLSA +7 −104, a total at 152 */
let L = lnFromBoard({ game: 'TLSA@MSST', calls: { ml: [c('MSST ML', -310), c('TLSA ML', 252)], spread: [c('TLSA +7', -104)], total: [c('Over 152', -110)] } });
T('a board game the sheet skipped: the line rebuilt from the calls (dog +7 → MSST −7, O/U 152, both moneylines)', L && L.fav === 'MSST' && L.line === 7 && L.tot === 152 && L.mlA === 252 && L.mlH === -310, JSON.stringify(L));
T('…and the right side reads "MSST −7 · O/U 152"', strip(lnText(L, G('TLSA', 'MSST'))) === 'MSST −7 O/U 152', strip(lnText(L, G('TLSA', 'MSST'))));
L = lnFromBoard({ game: 'UCF@VAN', calls: { spread: [c('VAN -17', -110)], total: [c('Under 157', -110)] } });
T('a call on the favorite: VAN −17', strip(lnText(L, G('UCF', 'VAN'))) === 'VAN −17 O/U 157', strip(lnText(L, G('UCF', 'VAN'))));
L = lnFromBoard({ game: 'A@B', calls: { spread: [c('A 0', -110)] } });
T('a pick\'em spread reads Pick’em', strip(lnText(L, G('A', 'B'))) === 'Pick’em');
L = lnFromBoard({ game: 'UGA@GT', calls: { ml: [c('UGA ML', -360)] } });
T('only one moneyline priced: that side and its price', strip(lnText(L, G('UGA', 'GT'))) === 'UGA −360', strip(lnText(L, G('UGA', 'GT'))));
L = lnFromBoard({ game: 'X@Y', calls: { ml: [c('Y ML', null)] } });
T('no priced call at all: nothing to show (no made-up line)', L === null && lnText(null, G('X', 'Y')) === '');
T('a sheet line the sheet already had still reads the same', strip(lnText({ fav: 'UVU', line: 4.5, tot: 149.5, mlA: -180, mlH: 150 }, G('UVU', 'ECU'))) === 'UVU −4.5 O/U 149.5');
/* wiring */
T('the Slate row uses the sheet\'s line first, then the board\'s', /const LN = g\.ln \|\| lnFromBoard\(g\.b\), ln = `<div class="g-ln">\$\{lnText\(LN, g\)\}<\/div>`;/.test(src));
T('D$ still plays only off the sheet\'s full line (the rebuilt one is display only)', /function ddBtns\(g\) \{ if \(!\(g\.t > Date\.now\(\) \+ 60e3\) \|\| !g\.ln\) return '';/.test(src) && !/ddLegOf[^\n]*lnFromBoard/.test(src));
T('no line, no listing: a pick or a call without a real price never shows on the board', /\.filter\(c => fin\(c\.price\) && !isHeavy\(m, c\.price\)\)/.test(src) && /\.filter\(p => fin\(p\.price\) && !isHeavy\(p\.m, p\.price\)\)/.test(src));
const idx = fs.readFileSync(new URL('./desk/index.html', import.meta.url), 'utf8'), sw = fs.readFileSync(new URL('./desk/sw.js', import.meta.url), 'utf8');
const v = (idx.match(/app\.js\?v=(\d+)/) || [])[1];
T('phones fetch the new app: index and the service worker ask for the same app.js version (v50)', +v >= 50 && sw.includes(`'app.js?v=${v}'`) && /thedesk-shell-v\d+/.test(sw), v);
console.log(pass + ' pass / ' + fail + ' fail'); if (fail) process.exit(1);
