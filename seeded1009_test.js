const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function boot(page){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-09T20:30:00Z')]))}static now(){return RD.parse('2026-10-09T20:30:00Z')}}w.Date=FD;
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const pick=s=>s&&JSON.stringify({aw:s.aw,hw:s.hw,mode:s.modeScore,med:s.med,mean:s.mean,aR:s.aR,hR:s.hR});
const nhl=boot('nhl.html'),nfl=boot('nfl.html'),cfb=boot('cfb.html'),mlb=boot('mlb.html');
setTimeout(()=>{try{
  const g={id:'401',away:{abbr:'COL',name:'Colorado Avalanche'},home:{abbr:'WPG',name:'Winnipeg Jets'}};
  const a=pick(nhl.eval(`simNHLGame(${JSON.stringify(g)},5000)`)),b=pick(nhl.eval(`simNHLGame(${JSON.stringify(g)},5000)`));
  T('NHL sim returns identical numbers on a re-run',a===b&&!!a,a);
  const c=pick(boot('nhl.html').eval(`simNHLGame(${JSON.stringify(g)},5000)`));
  T('NHL sim identical after a full reload',a===c,c);
  T('a different game gets its own stream',pick(nhl.eval(`simNHLGame(${JSON.stringify({...g,id:'402'})},5000)`))!==a);
  const fg={id:'nf1',away:{abbr:'KC'},home:{abbr:'BUF'}};
  const n1=pick(nfl.eval(`simNFLGame(${JSON.stringify(fg)},4000)`)),n2=pick(boot('nfl.html').eval(`simNFLGame(${JSON.stringify(fg)},4000)`));
  T('NFL sim identical across reloads',n1===n2&&!!n1,n1);
  const cg={id:'cf1',away:{abbr:'TEX',name:'Texas'},home:{abbr:'OU',name:'Oklahoma'}};
  const c1=pick(cfb.eval(`simNCAAFGame(${JSON.stringify(cg)},4000)`)),c2=pick(cfb.eval(`simNCAAFGame(${JSON.stringify(cg)},4000)`));
  T('CFB sim identical on re-run',c1===c2&&!!c1,c1);
  T('MLB sim + run line are seeded wrappers',mlb.eval('simGame.__seeded===true&&rlProb.__seeded===true'));
  const m1=mlb.eval(`simSeeded(()=>{let s=0;for(let i=0;i<500;i++)s+=nbRuns(4.4);return s},()=> 'mlb|x')()`),m2=mlb.eval(`simSeeded(()=>{let s=0;for(let i=0;i<500;i++)s+=nbRuns(4.4);return s},()=> 'mlb|x')()`);
  T('MLB run draws are reproducible under a seed',m1===m2,m1+' vs '+m2);
  T('the seed never leaks: outside a sim draws stay random',mlb.eval('_SIMR===null'));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},2500);
