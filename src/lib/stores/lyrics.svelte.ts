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
  console.log(`[lyrics] fetchServer start id=${id}`);
  const data = await api.getLyrics(id);
  console.log(`[lyrics] fetchServer raw:`, JSON.stringify(data).slice(0, 500));
  if (!data) return { timedLyrics: null, plainText: null };
  if (data.hasTimestamps && Array.isArray(data.lyrics)) {
    const timed = data.lyrics
      .filter((l: any) => l.text)
      .map((l: any) => ({ time: l.startTime / 1000, text: l.text }))
      .sort((a, b) => a.time - b.time);
    console.log(`[lyrics] fetchServer parsed: ${timed.length} timed lines, first:`, timed.slice(0, 3));
    return { timedLyrics: timed, plainText: null };
  }
  if (typeof data.lyrics === "string") {
    const preview = data.lyrics.slice(0, 200);
    console.log(`[lyrics] fetchServer plain text, preview: "${preview}"`);
    return { timedLyrics: null, plainText: data.lyrics };
  }
  console.log(`[lyrics] fetchServer empty`);
  return { timedLyrics: null, plainText: null };
}

async function fetchLRCLIB(artist: string, title: string, duration: number) {
  console.log(`[lyrics] fetchLRCLIB start artist="${artist}" title="${title}" duration=${duration}`);
  const lrclibData = await requestLRCLIB(artist, title, duration);
  if (lrclibData?.syncedLyrics) {
    const lines = parseLRC(lrclibData.syncedLyrics);
    console.log(`[lyrics] fetchLRCLIB synced: ${lines.length} lines, first:`, lines.slice(0, 3));
    console.log(`[lyrics] fetchLRCLIB plainLyrics present: ${!!lrclibData.plainLyrics}`);
    return { timedLyrics: lines, plainText: lrclibData.plainLyrics ?? null };
  }
  if (lrclibData?.plainLyrics) {
    const preview = lrclibData.plainLyrics.slice(0, 200);
    console.log(`[lyrics] fetchLRCLIB plain only, preview: "${preview}"`);
    return { timedLyrics: null, plainText: lrclibData.plainLyrics };
  }
  console.log(`[lyrics] fetchLRCLIB no results`);
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

  console.log(`[lyrics] fetch id=${id} artist="${artist}" title="${title}" duration=${duration}`);

  inflight.add(id);
  lyrics.loading = true;

  try {
    let published = false;
    const lrclibPromise = fetchLRCLIB(artist, title, duration);

    try {
      const serverResult = await fetchServer(id);
      const hasTimed = !!serverResult.timedLyrics;
      const hasPlain = !!serverResult.plainText;
      console.log(`[lyrics] publishing SERVER result: timed=${hasTimed} plain=${hasPlain}`);
      publish(id, serverResult.timedLyrics, serverResult.plainText);
      published = true;
    } catch (e) {
      console.log(`[lyrics] fetchServer threw:`, e);
    }

    const lrclibResult = await lrclibPromise;
    if (lrclibResult.timedLyrics || lrclibResult.plainText) {
      const hasTimed = !!lrclibResult.timedLyrics;
      console.log(`[lyrics] publishing LRCLIB result (overriding server): timed=${hasTimed}`);
      publish(id, lrclibResult.timedLyrics, lrclibResult.plainText);
      published = true;
    } else if (!published) {
      console.log(`[lyrics] no results from any source, publishing null`);
      publish(id, null, null);
    } else {
      console.log(`[lyrics] LRCLIB had no results, keeping server publish`);
    }
  } catch (e) {
    console.log(`[lyrics] outer catch:`, e);
    publish(id, null, null);
  } finally {
    inflight.delete(id);
  }
}
