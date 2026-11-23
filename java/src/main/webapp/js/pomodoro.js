// Pomodoro timer + lo-fi music. Runs only in the browser (the server just sends the page).
// The countdown uses an end time, not "minus one every second", so it stays right in background tabs.
(function () {
  const root = document.getElementById("pomodoro");
  if (!root) return;

  const LIMITS = { focus: 180, break: 60 };
  const RING = 2 * Math.PI * 96; // circle radius 96 in the SVG
  const CHORDS = [
    [130.81, 164.81, 196, 246.94],
    [110, 130.81, 164.81, 196],
    [87.31, 110, 130.81, 164.81],
    [98, 123.47, 146.83, 196],
  ];

  const $ = (sel) => root.querySelector(sel);
  const el = {
    title: $("[data-phase-title]"), state: $("[data-state]"), clock: $("[data-clock]"), phase: $("[data-phase]"),
    ring: $("[data-ring]"), start: $("[data-start]"), pause: $("[data-pause]"), restart: $("[data-restart]"),
    focusBtn: $('[data-mode="focus"]'), breakBtn: $('[data-mode="break"]'), settings: $("[data-settings]"),
    focusMin: $('[data-minutes="focus"]'), breakMin: $('[data-minutes="break"]'), notice: $("[data-notice]"),
    music: $("[data-music]"), audioError: $("[data-audio-error]"), hero: $("[data-hero] .hero > svg:last-child"),
  };

  let mode = "focus";
  let running = false;
  let endsAt = null;     // ms timestamp while running
  let timeLeft = 25 * 60; // seconds
  let ticker = null;

  function minutes(input, m) {
    const n = Math.floor(Number(input.value));
    return Math.min(LIMITS[m], Math.max(1, Number.isFinite(n) ? n : 1));
  }
  const duration = (m) => minutes(m === "focus" ? el.focusMin : el.breakMin, m) * 60;

  function render() {
    const total = duration(mode);
    const progress = total > 0 ? (total - timeLeft) / total : 0;
    el.clock.textContent = String(Math.floor(timeLeft / 60)).padStart(2, "0") + ":" + String(timeLeft % 60).padStart(2, "0");
    el.title.textContent = mode === "focus" ? "Focus time" : "Break time";
    el.phase.textContent = mode === "focus" ? "Focus" : "Break";
    el.state.textContent = running ? "Running" : "Ready";
    el.ring.setAttribute("stroke", mode === "focus" ? "var(--violet)" : "var(--mint-dark)");
    el.ring.setAttribute("stroke-dasharray", RING.toFixed(2));
    el.ring.setAttribute("stroke-dashoffset", (RING * (1 - progress)).toFixed(2));
    el.focusBtn.className = mode === "focus" ? "btn" : "btn-sec";
    el.breakBtn.className = mode === "break" ? "btn" : "btn-sec";
    el.focusBtn.disabled = el.breakBtn.disabled = running;
    el.focusMin.disabled = el.breakMin.disabled = running;
    el.settings.querySelector("button").disabled = running;
    el.start.hidden = running;
    el.pause.hidden = !running;
    if (el.hero) el.hero.classList.toggle("hero-sprite", running); // the character bobs while you work
  }

  function notice(text) {
    el.notice.textContent = text;
    el.notice.hidden = !text;
  }

  function tick() {
    if (endsAt === null) return;
    timeLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    if (timeLeft === 0) {
      const finished = mode;
      stop();
      mode = finished === "focus" ? "break" : "focus";
      timeLeft = duration(mode);
      notice(finished === "focus" ? "Focus time is over. Start your break!" : "Break is over. Start your next focus session!");
    }
    render();
  }

  function stop() {
    running = false;
    endsAt = null;
    clearInterval(ticker);
  }

  function chooseMode(m) {
    stop();
    mode = m;
    timeLeft = duration(m);
    notice("");
    render();
  }

  el.start.addEventListener("click", () => {
    if (timeLeft <= 0) return;
    endsAt = Date.now() + timeLeft * 1000;
    running = true;
    notice("");
    ticker = setInterval(tick, 250);
    render();
  });
  el.pause.addEventListener("click", () => {
    if (endsAt !== null) timeLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    stop();
    render();
  });
  el.restart.addEventListener("click", () => chooseMode(mode));
  el.focusBtn.addEventListener("click", () => chooseMode("focus"));
  el.breakBtn.addEventListener("click", () => chooseMode("break"));
  for (const [input, m] of [[el.focusMin, "focus"], [el.breakMin, "break"]]) {
    input.addEventListener("input", () => {
      if (mode === m) {
        timeLeft = minutes(input, m) * 60;
        render();
      }
    });
  }
  el.settings.addEventListener("submit", (e) => {
    e.preventDefault();
    el.focusMin.value = minutes(el.focusMin, "focus");
    el.breakMin.value = minutes(el.breakMin, "break");
    stop();
    timeLeft = duration(mode);
    notice("");
    render();
  });

  // ---------- lo-fi music: soft chords made with the Web Audio API ----------
  let audio = null;
  let chordTimer = null;

  function playChord(context, output, index) {
    const now = context.currentTime;
    CHORDS[index % CHORDS.length].forEach((frequency, i) => {
      const osc = context.createOscillator();
      const env = context.createGain();
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.value = frequency;
      osc.detune.value = i === 3 ? -4 : 0;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(i === 0 ? 0.035 : 0.018, now + 0.5);
      env.gain.setTargetAtTime(0.0001, now + 3.4, 0.45);
      osc.connect(env);
      env.connect(output);
      osc.start(now);
      osc.stop(now + 5);
    });
  }

  function setMusic(on) {
    el.music.textContent = on ? "Stop music" : "Play music";
    el.music.className = on ? "btn-sec" : "btn";
    el.music.setAttribute("aria-pressed", String(on));
  }

  function audioError(text) {
    el.audioError.textContent = text;
    el.audioError.hidden = !text;
  }

  el.music.addEventListener("click", async () => {
    audioError("");
    if (audio) {
      clearInterval(chordTimer);
      const ctx = audio;
      audio = null;
      if (ctx.state !== "closed") await ctx.close();
      setMusic(false);
      return;
    }
    if (!window.AudioContext) {
      audioError("This browser can't play the lo-fi audio.");
      return;
    }
    let ctx = null;
    try {
      ctx = new AudioContext();
      const volume = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1400;
      volume.gain.value = 0.55;
      volume.connect(filter);
      filter.connect(ctx.destination);
      await ctx.resume();
      audio = ctx;
      let i = 0;
      playChord(ctx, volume, i);
      chordTimer = setInterval(() => playChord(ctx, volume, ++i), 4000);
      setMusic(true);
    } catch (err) {
      console.error("Could not start lo-fi audio", err);
      if (ctx && ctx.state !== "closed") await ctx.close();
      audioError("Couldn't start the lo-fi music. Check your browser's audio settings.");
    }
  });

  render();
})();
