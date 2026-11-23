// Character creator catalogue: what can be worn, what it costs, its colours and draw order.
// Pixel art lives in design/sprites/avatar/<category>/<key>.txt (exported to AVATAR_LAYERS in sprites.ts).
//
// To add an item: draw design/sprites/avatar/<category>/<key>.txt (copy an existing file — 52x100,
// '.' = transparent), run `python -P design/build-app-assets.py`, then add an entry to ITEMS below.
import { AVATAR_LAYERS, HERO_SKINS, type Palette } from "./sprites";

export type Category = "hair" | "eyes" | "outfit" | "hat" | "glasses" | "extra";

export const CATEGORIES: { key: Category; label: string; optional: boolean }[] = [
  { key: "hair", label: "Hair", optional: false },
  { key: "eyes", label: "Eyes", optional: false },
  { key: "outfit", label: "Outfit", optional: false },
  { key: "hat", label: "Hat", optional: true },
  { key: "glasses", label: "Glasses", optional: true },
  { key: "extra", label: "Extras", optional: true },
];

export type ColorVariant = { name: string; palette: Palette };

export type Item = {
  category: Category;
  key: string; // file name in design/sprites/avatar/<category>/
  name: string;
  price: number; // coins; 0 = free for everyone
  z?: number; // draw order override (higher = on top); defaults to the category's
  palette?: Palette; // fixed colours for letters this layer uses
  colors?: ColorVariant[]; // free colour choices (merged over `palette`)
};

/** Default draw order: body 0 → eyes 10 → outfit 20 → hair 30 → glasses 40 → hat 50. */
const CATEGORY_Z: Record<Category, number> = { eyes: 10, outfit: 20, extra: 25, hair: 30, glasses: 40, hat: 50 };

// Shared letters: O outline · S/s skin · H/J hair · P iris · W white · R blush · M mouth · F/f shoes
const BASE: Palette = { O: "#16121c", W: "#ececf2", R: "#f0b6ac", M: "#783a3a", F: "#0e0c10", f: "#3c3840" };

// Outfit letters: U main · u light · g dark · q collar/accent · L trim/buttons · K sash
const NAVY = { U: "#222642", u: "#3a4066", g: "#16182c" };
const BLACK = { U: "#1e1e24", u: "#34343e", g: "#121216" };
const MAROON = { U: "#5a1f2a", u: "#7a3340", g: "#3a121a" };
const GRAY = { U: "#6b7078", u: "#8a9098", g: "#4a4e55" };
const RED = { U: "#a83a44", u: "#c9636b", g: "#7a2830" };
const GREEN = { U: "#3f6b4f", u: "#568a68", g: "#2a4a36" };
const BLUE = { U: "#2c4f8a", u: "#4369a8", g: "#1d355e" };

