// Сборка 10: новые записи знаков доступны по индексу и отдаются сайтом (диапазон байт из пакета); 长/乐/兴 теперь играют сами по себе.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if(!fs.existsSync(f) || fs.statSync(f).isDirectory()){ r.writeHead(404); return r.end(); }
  const st = fs.statSync(f), m = /bytes=(\d+)-(\d+)/.exec(q.headers.range || '');
  if(m){ const a = +m[1], b = Math.min(+m[2], st.size - 1); r.writeHead(206, { 'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 }); fs.createReadStream(f, { start: a, end: b }).pipe(r); }
  else { r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'audio/mpeg', 'Content-Length': st.size }); fs.createReadStream(f).pipe(r); } });
(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`http://localhost:${port}/beta.html`); await p.waitForTimeout(1200);
  const out = { problems: [] };
  const r = await p.evaluate(async () => {
    const res = {};
    for(const key of ['yn', 'fn', 'jn', 'en', 'bn']) for(const id of ['c080', 'c011', 'w009', 'c040', 'c103', 'c115']){
      const e = AIDX[key][id]; if(!e){ res[key + id] = 'нет в индексе'; continue; }
      try{ const u = await blobUrl(key, id); const bl = await (await fetch(u)).blob(); res[key + id] = bl.size === e[1] ? 'ok' : 'размер ' + bl.size + '≠' + e[1]; }catch(x){ res[key + id] = 'ошибка ' + x; }
    }
    res.own = ['c040', 'c103', 'c115'].map(i => D.chars.find(c => c.id === i).own);
    return res;
  });
  for(const [k, v] of Object.entries(r)){ if(k === 'own'){ if(!v.every(Boolean)) out.problems.push('own: ' + v); } else if(v !== 'ok' && !/^jnw009$/.test(k)) out.problems.push(k + ': ' + v); }
  console.log(JSON.stringify(out), 'errs', errs); await b.close(); srv.close(); if(out.problems.length || errs.length) process.exit(1);
})();
