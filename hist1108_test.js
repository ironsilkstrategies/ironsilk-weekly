/* v2.91.0 · Nov 8: "The historian has to understand team prestige… what teams finish in the playoffs the most over the last 10
   years… offenses/defenses that are total trash and exposed historically… the 49ers haven't lost to X in the last 5 head to
   heads… prestige, history, elements and dynamics." + "get as much as you can". Invented teams and history, no network. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  const RD=w.Date;const OFF=RD.parse('2026-11-08T10:00:00-06:00')-RD.now();class FD extends RD{constructor(...a){if(a.length)super(...a);else super(RD.now()+OFF);}static now(){return RD.now()+OFF;}}FD.parse=RD.parse;FD.UTC=RD.UTC;w.Date=FD;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;
  const HJ={v:1,ts:new Date().toISOString(),
    t:{'nfl|SF':{s:10,po:8,pw:11,ti:1,w10:0.62,w3:0.66,cur:0.6,curN:9,pres:78,off3:0.85,def3:0.8},'nfl|LV':{s:10,po:1,pw:0,ti:0,w10:0.41,w3:0.35,cur:0.8,curN:9,pres:14,off3:0.3,def3:0.12},
       'nfl|DAL':{s:10,po:5,pw:2,ti:0,w10:0.55,w3:0.5,cur:0.5,curN:8,pres:44,off3:0.7,def3:0.1},'nfl|NYG':{s:10,po:2,pw:1,ti:0,w10:0.4,w3:0.38,cur:0.38,curN:8,pres:20,off3:0.15,def3:0.18},
       'nfl|NEW1':{s:2,po:0,pw:0,ti:0,w10:0.5,w3:0.5,cur:0.5,curN:8,pres:30,off3:0.5,def3:0.5},'nfl|NEW2':{s:2,po:0,pw:0,ti:0,w10:0.5,w3:0.5,cur:0.5,curN:8,pres:30,off3:0.5,def3:0.5}},
    h2h:{'nfl|LV|SF':[['2025-12-01','SF',10,'SF',0],['2024-11-03','SF',14,'LV',0],['2023-10-01','SF',3,'SF',0],['2022-09-11','SF',7,'LV',0],['2021-12-19','SF',21,'SF',0],['2020-10-04','LV',3,'LV',0]]},ref:{'nfl|Ref A':{g:20,hw:0.75,hc:0.7,hcn:20,hm:5}}};
  T('ten seasons load from the feeds robot (teams, pairings, referees)',E(`histStore(${J(HJ)})`)===6);
  const g1=E(`histGut({sp:'nfl',a:'LV',h:'SF',mlA:380,mlH:-500,hl:-9.5,tl:44.5})`);const L1=g1.why.map(x=>x.lab).join(' | ');
  T('a 5-game head-to-head streak is named and leans hard ("SF hasn\'t lost to LV in 5 straight")',/SF hasn't lost to LV in 5 straight/.test(L1)&&g1.side==='home',L1);
  T('prestige: playoffs in 8 of 10 years and a title vs 1 of 10',/prestige SF 78 \(playoffs 8 of 10 yrs, 1 title\) vs LV 14/.test(L1),L1);
  T('the pretender: LV 80% this year vs 41% over ten — history says it comes back',/LV 80% this year vs 41% over ten/.test(L1),L1);
  T('…all of it → an official-strength gut on SF (70+)',g1.G>=70&&g1.known,J({G:g1.G}));
  const g2=E(`histGut({sp:'nfl',a:'DAL',h:'NYG',mlA:-150,mlH:130,hl:3,tl:44})`);
  T('exposed units: two bottom-20% defenses for three seasons → the total leans over',g2.tside==='over'&&g2.twhy.some(x=>/exposed defenses: DAL, NYG/.test(x.lab)),J(g2.twhy));
  const g3=E(`histGut({sp:'nfl',a:'NEW1',h:'NEW2',mlA:-110,mlH:-110,hl:-1,tl:44})`);
  T('no official call on half a memory (two seasons each, no meetings)',g3&&!g3.known);
  const g4=E(`histGut({sp:'nfl',a:'DAL',h:'NYG',mlA:-150,mlH:130,hl:3,tl:44,ref:'Ref A'})`);
  T('a known referee with a home lean counts (Ref A: home teams 15-5)',g4.why.some(x=>/ref Ref A: home teams 15-5/.test(x.lab)));
  const got=[];w.__got=got;
  E(`histCalls('nfl',{away:{abbr:'LV'},home:{abbr:'SF'}},{mlA:{price:380},mlH:{price:-500},spH:{line:-9.5,price:-110}},-9.5,false,44.5,false,(v,m,s,ex)=>window.__got.push({v,m,s,ex}),null)`);
  T('on the board: an official-strength spread call with his gut, reasons and score',got.some(x=>x.v==='Trends'&&x.m==='spread'&&x.s==='home'&&x.ex.hG>=70&&x.ex.why.length&&x.ex.pa!=null),J(got));
  T('…no moneyline at -500 (75+ and only between -300 and +250)',!got.some(x=>x.m==='ml'));
  T('official at his gut (side/total 70+, moneyline 75+)',E(`isOfficial({voice:'Trends',market:'spread',hG:72,price:-110,date:today()})`)===true&&E(`isOfficial({voice:'Trends',market:'ml',hG:72,price:-150,date:today()})`)===false);
  T('his score on every game he reads',!!E(`histPredFor('nfl',{away:{abbr:'LV'},home:{abbr:'SF'}})`)&&E(`scoreCallsFor('nfl',{away:{abbr:'LV'},home:{abbr:'SF'}},{awayProj:17,homeProj:27},[])`).some(x=>x.voice==='Trends'));
  T('his description and card: prestige, head-to-head, exposed units',/prestige, head-to-head/.test(E('CHARS.Trends.school'))&&/The Historian/.test(E('dogCardHtml()')));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
