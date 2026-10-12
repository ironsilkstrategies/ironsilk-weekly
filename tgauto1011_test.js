const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
let html=fs.readFileSync(path.join(W,'nfl.html'),'utf8');
html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const TG=[];let mid=100;
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nfl.html',pretendToBeVisual:true,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;
  w.fetch=(u,o)=>{u=String(u);if(/api\.telegram\.org/.test(u)){const m=u.split('/').pop();const p=Object.fromEntries(new URLSearchParams(o.body));TG.push({m,p});
      return Promise.resolve({ok:true,json:()=>Promise.resolve(m==='sendMessage'?{ok:true,result:{message_id:mid++}}:{ok:true,result:true})});}
    return Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});};
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(async()=>{try{
  const d=w.eval('today()');
  w.eval(`set('d4.tgbot','123:abc');set('d4.tgchat','-1001234567890');`);
  /* posting keeps the message ids */
  w.eval(`window.subCard=()=>({d:today(),best:[{sp:'nfl',game:'LV@KC',pick:'KC ML',price:-150,p:0.62}],top10:[{sp:'nfl',game:'LV@KC',pick:'KC ML',price:-150,p:0.62,play:true},{sp:'nfl',game:'LV@KC',pick:'Over 44.5',price:-110,p:0.55}],
    banker:{dec:2.5,p:0.4,legs:[{sp:'nfl',game:'LV@KC',pick:'KC ML',price:-150,p:0.62},{sp:'nfl',game:'DEN@LAC',pick:'DEN +3.5',price:-110,p:0.55}]},
    chars:[{v:'Judge',dec:3,p:0.3,legs:[{sp:'nfl',game:'LV@KC',pick:'Over 44.5',price:-110,p:0.55},{sp:'nfl',game:'DEN@LAC',pick:'DEN +3.5',price:-110,p:0.55},{sp:'nfl',game:'NYG@WSH',pick:'WSH ML',price:-120,p:0.55}]}],
    props:[{v:'Coach',sp:'nfl',player:'Travis Kelce',team:'KC',k:'rec',thr:5,cal:0.7,id:'pk1',d:today()}],record:null})`);
  await w.eval('subPostTelegram()');
  const P0=w.eval(`tgPosts()[today()]`);const parts=TG.filter(x=>x.m==='sendMessage').length;
  T('posting stores the message ids and a frozen copy of the card',P0&&P0.ids.length===parts&&P0.card.best.length===1,JSON.stringify(P0&&P0.ids));
  TG.length=0;let n=await w.eval('tgAutoTick()');T('nothing settled yet → nothing sent',n===0&&TG.length===0);
  /* KC wins 27-20 (KC ML ✅, Over 44.5 ✅), DEN loses by 7 (DEN +3.5 ❌) */
  w.eval(`(()=>{const F=get(LS.allfinals,{});F[finalsKey('nfl','LV@KC')]={sport:'nfl',a:20,h:27,d:today(),ts:Date.now()};F[finalsKey('nfl','DEN@LAC')]={sport:'nfl',a:17,h:24,d:today(),ts:Date.now()};set(LS.allfinals,F);})()`);
  n=await w.eval('tgAutoTick()');
  const ed=TG.filter(x=>x.m==='editMessageText'),rp=TG.filter(x=>x.m==='sendMessage');
  T('the original post is edited in place with ✅/❌',ed.length===P0.ids.length&&/✅ <b>KC ML<\/b>/.test(ed.map(x=>x.p.text).join(''))&&/❌ DEN \+3\.5/.test(ed.map(x=>x.p.text).join('')),ed.length+' edits');
  T('dead parlays are marked ❌ on the post',/❌ <b>🏦 THE BANKER/.test(ed.map(x=>x.p.text).join(''))&&/❌ <b>🎭 The Judge/.test(ed.map(x=>x.p.text).join('')));
  const r1=rp[0];T('a results reply goes under the post, with final scores, each pick once',r1&&r1.p.reply_to_message_id===String(P0.ids[0])&&/✅ <b>KC ML \(-150\)<\/b>/.test(r1.p.text)&&/LV 20–27 KC/.test(r1.p.text)&&(r1.p.text.match(/KC ML/g)||[]).length===1,r1&&r1.p.text.replace(/<[^>]+>/g,'').slice(0,160));
  T('no recap while picks are still pending',!rp.some(x=>/Day recap/.test(x.p.text)));
  TG.length=0;n=await w.eval('tgAutoTick()');T('next tick: nothing new → nothing re-sent',n===0&&TG.length===0);
  /* rest of the slate settles: WSH wins, Kelce prop hits */
  w.eval(`(()=>{const F=get(LS.allfinals,{});F[finalsKey('nfl','NYG@WSH')]={sport:'nfl',a:10,h:21,d:today(),ts:Date.now()};set(LS.allfinals,F);set(CPROP_KEY,[{id:'pk1',sp:'nfl',voice:'Coach',player:'Travis Kelce',k:'rec',thr:5,d:today(),hit:true}]);})()`);
  TG.length=0;n=await w.eval('tgAutoTick()');const rc=TG.find(x=>x.m==='sendMessage'&&/Day recap/.test(x.p.text));
  T('everything graded → one day recap',!!rc&&/Best 1: <b>1-0<\/b>/.test(rc.p.text)&&/Top 2: <b>2-0<\/b>/.test(rc.p.text)&&/0 of 1 cashed/.test(rc.p.text)&&/Props: <b>1-0<\/b>/.test(rc.p.text),rc&&rc.p.text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,200));
  TG.length=0;await w.eval('tgAutoTick(true)');T('recap is posted once, then the day is closed',TG.length===0);
  /* only the posting device (or one switched on) runs it */
  w.eval(`(()=>{const P=tgPosts();P['2026-01-01']={d:'2026-01-01',chat:'-100',ids:[5],card:subCard(),dev:'other-device',auto:true,st:{},sent:{},recap:false};set(TGP_KEY,P);})()`);
  T('another device does not run it unless switched on',!w.eval(`tgAutoHere(tgPosts()['2026-01-01'])`)&&(w.eval(`tgAutoDevice(true),tgAutoHere(tgPosts()['2026-01-01'])`)));
  T('subscriber card shows the autopilot controls',/Telegram autopilot/.test(w.eval('subCardHtml()')));
}catch(e){out.push('CRASH '+e.stack);}
console.log(out.join('\n'));process.exit(0);},1500);
