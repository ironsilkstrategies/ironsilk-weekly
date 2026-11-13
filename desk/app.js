/* TheDesk — the public app.
   It shows what the desk publishes and nothing else: the day's Best 3 (each one sealed until 30 minutes before its
   game), every graded result, and the day's slate from public sports data. There are no models, keys or settings in
   here; nothing on this page can make a pick. */
const CFG = {
  feeds: ['../public/picks.json', 'https://raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly-site/main/public/picks.json'],
  slates: ['https://raw.githubusercontent.com/ironsilkstrategies/ironsilk-weekly/feeds/slate.json'],
  lounge: 'https://t.me/TheDeskLounge',
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
  slateDay: 0, slateSp: 'all', rankSp: '', rankAll: false, openGame: '', guide: null, canPrompt: null };
const TABS = ['today', 'slate', 'cast', 'chat', 'receipts', 'join'];

/* ── data ────────────────────────────────────────────────────────────────── */
async function getJSON(url, wait = 9000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), wait);
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store', signal: c.signal });
    return r.ok ? await r.json() : null;
  } catch { return null; } finally { clearTimeout(t); }
}
const stateOf = x => (!x ? '' : x.hidden ? 'h' : x.push ? 'p' : x.hit === true ? 'w' : x.hit === false ? 'l' : 'o');
async function loadFeed() {
  const got = (await Promise.all(CFG.feeds.map(u => getJSON(u)))).filter(j => j && typeof j === 'object' && fin(j.generated));
  if (!got.length) { S.feedErr = !S.feed; if (S.tab === 'today' || S.tab === 'receipts') render(); return; }
  const F = got.sort((a, b) => b.generated - a.generated)[0];
  if (S.feed && S.feed.generated >= F.generated) return;
  S.feed = F; S.feedErr = false; store.set('feed', F);
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
      const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${ESPN[sp]}/scoreboard?dates=${ymd}&limit=300${sp === 'ncaaf' ? '&groups=80' : sp === 'ncaab' ? '&groups=50' : ''}`);
      if (!r.ok) return;
      for (const ev of (await r.json()).events || []) {
        const c = (ev.competitions || [])[0] || {}, cs = c.competitors || [];
        const A = cs.find(z => z.homeAway === 'away'), H = cs.find(z => z.homeAway === 'home'); if (!A || !H) continue;
        const st = (c.status || ev.status || {}).type || {};
        const num = z => +(z.score && z.score.value != null ? z.score.value : z.score);
        S.live[`${sp}|${ab(sp, A.team && A.team.abbreviation)}@${ab(sp, H.team && H.team.abbreviation)}`] =
          { a: num(A), h: num(H), state: st.state === 'post' || st.completed ? 'post' : st.state === 'in' ? 'in' : 'pre', detail: st.shortDetail || st.detail || '' };
      }
    } catch { /* scores are a nicety */ }
  }));
}
const liveOf = x => { const [a, h] = String(x.game || x.k || '').replace(/^[a-z]+\|/, '').split('@'); return S.live[`${x.sp}|${ab(x.sp, a)}@${ab(x.sp, h)}`] || null; };
async function liveTick() {
  const F = S.feed, T = F && F.today; if (!T) return;
  const open = [...(T.picks || []), ...((F.parlay || {}).legs || [])].filter(x => !x.hidden && x.game && x.hit == null && !x.push);
  const sps = [...new Set(open.map(x => x.sp))]; if (!sps.length) return;
  await scores(sps, String(T.d || '').replace(/-/g, ''));
  if (S.tab === 'today') render();
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
  if (L && L.state === 'in') { when = `<div class="when live"><span class="dot"></span>Live${L.detail ? ', ' + esc(L.detail) : ''}</div>`; score = `<p class="score">${esc(teamName(x.sp, ga))} ${L.a}, ${esc(teamName(x.sp, gh))} ${L.h}</p>`; }
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
  const parlayHtml = P && (P.legs || []).length ? `<h2 class="h2">The Banker’s parlay</h2><div class="slips few"><article class="slip nostub"><div class="slip-head"><span>${P.legs.length} legs</span><span>${esc(P.price || '')}</span></div><div class="slip-main">
      ${P.legs.map((l0, i) => { if (l0.hidden) { const u = l0.unlockAt; return `<div class="li"><span class="mk">•</span><span class="pk">Sealed leg<small>${esc(LEAGUE[l0.sp] || '')}</small></span><span class="u"${u ? ` data-until="${u}"` : ''}>${u ? esc(left(u - Date.now())) : ''}</span></div>`; }
        const l = liveGrade(l0), c = stateOf(l); return `<div class="li"><span class="mk ${c}">${c === 'w' ? '✓' : c === 'l' ? '✗' : c === 'p' ? '=' : '•'}</span><span class="pk">${esc(readPick(l).big)} ${esc(odds(l.price))}<small>${esc(matchup(l))}</small></span><span class="u">${pct(l.p)}%</span></div>`; }).join('')}
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

  el.innerHTML = `<h1 class="title">${esc(title)}</h1><p class="lede">${lede}</p>${onrec}${slips}${last}${propsHtml}${parlayHtml}${T ? vipHtml(F) : ''}${upsHtml}
    <div id="seal"></div>${vip}
    ${T && picks.length ? `<div class="row" style="margin-top:22px"><button type="button" class="btn line" data-act="share">Share today’s card</button></div>` : ''}${footHtml()}`;
  if (T) { remember(picks.map((x, i) => [keys[i], x])); remember(props.map((x, i) => [`${T.d}|p${i}`, x])); seal(T); }
  S.first = false;
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
    <p>TheDesk is published by IronSilk Strategies. <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></p></footer>`;
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
function gameHtml(g) {
  const L = liveOf({ sp: g.sp, game: `${g.a.ab}@${g.h.ab}` }), open = S.openGame === g.k, on = openPickOn(g);
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
    more = `<div class="g-more"><dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
      ${g.q && g.q.title ? `<div class="ask"><b>${esc(g.q.title)}</b><span>${esc((g.q.opts || []).join(' or '))}? Make your case in the lounge.</span><a class="btn foil" href="${CFG.lounge}" target="_blank" rel="noopener">Open the lounge</a></div>` : ''}</div>`;
  }
  return `<div class="game"><button type="button" data-act="game" data-k="${esc(g.k)}" aria-expanded="${open}">${t}
    <div class="g-teams">${side(g.a, live ? L.a : null)}${side(g.h, live ? L.h : null)}${on ? `<span><span class="star">On today’s card: ${esc(readPick(on).big)} ${esc(odds(on.price))}</span></span>` : ''}</div>${ln}</button>${more}</div>`;
}
function viewSlate() {
  const el = $('#v-slate'), SL = S.slate;
  if (!SL) { el.innerHTML = `<h1 class="title">The sheet</h1>${S.slateErr ? '<div class="paper blank"><b>The sheet isn’t in yet</b><p>Lines and rankings refresh every hour. Check back in a bit.</p></div>' : '<div class="shimmer"></div>'}${footHtml()}`; return; }
  const today = deskDay(), days = SL.days.filter(d => d.d >= today); const list = days.length ? days : SL.days;
  if (S.slateDay >= list.length) S.slateDay = 0;
  const D = list[S.slateDay], label = d => (d === today ? 'Today' : d === deskDay(Date.now() + 864e5) ? 'Tomorrow' : shortDay(d));
  const sps = ORDER.filter(sp => D.games.some(g => g.sp === sp)); if (S.slateSp !== 'all' && !sps.includes(S.slateSp)) S.slateSp = 'all';
  const games = D.games.filter(g => S.slateSp === 'all' || g.sp === S.slateSp);
  const body = sps.filter(sp => S.slateSp === 'all' || sp === S.slateSp).map(sp => { const gs = games.filter(g => g.sp === sp); return `<div class="lg">${esc(LEAGUE[sp])}, ${gs.length} game${gs.length === 1 ? '' : 's'}</div>${gs.map(gameHtml).join('')}`; }).join('');
  const stale = Date.now() - SL.ts > 6 * 36e5;
  /* rankings */
  const rsps = ORDER.filter(sp => (SL.ranks[sp] || []).length); if (!rsps.includes(S.rankSp)) S.rankSp = rsps[0] || '';
  const RK = SL.ranks[S.rankSp] || [], shown = S.rankAll ? RK : RK.slice(0, 10);
  const ranks = rsps.length ? `<h2 class="h2">TheDesk Power Rankings</h2><p class="note">Margin of victory with the home edge taken out, adjusted for who each team has played. Updated every hour.</p>
    <div class="seg" role="group" aria-label="League">${rsps.map(sp => `<button type="button" data-act="ranksp" data-sp="${sp}" aria-pressed="${sp === S.rankSp}">${esc(LEAGUE[sp])}</button>`).join('')}</div>
    <div class="paper">${shown.map(x => `<div class="rank"><span class="n">${x.rk}</span><span class="t">${esc(x.name || x.ab)}<small>${x.w}-${x.l}${x.st ? `, ${x.st[0] === 'W' ? 'won' : 'lost'} ${esc(x.st.slice(1))} straight` : ''}</small></span><span>${pips(x.l5)}</span><span class="r">${x.rt > 0 ? '+' : x.rt < 0 ? '−' : ''}${Math.abs(x.rt).toFixed(1)}</span></div>`).join('')}
      ${RK.length > 10 ? `<button type="button" class="more-btn" data-act="rankall">${S.rankAll ? 'Show the top 10' : `Show all ${RK.length}`}</button>` : ''}</div>` : '';
  el.innerHTML = `<h1 class="title">${esc(label(D.d) === 'Today' ? weekday(D.d) + '’s sheet' : label(D.d) === 'Tomorrow' ? 'Tomorrow’s sheet' : shortDay(D.d))}</h1>
    <p class="lede">Every game on the board with its line, the market’s odds and where each team sits in TheDesk Power Rankings. Tap a game for the details.</p>
    <div class="cols"><div><div class="seg" role="group" aria-label="Day and league">${list.map((d, i) => `<button type="button" data-act="slateday" data-i="${i}" aria-pressed="${i === S.slateDay}">${esc(label(d.d))}</button>`).join('')}
      ${sps.length > 1 ? `<button type="button" data-act="slatesp" data-sp="all" aria-pressed="${S.slateSp === 'all'}">All leagues</button>${sps.map(sp => `<button type="button" data-act="slatesp" data-sp="${sp}" aria-pressed="${sp === S.slateSp}">${esc(LEAGUE[sp])}</button>`).join('')}` : ''}</div>
    <div class="paper"><div class="sheet-h"><b>${esc(shortDay(D.d))}</b><span>Lines as of ${esc(clock(SL.ts))}${stale ? ', waiting on a refresh' : ''}</span></div>
      ${body || '<div class="blank"><b>Nothing on the board</b><p>No games with lines for this day yet.</p></div>'}
      <div class="sheet-f">The number beside a team is its Power Rank.${D.more ? ` ${D.more} more college games are on the full board; these are the ones worth a look.` : ''} Lines can move. This sheet never shows the desk’s sealed picks.</div></div></div>
    <div>${ranks}</div></div>${footHtml()}`;
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
function legRow(l0) {
  const l = l0.game ? liveGrade(l0) : l0, c = stateOf(l), big = l.game ? readPick(l).big : l.pick;
  const meta = [LEAGUE[l.sp], l.gl || (l.game ? matchup(l) : ''), c === 'o' && l.start ? whenLabel(l.start) : '', (l.by || []).length ? 'by ' + l.by.join(' + ') : ''].filter(Boolean).join(' · ');
  return `<div class="leg"><div class="li"><span class="mk ${c}">${c === 'w' ? '✓' : c === 'l' ? '✗' : c === 'p' ? '=' : '•'}</span><span class="pk">${esc(big)} ${esc(odds(l.price))}<small>${esc(meta)}</small></span><span class="u">${l.p != null ? pct(l.p) + '%' : ''}</span></div>${callsHtml(l.voices)}</div>`;
}
function vipHtml(F) {
  const V = F.vip; if (!V) return '';
  const sec = (title, body, note) => `<section class="vsec"><div class="vh"><h2 class="h2">${title}</h2>${vipBadge()}</div>${note ? `<p class="note">${note}</p>` : ''}${body}</section>`;
  const tix = (head, legs) => `<div class="paper tix">${head ? `<div class="tix-h">${head}</div>` : ''}${legs.map(legRow).join('')}</div>`;
  const top = (V.top10 || []).length ? sec('The rest of the Top 10', tix('', V.top10), 'Official singles: a character is 70%+ sure and the price pays.') : '';
  const bank = V.banker && (V.banker.legs || []).length ? sec('The Banker’s parlay', tix(`<b>${V.banker.legs.length} legs · ${esc(V.banker.price || '')}</b><span>${pct(V.banker.p)}% to cash</span>`, V.banker.legs), 'Backs the side the strongest books are on.') : '';
  const pars = (V.parlays || []).length ? sec('Every character’s parlay', `<div class="pargrid">${V.parlays.map(P => tix(`<b>${esc(P.who)}${P.skill ? ' · strong suit' : P.px ? ' · props' : ''}</b><span>${P.legs.length} legs · ${esc(P.price || '')} · ${pct(P.p)}%</span>`, P.legs)).join('')}</div>`) : '';
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
    ${b ? `<div class="bl-bar" role="img" aria-label="${p}% of the way to the chair"><i style="width:${p}%"></i></div><div class="bl-s">${Math.min(b.n, need.n)}/${need.n} games · ${Math.min(b.days, need.days)}/${need.days} days · ${b.z >= 0 ? '+' : '−'}${Math.abs(b.z).toFixed(1)}σ of ${b.bar.toFixed(1)}σ</div>` : ''}
    ${(c.hist || []).length ? `<div class="bl-s">Last change: ${esc(c.hist[c.hist.length - 1].lab || '')}</div>` : ''}</div>`;
}
function viewCast() {
  const el = $('#v-cast'), F = S.feed || {}, C = F.characters || [], B = F.bloodlines, need = (B && B.need) || { n: 100, days: 10 };
  if (!C.length) { el.innerHTML = `<h1 class="title">The characters</h1><p class="lede">The roster shows up here once the desk publishes it.</p>${footHtml()}`; return; }
  const cells = (B && B.cells) || [];
  const race = cells.filter(c => c.best).map(c => ({ c, p: crownPct(c.best, need) })).sort((a, b) => b.p - a.p).slice(0, 5);
  const gens = cells.filter(c => c.gen > 1).length, heirs = cells.reduce((n, c) => n + (c.heirs || 0), 0);
  const raceHtml = cells.length ? `<section class="crown"><div class="vh"><h2 class="h2">Bloodlines</h2>${vipBadge()}</div>
      <p class="note">Every character is a bloodline. Heirs, each the same character with one belief changed, read every game in the shadows. One takes the chair after ${need.n}+ games it was never tuned on and ${need.days}+ days, if it beats its parent by more than luck and makes no less money.</p>
      <div class="crown-stats"><div><b>${cells.length}</b><span>bloodlines</span></div><div><b>${heirs}</b><span>heirs reading</span></div><div><b>${gens}</b><span>new generations</span></div></div>
      ${race.length ? `<div class="paper race"><div class="tix-h"><b>Closest to the crown</b><span>${need.n} games · ${need.days} days · past the bar</span></div>${race.map(({ c, p }, i) => `<div class="rc"><span class="n">${i + 1}</span><span class="t">${esc(c.who)}<small>${esc(MKT[c.m] || c.m)} · ${esc(c.best.lab || '')}</small></span><span class="bl-bar"><i style="width:${Math.round(p * 100)}%"></i></span></div>`).join('')}</div>` : ''}</section>` : '';
  const card = c => {
    const r = c.record || { w: 0, l: 0, pu: 0, u: 0 }, n = r.w + r.l, lines = cells.filter(x => x.v === c.v);
    return `<article class="castcard" style="--cc:${okColor(c.color)}"><div class="cc-h"><span class="cc-chip">${esc(c.chip || '')}</span>${n ? `<span class="cc-rec">${r.w}–${r.l}${r.pu ? '–' + r.pu : ''}, ${signed(r.u)}u</span>` : '<span class="cc-rec">No graded calls yet</span>'}</div>
      <h3>${esc(c.name)}</h3><p class="cc-bio">${esc(c.bio || '')}</p>
      ${(c.picks || []).length ? `<div class="cc-sub"><span>Today’s official picks</span>${vipBadge()}</div><div class="paper tix">${c.picks.map(p => `<div class="leg"><div class="li"><span class="mk ${stateOf(p)}">${stateOf(p) === 'w' ? '✓' : stateOf(p) === 'l' ? '✗' : stateOf(p) === 'p' ? '=' : '•'}</span><span class="pk">${esc(readPick(p).big)} ${esc(odds(p.price))}<small>${esc([LEAGUE[p.sp], p.gl, stateOf(p) === 'o' && p.start ? whenLabel(p.start) : ''].filter(Boolean).join(' · '))}</small></span><span class="u">${p.p != null ? pct(p.p) + '%' : ''}</span></div>${p.note ? `<p class="why1">${esc(p.note)}</p>` : ''}</div>`).join('')}</div>` : '<div class="cc-sub"><span>No official pick today</span></div>'}
      ${lines.length ? `<div class="cc-sub"><span>Bloodlines</span></div>${lines.map(x => blRow(x, need)).join('')}` : ''}</article>`;
  };
  el.innerHTML = `<h1 class="title">The characters</h1><p class="lede">Every pick on TheDesk comes from these voices. Each one reads every game its own way, gets graded in public, and keeps its own record. Records count official calls over the last 60 days.</p>
    ${raceHtml}<div class="castgrid">${C.map(card).join('')}</div>${footHtml()}`;
}

