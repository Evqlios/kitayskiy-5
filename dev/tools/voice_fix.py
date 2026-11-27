#!/usr/bin/env python3
"""Пере-озвучка знаков и слов с проверкой результата распознаванием речи (сборка 9, «озвучка»).

Проблема: Edge TTS читает ОДИНОЧНЫЙ знак как конец фразы (тон «падает»: 张 звучит как zhàng), а 您好 и 你好 для слуха почти не различаются.
Явно задать произношение нельзя: <phoneme> сервис отклоняет. Поэтому для каждого знака и слова перебираем способы записи, распознаём
каждый результат офлайн-моделью (sherpa-onnx paraformer-zh) и оставляем тот, чей пиньинь с тонами совпал с ожидаемым.

Варианты записи (n — обычный темп):  plain — «张»;  dot — «张。»;  dup — «张，张。» и берём второе;  slow — «张。» на −15%.
Для знаков, которые читаются только в слове (长 в 校长, 乐 в 快乐, 兴 в 高兴): синтез слова и вырезка последнего слога (по границе слова
из WordBoundary, иначе по провалу громкости).
Медленные темпы (m −20%, s −40%) делаются тем же вариантом, что выбран для n.

Запуск:  python3 voice_fix.py <items.json> <out> <голос> <префикс> [--asr-model папка]
items.json: [{id, text, py, tail?}]  (tail — какой знак вырезать из text)
Результат: <out>/<префикс><темп>/<id>.mp3 + .json (как у voice_gen.py), <out>/report_<префикс>.json — что выбрано и сошлось ли.
"""
import argparse, asyncio, io, json, os, re, ssl, subprocess, sys, unicodedata
import numpy as np, librosa
import edge_tts, edge_tts.communicate as C
from pypinyin import pinyin, Style
import sherpa_onnx

C._SSL_CTX = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE', '/root/.ccr/ca-bundle.crt'))
PROXY = os.environ.get('HTTPS_PROXY')
RATE = {'n': '+0%', 'm': '-20%', 's': '-40%'}
HZ = re.compile('[㐀-鿿]')
TONES = re.compile('[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]')
PRIO = ['dot', 'dup', 'plain', 'slow', 'comma', 'commaslow']          # при равной оценке: порядок предпочтения

def strip_tone(s): return ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c))
def norm(py): return re.sub(r'[.\s·\-]', '', py).lower()
def asr_py(text): return norm(''.join(x[0] for x in pinyin(text, style=Style.TONE)))

def score(exp_py, got_text):
    """3 — пиньинь с тонами совпал (нейтральный слог в ожидаемом принимает любой тон); 2 — совпал без тонов; иначе доля совпавших символов."""
    e, g = norm(exp_py), asr_py(got_text)
    if g == e: return 3.0
    if strip_tone(g) == strip_tone(e):
        # те же слоги, тон другой: допустим, только если в ожидаемом вообще нет знаков тона (слово из одних нейтральных слогов)
        return 3.0 if not TONES.search(e) else 2.0
    a, b = strip_tone(g), strip_tone(e)
    return sum(x == y for x, y in zip(a, b)) / max(len(a), len(b), 1)

class Asr:
    def __init__(self, folder):
        self.r = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=folder + '/model.int8.onnx', tokens=folder + '/tokens.txt', num_threads=4, sample_rate=16000, feature_dim=80)
    def __call__(self, mp3):
        y, _ = librosa.load(io.BytesIO(mp3), sr=16000)
        y = np.concatenate([np.zeros(4000), y, np.zeros(4000)]).astype(np.float32)
        s = self.r.create_stream(); s.accept_waveform(16000, y); self.r.decode_stream(s); return s.result.text.strip()

async def synth(text, voice, rate):
    for k in range(5):
        try:
            c = edge_tts.Communicate(text, voice, rate=rate, boundary='WordBoundary', proxy=PROXY)
            a, w = bytearray(), []
            async for ch in c.stream():
                if ch['type'] == 'audio': a += ch['data']
                elif ch['type'] == 'WordBoundary': w.append((ch['text'], ch['offset'] / 1e7, ch['duration'] / 1e7))
            if a: return bytes(a), w
        except Exception as e: last = e
        await asyncio.sleep(1 + 2 * k)
    raise RuntimeError('синтез не удался: ' + text)

def ff_cut(mp3, t0):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-ss', f'{max(0, t0):.3f}', '-b:a', '48k', '-ar', '24000', '-ac', '1', '-f', 'mp3', 'pipe:1'], input=mp3, capture_output=True)
    return r.stdout

def duration(mp3):
    y, sr = librosa.load(io.BytesIO(mp3), sr=16000); return len(y) / sr

