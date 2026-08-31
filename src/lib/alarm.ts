import type { Alarm } from "../types";
import { DEFAULT_PUZZLE } from "../types";

const DAY = 24 * 60;
const STEP = 15; // minutes

/**
 * Next free time on a 15-minute grid: round the source time up to the next
 * 15-minute mark, then step forward in 15-minute increments past any time
 * already taken by an existing alarm. Wraps past midnight.
 */
export function nextFreeSlot(
  source: Alarm,
  existing: Alarm[],
): { hour: number; minute: number } {
  const used = new Set(existing.map((a) => a.hour * 60 + a.minute));
  const base = source.hour * 60 + source.minute;
  const firstBoundary = (Math.floor(base / STEP) + 1) * STEP;

  let cand = firstBoundary;
  for (let i = 0; i < DAY / STEP; i++) {
    const slot = cand % DAY;
    if (!used.has(slot)) return { hour: Math.floor(slot / 60), minute: slot % 60 };
    cand += STEP;
  }
  // Every 15-min slot is occupied — fall back to the first boundary.
  const slot = firstBoundary % DAY;
  return { hour: Math.floor(slot / 60), minute: slot % 60 };
}

/** Copy an alarm to the next free 15-minute slot, enabled and freshly ID'd. */
export function duplicateAlarm(source: Alarm, existing: Alarm[]): Alarm {
  const { hour, minute } = nextFreeSlot(source, existing);
  return {
    ...source,
    id: crypto.randomUUID(),
    hour,
    minute,
    enabled: true,
    days: [...source.days],
    trigger: { ...source.trigger },
    puzzle: { ...(source.puzzle ?? DEFAULT_PUZZLE) },
  };
}
