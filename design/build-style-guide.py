"""Builds design/style-guide.html — self-contained preview of the Solo Grinding pixel UI (v2, pastel).

Run from the project root:  python -P design/build-style-guide.py
Font (Departure Mono, OFL) is embedded as base64 so the file opens straight from disk.
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
FONT = ROOT / "fonts" / "DepartureMono-Regular.woff2"

# ---------------------------------------------------------------- palette
# Anchors (from the user's reference sprite): surface #f0f9e7, ink #190f10, peach #eab38e, mauve #927783.
UI = [
    ("bg", "#e7dfe6", "Page background (soft lilac) + dot grid"),
    ("bg-dot", "#d6cad5", "Dot grid, empty bar dashes"),
    ("surface", "#f0f9e7", "Panels and cards (reference mint-white)"),
    ("surface-2", "#e3eedb", "Inputs, slots, zebra rows"),
    ("line", "#cbbec8", "Dividers, inner shadows"),
    ("mauve", "#927783", "Offset shadows, large secondary text"),
    ("plum", "#5d3f5e", "Primary: buttons, active, progress fills"),
    ("ink", "#190f10", "Outlines and body text (reference ink)"),
    ("ink-2", "#4a3b45", "Secondary text"),
    ("peach", "#eab38e", "Warm accent: store, highlights (reference)"),
    ("peach-dark", "#c97f5c", "Peach shading, store stripes"),
    ("butter", "#ffd46b", "Coins, warnings (cap, <24h)"),
    ("coral", "#ef5d6a", "Danger, late, errors"),
    ("sky", "#74c4e8", "Done, success, info"),
    ("sakura", "#f4a6c0", "Guild / social, celebrations"),
    ("white", "#fffdf8", "Text on plum/ink, sparkles"),
]
C = {k: v for k, v, _ in UI}
SPRITE_EXTRA = [
    ("plum-dark", "#3e2a40"),
    ("skin-1", "#ffe3cc"), ("skin-1s", "#eab38e"), ("skin-2", "#eab38e"), ("skin-2s", "#c97f5c"),
    ("skin-3", "#b97a55"), ("skin-3s", "#8a5638"), ("skin-4", "#6e4630"), ("skin-4s", "#4a2e20"),
    ("hair-1h", "#6b5566"), ("hair-1", "#3a2a33"), ("hair-1s", "#261a21"),
    ("hair-2h", "#b5764a"), ("hair-2", "#8a5638"), ("hair-2s", "#5c3522"),
    ("hair-3h", "#fff0b0"), ("hair-3", "#f6d27e"), ("hair-3s", "#d9a650"),
    ("hair-4h", "#e2d4f7"), ("hair-4", "#bfa6e0"), ("hair-4s", "#8f78b8"),
]
X = {k: v for k, v in SPRITE_EXTRA}
SKINS = [(X["skin-1"], X["skin-1s"]), (X["skin-2"], X["skin-2s"]), (X["skin-3"], X["skin-3s"]), (X["skin-4"], X["skin-4s"])]
HAIRS = [(X[f"hair-{i}"], X[f"hair-{i}s"], X[f"hair-{i}h"]) for i in range(1, 5)]
RANKS = [  # rank, fill, letter
    ("E", C["mauve"], C["white"]), ("D", C["sky"], C["ink"]), ("C", C["peach"], C["ink"]),
    ("B", C["plum"], C["white"]), ("A", C["butter"], C["ink"]), ("S", C["ink"], C["butter"]),
]


# ---------------------------------------------------------------- pixel helpers
def runs_svg(grid, pal, w, h, scale=None, cls="", extra_attrs=""):
    """grid: list of strings; pal: char -> color. One rect per horizontal run."""
    rects = []
    for y, row in enumerate(grid):
        x = 0
        while x < len(row):
            ch = row[x]
            if ch == "." or ch not in pal:
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


def nine(fill, outline=C["ink"], edge=None, edge_top=False, n=8, cut=2):
    """n x n frame with a 1px outline and stepped corners; slice = (n-2)//2. Optional 2-row inner edge."""
    def inside(x, y):
        if not (0 <= x < n and 0 <= y < n):
            return False
        cx, cy = min(x, n - 1 - x), min(y, n - 1 - y)
        return cx + cy >= cut  # cut corners (cut=2 -> 2-step, cut=1 -> 1-step)
    grid = []
    for y in range(n):
        row = ""
        for x in range(n):
            if not inside(x, y):
                row += "."
            elif not all(inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                row += "o"
            elif edge and ((not edge_top and y >= n - 3) or (edge_top and y <= 2)):
                row += "e"
            else:
                row += "f"
        grid.append(row)
    pal = {"o": outline, "f": fill, "e": edge or fill}
    return uri(runs_svg(grid, pal, n, n))


def garland(colors=("peach", "sky", "sakura", "butter"), flag=10, gap=4, depth=5):
    """Festival flags on a string (tile of len(colors) flags)."""
    tile_w = (flag + gap) * len(colors)
    rows = [["."] * tile_w for _ in range(depth + 1)]
    for x in range(tile_w):
        rows[0][x] = "s"
    for i, _ in enumerate(colors):
        x0 = i * (flag + gap) + gap // 2
        for d in range(depth):
            for x in range(x0 + d, x0 + flag - d):
                rows[d + 1][x] = str(i)
    pal = {"s": C["mauve"], **{str(i): C[c] for i, c in enumerate(colors)}}
    return uri(runs_svg(["".join(r) for r in rows], pal, tile_w, depth + 1)), tile_w * 2, (depth + 1) * 2


def stripes(base, line, period=8):
    grid = ["".join("l" if (x + y) % period in (0, 1) else "b" for x in range(period)) for y in range(period)]
    return uri(runs_svg(grid, {"l": line, "b": base}, period, period)), period * 2


DOTS = uri(runs_svg(["d" + "." * 11] + ["." * 12] * 11, {"d": C["bg-dot"]}, 12, 12))


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
            elif not all(inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
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

# Hand-placed 32x32 starter. Legend:
# O ink outline | H/h/j hair base/shade/highlight | S/s skin base/shade | E eye | W eye shine | B blush | M mouth
# T/t shirt base/shade (mauve also draws inner lines) | P/p trousers | F/f sneakers
CHAR_GRID = [
    "................................",  # 0
    "............OOOOOOOO............",  # 1
    "..........OOHjjHHHHHOO..........",  # 2
    "........OOHjjjHHHHHHHhOO........",  # 3
    ".......OHjjHHHHHHHHHHHHhO.......",  # 4
    ".......OHjjHHHHHHHHHHHhhO.......",  # 5
    "......OHHjHHHHHHHHHHHHHhhO......",  # 6
    "......OHHHHHhHHHHHhHHHHhhO......",  # 7
    "......OHHHhHHHhHHHHhHHHhhO......",  # 8
    "......OHHhhssshhhhssshhHhO......",  # 9
    "......OHhSSSSSSSSSSSSSShhO......",  # 10
    "......OHhSSWESSSSSSWESshhO......",  # 11
    "......OHhSSEESSSSSSEESshhO......",  # 12
    "......OHhBBEESSSSSSEEBBhhO......",  # 13
    "......OHhSSSSSSMMSSSSSshhO......",  # 14
    ".......OOSSSSSSSSSSSSssOO.......",  # 15
    ".........OSSSSSSSSSSssO.........",  # 16
    "..........OOOOssssOOOO..........",  # 17
    ".........OTTTTttttTTTtO.........",  # 18
    "........OTTTTTTTTTTTTTtO........",  # 19
    "........OTTtTTTTTTTttTtO........",  # 20
    "........OSStTTTTTTTttSsO........",  # 21
    "........OSStTTTTTTTttSsO........",  # 22
    "........OSsttttttttttSsO........",  # 23
    ".........OOPPPPPPPPPpOO.........",  # 24
    "..........OPPPPPPPPPpO..........",  # 25
    "..........OPPpO..OPPpO..........",  # 26
    "..........OPPpO..OPPpO..........",  # 27
    ".........OFFFfO..OFFFfO.........",  # 28
    ".........OffffO..OffffO.........",  # 29
    "..........OOOO....OOOO..........",  # 30
    "................................",  # 31
]
assert len(CHAR_GRID) == 32 and all(len(r) == 32 for r in CHAR_GRID), [len(r) for r in CHAR_GRID]
SHADOW = ["." * 9 + "x" * 14 + "." * 9, "." * 7 + "x" * 18 + "." * 7, "." * 9 + "x" * 14 + "." * 9]


def char_palette(skin, hair):
    return {
        "O": C["ink"], "E": C["ink"], "W": C["white"], "B": C["sakura"], "M": C["ink-2"],
        "S": skin[0], "s": skin[1],
        "H": hair[0], "h": hair[1], "j": hair[2],
        "T": C["white"], "t": C["mauve"],                                       # starter tee: white + mauve shade
        "P": C["plum"], "p": X["plum-dark"],                                    # starter trousers
        "F": C["peach"], "f": C["peach-dark"],                                  # starter sneakers
    }


def char_block(skin, hair, scale, label=""):
    sprite = runs_svg(CHAR_GRID, char_palette(skin, hair), 32, 32, scale, cls="char-sprite")
    shadow = runs_svg(SHADOW, {"x": C["line"]}, 32, 3, scale, cls="char-shadow", extra_attrs=f'style="top:{29*scale}px"')
    return (f'<figure class="char" style="width:{32*scale}px;--px-step:{scale}px">{shadow}{sprite}'
            f'{f"<figcaption>{label}</figcaption>" if label else ""}</figure>')


# ---------------------------------------------------------------- page
def swatch(name, hex_, role):
    return (f'<div class="sw"><div class="sw-chip" style="background:{hex_}"></div>'
            f'<div><div class="sw-name">--{name}</div><div class="sw-hex">{hex_}</div><div class="sw-role">{role}</div></div></div>')


def main():
    font_b64 = base64.b64encode(FONT.read_bytes()).decode()
    gar, gw, gh = garland()
    st_store, sw_ = stripes(C["peach"], C["peach-dark"])
    st_guild, _ = stripes(C["sky"], C["white"])
    frames = {
        "panel": nine(C["surface"]), "panel-peach": nine(C["peach"]), "panel-sky": nine(C["sky"]),
        "banner": nine(C["ink"]),
        "btn": nine(C["plum"], edge=X["plum-dark"]), "btn-on": nine(C["plum"], edge=X["plum-dark"], edge_top=True),
        "btn-sec": nine(C["surface"], edge=C["line"]), "btn-buy": nine(C["peach"], edge=C["peach-dark"]),
        "btn-danger": nine(C["coral"], edge="#c94452"), "btn-off": nine(C["line"], outline=C["mauve"], edge=C["bg-dot"]),
        "input": nine(C["white"], edge=C["surface-2"], edge_top=True), "input-focus": nine(C["white"], outline=C["plum"], edge=C["surface-2"], edge_top=True),
        "slot": nine(C["surface-2"], edge=C["line"], edge_top=True), "slot-locked": nine(C["bg"], outline=C["mauve"]),
        "badge": nine(C["surface-2"], n=6, cut=1), "badge-coral": nine(C["coral"], n=6, cut=1), "badge-sky": nine(C["sky"], n=6, cut=1),
        "badge-butter": nine(C["butter"], n=6, cut=1), "badge-plum": nine(C["plum"], n=6, cut=1), "badge-white": nine(C["white"], n=6, cut=1),
        "track": nine(C["surface-2"], n=6, cut=1),
        "flash-ok": nine(C["sky"]), "flash-err": nine(C["coral"]),
        "frame-store": nine(C["peach"]), "frame-guild": nine(C["sky"]),
        **{f"rank-{r}": nine(fill) for r, fill, _ in RANKS},
    }
    frame_css = "\n".join(f".f-{k} {{ border-image-source: url(\"{v}\"); }}" for k, v in frames.items())
    frame_css += (f"\n.f-btn:active {{ border-image-source: url(\"{frames['btn-on']}\"); }}"
                  f"\n.f-input:focus {{ border-image-source: url(\"{frames['input-focus']}\"); }}")

    coin = runs_svg(COIN, COIN_PAL, 12, 12, 2, cls="sprite")
    coin_big = runs_svg(COIN, COIN_PAL, 12, 12, 8, cls="sprite")
    check = runs_svg(CHECK, {"#": C["white"]}, 7, 6, 2, cls="sprite")
    ui_sw = "".join(swatch(n, h, r) for n, h, r in UI)
    extra_sw = "".join(f'<div class="mini"><div class="mini-chip" style="background:{h}"></div><span>{n}<br>{h}</span></div>' for n, h in SPRITE_EXTRA)
    ranks = "".join(f'<div class="rank nine9 f-rank-{r}" style="color:{fg}">{r}</div>' for r, _, fg in RANKS)
    chars_x4 = "".join(char_block(SKINS[i], HAIRS[i], 4, f"skin {i+1} · hair {i+1}") for i in range(4))
    char_x8 = char_block(SKINS[0], HAIRS[0], 8)

    html = TEMPLATE
    for k, v in {
        "__FONT__": font_b64, "__FRAMES__": frame_css, "__COIN__": coin, "__COIN_BIG__": coin_big, "__CHECK__": check,
        "__ARROW__": uri(runs_svg(ARROW, {"#": C["ink"]}, 5, 3)), "__DOTS__": DOTS,
        "__GARLAND__": gar, "__GW__": str(gw), "__GH__": str(gh), "__ST_STORE__": st_store, "__ST_GUILD__": st_guild, "__STW__": str(sw_),
        "__UI_SWATCHES__": ui_sw, "__EXTRA_SWATCHES__": extra_sw, "__RANKS__": ranks,
        "__CHARS_X4__": chars_x4, "__CHAR_X8__": char_x8,
        **{f"__{k.upper().replace('-', '_')}__": v for k, v in C.items()},
    }.items():
        html = html.replace(k, v)
    out = ROOT / "style-guide.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out} ({len(html)//1024} KB)")


TEMPLATE = r"""<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Solo Grinding — Pixel Style Guide v2</title>
<style>
@font-face { font-family: "Departure Mono"; src: url(data:font/woff2;base64,__FONT__) format("woff2"); font-display: block; }
:root {
  --bg:__BG__; --bg-dot:__BG_DOT__; --surface:__SURFACE__; --surface-2:__SURFACE_2__; --line:__LINE__;
  --mauve:__MAUVE__; --plum:__PLUM__; --ink:__INK__; --ink-2:__INK_2__; --peach:__PEACH__; --peach-dark:__PEACH_DARK__;
  --butter:__BUTTER__; --coral:__CORAL__; --sky:__SKY__; --sakura:__SAKURA__; --white:__WHITE__;
  --notch-1: polygon(2px 0,calc(100% - 2px) 0,calc(100% - 2px) 2px,100% 2px,100% calc(100% - 2px),calc(100% - 2px) calc(100% - 2px),calc(100% - 2px) 100%,2px 100%,2px calc(100% - 2px),0 calc(100% - 2px),0 2px,2px 2px);
}
* { box-sizing: border-box; }
html { background: var(--bg); }
body { margin: 0; color: var(--ink); font-family: "Departure Mono", monospace; font-size: 22px; line-height: 33px;
  background: var(--bg) url("__DOTS__"); background-size: 24px 24px; -webkit-font-smoothing: none; }
.wrap { max-width: 1240px; margin: 0 auto; padding: 28px 16px 80px; }
h2 { font-size: 33px; line-height: 44px; font-weight: normal; margin: 52px 0 6px; }
h3 { font-size: 22px; font-weight: normal; margin: 0 0 8px; color: var(--plum); }
p.note { color: var(--ink-2); margin: 0 0 16px; }
.grid { display: grid; gap: 28px; } .g2 { grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); } .g3 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.row { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
svg { display: inline-block; vertical-align: middle; image-rendering: pixelated; }

/* 9-slice pixel frames: 1px ink outline + stepped corners, scaled exactly x2 */
.nine9 { border: 6px solid transparent; border-image-slice: 3 fill; border-image-width: 6px; border-image-repeat: stretch; image-rendering: pixelated; }
.nine6 { border: 4px solid transparent; border-image-slice: 2 fill; border-image-width: 4px; border-image-repeat: stretch; image-rendering: pixelated; }
__FRAMES__

/* garland divider (festival flags) */
.garland { height: __GH__px; background: url("__GARLAND__") repeat-x; background-size: __GW__px __GH__px; margin: 6px 0 26px; }

/* nav */
.nav { display: flex; align-items: center; gap: 4px; background: var(--ink); padding: 0 16px; }
.nav a { color: var(--line); text-decoration: none; padding: 10px 14px; }
.nav a.on { color: var(--white); box-shadow: inset 0 -4px 0 var(--peach); }
.nav .brand { color: var(--white); padding-right: 18px; } .nav .brand b { color: var(--peach); font-weight: normal; }
.nav .coins { margin-left: auto; color: var(--butter); }

/* banner */
.banner { position: relative; max-width: 760px; margin: 8px auto 40px; padding: 4px 20px; text-align: center; color: var(--white); letter-spacing: 2px; text-transform: uppercase; }
.banner::after { content: ""; position: absolute; left: 12px; right: 12px; top: calc(100% + 2px); height: __GH__px; background: url("__GARLAND__") repeat-x; background-size: __GW__px __GH__px; }

/* panel */
.panel { padding: 14px 18px; filter: drop-shadow(4px 4px 0 var(--mauve)); }
.panel .head { margin: -18px -22px 14px; padding: 6px 22px 4px; background: var(--plum); color: var(--white); clip-path: var(--notch-1); }
.panel .head.peach { background: var(--peach); color: var(--ink); }
.panel .head.sakura { background: var(--sakura); color: var(--ink); }

/* frames for "places" */
.frame { padding: 18px; filter: drop-shadow(4px 4px 0 var(--mauve)); }
.frame.store { background: url("__ST_STORE__") 0 0 / __STW__px __STW__px padding-box; }
.frame.guild { background: url("__ST_GUILD__") 0 0 / __STW__px __STW__px padding-box; }
.frame .title { display: inline-block; margin-bottom: 14px; }

/* buttons */
.btn { font: inherit; cursor: pointer; padding: 2px 14px; color: var(--white); background: none; }
.btn.sec { color: var(--ink); } .btn.buy { color: var(--ink); } .btn.danger { color: var(--ink); }
.btn:disabled { color: var(--mauve); cursor: not-allowed; }
.frame.nine9 { border-image-slice: 3; } /* no fill: the stripes show through */

/* inputs */
.field label { display: block; color: var(--ink-2); }
.input { font: inherit; color: var(--ink); width: 100%; outline: 0; padding: 0 8px; background: none; }
select.input { appearance: none; padding-right: 34px; background: url("__ARROW__") no-repeat right 10px center / 10px 6px; }

/* badges, bubbles, ranks */
.badge { display: inline-block; padding: 0 8px; line-height: 29px; }
.badge.on-dark { color: var(--white); }
.rank { width: 52px; height: 52px; display: grid; place-items: center; font-size: 33px; padding-bottom: 2px; }

/* bars */
.track { position: relative; height: 22px; }
.track > i { position: absolute; inset: 0; background: var(--plum) repeating-linear-gradient(90deg, transparent 0 22px, var(--mauve) 22px 24px); }
.seg { display: inline-flex; align-items: center; gap: 4px; color: var(--ink); }
.seg b { width: 14px; height: 18px; background: var(--plum); clip-path: var(--notch-1); }
.seg b.off { height: 4px; background: var(--line); clip-path: none; }
.seg.warn b:not(.off) { background: var(--butter); box-shadow: inset 0 -4px 0 var(--peach-dark); }

/* slots */
.slot { position: relative; width: 80px; height: 80px; display: grid; place-items: center; }
.slot .cnt { position: absolute; right: 2px; bottom: -4px; }
.slot-wrap { position: relative; display: inline-block; }
.slot-wrap.sel::after { content: ""; position: absolute; inset: -8px;
  background:
    linear-gradient(var(--plum),var(--plum)) 0 0/18px 6px no-repeat, linear-gradient(var(--plum),var(--plum)) 0 0/6px 18px no-repeat,
    linear-gradient(var(--plum),var(--plum)) 100% 0/18px 6px no-repeat, linear-gradient(var(--plum),var(--plum)) 100% 0/6px 18px no-repeat,
    linear-gradient(var(--plum),var(--plum)) 0 100%/18px 6px no-repeat, linear-gradient(var(--plum),var(--plum)) 0 100%/6px 18px no-repeat,
    linear-gradient(var(--plum),var(--plum)) 100% 100%/18px 6px no-repeat, linear-gradient(var(--plum),var(--plum)) 100% 100%/6px 18px no-repeat; }
.price { display: inline-flex; gap: 6px; align-items: center; padding: 0 8px; line-height: 29px; }

/* table */
table.t { width: 100%; border-collapse: collapse; }
table.t th { text-align: left; color: var(--ink-2); font-weight: normal; padding: 2px 8px; }
table.t td { padding: 4px 8px; }
table.t tr { background: repeating-linear-gradient(90deg, var(--line) 0 4px, transparent 4px 8px) left bottom / 100% 2px no-repeat; }
table.t tr.me { background-color: var(--sakura); }

/* flash */
.flash { padding: 4px 14px; }

/* character */
figure.char { position: relative; margin: 0; display: inline-flex; flex-direction: column; align-items: center; }
figure.char .char-shadow { position: absolute; left: 0; }
figure.char svg.char-sprite { position: relative; animation: bob 1.2s steps(1) infinite; }
figure.char figcaption { color: var(--ink-2); font-size: 22px; margin-top: 4px; white-space: nowrap; }
@keyframes bob { 0% { transform: translateY(0); } 50% { transform: translateY(calc(-1 * var(--px-step, 4px))); } }

/* swatches */
.sws { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 14px 20px; }
.sw { display: flex; gap: 12px; align-items: flex-start; }
.sw-chip { width: 56px; height: 56px; flex: none; clip-path: var(--notch-1); box-shadow: inset 0 0 0 2px var(--ink); }
.sw-hex { color: var(--ink-2); } .sw-role { color: var(--ink-2); }
.minis { display: flex; flex-wrap: wrap; gap: 10px; }
.mini { width: 110px; color: var(--ink-2); }
.mini-chip { height: 28px; clip-path: var(--notch-1); box-shadow: inset 0 0 0 2px var(--ink); }
.big { font-size: 44px; line-height: 55px; } .h3x { font-size: 33px; line-height: 44px; }
.muted { color: var(--ink-2); } .plum { color: var(--plum); }
ul.rules { margin: 0; padding-left: 44px; } ul.rules li::marker { content: "■  "; color: var(--plum); }
</style>
</head>
<body>
<nav class="nav">
  <span class="brand"><b>SOLO</b> GRINDING</span>
  <a class="on" href="#">Dashboard</a><a href="#">Даалгавар</a><a href="#">Хичээл</a><a href="#">Гоёл</a><a href="#">Guild</a>
  <span class="coins">1 250 __COIN__</span>
</nav>
<div class="wrap">
  <div class="banner nine9 f-banner">Pixel style guide v2 · pastel</div>
  <p class="note">Palette anchors come from the reference sprite (mint-white, ink, peach, mauve) — colors only, no art. Layout language (pixel panels, segmented bars, slot brackets) is unchanged from v1.</p>

  <h2>1. Palette — 16 UI colors</h2>
  <div class="garland"></div>
  <div class="sws">__UI_SWATCHES__</div>
  <p class="note" style="margin-top:20px">Sprite-only extension: 4 skin ramps (base + shade), 4 hair ramps, plum-dark for clothing shade.</p>
  <div class="minis">__EXTRA_SWATCHES__</div>

  <h2>2. Character direction — starter (draft)</h2>
  <div class="garland"></div>
  <div class="grid g2">
    <div class="panel nine9 f-panel">
      <div class="head">Base character · 32×32</div>
      <div class="row" style="justify-content:space-around; align-items:flex-end; padding: 10px 0 4px">__CHAR_X8__</div>
    </div>
    <div class="panel nine9 f-panel">
      <div class="head peach">How it is drawn</div>
      <ul class="rules">
        <li>Chibi: head ≈ half the height, gender-neutral, one fixed bob haircut.</li>
        <li>1px ink outline outside; inside, each part is shaded with its own darker tone (light from top-left), like the reference.</li>
        <li>Starter outfit: white tee with mauve shade, plum trousers, peach sneakers.</li>
        <li>Hat layer sits over the hair; outfit replaces tee + trousers + shoes; pet stands beside.</li>
        <li>Idle: 2 frames, whole body moves 1px (watch the sprites bob).</li>
      </ul>
    </div>
  </div>
  <div class="panel nine9 f-panel" style="margin-top:28px">
    <div class="head sakura">Skin × hair swaps (same pixels, different palette) · ×4</div>
    <div class="row" style="justify-content:space-around; padding-top:10px">__CHARS_X4__</div>
  </div>

  <h2>3. Type — Departure Mono, 11px grid</h2>
  <div class="garland"></div>
  <div class="grid g2">
    <div class="panel nine9 f-panel">
      <div class="big plum">1 250 XP</div>
      <div class="h3x">Өнөөдрийн quest</div>
      <div>Даалгавар ≥24 цаг нээлттэй байж эрт урамшуулал авна.</div>
      <div>Хүрэх · Гүйцэтгэл · Түдгэлзүүлэх · Үүсгэх</div>
      <div class="muted">0 vs О vs Ө — 3 vs З — l vs 1 vs I</div>
    </div>
    <div class="panel nine9 f-panel">
      <h3>Sizes (multiples of 11px only)</h3>
      <table class="t">
        <tr><th>Use</th><th>Size</th><th>Line</th></tr>
        <tr><td>Body, labels, buttons</td><td>22px</td><td>33px</td></tr>
        <tr class="me"><td>Page / card titles</td><td>33px</td><td>44px</td></tr>
        <tr><td>Hero numbers</td><td>44px</td><td>55px</td></tr>
      </table>
    </div>
  </div>

  <h2>4. Surfaces</h2>
  <div class="garland"></div>
  <div class="grid g3">
    <div class="panel nine9 f-panel"><h3>Panel</h3>Ink outline with stepped corners and a hard mauve offset shadow.</div>
    <div class="panel nine9 f-panel"><div class="head">Өнөөдрийн quest</div>Title strip for cards with a heading (plum, peach or sakura).</div>
    <div class="panel nine9 f-panel-peach"><h3 style="color:var(--ink)">Tinted panel</h3>Peach or sky panels for highlights — sparingly.</div>
  </div>
  <div class="grid g2" style="margin-top:32px">
    <div class="frame store nine9 f-frame-store"><span class="title badge nine6 f-badge-white">Гоёл · Store frame</span>
      <div class="panel nine9 f-panel">Awning stripes in peach — only around the store.</div></div>
    <div class="frame guild nine9 f-frame-guild"><span class="title badge nine6 f-badge-white">Guild frame</span>
      <div class="panel nine9 f-panel">Sky stripes — only around the guild page.</div></div>
  </div>

  <h2>5. Controls</h2>
  <div class="garland"></div>
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

  <h2>6. Status &amp; rank</h2>
  <div class="garland"></div>
  <div class="grid g2">
    <div class="panel nine9 f-panel">
      <div class="row" style="margin-bottom:16px">
        <span class="badge nine6 f-badge">Хийх</span><span class="badge nine6 f-badge-coral">Хоцорсон</span>
        <span class="badge nine6 f-badge-sky">Дууссан</span><span class="badge nine6 f-badge-butter">24 цаг үлдсэн</span>
        <span class="badge on-dark nine6 f-badge-plum">5</span>
      </div>
      <div class="flash nine9 f-flash-ok" style="margin-bottom:12px">+60 XP (Эрт ×1.2) · +6 __COIN__</div>
      <div class="flash nine9 f-flash-err">Deadline хамгийн багадаа 3 цагийн дараа байх ёстой.</div>
    </div>
    <div class="panel nine9 f-panel">
      <h3>Rank E → S</h3>
      <div class="row">__RANKS__</div>
      <p class="muted" style="margin:12px 0 0">Mauve → sky → peach → plum → butter gold → black-and-gold S.</p>
    </div>
  </div>

  <h2>7. Progress</h2>
  <div class="garland"></div>
  <div class="panel nine9 f-panel">
    <div class="row" style="justify-content:space-between"><span>Level 12</span><span class="muted">2 880 / 3 380 XP</span></div>
    <div class="track nine6 f-track"><i style="width:62%"></i></div>
    <p class="muted" style="margin:6px 0 18px">Continuous → bar with tick marks.</p>
    <div class="row" style="justify-content:space-between"><span>Өдрийн XP</span><span>340/400</span></div>
    <div class="seg warn">[<b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b class="off"></b><b class="off"></b><b class="off"></b>]</div>
    <p class="muted" style="margin:6px 0 18px">Discrete → segments; butter when close to the 400 cap.</p>
    <div class="row"><span>Өнөөдөр 2 даалгавар дуусга</span><span class="seg">[<b></b><b class="off"></b>]</span><span class="muted">1/2</span></div>
  </div>

  <h2>8. Store pieces</h2>
  <div class="garland"></div>
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

  <h2>9. Rules</h2>
  <div class="garland"></div>
  <div class="grid g2">
    <div class="panel nine9 f-panel"><h3>Always</h3><ul class="rules">
      <li>2px grid; UI art pixel = 2 CSS px; sprites ×2–×8.</li>
      <li>Only these 16 colors (+ sprite extension inside sprites).</li>
      <li>1px ink outline + hard mauve offset shadow, zero blur.</li>
      <li>Stepped corners; font sizes 22 / 33 / 44px.</li>
      <li>Icons are pixel sprites, never emoji.</li>
    </ul></div>
    <div class="panel nine9 f-panel"><h3>Never</h3><ul class="rules">
      <li>Blending gradients, transparency, blur, border-radius.</li>
      <li>Non-integer sprite scaling (mixels).</li>
      <li>Art, characters or logos from the reference images.</li>
    </ul></div>
  </div>
</div>
</body>
</html>
"""

if __name__ == "__main__":
    main()
