"""Contact sheet from control frames: python sheet.py <dir> [cols=6] → <dir>/sheet.jpg (frames f<t>.jpg, sorted by time, labelled)."""
import glob, os, re, sys
from PIL import Image, ImageDraw

d = sys.argv[1]; cols = int(sys.argv[2]) if len(sys.argv) > 2 else 6
fs = sorted(glob.glob(os.path.join(d, 'f*.jpg')), key=lambda p: float(re.findall(r'f([\d.]+)\.jpg$', p)[0]))
if not fs: sys.exit('no f<t>.jpg frames in ' + d)
im0 = Image.open(fs[0]); w = 270 if im0.width < im0.height else 480; h = int(w * im0.height / im0.width)
C = min(cols, len(fs)); R = (len(fs) + C - 1) // C
S = Image.new('RGB', (C * w, R * h)); dr = ImageDraw.Draw(S)
for k, p in enumerate(fs):
    x, y = k % C * w, k // C * h
    S.paste(Image.open(p).resize((w, h)), (x, y)); dr.text((x + 6, y + 6), re.findall(r'f([\d.]+)\.jpg$', p)[0] + ' s', fill='yellow')
S.save(os.path.join(d, 'sheet.jpg'), quality=88); print(os.path.join(d, 'sheet.jpg'), len(fs), 'frames')
