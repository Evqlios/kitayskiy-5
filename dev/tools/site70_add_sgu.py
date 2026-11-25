#!/usr/bin/env python3
"""site70: добавляет в D13 оцифрованные задания СГУ (уроки 1–10), вопросы грамматики и фонетики.

Вход: dev/data_sgu/{A,B,C,D}.json (оцифровщики) и, если есть, dev/data_sgu/review_drop.json
      (список {"key": "<p>/<n>/<q-начало>"} записей, которые критик велел убрать) и review_fix.json
      (правки полей: {"key": "...", "set": {...}}).
Проверка каждой записи структурная; при любой проблеме скрипт печатает список и ничего не пишет.
Запуск: python3 dev/tools/site70_add_sgu.py   (правит /home/user/kitayskiy-5/site70.html)
"""
import json, os, re, sys
from collections import Counter

ROOT = '/home/user/kitayskiy-5'
SITE = os.environ.get('SITE', ROOT + '/site70.html')   # для пробного прогона можно подставить копию
DATA = ROOT + '/dev/data_sgu'
LESSON_PAGES = {1: (4, 8), 2: (9, 14), 3: (15, 21), 4: (22, 28), 5: (29, 36), 6: (37, 43),
                7: (44, 53), 8: (54, 61), 9: (62, 68), 10: (69, 77)}
CJK = re.compile(r'[㐀-鿿]')

s = open(SITE, encoding='utf-8').read()
D_START = s.index('const D13 = ') + len('const D13 = ')
D_END = s.index(";\n['words', 'chars', 'sents', 'sgu', 'gram', 'phon'].forEach", D_START)
D13 = json.loads(s[D_START:D_END].replace('<\\/', '</'))
existing = json.load(open(DATA + '/_existing_L1-10.json', encoding='utf-8'))
seen_q = {x['q'].strip() for x in existing['sgu'] + existing['gram'] + existing['phon']}

raw = {'sgu': [], 'gram': [], 'phon': []}
skipped = []
for lab in os.environ.get('LABELS', 'ABCD'):
    f = f'{DATA}/{lab}.json'
    if not os.path.exists(f):
        print('нет файла', f); sys.exit(1)
    j = json.load(open(f, encoding='utf-8'))
    for k in raw:
        for i, e in enumerate(j.get(k, [])):
            e['_from'] = lab; e['_k'] = k; e['_i'] = i      # однозначный ключ правок критика: файл.массив[индекс]
            raw[k].append(e)
    skipped += j.get('skipped', [])

drop = set(); fixes = {}
if os.path.exists(DATA + '/review_drop.json'):
    drop = {d['key'] for d in json.load(open(DATA + '/review_drop.json', encoding='utf-8'))}
if os.path.exists(DATA + '/review_fix.json'):
    fixes = {d['key']: d['set'] for d in json.load(open(DATA + '/review_fix.json', encoding='utf-8'))}


def key(e):
    """Ключ записи для правок критика: файл оцифровщика, массив и индекс (например B.sgu[24])."""
    return f"{e['_from']}.{e['_k']}[{e['_i']}]"


problems = []


def bad(e, msg):
    problems.append(f"{e['_from']} {key(e)}: {msg}")


def check_pairs(e, opts_key='opts'):
    o = e[opts_key]
    if not (2 <= len(o) <= 4) or len(set(o)) != len(o) or any(not isinstance(x, str) or not x.strip() for x in o):
        bad(e, f'варианты: {o}')


def check_sgu(e):
    L = e.get('L'); p = e.get('p')
    if L not in LESSON_PAGES: return bad(e, f'урок {L}')
    lo, hi = LESSON_PAGES[L]
    if not isinstance(p, int) or not lo <= p <= hi: return bad(e, f'страница {p} вне урока {L} ({lo}–{hi})')
    if not str(e.get('n', '')).strip(): bad(e, 'нет номера упражнения')
    if not e.get('q', '').strip(): return bad(e, 'нет q')
    if not e.get('exp', '').strip(): bad(e, 'нет exp')
    if not str(e.get('src', '')).startswith('СГУ с.'): bad(e, f"src: {e.get('src')}")
    if e.get('t') == 'mc':
        check_pairs(e)
        if e.get('hz'):
            opy = e.get('opy')
            if not opy or len(opy) != len(e['opts']): bad(e, 'opy не по числу вариантов')
            elif any(CJK.search(x) or x != x.lower() for x in opy): bad(e, f'opy: {opy}')
            if not all(CJK.search(x) for x in e['opts']): bad(e, 'hz=true, но в вариантах нет иероглифов')
        if e.get('ctx') and CJK.search(e['ctx']) and not e.get('cpy'): bad(e, 'ctx на китайском без cpy')
    elif e.get('t') == 'build':
        ans, extra = e.get('ans'), e.get('extra')
        if not ans or not all(isinstance(a, list) and a and all(isinstance(t, str) and t for t in a) for a in ans): return bad(e, f'ans: {ans}')
        if not isinstance(extra, list) or not all(isinstance(t, str) and t for t in extra): return bad(e, f'extra: {extra}')
        pool = Counter(ans[0] + extra)
        for v in ans:                                   # плитки альтернативных ответов, которых нет в основном, добавляем в extra,
            miss = Counter(v) - pool                    # чтобы любой допустимый ответ можно было собрать
            for t_, c_ in miss.items(): extra.extend([t_] * c_)
            pool = Counter(ans[0] + extra)
        if len(ans[0]) == 1 and len(extra) < 2: bad(e, 'одна плитка и меньше двух лишних: выбор не из чего')
        if e.get('pyp'):
            if e.get('hza') and not CJK.search(e['hza']): bad(e, 'hza без иероглифов')
            if not e.get('hza'): e.pop('hza', None)       # иероглифов (напр. имён) в книге нет: озвучки по hza не будет
            if any(CJK.search(t) for a in ans for t in a): bad(e, 'pyp, но в плитках иероглифы')
            e['hzs'] = ''
        else:
            if any(not CJK.search(t) for t in ans[0]): bad(e, 'нe-pyp, но плитка без иероглифов')
            if e.get('hzs') != ''.join(ans[0]): bad(e, f"hzs {e.get('hzs')} != {''.join(ans[0])}")
        if not e.get('pyp'): e['pyp'] = False
    else:
        bad(e, f"тип {e.get('t')}")


