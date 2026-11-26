// Beta: сервис-воркер регистрируется на beta.html (http://localhost), кэширует страницу; подпись версии на экране «Статистика» = Beta;
// откатная страница site75.html регистрирует свой воркер и заменяет воркер Beta (откат работает)
const http = require('http'), fs = require('fs'), path = require('path'); const { chromium } = require('playwright'); const cur = require('./cur.js');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { let f = path.join(cur.ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(cur.ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise(ok => srv.listen(8766, ok)); const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const out = { problems: [] };
  await p.goto('http://localhost:8766/beta.html'); await p.evaluate(() => localStorage.setItem('hz5how', '1')); await p.reload(); await p.waitForTimeout(2500);
  const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); const a = r && (r.active || r.waiting || r.installing); const ks = await caches.keys(); const c = ks.includes('hz5-beta') ? (await (await caches.open('hz5-beta')).keys()).map(x => x.url) : []; return { script: a && a.scriptURL, caches: ks, cached: c }; });
  out.sw = sw; if (!/sw-beta\.js$/.test(sw.script || '')) out.problems.push('воркер Beta не зарегистрирован: ' + sw.script); if (!sw.cached.some(u => /beta\.html$/.test(u))) out.problems.push('страница не в кэше');
  out.label = await p.evaluate(() => { st.tab = 'stats'; route(); return (document.getElementById('ver25') || {}).textContent; }); if (!/Beta/.test(out.label || '')) out.problems.push('подпись версии: ' + out.label);
  // откат: страница site75.html ставит свой воркер поверх
  await p.goto('http://localhost:8766/site75.html'); await p.waitForTimeout(2500);
  out.rollback = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); const a = r && (r.active || r.waiting || r.installing); return a && a.scriptURL; });
  if (!/sw-site75\.js$/.test(out.rollback || '')) out.problems.push('откат: воркер ' + out.rollback);
  // index.html перекидывает на beta.html
  await p.goto('http://localhost:8766/index.html'); await p.waitForTimeout(1500); out.index = p.url(); if (!/beta\.html$/.test(out.index)) out.problems.push('index: ' + out.index);
  console.log(JSON.stringify(out, null, 1)); console.log('errs', errs); await b.close(); srv.close(); if (out.problems.length) process.exit(1);
})();
