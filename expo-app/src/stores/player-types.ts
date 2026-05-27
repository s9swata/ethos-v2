import type { TrackInfo, RepeatMode, PlayHistoryItem, QueueContext } from "@/types";

export interface AutoQueueItem {
  title: string | null;
  videoId: string | null;
  artists: string[];
  thumbnail?: string | null;
  isTopSong?: boolean;
  albumBrowseId?: string | null;
  albumIndex?: number | null;
  duration?: string | null;
}

export interface PlayerState {
  currentTrack: TrackInfo | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeat: RepeatMode;
  isShuffled: boolean;
  queue: TrackInfo[];
  queueIndex: number;
  autoQueue: AutoQueueItem[];
  autoQueueIndex: number;
  currentArtistId: string | null;
  currentAlbumId: string | null;
  isLoading: boolean;
  error: string | null;
  playHistory: PlayHistoryItem[];
  pendingSeekTo: number | null;
  artistTrackPool: AutoQueueItem[];
  pendingAlbumBrowseIds: string[];
  playedVideoIds: string[];
  relatedArtists: { browseId: string; artist: string }[];
  relatedArtistIndex: number;
  usedArtistIds: string[];
  currentAutoQueueSource: string | null;
  recentAlbumIds: string[];
}

export interface PlayerActions {
  playTrack: (trackId: string, context?: QueueContext) => Promise<void>;
  setQueue: (tracks: TrackInfo[], startIndex: number) => void;
  playNext: () => Promise<void>;
  playPrev: () => Promise<void>;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setRepeat: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  addToQueue: (trackId: string) => Promise<void>;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  restoreQueue: () => Promise<boolean>;
  getNextTrack: () => TrackInfo | null;
  getTasteProfile: () => string;
}

export type PlayerStore = PlayerState & PlayerActions;
export type SetFn = (partial: PlayerStore | Partial<PlayerStore> | ((state: PlayerStore) => PlayerStore | Partial<PlayerStore>)) => void;
export type GetFn = () => PlayerStore;
