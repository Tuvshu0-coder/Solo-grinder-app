"""Builds design/style-guide.html — self-contained preview of the Solo Grinding pixel UI (v3).

Run from the project root:  python -P design/build-style-guide.py
Font (Departure Mono, OFL) is embedded as base64 so the file opens straight from disk.
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
FONT = ROOT / "fonts" / "DepartureMono-Regular.woff2"

# ---------------------------------------------------------------- palette
# Main palette chosen by the team (weight: white > mint > violet), plus a few functional colors.
UI = [
    ("white", "#ffffff", "MAIN — page background, cards"),
    ("mint", "#f0f9e8", "SECOND — secondary surfaces, slots, tracks"),
    ("violet", "#7f7091", "THIRD — primary buttons, active, progress, done"),
    ("ink", "#413436", "Text and pixel outlines"),
    ("gray", "#a9a4aa", "Disabled, dithering, muted icons"),
    ("line", "#d7d6d6", "Dividers, card shadows, ground shadow"),
    ("peach", "#ebb18c", "Warm accent: store, skin"),
    # functional additions (kept few)
    ("ink-2", "#6e6468", "Secondary text (readable on white)"),
    ("violet-dark", "#5e5270", "Button edge, pressed, trousers shade"),
    ("violet-light", "#e6e1ec", "Selected rows, hover, active chips"),
    ("mint-dark", "#d5e6cb", "Inner shade on mint (slots, inputs)"),
    ("peach-dark", "#c98d6b", "Peach shading, coin rim, skin shade"),
    ("butter", "#f2cc6b", "Coins, warnings (cap, <24h)"),
    ("rose", "#c9636b", "Late, danger, errors"),
]
C = {k: v for k, v, _ in UI}

# Character ramps (sprite-only). Hair: base, shade, highlight. Skin: base, shade.
SKINS = [("#fce1cc", "#ebb18c"), ("#ebb18c", "#c98d6b"), ("#b97a55", "#8a5638"), ("#6e4630", "#4a2e20")]
HAIRS = [("#574a50", "#413436", "#7f7091"),   # ink with violet sheen
         ("#8a5a40", "#5c3a28", "#b5835e"),   # brown
         ("#f2d38a", "#c9a456", "#fff4cf"),   # blonde
         ("#d7d6d6", "#a9a4aa", "#ffffff")]   # silver
HAIR_NAMES = ["ink", "brown", "blonde", "silver"]
RANKS = [("E", C["gray"], C["ink"]), ("D", C["mint"], C["ink"]), ("C", C["peach"], C["ink"]),
         ("B", C["violet"], C["white"]), ("A", C["butter"], C["ink"]), ("S", C["ink"], C["butter"])]


# ---------------------------------------------------------------- pixel helpers
def runs_svg(grid, pal, w, h, scale=None, cls="", extra_attrs=""):
    rects = []
    for y, row in enumerate(grid):
        x = 0
        while x < len(row):
            ch = row[x]
            if ch not in pal:
                x += 1
                continue
            n = 1
            while x + n < len(row) and row[x + n] == ch:
                n += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{n}" height="1" fill="{pal[ch]}"/>')
            x += n
    size = f'width="{w*scale}" height="{h*scale}" ' if scale else f'width="{w}" height="{h}" '
    return (f'<svg xmlns="http://www.w3.org/2000/svg" {size}viewBox="0 0 {w} {h}" shape-rendering="crispEdges" '
            f'class="{cls}" {extra_attrs}>{"".join(rects)}</svg>')


def uri(svg):
    return "data:image/svg+xml," + svg.replace("#", "%23").replace("<", "%3C").replace(">", "%3E").replace('"', "'")


def _inside(x, y, n, cut, inset=0):
    lo, hi = inset, n - 1 - inset
    if not (lo <= x <= hi and lo <= y <= hi):
        return False
    return min(x - lo, hi - x) + min(y - lo, hi - y) >= cut


N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


def nine(fill, outline=C["ink"], edge=None, edge_top=False, n=8, cut=2):
    """n x n frame, 1px outline, stepped corners. slice = (n-2)//2. Optional 2-row inner edge."""
    grid = []
    for y in range(n):
        row = ""
        for x in range(n):
            if not _inside(x, y, n, cut):
                row += "."
            elif not all(_inside(x + dx, y + dy, n, cut) for dx, dy in N4):
                row += "o"
            elif edge and ((not edge_top and y >= n - 3) or (edge_top and y <= 2)):
                row += "e"
            else:
                row += "f"
        grid.append(row)
    return uri(runs_svg(grid, {"o": outline, "f": fill, "e": edge or fill}, n, n))


