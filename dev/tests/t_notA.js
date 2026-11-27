// Сборка 9: «Он учитель?» засчитывает 他是不是老师 и сокращённое 他是老师; неверный порядок остаётся неверным.
const { chromium } = require('playwright'); const cur = require('./cur.js');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(cur.URL); await p.evaluate(() => localStorage.setItem('hz5how', '1')); await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => { document.getElementById('welcome')?.remove(); stopAll(); });
  const out = { problems: [] };
  // answer: токены в порядке нажатия; ждём результат первой проверки
  const run = async (answer) => {
    await p.evaluate(() => {
      const s = SENTS.find(x => x.id === 's107');
      const t = sentTask(s, poolUpTo(5)); window.__t = t;
      view.innerHTML = '<div id="bx"></div>'; renderBuild27(t, document.getElementById('bx'));
    });
    for (const tok of answer) {
      await p.evaluate(tok => { const b = [...document.querySelectorAll('#bank .tok')].find(x => x.querySelector('.h').textContent === tok); b.click(); }, tok);
    }
    await p.evaluate(() => document.querySelector('#bchk').click()); await p.waitForTimeout(150);
    return await p.evaluate(() => ({ no: !!document.querySelector('.res.no'), txt: document.body.innerText.slice(0, 600) }));
  };
  const cases = [['他','是','不','是','老师', true], ['他','是','老师', true], ['是','他','老师', false]];
  for (const c of cases) {
    const exp = c.pop(); const r = await run(c);
    const ok = !r.no; // нет сообщения «Не совпало» → засчитано
    console.log(c.join(''), ok ? 'ВЕРНО' : 'НЕВЕРНО', '(ожидали', exp ? 'ВЕРНО' : 'НЕВЕРНО)');
    if (ok !== exp) out.problems.push(c.join('') + ' → ' + ok);
  }
  console.log(JSON.stringify(out), 'errs', errs); await b.close(); if (out.problems.length || errs.filter(e => !/answered/.test(e)).length) process.exit(1);
})();