/* ── the members' chatroom (the one thing that talks back: words only, never picks) ── */
const CH = { list: [], ws: null, tries: 0, poll: null, invite: '', err: '' };
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
  const el = $('#v-join'), F = S.feed || {}, beta = F.beta !== false, sub = beta ? '' : okUrl(F.subscribe), soc = { ...CFG.social, ...(F.social || {}) }, tg = okUrl(soc.tg), fb = okUrl(soc.fb);
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
    <article class="slip stubcard"><div class="slip-head"><span>Admit all</span><span>Free</span></div><div class="slip-main"><h3>The lounge</h3>
      <p>We talk sports here, not just picks. Game threads, polls every hour, and the results posted win or lose.</p></div>
      <div class="slip-stub"><div class="row"><a class="btn ink" href="${CFG.lounge}" target="_blank" rel="noopener">Open the lounge</a>${tg ? `<a class="btn paper" href="${esc(tg)}" target="_blank" rel="noopener">Telegram channel</a>` : ''}${fb ? `<a class="btn paper" href="${esc(fb)}" target="_blank" rel="noopener">Facebook</a>` : ''}</div></div></article>
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
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
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
    <div class="guide-top"><img src="../brand/icon-192.png" width="60" height="60" alt=""><div><h2 id="gT">Put TheDesk on your home screen</h2><p class="sub">One tap to today’s card. No app store, nothing to update.</p></div></div>
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
const VIEWS = { today: viewToday, slate: viewSlate, cast: viewCast, chat: viewChat, receipts: viewReceipts, join: viewJoin };
function render() { VIEWS[S.tab](); }
function go(tab, push) {
  if (!TABS.includes(tab)) tab = 'today';
  S.tab = tab;
  for (const t of TABS) $('#v-' + t).hidden = t !== tab;
  for (const b of $$('[data-go]')) { if (b.closest('.tabs,.nav-top')) { if (b.dataset.go === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); } }
  if (push && location.hash !== '#' + tab) history.pushState(null, '', '#' + tab);
  render(); window.scrollTo(0, 0);
  if (tab === 'slate') { if (!S.slate) loadSlate(); else slateLive(); }
  document.title = { today: 'TheDesk — today’s Best 3, locked before the games', slate: 'The sheet — TheDesk', receipts: 'Every result — TheDesk', join: 'Join — TheDesk' }[tab];
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
  else if (act === 'ranksp') { S.rankSp = a.dataset.sp; S.rankAll = false; render(); }
  else if (act === 'rankall') { S.rankAll = !S.rankAll; render(); }
  else if (act === 'chat-leave') { store.set('chat', null); viewChat(); }
  else if (act === 'chat-del') chatMod({ act: 'del', id: a.dataset.id }, () => { CH.list = CH.list.filter(m => m.id !== a.dataset.id); paintChat(); });
  else if (act === 'chat-mute') chatMod({ act: 'mute', name: a.dataset.name, mins: 60 }, () => toast(`${a.dataset.name} is muted for an hour`));
  else if (act === 'chat-ban') chatMod({ act: 'ban', name: a.dataset.name }, () => toast(`${a.dataset.name} is banned`));
  else if (act === 'chat-invite') chatMod({ act: 'invite', uses: 25 }, j => { CH.invite = j.code; const n = $('#chatInv'); if (n) n.innerHTML = `New code: <code>${esc(j.code)}</code> (25 uses)`; });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.guide) closeGuide(); });
