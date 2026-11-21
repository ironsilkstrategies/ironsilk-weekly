const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function boot(page){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const cfb=boot('cfb.html'),nfl=boot('nfl.html');
setTimeout(()=>{try{
  const row=(game,market,side,line,price,ts)=>({game,away:game.split('@')[0],home:game.split('@')[1],market,side,line,price,src:'mine',capturedAt:ts});
  cfb.eval(`(()=>{const y=dayShift(today(),-1),old=dayShift(today(),-9);const A={};
    A[y]=${JSON.stringify([row('TLSA@NAVY','spread','home',-3.5,-110,1),row('TLSA@NAVY','moneyline','home',null,-135,1),row('TEX@OU','spread','home',10.5,-110,1)])};
    A[old]=${JSON.stringify([row('USC@UCLA','spread','home',3,-110,0)])};
    A[today()]=${JSON.stringify([row('TEX@OU','spread','home',9.5,-115,5)])};
    set(LS.ncaafshots,A);
    set(LS.ncaaftrends,{[y]:[{game:'TLSA@NAVY',text:'Navy is 6-1 ATS at home'}]});
    _NCAAF_BL_MEMO={sig:'',map:new Map()};})()`);
  const navy=cfb.eval(`ncaafBookLinesFor('TLSA@NAVY')`);
  T('CFB lines uploaded yesterday show today (the "sim only" bug)',navy.length===2&&navy.some(x=>x.price===-135),navy.length+' lines');
  const ou=cfb.eval(`ncaafBookLinesFor('TEX@OU')`);
  T('a newer upload of the same market replaces the older one',ou.length===1&&ou[0].line===9.5&&ou[0].price===-115,JSON.stringify(ou.map(x=>x.line)));
  T('lines older than the 8-day window drop off',!cfb.eval(`ncaafBookLinesFor('USC@UCLA')`).length);
  T('CFB trends from yesterday still reach the card and the Judge',cfb.eval(`ncaafTrendsFor('TLSA@NAVY')`).length===1);
  nfl.eval(`set(LS.nflshots,{[dayShift(today(),-2)]:${JSON.stringify([row('ATL@NO','spread','home',-1.5,-110,1)])}})`);
  T('NFL lines from earlier in the week show too',nfl.eval(`nflBookLinesFor('ATL@NO')`).length===1);
}catch(e){T('harness',false,e.stack.split('\n').slice(0,3).join(' | '));}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);},3500);
