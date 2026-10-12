const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  T('a +3.5 spread at -120 juice is an UNDERDOG',w.eval(`splitRole({market:'spread',line:3.5,price:-120})`)==='dog'&&w.eval(`splitRole({market:'spread',line:-3.5,price:105})`)==='fav'&&w.eval(`splitRole({market:'ml',price:-150})`)==='fav');
  /* history: the Judge is 8-2 on NFL road spreads (hot at 65%), the Coach 7-3 on NFL totals over (64% shrunk — not hot anymore) */
  const V=[];const d0=n=>'2026-09-'+String(n).padStart(2,'0');
  for(let i=0;i<10;i++)V.push({id:'j'+i,voice:'Judge',sp:'nfl',date:d0(1+i),game:'X'+i+'@Y'+i,market:'spread',side:'away',line:3.5,price:-110,graded:true,hit:i<8,units:i<8?0.91:-1});
  for(let i=0;i<10;i++)V.push({id:'c'+i,voice:'Coach',sp:'nfl',date:d0(1+i),game:'P'+i+'@Q'+i,market:'total',side:'over',line:44,price:-110,graded:true,hit:i<7,units:i<7?0.91:-1});
  const d=w.eval('today()');
  V.push({id:'tj',voice:'Judge',sp:'nfl',date:d,game:'NYG@WSH',market:'spread',side:'away',line:3.5,price:-120});
  V.push({id:'tc',voice:'Coach',sp:'nfl',date:d,game:'DEN@LAC',market:'total',side:'over',line:41,price:-110});
  V.push({id:'tj2',voice:'Judge',sp:'nfl',date:d,game:'BAL@ATL',market:'spread',side:'away',line:2.5,price:-105});
  w.eval(`set(SPLIT_KEY,{});set(VOICES_KEY,${JSON.stringify(V)});CH_IDX=null;`);
  const hj=w.eval(`charHist(get(VOICES_KEY,[]),get(VOICES_KEY,[]).find(x=>x.id==='tj'))`),hc=w.eval(`charHist(get(VOICES_KEY,[]),get(VOICES_KEY,[]).find(x=>x.id==='tc'))`);
  T('8-2 is hot at 65%',hj.hot.length>0,hj.hot.map(x=>x.lab+' '+x.w+'-'+x.l).join(', '));
  T('7-3 (64% after shrinking) no longer counts',hc.hot.length===0);
  T('NYG +3.5 is tagged as an underdog spread, never a favorite',!hj.hot.some(x=>/favorite/.test(x.lab))&&hj.hot.some(x=>/underdog spread|road spread/.test(x.lab)));
  /* the preset */
  w.eval(`window.fullPresetPool=()=>[
      {game:'NYG@WSH',sport:'nfl',kind:'spread',pick:'NYG +3.5',price:-120,p:0.55,modelP:0.55,marketP:0.52},
      {game:'BAL@ATL',sport:'nfl',kind:'spread',pick:'BAL +2.5',price:-105,p:0.53,modelP:0.53,marketP:0.5},
      {game:'DEN@LAC',sport:'nfl',kind:'total',pick:'Over 41',price:-110,p:0.6,modelP:0.6,marketP:0.52},
      {game:'KC@LV',sport:'nfl',kind:'spread',pick:'KC -6.5',price:-110,p:0.7,modelP:0.7,marketP:0.52}];
    window.applyDupeFilter=x=>x;['ml','spread','total'].forEach(m=>PRESET_MARKETS.add(m));PRESET_HELD.clear();`);
  w.eval('TARGET_LEGS=-1');const all=w.eval(`buildPreset('hothands')`);
  T('only legs backed by a hot character make the ticket',all.length===2&&all.every(l=>/NYG|BAL/.test(l.pick)),all.map(l=>l.pick+' · '+l.hotWhy).join(' | '));
  w.eval('TARGET_LEGS=1');const one=w.eval(`buildPreset('hothands')`);T('leg count picker is honored',one.length===1);
  T('the preset is listed and files under My picks',w.eval(`PRESETS.some(p=>p[0]==='hothands')&&PRESET_SOURCE.hothands==='mine'&&PRESET_DISPLAY_NAME.hothands==='Hot hands'`));
  /* the records rebuild: spread role buckets refiled by line */
  w.eval(`(()=>{const V=get(VOICES_KEY,[]);V.forEach(x=>{if(x.graded)x.sr=1;});set(VOICES_KEY,V);set(SPLIT_KEY,{nfl:{Judge:{spread:{all:[8,2,0],side:{},role:{fav:[8,2,0]},team:{},h2h:{}}}}});localStorage.removeItem('d4.migr.splitrole2');})()`);
  const n=w.eval('splitRoleRebuild()');const R=w.eval(`get(SPLIT_KEY,{}).nfl.Judge.spread.role`);
  T('one-time rebuild refiles the permanent spread records by line',n===10&&R.dog&&R.dog[0]===8&&!R.fav,JSON.stringify(R));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
