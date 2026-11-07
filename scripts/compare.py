"""Compare our frame with a frame of the original — the main tool for checking a style match.

python compare.py <orig.png> <ours.png> <out.jpg> [--box x0,y0,x1,y1] [--th 110] [--regions regions.json]

Our frame is resized to the original's size. Output image: original | ours | overlay (white = both,
red = original only, cyan = ours only). The mask is pixels brighter than --th (light text on a dark background);
for dark text on a light background pass a negative threshold, e.g. --th -140 = pixels darker than 140.
Prints: mask IoU, mean colour difference, palette difference (share of the original's 12 main colours).
--regions: {"name": [x0,y0,x1,y1]} — prints the bounding box of each element in both frames and the shift in px
(this is how an overlay gets matched to within a few pixels).
"""
import json, sys
import numpy as np
from PIL import Image


def mask(a, th):
    L = a.mean(2)
    return L > th if th >= 0 else L < -th


def bbox(m):
    ys, xs = np.where(m)
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None


def palette(a, k=12):
    q = (a.astype(np.uint8) >> 5).astype(np.int32)
    keys = (q[..., 0] << 6) | (q[..., 1] << 3) | q[..., 2]
    return np.bincount(keys.ravel(), minlength=512) / keys.size


def main():
    o, u, out = sys.argv[1:4]
    opt = dict(zip(sys.argv[4::2], sys.argv[5::2]))
    O = Image.open(o).convert('RGB'); U = Image.open(u).convert('RGB').resize(O.size)
    if '--box' in opt:
        box = tuple(int(v) for v in opt['--box'].split(',')); O, U = O.crop(box), U.crop(box)
    else:
        box = (0, 0) + O.size
    a, b = np.asarray(O).astype(float), np.asarray(U).astype(float)
    th = float(opt.get('--th', 110))
    mo, mu = mask(a, th), mask(b, th)
    iou = (mo & mu).sum() / max((mo | mu).sum(), 1)
    po, pu = palette(a), palette(b)
    top = np.argsort(po)[::-1][:12]
    print(f'mask IoU: {iou:.3f} | mean colour diff: {np.abs(a - b).mean():.1f}/255 | '
          f'palette diff (original top-12 colours): {np.abs(po[top] - pu[top]).sum():.3f} (0 = identical)')
    if '--regions' in opt:
        for k, (x0, y0, x1, y1) in json.load(open(opt['--regions'])).items():
            x0, y0, x1, y1 = x0 - box[0], y0 - box[1], x1 - box[0], y1 - box[1]
            ra, rb = bbox(mo[y0:y1, x0:x1]), bbox(mu[y0:y1, x0:x1])
            d = [rb[i] - ra[i] for i in range(4)] if ra and rb else None
            print(f'  {k:14} {"shift L{:+} T{:+} R{:+} B{:+} px".format(*d) if d else f"original {ra} / ours {rb}"}')
    ov = np.zeros(a.shape, np.uint8)
    ov[mo & ~mu] = (255, 60, 60); ov[mu & ~mo] = (60, 200, 255); ov[mo & mu] = (235, 235, 235)
    W, H = O.size
    horiz = W <= H  # vertical frames side by side, horizontal ones stacked
    sheet = Image.new('RGB', (W * 3, H) if horiz else (W, H * 3), 'black')
    for i, im in enumerate([O, U, Image.fromarray(ov)]):
        sheet.paste(im, (W * i, 0) if horiz else (0, H * i))
    sheet.save(out, quality=88)
    print('image:', out)


if __name__ == '__main__':
    main()
