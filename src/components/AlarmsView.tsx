import { useState } from "react";
import type { Alarm } from "../types";
import { DAY_LABELS, DEFAULT_PUZZLE } from "../types";
import { AlarmEditor } from "./AlarmEditor";

interface Props {
  alarms: Alarm[];
  onSave: (alarm: Alarm) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDuplicate: (alarm: Alarm) => void;
  onTest: (alarm: Alarm) => void;
  wakeFromSleep: boolean;
  onToggleWake: (enabled: boolean) => void;
}

function newAlarm(): Alarm {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    label: "",
    hour: now.getHours(),
    minute: now.getMinutes(),
    enabled: true,
    days: [],
    trigger: { type: "beep" },
    snoozeEnabled: true,
    snoozeMinutes: 5,
    puzzle: { ...DEFAULT_PUZZLE },
  };
}

function repeatSummary(a: Alarm): string {
  if (a.days.length === 0) return "Once";
  if (a.days.length === 7) return "Every day";
  const weekdays = [1, 2, 3, 4, 5];
  if (
    a.days.length === 5 &&
    weekdays.every((d) => a.days.includes(d))
  )
    return "Weekdays";
  return a.days.map((d) => DAY_LABELS[d]).join(", ");
}

function triggerSummary(a: Alarm): string {
  const t = a.trigger;
  if (t.type === "beep") return "🔔 Beep";
  if (t.type === "youtube") return "▶️ YouTube";
  return `${t.mediaKind === "video" ? "🎬" : "🎵"} ${t.fileName ?? "File"}`;
}

function formatTime(a: Alarm): { time: string; suffix: string } {
  let h = a.hour;
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return { time: `${h}:${String(a.minute).padStart(2, "0")}`, suffix };
}

export function AlarmsView({
  alarms,
  onSave,
  onDelete,
  onToggle,
  onDuplicate,
  onTest,
  wakeFromSleep,
  onToggleWake,
}: Props) {
  const [editing, setEditing] = useState<Alarm | null>(null);

  const sorted = [...alarms].sort(
    (a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute),
  );

  return (
    <div className="alarms-view">
      <div className="alarms-header">
        <h1>Alarms</h1>
        <div className="alarms-header-actions">
          <label className="toggle" title="Schedule a macOS wake before each alarm (asks for admin once)">
            <input
              type="checkbox"
              checked={wakeFromSleep}
              onChange={(e) => onToggleWake(e.target.checked)}
            />
            🌙 Wake Mac
          </label>
          <button className="btn primary" onClick={() => setEditing(newAlarm())}>
            + New
          </button>
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="empty">
          No alarms yet. Create one and pick a beep, a looping YouTube video, or
          a file on your Mac.
        </div>
      )}

      <ul className="alarm-list">
        {sorted.map((a) => {
          const { time, suffix } = formatTime(a);
          return (
            <li key={a.id} className={`alarm-card ${a.enabled ? "" : "off"}`}>
              <div
                className="alarm-main"
                onClick={() => setEditing(a)}
                role="button"
              >
                <div className="alarm-time">
                  {time}
                  <span className="alarm-suffix">{suffix}</span>
                </div>
                <div className="alarm-meta">
                  <span className="alarm-label">{a.label || "Alarm"}</span>
                  <span className="alarm-sub">
                    {repeatSummary(a)} · {triggerSummary(a)}
                    {a.puzzle?.enabled ? " · 🧩" : ""}
                    {a.snoozeEnabled === false ? " · no snooze" : ""}
                  </span>
                </div>
              </div>
              <div className="alarm-side">
                <button
                  className="icon-btn"
                  title="Test this sound"
                  onClick={() => onTest(a)}
                >
                  ▶
                </button>
                <button
                  className="icon-btn"
                  title="Duplicate (next free 15-min slot)"
                  onClick={() => onDuplicate(a)}
                >
                  ⧉
                </button>
                <label className="switch" title="Enable / disable">
                  <input
                    type="checkbox"
                    checked={a.enabled}
                    onChange={(e) => onToggle(a.id, e.target.checked)}
                  />
                  <span className="slider" />
                </label>
                <button
                  className="icon-btn danger"
                  title="Delete"
                  onClick={() => onDelete(a.id)}
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {editing && (
        <AlarmEditor
          initial={editing}
          onSave={(a) => {
            onSave(a);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
