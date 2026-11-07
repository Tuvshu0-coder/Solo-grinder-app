# Solo Grinding — Pixel Style Guide v3 (draft)

Visual preview: open `design/style-guide.html` in a browser (self-contained; rebuild with
`python -P design/build-style-guide.py`).

Direction: clean, white-first UI with handheld-era pixel character art. References supplied by the
team (a pixel-art game UI, monster sprites, a web layout) set the *vibe* only — every pixel here is
original; no characters, sprites, art or logos are copied.

## Palette

**Main palette (team-chosen, in order of use):**

| Token | Hex | Role |
|---|---|---|
| `white` | `#ffffff` | **Main** — page background, cards |
| `mint` | `#f0f9e8` | **Second** — secondary surfaces, slots, bar tracks |
| `violet` | `#7f7091` | **Third** — primary buttons, active tab, progress, "done" |
| `ink` | `#413436` | Text and 1px pixel outlines |
| `gray` | `#a9a4aa` | Disabled, dithering, muted icons |
| `line` | `#d7d6d6` | Dividers, soft offset shadows, ground shadow |
| `peach` | `#ebb18c` | Warm accent: store, skin |

**Functional helpers (used sparingly):** `ink-2 #6e6468` secondary text · `violet-dark #5e5270`
button edge · `violet-light #e6e1ec` selected rows · `mint-dark #d5e6cb` inner shade on mint ·
`peach-dark #c98d6b` peach shade / coin rim · `butter #f2cc6b` coins & warnings · `rose #c9636b`
late & danger.

**Meaning:** violet = interactive / progress / done · rose = late / danger · butter = coins /
warning · peach = store.

**Ranks:** E gray · D mint · C peach · B violet · A butter · S ink with butter letter.

## Character — starter (48×48, draft)

Hand-placed pixels (`HERO` in `build-style-guide.py`).
- 3/4 battle stance facing right: near fist raised forward, far hand in the hoodie pocket.
- Spiky swept-back hair (fixed style), 3 tones with a highlight sheen; stern eyes with a violet iris.
- Ink outline outside and ink lines between body parts; checker dithering on the hoodie hem.
- Starter outfit: white hoodie with drawstrings and pocket, violet trousers, mint sneakers with peach soles.
- Layers: body + hair → outfit → hat; pet stands beside. Idle: whole sprite bobs 1 art pixel.
- Shown at ×3 (variants), ×4 (player card) and ×6 — always whole-number scales.

**Swaps (same pixels, different colors):**

| | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Skin base / shade | `#fce1cc` / `#ebb18c` | `#ebb18c` / `#c98d6b` | `#b97a55` / `#8a5638` | `#6e4630` / `#4a2e20` |
| Hair base / shade / highlight | ink `#574a50 #413436 #7f7091` | brown `#8a5a40 #5c3a28 #b5835e` | blonde `#f2d38a #c9a456 #fff4cf` | silver `#d7d6d6 #a9a4aa #ffffff` |

## Type

**Departure Mono** (SIL OFL 1.1, © Helena Zhang), unmodified, `design/fonts/`. 11px grid, real
**Ө ө Ү ү**, slashed zero. Sizes: 22px body (line 33), 33px titles (44), 44px hero numbers (55).

## Components

- **9-slice frames:** 1px ink outline with stepped corners via `border-image`, exactly ×2.
- **Card:** white, ink outline, 4px soft gray (`line`) offset shadow. **Mint card** for secondary areas.
- **Dialog box:** double ink frame (handheld text-box style) for messages and the player card.
- **Title strip:** violet band (or mint with ink underline) inside a card.
- **Section header:** violet ▶ cursor + title + dashed `line` rule.
- **Banner:** violet box, white uppercase text.
- **Place frames:** Store = white with peach diagonal stripes; Guild = white with violet-light stripes.
- **Buttons:** violet primary · white secondary · peach "buy" · rose danger · disabled gray.
  2px darker bottom edge; pressed moves it to the top.
- **Inputs:** white, mint inner top shade; focus outline turns violet; pixel arrow on selects.
- **Badges:** Хийх white · Хоцорсон rose · Дууссан violet · warning butter · tag violet-light.
- **Bars:** level = violet fill with tick marks on a mint track; daily XP / quests = segments,
  butter near the 400 cap.
- **Slots:** mint with inner shade; selected = violet corner brackets; locked = white with gray outline.
- **Nav:** white bar with a 2px ink underline; active tab = 6px violet underline; coin count right.

## Rules

Always: white > mint > violet · 2px grid · whole-number sprite scales · ink outline + soft gray
shadow, zero blur · font sizes 22/33/44 · icons are pixel sprites.
Never: blending gradients, transparency, blur, border-radius, non-integer scaling, or copying any
reference art.

Known limit: pixel-perfect at 100%/200% display scaling; at Windows 125%/150% the font's pixels may
look slightly uneven (browser limitation).
