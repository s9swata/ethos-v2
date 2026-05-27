import type { TrackInfo, RepeatMode } from "@/types";
import type { SetFn } from "./player-types";
import { api } from "@/api/client";
import { recordPlay } from "@/utils/taste";
import { loadQueue, type StoredTrack } from "@/utils/queue-store";
import { formatDuration } from "@/utils/duration";
import { trackToHistoryEntry, addToPlayHistory } from "./player-utils";

export async function setQueueAction(set: SetFn, get: any, tracks: TrackInfo[], startIndex: number): Promise<void> {
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
    recordPlay(track.id).catch(() => {});
  }
}

export async function playPrevAction(set: SetFn, get: any): Promise<void> {
  const state = get();

  if (state.currentTime > 3) {
    set({ currentTime: 0, pendingSeekTo: 0 });
    return;
  }

  if (state.queueIndex > 0) {
    const prevIndex = state.queueIndex - 1;
    set({ queueIndex: prevIndex });
    const track = state.queue[prevIndex];
    if (track) {
      if (!track.url) {
        await get().playTrack(track.id, {
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail,
          duration: formatDuration(track.duration),
        });
        return;
      }
      set({ currentTrack: track, isPlaying: true, currentTime: 0, duration: track.duration, playedVideoIds: [...get().playedVideoIds, track.id] });
    }
    return;
  }

  if (state.autoQueueIndex > 0) {
    const prevIndex = state.autoQueueIndex - 1;
    const item = state.autoQueue[prevIndex];
    if (item.videoId) {
      await get().playTrack(item.videoId, {
        title: item.title ?? undefined,
        artist: item.artists?.join(", "),
        thumbnail: item.thumbnail ?? undefined,
        duration: item.duration ?? undefined,
        albumBrowseId: item.albumBrowseId ?? undefined,
      });
    }
    return;
  }

  if (state.currentTrack) {
    set({ currentTime: 0, pendingSeekTo: 0 });
  }
}

export async function addToQueueAction(set: SetFn, get: any, trackId: string): Promise<void> {
  const state = get();
  try {
    const track = await api.getTrack(trackId);
    if (!state.currentTrack) {
      await get().playTrack(trackId);
    } else {
      set((s: any) => ({ queue: [...s.queue, track] }));
    }
  } catch {}
}

export function removeFromQueueAction(set: SetFn, get: any, index: number): void {
  const state = get();
  if (index < 0 || index >= state.queue.length) return;
  const newQueue = state.queue.filter((_: any, i: number) => i !== index);

  if (state.queueIndex === index) {
    set({ queue: newQueue, queueIndex: state.queueIndex - 1 });
    get().playNext();
  } else {
    const adjustedIndex = state.queueIndex > index ? state.queueIndex - 1 : state.queueIndex;
    set({ queue: newQueue, queueIndex: adjustedIndex });
  }
}

export async function restoreQueueAction(set: SetFn): Promise<boolean> {
  const saved: Awaited<ReturnType<typeof loadQueue>> = await loadQueue();
  if (!saved) return false;
  if (saved.queue.length === 0 && !saved.currentTrack) return false;
  set({
    queue: saved.queue.map((t: StoredTrack) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnail: t.thumbnail,
      url: "",
      directUrl: "",
      webpageUrl: "",
      formats: [],
    })),
    queueIndex: saved.queueIndex,
    autoQueue: saved.autoQueue ?? [],
    autoQueueIndex: saved.autoQueueIndex ?? -1,
    currentTrack: saved.currentTrack ? {
      id: saved.currentTrack.id,
      title: saved.currentTrack.title,
      artist: saved.currentTrack.artist,
      duration: saved.currentTrack.duration,
      thumbnail: saved.currentTrack.thumbnail,
      url: "",
      directUrl: "",
      webpageUrl: "",
      formats: [],
    } : null,
    currentTime: saved.currentTime ?? 0,
    duration: saved.duration ?? 0,
    repeat: (saved.repeat ?? "off") as RepeatMode,
    isShuffled: saved.isShuffled ?? false,
    volume: saved.volume ?? 1,
    currentArtistId: saved.currentArtistId ?? null,
    currentAlbumId: saved.currentAlbumId ?? null,
    currentAutoQueueSource: saved.currentAutoQueueSource ?? null,
    playHistory: saved.playHistory ?? [],
    recentAlbumIds: saved.recentAlbumIds ?? [],
  });
  return true;
}

export function getNextTrackValue(get: any): TrackInfo | null {
  const state = get();
  if (state.queue.length > 0 && state.queueIndex < state.queue.length - 1) {
    return state.queue[state.queueIndex + 1];
  }
  return null;
}

export function getTasteProfileValue(get: any): string {
  const state = get();
  if (state.playHistory.length === 0) return "";
  const profile = { recentTracks: state.playHistory.map((h: any) => h.id), likedArtists: [] };
  const safe = btoa(JSON.stringify(profile)).replace(/\+/g, "-").replace(/\//g, "_");
  return safe;
}
