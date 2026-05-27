import type { TrackInfo, QueueContext, AudioFormat } from "@/types";
import type { SetFn, GetFn } from "./player-types";
import { api } from "@/api/client";
import { prefetchStream, getBestAudioStream } from "expo-youtube-audio-stream";
import { parseDuration } from "@/utils/duration";
import { recordPlay } from "@/utils/taste";
import { shuffle, trackToHistoryEntry, addToPlayHistory } from "./player-utils";

export async function playTrackAction(set: SetFn, get: GetFn, trackId: string, context?: QueueContext): Promise<void> {
  const state = get();
  if (state.currentTrack?.id === trackId) {
    set({ isPlaying: true });
    return;
  }
  set({ isLoading: true, error: null });
  try {
    let track: TrackInfo | null = null;
    const hasContextMetadata = !!(context?.title && context?.artist);
    if (hasContextMetadata) {
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
          track = {
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
    }
    if (!track) {
      set({ error: "No stream available", isLoading: false });
      return;
    }
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
    recordPlay(trackId).catch(() => {});
    if (context?.albumBrowseId) {
      set((s) => ({
        recentAlbumIds: [context.albumBrowseId!, ...s.recentAlbumIds].slice(0, 3),
      }));
    }
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
                duration: t.duration,
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
                  duration: t.duration,
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
    prefetchStream(trackId).catch(() => {});
  } catch (err) {
    set({
      error: err instanceof Error ? err.message : "Failed to load track",
      isLoading: false,
    });
  }
}
