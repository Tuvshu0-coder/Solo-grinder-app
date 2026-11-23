// Pixel-art building blocks. Sprite data comes from src/lib/sprites.ts (generated from design/).
import type { CSSProperties } from "react";
import {
  AVATAR_H, AVATAR_SHADOW_TOP, AVATAR_W, COIN, COIN_PALETTE, COLORS, FLAME_PALETTE, HERO_SHADOW,
  ICON_CHECK, ICON_CURSOR, ICON_FLAME, ICON_LOCK, ICON_MEDAL, LOCK_PALETTE, MEDAL_PALETTE, RANK_STYLE,
  type Palette, type SpriteData,
} from "@/lib/sprites";
import { avatarLayers, DEFAULT_AVATAR, type Avatar } from "@/lib/avatar";

type Run = { x: number; y: number; w: number; fill: string };

function runs(data: SpriteData, palette: Palette): Run[] {
  const out: Run[] = [];
  data.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const fill = palette[row[x]];
      if (!fill) {
        x++;
        continue;
      }
      let n = 1;
      while (x + n < row.length && row[x + n] === row[x]) n++;
      out.push({ x, y, w: n, fill });
      x += n;
    }
  });
  return out;
}

/** Palette-array sprite rendered as crisp SVG at a whole-number scale. */
export function Sprite({
  data, palette, scale = 2, className = "", style, title,
}: { data: SpriteData; palette: Palette; scale?: number; className?: string; style?: CSSProperties; title?: string }) {
  return (
    <svg
      className={`sprite ${className}`}
      width={data.w * scale}
      height={data.h * scale}
      viewBox={`0 0 ${data.w} ${data.h}`}
      shapeRendering="crispEdges"
      style={style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {runs(data, palette).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

/** The layered character as one crisp SVG. `crop` = [firstRow, rowCount] shows only part of the canvas. */
export function AvatarSprite({
  avatar = DEFAULT_AVATAR, scale = 2, crop, className = "", title,
}: { avatar?: Avatar; scale?: number; crop?: [number, number]; className?: string; title?: string }) {
  const [y0, h] = crop ?? [0, AVATAR_H];
  return (
    <svg
      className={`sprite ${className}`}
      width={AVATAR_W * scale}
      height={h * scale}
      viewBox={`0 ${y0} ${AVATAR_W} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {avatarLayers(avatar).map((layer, li) =>
        runs({ w: AVATAR_W, h: AVATAR_H, rows: layer.rows }, layer.palette).map((r, i) => (
          <rect key={`${li}-${i}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
        )),
      )}
    </svg>
  );
}

/** The player's character with ground shadow and 1px idle bob. */
export function Hero({ avatar, scale = 4, bob = true }: { avatar?: Avatar; scale?: number; bob?: boolean }) {
  const style = { width: AVATAR_W * scale, height: AVATAR_H * scale, "--px-step": `${scale}px` } as CSSProperties;
  return (
    <span className="hero" style={style}>
      <Sprite data={HERO_SHADOW} palette={{ x: COLORS.line }} scale={scale} className="hero-shadow" style={{ top: AVATAR_SHADOW_TOP * scale }} />
      <AvatarSprite avatar={avatar} scale={scale} className={bob ? "hero-sprite" : ""} title="Your character" />
    </span>
  );
}

export function Coin({ scale = 2 }: { scale?: number }) {
  return <Sprite data={COIN} palette={COIN_PALETTE} scale={scale} title="coin" />;
}

export function Icon({ name, scale = 3, color }: { name: "check" | "cursor" | "flame" | "lock" | "medal"; scale?: number; color?: string }) {
  if (name === "flame") return <Sprite data={ICON_FLAME} palette={FLAME_PALETTE} scale={scale} />;
  if (name === "medal") return <Sprite data={ICON_MEDAL} palette={MEDAL_PALETTE} scale={scale} />;
  if (name === "lock") return <Sprite data={ICON_LOCK} palette={color ? { ...LOCK_PALETTE, y: color } : LOCK_PALETTE} scale={scale} />;
  const data = name === "check" ? ICON_CHECK : ICON_CURSOR;
  return <Sprite data={data} palette={{ "#": color ?? (name === "check" ? COLORS.white : COLORS.violet) }} scale={scale} />;
}

/** Discrete progress: one block per step (or `blocks` blocks scaled to max). */
export function Seg({ value, max, blocks, tone = "violet" }: { value: number; max: number; blocks?: number; tone?: "violet" | "butter" }) {
  const n = Math.max(1, blocks ?? max);
  const filled = max > 0 ? Math.round((Math.min(value, max) / max) * n) : 0;
  return (
    <span className={`seg ${tone === "butter" ? "butter" : ""}`} role="img" aria-label={`${Math.min(value, max)}/${max}`}>
      [
      {Array.from({ length: n }, (_, i) => (
        <b key={i} className={i < filled ? "" : "off"} />
      ))}
      ]
    </span>
  );
}

/** Continuous progress bar with tick marks. `color` is accepted for older call sites. */
export function Bar({ value, max, tone, color }: { value: number; max: number; tone?: "violet" | "butter"; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const butter = tone === "butter" || (color ?? "").includes("warn");
  return (
    <div className={`track ${butter ? "butter" : ""}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function RankBadge({ rank, big }: { rank: string; big?: boolean }) {
  const st = RANK_STYLE[rank] ?? RANK_STYLE.E;
  return (
    <span className={`rank ${big ? "" : "sm"}`} style={{ borderImageSource: `var(--frame-rank-${rank})`, color: st.text }} title={`Rank ${rank}`}>
      {rank}
    </span>
  );
}
