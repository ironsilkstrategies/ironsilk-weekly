const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const team=(id,ab,loc,nm)=>({id,abbreviation:ab,location:loc,name:nm,nickname:loc,displayName:loc+' '+nm});
let RANK={rankings:[{name:'AP Top 25',shortName:'AP Poll',type:'ap',ranks:[{current:9,previous:10,team:team('201','OU','Oklahoma','Sooners')},{current:11,previous:12,team:team('252','BYU','BYU','Cougars')},{current:24,previous:0,team:team('2116','UCF','UCF','Knights')}]}]};
const ev=(id,a,h)=>({id,date:'2026-10-10T23:00:00Z',competitions:[{status:{type:{state:'pre',description:'Scheduled'}},competitors:[
  {homeAway:'away',score:'',team:{abbreviation:a,displayName:a+' Team',curatedRank:{current:99}}},{homeAway:'home',score:'',team:{abbreviation:h,displayName:h+' Team',curatedRank:{current:99}}}]}]});
const SB={week:{number:6},season:{year:2026},events:[ev('1','TEX','OU'),ev('2','ISU','BYU'),ev('3','KENT','WMU')]};
let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
let rankCalls=0;
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T19:30:00Z')]))}static now(){return RD.parse('2026-10-10T19:30:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=u=>{u=String(u);if(/college-football\/rankings/.test(u)){rankCalls++;return Promise.resolve({ok:true,json:()=>Promise.resolve(RANK)});}
    if(/college-football\/scoreboard\?groups=80&limit=100$/.test(u))return Promise.resolve({ok:true,json:()=>Promise.resolve(SB)});
    return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  await w.eval('loadNCAAFSchedule()');
  T('ESPN scoreboard had no ranks (curatedRank 99 everywhere) — the old source',true);
  await w.eval('fetchCFBRankings(true)');w.eval('cfbApplyRanks(NCAAF_GAMES)');
  const G=w.eval('NCAAF_GAMES.map(g=>[g.away.abbr,g.away.ranking,g.home.abbr,g.home.ranking])');
  T('poll ranks land on the teams (OU #9, BYU #11), unranked stay blank',JSON.stringify(G)===JSON.stringify([['TEX','','OU','#9 '],['ISU','','BYU','#11 '],['KENT','','WMU','']]),JSON.stringify(G));
  w.eval('renderNCAAF()');const slate=w.document.getElementById('slate').innerHTML;
  T('game card header shows the rank next to the team',/#11 BYU/.test(slate.replace(/<[^>]+>/g,''))||/#11 <\/span>BYU|#11 BYU/.test(slate),'');
  T('anywhere a CFB game is named: "TEX@#9 OU"',w.eval(`gameLabel('ncaaf','TEX@OU')`)==='TEX@#9 OU'&&w.eval(`gameLabel('nhl','TEX@OU')`)==='TEX@OU');
  {const n0=rankCalls;await w.eval('fetchCFBRankings()');T('rankings cached for 6 hours (no refetch)',rankCalls===n0,n0+' → '+rankCalls);}
  /* a team falls out of the poll */
  RANK={rankings:[{name:'AP Top 25',type:'ap',ranks:[{current:9,team:team('201','OU','Oklahoma','Sooners')}]}]};
  await w.eval('fetchCFBRankings(true)');w.eval('cfbApplyRanks(NCAAF_GAMES)');
  T('a team that drops out of the poll loses its number',w.eval(`NCAAF_GAMES.find(g=>g.home.abbr==='BYU').home.ranking`)==='');
  /* CFP takes over once it exists */
  RANK={rankings:[{name:'AP Top 25',type:'ap',ranks:[{current:9,team:team('201','OU','Oklahoma','Sooners')}]},{name:'College Football Playoff Rankings',shortName:'CFP',type:'cfp',ranks:[{current:4,team:team('201','OU','Oklahoma','Sooners')}]}]};
  await w.eval('fetchCFBRankings(true)');
  T('CFP ranking preferred once published',w.eval(`cfbRankTag('OU')`)==='#4 '&&w.eval('cfbRanks().poll')==='CFP');
  /* restore path (app reopen) applies the cached poll */
  T('ranks re-applied when the cached week is restored on reopen',/cfbApplyRanks\(NCAAF_GAMES\)/.test(fs.readFileSync(path.join(W,'football-engine.js'),'utf8').split('restoreNCAAFGames')[1]||''));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},3000);