def nine_double(fill, gap=C["white"], outline=C["ink"], n=10):
    """Handheld-style dialog frame: outer ink ring, white gap, inner ink ring. slice 4."""
    grid = []
    for y in range(n):
        row = ""
        for x in range(n):
            if not _inside(x, y, n, 2):
                row += "."
            elif not all(_inside(x + dx, y + dy, n, 2) for dx, dy in N4):
                row += "o"
            elif not _inside(x, y, n, 1, inset=2):
                row += "g"
            elif not all(_inside(x + dx, y + dy, n, 1, inset=2) for dx, dy in N4):
                row += "o"
            else:
                row += "f"
        grid.append(row)
    return uri(runs_svg(grid, {"o": outline, "g": gap, "f": fill}, n, n))


def stripes(base, line, period=8):
    grid = ["".join("l" if (x + y) % period in (0, 1) else "b" for x in range(period)) for y in range(period)]
    return uri(runs_svg(grid, {"l": line, "b": base}, period, period)), period * 2


DOTS = uri(runs_svg(["d" + "." * 11] + ["." * 12] * 11, {"d": C["mint-dark"]}, 12, 12))
CURSOR = ["#...", "##..", "###.", "####", "###.", "##..", "#..."]


# ---------------------------------------------------------------- sprites
def make_coin():
    spans = [(4, 7), (2, 9), (1, 10), (1, 10), (0, 11), (0, 11), (0, 11), (0, 11), (1, 10), (1, 10), (2, 9), (4, 7)]
    inside = lambda x, y: 0 <= y < 12 and spans[y][0] <= x <= spans[y][1]
    rows = []
    for y in range(12):
        row = ""
        for x in range(12):
            if not inside(x, y):
                row += "."
            elif not all(inside(x + dx, y + dy) for dx, dy in N4):
                row += "o"
            elif x + y in (9, 10) and 2 <= y <= 8:
                row += "w"
            elif x + y >= 16:
                row += "s"
            else:
                row += "g"
        rows.append(row)
    return rows


COIN = make_coin()
COIN_PAL = {"o": C["ink"], "g": C["butter"], "s": C["peach-dark"], "w": C["white"]}
CHECK = ["......#", ".....##", "#...##.", "##.##..", ".###...", "..#...."]
ARROW = ["#####", ".###.", "..#.."]

