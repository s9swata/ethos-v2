import { create } from "zustand";
import type { TrackInfo, RepeatMode, QueueContext, PlayHistoryItem } from "@/types";
import { api } from "@/api/client";
import { prefetchLyrics } from "@/utils/lyrics-cache";
import { prefetchStream } from "expo-youtube-audio-stream";

const MAX_HISTORY = 10;

function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trackToHistoryEntry(track: TrackInfo): PlayHistoryItem {
  return { id: track.id, title: track.title, artist: track.artist, thumbnail: track.thumbnail };
}

function addToPlayHistory(history: PlayHistoryItem[], entry: PlayHistoryItem): PlayHistoryItem[] {
  return [entry, ...history.filter((h) => h.id !== entry.id)].slice(0, MAX_HISTORY);
}

function scorePoolItem(item: AutoQueueItem, recentAlbums: string[]): number {
  let score = 0;
  if (item.isTopSong) score += 100;
  else score += 40;
  if (item.albumBrowseId) {
    if (!recentAlbums.includes(item.albumBrowseId)) score += 30;
    else score -= 20;
  }
  if (item.albumIndex != null) {
    score += Math.max(0, 20 - item.albumIndex * 2);
  }
  return score;
}

function scoreRefillBatch(pool: AutoQueueItem[], playedIds: string[], recentAlbums: string[]): AutoQueueItem[] | null {
  const unplayed = pool.filter((item) => item.videoId && !playedIds.includes(item.videoId));
  if (unplayed.length === 0) return null;
  unplayed.sort((a, b) => scorePoolItem(b, recentAlbums) - scorePoolItem(a, recentAlbums));
  return unplayed.slice(0, 10);
}

interface AutoQueueItem {
  title: string | null;
  videoId: string | null;
  artists: string[];
  thumbnail?: string | null;
  isTopSong?: boolean;
  albumBrowseId?: string | null;
  albumIndex?: number | null;
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

interface PlayerActions {
  playTrack: (trackId: string, context?: QueueContext) => Promise<void>;
  setQueue: (tracks: TrackInfo[], startIndex: number) => void;
  playNext: () => Promise<void>;
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

async function fetchArtistAutoQueue(artistId: string, excludeId?: string | null): Promise<AutoQueueItem[] | null> {
  try {
    const artist = await api.getArtist(artistId);
    return shuffle(artist.topSongs)
      .filter((s) => s.videoId && s.videoId !== excludeId)
      .slice(0, 10)
      .map((s) => ({
        title: s.title,
        videoId: s.videoId,
        artists: s.artists,
        thumbnail: s.thumbnails?.[0]?.url,
      }));
  } catch {
    return null;
  }
}

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
  pendingSeekTo: null,
  artistTrackPool: [],
  pendingAlbumBrowseIds: [],
  playedVideoIds: [],
  relatedArtists: [],
  relatedArtistIndex: -1,
  usedArtistIds: [],
  currentAutoQueueSource: null,
  recentAlbumIds: [],

