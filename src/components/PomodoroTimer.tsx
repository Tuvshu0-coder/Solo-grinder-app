"use client";

import { useEffect, useRef, useState } from "react";
import { Hero } from "./pixel";

type Mode = "focus" | "break";

const MINUTES_LIMITS = { focus: 180, break: 60 } as const;
const LOFI_CHORDS = [
  [130.81, 164.81, 196, 246.94],
  [110, 130.81, 164.81, 196],
  [87.31, 110, 130.81, 164.81],
  [98, 123.47, 146.83, 196],
];

function minutesFromInput(value: string, mode: Mode) {
  const parsed = Number(value);
  return Math.min(MINUTES_LIMITS[mode], Math.max(1, Number.isFinite(parsed) ? Math.floor(parsed) : 1));
}

function durationInSeconds(mode: Mode, focusMinutes: string, breakMinutes: string) {
  const value = mode === "focus" ? focusMinutes : breakMinutes;
  return minutesFromInput(value, mode) * 60;
}

function playLofiChord(context: AudioContext, output: GainNode, chordIndex: number) {
  const now = context.currentTime;
  const notes = LOFI_CHORDS[chordIndex % LOFI_CHORDS.length];

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = index === 0 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = index === 3 ? -4 : 0;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(index === 0 ? 0.035 : 0.018, now + 0.5);
    envelope.gain.setTargetAtTime(0.0001, now + 3.4, 0.45);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(now);
    oscillator.stop(now + 5);
  });
}

