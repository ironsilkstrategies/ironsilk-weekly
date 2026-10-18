/* v2.47 · THE FEEDS — public sports data built off the phone (feeds/build.mjs on GitHub Actions), read by the
   app in the background. The builder is incremental and keeps 21 days; the app takes only the finals its
   characters called, never over a close it caught itself, never syncs the download, and every locked call
   gets the honest CLV: the price at its lock against the close at game time. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const os=require('os');const {execFileSync}=require('child_process');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
/* a real-shaped ESPN final (NJ @ WSH): DraftKings open → close, and the four officials */
const ST='2026-10-17T23:00Z';
const SUMMARY={header:{id:'401892519',league:{slug:'nhl'},competitions:[{id:'401892519',date:ST,status:{type:{state:'post',completed:true}},competitors:[{homeAway:'away',score:'3',team:{abbreviation:'NJ'}},{homeAway:'home',score:'2',team:{abbreviation:'WSH'}}]}]},
  pickcenter:[{provider:{name:'Draft Kings'},moneyline:{home:{open:{odds:'-148'},close:{odds:'-118'}},away:{open:{odds:'+124'},close:{odds:'-102'}}},pointSpread:{home:{open:{line:'-1.5',odds:'+170'},close:{line:'-1.5',odds:'+220'}},away:{open:{line:'+1.5',odds:'-205'},close:{line:'+1.5',odds:'-270'}}},
    total:{over:{open:{line:'o5.5',odds:'-135'},close:{line:'o6.5',odds:'+114'}},under:{open:{line:'u5.5',odds:'+114'},close:{line:'u6.5',odds:'-135'}}}}],
  gameInfo:{officials:[{displayName:'Furman South',position:{displayName:'Referee'}},{displayName:'Michael Markovic',position:{displayName:'Referee'}},{displayName:'Tommy Hughes',position:{displayName:'Linesman'}}]}};
const SP={nfl:'football/nfl',ncaaf:'football/college-football',nba:'basketball/nba',ncaab:'basketball/mens-college-basketball',nhl:'hockey/nhl',mlb:'baseball/mlb'};
const Q={ncaaf:'&groups=80&limit=300',ncaab:'&groups=50&limit=300'};
const ymd=t=>new Date(t).toISOString().slice(0,10).replace(/-/g,'');
function fixtures(withSummary){const F={};const now=Date.now();for(const[sp,p]of Object.entries(SP))for(let b=2;b>=0;b--){F[`https://site.api.espn.com/apis/site/v2/sports/${p}/scoreboard?dates=${ymd(now-b*864e5)}${Q[sp]||''}`]={events:[]};}
  F[`https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${ymd(now)}`]={events:[{id:'401892519',status:{type:{state:'post'}}},{id:'401892999',status:{type:{state:'in'}}}]};
  if(withSummary)F['https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary?event=401892519']=SUMMARY;return F;}
