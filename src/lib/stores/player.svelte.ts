import { api } from "$lib/services/api";
import type { TrackInfo, QueueItem } from "$lib/types";

const REFILL_THRESHOLD = 3;
const MAX_HISTORY = 50;

export interface PlayOptions {
  title?: string;
  artistName?: string;
  thumbnail?: string;
  artistBrowseId?: string;
  albumBrowseId?: string;
  queueType?: "album" | "playlist" | "radio" | "single";
  queueId?: string;
  contextItems?: QueueItem[];
  startIndex?: number;
}

let currentTrack: TrackInfo | null = $state(null);
let isPlaying = $state(false);
let currentTime = $state(0);
let duration = $state(0);
let volume = $state(1);
let seekTarget = $state<number | null>(null);

let userQueue: QueueItem[] = $state([]);
let contextQueue: QueueItem[] = $state([]);
let watchPlaylistId: string | null = $state(null);
let queueContext: { type: "album" | "playlist" | "radio" | "single"; id?: string } = $state({ type: "radio" });
let history: QueueItem[] = $state([]);
let shuffleEnabled = $state(false);
let repeatMode = $state<"none" | "one" | "all">("none");

let currentArtistId = $state<string | undefined>();
let currentAlbumId = $state<string | undefined>();

export const player = {
  get currentTrack() { return currentTrack; },
  get isPlaying() { return isPlaying; },
  get currentTime() { return currentTime; },
  get duration() { return duration; },
  get volume() { return volume; },
  get seekTarget() { return seekTarget; },
  get userQueue() { return userQueue; },
  get contextQueue() { return contextQueue; },
  get history() { return history; },
  get queueContext() { return queueContext; },
  get shuffle() { return shuffleEnabled; },
  get repeat() { return repeatMode; },
  get currentArtistId() { return currentArtistId; },
  get currentAlbumId() { return currentAlbumId; },

  get hasNext(): boolean {
    return userQueue.length > 0 || contextQueue.length > 0 || repeatMode === "all";
  },
  get hasPrev(): boolean {
    return history.length > 0;
  },
  get visibleQueue(): QueueItem[] {
    return [...userQueue, ...contextQueue];
  },
};

function dedupFilter(items: QueueItem[]): QueueItem[] {
  const existingIds = new Set([
    currentTrack?.id,
    ...contextQueue.map(t => t.videoId),
    ...userQueue.map(t => t.videoId),
    ...history.map(t => t.videoId),
  ]);
  return items.filter(t => !existingIds.has(t.videoId));
}

async function refillFromWatch(videoId: string, playlistId?: string): Promise<void> {
  if (contextQueue.length >= REFILL_THRESHOLD && !playlistId) return;

  try {
    const result = await api.getWatchPlaylist(videoId, playlistId, 25);
    const newTracks = result.tracks || [];
    if (newTracks.length === 0) return;

    const deduped = dedupFilter(newTracks);
    if (deduped.length > 0) {
      contextQueue = [...contextQueue, ...deduped];
    }
    watchPlaylistId = result.playlistId || null;
  } catch (e) {
    console.error("[player] refillFromWatch failed:", e);
  }
}

export function prefetchNext(): void {
  const items = userQueue.length > 0 ? userQueue : contextQueue;
  for (let i = 0; i < Math.min(items.length, 2); i++) {
    api.getTrack(items[i].videoId).catch(() => {});
  }
}

export async function playTrack(videoId: string, options?: PlayOptions): Promise<void> {
  if (currentTrack?.id === videoId) {
    isPlaying = true;
    return;
  }

  currentTrack = null;

  let info: TrackInfo;
  try {
    info = await api.getTrack(videoId);
  } catch (e) {
    console.error("[player.playTrack] api.getTrack failed:", e);
    isPlaying = false;
    return;
  }

  currentTrack = {
    id: videoId,
    title: options?.title ?? info.title,
    artist: options?.artistName ?? info.artist,
    thumbnail: options?.thumbnail ?? info.thumbnail,
    url: info.url,
    duration: info.duration,
    startTime: info.startTime,
    endTime: info.endTime,
    webpageUrl: info.webpageUrl,
    directUrl: info.directUrl,
    formats: info.formats,
  };
  currentArtistId = options?.artistBrowseId;
  currentAlbumId = options?.albumBrowseId;
  currentTime = 0;
  duration = 0;
  isPlaying = true;

  userQueue = [];
  history = [];

  if (options?.queueType) {
    queueContext = { type: options.queueType, id: options.queueId };
  } else {
    queueContext = { type: "radio" };
  }

  if (options?.contextItems && options.contextItems.length > 0) {
    const startIdx = options.startIndex ?? 0;
    contextQueue = options.contextItems.slice(startIdx + 1);
  } else {
    contextQueue = [];
  }

  if (options?.queueType === "album" || options?.queueType === "playlist") {
    await refillFromWatch(videoId, options?.queueId);
  } else {
    await refillFromWatch(videoId);
  }

  prefetchNext();
}