# 48x48 starter, hand-placed. Legend:
# O ink | H/h/j hair base/shade/highlight | S/s skin | E eye ink | I iris (violet) | Y eye shine
# W/w/v hoodie white / light / deep (checker dither on the hem) | R peach (aglets, soles)
# P/p trousers violet / violet-dark | M/m sneaker mint / shade
HERO = [
    ".......................O........................",
    "......................OHO.....O.................",
    "................O....OHHO....OHO................",
    "...............OHO..OHjHHO..OHHO...OO...........",
    "..............OOHHOOHjjjHHOOHjjHOOOHHO..........",
    "............OOHHHHjjjHHHHHHHjjHHHHHhO...........",
    "...........OHHHHjjjHHHHHHHHHHHHHHHhO............",
    "............OOHHjjHHHHHHHHHHHHHHHHhO............",
    ".............OOHHHHHHHHHHHHHHHHHHhO.............",
    "............OHHHHHHHHHHHHHHHHHHHHhO.............",
    ".............OOOHHHHHHhSHHhSSSHHhSO.............",
    "................OHHHHHhSShSSShhhSSO.............",
    ".................OHHHHhEESSEEEEESSO.............",
    "..................OHHHhIESSSYIIESSSO............",
    "...................OHHhsSSSSSSsSSsO.............",
    "....................OhhSSSSSssSsOO..............",
    ".....................OOOSSSSSSsO................",
    "...................OOOOOOssssOOOO...............",
    "..................OwwwwwOssssOwwwO..............",
    "...............OOOwwvvvvvvvvvvvvwwO.............",
    "..............OwwOWWWWWWvWWvWWwOWWO.............",
    ".............OwwvOWWWWWWvWWvWWwOWWwO...OOO......",
    ".............OwwvOWWWWWWvWWvWWwOWWWwOOOSSsO.....",
    ".............OwwvOWWWWWWRWWRWWwOWWWWWOSSSSsO....",
    ".............OwwvOWWWWWWWWWWWWwOWWWWwOsssSsO....",
    ".............OwwvOWWWWWWWWWWWWwOwWwwwOSSSSsO....",
    ".............OwwvOWWWvvvvvvvvWwOwwwwOOOsssO.....",
    "..............OwvOWWvWWWWWWWWvWWwOOO...OOO......",
    "...............OvOWWvWWWWWWWWvWWwO..............",
    "................OOWWvWWWWWWWWvWWwO..............",
    ".................OWWWWWWWWWWWWwWwO..............",
    ".................OwWwWwWwWwWwWwWwO..............",
    ".................OOOOOOOOOOOOOOOOO..............",
    ".................OppppppOPPPPPPpO...............",
    ".................OppppppOPPPPPPpO...............",
    ".................OpppppOOPPPPPPpO...............",
    ".................OpppppOOPPPPPPpO...............",
    ".................OpppppO.OPPPPPPpO..............",
    ".................OpppppO.OPPPPPPpO..............",
    ".................OpppppO.OPPPPPPpO..............",
    ".................OOOOOOO.OOOOOOOOO..............",
    "................OMMMMMmO.OMMMMMMMmOO............",
    "...............OMMMMMMMmOOMMMMMMMMMmO...........",
    "...............ORRRRRRRROOMMMMMMMMMMmO..........",
    "................OOOOOOOO.ORRRRRRRRRRRO..........",
    "..........................OOOOOOOOOOO...........",
    "................................................",
    "................................................",
]
HERO = [r[2:] + ".." for r in HERO]   # nudge 2px left so the figure sits centred
assert len(HERO) == 48 and all(len(r) == 48 for r in HERO)
SHADOW = ["." * 14 + "x" * 22 + "." * 12, "." * 11 + "x" * 28 + "." * 9, "." * 14 + "x" * 22 + "." * 12]


def hero_palette(skin, hair):
    return {
        "O": C["ink"], "E": C["ink"], "I": C["violet"], "Y": C["white"],
        "S": skin[0], "s": skin[1], "H": hair[0], "h": hair[1], "j": hair[2],
        "W": C["white"], "w": C["line"], "v": C["gray"], "R": C["peach"],
        "P": C["violet"], "p": C["violet-dark"], "M": C["mint"], "m": C["gray"],
    }


def hero_block(skin, hair, scale, label=""):
    sprite = runs_svg(HERO, hero_palette(skin, hair), 48, 48, scale, cls="char-sprite")
    shadow = runs_svg(SHADOW, {"x": C["line"]}, 48, 3, scale, cls="char-shadow", extra_attrs=f'style="top:{44*scale}px"')
    cap = f"<figcaption>{label}</figcaption>" if label else ""
    return f'<figure class="char" style="width:{48*scale}px;--px-step:{scale}px">{shadow}{sprite}{cap}</figure>'


# ---------------------------------------------------------------- page
def swatch(name, hex_, role, main=False):
    return (f'<div class="sw{" main" if main else ""}"><div class="sw-chip" style="background:{hex_}"></div>'
            f'<div><div class="sw-name">--{name}</div><div class="sw-hex">{hex_}</div><div class="sw-role">{role}</div></div></div>')


