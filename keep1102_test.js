const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const WD='/home/claude/work';let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(WD,'nfl.html'),'utf8');html=html.replace(/<script src="min\/([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(WD,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:new (require('jsdom').VirtualConsole)(),beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  w.eval(`best3Pool=function(by,sp){const all=[{sp:'nba',game:'A@B',pick:'A ML',p:.8},{sp:'nba',game:'C@D',pick:'C ML',p:.79},{sp:'nhl',game:'E@F',pick:'E ML',p:.78},{sp:'nhl',game:'G@H',pick:'G ML',p:.77}];return sp?all.filter(x=>x.sp===sp):all.slice(0,3);};
    best5Started=()=>false;set(TC_KEY,{d:today(),by:{nba:{picks:[]},nhl:{picks:[]}}});`);
  let b=w.eval('best5Build()');T('without memory: the top 3 by rank',b.top3.map(x=>x.pick).join()==='A ML,C ML,E ML',b.top3.map(x=>x.pick).join());
  w.eval(`set('d4.b3keep',{d:today(),keys:['nhl|G@H|G ML']})`);b=w.eval('best5Build()');
  T('a pick from the earlier card that still qualifies stays on',b.top3.some(x=>x.pick==='G ML')&&b.top3.length===3,b.top3.map(x=>x.pick).join());
  w.eval(`set('d4.b3keep',{d:today(),keys:['nhl|Z@Y|Z ML']})`);b=w.eval('best5Build()');T('…one that no longer qualifies does not come back',!b.top3.some(x=>x.pick==='Z ML'));
  const src=fs.readFileSync(path.join(WD,'desk-core.js'),'utf8');T('a missed sport is retried once in the relay',/C\.retried=C\.retried\|\|\[\]\)\.push\(sp\);C\.todo\.push\(sp\)/.test(src));
}catch(e){T('crashed',false,e.stack)}console.log(pass+' pass / '+fail+' fail');process.exit(0);},1500);
