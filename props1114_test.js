/* v3.0.20 · the Props board in the public feed: per prop, his last 10 at that stat, L5/L10 hit rates, streak, tonight's opponent,
   the characters with it, fair odds. Combos (P+R+A) add up from the game log. No method. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(path.join(W, 'nhl.html'), 'utf8');
html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-15T18:00:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nhl.html', pretendToBeVisual: true, beforeParse(x) { const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  w.eval(`(()=>{const D=pstDb('nhl');const K=Object.keys(PST_STATS.nhl);const sog=[1,4,3,2,5,3,4,3,6,3];
    D.p[pstId('Kirill Kaprizov')]={name:'Kirill Kaprizov',team:'MIN',n:30,s:{},r:sog.map((v,i)=>[261101+i,...K.map(k=>k==='s'?v:k==='pts'?1:0)])};
    const B=pstDb('nba');const KB=Object.keys(PST_STATS.nba);B.p[pstId('Anthony Edwards')]={name:'Anthony Edwards',team:'MIN',n:30,s:{},r:[0,1,2,3,4].map(i=>[261101+i,...KB.map(k=>k==='pts'?20+i:k==='reb'?5:k==='ast'?4:0)])};
    cpropToday=()=>[{sp:'nhl',voice:'Coach',player:'Kirill Kaprizov',team:'MIN',k:'s',thr:3,side:'over',p:0.74,cal:0.72},{sp:'nhl',voice:'Sim',player:'Kirill Kaprizov',team:'MIN',k:'s',thr:3,side:'over',p:0.78,cal:0.76},
      {sp:'nba',voice:'Judge',player:'Anthony Edwards',team:'MIN',k:'pra',thr:30,side:'over',p:0.7,cal:0.7}];
    cpropOpp=(sp,t)=>({opp:sp==='nhl'?'CHI':'DAL',home:true,g:{date:'2026-11-16T01:00:00Z'}});PUB_PROPS_MEMO=null;})()`);
  const P = w.eval('pubProps()'); const kp = P.props[0], ae = P.props.find(x => x.player === 'Anthony Edwards');
  T('two characters on Kaprizov 3+ SOG: first, with both reads', kp.player === 'Kirill Kaprizov' && kp.votes === 2 && kp.by[0].v === 'Sim', JSON.stringify(kp.by));
  T('his last 10 at shots: bars, L5 5/5, L10 8/10, a 6-game streak', JSON.stringify(kp.last) === '[1,4,3,2,5,3,4,3,6,3]' && kp.l5.join() === '5,5' && kp.l10.join() === '8,10' && kp.streak === 6, JSON.stringify([kp.l5, kp.l10, kp.streak]));
  T('tonight: home vs CHI, fair odds from the characters\' average (74% → -285)', kp.opp === 'CHI' && kp.home === true && kp.fair === -285, JSON.stringify([kp.opp, kp.fair]));
  T('combos add up from the log: Edwards P+R+A 29..33, over 30 → 3 of 5', JSON.stringify(ae.last) === '[29,30,31,32,33]' && ae.l10.join() === '4,5', JSON.stringify(ae));
  const F = w.eval('publicFeedCore(false)');
  T('the beta feed carries it; no method words', F.props && F.props.props.length === 2 && !/mu"|model|sim\b|edge|brain/i.test(JSON.stringify(F.props).replace(/"Sim"/g, '')));
} catch (e) { T('no crash', false, String(e && e.stack || e).slice(0, 500)); }
const f = out.filter(x => x.startsWith('FAIL')).length; console.log(out.join('\n')); console.log(`${out.length - f} pass / ${f} fail`); process.exit(f ? 1 : 0); }, 2500);
