importScripts('books.js');
const V='v2';
const FILES=['./','index.html','app.js','books.js','manifest.json','icon.svg','icon-192.png','icon-512.png',
  ...BOOKS.filter(b=>b.file).map(b=>b.file)];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.open(V).then(async c=>{
    const m=await c.match(e.request);
    const n=fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r}).catch(()=>m);
    return m||n;
  }));
});
