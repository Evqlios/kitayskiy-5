// Голоса (site66): список из 5 голосов на экране входа и в настройках, сохранение выбора, ключи наборов, голоса в ролях по полу.
// Запуск: node t_voice66.js [url]
const { chromium } = require('playwright');
const FILE = process.argv[2] || 'file:///home/user/kitayskiy-5/site66.html';
(async () => {
  const b = await chromium.launch(); const out = {}; const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(FILE); await p.evaluate(() => { localStorage.setItem('hz5how', '1'); localStorage.removeItem('hz5ask'); }); await p.reload(); await p.waitForTimeout(900);
  out.def = await p.evaluate(() => ({ gender: voiceNow65(), id: curVoice66() }));
  await p.evaluate(() => window.hzAuthReady(null)); await p.waitForTimeout(300);
  out.welcome = await p.evaluate(() => [...document.querySelectorAll('#wvoice button')].map(x => x.dataset.v + (x.classList.contains('on') ? '*' : '')));
  await p.evaluate(() => document.querySelector('#wvoice [data-v=f4]').click());
  out.afterF4 = await p.evaluate(() => ({ voice: st.voice, vf: st.vf, vm: st.vm, id: curVoice66() }));
  await p.evaluate(() => document.getElementById('welcome')?.remove());
  await p.evaluate(() => { stopAll(); st.tab = 'stats'; route(); }); await p.waitForTimeout(400);
  out.settings = await p.evaluate(() => ({ n: document.querySelectorAll('#voiceSeg button').length, on: document.querySelector('#voiceSeg .on')?.dataset.v }));
  await p.evaluate(() => document.querySelector('#voiceSeg [data-v=m3]').click());
  out.afterM3 = await p.evaluate(() => ({ voice: st.voice, vf: st.vf, vm: st.vm, id: curVoice66() }));
  // ключи по голосам и скоростям
  out.keys = await p.evaluate(() => { const r = {}; st.speed = 'm'; for (const id of ['f1', 'f4', 'm6', 'm3', 'm5']) { st.voice = id[0]; if (id[0] === 'f') st.vf = id; else st.vm = id; r[id] = audioUrls('w001').map(x => x[0]).join('>'); } return r; });
  // роли: мужская реплика при женском выборе берёт выбранный мужской голос (vm), женская при мужском — выбранный женский (vf)
  out.roles = await p.evaluate(() => { st.vf = 'f4'; st.vm = 'm5'; st.voice = 'f'; const a = audioUrls('w001', null, 'm')[0][0]; st.voice = 'm'; const c = audioUrls('w001', null, 'f')[0][0]; return { maleLineWhileFemale: a, femaleLineWhileMale: c }; });
  out.clean = await p.evaluate(() => JSON.stringify(cleanState({ vf: 'f4', vm: 'm3' })) + JSON.stringify(cleanState({ vf: 'zz', vm: 'f1' })));
  out.errs = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
})();
