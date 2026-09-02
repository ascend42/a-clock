import {
  sendNotification,
  cancelAll,
  Schedule,
} from "@tauri-apps/plugin-notification";
import type { Alarm } from "../types";
import { ensureNotificationPermission } from "./native";

/** iOS/Android webview detection — mobile can't run background JS timers. */
export function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** The next time this alarm will fire after `from`, or null if disabled/never. */
function nextOccurrence(alarm: Alarm, from: Date): Date | null {
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

/** Stable positive 32-bit id from an alarm's uuid + a per-day slot (0-7). */
function notifId(alarmId: string, slot: number): number {
  let h = 2166136261;
  for (let i = 0; i < alarmId.length; i++) {
    h ^= alarmId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 200_000_000) * 10 + (slot % 10);
}

function timeLabel(a: Alarm): string {
  let h = a.hour;
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(a.minute).padStart(2, "0")} ${suffix}`;
}

/**
 * On mobile, hand each enabled alarm to the OS as a scheduled local
 * notification so it fires even when the app is closed/locked. One-time alarms
 * schedule a single date; repeating alarms schedule one weekly interval per
 * selected day. No-op on desktop (the JS scheduler + tray handle it there).
 */
export async function syncAlarmNotifications(alarms: Alarm[]): Promise<void> {
  if (!isMobile()) return;
  try {
    if (!(await ensureNotificationPermission())) return;
    await cancelAll(); // clear our previously-scheduled alarms, then re-add
    const now = new Date();

    for (const a of alarms) {
      if (!a.enabled) continue;
      const title = a.label || "Alarm";
      const body = `⏰ ${timeLabel(a)}`;

      if (a.days.length === 0) {
        const occ = nextOccurrence(a, now);
        if (!occ) continue;
        await sendNotification({
          id: notifId(a.id, 0),
          title,
          body,
          schedule: Schedule.at(occ, false, true),
        });
      } else {
        for (const d of a.days) {
          await sendNotification({
            id: notifId(a.id, d + 1),
            title,
            body,
            // plugin weekday: 1=Sunday..7=Saturday; our day is 0=Sun..6=Sat
            schedule: Schedule.interval(
              { weekday: d + 1, hour: a.hour, minute: a.minute, second: 0 },
              true,
            ),
          });
        }
      }
    }
  } catch {
    // notification scheduling unavailable — foreground JS scheduler still works
  }
}
