// Аудит контраста по настоящим стилям страницы (WCAG): для каждого видимого текстового элемента берём computed color и
// реальный фон (слои предков с учётом прозрачности), считаем (L светлого + .05) ÷ (L тёмного + .05). Порог: обычный текст 4,5; крупный (≥24px или ≥18,66px жирный) 3.
// Запуск: node contrast_audit.js <файл.html>   Результат: список экранов и пар ниже порога, сгруппированных по селектору.
const { chromium } = require('playwright');
const FILE = process.argv[2];
const AUDIT = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  const lum = c => .2126 * lin(c.r) + .7152 * lin(c.g) + .0722 * lin(c.b);
  const cr = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
  const bgOf = el => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; const bb = parse(getComputedStyle(document.body).backgroundColor); if (bb && bb.a === 1) base = bb; return layers.reduceRight((acc, l) => over(l, acc), base); };
  const out = [], seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity; if (op < .05) continue;
    let fg = parse(cs.color); if (!fg) continue; const bg = bgOf(el); if (fg.a < 1) fg = over(fg, bg);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700, large = size >= 24 || (size >= 18.66 && bold), need = large ? 3 : 4.5, ratio = cr(fg, bg);
    if (ratio >= need) continue;
    const sel = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') + (el.parentElement && el.parentElement.className && typeof el.parentElement.className === 'string' ? ' ‹ ' + el.parentElement.tagName.toLowerCase() + '.' + el.parentElement.className.trim().split(/\s+/).join('.') : '');
    const key = sel + '|' + ratio.toFixed(2); if (seen.has(key)) continue; seen.add(key);
    out.push({ sel: sel.slice(0, 90), ratio: +ratio.toFixed(2), need, size, text: t.slice(0, 30) });
  }
  return out;
};
const SCREENS = {
  path: () => { stopAll(); st.tab = 'path'; route(); },
  theory: () => { stopAll(); st.tab = 'study'; st.ls = 'theory'; TH13ST.open = null; save(); route(); },
  theory_article: () => { stopAll(); st.tab = 'study'; st.ls = 'theory'; save(); route(); const c = document.querySelector('.th13c'); if (c) c.click(); },
  path_open3: () => { stopAll(); st.tab = 'path'; st.open = 3; route(); },
  path_open12: () => { stopAll(); st.tab = 'path'; st.open = 12; route(); },
  stats: () => { stopAll(); st.tab = 'stats'; route(); },
  task_gram: () => { stopAll(); st.tab = 'path'; route(); startSession(3, 'gram', true); },
  task_words: () => { stopAll(); st.tab = 'path'; route(); startSession(3, 'intro', true); },
  task_sgu: () => { stopAll(); st.tab = 'path'; route(); startSession(12, 'sgu', true); },
};
(async () => {
  const b = await chromium.launch(); const all = {};
  for (const scheme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme }); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + FILE); await p.waitForTimeout(600);
    await p.evaluate(() => localStorage.setItem('hz5how', '1')); await p.reload(); await p.waitForTimeout(900);
    for (const [name, fn] of Object.entries(SCREENS)) {
      await p.evaluate(() => { document.getElementById('welcome')?.remove(); });
      await p.evaluate(fn); await p.waitForTimeout(500);
      const variants = [['', null]];
      if (name.startsWith('task_')) variants.push(['+ответ', async () => { const o = await p.$('.opt'); if (o) { await o.click(); await p.waitForTimeout(300); } }]);
      for (const [suf, act] of variants) {
        if (act) await act();
        await p.waitForTimeout(100);
        all[scheme + ' ' + name + suf] = await p.evaluate(AUDIT);
      }
    }
    await p.evaluate(() => { stopAll(); st.tab = 'study'; route(); });
    const n = await p.evaluate(() => document.querySelectorAll('#sub button').length);
    for (let i = 0; i < n; i++) { await p.evaluate(i => document.querySelectorAll('#sub button')[i].click(), i); await p.waitForTimeout(500); const nm = await p.evaluate(i => document.querySelectorAll('#sub button')[i] && document.querySelectorAll('#sub button')[i].textContent.trim(), i); all[scheme + ' study:' + nm] = await p.evaluate(AUDIT); }
    all[scheme + ' errs'] = errs; await ctx.close();
  }
  for (const [k, v] of Object.entries(all)) { if (k.endsWith('errs')) { if (v.length) console.log(k, v); continue; } console.log('\n## ' + k + ': ' + v.length); v.sort((a, c) => a.ratio - c.ratio).slice(0, 12).forEach(x => console.log('  ' + x.ratio + ' (нужно ' + x.need + ') ' + x.size + 'px  ' + x.sel + '  «' + x.text + '»')); }
  await b.close();
})();