export const ITEMS: Item[] = [
  // ---- hair
  { category: "hair", key: "short", name: "Neat", price: 0 },
  { category: "hair", key: "messy", name: "Messy", price: 0 },
  { category: "hair", key: "long", name: "Long", price: 300 },
  { category: "hair", key: "spiky", name: "Spiky", price: 400 },

  // ---- eyes
  { category: "eyes", key: "normal", name: "Normal", price: 0 },
  { category: "eyes", key: "sharp", name: "Sharp", price: 0 },
  { category: "eyes", key: "happy", name: "Happy", price: 150 },

  // ---- outfits
  {
    category: "outfit", key: "uniform", name: "School uniform", price: 0,
    palette: { q: "#bec0cc", L: "#d6ac48" },
    colors: [{ name: "Navy", palette: NAVY }, { name: "Black", palette: BLACK }, { name: "Maroon", palette: MAROON }],
  },
  {
    category: "outfit", key: "hoodie", name: "Hoodie", price: 300,
    palette: { q: "#3a3e44" },
    colors: [{ name: "Gray", palette: GRAY }, { name: "Red", palette: RED }, { name: "Green", palette: GREEN }],
  },
  {
    category: "outfit", key: "track", name: "Tracksuit", price: 400,
    colors: [{ name: "Black", palette: BLACK }, { name: "Blue", palette: BLUE }, { name: "Red", palette: RED }],
  },
  {
    category: "outfit", key: "deel", name: "Mongolian deel", price: 800,
    colors: [
      { name: "Blue", palette: { ...BLUE, L: "#d6ac48", K: "#d9822b" } },
      { name: "Red", palette: { U: "#8a2c35", u: "#a8434d", g: "#5e1d24", L: "#f2cc6b", K: "#2c4f8a" } },
      { name: "Green", palette: { U: "#2f6b55", u: "#45876d", g: "#1f4a3a", L: "#d6ac48", K: "#c9636b" } },
    ],
  },

  // ---- hats (letters a main · b light · c dark · d detail)
  {
    category: "hat", key: "cap", name: "Cap", price: 250,
    colors: [
      { name: "Red", palette: { a: "#c9636b", b: "#e08890", c: "#9e3f47", d: "#fcfbfe" } },
      { name: "Navy", palette: { a: "#2c3a6a", b: "#4a5a8f", c: "#1a2244", d: "#f2cc6b" } },
      { name: "Black", palette: { a: "#26262e", b: "#44444f", c: "#121216", d: "#fcfbfe" } },
    ],
  },
  {
    category: "hat", key: "beanie", name: "Beanie", price: 300,
    colors: [
      { name: "Pink", palette: { a: "#c9636b", b: "#e08890", c: "#9e3f47", d: "#fcfbfe" } },
      { name: "Green", palette: { a: "#4f8a68", b: "#6fa886", c: "#2a4a36", d: "#f2cc6b" } },
      { name: "Yellow", palette: { a: "#f2cc6b", b: "#f7dc96", c: "#c98d6b", d: "#fcfbfe" } },
    ],
  },
  {
    category: "hat", key: "crown", name: "Crown", price: 2000,
    palette: { a: "#f2cc6b", b: "#c98d6b", c: "#c9636b", d: "#fcfbfe" },
  },

  // ---- glasses
  { category: "glasses", key: "round", name: "Glasses", price: 0, palette: { b: "#688496" } },
  { category: "glasses", key: "sun", name: "Sunglasses", price: 250, palette: { a: "#1a1a22", b: "#5a6a8a" } },

  // ---- extras
  {
    category: "extra", key: "scarf", name: "Scarf", price: 350,
    colors: [
      { name: "Red", palette: { a: "#c9636b", b: "#fcfbfe", c: "#c9636b" } },
      { name: "Blue", palette: { a: "#2c4f8a", b: "#f2cc6b", c: "#2c4f8a" } },
    ],
  },
  {
    category: "extra", key: "headphones", name: "Headphones", price: 500, z: 45,
    colors: [
      { name: "Black", palette: { a: "#2a2a33", c: "#c9636b" } },
      { name: "White", palette: { a: "#e5e9ec", c: "#40514e" } },
    ],
  },
];

export const itemId = (it: Pick<Item, "category" | "key">) => `${it.category}/${it.key}`;
export const ITEM_BY_ID = new Map(ITEMS.map((it) => [itemId(it), it]));
export const itemsOf = (c: Category) => ITEMS.filter((it) => it.category === c);

// ---- free body colours
export const SKINS: { name: string; s: [string, string] }[] = HERO_SKINS.map((s, i) => ({
  name: ["Fair", "Tan", "Brown", "Dark"][i] ?? `Skin ${i + 1}`,
  s: [s[0], s[1]],
}));
export const HAIR_COLORS: { name: string; c: [string, string] }[] = [
  { name: "Brown", c: ["#422e22", "#6e503a"] },
  { name: "Black", c: ["#1f1a1e", "#3d3640"] },
  { name: "Blonde", c: ["#c9963f", "#e8c46a"] },
  { name: "Silver", c: ["#9a97a3", "#c9c6cc"] },
  { name: "Red", c: ["#8a3a2a", "#b4573f"] },
  { name: "Blue", c: ["#2f4a7a", "#4f6fa8"] },
  { name: "Pink", c: ["#c9748e", "#e8a0b4"] },
  { name: "White", c: ["#d8d4dc", "#f4f2f6"] },
];
export const EYE_COLORS: { name: string; c: string }[] = [
  { name: "Brown", c: "#3a281e" },
  { name: "Black", c: "#1a1a22" },
  { name: "Blue", c: "#2f5f9a" },
  { name: "Green", c: "#3f7a4f" },
  { name: "Amber", c: "#9a6a1f" },
  { name: "Red", c: "#8a2f3a" },
];

