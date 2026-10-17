/* probe 2: which team-id / roster URLs carry CORS (the /teams?limit=1000 list does not) */
import fs from 'fs';
fs.mkdirSync('diag/out2', { recursive: true }); const meta = [];
async function get(url, name, keep) { try { const r = await fetch(url, { headers: { Origin: 'https://ironsilkweekly.com' } }); const t = await r.text();
    let j = null; try { j = JSON.parse(t); } catch (e) { }
    meta.push({ name, url, status: r.status, acao: r.headers.get('access-control-allow-origin'), bytes: t.length, keys: j && typeof j === 'object' ? Object.keys(j).slice(0, 12) : null,
      athletes: j && Array.isArray(j.athletes) ? j.athletes.length : null, team: j && j.team ? { id: j.team.id, abbr: j.team.abbreviation } : null });
    if (keep) fs.writeFileSync('diag/out2/' + name + '.json', t); return j; } catch (e) { meta.push({ name, url, error: String(e) }); return null; } }
const B = 'https://site.api.espn.com/apis/site/v2/sports';
const P = { nba: 'basketball/nba', ncaab: 'basketball/mens-college-basketball', nfl: 'football/nfl', ncaaf: 'football/college-football', nhl: 'hockey/nhl', mlb: 'baseball/mlb' };
const AB = { nba: 'bos', ncaab: 'duke', nfl: 'kc', ncaaf: 'ala', nhl: 'col', mlb: 'lad' };
for (const sp of Object.keys(P)) { const p = P[sp], ab = AB[sp];
  await get(`${B}/${p}/teams`, `${sp}-teams-plain`);
  await get(`${B}/${p}/teams?limit=50`, `${sp}-teams-50`);
  await get(`${B}/${p}/teams/${ab}`, `${sp}-team-by-abbr`, sp === 'nba');
  await get(`${B}/${p}/teams/${ab}/roster`, `${sp}-roster-by-abbr`);
  await get(`${B}/${p}/teams/${ab.toUpperCase()}/roster`, `${sp}-roster-by-ABBR`);
  await get(`https://site.web.api.espn.com/apis/site/v2/sports/${p}/teams?limit=1000`, `${sp}-teams-web`);
  await get(`https://site.api.espn.com/apis/v2/sports/${p}/standings`, `${sp}-standings`); }
await get('https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/teams?limit=50', 'nba-core-teams');
await get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/2/roster', 'nba-roster-by-id-2');
fs.writeFileSync('diag/out2/_meta.json', JSON.stringify(meta, null, 1)); console.log('done', meta.length);
