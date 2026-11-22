/* v3.1.9 · Nov 22, Chris (Team Scout's BUF ML −1600, KC ML −1600, BC ML −9000, MEM ML −4500 legs): "we don't pick under -500 bets
   on this feature so -600 and under is no longer an option in this feature challenge" and "no line no pick… that goes for all
   features." From Nov 22 the Team Parlay Challenge never puts a leg shorter than −500 on a team ticket; the character's next best
   call goes instead. No leg without a real book line, ever. Days before Nov 22 stay as played; the Lab replays under today's rule. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const W = '/home/claude/work'; const out = []; const T = (n, ok, d) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
let html = fs.readFileSync(W + '/nfl.html', 'utf8').replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(W + '/' + f, 'utf8')}</script>`);
const NOW = Date.parse('2026-11-22T18:00:00Z');
const w = new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nfl.html', pretendToBeVisual: true, beforeParse(x) {
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD;
  x.__NO_GRADELOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true; x.__NO_SYNC_LOOP__ = true; x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
setTimeout(() => { try {
  /* the same two days for two characters: the 20th (before the rule) and the 22nd (today) */
  w.eval(`(()=>{const V=[];let i=0;const c=(v,d,sp,game,market,side,pick,price,cf,extra)=>V.push({id:'t'+(i++),voice:v,sp,date:d,game,market,side,pick,price,line:null,cf,graded:false,hit:null,...(extra||{})});
    for(const d of ['2026-11-20','2026-11-22']){
      c('Scout',d,'nfl','MIA@BUF','ml','home','BUF ML',-1600,0.97);c('Scout',d,'nfl','ARI@KC','ml','home','KC ML',-1600,0.96);c('Scout',d,'nfl','LV@DEN','ml','home','DEN ML',-550,0.95);
      c('Scout',d,'nfl','NE@NYJ','ml','away','NE ML',-500,0.90);c('Scout',d,'nfl','SEA@LAR','spread','away','SEA +3.5',-110,0.80);c('Scout',d,'nfl','GB@DET','total','under','Under 48.5',-110,0.78);
      c('Scout',d,'nfl','PHI@DAL','ml','home','DAL ML',-105,0.99,{simLine:true});   /* no real line: never on a ticket */
      c('Sim',d,'ncaab','NJIT@BC','ml','home','BC ML',-9000,0.96);c('Sim',d,'ncaab','EVAN@MEM','ml','home','MEM ML',-4500,0.95);
      c('Sim',d,'ncaab','CSUF@PRST','ml','home','PRST ML',-198,0.70);c('Sim',d,'ncaab','RICE@LAM','total','under','Under 164.5',-108,0.69);
      for(let k=0;k<12;k++)c('Sim',d,'ncaab','Z'+k+'@Y'+k,'ml','home','Y'+k+' ML',-700-k*100,0.94-k*0.001);}   /* a dozen more chalk games above its playable calls */
    set(VOICES_KEY,V);TM_TOP=null;TM_POOL=null;})()`);
  const legs = (d, all) => w.eval(`tmDay(['Scout','Sim'],'${d}',null,${all ? 'true' : 'false'}).map(x=>x.v+' '+x.c.pick+' '+x.c.price)`);
  const today = legs('2026-11-22'), before = legs('2026-11-20'), lab = legs('2026-11-20', true);
  T('today: no leg shorter than −500 on a team ticket (no BUF/KC −1600, DEN −550, BC −9000, MEM −4500)', today.length === 4 && !today.some(x => /-1600|-550|-9000|-4500/.test(x)), JSON.stringify(today));
  T('…each character\'s next best calls go instead (the Scout\'s NE ML −500 and SEA +3.5, the Simulator\'s PRST ML −198 and Under 164.5)', JSON.stringify(today) === JSON.stringify(['Scout NE ML -500', 'Scout SEA +3.5 -110', 'Sim PRST ML -198', 'Sim Under 164.5 -108']), JSON.stringify(today));
  T('…−500 itself still plays (the line is "shorter than −500")', today.includes('Scout NE ML -500'));
  T('no line, no pick: the Scout\'s 99% DAL ML with no real line never goes on a ticket, on any day', ![...today, ...before, ...lab].some(x => /DAL ML/.test(x)), JSON.stringify(before));
  T('days before Nov 22 stay as they were played (this week\'s results and draft don\'t move)', JSON.stringify(before) === JSON.stringify(['Scout BUF ML -1600', 'Scout KC ML -1600', 'Sim BC ML -9000', 'Sim MEM ML -4500']), JSON.stringify(before));
  T('the Lab replays any day under today\'s rule', JSON.stringify(lab) === JSON.stringify(today), JSON.stringify(lab));
  T('a character whose top dozen calls are all chalk still finds its 2 playable legs (every game is searched, not just the top 10)', today.filter(x => /^Sim /.test(x)).length === 2);
  const r24 = w.eval(`TM_ROSTER('2026-11-24')`), r17 = w.eval(`TM_ROSTER('2026-11-17')`);
  T('from the Nov 24 draft, only characters still making calls can be drafted (the Blend, folded into the Brain, can\'t)', r24.includes('Scout') && r24.includes('Sim') && !r24.includes('Blend'), JSON.stringify(r24));
  T('…this week\'s draft keeps its teams (the rule starts with next week\'s)', r17.includes('Blend'), JSON.stringify(r17));
  /* the strength teams follow the same rule */
  const str = w.eval(`(()=>{const {P}=tmPool();const S={Scout:[{k:'nfl|ml'},{k:'nfl|spread'},{k:'nfl|total'}],Sim:[{k:'ncaab|ml'},{k:'ncaab|total'}]};return tmDayStr(['Scout','Sim'],'2026-11-22',P,S,false).map(x=>x.v+' '+x.c.pick+' '+x.c.price);})()`);
  T('the strength teams (each character in its best lanes) follow it too', str.length === 4 && !str.some(x => /-1600|-550|-9000|-4500|DAL ML/.test(x)), JSON.stringify(str));
  /* the card says it, and a lab saved under the old rule reads as not run */
  T('the challenge card states the rule', /No leg shorter than −500, and every leg on a real book line/.test(w.eval('teamHtml()')));
  w.eval(`set(TM_KEY,{ws:bkWeekStart(),ts:Date.now(),days:10,tried:1,top:[{tm:['Scout','Sim','Judge','Coach'],n:5,cash:1,near:0,lr:0.6,pnl:1,big:3}],imp:{},past:[]})`);
  T('a Parlay Lab saved under the old rule asks to be run again', /Runs on demand/.test(w.eval('tmLabHtml()')));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 500)); }
  console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`\n${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0); }, 3000);