  playTrack: async (trackId, context) => {
    const state = get();
    if (state.currentTrack?.id === trackId) {
      set({ isPlaying: true });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const track = await api.getTrack(trackId);
      const trackWithOverride = {
        ...track,
        title: context?.title ?? track.title,
        artist: context?.artist ?? track.artist,
        thumbnail: context?.thumbnail ?? track.thumbnail,
      };
      const historyEntry = trackToHistoryEntry(trackWithOverride);
      const history = addToPlayHistory(state.playHistory, historyEntry);
      const existingQueueIndex = state.queue.findIndex((t) => t.id === trackId);
      const existingAutoQueueIndex = state.autoQueue.findIndex((item) => item.videoId === trackId);
      const isFromQueue = existingQueueIndex >= 0;
      const isFromAutoQueue = !isFromQueue && existingAutoQueueIndex >= 0;
      const preserveAutoQueue = isFromQueue || isFromAutoQueue;
      set({
        currentTrack: trackWithOverride,
        isPlaying: true,
        currentTime: 0,
        queueIndex: isFromQueue ? existingQueueIndex : -1,
        autoQueueIndex: isFromAutoQueue ? existingAutoQueueIndex : (isFromQueue ? state.autoQueueIndex : -1),
        autoQueue: preserveAutoQueue ? state.autoQueue : [],
        currentArtistId: preserveAutoQueue ? state.currentArtistId : (context?.artistBrowseId ?? null),
        currentAlbumId: preserveAutoQueue ? state.currentAlbumId : (context?.albumBrowseId ?? null),
        isLoading: false,
        playHistory: history,
        playedVideoIds: [...state.playedVideoIds, trackId],
      });

      if (context?.artistBrowseId) {
        try {
          const artist = await api.getArtist(context.artistBrowseId);
          const allAlbumIds = [
            ...artist.albums.map((a) => a.browseId).filter((s): s is string => Boolean(s)),
            ...artist.singles.map((s) => s.browseId).filter((s): s is string => Boolean(s)),
          ];
          const topItems = shuffle(artist.topSongs)
            .filter((s) => s.videoId && s.videoId !== trackId)
            .slice(0, 10)
            .map((s) => ({
              title: s.title,
              videoId: s.videoId,
              artists: s.artists,
              thumbnail: s.thumbnails?.[0]?.url,
              isTopSong: true,
            }));
          let items = topItems;
          let consumedAlbumId: string | null = null;
          if (items.length < 10 && allAlbumIds.length > 0) {
            try {
              const album = await api.getAlbum(allAlbumIds[0]);
              const albumThumb = album.thumbnails?.[0]?.url;
              const seenIds = new Set(items.map((i) => i.videoId).filter(Boolean));
              const albumTracks = album.tracks
                .filter((t) => t.videoId && !seenIds.has(t.videoId))
                .map((t) => ({
                  title: t.title,
                  videoId: t.videoId,
                  artists: t.artists,
                  thumbnail: albumThumb,
                  isTopSong: false,
                  albumBrowseId: allAlbumIds[0],
                  albumIndex: t.index ?? null,
                }));
              items = [...topItems, ...shuffle(albumTracks)].slice(0, 10);
              consumedAlbumId = allAlbumIds[0];
            } catch {}
          }
          set({
            autoQueue: items,
            currentArtistId: context.artistBrowseId,
            currentAutoQueueSource: artist.name,
            relatedArtists: artist.related ?? [],
            relatedArtistIndex: -1,
            usedArtistIds: [...get().usedArtistIds, context.artistBrowseId],
            artistTrackPool: [],
            pendingAlbumBrowseIds: consumedAlbumId ? allAlbumIds.slice(1) : allAlbumIds,
          });
        } catch {}
      } else if (trackWithOverride.artist) {
        try {
          const search = await api.searchArtists(trackWithOverride.artist, 1);
          const result = search.results?.[0];
          if (result?.id && result.name?.toLowerCase() === trackWithOverride.artist.toLowerCase()) {
            const artist = await api.getArtist(result.id);
            const allAlbumIds = [
              ...artist.albums.map((a) => a.browseId).filter((s): s is string => Boolean(s)),
              ...artist.singles.map((s) => s.browseId).filter((s): s is string => Boolean(s)),
            ];
            const topItems = shuffle(artist.topSongs)
              .filter((s) => s.videoId && s.videoId !== trackId)
              .slice(0, 10)
              .map((s) => ({
                title: s.title,
                videoId: s.videoId,
                artists: s.artists,
                thumbnail: s.thumbnails?.[0]?.url,
                isTopSong: true,
              }));
            let items = topItems;
            let consumedAlbumId: string | null = null;
            if (items.length < 10 && allAlbumIds.length > 0) {
              try {
                const album = await api.getAlbum(allAlbumIds[0]);
                const albumThumb = album.thumbnails?.[0]?.url;
                const seenIds = new Set(items.map((i) => i.videoId).filter(Boolean));
                const albumTracks = album.tracks
                  .filter((t) => t.videoId && !seenIds.has(t.videoId))
                  .map((t) => ({
                    title: t.title,
                    videoId: t.videoId,
                    artists: t.artists,
                    thumbnail: albumThumb,
                    isTopSong: false,
                    albumBrowseId: allAlbumIds[0],
                    albumIndex: t.index ?? null,
                  }));
                items = [...topItems, ...shuffle(albumTracks)].slice(0, 10);
                consumedAlbumId = allAlbumIds[0];
              } catch {}
            }
            set({
              autoQueue: items,
              currentArtistId: result.id,
              currentAutoQueueSource: artist.name,
              relatedArtists: artist.related ?? [],
              relatedArtistIndex: -1,
            usedArtistIds: [...get().usedArtistIds, result.id],
            artistTrackPool: [],
            pendingAlbumBrowseIds: consumedAlbumId ? allAlbumIds.slice(1) : allAlbumIds,
          });
        }
        } catch {}
      }

      // Prefetch lyrics + stream in background
      prefetchLyrics(trackWithOverride.id, trackWithOverride.artist, trackWithOverride.title, trackWithOverride.duration);
      prefetchStream(trackId).catch(() => {});
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
      const history = addToPlayHistory(get().playHistory, trackToHistoryEntry(track));
      set({ currentTrack: track, isPlaying: true, currentTime: 0, playHistory: history, playedVideoIds: [...get().playedVideoIds, track.id] });
    }
  },

