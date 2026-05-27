import type { TrackInfo, PlayHistoryItem } from "@/types";
import type { AutoQueueItem } from "./player-types";
import { api } from "@/api/client";

export const MAX_HISTORY = 10;

export function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function trackToHistoryEntry(track: TrackInfo): PlayHistoryItem {
  return { id: track.id, title: track.title, artist: track.artist, thumbnail: track.thumbnail };
}

export function addToPlayHistory(history: PlayHistoryItem[], entry: PlayHistoryItem): PlayHistoryItem[] {
  return [entry, ...history.filter((h) => h.id !== entry.id)].slice(0, MAX_HISTORY);
}

function scorePoolItem(item: AutoQueueItem, recentAlbums: string[]): number {
  let score = 0;
  if (item.isTopSong) score += 100;
  else score += 40;
  if (item.albumBrowseId) {
    if (!recentAlbums.includes(item.albumBrowseId)) score += 30;
    else score -= 20;
  }
  if (item.albumIndex != null) {
    score += Math.max(0, 20 - item.albumIndex * 2);
  }
  return score;
}

export function scoreRefillBatch(pool: AutoQueueItem[], playedIds: string[], recentAlbums: string[]): AutoQueueItem[] | null {
  const unplayed = pool.filter((item) => item.videoId && !playedIds.includes(item.videoId));
  if (unplayed.length === 0) return null;
  unplayed.sort((a, b) => scorePoolItem(b, recentAlbums) - scorePoolItem(a, recentAlbums));
  return unplayed.slice(0, 10);
}

export async function fetchArtistAutoQueue(artistId: string, excludeId?: string | null): Promise<AutoQueueItem[] | null> {
  try {
    const artist = await api.getArtist(artistId);
    return shuffle(artist.topSongs)
      .filter((s) => s.videoId && s.videoId !== excludeId)
      .slice(0, 10)
      .map((s) => ({
        title: s.title,
        videoId: s.videoId,
        artists: s.artists,
        thumbnail: s.thumbnails?.[0]?.url,
      }));
  } catch {
    return null;
  }
}