def main():
    font_b64 = base64.b64encode(FONT.read_bytes()).decode()
    st_store, stw = stripes(C["white"], C["peach"])
    st_guild, _ = stripes(C["white"], C["violet-light"])
    frames = {
        "panel": nine(C["white"]), "panel-mint": nine(C["mint"]), "panel-violet": nine(C["violet-light"]),
        "dialog": nine_double(C["white"]), "dialog-mint": nine_double(C["mint"]),
        "banner": nine(C["violet"]),
        "btn": nine(C["violet"], edge=C["violet-dark"]), "btn-on": nine(C["violet"], edge=C["violet-dark"], edge_top=True),
        "btn-sec": nine(C["white"], edge=C["line"]), "btn-buy": nine(C["peach"], edge=C["peach-dark"]),
        "btn-danger": nine(C["rose"], edge=C["ink"]), "btn-off": nine(C["line"], outline=C["gray"], edge=C["line"]),
        "input": nine(C["white"], edge=C["mint"], edge_top=True),
        "input-focus": nine(C["white"], outline=C["violet"], edge=C["mint"], edge_top=True),
        "slot": nine(C["mint"], edge=C["mint-dark"], edge_top=True), "slot-locked": nine(C["white"], outline=C["gray"]),
        "badge": nine(C["white"], n=6, cut=1), "badge-rose": nine(C["rose"], n=6, cut=1),
        "badge-violet": nine(C["violet"], n=6, cut=1), "badge-butter": nine(C["butter"], n=6, cut=1),
        "badge-mint": nine(C["mint"], n=6, cut=1), "badge-vl": nine(C["violet-light"], n=6, cut=1),
        "track": nine(C["mint"], n=6, cut=1),
        "frame-store": nine(C["white"]), "frame-guild": nine(C["white"]),
        **{f"rank-{r}": nine(fill) for r, fill, _ in RANKS},
    }
    frame_css = "\n".join(f".f-{k} {{ border-image-source: url(\"{v}\"); }}" for k, v in frames.items())
    frame_css += (f"\n.f-btn:active {{ border-image-source: url(\"{frames['btn-on']}\"); }}"
                  f"\n.f-input:focus {{ border-image-source: url(\"{frames['input-focus']}\"); }}")

    coin = runs_svg(COIN, COIN_PAL, 12, 12, 2, cls="sprite")
    coin_big = runs_svg(COIN, COIN_PAL, 12, 12, 8, cls="sprite")
    check = runs_svg(CHECK, {"#": C["white"]}, 7, 6, 2, cls="sprite")
    cursor = runs_svg(CURSOR, {"#": C["violet"]}, 4, 7, 4, cls="sprite cursor")
    ui_sw = "".join(swatch(n, h, r, i < 7) for i, (n, h, r) in enumerate(UI))
    ranks = "".join(f'<div class="rank nine9 f-rank-{r}" style="color:{fg}">{r}</div>' for r, _, fg in RANKS)
    hero_big = hero_block(SKINS[1], HAIRS[0], 6)
    hero_card = hero_block(SKINS[1], HAIRS[0], 4)
    variants = "".join(hero_block(SKINS[i], HAIRS[i], 3, f"skin {i+1} · {HAIR_NAMES[i]}") for i in range(4))

    html = TEMPLATE
    subs = {
        "__FONT__": font_b64, "__FRAMES__": frame_css, "__COIN__": coin, "__COIN_BIG__": coin_big, "__CHECK__": check,
        "__CURSOR__": cursor, "__ARROW__": uri(runs_svg(ARROW, {"#": C["ink"]}, 5, 3)), "__DOTS__": DOTS,
        "__ST_STORE__": st_store, "__ST_GUILD__": st_guild, "__STW__": str(stw),
        "__UI_SWATCHES__": ui_sw, "__RANKS__": ranks,
        "__HERO_BIG__": hero_big, "__HERO_CARD__": hero_card, "__VARIANTS__": variants,
        **{f"__{k.upper().replace('-', '_')}__": v for k, v in C.items()},
    }
    for k in sorted(subs, key=len, reverse=True):   # longest keys first (e.g. __VIOLET_DARK__ before __VIOLET__)
        html = html.replace(k, subs[k])
    out = ROOT / "style-guide.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out} ({len(html)//1024} KB)")


