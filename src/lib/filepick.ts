import { open } from "@tauri-apps/plugin-dialog";
import type { MediaKind } from "../types";

const AUDIO_EXT = ["mp3", "wav", "m4a", "aac", "flac", "ogg", "oga", "opus"];
const VIDEO_EXT = ["mp4", "mov", "m4v", "webm", "mkv", "avi"];

export function mediaKindForPath(path: string): MediaKind {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXT.includes(ext) ? "video" : "audio";
}

export interface PickedFile {
  path: string;
  fileName: string;
  mediaKind: MediaKind;
}

/** Open the native file picker for an audio or video file. */
export async function pickMediaFile(): Promise<PickedFile | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [
      { name: "Audio / Video", extensions: [...AUDIO_EXT, ...VIDEO_EXT] },
    ],
  });
  if (!selected || Array.isArray(selected)) return null;
  const path = selected;
  const fileName = path.split(/[\\/]/).pop() ?? path;
  return { path, fileName, mediaKind: mediaKindForPath(path) };
}
