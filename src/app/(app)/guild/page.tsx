import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createGuild, joinGuild, kickMember, leaveGuild, setGuildQuest, transferLeader } from "@/actions/guild";
import { guildLeaderboard } from "@/lib/guild";
import { GUILD_COOLDOWN_MS, GUILD_MAX_MEMBERS, GUILD_QUEST_REWARD, minGuildQuestTarget } from "@/lib/rules";
import { GOAL_TYPES, TASK_TYPES } from "@/lib/labels";
import { fmt, weekStartKey } from "@/lib/time";
import { Bar, Dialog, Flash, PageTitle, type SP } from "@/components/ui";
import { Icon } from "@/components/pixel";
import { COLORS } from "@/lib/sprites";

// placing tiles reuse the rank frames: gold, light slate, gray, then white
const PLACE_FRAME = ["A", "D", "C"];

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
          <div className="dialog mb-8" role="status">
            Guild-ээс гарснаас хойш 7 хоног хүлээнэ. {fmt(cooldownUntil)}-с хойш дахин нэгдэх боломжтой.
          </div>
        )}
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          <form action={createGuild} className="panel grid gap-4">
            <div className="panel-head"><h2 className="m-0 text-base font-normal">Шинэ guild</h2></div>
            <div>
              <label className="label" htmlFor="g-name">Guild-ийн нэр</label>
              <input id="g-name" name="name" className="input" required maxLength={40} />
            </div>
            <button className="btn justify-self-start" disabled={!!coolingDown}>Guild үүсгэх</button>
          </form>
          <form action={joinGuild} className="panel grid gap-4">
            <div className="panel-head mint"><h2 className="m-0 text-base font-normal">Урилгаар нэгдэх</h2></div>
            <div>
              <label className="label" htmlFor="g-code">Урилгын код</label>
              <input id="g-code" name="code" className="input uppercase" placeholder="ж: 3FA9C21B" required />
            </div>
            <button className="btn justify-self-start" disabled={!!coolingDown}>Guild-д нэгдэх</button>
          </form>
        </div>
        <ul className="muted m-0 mt-8 grid list-none gap-1 p-0">
          <li>Нэг guild-д {GUILD_MAX_MEMBERS} хүртэл гишүүн.</li>
          <li>Leaderboard долоо хоног бүрийн Даваа гарагт шинэчлэгдэнэ.</li>
          <li>Guild quest биелбэл идэвхтэй гишүүн бүр +{GUILD_QUEST_REWARD} XP авна.</li>
        </ul>
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
  const topXp = Math.max(1, ...board.map((r) => r.weekXp));

  return (
    <>
      <PageTitle sub={`${guild.members.length}/${GUILD_MAX_MEMBERS} гишүүн. Энэ долоо хоног ${weekStart}-нд эхэлсэн.`}>
        {guild.name}
      </PageTitle>
      <Flash searchParams={searchParams} />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------- leaderboard ---------- */}
        <section className="panel">
          <div className="panel-head">
            <h2 className="m-0 text-base font-normal">Долоо хоногийн leaderboard</h2>
            <span>Нийт {totalWeekXp} XP</span>
          </div>
          <ol className="m-0 list-none p-0">
            {board.map((r, i) => {
              const me = r.userId === user.id;
              return (
                <li
                  key={r.userId}
                  className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${i > 0 ? "dash-sep" : ""} ${me ? "bg-violet-light" : ""}`}
                >
                  <span className="rank sm" style={{ borderImageSource: `var(--frame-rank-${PLACE_FRAME[i] ?? "E"})` }} aria-label={`${i + 1}-р байр`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3">
                      <span className="truncate">{r.username}</span>
                      {me && <span className="muted">(та)</span>}
                      {r.role === "LEADER" && <span className="badge badge-butter">Удирдагч</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="min-w-0 flex-1"><Bar value={r.weekXp} max={topXp} /></div>
                      <span className="w-[6ch] text-right">{r.weekXp}</span>
                    </div>
                    <div className="muted flex flex-wrap gap-x-5">
                      <span>{r.doneCount} дуусгасан</span>
                      <span>{r.earlyCount} эрт</span>
                    </div>
                  </div>
                  {isLeader && !me && (
                    <div className="col-span-2 sm:col-span-1">
                      <Dialog id={`member-${r.userId}`} label="Удирдах" title={r.username}>
                        <form action={transferLeader} className="grid gap-2">
                          <input type="hidden" name="userId" value={r.userId} />
                          <p className="m-0">Удирдагчийн эрхийг {r.username}-д шилжүүлнэ. Та энгийн гишүүн болно.</p>
                          <button className="btn-sec justify-self-start">Удирдагч болгох</button>
                        </form>
                        <form action={kickMember} className="dash-sep grid gap-2 pt-4">
                          <input type="hidden" name="userId" value={r.userId} />
                          <p className="m-0">{r.username} guild-ээс хасагдана.</p>
                          <button className="btn-danger justify-self-start">Гишүүнийг хасах</button>
                        </form>
                      </Dialog>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="muted m-0 mt-4">
            Guild-д байх хугацаанд энэ долоо хоногт авсан XP. Guild quest-ийн bonus тооцогдохгүй. Даваа гарагийн 00:00-д шинэчлэгдэнэ.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-8">
          {/* ---------- weekly guild quest ---------- */}
          <section className="panel">
            <div className="panel-head mint"><h2 className="m-0 text-base font-normal">Guild quest</h2></div>
            {quest ? (
              <div className="grid gap-2">
                <div>{quest.title}</div>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1"><Bar value={quest.progress} max={quest.targetValue} /></div>
                  <span className="muted">{Math.min(quest.progress, quest.targetValue)}/{quest.targetValue}</span>
                  {quest.isCompleted && <Icon name="check" scale={2} color={COLORS.violet} />}
                </div>
                <p className="muted m-0">
                  {quest.isCompleted
                    ? `Биелсэн. Энэ долоо хоногт даалгавар дуусгасан гишүүд +${GUILD_QUEST_REWARD} XP авсан.`
                    : `Биелвэл энэ долоо хоногт 1+ даалгавар дуусгасан гишүүн бүр +${GUILD_QUEST_REWARD} XP авна.`}
                </p>
              </div>
            ) : isLeader ? (
              <form action={setGuildQuest} className="grid gap-4">
                <div>
                  <label className="label" htmlFor="q-goal">Зорилт</label>
                  <select id="q-goal" name="goalType" className="input">
                    {Object.entries(GOAL_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="q-type">Даалгаврын төрөл</label>
                  <select id="q-type" name="taskType" className="input">
                    <option value="">Бүх төрөл</option>
                    {Object.entries(TASK_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <p className="muted m-0 mt-1">Зөвхөн «Тодорхой төрөл» зорилтод хэрэглэнэ.</p>
                </div>
                <div>
                  <label className="label" htmlFor="q-target">Нийт тоо (хамгийн багадаа {minTarget})</label>
                  <input id="q-target" name="targetValue" type="number" min={minTarget} defaultValue={minTarget} className="input" required />
                </div>
                <button className="btn">Quest тавих</button>
              </form>
            ) : (
              <p className="muted m-0">Удирдагч энэ долоо хоногийн quest-ийг хараахан тавиагүй байна.</p>
            )}
          </section>

          {/* ---------- invite + leave ---------- */}
          <section className="panel grid gap-4">
            <div className="panel-head mint"><h2 className="m-0 text-base font-normal">Урилгын код</h2></div>
            <div className="dialog select-all text-center text-3xl tracking-[0.15em]">{guild.inviteCode}</div>
            <p className="muted m-0">Найзууддаа энэ кодыг илгээгээд нэгдүүлээрэй.</p>
            <div className="dash-sep pt-4">
              <Dialog id="leave-guild" label="Guild-ээс гарах" btn="btn-danger" title="Guild-ээс гарах уу?">
                <p className="m-0">
                  Гарсны дараа 7 хоног өөр guild-д нэгдэх боломжгүй.
                  {isLeader && " Удирдагчийн эрх хамгийн удаан байгаа гишүүнд шилжинэ."}
                </p>
                <form action={leaveGuild}>
                  <button className="btn-danger">Guild-ээс гарах</button>
                </form>
              </Dialog>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
