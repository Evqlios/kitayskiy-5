// Повторение правил (site66): «Разминка» добавляет задания gr/pn из прошлых уроков, у которых срок повтора наступил
const { chromium } = require('playwright');
const FILE = process.argv[2] || 'file:///home/user/kitayskiy-5/site66.html';
(async () => {
  const b = await chromium.launch(); const out = {}; const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(FILE); await p.evaluate(() => localStorage.setItem('hz5how', '1')); await p.reload(); await p.waitForTimeout(900);
  out.none = await p.evaluate(() => warmSession13(5).filter(t => /^(gr|pn)/.test(t.gid || '')).length);                      // нет истории — правил нет
  out.setup = await p.evaluate(() => {
    const now = Date.now(); const ids = GRAM.filter(e => e.L <= 3).slice(0, 4).map(e => e.id).concat(PHON.filter(e => e.L <= 3).slice(0, 2).map(e => e.id));
    ids.forEach((id, i) => { st.prog[id] = { b: 1, d: now - (i + 1) * 3600e3, n: 1, c: 1, s: 1, df: 5, st: 2, sp: null, lr: now - 864e5 }; });   // 6 просрочены (чем больше i, тем сильнее)
    const late = GRAM.find(e => e.L === 6 || e.L === 5) ; if(late){ st.prog[late.id] = { b: 1, d: now - 1e6, n: 1, c: 1, s: 1, df: 5, st: 2, sp: null, lr: now - 864e5 }; }
    const fut = GRAM.filter(e => e.L <= 3)[5]; if(fut) st.prog[fut.id] = { b: 1, d: now + 864e5 * 3, n: 1, c: 1, s: 1, df: 5, st: 2, sp: null, lr: now };   // срок в будущем — не берём
    return { ids, fut: fut && fut.id, lateL: late && late.L };
  });
  out.warm5 = await p.evaluate(() => { const t = warmSession13(5); return { total: t.length, gram: t.filter(x => /^(gr|pn)/.test(x.gid || '')).map(x => x.gid) }; });
  out.dueIds = await p.evaluate(() => gramDue66(5, 3).map(e => e.id + ':L' + e.L));
  out.noFuture = await p.evaluate(s => !gramDue66(5, 50).some(e => e.id === s.fut), out.setup);
  out.noLater = await p.evaluate(() => gramDue66(3, 50).every(e => e.L < 3));
  // узел на «Пути» и запуск
  await p.evaluate(() => { document.getElementById('welcome')?.remove(); stopAll(); st.tab = 'path'; st.open = 5; route(); }); await p.waitForTimeout(400);
  out.label = await p.evaluate(() => document.querySelector('[data-act13="warm:5"]')?.innerText.replace(/\s+/g, ' '));
  await p.evaluate(() => startSession(5, 'warm', true)); await p.waitForTimeout(500);
  out.started = await p.evaluate(() => !!SS && SS.q.length);
  out.errs = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
})();
