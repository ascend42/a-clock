// Core domain types for a-clock

export type TriggerType = "beep" | "youtube" | "file";
export type MediaKind = "audio" | "video";

export interface AlarmTrigger {
  type: TriggerType;
  /** For type "youtube": the raw URL the user pasted. */
  url?: string;
  /** For type "file": absolute path on disk (persisted so it survives restarts). */
  path?: string;
  /** For type "file": display name. */
  fileName?: string;
  /** For type "file": whether to render an <audio> or <video> element. */
  mediaKind?: MediaKind;
}

export type PuzzleDifficulty = "easy" | "medium" | "hard";

export interface PuzzleConfig {
  /** When true, dismissing requires solving math problems first. */
  enabled: boolean;
  /** Number of problems to solve (3-5). */
  count: number;
  difficulty: PuzzleDifficulty;
}

export interface Alarm {
  id: string;
  label: string;
  hour: number; // 0-23
  minute: number; // 0-59
  enabled: boolean;
  /** Days of week to repeat on: 0=Sun ... 6=Sat. Empty array = one-time. */
  days: number[];
  trigger: AlarmTrigger;
  snoozeEnabled: boolean;
  snoozeMinutes: number;
  /** Optional "solve to dismiss" gate. Absent/disabled = normal one-tap dismiss. */
  puzzle: PuzzleConfig;
}

export const DEFAULT_PUZZLE: PuzzleConfig = {
  enabled: false,
  count: 3,
  difficulty: "easy",
};

export type ClockFace = "analog" | "digital";

export interface ClockSettings {
  face: ClockFace;
  hour24: boolean;
  showSeconds: boolean;
  /** Nightstand mode: keep the screen awake so alarms fire while the app is open. */
  keepAwake: boolean;
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface PomodoroSettings {
  workMin: number;
  shortMin: number;
  longMin: number;
  /** Take a long break after this many work sessions. */
  longEvery: number;
  /** Automatically start the next phase when one ends. */
  autoStart: boolean;
}

export const DEFAULT_POMODORO: PomodoroSettings = {
  workMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStart: true,
};
