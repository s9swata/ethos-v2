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
const LRCLIB_TIMEOUT_MS = 20_000;

export function getCachedLyrics(
  trackId: string
): { timedLyrics: TimedLyricLine[] | null; plainText: string | null } | undefined {
  return cache.get(trackId);
}

export function isPrefetching(trackId: string): boolean {
  return inflight.has(trackId);
}

function publishLyrics(
  trackId: string,
  timedLyrics: TimedLyricLine[] | null,
  plainText: string | null
) {
  cache.set(trackId, { timedLyrics, plainText });
  if (usePlayerStore.getState().currentTrack?.id === trackId) {
    useLyricsStore.getState().setLyrics(trackId, timedLyrics, plainText);
  }
}

async function fetchServerLyrics(trackId: string) {
  const serverResult = await api.getLyrics(trackId);
  if (serverResult.hasTimestamps && Array.isArray(serverResult.lyrics)) {
    return {
      timedLyrics: serverResult.lyrics
        .filter((l: any) => l.text)
        .map((l: any) => ({ time: l.startTime / 1000, text: l.text })),
      plainText: null,
    };
  }
  if (typeof serverResult.lyrics === "string") {
    return { timedLyrics: null, plainText: serverResult.lyrics };
  }
  return { timedLyrics: null, plainText: null };
}

async function fetchLRCLIBLyrics(artist: string, title: string, duration: number) {
  const lrclibData = await requestLRCLIB(artist, title, duration, LRCLIB_TIMEOUT_MS);
  if (lrclibData?.syncedLyrics) {
    return {
      timedLyrics: parseLRC(lrclibData.syncedLyrics),
      plainText: lrclibData.plainLyrics ?? null,
    };
  }
  if (lrclibData?.plainLyrics) {
    return { timedLyrics: null, plainText: lrclibData.plainLyrics };
  }
  return { timedLyrics: null, plainText: null };
}

export async function fetchLyricsForTrack(
  trackId: string,
  artist: string,
  title: string,
  duration: number
): Promise<void> {
  if (inflight.has(trackId)) return;

  const existing = cache.get(trackId);
  if (existing) {
    publishLyrics(trackId, existing.timedLyrics, existing.plainText);
    return;
  }

  inflight.add(trackId);
  useLyricsStore.getState().setLoading(true);

  try {
    let published = false;
    const lrclibPromise = fetchLRCLIBLyrics(artist, title, duration);

    try {
      const serverLyrics = await fetchServerLyrics(trackId);
      publishLyrics(trackId, serverLyrics.timedLyrics, serverLyrics.plainText);
      published = true;
    } catch {}

    const lrclibLyrics = await lrclibPromise;
    if (lrclibLyrics.timedLyrics || lrclibLyrics.plainText) {
      publishLyrics(trackId, lrclibLyrics.timedLyrics, lrclibLyrics.plainText);
      published = true;
    } else if (!published) {
      publishLyrics(trackId, null, null);
    }
  } catch (e) {
    publishLyrics(trackId, null, null);
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
  if (existing) return;
  fetchLyricsForTrack(trackId, artist, title, duration);
}

export function initLyricsStoreListener() {
  const currentTrack = usePlayerStore.getState().currentTrack;
  let previousTrackId = currentTrack?.id ?? null;

  if (currentTrack) {
    fetchLyricsForTrack(currentTrack.id, currentTrack.artist, currentTrack.title, currentTrack.duration);
  }

  usePlayerStore.subscribe((state) => {
    const track = state.currentTrack;
    if ((track?.id ?? null) === previousTrackId) return;
    previousTrackId = track?.id ?? null;

    if (!track) {
      useLyricsStore.getState().clearLyrics();
      return;
    }
    fetchLyricsForTrack(track.id, track.artist, track.title, track.duration);
  });
}
