const $=s=>document.querySelector(s);
const stage=$('#stage'),meas=$('#meas'),mt=meas.querySelector('.t'),msg=$('#msg');
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const THEMES=['day','sepia','night'],root=document.documentElement;
let book=null,bookHash='',tokens=[],starts=[],pages=[],idx=0,anim=false,st=null,dim='',jobId=0;
let fs=+localStorage.getItem('fs')||19,theme=localStorage.getItem('theme')||'day';
root.style.setProperty('--fs',fs+'px');root.dataset.theme=theme;
const say=t=>{msg.textContent=t;msg.style.background=t?'var(--bg)':'none'};
const wait=()=>new Promise(r=>setTimeout(r,16));
function hash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)}

BOOKS.forEach(b=>{
  const el=document.createElement('button');el.className='bk';el.textContent=b.title;
  el.style.borderLeftColor='hsl('+(parseInt(hash(b.id),36)%360)+' 42% 52%)';
  el.onclick=()=>openBook(b);$('#list').append(el);
});

function mk(i){
  const d=document.createElement('div');d.className='pg';
  const t=document.createElement('div');t.className='t';t.textContent=pages[i]||'';
  const n=document.createElement('i');n.textContent=pages[i]!=null?(i+1)+' / '+pages.length:'';
  d.append(t,n);return d;
}
const clear=()=>stage.querySelectorAll('.pg:not(#meas),.leaf,.shade').forEach(e=>e.remove());
const draw=()=>{clear();stage.append(mk(idx))};
const save=()=>{if(book&&starts.length)localStorage.setItem('pos:'+book.id,starts[idx])};

async function openBook(b){
  const job=++jobId;
  book=b;tokens=[];starts=[];pages=[];
  $('#lib').hidden=true;$('#rd').hidden=false;$('#ttl').textContent=b.title;
  clear();say('Загрузка…');
  let text=b.text;
  if(text==null){
    try{text=await (await fetch(b.file)).text()}catch(e){say('Не удалось загрузить '+b.file);return}
  }
  if(job!==jobId)return;
  text=text.replace(/\r/g,'').replace(/([^\n])\n(?!\n)/g,'$1 ').replace(/\n{3,}/g,'\n\n');
  tokens=text.match(/\S+\s*/g)||[];bookHash=hash(text);
  await wait();
  layout(+localStorage.getItem('pos:'+b.id)||0);
}

async function paginate(job){
  const s=[],n=tokens.length;let a=0;
  const fits=k=>{mt.textContent=tokens.slice(a,a+k).join('').trimEnd();return mt.scrollHeight<=mt.clientHeight+1};
  while(a<n){
    if(job!==jobId)return null;
    s.push(a);
    let lo=1,hi=Math.min(n-a,700);
    if(fits(hi))lo=hi;
    else while(lo<hi){const m=(lo+hi+1)>>1;fits(m)?lo=m:hi=m-1}
    a+=lo;
    if(s.length%12===0){say('Подготовка страниц… '+Math.round(a/n*100)+'%');await wait()}
  }
  return s;
}

async function layout(pos){
  const job=++jobId;
  dim=stage.clientWidth+'x'+stage.clientHeight;
  const pre='pg:'+book.id+':',key=pre+bookHash+':'+dim+':'+fs;
  let s=null;try{s=JSON.parse(localStorage.getItem(key))}catch(e){}
  if(!s){
    say('Подготовка страниц…');await wait();
    s=await paginate(job);if(!s)return;
    Object.keys(localStorage).filter(k=>k.startsWith(pre)).forEach(k=>localStorage.removeItem(k));
    try{localStorage.setItem(key,JSON.stringify(s))}catch(e){}
  }
  if(job!==jobId)return;
  starts=s;
  pages=s.map((a,i)=>tokens.slice(a,s[i+1]).join('').trim());
  idx=0;while(idx+1<s.length&&s[idx+1]<=pos)idx++;
  say(pages.length?'':'В этом томе нет текста');
  draw();
}

