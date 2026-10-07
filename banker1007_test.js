const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const puts=[];
function boot(page,extraFetch){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-07T20:30:00Z')]))}static now(){return RD.parse('2026-10-07T20:30:00Z')}}w.Date=FD;
    w.fetch=(u,o)=>{u=String(u);if(extraFetch){const r=extraFetch(u,o);if(r)return r;}
      if(/api\.github\.com/.test(u)){if(o&&o.method==='PUT'){puts.push({u,body:JSON.parse(o.body)});return Promise.resolve({ok:true,status:201,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});}
        return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});}
      return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const w=boot('nhl.html');
setTimeout(async()=>{try{
  // ── roster ──
  const roster=w.eval('CHAR_ORDER.map(v=>[v,CHARS[v].label,CHARS[v].chip])');
  T('every character has a name and a word chip (no bare initials)',roster.every(([v,l,c])=>l&&c.replace(/[^A-Z]/g,'').length>=3),roster.map(r=>r[1]).join(', '));
  T('Covers is its own character',w.eval("!!CHARS.Covers&&CHAR_ORDER.includes('Covers')"));
  // character calls on a game: covers pred → Covers voice; crowd fade
  w.eval(`(()=>{const P=get('d4.preds',{});P.nhl={'2026-10-07':{'COL@WPG':{a:3.8,h:2.75,src:'covers'}}};set('d4.preds',P);
    set(INTEL_KEY,[{sp:'nhl',kind:'cons',game:'COL@WPG',market:'moneyline',metric:'bets',homePct:22,date:'2026-10-07'},
                   {sp:'nhl',kind:'cons',game:'COL@WPG',market:'total',metric:'bets',overPct:52,date:'2026-10-07'}]);})()`);
  const g={id:'g1',away:{abbr:'COL',name:'Colorado Avalanche'},home:{abbr:'WPG',name:'Winnipeg Jets'},__date:'2026-10-07'};
  const calls=w.eval(`(()=>{Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);return characterCalls('nhl',${JSON.stringify(g)},{aw:.62,hw:.38,awayProj:3.6,homeProj:2.8,modeScore:'3-2'})})()`);
  T('Covers prediction speaks as Covers (not "Pred")',calls.some(c=>c.voice==='Covers'&&c.market==='ml'&&c.side==='away')&&!calls.some(c=>c.voice==='Pred'));
  const crowd=calls.filter(c=>c.voice==='Consensus');
  T('the Crowd FADES a 78% public side (Levitt 2004)',crowd.some(c=>c.market==='ml'&&c.side==='home'),JSON.stringify(crowd.map(c=>c.market+':'+c.side+' '+(c.why||''))));
  T('the Crowd stays silent on a 52/48 split',!crowd.some(c=>c.market==='total'));
  w.eval(`set(INTEL_KEY,[{sp:'nhl',kind:'cons',game:'COL@WPG',market:'moneyline',metric:'bets',homePct:70,date:'2026-10-07'},{sp:'nhl',kind:'cons',game:'COL@WPG',market:'moneyline',metric:'money',homePct:85,date:'2026-10-07'}]);Object.keys(RO_CACHE).forEach(k=>delete RO_CACHE[k]);for(const k in CHAR_CACHE)delete CHAR_CACHE[k];`);
  const c2=w.eval(`characterCalls('nhl',${JSON.stringify({...g,id:'g2'})},{aw:.62,hw:.38,awayProj:3.6,homeProj:2.8,modeScore:'3-2'})`).filter(c=>c.voice==='Consensus');
  T('…but FOLLOWS money that runs 10+ points ahead of tickets (sharp side)',c2.some(c=>c.market==='ml'&&c.side==='home'&&/sharp/.test(c.why||'')));
  // ── honest meter / unanimous ──
  w.eval(`window.__C=[];characterCalls=()=>window.__C;`);
  const mk=v=>({voice:v,market:'ml',side:'home'});
  w.eval(`window.__C=${JSON.stringify(['Sim','Judge','Most common'].map(mk))}`);
  const a=w.eval(`charSquare('nhl',${JSON.stringify(g)},{aw:.4,hw:.6},'WPG ML',{price:-150})`);
  T('3 agreeing characters is never unanimous',a.unanimous===false);
  T('meter counts the whole roster and names who stayed silent',/3 of 8 on this side/.test(a.meter)&&/5 no call/.test(a.meter)&&/silent: .*Historian/.test(a.meter),a.meter.replace(/<[^>]+>/g,' ').slice(0,160));
  w.eval(`window.__C=${JSON.stringify(['Sim','Judge','Most common','Covers','Trends'].map(mk))}`);
  T('5 called, all agree, 2 independent → unanimous',w.eval(`charSquare('nhl',${JSON.stringify(g)},{aw:.4,hw:.6},'WPG ML',{price:-150}).unanimous`)===true);
  w.eval(`window.__C=${JSON.stringify(['Sim','Judge','Most common','Pred','Covers'].map(mk))}`);
  T('Oracle and Covers count as independent of the Sim',w.eval(`charSquare('nhl',${JSON.stringify(g)},{aw:.4,hw:.6},'WPG ML',{price:-150}).unanimous`)===true);
  // ── Judge shrink & Historian ──
  T('Judge: with no graded games, witnesses are weighted equally',w.eval(`(()=>{const g={id:'j',away:{abbr:'PHI',name:'Philadelphia Flyers'},home:{abbr:'TB',name:'Tampa Bay Lightning'}};localStorage.removeItem(BRAIN_KEY);const J=brainJudge(g,{aR:3.6,hR:4.1},'mlb');return J&&J.witnesses.every(x=>Math.abs(x.share-1/J.witnesses.length)<1e-9);})()`));
  T('Historian ignores 4-0 "trends" (n<5) and keeps a 7-1',w.eval(`(()=>{const L=['Over is 4-0 in Jets last 4 home games.','Over is 7-1 in Jets last 8 overall.'];const g={away:{abbr:'COL',name:'Colorado Avalanche'},home:{abbr:'WPG',name:'Winnipeg Jets'}};
    const save=brainAdapter;brainAdapter=sp=>({...save(sp),trends:()=>L.map(text=>({text}))});const r=brainTrendEvidence(g,'nhl');brainAdapter=save;return r.items.length===1&&r.items[0].rec==='7-1';})()`));
  // ── Banker ledger ──
  const ws=w.eval('bkWeekStart()');T('Banker weeks start Monday',ws==='2026-10-05',ws);
  const V=[];const add=(v,d,hit,price,m)=>V.push({id:v+d+V.length,voice:v,sp:'nhl',market:m||'ml',date:d,graded:true,hit,price});
  add('Coach','2026-10-05',true,100);add('Coach','2026-10-06',true,100);add('Coach','2026-10-06',false,-110);
  add('Judge','2026-10-05',false,-110);add('Judge','2026-10-06',null,-110);
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)});localStorage.removeItem(CPAR_KEY);`);
  const L=w.eval('bkLedger(true)');const C=L.weeks[0].R.Coach,J=L.weeks[0].R.Judge;
  /* Coach: 100 → +2 → 102 → +2.04 → 104.04 → −2.08 = 101.96 */
  T('Coach: 2% of the CURRENT roll each bet → $101.96',Math.abs(C.br-101.96)<0.011&&C.w===2&&C.l===1,String(C.br));
  T('Judge: loss −$2, push stakes nothing → $98.00',Math.abs(J.br-98)<0.011&&J.p===1,String(J.br));
  T('Banker gives no weight change without 30+ bets',L.mult.Coach===1);
  for(let i=0;i<40;i++)V.push({id:'x'+i,voice:'Coach',sp:'nhl',market:'ml',date:'2026-10-0'+(5+i%3),graded:true,hit:i%4!==0,price:100});
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)})`);const L2=w.eval('bkLedger(true)');
  T('a winning character (30+ bets) gets a louder voice, capped ×1.4',L2.mult.Coach>1&&L2.mult.Coach<=1.4,String(L2.mult.Coach));
  T('charWeight includes the Banker\'s multiplier',/bankerMult\(voice\)/.test(w.eval('charWeight.toString()')));
  // ── sizing ──
  const s1=w.eval(`bkSize([{p:.6,dec:1.91},{p:.6,dec:1.91},{p:.6,dec:1.91},{p:.45,dec:1.91},{p:.45,dec:1.91}],2,5)`);
  T('Banker stops adding legs once they cut growth (3 strong legs, not 5)',s1.k===3&&s1.g>0,JSON.stringify({k:s1.k,g:+s1.g.toFixed(5)}));
  const s2=w.eval(`bkSize([{p:.5,dec:1.91},{p:.5,dec:1.91},{p:.5,dec:1.91}],2,3)`);
  T('no +EV length → shortest (least-bad) parlay, zero stake',s2.k===2&&s2.f===0);
  // ── character parlays sized by the Banker + slate ──
  const td=w.eval('today()');const V2=[];const games=['A@B','C@D','E@F','G@H','I@J','K@L'];
  ['Coach','Judge','Sim'].forEach((v,vi)=>{for(let i=0;i<14;i++)V2.push({id:v+'h'+i,voice:v,sp:'nhl',market:'ml',side:'home',date:'2026-09-'+String(10+i).padStart(2,'0'),game:'Z@Y',graded:true,hit:i<10});
    games.forEach((g0,i)=>V2.push({id:v+g0,voice:v,sp:'nhl',market:'ml',side:'home',date:td,game:g0,price:vi===2&&i<3?-105:120,pick:g0.split('@')[1]+' ML'}));});
  w.eval(`set(VOICES_KEY,${JSON.stringify(V2)});set(TC_KEY,{d:today(),by:{}});set(LS_EVAL,{});localStorage.removeItem(CPAR_KEY);set(BR_AMT,'100');BK_C=null;`);
  const pb=w.eval(`cparBuild('Coach')`);
  T('character parlay length chosen by the Banker, with his reason',pb&&pb.size&&pb.legs.length===pb.size.k&&/Kelly/.test(pb.size.why),pb&&pb.size.why);
  const S=w.eval('bkSlate()');
  T('Banker\'s slate: up to 5 parlays, each +growth',S.picks.length>=1&&S.picks.length<=5&&S.picks.every(x=>x.g>0),S.picks.map(x=>x.v+' '+x.P.legs.length).join(', '));
  T('slate never risks more than 10% of the bankroll in total',S.picks.reduce((a,x)=>a+x.stakeF,0)<=0.1001);
  T('no two parlays on the slate share more than one leg',S.picks.every((a,i)=>S.picks.every((b,j)=>i===j||[...a.keys].filter(k=>b.keys.has(k)).length<=1)));
  // ── challenges ──
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)});BK_C=null;`);
  const C3=w.eval('bkChallenges()');
  T('Banker writes challenges from the standings',C3.some(t=>t.id==='bk_table')&&C3.some(t=>t.id==='bk_hot'),C3.map(t=>t.name).join(' | '));
  w.eval(`set(MS_KEY,[]);msStart('bk_hot')`);const m=w.eval('msAll()[0]');
  T('a Banker challenge starts like any other, with its character rule',m&&/^ch_/.test(m.rule)&&!!w.eval(`MS_FILTERS['${m.rule}']`),m&&m.rule);
  // ── UI ──
  w.eval(`if(!document.getElementById('todayBody')){const d=document.createElement('div');d.id='todayBody';document.body.appendChild(d);}set(TC_KEY,{d:today(),by:{nhl:{ts:Date.now(),picks:[],props:[]}}});set(TF_KEY,{view:'chars'});renderToday(true);`);
  const hub=w.document.getElementById('todayBody').innerHTML;
  T('Characters hub: Banker standings, slate, named roster, parlays',/The Banker/.test(hub)&&/The characters/.test(hub)&&/The Historian/.test(hub)&&/The Crowd/.test(hub)&&/Character parlays/.test(hub));
  // ── public feed ──
  w.eval(`localStorage.removeItem(BEST5_KEY);set(LS_EVAL,{date:today()});set(TC_KEY,{d:today(),by:{nhl:{ts:Date.now(),picks:[
    {game:'C@D',m:'ml',sd:'home',pick:'D ML',price:-120,color:' supreme',chars:['Sim','Judge'],blend:.6,evCal:4,start:today()+'T23:59:00-05:00'}],props:[]}}});
    set(LS.ghtoken,'tok');set(LS.ghrepo,'ironsilkstrategies/ironsilk-weekly');set('d4.sublink','https://whop.com/thedesk');set(LS.handle,'@DLinkPicks');`);
  const F=w.eval('publicFeed()');
  T('public feed: locked card, record, handle, subscribe link',F.today&&F.today.picks[0].pick==='D ML'&&F.subscribe==='https://whop.com/thedesk'&&F.handle==='@DLinkPicks'&&F.record);
  T('public feed names the analysts, not initials',F.today.picks[0].voices.includes('The Judge'));
  const r=await w.eval('publishPicks(false)');
  T('publish writes public/picks.json and a dated archive to the repo',r.ok&&puts.some(p=>/public\/picks\.json$/.test(p.u))&&puts.some(p=>/public\/picks-2026-10-07\.json$/.test(p.u)));
  // picks.html renders the feed
  const feed=JSON.parse(Buffer.from(puts.find(p=>/picks\.json$/.test(p.u)).body.content,'base64').toString());
  const pg=boot('picks.html',u=>/public\/picks\.json/.test(u)?Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(feed)}):null);
  setTimeout(()=>{const h=pg.document.body.innerHTML;
    T('public page shows the card, the record and the subscribe button',/D ML/.test(h)&&/-120/.test(h)&&/record/.test(h)&&/whop\.com\/thedesk/.test(h)&&/@DLinkPicks/.test(h));
    console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);},1500);
}catch(e){T('harness',false,e.stack.split('\n').slice(0,4).join(' | '));console.log(out.join('\n'));process.exit(0);}},3500);
