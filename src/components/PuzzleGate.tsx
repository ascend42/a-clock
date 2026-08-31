import { useEffect, useRef, useState } from "react";
import type { PuzzleDifficulty } from "../types";
import { generateProblems, type MathProblem } from "../lib/puzzle";

/** Seconds the puzzle stays up before the alarm resumes ringing. */
const TIMEOUT_MS = 60_000;

interface Props {
  count: number;
  difficulty: PuzzleDifficulty;
  /** Label for an optional snooze escape (null hides it). */
  snoozeLabel: string | null;
  onSolved: () => void;
  onAbort: () => void; // timed out — resume ringing
  onSnooze: () => void;
}

export function PuzzleGate({
  count,
  difficulty,
  snoozeLabel,
  onSolved,
  onAbort,
  onSnooze,
}: Props) {
  const [problems, setProblems] = useState<MathProblem[]>(() =>
    generateProblems(count, difficulty),
  );
  const [answers, setAnswers] = useState<string[]>(() => Array(count).fill(""));
  const [wrong, setWrong] = useState(false);
  const [secs, setSecs] = useState(Math.ceil(TIMEOUT_MS / 1000));
  const firstRef = useRef<HTMLInputElement>(null);

  // Keep onAbort fresh without restarting the countdown on every re-render.
  const onAbortRef = useRef(onAbort);
  onAbortRef.current = onAbort;

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const left = TIMEOUT_MS - (Date.now() - start);
      setSecs(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) {
        clearInterval(id);
        onAbortRef.current();
      }
    }, 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const allFilled = answers.every((a) => a.trim() !== "");

  const submit = () => {
    if (!allFilled) return;
    const correct = problems.every((p, i) => Number(answers[i]) === p.answer);
    if (correct) {
      onSolved();
      return;
    }
    // Wrong: regenerate so you can't brute-force, and flash an error.
    setWrong(true);
    setProblems(generateProblems(count, difficulty));
    setAnswers(Array(count).fill(""));
    firstRef.current?.focus();
    window.setTimeout(() => setWrong(false), 500);
  };

  return (
    <div className={`puzzle ${wrong ? "shake" : ""}`}>
      <div className="puzzle-head">
        <h2>Solve to dismiss</h2>
        <div className="puzzle-timer" title="Alarm resumes when this runs out">
          {secs}s
        </div>
      </div>

      <div className="puzzle-problems">
        {problems.map((p, i) => (
          <div className="puzzle-row" key={p.id}>
            <span className="puzzle-prompt">{p.prompt} =</span>
            <input
              ref={i === 0 ? firstRef : undefined}
              type="number"
              inputMode="numeric"
              value={answers[i]}
              onChange={(e) =>
                setAnswers((prev) =>
                  prev.map((a, j) => (j === i ? e.target.value : a)),
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
        ))}
      </div>

      {wrong && (
        <div className="puzzle-error">Not quite — fresh problems, try again.</div>
      )}

      <div className="puzzle-actions">
        {snoozeLabel && (
          <button className="btn ghost" onClick={onSnooze}>
            {snoozeLabel}
          </button>
        )}
        <button className="btn primary" disabled={!allFilled} onClick={submit}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
