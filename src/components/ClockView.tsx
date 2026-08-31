import type { ClockSettings } from "../types";
import { AnalogClock } from "./AnalogClock";

interface Props {
  now: Date;
  settings: ClockSettings;
  onChange: (next: ClockSettings) => void;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDigital(now: Date, settings: ClockSettings) {
  let h = now.getHours();
  let suffix = "";
  if (!settings.hour24) {
    suffix = h >= 12 ? " PM" : " AM";
    h = h % 12;
    if (h === 0) h = 12;
  }
  const hh = settings.hour24 ? pad(h) : h.toString();
  const time =
    `${hh}:${pad(now.getMinutes())}` +
    (settings.showSeconds ? `:${pad(now.getSeconds())}` : "");
  return { time, suffix };
}

export function ClockView({ now, settings, onChange }: Props) {
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const digital = formatDigital(now, settings);

  return (
    <div className="clock-view">
      <div className="clock-stage">
        {settings.face === "analog" ? (
          <AnalogClock now={now} showSeconds={settings.showSeconds} size={320} />
        ) : (
          <div className="digital-clock">
            <span className="digital-time">{digital.time}</span>
            {digital.suffix && (
              <span className="digital-suffix">{digital.suffix}</span>
            )}
          </div>
        )}
        <div className="clock-date">{dateStr}</div>
      </div>

      <div className="clock-controls">
        <div className="segmented">
          <button
            className={settings.face === "analog" ? "active" : ""}
            onClick={() => onChange({ ...settings, face: "analog" })}
          >
            Analog
          </button>
          <button
            className={settings.face === "digital" ? "active" : ""}
            onClick={() => onChange({ ...settings, face: "digital" })}
          >
            Digital
          </button>
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.hour24}
            onChange={(e) => onChange({ ...settings, hour24: e.target.checked })}
          />
          24-hour
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.showSeconds}
            onChange={(e) =>
              onChange({ ...settings, showSeconds: e.target.checked })
            }
          />
          Seconds
        </label>
      </div>
    </div>
  );
}
