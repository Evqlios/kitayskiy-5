const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = {};
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/kitayskiy-5/site62.html'); await p.waitForTimeout(800);
  await p.evaluate(() => { localStorage.setItem('hz5how', '1'); localStorage.removeItem('hz5guest'); }); await p.reload(); await p.waitForTimeout(1000);
  await p.evaluate(() => {
    document.getElementById('welcome')?.remove();
    window.__log = []; window.__signupFail = false;
    const w = weekKey(); const row = (id, n, s, l) => ({ name: 'x/' + id, fields: { n: { stringValue: n }, w: { stringValue: w }, s: { integerValue: String(s) }, k: { integerValue: '3' }, m: { integerValue: '20' }, l: { integerValue: String(l) }, p: { integerValue: '1' } } });
    window.__db = [row('U2', 'Маша', 9000, 6)];
    window.fetch = async (url, o) => {
      url = String(url); const m = (o && o.method) || 'GET'; window.__log.push(m + ' ' + url.replace(/\?key=.*/, '').replace(/^https:\/\//, '').slice(0, 110));
      const ok = (j, status = 200) => ({ ok: status < 400, status, json: async () => j });
      if (/accounts:signUp/.test(url)) return window.__signupFail ? ok({ error: { message: 'OPERATION_NOT_ALLOWED' } }, 400) : ok({ idToken: 'T1', refreshToken: 'R1', localId: 'GUEST1', expiresIn: '3600' });
      if (/securetoken/.test(url)) return ok({ id_token: 'T2', refresh_token: 'R2', user_id: 'GUEST1', expires_in: '3600' });
      if (/:commit$/.test(url)) return ok({});
      if (m === 'DELETE') return ok({});
      if (/\/leaders\/[A-Za-z0-9]+$/.test(url) && m === 'GET') return ok({}, 404);
      if (/\/leaders\?/.test(url)) return ok({ documents: window.__db });
      return ok({});
    };
    st.rate = false; st.tab = 'stats'; route();
  });
  await p.waitForTimeout(600);
  out.form = await p.evaluate(() => ({ btns: [...document.querySelectorAll('#rating button')].map(b => b.textContent.trim()), text: document.querySelector('#rating .small')?.textContent.slice(0, 80) }));
  // регистрация гостя
  await p.evaluate(() => { document.getElementById('rnick').value = 'Илья'; document.getElementById('rjoin').click(); }); await p.waitForTimeout(1200);
  out.afterJoin = await p.evaluate(() => ({ rate: st.rate, guest: GUEST && GUEST.uid, stored: !!localStorage.getItem('hz5guest'), table: document.querySelector('#rating table')?.innerText.replace(/\s+/g, ' ').slice(0, 80), note: document.querySelector('#rating')?.innerText.includes('как гость'), commit: window.__log.filter(x => /commit/.test(x)).length, commitBody: null }));
  out.log1 = await p.evaluate(() => window.__log.slice());
  // вход через Google: строка гостя удаляется, гость забыт, запись идёт под uid аккаунта
  await p.evaluate(() => { window.__log.length = 0; window.hzGetUser = () => ({ uid: 'G1', displayName: 'Илья Т', getIdToken: async () => 'GT' }); return window.hzGuestMerge13(); });
  await p.evaluate(() => { PUB = null; return publishMe(); }); await p.waitForTimeout(300);
  out.afterGoogle = await p.evaluate(() => ({ guestLeft: !!GUEST, stored: !!localStorage.getItem('hz5guest'), log: window.__log.slice() }));
  // гостевой вход выключен в консоли: сообщение
  await p.evaluate(() => { window.hzGetUser = () => null; guestSave(null); st.rate = false; window.__signupFail = true; st.tab = 'stats'; route(); }); await p.waitForTimeout(500);
  await p.evaluate(() => { document.getElementById('rnick').value = 'Илья'; document.getElementById('rjoin').click(); }); await p.waitForTimeout(800);
  out.signupOff = await p.evaluate(() => ({ rate: st.rate, guest: !!GUEST, toast: [...document.querySelectorAll('[role=status],.toast')].map(e => e.textContent).filter(t => /Гостевой/.test(t))[0] || null }));
  out.errs = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
})();
