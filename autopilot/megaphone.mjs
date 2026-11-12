/* ═══ THE MEGAPHONE (v2.99) ═════════════════════════════════════════════════════════════════════════════════════════
   Nov 9, 7:54 AM: "post a poll or just a photo that shows the headline question… the lakers play Atlanta today at 6pm…
   time of game, our power ranking next to teams, our important notes… Every hour for a different game… also posts like
   '100 likes on this post and we will drop todays full slate!'… we need the worker posting something every 30 minutes
   to grow and market the pages and the app."

   Every 30 minutes inside posting hours (9 AM – 11 PM CT unless MEGA_HOURS says otherwise) the worker posts one piece:
     🗳️ game question   on the hour, a different game each time: a flashcard of the question, the time, TheDesk Power
                        Rank beside each team, the line and the key note; the words carry the stat lines and TheDesk's
                        read; Telegram gets a native poll under it
     🔥 streak watch     a team on a 4+ game run playing today ("5 straight. Make it 6?") with a poll
     📈 line movers      the day's biggest line moves since open ("Sharp money or noise?") with a poll
     🧾 yesterday        the free card's record from yesterday (morning, once)
     🎯 the goal         once a morning on Facebook: "100 reactions on this post and we drop today's full free card" —
                        the worker counts the reactions and, when it hits, drops every free pick right then (all outlets).
                        If it never hits, nothing is owed: the picks still unlock 30 minutes before each game as always.
   Only public sports data (the feeds branch), never a paid pick: TheDesk's read is the models-and-markets projection the
   feeds already publish. Rankings are TheDesk's own: margin-of-victory ratings adjusted for who each team played.
   The worker's memory of what it posted (and when) lives in its own encrypted file (social.enc), never on the phone.
   Pure functions here; the worker sends. */
export const SP_EM = { nfl: '🏈', ncaaf: '🏈', nba: '🏀', ncaab: '🏀', nhl: '🏒', mlb: '⚾' };
export const SP_LAB = { nfl: 'NFL', ncaaf: 'College football', nba: 'NBA', ncaab: 'College hoops', nhl: 'NHL', mlb: 'MLB' };
const HFA = { nfl: 1.5, ncaaf: 2.5, nba: 2.5, ncaab: 3, nhl: 0.2, mlb: 0.2 }, CAP = { nfl: 21, ncaaf: 28, nba: 25, ncaab: 25, nhl: 4, mlb: 6 };
const MIN_G = { nfl: 2, ncaaf: 3, nba: 4, ncaab: 4, nhl: 4, mlb: 6 };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fin = x => typeof x === 'number' && Number.isFinite(x);
export const ctParts = ts => { const P = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ts)).map(p => [p.type, p.value]));
  return { day: `${P.year}-${P.month}-${P.day}`, h: +P.hour, m: +P.minute }; };
export const tCT = ts => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' }).format(new Date(ts)) + ' CT';
const when = ts => ctParts(ts).h >= 17 ? 'Tonight' : 'Today';
const sgn = x => (x > 0 ? '+' : x < 0 ? '-' : '') + Math.abs(x);
const r1 = x => Math.round(x * 10) / 10;

