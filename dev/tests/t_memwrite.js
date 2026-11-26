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
    const T = { n: 0, ok: 0, miss: 0, missOk: 0, swap: 0, swapOk: 0, rev: 0, revOk: 0, split: 0, splitOk: 0, merge: 0, mergeOk: 0, tap: 0, tapOk: 0, hints: 0 }, fails = [];
    CHARS.forEach(c => { const ref = wlRef(c), n = ref.length;
      for(let rep = 0; rep < 3; rep++){
        T.n++; const r = wmCompare(hand(ref), ref); if(r.ok && r.seqOk && !r.dir.length) T.ok++; else fails.push(c.hz);
        if(n > 1){ const j = Math.floor(R() * n), u = hand(ref).filter((_, k) => k !== j), r2 = wmCompare(u, ref); T.miss++; if(r2.missing.length === 1 && r2.missing[0] === j && !r2.extra.length) T.missOk++;
          const k = Math.floor(R() * (n - 1)), u3 = hand(ref); [u3[k], u3[k + 1]] = [u3[k + 1], u3[k]]; const r3 = wmCompare(u3, ref); T.swap++; if(r3.ok && !r3.seqOk) T.swapOk++; }
        { const r0 = wmCompare(hand(ref), ref); if(r0.ok && (!r0.seqOk || r0.dir.length)) T.hints++; }   // ложные подсказки о порядке/направлении при верном почерке
        { const Ls = ref.map((s, i) => wmLen(s) >= 300 ? i : -1).filter(i => i >= 0); if(Ls.length){ const j = Ls[Math.floor(R() * Ls.length)], uu = hand(ref), s = uu[j], cut = Math.floor(s.length * (.35 + R() * .3)); uu.splice(j, 1, s.slice(0, cut + 1), s.slice(cut)); T.split++; if(wmCompare(uu, ref).ok) T.splitOk++; } }   // черта в два касания
        { const Ms = []; for(let j = 0; j + 1 < n; j++) if(Math.hypot(ref[j][ref[j].length - 1][0] - ref[j + 1][0][0], ref[j][ref[j].length - 1][1] - ref[j + 1][0][1]) < 140) Ms.push(j); if(Ms.length){ const j = Ms[Math.floor(R() * Ms.length)], uu = hand(ref); uu.splice(j, 2, uu[j].concat(uu[j + 1])); T.merge++; if(wmCompare(uu, ref).ok) T.mergeOk++; } }   // две соседние черты одним движением
        { const uu = hand(ref), x = 80 + R() * 860, y = 80 + R() * 860; uu.splice(Math.floor(R() * (uu.length + 1)), 0, [[x, y], [x + 4 + R() * 8, y + 3 + R() * 6]]); T.tap++; if(wmCompare(uu, ref).ok) T.tapOk++; }   // случайное касание
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
  if(pc(A.splitOk, A.split) < .85) bad('черта в два касания принята в ' + (100 * pc(A.splitOk, A.split)).toFixed(1) + '% (нужно ≥ 85%)');
  if(pc(A.mergeOk, A.merge) < .90) bad('две черты слитно приняты в ' + (100 * pc(A.mergeOk, A.merge)).toFixed(1) + '% (нужно ≥ 90%)');
  if(pc(A.tapOk, A.tap) < .98) bad('случайное касание мешает в ' + (100 * (1 - pc(A.tapOk, A.tap))).toFixed(1) + '% случаев (нужно ≤ 2%)');
  if(A.hints / A.n > .01) bad('ложные подсказки о порядке/направлении при верном почерке: ' + A.hints + ' из ' + A.n + ' (нужно ≤ 1%)');
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
    o = o || {}; const g = await p.evaluate(id => { const r = document.querySelector('#wlsvg').getBoundingClientRect(); const c = id ? cById[id] : cById[WL.run.ids[WL.run.i]]; return { x: r.left, y: r.top, w: r.width, ref: wlRef(c) }; }, o.id || null);
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
  const info = () => p.evaluate(() => ({ banner: (document.querySelector('.banner') || {}).innerText, msgs: [...document.querySelectorAll('.wlmsg')].map(e => e.innerText), miss: document.querySelectorAll((document.querySelector('svg[data-v="cmp"]') ? 'svg[data-v="cmp"]' : 'svg[data-v="ref"]') + ' circle.wlm').length, ring: document.querySelectorAll('svg[data-v="cmp"] circle.wlr').length, arrows: document.querySelectorAll('svg[data-v="cmp"] polygon.wlah').length, ok: document.querySelectorAll('svg[data-v="cmp"] .wlu.ok').length, nt: document.querySelectorAll('svg[data-v="cmp"] .wlu.nt').length, ex: document.querySelectorAll('svg[data-v="cmp"] .wlu.ex').length, head: (document.querySelector('.lbl') || {}).innerText }));

  await p.click('button[data-list="0"]'); await p.waitForTimeout(200);
  let first = await p.evaluate(() => cById[WL.run.ids[0]].hz); if(first !== '你') bad('первый знак списка 1 должен быть 你, а не ' + first);
  await p.screenshot({ path: path.join(SHOT, 'wl_blank.png') });
  // знак 1 (你): верно
  { const c1 = await p.evaluate(() => { const b = document.querySelector('#wlchk'); return getComputedStyle(b.parentElement).position; }); if(c1 !== 'sticky') bad('кнопка «Проверить» не закреплена: ' + c1); }
  await draw(); await p.screenshot({ path: path.join(SHOT, 'wl_drawn.png') }); await p.click('#wlchk'); await p.waitForTimeout(200);
  let i1 = await info(); if(!/Верно/.test(i1.banner || '')) bad('你 нарисован верно, а разбор: ' + JSON.stringify(i1)); if(i1.miss) bad('у верного знака есть красные метки');
  await p.screenshot({ path: path.join(SHOT, 'wl_ok.png') });
  const stick = await p.evaluate(() => { const b = document.querySelector('#wlnext'), r = b.getBoundingClientRect(); return { pos: getComputedStyle(b.parentElement).position, top: r.top, bottom: r.bottom, h: innerHeight, scrollable: document.documentElement.scrollHeight > innerHeight }; });
  if(stick.pos !== 'sticky') bad('кнопка «Дальше» не закреплена: ' + JSON.stringify(stick)); out.sticky = stick;
  let s1 = await p.evaluate(() => st.wl.c001); if(!s1 || !(s1.l > (s1.f || 0)) || s1.n !== 1) bad('результат 你 не записан: ' + JSON.stringify(s1));
  await p.click('#wlnext'); await p.waitForTimeout(150);
  // знак 2 (好): пропущена последняя черта
  const n2 = await p.evaluate(() => wlRef(cById[WL.run.ids[WL.run.i]]).length);
  await draw({ skip: [n2 - 1] }); await p.click('#wlchk'); await p.waitForTimeout(200);
  let i2 = await info(); if(!/Не совпало/.test(i2.banner || '')) bad('пропущена черта, а банер: ' + i2.banner); if(i2.miss !== 1) bad('красных меток должно быть 1, а ' + i2.miss); if(i2.arrows !== 1) bad('у пропущенной черты нужна 1 стрелка направления, а ' + i2.arrows);
  if(!i2.msgs.some(m => m.includes('№ ' + n2))) bad('в разборе нет номера пропущенной черты № ' + n2 + ': ' + JSON.stringify(i2.msgs));
  const sw = await p.evaluate(() => [...document.querySelectorAll('.wlkey .wkk')].map(e => e.getBoundingClientRect().width)); if(sw.length !== 4 || sw.some(w => w < 10)) bad('метки легенды не видны: ' + sw);
  await p.screenshot({ path: path.join(SHOT, 'wl_missing.png') });
  let s2 = await p.evaluate(() => st.wl.c002); if(!s2 || !((s2.f || 0) > (s2.l || 0))) bad('неверная попытка 好 должна стать «ошибался»: ' + JSON.stringify(s2));
  await p.click('#wlown'); await p.waitForTimeout(100); s2 = await p.evaluate(() => st.wl.c002); if(!(s2.l > s2.f)) bad('«Это верно — засчитать» не сработало: ' + JSON.stringify(s2));
  await p.click('#wlnext'); await p.waitForTimeout(150);
  // знак 3 (老): «Не помню» → нумерация всех черт, потом повтор (в счёт не идёт)
  await p.click('#wlskip'); await p.waitForTimeout(200); let i3 = await info(); const n3 = await p.evaluate(() => wlRef(cById[WL.run.ids[WL.run.i]]).length);
  if(i3.miss !== 0) bad('«Не помню»: эталон должен быть чистым знаком, а меток ' + i3.miss); { const g3 = await p.evaluate(() => document.querySelectorAll('svg[data-v="ref"] path.wlg').length); if(g3 !== n3) bad('«Не помню»: черт эталона ' + g3 + ', нужно ' + n3); } if(i3.msgs.length) bad('«Не помню»: лишние сообщения ' + JSON.stringify(i3.msgs));
  await p.screenshot({ path: path.join(SHOT, 'wl_skip.png') });
  await p.click('#wlpad'); await p.waitForTimeout(500); const hwOn = await p.evaluate(() => !!document.querySelector('#wlhw svg') && [...document.querySelectorAll('#wlpad svg[data-v]')].every(e => e.style.display === 'none')); if(!hwOn) bad('«Как правильно»: анимация не открылась');
  await p.click('#wlagain'); await p.waitForTimeout(200); let hd = (await info()).head; if(!/повтор/.test(hd || '')) bad('повтор не помечен: ' + hd);
  await draw(); await p.click('#wlchk'); await p.waitForTimeout(200); let i3b = await info(); if(!/Верно/.test(i3b.banner || '')) bad('повтор 老 нарисован верно: ' + i3b.banner);
  let s3 = await p.evaluate(() => st.wl.c003); if(!s3 || s3.n !== 1 || !((s3.f || 0) > (s3.l || 0))) bad('повтор не должен менять результат первой попытки: ' + JSON.stringify(s3));
  await p.click('#wlnext'); await p.waitForTimeout(150);
  // знак 4: направление и порядок
  const n4 = await p.evaluate(() => wlRef(cById[WL.run.ids[WL.run.i]]).length);
  const long4 = await p.evaluate(() => { const r = wlRef(cById[WL.run.ids[WL.run.i]]); return r.map((s, i) => wmLen(s) >= 260 ? i : -1).filter(i => i >= 0)[0]; });
  if(long4 >= 0){ await draw({ reverse: [long4] }); await p.click('#wlchk'); await p.waitForTimeout(200); const i4 = await info(); if(!/Верно/.test(i4.banner || '') || /замечан/.test(i4.banner || '')) bad('подсказка о направлении не должна портить баннер: ' + i4.banner); if(i4.ring < 1) bad('развёрнутая черта не замечена: ' + JSON.stringify(i4)); if(i4.arrows < 1) bad('у развёрнутой черты нет стрелки направления'); await p.screenshot({ path: path.join(SHOT, 'wl_dir.png') }); }
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


  /* ---------- 5б. хард: без подсказок, знаки узнаются по рисунку ---------- */
  await p.evaluate(() => { WL.run = null; st.tab = 'study'; st.ls = 'wlist'; st.wlk = 15; st.wl = {}; st.wlh = 30; route(); });
  const hsz = await p.evaluate(() => [...document.querySelectorAll('[data-hsize]')].map(b => +b.dataset.hsize)); if(hsz.join() !== '30,60,90,120,150,180,210,240') bad('попытки хард-режима: ' + hsz);
  await p.click('#wlhard'); await p.waitForTimeout(200);
  const hardUI = await p.evaluate(() => ({ py: !!document.querySelector('.py'), play: !!document.querySelector('[data-play]'), ru: !!document.querySelector('.ru:not([style*="16px"])'), text: document.querySelector('#view, main').innerText }));
  if(hardUI.py || hardUI.play) bad('в харде есть подсказки (пиньинь или звук)'); if(!/попытка 1 из 30/.test(hardUI.text)) bad('нет счётчика попыток: ' + hardUI.text.slice(0, 200));
  await p.click('#wlnxh'); await p.waitForTimeout(100); const empty = await p.evaluate(() => WL.hard.att.length); if(empty !== 0) bad('пустая попытка не должна считаться');
  for(const step of [{ id: 'c001' }, { id: 'c002' }, { id: 'c001' }, { id: 'c004', skip: [-1] }]){
    const o = Object.assign({}, step); if(o.skip){ const n = await p.evaluate(() => wlRef(cById.c004).length); o.skip = [n - 1]; }
    await draw(o); await p.click('#wlnxh'); await p.waitForTimeout(100);
  }
  await p.mouse.move(100, 300); const r0 = await p.evaluate(() => { const r = document.querySelector('#wlsvg').getBoundingClientRect(); return [r.left, r.top, r.width]; });
  await p.mouse.move(r0[0] + r0[2] * .2, r0[1] + r0[2] * .3); await p.mouse.down(); for(let t = 0; t < 12; t++) await p.mouse.move(r0[0] + r0[2] * (.2 + t * .05), r0[1] + r0[2] * (.3 + (t % 2) * .35)); await p.mouse.up();   // каракули
  await p.click('#wlend'); await p.waitForSelector('text=Хард · итог', { timeout: 20000 }); await p.waitForTimeout(200);
  const H = await p.evaluate(() => ({ seen: WL.hard.seen, dup: WL.hard.out.filter(o => o.dup).length, unk: WL.hard.out.filter(o => !o.ok).length, n: WL.hard.out.length, near: WL.hard.out.filter(o => o.near).map(o => o.near.c.id), wl: { c001: wlState('c001'), c002: wlState('c002'), c004: wlState('c004') }, text: document.querySelector('#view, main').innerText }));
  out.hard = { seen: H.seen, dup: H.dup, unk: H.unk, n: H.n, near: H.near };
  if(H.n !== 5) bad('попыток должно быть 5, а ' + H.n); if(H.seen.slice().sort().join() !== 'c001,c002') bad('узнанные знаки: ' + H.seen); if(H.dup !== 1) bad('повтор 你 не замечен: ' + H.dup);
  if(H.unk !== 2) bad('не узнанных должно быть 2 (знак без черты и каракули), а ' + H.unk); if(!H.near.includes('c004') || H.near.length !== 1) bad('«похоже на» должно быть только для знака без черты (каракули — без догадки): ' + H.near);
  if(H.wl.c001 !== 'ok' || H.wl.c002 !== 'ok' || H.wl.c004 !== 'new') bad('отметки после харда: ' + JSON.stringify(H.wl)); if(!/Похоже на/.test(H.text) || !/Не вспомнил из уроков 1–15/.test(H.text)) bad('в итоге нет разбора: ' + H.text.slice(0, 400));
  await p.screenshot({ path: path.join(SHOT, 'wl_hard_result.png'), fullPage: true });
  await p.click('#wlfix'); await p.waitForTimeout(150); const fx = await p.evaluate(() => ({ n: WL.run && WL.run.ids.length, hard: !!WL.hard })); if(fx.n !== 30 || fx.hard) bad('«Учить невспомненные»: ' + JSON.stringify(fx));
  await p.click('#wlx'); await p.waitForTimeout(100);


  /* ---------- 5в. три вида разбора и лист бумаги ---------- */
  await p.evaluate(() => { WL.run = null; WL.hard = null; st.wlg = 'mi'; st.wlt = 'auto'; st.tab = 'study'; st.ls = 'wlist'; route(); wlStart('Виды', [cById.c001], { keep: true }); });
  await draw(); await p.click('#wlpg'); await p.click('#wlpt');   // сетка 米→田, лист → светлый, рисунок не пропал
  const pad1 = await p.evaluate(() => ({ cls: document.querySelector('#wlpad').className, strokes: document.querySelectorAll('#wlg path').length, bg: getComputedStyle(document.querySelector('#wlpad')).backgroundColor, ink: getComputedStyle(document.querySelector('#wlpad')).getPropertyValue('--ink').trim(), st: [st.wlg, st.wlt] }));
  if(!/g-tian/.test(pad1.cls) || !/paperl/.test(pad1.cls) || pad1.strokes < 2 || pad1.st.join() !== 'tian,paper') bad('переключение листа: ' + JSON.stringify(pad1)); out.paper = pad1;
  await p.click('#wlchk'); await p.waitForTimeout(250);
  const v1 = await p.evaluate(() => ({ cls: document.querySelector('#wlpad').className, mine: document.querySelectorAll('svg[data-v="mine"] .wlu').length, cmpUser: document.querySelectorAll('svg[data-v="cmp"] .wlu').length, halo: document.querySelectorAll('svg[data-v="cmp"] .wlh').length, sw: getComputedStyle(document.querySelector('svg[data-v="cmp"] .wlu')).strokeWidth, swMine: getComputedStyle(document.querySelector('svg[data-v="mine"] .wlu')).strokeWidth, ghost: getComputedStyle(document.querySelector('svg[data-v="cmp"] .wlg')).fill, show: [...document.querySelectorAll('#wlpad svg[data-v]')].map(e => e.dataset.v + ':' + (e.style.display === 'none' ? 0 : 1)).join(' ') }));
  if(!/paperl/.test(v1.cls)) bad('лист бумаги не сохранился в разборе: ' + v1.cls); if(v1.mine !== v1.cmpUser || v1.halo !== v1.cmpUser) bad('в «Моё» и «Сравнение» разное число черт: ' + JSON.stringify(v1));
  if(!(parseFloat(v1.sw) < parseFloat(v1.swMine))) bad('в сравнении линия ученика должна быть тоньше, чем в «Моё»: ' + v1.sw + ' vs ' + v1.swMine); if(v1.show !== 'cmp:1 mine:0 ref:0') bad('по умолчанию видно не только «Сравнение»: ' + v1.show);
  await p.screenshot({ path: path.join(SHOT, 'wl_view_cmp.png') });
  await p.click('.wlview button[data-v="mine"]'); let sh = await p.evaluate(() => [...document.querySelectorAll('#wlpad svg[data-v]')].map(e => e.dataset.v + ':' + (e.style.display === 'none' ? 0 : 1)).join(' ')); if(sh !== 'cmp:0 mine:1 ref:0') bad('вид «Моё»: ' + sh);
  await p.screenshot({ path: path.join(SHOT, 'wl_view_mine.png') });
  await p.click('.wlview button[data-v="ref"]'); sh = await p.evaluate(() => [...document.querySelectorAll('#wlpad svg[data-v]')].map(e => e.dataset.v + ':' + (e.style.display === 'none' ? 0 : 1)).join(' ')); if(sh !== 'cmp:0 mine:0 ref:1') bad('вид «Эталон»: ' + sh);
  const refN = await p.evaluate(() => ({ circles: document.querySelectorAll('svg[data-v="ref"] circle, svg[data-v="ref"] polygon').length, glyph: document.querySelectorAll('svg[data-v="ref"] path.wlg').length, strokes: HWDATA['你'].strokes.length, hint: getComputedStyle(document.querySelector('#wlhint')).display })); if(refN.circles) bad('«Эталон» должен быть чистым знаком, без номеров и стрелок: ' + refN.circles); if(refN.glyph !== refN.strokes) bad('«Эталон»: черт на картинке ' + refN.glyph + ', нужно ' + refN.strokes); if(refN.hint === 'none') bad('в «Эталоне» нет подсказки про нажатие');
  await p.screenshot({ path: path.join(SHOT, 'wl_view_ref.png') });
  await p.click('#wlpad'); await p.waitForTimeout(400); const anim = await p.evaluate(() => ({ hw: !!document.querySelector('#wlhw svg'), stroke: (() => { const e = document.querySelector('#wlhw svg path[stroke]'); return e ? e.getAttribute('stroke') : ''; })() }));
  if(!anim.hw) bad('анимация не открылась на светлом листе'); if(/f1ece2/i.test(anim.stroke || '')) bad('на светлом листе анимация нарисована светлым цветом: ' + anim.stroke);
  await p.click('.wlview button[data-v="cmp"]'); sh = await p.evaluate(() => [...document.querySelectorAll('#wlpad svg[data-v]')].map(e => e.dataset.v + ':' + (e.style.display === 'none' ? 0 : 1)).join(' ') + ' hw:' + document.querySelector('#wlhw').style.display); if(!/cmp:1 mine:0 ref:0/.test(sh) || !/hw:none/.test(sh)) bad('возврат из анимации к сравнению: ' + sh);
  // неверный знак на светлом листе в тёмной теме: пропущенное — пустой контур, а не заливка
  await p.click('#wlagain'); await p.waitForTimeout(150); const nn = await p.evaluate(() => wlRef(cById.c001).length); await draw({ skip: [nn - 1] }); await p.click('#wlchk'); await p.waitForTimeout(250);
  const miss1 = await p.evaluate(() => { const e = document.querySelector('svg[data-v="cmp"] .wlg.miss'); const c = getComputedStyle(e); return e ? { stroke: c.stroke, dash: c.strokeDasharray, fill: c.fill } : null; }); if(!miss1 || !/dash|\d/.test(miss1.dash) || miss1.dash === 'none') bad('пропущенная черта должна быть пунктирным контуром: ' + JSON.stringify(miss1));
  await p.screenshot({ path: path.join(SHOT, 'wl_view_miss.png') });
  // настройки в меню
  await p.click('#wlx'); await p.waitForTimeout(150); await p.click('button[data-grid="cell"]'); await p.waitForTimeout(100); await p.click('button[data-tone="auto"]'); const ms = await p.evaluate(() => [st.wlg, st.wlt]); if(ms.join() !== 'cell,auto') bad('настройки листа в меню: ' + ms);
  await p.evaluate(() => { st.wlg = 'mi'; st.wlt = 'auto'; save(); WL.run = null; });

  /* ---------- 6. «Статистика», тёмная тема, узкий экран ---------- */
  await p.evaluate(() => { WL.run = null; st.tab = 'stats'; route(); }); await p.waitForTimeout(300);
  const stat = await p.evaluate(() => document.body.innerText); const wc = await p.evaluate(() => wlCount(wlAll().map(c => c.id))); if(!new RegExp('Пишу по памяти\\s*' + wc + '\\s*из 237').test(stat.replace(/\n/g, ' '))) bad('в «Статистике» нет строки «Пишу по памяти ' + wc + ' из 237»');
  await p.setViewportSize({ width: 320, height: 640 }); await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; st.tab = 'study'; st.ls = 'wlist'; route(); }); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(SHOT, 'wl_dark320.png'), fullPage: true });
  const hscroll = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); if(hscroll) bad('горизонтальная прокрутка на 320 px');

  console.log(JSON.stringify(out, null, 1)); console.log('errs', errs); await b.close(); if(out.problems.length || errs.length) process.exit(1);
})();
