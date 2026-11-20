/* v3.1.3 · the public app's D$ slip price. decAm() already writes the sign (+150 / −105, with a real minus), so running its
   text through odds() again turned every favorite into "−NaN" on the slip header and on a placed ticket. The slip now shows
   decAm() as is: one leg at −105 reads −105, a two-leg +281 reads +281. */
import fs from 'node:fs';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 300))); };
const src = fs.readFileSync(new URL('./desk/app.js', import.meta.url), 'utf8');
const grab = name => { const m = src.match(new RegExp(`const ${name} = [^\\n]+;`)); if (!m) throw new Error('no ' + name); return m[0]; };
const { decAm, odds } = new Function(`${grab('odds')}\n${grab('decAm')}\nreturn { decAm, odds };`)();
const fav = 1 + 100 / 105, dog = 1 + 150 / 100, two = (1 + 100 / 105) ** 2;
T('decAm writes a favorite with its own minus', decAm(fav) === '−105', decAm(fav));
T('…and an underdog with its own plus', decAm(dog) === '+150', decAm(dog));
T('a two-leg ticket at −105 each reads +281', decAm(two) === '+281', decAm(two));
T('formatting that text a second time is what made "−NaN" (the old bug)', /NaN/.test(odds(decAm(fav))), odds(decAm(fav)));
T('the app never runs decAm() through odds() any more', !/odds\(\s*decAm\(/.test(src));
T('the slip header shows decAm() as is', /leg\$\{S\.dd\.length > 1 \? 's' : ''\} · \$\{esc\(decAm\(dec\)\)\}/.test(src));
T('a placed ticket shows decAm() as is', /<div class="f-odds"><b>\$\{esc\(decAm\(dec\)\)\}<\/b>/.test(src));
const idx = fs.readFileSync(new URL('./desk/index.html', import.meta.url), 'utf8'), sw = fs.readFileSync(new URL('./desk/sw.js', import.meta.url), 'utf8');
const v = (idx.match(/app\.js\?v=(\d+)/) || [])[1];
T('phones fetch the fixed app: index and the service worker ask for the same app.js version', v && sw.includes(`'app.js?v=${v}'`), v);
console.log(pass + ' pass / ' + fail + ' fail'); if (fail) process.exit(1);
