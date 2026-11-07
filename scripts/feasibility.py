"""Step 0: can this video be redrawn in code? Numeric hints + a frame sheet for your eyes.

python feasibility.py <video.mp4> <outdir> [--start S] [--end E]

Takes one frame per second (up to 40) and measures on each:
  flat    — share of 8×8 blocks that are a flat fill (luma σ < 1.5). Flat 2D animation: high.
  grain   — sensor grain on calm areas (median |frame − blur|). Camera footage: higher.
  texture — share of blocks with fine texture (σ > 12). Photos, games with pixel textures: high.
  colors  — how many colours (4 bits/channel) cover 90% of pixels. Vector art: few.
Writes outdir/feasibility.json and outdir/sheet.jpg (one frame per second, labelled).
The numbers are only a hint; the verdict comes from looking at the sheet (stages/0-feasibility.md).
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

def _find_ffmpeg():
    import shutil
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    for c in (os.environ.get("FFMPEG"), str(root / "node_modules" / "ffmpeg-static" / "ffmpeg"), shutil.which("ffmpeg")):
        if c and os.path.exists(c):
            return c
    raise SystemExit("ffmpeg not found: run scripts/setup.sh or set FFMPEG=/path/to/ffmpeg")


FF = _find_ffmpeg()


def frames(video, start, end, h=360):
    args = [FF, '-loglevel', 'error']
    if start: args += ['-ss', str(start)]
    args += ['-i', video]
    if end: args += ['-t', str(end - (start or 0))]
    args += ['-vf', f'fps=1,scale=-2:{h}', '-frames:v', '40', '-f', 'image2pipe', '-c:v', 'png', '-']
    raw = subprocess.run(args, capture_output=True, check=True).stdout
    out, i = [], 0
    sig = b'\x89PNG'
    parts = raw.split(sig)[1:]
    import io
    return [Image.open(io.BytesIO(sig + p)).convert('RGB') for p in parts]


def blocks(L, n=8):
    H, W = (L.shape[0] // n) * n, (L.shape[1] // n) * n
    return L[:H, :W].reshape(H // n, n, W // n, n).std(axis=(1, 3))


def measure(img):
    a = np.asarray(img).astype(np.float32)
    L = a.mean(2)
    s = blocks(L)
    # 3×3 box blur without scipy
    p = np.pad(L, 1, mode='edge')
    blur = sum(p[dy:dy + L.shape[0], dx:dx + L.shape[1]] for dy in range(3) for dx in range(3)) / 9
    res = np.abs(L - blur)
    calm = np.repeat(np.repeat(s < 4, 8, 0), 8, 1)
    calm = np.pad(calm, ((0, L.shape[0] - calm.shape[0]), (0, L.shape[1] - calm.shape[1])))
    grain = float(np.median(res[calm])) if calm.sum() > 500 else float('nan')
    q = (a.astype(np.uint8) >> 4).astype(np.int32)
    keys = (q[..., 0] << 8) | (q[..., 1] << 4) | q[..., 2]
    cnt = np.sort(np.bincount(keys.ravel(), minlength=4096))[::-1]
    colors = int(np.searchsorted(np.cumsum(cnt), 0.9 * cnt.sum()) + 1)
    return {'flat': float((s < 1.5).mean()), 'grain': grain, 'texture': float((s > 12).mean()), 'colors': colors}


def hint(m):
    if m['texture'] > 0.30 and m['flat'] < 0.25:
        return 'red?', 'lots of fine texture, few flat fills: looks like camera footage, photos or a textured game'
    if m['flat'] > 0.45 and m['colors'] < 60:
        return 'green-2d?', 'flat fills and a small palette: looks like flat 2D graphics'
    if m['grain'] < 0.8 and m['texture'] < 0.30:
        return 'green-3d?', 'little grain and fine texture: looks like stylized 3D or motion graphics'
    return 'yellow?', 'mixed signals: decide from the frame sheet'


def main():
    video, outdir = sys.argv[1], sys.argv[2]
    opt = dict(zip(sys.argv[3::2], sys.argv[4::2]))
    start, end = float(opt.get('--start', 0)), float(opt.get('--end', 0)) or None
    os.makedirs(outdir, exist_ok=True)
    fr = frames(video, start, end)
    ms = [measure(f) for f in fr]
    med = {k: float(np.nanmedian([m[k] for m in ms])) for k in ms[0]}
    v, why = hint(med)
    res = {'video': video, 'frames': len(fr), 'median': med, 'hint': v, 'why': why}
    json.dump(res | {'per_frame': ms}, open(os.path.join(outdir, 'feasibility.json'), 'w'), indent=1)
    # frame sheet, 8 per row
    w, h = fr[0].size; s = 240 / h; tw, th = int(w * s), 240
    cols = 8; rows = (len(fr) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * th), 'black'); d = ImageDraw.Draw(sheet)
    for i, f in enumerate(fr):
        x, y = (i % cols) * tw, (i // cols) * th
        sheet.paste(f.resize((tw, th)), (x, y)); d.text((x + 4, y + 4), f'{start + i:.0f}s', fill='yellow')
    sheet.save(os.path.join(outdir, 'sheet.jpg'), quality=85)
    print(f"{os.path.basename(video)}: flat {med['flat']:.2f}  grain {med['grain']:.2f}  texture {med['texture']:.2f}  colors {med['colors']:.0f}  → {v} ({why})")


if __name__ == '__main__':
    main()
