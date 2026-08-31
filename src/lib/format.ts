function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Format a millisecond duration as a clock string.
 * Shows hours only when needed; optional centiseconds for the stopwatch.
 */
export function formatDuration(ms: number, withCentis = false): string {
  const total = Math.max(0, Math.floor(ms));
  const s = Math.floor(total / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const core =
    hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
  if (!withCentis) return core;
  const centis = Math.floor((total % 1000) / 10);
  return `${core}.${pad(centis)}`;
}
