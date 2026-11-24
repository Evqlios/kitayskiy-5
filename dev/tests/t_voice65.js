// Голос (site65): выбор в настройках и на экране входа, сохранение, голос системы по полу, пол реплик в ролях
const { chromium } = require('playwright');
const FILE = process.argv[2] || 'file:///home/user/kitayskiy-5/site65.html';
(async () => {
  const b = await chromium.launch(); const out = {}; const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(FILE); await p.evaluate(() => { localStorage.setItem('hz5how', '1'); localStorage.removeItem('hz5ask'); }); await p.reload(); await p.waitForTimeout(900);
  // подставные голоса системы
  await p.evaluate(() => {
    const V = [['Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)', 'zh-CN', false], ['Microsoft Yunxi Online (Natural) - Chinese (Mainland)', 'zh-CN', false], ['Google 普通话（中国大陆）', 'zh-CN', true], ['Microsoft Kangkang - Chinese (Simplified, PRC)', 'zh-CN', true], ['Microsoft HiuGaai - Chinese (Cantonese)', 'zh-HK', true], ['Anna', 'de-DE', true]].map(([name, lang, ls]) => ({ name, lang, localService: ls }));
    speechSynthesis.getVoices = () => V;
  });
  out.pick = await p.evaluate(() => ({ f: voiceFor65('f').name, m: voiceFor65('m').name }));
  out.defVoice = await p.evaluate(() => voiceNow65());
  // экран входа: переключатель
  await p.evaluate(() => { window.hzAuthReady(null); }); await p.waitForTimeout(300);
  out.welcome = await p.evaluate(() => !!document.querySelector('#wvoice') && [...document.querySelectorAll('#wvoice button')].map(x => x.textContent + ':' + x.className));
  await p.evaluate(() => document.querySelector('#wvoice [data-v=f]').click()); out.afterF = await p.evaluate(() => ({ v: st.voice, on: document.querySelector('#wvoice .on').textContent }));
  await p.evaluate(() => document.getElementById('welcome')?.remove());
  // настройки
  await p.evaluate(() => { stopAll(); st.tab = 'stats'; route(); }); await p.waitForTimeout(400);
  out.settings = await p.evaluate(() => ({ seg: !!document.querySelector('#voiceSeg'), on: document.querySelector('#voiceSeg .on')?.textContent }));
  await p.evaluate(() => document.querySelector('#voiceSeg [data-v=m]').click()); out.afterM = await p.evaluate(() => st.voice);
  // ключи записей для разных голосов и скоростей
  out.urls = await p.evaluate(() => { const r = {}; st.voice = 'm'; st.speed = 'm'; r.m_m = JSON.stringify(audioUrls('w001')); st.voice = 'f'; r.f_m = JSON.stringify(audioUrls('w001')); st.speed = 'n'; r.f_n = JSON.stringify(audioUrls('w001')); r.role_m_over_f = JSON.stringify(audioUrls('w001', null, 'm')); st.voice = 'm'; return r; });
  // голос системы при озвучке запасным путём: какой выбран
  out.spoken = await p.evaluate(() => { window.SpeechSynthesisUtterance = function(t){ this.text = t; }; const got = []; const orig = speechSynthesis.speak; speechSynthesis.speak = u => { got.push(u.voice && u.voice.name); }; const r = {};
    st.voice = 'f'; playAudio0('нет_такого', '你好', null); r.f = got.pop(); st.voice = 'm'; playAudio0('нет_такого', '你好', null); r.m = got.pop();
    speechSynthesis.speak = orig; return r; });
  await p.waitForTimeout(300);
  // пол реплик
  out.gender = await p.evaluate(() => ({ jm: genderOf13({ who: '家明' }, 2), mary: genderOf13({ who: '玛丽' }, 2), lin: genderOf13({ who: '林老师' }, 2), teacher: genderOf13({ who: '老师' }, 3), coach: genderOf13({ who: '教练' }, 6), narr5: genderOf13({}, 5), narr15: genderOf13({}, 15), narr11: genderOf13({}, 11) }));
  // роль мужская читает мужским даже при женском выборе: запускаем реплику Мэри и Димы через playLine13 с подменой tryPlay-входа
  out.line = await p.evaluate(() => { const seen = []; const o = audioUrls; window.__vo = []; const d = dlgOf13(2); st.voice = 'f'; const got = []; const orig = speechSynthesis.speak; speechSynthesis.speak = u => { got.push(u.voice && u.voice.name); };
    d.lines.slice(0, 4).forEach(x => { VO13 = genderOf13(x, 2); const u = audioUrls('нет', null); VO13 = null; seen.push(x.who + ':' + u[0][0]); }); speechSynthesis.speak = orig; st.voice = 'm'; return seen; });
  out.saved = await p.evaluate(() => { st.voice = 'f'; save(); return cleanState({ voice: 'f' }).voice + ' ' + cleanState({ voice: 'x' }).voice; });
  out.errs = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
})();
