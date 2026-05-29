import { useEffect, useRef } from "react";
import TrackPlayer from "@rntp/player";
import { Event, RepeatMode, PlaybackState, PlayerCommand } from "@rntp/player";
import { usePlayerStore } from "@/stores/player-store";
import { fetchTrack } from "@/stores/player-actions-next";
import { upscaleThumbnail } from "@/api/client";
import type { QueueItem } from "@/types";

let seekToGlobal: ((time: number) => void) | null = null;

export function seekTo(time: number) {
  seekToGlobal?.(time);
}

export function AudioPlayerProvider() {
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

  const prevTrackId         = useRef<string | null>(null);
  const isSyncingFromNative = useRef(false);
  const isLoadingTrack      = useRef(false);

  useEffect(() => {
    seekToGlobal = (time: number) => { TrackPlayer.seekTo(time); };
    return () => { seekToGlobal = null; };
  }, []);

  useEffect(() => {
    TrackPlayer.setCommands({
      capabilities: [PlayerCommand.Previous, PlayerCommand.PlayPause, PlayerCommand.Next, PlayerCommand.Seek],
      handling: "hybrid",
      perCommandHandling: { [PlayerCommand.Next]: "js", [PlayerCommand.Previous]: "js" },
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const { position, duration } = TrackPlayer.getProgress();
        if (isFinite(position) && position >= 0 && position < 1000000) setCurrentTime(position);
        if (isFinite(duration) && duration >= 0 && duration < 1000000) setDuration(duration);
      } catch {}
    }, 250);
    return () => clearInterval(interval);
  }, [setCurrentTime, setDuration]);

  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.IsPlayingChanged, (event: { playing: boolean }) => {
      isSyncingFromNative.current = true;
      setPlaying(event.playing);
      setTimeout(() => { isSyncingFromNative.current = false; }, 0);
    });
    return () => sub.remove();
  }, [setPlaying]);

  useEffect(() => {
    if (!currentTrack) return;

    if (!currentTrack.url) {
      const item: QueueItem = {
        videoId: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        thumbnail: currentTrack.thumbnail,
        duration: currentTrack.duration,
      };
      fetchTrack(item)
        .then((info) => {
          const store = usePlayerStore.getState();
          if (!store.currentTrack || store.currentTrack.id !== info.id) return;
          usePlayerStore.setState({
            currentTrack: { ...store.currentTrack, url: info.url, directUrl: info.directUrl, webpageUrl: info.webpageUrl, formats: info.formats }
          });
        })
        .catch((err) => console.warn("[AudioPlayerProvider] fetch url failed:", err));
      return;
    }

    const trackChanged = currentTrack.id !== prevTrackId.current;

    const run = async () => {
      if (trackChanged) {
        isLoadingTrack.current = true;
        prevTrackId.current = currentTrack.id;

        try {
          const thumb = currentTrack.thumbnail ? upscaleThumbnail(currentTrack.thumbnail, 640) : undefined;
          await TrackPlayer.setMediaItem({
            mediaId:    currentTrack.id,
            url:        currentTrack.url,
            title:      currentTrack.title,
            artist:     currentTrack.artist,
            artworkUrl: thumb,
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

      if (isSyncingFromNative.current) return;

      try {
        if (isPlaying) await TrackPlayer.play();
        else await TrackPlayer.pause();
      } catch (err) {
        console.warn("[AudioPlayerProvider] play/pause failed:", err);
      }
    };

    run();
  }, [currentTrack?.id, currentTrack?.url, isPlaying]);

  useEffect(() => { TrackPlayer.setVolume(volume); }, [volume]);

  useEffect(() => {
    TrackPlayer.setRepeatMode(repeat === "one" ? RepeatMode.One : RepeatMode.Off);
  }, [repeat]);

  useEffect(() => {
    if (pendingSeekTo !== null && pendingSeekTo !== undefined) {
      TrackPlayer.seekTo(pendingSeekTo);
      usePlayerStore.setState({ pendingSeekTo: null });
    }
  }, [pendingSeekTo]);

  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackStateChanged, (event: { state: PlaybackState }) => {
      if (event.state === PlaybackState.Ended) {
        if (isLoadingTrack.current) return;
        if (repeat === "one") {
          TrackPlayer.seekTo(0);
          TrackPlayer.play();
        } else {
          playNext();
        }
      }
    });
    return () => sub.remove();
  }, [playNext, repeat]);

  useEffect(() => {
    const subs = [
      TrackPlayer.addEventListener(Event.RemoteNext,     ()         => playNext()),
      TrackPlayer.addEventListener(Event.RemotePrevious, ()         => playPrev()),
      TrackPlayer.addEventListener(Event.RemotePlay,     ()         => TrackPlayer.play()),
      TrackPlayer.addEventListener(Event.RemotePause,    ()         => TrackPlayer.pause()),
      TrackPlayer.addEventListener(Event.RemoteStop,     ()         => TrackPlayer.stop()),
      TrackPlayer.addEventListener(Event.RemoteSeek,     (event)    => TrackPlayer.seekTo(event.position)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [playNext, playPrev]);

  return null;
}
