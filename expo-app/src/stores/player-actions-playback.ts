import type { TrackInfo, QueueContext, AudioFormat } from "@/types";
import type { SetFn, GetFn } from "./player-types";
import { api } from "@/api/client";
import { getBestAudioStream } from "expo-youtube-audio-stream";
import { parseDuration } from "@/utils/duration";
import { fetchTrack } from "./player-actions-next";
import { recordPlay } from "@/utils/taste";
import { trackToHistoryEntry, addToPlayHistory } from "./player-utils";

async function extractStream(trackId: string, context?: QueueContext): Promise<TrackInfo | null> {
  if (!(context?.title && context?.artist)) return null;
  try {
    const stream = await getBestAudioStream(trackId, {
      preferredMimeType: "audio/mp4",
      minBitrate: 48000,
    });
    if (stream?.url) {
      const durationNum = context.duration ? parseDuration(context.duration) : 0;
      const formats: AudioFormat[] = [{
        url: stream.url,
        ext: stream.container,
        format: `${stream.container} ${Math.round(stream.bitrate / 1000)}k`,
        bitrate: stream.bitrate,
      }];
      return {
        id: trackId,
        title: context.title!,
        artist: context.artist!,
        duration: durationNum,
        url: stream.url,
        directUrl: stream.url,
        thumbnail: context.thumbnail ?? "",
        webpageUrl: `https://www.youtube.com/watch?v=${trackId}`,
        formats,
      };
    }
  } catch (e) {
    console.warn("[playTrack] Local stream extraction failed:", e);
  }
  return null;
}

async function seedContextQueue(videoId: string, context?: QueueContext): Promise<{ contextQueue: any[]; watchPlaylistId: string | null }> {
  let contextQueue: any[] = [];
  let watchPlaylistId: string | null = null;

  if (context?.contextItems && context.contextItems.length > 0) {
    const startIdx = context.startIndex ?? 0;
    contextQueue = context.contextItems.slice(startIdx + 1);
  }

  try {
    const result = await api.getWatchPlaylist(videoId, context?.queueId, 25);
    const existingIds = new Set(contextQueue.map((i) => i.videoId));
    existingIds.add(videoId);
    const newTracks = (result.tracks || []).filter((t) => !existingIds.has(t.videoId));
    contextQueue = [...contextQueue, ...newTracks];
    watchPlaylistId = result.playlistId || null;
  } catch (e) {
    console.warn("[playTrack] watch playlist failed:", e);
  }

  return { contextQueue, watchPlaylistId };
}

export async function playTrackAction(set: SetFn, get: GetFn, trackId: string, context?: QueueContext): Promise<void> {
  const state = get();
  if (state.currentTrack?.id === trackId) {
    set({ isPlaying: true });
    return;
  }
  set({ isLoading: true, error: null });

  try {
    let track = await extractStream(trackId, context);

    if (!track) {
      set({ error: "No stream available", isLoading: false });
      return;
    }

    const { contextQueue, watchPlaylistId } = await seedContextQueue(trackId, context);
    const historyEntry = trackToHistoryEntry(track);

    set({
      currentTrack: track,
      isPlaying: true,
      currentTime: 0,
      userQueue: [],
      contextQueue,
      watchPlaylistId,
      context: {
        type: context?.queueType ?? "radio",
        id: context?.queueId,
      },
      currentArtistId: context?.artistBrowseId ?? null,
      currentAlbumId: context?.albumBrowseId ?? null,
      isLoading: false,
      history: addToPlayHistory(state.history, historyEntry),
    });

    recordPlay(trackId).catch(() => {});

    const visible = [...get().userQueue, ...get().contextQueue];
    for (let i = 0; i < Math.min(visible.length, 2); i++) {
      fetchTrack(visible[i]).catch(() => {});
    }
  } catch (err) {
    set({
      error: err instanceof Error ? err.message : "Failed to load track",
      isLoading: false,
    });
  }
}
