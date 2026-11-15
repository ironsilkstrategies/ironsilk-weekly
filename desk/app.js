import { library, get as chal, checkpoints, paceAt, orderFor, simulate, ROUTES, RULES, SPORTS, TIERS as CTIERS, rankOf } from './chal-lib.js?v=1';
/* TheDesk — the public app.
   It shows what the desk publishes and nothing else: the day's Best 3 (each one sealed until 30 minutes before its
   game), every graded result, and the day's slate from public sports data. There are no models, keys or settings in
   here; nothing on this page can make a pick. */
const CFG = {
  feeds: ['../public/picks.json', 'https://raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly-site/main/public/picks.json'],
  slates: ['https://raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly/feeds/slate.json'],
  social: { tg: 'https://t.me/TheDeskApp', fb: 'https://www.facebook.com/share/1FCDFdUvRp/' },
  home: 'https://ironsilkweekly.com/desk/',
  chat: 'https://thedesk-chat.ironsilkstrategies.workers.dev',
  /* the price list, until the desk's feed carries its own (and the beta is on unless the feed says otherwise) */
  plans: [{ id: 'month', name: 'Monthly', price: 50, per: 'month', note: 'Everything, every day' }, { id: 'year', name: 'Yearly', price: 300, per: 'year', note: 'Everything, plus the VIP lounge on Telegram and in the app', best: true },
    { id: 'league', name: 'League pass', price: 100, per: 'league, per season', note: 'Everything for one league, all season' }, { id: 'pass', name: '2-day pass', price: 20, per: '2 days', note: 'Everything for 48 hours' }, { id: 'single', name: 'Single pick', price: 2, per: 'pick', note: 'One pick from a game the characters are on' }],
  deskTz: 'America/Chicago',
};

