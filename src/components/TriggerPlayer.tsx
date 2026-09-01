import { useEffect, useRef } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { AlarmTrigger } from "../types";
import { startBeep, type BeepHandle } from "../lib/beep";
import { parseYouTubeId, youTubeWatchUrl } from "../lib/youtube";
import { isMobile } from "../lib/mobileAlarms";

const YT_WINDOW_LABEL = "yt-alarm";

/**
 * Plays a YouTube video when the alarm triggers. Inline iframes fail in a
 * shipped webview (opaque origin -> Error 153), so on desktop we open a
 * dedicated window whose *top-level* page is youtube.com (no cross-origin
 * embed, and Tauri allows autoplay, so it plays and loops). Mobile is
 * single-window, so it falls back to the system browser.
 */
function YouTubeTrigger({ id, autoOpen }: { id: string; autoOpen: boolean }) {
  const openedRef = useRef(false);

  const play = async () => {
    // Load the real watch page (not /embed/, which errors when not iframed).
    const url = youTubeWatchUrl(id);
    if (isMobile()) {
      void openUrl(url);
      return;
    }
    try {
      // Rust opens the window with an injected script that loops the player.
      await invoke("open_video", { url });
    } catch {
      void openUrl(url); // any failure: fall back to the browser
    }
  };

  useEffect(() => {
    if (autoOpen && !openedRef.current) {
      openedRef.current = true;
      void play();
    }
    // Close the video window when the alarm is dismissed/unmounted.
    return () => {
      void WebviewWindow.getByLabel(YT_WINDOW_LABEL).then((w) => w?.close());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, id]);

  return (
    <div className="yt-panel">
      <div className="yt-logo">▶ YouTube</div>
      <div className="yt-msg">
        {autoOpen ? "Playing your video…" : "Plays in a video window"}
      </div>
      <button className="btn primary big" onClick={() => void play()}>
        ▶ Play video
      </button>
    </div>
  );
}

/**
 * Plays an alarm trigger while mounted. Rendered inside the ringing overlay
 * (autoOpen) and the editor preview (manual). Unmounting stops beep/media.
 */
export function TriggerPlayer({
  trigger,
  autoOpen = false,
}: {
  trigger: AlarmTrigger;
  autoOpen?: boolean;
}) {
  const beepRef = useRef<BeepHandle | null>(null);

  useEffect(() => {
    if (trigger.type === "beep") {
      beepRef.current = startBeep();
      return () => beepRef.current?.stop();
    }
  }, [trigger.type]);

  if (trigger.type === "youtube") {
    const id = parseYouTubeId(trigger.url ?? "");
    if (!id) {
      return <div className="player-fallback">Invalid YouTube link</div>;
    }
    return <YouTubeTrigger id={id} autoOpen={autoOpen} />;
  }

  if (trigger.type === "file" && trigger.path) {
    const src = convertFileSrc(trigger.path);
    if (trigger.mediaKind === "video") {
      return (
        <video className="media-player" src={src} autoPlay loop controls />
      );
    }
    return <audio src={src} autoPlay loop controls />;
  }

  // beep has no visible element
  return null;
}
