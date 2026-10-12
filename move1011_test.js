const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
function mk(setup,pre){let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
  html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
  return new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;
    w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=m=>{w.__alerts=(w.__alerts||[]).concat(String(m))};w.confirm=()=>true;
    if(setup)w.localStorage.setItem('d4.setupDone','1');if(pre)pre(w);}}).window;}
const oldApp=mk(true,w=>{});
setTimeout(async()=>{try{
  oldApp.eval(`set(LS.key,'odds-abc123');set(LS.ai,'AIzaXYZ');set(LS.sharp,'sh_1');set(LS.cfbd,'cfbd+/=key');set('d4.tgbot','123456:ABC-def');_syncSetRaw(SYNC.repo,'ironsilkstrategies/thedesk-data');_syncSetRaw(SYNC.token,'github_pat_'+'x'.repeat(40));set(LS.locked,[{id:'t1'}]);`);
  const m=oldApp.eval('moveCode()');
  T('transfer code carries every key + sync, nothing else',m.code.startsWith('TDMOVE1.')&&m.n===7,m.n+' keys');
  T('history is NOT in the code (that comes from sync)',!/locked|t1/.test(oldApp.eval(`JSON.stringify(moveParse(${JSON.stringify(m.code)}))`)));
  oldApp.eval('syncSettingsPaint&&0');const sh=oldApp.eval('syncSettingsHtml()');
  T('connected app shows 🔑 Copy transfer code',/moveCopy\(\)/.test(sh)&&/Copy transfer code/.test(sh));
  /* fresh app: setup screen shows the restore box */
  const fresh=mk(false);await new Promise(r=>setTimeout(r,1500));
  T('fresh app: setup screen offers "Restore from transfer code"',!!fresh.document.getElementById('moveSetupBox')&&!!fresh.document.getElementById('moveSetupIn'));
  T('not-connected sync box offers restore too',/moveRestore\('moveSyncIn'\)/.test(fresh.eval('syncSettingsHtml()')));
  T('garbage is rejected',fresh.eval(`moveApply('hello')`)===0);
  const evil='TDMOVE1.'+Buffer.from(JSON.stringify({v:1,k:{'d4.locked':'[]','d4.key':'k'}})).toString('base64');
  T('whitelist: a code can only write key slots',fresh.eval(`moveApply(${JSON.stringify(evil)})`)===1&&fresh.localStorage.getItem('d4.locked')===null);
  fresh.localStorage.removeItem('d4.key');
  const n=fresh.eval(`moveApply(${JSON.stringify('  '+m.code.slice(0,30)+'\n'+m.code.slice(30)+' ')})`);
  T('restore (with stray spaces/newlines from Notes) brings back exact values',n===7&&fresh.eval(`get(LS.key,'')`)==='odds-abc123'&&fresh.eval(`get(LS.cfbd,'')`)==='cfbd+/=key'&&fresh.eval(`get('d4.tgbot','')`)==='123456:ABC-def'&&fresh.eval('syncOn()')===true,n);
  T('connected app can ALSO restore (collapsed box)',/moveRestore\('moveSyncIn'\)/.test(sh)&&/<details/.test(sh));
  /* front door (TheDesk.html) restore — no shared.js on that page */
  const fd=new JSDOM(fs.readFileSync(path.join(W,'TheDesk.html'),'utf8'),{runScripts:'dangerously',url:'https://ironsilkweekly.com/TheDesk.html'}).window;
  T('front door shows "Moving from another TheDesk app?"',/Moving from another TheDesk app/.test(fd.document.body.textContent)&&!!fd.document.getElementById('mvIn'));
  let went='';fd.eval(`location.replace=u=>{window.__went=u}`);
  fd.document.getElementById('mvIn').value=m.code;fd.eval('tdMove()');
  T('front door restore writes the keys exactly',fd.localStorage.getItem('d4.key')===oldApp.localStorage.getItem('d4.key')&&fd.localStorage.getItem('d4.synctoken')===oldApp.localStorage.getItem('d4.synctoken')&&fd.localStorage.getItem('d4.setupDone')==='1');
  fd.document.getElementById('mvIn').value=evil;fd.localStorage.clear();fd.eval('tdMove()');
  T('front door whitelist holds too',fd.localStorage.getItem('d4.locked')===null&&fd.localStorage.getItem('d4.key')==='k');
  const fdKeys=(fs.readFileSync(path.join(W,'TheDesk.html'),'utf8').match(/var K=\[([^\]]+)\]/)||[])[1].replace(/'/g,'').split(',').sort().join();
  T('front door whitelist matches the app\u2019s MOVE_KEYS',fdKeys===fresh.eval('MOVE_KEYS.slice().sort().join()'),fdKeys);
  T('sport page pulls the cloud copy on arrival (?moved=1)',/moved=1/.test(fs.readFileSync(path.join(W,'shared.js'),'utf8'))&&/moved=1/.test(fs.readFileSync(path.join(W,'TheDesk.html'),'utf8')));
  T('API keys still never sync',fresh.eval(`['d4.key','d4.tgbot','d4.ai'].every(k=>syncSkip(k))`));
}catch(e){T('crash',false,e.stack)}
console.log(out.join('\n'));process.exit(0);},1500);
