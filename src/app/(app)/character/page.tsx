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
      <PageTitle sub="Даалгавар хийж цуглуулсан зоосоороо шинэ үс, хувцас, малгай аваарай. Худалдаж авахаас өмнө өмсөж үзэж болно.">
        Дүр ба дэлгүүр
      </PageTitle>
      <CharacterEditor initial={normalizeAvatar(user.avatar)} owned={owned.map((o) => o.itemId)} coins={user.coins} mode="edit" />
    </>
  );
}
