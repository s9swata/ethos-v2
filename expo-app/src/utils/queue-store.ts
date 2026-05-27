import { getEthosDb } from "./db";

export interface StoredTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

export interface StoredAutoQueueItem {
  title: string | null;
  videoId: string | null;
  artists: string[];
  thumbnail?: string | null;
  isTopSong?: boolean;
  albumBrowseId?: string | null;
  albumIndex?: number | null;
  duration?: string | null;
}

export interface SavedQueue {
  queue: StoredTrack[];
  queueIndex: number;
  autoQueue: StoredAutoQueueItem[];
  autoQueueIndex: number;
  currentTrack: StoredTrack | null;
  currentTime: number;
  duration: number;
  repeat: string;
  isShuffled: boolean;
  volume: number;
  currentArtistId: string | null;
  currentAlbumId: string | null;
  currentAutoQueueSource: string | null;
  playHistory: { id: string; title: string; artist: string; thumbnail: string }[];
  recentAlbumIds: string[];
}

export async function saveQueue(data: SavedQueue): Promise<void> {
  try {
    const d = await getEthosDb();
    const json = JSON.stringify(data);
    const existing = await d.getAllAsync<{ id: number }>("SELECT id FROM current_queue LIMIT 1");
    if (existing.length > 0) {
      await d.runAsync("UPDATE current_queue SET data = ?, updated_at = datetime('now') WHERE id = ?", json, existing[0].id);
    } else {
      await d.runAsync("INSERT INTO current_queue (data) VALUES (?)", json);
    }
  } catch {}
}

export async function loadQueue(): Promise<SavedQueue | null> {
  try {
    const d = await getEthosDb();
    const rows = await d.getAllAsync<{ data: string }>("SELECT data FROM current_queue ORDER BY id DESC LIMIT 1");
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].data) as SavedQueue;
  } catch {
    return null;
  }
}

export async function clearQueue(): Promise<void> {
  try {
    const d = await getEthosDb();
    await d.runAsync("DELETE FROM current_queue");
  } catch {}
}

function stripTrack(t: StoredTrack): StoredTrack {
  return { id: t.id, title: t.title, artist: t.artist, duration: t.duration, thumbnail: t.thumbnail };
}

export function serializeQueue(state: {
  queue: StoredTrack[];
  queueIndex: number;
  autoQueue: StoredAutoQueueItem[];
  autoQueueIndex: number;
  currentTrack: StoredTrack | null;
  currentTime: number;
  duration: number;
  repeat: string;
  isShuffled: boolean;
  volume: number;
  currentArtistId: string | null;
  currentAlbumId: string | null;
  currentAutoQueueSource: string | null;
  playHistory: { id: string; title: string; artist: string; thumbnail: string }[];
  recentAlbumIds: string[];
}): SavedQueue {
  return {
    queue: state.queue.map(stripTrack),
    queueIndex: state.queueIndex,
    autoQueue: state.autoQueue,
    autoQueueIndex: state.autoQueueIndex,
    currentTrack: state.currentTrack ? stripTrack(state.currentTrack) : null,
    currentTime: state.currentTime,
    duration: state.duration,
    repeat: state.repeat,
    isShuffled: state.isShuffled,
    volume: state.volume,
    currentArtistId: state.currentArtistId,
    currentAlbumId: state.currentAlbumId,
    currentAutoQueueSource: state.currentAutoQueueSource,
    playHistory: state.playHistory,
    recentAlbumIds: state.recentAlbumIds,
  };
}
