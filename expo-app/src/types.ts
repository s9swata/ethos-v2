export type SearchResultType = "track" | "album" | "artist" | "playlist";

export interface SearchResult {
  name: string;
  type: SearchResultType;
  imageUrl: string;
  id: string;
  artists?: string[];
  artistId?: string;
  album?: string | null;
  albumId?: string | null;
  duration?: string;
  year?: number;
  isExplicit?: boolean;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  duration: number;
  url: string;
  thumbnail: string;
  webpageUrl: string;
  directUrl: string;
  formats: AudioFormat[];
}

export interface AudioFormat {
  url: string | null;
  ext: string;
  format: string;
  bitrate: number | null;
}

export interface ArtistInfo {
  name: string;
  description?: string | null;
  subscribers?: string | null;
  monthlyListeners?: string | null;
  views?: string | null;
  channelId?: string | null;
  thumbnails: Thumbnail[];
  topSongs: SongItem[];
  albums: AlbumItem[];
  albumsParams?: string | null;
  singles: AlbumItem[];
  singlesParams?: string | null;
  related?: { browseId: string; artist: string }[];
}

export interface AlbumInfo {
  title: string;
  type?: string | null;
  description?: string | null;
  year?: number | null;
  artists: { name: string; id: string | null }[];
  thumbnails: Thumbnail[];
  isExplicit: boolean;
  trackCount?: number | null;
  duration?: string | null;
  durationSeconds?: number | null;
  audioPlaylistId?: string | null;
  tracks: TrackItem[];
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export interface SongItem {
  videoId: string | null;
  title: string | null;
  artists: string[];
  album?: string | null;
  thumbnails: Thumbnail[];
  isExplicit: boolean;
}

export interface AlbumItem {
  title: string | null;
  browseId: string | null;
  audioPlaylistId?: string | null;
  thumbnails: Thumbnail[];
  year?: number | null;
  isExplicit: boolean;
}

export interface TrackItem {
  index?: number | null;
  title: string | null;
  artists: string[];
  videoId: string | null;
  duration?: string | null;
  isExplicit: boolean;
}

export interface PlaylistInfo {
  title: string;
  thumbnail: string;
  tracks: {
    id: string | null;
    title: string;
    artist: string;
    duration: number;
    url: string | null;
    thumbnail: string;
    webpageUrl: string;
  }[];
  count: number;
}

export interface PlayHistoryItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

export type RepeatMode = "off" | "all" | "one";

export interface QueueContext {
  artistBrowseId?: string;
  albumBrowseId?: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
}

export interface HomeItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  type: string;
  browseId: string | null;
}

export interface HomeSection {
  title: string;
  items: HomeItem[];
}

export interface HomeResponse {
  sections: HomeSection[];
  count: number;
}

export interface LyricsResponse {
  lyrics: string | { text: string; startTime: number; endTime: number }[];
  source: string;
  hasTimestamps: boolean;
}

export interface ChartsResponse {
  countries: {
    selected?: { text: string };
    options?: string[];
  };
  videos: { title: string; playlistId: string; thumbnails: Thumbnail[] }[];
  artists: { title: string; browseId: string; subscribers: string; thumbnails: Thumbnail[]; rank: string; trend: string }[];
  genres: { title: string; playlistId: string; thumbnails: Thumbnail[] }[];
}
