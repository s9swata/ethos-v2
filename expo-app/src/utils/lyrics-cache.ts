import type { AlignedLine } from "./ttml";
import type { LyricsResponse } from "@/types";
import { parseLRC, type TimedLyricLine } from "./lrc";
import { api, requestLRCLIB } from "@/api/client";
import { getCachedTTML } from "./ttml";

export interface LyricsCache {
  lrclibLyrics: TimedLyricLine[] | null;
  lyricsResult: LyricsResponse | null;
  alignedLyrics: AlignedLine[] | null;
  plainText: string | null;
}

const cache = new Map<string, LyricsCache>();
const inflight = new Set<string>();

export function getCachedLyrics(trackId: string): LyricsCache | undefined {
  const entry = cache.get(trackId);
  if (entry) {
    console.log(`[lyrics-cache] HIT for ${trackId}:`, {
      lrclib: !!entry.lrclibLyrics,
      server: !!entry.lyricsResult,
      ttml: !!entry.alignedLyrics,
    });
  }
  return entry;
}

export function isPrefetching(trackId: string): boolean {
  return inflight.has(trackId);
}

export async function prefetchLyrics(
  trackId: string,
  artist: string,
  title: string,
  duration: number,
): Promise<void> {
  if (inflight.has(trackId)) return;
  if (cache.has(trackId)) return;

  console.log(`[lyrics-cache] Prefetching for ${trackId} (${artist} — ${title})`);

  // Check TTML cache first
  const cachedTtml = getCachedTTML(trackId);
  if (cachedTtml) {
    console.log(`[lyrics-cache] TTML cache HIT for ${trackId}, storing ${cachedTtml.length} lines`);
    cache.set(trackId, { lrclibLyrics: null, lyricsResult: null, alignedLyrics: cachedTtml, plainText: null });
    return;
  }

  inflight.add(trackId);

  try {
    const [lrclibData, serverResult] = await Promise.all([
      requestLRCLIB(artist, title, duration),
      api.getLyrics(trackId).catch(() => null as LyricsResponse | null),
    ]);

    let lrclibLyrics: TimedLyricLine[] | null = null;
    let lyricsResult: LyricsResponse | null = null;
    let plainText: string | null = null;

    if (lrclibData?.syncedLyrics) {
      console.log(`[lyrics-cache] LRCLIB synced lyrics found for ${trackId}`);
      lrclibLyrics = parseLRC(lrclibData.syncedLyrics);
      plainText = lrclibData.plainLyrics ?? null;
    }

    if (!lrclibData?.syncedLyrics && serverResult) {
      console.log(`[lyrics-cache] Server lyrics result for ${trackId}: hasTimestamps=${serverResult.hasTimestamps}`);
      lyricsResult = serverResult;
      if (typeof serverResult.lyrics === "string") {
        plainText = serverResult.lyrics;
      } else if (Array.isArray(serverResult.lyrics)) {
        plainText = serverResult.lyrics.map((l) => l.text).join("\n");
      }
    }

    if (!lrclibData?.syncedLyrics && !serverResult) {
      console.log(`[lyrics-cache] No lyrics found for ${trackId}`);
    }

    cache.set(trackId, { lrclibLyrics, lyricsResult, alignedLyrics: null, plainText });
  } catch (e) {
    console.warn(`[lyrics-cache] Prefetch failed for ${trackId}:`, e);
  } finally {
    inflight.delete(trackId);
  }
}
