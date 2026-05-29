import type { TrackInfo, RepeatMode, QueueItem } from "@/types";
import type { SetFn } from "./player-types";
import { loadQueue, type StoredTrack } from "@/utils/queue-store";
import { trackToHistoryEntry, addToPlayHistory } from "./player-utils";

export async function setQueueAction(set: SetFn, get: any, tracks: QueueItem[], startIndex: number, ctx?: { type: "album" | "artist" | "playlist" | "radio" | "single"; id?: string }): Promise<void> {
  const contextQueue = tracks.slice(startIndex + 1);
  set({
    userQueue: [],
    contextQueue,
    history: [],
    context: ctx ?? { type: "radio" },
    watchPlaylistId: null,
  });
  const track = tracks[startIndex];
  if (track) {
    await get().playTrack(track.videoId, {
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
    });
  }
}

export async function playPrevAction(set: SetFn, get: any): Promise<void> {
  const state = get();

  if (state.currentTime > 3) {
    set({ currentTime: 0, pendingSeekTo: 0 });
    return;
  }

  if (state.history.length === 0) return;

  const prev = state.history[state.history.length - 1];
  const updatedHistory = state.history.slice(0, -1);

  if (state.currentTrack) {
    const currentEntry = {
      videoId: state.currentTrack.id,
      title: state.currentTrack.title,
      artist: state.currentTrack.artist,
      thumbnail: state.currentTrack.thumbnail,
      duration: state.currentTrack.duration,
    };
    set({
      contextQueue: [currentEntry, ...state.contextQueue],
      history: updatedHistory,
    });
  } else {
    set({ history: updatedHistory });
  }

  await get().playTrack(prev.videoId, {
    title: prev.title,
    artist: prev.artist,
    thumbnail: prev.thumbnail,
  });
}

export function addToQueueAction(set: SetFn, get: any, item: QueueItem): void {
  if (!get().currentTrack) return;
  set((s: any) => ({ userQueue: [...s.userQueue, item] }));
}

export function playNextInlineAction(set: SetFn, get: any, item: QueueItem): void {
  if (!get().currentTrack) return;
  set((s: any) => ({ userQueue: [item, ...s.userQueue] }));
}

export function removeFromQueueAction(set: SetFn, get: any, videoId: string): void {
  set((s: any) => ({
    userQueue: s.userQueue.filter((i: QueueItem) => i.videoId !== videoId),
    contextQueue: s.contextQueue.filter((i: QueueItem) => i.videoId !== videoId),
  }));
}

function toQueueItem(t: StoredTrack): QueueItem {
  return { videoId: t.id, title: t.title, artist: t.artist, thumbnail: t.thumbnail, duration: t.duration };
}

export async function restoreQueueAction(set: SetFn): Promise<boolean> {
  const saved = await loadQueue();
  if (!saved) return false;
  if (saved.userQueue.length === 0 && saved.contextQueue.length === 0 && !saved.currentTrack) return false;
  set({
    userQueue: (saved.userQueue ?? []).map(toQueueItem),
    contextQueue: saved.contextQueue ?? [],
    watchPlaylistId: saved.watchPlaylistId ?? null,
    context: (saved.context ?? { type: "radio" }) as { type: "album" | "artist" | "playlist" | "radio" | "single"; id?: string },
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
    history: (saved.history ?? []).map(toQueueItem),
  });
  return true;
}

export function getNextTrackValue(get: any): TrackInfo | null {
  const state = get();
  const next = state.userQueue[0] ?? state.contextQueue[0];
  if (!next) return null;
  return {
    id: next.videoId,
    title: next.title,
    artist: next.artist,
    duration: next.duration,
    thumbnail: next.thumbnail,
    url: "",
    directUrl: "",
    webpageUrl: "",
    formats: [],
  };
}

export function getTasteProfileValue(get: any): string {
  const state = get();
  if (state.history.length === 0) return "";
  const profile = { recentTracks: state.history.map((h: any) => h.videoId), likedArtists: [] };
  const safe = btoa(JSON.stringify(profile)).replace(/\+/g, "-").replace(/\//g, "_");
  return safe;
}
