import { useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { AlarmTrigger } from "../types";
import { startBeep, type BeepHandle } from "../lib/beep";
import { parseYouTubeId, youTubeEmbedUrl } from "../lib/youtube";

/**
 * Plays an alarm trigger on loop while mounted. Rendered inside the ringing
 * overlay; unmounting it stops all sound.
 */
export function TriggerPlayer({ trigger }: { trigger: AlarmTrigger }) {
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
    return (
      <iframe
        className="yt-embed"
        src={youTubeEmbedUrl(id)}
        title="Alarm video"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
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
