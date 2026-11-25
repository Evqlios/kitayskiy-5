const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('./cur.js').URL); await p.waitForTimeout(800);
  await p.evaluate(() => { localStorage.setItem('hz5how', '1'); }); await p.reload(); await p.waitForTimeout(1000);
  await p.evaluate(() => { document.getElementById('welcome')?.remove(); st.tab = 'path'; st.open = 3; route(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('[data-act13="warm:3"]').click()); await p.waitForTimeout(600);
  for (let i = 0; i < 12; i++) {
    const s = await p.evaluate(() => ({ ss: !!SS, opt: !!document.querySelector('.opt'), btns: [...document.querySelectorAll('#view button')].map(b => b.textContent.trim()).filter(Boolean).slice(0, 8) }));
    if (!s.ss) break;
    await p.evaluate(() => { const o = document.querySelector('.opt:not([disabled])'); if (o) o.click(); }); await p.waitForTimeout(350);
    await p.evaluate(() => { const n = [...document.querySelectorAll('button')].find(x => /^Дальше|Запомнил|Далее/.test(x.textContent.trim()) && x.offsetParent); if (n) n.click(); }); await p.waitForTimeout(450);
  }
  const fin = await p.evaluate(() => ({ ss: !!SS, text: document.querySelector('#view')?.innerText.replace(/\s+/g, ' ').slice(0, 300), btns: [...document.querySelectorAll('#view button, #view .b')].map(b => b.textContent.trim() + '|' + (b.id || b.dataset.go || '')).slice(0, 10) }));
  console.log(JSON.stringify(fin, null, 1)); await p.screenshot({ path: 'warm_end.png' });
  await p.evaluate(() => { const n = [...document.querySelectorAll('#view button')].find(x => /Дальше/.test(x.textContent)); if (n) n.click(); }); await p.waitForTimeout(700);
  console.log('after click:', JSON.stringify(await p.evaluate(() => ({ ss: !!SS, node: SS && SS.node, L: SS && SS.L, tab: st.tab, text: document.querySelector('#view')?.innerText.replace(/\s+/g, ' ').slice(0, 100) }))), errs);
  await b.close();
})();
