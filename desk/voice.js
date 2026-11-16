/* TheDesk · character voices for the public app (v3.1.4, Chris, Nov 15: "the characters are all using a monotoned signature
   saying … I need them to communicate with variety and non robot AI like"). The desk publishes each call with its reasons as
   short tags ("road favorite · division game"). This turns those reasons into how each character actually talks: its own
   openers, sign-offs, sentence shapes and words, and never the same opener twice on one card. Deterministic: the same pick on
   the same day reads the same on every phone; tomorrow it reads differently. Plain words only, no new claims: every sentence
   comes from a reason the desk gave. */
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = seed => { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const pick1 = (r, a) => a[Math.floor(r() * a.length)];
const deck = (seed, a) => { const r = rng(seed), b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const w = n => (n >= 0 && n <= 12 ? WORDS[n] : String(n));
/* ── reasons → facts. Each fact has several plain phrasings; {T} = the side we're on, {O} = the other side. ── */
const FACTS = [
  [/^road favorite$/, 'roadfav', () => ['{T} are favored on the road', 'even away from home, {T} are the ones laying it', '{T} travel and still get the respect from the book', 'the line makes {T} the favorite despite the trip', 'nobody is scared of the road for {T} here', 'the number trusts {T} away from home']],
  [/^home favorite$/, 'homefav', () => ['{T} are favored at home', 'home floor, home favorite', '{T} get the home crowd and the number']],
  [/^division game$/, 'div', () => ['it\'s a division game, so nothing comes free', 'these two know each other too well', 'division stakes, familiar faces', 'a rivalry game, which keeps it honest', 'same division, so the effort is there on both sides']],
  [/over-performing its scoring/, 'pythup', () => ['{T} have been winning more than their scoring says they should', '{T}\'s record is running ahead of the point differential', '{T} keep finding ways to win close ones', '{T} have been closing games better than the box score suggests']],
  [/under-performing its scoring/, 'pythdn', () => ['{T} are better than their record', '{T} have lost some close ones they should have won', 'the scoring says {T} deserve more wins than they have', '{T}\'s point differential is ahead of their record, and that usually catches up']],
  [/^picked team has the clear talent edge/, 'talent', () => ['{T} simply have more talent', 'the roster gap is real', 'man for man, {T} are better', '{T} have the better players, and it isn\'t close', 'the best players on the floor wear {T} colors']],
  [/^opponent has the clear talent edge/, 'otalent', () => ['{O} have more talent on paper, which is exactly why the price is right', 'the talent sits with {O}, but the number already knows it', '{O} have the better roster, and the line overpays for it']],
  [/top-vs-bottom unit mismatch/, 'mismatch', () => ['one of {T}\'s best units lines up against one of the worst', 'there\'s a top-versus-bottom mismatch {T} can lean on', '{T} get a strength against a weakness, and that decides games', 'one side of this matchup is lopsided in {T}\'s favor']],
  [/both defenses outclass/, 'defs', () => ['both defenses are better than both offenses', 'points will be hard to come by on both ends', 'this has the look of a grind', 'two defenses ahead of two offenses']],
  [/^opponent on back-to-back$/, 'ob2b', () => ['{O} played last night', '{O} are on the second night of a back-to-back', '{O} come in on tired legs', '{O} are running on fumes from last night']],
  [/^picked team rested, opponent on back-to-back$/, 'rest', () => ['{T} are rested and {O} aren\'t', 'fresh legs against tired ones', '{T} had the night off while {O} were playing', 'a rest edge: {T} sat, {O} played']],
  [/opponent on its (\d)\w\w game in (\d) nights/, 'o3in4', m => [`{O} are on their ${w(+m[1])}th game in ${w(+m[2])} nights`.replace('threeth', 'third'), `that\'s game ${w(+m[1])} in ${w(+m[2])} nights for {O}`, `{O}\'s schedule has been brutal: ${w(+m[1])} games in ${w(+m[2])} nights`]],
  [/^picked team on (\d)\w\w night of back-to-back$/, 'sb2b', () => ['{T} are on a back-to-back themselves, which I don\'t love', 'tired legs for {T} too, so it\'s not all roses', '{T} played last night, worth keeping in mind']],
  [/on its (\d)\w\w straight road game/, 'road3', m => [`{T} are on road game number ${w(+m[1])} in a row`, `a long road trip for {T}, ${w(+m[1])} straight away from home`]],
  [/^opponent off a bye$/, 'obye', () => ['{O} are coming off a bye', '{O} had an extra week to prepare', '{O} are rested off the bye week']],
  [/^indoors \(dome\)$/, 'dome', () => ['it\'s indoors, so no weather to hide behind', 'dome game: clean conditions', 'no wind, no rain, just football']],
  [/leads the head-to-head series/, 'h2h', () => ['{T} own this series', 'history between these two favors {T}', '{T} have had {O}\'s number']],
  [/trails the head-to-head series/, 'h2hl', () => ['{O} have owned this series, but that\'s the past', 'the head-to-head leans {O}, and I\'m fine fading it']],
  [/won (\d+)\+ of its last (\d+)/, 'form', m => [`{T} have won ${w(+m[1])} of their last ${w(+m[2])}`, `${w(+m[1])} wins in the last ${w(+m[2])} for {T}`, `{T} are rolling: ${w(+m[1])} of ${w(+m[2])}`]],
  [/^low total$/, 'lowt', () => ['it\'s a low total, so every possession matters', 'the book expects a slow one', 'a low number, built for a grind']],
  [/^out-of-conference game$/, 'ooc', () => ['it\'s a non-conference game', 'no conference familiarity here']],
  [/his total ([\d.]+) vs ([\d.]+)/, 'tot', m => [`I have this landing around ${m[1]}, and the line is ${m[2]}`, `my number is ${m[1]}, the book says ${m[2]}`, `${m[2]} feels high, I see about ${m[1]}`, `I keep getting ${m[1]} against a ${m[2]} line`].map(x => +m[1] > +m[2] ? x.replace('feels high', 'feels low') : x)],
  [/^(\d+)-(\d+) on him before$/, 'onhim', m => [`we're ${m[1]}-${m[2]} on him already`, `he's been good to us: ${m[1]}-${m[2]}`, `${m[1]}-${m[2]} when we've backed him`, `the track record on him is ${m[1]}-${m[2]}`]],
  [/^\+?\d* ?home dog$/, 'hdog', () => ['a home dog getting points', 'the home side is getting points, and I\'ll take them', 'home underdog, my favorite kind']],
  [/as a dog: (\d+)-(\d+) outright/, 'dogrec', m => [`{T} are ${m[1]}-${m[2]} straight up as an underdog`, `as a dog, {T} have won ${w(+m[1])} of ${w(+m[1] + +m[2])} outright`]],
  [/as a favorite: (\d+)-(\d+)/, 'favrec', m => [`as a favorite they're ${m[1]}-${m[2]}`, `${m[1]}-${m[2]} when they're laying it`]],
  [/the triangle: (\S+) drops games to dogs, (\S+) beats favorites/, 'tri', m => [`${m[1]} drop games to underdogs and ${m[2]} beat favorites`, `${m[2]} love playing spoiler, and ${m[1]} let dogs hang around`]],
  [/power says (\S+) by ([\d.]+), the line says ([\d.]+)/, 'power', m => [`the power ratings have ${m[1]} by ${m[2]}, but the line only says ${m[3]}`, `my ratings make it ${m[1]} by ${m[2]}; the book has ${m[3]}`]],
  [/^Kalshi (\S+) (\d+)%$/, 'kalshi', m => [`Kalshi's market has them at ${m[2]}%`, `money on Kalshi says ${m[2]}%`]],
  [/^ESPN FPI\/BPI (\S+) (\d+)%$/, 'fpi', m => [`ESPN's ratings give them ${m[2]}%`, `FPI is at ${m[2]}% too`]],
  [/^DRatings (\S+) (\d+)%$/, 'drat', m => [`DRatings lands at ${m[2]}%`]],
  [/^outside consensus (\S+) by ([\d.]+)/, 'cons', m => [`the outside consensus has ${m[1]} by ${m[2]}`, `everyone outside this building lands on ${m[1]} by about ${m[2]}`]],
  [/^OddsShark computer (\S+) (\d+)–(\d+) (\S+)$/, 'oshark', m => [`OddsShark's computer spits out ${m[1]} ${m[2]}-${m[3]}`]],
  [/rating systems \(Prediction Tracker\): (\S+) by ([\d.]+)/, 'pt', m => [`the rating systems average ${m[1]} by ${m[2]}`]],
  [/offense \(([\d.]+) a game\) vs (\S+)'s defense \(allows ([\d.]+)\)/, 'offdef', m => [`an offense scoring ${m[1]} a game against a defense allowing ${m[3]}`]],
  [/against the spread/, 'ats', () => ['the cover record backs it up']],
  [/spread on the (\d+)/, 'key', m => [`the spread sits right on ${m[1]}, a key number`]]];
function facts(note) { const out = [];
  for (let raw of String(note || '').split(/\s*·\s*/)) { raw = raw.replace(/^[+-]\d+(\.\d+)?\s+/, '').replace(/\s*—\s*$/, '').trim(); if (!raw) continue;
    let hit = null; for (const [re, k, f] of FACTS) { const m = raw.match(re); if (m) { hit = { k, alts: f(m) }; break; } }
    if (/^Pickswise/.test(raw)) continue; /* the outside experts' stars read badly out loud */
    out.push(hit || { k: 'raw', alts: [raw.charAt(0).toLowerCase() + raw.slice(1)] }); }
  return out; }
/* ── how each character talks ── */
const P = {
  Sim: { op: ['I ran this one all week.', 'Ten thousand runs, same story.', 'The numbers don\'t blink here.', 'Played it out start to finish.', 'Every time I sim it, it lands the same way.', 'I watched this game a few thousand times before it\'s even started.', 'Clean read.', 'This one isn\'t close in my runs.', 'Simple math.', 'Here\'s what keeps showing up.'],
    cl: ['It holds up in almost every run.', 'That\'s where the numbers live.', 'I\'ll take that every time.', 'Nothing in the runs scares me off.', 'The model sleeps fine on it.', 'That\'s the play.', '', ''], and: ['and', 'plus', 'on top of that,'] },
  Judge: { op: ['I\'ve heard everyone out.', 'The evidence is in.', 'Let\'s be clear about this one.', 'Nobody in the room argued against it.', 'Case closed for me.', 'I listened. Here\'s where I land.', 'Weigh it all and it tips one way.', 'Plain and simple.', 'The facts are the facts.', 'Every voice I trust points here.'],
    cl: ['That\'s my ruling.', 'I don\'t need more than that.', 'Next case.', 'Hard to argue with.', 'It\'s not even close.', 'Decided.', '', ''], and: ['and', 'add to that,', 'also,'] },
  Coach: { op: ['Been around enough locker rooms to know this one.', 'Here\'s what I see from the sideline.', 'Forget the hype for a second.', 'I like how this sets up.', 'Watch the legs in this one.', 'This is a schedule game.', 'Talk to anyone who\'s played it.', 'My gut and my notes agree.', 'Let me keep it simple.', 'You can feel this one.'],
    cl: ['That\'s winning football, or close enough.', 'I\'d play it.', 'Effort shows up. Trust it.', 'That\'s the whole scouting report.', 'Ride it.', 'I\'ve seen it a hundred times.', '', ''], and: ['and', 'and on top of that', 'plus'] },
  'Most common': { op: ['I build it from the ground up.', 'Add it up piece by piece.', 'My final looks like this.', 'Count it out.', 'I don\'t care about names, just totals.', 'When I put the parts together,', 'The math is boring, and that\'s the point.', 'Box score first, feelings never.', 'Here\'s the tally.', 'Simple sum.'],
    cl: ['That\'s the number.', 'Bank it.', 'The math checks out.', 'I don\'t need a story.', 'Write it down.', '', ''], and: ['and', 'plus', 'also'] },
  Pred: { op: ['I\'ve been listening.', 'Word around the room is loud on this one.', 'Everyone sharp I hear lands on the same side.', 'The markets are talking.', 'Ask around.', 'My sources line up.', 'Money and minds agree here.', 'It\'s rare everyone agrees. They do here.', 'I hear things.', 'Quiet consensus.'],
    cl: ['When this many agree, I listen.', 'That\'s the room talking, not me.', 'Follow the money.', 'I trust the chorus on this one.', '', ''], and: ['and', 'while', 'and on top of it'] },
  Covers: { op: ['The outside world sees it too.', 'Checking what the rest of the industry thinks.', 'Outside the building, same read.', 'The computers agree.', 'Other shops land here too.', 'Not just us.'], cl: ['Good to have company.', 'Outside and inside, same answer.', '', ''], and: ['and', 'plus'] },
  Trends: { op: ['History has a say here.', 'I\'ve seen this before. Many times.', 'Old box scores tell the story.', 'The past rhymes.', 'Let me take you back.', 'This spot has a history.', 'Go look it up.', 'Patterns don\'t lie.'], cl: ['History usually wins.', 'It keeps happening.', 'Same story, new year.', '', ''], and: ['and', 'and again,'] },
  Consensus: { op: ['Everybody\'s on this one.', 'The public is all in.', 'The people have spoken.', 'Tickets are piling up here.', 'Count the hands in the air.', 'Popular call, and for once I don\'t mind.'], cl: ['Sometimes the crowd is right.', 'Ride with the people.', '', ''], and: ['and', 'plus'] },
  Power: { op: ['On my board, it\'s not close.', 'Pecking order matters.', 'Rank them and it\'s obvious.', 'Better team, by a clear margin.', 'My ratings say one thing.', 'Put them side by side.'], cl: ['The better team usually wins.', 'Ratings don\'t lie much.', 'Order restored.', '', ''], and: ['and', 'plus'] },
  Dog: { op: ['I love a dog with teeth.', 'Everybody wants the favorite. Not me.', 'Points and a chance.', 'Here\'s a live one.', 'The little guy has a shot.', 'I\'ll take the points and the upside.', 'Don\'t sleep on this one.'], cl: ['Dogs bite.', 'Give me the points.', 'Underdog season.', '', ''], and: ['and', 'plus'] },
  Scout: { op: ['Watch the players, not the logo.', 'I\'ve watched the tape.', 'Talent wins, eventually.', 'The best player on the floor matters.', 'Eyes on the matchup.', 'Here\'s the guy who swings it.', 'From the scouting notebook:'], cl: ['Talent shows up.', 'Stars take over games like this.', 'Watch it happen.', '', ''], and: ['and', 'plus', 'and honestly'] },
  Banker: { op: ['I only put money where the books agree.', 'The ledger says yes.', 'Strongest account on the board.', 'Every book I keep likes it.', 'Safe deposit.', 'Here\'s where I\'d put real money.'], cl: ['That\'s where I\'m invested.', 'Solid ground.', 'Deposit it.', '', ''], and: ['and', 'plus'] },
  Brain: { op: ['This is the gray zone I live in.', 'Fair price, real edge.', 'Think about it for a second.', 'The obvious answer isn\'t always right. Here it is.', 'Strategy over noise.', 'Line moved, I noticed.'], cl: ['Edges are edges.', 'Smart money.', 'Think, then bet.', '', ''], and: ['and', 'plus'] } };
const GENERIC = { op: ['Here\'s my read.', 'Quick one.', 'I like this.', 'Straightforward.'], cl: ['', 'That\'s it.'], and: ['and', 'plus'] };
/* sentence shapes: a = the facts already joined. Different shapes keep a card from reading like a form letter. */
const SHAPES = [
  (o, a, c) => `${o} ${cap(a)}.${c ? ' ' + c : ''}`,
  (o, a, c) => `${cap(a)}. ${o}${c ? ' ' + c : ''}`.replace(/\.\s*\./g, '.'),
  (o, a, c) => `${o} ${cap(a)}.`,
  (o, a, c) => `${cap(a)}.${c ? ' ' + c : ''}`,
  (o, a, c) => `${o} Simple: ${a}.${c ? ' ' + c : ''}`,
  (o, a, c) => `${cap(a)}. That's enough for me.`];
const NOFACT = {
  prop: ['{X} feels right.', 'I\'m on {X}.', 'Give me {X}.', '{X}: I\'ll take it.', 'Put me down for {X}.', '{X} sets up well.'],
  total: ['I lean {X}.', '{X} is the side.', 'The number wants {X}.', 'Give me {X}.'],
  side: ['{X} is the call.', 'I\'m with {X}.', 'Taking {X}.', '{X}, no overthinking.'] };
/* the side we're on and the other side, in words, from the pick and the game ("BUF ML" in "BUF@NYJ" → Bills / Jets) */
function sides(pick, game, nameOf) { const [a, h] = String(game || '').split('@'), m = String(pick || '').match(/^(\S+)\s+(ML|[+-]\d)/), t = m ? m[1] : '';
  if (!t || !a) return { T: 'this side', O: 'the other side' }; const o = t === a ? h : a; return { T: nameOf(t) || t, O: nameOf(o) || o }; }
/* the public entry point: one character's call on one pick, in its own words. idx = the pick's place on the card (no repeats). */
export function say(v, p, idx, day, nameOf = x => x) {
  const per = P[v] || GENERIC, F = facts(p.note), seed = hash([v, p.pick, p.game || p.team || '', day].join('|')), r = rng(seed);
  const openers = deck(hash(v + day), per.op), closers = deck(hash(v + day + 'c'), per.cl), op = openers[(idx || 0) % openers.length], cl = closers[(idx || 0) % closers.length];
  const X = p.pick || '', S = sides(p.pick, p.game, nameOf);
  if (!F.length) { const kind = p.kind === 'prop' || /\d\+|under \d|over \d/i.test(X) && !/^(over|under)\s/i.test(X) ? 'prop' : /^(over|under)\s/i.test(X) ? 'total' : 'side';
    const line = pick1(r, NOFACT[kind]).replace('{X}', X); return (idx || 0) % 2 ? `${op} ${line}` : `${line}${cl ? ' ' + cl : ''}`; }
  const take = F.slice(0, Math.min(F.length, r() < 0.5 ? 2 : 3)).map(f => pick1(r, f.alts).replace(/\{T\}/g, S.T).replace(/\{O\}/g, S.O));
  const two = (x, y) => (r() < 0.5 ? `${x}, ${pick1(r, per.and)} ${y}` : `${x}. ${cap(y)}`);
  let joined = take.length === 1 ? take[0] : take.length === 2 ? two(take[0], take[1]) : `${take[0]}. ${cap(two(take[1], take[2]))}`;
  joined = joined.replace(/,\s*,/g, ',').replace(/\s+/g, ' ');
  const shape = SHAPES[(hash(v + p.pick) + (idx || 0)) % SHAPES.length];
  return shape(op, joined, cl).replace(/\s+/g, ' ').replace(/\.\./g, '.').trim(); }
export const voiceFacts = facts;