/* ── small tools ─────────────────────────────────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const okUrl = u => { try { const x = new URL(String(u)); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; } };
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('tdp.' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('tdp.' + k, JSON.stringify(v)); } catch { /* private mode: fine */ } },
};
const fin = x => typeof x === 'number' && Number.isFinite(x);
const ms = t => (typeof t === 'number' ? t : Date.parse(t || ''));
const deskDay = (t = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: CFG.deskTz }).format(new Date(t));
const noon = d => new Date(d + 'T12:00:00');
const weekday = d => noon(d).toLocaleDateString('en-US', { weekday: 'long' });
const shortDay = d => noon(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const monthDay = d => noon(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const clock = t => new Date(ms(t)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
function whenLabel(t) {
  const x = ms(t); if (!fin(x)) return '';
  const now = Date.now();
  if (sameDay(x, now)) return (new Date(x).getHours() >= 17 ? 'Tonight ' : 'Today ') + clock(x);
  if (sameDay(x, now + 864e5)) return 'Tomorrow ' + clock(x);
  return new Date(x).toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + clock(x);
}
function left(msLeft) {
  if (msLeft <= 0) return 'Opening now';
  const s = Math.floor(msLeft / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const p = n => String(n).padStart(2, '0');
  return h ? `in ${h}h ${p(m)}m ${p(r)}s` : `in ${m}m ${p(r)}s`;
}
const odds = p => (p == null || p === '' ? '' : (p > 0 ? '+' : '−') + Math.abs(p));
const unitsWon = price => (price > 0 ? price / 100 : 100 / Math.abs(price || 100));
const signed = (u, d = 2) => (u >= 0 ? '+' : '−') + Math.abs(u).toFixed(d);
const pct = p => Math.round((+p || 0) * 100);

/* ── leagues and teams (public knowledge; the feeds carry abbreviations) ─── */
const LEAGUE = { nfl: 'NFL', nba: 'NBA', nhl: 'NHL', mlb: 'MLB', ncaaf: 'College football', ncaab: 'College hoops' };
const ORDER = ['nfl', 'nba', 'nhl', 'mlb', 'ncaaf', 'ncaab'];
const UNIT = { nhl: 'goals', mlb: 'runs' };
const ESPN = { nfl: 'football/nfl', ncaaf: 'football/college-football', nhl: 'hockey/nhl', mlb: 'baseball/mlb', nba: 'basketball/nba', ncaab: 'basketball/mens-college-basketball' };
const ALIAS = {
  mlb: { CHW: 'CWS', ARI: 'AZ', OAK: 'ATH', WAS: 'WSH' },
  nfl: { WAS: 'WSH', JAC: 'JAX', LA: 'LAR', LVR: 'LV', OAK: 'LV', ARZ: 'ARI' },
  nhl: { LAK: 'LA', NJD: 'NJ', SJS: 'SJ', TBL: 'TB', VEG: 'VGK', LV: 'VGK', MON: 'MTL', UTAH: 'UTA', WAS: 'WSH' },
  nba: { GSW: 'GS', NYK: 'NY', NOP: 'NO', SAS: 'SA', UTA: 'UTAH', WAS: 'WSH', BRK: 'BKN', PHO: 'PHX', CHO: 'CHA' },
};
const ab = (sp, x) => { x = String(x || '').toUpperCase(); return (ALIAS[sp] || {})[x] || x; };
const NICK = {
  nfl: 'ARI Cardinals,ATL Falcons,BAL Ravens,BUF Bills,CAR Panthers,CHI Bears,CIN Bengals,CLE Browns,DAL Cowboys,DEN Broncos,DET Lions,GB Packers,HOU Texans,IND Colts,JAX Jaguars,KC Chiefs,LAC Chargers,LAR Rams,LV Raiders,MIA Dolphins,MIN Vikings,NE Patriots,NO Saints,NYG Giants,NYJ Jets,PHI Eagles,PIT Steelers,SEA Seahawks,SF 49ers,TB Buccaneers,TEN Titans,WSH Commanders',
  nba: 'ATL Hawks,BKN Nets,BOS Celtics,CHA Hornets,CHI Bulls,CLE Cavaliers,DAL Mavericks,DEN Nuggets,DET Pistons,GS Warriors,HOU Rockets,IND Pacers,LAC Clippers,LAL Lakers,MEM Grizzlies,MIA Heat,MIL Bucks,MIN Timberwolves,NO Pelicans,NY Knicks,OKC Thunder,ORL Magic,PHI 76ers,PHX Suns,POR Trail Blazers,SA Spurs,SAC Kings,TOR Raptors,UTAH Jazz,WSH Wizards',
  nhl: 'ANA Ducks,BOS Bruins,BUF Sabres,CAR Hurricanes,CBJ Blue Jackets,CGY Flames,CHI Blackhawks,COL Avalanche,DAL Stars,DET Red Wings,EDM Oilers,FLA Panthers,LA Kings,MIN Wild,MTL Canadiens,NJ Devils,NSH Predators,NYI Islanders,NYR Rangers,OTT Senators,PHI Flyers,PIT Penguins,SEA Kraken,SJ Sharks,STL Blues,TB Lightning,TOR Maple Leafs,UTA Mammoth,VAN Canucks,VGK Golden Knights,WPG Jets,WSH Capitals',
};
const NAMES = {};
for (const [sp, list] of Object.entries(NICK)) NAMES[sp] = Object.fromEntries(list.split(',').map(x => { const i = x.indexOf(' '); return [x.slice(0, i), x.slice(i + 1)]; }));
const teamName = (sp, a) => (NAMES[sp] || {})[ab(sp, a)] || String(a || '');
const matchup = x => { const [a, h] = String(x.game || '').split('@'); return a && h ? `${teamName(x.sp, a)} at ${teamName(x.sp, h)}` : ''; };

/* a pick, the way a bettor says it — and the same thing in plain words */
function readPick(x) {
  const p = String(x.pick || '').trim(); let m;
  if ((m = p.match(/^(Over|Under)\s+([\d.]+)$/i))) {
    const over = /over/i.test(m[1]);
    return { big: `${over ? 'Over' : 'Under'} ${m[2]}`, plain: `${over ? 'More' : 'Fewer'} than ${m[2]} total ${UNIT[x.sp] || 'points'} in the game` };
  }
  if ((m = p.match(/^(\S+)\s+ML$/i))) return { big: `${teamName(x.sp, m[1])} ML`, plain: `${teamName(x.sp, m[1])} to win the game` };
  if ((m = p.match(/^(\S+)\s+([+-])(\d+(?:\.\d+)?)$/))) {
    const t = teamName(x.sp, m[1]), n = +m[3], half = n % 1 !== 0;
    const plain = m[2] === '+'
      ? (half ? `${t} to win, or lose by ${Math.floor(n)} or fewer` : `${t} to win, or lose by fewer than ${n}`)
      : (half ? `${t} to win by ${Math.ceil(n)} or more` : `${t} to win by more than ${n}`);
    return { big: `${t} ${m[2] === '+' ? '+' : '−'}${m[3]}`, plain };
  }
  return { big: p, plain: '' };
}

/* ── state ───────────────────────────────────────────────────────────────── */
const S = { feed: null, feedErr: false, slate: null, slateErr: false, live: {}, tab: 'today', seen: {}, first: true,
  slateDay: 0, slateSp: 'all', rankSp: '', rankAll: false, openGame: '', guide: null, canPrompt: null,
  bf: Object.assign({ win: 'up', tier: 'all', bt: 'all', ch: 'all', view: 'time' }, store.get('bf') || {}) };
const TABS = ['today', 'slate', 'props', 'me', 'longshots', 'challenges', 'leagues', 'cast', 'chat', 'receipts', 'join', 'admin'];

/* ── data ────────────────────────────────────────────────────────────────── */
async function getJSON(url, wait = 9000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), wait);
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store', signal: c.signal });
    return r.ok ? await r.json() : null;
  } catch { return null; } finally { clearTimeout(t); }
}
const stateOf = x => (!x ? '' : x.hidden ? 'h' : x.push ? 'p' : x.hit === true ? 'w' : x.hit === false ? 'l' : 'o');
async function loadFeed(force) {
  const got = (await Promise.all(CFG.feeds.map(u => getJSON(u)))).filter(j => j && typeof j === 'object' && fin(j.generated));
  if (!got.length) { S.feedErr = !S.feed; if (S.tab === 'today' || S.tab === 'receipts') render(); return; }
  const F = got.sort((a, b) => b.generated - a.generated)[0];
  if (S.feed && S.feed.generated >= F.generated) { if (force) render(); if (!S.liveAt) liveTick(); return; }
  S.feed = noHeavy(F); S.feedErr = false; store.set('feed', S.feed);
  render(); liveTick();
}
async function loadSlate() {
  const got = (await Promise.all(CFG.slates.map(u => getJSON(u)))).filter(j => j && j.v === 1 && Array.isArray(j.days));
  if (!got.length) { S.slateErr = !S.slate; if (S.tab === 'slate') render(); return; }
  const SL = got.sort((a, b) => b.ts - a.ts)[0];
  if (S.slate && S.slate.ts >= SL.ts) return;
  S.slate = SL; S.slateErr = false; store.set('slate', SL);
  if (S.tab === 'slate') { render(); slateLive(); }
}
/* live scores for open picks and the slate, straight from ESPN's public scoreboard */
async function scores(sps, ymd) {
  await Promise.all(sps.filter(sp => ESPN[sp]).map(async sp => {
    try {
      /* never a cached copy: no-store for the browser, and a marker that changes every 15 s so ESPN's edge can't hand back an old one either
         (iPhone kept showing the first scores it got) */
      const ac = new AbortController(), to = setTimeout(() => ac.abort(), 8000); /* one slow league never holds up the others */
      const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${ESPN[sp]}/scoreboard?dates=${ymd}&limit=300${sp === 'ncaaf' ? '&groups=80' : sp === 'ncaab' ? '&groups=50' : ''}&_=${Math.floor(Date.now() / 15e3)}`, { cache: 'no-store', signal: ac.signal }).finally(() => clearTimeout(to));
      if (!r.ok) return;
      for (const ev of (await r.json()).events || []) {
        const c = (ev.competitions || [])[0] || {}, cs = c.competitors || [];
        const A = cs.find(z => z.homeAway === 'away'), H = cs.find(z => z.homeAway === 'home'); if (!A || !H) continue;
        const st = (c.status || ev.status || {}).type || {};
        const num = z => +(z.score && z.score.value != null ? z.score.value : z.score);
        S.live[`${sp}|${ab(sp, A.team && A.team.abbreviation)}@${ab(sp, H.team && H.team.abbreviation)}`] =
          { a: num(A), h: num(H), state: st.state === 'post' || st.completed ? 'post' : st.state === 'in' ? 'in' : 'pre', detail: st.shortDetail || st.detail || '', id: ev.id || c.id || null, period: +((c.status || ev.status || {}).period) || 0, clock: (c.status || ev.status || {}).clock != null ? +((c.status || ev.status || {}).clock) : null };
      }
      S.liveAt = Date.now(); liveRepaint(); /* each league paints as soon as it lands */
    } catch { /* scores are a nicety */ }
  }));
  S.liveAt = Date.now();
}
const liveOf = x => { const [a, h] = String(x.game || x.k || '').replace(/^[a-z]+\|/, '').split('@'); return S.live[`${x.sp}|${ab(x.sp, a)}@${ab(x.sp, h)}`] || null; };
/* a character's prop names its team, not its game: find the team's game on today's scoreboard */
function withGame(p) { if (!p || p.game || !p.team || !p.sp) return p; const t = ab(p.sp, p.team);
  const k = Object.keys(S.live).find(k => { if (!k.startsWith(p.sp + '|')) return false; const [a, h] = k.slice(p.sp.length + 1).split('@'); return a === t || h === t; });
  return k ? { ...p, game: k.slice(p.sp.length + 1) } : p; }
const castPicks = () => ((S.feed && S.feed.characters) || []).flatMap(c => (c.picks || []).filter(p => p && p.sp && p.hit == null && !p.push));
let rpT = 0; const liveRepaint = () => { clearTimeout(rpT); rpT = setTimeout(() => { if (S.tab === 'today' || S.tab === 'longshots' || (S.tab === 'cast' && !(document.activeElement && document.activeElement.id === 'castSel'))) render(); }, 120); };
async function liveTick() {
  const F = S.feed, T = F && F.today; if (!F) return;
  /* every leg the page shows live: Today's picks and parlay, the VIP Top 10 / Banker / character parlays, and the LongShots (whose legs can
     sit on another day — a ticket the book dated the next morning) */
  const V = F.vip || {}, td = String((T && T.d) || deskDay()), legsOf = a => (a || []).filter(x => x && !x.hidden && x.game && x.hit == null && !x.push);
  const items = [...legsOf(T && T.picks), ...legsOf((F.parlay || {}).legs), ...legsOf(V.top10), ...legsOf((V.banker || {}).legs), ...(V.parlays || []).flatMap(P => legsOf(P.legs)).map(x => x),
    ...((F.founder || {}).tix || []).flatMap(t => (t.legs || []).filter(l => l.sp && l.game && l.st !== 'hit' && l.st !== 'miss' && l.st !== 'push').map(l => ({ sp: l.sp, game: l.game, pick: l.pick, day: l.day || t.date })))];
  const cast = castPicks(); items.push(...cast.map(p => ({ sp: p.sp, game: p.game, pick: p.pick, day: td })));
  const by = new Map(); items.forEach(x => { const d = String(x.day || td).slice(0, 10).replace(/-/g, ''); const k = d; const set = by.get(k) || new Set(); set.add(x.sp); by.set(k, set); });
  if (!by.size) return;
  await Promise.all([...by].map(([d, sps]) => scores([...sps], d)));
  liveRepaint();
  await boxes([...items, ...cast.map(withGame)]); /* player props: their box scores, now that the scoreboard has each game's id (the cast's props find their game by team) */
  if (S.tab === 'today' || S.tab === 'longshots' || (S.tab === 'cast' && !(document.activeElement && document.activeElement.id === 'castSel'))) render();
}
async function slateLive() {
  const SL = S.slate, D = SL && SL.days[S.slateDay]; if (!D || D.d !== deskDay()) return;
  const now = Date.now(), sps = [...new Set(D.games.filter(g => g.t <= now + 5 * 60e3).map(g => g.sp))]; if (!sps.length) return;
  await scores(sps, D.d.replace(/-/g, ''));
  if (S.tab === 'slate') render();
}
/* the page grades a finished game itself, so a result never waits on the next publish */
function liveGrade(x) {
  if (!x || x.hidden || x.hit != null || x.push) return x;
  if (parseProp(x.pick)) { const P = propNow(x); return P && P.st !== 'live' ? { ...x, hit: P.st === 'hit' } : x; }
  const L = liveOf(x); if (!L || L.state !== 'post' || !fin(L.a) || !fin(L.h)) return x;
  const [ga, gh] = String(x.game).split('@'), A = L.a, H = L.h, p = String(x.pick || '').trim(); let m;
  if ((m = p.match(/^(Over|Under)\s+([\d.]+)$/i))) { const t = A + H, ln = +m[2]; return t === ln ? { ...x, push: true } : { ...x, hit: /over/i.test(m[1]) ? t > ln : t < ln }; }
  if ((m = p.match(/^(\S+)\s+ML$/i))) { if (A === H) return { ...x, push: true }; const home = ab(x.sp, m[1]) === ab(x.sp, gh); return { ...x, hit: home ? H > A : A > H }; }
  if ((m = p.match(/^(\S+)\s+([+-]\d+(?:\.\d+)?)$/))) { const home = ab(x.sp, m[1]) === ab(x.sp, gh), mar = (home ? H - A : A - H) + +m[2]; return mar === 0 ? { ...x, push: true } : { ...x, hit: mar > 0 }; }
  return x;
}
function tally(picks) {
  let w = 0, l = 0, p = 0, u = 0;
  for (const x of picks) { if (x.push) p++; else if (x.hit === true) { w++; u += unitsWon(x.price); } else if (x.hit === false) { l++; u -= 1; } }
  return { w, l, p, u, n: w + l + p };
}

/* ── pieces ──────────────────────────────────────────────────────────────── */
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></svg>';
const punches = p => { const n = Math.max(0, Math.min(10, Math.round((+p || 0) * 10))); return `<div class="punch" role="img" aria-label="${pct(p)} percent">${Array.from({ length: 10 }, (_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('')}<b>${pct(p)}%</b></div>`; };

function stampHtml(x, key) {
  const now = stateOf(x), was = S.seen[key];
  const land = !S.first && was && was !== now && was !== 'h' ? ' land' : '';
  if (x.push) return `<div class="stamp push${land}">Push<small>stake back</small></div>`;
  if (x.hit === true) return `<div class="stamp${land}">Win<small>${signed(unitsWon(x.price))}u</small></div>`;
  if (x.hit === false) return `<div class="stamp loss${land}">Loss<small>−1.00u</small></div>`;
  return '';
}
function readHtml(W, calls) {
  const ch = callsHtml(calls);
  if (!W) return ch ? `<div class="slip-stub"><div class="read">${ch}</div></div>` : '';
  const R = W.read, B = (W.bullets || []).slice(0, 6);
  if (!R && !B.length) return ch ? `<div class="slip-stub"><div class="read">${ch}</div></div>` : '';
  const paras = R ? String(R.text || '').split(/\n{2,}|\n/).map(t => t.trim()).filter(Boolean) : [];
  /* the read often opens with its own pull quote: say it once */
  const tk = R && R.take ? String(R.take).trim() : '';
  if (tk && paras[0] && paras[0].startsWith(tk)) { paras[0] = paras[0].slice(tk.length).trim(); if (!paras[0]) paras.shift(); }
  const nums = B.length ? `<ul>${B.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : '';
  if (!R) return `<div class="slip-stub"><div class="read"><b>Why the desk likes it</b>${nums}${ch}</div></div>`;
  const first = paras[0] || '', rest = paras.slice(1);
  return `<div class="slip-stub"><div class="read"><b>${esc(R.who || 'The desk')}</b>${R.take ? `<p class="take">“${esc(R.take)}”</p>` : ''}
    <div class="body">${first ? `<p>${esc(first)}</p>` : ''}${rest.length || nums ? `<details><summary>Read the rest</summary>${rest.map(t => `<p>${esc(t)}</p>`).join('')}${nums}</details>` : ''}</div>${ch}</div></div>`;
}
function slipHtml(x0, i, key, opt = {}) {
  const no = opt.no || `No. ${i + 1}`;
  if (x0.hidden) {
    const u = x0.unlockAt || (fin(ms(x0.start)) ? ms(x0.start) - 30 * 60e3 : null), lg = LEAGUE[x0.sp] || String(x0.sp || '').toUpperCase();
    return `<article class="slip locked${opt.mini ? ' mini' : ''}" data-key="${esc(key)}"><div class="slip-back">
      <span class="corner l">${esc(no)}</span><span class="corner r">${esc(lg)}</span>
      <div class="plate">${LOCK}${u ? 'Opens ' + esc(clock(u)) : 'Opens 30 min before'}</div>
      ${u ? `<div class="count" data-until="${u}">${esc(left(u - Date.now()))}</div>` : ''}
      <p>${fin(ms(x0.start)) ? `The game starts <b>${esc(whenLabel(x0.start).replace(/^(Today|Tonight) /, 'at '))}</b>. ` : ''}${opt.vip || ''}</p>
    </div></article>`;
  }
  const x = liveGrade(x0), L = liveOf(x), R = readPick(x), graded = x.hit != null || x.push, was = S.seen[key];
  const turn = !S.first && was === 'h' ? ' turn' : '';
  const [ga, gh] = String(x.game || '').split('@');
  let when = `<div class="when">${esc(whenLabel(x.start))}</div>`, score = '';
  if (L && L.state === 'in') { when = `<div class="when live"><span class="dot"></span>Live${L.detail ? ', ' + esc(L.detail) : ''}</div>`; score = `<p class="score">${esc(teamName(x.sp, ga))} ${L.a}, ${esc(teamName(x.sp, gh))} ${L.h}</p>${qBit(x, true) ? `<p class="score-q">${qBit(x, true)}</p>` : ''}`; }
  else if (graded || (L && L.state === 'post')) { when = `<div class="when">Final</div>`; if (L && L.state === 'post') score = `<p class="score">${esc(teamName(x.sp, ga))} ${L.a}, ${esc(teamName(x.sp, gh))} ${L.h}</p>`; }
  const why = opt.noRead ? '' : readHtml(x.why, x.calls);
  const fine = x.spread ? 'A spread pick, below the usual 70% bar. It is on the card so every league gets a play.' : x.tuned ? 'History-tuned: under the 70% bar, in because picks like it have made money.' : '';
  const label = opt.label || R.big, long = label.length > 10 ? ' long' : '';
  return `<article class="slip${why ? '' : ' nostub'}${opt.mini ? ' mini' : ''}${turn}" data-key="${esc(key)}"><div class="ghost"></div>
    <div class="slip-head"><span>${esc(no)}</span><span>${esc(LEAGUE[x.sp] || String(x.sp || '').toUpperCase())}</span></div>
    <div class="slip-main${graded ? ' stamped' : ''}">${when}
      <h3 class="pick${long}">${esc(label)}${x.price != null ? ` <span class="price">${esc(odds(x.price))}</span>` : ''}</h3>
      ${opt.plain || R.plain ? `<p class="plain">${esc(opt.plain || R.plain)}</p>` : ''}${opt.sub || matchup(x) ? `<p class="match">${esc(opt.sub || matchup(x))}</p>` : ''}${score}
      <div class="fields"><div class="f"><small>Confidence</small>${punches(x.p)}</div>${graded || x.price == null || x.price === '' ? '' : `<div class="f"><small>To win, 1u</small><b>${unitsWon(+x.price).toFixed(2)}u</b></div>`}</div>
      ${x.tier === 'UNANIMOUS' ? '<span class="tag">Unanimous: every voice agreed</span>' : ''}${fine ? `<p class="fine">${fine}</p>` : ''}
      ${stampHtml(x, key)}
    </div>${why}</article>`;
}
function remember(pairs) { for (const [k, x] of pairs) S.seen[k] = stateOf(liveGrade(x)); }

/* ── Today ───────────────────────────────────────────────────────────────── */
function viewToday() {
  const el = $('#v-today'), F = S.feed;
  if (!F) {
    el.innerHTML = S.feedErr
      ? `<h1 class="title">Can’t reach the desk</h1><p class="lede">The card didn’t load. Check your connection and try again.</p><div class="row" style="margin-top:18px"><button class="btn foil" data-act="retry">Try again</button></div>`
      : `<h1 class="title">Today’s card</h1><div class="slips"><div class="shimmer"></div></div>`;
    return;
  }
  const T0 = F.today, today = deskDay(), T = T0 && T0.d === today ? T0 : null, R = F.record || {};
  const picks = (T && T.picks) || [], graded = picks.map(liveGrade), sub = okUrl(F.subscribe);
  const anyHidden = picks.some(x => x.hidden), done = picks.length && graded.every(x => !x.hidden && (x.hit != null || x.push));
  let title, lede;
  if (T && picks.length) {
    title = `${weekday(T.d)}’s ${picks.length === 1 ? 'best play' : 'Best ' + picks.length}`;
    if (done) { const t = tally(graded); lede = `Final. The card went <b>${t.w}–${t.l}${t.p ? '–' + t.p : ''}</b> for <b>${signed(t.u)} units</b>.`; }
    else lede = F.beta ? `Locked at <b>${esc(clock(T.lockedAt))}</b>. Open to everyone during the beta, and graded at the final.` : `Locked at <b>${esc(clock(T.lockedAt))}</b>. Each pick opens 30 minutes before its game and is graded at the final.`;
  } else if (T) { title = `${weekday(T.d)}: no play`; lede = 'Nothing cleared the bar today. The desk doesn’t force picks.'; }
  else { title = 'Today’s card isn’t locked yet'; lede = 'The desk locks the card before the first game. Some days the answer is pass.'; }

  const n = (R.w || 0) + (R.l || 0);
  const onrec = n ? `<p class="onrec"><span>On the record: <b>${R.w}–${R.l}${R.pu ? '–' + R.pu : ''}</b>, <b>${signed(+R.u || 0, 1)} units</b>${R.first ? ' since ' + esc(monthDay(R.first)) : ''}</span><button type="button" data-go="receipts">Every result</button></p>` : '<p class="onrec"></p>';
  const vipLine = anyHidden && T ? `VIP has had it since ${esc(clock(T.lockedAt))}.` : '';
  const keys = picks.map((x, i) => `${T.d}|${i}`);
  const slips = picks.length ? `<div class="slips${S.first ? ' deal' : ''}${picks.length < 3 ? ' few' : ''}">${picks.map((x, i) => slipHtml(x, i, keys[i], { vip: vipLine })).join('')}</div>` : '';

  /* props and the Banker's parlay ride along when the desk publishes them */
  const props = (T && T.props) || [];
  const propsHtml = props.length ? `<h2 class="h2">Best ${props.length} props</h2><div class="slips${props.length < 3 ? ' few' : ''}">${props.map((x, i) => slipHtml({ ...x, game: '' }, i, `${T.d}|p${i}`, { mini: true, noRead: true, label: x.label || `${x.player || ''} ${x.side || 'over'} ${x.thr} ${x.stat || ''}`, plain: x.actual != null ? `Finished with ${x.actual}` : '', sub: x.team || '', vip: vipLine })).join('')}</div>` : '';
  const P = F.vip && F.vip.banker ? null : F.parlay;
  const parlayHtml = P && (P.legs || []).length ? `<h2 class="h2">The Banker’s parlay</h2><div class="slips few"><article class="slip nostub"><div class="slip-head"><span>${P.legs.length} legs</span><span>${esc(P.price || '')}</span></div><div class="slip-main">${tkSum(P.legs, P.p)}
      ${P.legs.map((l0, i) => { if (l0.hidden) { const u = l0.unlockAt; return `<div class="li"><span class="mk">•</span><span class="pk">Sealed leg<small>${esc(LEAGUE[l0.sp] || '')}</small></span><span class="u"${u ? ` data-until="${u}"` : ''}>${u ? esc(left(u - Date.now())) : ''}</span></div>`; }
        const l = liveGrade(l0), c = stateOf(l), N = legNow(l0); return `<div class="li"><span class="mk ${c}">${c === 'w' ? '✓' : c === 'l' ? '✗' : c === 'p' ? '=' : N.live ? '●' : '•'}</span><span class="pk">${esc(readPick(l).big)} ${esc(odds(l.price))}<small>${esc(matchup(l))}</small>${N.lv && N.lv.state !== 'pre' ? `<small class="lv">${scoreBit(l, N.lv)}${N.live ? ' · ' + qBit(l, true) : ''}</small>` : ''}</span><span class="u">${pct(l.p)}%</span></div>`; }).join('')}
      ${P.result === true ? '<div class="stamp">Cashed</div>' : P.result === false ? '<div class="stamp loss">Lost</div>' : ''}</div></article></div>` : '';

  const ups = (F.updates || []).slice(0, 5);
  const upsHtml = ups.length ? `<h2 class="h2">From the desk</h2>${ups.map(u => `<div class="memo"><time>${esc(new Date(u.ts).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }))}</time>${esc(u.text)}</div>`).join('')}` : '';

  /* before the morning lock: the last graded card stays on the felt */
  let last = '';
  if (!T) {
    const H = T0 && T0.d < today && (T0.picks || []).length ? { d: T0.d, picks: T0.picks } : (F.history || [])[0];
    if (H && (H.picks || []).length) {
      const t = tally(H.picks.map(liveGrade));
      last = `<h2 class="h2">Last card: ${esc(shortDay(H.d))}</h2><p class="note">${t.n ? `Went ${t.w}–${t.l}${t.p ? '–' + t.p : ''} for ${signed(t.u)} units.` : ''}</p>
        <div class="slips${S.first ? ' deal' : ''}${H.picks.length < 3 ? ' few' : ''}">${H.picks.map((x, i) => slipHtml(x, i, `${H.d}|${i}`, {})).join('')}</div>`;
      remember(H.picks.map((x, i) => [`${H.d}|${i}`, x]));
    }
  }
  const price = '$50/mo';
  const vip = F.beta ? `<div class="vipstrip beta"><div><h3>Open beta: the whole card is free</h3>
      <p>Every pick, every character’s breakdown, the Top 10, the Banker and every parlay, free while the desk is in beta.</p></div>
      <div class="row"><button type="button" class="btn foil" data-go="cast">Meet the characters</button><button type="button" class="btn line" data-go="join">See the plans</button></div></div>` : sub && F.beta === false ? `<div class="vipstrip"><div><h3>${anyHidden ? 'VIP already has all ' + (picks.length === 3 ? 'three' : 'of them') : 'Get the card the minute it locks'}</h3>
      <p>Members get the Best 3 at lock time, the Top 10 plays and every character’s parlay, in a private Telegram.</p></div>
      <div class="row"><a class="btn foil" href="${esc(sub)}" target="_blank" rel="noopener">Join VIP${price ? ', ' + esc(price) : ''}</a><button type="button" class="btn line" data-go="join">What you get</button></div></div>` : '';

  el.innerHTML = `<h1 class="title">${esc(title)}</h1><p class="lede">${lede}</p>${onrec}${slips}${founderHtml()}${strongHtml()}${last}${propsHtml}${parlayHtml}${T ? vipHtml(F) : ''}${upsHtml}
    <div id="seal"></div>${vip}
    ${T && picks.length ? `<div class="row" style="margin-top:22px"><button type="button" class="btn line" data-act="share">Share today’s card</button></div>` : ''}${footHtml()}`;
  if (T) { remember(picks.map((x, i) => [keys[i], x])); remember(props.map((x, i) => [`${T.d}|p${i}`, x])); seal(T); }
  S.first = false;
}
/* ── Founder LongShot Parlays: the founder's own tickets, live, to tail ── */
const decAm = d => !d || d <= 1 ? '' : d >= 2 ? '+' + Math.round((d - 1) * 100).toLocaleString('en-US') : '−' + Math.round(100 / (d - 1));
const FST = { hit: ['✓', 'hit'], miss: ['✗', 'miss'], push: ['↺', 'push'], live: ['●', 'live'], open: ['·', 'open'] };
const nmShort = pk => (parseProp(pk) || {}).name || '';
const legText = l => l.prop || !l.game ? l.pick : (readPick({ sp: l.sp, game: l.game, pick: l.pick }).big || l.pick);
function founderLeg(l) {
  const [ic, cls] = FST[l.st] || FST.open, bar = l.prog && l.st !== 'open' ? Math.max(0, Math.min(100, l.prog.d === 'under' ? (l.prog.v <= l.prog.t ? 100 : 0) : (l.prog.v / l.prog.t) * 100)) : null;
  return `<li class="fl ${cls}"><span class="fl-ic">${ic}</span><span class="fl-pk">${esc(legText(l))}${l.price != null ? ` <small>${esc(odds(l.price))}</small>` : ''}
    <small class="fl-g">${esc([l.game ? matchup(l) : '', l.st === 'open' && l.start ? whenLabel(l.start) : ''].filter(Boolean).join(' · '))}</small>
    ${(() => { const lv = l.game && (l.st === 'live' || l.st === 'open') ? liveOf(l) : null; const on = lv && lv.state === 'in';
      /* one score line: while ESPN's live score is on the leg, the grade line from the last publish (a step behind) stays off — props keep theirs (the stat + bar) */
      const dt = l.detail && !(on && (!l.prop || l.ph)) && !(l.ph && l.ph.st !== 'live') ? `<small class="fl-d">${esc(l.detail)}</small>` : '';
      const qb = on && (!l.prop || l.ph) ? qBit(l, true) : '', fin = l.ph && l.ph.st !== 'live' ? `<small class="fl-d">${esc(nmShort(l.pick))} ${l.ph.v} · ${(liveOf(l) || {}).state === 'post' ? 'final' : l.ph.st === 'hit' ? 'cleared it' : 'went over'}</small>` : '';
      return (on ? `<small class="lv">${scoreBit(l, lv)}${qb ? ' · ' + qb : ''}</small>` : '') + (fin || dt); })()}${bar != null ? `<span class="fl-bar"><i style="width:${bar.toFixed(0)}%"></i></span>` : ''}</span></li>`;
}
function founderSum(t) { const L = t.legs || []; if (L.length < 2) return ''; const lv = l => { const x = l.game ? liveOf(l) : null; return l.st === 'live' || (l.st === 'open' && x && x.state === 'in'); };
  const live = L.filter(lv).length, togo = L.filter(l => l.st === 'open' && !lv(l)).length, lost = t.res === 'lost', started = L.some(l => l.st !== 'open') || live;
  const nx = L.filter(l => l.st === 'open' && !lv(l) && l.start && Date.parse(l.start) > Date.now()).map(l => Date.parse(l.start)).sort((a, b) => a - b)[0];
  const p0 = t.p0, anyLv = L.some(l => { const x = l.game ? liveOf(l) : null; return x && x.state === 'in'; });
  /* the phone's own number while games are live (moves with every score refresh); the desk's when nothing's live to read */
  const now = lost ? 0 : anyLv ? L.reduce((a, l) => a * (l.st === 'hit' || l.st === 'push' ? 1 : l.st === 'miss' ? 0 : (liveQ(l) ?? 1)), 1) : t.now;
  return `<div class="tk-sum">${p0 != null ? `<b>${fmtP(p0)}</b> · 1 in ${p1in(p0)} · ` : ''}${L.length} legs${live ? ` · <span class="lv-on">● ${live} live</span>` : ''}${togo ? ` · ${togo} to go` : ''}${nx ? ` · next ${esc(clock(new Date(nx).toISOString()))}` : ''}</div>
    ${started && p0 != null && now != null ? `<div class="tk-live ${lost ? 'dn' : now >= p0 ? 'up' : ''}">📡 ${live ? 'Live' : 'Now'} cash chance ${lost ? '0% · busted' : `${fmtP(now)} · 1 in ${p1in(now)} <small>(was 1 in ${p1in(p0)} pre-game)</small>`}</div>` : ''}${live && S.liveAt ? `<div class="tk-upd">Scores updated ${esc(new Date(S.liveAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }))}</div>` : ''}`; }
function founderHtml(page) {
  const F = S.feed && S.feed.beta !== false && S.feed.founder; if (!F || !Array.isArray(F.tix) || !F.tix.length) return '';
  const R = F.rec || {}, card = t0 => { const t = effTicket(t0); const n = t.legs.length, done = t.legs.filter(l => l.st === 'hit' || l.st === 'miss' || l.st === 'push').length;
    const chip = t.res === 'cashed' ? '<span class="fchip win">Cashed</span>' : t.res === 'lost' ? '<span class="fchip loss">Lost</span>' : t.res === 'live' ? `<span class="fchip live">● Live · ${t.hit} of ${n} hit</span>` : '<span class="fchip">Pending</span>';
    return `<article class="slip founder nostub ${t.res}"><div class="slip-head"><span>${esc(t.name || 'LongShot')} · ${n} legs</span>${chip}</div><div class="slip-main">
      <div class="f-odds">${t.dec ? `<b>${esc(decAm(t.dec))}</b><span>$10 pays <b>$${(10 * t.dec).toLocaleString('en-US', { maximumFractionDigits: 0 })}</b></span>` : ''}<span class="f-prog">${done} of ${n} settled</span></div>
      ${founderSum(t)}<ol class="fl-list">${t.legs.map(founderLeg).join('')}</ol>
      ${t.res === 'open' || t.res === 'live' ? `<div class="row"><button type="button" class="btn foil" data-act="tail" data-id="${esc(t.id)}">📋 Tail this</button></div>` : ''}</div></article>`; };
  if (!page) return `<section class="vsec" id="founder"><div class="vh"><h2 class="h2">Founder LongShot Parlays</h2>${vipBadge()}</div><p class="note">The founder’s live tickets are on the <button type="button" class="link" data-go="longshots">LongShots tab</button>.</p><div class="fgrid">${F.tix.filter(t => t.res === 'live' || t.res === 'open').slice(0, 1).map(card).join('')}</div></section>`;
  return `<section class="vsec" id="founder"><div class="vh">${vipBadge()}${R.cashed + R.lost ? `<span class="f-rec">Last 30 days: <b>${R.cashed} cashed</b>, ${R.lost} lost</span>` : ''}</div>
    <div class="fgrid">${F.tix.map(card).join('')}</div></section>`;
}
/* ── Desk Dollars (v3.0.22). D$1,000 on sign-up, play money only. Open a game on the Slate → tap a line → it lands on your
   D$ slip; place it and the server prices it from the slate and grades it from the finals. Bought D$ shows in its own color;
   the leaderboard ranks earned D$. */
S.dd = store.get('ddslip') || []; S.ddMode = store.get('ddmode') || 'parlay'; S.ddFrom = store.get('ddfrom') || '';
/* same pricing as the server: parlay multiplies; SGP folds a team's ML + own spread and pays 80% of each game's profit; cap 10,000x */
function ddTicketDec(legs, mode) { const G = new Map(); legs.forEach(l => { const a = G.get(l.k) || []; a.push(l); G.set(l.k, a); }); let dec = 1;
  for (const L of G.values()) { if (mode !== 'sgp' || L.length < 2) { dec *= L.reduce((x, l) => x * ddDec(l.price), 1); continue; } let eff = L.slice(); const ml = eff.find(l => l.mk === 'ml'), sp = eff.find(l => l.mk === 'spread');
    if (ml && sp && ml.side === sp.side) eff = eff.filter(l => l !== (sp.line < 0 ? ml : sp)); const prod = eff.reduce((x, l) => x * ddDec(l.price), 1); dec *= eff.length > 1 ? 1 + (prod - 1) * 0.8 : prod; } return dec; }
const slateGameOf = k => { for (const d of ((S.slate && S.slate.days) || [])) for (const g of (d.games || [])) if (g.k === k) return g; return null; };
const DDJ = -110, ddDec = p => (p > 0 ? 1 + p / 100 : 1 + 100 / -p), dd$ = n => 'D$' + (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
function ddLegOf(g, mk, side) { const ln = g.ln || {}; if (mk === 'ml') { const p = side === 'away' ? ln.mlA : ln.mlH; return fin(p) ? { price: p, pick: `${side === 'away' ? g.a.ab : g.h.ab} ML` } : null; }
  if (mk === 'spread') { if (!fin(ln.line) || !ln.fav) return null; const team = side === 'away' ? g.a.ab : g.h.ab; const line = team === ln.fav ? -Math.abs(ln.line) : Math.abs(ln.line); return { price: DDJ, line, pick: `${team} ${line > 0 ? '+' : ''}${line}` }; }
  if (mk === 'total') return fin(ln.tot) ? { price: DDJ, pick: `${side === 'over' ? 'Over' : 'Under'} ${ln.tot}` } : null; return null; }
function ddBtns(g) { if (!(g.t > Date.now() + 60e3) || !g.ln) return ''; const on = (mk, sd) => S.dd.some(l => l.k === g.k && l.mk === mk && l.side === sd);
  const btn = (mk, sd) => { const L = ddLegOf(g, mk, sd); return L ? `<button type="button" class="ddb${on(mk, sd) ? ' on' : ''}" data-act="ddpick" data-k="${esc(g.k)}" data-mk="${mk}" data-side="${sd}"><b>${esc(L.pick)}</b><small>${esc(odds(L.price))}</small></button>` : '<span></span>'; };
  return `<div class="g-sec"><h4>Play it with Desk Dollars</h4><p class="g-note">Per game: moneyline or spread, plus the total. ${g.sp === 'nhl' ? 'Hockey parlays: moneyline + total, or the puck line alone (puck line + total takes an SGP). ' : ''}An SGP needs both picks in every game. No ticket pays over 10,000x.</p><div class="ddgrid"><span class="ddh">Moneyline</span><span class="ddh">Spread</span><span class="ddh">Total</span>${btn('ml', 'away')}${btn('spread', 'away')}${btn('total', 'over')}${btn('ml', 'home')}${btn('spread', 'home')}${btn('total', 'under')}</div></div>`; }
function ddSlipBar() { if (!S.dd.length) return ''; const sgp = S.ddMode === 'sgp', dec = ddTicketDec(S.dd, S.ddMode), st = +(store.get('ddstake') || 25); const W = AC.me && AC.me.wallet;
  const per = {}; S.dd.forEach(l => { per[l.k] = (per[l.k] || 0) + 1; }); const thin = sgp && Object.values(per).some(n => n < 2), over = dec > 10000;
  const nhlPair = !sgp && S.dd.some(l => l.sp === 'nhl' && l.mk === 'spread' && per[l.k] > 1);
  const warn = over ? `Pays ${Math.round(dec).toLocaleString('en-US')}x: the most any ticket can pay is 10,000x the stake. Drop a leg.` : thin ? 'An SGP needs two picks in every game on it: its side and its total.' : nhlPair ? 'Hockey parlay: puck line + total takes an SGP. Switch to SGP or drop one.' : '';
  return `<div class="pslipbar ddslip"><div><div class="ddmode">${['parlay', 'sgp'].map(m => `<button type="button" class="${S.ddMode === m ? 'on' : ''}" data-act="ddmode" data-v="${m}">${m === 'sgp' ? 'SGP' : 'Parlay'}</button>`).join('')}</div>
    <b>${S.dd.length} leg${S.dd.length > 1 ? 's' : ''} · ${esc(odds(decAm(dec)))}</b><small>${S.dd.map(l => esc(l.pick)).join(' · ')}</small>
    ${liveRuns().length || liveLgs().length ? `<small class="ddfrom">From <select id="ddFrom" data-change="ddfrom" aria-label="Bet from"><option value="">Wallet · ${dd$(W ? W.bal : 0)}</option>${liveRuns().map(r => `<option value="run:${esc(r.rid)}"${fromKey() === 'run:' + r.rid ? ' selected' : ''}>🎯 ${esc(CHN(r.cid))} · ${dd$(r.bal)}</option>`).join('')}${liveLgs().map(g => `<option value="lg:${esc(g.lid)}"${fromKey() === 'lg:' + g.lid ? ' selected' : ''}>🏆 ${esc(g.name)} · ${dd$(g.bal)}</option>`).join('')}</select></small>` : ''}
    ${warn ? `<small class="ddwarn">${esc(warn)}</small>` : `<small>${W && !fromKey() ? `You have ${dd$(W.bal)}. ` : ''}Stake <input id="ddStake" inputmode="decimal" value="${st}" aria-label="Stake in Desk Dollars"> pays <span id="ddPays">${dd$(st * dec)}</span></small>`}</div>
    <button type="button" class="btn sm" data-act="ddplace"${warn ? ' disabled' : ''}>Place it</button><button type="button" class="btn ghost sm" data-act="ddclear">✕</button></div>`; }
function walletHtml(W) { if (!W) return ''; const bought = Math.max(0, Math.min(W.bought || 0, W.bal)), earned = W.bal - bought, net = W.bal - (W.bought || 0) - 1000;
  return `<div class="wallet"><div class="w-top"><span class="w-lab">Desk Dollars</span><b class="w-bal">${dd$(W.bal)}</b><span class="w-net ${net >= 0 ? 'up' : 'dn'}">${net >= 0 ? '+' : '−'}${dd$(Math.abs(net)).replace('D$', 'D$')} earned since your D$1,000</span></div>
    <div class="w-bar"><i class="e" style="flex:${Math.max(earned, 0.0001)}"></i>${bought ? `<i class="b" style="flex:${bought}"></i>` : ''}</div>
    <div class="w-key"><span><i class="e"></i>Earned ${dd$(earned)}</span>${W.bought ? `<span><i class="b"></i>Bought ${dd$(W.bought)}</span>` : ''}<span>${W.w}-${W.l}${W.p ? '-' + W.p : ''} on settled bets</span></div>
    <p class="note">Play money for bragging rights, never cashed out. D$ won in challenges and leagues lands here as earned D$. Bought D$ shows in its own color and never counts on the leaderboard. ${AC.me && AC.me.store ? '' : '<b>The D$ store opens soon.</b>'}</p></div>`; }
function ddBetHtml(b) { const chip = { won: `✓ Won ${dd$(b.back)}`, lost: '✗ Lost', push: '↺ Push', open: `Open · to win ${dd$(b.toWin)}` }[b.status];
  return `<article class="slip mytk nostub ${b.status === 'won' ? 'cashed' : b.status}"><div class="slip-head"><span>${dd$(b.stake)} · ${b.mode === 'sgp' ? 'SGP · ' + b.legs.length + ' legs' : b.legs.length > 1 ? b.legs.length + '-leg' : 'single'}</span><span class="fchip ${b.status === 'won' ? 'cashed' : b.status}">${chip}</span></div><div class="slip-main">
    <ul class="fl-list">${b.legs.map(l => `<li class="fl ${l.res || 'open'}"><span class="fl-ic">${l.res === 'hit' ? '✓' : l.res === 'miss' ? '✗' : l.res === 'push' ? '↺' : '○'}</span><div class="fl-b"><b>${esc(l.pick)} ${esc(odds(l.price))}</b><small>${esc([LEAGUE[l.sp], l.game.replace('@', ' at '), l.res ? '' : clock(l.t)].filter(Boolean).join(' · '))}${l.void ? ' · voided' : ''}</small></div></li>`).join('')}</ul></div></article>`; }
let LB = null;
async function lbLoad() { try { const r = await fetch(CFG.chat + '/acct/board'); if (r.ok) { LB = await r.json(); if (S.tab === 'me') { const n = $('#lb'); if (n) n.outerHTML = lbHtml(); } } } catch (e) { } }
function lbHtml() { const P = acctPass(); if (!LB) return '<section id="lb" class="vsec"><h2 class="h2">The leaderboard</h2><div class="shimmer"></div></section>';
  return `<section id="lb" class="vsec"><h2 class="h2">The leaderboard</h2><p class="note">Ranked by Desk Dollars earned from the D$1,000 everyone starts with. Bought D$ shows in blue and never counts.</p>
    <div class="psheet lb"><div class="ps-h"><span>#</span><span>Player</span><span>Earned</span><span>Record</span></div>${LB.rows.map((r, i) => `<div class="ps-r${P && P.name === r.name ? ' on' : ''}"><span>${i + 1}</span><span><b>${esc(r.name)}</b>${r.bought ? `<small class="lb-b">+${dd$(r.bought)} bought</small>` : ''}</span><span class="ps-s">${dd$(r.earned)}</span><span>${r.w}-${r.l}${r.roi != null ? `<small>${r.roi > 0 ? '+' : ''}${r.roi}% ROI</small>` : ''}</span></div>`).join('') || '<div class="ps-r"><span></span><span>Be the first on the board.</span></div>'}</div></section>`; }
/* ── Accounts + My Tickets (v3.0.21, Chris, Nov 15). Sign up with a username and a password (21+), kept on our Cloudflare.
   Track tickets from the Props slip, from the board, or by typing your own legs; they follow you to any device. Legs on the
   desk's picks grade themselves from the board; your own legs you mark as they settle. */
const AC = { me: null, busy: false, err: '', open: false };
const acctPass = () => store.get('acct');
async function acctApi(path, body) { const r = await fetch(CFG.chat + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch { /* empty */ } if (!r.ok) { const e = new Error(j.error || 'the server didn’t answer'); e.status = r.status; throw e; } return j; }
async function acctLoad() { const P = acctPass(); if (!P) { AC.me = null; return; } try { AC.me = await acctApi('/acct/me', { token: P.token }); AC.err = ''; }
  catch (e) { if (e.status === 401) { store.set('acct', null); AC.me = null; } else AC.err = 'Your tickets can’t be reached right now.'; } acctBadge(); if (S.tab === 'me') viewMe(); else if (S.tab === 'challenges') viewChallenges(); else if (S.tab === 'leagues') viewLeagues(); else if (S.tab === 'admin') viewAdmin(); }
function acctBadge() { const b = $('#acctBtn'); if (!b) return; const P = acctPass(); b.classList.toggle('dot', !!(AC.me && AC.me.inbox && AC.me.inbox.unread)); document.body.classList.toggle('is-owner', !!(AC.me && AC.me.owner)); b.textContent = P ? P.name.slice(0, 1).toUpperCase() : ''; b.classList.toggle('in', !!P); b.setAttribute('aria-label', P ? `My tickets (${P.name})` : 'Sign in'); }
const tid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function legAuto(l) { if (l.src !== 'pick' || l.res) return l.res; const B = boardOf(); if (!B) return null; const g = (B.games || []).find(x => x.sp === l.sp && x.game === l.game); if (!g) return null;
  for (const a of Object.values(g.calls || {})) for (const c of a) if (c.pick === l.pick && c.hit != null) return c.hit === true ? 'hit' : c.hit === false ? 'miss' : null; return null; }
function tkState(t) { const R = t.legs.map(l => l.res || legAuto(l)); const miss = R.includes('miss'), done = R.every(Boolean);
  return { R, res: miss ? 'lost' : done ? 'cashed' : R.some(Boolean) ? 'live' : 'open', hit: R.filter(x => x === 'hit').length }; }
const tkDec = t => { if (t.odds) return t.odds > 0 ? 1 + t.odds / 100 : 1 + 100 / -t.odds; const P = t.legs.map(l => l.price); return P.every(x => x != null) ? P.reduce((a, x) => a * (x > 0 ? 1 + x / 100 : 1 + 100 / -x), 1) : null; };
async function tkSave(t, msg) { const P = acctPass(); if (!P) { AC.open = true; go('me', true); toast('Sign in to track tickets'); return false; }
  try { const j = await acctApi('/acct/save', { token: P.token, ticket: t }); const L = (AC.me && AC.me.tickets) || []; const i = L.findIndex(x => x.id === t.id);
    if (i >= 0) L[i] = j.ticket; else L.unshift(j.ticket); if (AC.me) AC.me.tickets = L; if (msg) toast(msg); return true; } catch (e) { toast(e.message); return false; } }
function slipTicket() { const all = propsAll(); const L = S.slip.map(id => all.find(x => x.id === id)).filter(Boolean); if (!L.length) return null;
  return { id: tid(), ts: Date.now(), title: `${L.length}-leg prop slip`, legs: L.map(x => ({ src: 'prop', ref: x.id, sp: x.sp, game: x.opp ? (x.home ? x.opp + '@' + x.team : x.team + '@' + x.opp) : '', pick: `${x.player} (${x.team}) ${pLine(x)}`, price: null, start: x.start || '' })) }; }
function myRecord(L) { let c = 0, l = 0, h = 0, n = 0; L.forEach(t => { const st = tkState(t); if (st.res === 'cashed') c++; if (st.res === 'lost') l++; st.R.forEach(r => { if (r === 'hit') { h++; n++; } else if (r === 'miss') { n++; } }); }); return { c, l, h, n }; }
function myTicketHtml(t) { const st = tkState(t), dec = tkDec(t), chip = { cashed: '✓ Cashed', lost: '✗ Lost', live: `● Live · ${st.hit} of ${t.legs.length}`, open: 'Open' }[st.res];
  return `<article class="slip mytk nostub ${st.res}"><div class="slip-head"><span>${esc(t.title || `${t.legs.length}-leg ticket`)}</span><span class="fchip ${st.res}">${chip}</span></div><div class="slip-main">
    ${dec ? `<div class="f-odds"><b>${esc(odds(decAm(dec)))}</b>${t.stake ? `<span>$${t.stake} to win $${(t.stake * (dec - 1)).toFixed(2)}</span>` : ''}</div>` : ''}
    <ul class="fl-list">${t.legs.map((l, i) => { const r = st.R[i]; return `<li class="fl ${r || 'open'}"><span class="fl-ic">${r === 'hit' ? '✓' : r === 'miss' ? '✗' : r === 'push' ? '↺' : '○'}</span><div class="fl-b"><b>${esc(l.pick)}${l.price != null ? ' ' + esc(odds(l.price)) : ''}</b>
      <small>${esc([LEAGUE[l.sp], l.game ? l.game.replace('@', ' at ') : '', l.src === 'pick' ? 'grades itself' : ''].filter(Boolean).join(' · '))}</small>
      ${l.src !== 'pick' ? `<span class="mk">${['hit', 'miss', 'push'].map(v => `<button type="button" class="${l.res === v ? 'on' : ''}" data-act="tkmark" data-id="${esc(t.id)}" data-i="${i}" data-v="${v}">${v === 'hit' ? '✓ Hit' : v === 'miss' ? '✗ Miss' : 'Push'}</button>`).join('')}</span>` : ''}</div></li>`; }).join('')}</ul>
    <div class="row"><button type="button" class="btn ghost sm" data-act="tkdel" data-id="${esc(t.id)}">Delete</button></div></div></article>`; }
function viewMe() {
  const el = $('#v-me'), P = acctPass();
  if (!P) { el.innerHTML = `<h1 class="title">Your tickets</h1><p class="lede">Sign in to track your own tickets on any device: build them from the Props slip, add the desk's picks, or type your own legs.</p>
    <div class="paper acctbox"><div class="pview">${['login', 'signup'].map(v => `<button type="button" class="${(AC.mode || 'login') === v ? 'on' : ''}" data-act="acmode" data-v="${v}">${v === 'login' ? 'Sign in' : 'Create account'}</button>`).join('')}</div>
      <form data-form="acct" autocomplete="on"><label>Username<input name="name" required minlength="2" maxlength="20" autocomplete="username" autocapitalize="off"></label>
      <label>Password<input name="pass" type="password" required minlength="8" autocomplete="${AC.mode === 'signup' ? 'new-password' : 'current-password'}"></label>
      ${AC.mode === 'signup' ? '<label class="chk"><input name="age21" type="checkbox" required> I’m 21 or older</label>' : ''}
      <p class="chat-err" id="acctErr" role="alert"></p><button class="btn" type="submit">${AC.mode === 'signup' ? 'Create account' : 'Sign in'}</button></form>
      <p class="note">Your password is never stored, only a scrambled copy of it. <a href="privacy.html">Privacy</a></p>
      ${isStandalone() ? '' : '<p class="note"><b>Tip:</b> <button type="button" class="link" data-act="guide">save TheDesk as an app</button> and you stay signed in for good.</p>'}</div>
    <div class="paper ddpitch"><b>D$1,000 the moment you sign up</b><p>Desk Dollars are play money: bet them on any game on the Slate, flip them, and climb the leaderboard for bragging rights.</p></div>${lbHtml()}${footHtml()}`; if (!LB) lbLoad(); return; }
  const L = (AC.me && AC.me.tickets) || [], R = myRecord(L);
  el.innerHTML = `<h1 class="title">Your tickets</h1><p class="lede">Signed in as <b>${esc(P.name)}</b>. <button type="button" class="link" data-act="aclogout">Sign out</button></p>
    ${AC.me && AC.me.owner ? '<div class="row"><button type="button" class="btn foil" data-go="admin">🛠 Admin dashboard</button></div>' : ''}${myInbox()}${AC.me ? walletHtml(AC.me.wallet) : ''}${AC.me && (AC.me.bets || []).length ? `<h2 class="h2">Your D$ bets</h2><div class="fgrid">${AC.me.bets.slice(0, 20).map(ddBetHtml).join('')}</div>` : AC.me ? '<p class="note">Open any game on the <button type="button" class="link" data-go="slate">Slate</button> and tap a line to bet Desk Dollars.</p>' : ''}
    ${AC.me && AC.me.owner ? `<div class="paper owner ddown"><b>Owner tools</b><form data-form="ddgrant"><label>Give D$ to<input name="who" required maxlength="20" placeholder="username"></label><label>Amount<input name="amt" inputmode="numeric" required placeholder="500"></label><button class="btn sm" type="submit">Add D$</button></form><p class="note">Added D$ counts as bought: it shows in blue and never counts on the leaderboard.</p></div>` : ''}
    ${lbHtml()}<h2 class="h2">Your real tickets</h2>
    ${AC.me ? `<div class="mystats"><span><b>${R.c}</b>cashed</span><span><b>${R.l}</b>lost</span><span><b>${R.n ? Math.round(100 * R.h / R.n) + '%' : '—'}</b>legs hit</span><span><b>${L.length}</b>tickets</span></div>` : ''}
    <details class="paper newtk"${AC.open ? ' open' : ''}><summary>＋ New ticket</summary><form data-form="newtk"><label>Name it (optional)<input name="title" maxlength="40" placeholder="Sunday 3-leg"></label>
      <label>Legs, one per line<textarea name="legs" rows="4" required placeholder="Bills -3 -110&#10;Kaprizov 3+ SOG&#10;Over 221.5 -105"></textarea></label>
      <div class="row2"><label>Stake $<input name="stake" inputmode="decimal" placeholder="5"></label><label>Ticket odds<input name="odds" inputmode="numeric" placeholder="+600"></label></div>
      <button class="btn" type="submit">Track it</button></form><p class="note">Tip: build a slip on the Props tab and tap “Track it” — or tap ＋ on any pick on the Slate.</p></details>
    <p class="chat-err" role="alert">${esc(AC.err)}</p>
    ${!AC.me ? '<div class="shimmer"></div>' : L.length ? `<div class="fgrid">${L.map(myTicketHtml).join('')}</div>` : '<div class="paper blank"><b>No tickets yet</b><p>Your first one shows up here.</p></div>'}
    ${AC.me && AC.me.owner ? '' : `<details class="closeacct"><summary>Delete my account</summary><form data-form="acclose"><p class="note">This deletes your account and every ticket on it, for good.</p><label>Your password<input name="pass" type="password" required autocomplete="current-password"></label><button class="btn ghost sm" type="submit">Delete it</button></form></details>`}${footHtml()}`;
  AC.open = false; if (!LB) lbLoad();
}
function parseLegs(txt) { return String(txt || '').split(/\n+/).map(x => x.trim()).filter(Boolean).slice(0, 15).map(line => { const m = line.match(/\s([+-−]\d{3,5})\s*$/);
  const price = m ? +m[1].replace('−', '-') : null; return { src: 'own', pick: (m ? line.slice(0, m.index) : line).trim().slice(0, 80), price }; }).filter(l => l.pick); }
/* ── Props (v3.0.20, Chris, Nov 14: "better than them… unrecognizable… way more modern"). Our own take, our own look:
   · the Desk Score — one 0–100 read per prop: his last 10, his last 5, how sure the room is, how many characters are on it;
   · the run strip — his last 10 games as ticket stubs against the line, punched gold when he cleared it;
   · lenses — smart presets, not just filters: the room agrees, on a heater, bounce-back (missed last time, usually clears),
     home cooking, road trip; plus sport, stat and a minimum score;
   · the room — every character seated at the table with its own read;
   · whispers — a running ticker of what the numbers are saying today;
   · the slip — stack props into your own slip; the room's combined chance and fair odds update as you build, then copy it. */
const PL = { all: 'Everything', room: 'The room agrees', heat: 'On a heater', bounce: 'Bounce-back', home: 'Home cooking', road: 'Road trip' };
S.pf = store.get('pf') || { lens: 'all', sp: 'all', stat: 'all', min: 0, sort: 'score', view: 'cards' };
S.slip = store.get('pslip') || [];
const pRate = a => (a && a[1] ? a[0] / a[1] : 0);
const pScore = x => Math.round(100 * (0.35 * pRate(x.l10) + 0.2 * pRate(x.l5) + 0.3 * (x.p || 0) + 0.15 * Math.min((x.votes || 0) / 5, 1)));
const pLine = x => `${x.side === 'under' ? 'Under ' : ''}${x.side === 'under' ? x.thr : x.thr + '+'} ${x.lab}`;
const pCast = v => { const C = (S.feed && S.feed.characters) || []; const c = C.find(z => z.v === v); const k = castOf(v); return { name: (c && c.name) || k.name, color: k.color }; };
function propsAll() { const P = S.feed && S.feed.beta !== false && S.feed.props; return P && Array.isArray(P.props) ? P.props.map(x => ({ ...x, score: pScore(x) })) : []; }
function lensOk(x, l) { const r10 = pRate(x.l10), lastHit = x.streak > 0;
  return l === 'room' ? x.votes >= 3 : l === 'heat' ? x.streak >= 4 : l === 'bounce' ? !lastHit && r10 >= 0.6 : l === 'home' ? x.home === true : l === 'road' ? x.home === false : true; }
function propsShown() { const f = S.pf; let L = propsAll().filter(x => lensOk(x, f.lens) && (f.sp === 'all' || x.sp === f.sp) && (f.stat === 'all' || x.lab === f.stat) && x.score >= (f.min || 0));
  const by = { score: x => x.score, l10: x => pRate(x.l10), streak: x => x.streak, votes: x => x.votes * 10 + x.p };
  return L.sort((a, b) => (by[f.sort] || by.score)(b) - (by[f.sort] || by.score)(a)); }
/* who and where, every time: "Kirill Kaprizov (MIN vs CHI)" — a line with no game means nothing */
const pWho = x => `${x.player} (${[x.team, x.opp ? (x.home === false ? 'at ' : 'vs ') + x.opp : ''].filter(Boolean).join(' ')}${x.start ? ', ' + whenLabel(x.start) : ''})`;
function whispers(L) { const out = [];
  L.filter(x => x.streak >= 5).slice(0, 4).forEach(x => out.push(`🔥 ${pWho(x)} has cleared ${pLine(x)} ${x.streak} straight`));
  L.filter(x => x.l10[0] === x.l10[1] && x.l10[1] >= 8).slice(0, 3).forEach(x => out.push(`💯 ${pWho(x)}: ${pLine(x)} in all of his last ${x.l10[1]}`));
  L.filter(x => x.votes >= 4).slice(0, 3).forEach(x => out.push(`🪑 ${x.votes} characters at the table on ${pWho(x)} ${pLine(x)}`));
  L.filter(x => x.streak < 0 && pRate(x.l10) >= 0.7).slice(0, 3).forEach(x => out.push(`↩︎ ${pWho(x)} missed last time, but clears ${pLine(x)} ${x.l10[0]} of 10`));
  return out; }
function runStrip(x) { const mx = Math.max(x.thr * 1.6, ...x.last, 1); const lineY = Math.min(100, (x.thr / mx) * 100);
  return `<div class="pstrip" role="img" aria-label="Last ${x.last.length} games: ${x.last.join(', ')}; line ${x.thr}">${x.last.map(v => { const hit = x.side === 'under' ? v < x.thr : v >= x.thr;
    return `<span class="pst ${hit ? 'y' : 'n'}" style="--h:${Math.max(6, Math.min(100, (v / mx) * 100))}%"><i>${v % 1 ? v.toFixed(1) : v}</i></span>`; }).join('')}<b class="pline" style="bottom:${lineY}%"></b></div>`; }
function scoreRing(n) { const c = n >= 75 ? 'var(--foil)' : n >= 60 ? 'var(--win)' : 'var(--cream-3)';
  return `<div class="pring" style="--n:${n};--c:${c}"><b>${n}</b><small>Desk</small></div>`; }
function propCard(x) { const inSlip = S.slip.includes(x.id);
  const room = x.by.map(b => { const k = pCast(b.v); return `<span class="seat" style="--c:${k.color}" title="${esc(k.name)}: ${Math.round(b.p * 100)}%"><i></i>${esc(k.name.replace(/^The /, ''))} <b>${Math.round(b.p * 100)}%</b></span>`; }).join('');
  return `<article class="pcard${inSlip ? ' on' : ''}"><div class="pc-top">${scoreRing(x.score)}<div class="pc-who"><h3>${esc(x.player)}</h3><p class="pc-line">${esc(pLine(x))}</p>
      <small>${esc([LEAGUE[x.sp], x.opp ? (x.home ? 'vs ' : 'at ') + x.opp : x.team, x.start ? whenLabel(x.start) : ''].filter(Boolean).join(' · '))}</small></div></div>
    ${runStrip(x)}
    <div class="pchips"><span class="pchip ${pRate(x.l5) >= 0.8 ? 'hot' : ''}">L5 <b>${x.l5[0]}/${x.l5[1]}</b></span><span class="pchip ${pRate(x.l10) >= 0.7 ? 'hot' : ''}">L10 <b>${x.l10[0]}/${x.l10[1]}</b></span>
      <span class="pchip">${x.streak > 0 ? '🔥' : '🧊'} <b>${Math.abs(x.streak)}</b> ${x.streak > 0 ? 'straight' : 'missed'}</span><span class="pchip">avg <b>${x.avg10}</b></span><span class="pchip">fair <b>${esc(odds(x.fair))}</b></span></div>
    <div class="proom"><span class="proom-l">At the table</span>${room}</div>
    <button type="button" class="pslip-btn" data-act="pslip" data-id="${esc(x.id)}">${inSlip ? '✓ On your slip' : '＋ Add to slip'}</button></article>`; }
function propSheet(L) { const th = (k, t) => `<button type="button" class="${S.pf.sort === k ? 'on' : ''}" data-act="psort" data-v="${k}">${t}</button>`;
  return `<div class="psheet"><div class="ps-h"><span>Prop</span>${th('score', 'Desk')}${th('l10', 'L10')}${th('streak', 'Run')}${th('votes', 'Room')}</div>${L.map(x => `<div class="ps-r${S.slip.includes(x.id) ? ' on' : ''}" data-act="pslip" data-id="${esc(x.id)}">
    <span><b>${esc(x.player)}</b><small>${esc(pLine(x))} · ${esc(x.opp ? (x.home ? 'vs ' : '@') + x.opp : LEAGUE[x.sp])}</small></span><span class="ps-s">${x.score}</span><span>${x.l10[0]}/${x.l10[1]}</span><span>${x.streak > 0 ? '🔥' + x.streak : '🧊' + -x.streak}</span><span>${x.votes}🪑</span></div>`).join('')}</div>`; }
function slipBar() { const all = propsAll(); const L = S.slip.map(id => all.find(x => x.id === id)).filter(Boolean); if (!L.length) return '';
  const p = L.reduce((a, x) => a * (x.p || 0.5), 1); const am = p >= 0.5 ? -Math.round(100 * p / (1 - p)) : Math.round(100 * (1 - p) / p);
  return `<div class="pslipbar"><div><b>Your slip · ${L.length} leg${L.length > 1 ? 's' : ''}</b><small>The room gives it ${(p * 100).toFixed(p < 0.1 ? 1 : 0)}% · fair ${esc(odds(am))}</small></div>
    <button type="button" class="btn sm" data-act="psliptrack">Track it</button><button type="button" class="btn ghost sm" data-act="pslipcopy">📋</button><button type="button" class="btn ghost sm" data-act="pslipclear">Clear</button></div>`; }
function slipText() { const all = propsAll(); return 'TheDesk · my prop slip\n' + S.slip.map(id => all.find(x => x.id === id)).filter(Boolean).map(x => `• ${pWho(x)} ${pLine(x)}`).join('\n') + '\n' + (CFG.home || 'https://ironsilkweekly.com/desk/'); }
function viewProps() {
  const el = $('#v-props'), F = S.feed, all = propsAll(), f = S.pf;
  if (!F) { el.innerHTML = '<div class="shimmer"></div>'; return; }
  const L = propsShown(), W = whispers(all);
  const chip = (k, v, t, n) => `<button type="button" class="lens${f[k] === v ? ' on' : ''}" data-act="pf" data-k="${k}" data-v="${esc(String(v))}">${t}${n != null ? ` <small>${n}</small>` : ''}</button>`;
  const sps = [...new Set(all.map(x => x.sp))], stats = [...new Set(all.filter(x => f.sp === 'all' || x.sp === f.sp).map(x => x.lab))];
  el.innerHTML = `<h1 class="title">Props</h1><p class="lede">Every prop the characters like today: his last 10 against the line, the run he's on, who's at the table, and one Desk Score to read it all.</p>
    ${W.length ? `<div class="whisper" aria-label="Whispers"><div class="wh-track">${[...W, ...W].map(t => `<span>${esc(t)}</span>`).join('')}</div></div>` : ''}
    ${all.length ? `<div class="lenses" role="toolbar" aria-label="Lenses">${Object.entries(PL).map(([k, t]) => chip('lens', k, t, all.filter(x => lensOk(x, k)).length)).join('')}</div>
    <div class="lenses sub">${chip('sp', 'all', 'All sports')}${sps.map(s => chip('sp', s, LEAGUE[s] || s)).join('')}<span class="lsep"></span>${chip('stat', 'all', 'Every stat')}${stats.map(t => chip('stat', t, t)).join('')}</div>
    <div class="ptools"><label class="pmin">Desk Score <b>${f.min || 0}+</b><input type="range" min="0" max="90" step="5" value="${f.min || 0}" data-act="pmin" aria-label="Minimum Desk Score"></label>
      <div class="pview">${['cards', 'sheet'].map(v => `<button type="button" class="${f.view === v ? 'on' : ''}" data-act="pf" data-k="view" data-v="${v}">${v === 'cards' ? 'Cards' : 'Sheet'}</button>`).join('')}</div></div>
    ${L.length ? (f.view === 'sheet' ? propSheet(L) : `<div class="pgrid">${L.map(propCard).join('')}</div>`) : `<div class="paper blank"><b>Nothing through this lens</b><p>Try another lens, or lower the Desk Score.</p></div>`}`
    : `<div class="paper blank"><b>Props post when the desk publishes today’s card</b><p>Check back closer to game time.</p></div>`}
    ${slipBar()}${footHtml()}`;
}
/* the LongShots tab: every founder ticket from the last week, live */
function viewLongshots() {
  const el = $('#v-longshots'), F = S.feed;
  const body = F ? founderHtml(true) : '';
  el.innerHTML = `<h1 class="title">Founder LongShot Parlays</h1><p class="lede">Real tickets the founder placed: big odds, posted as he plays them, graded live leg by leg. Tap “Tail this” to copy one, then paste it into your book.</p>
    ${body || (F || S.feedErr ? `<div class="paper blank"><b>No LongShots up right now</b><p>The founder’s next ticket lands here the moment it’s in.</p></div>` : '<div class="shimmer"></div>')}${footHtml()}`;
}
function tailText(t) { return [`TheDesk · ${t.name || 'Founder LongShot Parlay'} (${t.legs.length} legs${t.dec ? ', ' + decAm(t.dec) : ''})`, ...t.legs.map((l, i) => `${i + 1}. ${legText(l)}${l.price != null ? ' (' + odds(l.price) + ')' : ''}${l.game ? ' · ' + matchup(l) : ''}`), CFG.home || 'https://ironsilkweekly.com/desk/'].join('\n'); }
async function copyText(txt, ok) { try { await navigator.clipboard.writeText(txt); toast(ok); return; } catch (e) { }
  try { const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(ok); } catch (e) { toast('Couldn’t copy on this device'); } }
async function tailCopy(id) { const t = ((S.feed && S.feed.founder && S.feed.founder.tix) || []).find(x => x.id === id); if (!t) return; const txt = tailText(t);
  try { await navigator.clipboard.writeText(txt); toast('Copied — paste it into your book'); return; } catch (e) { }
  try { const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Copied — paste it into your book'); } catch (e) { toast('Couldn’t copy on this device'); } }
/* the strongest of the board on the front page: unanimous, supreme and strong, games not over yet */
function strongHtml() {
  const B = boardOf(); if (!B) return '';
  const today = deskDay(), P = [];
  for (const b of B.games) { if (b.day !== today || overOf(b.sp, b.game, ms(b.start), b.st)) continue;
    for (const p of b.picks || []) if (p.unan || p.tier === 'supreme' || p.tier === 'strong') P.push({ b, p }); }
  if (!P.length) return '';
  P.sort((x, y) => (y.p.unan - x.p.unan) || ((TIER_RANK[y.p.tier] || 0) - (TIER_RANK[x.p.tier] || 0)) || ((y.p.p || 0) - (x.p.p || 0)));
  const n = f => P.filter(f).length, shown = P.slice(0, 12);
  const row = ({ b, p }) => `<div class="leg"><div class="li"><span class="mk">${p.unan ? '★' : p.tier === 'supreme' ? '◆' : '•'}</span><span class="pk">${esc(bigOf(b.sp, b.game, p.pick))}${p.price != null ? ' ' + esc(odds(p.price)) : ''}
      <small>${esc([LEAGUE[b.sp], matchup(b), whenLabel(b.start)].filter(Boolean).join(' · '))}</small><span class="tbs">${tierTag(p)}</span>${(p.by || []).length ? `<small>by ${p.by.map(v => esc(castOf(v).name)).join(', ')}</small>` : ''}</span><span class="u">${p.p != null ? pct(p.p) + '%' : ''}</span></div></div>`;
  return `<section class="vsec"><div class="vh"><h2 class="h2">Unanimous, Supreme &amp; Strong</h2>${vipBadge()}</div>
    <p class="note">${[n(x => x.p.unan) ? `<b>${n(x => x.p.unan)} unanimous</b> (every character on the same side)` : '', n(x => x.p.tier === 'supreme') ? `<b>${n(x => x.p.tier === 'supreme')} supreme</b> (every read lines up)` : '', n(x => x.p.tier === 'strong') ? `<b>${n(x => x.p.tier === 'strong')} strong</b> (two reads line up)` : ''].filter(Boolean).join(', ')} on games that haven’t finished.</p>
    <div class="paper tix">${shown.map(row).join('')}</div>
    <div class="row" style="margin-top:12px"><button type="button" class="btn line" data-act="gobf" data-tier="top">${P.length > shown.length ? `All ${P.length} by start time` : 'See them by start time'}</button><button type="button" class="btn line" data-act="gobf" data-tier="all">Every game, every pick</button></div></section>`;
}
/* proof the card wasn't touched after lock: the fingerprint goes out at lock time, the key once every game has started */
async function seal(T) {
  const el = $('#seal'), C = T && T.commit; if (!el || !C || !C.hash) return;
  const short = C.hash.slice(0, 12) + '…' + C.hash.slice(-6);
  const ico = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="24" cy="24" r="21" stroke-dasharray="3 3.4"/><circle cx="24" cy="24" r="15"/><path d="m17.5 24.5 4.5 4.5 9-10" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (!C.salt) { el.innerHTML = `<div class="seal">${ico}<div>Fingerprint of today’s sealed picks: <code>${esc(short)}</code>. It was published at lock time. Once every game has started the key is posted here, and anyone can check the picks were never changed.</div></div>`; return; }
  try {
    const txt = JSON.stringify(T.picks.map(x => [x.sp, x.game, x.pick, x.price])) + '|' + C.salt;
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    const h = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    el.innerHTML = `<div class="seal">${ico}<div>${h === C.hash ? `<span class="ok">Verified.</span> These are exactly the picks sealed at ${esc(clock(T.lockedAt))}.` : '<span class="bad">The fingerprint does not match.</span>'} Fingerprint <code>${esc(short)}</code>, key <code>${esc(C.salt)}</code>.</div></div>`;
  } catch { el.innerHTML = ''; }
}
function footHtml() {
  return `<footer class="foot"><p>For entertainment. 21 and over. Bet only what you can afford to lose. If betting stops being fun, call 1-800-GAMBLER.</p>
    <p>TheDesk is published by IronSilk Strategies. <a href="privacy.html">Privacy</a></p>
    <p><button type="button" class="btn line restart" data-act="restart">↻ Restart the app</button> <span class="small-note">Not seeing the latest? This loads the newest version.</span></p></footer>`;
}

/* ── Receipts ────────────────────────────────────────────────────────────── */
function viewReceipts() {
  const el = $('#v-receipts'), F = S.feed;
  if (!F) { el.innerHTML = `<h1 class="title">Every result</h1>${S.feedErr ? '<p class="lede">The record didn’t load. Check your connection.</p><div class="row" style="margin-top:18px"><button class="btn foil" data-act="retry">Try again</button></div>' : '<div class="shimmer"></div>'}`; return; }
  const R = F.record || {}, n = (R.w || 0) + (R.l || 0), H = (F.history || []).filter(h => h && (h.picks || []).length);
  /* units over time: the window we have, ending on the all-time number */
  const days = [...H].reverse().map(h => ({ d: h.d, t: tally(h.picks) }));
  const windowU = days.reduce((a, x) => a + x.t.u, 0); let run = (+R.u || 0) - windowU; const pts = [run];
  for (const x of days) { run += x.t.u; pts.push(run); }
  let chart = '';
  if (pts.length > 2) {
    const W = 320, Hh = 120, lo = Math.min(...pts, 0), hi = Math.max(...pts, 0), span = hi - lo || 1, X = i => (i / (pts.length - 1)) * W, Y = v => 8 + (1 - (v - lo) / span) * (Hh - 16);
    const path = pts.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' '), end = pts[pts.length - 1];
    chart = `<figure class="chart"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Units won over the last ${days.length} cards, now ${signed(end, 1)}">
      <line x1="0" x2="${W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="rgba(21,19,15,.45)" stroke-width="1" stroke-dasharray="3 4"/>
      <path d="${path} L${W} ${Y(0).toFixed(1)} L0 ${Y(0).toFixed(1)} Z" fill="rgba(21,19,15,.07)"/><path d="${path}" fill="none" stroke="#15130F" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${W}" cy="${Y(end).toFixed(1)}" r="4.5" fill="${end >= 0 ? '#16734A' : '#C23A2B'}"/></svg>
      <figcaption>Units, card by card, over the last ${days.length} cards. The dashed line is break-even.</figcaption></figure>`;
  }
  const by = {}; for (const h of H) for (const x of h.picks) { const b = by[x.sp] || (by[x.sp] = []); b.push(x); }
  const lgs = ORDER.filter(sp => by[sp]).map(sp => { const t = tally(by[sp]); return `<b>${esc(LEAGUE[sp])}</b><span>${t.w}–${t.l}${t.p ? '–' + t.p : ''}</span><span class="${t.u >= 0 ? 'pos' : 'neg'}">${signed(t.u, 1)}u</span>`; }).join('');
  const mark = x => (x.push ? ['p', '='] : x.hit === true ? ['w', '✓'] : x.hit === false ? ['l', '✗'] : ['', '•']);
  const rows = H.map(h => { const t = tally(h.picks); return `<div class="day"><div class="day-h"><span>${esc(shortDay(h.d))}</span><span>${t.w}–${t.l}${t.p ? '–' + t.p : ''}</span><span class="${t.u >= 0 ? 'pos' : 'neg'}">${signed(t.u)}u</span></div>
      ${h.picks.map(x => { const [c, m] = mark(x); return `<div class="li"><span class="mk ${c}">${m}</span><span class="pk">${esc(readPick(x).big)} ${esc(odds(x.price))}<small>${esc(LEAGUE[x.sp] || '')}</small></span><span class="u">${x.hit === true ? signed(unitsWon(x.price)) : x.hit === false ? '−1.00' : x.push ? '0.00' : ''}</span></div>`; }).join('')}</div>`; }).join('');
  const cashed = (F.cashed || []).slice(0, 8);
  const cashHtml = cashed.length ? `<h2 class="h2">Cashed parlays</h2><p class="note">Every winning parlay from the last two weeks.</p>${cashed.map(c => `<div class="memo"><time>${esc(shortDay(c.d))}, ${c.legs.length} legs</time><b>${esc((c.who || []).join(' + '))}</b> cashed at ${esc(c.price)} for ${signed(+c.units)}u</div>`).join('')}` : '';
  el.innerHTML = `<h1 class="title">Every result on the record</h1>
    <p class="lede">Each card is sealed before the games and graded at the final. Wins and losses both stay up. One unit is risked on every pick.</p>
    <div class="two"><div class="tape"><div class="tape-h"><b>TheDesk</b><span>Best 3 ledger${R.first ? ', since ' + esc(shortDay(R.first)) : ''}</span></div>
      <dl class="sum"><dt>Record</dt><dd class="big">${R.w || 0}–${R.l || 0}${R.pu ? '–' + R.pu : ''}</dd>
        <dt>Hit rate</dt><dd>${n ? Math.round((R.w / n) * 100) + '%' : '—'}</dd>
        <dt>Units</dt><dd class="${(+R.u || 0) >= 0 ? 'pos' : 'neg'}">${signed(+R.u || 0)}u</dd></dl>
      ${chart}${rows || '<div class="blank"><b>No graded cards yet</b><p>The ledger starts with the first final.</p></div>'}
      <div class="tape-f">Showing the last ${H.length} cards. The record above counts every card since the first.</div></div>
    <div>${lgs ? `<h2 class="h2">By league</h2><p class="note">Over the last ${H.length} cards.</p><div class="lgs">${lgs}</div>` : ''}${cashHtml}</div></div>${footHtml()}`;
}

/* ── Slate ───────────────────────────────────────────────────────────────── */
const pips = s => `<span class="pips" role="img" aria-label="last five: ${esc(String(s).split('').join(' '))}">${String(s || '').split('').map(c => `<i${c === 'W' ? ' class="w"' : ''}></i>`).join('')}</span>`;
function openPickOn(g) {
  const T = S.feed && S.feed.today; if (!T || T.d !== deskDay()) return null;
  return (T.picks || []).find(x => !x.hidden && x.sp === g.sp && x.game && ab(x.sp, x.game.split('@')[0]) === ab(g.sp, g.a.ab) && ab(x.sp, x.game.split('@')[1]) === ab(g.sp, g.h.ab)) || null;
}
/* ── the board: the desk's colored picks on every game, by start time, and every character's say ── */
const TIER = { supreme: ['◆ Supreme', 'supreme'], strong: ['Strong', 'strong'], value: ['Value', 'value'], source: ['Outside', 'source'] };
const TIER_RANK = { supreme: 4, strong: 3, value: 2, source: 1 };
const WINS = [['up', 'Not over yet'], ['all', 'Any time'], ['early', 'Before 1 PM'], ['afternoon', '1–5 PM'], ['evening', '5–8 PM'], ['late', '8 PM +']];
const BTS = [['all', 'All bets'], ['ml', 'Moneyline'], ['spread', 'Spreads'], ['total', 'O/U']];
const TIERS = [['all', 'Every pick'], ['top', 'Unanimous, Supreme & Strong'], ['play', '✓ Official'], ['unan', '★ Unanimous'], ['supreme', '◆ Supreme'], ['strong', 'Strong'], ['value', 'Value'], ['source', 'Outside']];
const RUNS = { nfl: 3.6, ncaaf: 3.9, nba: 2.6, ncaab: 2.3, nhl: 2.8, mlb: 3.3 };
const MK_LAB = { ml: 'Moneyline', spread: 'Spread', total: 'Total' };
const hourCT = t => { try { return +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: CFG.deskTz }).format(new Date(ms(t))) % 24; } catch { return 12; } };
const winOf = t => { const h = hourCT(t); return h < 13 ? 'early' : h < 17 ? 'afternoon' : h < 20 ? 'evening' : 'late'; };
/* no heavy moneylines (−1000 or shorter) on the public site, even if an older feed still carries one */
const HEAVY = -1000, isHeavy = (m, price) => m === 'ml' && price != null && isFinite(+price) && +price <= HEAVY;
let BOARD_SRC = null, BOARD_CLEAN = null;
const boardOf = () => { const B = S.feed && S.feed.beta !== false && S.feed.board && Array.isArray(S.feed.board.games) ? S.feed.board : null; if (!B) return null; if (B === BOARD_SRC) return BOARD_CLEAN;
  const games = B.games.map(g => { const calls = {}; for (const [m, L] of Object.entries(g.calls || {})) { const k = (L || []).filter(c => !isHeavy(m, c.price)); if (k.length) calls[m] = k; }
    return { ...g, picks: (g.picks || []).filter(p => !isHeavy(p.m, p.price)), calls }; }).filter(g => g.picks.length || Object.keys(g.calls).length);
  BOARD_SRC = B; BOARD_CLEAN = { ...B, games }; return BOARD_CLEAN; };
const castOf = v => { const B = boardOf(), c = (B && B.cast && B.cast[v]) || {}; return { name: c.name || v, color: okColor(c.color) }; };
const bKey = (sp, a, h) => `${sp}|${ab(sp, a)}|${ab(sp, h)}`;
function boardIndex() { const B = boardOf(), M = new Map(); if (B) for (const b of B.games) { const [a, h] = String(b.game).split('@'); M.set(bKey(b.sp, a, h) + '|' + b.day, b); } return M; }
function overOf(sp, game, t, st) { const L = liveOf({ sp, game }); if (L && L.state) return L.state === 'post'; if (st === 'post') return true; return fin(t) && Date.now() - t > (RUNS[sp] || 3) * 36e5; }
function btOk(bt, p) { if (bt === 'all' || !BTS.some(([k]) => k === bt)) return true; return p.m === bt; }
function pickOk(p, F, heavy) { if (!btOk(F.bt, p, heavy)) return false; if (F.tier === 'all') return true; if (F.tier === 'play') return !!p.off; if (F.tier === 'top') return !!p.unan || p.tier === 'supreme' || p.tier === 'strong'; if (F.tier === 'unan') return !!p.unan; return p.tier === F.tier; }
const tierTag = p => `${p.unan ? '<span class="tb unan">★ Unanimous</span>' : ''}${TIER[p.tier] ? `<span class="tb ${TIER[p.tier][1]}">${TIER[p.tier][0]}</span>` : ''}${p.off ? '<span class="tb off">✓ Official</span>' : ''}`;
const bigOf = (sp, game, pick) => readPick({ sp, game, pick }).big;
function sayBadge(r) {
  if (!r) return '<span class="say none">Not ranked yet</span>';
  const rec = r.w != null ? ` <small>${r.w}–${r.l}, ${r.u >= 0 ? '+' : '−'}${Math.abs(r.u).toFixed(1)}u</small>` : '';
  if (r.say === 'top') return `<span class="say top">👑 #1 in ${esc(r.lab)}: has the say${rec}</span>`;
  if (r.say === 'worst') return `<span class="say low">🧊 Worst in ${esc(r.lab)}: no say${rec}</span>`;
  return r.rk ? `<span class="say">#${r.rk} of ${r.of} in ${esc(r.lab)}${rec}</span>` : `<span class="say none">Not ranked in ${esc(r.lab)} yet</span>`;
}
/* one bet on one game: each side, who's on it, how sure, and where they rank in that kind of bet */
function whoOnHtml(b) {
  const out = [];
  for (const m of ['ml', 'spread', 'total']) {
    const C = (b.calls || {})[m]; if (!C || !C.length) continue;
    const by = {}; for (const c of C) (by[c.s] = by[c.s] || []).push(c);
    const sides = Object.keys(by).sort((x, y) => by[y].length - by[x].length), tot = C.length;
    const top = C.find(c => c.r && c.r.say === 'top'), low = C.find(c => c.r && c.r.say === 'worst');
    const say = [top ? `👑 <b>${esc(castOf(top.v).name)}</b> has the say, on ${esc(bigOf(b.sp, b.game, top.pick))}` : '', low ? `🧊 <b>${esc(castOf(low.v).name)}</b> shouldn’t, on ${esc(bigOf(b.sp, b.game, low.pick))}` : ''].filter(Boolean).join(' · ');
    const row = c => { const k = castOf(c.v), mk = c.hit === true ? '<b class="hitw">✓</b> ' : c.hit === false ? '<b class="hitl">✗</b> ' : '';
      return `<li style="--c:${k.color}"><span class="who">${mk}${esc(k.name)}${c.o ? ' <em>official</em>' : ''}</span><span class="cp">${c.p != null ? pct(c.p) + '%' : ''}</span>${sayBadge(c.r)}</li>`; };
    out.push(`<div class="won"><div class="won-h"><b>${MK_LAB[m]}</b><span>${sides.length === 1 ? `All ${tot} agree` : `${by[sides[0]].length}–${tot - by[sides[0]].length} split`}</span></div>
      ${say ? `<p class="won-say">${say}</p>` : ''}
      ${sides.map((sd, i) => { const L = by[sd].sort((x, y) => (y.o - x.o) || ((y.p || 0) - (x.p || 0))); const pr = L.find(c => c.price != null);
        return `<div class="won-side${i ? ' vs' : ''}"><div class="won-pk">${esc(bigOf(b.sp, b.game, L[0].pick))}${pr ? ' ' + esc(odds(pr.price)) : ''} <small>${L.length} ${i ? 'against' : sides.length === 1 ? 'on it' : 'with'}</small></div><ul>${L.map(row).join('')}</ul></div>`; }).join('')}</div>`);
  }
  return out.join('');
}
function boardPicksHtml(b, F, heavy, all) {
  const P = (b.picks || []).filter(p => all || pickOk(p, F, heavy)); if (!P.length) return '';
  return `<div class="bpicks">${P.map(p => `<div class="bp">${tierTag(p)}<span class="bp-pk">${esc(bigOf(b.sp, b.game, p.pick))}${p.price != null ? ' ' + esc(odds(p.price)) : ''}</span>${p.p != null ? `<span class="bp-p">${pct(p.p)}%</span>` : ''}<button type="button" class="bp-tk" data-act="trackpick" data-sp="${esc(b.sp)}" data-game="${esc(b.game)}" data-pick="${esc(p.pick)}" data-price="${p.price != null ? esc(String(p.price)) : ''}" data-start="${esc(b.start || '')}" aria-label="Track ${esc(p.pick)}" title="Track it">＋</button>${all && (p.by || []).length ? `<small class="bp-by">by ${p.by.map(v => esc(castOf(v).name)).join(', ')}</small>` : ''}</div>`).join('')}</div>`;
}
function chCallsHtml(b, v) {
  const L = []; for (const m of ['ml', 'spread', 'total']) for (const c of ((b.calls || {})[m] || [])) if (c.v === v) L.push(c);
  if (!L.length) return ''; const k = castOf(v);
  return `<div class="bpicks">${L.map(c => `<div class="bp"><span class="tb ch" style="--c:${k.color}">${esc(k.name)}</span><span class="bp-pk">${esc(bigOf(b.sp, b.game, c.pick))}${c.price != null ? ' ' + esc(odds(c.price)) : ''}</span>${c.p != null ? `<span class="bp-p">${pct(c.p)}%</span>` : ''}${c.o ? '<span class="tb off">✓ Official</span>' : ''}</div>`).join('')}</div>`;
}
function filterBarHtml(B, games, F) {
  if (!BTS.some(([k]) => k === F.bt)) F.bt = 'all';
  const heavy = B.heavy || -500, cnt = f => games.filter(f).length;
  const passT = (g, t) => (g.b ? g.b.picks : []).some(p => pickOk(p, { ...F, tier: t }, heavy));
  const chip = (k, v, lab, n, cls = '') => `<button type="button" class="${cls}" data-act="bf" data-k="${k}" data-v="${esc(v)}" aria-pressed="${F[k] === v}">${lab}${n != null ? ` <span class="n">${n}</span>` : ''}</button>`;
  const okW = (g, w) => w === 'all' || (w === 'up' ? !g.over : winOf(g.t) === w);
  const inW = games.filter(g => okW(g, F.win));
  const cast = Object.entries(B.cast || {}).sort((a, b) => String(a[1].name).localeCompare(b[1].name));
  return `<div class="bf">
    <div class="seg tight" role="group" aria-label="View">${chip('view', 'time', '🕒 By time')}${chip('view', 'league', 'By league')}</div>
    <div class="seg tight" role="group" aria-label="Start time">${WINS.map(([w, l]) => chip('win', w, l, cnt(g => okW(g, w)))).join('')}</div>
    <div class="seg tight" role="group" aria-label="Pick strength">${TIERS.map(([t, l]) => chip('tier', t, l, t === 'all' ? inW.length : inW.filter(g => passT(g, t)).length, 't-' + t)).join('')}</div>
    <div class="seg tight" role="group" aria-label="Bet type">${BTS.map(([k, l]) => chip('bt', k, l, k === 'all' ? null : inW.filter(g => (g.b ? g.b.picks : []).some(p => btOk(k, p, heavy) && pickOk(p, { ...F, bt: 'all' }, heavy))).length)).join('')}</div>
    ${cast.length ? `<label class="bf-ch"><span>Character</span><select data-change="bfch"><option value="all">Every character</option>${cast.map(([v, c]) => `<option value="${esc(v)}"${F.ch === v ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : ''}
    ${F.win !== 'up' || F.tier !== 'all' || F.bt !== 'all' || F.ch !== 'all' ? '<button type="button" class="bf-reset" data-act="bfreset">Show everything</button>' : ''}</div>`;
}
/* the VIP lists, character pages and parlays: no heavy moneyline goes on screen (graded records stay as they are) */
function noHeavy(F) {
  if (!F || F.beta === false) return F;
  const hv = x => x && !x.hidden && x.price != null && isFinite(+x.price) && +x.price <= HEAVY && (x.m === 'ml' || /\bML$/i.test(String(x.pick || '').trim()));
  const live = x => x && x.hit == null;
  try {
    const V = F.vip ? { ...F.vip } : null;
    if (V) { if (Array.isArray(V.top10)) V.top10 = V.top10.filter(x => !(live(x) && hv(x)));
      if (V.banker && (V.banker.legs || []).some(x => live(x) && hv(x))) V.banker = null;
      if (Array.isArray(V.parlays)) V.parlays = V.parlays.filter(P => !(P.legs || []).some(x => live(x) && hv(x))); }
    const C = Array.isArray(F.characters) ? F.characters.map(c => ({ ...c, picks: (c.picks || []).filter(x => !(x.kind !== 'prop' && live(x) && hv(x))) })) : F.characters;
    return { ...F, vip: V || F.vip, characters: C };
  } catch { return F; }
}
function gameHtml(g) {
  const L = liveOf({ sp: g.sp, game: `${g.a.ab}@${g.h.ab}` }), open = S.openGame === g.k, on = openPickOn(g), b = g.b, F = S.bf, heavy = (boardOf() || {}).heavy || -500;
  const t = L && L.state === 'in' ? `<div class="g-t live">Live<br>${esc(L.detail || '')}</div>` : L && L.state === 'post' ? '<div class="g-t">Final</div>' : `<div class="g-t">${esc(clock(g.t)).replace(' ', '<br>')}</div>`;
  const side = (x, sc) => `<div class="tm"><span class="rk">${x.rk ? x.rk : ''}</span><span class="nm">${esc(x.nick || x.ab)}</span><span class="rc">${x.w + x.l ? `${x.w}-${x.l}` : ''}</span>${sc != null ? `<span class="sc">${sc}</span>` : ''}</div>`;
  const live = L && L.state !== 'pre';
  const ln = g.ln ? `<div class="g-ln">${g.ln.line != null && g.ln.fav ? `${esc(g.ln.fav)} −${g.ln.line}` : g.ln.line === 0 ? 'Pick’em' : fin(g.ln.mlH) && fin(g.ln.mlA) ? `${esc(g.ln.mlH < g.ln.mlA ? g.h.ab : g.a.ab)} ${esc(odds(Math.min(g.ln.mlH, g.ln.mlA)))}` : ''}${g.ln.tot != null ? `<small>O/U ${g.ln.tot}</small>` : ''}</div>` : '<div class="g-ln"></div>';
  let more = '';
  if (open) {
    const nm = x => esc(x.nick || x.ab), rows = [];
    if (g.a.l5 || g.h.l5) rows.push(['Last five', [g.a, g.h].filter(x => x.l5).map(x => `<span class="l5">${nm(x)} ${pips(x.l5)}</span>`).join('')]);
    const stk = [g.a, g.h].filter(x => x.st).map(x => `${nm(x)} ${x.st[0] === 'W' ? 'won' : 'lost'} ${esc(x.st.slice(1))} straight`); if (stk.length) rows.push(['Streaks', stk.join(', ')]);
    if (fin(g.a.pf) && fin(g.h.pf)) rows.push(['Scoring', `${nm(g.a)} ${g.a.pf} for, ${g.a.pa} against. ${nm(g.h)} ${g.h.pf} for, ${g.h.pa} against.`]);
    if (g.ln && fin(g.ln.mlA) && fin(g.ln.mlH)) rows.push(['Moneyline', `${nm(g.a)} ${esc(odds(g.ln.mlA))}, ${nm(g.h)} ${esc(odds(g.ln.mlH))}`]);
    if (g.mkt) rows.push([g.mkt.src === 'markets' ? 'Prediction markets' : 'Public model', `${g.mkt.pct}% ${esc(g.mkt.ab === g.h.ab ? g.h.nick || g.h.ab : g.a.nick || g.a.ab)}`]);
    if (g.read) rows.push(['Projected score', `${nm(g.a)} ${g.read.a}, ${nm(g.h)} ${g.read.h}`]);
    if ((g.mv || []).length) rows.push(['Line moves', esc(g.mv.join('; ').replace(/-/g, '−'))]);
    if (g.venue) rows.push(['Where', esc(g.venue)]);
    if (g.note) rows.push(['In the news', esc(g.note)]);
    const bp = b ? boardPicksHtml(b, F, heavy, true) : '', wo = b ? whoOnHtml(b) : '';
    more = `<div class="g-more">${ddBtns(g)}${bp ? `<div class="g-sec"><h4>The desk’s colored picks</h4>${bp}</div>` : ''}${wo ? `<div class="g-sec"><h4>Who’s with it, who’s against it</h4><p class="g-note">Every character’s call and how sure it is. 👑 marks the character ranked #1 in that kind of bet (it has the say); 🧊 marks the worst (it shouldn’t have one).</p>${wo}</div>` : ''}${rows.length ? `<dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>` : ''}
      ${g.q && g.q.title ? `<div class="ask"><b>${esc(g.q.title)}</b><span>${esc((g.q.opts || []).join(' or '))}? Make your case in the members’ chat.</span><button type="button" class="btn foil" data-go="chat">Open the chat</button></div>` : ''}</div>`;
  }
  return `<div class="game"><button type="button" data-act="game" data-k="${esc(g.k)}" aria-expanded="${open}">${t}
    <div class="g-teams">${side(g.a, live ? L.a : null)}${side(g.h, live ? L.h : null)}${on ? `<span><span class="star">On today’s card: ${esc(readPick(on).big)} ${esc(odds(on.price))}</span></span>` : ''}</div>${ln}</button>${b && !open ? `<div class="g-bp" data-act="game" data-k="${esc(g.k)}">${F.ch !== 'all' ? chCallsHtml(b, F.ch) : boardPicksHtml(b, F.tier === 'all' && F.bt === 'all' ? { ...F, tier: 'top' } : F, heavy, false)}</div>` : ''}${more}</div>`;
}
function viewSlate() {
  const el = $('#v-slate'), SL = S.slate;
  if (!SL) { el.innerHTML = `<h1 class="title">The sheet</h1>${S.slateErr ? '<div class="paper blank"><b>The sheet isn’t in yet</b><p>Lines and rankings refresh every hour. Check back in a bit.</p></div>' : '<div class="shimmer"></div>'}${footHtml()}`; return; }
  const today = deskDay(), days = SL.days.filter(d => d.d >= today); const list = days.length ? days : SL.days;
  if (S.slateDay >= list.length) S.slateDay = 0;
  const D = list[S.slateDay], label = d => (d === today ? 'Today' : d === deskDay(Date.now() + 864e5) ? 'Tomorrow' : shortDay(d));
  const sps = ORDER.filter(sp => D.games.some(g => g.sp === sp)); if (S.slateSp !== 'all' && !sps.includes(S.slateSp)) S.slateSp = 'all';
  /* the board rides on top of the sheet: each game gets the desk's picks and calls, and board games the sheet skipped join it */
  const B = boardOf(), BF = S.bf, heavy = (B && B.heavy) || -500; let all = D.games.map(g => ({ ...g }));
  if (B) {
    const M = boardIndex(), used = new Set();
    for (const g of all) { const k = bKey(g.sp, g.a.ab, g.h.ab) + '|' + D.d; const b = M.get(k); if (b) { g.b = b; used.add(k); } }
    for (const [k, b] of M) { if (used.has(k) || b.day !== D.d) continue; const [a, h] = String(b.game).split('@'), tm = x => ({ ab: x, nick: teamName(b.sp, x), w: 0, l: 0 });
      all.push({ sp: b.sp, k: 'b|' + k, t: ms(b.start), a: tm(a), h: tm(h), b }); }
    for (const g of all) g.over = overOf(g.sp, `${g.a.ab}@${g.h.ab}`, g.t, g.b && g.b.st);
    for (const sp of ORDER) if (!sps.includes(sp) && all.some(g => g.sp === sp)) sps.push(sp);
    sps.sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));
  }
  const bOn = !!(B && all.some(g => g.b));
  const inSp = all.filter(g => S.slateSp === 'all' || g.sp === S.slateSp);
  const okG = g => { if (!bOn) return true;
    if (!(BF.win === 'all' || (BF.win === 'up' ? !g.over : winOf(g.t) === BF.win))) return false;
    if (BF.ch !== 'all') return !!(g.b && Object.values(g.b.calls || {}).some(L => L.some(c => c.v === BF.ch)));
    if (BF.tier !== 'all' || BF.bt !== 'all') return !!(g.b && g.b.picks.some(p => pickOk(p, BF, heavy)));
    return true; };
  const games = inSp.filter(okG).sort((x, y) => x.t - y.t || ORDER.indexOf(x.sp) - ORDER.indexOf(y.sp));
  const slotHead = gs => { const P = gs.flatMap(g => g.b ? g.b.picks.filter(p => pickOk(p, BF, heavy)) : []), n = t => P.filter(p => p.tier === t).length, u = P.filter(p => p.unan).length;
    const st = gs.every(g => g.over) ? ' · final' : gs.some(g => { const L = liveOf({ sp: g.sp, game: `${g.a.ab}@${g.h.ab}` }); return L && L.state === 'in'; }) ? ' · live' : '';
    return `<div class="lg slot"><span>🕒 ${esc(clock(gs[0].t))}${st}</span><small>${gs.length} game${gs.length === 1 ? '' : 's'} · ${[...new Set(gs.map(g => LEAGUE[g.sp]))].join(' · ')}${u ? ` · <b class="c-unan">★ ${u} unanimous</b>` : ''}${n('supreme') ? ` · <b class="c-supreme">${n('supreme')} supreme</b>` : ''}${n('strong') ? ` · <b class="c-strong">${n('strong')} strong</b>` : ''}</small></div>`; };
  let body;
  if (bOn && BF.view === 'time') { const T = new Map(); for (const g of games) { const k = fin(g.t) ? g.t : 0; if (!T.has(k)) T.set(k, []); T.get(k).push(g); }
    body = [...T.values()].map(gs => slotHead(gs) + gs.map(gameHtml).join('')).join(''); }
  else body = sps.filter(sp => S.slateSp === 'all' || sp === S.slateSp).map(sp => { const gs = games.filter(g => g.sp === sp); return gs.length ? `<div class="lg">${esc(LEAGUE[sp])}, ${gs.length} game${gs.length === 1 ? '' : 's'}</div>${gs.map(gameHtml).join('')}` : ''; }).join('');
  if (bOn && !body) body = `<div class="blank"><b>No games match these filters</b><p><button type="button" class="btn line" data-act="bfreset">Show everything</button></p></div>`;
  const stale = Date.now() - SL.ts > 6 * 36e5;
  /* rankings */
  const rsps = ORDER.filter(sp => (SL.ranks[sp] || []).length); if (!rsps.includes(S.rankSp)) S.rankSp = rsps[0] || '';
  const RK = SL.ranks[S.rankSp] || [], shown = S.rankAll ? RK : RK.slice(0, 10);
  const ranks = rsps.length ? `<h2 class="h2">TheDesk Power Rankings</h2><p class="note">Margin of victory with the home edge taken out, adjusted for who each team has played. Updated every hour.</p>
    <div class="seg" role="group" aria-label="League">${rsps.map(sp => `<button type="button" data-act="ranksp" data-sp="${sp}" aria-pressed="${sp === S.rankSp}">${esc(LEAGUE[sp])}</button>`).join('')}</div>
    <div class="paper">${shown.map(x => `<div class="rank"><span class="n">${x.rk}</span><span class="t">${esc(x.name || x.ab)}<small>${x.w}-${x.l}${x.st ? `, ${x.st[0] === 'W' ? 'won' : 'lost'} ${esc(x.st.slice(1))} straight` : ''}</small></span><span>${pips(x.l5)}</span><span class="r">${x.rt > 0 ? '+' : x.rt < 0 ? '−' : ''}${Math.abs(x.rt).toFixed(1)}</span></div>`).join('')}
      ${RK.length > 10 ? `<button type="button" class="more-btn" data-act="rankall">${S.rankAll ? 'Show the top 10' : `Show all ${RK.length}`}</button>` : ''}</div>` : '';
  el.innerHTML = `<h1 class="title">${esc(label(D.d) === 'Today' ? weekday(D.d) + '’s sheet' : label(D.d) === 'Tomorrow' ? 'Tomorrow’s sheet' : shortDay(D.d))}</h1>
    <p class="lede">${bOn ? 'Every game by start time, with the desk’s colored picks. Tap a game to see which characters are with it, which are against it, and who has earned a say.' : 'Every game on the board with its line, the market’s odds and where each team sits in TheDesk Power Rankings. Tap a game for the details.'}</p>
    <div class="cols"><div><div class="seg" role="group" aria-label="Day and league">${list.map((d, i) => `<button type="button" data-act="slateday" data-i="${i}" aria-pressed="${i === S.slateDay}">${esc(label(d.d))}</button>`).join('')}
      ${sps.length > 1 ? `<button type="button" data-act="slatesp" data-sp="all" aria-pressed="${S.slateSp === 'all'}">All leagues</button>${sps.map(sp => `<button type="button" data-act="slatesp" data-sp="${sp}" aria-pressed="${sp === S.slateSp}">${esc(LEAGUE[sp])}</button>`).join('')}` : ''}</div>
    ${bOn ? filterBarHtml(B, inSp, BF) : ''}
    <div class="paper"><div class="sheet-h"><b>${esc(shortDay(D.d))}</b><span>Lines as of ${esc(clock(SL.ts))}${stale ? ', waiting on a refresh' : ''}</span></div>
      ${body || '<div class="blank"><b>Nothing on the board</b><p>No games with lines for this day yet.</p></div>'}
      <div class="sheet-f">The number beside a team is its Power Rank.${D.more ? ` ${D.more} more college games are on the full board; these are the ones worth a look.` : ''} Lines can move. This sheet never shows the desk’s sealed picks.</div></div></div>
    <div>${ranks}</div></div>${ddSlipBar()}${footHtml()}`;
}

/* ── the open beta: the whole card, and every character's say on each pick ──────── */
const vipBadge = () => (S.feed && S.feed.beta ? '<span class="vipbadge">VIP · free in beta</span>' : '<span class="vipbadge">VIP</span>');
function callsHtml(calls) {
  const L = (calls || []).filter(c => c && c.who); if (!L.length) return '';
  const w = L.filter(c => c.with), a = L.filter(c => !c.with);
  const row = c => `<li class="${c.with ? 'on' : 'off'}"><span class="who">${esc(c.who)}${c.official ? ' <em>official</em>' : ''}</span><span class="cp">${c.p != null ? pct(c.p) + '%' : ''}</span>
    <span class="nt">${c.with ? '' : `On ${esc(c.pick || 'the other side')}${c.note ? '. ' : ''}`}${esc(c.note || '')}</span></li>`;
  return `<details class="calls"><summary><span>Every character on it</span><small>${w.length} with · ${a.length} against</small></summary><ul>${[...w, ...a].map(row).join('')}</ul></details>`;
}
/* ── player props live on the phone too (Chris, Nov 15: "Do that!"): the page pulls ESPN's box score for every game with a prop on it,
   reads the player's line, grades the leg the moment it clears (or the game ends), and moves the chance with what's left of the game */
S.box = {};
const nrm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.'’]/g, '').replace(/\b(jr|sr|ii|iii|iv)\b/g, '').replace(/\s+/g, ' ').trim();
function parseProp(pick) {
  const s = String(pick || '').replace(/\s*\([^)]*\)\s*$/, '').trim(); let m;
  if ((m = s.match(/^(.+?)\s+(\d+(?:\.\d+)?)\+\s+(.+)$/))) { const t = Math.ceil(+m[2]); return { name: m[1], stat: m[3], t, show: +m[2], under: false }; }
  if ((m = s.match(/^(.+?)\s+(over|under|o|u)\s+(\d+(?:\.\d+)?)\s+(.+)$/i))) { const L = +m[3], under = /^u/i.test(m[2]); return { name: m[1], stat: m[4], t: Math.floor(L) + 1, u: Math.ceil(L) - 1 + (L % 1 ? 0 : 1), show: L, under }; }
  return null; }
/* the stat a prop names → the box-score key(s) it sums; null when the page can't read it (the desk's number stays) */
function statKeys(sp, stat) {
  let parts = String(stat).toLowerCase().split(/\s*\+\s*/).filter(Boolean); const unit = (parts[parts.length - 1].match(/\b(yds|yards|td|tds|touchdowns?)\b/) || [])[0];
  if (unit) parts = parts.map(c => /\b(yds|yards|td|tds|touchdowns?)\b/.test(c) ? c : c + ' ' + unit);
  const one = c => {
    if (/^nba|^ncaab/.test(sp)) return /three|3pm|3-pt|3pt/.test(c) ? 'threePointFieldGoalsMade' : /point|pts/.test(c) ? 'points' : /reb/.test(c) ? 'rebounds' : /ast|assist/.test(c) ? 'assists' : /stl|steal/.test(c) ? 'steals' : /blk|block/.test(c) ? 'blocks' : /turnover/.test(c) ? 'turnovers' : null;
    if (/^nfl|^ncaaf/.test(sp)) return /pass.*(td|touch)/.test(c) ? 'passingTouchdowns' : /rush.*(td|touch)/.test(c) ? 'rushingTouchdowns' : /(rec|receiv).*(td|touch)/.test(c) ? 'receivingTouchdowns' : /pass.*(yd|yard)/.test(c) ? 'passingYards' : /rush.*(yd|yard)/.test(c) ? 'rushingYards' : /(rec|receiv).*(yd|yard)/.test(c) ? 'receivingYards' : /rush.*att|carries/.test(c) ? 'rushingAttempts' : /complet/.test(c) ? 'completions' : /recept|^rec$|catches/.test(c) ? 'receptions' : /intercep/.test(c) ? 'interceptions' : null;
    if (sp === 'nhl') return /shot|sog/.test(c) ? 'shots' : /goal/.test(c) ? 'goals' : /assist/.test(c) ? 'assists' : /point/.test(c) ? 'pts' : /save/.test(c) ? 'saves' : /block/.test(c) ? 'blockedShots' : /hit/.test(c) ? 'hits' : null;
    if (sp === 'mlb') return /home run|\bhr/.test(c) ? 'homeRuns' : /rbi/.test(c) ? 'RBIs' : /strikeout|\bks?\b/.test(c) ? 'p_strikeouts' : /walk/.test(c) ? 'walks' : /\bruns?\b/.test(c) ? 'runs' : /\bhits?\b/.test(c) ? 'hits' : null;
    return null; };
  const ks = parts.map(one); return ks.every(Boolean) ? ks : null; }
/* ESPN summary → {players by name}; keys like "made-attempted" split, pitchers' stats kept apart (p_) */
function readBox(j) {
  const rows = [];
  for (const tm of ((j && j.boxscore && j.boxscore.players) || [])) for (const g of tm.statistics || []) {
    const keys = g.keys || [], pre = /pitch/i.test(g.name || g.type || '') ? 'p_' : '';
    for (const a of g.athletes || []) { const ath = a.athlete || {}, nm = nrm(ath.displayName || ath.fullName); if (!nm) continue;
      let r = rows.find(x => x.nm === nm); if (!r) rows.push(r = { nm, sh: nrm(ath.shortName), v: {} });
      const o = {}; keys.forEach((k, i) => { const val = (a.stats || [])[i]; if (val == null) return; const ks = String(k).split(/[-/]/), vs = String(val).split(/[-/]/);
        ks.forEach((kk, n) => { const x = parseFloat(vs[n]); if (isFinite(x)) o[pre + kk] = x; }); }); /* one group: set (MLB lists hits twice); across groups: add */
      for (const k in o) r.v[k] = (r.v[k] || 0) + o[k]; } }
  rows.forEach(r => { const v = r.v; if (v.shots == null) { const sh = v.shotsTotal != null ? v.shotsTotal : v.shotsOnGoal; if (sh != null) v.shots = sh; } if (v.goals != null || v.assists != null) v.pts = (v.goals || 0) + (v.assists || 0); });
  return rows; }
function findPlayer(rows, name) {
  const n = nrm(name), tk = n.split(' '), last = tk[tk.length - 1];
  let hit = rows.filter(r => r.nm === n || r.sh === n); if (hit.length === 1) return hit[0];
  if (tk.length >= 2 && tk[0].length <= 2) { hit = rows.filter(r => { const t = r.nm.split(' '); return t[t.length - 1] === last && t[0].startsWith(tk[0][0]); }); if (hit.length === 1) return hit[0]; }
  hit = rows.filter(r => r.nm.split(' ').slice(-1)[0] === last && r.nm.split(' ')[0] === tk[0]); return hit.length === 1 ? hit[0] : null; }
const pois = (k, mu) => { let t = Math.exp(-mu), s = 0; for (let i = 0; i <= k; i++) { s += t; t *= mu / (i + 1); } return Math.min(1, s); }; /* P(X ≤ k) */
function paceQ(sp, keys, v, P, p0, f) {
  const big = keys.some(k => /Yards$/.test(k)) || (/^nba|^ncaab/.test(sp) && (keys.length > 1 || keys[0] === 'points'));
  if (big) { const cv = keys.includes('passingYards') ? 0.3 : /^nba|^ncaab/.test(sp) ? 0.3 : 0.55;
    if (!P.under) { const mu = (P.t - 0.5) / Math.max(0.25, 1 + cv * probit(1 - p0)), Rm = mu * f, Rs = Math.max(0.5, cv * mu * Math.sqrt(f)); return 1 - ncdf((P.t - 0.5 - v - Rm) / Rs); }
    const mu = (P.u + 0.5) / Math.max(0.25, 1 + cv * probit(p0)), Rm = mu * f, Rs = Math.max(0.5, cv * mu * Math.sqrt(f)); return ncdf((P.u + 0.5 - v - Rm) / Rs); }
  /* counting stats (catches, TDs, shots, hits…): Poisson, the full-game rate backed out of the pre-game chance */
  const tail = mu => P.under ? pois(P.u, mu) : 1 - pois(P.t - 1, mu); let lo = 0.01, hi = 80;
  for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; ((tail(mid) < p0) !== P.under) ? lo = mid : hi = mid; }
  const mu = (lo + hi) / 2 * f; return P.under ? pois(P.u - v, mu) : 1 - pois(P.t - 1 - v, mu); }
/* where a prop stands right now on this phone: {v, show, under, q, st: hit | miss | live}; null → the desk's numbers */
function propNow(l) {
  const P = parseProp(l.pick); if (!P || !l.game) return null; const lv = liveOf(l); if (!lv || lv.state === 'pre' || !lv.id) return null;
  const B = S.box[`${l.sp}|${lv.id}`], keys = B && statKeys(l.sp, P.stat); if (!B || !keys) return null;
  if (!keys.every(k => B.rows.some(x => x.v[k] != null))) return null; /* a stat this box doesn't carry: never read it as a zero */
  const r = findPlayer(B.rows, P.name); if (!r) return null; const v = keys.reduce((a, k) => a + (r.v[k] || 0), 0), o = { v, show: P.show, under: P.under, plus: /\+/.test(String(l.pick)) };
  if (!P.under && v >= P.t) return { ...o, q: 1, st: 'hit' }; if (P.under && v > P.u) return { ...o, q: 0, st: 'miss' };
  if (lv.state === 'post' && B.final) return { ...o, q: P.under ? 1 : 0, st: P.under ? 'hit' : 'miss' };
  const p0 = l.p > 0 && l.p < 1 ? l.p : impP(l.price); if (p0 == null) return { ...o, q: l.q != null ? l.q : null, st: 'live' };
  return { ...o, q: Math.max(0.01, Math.min(0.99, paceQ(l.sp, keys, v, P, Math.min(0.97, Math.max(0.03, p0)), lv.state === 'post' ? 0.01 : keys.some(k => /^p_/.test(k)) ? Math.max(0.02, (fracLeft(lv, l.sp) * 9 - 3) / 6) : fracLeft(lv, l.sp)))), st: 'live' }; } /* a starter's line: about six innings, not nine */
async function boxes(legs) {
  const want = new Map(); for (const l of legs) { if (!parseProp(l.pick) || !l.game) continue; const lv = liveOf(l); if (!lv || !lv.id || lv.state === 'pre' || !ESPN[l.sp]) continue;
    const k = `${l.sp}|${lv.id}`, B = S.box[k], sig = [lv.a, lv.h, lv.period, lv.clock, lv.detail, lv.state].join('|');
    /* a new box only when the game moved (score, clock, inning) or a minute passed — finals once */
    if (B && (B.final || (B.sig === sig && Date.now() - B.at < 60e3))) continue; want.set(k, { sp: l.sp, id: lv.id, post: lv.state === 'post', sig }); }
  await Promise.all([...want].map(async ([k, w]) => { try {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 8000); const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${ESPN[w.sp]}/summary?event=${encodeURIComponent(w.id)}&_=${Math.floor(Date.now() / 15e3)}`, { cache: 'no-store', signal: ac.signal }).finally(() => clearTimeout(to)); if (!r.ok) return;
    S.box[k] = { at: Date.now(), final: w.post, sig: w.sig, rows: readBox(await r.json()) }; } catch { /* box scores are a nicety */ } })); }
/* a ticket leg as this phone sees it: graded the moment ESPN says so, props carrying their live stat */
function effLeg(l) {
  if (!l || !l.game || l.st === 'hit' || l.st === 'miss' || l.st === 'push') return l;
  const P = propNow(l); if (P) return { ...l, st: P.st === 'live' ? 'live' : P.st, prog: { v: P.v, t: P.show, d: P.under ? 'under' : 'atleast' }, ph: P };
  if (!parseProp(l.pick)) { const g = liveGrade({ sp: l.sp, game: l.game, pick: l.pick }); if (g.push) return { ...l, st: 'push' }; if (g.hit != null) return { ...l, st: g.hit ? 'hit' : 'miss' }; }
  return l; }
function effTicket(t) { const legs = (t.legs || []).map(effLeg), miss = legs.some(l => l.st === 'miss'), done = legs.every(l => l.st === 'hit' || l.st === 'push');
  return { ...t, legs, hit: legs.filter(l => l.st === 'hit').length, res: miss ? 'lost' : done && legs.length ? 'cashed' : legs.some(l => l.st !== 'open') ? 'live' : t.res }; }
/* ── live chances on the viewer's own phone (Chris, Nov 15: "I need that incorporated where it doesn't rely on my app to update it").
   The desk publishes each leg's pre-game chance; the page moves it with the live score: the margin (or the total so far) against what's
   left of the game, the usual win-probability way — so the % updates with every score refresh, app open or not. */
const LIVE_SD = { nfl: [13.5, 13.5], ncaaf: [16, 17], nba: [12, 18.5], ncaab: [10.8, 15.5], nhl: [2.3, 2.3], mlb: [4.3, 4.3] };
const GAME_Q = { nfl: [4, 15], ncaaf: [4, 15], nba: [4, 12], ncaab: [2, 20], nhl: [3, 20] };
const ncdf = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - q : q; };
function probit(p) { p = Math.min(0.999, Math.max(0.001, p)); const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924], b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857], c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878], d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742], pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
function fracLeft(lv, sp) { if (!lv || lv.state === 'pre') return 1; if (lv.state === 'post') return 0.001; const per = Math.max(1, lv.period || 1), Q = GAME_Q[sp];
  if (Q) { const [np, len] = Q; if (per > np) return 0.03; const left = lv.clock != null ? lv.clock / 60 : len / 2; return Math.max(0.01, Math.min(1, ((np - per) * len + left) / (np * len))); }
  if (sp === 'mlb') { const d = String(lv.detail || '').toLowerCase(); let half = (per - 1) * 2 + (/bot/.test(d) ? 1.5 : /mid/.test(d) ? 1 : /end/.test(d) ? 2 : 0.5); return Math.max(0.01, Math.min(1, (18 - Math.min(17.9, half)) / 18)); }
  return 0.5; }