TEMPLATE = r"""<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Solo Grinding — Pixel Style Guide v3</title>
<style>
@font-face { font-family: "Departure Mono"; src: url(data:font/woff2;base64,__FONT__) format("woff2"); font-display: block; }
:root {
  --white:__WHITE__; --mint:__MINT__; --violet:__VIOLET__; --ink:__INK__; --gray:__GRAY__; --line:__LINE__; --peach:__PEACH__;
  --ink-2:__INK_2__; --violet-dark:__VIOLET_DARK__; --violet-light:__VIOLET_LIGHT__; --mint-dark:__MINT_DARK__;
  --peach-dark:__PEACH_DARK__; --butter:__BUTTER__; --rose:__ROSE__;
  --notch-1: polygon(2px 0,calc(100% - 2px) 0,calc(100% - 2px) 2px,100% 2px,100% calc(100% - 2px),calc(100% - 2px) calc(100% - 2px),calc(100% - 2px) 100%,2px 100%,2px calc(100% - 2px),0 calc(100% - 2px),0 2px,2px 2px);
}
* { box-sizing: border-box; }
html { background: var(--white); }
body { margin: 0; color: var(--ink); font-family: "Departure Mono", monospace; font-size: 22px; line-height: 33px;
  background: var(--white) url("__DOTS__"); background-size: 24px 24px; -webkit-font-smoothing: none; }
.wrap { max-width: 1240px; margin: 0 auto; padding: 28px 16px 80px; }
h2 { display: flex; align-items: center; gap: 14px; font-size: 33px; line-height: 44px; font-weight: normal; margin: 56px 0 6px; }
h3 { font-size: 22px; font-weight: normal; margin: 0 0 8px; color: var(--violet); }
.rule { height: 2px; margin: 4px 0 24px; background: repeating-linear-gradient(90deg, var(--line) 0 6px, transparent 6px 10px); }
p.note { color: var(--ink-2); margin: 0 0 16px; }
.grid { display: grid; gap: 28px; } .g2 { grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); } .g3 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.row { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
svg { display: inline-block; vertical-align: middle; image-rendering: pixelated; }

.nine9 { border: 6px solid transparent; border-image-slice: 3 fill; border-image-width: 6px; border-image-repeat: stretch; image-rendering: pixelated; }
.nine6 { border: 4px solid transparent; border-image-slice: 2 fill; border-image-width: 4px; border-image-repeat: stretch; image-rendering: pixelated; }
.nine10 { border: 8px solid transparent; border-image-slice: 4 fill; border-image-width: 8px; border-image-repeat: stretch; image-rendering: pixelated; }
.frame.nine9 { border-image-slice: 3; }
__FRAMES__

/* nav */
.nav { display: flex; align-items: center; gap: 4px; background: var(--white); padding: 0 16px; box-shadow: 0 2px 0 var(--ink); position: relative; }
.nav a { color: var(--ink-2); text-decoration: none; padding: 10px 14px; }
.nav a.on { color: var(--ink); box-shadow: inset 0 -6px 0 var(--violet); }
.nav .brand { padding-right: 18px; } .nav .brand b { color: var(--violet); font-weight: normal; }
.nav .coins { margin-left: auto; }

/* banner */
.banner { max-width: 760px; margin: 8px auto 30px; padding: 4px 20px; text-align: center; color: var(--white); letter-spacing: 2px; text-transform: uppercase; }

/* panels */
.panel { padding: 14px 18px; filter: drop-shadow(4px 4px 0 var(--line)); }
.panel .head { margin: -18px -22px 14px; padding: 6px 22px 4px; background: var(--violet); color: var(--white); clip-path: var(--notch-1); }
.panel .head.mint { background: var(--mint); color: var(--ink); box-shadow: inset 0 -2px 0 var(--ink); }
.dialog { padding: 12px 18px; }
.frame { padding: 18px; filter: drop-shadow(4px 4px 0 var(--line)); }
.frame.store { background: url("__ST_STORE__") 0 0 / __STW__px __STW__px padding-box; }
.frame.guild { background: url("__ST_GUILD__") 0 0 / __STW__px __STW__px padding-box; }
.frame .title { display: inline-block; margin-bottom: 14px; }

/* buttons + inputs */
.btn { font: inherit; cursor: pointer; padding: 2px 14px; color: var(--white); background: none; }
.btn.sec, .btn.buy { color: var(--ink); } .btn.danger { color: var(--white); }
.btn:disabled { color: var(--gray); cursor: not-allowed; }
.field label { display: block; color: var(--ink-2); }
.input { font: inherit; color: var(--ink); width: 100%; outline: 0; padding: 0 8px; background: none; }
select.input { appearance: none; padding-right: 34px; background: url("__ARROW__") no-repeat right 10px center / 10px 6px; }

/* badges, ranks */
.badge { display: inline-block; padding: 0 8px; line-height: 29px; }
.badge.w { color: var(--white); }
.rank { width: 52px; height: 52px; display: grid; place-items: center; font-size: 33px; padding-bottom: 2px; }

/* bars */
.track { position: relative; height: 22px; }
.track > i { position: absolute; inset: 0; background: var(--violet) repeating-linear-gradient(90deg, transparent 0 22px, var(--violet-dark) 22px 24px); }
.seg { display: inline-flex; align-items: center; gap: 4px; }
.seg b { width: 14px; height: 18px; background: var(--violet); clip-path: var(--notch-1); }
.seg b.off { height: 4px; background: var(--line); clip-path: none; }
.seg.warn b:not(.off) { background: var(--butter); box-shadow: inset 0 -4px 0 var(--peach-dark); }

/* slots */
.slot { position: relative; width: 80px; height: 80px; display: grid; place-items: center; }
.slot .cnt { position: absolute; right: 2px; bottom: -4px; }
.slot-wrap { position: relative; display: inline-block; }
.slot-wrap.sel::after { content: ""; position: absolute; inset: -8px;
  background:
    linear-gradient(var(--violet),var(--violet)) 0 0/18px 6px no-repeat, linear-gradient(var(--violet),var(--violet)) 0 0/6px 18px no-repeat,
    linear-gradient(var(--violet),var(--violet)) 100% 0/18px 6px no-repeat, linear-gradient(var(--violet),var(--violet)) 100% 0/6px 18px no-repeat,
    linear-gradient(var(--violet),var(--violet)) 0 100%/18px 6px no-repeat, linear-gradient(var(--violet),var(--violet)) 0 100%/6px 18px no-repeat,
    linear-gradient(var(--violet),var(--violet)) 100% 100%/18px 6px no-repeat, linear-gradient(var(--violet),var(--violet)) 100% 100%/6px 18px no-repeat; }
.price { display: inline-flex; gap: 6px; align-items: center; padding: 0 8px; line-height: 29px; }

/* table */
table.t { width: 100%; border-collapse: collapse; }
table.t th { text-align: left; color: var(--ink-2); font-weight: normal; padding: 2px 8px; }
table.t td { padding: 4px 8px; }
table.t tr { background: repeating-linear-gradient(90deg, var(--line) 0 4px, transparent 4px 8px) left bottom / 100% 2px no-repeat; }
table.t tr.me { background-color: var(--violet-light); }

/* character */
figure.char { position: relative; margin: 0; display: inline-flex; flex-direction: column; align-items: center; }
figure.char .char-shadow { position: absolute; left: 0; }
figure.char svg.char-sprite { position: relative; animation: bob 1.2s steps(1) infinite; }
figure.char figcaption { color: var(--ink-2); margin-top: 6px; white-space: nowrap; }
@keyframes bob { 0% { transform: translateY(0); } 50% { transform: translateY(calc(-1 * var(--px-step, 4px))); } }
.card-player { display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center; }
.stat { display: flex; justify-content: space-between; gap: 12px; }
.no { color: var(--ink-2); letter-spacing: 2px; }

/* swatches */
.sws { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 14px 20px; }
.sw { display: flex; gap: 12px; align-items: flex-start; }
.sw-chip { width: 56px; height: 56px; flex: none; clip-path: var(--notch-1); box-shadow: inset 0 0 0 2px var(--ink); }
.sw.main .sw-name { color: var(--violet); }
.sw-hex, .sw-role { color: var(--ink-2); }
.big { font-size: 44px; line-height: 55px; } .h3x { font-size: 33px; line-height: 44px; }
.muted { color: var(--ink-2); } .vio { color: var(--violet); }
ul.rules { margin: 0; padding-left: 44px; } ul.rules li::marker { content: "▶  "; color: var(--violet); }
</style>
</head>
<body>
<nav class="nav">
  <span class="brand"><b>SOLO</b> GRINDING</span>
  <a class="on" href="#">Dashboard</a><a href="#">Даалгавар</a><a href="#">Хичээл</a><a href="#">Гоёл</a><a href="#">Guild</a>
  <span class="coins">1 250 __COIN__</span>
</nav>
<div class="wrap">
  <div class="banner nine9 f-banner">Pixel style guide v3</div>
  <div class="dialog nine10 f-dialog" style="margin-bottom:8px">Main palette: <span class="vio">white</span> first, mint second, violet third. Characters take their vibe from handheld-era monster sprites — 3/4 battle stance, ink linework, checker dithering — but every pixel is original.</div>

  <h2>__CURSOR__ 1. Palette</h2><div class="rule"></div>
  <div class="sws">__UI_SWATCHES__</div>
  <p class="note" style="margin-top:16px">First seven (violet names) = the team's main palette. The rest are functional helpers, used sparingly.</p>

  <h2>__CURSOR__ 2. Character — starter (48×48, draft)</h2><div class="rule"></div>
  <div class="grid g2">
    <div class="panel nine9 f-panel" style="align-self:start">
      <div class="head">Starter · ×6</div>
      <div class="row" style="justify-content:center; padding: 6px 0 14px">__HERO_BIG__</div>
    </div>
    <div class="grid" style="align-content:start">
      <div class="panel nine9 f-panel">
        <div class="head mint">Player card (dashboard idea)</div>
        <div class="card-player">
          __HERO_CARD__
          <div>
            <div class="no">No.001</div>
            <div class="h3x">demo</div>
            <div class="stat"><span class="muted">Level</span><span>12</span></div>
            <div class="stat"><span class="muted">Rank</span><span class="badge nine6 f-badge-mint">D</span></div>
            <div class="stat"><span class="muted">Streak</span><span>7</span></div>
            <div class="stat"><span class="muted">Coins</span><span>1 250 __COIN__</span></div>
          </div>
        </div>
      </div>
      <div class="panel nine9 f-panel">
        <h3>How he is drawn</h3>
        <ul class="rules">
          <li>3/4 stance, fist forward, far hand in the hoodie pocket.</li>
          <li>Ink outer line + ink lines between parts; 3-tone hair with a violet sheen.</li>
          <li>Starter: white hoodie (checker-dithered hem), violet trousers, mint sneakers.</li>
          <li>Layers: body + hair → outfit → hat; pet beside. Idle bob 1px.</li>
        </ul>
      </div>
    </div>
  </div>
  <div class="panel nine9 f-panel" style="margin-top:28px">
    <div class="head">Skin × hair swaps · ×3</div>
    <div class="row" style="justify-content:space-around; padding-top:8px">__VARIANTS__</div>
  </div>

  <h2>__CURSOR__ 3. Type — Departure Mono</h2><div class="rule"></div>
  <div class="grid g2">
    <div class="panel nine9 f-panel">
      <div class="big vio">1 250 XP</div>
      <div class="h3x">Өнөөдрийн quest</div>
      <div>Даалгавар ≥24 цаг нээлттэй байж эрт урамшуулал авна.</div>
      <div class="muted">Хүрэх · Гүйцэтгэл · Түдгэлзүүлэх · 0 vs О vs Ө</div>
    </div>
    <div class="panel nine9 f-panel">
      <table class="t">
        <tr><th>Use</th><th>Size</th><th>Line</th></tr>
        <tr><td>Body, labels, buttons</td><td>22px</td><td>33px</td></tr>
        <tr class="me"><td>Page / card titles</td><td>33px</td><td>44px</td></tr>
        <tr><td>Hero numbers</td><td>44px</td><td>55px</td></tr>
      </table>
    </div>
  </div>

  <h2>__CURSOR__ 4. Surfaces</h2><div class="rule"></div>
  <div class="grid g3">
    <div class="panel nine9 f-panel"><h3>Card</h3>White, ink outline, stepped corners, soft gray offset shadow.</div>
    <div class="panel nine9 f-panel-mint"><h3>Mint card</h3>Second surface: side areas, lists, slots.</div>
    <div class="dialog nine10 f-dialog"><h3>Dialog box</h3>Double ink frame like a handheld text box — for messages and the player card.</div>
  </div>
  <div class="grid g2" style="margin-top:32px">
    <div class="frame store nine9 f-frame-store"><span class="title badge nine6 f-badge">Гоёл · store frame</span>
      <div class="panel nine9 f-panel">Peach candy stripes — only around the store.</div></div>
    <div class="frame guild nine9 f-frame-guild"><span class="title badge nine6 f-badge">Guild frame</span>
      <div class="panel nine9 f-panel">Violet stripes — only around the guild page.</div></div>
  </div>

  <h2>__CURSOR__ 5. Controls</h2><div class="rule"></div>
  <div class="panel nine9 f-panel">
    <div class="row">
      <button class="btn nine9 f-btn">__CHECK__ Дууссан</button>
      <button class="btn nine9 f-btn-on">Pressed</button>
      <button class="btn sec nine9 f-btn-sec">Хадгалах</button>
      <button class="btn buy nine9 f-btn-buy">Худалдаж авах</button>
      <button class="btn danger nine9 f-btn-danger">Устгах</button>
      <button class="btn nine9 f-btn-off" disabled>Түгжээтэй</button>
    </div>
    <div class="grid g3" style="margin-top:20px">
      <div class="field"><label>Нэр</label><input class="input nine9 f-input" value="Лаб 3 — SQL JOIN"></div>
      <div class="field"><label>Төрөл</label><select class="input nine9 f-input"><option>Лаборатори</option></select></div>
      <div class="field"><label>Deadline (focus)</label><input class="input nine9 f-input-focus" value="2026-11-10 18:00"></div>
    </div>
  </div>

  <h2>__CURSOR__ 6. Status &amp; rank</h2><div class="rule"></div>
  <div class="grid g2">
    <div class="panel nine9 f-panel">
      <div class="row" style="margin-bottom:16px">
        <span class="badge nine6 f-badge">Хийх</span><span class="badge w nine6 f-badge-rose">Хоцорсон</span>
        <span class="badge w nine6 f-badge-violet">Дууссан</span><span class="badge nine6 f-badge-butter">24 цаг үлдсэн</span>
        <span class="badge nine6 f-badge-vl">Лаб</span>
      </div>
      <div class="dialog nine10 f-dialog" style="margin-bottom:12px">▶ +60 XP (Эрт ×1.2) · +6 __COIN__</div>
      <div class="dialog nine10 f-dialog" style="color:var(--rose)">▶ Deadline хамгийн багадаа 3 цагийн дараа байх ёстой.</div>
    </div>
    <div class="panel nine9 f-panel">
      <h3>Rank E → S</h3>
      <div class="row">__RANKS__</div>
      <p class="muted" style="margin:12px 0 0">Gray → mint → peach → violet → butter → ink-and-gold S.</p>
    </div>
  </div>

  <h2>__CURSOR__ 7. Progress</h2><div class="rule"></div>
  <div class="panel nine9 f-panel">
    <div class="row" style="justify-content:space-between"><span>Level 12</span><span class="muted">2 880 / 3 380 XP</span></div>
    <div class="track nine6 f-track"><i style="width:62%"></i></div>
    <p class="muted" style="margin:6px 0 18px">Continuous → bar with tick marks.</p>
    <div class="row" style="justify-content:space-between"><span>Өдрийн XP</span><span>340/400</span></div>
    <div class="seg warn">[<b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b class="off"></b><b class="off"></b><b class="off"></b>]</div>
    <p class="muted" style="margin:6px 0 18px">Discrete → segments; butter close to the 400 cap.</p>
    <div class="row"><span>Өнөөдөр 2 даалгавар дуусга</span><span class="seg">[<b></b><b class="off"></b>]</span><span class="muted">1/2</span></div>
  </div>

  <h2>__CURSOR__ 8. Store pieces</h2><div class="rule"></div>
  <div class="panel nine9 f-panel">
    <div class="row">
      <div class="slot-wrap"><div class="slot nine9 f-slot">__COIN__</div></div>
      <div class="slot-wrap sel"><div class="slot nine9 f-slot">__COIN__<span class="cnt">3</span></div></div>
      <div class="slot-wrap"><div class="slot nine9 f-slot-locked"><span class="muted">B</span></div></div>
      <div class="slot-wrap"><div class="slot nine9 f-slot"></div></div>
      <span class="price nine6 f-badge-butter">150 __COIN__</span>
      <span>1 250 __COIN__</span>
      __COIN_BIG__
    </div>
  </div>

  <h2>__CURSOR__ 9. Rules</h2><div class="rule"></div>
  <div class="grid g2">
    <div class="panel nine9 f-panel"><h3>Always</h3><ul class="rules">
      <li>White first, mint second, violet third.</li>
      <li>2px grid; sprites only at whole-number scales.</li>
      <li>1px ink outline + soft gray offset shadow, zero blur.</li>
      <li>Font sizes 22 / 33 / 44px; icons are pixel sprites.</li>
    </ul></div>
    <div class="panel nine9 f-panel"><h3>Never</h3><ul class="rules">
      <li>Blending gradients, transparency, blur, border-radius.</li>
      <li>Non-integer sprite scaling (mixels).</li>
      <li>Copying characters, art or logos from any reference.</li>
    </ul></div>
  </div>
</div>
</body>
</html>
"""

if __name__ == "__main__":
    main()
