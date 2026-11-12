"""Style auto-critic: blind "original | ours" pairs for a judge agent, then the verdict score.

python scripts/critic.py prep --orig <orig1.mp4> [<orig2.mp4> ...] --ours <ours.mp4 | frames/*.png> --out <dir> [--n 6] [--seed 1] [--hide x0,y0,x1,y1 ...]
python scripts/critic.py score <dir>

prep: grabs a frame every 0.5 s (ffmpeg, light), picks the --n most different frames of ours (different scenes),
and pairs each with the closest-looking original frame (luma layout + palette). Pairs are glued "A | B" in random
order (the key goes to key.json, never show it to the judge). Plus ref-sheet.jpg: 16 different original frames, so
the judge sees the style wider than one pair. Then a judge agent follows stages/critic.md and writes verdict.json.
score: checks the judge's blind answers against the key, averages the scores and prints PASS / FIX / STOP.
"""
import argparse, json, os, random, shutil, subprocess, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def _find_ffmpeg():
    root = Path(__file__).resolve().parents[1]
    for c in (os.environ.get('FFMPEG'), str(root / 'node_modules' / 'ffmpeg-static' / 'ffmpeg'), shutil.which('ffmpeg')):
        if c and os.path.exists(c):
            return c
    raise SystemExit('ffmpeg not found: run scripts/setup.sh or set FFMPEG=/path/to/ffmpeg')


FF = _find_ffmpeg()
AXES = ['palette', 'shapes', 'characters', 'typography', 'light', 'composition']
PASS_MEAN, PASS_MIN = 7.0, 5  # PASS: mean over all axes and the minimum of any axis
STOP_MEAN = 3.0  # below this the style isn't there (a wrong-style control scored 1.1) — rebuild the base, don't polish
# calibration: videos the author accepted scored 4.5–6.7; see stages/critic.md


def hide(im, boxes):
    """Paint over watermarks/handles (fractions of the frame x0,y0,x1,y1) with the surrounding colour,
    otherwise the judge spots our frame by the handle instead of the craft."""
    if not boxes:
        return im
    im = im.copy()
    a = np.asarray(im)
    d = ImageDraw.Draw(im)
    for x0, y0, x1, y1 in boxes:
        X0, Y0, X1, Y1 = int(x0 * im.width), int(y0 * im.height), int(x1 * im.width), int(y1 * im.height)
        ring = np.concatenate([a[max(Y0 - 4, 0):Y0 + 1, X0:X1].reshape(-1, 3), a[Y1:Y1 + 4, X0:X1].reshape(-1, 3)])
        d.rectangle([X0, Y0, X1, Y1], fill=tuple(int(c) for c in np.median(ring, axis=0)))
    return im


def frames(src, step=0.5, width=540):
    """Video → list of (label, PIL image). Images (png/jpg) are taken as they are."""
    p = Path(src)
    if p.suffix.lower() in ('.png', '.jpg', '.jpeg'):
        return [(p.name, Image.open(p).convert('RGB'))]
    d = tempfile.mkdtemp(prefix='critic_')
    subprocess.run([FF, '-v', 'error', '-i', str(p), '-vf', f'fps={1/step},scale={width}:-2', f'{d}/f_%05d.jpg'], check=True)
    out = []
    for i, f in enumerate(sorted(Path(d).glob('f_*.jpg'))):
        im = Image.open(f).convert('RGB')
        g = np.asarray(im.convert('L'), dtype=np.float32)
        if g.mean() < 3 or g.std() < 2:  # fades and flat frames prove nothing
            continue
        out.append((f'{p.stem}@{i*step:.1f}s', im))
    return out


def feat(im):
    """Frame feature: 12×20 luma layout + a coarse palette (4×4×4 histogram)."""
    g = np.asarray(im.convert('L').resize((12, 20)), dtype=np.float32).ravel() / 255
    a = np.asarray(im.resize((64, 64)), dtype=np.int32) // 64
    h = np.bincount((a[..., 0] * 16 + a[..., 1] * 4 + a[..., 2]).ravel(), minlength=64).astype(np.float32)
    h /= h.sum()
    return np.concatenate([g, h * 4])