/* ── TheDesk Power Rankings: each team's margin (capped, home edge removed) plus the strength of who it played, iterated ── */
export function powerRanks(season) { const rows = Object.values((season && season.g) || {}).filter(r => r && fin(r[4]) && fin(r[5])); const G = {};
  for (const r of rows) { const [sp, d, a, h, as, hs] = r; const neutral = r[10] === 1; const cap = CAP[sp] || 20; const m = Math.max(-cap, Math.min(cap, hs - as - (neutral ? 0 : (HFA[sp] || 0))));
    const L = G[sp] || (G[sp] = {}); (L[h] = L[h] || []).push({ o: a, m, d, pf: hs, pa: as, home: 1 }); (L[a] = L[a] || []).push({ o: h, m: -m, d, pf: as, pa: hs, home: 0 }); }
  const out = {};
  for (const [sp, L] of Object.entries(G)) { let R = Object.fromEntries(Object.keys(L).map(t => [t, 0]));
    for (let it = 0; it < 40; it++) { const N = {}; for (const [t, gs] of Object.entries(L)) N[t] = gs.reduce((s, g) => s + g.m + 0.9 * (R[g.o] || 0), 0) / gs.length;
      const mu = Object.values(N).reduce((a, b) => a + b, 0) / Object.keys(N).length; for (const t in N) N[t] -= mu; R = N; }
    const ranked = Object.keys(L).filter(t => L[t].length >= (MIN_G[sp] || 3)).sort((x, y) => R[y] - R[x]);
    for (const [t, gs] of Object.entries(L)) { const s = [...gs].sort((x, y) => x.d.localeCompare(y.d)); const w = s.filter(g => g.pf > g.pa).length;
      let k = 0; const last = s.length ? (s[s.length - 1].pf > s[s.length - 1].pa ? 'W' : 'L') : ''; for (let i = s.length - 1; i >= 0 && (s[i].pf > s[i].pa ? 'W' : 'L') === last; i--) k++;
      out[sp + '|' + t] = { rk: ranked.indexOf(t) + 1 || 0, of: ranked.length, rt: r1(R[t]), w, l: s.length - w, n: s.length, pf: r1(s.reduce((a, g) => a + g.pf, 0) / s.length), pa: r1(s.reduce((a, g) => a + g.pa, 0) / s.length),
        l5: s.slice(-5).map(g => g.pf > g.pa ? 'W' : 'L'), streak: last ? { t: last, n: k } : null, games: s.slice(-5) }; } }
  return out; }

/* ── today's games from the Oracle feed (its key carries the local day) ── */
export function gamesToday(oracle, day) { return Object.entries((oracle && oracle.g) || {}).filter(([k]) => k.endsWith('|' + day)).map(([k, g]) => ({ k: k.replace(/\|\d{4}-\d\d-\d\d$/, ''), ...g, t: Date.parse(g.st) })).filter(g => fin(g.t) && g.a && g.h); }
const TWO = ['Red Wings', 'Blue Jackets', 'Maple Leafs', 'Golden Knights', 'Trail Blazers', 'Red Sox', 'White Sox', 'Blue Jays', 'Golden State'];
/* v3.0 · the pro leagues by name (the feeds carry abbreviations; a game's own preview carries names only on game day) */
export const TEAMS = {
  nfl: { ARI: 'Arizona Cardinals', ATL: 'Atlanta Falcons', BAL: 'Baltimore Ravens', BUF: 'Buffalo Bills', CAR: 'Carolina Panthers', CHI: 'Chicago Bears', CIN: 'Cincinnati Bengals', CLE: 'Cleveland Browns', DAL: 'Dallas Cowboys', DEN: 'Denver Broncos', DET: 'Detroit Lions', GB: 'Green Bay Packers', HOU: 'Houston Texans', IND: 'Indianapolis Colts', JAX: 'Jacksonville Jaguars', KC: 'Kansas City Chiefs', LAC: 'Los Angeles Chargers', LAR: 'Los Angeles Rams', LV: 'Las Vegas Raiders', MIA: 'Miami Dolphins', MIN: 'Minnesota Vikings', NE: 'New England Patriots', NO: 'New Orleans Saints', NYG: 'New York Giants', NYJ: 'New York Jets', PHI: 'Philadelphia Eagles', PIT: 'Pittsburgh Steelers', SEA: 'Seattle Seahawks', SF: 'San Francisco 49ers', TB: 'Tampa Bay Buccaneers', TEN: 'Tennessee Titans', WSH: 'Washington Commanders' },
  nba: { ATL: 'Atlanta Hawks', BKN: 'Brooklyn Nets', BOS: 'Boston Celtics', CHA: 'Charlotte Hornets', CHI: 'Chicago Bulls', CLE: 'Cleveland Cavaliers', DAL: 'Dallas Mavericks', DEN: 'Denver Nuggets', DET: 'Detroit Pistons', GS: 'Golden State Warriors', HOU: 'Houston Rockets', IND: 'Indiana Pacers', LAC: 'LA Clippers', LAL: 'Los Angeles Lakers', MEM: 'Memphis Grizzlies', MIA: 'Miami Heat', MIL: 'Milwaukee Bucks', MIN: 'Minnesota Timberwolves', NO: 'New Orleans Pelicans', NY: 'New York Knicks', OKC: 'Oklahoma City Thunder', ORL: 'Orlando Magic', PHI: 'Philadelphia 76ers', PHX: 'Phoenix Suns', POR: 'Portland Trail Blazers', SA: 'San Antonio Spurs', SAC: 'Sacramento Kings', TOR: 'Toronto Raptors', UTAH: 'Utah Jazz', WSH: 'Washington Wizards' },
  nhl: { ANA: 'Anaheim Ducks', BOS: 'Boston Bruins', BUF: 'Buffalo Sabres', CAR: 'Carolina Hurricanes', CBJ: 'Columbus Blue Jackets', CGY: 'Calgary Flames', CHI: 'Chicago Blackhawks', COL: 'Colorado Avalanche', DAL: 'Dallas Stars', DET: 'Detroit Red Wings', EDM: 'Edmonton Oilers', FLA: 'Florida Panthers', LA: 'Los Angeles Kings', MIN: 'Minnesota Wild', MTL: 'Montreal Canadiens', NJ: 'New Jersey Devils', NSH: 'Nashville Predators', NYI: 'New York Islanders', NYR: 'New York Rangers', OTT: 'Ottawa Senators', PHI: 'Philadelphia Flyers', PIT: 'Pittsburgh Penguins', SEA: 'Seattle Kraken', SJ: 'San Jose Sharks', STL: 'St. Louis Blues', TB: 'Tampa Bay Lightning', TOR: 'Toronto Maple Leafs', UTA: 'Utah Mammoth', VAN: 'Vancouver Canucks', VGK: 'Vegas Golden Knights', WPG: 'Winnipeg Jets', WSH: 'Washington Capitals' } };
