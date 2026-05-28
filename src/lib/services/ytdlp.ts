import type { TrackInfo, AudioFormat } from "$lib/types";

const trackCache = new Map<string, TrackInfo>();

function isTauri(): boolean {
  try {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  } catch {
    return false;
  }
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

type TrackInfoResult = {
  id: string;
  title: string;
  artist: string;
  duration: number;
  start_time: number;
  end_time: number;
  url: string;
  thumbnail: string;
  webpage_url: string;
  direct_url: string;
  formats: { url: string; ext: string; format: string; bitrate: number }[];
};

export async function getTrackInfo(trackId: string): Promise<TrackInfo> {
  const cached = trackCache.get(trackId);
  if (cached) return cached;

  if (!isTauri()) throw new Error("Tauri API not available");

  const result = await invoke<TrackInfoResult>("fetch_track_info", { id: trackId });

  const info: TrackInfo = {
    id: result.id,
    title: result.title,
    artist: result.artist,
    duration: result.duration,
    startTime: result.start_time,
    endTime: result.end_time,
    url: result.url,
    thumbnail: result.thumbnail,
    webpageUrl: result.webpage_url,
    directUrl: result.direct_url,
    formats: result.formats.map(
      (f): AudioFormat => ({
        url: f.url,
        ext: f.ext,
        format: f.format,
        bitrate: f.bitrate,
      })
    ),
  };

  trackCache.set(trackId, info);
  return info;
}

type PlaylistResult = {
  title: string;
  tracks: { id: string; title: string; artist: string; duration: number; thumbnail: string }[];
};

export async function getPlaylistInfo(playlistId: string): Promise<PlaylistResult> {
  if (!isTauri()) throw new Error("Tauri API not available");

  return invoke<PlaylistResult>("fetch_playlist", { playlistId });
}
