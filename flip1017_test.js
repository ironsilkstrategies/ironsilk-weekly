/* v2.37 · early day turnover: between midnight and 5 AM CT the desk moves to the new date
   as soon as every game on the night's slate (all six sports) is final; 5 AM stays the backstop. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let NOW=Date.parse('2026-10-17T05:30:00Z');            /* 12:30 AM CT Saturday */
const S={late:'in',down:null};const asked=[];
const ev=(id,date,state,name)=>({id,date,shortName:id,status:{type:{state,completed:state==='post',name:name||(state==='post'?'STATUS_FINAL':'STATUS_IN_PROGRESS')}}});
function board(sp){const e=[];
  if(sp==='nhl')e.push(ev('PIT @ VGK','2026-10-17T02:00Z',S.late),        /* Fri 9:00 PM CT — the late one */
    ev('NJ @ WSH','2026-10-17T16:07Z','pre'),                               /* Sat noon — tomorrow, ignored */
    ev('OLD @ ONE','2026-10-16T09:30Z','in'));                              /* Fri 4:30 AM CT — the slate before, ignored */
  if(sp==='mlb'&&S.rain)e.push(ev('TB @ CLE','2026-10-24T00:10Z','pre','STATUS_SCHEDULED'),ev('LIVE @ NOW','2026-10-24T04:30Z',S.late2||'post'));
  if(sp==='ncaaf')e.push(ev('SJSU @ UTEP','2026-10-17T01:00Z','post'),ev('PPD @ X','2026-10-17T00:00Z','pre','STATUS_POSTPONED'));
  return{events:e};}
function boot(page){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;
    w.__NO_GRADELOOP__=true;w.__NO_FLIP_RELOAD__=true;
    w.fetch=u=>{u=String(u);asked.push(u);const m=u.match(/sports\/(.+?)\/scoreboard/);
      if(m){const sp=Object.entries({mlb:'baseball/mlb',nfl:'football/nfl',ncaaf:'football/college-football',nhl:'hockey/nhl',nba:'basketball/nba',ncaab:'basketball/mens-college-basketball'}).find(([k,v])=>v===m[1])[0];
        if(S.down===sp)return Promise.resolve({ok:false,status:503,json:()=>Promise.resolve({})});
        return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(board(sp))});}
      return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const w=boot('nhl.html');
setTimeout(async()=>{try{
  T('12:30 AM with a game still going: the desk is still on Friday',w.eval('today()')==='2026-10-16',w.eval('today()'));
  let r=await w.eval('slateFlipCheck()');
  T('a live Friday game holds the turnover',!r.flipped&&r.open&&r.open.length===1&&/PIT @ VGK/.test(r.open[0]),JSON.stringify(r));
  T('asks for the whole night, one date at a time (ESPN refuses a range with limit=400 for the NHL and NBA), every sport',asked.filter(u=>/scoreboard\?dates=20261016&(groups=\d+&)?limit=(400|900)$/.test(u)).length===6&&asked.filter(u=>/scoreboard\?dates=20261017&(groups=\d+&)?limit=(400|900)$/.test(u)).length===6&&!asked.some(u=>/dates=\d{8}-\d{8}&limit=400/.test(u))&&asked.some(u=>/college-football.*groups=80/.test(u))&&asked.some(u=>/mens-college-basketball.*groups=50/.test(u)),asked.slice(0,3).join(' | '));
  T('Saturday games and the slate before are not counted',!JSON.stringify(r.open).includes('NJ @ WSH')&&!JSON.stringify(r.open).includes('OLD'));
  S.late='post';S.down='nba';NOW+=1000*60*30;w.eval('TODAY_T=0');
  r=await w.eval('slateFlipCheck()');
  T('one scoreboard unreachable: never flips on a guess',!r.flipped&&/nba/.test(r.why)&&w.eval('today()')==='2026-10-16',JSON.stringify(r));
  S.down=null;r=await w.eval('slateFlipCheck()');
  T('everything final (postponed counts as done): flips to Saturday',r.flipped&&r.day==='2026-10-17',JSON.stringify(r));
  T('today() now answers Saturday before 5 AM',w.eval('today()')==='2026-10-17'&&w.eval("get('d4.slateflip',null)")==='2026-10-17');
  T('yesterday is still Friday for grading',w.eval('dayShift(today(),-1)')==='2026-10-16');
  const n=asked.length;r=await w.eval('slateFlipCheck()');
  T('already flipped: no more scoreboard calls',!r.flipped&&asked.length===n);
  NOW=Date.parse('2026-10-17T15:00:00Z');w.eval('TODAY_T=0');
  T('10 AM Saturday: plain calendar day',w.eval('today()')==='2026-10-17');
  NOW=Date.parse('2026-10-18T05:30:00Z');w.eval('TODAY_T=0');
  T('next night: an old flip never carries over (12:30 AM Sunday = Saturday)',w.eval('today()')==='2026-10-17');
  NOW=Date.parse('2026-10-18T10:01:00Z');w.eval('TODAY_T=0');
  T('5 AM backstop unchanged',w.eval('today()')==='2026-10-18');
  /* v2.38 · Cleveland: the Friday game was rained out but ESPN still lists it 'pre' at first pitch */
  NOW=Date.parse('2026-10-24T05:45:00Z');w.eval('TODAY_T=0');S.late='post';S.rain=true;
  r=await w.eval('slateFlipCheck()');
  T('a game that never started 2h past first pitch does not block the turnover',r.flipped&&r.day==='2026-10-24',JSON.stringify(r));
  S.rain=false;
  /* v2.39 · the turnover that arrives through SYNC is stored JSON-quoted — it must count */
  NOW=Date.parse('2026-10-25T05:40:00Z');w.eval('TODAY_T=0');w.localStorage.removeItem('d4.slateflip');
  T('before the synced turnover: still the old slate',w.eval('today()')==='2026-10-24');
  w.eval(`_syncSetRaw('d4.slateflip','2026-10-25')`);w.eval('TODAY_T=0');
  T('a turnover synced from another device moves this one too',w.localStorage.getItem('d4.slateflip')==='"2026-10-25"'&&w.eval('today()')==='2026-10-25',w.localStorage.getItem('d4.slateflip')+' → '+w.eval('today()'));
  NOW=Date.parse('2026-11-08T06:30:00Z');w.eval('TODAY_T=0');   /* after the DST change (UTC-6) */
  const [a,b]=w.eval(`slateFlipWindow('2026-10-31')`);
  T('night window follows the clock change (Oct 31 5 AM CDT → Nov 1 5 AM CST)',new Date(a).toISOString()==='2026-10-31T10:00:00.000Z'&&new Date(b).toISOString()==='2026-11-01T11:00:00.000Z',new Date(a).toISOString()+' '+new Date(b).toISOString());
}catch(e){T('no crash',false,e.stack.slice(0,400));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},2500);
