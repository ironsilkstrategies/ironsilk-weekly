/* one-off diagnostic: real ESPN payloads for the roster / game-log / box-score pipeline, every sport.
   Saves raw responses + the CORS headers a browser would see. Runs only on the diag-espn branch. */
import fs from 'fs';
const P = { nba: 'basketball/nba', ncaab: 'basketball/mens-college-basketball', nfl: 'football/nfl', ncaaf: 'football/college-football', nhl: 'hockey/nhl', mlb: 'baseball/mlb' };
const GRP = { ncaab: '&groups=50', ncaaf: '&groups=80' };
const PICK = { nba: ['BOS', 'GS', 'NY'], ncaab: ['DUKE', 'UK'], nfl: ['KC', 'PHI'], ncaaf: ['ALA', 'OSU'], nhl: ['COL', 'PIT'], mlb: ['LAD', 'NYY'] };
const ORIGINS = ['https://ironsilkweekly.com', 'https://ironsilkstrategies.github.io'];
fs.mkdirSync('diag/out', { recursive: true }); const meta = [];
async function get(url, name, keep = true) { let r, txt = '', h = {}; const cors = {};
  try { r = await fetch(url, { headers: { Origin: ORIGINS[0], 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' } });
    txt = await r.text(); for (const k of ['access-control-allow-origin', 'access-control-allow-credentials', 'vary', 'content-type', 'cache-control', 'age']) h[k] = r.headers.get(k);
    try { const r2 = await fetch(url, { headers: { Origin: ORIGINS[1] } }); cors[ORIGINS[1]] = r2.headers.get('access-control-allow-origin'); await r2.text(); } catch (e) { cors.err = String(e); }
  } catch (e) { meta.push({ name, url, error: String(e) }); return null; }
  if (keep) fs.writeFileSync('diag/out/' + name + '.json', txt);
  meta.push({ name, url, status: r.status, bytes: txt.length, headers: h, cors2: cors });
  try { return JSON.parse(txt); } catch (e) { return null; } }
const athletesOf = j => { const out = []; ((j || {}).athletes || []).forEach(g => { if (Array.isArray(g.items)) g.items.forEach(a => out.push({ ...a, _grp: g.position })); else out.push(g); }); return out; };
for (const sp of Object.keys(P)) { const p = P[sp];
  const teams = await get(`https://site.api.espn.com/apis/site/v2/sports/${p}/teams?limit=1000${GRP[sp] || ''}`, `${sp}-teams`);
  const ids = {}; ((((teams || {}).sports || [])[0] || {}).leagues || []).forEach(L => (L.teams || []).forEach(t => { const T = t.team || t; if (T && T.abbreviation) ids[String(T.abbreviation).toUpperCase()] = String(T.id); }));
  let did = 0;
  for (const ab of PICK[sp]) { const id = ids[ab]; if (!id) { meta.push({ name: `${sp}-team-${ab}`, missing: true, have: Object.keys(ids).slice(0, 40) }); continue; }
    const ro = await get(`https://site.api.espn.com/apis/site/v2/sports/${p}/teams/${id}/roster`, `${sp}-roster-${ab}`);
    const A = athletesOf(ro); meta.push({ name: `${sp}-roster-${ab}-parsed`, n: A.length, first: A.slice(0, 3).map(a => ({ id: a.id, name: a.displayName || a.fullName, pos: a.position && a.position.abbreviation, status: a.status, inj: (a.injuries || []).length })) });
    if (did < 2) { for (const a of A.filter(a => a.id).slice(0, 2)) {
        await get(`https://site.web.api.espn.com/apis/common/v3/sports/${p}/athletes/${a.id}/gamelog`, `${sp}-gamelog-${a.id}`);
        if (sp === 'nba' || sp === 'ncaab') await get(`https://site.web.api.espn.com/apis/common/v3/sports/${p}/athletes/${a.id}/gamelog?season=2026`, `${sp}-gamelog-${a.id}-s2026`); }
      did++; } }
  for (const d of ['20261016', '20261015', '20261011', '20261005']) { const sb = await get(`https://site.api.espn.com/apis/site/v2/sports/${p}/scoreboard?dates=${d}${GRP[sp] || ''}&limit=300`, `${sp}-scoreboard-${d}`, false);
    const ev = ((sb || {}).events || []).find(e => { const t = (((e.competitions || [])[0] || {}).status || e.status || {}).type || {}; return t.completed || t.state === 'post'; });
    if (ev) { await get(`https://site.api.espn.com/apis/site/v2/sports/${p}/summary?event=${ev.id}`, `${sp}-summary-${ev.id}`); meta.push({ name: `${sp}-final`, d, id: ev.id, short: ev.shortName, season: ev.season }); break; } } }
fs.writeFileSync('diag/out/_meta.json', JSON.stringify(meta, null, 1)); console.log('done', meta.length);