export const nickOf = full => { const two = TWO.find(t => full.endsWith(t)); return two === 'Golden State' ? full : two || full.split(' ').pop(); };
export function names(g, coach) { const C = coach && coach.g && coach.g[g.k]; const nm = (side, ab) => { const full = (C && C[side] && C[side].name) || (TEAMS[g.sp] || {})[ab]; if (!full || /^ncaa/.test(g.sp)) return { full: full || ab, nick: ab };
    const two = TWO.find(t => full.endsWith(t)); return { full, nick: two || full.split(' ').pop() }; };
  return { A: nm('a', g.a), H: nm('h', g.h), venue: C && C.venue, C }; }
/* the one note worth a line: a preview headline that names both teams, else injury/lineup news about either */
export function keyNote(g, N) { const C = N.C; if (!C) return ''; const heads = [...((C.a && C.a.heads) || []), ...((C.h && C.h.heads) || [])].map(x => x && x.h).filter(Boolean);
  const words = [N.A.nick, N.H.nick, N.A.full.split(' ')[0], N.H.full.split(' ')[0]].filter(w => w && w.length > 2);
  const fresh = h => !/highlights|draft|projection|ranking|power rank|\b(19|20)\d\d\b/i.test(h);   /* no recaps of old games, no listicles */
  const news = heads.find(h => fresh(h) && /\b(out|sit|sits|injury|injured|questionable|doubtful|starts?|to start|suspended|ruled|day-to-day)\b/i.test(h) && !/\b(beat|beats|scores|scored|rout|routs|edge|edges|tops)\b/i.test(h) && [N.A.nick, N.H.nick].some(w => w && w.length > 2 && h.includes(w)));
  return news || heads.find(h => fresh(h) && words.filter(w => h.includes(w)).length >= 2) || ''; }