// --- листание: лист из N полос, каждая повёрнута чуть сильнее предыдущей ---
const N=18;
function prep(dir){
  const j=idx+dir;if(j<0||j>=pages.length)return null;
  clear();
  const under=mk(dir>0?j:idx);
  const shade=document.createElement('div');shade.className='shade';
  stage.append(under,shade);
  const W=stage.clientWidth,H=stage.clientHeight,w=W/N,strips=[];
  const base='top:0;right:auto;bottom:auto;width:'+W+'px;height:'+H+'px;border-radius:0;';
  for(let k=0;k<N;k++){
    const e=document.createElement('div');e.className='s'+(k?'':' leaf');
    e.style.width=(w+(k<N-1?.7:0))+'px';
    if(k)e.style.left=w+'px';
    const f=document.createElement('div');f.className='f';
    const pg=mk(dir>0?idx:j);
    pg.style.cssText=base+'left:'+(-k*w)+'px;box-shadow:none';
    const b=document.createElement('div');b.className='b';
    const ghost=mk(dir>0?idx:j); // просвечивающий текст с обратной стороны листа
    ghost.style.cssText=base+'left:'+(-k*w)+'px;box-shadow:none;background:none;opacity:.07;transform-origin:'+(w/2+k*w)+'px 0;transform:scaleX(-1)';
    const sh=[document.createElement('div'),document.createElement('div')];
    sh.forEach(x=>x.className='sh');
    f.append(pg,sh[0]);b.append(ghost,sh[1]);
    e.append(f,b);e.sh=sh;
    (k?strips[k-1]:stage).append(e);
    strips.push(e);
  }
  return {dir,strips,shade,w,W,p:0};
}
function setP(s,p){ // p: 0..1 — насколько страница перевёрнута
  s.p=p;
  const q=s.dir>0?p:1-p;
  const a0=-180*q*q,c=-6.2*Math.sin(Math.PI*q);
  let x=0,E=0;
  s.strips.forEach((e,k)=>{
    const rad=(a0+k*c)*Math.PI/180;
    e.style.transform='rotateY('+(k?c:a0)+'deg)';
    const o=.5*(1-Math.abs(Math.cos(rad)));
    e.sh[0].style.opacity=o;e.sh[1].style.opacity=o;
    x+=s.w*Math.cos(rad);if(x>E)E=x;
  });
  const k=.42*Math.sin(Math.PI*q);
  s.shade.style.background='linear-gradient(90deg,transparent '+E+'px,rgba(0,0,0,'+k+') '+E+'px,transparent '+(E+s.W*.24)+'px)';
}
function finish(s,to){
  anim=true;
  const from=s.p,D=RM?1:160+300*Math.abs(to-from);let t0=null;
  const f=t=>{
    if(t0===null)t0=t;
    const u=Math.min(1,(t-t0)/D),e=1-(1-u)*(1-u);
    setP(s,from+(to-from)*e);
    if(u<1)requestAnimationFrame(f);
    else{
      if(to===1){idx+=s.dir;save();try{navigator.vibrate&&navigator.vibrate(5)}catch(e){}}
      draw();anim=false;
    }
  };
  requestAnimationFrame(f);
}
function go(dir){
  if(anim||!pages.length)return;
  const s=prep(dir);if(!s)return;
  setP(s,0);finish(s,1);
}

stage.addEventListener('pointerdown',e=>{
  if(anim||!pages.length)return;
  st={x:e.clientX,y:e.clientY,t:Date.now(),s:null,p:0,w:stage.clientWidth};
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
  if(!st)return;
  const dx=e.clientX-st.x,dy=e.clientY-st.y;
  if(!st.s){
    if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy))return;
    st.s=prep(dx<0?1:-1);
    if(!st.s){st=null;return}
  }
  st.p=Math.max(0,Math.min(1,(st.s.dir>0?-dx:dx)/(st.w*.85)));
  setP(st.s,st.p);
});
stage.addEventListener('pointerup',e=>{
  if(!st)return;
  const q=st;st=null;
  const dx=e.clientX-q.x,dt=Date.now()-q.t;
  if(q.s){
    const fast=Math.abs(dx)/Math.max(dt,1)>.5&&q.p>.05;
    finish(q.s,q.p>.3||fast?1:0);
  }else if(Math.abs(dx)<10&&Math.abs(e.clientY-q.y)<10){
    const r=stage.getBoundingClientRect();
    go(e.clientX-r.left>r.width*.5?1:-1);
  }
});
stage.addEventListener('pointercancel',()=>{if(st&&st.s)finish(st.s,0);st=null});
addEventListener('keydown',e=>{
  if($('#rd').hidden)return;
  if(e.key==='ArrowRight'||e.key===' ')go(1);
  if(e.key==='ArrowLeft')go(-1);
});

// --- интерфейс ---
$('#back').onclick=()=>{jobId++;save();book=null;$('#rd').hidden=true;$('#lib').hidden=false};
$('#th').onclick=()=>{
  theme=THEMES[(THEMES.indexOf(theme)+1)%THEMES.length];
  localStorage.setItem('theme',theme);root.dataset.theme=theme;
};
function setFs(d){
  if(!book||anim||!tokens.length)return;
  const pos=starts[idx]||0;
  fs=Math.max(14,Math.min(30,fs+d));
  localStorage.setItem('fs',fs);root.style.setProperty('--fs',fs+'px');
  layout(pos);
}
$('#fm').onclick=()=>setFs(-2);
$('#fp').onclick=()=>setFs(2);
let rt;
addEventListener('resize',()=>{
  clearTimeout(rt);
  rt=setTimeout(()=>{
    if(book&&!$('#rd').hidden&&tokens.length&&!anim&&dim!==stage.clientWidth+'x'+stage.clientHeight)layout(starts[idx]||0);
  },300);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
