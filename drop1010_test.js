const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const DROP=fs.readFileSync(path.join(W,'intake/2026-10-10.txt'),'utf8');
function boot(page){let html=fs.readFileSync(path.join(W,page),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/'+page,pretendToBeVisual:true,beforeParse(w){
    const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[RD.parse('2026-10-10T16:30:00Z')]))}static now(){return RD.parse('2026-10-10T16:30:00Z')}}w.Date=FD;w.__NO_GRADELOOP__=true;
    w.fetch=u=>{u=String(u);if(/intake\/2026-10-10\.txt/.test(u))return Promise.resolve({ok:true,status:200,text:()=>Promise.resolve(DROP),json:()=>Promise.resolve({})});
      return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const nhl=boot('nhl.html'),mlb=boot('mlb.html');
setTimeout(()=>{try{
  const S=JSON.parse(nhl.eval(`JSON.stringify(get(NHL_LS.shots,{}))`)||'{}');const rows=Object.values(S).flat();
  const games=[...new Set(rows.map(r=>r.game))];
  T('NHL: all 14 games filed',games.length===14,games.join(' '));
  const f=(g,m,s)=>rows.filter(r=>r.game===g&&r.market===m&&r.side===s).pop();
  const chk=[['PHI@BOS','moneyline','away',115],['PHI@BOS','spread','home',195],['VAN@NJ','moneyline','home',-285],['UTAH@BUF','spread','away',219],['CAR@CHI','moneyline','away',-238],['ANA@CGY','spread','home',-245],['TB@NYI','total','under',-107]];
  chk.forEach(([g,m,s,p])=>{const r=f(g,m,s);T(`NHL ${g} ${m} ${s} = ${p}`,r&&+r.price===p,r?String(r.price):'missing — keys: '+games.filter(x=>x.includes(g.split('@')[0].slice(0,2))).join(','));});
  const B=JSON.stringify(mlb.eval(`get(LS.bookshots,{})`)||{});
  T('MLB: White Sox @ Guardians filed with F5 lines',/CWS@CLE/.test(B)&&/-135/.test(B)&&/3\.5/.test(B),B.slice(0,200));
}catch(e){T('harness',false,e.stack);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length} pass / ${out.filter(x=>x.startsWith('FAIL')).length} fail`);process.exit(0);},4000);
