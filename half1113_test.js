/* v2.98.5 · half / 1st-period calls: a confidence from the record (pulled toward a coin flip by 10 games), official only at 70%+ (Chris, Nov 13) */
const fs = require('fs'); const src = fs.readFileSync(__dirname + '/shared.js', 'utf8');
const line = n => { const i = src.indexOf(n); return src.slice(i, src.indexOf('\n', i)); };
eval((line('const halfRecConf=') + '\n' + line('const HALF_CONF=0.70;')).replace(/\bconst /g, 'var '));
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + x)); };
const R = (w, l, ok = true) => ({ w, l, n: w + l, ok });
T('15-8 reads 61% (shown on the call, no longer blank)', Math.round(halfRecConf(R(15, 8)) * 100) === 61, halfRecConf(R(15, 8)));
T('no record → no number (never a made-up one)', halfRecConf(null) === null && halfRecConf(R(0, 0)) === null);
T('a proven 15-8 half market is no longer official (61% < 70%)', halfOfficial(R(15, 8), { price: 140 }) === false);
T('26-6 clears 70% and is official', halfOfficial(R(26, 6), { price: 140 }) === true, halfRecConf(R(26, 6)));
T('…but never without a price, or without the proven record', halfOfficial(R(26, 6), { price: null }) === false && halfOfficial(R(26, 6, false), { price: 140 }) === false);
console.log(`${pass} pass / ${fail} fail`); if (fail) process.exit(1);
