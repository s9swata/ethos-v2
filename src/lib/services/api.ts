import type {
  SearchResult,
  TrackInfo,
  ArtistInfo,
  AlbumInfo,
  ArtistSearchResult,
  HomeSection,
  HomeItem,
  SongItem,
  AlbumItem,
  TrackItem,
  Thumbnail,
} from "$lib/types";

function serverUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem("ethos_server_url") : null;
  return stored || envUrl || "http://localhost:3000";
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function thumb(url: string | undefined): Thumbnail[] {
  return url ? [{ url, width: 0, height: 0 }] : [];
}

function thumbUrl(url: string | undefined): string {
  return url ?? "";
}

export function getBaseUrl(): string {
  return serverUrl();
}

export function setBaseUrl(url: string): void {
  localStorage.setItem("ethos_server_url", url);
}

export const api = {
  search: async (q: string, limit = 20) => {
    const base = serverUrl();
    const res = await fetch(`${base}/api/search-v2?q=${encodeURIComponent(q)}&limit=${limit}`);
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    return {
      query: data.query,
      results: (data.results || []).map((r: any): SearchResult => ({
        name: r.name,
        type: r.type,
        imageUrl: r.imageUrl,
        id: r.id,
        artists: r.artists,
        artistId: r.artistId,
        album: r.album,
        albumId: r.albumId,
        duration: r.duration,
        year: r.year,
        isExplicit: r.isExplicit,
        score: r.score ?? 1,
      })),
    };
  },

  getArtist: async (browseId: string) => {
    const res = await fetch(`${serverUrl()}/api/artist/${browseId}`);
    if (!res.ok) throw new Error("Artist fetch failed");
    const data = await res.json();
    return {
      name: data.name,
      description: data.description,
      subscribers: data.subscribers,
      monthlyListeners: data.monthlyListeners,
      views: data.views,
      channelId: data.channelId,
      thumbnails: thumb(data.thumbnail),
      topSongs: (data.topSongs || []).map((s: any): SongItem => ({
        videoId: s.videoId,
        title: s.title,
        artists: s.artists || [],
        album: s.album,
        thumbnails: thumb(s.thumbnail),
        isExplicit: s.isExplicit ?? false,
      })),
      albums: (data.albums || []).map((a: any): AlbumItem => ({
        title: a.title,
        browseId: a.browseId,
        audioPlaylistId: a.audioPlaylistId,
        thumbnails: thumb(a.thumbnail),
        year: a.year,
        isExplicit: a.isExplicit ?? false,
      })),
      singles: (data.singles || []).map((s: any): AlbumItem => ({
        title: s.title,
        browseId: s.browseId,
        audioPlaylistId: s.audioPlaylistId,
        thumbnails: thumb(s.thumbnail),
        year: s.year,
        isExplicit: s.isExplicit ?? false,
      })),
      related: data.related,
      albumsParams: data.albumsParams,
      albumsBrowseId: data.albumsBrowseId,
      singlesParams: data.singlesParams,
      singlesBrowseId: data.singlesBrowseId,
    } as ArtistInfo;
  },

  getAlbum: async (browseId: string) => {
    const res = await fetch(`${serverUrl()}/api/album/${browseId}`);
    if (!res.ok) throw new Error("Album fetch failed");
    const data = await res.json();
    return {
      title: data.title,
      type: data.type,
      description: data.description,
      year: data.year ?? 0,
      artists: (data.artists || []).map((a: any) => ({ name: a.name, id: a.id })),
      thumbnails: thumb(data.thumbnail),
      isExplicit: data.isExplicit ?? false,
      trackCount: data.trackCount ?? data.tracks?.length ?? 0,
      duration: data.duration,
      durationSeconds: data.durationSeconds,
      audioPlaylistId: data.audioPlaylistId,
      tracks: (data.tracks || []).map((t: any, i: number): TrackItem => ({
        index: i + 1,
        title: t.title,
        artists: t.artists || [],
        videoId: t.videoId,
        duration: t.duration,
        isExplicit: t.isExplicit ?? false,
      })),
    } as AlbumInfo;
  },

  getTrack: async (trackId: string) => {
    const base = serverUrl();
    const res = await fetch(`${base}/api/tracks/${trackId}`);
    if (!res.ok) throw new Error("Track fetch failed");
    const data = await res.json();
    const streamUrl = data.directUrl || data.url;
    return {
      id: trackId,
      title: data.title,
      artist: data.artist,
      duration: data.duration,
      url: streamUrl,
      thumbnail: thumbUrl(data.thumbnail),
      webpageUrl: data.webpageUrl,
      directUrl: streamUrl,
      formats: [
        {
          url: streamUrl,
          ext: "m4a",
          format: "audio",
          bitrate: 0,
        },
      ],
    } as TrackInfo;
  },

  searchArtists: async (q: string, limit = 5) => {
    const res = await fetch(`${serverUrl()}/api/search-v2?q=${encodeURIComponent(q)}&limit=${limit * 3}`);
    if (!res.ok) return { results: [] };
    const data = await res.json();
    const results: ArtistSearchResult[] = (data.results || [])
      .filter((r: any) => r.type === "artist")
      .slice(0, limit)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        subscribers: "",
        thumbnails: thumb(r.imageUrl),
        thumbnail: r.imageUrl,
      }));
    return { results };
  },

  getHome: async () => {
    const res = await fetch(`${serverUrl()}/api/home`);
    if (!res.ok) throw new Error("Home fetch failed");
    const data = await res.json();
    return {
      sections: (data.sections || []).map((s: any): HomeSection => ({
        title: s.title,
        items: (s.items || []).map((i: any): HomeItem => ({
          id: i.id,
          title: i.title,
          subtitle: i.subtitle,
          imageUrl: i.imageUrl,
          type: i.type,
          browseId: i.browseId,
        })),
      })),
      count: data.count ?? data.sections?.length ?? 0,
    };
  },

  getPlaylist: async (playlistId: string) => {
    const url = `https://music.youtube.com/playlist?list=${playlistId}`;
    const res = await fetch(`${serverUrl()}/api/playlist?url=${encodeURIComponent(url)}&limit=100`);
    if (!res.ok) throw new Error("Playlist fetch failed");
    const data = await res.json();
    return {
      title: data.title,
      tracks: (data.tracks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        duration: t.duration,
        thumbnail: thumbUrl(t.thumbnail),
      })),
    };
  },
};