import type { QueueContext, QueueItem } from "@/types";
import type { SetFn, GetFn } from "./player-types";
import { api } from "@/api/client";
import { parseDuration } from "@/utils/duration";
import { fetchTrack } from "./player-actions-next";
import { recordPlay } from "@/utils/taste";
import { trackToHistoryEntry, addToPlayHistory } from "./player-utils";

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
    set({ isPlaying: true, error: null });
    return;
  }
  set({ isLoading: true, error: null });

  try {
    const item: QueueItem = {
      videoId: trackId,
      title: context?.title ?? "Unknown track",
      artist: context?.artist ?? "",
      thumbnail: context?.thumbnail ?? "",
      duration: context?.duration ? parseDuration(context.duration) : 0,
    };

    const track = await fetchTrack(item);

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
