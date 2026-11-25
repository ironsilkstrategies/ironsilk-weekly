/* v3.5.18 · Nov 24, 7:33 PM, Chris: "The public app is glitching and so is the machine … it's not letting me type by prices in the machine
   … the glitch is reminiscent of the memory issue". Three causes, one test each way:
   1. TYPING — My Bets repainted itself every 20 s during games (and whenever a live pass or a box score landed), so the stake box being
      typed in was replaced mid-number. Timed repaints now wait while a box has the keyboard; the held one runs when it lets go. A box
      that redraws as you type in it still redraws at once. On an iPhone the page no longer zooms in when a box gets the keyboard.
   2. THE SEASON WALKS — once every final was fed, the player-stats and scout backfills still walked the whole season's scoreboards on
      every page load (college hoops: 50+ MB pulled and parsed per load). Caught up, they walk only the days since the last walk, at most
      once in 30 minutes, and rewrite their tables only when something changed.
   3. THE BOXES — every final box rewrote the whole season table (1.3 MB) and the scout ledger; the copies on disk are now written once
      the boxes stop landing. And the score-call check after a pass reuses what the pass held instead of parsing it all again. */
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const W = '/home/claude/work';
let pass = 0, fail = 0; const T = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  — ' + String(x ?? '').slice(0, 500))); };
let html = fs.readFileSync(path.join(W, 'nba.html'), 'utf8'); html = html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g, (m, f) => `<script>${fs.readFileSync(path.join(W, f), 'utf8')}</script>`);
const NOW = Date.parse('2026-11-25T01:00:00Z');
const mk = (ua) => new JSDOM(html, { runScripts: 'dangerously', url: 'https://ironsilkweekly.com/nba.html', pretendToBeVisual: true, beforeParse(x) {
  if (ua) Object.defineProperty(x.navigator, 'userAgent', { get: () => ua });
  const RD = x.Date; class FD extends RD { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } } x.Date = FD; x.__NO_GRADELOOP__ = true; x.__NO_SYNC_LOOP__ = true; x.__NO_REOPEN__ = true; x.__NO_BACKFILL__ = true;
  x.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); x.scrollTo = () => { }; x.alert = () => { }; x.confirm = () => true; x.localStorage.setItem('d4.setupDone', '1'); } }).window;