// ---- the saved look (User.avatar, JSON)
export type Avatar = {
  skin: number;
  hairColor: number;
  eyeColor: number;
  items: Record<Category, string | null>; // item key per category (null = none, optional categories only)
  tint: Partial<Record<Category, number>>; // chosen colour variant per category
};

export const DEFAULT_AVATAR: Avatar = {
  skin: 0,
  hairColor: 0,
  eyeColor: 0,
  items: { hair: "messy", eyes: "normal", outfit: "uniform", hat: null, glasses: "round", extra: null },
  tint: {},
};

const clampIdx = (v: unknown, n: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < n ? (v as number) : 0);

/**
 * Parses stored/posted JSON into a valid Avatar. Unknown items fall back to the default; items the
 * player doesn't own fall back too when `owns` is given.
 */
export function normalizeAvatar(raw: unknown, owns?: (id: string) => boolean): Avatar {
  let o: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try { o = JSON.parse(raw) ?? {}; } catch { o = {}; }
  } else if (raw && typeof raw === "object") o = raw as Record<string, unknown>;
  const rawItems = (o.items ?? {}) as Record<string, unknown>;
  const rawTint = (o.tint ?? {}) as Record<string, unknown>;
  const items = {} as Avatar["items"];
  const tint: Avatar["tint"] = {};
  for (const { key: c, optional } of CATEGORIES) {
    const k = rawItems[c];
    const it = typeof k === "string" ? ITEM_BY_ID.get(`${c}/${k}`) : undefined;
    const ok = it && (it.price === 0 || !owns || owns(itemId(it)));
    items[c] = ok ? it.key : k === null && optional ? null : DEFAULT_AVATAR.items[c];
    const chosen = items[c] ? ITEM_BY_ID.get(`${c}/${items[c]}`) : undefined;
    if (chosen?.colors) tint[c] = clampIdx(rawTint[c], chosen.colors.length);
  }
  return {
    skin: clampIdx(o.skin, SKINS.length),
    hairColor: clampIdx(o.hairColor, HAIR_COLORS.length),
    eyeColor: clampIdx(o.eyeColor, EYE_COLORS.length),
    items,
    tint,
  };
}

export type Layer = { rows: string[]; palette: Palette };

/** The avatar as palette-array layers in draw order. */
export function avatarLayers(a: Avatar): Layer[] {
  const skin = SKINS[a.skin]?.s ?? SKINS[0].s;
  const hair = HAIR_COLORS[a.hairColor]?.c ?? HAIR_COLORS[0].c;
  const body: Palette = { ...BASE, S: skin[0], s: skin[1], H: hair[0], J: hair[1], P: EYE_COLORS[a.eyeColor]?.c ?? EYE_COLORS[0].c };
  const out: { z: number; layer: Layer }[] = [{ z: 0, layer: { rows: AVATAR_LAYERS["body/base"], palette: body } }];
  for (const { key: c } of CATEGORIES) {
    const k = a.items[c];
    const it = k ? ITEM_BY_ID.get(`${c}/${k}`) : undefined;
    const rows = it ? AVATAR_LAYERS[itemId(it)] : undefined;
    if (!it || !rows) continue;
    const variant = it.colors?.[a.tint[c] ?? 0]?.palette;
    out.push({ z: it.z ?? CATEGORY_Z[c], layer: { rows, palette: { ...body, ...it.palette, ...variant } } });
  }
  return out.sort((x, y) => x.z - y.z).map((o) => o.layer);
}
