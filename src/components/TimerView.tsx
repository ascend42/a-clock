import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../lib/format";
import { startBeep, unlockAudio, type BeepHandle } from "../lib/beep";
import { notify } from "../lib/native";

const PRESETS_MIN = [1, 3, 5, 10, 15, 25];

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function TimerView() {
  const [durationMs, setDurationMs] = useState(5 * 60_000);
  const [remaining, setRemaining] = useState(5 * 60_000);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [mm, setMm] = useState("05");
  const [ss, setSs] = useState("00");
  const endRef = useRef(0);
  const beepRef = useRef<BeepHandle | null>(null);

  const stopBeep = () => {
    beepRef.current?.stop();
    beepRef.current = null;
  };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = endRef.current - performance.now();
      if (left <= 0) {
        clearInterval(id);
        setRemaining(0);
        setRunning(false);
        setDone(true);
        beepRef.current = startBeep();
        void notify("Timer done", `${formatDuration(durationMs)} is up ⏰`);
      } else {
        setRemaining(left);
      }
    }, 200);
    return () => clearInterval(id);
  }, [running, durationMs]);

  // stop any beep if the component ever unmounts
  useEffect(() => () => stopBeep(), []);

  const applyDuration = (ms: number) => {
    stopBeep();
    setRunning(false);
    setDone(false);
    setDurationMs(ms);
    setRemaining(ms);
  };

  const applyCustom = () => {
    const ms = (Number(mm) || 0) * 60_000 + (Number(ss) || 0) * 1000;
    if (ms > 0) applyDuration(ms);
  };

  const start = () => {
    if (remaining <= 0) return;
    unlockAudio();
    setDone(false);
    endRef.current = performance.now() + remaining;
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    stopBeep();
    setRunning(false);
    setDone(false);
    setRemaining(durationMs);
  };
  const dismiss = () => {
    stopBeep();
    setDone(false);
    setRemaining(durationMs);
  };

  return (
    <div className="chrono">
      {done ? (
        <>
          <div className="chrono-display ringing-pulse">0:00</div>
          <div className="chrono-note">Time's up!</div>
          <div className="chrono-controls">
            <button className="btn primary big" onClick={dismiss}>
              Dismiss
            </button>
            <button className="btn ghost big" onClick={start}>
              Restart
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="chrono-display">{formatDuration(remaining)}</div>

          {!running && (
            <div className="timer-setup">
              <div className="preset-row">
                {PRESETS_MIN.map((m) => (
                  <button
                    key={m}
                    className={`chip ${durationMs === m * 60_000 ? "on" : ""}`}
                    onClick={() => applyDuration(m * 60_000)}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <div className="custom-row">
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={mm}
                  onChange={(e) => setMm(e.target.value)}
                  onBlur={(e) => setMm(pad2(Number(e.target.value) || 0))}
                  aria-label="minutes"
                />
                <span>:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={ss}
                  onChange={(e) => setSs(e.target.value)}
                  onBlur={(e) => setSs(pad2(Number(e.target.value) || 0))}
                  aria-label="seconds"
                />
                <button className="btn" onClick={applyCustom}>
                  Set
                </button>
              </div>
            </div>
          )}

          <div className="chrono-controls">
            {running ? (
              <button className="btn primary big" onClick={pause}>
                Pause
              </button>
            ) : (
              <button className="btn primary big" onClick={start}>
                {remaining === durationMs ? "Start" : "Resume"}
              </button>
            )}
            <button className="btn ghost big" onClick={reset}>
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
