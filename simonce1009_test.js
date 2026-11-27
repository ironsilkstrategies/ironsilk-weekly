const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function boot(page,store){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-09T17:30:00Z')]))}static now(){return RD.parse('2026-10-09T17:30:00Z')}}w.Date=FD;
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');
    if(store)Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,v));}}).window;}
const pick=s=>s&&JSON.stringify({aw:s.aw,hw:s.hw,mode:s.modeScore,med:s.med,mm:s.medMargin,o:s.over(55.5),c:s.homeCover(-3.5),a:s.awayCover(3.5)});
const G=[];for(let i=0;i<40;i++)G.push({id:'cf'+i,away:{abbr:'A'+i,name:'Away '+i},home:{abbr:'H'+i,name:'Home '+i}});
const w1=boot('cfb.html');
setTimeout(()=>{try{
  w1.eval(`window.__G=${JSON.stringify(G)}`);
  let t=Date.now();const r1=w1.eval('__G.map(g=>simNCAAFGame(g))').map(pick);const cold=Date.now()-t;
  T('cold: 40 CFB games simmed',w1.eval('SIMC_STATS.miss')===40,cold+'ms');
  w1.eval('simcFlush()');const blob=w1.localStorage.getItem('d4.simcore');
  T('sim histograms saved on the device',!!blob,(blob||'').length+' chars');
  const w2=boot('cfb.html',{'d4.simcore':blob});
  setTimeout(()=>{try{
    w2.eval(`window.__G=${JSON.stringify(G)}`);
    t=Date.now();const r2=w2.eval('__G.map(g=>simNCAAFGame(g))').map(pick);const warm=Date.now()-t;
    T('reload: zero sims re-run',w2.eval('SIMC_STATS.miss')===0&&w2.eval('SIMC_STATS.hit')===40,'hits '+w2.eval('SIMC_STATS.hit'));
    T('reload is faster than the cold run',warm<cold,`${cold}ms → ${warm}ms`);
    T('reload numbers identical to the original sims (incl. over/cover reads)',JSON.stringify(r1)===JSON.stringify(r2));
    // stored histogram is never mutated by the key-number reweighting
    const r3=w2.eval('__G.map(g=>simNCAAFGame(g))').map(pick);
    T('re-reading a stored sim three times never drifts',JSON.stringify(r3)===JSON.stringify(r1));
    // an input that moves → that game re-sims, the rest stay
    w2.eval(`(()=>{const o=ncaafPowerFor;ncaafPowerFor=t=>t&&t.abbr==='H0'?{offPPG:40,defPPG:14,wins:5,losses:0}:o(t);})()`);
    const before=w2.eval('SIMC_STATS.miss');const m0=pick(w2.eval('simNCAAFGame(__G[0])'));
    T('when a rating moves, only that game re-sims',w2.eval('SIMC_STATS.miss')===before+1&&m0!==r1[0]);
    // MLB run line: one histogram per game, read for every line
    const m=boot('mlb.html');setTimeout(()=>{try{
      const n=m.eval(`(()=>{const C={};const r=[];for(const ln of [-1.5,1.5,-2.5,2.5])r.push(simCore('mlbrl',[4.4,4.1,4000,3.6],()=>{C.n=(C.n||0)+1;return [1]}));return C.n})()`);
      T('MLB run-line histogram computed once for every line on a game',n===1);
      T('d4.simcore is first in line when storage fills (cheapest to rebuild)',m.eval("String(PRUNE_LADDER[0]).includes('d4.simcore')"));
      // NHL + NFL go through the store too
      const h=boot('nhl.html');setTimeout(()=>{try{
        h.eval(`simNHLGame({id:'n1',away:{abbr:'COL'},home:{abbr:'WPG'}},4000);simNHLGame({id:'n1',away:{abbr:'COL'},home:{abbr:'WPG'}},4000)`);
        T('NHL: second call is a stored read',h.eval('SIMC_STATS.miss===1&&SIMC_STATS.hit===1'));
        const f=boot('nfl.html');setTimeout(()=>{try{
          f.eval(`simNFLGame({id:'f1',away:{abbr:'KC'},home:{abbr:'BUF'}},4000);simNFLGame({id:'f1',away:{abbr:'KC'},home:{abbr:'BUF'}},4000)`);
          T('NFL: second call is a stored read',f.eval('SIMC_STATS.miss===1&&SIMC_STATS.hit===1'));
        }catch(e){T('harness nfl',false,e.stack)}done();},2000);
      }catch(e){T('harness nhl',false,e.stack);done();}},2000);
    }catch(e){T('harness mlb',false,e.stack);done();}},2000);
  }catch(e){T('harness2',false,e.stack);done();}},2000);
}catch(e){T('harness',false,e.stack);done();}},2000);
function done(){console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);}
