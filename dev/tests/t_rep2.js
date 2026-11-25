const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = {}; const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('./cur.js').URL); await p.waitForTimeout(800);
  await p.evaluate(() => { localStorage.setItem('hz5how', '1'); }); await p.reload(); await p.waitForTimeout(1000);
  await p.evaluate(() => { document.getElementById('welcome')?.remove(); window.__sent = []; window.hzReport = async (k, o) => { window.__sent.push([k, o.t]); return true; }; st.nick = 'Тест'; });
  out.icon = {};
  for (const [L, node] of [[3, 'intro'], [3, 'sign'], [3, 'gram'], [12, 'sgu'], [13, 'sgu'], [3, 'sent'], [3, 'warm'], [11, 'test']]) {
    await p.evaluate(([L, n]) => { stopAll(); st.tab = 'path'; route(); startSession(L, n, true); }, [L, node]); await p.waitForTimeout(500);
    out.icon[L + ':' + node] = await p.evaluate(() => { const t = document.querySelector('.sess .sh .top13'); const r = t && t.getBoundingClientRect(); return t ? Math.round(r.width) + 'x' + Math.round(r.height) + ' @' + Math.round(r.top) : null; });
  }
  // жалоба с задания СГУ (до ответа)
  await p.evaluate(() => { stopAll(); st.tab = 'path'; route(); startSession(12, 'sgu', true); }); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('.top13').click()); await p.waitForTimeout(200);
  await p.evaluate(() => { document.querySelector('.rep13top .rt13 button[data-k="ot"]').click(); document.querySelector('.rep13top [data-rp="send"]').click(); }); await p.waitForTimeout(400);
  out.sent = await p.evaluate(() => ({ sent: window.__sent, msg: document.querySelector('.rep13top .rd13')?.textContent }));
  await p.screenshot({ path: 'rep_top.png' });
  out.errs = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
})();
