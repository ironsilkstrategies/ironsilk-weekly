/* v2.48 · the ticket evaluator: any pasted slip, every leg read by the characters */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const NOW=Date.parse('2026-10-25T15:00:00Z'),D='2026-10-25';let id=0;
const c=(voice,game,market,side,line,price,cf,x)=>({id:'c'+(++id),sp:'nfl',date:D,game,voice,market,side,line,price,cf,...(x||{})});
const V=[c('Sim','KC@DEN','spread','away',-3.5,-110,0.62,{simP:0.6}),c('Judge','KC@DEN','spread','away',-3.5,-110,0.6),c('Coach','KC@DEN','spread','home',3.5,-110,0.55),
  c('Sim','BUF@MIA','total','under',44.5,-110,0.6,{simP:0.58}),c('Judge','BUF@MIA','total','under',44.5,-110,0.55),c('Sim','JAX@LAR','ml','away',null,140,0.45,{simP:0.44})];
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_FLIP_RELOAD__=true;x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;
  x.localStorage.setItem('d4.setupDone','1');x.localStorage.setItem('d4.voices',JSON.stringify(V));}}).window;
setTimeout(()=>{try{
  const R=w.eval(`evTicket('Chiefs -3.5\\nOver 44.5 Bills\\nJaguars ML\\nZZZ Unknown -7\\n+595')`);
  const L=R.legs;T('every leg is read: team names, spreads, totals, moneylines',L[0].M&&L[0].M.game==='KC@DEN'&&L[1].M&&L[1].M.sd==='over'&&L[2].M&&L[2].M.sd==='away',JSON.stringify(L.map(x=>x.M?x.M.game+' '+x.M.sd:'miss')));
  T('…the characters on each side are named',L[0].agree.length===2&&L[0].against.length===1&&L[1].against.length===2,JSON.stringify([L[0].agree,L[0].against]));
  T('…a leg the desk fades reads under 50%',L[1].p<0.5&&L[2].p<0.5,JSON.stringify(L.map(x=>x.p)));
  T('…an unknown leg is said plainly, not guessed',L[3].miss===true);
  const h=w.eval(`evHtml(evTicket('Chiefs -3.5\\nOver 44.5 Bills'))`);T('the read shows chance to cash, keep/cut per leg',/Chance to cash/.test(h)&&/Cut it/.test(h),h.slice(0,200));
  const F=w.eval(`(()=>{const F=publicFeed();return{props:(F.today&&F.today.props||[]).length,parlay:F.parlay,cashed:(F.cashed||[]).length,simple:F.simple,bullets:JSON.stringify(F).includes('"bullets"')};})()`);
  T('the public page gets the Best 3 only, in plain words (no props, parlays, showcase or math)',F.props===0&&F.parlay===null&&F.cashed===0&&F.simple===1&&!F.bullets,JSON.stringify(F));
  w.eval(`TICKETTAB=TTABS[0][0];renderTickets()`);T('Tickets shows the evaluator card',!!w.document.getElementById('evPaste'));
}catch(e){T('crashed',false,String(e&&e.stack||e).slice(0,300));}
  console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log(`${out.length-f} pass / ${f} fail`);process.exit(0);},2500);
