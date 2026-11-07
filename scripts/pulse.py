"""Pulse v0: per-second retention-related measurements of a video.

python pulse.py <video.mp4> <outdir> [--words timeline.json|subs.vtt] [--start S] [--end E]

Measures (all from the file itself, no AI):
  - motion per 0.1 s (mean abs diff of 64x36 gray frames, 0-255) -> per second, still runs
  - hard cuts (frame diff spike)
  - audio loudness per 0.1 s (RMS dBFS), silent gaps
  - words: from our timeline.json (exact) or YouTube auto-subs .vtt (word timestamps)
    -> words/min per 5 s window, gaps between words, time to first word
  - contact sheet: one frame per second, 10 per row
Writes outdir/pulse.json, outdir/seconds.csv, outdir/sheet_*.jpg
"""
import json, os, re, subprocess, sys
import numpy as np

def _find_ffmpeg():
    import shutil
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    for c in (os.environ.get('FFMPEG'), str(root / 'node_modules' / 'ffmpeg-static' / 'ffmpeg'), shutil.which('ffmpeg')):
        if c and os.path.exists(c):
            return c
    raise SystemExit('ffmpeg not found: run scripts/setup.sh or set FFMPEG=/path/to/ffmpeg')


FF = _find_ffmpeg()
FPS = 10
W, H = 64, 36
STILL = 1.0      # motion below this (0-255 scale) = nothing changes on screen
CUT = 25.0       # frame diff above this = hard cut / full-screen change
SILENT_DB = -40  # audio below = silence


def args():
    a = sys.argv[1:]
    o = {'video': a[0], 'out': a[1], 'words': None, 'start': 0.0, 'end': None}
    i = 2
    while i < len(a):
        k = a[i][2:]
        o[k] = a[i + 1] if k == 'words' else float(a[i + 1])
        i += 2
    return o


def trim(o):
    t = ['-ss', str(o['start'])]
    if o['end']:
        t += ['-to', str(o['end'])]
    return t


def frames(o):
    p = subprocess.run([FF, '-v', 'error', *trim(o), '-i', o['video'], '-vf', f'fps={FPS},scale={W}:{H},format=gray',
                        '-f', 'rawvideo', '-'], capture_output=True, check=True)
    f = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W).astype(np.float32)
    d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
    return np.concatenate([[0.0], d])


