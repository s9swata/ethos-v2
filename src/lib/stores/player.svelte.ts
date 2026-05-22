import { api } from "$lib/services/api";
import type { TrackInfo } from "$lib/types";

export interface PlayContext {
  artistBrowseId?: string;
  artistName?: string;
  thumbnail?: string;
  title?: string;
  albumBrowseId?: string;
}

interface AutoQueueItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

let currentTrack: TrackInfo | null = $state(null);
let isPlaying = $state(false);
let currentTime = $state(0);
let duration = $state(0);
let volume = $state(1);

let queue: TrackInfo[] = $state([]);
let queueIndex = $state(-1);

let autoQueue: AutoQueueItem[] = $state([]);
let autoQueueIndex = $state(-1);
let currentArtistId = $state<string | undefined>();
let currentAlbumId = $state<string | undefined>();

export const player = {
  get currentTrack() { return currentTrack; },
  get isPlaying() { return isPlaying; },
  get currentTime() { return currentTime; },
  get duration() { return duration; },
  get volume() { return volume; },
  get queue() { return queue; },
  get queueIndex() { return queueIndex; },
  get autoQueue() { return autoQueue as unknown as TrackInfo[]; },
  get autoQueueIndex() { return autoQueueIndex; },
  get currentArtistId() { return currentArtistId; },
  get currentAlbumId() { return currentAlbumId; },
};

async function fillAutoQueue(browseId: string, excludeTrackId: string): Promise<void> {
  try {
    const artist = await api.getArtist(browseId);
    if (!artist.topSongs?.length) return;
    const items: AutoQueueItem[] = [];
    for (const song of artist.topSongs) {
      if (song.videoId === excludeTrackId) continue;
      items.push({
        id: song.videoId,
        title: song.title,
        artist: song.artists?.[0] || "Unknown",
        thumbnail: song.thumbnails?.[0]?.url || "",
      });
    }
    autoQueue = items.slice(0, 10);
    autoQueueIndex = -1;
  } catch {
    autoQueue = [];
    autoQueueIndex = -1;
  }
}

async function resolveAndFill(trackId: string, artistName: string): Promise<void> {
  try {
    const res = await api.searchArtists(artistName, 1);
    const artist = res.results[0];
    if (artist?.id) await fillAutoQueue(artist.id, trackId);
  } catch {
    // silent
  }
}

export async function playTrack(trackId: string, context?: PlayContext): Promise<void> {
  if (currentTrack?.id === trackId) {
    isPlaying = true;
    return;
  }
  const info = await api.getTrack(trackId);
  currentTrack = {
    id: trackId,
    title: context?.title ?? info.title,
    artist: context?.artistName ?? info.artist,
    thumbnail: context?.thumbnail ?? info.thumbnail,
    url: info.url,
    duration: info.duration,
    webpageUrl: info.webpageUrl,
    directUrl: info.directUrl,
    formats: info.formats,
  };
  currentArtistId = context?.artistBrowseId;
  currentAlbumId = context?.albumBrowseId;
  currentTime = 0;
  duration = 0;
  isPlaying = true;

  if (context?.artistBrowseId) {
    fillAutoQueue(context.artistBrowseId, trackId);
  }
}

export function setQueue(tracks: TrackInfo[], startIndex = 0): void {
  queue = tracks;
  queueIndex = startIndex;
  autoQueue = [];
  autoQueueIndex = -1;
}

export async function playNext(): Promise<boolean> {
  if (queueIndex < queue.length - 1) {
    queueIndex++;
    currentTrack = queue[queueIndex];
    currentArtistId = undefined;
    currentAlbumId = undefined;
    currentTime = 0;
    duration = 0;
    isPlaying = true;
    return true;
  }
  if (autoQueueIndex < autoQueue.length - 1) {
    autoQueueIndex++;
    const item = autoQueue[autoQueueIndex];
    try {
      currentTrack = await api.getTrack(item.id);
    } catch {
      setPlaying(false);
      return false;
    }
    currentArtistId = undefined;
    currentAlbumId = undefined;
    currentTime = 0;
    duration = 0;
    isPlaying = true;
    return true;
  }
  setPlaying(false);
  return false;
}

export async function playPrev(): Promise<void> {
  if (queueIndex > 0) {
    queueIndex--;
    currentTrack = queue[queueIndex];
    currentArtistId = undefined;
    currentAlbumId = undefined;
    currentTime = 0;
    duration = 0;
    isPlaying = true;
    return;
  }
  if (autoQueueIndex > 0) {
    autoQueueIndex--;
    const item = autoQueue[autoQueueIndex];
    try {
      currentTrack = await api.getTrack(item.id);
    } catch {
      return;
    }
    currentArtistId = undefined;
    currentAlbumId = undefined;
    currentTime = 0;
    duration = 0;
    isPlaying = true;
    return;
  }
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

export function setDuration(d: number): void {
  duration = d;
}

export function setVolume(v: number): void {
  volume = v;
}