def check_gp(e):
    if e.get('L') not in LESSON_PAGES: return bad(e, f"урок {e.get('L')}")
    for f in ('q', 'exp', 'src'):
        if not str(e.get(f, '')).strip(): bad(e, f'нет {f}')
    if e.get('t') != 'mc': bad(e, 'тип не mc')
    o = e.get('opts', [])
    if len(o) != 4 or len(set(o)) != 4: bad(e, f'варианты: {o}')
    if len(e.get('why', [])) != len(o) - 1 or any(not str(w).strip() for w in e.get('why', [])): bad(e, 'why не по числу неверных')
    if not str(e.get('src', '')).startswith('СГУ с.'): bad(e, f"src: {e.get('src')}")


for k, chk in (('sgu', check_sgu), ('gram', check_gp), ('phon', check_gp)):
    keep = []
    for e in raw[k]:
        if key(e) in drop: continue
        if key(e) in fixes: e.update(fixes[key(e)])
        if e['q'].strip() in seen_q:
            skipped.append({'p': e.get('p'), 'n': e.get('n'), 'why': 'дубль по тексту вопроса (отброшено интегратором)'}); continue
        seen_q.add(e['q'].strip())
        chk(e); keep.append(e)
    raw[k] = keep

if problems:
    print('ПРОБЛЕМЫ (%d):' % len(problems))
    print('\n'.join(problems)); sys.exit(2)

# ---------- присвоение id и запись в D13 ----------
def nxt(arr, prefix):
    return max(int(re.sub(r'\D', '', x['id'])) for x in arr) + 1

n_sgu = nxt(D13['sgu'], 'g'); n_gr = nxt(D13['gram'], 'gr'); n_pn = nxt(D13['phon'], 'pn')
# защита от повторного запуска: новые id не должны пересекаться с уже добавленными (L ≤ 10 в D13)
assert not any(x['L'] <= 10 for x in D13['sgu'] + D13['gram'] + D13['phon']), 'D13 уже содержит записи уроков 1–10'
new_ids = {'sgu': [], 'gram': [], 'phon': []}
for e in sorted(raw['sgu'], key=lambda e: (e['L'], e['p'], str(e['n']).zfill(3))):
    e = {kk: v for kk, v in e.items() if not kk.startswith('_')}; e['id'] = f'g{n_sgu:03d}'; n_sgu += 1
    D13['sgu'].append(e); new_ids['sgu'].append(e['id'])
for e in sorted(raw['gram'], key=lambda e: e['L']):
    e = {kk: v for kk, v in e.items() if not kk.startswith('_')}; e['id'] = f'gr{n_gr}'; n_gr += 1
    D13['gram'].append(e); new_ids['gram'].append(e['id'])
for e in sorted(raw['phon'], key=lambda e: e['L']):
    e = {kk: v for kk, v in e.items() if not kk.startswith('_')}; e['id'] = f'pn{n_pn}'; n_pn += 1
    D13['phon'].append(e); new_ids['phon'].append(e['id'])

t = json.dumps(D13, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
s = s[:D_START] + t + s[D_END:]
open(SITE, 'w', encoding='utf-8').write(s)
json.dump(new_ids, open(DATA + '/new_ids.json', 'w'), ensure_ascii=False)
json.dump(skipped, open(DATA + '/skipped_all.json', 'w'), ensure_ascii=False, indent=0)
print('добавлено: sgu', len(new_ids['sgu']), ', gram', len(new_ids['gram']), ', phon', len(new_ids['phon']), '; пропущено оцифровщиками', len(skipped))
