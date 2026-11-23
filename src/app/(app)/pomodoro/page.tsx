import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { normalizeAvatar } from "@/lib/avatar";
import PomodoroTimer from "@/components/PomodoroTimer";

export default async function PomodoroPage() {
  const user = await requireUser();
  return (
    <>
      <PageTitle sub="Pick your focus time and study without skipping your breaks.">
        Pomodoro
      </PageTitle>
      <PomodoroTimer avatar={normalizeAvatar(user.avatar)} />
    </>
  );
}
