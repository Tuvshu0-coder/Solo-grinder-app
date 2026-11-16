import { PageTitle } from "@/components/ui";
import PomodoroTimer from "@/components/PomodoroTimer";

export default function PomodoroPage() {
  return (
    <>
      <PageTitle sub="Төвлөрөх хугацаагаа сонгоод, завсарлагаа мартахгүйгээр хичээллээрэй.">
        Pomodoro
      </PageTitle>
      <PomodoroTimer />
    </>
  );
}
