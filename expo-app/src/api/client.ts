import type {
  SearchResponse,
  ArtistInfo,
  AlbumInfo,
  TrackInfo,
  PlaylistInfo,
  HomeResponse,
  LyricsResponse,
  ChartsResponse,
} from "@/types";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const getBaseUrl = () => {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem("api-url");
    if (saved) return saved;
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  throw new Error(
    "API URL not configured. Set EXPO_PUBLIC_API_URL in .env.local or save a URL via the settings UI."
  );
};

export const setBaseUrl = (url: string) => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("api-url", url);
  }
};

async function request<T>(path: string): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.error || `Request failed with status ${response.status}`,
      response.status
    );
  }
  return response.json();
}

function upscaleThumbnail(url: string, size = 320): string {
  if (!url) return "";
  if (url.includes("=w") && url.includes("-h")) {
    return url.replace(/=w\d+-h\d+/, `=w${size}-h${size}`);
  }
  if (url.includes("=s")) {
    return url.replace(/=s\d+/, `=s${size}`);
  }
  return url;
}

export const api = {
  search: (q: string, limit = 20) =>
    request<SearchResponse>(`/api/search-v2?q=${encodeURIComponent(q)}&limit=${limit}`),

  getArtist: (browseId: string) =>
    request<ArtistInfo>(`/api/artist/${encodeURIComponent(browseId)}`),

  getAlbum: (browseId: string) =>
    request<AlbumInfo>(`/api/album/${encodeURIComponent(browseId)}`),

  getTrack: (trackId: string) =>
    request<TrackInfo>(`/api/tracks/${encodeURIComponent(trackId)}`),

  searchArtists: (q: string, limit = 5) =>
    request<{ results: any[] }>(`/api/artist/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  searchAlbums: (q: string, limit = 5) =>
    request<{ results: any[] }>(`/api/album/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  getPlaylist: (url: string) =>
    request<PlaylistInfo>(`/api/playlist?url=${encodeURIComponent(url)}`),

  getHomeFeed: (profile?: string) =>
    request<HomeResponse>(`/api/home${profile ? `?profile=${encodeURIComponent(profile)}` : ""}`),

  getLyrics: (trackId: string) =>
    request<LyricsResponse>(`/api/tracks/${encodeURIComponent(trackId)}/lyrics`),

  getTrackRelated: (trackId: string) =>
    request<{ results: any[]; count: number }>(`/api/tracks/${encodeURIComponent(trackId)}/related`),

  getCharts: (country?: string) =>
    request<ChartsResponse>(`/api/charts${country ? `?country=${country}` : ""}`),

  getArtistAlbums: (browseId: string, params: string, limit?: number, order?: string) =>
    request<{ results: any[]; count: number }>(`/api/artist/${encodeURIComponent(browseId)}/albums?params=${encodeURIComponent(params)}${limit ? `&limit=${limit}` : ""}${order ? `&order=${encodeURIComponent(order)}` : ""}`),
};

export { getBaseUrl, upscaleThumbnail, ApiError };