export function interest(g, P, now) { const W = { nfl: 100, nba: 60, ncaaf: 55, nhl: 40, mlb: 35, ncaab: 20 }[g.sp] || 15; const sp = g.ln && fin(g.ln.spH) ? Math.abs(g.ln.spH) : 9;
  const ra = (P[g.sp + '|' + g.a] || {}).rk || 0, rh = (P[g.sp + '|' + g.h] || {}).rk || 0; const top = /^ncaa/.test(g.sp) ? 25 : 8;
  const move = g.op && g.ln ? Math.max(Math.abs((g.ln.spH ?? 0) - (g.op.spH ?? 0)), Math.abs((g.ln.tot ?? 0) - (g.op.tot ?? 0)) / 2) : 0;
  return W + (g.sp === 'nhl' ? 8 : sp <= 3 ? 15 : sp <= 7 ? 8 : 0) + (ra && ra <= top ? 7 : 0) + (rh && rh <= top ? 7 : 0) + (move >= 1.5 ? 8 : 0) + (g.t - now <= 3 * 36e5 ? 12 : 0); }
export function pickGame(games, P, M, now) { return games.filter(g => g.t >= now + 40 * 60e3 && g.t <= now + 12 * 36e5 && !(M.q || {})[g.k]).sort((x, y) => interest(y, P, now) - interest(x, P, now) || x.t - y.t)[0] || null; }

/* ── one game, all the facts the question needs ── */
export function facts(g, F) { const P = F.P, N = names(g, F.coach); const pa = P[g.sp + '|' + g.a] || {}, ph = P[g.sp + '|' + g.h] || {}; const ln = g.ln || {}, op = g.op || {}, s = g.s || {};
  const fav = fin(ln.spH) ? (ln.spH < 0 ? 'h' : ln.spH > 0 ? 'a' : null) : fin(ln.mlH) && fin(ln.mlA) ? (ln.mlH < ln.mlA ? 'h' : 'a') : null; const line = fin(ln.spH) ? Math.abs(ln.spH) : null;
  const mk = [s.kalshi, s.poly].map(x => x && x.wp).filter(fin); const hw = mk.length ? mk.reduce((a, b) => a + b, 0) / mk.length : s.espn && fin(s.espn.wp) ? s.espn.wp : null;
  /* v3.0 · the projected score is the average of every source that gives one (the feed's sources come and go by sport) */
  const pj = Object.values(s).filter(x => x && fin(x.pa) && fin(x.ph)); const os = pj.length ? { pa: pj.reduce((a, x) => a + x.pa, 0) / pj.length, ph: pj.reduce((a, x) => a + x.ph, 0) / pj.length, n: pj.length } : null; const dec = g.sp === 'nhl' || g.sp === 'mlb' ? 1 : 0; const fx = x => dec ? x.toFixed(1) : String(Math.round(x));
  const moves = []; if (fin(op.spH) && fin(ln.spH) && Math.abs(ln.spH - op.spH) >= (g.sp === 'nhl' ? 9 : 1)) moves.push(`spread opened ${g.h} ${sgn(op.spH)}, now ${sgn(ln.spH)}`);
  if (fin(op.tot) && fin(ln.tot) && Math.abs(ln.tot - op.tot) >= (g.sp === 'nhl' ? 0.5 : 1.5)) moves.push(`total opened ${op.tot}, now ${ln.tot}`);
  return { g, N, pa, ph, fav, line, tot: fin(ln.tot) ? ln.tot : null, hw, os, fx, moves, note: keyNote(g, N), rk: x => x.rk ? '#' + x.rk : '' }; }
