const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const doc=f=>fs.readFileSync(path.join(W,'intake',f),'utf8');
const ev=(id,d,a,h,sport)=>({id,date:d,season:{type:2},status:{type:{state:'pre',shortDetail:'7:00 PM'},period:0},competitions:[{competitors:[
  {homeAway:'away',team:{abbreviation:a[0],displayName:a[1],location:a[1].split(' ').slice(0,-1).join(' ')||a[1],name:a[1].split(' ').pop(),id:a[0]},score:'',linescores:[],records:[{summary:'0-0'}]},
  {homeAway:'home',team:{abbreviation:h[0],displayName:h[1],location:h[1].split(' ').slice(0,-1).join(' ')||h[1],name:h[1].split(' ').pop(),id:h[0]},score:'',linescores:[],records:[{summary:'0-0'}]}]}]});
function load(page,fetcher){
  let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const errors=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    w.fetch=u=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(fetcher(u)),text:()=>Promise.resolve('{}')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.key',JSON.stringify('K'));w.localStorage.setItem('d4.setupDone','1');w.localStorage.setItem('d4.nhlseed',JSON.stringify({}));
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-01T16:00:00Z')]))}static now(){return RD.parse('2026-10-01T16:00:00Z')}}w.Date=FD;
    w.addEventListener('error',e=>errors.push((e.error&&e.error.message)||e.message));}});
  return{w:dom.window,errors};
}
const txt=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
(async()=>{
  /* ───── NHL: 8 games, full game + 1st period puck line / moneyline / total ───── */
  const NH=[['TB','Tampa Bay Lightning','NYR','New York Rangers'],['PHI','Philadelphia Flyers','NJ','New Jersey Devils'],['BUF','Buffalo Sabres','CBJ','Columbus Blue Jackets'],
    ['MIN','Minnesota Wild','NSH','Nashville Predators'],['SEA','Seattle Kraken','CGY','Calgary Flames'],['CHI','Chicago Blackhawks','UTAH','Utah Mammoth'],
    ['EDM','Edmonton Oilers','VAN','Vancouver Canucks'],['FLA','Florida Panthers','SJ','San Jose Sharks']];
  const st=(ab,name)=>({team:{abbreviation:ab,displayName:name},stats:[{name:'gamesPlayed',value:82},{name:'pointsFor',value:250},{name:'pointsAgainst',value:250}]});
  const H=load('nhl.html',u=>/hockey\/nhl\/scoreboard/.test(u)?(/dates=\d{8}-\d{8}/.test(u)?{events:[]}:{season:{year:2027,type:2},events:NH.map((g,i)=>ev('9'+i,'2026-10-01T23:07Z',[g[0],g[1]],[g[2],g[3]]))}):
    /standings/.test(u)?{children:[{standings:{entries:NH.flatMap(g=>[st(g[0],g[1]),st(g[2],g[3])])}}]}:{});
  await wait(3500);const hw=H.w;
  const NP=hw.eval(`intakeParseGrammar(${JSON.stringify(doc('NHL_lines_sportsbetting_2026-10-01.txt'))},'nhl').nhl`);
  T('NHL doc: 8 games × 12 sides = 96 lines read, nothing left over',NP.picks.length===96&&!(NP.unread||[]).length,`${NP.picks.length} lines`);
  T('every NHL game has 1st-period ML + puck line + total',NH.every(g=>['p1ml','p1spread','p1total'].every(m=>NP.picks.filter(p=>p.game===g[0]+'@'+g[2]&&p.market===m).length===2)));
  hw.eval(`nhlPutLines(${JSON.stringify(NP.picks.map(p=>({...p,src:'mine',capturedAt:Date.now()})))})`);hw.eval('renderNHL()');await wait(300);
  const card=i=>{const h=hw.document.getElementById('slate').innerHTML;const a=NH[i][0],b=NH[i][2];const k=h.indexOf(`${a}`);return txt(h);};
  const slate=txt(hw.document.getElementById('slate').innerHTML);
  T('cards show the new 1ST PERIOD PUCK LINE and MONEYLINE sections (8 each)',(slate.match(/1ST PERIOD PUCK LINE/g)||[]).length===8&&(slate.match(/1ST PERIOD MONEYLINE/g)||[]).length===8,`${(slate.match(/1ST PERIOD PUCK LINE/g)||[]).length} / ${(slate.match(/1ST PERIOD MONEYLINE/g)||[]).length}`);
  T('TB@NYR P1 squares carry the book prices (+158 / -181, -135 / +115)',/1ST PERIOD PUCK LINE (REAL )?TB -0\.5[\s\S]{0,120}\+158[\s\S]{0,160}NYR \+0\.5[\s\S]{0,120}-181/.test(slate)&&/1ST PERIOD MONEYLINE[^R]*(REAL )?TB[\s\S]{0,80}-135[\s\S]{0,160}NYR[\s\S]{0,80}\+115/.test(slate),'');
  const s=hw.eval("nhlSimFor(NHL_GAMES[0])");
  const pw=hw.eval("(()=>{const s=nhlSimFor(NHL_GAMES[0]);return[s.p1Win('away')+s.p1Win('home'),s.p1Cover('away',0.5),s.p1Cover('home',-0.5),s.p1Win('home'),s.p1Tie]})()");
  T('period model is coherent: ML chances sum to 1; +0.5 > ML > -0.5 sides line up',Math.abs(pw[0]-1)<1e-9&&pw[1]>0.5&&pw[2]<0.5&&pw[4]>0.15&&pw[4]<0.45,JSON.stringify(pw.map(x=>+x.toFixed(3))));
  T('tie chance shown on the card (period ML pushes on a tie)',/MONEYLINE · tie \d+% \(push\)/.test(slate));
  T('NHL: no uncaught errors',H.errors.length===0,H.errors.slice(0,2).join('|'));
  /* ───── CFB: full game + 1st half + 1st quarter, incl. Pk ───── */
  const CF=[['WKU','Western Kentucky Hilltoppers','NMSU','New Mexico State Aggies'],['UNT','North Texas Mean Green','TLSA','Tulsa Golden Hurricane']];
  const C=load('cfb.html',u=>/college-football\/scoreboard/.test(u)?{events:CF.map((g,i)=>ev('8'+i,'2026-10-02T00:00Z',[g[0],g[1]],[g[2],g[3]]))}:{});
  await wait(3500);const cw=C.w;
  const CP=cw.eval(`intakeParseGrammar(${JSON.stringify(doc('CFB_lines_sportsbetting_2026-10-01.txt'))},'ncaaf').ncaaf`);
  const key=CP.picks.length?CP.picks[0].game:'';
  T('CFB doc: 30 lines read (16 + 14), teams resolved to the board',CP.picks.length===30&&CP.picks.every(p=>p.game==='WKU@NMSU'||p.game==='UNT@TLSA'),`${CP.picks.length} · ${[...new Set(CP.picks.map(p=>p.game))].join(',')}`);
  const mk=(g,m)=>CP.picks.filter(p=>p.game===g&&p.market===m).map(p=>p.side+':'+(p.line!=null?p.line+' ':'')+p.price).join(' ');
  T('WKU 1H ML +100 / -120 and Q1 spread +0.5 -140 / -0.5 +120',mk('WKU@NMSU','h1ml')==='away:100 home:-120'&&mk('WKU@NMSU','q1spread')==='away:0.5 -140 home:-0.5 120',mk('WKU@NMSU','h1ml')+' | '+mk('WKU@NMSU','q1spread'));
  T('UNT@TLSA pick\'em lines read as 0 (Pk)',mk('UNT@TLSA','h1spread')==='away:0 -125 home:0 105'&&mk('UNT@TLSA','q1spread')==='away:0 -110 home:0 -110',mk('UNT@TLSA','h1spread'));
  cw.eval(`saveNCAAFBookOdds(${JSON.stringify(CP.picks)},null)`);cw.eval('renderNCAAF()');await wait(400);
  const cs=txt(cw.document.getElementById('slate').innerHTML);
  T('CFB cards now have 1st Half and 1st Quarter sections',(cs.match(/1st Half/g)||[]).length>=2&&(cs.match(/1st Quarter/g)||[]).length>=2,`${(cs.match(/1st Half/g)||[]).length} / ${(cs.match(/1st Quarter/g)||[]).length}`);
  T('WKU 1H ML square shows +100, Q1 spread shows -140, Q1 total 13.5',/WKU 1H ML[\s\S]{0,140}\+100/.test(cs)&&/WKU Q1 \+0\.5[\s\S]{0,140}-140/.test(cs)&&/Q1 Over 13\.5/.test(cs));
  T('Pk lines display as "Pk", tied-quarter push % shown',/UNT 1H Pk/.test(cs)&&/tied quarter \d+% \(push on Pk\/ML\)/.test(cs));
  const pm=cw.eval(`(()=>{const g=NCAAF_GAMES[0];const s=NCAAF_SIMS[g.id]||ncaafSimFor&&ncaafSimFor(g);const M=fbPeriodModel(s,'ncaaf','q1');return[M.ml('away')+M.ml('home'),M.cover('away',0)+M.cover('home',0),M.cover('away',0.5)>M.ml('away')]})()`);
  T('period math: two-way ML and Pk chances each sum to 1; +0.5 beats the ML',Math.abs(pm[0]-1)<1e-9&&Math.abs(pm[1]-1)<1e-9&&pm[2]===true,JSON.stringify(pm));
  T('CFB: no uncaught errors',C.errors.length===0,C.errors.slice(0,2).join('|'));
  /* ───── MLB: first-5 lands ───── */
  const M=load('mlb.html',()=>({}));await wait(2500);
  const MP=M.w.eval(`intakeParseGrammar(${JSON.stringify(doc('MLB_lines_sportsbetting_2026-10-01.txt'))},'mlb').mlb`);
  T('MLB doc: 12 lines incl. all 6 first-5 lines',MP.picks.length===12&&MP.picks.filter(p=>/^f5/.test(p.market)).length===6,`${MP.picks.length} · ${MP.picks.filter(p=>/^f5/.test(p.market)).map(p=>p.market+':'+p.side).join(',')}`);
  console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);
  process.exit(out.some(x=>x.startsWith('FAIL'))?1:0);
})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.stack);process.exit(1)});
