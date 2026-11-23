"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyItem, saveAvatar } from "@/actions/avatar";
import {
  CATEGORIES, EYE_COLORS, HAIR_COLORS, ITEM_BY_ID, SKINS, itemId, itemsOf,
  type Avatar, type Category, type Item,
} from "@/lib/avatar";
import { COLORS } from "@/lib/sprites";
import { AvatarSprite, Coin, Hero, Icon } from "./pixel";

type Tab = "body" | Category;

// how much of the 52x100 canvas each category's option cards show: [firstRow, rows, scale]
const THUMB: Record<Category, [number, number, number]> = {
  hair: [4, 44, 2], eyes: [4, 44, 2], hat: [4, 44, 2], glasses: [4, 44, 2], extra: [4, 56, 2], outfit: [0, 100, 1],
};

export default function CharacterEditor({
  initial, owned: ownedInit, coins: coinsInit, mode,
}: { initial: Avatar; owned: string[]; coins: number; mode: "create" | "edit" }) {
  const router = useRouter();
  const [a, setA] = useState<Avatar>(initial);
  const [tab, setTab] = useState<Tab>("body");
  const [owned, setOwned] = useState(() => new Set(ownedInit));
  const [coins, setCoins] = useState(coinsInit);
  const [note, setNote] = useState<{ err?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const has = (it: Item) => it.price === 0 || owned.has(itemId(it));
  const worn = (c: Category) => (a.items[c] ? ITEM_BY_ID.get(`${c}/${a.items[c]}`) : undefined);
  const unpaid = CATEGORIES.map((c) => worn(c.key)).filter((it): it is Item => !!it && !has(it));

  const wear = (c: Category, key: string | null) => {
    setNote(null);
    setA((p) => ({ ...p, items: { ...p.items, [c]: key }, tint: { ...p.tint, [c]: 0 } }));
  };

  function buy(it: Item) {
    start(async () => {
      const r = await buyItem(itemId(it));
      if (r.error) return setNote({ err: true, text: r.error });
      setOwned((s) => new Set(s).add(itemId(it)));
      if (r.coins !== undefined) setCoins(r.coins);
      setNote({ text: `"${it.name}" таных боллоо!` });
      router.refresh();
    });
  }

  function save() {
    start(async () => {
      const r = await saveAvatar(JSON.stringify(a));
      if (r?.error) return setNote({ err: true, text: r.error });
      setNote({ text: "Дүр хадгалагдлаа." });
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
      {/* ---------- preview ---------- */}
      <section className="panel w-full md:sticky md:top-6 md:w-[236px]" aria-label="Таны дүр">
        <div className="stage">
          <Hero avatar={a} scale={3} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="muted">Зоос</span>
          <span className="flex items-center gap-2"><Coin scale={2} />{coins.toLocaleString()}</span>
        </div>
        {unpaid.length > 0 && (
          <p className="mt-3 mb-0 text-[var(--rose-dark)]">
            Өмсөж үзэж байна: {unpaid.map((it) => it.name).join(", ")}. Хадгалахын тулд эхлээд худалдаж аваарай.
          </p>
        )}
        <button type="button" className="btn mt-4 w-full" disabled={pending || unpaid.length > 0} onClick={save}>
          {mode === "create" ? "Эхлэх" : "Хадгалах"}
        </button>
        {note && (
          <p className={`mt-3 mb-0 ${note.err ? "text-[var(--rose-dark)]" : ""}`} role={note.err ? "alert" : "status"}>
            {note.text}
          </p>
        )}
      </section>

      {/* ---------- options ---------- */}
      <section className="panel min-w-0">
        <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Ангилал">
          {[{ key: "body" as Tab, label: "Төрх" }, ...CATEGORIES].map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? "btn" : "btn-sec"}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "body" ? (
          <>
            <Swatches label="Арьсны өнгө" value={a.skin} onPick={(i) => setA({ ...a, skin: i })}
              colors={SKINS.map((s) => ({ name: s.name, hex: s.s[0] }))} />
            <Swatches label="Үсний өнгө" value={a.hairColor} onPick={(i) => setA({ ...a, hairColor: i })}
              colors={HAIR_COLORS.map((h) => ({ name: h.name, hex: h.c[0] }))} />
            <Swatches label="Нүдний өнгө" value={a.eyeColor} onPick={(i) => setA({ ...a, eyeColor: i })}
              colors={EYE_COLORS.map((e) => ({ name: e.name, hex: e.c }))} />
          </>
        ) : (
          <ItemPicker
            cat={tab}
            avatar={a}
            has={has}
            onWear={(key) => wear(tab, key)}
            onTint={(i) => setA({ ...a, tint: { ...a.tint, [tab]: i } })}
            onBuy={buy}
            coins={coins}
            pending={pending}
          />
        )}
      </section>
    </div>
  );
}

function ItemPicker({ cat, avatar, has, onWear, onTint, onBuy, coins, pending }: {
  cat: Category; avatar: Avatar; has: (it: Item) => boolean; onWear: (key: string | null) => void;
  onTint: (i: number) => void; onBuy: (it: Item) => void; coins: number; pending: boolean;
}) {
  const { optional } = CATEGORIES.find((c) => c.key === cat)!;
  const [y0, rows, scale] = THUMB[cat];
  const cur = avatar.items[cat];
  const curItem = cur ? ITEM_BY_ID.get(`${cat}/${cur}`) : undefined;
  const thumb = (key: string | null) => (
    <AvatarSprite avatar={{ ...avatar, items: { ...avatar.items, [cat]: key }, tint: { ...avatar.tint, [cat]: key === cur ? avatar.tint[cat] : 0 } }} crop={[y0, rows]} scale={scale} />
  );

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-4">
        {optional && (
          <button type="button" className={`pick ${cur === null ? "on" : ""}`} aria-pressed={cur === null} onClick={() => onWear(null)}>
            <span className="pick-art">{thumb(null)}</span>
            <span>Байхгүй</span>
          </button>
        )}
        {itemsOf(cat).map((it) => {
          const mine = has(it);
          return (
            <button key={it.key} type="button" className={`pick ${cur === it.key ? "on" : ""}`} aria-pressed={cur === it.key} onClick={() => onWear(it.key)}>
              <span className="pick-art">{thumb(it.key)}</span>
              <span className="text-center">{it.name}</span>
              <span className="muted flex items-center gap-2">
                {it.price === 0 ? "Үнэгүй" : mine ? "Таных" : <><Icon name="lock" scale={2} color={COLORS.gray} /><Coin scale={1} />{it.price}</>}
              </span>
            </button>
          );
        })}
      </div>

      {curItem?.colors && (
        <div className="mt-6">
          <Swatches label="Өнгө" value={avatar.tint[cat] ?? 0} onPick={onTint}
            colors={curItem.colors.map((v) => ({ name: v.name, hex: v.palette.U ?? v.palette.a ?? Object.values(v.palette)[0] }))} />
        </div>
      )}

      {curItem && !has(curItem) && (
        <div className="dialog mt-5 flex flex-wrap items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            {curItem.name} — <Coin scale={2} /> {curItem.price}
          </span>
          <button type="button" className="btn-buy" disabled={pending || coins < curItem.price} onClick={() => onBuy(curItem)}>
            {coins < curItem.price ? `${curItem.price - coins} зоос дутуу` : "Худалдаж авах"}
          </button>
        </div>
      )}
    </>
  );
}

function Swatches({ label, colors, value, onPick }: {
  label: string; colors: { name: string; hex: string }[]; value: number; onPick: (i: number) => void;
}) {
  return (
    <fieldset className="m-0 mb-5 border-0 p-0">
      <legend className="label mb-2">{label}: <span className="muted">{colors[value]?.name}</span></legend>
      <div className="flex flex-wrap gap-3">
        {colors.map((c, i) => (
          <button
            key={c.name}
            type="button"
            className={`swatch ${i === value ? "on" : ""}`}
            style={{ background: c.hex }}
            title={c.name}
            aria-label={c.name}
            aria-pressed={i === value}
            onClick={() => onPick(i)}
          />
        ))}
      </div>
    </fieldset>
  );
}
