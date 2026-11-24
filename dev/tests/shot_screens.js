// Скриншоты экранов «Путь», «Теория» (список и статья), «Статистика» в тёмной и светлой теме, 390 и 1428 px.
// Запуск: node shot_screens.js <абс.путь к html> <префикс>. Файлы: /tmp/claude-0/shots/<префикс>_<экран>_<тема>_<ширина>.png
// Заодно проверяет горизонтальную прокрутку страницы и размер касания (<44 px) у кнопок.
const { chromium } = require('playwright');
const FILE = process.argv[2], PRE = process.argv[3] || 's', DIR = '/tmp/claude-0/shots/';
const SCREENS = {
  path: () => { stopAll(); st.tab = 'path'; st.open = 3; route(); },
  theory: () => { stopAll(); st.tab = 'study'; st.ls = 'theory'; TH13ST.open = null; save(); route(); },
  article: () => { stopAll(); st.tab = 'study'; st.ls = 'theory'; save(); route(); const c = document.querySelector('.th13c'); if (c) c.click(); },
  stats: () => { stopAll(); st.tab = 'stats'; route(); },
};
(async () => {
  const b = await chromium.launch(); const rep = {};
  for (const scheme of ['dark', 'light']) for (const [vw, vh] of [[390, 844], [1428, 730]]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, colorScheme: scheme }); const p = await ctx.newPage();
    await p.goto('file://' + FILE); await p.evaluate(() => localStorage.setItem('hz5how', '1')); await p.reload(); await p.waitForTimeout(900);
    for (const [name, fn] of Object.entries(SCREENS)) {
      await p.evaluate(() => document.getElementById('welcome')?.remove());
      await p.evaluate(fn); await p.waitForTimeout(500);
      await p.screenshot({ path: DIR + PRE + '_' + name + '_' + scheme + '_' + vw + '.png' });
      rep[name + ' ' + scheme + ' ' + vw] = await p.evaluate(() => ({
        hscroll: document.documentElement.scrollWidth > innerWidth + 1,
        small: [...document.querySelectorAll('button,a,select,input')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 40); }).map(e => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)).slice(0, 6),
      }));
    }
    await ctx.close();
  }
  console.log(JSON.stringify(rep, null, 1)); await b.close();
})();
