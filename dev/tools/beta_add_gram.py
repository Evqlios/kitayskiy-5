#!/usr/bin/env python3
"""Beta: добавляет в D13.gram вопросы грамматики уроков 11–15 (оцифровщики E и F) после проверки критиком.
Правки критика: dev/data_sgu/review_EF.json (вердикты DROP/FIX по файлу, массиву и индексу). Правит beta.html.
Запуск: python3 dev/tools/beta_add_gram.py"""
import json, os, re, sys
ROOT = '/home/user/kitayskiy-5'; SITE = os.environ.get('SITE', ROOT + '/beta.html'); DATA = ROOT + '/dev/data_sgu'
s = open(SITE, encoding='utf-8').read()
A = s.index('const D13 = ') + len('const D13 = '); B = s.index(";\n['words', 'chars', 'sents', 'sgu', 'gram', 'phon'].forEach", A)
D13 = json.loads(s[A:B].replace('<\\/', '</'))
seen = {x['q'].strip() for x in D13['gram']}
rv = {}
f = DATA + '/review_EF.json'
if os.path.exists(f):
    for v in json.load(open(f, encoding='utf-8')): rv[(v['file'], v['index'])] = v
problems, new = [], []
for lab in 'EF':
    for i, e in enumerate(json.load(open(f'{DATA}/{lab}.json', encoding='utf-8'))['gram']):
        v = rv.get((lab, i))
        if v and v['verdict'] == 'DROP': continue
        if v and v['verdict'] == 'FIX': e.update(v['set'])
        tag = f'{lab}.gram[{i}] {e.get("q", "")[:30]!r}'
        if e.get('L') not in (11, 12, 13, 14, 15): problems.append(tag + ': урок')
        for k in ('q', 'exp', 'src'):
            if not str(e.get(k, '')).strip(): problems.append(f'{tag}: нет {k}')
        o = e.get('opts', [])
        if e.get('t') != 'mc' or len(o) != 4 or len(set(o)) != 4: problems.append(f'{tag}: варианты {o}')
        if len(e.get('why', [])) != 3 or any(not str(w).strip() for w in e.get('why', [])): problems.append(tag + ': why')
        if not str(e.get('src', '')).startswith('СГУ с.'): problems.append(tag + ': src')
        if e.get('q', '').strip() in seen: problems.append(tag + ': дубль'); continue
        seen.add(e['q'].strip()); new.append(e)
if problems: print('\n'.join(problems)); sys.exit(2)
n = max(int(re.sub(r'\D', '', x['id'])) for x in D13['gram']) + 1
for e in sorted(new, key=lambda e: e['L']):
    e['id'] = f'gr{n}'; n += 1; D13['gram'].append(e)
t = json.dumps(D13, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
open(SITE, 'w', encoding='utf-8').write(s[:A] + t + s[B:])
print('добавлено вопросов грамматики:', len(new))
