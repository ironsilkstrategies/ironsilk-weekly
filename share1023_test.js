/* v2.52 · THE SHARE HUB — VIP, free, Telegram, X and Facebook in one place. Telegram posts itself;
   X and Facebook get each post already written (one tap). Built from the free page only: a pick
   can't be shared before its 30-minute unlock. */
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const W='/home/claude/work';
const out=[];const T=(n,ok,d)=>out.push(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const NOW=Date.parse('2026-10-23T00:05:00Z'),D='2026-10-22';   /* 7:05 PM CT: DAL and BOS open, MIN still locked */
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
(async()=>{try{
  const opened=[];let copied=[];
  const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,beforeParse(x){const RD=x.Date;class FD extends RD{constructor(...a){super(...(a.length?a:[NOW]))}static now(){return NOW}}x.Date=FD;
    x.__NO_GRADELOOP__=true;x.__NO_REOPEN__=true;x.__NO_FLIP_RELOAD__=true;x.__NO_SYNC_LOOP__=true;x.__NO_BACKFILL__=true;
    x.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});x.scrollTo=()=>{};x.alert=()=>{};x.confirm=()=>true;x.open=(u)=>{opened.push(u);return null;};
    Object.defineProperty(x.navigator,'clipboard',{configurable:true,value:{writeText:t=>{copied.push(t);return Promise.resolve();}}});
    x.localStorage.setItem('d4.setupDone','1');x.localStorage.setItem('d4.sublink',JSON.stringify('https://whop.com/ironsilkweekly/thedesk-vip'));x.localStorage.setItem('d4.handle',JSON.stringify('RuleTheWorldKid'));}}).window;
  await wait(2500);
  const pk=(game,pick,price,start)=>({sp:'nhl',game,pick,price,p:0.74,ev:12,start,main:true,color:' strong'});
  const top3=[pk('WPG@DAL','DAL ML',-205,'2026-10-23T00:00Z'),pk('MIN@CGY','MIN ML',-205,'2026-10-23T01:00Z'),pk('NSH@BOS','BOS ML',-155,'2026-10-22T23:00Z')];
  w.eval(`set(BEST5_KEY,{d:'${D}',locked:true,lockedAt:Date.now()-6*36e5,top3:${JSON.stringify(top3)},bySport:{},picks:[],props:[]});
    set('d4.best5log',{'${D}':{v:2,picks:${JSON.stringify(top3)}},'2026-10-21':{v:2,picks:[{sp:'nhl',game:'TOR@MTL',pick:'TOR ML',price:-130,p:.7,main:true,hit:true,start:'2026-10-21T23:00Z'},{sp:'nhl',game:'A@B',pick:'B ML',price:-120,p:.7,main:true,hit:false,start:'2026-10-21T23:00Z'}]}});`);
  w.eval('shareHub()');const hub=w.document.getElementById('shHub');const H=hub?hub.innerHTML:'';
  T('the hub opens with the links, the status and the ready posts',!!hub&&/Your links/.test(H)&&/Ready posts/.test(H)&&/VIP card posted/.test(H));
  const P=w.eval('SH_CUR.posts');const L=w.eval('SH_CUR.links');
  T('links: VIP join, free Telegram channel, free page, Facebook, X',L.map(l=>l[1]).join(' ')==='https://whop.com/ironsilkweekly/thedesk-vip https://t.me/TheDeskApp https://ironsilkweekly.com/picks.html https://www.facebook.com/share/1FCDFdUvRp/ https://x.com/RuleTheWorldKid',JSON.stringify(L.map(l=>l[1])));
  T('the unlocked picks are ready to post (DAL and BOS)',P.some(p=>/DAL ML/.test(p.text||''))&&P.some(p=>/BOS ML/.test(p.text||'')),P.map(p=>p.title).join(' | '));
  T('the pick still locked is listed with its unlock time — never its name',P.some(p=>p.locked&&/unlocks 7:30 PM CT/.test(p.title))&&!JSON.stringify(P).includes('MIN ML')&&!H.includes('MIN ML'),P.filter(p=>p.locked).map(p=>p.title).join(','));
  T("yesterday's results post: 1-1 with each pick",P.some(p=>/Results · /.test(p.title)&&/1-1/.test(p.title)&&/✅ TOR ML/.test(p.text)&&/❌ B ML/.test(p.text)),P.filter(p=>/Results/.test(p.title)).map(p=>p.text).join(''));
  T('every X version fits in 280 (links count 23)',P.filter(p=>!p.locked).every(p=>w.eval(`shXLen(shXFit(${JSON.stringify(p.x||p.text)}))`)<=280));
  const i=P.findIndex(p=>/DAL ML/.test(p.text||''));w.eval(`shAct(${i},'x')`);
  T('𝕏 Post opens X with the post already written',/^https:\/\/twitter\.com\/intent\/tweet\?text=/.test(opened[0]||'')&&decodeURIComponent(opened[0].split('text=')[1]).includes('DAL ML (-205)'),opened[0]&&decodeURIComponent(opened[0]).slice(0,120));
  w.eval(`shAct(${i},'fb')`);await wait(50);
  T('Facebook opens the share box on the free page and copies the words to paste',/facebook\.com\/sharer\/sharer\.php\?u=https%3A%2F%2Fironsilkweekly\.com%2Fpicks\.html/.test(opened[1]||'')&&/DAL ML/.test(copied[copied.length-1]||''),opened[1]);
  w.eval('shCopyAll()');await wait(50);T('copy all links: one block for a bio or a pinned post',/VIP — join: https:\/\/whop\.com/.test(copied[copied.length-1]||'')&&/Free Telegram channel: https:\/\/t\.me\/TheDeskApp/.test(copied[copied.length-1]||''));
  T('the X post of a long read drops the quote rather than run over',w.eval(`shXLen(shXFit('⭐ Best 3 · NHL · A@B\\nB ML (-120) · 7:00 PM CT\\n"'+'word '.repeat(80)+'"\\n→ https://ironsilkweekly.com/picks.html'))`)<=280);
  /* the buttons that open it */
  w.eval('shareHub()');w.eval(`(()=>{const d=document.createElement('div');d.id='psTest';d.innerHTML=deskProcessHtml?deskProcessHtml():'';document.body.appendChild(d);})()`);
  T('the daily strip (grade → intake → master evaluation → published) has the Share button',/shareHub\(\)/.test(w.document.getElementById('psTest').innerHTML));
}catch(e){T('no crash',false,String(e&&e.stack||e).slice(0,600));}
  const p=out.filter(x=>x.startsWith('PASS')).length;console.log(out.join('\n'));console.log(`${p} pass / ${out.length-p} fail`);process.exit(0);})();
