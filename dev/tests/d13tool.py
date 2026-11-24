import json, re
SITE='/home/user/kitayskiy-5/site67.html'
def load():
    s=open(SITE,encoding='utf-8').read()
    a=s.index('const D13 = ')+len('const D13 = '); b=s.index(";\n['words', 'chars', 'sents', 'sgu', 'gram', 'phon'].forEach", a)
    return s, a, b, json.loads(s[a:b].replace('<\\/','</'))
def save(s,a,b,D):
    t=json.dumps(D,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
    open(SITE,'w',encoding='utf-8').write(s[:a]+t+s[b:])
