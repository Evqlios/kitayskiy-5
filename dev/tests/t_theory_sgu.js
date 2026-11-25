// site69: статьи «Теории» по СГУ — структура, ссылки на страницы, упражнение g336, показ нового урока в «Пути»
const { chromium } = require('playwright'); const cur = require('./cur.js');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(cur.URL); await p.evaluate(() => localStorage.setItem('hz5how', '1')); await p.reload(); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const out = { problems: [] };
    const NEW = ['address', 'tamen3', 'hanyu', 'erhua', 'xiaolao', 'guoren', 'zhonghua', 'punct'];
    out.total = THEORY13.length;
    const ids = THEORY13.map(a => a.id); if (new Set(ids).size !== ids.length) out.problems.push('дубли id');
    THEORY13.forEach(a => {
      if (!a.t || !a.r || !a.r.length || !a.ex || !a.ex.length || !a.src) out.problems.push('пустое поле: ' + a.id);
      a.ex.forEach(e => { const isNew = NEW.includes(a.id); if (e.length !== 3 || !e[1] || !e[2] || (isNew && !e[0])) out.problems.push('пример ' + a.id + ': ' + JSON.stringify(e)); });   // у старых статей про тоны иероглифа в примере может не быть
      if (![1, 2, 3].includes(a.lv)) out.problems.push('lv ' + a.id);
    });
    NEW.forEach(id => { const a = THEORY13.find(x => x.id === id); if (!a) out.problems.push('нет ' + id); else if (!/СГУ с\./.test(a.src)) out.problems.push('нет ссылки на СГУ ' + id); });
    // de: нет непроверенной фразы, есть правило про опускание 的
    const de = THEORY13.find(a => a.id === 'de'); out.deNoQual = !JSON.stringify(de).includes('качественный признак'); out.deOmit = JSON.stringify(de).includes('возможно опустить');
    // g336: три принимаемых ответа и плитки хватает на новый
    const g = D.sgu.find(x => x.id === 'g336'); const t = sguTask26(g);
    out.g336 = { acc: t.acc.map(a => a.join('')), tiles: t.tiles.map(x => x.t).sort().join('|') };
    const need = ['你', '还', '有', '狗', '吗']; const have = t.tiles.map(x => x.t);
    if (!need.every(x => have.includes(x))) out.problems.push('g336: плиток не хватает');
    if (t.hz !== '你还有没有狗') out.problems.push('g336: ans[0] изменён (озвучка привязана): ' + t.hz);
    // уроки: новые статьи попадают в свои уроки
    out.byL = {}; NEW.forEach(id => { const a = THEORY13.find(x => x.id === id); out.byL[id] = a.L; });
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  // скриншоты двух новых статей
  for (const id of ['tamen3', 'punct']) {
    await p.evaluate(id => { document.querySelector('#sub [data-sub="theory"]').click(); }, id).catch(() => {});
    await p.evaluate(id => { TH13ST.open = id; viewTheory13(); }, id); await p.waitForTimeout(400);
    await p.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/th_' + id + '.png' : '/dev/null', fullPage: true }).catch(() => {});
  }
  console.log('errs', errs); await b.close();
})();
