/* v2.99 · the wider prop board: combos built from their parts, unders, and the new stats read from box scores
   (QB interceptions / completions / attempts, rush attempts, sacks, tackles and picks for defenders, hockey blocks, hits and goalie saves). */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-13T18:00:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  /* a basketball player's game log: points, rebounds, assists → combos read from the parts */
  w.eval(`for(let i=0;i<8;i++)pstAdd('nba','Test Guard','MIN',{pts:24+(i%3),reb:6+(i%2),ast:5,fg3:3,stl:1,blk:0,to:3},'ev'+i,'2026-11-0'+(1+i%8))`);
  const J = w.eval(`(()=>{const P=pstDb('nba').p[pstId('Test Guard')];const S=pstStatOf(P,'pra');const j=pstProj('nba','Test Guard','pra');return{gp:S.gp,mean:S.sum/S.gp,mu:j&&j.mu,combo:S.combo}})()`);
  T('P+R+A is read from points, rebounds and assists (no new history needed)', J.combo === true && J.gp === 8 && Math.abs(J.mean - 36.375) < 0.01 && J.mu > 30, JSON.stringify(J));
  T('…and a finished game\'s P+R+A adds the parts; a plain stat reads itself', w.eval(`pstVal({pts:30,reb:10,ast:8},'pra')`) === 48 && w.eval(`pstVal({pts:30},'pts')`) === 30 && w.eval(`pstVal({pts:30},'pra')`) === null);
  T('the labels: "under 24.5 PTS+REB+AST" for an under, "3+ INT thrown" style for overs', w.eval(`cpropLine({player:'Test Guard',thr:25,k:'pra',side:'under'})`) === 'Test Guard under 24.5 PTS+REB+AST' && w.eval(`cpropLine({player:'QB One',thr:1,k:'pint'})`) === 'QB One 1+ INT thrown');
  T('the board widened: combos, turnovers, QB and defense props, hockey blocks / hits / saves', w.eval(`['pra','pr','pa','ra','sb','to'].every(k=>LIKELY_LADDER.nba[k])&&['ptd','pint','cmp','att','car','rtd','wtd','rry','pry','sk','tkl','dint'].every(k=>LIKELY_LADDER.nfl[k])&&['a','bs','ht','sv','ga'].every(k=>LIKELY_LADDER.nhl[k])`));
  T('unders only where the stat has room (never "no touchdown" / "no goal")', w.eval(`CPROP_UNDER.has('pra')&&CPROP_UNDER.has('sv')&&!CPROP_UNDER.has('td')&&!CPROP_UNDER.has('g')&&!CPROP_UNDER.has('sk')`));
  /* box scores → the new stats */
  const fb = { state: 'post', date: '2026-11-09T18:00:00Z', teamStats: { KC: { passing: [{ name: 'QB One', 'C/ATT': '24/35', YDS: '281', TD: '2', INT: '1' }], rushing: [{ name: 'RB One', CAR: '18', YDS: '92', TD: '1', LONG: '31' }], receiving: [{ name: 'WR One', REC: '7', YDS: '88', TD: '1', LONG: '42' }], kicking: [{ name: 'K One', FG: '3/4', XP: '2/2', PTS: '11' }], defensive: [{ name: 'DE One', TOT: '5', SACKS: '1.5' }], ints: [{ name: 'CB One', INT: '1' }] } } };
  w.eval(`pstatFeed('nfl','fbtest',${JSON.stringify(fb)})`);
  const L = w.eval(`get('d4.pstlast.nfl',{})`); const g = n => (L[w.eval(`pstId(${JSON.stringify(n)})`)] || {}).v || {};
  T('football boxes: completions, attempts and interceptions thrown for the QB; rush attempts; sacks and tackles; a defender\'s pick', g('QB One').cmp === 24 && g('QB One').att === 35 && g('QB One').pint === 1 && g('RB One').car === 18 && g('DE One').sk === 1.5 && g('DE One').tkl === 5 && g('CB One').dint === 1, JSON.stringify([g('QB One'), g('DE One'), g('CB One')]));
  T('…longest rush and reception, and the kicker\'s points and field goals', g('RB One').lry === 31 && g('WR One').lwy === 42 && g('K One').kpts === 11 && g('K One').fgm === 3, JSON.stringify([g('RB One'), g('K One')]));
  const hk = { state: 'post', date: '2026-11-09T01:00:00Z', teams: { MIN: { skaters: [{ name: 'Skater One', G: '1', A: '1', S: '4', BS: '2', HT: '3' }], goalies: [{ name: 'Goalie One', SA: '31', SV: '29', GA: '2' }] } } };
  w.eval(`pstatFeed('nhl','hktest',${JSON.stringify(hk)})`);
  const H = w.eval(`get('d4.pstlast.nhl',{})`); const h = n => (H[w.eval(`pstId(${JSON.stringify(n)})`)] || {}).v || {};
  T('hockey boxes: blocked shots and hits for skaters; saves and goals against for goalies', h('Skater One').bs === 2 && h('Skater One').ht === 3 && h('Goalie One').sv === 29 && h('Goalie One').ga === 2, JSON.stringify([h('Skater One'), h('Goalie One')]));
  /* an under grades as an under */
  w.eval(`set(CPROP_KEY,[{id:'u1',sp:'nba',voice:'Sim',player:'Test Guard',team:'MIN',k:'pra',thr:40,side:'under',p:.75,d:'2026-11-13',hit:null,mv:2},{id:'o1',sp:'nba',voice:'Sim',player:'Test Guard',team:'MIN',k:'pra',thr:30,p:.75,d:'2026-11-13',hit:null,mv:2}]);
    const last=get('d4.pstlast.nba',{});last[pstId('Test Guard')]={d:'2026-11-13',v:{pts:22,reb:7,ast:6}};set('d4.pstlast.nba',last);cpropGrade();`);
  const G = w.eval(`get(CPROP_KEY,[]).map(x=>[x.id,x.actual,x.hit])`);
  T('a P+R+A under 39.5 grades a 35 as a win, a 30+ over grades the same 35 as a win', JSON.stringify(G) === JSON.stringify([['u1', 35, true], ['o1', 35, true]]), JSON.stringify(G));
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 400)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 2500);
