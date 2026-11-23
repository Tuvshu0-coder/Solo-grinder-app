"""Draws the pixel-art night city behind the login/register pages (original art, generated, app palette).

Run from the project root:  python -P design/build-login-scene.py   (needs Pillow)
Writes public/scene/{city,clouds,stars,moon}.png at 1 art pixel = 1 image pixel,
and src/app/scene.css with their URLs (content-hashed, so browsers never show a stale drawing).
The CSS scales them by whole numbers only (3x desktop, 2x phone) with image-rendering: pixelated.
city, clouds and stars tile horizontally (stars in both directions), so the scene fits any screen width.
"""
import hashlib
import importlib.util
import pathlib
import random

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parent / "public" / "scene"

# the app's own palette tokens, from the same source as the style guide
spec = importlib.util.spec_from_file_location("sg", ROOT / "build-style-guide.py")
sg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sg)
C = sg.C


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


# locked palette: ONLY the team's five colours (#060b0c #40514e #919ca3 #cbd4db #fcfbfe).
# Far towers are lighter than the sky (night haze); mid towers share the sky colour, so they get an ink outline.
FIVE = {k: rgb(C[k]) for k in ("ink", "violet", "gray", "mint", "white")}
P = {k: FIVE[v] for k, v in {
    "sky": "violet",
    "cloud": "gray", "cloud_hi": "mint",
    "far": "gray", "far_win": "mint",
    "mid": "violet", "mid_win": "gray", "mid_edge": "ink",
    "near": "ink", "near_edge": "violet",
    "lit": "white", "lit_dim": "mint", "beacon": "white",
    "star": "white", "star_dim": "mint",
}.items()}

W = 384          # tile width shared by city and clouds
CITY_H = 100


def put(img, x, y, c):
    if 0 <= y < img.height:
        img.putpixel((x % img.width, y), P[c])  # x wraps so every layer tiles seamlessly


def rect(img, x, y, w, h, c):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            put(img, xx, yy, c)


def tower(img, rnd, x, w, top, body, win, lit_p, warm_p, roof=True, edge=None):
    """One building: body, window grid, optional rooftop gear and outline. Bottom always reaches the ground."""
    rect(img, x, top, w, CITY_H - top, body)
    if edge:
        rect(img, x, top, w, 1, edge)
        rect(img, x, top, 1, CITY_H - top, edge)
        rect(img, x + w - 1, top, 1, CITY_H - top, edge)
    style = rnd.choice(["grid", "rows", "cols"])
    for yy in range(top + 2, CITY_H - 1, 2):
        for xx in range(x + 1, x + w - 1):
            if style == "rows" and (xx - x) % 1 == 0:
                c = win
            elif style == "cols" and (xx - x) % 2 == 1:
                c = win
            elif style == "grid" and (xx - x) % 2 == 1:
                c = win
            else:
                continue
            r = rnd.random()
            if r < lit_p * warm_p:
                c = "lit" if rnd.random() < 0.7 else "lit_dim"
            elif r < lit_p:
                c = "lit_dim"
            put(img, xx, yy, c)
    gear = edge or body  # rooftop gear must read against the sky
    if roof and w >= 6:
        if rnd.random() < 0.45:  # antenna with an aviation light
            ax = x + rnd.randrange(2, w - 2)
            rect(img, ax, top - 5, 1, 5, gear)
            put(img, ax, top - 6, "beacon")
        elif rnd.random() < 0.5:  # stepped crown
            rect(img, x + 1, top - 2, w - 2, 2, gear)
            rect(img, x + 3, top - 3, max(1, w - 6), 1, gear)


