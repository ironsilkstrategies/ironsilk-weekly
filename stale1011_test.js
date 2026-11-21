const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const urls=[];
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-11T14:34:00Z')]))}static now(){return RD.parse('2026-10-11T14:34:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=u=>{urls.push(String(u));return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({events:[]}),text:()=>Promise.resolve('')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  const night=Date.parse('2026-10-11T02:00:00Z'),finalTs=Date.parse('2026-10-11T04:40:00Z');
  /* last night: the page saw UAB@MEM live at 13-31, then the phone slept; the final (13-38) was stored later */
  w.eval(`set(LS.allfinals,{'ncaaf:UAB@MEM':{sport:'ncaaf',d:'2026-10-10',a:13,h:38,ts:${finalTs},src:'espn'},'ncaaf:UGA@ALA':{sport:'ncaaf',d:'2026-10-10',a:20,h:17,ts:${finalTs},src:'espn'}});ALLF_C=null;
    MG_LIVE={ncaaf:{[mgKey('ncaaf','UAB@MEM')]:[{date:'2026-10-10',state:'in',a:13,h:31,detail:'Q4 5:00',fetchedAt:${night}}],[mgKey('ncaaf','UGA@ALA')]:[{date:'2026-10-10',state:'in',a:17,h:17,detail:'Q4',fetchedAt:${night}}]}};`);
  const e=w.eval(`mgEventFor('ncaaf','UAB@MEM','2026-10-10',false)`);
  T('a stored final beats last night\'s cached "live" snapshot',e.state==='post'&&e.a===13&&e.h===38,JSON.stringify({s:e.state,a:e.a,h:e.h}));
  const g=w.eval(`gradeLeg({sport:'ncaaf',game:'UAB@MEM',pick:'MEM -12.5',gameDate:'2026-10-10'},'2026-10-10')`);
  T('MEM -12.5 grades as a WIN (38-13), not "live 60%"',g&&g.hit===true&&!g.live,JSON.stringify(g&&{hit:g.hit,live:g.live}));
  const g2=w.eval(`gradeLeg({sport:'ncaaf',game:'UGA@ALA',pick:'Over 49.5',gameDate:'2026-10-10'},'2026-10-10')`);
  T('UGA@ALA Over 49.5 grades as a LOSS (37 total)',g2&&g2.hit===false&&!g2.live);
  const n=w.eval('clearStaleFromFinals()');
  T('a stale cached "in progress" event can no longer delete a real final',n===0&&!!w.eval(`get(LS.allfinals,{})['ncaaf:UAB@MEM']`));
  w.eval(`MG_LIVE.ncaaf[mgKey('ncaaf','UAB@MEM')]=[{date:'2026-10-10',state:'in',a:13,h:31,fetchedAt:${finalTs+60000}}]`);
  T('…but a FRESHER live event still corrects a wrong final',w.eval('clearStaleFromFinals()')===1);
  /* refresh refetches days whose cache still says "in progress" */
  w.eval(`set(LS.locked,[]);MG_LIVE={ncaaf:{x:[{date:'2026-10-10',state:'in',a:1,h:2,fetchedAt:${night}}]}}`);urls.length=0;
  await w.eval('mgRefresh(true)');
  T('scores refresh refetches yesterday when its games were left "in progress"',urls.some(u=>/college-football\/scoreboard\?dates=20261010/.test(u)),urls.filter(u=>/scoreboard/.test(u)).join(' | ').slice(0,200));
  /* My Games drops settled / dead tickets */
  w.eval(`set(LS.allfinals,{'ncaaf:UGA@ALA':{sport:'ncaaf',d:'2026-10-10',a:20,h:17,ts:${finalTs}},'ncaaf:UAB@MEM':{sport:'ncaaf',d:'2026-10-10',a:13,h:38,ts:${finalTs}}});ALLF_C=null;MG_LIVE={};
    set(LS.locked,[{id:'dead',date:'2026-10-10',source:'mine',legs:[{sport:'ncaaf',game:'UGA@ALA',pick:'Over 49.5',price:-155,gameDate:'2026-10-10'},{sport:'ncaaf',game:'KU@UTAH',pick:'UTAH -12.5',price:-155,gameDate:'2026-10-10'}]},
      {id:'alive',date:'2026-10-11',source:'mine',legs:[{sport:'ncaaf',game:'UAB@MEM',pick:'MEM -12.5',price:-153,gameDate:'2026-10-10'},{sport:'nfl',game:'NYG@WSH',pick:'WSH ML',price:-190,gameDate:'2026-10-11'}]}])`);
  const mb=w.document.getElementById('mineBody')||(()=>{const d=w.document.createElement('div');d.id='mineBody';w.document.body.appendChild(d);return d;})();
  w.eval('renderMyGames()');const H=mb.innerHTML;
  T('My Games drops a ticket that already lost a leg',!/UGA|KU@UTAH|UTAH -12\.5/.test(H),'');
  T('…and keeps an open ticket, its finished leg showing the real final',/WSH ML/.test(H)&&/MEM -12\.5/.test(H)&&/UAB <b>13<\/b> – <b>38<\/b> MEM/.test(H));
  T('returning to the app after 5+ minutes refreshes scores',/MG_HIDDEN_AT&&Date\.now\(\)-MG_HIDDEN_AT>5\*60e3/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8')));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},3000);
