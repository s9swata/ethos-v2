import { getEthosDb } from "./db";
import type { TrackInfo } from "@/types";

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const inMemory = new Map<string, TrackInfo>();

export async function getTrackFromCache(videoId: string): Promise<TrackInfo | null> {
  const mem = inMemory.get(videoId);
  if (mem) return mem;

  try {
    const d = await getEthosDb();
    const row = await d.getFirstAsync<{ data: string; cached_at: string }>(
      "SELECT data, cached_at FROM track_cache WHERE id = ?",
      videoId
    );
    if (!row) return null;

    const age = Date.now() - new Date(row.cached_at + "Z").getTime();
    if (age > CACHE_TTL_MS) {
      await d.runAsync("DELETE FROM track_cache WHERE id = ?", videoId);
      return null;
    }

    const track = JSON.parse(row.data) as TrackInfo;
    inMemory.set(videoId, track);
    return track;
  } catch {
    return null;
  }
}

export async function setTrackCache(videoId: string, track: TrackInfo): Promise<void> {
  inMemory.set(videoId, track);
  try {
    const d = await getEthosDb();
    const data = JSON.stringify(track);
    await d.runAsync(
      "INSERT OR REPLACE INTO track_cache (id, data, cached_at) VALUES (?, ?, datetime('now'))",
      videoId,
      data
    );
  } catch {}
}
