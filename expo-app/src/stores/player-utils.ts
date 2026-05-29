import type { TrackInfo, QueueItem } from "@/types";

export const MAX_HISTORY = 50;

export function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function trackToHistoryEntry(track: TrackInfo): QueueItem {
  return {
    videoId: track.id,
    title: track.title,
    artist: track.artist,
    thumbnail: track.thumbnail,
    duration: track.duration,
  };
}

export function addToPlayHistory(history: QueueItem[], entry: QueueItem): QueueItem[] {
  return [entry, ...history.filter((h) => h.videoId !== entry.videoId)].slice(0, MAX_HISTORY);
}
