// «Списки» (письмо по памяти): алгоритм сравнения на всех знаках + сквозной сценарий в браузере (рисование мышью, разбор, итог, сохранение).
// Запуск: node dev/tests/t_memwrite.js   (скриншоты — в папку из переменной SHOTDIR, по умолчанию текущая)
const { chromium } = require('playwright'); const cur = require('./cur.js'); const path = require('path');
const SHOT = process.env.SHOTDIR || '.';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const out = { problems: [] }; const bad = m => out.problems.push(m);
  await p.goto(cur.URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('hz5how', '1'); }); await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => { document.getElementById('welcome')?.remove(); stopAll(); });

  /* ---------- 1. данные: у всех знаков курса есть черты ---------- */
  const cov = await p.evaluate(() => ({ n: CHARS.length, miss: CHARS.filter(c => !HWDATA[c.hz]).map(c => c.hz), bad: CHARS.filter(c => { const d = HWDATA[c.hz]; return d && d.strokes.length !== d.medians.length; }).map(c => c.hz) }));
  out.chars = cov.n; if(cov.miss.length) bad('нет данных о чертах: ' + cov.miss.join('')); if(cov.bad.length) bad('число черт не совпадает с медианами: ' + cov.bad.join(''));

  /* ---------- 2. алгоритм на всех знаках (детерминированный «почерк») ---------- */
  out.algo = await p.evaluate(() => {
    let seed = 99; const R = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }, N = () => (R() + R() + R() + R() - 2) * 1.7;   // ≈ нормальный шум σ≈1
    const hand = ref => { const sx = .88 + R() * .24, sy = .88 + R() * .24, dx = (R() - .5) * 80, dy = (R() - .5) * 80;
      return ref.map(s => { const ox = N() * 22, oy = N() * 22; return wmResample(s, 24).map(([x, y]) => [512 + (x - 512) * sx + dx + ox + N() * 8, 512 + (y - 512) * sy + dy + oy + N() * 8]); }); };
    const T = { n: 0, ok: 0, miss: 0, missOk: 0, swap: 0, swapOk: 0, rev: 0, revOk: 0 }, fails = [];
    CHARS.forEach(c => { const ref = wlRef(c), n = ref.length;
      for(let rep = 0; rep < 3; rep++){
        T.n++; const r = wmCompare(hand(ref), ref); if(r.ok && r.seqOk && !r.dir.length) T.ok++; else fails.push(c.hz);
        if(n > 1){ const j = Math.floor(R() * n), u = hand(ref).filter((_, k) => k !== j), r2 = wmCompare(u, ref); T.miss++; if(r2.missing.length === 1 && r2.missing[0] === j && !r2.extra.length) T.missOk++;
          const k = Math.floor(R() * (n - 1)), u3 = hand(ref); [u3[k], u3[k + 1]] = [u3[k + 1], u3[k]]; const r3 = wmCompare(u3, ref); T.swap++; if(r3.ok && !r3.seqOk) T.swapOk++; }
        const longs = ref.map((s, i) => wmLen(s) >= 260 ? i : -1).filter(i => i >= 0); if(longs.length){ const j = longs[Math.floor(R() * longs.length)], u5 = hand(ref); u5[j] = u5[j].slice().reverse(); const r5 = wmCompare(u5, ref); T.rev++; if(r5.ok && r5.dir.some(q => q.j === j)) T.revOk++; }
      } });
    // «не тот знак»: 400 случайных пар не должны проходить
    let wrongAcc = 0, wrongN = 0; for(let t = 0; t < 400; t++){ const a = CHARS[Math.floor(R() * CHARS.length)], b2 = CHARS[Math.floor(R() * CHARS.length)]; if(a === b2) continue; wrongN++; if(wmCompare(hand(wlRef(a)), wlRef(b2)).ok) wrongAcc++; }
    return Object.assign(T, { wrongAcc, wrongN, fails: fails.slice(0, 10) });
  });
  const A = out.algo, pc = (a, b) => b ? a / b : 1;
  if(pc(A.ok, A.n) < .97) bad('верный почерк принят в ' + (100 * pc(A.ok, A.n)).toFixed(1) + '% (нужно ≥ 97%): ' + A.fails.join(''));
  if(pc(A.missOk, A.miss) < .95) bad('пропуск черты найден точно в ' + (100 * pc(A.missOk, A.miss)).toFixed(1) + '% (нужно ≥ 95%)');
  if(pc(A.swapOk, A.swap) < .95) bad('перестановка черт замечена в ' + (100 * pc(A.swapOk, A.swap)).toFixed(1) + '% (нужно ≥ 95%)');
  if(pc(A.revOk, A.rev) < .95) bad('обратное направление замечено в ' + (100 * pc(A.revOk, A.rev)).toFixed(1) + '% (нужно ≥ 95%)');
  if(A.wrongAcc > 0) bad('чужой знак принят ' + A.wrongAcc + ' раз из ' + A.wrongN);

  /* ---------- 3. сквозной сценарий в интерфейсе ---------- */
  await p.evaluate(() => { st.wlr = false; st.wl = {}; st.tab = 'study'; st.ls = 'wlist'; save(); route(); });
  const txt = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : null; }, sel);
  let hero = await txt('.wlhero'); if(!/0\s*из 237/.test(hero || '')) bad('пустой экран: ожидали «0 из 237», получили ' + JSON.stringify(hero));
  if(!/Следующий рубеж — 30: осталось 30 \(30 − 0\)/.test(hero || '')) bad('рубеж 30 не показан: ' + JSON.stringify(hero));
  const subs = await p.evaluate(() => [...document.querySelectorAll('#sub button')].map(b => b.textContent)); if(!subs.includes('Списки')) bad('нет вкладки «Списки»: ' + subs);
  await p.screenshot({ path: path.join(SHOT, 'wl_menu.png'), fullPage: true });

  // рисуем знак мышью по медианам эталона; skip — какие черты пропустить; extra — добавить лишнюю черту; reverse — какую развернуть
  const draw = async (o) => {
    o = o || {}; const g = await p.evaluate(() => { const r = document.querySelector('#wlsvg').getBoundingClientRect(); const c = cById[WL.run.ids[WL.run.i]]; return { x: r.left, y: r.top, w: r.width, ref: wlRef(c) }; });
    const k = g.w / 1024; let list = g.ref.map((s, i) => ({ s, i })).filter(o2 => !(o.skip || []).includes(o2.i));
    for(const { s, i } of list){
      let pts = wmPts(s); if((o.reverse || []).includes(i)) pts = pts.reverse();
      await p.mouse.move(g.x + pts[0][0] * k + 1, g.y + pts[0][1] * k + 1); await p.mouse.down();
      for(const q of pts.slice(1)) await p.mouse.move(g.x + q[0] * k + 1, g.y + q[1] * k - 1, { steps: 1 });
      await p.mouse.up();
    }
    if(o.extra){ await p.mouse.move(g.x + 100 * k, g.y + 900 * k); await p.mouse.down(); await p.mouse.move(g.x + 400 * k, g.y + 960 * k); await p.mouse.move(g.x + 800 * k, g.y + 940 * k); await p.mouse.up(); }
  };
  const wmPts = s => { const out2 = []; for(let t = 0; t <= 14; t++){ const f = t / 14 * (s.length - 1), a = Math.floor(f), b2 = Math.min(a + 1, s.length - 1), u = f - a; out2.push([s[a][0] + (s[b2][0] - s[a][0]) * u, s[a][1] + (s[b2][1] - s[a][1]) * u]); } return out2; };
  const info = () => p.evaluate(() => ({ banner: (document.querySelector('.banner') || {}).innerText, msgs: [...document.querySelectorAll('.wlmsg')].map(e => e.innerText), miss: document.querySelectorAll('circle.wlm').length, ring: document.querySelectorAll('circle.wlr').length, ok: document.querySelectorAll('.wlu.ok').length, nt: document.querySelectorAll('.wlu.nt').length, ex: document.querySelectorAll('.wlu.ex').length, head: (document.querySelector('.lbl') || {}).innerText }));

  await p.click('button[data-list="0"]'); await p.waitForTimeout(200);
  let first = await p.evaluate(() => cById[WL.run.ids[0]].hz); if(first !== '你') bad('первый знак списка 1 должен быть 你, а не ' + first);
  await p.screenshot({ path: path.join(SHOT, 'wl_blank.png') });
  // знак 1 (你): верно
  await draw(); await p.screenshot({ path: path.join(SHOT, 'wl_drawn.png') }); await p.click('#wlchk'); await p.waitForTimeout(200);
  let i1 = await info(); if(!/Верно/.test(i1.banner || '')) bad('你 нарисован верно, а разбор: ' + JSON.stringify(i1)); if(i1.miss) bad('у верного знака есть красные метки');
  await p.screenshot({ path: path.join(SHOT, 'wl_ok.png') });
  let s1 = await p.evaluate(() => st.wl.c001); if(!s1 || !(s1.l > (s1.f || 0)) || s1.n !== 1) bad('результат 你 не записан: ' + JSON.stringify(s1));
  await p.click('#wlnext'); await p.waitForTimeout(150);
  // знак 2 (好): пропущена последняя черта
  const n2 = await p.evaluate(() => wlRef(cById[WL.run.ids[WL.run.i]]).length);
  await draw({ skip: [n2 - 1] }); await p.click('#wlchk'); await p.waitForTimeout(200);
  let i2 = await info(); if(!/Не совпало/.test(i2.banner || '')) bad('пропущена черта, а банер: ' + i2.banner); if(i2.miss !== 1) bad('красных меток должно быть 1, а ' + i2.miss);
  if(!i2.msgs.some(m => m.includes('№ ' + n2))) bad('в разборе нет номера пропущенной черты № ' + n2 + ': ' + JSON.stringify(i2.msgs));
  await p.screenshot({ path: path.join(SHOT, 'wl_missing.png') });
  let s2 = await p.evaluate(() => st.wl.c002); if(!s2 || !((s2.f || 0) > (s2.l || 0))) bad('неверная попытка 好 должна стать «ошибался»: ' + JSON.stringify(s2));
  await p.click('#wlown'); await p.waitForTimeout(100); s2 = await p.evaluate(() => st.wl.c002); if(!(s2.l > s2.f)) bad('«Это верно — засчитать» не сработало: ' + JSON.stringify(s2));
  await p.click('#wlnext'); await p.waitForTimeout(150);
  // знак 3 (老): «Не помню» → нумерация всех черт, потом повтор (в счёт не идёт)
  await p.click('#wlskip'); await p.waitForTimeout(200); let i3 = await info(); const n3 = await p.evaluate(() => wlRef(cById[WL.run.ids[WL.run.i]]).length);
  if(i3.miss !== n3) bad('«Не помню»: меток начала черт ' + i3.miss + ', нужно ' + n3); if(i3.msgs.length) bad('«Не помню»: лишние сообщения ' + JSON.stringify(i3.msgs));
  await p.screenshot({ path: path.join(SHOT, 'wl_skip.png') });
  await p.click('#wlhow'); await p.waitForTimeout(500); const hwOn = await p.evaluate(() => !!document.querySelector('#wlhw svg') && document.querySelector('#wlsvg').style.display === 'none'); if(!hwOn) bad('«Как правильно»: анимация не открылась');
  await p.click('#wlagain'); await p.waitForTimeout(200); let hd = (await info()).head; if(!/повтор/.test(hd || '')) bad('повтор не помечен: ' + hd);
  await draw(); await p.click('#wlchk'); await p.waitForTimeout(200); let i3b = await info(); if(!/Верно/.test(i3b.banner || '')) bad('повтор 老 нарисован верно: ' + i3b.banner);
  let s3 = await p.evaluate(() => st.wl.c003); if(!s3 || s3.n !== 1 || !((s3.f || 0) > (s3.l || 0))) bad('повтор не должен менять результат первой попытки: ' + JSON.stringify(s3));
  await p.click('#wlnext'); await p.waitForTimeout(150);
  // знак 4: направление и порядок
  const n4 = await p.evaluate(() => wlRef(cById[WL.run.ids[WL.run.i]]).length);
  const long4 = await p.evaluate(() => { const r = wlRef(cById[WL.run.ids[WL.run.i]]); return r.map((s, i) => wmLen(s) >= 260 ? i : -1).filter(i => i >= 0)[0]; });
  if(long4 >= 0){ await draw({ reverse: [long4] }); await p.click('#wlchk'); await p.waitForTimeout(200); const i4 = await info(); if(i4.ring < 1) bad('развёрнутая черта не замечена: ' + JSON.stringify(i4)); await p.screenshot({ path: path.join(SHOT, 'wl_dir.png') }); }
  else { await p.click('#wlskip'); await p.waitForTimeout(100); }
  await p.click('#wlnext'); await p.waitForTimeout(150);
  // знак 5: лишняя черта
  await draw({ extra: true }); await p.click('#wlchk'); await p.waitForTimeout(200); const i5 = await info(); if(!i5.ex) bad('лишняя черта не замечена: ' + JSON.stringify(i5)); if(!/Не совпало/.test(i5.banner || '')) bad('лишняя черта, а банер: ' + i5.banner);
  await p.screenshot({ path: path.join(SHOT, 'wl_extra.png') });
  // выход ✕: результаты остаются, меню показывает счёт
  await p.click('#wlx'); await p.waitForTimeout(200); hero = await txt('.wlhero'); const cnt = await p.evaluate(() => wlCount(wlAll().map(c => c.id)));
  if(cnt !== 3) bad('после занятия «пишу верно» должно быть 3 (你, засчитанный вручную 好 и знак 4 с развёрнутой чертой: форма верна, направление только помечается), а ' + cnt); if(!new RegExp('\\b' + cnt + '\\s*из 237').test(hero || '')) bad('счёт на экране: ' + JSON.stringify(hero));

  /* ---------- 4. сохранение, слияние, чистка ---------- */
  await p.reload(); await p.waitForTimeout(900); await p.evaluate(() => { document.getElementById('welcome')?.remove(); });
  const after = await p.evaluate(() => ({ cnt: wlCount(wlAll().map(c => c.id)), ls: st.ls, keys: Object.keys(st.wl || {}).sort() })); if(after.cnt !== 3) bad('после перезагрузки счёт ' + after.cnt); out.persist = after;
  const cl = await p.evaluate(() => JSON.stringify(cleanState({ wl: { c001: { l: 5, f: 3, n: 2, k: 1 }, x1: { l: 1 }, c999: 'мусор', c002: { l: -4, f: 0, n: 1 }, c003: { l: 2e15, n: 1e9, k: 7 } }, wlm: 'bad', wlk: 99, wls: 60, wlr: false, ls: 'wlist' })));
  const cj = JSON.parse(cl); if(!cj.wl || !cj.wl.c001 || cj.wl.x1 || cj.wl.c999 || cj.wl.c002) bad('cleanState wl: ' + cl); if(cj.wl && cj.wl.c003 && (cj.wl.c003.l > 4e12 || cj.wl.c003.n > 9999)) bad('cleanState не ограничил числа: ' + cl); if(cj.wlm !== undefined || cj.wlk !== 15 || cj.wls !== 60 || cj.wlr !== false || cj.ls !== 'wlist') bad('cleanState настройки: ' + cl);

  /* ---------- 5. контрольная, итог, рубеж ---------- */
  await p.evaluate(() => { st.tab = 'study'; st.ls = 'wlist'; st.wlk = 15; st.wls = 30; st.wl = {}; for(let k = 1; k <= 29; k++) wlMark('c' + String(k).padStart(3, '0'), true); route(); });
  hero = await txt('.wlhero'); if(!/29\s*из 237/.test(hero || '') || !/осталось 1 \(30 − 29\)/.test(hero || '')) bad('перед рубежом: ' + JSON.stringify(hero));
  await p.click('#wlgo'); await p.waitForTimeout(200); const run = await p.evaluate(() => ({ n: WL.run.ids.length, name: WL.run.name, uniq: new Set(WL.run.ids).size })); if(run.n !== 30 || run.uniq !== 30 || !/Контрольная · 30/.test(run.name)) bad('контрольная: ' + JSON.stringify(run));
  // проходим всю контрольную через «Не помню»; в конце — итог
  for(let k = 0; k < 30; k++){ await p.click('#wlskip'); await p.click('#wlnext'); }
  await p.waitForTimeout(200); const sum = await txt('.card'); const sumAll = await p.evaluate(() => document.querySelector('#view, main, body').innerText);
  if(!/Итог/.test(sumAll)) bad('нет итога'); if(!/0 ÷ 30 × 100 = 0%/.test(sumAll)) bad('нет арифметики процента: ' + sumAll.slice(0, 300));
  await p.screenshot({ path: path.join(SHOT, 'wl_summary.png'), fullPage: true });
  // «Повторить ошибки»: запускается занятие из 30 ошибок
  await p.click('#wlrep'); await p.waitForTimeout(150); const rep = await p.evaluate(() => ({ n: WL.run.ids.length, name: WL.run.name })); if(rep.n !== 30 || rep.name !== 'Ошибки') bad('повтор ошибок: ' + JSON.stringify(rep));
  await p.click('#wlx'); await p.waitForTimeout(100);
  // рубеж: 29 → 30 верных знаков
  await p.evaluate(() => { st.wl = {}; for(let k = 1; k <= 29; k++) wlMark('c' + String(k).padStart(3, '0'), true); wlStart('Проверка рубежа', [cById.c030], { keep: true }); });
  await draw(); await p.click('#wlchk'); await p.waitForTimeout(150); await p.click('#wlnext'); await p.waitForTimeout(200);
  const rub = await p.evaluate(() => document.querySelector('.res.ok') && document.querySelector('.res.ok').innerText); if(!/Рубеж 30/.test(rub || '')) bad('рубеж 30 не отмечен: ' + rub);
  await p.screenshot({ path: path.join(SHOT, 'wl_milestone.png'), fullPage: true });

  /* ---------- 6. «Статистика», тёмная тема, узкий экран ---------- */
  await p.evaluate(() => { WL.run = null; st.tab = 'stats'; route(); }); await p.waitForTimeout(300);
  const stat = await p.evaluate(() => document.body.innerText); if(!/Пишу по памяти\s*30\s*из 237/.test(stat.replace(/\n/g, ' '))) bad('в «Статистике» нет строки «Пишу по памяти 30 из 237»');
  await p.setViewportSize({ width: 320, height: 640 }); await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; st.tab = 'study'; st.ls = 'wlist'; route(); }); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(SHOT, 'wl_dark320.png'), fullPage: true });
  const hscroll = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); if(hscroll) bad('горизонтальная прокрутка на 320 px');

  console.log(JSON.stringify(out, null, 1)); console.log('errs', errs); await b.close(); if(out.problems.length || errs.length) process.exit(1);
})();
