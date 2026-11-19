/* Pins a JSDOM test's clock to 2 PM Central on the current slate day — node side and page side together — so a test that builds
   "a game in 2 hours" never lands after midnight just because it ran at night. (Games that really start after midnight Central are
   Hawaii-only; the machine files them under the next calendar day — a known edge, kept out of these tests.) */
const RD = Date; const ct = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' });
const hour = +ct.format(new RD()); const OFF = (14 - hour) * 36e5 - (new RD().getMinutes() * 60e3);   /* 2 PM, same slate day (the 5 AM cut) */
const shift = hour >= 5 ? OFF : OFF - 864e5;
class FD extends RD { constructor(...a) { super(...(a.length ? a : [RD.now() + shift])); } static now() { return RD.now() + shift; } }
global.Date = FD;
module.exports = function pin(opts) { opts = opts || {}; const bp = opts.beforeParse; opts.beforeParse = w => { const WD = w.Date; class PD extends WD { constructor(...a) { super(...(a.length ? a : [WD.now() + shift])); } static now() { return WD.now() + shift; } } w.Date = PD; if (bp) bp(w); }; return opts; };