export async function playNext(): Promise<boolean> {
  if (repeatMode === "one" && currentTrack) {
    seekTo(0);
    return true;
  }

  if (currentTrack) {
    history = [
      ...history,
      {
        videoId: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        thumbnail: currentTrack.thumbnail,
        duration: currentTrack.duration,
      },
    ].slice(-MAX_HISTORY);
  }

  let next: QueueItem | undefined;

  if (userQueue.length > 0) {
    next = userQueue.shift();
  } else if (contextQueue.length > 0) {
    next = contextQueue.shift();
  } else if (repeatMode === "all") {
    setPlaying(false);
    return false;
  } else {
    currentTrack = null;
    setPlaying(false);
    return false;
  }

  if (!next) {
    currentTrack = null;
    setPlaying(false);
    return false;
  }

  let info: TrackInfo;
  try {
    info = await api.getTrack(next.videoId);
  } catch (e) {
    console.error("[player.playNext] api.getTrack failed:", e);
    return await playNext();
  }

  currentTrack = {
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
  };
  currentArtistId = next.artistId;
  currentAlbumId = next.albumId;
  currentTime = 0;
  duration = 0;
  isPlaying = true;

  if (contextQueue.length < REFILL_THRESHOLD && currentTrack) {
    refillFromWatch(currentTrack.id, watchPlaylistId ?? undefined);
  }

  prefetchNext();

  return true;
}

export async function playPrev(): Promise<void> {
  if (currentTime > 3) {
    seekTo(0);
    return;
  }

  if (history.length === 0) return;

  const prev = history.pop()!;

  if (currentTrack) {
    contextQueue = [
      {
        videoId: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        thumbnail: currentTrack.thumbnail,
        duration: currentTrack.duration,
      },
      ...contextQueue,
    ];
  }

  let info: TrackInfo;
  try {
    info = await api.getTrack(prev.videoId);
  } catch (e) {
    console.error("[player.playPrev] api.getTrack failed:", e);
    return;
  }

  currentTrack = {
    id: prev.videoId,
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
  };
  currentArtistId = prev.artistId;
  currentAlbumId = prev.albumId;
  currentTime = 0;
  duration = 0;
  isPlaying = true;
}

export function addToQueue(item: QueueItem): void {
  userQueue = [...userQueue, item];
  prefetchNext();
}

export function playNextInline(item: QueueItem): void {
  userQueue = [item, ...userQueue];
  prefetchNext();
}

export function setQueue(items: QueueItem[], startIndex = 0, ctx?: { type: "album" | "playlist" | "radio" | "single"; id?: string }): void {
  contextQueue = items.slice(startIndex + 1);
  if (ctx) {
    queueContext = ctx;
  }
  userQueue = [];
  history = [];

  if (ctx && (ctx.type === "album" || ctx.type === "playlist") && ctx.id && currentTrack) {
    refillFromWatch(currentTrack.id, ctx.id);
  }

  prefetchNext();
}

export function toggleShuffle(): void {
  shuffleEnabled = !shuffleEnabled;
  if (shuffleEnabled) {
    const arr = [...contextQueue];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    contextQueue = arr;
  }
}

export function setRepeat(mode: "none" | "one" | "all"): void {
  repeatMode = mode;
}

export function togglePlay(): void {
  isPlaying = !isPlaying;
}

export function setPlaying(v: boolean): void {
  isPlaying = v;
}

export function setCurrentTime(t: number): void {
  currentTime = t;
}

export function seekTo(t: number): void {
  currentTime = t;
  seekTarget = t;
}

export function clearSeekTarget(): void {
  seekTarget = null;
}

export function setDuration(d: number): void {
  duration = d;
}

export function setVolume(v: number): void {
  volume = v;
}
