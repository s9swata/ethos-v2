import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getEthosDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("ethos.db");
      await db.execAsync(`
          CREATE TABLE IF NOT EXISTS liked_songs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT,
            thumbnail TEXT,
            duration TEXT,
            added_at TEXT DEFAULT (datetime('now'))
          );
          CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          );
          CREATE TABLE IF NOT EXISTS playlist_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER NOT NULL,
            track_id TEXT NOT NULL,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT,
            thumbnail TEXT,
            duration TEXT,
            position INTEGER NOT NULL,
            added_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
          );
          CREATE TABLE IF NOT EXISTS current_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
          );
          CREATE TABLE IF NOT EXISTS track_cache (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            cached_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}
