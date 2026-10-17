/* probe 4: full game logs for a backtest of the player-prop model (compact) */
import fs from 'fs';
fs.mkdirSync('diag/out4', { recursive: true });
const B = 'https://site.api.espn.com/apis/site/v2/sports', W3 = 'https://site.web.api.espn.com/apis/common/v3/sports';
const J = async u => { for (let t = 0; t < 3; t++) { try { const r = await fetch(u); if (r.ok) return await r.json(); } catch (e) { } await new Promise(r => setTimeout(r, 400)); } return null; };
const CFG = {
  nhl: { p: 'hockey/nhl', season: 2026, teams: ['col', 'pit', 'tor', 'edm', 'bos', 'nyr', 'tb', 'dal', 'min', 'wpg', 'fla', 'car'], re: /^(C|LW|RW|D|F)$/, per: 14 },
  nba: { p: 'basketball/nba', season: 2026, teams: ['bos', 'den', 'lal', 'mil', 'okc', 'ny', 'gs', 'phx', 'min', 'cle'], re: /./, per: 10 },
  mlb: { p: 'baseball/mlb', season: 2026, teams: ['lad', 'nyy', 'phi', 'hou', 'atl', 'sea', 'cle', 'tor'], re: /./, per: 16 },
  nfl: { p: 'football/nfl', season: 2025, teams: ['kc', 'phi', 'buf', 'det', 'bal', 'sf', 'cin', 'min'], re: /^(QB|RB|WR|TE)$/, per: 9 },
  ncaab: { p: 'basketball/mens-college-basketball', season: 2026, teams: ['duke', 'uk', 'unc', 'ku', 'gonz', 'pur', 'hou', 'aub'], re: /./, per: 9 },
  ncaaf: { p: 'football/college-football', season: 2025, teams: ['ala', 'uga', 'mich', 'tex', 'lsu', 'ore'], re: /^(QB|RB|WR|TE)$/, per: 8 } };
const meta = {};
for (const [sp, C] of Object.entries(CFG)) { const out = []; meta[sp] = { teams: 0, players: 0, games: 0 };
  for (const ab of C.teams) { const ro = await J(`${B}/${C.p}/teams/${ab}/roster`); if (!ro) continue; meta[sp].teams++;
    const A = []; (ro.athletes || []).forEach(g => { if (Array.isArray(g.items)) g.items.forEach(a => A.push(a)); else A.push(g); });
    const pick = A.filter(a => C.re.test(String((a.position || {}).abbreviation || ''))).slice(0, 60);
    const jobs = pick.map(a => async () => { const j = await J(`${W3}/${C.p}/athletes/${a.id}/gamelog?season=${C.season}`); if (!j) return null;
      const ev = j.events || {}; const rows = []; const names = j.names || [];
      const walk = (o, typ) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(x => walk(x, typ)); return; }
        if (o.eventId && Array.isArray(o.stats)) { const e = ev[o.eventId] || {}; rows.push([String(e.gameDate || e.date || '').slice(0, 10), o.eventId, typ, (e.atVs || '') + ' ' + ((e.opponent || {}).abbreviation || ''), ...o.stats]); return; }
        Object.values(o).forEach(x => walk(x, typ)); };
      (j.seasonTypes || []).forEach(t => { if (/pre-?season/i.test(t.displayName || '')) return; walk(t, /post|play ?in/i.test(t.displayName || '') ? 'post' : 'reg'); });
      rows.sort((x, y) => x[0].localeCompare(y[0]));
      return { sp, id: a.id, name: a.displayName, pos: (a.position || {}).abbreviation, team: ab.toUpperCase(), season: C.season, names, rows }; });
    /* 4 at a time */
    const res = []; for (let i = 0; i < jobs.length; i += 4) res.push(...await Promise.all(jobs.slice(i, i + 4).map(f => f())));
    const got = res.filter(r => r && r.rows.length >= 5).sort((x, y) => y.rows.length - x.rows.length).slice(0, C.per);
    out.push(...got); }
  meta[sp].players = out.length; meta[sp].games = out.reduce((a, p) => a + p.rows.length, 0);
  fs.writeFileSync(`diag/out4/${sp}.json`, JSON.stringify(out)); }
fs.writeFileSync('diag/out4/_meta.json', JSON.stringify(meta, null, 1)); console.log(JSON.stringify(meta));
