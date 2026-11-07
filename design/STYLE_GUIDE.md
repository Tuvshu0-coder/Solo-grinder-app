# Solo Grinding — Pixel Style Guide v2 (pastel, draft)

Visual preview: open `design/style-guide.html` in a browser (self-contained; rebuild with
`python -P design/build-style-guide.py`).

- **Colors:** the four anchors (mint-white, ink, peach, mauve) were sampled from a reference sprite
  the team supplied — colors only, no art or characters from it.
- **Layout language:** pixel panels, segmented bars and slot brackets are inspired by reference
  screenshots of a pixel-art game UI — visual language only, no assets.

## Palette — 16 UI colors

| Token | Hex | Role |
|---|---|---|
| `bg` | `#e7dfe6` | Page background (soft lilac) with a 24px dot grid |
| `bg-dot` | `#d6cad5` | Dot grid |
| `surface` | `#f0f9e7` | Panels and cards (anchor) |
| `surface-2` | `#e3eedb` | Inputs' inner shade, slots, zebra rows |
| `line` | `#cbbec8` | Dividers, empty bar dashes, character ground shadow |
| `mauve` | `#927783` | Offset shadows, large secondary text (anchor) |
| `plum` | `#5d3f5e` | Primary: buttons, active, progress fills |
| `ink` | `#190f10` | Outlines and body text (anchor) |
| `ink-2` | `#4a3b45` | Secondary text |
| `peach` | `#eab38e` | Warm accent: store, highlights, active tab (anchor) |
| `peach-dark` | `#c97f5c` | Peach shading, store stripes |
| `butter` | `#ffd46b` | Coins; warnings (daily cap, <24h left) |
| `coral` | `#ef5d6a` | Danger, late, errors |
| `sky` | `#74c4e8` | Done, success, info |
| `sakura` | `#f4a6c0` | Guild / social, "me" row, blush |
| `white` | `#fffdf8` | Text on plum / ink, sparkles, starter tee |

**Meaning is fixed:** plum = interactive/progress · sky = done · coral = late/danger ·
butter = coins/warning · peach = store · sakura = social.

**Ranks:** E mauve · D sky · C peach · B plum · A butter · S ink with butter letter.

## Character (32×32, draft)

Hand-placed pixels (`CHAR_GRID` in `build-style-guide.py`). Chibi proportions (head ≈ half),
gender-neutral, one fixed bob haircut. 1px ink outline outside; inside, each part shaded with its
own darker tone, light from the top-left. Starter outfit: white tee (mauve shade and inner lines),
plum trousers, peach sneakers. Eyes 2×3 with a white shine; sakura blush.

**Sprite-only extension:**

| Ramp | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Skin base / shade | `#ffe3cc` / `#eab38e` | `#eab38e` / `#c97f5c` | `#b97a55` / `#8a5638` | `#6e4630` / `#4a2e20` |
| Hair highlight / base / shade | `#6b5566` `#3a2a33` `#261a21` | `#b5764a` `#8a5638` `#5c3522` | `#fff0b0` `#f6d27e` `#d9a650` | `#e2d4f7` `#bfa6e0` `#8f78b8` |

Plus `plum-dark #3e2a40` for clothing shade. Layers: body + hair → outfit → hat; pet beside.
Idle: 2 frames, whole sprite moves 1 art pixel.

## Type

**Departure Mono** (SIL OFL 1.1, © Helena Zhang), unmodified, in `design/fonts/`. 11px grid;
real **Ө ө Ү ү** included; slashed zero. Sizes: 22px body (line 33), 33px titles (line 44),
44px hero numbers (line 55). No other sizes.

## Components

- **9-slice frames:** every box is an 8×8 (or 6×6) SVG with a 1px ink outline and stepped corners,
  drawn with `border-image` at exactly ×2 — so outlines follow the corner steps. Panels add a hard
  4px mauve offset shadow (`drop-shadow`, zero blur).
- **Panel title strip:** plum (or peach/sakura) band inside the outline.
- **Banner:** ink box, white uppercase text, festival-flag garland hanging underneath.
- **Divider:** garland of peach / sky / sakura / butter flags on a mauve string.
- **Place frames:** Store = peach with diagonal peach-dark stripes; Guild = sky with white stripes.
- **Buttons:** plum primary · surface secondary · peach "buy" · coral danger · disabled grey.
  2px darker bottom edge; pressed moves it to the top.
- **Inputs:** white with inner top shade; focus turns the outline plum. Pixel arrow on selects.
- **Badges:** sticker style (ink outline): Хийх surface · Хоцорсон coral · Дууссан sky · warning butter.
- **Bars:** continuous (level) = plum fill with mauve ticks; discrete (daily XP, quests) = segments,
  butter near the cap.
- **Slots:** surface-2 with inner top shade; selected = plum corner brackets; locked = muted.
- **Nav:** ink bar, peach active underline, butter coin count.

## Rules

Always: 2px grid · only these colors (+ sprite extension inside sprites) · ink outline + hard mauve
shadow, zero blur · stepped corners · font sizes 22/33/44 · icons are pixel sprites.
Never: blending gradients, transparency, blur, border-radius, non-integer sprite scaling, or any art
from the reference images.

Known limit: pixel-perfect at 100% and 200% display scaling; at Windows 125%/150% the font's pixels
may look slightly uneven (browser limitation).
