const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const DROP=fs.readFileSync(path.join(W,'intake/2026-10-09.txt'),'utf8');
function boot(page){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-09T18:45:00Z')]))}static now(){return RD.parse('2026-10-09T18:45:00Z')}}w.Date=FD;
    w.fetch=u=>{u=String(u);if(/intake\/2026-10-09\.txt/.test(u))return Promise.resolve({ok:true,status:200,text:()=>Promise.resolve(DROP),json:()=>Promise.resolve({})});
      return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const nhl=boot('nhl.html'),cfb=boot('cfb.html');
setTimeout(()=>{try{
  const L=nhl.eval(`JSON.stringify(nhlLineObj('PIT@CBJ'))`);
  T('NHL: PIT@CBJ lines filed (ML, puck line, total, P1)',/101/.test(L)&&/207/.test(L)&&/6\.5/.test(L),L.slice(0,300));
  const n=['NYR@WSH','SEA@DET','ANA@WPG'].filter(k=>{const s=nhl.eval(`JSON.stringify(nhlLineObj('${k}'))`);return s&&s!=='null'&&s!=='{}';});
  T('NHL: all 4 games filed',n.length===3,n.join(','));
  const shots=JSON.stringify(cfb.eval(`get(LS.ncaafshots,{})`)||{});
  T('CFB: Florida State @ Louisville spread filed',/171/.test(shots)&&/3\.5/.test(shots),shots.slice(0,300));
  ['420','-200','-180','-145'].forEach(p=>T('CFB price '+p+' present',shots.includes(p.replace('-','-'))));
  T('CFB 1st-half lines filed',/29\.5/.test(shots)&&/23\.5/.test(shots));
  const PR=nhl.eval(`get('d4.preds',{})`)||{};const pn=((PR.nhl||{})['2026-10-09']||{});
  T('NHL: 4 Covers predictions filed',Object.keys(pn).length===4&&pn['NYR@WSH']&&pn['NYR@WSH'].a===2.65&&pn['NYR@WSH'].src==='covers',JSON.stringify(pn).slice(0,200));
  const trN=nhl.eval(`get(INTEL_KEY,[]).filter(x=>x.kind==='trend'&&x.sp==='nhl').length`);
  T('NHL: 32 trends filed',trN===32,String(trN));
  const pc=cfb.eval(`JSON.stringify((get('d4.preds',{}).ncaaf||{})['2026-10-09']||{})`);
  T('CFB: 5 Covers predictions filed',(pc.match(/covers/g)||[]).length===5&&/29\.77/.test(pc),pc.slice(0,300));
  const trC=cfb.eval(`get(INTEL_KEY,[]).filter(x=>x.kind==='trend'&&x.sp==='ncaaf').length`);
  T('CFB: 40 trends filed',trC===40,String(trC));
  /* short names that don't resolve must still land on the right side (first = away) */
  const r=cfb.eval(`JSON.stringify(parseNFLSlateText("NFL\\nFlorida State Seminoles @ Louisville Cardinals\\nML: Florida State +150 / Louisville -171\\nSPREAD: Florida State +3.5 (-110) / Louisville -3.5 (-110)\\nH1ML: FSU +127 / UL -147",{resolve:x=>/florida state seminoles/i.test(x)?'FSU':/louisville cardinals/i.test(x)?'LOU':null}))`);
  const P=JSON.parse(r);const arr=(P.picks||P).filter?(P.picks||P):[];
  const f=(m,sd)=>arr.find(x=>x.market===m&&x.side===sd);
  T('unresolved short names: away ML +150, home ML -171',f('moneyline','away')&&f('moneyline','away').price===150&&f('moneyline','home').price===-171,r.slice(0,200));
  T('unresolved short names: spread sides correct',f('spread','away').line===3.5&&f('spread','home').line===-3.5);
  T('unresolved short names: 1H ML sides correct',f('h1ml','away').price===127&&f('h1ml','home').price===-147);
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},4000);
