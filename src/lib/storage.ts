import type { Alarm, ClockSettings, PomodoroSettings } from "../types";
import { DEFAULT_POMODORO } from "../types";

const ALARMS_KEY = "a-clock.alarms.v1";
const SETTINGS_KEY = "a-clock.clock-settings.v1";
const POMODORO_KEY = "a-clock.pomodoro-settings.v1";

const DEFAULT_SETTINGS: ClockSettings = {
  face: "analog",
  hour24: false,
  showSeconds: true,
  wakeFromSleep: true,
};

export function loadAlarms(): Alarm[] {
  try {
    const raw = localStorage.getItem(ALARMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Alarm[];
  } catch {
    return [];
  }
}

export function saveAlarms(alarms: Alarm[]): void {
  try {
    localStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
  } catch {
    // storage full / unavailable — nothing we can do, keep running in-memory
  }
}

export function loadSettings(): ClockSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: ClockSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadPomodoroSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(POMODORO_KEY);
    if (!raw) return { ...DEFAULT_POMODORO };
    return { ...DEFAULT_POMODORO, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_POMODORO };
  }
}

export function savePomodoroSettings(settings: PomodoroSettings): void {
  try {
    localStorage.setItem(POMODORO_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
