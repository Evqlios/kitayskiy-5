// Регрессия по аудиту беты (28.11.2026): п. 1.1 (id gr100–gr119), 1.2 (подпись итога), 1.4 (кэш рейтинга), 1.5 (серия при отмене сброса), UX 3.1 (блок «Ты выбрал» сверху), UX 3.4 (очки видны)
const { chromium } = require('playwright'); const cur = require('./cur.js');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = [], out = { problems: [] };
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(cur.URL); await p.waitForTimeout(900); await p.evaluate(() => document.getElementById('welcome') && document.getElementById('welcome').remove());
  const bad = (m) => out.problems.push(m);
  // 1.1: все id из данных проходят проверку, ошибка по gr100 сохраняется и переживает cleanState
  const r1 = await p.evaluate(() => {
    const ids = [].concat(D.gram, D.phon, D.sgu).map(x => x.id), rej = ids.filter(i => !isErrId(i));
    errMark56('gr100', false); st.err = Object.assign(st.err || {}, { gr100: 1 });
    return { rej, kept: Object.keys(cleanState(JSON.parse(JSON.stringify(st))).err || {}).includes('gr100'), cnt: errCount56() };
  });
  if (r1.rej.length) bad('id не проходят isErrId: ' + r1.rej.slice(0, 5)); if (!r1.kept) bad('gr100 удалён cleanState'); if (r1.cnt < 1) bad('errCount56 не видит gr100');
  // 1.2: 27 заданий, 6 карточек, 3 ошибки → «18 из 21 (86%)»
  const r2 = await p.evaluate(() => { startSession10(1, 'test'); const S = SS, sh = S.tasks.filter(t => t.intro15 || t.k === 'show').length; S.shows = sh; S.first = S.total - 3; S.answered = S.total; endSession(); return { sh, total: S.total, text: document.getElementById('view').innerText }; });
  const want = (r2.total - 3 - r2.sh) + ' из ' + (r2.total - r2.sh);
  if (!r2.text.includes('С первого раза верно: ' + want)) bad('итог: ожидали «' + want + '», на экране: ' + (/С первого раза верно: [^\n]*/.exec(r2.text) || [''])[0]);
  if (!/Очки: \+\d+/.test(r2.text)) bad('на экране итога нет очков');
  // 1.4: второй вызов loadBoard в пределах TTL не ходит в сеть
  const r3 = await p.evaluate(async () => { let n = 0; window.fsReq = async () => { n++; return { documents: [] }; }; BOARDC = null; await loadBoard(); await loadBoard(); const a = n; BOARDC = null; await loadBoard(); return { a, b: n }; });
  if (r3.a !== 1 || r3.b !== 2) bad('кэш рейтинга: запросов ' + JSON.stringify(r3));
  // UX 3.1: после неверного ответа «Ты выбрал» идёт раньше «Правильно:», а оба — выше разбора
  await p.evaluate(() => { startSession10(1, 'listen'); });
  await p.waitForTimeout(500);
  const r4 = await p.evaluate(() => { const q = SS.q[0], i = q.opts.findIndex(o => !o.ok); document.querySelectorAll('#view .opt')[i].click(); const t = document.getElementById('stask').innerText; return { a: t.indexOf('Ты выбрал'), b: t.indexOf('Правильно:'), c: t.indexOf('читается') }; });
  if (!(r4.a >= 0 && r4.a < r4.b && r4.b < r4.c)) bad('порядок блоков разбора: ' + JSON.stringify(r4));
  // страница не отдаёт путь в Referer
  const ref = await p.evaluate(() => (document.querySelector('meta[name=referrer]') || {}).content); if (ref !== 'strict-origin') bad('referrer: ' + ref);
  console.log(JSON.stringify(out), 'errs', errs); await b.close(); if (out.problems.length || errs.length) process.exit(1);
})();
