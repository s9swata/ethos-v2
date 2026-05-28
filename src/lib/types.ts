export interface SearchResult {
  name: string;
  type: "track" | "album" | "artist" | "playlist";
  imageUrl: string;
  id: string;
  artists?: string[];
  artistId?: string;
  album?: string | null;
  albumId?: string;
  duration?: string;
  year?: number;
  isExplicit?: boolean;
  score: number;
}

export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  duration: number;
  startTime?: number;
  endTime?: number;
  url: string;
  thumbnail: string;
  webpageUrl: string;
  directUrl: string;
  formats: AudioFormat[];
}

export interface AudioFormat {
  url: string;
  ext: string;
  format: string;
  bitrate: number;
}

export interface ArtistInfo {
  name: string;
  description?: string;
  subscribers?: string;
  monthlyListeners?: number;
  views?: number;
  channelId?: string;
  thumbnails: Thumbnail[];
  topSongs: SongItem[];
  albums: AlbumItem[];
  singles: AlbumItem[];
  related?: unknown[];
}

export interface AlbumInfo {
  title: string;
  type: string;
  description?: string;
  year: number;
  artists: { name: string; id: string }[];
  thumbnails: Thumbnail[];
  isExplicit: boolean;
  trackCount: number;
  duration: string;
  durationSeconds: number;
  audioPlaylistId: string;
  tracks: TrackItem[];
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export interface SongItem {
  videoId: string;
  title: string;
  artists: string[];
  album?: string | null;
  thumbnails: Thumbnail[];
  isExplicit: boolean;
}

export interface AlbumItem {
  title: string;
  browseId: string;
  audioPlaylistId?: string;
  thumbnails: Thumbnail[];
  year?: number;
  isExplicit: boolean;
}

export interface TrackItem {
  index: number;
  title: string;
  artists: string[];
  videoId: string;
  duration: string;
  isExplicit: boolean;
}

export interface ArtistSearchResult {
  id: string;
  name: string;
  subscribers: string;
  thumbnails: { url: string; width: number; height: number }[];
  thumbnail: string;
}

export interface HomeSection {
  title: string;
  items: HomeItem[];
}

export interface HomeItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  type: "track" | "album" | "artist" | "playlist" | "mood";
  browseId: string | null;
}

export type Page = "home" | "search" | "artist" | "album" | "library" | "playlist" | "player";

export interface QueueItem {
  videoId: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  thumbnail: string;
  duration: number;
}

export interface WatchPlaylistResponse {
  tracks: QueueItem[];
  playlistId: string;
}
