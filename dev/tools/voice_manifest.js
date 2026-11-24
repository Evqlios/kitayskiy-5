// Список всех записей диктора: что и каким id озвучивает сайт. Запуск: node voice_manifest.js <абс.путь к html> <куда писать json>
// Источники (те же, что в коде сайта): слова (tts || hz), предложения, знаки со своей записью (own), вопросы и ответы топиков (qa), ответы заданий СГУ
// (то, что берёт sguTask26: audio.id / audio.text), строки диалогов уроков, которых нет среди предложений (id d<урок>_<номер строки>).
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500);
  const m = await p.evaluate(() => {
    const out = {}, add = (id, text, kind) => { if(id && text && !out[id]) out[id] = { id, text, kind }; };
    D.words.forEach(w => add(w.id, w.tts || w.hz, 'w'));   // все слова, в том числе вне колоды (омофоны, имена)
    SENTS.forEach(s => add(s.id, s.hz, 's'));
    D.chars.filter(c => c.own).forEach(c => add(c.id, c.hz, 'c'));
    D.qa.forEach(q => { add(q.id, q.hz, 'q'); if(q.aid && q.ans && q.ans[0]) add(q.aid, q.ans[0].hz, 'a'); });
    D.sgu.forEach(e => { let t; try{ t = sguTask26(e); }catch(x){ return; } if(t && t.audio && t.audio.id && t.audio.text) add(t.audio.id, t.audio.text, 'g'); if(e.pyp && e.hza) add(e.id, e.hza, 'g'); });
    ((D13 && D13.dialogs) || []).forEach(d => d.lines.forEach((x, i) => { const s = SENTS.find(q => normHz13(q.hz) === normHz13(x.hz)); if(!s) add('d' + d.L + '_' + i, x.hz, 'd'); }));
    return out;
  });
  const old = await p.evaluate(() => AIDX.n);
  const list = Object.values(m).map(x => Object.assign(x, { old: !!old[x.id] }));
  fs.writeFileSync(process.argv[3], JSON.stringify(list, null, 1));
  const c = {}; list.forEach(x => { const k = x.kind + (x.old ? ':старые' : ':новые'); c[k] = (c[k] || 0) + 1; });
  const oldNoText = Object.keys(old).filter(i => !m[i]);
  console.log(JSON.stringify({ всего: list.length, по_видам: c, старых_без_текста: oldNoText.length, примеры: oldNoText.slice(0, 8), символов: list.reduce((n, x) => n + [...x.text].length, 0) }));
  await b.close();
})();
