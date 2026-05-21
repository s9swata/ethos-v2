import type {
  SearchResult,
  TrackInfo,
  ArtistInfo,
  AlbumInfo,
  ArtistSearchResult,
} from "$lib/types";

const STORAGE_KEY = "ethos-api-url";

let _baseUrl: string;

export function initApi(): void {
  _baseUrl = localStorage.getItem(STORAGE_KEY) ?? "http://127.0.0.1:7860";
}

export function getBaseUrl(): string {
  return _baseUrl;
}

export function setBaseUrl(url: string): void {
  _baseUrl = url.replace(/\/+$/, "");
  localStorage.setItem(STORAGE_KEY, _baseUrl);
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${_baseUrl}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (HTTP ${res.status})`);
  }
  return res.json();
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
};
