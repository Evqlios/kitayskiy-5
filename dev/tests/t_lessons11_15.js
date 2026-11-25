const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = {};
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('./cur.js').URL); await p.waitForTimeout(800);
  await p.evaluate(() => { localStorage.setItem('hz5how', '1'); }); await p.reload(); await p.waitForTimeout(1000);
  await p.evaluate(() => document.getElementById('welcome')?.remove());
  out.theory = await p.evaluate(() => ({ n: THEORY13.length, first: THEORY13.slice(0, 4).map(a => a.lv + ':' + a.L + ':' + a.id), lesson13: Object.keys(LESSON13).join(',') }));
  out.rows = [];
  for (let L = 11; L <= 15; L++) {
    const nodes = await p.evaluate(L => NODES.map(([n]) => n).filter(n => nodeAv7(L, n)), L);
    const r = { L, avail: nodes.join(',') };
    for (const n of nodes) {
      
      await p.evaluate(([L, n]) => { stopAll(); st.tab = 'path'; route(); startSession(L, n, true); }, [L, n]); await p.waitForTimeout(450);
      r[n] = await p.evaluate(() => SS ? SS.q.length + (document.querySelector('#view')?.innerText.length > 30 ? '' : '!empty') : 'noSS');
    }
    out.rows.push(r);
  }
  // путь урока 12: этапы и теория
  await p.evaluate(() => { stopAll(); st.tab = 'path'; st.open = 12; route(); }); await p.waitForTimeout(400);
  out.path12 = await p.evaluate(() => ({ goal: document.querySelector('.goal13')?.textContent.slice(0, 160), title: document.querySelector('.les.openl .lt')?.textContent.replace(/\s+/g, ' '), th: [...document.querySelectorAll('.les.openl [data-th13]')].map(x => x.dataset.th13), acts: [...document.querySelectorAll('.les.openl [data-act13]')].map(x => x.dataset.act13) }));
  out.errs = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
})();
