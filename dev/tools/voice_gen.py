#!/usr/bin/env python3
"""Генерация записей диктора (Edge neural voices через edge-tts) по манифесту, который делает voice_manifest.js.

Что делает: для каждого id из манифеста и каждой скорости (n: обычная, m: rate -20%, s: rate -40%) получает mp3 (24 кГц, моно, 48 кбит/с — как у
старых наборов pack2_*.mp3) и времена слов (WordBoundary) → таблица ATIM: начало каждого иероглифа в сотых секунды + конец речи.
Результат: папка out/<ключ>/<id>.mp3 и out/<ключ>/<id>.json; склейка в наборы и индексы — voice_pack.py.

Запуск (в среде нужен доступ к speech.platform.bing.com через прокси; CA прокси подставляется ниже):
  python3 voice_gen.py manifest.json out --voice zh-CN-XiaoxiaoNeural --prefix f --only all|new|old [--limit N] [--ids id1,id2]
Ключ набора = prefix + скорость: для женского префикс 'f' (fn, fm, fs), для новых мужских записей префикс 'x' (xn, xm, xs).
"""
import argparse, asyncio, json, os, re, ssl, sys
import edge_tts
import edge_tts.communicate as C
C._SSL_CTX = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE', '/root/.ccr/ca-bundle.crt'))   # CA прокси среды (без него TLS не проходит)
PROXY = os.environ.get('HTTPS_PROXY')
RATES = {'n': '+0%', 'm': '-20%', 's': '-40%'}      # как у старых записей: m ≈ ×1,25 длиннее, s ≈ ×1,6 (проверено по длительностям)
HZ = re.compile('[㐀-鿿]')

async def one(sem, voice, item, sp, key, out):
    path = os.path.join(out, key, item['id'] + '.mp3')
    if os.path.exists(path) and os.path.exists(path[:-4] + '.json'): return True
    async with sem:
        for attempt in range(5):
            try:
                c = edge_tts.Communicate(item['text'], voice, rate=RATES[sp], boundary='WordBoundary', proxy=PROXY)
                audio, words = bytearray(), []
                async for ch in c.stream():
                    if ch['type'] == 'audio': audio += ch['data']
                    elif ch['type'] == 'WordBoundary': words.append((ch['text'], ch['offset'] / 1e5, ch['duration'] / 1e5))   # сотые секунды
                if not audio: raise RuntimeError('пустой звук')
                # времена иероглифов: слово делим поровну между его иероглифами
                T = []
                for text, off, dur in words:
                    hz = [x for x in text if HZ.match(x)]
                    for i, _ in enumerate(hz): T.append(round(off + dur * i / len(hz)))
                n_hz = len(HZ.findall(item['text']))
                end = round(words[-1][1] + words[-1][2]) if words else 0
                tm = T + [end] if len(T) == n_hz else None       # если число не сошлось, таблицы нет: сайт считает по долям
                os.makedirs(os.path.dirname(path), exist_ok=True)
                open(path, 'wb').write(audio)
                json.dump({'t': tm, 'sec': round(len(audio) / 6000, 3)}, open(path[:-4] + '.json', 'w'))
                return True
            except Exception as e:
                last = e; await asyncio.sleep(1 + attempt * 2)
        print('ПРОВАЛ', key, item['id'], repr(last), file=sys.stderr); return False

async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('manifest'); ap.add_argument('out')
    ap.add_argument('--voice', required=True); ap.add_argument('--prefix', default='', help='f — женский, x — новые мужские, пусто — старый мужской')
    ap.add_argument('--only', default='all', choices=['all', 'new', 'old']); ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--ids', default=''); ap.add_argument('--speeds', default='nms'); ap.add_argument('--jobs', type=int, default=6)
    a = ap.parse_args()
    items = json.load(open(a.manifest, encoding='utf-8'))
    if a.only == 'new': items = [x for x in items if not x['old']]
    if a.only == 'old': items = [x for x in items if x['old']]
    if a.ids: items = [x for x in items if x['id'] in a.ids.split(',')]
    if a.limit: items = items[:a.limit]
    sem = asyncio.Semaphore(a.jobs); jobs = []
    for sp in a.speeds:
        for it in items: jobs.append(one(sem, a.voice, it, sp, a.prefix + sp, a.out))
    r = await asyncio.gather(*jobs); print('готово', sum(r), 'из', len(r))
asyncio.run(main())
