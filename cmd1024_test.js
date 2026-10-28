/* v2.60 · Telegram commands: the app writes every answer, the robot answers /judge, /unanimous … in the lounges */
process.env.AUTOPILOT_KEY='k';process.env.TG_BOT_TOKEN='t';process.env.GITHUB_REPOSITORY='o/r';process.env.GITHUB_TOKEN='g';
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);const NOW=Date.parse('2026-10-24T15:00:00Z'),D='2026-10-24';
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const V=[{id:'a',voice:'Judge',sp:'nhl',game:'WPG@DAL',market:'ml',side:'away',price:-130,date:D,cf:0.74},{id:'b',voice:'Judge',sp:'nhl',game:'SJ@BOS',market:'total',side:'under',line:6.5,price:-110,date:D,cf:0.61}];
const TC={d:D,by:{nhl:{ts:NOW,picks:[{sp:'nhl',game:'WPG@DAL',m:'ml',sd:'away',pick:'WPG ML',price:-130,unan:true,start:'2026-10-25T00:00:00Z'}],props:[]}}};
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
  x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_BACKFILL__=true;x.__NO_SYNC_LOOP__=true;x.__NO_FLIP_RELOAD__=true;
  x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.localStorage.setItem('d4.setupDone','1');x.localStorage.setItem('d4.voices',JSON.stringify(V));x.localStorage.setItem('d4.tc',JSON.stringify(TC));}}).window;
setTimeout(async()=>{try{
  w.eval(`set(TC_KEY,${JSON.stringify(TC)})`);
  const C=w.eval('cmdBuild()');
  T('every command has an answer: /best /unanimous /record /league /nhl /help and one per character',['best','unanimous','record','league','nhl','help','judge','simulator','underdogspotter'].every(k=>C.r[k]),Object.keys(C.r).join(','));
  T('/judge lists its calls by confidence, official ones marked',/The Judge — top 2 today/.test(C.r.judge)&&/1\. ✅ <b>WPG ML<\/b> -130/.test(C.r.judge)&&/2\. ✅ <b>Under 6\.5/.test(C.r.judge),C.r.judge);
  T('/unanimous lists the picks the whole room agrees on',/WPG ML/.test(C.r.unanimous),C.r.unanimous.slice(0,150));
  T('the / menu goes to Telegram (each command a short description)',C.menu.length>15&&C.menu.every(m=>/^[a-z0-9]+$/.test(m.command)&&m.description.length<=60));
  const P=w.eval(`tgwPayload({d:'${D}',chat:1,ids:[1],ts:1,card:{d:'${D}',best:[],top10:[],chars:[],props:[]}})`);T('the answers ride along with the hand-off to the robot (with /check and today\'s call index)',!!(P.cmd&&P.cmd.r.judge&&P.cmd.r.check&&P.cmd.idx&&P.cmd.idx.calls.length===2&&P.cmd.menu[0].command==='check'));
  /* the robot */
  const Wk=await import(path.join(W,'autopilot/worker.mjs').replace(/^/,'file://')).catch(e=>({err:e}));
  if(Wk.err){T('worker loads',false,String(Wk.err));}else{
    const sent=[];const tg=async(m,p)=>{if(m==='getUpdates')return{ok:true,result:[{update_id:7,message:{message_id:3,chat:{id:-100},text:'/judge@TheDeskBot'}},{update_id:8,message:{message_id:4,chat:{id:-100},text:'/nope'}}]};sent.push([m,p]);return{ok:true};};
    const st={posts:{[D]:{d:D,chat:-100,cmd:P.cmd,st:{}}}};const n=await Wk.runCommands(st,{tg,now:NOW});T('v2.76.1 · the robot never leaves a group on its own',!sent.some(([m])=>m==='leaveChat'));
    const msgs=sent.filter(x=>x[0]==='sendMessage');
    T('the robot answers /judge in the chat it was asked, as a reply',msgs.length===2&&msgs[0][1].chat_id===-100&&/The Judge/.test(msgs[0][1].text)&&msgs[0][1].reply_to_message_id==='3');
    T('an unknown command points to /help; the offset moves so nothing answers twice',/tap \/help/.test(msgs[1][1].text)&&st.tgOff===8&&sent.some(x=>x[0]==='setMyCommands'));}
}catch(e){T('no crash',false,e.stack.slice(0,500));}
const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);},3500);
