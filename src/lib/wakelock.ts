// Keep the screen awake (nightstand mode) so iOS doesn't auto-lock and freeze
// the app — the in-app alarm scheduler only runs while the app is foreground.

let sentinel: { release: () => Promise<void> } | null = null;
let want = false;

async function acquire(): Promise<void> {
  if (!want || sentinel) return;
  try {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void>; addEventListener?: (e: string, cb: () => void) => void }> } }).wakeLock;
    if (wl) {
      const s = await wl.request("screen");
      sentinel = s;
      s.addEventListener?.("release", () => {
        sentinel = null;
      });
    }
  } catch {
    // Wake Lock API unavailable — nothing we can do from the web layer
  }
}

/** Turn the keep-awake request on or off. */
export async function setKeepAwake(on: boolean): Promise<void> {
  want = on;
  if (on) {
    await acquire();
  } else if (sentinel) {
    try {
      await sentinel.release();
    } catch {
      /* ignore */
    }
    sentinel = null;
  }
}

// The OS drops the wake lock whenever the page is hidden; re-acquire on return.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void acquire();
  });
}