(async()=>{try{
  /* ── the builder (no network: saved responses) ── */
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'feeds-'));const fx=path.join(dir,'..',path.basename(dir)+'.fix.json');
  fs.writeFileSync(path.join(dir,'closes.json'),JSON.stringify({v:1,games:{old1:{id:'old1',sp:'nhl',st:new Date(Date.now()-30*864e5).toISOString(),a:'A',h:'B'}}}));
  fs.writeFileSync(fx,JSON.stringify(fixtures(true)));execFileSync('node',[path.join(W,'feeds/build.mjs'),dir],{env:{...process.env,FEEDS_FIXTURES:fx}});
  const C1=JSON.parse(fs.readFileSync(path.join(dir,'closes.json'),'utf8'));const g=C1.games['401892519'];
  T('the builder stores a final: score, DraftKings open → close for every market, the officials',g&&g.as===3&&g.hs===2&&g.pc.ml.away.o===124&&g.pc.ml.away.c===-102&&g.pc.total.over.cl===6.5&&g.refs.some(r=>r.n==='Furman South'&&r.p==='Referee'),JSON.stringify(g).slice(0,300));
  T('…a game still being played is not stored',!C1.games['401892999']);
  T('…and a final older than 21 days is let go',!C1.games.old1);
  fs.writeFileSync(fx,JSON.stringify(fixtures(false)));execFileSync('node',[path.join(W,'feeds/build.mjs'),dir],{env:{...process.env,FEEDS_FIXTURES:fx}});
  const I=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8'));const C2=JSON.parse(fs.readFileSync(path.join(dir,'closes.json'),'utf8'));
  T('incremental: a stored final is never fetched again (no summary asked, nothing lost)',I.runs[0].added===0&&I.runs[0].errors.length===0&&!!C2.games['401892519'],JSON.stringify(I.runs[0]));
  /* ── the app ── */
  let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  const T0=Date.parse('2026-10-18T14:00:00Z');const lk=Date.parse('2026-10-17T15:00:00Z');
  const V=[{id:'a1',sp:'nhl',date:'2026-10-17',game:'NJ@WSH',voice:'Sim',market:'ml',side:'away',line:null,price:124,cf:0.6,lk,graded:true,hit:true,units:1.24},
    {id:'a2',sp:'nhl',date:'2026-10-17',game:'NJ@WSH',voice:'Judge',market:'total',side:'over',line:5.5,price:-110,cf:0.6,lk,graded:true,hit:false,units:-1},
    {id:'a3',sp:'nhl',date:'2026-10-17',game:'NJ@WSH',voice:'Coach',market:'ml',side:'home',line:null,price:-148,cf:0.6,graded:true,hit:false,units:-1}];
  let feedBody=C2,feedStatus=200;
  const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[T0]))}static now(){return T0}}x.Date=FD;
    x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_FLIP_RELOAD__=true;x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;
    x.fetch=u=>{u=String(u);if(/raw\.githubusercontent\.com\/ironsilkstrategies\/ironsilk-weekly\/feeds\/closes\.json/.test(u))return Promise.resolve({ok:feedStatus===200,status:feedStatus,json:()=>Promise.resolve(feedBody)});
      return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
    x.localStorage.setItem('d4.setupDone','1');x.localStorage.setItem('d4.voices',JSON.stringify(V));}}).window;await wait(1500);
  const n=await w.eval('feedsTick(true)');
  const r=w.eval(`(()=>{const C=(get(CLOSES_KEY,{})||{})['2026-10-17']||{};const V=get(VOICES_KEY,[]);const f=id=>V.find(x=>x.id===id);return{rec:C['nhl|NJ@WSH'],a1:[f('a1').clv,f('a1').clvs],a2:[f('a2').clv,f('a2').clvs],a3:[f('a3').clv,f('a3').clvs]};})()`);
  T('the app takes the finals its characters called into its closing lines',n===1&&r.rec&&r.rec.feed===1&&r.rec.ml.away.close===-102,JSON.stringify(r.rec).slice(0,200));
  T('a moneyline locked at +124 that closed -102 beat the close by ~5.9 points (the honest CLV)',r.a1[1]==='close'&&r.a1[0]>5.5&&r.a1[0]<6.3,JSON.stringify(r.a1));
  T('a total taken at 5.5 that closed 6.5 counts the point (over: +8 in hockey)',r.a2[1]==='close'&&r.a2[0]===8,JSON.stringify(r.a2));
  T('a call that was never locked gets no closing-line CLV (only the market\'s move, shown, never judged on)',r.a3[1]!=='close',JSON.stringify(r.a3));
  T('the download itself never syncs',w.eval(`syncSkip(FEED_KEY('closes'))===true&&syncSkip(CLOSES_KEY)===false`));
  feedStatus=404;const n2=await w.eval('feedsTick(true)');T('a feed that can\'t be reached changes nothing and says nothing',n2===null&&w.eval(`get(FEED_KEY('closes'),{}).fail===404`));
  w.eval(`REC_VIEW='book';renderRecordsHub()`);T('the Book view shows the feeds and how fresh they are',/📡 The feeds/.test(w.document.getElementById('recordsHub').innerHTML));
}catch(e){T('suite crashed',false,String(e&&e.stack||e).slice(0,500));}
  console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);})();