window.addEventListener('popstate', () => go((location.hash || '#today').slice(1), false));

/* the clocks on sealed slips; when one runs out, ask the desk for the opened slip */
let fast = 0;
setInterval(() => {
  let due = false;
  for (const el of $$('[data-until]')) { const l = +el.dataset.until - Date.now(); el.textContent = left(l); if (l <= 0) due = true; }
  if (due && Date.now() - fast > 30e3) { fast = Date.now(); loadFeed(); }
}, 1000);
setInterval(() => { if (!document.hidden) loadFeed(); }, 120e3);
setInterval(() => { if (!document.hidden) { liveTick(); if (S.tab === 'slate') slateLive(); } }, 60e3);
setInterval(() => { if (!document.hidden && S.tab === 'slate') loadSlate(); }, 600e3);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadFeed(); if (S.tab === 'slate') loadSlate(); } });

/* start: last good copy first (instant, works offline), then the live feed */
S.feed = store.get('feed'); S.slate = store.get('slate');
if (S.slate && !(S.slate.v === 1 && Array.isArray(S.slate.days))) S.slate = null;
chip();
/* ?embed=1 · the chat inside the desk's own app: no header, no tabs */
if (/[?&]embed=1/.test(location.search)) document.body.classList.add('embed');
go((location.hash || '#today').slice(1), false);
loadFeed();
(window.requestIdleCallback || (f => setTimeout(f, 1500)))(() => loadSlate());
/* the install guide greets a first visit, comes back once a week later, and after that lives behind "Get the app" */
{ const g = store.get('guide'); if (!isStandalone() && (!g || ((g.n || 1) < 2 && Date.now() - g.at > 7 * 864e5))) openGuide(true); }
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { /* the app works without it */ });
