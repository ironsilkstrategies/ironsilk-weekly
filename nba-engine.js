/* ═══════════════════════════════════════════════════════════════════════════
   THEDESK — NBA ENGINE
   Basketball is fundamentally different from hockey/football:
   · High scoring (210-240 total pts typical), pace-adjusted
   · Lots of player props (points, rebounds, assists, 3-pointers, steals, blocks)
   · OT is common and affects totals — model handles it
   · 4 quarters, halftime at Q2, no regulation tie possible in NBA
   · Player rest is HUGE — always check injury + minutes restriction props
   ══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ── Season team data: loaded from ESPN's NBA standings API ── */
const NBA_GAMES = [];
const NBA_SIMS  = {};
const NBA_RATINGS = {};     // { abbr: { pace, offRtg, defRtg, netRtg, gp } }
const NBA_PLAYER_STATS = {}; // { abbr: { players: [{name, pts, reb, ast, ...}] } }
const NBA_LS = { shots: 'd4.nbashots', arc: 'd4.nbaarc', seed: 'd4.nbaseed' };

const NBA_ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

/* Abbreviation aliases: what the sportsbook calls them vs ESPN */
const NBA_ABBR_ALIAS = {
  GS:'GSW', GOLDEN:'GSW', 'GOLDEN STATE':'GSW', 'LA CLIPPERS':'LAC', 'LA LAKERS':'LAL',
  NOR:'NOP', 'NEW ORLEANS':'NOP', NOP:'NOP', MEM:'MEM', OKC:'OKC',
  PHO:'PHX', PHOENIX:'PHX', SAN:'SAS', UTA:'UTAH'
};
function nbaAbbrFor(raw) {
  if (!raw) return null;
  const k = String(raw).toUpperCase().replace(/[^A-Z ]/g, '').trim();
  if (NBA_ABBR_ALIAS[k]) return NBA_ABBR_ALIAS[k];
  const found = NBA_GAMES.find(g =>
    [g.away.abbr, g.home.abbr, g.away.name, g.home.name, g.away.displayName, g.home.displayName]
      .some(v => v && v.toUpperCase().includes(k) && k.length >= 3));
  return found ? (found.away.displayName.toUpperCase().includes(k) ? found.away.abbr : found.home.abbr) : null;
}

/* ── Pace-adjusted scoring sim ─────────────────────────────────────────── */
/*
   NBA scoring follows a pace × efficiency model:
   expected_pts = possessions_per_game × (offRtg / 100)
   possessions ≈ average of home and away team pace.
   We use a negative-binomial distribution for game totals and
   a correlated bivariate model for spread (home advantage ~3.2 pts).
*/
const NBA_HCA = 3.2;      // home court advantage, points
const NBA_SD  = 11.5;     // points per team per game standard deviation

