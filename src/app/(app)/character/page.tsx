import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizeAvatar } from "@/lib/avatar";
import CharacterEditor from "@/components/CharacterEditor";
import { PageTitle } from "@/components/ui";

export default async function CharacterPage() {
  const user = await requireUser();
  const owned = await prisma.ownedItem.findMany({ where: { userId: user.id }, select: { itemId: true } });
  return (
    <>
      <PageTitle sub="Spend the coins you earn from tasks on new hair, outfits and hats. You can try things on before you buy.">
        Character & shop
      </PageTitle>
      <CharacterEditor initial={normalizeAvatar(user.avatar)} owned={owned.map((o) => o.itemId)} coins={user.coins} mode="edit" />
    </>
  );
}
