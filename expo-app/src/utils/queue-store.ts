import { getEthosDb } from "./db";

export interface StoredTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

export interface SavedQueue {
  userQueue: StoredTrack[];
  contextQueue: any[];
  watchPlaylistId: string | null;
  context: { type: string; id?: string };
  currentTrack: StoredTrack | null;
  currentTime: number;
  duration: number;
  repeat: string;
  isShuffled: boolean;
  volume: number;
  currentArtistId: string | null;
  currentAlbumId: string | null;
  history: StoredTrack[];
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

function stripTrack(t: { videoId?: string; title: string; artist: string; duration: number; thumbnail: string }): StoredTrack {
  return { id: t.videoId ?? "", title: t.title, artist: t.artist, duration: t.duration, thumbnail: t.thumbnail };
}

export function serializeQueue(state: {
  userQueue: any[];
  contextQueue: any[];
  watchPlaylistId: string | null;
  context: { type: string; id?: string };
  currentTrack: StoredTrack | null;
  currentTime: number;
  duration: number;
  repeat: string;
  isShuffled: boolean;
  volume: number;
  currentArtistId: string | null;
  currentAlbumId: string | null;
  history: any[];
}): SavedQueue {
  return {
    userQueue: state.userQueue.map((t) => stripTrack(t)),
    contextQueue: state.contextQueue,
    watchPlaylistId: state.watchPlaylistId,
    context: state.context,
    currentTrack: state.currentTrack ? stripTrack(state.currentTrack) : null,
    currentTime: state.currentTime,
    duration: state.duration,
    repeat: state.repeat,
    isShuffled: state.isShuffled,
    volume: state.volume,
    currentArtistId: state.currentArtistId,
    currentAlbumId: state.currentAlbumId,
    history: state.history,
  };
}