const rec = x => x.n ? `${x.w}-${x.l}` : '';
const teamMeta = (x, sp) => [rec(x), x.l5 && x.l5.length ? 'last 5 ' + x.l5.join('') : '', x.n ? `${x.pf} for / ${x.pa} against` : ''].filter(Boolean).join(' · ');
/* which question this game asks */
export function questionOf(f) { const g = f.g, sp = g.sp; const A = f.N.A.nick, H = f.N.H.nick; const favN = f.fav === 'h' ? H : A, dogN = f.fav === 'h' ? A : H;
  const totEdge = f.os && f.tot != null ? f.os.pa + f.os.ph - f.tot : 0; const totMove = g.op && f.tot != null && fin(g.op.tot) ? f.tot - g.op.tot : 0; const nhl = sp === 'nhl' || sp === 'mlb';
  const big = { nfl: 7, ncaaf: 14, nba: 8, ncaab: 10 }[sp] || 99; const favMl = f.fav ? (f.fav === 'h' ? g.ln.mlH : g.ln.mlA) : null; const pick = (arr, k) => arr[[...String(g.k)].reduce((a, c) => a + c.charCodeAt(0), 0) % arr.length];
  if (f.tot != null && (Math.abs(totEdge) >= (nhl ? 0.6 : 4) || Math.abs(totMove) >= (nhl ? 0.5 : 3))) return { type: 'total', title: `Over or under ${f.tot}?`, opts: [`Over ${f.tot}`, `Under ${f.tot}`] };
  if (f.fav && ((f.line != null && !nhl && f.line >= big) || (nhl && fin(favMl) && favMl <= -200))) return { type: 'upset', title: pick([`Upset alert or chalk?`, `Can the ${dogN} hang?`]), opts: [`${favN} handle it`, `${dogN} pull it off`] };
  if (!f.fav || nhl || (f.line != null && f.line <= 3)) return { type: 'who', title: pick([`Who you got ${when(g.t).toLowerCase()}?`, `Coin flip. Who wins?`, `Who takes this one?`]), opts: [A, H] };
  return { type: 'cover', title: `${favN} -${f.line}: buying it?`, opts: [`${favN} -${f.line}`, `${dogN} +${f.line}`] }; }

