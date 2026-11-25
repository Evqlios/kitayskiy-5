const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = {};
  for (const [name, vp] of [['mob', { width: 390, height: 844 }], ['desk', { width: 1380, height: 800 }]]) {
    const ctx = await b.newContext({ viewport: vp, colorScheme: 'dark' }); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(require('./cur.js').URL); await p.waitForTimeout(1200);
    await p.evaluate(() => { document.getElementById('welcome')?.remove(); localStorage.setItem('hz5how', '1'); }); await p.reload(); await p.waitForTimeout(1000); await p.evaluate(() => document.getElementById('welcome')?.remove());
    await p.evaluate(() => { document.querySelector('[data-tab="study"]').click(); });
    await p.waitForTimeout(300);
    await p.evaluate(() => { document.querySelector('#sub [data-sub="theory"]').click(); });
    await p.waitForTimeout(500); await p.screenshot({ path: `th_${name}_list.png` });
    out[name + '_cards'] = await p.evaluate(() => document.querySelectorAll('.th13c').length);
    out[name + '_first3'] = await p.evaluate(() => [...document.querySelectorAll('.th13c b')].slice(0, 3).map(x => x.textContent));
    await p.evaluate(() => document.querySelector('[data-th="bu"]').click()); await p.waitForTimeout(400);
    await p.screenshot({ path: `th_${name}_article.png` });
    out[name + '_art'] = await p.evaluate(() => ({ h: document.querySelector('.th13a h3').textContent, ex: document.querySelectorAll('.ex13').length, src: document.querySelector('.th13src').textContent, scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
    await p.evaluate(() => document.querySelector('[data-thback]').click()); await p.waitForTimeout(300);
    out[name + '_back'] = await p.evaluate(() => !!document.querySelector('.th13l'));
    // сохранение подвкладки: перезагрузка
    await p.reload(); await p.waitForTimeout(1200); out[name + '_persist'] = await p.evaluate(() => st.ls);
    // все статьи открываются без ошибок
    await p.evaluate(() => { document.getElementById('welcome')?.remove(); localStorage.setItem('hz5how', '1'); }); await p.reload(); await p.waitForTimeout(1000); await p.evaluate(() => document.getElementById('welcome')?.remove());
    const n = await p.evaluate(() => { let ok = 0; for (const a of THEORY13) { TH13ST.open = a.id; viewTheory13(); if (document.querySelector('.th13a h3')?.textContent === a.t) ok++; } TH13ST.open = ''; return ok; });
    out[name + '_allOpen'] = n; out[name + '_errs'] = errs; await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();
