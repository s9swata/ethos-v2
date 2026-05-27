import { useEffect, useRef } from "react";
import TrackPlayer from "@rntp/player";
import { Event, RepeatMode, PlaybackState, PlayerCommand } from "@rntp/player";
import { usePlayerStore } from "@/stores/player-store";
import { upscaleThumbnail } from "@/api/client";

// ---------------------------------------------------------------------------
// Module-level seekTo export
// Assigned once when the provider mounts, cleared on unmount.
// ---------------------------------------------------------------------------
let seekToGlobal: ((time: number) => void) | null = null;

export function seekTo(time: number) {
  seekToGlobal?.(time);
}

// ---------------------------------------------------------------------------
// AudioPlayerProvider
// Renders nothing — bridges Zustand store ↔ @rntp/player native layer.
// ---------------------------------------------------------------------------
export function AudioPlayerProvider() {
  // ── Store selectors ──────────────────────────────────────────────────────
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying    = usePlayerStore((s) => s.isPlaying);
  const volume       = usePlayerStore((s) => s.volume);
  const repeat       = usePlayerStore((s) => s.repeat);

  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration    = usePlayerStore((s) => s.setDuration);
  const setPlaying     = usePlayerStore((s) => s.setPlaying);
  const playNext       = usePlayerStore((s) => s.playNext);
  const playPrev       = usePlayerStore((s) => s.playPrev);
  const pendingSeekTo  = usePlayerStore((s) => s.pendingSeekTo);

  // ── Internal refs ────────────────────────────────────────────────────────
  const prevTrackId         = useRef<string | null>(null);
  // Guard: when a native event updates the store, skip echoing it back to native.
  const isSyncingFromNative = useRef(false);
  // Tracks whether an async load is in flight so we don't double-play.
  const isLoadingTrack      = useRef(false);

  // ── Register seekTo once on mount ────────────────────────────────────────
  useEffect(() => {
    seekToGlobal = (time: number) => {
      TrackPlayer.seekTo(time);
    };
    return () => {
      seekToGlobal = null;
    };
  }, []);

  useEffect(() => {
    TrackPlayer.setCommands({
      capabilities: [
        PlayerCommand.Previous,
        PlayerCommand.PlayPause,
        PlayerCommand.Next,
        PlayerCommand.Seek,
      ],
      handling: "hybrid",
      perCommandHandling: {
        [PlayerCommand.Next]: "js",
        [PlayerCommand.Previous]: "js",
      },
    });
  }, []);

  // ── Progress polling (250 ms) ────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const { position, duration } = TrackPlayer.getProgress();
        if (isFinite(position) && position >= 0 && position < 1000000) {
          setCurrentTime(position);
        }
        if (isFinite(duration) && duration >= 0 && duration < 1000000) {
          setDuration(duration);
        }
      } catch {
        // Player not ready yet — silently ignore
      }
    }, 250);
    return () => clearInterval(interval);
  }, [setCurrentTime, setDuration]);

  // ── Native → store: isPlaying ────────────────────────────────────────────
  // One-way sync. The guard ref prevents the store update from looping back
  // into the "store → native" effect below.
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(
      Event.IsPlayingChanged,
      (event: { playing: boolean }) => {
        isSyncingFromNative.current = true;
        setPlaying(event.playing);
        // Let the Zustand subscriber run before clearing the flag
        setTimeout(() => {
          isSyncingFromNative.current = false;
        }, 0);
      }
    );
    return () => sub.remove();
  }, [setPlaying]);

  // ── Store → native: track change + play/pause ────────────────────────────
  // Single effect to avoid races between track-load and play state.
  useEffect(() => {
    if (!currentTrack?.url) return;

    const trackChanged = currentTrack.id !== prevTrackId.current;

    const run = async () => {
      // 1. If the track changed, load it first and wait for completion.
      if (trackChanged) {
        isLoadingTrack.current = true;
        prevTrackId.current = currentTrack.id;

        try {
          await TrackPlayer.setMediaItem({
            mediaId:    currentTrack.id,
            url:        currentTrack.url,
            title:      currentTrack.title,
            artist:     currentTrack.artist,
            artworkUrl: upscaleThumbnail(currentTrack.thumbnail || "", 640),
            duration:   currentTrack.duration,
          });
        } catch (err) {
          console.warn("[AudioPlayerProvider] setMediaItem failed:", err);
          isLoadingTrack.current = false;
          return;
        }

        isLoadingTrack.current = false;
        setCurrentTime(0);
      }

      // 2. Skip play/pause if the change originated from native (already applied).
      if (isSyncingFromNative.current) return;

      // 3. Apply play/pause after track is guaranteed to be loaded.
      try {
        if (isPlaying) {
          await TrackPlayer.play();
        } else {
          await TrackPlayer.pause();
        }
      } catch (err) {
        console.warn("[AudioPlayerProvider] play/pause failed:", err);
      }
    };

    run();
  }, [currentTrack?.id, currentTrack?.url, isPlaying]);

  // ── Store → native: volume ───────────────────────────────────────────────
  useEffect(() => {
    TrackPlayer.setVolume(volume);
  }, [volume]);

  // ── Store → native: repeat mode ──────────────────────────────────────────
  // "one"  → native RepeatMode.One  (player loops the track)
  // "all"  → RepeatMode.Off         (Zustand handles next-track logic)
  // "off"  → RepeatMode.Off
  useEffect(() => {
    TrackPlayer.setRepeatMode(
      repeat === "one" ? RepeatMode.One : RepeatMode.Off
    );
  }, [repeat]);

  // ── Store → native: seek requests ────────────────────────────────────────
  // The store sets pendingSeekTo to request a seek (playPrev currentTime > 3,
  // playNext repeat:one restart). This effect picks it up and clears it.
  useEffect(() => {
    if (pendingSeekTo !== null && pendingSeekTo !== undefined) {
      TrackPlayer.seekTo(pendingSeekTo);
      usePlayerStore.setState({ pendingSeekTo: null });
    }
  }, [pendingSeekTo]);

  // ── Native → store: track ended ─────────────────────────────────────────
  // repeat:one is checked here BEFORE calling playNext(). If the native player
  // loops automatically (RepeatMode.One), the Ended event still fires — we
  // must NOT call playNext() or it would skip to the next track.
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(
      Event.PlaybackStateChanged,
      (event: { state: PlaybackState }) => {
        if (event.state === PlaybackState.Ended) {
          if (isLoadingTrack.current) return;
          const state = usePlayerStore.getState();
          const duration = state.duration || state.currentTrack?.duration || 0;
          if (duration > 0 && state.currentTime < Math.max(0, duration - 2)) {
            return;
          }
          if (repeat === "one") {
            TrackPlayer.seekTo(0);
            TrackPlayer.play();
          } else {
            playNext();
          }
        }
      }
    );
    return () => sub.remove();
  }, [playNext, repeat]);

  // ── Remote controls (lock screen / notification) ─────────────────────────
  useEffect(() => {
    const subs = [
      TrackPlayer.addEventListener(Event.RemoteNext,     ()         => playNext()),
      TrackPlayer.addEventListener(Event.RemotePrevious, ()         => playPrev()),
      TrackPlayer.addEventListener(Event.RemotePlay,     ()         => TrackPlayer.play()),
      TrackPlayer.addEventListener(Event.RemotePause,    ()         => TrackPlayer.pause()),
      TrackPlayer.addEventListener(Event.RemoteStop,     ()         => TrackPlayer.stop()),
      TrackPlayer.addEventListener(Event.RemoteSeek,     (event)    =>
        TrackPlayer.seekTo(event.position)
      ),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [playNext, playPrev]);

  return null;
}
