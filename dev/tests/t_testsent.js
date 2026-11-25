// Итоговый тест (site66): в каждом уроке 1–15 добавлены фразы из диалога/текста; тест собирается без ошибок
const { chromium } = require('playwright');
const FILE = process.argv[2] || require('./cur.js').URL;
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(FILE); await p.evaluate(() => localStorage.setItem('hz5how', '1')); await p.reload(); await p.waitForTimeout(900);
  const r = await p.evaluate(() => { const out = []; for(let L = 1; L <= NL; L++){ let ok = true, nsent = 0, total = 0, bad = 0; for(let k = 0; k < 5; k++){ try{ const t = testSession15(L); total = t.length; nsent = t.filter(x => /^s\d/.test(x.gid || '')).length; if(t.some(x => !x)) bad++; }catch(e){ ok = false; } } out.push(L + ':' + (ok ? 'ok' : 'ERR') + ' вопросов ' + total + ', фраз ' + nsent + (bad ? ' пустых ' + bad : '')); } return out; });
  console.log(r.join('\n'), '\nerrs', errs); await b.close();
})();
