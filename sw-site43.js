/* Service worker страницы site43 (офлайн). Создан сборкой из v30/sw.template.js; публикуется рядом со страницей как sw-site43.js.
   Область — только эта страница (scope = её адрес): index.html и другие версии не затрагиваются.
   Страница: сеть первой (обновления не залипают), без сети — копия из кэша. Звуковые пакеты pack2_*.mp3 и иконки: из кэша, если уже скачаны. */
const CACHE = 'hz5-site43';
const PAGE = self.registration.scope;                 // адрес страницы (scope = полный адрес страницы)
const STATIC = /\/(pack2_[nms]\.mp3|icon-\d+\.png|manifest\.webmanifest)$/;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add(new Request(PAGE, { cache: 'reload' }))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // чужие кэши (hz5-siteNN других версий) не трогаем: у каждой версии свой воркер и свой кэш
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if(r.method !== 'GET') return;
  const u = new URL(r.url);
  if(u.origin !== location.origin) return;            // Firebase, Google и т.п. — напрямую
  if(r.mode === 'navigate' && u.href.split('#')[0].split('?')[0] === PAGE){
    // сеть первой, но не дольше 5 с и только если ответ исправный; иначе копия из кэша
    const fromCache = () => caches.open(CACHE).then(c => c.match(PAGE));
    const net = fetch(r).then(res => { if(res && res.ok){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(PAGE, cp)); } return res; });
    const slow = new Promise(res => setTimeout(() => res(null), 5000));
    e.respondWith(Promise.race([net, slow]).then(res => (res && res.status < 500) ? res : fromCache().then(m => m || net)).catch(() => fromCache().then(m => m || Response.error())));
    return;
  }
  if(STATIC.test(u.pathname)){
    // звук приходит запросами Range (кусками): если целый файл уже в кэше, отдаём нужный кусок (206); иначе — из сети
    e.respondWith(caches.open(CACHE).then(async c => {
      const key = new Request(u.href);
      let m = await c.match(key);
      if(!r.headers.has('range')){
        if(m) return m;
        const res = await fetch(r); if(res && res.ok) c.put(key, res.clone()); return res;
      }
      if(!m) return fetch(r);
      const buf = await m.arrayBuffer(), mt = /^bytes=(\d*)-(\d*)$/.exec(r.headers.get('range') || '');
      if(!mt) return fetch(r);
      const size = buf.byteLength, a = mt[1] === '' ? Math.max(0, size - +mt[2]) : +mt[1], b = mt[1] === '' || mt[2] === '' ? size - 1 : Math.min(+mt[2], size - 1);
      if(a > b || a >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
      return new Response(buf.slice(a, b + 1), { status: 206, headers: { 'Content-Type': m.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': 'bytes ' + a + '-' + b + '/' + size, 'Content-Length': String(b - a + 1), 'Accept-Ranges': 'bytes' } });
    }));
  }
});
