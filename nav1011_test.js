const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const mk=(pre)=>new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(w){
  w.__NO_GRADELOOP__=true;w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');if(pre)pre(w);}}).window;
const w=mk();
setTimeout(()=>{try{
  const tb=[...w.document.querySelectorAll('nav button')].find(b=>/tab\('tickets'/.test(b.getAttribute('onclick')||''));
  w.tab('tickets',tb);const saved=JSON.parse(w.localStorage.getItem('td.lastTab'));
  T('opening a tab remembers it (device-only key, never synced)',saved.n==='tickets'&&w.eval(`syncSkip('td.lastTab')`));
  const w2=mk(x=>x.localStorage.setItem('td.lastTab',JSON.stringify({n:'tickets',p:'/nhl.html',ts:Date.now(),y:0})));
  setTimeout(()=>{try{
    T('relaunch restores the last tab instead of Games',w2.document.getElementById('v-tickets').classList.contains('on')&&!w2.document.getElementById('v-games').classList.contains('on'));
    const w3=mk(x=>x.localStorage.setItem('td.lastTab',JSON.stringify({n:'tickets',p:'/nhl.html',ts:Date.now()-4*3600e3,y:0})));
    setTimeout(()=>{try{
      T('a stale (3h+) memory opens on Games as usual',w3.document.getElementById('v-games').classList.contains('on'));
      w.eval(`doSportSwitch('nhl')`);
      T('tapping a sport forgets the tab (you asked for the board)',(w.localStorage.getItem('td.lastTab')==null||JSON.parse(w.localStorage.getItem('td.lastTab')).n==='games')&&w.document.getElementById('v-games').classList.contains('on'));
      const src=w.eval('syncNow.toString()');
      T('automatic sync no longer reloads the page',!/location\.reload/.test(src)&&/toastSync/.test(src));
      w.eval(`deskToast('hi')`);T('quiet toast shows instead',w.document.getElementById('deskToast').textContent==='hi');
    }catch(e){out.push('CRASH '+e.stack);}console.log(out.join('\n'));process.exit(0);},2200);
  }catch(e){out.push('CRASH '+e.stack);console.log(out.join('\n'));process.exit(0);}},2200);
}catch(e){out.push('CRASH '+e.stack);console.log(out.join('\n'));process.exit(0);}},1800);