  playNext: async () => {
    const state = get();

    // 1. repeat:one — restart current track
    if (state.repeat === "one" && state.currentTrack) {
      set({ currentTime: 0, pendingSeekTo: 0 });
      return;
    }

    // 2. queue has more tracks
    if (state.queueIndex + 1 < state.queue.length) {
      const nextIndex = state.queueIndex + 1;
      const track = state.queue[nextIndex];
      set({ queueIndex: nextIndex });
      if (track) {
        const history = addToPlayHistory(get().playHistory, trackToHistoryEntry(track));
        set({ currentTrack: track, isPlaying: true, currentTime: 0, duration: track.duration, playHistory: history, playedVideoIds: [...get().playedVideoIds, track.id] });
      }
      return;
    }

    // 3. autoQueue has more tracks
    if (state.autoQueueIndex + 1 < state.autoQueue.length) {
      const nextIndex = state.autoQueueIndex + 1;
      const item = state.autoQueue[nextIndex];
      set({ autoQueueIndex: nextIndex, isLoading: true });
      if (item.videoId) {
        try {
          const track = await api.getTrack(item.videoId);
          const resolvedTrack: TrackInfo = {
            id: track.id,
            title: item.title ?? track.title,
            artist: item.artists?.join(", ") ?? track.artist,
            thumbnail: item.thumbnail ?? track.thumbnail,
            duration: track.duration,
            url: track.url,
            webpageUrl: track.webpageUrl,
            directUrl: track.directUrl,
            formats: track.formats,
          };
          const history = addToPlayHistory(get().playHistory, trackToHistoryEntry(resolvedTrack));
          set((s) => ({
            currentTrack: resolvedTrack,
            isPlaying: true,
            currentTime: 0,
            duration: resolvedTrack.duration,
            isLoading: false,
            playHistory: history,
            playedVideoIds: [...s.playedVideoIds, resolvedTrack.id],
            recentAlbumIds: item.albumBrowseId
              ? [item.albumBrowseId, ...s.recentAlbumIds].slice(0, 3)
              : s.recentAlbumIds,
          }));
        } catch {
          set({ isLoading: false, isPlaying: false });
        }
      } else {
        set({ isLoading: false, isPlaying: false });
      }
      return;
    }

    // 4. autoQueue exhausted + currentArtistId — refill
    if (state.currentArtistId) {
      set({ isLoading: true });

      // 4a. Plan A + B: pool scored + filtered by playedVideoIds
      let batch = scoreRefillBatch(state.artistTrackPool, state.playedVideoIds, state.recentAlbumIds);

      // Lazy fetch: if pool exhausted, fetch one pending album at a time
      if (!batch && state.pendingAlbumBrowseIds.length > 0) {
        const nextId = state.pendingAlbumBrowseIds[0];
        set({ pendingAlbumBrowseIds: state.pendingAlbumBrowseIds.slice(1) });
        try {
          const album = await api.getAlbum(nextId);
          const albumThumb = album.thumbnails?.[0]?.url;
          const newTracks: AutoQueueItem[] = album.tracks
            .filter((t) => t.videoId)
            .map((t) => ({
              title: t.title,
              videoId: t.videoId,
              artists: t.artists,
              thumbnail: albumThumb,
              isTopSong: false,
              albumBrowseId: nextId,
              albumIndex: t.index ?? null,
            }));
          set((s) => ({ artistTrackPool: [...s.artistTrackPool, ...newTracks] }));
          batch = scoreRefillBatch(get().artistTrackPool, state.playedVideoIds, state.recentAlbumIds);
        } catch {}
      }

      // 4b. Plan B alone: re-fetch topSongs, filter by playedVideoIds
      if (!batch) {
        try {
          const artist = await api.getArtist(state.currentArtistId);
          const unplayed = artist.topSongs.filter(
            (s) => s.videoId && !state.playedVideoIds.includes(s.videoId)
          );
          if (unplayed.length > 0) {
            batch = shuffle(unplayed).slice(0, 10).map((s) => ({
              title: s.title,
              videoId: s.videoId,
              artists: s.artists,
              thumbnail: s.thumbnails?.[0]?.url,
            }));
          }
        } catch {}
      }

      // 4d. Plan D: related songs from current track
      if (!batch && state.currentTrack?.id) {
        try {
          const related = await api.getTrackRelated(state.currentTrack.id);
          if (related.results?.length > 0) {
            const unplayed = related.results.filter(
              (r) => r.videoId && !state.playedVideoIds.includes(r.videoId)
            );
            if (unplayed.length > 0) {
              batch = shuffle(unplayed).slice(0, 10).map((r: any) => ({
                title: r.title,
                videoId: r.videoId,
                artists: r.artists ?? [r.artist],
                thumbnail: r.thumbnails?.[0]?.url ?? r.thumbnail,
              }));
            }
          }
        } catch {}
      }

      // 4c. Plan C: related artist fallback
      if (!batch && state.relatedArtists.length > 0) {
        const next = state.relatedArtists.find(
          (r) => !state.usedArtistIds.includes(r.browseId)
        );
        if (next) {
          try {
            const artist = await api.getArtist(next.browseId);
            const topSongs = shuffle(artist.topSongs)
              .filter((s) => s.videoId)
              .slice(0, 10);
            if (topSongs.length > 0) {
              batch = topSongs.map((s) => ({
                title: s.title,
                videoId: s.videoId,
                artists: s.artists,
                thumbnail: s.thumbnails?.[0]?.url,
              }));
              set({
                currentArtistId: next.browseId,
                currentAutoQueueSource: next.artist,
                relatedArtists: artist.related ?? [],
                relatedArtistIndex: 0,
                usedArtistIds: [...state.usedArtistIds, next.browseId],
                artistTrackPool: [],
                pendingAlbumBrowseIds: [
                  ...artist.albums.map((a) => a.browseId).filter((s): s is string => Boolean(s)),
                  ...artist.singles.map((s) => s.browseId).filter((s): s is string => Boolean(s)),
                ],
              });
            }
          } catch {}
        }
      }

      if (batch && batch.length > 0) {
        set({ autoQueue: batch, autoQueueIndex: 0 });
        const first = batch[0];
        if (first?.videoId) {
          try {
            const track = await api.getTrack(first.videoId);
            const resolvedTrack: TrackInfo = {
              id: track.id,
              title: first.title ?? track.title,
              artist: first.artists?.join(", ") ?? track.artist,
              thumbnail: first.thumbnail ?? track.thumbnail,
              duration: track.duration,
              url: track.url,
              webpageUrl: track.webpageUrl,
              directUrl: track.directUrl,
              formats: track.formats,
            };
            const history = addToPlayHistory(get().playHistory, trackToHistoryEntry(resolvedTrack));
            set((s) => ({
              currentTrack: resolvedTrack,
              isPlaying: true,
              currentTime: 0,
              duration: resolvedTrack.duration,
              isLoading: false,
              playHistory: history,
              playedVideoIds: [...s.playedVideoIds, resolvedTrack.id],
              recentAlbumIds: first.albumBrowseId
                ? [first.albumBrowseId, ...s.recentAlbumIds].slice(0, 3)
                : s.recentAlbumIds,
            }));
          } catch {
            set({ isLoading: false, isPlaying: false });
          }
        } else {
          set({ isLoading: false, isPlaying: false });
        }
        return;
      }

      // All refill options exhausted — fall through
      set({ isLoading: false });
    }

    // 5. repeat:all — loop back to queue start
    if (state.repeat === "all" && state.queue.length > 0) {
      set({ queueIndex: 0 });
      const track = state.queue[0];
      if (track) {
        const history = addToPlayHistory(get().playHistory, trackToHistoryEntry(track));
        set({ currentTrack: track, isPlaying: true, currentTime: 0, playHistory: history, playedVideoIds: [...get().playedVideoIds, track.id] });
      }
      return;
    }

    // 6. nothing left
    set({ isPlaying: false });
  },

