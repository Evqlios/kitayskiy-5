const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/kitayskiy-5/site62.html'); await p.waitForTimeout(1500);
  const res = await p.evaluate(async () => {
    const out = {}; let now = Date.now(), fail = null, doc = null; const log = [];
    Date.now = () => now;                                     // управляемые часы
    window.hzGetUser = () => ({ uid: 'U1', getIdToken: async () => 'tok' });
    // сервер: копия логики правил (shape + потолок по b + b не меняется внутри недели)
    const rule = (cur, nw) => {
      const sOk = nw.s * 1000 <= 21600000 + now - nw.b + 120000;
      if(!cur) return sOk && nw.b === now;
      return sOk && ((nw.w !== cur.w && nw.b === now) || (nw.w === cur.w && nw.b === cur.b));
    };
    window.fetch = async (url, o) => {
      if(fail) return { ok: false, status: fail, json: async () => ({}) };
      if(/:commit$/.test(url)){
        const w = JSON.parse(o.body).writes[0], f = w.update.fields, nw = {};
        const cur = doc ? Object.assign({}, doc) : null; if(w.updateMask && !cur) return { ok: false, status: 400, json: async () => ({}) };
        const base = (w.updateMask && cur) ? Object.assign({}, cur) : {};
        Object.keys(f).forEach(k => base[k] = f[k].integerValue !== undefined ? +f[k].integerValue : f[k].stringValue);
        if(w.updateTransforms) base.b = now;
        if(!rule(cur, base)){ log.push('DENY s=' + base.s); return { ok: false, status: 403, json: async () => ({}) }; }
        doc = base; return { ok: true, status: 200, json: async () => ({}) };
      }
      if(doc) return { ok: true, status: 200, json: async () => ({ fields: { w: { stringValue: doc.w }, s: { integerValue: String(doc.s) }, b: { timestampValue: 'x' } } }) };
      return { ok: false, status: 404, json: async () => ({}) };
    };
    st.rate = true; st.nick = 'Тест'; st.gcode = 'K7M4Q9XT2B';
    // 1) честный: за неделю накоплено 8,3 ч, первая запись
    st.wk = { w: weekKey(), s: 30000 }; PUB = null;
    out.a_first = [await publishMe(), doc.s];                  // ждём true, 21600
    // 2) каждую минуту ещё 24 ч подряд, активное время растёт на 60 с в минуту
    let denied = 0; for(let i = 0; i < 1440; i++){ now += 60e3; st.wk.s += 60; if(!(await publishMe())) denied++; }
    out.b_honest = { denied, s: doc.s, want: st.wk.s, allowed: Math.floor(21600 + 1440 * 60 + 120) };
    // 3) перезагрузка страницы (PUB пуст), строка уже есть
    PUB = null; now += 120e3; st.wk.s += 120; out.c_reload = [await publishMe(), doc.s, st.wk.s];
    // 4) накрутчик: пишет раз в 1 с, каждый раз просит максимум (в клиенте — обходим cap, шлём напрямую)
    const wk0 = doc.b; let cheated = 0, tries = 0; doc = null; PUB = null; now += 1000;
    st.wk = { w: weekKey(), s: 360000 };
    await publishMe();                                          // create: максимум 21600
    for(let i = 0; i < 3600; i++){ now += 1000; tries++; const r = await fetch('x:commit', { method: 'POST', body: JSON.stringify({ writes: [{ update: { fields: { n: { stringValue: 'Тест' }, g: { stringValue: 'K7M4Q9XT2B' }, w: { stringValue: weekKey() }, s: { integerValue: String(doc.s + 120) } } }, updateMask: { fieldPaths: ['n', 'g', 'w', 's'] } }] }) }); if(r.ok) cheated++; }
    out.d_cheater = { writes_ok: cheated, tries, s_after_1h: doc.s, limit_6h_plus_1h: 21600 + 3600 + 120 };
    // 5) ошибки сети при чтении своей строки: не публиковать
    PUB = null; fail = 500; out.e_net500 = await publishMe(); fail = 403; PUB = null; out.f_403 = await publishMe(); fail = null;
    // 6) смена недели: другая w → create с новым b
    st.wk = { w: '2099-01-05', s: 100 }; const wkOrig = weekKey; window.weekKey = () => '2099-01-05'; PUB = null; out.g_newweek = [await publishMe(), doc.w, doc.s, doc.b === now];
    out.log = log.slice(0, 3);
    return out;
  });
  console.log(JSON.stringify(res, null, 1)); console.log('pageerrors', errs); await b.close();
})();
