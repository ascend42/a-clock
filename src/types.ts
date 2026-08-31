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

export interface Alarm {
  id: string;
  label: string;
  hour: number; // 0-23
  minute: number; // 0-59
  enabled: boolean;
  /** Days of week to repeat on: 0=Sun ... 6=Sat. Empty array = one-time. */
  days: number[];
  trigger: AlarmTrigger;
  snoozeMinutes: number;
}

export type ClockFace = "analog" | "digital";

export interface ClockSettings {
  face: ClockFace;
  hour24: boolean;
  showSeconds: boolean;
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
