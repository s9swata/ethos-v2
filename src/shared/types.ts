// Data types shared between Bun and browser.
// No imports from electrobun — purely structural types so both sides can use them.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type RPCSchema<T> = T;

export interface TrackResult {
  id: string;
  title: string;
  artists: { name: string; id?: string }[];
  album?: { name: string; id?: string };
  duration: number;
  thumbnail?: string;
  explicit?: boolean;
}

export interface AlbumResult {
  browseId: string;
  title: string;
  artists: { name: string; id?: string }[];
  year?: number;
  thumbnail?: string;
  trackCount?: number;
}

export interface ArtistResult {
  browseId: string;
  name: string;
  thumbnail?: string;
  subscriberCount?: string;
}

export interface PlaylistResult {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  trackCount?: number;
}

export interface ArtistInfo {
  browseId: string;
  name: string;
  description?: string;
  thumbnail?: string;
  subscriberCount?: string;
  topSongs: TrackResult[];
  albums: AlbumResult[];
  singles: AlbumResult[];
}

export interface AlbumInfo {
  browseId: string;
  title: string;
  artists: { name: string; id?: string }[];
  year?: number;
  thumbnail?: string;
  trackCount?: number;
  tracks: TrackResult[];
}

export interface PlaylistInfo {
  title: string;
  description?: string;
  thumbnail?: string;
  tracks: TrackResult[];
}

export interface StreamInfo {
  url: string;
  mimeType?: string;
  duration?: number;
}

export interface ChartItem {
  title: string;
  browseId?: string;
  thumbnail?: string;
  artists?: { name: string; id?: string }[];
  videoId?: string;
  type: "song" | "artist" | "video";
}

export interface ChartSection {
  title: string;
  items: ChartItem[];
}

export interface SearchResult {
  type: "track" | "album" | "artist" | "playlist";
  track?: TrackResult;
  album?: AlbumResult;
  artist?: ArtistResult;
  playlist?: PlaylistResult;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export interface HomeSection {
  title: string;
  items: ChartItem[];
}

export interface HomeResponse {
  sections: HomeSection[];
}

export interface TrackItem {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration: number;
  thumbnail?: string;
  addedAt: string;
}

export interface Playlist {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  trackCount: number;
}

export type DesktopRPC = {
  bun: RPCSchema<{
    requests: {
      db: {
        isLiked: { params: { id: string }; response: boolean };
        toggleLike: { params: { id: string; track: TrackItem }; response: boolean };
        getLikedSongs: { params: {}; response: TrackItem[] };
        getPlaylists: { params: {}; response: Playlist[] };
        createPlaylist: { params: { name: string; description?: string }; response: Playlist };
        deletePlaylist: { params: { id: number }; response: void };
        renamePlaylist: { params: { id: number; name: string }; response: void };
        addTrack: { params: { playlistId: number; track: TrackItem }; response: void };
        removeTrack: { params: { playlistId: number; trackId: string }; response: void };
        getPlaylistTracks: { params: { id: number }; response: TrackItem[] };
        reorderTrack: { params: { playlistId: number; trackId: string; newIndex: number }; response: void };
      };
    };
    messages: {};
  }>;
};
