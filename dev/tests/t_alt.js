// Beta: сборка предложения засчитана неверной → на экране разбора кнопка «Мой вариант тоже верен — сообщить»; её нажатие не падает
const { chromium } = require('playwright'); const cur = require('./cur.js');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(cur.URL); await p.evaluate(() => localStorage.setItem('hz5how', '1')); await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => { document.getElementById('welcome')?.remove(); stopAll(); st.tab = 'path'; route(); startSession(2, 'sgu', true); }); await p.waitForTimeout(500);
  const out = { problems: [] }; let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    const isBuild = await p.evaluate(() => !!document.querySelector('#bchk'));
    if (isBuild) {
      found = true;
      await p.click('#bchk'); await p.waitForTimeout(200);           // первая попытка: пустой ответ — неверно
      await p.click('#bchk'); await p.waitForTimeout(300);           // вторая: разбор
      out.btn = await p.evaluate(() => { const x = document.querySelector('.alt13 button[data-rp="alt"]'); return x ? x.textContent : null; });
      if (!out.btn) out.problems.push('кнопки нет');
      else { await p.click('.alt13 button[data-rp="alt"]'); await p.waitForTimeout(400); out.after = await p.evaluate(() => (document.querySelector('.alt13') || {}).innerText); if (!/Текст скопирован|Отправлено/.test(out.after || '')) out.problems.push('после нажатия: ' + out.after); }
    } else {
      await p.evaluate(() => { const o = document.querySelector('.opt'); if (o && !document.querySelector('.opt.ok,.opt.wrong,.opt.right')) o.click(); }); await p.waitForTimeout(150);
      await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(x => /Дальше|Далее/i.test(x.textContent)); if (bs[0]) bs[0].click(); }); await p.waitForTimeout(200);
    }
  }
  if (!found) out.problems.push('сборка не встретилась');
  console.log(JSON.stringify(out, null, 1)); console.log('errs', errs); await b.close(); if (out.problems.length || errs.length) process.exit(1);
})();