/* 🗳️ the game question */
export function questionPost(g, F, deps) { const f = facts(g, F), q = questionOf(f), A = f.N.A, H = f.N.H, t = tCT(g.t), w = when(g.t); const lounge = (deps && deps.lounge) || 'https://t.me/TheDeskLounge';
  const favAb = f.fav === 'h' ? g.h : g.a; const lineTxt = [f.line != null && f.fav ? `${favAb} -${f.line}` : f.line === 0 ? 'Pick\'em' : '', f.tot != null ? `O/U ${f.tot}` : ''].filter(Boolean).join(' · ');
  const mkTxt = f.hw != null ? `${Math.round(Math.max(f.hw, 1 - f.hw) * 100)}% ${f.hw >= 0.5 ? H.nick : A.nick}` : '';
  const read = f.os ? `${A.nick} ${f.fx(f.os.pa)}, ${H.nick} ${f.fx(f.os.ph)}` : '';
  const text = [`🗳️ <b>${esc(A.nick)} @ ${esc(H.nick)} — ${esc(q.title)}</b>`, `${SP_EM[g.sp] || ''} ${SP_LAB[g.sp] || g.sp.toUpperCase()} · ${w} ${t}${f.N.venue ? ' · ' + esc(f.N.venue) : ''}`, '',
    '📊 <b>The numbers</b>',
    `• ${f.rk(f.pa)} ${esc(A.full)}${f.pa.n ? ` (${rec(f.pa)})` : ''}${f.pa.l5 && f.pa.l5.length ? ' · last 5: ' + f.pa.l5.join(' ') : ''}${f.pa.n ? ` · ${f.pa.pf} for / ${f.pa.pa} against` : ''}`.replace('•  ', '• '),
    `• ${f.rk(f.ph)} ${esc(H.full)}${f.ph.n ? ` (${rec(f.ph)})` : ''}${f.ph.l5 && f.ph.l5.length ? ' · last 5: ' + f.ph.l5.join(' ') : ''}${f.ph.n ? ` · ${f.ph.pf} for / ${f.ph.pa} against` : ''}`.replace('•  ', '• '),
    lineTxt ? `• Line: ${esc(lineTxt)}${f.moves.length ? ' (' + esc(f.moves.join('; ')) + ')' : ''}` : '', mkTxt ? `• Prediction markets: ${esc(mkTxt)} to win` : '',
    read ? `🧠 <b>TheDesk's read:</b> models + markets land near ${esc(read)}.` : '', f.note ? `📰 ${esc(f.note)}` : '', '',
    `👇 Who you got? Vote, comment, argue — we read it all. Talk it live: ${lounge}`, (f.pa.rk || f.ph.rk) ? '<i># = TheDesk Power Rank (margins, adjusted for who they played)</i>' : ''].filter((x, i, a) => x !== '' || (a[i - 1] !== '' && i > 0)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const card = { kicker: `${SP_LAB[g.sp] || g.sp} · ${w} ${t}`, title: q.title, wrap: true, sub: `${A.full} @ ${H.full}`,
    rows: [{ label: `${f.rk(f.pa)} ${A.nick}`.trim(), meta: teamMeta(f.pa, g.sp) || 'TheDesk Power Rankings' }, { label: `${f.rk(f.ph)} ${H.nick}`.trim(), meta: teamMeta(f.ph, g.sp) || 'TheDesk Power Rankings' },
      lineTxt ? { label: lineTxt, meta: f.moves.length ? f.moves[0] : mkTxt ? 'markets: ' + mkTxt : 'the line right now' } : null,
      read ? { label: 'TheDesk read', meta: read + (mkTxt && f.moves.length ? ' · markets ' + mkTxt : '') } : null, f.note ? { label: 'Key note', meta: f.note } : null].filter(Boolean),
    foot: 'Vote + talk it out: ' + lounge.replace(/^https?:\/\//, '') };
  return { kind: 'question', key: 'q|' + g.k, text, card, poll: { question: `${A.nick} @ ${H.nick} (${t}): ${q.title}`.slice(0, 290), options: q.opts.map(o => String(o).slice(0, 95)) } }; }

/* 🔥 streak watch: a team on a 4+ game run that plays today */
export function streakPost(games, F, M, now, deps) { const P = F.P; const lounge = (deps && deps.lounge) || 'https://t.me/TheDeskLounge';
  const c = []; for (const g of games) { if (g.t < now + 40 * 60e3 || g.t > now + 12 * 36e5) continue; for (const side of ['a', 'h']) { const x = P[g.sp + '|' + g[side]]; if (x && x.streak && x.streak.n >= 4 && !(M.st || {})[g.sp + '|' + g[side]]) c.push({ g, side, x }); } }
  c.sort((p, q) => q.x.streak.n - p.x.streak.n || interest(q.g, P, now) - interest(p.g, P, now)); const s = c[0]; if (!s) return null;
  const N = names(s.g, F.coach), me = s.side === 'a' ? N.A : N.H, opp = s.side === 'a' ? N.H : N.A, n = s.x.streak.n, W = s.x.streak.t === 'W', t = tCT(s.g.t);
  const title = W ? `${n} straight. Make it ${n + 1}?` : `${n} straight L's. Snap it?`;
  const text = [`🔥 <b>STREAK WATCH — the ${esc(me.nick)}</b>`, `${W ? 'Winners' : 'Losers'} of ${n} straight. ${s.side === 'a' ? 'At' : 'Home vs'} the ${esc(opp.nick)} ${when(s.g.t).toLowerCase()}, ${t}.`, '',
    ...s.x.games.slice().reverse().map(g => `${g.pf > g.pa ? '✅' : '❌'} ${g.pf}-${g.pa} ${g.home ? 'vs' : 'at'} ${esc(g.o)}`), s.x.rk ? `\nTheDesk Power Rank: #${s.x.rk} of ${s.x.of}` : '', '',
    `👇 ${W ? 'Does it keep rolling?' : 'Does it end tonight?'} Vote and tell us why. ${lounge}`].join('\n').replace(/\n{3,}/g, '\n\n');
  const card = { kicker: `${SP_LAB[s.g.sp] || s.g.sp} · streak watch`, title, wrap: true, sub: `${me.full} ${s.side === 'a' ? '@' : 'vs'} ${opp.full} · ${t}`,
    rows: s.x.games.slice().reverse().map(g => ({ label: `${g.pf}-${g.pa} ${g.home ? 'vs' : 'at'} ${g.o}`, meta: new Date(g.d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }), res: g.pf > g.pa ? 'W' : 'L' })) };
  return { kind: 'streak', key: 'st|' + s.g.sp + '|' + s.g[s.side], text, card, poll: { question: `${me.nick}: ${title}`, options: W ? [`Streak lives`, `${opp.nick} end it`] : [`${me.nick} snap it`, `${opp.nick} make it ${n + 1}`] } }; }

/* 📈 line movers: the day's biggest moves since open */
export function moversPost(games, F, now, deps) { const lounge = (deps && deps.lounge) || 'https://t.me/TheDeskLounge'; const S = { nfl: 1.5, ncaaf: 3, nba: 2, ncaab: 2.5, nhl: 0.5, mlb: 0.5 };
  const mv = []; for (const g of games) { if (g.t < now || !g.op || !g.ln) continue; const ds = fin(g.op.spH) && fin(g.ln.spH) && g.sp !== 'nhl' ? g.ln.spH - g.op.spH : 0, dt = fin(g.op.tot) && fin(g.ln.tot) ? g.ln.tot - g.op.tot : 0;
    const sc = Math.max(Math.abs(ds) / (S[g.sp] || 2), Math.abs(dt) / ((S[g.sp] || 2) * 1.5)) * (/^ncaa/.test(g.sp) ? 0.8 : 1.2); if (sc >= 1 && !(/^ncaa/.test(g.sp) && Math.abs(g.ln.spH || 0) > 20)) mv.push({ g, ds, dt, sc, tot: Math.abs(dt) / 1.5 > Math.abs(ds) }); }
  mv.sort((a, b) => b.sc - a.sc); const top = mv.slice(0, 4); if (top.length < 2) return null;
  const row = m => m.tot ? `total ${m.g.op.tot} → ${m.g.ln.tot}` : `${m.g.h} ${sgn(m.g.op.spH)} → ${sgn(m.g.ln.spH)}`;
  const text = ['📈 <b>LINE MOVERS — who\'s pushing these numbers?</b>', 'Biggest moves since the lines opened:', '', ...top.map(m => `${SP_EM[m.g.sp] || ''} <b>${esc(m.g.a)} @ ${esc(m.g.h)}</b> · ${esc(row(m))} · ${tCT(m.g.t)}`), '',
    `👇 Sharp money or public noise? Vote and tell us which move you trust. ${lounge}`].join('\n');
  const card = { kicker: 'Line movers · ' + ctLabel(now), title: 'Sharp money or noise?', wrap: true, sub: 'Biggest moves since the open', rows: top.map(m => ({ label: `${m.g.a} @ ${m.g.h}`, meta: `${row(m).replace('→', '·')} · ${tCT(m.g.t)}` })) };
  return { kind: 'movers', key: 'mv|' + top.map(m => m.g.k).join(','), text, card, poll: { question: 'Today\'s biggest line moves: sharp money or public noise?', options: ['Sharp money', 'Public noise', 'Bit of both'] } }; }
const ctLabel = ts => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(ts));

/* ── the schedule: is a post due, and which one ── */
export function hours(spec) { const m = String(spec || '').match(/^(\d{1,2})\s*-\s*(\d{1,2})$/); return m ? [+m[1], +m[2]] : [9, 23]; }
export function due(M, now, opt = {}) { const [a, b] = hours(opt.hours); const { h } = ctParts(now); const every = (+opt.every || 30) * 60e3;
  return h >= a && h < b && (!M.last || now - M.last >= every - 4 * 60e3); }
/* order of play: the goal (once, mornings), then questions on the hour and the rest between; anything missing → a question */
export function choose(c, M) { const even = (M.n || 0) % 2 === 0;
  if (c.goal) return c.goal; const order = even ? [c.question, c.record, c.streak, c.movers] : [c.record, c.streak, c.movers, c.question]; return order.find(Boolean) || null; }

/* ═══ THE SHEET (v3.0) — the day's slate for the public app, as one small public file ══════════════════════════════════
   The feeds robot calls this and publishes slate.json on the feeds branch; the public app (/desk/) draws its "Slate" tab
   from it. Public sports data only: schedule, lines and how they've moved, prediction-market odds, the projected score the
   public models and markets land near, TheDesk Power Rankings, and the question the worker is asking about the game.
   Never a pick. Pro games all go in; the college slates are cut to the games worth a look (ranked teams, tight lines). */
const COLLEGE_MAX = 14;
export function slateOf(F, now, nDays = 2) { const P = F.P || powerRanks(F.season); const FF = { ...F, P }; const d0 = ctParts(now).day; const days = [];
  for (let i = 0; i < nDays; i++) { const d = new Date(Date.parse(d0 + 'T12:00:00Z') + i * 864e5).toISOString().slice(0, 10); let games = gamesToday(F.oracle, d).filter(g => g.ln || (g.s && Object.keys(g.s).length));
    const col = games.filter(g => /^ncaa/.test(g.sp)); const keep = new Set(); for (const sp of ['ncaaf', 'ncaab']) col.filter(g => g.sp === sp).sort((x, y) => interest(y, P, now) - interest(x, P, now)).slice(0, COLLEGE_MAX).forEach(g => keep.add(g.k));
    games = games.filter(g => !/^ncaa/.test(g.sp) || keep.has(g.k)).sort((x, y) => x.t - y.t || x.k.localeCompare(y.k));
    const side = (f, x, ab, N) => ({ ab, name: N.full, nick: N.nick, rk: x.rk || 0, of: x.of || 0, w: x.w || 0, l: x.l || 0, l5: (x.l5 || []).join(''), st: x.streak && x.streak.n >= 2 ? x.streak.t + x.streak.n : '', pf: x.pf ?? null, pa: x.pa ?? null });
    days.push({ d, more: Math.max(0, col.length - keep.size), games: games.map(g => { const f = facts(g, FF), q = questionOf(f), ln = g.ln || {};
      return { k: g.k, sp: g.sp, t: g.t, a: side(f, f.pa, g.a, f.N.A), h: side(f, f.ph, g.h, f.N.H), venue: f.N.venue || '',
        ln: (f.line != null || f.tot != null || fin(ln.mlA)) ? { fav: f.fav ? (f.fav === 'h' ? g.h : g.a) : '', line: f.line, tot: f.tot, mlA: fin(ln.mlA) ? ln.mlA : null, mlH: fin(ln.mlH) ? ln.mlH : null } : null,
        mv: f.moves, mkt: f.hw != null ? { ab: f.hw >= 0.5 ? g.h : g.a, pct: Math.round(Math.max(f.hw, 1 - f.hw) * 100), src: (g.s && (g.s.kalshi || g.s.poly)) ? 'markets' : 'model' } : null,
        read: f.os ? { a: +f.fx(f.os.pa), h: +f.fx(f.os.ph) } : null, note: f.note || '', q: { title: q.title, opts: q.opts }, hot: interest(g, P, now) }; }) }); }
  const ranks = {}; for (const [k, x] of Object.entries(P)) { if (!x.rk) continue; const [sp, ab] = k.split('|'); if (/^ncaa/.test(sp) && x.rk > 25) continue; (ranks[sp] = ranks[sp] || []).push({ rk: x.rk, ab, name: (TEAMS[sp] || {})[ab] || ab, w: x.w, l: x.l, rt: x.rt, l5: (x.l5 || []).join(''), st: x.streak && x.streak.n >= 2 ? x.streak.t + x.streak.n : '' }); }
  for (const sp in ranks) ranks[sp].sort((a, b) => a.rk - b.rk);
  return { v: 1, ts: now, tz: 'America/Chicago', days, ranks }; }
