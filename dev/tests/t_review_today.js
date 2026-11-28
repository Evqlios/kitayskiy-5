// «Повторение сегодня» (аудит 5.2): на «Пути» считаются слова и вопросы грамматики, сессия «rev» собирает и те и другие, ответы проходят без ошибок
const { chromium } = require('playwright'); const cur = require('./cur.js');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = [], out = { problems: [] };
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(cur.URL); await p.waitForTimeout(900); await p.evaluate(() => document.getElementById('welcome') && document.getElementById('welcome').remove());
  const r = await p.evaluate(() => {
    const now = Date.now(); st.pt = { '3:intro': { s: 3, n: 1 } };
    WORD_DECK.filter(isPlain).slice(0, 6).forEach(w => { st.prog[w.id] = { b: 1, d: now - 60000, n: 1, c: 1, lr: now - 3600000 }; });
    ['gr05', 'gr20', 'gr100'].forEach(id => { st.prog[id] = { b: 1, d: now - 60000, n: 1, c: 0, lr: now - 3600000 }; st.err = Object.assign(st.err || {}, { [id]: 1 }); });
    st.tab = 'path'; route();
    const card = (document.querySelector('.due7') || {}).innerText || '';
    const dg = dueGram17().map(e => e.id);
    const tasks = reviewSession();
    return { card, dg, kinds: tasks.map(t => (t.gid || '').slice(0, 2)), n: tasks.length };
  });
  if (!/Повторение сегодня/.test(r.card) || !/грамматик/.test(r.card)) out.problems.push('карточка на Пути: ' + JSON.stringify(r.card));
  if (r.dg.length < 2) out.problems.push('просроченная грамматика не найдена: ' + r.dg);
  if (!r.kinds.includes('gr')) out.problems.push('в сессии нет вопросов грамматики: ' + r.kinds);
  if (r.n < 7) out.problems.push('в сессии мало заданий: ' + r.n);
  // пройти сессию: отвечаем первым вариантом/ждём сборку, главное — без ошибок страницы
  await p.evaluate(() => startSession(0, 'rev')); await p.waitForTimeout(500);
  let steps = 0; while (steps++ < 40) { const o = await p.$('#view .opt'); if (!o) break; await o.click(); await p.waitForTimeout(120); const nb = await p.$('#view button:has-text("Дальше"), #view button:has-text("Итог")'); if (nb) await nb.click(); await p.waitForTimeout(120); }
  console.log(JSON.stringify(out), JSON.stringify(r).slice(0, 300), 'errs', errs); await b.close(); if (out.problems.length || errs.length) process.exit(1);
})();
