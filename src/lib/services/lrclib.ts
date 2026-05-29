import type { TimedLyricLine } from "$lib/utils/lrc";

export interface LRCLIBResponse {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  duration: number;
}

const LRCLIB_TIMEOUT_MS = 8_000;

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
      const params = new URLSearchParams({
        artist_name: artist,
        track_name: title,
        duration: String(Math.round(duration)),
      });
      const res = await fetch(`https://lrclib.net/api/get?${params}`, { signal: ac.signal });
      if (res.ok) return res.json();
    }

    const query = `${normalizeQuery(artist)} ${normalizeQuery(title)}`;
    const searchRes = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`,
      { signal: ac.signal },
    );
    if (!searchRes.ok) return null;

    const results = (await searchRes.json()) as any[];
    if (!Array.isArray(results) || results.length === 0) return null;

    const roundedDuration = Math.round(duration);
    const exact = results.find((r) => Math.round(r.duration) === roundedDuration);
    if (exact) return exact;

    const similar = results.filter(
      (r) => Math.abs(Math.round(r.duration) - roundedDuration) <= 3,
    );
    if (similar.length > 0)
      return similar.reduce((a, b) =>
        Math.abs(Math.round(a.duration) - roundedDuration) <
        Math.abs(Math.round(b.duration) - roundedDuration)
          ? a
          : b,
      );

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
