import { useState } from "react";
import type {
  Alarm,
  AlarmTrigger,
  PuzzleDifficulty,
  TriggerType,
} from "../types";
import { DAY_LABELS, DEFAULT_PUZZLE } from "../types";
import { pickMediaFile } from "../lib/filepick";
import { parseYouTubeId } from "../lib/youtube";
import { TriggerPlayer } from "./TriggerPlayer";
import { PuzzleGate } from "./PuzzleGate";

interface Props {
  initial: Alarm;
  onSave: (alarm: Alarm) => void;
  onCancel: () => void;
}

export function AlarmEditor({ initial, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<Alarm>(initial);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [tryingPuzzle, setTryingPuzzle] = useState(false);
  const [puzzleMsg, setPuzzleMsg] = useState<string | null>(null);

  const flashPuzzleMsg = (msg: string) => {
    setPuzzleMsg(msg);
    window.setTimeout(() => setPuzzleMsg(null), 2500);
  };

  const setTrigger = (patch: Partial<AlarmTrigger>) => {
    setPreviewing(false); // any change restarts the preview cleanly
    setDraft((d) => ({ ...d, trigger: { ...d.trigger, ...patch } }));
  };

  const puzzle = draft.puzzle ?? DEFAULT_PUZZLE;
  const setPuzzle = (patch: Partial<typeof puzzle>) =>
    setDraft((d) => ({ ...d, puzzle: { ...(d.puzzle ?? DEFAULT_PUZZLE), ...patch } }));

  const toggleDay = (day: number) =>
    setDraft((d) => ({
      ...d,
      days: d.days.includes(day)
        ? d.days.filter((x) => x !== day)
        : [...d.days, day].sort(),
    }));

  const chooseFile = async () => {
    setFileError(null);
    try {
      const picked = await pickMediaFile();
      if (picked) {
        setTrigger({
          type: "file",
          path: picked.path,
          fileName: picked.fileName,
          mediaKind: picked.mediaKind,
        });
      }
    } catch (e) {
      setFileError(String(e));
    }
  };

  const trigger = draft.trigger;
  const youTubeOk =
    trigger.type !== "youtube" || parseYouTubeId(trigger.url ?? "") !== null;
  const fileOk = trigger.type !== "file" || !!trigger.path;
  const canSave = youTubeOk && fileOk;
  const canTest =
    trigger.type === "beep" ||
    (trigger.type === "youtube" && parseYouTubeId(trigger.url ?? "") !== null) ||
    (trigger.type === "file" && !!trigger.path);

  return (
    <div className="editor-backdrop" onClick={onCancel}>
      <div className="editor" onClick={(e) => e.stopPropagation()}>
        <h2>{initial.label ? "Edit alarm" : "New alarm"}</h2>

        <div className="time-row">
          <input
            type="time"
            className="time-input"
            value={`${String(draft.hour).padStart(2, "0")}:${String(
              draft.minute,
            ).padStart(2, "0")}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              setDraft((d) => ({ ...d, hour: h || 0, minute: m || 0 }));
            }}
          />
        </div>

        <label className="field">
          <span>Label</span>
          <input
            type="text"
            placeholder="Wake up"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
        </label>

        <div className="field">
          <span>Repeat</span>
          <div className="days-row">
            {DAY_LABELS.map((lbl, i) => (
              <button
                key={i}
                className={`day-chip ${draft.days.includes(i) ? "on" : ""}`}
                onClick={() => toggleDay(i)}
                type="button"
              >
                {lbl[0]}
              </button>
            ))}
          </div>
          <small className="hint">
            {draft.days.length === 0
              ? "One-time — rings the next time this hits, then turns off."
              : "Repeats weekly on the selected days."}
          </small>
        </div>

        <div className="field">
          <span>Sound</span>
          <div className="segmented">
            {(["beep", "youtube", "file"] as TriggerType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={trigger.type === t ? "active" : ""}
                onClick={() => setTrigger({ type: t })}
              >
                {t === "beep" ? "Beep" : t === "youtube" ? "YouTube" : "File"}
              </button>
            ))}
          </div>

          {trigger.type === "youtube" && (
            <>
              <input
                type="text"
                placeholder="Paste a YouTube link…"
                value={trigger.url ?? ""}
                onChange={(e) => setTrigger({ url: e.target.value })}
              />
              {!youTubeOk && (
                <small className="hint error">
                  That doesn't look like a YouTube link.
                </small>
              )}
            </>
          )}

          {trigger.type === "file" && (
            <>
              <button type="button" className="btn" onClick={chooseFile}>
                {trigger.fileName ? "Change file…" : "Choose audio/video…"}
              </button>
              {trigger.fileName && (
                <small className="hint">
                  {trigger.mediaKind === "video" ? "🎬" : "🎵"}{" "}
                  {trigger.fileName}
                </small>
              )}
              {fileError && <small className="hint error">{fileError}</small>}
            </>
          )}

          <div className="preview-row">
            <button
              type="button"
              className={`btn ${previewing ? "danger-outline" : ""}`}
              disabled={!canTest}
              onClick={() => setPreviewing((p) => !p)}
            >
              {previewing ? "■ Stop test" : "▶ Test this sound"}
            </button>
          </div>

          {previewing && (
            <div className="preview-box">
              {trigger.type === "beep" && (
                <span className="preview-note">🔔 Beep playing…</span>
              )}
              <TriggerPlayer trigger={trigger} />
            </div>
          )}
        </div>

        <div className="field">
          <span>Snooze</span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={draft.snoozeEnabled !== false}
              onChange={(e) =>
                setDraft((d) => ({ ...d, snoozeEnabled: e.target.checked }))
              }
            />
            Allow snoozing this alarm
          </label>
          {draft.snoozeEnabled !== false && (
            <label className="inline-field">
              <span>After</span>
              <input
                type="number"
                min={1}
                max={60}
                value={draft.snoozeMinutes}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    snoozeMinutes: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
              />
              <span>min</span>
            </label>
          )}
        </div>

        <div className="field">
          <span>Puzzle to dismiss</span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={puzzle.enabled}
              onChange={(e) => setPuzzle({ enabled: e.target.checked })}
            />
            Require solving math problems to dismiss
          </label>
          {puzzle.enabled && (
            <>
              <label className="inline-field">
                <span>Solve</span>
                <input
                  type="number"
                  min={3}
                  max={5}
                  value={puzzle.count}
                  onChange={(e) =>
                    setPuzzle({
                      count: Math.min(5, Math.max(3, Number(e.target.value) || 3)),
                    })
                  }
                />
                <span>problems</span>
              </label>
              <div className="segmented">
                {(["easy", "medium", "hard"] as PuzzleDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={puzzle.difficulty === d ? "active" : ""}
                    onClick={() => setPuzzle({ difficulty: d })}
                  >
                    {d[0].toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={`btn ${tryingPuzzle ? "danger-outline" : ""}`}
                onClick={() => {
                  setPuzzleMsg(null);
                  setTryingPuzzle((t) => !t);
                }}
              >
                {tryingPuzzle ? "■ Close preview" : "🧩 Try these problems"}
              </button>
              {puzzleMsg && <small className="hint">{puzzleMsg}</small>}

              {tryingPuzzle && (
                <div className="puzzle-preview">
                  <PuzzleGate
                    key={`${puzzle.count}-${puzzle.difficulty}`}
                    count={puzzle.count}
                    difficulty={puzzle.difficulty}
                    snoozeLabel={null}
                    onSolved={() => {
                      setTryingPuzzle(false);
                      flashPuzzleMsg("✓ Solved — that's the drill.");
                    }}
                    onAbort={() => {
                      setTryingPuzzle(false);
                      flashPuzzleMsg("⏱ Timed out — a real alarm would resume.");
                    }}
                    onSnooze={() => setTryingPuzzle(false)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="editor-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!canSave}
            onClick={() => onSave(draft)}
          >
            Save alarm
          </button>
        </div>
      </div>
    </div>
  );
}
