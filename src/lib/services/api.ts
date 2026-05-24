import type {
  SearchResult,
  TrackInfo,
  ArtistInfo,
  AlbumInfo,
  ArtistSearchResult,
  HomeSection,
} from "$lib/types";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:7860";

async function request<T>(path: string): Promise<T> {
  const url = `${API_URL}${path}`;
  console.log("[api] fetch start", url);
  const res = await fetch(url);
  console.log("[api] fetch response status=", res.status, "for", url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.log("[api] fetch error body=", body);
    throw new Error(body.error ?? body.detail ?? `Request failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  console.log("[api] fetch parsed, data keys=", Object.keys(data), "results length=", (data as any)?.results?.length);
  return data;
}

export const api = {
  search: (q: string, limit = 20) =>
    request<{ query: string; results: SearchResult[] }>(
      `/api/search-v2?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),

  getArtist: (browseId: string) =>
    request<ArtistInfo>(`/api/artist/${encodeURIComponent(browseId)}`),

  getAlbum: (browseId: string) =>
    request<AlbumInfo>(`/api/album/${encodeURIComponent(browseId)}`),

  getTrack: (trackId: string) =>
    request<TrackInfo>(`/api/tracks/${encodeURIComponent(trackId)}`),

  searchArtists: (q: string, limit = 5) =>
    request<{ results: ArtistSearchResult[] }>(
      `/api/artist/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),

  getHome: () =>
    request<{ sections: HomeSection[]; count: number }>("/api/home"),

  getPlaylist: (playlistId: string) => {
    const url = `https://music.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
    return request<{ title: string; tracks: { id: string; title: string; artist: string; duration: number; thumbnail: string }[] }>(
      `/api/playlist?url=${encodeURIComponent(url)}&limit=100`,
    );
  },
};
