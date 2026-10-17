/* v2.40 · one line per market/side: a newer upload replaces an older capture of the same game,
   your own lines outrank the APIs, props and alt rungs are untouched. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const NOW=Date.parse('2026-10-17T07:00:00Z');
const old=Date.parse('2026-10-16T01:25:00Z'),neu=Date.parse('2026-10-17T06:12:00Z');
const r=(market,side,line,price,src,at,extra)=>({away:'OSU',home:'IU',game:'OSU@IU',market,side,line,price,...(src?{src}:{}),capturedAt:at,...(extra||{})});
const shots={'2026-10-15':[r('moneyline','home',null,150,null,old),r('spread','home',3.5,-112,null,old),r('spread','away',-3.5,-108,null,old),r('total','over',50.5,-110,'espn',old)],
  '2026-10-17':[r('spread','home',3,-115,'upload',neu),r('spread','away',-3,-105,'upload',neu),r('moneyline','home',null,138,'upload',neu),
    r('total','over',51.5,-110,'espn',neu+60e3),r('total','over',50.5,-105,'upload',neu),
    r('prop','over',249.5,-110,'upload',neu,{player:'J Smith',stat:'passing'}),r('prop','over',274.5,120,'upload',neu,{player:'J Smith',stat:'passing'})]};
let html=fs.readFileSync(path.join(W,'cfb.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/cfb.html',pretendToBeVisual:true,beforeParse(w){
  const RD=w.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}w.Date=FD;w.__NO_GRADELOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem('d4.setupDone','1');w.localStorage.setItem('d4.ncaafshots',JSON.stringify(shots));}}).window;
setTimeout(()=>{try{
  const L=w.eval(`ncaafBookLinesFor('OSU@IU')`);const f=(m,s)=>L.filter(x=>x.market===m&&x.side===s);
  T('home spread: Saturday upload (+3 -115), not Thursday (+3.5 -112)',f('spread','home').length===1&&f('spread','home')[0].line===3&&f('spread','home')[0].price===-115,JSON.stringify(f('spread','home')));
  T('home ML: +138 upload, not +150',f('moneyline','home').length===1&&f('moneyline','home')[0].price===138);
  T('your upload outranks a later ESPN pull (o50.5 -105, not ESPN 51.5)',f('total','over').length===1&&f('total','over')[0].line===50.5&&f('total','over')[0].src==='upload',JSON.stringify(f('total','over')));
  T('both prop rungs kept',L.filter(x=>x.market==='prop').length===2);
  T('the first match every reader takes is now the right one',w.eval(`ncaafBookLinesFor('OSU@IU').find(x=>x.market==='spread'&&x.side==='home').price`)===-115);
  w.localStorage.setItem('d4.nflshots',JSON.stringify({'2026-10-15':[{away:'BUF',home:'LAR',game:'BUF@LAR',market:'spread',side:'away',line:3.5,price:-110,capturedAt:old}],
    '2026-10-17':[{away:'BUF',home:'LAR',game:'BUF@LAR',market:'spread',side:'away',line:3,price:-103,src:'upload',capturedAt:neu}]}));
  const N=w.eval(`nflBookLinesFor('BUF@LAR')`);
  T('NFL gets the same rule',N.length===1&&N[0].price===-103,JSON.stringify(N));
}catch(e){T('no crash',false,e.stack.slice(0,300));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3000);
