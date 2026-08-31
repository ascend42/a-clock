import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../lib/format";

export function StopwatchView() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const baseRef = useRef(0); // accumulated ms before the current run
  const startRef = useRef(0); // performance.now() when the current run began

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const tick = () => {
      setElapsed(baseRef.current + (performance.now() - startRef.current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const current = () =>
    baseRef.current + (running ? performance.now() - startRef.current : 0);

  const start = () => {
    startRef.current = performance.now();
    setRunning(true);
  };
  const stop = () => {
    baseRef.current += performance.now() - startRef.current;
    setRunning(false);
  };
  const reset = () => {
    baseRef.current = 0;
    setElapsed(0);
    setLaps([]);
    setRunning(false);
  };
  const lap = () => setLaps((l) => [...l, current()]);

  const stopped = !running;
  const fresh = stopped && elapsed === 0;

  return (
    <div className="chrono">
      <div className="chrono-display">{formatDuration(elapsed, true)}</div>

      <div className="chrono-controls">
        {fresh ? (
          <button className="btn primary big" onClick={start}>
            Start
          </button>
        ) : running ? (
          <>
            <button className="btn ghost big" onClick={lap}>
              Lap
            </button>
            <button className="btn primary big" onClick={stop}>
              Stop
            </button>
          </>
        ) : (
          <>
            <button className="btn ghost big" onClick={reset}>
              Reset
            </button>
            <button className="btn primary big" onClick={start}>
              Resume
            </button>
          </>
        )}
      </div>

      {laps.length > 0 && (
        <ul className="lap-list">
          {laps
            .map((total, i) => ({
              n: i + 1,
              split: total - (i > 0 ? laps[i - 1] : 0),
              total,
            }))
            .reverse()
            .map((row) => (
              <li key={row.n} className="lap-row">
                <span className="lap-n">Lap {row.n}</span>
                <span className="lap-split">{formatDuration(row.split, true)}</span>
                <span className="lap-total">{formatDuration(row.total, true)}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
