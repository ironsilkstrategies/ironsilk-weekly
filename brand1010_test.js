const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
let confirmAns=false;
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T19:30:00Z')]))}static now(){return RD.parse('2026-10-10T19:30:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>confirmAns;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const D=w.document,td=w.eval('today()'),src=fs.readFileSync(path.join(W,'shared.js'),'utf8');
  /* brand */
  ['icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','favicon-32.png','badge-112.png','badge-320.png','thedesk-logo.png','thedesk.webmanifest'].forEach(f=>{if(!fs.existsSync(path.join(W,'brand',f)))T('brand asset '+f,false);});
  T('brand assets present',['icon-192.png','icon-512.png','apple-touch-icon.png','favicon-32.png','badge-112.png','thedesk.webmanifest'].every(f=>fs.existsSync(path.join(W,'brand',f))));
  const man=JSON.parse(fs.readFileSync(path.join(W,'brand/thedesk.webmanifest'),'utf8'));
  T('manifest: TheDesk, standalone, 192/512/maskable icons',man.short_name==='TheDesk'&&man.display==='standalone'&&man.icons.length===3&&man.icons.some(i=>i.purpose==='maskable'));
  T('every page links the manifest, favicon and home-screen icon',['mlb','nfl','cfb','nhl','nba','TheDesk','picks'].every(p=>{const h=fs.readFileSync(path.join(W,p+'.html'),'utf8');return/brand\/thedesk\.webmanifest/.test(h)&&/brand\/favicon-32\.png/.test(h)&&/brand\/apple-touch-icon\.png/.test(h);}));
  T('header shows the logo badge',!!D.querySelector('.brand img.brand-badge[src="brand/badge-112.png"]'));
  T('socials: Facebook + Telegram in app, launcher and picks page',/t\.me\/TheDeskApp/.test(src)&&/facebook\.com\/share\/1FCDFdUvRp/.test(src)&&/t\.me\/TheDeskApp/.test(fs.readFileSync(path.join(W,'TheDesk.html'),'utf8'))&&/t\.me\/TheDeskApp/.test(fs.readFileSync(path.join(W,'picks.html'),'utf8')));
  T('More sheet carries the social buttons',/Telegram/.test(w.eval('socialHtml()'))&&/Facebook/.test(w.eval('socialHtml()')));
  T('public feed publishes the socials',w.eval('publicFeed().social.tg')==='https://t.me/TheDeskApp');
  T('picks page has a share-preview image',/og:image" content="https:\/\/ironsilkweekly\.com\/brand\/thedesk-logo\.png/.test(fs.readFileSync(path.join(W,'picks.html'),'utf8')));
  T('no public data backups left in the site repo',!fs.existsSync(path.join(W,'data-backup.json'))&&!fs.existsSync(path.join(W,'thedesk-backup-2026-07-30.json')));
  /* data fixes */
  T('blend starts market-heavy (0.2) before a sport+market has graded games',Math.abs(w.eval(`blendWeight('nhl','ml').w`)-0.2)<1e-9);
  w.eval(`localStorage.removeItem('d4.fix.badprice');set(LS.locked,[{id:'x1',date:'2026-10-04',source:'mine',legs:[{sport:'nfl',game:'ATL@NO',pick:'ATL ML',price:-2,p:0.0196},{sport:'nfl',game:'KC@LV',pick:'LV ML',price:-150,p:.6}]}]);set(SETTLED_KEY,{x2:{id:'x2',src:'mine',legs:[{sp:'nfl',g:'A@B',pk:'A ML',pr:-2,h:'W'},{sp:'nfl',g:'C@D',pk:'D ML',pr:-130,h:'L'}]}})`);
  const n=w.eval('repairBadPrices()');
  T('one-time repair: "-2" prices become unpriced, real prices untouched',n===2&&w.eval('get(LS.locked,[])[0].legs[0].price')===null&&w.eval('get(LS.locked,[])[0].legs[1].price')===-150&&w.eval('settledAll().x2.legs[0].pr')===null&&w.eval('settledAll().x2.legs[1].pr')===-130);
  T('repair runs once',w.eval('repairBadPrices()')===0);
  w.eval(`set(SETTLED_KEY,{t1:{id:'t1',src:'mine',d:'${td}',legs:[{sp:'nhl',g:'A@B',pk:'B ML',pr:-150,h:'W'},{sp:'nhl',g:'C@D',pk:'D ML',pr:-150,h:'L'},{sp:'nhl',g:'E@F',pk:'F +2.5',pr:null,h:'W'},{sp:'nhl',g:'G@H',pk:'H +3.5',pr:null,h:'W'}]}});set(LS.locked,[]);HUB_CACHE=null`);
  const hub=D.createElement('div');hub.id='recordsHub';D.body.appendChild(hub);w.eval("REC_VIEW='overview';renderRecordsHub()");
  const H=D.getElementById('recordsHub').innerHTML;
  T('your record splits priced legs (judged on break-even) from unpriced SGP/alt legs',/You — priced legs: 1-1/.test(H)&&/prices needed 60%/.test(H)&&/\+ 2-0 on legs with no price of their own/.test(H),(H.match(/You — priced[^<]*/)||[''])[0]);
  /* playable + crowd */
  const V=[['Sim','home'],['Judge','home'],['Most common','home']].map(([v,sd],i)=>({id:'c'+i,voice:v,sp:'nhl',date:td,game:'A1@B1',market:'ml',side:sd,price:120}));
  V.push(...[['Sim','home'],['Judge','away']].map(([v,sd],i)=>({id:'d'+i,voice:v,sp:'nhl',date:td,game:'A2@B2',market:'ml',side:sd,price:110})));
  w.eval(`set(VOICES_KEY,${JSON.stringify(V)});CROWD_C=null`);
  T('crowd agreement: all characters on the side = agree; a split = not',w.eval(`crowdAllAgree('nhl','A1@B1','ml','home')`)===true&&w.eval(`crowdAllAgree('nhl','A2@B2','ml','home')`)===false);
  const pk=(g,extra)=>JSON.stringify({game:g,m:'ml',sd:'home',pick:g.split('@')[1]+' ML',price:120,color:' strong',blend:.5,mp:.5,mkt:.47,...(extra||{})});
  T('Playable: crowd behind it, priced, +EV → in',w.eval(`tfPlayable(${pk('A1@B1')},'nhl')`)===true);
  T('Playable: crowd split → out',w.eval(`tfPlayable(${pk('A2@B2')},'nhl')`)===false);
  T('Playable: no book price → out',w.eval(`tfPlayable(${pk('A1@B1',{price:null})},'nhl')`)===false);
  T('Playable: priced shorter than -300 → out',w.eval(`tfPlayable(${pk('A1@B1',{price:-350,blend:.85,mp:.85,mkt:.8})},'nhl')`)===false);
  T('Playable: model fighting the market by 8+ pts → out',w.eval(`tfPlayable(${pk('A1@B1',{mp:.62,mkt:.47})},'nhl')`)===false);
  T('Today opens on Playable by default',w.eval(`(localStorage.removeItem(TF_KEY),tfGet().tier)`)==='play');
  /* Best hero */
  w.eval(`set(BEST5_KEY,{d:'${td}',locked:true,lockedAt:Date.now(),top3:[{sp:'ncaaf',game:'TEX@OU',pick:'OU +8.5',price:-110,blend:.55,unan:true},{sp:'ncaaf',game:'KENT@WMU',pick:'WMU -13.5',price:-112,blend:.55}],bySport:{},picks:[]});set('d4.best5log',{'2026-10-09':{picks:[{main:true,pick:'BYU -10.5',price:-108,hit:true},{main:true,pick:'LOU -3.5',price:-112,hit:true}]}})`);
  const hero=w.eval('todayBestHero()');
  T('Today leads with the Best card and its record',/Today's Best 2/.test(hero)&&/2-0/.test(hero)&&/OU \+8\.5/.test(hero)&&/★ unanimous/.test(hero),hero.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,120));
  /* intake fold */
  w.eval('intakeCollapse()');const ib=D.querySelector('.intake-box');
  T('Intake folds to one line by default',ib&&ib.classList.contains('intake-closed'));
  ib.querySelector('.sbar').onclick();T('tap opens it and the choice is remembered',!ib.classList.contains('intake-closed')&&w.localStorage.getItem('d4.intakeOpen')==='1');
  /* duplicate challenge guard */
  w.eval(`set(MS_KEY,[]);msStart('first_win')`);confirmAns=false;w.eval(`msStart('first_win')`);
  T('starting the same challenge twice asks first (and respects "no")',w.eval('msAll().length')===1);
  /* escaping */
  T('no JS-escaper left in visible text (no more Banker\\\'s)',!/>\$\{esc\(/.test(src));
  T('txtEsc is hoisted (safe during startup)',/function txtEsc\(s\)/.test(src));
  T('negative money shows as -$3.00, not $-3.00',!/\?'\+':''\}\$\$\{[A-Za-z_.]+\.toFixed\(2\)\}/.test(src));
  /* character builder respects the leg budget */
  T('character builder auto-picks within the leg budget',w.eval(`legBudget([.6,.6,.6,.6,.6,.6],6)`)===3&&/const k=legBudget\(top\.map\(x=>x\.p\),sz\.k\)/.test(src));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},3000);
