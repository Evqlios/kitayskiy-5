// Настройка «Тоны в заданиях» (st.nt): скрывает разделы с тонами, не мешает «Продолжить» и зачёту урока, ответы без тона принимаются.
// Запуск: node dev/tests/t_notone.js
const { chromium } = require('playwright'); const cur = require('./cur.js');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const out = { problems: [] }; const bad = m => out.problems.push(m);
  await p.goto(cur.URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('hz5how', '1'); }); await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => { document.getElementById('welcome')?.remove(); stopAll(); });

  /* ---------- 1. «Продолжить» и зачёт урока ---------- */
  const r = await p.evaluate(() => {
    const res = {};
    const star = (L, n) => { st.pt = st.pt || {}; st.pt[L + ':' + n] = { s: 3, n: 5 }; };
    st.pt = {}; ['intro', 'listen', 'sign', 'gram', 'phon', 'sent', 'sgu', 'test'].forEach(n => star(1, n));        // у урока 1 пройдено всё, кроме «Пиньинь и тоны»
    for(const nt of [0, 1, 2]){ st.nt = nt; const nx = nextNode(); res['next' + nt] = nx ? nx.L + ':' + nx.n : null; res['full' + nt] = lessonsFull10(); res['parts' + nt] = lessonParts(1).map(x => x[0]).join(','); }
    st.pt = {}; ['intro', 'listen', 'sign', 'gram', 'sent', 'sgu', 'test'].forEach(n => star(1, n));                  // не пройдены «Пиньинь и тоны» и «Фонетика»
    for(const nt of [1, 2]){ st.nt = nt; res['fullB' + nt] = lessonsFull10(); }
    st.nt = 0; st.pt = {}; return res;
  });
  out.nodes = r;
  if(r.next0 !== '1:tone') bad('без настройки «Продолжить» должен вести в «Пиньинь и тоны» урока 1, а ведёт в ' + r.next0);
  if(!r.next1 || /:tone$/.test(r.next1)) bad('с настройкой «Продолжить» всё ещё ведёт в тоны: ' + r.next1);
  if(r.full0 !== 0 || r.full1 !== 1) bad('зачёт урока: без настройки ' + r.full0 + ' (нужно 0), с настройкой ' + r.full1 + ' (нужно 1)');
  if(r.parts0.includes('tone') === false || r.parts1.includes('tone') || r.parts1.includes('phon') === false || r.parts2.includes('phon')) bad('разделы урока: ' + JSON.stringify([r.parts0, r.parts1, r.parts2]));
  if(r.fullB1 !== 0 || r.fullB2 !== 1) bad('уровень 2 должен скрывать и «Фонетику»: ' + JSON.stringify([r.fullB1, r.fullB2]));

  /* ---------- 2. ответы пиньинем без тона ---------- */
  const a = await p.evaluate(() => {
    const w = WORD_DECK.find(x => Array.isArray(x.syl) && x.syl.length === 2 && x.syl.every(s => /[āáǎàēéěèīíǐìōóǒòūúǔù]/.test(s)));
    const plain = digits27 ? w.syl.map(s => digits27(s).replace(/[0-5]/g, '')).join(' ') : '';
    const full = w.syl.map(digits27).join(' '), wrongTone = w.syl.map(s => digits27(s).replace(/[0-5]$/, '4')).join(' ');
    const res = { hz: w.hz, plain, full };
    for(const nt of [0, 1]){ st.nt = nt; res['plain' + nt] = checkPy(w, plain); res['full' + nt] = checkPy(w, full); res['wrongTone' + nt] = checkPy(w, wrongTone); res['garbage' + nt] = checkPy(w, 'zzzz qqqq'); }
    st.nt = 0; return res;
  });
  out.typed = a;
  if(a.plain0 !== 'tone') bad('без настройки ответ без тона должен быть «буквы верные, тоны нет»: ' + a.plain0);
  if(a.plain1 !== 'ok' || a.wrongTone1 !== 'ok') bad('с настройкой ответ без тона/с чужим тоном должен быть верным: ' + a.plain1 + ' / ' + a.wrongTone1);
  if(a.full0 !== 'ok' || a.full1 !== 'ok') bad('полный ответ с тоном всегда верный: ' + a.full0 + ' / ' + a.full1);
  if(a.garbage0 !== 'bad' || a.garbage1 !== 'bad') bad('чужие буквы должны оставаться неверными: ' + a.garbage0 + ' / ' + a.garbage1);

  /* ---------- 3. итоговый тест без вопросов про тон ---------- */
  const t = await p.evaluate(() => { const cnt = nt => { st.nt = nt; let n = 0; for(let k = 0; k < 40; k++) testSession15(3).forEach(x => { if(/верный тон|Выбери тон|тон/i.test(String(x.q || '').replace(/<[^>]+>/g, ' ')) && /тон/i.test(String(x.q))) n++; }); return n; }; const r = { with: cnt(0), without: cnt(1) }; st.nt = 0; return r; });
  out.testTone = t; if(t.with === 0) bad('проверка не видит вопросов про тон даже без настройки (тест бесполезен)'); if(t.without !== 0) bad('в итоговом тесте остались вопросы про тон: ' + t.without);

  /* ---------- 4. экран «Статистика → Тоны в заданиях» и «Путь» ---------- */
  await p.evaluate(() => { st.tab = 'stats'; route(); }); await p.waitForTimeout(300);
  const seg = await p.evaluate(() => [...document.querySelectorAll('#ntSeg button')].map(b => b.textContent)); if(seg.length !== 3) bad('в настройках нет трёх вариантов: ' + seg);
  await p.click('#ntSeg button[data-nt="2"]'); await p.waitForTimeout(300);
  const s2 = await p.evaluate(() => ({ nt: st.nt, on: [...document.querySelectorAll('#ntSeg button.on')].map(b => b.dataset.nt) })); if(s2.nt !== 2 || s2.on.join() !== '2') bad('кнопка настройки: ' + JSON.stringify(s2));
  await p.evaluate(() => { st.tab = 'path'; st.open = 1; route(); }); await p.waitForTimeout(400);
  const path = await p.evaluate(() => ({ tone: !!document.querySelector('[data-go$=":tone"]') || /Пиньинь и тоны/.test(document.body.innerText), phon: !!document.querySelector('[data-go$=":phon"]'), words: !!document.querySelector('[data-go$=":intro"]') }));
  if(path.tone || path.phon) bad('на «Пути» остались разделы с тонами: ' + JSON.stringify(path)); if(!path.words) bad('на «Пути» пропали «Слова»');
  await p.screenshot({ path: (process.env.SHOTDIR || '.') + '/nt_path.png', fullPage: true });
  // сохранение и перезагрузка; cleanState не пропускает мусор
  await p.reload(); await p.waitForTimeout(800); const keep = await p.evaluate(() => st.nt); if(keep !== 2) bad('настройка не сохранилась: ' + keep);
  const cl = await p.evaluate(() => [cleanState({ nt: 7 }).nt, cleanState({ nt: -3 }).nt, cleanState({ nt: 'x' }).nt, cleanState({ nt: 1 }).nt]); if(cl.join() !== '2,0,,1') bad('cleanState nt: ' + cl);

  console.log(JSON.stringify(out, null, 1)); console.log('errs', errs); await b.close(); if(out.problems.length || errs.length) process.exit(1);
})();
