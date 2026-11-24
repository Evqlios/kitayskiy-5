// Статистика заданий (site63): очередь, отправка :commit с increment, лимит 50, просмотр #taskstats
const { chromium } = require('playwright');
const FILE = process.argv[2] || 'file:///home/user/kitayskiy-5/site63.html';
(async () => {
  const b = await chromium.launch(); const out = {}; const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(FILE); await p.waitForTimeout(800);
  await p.evaluate(() => { localStorage.setItem('hz5how', '1'); localStorage.removeItem('hz5ts'); localStorage.removeItem('hz5guest'); }); await p.reload(); await p.waitForTimeout(1000);
  await p.evaluate(() => {
    document.getElementById('welcome')?.remove(); window.__req = [];
    window.fetch = async (url, o) => { window.__req.push({ url: String(url), body: o && o.body ? JSON.parse(o.body) : null });
      return { ok: true, status: 200, json: async () => ({ documents: [{ name: 'x/taskstats/g001', fields: { a: { integerValue: '10' }, c: { integerValue: '2' } } }, { name: 'x/taskstats/gr01', fields: { a: { integerValue: '8' }, c: { integerValue: '8' } } }] }) }; };
    window.hzGetUser = () => ({ uid: 'U1', displayName: '', getIdToken: async () => 'TOK' });
    stopAll(); st.tab = 'path'; route(); startSession(12, 'sgu', true);
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => { stopAll(); startSession(3, 'gram', true); }); await p.waitForTimeout(400);
  // 1) настоящий клик по первому варианту ответа (если у задания есть варианты)
  out.before = await p.evaluate(() => ({ gid: SS.q[0].gid, kind: SS.q[0].k, q: JSON.stringify(window.TS13()) }));
  await p.evaluate(() => { const o = document.querySelector('.opt'); if (o) o.click(); }); await p.waitForTimeout(400);
  out.afterClick = await p.evaluate(() => JSON.stringify(window.TS13()));
  // 2) повторный вызов для того же задания не считается (t.counted)
  await p.evaluate(() => { afterAnswer(SS.q[0], true); afterAnswer(SS.q[0], true); }); out.afterRepeat_expect_g212_1_1 = await p.evaluate(() => JSON.stringify(window.TS13()));
  // 3) 60 ответов подряд на одно задание: за одну отправку уходит не больше 50
  await p.evaluate(() => { window.hzGetUser = () => null; for (let i = 0; i < 130; i++) afterAnswer({ gid: 'g999', k: 'x' }, i % 2 === 0); window.hzGetUser = () => ({ uid: 'U1', getIdToken: async () => 'TOK' }); });
  out.queued = await p.evaluate(() => JSON.stringify(window.TS13().g999));
  await p.evaluate(() => { window.__req.length = 0; return window.ts13Flush(); });
  out.commit = await p.evaluate(() => { const c = window.__req.find(r => /:commit/.test(r.url)); return c && c.body.writes.map(w => ({ n: w.update.name.split('/').pop(), mask: w.updateMask, a: w.updateTransforms[0].increment.integerValue, c: w.updateTransforms[1].increment.integerValue })); });
  out.left_expect_80_40 = await p.evaluate(() => JSON.stringify(window.TS13().g999));
  // 4) слова (w…) и предложения не попадают
  await p.evaluate(() => { afterAnswer({ gid: 'w001', k: 'x' }, true); afterAnswer({ gid: 's001', k: 'x' }, true); }); out.noWords = await p.evaluate(() => Object.keys(window.TS13()).filter(k => !/^(gr|pn|g)\d+$/.test(k)));
  // 5) без входа очередь ждёт
  await p.evaluate(() => { window.hzGetUser = () => null; window.__req.length = 0; return window.ts13Flush(); });
  out.noUserReq = await p.evaluate(() => window.__req.length);
  // 6) просмотр
  await p.evaluate(() => { window.hzGetUser = () => ({ uid: 'U1', getIdToken: async () => 'TOK' }); return window.ts13View(); }); await p.waitForTimeout(400);
  out.view = await p.evaluate(() => document.body.lastElementChild.innerText.replace(/\s+/g, ' ').slice(0, 220));
  await p.evaluate(() => { window.__req.length = 0; window.hzGetUser = () => ({ uid: 'U1', getIdToken: async () => 'TOK' });
    localStorage.setItem('hz5ts', '{}'); window.TS13().g500 = [3, 1]; window.TS13().g501 = [2, 2]; window.TS13().zz = [1, 1]; window.TS13().g502 = [1.5, 1];
    const f0 = window.fetch; window.fetch = async (u, o) => { const b = JSON.parse(o.body); window.__req.push(b.writes.map(w => w.update.name.split('/').pop())); const bad = b.writes.some(w => /g500$/.test(w.update.name)); return { ok: !bad, status: bad ? 403 : 200, json: async () => ({}) }; }; return window.ts13Flush(); });
  out.poison = await p.evaluate(() => ({ reqs: window.__req, left: Object.keys(window.TS13()) }));
  out.errs = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
})();
