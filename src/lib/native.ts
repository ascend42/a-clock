import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Alarm } from "../types";

let permissionReady: Promise<boolean> | null = null;

/** Ask for OS notification permission once; result is cached. */
export function ensureNotificationPermission(): Promise<boolean> {
  if (!permissionReady) {
    permissionReady = (async () => {
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          granted = (await requestPermission()) === "granted";
        }
        return granted;
      } catch {
        return false; // not under Tauri, or permission API unavailable
      }
    })();
  }
  return permissionReady;
}

function formatTime(a: Alarm): string {
  let h = a.hour;
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(a.minute).padStart(2, "0")} ${suffix}`;
}

/** Post a generic macOS notification (no-op if not permitted). */
export async function notify(title: string, body: string): Promise<void> {
  try {
    if (await ensureNotificationPermission()) {
      sendNotification({ title, body });
    }
  } catch {
    // notifications unavailable
  }
}

/** Post a macOS notification for a firing alarm (no-op if not permitted). */
export async function notifyAlarm(alarm: Alarm): Promise<void> {
  try {
    if (await ensureNotificationPermission()) {
      sendNotification({
        title: alarm.label || "Alarm",
        body: `⏰ ${formatTime(alarm)}`,
      });
    }
  } catch {
    // notifications unavailable; the in-app overlay still fires
  }
}

/** Bring the window to the foreground — it may be hidden in the tray. */
export async function surfaceWindow(): Promise<void> {
  try {
    const win = getCurrentWindow();
    await win.show();
    await win.unminimize();
    await win.setFocus();
  } catch {
    // not running under Tauri, or window API unavailable
  }
}
