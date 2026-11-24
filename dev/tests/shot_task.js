// Скриншоты задания в обеих темах: после верного и после неверного ответа. Запуск: node shot_task.js <файл.html> <префикс>
const { chromium } = require('playwright');
const FILE = process.argv[2], PRE = process.argv[3] || 'x', DIR = '/tmp/claude-0/shots/';
(async () => {
  const b = await chromium.launch(); const res = {};
  for (const [scheme, vw, vh] of [['dark', 1428, 730], ['dark', 390, 844], ['light', 390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, colorScheme: scheme, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.goto('file://' + FILE); await p.waitForTimeout(600);
    await p.evaluate(() => localStorage.setItem('hz5how', '1')); await p.reload(); await p.waitForTimeout(900);
    await p.evaluate(() => { document.getElementById('welcome')?.remove(); stopAll(); st.tab = 'path'; route(); startSession(3, 'gram', true); }); await p.waitForTimeout(500);
    const got = { right: false, wrong: false };
    for (let i = 0; i < 12 && !(got.right && got.wrong); i++) {
      const opts = await p.$$('.opt');
      if (opts.length) {
        await opts[0].click(); await p.waitForTimeout(300);
        const s = await p.evaluate(() => ({ w: !!document.querySelector('.opt.wrong') }));
        const key = s.w ? 'wrong' : 'right';
        if (!got[key]) { got[key] = true; await p.screenshot({ path: DIR + PRE + '_' + scheme + '_' + vw + '_' + key + '.png' }); }
      }
      await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(x => /Дальше|Далее/i.test(x.textContent)); if (bs[0]) bs[0].click(); }); await p.waitForTimeout(350);
    }
    res[scheme + vw] = got; await ctx.close();
  }
  console.log(JSON.stringify(res)); await b.close();
})();
