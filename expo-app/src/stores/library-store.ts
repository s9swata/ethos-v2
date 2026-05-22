import { create } from "zustand";
import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync("ethos.db");
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
    `);
  }
  return db;
}

export interface LikedSong {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  thumbnail?: string | null;
  duration?: string | null;
  added_at: string;
}

interface Playlist {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  track_count?: number;
}

export interface PlaylistTrack {
  id: number;
  playlist_id: number;
  track_id: string;
  title: string;
  artist: string;
  album?: string | null;
  thumbnail?: string | null;
  duration?: string | null;
  position: number;
  added_at: string;
}

interface LibraryState {
  ready: boolean;
  likedIds: Set<string>;
  likedSongs: LikedSong[];
  playlists: Playlist[];
  playlistTracks: Record<number, PlaylistTrack[]>;
}

interface LibraryActions {
  init: () => Promise<void>;
  toggleLike: (song: {
    id: string;
    title: string;
    artist: string;
    album?: string | null;
    thumbnail?: string | null;
    duration?: string | null;
  }) => Promise<boolean>;
  isLiked: (id: string) => boolean;
  getLikedSongs: () => Promise<LikedSong[]>;
  createPlaylist: (name: string, description?: string) => Promise<number>;
  deletePlaylist: (id: number) => Promise<void>;
  renamePlaylist: (id: number, name: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: number, track: PlaylistTrack) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: number, position: number) => Promise<void>;
  getPlaylistTracks: (playlistId: number) => Promise<PlaylistTrack[]>;
}

type LibraryStore = LibraryState & LibraryActions;

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  ready: false,
  likedIds: new Set(),
  likedSongs: [],
  playlists: [],
  playlistTracks: {},

  init: async () => {
    const d = await getDb();
    const liked = await d.getAllAsync<LikedSong>(
      "SELECT * FROM liked_songs ORDER BY added_at DESC"
    );
    const playlists = await d.getAllAsync<Playlist>(
      "SELECT p.*, (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) as track_count FROM playlists p ORDER BY p.updated_at DESC"
    );
    set({
      ready: true,
      likedIds: new Set(liked.map((s) => s.id)),
      likedSongs: liked,
      playlists,
    });
  },

  toggleLike: async (song) => {
    const d = await getDb();
    const isLiked = get().likedIds.has(song.id);
    if (isLiked) {
      await d.runAsync("DELETE FROM liked_songs WHERE id = ?", song.id);
      set((state) => {
        const likedIds = new Set(state.likedIds);
        likedIds.delete(song.id);
        return {
          likedIds,
          likedSongs: state.likedSongs.filter((s) => s.id !== song.id),
        };
      });
      return false;
    } else {
      await d.runAsync(
        "INSERT INTO liked_songs (id, title, artist, album, thumbnail, duration) VALUES (?, ?, ?, ?, ?, ?)",
        song.id,
        song.title,
        song.artist,
        song.album ?? null,
        song.thumbnail ?? null,
        song.duration ?? null
      );
      set((state) => {
        const likedIds = new Set(state.likedIds);
        likedIds.add(song.id);
        return { likedIds };
      });
      return true;
    }
  },

  isLiked: (id) => get().likedIds.has(id),

  getLikedSongs: async () => {
    const d = await getDb();
    const songs = await d.getAllAsync<LikedSong>(
      "SELECT * FROM liked_songs ORDER BY added_at DESC"
    );
    set({ likedSongs: songs });
    return songs;
  },

  createPlaylist: async (name, description) => {
    const d = await getDb();
    const result = await d.runAsync(
      "INSERT INTO playlists (name, description) VALUES (?, ?)",
      name,
      description ?? null
    );
    const created = await d.getAllAsync<Playlist>(
      "SELECT p.*, (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) as track_count FROM playlists WHERE p.id = ?",
      result.lastInsertRowId
    );
    if (created.length > 0) {
      set((state) => ({ playlists: [...state.playlists, created[0]] }));
    }
    return Number(result.lastInsertRowId);
  },

  deletePlaylist: async (id) => {
    const d = await getDb();
    await d.runAsync("DELETE FROM playlists WHERE id = ?", id);
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id),
    }));
  },

  renamePlaylist: async (id, name) => {
    const d = await getDb();
    await d.runAsync(
      "UPDATE playlists SET name = ?, updated_at = datetime('now') WHERE id = ?",
      name,
      id
    );
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === id ? { ...p, name, updated_at: new Date().toISOString() } : p
      ),
    }));
  },

  addTrackToPlaylist: async (playlistId, track) => {
    const d = await getDb();
    const tracks = await d.getAllAsync<PlaylistTrack>(
      "SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position DESC LIMIT 1",
      playlistId
    );
    const nextPos = tracks.length > 0 ? tracks[0].position + 1 : 0;
    await d.runAsync(
      "INSERT INTO playlist_tracks (playlist_id, track_id, title, artist, album, thumbnail, duration, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      playlistId,
      track.track_id,
      track.title,
      track.artist,
      track.album ?? null,
      track.thumbnail ?? null,
      track.duration ?? null,
      nextPos
    );
  },

  removeTrackFromPlaylist: async (playlistId, position) => {
    const d = await getDb();
    await d.runAsync(
      "DELETE FROM playlist_tracks WHERE playlist_id = ? AND position = ?",
      playlistId,
      position
    );
  },

  getPlaylistTracks: async (playlistId) => {
    const d = await getDb();
    const tracks = await d.getAllAsync<PlaylistTrack>(
      "SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC",
      playlistId
    );
    set((state) => ({
      playlistTracks: { ...state.playlistTracks, [playlistId]: tracks },
    }));
    return tracks;
  },
}));
