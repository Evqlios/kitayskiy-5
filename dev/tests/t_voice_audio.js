// Настоящие записи (site65): по http запускается сервер из корня репозитория, страница играет слово/предложение/строку диалога
// мужским и женским голосом на трёх скоростях; проверяем, что берётся запись (blob в аудио-элементе), а не голос системы, и что длительность
// растёт с замедлением. Запуск: node t_voice_audio.js  (порт 8765)
const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8765', '--directory', '/home/user/kitayskiy-5'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const out = {}; const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/site65.html'); await p.evaluate(() => localStorage.setItem('hz5how', '1')); await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(() => { window.__tts = 0; window.SpeechSynthesisUtterance = function(t){ this.text = t; }; speechSynthesis.speak = () => { window.__tts++; }; });
  const cases = [['w001', '你', 'старое слово'], ['s001', '你们好！', 'старое предложение'], ['w120', null, 'новое слово (урок 11)'], ['d11_0', null, 'строка диалога урока 11']];
  const res = [];
  for (const v of ['m', 'f']) for (const sp of ['n', 'm', 's']) for (const [id, text, name] of cases) {
    const r = await p.evaluate(async ([v, sp, id, text, name]) => {
      st.voice = v; st.speed = sp; window.__tts = 0;
      const txt = text || (id[0] === 'w' ? (wById[id] && (wById[id].tts || wById[id].hz)) : 'x');
      playAudio0(id, txt, null);
      await new Promise(r => setTimeout(r, 900));
      const a = curAudio; const d = a && isFinite(a.duration) ? +a.duration.toFixed(2) : null;
      return { v, sp, id, name, urls: audioUrls(id).map(x => x[0]).join('>'), blob: !!(a && /^blob:/.test(a.src)), dur: d, tts: window.__tts };
    }, [v, sp, id, text, name]);
    res.push(r);
  }
  out.rows = res.map(r => `${r.v}/${r.sp} ${r.id} [${r.name}] ${r.urls} blob=${r.blob} dur=${r.dur} tts=${r.tts}`);
  out.noRecord = res.filter(r => !r.blob).map(r => r.v + '/' + r.sp + ' ' + r.id);
  out.errs = errs; console.log(JSON.stringify(out, null, 1)); await b.close(); srv.kill();
})();
