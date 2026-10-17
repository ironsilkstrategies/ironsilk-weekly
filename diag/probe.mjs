/* probe 3: CORS on the remaining endpoint types + batter / QB game logs */
import fs from 'fs';
fs.mkdirSync('diag/out3', { recursive: true }); const meta = [];
async function get(url, name, keep) { try { const r = await fetch(url, { headers: { Origin: 'https://ironsilkweekly.com' } }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { }
    meta.push({ name, url, status: r.status, acao: r.headers.get('access-control-allow-origin'), bytes: t.length, keys: j && typeof j === 'object' ? Object.keys(j).slice(0, 14) : null });
    if (keep) fs.writeFileSync('diag/out3/' + name + '.json', t); return j; } catch (e) { meta.push({ name, url, error: String(e) }); return null; } }
const B = 'https://site.api.espn.com/apis/site/v2/sports', W3 = 'https://site.web.api.espn.com/apis/common/v3/sports';
await get(`${B}/football/nfl/teams/12/depthcharts`, 'nfl-depthcharts');
await get(`${B}/football/nfl/teams/kc/schedule?season=2025`, 'nfl-schedule');
await get(`${B}/hockey/nhl/teams/col/schedule?season=2026`, 'nhl-schedule');
await get(`${B}/basketball/nba/teams/bos/schedule?season=2026`, 'nba-schedule');
await get(`${B}/football/college-football/standings?season=2026`, 'ncaaf-site-standings');
await get(`${B}/football/college-football/rankings`, 'ncaaf-rankings');
await get(`${B}/basketball/mens-college-basketball/rankings`, 'ncaab-rankings');
await get(`${W3}/football/nfl/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=false&page=1&limit=50&category=offense:passing&season=2026&seasontype=2`, 'nfl-byathlete');
await get(`${W3}/hockey/nhl/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=false&page=1&limit=50&season=2027&seasontype=2`, 'nhl-byathlete');
await get(`${W3}/basketball/nba/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=false&page=1&limit=50&season=2026&seasontype=2`, 'nba-byathlete');
/* batter, QB, CFB QB, NHL forward, NBA star logs (season defaults + last season for NBA) */
const R = async (p, ab) => { const j = await get(`${B}/${p}/teams/${ab}/roster`, `roster-${ab}`); const out = []; ((j || {}).athletes || []).forEach(g => { if (Array.isArray(g.items)) g.items.forEach(a => out.push(a)); else out.push(g); }); return out; };
const pick = async (p, ab, re, n, tag) => { const A = (await R(p, ab)).filter(a => re.test(String((a.position || {}).abbreviation || ''))).slice(0, n);
  for (const a of A) await get(`${W3}/${p}/athletes/${a.id}/gamelog`, `${tag}-gamelog-${a.id}`, true);
  return A.map(a => ({ id: a.id, name: a.displayName, pos: (a.position || {}).abbreviation })); };
meta.push({ picked: await pick('baseball/mlb', 'lad', /^(C|1B|2B|3B|SS|LF|CF|RF|DH|OF)$/, 2, 'mlb-bat') });
meta.push({ picked: await pick('football/nfl', 'kc', /^QB$/, 1, 'nfl-qb') });
meta.push({ picked: await pick('football/college-football', 'ala', /^QB$/, 1, 'ncaaf-qb') });
meta.push({ picked: await pick('hockey/nhl', 'col', /^(C|LW|RW)$/, 1, 'nhl-f') });
const nb = await R('basketball/nba', 'den'); const jok = nb.find(a => /Joki/.test(a.displayName)); if (jok) { await get(`${W3}/basketball/nba/athletes/${jok.id}/gamelog`, `nba-star-gamelog-${jok.id}`, true); meta.push({ star: jok.displayName, id: jok.id, injuries: jok.injuries, status: jok.status }); }
/* injuries as the roster shows them: a few NBA teams */
for (const ab of ['bos', 'lal', 'mil']) { const A = await R('basketball/nba', ab); meta.push({ team: ab, injured: A.filter(a => (a.injuries || []).length).map(a => ({ n: a.displayName, inj: a.injuries.map(i => ({ s: i.status, d: i.date, t: i.type && i.type.description, det: i.details && i.details.type })) })) }); }
fs.writeFileSync('diag/out3/_meta.json', JSON.stringify(meta, null, 1)); console.log('done', meta.length);
