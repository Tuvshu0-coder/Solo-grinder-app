<%-- Pomodoro: focus/break timer and lo-fi music. Everything moves in the browser: /js/pomodoro.js. --%>
<%@ include file="/WEB-INF/views/_top.jspf" %>
<ui:pageTitle title="Pomodoro" sub="Pick your focus time and study without skipping your breaks." />

<div class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]" id="pomodoro">
  <section class="panel">
    <div class="panel-head mint">
      <span data-phase-title>Focus time</span>
      <span class="muted" data-state>Ready</span>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-8 py-5">
      <div class="relative grid h-56 w-56 place-items-center">
        <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 220 220" aria-hidden="true">
          <circle cx="110" cy="110" r="96" fill="none" stroke="var(--line)" stroke-width="8" />
          <circle data-ring cx="110" cy="110" r="96" fill="none" stroke="var(--violet)" stroke-width="8"
                  stroke-dasharray="603.19" stroke-dashoffset="603.19" stroke-linecap="square" />
        </svg>
        <div class="relative text-center" role="timer" aria-live="off">
          <div class="text-3xl tabular-nums" data-clock>25:00</div>
          <div class="muted text-sm" data-phase>Focus</div>
        </div>
      </div>

      <div class="flex min-w-[180px] flex-col items-center gap-3">
        <div class="flex gap-2">
          <button type="button" class="btn" data-mode="focus">Focus</button>
          <button type="button" class="btn-sec" data-mode="break">Break</button>
        </div>
        <div class="flex gap-3">
          <button type="button" class="btn" data-start>Start</button>
          <button type="button" class="btn-sec" data-pause hidden>Pause</button>
          <button type="button" class="btn-ghost" data-restart>Restart</button>
        </div>
      </div>
    </div>

    <div class="mt-2 border-t-2 border-dashed border-[var(--line)] pt-4">
      <h2 class="card-title">Timer settings</h2>
      <form data-settings class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label class="block">
          <span class="label">Focus (minutes)</span>
          <input class="input" type="number" min="1" max="180" value="25" data-minutes="focus">
        </label>
        <label class="block">
          <span class="label">Break (minutes)</span>
          <input class="input" type="number" min="1" max="60" value="5" data-minutes="break">
        </label>
        <button type="submit" class="btn-sec">Save</button>
      </form>
      <p class="muted mb-0 mt-2 text-sm">Default: 25 minutes of focus, then a 5 minute break.</p>
    </div>
    <p class="dialog mt-4 mb-0" role="status" data-notice hidden></p>
  </section>

  <section class="panel">
    <div class="panel-head">
      <span>Study corner</span>
      <span class="muted">LO-FI STUDY</span>
    </div>
    <div class="relative isolate h-[270px] overflow-hidden border-4 border-[var(--ink)] bg-[var(--violet-light)] sm:h-[310px]">
      <div class="absolute inset-0 bg-[linear-gradient(180deg,#e6e1ec_0%,#f0f9e8_100%)]"></div>
      <div class="absolute left-1/2 top-5 h-24 w-36 -translate-x-1/2 border-4 border-[var(--ink)] bg-[var(--violet)] sm:top-7 sm:h-28 sm:w-44">
        <div class="absolute inset-2 border-2 border-[var(--violet-dark)] bg-[var(--violet-light)]">
          <span class="absolute left-5 top-4 h-2 w-2 bg-[var(--butter)]"></span>
          <span class="absolute right-6 top-8 h-2 w-2 bg-[var(--white)]"></span>
          <span class="absolute bottom-3 left-10 h-2 w-2 bg-[var(--white)]"></span>
        </div>
        <span class="absolute -bottom-4 left-1/2 h-4 w-8 -translate-x-1/2 bg-[var(--ink)]"></span>
      </div>
      <div class="absolute bottom-[90px] left-1/2 z-0 h-3 w-28 -translate-x-1/2 border-2 border-[var(--ink)] bg-[var(--violet-dark)]"></div>
      <div class="absolute left-1/2 top-[70px] -translate-x-1/2 sm:top-[90px]" data-hero>
        <div class="absolute -z-10 left-1/2 top-14 h-28 w-32 -translate-x-1/2 border-x-[10px] border-t-[10px] border-[var(--violet-dark)] bg-[var(--violet)]"></div>
        ${sg:hero(2, false)}
      </div>
      <div class="absolute inset-x-0 bottom-0 h-[88px] border-t-8 border-[var(--ink)] bg-[var(--peach)]">
        <div class="absolute left-[calc(50%-62px)] top-3 flex items-center">
          <span class="h-2 w-8 bg-[var(--violet-dark)]"></span><span class="h-2 w-3 bg-[var(--peach-dark)]"></span>
        </div>
        <div class="absolute left-[calc(50%+21px)] top-3 flex items-center">
          <span class="h-2 w-3 bg-[var(--peach-dark)]"></span><span class="h-2 w-8 bg-[var(--violet-dark)]"></span>
        </div>
        <div class="absolute left-[12%] top-3 h-2 w-12 bg-[var(--peach-dark)] sm:left-[18%] sm:w-16"></div>
        <div class="absolute right-[12%] top-2 h-5 w-10 border-2 border-[var(--ink)] bg-[var(--mint)] sm:right-[18%] sm:w-14">
          <span class="absolute bottom-full left-2 h-5 w-1 bg-[var(--mint-dark)]"></span>
          <span class="absolute bottom-full left-1 top-[-18px] h-3 w-3 bg-[var(--mint-dark)]"></span>
          <span class="absolute bottom-full right-2 top-[-18px] h-3 w-3 bg-[var(--mint-dark)]"></span>
        </div>
        <div class="absolute left-1/2 top-2 h-8 w-20 -translate-x-1/2 border-2 border-[var(--ink)] bg-[var(--violet-dark)] sm:w-24">
          <div class="absolute inset-x-2 top-1 h-1 border-t border-dashed border-[var(--white)]"></div>
          <div class="absolute inset-x-2 top-4 flex justify-between">
            <i class="h-1 w-2 bg-[var(--white)]"></i><i class="h-1 w-2 bg-[var(--white)]"></i><i class="h-1 w-2 bg-[var(--white)]"></i><i class="h-1 w-2 bg-[var(--white)]"></i><i class="h-1 w-2 bg-[var(--white)]"></i>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="card-title mb-0">Quiet lo-fi music</h2>
        <p class="muted m-0 text-sm">Soft music made in your browser, nothing to download</p>
      </div>
      <button type="button" class="btn" data-music aria-pressed="false">Play music</button>
    </div>
    <p class="mt-2 mb-0 text-sm text-rose-dark" role="alert" data-audio-error hidden></p>
  </section>
</div>
<script src="${ctx}/js/pomodoro.js"></script>
<%@ include file="/WEB-INF/views/_bottom.jspf" %>
