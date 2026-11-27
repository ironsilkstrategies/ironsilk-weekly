/* ═══ DRAFT ROOMS (v3.5.34 · Nov 26, 7:30 PM, Chris) ═══════════════════════════════════════════════════════════════════════════
   "a league where the players go against each other .. virtually a mirror of what I have on the machine where they pair up and have a
   draft… also a head to head league option where you pick 3 characters vs another subscriber who picks 3 characters (draft style) and they
   each pick 2 picks to build the best parlay that whoever has the most d$ at the end wins".
   A draft room is 2 to 4 subscribers. They snake-draft the desk's characters (round one in seat order, round two reversed, and so on).
   Two ways to play it:
     · Head-to-head (fmt "pick"): 3 characters each. Every day you build one ticket from your own characters' calls on the board —
       up to 2 picks from each of them — and stake it from the room's bankroll (D$1,000 each).
     · Team draft (fmt "auto"): the machine's Team Parlay Challenge for subscribers. 4 characters each; every day each of your characters'
       2 best calls (one a game, nothing shorter than −500) go on automatically: D$2 on every single and D$5 on the whole parlay, from a
       D$200 bankroll.
   Most D$ when the room's days run out wins the pot (the entry fees, if any) and the XP. D$ is play money: never cash. This file is the
   pure part (orders, form, matching, the auto ticket) so it can be tested on its own; chat/worker.mjs holds the room and its routes. */
export const DR_FMT = { pick: { lab: 'Head-to-head', per: 3, bank: 1000 }, auto: { lab: 'Team draft', per: 4, bank: 200 } };
export const DR_SINGLE = 2, DR_PARLAY = 5, DR_MAX_FAV = -500, DR_PICK_MS = 2 * 36e5, DR_OPEN_MS = 48 * 36e5, DR_DAYS = [3, 7, 14], DR_FEES = [0, 25, 50, 100];
export const DR_XP_WIN = 250, DR_XP_PLAY = 60;
/* the board and the Slate can spell a team two ways (the app's own alias list) */
const DR_ALIAS = {
  mlb: { CHW: 'CWS', ARI: 'AZ', OAK: 'ATH', WAS: 'WSH' },
  nfl: { WAS: 'WSH', JAC: 'JAX', LA: 'LAR', LVR: 'LV', OAK: 'LV', ARZ: 'ARI' },
  nhl: { LAK: 'LA', NJD: 'NJ', SJS: 'SJ', TBL: 'TB', VEG: 'VGK', LV: 'VGK', MON: 'MTL', UTAH: 'UTA', WAS: 'WSH' },
  nba: { GSW: 'GS', NYK: 'NY', NOP: 'NO', SAS: 'SA', UTA: 'UTAH', WAS: 'WSH', BRK: 'BKN', PHO: 'PHX', CHO: 'CHA' },
};
export const drAb = (sp, x) => { x = String(x || '').toUpperCase().replace(/[^A-Z0-9&]/g, ''); return (DR_ALIAS[sp] || {})[x] || x; };
/* the draft order: round one in seat order, round two reversed, … ("snake"), per picks each */
export function drSnake(seats, per) { const o = []; for (let r = 0; r < per; r++) o.push(...(r % 2 ? seats.slice().reverse() : seats.slice())); return o; }
/* a character's form from the public feed: its graded game picks over the last 28 days, pulled toward 50% when there are few */
export function drForm(c, now) { const cut = new Date(now - 28 * 864e5).toISOString().slice(0, 10); let w = 0, n = 0;
  for (const x of (c && c.recent) || []) { if (!x || x.kind !== 'game' || !x.d || x.d < cut) continue; if (x.r === 'win') { w++; n++; } else if (x.r === 'loss') n++; }
  return { w, n, r: (w + 5) / (n + 10) }; }
/* who can be drafted: every character still making calls (a pick in the last week), best form first */
export function drPool(feed, now) { const cut = new Date(now - 7 * 864e5).toISOString().slice(0, 10);
  return ((feed && feed.characters) || []).filter(c => c && c.v && ((c.picks || []).length || (c.recent || []).some(x => x && x.d && x.d >= cut)))
    .map(c => { const f = drForm(c, now); return { v: c.v, name: c.name || c.v, color: c.color || '#999', w: f.w, n: f.n, r: +f.r.toFixed(4) }; })
    .sort((a, b) => b.r - a.r || b.n - a.n || a.v.localeCompare(b.v)); }
