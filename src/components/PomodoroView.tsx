import { useEffect, useRef, useState } from "react";
import type { PomodoroSettings } from "../types";
import { formatDuration } from "../lib/format";
import { loadPomodoroSettings, savePomodoroSettings } from "../lib/storage";
import { playChime, unlockAudio } from "../lib/beep";
import { notify } from "../lib/native";

type Phase = "work" | "short" | "long";

const PHASE_LABEL: Record<Phase, string> = {
  work: "Focus",
  short: "Short break",
  long: "Long break",
};

export function PomodoroView() {
  const [settings, setSettings] = useState<PomodoroSettings>(() =>
    loadPomodoroSettings(),
  );
  const [phase, setPhase] = useState<Phase>("work");
  const [completed, setCompleted] = useState(0);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(settings.workMin * 60_000);
  const [showSettings, setShowSettings] = useState(false);
  const endRef = useRef(0);

  // Mirror state to refs so the interval always reads the latest values.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const completedRef = useRef(completed);
  completedRef.current = completed;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => savePomodoroSettings(settings), [settings]);

  const phaseMs = (p: Phase, s: PomodoroSettings) =>
    (p === "work" ? s.workMin : p === "short" ? s.shortMin : s.longMin) *
    60_000;

  const nextPhase = (): { phase: Phase; completed: number } => {
    const s = settingsRef.current;
    if (phaseRef.current === "work") {
      const c = completedRef.current + 1;
      const isLong = c % s.longEvery === 0;
      return { phase: isLong ? "long" : "short", completed: c };
    }
    return { phase: "work", completed: completedRef.current };
  };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = endRef.current - performance.now();
      if (left > 0) {
        setRemaining(left);
        return;
      }
      // Phase complete
      const finished = phaseRef.current;
      const next = nextPhase();
      const dur = phaseMs(next.phase, settingsRef.current);
      playChime();
      void notify(
        finished === "work" ? "Focus complete" : "Break over",
        `${PHASE_LABEL[next.phase]} — ${formatDuration(dur)}`,
      );
      setPhase(next.phase);
      setCompleted(next.completed);
      if (settingsRef.current.autoStart) {
        endRef.current = performance.now() + dur;
        setRemaining(dur);
        // keep running: interval continues with the new endRef
      } else {
        setRemaining(dur);
        clearInterval(id);
        setRunning(false);
      }
    }, 200);
    return () => clearInterval(id);
  }, [running]);

  const start = () => {
    unlockAudio();
    endRef.current = performance.now() + remaining;
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const skip = () => {
    const next = nextPhase();
    const dur = phaseMs(next.phase, settingsRef.current);
    setPhase(next.phase);
    setCompleted(next.completed);
    setRemaining(dur);
    if (running) endRef.current = performance.now() + dur;
  };
  const reset = () => {
    setRunning(false);
    setPhase("work");
    setCompleted(0);
    setRemaining(settings.workMin * 60_000);
  };

  const patchSettings = (patch: Partial<PomodoroSettings>) =>
    setSettings((prev) => {
      const nextS = { ...prev, ...patch };
      if (!running) setRemaining(phaseMs(phaseRef.current, nextS));
      return nextS;
    });

  const total = phaseMs(phase, settings);
  const progress = total > 0 ? 1 - remaining / total : 0;

  return (
    <div className={`chrono pomo pomo-${phase}`}>
      <div className="pomo-phase">{PHASE_LABEL[phase]}</div>

      <div className="pomo-ring">
        <svg viewBox="0 0 120 120" className="pomo-ring-svg">
          <circle className="pomo-track" cx="60" cy="60" r="54" />
          <circle
            className="pomo-progress"
            cx="60"
            cy="60"
            r="54"
            style={{
              strokeDasharray: 2 * Math.PI * 54,
              strokeDashoffset: 2 * Math.PI * 54 * (1 - progress),
            }}
          />
        </svg>
        <div className="chrono-display pomo-time">{formatDuration(remaining)}</div>
      </div>

      <div className="pomo-count">
        {"🍅".repeat(Math.min(completed, 8)) || "Ready to focus"}
        {completed > 8 ? ` +${completed - 8}` : ""}
      </div>

      <div className="chrono-controls">
        {running ? (
          <button className="btn primary big" onClick={pause}>
            Pause
          </button>
        ) : (
          <button className="btn primary big" onClick={start}>
            Start
          </button>
        )}
        <button className="btn ghost big" onClick={skip}>
          Skip
        </button>
        <button className="btn ghost big" onClick={reset}>
          Reset
        </button>
      </div>

      <button
        className="link-btn"
        onClick={() => setShowSettings((s) => !s)}
      >
        {showSettings ? "Hide settings" : "Settings"}
      </button>

      {showSettings && (
        <div className="pomo-settings">
          <label className="inline-field">
            <span>Focus</span>
            <input
              type="number"
              min={1}
              max={120}
              value={settings.workMin}
              onChange={(e) =>
                patchSettings({ workMin: Math.max(1, Number(e.target.value) || 1) })
              }
            />
            <span>min</span>
          </label>
          <label className="inline-field">
            <span>Short break</span>
            <input
              type="number"
              min={1}
              max={60}
              value={settings.shortMin}
              onChange={(e) =>
                patchSettings({ shortMin: Math.max(1, Number(e.target.value) || 1) })
              }
            />
            <span>min</span>
          </label>
          <label className="inline-field">
            <span>Long break</span>
            <input
              type="number"
              min={1}
              max={60}
              value={settings.longMin}
              onChange={(e) =>
                patchSettings({ longMin: Math.max(1, Number(e.target.value) || 1) })
              }
            />
            <span>min</span>
          </label>
          <label className="inline-field">
            <span>Long break every</span>
            <input
              type="number"
              min={2}
              max={12}
              value={settings.longEvery}
              onChange={(e) =>
                patchSettings({ longEvery: Math.max(2, Number(e.target.value) || 2) })
              }
            />
            <span>focus sessions</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.autoStart}
              onChange={(e) => patchSettings({ autoStart: e.target.checked })}
            />
            Auto-start next phase
          </label>
        </div>
      )}
    </div>
  );
}
