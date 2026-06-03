import { getEthosDb } from "./db";
import type { TrackInfo } from "@/types";

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const CACHE_VERSION = 2;
const inMemory = new Map<string, { data: TrackInfo; ts: number; v: number }>();

const dbg = (msg: string) => console.log(`[cache] ${msg}`);

async function deleteRow(videoId: string): Promise<void> {
  try {
    const d = await getEthosDb();
    await d.runAsync("DELETE FROM track_cache WHERE id = ?", videoId);
  } catch {}
}

function getVersion(track: TrackInfo): number {
  return (track as any)._cache_v ?? 1;
}

function stripVersion(track: TrackInfo): TrackInfo {
  const { _cache_v, ...rest } = track as any;
  return rest as TrackInfo;
}

export async function getTrackFromCache(videoId: string): Promise<TrackInfo | null> {
  const mem = inMemory.get(videoId);
  if (mem) {
    if (mem.v !== CACHE_VERSION) {
      dbg(`MEMORY STALE VERSION ${videoId} v=${mem.v} expected=${CACHE_VERSION}`);
      inMemory.delete(videoId);
    } else if (Date.now() - mem.ts < CACHE_TTL_MS) {
      dbg(`MEMORY HIT ${videoId} url=${mem.data.url?.slice(0,80)}... isMuxed=${mem.data.isMuxed}`);
      return mem.data;
    } else {
      inMemory.delete(videoId);
    }
  }

  try {
    const d = await getEthosDb();
    const row = await d.getFirstAsync<{ data: string; cached_at: string }>(
      "SELECT data, cached_at FROM track_cache WHERE id = ?",
      videoId
    );
    if (!row) {
      dbg(`MISS ${videoId}`);
      return null;
    }

    const age = Date.now() - new Date(row.cached_at + "Z").getTime();
    if (age > CACHE_TTL_MS) {
      dbg(`SQLITE EXPIRED ${videoId} age=${Math.round(age/1000)}s`);
      await deleteRow(videoId);
      return null;
    }

    const parsed = JSON.parse(row.data);
    if (getVersion(parsed) !== CACHE_VERSION) {
      dbg(`SQLITE STALE VERSION ${videoId} v=${getVersion(parsed)} expected=${CACHE_VERSION}`);
      await deleteRow(videoId);
      return null;
    }

    const track = stripVersion(parsed) as TrackInfo;
    dbg(`SQLITE HIT ${videoId} url=${track.url?.slice(0,80)}... isMuxed=${track.isMuxed}`);
    inMemory.set(videoId, { data: track, ts: Date.now(), v: CACHE_VERSION });
    return track;
  } catch {
    return null;
  }
}

export async function setTrackCache(videoId: string, track: TrackInfo): Promise<void> {
  inMemory.set(videoId, { data: track, ts: Date.now(), v: CACHE_VERSION });
  try {
    const d = await getEthosDb();
    const data = JSON.stringify({ ...track, _cache_v: CACHE_VERSION });
    await d.runAsync(
      "INSERT OR REPLACE INTO track_cache (id, data, cached_at) VALUES (?, ?, datetime('now'))",
      videoId,
      data
    );
  } catch {}
}
