const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('./cur.js').URL); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const out = { n: 0, bad: [], kinds: {} };
    for (const e of D.sgu.filter(x => x.L >= 11)) {
      out.n++;
      try {
        const t = sguTask(e); out.kinds[t.k] = (out.kinds[t.k] || 0) + 1;
        if (t.k === 'mc') { const ok = (t.opts || []).filter(o => o.ok).length; if (ok !== 1) out.bad.push(e.id + ': ok=' + ok); }
        else if (t.k === 'build') {
          const pool = (t.tiles || t.bank || t.words || []).map(x => (x && x.t) || x);
          const ans = e.ans || []; if (!ans.length) out.bad.push(e.id + ': нет ans');
          ans.forEach((a, i) => { const need = a.slice(); const have = pool.length ? pool.slice() : null; if (have) { for (const tok of need) { const k = have.indexOf(tok); if (k < 0) { out.bad.push(e.id + ': плитки нет «' + tok + '» (вар.' + i + ')'); break; } have.splice(k, 1); } } });
        }
      } catch (er) { out.bad.push(e.id + ': ' + er.message); }
    }
    return out;
  });
  console.log(JSON.stringify(r).slice(0, 1500), errs); await b.close();
})();