const impP = pr => (pr == null || !isFinite(+pr) ? null : +pr < 0 ? -pr / (-pr + 100) : 100 / (+pr + 100));
/* a leg's chance right now: settled → 1/0, live → moved by the score, not started → the pre-game number; props keep the desk's */
function liveQ(l) {
  const p0 = l.p > 0 && l.p < 1 ? l.p : impP(l.price); if (p0 == null) return l.q != null ? l.q : null;
  const lv = l.game ? liveOf(l) : null; if (!lv || lv.state !== 'in' || lv.a == null || isNaN(lv.a)) return l.q != null ? l.q : p0;
  if (l.prop || l.player || parseProp(l.pick)) { const P = propNow(l); return P && P.q != null ? P.q : l.q != null ? l.q : p0; }
  if (/\b(1H|2H|Q[1-4]|P[1-3]|F5|1st|2nd|first|half|period|inning)\b/i.test(String(l.pick || '') + ' ' + String(l.mkt || ''))) return l.q != null ? l.q : p0; /* part-game legs: the desk's number */
  const sp = l.sp, S = LIVE_SD[sp] || [10, 10], f = fracLeft(lv, sp), pc = Math.min(0.99, Math.max(0.01, p0)), A = +lv.a, H = +lv.h, pick = String(l.pick || '').trim(); let m;
  if ((m = pick.match(/^(over|under)\s+([\d.]+)/i))) { const X = +m[2], over = /over/i.test(m[1]), T = A + H; if (T > X) return over ? 1 : 0;
    const tau = X + S[1] * probit(over ? pc : 1 - pc), po = ncdf((T + tau * f - X) / (S[1] * Math.sqrt(f))); return over ? po : 1 - po; }
  if ((m = pick.match(/^(\S+)\s+(ML|[+-]?\d+(?:\.\d+)?)\b/i))) { const [aw, hm] = String(l.game).split('@'), tm = m[1].toUpperCase();
    const side = tm === String(hm).toUpperCase() ? 'home' : tm === String(aw).toUpperCase() ? 'away' : null; if (!side) return l.q != null ? l.q : p0;
    const L = /ml/i.test(m[2]) ? 0 : +m[2], Mnow = side === 'home' ? H - A : A - H, mu = S[0] * probit(pc) - L; return ncdf((Mnow + mu * f + L) / (S[0] * Math.sqrt(f))); }
  return l.q != null ? l.q : p0; }
