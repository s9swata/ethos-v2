import { Database } from "bun:sqlite";
import { join } from "path";

let db: Database;

export async function getDb() {
  if (db) return crud;
  const dbPath = join(process.env.HOME || "/tmp", ".ethos", "library.db");
  const dir = join(process.env.HOME || "/tmp", ".ethos");
  Bun.spawnSync(["mkdir", "-p", dir]);
  db = new Database(dbPath, { create: true });
  db.run("PRAGMA journal_mode=WAL");
  db.exec(SCHEMA);
  return crud;
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
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

const crud = {
  isLiked(id: string): boolean {
    const row = db.query("SELECT 1 FROM liked_songs WHERE id = ?").get(id);
    return !!row;
  },

  toggleLike(id: string, track: any): boolean {
    const existing = db.query("SELECT 1 FROM liked_songs WHERE id = ?").get(id);
    if (existing) {
      db.run("DELETE FROM liked_songs WHERE id = ?", id);
      return false;
    }
    db.run(
      "INSERT INTO liked_songs (id, title, artist, album, thumbnail, duration) VALUES (?, ?, ?, ?, ?, ?)",
      id,
      track.title ?? "",
      track.artist ?? "",
      track.album ?? null,
      track.thumbnail ?? "",
      String(track.duration ?? ""),
    );
    return true;
  },

  getLikedSongs(): any[] {
    return db.query("SELECT * FROM liked_songs ORDER BY added_at DESC").all();
  },

  getPlaylists(): any[] {
    return db
      .query(
        `SELECT p.*, (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = p.id) as track_count
         FROM playlists p ORDER BY p.updated_at DESC`,
      )
      .all();
  },

  createPlaylist(name: string, description?: string): any {
    const info = db.run(
      "INSERT INTO playlists (name, description) VALUES (?, ?)",
      name,
      description ?? "",
    );
    const row = db.query("SELECT * FROM playlists WHERE id = ?").get(Number(info.lastInsertRowid));
    return row;
  },

  deletePlaylist(id: number): void {
    db.run("DELETE FROM playlists WHERE id = ?", id);
  },

  renamePlaylist(id: number, name: string): void {
    db.run("UPDATE playlists SET name = ?, updated_at = datetime('now') WHERE id = ?", name, id);
  },

  addTrack(playlistId: number, track: any): void {
    const maxPos: any = db
      .query("SELECT MAX(position) as m FROM playlist_tracks WHERE playlist_id = ?")
      .get(playlistId);
    const pos = (maxPos?.m ?? -1) + 1;
    db.run(
      `INSERT INTO playlist_tracks (playlist_id, track_id, title, artist, album, thumbnail, duration, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      playlistId,
      track.id,
      track.title ?? "",
      track.artist ?? "",
      track.album ?? null,
      track.thumbnail ?? "",
      String(track.duration ?? ""),
      pos,
    );
    db.run("UPDATE playlists SET updated_at = datetime('now') WHERE id = ?", playlistId);
  },

  removeTrack(playlistId: number, trackId: string): void {
    db.run(
      "DELETE FROM playlist_tracks WHERE playlist_id = ? AND (track_id = ? OR CAST(id AS TEXT) = ?)",
      playlistId,
      trackId,
      trackId,
    );
    db.run("UPDATE playlists SET updated_at = datetime('now') WHERE id = ?", playlistId);
  },

  getPlaylistTracks(id: number): any[] {
    return db
      .query("SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position")
      .all(id);
  },

  reorderTrack(playlistId: number, trackId: string, newIndex: number): void {
    const track: any = db
      .query(
        "SELECT * FROM playlist_tracks WHERE playlist_id = ? AND (track_id = ? OR CAST(id AS TEXT) = ?)",
      )
      .get(playlistId, trackId, trackId);
    if (!track) return;

    const fromPos = track.position;
    db.run("BEGIN TRANSACTION");
    if (fromPos < newIndex) {
      db.run(
        `UPDATE playlist_tracks SET position = position - 1
         WHERE playlist_id = ? AND position > ? AND position <= ?`,
        playlistId,
        fromPos,
        newIndex,
      );
    } else {
      db.run(
        `UPDATE playlist_tracks SET position = position + 1
         WHERE playlist_id = ? AND position >= ? AND position < ?`,
        playlistId,
        newIndex,
        fromPos,
      );
    }
    db.run(
      "UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND (track_id = ? OR CAST(id AS TEXT) = ?)",
      newIndex,
      playlistId,
      trackId,
      trackId,
    );
    db.run("COMMIT");
    db.run("UPDATE playlists SET updated_at = datetime('now') WHERE id = ?", playlistId);
  },
};
