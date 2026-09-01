/** Extract a YouTube video id from the many URL shapes people paste. */
export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();

  // Bare 11-char id
  if (/^[\w-]{11}$/.test(s)) return s;

  try {
    const url = new URL(s);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return id || null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      // watch?v=ID
      const v = url.searchParams.get("v");
      if (v) return v;
      // /embed/ID  or  /shorts/ID  or  /live/ID
      const m = url.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // not a URL — fall through
  }
  return null;
}

/** Build a looping, autoplaying embed URL for the ringing overlay. */
export function youTubeEmbedUrl(id: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    loop: "1",
    playlist: id, // required for a single video to loop
    controls: "1",
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
  });
  // A real web origin helps YouTube accept the embed (fixes many "153" errors).
  // The Tauri custom-scheme origin is opaque, so only send it when http(s).
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  if (/^https?:/.test(origin)) params.set("origin", origin);
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/** Plain watch URL for opening in the system browser as a fallback. */
export function youTubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}
