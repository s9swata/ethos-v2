import { useEffect, useRef } from "react";
import TrackPlayer from "@rntp/player";
import { Event, RepeatMode, PlaybackState } from "@rntp/player";
import { usePlayerStore } from "@/stores/player-store";

let seekToGlobal: ((time: number) => void) | null = null;

export function seekTo(time: number) {
  seekToGlobal?.(time);
}

export function AudioPlayerProvider() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const repeat = usePlayerStore((s) => s.repeat);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);

  const prevTrackId = useRef<string | null>(null);

  seekToGlobal = (time: number) => {
    TrackPlayer.seekTo(time);
  };

  // Sync progress to store
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const { position, duration } = TrackPlayer.getProgress();
        setCurrentTime(position);
        setDuration(duration);
      } catch {}
    }, 250);
    return () => clearInterval(interval);
  }, [setCurrentTime, setDuration]);

  // Sync isPlaying to store via event
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.IsPlayingChanged, (event) => {
      setPlaying(event.playing);
    });
    return () => sub.remove();
  }, [setPlaying]);

  // Handle track changes from Zustand
  useEffect(() => {
    if (!currentTrack?.url) return;
    if (currentTrack.id === prevTrackId.current) return;
    prevTrackId.current = currentTrack.id;

    TrackPlayer.setMediaItem({
      mediaId: currentTrack.id,
      url: currentTrack.url,
      title: currentTrack.title,
      artist: currentTrack.artist,
      artworkUrl: currentTrack.thumbnail,
      duration: currentTrack.duration,
    });
    TrackPlayer.play();
  }, [currentTrack?.id, currentTrack?.url]);

  // Sync isPlaying to RNTP
  useEffect(() => {
    if (!currentTrack) return;
    if (isPlaying) {
      TrackPlayer.play();
    } else {
      TrackPlayer.pause();
    }
  }, [isPlaying, currentTrack]);

  // Sync volume
  useEffect(() => {
    TrackPlayer.setVolume(volume);
  }, [volume]);

  // Sync repeat mode
  useEffect(() => {
    if (repeat === "one") {
      TrackPlayer.setRepeatMode(RepeatMode.One);
    } else if (repeat === "all") {
      TrackPlayer.setRepeatMode(RepeatMode.All);
    } else {
      TrackPlayer.setRepeatMode(RepeatMode.Off);
    }
  }, [repeat]);

  // Handle track end → play next
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackStateChanged, (event) => {
      if (event.state === PlaybackState.Ended) {
        playNext();
      }
    });
    return () => sub.remove();
  }, [playNext]);

  // Remote events from notification/lock screen
  useEffect(() => {
    const subs = [
      TrackPlayer.addEventListener(Event.RemoteNext, () => playNext()),
      TrackPlayer.addEventListener(Event.RemotePrevious, () => playPrev()),
      TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [playNext, playPrev]);

  return null;
}