export default function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>("focus");
  const [focusMinutes, setFocusMinutes] = useState("25");
  const [breakMinutes, setBreakMinutes] = useState("5");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [lofiPlaying, setLofiPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [phaseNotice, setPhaseNotice] = useState("");
  const deadlineRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      if (deadlineRef.current === null) return;
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setTimeLeft((current) => (current === remaining ? current : remaining));

      if (remaining === 0) {
        const nextMode = mode === "focus" ? "break" : "focus";
        setRunning(false);
        setMode(nextMode);
        setTimeLeft(durationInSeconds(nextMode, focusMinutes, breakMinutes));
        setPhaseNotice(mode === "focus" ? "Focus time is over. Start your break!" : "Break is over. Start your next focus session!");
        deadlineRef.current = null;
      }
    };

    const interval = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(interval);
  }, [running, mode, focusMinutes, breakMinutes]);

  useEffect(() => () => {
    if (audioIntervalRef.current !== null) window.clearInterval(audioIntervalRef.current);
    const context = audioContextRef.current;
    if (context && context.state !== "closed") void context.close();
  }, []);

  const totalSeconds = durationInSeconds(mode, focusMinutes, breakMinutes);
  const progress = totalSeconds > 0 ? (totalSeconds - timeLeft) / totalSeconds : 0;
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  function chooseMode(nextMode: Mode) {
    setRunning(false);
    deadlineRef.current = null;
    setMode(nextMode);
    setTimeLeft(durationInSeconds(nextMode, focusMinutes, breakMinutes));
    setPhaseNotice("");
  }

  function applyDurations(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFocus = String(minutesFromInput(focusMinutes, "focus"));
    const nextBreak = String(minutesFromInput(breakMinutes, "break"));
    setFocusMinutes(nextFocus);
    setBreakMinutes(nextBreak);
    setTimeLeft(durationInSeconds(mode, nextFocus, nextBreak));
    setRunning(false);
    deadlineRef.current = null;
    setPhaseNotice("");
  }

  function startTimer() {
    if (timeLeft <= 0) return;
    deadlineRef.current = Date.now() + timeLeft * 1000;
    setPhaseNotice("");
    setRunning(true);
  }

  function pauseTimer() {
    if (deadlineRef.current !== null) {
      setTimeLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
    }
    deadlineRef.current = null;
    setRunning(false);
  }

  async function toggleLofi() {
    setAudioError("");
    if (audioContextRef.current) {
      if (audioIntervalRef.current !== null) window.clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context.state !== "closed") await context.close();
      setLofiPlaying(false);
      return;
    }

    if (!window.AudioContext) {
      setAudioError("This browser can't play the lo-fi audio.");
      return;
    }

    let context: AudioContext | null = null;
    try {
      const audioContext = new window.AudioContext();
      context = audioContext;
      const volume = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1400;
      volume.gain.value = 0.55;
      volume.connect(filter);
      filter.connect(audioContext.destination);
      await audioContext.resume();
      audioContextRef.current = audioContext;
      let chordIndex = 0;
      playLofiChord(audioContext, volume, chordIndex);
      audioIntervalRef.current = window.setInterval(() => {
        chordIndex += 1;
        playLofiChord(audioContext, volume, chordIndex);
      }, 4000);
      setLofiPlaying(true);
    } catch (error) {
      console.error("Could not start lo-fi audio", error);
      if (context && context.state !== "closed") await context.close();
      setAudioError("Couldn't start the lo-fi music. Check your browser's audio settings.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="panel">
        <div className="panel-head mint">
          <span>{mode === "focus" ? "Focus time" : "Break time"}</span>
          <span className="muted">{running ? "Running" : "Ready"}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 py-5">
          <div className="relative grid h-56 w-56 place-items-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 220 220" aria-hidden="true">
              <circle cx="110" cy="110" r="96" fill="none" stroke="var(--line)" strokeWidth="8" />
              <circle
                cx="110"
                cy="110"
                r="96"
                fill="none"
                stroke={mode === "focus" ? "var(--violet)" : "var(--mint-dark)"}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 96}`}
                strokeDashoffset={`${2 * Math.PI * 96 * (1 - progress)}`}
                strokeLinecap="square"
              />
            </svg>
            <div className="relative text-center" role="timer" aria-live="off">
              <div className="text-3xl tabular-nums">{minutes}:{seconds}</div>
              <div className="muted text-sm">{mode === "focus" ? "Focus" : "Break"}</div>
            </div>
          </div>

          <div className="flex min-w-[180px] flex-col items-center gap-3">
            <div className="flex gap-2">
              <button type="button" className={mode === "focus" ? "btn" : "btn-sec"} onClick={() => chooseMode("focus")} disabled={running}>
                Focus
              </button>
              <button type="button" className={mode === "break" ? "btn" : "btn-sec"} onClick={() => chooseMode("break")} disabled={running}>
                Break
              </button>
            </div>
            <div className="flex gap-3">
              {running ? (
                <button type="button" className="btn-sec" onClick={pauseTimer}>Pause</button>
              ) : (
                <button type="button" className="btn" onClick={startTimer}>Start</button>
              )}
              <button type="button" className="btn-ghost" onClick={() => chooseMode(mode)}>Restart</button>
            </div>
          </div>
        </div>

        <div className="mt-2 border-t-2 border-dashed border-[var(--line)] pt-4">
          <h2 className="card-title">Timer settings</h2>
          <form onSubmit={applyDurations} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="label">Focus (minutes)</span>
              <input
                className="input"
                type="number"
                min={1}
                max={MINUTES_LIMITS.focus}
                value={focusMinutes}
                onChange={(event) => {
                  setFocusMinutes(event.target.value);
                  if (mode === "focus") setTimeLeft(minutesFromInput(event.target.value, "focus") * 60);
                }}
                disabled={running}
              />
            </label>
            <label className="block">
              <span className="label">Break (minutes)</span>
              <input
                className="input"
                type="number"
                min={1}
                max={MINUTES_LIMITS.break}
                value={breakMinutes}
                onChange={(event) => {
                  setBreakMinutes(event.target.value);
                  if (mode === "break") setTimeLeft(minutesFromInput(event.target.value, "break") * 60);
                }}
                disabled={running}
              />
            </label>
            <button type="submit" className="btn-sec" disabled={running}>Save</button>
          </form>
          <p className="muted mb-0 mt-2 text-sm">Default: 25 minutes of focus, then a 5 minute break.</p>
        </div>
        {phaseNotice && <p className="dialog mt-4 mb-0" role="status">{phaseNotice}</p>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <span>Study corner</span>
          <span className="muted">LO-FI STUDY</span>
        </div>
        <div className="relative isolate h-[270px] overflow-hidden border-4 border-[var(--ink)] bg-[var(--violet-light)] sm:h-[310px]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#e6e1ec_0%,#f0f9e8_100%)]" />
          <div className="absolute left-1/2 top-5 h-24 w-36 -translate-x-1/2 border-4 border-[var(--ink)] bg-[var(--violet)] sm:top-7 sm:h-28 sm:w-44">
            <div className="absolute inset-2 border-2 border-[var(--violet-dark)] bg-[var(--violet-light)]">
              <span className="absolute left-5 top-4 h-2 w-2 bg-[var(--butter)]" />
              <span className="absolute right-6 top-8 h-2 w-2 bg-[var(--white)]" />
              <span className="absolute bottom-3 left-10 h-2 w-2 bg-[var(--white)]" />
            </div>
            <span className="absolute -bottom-4 left-1/2 h-4 w-8 -translate-x-1/2 bg-[var(--ink)]" />
          </div>
          <div className="absolute bottom-[90px] left-1/2 z-0 h-3 w-28 -translate-x-1/2 border-2 border-[var(--ink)] bg-[var(--violet-dark)]" />
          <div className="absolute left-1/2 top-[70px] -translate-x-1/2 sm:top-[90px]">
            <div className="absolute -z-10 left-1/2 top-14 h-28 w-32 -translate-x-1/2 border-x-[10px] border-t-[10px] border-[var(--violet-dark)] bg-[var(--violet)]" />
            <Hero scale={2} bob={running} />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[88px] border-t-8 border-[var(--ink)] bg-[var(--peach)]">
            <div className="absolute left-[calc(50%-62px)] top-3 flex items-center">
              <span className="h-2 w-8 bg-[var(--violet-dark)]" />
              <span className="h-2 w-3 bg-[var(--peach-dark)]" />
            </div>
            <div className="absolute left-[calc(50%+21px)] top-3 flex items-center">
              <span className="h-2 w-3 bg-[var(--peach-dark)]" />
              <span className="h-2 w-8 bg-[var(--violet-dark)]" />
            </div>
            <div className="absolute left-[12%] top-3 h-2 w-12 bg-[var(--peach-dark)] sm:left-[18%] sm:w-16" />
            <div className="absolute right-[12%] top-2 h-5 w-10 border-2 border-[var(--ink)] bg-[var(--mint)] sm:right-[18%] sm:w-14">
              <span className="absolute bottom-full left-2 h-5 w-1 bg-[var(--mint-dark)]" />
              <span className="absolute bottom-full left-1 top-[-18px] h-3 w-3 bg-[var(--mint-dark)]" />
              <span className="absolute bottom-full right-2 top-[-18px] h-3 w-3 bg-[var(--mint-dark)]" />
            </div>
            <div className="absolute left-1/2 top-2 h-8 w-20 -translate-x-1/2 border-2 border-[var(--ink)] bg-[var(--violet-dark)] sm:w-24">
              <div className="absolute inset-x-2 top-1 h-1 border-t border-dashed border-[var(--white)]" />
              <div className="absolute inset-x-2 top-4 flex justify-between">
                {Array.from({ length: 5 }, (_, index) => <i key={index} className="h-1 w-2 bg-[var(--white)]" />)}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="card-title mb-0">Quiet lo-fi music</h2>
            <p className="muted m-0 text-sm">Soft music made in your browser, nothing to download</p>
          </div>
          <button type="button" className={lofiPlaying ? "btn-sec" : "btn"} onClick={toggleLofi} aria-pressed={lofiPlaying}>
            {lofiPlaying ? "Stop music" : "Play music"}
          </button>
        </div>
        {audioError && <p className="mt-2 mb-0 text-sm text-rose" role="alert">{audioError}</p>}
      </section>
    </div>
  );
}
