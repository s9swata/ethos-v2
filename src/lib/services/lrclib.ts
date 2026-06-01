import type { TimedLyricLine } from "$lib/utils/lrc";

export interface LRCLIBResponse {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  duration: number;
}

const LRCLIB_TIMEOUT_MS = 30_000;

function normalizeQuery(s: string): string {
  return s
    .replace(/- topic$/gi, "")
    .replace(/\(official\s+(video|audio|lyrics?|music\s*video)\)/gi, "")
    .replace(/\(official\)/gi, "")
    .replace(/\(audio\)/gi, "")
    .replace(/\(video\)/gi, "")
    .replace(/\(lyric\s*video\)/gi, "")
    .replace(/\(visualizer\)/gi, "")
    .replace(/\(.*?version\)/gi, "")
    .replace(/\(remaster(ed)?.*?\)/gi, "")
    .replace(/\(taylor.*version\)/gi, "")
    .replace(/\(feat?\..*?\)/gi, "")
    .replace(/\(ft\..*?\)/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function requestLRCLIB(
  artist: string,
  title: string,
  duration: number,
): Promise<LRCLIBResponse | null> {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), LRCLIB_TIMEOUT_MS);

  try {
    if (duration > 0) {
      try {
        const params = new URLSearchParams({ artist_name: artist, track_name: title });
        console.log(`[lrclib] /get?${params}`);
        const getAc = new AbortController();
        const getTimeout = setTimeout(() => getAc.abort(), LRCLIB_TIMEOUT_MS);
        const res = await fetch(`https://lrclib.net/api/get?${params}`, { signal: getAc.signal });
        clearTimeout(getTimeout);
        if (res.ok) {
          const data = await res.json();
          const hasSynced = !!data.syncedLyrics;
          const hasPlain = !!data.plainLyrics;
          console.log(`[lrclib] /get returned: synced=${hasSynced} plain=${hasPlain} duration=${data.duration}`);
          if (hasSynced) {
            console.log(`[lrclib] /get full response:`, JSON.stringify(data, null, 2));
            return data;
          }
          if (hasPlain) {
            console.log(`[lrclib] /get had only plainText (no synced), falling to search`);
          }
        } else {
          console.log(`[lrclib] /get status=${res.status}, falling to search`);
        }
      } catch (e) {
        console.log(`[lrclib] /get threw:`, e);
      }
    }

    const queries = [
      `${normalizeQuery(artist)} ${normalizeQuery(title)}`,
      normalizeQuery(title),
    ];

    let results: any[] = [];

    for (const q of queries) {
      console.log(`[lrclib] /search?q=${encodeURIComponent(q)}`);
      const searchRes = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`,
        { signal: ac.signal },
      );
      if (!searchRes.ok) {
        console.log(`[lrclib] /search status=${searchRes.status}`);
        continue;
      }

      results = (await searchRes.json()) as any[];
      console.log(`[lrclib] /search returned ${results.length} results`);
      for (const r of results) {
        console.log(`[lrclib] result: artist="${r.artistName}" title="${r.trackName}" synced=${!!r.syncedLyrics} plain=${!!r.plainLyrics} dur=${r.duration}`);
      }
      if (Array.isArray(results) && results.some((r: any) => r.syncedLyrics)) break;
    }

    if (!Array.isArray(results) || results.length === 0) return null;

    const roundedDuration = Math.round(duration);
    const exact = results.find((r) => Math.round(r.duration) === roundedDuration);
      if (exact) {
        console.log(`[lrclib] exact duration match: synced=${!!exact.syncedLyrics} title="${exact.trackName}"`);
        if (exact.syncedLyrics) {
          console.log(`[lrclib] exact match full response:`, JSON.stringify(exact, null, 2));
        }
        return exact;
      }

    const similar = results.filter(
      (r) => Math.abs(Math.round(r.duration) - roundedDuration) <= 3,
    );
    if (similar.length > 0) {
      const pick = similar.reduce((a, b) =>
        Math.abs(Math.round(a.duration) - roundedDuration) <
        Math.abs(Math.round(b.duration) - roundedDuration)
          ? a
          : b,
      );
      console.log(`[lrclib] ±3s duration match: synced=${!!pick.syncedLyrics} title="${pick.trackName}"`);
      if (pick.syncedLyrics) {
        console.log(`[lrclib] ±3s match full response:`, JSON.stringify(pick, null, 2));
      }
      return pick;
    }

    console.log(`[lrclib] no duration match, returning first result full response:`, JSON.stringify(results[0], null, 2));
    return results[0];
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const LRC_LINE = /\[(\d+):(\d+\.?\d*)\](.*)/;

export function parseLRC(lrc: string): TimedLyricLine[] {
  const lines: TimedLyricLine[] = [];
  for (const raw of lrc.split("\n")) {
    const match = raw.match(LRC_LINE);
    if (!match) continue;
    const time = parseInt(match[1], 10) * 60 + parseFloat(match[2]);
    const text = match[3].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}
