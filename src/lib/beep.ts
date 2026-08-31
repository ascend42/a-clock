// A small WebAudio-based beeper for the built-in alarm sound.
// We keep one shared AudioContext and "unlock" it on the first user gesture,
// so that a beep scheduled hours later can still make sound (browsers/WebViews
// block audio until the page has seen at least one interaction).

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

/** Call from any real user gesture to keep audio playable later. */
export function unlockAudio(): void {
  try {
    const c = getCtx();
    if (c.state === "suspended") void c.resume();
  } catch {
    // no audio available; the app still works, just silently
  }
}

/** A short low "wrong answer" buzzer — a descending sawtooth. */
export function playBuzzer(): void {
  try {
    const c = getCtx();
    if (c.state === "suspended") void c.resume();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.32);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  } catch {
    // no audio available; the shake still signals the error visually
  }
}

export interface BeepHandle {
  stop: () => void;
}

/** Play a short burst of beeps (timer/pomodoro transitions), then stop. */
export function playChime(durationMs = 1800): void {
  const handle = startBeep();
  window.setTimeout(() => handle.stop(), durationMs);
}

/** Start a repeating two-tone beep. Returns a handle to stop it. */
export function startBeep(): BeepHandle {
  let stopped = false;
  let timer: number | undefined;

  const play = () => {
    if (stopped) return;
    try {
      const c = getCtx();
      if (c.state === "suspended") void c.resume();
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.18);
      // quick attack/decay envelope so it sounds like a beep, not a drone
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc.connect(gain).connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    } catch {
      // ignore a single failed beep
    }
  };

  play();
  timer = window.setInterval(play, 900);

  return {
    stop() {
      stopped = true;
      if (timer !== undefined) window.clearInterval(timer);
    },
  };
}
