/* Nov 23 · the helpline on every growth post. The SRO fact-check found the Desk Debate, its settle post and Receipts Sunday
   carrying no helpline (the social card said "21+ · bet responsibly"). The rule is 21+ with 1-800-MY-RESET on every promo post:
   each text now ends with the line, the X caption keeps "21+ · 1-800-MY-RESET" above its link inside 280 characters, and every
   social card's footer reads "21+ · 1-800-MY-RESET". (The daily video keeps its sports-talk wording.) */
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 400))); };
process.env.AUTOPILOT_KEY = 'k'; process.env.TG_BOT_TOKEN = 't';
const Gr = await import('/home/claude/work/autopilot/growth.mjs'); const Soc = await import('/home/claude/work/autopilot/social.mjs');
const NOW = Date.parse('2026-11-19T16:30:00Z');
const call = (v, s, pick, rk, p, lab) => ({ v, s, pick, price: -110, p, o: 0, r: { lab, rk, of: 8, w: 100 + rk, l: 60 }, hit: null });
const board = { d: '2026-11-19', cast: { Sim: { name: 'The Simulator' }, Judge: { name: 'The Judge' }, Power: { name: 'The Commissioner' }, Dog: { name: 'The Underdog Spotter' } }, games: [
  { sp: 'nfl', game: 'BUF@MIA', start: '2026-11-19T22:00:00Z', st: 'pre', picks: [], calls: { spread: [call('Sim', 'away', 'BUF -3.5', 5, 0.55, 'NFL spread favorites'), call('Judge', 'away', 'BUF -3.5', 2, 0.53, 'NFL spread favorites'), call('Power', 'away', 'BUF -3.5', 6, 0.52, 'NFL spread favorites'), call('Dog', 'home', 'MIA +3.5', 1, 0.48, 'NFL spread dogs')] } }] };
const D = Gr.debates(board, NOW)[0]; const P = Gr.debatePost(D, { cast: board.cast, day: 'Thu, Nov 19' });
const HL = /21\+ · For entertainment only · Need help\? Call or text 1-800-MY-RESET$/;
T('the debate post ends with 21+ and the helpline', HL.test(P.text), P.text.slice(-120));
T('…its X caption keeps "21+ · 1-800-MY-RESET" right above the link, inside 280', P.x.length <= 280 && P.x.endsWith('21+ · 1-800-MY-RESET\nhttps://ironsilkweekly.com/desk/?src=x'), P.x.length + ' ' + P.x);
{ const long = { ...D, la: { ...D.la, v: 'X'.repeat(90) }, lb: { ...D.lb, v: 'Y'.repeat(90) } }; const P2 = Gr.debatePost(long, { cast: {} });
  T('…even with absurdly long names (the lines shrink, the helpline and link stay whole)', P2.x.length <= 280 && P2.x.endsWith('21+ · 1-800-MY-RESET\nhttps://ironsilkweekly.com/desk/?src=x'), P2.x.length); }
const S0 = { k: D.k, matchup: 'Bills at Dolphins', fullM: 'Buffalo Bills at Miami Dolphins', wa: 'The Judge', pa: 'BUF -3.5', wb: 'The Underdog Spotter', pb: 'MIA +3.5', d: '2026-11-19' };
for (const [ra, rb] of [['W', 'L'], ['L', 'L'], ['P', 'P']]) T(`the settle post (${ra}/${rb}) ends with the helpline, one blank line before it`, HL.test(Gr.settlePost(S0, ra, rb, { fin: 'BUF 27–20 MIA' }).text) && !/\n\n\n/.test(Gr.settlePost(S0, ra, rb).text));
const F = { record: { w: 52, l: 38, first: '2026-10-06' }, history: [{ d: '2026-11-16', picks: [{ pick: 'A ML', price: -150, hit: true, game: 'A@B' }, { pick: 'C +3', price: -110, hit: false, game: 'C@D' }] }, { d: '2026-11-18', picks: [{ pick: 'E ML', price: 120, hit: true, game: 'E@F' }] }] };
const W = Gr.weeklyPost(F, '2026-11-22'); T('Receipts Sunday ends with the helpline', !!W && HL.test(W.text), W && W.text.slice(-140));
T('…and the week, best and worst calls still read as before', !!W && /2-1<\/b> on the free card/.test(W.text) && /Best call: <b>E ML \(\+120\)/.test(W.text) && /Worst call: <b>C \+3/.test(W.text));
const tree = JSON.stringify(Soc.cardTree(P.card, {}));
T('every social card\'s footer reads "21+ · 1-800-MY-RESET" (not "bet responsibly")', tree.includes('21+ · 1-800-MY-RESET') && !tree.includes('bet responsibly'));
T('the words stay clean: no "lock", "guaranteed" or "risk-free" anywhere in these posts', ![P.text, P.x, W.text].some(t => /\block\b|guarantee|risk-free/i.test(t)));
console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
