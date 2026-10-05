const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const comp=(side,name,abbr,id)=>({homeAway:side,team:{displayName:name,shortDisplayName:name,abbreviation:abbr,id},score:'',linescores:[],records:[]});
const ev=(id,date,a,h)=>({id,date,season:{type:1,slug:'preseason'},competitions:[{status:{type:{state:'pre',shortDetail:'7:00 PM'}},competitors:[comp('away',a[0],a[1],a[2]),comp('home',h[0],h[1],h[2])]}]});
const urls=[];
function run(mode){let html=fs.readFileSync(path.join(W,'nba.html'),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nba.html',pretendToBeVisual:true,beforeParse(w){
    w.fetch=u=>{u=String(u);urls.push(mode+' '+u);let body={};
      if(/scoreboard/.test(u)){const day=(u.match(/dates=(\d{8})(?![-\d])/)||[])[1];
        const ok=mode==='range'?/dates=\d{8}-\d{8}/.test(u):(mode==='seasontype'?/seasontype=1/.test(u):!/-/.test(u.split('dates=')[1]||''));
        if(ok&&(mode==='range'||day===w.eval('today()').replace(/-/g,'')))body={events:[ev('9001',w.eval('today()')+'T23:30Z',['Lakers','LAL','13'],['Warriors','GS','9']),ev('9002',w.eval('today()')+'T23:00Z',['Melbourne United','MEL','x1'],['Pelicans','NO','3'])]};}
      return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(body)});};
    w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;}
const ws={range:run('range'),day:run('day'),seasontype:run('seasontype')};
setTimeout(()=>{try{
  for(const [k,w] of Object.entries(ws)){const html=w.document.getElementById('slate').innerHTML;
    T(`preseason games show (${k} path)`,/LAL/.test(html)&&/PRESEASON/.test(html)&&!/No NBA games today/.test(html),w.eval('NBA_LOAD_NOTE'));
    T(`international opponent doesn't blank the board (${k})`,/MEL/.test(html));}
}catch(e){T('harness',false,e.message);}
console.log(out.join('\n'));console.log(`\n${out.filter(x=>x.startsWith('PASS')).length}/${out.length} passed`);process.exit(0);},4000);
