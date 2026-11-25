#!/usr/bin/env python3
"""Сводит вердикты критиков (dev/data_sgu/review_*.json) в review_drop.json и review_fix.json для site70_add_sgu.py.
Вердикт критика ссылается на запись так: файл оцифровщика + массив + индекс. Здесь индекс переводится в ключ записи."""
import json, glob, os, sys
DATA = '/home/user/kitayskiy-5/dev/data_sgu'
src = {l: json.load(open(f'{DATA}/{l}.json', encoding='utf-8')) for l in 'ABCD'}

def key(e):
    return f"{e['p']}/{e['n']}/{e['q'].strip()[:12]}" if 'p' in e else f"L{e['L']}/{e['q'].strip()[:20]}"

default_file = {'review_A.json': 'A', 'review_B.json': 'B'}
drop, fix, log = [], [], []
for f in sorted(glob.glob(DATA + '/review_*.json')):
    name = os.path.basename(f)
    if name in ('review_drop.json', 'review_fix.json'): continue
    for v in json.load(open(f, encoding='utf-8')):
        lab = v.get('file') or default_file.get(name)
        assert lab in src, (name, v)
        e = src[lab][v['array']][v['index']]
        k = key(e)
        if v['verdict'] == 'DROP': drop.append({'key': k})
        elif v['verdict'] == 'FIX': fix.append({'key': k, 'set': v['set']})
        else: sys.exit('неизвестный вердикт: %r' % v)
        log.append(f"{v['verdict']} {lab}.{v['array']}[{v['index']}] {k}: {v.get('reason', '')[:100]}")
json.dump(drop, open(DATA + '/review_drop.json', 'w'), ensure_ascii=False)
json.dump(fix, open(DATA + '/review_fix.json', 'w'), ensure_ascii=False)
print('\n'.join(log)); print('DROP', len(drop), 'FIX', len(fix))
