import type { SetFn, GetFn } from "./player-types";
import { api } from "@/api/client";
import { recordPlay } from "@/utils/taste";
import { formatDuration } from "@/utils/duration";
import { shuffle, trackToHistoryEntry, addToPlayHistory, scoreRefillBatch } from "./player-utils";

export async function playNextAction(set: SetFn, get: GetFn): Promise<void> {
  const state = get();

  if (state.repeat === "one" && state.currentTrack) {
    set({ currentTime: 0, pendingSeekTo: 0 });
    return;
  }

  if (state.queueIndex + 1 < state.queue.length) {
    const nextIndex = state.queueIndex + 1;
    const track = state.queue[nextIndex];
    set({ queueIndex: nextIndex });
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
      const history = addToPlayHistory(get().playHistory, trackToHistoryEntry(track));
      set({ currentTrack: track, isPlaying: true, currentTime: 0, duration: track.duration, playHistory: history, playedVideoIds: [...get().playedVideoIds, track.id] });
      recordPlay(track.id).catch(() => {});
    }
    return;
  }

  if (state.autoQueueIndex + 1 < state.autoQueue.length) {
    const nextIndex = state.autoQueueIndex + 1;
    const item = state.autoQueue[nextIndex];
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

  if (state.currentArtistId) {
    set({ isLoading: true });

    let batch = scoreRefillBatch(state.artistTrackPool, state.playedVideoIds, state.recentAlbumIds);

    if (!batch && state.pendingAlbumBrowseIds.length > 0) {
      const nextId = state.pendingAlbumBrowseIds[0];
      set({ pendingAlbumBrowseIds: state.pendingAlbumBrowseIds.slice(1) });
      try {
        const album = await api.getAlbum(nextId);
        const albumThumb = album.thumbnails?.[0]?.url;
        const newTracks: import("./player-types").AutoQueueItem[] = album.tracks
          .filter((t) => t.videoId)
          .map((t) => ({
            title: t.title,
            videoId: t.videoId,
            artists: t.artists,
            thumbnail: albumThumb,
            isTopSong: false,
            albumBrowseId: nextId,
            albumIndex: t.index ?? null,
            duration: t.duration,
          }));
        set((s) => ({ artistTrackPool: [...s.artistTrackPool, ...newTracks] }));
        batch = scoreRefillBatch(get().artistTrackPool, state.playedVideoIds, state.recentAlbumIds);
      } catch {}
    }

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
        await get().playTrack(first.videoId, {
          title: first.title ?? undefined,
          artist: first.artists?.join(", "),
          thumbnail: first.thumbnail ?? undefined,
          duration: first.duration ?? undefined,
          albumBrowseId: first.albumBrowseId ?? undefined,
        });
      } else {
        set({ isLoading: false });
      }
      return;
    }

    set({ isLoading: false });
  }

  if (state.repeat === "all" && state.queue.length > 0) {
    set({ queueIndex: 0 });
    const track = state.queue[0];
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
      const history = addToPlayHistory(get().playHistory, trackToHistoryEntry(track));
      set({ currentTrack: track, isPlaying: true, currentTime: 0, playHistory: history, playedVideoIds: [...get().playedVideoIds, track.id] });
    }
    return;
  }

  set({ isPlaying: false });
}
