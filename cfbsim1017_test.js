/* v2.41 · CFB sim: (1) a schedule name takes the LONGEST SP+ team it starts with (Ohio State ≠ Ohio);
   (2) the total comes from the SP+ offense/defense ratings, not a flat 55 for every game.
   Ratings are the real synced SP+ rows for these teams (Oct 17). */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const R={'Ohio':{offPPG:22.3,defPPG:29,sp:-6.7,src:'SP+'},'Ohio State':{offPPG:41.3,defPPG:11.7,sp:29.5,src:'SP+'},'Indiana':{offPPG:39.3,defPPG:12.8,sp:26.7,src:'SP+'},
  'Kansas':{offPPG:33.4,defPPG:26.2,sp:7.2,src:'SP+'},'Kansas State':{offPPG:31.5,defPPG:20.5,sp:11,src:'SP+'},
  'Massachusetts':{offPPG:20,defPPG:29.4,sp:-9.5,src:'SP+'},'Buffalo':{offPPG:14.7,defPPG:28.9,sp:-13.9,src:'SP+'},
  'Cincinnati':{offPPG:31.6,defPPG:26.5,sp:5.3,src:'SP+'},'West Virginia':{offPPG:32.1,defPPG:32.9,sp:-0.6,src:'SP+'},
  'Average':{offPPG:26.7,defPPG:25.8,sp:0.9,src:'SP+'}};
/* insertion order puts the short name LAST — the order that broke it */
const ORDER=['Ohio State','Ohio','Kansas State','Kansas','Indiana','Massachusetts','Buffalo','Cincinnati','West Virginia','Average'];
const map={};ORDER.forEach(k=>map[k]=R[k]);
const G=(id,a,an,h,hn)=>({id,away:{abbr:a,name:an},home:{abbr:h,name:hn},abstract:'pre',start:'2026-10-17T16:00Z'});
const games=[G('1','OSU','Ohio State Buckeyes','IU','Indiana Hoosiers'),G('2','KU','Kansas Jayhawks','KSU','Kansas State Wildcats'),
  G('3','MASS','Massachusetts Minutemen','BUFF','Buffalo Bulls'),G('4','CIN','Cincinnati Bearcats','WVU','West Virginia Mountaineers'),G('5','OHIO','Ohio Bobcats','BUFF','Buffalo Bulls')];
let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  w.__G=games;w.__M=map;w.eval(`NCAAF_GAMES.length=0;window.__G.forEach(g=>NCAAF_GAMES.push(g));applyCFBDRatings(window.__M);`);
  const sp=t=>w.eval(`(ncaafPowerFor(${JSON.stringify(t)})||{}).sp`);
  T('Ohio State Buckeyes carries Ohio State\'s SP+ (29.5), not Ohio\'s (-6.7)',sp({name:'Ohio State Buckeyes'})===29.5,String(sp({name:'Ohio State Buckeyes'})));
  T('Ohio Bobcats still carries Ohio\'s',sp({name:'Ohio Bobcats'})===-6.7);
  T('Kansas State Wildcats carries Kansas State\'s (11)',sp({name:'Kansas State Wildcats'})===11);
  /* v2.42 · a cached power map that saved the old collision can't bring it back */
  w.eval(`set('d4.cfbdsp',{ts:Date.now(),v:window.__M});NCAAF_POWER['Ohio State Buckeyes']=window.__M['Ohio'];CFB_SP_IDX=null;RO_CACHE['d4.cfbdsp']=null;`);
  T('a stale cached "Ohio State Buckeyes → Ohio" entry is ignored',sp({name:'Ohio State Buckeyes'})===29.5,String(sp({name:'Ohio State Buckeyes'})));
  const S=id=>w.eval(`(()=>{const s=simNCAAFGame(NCAAF_GAMES.find(g=>g.id==='${id}'),10000);return{hw:s.hw,aw:s.aw,a:s.awayProj,h:s.homeProj,t:s.awayProj+s.homeProj,o42:s.over(42.5),o63:s.over(63.5),o50:s.over(50.5)};})()`);
  const osu=S('1');T('OSU @ IU is a real game now (IU 40–65%, was 97%)',osu.hw>0.40&&osu.hw<0.65,JSON.stringify(osu));
  const um=S('3'),cw=S('4');
  T('MASS @ BUFF projects a LOW total (market 42)',um.t<47&&um.t>36,um.t.toFixed(1));
  T('CIN @ WVU projects a HIGH total (market 63.5)',cw.t>57,cw.t.toFixed(1));
  T('no more 80% over on Buffalo\'s 42.5',um.o42<0.62,(um.o42*100).toFixed(0)+'%');
  T('no more automatic under on WVU\'s 63.5',cw.o63>0.38,(cw.o63*100).toFixed(0)+'% over');
  T('home field moves the margin, not the total (sum = T)',Math.abs((cw.h-cw.a)-(-(5.3-(-0.6))+4.5))<0.2,`${cw.a}-${cw.h}`);
}catch(e){T('no crash',false,e.stack.slice(0,400));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3000);
