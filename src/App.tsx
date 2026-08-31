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
import { ClockView } from "./components/ClockView";
import { AlarmsView } from "./components/AlarmsView";
import { RingingOverlay } from "./components/RingingOverlay";

type Tab = "clock" | "alarms";

export default function App() {
  const now = useNow(250);
  const [tab, setTab] = useState<Tab>("clock");

  const [alarms, setAlarms] = useState<Alarm[]>(() => loadAlarms());
  const [settings, setSettings] = useState<ClockSettings>(() => loadSettings());
  const [ringing, setRinging] = useState<Alarm | null>(null);
  const snoozeTimer = useRef<number | undefined>(undefined);

  // Persist on change.
  useEffect(() => saveAlarms(alarms), [alarms]);
  useEffect(() => saveSettings(settings), [settings]);

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

  const handleFire = useCallback((alarm: Alarm) => {
    setRinging((current) => current ?? alarm); // don't override an active ring
    // A one-time alarm turns itself off after firing.
    if (alarm.days.length === 0) {
      setAlarms((prev) =>
        prev.map((a) => (a.id === alarm.id ? { ...a, enabled: false } : a)),
      );
    }
  }, []);

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

  const dismiss = () => {
    if (snoozeTimer.current) window.clearTimeout(snoozeTimer.current);
    setRinging(null);
  };

  const snooze = () => {
    if (!ringing) return;
    const alarm = ringing;
    setRinging(null);
    if (snoozeTimer.current) window.clearTimeout(snoozeTimer.current);
    snoozeTimer.current = window.setTimeout(
      () => setRinging(alarm),
      alarm.snoozeMinutes * 60_000,
    );
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
        <div className="nav-soon">Stopwatch · Timer · Pomodoro — soon</div>
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
            onTest={setRinging}
          />
        )}
      </main>

      {ringing && (
        <RingingOverlay
          alarm={ringing}
          now={now}
          onSnooze={snooze}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}
