import { create } from "zustand";
import type { TimedLyricLine } from "@/utils/lrc";

interface LyricsStore {
  trackId: string | null;
  timedLyrics: TimedLyricLine[] | null;
  plainText: string | null;
  loading: boolean;
  error: string | null;

  setLoading: (loading: boolean) => void;
  setLyrics: (
    trackId: string,
    timedLyrics: TimedLyricLine[] | null,
    plainText: string | null
  ) => void;
  clearLyrics: () => void;
}

export const useLyricsStore = create<LyricsStore>((set) => ({
  trackId: null,
  timedLyrics: null,
  plainText: null,
  loading: false,
  error: null,

  setLoading: (loading) => set({ loading }),

  setLyrics: (trackId, timedLyrics, plainText) =>
    set({ trackId, timedLyrics, plainText, loading: false, error: null }),

  clearLyrics: () =>
    set({
      trackId: null,
      timedLyrics: null,
      plainText: null,
      loading: false,
      error: null,
    }),
}));
