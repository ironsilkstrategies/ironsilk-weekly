const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  w.eval(`window.sportGames=sp=>sp==='nfl'?[{id:'1',away:{abbr:'KC'},home:{abbr:'LV'},abstract:'pre'}]:[];
    window.pwrRank=sp=>{const t=[{abbr:'KC',def:3,off:4},{abbr:'LV',def:-6,off:-2}];return{teams:t,by:{KC:t[0],LV:t[1]}};};
    (()=>{const D=pstDb('nfl');D.p[pstId('Travis Kelce')]={name:'Travis Kelce',team:'KC',n:8,s:{rec:{sum:44,sq:260,ema:5.6,gp:8},wy:{sum:520,sq:36000,ema:68,gp:8}}};})();
    set(CPROP_KEY,[]);`);
  const R=w.eval(`cpropReads('nfl','Travis Kelce','rec',5)`);
  T('the Coach reads the matchup: a bad defense (LV) lifts his number above the season average',R.r.Coach>R.r['Most common'],`Coach ${Math.round(R.r.Coach*100)}% vs season ${Math.round(R.r['Most common']*100)}% · ${R.J.match.why}`);
  T('…and the Judge now weighs the Coach as a witness',R.r.Judge!=null);
  let C=w.eval(`cpropToday()`);const ck=C.filter(c=>c.player==='Travis Kelce');
  T('characters make 70%+ calls on him, the Coach among them',ck.length>=3&&ck.some(c=>c.voice==='Coach'),ck.map(c=>c.voice+' '+c.thr+'+'+c.k).join(', '));
  /* the Judge is 5-0 on Kelce → favorite, its number on him moves up */
  w.eval(`set(CPROP_KEY,Array.from({length:5},(_,i)=>({id:'h'+i,sp:'nfl',voice:'Judge',player:'Travis Kelce',team:'KC',k:'rec',thr:4,p:0.72,d:'2026-09-0'+(i+1),hit:true,mv:2})).concat(Array.from({length:5},(_,i)=>({id:'m'+i,sp:'nfl',voice:'Trends',player:'Travis Kelce',team:'KC',k:'rec',thr:4,p:0.72,d:'2026-09-0'+(i+1),hit:i<1,mv:2}))));CPR_C=null;`);
  C=w.eval(`cpropToday()`);const j=C.find(c=>c.player==='Travis Kelce'&&c.voice==='Judge');const tr=C.find(c=>c.player==='Travis Kelce'&&c.voice==='Trends');
  T('a character that is 5-0 on a player marks him ⭐ favorite and trusts its number on him more',j&&j.fav==='fav'&&j.rec==='5-0',j&&`${Math.round(j.cal*100)}% (${j.rec})`);
  T('a character that is 1-4 on him marks him a fade',!tr||tr.fav==='fade');
  const F=w.eval(`cpropFavs('Judge')`);T('favorite players list per character',F.fav.length===1&&F.fav[0].player==='Travis Kelce');
  const pod=w.eval(`cpropOfDay('Judge')`);T('each character has a prop of the day',pod&&pod.player==='Travis Kelce');
  T('fades never become the prop of the day',!w.eval(`cpropOfDay('Trends')`)||w.eval(`cpropOfDay('Trends')`).fav!=='fade');
  const ros=w.eval('charRosterHtml()');T('roster shows prop of the day + favorite players',/Prop of the day/.test(ros)&&/Favorite players/.test(ros));
  const tg=w.eval('subTelegramText(subCard()).join("\\n")');T('subscriber Telegram post carries the props of the day (one character per player, 70%+)',/PROPS OF THE DAY/.test(tg)&&/Travis Kelce/.test(tg),tg.slice(tg.indexOf('PROPS')).slice(0,200));
  T('props are logged automatically on every board refresh, not only when the props tab is opened',/cpropLog\(cpropToday\(\)/.test(w.eval('todaySnapshot.toString()')));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
