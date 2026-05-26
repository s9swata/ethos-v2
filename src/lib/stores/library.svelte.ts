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

let rpc: any = null;

function getRpc() {
  if (!rpc) {
    try {
      const { ev } = window as any;
      rpc = ev?.rpc;
    } catch {}
  }
  return rpc;
}

async function dbRequest<T>(method: string, params?: any): Promise<T> {
  const rpc = getRpc();
  if (!rpc) return [] as any;
  return rpc.request.db[method](params ?? {});
}

export async function initDb(): Promise<void> {
  if (ready) return;
  try {
    await refreshLikedIds();
    await refreshPlaylists();
    ready = true;
  } catch (e) {
    console.error("DB init failed", e);
  }
}

async function refreshLikedIds(): Promise<void> {
  try {
    const songs = await dbRequest<{ id: string }[]>("getLikedSongs");
    likedIds = new Set(songs.map((r) => r.id));
  } catch {}
}

async function refreshPlaylists(): Promise<void> {
  try {
    playlists = await dbRequest<Playlist[]>("getPlaylists");
  } catch {}
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
    await dbRequest("toggleLike", {
      id,
      track: { id, title, artist, album, thumbnail, duration, addedAt: new Date().toISOString() },
    });
  } catch {
    likedIds.delete(id);
  }
}

export async function unlikeSong(id: string): Promise<void> {
  likedIds.delete(id);
  try {
    await dbRequest("toggleLike", {
      id,
      track: { id, title: "", artist: "", album: null, thumbnail: "", duration: "", addedAt: "" },
    });
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
  try {
    return await dbRequest<LikedSong[]>("getLikedSongs");
  } catch {
    return [];
  }
}

export async function createPlaylist(name: string, description = ""): Promise<string> {
  try {
    const playlist = await dbRequest<Playlist>("createPlaylist", { name, description });
    await refreshPlaylists();
    return String(playlist.id);
  } catch {
    throw new Error("Failed to create playlist");
  }
}

export async function deletePlaylist(id: string): Promise<void> {
  try {
    await dbRequest("deletePlaylist", { id: Number(id) });
    await refreshPlaylists();
  } catch {}
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
  try {
    await dbRequest("renamePlaylist", { id: Number(id), name });
    await refreshPlaylists();
  } catch {}
}

export async function addTrackToPlaylist(
  playlistId: string,
  track: { id: string; title: string; artist: string; album: string | null; thumbnail: string; duration: string },
): Promise<void> {
  try {
    await dbRequest("addTrack", {
      playlistId: Number(playlistId),
      track: { ...track, addedAt: new Date().toISOString() },
    });
    await refreshPlaylists();
  } catch {}
}

export async function removeTrackFromPlaylist(playlistId: string, position: number): Promise<void> {
  try {
    await dbRequest("removeTrack", { playlistId: Number(playlistId), trackId: String(position) });
    await refreshPlaylists();
  } catch {}
}

export async function getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
  try {
    return await dbRequest<PlaylistTrack[]>("getPlaylistTracks", { id: Number(playlistId) });
  } catch {
    return [];
  }
}

export async function reorderPlaylistTrack(
  playlistId: string,
  fromPos: number,
  toPos: number,
): Promise<void> {
  try {
    await dbRequest("reorderTrack", {
      playlistId: Number(playlistId),
      trackId: String(fromPos),
      newIndex: toPos,
    });
  } catch {}
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
