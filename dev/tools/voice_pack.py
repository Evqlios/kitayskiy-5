#!/usr/bin/env python3
"""Сборка наборов записей из папки, которую сделал voice_gen.py, и подключение их к странице.

Для каждого ключа (fn, fm, fs — женский; xn, xm, xs — новые мужские записи) склеивает все mp3 в один файл pack2_<ключ>.mp3 (склейка mp3-кадров
допустима: сайт режет набор по смещениям и проигрывает кусок отдельным звуком) и пишет два индекса:
  AIDX[ключ][id] = [смещение, длина в байтах], ATIM[ключ][id] = [начало каждого иероглифа в сотых секунды…, конец речи].
Индексы вставляются в страницу между метками /*VOICE-AIDX*/ … /*VOICE-AIDX-END*/ и /*VOICE-ATIM*/ … /*VOICE-ATIM-END*/ (метки уже стоят в файле;
повторный запуск заменяет вставку, дубликатов не будет).

Запуск: python3 voice_pack.py <папка с out> <куда класть pack2_*.mp3> <страница.html>
"""
import json, os, re, sys

src, dst, page = sys.argv[1:4]
aidx, atim, report = {}, {}, {}
page_s = open(page, encoding='utf-8').read()
def old_index(mark, var):
    m = re.search(r'/\*' + mark + r'\*/const ' + var + r' = (\{.*?\}); for\(const k in', page_s, re.S)
    return json.loads(m.group(1)) if m else {}
OLD_A, OLD_T = old_index('VOICE-AIDX', 'AIDX_V'), old_index('VOICE-ATIM', 'ATIM_V')
# Дописываем в конец: уже выложенные клипы остаются на своих местах (смещения не меняются), иначе у тех, кто скачал набор раньше, звук поедет.
for key in sorted(os.listdir(src)):
    d = os.path.join(src, key)
    if not os.path.isdir(d): continue
    ids = sorted(f[:-4] for f in os.listdir(d) if f.endswith('.mp3') and os.path.exists(os.path.join(d, f[:-4] + '.json')))
    path = os.path.join(dst, 'pack2_' + key + '.mp3')
    a, t = dict(OLD_A.get(key, {})), dict(OLD_T.get(key, {}))
    if a and os.path.exists(path):
        buf = open(path, 'rb').read()
        for i, (off, ln) in a.items():                       # проверка: клип в файле тот же, что в папке
            assert buf[off:off + ln] == open(os.path.join(d, i + '.mp3'), 'rb').read(), 'клип ' + key + '/' + i + ' изменился'
        mode, off = 'ab', len(buf)
    else:
        a, t, mode, off = {}, {}, 'wb', 0
    with open(path, mode) as out:
        for i in ids:
            if i in a: continue
            b = open(os.path.join(d, i + '.mp3'), 'rb').read()
            out.write(b); a[i] = [off, len(b)]; off += len(b)
            tm = json.load(open(os.path.join(d, i + '.json')))['t']
            if tm: t[i] = tm
    aidx[key], atim[key] = a, t
    report[key] = {'клипов': len(a), 'МБ': round(off / 1048576, 2), 'с таблицей времён': len(t)}
s = page_s
def put(s, mark, js):
    pat = re.compile(r'/\*' + mark + r'\*/.*?/\*' + mark + r'-END\*/', re.S)
    assert len(pat.findall(s)) == 1, 'метка ' + mark + ' не найдена ровно один раз'
    return pat.sub(lambda m: '/*' + mark + '*/' + js + '/*' + mark + '-END*/', s)
s = put(s, 'VOICE-AIDX', 'const AIDX_V = ' + json.dumps(aidx, separators=(',', ':')) + '; for(const k in AIDX_V) AIDX[k] = Object.assign(AIDX[k] || {}, AIDX_V[k]);')
s = put(s, 'VOICE-ATIM', 'const ATIM_V = ' + json.dumps(atim, separators=(',', ':')) + '; for(const k in ATIM_V) ATIM[k] = Object.assign(ATIM[k] || {}, ATIM_V[k]);')
open(page, 'w', encoding='utf-8').write(s)
print(json.dumps(report, ensure_ascii=False, indent=1))
