import Constants from "expo-constants";
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

export interface LRCLIBResponse {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  duration: number;
}

async function requestLRCLIB(artist: string, title: string, duration: number): Promise<LRCLIBResponse | null> {
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
    duration: String(Math.round(duration)),
  });
  try {
    const res = await fetch(`https://lrclib.net/api/get?${params}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── TTML Aligner ────────────────────────────────────────────────────────────

const TTML_RETRIES = 3;

function getTTMLBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_TTML_URL;
  if (!url) throw new Error("TTML URL not configured. Set EXPO_PUBLIC_TTML_URL in .env.local");
  return url;
}

function getDeviceId(): string {
  return Constants.installationId || Constants.sessionId || "unknown";
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getFreshStreamUrl(trackId: string): Promise<string> {
  const track = await api.getTrack(trackId);
  if (!track.url) throw new Error("No stream URL available");
  return track.url;
}

async function fetchTTML(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TTML fetch failed: ${res.status}`);
  return res.text();
}

async function pollStatus(baseUrl: string, jobId: string): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    const res = await fetch(`${baseUrl}/status/${jobId}`);
    if (!res.ok) throw new Error(`Status poll failed: ${res.status}`);
    const data = await res.json();
    if (data.status === "done") return fetchTTML(`${baseUrl}/${data.ttmlUrl}`);
    if (data.status === "error") throw new Error(data.error || "Alignment failed");
    await delay(2000);
  }
  throw new Error("Alignment timed out");
}

export async function downloadAudioSegment(
  url: string,
  maxBytes = 1_048_576,
): Promise<Blob> {
  console.log(`[ttml] Downloading audio segment (${maxBytes} bytes max)...`);
  const res = await fetch(url, {
    headers: { Range: `bytes=0-${maxBytes - 1}` },
  });
  if (!res.ok) {
    console.warn(`[ttml] Audio download FAILED: HTTP ${res.status}`);
    throw new Error(`Audio download failed: ${res.status}`);
  }
  const blob = await res.blob();
  console.log(`[ttml] Audio download OK: ${(blob.size / 1024).toFixed(1)} KB`);
  return blob;
}

export async function alignTrack(
  trackId: string,
  lyrics: string,
  audioBlob: Blob,
  language = "en",
): Promise<string> {
  const baseUrl = getTTMLBaseUrl();
  const deviceId = getDeviceId();

  const form = new FormData();
  form.append("trackId", trackId);
  form.append("lyrics", lyrics);
  form.append("audio", audioBlob, "audio.mp4");
  form.append("language", language);

  console.log(`[ttml] POST /align for ${trackId} (audio: ${(audioBlob.size / 1024).toFixed(1)} KB)`);

  for (let attempt = 0; attempt < TTML_RETRIES; attempt++) {
    const res = await fetch(`${baseUrl}/align`, {
      method: "POST",
      headers: { "X-Device-ID": deviceId },
      body: form,
    });

    if (res.status === 200) {
      const data = await res.json();
      console.log(`[ttml] Align response 200:`, JSON.stringify(data));
      return fetchTTML(`${baseUrl}/${data.ttmlUrl}`);
    }

    if (res.status === 202) {
      console.log(`[ttml] Align response 202 (queued), polling...`);
      const data = await res.json();
      return pollStatus(baseUrl, data.jobId);
    }

    if (res.status === 429) {
      console.warn(`[ttml] Rate limited (attempt ${attempt + 1}), retrying...`);
      if (attempt < TTML_RETRIES - 1) {
        await delay(1000 * Math.pow(2, attempt));
        continue;
      }
      throw new Error("Rate limit exceeded");
    }

    if (res.status === 400) {
      const data = await res.json().catch(() => ({}));
      console.warn(`[ttml] Align rejected 400:`, data);
      throw new Error(data.error || "Invalid alignment request");
    }

    console.warn(`[ttml] Unexpected status ${res.status}`);
    throw new Error(`Unexpected alignment response: ${res.status}`);
  }

  throw new Error("Failed to align track");
}

export { getBaseUrl, upscaleThumbnail, ApiError, requestLRCLIB };
