# 產生 PWA 圖示：切割墊綠底＋白色海報紙＋洋紅標題條＋QR 小方塊＋CMYK 四色點
import os
from PIL import Image, ImageDraw
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
os.makedirs(out, exist_ok=True)

def draw(size, pad):
    s = 4 * size
    im = Image.new('RGB', (s, s), '#244A3E')
    d = ImageDraw.Draw(im)
    x0, x1 = pad * s, (1 - pad) * s
    w = x1 - x0
    px0, py0, px1, py1 = x0 + w * .2, x0 + w * .08, x1 - w * .2, x1 - w * .08
    d.rectangle([px0 + w * .025, py0 + w * .025, px1 + w * .025, py1 + w * .025], fill='#163128')
    d.rectangle([px0, py0, px1, py1], fill='#FFFFFF')
    pw = px1 - px0
    d.rectangle([px0, py0, px1, py0 + pw * .32], fill='#E4007F')
    d.rectangle([px0 + pw * .1, py0 + pw * .1, px0 + pw * .75, py0 + pw * .16], fill='#FFFFFF')
    d.rectangle([px0 + pw * .1, py0 + pw * .21, px0 + pw * .55, py0 + pw * .25], fill='#FFC6E3')
    for i, yy in enumerate((.45, .56, .67)):
        d.rectangle([px0 + pw * .1, py0 + pw * yy, px0 + pw * (.8 if i < 2 else .55), py0 + pw * yy + pw * .05], fill='#9AA39E')
    qx, qy, qs = px1 - pw * .38, py1 - pw * .38, pw * .28
    d.rectangle([qx, qy, qx + qs, qy + qs], fill='#1E1E1E')
    g = qs / 5
    for (i, j) in ((1, 1), (3, 1), (1, 3), (2, 2), (3, 3)):
        d.rectangle([qx + i * g, qy + j * g, qx + (i + 1) * g - 1, qy + (j + 1) * g - 1], fill='#FFFFFF')
    for k, c in enumerate(('#00A0D2', '#E4007F', '#FFD400', '#1E1E1E')):
        cx, cy, r = px0 + pw * (.14 + k * .13), py1 - pw * .14, pw * .05
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c, outline='#FFFFFF' if c == '#1E1E1E' else c)
    return im.resize((size, size), Image.LANCZOS)

draw(192, .04).save(os.path.join(out, 'icon-192.png'))
draw(512, .04).save(os.path.join(out, 'icon-512.png'))
draw(512, .16).save(os.path.join(out, 'icon-maskable-512.png'))
print('ok')
