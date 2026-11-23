"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { ITEM_BY_ID, normalizeAvatar } from "@/lib/avatar";

async function student() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/admin");
  return user;
}

/** Saves the look. Items the player doesn't own are dropped. The first save continues to onboarding. */
export async function saveAvatar(json: string): Promise<{ error?: string }> {
  const user = await student();
  const owned = await prisma.ownedItem.findMany({ where: { userId: user.id }, select: { itemId: true } });
  const ids = new Set(owned.map((o) => o.itemId));
  const avatar = normalizeAvatar(json, (id) => ids.has(id));
  await prisma.user.update({ where: { id: user.id }, data: { avatar: JSON.stringify(avatar) } });
  revalidatePath("/", "layout");
  if (!user.avatar) redirect("/subjects?msg=" + encodeURIComponent("Your character is ready! Now add your subjects."));
  return {};
}

/** Buys a shop item with coins. Returns the new balance. */
export async function buyItem(itemId: string): Promise<{ error?: string; coins?: number }> {
  const user = await student();
  const item = ITEM_BY_ID.get(itemId);
  if (!item || item.price <= 0) return { error: "This item can't be bought." };
  const result = await prisma.$transaction(async (tx) => {
    const have = await tx.ownedItem.findUnique({ where: { userId_itemId: { userId: user.id, itemId } } });
    if (have) return { error: "You already own this item." };
    // decrement only if the balance covers it — atomic, so a double click can't overspend
    const paid = await tx.user.updateMany({
      where: { id: user.id, coins: { gte: item.price } },
      data: { coins: { decrement: item.price } },
    });
    if (paid.count === 0) return { error: "Not enough coins. Complete tasks to earn more." };
    await tx.ownedItem.create({ data: { userId: user.id, itemId } });
    const { coins } = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { coins: true } });
    return { coins };
  });
  if (!result.error) revalidatePath("/", "layout");
  return result;
}
