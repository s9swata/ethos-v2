import { create } from "zustand";
import { recordLikedTrack } from "@/utils/taste";
import { getEthosDb } from "@/utils/db";

export interface LikedSong {
  id: string; title: string; artist: string;
  album?: string | null; thumbnail?: string | null; duration?: string | null;
  added_at: string;
}
export interface LikedArtist {
  id: string; name: string; thumbnail: string | null; added_at: string;
}

interface Playlist {
  id: number; name: string; description?: string | null;
  created_at: string; updated_at: string; track_count?: number;
}
export interface PlaylistTrack {
  id: number; playlist_id: number; track_id: string;
  title: string; artist: string; album?: string | null;
  thumbnail?: string | null; duration?: string | null;
  position: number; added_at: string;
}

interface LibraryState {
  ready: boolean;
  likedIds: Set<string>;
  likedSongs: LikedSong[];
  likedArtists: LikedArtist[];
  playlists: Playlist[];
  playlistTracks: Record<number, PlaylistTrack[]>;
}

interface LibraryActions {
  init: () => Promise<void>;
  toggleLike: (song: { id: string; title: string; artist: string; album?: string | null; thumbnail?: string | null; duration?: string | null }) => Promise<boolean>;
  isLiked: (id: string) => boolean;
  getLikedSongs: () => Promise<LikedSong[]>;
  toggleLikeArtist: (artist: { id: string; name: string; thumbnail?: string | null }) => Promise<boolean>;
  isArtistLiked: (id: string) => boolean;
  getLikedArtists: () => Promise<LikedArtist[]>;
  createPlaylist: (name: string, description?: string) => Promise<number>;
  deletePlaylist: (id: number) => Promise<void>;
  renamePlaylist: (id: number, name: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: number, track: PlaylistTrack) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: number, position: number) => Promise<void>;
  getPlaylistTracks: (playlistId: number) => Promise<PlaylistTrack[]>;
}

type LibraryStore = LibraryState & LibraryActions;

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  ready: false, likedIds: new Set(), likedSongs: [], likedArtists: [], playlists: [], playlistTracks: {},

  init: async () => {
    const d = await getEthosDb();
    const liked = await d.getAllAsync<LikedSong>("SELECT * FROM liked_songs ORDER BY added_at DESC");
    const artists = await d.getAllAsync<LikedArtist>("SELECT * FROM liked_artists ORDER BY added_at DESC");
    const playlists = await d.getAllAsync<Playlist>("SELECT p.*, (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) as track_count FROM playlists p ORDER BY p.updated_at DESC");
    set({ ready: true, likedIds: new Set(liked.map((s) => s.id)), likedSongs: liked, likedArtists: artists, playlists });
  },

  toggleLike: async (song) => {
    const d = await getEthosDb();
    const isLiked = get().likedIds.has(song.id);
    if (isLiked) {
      await d.runAsync("DELETE FROM liked_songs WHERE id = ?", song.id);
      set((s) => {
        const likedIds = new Set(s.likedIds); likedIds.delete(song.id);
        return { likedIds, likedSongs: s.likedSongs.filter((x) => x.id !== song.id) };
      });
      recordLikedTrack(song.id, false).catch(() => {});
      return false;
    }
    await d.runAsync("INSERT INTO liked_songs (id, title, artist, album, thumbnail, duration) VALUES (?, ?, ?, ?, ?, ?)", song.id, song.title, song.artist, song.album ?? null, song.thumbnail ?? null, song.duration ?? null);
    set((s) => { const likedIds = new Set(s.likedIds); likedIds.add(song.id); return { likedIds }; });
    recordLikedTrack(song.id, true).catch(() => {});
    return true;
  },

  isLiked: (id) => get().likedIds.has(id),

  toggleLikeArtist: async (artist) => {
    const d = await getEthosDb();
    const liked = get().likedArtists.some((a) => a.id === artist.id);
    if (liked) {
      await d.runAsync("DELETE FROM liked_artists WHERE id = ?", artist.id);
      set((s) => ({ likedArtists: s.likedArtists.filter((a) => a.id !== artist.id) }));
      return false;
    }
    await d.runAsync("INSERT INTO liked_artists (id, name, thumbnail) VALUES (?, ?, ?)", artist.id, artist.name, artist.thumbnail ?? null);
    set((s) => ({ likedArtists: [{ id: artist.id, name: artist.name, thumbnail: artist.thumbnail ?? null, added_at: new Date().toISOString() }, ...s.likedArtists] }));
    return true;
  },

  isArtistLiked: (id) => get().likedArtists.some((a) => a.id === id),

  getLikedArtists: async () => {
    const d = await getEthosDb();
    const artists = await d.getAllAsync<LikedArtist>("SELECT * FROM liked_artists ORDER BY added_at DESC");
    set({ likedArtists: artists }); return artists;
  },

  getLikedSongs: async () => {
    const d = await getEthosDb();
    const songs = await d.getAllAsync<LikedSong>("SELECT * FROM liked_songs ORDER BY added_at DESC");
    set({ likedSongs: songs }); return songs;
  },

  createPlaylist: async (name, description) => {
    const d = await getEthosDb();
    const result = await d.runAsync("INSERT INTO playlists (name, description) VALUES (?, ?)", name, description ?? null);
    const created = await d.getAllAsync<Playlist>("SELECT p.*, (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) as track_count FROM playlists WHERE p.id = ?", result.lastInsertRowId);
    if (created.length > 0) set((s) => ({ playlists: [...s.playlists, created[0]] }));
    return Number(result.lastInsertRowId);
  },

  deletePlaylist: async (id) => {
    await (await getEthosDb()).runAsync("DELETE FROM playlists WHERE id = ?", id);
    set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }));
  },

  renamePlaylist: async (id, name) => {
    await (await getEthosDb()).runAsync("UPDATE playlists SET name = ?, updated_at = datetime('now') WHERE id = ?", name, id);
    set((s) => ({ playlists: s.playlists.map((p) => p.id === id ? { ...p, name, updated_at: new Date().toISOString() } : p) }));
  },

  addTrackToPlaylist: async (playlistId, track) => {
    const d = await getEthosDb();
    const existing = await d.getAllAsync<PlaylistTrack>("SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position DESC LIMIT 1", playlistId);
    const nextPos = existing.length > 0 ? existing[0].position + 1 : 0;
    await d.runAsync("INSERT INTO playlist_tracks (playlist_id, track_id, title, artist, album, thumbnail, duration, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", playlistId, track.track_id, track.title, track.artist, track.album ?? null, track.thumbnail ?? null, track.duration ?? null, nextPos);
  },

  removeTrackFromPlaylist: async (playlistId, position) => {
    await (await getEthosDb()).runAsync("DELETE FROM playlist_tracks WHERE playlist_id = ? AND position = ?", playlistId, position);
  },

  getPlaylistTracks: async (playlistId) => {
    const d = await getEthosDb();
    const tracks = await d.getAllAsync<PlaylistTrack>("SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC", playlistId);
    set((s) => ({ playlistTracks: { ...s.playlistTracks, [playlistId]: tracks } }));
    return tracks;
  },
}));
