/* v2.54 · THE UNDERDOG SPOTTER — the next generation's first new caller: plus-money value only, on
   probation (graded on units, no vote and nothing official until its dogs pay). */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const NOW=Date.parse('2026-10-24T15:00:00Z');
function page(file,V){let html=fs.readFileSync(path.join(W,file),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+file,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;w.__NO_REOPEN__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;w.__NO_FLIP_RELOAD__=true;
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
    w.localStorage.setItem('d4.setupDone','1');if(V)w.localStorage.setItem('d4.voices',JSON.stringify(V));}}).window;}
(async()=>{try{
  {const w=page('nhl.html');await wait(2500);
    const r=w.eval(`(()=>{NHL_GAMES=[{id:'g1',away:{abbr:'WPG',name:'Jets'},home:{abbr:'DAL',name:'Stars'},abstract:'pre',start:'2026-10-25T00:00:00Z',date:'2026-10-25T00:00:00Z'},
        {id:'g2',away:{abbr:'MIN',name:'Wild'},home:{abbr:'CGY',name:'Flames'},abstract:'pre',start:'2026-10-25T01:00:00Z',date:'2026-10-25T01:00:00Z'}];
      nhlPutLines([{game:'WPG@DAL',market:'moneyline',side:'away',price:170,src:'espn'},{game:'WPG@DAL',market:'moneyline',side:'home',price:-205,src:'espn'},
        {game:'MIN@CGY',market:'moneyline',side:'away',price:-150,src:'espn'},{game:'MIN@CGY',market:'moneyline',side:'home',price:130,src:'espn'}]);
      const c1=characterCalls('nhl',NHL_GAMES[0],{aw:0.44,hw:0.56,awayProj:2.9,homeProj:3.1,med:6}).filter(x=>x.voice==='Dog');
      const c2=characterCalls('nhl',NHL_GAMES[1],{aw:0.60,hw:0.40,awayProj:3.3,homeProj:2.7,med:6}).filter(x=>x.voice==='Dog');
      return{c1,c2,voter:isVoter('Dog'),inOrder:VOTER_ORDER.includes('Dog'),chars:!!CHARS.Dog};})()`);
    T('the Spotter is on the roster, and on probation it does not vote',r.chars&&r.voter===false&&r.inOrder===false);
    const d=r.c1[0];
    T('a dog the Sim rates clearly above its price gets the call (WPG +170: the Sim 44% vs the price\'s 37%)',r.c1.length===1&&d.market==='ml'&&d.side==='away'&&d.price===170&&d.dEdge>=0.05,JSON.stringify(r.c1.map(x=>({m:x.market,s:x.side,p:x.price,dP:x.dP,e:x.dEdge}))));
    T('a dog priced fairly gets nothing — the Spotter only speaks when the price is wrong (CGY +130)',r.c2.length===0,JSON.stringify(r.c2));
    T('it never takes a favorite',r.c1.every(x=>x.price>0));
    const off=w.eval(`isOfficial({...${JSON.stringify(d)},cf:0.9})`);
    T('on probation nothing it says is official — even with a high confidence',off===false);
    w.eval(`PROB_OK.Dog=true`);
    T('once graduated, its official bar is VALUE (its edge over the price), not a win chance a dog can never reach',w.eval(`isOfficial({...${JSON.stringify(d)},cf:0.41})`)===true&&w.eval(`isOfficial({...${JSON.stringify(d)},cf:0.41,dEdge:0.02})`)===false);
    w.eval(`PROB_OK.Dog=false`);
    /* football spreads: the side getting points */
    const s=w.eval(`(()=>{const g={id:'f1',away:{abbr:'NYJ'},home:{abbr:'BUF'},abstract:'pre',date:'2026-10-25T17:00:00Z'};const add=[];
      dogCharCalls('nfl',g,{aw:0.3,hw:0.7,awayProj:20,homeProj:24},{spH:{price:-110},spA:{price:-110}},-7.5,false,(v,m,sd,ex)=>add.push({v,m,sd,...ex}));return add;})()`);
    T('football: it takes the points when the sim says the dog covers clearly (NYJ +7.5, sim by 4)',s.length===1&&s[0].m==='spread'&&s[0].sd==='away'&&s[0].dEdge>=0.04,JSON.stringify(s));}
  /* probation is judged on units */
  {const V=[];for(let i=0;i<50;i++){const win=i%5<2;V.push({id:'d'+i,sp:'nhl',date:'2026-10-2'+(i%3),game:'A'+i+'@B',voice:'Dog',market:'ml',side:'away',price:180,graded:true,hit:win,units:win?1.8:-1});}
    const w=page('nhl.html',V);await wait(2500);
    const P=w.eval('dogProbation()');
    T('a dog that wins 40% at +180 is a WINNER — probation reads units, not the hit rate',P.n===50&&P.w===20&&Math.abs(P.u-6)<1e-9&&P.ok===true&&w.eval('isVoter("Dog")')===true,JSON.stringify(P));
    w.eval(`if(!document.getElementById('bestCard')){const d=document.createElement('div');d.id='bestCard';document.body.appendChild(d);}renderBest();`);
    T('its card sits under the Best 3 with its record',/The Underdog Spotter/.test(w.document.getElementById('bestCard').innerHTML)&&/Graduated — it votes · 20-30 · \+6\.0u/.test(w.document.getElementById('bestCard').innerHTML));}
}catch(e){T('no crash',false,String(e&&e.stack||e).slice(0,600));}
  const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);})();