def spread(items, n):
    """Greedily pick up to n frames that are as different from each other as possible (different scenes), no repeats."""
    if len(items) <= n:
        return list(range(len(items)))
    F = np.stack([feat(im) for _, im in items])
    ok = np.ones(len(items), bool)
    if len(items) - 4 >= n:  # skip the very first and last frames (fades) only if enough frames remain without them
        ok[:2] = ok[-2:] = False
    pick = [int(np.flatnonzero(ok)[ok.sum() // 3])]
    while len(pick) < n:
        d = np.min(np.linalg.norm(F[:, None] - F[pick][None], axis=2), axis=1)
        d[~ok] = -np.inf
        d[pick] = -np.inf
        if not np.isfinite(d.max()):  # out of candidates: fewer pairs, never duplicates
            break
        pick.append(int(d.argmax()))
    return sorted(pick)


def _font(size):
    for p in (os.environ.get('CRITIC_FONT'), '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
              '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        if p and os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def label(im, text):
    im = im.copy()
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 70, 60], fill=(255, 0, 255))
    d.text((16, 6), text, fill=(255, 255, 255), font=_font(44))
    return im


def pair(a, b, h=900):
    a = a.resize((round(a.width * h / a.height), h))
    b = b.resize((round(b.width * h / b.height), h))
    out = Image.new('RGB', (a.width + b.width + 20, h), (255, 0, 255))
    out.paste(label(a, 'A'), (0, 0))
    out.paste(label(b, 'B'), (a.width + 20, 0))
    return out


def sheet(ims, cols=4, h=480):
    ims = [im.resize((round(im.width * h / im.height), h)) for im in ims]
    w = max(im.width for im in ims)
    rows = (len(ims) + cols - 1) // cols
    out = Image.new('RGB', (w * cols, h * rows), (40, 40, 40))
    for i, im in enumerate(ims):
        out.paste(im, ((i % cols) * w, (i // cols) * h))
    return out


def prep(a):
    rnd = random.Random(a.seed)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    boxes = [tuple(map(float, b.split(','))) for b in (a.hide or [])]
    orig = [(n, hide(im, boxes)) for s in a.orig for n, im in frames(s)]
    ours = [(n, hide(im, boxes)) for s in a.ours for n, im in frames(s)]
    OF = np.stack([feat(im) for _, im in orig])
    key, used = [], set()
    for k, i in enumerate(spread(ours, a.n), 1):
        name, im = ours[i]
        dist = np.linalg.norm(OF - feat(im), axis=1)
        # give each pair its own original frame while unused ones remain
        j = next((int(x) for x in np.argsort(dist) if int(x) not in used), int(dist.argmin()))
        used.add(j)
        ours_left = rnd.random() < 0.5
        A, B = (im, orig[j][1]) if ours_left else (orig[j][1], im)
        pair(A, B).save(out / f'pair-{k}.jpg', quality=88)
        key.append({'pair': k, 'ours': 'A' if ours_left else 'B', 'ours_frame': name, 'orig_frame': orig[j][0]})
    ref = [orig[i][1] for i in spread(orig, 16)]
    sheet(ref).save(out / 'ref-sheet.jpg', quality=85)
    (out / 'key.json').write_text(json.dumps(key, indent=1))
    print(f'{len(key)} pairs → {out}/pair-*.jpg, ref-sheet.jpg; key in key.json (never show it to the judge)')


def score(a):
    d = Path(a.out)
    key = {k['pair']: k for k in json.loads((d / 'key.json').read_text())}
    v = json.loads((d / 'verdict.json').read_text())
    caught, rows = 0, []
    for p in v['pairs']:
        k = key[p['pair']]
        guessed_ours = 'B' if p['original'] == 'A' else 'A'
        hit = guessed_ours == k['ours']
        caught += hit
        rows.append((p['pair'], k['ours_frame'], hit, p.get('confidence'), p['scores'], p.get('readable')))
    allv = [s for r in rows for s in r[4].values()]
    axis = {ax: np.mean([r[4][ax] for r in rows]) for ax in AXES}
    mean, worst = float(np.mean(allv)), min(axis, key=axis.get)
    print(f'Blind test: the judge spotted our frame in {caught}/{len(rows)} pairs')
    for pr, name, hit, conf, sc, rd in rows:
        print(f'  pair {pr} ({name}): {"spotted" if hit else "fooled"}, confidence {conf}; '
              + ' '.join(f'{k}={sc[k]}' for k in AXES) + (f'; readable: {rd}' if rd else ''))
    print('Per axis: ' + ', '.join(f'{k} {axis[k]:.1f}' for k in AXES))
    ok = mean >= PASS_MEAN and axis[worst] >= PASS_MIN and all(r[5] in (None, 'yes') for r in rows)
    level = 'PASS' if ok else ('STOP — the style is not there; change the base (characters/render/palette), not details'
                               if mean < STOP_MEAN else 'FIX')
    unread = [r[0] for r in rows if r[5] == 'no']
    print(f'Mean {mean:.1f}, worst axis {worst} {axis[worst]:.1f}' + (f'; unreadable pairs {unread}' if unread else '') + f' → {level}')
    for f in v.get('fixes', [])[:5]:
        print(f'  - {f}')
    (d / 'score.json').write_text(json.dumps({'mean': mean, 'axis': axis, 'blind_caught': caught,
                                              'pairs': len(rows), 'pass': ok, 'level': level.split()[0]}, indent=1))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['prep', 'score'])
    ap.add_argument('out_pos', nargs='?')
    ap.add_argument('--orig', nargs='+')
    ap.add_argument('--ours', nargs='+')
    ap.add_argument('--out')
    ap.add_argument('--n', type=int, default=6)
    ap.add_argument('--hide', nargs='*', help='watermark zones as frame fractions x0,y0,x1,y1 (applied to both frames)')
    ap.add_argument('--seed', type=int, default=1)
    a = ap.parse_args()
    a.out = a.out or a.out_pos
    prep(a) if a.cmd == 'prep' else score(a)
