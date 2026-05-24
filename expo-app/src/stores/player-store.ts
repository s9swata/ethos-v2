import { create } from "zustand";
import type { TrackInfo, RepeatMode, QueueContext, PlayHistoryItem } from "@/types";
import { api } from "@/api/client";

const MAX_HISTORY = 10;

interface AutoQueueItem {
  title: string | null;
  videoId: string | null;
  artists: string[];
}

interface PlayerState {
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
}

interface PlayerActions {
  playTrack: (trackId: string, context?: QueueContext) => Promise<void>;
  setQueue: (tracks: TrackInfo[], startIndex: number) => void;
  playNext: () => void;
  playPrev: () => void;
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
  getNextTrack: () => TrackInfo | null;
  getTasteProfile: () => string;
}

type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  repeat: "off",
  isShuffled: false,
  queue: [],
  queueIndex: -1,
  autoQueue: [],
  autoQueueIndex: -1,
  currentArtistId: null,
  currentAlbumId: null,
  isLoading: false,
  error: null,
  playHistory: [],

  playTrack: async (trackId, context) => {
    const state = get();
    if (state.currentTrack?.id === trackId) {
      set({ isPlaying: true });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const track = await api.getTrack(trackId);
      const entry: PlayHistoryItem = { id: trackId, title: track.title, artist: track.artist, thumbnail: track.thumbnail };
      const history = [entry, ...state.playHistory.filter((h) => h.id !== trackId)].slice(0, MAX_HISTORY);
      set({
        currentTrack: track,
        isPlaying: true,
        currentTime: 0,
        queueIndex: -1,
        autoQueueIndex: -1,
        autoQueue: [],
        currentArtistId: context?.artistBrowseId ?? null,
        currentAlbumId: context?.albumBrowseId ?? null,
        isLoading: false,
        playHistory: history,
      });

      if (context?.artistBrowseId) {
        try {
          const artist = await api.getArtist(context.artistBrowseId);
          const songs = artist.topSongs
            .filter((s) => s.videoId && s.videoId !== trackId)
            .slice(0, 10);
          set({ autoQueue: songs as AutoQueueItem[] });
        } catch {}
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load track",
        isLoading: false,
      });
    }
  },

  setQueue: (tracks, startIndex) => {
    set({
      queue: tracks,
      queueIndex: startIndex,
      autoQueue: [],
      autoQueueIndex: -1,
    });
    const track = tracks[startIndex];
    if (track) {
      set({ currentTrack: track, isPlaying: true, currentTime: 0 });
    }
  },

  playNext: () => {
    const state = get();
    if (state.queue.length > 0 && state.queueIndex < state.queue.length - 1) {
      const nextIndex = state.queueIndex + 1;
      set({ queueIndex: nextIndex });
      const track = state.queue[nextIndex];
      if (track) {
        set({ currentTrack: track, isPlaying: true, currentTime: 0 });
      }
    } else if (state.autoQueue.length > 0) {
      const nextIndex = state.autoQueueIndex + 1;
      if (nextIndex < state.autoQueue.length) {
        const item = state.autoQueue[nextIndex];
        set({ autoQueueIndex: nextIndex });
        if (item.videoId) {
          get().playTrack(item.videoId, {
            artistBrowseId: state.currentArtistId ?? undefined,
          });
        }
      } else if (state.repeat === "all" && state.queue.length > 0) {
        set({ queueIndex: 0 });
        const track = state.queue[0];
        if (track) {
          set({ currentTrack: track, isPlaying: true, currentTime: 0 });
        }
      } else {
        set({ isPlaying: false });
      }
    } else if (state.repeat === "all" && state.queue.length > 0) {
      set({ queueIndex: 0 });
      const track = state.queue[0];
      if (track) {
        set({ currentTrack: track, isPlaying: true, currentTime: 0 });
      }
    } else {
      set({ isPlaying: false });
    }
  },

  playPrev: () => {
    const state = get();
    if (state.queueIndex > 0) {
      const prevIndex = state.queueIndex - 1;
      set({ queueIndex: prevIndex });
      const track = state.queue[prevIndex];
      if (track) {
        set({ currentTrack: track, isPlaying: true, currentTime: 0 });
      }
    } else if (state.autoQueueIndex > 0) {
      const prevIndex = state.autoQueueIndex - 1;
      set({ autoQueueIndex: prevIndex });
    }
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  setPlaying: (playing) => set({ isPlaying: playing }),

  setCurrentTime: (time) => set({ currentTime: time }),

  setDuration: (duration) => set({ duration }),

  setVolume: (volume) => set({ volume }),

  setRepeat: (repeat) => set({ repeat }),

  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),

  addToQueue: async (trackId) => {
    const state = get();
    try {
      const track = await api.getTrack(trackId);
      set((s) => ({ queue: [...s.queue, track] }));
      if (!state.currentTrack) {
        set({ currentTrack: track, isPlaying: true, currentTime: 0, queueIndex: state.queue.length });
      }
    } catch {}
  },

  removeFromQueue: (index) => {
    const state = get();
    if (index < 0 || index >= state.queue.length) return;
    set((s) => ({ queue: s.queue.filter((_, i) => i !== index) }));
    if (state.queueIndex > index) {
      set((s) => ({ queueIndex: s.queueIndex - 1 }));
    } else if (state.queueIndex === index) {
      if (index < state.queue.length - 1) {
        set({ queueIndex: index });
      } else {
        set({ queueIndex: state.queue.length - 2 });
      }
    }
  },

  clearQueue: () => {
    set({ queue: [], queueIndex: -1 });
  },

  getNextTrack: () => {
    const state = get();
    if (state.queue.length > 0 && state.queueIndex < state.queue.length - 1) {
      return state.queue[state.queueIndex + 1];
    }
    return null;
  },

  getTasteProfile: () => {
    const state = get();
    if (state.playHistory.length === 0) return "";
    const profile = { recentTracks: state.playHistory.map((h) => h.id) };
    const safe = btoa(JSON.stringify(profile)).replace(/\+/g, "-").replace(/\//g, "_");
    return safe;
  },
}));