/* the auto-pick (time ran out, or auto-draft is on): the best form still on the board */
export const drAutoPick = (pool, taken) => (pool.find(x => !taken.has(x.v)) || {}).v || null;
/* the board's game for a Slate game, either way round */
export function drBoardGame(board, g) { if (!board || !g || !g.a || !g.h) return null; const A = drAb(g.sp, g.a.ab), H = drAb(g.sp, g.h.ab);
  for (const b of board.games || []) { if (b.sp !== g.sp) continue; const [a, h] = String(b.game || '').split('@').map(x => drAb(b.sp, x)); if ((a === A && h === H) || (a === H && h === A)) return { b, flip: a === H }; }
  return null; }
/* the characters on your roster who made this exact call (game, bet type, side). A board game filed the other way round has its sides flipped. */
export function drCallers(bg, mk, side, roster) { if (!bg) return []; const flip = { away: 'home', home: 'away' }, s0 = bg.flip && flip[side] ? flip[side] : side;
  return [...new Set(((bg.b.calls || {})[mk] || []).filter(c => c && roster.includes(c.v) && c.s === s0).map(c => c.v))]; }
/* each leg rides on one of your characters, at most `cap` legs on any one: a small matching (legs try each of their callers in turn) */
export function drAssign(callers, cap) { const use = new Map(), who = Array(callers.length).fill(null);
  /* a ticket is at most a handful of legs and characters: try every way, first fit wins */
  const go = i => { if (i === callers.length) return true; for (const v of callers[i]) { const n = use.get(v) || 0; if (n >= cap) continue; use.set(v, n + 1); who[i] = v; if (go(i + 1)) return true; use.set(v, n); who[i] = null; } return false; };
  return callers.length <= 12 && go(0) ? who : null; }
/* the auto ticket for one roster: each character's 2 best calls by confidence, one a game, no game/bet type/side twice, nothing shorter than
   −500, games that haven't started, priced off the Slate like any D$ leg */
export function drAutoLegs(board, G, roster, now, price, day) { const legs = [], used = new Set(), byGame = new Map();
  for (const g of G.values()) { if (!(g.t > now + 5 * 60e3) || g.t > now + 30 * 36e5) continue; const bg = drBoardGame(board, g); if (!bg) continue; if (day && bg.b.day && bg.b.day !== day) continue; byGame.set(g.k, { g, bg }); }
  for (const v of roster) { const mine = [];
    for (const { g, bg } of byGame.values()) for (const mk of ['ml', 'spread', 'total']) for (const c of ((bg.b.calls || {})[mk] || [])) { if (!c || c.v !== v) continue;
      const flip = { away: 'home', home: 'away' }, side = bg.flip && flip[c.s] ? flip[c.s] : c.s, pr = price(g, mk, side); if (!pr || pr.price < DR_MAX_FAV) continue;
      mine.push({ k: g.k, sp: g.sp, t: g.t, game: g.a.ab + '@' + g.h.ab, mk, side, line: pr.line, price: pr.price, pick: pr.pick, v, p: +c.p || 0 }); }
    mine.sort((a, b) => b.p - a.p || a.t - b.t); let n = 0; const games = new Set();
    for (const l of mine) { if (n >= 2) break; if (games.has(l.k)) continue; const key = l.k + '|' + l.mk + '|' + l.side; if (used.has(key) || legs.some(x => x.k === l.k)) continue; used.add(key); games.add(l.k); legs.push(l); n++; } }
  return legs; }
/* the room's day, Central (the desk's clock) */
export const drDay = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
export const drStatus = (R, now) => R.cancelled ? 'cancelled' : R.paid ? 'final' : !R.order ? 'open' : R.picks.length < R.order.length ? 'draft' : now < R.ends ? 'live' : 'settling';
export const drRank = E => E.slice().sort((a, b) => b.bal - a.bal || b.w - a.w || a.joined - b.joined);
