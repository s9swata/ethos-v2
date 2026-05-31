import { create } from "zustand";
import type { PlayerStore } from "./player-types";
import { playTrackAction } from "./player-actions-playback";
import { playNextAction } from "./player-actions-next";
import { setQueueAction, playPrevAction, addToQueueAction, playNextInlineAction, removeFromQueueAction, restoreQueueAction, getNextTrackValue, getTasteProfileValue } from "./player-actions-queue";
import { clearQueue as clearPersistedQueue } from "@/utils/queue-store";

const initialPlayerState = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  repeat: "off" as const,
  isShuffled: false,
  userQueue: [],
  contextQueue: [],
  watchPlaylistId: null,
  context: { type: "radio" as const, id: undefined },
  history: [],
  currentArtistId: null,
  currentAlbumId: null,
  isLoading: false,
  error: null,
  pendingSeekTo: null,
  likedTrackIds: new Set<string>(),
} satisfies Omit<PlayerStore, "playTrack" | "setQueue" | "playNext" | "playPrev" | "togglePlay" | "setPlaying" | "setCurrentTime" | "setDuration" | "setVolume" | "setRepeat" | "toggleShuffle" | "addToQueue" | "playNextInline" | "removeFromQueue" | "clearQueue" | "restoreQueue" | "getNextTrack" | "getTasteProfile" | "dismissError" | "toggleLike">;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  ...initialPlayerState,
  playTrack: (trackId, context) => playTrackAction(set, get, trackId, context),
  setQueue: (tracks, startIndex, ctx) => setQueueAction(set, get, tracks, startIndex, ctx),
  playNext: () => playNextAction(set, get),
  playPrev: () => playPrevAction(set, get),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setRepeat: (repeat) => set({ repeat }),
  toggleShuffle: () => set((s) => ({ isShuffled: !s.isShuffled })),
  addToQueue: (item) => addToQueueAction(set, get, item),
  playNextInline: (item) => playNextInlineAction(set, get, item),
  removeFromQueue: (videoId) => removeFromQueueAction(set, get, videoId),
  clearQueue: () => {
    set({ userQueue: [], contextQueue: [], watchPlaylistId: null, history: [], context: { type: "radio" } });
    clearPersistedQueue().catch(() => {});
  },
  restoreQueue: () => restoreQueueAction(set),
  getNextTrack: () => getNextTrackValue(get),
  getTasteProfile: () => getTasteProfileValue(get),
  dismissError: () => set({ error: null }),
  toggleLike: () => {
    const track = get().currentTrack;
    if (!track) return;
    const id = track.id;
    set((s) => {
      const next = new Set(s.likedTrackIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { likedTrackIds: next };
    });
  },
}));
