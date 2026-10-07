const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const legs=[{game:'PHI@TB',pick:'TB ML',sport:'nhl',price:-140,p:.6,gameDate:w.eval('today()')},
    {game:'OTT@BOS',pick:'Over 5.5',sport:'nhl',price:-110,p:.52,gameDate:w.eval('today()')},
    {game:'SJ@DAL',pick:'DAL ML',sport:'nhl',price:-150,p:.62,gameDate:w.eval('today()')}];
  w.eval(`set(LS.locked,[{id:'ext9',date:today(),source:'mine',imported:true,stake:'2',toWin:'9.4',legs:${JSON.stringify(legs)}}]);
    set(MS_KEY,[]);msStart('first_win');const A=msAll();A[0].steps.push({ticketId:'ext9',date:today(),pot:0});msSave(A);
    MG_TS=Date.now();MG_LIVE={nhl:{[mgKey('nhl','PHI@TB')]:[{date:today(),state:'in',a:1,h:3,period:3,clock:300,detail:'5:00 - 3rd'}],
      [mgKey('nhl','SJ@DAL')]:[{date:today(),state:'post',a:2,h:4,period:3,clock:0,detail:'Final'}],
      [mgKey('nhl','OTT@BOS')]:[{date:today(),state:'pre',a:null,h:null,start:today()+'T23:59:00-05:00'}]}};`);
  const m=w.eval('msAll()[0]');const h=w.eval('msLiveHtml(msAll()[0])');
  T('challenge card shows the attached ticket live',/● LIVE/.test(h)&&/Ticket #ext9/.test(h));
  T('live leg shows score + clock + live win %',/PHI 1–3 TB · 5:00 - 3rd/.test(h)&&/TB ML/.test(h)&&/\d+%<\/span><\/div>/.test(h));
  T('finished leg marked ✅',/✅[\s\S]*DAL ML/.test(h));
  T('unstarted leg shows its start time',/Over 5\.5[\s\S]*starts /.test(h));
  T('ticket cash chance and the uploaded payout shown',/% to cash/.test(h)&&/\$2\.00 → pays \$11\.40/.test(h));
  w.eval(`(()=>{const A=msAll();A[0].steps[0].done=true;msSave(A);})()`);
  T('settled steps drop out of the live tracker',w.eval('msLiveHtml(msAll()[0])')==='');
}catch(e){T('harness',false,e.stack.split('\n').slice(0,3).join(' | '));}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);},3500);
