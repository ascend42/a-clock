import { useState } from "react";
import type { Alarm } from "../types";
import { TriggerPlayer } from "./TriggerPlayer";
import { PuzzleGate } from "./PuzzleGate";

interface Props {
  alarm: Alarm;
  now: Date;
  onSnooze: () => void;
  onDismiss: () => void;
}

export function RingingOverlay({ alarm, now, onSnooze, onDismiss }: Props) {
  const [mode, setMode] = useState<"ringing" | "puzzle">("ringing");

  const time = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const puzzleOn = alarm.puzzle?.enabled === true;
  const canSnooze = alarm.snoozeEnabled !== false;
  const snoozeLabel = canSnooze ? `Snooze ${alarm.snoozeMinutes}m` : null;

  const handleDismiss = () => {
    if (puzzleOn) setMode("puzzle");
    else onDismiss();
  };

  return (
    <div className="ringing">
      <div className="ringing-inner">
        <div className="ringing-time">{time}</div>
        <div className="ringing-label">{alarm.label || "Alarm"}</div>

        {mode === "puzzle" ? (
          // Sound pauses while solving (TriggerPlayer is unmounted).
          <PuzzleGate
            count={alarm.puzzle.count}
            difficulty={alarm.puzzle.difficulty}
            snoozeLabel={snoozeLabel}
            onSolved={onDismiss}
            onAbort={() => setMode("ringing")}
            onSnooze={onSnooze}
          />
        ) : (
          <>
            <div className="ringing-media">
              <TriggerPlayer trigger={alarm.trigger} autoOpen />
            </div>

            <div className="ringing-actions">
              {canSnooze && (
                <button className="btn ghost big" onClick={onSnooze}>
                  {snoozeLabel}
                </button>
              )}
              <button className="btn primary big" onClick={handleDismiss}>
                Dismiss
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
