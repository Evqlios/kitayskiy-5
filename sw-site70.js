/* Service worker страницы site70 (офлайн). Создан сборкой из v30/sw.template.js; публикуется рядом со страницей как sw-site70.js.
   site51: область = ВСЯ папка сайта (раньше — только адрес страницы), чтобы запуск с иконки на экране телефона (manifest start_url "./",
   то есть index.html, который лишь перекидывает на страницу) открывался без сети: на запрос "./" и "index.html" без сети отдаётся кэш страницы этой версии.
   Страница siteNN.html: сеть первой (обновления не залипают), без сети — копия из кэша. Другие siteNN.html (старые версии) воркер не трогает.
   Звуковые пакеты pack2_*.mp3 и иконки: из кэша, если уже скачаны. Каждая новая версия регистрирует свой sw-siteNN.js в той же области и заменяет прежний. */
const CACHE = 'hz5-site70';
const SCOPE = self.registration.scope;                // адрес папки сайта, с «/» на конце
const PAGE = new URL('site70.html', SCOPE).href;     // страница этой версии
const ROOTS = [SCOPE, SCOPE + 'index.html'];          // то, на что ведёт иконка (start_url "./")
const STATIC = /\/(pack2_(?:[nms]|[fxyjbe][nms])\.mp3|icon-\d+\.png|manifest\.webmanifest)$/;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add(new Request(PAGE, { cache: 'reload' }))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // site46: чистим кэши СТАРЫХ версий (hz5-siteNN с меньшим NN) — раньше они копились на телефоне вечно (страница ~1 МБ на каждую версию).
  // Свой кэш, кэши более новых версий и любые чужие имена (не hz5-siteNN) не трогаем.
  const mine = +/site(\d+)$/.exec(CACHE)[1];
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => { const m = /^hz5-site(\d+)$/.exec(k); return (m && +m[1] < mine) ? caches.delete(k) : null; }))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if(r.method !== 'GET') return;
  const u = new URL(r.url);
  if(u.origin !== location.origin) return;            // Firebase, Google и т.п. — напрямую
  const here = u.href.split('#')[0].split('?')[0];
  if(r.mode === 'navigate' && (here === PAGE || ROOTS.includes(here))){
    // сеть первой, но не дольше 5 с и только если ответ исправный; иначе копия страницы ЭТОЙ версии из кэша
    // (для "./" и index.html онлайн отдаётся настоящий index.html — он перекинет на актуальную версию; в кэш он не кладётся)
    const fromCache = () => caches.open(CACHE).then(c => c.match(PAGE));
    const net = fetch(r).then(res => { if(here === PAGE && res && res.ok){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(PAGE, cp)); } return res; });
    const slow = new Promise(res => setTimeout(() => res(null), 5000));
    e.respondWith(Promise.race([net, slow]).then(res => (res && res.status < 500) ? res : fromCache().then(m => m || net)).catch(() => fromCache().then(m => m || Response.error())));
    return;
  }
  if(STATIC.test(u.pathname)){
    // звук приходит запросами Range (кусками): если целый файл уже в кэше, отдаём нужный кусок (206); иначе — из сети
    // site53: звук и иконки лежат в отдельном кэше hz5-static (имя не hz5-siteNN), его не чистит activate — новая версия не стирает скачанный звук
    e.respondWith(caches.open('hz5-static').then(async c => {
      const key = new Request(u.href);
      let m = await c.match(key);
      if(!r.headers.has('range')){
        if(m) return m;
        const res = await fetch(r); if(res && res.ok) e.waitUntil(c.put(key, res.clone()).catch(() => {})); return res;
      }
      if(!m) return fetch(r);
      // site46: раньше m.arrayBuffer() читал весь пакет (6–8 МБ) в память на КАЖДЫЙ Range-запрос; Blob режется лениво — читается только нужный кусок
      const buf = await m.blob(), mt = /^bytes=(\d*)-(\d*)$/.exec(r.headers.get('range') || '');
      if(!mt) return fetch(r);
      const size = buf.size, a = mt[1] === '' ? Math.max(0, size - +mt[2]) : +mt[1], b = mt[1] === '' || mt[2] === '' ? size - 1 : Math.min(+mt[2], size - 1);
      if(a > b || a >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
      return new Response(buf.slice(a, b + 1), { status: 206, headers: { 'Content-Type': m.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': 'bytes ' + a + '-' + b + '/' + size, 'Content-Length': String(b - a + 1), 'Accept-Ranges': 'bytes' } });
    }));
  }
});
