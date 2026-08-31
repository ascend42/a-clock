import { invoke } from "@tauri-apps/api/core";
import type { Alarm } from "../types";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** pmset wants "MM/dd/yy HH:mm:ss". */
function fmtPmset(d: Date): string {
  return (
    `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${String(d.getFullYear()).slice(2)} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** The next time this alarm will fire after `from`, or null if disabled/never. */
export function nextOccurrence(alarm: Alarm, from: Date): Date | null {
  if (!alarm.enabled) return null;
  for (let i = 0; i < 8; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    d.setHours(alarm.hour, alarm.minute, 0, 0);
    if (d.getTime() <= from.getTime()) continue;
    if (alarm.days.length === 0 || alarm.days.includes(d.getDay())) return d;
  }
  return null;
}

let lastScheduled = "";

/**
 * Ask macOS to wake ~30s before the earliest upcoming alarm, so the alarm
 * fires even from full sleep. Deduped so it only re-authorizes (admin prompt)
 * when the earliest wake time actually changes.
 */
export async function scheduleNextWake(alarms: Alarm[]): Promise<void> {
  const now = new Date();
  let earliest: Date | null = null;
  for (const a of alarms) {
    const occ = nextOccurrence(a, now);
    if (occ && (!earliest || occ < earliest)) earliest = occ;
  }
  if (!earliest) return;

  const wake = new Date(earliest.getTime() - 30_000);
  const key = fmtPmset(wake);
  if (key === lastScheduled) return;

  try {
    await invoke("schedule_wake", {
      datetime: key,
      previous: lastScheduled || null,
    });
    lastScheduled = key;
  } catch {
    // pmset unavailable, not under Tauri, or the admin prompt was cancelled
  }
}

/** Remove the wake we scheduled (e.g. when the feature is switched off). */
export async function cancelScheduledWake(): Promise<void> {
  if (!lastScheduled) return;
  try {
    await invoke("cancel_wake", { datetime: lastScheduled });
  } catch {
    // ignore
  }
  lastScheduled = "";
}
