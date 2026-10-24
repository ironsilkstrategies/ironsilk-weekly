/* v2.58 · VIP props name the player's team and game (and the worker's result posts carry the same label) */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);const NOW=Date.parse('2026-10-24T15:00:00Z');
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_BACKFILL__=true;x.__NO_SYNC_LOOP__=true;x.__NO_FLIP_RELOAD__=true;
  x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const c={v:'Judge',sp:'nhl',player:'Kyle Connor',team:'WPG',game:'WPG@DAL',k:'s',thr:3,cal:0.74,start:'2026-10-25T00:00:00Z'};
  const s=w.eval(`propWhere(${JSON.stringify(c)})`);T('a prop names its team, game and start',s===' (WPG · WPG@DAL · 7:00 PM CT)',s);
  const P=w.eval(`tgwPayload({d:'2026-10-24',chat:1,ids:[1],ts:1,card:{d:'2026-10-24',best:[],top10:[],chars:[],props:[${JSON.stringify(c)}]}}).legs`);
  T("the worker's result post for it carries the same label",P.length===1&&/Kyle Connor 3\+ .* \(WPG · WPG@DAL/.test(P[0].label),P[0]&&P[0].label);
  const txt=w.eval(`subTelegramText({d:'2026-10-24',best:[],top10:[],chars:[],props:[${JSON.stringify(c)}]},()=>'').join('\\n')`);
  T('the VIP card shows it',/Kyle Connor 3\+[^\n]*\(WPG · WPG@DAL/.test(txt),(txt.match(/Kyle Connor[^\n]*/)||[''])[0]);
}catch(e){T('no crash',false,e.stack.slice(0,400));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3000);