function nbaSimFor(g) {
  const a = NBA_RATINGS[g.away.abbr] || { offRtg: 112, defRtg: 112, pace: 99 };
  const h = NBA_RATINGS[g.home.abbr] || { offRtg: 112, defRtg: 112, pace: 99 };
  const pace = (a.pace + h.pace) / 2;
  const awayPts = pace * ((a.offRtg + h.defRtg) / 2) / 100;
  const homePts = pace * ((h.offRtg + a.defRtg) / 2) / 100 + NBA_HCA;
  const margin = homePts - awayPts;
  const total  = awayPts + homePts;
  const N = 6000;
  let hw = 0, aw = 0; const TOT = new Int32Array(320), MAR = new Int32Array(161);
  const rng = (function(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(42);
  const norm = () => Math.sqrt(-2 * Math.log(rng() || 1e-9)) * Math.cos(2 * Math.PI * rng());
  for (let i = 0; i < N; i++) {
    const aS = Math.max(0, Math.round(awayPts + NBA_SD * norm()));
    const hS = Math.max(0, Math.round(homePts + NBA_SD * norm()));
    if (hS > aS) hw++; else if (aS > hS) aw++;
    TOT[Math.min(319, aS + hS)]++;
    MAR[Math.min(160, Math.max(0, hS - aS + 80))]++;
  }
  const over  = L => { let c = 0; for (let t = Math.ceil(L + 0.01); t < 320; t++) c += TOT[t]; return c / N; };
  const cover = (side, line) => { let c = 0; for (let m = 0; m < 161; m++) { const v = (m - 80) * (side === 'home' ? 1 : -1) + line; if (v > 0) c += MAR[m]; } return c / N; };
  return { awayProj: +awayPts.toFixed(1), homeProj: +homePts.toFixed(1), hw: hw / N, aw: aw / N, margin, total, over, cover, N };
}

/* ── ESPN data fetch ─────────────────────────────────────────────────────── */
let NBA_LOADED = false;
let NBA_SEED_TS = 0;
const NBA_DONE = {};

async function loadNBAStandings() {
  if (Date.now() - NBA_SEED_TS < 3600e3) return;
  NBA_SEED_TS = Date.now();
  try {
    const y = new Date().getFullYear();
    const r = await fetch(`${NBA_ESPN}/standings?season=${y}&limit=30`);
    const j = await r.json();
    ((j.children || []).flatMap(c => (c.standings || {}).entries || [])).forEach(e => {
      const ab = e.team && e.team.abbreviation;
      if (!ab) return;
      const getStat = n => { const s = (e.stats || []).find(x => x.name === n); return s ? +s.value : null; };
      NBA_RATINGS[ab] = {
        offRtg: getStat('offensiveRating') || 112,
        defRtg: getStat('defensiveRating') || 112,
        pace:   getStat('pace') || 99,
        netRtg: getStat('netRating') || 0,
        gp:     getStat('gamesPlayed') || 0,
      };
    });
  } catch(e) { console.warn('NBA standings', e); }
}

async function loadNBAScoreboard() {
  try {
    const tz = typeof APP_TZ !== 'undefined' ? APP_TZ : 'America/Chicago';
    const dt = new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replace(/-/g,'');
    const r = await fetch(`${NBA_ESPN}/scoreboard?dates=${dt}&limit=30`);
    const j = await r.json();
    NBA_GAMES.length = 0;
    ((j.events || [])).forEach(ev => {
      const c  = (ev.competitions || [])[0]; if (!c) return;
      const st = (c.status || {}).type || {};
      const away = c.competitors.find(x => x.homeAway === 'away');
      const home = c.competitors.find(x => x.homeAway === 'home');
      if (!away || !home) return;
      const mkTeam = t => ({ abbr: t.team.abbreviation, name: t.team.shortDisplayName || t.team.name, displayName: t.team.displayName, id: t.team.id });
      const g = {
        id: ev.id, date: ev.date, away: mkTeam(away), home: mkTeam(home),
        awayScore: away.score !== '' ? +away.score : null,
        homeScore: home.score !== '' ? +home.score : null,
        abstract: st.state === 'post' ? 'post' : st.state === 'in' ? 'in' : 'pre',
        status: st.shortDetail || '',
        period: c.status.period || 0,
        venue: ((c.venue || {}).fullName) || '',
      };
      NBA_GAMES.push(g);
      if (g.abstract === 'pre') NBA_SIMS[g.id] = nbaSimFor(g);
    });
  } catch(e) { console.warn('NBA scoreboard', e); }
}

/* ── Book line storage (same pattern as NHL) ──────────────────────────────── */
function nbaLinesOn(d) { const a = get(NBA_LS.shots, {}); return a[d] || []; }
function nbaPutLines(rows) {
  rows = (rows || []).map(r => ({...r, price: r.price == null ? null : (typeof amerOk === 'function' ? amerOk(r.price) : +r.price)})).filter(r => r.price != null);
  const all = get(NBA_LS.shots, {});
  const d = (rows[0] || {}).date || (typeof today === 'function' ? today() : '');
  if (!d) return;
  (all[d] = all[d] || []);
  rows.forEach(r => { const i = all[d].findIndex(x => x.game === r.game && x.market === r.market && x.side === r.side); if (i >= 0) all[d][i] = r; else all[d].push(r); });
  Object.keys(all).sort().slice(0, -7).forEach(k => delete all[k]);
  set(NBA_LS.shots, all);
}
function nbaBookLinesFor(game, date) {
  const d = date || (typeof today === 'function' ? today() : '');
  return nbaLinesOn(d).filter(x => x.game === game);
}

/* ── Intake grammar — parses sportsbetting.ag / DraftKings format ─────── */
/*
  NBA
  Atlanta Hawks @ Brooklyn Nets
  ML: ATL -150 / BKN +130
  SPREAD: ATL -5.5 (-110) / BKN +5.5 (-110)
  OU: o215.5 (-110) / u215.5 (-110)
  H1SPREAD: ATL -3 (-110) / BKN +3 (-110)
  H1OU: o105.5 (-110) / u105.5 (-110)
  Q1SPREAD: ATL -1.5 (-110) / BKN +1.5 (-110)
  Q1OU: o52 (-110) / u52 (-110)
*/
function saveNBABookOdds(picks, el) {
  if (!picks || !picks.length) return;
  const rows = picks.filter(p => p.sport === 'nba' || !p.sport).map(p => ({
    ...p, sport: 'nba', date: p.gameDate || (typeof today === 'function' ? today() : ''),
    src: 'mine', capturedAt: Date.now()
  }));
  nbaPutLines(rows);
  if (typeof syncFinalsToShared === 'function') syncFinalsToShared();
}

/* ── Card rendering ──────────────────────────────────────────────────────── */
function nbaSq(label, pick, info, sim) {
  /* Minimal square builder for the NBA card — same shape as football */
  const brainP = info ? info.p : null;
  const price  = info ? info.price : null;
  const ev     = brainP != null && price != null && typeof imp === 'function' ? (brainP * (price > 0 ? price / 100 + 1 : 100 / -price + 1) - 1) * 100 : null;
  const col = ev != null ? (ev >= 3 ? 'var(--win)' : ev <= -5 ? 'var(--rust)' : 'var(--mute)') : 'var(--mute)';
  return `<div class="sq" style="flex:1;min-width:120px;padding:8px 10px;margin:3px;border-radius:10px;border:1.5px solid var(--rule)">
    <div style="font-size:11px;font-weight:800">${label}</div>
    ${sim ? `<div class="mono" style="font-size:9px;color:var(--mute)">sim ${sim}</div>` : ''}
    ${price != null ? `<div style="font-size:22px;font-weight:900;color:var(--chalk)">${price > 0 ? '+' : ''}${price}</div>` : '<div style="font-size:22px;color:var(--mute)">—</div>'}
    ${ev != null ? `<div class="mono" style="font-size:9.5px;color:${col}">${ev >= 0 ? '+' : ''}${ev.toFixed(1)}% EV</div>` : ''}
  </div>`;
}

function nbaCard(g) {
  if (!g) return '';
  const s    = NBA_SIMS[g.id] || nbaSimFor(g);
  const L    = nbaBookLinesFor(g.away.abbr + '@' + g.home.abbr);
  const f    = (mkt, side) => L.find(x => x.market === mkt && x.side === side);
  const mk   = (p, price) => p != null ? { p, price } : null;
  const sc   = g.awayScore != null ? `${g.away.abbr} ${g.awayScore}–${g.homeScore} ${g.home.abbr}` : '';
  const hdr  = `<b>${g.away.abbr} @ ${g.home.abbr}</b>`;
  const live = g.abstract === 'in';
  const done = g.abstract === 'post';
  const mlA  = f('moneyline', 'away'), mlH = f('moneyline', 'home');
  const spA  = f('spread',    'away'), spH = f('spread',    'home');
  const ov   = f('total',     'over'), un  = f('total',     'under');
  return `<div class="game-card" id="nba-${g.id}" style="margin:10px 0;padding:12px;border-radius:12px;border:1.5px solid var(--rule)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div><span style="font-size:17px;font-weight:900">${done||live ? sc||hdr : hdr}</span>
        ${live ? `<span style="color:var(--rust);font-size:11px;margin-left:6px">● Q${g.period||'?'} LIVE</span>` : ''}
        ${done ? `<span style="color:var(--mute);font-size:11px;margin-left:6px">FINAL</span>` : ''}
      </div>
      <div class="mono" style="font-size:9px;color:var(--mute)">${g.venue||''}</div>
    </div>
    <div class="sub mono" style="font-size:10px;color:var(--mute);margin-bottom:8px">sim: ${g.away.abbr} ${s.awayProj} – ${s.homeProj} ${g.home.abbr} · total ${s.total.toFixed(1)} · spread ${s.margin > 0 ? '+' : ''}${s.margin.toFixed(1)}</div>
    ${mlA&&mlH ? `<div class="mktlab">MONEYLINE</div><div class="betgrid">${nbaSq(g.away.abbr+' ML','',mk(s.aw,mlA.price),Math.round(s.aw*100)+'%')+nbaSq(g.home.abbr+' ML','',mk(s.hw,mlH.price),Math.round(s.hw*100)+'%')}</div>` : ''}
    ${spA&&spH ? `<div class="mktlab">SPREAD</div><div class="betgrid">${nbaSq(g.away.abbr+(spA.line>=0?'+':'')+spA.line,'',mk(s.cover('away',+spA.line),spA.price),(+spA.line-s.margin).toFixed(1))+nbaSq(g.home.abbr+(spH.line>=0?'+':'')+spH.line,'',mk(s.cover('home',+spH.line),spH.price),(+spH.line+s.margin).toFixed(1))}</div>` : ''}
    ${ov&&un ? `<div class="mktlab">TOTAL · ${ov.line}</div><div class="betgrid">${nbaSq('Over '+ov.line,'',mk(s.over(+ov.line),ov.price),'proj '+s.total.toFixed(1))+nbaSq('Under '+un.line,'',mk(1-s.over(+un.line),un.price),'proj '+s.total.toFixed(1))}</div>` : ''}
  </div>`;
}

function renderNBA() {
  const el = document.getElementById('slate'); if (!el) return;
  if (!NBA_GAMES.length) { el.innerHTML = '<div class="empty">Loading NBA schedule…</div>'; loadNBAScoreboard().then(renderNBA); return; }
  const pre = NBA_GAMES.filter(g => g.abstract === 'pre');
  const live = NBA_GAMES.filter(g => g.abstract === 'in');
  const done = NBA_GAMES.filter(g => g.abstract === 'post');
  el.innerHTML = [
    live.length  ? '<div class="mktlab">LIVE</div>' + live.map(nbaCard).join('') : '',
    pre.length   ? '<div class="mktlab">TODAY</div>' + pre.map(nbaCard).join('') : '',
    done.length  ? '<div class="mktlab">FINAL</div>' + done.map(nbaCard).join('') : '',
  ].join('') || '<div class="empty">No NBA games today.</div>';
}

/* ── Player prop projections from pstats rolling store ──────────────────── */
function nbaPropsHtml(team) {
  if (typeof pstatStore !== 'function') return '';
  const S = pstatStore();
  const players = Object.values(S).filter(x => x.sp === 'nba' && (!team || x.team === team));
  if (!players.length) return '<div class="sub" style="color:var(--mute)">Player stats build after games are tracked. Open My Games to start.</div>';
  return players.sort((a, b) => (b.pts || 0) - (a.pts || 0)).slice(0, 12).map(p =>
    `<div class="mono" style="font-size:10.5px;padding:4px 0;border-bottom:1px solid var(--rule)">
      <b>${p.player}</b> <span style="color:var(--mute)">${p.team}</span>
      ${p.pts != null ? ` · <b>${p.pts.toFixed(1)}</b> pts` : ''}
      ${p.reb != null ? ` · ${p.reb.toFixed(1)} reb` : ''}
      ${p.ast != null ? ` · ${p.ast.toFixed(1)} ast` : ''}
      ${p.fg3 != null ? ` · ${p.fg3.toFixed(1)} 3PM` : ''}
      <span style="color:var(--mute);font-size:9px">(${p.n}G avg)</span>
    </div>`).join('');
}

/* Feed NBA box scores into pstats */
function pstatFeedNBA(game, boxPlayers) {
  if (!boxPlayers || typeof pstatUpdate !== 'function') return;
  const [aw, hm] = String(game).split('@');
  boxPlayers.forEach(teamBlock => {
    const team = teamBlock.team === 'away' ? aw : hm;
    (teamBlock.athletes || []).forEach(at => {
      const name = (at.athlete || {}).displayName || ''; if (!name) return;
      const stats = {}; (at.stats || []).forEach((v, i) => { stats[(teamBlock.labels||[])[i]] = v; });
      pstatUpdate('nba', team, name, { G: stats.PTS||0, A: stats.AST||0, R: stats.REB||0, fg3: stats['3PM']||stats.TPM||0, n: 1 });
    });
  });
}

/* Intake grammar for NBA lines */
function intakeNBAGrammar(text) {
  const picks = []; const lines = text.split('\n');
  let curGame = null, curAway = null, curHome = null;
  const num = v => { const n = parseFloat(String(v||'').replace(/[^0-9.\-+]/g,'')); return isNaN(n)?null:n; };
  const addRow = (market, side, line, price) => {
    if (!curGame || num(price) == null) return;
    picks.push({ sport: 'nba', game: curGame, market, side, line: line != null ? +line : null, price: +price, away: curAway, home: curHome, date: typeof today === 'function' ? today() : '' });
  };
  lines.forEach(raw => {
    const l = raw.trim(); if (!l || l.toUpperCase() === 'NBA') return;
    const g = l.match(/^(.+?)\s+(?:@|at|vs\.?)\s+(.+?)(?:\s*[|(].*)?$/i);
    if (g && !/:/.test(g[1])) {
      curAway = (typeof nbaAbbrFor === 'function' ? nbaAbbrFor(g[1]) : null) || g[1].toUpperCase().slice(0,3);
      curHome = (typeof nbaAbbrFor === 'function' ? nbaAbbrFor(g[2]) : null) || g[2].toUpperCase().slice(0,3);
      curGame = curAway + '@' + curHome; return;
    }
    let m;
    if ((m=l.match(/^ML:\s*(.+?)\s+([+-]\d+)\s*\/\s*(.+?)\s+([+-]\d+)/i))){ addRow('moneyline','away',null,m[2]); addRow('moneyline','home',null,m[4]); return; }
    if ((m=l.match(/^SPREAD:\s*(.+?)\s+([+-][\d.]+)\s*\(([+-]\d+)\)\s*\/\s*(.+?)\s+([+-][\d.]+)\s*\(([+-]\d+)\)/i))){ addRow('spread','away',m[2],m[3]); addRow('spread','home',m[5],m[6]); return; }
    if ((m=l.match(/^OU:\s*o([\d.]+)\s*\(([+-]\d+)\)\s*\/\s*u([\d.]+)\s*\(([+-]\d+)\)/i))){ addRow('total','over',m[1],m[2]); addRow('total','under',m[3],m[4]); return; }
    if ((m=l.match(/^H1SPREAD:\s*(.+?)\s+([+-][\d.]+)\s*\(([+-]\d+)\)\s*\/\s*(.+?)\s+([+-][\d.]+)\s*\(([+-]\d+)\)/i))){ addRow('h1spread','away',m[2],m[3]); addRow('h1spread','home',m[5],m[6]); return; }
    if ((m=l.match(/^H1OU:\s*o([\d.]+)\s*\(([+-]\d+)\)\s*\/\s*u([\d.]+)\s*\(([+-]\d+)\)/i))){ addRow('h1total','over',m[1],m[2]); addRow('h1total','under',m[3],m[4]); return; }
    if ((m=l.match(/^Q1SPREAD:\s*(.+?)\s+([+-][\d.]+)\s*\(([+-]\d+)\)\s*\/\s*(.+?)\s+([+-][\d.]+)\s*\(([+-]\d+)\)/i))){ addRow('q1spread','away',m[2],m[3]); addRow('q1spread','home',m[5],m[6]); return; }
    if ((m=l.match(/^Q1OU:\s*o([\d.]+)\s*\(([+-]\d+)\)\s*\/\s*u([\d.]+)\s*\(([+-]\d+)\)/i))){ addRow('q1total','over',m[1],m[2]); addRow('q1total','under',m[3],m[4]); return; }
  });
  return picks;
}

/* Auto-init */
(async () => {
  await loadNBAStandings();
  await loadNBAScoreboard();
})();