/* ── following a ticket live (v3.0.34, Chris, Nov 15: "make the public site do these features for the picks, parlays and longshots so
   people can follow easily"): every multi-leg ticket gets a summary — its chance, "1 in N", legs live, legs to go, the next start, and a
   📡 live cash chance against the pre-game number; every leg shows its live score and clock and its live chance (was X% pre-game). */
const p1in = p => (p > 0 ? Math.max(1, Math.round(1 / p)).toLocaleString('en-US') : p === 0 ? '20,000+' : '—'); /* a 0 from the feed is a long shot rounded away, not a sure loser */
const fmtP = p => (p == null ? '—' : p < 0.0001 ? '<0.01%' : p * 100 < 1 ? (p * 100).toFixed(2) + '%' : (p * 100).toFixed(1) + '%');
function legNow(l0) { const l = l0.game ? liveGrade(l0) : l0, c = stateOf(l), lv = l.game ? liveOf(l) : null; return { l, c, lv, live: c === 'o' && !!lv && lv.state === 'in' }; }
function scoreBit(l, lv) { if (!lv || lv.state === 'pre' || lv.a == null || isNaN(lv.a)) return ''; const [A, H] = String(l.game || '').split('@');
  return lv.state === 'in' ? `<span class="lv-on">● LIVE ${esc(A)} ${lv.a}–${lv.h} ${esc(H)}${lv.detail ? ' · ' + esc(lv.detail) : ''}</span>` : `<span class="lv-fin">Final ${esc(A)} ${lv.a}–${lv.h} ${esc(H)}</span>`; }
