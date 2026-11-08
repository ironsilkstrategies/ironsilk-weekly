/* v2.90.0 · Nov 8: "The underdog spotter knows who the underdog teams are… who every time they are an underdog they win or cover…
   power rankings and history over the season… value is not his thing… rivalries, skill set, defense vs offense… teams who lose to
   underdogs while playing a team who beats favorites… penalizes back-to-back games and players returning from injury… predicts every
   score… an official 70% confidence call… from an internal gut." Invented teams and games, no network. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
let html=fs.readFileSync(path.join(W,'nba.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nba.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  const RD=w.Date;const OFF=RD.parse('2026-11-08T12:00:00-06:00')-RD.now();class FD extends RD{constructor(...a){if(a.length)super(...a);else super(RD.now()+OFF);}static now(){return RD.now()+OFF;}}FD.parse=RD.parse;FD.UTC=RD.UTC;w.Date=FD;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{const E=s=>w.eval(s);const e0=errs.length;const J=JSON.stringify;
  /* the season so far (what the feeds robot writes to teams.json) */
  const TJ={v:1,ts:new Date().toISOString(),lg:{nba:{ppg:113,dogSU:0.30,dogATS:0.48,g:120}},
    t:{'nba|SAC':{n:12,pf:116,pa:112,dog:[8,5,7,0],fav:[4,2,2,0],form:'Wc Lc Wc',last:'2026-11-06',pw:1.5},
       'nba|MIA':{n:12,pf:110,pa:118,dog:[3,1,1,0],fav:[9,4,3,0],form:'Lx Wx Lx',last:'2026-11-07',pw:-2.0},
       'nba|UTAH':{n:11,pf:104,pa:121,dog:[10,0,2,0],fav:[1,1,1,0],form:'Lx Lx Lx',last:'2026-11-07',pw:-9},
       'nba|MIN':{n:11,pf:119,pa:106,dog:[1,1,1,0],fav:[10,9,7,0],form:'Wc Wc Wc',last:'2026-11-05',pw:8},
       'nba|NEW':{n:2,pf:130,pa:90,dog:[2,2,2,0],fav:[0,0,0,0],form:'Wc Wc',last:'2026-11-06',pw:20},'nba|OLD':{n:11,pf:113,pa:113,dog:[2,1,1,0],fav:[8,5,4,0],form:'W L',last:'2026-11-06',pw:0}},
    up:{nba:[{a:'MIA',h:'SAC',st:'2026-11-09T03:00Z',conf:1,neutral:0,restA:1,restH:2},{a:'MIN',h:'UTAH',st:'2026-11-09T02:00Z',conf:0,neutral:0,restA:3,restH:1},{a:'OLD',h:'NEW',st:'2026-11-09T01:00Z',conf:0,neutral:0,restA:2,restH:2}]},
    ret:{'nba|UTAH':[{n:'Star Guard',d:'2026-11-08'}]}};
  T('the season loads from the feeds robot (teams, rest, conference games, back from injury)',E(`dogStoreTeams(${J(TJ)})`)===6&&!!E(`dogTeams().up['nba|MIA@SAC']`));
  /* SAC: a home dog that wins and covers as a dog, against a MIA favorite that keeps losing, on a back-to-back, in a conference game */
  const g1=E(`dogGut({sp:'nba',a:'MIA',h:'SAC',mlA:-220,mlH:180,hl:6,tl:228})`);
  T('a dog that wins and covers as a dog, against a favorite that loses, gets a strong gut (SAC 70+)',g1&&g1.dog==='home'&&g1.G>=70&&g1.known,J(g1&&{G:g1.G,why:g1.why}));
  const L1=g1.why.map(x=>x.lab).join(' | ');
  T('…and every reason is readable: the dog\'s record as a dog, the favorite\'s as a favorite, the triangle, home dog, the back-to-back, the conference game',/SAC as a dog: 5-3 outright/.test(L1)&&/MIA as a favorite: 4-5/.test(L1)&&/the triangle/.test(L1)&&/home dog/.test(L1)&&/MIA on a back-to-back/.test(L1)&&/conference game/.test(L1),L1);
  T('…his score bends the market toward the dog (closer than 6, the line, at his gut)',g1.ps&&(g1.ps.a-g1.ps.h)<6&&Math.abs(g1.ps.a+g1.ps.h-228)<0.6,J(g1.ps));
  /* UTAH: 0-10 as a dog, home on a back-to-back, a star just back from injury → no */
  const g2=E(`dogGut({sp:'nba',a:'MIN',h:'UTAH',mlA:-600,mlH:450,hl:12,tl:226})`);const L2=g2.why.map(x=>x.lab).join(' | ');
  T('a dog that never wins as a dog, on a back-to-back with a player just back from injury, is a no (UTAH low)',g2.G<40&&/UTAH on a back-to-back/.test(L2)&&/back from injury on UTAH: Star Guard/.test(L2),J({G:g2.G,L2}));
  /* a team two games in: its power and scoring are pulled to average, and he makes no official call yet */
  const g3=E(`dogGut({sp:'nba',a:'OLD',h:'NEW',mlA:-130,mlH:110,hl:2,tl:225})`);
  const got3=[];w.__got3=got3;E(`dogCallsV2('nba',{away:{abbr:'OLD'},home:{abbr:'NEW'}},{},{mlA:{price:-130},mlH:{price:110},spH:{line:2,price:-110}},2,false,(v,m,s,ex)=>window.__got3.push({v,m,s}),225)`);
  T('a young season can\'t fake it: two games in, no official call however hot the start',g3&&!g3.known&&got3.length===0,J(g3&&{G:g3.G,known:g3.known,calls:got3}));
  /* on the board: calls, officials, predicted scores */
  const got=[];w.__got=got;
  E(`dogCallsV2('nba',{away:{abbr:'MIA'},home:{abbr:'SAC'}},{},{mlA:{price:-220},mlH:{price:180},spH:{line:6,price:-110},spA:{line:-6,price:-110}},6,false,(v,m,s,ex)=>window.__got.push({v,m,s,ex}),228)`);
  T('70+ → an official call on the dog\'s spread, with his gut, his reasons and his score',got.some(x=>x.v==='Dog'&&x.m==='spread'&&x.s==='home'&&x.ex.dG>=70&&x.ex.why.length&&x.ex.pa!=null),J(got));
  T('…78+ for the moneyline too, never past +300',got.filter(x=>x.m==='ml').every(x=>x.ex.dG>=78));
  T('official at his gut, not the price (spread 70+, moneyline 78+)',E(`isOfficial({voice:'Dog',market:'spread',dG:72,price:-110,date:today()})`)===true&&E(`isOfficial({voice:'Dog',market:'ml',dG:72,price:180,date:today()})`)===false&&E(`isOfficial({voice:'Dog',market:'ml',dG:80,price:180,date:today()})`)===true);
  E(`dogCallsV2('nba',{away:{abbr:'MIN'},home:{abbr:'UTAH'}},{},{mlA:{price:-600},mlH:{price:450},spH:{line:12,price:-110}},12,false,()=>{},226)`);
  T('he calls a score on every game with a dog, official pick or not',!!E(`dogPredFor('nba',{away:{abbr:'MIN'},home:{abbr:'UTAH'}})`)&&E(`scoreCallsFor('nba',{away:{abbr:'MIN'},home:{abbr:'UTAH'}},{awayProj:118,homeProj:105},[])`).some(x=>x.voice==='Dog'));
  T('the Banker\'s sheet leaves outright dogs (under a 45% calibrated chance) to the singles',/legs\[i\]\.p<0\.45/.test(fs.readFileSync(path.join(W,'desk-bank.js'),'utf8')));
  T('his description and card: knows the dogs, gut 70+',/knows the dogs/.test(E('CHARS.Dog.school'))&&/Knows the dogs/.test(E('dogCardHtml()')));
  T('no errors along the way',errs.length===e0,errs.slice(e0).join(' | '));
}catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);},2500);
