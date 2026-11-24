// Смоук: открыть страницу, собрать ошибки консоли, проверить что экран отрисовался
const { chromium } = require('playwright');
(async () => {
  const file = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto('file://' + file); await p.waitForTimeout(2500);
  const n = await p.evaluate(() => document.body.innerText.length);
  console.log('text length', n, 'errors', errs.length); errs.slice(0, 8).forEach(e => console.log(' ', e));
  await b.close();
})();
