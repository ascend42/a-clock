import type { Alarm } from "../types";
import { TriggerPlayer } from "./TriggerPlayer";

interface Props {
  alarm: Alarm;
  now: Date;
  onSnooze: () => void;
  onDismiss: () => void;
}

export function RingingOverlay({ alarm, now, onSnooze, onDismiss }: Props) {
  const time = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="ringing">
      <div className="ringing-inner">
        <div className="ringing-time">{time}</div>
        <div className="ringing-label">{alarm.label || "Alarm"}</div>

        <div className="ringing-media">
          <TriggerPlayer trigger={alarm.trigger} />
        </div>

        <div className="ringing-actions">
          <button className="btn ghost big" onClick={onSnooze}>
            Snooze {alarm.snoozeMinutes}m
          </button>
          <button className="btn primary big" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
