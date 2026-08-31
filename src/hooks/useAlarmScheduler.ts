import { useEffect, useRef } from "react";
import type { Alarm } from "../types";

function minuteKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
}

/**
 * Watches `now` and calls `onFire(alarm)` once when an enabled alarm's time is
 * reached. Fires at most once per calendar minute per alarm, so a missed tick
 * (or several renders in the same minute) never double-triggers.
 */
export function useAlarmScheduler(
  alarms: Alarm[],
  now: Date,
  onFire: (alarm: Alarm) => void,
) {
  // Remembers the last minute-key each alarm fired on, to dedupe.
  const firedRef = useRef<Map<string, string>>(new Map());
  // Keep the latest onFire without re-subscribing the effect every render.
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;

  useEffect(() => {
    const key = minuteKey(now);
    const today = now.getDay();

    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      if (alarm.hour !== now.getHours() || alarm.minute !== now.getMinutes()) {
        continue;
      }
      // Repeat-day filter. Empty days => one-time (fires on any day it's on).
      if (alarm.days.length > 0 && !alarm.days.includes(today)) continue;

      if (firedRef.current.get(alarm.id) === key) continue; // already fired this minute

      firedRef.current.set(alarm.id, key);
      onFireRef.current(alarm);
    }
  }, [alarms, now]);
}
