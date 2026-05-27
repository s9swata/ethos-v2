import Database from "@tauri-apps/plugin-sql";
import type { TrackItem, SongItem } from "$lib/types";

let db: Database | null = $state(null);
let ready = $state(false);
let likedIds = $state<Set<string>>(new Set());
let playlists = $state<Playlist[]>([]);

export interface Playlist {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  track_count: number;
}

export interface LikedSong {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  thumbnail: string;
  duration: string;
  added_at: string;
}

export interface PlaylistTrack {
  id: number;
  playlist_id: string;
  track_id: string;
  title: string;
  artist: string;
  album: string | null;
  thumbnail: string;
  duration: string;
  position: number;
  added_at: string;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS liked_songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL DEFAULT '',
    album TEXT,
    thumbnail TEXT NOT NULL DEFAULT '',
    duration TEXT NOT NULL DEFAULT '',
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL DEFAULT '',
    album TEXT,
    thumbnail TEXT NOT NULL DEFAULT '',
    duration TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);
  CREATE INDEX IF NOT EXISTS idx_liked_songs_added ON liked_songs(added_at DESC);
`;

export async function initDb(): Promise<void> {
  if (ready) return;
  try {
    db = await Database.load("sqlite:ethos.db");
    await db.execute(SCHEMA);
    await refreshLikedIds();
    await refreshPlaylists();
    ready = true;
  } catch (e) {
    console.error("DB init failed", e);
  }
}

async function refreshLikedIds(): Promise<void> {
  if (!db) return;
  const rows = await db.select<{ id: string }[]>("SELECT id FROM liked_songs");
  likedIds = new Set(rows.map((r) => r.id));
}

async function refreshPlaylists(): Promise<void> {
  if (!db) return;
  playlists = await db.select<Playlist[]>(
    `SELECT p.*, (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = p.id) as track_count
     FROM playlists p ORDER BY p.updated_at DESC`,
  );
}

export async function likeSong(
  id: string,
  title: string,
  artist: string,
  album: string | null,
  thumbnail: string,
  duration: string,
): Promise<void> {
  likedIds.add(id);
  try {
    if (db) {
      await db.execute(
        `INSERT OR IGNORE INTO liked_songs (id, title, artist, album, thumbnail, duration) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, title, artist, album, thumbnail, duration],
      );
    }
  } catch {
    likedIds.delete(id);
  }
}

export async function unlikeSong(id: string): Promise<void> {
  likedIds.delete(id);
  try {
    if (db) {
      await db.execute("DELETE FROM liked_songs WHERE id = ?", [id]);
    }
  } catch {
    likedIds.add(id);
  }
}

export async function toggleLike(
  id: string,
  title: string,
  artist: string,
  album: string | null,
  thumbnail: string,
  duration: string,
): Promise<boolean> {
  if (likedIds.has(id)) {
    await unlikeSong(id);
    return false;
  }
  await likeSong(id, title, artist, album, thumbnail, duration);
  return true;
}

export async function getLikedSongs(): Promise<LikedSong[]> {
  if (!db) return [];
  return db.select("SELECT * FROM liked_songs ORDER BY added_at DESC");
}

export async function createPlaylist(name: string, description = ""): Promise<string> {
  if (!db) throw new Error("DB not ready");
  const id = crypto.randomUUID();
  await db.execute(
    "INSERT INTO playlists (id, name, description) VALUES (?, ?, ?)",
    [id, name, description],
  );
  await refreshPlaylists();
  return id;
}

export async function deletePlaylist(id: string): Promise<void> {
  if (!db) return;
  await db.execute("DELETE FROM playlists WHERE id = ?", [id]);
  await refreshPlaylists();
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
  if (!db) return;
  await db.execute(
    "UPDATE playlists SET name = ?, updated_at = datetime('now') WHERE id = ?",
    [name, id],
  );
  await refreshPlaylists();
}

export async function addTrackToPlaylist(
  playlistId: string,
  track: { id: string; title: string; artist: string; album: string | null; thumbnail: string; duration: string },
): Promise<void> {
  if (!db) return;
  const maxPos = await db.select<{ m: number | null }[]>(
    "SELECT MAX(position) as m FROM playlist_tracks WHERE playlist_id = ?",
    [playlistId],
  );
  const pos = (maxPos[0]?.m ?? -1) + 1;
  await db.execute(
    `INSERT INTO playlist_tracks (playlist_id, track_id, title, artist, album, thumbnail, duration, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [playlistId, track.id, track.title, track.artist, track.album, track.thumbnail, track.duration, pos],
  );
  await db.execute("UPDATE playlists SET updated_at = datetime('now') WHERE id = ?", [playlistId]);
  await refreshPlaylists();
}

export async function removeTrackFromPlaylist(playlistId: string, position: number): Promise<void> {
  if (!db) return;
  await db.execute(
    "DELETE FROM playlist_tracks WHERE playlist_id = ? AND position = ?",
    [playlistId, position],
  );
  await db.execute("UPDATE playlists SET updated_at = datetime('now') WHERE id = ?", [playlistId]);
  await refreshPlaylists();
}

export async function getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
  if (!db) return [];
  return db.select(
    "SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position",
    [playlistId],
  );
}

export async function reorderPlaylistTrack(
  playlistId: string,
  fromPos: number,
  toPos: number,
): Promise<void> {
  if (!db) return;
  await db.execute("BEGIN TRANSACTION");
  if (fromPos < toPos) {
    await db.execute(
      `UPDATE playlist_tracks SET position = position - 1
       WHERE playlist_id = ? AND position > ? AND position <= ?`,
      [playlistId, fromPos, toPos],
    );
  } else {
    await db.execute(
      `UPDATE playlist_tracks SET position = position + 1
       WHERE playlist_id = ? AND position >= ? AND position < ?`,
      [playlistId, toPos, fromPos],
    );
  }
  await db.execute(
    "UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND position = ?",
    [toPos, playlistId, fromPos],
  );
  await db.execute("COMMIT");
  await db.execute("UPDATE playlists SET updated_at = datetime('now') WHERE id = ?", [playlistId]);
}

export const library = {
  get ready() {
    return ready;
  },
  get likedIds() {
    return likedIds;
  },
  get playlists() {
    return playlists;
  },
};
