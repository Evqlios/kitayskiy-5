// site70: новые задания СГУ уроков 1–10 — движок сайта собирает каждое, верный ответ единственный (mc) или собирается из плиток (build)
const { chromium } = require('playwright'); const fs = require('fs'); const cur = require('./cur.js');
const IDS = JSON.parse(fs.readFileSync(cur.ROOT + '/dev/data_sgu/new_ids.json', 'utf8'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(process.env.SITE_URL || cur.URL); await p.waitForTimeout(1500);
  const r = await p.evaluate(ids => {
    const out = { problems: [], n: 0, kinds: {}, noTpy: {} };
    ids.sgu.forEach(id => {
      const e = D.sgu.find(x => x.id === id); if (!e) { out.problems.push('нет в D: ' + id); return; }
      let t; try { t = sguTask26(e); } catch (x) { out.problems.push(id + ' исключение: ' + x); return; }
      out.n++; out.kinds[t.k] = (out.kinds[t.k] || 0) + 1;
      if (t.k === 'mc') {
        const ok = t.opts.filter(o => o.ok).length; if (ok !== 1) out.problems.push(id + ' верных вариантов ' + ok);
        if (new Set(t.opts.map(o => o.h || o.t)).size !== t.opts.length) out.problems.push(id + ' одинаковые варианты');
      } else {
        const pool = t.tiles.map(x => x.t);
        t.acc.forEach(v => { const c = pool.slice(); for (const w of v) { const i = c.indexOf(w); if (i < 0) { out.problems.push(id + ' плитки не хватает для ' + v.join('')); break; } c.splice(i, 1); } });
        if (!t.pyp) t.tiles.forEach(x => { if (!x.p) out.noTpy[x.t] = (out.noTpy[x.t] || 0) + 1; });
      }
      if (!(e.src || '').startsWith('СГУ')) out.problems.push(id + ' src');
    });
    const gids = new Set(D.gram.concat(D.phon).map(x => x.id));
    ids.gram.concat(ids.phon).forEach(id => { if (!gids.has(id)) out.problems.push('нет вопроса ' + id); });
    // id уникальны
    const all = D.sgu.concat(D.gram, D.phon).map(x => x.id); if (new Set(all).size !== all.length) out.problems.push('дубли id');
    return out;
  }, IDS);
  console.log(JSON.stringify(r, null, 1)); console.log('errs', errs); await b.close();
  if (r.problems.length) process.exit(1);
})();