  playPrev: () => {
    const state = get();

    // 1. If past 3 seconds, restart current track
    if (state.currentTime > 3) {
      set({ currentTime: 0, pendingSeekTo: 0 });
      return;
    }

    // 2. Go back in queue
    if (state.queueIndex > 0) {
      const prevIndex = state.queueIndex - 1;
      set({ queueIndex: prevIndex });
      const track = state.queue[prevIndex];
      if (track) {
        set({ currentTrack: track, isPlaying: true, currentTime: 0, duration: track.duration, playedVideoIds: [...get().playedVideoIds, track.id] });
      }
      return;
    }

    // 3. Go back in autoQueue
    if (state.autoQueueIndex > 0) {
      const prevIndex = state.autoQueueIndex - 1;
      const item = state.autoQueue[prevIndex];
      set({ autoQueueIndex: prevIndex, isLoading: true });
      if (item.videoId) {
        api.getTrack(item.videoId).then((track) => {
          const resolvedTrack: TrackInfo = {
            id: track.id,
            title: item.title ?? track.title,
            artist: item.artists?.join(", ") ?? track.artist,
            thumbnail: item.thumbnail ?? track.thumbnail,
            duration: track.duration,
            url: track.url,
            webpageUrl: track.webpageUrl,
            directUrl: track.directUrl,
            formats: track.formats,
          };
          const history = addToPlayHistory(get().playHistory, trackToHistoryEntry(resolvedTrack));
          set({ currentTrack: resolvedTrack, isPlaying: true, currentTime: 0, duration: resolvedTrack.duration, isLoading: false, playHistory: history, playedVideoIds: [...get().playedVideoIds, resolvedTrack.id] });
        }).catch(() => {
          set({ isLoading: false, isPlaying: false });
        });
      } else {
        set({ isLoading: false, isPlaying: false });
      }
      return;
    }

    // 4. Restart current track
    if (state.currentTrack) {
      set({ currentTime: 0, pendingSeekTo: 0 });
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
      if (!state.currentTrack) {
        await get().playTrack(trackId);
      } else {
        set((s) => ({ queue: [...s.queue, track] }));
      }
    } catch {}
  },

  removeFromQueue: (index) => {
    const state = get();
    if (index < 0 || index >= state.queue.length) return;
    const newQueue = state.queue.filter((_, i) => i !== index);

    if (state.queueIndex === index) {
      set({ queue: newQueue, queueIndex: state.queueIndex - 1 });
      get().playNext();
    } else {
      const adjustedIndex = state.queueIndex > index ? state.queueIndex - 1 : state.queueIndex;
      set({ queue: newQueue, queueIndex: adjustedIndex });
    }
  },

  clearQueue: () => {
    set({ queue: [], queueIndex: -1, autoQueue: [], autoQueueIndex: -1, playedVideoIds: [], artistTrackPool: [], pendingAlbumBrowseIds: [], relatedArtistIndex: -1, usedArtistIds: [], currentAutoQueueSource: null, recentAlbumIds: [] });
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
    const profile = { recentTracks: state.playHistory.map((h) => h.id), likedArtists: [] };
    const safe = btoa(JSON.stringify(profile)).replace(/\+/g, "-").replace(/\//g, "_");
    return safe;
  },
}));
