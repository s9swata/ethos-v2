import type { TimedLyricLine } from "$lib/utils/lrc";
import { api } from "$lib/services/api";
import { requestLRCLIB, parseLRC } from "$lib/services/lrclib";

export const lyrics = $state({
  trackId: null as string | null,
  timedLyrics: null as TimedLyricLine[] | null,
  plainText: null as string | null,
  loading: false,
  error: null as string | null,
});

let inflight = new Set<string>();
let cache = new Map<string, { timedLyrics: TimedLyricLine[] | null; plainText: string | null }>();

function setLyrics(id: string, timed: TimedLyricLine[] | null, plain: string | null) {
  lyrics.trackId = id;
  lyrics.timedLyrics = timed;
  lyrics.plainText = plain;
  lyrics.error = null;
  lyrics.loading = false;
}

export function clearLyrics() {
  lyrics.trackId = null;
  lyrics.timedLyrics = null;
  lyrics.plainText = null;
  lyrics.loading = false;
  lyrics.error = null;
}

function publish(id: string, timed: TimedLyricLine[] | null, plain: string | null) {
  cache.set(id, { timedLyrics: timed, plainText: plain });
  if (lyrics.trackId === null || lyrics.trackId === id) {
    setLyrics(id, timed, plain);
  }
}

async function fetchServer(id: string) {
  const data = await api.getLyrics(id);
  if (!data) return { timedLyrics: null, plainText: null };
  if (data.hasTimestamps && Array.isArray(data.lyrics)) {
    const timed = data.lyrics
      .filter((l: any) => l.text)
      .map((l: any) => ({ time: l.startTime / 1000, text: l.text }))
      .sort((a, b) => a.time - b.time);
    return { timedLyrics: timed, plainText: null };
  }
  if (typeof data.lyrics === "string") {
    return { timedLyrics: null, plainText: data.lyrics };
  }
  return { timedLyrics: null, plainText: null };
}

async function fetchLRCLIB(artist: string, title: string, duration: number) {
  const lrclibData = await requestLRCLIB(artist, title, duration);
  if (lrclibData?.syncedLyrics) {
    return { timedLyrics: parseLRC(lrclibData.syncedLyrics), plainText: lrclibData.plainLyrics ?? null };
  }
  if (lrclibData?.plainLyrics) {
    return { timedLyrics: null, plainText: lrclibData.plainLyrics };
  }
  return { timedLyrics: null, plainText: null };
}

export async function fetch(
  id: string,
  artist: string,
  title: string,
  duration: number,
): Promise<void> {
  if (inflight.has(id)) return;

  const existing = cache.get(id);
  if (existing) {
    lyrics.trackId = id;
    lyrics.timedLyrics = existing.timedLyrics;
    lyrics.plainText = existing.plainText;
    lyrics.error = null;
    lyrics.loading = false;
    return;
  }

  inflight.add(id);
  lyrics.loading = true;

  try {
    let published = false;
    const lrclibPromise = fetchLRCLIB(artist, title, duration);

    try {
      const serverResult = await fetchServer(id);
      publish(id, serverResult.timedLyrics, serverResult.plainText);
      published = true;
    } catch {}

    const lrclibResult = await lrclibPromise;
    if (lrclibResult.timedLyrics || lrclibResult.plainText) {
      publish(id, lrclibResult.timedLyrics, lrclibResult.plainText);
      published = true;
    } else if (!published) {
      publish(id, null, null);
    }
  } catch {
    publish(id, null, null);
  } finally {
    inflight.delete(id);
  }
}