def city():
    img = Image.new("RGBA", (W, CITY_H), (0, 0, 0, 0))
    rnd = random.Random(7)
    # far skyline: tall, thin, faint stripes
    x = 0
    while x < W:
        w = rnd.randrange(8, 18)
        tower(img, rnd, x, w, rnd.randrange(14, 46), "far", "far_win", 0.03, 0.5)
        x += w + rnd.randrange(-3, 3)
    # mid towers: the Tokyo high-rise band
    x = rnd.randrange(0, 10)
    while x < W:
        w = rnd.randrange(10, 24)
        tower(img, rnd, x, w, rnd.randrange(36, 64), "mid", "mid_win", 0.10, 0.6, edge="mid_edge")
        x += w + rnd.randrange(2, 14)
    # near low-rise blocks: darkest, densely lit, warm
    x = 0
    while x < W:
        w = rnd.randrange(12, 30)
        top = rnd.randrange(66, 84)
        tower(img, rnd, x, w, top, "near", "near_edge", 0.32, 0.75, roof=False)
        rect(img, x, top, w, 1, "near_edge")  # roof lip catches a little sky light
        x += w
    return img


def disk(img, cx, cy, r, c, floor):
    for y in range(cy - r, min(cy + r, floor) + 1):  # clipped at `floor`: cumulus have flat bottoms
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r:
                put(img, x, y, c)


CLOUDS_H = 64


def clouds():
    h = CLOUDS_H
    img = Image.new("RGBA", (W, h), (0, 0, 0, 0))
    rnd = random.Random(11)
    # cumulus: wide clusters of overlapping pixel disks with a flat base, then a 1px lit top edge
    for cx in range(30, W, 128):
        cx += rnd.randrange(-20, 20)
        base = rnd.randrange(22, 30)  # puffs float just over the skyline
        for _ in range(rnd.randrange(7, 11)):
            disk(img, cx + rnd.randrange(-34, 34), base - rnd.randrange(2, 14), rnd.randrange(6, 13), "cloud", base)
    for x in range(W):
        for y in range(1, h):
            if img.getpixel((x, y))[:3] == P["cloud"] and img.getpixel((x, y - 1))[3] == 0:
                put(img, x, y, "cloud_hi")
    return img


def stars():
    s = 256  # big tile so the repeat is hard to spot
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    rnd = random.Random(3)
    for _ in range(80):
        put(img, rnd.randrange(s), rnd.randrange(s), rnd.choice(["star", "star_dim", "star_dim"]))
    for _ in range(7):  # four-point twinkles, kept off the tile edge so they never split
        x, y = rnd.randrange(3, s - 3), rnd.randrange(3, s - 3)
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            put(img, x + dx, y + dy, "star" if (dx, dy) == (0, 0) else "star_dim")
        for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
            put(img, x + dx, y + dy, "star_dim")
    return img


def moon():
    img = Image.new("RGBA", (11, 11), (0, 0, 0, 0))
    for y in range(11):
        for x in range(11):
            inside = (x - 5) ** 2 + (y - 5) ** 2 <= 26
            bite = (x - 8) ** 2 + (y - 3) ** 2 <= 22
            if inside and not bite:
                img.putpixel((x, y), P["star"])
    return img


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    layers = {"city": city(), "clouds": clouds(), "stars": stars(), "moon": moon()}
    allowed = set(FIVE.values())
    css = ["/* GENERATED by design/build-login-scene.py — do not edit by hand. */", ":root {"]
    for name, img in layers.items():
        used = {px[:3] for px in img.getdata() if px[3]}
        assert used <= allowed, f"{name} uses a colour outside the five-colour palette"
        path = OUT / f"{name}.png"
        img.save(path, optimize=True)
        # content hash in the URL, so a redraw is never hidden behind a cached old image
        v = hashlib.sha1(path.read_bytes()).hexdigest()[:8]
        css.append(f'  --scene-{name}: url("/scene/{name}.png?v={v}");')
    css.append("}")
    (ROOT.parent / "src" / "app" / "scene.css").write_text("\n".join(css) + "\n", encoding="utf-8")
    # the ground row of the city must be solid, or the page shows through under the skyline
    assert all(layers["city"].getpixel((x, CITY_H - 1))[3] for x in range(W))
    print("wrote public/scene/*.png and src/app/scene.css")
