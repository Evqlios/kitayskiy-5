// Проверка инвариантов данных после подмешивания. node check_d13.js <site.html>
const { chromium } = require('playwright');
(async () => {
  const file = process.argv[2]; const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + file); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const out = { problems: [], counts: {} };
    const add = m => { if(out.problems.length < 60) out.problems.push(m); };
    const ids = new Set();
    for(const [k, arr] of [['words', D.words], ['chars', D.chars], ['sents', D.sents], ['sgu', D.sgu], ['gram', D.gram], ['phon', D.phon]]) {
      for(const x of arr){ if(ids.has(k + ':' + x.id)) add('дубль id ' + k + ':' + x.id); ids.add(k + ':' + x.id); }
    }
    const wBy = {}; D.words.forEach(w => { wBy[w.hz] = w; });
    for(const w of D.words){
      for(const f of ['hz', 'py', 'ru', 'L', 'kind', 'id', 'syl', 'disp', 'T', 'rr']) if(w[f] === undefined) add('слово ' + w.id + ' без поля ' + f);
      if(w.syl && w.py && w.syl.join('.') !== w.py.split(/[ .]/).join('.') && w.syl.join('') !== w.py.replace(/[ .]/g, '')) add('слово ' + w.id + ' syl не из py: ' + w.py + ' / ' + w.syl);
      if(w.disp !== undefined && w.py && w.disp !== w.py.replace(/\./g, '')) add('слово ' + w.id + ' disp ' + w.disp + ' ≠ py без точек');
    }
    for(const s of D.sents){
      for(const t of s.tokens || []) if(!wBy[t]) add('предложение ' + s.id + ': токен «' + t + '» не слово');
      if((s.tokens || []).join('') !== s.hz.replace(/[，。？！、,.?! ]/g, '')) add('предложение ' + s.id + ': токены не склеиваются в hz: ' + s.tokens.join('') + ' / ' + s.hz);
    }
    for(const c of D.chars){ if(!c.id || !c.hz || c.L === undefined) add('знак без полей ' + JSON.stringify(c).slice(0, 60)); }
    for(const g of D.gram.concat(D.phon)){ if(!g.q || !g.opts || g.opts.length < 2 || !g.exp || !g.id) add('вопрос без полей ' + g.id); }
    for(const g of D.sgu){ if(!g.q && g.t === 'mc') add('СГУ без q ' + g.id); if(g.t === 'mc' && (!g.opts || g.opts.length < 2)) add('СГУ без opts ' + g.id); }
    for(let L = 1; L <= 15; L++) out.counts[L] = { w: D.words.filter(w => w.L === L).length, c: D.chars.filter(c => c.L === L).length, s: D.sents.filter(s => !s.dup && s.L === L).length, g: D.gram.filter(g => g.L === L).length, p: D.phon.filter(g => g.L === L).length, sgu: D.sgu.filter(g => g.L === L).length };
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); console.log('pageerrors:', errs); await b.close();
})();
