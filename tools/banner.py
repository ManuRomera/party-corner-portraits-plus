#!/usr/bin/env python3
"""Banner al estilo de la casa (título Cinzel Decorative sobre captura real + logo MR). Uso:
python3 tools/banner.py spec.json   (spec: src, out, size, focus, kicker, title[], subtitle, tagline, logo(bool), accent)"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
F = Path(__file__).resolve().parent / "fonts"; BRAND = Path(__file__).resolve().parent.parent / "brand"
GOLD, BONE = (202, 166, 107), (245, 236, 215)
font = lambda n, s: ImageFont.truetype(str(F / n), s)
def tracked(d, xy, text, f, fill, tr=0):
    x, y = xy
    for ch in text: d.text((x, y), ch, font=f, fill=fill); x += d.textlength(ch, font=f) + tr
    return x
def width(d, text, f, tr): return sum(d.textlength(c, font=f) + tr for c in text)
def make(spec):
    W, H = spec["size"]; src = Image.open(spec["src"]).convert("RGB"); s = max(W / src.width, H / src.height)
    im = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS); top = int((im.height - H) * spec.get("focus", .8)); im = im.crop((0, top, W, top + H))
    g = Image.new("L", (W, H)); px = g.load(); k = spec.get("veil", .78)
    for x in range(W):
        a = int(235 * max(0.0, 1 - x / (W * k)) ** 1.25)
        for y in range(H): px[x, y] = a
    im = Image.composite(Image.new("RGB", (W, H), (11, 10, 16)), im, g); d = ImageDraw.Draw(im)
    p = int(W * .045); y = int(H * .12); acc = tuple(spec.get("accent", (154, 63, 88)))
    tracked(d, (p, y), spec["kicker"].upper(), font("EBGaramond-Bold.ttf", int(H * .034)), GOLD, int(H * .006)); y += int(H * .10)
    size = int(H * .175); maxw = W * .47
    while max(width(d, t, font("CinzelDecorative-Black.ttf", size), size * .03) for t in spec["title"]) > maxw: size -= 2
    for t in spec["title"]: tracked(d, (p, y), t, font("CinzelDecorative-Black.ttf", size), BONE, size * .03); y += int(size * 1.08)
    y += int(H * .02); d.rectangle((p, y, p + int(W * .08), y + 3), fill=acc); y += int(H * .045)
    d.text((p, y), spec["subtitle"], font=font("CinzelDecorative-Bold.ttf", int(H * .052)), fill=GOLD); y += int(H * .09)
    for line in spec["tagline"]: d.text((p, y), line, font=font("EBGaramond-Regular.ttf", int(H * .037)), fill=(222, 212, 190)); y += int(H * .06)
    im = im.convert("RGBA")
    if spec.get("logo", True):
        lg = Image.open(BRAND / "MR_11_Formal_Marfil_Transparente.png").convert("RGBA"); lw = int(W * .15)
        lg = lg.resize((lw, int(lw * lg.height / lg.width)), Image.LANCZOS); im.alpha_composite(lg, (W - lw - int(W * .035), int(H * .07)))
    out = Path(spec["out"]); im = im.convert("RGB")
    im.save(out, "WEBP", quality=88, method=6) if out.suffix == ".webp" else im.save(out); print(out, im.size)
if __name__ == "__main__":
    for spec in json.load(open(sys.argv[1])): make(spec)
