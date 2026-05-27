import { api, requestLRCLIB } from "@/api/client";
import { parseLRC, type TimedLyricLine } from "./lrc";
import { useLyricsStore } from "@/stores/lyrics-store";
import { usePlayerStore } from "@/stores/player-store";

const cache = new Map<
  string,
  {
    timedLyrics: TimedLyricLine[] | null;
    plainText: string | null;
  }
>();
const inflight = new Set<string>();

export function getCachedLyrics(
  trackId: string
): { timedLyrics: TimedLyricLine[] | null; plainText: string | null } | undefined {
  return cache.get(trackId);
}

export function isPrefetching(trackId: string): boolean {
  return inflight.has(trackId);
}

export async function fetchLyricsForTrack(
  trackId: string,
  artist: string,
  title: string,
  duration: number
): Promise<void> {
  if (inflight.has(trackId)) return;

  const existing = cache.get(trackId);
  if (existing && (existing.timedLyrics || existing.plainText)) {
    useLyricsStore.getState().setLyrics(trackId, existing.timedLyrics, existing.plainText);
    return;
  }

  inflight.add(trackId);
  useLyricsStore.getState().setLoading(true);

  try {
    let timedLyrics: TimedLyricLine[] | null = null;
    let plainText: string | null = null;

    const lrclibData = await requestLRCLIB(artist, title, duration);

    if (lrclibData?.syncedLyrics) {
      timedLyrics = parseLRC(lrclibData.syncedLyrics);
      plainText = lrclibData.plainLyrics ?? null;
    } else if (lrclibData?.plainLyrics) {
      plainText = lrclibData.plainLyrics;
    } else {
      try {
        const serverResult = await api.getLyrics(trackId);
        if (serverResult.hasTimestamps && Array.isArray(serverResult.lyrics)) {
          timedLyrics = serverResult.lyrics
            .filter((l: any) => l.text)
            .map((l: any) => ({ time: l.startTime / 1000, text: l.text }));
        } else if (typeof serverResult.lyrics === "string") {
          plainText = serverResult.lyrics;
        }
      } catch {}
    }

    cache.set(trackId, { timedLyrics, plainText });
    useLyricsStore.getState().setLyrics(trackId, timedLyrics, plainText);
  } catch (e) {
    useLyricsStore.getState().setLyrics(trackId, null, null);
  } finally {
    inflight.delete(trackId);
  }
}

export async function prefetchLyrics(
  trackId: string,
  artist: string,
  title: string,
  duration: number
): Promise<void> {
  if (inflight.has(trackId)) return;
  const existing = cache.get(trackId);
  if (existing && (existing.timedLyrics || existing.plainText)) return;
  fetchLyricsForTrack(trackId, artist, title, duration);
}

export function initLyricsStoreListener() {
  const currentTrack = usePlayerStore.getState().currentTrack;
  if (currentTrack) {
    fetchLyricsForTrack(currentTrack.id, currentTrack.artist, currentTrack.title, currentTrack.duration);
  }

  usePlayerStore.subscribe(
    (state) => state.currentTrack,
    (track) => {
      if (!track) {
        useLyricsStore.getState().clearLyrics();
        return;
      }
      fetchLyricsForTrack(track.id, track.artist, track.title, track.duration);
    }
  );
}