def valley_split(mp3, n_syl, k):
    """время начала k-го слога (k от 0) в слове из n_syl слогов: ищем провал громкости около равной доли"""
    y, sr = librosa.load(io.BytesIO(mp3), sr=16000)
    rms = librosa.feature.rms(y=y, frame_length=400, hop_length=160)[0]
    idx = np.where(rms > rms.max() * 0.08)[0]
    a, b = idx[0], idx[-1]
    guess = a + (b - a) * k / n_syl
    lo, hi = int(guess - (b - a) * 0.2 / n_syl * 2), int(guess + (b - a) * 0.2 / n_syl * 2)
    lo, hi = max(a + 1, lo), min(b - 1, max(lo + 1, hi))
    j = lo + int(np.argmin(rms[lo:hi + 1]))
    return j * 160 / sr

def timings(text, bounds, shift):
    """начала знаков в сотых секунды относительно начала вырезки + конец речи; None, если число не сошлось"""
    T = []
    for t, off, dur in bounds:
        hz = [x for x in t if HZ.match(x)]
        for i in range(len(hz)): T.append(round((off + dur * i / len(hz) - shift) * 100))
    return T

async def make(it, voice, kind, rate, an_tail=None):
    """возвращает (mp3, времена) для одного варианта"""
    text, tail = it['text'], it.get('tail')
    if kind == 'dup': src = text + '，' + text + '。'
    elif kind in ('dot', 'slow'): src = text + '。'
    elif kind in ('comma', 'commaslow'): src = '，'.join(re.findall(HZ, text)) + '。'
    else: src = text
    rt = '-15%' if (kind in ('slow', 'commaslow') and rate == '+0%') else rate
    mp3, bounds = await synth(src, voice, rt)
    # где начинается нужная часть
    start = 0.0; use = bounds
    if kind == 'dup':
        ev = [b for b in bounds if b[0].strip('，。') == text]
        if len(ev) >= 2: start = max(0, ev[-1][1] - 0.03); use = [b for b in bounds if b[1] >= ev[-1][1] - 1e-6]
    if tail:
        ev = [b for b in bounds if b[0].strip('，。') == tail]
        if ev: start = max(0, ev[-1][1] - 0.03); use = [ev[-1]]
        else:
            n = len(re.findall(HZ, text)); k = text.index(tail)
            start = max(0, valley_split(mp3, n, k) - 0.03); use = [(tail, start + 0.03, 0.3)]
    out = ff_cut(mp3, start) if start > 0 else mp3
    T = timings(text if not tail else tail, [b for b in use if b[0].strip('，。')], start)
    n_hz = len(HZ.findall(tail or text))
    end = round(duration(out) * 100)
    return out, (T + [end] if len(T) == n_hz else None)

async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('items'); ap.add_argument('out'); ap.add_argument('voice'); ap.add_argument('prefix')
    ap.add_argument('--asr-model', default='/tmp/asr_model'); ap.add_argument('--jobs', type=int, default=8)
    a = ap.parse_args()
    items = json.load(open(a.items, encoding='utf-8')); asr = Asr(a.asr_model)
    sem = asyncio.Semaphore(a.jobs); report = {}
    rep_path = os.path.join(a.out, f'report_{a.prefix}.json')
    if os.path.exists(rep_path): report = json.load(open(rep_path))

    async def one(it):
        if it['id'] in report and all(os.path.exists(os.path.join(a.out, a.prefix + sp, it['id'] + '.mp3')) for sp in 'nms'): return
        async with sem:
            kinds = ['dot', 'plain'] if it.get('tail') else [k for k in PRIO if len(re.findall(HZ, it['text'])) > 1 or not k.startswith('comma')]
            res = {}
            for kd in kinds:
                try:
                    mp3, T = await make(it, a.voice, kd, RATE['n'])
                    got = await asyncio.get_running_loop().run_in_executor(None, asr, mp3)
                    res[kd] = (score(it['py'], got), mp3, T, got)
                except Exception as e: print('сбой', it['id'], kd, e, file=sys.stderr)
            if not res: print('ПРОВАЛ', it['id'], file=sys.stderr); return
            best = max(res, key=lambda k: (res[k][0], -PRIO.index(k) if k in PRIO else 0))
            for sp in 'nms':
                if sp == 'n': mp3, T = res[best][1], res[best][2]
                else:
                    try: mp3, T = await make(it, a.voice, best if best not in ('slow',) else 'dot', RATE[sp])
                    except Exception as e: print('сбой', it['id'], sp, e, file=sys.stderr); continue
                d = os.path.join(a.out, a.prefix + sp); os.makedirs(d, exist_ok=True)
                open(os.path.join(d, it['id'] + '.mp3'), 'wb').write(mp3)
                json.dump({'t': T, 'sec': round(len(mp3) / 6000, 3)}, open(os.path.join(d, it['id'] + '.json'), 'w'))
            report[it['id']] = {'text': it['text'], 'py': it['py'], 'выбран': best, 'оценка': round(res[best][0], 2), 'услышано': res[best][3],
                                'все': {k: [round(v[0], 2), v[3]] for k, v in res.items()}}
            json.dump(report, open(rep_path, 'w'), ensure_ascii=False)
    await asyncio.gather(*[one(i) for i in items])
    ok = sum(1 for v in report.values() if v['оценка'] >= 3)
    print(a.prefix, 'готово', len(report), 'из', len(items), '; пиньинь с тонами совпал:', ok)
asyncio.run(main())