function qBit(l, live) { if (!live) return ''; const P = parseProp(l.pick) ? propNow(l) : null, q = liveQ(l); if (q == null) return '';
  const stat = P ? `<b class="lv-stat">${P.v} ${P.under ? `(under ${P.show})` : `of ${P.plus ? P.show + '+' : P.show}`}</b> · ` : ''; const p = l.p > 0 && l.p < 1 ? l.p : impP(l.price); return `${stat}<span class="lv-q ${p == null || q >= p ? 'up' : 'dn'}">${pct(q)}% live</span>${p != null ? ` <span class="lv-was">(was ${pct(p)}%)</span>` : ''}`; }
function tkSum(legs, pFallback, machine) {
  const N = (legs || []).filter(x => !x.hidden).map(legNow); if (N.length < 2) return '';
  const live = N.filter(x => x.live).length, lost = N.some(x => x.c === 'l'), started = N.some(x => x.c !== 'o' || x.live);
  const togo = N.filter(x => x.c === 'o' && !x.live).length, nexts = N.filter(x => x.c === 'o' && !x.live && x.l.start && Date.parse(x.l.start) > Date.now()).map(x => Date.parse(x.l.start)).sort((a, b) => a - b);
  const p0 = machine && machine.p0 != null ? machine.p0 : N.every(x => x.l.p != null) ? N.reduce((a, x) => a * x.l.p, 1) : pFallback;
  const pNow = lost ? 0 : N.reduce((a, x) => a * (x.c === 'w' || x.c === 'p' ? 1 : x.live ? (liveQ(x.l) ?? 1) : x.l.p != null ? x.l.p : 1), 1);
  const head = `<div class="tk-sum">${p0 != null ? `<b>${fmtP(p0)}</b> · 1 in ${p1in(p0)} · ` : ''}${N.length} legs${live ? ` · <span class="lv-on">● ${live} live</span>` : ''}${togo ? ` · ${togo} to go` : ''}${nexts.length ? ` · next ${esc(clock(new Date(nexts[0]).toISOString()))}` : ''}</div>`;
  const lc = started && p0 != null ? `<div class="tk-live ${lost ? 'dn' : pNow >= p0 ? 'up' : ''}">📡 ${live ? 'Live' : 'Now'} cash chance ${lost ? '0% · busted' : `${fmtP(pNow)} · 1 in ${p1in(pNow)} <small>(was 1 in ${p1in(p0)} pre-game)</small>`}</div>${live && S.liveAt ? `<div class="tk-upd">Scores updated ${esc(new Date(S.liveAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }))}</div>` : ''}` : '';
  return head + lc; }
function legRow(l0) {
  const l = l0.game ? liveGrade(l0) : l0, c = stateOf(l), big = l.game ? readPick(l).big : l.pick;
  const meta = [LEAGUE[l.sp], l.gl || (l.game ? matchup(l) : ''), c === 'o' && l.start ? whenLabel(l.start) : '', (l.by || []).length ? 'by ' + l.by.join(' + ') : ''].filter(Boolean).join(' · ');
  const N = l.game ? legNow(l0) : { live: false, lv: null };
  return `<div class="leg${N.live ? ' is-live' : ''}"><div class="li"><span class="mk ${c}">${c === 'w' ? '✓' : c === 'l' ? '✗' : c === 'p' ? '=' : N.live ? '●' : '•'}</span><span class="pk">${esc(big)} ${esc(odds(l.price))}<small>${esc(meta)}</small>${N.lv && N.lv.state !== 'pre' ? `<small class="lv">${scoreBit(l, N.lv)}${N.live ? ' · ' + qBit(l, true) : ''}</small>` : ''}</span><span class="u">${l.p != null ? pct(l.p) + '%' : ''}</span></div>${callsHtml(l.voices)}</div>`;
}
function vipHtml(F) {
  const V = F.vip; if (!V) return '';
  const sec = (title, body, note) => `<section class="vsec"><div class="vh"><h2 class="h2">${title}</h2>${vipBadge()}</div>${note ? `<p class="note">${note}</p>` : ''}${body}</section>`;
  const tix = (head, legs, p) => `<div class="paper tix">${head ? `<div class="tix-h">${head}</div>` : ''}${head ? tkSum(legs, p) : ''}${legs.map(legRow).join('')}</div>`;
  const top = (V.top10 || []).length ? sec('The rest of the Top 10', tix('', V.top10), 'Official singles: a character is 70%+ sure and the price pays.') : '';
  const bank = V.banker && (V.banker.legs || []).length ? sec('The Banker’s parlay', tix(`<b>${V.banker.legs.length} legs · ${esc(V.banker.price || '')}</b><span>${pct(V.banker.p)}% to cash</span>`, V.banker.legs, V.banker.p), 'Backs the side the strongest books are on.') : '';
  const pars = (V.parlays || []).length ? sec('Every character’s parlay', `<div class="pargrid">${V.parlays.map(P => tix(`<b>${esc(P.who)}${P.skill ? ' · strong suit' : P.px ? ' · props' : ''}</b><span>${P.legs.length} legs · ${esc(P.price || '')} · ${pct(P.p)}%</span>`, P.legs, P.p)).join('')}</div>`) : '';
  const props = (V.props || []).length ? sec('Props of the day', `<div class="paper tix">${V.props.map(c => `<div class="leg"><div class="li"><span class="mk">${c.star ? '★' : '•'}</span><span class="pk">${esc(c.pick)}${c.price != null ? ' ' + esc(odds(c.price)) : ''}<small>${esc([LEAGUE[c.sp], c.who].filter(Boolean).join(' · '))}</small></span><span class="u">${c.p != null ? pct(c.p) + '%' : ''}</span></div></div>`).join('')}</div>`) : '';
  return top + bank + pars + props;
}

