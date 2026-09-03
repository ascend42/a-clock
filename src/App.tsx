import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import type { Alarm, ClockSettings } from "./types";
import { useNow } from "./hooks/useNow";
import { useAlarmScheduler } from "./hooks/useAlarmScheduler";
import {
  loadAlarms,
  loadSettings,
  saveAlarms,
  saveSettings,
} from "./lib/storage";
import { unlockAudio } from "./lib/beep";
import { duplicateAlarm } from "./lib/alarm";
import { syncAlarmNotifications } from "./lib/mobileAlarms";
import { setKeepAwake } from "./lib/wakelock";
import {
  ensureNotificationPermission,
  notifyAlarm,
  surfaceWindow,
} from "./lib/native";
import { ClockView } from "./components/ClockView";
import { AlarmsView } from "./components/AlarmsView";
import { RingingOverlay } from "./components/RingingOverlay";
import { StopwatchView } from "./components/StopwatchView";
import { TimerView } from "./components/TimerView";
import { PomodoroView } from "./components/PomodoroView";

type Tab = "clock" | "alarms" | "stopwatch" | "timer" | "pomodoro";

export default function App() {
  const now = useNow(250);
  const [tab, setTab] = useState<Tab>("clock");

  const [alarms, setAlarms] = useState<Alarm[]>(() => loadAlarms());
  const [settings, setSettings] = useState<ClockSettings>(() => loadSettings());
  const [ringing, setRinging] = useState<Alarm | null>(null);
  // Alarms that fired while another was already ringing wait here and ring
  // once the current one is dismissed/snoozed — so a new alarm never
  // interrupts (or resets a puzzle) in front of you.
  const ringingRef = useRef<Alarm | null>(null);
  const queueRef = useRef<Alarm[]>([]);

  // Persist on change.
  useEffect(() => saveAlarms(alarms), [alarms]);
  useEffect(() => saveSettings(settings), [settings]);

  // On mobile, hand alarms to the OS as scheduled notifications so they fire
  // when the app is backgrounded/locked (background JS timers are frozen).
  useEffect(() => {
    void syncAlarmNotifications(alarms);
  }, [alarms]);

  // Nightstand mode: keep the screen awake so the in-app scheduler keeps
  // running (iOS freezes the app once the screen locks).
  useEffect(() => {
    void setKeepAwake(settings.keepAwake);
  }, [settings.keepAwake]);

  // Ask for notification permission up front so a firing alarm can post one.
  useEffect(() => {
    void ensureNotificationPermission();
  }, []);

  // Keep audio unlocked: resume the AudioContext on the first user gesture so
  // an alarm hours later can still make sound.
  useEffect(() => {
    const onGesture = () => unlockAudio();
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  // Make an alarm the active ring — the one place side effects happen, so a
  // queued or dropped alarm never notifies or disables itself prematurely.
  const activate = useCallback((alarm: Alarm) => {
    ringingRef.current = alarm;
    setRinging(alarm);
    void surfaceWindow();
    void notifyAlarm(alarm);
    // A one-time alarm turns itself off only once it actually rings.
    if (alarm.days.length === 0) {
      setAlarms((prev) =>
        prev.map((a) => (a.id === alarm.id ? { ...a, enabled: false } : a)),
      );
    }
  }, []);

  const handleFire = useCallback(
    (alarm: Alarm) => {
      if (ringingRef.current === null) {
        activate(alarm);
      } else if (
        ringingRef.current.id !== alarm.id &&
        !queueRef.current.some((a) => a.id === alarm.id)
      ) {
        queueRef.current.push(alarm); // ring it after the current one
      }
    },
    [activate],
  );

  // Move to the next queued alarm, or clear the overlay if none are waiting.
  const advance = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      activate(next);
    } else {
      ringingRef.current = null;
      setRinging(null);
    }
  }, [activate]);

  useAlarmScheduler(alarms, now, handleFire);

  const upsertAlarm = (alarm: Alarm) =>
    setAlarms((prev) => {
      const exists = prev.some((a) => a.id === alarm.id);
      return exists
        ? prev.map((a) => (a.id === alarm.id ? alarm : a))
        : [...prev, alarm];
    });

  const deleteAlarm = (id: string) =>
    setAlarms((prev) => prev.filter((a) => a.id !== id));

  const toggleAlarm = (id: string, enabled: boolean) =>
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));

  const duplicate = (alarm: Alarm) =>
    setAlarms((prev) => [...prev, duplicateAlarm(alarm, prev)]);

  // Test button: show the ringing overlay without notifying, disabling, or
  // queueing. Keeps the ref in sync so dismiss/snooze behave normally.
  const testRing = (alarm: Alarm) => {
    ringingRef.current = alarm;
    setRinging(alarm);
  };

  const dismiss = () => advance();

  const snooze = () => {
    const alarm = ringingRef.current;
    if (!alarm) return;
    // Re-fire through handleFire later so it queues politely if something
    // else is ringing at that moment. Independent per-alarm timers.
    window.setTimeout(() => handleFire(alarm), alarm.snoozeMinutes * 60_000);
    advance();
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">a-clock</div>
        <button
          className={`nav-item ${tab === "clock" ? "active" : ""}`}
          onClick={() => setTab("clock")}
        >
          <span className="nav-ico">🕐</span> Clock
        </button>
        <button
          className={`nav-item ${tab === "alarms" ? "active" : ""}`}
          onClick={() => setTab("alarms")}
        >
          <span className="nav-ico">⏰</span> Alarms
        </button>
        <button
          className={`nav-item ${tab === "stopwatch" ? "active" : ""}`}
          onClick={() => setTab("stopwatch")}
        >
          <span className="nav-ico">⏱️</span> Stopwatch
        </button>
        <button
          className={`nav-item ${tab === "timer" ? "active" : ""}`}
          onClick={() => setTab("timer")}
        >
          <span className="nav-ico">⏳</span> Timer
        </button>
        <button
          className={`nav-item ${tab === "pomodoro" ? "active" : ""}`}
          onClick={() => setTab("pomodoro")}
        >
          <span className="nav-ico">🍅</span> Pomodoro
        </button>
      </nav>

      <main className="content">
        {tab === "clock" && (
          <ClockView now={now} settings={settings} onChange={setSettings} />
        )}
        {tab === "alarms" && (
          <AlarmsView
            alarms={alarms}
            onSave={upsertAlarm}
            onDelete={deleteAlarm}
            onToggle={toggleAlarm}
            onDuplicate={duplicate}
            onTest={testRing}
            keepAwake={settings.keepAwake}
            onToggleKeepAwake={(v) =>
              setSettings((s) => ({ ...s, keepAwake: v }))
            }
          />
        )}
        {/* Chrono tabs stay mounted so a running stopwatch/timer/pomodoro
            keeps ticking while you're on another tab. */}
        <div hidden={tab !== "stopwatch"}>
          <StopwatchView />
        </div>
        <div hidden={tab !== "timer"}>
          <TimerView />
        </div>
        <div hidden={tab !== "pomodoro"}>
          <PomodoroView />
        </div>
      </main>

      {ringing && (
        <RingingOverlay
          key={ringing.id}
          alarm={ringing}
          now={now}
          onSnooze={snooze}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}
