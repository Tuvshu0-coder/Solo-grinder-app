import { PageTitle } from "@/components/ui";
import PomodoroTimer from "@/components/PomodoroTimer";

export default function PomodoroPage() {
  return (
    <>
      <PageTitle sub="Pick your focus time and study without skipping your breaks.">
        Pomodoro
      </PageTitle>
      <PomodoroTimer />
    </>
  );
}
