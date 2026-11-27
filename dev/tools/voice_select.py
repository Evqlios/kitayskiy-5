#!/usr/bin/env python3
"""Отбор новых клипов: заменяем старый клип только если новый ЛУЧШЕ по проверке распознаванием (иначе остаётся прежний и пакет не раздувается).
Для знаков без старой записи (长, 乐, 兴) берём новый клип всегда. Клипы заданий с тем же текстом, что у слова/знака (aliases.json), копируются как копии выбранных.
Запуск: python3 voice_select.py <items.json> <aliases.json> <папка new (voice_fix)> <папка old-asr (asr_<ключ>.json)> <куда класть отобранное>"""
import sys, os, json, shutil
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voice_fix.py'), encoding='utf-8').read().split('class Asr')[0]
sys.argv_saved = sys.argv[:]; sys.argv = ['x']; exec(src.split('def asr_py')[0] + 'def asr_py' + src.split('def asr_py')[1])
items_f, al_f, new_d, old_d, out = sys.argv_saved[1:6]
items = {i['id']: i for i in json.load(open(items_f, encoding='utf-8'))}; aliases = json.load(open(al_f))
stat = {}
for v in 'yfjeb':
    rep = json.load(open(f'{new_d}/report_{v}.json')); old = json.load(open(f'{old_d}/asr_{v}n.json'))
    pick, same, worse = [], 0, 0
    for i, r in rep.items():
        it = items[i]; ns = r['оценка']
        if i not in old: ok = True                                    # старой записи нет (новые знаки)
        else:
            os_ = score(it['py'], old[i]); ok = ns > os_
            if not ok: worse += (ns < os_); same += (ns == os_)
        if ok: pick.append(i)
    al = [(a, s) for a, s in aliases.items() if s in pick]
    for sp in 'nms':
        d = f'{out}/{v}{sp}'; os.makedirs(d, exist_ok=True)
        for i in pick:
            for e in ('.mp3', '.json'): shutil.copy(f'{new_d}/{v}{sp}/{i}{e}', f'{d}/{i}{e}')
        for a, s in al:
            for e in ('.mp3', '.json'): shutil.copy(f'{new_d}/{v}{sp}/{s}{e}', f'{d}/{a}{e}')
    stat[v] = dict(заменено=len(pick), копий_для_заданий=len(al), оставлено_без_изменений=same, новое_хуже_старого=worse)
print(json.dumps(stat, ensure_ascii=False, indent=1))