const w = mk(); const wi = mk('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1 jsdom');
const sleep = ms => new Promise(r => setTimeout(r, ms));
setTimeout(async () => { try {
  const E = s => w.eval(s), J = JSON.stringify;
  /* ── 1 · typing ── */
  E(`(()=>{const v=document.getElementById('v-tickets');const i=document.createElement('input');i.id='tkStakeT';i.className='stake-input';i.type='number';v.appendChild(i);
    const s=document.createElement('select');s.id='tkSelT';s.innerHTML='<option>a</option>';v.appendChild(s);
    const b=document.createElement('button');b.id='tkBtnT';v.appendChild(b);window.__rt=0;const o=renderTicketsRaw;renderTicketsRaw=function(){window.__rt++;return o.apply(this,arguments);};})()`);
  T('nothing has the keyboard: not typing', E('deskTyping()') === false);
  E(`document.getElementById('tkStakeT').focus()`);
  T('a stake box has the keyboard: typing (a select counts too, a button doesn\'t)', E('deskTyping()') === true && E(`(()=>{document.getElementById('tkSelT').focus();const a=deskTyping();document.getElementById('tkBtnT').focus();const b=deskTyping();document.getElementById('tkStakeT').focus();return a&&!b;})()`) === true);
  E(`window.__rt=0;renderTickets();`);
  T('a repaint of My Bets while its stake box is being typed in waits (nothing redrawn, the box keeps the keyboard)', E('window.__rt') === 0 && E(`DESK_HELD.has('tickets')`) === true && E(`document.activeElement.id`) === 'tkStakeT');
  E(`document.getElementById('tkStakeT').blur()`); await sleep(320);
  T('…and runs the moment the box lets go', E('window.__rt') === 1 && E('DESK_HELD.size') === 0, E('window.__rt'));
  E(`(()=>{const i=document.getElementById('tkStakeT');i.focus();window.__rt=0;i.oninput=()=>renderTickets();i.value='12';i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  T('a box that redraws as you type in it still redraws at once (its own typing asked for it)', E('window.__rt') === 1, E('window.__rt'));
  E(`(()=>{const x=document.createElement('input');x.id='outsideT';document.body.appendChild(x);x.focus();window.__rt=0;renderTickets();})()`);
  T('typing in a box outside My Bets doesn\'t hold My Bets', E('window.__rt') === 1, E('window.__rt'));
  E(`document.getElementById('outsideT').blur()`);
  const src = fs.readFileSync(path.join(W, 'shared.js'), 'utf8'), nhl = fs.readFileSync(path.join(W, 'nhl-engine.js'), 'utf8'), bb = fs.readFileSync(path.join(W, 'bball-engine.js'), 'utf8'), fb = fs.readFileSync(path.join(W, 'football-engine.js'), 'utf8'), core = fs.readFileSync(path.join(W, 'desk-core.js'), 'utf8');
  T('every timed repaint waits while a box has the keyboard: My Bets, the ticket sheet, Today, My Games, the bracket map, the MLB poll',
    /TICKETS_LIVE_TIMER=setInterval\(\(\)=>\{\s*if\(document\.hidden\|\|deskTyping\(\)\)return;/.test(src) && /TK_SHEET_T=setInterval\(\(\)=>\{if\(deskTyping\(\)\)return;/.test(src) && /TODAY_LIVE_TIMER=setInterval\(async\(\)=>\{if\(document\.hidden\|\|deskTyping\(\)\)return;/.test(src)
    && /'v-mine'\);if\(!v\|\|!v\.classList\.contains\('on'\)\|\|document\.hidden\|\|deskTyping\(\)\)return;/.test(src) && /BMAP\.T=setInterval\(\(\)=>\{if\(deskTyping\(\)\)return;/.test(src) && /LIVE_POLL=setInterval\(async\(\)=>\{\s*if\(deskTyping\(\)\)return;/.test(src));
  T('…the hockey, basketball and football boards and the slot board too', /ACTIVE_SPORT!=='nhl'\|\|\(typeof deskTyping==='function'&&deskTyping\(\)\)\)return;/.test(nhl) && /typeof deskTyping==='function'&&deskTyping\(\)&&!\(document\.activeElement&&document\.activeElement\.id==='bbQ-'\+sp\)\)return;/.test(bb)
    && (fb.match(/setInterval\(\(\)=>\{if\(typeof deskTyping==='function'&&deskTyping\(\)\)return;refresh(NFL|NCAAF)LiveScores\(\);\},90000\)/g) || []).length === 2 && /!slotMode\(\)\|\|\(typeof deskTyping==='function'&&deskTyping\(\)\)\)return;/.test(core));
  T('on an iPhone the page keeps its scale when a box gets the keyboard (no zoom on tap)', /maximum-scale=1/.test(wi.document.querySelector('meta[name="viewport"]').content), wi.document.querySelector('meta[name="viewport"]').content);
  T('…anywhere else the viewport is left alone', !/maximum-scale/.test(w.document.querySelector('meta[name="viewport"]').content));
  /* ── 2 · the season walks ── */
  E(`window.__urls=[];window.__ev=[{id:'e1',status:{type:{state:'post'}},competitions:[{competitors:[{team:{abbreviation:'DUKE'}},{team:{abbreviation:'UNC'}}]}]}];
    fetch=u=>{window.__urls.push(String(u));return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({events:window.__ev})});};
    window.__ps=0;const ops=pstSave;pstSave=function(){window.__ps++;return ops.apply(this,arguments);};`);
  const bfSet = (last, remaining) => E(`set('d4.pst.ncaab',{v:2,p:{},fed:{e1:1},bf:{from:'2026-10-08',last:'${last}',remaining:${remaining}}});delete PST_MEM.ncaab;delete PST_BF_AT.ncaab;window.__urls=[];window.__ps=0;`);
  bfSet('2026-11-24', 0); await E(`pstatBackfill('ncaab',6)`);
  let U = JSON.parse(E('JSON.stringify(window.__urls)'));
  T('caught up today: the walk asks only for yesterday and today (one call), not the season', U.length === 1 && /dates=20261123-20261124/.test(U[0]), J(U));
  T('…nothing new was fed, so the season table isn\'t rewritten', E('window.__ps') === 0, E('window.__ps'));
  E('window.__urls=[]'); await E(`pstatBackfill('ncaab',6)`);
  T('…opened again within half an hour: no walk at all', JSON.parse(E('JSON.stringify(window.__urls)')).length === 0, E('JSON.stringify(window.__urls)'));
  bfSet('2026-11-21', 0); await E(`pstatBackfill('ncaab',6)`); U = JSON.parse(E('JSON.stringify(window.__urls)'));
  T('caught up three days ago: from the day before that walk to today', U.length === 1 && /dates=20261120-20261124/.test(U[0]), J(U));
  T('…a new day moves the mark, so the table is saved once', E('window.__ps') === 1, E('window.__ps'));
  bfSet('2026-11-24', 5); await E(`pstatBackfill('ncaab',6)`); U = JSON.parse(E('JSON.stringify(window.__urls)'));
  T('still behind (finals left to feed): the full walk back through the season, as before (30 days for college hoops)', U.length >= 30 && U.some(u => /dates=20261026(&|$)/.test(u)), U.length + ' ' + U.slice(-2).join(' '));
  E(`set('d4.scout.ncaab',{v:1,p:{},t:{},fed:{e1:1},bf:{from:'2026-10-25',last:'2026-11-24',remaining:0}});delete SCOUT_MEM.ncaab;delete SCOUT_BF_AT.ncaab;window.__urls=[];`);
  await E(`scoutBackfill('ncaab',8)`); U = JSON.parse(E('JSON.stringify(window.__urls)'));
  T('the scout\'s walk too: caught up, yesterday and today only', U.length === 1 && /dates=20261123-20261124/.test(U[0]), J(U));
  /* ── 3 · the boxes ── */
  E(`delete PST_MEM.nba;set('d4.pst.nba',{v:2,p:{},fed:{},bf:null});window.__ps=0;`);
  const box = (g) => J({ state: 'post', date: '2026-11-24T01:00:00Z', teams: { BOS: { players: [{ name: 'Test Guard ' + g, MIN: '30', PTS: '20', REB: '5', AST: '7', '3PT': '2-5', STL: '1', BLK: '0', TO: '2' }] }, NYK: { players: [{ name: 'Test Wing ' + g, MIN: '28', PTS: '15', REB: '6', AST: '2', '3PT': '1-3', STL: '0', BLK: '1', TO: '1' }] } } });
  E(`pstatFeed('nba','g1',${box(1)});pstatFeed('nba','g2',${box(2)});`);
  T('two finals land: both are in the table at once (read from memory), nothing written yet', E('window.__ps') === 0 && E(`Object.keys(pstDb('nba').p).length`) === 4 && E(`!!pstDb('nba').fed.g2`) === true, E('window.__ps'));
  T('…their last-game lines are written right away (props grade off them in the same pass)', E(`Object.keys(get('d4.pstlast.nba',{})).length`) >= 4);
  await sleep(4300);
  T('…the boxes stop landing: the season table is written once', E('window.__ps') === 1 && Object.keys((JSON.parse(E(`JSON.stringify(get('d4.pst.nba',{}))`)).p) || {}).length === 4, E('window.__ps'));
  E(`pstatFeed('nba','g3',${box(3)});window.dispatchEvent(new Event('pagehide'));`);
  T('…and leaving the page writes a pending table at once', E('window.__ps') === 2 && E(`Object.keys(PST_SOON).length`) === 0, E('window.__ps'));
  /* the score-call check after a pass: inside the pass's transaction, from the ledger it held */
  const call = (voice, side) => ({ id: `nba|CLE@CHI|2026-11-25|${voice}|ml`, sp: 'nba', date: '2026-11-25', game: 'CLE@CHI', voice, market: 'ml', side, price: -150, pick: side === 'home' ? 'CHI ML' : 'CLE ML', cf: 0.72 });
  const sc = { 'nba|CLE@CHI|2026-11-25|Judge': { sp: 'nba', game: 'CLE@CHI', date: '2026-11-25', voice: 'Judge', a: 118, h: 112 } };
  E(`set(VOICES_KEY,${J([call('Judge', 'home')])});set(SCORECALL_KEY,${J(sc)});delete RO_CACHE[VOICES_KEY];delete RO_CACHE[SCORECALL_KEY];`);
  E(`window.__held=roGet(SCORECALL_KEY,{});`);
  T('on its own, the check bends a pre-game score to the character\'s pick and saves it (CHI ML → CHI wins)', E('scoreCallsReconcile()') === 1 && E(`(()=>{const x=get(SCORECALL_KEY,{})['nba|CLE@CHI|2026-11-25|Judge'];return x.h>x.a&&x.fixed===1;})()`) === true);
  T('…without touching the shared read-only copy it scanned', E(`(()=>{const x=window.__held['nba|CLE@CHI|2026-11-25|Judge'];return x.a===118&&x.h===112&&!x.fixed;})()`) === true);
  E(`set(SCORECALL_KEY,${J(sc)});`);
  const inTx = JSON.parse(E(`(()=>{scTxBegin();const n=scoreCallsReconcile(get(VOICES_KEY,[]));const stored=get(SCORECALL_KEY,{})['nba|CLE@CHI|2026-11-25|Judge'];const tx=SC_TX.L['nba|CLE@CHI|2026-11-25|Judge'];const dl=SC_TX.dl;scTxEnd();const after=get(SCORECALL_KEY,{})['nba|CLE@CHI|2026-11-25|Judge'];return JSON.stringify({n,stored,tx,dl,after});})()`));
  T('inside a pass, it fixes the copy the pass holds and the pass saves it once, at its end', inTx.n === 1 && inTx.stored.a === 118 && inTx.tx.h > inTx.tx.a && inTx.dl > 0 && inTx.after.h > inTx.after.a, J(inTx));
  T('the pass hands the check the ledger it just held (no second parse)', /finally\{try\{scoreCallsReconcile\(VLOG_V\);\}catch\(e\)\{\}VLOG_V=null;if\(own\)scTxEnd\(\);\}\}/.test(src) && /set\(VOICES_KEY,T\);\}VLOG_V=T;return n;/.test(src));
} catch (e) { T('test ran', false, String(e && e.stack || e).slice(0, 900)); }
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0); }, 3000);
