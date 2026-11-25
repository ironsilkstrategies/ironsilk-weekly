/* TheDesk · character voices for the public app.
   v3 · Nov 24, 9:42 PM, Chris: "this character and all characters need a way more vast vocabulary instead of saying the same thing
   about every game". v1 (Nov 15) turned the desk's reason tags into each character's words, but a card still read like a form
   letter: four stock openers for anyone it didn't know (every heir), one phrasing for the most common tag ("both offenses outclass
   the defenses (Scout)"), the same fact leading every read, and nothing about the game itself when a call had no tags. Now:
   · the desk sends more to talk about: each character's own book on these teams (with them and against them on the moneyline and
     the spread, the overs and unders in their games), each team's scoring, record and last five, how often its games clear the
     total, and every reason it already gave;
   · every fact has many phrasings with the teams' names and the numbers in them, and a fact that cuts against the pick is left out;
   · every character has its own openers, sign-offs and asides, and reaches first for the facts that fit how it thinks;
   · the heirs talk like their parents, with their own kind's attitude on top (steady, prodigy, rebel, prodigal);
   · on one card the same fact is never said the same way twice, no two reads open alike, and the sentence shape keeps turning.
   Deterministic: the same pick on the same day reads the same on every phone. No new claims: every sentence comes from a fact the
   desk published (a sum or a difference of two published numbers at most). */
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = seed => { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const deck = (seed, a) => { const r = rng(seed), b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const low = s => (s && !/^[A-Z][A-Z0-9&'-]+\b/.test(s) && !/^I\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const nw = n => (n >= 0 && n <= 12 && n === Math.round(n) ? WORDS[n] : String(n));
const ord = n => ({ 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth' })[n] || n + 'th';
const r1 = x => { const v = Math.round(+x * 10) / 10; return Number.isInteger(v) ? String(v) : v.toFixed(1); };
const rn = x => String(Math.round(+x));
const rec = (w, l) => `${w}-${l}`;
const wl = (w, l) => (w > l ? 'up' : w < l ? 'down' : 'even');

/* ── the facts. Each reader turns one published reason into a fact: k (what kind), w (how much it says), pol (+1 backs the pick,
   −1 cuts against it, 0 neutral) and alts (the ways to say it). X = the context: T/O (our side, the other), A/H (away, home), the
   pick's line L, the market (side, total, prop), the side (over, under) and nm (abbreviation → name). ── */
const nmx = (X, ab) => (X.nm(ab) || ab);
const isT = (X, ab) => X.Tab && ab === X.Tab;
const isO = (X, ab) => X.Oab && ab === X.Oab;
const PACE = { ncaab: [66, 71], nba: [97, 102], ncaaf: [65, 75], nfl: [60, 66] };
const READERS = [
  /* its own book on these teams: the team book */
  [/^me (with|vs) (\S+) (ml|ats) (\d+)-(\d+)$/, (m, X) => { const [, rel, ab, mk, w0, l0] = m, w = +w0, l = +l0, n = w + l, t = nmx(X, ab), on = mk === 'ml' ? 'to win' : 'on the spread', bet = mk === 'ml' ? 'straight up' : 'against the number';
    const up = w > l, k = 'book' + rel + mk;
    if (rel === 'with') return { k, w: 3 + Math.min(2, Math.abs(w - l) / 2), pol: up ? 1 : 0, alts: up ? [
      `I'm ${rec(w, l)} backing ${t} ${on}`, `${t} have been good to me, ${rec(w, l)} when I take them ${bet}`, `my book on ${t} ${on} reads ${rec(w, l)}`,
      `every time I've ridden ${t} ${bet} it has mostly paid, ${rec(w, l)}`, `${t} and I have history, ${rec(w, l)} when I'm on them`, `I know this team, ${rec(w, l)} picking ${t} ${on}`,
      `${nw(w)} cashes in ${nw(n)} tries with ${t} ${on}`, `${t} have cashed ${nw(w)} of the ${nw(n)} times I've backed them ${bet}`, `my ledger likes ${t}: ${rec(w, l)} ${on}`] : w === l ? [
      `I'm ${rec(w, l)} with ${t} ${on}, dead even so far`, `${t} have split with me, ${rec(w, l)} ${on}`, `${rec(w, l)} backing ${t} ${on}, a coin flip until tonight`] : [
      `${t} have burned me before (${rec(w, l)} ${on}) and I'm back anyway`, `I'm only ${rec(w, l)} with ${t} ${on}, so I'm going in clear-eyed`, `${t} owe me one: ${rec(w, l)} when I've backed them ${bet}`,
      `my book on ${t} ${on} is ${rec(w, l)}, not pretty, and the read still says yes`] };
    return { k, w: 3 + Math.min(2, Math.abs(w - l) / 2), pol: up ? 1 : 0, alts: up ? [
      `I'm ${rec(w, l)} going against ${t} ${on}`, `fading ${t} ${bet} has paid: ${rec(w, l)}`, `${t} haven't been kind to the people backing them, and I'm ${rec(w, l)} against them`,
      `betting against ${t} ${on}: ${rec(w, l)} for me`, `${t} have let me down for the other side ${nw(w)} times in ${nw(n)}`, `my book against ${t} reads ${rec(w, l)} ${on}`,
      `${nw(w)} for ${nw(n)} when I've been on the other side of ${t}`] : w === l ? [
      `I'm ${rec(w, l)} against ${t} ${on}, even money so far`, `going against ${t} has been a wash, ${rec(w, l)}`] : [
      `${t} have made me pay before when I faded them (${rec(w, l)}), and I'm fading them again`, `I'm ${rec(w, l)} against ${t} ${on}, so this isn't a grudge, it's the read`] }; }],
  [/^me on (\S+) (over|under) (\d+)-(\d+)$/, (m, X) => { const [, ab, sd, w0, l0] = m, w = +w0, l = +l0, n = w + l, t = nmx(X, ab), up = w > l, k = 'bookou';
    return { k, w: 3 + Math.min(2, Math.abs(w - l) / 2), pol: up ? 1 : 0, alts: up ? (sd === 'over' ? [
      `I've hit ${nw(w)} of ${nw(n)} overs in ${t} games`, `${t} games go over for me, ${rec(w, l)}`, `my over book on ${t} reads ${rec(w, l)}`, `the over and ${t} have been friends of mine, ${rec(w, l)}`,
      `${t} games keep clearing for me, ${nw(w)} of ${nw(n)}`, `when ${t} play, I like the over, and I'm ${rec(w, l)} on it`, `${rec(w, l)} on overs when ${t} play`] : [
      `I've hit ${nw(w)} of ${nw(n)} unders in ${t} games`, `${t} games stay under for me, ${rec(w, l)}`, `my under book on ${t} reads ${rec(w, l)}`, `the under and ${t} have treated me right, ${rec(w, l)}`,
      `${t} games keep coming in low for me, ${nw(w)} of ${nw(n)}`, `${rec(w, l)} on unders when ${t} play`]) : w === l ? [
      `${t} games have split on me, ${rec(w, l)} on the ${sd}`, `I'm ${rec(w, l)} on ${sd}s in ${t} games, even so far`] : [
      `the ${sd} in ${t} games has cost me before (${rec(w, l)}), and the numbers still point here`, `I'm ${rec(w, l)} on ${sd}s with ${t}, so this one has to earn it, and it does`] }; }],
  /* the game's own numbers */
  [/^avg (\S+) ([\d.]+)-([\d.]+) (\S+) ([\d.]+)-([\d.]+)$/, (m, X) => { const [, a, af0, aa0, h, hf0, ha0] = m, af = +af0, aa = +aa0, hf = +hf0, ha = +ha0, A = nmx(X, a), H = nmx(X, h);
    const proj = (af + ha) / 2 + (hf + aa) / 2;
    if (X.mk === 'total') { const L = X.L, hi = L != null ? proj > L + 0.5 : null, lo = L != null ? proj < L - 0.5 : null;
      if (X.sd === 'over' && lo) return null; if (X.sd === 'under' && hi) return null;
      const lean = L == null ? [] : X.sd === 'over' && hi ? [`their scoring adds up to about ${rn(proj)}, and the line is ${r1(L)}`, `put their averages together and you land near ${rn(proj)}, over ${r1(L)}`, `${A} score ${r1(af)} against a defense allowing ${r1(ha)}, ${H} ${r1(hf)} against ${r1(aa)}, about ${rn(proj)} in all`]
        : X.sd === 'under' && lo ? [`their scoring adds up to about ${rn(proj)}, under ${r1(L)}`, `put their averages together and you get roughly ${rn(proj)}, short of ${r1(L)}`, `${A} score ${r1(af)}, ${H} ${r1(hf)}, and both defenses hold up: about ${rn(proj)} all in`] : [];
      const gen = X.sd === 'over' ? [`${A} put up ${r1(af)} a game and give up ${r1(aa)}; ${H} score ${r1(hf)} and allow ${r1(ha)}`, `both of these teams can score: ${A} ${r1(af)} a night, ${H} ${r1(hf)}`, `${H} give up ${r1(ha)} a game and ${A} give up ${r1(aa)}, so neither defense is a wall`]
        : [`${A} allow ${r1(aa)} a game and ${H} allow ${r1(ha)}`, `${A} score ${r1(af)} a night, ${H} ${r1(hf)}, nothing explosive`, `two defenses giving up ${r1(aa)} and ${r1(ha)} a game`];
      /* when the numbers clear the line its way, say the sum (one plain line kept for variety) */
      return { k: 'avg', w: lean.length ? 2.8 : 1.6, pol: lean.length ? 1 : 0, alts: lean.length ? [...lean, gen[0]] : gen }; }
    if (X.mk !== 'side' || !X.Tab) return null;
    const me = isT(X, a) ? [af, aa] : [hf, ha], op = isT(X, a) ? [hf, ha] : [af, aa], dm = me[0] - me[1], dop = op[0] - op[1];
    if (dm <= dop) return null;
    return { k: 'avg', w: 2.4, pol: 1, alts: [`${X.T} outscore people by ${r1(dm)} a game, ${X.O} ${dop >= 0 ? 'by ' + r1(dop) : 'get outscored by ' + r1(-dop)}`, `${X.T} score ${r1(me[0])} and allow ${r1(me[1])}, while ${X.O} score ${r1(op[0])} and allow ${r1(op[1])}`,
      `the scoring margins aren't close, ${X.T} at ${dm >= 0 ? '+' : ''}${r1(dm)} a game, ${X.O} at ${dop >= 0 ? '+' : ''}${r1(dop)}`, `${X.T} put up ${r1(me[0])} a night against a ${X.O} defense allowing ${r1(op[1])}`] }; }],
  [/^rec (\S+) (\d+)-(\d+) (\S+) (\d+)-(\d+)$/, (m, X) => { const [, a, aw0, al0, h, hw0, hl0] = m; if (X.mk !== 'side' || !X.Tab) return null;
    const mine = isT(X, a) ? [+aw0, +al0] : [+hw0, +hl0], oth = isT(X, a) ? [+hw0, +hl0] : [+aw0, +al0], pm = mine[0] / Math.max(1, mine[0] + mine[1]), po = oth[0] / Math.max(1, oth[0] + oth[1]);
    if (pm + 0.05 < po && !X.dog) return null;
    return { k: 'rec', w: 1.8, pol: pm > po ? 1 : 0, alts: pm > po ? [`${X.T} are ${rec(...mine)} and ${X.O} are ${rec(...oth)}`, `${rec(...mine)} against ${rec(...oth)}: one of these teams wins a lot more`, `${X.T} come in ${rec(...mine)}, ${X.O} ${rec(...oth)}`, `the records tell part of it, ${X.T} ${rec(...mine)}, ${X.O} ${rec(...oth)}`]
      : [`${X.O} have the better record at ${rec(...oth)}, ${X.T} are ${rec(...mine)}, and that's why there's a price`, `records say ${X.O} (${rec(...oth)}), but ${X.T} (${rec(...mine)}) only need tonight`] }; }],
  [/^last5 (\S+) (\d+)-(\d+) (\S+) (\d+)-(\d+)$/, (m, X) => { const [, a, aw0, al0, h, hw0, hl0] = m, A = nmx(X, a), H = nmx(X, h), aw = +aw0, al = +al0, hw = +hw0, hl = +hl0;
    if (X.mk === 'side' && X.Tab) { const mine = isT(X, a) ? [aw, al] : [hw, hl], oth = isT(X, a) ? [hw, hl] : [aw, al]; if (mine[0] < oth[0]) return null; const n = mine[0] + mine[1], no = oth[0] + oth[1];
      return { k: 'form', w: mine[0] - oth[0] >= 2 ? 2.4 : 1.6, pol: mine[0] > oth[0] ? 1 : 0, alts: [`${X.T} have won ${nw(mine[0])} of their last ${nw(n)}`, `${X.T} are ${rec(...mine)} in their last ${nw(n)}, ${X.O} ${rec(...oth)}`, `form matters: ${X.T} ${rec(...mine)} lately, ${X.O} ${rec(...oth)}`,
        `${X.O} have won ${nw(oth[0])} of their last ${nw(no)}`, `${X.T} come in hot, ${nw(mine[0])} wins in the last ${nw(n)}`].filter((s, i) => i !== 4 || mine[0] >= 4) }; }
    if (X.mk === 'total') return { k: 'form', w: 0.8, pol: 0, alts: [`${A} are ${rec(aw, al)} in their last ${nw(aw + al)}, ${H} ${rec(hw, hl)}`] };
    return null; }],
  [/^past ([\d.]+): (\S+) (\d+)\/(\d+) (\S+) (\d+)\/(\d+)$/, (m, X) => { const [, L0, a, ak0, an0, h, hk0, hn0] = m, L = +L0, A = nmx(X, a), H = nmx(X, h), ak = +ak0, an = +an0, hk = +hk0, hn = +hn0;
    if (X.mk !== 'total') return null; const ov = X.sd === 'over', ka = ov ? ak : an - ak, kh = ov ? hk : hn - hk, word = ov ? 'went past' : 'stayed under', sh = ov ? 'over' : 'under';
    if ((ka / an + kh / hn) / 2 < 0.5) return null;
    return { k: 'past', w: (ka / an + kh / hn) / 2 >= 0.65 ? 2.6 : 1.8, pol: 1, alts: [`${nw(ka)} of ${A}'s last ${nw(an)} ${word} ${r1(L)}, and ${nw(kh)} of ${H}'s last ${nw(hn)}`, `${A} have gone ${sh} ${r1(L)} in ${nw(ka)} of their last ${nw(an)}`,
      `${H} games: ${nw(kh)} of the last ${nw(hn)} ${word} ${r1(L)}`, `run their last few games against this number and the ${sh} keeps showing up: ${ka}/${an} for ${A}, ${kh}/${hn} for ${H}`, `${r1(L)} would have been ${ov ? 'beaten' : 'safe'} in ${nw(ka)} of ${A}'s last ${nw(an)}`] }; }],
  /* the desk's situation tags */
  [/^both offenses outclass the defenses/, (m, X) => ({ k: 'offedge', w: 2, pol: X.sd === 'under' ? -1 : 1, alts: [`both offenses are better than both defenses`, `the offenses have the edge on both ends`, `neither defense matches up with the scoring it's facing`, `this is two offenses that should find room all night`,
    `the matchup favors the offenses on both sides`, `both attacks rate ahead of the defenses trying to stop them`, `there's scoring on both benches and not much resistance`, `each offense out-ranks the defense across from it`, `points should come easy at both ends`, `two defenses that can't keep up with what they're facing`] })],
  [/^both defenses outclass the offenses/, (m, X) => ({ k: 'defedge', w: 2, pol: X.sd === 'over' ? -1 : 1, alts: ['both defenses are better than both offenses', 'points will be hard to come by on both ends', 'this has the look of a grind', 'two defenses ahead of two offenses', 'each defense out-ranks the offense it sees',
    'nobody is going to get easy looks tonight', 'the defenses have the upper hand at both ends', 'expect a lot of contested possessions'] })],
  [/^high total$/, (m, X) => ({ k: 'hitot', w: 1, pol: 0, alts: X.sd === 'over' ? ['the total is high, and it still isn\'t high enough', 'yes, it\'s a big number', 'a big total for a reason', 'the book set it high and I think they were careful'] : ['that\'s a high number to clear', 'the total is set high', 'a big total, and big totals are hard to reach', 'the book is asking for a lot of points'] })],
  [/^low total$/, (m, X) => ({ k: 'lotot', w: 1, pol: 0, alts: X.sd === 'under' ? ['it\'s a low total, and it can still go lower', 'a low number, built for a grind', 'the book expects a slow one'] : ['it\'s a low total, so it doesn\'t take much', 'a low bar to clear', 'the number is low enough to step over', 'a modest total, and modest totals get beat'] })],
  [/^road favorite$/, (m, X) => ({ k: 'roadfav', w: 1.4, pol: 1, alts: ['{T} are favored on the road', 'even away from home, {T} are the ones laying it', '{T} travel and still get the respect from the book', 'the line makes {T} the favorite despite the trip', 'nobody is scared of the road for {T} here', 'the number trusts {T} away from home', '{T} are the road chalk, and they earned it'] })],
  [/^home favorite$/, () => ({ k: 'homefav', w: 1.2, pol: 1, alts: ['{T} are favored at home', 'home building, home favorite', '{T} get the home crowd and the number'] })],
  [/^\+?[\d.]* ?home (dog|underdog)$/, () => ({ k: 'hdog', w: 1.6, pol: 1, alts: ['a home dog getting points', 'the home side is getting points, and I\'ll take them', 'home underdog, my favorite kind', '{T} are home and still the underdog', 'a home crowd behind an underdog', 'points at home, which is the spot I like'] })],
  [/^division game$/, () => ({ k: 'div', w: 1.2, pol: 0, alts: ['it\'s a division game, so nothing comes free', 'these two know each other too well', 'division stakes, familiar faces', 'a rivalry game, which keeps it honest', 'same division, so the effort is there on both sides'] })],
  [/^conference game/, () => ({ k: 'conf', w: 1, pol: 0, alts: ['a conference game, so they know each other\'s sets', 'league play, where scouting reports get thick', 'conference rivals, no surprises left', 'it counts in the standings, both teams know it'] })],
  [/^out-of-conference game$/, () => ({ k: 'ooc', w: 1, pol: 0, alts: ['it\'s a non-conference game', 'no conference familiarity here', 'two teams that don\'t see each other often', 'out of league, so the scouting is thinner'] })],
  [/over-performing its scoring/, () => ({ k: 'pythup', w: 1.6, pol: 1, alts: ['{T} have been winning more than their scoring says they should', '{T}\'s record is running ahead of the point differential', '{T} keep finding ways to win close ones', '{T} have been closing games better than the box score suggests', '{T} win the tight ones'] })],
  [/under-performing its scoring/, () => ({ k: 'pythdn', w: 1.6, pol: 1, alts: ['{T} are better than their record', '{T} have lost some close ones they should have won', 'the scoring says {T} deserve more wins than they have', '{T}\'s point differential is ahead of their record, and that usually catches up'] })],
  [/^picked team has the clear talent edge|^talent edge$/, () => ({ k: 'talent', w: 1.8, pol: 1, alts: ['{T} simply have more talent', 'the roster gap is real', 'man for man, {T} are better', '{T} have the better players, and it isn\'t close', 'the best players in this game wear {T} colors', '{T} are deeper and better at the top',
    'there\'s a talent gap and it runs toward {T}', 'line them up position by position and {T} win most of them', 'more future pros on the {T} side', '{T} can roll out more good players than {O} can'] })],
  [/^opponent has the clear talent edge/, () => ({ k: 'otalent', w: 1.2, pol: 0, alts: ['{O} have more talent on paper, which is exactly why the price is right', 'the talent sits with {O}, but the number already knows it', '{O} have the better roster, and the line overpays for it', 'yes, {O} have the names, and {T} have the price'] })],
  [/^picked team owns a top-vs-bottom unit mismatch/, () => ({ k: 'mismatch', w: 1.8, pol: 1, alts: ['one of {T}\'s best units lines up against one of the worst', 'there\'s a top-versus-bottom mismatch {T} can lean on', '{T} get a strength against a weakness, and that decides games', 'one side of this matchup is lopsided in {T}\'s favor', '{T} can pick on a weak spot all night', 'a strength of {T}\'s runs straight into a hole for {O}'] })],
  [/^opponent owns a top-vs-bottom unit mismatch/, () => ({ k: 'omismatch', w: 0.6, pol: -1, alts: ['{O} have a mismatch to lean on, which is the worry'] })],
  [/^opponent on (?:a )?back-to-back$/, () => ({ k: 'ob2b', w: 1.7, pol: 1, alts: ['{O} played last night', '{O} are on the second night of a back-to-back', '{O} come in on tired legs', '{O} are running on fumes from last night', 'a back-to-back for {O}, and those legs feel it late', '{O} had no rest'] })],
  [/^picked team rested, opponent on back-to-back$|^rest edge$/, () => ({ k: 'rest', w: 2, pol: 1, alts: ['{T} are rested and {O} aren\'t', 'fresh legs against tired ones', '{T} had the night off while {O} were playing', 'a rest edge: {T} sat, {O} played', 'one team slept in its own bed, the other just played'] })],
  [/^picked team on (\d)\w\w night of back-to-back$/, () => ({ k: 'sb2b', w: 0.6, pol: 0, alts: ['{T} are on a back-to-back themselves, which I don\'t love', 'tired legs for {T} too, so it\'s not all roses', '{T} played last night, worth keeping in mind'] })],
  [/^[+-]?[\d.]* ?([A-Z][A-Z0-9&'.-]*) on a back-to-back$/, (m, X) => isO(X, m[1]) ? { k: 'ob2b', w: 1.7, pol: 1, alts: [`${nmx(X, m[1])} played last night`, `${nmx(X, m[1])} are on the second night of a back-to-back`, `${nmx(X, m[1])} have tired legs`] } : isT(X, m[1]) ? { k: 'sb2b', w: 0.6, pol: 0, alts: [`${nmx(X, m[1])} are on a back-to-back, which I don't love`] } : { k: 'b2b', w: 0.8, pol: 0, alts: [`${nmx(X, m[1])} played last night`] }],
  [/opponent on its (\d)\w\w game in (\d) nights/, m => ({ k: 'o3in4', w: 1.6, pol: 1, alts: [`{O} are on their ${ord(+m[1])} game in ${nw(+m[2])} nights`, `that's game ${nw(+m[1])} in ${nw(+m[2])} nights for {O}`, `{O}'s schedule has been brutal: ${nw(+m[1])} games in ${nw(+m[2])} nights`] })],
  [/^picked team playing its (\d)\w\w game in (\d) nights/, m => ({ k: 's3in4', w: 0.5, pol: 0, alts: [`{T} are on their ${ord(+m[1])} game in ${nw(+m[2])} nights, so this isn't free`] })],
  [/on its (\d)\w\w straight road game/, m => ({ k: 'road3', w: 0.8, pol: 0, alts: [`{T} are on road game number ${nw(+m[1])} in a row`, `a long road trip for {T}, ${nw(+m[1])} straight away from home`, `{T} have been living out of a suitcase, ${ord(+m[1])} straight road game`] })],
  [/^picked team on a short week/, () => ({ k: 'short', w: 0.5, pol: 0, alts: ['{T} are on a short week'] })],
  [/^picked team off a bye/, () => ({ k: 'bye', w: 1.5, pol: 1, alts: ['{T} are coming off a bye', '{T} had two weeks to get ready for this', 'extra rest and an extra week of prep for {T}'] })],
  [/^opponent on a short week$/, () => ({ k: 'oshort', w: 1.4, pol: 1, alts: ['{O} are on a short week', '{O} had less time to prepare', 'a quick turnaround for {O}'] })],
  [/^opponent off a bye$/, () => ({ k: 'obye', w: 0.6, pol: 0, alts: ['{O} are coming off a bye', '{O} had an extra week to prepare', '{O} are rested off the bye week'] })],
  [/^picked team has (\d)\+ more days of rest/, m => ({ k: 'restplus', w: 1.6, pol: 1, alts: [`{T} have at least ${nw(+m[1])} more days of rest`, `the rest edge belongs to {T}`, `{T} are the fresher team by ${nw(+m[1])} days or more`] })],
  [/won (\d+)\+ of its last (\d+)/, m => ({ k: 'form', w: 1.8, pol: 1, alts: [`{T} have won ${nw(+m[1])} of their last ${nw(+m[2])}`, `${nw(+m[1])} wins in the last ${nw(+m[2])} for {T}`, `{T} are rolling: ${nw(+m[1])} of ${nw(+m[2])}`, `{T} have been winning, ${nw(+m[1])} of the last ${nw(+m[2])}`] })],
  [/^picked team won (\d) or fewer of its last (\d)/, m => ({ k: 'cold', w: 0.7, pol: 0, alts: [`{T} have won ${nw(+m[1])} or fewer of their last ${nw(+m[2])}, which is where the value hides`, `{T} have been cold, and the price reflects it`] })],
  [/^west-coast team at a 1pm ET/, () => ({ k: 'west', w: 1.2, pol: 0, alts: ['a west-coast team playing at what feels like 10 in the morning', 'body clocks matter, and one team\'s says breakfast'] })],
  [/^west-coast team in a night game/, () => ({ k: 'westn', w: 1.2, pol: 0, alts: ['a night game where the west-coast team has the body-clock edge', 'late kick, and the west-coast team is wide awake'] })],
  [/^Eastern team in a night game/, () => ({ k: 'eastn', w: 0.8, pol: 0, alts: ['an Eastern team playing late against a west-coast team'] })],
  [/^picked team's QB is top (\d+)% in passer rating/, m => ({ k: 'qb', w: 1.8, pol: 1, alts: [`{T} have a top-${m[1]}% quarterback`, `{T}'s quarterback is one of the best in the country`, `the quarterback edge is {T}'s`, `{T} trust their quarterback, and they should`] })],
  [/^picked team's QB is bottom/, () => ({ k: 'qbb', w: 0.4, pol: -1, alts: ['{T}\'s quarterback play is the worry'] })],
  [/^opponent QB is bottom (\d+)%/, m => ({ k: 'oqbb', w: 1.8, pol: 1, alts: [`{O}'s quarterback is bottom ${m[1]}% in passer rating`, `{O} have a quarterback problem`, `{O} can't count on their quarterback`, `the quarterback on the other side is struggling`] })],
  [/^opponent QB is top/, () => ({ k: 'oqb', w: 0.4, pol: -1, alts: ['{O} have a quarterback who can steal this'] })],
  [/^picked team's QB is fading/, () => ({ k: 'qbf', w: 0.3, pol: -1, alts: ['{T}\'s quarterback has been fading'] })],
  [/^picked team's main goalie is top (\d+)%/, m => ({ k: 'g', w: 1.8, pol: 1, alts: [`{T}'s goalie is top ${m[1]}% in save percentage`, `{T} have the better goalie`, `the man in {T}'s net has been stopping everything`] })],
  [/^opponent's main goalie is bottom (\d+)%/, m => ({ k: 'ogb', w: 1.8, pol: 1, alts: [`{O}'s goalie is bottom ${m[1]}% in save percentage`, `{O} have a goaltending problem`, `{O}'s net has been leaking`] })],
  [/^picked team's main goalie is bottom/, () => ({ k: 'gb', w: 0.3, pol: -1, alts: ['{T}\'s goaltending is the worry'] })],
  [/^opponent's main goalie is top/, () => ({ k: 'og', w: 0.3, pol: -1, alts: ['{O} have a hot goalie, which is the risk'] })],
  [/^big spread/, () => ({ k: 'bigline', w: 0.8, pol: 0, alts: ['it\'s a big number', 'a lot of points on the line', 'a double-digit spread', 'big spread, big gap between these teams'] })],
  [/^spread on the (\d+)/, m => ({ k: 'key', w: 1.2, pol: 0, alts: [`the spread sits right on ${m[1]}, a key number`, `${m[1]} is a number games land on, and this line is sitting on it`, `a line on the ${m[1]}, which matters in football`] })],
  [/^game at altitude/, () => ({ k: 'alt', w: 1.2, pol: 0, alts: ['it\'s played at altitude, thin air and heavy legs', 'altitude game: the visitors feel it late', 'the air up there wears teams down'] })],
  [/^wind 15/, () => ({ k: 'wind', w: 1.2, pol: 0, alts: ['the wind is blowing 15-plus', 'wind is a factor, 15 miles an hour or more', 'a windy one'] })],
  [/^freezing/, () => ({ k: 'cold32', w: 1, pol: 0, alts: ['it\'s freezing out there', 'cold weather game', 'below freezing at kickoff'] })],
  [/^indoors \(dome\)$/, () => ({ k: 'dome', w: 0.8, pol: 0, alts: ['it\'s indoors, so no weather to hide behind', 'dome game, clean conditions', 'no wind, no rain, just football'] })],
  [/^hitter-friendly ballpark$/, () => ({ k: 'hpark', w: 1.2, pol: 0, alts: ['a hitter-friendly park', 'the ball carries in this park'] })],
  [/^pitcher-friendly ballpark$/, () => ({ k: 'ppark', w: 1.2, pol: 0, alts: ['a pitcher-friendly park', 'a big park that eats fly balls'] })],
  [/^ballpark with a roof$/, () => ({ k: 'roof', w: 0.6, pol: 0, alts: ['roof park, no weather'] })],
  [/^interleague game/, () => ({ k: 'il', w: 0.6, pol: 0, alts: ['an interleague game'] })],
  [/leads the head-to-head series|^head-to-head edge$/, () => ({ k: 'h2h', w: 1.6, pol: 1, alts: ['{T} own this series', 'history between these two favors {T}', '{T} have had {O}\'s number', 'when these two meet, {T} usually walk away happy'] })],
  [/trails the head-to-head series/, () => ({ k: 'h2hl', w: 0.6, pol: 0, alts: ['{O} have owned this series, but that\'s the past', 'the head-to-head leans {O}, and I\'m fine fading it'] })],
  [/^[+-]?[\d.]* ?(\S+) revenge: lost the last meeting(?: \((\d{4})\))?/, (m, X) => { const t = nmx(X, m[1]), mine = isT(X, m[1]);
    return { k: 'revenge', w: mine ? 1.6 : 0.6, pol: mine ? 1 : 0, alts: mine ? [`${t} lost the last time these two met`, `a revenge spot for ${t}`, `${t} have this one circled after the last meeting`, `${t} remember how the last one went`] : [`${t} lost the last meeting, so expect their best`] }; }],
  [/^[+-]?[\d.]* ?(\S+) bounce-back after losing by (\d+)/, (m, X) => ({ k: 'bounce', w: isT(X, m[1]) ? 1.4 : 0.6, pol: isT(X, m[1]) ? 1 : 0, alts: [`${nmx(X, m[1])} are coming off a ${m[2]}-point loss`, `${nmx(X, m[1])} got beat by ${m[2]} last time out, and teams answer that`] })],
  [/^[+-]?[\d.]* ?(\S+) last (\d): ((?:[WL]c? ?)+)$/, (m, X) => { const t = nmx(X, m[1]), R = m[3].trim().split(/\s+/), w = R.filter(x => x[0] === 'W').length, c = R.filter(x => /c$/.test(x)).length, n = R.length;
    if (!isT(X, m[1])) return null; return { k: 'last3', w: 1.6, pol: 1, alts: [c === n ? `${t} have covered ${nw(n)} straight` : `${t} have covered ${nw(c)} of their last ${nw(n)}`, w === n ? `${t} have won ${nw(n)} in a row` : `${t} are ${rec(w, n - w)} in their last ${nw(n)}`, `${t} keep beating the number, ${nw(c)} of ${nw(n)}`] }; }],
  [/^[+-]?[\d.]* ?(\S+) as a dog: (\d+)-(\d+)(?:-\d+)? outright/, (m, X) => ({ k: 'dogrec', w: 1.6, pol: 1, alts: [`${nmx(X, m[1])} are ${m[2]}-${m[3]} straight up as an underdog`, `as a dog, ${nmx(X, m[1])} have won ${nw(+m[2])} of ${nw(+m[2] + +m[3])} outright`, `${nmx(X, m[1])} like being the underdog: ${m[2]}-${m[3]} outright`] })],
  [/^[+-]?[\d.]* ?(\S+) as a dog: (\d+)-(\d+)(?:-(\d+))? against the spread/, (m, X) => ({ k: 'dogats', w: 1.6, pol: 1, alts: [`${nmx(X, m[1])} are ${m[2]}-${m[3]} against the spread as a dog`, `give ${nmx(X, m[1])} points and they cover: ${m[2]}-${m[3]}`, `${nmx(X, m[1])} cover as underdogs, ${m[2]} of ${+m[2] + +m[3]}`] })],
  [/^[+-]?[\d.]* ?(\S+) as a favorite: (\d+)-(\d+)/, (m, X) => ({ k: 'favrec', w: 1.2, pol: +m[2] >= +m[3] ? 1 : 0, alts: [`${nmx(X, m[1])} are ${m[2]}-${m[3]} as a favorite`, `${m[2]}-${m[3]} for ${nmx(X, m[1])} when they're laying it`] })],
  [/^[+-]?[\d.]* ?(\S+) covers as a favorite: (\d+)-(\d+)/, (m, X) => { const t = nmx(X, m[1]), w = +m[2], l = +m[3]; return isT(X, m[1]) ? (w >= l ? { k: 'favats', w: 1.4, pol: 1, alts: [`${t} cover as favorites, ${rec(w, l)}`] } : null) : { k: 'ofavats', w: 1.4, pol: 1, alts: [`${t} are ${rec(w, l)} covering as a favorite`, `laying points with ${t} has gone ${rec(w, l)}`, `${t} don't cover big numbers: ${rec(w, l)} as the favorite`] }; }],
  [/the triangle: (\S+) drops games to dogs, (\S+) beats favorites/, (m, X) => ({ k: 'tri', w: 1.6, pol: 1, alts: [`${nmx(X, m[1])} drop games to underdogs and ${nmx(X, m[2])} beat favorites`, `${nmx(X, m[2])} love playing spoiler, and ${nmx(X, m[1])} let dogs hang around`] })],
  [/power says (\S+) by (-?[\d.]+), the line says ([+-]?[\d.]+)/, (m, X) => { const t = nmx(X, m[1]), b = +m[2]; return { k: 'power', w: 2.4, pol: 1, alts: b >= 0 ? [`the power ratings have ${t} by ${r1(b)}, and the line only says ${m[3].replace('+', '')}`, `my ratings make it ${t} by ${r1(b)}, and the book has ${m[3].replace('+', '')}`, `on my board ${t} are ${r1(b)} better, and the spread is ${m[3].replace('+', '')}`]
    : [`the power ratings have this closer than the line: ${t} by ${r1(b)} against ${m[3]}`, `my ratings see ${r1(-b)} points the other way, and the book has ${m[3]}`] }; }],
  [/^(\S+)'s offense \(([\d.]+) a game\) vs (\S+)'s defense \(allows ([\d.]+)\)$/, (m, X) => ({ k: 'offdef', w: 2, pol: 1, alts: [`${nmx(X, m[1])} score ${r1(m[2])} a game against a ${nmx(X, m[3])} defense allowing ${r1(m[4])}`, `an offense scoring ${r1(m[2])} a game against a defense giving up ${r1(m[4])}`, `${nmx(X, m[1])} average ${r1(m[2])} and ${nmx(X, m[3])} allow ${r1(m[4])}`] })],
  [/^my (final|score) (\S+) (\d+) [–-] (\d+) (\S+)(?: vs the line ([+-]?[\d.]+))?$/, (m, X) => { const a = nmx(X, m[2]), h = nmx(X, m[5]), x = +m[3], y = +m[4], d = Math.abs(x - y), win = x > y ? a : h;
    return { k: 'final', w: 2.6, pol: 1, alts: [`my final is ${a} ${x}, ${h} ${y}`, `I've got it ${x}-${y}, ${win} by ${nw(d)}`, `I see ${win} winning by ${nw(d)}, ${Math.max(x, y)} to ${Math.min(x, y)}`, `my score: ${a} ${x}, ${h} ${y}${m[6] ? `, against a line of ${m[6]}` : ''}`, `put it down as ${x}-${y}`,
      ...(X.mk === 'total' && X.L != null ? [`that's ${x + y} points against a total of ${r1(X.L)}`] : [])] }; }],
  [/^my total ([\d.]+) vs ([\d.]+)/, m => ({ k: 'mytot', w: 2.6, pol: 1, alts: [`I have this landing around ${r1(m[1])}, and the line is ${r1(m[2])}`, `my number is ${r1(m[1])}, the book says ${r1(m[2])}`, `${r1(m[2])} looks ${+m[1] > +m[2] ? 'low' : 'high'} to me, I see about ${r1(m[1])}`, `I keep getting ${r1(m[1])} against a ${r1(m[2])} line`, `${Math.abs(+m[1] - +m[2]) >= 1 ? r1(Math.abs(+m[1] - +m[2])) + ' points of room' : 'a little room'} between my ${r1(m[1])} and the book's ${r1(m[2])}`] })],
  [/^(\S+): ([\d.]+) threes, ([\d.]+) twos, ([\d.]+) FT$/, (m, X) => { const pts = 3 * +m[2] + 2 * +m[3] + +m[4]; return { k: 'build', w: 2, pol: 0, alts: [`${nmx(X, m[1])}: about ${r1(m[2])} threes, ${r1(m[3])} twos and ${r1(m[4])} free throws, call it ${rn(pts)}`, `I build ${nmx(X, m[1])} to ${rn(pts)}: ${r1(m[2])} from deep, ${r1(m[3])} inside, ${r1(m[4])} at the line`, `${nmx(X, m[1])} get to ${rn(pts)} the way I count it`] }; }],
  [/^(\S+): ([\d.]+) TD × ([\d.]+) \+ ([\d.]+) FG$/, (m, X) => { const pts = +m[2] * +m[3] + 3 * +m[4]; return { k: 'build', w: 2, pol: 0, alts: [`${nmx(X, m[1])}: about ${r1(m[2])} touchdowns and ${r1(m[4])} field goals, call it ${rn(pts)}`, `I count ${nmx(X, m[1])} to ${rn(pts)} points`, `${r1(m[2])} trips to the end zone for ${nmx(X, m[1])}, plus ${r1(m[4])} field goals`] }; }],
  [/^(\S+): ([\d.]+) shots × ([\d.]+)%$/, (m, X) => { const g = +m[2] * +m[3] / 100; return { k: 'build', w: 2, pol: 0, alts: [`${nmx(X, m[1])} put about ${rn(m[2])} shots on net at ${r1(m[3])}%, roughly ${r1(g)} goals`, `${nmx(X, m[1])}: ${rn(m[2])} shots, ${r1(m[3])}% finishing`, `I have ${nmx(X, m[1])} around ${r1(g)} goals on ${rn(m[2])} shots`] }; }],
  [/^(\d+) possessions$/, (m, X) => { const n = +m[1], P = PACE[X.sp] || [66, 71], pace = n < P[0] ? 'slow' : n > P[1] ? 'fast' : 'steady'; return { k: 'pace', w: (pace === 'fast' && X.sd === 'over') || (pace === 'slow' && X.sd === 'under') ? 2 : 1, pol: (pace === 'fast' && X.sd === 'under') || (pace === 'slow' && X.sd === 'over') ? -1 : 0,
    alts: [`about ${n} possessions, a ${pace} pace`, `${n} trips each way, ${pace === 'fast' ? 'plenty of chances' : pace === 'slow' ? 'every one of them matters' : 'right about normal'}`, `I count ${n} possessions`] }; }],
  [/^outside consensus ([\d.]+) vs ([\d.]+)$/, m => ({ k: 'cons', w: 2, pol: 1, alts: [`the outside consensus sits at ${r1(m[1])} against a ${r1(m[2])} line`, `everyone outside this building has it around ${r1(m[1])}, and the book says ${r1(m[2])}`, `the outside projections average ${r1(m[1])}`] })],
  [/^outside consensus (\S+) by ([\d.]+)/, (m, X) => ({ k: 'cons', w: 2, pol: 1, alts: [`the outside consensus has ${nmx(X, m[1])} by ${r1(m[2])}`, `everyone outside this building lands on ${nmx(X, m[1])} by about ${r1(m[2])}`, `the outside numbers make it ${nmx(X, m[1])} by ${r1(m[2])}`] })],
  [/^outside consensus (\S+) (\d+)% to win/, (m, X) => ({ k: 'cons', w: 1.8, pol: 1, alts: [`the outside consensus gives ${nmx(X, m[1])} ${m[2]}%`, `outside forecasts put ${nmx(X, m[1])} at ${m[2]}% to win`] })],
  [/^DRatings (\S+) ([\d.]+)[–-]([\d.]+) (\S+)$/, (m, X) => ({ k: 'drat', w: 1.8, pol: 1, alts: [`DRatings projects ${nmx(X, m[1])} ${r1(m[2])}, ${nmx(X, m[4])} ${r1(m[3])}`, `DRatings has it ${rn(m[2])}-${rn(m[3])}`] })],
  [/^DRatings: ([\d.]+) total/, m => ({ k: 'drat', w: 1.8, pol: 1, alts: [`DRatings has the total at ${r1(m[1])}`, `DRatings lands at ${r1(m[1])} points`] })],
  [/^DRatings: (\S+) by ([\d.]+)/, (m, X) => ({ k: 'drat', w: 1.8, pol: 1, alts: [`DRatings has ${nmx(X, m[1])} by ${r1(m[2])}`] })],
  [/^DRatings (\S+) (\d+)%$/, (m, X) => ({ k: 'drat', w: 1.6, pol: 1, alts: [`DRatings gives ${nmx(X, m[1])} ${m[2]}%`, `DRatings lands at ${m[2]}%`] })],
  [/^ESPN FPI\/BPI (\S+) (\d+)%$/, (m, X) => ({ k: 'fpi', w: 1.6, pol: 1, alts: [`ESPN's ratings give ${nmx(X, m[1])} ${m[2]}%`, `FPI is at ${m[2]}% too`, `ESPN's index has ${nmx(X, m[1])} at ${m[2]}%`] })],
  [/^Kalshi (\S+) (\d+)%$/, (m, X) => ({ k: 'mkt', w: 1.6, pol: 1, alts: [`Kalshi's market has ${nmx(X, m[1])} at ${m[2]}%`, `money on Kalshi says ${m[2]}%`, `the prediction market prices ${nmx(X, m[1])} at ${m[2]}%`] })],
  [/^Polymarket (\S+) (\d+)%$/, (m, X) => ({ k: 'mkt', w: 1.6, pol: 1, alts: [`Polymarket has ${nmx(X, m[1])} at ${m[2]}%`, `the money on Polymarket says ${m[2]}%`] })],
  [/^OddsShark computer (\S+) (\d+)[–-](\d+) (\S+)$/, (m, X) => ({ k: 'oshark', w: 1.4, pol: 1, alts: [`OddsShark's computer spits out ${nmx(X, m[1])} ${m[2]}-${m[3]}`, `the OddsShark computer has it ${m[2]}-${m[3]}`] })],
  [/rating systems \(Prediction Tracker\): (\S+) by ([\d.]+)/, (m, X) => ({ k: 'pt', w: 1.6, pol: 1, alts: [`the rating systems average ${nmx(X, m[1])} by ${r1(m[2])}`] })],
  [/^(\d+)-(\d+) on him before$/, m => ({ k: 'onhim', w: 2.4, pol: +m[1] >= +m[2] ? 1 : 0, alts: [`we're ${m[1]}-${m[2]} on him already`, `he's been good to us: ${m[1]}-${m[2]}`, `${m[1]}-${m[2]} when we've backed him`, `the track record on him is ${m[1]}-${m[2]}`] })],
  [/against the spread$/, () => ({ k: 'ats', w: 1, pol: 1, alts: ['the cover record backs it up'] })]];
/* the desk's housekeeping and anything cut off mid-word never reads out loud */
const DROP = [/^Pickswise/, /still learning these sources|too few graded/i, /three seasons: .* pct$/];
const cutOff = s => /[-–:(,]$/.test(s) || ((s.match(/\(/g) || []).length > (s.match(/\)/g) || []).length) || (/\b(a ga\w*|the line s\w*|favori\w*|against(?: the s\w*)?|ag|sprea|a g)$/i.test(s) && !/(a game\)|against the spread|favorite)$/i.test(s));
function facts(note, X) { const out = [], seen = new Set();
  for (let raw of String(note || '').split(/\s*·\s*/)) {
    raw = raw.replace(/\s*—\s*$/, '').replace(/^his (final|score|total)\b/i, 'my $1').trim(); if (!raw || DROP.some(re => re.test(raw))) continue;
    const bare = raw.replace(/^[+-]\d+(\.\d+)?\s+(?=\D)/, '');
    let f = null; for (const [re, mk] of READERS) { const m = bare.match(re) || raw.match(re); if (m) { try { f = mk(m, X); } catch (e) { f = null; } if (f === null) f = { skip: 1 }; break; } }
    if (f && f.skip) continue;
    if (!f) { if (cutOff(bare)) continue; const s = bare.replace(/\s*\((Scout|Pythagorean)\)/g, ''); f = { k: 'raw:' + s.slice(0, 24), w: 0.7, pol: 0, alts: [low(s)] }; }
    if (!f.alts || !f.alts.length || seen.has(f.k + f.alts[0])) continue; seen.add(f.k + f.alts[0]); out.push(f); }
  return out; }

/* ── how each character talks: openers (op), sign-offs (cl), joining words (and), asides (as), and the facts it reaches for first ── */
const P = {
  Sim: { op: ['I ran this one all week.', 'Ten thousand runs, same story.', 'The numbers don\'t blink here.', 'Played it out start to finish.', 'Every time I sim it, it lands the same way.', 'Clean read.', 'This one isn\'t close in my runs.', 'Simple math.', 'Here\'s what keeps showing up.', 'Numbers first.', 'I don\'t do feelings.', 'Ran it again this morning.', 'The runs agree with each other, which is rare.', 'Okay, the count.', 'I let the games play out.', 'The machine has an opinion.', 'Cold numbers, warm feeling.', 'Same answer, different seed.'],
    cl: ['It holds up in almost every run.', 'That\'s where the numbers live.', 'I\'ll take that every time.', 'Nothing in the runs scares me off.', 'The model sleeps fine on it.', 'That\'s the play.', 'The count says yes.', 'Run it back, same result.', 'No narrative needed.', '', '', ''], and: ['and', 'plus', 'on top of that,', 'and also'],
    as: ['That\'s not a hunch, that\'s a count.', 'The machine doesn\'t care about the story.', 'I just count what happens.', 'Variance is real, so is this.'], pref: { mytot: 2, final: 2, avg: 1.6, build: 1.4, pace: 1.4, power: 1.2 } },
  Judge: { op: ['I\'ve heard everyone out.', 'The evidence is in.', 'Let\'s be clear about this one.', 'Nobody in the room argued against it.', 'Case closed for me.', 'I listened. Here\'s where I land.', 'Weigh it all and it tips one way.', 'Plain and simple.', 'The facts are the facts.', 'Every voice I trust points here.', 'Let the record show.', 'Order in the court.', 'Here\'s my ruling.', 'Exhibit A.', 'I\'ve read the briefs.', 'The testimony lines up.', 'Objection overruled.', 'On the merits:'],
    cl: ['That\'s my ruling.', 'I don\'t need more than that.', 'Next case.', 'Hard to argue with.', 'It\'s not even close.', 'Decided.', 'So ordered.', 'Sustained.', 'The verdict stands.', '', '', ''], and: ['and', 'add to that,', 'also,', 'and the record shows'],
    as: ['I don\'t take a side until the witnesses talk.', 'The evidence, not the noise.', 'I weigh testimony, not volume.'], pref: { cons: 1.8, fpi: 1.6, drat: 1.6, mkt: 1.5, power: 1.3, book: 1.2 } },
  Coach: { op: ['Been around enough locker rooms to know this one.', 'Here\'s what I see from the sideline.', 'Forget the hype for a second.', 'I like how this sets up.', 'Watch the legs in this one.', 'This is a schedule game.', 'Talk to anyone who\'s played it.', 'My gut and my notes agree.', 'Let me keep it simple.', 'You can feel this one.', 'Listen.', 'Look, kid.', 'I\'ve been in this spot.', 'Film doesn\'t lie.', 'I drew this one up already.', 'Tape and travel tell it.', 'Effort shows up in spots like this.', 'Here\'s the scouting report.'],
    cl: ['I\'d play it.', 'Effort shows up. Trust it.', 'That\'s the whole scouting report.', 'Ride it.', 'I\'ve seen it a hundred times.', 'Run the play.', 'Legs decide it.', 'That\'s winning ball.', 'Bodies get tired. That\'s the game.', '', '', ''], and: ['and', 'and on top of that', 'plus', 'and don\'t forget'],
    as: ['Legs matter. Schedules matter.', 'You don\'t win on paper, you win in the spot.', 'Bodies get tired, that\'s every sport.'], pref: { rest: 2, ob2b: 2, o3in4: 2, restplus: 1.8, bye: 1.6, oshort: 1.6, road3: 1.4, revenge: 1.5, bounce: 1.5, form: 1.3 } },
  'Most common': { op: ['I build it from the ground up.', 'Add it up piece by piece.', 'My final looks like this.', 'Count it out.', 'I don\'t care about names, just totals.', 'When I put the parts together,', 'The math is boring, and that\'s the point.', 'Box score first, feelings never.', 'Here\'s the tally.', 'Simple sum.', 'I keep the book.', 'Final score first.', 'Write this one down.', 'Piece by piece.', 'I add, I don\'t guess.', 'Pencil out, here goes.'],
    cl: ['That\'s the number.', 'Bank it.', 'The math checks out.', 'I don\'t need a story.', 'Write it down.', 'Add it up yourself.', 'That\'s the sum.', '', '', ''], and: ['and', 'plus', 'also'],
    as: ['Most nights it lands right around there.', 'I\'m not here for the fireworks, just the final.'], pref: { build: 2.4, avg: 2, final: 2, mytot: 1.8, pace: 1.6, past: 1.3, bookou: 1.2 } },
  Pred: { op: ['I\'ve been listening.', 'Word around the room is loud on this one.', 'Everyone sharp I hear lands on the same side.', 'The markets are talking.', 'Ask around.', 'My sources line up.', 'Money and minds agree here.', 'It\'s rare everyone agrees. They do here.', 'I hear things.', 'Quiet consensus.', 'The room outside is talking.', 'I hear a lot of voices.', 'The forecasters have spoken.', 'Listen to the chatter.', 'The smart money left footprints.'],
    cl: ['When this many agree, I listen.', 'That\'s the room talking, not me.', 'Follow the money.', 'I trust the chorus on this one.', 'The market rarely whispers this loud.', '', '', ''], and: ['and', 'while', 'and on top of it', 'and meanwhile'],
    as: ['When the outside world agrees, I pay attention.', 'The best forecasters in the world are leaning one way.'], pref: { mkt: 2.2, fpi: 2, drat: 2, cons: 2, oshark: 1.6, pt: 1.6 } },
  Covers: { op: ['The outside world sees it too.', 'Checking what the rest of the industry thinks.', 'Outside the building, same read.', 'The computers agree.', 'Other shops land here too.', 'Not just us.', 'Somebody else\'s computer, my call.', 'Outside opinion, straight up.', 'I don\'t trust the building, I trust the computer.'],
    cl: ['Good to have company.', 'Outside and inside, same answer.', 'An honest outside number beats a loud inside one.', '', '', ''], and: ['and', 'plus', 'and again'],
    as: ['I don\'t need the noise in here.'], pref: { oshark: 2, drat: 2, cons: 1.8, final: 1.6, pt: 1.6 } },
  Trends: { op: ['History has a say here.', 'I\'ve seen this before. Many times.', 'Old box scores tell the story.', 'The past rhymes.', 'Let me take you back.', 'This spot has a history.', 'Go look it up.', 'Patterns don\'t lie.', 'We\'ve seen this movie before.', 'Pull up a chair.', 'I remember games like this.', 'The archives are clear.', 'History doesn\'t repeat, but it rhymes.'],
    cl: ['History usually wins.', 'It keeps happening.', 'Same story, new season.', 'Old habits die hard.', 'Look it up.', '', '', ''], and: ['and', 'plus', 'and, as usual,'],
    as: ['The past isn\'t a promise, but it\'s a pretty good hint.', 'Old habits die hard in this league.'], pref: { past: 2.4, form: 2, last3: 2, h2h: 2, dogrec: 1.8, dogats: 1.8, favrec: 1.6, ofavats: 1.6, tri: 1.6, bookou: 1.3 } },
  Consensus: { op: ['Everybody\'s on this one.', 'The public is all in.', 'The people have spoken.', 'Tickets are piling up here.', 'Count the hands in the air.', 'Popular call, and for once I don\'t mind.', 'I read the room.', 'The crowd is loud tonight.', 'Follow the people, this time.'],
    cl: ['Sometimes the crowd is right.', 'Ride with the people.', 'Loud and right, for once.', '', '', ''], and: ['and', 'plus'], as: ['The crowd isn\'t always wrong, just usually overpriced.'], pref: { cons: 2, mkt: 1.5, rec: 1.3 } },
  Power: { op: ['On my board, it\'s not close.', 'Pecking order matters.', 'Rank them and it\'s obvious.', 'Better team, by a clear margin.', 'My ratings say one thing.', 'Put them side by side.', 'Rankings don\'t lie for long.', 'By the standings,', 'Order matters.', 'The table says it plainly.', 'Check the board.', 'Line them up by rating.', 'The hierarchy holds.'],
    cl: ['The better team usually wins.', 'Ratings don\'t lie much.', 'Order restored.', 'The board knows.', 'Class tells.', '', '', ''], and: ['and', 'plus'],
    as: ['Good teams beat bad teams more than people think.', 'Talent rises over a season.'], pref: { power: 2.4, rec: 2.2, avg: 1.8, talent: 1.5, form: 1.3 } },
  Dog: { op: ['I love a dog with teeth.', 'Everybody wants the favorite. Not me.', 'Points and a chance.', 'Here\'s a live one.', 'The little guy has a shot.', 'I\'ll take the points and the upside.', 'Don\'t sleep on this one.', 'Here\'s a dog with a bite.', 'I love a team nobody believes in.', 'Barking already.', 'Give me the team nobody wants.', 'Underdogs pay rent here.'],
    cl: ['Dogs bite.', 'Give me the points.', 'Underdog season.', 'Plus money cures a lot.', 'Let them doubt.', '', '', ''], and: ['and', 'plus', 'and get this,'],
    as: ['The underdog only has to be good enough tonight.', 'Plus money cures a lot of worries.'], pref: { dogrec: 2.4, dogats: 2.4, hdog: 2.2, tri: 2, otalent: 1.6, pythdn: 1.6, ofavats: 1.8 } },
  Scout: { op: ['Watch the players, not the logo.', 'I\'ve watched the tape.', 'Talent wins, eventually.', 'The best player out there matters.', 'Eyes on the matchup.', 'From the scouting notebook:', 'It\'s about who\'s out there.', 'Eyes on the field.', 'I\'ve been watching film.', 'Look at the personnel.', 'Matchups decide this one.', 'I see it on tape.', 'Bodies and skill, that\'s the scouting report.'],
    cl: ['Talent shows up.', 'Stars take over games like this.', 'Watch it happen.', 'Tape doesn\'t lie.', 'The matchup wins it.', '', '', ''], and: ['and', 'plus', 'and honestly'],
    as: ['Games are won by people, not spreadsheets.', 'The guy with the hot hand changes everything.'], pref: { talent: 2.2, mismatch: 2.2, offedge: 2, defedge: 2, qb: 2, oqbb: 2, g: 2, ogb: 2, offdef: 1.8, avg: 1.2 } },
  Banker: { op: ['I only put money where the books agree.', 'The ledger says yes.', 'Strongest account on the board.', 'Every book I keep likes it.', 'Safe deposit.', 'Here\'s where I\'d put real money.', 'Business, not feelings.', 'Follow the money.', 'I don\'t care who wins.', 'Balance sheet first.', 'The books are balanced on this one.'],
    cl: ['That\'s where I\'m invested.', 'Solid ground.', 'Deposit it.', 'Bottom line.', 'Interest accrues.', '', '', ''], and: ['and', 'plus'],
    as: ['A good team at a bad price is a bad bet.'], pref: { book: 2, bookou: 2, cons: 1.6, power: 1.4, mkt: 1.4 } },
  Brain: { op: ['This is the gray zone I live in.', 'Fair price, real edge.', 'Think about it for a second.', 'The obvious answer isn\'t always right. Here it is.', 'Strategy over noise.', 'I noticed something.', 'Let me put it together.', 'All the voices are in.', 'Weigh it, don\'t feel it.', 'Here\'s the angle.'],
    cl: ['Edges are edges.', 'Smart money.', 'Think, then bet.', 'The angle holds.', '', '', ''], and: ['and', 'plus', 'and the other piece:'],
    as: ['I don\'t have one idea, I have all of them, weighted.'], pref: { power: 1.8, cons: 1.8, mytot: 1.5, book: 1.5, bookou: 1.5, avg: 1.4 } } };
/* the heirs: their kind's attitude, with a parent's voice mixed in */
const KIND = {
  Steady: { op: ['No rush on this one.', 'Patience got me here.', 'I check it twice, then once more.', 'Slow and sure.', 'Same routine, same answer.', 'I don\'t chase. This one came to me.', 'Discipline first.', 'Measured read.', 'Steady hands on this one.', 'I grind these out.', 'The boring one is usually the right one.', 'Quiet pick, loud reasons.'],
    cl: ['Chalk, discipline, repeat.', 'That\'s the grind.', 'Steady wins.', 'One at a time.', 'Nothing fancy.', '', '', ''], as: ['The market is the check.', 'I don\'t need it to be exciting.'] },
  Prodigy: { op: ['Learned this from the best.', 'Born for spots like this.', 'I saw this before anyone told me.', 'Young, but not new to this.', 'They taught me well.', 'Golden child read.', 'I trust what\'s working.', 'Ride what\'s working.', 'This one\'s in my blood.', 'Fast learner, faster read.', 'I picked this up early.', 'Natural fit.'],
    cl: ['Ride what\'s working.', 'Family business.', 'Watch and learn.', 'I was made for this.', 'Easy money, earned the hard way.', '', '', ''], as: ['My parents would sign off on this.', 'Two minds in one.'] },
  Rebel: { op: ['Everyone else zigged.', 'I don\'t care what the room says.', 'Contrarian again.', 'Here\'s the one nobody wants.', 'Rules are suggestions.', 'Fight me on it.', 'I\'ll go the other way.', 'Against the grain.'],
    cl: ['Somebody has to.', 'Different is the point.', 'Let them laugh.', '', '', ''], as: ['The crowd is usually overpriced.'] },
  Prodigal: { op: ['I\'ve made mistakes. Not this one.', 'Back with a better read.', 'Learned the hard way.', 'Second chances, sharper eyes.', 'I know where I went wrong. Not here.', 'Fresh start.'],
    cl: ['Redemption tastes good.', 'Lesson learned.', 'Back on track.', '', '', ''], as: ['I learned from every miss.'] },
  Heir: { op: ['Here\'s my read.', 'Fresh eyes on it.', 'New voice, real reasons.', 'I like this one.', 'This sets up.', 'Mine, start to finish.', 'Look at it with me.'],
    cl: ['That\'s my call.', 'Mine, all mine.', '', '', ''], as: ['Still learning, never guessing.'] } };
const PARENT = { 'The Simulator': 'Sim', 'The Judge': 'Judge', 'The Coach': 'Coach', 'The Scorekeeper': 'Most common', 'The Oracle': 'Pred', 'Covers': 'Covers', 'The Historian': 'Trends', 'The Crowd': 'Consensus', 'The Commissioner': 'Power', 'The Underdog Spotter': 'Dog', 'The Scout': 'Scout', 'The Banker': 'Banker', 'The Brain': 'Brain' };
const GENERIC = { op: ['Here\'s my read.', 'Quick one.', 'I like this.', 'Straightforward.', 'Let me walk you through it.', 'Short version.', 'Here\'s the case.', 'Simple enough.', 'This one sets up.', 'Easy to explain.', 'Two reasons.', 'Look at this.'], cl: ['That\'s it.', 'That\'s the call.', 'Done.', '', '', ''], and: ['and', 'plus', 'also'], as: [], pref: {} };
function voiceOf(v, meta) {
  if (P[v]) return P[v];
  if (!meta || !meta.arch) return GENERIC;
  const kind = KIND[(String(meta.arch).match(/^(Steady|Prodigy|Rebel|Prodigal)/) || [])[1]] || KIND.Heir, pa = P[PARENT[meta.a]] || GENERIC, pb = P[PARENT[meta.b]] || GENERIC;
  const mix = (x, y, z) => [...x, ...y.filter((_, i) => i % 2 === 0), ...z.filter((_, i) => i % 3 === 0)];
  const pref = {}; [pa.pref || {}, pb.pref || {}].forEach(o => Object.entries(o).forEach(([k, w]) => { pref[k] = Math.max(pref[k] || 1, w); }));
  return { op: mix(kind.op, pa.op, pb.op), cl: mix(kind.cl, pa.cl, pb.cl), and: [...new Set([...(pa.and || []), ...(pb.and || [])])], as: [...kind.as, ...(pa.as || []).slice(0, 2), ...(pb.as || []).slice(0, 1)], pref, creed: meta.creed || '' }; }

/* ── putting a read together ── */
const lead = (op, f) => (!op ? cap(f) : /[,:]$/.test(op) ? `${op} ${f}` : `${op} ${cap(f)}`);
const SHAPES = [
  ({ op, f, cl }) => `${lead(op, f[0])}.${f[1] ? ' ' + cap(f[1]) + '.' : ''}${cl ? ' ' + cl : ''}`,
  ({ f, cl }) => `${cap(f[0])}.${f[1] ? ' ' + cap(f[1]) + '.' : ''}${cl ? ' ' + cl : ''}`,
  ({ f, and, cl }) => `${cap(f[0])}${f[1] ? `, ${and} ${f[1]}` : ''}.${cl ? ' ' + cl : ''}`,
  ({ op, f, and }) => `${lead(op, f[0])}${f[1] ? `, ${and} ${f[1]}` : ''}.`,
  ({ f, as }) => `${cap(f[0])}.${f[1] ? ' ' + cap(f[1]) + '.' : ''}${as ? ' ' + as : ''}`,
  ({ X, f, cl }) => `Why ${X.say}? ${cap(f[0])}.${f[1] ? ' ' + cap(f[1]) + '.' : ''}${cl ? ' ' + cl : ''}`,
  ({ X, f }) => `${cap(f[0])}${f[1] ? '. ' + cap(f[1]) : ''}. That's why I'm on ${X.say}.`,
  ({ X, f, and }) => `${cap(X.say)} for me. ${cap(f[0])}${f[1] ? `, ${and} ${f[1]}` : ''}.`,
  ({ f, cl }) => `Two things: ${f[0]}, and ${f[1]}.${cl ? ' ' + cl : ''}`,
  ({ op, f, as }) => `${lead(op, f[0])}.${as ? ' ' + as : ''}${f[1] ? ' ' + cap(f[1]) + '.' : ''}`,
  ({ f }) => `${cap(f[0])}. ${cap(f[1])}. ${cap(f[2])}.`,
  ({ op, f, X }) => `${lead(op, f[0])}${f[1] ? '. ' + cap(f[1]) : ''}. ${cap(X.say)}.`,
  ({ f, cl }) => `${cap(f[0])}… ${f[1] ? f[1] + '.' : 'that\'s enough for me.'}${cl ? ' ' + cl : ''}`,
  ({ X, f }) => `I'm on ${X.say} because ${f[0]}${f[1] ? `, and because ${f[1]}` : ''}.`,
  ({ f, as, op }) => (as ? `${as} ${cap(f[0])}.` : `${lead(op, f[0])}.`) + (f[1] ? ' ' + cap(f[1]) + '.' : ''),
  ({ X, f, cl }) => `Here's the thing about ${X.game}: ${f[0]}.${f[1] ? ' ' + cap(f[1]) + '.' : ''}${cl ? ' ' + cl : ''}`,
  ({ op, f, and }) => `${lead(op, f[0])}. ${cap(f[1])}, ${and} ${f[2]}.`,
  ({ X, f }) => `Three reasons for ${X.say}: ${f[0]}; ${f[1]}; and ${f[2]}.`];
const THREE = new Set([10, 16, 17]), TWO = new Set([8]);
const NOFACT = {
  total: ['I lean {X}.', '{X} is the side.', 'The number wants {X}.', 'Give me {X}.', '{X} in {G}, that\'s my call.', 'I\'ll take {X} and let the scoreboard argue.', '{X}, and I don\'t need a speech for it.', 'My lean in {G}: {X}.', 'Put me down for {X}.', '{X} feels right for this one.', 'I see {X} here.', '{X}. Simple as that.'],
  side: ['{X} is the call.', 'I\'m with {X}.', 'Taking {X}.', '{X}, no overthinking.', 'I like {T} in this spot.', '{T} are my side tonight.', 'Give me {T}.', 'I\'ll ride {T} here.', '{X}. I\'ll explain after.', 'My money says {T}.', 'This one is {T}\'s to win.', '{T} for me.'],
  prop: ['{X} feels right.', 'I\'m on {X}.', 'Give me {X}.', '{X}: I\'ll take it.', 'Put me down for {X}.', '{X} sets up well.', 'I like {X} tonight.', '{X}, his kind of game.', 'Count me in on {X}.', '{X}. Easy.'] };
/* the side we're on and the other side, in words and abbreviations, from the pick and the game ("BUF ML" in "BUF@NYJ" → Bills / Jets) */
function ctxOf(p, nameOf) { const [a, h] = String(p.game || '').split('@'), pick = String(p.pick || ''), m = pick.match(/^(\S+)\s+(ML|[+-]\d)/), tot = pick.match(/^(over|under)\s+([\d.]+)/i);
  const kind = p.kind === 'prop' ? 'prop' : tot ? 'total' : m ? 'side' : (/\d\+|under \d|over \d/i.test(pick) ? 'prop' : 'side');
  const Tab = m ? m[1] : null, Oab = Tab && a ? (Tab === a ? h : a) : null, nm = ab => { try { return nameOf(ab) || ab; } catch (e) { return ab; } };
  const T = Tab ? nm(Tab) : 'this side', O = Oab ? nm(Oab) : 'the other side', sd = tot ? tot[1].toLowerCase() : null, L = tot ? +tot[2] : null, spr = pick.match(/\s([+-]\d+(?:\.\d+)?)\b/);
  const say = kind === 'total' ? (hash(pick + p.game) % 2 ? `the ${sd}` : pick.replace(/^(over|under)/i, x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase())) : kind === 'side' && Tab ? (spr ? `${T} ${spr[1]}` : T) : pick;
  return { a, h, A: a ? nm(a) : '', H: h ? nm(h) : '', Tab, Oab, T, O, nm, mk: kind === 'prop' ? 'prop' : kind, sd, L, sp: p.sp || '', say, dog: +p.price > 0, game: a && h ? `${nm(a)} and ${nm(h)}` : 'this game' }; }
const fill = (s, X) => s.replace(/\{T\}/g, X.T).replace(/\{O\}/g, X.O);
/* the public entry point: one character's call on one pick, in its own words. idx = the pick's place on the card (no repeats on a
   card); meta = an heir's kind and parents ({arch, a, b}) so it talks like its family; p.gf = the game's own numbers (the board). */
export function say(v, p, idx, day, nameOf = x => x, meta) {
  idx = idx || 0; const V = voiceOf(v, meta), X = ctxOf(p, nameOf), seed = hash([v, p.pick, p.game || p.team || '', day].join('|')), r = rng(seed);
  const all = [...facts(p.note, X), ...facts(p.gf, X)], seen = new Set(), F = all.filter(f => (f.pol || 0) >= 0 && !seen.has(f.k) && seen.add(f.k));
  const op = deck(hash(v + day + 'o'), V.op)[idx % V.op.length], cl = deck(hash(v + day + 'c'), V.cl)[idx % V.cl.length], and = V.and[(idx + (seed % 3)) % V.and.length];
  const as = V.as && V.as.length && (seed + idx) % 4 === 0 ? deck(hash(v + day + 'a'), V.as)[idx % V.as.length] : '';
  if (!F.length) { const bank = NOFACT[X.mk] || NOFACT.side, line = fill(deck(hash(v + day + X.mk), bank)[(idx + seed % 5) % bank.length].replace(/\{X\}/g, X.say).replace(/\{G\}/g, X.game), X);
    return cap((idx % 2 && !/[,:]$/.test(op) ? `${op} ${line}` : `${line}${cl ? ' ' + cl : ''}`).replace(/\s+/g, ' ').trim()); }
  /* rank: how much the fact says, how much it suits the character, a little seeded luck; then turn the order by the pick's place on
     the card so two picks with the same facts lead with different ones */
  const pref = V.pref || {}, score = f => (f.w || 1) * (pref[f.k] || pref[f.k.replace(/(with|vs)(ml|ats)$/, '')] || 1) + r() * 0.9;
  const ranked = F.map(f => [score(f), f]).sort((x, y) => y[0] - x[0]).map(x => x[1]);
  const lead = Math.min(ranked.length, 3), rot = (idx + (seed % 7)) % lead, order = [...ranked.slice(rot, lead), ...ranked.slice(0, rot), ...ranked.slice(lead)];
  const nTake = order.length >= 3 && (seed + idx) % 5 === 0 ? 3 : Math.min(2, order.length);
  /* a fact's k-th appearance on the card takes its k-th wording (a fact is said once a read, so the pick's place decides it) */
  const said = order.slice(0, nTake).map(f => fill(deck(hash(v + day + f.k), f.alts)[idx % f.alts.length], X));
  const shapes = SHAPES.filter((s, i) => (nTake === 3) === THREE.has(i) && (nTake >= 2 || !TWO.has(i))), shape = shapes[(hash(v + p.pick + (p.game || '')) + idx) % shapes.length];
  return shape({ op, f: said, cl, and, as, X }).replace(/\s+/g, ' ').replace(/\.\./g, '.').replace(/\s+([,.])/g, '$1').replace(/\?\./g, '?').trim(); }
export const voiceFacts = (note, p = {}, nameOf = x => x) => facts(note, ctxOf(p, nameOf));
