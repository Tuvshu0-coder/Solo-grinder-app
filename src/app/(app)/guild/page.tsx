import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createGuild, joinGuild, kickMember, leaveGuild, setGuildQuest, transferLeader } from "@/actions/guild";
import { guildLeaderboard } from "@/lib/guild";
import { GUILD_COOLDOWN_MS, GUILD_MAX_MEMBERS, GUILD_QUEST_REWARD, minGuildQuestTarget } from "@/lib/rules";
import { GOAL_TYPES, TASK_TYPES } from "@/lib/labels";
import { fmt, weekStartKey } from "@/lib/time";
import { Bar, Flash, PageTitle, type SP } from "@/components/ui";

export default async function GuildPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const membership = await prisma.guildMember.findUnique({
    where: { userId: user.id },
    include: { guild: { include: { members: true } } },
  });

  if (!membership) {
    const cooldownUntil = user.guildLeftAt ? new Date(user.guildLeftAt.getTime() + GUILD_COOLDOWN_MS) : null;
    const coolingDown = cooldownUntil && cooldownUntil > new Date();
    return (
      <>
        <PageTitle sub="Найзуудтайгаа guild үүсгэж, долоо хоног бүрийн XP-ээр өрсөлдөөрэй.">Guild</PageTitle>
        <Flash searchParams={searchParams} />
        {coolingDown && (
          <div className="card mb-4 text-sm text-warn">
            Guild-ээс гарсны дараах 7 хоногийн хүлээлт: {fmt(cooldownUntil)} хүртэл.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <form action={createGuild} className="card space-y-3">
            <h2 className="card-title">Guild үүсгэх</h2>
            <input name="name" className="input" placeholder="Guild-ийн нэр" required maxLength={40} />
            <button className="btn" disabled={!!coolingDown}>Үүсгэх</button>
          </form>
          <form action={joinGuild} className="card space-y-3">
            <h2 className="card-title">Урилгын кодоор нэгдэх</h2>
            <input name="code" className="input uppercase" placeholder="ж: 3FA9C21B" required />
            <button className="btn" disabled={!!coolingDown}>Нэгдэх</button>
          </form>
        </div>
      </>
    );
  }

  const guild = membership.guild;
  const isLeader = membership.role === "LEADER";
  const weekStart = weekStartKey();
  const [board, quest] = await Promise.all([
    guildLeaderboard(guild.id),
    prisma.guildQuest.findUnique({ where: { guildId_weekStart: { guildId: guild.id, weekStart } } }),
  ]);
  const minTarget = minGuildQuestTarget(guild.members.length);
  const totalWeekXp = board.reduce((s, r) => s + r.weekXp, 0);

  return (
    <>
      <PageTitle sub={`${guild.members.length}/${GUILD_MAX_MEMBERS} гишүүн · Долоо хоног: ${weekStart}-аас`}>
        {guild.name}
      </PageTitle>
      <Flash searchParams={searchParams} />

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card md:col-span-2">
          <h2 className="card-title">Долоо хоногийн leaderboard</h2>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Гишүүн</th>
                <th>XP</th>
                <th>Дуусгасан</th>
                <th>Эрт</th>
                {isLeader && <th />}
              </tr>
            </thead>
            <tbody>
              {board.map((r, i) => (
                <tr key={r.userId} className={r.userId === user.id ? "bg-accent/10" : ""}>
                  <td className="font-bold">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                  <td>
                    {r.username}
                    {r.role === "LEADER" && <span className="badge ml-2 bg-warn/15 text-warn">Удирдагч</span>}
                  </td>
                  <td className="font-semibold">{r.weekXp}</td>
                  <td>{r.doneCount}</td>
                  <td>{r.earlyCount}</td>
                  {isLeader && (
                    <td className="text-right">
                      {r.userId !== user.id && (
                        <div className="flex justify-end gap-1">
                          <form action={transferLeader}>
                            <input type="hidden" name="userId" value={r.userId} />
                            <button className="btn-ghost text-xs">Удирдагч болгох</button>
                          </form>
                          <form action={kickMember}>
                            <input type="hidden" name="userId" value={r.userId} />
                            <button className="btn-danger text-xs">Хасах</button>
                          </form>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">
            Guild-д байх хугацаандаа энэ долоо хоногт авсан XP. Guild quest-ийн bonus тооцогдохгүй. Даваа гараг 00:00-д шинэчлэгдэнэ.
            Нийт: {totalWeekXp} XP.
          </p>
        </section>

        <div className="space-y-4">
          <section className="card">
            <h2 className="card-title">Энэ долоо хоногийн guild quest</h2>
            {quest ? (
              <>
                <div className="text-sm font-medium">{quest.title}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Bar value={quest.progress} max={quest.targetValue} color={quest.isCompleted ? "bg-good" : "bg-accent"} />
                  <span className="text-xs text-muted">{Math.min(quest.progress, quest.targetValue)}/{quest.targetValue}</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {quest.isCompleted
                    ? `Биелсэн! Энэ долоо хоногт даалгавар дуусгасан гишүүд +${GUILD_QUEST_REWARD} XP авсан.`
                    : `Биелвэл энэ долоо хоногт ≥1 даалгавар дуусгасан гишүүн бүр +${GUILD_QUEST_REWARD} XP авна.`}
                </p>
              </>
            ) : isLeader ? (
              <form action={setGuildQuest} className="space-y-2">
                <div>
                  <label className="label">Зорилтын төрөл</label>
                  <select name="goalType" className="input">
                    {Object.entries(GOAL_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Даалгаврын төрөл (зөвхөн «Тодорхой төрөл»-д)</label>
                  <select name="taskType" className="input">
                    <option value="">—</option>
                    {Object.entries(TASK_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Нийт зорилт (хамгийн багадаа {minTarget})</label>
                  <input name="targetValue" type="number" min={minTarget} defaultValue={minTarget} className="input" required />
                </div>
                <button className="btn w-full">Quest тавих</button>
              </form>
            ) : (
              <p className="text-sm text-muted">Удирдагч энэ долоо хоногийн quest-ийг тавиагүй байна.</p>
            )}
          </section>

          <section className="card space-y-3">
            <h2 className="card-title">Урилгын код</h2>
            <div className="rounded-lg bg-panel-2 px-3 py-2 text-center font-mono text-xl tracking-widest">{guild.inviteCode}</div>
            <form action={leaveGuild}>
              <button className="btn-danger w-full">Guild-ээс гарах</button>
            </form>
            <p className="text-xs text-muted">
              Гарсны дараа 7 хоног өөр guild-д нэгдэх боломжгүй.{isLeader && " Удирдагчийн эрх хамгийн удаан байгаа гишүүнд шилжинэ."}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
