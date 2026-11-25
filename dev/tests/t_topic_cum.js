// Beta: шаг 4 «Рассказать» подряд: для топика 3 в плане три топика (1, 2, 3), итог по каждому, срок повтора у выученных; переключатель; топик 1 — без режима
const { chromium } = require('playwright'); const cur = require('./cur.js');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(cur.URL); await p.evaluate(() => localStorage.setItem('hz5how', '1')); await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => { document.getElementById('welcome')?.remove(); stopAll(); st.tab = 'study'; st.ls = 'topic'; route(); });
  const out = { problems: [] };
  const open = t => p.evaluate(t => { TL10.mode = 'learn'; TL10.t = t; TL10.step = 4; TL10.cumTellT = 0; viewTopic(); }, t);
  // топик 1: режима нет, один план
  await open(1); out.t1 = await p.evaluate(() => ({ cum: !!document.getElementById('t10cum'), groups: document.querySelectorAll('.t10plan').length }));
  if (out.t1.cum || out.t1.groups !== 1) out.problems.push('топик 1: ' + JSON.stringify(out.t1));
  // топик 3: по умолчанию подряд
  await open(3); out.t3 = await p.evaluate(() => ({ cum: document.getElementById('t10cum').checked, groups: document.querySelectorAll('.t10plan').length, heads: [...document.querySelectorAll('.t10plan .lbl')].map(x => x.textContent.slice(0, 8)) }));
  if (!out.t3.cum || out.t3.groups !== 3) out.problems.push('топик 3 по умолчанию: ' + JSON.stringify(out.t3));
  // переключатель выключает режим
  await p.click('#t10cum'); out.off = await p.evaluate(() => document.querySelectorAll('.t10plan').length); if (out.off !== 1) out.problems.push('после выключения групп: ' + out.off);
  await p.click('#t10cum'); out.on = await p.evaluate(() => document.querySelectorAll('.t10plan').length); if (out.on !== 3) out.problems.push('после включения групп: ' + out.on);
  // проверка: строк = сумма строк топиков 1..3, все «Верно» → итог
  await p.click('#t10chk'); out.lines = await p.evaluate(() => document.querySelectorAll('.t10line').length);
  out.expect = await p.evaluate(() => [1, 2, 3].reduce((n, t) => n + TP[t].length, 0)); if (out.lines !== out.expect) out.problems.push('строк ' + out.lines + ' вместо ' + out.expect);
  await p.evaluate(() => document.querySelectorAll('[data-m$=":1"]').forEach(b => b.click())); await p.waitForTimeout(100);
  // клики перерисовывают экран: отметим по одной, пока кнопка итога не станет активной
  for (let i = 0; i < 80; i++) { const dis = await p.evaluate(() => { const f = document.getElementById('t10fin'); return f.disabled; }); if (!dis) break; await p.evaluate(() => { const b = document.querySelector('[data-m$=":1"]:not(.ok)'); b && b.click(); }); }
  await p.click('#t10fin'); await p.waitForTimeout(200);
  out.result = await p.evaluate(() => ({ text: document.getElementById('t10body').innerText.slice(0, 400).replace(/\n/g, ' | '), tl: [1, 2, 3].map(t => !!(st.tl && st.tl[t] && st.tl[t].d)) }));
  if (!/Топик 3 выучен/.test(out.result.text) || !/Итог по топикам/.test(out.result.text)) out.problems.push('итог: ' + out.result.text);
  if (!out.result.tl.every(Boolean)) out.problems.push('срок повтора у топиков 1–3: ' + out.result.tl);
  console.log(JSON.stringify(out, null, 1)); console.log('errs', errs); await b.close(); if (out.problems.length || errs.length) process.exit(1);
})();
