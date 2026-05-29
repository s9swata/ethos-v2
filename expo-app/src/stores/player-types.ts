import type { TrackInfo, RepeatMode, QueueContext, QueueItem } from "@/types";

export interface PlayerState {
  currentTrack: TrackInfo | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeat: RepeatMode;
  isShuffled: boolean;
  userQueue: QueueItem[];
  contextQueue: QueueItem[];
  watchPlaylistId: string | null;
  context: { type: "album" | "artist" | "playlist" | "radio" | "single"; id?: string };
  history: QueueItem[];
  currentArtistId: string | null;
  currentAlbumId: string | null;
  isLoading: boolean;
  error: string | null;
  pendingSeekTo: number | null;
}

export interface PlayerActions {
  playTrack: (trackId: string, context?: QueueContext) => Promise<void>;
  setQueue: (tracks: QueueItem[], startIndex: number, ctx?: { type: "album" | "artist" | "playlist" | "radio" | "single"; id?: string }) => void;
  playNext: () => Promise<void>;
  playPrev: () => Promise<void>;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setRepeat: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  addToQueue: (item: QueueItem) => void;
  playNextInline: (item: QueueItem) => void;
  removeFromQueue: (videoId: string) => void;
  clearQueue: () => void;
  restoreQueue: () => Promise<boolean>;
  getNextTrack: () => TrackInfo | null;
  getTasteProfile: () => string;
}

export type PlayerStore = PlayerState & PlayerActions;
export type SetFn = (partial: PlayerStore | Partial<PlayerStore> | ((state: PlayerStore) => PlayerStore | Partial<PlayerStore>)) => void;
export type GetFn = () => PlayerStore;
