#!/usr/bin/env python3
"""Вырезка одного слога из слова (长 из 校长, 兴 из 高兴, 乐 из 快乐, 的 из 我的): перебор точки начала по доле длины слова,
выбор по распознаванию (voice_fix.py: Asr, score). Запуск: python3 voice_tailfix.py <items.json> <out> <голос> <префикс>"""
import sys, json, os, asyncio
sys.argv_saved = sys.argv[:]; src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voice_fix.py'), encoding='utf-8').read().split('async def main')[0]
sys.argv = ['x']; exec(src)
items_f, out, voice, prefix = sys.argv_saved[1:5]
FR = [0.40, 0.44, 0.48, 0.52, 0.56, 0.60, 0.64, 0.68, 0.72, 0.76, 0.80, 0.36, 0.32]
async def fix(it, asr, rep):
    text, tail = it['text'], it['tail']; best = None
    for sp in 'n':
        mp3, b = await synth(text + '。', voice, RATE['n'])
        ev = [x for x in b if x[0].strip('。') == tail]                       # слог пришёл отдельным словом — берём точную границу
        cands = [max(0, ev[-1][1] - 0.03 + d) for d in (0, 0.04, 0.08, 0.12, -0.04)] if ev else [b[0][1] + b[0][2] * f - 0.03 for f in FR]
        for st in cands:
            o = ff_cut(mp3, st); sc = score(it['py'], asr(o))
            if best is None or sc > best[0] or (sc == best[0] == 0 and False): best = (sc, st, o, asr(o), (ev[-1][1] if ev else None))
            if sc >= 3: break
    sc, st, o, got, evt = best
    rel = (st + 0.03 - b[0][1]) / b[0][2] if not evt else None
    dlt = (st + 0.03 - evt) if evt else 0.0
    for sp in 'nms':
        if sp == 'n': mp3 = o
        else:
            m2, b2 = await synth(text + '。', voice, RATE[sp]); ev2 = [x for x in b2 if x[0].strip('。') == tail]
            s2 = max(0, ev2[-1][1] - 0.03 + dlt) if ev2 else b2[0][1] + b2[0][2] * rel - 0.03
            mp3 = ff_cut(m2, s2)
        d = os.path.join(out, prefix + sp); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, it['id'] + '.mp3'), 'wb').write(mp3)
        json.dump({'t': [0, round(duration(mp3) * 100)], 'sec': round(len(mp3) / 6000, 3)}, open(os.path.join(d, it['id'] + '.json'), 'w'))
    rep[it['id']] = dict(rep.get(it['id'], {}), text=text, py=it['py'], выбран='tailfix', оценка=round(sc, 2), услышано=got)
    print(prefix, it['id'], text, '->', got, round(sc, 2))
async def main():
    asr = Asr('/tmp/asr_model'); items = [i for i in json.load(open(items_f, encoding='utf-8')) if i.get('tail')]
    rp = os.path.join(out, f'report_{prefix}.json'); rep = json.load(open(rp))
    for it in items: await fix(it, asr, rep)
    json.dump(rep, open(rp, 'w'), ensure_ascii=False)
asyncio.run(main())
