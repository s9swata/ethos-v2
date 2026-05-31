import type { TrackInfo, AudioFormat, QueueItem } from "@/types";
import type { SetFn, GetFn } from "./player-types";
import { getBestAudioStream } from "expo-youtube-audio-stream";
import { api } from "@/api/client";
import { recordPlay } from "@/utils/taste";
import { getTrackFromCache, setTrackCache } from "@/utils/track-cache";
import { trackToHistoryEntry, addToPlayHistory } from "./player-utils";

const REFILL_THRESHOLD = 3;

export async function fetchTrack(item: QueueItem): Promise<TrackInfo> {
  const cached = await getTrackFromCache(item.videoId);
  if (cached) return cached;

  try {
    const stream = await getBestAudioStream(item.videoId, { preferredMimeType: "audio/mp4", minBitrate: 48000 });
    if (stream?.url) {
      const formats: AudioFormat[] = [{ url: stream.url, ext: stream.container, format: `${stream.container} ${Math.round(stream.bitrate / 1000)}k`, bitrate: stream.bitrate }];
      const track: TrackInfo = {
        id: item.videoId,
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
        duration: item.duration,
        url: stream.url,
        directUrl: stream.url,
        webpageUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
        formats,
      };
      setTrackCache(item.videoId, track).catch(() => {});
      return track;
    }
  } catch {}

  throw new Error(`No stream available for ${item.videoId}`);
}

async function refillContextQueue(set: SetFn, get: GetFn): Promise<void> {
  const state = get();
  if (state.contextQueue.length >= REFILL_THRESHOLD) return;

  try {
    const result = await api.getWatchPlaylist(
      state.currentTrack?.id ?? state.contextQueue[0]?.videoId ?? "",
      state.watchPlaylistId ?? undefined,
      25
    );
    const existingIds = new Set([
      ...state.userQueue.map((i) => i.videoId),
      ...state.contextQueue.map((i) => i.videoId),
      ...state.history.map((i) => i.videoId),
    ]);
    const newTracks = (result.tracks || []).filter((t: QueueItem) => !existingIds.has(t.videoId));
    if (newTracks.length > 0) {
      set((s: any) => ({ contextQueue: [...s.contextQueue, ...newTracks] }));
    }
    set({ watchPlaylistId: result.playlistId || null });
  } catch (e) {
    console.warn("[playNext] refill failed:", e);
  }
}

export async function playNextAction(set: SetFn, get: GetFn): Promise<void> {
  const state = get();

  if (state.repeat === "one" && state.currentTrack) {
    set({ currentTime: 0, pendingSeekTo: 0 });
    return;
  }

  if (state.currentTrack) {
    const entry = trackToHistoryEntry(state.currentTrack);
    set((s: any) => ({ history: addToPlayHistory(s.history, entry) }));
  }

  let next: (typeof state.userQueue)[0] | undefined;

  if (state.userQueue.length > 0) {
    const shifted = [...state.userQueue];
    next = shifted.shift();
    set({ userQueue: shifted });
  } else if (state.contextQueue.length > 0) {
    const shifted = [...state.contextQueue];
    next = shifted.shift();
    set({ contextQueue: shifted });
  } else {
    set({ isPlaying: false, currentTrack: null });
    return;
  }

  if (!next) {
    set({ isPlaying: false, currentTrack: null });
    return;
  }

  let info: TrackInfo;
  try {
    info = await fetchTrack(next);
  } catch (e) {
    console.warn("[playNext] fetch failed:", e);
    set({ error: e instanceof Error ? e.message : "Failed to load track", currentTrack: null, isPlaying: false, isLoading: false });
    return;
  }

  set({
    currentTrack: {
      id: next.videoId,
      title: info.title,
      artist: info.artist,
      thumbnail: info.thumbnail,
      url: info.url,
      duration: info.duration,
      startTime: info.startTime,
      endTime: info.endTime,
      webpageUrl: info.webpageUrl,
      directUrl: info.directUrl,
      formats: info.formats,
    },
    currentTime: 0,
    duration: 0,
    isPlaying: true,
  });

  recordPlay(next.videoId).catch(() => {});

  refillContextQueue(set, get);

  const visible = [...get().userQueue, ...get().contextQueue];
  for (let i = 0; i < Math.min(visible.length, 2); i++) {
    fetchTrack(visible[i]).catch(() => {});
  }
}
