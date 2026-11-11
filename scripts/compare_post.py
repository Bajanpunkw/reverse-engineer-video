"""Side-by-side post image for vertical videos: the original frame on the left, ours on the right, big ORIGINAL / MY CLONE bands.

python scripts/compare_post.py <orig.png> <ours.png> <out.jpg> <bold_font.ttf> ["caption under ORIGINAL"]

Pick two frames at the same phase of the story. Keep the original frame out of your own video; this image is
only for showing the comparison, with the channel credited in the caption.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

orig, ours, out, fontp = sys.argv[1:5]
caption = sys.argv[5] if len(sys.argv) > 5 else ''
FW, FH, BAND, GAP = 900, 1600, 190, 16
img = Image.new('RGB', (2 * FW + GAP, FH + BAND), '#111')
d = ImageDraw.Draw(img)
for k, (src, title, sub, bg) in enumerate([(orig, 'ORIGINAL', caption, '#ffffff'),
                                           (ours, 'MY CLONE', 'rebuilt in code with Claude · $0', '#FFD84D')]):
    x = k * (FW + GAP)
    d.rectangle([x, 0, x + FW, BAND], fill=bg)
    d.text((x + FW / 2, 72), title, font=ImageFont.truetype(fontp, 104), fill='#111', anchor='mm')
    d.text((x + FW / 2, 152), sub, font=ImageFont.truetype(fontp, 38), fill='#111', anchor='mm')
    img.paste(Image.open(src).convert('RGB').resize((FW, FH), Image.LANCZOS), (x, BAND))
img.save(out, quality=90)
print(out, img.size)