def audio(o):
    sr = 16000
    p = subprocess.run([FF, '-v', 'error', *trim(o), '-i', o['video'], '-vn', '-ac', '1', '-ar', str(sr),
                        '-f', 's16le', '-'], capture_output=True, check=True)
    x = np.frombuffer(p.stdout, np.int16).astype(np.float32) / 32768
    n = sr // FPS
    x = x[:len(x) // n * n].reshape(-1, n)
    return 20 * np.log10(np.sqrt((x ** 2).mean(axis=1)) + 1e-9)


def words_from(path, o):
    if not path:
        return []
    if path.endswith('.json'):
        tl = json.load(open(path))
        w = [(x['start'], x['end'], x['w']) for ln in tl['lines'] for x in ln['words']]
    else:  # youtube auto-subs: <00:00:01.234><c> word</c>
        txt = open(path, encoding='utf-8').read()
        ts = lambda s: sum(float(v) * m for v, m in zip(s.split(':'), (3600, 60, 1)))
        seen, w = set(), []
        for blk in txt.split('\n\n'):
            m = re.match(r'(\d+:\d+:\d+\.\d+) --> (\d+:\d+:\d+\.\d+)', blk)
            if not m or '<c>' not in blk:
                continue
            line = blk.split('\n', 1)[1].split('\n')[-1]
            first = re.match(r'([^<]+)<', line)
            parts = re.findall(r'<(\d+:\d+:\d+\.\d+)><c>([^<]*)</c>', line)
            items = ([(ts(m.group(1)), first.group(1).strip())] if first else []) + [(ts(t), s.strip()) for t, s in parts]
            for t, s in items:
                if s and (round(t, 2), s) not in seen:
                    seen.add((round(t, 2), s))
                    w.append([t, t, s])
        w.sort()
        for i in range(len(w)):
            w[i][1] = w[i + 1][0] if i + 1 < len(w) else w[i][0] + 0.3
        w = [tuple(x) for x in w]
    s, e = o['start'], o['end'] or 1e9
    return [(a - s, b - s, t) for a, b, t in w if s <= a < e]


def runs(mask, min_len):
    out, i = [], 0
    while i < len(mask):
        if mask[i]:
            j = i
            while j < len(mask) and mask[j]:
                j += 1
            if (j - i) / FPS >= min_len:
                out.append((round(i / FPS, 1), round((j - i) / FPS, 1)))
            i = j
        else:
            i += 1
    return out


def sheet(o, dur, step=1.0):
    """Contact sheet: a frame every `step` s (taken mid-interval), 10 per row, 60 per sheet, labeled with time."""
    from PIL import Image, ImageDraw, ImageFont
    tw, th = 320, 180
    p = subprocess.run([FF, '-v', 'error', *trim(o), '-i', o['video'], '-vf',
                        f'fps={1 / step}:start_time={step / 2},scale={tw}:{th}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True, check=True)
    fr = np.frombuffer(p.stdout, np.uint8).reshape(-1, th, tw, 3)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 22)
    except OSError:
        font = ImageFont.load_default()
    per = 60
    for k in range(0, len(fr), per):
        chunk = fr[k:k + per]
        rows = int(np.ceil(len(chunk) / 10))
        img = Image.new('RGB', (tw * 10, th * rows), 'black')
        d = ImageDraw.Draw(img)
        for i, f in enumerate(chunk):
            x, y = (i % 10) * tw, (i // 10) * th
            img.paste(Image.fromarray(f), (x, y))
            lab = f'{(k + i) * step:.0f}s'
            d.rectangle([x, y, x + 62, y + 28], fill='black')
            d.text((x + 5, y + 3), lab, fill='yellow', font=font)
        img.save(os.path.join(o['out'], f'sheet_{k // per:02d}.jpg'), quality=80)


def main():
    o = args()
    os.makedirs(o['out'], exist_ok=True)
    m = frames(o)
    a = audio(o)
    n = min(len(m), len(a))
    m, a = m[:n], a[:n]
    dur = n / FPS
    w = words_from(o['words'], o)

    cuts = [round(i / FPS, 1) for i in range(1, n) if m[i] > CUT]
    still_runs = runs(m < STILL, 1.0)
    silent_runs = runs(a < SILENT_DB, 0.5)
    gaps = [(round(w[i][1], 2), round(w[i + 1][0] - w[i][1], 2)) for i in range(len(w) - 1) if w[i + 1][0] - w[i][1] >= 0.4]

    secs = []
    for s in range(int(np.ceil(dur))):
        sl = slice(s * FPS, (s + 1) * FPS)
        ws = [x for x in w if s <= x[0] < s + 1]
        secs.append({'t': s, 'motion': round(float(m[sl].mean()), 2), 'still_share': round(float((m[sl] < STILL).mean()), 2),
                     'cuts': sum(1 for c in cuts if s <= c < s + 1), 'loud_db': round(float(a[sl].mean()), 1),
                     'words': len(ws), 'text': ' '.join(x[2] for x in ws)})

    wpm = []
    for s in range(0, int(dur), 5):
        cnt = sum(1 for x in w if s <= x[0] < s + 5)
        wpm.append({'t': s, 'wpm': cnt * 12})
    speech_time = sum(b - a_ for a_, b, _ in w) if w else 0
    first_change = next((round(i / FPS, 1) for i in range(1, n) if m[i] >= STILL), None)

    res = {
        'video': os.path.basename(o['video']), 'window': [o['start'], o['start'] + dur], 'duration': round(dur, 1),
        'first_visual_change_s': first_change,
        'first_word_s': round(w[0][0], 2) if w else None,
        'words_total': len(w),
        'wpm_overall': round(len(w) / dur * 60) if w else 0,
        'wpm_by_5s': wpm,
        'word_gaps_ge_0.4s': gaps, 'longest_word_gap': max((g for _, g in gaps), default=0),
        'motion_mean': round(float(m.mean()), 2),
        'still_share': round(float((m < STILL).mean()), 2),
        'still_runs_ge_1s': still_runs, 'longest_still_s': max((r[1] for r in still_runs), default=0),
        'hard_cuts': len(cuts), 'cuts_per_min': round(len(cuts) / dur * 60, 1), 'cut_times': cuts,
        'avg_shot_s': round(dur / (len(cuts) + 1), 2),
        'silent_runs_ge_0.5s': silent_runs,
        'audio_db_first3s': round(float(a[:3 * FPS].mean()), 1), 'audio_db_last3s': round(float(a[-3 * FPS:].mean()), 1),
        'motion_first3s': round(float(m[:3 * FPS].mean()), 2), 'motion_last3s': round(float(m[-3 * FPS:].mean()), 2),
    }
    json.dump(res, open(os.path.join(o['out'], 'pulse.json'), 'w'), indent=1, ensure_ascii=False)
    with open(os.path.join(o['out'], 'seconds.csv'), 'w') as f:
        f.write('t,motion,still_share,cuts,loud_db,words,text\n')
        for r in secs:
            f.write(f"{r['t']},{r['motion']},{r['still_share']},{r['cuts']},{r['loud_db']},{r['words']},\"{r['text']}\"\n")
    sheet(o, dur)
    print(json.dumps({k: v for k, v in res.items() if k not in ('wpm_by_5s', 'cut_times', 'word_gaps_ge_0.4s')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
