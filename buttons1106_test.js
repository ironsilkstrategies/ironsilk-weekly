/* v2.86.1 · EVERY BUTTON: a button whose handler can't compile, or that calls a function that doesn't exist, or that
   passes a string id bare, is dead on the phone. These checks read every inline handler in the code the way the
   browser will, and tap the book-ticket buttons for real. */
const fs=require('fs');const path=require('path');const W='/home/claude/work';const {JSDOM,VirtualConsole}=require('jsdom');
let pass=0,fail=0;const T=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  — '+(x||'')));};
const files=fs.readdirSync(W).filter(f=>/\.js$/.test(f)&&!/_test\.js$/.test(f)&&!/\.cjs$/.test(f));
/* 1 · every handler inside a template literal, cooked the way JS cooks it, must compile */
const bad=[];
for(const f of files){const s=fs.readFileSync(path.join(W,f),'utf8');let i=0;const N=s.length;
  while(i<N){const c=s[i];
    if(c==='/'&&s[i+1]==='/'){const j=s.indexOf('\n',i);i=j<0?N:j;continue;}
    if(c==='/'&&s[i+1]==='*'){const j=s.indexOf('*/',i+2);i=j<0?N:j+2;continue;}
    if(c==='"'||c==="'"){let j=i+1;while(j<N&&s[j]!==c){if(s[j]==='\\')j++;if(s[j]==='\n')break;j++;}i=j+1;continue;}
    if(c==='`'){let j=i+1,depth=0,raw='';while(j<N){const d=s[j];if(d==='\\'){raw+=s[j]+s[j+1];j+=2;continue;}if(depth===0&&d==='`')break;
        if(d==='$'&&s[j+1]==='{'){depth++;raw+='${';j+=2;continue;}if(depth>0&&d==='{')depth++;if(depth>0&&d==='}'){depth--;if(depth===0){raw+='}';j++;continue;}}raw+=d;j++;}
      const cooked=raw.replace(/\$\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g,'H0').replace(/\\(['"`\\$])/g,'$1');
      const re=/on(click|change|input)="([^"]*)"/g;let m;while((m=re.exec(cooked))){const code=m[2].replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
        try{new Function('event',code);}catch(e){bad.push(`${f}:${s.slice(0,i).split('\n').length} ${e.message} :: ${code.slice(0,90)}`);}}
      i=j+1;continue;}
    i++;}}
T('every templated button handler compiles (quotes inside quotes once killed ⚡ Pull sharp lines)',!bad.length,bad.slice(0,5).join(' | '));
/* 2 · a ticket / game / challenge id written into a handler goes through jsArg (a book ticket's id is a string) */
const bare=[];for(const f of files){fs.readFileSync(path.join(W,f),'utf8').split('\n').forEach((ln,i)=>{const re=/on(?:click|change)="[^"]*[(,]\$\{((?:t|g|c|x|F\.m)\.id)\}[,)]/g;let m;while((m=re.exec(ln)))bare.push(f+':'+(i+1)+' '+m[1]);});}
T('no id is written bare into a button',!bare.length,bare.slice(0,6).join(' | '));
/* 3 · a book ticket's buttons work for real */
let html=fs.readFileSync(path.join(W,'nhl.html'),'utf8');html=html.replace(/<script src="([^"?]+)\?v=[^"]+"><\/script>/g,(m,f)=>`<script>${fs.readFileSync(path.join(W,f),'utf8')}</script>`);
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
const w=new JSDOM(html,{runScripts:'dangerously',url:'https://ironsilkweekly.com/nhl.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.__NO_GRADELOOP__=true;w.__NO_BACKFILL__=true;w.__NO_SYNC_LOOP__=true;
  w.fetch=()=>Promise.resolve({ok:false,status:404,json:()=>Promise.resolve({}),text:()=>Promise.resolve('{}')});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>'Renamed by test';w.localStorage.setItem('d4.setupDone','1');}}).window;
setTimeout(()=>{try{
  const tk=(id,extra)=>({id,date:'2026-11-06',source:'mine',stake:1,legs:[{sport:'nhl',game:'CGY@SEA',pick:'CGY +1.5',price:-222},{sport:'nhl',game:'OTT@BUF',pick:'BUF ML',price:-125}],...(extra||{})});
  w.eval(`set(LS.locked,${JSON.stringify([tk('ext1011556038'),tk(1793928645372)])})`);
  w.eval(`tab('tickets',[...document.querySelectorAll('nav button')].find(b=>/Tickets/.test(b.textContent)))`);
  const wait=ms=>new Promise(z=>setTimeout(z,ms));
  (async()=>{try{await wait(2500);
  const btn=(txt,id)=>[...w.document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(txt)&&(b.getAttribute('onclick')||'').includes(String(id)));
  const e0=errs.length;
  const ren=btn('✏️','ext1011556038');T('the book ticket has its buttons',!!ren&&!!btn('Delete','ext1011556038')&&!!btn('Modify','ext1011556038')&&!!btn('Move','ext1011556038'),ren?ren.getAttribute('onclick'):'no rename button');
  if(ren){ren.click();T('Rename on a book ticket works',w.eval(`(get(LS.locked,[]).find(t=>t.id==='ext1011556038')||{}).name`)==='Renamed by test'&&errs.length===e0,errs.slice(e0).join(' | '));}
  await wait(2500);
  const mod=btn('Modify','ext1011556038');if(mod){mod.click();await wait(1500);T('Modify on a book ticket opens the editor',!!btn('Done editing','ext1011556038')&&errs.length===e0,errs.slice(e0).join(' | '));}
  await wait(500);
  const del=btn('Delete','ext1011556038');T('Delete button present after the edit',!!del);if(del){del.click();await wait(300);T('Delete on a book ticket works',!w.eval(`get(LS.locked,[]).some(t=>t.id==='ext1011556038')`)&&errs.length===e0,errs.slice(e0).join(' | '));}
  T('…and a ticket with a numeric id is untouched',w.eval(`get(LS.locked,[]).some(t=>t.id===1793928645372)`));
  await wait(2500);const d2=btn('Delete','1793928645372');T('numeric-id ticket has its Delete button',!!d2);if(d2){d2.click();await wait(300);T('Delete on a numeric-id ticket works',!w.eval(`get(LS.locked,[]).some(t=>t.id===1793928645372)`));}
  T('the sharp-lines button is a real function now',w.eval('typeof pullSharpBtn')==='function');
  }catch(e){T('crashed',false,e.stack);}console.log(pass+' pass / '+fail+' fail');process.exit(0);})();
}catch(e){T('crashed',false,e.stack);console.log(pass+' pass / '+fail+' fail');process.exit(0);}},2500);
