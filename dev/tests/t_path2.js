const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = {};
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120)); });
  await p.goto(require('./cur.js').URL); await p.waitForTimeout(800);
  await p.evaluate(() => { localStorage.setItem('hz5how', '1'); }); await p.reload(); await p.waitForTimeout(1000);
  await p.evaluate(() => document.getElementById('welcome')?.remove());
  // все 10 уроков раскрываются без ошибок; считаем узлы и этапы
  out.lessons = await p.evaluate(() => { const r = []; for (let L = 1; L <= 10; L++) { st.tab = 'path'; st.open = L; route(); const sec = document.querySelector('.les.openl'); r.push({ L, stages: sec.querySelectorAll('.stg13').length, goDataGo: sec.querySelectorAll('.node[data-go]').length, acts: sec.querySelectorAll('[data-act13]').length, th: sec.querySelectorAll('[data-th13]').length, counters: [...sec.querySelectorAll('.stg13 h4 small')].map(x => x.textContent).join('|') }); } return r; });
  // плитка «Текст и фразы» в уроке 6
  await p.evaluate(() => { st.tab = 'path'; st.open = 6; route(); }); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('[data-act13="dlg:6"]').click()); await p.waitForTimeout(500);
  out.dialog = await p.evaluate(() => ({ ls: st.ls, h: document.querySelector('.box h3')?.textContent, lines: document.querySelectorAll('.t10line').length, first: document.querySelector('.t10line .ru')?.textContent }));
  await p.screenshot({ path: 'dlg.png' });
  await p.evaluate(() => document.querySelector('[data-d13="back"]').click()); await p.waitForTimeout(400);
  out.back = await p.evaluate(() => [st.tab, st.open, !!document.querySelector('.les.openl .stg13')]);
  await p.evaluate(() => document.querySelector('[data-act13="voice:6"]').click()); await p.waitForTimeout(500);
  out.voice = await p.evaluate(() => [st.tab, st.ls, st.scope, document.querySelector('#scopeSel')?.value]);
  await p.evaluate(() => { st.tab = 'path'; st.open = 6; route(); }); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('[data-act13="write:6"]').click()); await p.waitForTimeout(500);
  out.write = await p.evaluate(() => [st.tab, st.ls, st.scope]);
  // перезагрузка на скрытой подвкладке не ломает экран
  await p.evaluate(() => { st.tab = 'study'; st.ls = 'dialog13'; DLG13.L = 3; save(); }); await p.reload(); await p.waitForTimeout(1000);
  out.reload = await p.evaluate(() => [st.tab, st.ls, document.querySelector('#view h3, .box h3')?.textContent]);
  out.errs = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
})();