/* ── the characters: bios, records, today's official picks, bloodlines ──────── */
const okColor = c => (/^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : '#F2D067');
const MKT = { ml: 'Moneylines', spread: 'Spreads', total: 'Totals' };
function crownPct(b, need) { if (!b) return 0; const z = b.bar > 0 ? Math.max(0, Math.min(1, b.z / b.bar)) : 0; return (Math.min(1, b.n / need.n) + Math.min(1, b.days / need.days) + 2 * z) / 4; }
function blRow(c, need) {
  const b = c.best, p = Math.round(crownPct(b, need) * 100);
  return `<div class="bl"><div class="bl-t"><b>${esc(MKT[c.m] || c.m)}</b><span>Generation ${c.gen} · ${c.heirs} heir${c.heirs === 1 ? '' : 's'} reading</span></div>
    ${b ? `<div class="bl-bar" role="img" aria-label="${p}% of the way to a new generation"><i style="width:${p}%"></i></div><div class="bl-s">${p}% of the way to a new generation · ${Math.min(b.n, need.n)}/${need.n} games watched</div>` : ''}
    ${(c.hist || []).length ? `<div class="bl-s">Generation ${c.gen} took over ${esc(shortDay(c.hist[c.hist.length - 1].to || deskDay()))}</div>` : ''}</div>`;
}
function viewCast() {
  const el = $('#v-cast'), F = S.feed || {}, C = F.characters || [], B = F.bloodlines, need = (B && B.need) || { n: 100, days: 10 };
  if (!C.length) { el.innerHTML = `<h1 class="title">The characters</h1><p class="lede">The roster shows up here once the desk publishes it.</p>${footHtml()}`; return; }
  const cells = (B && B.cells) || [], pick = S.castPick && C.some(c => c.v === S.castPick) ? S.castPick : '';
  const sel = `<div class="castpick"><label for="castSel">Pick a character</label><select id="castSel" data-change="castpick"><option value="">All characters</option>${C.map(c => `<option value="${esc(c.v)}"${c.v === pick ? ' selected' : ''}>${esc(c.name)}${c.title ? ' · ' + esc(c.title) : ''}</option>`).join('')}</select></div>`;
  const rec = r => r && r.w + r.l ? `${r.w}–${r.l}${r.pu ? '–' + r.pu : ''}` : '—';
  const todayLive = c => { let w = 0, l = 0, on = 0; for (const p0 of c.picks || []) { const g = withGame(p0), p = g.game ? liveGrade(g) : g, st = stateOf(p), lv = p.game ? liveOf(p) : null;
    if (st === 'w') w++; else if (st === 'l') l++; else if (st === 'o' && lv && lv.state === 'in') on++; } return { w, l, on }; };
  const todayTxt = c => { const T = todayLive(c); return T.w + T.l || T.on ? `Today ${T.w}–${T.l}${T.on ? ` · <span class="lv-on">● ${T.on} live</span>` : ''}` : ''; };
  const mark = r => (r === 'win' ? '<span class="mk w">✓</span>' : r === 'loss' ? '<span class="mk l">✗</span>' : r === 'push' ? '<span class="mk p">=</span>' : '<span class="mk">•</span>');
  if (!pick) {
    const race = cells.filter(c => c.best).map(c => ({ c, p: crownPct(c.best, need) })).sort((a, b) => b.p - a.p).slice(0, 5);
    el.innerHTML = `<h1 class="title">The characters</h1><p class="lede">Every pick on TheDesk comes from these voices. Each one sees the game its own way and keeps its own record. Pick one to see everything it’s called.</p>${sel}
      <div class="castgrid">${C.map(c => { const g = c.record || {}, pr = c.props || {}, today = (c.picks || []).length;
        return `<button type="button" class="castcard mini" style="--cc:${okColor(c.color)}" data-act="castpick" data-v="${esc(c.v)}"><div class="cc-h"><span class="cc-chip">${esc(c.chip || '')}</span><span class="cc-rec">${todayTxt(c) || (today ? `${today} pick${today === 1 ? '' : 's'} today` : 'No pick today')}</span></div>
          <h3>${esc(c.name)}</h3>${c.title ? `<p class="cc-title">${esc(c.title)}</p>` : ''}<div class="cc-stats"><span><b>${rec(g)}</b>games${g.w + g.l ? `, ${signed(g.u)}u` : ''}</span><span><b>${rec(pr)}</b>props</span></div><span class="cc-more">See profile →</span></button>`; }).join('')}</div>
      ${race.length ? `<section class="crown"><div class="vh"><h2 class="h2">Bloodlines</h2>${vipBadge()}</div><p class="note">Every character has heirs learning in the background. When one proves it’s better, it takes over: a new generation.</p>
        <div class="paper race"><div class="tix-h"><b>Closest to a new generation</b></div>${race.map(({ c, p }, i) => `<div class="rcr"><span class="n">${i + 1}</span><span class="t">${esc(c.who)}<small>${esc(MKT[c.m] || c.m)}</small></span><span class="bl-bar"><i style="width:${Math.round(p * 100)}%"></i></span></div>`).join('')}</div></section>` : ''}${footHtml()}`;
    return;
  }
  const c = C.find(x => x.v === pick), g = c.record || {}, pr = c.props || {}, lines = cells.filter(x => x.v === c.v);
  const games = (c.picks || []).filter(p => p.kind !== 'prop'), props = (c.picks || []).filter(p => p.kind === 'prop');
  /* graded live on the phone, like every ticket: score + clock + live chance while it plays, ✓/✗ the moment it's decided */
  const pickRow = p0 => { const g = withGame(p0), p = g.game ? liveGrade(g) : g, c = stateOf(p), lv = p.game ? liveOf(p) : null, on = c === 'o' && lv && lv.state === 'in';
    return `<div class="leg${on ? ' is-live' : ''}"><div class="li"><span class="mk ${c}">${c === 'w' ? '✓' : c === 'l' ? '✗' : c === 'p' ? '=' : on ? '●' : '•'}</span><span class="pk">${esc(p.kind === 'prop' ? p.pick : readPick(p).big)}${p.price != null ? ' ' + esc(odds(p.price)) : ''}<small>${esc([LEAGUE[p.sp], p.gl || p.team, p.kind !== 'prop' && c === 'o' && !on && p.start ? whenLabel(p.start) : ''].filter(Boolean).join(' · '))}</small>${lv && lv.state !== 'pre' ? `<small class="lv">${scoreBit(p, lv)}${on ? ' · ' + qBit(p, true) : ''}</small>` : ''}</span><span class="u">${p.p != null ? pct(p.p) + '%' : ''}</span></div>${p.note ? `<p class="why1">${esc(p.note)}</p>` : ''}</div>`; };
  const wl = o => (o && o.w + o.l ? `${o.w}–${o.l}` : '—');
  el.innerHTML = `<button type="button" class="link back" data-act="castpick" data-v="">← All characters</button>${sel}
    <article class="profile" style="--cc:${okColor(c.color)}"><div class="cc-h"><span class="cc-chip">${esc(c.chip || '')}</span>${vipBadge()}</div>
      <h1 class="title">${esc(c.name)}</h1>${c.title ? `<p class="cc-title big">${esc(c.title)}</p>` : ''}<p class="lede">${esc(c.bio || '')}</p>
      ${c.origin ? `<div class="origin"><b>Where the eye comes from</b><p>${esc(c.origin)}</p></div>` : ''}
      <div class="statrow"><div><b>${rec(g)}</b><span>Official game picks${g.w + g.l ? `, ${signed(g.u)}u` : ''}</span></div><div><b>${rec(pr)}</b><span>Props</span></div><div><b>${(c.picks || []).length}</b><span>Picks today</span></div></div>
      ${(c.best || []).length ? `<h2 class="h2">Best at</h2><div class="lanes">${c.best.map(x => `<span class="lane good">${esc(x.lane)} <b>${x.w}–${x.l}</b>${x.u ? ` ${x.u > 0 ? '+' : ''}${x.u}u` : ''}</span>`).join('')}${(c.still || []).map(x => `<span class="lane meh">Still learning: ${esc(x.lane)} <b>${x.w}–${x.l}</b></span>`).join('')}</div>` : ''}
      <h2 class="h2">Today’s official picks</h2>${todayTxt(c) ? `<p class="tk-sum castday">${todayTxt(c)}${S.liveAt && todayLive(c).on ? ` · <span class="tk-upd">Scores updated ${esc(new Date(S.liveAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))}</span>` : ''}</p>` : ''}${games.length || props.length ? `<div class="paper tix">${games.map(pickRow).join('')}${props.length ? `<div class="tix-h sub"><b>Props</b></div>${props.map(pickRow).join('')}` : ''}</div>` : '<p class="note">Nothing official today. It only speaks when it’s sure.</p>'}
      ${(c.recent || []).length ? `<h2 class="h2">Recent results</h2><div class="paper tix">${c.recent.map(r => `<div class="leg"><div class="li">${mark(r.r)}<span class="pk">${esc(r.kind === 'prop' ? r.pick : readPick(r).big)}${r.price != null ? ' ' + esc(odds(r.price)) : ''}<small>${esc([LEAGUE[r.sp], r.gl, shortDay(r.d)].filter(Boolean).join(' · '))}</small></span><span class="u"></span></div></div>`).join('')}</div>` : ''}
      ${(c.teams || []).length ? `<h2 class="h2">Teams it backs and fades</h2><div class="paper tbl"><table><thead><tr><th scope="col">Team</th><th scope="col">Backed</th><th scope="col">Against</th></tr></thead><tbody>${c.teams.map(t => `<tr><th scope="row">${esc(teamName(t.sp, t.team))}<small>${esc(LEAGUE[t.sp] || '')}</small></th><td>${wl(t.for)}</td><td>${wl(t.vs)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${(c.players || []).length ? `<h2 class="h2">Players it rides and fades</h2><div class="paper tbl"><table><thead><tr><th scope="col">Player</th><th scope="col">Overs</th><th scope="col">Unders</th></tr></thead><tbody>${c.players.map(t => `<tr><th scope="row">${esc(t.player)}<small>${esc([LEAGUE[t.sp], t.team].filter(Boolean).join(' · '))}</small></th><td>${wl(t.over)}</td><td>${wl(t.under)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${lines.length ? `<h2 class="h2">Bloodlines</h2>${lines.map(x => blRow(x, need)).join('')}` : ''}</article>${footHtml()}`;
}

/* ── the members' chatroom (the one thing that talks back: words only, never picks) ── */
const CH = { list: [], ws: null, tries: 0, poll: null, invite: '', err: '' };
S.castPick = store.get('castpick') || '';
const chatPass = () => { const p = store.get('chat'); return p && p.token && p.exp > Date.now() ? p : null; };
async function chatApi(path, body) {
  const r = await fetch(CFG.chat + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  let j = {}; try { j = await r.json(); } catch { /* empty */ } if (!r.ok) throw new Error(j.error || 'the chat didn’t answer'); return j;
}
function msgHtml(m, owner) {
  return `<div class="msg${m.owner ? ' own' : ''}" data-id="${esc(m.id)}"><div class="msg-h"><b>${esc(m.name)}</b>${m.owner ? '<span class="msg-tag">The desk</span>' : ''}<time>${esc(clock(m.ts))}</time>
    ${owner && !m.owner ? `<span class="msg-mod"><button type="button" data-act="chat-del" data-id="${esc(m.id)}">Delete</button><button type="button" data-act="chat-mute" data-name="${esc(m.name)}">Mute 1h</button><button type="button" data-act="chat-ban" data-name="${esc(m.name)}">Ban</button></span>` : owner ? `<span class="msg-mod"><button type="button" data-act="chat-del" data-id="${esc(m.id)}">Delete</button></span>` : ''}</div><p>${esc(m.text)}</p></div>`;
}
function paintChat(stick) {
  const box = $('#msgs'); if (!box) return; const P = chatPass(), near = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  box.innerHTML = CH.list.length ? CH.list.map(m => msgHtml(m, P && P.owner)).join('') : '<p class="chat-empty">No messages yet. Say the first word.</p>';
  if (stick || near) box.scrollTop = box.scrollHeight;
}
function chatConnect() {
  if (CH.ws && CH.ws.readyState <= 1) return;
  try {
    const ws = new WebSocket(CFG.chat.replace(/^http/, 'ws') + '/chat/live'); CH.ws = ws;
    ws.onopen = () => { CH.tries = 0; };
    ws.onmessage = e => { let o; try { o = JSON.parse(e.data); } catch { return; }
      if (o.type === 'msg' && o.m && !CH.list.some(m => m.id === o.m.id)) { CH.list.push(o.m); CH.list = CH.list.slice(-200); paintChat(); }
      else if (o.type === 'del') { CH.list = CH.list.filter(m => m.id !== o.id); paintChat(); } };
    ws.onclose = () => { CH.ws = null; if (S.tab === 'chat') setTimeout(chatConnect, Math.min(30e3, 2000 * 2 ** CH.tries++)); };
  } catch { /* no live updates: the poll below still runs */ }
  clearInterval(CH.poll); CH.poll = setInterval(() => { if (S.tab === 'chat' && !(CH.ws && CH.ws.readyState === 1)) chatLoad(); }, 20e3);
}
async function chatLoad() { try { const j = await chatApi('/chat/history'); CH.list = j.messages || []; CH.err = ''; } catch (e) { CH.err = 'The chat can’t be reached right now.'; } paintChat(true); const n = $('#chatErr'); if (n) n.textContent = CH.err; }
function viewChat() {
  const el = $('#v-chat'), P = chatPass(), key = P ? P.name + (P.owner ? '*' : '') : '-';
  if (el.dataset.who !== key) {
    el.dataset.who = key;
    const form = P ? `<form class="compose" data-form="chat-send"><label class="sr" for="chatText">Message</label><textarea id="chatText" maxlength="500" rows="2" placeholder="Talk sports, ${esc(P.name)}…"></textarea><button type="submit" class="btn foil">Send</button></form>
        <p class="chat-me">Posting as <b>${esc(P.name)}</b>${P.owner ? ' (owner)' : ''}. <button type="button" class="link" data-act="chat-leave">Sign out</button></p>`
      : `<form class="joinchat" data-form="chat-join"><p><b>Want to post?</b> During the beta, posting takes an invite code from the desk.</p>
        <div class="jc-row"><label><span>Your name</span><input name="name" maxlength="20" autocomplete="nickname" placeholder="Hoops Fan"></label><label><span>Invite code</span><input name="code" autocomplete="off" autocapitalize="characters" placeholder="DESK-XXXXX"></label></div>
        <button type="submit" class="btn foil">Join the chat</button><p class="chat-err" id="joinErr" role="alert"></p></form>`;
    const tools = P && P.owner ? `<div class="owner"><b>Owner tools</b><div class="row"><button type="button" class="btn line" data-act="chat-invite">Make an invite code (25 uses)</button></div><p class="chat-inv" id="chatInv">${CH.invite ? `New code: <code>${esc(CH.invite)}</code>` : ''}</p></div>` : '';
    el.innerHTML = `<h1 class="title">Members’ chat</h1><p class="lede">Talk sports with the desk and everyone on it. Anyone can read. ${S.feed && S.feed.beta ? 'During the beta, posting takes an invite code.' : 'Posting is for members.'}</p>
      <div class="paper chatbox"><div class="msgs" id="msgs" aria-live="polite"></div></div><p class="chat-err" id="chatErr" role="alert">${esc(CH.err)}</p>${form}${tools}
      <p class="note" style="margin-top:14px">Keep it about sports. No picks for sale, no spam, no slurs. The desk removes anything that crosses the line.</p>${footHtml()}`;
  }
  paintChat(true); if (!CH.loaded) { CH.loaded = true; chatLoad(); } chatConnect();
}
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
  if (f.dataset.form === 'admoney') { const k = f.kind.value, amt = +f.amt.value; try { await adApi(k === 'take' ? 'take' : 'grant', { name: AD.sel, amount: amt, kind: k }); toast(k === 'take' ? `Took ${dd$(amt)}` : `Gave ${dd$(amt)}`); AD.user = await adApi('user', { name: AD.sel }); adLoad(true); } catch (err) { toast(err.message); } return; }
  if (f.dataset.form === 'adxp') { try { const j = await adApi('xp', { name: AD.sel, amount: +f.amt.value }); toast(`XP now ${j.xp}`); AD.user = await adApi('user', { name: AD.sel }); viewAdmin(); } catch (err) { toast(err.message); } return; }
  if (f.dataset.form === 'adnote') { try { await adApi('note', { name: AD.sel, note: f.note.value }); toast('Note saved'); } catch (err) { toast(err.message); } return; }
  if (f.dataset.form === 'adreply') { try { AD.thread = (await adApi('reply', { name: AD.thread.name, text: f.text.value })).thread; viewAdmin(); toast('Sent'); } catch (err) { toast(err.message); } return; }
  if (f.dataset.form === 'adbcast') { if (!confirm('Send this to every member?')) return; try { const j = await adApi('broadcast', { text: f.text.value }); toast(`Sent to ${j.n} members`); AD.inbox = null; viewAdmin(); } catch (err) { toast(err.message); } return; }
  if (f.dataset.form === 'mymsg') { const P = acctPass(); if (!P) return; try { const j = await acctApi('/acct/inbox/send', { token: P.token, text: f.text.value }); if (AC.me) AC.me.inbox = j.inbox; viewMe(); toast('Sent to the desk'); } catch (err) { toast(err.message); } return; }
  if (f.dataset.form === 'lgsnew') { const P = acctPass(); if (!P) return; try { const j = await acctApi('/acct/lgs/create', { token: P.token, name: f.name.value.trim(), blurb: f.blurb.value.trim(), starts: Date.parse(f.starts.value), ends: Date.parse(f.ends.value), bank: +f.bank.value, max: +f.max.value,
      prizes: f.prizes.value.split(/[,\s]+/).map(Number).filter(x => x > 0), sports: [...f.querySelectorAll('input[name="sp"]:checked')].map(x => x.value), late: f.late.checked }); LGX.at = 0; lgsLoad(true); toast(`${j.league.name} is open`); } catch (err) { toast(err.message); } return; }
  if (f.dataset.form === 'acct') { const n = $('#acctErr'); n.textContent = ''; const signup = AC.mode === 'signup';
    try { const j = await acctApi(signup ? '/acct/signup' : '/acct/login', { name: f.name.value.trim(), pass: f.pass.value, ...(signup ? { age21: !!(f.age21 && f.age21.checked) } : {}) });
      try { if (window.PasswordCredential && navigator.credentials) navigator.credentials.store(new PasswordCredential({ id: f.name.value.trim(), password: f.pass.value, name: j.name })).catch(() => { }); } catch (e2) { }
      store.set('acct', { token: j.token, name: j.name, owner: !!j.owner }); acctBadge(); toast(signup ? `Welcome to TheDesk, ${j.name}` : `Welcome back, ${j.name}`); viewMe(); acctLoad(); if (!isStandalone()) setTimeout(() => openGuide(false), 1400); } catch (err) { n.textContent = err.message; } return; }
  if (f.dataset.form === 'ddgrant') { const P = acctPass(); if (!P) return; try { await acctApi('/acct/grant', { token: P.token, name: f.who.value.trim(), amount: +f.amt.value }); toast(`Added D$${(+f.amt.value).toLocaleString('en-US')} to ${f.who.value.trim()}`); f.reset(); LB = null; lbLoad(); } catch (err) { toast(err.message); } return; }
  if (f.dataset.form === 'acclose') { const P = acctPass(); if (!P) return; try { await acctApi('/acct/close', { token: P.token, pass: f.pass.value }); store.set('acct', null); AC.me = null; acctBadge(); viewMe(); toast('Your account is deleted'); } catch (err) { toast(err.message); } return; }
  if (f.dataset.form === 'newtk') { const legs = parseLegs(f.legs.value); if (!legs.length) return toast('Add at least one leg');
    const od = +String(f.odds.value).replace(/[^\d+-]/g, ''); const t = { id: tid(), ts: Date.now(), title: f.title.value.trim(), stake: +f.stake.value || null, odds: Math.abs(od) >= 100 ? od : null, legs };
    if (await tkSave(t, 'Tracking it')) viewMe(); return; }
  if (f.dataset.form === 'chat-join') { const n = $('#joinErr'); n.textContent = '';
    try { const j = await chatApi('/chat/join', { name: f.name.value.trim(), code: f.code.value.trim() }); store.set('chat', j); viewChat(); toast(`You’re in, ${j.name}`); } catch (err) { n.textContent = err.message; } }
  if (f.dataset.form === 'chat-send') { const t = $('#chatText'), P = chatPass(); if (!t || !t.value.trim() || !P) return;
    try { const j = await chatApi('/chat/send', { token: P.token, text: t.value }); t.value = ''; if (!CH.list.some(m => m.id === j.message.id)) { CH.list.push(j.message); paintChat(true); } }
    catch (err) { toast(err.message); if (/join the chat/.test(err.message)) { store.set('chat', null); viewChat(); } } }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'chatText') { e.preventDefault(); e.target.form.requestSubmit(); } });
async function chatMod(body, done) { const P = chatPass(); if (!P || !P.owner) return; try { const j = await chatApi('/chat/mod', { token: P.token, ...body }); done && done(j); } catch (err) { toast(err.message); } }

/* ── Join ────────────────────────────────────────────────────────────────── */
/* how long members had the latest card before the public saw its first pick (all from public timestamps) */
function headStart(T) {
  if (!T || !fin(ms(T.lockedAt))) return null;
  const opens = (T.picks || []).map(x => fin(ms(x.unlockAt)) ? ms(x.unlockAt) : fin(ms(x.start)) ? ms(x.start) - 30 * 60e3 : NaN).filter(fin);
  if (!opens.length) return null;
  const lock = ms(T.lockedAt), first = Math.min(...opens);
  return first - lock >= 30 * 60e3 ? { lock, first, lead: first - lock } : null;
}
const hm = d => { const m = Math.round(d / 60e3), h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; };
const YES = '<svg class="y" viewBox="0 0 24 24" role="img" aria-label="Included"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const NO = '<svg class="n" viewBox="0 0 24 24" role="img" aria-label="Not included"><path d="M7 12h10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
function viewJoin() {
  const el = $('#v-join'), F = S.feed || {}, beta = F.beta !== false, sub = beta ? '' : okUrl(F.subscribe), soc = { ...CFG.social, ...(F.social || {}) }, tg = okUrl(soc.tg), fb = okUrl(soc.fb), ig = okUrl(soc.ig), xx = okUrl(soc.x);
  const price = '$50/mo or $300/yr', R = F.record || {}, n = (R.w || 0) + (R.l || 0);
  const T = F.today, H = beta ? null : headStart(T), isToday = T && T.d === deskDay(), when = isToday ? 'today' : T ? 'on ' + weekday(T.d) : '';
  const lead = H ? `<div class="headstart"><div class="hs-n">${esc(hm(H.lead))}</div><b class="hs-l">Head start ${esc(when)}</b><span class="hs-s">${isToday && Date.now() < H.first
      ? `Members have had the card since ${esc(clock(H.lock))}. The public’s first look is at ${esc(clock(H.first))}.`
      : `Members had the card at ${esc(clock(H.lock))}. The public saw its first pick at ${esc(clock(H.first))}.`}</span></div>` : '';
  const proof = n ? `<p class="proof">On the record: <b>${R.w}–${R.l}${R.pu ? '–' + R.pu : ''}</b>, <b>${signed(+R.u || 0)} units</b>${R.first ? ' since ' + esc(monthDay(R.first)) : ''}. <button type="button" class="link" data-go="receipts">See every result</button></p>` : '';
  const rows = [['The Best 3', '30 min before each game', 'The minute it locks'], ['The Top 10 plays of the day', 0, 1], ['Every character’s official picks, with each one’s breakdown', 0, 1], ['Every character’s parlay, plus the Banker’s', 0, 1],
    ['The members’ chatroom', 0, 'Soon'], ['The VIP lounge on Telegram and in the app', 0, 'Yearly plan'], ['Every result, graded in public', 1, 1], ['The slate, Power Rankings, bios and bloodlines', 1, 1], ['The free lounge', 1, 1]];
  const cell = (v, cls) => `<td${cls ? ` class="${cls}"` : ''}>${v === 1 ? YES : v === 0 ? NO : esc(v)}</td>`;
  const plans = ((F.plans || []).length ? F.plans : CFG.plans).filter(x => x && x.name && isFinite(+x.price));
  const plansHtml = plans.length ? `<h2 class="h2">${beta ? 'Plans after the beta' : 'Plans'}</h2>${beta ? '<p class="note">Nothing to buy yet. These open when the beta ends.</p>' : ''}
    <div class="plans">${plans.map(x => `<div class="plan${x.best ? ' best' : ''}">${x.best ? '<span class="pl-tag">Best value</span>' : ''}<b>${esc(x.name)}</b><div class="pl-p">$${esc(String(+x.price))}<small>/ ${esc(x.per || '')}</small></div><span>${esc(x.note || '')}</span></div>`).join('')}</div>` : '';
  const pass = beta ? `<div class="pass"><div class="vip" aria-hidden="true">VIP</div><h3>All access</h3>
      <ul><li>The Best 3 the minute the card locks</li><li>The Top 10 plays of the day</li><li>Every character’s official picks, with each one’s breakdown</li><li>Every character’s parlay, plus the Banker’s</li><li>The members’ chatroom, and on the yearly plan the VIP lounge</li></ul>
      <div class="cost">Free during the beta</div><button type="button" class="btn foil block" data-go="today">See today’s full card</button>
      ${proof}<p class="small">Memberships open when the beta ends. Free stays free.</p></div>`
    : sub ? `<div class="pass"><div class="vip" aria-hidden="true">VIP</div><h3>All access</h3>${lead}
      <ul><li>The Best 3 at lock time, hours before the public</li><li>The Top 10 plays of the day</li><li>Every character’s official picks, with each one’s breakdown</li><li>Every character’s parlay, plus the Banker’s</li><li>The members’ chatroom, and on the yearly plan the VIP lounge</li></ul>
      ${price ? `<div class="cost">${esc(price)}</div>` : ''}<a class="btn foil block" href="${esc(sub)}" target="_blank" rel="noopener">Join VIP</a>
      ${proof}<p class="small">Checkout runs on Whop. Cancel there any time.</p></div>` : '';
  const faq = beta ? [['Where do the picks show up?', 'Right here, the minute the card locks, free for everyone during the beta.'], ['Do you guarantee wins?', 'No, and nobody honest can. Every pick is graded in public, losses included, and the full record is on Receipts.'],
      ['What happens after the beta?', 'Memberships open: $50 a month, $300 a year, $100 per league for a season, a $20 two-day pass, or $2 for a single pick. Free stays free.']]
    : [['Where do the picks show up?', 'In the private Telegram, the minute the card locks. The public app opens each pick 30 minutes before its game.'], ['Do you guarantee wins?', 'No, and nobody honest can. Every pick is graded in public, losses included, and the full record is on Receipts.'], ['Can I cancel?', 'Any time, on Whop. No contract.']];
  el.innerHTML = `<h1 class="title">${beta ? 'Everything’s free during the beta' : 'Get the card before the games'}</h1>
    <p class="lede">${beta ? 'Every pick, every character and every stat line is open while the desk is in beta.' : 'The public sees each pick 30 minutes before its game. Members see the whole card the minute it locks.'}</p>
    <div class="cols join"><div>${pass}
    <article class="slip stubcard"><div class="slip-head"><span>Admit all</span><span>Free</span></div><div class="slip-main"><h3>Follow the desk</h3>
      <p>The free picks before every game, every result and the nightly recap, wherever you scroll. Keep an eye out… now and then we leave something hidden.</p></div>
      <div class="slip-stub"><div class="row">${tg ? `<a class="btn ink" href="${esc(tg)}" target="_blank" rel="noopener">Telegram channel</a>` : ''}${fb ? `<a class="btn paper" href="${esc(fb)}" target="_blank" rel="noopener">Facebook</a>` : ''}${ig ? `<a class="btn paper" href="${esc(ig)}" target="_blank" rel="noopener">Instagram</a>` : ''}${xx ? `<a class="btn paper" href="${esc(xx)}" target="_blank" rel="noopener">X</a>` : ''}</div></div></article>
    </div><div>
    ${plansHtml}
    <h2 class="h2">Free or VIP</h2>${beta ? '<p class="note">During the beta the VIP column is free for everyone.</p>' : ''}
    <div class="paper cmp"><table><thead><tr><th scope="col"><span class="sr">What you get</span></th><th scope="col">Free</th><th scope="col" class="v">VIP</th></tr></thead>
      <tbody>${rows.map(([k, f, v]) => `<tr><th scope="row">${esc(k)}</th>${cell(f)}${cell(v, 'v')}</tr>`).join('')}</tbody></table></div>
    <h2 class="h2">How the desk works</h2>
    <ol class="steps"><li><div><b>Locked every morning</b><span>The card is sealed and time-stamped before the first game. A fingerprint of it goes public right then.</span></div></li>
      <li><div><b>${beta ? 'Open the minute it locks' : 'Opened 30 minutes before each game'}</b><span>${beta ? 'During the beta everyone sees the whole card at once.' : 'Each slip turns over on its own clock. Members have it from the lock.'}</span></div></li>
      <li><div><b>Graded at the final</b><span>Win or lose, the stamp goes on and the result stays on the record.</span></div></li></ol>
    <h2 class="h2">Questions</h2>
    <div class="faq">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
    ${isStandalone() ? '' : `<h2 class="h2">Keep it on your phone</h2><p class="note">TheDesk installs like an app from your browser. No app store, nothing to update.</p><div class="row" style="margin-top:12px"><button type="button" class="btn line" data-act="guide">Show me how</button></div>`}
    </div></div>${F.handle ? `<p class="note" style="margin-top:34px">Run by ${esc(F.handle)}.</p>` : ''}${footHtml()}`;
}

/* ── install guide ───────────────────────────────────────────────────────── */
const UA = navigator.userAgent || '';
/* ── Inside Telegram (Chris, Nov 15: "facilitate it into a TG app that I'll run in the lounge"). The same public app, opened as a
   Telegram Mini App from the lounge's pinned button: full screen in our colors, Telegram's own back button, no "save to home screen"
   (it already lives in Telegram), swipe-down doesn't close it (pull to refresh keeps working), links open the Telegram way, and
   t.me/<bot>/desk?startapp=props opens straight on that tab. */
const TG = (() => { try { const t = window.Telegram && window.Telegram.WebApp; return t && (t.initData || (t.platform && t.platform !== 'unknown')) ? t : null; } catch (e) { return null; } })();
if (TG) { try { document.documentElement.classList.add('tg'); TG.ready(); TG.expand(); if (TG.disableVerticalSwipes) TG.disableVerticalSwipes();
    if (TG.setHeaderColor) TG.setHeaderColor('#0e1712'); if (TG.setBackgroundColor) TG.setBackgroundColor('#0e1712'); if (TG.setBottomBarColor) TG.setBottomBarColor('#0e1712');
    TG.BackButton && TG.BackButton.onClick(() => go('today', true));
    document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (!a) return; const h = a.getAttribute('href') || ''; if (!/^https?:/i.test(h) || a.closest('[data-go]')) return;
      e.preventDefault(); try { if (/^https?:\/\/t\.me\//i.test(h) && TG.openTelegramLink) TG.openTelegramLink(h); else TG.openLink(h); } catch (er) { location.href = h; } }, true); } catch (e) { } }
const isStandalone = () => !!TG || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
function device() {
  const ios = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), android = /Android/i.test(UA);
  const named = /FBAN|FBAV|FB_IAB/i.test(UA) ? 'Facebook' : /Instagram/i.test(UA) ? 'Instagram' : /Barcelona|Threads/i.test(UA) ? 'Threads' : /TikTok|musical_ly|Bytedance/i.test(UA) ? 'TikTok' : /Snapchat/i.test(UA) ? 'Snapchat' : /Twitter/i.test(UA) ? 'X' : /Line\//i.test(UA) ? 'Line' : '';
  const webview = named || (ios && !/Safari\//.test(UA)) || (android && /; wv\)/.test(UA));
  const safari = ios ? /Safari\//.test(UA) && !/CriOS|FxiOS|EdgiOS/.test(UA) : /Safari\//.test(UA) && !/Chrome|Chromium|Edg\//.test(UA);
  return { kind: ios ? 'iphone' : android ? 'android' : 'computer', inapp: webview ? named || 'this app' : '', safari, mac: /Macintosh/.test(UA) && !ios };
}
const SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3.5m0 0L8 7.5m4-4 4 4"/><path d="M7 11H5.5v9.5h13V11H17"/></svg>';
function guideHtml() {
  const G = S.guide, dv = device(), tab = G.tab, can = !!S.canPrompt;
  const steps = {
    iphone: [dv.kind === 'iphone' && (dv.inapp || !dv.safari) ? 'Open this page in <b>Safari</b>.' : '', `Tap <span class="key">${SHARE}Share</span> at the bottom of Safari.`, 'Scroll down and tap <b>Add to Home Screen</b>.', 'Tap <b>Add</b>. TheDesk is on your home screen.'],
    android: can && dv.kind === 'android' ? ['Tap <b>Install TheDesk</b> below.', 'Tap <b>Install</b> when Android asks. It lands on your home screen.'] : [dv.kind === 'android' && dv.inapp ? 'Open this page in <b>Chrome</b>.' : '', 'Tap <span class="key">⋮</span> at the top right of Chrome.', 'Tap <b>Add to Home screen</b>, then <b>Install</b>.', 'Open TheDesk from your home screen.'],
    computer: can && dv.kind === 'computer' ? ['Click <b>Install TheDesk</b> below.', 'Click <b>Install</b>. It opens in its own window and sits with your other apps.'] : ['In <b>Chrome</b> or <b>Edge</b>, click the install icon at the right end of the address bar.', 'Click <b>Install</b>.', 'On a Mac with <b>Safari</b>: open the <b>File</b> menu and choose <b>Add to Dock</b>.'],
  }[tab].filter(Boolean);
  const warn = dv.inapp && tab === dv.kind ? `<p class="warn"><b>You’re inside ${esc(dv.inapp === 'this app' ? 'an app’s built-in browser' : dv.inapp + '’s browser')}.</b> It can’t add apps to your phone. Tap the ••• menu and choose <b>Open in ${dv.kind === 'iphone' ? 'Safari' : 'Chrome'}</b>, or copy the link and paste it there.</p>` : '';
  const main = can && tab === dv.kind ? '<button type="button" class="btn ink" data-act="install">Install TheDesk</button>' : dv.inapp && tab === dv.kind ? '<button type="button" class="btn ink" data-act="copylink">Copy the link</button>' : '';
  return `<div class="scrim" data-act="guide-close"><div class="guide" role="dialog" aria-modal="true" aria-labelledby="gT" tabindex="-1">
    <div class="guide-top"><img src="../brand/icon-192.png" width="60" height="60" alt=""><div><h2 id="gT">Put TheDesk on your home screen</h2><p class="sub">The best way to use TheDesk. Saved as an app, you stay signed in, so your D$ and your tickets are one tap away and you never have to log in again. No app store, nothing to update.</p></div></div>
    <div class="dev" role="group" aria-label="Your device">${[['iphone', 'iPhone'], ['android', 'Android'], ['computer', 'Computer']].map(([k, l]) => `<button type="button" data-act="guide-tab" data-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join('')}</div>
    ${warn}<ol class="how">${steps.map(s => `<li><span>${s}</span></li>`).join('')}</ol>
    <div class="row">${main}<button type="button" class="btn paper" data-act="guide-done">${G.first ? 'Go to today’s card' : 'Done'}</button></div></div></div>`;
}
function openGuide(first) {
  S.guide = { tab: device().kind, first: !!first }; $('#guideRoot').innerHTML = guideHtml();
  const g = $('.guide'); if (g && !first) g.focus();
}
function closeGuide() { const g = store.get('guide') || {}; S.guide = null; $('#guideRoot').innerHTML = ''; store.set('guide', { at: Date.now(), n: (g.n || 0) + 1 }); }
function chip() { $('#installChip').hidden = isStandalone(); }
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.canPrompt = e; if (S.guide) $('#guideRoot').innerHTML = guideHtml(); });
window.addEventListener('appinstalled', () => { S.canPrompt = null; closeGuide(); $('#installChip').hidden = true; toast('TheDesk is installed'); });

/* ── shell ───────────────────────────────────────────────────────────────── */
function toast(msg) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); t.style.cssText = 'position:fixed;left:50%;bottom:calc(var(--tabs) + 22px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:60;background:#15130F;color:#F6F1E4;padding:11px 16px;border-radius:10px;font-weight:650;font-size:14.5px;box-shadow:0 10px 24px rgba(0,0,0,.45);max-width:88vw;text-align:center'; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600);
}
async function share() {
  const T = S.feed && S.feed.today; if (!T) return;
  const lines = (T.picks || []).map((x, i) => (x.hidden ? `${i + 1}. Sealed until 30 minutes before the game` : `${i + 1}. ${readPick(x).big} ${odds(x.price)}${x.hit === true ? ' (won)' : x.hit === false ? ' (lost)' : x.push ? ' (push)' : ''}`));
  const text = `TheDesk, ${shortDay(T.d)}\n${lines.join('\n')}`;
  try { if (navigator.share) { await navigator.share({ title: 'TheDesk', text, url: CFG.home }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(`${text}\n${CFG.home}`); toast('Card copied'); } catch { toast('Couldn’t copy the card'); }
}
/* ── Challenges + Leagues (v3.1.0, Chris, Nov 15: "evolve them both to the 10th power"). The 1,000-challenge library lives in
   chal-lib.js (the same file the server enforces). Runs climb six checkpoints on a road map, pay XP on the way and D$ + XP at the
   finish. Leagues are run by the desk: it opens them, members join, the podium is paid in D$. Play money only. */
const CX = { board: null, at: 0, f: store.get('cxf') || { d: 0, t: '', r: '', s: '', q: '', sort: 'feat' }, show: 24, open: '' }, LGX = { list: null, at: 0, one: {}, open: '' };
const CHN = id => { const c = chal(id); return c ? c.name : id; };
const cxLeft = ms => { if (ms <= 0) return 'time’s up'; const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 60e3); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };
const cxTook = ms => { const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5); return d ? `${d}d ${h}h` : `${Math.max(1, h)}h`; };
const runPct = r => Math.max(0, Math.min(1, Math.log(Math.max(r.bal, 1) / r.start) / Math.log(r.goal / r.start)));
const liveRuns = () => ((AC.me && AC.me.runs) || []).filter(r => r.status === 'live' && r.ends > Date.now());
const liveLgs = () => ((AC.me && AC.me.leagues) || []).filter(g => g.status === 'live');
const tierOfId = id => CTIERS.find(t => t.id === id) || CTIERS[0];
const tierChip = c => `<span class="tchip" style="--tc:${c.color}">${esc(c.tierName)}</span>`;
const fromKey = () => { const v = S.ddFrom || ''; if (v.startsWith('run:') && liveRuns().some(r => 'run:' + r.rid === v)) return v; if (v.startsWith('lg:') && liveLgs().some(g => 'lg:' + g.lid === v)) return v; return ''; };
async function chalLoad(force) { if (!force && CX.board && Date.now() - CX.at < 30e3) return; try { const r = await fetch(CFG.chat + '/acct/chal', { cache: 'no-store' }); if (r.ok) { CX.board = await r.json(); CX.at = Date.now(); if (S.tab === 'challenges') viewChallenges(); } } catch (e) { } }
async function lgsLoad(force) { if (!force && LGX.list && Date.now() - LGX.at < 30e3) return; try { const r = await fetch(CFG.chat + '/acct/lgs', { cache: 'no-store' }); if (r.ok) { LGX.list = await r.json(); LGX.at = Date.now(); if (S.tab === 'leagues') viewLeagues(); } } catch (e) { } }
async function lgOneLoad(lid) { try { const r = await fetch(CFG.chat + '/acct/lgs/one?id=' + encodeURIComponent(lid), { cache: 'no-store' }); if (r.ok) { LGX.one[lid] = await r.json(); if (S.tab === 'leagues') viewLeagues(); } } catch (e) { } }
const compSwitch = on => `<div class="compsw" role="tablist">${[['challenges', '🎯 Challenges'], ['leagues', '🏆 Leagues']].map(([t, l]) => `<button type="button" role="tab" aria-selected="${on === t}" class="${on === t ? 'on' : ''}" data-go="${t}">${l}</button>`).join('')}</div>`;
const signCta = what => `<div class="paper ddpitch"><b>Sign in to ${what}</b><p>Free: an account comes with D$1,000 of play money, a fresh bankroll for every challenge you start, and a seat in the desk’s leagues. Finish challenges and win leagues for D$ prizes and XP.</p><div class="row"><button type="button" class="btn sm" data-go="me">Sign in or sign up</button></div></div>`;
/* the player card: rank, XP to the next rank, trophies by tier, prizes won */
function playerCard() { const M = AC.me; if (!M) return ''; const R = M.rank || rankOf(M.xp || 0), T = M.trophies || {}, W = M.wallet || {};
  return `<section class="pcard"><div class="pc-top"><div class="pc-rank"><small>Rank</small><b>${esc(R.name)}</b></div><div class="pc-xp"><b>${(M.xp || 0).toLocaleString('en-US')}</b><small>XP</small></div></div>
    <div class="pc-bar"><i style="width:${Math.round((R.pct || 0) * 100)}%"></i></div><p class="pc-next">${R.next ? `${(R.next - (M.xp || 0)).toLocaleString('en-US')} XP to <b>${esc(R.nextName)}</b>` : 'Top rank. Legend status.'}</p>
    <div class="pc-tr">${CTIERS.map(t => `<span style="--tc:${t.color}"><b>${T[t.id] || 0}</b>${esc(t.name)}</span>`).join('')}</div>
    <div class="pc-st"><span><b>${liveRuns().length}</b>/3 runs live</span><span><b>${dd$(W.prize || 0)}</b> in prizes</span></div>
    ${(M.xplog || []).length ? `<details class="pc-log"><summary>Recent XP</summary>${M.xplog.slice(0, 8).map(x => `<p><span>${esc(x.why)}</span><b>+${x.xp} XP${x.dd ? ` · +${dd$(x.dd)}` : ''}</b></p>`).join('')}</details>` : ''}</section>`; }
/* the road map: six checkpoints on a track, the pace marker, and where the run stands */
function roadmap(c, r) { const cps = checkpoints(c), bal = r ? r.bal : c.start, day = r ? (Date.now() - r.ts) / 864e5 : 0, pace = paceAt(c, day), p = r ? runPct(r) : 0;
  const pacePct = Math.max(0, Math.min(1, Math.log(pace / c.start) / Math.log(c.goal / c.start)));
  return `<div class="road"><div class="rd-track"><i class="rd-fill" style="width:${(p * 100).toFixed(1)}%"></i>${r ? `<i class="rd-pace" style="left:${(pacePct * 100).toFixed(1)}%" title="pace"></i>` : ''}
    ${cps.map((x, i) => { const at = (i + 1) / cps.length * 100, hit = bal >= x.amt; return `<span class="rd-cp${hit ? ' hit' : ''}${i === cps.length - 1 ? ' vault' : ''}" style="left:${at}%"><em>${i === cps.length - 1 ? '🏆' : hit ? '✓' : i + 1}</em></span>`; }).join('')}</div>
    <div class="rd-names">${cps.map((x, i) => `<span class="${bal >= x.amt ? 'hit' : ''}"><b>${esc(x.name)}</b>${dd$(x.amt)}</span>`).join('')}</div>
    ${r ? `<p class="rd-pacetxt ${bal >= pace ? 'up' : 'dn'}">${bal >= pace ? '▲ Ahead of pace' : '▼ Behind pace'}: the plan wants ${dd$(pace)} by now.</p>` : ''}</div>`; }
function runCard(r) { const c = chal(r.cid); if (!c) return ''; const live = r.status === 'live' && r.ends > Date.now(), daysLeft = Math.max(1, Math.ceil((r.ends - Date.now()) / 864e5));
  const chip = live ? `<span class="fchip live">● ${cxLeft(r.ends - Date.now())} left</span>` : { won: `<span class="fchip cashed">🏆 +${dd$(r.paid || c.prize)}</span>`, busted: '<span class="fchip lost">Busted</span>', expired: '<span class="fchip">Time ran out</span>', quit: '<span class="fchip">Quit</span>' }[r.status] || '<span class="fchip">Settling</span>';
  const O = live ? orderFor(r.route, r.bal, r.start) : null, odds2 = live ? simulate(c, r.route, r.bal, daysLeft, 500) : null, R = ROUTES[r.route] || ROUTES[c.route], RU = RULES[c.rule];
  return `<article class="runcard ${r.status}" style="--tc:${c.color}"><div class="rc-h"><div><b>${esc(c.name)}</b><small>${tierChip(c)} ${esc(RU.icon)} ${esc(RU.lab)}${c.sport !== 'any' ? ' · ' + esc(SPORTS[c.sport]) : ''}</small></div>${chip}</div>
    <div class="rc-n"><b>${dd$(r.bal)}</b><span>of ${dd$(r.goal)}</span><em>${r.w || 0}-${r.l || 0}${r.p ? '-' + r.p : ''}${r.open ? ` · ${r.open} open` : ''}</em></div>
    ${roadmap(c, r)}
    ${live ? `<div class="rc-order"><div><small>Today’s order · ${esc(R.icon)} ${esc(R.name)}</small><b>${dd$(O.stake)} on a ${c.rule === 'singles' ? 'single' : (c.rule === 'three' ? Math.max(3, O.k) : c.rule === 'two' ? 2 : O.k) + '-leg ticket'}</b><span>${esc(RU.desc)}${c.sport !== 'any' ? ', ' + esc(SPORTS[c.sport]) + ' only' : ''}</span></div>
      <div class="rc-odds"><b>${Math.round(odds2.p * 100)}%</b><small>finish odds</small></div></div>
      <div class="row"><button type="button" class="btn foil sm" data-act="runuse" data-rid="${esc(r.rid)}">Bet from this run</button><label class="rc-route">Route <select data-change="runroute" data-rid="${esc(r.rid)}">${Object.entries(ROUTES).map(([k, v]) => `<option value="${k}"${k === r.route ? ' selected' : ''}>${v.icon} ${esc(v.name)}</option>`).join('')}</select></label><button type="button" class="btn ghost sm" data-act="runquit" data-rid="${esc(r.rid)}">Quit</button></div>`
      : `<p class="rc-m">${r.status === 'won' ? `Finished in ${cxTook(r.done - r.ts)} · +${r.xp || c.xp} XP` : `${r.bets || 0} bets · peak ${dd$(r.peak || r.start)}`}</p>`}</article>`; }
function chalFiltered() { const F = CX.f, q = (F.q || '').toLowerCase().trim(), by = (CX.board && CX.board.by) || {};
  let L = library().filter(c => (!F.d || c.days === F.d) && (!F.t || c.tier === F.t) && (!F.r || c.rule === F.r) && (!F.s || c.sport === F.s) && (!q || (c.name + ' ' + c.why + ' ' + RULES[c.rule].lab + ' ' + SPORTS[c.sport]).toLowerCase().includes(q)));
  const ti = c => CTIERS.findIndex(t => t.id === c.tier);
  if (F.sort === 'feat') L = L.slice().sort((a, b) => ((a.n * 7919) % 1009) - ((b.n * 7919) % 1009));
  else if (F.sort === 'easy') L = L.slice().sort((a, b) => ti(a) - ti(b) || a.x - b.x); else if (F.sort === 'hard') L = L.slice().sort((a, b) => ti(b) - ti(a) || b.x - a.x); else if (F.sort === 'prize') L = L.slice().sort((a, b) => b.prize - a.prize);
  else if (F.sort === 'pop') L = L.slice().sort((a, b) => ((by[b.id] || {}).live || 0) + ((by[b.id] || {}).tries || 0) - ((by[a.id] || {}).live || 0) - ((by[a.id] || {}).tries || 0));
  return L; }
const dayPick = () => { const L = library(), d = deskDay(); let h = 0; for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return L[h % L.length]; };
function chalCard(c) { const st = ((CX.board && CX.board.by) || {})[c.id], RU = RULES[c.rule], mine = liveRuns().some(r => r.cid === c.id);
  return `<button type="button" class="cc2" style="--tc:${c.color}" data-act="chalopen" data-id="${esc(c.id)}"><span class="cc2-x">${c.x}<small>×</small></span><span class="cc2-b"><b>${esc(c.name)}</b>
    <small>${dd$(c.start)} → ${dd$(c.goal)} · ${c.days} days</small><span class="cc2-tags">${tierChip(c)}<span>${esc(RU.icon)} ${esc(RU.lab)}</span>${c.sport !== 'any' ? `<span>${esc(SPORTS[c.sport])}</span>` : ''}</span>
    <span class="cc2-r"><span class="xp">+${c.xp} XP</span><span class="pz">🏆 ${dd$(c.prize)}</span>${mine ? '<span class="live">● running</span>' : st && (st.live || st.won) ? `<span>${st.live ? st.live + ' running' : ''}${st.live && st.won ? ' · ' : ''}${st.won ? st.won + ' done' : ''}</span>` : ''}</span></span></button>`; }
/* the full sheet for one challenge: why, the road map, the routes with their finish odds, the rules, the prize */
function chalSheet(id) { const c = chal(id); if (!c) return ''; const RU = RULES[c.rule], st = ((CX.board && CX.board.by) || {})[c.id], pick = CX.route && CX.route[0] === id ? CX.route[1] : c.route;
  const sims = Object.keys(ROUTES).map(k => ({ k, ...simulate(c, k, c.start, c.days, 700) })).sort((a, b) => b.p - a.p), best = sims[0].k, days = [];
  for (let d = 1; d <= c.days; d++) if (c.days <= 7 || d === 1 || d % Math.ceil(c.days / 7) === 0 || d === c.days) days.push(d);
  const running = liveRuns().find(r => r.cid === c.id);
  return `<div class="sheet-bg" data-act="chalclose"></div><section class="csheet" role="dialog" aria-label="${esc(c.name)}" style="--tc:${c.color}">
    <button type="button" class="cs-x" data-act="chalclose" aria-label="Close">✕</button>
    <div class="cs-hero"><span class="cs-n">#${c.n} of 1,000</span><h2>${esc(c.name)}</h2><p>${dd$(c.start)} → <b>${dd$(c.goal)}</b> in ${c.days} days</p>
      <div class="cs-tags">${tierChip(c)}<span>${esc(RU.icon)} ${esc(RU.lab)}</span><span>${esc(SPORTS[c.sport])}</span></div>
      <div class="cs-rew"><div><b>+${c.xp}</b><small>XP</small></div><div><b>${dd$(c.prize)}</b><small>prize for finishing</small></div><div><b>×${c.perDay.toFixed(2)}</b><small>a day, on pace</small></div></div></div>
    <h3>Why this one</h3><p class="cs-why">${esc(c.why)}</p>
    <h3>The road map</h3>${roadmap(c, null)}
    <div class="cs-pace"><div class="cs-ph"><span>Day</span><span>Pace</span></div>${days.map(d => `<div><span>Day ${d}</span><span>${dd$(paceAt(c, d))}</span></div>`).join('')}</div>
    <h3>Pick your route</h3><p class="note">Finish odds from 700 simulated runs of each route over ${c.days} days, with legs priced to the rule.</p>
    <div class="cs-routes">${sims.map(s => { const R = ROUTES[s.k]; return `<button type="button" class="csr${s.k === pick ? ' on' : ''}" data-act="chalroute" data-id="${esc(c.id)}" data-route="${s.k}"><span class="csr-i">${R.icon}</span><span class="csr-b"><b>${esc(R.name)}${s.k === c.route ? ' <em>road map</em>' : ''}${s.k === best ? ' <em class="g">best odds</em>' : ''}</b><small>${esc(R.desc)}</small></span><span class="csr-p"><b>${Math.round(s.p * 100)}%</b><small>${Math.round(s.bust * 100)}% bust</small></span></button>`; }).join('')}</div>
    <h3>The rules</h3><ul class="cs-rules"><li>${esc(RU.icon)} <b>${esc(RU.lab)}</b>: ${esc(RU.desc)}.</li>${c.sport !== 'any' ? `<li>🏟 <b>${esc(SPORTS[c.sport])} only.</b></li>` : ''}<li>💵 A fresh ${dd$(c.start)} bankroll just for this run. Your wallet isn’t touched.</li><li>🚩 Every checkpoint you pass pays XP. Hit ${dd$(c.goal)} and you get <b>+${c.xp} XP and ${dd$(c.prize)}</b> in your wallet.</li><li>⏱ ${c.days} days. Under D$1 with nothing open, the run is busted.</li></ul>
    ${st ? `<p class="note">${st.live} running now · ${st.won} of ${st.tries} finished${st.fast ? ` · fastest: <b>${esc(st.fast.name)}</b> in ${cxTook(st.fast.took)}` : ''}</p>` : ''}
    <div class="cs-go">${running ? '<span class="fchip live">● You’re running this one</span>' : `<button type="button" class="btn foil" data-act="chaljoin" data-id="${esc(c.id)}" data-route="${pick}">Start: ${esc(ROUTES[pick].icon)} ${esc(ROUTES[pick].name)} route</button>`}</div></section>`; }
function viewChallenges() {
  const el = $('#v-challenges'), B = CX.board, P = acctPass(), mine = (AC.me && AC.me.runs) || [], live = liveRuns(), done = mine.filter(r => !live.includes(r)).slice(0, 6), F = CX.f, L = chalFiltered(), D = dayPick();
  const chips = (k, opts) => opts.map(([v, l, col]) => `<button type="button" class="${F[k] === v ? 'on' : ''}" data-act="cxf" data-k="${k}" data-v="${v}"${col ? ` style="--tc:${col}"` : ''}>${l}</button>`).join('');
  el.innerHTML = `${compSwitch('challenges')}<h1 class="title">Challenges</h1><p class="lede">1,000 of them. Pick one and get a fresh bankroll just for it. Climb six checkpoints on the road map and beat the clock to win XP and a D$ prize.</p>
    ${P ? playerCard() : signCta('take a challenge')}
    ${live.length ? `<h2 class="h2">Your runs</h2><div class="rgrid">${live.map(runCard).join('')}</div>` : ''}
    <section class="cotd" style="--tc:${D.color}"><small>Challenge of the day</small><b>${esc(D.name)}</b><span>${dd$(D.start)} → ${dd$(D.goal)} · ${D.days} days · ${esc(D.tierName)} · +${D.xp} XP · ${dd$(D.prize)}</span><button type="button" class="btn foil sm" data-act="chalopen" data-id="${esc(D.id)}">See the road map</button></section>
    <h2 class="h2">Find your challenge</h2>
    <div class="cxf"><div class="cxf-row">${chips('d', [[0, 'All'], [3, '3 days'], [7, '7 days'], [14, '14 days'], [30, '30 days']])}</div>
      <div class="cxf-row tiers">${chips('t', [['', 'Every tier'], ...CTIERS.map(t => [t.id, t.name, t.color])])}</div>
      <div class="cxf-sel"><select data-change="cxf" data-k="r" aria-label="Leg rule"><option value="">Every rule</option>${Object.entries(RULES).map(([k, v]) => `<option value="${k}"${F.r === k ? ' selected' : ''}>${v.icon} ${esc(v.lab)}</option>`).join('')}</select>
        <select data-change="cxf" data-k="s" aria-label="Sport"><option value="">Every sport</option>${Object.entries(SPORTS).map(([k, v]) => `<option value="${k}"${F.s === k ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>
        <select data-change="cxf" data-k="sort" aria-label="Sort">${[['feat', 'Featured'], ['easy', 'Easiest first'], ['hard', 'Hardest first'], ['prize', 'Biggest prize'], ['pop', 'Most played']].map(([k, v]) => `<option value="${k}"${F.sort === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
      <input class="cxf-q" type="search" placeholder="Search: heist, puck, dogs, moonshot…" value="${esc(F.q || '')}" data-input="cxq" aria-label="Search challenges"></div>
    <p class="cx-count"><b>${L.length.toLocaleString('en-US')}</b> of 1,000</p>
    <div class="cxgrid">${L.slice(0, CX.show).map(chalCard).join('') || '<div class="paper blank"><b>Nothing matches</b><p>Loosen a filter.</p></div>'}</div>
    ${L.length > CX.show ? `<div class="row" style="justify-content:center"><button type="button" class="btn line" data-act="cxmore">Show more (${(L.length - CX.show).toLocaleString('en-US')} left)</button></div>` : ''}
    ${B && B.leaders.length ? `<h2 class="h2">Closest to the vault</h2><div class="paper lead-l">${B.leaders.map((r, i) => `<div class="ll"><span class="n">${i + 1}</span><span class="w"><b>${esc(r.name)}</b><small>${esc(CHN(r.cid))} · ${cxLeft(r.ends - Date.now())} left</small></span><span class="bar"><i style="width:${Math.max(2, r.pct)}%"></i></span><span class="v">${dd$(r.bal)}<small>of ${dd$(r.goal)}</small></span></div>`).join('')}</div>` : ''}
    ${B && B.recent.length ? `<h2 class="h2">Just finished</h2><div class="paper lead-l fin">${B.recent.slice(0, 10).map(x => `<div class="ll"><span class="n">${x.status === 'won' ? '🏆' : '✗'}</span><span class="w"><b>${esc(x.name)}</b><small>${esc(x.cname || CHN(x.cid))}</small></span><span class="v v-${x.status}">${x.status === 'won' ? `+${dd$(x.prize || 0)} · ${cxTook(x.took)}` : x.status === 'busted' ? 'busted' : 'time ran out'}</span></div>`).join('')}</div>` : ''}
    ${B && B.xp.length ? `<h2 class="h2">The XP board</h2><div class="psheet lb xpb"><div class="ps-h"><span>#</span><span>Player</span><span>XP</span><span>Done</span></div>${B.xp.map((u, i) => `<div class="ps-r${P && P.name === u.name ? ' on' : ''}"><span>${i + 1}</span><span><b>${esc(u.name)}</b><small>${esc(u.rank)}</small></span><span class="ps-s">${u.xp.toLocaleString('en-US')}</span><span>${u.won}</span></div>`).join('')}</div>` : ''}
    ${done.length ? `<h2 class="h2">Your past runs</h2><div class="rgrid">${done.map(runCard).join('')}</div>` : ''}
    <p class="note">Desk Dollars are play money. Prizes are paid in D$ to your wallet, never in cash. Starting a run costs nothing, and you can have three going at once.</p>${footHtml()}<div id="cxSheet">${CX.open ? chalSheet(CX.open) : ''}</div>`;
  chalLoad(); }
/* ── leagues ── */
const lgWhen = g => { const now = Date.now(); return g.status === 'open' ? `Starts in ${cxLeft(g.starts - now)}` : g.status === 'live' ? `${cxLeft(g.ends - now)} left` : g.status === 'settling' ? 'Settling the last bets' : `Final · ${monthDay(new Date(g.ends).toISOString().slice(0, 10))}`; };
const lgDates = g => `${monthDay(new Date(g.starts).toISOString().slice(0, 10))} – ${monthDay(new Date(g.ends).toISOString().slice(0, 10))}`;
const medal = i => ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;
function lgCard(g) { const mine = ((AC.me && AC.me.leagues) || []).find(x => x.lid === g.lid), canJoin = !mine && (g.status === 'open' || (g.status === 'live' && g.late)) && g.n < g.max, open = LGX.open === g.lid, D = LGX.one[g.lid];
  return `<article class="lgc ${g.status}${open ? ' open' : ''}"><div class="lgc-top"><span class="lgc-st">${{ open: 'Open · join now', live: '● Live', settling: 'Settling', final: 'Final' }[g.status]}</span>${g.official ? '<span class="lgc-off">Official</span>' : ''}</div>
    <h3>${esc(g.name)}</h3>${g.blurb ? `<p class="lgc-bl">${esc(g.blurb)}</p>` : ''}
    <div class="lgc-pool"><div><small>Prize pool</small><b>${dd$(g.pool)}</b></div><div class="lgc-pz">${g.prizes.slice(0, 3).map((p, i) => `<span>${medal(i)} ${dd$(p)}</span>`).join('')}${g.prizes.length > 3 ? `<span>+${g.prizes.length - 3} more</span>` : ''}</div></div>
    <div class="lgc-meta"><span><b>${lgDates(g)}</b>${esc(lgWhen(g))}</span><span><b>${dd$(g.bank)}</b>bankroll each</span><span><b>${g.n}${g.max < 5000 ? '/' + g.max : ''}</b>players</span><span><b>${g.sports ? g.sports.map(x => LEAGUE[x] || x).join(' · ') : 'Every sport'}</b>${g.late ? 'late joins OK' : 'no late joins'}</span></div>
    ${g.top && g.top.length ? `<div class="lgc-top3">${g.top.map((t, i) => `<span>${medal(i)} <b>${esc(t.name)}</b> ${dd$(t.bal)}</span>`).join('')}</div>` : ''}
    ${mine ? `<div class="lgc-me"><span>You: <b>${dd$(mine.bal)}</b> <small>${mine.bal >= mine.start ? '+' : '−'}${dd$(Math.abs(mine.bal - mine.start))}${mine.open ? ` · ${mine.open} open` : ''}</small></span>${g.status === 'live' ? `<button type="button" class="btn foil sm" data-act="lguse" data-lid="${esc(g.lid)}">Bet from this league</button>` : ''}</div>` : ''}
    <div class="row">${canJoin ? `<button type="button" class="btn foil sm" data-act="lgjoin" data-lid="${esc(g.lid)}">Join · get ${dd$(g.bank)}</button>` : ''}<button type="button" class="btn line sm" data-act="lgopen" data-lid="${esc(g.lid)}">${open ? 'Hide standings' : 'Standings'}</button>${AC.me && AC.me.owner && g.status === 'open' ? `<button type="button" class="btn ghost sm" data-act="lgcancel" data-lid="${esc(g.lid)}">Cancel</button>` : ''}</div>
    ${open ? (D ? lgTable(D) : '<div class="shimmer"></div>') : ''}</article>`; }
function lgTable(D) { const G = D.league, R = D.rows || [], me = acctPass() && acctPass().name, fin = G.status === 'final';
  if (!R.length) return `<p class="note">No players yet. Be the first in.</p>`;
  const pod = fin && R.length ? `<div class="podium">${[1, 0, 2].filter(i => R[i]).map(i => `<div class="pd p${i + 1}"><span>${medal(i)}</span><b>${esc(R[i].name)}</b><em>${dd$(R[i].bal)}</em>${R[i].prize ? `<small>+${dd$(R[i].prize)}</small>` : ''}<i></i></div>`).join('')}</div>` : '';
  return pod + `<div class="psheet lb lgt"><div class="ps-h"><span>#</span><span>Player</span><span>Bankroll</span><span>Record</span></div>${R.map((r, i) => { const roi = (r.bal - r.start) / r.start * 100, pz = G.prizes[i];
    return `<div class="ps-r${me === r.name ? ' on' : ''}"><span>${i < 3 ? medal(i) : i + 1}</span><span><b>${esc(r.name)}</b><small>${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%${r.open ? ` · ${r.open} open` : ''}${pz ? ` · ${fin ? 'won' : 'in line for'} ${dd$(pz)}` : ''}</small></span><span class="ps-s ${roi > 0 ? 'up' : roi < 0 ? 'dn' : ''}">${dd$(r.bal)}</span><span>${r.w}-${r.l}${r.p ? '-' + r.p : ''}</span></div>`; }).join('')}</div>`; }
function lgForm() { const now = new Date(), iso = d => new Date(d - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16), s0 = new Date(now.getTime() + 864e5), e0 = new Date(now.getTime() + 8 * 864e5);
  return `<details class="paper lgnew"><summary>👑 Open a league</summary><form data-form="lgsnew"><label>Name<input name="name" required minlength="3" maxlength="40" placeholder="Thanksgiving Week Classic"></label>
    <label>One-line pitch<input name="blurb" maxlength="160" placeholder="Turkey, football and D$5,000 for the top bankroll."></label>
    <div class="row2"><label>Starts<input name="starts" type="datetime-local" required value="${iso(s0)}"></label><label>Ends<input name="ends" type="datetime-local" required value="${iso(e0)}"></label></div>
    <div class="row2"><label>Bankroll each (D$)<input name="bank" inputmode="numeric" value="1000"></label><label>Max players<input name="max" inputmode="numeric" value="500"></label></div>
    <label>Prizes in D$, 1st to last (comma separated)<input name="prizes" required value="5000, 2500, 1000"></label>
    <fieldset class="lgsp"><legend>Sports (none checked = every sport)</legend>${Object.entries(LEAGUE).map(([k, v]) => `<label><input type="checkbox" name="sp" value="${k}"> ${esc(v)}</label>`).join('')}</fieldset>
    <label class="chk"><input type="checkbox" name="late" checked> Let people join after it starts</label><button class="btn foil" type="submit">Open it</button></form>
    <p class="note">Prizes are D$ paid automatically when the league ends and its bets settle. Only players with at least one bet are ranked.</p></details>`; }
function viewLeagues() {
  const el = $('#v-leagues'), P = acctPass(), D = LGX.list, LS2 = (D && D.leagues) || [], grp = st => LS2.filter(g => (Array.isArray(st) ? st : [st]).includes(g.status));
  const sec = (h, a, note) => a.length ? `<h2 class="h2">${h}</h2>${note ? `<p class="note">${note}</p>` : ''}<div class="lggrid">${a.map(lgCard).join('')}</div>` : '';
  const hall = grp('final').filter(g => g.top && g.top[0]);
  el.innerHTML = `${compSwitch('leagues')}<h1 class="title">Leagues</h1><p class="lede">The desk runs the leagues. Each one opens with its own dates, its own bankroll for every player and a real D$ prize pool. Top bankroll at the final whistle takes the crown.</p>
    ${P ? '' : signCta('play in the desk’s leagues')}${AC.me && AC.me.lgOpen ? lgForm() : ''}
    ${!D ? '<div class="shimmer"></div>' : LS2.length ? sec('Live now', grp(['live', 'settling'])) + sec('Open for sign-ups', grp('open'), 'Join before it starts and you’re in from the first game.') + sec('Final', grp('final').slice(0, 6))
      : `<div class="lgsoon"><span>🏟</span><b>The first league opens soon</b><p>The desk is setting up the first season: its dates, a bankroll for every player and a D$ prize pool. When it opens you’ll see it here, and in the lounge.</p></div>`}
    ${hall.length ? `<h2 class="h2">Hall of champions</h2><div class="paper lead-l">${hall.slice(0, 10).map(g => `<div class="ll"><span class="n">👑</span><span class="w"><b>${esc(g.top[0].name)}</b><small>${esc(g.name)}</small></span><span class="v v-won">${g.top[0].prize ? '+' + dd$(g.top[0].prize) : dd$(g.top[0].bal)}</span></div>`).join('')}</div>` : ''}
    <p class="note">Desk Dollars are play money. League prizes are paid in D$ to your wallet, never in cash. ${D && !D.open ? 'Leagues are run by the desk for now. Member-run leagues come next.' : ''}</p>${footHtml()}`;
  lgsLoad(); if (LGX.open && !LGX.one[LGX.open]) lgOneLoad(LGX.open); }
const confirmQuit = b => { if (b.dataset.sure === '1') return true; b.dataset.sure = '1'; b.textContent = 'Tap again to quit'; return false; };
/* ── The owner's dashboard (v3.1.1, Chris, Nov 15: "an admin dashboard … stats on users and names and balances … a subscriber
   inbox … how can I moderate without a moderate dashboard"). Owner only: the server refuses everyone else. */
const AD = { tab: store.get('adtab') || 'overview', st: null, at: 0, sel: '', user: null, inbox: null, thread: null, chat: null, q: '', sort: 'seen', busy: false };
const ago = t => { if (!t) return 'never'; const s = (Date.now() - t) / 1000; return s < 90 ? 'just now' : s < 3600 ? Math.round(s / 60) + 'm ago' : s < 86400 ? Math.round(s / 3600) + 'h ago' : Math.round(s / 86400) + 'd ago'; };
async function adApi(act, extra) { const P = acctPass(); return acctApi('/acct/admin', { token: P && P.token, act, ...(extra || {}) }); }
async function adLoad(force) { if (AD.busy || (!force && AD.st && Date.now() - AD.at < 20e3)) return; AD.busy = true; try { AD.st = await adApi('stats'); AD.at = Date.now(); } catch (e) { AD.err = e.message; } AD.busy = false; if (S.tab === 'admin') viewAdmin(); }
const adTile = (v, l, sub, cls) => `<div class="adt ${cls || ''}"><b>${v}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
function adOverview(St) { const K = St.k, D = St.days, mx = Math.max(1, ...D.map(x => Math.max(x.n, x.act)));
  const top = St.users.filter(u => !u.owner).slice().sort((a, b) => b.bal - a.bal).slice(0, 5);
  return `<div class="adgrid">${adTile(K.members.toLocaleString('en-US'), 'Members', `+${K.new1} today · +${K.new7} this week`, 'gold')}${adTile(K.act1, 'Active today', `${K.act7} this week`)}
    ${adTile(K.paid == null ? '—' : K.paid, 'Paid subscribers', 'Whop isn’t connected yet', 'dim')}${adTile(`<span class="${K.unread ? 'hot' : ''}">${K.unread}</span>`, 'Unread messages', `${K.threads} threads`, K.unread ? 'alert' : '')}
    ${adTile(dd$(K.dd), 'D$ in wallets', `${dd$(K.prizes)} paid in prizes`)}${adTile(dd$(K.bought), 'D$ bought / added', 'store off')}
    ${adTile(K.open, 'Open bets', `${K.settled} settled · ${dd$(K.staked)} staked`)}${adTile(K.runs, 'Challenge runs live', `${K.runsWon} finished`)}
    ${adTile(K.lgLive, 'Leagues live', `${K.lgAll} total`)}${adTile(K.chatDay == null ? '—' : K.chatDay, 'Chat messages today', K.chatTotal == null ? 'chat unreachable' : `${K.chatTotal} kept · ${K.bans} banned`)}
    ${adTile(K.sus, 'Suspended', '', K.sus ? 'alert' : 'dim')}</div>
    <h3 class="adh">Last 14 days</h3><div class="adchart">${D.map(x => `<div title="${x.d}: ${x.n} sign-ups, ${x.act} active"><span class="a" style="height:${(x.act / mx) * 100}%"></span><span class="n" style="height:${(x.n / mx) * 100}%"></span><em>${x.d.slice(8)}</em></div>`).join('')}</div>
    <p class="adkey"><i class="n"></i>Sign-ups <i class="a"></i>Active (last seen that day)</p>
    <h3 class="adh">Biggest bankrolls</h3><div class="adlist">${top.map((u, i) => `<button type="button" data-act="aduser" data-name="${esc(u.name)}"><span>${i + 1}</span><b>${esc(u.name)}</b><em>${dd$(u.bal)}</em></button>`).join('') || '<p class="note">No members yet.</p>'}</div>`; }
function adMembers(St) { const q = AD.q.toLowerCase(); let U = St.users.filter(u => !q || u.name.toLowerCase().includes(q));
  const key = { seen: u => -u.seen, new: u => -u.at, bal: u => -u.bal, xp: u => -u.xp, name: u => u.name.toLowerCase() }[AD.sort]; U = U.slice().sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  return `<div class="adbar"><input type="search" placeholder="Search members" value="${esc(AD.q)}" data-input="adq" aria-label="Search members"><select data-change="adsort" aria-label="Sort">${[['seen', 'Last seen'], ['new', 'Newest'], ['bal', 'Balance'], ['xp', 'XP'], ['name', 'Name']].map(([k, v]) => `<option value="${k}"${AD.sort === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
    <p class="note">${U.length} of ${St.users.length}</p><div class="adtable"><div class="adtr h"><span>Member</span><span>Balance</span><span>Record</span><span>Seen</span></div>
    ${U.map(u => `<button type="button" class="adtr${u.sus ? ' sus' : ''}${AD.sel === u.name ? ' on' : ''}" data-act="aduser" data-name="${esc(u.name)}"><span><b>${esc(u.name)}</b>${u.owner ? ' <em class="own">owner</em>' : ''}${u.sus ? ' <em class="sus">suspended</em>' : ''}<small>${esc(u.rank)} · ${u.xp} XP · joined ${ago(u.at)}${u.note ? ' · 📝' : ''}</small></span>
      <span>${dd$(u.bal)}${u.prize ? `<small>+${dd$(u.prize)} prizes</small>` : ''}${u.bought ? `<small class="b">+${dd$(u.bought)} added</small>` : ''}</span><span>${u.w}-${u.l}<small>${u.runs ? u.runs + ' runs · ' : ''}${u.lgs ? u.lgs + ' lgs' : ''}</small></span><span>${ago(u.seen)}<small>${u.visits} visits</small></span></button>`).join('')}</div>`; }
function adUserPanel() { const D = AD.user; if (!AD.sel) return ''; if (!D) return '<div class="adpanel"><div class="shimmer"></div></div>'; const u = D.user, w = u.wallet;
  return `<div class="sheet-bg" data-act="adclose"></div><section class="adpanel" role="dialog" aria-label="${esc(u.name)}"><button type="button" class="cs-x" data-act="adclose" aria-label="Close">✕</button>
    <h2>${esc(u.name)} ${u.sus ? '<em class="sus">suspended</em>' : ''}</h2><p class="note">Joined ${new Date(u.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · last seen ${ago(u.seen)} · ${u.visits} visits · ${u.sessions} signed-in device${u.sessions === 1 ? '' : 's'}</p>
    <div class="adgrid sm">${adTile(dd$(w.bal), 'Balance')}${adTile(`${w.w}-${w.l}${w.p ? '-' + w.p : ''}`, 'Record')}${adTile(u.xp, u.rank.name + ' · XP')}${adTile(dd$(w.prize || 0), 'Prizes')}${adTile(dd$(w.bought || 0), 'Added')}${adTile(dd$(w.staked || 0), 'Staked')}</div>
    <h3 class="adh">Actions</h3>
    <form class="adact" data-form="admoney"><input name="amt" inputmode="decimal" placeholder="D$ amount" required><select name="kind"><option value="prize">Give as a prize (earned)</option><option value="bought">Add (counts as bought)</option><option value="take">Take away</option></select><button class="btn sm" type="submit">Apply</button></form>
    <form class="adact" data-form="adxp"><input name="amt" inputmode="numeric" placeholder="XP (use − to remove)" required><button class="btn sm" type="submit">Give XP</button></form>
    <form class="adact" data-form="adnote"><input name="note" maxlength="300" placeholder="Private note (only you see it)" value="${esc(u.note)}"><button class="btn ghost sm" type="submit">Save note</button></form>
    <div class="row">${u.owner ? '' : u.sus ? `<button type="button" class="btn sm" data-act="adsus" data-v="0">Unsuspend</button>` : `<button type="button" class="btn ghost sm warn" data-act="adsus" data-v="1">Suspend</button>`}<button type="button" class="btn ghost sm" data-act="adsignout">Sign out everywhere</button><button type="button" class="btn ghost sm" data-act="admsg">Message</button>${u.owner ? '' : '<button type="button" class="btn ghost sm warn" data-act="addel">Delete account</button>'}</div>
    ${D.runs.length ? `<h3 class="adh">Challenge runs</h3><div class="adlist">${D.runs.slice(0, 8).map(r => `<p><b>${esc(CHN(r.cid))}</b><span>${r.status} · ${dd$(r.bal)} of ${dd$(r.goal)}</span></p>`).join('')}</div>` : ''}
    ${D.leagues.length ? `<h3 class="adh">Leagues</h3><div class="adlist">${D.leagues.map(g => `<p><b>${esc(g.name)}</b><span>${g.status} · ${dd$(g.bal)} · ${g.w}-${g.l}</span></p>`).join('')}</div>` : ''}
    ${D.bets.length ? `<h3 class="adh">Recent bets</h3><div class="adlist">${D.bets.slice(0, 12).map(x => `<p><b>${dd$(x.stake)} · ${x.legs.map(l => esc(l.pick)).join(' + ')}</b><span>${x.status}${x.run ? ' · challenge' : x.lg ? ' · league' : ''}</span></p>`).join('')}</div>` : ''}
    ${u.xplog.length ? `<h3 class="adh">XP and prize log</h3><div class="adlist">${u.xplog.slice(0, 10).map(x => `<p><b>${esc(x.why)}</b><span>${x.xp ? (x.xp > 0 ? '+' : '') + x.xp + ' XP ' : ''}${x.dd ? (x.dd > 0 ? '+' : '') + dd$(x.dd) : ''}</span></p>`).join('')}</div>` : ''}</section>`; }
const adMsgs = (M, mine) => `<div class="admsgs">${M.map(m => `<div class="adm ${m.from === 'desk' ? 'desk' : 'them'}"><p>${esc(m.text)}</p><small>${mine ? (m.from === 'desk' ? (m.all ? 'The desk · to everyone' : 'The desk') : 'You') : m.from === 'desk' ? (m.all ? 'You · to everyone' : 'You') : 'Them'} · ${ago(m.t)}</small></div>`).join('') || '<p class="note">No messages yet. Say hi.</p>'}</div>`;
function adInbox() { const I = AD.inbox; if (!I) { adApi('inbox').then(j => { AD.inbox = j; viewAdmin(); }).catch(e => toast(e.message)); return '<div class="shimmer"></div>'; }
  if (AD.thread) { const T = AD.thread; return `<button type="button" class="link back" data-act="adthreadx">← All messages</button><h3 class="adh">${esc(T.name)}</h3>${adMsgs(T.msgs)}<form class="adreply" data-form="adreply"><textarea name="text" rows="3" maxlength="2000" required placeholder="Reply to ${esc(T.name)}…"></textarea><button class="btn foil sm" type="submit">Send reply</button></form>`; }
  return `<details class="paper adbc"><summary>📣 Message every member</summary><form data-form="adbcast"><textarea name="text" rows="3" maxlength="2000" required placeholder="Leagues open Friday at noon…"></textarea><button class="btn sm" type="submit">Send to everyone</button></form><p class="note">It lands in every member’s inbox on the app.</p></details>
    <div class="adthreads">${I.threads.map(t => `<button type="button" class="${t.unread ? 'unread' : ''}" data-act="adthread" data-name="${esc(t.name)}"><b>${esc(t.name)}${t.unread ? ` <em>${t.unread}</em>` : ''}</b><span>${t.from === 'desk' ? 'You: ' : ''}${esc(t.preview.slice(0, 90))}</span><small>${ago(t.last)}</small></button>`).join('') || '<div class="paper blank"><b>Inbox zero</b><p>When members write the desk from the app, it lands here.</p></div>'}</div>`; }
function adChat() { const C = AD.chat; if (!C) { adApi('chat').then(j => { AD.chat = j; viewAdmin(); }).catch(e => toast(e.message)); return '<div class="shimmer"></div>'; }
  return `<div class="row"><button type="button" class="btn sm" data-act="adinvite">New invite code</button><button type="button" class="btn ghost sm" data-act="adchatr">Refresh</button></div>
    ${C.invites && C.invites.length ? `<h3 class="adh">Invite codes</h3><div class="adlist">${C.invites.map(i => `<p><b>${esc(i.code)}</b><span>${i.used}/${i.uses} used <button type="button" class="link" data-act="aduninv" data-code="${esc(i.code)}">remove</button></span></p>`).join('')}</div>` : ''}
    ${(C.mutes || []).length || (C.bans || []).length ? `<h3 class="adh">Muted and banned</h3><div class="adlist">${C.mutes.map(m => `<p><b>${esc(m.name)}</b><span>muted ${cxLeft(m.until - Date.now())} <button type="button" class="link" data-act="adunban" data-name="${esc(m.name)}">lift</button></span></p>`).join('')}${C.bans.map(n => `<p><b>${esc(n)}</b><span>banned <button type="button" class="link" data-act="adunban" data-name="${esc(n)}">unban</button></span></p>`).join('')}</div>` : ''}
    <h3 class="adh">Latest messages</h3><div class="adchat">${C.messages.slice().reverse().map(m => `<div class="adcm"><p><b>${esc(m.name)}</b> ${esc(m.text)}</p><small>${ago(m.ts || m.t)}</small>${m.name === 'TheDesk' ? '' : `<span><button type="button" data-act="adcdel" data-id="${esc(m.id)}">Delete</button><button type="button" data-act="adcmute" data-name="${esc(m.name)}" data-mins="60">Mute 1h</button><button type="button" data-act="adcmute" data-name="${esc(m.name)}" data-mins="1440">24h</button><button type="button" class="warn" data-act="adcban" data-name="${esc(m.name)}">Ban</button></span>`}</div>`).join('') || '<p class="note">Quiet in there.</p>'}</div>`; }
function adSettings(St) { const C = St.cfg;
  return `<div class="adset"><div><b>Members can open their own leagues</b><p>Off: only you open leagues. On: members can open free leagues (no D$ prizes, only you put those up).</p></div><button type="button" class="adsw${C.lgOpen || C.envOpen ? ' on' : ''}" data-act="adlgopen" aria-pressed="${C.lgOpen || C.envOpen}"><i></i></button></div>
    <div class="adset"><div><b>D$ store</b><p>${C.store ? 'On.' : 'Off, until a lawyer signs off. Bought D$ can only be added by you from a member’s page.'}</p></div><span class="fchip">${C.store ? 'On' : 'Off'}</span></div>
    <div class="adset"><div><b>Open a league</b><p>The league form lives on the Leagues tab.</p></div><button type="button" class="btn sm" data-go="leagues">Go</button></div>`; }
function viewAdmin() { const el = $('#v-admin'), M = AC.me;
  if (!M || !M.owner) { el.innerHTML = `<h1 class="title">Admin</h1><p class="lede">This page is for the desk only.</p>${acctPass() ? '' : '<div class="row"><button type="button" class="btn" data-go="me">Sign in</button></div>'}${footHtml()}`; return; }
  const St = AD.st, tabs = [['overview', 'Overview'], ['members', 'Members'], ['inbox', `Inbox${St && St.k.unread ? ` (${St.k.unread})` : ''}`], ['chat', 'Chat'], ['settings', 'Settings']];
  el.innerHTML = `<div class="adhead"><h1 class="title">Admin</h1><button type="button" class="btn line sm" data-act="adrefresh">↻ Refresh</button></div><div class="adtabs">${tabs.map(([k, l]) => `<button type="button" class="${AD.tab === k ? 'on' : ''}" data-act="adtab" data-v="${k}">${l}</button>`).join('')}</div>
    ${!St ? (AD.err ? `<p class="chat-err">${esc(AD.err)}</p>` : '<div class="shimmer"></div>') : AD.tab === 'overview' ? adOverview(St) : AD.tab === 'members' ? adMembers(St) : AD.tab === 'inbox' ? adInbox() : AD.tab === 'chat' ? adChat() : adSettings(St)}
    <div id="adPanel">${adUserPanel()}</div>${footHtml()}`;
  adLoad(); }
async function adOpenUser(name) { AD.sel = name; AD.user = null; document.body.classList.add('sheet-on'); viewAdmin(); try { AD.user = await adApi('user', { name }); } catch (e) { toast(e.message); AD.sel = ''; document.body.classList.remove('sheet-on'); } viewAdmin(); }
/* the member's side of the inbox: on Your tickets */
function myInbox() { const I = AC.me && AC.me.inbox; if (!I || (AC.me && AC.me.owner)) return '';
  return `<details class="paper myinbox"${AC.inboxOpen ? ' open' : ''}><summary>✉️ Message the desk${I.unread ? ` <em>${I.unread} new</em>` : ''}</summary>${adMsgs(I.msgs, true)}<form data-form="mymsg"><textarea name="text" rows="3" maxlength="1000" required placeholder="Questions, ideas, problems: the desk reads every one."></textarea><button class="btn sm" type="submit">Send</button></form></details>`; }
const VIEWS = { today: viewToday, slate: viewSlate, props: viewProps, me: viewMe, longshots: viewLongshots, challenges: viewChallenges, leagues: viewLeagues, admin: viewAdmin, cast: viewCast, chat: viewChat, receipts: viewReceipts, join: viewJoin };
function render() { VIEWS[S.tab](); }
function go(tab, push) {
  if (!TABS.includes(tab)) tab = 'today';
  S.tab = tab;
  for (const t of TABS) $('#v-' + t).hidden = t !== tab;
  for (const b of $$('[data-go]')) { if (b.closest('.tabs,.nav-top')) { if (b.dataset.go === tab || (b.dataset.also || '').split(' ').includes(tab)) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); } }
  if (push && location.hash !== '#' + tab) history.pushState(null, '', '#' + tab);
  render(); window.scrollTo(0, 0);
  try { if (TG && TG.BackButton) { if (tab === 'today') TG.BackButton.hide(); else TG.BackButton.show(); } } catch (e) { }
  if (tab === 'slate') { if (!S.slate) loadSlate(); else slateLive(); }
  document.title = { today: 'TheDesk — today’s Best 3, locked before the games', slate: 'The sheet — TheDesk', props: 'Props — TheDesk', me: 'Your tickets — TheDesk', longshots: 'Founder LongShot Parlays — TheDesk', challenges: 'Challenges — TheDesk', leagues: 'Leagues — TheDesk', admin: 'Admin — TheDesk', cast: 'The characters — TheDesk', chat: 'Chat — TheDesk', receipts: 'Every result — TheDesk', join: 'Join — TheDesk' }[tab];
}
document.addEventListener('click', async e => {
  const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go, true); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'guide-close') { if (e.target === a) closeGuide(); return; }
  if (act === 'guide') openGuide(false);
  else if (act === 'guide-done') closeGuide();
  else if (act === 'guide-tab') { S.guide.tab = a.dataset.tab; $('#guideRoot').innerHTML = guideHtml(); }
  else if (act === 'install') { const p = S.canPrompt; if (p) { p.prompt(); try { await p.userChoice; } catch { /* dismissed */ } S.canPrompt = null; closeGuide(); } }
  else if (act === 'copylink') { try { await navigator.clipboard.writeText(CFG.home); toast('Link copied. Paste it in ' + (device().kind === 'iphone' ? 'Safari' : 'Chrome')); } catch { toast(CFG.home); } }
  else if (act === 'share') share();
  else if (act === 'retry') { S.feedErr = false; render(); loadFeed(); }
  else if (act === 'game') { S.openGame = S.openGame === a.dataset.k ? '' : a.dataset.k; render(); }
  else if (act === 'slateday') { S.slateDay = +a.dataset.i; S.openGame = ''; render(); slateLive(); }
  else if (act === 'slatesp') { S.slateSp = a.dataset.sp; render(); }
  else if (act === 'tail') { tailCopy(a.dataset.id); }
  else if (act === 'pf') { S.pf[a.dataset.k] = a.dataset.v; if (a.dataset.k === 'sp') S.pf.stat = 'all'; store.set('pf', S.pf); render(); }
  else if (act === 'psort') { S.pf.sort = a.dataset.v; store.set('pf', S.pf); render(); }
  else if (act === 'pslip') { const id = a.dataset.id; S.slip = S.slip.includes(id) ? S.slip.filter(x => x !== id) : [...S.slip, id].slice(-12); store.set('pslip', S.slip); render(); }
  else if (act === 'pslipclear') { S.slip = []; store.set('pslip', S.slip); render(); }
  else if (act === 'psliptrack') { const t = slipTicket(); if (t && await tkSave(t, 'Tracking it — see Your tickets')) { S.slip = []; store.set('pslip', S.slip); render(); } }
  else if (act === 'ddpick') { const g = slateGameOf(a.dataset.k); if (g) { const mk = a.dataset.mk, sd = a.dataset.side, sgp = S.ddMode === 'sgp', hockey = g.sp === 'nhl';
      const i0 = S.dd.findIndex(l => l.k === g.k && l.mk === mk && l.side === sd);
      if (i0 >= 0) S.dd.splice(i0, 1); else {
        /* what this pick pushes out: the same market; ML ↔ spread; on a hockey parlay the puck line stands alone */
        const clash = l => l.k === g.k && (l.mk === mk || (mk !== 'total' && l.mk !== 'total') || (hockey && !sgp && (mk === 'spread' || l.mk === 'spread')));
        const out = S.dd.filter(clash); S.dd = S.dd.filter(l => !clash(l));
        if (out.length && out.some(l => l.mk !== mk)) toast(hockey && !sgp && (mk === 'spread' || out.some(l => l.mk === 'spread')) ? 'Hockey parlay: moneyline + total, or the puck line alone (switch to SGP for puck line + total)' : 'Swapped it: moneyline or spread, plus the total');
        const L = ddLegOf(g, mk, sd); if (L) S.dd.push({ k: g.k, mk, side: sd, sp: g.sp, ...L }); }
      store.set('ddslip', S.dd); render(); } }
  else if (act === 'chalopen') { CX.open = a.dataset.id; const n = $('#cxSheet'); if (n) { n.innerHTML = chalSheet(CX.open); document.body.classList.add('sheet-on'); } }
  else if (act === 'chalclose') { CX.open = ''; const n = $('#cxSheet'); if (n) n.innerHTML = ''; document.body.classList.remove('sheet-on'); }
  else if (act === 'chalroute') { CX.route = [a.dataset.id, a.dataset.route]; const n = $('#cxSheet'); if (n) { const y = (n.querySelector('.csheet') || {}).scrollTop || 0; n.innerHTML = chalSheet(CX.open); const c2 = n.querySelector('.csheet'); if (c2) c2.scrollTop = y; } }
  else if (act === 'chaljoin') { const P = acctPass(); if (!P) { CX.open = ''; document.body.classList.remove('sheet-on'); go('me', true); toast('Sign in to take a challenge'); return; }
    try { const j = await acctApi('/acct/chal/join', { token: P.token, id: a.dataset.id, route: a.dataset.route }); if (AC.me) AC.me.runs = [j.run, ...(AC.me.runs || [])]; S.ddFrom = 'run:' + j.run.rid; store.set('ddfrom', S.ddFrom); CX.open = ''; document.body.classList.remove('sheet-on'); CX.at = 0; viewChallenges(); window.scrollTo(0, 0); toast(`${CHN(j.run.cid)} is live: ${dd$(j.run.start)} → ${dd$(j.run.goal)}. Your slip now bets from it.`); } catch (e) { toast(e.message); } }
  else if (act === 'runuse') { S.ddFrom = 'run:' + a.dataset.rid; store.set('ddfrom', S.ddFrom); go('slate', true); toast('Tap any line on the Slate: the slip bets from this run'); }
  else if (act === 'runquit') { const P = acctPass(); if (!P || !confirmQuit(a)) return; try { const j = await acctApi('/acct/chal/quit', { token: P.token, rid: a.dataset.rid }); if (AC.me) AC.me.runs = (AC.me.runs || []).map(r => (r.rid === j.run.rid ? j.run : r)); CX.at = 0; viewChallenges(); } catch (e) { toast(e.message); } }
  else if (act === 'cxf') { const k = a.dataset.k; CX.f[k] = k === 'd' ? +a.dataset.v : a.dataset.v; CX.show = 24; store.set('cxf', CX.f); viewChallenges(); }
  else if (act === 'cxmore') { CX.show += 48; viewChallenges(); }
  else if (act === 'lgopen') { LGX.open = LGX.open === a.dataset.lid ? '' : a.dataset.lid; if (LGX.open) lgOneLoad(LGX.open); viewLeagues(); }
  else if (act === 'lgjoin') { const P = acctPass(); if (!P) { go('me', true); toast('Sign in to join a league'); return; }
    try { const j = await acctApi('/acct/lgs/join', { token: P.token, id: a.dataset.lid }); await acctLoad(); LGX.at = 0; delete LGX.one[a.dataset.lid]; lgsLoad(true); toast(`You’re in ${j.league.name}: ${dd$(j.entry.bal)} to play with`); } catch (e) { toast(e.message); } }
  else if (act === 'lguse') { S.ddFrom = 'lg:' + a.dataset.lid; store.set('ddfrom', S.ddFrom); go('slate', true); toast('Tap any line on the Slate: the slip bets from your league bankroll'); }
  else if (act === 'lgcancel') { const P = acctPass(); if (!P || !confirmQuit(a)) return; try { await acctApi('/acct/lgs/cancel', { token: P.token, id: a.dataset.lid }); lgsLoad(true); toast('League cancelled'); } catch (e) { toast(e.message); } }
  else if (act === 'adtab') { AD.tab = a.dataset.v; store.set('adtab', AD.tab); AD.thread = null; if (AD.tab === 'inbox') AD.inbox = null; if (AD.tab === 'chat') AD.chat = null; viewAdmin(); }
  else if (act === 'adrefresh') { AD.inbox = null; AD.chat = null; AD.thread = null; await adLoad(true); toast('Refreshed'); }
  else if (act === 'aduser') adOpenUser(a.dataset.name);
  else if (act === 'adclose') { AD.sel = ''; AD.user = null; document.body.classList.remove('sheet-on'); viewAdmin(); }
  else if (act === 'adsus') { if (a.dataset.v === '1' && !confirmQuit(a)) return; try { await adApi(a.dataset.v === '1' ? 'suspend' : 'unsuspend', { name: AD.sel }); toast(a.dataset.v === '1' ? 'Suspended, signed out and banned from the chat' : 'Unsuspended'); AD.user = await adApi('user', { name: AD.sel }); adLoad(true); } catch (e) { toast(e.message); } }
  else if (act === 'adsignout') { try { const j = await adApi('signout', { name: AD.sel }); toast(`Signed out of ${j.n} device${j.n === 1 ? '' : 's'}`); } catch (e) { toast(e.message); } }
  else if (act === 'addel') { if (!confirmQuit(a)) return; try { await adApi('delete', { name: AD.sel }); toast('Account deleted'); AD.sel = ''; AD.user = null; document.body.classList.remove('sheet-on'); adLoad(true); } catch (e) { toast(e.message); } }
  else if (act === 'admsg') { const n = AD.sel; AD.sel = ''; AD.user = null; document.body.classList.remove('sheet-on'); AD.tab = 'inbox'; try { AD.thread = (await adApi('thread', { name: n })).thread; AD.inbox = AD.inbox || { threads: [] }; } catch (e) { toast(e.message); } viewAdmin(); }
  else if (act === 'adthread') { try { AD.thread = (await adApi('thread', { name: a.dataset.name })).thread; viewAdmin(); adLoad(true); } catch (e) { toast(e.message); } }
  else if (act === 'adthreadx') { AD.thread = null; AD.inbox = null; viewAdmin(); }
  else if (act === 'adchatr') { AD.chat = null; viewAdmin(); }
  else if (act === 'adinvite') { try { const j = await adApi('chat', { sub: 'invite', uses: 25 }); copyText(j.code, `Invite ${j.code} copied (25 uses)`); AD.chat = null; viewAdmin(); } catch (e) { toast(e.message); } }
  else if (act === 'aduninv') { try { await adApi('chat', { sub: 'uninvite', code: a.dataset.code }); AD.chat = null; viewAdmin(); } catch (e) { toast(e.message); } }
  else if (act === 'adcdel') { try { await adApi('chat', { sub: 'del', id: a.dataset.id }); AD.chat = null; viewAdmin(); toast('Deleted'); } catch (e) { toast(e.message); } }
  else if (act === 'adcmute') { try { await adApi('chat', { sub: 'mute', name: a.dataset.name, mins: +a.dataset.mins }); AD.chat = null; viewAdmin(); toast(`${a.dataset.name} muted`); } catch (e) { toast(e.message); } }
  else if (act === 'adcban') { if (!confirmQuit(a)) return; try { await adApi('chat', { sub: 'ban', name: a.dataset.name }); AD.chat = null; viewAdmin(); toast(`${a.dataset.name} banned from the chat`); } catch (e) { toast(e.message); } }
  else if (act === 'adunban') { try { await adApi('chat', { sub: 'unban', name: a.dataset.name }); AD.chat = null; viewAdmin(); } catch (e) { toast(e.message); } }
  else if (act === 'adlgopen') { try { const on = a.getAttribute('aria-pressed') !== 'true'; await adApi('cfg', { lgOpen: on }); toast(on ? 'Members can now open leagues' : 'Only the desk opens leagues'); adLoad(true); } catch (e) { toast(e.message); } }
  else if (act === 'ddmode') { S.ddMode = a.dataset.v; store.set('ddmode', S.ddMode); render(); }
  else if (act === 'ddclear') { S.dd = []; store.set('ddslip', S.dd); render(); }
  else if (act === 'ddplace') { const P = acctPass(); if (!P) { AC.open = false; go('me', true); toast('Sign in to get your D$1,000'); return; }
    const st = +(($('#ddStake') || {}).value || 0); try { const fk = fromKey(), run = fk.startsWith('run:') ? fk.slice(4) : undefined, league = fk.startsWith('lg:') ? fk.slice(3) : undefined; const j = await acctApi('/acct/bet', { token: P.token, stake: st, mode: S.ddMode, run, league, legs: S.dd.map(l => ({ k: l.k, mk: l.mk, side: l.side })) });
      if (AC.me) { AC.me.wallet = j.wallet; AC.me.bets = [j.bet, ...(AC.me.bets || [])]; if (j.run) AC.me.runs = (AC.me.runs || []).map(r => (r.rid === j.run.rid ? j.run : r)); if (j.entry) AC.me.leagues = (AC.me.leagues || []).map(g => (g.lid === j.entry.lid ? { ...g, bal: j.entry.bal, open: j.entry.open } : g)); } CX.at = 0; LGX.at = 0; LGX.one = {}; S.dd = []; store.set('ddslip', S.dd); store.set('ddstake', st); render(); toast(`Placed${j.bet.mode === 'sgp' ? ' (SGP)' : ''}: ${dd$(j.bet.stake)} to win ${dd$(j.bet.toWin)}`); LB = null; } catch (e) { toast(e.message); } }
  else if (act === 'acmode') { AC.mode = a.dataset.v; viewMe(); }
  else if (act === 'aclogout') { const P = acctPass(); store.set('acct', null); AC.me = null; acctBadge(); viewMe(); if (P) acctApi('/acct/logout', { token: P.token }).catch(() => { }); }
  else if (act === 'tkmark') { const t = ((AC.me && AC.me.tickets) || []).find(x => x.id === a.dataset.id); if (t) { const l = t.legs[+a.dataset.i]; l.res = l.res === a.dataset.v ? null : a.dataset.v; viewMe(); tkSave(t); } }
  else if (act === 'tkdel') { const P = acctPass(); if (P && AC.me) { AC.me.tickets = AC.me.tickets.filter(x => x.id !== a.dataset.id); viewMe(); acctApi('/acct/del', { token: P.token, id: a.dataset.id }).catch(e => toast(e.message)); } }
  else if (act === 'trackpick') { const d = a.dataset; tkSave({ id: tid(), ts: Date.now(), title: '', legs: [{ src: 'pick', sp: d.sp, game: d.game, pick: d.pick, price: d.price ? +d.price : null, start: d.start || '' }] }, 'Tracking it — see Your tickets'); }
  else if (act === 'pslipcopy') { copyText(slipText(), 'Slip copied — paste it into your book'); }
  else if (act === 'bf') { S.bf[a.dataset.k] = a.dataset.v; store.set('bf', S.bf); S.openGame = ''; render(); }
  else if (act === 'bfreset') { S.bf = { win: 'up', tier: 'all', bt: 'all', ch: 'all', view: S.bf.view || 'time' }; store.set('bf', S.bf); render(); }
  else if (act === 'gobf') { S.bf = { ...S.bf, win: 'up', tier: a.dataset.tier || 'all', bt: 'all', ch: 'all', view: 'time' }; store.set('bf', S.bf); S.slateDay = 0; go('slate', true); }
  else if (act === 'ranksp') { S.rankSp = a.dataset.sp; S.rankAll = false; render(); }
  else if (act === 'rankall') { S.rankAll = !S.rankAll; render(); }
  else if (act === 'castpick') { S.castPick = a.dataset.v || ''; store.set('castpick', S.castPick); viewCast(); window.scrollTo(0, 0); }
  else if (act === 'restart') restartApp();
  else if (act === 'chat-leave') { store.set('chat', null); viewChat(); }
  else if (act === 'chat-del') chatMod({ act: 'del', id: a.dataset.id }, () => { CH.list = CH.list.filter(m => m.id !== a.dataset.id); paintChat(); });
  else if (act === 'chat-mute') chatMod({ act: 'mute', name: a.dataset.name, mins: 60 }, () => toast(`${a.dataset.name} is muted for an hour`));
  else if (act === 'chat-ban') chatMod({ act: 'ban', name: a.dataset.name }, () => toast(`${a.dataset.name} is banned`));
  else if (act === 'chat-invite') chatMod({ act: 'invite', uses: 25 }, j => { CH.invite = j.code; const n = $('#chatInv'); if (n) n.innerHTML = `New code: <code>${esc(j.code)}</code> (25 uses)`; });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.guide) closeGuide(); });
document.addEventListener('input', e => { if (e.target.id === 'ddStake') { const v = +e.target.value || 0, dec = ddTicketDec(S.dd, S.ddMode), n = $('#ddPays'); if (n) n.textContent = dd$(v * dec); } });
let adT = 0; document.addEventListener('input', e => { const q = e.target.closest('[data-input="adq"]'); if (!q) return; clearTimeout(adT); adT = setTimeout(() => { AD.q = q.value; viewAdmin(); const n = document.querySelector('[data-input="adq"]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 200); });
let cxT = 0; document.addEventListener('input', e => { const q = e.target.closest('[data-input="cxq"]'); if (!q) return; clearTimeout(cxT); cxT = setTimeout(() => { CX.f.q = q.value; CX.show = 24; store.set('cxf', CX.f); const pos = q.selectionStart; viewChallenges(); const n = document.querySelector('[data-input="cxq"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { } } }, 220); });
document.addEventListener('toggle', e => { const d = e.target; if (d.classList && d.classList.contains('myinbox')) AC.inboxOpen = d.open; if (d.classList && d.classList.contains('myinbox') && d.open && AC.me && AC.me.inbox && AC.me.inbox.unread) { const P = acctPass(); AC.me.inbox.unread = 0; acctBadge(); if (P) acctApi('/acct/inbox/read', { token: P.token }).catch(() => { }); } }, true);
document.addEventListener('change', async e => { const df = e.target.closest('[data-change="ddfrom"]'); if (df) { S.ddFrom = df.value; store.set('ddfrom', S.ddFrom); render(); return; }
  const cf = e.target.closest('[data-change="cxf"]'); if (cf) { CX.f[cf.dataset.k] = cf.value; CX.show = 24; store.set('cxf', CX.f); viewChallenges(); return; }
  const as = e.target.closest('[data-change="adsort"]'); if (as) { AD.sort = as.value; viewAdmin(); return; }
  const rr = e.target.closest('[data-change="runroute"]'); if (rr) { const P = acctPass(); if (!P) return; try { const j = await acctApi('/acct/chal/route', { token: P.token, rid: rr.dataset.rid, route: rr.value }); if (AC.me) AC.me.runs = (AC.me.runs || []).map(r => (r.rid === j.run.rid ? j.run : r)); viewChallenges(); toast(`Route: ${ROUTES[rr.value].name}`); } catch (er) { toast(er.message); } return; } const pm = e.target.closest('[data-act="pmin"]'); if (pm) { S.pf.min = +pm.value; store.set('pf', S.pf); render(); return; } const f = e.target.closest('[data-change="bfch"]'); if (f) { S.bf.ch = f.value; store.set('bf', S.bf); S.openGame = ''; render(); return; } const t = e.target.closest('[data-change="castpick"]'); if (t) { S.castPick = t.value; store.set('castpick', S.castPick); viewCast(); } });
/* "Restart the app": drop this app's saved copy (its offline files and its service worker) and load the newest version. Nothing you saved is touched. */
async function restartApp() {
  toast('Restarting with the newest version…');
  try { const R = navigator.serviceWorker && navigator.serviceWorker.getRegistrations ? await navigator.serviceWorker.getRegistrations() : []; await Promise.all(R.filter(r => /\/desk\//.test(r.scope)).map(r => r.unregister())); } catch { /* none */ }
  try { const K = window.caches ? await caches.keys() : []; await Promise.all(K.filter(k => /^thedesk-shell/.test(k)).map(k => caches.delete(k))); } catch { /* none */ }
  setTimeout(() => location.replace(location.pathname + '?fresh=' + Date.now() + location.hash), 400);
}
window.addEventListener('popstate', () => go((location.hash || '#today').slice(1), false));

/* the clocks on sealed slips; when one runs out, ask the desk for the opened slip */
let fast = 0;
setInterval(() => {
  let due = false;
  for (const el of $$('[data-until]')) { const l = +el.dataset.until - Date.now(); el.textContent = left(l); if (l <= 0) due = true; }
  if (due && Date.now() - fast > 30e3) { fast = Date.now(); loadFeed(); }
}, 1000);
setInterval(() => { if (!document.hidden) loadFeed(); }, 120e3);
/* live scores: every 30 s while a game on the page is live, every 60 s otherwise */
(function liveLoop() { const anyLive = Object.values(S.live || {}).some(v => v && v.state === 'in');
  setTimeout(() => { if (!document.hidden) { liveTick(); if (S.tab === 'slate') slateLive(); } liveLoop(); }, anyLive ? 30e3 : S.liveAt ? 60e3 : 10e3); })();
setInterval(() => { if (!document.hidden && S.tab === 'slate') loadSlate(); }, 600e3);

/* ── Pull to refresh (Chris, Nov 15: "the pull down refresh is not available yet on the public app"). A home-screen app on iPhone
   has none of its own, so: pull down from the top of any tab, let go past the line, and everything reloads — the card, the slate,
   live scores, your tickets and the leaderboard. */
(function () {
  let y0 = null, dy = 0, busy = false; const TH = 70;
  const ind = document.createElement('div'); ind.className = 'ptr'; ind.setAttribute('aria-hidden', 'true'); ind.innerHTML = '<span class="ptr-ic">↓</span><span class="ptr-t">Pull to refresh</span>'; document.body.appendChild(ind);
  const set = (h, txt, cls) => { ind.style.transform = `translate(-50%, ${Math.min(h, 90) - 56}px)`; ind.style.opacity = String(Math.min(1, h / TH)); if (txt) ind.querySelector('.ptr-t').textContent = txt; ind.querySelector('.ptr-ic').textContent = cls === 'spin' ? '↻' : cls === 'done' ? '✓' : '↓'; ind.className = 'ptr' + (cls ? ' ' + cls : ''); };
  const atTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
  const skip = t => t && t.closest && t.closest('input, textarea, select, .lenses, .ddslip, .pslipbar, #guideRoot, .wh-track, .chat-log, [data-noptr]');
  addEventListener('touchstart', e => { if (busy || !atTop() || e.touches.length !== 1 || skip(e.target)) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
  addEventListener('touchmove', e => { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy <= 0 || !atTop()) { set(0); return; } const h = dy * 0.5; set(h, h >= TH ? 'Let go to refresh' : 'Pull to refresh', h >= TH ? 'ready' : ''); }, { passive: true });
  addEventListener('touchend', async () => { if (y0 == null) return; const h = dy * 0.5; y0 = null; if (h < TH || busy) { set(0); return; }
    busy = true; set(TH, 'Refreshing…', 'spin');
    try { await Promise.all([loadFeed(true), loadSlate(), (async () => { try { liveTick(); } catch (e) { } })(), (async () => { try { if (acctPass()) await acctLoad(); LB = null; if (S.tab === 'me') lbLoad(); } catch (e) { } })()]); } catch (e) { }
    render(); set(TH, 'Up to date', 'done'); setTimeout(() => { set(0); busy = false; }, 700); });
})();
document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadFeed(); liveTick(); if (S.tab === 'slate') { loadSlate(); slateLive(); } } });

/* start: last good copy first (instant, works offline), then the live feed */
S.feed = noHeavy(store.get('feed')); S.slate = store.get('slate');
if (S.slate && !(S.slate.v === 1 && Array.isArray(S.slate.days))) S.slate = null;
chip();
/* ?embed=1 · the chat inside the desk's own app: no header, no tabs */
if (/[?&]embed=1/.test(location.search)) document.body.classList.add('embed');
go((() => { try { const sp = TG && TG.initDataUnsafe && TG.initDataUnsafe.start_param; if (sp && TABS.includes(sp)) return sp; } catch (e) { } return (location.hash || '#today').slice(1); })(), false);
loadFeed(); liveTick(); /* scores straight away off the saved card: live legs shouldn't wait for a new publish or the minute loop */
acctBadge(); acctLoad();
(window.requestIdleCallback || (f => setTimeout(f, 1500)))(() => loadSlate());
/* the install guide greets a first visit, comes back once a week later, and after that lives behind "Get the app" */
{ const g = store.get('guide'); if (!isStandalone() && (!g || ((g.n || 1) < 2 && Date.now() - g.at > 7 * 864e5))) openGuide(true); }
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { /* the app works without it */ });
